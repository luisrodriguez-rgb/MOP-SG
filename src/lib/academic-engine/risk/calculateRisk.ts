import { Subject, Exam, Assignment, AttendanceRecord, RiskEvaluation, RiskLevel } from '@/types';
import { LABELS } from '@/lib/labels';

export interface SubjectRiskInputs {
  subject: Subject;
  exams: Exam[];
  assignments: Assignment[];
  attendanceRecords?: AttendanceRecord[];
  currentDate?: Date; // Por defecto hoy
  availableStudyMinutesThisWeek?: number;
  filterMemberId?: string; // Id del miembro para calibrar el déficit de tiempo libre personal
}

export function inferTaskMinutes(title: string, currentEstimate?: number): number {
  if (currentEstimate && currentEstimate > 0) return currentEstimate;
  const t = title.toLowerCase();
  if (t.includes('video') || t.includes('grab') || t.includes('edit') || t.includes('guion')) {
    return 180; // 3h para video/edición
  }
  if (t.includes('simulacro') || t.includes('pdf') || t.includes('icfes') || t.includes('prueba')) {
    return 240; // 4h para simulacros
  }
  if (t.includes('reunion') || t.includes('mentoria') || t.includes('pitch') || t.includes('admin') || t.includes('b2b')) {
    return 45; // 45m para reuniones
  }
  return 45;
}

