/**
 * Utilidad para codificar y decodificar la configuración de un semestre en URL
 * Permite compartir un semestre completo (materias, salones y horarios vía NRC)
 * con compañeros por WhatsApp sin necesidad de un backend centralizado.
 */

export interface SharedExamItem {
  title: string;
  nrc?: string;
  date: string;
  weight?: number;
}

export interface SharedSemesterPayload {
  u: string;          // Universidad (ej: 'Universidad Icesi')
  c: string;          // Carrera / Programa (ej: 'Ingeniería Industrial')
  s: number;          // Número de semestre (ej: 4)
  nrcs: string[];     // Lista de NRCs matriculados (ej: ['05359', '42002', '11805'])
  author?: string;    // Nombre del estudiante que comparte (ej: 'Luis')
  exams?: SharedExamItem[]; // Fechas clave de parciales compartidos
}

/**
 * Codifica el payload a Base64 URL-Safe
 */
export function encodeSemesterShare(payload: SharedSemesterPayload): string {
  try {
    const jsonStr = JSON.stringify(payload);
    if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
      const base64 = window.btoa(unescape(encodeURIComponent(jsonStr)));
      return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    // Node.js fallback
    return Buffer.from(jsonStr, 'utf-8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  } catch (err) {
    console.error('Error al codificar semestre compartido:', err);
    return '';
  }
}

/**
 * Decodifica una cadena Base64 URL-Safe a SharedSemesterPayload
 */
export function decodeSemesterShare(encoded: string): SharedSemesterPayload | null {
  if (!encoded || typeof encoded !== 'string') return null;

  try {
    // Restaurar padding y caracteres estándar base64
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }

    let jsonStr = '';
    if (typeof window !== 'undefined' && typeof window.atob === 'function') {
      jsonStr = decodeURIComponent(escape(window.atob(base64)));
    } else {
      jsonStr = Buffer.from(base64, 'base64').toString('utf-8');
    }

    const parsed = JSON.parse(jsonStr) as SharedSemesterPayload;
    if (!parsed || !Array.isArray(parsed.nrcs)) {
      return null;
    }

    return parsed;
  } catch (err) {
    console.error('Error al decodificar semestre compartido:', err);
    return null;
  }
}

/**
 * Genera el enlace completo para compartir por WhatsApp u otro medio
 */
export function generateShareUrl(payload: SharedSemesterPayload, origin?: string): string {
  const code = encodeSemesterShare(payload);
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : 'https://mi-semestre.app');
  return `${base}/?share=${code}`;
}

/**
 * Extrae el payload compartido desde los parámetros de la URL actual
 */
export function getSharedSemesterFromLocation(): SharedSemesterPayload | null {
  if (typeof window === 'undefined') return null;

  try {
    const params = new URLSearchParams(window.location.search);
    const shareCode = params.get('share');
    if (!shareCode) return null;
    return decodeSemesterShare(shareCode);
  } catch {
    return null;
  }
}
