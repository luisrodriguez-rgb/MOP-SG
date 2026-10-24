'use client';

import { useState } from 'react';
import { Sparkles, Send, X, Check, Calendar, Clock, User, Layers, Loader2 } from 'lucide-react';
import { Subject, TeamMember } from '@/types';
import { preprocessInboxText } from '@/lib/ai/preprocessor';
import { inferTaskMinutes } from '@/lib/academic-engine';
import { assignmentRepository, examRepository } from '@/lib/storage';
import { CustomSelect } from '@/components/ui/CustomSelect';

interface QuickCaptureBarProps {
  members: TeamMember[];
  subjects: Subject[];
  onTaskCreated?: () => void;
}

interface DraftProposal {
  title: string;
  type: 'assignment' | 'exam';
  subjectId: string;
  assigneeId: string;
  dueDate: string;
  dueTime: string;
  estimatedMinutes: number;
}

export function QuickCaptureBar({
  members = [],
  subjects = [],
  onTaskCreated,
}: QuickCaptureBarProps) {
  const [rawText, setRawText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [draft, setDraft] = useState<DraftProposal | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const handleCapture = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = rawText.trim();
    if (!text) return;

    setIsProcessing(true);
    setDraft(null);

    try {
      const enrolledContext = subjects.map((s) => ({
        id: s.id,
        name: s.name,
        code: s.code,
      }));

      // Intentar procesar con IA o con el preprocesador determinístico
      let extracted: any = null;
      try {
        const res = await fetch('/api/ai/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rawText: text,
            enrolledSubjects: enrolledContext,
            baseDate: new Date().toISOString(),
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.items && data.items.length > 0) {
            extracted = data.items[0];
          }
        }
      } catch {
        // Fallback al preprocesador local
      }

      if (!extracted) {
        const localItems = preprocessInboxText(text, enrolledContext, new Date());
        if (localItems.length > 0) {
          extracted = localItems[0];
        }
      }

      const inferredTitle = extracted?.title || text;
      const inferredMinutes = inferTaskMinutes(inferredTitle, extracted?.estimatedMinutes);

      // Inferencia dinámica de responsable comparando contra la tabla members (sin tildes y en minúsculas)
      const stripAccents = (str: string) =>
        str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

      const normalizedText = stripAccents(text);
      let matchedAssigneeId = '';

      for (const m of members) {
        const normalizedMemberName = stripAccents(m.name);
        const nameTokens = normalizedMemberName.split(/\s+/).filter((t) => t.length >= 3);
        const matchesName =
          normalizedText.includes(normalizedMemberName) ||
          nameTokens.some((tok) => {
            const regex = new RegExp(`\\b${tok}\\b`, 'i');
            return regex.test(normalizedText);
          });

        if (matchesName) {
          matchedAssigneeId = m.id;
          break;
        }
      }

      const fallbackSubjectId = extracted?.matchedSubjectId || subjects[0]?.id || '';
      const fallbackDate = extracted?.date || new Date().toISOString().split('T')[0];
      const fallbackTime = extracted?.startTime || '18:00';

      setDraft({
        title: inferredTitle,
        type: extracted?.type === 'exam' ? 'exam' : 'assignment',
        subjectId: fallbackSubjectId,
        assigneeId: matchedAssigneeId,
        dueDate: fallbackDate,
        dueTime: fallbackTime,
        estimatedMinutes: inferredMinutes,
      });
    } catch (err) {
      console.error('Error procesando captura rápida:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmSave = async () => {
    if (!draft) return;

    const selectedMember = members.find((m) => m.id === draft.assigneeId);
    const dateIso = `${draft.dueDate}T${draft.dueTime || '18:00'}:00`;

    if (draft.type === 'exam') {
      await examRepository.save({
        id: `exam-${Date.now()}`,
        subjectId: draft.subjectId,
        title: draft.title.trim(),
        date: dateIso,
        weight: 25,
        topics: ['Hito capturado desde Buzón'],
        assigneeId: draft.assigneeId || undefined,
        assigneeName: selectedMember?.name,
      });
    } else {
      await assignmentRepository.save({
        id: `task-${Date.now()}`,
        subjectId: draft.subjectId,
        title: draft.title.trim(),
        dueDate: dateIso,
        priority: 'high',
        estimatedMinutes: draft.estimatedMinutes,
        status: 'pending',
        assigneeId: draft.assigneeId || undefined,
        assigneeName: selectedMember?.name,
        notes: `Capturado vía Buzón: "${rawText}"`,
      });
    }

    setRawText('');
    setDraft(null);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2500);

    if (onTaskCreated) {
      onTaskCreated();
    }
    window.dispatchEvent(new CustomEvent('semester-data-updated'));
  };

  return (
    <div className="w-full md:relative fixed bottom-0 left-0 right-0 z-40 bg-[var(--surface)] md:bg-transparent backdrop-blur-md md:backdrop-blur-none border-t md:border-t-0 border-[var(--border)] p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:p-0 shadow-lg md:shadow-none transition-all">
      {/* Toast confirmación */}
      {justSaved && (
        <div className="mb-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-150">
          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>¡Entregable guardado y programado con éxito!</span>
        </div>
      )}

      {/* Tarjeta de Confirmación Antes de Guardar (Sin sorpresas) */}
      {draft && (
        <div className="mb-3 max-h-[75vh] overflow-y-auto p-4 sm:p-5 rounded-2xl bg-[var(--surface-raised)] border border-[var(--border)] shadow-xl animate-in fade-in duration-150 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--ink)]" />
              <span className="text-xs font-mono font-bold tracking-wider uppercase text-[var(--ink)]">
                Confirmar antes de registrar
              </span>
            </div>
            <button
              onClick={() => setDraft(null)}
              className="text-[var(--muted)] hover:text-[var(--ink)] p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Título editable */}
          <div>
            <label className="block text-[11px] font-bold text-[var(--muted)] uppercase font-mono mb-1">
              Entregable / Acción
            </label>
            <input
              type="text"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2 text-xs font-bold text-[var(--ink)] outline-none focus:border-[#0A0A0A] dark:focus:border-[#F4F4F5] transition-all"
            />
          </div>

          {/* Grid de Selectores: Área, Responsable, Fecha, Estimado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Área */}
            <div>
              <label className="block text-[11px] font-bold text-[var(--muted)] uppercase font-mono mb-1 flex items-center gap-1">
                <Layers className="w-3 h-3" />
                <span>Área</span>
              </label>
              <CustomSelect
                className="w-full"
                value={draft.subjectId}
                onChange={(val) => setDraft({ ...draft, subjectId: val })}
                options={subjects.map((sub) => ({
                  value: sub.id,
                  label: sub.name,
                  color: sub.color,
                }))}
              />
            </div>

            {/* Responsable (de la tabla members) */}
            <div>
              <label className="block text-[11px] font-bold text-[var(--muted)] uppercase font-mono mb-1 flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>Responsable</span>
              </label>
              <CustomSelect
                className="w-full"
                value={draft.assigneeId}
                onChange={(val) => setDraft({ ...draft, assigneeId: val })}
                options={[
                  { value: '', label: 'Sin asignar (Equipo)' },
                  ...members.map((m) => ({
                    value: m.id,
                    label: m.name,
                    sublabel: m.role,
                    color: m.color,
                  })),
                ]}
              />
            </div>

            {/* Fecha Límite */}
            <div>
              <label className="block text-[11px] font-bold text-[var(--muted)] uppercase font-mono mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>Fecha Límite</span>
              </label>
              <input
                type="date"
                value={draft.dueDate}
                onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-xs text-[var(--ink)] outline-none"
              />
            </div>

            {/* Tiempo Estimado */}
            <div>
              <label className="block text-[11px] font-bold text-[var(--muted)] uppercase font-mono mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Tiempo Estimado</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={10}
                  step={5}
                  value={draft.estimatedMinutes}
                  onChange={(e) => setDraft({ ...draft, estimatedMinutes: Number(e.target.value) })}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-xs text-[var(--ink)] font-mono outline-none"
                />
                <span className="absolute right-3 top-1.5 text-[11px] font-mono text-[var(--muted)]">min</span>
              </div>
            </div>
          </div>

          {/* Botones de acción del borrador */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--border)]/50 transition-colors cursor-pointer"
            >
              Descartar
            </button>
            <button
              type="button"
              onClick={handleConfirmSave}
              className="px-4 py-2 rounded-xl bg-[#0A0A0A] hover:bg-[#1A1A1A] text-white dark:bg-[#F4F4F5] dark:text-[#0A0A0A] text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Confirmar y Guardar</span>
            </button>
          </div>
        </div>
      )}

      {/* Barra de Entrada / Captura Rápida */}
      <form
        onSubmit={handleCapture}
        className="relative flex items-center bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xs transition-all focus-within:border-[#0A0A0A] dark:focus-within:border-[#F4F4F5] focus-within:ring-2 focus-within:ring-[#0A0A0A]/5 p-1.5"
      >
        <div className="pl-3 pr-2 text-[var(--muted)] shrink-0">
          <Sparkles className="w-4 h-4 text-[var(--ink)]" />
        </div>

        <input
          type="text"
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="¿Qué salió hoy? Pega lo del WhatsApp o escribe un entregable..."
          className="w-full bg-transparent border-none text-xs sm:text-sm text-[var(--ink)] placeholder:text-[var(--muted)] outline-none py-2 px-1 font-sans"
        />

        <button
          type="submit"
          disabled={!rawText.trim() || isProcessing}
          className="px-3.5 py-2 rounded-xl bg-[#0A0A0A] hover:bg-[#1A1A1A] text-white dark:bg-[#F4F4F5] dark:text-[#0A0A0A] dark:hover:bg-[#E4E4E7] text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0 flex items-center gap-1.5 cursor-pointer"
        >
          {isProcessing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Capturar</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
