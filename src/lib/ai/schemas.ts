import { z } from 'zod';

export const InboxAmbiguitySchema = z.object({
  field: z.string(),
  reason: z.string(),
  options: z.array(z.string()),
});

export type InboxAmbiguity = z.infer<typeof InboxAmbiguitySchema>;

export type SGItemType = 'entregable' | 'hito' | 'reunion' | 'bloque_fijo';
export type InternalItemType = 'assignment' | 'exam' | 'class' | 'routine';

export function mapSGTypeToInternal(type: string): InternalItemType {
  switch (type) {
    case 'entregable':
      return 'assignment';
    case 'hito':
      return 'exam';
    case 'reunion':
      return 'routine';
    case 'bloque_fijo':
      return 'class';
    case 'assignment':
    case 'exam':
    case 'class':
    case 'routine':
      return type;
    default:
      return 'assignment';
  }
}

export function mapInternalToSGType(type: string): SGItemType {
  switch (type) {
    case 'assignment':
      return 'entregable';
    case 'exam':
      return 'hito';
    case 'routine':
      return 'reunion';
    case 'class':
      return 'bloque_fijo';
    case 'entregable':
    case 'hito':
    case 'reunion':
    case 'bloque_fijo':
      return type;
    default:
      return 'entregable';
  }
}

export function defaultEstimatedMinutesForType(type: string): number {
  const norm = type.toLowerCase();
  if (norm === 'reunion' || norm === 'routine') return 45;
  if (norm === 'bloque_fijo' || norm === 'class') return 90;
  if (norm === 'hito' || norm === 'exam') return 120;
  return 60; // entregable / assignment
}

export const InboxItemSchema = z.object({
  id: z.string(),
  type: z.enum([
    'entregable',
    'hito',
    'reunion',
    'bloque_fijo',
    'assignment',
    'exam',
    'class',
    'routine',
  ]),
  internalType: z.enum(['assignment', 'exam', 'class', 'routine']).optional(),
  title: z.string(),
  area: z.string().nullable().optional(),
  subjectName: z.string().nullable().optional(),
  matchedSubjectId: z.string().nullable().optional(),
  assigneeId: z.string().nullable().optional(),
  assigneeName: z.string().nullable().optional(),
  date: z.string().nullable(), // YYYY-MM-DD
  startTime: z.string().nullable(), // HH:mm
  endTime: z.string().nullable(), // HH:mm
  estimatedMinutes: z.number().nullable().optional(),
  weight: z.number().min(0).max(100).nullable().optional(),
  description: z.string().nullable().optional(),
  sourceText: z.string(), // Texto exacto que sustentó la extracción (Auditoría)
  ambiguities: z.array(InboxAmbiguitySchema),
  confidence: z.enum(['high', 'medium', 'low']).optional(),
  confidenceScore: z.number().optional(),
});

export type InboxItem = z.infer<typeof InboxItemSchema>;

export const InboxExtractionSchema = z.object({
  items: z.array(InboxItemSchema),
  rawTextSummary: z.string().optional(),
});

export type InboxExtraction = z.infer<typeof InboxExtractionSchema>;
