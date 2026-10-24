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

      // Mapear fechas excluidas (EXDATE y RECURRENCE-ID) para cada serie recurrente
      const seriesExdatesMap = new Map<string, Set<string>>();
      const registerExdate = (uid: string, dateStr: string) => {
        if (!seriesExdatesMap.has(uid)) {
          seriesExdatesMap.set(uid, new Set());
        }
        seriesExdatesMap.get(uid)!.add(dateStr);
      };

      for (const ev of events) {
        if (ev.exdates && ev.exdates.length > 0) {
          for (const d of ev.exdates) {
            registerExdate(ev.uid, d);
          }
        }
        if (ev.recurrenceId) {
          registerExdate(ev.uid, ev.recurrenceId);
        }
      }

      const getExdatesForSeries = (uid: string): string[] => {
        const result = new Set<string>();
        const direct = seriesExdatesMap.get(uid);
        if (direct) {
          for (const d of direct) result.add(d);
        }
        const baseUid = uid.split('_')[0];
        if (baseUid !== uid) {
          const fromBase = seriesExdatesMap.get(baseUid);
          if (fromBase) {
            for (const d of fromBase) result.add(d);
          }
        }
        return Array.from(result);
      };

      const existingBlocks = await db.scheduleBlocks.toArray();
      let processedCount = 0;

      for (const ev of events) {
        // A. Si el evento fue cancelado (STATUS: CANCELLED)
        if (ev.isCancelled) {
          // Si era una excepción previa que se canceló, eliminarla del almacenamiento local
          if (ev.recurrenceId) {
            const cancelledUid = `${ev.uid}_${ev.recurrenceId}`;
            const oldExceptionBlock = existingBlocks.find(
              (b) => b.externalUid === cancelledUid && b.memberId === feed.memberId
            );
            if (oldExceptionBlock) {
              await db.scheduleBlocks.delete(oldExceptionBlock.id);
            }
          }
          // El día ya quedó registrado en seriesExdatesMap para que la serie no bloquee
          continue;
        }

        // Determinar formato de título y ubicación según el tipo de feed
        let titleFormatted = ev.title;
        let locationFormatted = ev.location || 'Presencial / Turno';
        if (feed.type === 'sg_meetings') {
          titleFormatted =
            ev.title.toLowerCase().startsWith('reunión') || ev.title.toLowerCase().startsWith('reunion')
              ? ev.title
              : `Reunión: ${ev.title}`;
          locationFormatted = ev.location || 'Reunión SG';
        }

        // B. Excepción de una serie recurrente (tiene RECURRENCE-ID)
        // Se guarda como bloque puntual con fecha, con id propio (uid + recurrence-id), sin tocar la serie semanal
        if (ev.recurrenceId) {
          if (ev.end < startOfToday || ev.start > maxFutureDate) {
            continue;
          }

          const exceptionUid = `${ev.uid}_${ev.recurrenceId}`;
          const blockDate = formatLocalDate(ev.start);

          const match = existingBlocks.find(
            (b) => b.externalUid === exceptionUid && b.memberId === feed.memberId
          );

          if (match) {
            await db.scheduleBlocks.update(match.id, {
              startTime: ev.startTimeStr,
              endTime: ev.endTimeStr,
              dayOfWeek: ev.dayOfWeek || match.dayOfWeek || 1,
              location: locationFormatted,
              title: titleFormatted,
              date: blockDate,
              untilDate: undefined,
              recurrenceId: ev.recurrenceId,
            });
          } else {
            const newBlock: ScheduleBlock = {
              id: `block_ics_${feed.id}_${exceptionUid}`,
              subjectId: SG_ADMIN_INCUBATOR_AREA_ID,
              dayOfWeek: ev.dayOfWeek || 1,
              startTime: ev.startTimeStr,
              endTime: ev.endTimeStr,
              location: locationFormatted,
              source: 'ics',
              externalUid: exceptionUid,
              externalCalendarId: feed.id,
              memberId: feed.memberId,
              title: titleFormatted,
              date: blockDate,
              untilDate: undefined,
              recurrenceId: ev.recurrenceId,
            };
            await db.scheduleBlocks.add(newBlock);
          }
          processedCount++;
          continue;
        }

        // C. Serie recurrente semanal (tiene recurrence y NO tiene recurrenceId)
        if (ev.recurrence) {
          if (ev.recurrence.until && ev.recurrence.until < startOfToday) {
            continue;
          }

          const blockUntilDate = ev.recurrence.until ? formatLocalDate(ev.recurrence.until) : undefined;
          const blockExdates = getExdatesForSeries(ev.uid);

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
              date: undefined, // Se repite semanalmente
              untilDate: blockUntilDate,
              exdates: blockExdates.length > 0 ? blockExdates : undefined,
            });
          } else {
            const newBlock: ScheduleBlock = {
              id: `block_ics_${feed.id}_${ev.uid}`,
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
              date: undefined,
              untilDate: blockUntilDate,
              exdates: blockExdates.length > 0 ? blockExdates : undefined,
            };
            await db.scheduleBlocks.add(newBlock);
          }
          processedCount++;
          continue;
        }

        // D. Evento único puntual (sin recurrencia ni recurrenceId)
        if (ev.end < startOfToday || ev.start > maxFutureDate) {
          continue;
        }

        const blockDate = formatLocalDate(ev.start);
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
            untilDate: undefined,
          });
        } else {
          const newBlock: ScheduleBlock = {
            id: `block_ics_${feed.id}_${ev.uid}`,
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
            untilDate: undefined,
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
