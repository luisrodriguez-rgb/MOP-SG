'use client';

import { useUIStore } from '@/stores/uiStore';
import { useSemesterData } from '@/hooks/useSemesterData';
import { calculateSemesterMetrics } from '@/lib/academic-engine';
import {
  Calendar,
  Plus,
  Play,
  Pause,
  Bell,
  Sparkles,
  Timer,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { ThemeToggle } from '@/components/common/ThemeToggle';

export function TopHeader() {
  const {
    openAddTask,
    openAddExam,
    openProfile,
    openInbox,
    openCalendarModal,
    openWhoAreYou,
    focusSession,
    tickFocusSession,
    togglePauseFocus,
    stopFocusSession,
    openFocusCompletion,
  } = useUIStore();

  const { semester, profile } = useSemesterData();
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true })
      );
      // Ej: Mié, 9 de sep. 2026
      const formattedDate = now.toLocaleDateString('es-CO', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      setDateStr(formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let t: NodeJS.Timeout;
    if (focusSession.isActive && !focusSession.isPaused) {
      t = setInterval(tickFocusSession, 1000);
    }
    return () => clearInterval(t);
  }, [focusSession.isActive, focusSession.isPaused, tickFocusSession]);

  useEffect(() => {
    if (focusSession.isActive && focusSession.secondsRemaining === 0) {
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
      const elapsedMinutes = Math.round((focusSession.totalMinutes * 60 - focusSession.secondsRemaining) / 60);
      openFocusCompletion({
        taskId: focusSession.taskId,
        taskTitle: focusSession.taskTitle,
        subjectName: focusSession.subjectName,
        minutesPlanned: focusSession.totalMinutes,
        minutesElapsed: Math.max(1, elapsedMinutes),
      });
      stopFocusSession();
    }
  }, [focusSession, openFocusCompletion, stopFocusSession]);

  const metrics = semester
    ? calculateSemesterMetrics({
        startDate: semester.startDate,
        endDate: semester.endDate,
        totalWeeks: semester.totalWeeks || 16,
      })
    : { currentWeek: 6, totalWeeks: 16, progressPercentage: 37, daysRemaining: 68 };

  const studentName = profile?.name || 'Socio SG';
  const initials = studentName
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 bg-[var(--bg)]/95 backdrop-blur-md border-b border-[var(--border)] transition-colors">
      <div className="px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-4">
        {/* Lado Izquierdo: Fecha y Progreso Semestral */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Fecha y Hora en vivo */}
          <div className="flex items-center gap-2.5 text-xs text-[var(--ink)]">
            <div className="p-1 rounded-md bg-[var(--surface)] text-[var(--ink-secondary)] border border-[var(--border)]">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <div className="font-semibold">
              <span className="text-[11px] text-[var(--muted)] block leading-none">
                {dateStr || 'Mié, 9 de sep. 2026'}
              </span>
              <span className="text-xs font-black text-[var(--ink)] mt-0.5 block font-mono">
                {timeStr || '6:24 p.m.'}
              </span>
            </div>
          </div>

          <div className="hidden md:block w-px h-6 bg-[var(--border)]" />

          {/* Barra de Progreso de la Temporada */}
          <div className="hidden sm:flex items-center gap-3 text-xs">
            <div className="text-[11px] font-bold text-[var(--ink)]">
              Avance de temporada ({metrics.progressPercentage}%)
            </div>
            <div className="w-24 bg-[var(--surface)] border border-[var(--border)] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#BB271A] h-full rounded-full transition-all"
                style={{ width: `${metrics.progressPercentage}%` }}
              />
            </div>
            <span className="text-[11px] font-mono font-bold text-[var(--muted)]">
              {metrics.progressPercentage}%
            </span>
          </div>
        </div>

        {/* Lado Derecho: Enfoque, Acciones y Avatar */}
        <div className="flex items-center gap-2.5">
          {/* Mini Enfoque Pomodoro: Solo visible cuando hay sesión activa */}
          {focusSession.isActive && (
            <div className="flex items-center gap-2 bg-[var(--surface)] px-3 py-1.5 rounded-xl border border-[var(--border)] text-xs animate-in fade-in zoom-in-95 duration-200">
              <Timer className="w-3.5 h-3.5 text-[#BB271A] animate-pulse" />
              <div className="text-left">
                <div className="text-[9px] font-mono uppercase text-[var(--muted)] leading-none truncate max-w-[90px]">
                  {focusSession.taskTitle || 'Enfoque'}
                </div>
                <div className="font-mono font-black text-xs text-[var(--ink)]">
                  {`${Math.floor(focusSession.secondsRemaining / 60)}:${(focusSession.secondsRemaining % 60).toString().padStart(2, '0')}`}
                </div>
              </div>
              <button
                onClick={togglePauseFocus}
                className="w-6 h-6 rounded-full bg-[#0A0A0A] dark:bg-[#F4F4F5] text-white dark:text-[#0A0A0A] flex items-center justify-center hover:scale-105 transition-transform cursor-pointer ml-1"
                title={focusSession.isPaused ? 'Reanudar' : 'Pausar'}
              >
                {focusSession.isPaused ? (
                  <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
                ) : (
                  <Pause className="w-2.5 h-2.5" />
                )}
              </button>
            </div>
          )}

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Botón Buzón Inteligente ⌘K */}
          <button
            onClick={openInbox}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--border)] text-[var(--ink)] border border-[var(--border)] text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
            title="Buzón Inteligente (⌘K)"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#BB271A]" />
            <span className="hidden sm:inline">Buzón</span>
            <kbd className="hidden md:inline font-mono text-[9px] px-1 py-0.2 bg-[var(--bg)] rounded border border-[var(--border)]">
              ⌘K
            </kbd>
          </button>

          {/* Botón + Tarea */}
          <button
            onClick={openAddTask}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--border)] text-[var(--ink)] border border-[var(--border)] text-xs font-bold transition-all shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[var(--ink)]" />
            <span className="hidden sm:inline">Tarea</span>
          </button>

          {/* Botón + Hito */}
          <button
            onClick={openAddExam}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--border)] text-[var(--ink)] border border-[var(--border)] text-xs font-bold transition-all shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[var(--ink)]" />
            <span>Hito</span>
          </button>

          {/* Botón Calendario (Negro Tinta SG) */}
          <button
            onClick={openCalendarModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0A0A0A] hover:bg-[#1A1A1A] text-white dark:bg-[#F4F4F5] dark:text-[#0A0A0A] dark:hover:bg-[#E4E4E7] text-xs font-bold transition-all shadow-sm cursor-pointer"
            title="Sincronizar con Google Calendar, Outlook o Apple Calendar"
          >
            <Calendar className="w-3.5 h-3.5 text-[#BB271A] dark:text-[#DC382D]" />
            <span className="hidden md:inline">Calendario</span>
          </button>

          {/* Selector de Socio en este navegador */}
          <button
            type="button"
            onClick={openWhoAreYou}
            className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full bg-[var(--surface)] hover:bg-[var(--border)] border border-[var(--border)] text-xs transition-all shadow-2xs cursor-pointer group"
            title={`Socio actual: ${studentName}. Haz clic para cambiar de socio en este navegador.`}
          >
            <div className="w-6 h-6 rounded-full bg-[#18181B] text-white font-black text-[10px] flex items-center justify-center shadow-xs border border-[#27272A] shrink-0">
              {initials}
            </div>
            <span className="font-bold text-[var(--ink)] max-w-[80px] truncate text-left hidden sm:inline">
              {profile?.name || 'Socio'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
