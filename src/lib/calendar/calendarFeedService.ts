import { CalendarFeedConfig, ScheduleBlock, Assignment } from '@/types';
import { STORAGE_KEYS } from '../storage/storageKeys';
import { db } from '../storage/database';
import { parseIcsCalendar } from '../importer/icsParser';

const SG_ADMIN_INCUBATOR_AREA_ID = 'area-admin-incubadora';

export const calendarFeedService = {
  /**
   * Obtiene todos los feeds guardados exclusivamente en localStorage
   */
  getFeeds(): CalendarFeedConfig[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CALENDAR_FEEDS);
      if (!raw) return [];
      return JSON.parse(raw) as CalendarFeedConfig[];
    } catch (e) {
      console.warn('Error leyendo feeds de calendario de localStorage:', e);
      return [];
    }
  },

  /**
   * Obtiene los feeds configurados para un socio específico
   */
  getFeedsByMember(memberId: string): CalendarFeedConfig[] {
    return this.getFeeds().filter((f) => f.memberId === memberId);
  },

  /**
   * Guarda o actualiza la configuración de un feed (solo en localStorage)
   */
  saveFeed(feed: CalendarFeedConfig): void {
    if (typeof window === 'undefined') return;
    const feeds = this.getFeeds();
    const index = feeds.findIndex((f) => f.id === feed.id);
    if (index >= 0) {
      feeds[index] = feed;
    } else {
      feeds.push(feed);
    }
    localStorage.setItem(STORAGE_KEYS.CALENDAR_FEEDS, JSON.stringify(feeds));
  },

  /**
   * Elimina un feed y purga de la base de datos local los eventos importados asociados
   */
  async deleteFeed(feedId: string): Promise<void> {
    if (typeof window === 'undefined') return;
    const feeds = this.getFeeds().filter((f) => f.id !== feedId);
    localStorage.setItem(STORAGE_KEYS.CALENDAR_FEEDS, JSON.stringify(feeds));

    // Purgar bloques asociados al feed
    const existingBlocks = await db.scheduleBlocks.toArray();
    const blocksToDelete = existingBlocks.filter((b) => b.externalCalendarId === feedId);
    for (const b of blocksToDelete) {
      await db.scheduleBlocks.delete(b.id);
    }

    // Purgar tareas/reuniones asociadas al feed
    const existingAssignments = await db.assignments.toArray();
    const assignmentsToDelete = existingAssignments.filter((a) => a.externalCalendarId === feedId);
    for (const a of assignmentsToDelete) {
      await db.assignments.delete(a.id);
    }

    window.dispatchEvent(new CustomEvent('semester-data-updated'));
  },

  /**
   * Sincroniza un feed iCal consumiendo /api/calendar/import-url y parseando con parseIcsCalendar.
   * Aplica desduplicación por externalUid y memberId.
   */
  async syncFeed(feed: CalendarFeedConfig): Promise<{ success: boolean; eventCount: number; error?: string }> {
    if (feed.type === 'ignore') {
      const updatedFeed: CalendarFeedConfig = {
        ...feed,
        lastSyncedAt: new Date().toISOString(),
        eventCount: 0,
      };
      this.saveFeed(updatedFeed);
      return { success: true, eventCount: 0 };
    }

    try {
      // 1. Descargar el archivo iCal a través del proxy seguro
      const res = await fetch('/api/calendar/import-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: feed.url.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          eventCount: 0,
          error: data.error || `Error ${res.status} al sincronizar calendario`,
        };
      }

      // 2. Parsear eventos RFC 5545
      const events = parseIcsCalendar(data.content, { sourceCalendar: feed.name });
      if (events.length === 0) {
        const updatedFeed: CalendarFeedConfig = {
          ...feed,
          lastSyncedAt: new Date().toISOString(),
          eventCount: 0,
        };
        this.saveFeed(updatedFeed);
        return { success: true, eventCount: 0 };
      }

      // 3. Obtener datos actuales para desduplicación
      const existingBlocks = await db.scheduleBlocks.toArray();
      const existingAssignments = await db.assignments.toArray();
      const member = await db.members.get(feed.memberId);
      const memberName = member ? member.name : 'Socio SG';

      let processedCount = 0;

      if (feed.type === 'fixed_blocks') {
        // Bloques fijos: clases, monitorías, turnos del socio
        for (const ev of events) {
          const match = existingBlocks.find(
            (b) => b.externalUid === ev.uid && b.memberId === feed.memberId
          );

          if (match) {
            // Actualizar existente sin duplicar
            await db.scheduleBlocks.update(match.id, {
              startTime: ev.startTimeStr,
              endTime: ev.endTimeStr,
              dayOfWeek: ev.dayOfWeek || match.dayOfWeek || 1,
              location: ev.location || match.location || 'Presencial / Turno',
              title: ev.title || match.title,
            });
          } else {
            // Crear nuevo bloque asociado al socio
            const newBlock: ScheduleBlock = {
              id: `block_ics_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              subjectId: SG_ADMIN_INCUBATOR_AREA_ID,
              dayOfWeek: ev.dayOfWeek || 1,
              startTime: ev.startTimeStr,
              endTime: ev.endTimeStr,
              location: ev.location || 'Presencial / Turno',
              source: 'ics',
              externalUid: ev.uid,
              externalCalendarId: feed.id,
              memberId: feed.memberId,
              title: ev.title,
            };
            await db.scheduleBlocks.add(newBlock);
          }
          processedCount++;
        }
      } else if (feed.type === 'sg_meetings') {
        // Reuniones SG: van al área Administración & Incubadora
        for (const ev of events) {
          const titleFormatted = ev.title.toLowerCase().startsWith('reunión') || ev.title.toLowerCase().startsWith('reunion')
            ? ev.title
            : `Reunión: ${ev.title}`;

          // Bloque de horario para el socio
          const blockMatch = existingBlocks.find(
            (b) => b.externalUid === ev.uid && b.memberId === feed.memberId
          );

          if (blockMatch) {
            await db.scheduleBlocks.update(blockMatch.id, {
              startTime: ev.startTimeStr,
              endTime: ev.endTimeStr,
              dayOfWeek: ev.dayOfWeek || blockMatch.dayOfWeek || 1,
              location: ev.location || blockMatch.location || 'Reunión SG',
              title: titleFormatted,
            });
          } else {
            const newBlock: ScheduleBlock = {
              id: `block_mtg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              subjectId: SG_ADMIN_INCUBATOR_AREA_ID,
              dayOfWeek: ev.dayOfWeek || 1,
              startTime: ev.startTimeStr,
              endTime: ev.endTimeStr,
              location: ev.location || 'Reunión SG',
              source: 'ics',
              externalUid: ev.uid,
              externalCalendarId: feed.id,
              memberId: feed.memberId,
              title: titleFormatted,
            };
            await db.scheduleBlocks.add(newBlock);
          }

          // Entregable/evento de reunión para seguimiento
          const asgMatch = existingAssignments.find(
            (a) => a.externalUid === ev.uid && a.assigneeId === feed.memberId
          );

          const dueDateIso = ev.start ? ev.start.toISOString() : new Date().toISOString();

          if (asgMatch) {
            await db.assignments.update(asgMatch.id, {
              title: titleFormatted,
              dueDate: dueDateIso,
              location: ev.location || asgMatch.location,
              description: ev.description || asgMatch.description,
            });
          } else {
            const newAsg: Assignment = {
              id: `asg_ics_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              subjectId: SG_ADMIN_INCUBATOR_AREA_ID,
              title: titleFormatted,
              description: ev.description || ev.location || 'Reunión sincronizada vía iCal',
              dueDate: dueDateIso,
              priority: 'high',
              estimatedMinutes: 45,
              status: 'pending',
              location: ev.location || 'Virtual / Presencial',
              source: 'ics',
              externalUid: ev.uid,
              externalCalendarId: feed.id,
              assigneeId: feed.memberId,
              assigneeName: memberName,
            };
            await db.assignments.add(newAsg);
          }
          processedCount++;
        }
      }

      // 4. Actualizar metadatos de sincronización
      const updatedFeed: CalendarFeedConfig = {
        ...feed,
        lastSyncedAt: new Date().toISOString(),
        eventCount: processedCount,
      };
      this.saveFeed(updatedFeed);

      // Notificar actualización de datos en caliente
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('semester-data-updated'));
      }

      return { success: true, eventCount: processedCount };
    } catch (err: unknown) {
      console.error('Error sincronizando feed iCal:', err);
      const msg = err instanceof Error ? err.message : 'Error desconocido al sincronizar.';
      return { success: false, eventCount: 0, error: msg };
    }
  },

  /**
   * Sincroniza todos los feeds configurados para un socio específico
   */
  async syncAllFeedsForMember(memberId: string): Promise<{ totalEvents: number; errors: string[] }> {
    const memberFeeds = this.getFeedsByMember(memberId);
    let totalEvents = 0;
    const errors: string[] = [];

    for (const feed of memberFeeds) {
      const res = await this.syncFeed(feed);
      if (res.success) {
        totalEvents += res.eventCount;
      } else if (res.error) {
        errors.push(`${feed.name}: ${res.error}`);
      }
    }

    return { totalEvents, errors };
  },
};