export function calculateSubjectRisk({
  subject,
  exams,
  assignments,
  attendanceRecords = [],
  currentDate = new Date(),
  availableStudyMinutesThisWeek = 300, // 5 horas por defecto si no se especifica
  filterMemberId,
}: SubjectRiskInputs): RiskEvaluation {
  const reasons: string[] = [];

  // 1. DEADLINE PRESSURE (Presión de Hitos Próximos)
  const nowMs = currentDate.getTime();
  const upcomingExams = exams
    .filter((e) => e.subjectId === subject.id)
    .map((e) => {
      const examTime = new Date(e.date).getTime();
      const diffDays = Math.ceil((examTime - nowMs) / (1000 * 60 * 60 * 24));
      return { exam: e, diffDays };
    })
    .filter((e) => e.diffDays >= 0)
    .sort((a, b) => a.diffDays - b.diffDays);

  const nearestExam = upcomingExams[0];
  let deadlinePressure = 0;

  if (nearestExam) {
    if (nearestExam.diffDays <= 3) {
      deadlinePressure = 45;
      reasons.push(LABELS.formatMilestoneDue(nearestExam.exam.title, nearestExam.diffDays));
    } else if (nearestExam.diffDays <= 7) {
      deadlinePressure = 25;
      reasons.push(LABELS.formatMilestoneDue(nearestExam.exam.title, nearestExam.diffDays));
    } else if (nearestExam.diffDays <= 14) {
      deadlinePressure = 10;
      reasons.push(`Hito próximo en ${nearestExam.diffDays} días.`);
    }
  }

  // 2. WORKLOAD PRESSURE: Radar de Atrasos
  const pendingTasks = assignments.filter(
    (a) => a.subjectId === subject.id && a.status !== 'completed'
  );

  const isTeamView = filterMemberId === 'all';

  // Filtrar tareas que consumen el tiempo libre del miembro evaluado si es vista individual
  const myTasks = !isTeamView && filterMemberId
    ? pendingTasks.filter((t) => !t.assigneeId || t.assigneeId === filterMemberId)
    : pendingTasks;

  const tasksEstimatedMinutes = myTasks.reduce(
    (acc, t) => acc + inferTaskMinutes(t.title, t.estimatedMinutes),
    0
  );

  // Si hay un hito cercano (<= 7 días) y 0 tareas registradas, proyectar buffer de preparación
  let examStudyBufferMinutes = 0;
  if (nearestExam && nearestExam.diffDays <= 7 && tasksEstimatedMinutes === 0) {
    examStudyBufferMinutes = 240; // 4 horas
    reasons.push(LABELS.formatWorkBuffer(Math.round(examStudyBufferMinutes / 60), nearestExam.exam.title));
  }

  const totalEstimatedMinutes = tasksEstimatedMinutes + examStudyBufferMinutes;
  const availableMinutes = Math.max(60, availableStudyMinutesThisWeek);
  const loadRatio = totalEstimatedMinutes / availableMinutes;

  let workloadPressure = 0;

  if (pendingTasks.length > 0) {
    reasons.push(LABELS.formatPendingTasks(pendingTasks.length));
  }

  if (isTeamView) {
    // VISTA EQUIPO: Medir exclusivamente por cercanía de fecha y urgencia de entregables
    // No comparar contra los huecos libres de una sola persona
    const urgentTasks = pendingTasks.filter((t) => {
      if (!t.dueDate) return false;
      const due = new Date(t.dueDate);
      const diffMs = due.getTime() - currentDate.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return diffDays <= 3 && diffDays >= 0;
    });

    if (urgentTasks.length > 0) {
      workloadPressure = Math.min(30, 15 + urgentTasks.length * 5);
      reasons.push(`${urgentTasks.length} entregable${urgentTasks.length > 1 ? 's' : ''} con fecha límite inminente (≤ 3 días).`);
    } else if (pendingTasks.length >= 6) {
      workloadPressure = 20;
      reasons.push(`Volumen activo alto: ${pendingTasks.length} entregables en curso.`);
    } else if (pendingTasks.length >= 3) {
      workloadPressure = 15;
    } else if (pendingTasks.length >= 1) {
      workloadPressure = 10;
    }
  } else {
    // VISTA INDIVIDUAL / PERSONAL: Comparación de carga vs disponibilidad real
    const otherMemberTasks = pendingTasks.filter(
      (t) => filterMemberId && t.assigneeId && t.assigneeId !== filterMemberId
    );
    if (otherMemberTasks.length > 0) {
      reasons.push(`${otherMemberTasks.length} entregable${otherMemberTasks.length > 1 ? 's' : ''} asignado${otherMemberTasks.length > 1 ? 's' : ''} a otros socios del equipo.`);
    }

    if (loadRatio >= 1.5 && totalEstimatedMinutes > 0) {
      // Déficit severo: el trabajo supera en más de 50% las horas libres disponibles
      workloadPressure = 50;
      reasons.push(LABELS.formatWorkloadExceeds(
        Math.round(totalEstimatedMinutes / 60),
        Math.round(availableMinutes / 60)
      ));
    } else if (loadRatio >= 1.0 && totalEstimatedMinutes > 0) {
      // Déficit moderado: el trabajo supera el tiempo libre disponible
      workloadPressure = 35;
      reasons.push(LABELS.formatWorkloadExceeds(
        Math.round(totalEstimatedMinutes / 60),
        Math.round(availableMinutes / 60)
      ));
    } else if (loadRatio >= 0.7 && totalEstimatedMinutes > 0) {
      // Carga alta pero manejable
      workloadPressure = 20;
      reasons.push(`Carga alta (${Math.round(totalEstimatedMinutes / 60)}h estimadas), consume el ${Math.round(loadRatio * 100)}% de tu disponibilidad.`);
    } else if (totalEstimatedMinutes > 0) {
      workloadPressure = 10;
    }
  }

  // 3. ATTENDANCE PRESSURE: Obsoleto para operación empresarial (0 puntos)
  const attendancePressure = 0;

  // Score compuesto (0 a 100)
  const riskScore = Math.min(100, deadlinePressure + workloadPressure);

  // Clasificación: CRÍTICO | ATENCIÓN | ESTABLE
  let level: RiskLevel = 'ESTABLE';
  if (
    riskScore >= 50 ||
    (nearestExam && nearestExam.diffDays <= 3) ||
    (loadRatio >= 1.5 && nearestExam && nearestExam.diffDays <= 7)
  ) {
    level = 'CRÍTICO';
  } else if (
    riskScore >= 25 ||
    (nearestExam && nearestExam.diffDays <= 7) ||
    loadRatio >= 1.0
  ) {
    level = 'ATENCIÓN';
  }

  if (reasons.length === 0) {
    reasons.push(LABELS.areaUpToDate());
  }

  return {
    subjectId: subject.id,
    subjectName: subject.name,
    subjectColor: subject.color,
    level,
    riskScore,
    deadlinePressure,
    workloadPressure,
    attendancePressure,
    signals: {
      daysUntilExam: nearestExam ? nearestExam.diffDays : null,
      pendingTasksCount: pendingTasks.length,
      estimatedStudyMinutes: totalEstimatedMinutes,
      availableMinutesThisWeek: availableStudyMinutesThisWeek,
      attendanceRate: 100,
      absencesCount: 0,
      remainingAllowedAbsences: 0,
      currentGrade: subject.currentGrade,
    },
    reasons,
  };
}
