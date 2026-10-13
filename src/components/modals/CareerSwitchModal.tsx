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
        className="w-full max-w-2xl bg-[#0c102a] border border-[#232a58] rounded-3xl p-6 sm:p-7 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] text-white space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div className="flex items-start justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-xs">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>Plantillas Oficiales de Carreras</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  10 Carreras Icesi
                </span>
              </h3>
              <p className="text-xs text-[#8b95c2] mt-0.5">
                Cambia instantáneamente de carrera para ver materias, profesores y horarios oficiales.
              </p>
            </div>
          </div>

          <button
            onClick={closeCareerSwitchModal}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Botón Destacado: Reiniciar Onboarding Completo */}
        <div className="shrink-0 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-emerald-500/10 border border-amber-500/20 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>¿Quieres probar el Onboarding desde cero?</span>
            </div>
            <p className="text-[11px] text-[#94a3b8] mt-0.5">
              Reinicia el asistente para probar el Magic Drop (Ctrl+V) y la tarjeta de revelación.
            </p>
          </div>
          <button
            onClick={handleResetToOnboarding}
            className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-xs font-bold transition-all cursor-pointer shrink-0"
          >
            Reiniciar Onboarding
          </button>
        </div>

        {/* Selector de Carreras (Grid) */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#7a85b8]">
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
                      ? 'bg-[#181d48] border-[#5b5be8] shadow-md shadow-indigo-900/30 ring-1 ring-[#5b5be8]'
                      : 'bg-[#080b20] border-[#1e2552] hover:border-[#38418f] hover:bg-[#0c102c]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-black text-white truncate">
                        {tmpl.name}
                      </div>
                      <div className="text-[10px] text-[#7a85b8] font-mono truncate mt-0.5">
                        {tmpl.faculty}
                      </div>
                    </div>
                    {isCurrentActive && (
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                        Activa
                      </span>
                    )}
                  </div>

                  <div className="mt-2.5 flex items-center gap-2 text-[10px] text-[#94a3b8]">
                    <span className="px-2 py-0.5 rounded-md bg-white/5 font-mono">
                      {tmpl.subjects.length} materias
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white/5 font-mono">
                      {tmpl.scheduleBlocks.length} bloques
                    </span>
                    <span className="text-indigo-400 font-semibold">{tmpl.badge}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detalle y Botón de Aplicación de la Carrera Seleccionada */}
        <div className="shrink-0 pt-3 border-t border-[#1e2552] space-y-3">
          <div className="p-3 rounded-2xl bg-[#080b20] border border-[#1e2552] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white">{currentTemplate.name}</span>
              <span className="text-[11px] font-mono text-indigo-400 font-bold">
                {currentTemplate.subjects.length} materias oficiales
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
              {currentTemplate.subjects.map((s) => (
                <span
                  key={s.id}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/80"
                >
                  {s.name} ({s.credits} cr)
                </span>
              ))}
            </div>
          </div>

          <button
            disabled={isApplying}
            onClick={() => handleApplyTemplate(currentTemplate)}
            className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-[#2828a8] via-[#3b3abf] to-[#5b5be8] hover:from-[#3232c4] hover:to-[#6f6ff5] disabled:opacity-40 font-bold text-xs text-white flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
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
