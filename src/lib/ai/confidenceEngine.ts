import { InboxItem, mapSGTypeToInternal } from './schemas';

/**
 * Motor de Confianza Determinístico
 * La IA NO inventa la confianza; el sistema la calcula mediante reglas semánticas auditables
 */
export function computeItemConfidence(
  item: Omit<InboxItem, 'confidence' | 'confidenceScore'>,
  isSubjectKnown: boolean
): { confidence: 'high' | 'medium' | 'low'; confidenceScore: number } {
  let score = 50; // Base neutral

  // 1. Fecha
  if (item.date && /^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
    score += 25;
  } else if (!item.date) {
    score -= 20;
  }

  // 2. Área / Materia
  if (isSubjectKnown && item.matchedSubjectId) {
    score += 25;
  } else if (item.area || item.subjectName) {
    score += 15;
  } else {
    score -= 15;
  }

  // 3. Responsable asignado (en SG suma claridad operativa)
  if (item.assigneeId) {
    score += 15;
  }

  // 4. Ponderación / Hitos
  const internal = item.internalType || mapSGTypeToInternal(item.type);
  if (internal === 'exam' || item.type === 'hito') {
    if (item.weight !== null && item.weight !== undefined && item.weight > 0) {
      score += 15;
    }
  }

  // 5. Hora
  if (item.startTime && /^\d{2}:\d{2}$/.test(item.startTime)) {
    score += 10;
  }

  // 6. Ambigüedades detectadas
  if (item.ambiguities && item.ambiguities.length > 0) {
    score -= item.ambiguities.length * 20;
  }

  // Clamp entre 0 y 100
  const normalizedScore = Math.max(0, Math.min(100, score));

  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (normalizedScore >= 75) {
    confidence = 'high';
  } else if (normalizedScore >= 50) {
    confidence = 'medium';
  }

  return {
    confidence,
    confidenceScore: normalizedScore,
  };
}
