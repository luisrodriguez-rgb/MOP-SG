import { InboxItem } from './schemas';
import { SubjectContext, MemberContext } from './preprocessor';

export interface AIProvider {
  extractInboxItems(params: {
    rawText: string;
    enrolledSubjects?: SubjectContext[];
    members?: MemberContext[];
    baseDate?: Date;
  }): Promise<{ items: InboxItem[]; sourceEngine: 'gemini' | 'preprocessor' }>;
}
