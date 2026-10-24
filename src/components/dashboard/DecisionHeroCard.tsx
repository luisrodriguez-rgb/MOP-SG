'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Clock,
  Play,
  Pause,
  Compass,
  Flame,
  CheckCircle,
} from 'lucide-react';
import { Subject, ScheduleBlock, Assignment, Exam, FixedRoutine, DayOfWeek } from '@/types';
import { getCurrentBlock } from '@/lib/academic-engine/schedule/getCurrentBlock';
import { formatMinutesHuman } from '@/lib/academic-engine/utils/timeHelpers';
import { calculateSubjectRisk } from '@/lib/academic-engine';
import { useUIStore } from '@/stores/uiStore';

interface DecisionHeroCardProps {
  classes: ScheduleBlock[];
  subjectsMap: Record<string, Subject>;
  routines: FixedRoutine[];
  assignments: Assignment[];
  exams: Exam[];
}

export function DecisionHeroCard({
  classes,
  subjectsMap,
  routines,
  assignments,
  exams,
}: DecisionHeroCardProps) {
  const { startFocusSession, stopFocusSession, focusSession } = useUIStore();

  const [nowTimestamp] = useState<number>(() => Date.now());

  // Día de hoy
  const todayDayOfWeek = useMemo<DayOfWeek>(() => {
    const d = new Date().getDay();
    return d === 0 ? 7 : (d as DayOfWeek);
  }, []);

  const effectiveTime = useMemo(() => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  }, []);

  const dayFormatted = useMemo(() => {
    const now = new Date();
    const dayNames = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
    return dayNames[now.getDay()];
  }, []);

  const formattedTimeDisplay = useMemo(() => {
    const [hStr, mStr] = effectiveTime.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    const period = h >= 12 ? 'p.m.' : 'a.m.';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${dayFormatted} · ${h12}:${m.toString().padStart(2, '0')} ${period}`;
  }, [dayFormatted, effectiveTime]);

  // Ejecución del motor de horario en tiempo real
  const currentBlockResult = useMemo(() => {
    return getCurrentBlock({
      dayOfWeek: todayDayOfWeek,
      currentTime: effectiveTime,
      classes,
      subjectsMap,
      routines,
      dayStart: '07:00',
      dayEnd: '21:30',
    });
  }, [todayDayOfWeek, effectiveTime, classes, subjectsMap, routines]);

  // Selección inteligente de la siguiente mejor acción (y segunda en cola)
  const { recommendedTask, nextCandidate } = useMemo(() => {
    const pending = assignments.filter((a) => a.status !== 'completed');
    if (pending.length === 0) return { recommendedTask: null, nextCandidate: null };

    const sorted = [...pending].sort((a, b) => {
      const examA = exams.find((e) => e.subjectId === a.subjectId);
      const examB = exams.find((e) => e.subjectId === b.subjectId);
      const timeA = examA ? new Date(examA.date).getTime() : Infinity;
      const timeB = examB ? new Date(examB.date).getTime() : Infinity;

      if (timeA !== timeB) return timeA - timeB;
      if (a.priority === 'high' && b.priority !== 'high') return -1;
      if (b.priority === 'high' && a.priority !== 'high') return 1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    const top = sorted[0];
    const second = sorted[1] || null;
    const subject = subjectsMap[top.subjectId];

    return {
      recommendedTask: {
        task: top,
        subject,
      },
      nextCandidate: second,
    };
  }, [assignments, exams, subjectsMap]);

  // Conteo de áreas críticas para el resumen del radar
  const criticalAreasCount = useMemo(() => {
    const subjects = Object.values(subjectsMap);
    return subjects.filter((sub) => {
      const risk = calculateSubjectRisk({
        subject: sub,
        exams,
        assignments,
        filterMemberId: 'all',
      });
      return risk.level === 'CRÍTICO';
    }).length;
  }, [subjectsMap, exams, assignments]);

  // Detección dinámica del hito Playtest desde la lista de hitos (exams)
  const playtestMilestone = useMemo(() => {
    return exams.find((e) => e.title.toLowerCase().includes('playtest'));
  }, [exams]);

  const playtestCountdown = useMemo(() => {
    if (!playtestMilestone || !playtestMilestone.date) return null;
    const targetDate = new Date(playtestMilestone.date);
    if (isNaN(targetDate.getTime())) return null;
    const diffMs = targetDate.getTime() - nowTimestamp;
    const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    return {
      days,
      title: playtestMilestone.title,
      formattedDate: targetDate.toLocaleDateString('es-CO', { month: 'short', year: 'numeric' }),
    };
  }, [playtestMilestone, nowTimestamp]);

  const handleStartFocus = () => {
    if (recommendedTask) {
      startFocusSession(
        recommendedTask.task.title,
        recommendedTask.subject?.name || 'Operación SG',
        recommendedTask.task.estimatedMinutes || 45,
        recommendedTask.task.id
      );
    } else {
      startFocusSession('Bloque de Operación Libre', 'Seamos Genios', 45);
    }
  };

  const freeMinutesGross = currentBlockResult.currentFreeSlot?.remainingMinutes || 120;
  const usableMinutes = Math.max(30, freeMinutesGross - 15);

  return (
    <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-6 sm:p-8 shadow-xs transition-colors">
      {/* Cabecera contextual */}
      <div className="flex items-center justify-between pb-3.5 border-b border-[var(--border)] text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#10b981]" />
          <span className="font-mono text-[11px] font-bold text-[var(--muted)] uppercase">
            {formattedTimeDisplay}
          </span>
        </div>
        <div className="text-[11px] font-mono text-[var(--muted)]">
          {currentBlockResult.currentClass
            ? `En compromiso: ${currentBlockResult.currentClass.name}`
            : `${usableMinutes} min útiles disponibles`}
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════
          RESPUESTA ÚNICA: AHORA
         ═════════════════════════════════════════════════════════════ */}
      <div className="py-6 sm:py-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="max-w-2xl space-y-2">
          <div className="text-xs font-mono font-bold tracking-widest uppercase text-[var(--ink)]">
            {focusSession.isActive ? 'EN EJECUCIÓN' : '¿QUÉ HAGO AHORA?'}
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[var(--ink)] tracking-tight uppercase leading-tight font-sans">
            {focusSession.isActive
              ? `ENFOQUE: ${focusSession.taskTitle}`
              : recommendedTask
              ? `AHORA: ${recommendedTask.task.title}`
              : 'AHORA: TODO AL DÍA'}
          </h1>
          <p className="text-xs sm:text-sm text-[var(--ink-secondary)] leading-relaxed font-medium">
            {recommendedTask ? (
              <>
                Tienes <strong className="text-[var(--ink)] font-bold">{formatMinutesHuman(usableMinutes)}</strong> libres
                {recommendedTask.task.dueDate && (
                  <> · Entrega prevista: <span className="font-bold text-[var(--ink)]">{new Date(recommendedTask.task.dueDate).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}</span></>
                )}
                {recommendedTask.task.assigneeName && (
                  <> · Responsable: <span className="font-bold text-[var(--ink)]">{recommendedTask.task.assigneeName}</span></>
                )}
              </>
            ) : (
              'No tienes entregables urgentes pendientes en este momento. Tienes tiempo libre para avanzar estratégicamente o descansar.'
            )}
          </p>
        </div>

        {/* ÚNICO BOTÓN ROJO EN TODA LA PANTALLA: EMPEZAR */}
        <div className="shrink-0">
          {focusSession.isActive ? (
            <button
              onClick={stopFocusSession}
              className="px-7 py-3.5 rounded-full bg-[#0A0A0A] hover:bg-[#1A1A1A] text-white dark:bg-[#F4F4F5] dark:text-[#0A0A0A] font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <Pause className="w-4 h-4" />
              <span>Finalizar Sesión</span>
            </button>
          ) : (
            <button
              onClick={handleStartFocus}
              className="px-8 py-3.5 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-black text-xs sm:text-sm tracking-wide shadow-lg shadow-[var(--accent)]/20 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Empezar</span>
            </button>
          )}
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════
          SUB-TIRA DISCRETA: SIGUIENTE · PLAYTEST · RADAR
         ═════════════════════════════════════════════════════════════ */}
      <div className={`pt-5 border-t border-[var(--border)] grid grid-cols-1 ${playtestCountdown ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-3.5 text-xs`}>
        {/* 1. Siguiente en cola */}
        <div className="p-3.5 rounded-2xl bg-[var(--bg)] border border-[var(--border)] space-y-1">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted)] font-bold flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-[var(--muted)]" />
            <span>Siguiente en Cola</span>
          </div>
          <div className="font-bold text-[var(--ink)] truncate">
            {nextCandidate ? nextCandidate.title : 'Sin pendientes inmediatos'}
          </div>
          <div className="text-[11px] text-[var(--muted)] truncate font-mono">
            {nextCandidate?.assigneeName ? `Asignado a ${nextCandidate.assigneeName}` : 'Todo el equipo'}
          </div>
        </div>

        {/* 2. Cuenta regresiva al Playtest (solo si existe el hito) */}
        {playtestCountdown && (
          <div className="p-3.5 rounded-2xl bg-[var(--bg)] border border-[var(--border)] space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted)] font-bold flex items-center gap-1.5">
              <Flame className="w-3 h-3 text-[var(--ink)]" />
              <span>Lanzamiento Playtest</span>
            </div>
            <div className="font-bold text-[var(--ink)]">
              Faltan <span className="text-[var(--ink)] font-black">{playtestCountdown.days} días</span> ({playtestCountdown.formattedDate})
            </div>
            <div className="text-[11px] text-[var(--muted)] truncate">
              {playtestCountdown.title}
            </div>
          </div>
        )}

        {/* 3. Radar resumido */}
        <div className="p-3.5 rounded-2xl bg-[var(--bg)] border border-[var(--border)] space-y-1">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted)] font-bold flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Compass className="w-3 h-3 text-[var(--muted)]" />
              <span>Radar de Atrasos</span>
            </span>
            <Link href="/radar" className="text-[var(--muted)] hover:text-[var(--ink)] hover:underline font-bold text-[10px]">
              Ver detalle →
            </Link>
          </div>
          <div className="font-bold text-[var(--ink)] truncate">
            {criticalAreasCount > 0 ? (
              <span className="text-[var(--warn)] font-black">{criticalAreasCount} área(s) en atención</span>
            ) : (
              <span className="text-[var(--ok)] font-bold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Todas las áreas al día</span>
              </span>
            )}
          </div>
          <div className="text-[11px] text-[var(--muted)] truncate">
            Métricas ejecutables sin bloqueos
          </div>
        </div>
      </div>
    </div>
  );
}
