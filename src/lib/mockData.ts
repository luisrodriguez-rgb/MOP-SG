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
// PERFIL INICIAL SEAMOS GENIOS (Vacío por defecto: cada navegador
// selecciona su socio a través de "¿Quién eres?")
// ═════════════════════════════════════════════════════════════
export const defaultProfile: Profile = {
  id: 'profile-socio-sg',
  name: '',
  studentCode: '',
  documentId: '',
  university: 'Seamos Genios',
  program: 'Operación Seamos Genios',
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
// LAS 4 ÁREAS OPERATIVAS FINALES DE SEAMOS GENIOS
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
    name: 'Desarrollo & Soporte',
    code: 'DEV-SOP',
    professor: 'Dani',
    credits: 4,
    color: '#78716C',
    maxAbsences: 0,
    passingGrade: 3.0,
    currentGrade: 5.0,
  },
  {
    id: 'area-docencia-contenido',
    semesterId: 'op-lanzamiento-playtest',
    name: 'Docencia & Contenido',
    code: 'DOC-CNT',
    professor: 'Ángel',
    credits: 4,
    color: '#52525B',
    maxAbsences: 0,
    passingGrade: 3.0,
    currentGrade: 5.0,
  },
  {
    id: 'area-admin-incubadora',
    semesterId: 'op-lanzamiento-playtest',
    name: 'Administración & Incubadora',
    code: 'ADM-INC',
    professor: 'Equipo SG',
    credits: 4,
    color: '#27272A',
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
