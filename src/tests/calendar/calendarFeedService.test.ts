import { calendarFeedService } from '../../lib/calendar/calendarFeedService';
import { CalendarFeedConfig, ScheduleBlock, Assignment } from '../../types';
import { db } from '../../lib/storage/database';
import { calculateFreeSlots } from '../../lib/academic-engine/schedule/calculateFreeSlots';
import { getCurrentBlock } from '../../lib/academic-engine/schedule/getCurrentBlock';

async function testCalendarFeedService() {
  console.log('--- Testing Calendar Feed Service (iCal per-member, temporal filtering & no-assignments) ---');

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

  // Fecha base de referencia: Martes 20 de Octubre de 2026
  const baseNow = new Date(2026, 9, 20, 10, 0, 0); // 2026-10-20 10:00 AM

  // Mock de iCal con los 4 casos reales:
  // 1. Evento único del jueves pasado (15 de octubre de 2026): DEBE IGNORARSE
  // 2. Evento único del próximo jueves (22 de octubre de 2026): DEBE IMPORTARSE CON date='2026-10-22'
  // 3. Clase semanal con RRULE y UNTIL al 30 de noviembre de 2026: DEBE IMPORTARSE CON untilDate='2026-11-30'
  // 4. Reunión de equipo SG: DEBE CREAR BLOQUE PERO NINGÚN ASSIGNMENT
  const realCasesIcs = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Google Inc//Google Calendar 70.9054//EN

BEGIN:VEVENT
UID:uid_jueves_pasado_001
SUMMARY:Taller Pasado de Modelado
LOCATION:Sala 101
DTSTART:20261015T140000Z
DTEND:20261015T160000Z
END:VEVENT

BEGIN:VEVENT
UID:uid_proximo_jueves_002
SUMMARY:Taller de Pitch – Growth Lab
LOCATION:Auditorio B2B
DTSTART:20261022T170000Z
DTEND:20261022T190000Z
END:VEVENT

BEGIN:VEVENT
UID:uid_clase_lunes_003
SUMMARY:Clase de Inteligencia Artificial
LOCATION:Edificio Central 304
DTSTART:20261019T080000Z
DTEND:20261019T100000Z
RRULE:FREQ=WEEKLY;BYDAY=MO;UNTIL=20261130T235959Z
END:VEVENT

BEGIN:VEVENT
UID:uid_reunion_sg_004
SUMMARY:Reunión con Incubadora SEAM
LOCATION:Google Meet
DTSTART:20261023T150000Z
DTEND:20261023T160000Z
END:VEVENT

END:VCALENDAR`;

  (global as any).fetch = async (url: string, opts: any) => {
    return {
      ok: true,
      status: 200,
      json: async () => ({ success: true, content: realCasesIcs }),
    };
  };

  // ═════════════════════════════════════════════════════════════
  // TEST 1: Un evento único del jueves pasado: NO se importa
  // TEST 2: Un evento único del próximo jueves: bloquea SOLO ese jueves
  // TEST 3: Clase semanal con RRULE y UNTIL: bloquea lunes hasta esa fecha
  // ═════════════════════════════════════════════════════════════
  console.log('\n--- Test 1, 2 & 3: Filtrado temporal y bloques con fecha ---');
  const feedClasesLeon: CalendarFeedConfig = {
    id: 'feed_clases_leon',
    memberId: 'member-leon',
    name: 'Clases y Turnos Leon',
    url: 'https://calendar.google.com/calendar/ical/leon/basic.ics',
    type: 'fixed_blocks',
  };

  calendarFeedService.saveFeed(feedClasesLeon);
  const syncClases = await calendarFeedService.syncFeed(feedClasesLeon, baseNow);
  if (!syncClases.success) throw new Error(`Sync failed: ${syncClases.error}`);

  // 1. Verificar que el evento pasado no se importó
  const pasado = blocksStore.find((b) => b.externalUid === 'uid_jueves_pasado_001');
  if (pasado) {
    throw new Error('FALLO TEST 1: El evento del jueves pasado no debió importarse.');
  }
  console.log('✓ TEST 1 PASADO: Evento único del jueves pasado fue descartado correctamente.');

  // 2. Verificar que el evento del próximo jueves se importó con fecha específica
  const proximoJueves = blocksStore.find((b) => b.externalUid === 'uid_proximo_jueves_002');
  if (!proximoJueves) {
    throw new Error('FALLO TEST 2: El evento del próximo jueves no fue encontrado en los bloques.');
  }
  if (!proximoJueves.date) {
    throw new Error(`FALLO TEST 2: El evento único debe tener date específico, got undefined.`);
  }
  console.log('✓ Evento puntual del próximo jueves guardado con fecha específica:', proximoJueves.date);

  // Comprobar que en calculateFreeSlots bloquea SOLO el jueves 22, pero NO el jueves 29
  const slotsJueves22 = calculateFreeSlots({
    dayOfWeek: 4, // Jueves
    classes: blocksStore,
    dateStr: proximoJueves.date,
    dayStart: '07:00',
    dayEnd: '21:00',
  });
  // En el jueves 22 debe haber huecos libres divididos antes y después del taller
  const hasFreeSlotOverlappingWorkshop22 = slotsJueves22.some((s) => {
    return s.startTime < proximoJueves.endTime && s.endTime > proximoJueves.startTime;
  });
  if (hasFreeSlotOverlappingWorkshop22) {
    throw new Error('FALLO TEST 2: El taller del jueves 22 debió bloquear ese horario.');
  }

  // En el jueves siguiente (2026-10-29), el evento NO debe bloquear
  const slotsJueves29 = calculateFreeSlots({
    dayOfWeek: 4, // Jueves
    classes: blocksStore,
    dateStr: '2026-10-29',
    dayStart: '07:00',
    dayEnd: '21:00',
  });
  // Como no hay otros bloques el 29, debe haber un único hueco continuo de 07:00 a 21:00
  const continuousSlot29 = slotsJueves29.find(
    (s) => s.startTime === '07:00' && s.endTime === '21:00'
  );
  if (!continuousSlot29) {
    throw new Error('FALLO TEST 2: El jueves 29 debió estar completamente libre (no bloqueado por el taller del 22).');
  }
  console.log('✓ TEST 2 PASADO: Evento único bloquea solo el jueves 22 y deja libre el jueves 29.');

  // 3. Verificar que la clase semanal con UNTIL bloquea hasta el 30 de noviembre
  const claseLunes = blocksStore.find((b) => b.externalUid === 'uid_clase_lunes_003');
  if (!claseLunes) {
    throw new Error('FALLO TEST 3: No se encontró la clase semanal de los lunes.');
  }
  if (claseLunes.date) {
    throw new Error(`Clase semanal con RRULE no debe tener date fijo, got ${claseLunes.date}`);
  }
  if (!claseLunes.untilDate) {
    throw new Error(`Clase semanal con UNTIL debe tener untilDate, got undefined`);
  }
  console.log('✓ Clase semanal guardada con untilDate:', claseLunes.untilDate);

  // Evaluar lunes 23 de noviembre (antes de untilDate): debe bloquear
  const slotsLunesNov = calculateFreeSlots({
    dayOfWeek: 1, // Lunes
    classes: blocksStore,
    dateStr: '2026-11-23',
    dayStart: '07:00',
    dayEnd: '21:00',
  });
  const hasOverlapNov = slotsLunesNov.some(
    (s) => s.startTime < claseLunes.endTime && s.endTime > claseLunes.startTime
  );
  if (hasOverlapNov) {
    throw new Error('FALLO TEST 3: La clase semanal debió bloquear el lunes 23 de noviembre.');
  }

  // Evaluar lunes 7 de diciembre (después de untilDate): NO debe bloquear
  const slotsLunesDic = calculateFreeSlots({
    dayOfWeek: 1, // Lunes
    classes: blocksStore,
    dateStr: '2026-12-07',
    dayStart: '07:00',
    dayEnd: '21:00',
  });
  const continuousSlotDic = slotsLunesDic.find(
    (s) => s.startTime === '07:00' && s.endTime === '21:00'
  );
  if (!continuousSlotDic) {
    throw new Error('FALLO TEST 3: El lunes 7 de diciembre debió estar libre tras vencer el UNTIL de la clase.');
  }
  console.log('✓ TEST 3 PASADO: Clase semanal bloquea hasta la fecha de UNTIL y se libera después.');

  // ═════════════════════════════════════════════════════════════
  // TEST 4: Una reunión no aparece en db.assignments
  // ═════════════════════════════════════════════════════════════
  console.log('\n--- Test 4: Reuniones SG sin assignments ni tareas ---');
  // Limpiar tiendas para probar feed de reuniones aislado
  blocksStore.length = 0;
  assignmentsStore.length = 0;

  // Sembrar un assignment previo espurio de iCal para verificar que se limpie
  assignmentsStore.push({
    id: 'asg_ics_antiguo',
    subjectId: 'area-admin-incubadora',
    title: 'Tarea vieja espuria de iCal',
    dueDate: '2026-10-20',
    priority: 'high',
    estimatedMinutes: 45,
    status: 'pending',
    source: 'ics',
  });

  const feedReuniones: CalendarFeedConfig = {
    id: 'feed_reuniones_sg',
    memberId: 'member-leon',
    name: 'Reuniones Seamos Genios',
    url: 'https://calendar.google.com/calendar/ical/sg/basic.ics',
    type: 'sg_meetings',
  };

  const syncReuniones = await calendarFeedService.syncFeed(feedReuniones, baseNow);
  if (!syncReuniones.success) throw new Error(`Reuniones sync failed: ${syncReuniones.error}`);

  // Verificar que NO existe NINGÚN assignment en db.assignments
  if (assignmentsStore.length !== 0) {
    throw new Error(
      `FALLO TEST 4: Las reuniones no deben crear assignments. Se encontraron ${assignmentsStore.length} en db.assignments.`
    );
  }

  // Verificar que sí se creó como bloque de horario en Administración & Incubadora
  const bloqueReunion = blocksStore.find((b) => b.externalUid === 'uid_reunion_sg_004');
  if (!bloqueReunion) {
    throw new Error('FALLO TEST 4: La reunión debe ocupar tiempo como ScheduleBlock en el horario.');
  }
  if (bloqueReunion.subjectId !== 'area-admin-incubadora') {
    throw new Error(`Reunión debe estar en 'area-admin-incubadora', got ${bloqueReunion.subjectId}`);
  }
  if (!bloqueReunion.title?.includes('Reunión con Incubadora SEAM')) {
    throw new Error(`Título inesperado para bloque de reunión: ${bloqueReunion.title}`);
  }
  console.log('✓ TEST 4 PASADO: 0 assignments en db.assignments y bloque de horario creado en Administración & Incubadora.');

  // ═════════════════════════════════════════════════════════════
  // TEST 5: "¿Qué hago ahora?" (getCurrentBlock) respeta fechas
  // ═════════════════════════════════════════════════════════════
  console.log('\n--- Test 5: getCurrentBlock en tiempo real con fecha ---');
  // Probar que el jueves 22 de octubre durante el evento estamos "in_class"
  const [startH, startM] = proximoJueves.startTime.split(':').map(Number);
  const midHour = `${String(startH).padStart(2, '0')}:${String((startM + 15) % 60).padStart(2, '0')}`;

  const currentBlockJueves22 = getCurrentBlock({
    dayOfWeek: 4,
    currentTime: midHour,
    classes: [proximoJueves],
    subjectsMap: {
      'area-admin-incubadora': {
        id: 'area-admin-incubadora',
        semesterId: 'sem_sg',
        name: 'Administración & Incubadora',
        code: 'ADM-INC',
        credits: 3,
        color: '#10b981',
        maxAbsences: 4,
        passingGrade: 3.0,
      },
    },
    dateStr: proximoJueves.date,
  });

  if (currentBlockJueves22.status !== 'in_class') {
    throw new Error(`Expected 'in_class' on Jueves 22 at ${midHour}, got ${currentBlockJueves22.status}`);
  }

  // El jueves 29 a la misma hora NO debe estar en clase (debe estar en hueco libre)
  const currentBlockJueves29 = getCurrentBlock({
    dayOfWeek: 4,
    currentTime: midHour,
    classes: [proximoJueves],
    subjectsMap: {
      'area-admin-incubadora': {
        id: 'area-admin-incubadora',
        semesterId: 'sem_sg',
        name: 'Administración & Incubadora',
        code: 'ADM-INC',
        credits: 3,
        color: '#10b981',
        maxAbsences: 4,
        passingGrade: 3.0,
      },
    },
    dateStr: '2026-10-29',
  });

  if (currentBlockJueves29.status === 'in_class') {
    throw new Error(`El jueves 29 a las ${midHour} NO debe estar en clase porque el evento era solo del día 22.`);
  }
  console.log('✓ TEST 5 PASADO: getCurrentBlock reconoce el bloque solo en su fecha exacta.');

  console.log('\nALL CALENDAR FEED REAL-CASE TESTS PASSED PERFECTLY! 🚀\n');
}

testCalendarFeedService();
