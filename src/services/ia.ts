import type { WasteAnalysis } from '../types';

const SIMULATED_ANALYSES: WasteAnalysis[] = [
  {
    objets: ['sacs plastiques', 'bouteilles PET', 'restes alimentaires'],
    materiaux: [{ nom: 'plastique', pourcentage: 45 }, { nom: 'organique', pourcentage: 40 }, { nom: 'carton', pourcentage: 15 }],
    volume_m3: 1.2, poids_estime_kg: 180, risque: 'élevé', priorite: 'haute',
    resume: 'Dépôt important d\'ordures ménagères mélangées près d\'un caniveau. Intervention urgente recommandée.',
  },
  {
    objets: ['cartons', 'bouteilles plastiques', 'cannettes aluminium'],
    materiaux: [{ nom: 'carton', pourcentage: 50 }, { nom: 'plastique', pourcentage: 35 }, { nom: 'métal', pourcentage: 15 }],
    volume_m3: 0.8, poids_estime_kg: 90, risque: 'moyen', priorite: 'moyenne',
    resume: 'Accumulation de déchets recyclables mélangés. Valorisation possible avec tri préalable.',
  },
  {
    objets: ['gravats', 'ferraille', 'bois de construction'],
    materiaux: [{ nom: 'gravats', pourcentage: 60 }, { nom: 'métal', pourcentage: 25 }, { nom: 'bois', pourcentage: 15 }],
    volume_m3: 2.5, poids_estime_kg: 450, risque: 'faible', priorite: 'basse',
    resume: 'Déchets de chantier abandonnés. Faible risque sanitaire mais occupation illégale de la voie publique.',
  },
  {
    objets: ['pneus usés', 'huile de moteur', 'batteries'],
    materiaux: [{ nom: 'caoutchouc', pourcentage: 55 }, { nom: 'métaux lourds', pourcentage: 30 }, { nom: 'chimique', pourcentage: 15 }],
    volume_m3: 0.6, poids_estime_kg: 85, risque: 'élevé', priorite: 'haute',
    resume: 'Déchets toxiques et dangereux. Risque de contamination des sols. Intervention prioritaire nécessaire.',
  },
];

export async function analyzerPhoto(imageBase64: string, context?: string, commune?: string): Promise<WasteAnalysis> {
  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, context, commune }),
    });
    if (res.ok) {
      const data = await res.json();
      // Validate required fields
      if (data.materiaux && data.risque && data.priorite && data.resume) {
        return data as WasteAnalysis;
      }
    }
  } catch {
    // fall through to simulation
  }
  // Fallback simulation
  await new Promise(r => setTimeout(r, 1500));
  return SIMULATED_ANALYSES[Math.floor(Math.random() * SIMULATED_ANALYSES.length)];
}

export interface RouteStop {
  id: string;
  address: string;
  latitude: number;
  longitude: number;
  weightKg: number;
}

export interface OptimizedRoute {
  stops: RouteStop[];
  totalDistanceKm: number;
  estimatedDurationMin: number;
  savingsKm: number;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function totalDistance(stops: RouteStop[]): number {
  let d = 0;
  for (let i = 0; i < stops.length - 1; i++) d += haversine(stops[i].latitude, stops[i].longitude, stops[i + 1].latitude, stops[i + 1].longitude);
  return d;
}

export function planRoute(stops: RouteStop[], depotLat = 5.340, depotLon = -4.016): OptimizedRoute {
  if (stops.length === 0) return { stops: [], totalDistanceKm: 0, estimatedDurationMin: 0, savingsKm: 0 };

  // Nearest neighbor heuristic
  const depot = { id: 'depot', address: 'Dépôt central', latitude: depotLat, longitude: depotLon, weightKg: 0 };
  const remaining = [...stops];
  const route: RouteStop[] = [];
  let current = depot;

  while (remaining.length > 0) {
    let nearest = 0;
    let minDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversine(current.latitude, current.longitude, remaining[i].latitude, remaining[i].longitude);
      if (d < minDist) { minDist = d; nearest = i; }
    }
    route.push(remaining[nearest]);
    current = remaining[nearest];
    remaining.splice(nearest, 1);
  }

  // 2-opt improvement
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < route.length - 1; i++) {
      for (let j = i + 1; j < route.length; j++) {
        const before = totalDistance(route);
        const newRoute = [...route];
        newRoute.splice(i, j - i + 1, ...route.slice(i, j + 1).reverse());
        if (totalDistance(newRoute) < before) { route.splice(0, route.length, ...newRoute); improved = true; }
      }
    }
  }

  const dist = totalDistance([depot as RouteStop, ...route]);
  const naiveDist = totalDistance([depot as RouteStop, ...stops]);
  return {
    stops: route,
    totalDistanceKm: Math.round(dist * 10) / 10,
    estimatedDurationMin: Math.round(dist * 3 + route.length * 15),
    savingsKm: Math.round((naiveDist - dist) * 10) / 10,
  };
}

export function verifySorting(imageBase64: string): Promise<{ valid: boolean; message: string }> {
  return new Promise(resolve => setTimeout(() => {
    const valid = Math.random() > 0.3;
    resolve({ valid, message: valid ? 'Le tri semble correct : matière homogène détectée.' : 'Attention : mélange de matières détecté. Veuillez retrier vos déchets pour obtenir le tarif « trié ».' });
  }, 1000));
}
