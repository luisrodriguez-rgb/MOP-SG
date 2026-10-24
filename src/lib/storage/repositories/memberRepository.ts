import { db } from '../database';
import { TeamMember } from '@/types';

export const DEFAULT_MEMBERS: TeamMember[] = [
  { id: 'member-leo', name: 'Leo', role: 'Diseño & Video/Marketing', color: '#BB271A', active: true },
  { id: 'member-luis', name: 'Luis', role: 'Administración, Desarrollo & Soporte', color: '#111729', active: true },
  { id: 'member-profe', name: 'Socio Profe', role: 'Dirección Académica & Contenido', color: '#B7791F', active: true },
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
    const hasLegacyMembers = existing.some((m) => m.name === 'Hermano' || m.id === 'member-hermano');
    if (existing.length === 0 || hasLegacyMembers) {
      await db.members.clear();
      await db.members.bulkPut(DEFAULT_MEMBERS);
    }
  },
};
