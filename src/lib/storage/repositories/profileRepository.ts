import { db } from '../database';
import { Profile } from '@/types';
import { STORAGE_KEYS } from '../storageKeys';

const ACTIVE_USER_KEY = STORAGE_KEYS.ACTIVE_USER_ID;

export const profileRepository = {
  async getAll(): Promise<Profile[]> {
    return await db.profiles.toArray();
  },

  async getById(id: string): Promise<Profile | undefined> {
    return await db.profiles.get(id);
  },

  async getByStudentCode(code: string): Promise<Profile | undefined> {
    const all = await db.profiles.toArray();
    return all.find((p) => p.studentCode.trim().toLowerCase() === code.trim().toLowerCase());
  },

  async getActiveProfile(): Promise<Profile | undefined> {
    if (typeof window === 'undefined') return undefined;
    const activeId = localStorage.getItem(ACTIVE_USER_KEY) || localStorage.getItem('mop_sg_current_member');
    if (activeId) {
      const found = await db.profiles.get(activeId);
      if (found) return found;

      // Si existe el miembro pero aún no se guardó el perfil en IndexedDB, generarlo
      const member = await db.members.get(activeId);
      if (member) {
        const autoProfile: Profile = {
          id: member.id,
          name: member.name,
          studentCode: `SG-${member.name.toUpperCase().slice(0, 4)}`,
          documentId: '',
          university: 'Seamos Genios',
          program: member.role,
          semesterNumber: 1,
          cohort: '2026',
          gpa: 5.0,
          email: '',
        };
        await db.profiles.put(autoProfile);
        return autoProfile;
      }
    }
    // Si este navegador no ha elegido socio, no asumir ningún perfil ajeno
    return undefined;
  },

  async setActiveProfile(id: string): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ACTIVE_USER_KEY, id);
      localStorage.setItem('mop_sg_current_member', id);
    }
  },

  async save(profile: Profile): Promise<string> {
    await db.profiles.put(profile);
    return profile.id;
  },

  async delete(id: string): Promise<void> {
    await db.profiles.delete(id);
  },
};
