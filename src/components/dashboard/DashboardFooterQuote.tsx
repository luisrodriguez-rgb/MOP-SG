/* eslint-disable @next/next/no-img-element */
'use client';

import { Sparkles } from 'lucide-react';

export function DashboardFooterQuote() {
  return (
    <footer className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] px-6 py-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs transition-colors">
      <div className="flex items-center gap-3 text-center sm:text-left">
        <div className="w-7 h-7 rounded-full bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center text-[#BB271A] shrink-0">
          <Sparkles className="w-3.5 h-3.5" />
        </div>
        <div className="text-[var(--muted)]">
          <strong className="text-[var(--ink)] font-bold">
            Disciplina hoy, libertad mañana.
          </strong>{' '}
          <span className="text-[var(--muted)]">
            La constancia también es una forma de inteligencia operativa.
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-[10px] font-mono tracking-widest text-[var(--muted)] uppercase font-bold shrink-0">
        <img
          src="/icon.png"
          alt="MOP-SG | SEAMOS GENIOS"
          className="w-4 h-4 object-contain"
        />
        <span>MOP-SG <span className="text-[#BB271A] font-black">|</span> SEAMOS GENIOS</span>
      </div>
    </footer>
  );
}
