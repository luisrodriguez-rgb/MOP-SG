import { InboxItem, mapSGTypeToInternal, defaultEstimatedMinutesForType } from './schemas';
import { detectDateAmbiguities } from './ambiguityEngine';
import { computeItemConfidence } from './confidenceEngine';

export interface SubjectContext {
  id: string;
  name: string;
  code: string;
}

export interface MemberContext {
  id: string;
  name: string;
  role?: string;
}

export const DEFAULT_SG_AREAS: SubjectContext[] = [
  { id: 'area-marketing-video', name: 'Marketing, Diseño & Video', code: 'MKT-VID' },
  { id: 'area-dev-soporte', name: 'Desarrollo & Soporte', code: 'DEV-SOP' },
  { id: 'area-docencia-contenido', name: 'Docencia & Contenido', code: 'DOC-CNT' },
  { id: 'area-admin-incubadora', name: 'Administración & Incubadora', code: 'ADM-INC' },
];

export const DEFAULT_SG_MEMBERS: MemberContext[] = [
  { id: 'member-leon', name: 'Leon', role: 'Administración, Marketing, Diseño & Video' },
  { id: 'member-dani', name: 'Dani', role: 'Desarrollo, Administración & Soporte' },
  { id: 'member-angel', name: 'Ángel', role: 'Administración & Docencia' },
];

/**
 * Identifica el socio responsable del equipo en el texto
 */
export function matchMember(
  text: string,
  members: MemberContext[] = DEFAULT_SG_MEMBERS
): { matchedMember?: MemberContext; assigneeId: string | null; assigneeName: string | null } {
  const normText = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  for (const m of members) {
    const normName = m.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const regex = new RegExp(`(?:@|\\b)${normName}\\b`, 'i');
    if (regex.test(normText)) {
      return { matchedMember: m, assigneeId: m.id, assigneeName: m.name };
    }
  }

  const encargaMatch = normText.match(/(?:se encarga|asignado a|responsable:?)\s+([a-z]+)/i);
  if (encargaMatch) {
    const target = encargaMatch[1];
    const found = members.find(
      (m) => m.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === target
    );
    if (found) return { matchedMember: found, assigneeId: found.id, assigneeName: found.name };
  }

  return { assigneeId: null, assigneeName: null };
}

/**
 * Encuentra el área operativa de Seamos Genios más afín
 */
export function matchSubject(
  text: string,
  subjects: SubjectContext[] = DEFAULT_SG_AREAS
): { matchedSubject?: SubjectContext; subjectName: string | null } {
  const normText = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // 1. Coincidencia directa con nombres o códigos provistos
  for (const sub of subjects) {
    const normSubName = sub.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const normSubCode = sub.code.toLowerCase();

    if (normText.includes(normSubName) || (normSubCode && normText.includes(normSubCode))) {
      return { matchedSubject: sub, subjectName: sub.name };
    }

    const words = normSubName.split(/[\s,&]+/).filter((w) => w.length > 3);
    for (const word of words) {
      if (normText.includes(word)) {
        return { matchedSubject: sub, subjectName: sub.name };
      }
    }
  }

  // 2. Patrones semánticos por área de Seamos Genios
  if (/(?:video|playtest|marketing|diseno|diseño|trailer|youtube|tiktok|redes|copy|guion)\b/i.test(normText)) {
    const found = subjects.find(
      (s) => s.id === 'area-marketing-video' || s.name.includes('Marketing') || s.name.includes('Video')
    );
    if (found) return { matchedSubject: found, subjectName: found.name };
  }

  if (/(?:bug|login|desarrollo|soporte|dev|codigo|código|plataforma|api|backend|frontend|app)\b/i.test(normText)) {
    const found = subjects.find(
      (s) => s.id === 'area-dev-soporte' || s.name.includes('Desarrollo') || s.name.includes('Soporte')
    );
    if (found) return { matchedSubject: found, subjectName: found.name };
  }

  if (/(?:docencia|contenido|pedagogico|pedagogía|taller|curso|clase|estudiantes)\b/i.test(normText)) {
    const found = subjects.find(
      (s) => s.id === 'area-docencia-contenido' || s.name.includes('Docencia') || s.name.includes('Contenido')
    );
    if (found) return { matchedSubject: found, subjectName: found.name };
  }

  if (/(?:incubadora|administracion|administración|admin|finanzas|b2b|pitch|legal|alianza)\b/i.test(normText)) {
    const found = subjects.find(
      (s) => s.id === 'area-admin-incubadora' || s.name.includes('Administración') || s.name.includes('Incubadora')
    );
    if (found) return { matchedSubject: found, subjectName: found.name };
  }

  // 3. Patrones de extracción descriptiva: "reunión con [X]", "área de [X]"
  const sgPatternMatch = text.match(/(?:reunion con|reunión con|area de|área de|proyecto)\s+([A-Za-zÁÉÍÓÚáéíóúñÑ0-9\s]{3,30})/i);
  if (sgPatternMatch) {
    const captured = sgPatternMatch[1].trim();
    if (/incubadora/i.test(captured)) {
      const found = subjects.find(
        (s) => s.id === 'area-admin-incubadora' || s.name.includes('Incubadora')
      );
      if (found) return { matchedSubject: found, subjectName: found.name };
    }
    return { subjectName: captured };
  }

  // 4. Soporte para formatos académicos heredados
  const genericMatch = text.match(/(?:profesor de|profe de|parcial de|materia|clase)\s+([A-Za-zÁÉÍÓÚáéíóúñÑ0-9\s]{3,25})/i);
  if (genericMatch) {
    return { subjectName: genericMatch[1].trim() };
  }

  return { subjectName: null };
}

