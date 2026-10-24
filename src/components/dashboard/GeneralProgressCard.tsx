'use client';

import { Layers3, ClipboardList, Calendar, UserCheck } from 'lucide-react';
import { Subject, Assignment, Exam } from '@/types';

interface GeneralProgressCardProps {
  progressPercentage?: number;
  currentWeek?: number;
  totalWeeks?: number;
  subjects: Subject[];
  assignments: Assignment[];
  exams: Exam[];
}

export function GeneralProgressCard({
  progressPercentage = 0,
  currentWeek = 1,
  totalWeeks = 16,
  subjects = [],
  assignments = [],
  exams = [],
}: GeneralProgressCardProps) {
  const pendingAssignmentsCount = assignments.filter((a) => a.status !== 'completed').length;
  const upcomingExamsCount = exams.length;
  const totalSubjectsCount = subjects.length;

  // Donut SVG circumference math
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  return (
    <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-6 shadow-xs transition-colors">
      <h3 className="text-sm font-bold text-[var(--ink)] tracking-tight">
        Tu progreso general
      </h3>

      {/* Donut Chart y Semanas */}
      <div className="flex items-center gap-4 mt-4">
        {/* Gráfico circular donut */}
        <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {/* Círculo de fondo */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              className="text-[var(--border)]"
              strokeWidth="10"
              stroke="currentColor"
              fill="transparent"
            />
            {/* Círculo de progreso */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              className="text-[#BB271A] dark:text-[#DC382D] transition-all duration-700 ease-out"
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-sm font-black font-mono text-[var(--ink)]">
            {progressPercentage}%
          </div>
        </div>

        {/* Resumen semana */}
        <div>
          <div className="text-sm font-black text-[var(--ink)]">
            Avance de temporada ({Math.round(progressPercentage)}%)
          </div>
          <div className="text-xs text-[var(--muted)] mt-0.5 font-medium">
            {currentWeek} de {totalWeeks} semanas transcurridas
          </div>
        </div>
      </div>

      {/* Lista de métricas */}
      <div className="mt-5 pt-4 border-t border-[var(--border)] space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5 text-[var(--muted)] font-medium">
            <Layers3 className="w-4 h-4 text-[var(--ink)]" />
            <span>Áreas operativas</span>
          </div>
          <span className="font-mono font-bold text-[var(--ink)]">
            {totalSubjectsCount} / {totalSubjectsCount}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5 text-[var(--muted)] font-medium">
            <ClipboardList className="w-4 h-4 text-[var(--ink)]" />
            <span>Tareas pendientes</span>
          </div>
          <span className="font-mono font-bold text-[var(--ink)]">
            {pendingAssignmentsCount}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5 text-[var(--muted)] font-medium">
            <Calendar className="w-4 h-4 text-[var(--ink)]" />
            <span>Hitos próximos</span>
          </div>
          <span className="font-mono font-bold text-[var(--ink)]">
            {upcomingExamsCount}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5 text-[var(--muted)] font-medium">
            <UserCheck className="w-4 h-4 text-[var(--ink)]" />
            <span>Asistencia promedio</span>
          </div>
          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
            96.8%
          </span>
        </div>
      </div>
    </div>
  );
}
