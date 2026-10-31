export type Commune = 'Abobo' | 'Adjamé' | 'Attécoubé' | 'Cocody' | 'Koumassi' | 'Marcory' | 'Plateau' | 'Port-Bouët' | 'Treichville' | 'Yopougon' | 'Anyama' | 'Bingerville' | 'Songon';
export type WasteType = 'plastique_pet' | 'plastique_pehd' | 'plastique_pp' | 'sachets' | 'aluminium' | 'carton' | 'papier' | 'mixte';
export type UserRole = 'citizen' | 'merchant' | 'admin' | 'relay';
export type ReportStatus = 'reçu' | 'en_cours' | 'traité';
export type DeclarationStatus = 'en_attente' | 'déposé' | 'collecté' | 'payé';

export interface User {
  id: string;
  phone: string;
  name: string;
  firstName: string;
  role: UserRole;
  commune: Commune;
  quartier?: string;
  householdSize?: number;
  businessName?: string;
  businessType?: string;
  points: number;
  totalKgRecycled: number;
  level: Level;
  pin: string;
  createdAt: string;
}

export type Level = 'Graine' | 'Pousse' | 'Arbre' | 'Forêt';

export interface WasteAnalysis {
  objets: string[];
  materiaux: { nom: string; pourcentage: number }[];
  volume_m3: number;
  poids_estime_kg: number;
  risque: 'faible' | 'moyen' | 'élevé';
  priorite: 'basse' | 'moyenne' | 'haute';
  resume: string;
}

export interface Report {
  id: string;
  userId?: string;
  anonymous: boolean;
  photoUrl?: string;
  latitude: number;
  longitude: number;
  commune: Commune;
  address: string;
  analysis?: WasteAnalysis;
  status: ReportStatus;
  assignedTeam?: string;
  priority: 'basse' | 'moyenne' | 'haute';
  trackingNumber: string;
  createdAt: string;
  updatedAt: string;
}

export interface WasteItem {
  type: WasteType;
  weightKg: number;
  sorted: boolean;
}

export interface Declaration {
  id: string;
  userId: string;
  items: WasteItem[];
  totalWeightKg: number;
  totalValue: number;
  pointsEarned: number;
  isLargeVolume: boolean;
  status: DeclarationStatus;
  paymentMethod?: 'orange_money' | 'mtn_momo' | 'moov' | 'wave';
  relayPointId?: string;
  qrCode: string;
  collectionSlot?: string;
  commune: Commune;
  photoUrl?: string;
  sortingValid?: boolean;
  createdAt: string;
  scannedAt?: string;
}

export interface RelayPoint {
  id: string;
  name: string;
  commune: Commune;
  address: string;
  latitude: number;
  longitude: number;
  capacityKg: number;
  currentLoadKg: number;
  hours: string;
  isActive: boolean;
}

export interface PointTransaction {
  id: string;
  userId: string;
  declarationId?: string;
  reportId?: string;
  delta: number;
  balanceAfter: number;
  reason: string;
  createdAt: string;
}

export interface CollectionTour {
  id: string;
  date: string;
  communes: Commune[];
  stops: TourStop[];
  totalWeightKg: number;
  totalDistanceKm: number;
  estimatedDurationMin: number;
  estimatedCostFCFA: number;
  optimizedByAI: boolean;
  status: 'planifiée' | 'en_cours' | 'terminée';
  createdAt: string;
}

export interface TourStop {
  order: number;
  declarationId: string;
  userId: string;
  address: string;
  latitude: number;
  longitude: number;
  weightKg: number;
  commune: Commune;
}

export interface PricingConfig {
  plastique_pet_sorted: number;
  plastique_pet_unsorted: number;
  plastique_pehd_sorted: number;
  plastique_pehd_unsorted: number;
  plastique_pp_sorted: number;
  plastique_pp_unsorted: number;
  sachets_sorted: number;
  sachets_unsorted: number;
  aluminium_sorted: number;
  aluminium_unsorted: number;
  carton_sorted: number;
  carton_unsorted: number;
  papier_sorted: number;
  papier_unsorted: number;
  threshold_kg: number;
  points_per_fcfa: number;
  points_to_fcfa: number;
  collection_cost_per_km: number;
  collection_cost_per_tour: number;
  state_cost_per_kg: number;
}

export interface DashboardStats {
  totalWeightKg: number;
  totalRemunerationFCFA: number;
  totalPointsDistributed: number;
  totalReports: number;
  openReports: number;
  treatedReports: number;
  collectionCostFCFA: number;
  savedCostFCFA: number;
  byCommune: Record<string, CommuneStats>;
  byDay: DayStats[];
  byMaterial: MaterialStats[];
}

export interface CommuneStats {
  commune: string;
  weightKg: number;
  reports: number;
  declarations: number;
  remuneration: number;
}

export interface DayStats {
  date: string;
  weightKg: number;
  reports: number;
  remuneration: number;
}

export interface MaterialStats {
  material: string;
  weightKg: number;
  percentage: number;
}

export interface SimulationParams {
  communes: Commune[];
  households: number;
  merchants: number;
  householdSize: number;
  kgPerPersonPerDay: number;
  recyclableRatePlastic: number;
  recyclableRatePaper: number;
  recyclableRateMetal: number;
  participationRate: number;
  merchantKgPerDay: number;
  sortedRate: number;
  days: number;
}

export interface SimulationResult {
  byCommune: Record<string, {
    households: number;
    merchants: number;
    totalKg: number;
    plasticKg: number;
    paperKg: number;
    metalKg: number;
    remuneration: number;
    points: number;
    collectionCost: number;
    savedCost: number;
  }>;
  totals: {
    kg: number;
    remuneration: number;
    points: number;
    collectionCost: number;
    savedCost: number;
    netBalance: number;
  };
}

export interface Notification {
  id: string;
  type: 'report' | 'declaration' | 'system';
  title: string;
  message: string;
  refId?: string;
  read: boolean;
  createdAt: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  points: number;
  target: number;
  unit: string;
  type: 'recycle_kg' | 'reports' | 'streak';
  material?: WasteType;
  progress: number;
  completed: boolean;
  expiresAt: string;
}

export interface Reward {
  id: string;
  title: string;
  partner: string;
  pointsCost: number;
  valueFCFA: number;
  description: string;
  available: boolean;
}

export interface HistoryItem {
  id: string;
  type: 'report' | 'declaration' | 'deposit' | 'payment' | 'points' | 'voucher' | 'challenge';
  title: string;
  subtitle: string;
  amount?: number;
  points?: number;
  status?: string;
  refId?: string;
  createdAt: string;
}
