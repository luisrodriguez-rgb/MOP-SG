import { db } from '../database';
import { TeamMember } from '@/types';

export const DEFAULT_MEMBERS: TeamMember[] = [
  { id: 'member-leo', name: 'Leo', role: 'Operaciones & Desarrollo', color: '#3B82F6', active: true },
  { id: 'member-hermano', name: 'Hermano', role: 'Diseño & Video/Marketing', color: '#EC4899', active: true },
  { id: 'member-dev', name: 'Socio Dev', role: 'Desarrollo & Soporte', color: '#10B981', active: true },
  { id: 'member-profe', name: 'Socio Profe', role: 'Docencia & Contenido', color: '#F59E0B', active: true },
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
    const count = await db.members.count();
    if (count === 0) {
      await db.members.bulkPut(DEFAULT_MEMBERS);
    }
  },
};
