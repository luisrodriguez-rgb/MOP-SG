'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { memberRepository, DEFAULT_MEMBERS } from '@/lib/storage/repositories/memberRepository';
import { profileRepository } from '@/lib/storage/repositories/profileRepository';
import { STORAGE_KEYS } from '@/lib/storage/storageKeys';
import { TeamMember, Profile } from '@/types';
import { Users, Check, X, Shield, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

export function MemberSelectionModal() {
  const { isWhoAreYouOpen, openWhoAreYou, closeWhoAreYou } = useUIStore();
  const [members, setMembers] = useState<TeamMember[]>(DEFAULT_MEMBERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const checkInitialIdentity = useCallback(async () => {
    try {
      await memberRepository.seedDefaultMembersIfEmpty();
      const allMembers = await memberRepository.getActive();
      if (allMembers.length > 0) {
        setMembers(allMembers);
      }

      const currentStored = typeof window !== 'undefined'
        ? localStorage.getItem('mop_sg_current_member') || localStorage.getItem(STORAGE_KEYS.ACTIVE_USER_ID)
        : null;

      setSelectedId(currentStored);

      // Si no hay socio guardado en este navegador, abrir el modal de inmediato
      if (!currentStored) {
        openWhoAreYou();
      }
    } catch (err) {
      console.error('Error cargando socios en MemberSelectionModal:', err);
    }
  }, [openWhoAreYou]);

  useEffect(() => {
    setIsMounted(true);
    checkInitialIdentity();

    const handleOpenSelector = () => {
      openWhoAreYou();
    };

    window.addEventListener('open-member-selector', handleOpenSelector);
    return () => {
      window.removeEventListener('open-member-selector', handleOpenSelector);
    };
  }, [checkInitialIdentity, openWhoAreYou]);

  if (!isMounted || !isWhoAreYouOpen) return null;

  const handleSelectMember = async (member: TeamMember) => {
    setIsSaving(true);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('mop_sg_current_member', member.id);
        localStorage.setItem(STORAGE_KEYS.ACTIVE_USER_ID, member.id);
      }

      const studentCode = `SG-${member.name.toUpperCase().slice(0, 4)}`;
      const memberProfile: Profile = {
        id: member.id,
        name: member.name,
        studentCode,
        documentId: '',
        university: 'Seamos Genios',
        program: member.role,
        semesterNumber: 1,
        cohort: '2026',
        gpa: 5.0,
        email: '',
      };

      await profileRepository.save(memberProfile);
      await profileRepository.setActiveProfile(member.id);

      setSelectedId(member.id);

      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
        });
      } catch {
        // no-op
      }

      closeWhoAreYou();

      // Notificar a toda la app para actualizar vistas y filtros
      window.dispatchEvent(new CustomEvent('semester-data-updated'));
      window.dispatchEvent(new CustomEvent('member-changed', { detail: member }));
    } catch (err) {
      console.error('Error al guardar socio seleccionado:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const canDismiss = !!selectedId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl bg-[var(--paper)] border border-[var(--border)] rounded-3xl p-6 sm:p-8 shadow-2xl text-[var(--ink)] space-y-6 animate-in zoom-in-95 duration-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--ink)] shadow-xs">
              <Users className="w-6 h-6 text-[#BB271A]" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--surface-raised)] text-[var(--muted)] border border-[var(--border)] mb-1">
                <Shield className="w-3 h-3 text-[#BB271A]" />
                Acceso de Operación SG
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--ink)]">
                ¿Quién eres?
              </h2>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                Selecciona tu perfil de socio para registrar tus acciones y configurar este navegador.
              </p>
            </div>
          </div>

          {canDismiss && (
            <button
              onClick={closeWhoAreYou}
              className="p-1.5 rounded-xl hover:bg-[var(--surface-raised)] text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Lista de Socios */}
        <div className="space-y-3">
          {members.map((member) => {
            const isCurrent = selectedId === member.id;
            const initials = member.name.slice(0, 2).toUpperCase();

            return (
              <div
                key={member.id}
                onClick={() => !isSaving && handleSelectMember(member)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 group ${
                  isCurrent
                    ? 'border-[#BB271A] bg-[var(--surface-raised)] shadow-sm ring-1 ring-[#BB271A]/20'
                    : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-raised)] hover:border-[var(--line)] shadow-2xs'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-sm shrink-0 shadow-xs border border-white/10"
                    style={{ backgroundColor: member.color || '#3F3F46' }}
                  >
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-[var(--ink)] tracking-tight">
                        {member.name}
                      </h4>
                      {isCurrent && (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#BB271A]/10 text-[#BB271A] border border-[#BB271A]/20">
                          Este navegador
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--muted)] truncate mt-0.5">
                      {member.role}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {isCurrent ? (
                    <div className="w-8 h-8 rounded-full bg-[#BB271A] text-white flex items-center justify-center shadow-xs">
                      <Check className="w-4 h-4" />
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={isSaving}
                      className="px-3 py-1.5 rounded-xl bg-[#0A0A0A] dark:bg-[#F4F4F5] text-white dark:text-[#0A0A0A] hover:bg-[#1A1A1A] dark:hover:bg-[#E4E4E7] text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 group-hover:scale-102"
                    >
                      <span>Entrar</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pie de modal */}
        <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-[11px] text-[var(--muted)]">
          <span>Esta elección se almacena localmente en este navegador.</span>
          <span className="font-mono font-semibold">MOP-SG v2.0</span>
        </div>
      </div>
    </div>
  );
}
