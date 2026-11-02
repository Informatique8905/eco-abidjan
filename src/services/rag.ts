/**
 * RAG — Retrieval-Augmented Generation pour EcoAbidjan
 * Récupère le contexte pertinent avant d'appeler Grok Vision
 */

import { COMMUNE_RISK_ZONES, WASTE_KNOWLEDGE, SEASONAL_CONTEXT } from '@/src/data/knowledge';
import { getReports, getDashboardStats } from '@/src/services/storage';
import type { Commune } from '@/src/types';

export interface RAGContext {
  communeRisk: string;
  recentStats: string;
  similarReports: string;
  wasteKnowledge: string;
  seasonal: string;
}

/**
 * Construit le contexte RAG pour une commune donnée
 */
export function buildRAGContext(commune?: Commune): RAGContext {
  // 1. Risque spécifique à la commune
  const communeRisk = commune
    ? `Commune : ${commune}. ${COMMUNE_RISK_ZONES[commune] ?? 'Commune d\'Abidjan.'}`
    : 'Commune non précisée.';

  // 2. Stats récentes depuis localStorage (données réelles de la session)
  let recentStats = '';
  try {
    const stats = getDashboardStats();
    const communeData = commune ? stats.byCommune[commune] : null;
    recentStats = [
      `Plateforme EcoAbidjan — stats actuelles :`,
      `- ${stats.totalReports} signalements enregistrés au total`,
      `- ${stats.openReports} en attente de traitement`,
      `- ${stats.treatedReports} traités (taux : ${stats.totalReports > 0 ? Math.round((stats.treatedReports / stats.totalReports) * 100) : 0}%)`,
      `- ${stats.totalWeightKg.toFixed(0)} kg recyclés`,
      communeData
        ? `- ${commune} : ${communeData.reports} signalements, ${communeData.weightKg.toFixed(0)} kg collectés`
        : '',
    ].filter(Boolean).join('\n');
  } catch {
    recentStats = 'Stats non disponibles.';
  }

  // 3. Signalements similaires récents dans la même commune
  let similarReports = '';
  try {
    const allReports = getReports();
    const recent = allReports
      .filter(r => !commune || r.commune === commune)
      .slice(-5); // 5 plus récents

    if (recent.length > 0) {
      similarReports = `Derniers signalements${commune ? ` à ${commune}` : ''} :\n` +
        recent.map(r =>
          `- ${r.status} | ${r.priority} priorité${r.analysis ? ` | ${r.analysis.resume?.slice(0, 80)}` : ''}`
        ).join('\n');
    } else {
      similarReports = `Aucun signalement récent${commune ? ` à ${commune}` : ''}.`;
    }
  } catch {
    similarReports = 'Historique non disponible.';
  }

  return {
    communeRisk,
    recentStats,
    similarReports,
    wasteKnowledge: WASTE_KNOWLEDGE,
    seasonal: SEASONAL_CONTEXT(),
  };
}

/**
 * Formate le contexte RAG en texte pour injection dans le prompt
 */
export function formatRAGContext(ctx: RAGContext): string {
  return `
=== CONTEXTE TERRAIN (RAG) ===

📍 LOCALISATION
${ctx.communeRisk}

🌦️ SAISONNALITÉ
${ctx.seasonal}

📊 STATISTIQUES PLATEFORME
${ctx.recentStats}

📋 HISTORIQUE LOCAL
${ctx.similarReports}

📚 BASE DE CONNAISSANCE DÉCHETS ABIDJAN
${ctx.wasteKnowledge}

=== FIN CONTEXTE ===
`.trim();
}
