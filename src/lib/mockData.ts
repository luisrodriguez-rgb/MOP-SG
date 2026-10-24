import {
  Profile,
  Semester,
  Subject,
  ScheduleBlock,
  Assignment,
  Exam,
  AttendanceRecord,
  FixedRoutine,
  CourseHistory,
  PendingCourse,
} from '@/types';
import {
  profileRepository,
  semesterRepository,
  subjectRepository,
  memberRepository,
  STORAGE_KEYS,
} from './storage';

// ═════════════════════════════════════════════════════════════
// PERFIL INICIAL SEAMOS GENIOS
// ═════════════════════════════════════════════════════════════
export const defaultProfile: Profile = {
  id: 'profile-socio-sg',
  name: 'Leon',
  studentCode: '',
  documentId: '',
  university: 'Seamos Genios',
  program: 'Equipo Fundador',
  semesterNumber: 1,
  cohort: '2026',
  gpa: 5.0,
  email: '',
};

// ═════════════════════════════════════════════════════════════
// TEMPORADA OPERATIVA: LANZAMIENTO PLAYTEST
// (Sin fecha de fin inventada; la definen desde la app)
// ═════════════════════════════════════════════════════════════
export const defaultSemester: Semester = {
  id: 'op-lanzamiento-playtest',
  userId: 'profile-socio-sg',
  name: 'Lanzamiento Playtest',
  startDate: new Date().toISOString().split('T')[0],
  endDate: '',
  isActive: true,
  totalWeeks: 8,
};

export const mockSemester = defaultSemester;

// ═════════════════════════════════════════════════════════════
// LAS 5 ÁREAS OPERATIVAS DE SEAMOS GENIOS
// ═════════════════════════════════════════════════════════════
export const defaultSubjects: Subject[] = [
  {
    id: 'area-marketing-video',
    semesterId: 'op-lanzamiento-playtest',
    name: 'Marketing, Diseño & Video',
    code: 'MKT-VID',
    professor: 'Leon',
    credits: 4,
    color: '#3F3F46',
    maxAbsences: 0,
    passingGrade: 3.0,
    currentGrade: 5.0,
  },
  {
    id: 'area-dev-soporte',
    semesterId: 'op-lanzamiento-playtest',
    name: 'Desarrollo, Plataforma & Soporte',
    code: 'DEV-OPS',
    professor: 'Dani',
    credits: 4,
    color: '#78716C',
    maxAbsences: 0,
    passingGrade: 3.0,
    currentGrade: 5.0,
  },
  {
    id: 'area-docencia-pedagogia',
    semesterId: 'op-lanzamiento-playtest',
    name: 'Docencia & Contenido Pedagógico',
    code: 'DOC-PED',
    professor: 'Ángel',
    credits: 4,
    color: '#475569',
    maxAbsences: 0,
    passingGrade: 3.0,
    currentGrade: 5.0,
  },
  {
    id: 'area-admin-finanzas',
    semesterId: 'op-lanzamiento-playtest',
    name: 'Administración & Finanzas',
    code: 'ADM-FIN',
    professor: 'Equipo SG',
    credits: 4,
    color: '#27272A',
    maxAbsences: 0,
    passingGrade: 3.0,
    currentGrade: 5.0,
  },
  {
    id: 'area-operaciones-usuarios',
    semesterId: 'op-lanzamiento-playtest',
    name: 'Operaciones & Experiencia de Usuario',
    code: 'OPS-UX',
    professor: 'Equipo SG',
    credits: 4,
    color: '#52525B',
    maxAbsences: 0,
    passingGrade: 3.0,
    currentGrade: 5.0,
  },
];

export const mockSubjects = defaultSubjects;

// Cero tareas y cero hitos inventados en la semilla inicial
export const mockScheduleBlocks: ScheduleBlock[] = [];
export const mockRoutines: FixedRoutine[] = [];
export const mockExams: Exam[] = [];
export const mockAssignments: Assignment[] = [];
export const mockAttendance: AttendanceRecord[] = [];
export const mockHistoryCourses: CourseHistory[] = [];
export const mockPendingCourses: PendingCourse[] = [];

export async function seedDatabaseIfEmpty(): Promise<boolean> {
  const existingProfiles = await profileRepository.getAll();
  if (existingProfiles.length === 0) {
    await profileRepository.save(defaultProfile);
    await profileRepository.setActiveProfile(defaultProfile.id);
  }

  const existingSemesters = await semesterRepository.getAll();
  if (existingSemesters.length === 0) {
    await semesterRepository.save(defaultSemester);
    await subjectRepository.bulkSave(defaultSubjects);
    await memberRepository.seedDefaultMembersIfEmpty();
    return true;
  }
  return false;
}

export async function resetDatabaseToCleanSlate(): Promise<void> {
  const { db } = await import('./storage/database');
  await db.delete();
  await db.open();
  await profileRepository.save(defaultProfile);
  await profileRepository.setActiveProfile(defaultProfile.id);
  await semesterRepository.save(defaultSemester);
  await subjectRepository.bulkSave(defaultSubjects);
  await memberRepository.seedDefaultMembersIfEmpty();
  if (typeof window !== 'undefined') {
    localStorage.clear();
    localStorage.setItem(STORAGE_KEYS.ONBOARDED, 'true');
    localStorage.setItem(STORAGE_KEYS.USER_CONFIGURED, 'true');
  }
}

export const resetDatabaseToDemo = resetDatabaseToCleanSlate;
