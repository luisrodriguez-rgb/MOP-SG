/**
 * MOP-SG (Mi Operación Personal - Seamos Genios)
 * Sistema centralizado de etiquetas y vocabulario para desacoplar el dominio
 * operativo de la empresa (Áreas, Hitos, Entregables, Responsables)
 * de las estructuras de datos heredadas (Subject, Exam, Assignment).
 */

export const LABELS = {
  // Dominio Operativo vs Dominio Académico
  area: 'Área',
  areas: 'Áreas',
  milestone: 'Hito',
  milestones: 'Hitos',
  task: 'Entregable',
  tasks: 'Entregables',
  season: 'Temporada',
  seasons: 'Temporadas',
  routine: 'Bloque Fijo',
  routines: 'Bloques Fijos',
  member: 'Responsable',
  members: 'Responsables',
  radar: 'Radar de Atrasos',

  // Bloques y disponibilidad
  usableSlot: 'Franja libre utilizable',
  transitionMargin: 'Pausa breve / traslado',
  focusSession: 'Sesión de Foco',
  deepWork: 'Trabajo Enfocado',

  // Métricas de Impacto
  impact: 'Impacto',
  priority: 'Prioridad',
  urgency: 'Urgencia',

  // Generadores dinámicos de texto para motor de cálculo y UI
  formatMilestoneDue(title: string, days: number): string {
    return `Hito "${title}" en ${days === 0 ? 'hoy' : `${days} días`}.`;
  },

  formatWorkBuffer(hours: number, title: string): string {
    return `Trabajo sugerido de ${hours}h para preparar "${title}".`;
  },

  formatPendingTasks(count: number): string {
    return `${count} entregable${count === 1 ? '' : 's'} pendiente${count === 1 ? '' : 's'} acumulado${count === 1 ? '' : 's'}.`;
  },

  formatWorkloadExceeds(hoursEstimated: number, hoursAvailable: number): string {
    return `El trabajo estimado (${hoursEstimated}h) supera el tiempo libre proyectado (${hoursAvailable}h).`;
  },

  areaUpToDate(): string {
    return 'Área al día sin entregas críticas inminentes.';
  },

  formatMilestonePlanReason(daysRemaining: number, impact: number, duration: number): string {
    return `Hito en ${daysRemaining} días (${impact}% de impacto). Franja ideal de ${duration}m.`;
  },

  formatTaskPlanReason(title: string, daysRemaining: number): string {
    return `Entregable "${title}" vence en ${daysRemaining} días.`;
  },
} as const;

export type Labels = typeof LABELS;
