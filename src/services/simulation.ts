import type { SimulationParams, SimulationResult, Commune } from '../types';
import { getPricing } from './storage';

export const DEFAULT_PARAMS: SimulationParams = {
  communes: ['Abobo', 'Yopougon', 'Cocody', 'Koumassi'],
  households: 500,
  merchants: 200,
  householdSize: 5,
  kgPerPersonPerDay: 0.8,
  recyclableRatePlastic: 0.13,
  recyclableRatePaper: 0.07,
  recyclableRateMetal: 0.03,
  participationRate: 0.6,
  merchantKgPerDay: 6,
  sortedRate: 0.7,
  days: 30,
};

export function runSimulation(params: SimulationParams): SimulationResult {
  const p = getPricing();
  const nCommunes = params.communes.length;
  const householdsPerCommune = Math.round(params.households / nCommunes);
  const merchantsPerCommune = Math.round(params.merchants / nCommunes);

  const byCommune: SimulationResult['byCommune'] = {};
  let totKg = 0, totRemu = 0, totPts = 0, totCost = 0, totSaved = 0;

  for (const commune of params.communes) {
    const hh = householdsPerCommune;
    const mc = merchantsPerCommune;
    const participating = Math.floor(hh * params.participationRate);
    const dailyKgPerHH = params.householdSize * params.kgPerPersonPerDay;

    const plasticKg = dailyKgPerHH * (params.recyclableRatePlastic) * participating * params.days;
    const paperKg = dailyKgPerHH * (params.recyclableRatePaper) * participating * params.days;
    const metalKg = dailyKgPerHH * (params.recyclableRateMetal) * participating * params.days;
    const merchantKg = mc * params.merchantKgPerDay * params.days;

    const totalKg = plasticKg + paperKg + metalKg + merchantKg;

    // Revenue calculation
    const sortedFrac = params.sortedRate;
    const remuPlastic = plasticKg * (sortedFrac * p.plastique_pet_sorted + (1 - sortedFrac) * p.plastique_pet_unsorted);
    const remuPaper = paperKg * (sortedFrac * p.papier_sorted + (1 - sortedFrac) * p.papier_unsorted);
    const remuMetal = metalKg * (sortedFrac * p.aluminium_sorted + (1 - sortedFrac) * p.aluminium_unsorted);
    const remuMerchant = merchantKg * (sortedFrac * p.carton_sorted + (1 - sortedFrac) * p.carton_unsorted);
    const remuneration = remuPlastic + remuPaper + remuMetal + remuMerchant;
    const points = Math.floor(remuneration * p.points_per_fcfa);

    // Collection cost (estimate: 2 tours/week/commune)
    const tours = Math.ceil(params.days / 7) * 2;
    const distPerTour = 25; // km average
    const collectionCost = tours * (p.collection_cost_per_tour + distPerTour * p.collection_cost_per_km);
    const savedCost = totalKg * p.state_cost_per_kg;

    byCommune[commune] = { households: hh, merchants: mc, totalKg: Math.round(totalKg), plasticKg: Math.round(plasticKg), paperKg: Math.round(paperKg + merchantKg * 0.3), metalKg: Math.round(metalKg), remuneration: Math.round(remuneration), points: Math.round(points), collectionCost: Math.round(collectionCost), savedCost: Math.round(savedCost) };

    totKg += totalKg;
    totRemu += remuneration;
    totPts += points;
    totCost += collectionCost;
    totSaved += savedCost;
  }

  return {
    byCommune,
    totals: {
      kg: Math.round(totKg),
      remuneration: Math.round(totRemu),
      points: Math.round(totPts),
      collectionCost: Math.round(totCost),
      savedCost: Math.round(totSaved),
      netBalance: Math.round(totSaved - totCost - totRemu),
    },
  };
}