/**
 * Extrae la hora de una oración (formato 24h o 12h: "2:00 pm", "3pm", "a las 2", "14:00")
 */
export function extractTimeHHmm(text: string): string | null {
  const norm = text.toLowerCase();

  // "14:30" o "07:00"
  const colon24Match = norm.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (colon24Match) {
    const h = colon24Match[1].padStart(2, '0');
    return `${h}:${colon24Match[2]}`;
  }

  // "2:00 pm", "3pm", "8:30 am", "11am"
  const ampmMatch = norm.match(/\b([1-9]|1[0-2])(?::([0-5]\d))?\s*(am|pm)\b/);
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1], 10);
    const m = ampmMatch[2] || '00';
    const isPm = ampmMatch[3] === 'pm';
    if (isPm && h < 12) h += 12;
    if (!isPm && h === 12) h = 0;
    return `${h.toString().padStart(2, '0')}:${m}`;
  }

  // "a las 2" / "a las 14"
  const aLasMatch = norm.match(/a\s+las\s+([1-9]|1\d|2[0-3])\b/);
  if (aLasMatch) {
    let h = parseInt(aLasMatch[1], 10);
    if (h >= 1 && h <= 6) h += 12;
    return `${h.toString().padStart(2, '0')}:00`;
  }

  return null;
}

/**
 * Extrae porcentaje o peso: "vale 20%", "peso: 25%", "25 %"
 */
export function extractWeight(text: string): number | null {
  const match = text.match(/(?:vale|peso|ponderacion|porcentaje|equivale a)?\s*(\d{1,2})\s*%/i);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}

/**
 * Extrae minutos estimados explícitos o asigna el default del tipo
 */
export function extractEstimatedMinutes(
  sentence: string,
  type: 'entregable' | 'hito' | 'reunion' | 'bloque_fijo'
): number {
  const norm = sentence.toLowerCase();
  const minMatch = norm.match(/(\d{1,3})\s*(?:minutos|min|mins)\b/);
  if (minMatch) return parseInt(minMatch[1], 10);

  const hourMatch = norm.match(/(\d{1,2})\s*(?:horas|hora|h)\b/);
  if (hourMatch) return parseInt(hourMatch[1], 10) * 60;

  return defaultEstimatedMinutesForType(type);
}

