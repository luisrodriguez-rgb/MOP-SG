'use client';

import Link from 'next/link';
import { Calendar, ArrowRight, Plus } from 'lucide-react';
import { Exam } from '@/types';
import { useSemesterData } from '@/hooks/useSemesterData';
import { useUIStore } from '@/stores/uiStore';

interface UpcomingEventsWidgetProps {
  exams?: Exam[];
}

export function UpcomingEventsWidget({ exams: propExams }: UpcomingEventsWidgetProps) {
  const { openAddExam } = useUIStore();
  const { exams: hookExams, subjectsMap } = useSemesterData();

  const examsList = propExams && propExams.length > 0 ? propExams : hookExams;

  // Ordenar los exámenes por fecha más cercana
  const sortedExams = [...examsList]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 4);

  return (
    <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-5 shadow-xs transition-colors">
      {/* Cabecera */}
      <div className="flex items-center justify-between pb-3.5 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[var(--ink)]" />
          <h3 className="text-sm font-bold text-[var(--ink)] tracking-tight">
            Próximos hitos
          </h3>
          <span className="text-[10px] font-mono font-bold text-[var(--muted)] ml-1 bg-[var(--surface-raised)] dark:bg-[var(--surface-raised)] px-2 py-0.5 rounded-full border border-[var(--border)] dark:border-[var(--border)]">
            {examsList.length} {examsList.length === 1 ? 'hito' : 'hitos'}
          </span>
        </div>
        <Link
          href="/exams"
          className="text-xs font-semibold text-[var(--ink)] hover:underline flex items-center gap-0.5"
        >
          <span>Ver todos</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Lista de eventos */}
      <div className="mt-3.5 space-y-2.5">
        {sortedExams.length === 0 ? (
          <div className="text-center py-5">
            <p className="text-xs text-[var(--muted)]">
              No tienes hitos programados aún.
            </p>
            <button
              onClick={openAddExam}
              className="mt-2 text-xs font-bold text-[var(--ink)] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Añadir primer hito</span>
            </button>
          </div>
        ) : (
          sortedExams.map((exam) => {
            const sub = subjectsMap[exam.subjectId];
            const examDate = new Date(exam.date);
            const day = isNaN(examDate.getDate()) ? '15' : examDate.getDate().toString();
            const month = isNaN(examDate.getMonth())
              ? 'SEP'
              : examDate.toLocaleDateString('es-CO', { month: 'short' }).toUpperCase();
            const timeStr = isNaN(examDate.getTime())
              ? ''
              : examDate.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true });

            return (
              <div
                key={exam.id}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--surface-raised)] dark:hover:bg-[var(--surface-raised)] transition-colors group cursor-default"
              >
                {/* Cuadro de Fecha Tipo Calendario */}
                <div className="w-10 h-11 rounded-xl bg-[var(--surface-raised)] dark:bg-[var(--surface-raised)] border border-[var(--border)] dark:border-[var(--border)] flex flex-col items-center justify-center shrink-0">
                  <span className="text-[9px] font-mono font-bold text-[var(--muted)] dark:text-[var(--muted)] leading-none uppercase">
                    {month}
                  </span>
                  <span className="text-sm font-black text-[var(--ink)] leading-tight font-mono mt-0.5">
                    {day}
                  </span>
                </div>

                {/* Detalles */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-xs font-bold text-[var(--ink)] truncate">
                      {exam.title}
                    </span>
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full border bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20 shrink-0">
                      {exam.weight}%
                    </span>
                  </div>
                  <div className="text-[10px] text-[var(--muted)] truncate mt-0.5">
                    {sub?.name || 'Área'} {timeStr ? `· ${timeStr}` : ''} {exam.location ? `· ${exam.location}` : ''}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
