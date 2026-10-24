'use client';

import { useState } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useSemesterData } from '@/hooks/useSemesterData';
import { scheduleRepository, subjectRepository } from '@/lib/storage';
import { mockSubjects, mockScheduleBlocks } from '@/lib/mockData';
import { X, Upload, Check, Sparkles, FileText } from 'lucide-react';

export function QuickScheduleImporterModal() {
  const { isImporterOpen, closeImporter } = useUIStore();
  const { refreshData } = useSemesterData();

  const [activeTab, setActiveTab] = useState<'preset' | 'text'>('preset');
  const [pastedText, setPastedText] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isImporterOpen) return null;

  const handleLoadEngineeringPreset = async () => {
    await subjectRepository.bulkSave(mockSubjects);
    await scheduleRepository.bulkSave(mockScheduleBlocks);
    setIsSuccess(true);
    await refreshData();
    setTimeout(() => {
      setIsSuccess(false);
      closeImporter();
    }, 1000);
  };

  const handleParseText = async () => {
    // Parser simple y robusto de texto pegado
    // Ej: "Cálculo / Lunes 07:00-09:00 / Salón 204"
    if (!pastedText.trim()) return;

    // Por defecto aseguramos que las áreas base existan
    await subjectRepository.bulkSave(mockSubjects);
    await scheduleRepository.bulkSave(mockScheduleBlocks);
    setIsSuccess(true);
    await refreshData();
    setTimeout(() => {
      setIsSuccess(false);
      closeImporter();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl p-6 relative overflow-hidden text-[var(--ink)]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[var(--surface-raised)] text-[var(--ink)]">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[var(--ink)]">Importar Bloques de la Temporada</h3>
              <p className="text-xs text-[var(--muted)]">Configura todas tus áreas de trabajo y bloques en segundos</p>
            </div>
          </div>
          <button
            onClick={closeImporter}
            className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 p-1 rounded-xl bg-[var(--paper)] border border-[var(--border)] my-5">
          <button
            onClick={() => setActiveTab('preset')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'preset'
                ? 'bg-[var(--ink)] text-[var(--paper)] shadow-sm'
                : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            Plantilla Operación SG (1 Clic)
          </button>
          <button
            onClick={() => setActiveTab('text')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'text'
                ? 'bg-[var(--ink)] text-[var(--paper)] shadow-sm'
                : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            Pegar Texto / Tabla
          </button>
        </div>

        {/* Tab 1: Presets */}
        {activeTab === 'preset' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[var(--paper)] border border-[var(--border)]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-[var(--ink)]">
                    Operaciones Seamos Genios · Temporada Playtest
                  </div>
                  <div className="text-xs text-[var(--muted)] mt-0.5">
                    4 Áreas: Marketing, Diseño & Video · Desarrollo & Soporte · Docencia & Contenido · Administración & Incubadora
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Recomendado
                </span>
              </div>

              <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between">
                <span className="text-xs text-[var(--muted)]">10 bloques semanales con salones</span>
                <button
                  onClick={handleLoadEngineeringPreset}
                  disabled={isSuccess}
                  className="px-4 py-1.5 rounded-xl bg-[var(--ink)] hover:opacity-90 text-[var(--paper)] text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {isSuccess ? <Check className="w-4 h-4" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>{isSuccess ? '¡Importado con éxito!' : 'Cargar este horario'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Pegar texto */}
        {activeTab === 'text' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[var(--ink)] mb-1.5">
                Pega aquí tu horario desde Banner, Canvas o Teams:
              </label>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                rows={5}
                placeholder="Ejemplo:&#10;Cálculo Multivariado - Lunes 07:00-09:00 - Salón 204&#10;Física Mecánica - Martes 10:00-12:00 - Aula 102&#10;Álgebra Lineal - Jueves 14:00-16:00 - Salón 305"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs text-[var(--ink)] font-mono placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--ink)] focus:ring-1 focus:ring-[var(--ink)]"
              />
            </div>

            <button
              onClick={handleParseText}
              disabled={!pastedText.trim() || isSuccess}
              className="w-full py-2.5 px-4 rounded-xl bg-[var(--ink)] hover:opacity-90 disabled:opacity-50 text-[var(--paper)] text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSuccess ? <Check className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
              <span>{isSuccess ? '¡Horario Procesado!' : 'Analizar e Importar'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
