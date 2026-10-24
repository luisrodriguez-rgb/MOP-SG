'use client';

import { useSemesterData } from '@/hooks/useSemesterData';
import { assignmentRepository } from '@/lib/storage';

import { QuickCaptureBar } from '@/components/inbox/QuickCaptureBar';
import { DecisionHeroCard } from '@/components/dashboard/DecisionHeroCard';
import { WeeklyScheduleWidget } from '@/components/dashboard/WeeklyScheduleWidget';
import { RiskRadarWidget } from '@/components/dashboard/RiskRadarWidget';
import { UpcomingEventsWidget } from '@/components/dashboard/UpcomingEventsWidget';
import { RecentTasksWidget } from '@/components/dashboard/RecentTasksWidget';
import { DashboardFooterQuote } from '@/components/dashboard/DashboardFooterQuote';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';

export default function DashboardPage() {
  const {
    subjects,
    subjectsMap,
    scheduleBlocks,
    assignments,
    exams,
    routines,
    attendance,
    members,
    refreshData,
    isLoading,
    needsOnboarding,
    completeOnboarding,
    loadDemoSemester,
  } = useSemesterData();

  const handleToggleTask = async (id: string) => {
    await assignmentRepository.toggleStatus(id);
    await refreshData();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[var(--ink)] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-[var(--muted)]">Cargando operación...</span>
        </div>
      </div>
    );
  }

  if (needsOnboarding) {
    return <OnboardingFlow onComplete={completeOnboarding} onSelectDemo={loadDemoSemester} />;
  }

  return (
    <div className="space-y-5 pb-28 md:pb-5 animate-in fade-in duration-200">
      {/* ═════════════════════════════════════════════════════════════
          BUZÓN EJECUTIVO DE CAPTURA RÁPIDA (CONVERSACIONAL)
         ═════════════════════════════════════════════════════════════ */}
      <QuickCaptureBar
        members={members}
        subjects={subjects}
        onTaskCreated={refreshData}
      />

      {/* ═════════════════════════════════════════════════════════════
          CENTRO DE DECISIÓN OPERATIVA: ¿QUÉ HAGO AHORA?
          (UNA SOLA RESPUESTA · ÚNICO BOTÓN ROJO "EMPEZAR")
         ═════════════════════════════════════════════════════════════ */}
      <DecisionHeroCard
        classes={scheduleBlocks}
        subjectsMap={subjectsMap}
        routines={routines}
        assignments={assignments}
        exams={exams}
      />

      {/* ═════════════════════════════════════════════════════════════
          PANELES OPERATIVOS: HORARIO · RADAR · EVENTOS & TAREAS
         ═════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch">
        {/* Columna 1: Horario semanal interactivo con bloques y huecos libres */}
        <div className="lg:col-span-6">
          <WeeklyScheduleWidget
            classes={scheduleBlocks}
            subjectsMap={subjectsMap}
            routines={routines}
          />
        </div>

        {/* Columna 2: Radar de Atrasos con barras indicadoras de semáforo */}
        <div className="lg:col-span-3">
          <RiskRadarWidget
            subjects={subjects}
            assignments={assignments}
            exams={exams}
            attendance={attendance}
            members={members}
          />
        </div>

        {/* Columna 3: Próximos eventos (hitos/entregas) y Tareas recientes */}
        <div className="lg:col-span-3 space-y-4">
          <UpcomingEventsWidget exams={exams} />
          <RecentTasksWidget
            assignments={assignments}
            onToggleTask={handleToggleTask}
          />
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════
          PIE DE PÁGINA: FRASE EJECUTIVA SG
         ═════════════════════════════════════════════════════════════ */}
      <DashboardFooterQuote />
    </div>
  );
}
