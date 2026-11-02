/**
 * Client API — appelle le backend (Render) ou les routes locales (/api/*)
 * Fallback silencieux vers localStorage si l'API retourne 503 ou si le réseau est down.
 */

// En prod sur Vercel, pointe vers le backend Render.
// En dev ou si NEXT_PUBLIC_API_URL est défini, utilise cette valeur.
// Sur Render lui-même, utilise les routes relatives (BASE vide).
const RENDER_URL = 'https://eco-abidjan.onrender.com';

const BASE = (() => {
  if (typeof window === 'undefined') return ''; // SSR → routes relatives
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
  // Détecte si on tourne déjà sur Render → routes relatives
  if (window.location.hostname.includes('onrender.com')) return '';
  // Sinon (Vercel, localhost) → pointe vers Render
  return RENDER_URL;
})();

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
    if (res.status === 503) return null; // Snowflake non configuré → fallback localStorage
    if (!res.ok) {
      console.warn(`[api] ${path} → HTTP ${res.status}`);
      return null;
    }
    return res.json() as Promise<T>;
  } catch (err) {
    console.warn(`[api] ${path} → réseau indisponible`, err);
    return null;
  }
}

export const api = {
  /** Soumet un signalement (photo + GPS) vers le backend */
  async createReport(payload: {
    userId?: string;
    lat: number;
    lon: number;
    imageBase64: string;
    mimeType?: string;
    address?: string;
    trackingNumber?: string;
    priority?: string;
    commune?: string;
  }) {
    return apiFetch<{ reportId: string; path: string; analysis: any }>('/api/reports', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /** Récupère les signalements (admin) */
  async getReports() {
    return apiFetch<any[]>('/api/reports');
  },

  /** Soumet une déclaration de déchets */
  async createDeclaration(payload: { userId: string; material: string; weightKg: number }) {
    return apiFetch<any>('/api/declarations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /** Historique des déclarations d'un usager */
  async getDeclarations(userId: string) {
    return apiFetch<any[]>(`/api/declarations?userId=${encodeURIComponent(userId)}`);
  },

  /** KPIs tableau de bord admin */
  async getKpis() {
    return apiFetch<any>('/api/kpis');
  },

  /** Scan QR au point relais */
  async scan(declId: string) {
    return apiFetch<any>('/api/scan', {
      method: 'POST',
      body: JSON.stringify({ declId }),
    });
  },

  /** Plan de tournée */
  async getRoutePlan(commune: string, stops?: number, days?: number) {
    const params = new URLSearchParams({ commune });
    if (stops) params.set('stops', String(stops));
    if (days) params.set('days', String(days));
    return apiFetch<any>(`/api/route-plan?${params}`);
  },
};