const COMMON_CONJUGATIONS_TO_INFINITIVE: Record<string, string> = {
  edita: 'Editar',
  editar: 'Editar',
  revisa: 'Revisar',
  revisar: 'Revisar',
  disena: 'Diseñar',
  diseña: 'Diseñar',
  diseñar: 'Diseñar',
  prepara: 'Preparar',
  preparar: 'Preparar',
  arregla: 'Arreglar',
  arreglar: 'Arreglar',
  crea: 'Crear',
  crear: 'Crear',
  haz: 'Hacer',
  hace: 'Hacer',
  hacer: 'Hacer',
  sube: 'Subir',
  subir: 'Subir',
  graba: 'Grabar',
  grabar: 'Grabar',
  corrige: 'Corregir',
  corregir: 'Corregir',
  escribe: 'Escribir',
  escribir: 'Escribir',
  prueba: 'Probar',
  probar: 'Probar',
  publica: 'Publicar',
  publicar: 'Publicar',
  envia: 'Enviar',
  envía: 'Enviar',
  enviar: 'Enviar',
  organiza: 'Organizar',
  organizar: 'Organizar',
  coordina: 'Coordinar',
  coordinar: 'Coordinar',
  llama: 'Llamar',
  llamar: 'Llamar',
  contacta: 'Contactar',
  contactar: 'Contactar',
  actualiza: 'Actualizar',
  actualizar: 'Actualizar',
  termina: 'Terminar',
  terminar: 'Terminar',
  monta: 'Montar',
  montar: 'Montar',
  soluciona: 'Solucionar',
  solucionar: 'Solucionar',
  ajusta: 'Ajustar',
  ajustar: 'Ajustar',
  redacta: 'Redactar',
  redactar: 'Redactar',
};

/**
 * Limpia y normaliza el título para entregables, usando el verbo en infinitivo
 */
