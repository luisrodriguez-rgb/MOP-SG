/* eslint-disable @next/next/no-img-element */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Calendar,
  CheckSquare,
  AlertTriangle,
  Layers,
  GraduationCap,
  Settings,
  ListTodo,
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useSemesterData } from '@/hooks/useSemesterData';
import { CustomSelect } from '@/components/ui/CustomSelect';

export function Sidebar() {
  const pathname = usePathname();
  const { openCareerSwitchModal, openProfile } = useUIStore();
  const { profile, semester, allSemesters, switchSemester } = useSemesterData();

  const isCurrent = (path: string) =>
    pathname === path || (path === '/dashboard' && pathname === '/');

  const navItems = [
    { href: '/dashboard', label: '¿Qué hago ahora?', icon: Home },
    { href: '/schedule', label: 'Semana & Disponibilidad', icon: Calendar },
    { href: '/tasks', label: 'Entregables por Área', icon: ListTodo },
    { href: '/exams', label: 'Hitos & Playtest', icon: CheckSquare },
    { href: '/radar', label: 'Radar de Atrasos', icon: AlertTriangle },
    { href: '/timeline', label: 'Línea de Semanas', icon: Layers },
  ];

  const studentName = profile?.name || 'Socio SG';
  const studentProgram = profile?.program || 'Seamos Genios · Playtest';
  const initials = profile?.name
    ? profile.name
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : 'SG';

  return (
    <aside className="hidden md:flex w-64 shrink-0 bg-[#0A0A0A] text-[#F4F4F5] flex-col justify-between border-r border-[#27272A] h-screen sticky top-0 overflow-y-auto transition-colors z-40 select-none">
      <div>
        {/* Logo Superior MOP-SG | SEAMOS GENIOS */}
        <div className="p-6 pb-5 flex items-center gap-3 border-b border-[#27272A]">
          <img
            src="/icon.png"
            alt="MOP-SG | SEAMOS GENIOS"
            className="w-8 h-8 object-contain drop-shadow-md rounded-lg"
          />
          <div>
            <div className="font-black text-sm tracking-wider text-white flex items-center gap-1.5 uppercase font-sans">
              MOP-SG <span className="text-[#BB271A] font-black">|</span>
            </div>
            <div className="text-[10px] font-mono tracking-widest text-[#A1A1AA] uppercase font-bold">
              SEAMOS GENIOS
            </div>
          </div>
        </div>

        {/* Lista de Navegación Principal */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isCurrent(item.href);

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  active
                    ? 'bg-[#18181B] text-white border border-[#27272A] font-bold shadow-xs'
                    : 'text-[#A1A1AA] hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-[#BB271A]' : 'text-[#71717A]'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sección "MOP-SG" & Temporada Activa */}
        <div className="px-4 pt-4">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[#71717A] font-bold pb-2">
            <span>TEMPORADA</span>
            <button
              onClick={openCareerSwitchModal}
              className="text-[#BB271A] hover:underline transition-colors cursor-pointer"
              title="Cambiar temporada o configuración"
            >
              + Ajustes
            </button>
          </div>
          
          <div className="space-y-1.5">
            {allSemesters && allSemesters.length > 1 ? (
              <CustomSelect
                className="w-full"
                value={semester?.id || ''}
                onChange={(val) => switchSemester(val)}
                options={allSemesters.map((s) => ({
                  value: s.id,
                  label: s.name,
                  badge: s.isActive ? 'Activa' : undefined,
                }))}
                buttonClassName="bg-[#161616] border-[#27272A] text-white hover:border-[#3F3F46]"
                menuClassName="bg-[#161616] border-[#27272A] text-white"
              />
            ) : (
              <div
                onClick={openCareerSwitchModal}
                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#161616] hover:bg-[#202020] border border-[#27272A] transition-all cursor-pointer group"
              >
                <div className="w-6 h-6 rounded-lg bg-[#27272A] border border-[#3F3F46] flex items-center justify-center text-[#BB271A] text-[11px] font-mono font-bold">
                  SG
                </div>
                <div className="min-w-0 text-left">
                  <div className="text-xs font-bold text-white group-hover:text-[#FAFAFA] transition-colors truncate">
                    {semester?.name || 'Playtest Noviembre 2026'}
                  </div>
                  <div className="text-[10px] text-[#A1A1AA] font-mono truncate">
                    {studentProgram}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pie de Usuario y Branding */}
      <div className="p-3 border-t border-[#27272A] space-y-3">
        {/* Tarjeta Usuario */}
        <div
          onClick={openProfile}
          className="flex items-center justify-between p-2 rounded-xl bg-[#161616] hover:bg-[#202020] border border-[#27272A] transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#27272A] border border-[#3F3F46] text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white transition-colors truncate">
                {studentName}
              </div>
              <div className="text-[10px] text-[#A1A1AA] font-mono truncate">
                {studentProgram}
              </div>
            </div>
          </div>
          <Settings className="w-4 h-4 text-[#71717A] group-hover:text-white transition-colors shrink-0" />
        </div>

        {/* Footer MOP-SG | SEAMOS GENIOS */}
        <div className="px-2 pt-1 flex items-center gap-2 text-[#71717A]">
          <img
            src="/icon.png"
            alt="MOP-SG | SEAMOS GENIOS"
            className="w-4 h-4 object-contain opacity-80 rounded"
          />
          <div>
            <div className="text-[10px] font-bold font-mono tracking-wider uppercase text-[#A1A1AA]">
              MOP-SG <span className="text-[9px] font-normal opacity-70">| SEAMOS GENIOS</span>
            </div>
            <div className="text-[9px] text-[#71717A] font-sans">
              Operación ejecutiva sin fricción.
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
