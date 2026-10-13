'use client';

import { useSemesterData } from '@/hooks/useSemesterData';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import DashboardPage from './dashboard/page';

export default function HomePage() {
  const { needsOnboarding, isLoading, completeOnboarding, loadDemoSemester } = useSemesterData();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#1e1e8a] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-[var(--muted)]">Cargando Mi Semestre...</span>
        </div>
      </div>
    );
  }

  if (needsOnboarding) {
    return <OnboardingFlow onComplete={completeOnboarding} onSelectDemo={loadDemoSemester} />;
  }

  return <DashboardPage />;
}
