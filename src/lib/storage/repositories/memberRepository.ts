import { db } from '../database';
import { TeamMember } from '@/types';

export const DEFAULT_MEMBERS: TeamMember[] = [
  { id: 'member-leon', name: 'Leon', role: 'Administración, Marketing, Diseño & Video', color: '#3F3F46', active: true },
  { id: 'member-dani', name: 'Dani', role: 'Desarrollo, Administración & Soporte', color: '#78716C', active: true },
  { id: 'member-angel', name: 'Ángel', role: 'Administración & Docencia', color: '#475569', active: true },
];

export const memberRepository = {
  async getAll(): Promise<TeamMember[]> {
    return await db.members.toArray();
  },

  async getActive(): Promise<TeamMember[]> {
    return await db.members.filter((m) => m.active).toArray();
  },

  async getById(id: string): Promise<TeamMember | undefined> {
    return await db.members.get(id);
  },

  async save(member: TeamMember): Promise<string> {
    await db.members.put(member);
    return member.id;
  },

  async bulkSave(members: TeamMember[]): Promise<void> {
    await db.members.bulkPut(members);
  },

  async update(id: string, updates: Partial<TeamMember>): Promise<void> {
    await db.members.update(id, updates);
  },

  async delete(id: string): Promise<void> {
    await db.members.delete(id);
  },

  async seedDefaultMembersIfEmpty(): Promise<void> {
    const existing = await db.members.toArray();
    const hasLegacyMembers = existing.some(
      (m) =>
        m.name === 'Hermano' ||
        m.id === 'member-hermano' ||
        m.id === 'member-leo' ||
        m.name === 'Leo' ||
        m.id === 'member-luis' ||
        m.name === 'Luis' ||
        m.id === 'member-profe' ||
        m.name === 'Socio Profe' ||
        m.id === 'member-dev'
    );

    if (existing.length === 0 || hasLegacyMembers) {
      await db.members.clear();
      await db.members.bulkPut(DEFAULT_MEMBERS);

      // Migrar entregables y exámenes asignados a los IDs anteriores
      const legacyMap: Record<string, { id: string; name: string }> = {
        'member-leo': { id: 'member-leon', name: 'Leon' },
        'member-hermano': { id: 'member-leon', name: 'Leon' },
        'member-luis': { id: 'member-dani', name: 'Dani' },
        'member-dev': { id: 'member-dani', name: 'Dani' },
        'member-profe': { id: 'member-angel', name: 'Ángel' },
      };

      try {
        const tasks = await db.assignments.toArray();
        for (const task of tasks) {
          if (task.assigneeId && legacyMap[task.assigneeId]) {
            const repl = legacyMap[task.assigneeId];
            await db.assignments.update(task.id, {
              assigneeId: repl.id,
              assigneeName: repl.name,
            });
          }
        }

        const exams = await db.exams.toArray();
        for (const exam of exams) {
          if (exam.assigneeId && legacyMap[exam.assigneeId]) {
            const repl = legacyMap[exam.assigneeId];
            await db.exams.update(exam.id, {
              assigneeId: repl.id,
              assigneeName: repl.name,
            });
          }
        }
      } catch (err) {
        console.error('Error migrando asignaciones de miembros previos:', err);
      }
    }
  },
};
