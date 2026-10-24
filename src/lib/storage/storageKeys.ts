/**
 * MOP-SG (Mi Operación Personal - Seamos Genios)
 * Claves de almacenamiento centralizadas para aislar completamente el estado local
 * y prevenir colisiones con Mi-Semestre en localhost.
 */

export const STORAGE_PREFIX = 'mopsg_';

export const STORAGE_KEYS = {
  ONBOARDED: `${STORAGE_PREFIX}onboarded_v1`,
  DEMO_MODE: `${STORAGE_PREFIX}demo_mode`,
  USER_CONFIGURED: `${STORAGE_PREFIX}user_configured_v1`,
  PRIORITY_SUBJECT_ID: `${STORAGE_PREFIX}priority_subject_id`,
  ACTIVE_USER_ID: `${STORAGE_PREFIX}active_user_id`,
  DECISION_EVENTS: `${STORAGE_PREFIX}decision_events_v1`,
  THEME: `${STORAGE_PREFIX}theme`,
  CALENDAR_FEEDS: `${STORAGE_PREFIX}calendar_feeds`,
} as const;
