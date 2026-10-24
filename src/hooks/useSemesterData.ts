'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Subject,
  ScheduleBlock,
  Assignment,
  Exam,
  AttendanceRecord,
  FixedRoutine,
  Semester,
  Profile,
  TeamMember,
} from '@/types';
import {
  profileRepository,
  semesterRepository,
  subjectRepository,
  scheduleRepository,
  assignmentRepository,
  examRepository,
  attendanceRepository,
  routineRepository,
  memberRepository,
  STORAGE_KEYS,
} from '@/lib/storage';
import { seedDatabaseIfEmpty } from '@/lib/mockData';

export function useSemesterData() {
  const [allSemesters, setAllSemesters] = useState<Semester[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [semester, setSemester] = useState<Semester | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [routines, setRoutines] = useState<FixedRoutine[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  const loadData = useCallback(async () => {
    try {
      // Auto seed if empty (solo si demo mode está activo)
      await seedDatabaseIfEmpty();
      await memberRepository.seedDefaultMembersIfEmpty();

      const [
        activeProfile,
        activeSem,
        semestersList,
        allSubjects,
        allSchedule,
        allAssignments,
        allExams,
        allAttendance,
        allRoutines,
        allMembers,
      ] = await Promise.all([
        profileRepository.getActiveProfile(),
        semesterRepository.getActive(),
        semesterRepository.getAll(),
        subjectRepository.getAll(),
        scheduleRepository.getAll(),
        assignmentRepository.getAll(),
        examRepository.getAll(),
        attendanceRepository.getAll(),
        routineRepository.getAll(),
        memberRepository.getAll(),
      ]);

      setProfile(activeProfile || null);
      setSemester(activeSem || null);
      setAllSemesters(semestersList);
      setSubjects(allSubjects);
      setScheduleBlocks(allSchedule);
      setAssignments(allAssignments);
      setExams(allExams);
      setAttendance(allAttendance);
      setRoutines(allRoutines);
      setMembers(allMembers);

      // En MOP-SG la operacion arranca directamente sin asistente de matricula universitaria
      setNeedsOnboarding(false);
    } catch (err) {
      console.error('Error loading semester data from Dexie:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadDemoSemester = useCallback(async () => {
    setIsLoading(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.DEMO_MODE, 'true');
      localStorage.setItem(STORAGE_KEYS.USER_CONFIGURED, 'true');
    }
    const { resetDatabaseToDemo } = await import('@/lib/mockData');
    await resetDatabaseToDemo();
    setNeedsOnboarding(false);
    await loadData();
    window.dispatchEvent(new CustomEvent('semester-data-updated'));
  }, [loadData]);

  const completeOnboarding = useCallback(async () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.ONBOARDED, 'true');
      localStorage.removeItem(STORAGE_KEYS.DEMO_MODE);
    }
    setNeedsOnboarding(false);
    await loadData();
    window.dispatchEvent(new CustomEvent('semester-data-updated'));
  }, [loadData]);

  const resetToOnboarding = useCallback(async () => {
    setIsLoading(true);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.ONBOARDED);
      localStorage.removeItem(STORAGE_KEYS.DEMO_MODE);
      localStorage.removeItem(STORAGE_KEYS.USER_CONFIGURED);
    }
    const { db } = await import('@/lib/storage/database');
    await db.delete();
    await db.open();
    setNeedsOnboarding(true);
    await loadData();
    window.dispatchEvent(new CustomEvent('semester-data-updated'));
  }, [loadData]);

  const switchSemester = useCallback(async (semesterId: string) => {
    await semesterRepository.setActive(semesterId);
    window.dispatchEvent(new CustomEvent('semester-data-updated'));
  }, []);

  const createSemester = useCallback(async (name: string, startDate?: string, endDate?: string) => {
    const newSem: Semester = {
      id: `sem-${Date.now()}`,
      userId: profile?.id || 'usr-default',
      name,
      startDate: startDate || new Date().toISOString().split('T')[0],
      endDate: endDate || new Date(Date.now() + 120 * 24 * 3600 * 1000).toISOString().split('T')[0],
      totalWeeks: 16,
      isActive: true,
    };
    await semesterRepository.save(newSem);
    await semesterRepository.setActive(newSem.id);
    window.dispatchEvent(new CustomEvent('semester-data-updated'));
    return newSem.id;
  }, [profile?.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();

    const handleDataUpdated = () => {
      loadData();
    };

    window.addEventListener('semester-data-updated', handleDataUpdated);
    return () => {
      window.removeEventListener('semester-data-updated', handleDataUpdated);
    };
  }, [loadData]);

  // Subjects map by ID for O(1) lookups
  const subjectsMap = subjects.reduce<Record<string, Subject>>((acc, s) => {
    acc[s.id] = s;
    return acc;
  }, {});

  // Filtrado de bloques por socio activo: el horario de Leon solo afecta los huecos de Leon
  const activeMemberId = profile?.id || (typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.ACTIVE_USER_ID) : null);

  const activeScheduleBlocks = scheduleBlocks.filter((b) => !b.memberId || b.memberId === activeMemberId);

  return {
    profile,
    activeMemberId,
    semester,
    allSemesters,
    subjects,
    subjectsMap,
    scheduleBlocks,
    activeScheduleBlocks,
    assignments,
    exams,
    attendance,
    routines,
    members,
    isLoading,
    needsOnboarding,
    refreshData: loadData,
    loadDemoSemester,
    completeOnboarding,
    resetToOnboarding,
    switchSemester,
    createSemester,
  };
}
