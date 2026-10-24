import { CalendarFeedConfig, ScheduleBlock, Assignment } from '@/types';
import { STORAGE_KEYS } from '../storage/storageKeys';
import { db } from '../storage/database';
import { parseIcsCalendar } from '../importer/icsParser';

const SG_ADMIN_INCUBATOR_AREA_ID = 'area-admin-incubadora';

export function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

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
   * Separa eventos recurrentes (ScheduleBlock semanal con untilDate) de eventos únicos (ScheduleBlock con date específico).
   * No crea Assignments para reuniones (solo bloquean horario).
   */
  async syncFeed(
    feed: CalendarFeedConfig,
    baseNow: Date = new Date()
  ): Promise<{ success: boolean; eventCount: number; error?: string }> {
    if (feed.type === 'ignore') {
      const updatedFeed: CalendarFeedConfig = {
        ...feed,
        lastSyncedAt: baseNow.toISOString(),
        eventCount: 0,
      };
      this.saveFeed(updatedFeed);
      return { success: true, eventCount: 0 };
    }

    try {
      // 1. Limpiar cualquier assignment rezagado creado previamente por iCal
      const existingAssignments = await db.assignments.toArray();
      const icsAssignments = existingAssignments.filter(
        (a) => a.id.startsWith('asg_ics_') || a.source === 'ics'
      );
      for (const a of icsAssignments) {
        await db.assignments.delete(a.id);
      }

      // 2. Descargar el archivo iCal a través del proxy seguro
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

      // 3. Parsear eventos RFC 5545
      const events = parseIcsCalendar(data.content, { sourceCalendar: feed.name });
      if (events.length === 0) {
        const updatedFeed: CalendarFeedConfig = {
          ...feed,
          lastSyncedAt: baseNow.toISOString(),
          eventCount: 0,
        };
        this.saveFeed(updatedFeed);
        return { success: true, eventCount: 0 };
      }

      // 4. Parámetros de ventana temporal
      const startOfToday = new Date(baseNow.getFullYear(), baseNow.getMonth(), baseNow.getDate(), 0, 0, 0, 0);
      const maxFutureDate = new Date(startOfToday.getTime() + 60 * 24 * 60 * 60 * 1000); // +60 días

      const existingBlocks = await db.scheduleBlocks.toArray();
      let processedCount = 0;

      for (const ev of events) {
        const isRecurring = Boolean(ev.recurrence);
        let blockDate: string | undefined = undefined;
        let blockUntilDate: string | undefined = undefined;

        if (isRecurring) {
          // Evento recurrente: si tiene UNTIL y ya venció antes de hoy, descartar
          if (ev.recurrence?.until) {
            if (ev.recurrence.until < startOfToday) {
              continue;
            }
            blockUntilDate = formatLocalDate(ev.recurrence.until);
          }
          blockDate = undefined; // Se repite semanalmente
        } else {
          // Evento único: descartar si terminó antes de hoy o si está a más de 60 días en el futuro
          if (ev.end < startOfToday) {
            continue;
          }
          if (ev.start > maxFutureDate) {
            continue;
          }
          blockDate = formatLocalDate(ev.start);
          blockUntilDate = undefined;
        }

        // Determinar título y ubicación según el tipo de feed
        let titleFormatted = ev.title;
        let locationFormatted = ev.location || 'Presencial / Turno';

        if (feed.type === 'sg_meetings') {
          titleFormatted =
            ev.title.toLowerCase().startsWith('reunión') || ev.title.toLowerCase().startsWith('reunion')
              ? ev.title
              : `Reunión: ${ev.title}`;
          locationFormatted = ev.location || 'Reunión SG';
        }

        // Buscar coincidencia para desduplicación
        const match = existingBlocks.find(
          (b) => b.externalUid === ev.uid && b.memberId === feed.memberId
        );

        if (match) {
          await db.scheduleBlocks.update(match.id, {
            startTime: ev.startTimeStr,
            endTime: ev.endTimeStr,
            dayOfWeek: ev.dayOfWeek || match.dayOfWeek || 1,
            location: locationFormatted,
            title: titleFormatted,
            date: blockDate,
            untilDate: blockUntilDate,
          });
        } else {
          const newBlock: ScheduleBlock = {
            id: `block_ics_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            subjectId: SG_ADMIN_INCUBATOR_AREA_ID,
            dayOfWeek: ev.dayOfWeek || 1,
            startTime: ev.startTimeStr,
            endTime: ev.endTimeStr,
            location: locationFormatted,
            source: 'ics',
            externalUid: ev.uid,
            externalCalendarId: feed.id,
            memberId: feed.memberId,
            title: titleFormatted,
            date: blockDate,
            untilDate: blockUntilDate,
          };
          await db.scheduleBlocks.add(newBlock);
        }
        processedCount++;
      }

      // 5. Actualizar metadatos de sincronización del feed
      const updatedFeed: CalendarFeedConfig = {
        ...feed,
        lastSyncedAt: baseNow.toISOString(),
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