function extractDeliverableTitle(sentence: string): string {
  let clean = sentence
    .replace(/(?:para el|para|el)\s+(?:lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)\b/gi, '')
    .replace(/\b(?:hoy|mañana|manana|ayer)\b/gi, '')
    .replace(/\b(?:a las\s+\d{1,2}(?::\d{2})?(?:\s*(?:am|pm))?|\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/gi, '')
    .trim();

  // Remover prefijo del socio si inicia con él: "Leon edita el video..." -> "Edita el video..."
  const memberPrefix = clean.match(/^(?:Leon|Dani|Ángel|Angel|Leo)\s+(?:se encarga de\s+)?(.+)/i);
  if (memberPrefix) {
    clean = memberPrefix[1].trim();
  }

  // Normalizar primera palabra al infinitivo ("Edita" -> "Editar", "Revisa" -> "Revisar")
  const firstWordMatch = clean.match(/^([a-zA-ZáéíóúÁÉÍÓÚñÑ]+)\b/);
  if (firstWordMatch) {
    const rawWord = firstWordMatch[1];
    const key = rawWord.toLowerCase();
    const normalizedKey = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const infinitive = COMMON_CONJUGATIONS_TO_INFINITIVE[key] || COMMON_CONJUGATIONS_TO_INFINITIVE[normalizedKey];
    if (infinitive) {
      clean = `${infinitive}${clean.slice(rawWord.length)}`;
    }
  }

  if (clean.length > 0) {
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }
  return 'Entregable';
}

/**
 * Preprocesador Determinístico Local para MOP-SG
 * Segmenta mensajes de WhatsApp del equipo y extrae entregables, hitos, reuniones y bloques fijos
 */
export function preprocessInboxText(
  rawText: string,
  enrolledSubjects: SubjectContext[] = DEFAULT_SG_AREAS,
  baseDate: Date = new Date(),
  teamMembers: MemberContext[] = DEFAULT_SG_MEMBERS
): InboxItem[] {
  if (!rawText || !rawText.trim()) return [];

  // Dividir texto por oraciones, saltos de línea o conectores
  const sentences = rawText
    .split(/(?:\.\s+|\n+|;\s+|(?<=\w)\s+y\s+(?:el|la|para|para el|entregar|revisar|editar|preparar)\b)/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);

  const items: InboxItem[] = [];

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const norm = sentence.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // 1. Identificar Responsable
    const { assigneeId, assigneeName } = matchMember(sentence, teamMembers);

    // 2. Determinar Tipo
    let type: 'entregable' | 'hito' | 'reunion' | 'bloque_fijo' | null = null;
    let title = '';

    const isReunion = /(?:reunion|reunión|meet|llamada|call|sesion con|sincronizacion|sync|daily|1:1)\b/i.test(sentence);
    const isBloqueFijo = /(?:bloque fijo|horario fijo|rutina|clase fija|almuerzo|gym|gimnasio)\b/i.test(norm);
    const hasMilestoneKeyword = /(?:hito|playtest|lanzamiento|demo day|corte|pitch|parcial|examen|evaluacion|quiz)\b/i.test(norm);
    const hasDeliverableAction = /(?:edita|revisa|disena|diseña|prepara|arregla|crea|subir|grabar|bug|video|tarea|taller|entrega\b|entregar|ejercicio|reporte|post|copy|guion|se encarga)\b/i.test(norm);

    if (isReunion) {
      type = 'reunion';
      const m = sentence.match(/(?:reunion|reunión)\s+(?:con\s+)?([^,.;]+)/i);
      if (m) {
        const entity = m[1].replace(/\b(?:martes|lunes|miercoles|miércoles|jueves|viernes|sabado|sábado|domingo|\d+pm|\d+am|\d{1,2}:\d{2})\b/gi, '').trim();
        title = `Reunión con ${entity}`;
      } else {
        title = 'Reunión de equipo';
      }
    } else if (isBloqueFijo) {
      type = 'bloque_fijo';
      title = norm.includes('gym') ? 'Gimnasio' : norm.includes('almuerzo') ? 'Almuerzo' : 'Bloque fijo';
    } else if (hasMilestoneKeyword && !hasDeliverableAction && !assigneeId) {
      type = 'hito';
      if (norm.includes('playtest')) title = 'Playtest';
      else if (norm.includes('parcial 1') || norm.includes('primer parcial')) title = 'Parcial 1';
      else if (norm.includes('parcial 2') || norm.includes('segundo parcial')) title = 'Parcial 2';
      else if (norm.includes('parcial 3') || norm.includes('tercer parcial')) title = 'Parcial 3';
      else if (norm.includes('parcial')) title = 'Parcial';
      else if (norm.includes('quiz')) title = 'Quiz';
      else title = 'Hito clave';
    } else if (hasDeliverableAction || hasMilestoneKeyword || assigneeId) {
      type = 'entregable';
      title = extractDeliverableTitle(sentence);
    }

    if (!type) continue;

    // 3. Área operativa
    const { matchedSubject, subjectName } = matchSubject(sentence, enrolledSubjects);
    const areaName = matchedSubject ? matchedSubject.name : subjectName;

    // 4. Fecha y ambigüedades
    const { resolvedDate, ambiguities } = detectDateAmbiguities(sentence, baseDate);

    // 5. Hora
    const startTime = extractTimeHHmm(sentence);

    // 6. Peso / Ponderación
    const weight = extractWeight(sentence);

    // 7. Minutos estimados
    const estimatedMinutes = extractEstimatedMinutes(sentence, type);

    // 8. Confianza determinística
    const { confidence, confidenceScore } = computeItemConfidence(
      {
        id: `inbox_${Date.now()}_${i}`,
        type,
        internalType: mapSGTypeToInternal(type),
        title,
        area: areaName,
        subjectName: areaName,
        matchedSubjectId: matchedSubject?.id || null,
        assigneeId,
        assigneeName,
        date: resolvedDate || null,
        startTime: startTime || null,
        endTime: null,
        estimatedMinutes,
        weight: weight || null,
        sourceText: sentence,
        ambiguities,
      },
      Boolean(matchedSubject)
    );

    items.push({
      id: `inbox_${Date.now()}_${i}`,
      type,
      internalType: mapSGTypeToInternal(type),
      title,
      area: areaName,
      subjectName: areaName,
      matchedSubjectId: matchedSubject?.id || null,
      assigneeId,
      assigneeName,
      date: resolvedDate || null,
      startTime: startTime || null,
      endTime: null,
      estimatedMinutes,
      weight: weight || null,
      description: null,
      sourceText: sentence,
      ambiguities,
      confidence,
      confidenceScore,
    });
  }

  return items;
}
