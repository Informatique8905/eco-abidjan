import type { User, Report, Declaration, RelayPoint, CollectionTour, PricingConfig, Notification, Challenge, Reward } from '../types';

// Grille tarifaire réelle EcoAbidjan (F CFA / kg)
export const PRICING: PricingConfig = {
  plastique_pet_sorted: 100,    plastique_pet_unsorted: 40,
  plastique_pehd_sorted: 100,   plastique_pehd_unsorted: 40,
  plastique_pp_sorted: 75,      plastique_pp_unsorted: 30,
  sachets_sorted: 50,           sachets_unsorted: 20,
  aluminium_sorted: 300,        aluminium_unsorted: 120,
  carton_sorted: 50,            carton_unsorted: 0,
  papier_sorted: 50,            papier_unsorted: 0,
  threshold_kg: 50,
  points_per_fcfa: 0.1,
  points_to_fcfa: 10,
  collection_cost_per_km: 400,
  collection_cost_per_tour: 10000,
  state_cost_per_kg: 40,
};

export const WASTE_LABELS: Record<string, string> = {
  plastique_pet:  'Bouteilles PET',
  plastique_pehd: 'Bidons PEHD',
  plastique_pp:   'Bouchons/Seaux PP',
  sachets:        'Sachets/Films',
  aluminium:      'Canettes aluminium',
  carton:         'Carton',
  papier:         'Papier blanc',
  mixte:          'Ordures mélangées',
};

export const COMMUNE_CENTERS: Record<string, [number, number]> = {
  Abobo:       [5.418, -4.020],
  Yopougon:    [5.345, -4.075],
  Cocody:      [5.360, -3.980],
  Koumassi:    [5.297, -3.945],
  Adjamé:      [5.362, -4.022],
  Plateau:     [5.320, -4.016],
  Marcory:     [5.305, -3.993],
  'Port-Bouët':[5.255, -3.930],
  Treichville: [5.298, -4.009],
  Attécoubé:   [5.340, -4.048],
  Anyama:      [5.490, -4.047],
  Bingerville: [5.358, -3.887],
  Songon:      [5.361, -4.207],
};

// Aucune donnée fictive — tableaux vides au démarrage
export const DEMO_USERS: User[]             = [];
export const RELAY_POINTS: RelayPoint[]     = [];
export const DEMO_REPORTS: Report[]         = [];
export const DEMO_DECLARATIONS: Declaration[] = [];
export const DEMO_TOURS: CollectionTour[]   = [];
export const DEMO_NOTIFICATIONS: Notification[] = [];
export const DEMO_CHALLENGES: Challenge[]   = [];
export const DEMO_REWARDS: Reward[]         = [];
