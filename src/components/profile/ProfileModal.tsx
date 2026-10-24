'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { profileRepository } from '@/lib/storage';
import { Profile, TeamMember } from '@/types';
import { defaultProfile, resetDatabaseToCleanSlate } from '@/lib/mockData';
import { memberRepository } from '@/lib/storage/repositories/memberRepository';
import { syncService } from '@/lib/supabase/syncService';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import {
  X,
  User,
  ShieldCheck,
  Mail,
  Check,
  Cloud,
  CloudUpload,
  CloudDownload,
  LogIn,
  LogOut,
  AlertCircle,
  Loader2,
  Sparkles,
  RefreshCw,
  Save,
  KeyRound,
  Users,
  Calendar,
  Trash2,
  Lock,
  Link2,
} from 'lucide-react';
import { CalendarFeedConfig, CalendarFeedType } from '@/types';
import { calendarFeedService } from '@/lib/calendar/calendarFeedService';

interface ProfileModalProps {
  onProfileUpdated?: () => void;
}

export function ProfileModal({ onProfileUpdated }: ProfileModalProps) {
  const { isProfileOpen, closeProfile, openWhoAreYou } = useUIStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'calendars' | 'cloud'>('profile');

  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Estados de Calendarios iCal
  const [feeds, setFeeds] = useState<CalendarFeedConfig[]>([]);
  const [newFeedName, setNewFeedName] = useState('');
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [newFeedType, setNewFeedType] = useState<CalendarFeedType>('fixed_blocks');
  const [isAddingFeed, setIsAddingFeed] = useState(false);
  const [syncingFeedId, setSyncingFeedId] = useState<string | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [calendarStatusMsg, setCalendarStatusMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  // Supabase Cloud states
  const [isCloudConfigured, setIsCloudConfigured] = useState(false);
  const [cloudUser, setCloudUser] = useState<SupabaseUser | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isSyncLoading, setIsSyncLoading] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  const loadProfileData = useCallback(async () => {
    const [current, allMembers] = await Promise.all([
      (await profileRepository.getActiveProfile()) || defaultProfile,
      memberRepository.getActive()
    ]);
    setProfile(current);
    setMembers(allMembers);

    const matched = allMembers.find(
      (m) => m.name.toLowerCase() === (current.name || '').toLowerCase()
    );
    let activeId = '';
    if (matched) {
      activeId = matched.id;
      setSelectedMemberId(matched.id);
      setName(current.name || matched.name);
      setRole(matched.role);
    } else if (allMembers.length > 0) {
      activeId = allMembers[0].id;
      setSelectedMemberId(allMembers[0].id);
      setName(current.name || allMembers[0].name);
      setRole(allMembers[0].role);
    } else {
      setName(current.name || 'Socio SG');
      setRole('Operaciones SG');
    }
    setEmail(current.email || '');

    if (activeId) {
      setFeeds(calendarFeedService.getFeedsByMember(activeId));
    }
  }, []);

  const checkCloudState = useCallback(async () => {
    const configured = syncService.isConfigured();
    setIsCloudConfigured(configured);
    if (configured) {
      try {
        const user = await syncService.getCurrentUser();
        setCloudUser(user);
      } catch {
        setCloudUser(null);
      }
    }
  }, []);

  useEffect(() => {
    if (isProfileOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadProfileData();
      checkCloudState();
    }
  }, [isProfileOpen, loadProfileData, checkCloudState]);

  const onSelectMember = (memberId: string) => {
    setSelectedMemberId(memberId);
    const m = members.find((item) => item.id === memberId);
    if (m) {
      setName(m.name);
      setRole(m.role);
    }
    setFeeds(calendarFeedService.getFeedsByMember(memberId));
  };

  // Handlers para Calendarios iCal
  const handleAddFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeedName.trim() || !newFeedUrl.trim()) {
      setCalendarStatusMsg({ text: 'Por favor ingresa nombre y URL secreta iCal.', isError: true });
      return;
    }

    if (!selectedMemberId) {
      setCalendarStatusMsg({ text: 'Selecciona primero el socio responsable.', isError: true });
      return;
    }

    setIsAddingFeed(true);
    setCalendarStatusMsg(null);

    const feed: CalendarFeedConfig = {
      id: `feed_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      memberId: selectedMemberId,
      name: newFeedName.trim(),
      url: newFeedUrl.trim(),
      type: newFeedType,
    };

    calendarFeedService.saveFeed(feed);
    const syncRes = await calendarFeedService.syncFeed(feed);

    if (syncRes.success) {
      setCalendarStatusMsg({
        text: `¡Calendario "${feed.name}" agregado y sincronizado (${syncRes.eventCount} eventos)!`,
      });
      setNewFeedName('');
      setNewFeedUrl('');
      setNewFeedType('fixed_blocks');
    } else {
      setCalendarStatusMsg({
        text: `Calendario guardado localmente, pero ocurrió un aviso de red: ${syncRes.error}`,
        isError: true,
      });
    }

    setFeeds(calendarFeedService.getFeedsByMember(selectedMemberId));
    setIsAddingFeed(false);
    onProfileUpdated?.();
  };

  const handleSyncFeed = async (feed: CalendarFeedConfig) => {
    setSyncingFeedId(feed.id);
    setCalendarStatusMsg(null);
    const res = await calendarFeedService.syncFeed(feed);
    if (res.success) {
      setCalendarStatusMsg({
        text: `"${feed.name}" sincronizado con éxito (${res.eventCount} eventos).`,
      });
    } else {
      setCalendarStatusMsg({
        text: `Error al sincronizar "${feed.name}": ${res.error}`,
        isError: true,
      });
    }
    setFeeds(calendarFeedService.getFeedsByMember(selectedMemberId));
    setSyncingFeedId(null);
    onProfileUpdated?.();
  };

  const handleSyncAllFeeds = async () => {
    if (!selectedMemberId) return;
    setIsSyncingAll(true);
    setCalendarStatusMsg(null);
    const { totalEvents, errors } = await calendarFeedService.syncAllFeedsForMember(selectedMemberId);
    if (errors.length === 0) {
      setCalendarStatusMsg({
        text: `¡Todos los calendarios sincronizados (${totalEvents} eventos procesados)!`,
      });
    } else {
      setCalendarStatusMsg({
        text: `Sincronizados ${totalEvents} eventos. Hubo errores: ${errors.join('; ')}`,
        isError: true,
      });
    }
    setFeeds(calendarFeedService.getFeedsByMember(selectedMemberId));
    setIsSyncingAll(false);
    onProfileUpdated?.();
  };

  const handleDeleteFeed = async (feedId: string, feedName: string) => {
    if (confirm(`¿Eliminar el calendario "${feedName}"? Se purgarán sus bloques importados del horario local.`)) {
      await calendarFeedService.deleteFeed(feedId);
      setFeeds(calendarFeedService.getFeedsByMember(selectedMemberId));
      setCalendarStatusMsg({ text: `Calendario "${feedName}" y sus bloques fueron removidos.` });
      onProfileUpdated?.();
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated: Profile = {
      ...profile,
      name: name.trim() || 'Socio SG',
      email: email.trim(),
      studentCode: '',
      university: 'Seamos Genios',
      program: role.trim() || 'Operación SG',
      semesterNumber: 1,
    };

    await profileRepository.save(updated);
    await profileRepository.setActiveProfile(updated.id);

    if (selectedMemberId) {
      await memberRepository.update(selectedMemberId, {
        name: name.trim(),
        role: role.trim(),
      });
    }

    setProfile(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);

    onProfileUpdated?.();
    window.dispatchEvent(new CustomEvent('semester-data-updated'));
  };

  const handleResetLocalData = async () => {
    if (confirm('¿Restablecer los datos locales de Seamos Genios? Se limpiarán tareas y se mantendrán las 4 áreas y los 3 socios.')) {
      await resetDatabaseToCleanSlate();
      await loadProfileData();
      onProfileUpdated?.();
      window.dispatchEvent(new CustomEvent('semester-data-updated'));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  // Supabase Auth
  const handleCloudSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim() || !authPassword.trim()) {
      setSyncStatusMsg({ text: 'Ingresa correo y contraseña.', isError: true });
      return;
    }
    setIsAuthLoading(true);
    setSyncStatusMsg(null);
    try {
      await syncService.signIn(authEmail.trim(), authPassword.trim());
      await checkCloudState();
      setSyncStatusMsg({ text: '¡Sesión iniciada con éxito en Supabase!' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar sesión.';
      setSyncStatusMsg({ text: msg, isError: true });
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleCloudSignUp = async () => {
    if (!authEmail.trim() || !authPassword.trim()) {
      setSyncStatusMsg({ text: 'Ingresa correo y contraseña.', isError: true });
      return;
    }
    if (authPassword.length < 6) {
      setSyncStatusMsg({ text: 'La contraseña debe tener al menos 6 caracteres.', isError: true });
      return;
    }
    setIsAuthLoading(true);
    setSyncStatusMsg(null);
    try {
      const data = await syncService.signUp(authEmail.trim(), authPassword.trim(), name || profile.name);
      await checkCloudState();
      if (data.session) {
        setSyncStatusMsg({ text: '¡Cuenta creada y sesión iniciada en Supabase!' });
      } else {
        setSyncStatusMsg({
          text: '¡Cuenta registrada! Si tu proyecto requiere confirmación, verifica tu bandeja de correo.',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar la cuenta.';
      setSyncStatusMsg({ text: msg, isError: true });
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleCloudSignOut = async () => {
    await syncService.signOut();
    setCloudUser(null);
    setSyncStatusMsg({ text: 'Sesión cerrada en Supabase.' });
  };

  const handlePushToCloud = async () => {
    setIsSyncLoading(true);
    setSyncStatusMsg(null);
    const res = await syncService.pushLocalToCloud();
    setSyncStatusMsg({ text: res.message, isError: !res.success });
    setIsSyncLoading(false);
  };

  const handlePullFromCloud = async () => {
    setIsSyncLoading(true);
    setSyncStatusMsg(null);
    const res = await syncService.pullCloudToLocal();
    setSyncStatusMsg({ text: res.message, isError: !res.success });
    setIsSyncLoading(false);
    if (res.success) {
      await loadProfileData();
      onProfileUpdated?.();
      window.dispatchEvent(new CustomEvent('semester-data-updated'));
    }
  };

  if (!isProfileOpen) return null;

  const initials = (name || profile.name || 'ES')
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl overflow-hidden relative transition-colors max-h-[92vh] flex flex-col">
        {/* Cabecera del Modal */}
        <div className="p-6 bg-[var(--surface)] border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--ink)] text-[var(--paper)] flex items-center justify-center font-bold shadow-md">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[var(--ink)] tracking-tight">
                Perfil del Equipo & Cuenta
              </h2>
              <p className="text-xs text-[var(--muted)]">
                Identidad operativa de los socios de Seamos Genios y sincronización
              </p>
            </div>
          </div>

          <button
            onClick={closeProfile}
            className="p-1.5 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)] transition-colors cursor-pointer"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selector de Pestañas: Mi Perfil vs Nube */}
        <div className="flex border-b border-[var(--border)] bg-[var(--paper)] px-6 pt-2">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'profile'
                ? 'border-[var(--ink)] text-[var(--ink)]'
                : 'border-transparent text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Identidad y Rol SG</span>
          </button>

          <button
            onClick={() => setActiveTab('calendars')}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'calendars'
                ? 'border-[var(--ink)] text-[var(--ink)]'
                : 'border-transparent text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Calendarios iCal</span>
            {feeds.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[var(--surface-hover)] text-[var(--ink)] font-mono font-bold">
                {feeds.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('cloud')}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'cloud'
                ? 'border-[var(--ink)] text-[var(--ink)]'
                : 'border-transparent text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>Sincronización en la Nube</span>
            {isCloudConfigured && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>
        </div>

        {/* Contenido Scrolleable */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: INFORMACIÓN DEL SOCIO / EQUIPO */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-5">
              {/* Tarjeta de Identidad en Vivo */}
              <div className="p-4 rounded-2xl bg-[var(--paper)] border border-[var(--border)] flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--ink)] text-[var(--paper)] font-black text-sm flex items-center justify-center shadow-sm">
                    {initials}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[var(--ink)]">
                      {name || 'Socio SG'}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-[var(--muted)] font-mono mt-0.5">
                      <span className="text-[var(--ink)] font-bold">
                        {role || 'Operación SG'}
                      </span>
                    </div>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Socio Activo
                </span>
              </div>

              {savedSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>¡Datos guardados correctamente en tu dispositivo!</span>
                </div>
              )}

              {/* Formulario de Datos Editables */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="font-bold text-[var(--ink)]">Socio Asignado de Seamos Genios</label>
                  <select
                    value={selectedMemberId}
                    onChange={(e) => onSelectMember(e.target.value)}
                    className="w-full bg-[var(--paper)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--ink)] font-bold focus:outline-none focus:border-[var(--ink)] transition-colors cursor-pointer"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} · {m.role}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="font-bold text-[var(--ink)]">Nombre y Apellidos</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Leon"
                    className="w-full bg-[var(--paper)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--ink)] transition-colors"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="font-bold text-[var(--ink)]">Rol Operativo en Seamos Genios</label>
                  <input
                    type="text"
                    required
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="Ej. Administración, Marketing, Diseño & Video"
                    className="w-full bg-[var(--paper)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--ink)] transition-colors"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="font-bold text-[var(--ink)]">Correo Electrónico (Opcional)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contacto@seamosgenios.com"
                    className="w-full bg-[var(--paper)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--ink)] font-mono focus:outline-none focus:border-[var(--ink)] transition-colors"
                  />
                </div>
              </div>

              {/* Botón Guardar Cambios */}
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[var(--ink)] hover:opacity-90 text-[var(--paper)] text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Save className="w-4 h-4" />
                <span>Guardar Mi Información</span>
              </button>

              {/* Acciones de Plantilla y Reset */}
              <div className="pt-4 border-t border-[var(--border)] space-y-2">
                <div className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">
                  Acciones Rápidas de Espacio de Trabajo
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      closeProfile();
                      openWhoAreYou();
                    }}
                    className="w-full p-3 rounded-xl bg-[var(--paper)] border border-[var(--border)] hover:bg-[var(--surface-raised)] text-[var(--ink)] font-semibold transition-all flex items-center justify-between cursor-pointer group text-left"
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1.5 text-[var(--ink)]">
                        <Users className="w-3.5 h-3.5 text-[#BB271A]" />
                        <span>Cambiar de socio en este navegador</span>
                      </div>
                      <div className="text-[10px] text-[var(--muted)] mt-0.5">
                        Seleccionar entre Leon, Dani o Ángel para este dispositivo
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetLocalData}
                    className="w-full p-3 rounded-xl bg-[var(--paper)] border border-[var(--border)] hover:bg-[var(--surface-raised)] text-[var(--ink)] font-semibold transition-all flex items-center justify-between cursor-pointer group text-left"
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1.5 text-[var(--ink)]">
                        <RefreshCw className="w-3.5 h-3.5 text-[var(--muted)]" />
                        <span>Reiniciar datos locales</span>
                      </div>
                      <div className="text-[10px] text-[var(--muted)] mt-0.5">
                        Restablecer las 4 áreas operativas de Seamos Genios sin tareas ni hitos
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: CALENDARIOS ICAL POR SOCIO */}
          {activeTab === 'calendars' && (
            <div className="space-y-5">
              {/* Tarjeta de Encabezado de Calendarios del Socio */}
              <div className="p-4 rounded-2xl bg-[var(--paper)] border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[var(--ink)] text-[var(--paper)] flex items-center justify-center font-bold shadow-sm">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-[var(--ink)]">
                      Horarios de Google Calendar · {name || 'Socio SG'}
                    </h3>
                    <p className="text-xs text-[var(--muted)]">
                      Sincroniza tu horario universitario o turnos para proteger tus huecos libres.
                    </p>
                  </div>
                </div>

                {feeds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSyncAllFeeds}
                    disabled={isSyncingAll}
                    className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--ink)] text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-spin' : ''}`} />
                    <span>{isSyncingAll ? 'Actualizando...' : 'Actualizar todo'}</span>
                  </button>
                )}
              </div>

              {/* Banner de Privacidad */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold block">Privacidad y seguridad del calendario:</span>
                  <p className="text-[11px] leading-relaxed">
                    Las direcciones secretas de iCal se guardan exclusivamente en el almacenamiento local de este navegador (localStorage). Nunca se guardan en el código ni se suben a Supabase.
                  </p>
                </div>
              </div>

              {/* Mensajes de feedback */}
              {calendarStatusMsg && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    calendarStatusMsg.isError
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  }`}
                >
                  {calendarStatusMsg.isError ? (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  ) : (
                    <Check className="w-4 h-4 shrink-0" />
                  )}
                  <span>{calendarStatusMsg.text}</span>
                </div>
              )}

              {/* Formulario para agregar calendario */}
              <form onSubmit={handleAddFeed} className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-4">
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-[var(--ink)]" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-[var(--ink)]">
                    Vincular nuevo calendario iCal (.ics)
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1.5 sm:col-span-1">
                    <label className="font-bold text-[var(--ink)]">Nombre del calendario</label>
                    <input
                      type="text"
                      placeholder="Ej. Clases Universidad, Turnos Monitoría..."
                      value={newFeedName}
                      onChange={(e) => setNewFeedName(e.target.value)}
                      className="w-full bg-[var(--paper)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--ink)] transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-1">
                    <label className="font-bold text-[var(--ink)]">Tipo de integración</label>
                    <select
                      value={newFeedType}
                      onChange={(e) => setNewFeedType(e.target.value as CalendarFeedType)}
                      className="w-full bg-[var(--paper)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--ink)] font-bold focus:outline-none focus:border-[var(--ink)] transition-colors cursor-pointer"
                    >
                      <option value="fixed_blocks">Bloques fijos (clases, monitorías, turnos)</option>
                      <option value="sg_meetings">Reuniones SG (Área Admin & Incubadora)</option>
                      <option value="ignore">Ignorar (no importar eventos)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="font-bold text-[var(--ink)] flex items-center justify-between">
                      <span>Dirección secreta en formato iCal</span>
                      <span className="text-[10px] text-[var(--muted)] font-normal">Termina en .ics o empieza con webcal://</span>
                    </label>
                    <input
                      type="url"
                      placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
                      value={newFeedUrl}
                      onChange={(e) => setNewFeedUrl(e.target.value)}
                      className="w-full bg-[var(--paper)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs font-mono text-[var(--ink)] focus:outline-none focus:border-[var(--ink)] transition-colors"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isAddingFeed || !newFeedName.trim() || !newFeedUrl.trim()}
                    className="px-4 py-2 rounded-xl bg-[var(--ink)] text-[var(--paper)] text-xs font-bold transition-transform active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isAddingFeed ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Sincronizando...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Vincular y Sincronizar</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Lista de Calendarios Vinculados */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-[var(--ink)]">
                  Calendarios configurados ({feeds.length})
                </h4>

                {feeds.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-[var(--paper)] border border-dashed border-[var(--border)] text-center space-y-2">
                    <Calendar className="w-8 h-8 text-[var(--muted)] mx-auto opacity-40" />
                    <p className="text-xs font-bold text-[var(--ink)]">No tienes calendarios vinculados aún</p>
                    <p className="text-[11px] text-[var(--muted)] max-w-md mx-auto leading-relaxed">
                      En Google Calendar, ve a Configuración de tu calendario &gt; &quot;Integrar el calendario&quot; y copia la &quot;Dirección secreta en formato iCal&quot;. Pégala arriba para importar tus clases y turnos.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {feeds.map((feed) => {
                      const isSyncing = syncingFeedId === feed.id;
                      const typeLabel =
                        feed.type === 'fixed_blocks'
                          ? 'Bloques fijos'
                          : feed.type === 'sg_meetings'
                          ? 'Reuniones SG'
                          : 'Ignorar';

                      const typeColor =
                        feed.type === 'fixed_blocks'
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                          : feed.type === 'sg_meetings'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20';

                      return (
                        <div
                          key={feed.id}
                          className="p-3.5 rounded-2xl bg-[var(--paper)] border border-[var(--border)] flex items-center justify-between gap-3 transition-colors hover:border-[var(--ink)]/40"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-[var(--ink)] truncate">
                                {feed.name}
                              </span>
                              <span
                                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${typeColor}`}
                              >
                                {typeLabel}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-[var(--muted)]">
                              <span>
                                {typeof feed.eventCount === 'number'
                                  ? `${feed.eventCount} eventos`
                                  : 'Sin sincronizar'}
                              </span>
                              {feed.lastSyncedAt && (
                                <>
                                  <span>·</span>
                                  <span>
                                    Última sincr: {new Date(feed.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleSyncFeed(feed)}
                              disabled={isSyncing || isSyncingAll}
                              title="Volver a sincronizar este calendario"
                              className="p-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--ink)] transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteFeed(feed.id, feed.name)}
                              title="Eliminar calendario y sus eventos"
                              className="p-2 rounded-xl bg-[var(--surface)] hover:bg-rose-500/10 hover:text-rose-600 border border-[var(--border)] text-[var(--muted)] transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: NUBE Y AUTENTICACIÓN SUPABASE */}
          {activeTab === 'cloud' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-[var(--paper)] border border-[var(--border)] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Cloud className="w-5 h-5 text-[var(--ink)]" />
                  <div>
                    <h3 className="text-sm font-black text-[var(--ink)]">
                      Nube Supabase PostgreSQL
                    </h3>
                    <p className="text-xs text-[var(--muted)]">
                      {isCloudConfigured
                        ? 'Servidor conectado y listo para sincronizar'
                        : 'Variables de entorno no configuradas'}
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border ${
                    isCloudConfigured
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                  }`}
                >
                  {isCloudConfigured ? 'Conectado' : 'Sin conexión'}
                </span>
              </div>

              {syncStatusMsg && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    syncStatusMsg.isError
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  }`}
                >
                  {syncStatusMsg.isError ? (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  ) : (
                    <Check className="w-4 h-4 shrink-0" />
                  )}
                  <span>{syncStatusMsg.text}</span>
                </div>
              )}

              {isCloudConfigured ? (
                <div>
                  {cloudUser ? (
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-mono uppercase text-[var(--muted)] font-bold block">
                            Sesión Activa en la Nube
                          </span>
                          <span className="font-mono text-xs font-bold text-[var(--ink)] mt-0.5 block">
                            {cloudUser.email}
                          </span>
                        </div>

                        <button
                          onClick={handleCloudSignOut}
                          className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Cerrar Sesión</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <button
                          onClick={handlePushToCloud}
                          disabled={isSyncLoading}
                          className="py-3 px-4 rounded-xl bg-[var(--ink)] hover:opacity-90 text-[var(--paper)] text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98"
                        >
                          {isSyncLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CloudUpload className="w-4 h-4" />
                          )}
                          <span>Respaldar en la Nube</span>
                        </button>

                        <button
                          onClick={handlePullFromCloud}
                          disabled={isSyncLoading}
                          className="py-3 px-4 rounded-xl bg-[var(--paper)] hover:bg-[var(--surface-raised)] text-[var(--ink)] border border-[var(--border)] text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98"
                        >
                          <CloudDownload className="w-4 h-4 text-[var(--ink)]" />
                          <span>Descargar a este Equipo</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-xs text-[var(--muted)] leading-relaxed">
                        Inicia sesión o crea una cuenta para respaldar de forma segura tus horarios, asistencias, tareas y evaluaciones entre cualquier navegador o dispositivo:
                      </p>

                      <form onSubmit={handleCloudSignIn} className="space-y-3">
                        <div className="space-y-1.5 text-xs">
                          <label className="font-bold text-[var(--ink)]">Correo Electrónico</label>
                          <div className="relative">
                            <Mail className="w-3.5 h-3.5 text-[var(--muted)] absolute left-3 top-3" />
                            <input
                              type="email"
                              required
                              placeholder="contacto@seamosgenios.com"
                              value={authEmail}
                              onChange={(e) => setAuthEmail(e.target.value)}
                              className="w-full bg-[var(--paper)] border border-[var(--border)] rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--ink)] transition-colors"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <label className="font-bold text-[var(--ink)]">Contraseña</label>
                            <span className="text-[10px] text-[var(--muted)] font-mono">
                              Mínimo 6 caracteres
                            </span>
                          </div>
                          <div className="relative">
                            <KeyRound className="w-3.5 h-3.5 text-[var(--muted)] absolute left-3 top-3" />
                            <input
                              type="password"
                              required
                              minLength={6}
                              placeholder="••••••••"
                              value={authPassword}
                              onChange={(e) => setAuthPassword(e.target.value)}
                              className="w-full bg-[var(--paper)] border border-[var(--border)] rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--ink)] transition-colors"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                          <button
                            type="submit"
                            disabled={isAuthLoading}
                            className="flex-1 py-3 rounded-xl bg-[var(--ink)] hover:opacity-90 text-[var(--paper)] text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98"
                          >
                            {isAuthLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <LogIn className="w-4 h-4" />
                            )}
                            <span>Iniciar Sesión</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleCloudSignUp}
                            disabled={isAuthLoading}
                            className="flex-1 py-3 rounded-xl bg-[var(--paper)] hover:bg-[var(--surface-raised)] text-[var(--ink)] border border-[var(--border)] text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98"
                          >
                            <span>Crear Cuenta</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[var(--paper)] border border-[var(--border)] text-xs text-[var(--muted)] space-y-2">
                  <p className="font-bold text-[var(--ink)]">
                    Configuración de Supabase requerida
                  </p>
                  <p>
                    Para habilitar la sincronización en la nube, añade estas variables en tu archivo <code className="text-[var(--ink)] font-mono">.env.local</code> o en Vercel:
                  </p>
                  <pre className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] font-mono text-[11px] text-[var(--ink)] overflow-x-auto">
                    NEXT_PUBLIC_SUPABASE_URL=tu-proyecto.supabase.co{'\n'}
                    NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
