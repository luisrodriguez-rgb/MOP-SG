'use client';

import { useSemesterData } from '@/hooks/useSemesterData';
import DashboardPage from './dashboard/page';

export default function HomePage() {
  const { isLoading } = useSemesterData();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[var(--ink)] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-[var(--muted)]">Cargando operación...</span>
        </div>
      </div>
    );
  }

  return <DashboardPage />;
}
