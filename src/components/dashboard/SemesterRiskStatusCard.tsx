'use client';

import Link from 'next/link';
import { BarChart3, ChevronRight } from 'lucide-react';

interface SemesterRiskStatusCardProps {
  overallRisk?: 'Bajo' | 'Medio' | 'Alto';
}

export function SemesterRiskStatusCard({ overallRisk = 'Medio' }: SemesterRiskStatusCardProps) {
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Alto':
        return 'text-rose-600 dark:text-rose-400';
      case 'Medio':
        return 'text-amber-600 dark:text-amber-400';
      case 'Bajo':
      default:
        return 'text-emerald-600 dark:text-emerald-400';
    }
  };

  return (
    <Link
      href="/radar"
      className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-5 shadow-xs flex items-center justify-between hover:bg-[var(--surface-raised)] dark:hover:bg-[var(--surface-raised)] transition-all group cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <BarChart3 className="w-4 h-4" />
        </div>
        <div>
          <div className="text-xs font-bold text-[var(--ink)]">
            Estado del semestre
          </div>
          <div className="text-[11px] text-[var(--muted)] mt-0.5">
            Riesgo general:{' '}
            <span className={`font-bold ${getRiskColor(overallRisk)}`}>
              {overallRisk}
            </span>
          </div>
        </div>
      </div>

      <ChevronRight className="w-4 h-4 text-[var(--muted)] group-hover:text-[var(--ink)] group-hover:translate-x-0.5 transition-all" />
    </Link>
  );
}
