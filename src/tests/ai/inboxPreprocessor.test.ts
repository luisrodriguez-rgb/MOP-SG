import { preprocessInboxText } from '../../lib/ai/preprocessor';

function testInboxPreprocessor() {
  console.log('--- Testing Inbox Deterministic Preprocessor & Confidence Engine ---');

  // ═════════════════════════════════════════════════════════════
  // 1. Mensajes reales de Seamos Genios (SG)
  // ═════════════════════════════════════════════════════════════

  // SG Test 1: "Leon edita el video del Playtest para el jueves"
  console.log('\n--- Testing SG Scenario 1: Video Playtest Leon ---');
  const rawSg1 = 'Leon edita el video del Playtest para el jueves';
  const baseSg1 = new Date(2026, 9, 20); // Martes 20 Octubre 2026 -> Jueves es 22 Octubre
  const itemsSg1 = preprocessInboxText(rawSg1, undefined, baseSg1);
  if (itemsSg1.length !== 1) throw new Error(`SG 1 expected 1 item, got ${itemsSg1.length}`);
  const item1 = itemsSg1[0];
  console.log('SG Item 1:', {
    type: item1.type,
    title: item1.title,
    area: item1.area,
    assigneeName: item1.assigneeName,
    date: item1.date,
    estimatedMinutes: item1.estimatedMinutes,
  });
  if (item1.type !== 'entregable') throw new Error(`SG 1 expected type 'entregable', got ${item1.type}`);
  if (item1.title !== 'Editar el video del Playtest') {
    throw new Error(`SG 1 expected title in infinitive 'Editar el video del Playtest', got '${item1.title}'`);
  }
  if (item1.assigneeId !== 'member-leon' || item1.assigneeName !== 'Leon') {
    throw new Error(`SG 1 expected assignee Leon ('member-leon'), got ${item1.assigneeName} (${item1.assigneeId})`);
  }
  if (!item1.matchedSubjectId || item1.matchedSubjectId !== 'area-marketing-video') {
    throw new Error(`SG 1 expected area-marketing-video, got ${item1.matchedSubjectId}`);
  }
  if (item1.date !== '2026-10-22') {
    throw new Error(`SG 1 expected date 2026-10-22 (jueves), got ${item1.date}`);
  }
  if (item1.estimatedMinutes !== 60) {
    throw new Error(`SG 1 expected 60 estimated minutes, got ${item1.estimatedMinutes}`);
  }
  console.log('✓ SG Test 1 passed: "Leon edita el video del Playtest para el jueves" -> "Editar el video del Playtest"');

  // SG Test 2: "Reunión con la incubadora martes 3pm" (hora futura respecto a baseDate)
  console.log('\n--- Testing SG Scenario 2: Reunión Incubadora (futuro en el mismo día) ---');
  const rawSg2 = 'Reunión con la incubadora martes 3pm';
  const baseSg2 = new Date(2026, 9, 20, 10, 0, 0); // Martes 20 Octubre 2026 a las 10:00 am
  const itemsSg2 = preprocessInboxText(rawSg2, undefined, baseSg2);
  if (itemsSg2.length !== 1) throw new Error(`SG 2 expected 1 item, got ${itemsSg2.length}`);
  const item2 = itemsSg2[0];
  console.log('SG Item 2:', {
    type: item2.type,
    title: item2.title,
    area: item2.area,
    date: item2.date,
    startTime: item2.startTime,
    estimatedMinutes: item2.estimatedMinutes,
  });
  if (item2.type !== 'reunion') throw new Error(`SG 2 expected type 'reunion', got ${item2.type}`);
  if (item2.matchedSubjectId !== 'area-admin-incubadora') {
    throw new Error(`SG 2 expected area-admin-incubadora, got ${item2.matchedSubjectId}`);
  }
  if (item2.date !== '2026-10-20') {
    throw new Error(`SG 2 expected date 2026-10-20 (martes), got ${item2.date}`);
  }
  if (item2.startTime !== '15:00') {
    throw new Error(`SG 2 expected startTime 15:00 (3pm), got ${item2.startTime}`);
  }
  if (item2.estimatedMinutes !== 45) {
    throw new Error(`SG 2 expected 45 estimated minutes, got ${item2.estimatedMinutes}`);
  }
  console.log('✓ SG Test 2 passed: "Reunión con la incubadora martes 3pm"');

  // SG Test 3: "Dani revisa el bug del login hoy"
  console.log('\n--- Testing SG Scenario 3: Bug Login Dani ---');
  const rawSg3 = 'Dani revisa el bug del login hoy';
  const baseSg3 = new Date(2026, 9, 20); // 20 Octubre 2026
  const itemsSg3 = preprocessInboxText(rawSg3, undefined, baseSg3);
  if (itemsSg3.length !== 1) throw new Error(`SG 3 expected 1 item, got ${itemsSg3.length}`);
  const item3 = itemsSg3[0];
  console.log('SG Item 3:', {
    type: item3.type,
    title: item3.title,
    area: item3.area,
    assigneeName: item3.assigneeName,
    date: item3.date,
    estimatedMinutes: item3.estimatedMinutes,
  });
  if (item3.type !== 'entregable') throw new Error(`SG 3 expected type 'entregable', got ${item3.type}`);
  if (item3.title !== 'Revisar el bug del login') {
    throw new Error(`SG 3 expected title in infinitive 'Revisar el bug del login', got '${item3.title}'`);
  }
  if (item3.assigneeId !== 'member-dani' || item3.assigneeName !== 'Dani') {
    throw new Error(`SG 3 expected assignee Dani ('member-dani'), got ${item3.assigneeName} (${item3.assigneeId})`);
  }
  if (item3.matchedSubjectId !== 'area-dev-soporte') {
    throw new Error(`SG 3 expected area-dev-soporte, got ${item3.matchedSubjectId}`);
  }
  if (item3.date !== '2026-10-20') {
    throw new Error(`SG 3 expected date 2026-10-20 (hoy), got ${item3.date}`);
  }
  if (item3.estimatedMinutes !== 60) {
    throw new Error(`SG 3 expected 60 estimated minutes, got ${item3.estimatedMinutes}`);
  }
  console.log('✓ SG Test 3 passed: "Dani revisa el bug del login hoy" -> "Revisar el bug del login"');

  // SG Test 4: "Reunión con la incubadora martes 3pm" cuando ya son las 5pm del martes (hora ya pasó hoy)
  console.log('\n--- Testing SG Scenario 4: "Martes 3pm" cuando hoy es martes 5pm (hora ya pasó) ---');
  const baseSg4 = new Date(2026, 9, 20, 17, 0, 0); // Martes 20 Octubre 2026 a las 5:00 pm (17:00)
  const itemsSg4 = preprocessInboxText('Reunión con la incubadora martes 3pm', undefined, baseSg4);
  if (itemsSg4.length !== 1) throw new Error(`SG 4 expected 1 item, got ${itemsSg4.length}`);
  const item4 = itemsSg4[0];
  console.log('SG Item 4:', {
    title: item4.title,
    date: item4.date,
    startTime: item4.startTime,
  });
  if (item4.date !== '2026-10-27') {
    throw new Error(`SG 4 expected date 2026-10-27 (próximo martes), got ${item4.date}`);
  }
  console.log('✓ SG Test 4 passed: "martes 3pm" a las 5pm pasa correctamente al próximo martes 27 de octubre');

  // ═════════════════════════════════════════════════════════════
  // 2. Compatibilidad con mensajes compuestos
  // ═════════════════════════════════════════════════════════════
  const enrolledSubjects = [
    { id: 'sub-est', name: 'Estadística Aplicada II', code: '11373' },
    { id: 'sub-opt', name: 'Optimización', code: '05359' },
    { id: 'sub-mat', name: 'Matemáticas aplicadas III', code: '11356' },
  ];

  const raw = 'Muchachos el parcial de estadística quedó para el 24 a las 2, vale 20%. El ejercicio 3 se entrega mañana en parejas.';
  const baseDate = new Date(2026, 8, 10);

  const items = preprocessInboxText(raw, enrolledSubjects, baseDate);
  if (items.length !== 2) {
    throw new Error(`Expected exactly 2 items, got ${items.length}`);
  }

  const [examItem, taskItem] = items;
  if (examItem.type !== 'exam' && examItem.type !== 'hito') {
    throw new Error(`Item 1 should be exam or hito, got ${examItem.type}`);
  }
  if (examItem.matchedSubjectId !== 'sub-est') throw new Error('Item 1 failed to match Estadística Aplicada II');
  if (examItem.weight !== 20) throw new Error(`Item 1 expected weight 20, got ${examItem.weight}`);
  if (examItem.startTime !== '14:00') throw new Error(`Item 1 expected 14:00, got ${examItem.startTime}`);

  if (taskItem.type !== 'assignment' && taskItem.type !== 'entregable') {
    throw new Error(`Item 2 should be assignment or entregable, got ${taskItem.type}`);
  }
  if (taskItem.date !== '2026-09-11') throw new Error(`Item 2 expected tomorrow (2026-09-11), got ${taskItem.date}`);

  console.log('✓ Both items extracted with sourceText and calculated confidence successfully');
  console.log('ALL INBOX PREPROCESSOR TESTS PASSED SUCCESSFULLY!\n');
}

testInboxPreprocessor();
