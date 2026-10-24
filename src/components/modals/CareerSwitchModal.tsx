'use client';

import { useState } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useSemesterData } from '@/hooks/useSemesterData';
import { ACADEMIC_TEMPLATES, AcademicTemplate } from '@/lib/templates/academicTemplates';
import { applyAcademicTemplate } from '@/lib/importer/templateLoader';
import confetti from 'canvas-confetti';
import {
  GraduationCap,
  Sparkles,
  Check,
  X,
  ArrowRight,
  RotateCcw,
  BookOpen,
  Calendar,
  Layers,
} from 'lucide-react';

export function CareerSwitchModal() {
  const { isCareerSwitchModalOpen, closeCareerSwitchModal } = useUIStore();
  const { profile, refreshData, resetToOnboarding } = useSemesterData();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    ACADEMIC_TEMPLATES[0].id
  );
  const [isApplying, setIsApplying] = useState(false);

  if (!isCareerSwitchModalOpen) return null;

  const currentTemplate =
    ACADEMIC_TEMPLATES.find((t) => t.id === selectedTemplateId) || ACADEMIC_TEMPLATES[0];

  const handleApplyTemplate = async (tmpl: AcademicTemplate) => {
    setIsApplying(true);
    try {
      await applyAcademicTemplate(tmpl.id);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
      await refreshData();
      closeCareerSwitchModal();
    } catch (err) {
      console.error('Error al aplicar plantilla:', err);
    } finally {
      setIsApplying(false);
    }
  };

  const handleResetToOnboarding = async () => {
    closeCareerSwitchModal();
    await resetToOnboarding();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-[var(--paper)] border border-[var(--border)] rounded-3xl p-6 sm:p-7 shadow-2xl text-[var(--ink)] space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div className="flex items-start justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--ink)] shadow-xs">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-[var(--ink)] flex items-center gap-2">
                <span>Plantillas Oficiales de Carreras</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[var(--surface-raised)] text-[var(--muted)] border border-[var(--border)]">
                  10 Carreras Icesi
                </span>
              </h3>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                Cambia instantáneamente de carrera para ver materias, profesores y horarios oficiales.
              </p>
            </div>
          </div>

          <button
            onClick={closeCareerSwitchModal}
            className="w-8 h-8 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-raised)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Botón Destacado: Reiniciar Onboarding Completo */}
        <div className="shrink-0 p-3.5 rounded-2xl bg-[var(--surface)] border border-amber-500/20 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>¿Quieres probar el Onboarding desde cero?</span>
            </div>
            <p className="text-[11px] text-[var(--muted)] mt-0.5">
              Reinicia el asistente para probar el Magic Drop (Ctrl+V) y la tarjeta de revelación.
            </p>
          </div>
          <button
            onClick={handleResetToOnboarding}
            className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-200 border border-amber-500/40 text-xs font-bold transition-all cursor-pointer shrink-0"
          >
            Reiniciar Onboarding
          </button>
        </div>

        {/* Selector de Carreras (Grid) */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--muted)]">
            Selecciona una carrera para cargar:
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {ACADEMIC_TEMPLATES.map((tmpl) => {
              const isSelected = tmpl.id === selectedTemplateId;
              const isCurrentActive = profile?.program === tmpl.profile.program;

              return (
                <div
                  key={tmpl.id}
                  onClick={() => setSelectedTemplateId(tmpl.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-left ${
                    isSelected
                      ? 'bg-[var(--surface-raised)] border-[var(--ink)] shadow-md ring-1 ring-[var(--ink)]'
                      : 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--line)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-black text-[var(--ink)] truncate">
                        {tmpl.name}
                      </div>
                      <div className="text-[10px] text-[var(--muted)] font-mono truncate mt-0.5">
                        {tmpl.faculty}
                      </div>
                    </div>
                    {isCurrentActive && (
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 shrink-0">
                        Activa
                      </span>
                    )}
                  </div>

                  <div className="mt-2.5 flex items-center gap-2 text-[10px] text-[var(--muted)]">
                    <span className="px-2 py-0.5 rounded-md bg-[var(--paper)] font-mono">
                      {tmpl.subjects.length} materias
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-[var(--paper)] font-mono">
                      {tmpl.scheduleBlocks.length} bloques
                    </span>
                    <span className="text-[var(--muted)] font-semibold">{tmpl.badge}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detalle y Botón de Aplicación de la Carrera Seleccionada */}
        <div className="shrink-0 pt-3 border-t border-[var(--border)] space-y-3">
          <div className="p-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[var(--ink)]">{currentTemplate.name}</span>
              <span className="text-[11px] font-mono text-[var(--ink)] font-bold">
                {currentTemplate.subjects.length} materias oficiales
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
              {currentTemplate.subjects.map((s) => (
                <span
                  key={s.id}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--paper)] border border-[var(--border)] text-[var(--ink)]"
                >
                  {s.name} ({s.credits} cr)
                </span>
              ))}
            </div>
          </div>

          <button
            disabled={isApplying}
            onClick={() => handleApplyTemplate(currentTemplate)}
            className="w-full py-3 px-5 rounded-2xl bg-[var(--ink)] hover:opacity-90 disabled:opacity-40 font-bold text-xs text-[var(--paper)] flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>
              {isApplying
                ? 'Aplicando semestre...'
                : `Cargar ${currentTemplate.name} en 1 Clic`}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
