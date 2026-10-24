import { calendarFeedService } from '../../lib/calendar/calendarFeedService';
import { CalendarFeedConfig, ScheduleBlock, Assignment } from '../../types';
import { db } from '../../lib/storage/database';

async function testCalendarFeedService() {
  console.log('--- Testing Calendar Feed Service (iCal per-member & deduplication) ---');

  // Configurar mock de window y localStorage
  const storageMap = new Map<string, string>();
  (global as any).window = {
    dispatchEvent: () => true,
  };
  (global as any).localStorage = {
    getItem: (key: string) => storageMap.get(key) || null,
    setItem: (key: string, val: string) => storageMap.set(key, val),
    removeItem: (key: string) => storageMap.delete(key),
    clear: () => storageMap.clear(),
  };

  // Base de datos en memoria para simular Dexie tables
  const blocksStore: ScheduleBlock[] = [];
  const assignmentsStore: Assignment[] = [];

  (db as any).scheduleBlocks = {
    toArray: async () => [...blocksStore],
    add: async (b: ScheduleBlock) => {
      blocksStore.push(b);
      return b.id;
    },
    update: async (id: string, updates: Partial<ScheduleBlock>) => {
      const idx = blocksStore.findIndex((b) => b.id === id);
      if (idx >= 0) Object.assign(blocksStore[idx], updates);
    },
    delete: async (id: string) => {
      const idx = blocksStore.findIndex((b) => b.id === id);
      if (idx >= 0) blocksStore.splice(idx, 1);
    },
  };

  (db as any).assignments = {
    toArray: async () => [...assignmentsStore],
    add: async (a: Assignment) => {
      assignmentsStore.push(a);
      return a.id;
    },
    update: async (id: string, updates: Partial<Assignment>) => {
      const idx = assignmentsStore.findIndex((a) => a.id === id);
      if (idx >= 0) Object.assign(assignmentsStore[idx], updates);
    },
    delete: async (id: string) => {
      const idx = assignmentsStore.findIndex((a) => a.id === id);
      if (idx >= 0) assignmentsStore.splice(idx, 1);
    },
  };

  (db as any).members = {
    get: async (id: string) => ({ id, name: id === 'member-leon' ? 'Leon' : 'Dani' }),
  };

  // Mock de iCal sample RFC 5545
  const sampleIcs = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Google Inc//Google Calendar 70.9054//EN
BEGIN:VEVENT
UID:uid_robotica_123
SUMMARY:Clase de Robótica
LOCATION:Laboratorio 3
DTSTART:20261020T140000Z
DTEND:20261020T160000Z
RRULE:FREQ=WEEKLY;BYDAY=TU
END:VEVENT
BEGIN:VEVENT
UID:uid_pitch_incubadora_456
SUMMARY:Taller de Pitch Incubadora
LOCATION:Auditorio B2B
DTSTART:20261022T100000Z
DTEND:20261022T113000Z
END:VEVENT
END:VCALENDAR`;

  (global as any).fetch = async (url: string, opts: any) => {
    return {
      ok: true,
      status: 200,
      json: async () => ({ success: true, content: sampleIcs }),
    };
  };

  // ═════════════════════════════════════════════════════════════
  // 1. Guardar y filtrar feeds por socio en localStorage
  // ═════════════════════════════════════════════════════════════
  console.log('\n[Paso 1]: Gestión de feeds en localStorage por socio');
  const feedLeon: CalendarFeedConfig = {
    id: 'feed_leon_clases',
    memberId: 'member-leon',
    name: 'Clases U Leon',
    url: 'https://calendar.google.com/calendar/ical/leon/basic.ics',
    type: 'fixed_blocks',
  };

  const feedDani: CalendarFeedConfig = {
    id: 'feed_dani_reuniones',
    memberId: 'member-dani',
    name: 'Reuniones Dani',
    url: 'https://calendar.google.com/calendar/ical/dani/basic.ics',
    type: 'sg_meetings',
  };

  calendarFeedService.saveFeed(feedLeon);
  calendarFeedService.saveFeed(feedDani);

  const leonFeeds = calendarFeedService.getFeedsByMember('member-leon');
  if (leonFeeds.length !== 1 || leonFeeds[0].id !== 'feed_leon_clases') {
    throw new Error('Fallo al filtrar feeds de Leon en localStorage');
  }

  const daniFeeds = calendarFeedService.getFeedsByMember('member-dani');
  if (daniFeeds.length !== 1 || daniFeeds[0].id !== 'feed_dani_reuniones') {
    throw new Error('Fallo al filtrar feeds de Dani en localStorage');
  }
  console.log('✓ Feeds guardados y aislados por socio en localStorage correctamente.');

  // ═════════════════════════════════════════════════════════════
  // 2. Sincronización de Bloques Fijos para Leon (Idempotencia con externalUid)
  // ═════════════════════════════════════════════════════════════
  console.log('\n[Paso 2]: Sincronización y Desduplicación de Bloques Fijos (Leon)');
  const resLeon1 = await calendarFeedService.syncFeed(feedLeon);
  if (!resLeon1.success || resLeon1.eventCount !== 2) {
    throw new Error(`Expected 2 events synced, got ${resLeon1.eventCount}`);
  }

  if (blocksStore.length !== 2) {
    throw new Error(`Expected 2 blocks in store, got ${blocksStore.length}`);
  }

  const roboticaLeon = blocksStore.find((b) => b.externalUid === 'uid_robotica_123');
  if (!roboticaLeon || roboticaLeon.memberId !== 'member-leon') {
    throw new Error('El bloque de robótica no se asoció a Leon con su externalUid');
  }
  if (roboticaLeon.title !== 'Clase de Robótica') {
    throw new Error(`Expected title 'Clase de Robótica', got '${roboticaLeon.title}'`);
  }

  // Segunda sincronización del mismo feed: NO debe duplicar
  const resLeon2 = await calendarFeedService.syncFeed(feedLeon);
  if (!resLeon2.success || resLeon2.eventCount !== 2) {
    throw new Error(`Second sync failed: ${resLeon2.error}`);
  }

  if (blocksStore.length !== 2) {
    throw new Error(`Deduplication failed: expected 2 blocks, got ${blocksStore.length}`);
  }
  console.log('✓ Segunda sincronización no duplicó bloques (externalUid preservado).');

  // ═════════════════════════════════════════════════════════════
  // 3. Sincronización de Reuniones SG para Dani (Área Administración & Incubadora)
  // ═════════════════════════════════════════════════════════════
  console.log('\n[Paso 3]: Sincronización de Reuniones SG (Dani -> Área Admin & Incubadora)');
  const resDani = await calendarFeedService.syncFeed(feedDani);
  if (!resDani.success) throw new Error(`Dani sync failed: ${resDani.error}`);

  // Verificar que se crearon bloques para Dani con memberId: 'member-dani'
  const daniBlocks = blocksStore.filter((b) => b.memberId === 'member-dani');
  if (daniBlocks.length !== 2) {
    throw new Error(`Expected 2 blocks for Dani, got ${daniBlocks.length}`);
  }
  for (const b of daniBlocks) {
    if (b.subjectId !== 'area-admin-incubadora') {
      throw new Error(`Reunión SG de Dani debe pertenecer a 'area-admin-incubadora', got ${b.subjectId}`);
    }
  }

  // Verificar que se crearon assignments de reunión para Dani
  const daniAssignments = assignmentsStore.filter((a) => a.assigneeId === 'member-dani');
  if (daniAssignments.length !== 2) {
    throw new Error(`Expected 2 assignments for Dani, got ${daniAssignments.length}`);
  }
  const pitchAssignment = daniAssignments.find((a) => a.externalUid === 'uid_pitch_incubadora_456');
  if (!pitchAssignment || !pitchAssignment.title.includes('Taller de Pitch Incubadora')) {
    throw new Error('No se encontró el assignment de reunión de pitch para Dani');
  }
  if (pitchAssignment.subjectId !== 'area-admin-incubadora') {
    throw new Error(`Expected subjectId 'area-admin-incubadora', got ${pitchAssignment.subjectId}`);
  }
  console.log('✓ Reuniones SG asignadas al área Administración & Incubadora con responsable Dani.');

  // ═════════════════════════════════════════════════════════════
  // 4. Tipo "ignore": no debe importar eventos
  // ═════════════════════════════════════════════════════════════
  console.log('\n[Paso 4]: Feed tipo ignore');
  const feedIgnore: CalendarFeedConfig = {
    id: 'feed_ignore',
    memberId: 'member-angel',
    name: 'Calendario Personal Ángel',
    url: 'https://calendar.google.com/calendar/ical/angel/basic.ics',
    type: 'ignore',
  };
  const resIgnore = await calendarFeedService.syncFeed(feedIgnore);
  if (!resIgnore.success || resIgnore.eventCount !== 0) {
    throw new Error('Feed tipo ignore no debe importar eventos');
  }
  console.log('✓ Feed tipo ignore respetado.');

  // ═════════════════════════════════════════════════════════════
  // 5. Eliminación de Feed y Purga de Eventos
  // ═════════════════════════════════════════════════════════════
  console.log('\n[Paso 5]: Eliminación de feed y purga de eventos asociados');
  await calendarFeedService.deleteFeed('feed_leon_clases');

  const remainingLeonFeeds = calendarFeedService.getFeedsByMember('member-leon');
  if (remainingLeonFeeds.length !== 0) {
    throw new Error('Feed de Leon no fue eliminado de localStorage');
  }

  const remainingLeonBlocks = blocksStore.filter((b) => b.memberId === 'member-leon');
  if (remainingLeonBlocks.length !== 0) {
    throw new Error(`Los bloques de Leon debieron ser purgados, quedaron ${remainingLeonBlocks.length}`);
  }

  // Los bloques de Dani deben permanecer intactos
  const remainingDaniBlocks = blocksStore.filter((b) => b.memberId === 'member-dani');
  if (remainingDaniBlocks.length !== 2) {
    throw new Error(`Los bloques de Dani debieron permanecer, hay ${remainingDaniBlocks.length}`);
  }
  console.log('✓ Feed eliminado y eventos purgados sin afectar a otros socios.');

  console.log('\nALL CALENDAR FEED SERVICE TESTS PASSED SUCCESSFULLY! 🎉\n');
}

testCalendarFeedService();
