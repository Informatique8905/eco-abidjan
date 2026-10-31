-- ============================================================
-- EcoAbidjan – Script 04 : Vues indicateurs pour le tableau de bord
-- ============================================================
USE DATABASE ECOABIDJAN;
USE SCHEMA PUBLIC;

-- ── Vue 1 : Résumé global ─────────────────────────────────────
CREATE OR REPLACE VIEW V_INDICATEURS_GLOBAUX AS
SELECT
  SUM(POIDS_TOTAL_KG)                               AS TONNAGE_TOTAL_KG,
  SUM(VALEUR_TOTALE)                                AS REMUNERATIONS_FCFA,
  SUM(POINTS_GAGNES)                                AS POINTS_DISTRIBUES,
  COUNT(*)                                          AS NB_DECLARATIONS,
  SUM(CASE WHEN GROS_VOLUME THEN 1 ELSE 0 END)      AS NB_COLLECTES_DOMICILE,
  SUM(CASE WHEN NOT GROS_VOLUME THEN 1 ELSE 0 END)  AS NB_DEPOTS_RELAIS,
  -- Coût évité pour l'État (40 F/kg)
  SUM(POIDS_TOTAL_KG) * 40                          AS COUT_EVITE_ETAT_FCFA
FROM DECLARATIONS
WHERE STATUT IN ('déposé','collecté','payé');

-- ── Vue 2 : Indicateurs par commune et par jour ───────────────
CREATE OR REPLACE VIEW V_INDICATEURS_PAR_COMMUNE_JOUR AS
SELECT
  d.COMMUNE,
  DATE_TRUNC('day', d.CREE_LE)                     AS JOUR,
  SUM(d.POIDS_TOTAL_KG)                            AS TONNAGE_KG,
  SUM(d.VALEUR_TOTALE)                             AS REMUNERATION_FCFA,
  SUM(d.POINTS_GAGNES)                             AS POINTS,
  COUNT(*)                                          AS NB_DECLARATIONS
FROM DECLARATIONS d
WHERE STATUT IN ('déposé','collecté','payé')
GROUP BY 1, 2
ORDER BY 2 DESC, 1;

-- ── Vue 3 : Signalements par commune et statut ────────────────
CREATE OR REPLACE VIEW V_SIGNALEMENTS_PAR_COMMUNE AS
SELECT
  COMMUNE,
  STATUT,
  PRIORITE,
  COUNT(*)                                          AS NOMBRE,
  AVG(ANALYSE_IA:poids_estime_kg::FLOAT)           AS POIDS_MOYEN_KG
FROM SIGNALEMENTS
GROUP BY 1, 2, 3;

-- ── Vue 4 : Répartition par matière ──────────────────────────
CREATE OR REPLACE VIEW V_REPARTITION_MATIERES AS
SELECT
  item.value:type::STRING                          AS MATIERE,
  SUM(item.value:poids_kg::FLOAT)                 AS POIDS_TOTAL_KG,
  COUNT(DISTINCT d.ID)                             AS NB_DECLARATIONS,
  ROUND(SUM(item.value:poids_kg::FLOAT) /
    SUM(SUM(item.value:poids_kg::FLOAT)) OVER() * 100, 1) AS POURCENTAGE
FROM DECLARATIONS d,
  LATERAL FLATTEN(input => d.ITEMS) item
WHERE d.STATUT IN ('déposé','collecté','payé')
GROUP BY 1
ORDER BY 2 DESC;

-- ── Vue 5 : Coût de collecte par tournée ─────────────────────
CREATE OR REPLACE VIEW V_COUTS_COLLECTE AS
SELECT
  DATE_TOURNEE,
  COMMUNES,
  POIDS_TOTAL_KG,
  DISTANCE_TOTALE_KM,
  COUT_ESTIME_FCFA,
  OPTIMISE_PAR_IA,
  STATUT,
  -- Coût évité vs coût collecte (bilan)
  POIDS_TOTAL_KG * 40                             AS COUT_EVITE_FCFA,
  (POIDS_TOTAL_KG * 40) - COUT_ESTIME_FCFA        AS BILAN_NET_FCFA
FROM TOURNEES
ORDER BY DATE_TOURNEE DESC;

-- ── Vue 6 : Top usagers par commune ──────────────────────────
CREATE OR REPLACE VIEW V_CLASSEMENT_USAGERS AS
SELECT
  u.COMMUNE,
  u.NOM,
  u.PRENOM,
  u.ROLE,
  u.POINTS,
  u.KG_RECYCLES,
  u.NIVEAU,
  RANK() OVER (PARTITION BY u.COMMUNE ORDER BY u.KG_RECYCLES DESC) AS RANG_COMMUNE
FROM USAGERS u
WHERE u.ROLE IN ('citizen','merchant')
ORDER BY u.COMMUNE, RANG_COMMUNE;

-- ── Vue 7 : Tableau de bord complet (une seule requête) ───────
CREATE OR REPLACE VIEW V_DASHBOARD AS
WITH stats_decl AS (
  SELECT
    SUM(POIDS_TOTAL_KG)    AS total_kg,
    SUM(VALEUR_TOTALE)     AS total_remu,
    SUM(POINTS_GAGNES)     AS total_points,
    COUNT(*)               AS nb_decl
  FROM DECLARATIONS WHERE STATUT IN ('déposé','collecté','payé')
),
stats_sig AS (
  SELECT
    COUNT(*)                                        AS total_sig,
    SUM(CASE WHEN STATUT = 'reçu'    THEN 1 ELSE 0 END) AS ouverts,
    SUM(CASE WHEN STATUT = 'traité'  THEN 1 ELSE 0 END) AS traites
  FROM SIGNALEMENTS
),
stats_tournees AS (
  SELECT COALESCE(SUM(COUT_ESTIME_FCFA), 0) AS total_cout FROM TOURNEES
)
SELECT
  d.total_kg                                        AS TONNAGE_TOTAL_KG,
  d.total_remu                                      AS REMUNERATIONS_FCFA,
  d.total_points                                    AS POINTS_DISTRIBUES,
  d.total_kg * 40                                   AS COUT_EVITE_ETAT_FCFA,
  s.total_sig                                       AS TOTAL_SIGNALEMENTS,
  s.ouverts                                         AS SIGNALEMENTS_OUVERTS,
  s.traites                                         AS SIGNALEMENTS_TRAITES,
  t.total_cout                                      AS COUT_COLLECTE_FCFA,
  (d.total_kg * 40) - t.total_cout - d.total_remu   AS BILAN_NET_FCFA
FROM stats_decl d
CROSS JOIN stats_sig s
CROSS JOIN stats_tournees t;
