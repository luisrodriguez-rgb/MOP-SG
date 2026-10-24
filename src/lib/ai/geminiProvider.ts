import { GoogleGenAI } from '@google/genai';
import { AIProvider } from './provider';
import {
  InboxItem,
  InboxExtractionSchema,
  mapSGTypeToInternal,
  defaultEstimatedMinutesForType,
} from './schemas';
import {
  preprocessInboxText,
  SubjectContext,
  MemberContext,
  DEFAULT_SG_AREAS,
  DEFAULT_SG_MEMBERS,
} from './preprocessor';
import { computeItemConfidence } from './confidenceEngine';

export class GeminiProvider implements AIProvider {
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY;
  }

  async extractInboxItems(params: {
    rawText: string;
    enrolledSubjects?: SubjectContext[];
    members?: MemberContext[];
    baseDate?: Date;
  }): Promise<{ items: InboxItem[]; sourceEngine: 'gemini' | 'preprocessor' }> {
    const {
      rawText,
      enrolledSubjects = DEFAULT_SG_AREAS,
      members = DEFAULT_SG_MEMBERS,
      baseDate = new Date(),
    } = params;

    const activeAreas = enrolledSubjects.length > 0 ? enrolledSubjects : DEFAULT_SG_AREAS;
    const activeMembers = members.length > 0 ? members : DEFAULT_SG_MEMBERS;

    // Si no hay API key configurada en el servidor, usamos el preprocesador determinístico
    if (!this.apiKey) {
      const items = preprocessInboxText(rawText, activeAreas, baseDate, activeMembers);
      return { items, sourceEngine: 'preprocessor' };
    }

    try {
      const ai = new GoogleGenAI({ apiKey: this.apiKey });
      const areasListStr = activeAreas
        .map((s) => `- ${s.name} (Código: ${s.code || s.id})`)
        .join('\n');
      const membersListStr = activeMembers
        .map((m) => `- ${m.name} (ID: ${m.id}, Rol: ${m.role || 'Socio'})`)
        .join('\n');
      const todayStr = baseDate.toISOString().split('T')[0];

      const prompt = `Eres el asistente de captura de MOP-SG, la herramienta interna del equipo de Seamos Genios. Conviertes mensajes de WhatsApp del equipo en entregables, hitos, reuniones y bloques fijos.

FECHA DE REFERENCIA DE HOY: ${todayStr}

SOCIOS DEL EQUIPO (members):
${membersListStr}

ÁREAS OPERATIVAS DE SEAMOS GENIOS:
${areasListStr}

TEXTO A PROCESAR:
"""
${rawText}
"""

INSTRUCCIONES:
1. Extrae cada elemento identificando su tipo exacto:
   - 'entregable': tareas operativas, bugs, videos, copys, documentos o acciones puntuales.
   - 'hito': eventos clave, playtests, fechas límite mayores, cierres de temporada o lanzamientos.
   - 'reunion': llamadas, sincronizaciones, reuniones con incubadora, clientes o sesiones de equipo.
   - 'bloque_fijo': bloques de trabajo recurrente o rutinas fijas.
2. Para cada elemento extrae:
   - 'type': 'entregable' | 'hito' | 'reunion' | 'bloque_fijo'
   - 'title': título conciso y claro de la acción.
   - 'area': nombre de una de las 4 áreas operativas de Seamos Genios.
   - 'assigneeId': ID exacto del socio en 'members' (ej: 'member-leon', 'member-dani', 'member-angel') o null si no se menciona responsable.
   - 'assigneeName': nombre del socio responsable o null.
   - 'date': fecha en formato YYYY-MM-DD o null si no se deduce.
   - 'startTime': hora de inicio en formato HH:mm (ej: '15:00') o null.
   - 'endTime': hora de fin en formato HH:mm o null.
   - 'estimatedMinutes': duración estimada en minutos. Si no viene explícita en el texto, propón una según el tipo (reunion: 45, entregable: 60, hito: 120, bloque_fijo: 90).
   - 'sourceText': frase o fragmento exacto que sustentó la extracción para auditoría humana.
   - 'ambiguities': lista de ambigüedades encontradas (field, reason, options).
3. NO inventes datos que no estén respaldados por el texto. Si un campo no aplica o no se menciona, usa null.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              items: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: {
                    id: { type: 'STRING' },
                    type: {
                      type: 'STRING',
                      enum: [
                        'entregable',
                        'hito',
                        'reunion',
                        'bloque_fijo',
                        'assignment',
                        'exam',
                        'class',
                        'routine',
                      ],
                    },
                    title: { type: 'STRING' },
                    area: { type: 'STRING', nullable: true },
                    subjectName: { type: 'STRING', nullable: true },
                    assigneeId: { type: 'STRING', nullable: true },
                    assigneeName: { type: 'STRING', nullable: true },
                    date: { type: 'STRING', nullable: true },
                    startTime: { type: 'STRING', nullable: true },
                    endTime: { type: 'STRING', nullable: true },
                    estimatedMinutes: { type: 'NUMBER', nullable: true },
                    weight: { type: 'NUMBER', nullable: true },
                    description: { type: 'STRING', nullable: true },
                    sourceText: { type: 'STRING' },
                    ambiguities: {
                      type: 'ARRAY',
                      items: {
                        type: 'OBJECT',
                        properties: {
                          field: { type: 'STRING' },
                          reason: { type: 'STRING' },
                          options: { type: 'ARRAY', items: { type: 'STRING' } },
                        },
                        required: ['field', 'reason', 'options'],
                      },
                    },
                  },
                  required: ['id', 'type', 'title', 'sourceText', 'ambiguities'],
                },
              },
            },
            required: ['items'],
          },
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Gemini devolvió respuesta vacía');
      }

      const parsedJson = JSON.parse(responseText);
      const validation = InboxExtractionSchema.safeParse(parsedJson);

      if (!validation.success) {
        console.warn('Fallo de validación Zod en respuesta de Gemini, usando fallback:', validation.error);
        const fallbackItems = preprocessInboxText(rawText, activeAreas, baseDate, activeMembers);
        return { items: fallbackItems, sourceEngine: 'preprocessor' };
      }

      // Procesar cada ítem con el ConfidenceEngine determinístico y asociar IDs
      const validatedItems: InboxItem[] = validation.data.items.map((item, idx) => {
        // Enlazar con área operativa
        let matchedSubjectId: string | null = null;
        const areaToMatch = item.area || item.subjectName;
        if (areaToMatch) {
          const normItemArea = areaToMatch.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const match = activeAreas.find((s) => {
            const normSub = s.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            return normItemArea.includes(normSub) || normSub.includes(normItemArea);
          });
          if (match) matchedSubjectId = match.id;
        }

        // Enlazar responsable si no vino el ID pero sí el nombre
        let assigneeId = item.assigneeId || null;
        let assigneeName = item.assigneeName || null;
        if (!assigneeId && assigneeName) {
          const foundM = activeMembers.find(
            (m) =>
              m.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') ===
              assigneeName!.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          );
          if (foundM) {
            assigneeId = foundM.id;
            assigneeName = foundM.name;
          }
        }

        const internalType = mapSGTypeToInternal(item.type);
        const estimatedMinutes = item.estimatedMinutes || defaultEstimatedMinutesForType(item.type);

        const { confidence, confidenceScore } = computeItemConfidence(
          {
            ...item,
            id: item.id || `inbox_gemini_${Date.now()}_${idx}`,
            type: item.type,
            internalType,
            area: areaToMatch,
            subjectName: areaToMatch,
            matchedSubjectId,
            assigneeId,
            assigneeName,
            estimatedMinutes,
          },
          Boolean(matchedSubjectId)
        );

        return {
          ...item,
          id: item.id || `inbox_gemini_${Date.now()}_${idx}`,
          type: item.type,
          internalType,
          area: areaToMatch,
          subjectName: areaToMatch,
          matchedSubjectId,
          assigneeId,
          assigneeName,
          estimatedMinutes,
          confidence,
          confidenceScore,
        };
      });

      return { items: validatedItems, sourceEngine: 'gemini' };
    } catch (err) {
      console.warn('Error llamando a Gemini, conmutando a preprocesador determinístico:', err);
      const fallbackItems = preprocessInboxText(rawText, activeAreas, baseDate, activeMembers);
      return { items: fallbackItems, sourceEngine: 'preprocessor' };
    }
  }
}
