import { InboxAmbiguity } from './schemas';

const SPANISH_MONTHS: Record<string, number> = {
  enero: 0,
  febrero: 1,
  marzo: 2,
  abril: 3,
  mayo: 4,
  junio: 5,
  julio: 6,
  agosto: 7,
  septiembre: 8,
  setiembre: 8,
  octubre: 9,
  noviembre: 10,
  diciembre: 11,
};

const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

export function detectDateAmbiguities(text: string, baseDate: Date = new Date()): {
  resolvedDate?: string;
  ambiguities: InboxAmbiguity[];
} {
  const norm = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const ambiguities: InboxAmbiguity[] = [];

  // Caso: "el otro martes" / "el otro viernes" (muy ambiguo: ¿próximo o en dos semanas?)
  const otroDayMatch = norm.match(/el\s+otro\s+(lunes|martes|miercoles|jueves|viernes|sabado|domingo)/);
  if (otroDayMatch) {
    const dayName = otroDayMatch[1];
    const targetDayIndex = DAY_NAMES.indexOf(dayName);

    const currentDay = baseDate.getDay();
    let daysUntilNext = (targetDayIndex - currentDay + 7) % 7;
    if (daysUntilNext === 0) daysUntilNext = 7;

    const opt1 = new Date(baseDate);
    opt1.setDate(opt1.getDate() + daysUntilNext);

    const opt2 = new Date(baseDate);
    opt2.setDate(opt2.getDate() + daysUntilNext + 7);

    const opt1Str = opt1.toISOString().split('T')[0];
    const opt2Str = opt2.toISOString().split('T')[0];

    ambiguities.push({
      field: 'date',
      reason: `Expresión ambigua "${otroDayMatch[0]}": no está claro si corresponde a la semana entrante o la siguiente.`,
      options: [
        `${opt1Str} (Próximo ${dayName})`,
        `${opt2Str} (En 2 semanas)`,
      ],
    });

    return { resolvedDate: opt1Str, ambiguities };
  }

  // Caso: "mañana"
  if (/\bmanana\b/.test(norm)) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + 1);
    const dateStr = d.toISOString().split('T')[0];
    return { resolvedDate: dateStr, ambiguities };
  }

  // Caso: "hoy"
  if (/\bhoy\b/.test(norm)) {
    const dateStr = baseDate.toISOString().split('T')[0];
    return { resolvedDate: dateStr, ambiguities };
  }

  // Caso fecha explícita: "24 de septiembre", "24 sep", "24/09"
  const explicitMonthMatch = norm.match(/(\d{1,2})\s+(?:de\s+)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)/);
  if (explicitMonthMatch) {
    const day = parseInt(explicitMonthMatch[1], 10);
    const month = SPANISH_MONTHS[explicitMonthMatch[2]];
    const year = baseDate.getFullYear();
    const d = new Date(year, month, day);
    const dateStr = d.toISOString().split('T')[0];
    return { resolvedDate: dateStr, ambiguities };
  }

  // Caso fecha numérica: "24 a las 2" o "el 24"
  const dayOnlyMatch = norm.match(/(?:el|para el)\s+(\d{1,2})\b/);
  if (dayOnlyMatch) {
    const day = parseInt(dayOnlyMatch[1], 10);
    const month = baseDate.getMonth();
    const year = baseDate.getFullYear();
    const d = new Date(year, month, day);
    const dateStr = d.toISOString().split('T')[0];
    return { resolvedDate: dateStr, ambiguities };
  }

function parseTextMinutes(raw: string): number | null {
  const n = raw.toLowerCase();
  // 14:30
  const colon = n.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (colon) {
    return parseInt(colon[1], 10) * 60 + parseInt(colon[2], 10);
  }
  // 3pm, 2:30 pm
  const ampm = n.match(/\b([1-9]|1[0-2])(?::([0-5]\d))?\s*(am|pm)\b/);
  if (ampm) {
    let h = parseInt(ampm[1], 10);
    const m = ampm[2] ? parseInt(ampm[2], 10) : 0;
    const isPm = ampm[3] === 'pm';
    if (isPm && h < 12) h += 12;
    if (!isPm && h === 12) h = 0;
    return h * 60 + m;
  }
  // a las 15 / a las 3
  const aLas = n.match(/a\s+las\s+([1-9]|1\d|2[0-3])\b/);
  if (aLas) {
    let h = parseInt(aLas[1], 10);
    if (h >= 1 && h <= 6) h += 12;
    return h * 60;
  }
  return null;
}

  // Caso día de la semana: "para el jueves", "el martes", "martes", "este viernes"
  const dayOfWeekMatch = norm.match(/(?:para\s+el|para|el|este)?\s*\b(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b/);
  if (dayOfWeekMatch && !otroDayMatch) {
    const dayName = dayOfWeekMatch[1];
    const targetDayIndex = DAY_NAMES.indexOf(dayName);
    const currentDay = baseDate.getDay();
    let daysUntilNext = (targetDayIndex - currentDay + 7) % 7;

    // Si el día mencionado coincide con hoy (daysUntilNext === 0) y la hora especificada ya pasó hoy,
    // se agenda para el próximo ciclo semanal (+7 días)
    if (daysUntilNext === 0) {
      const eventMinutes = parseTextMinutes(text);
      const currentMinutes = baseDate.getHours() * 60 + baseDate.getMinutes();
      if (eventMinutes !== null && eventMinutes < currentMinutes) {
        daysUntilNext = 7;
      }
    }

    const d = new Date(baseDate);
    d.setDate(d.getDate() + daysUntilNext);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return { resolvedDate: `${year}-${month}-${day}`, ambiguities };
  }

  return { ambiguities };
}
