-- ============================================================
-- EcoAbidjan – Script 03 : Analyse photos avec Snowflake Cortex
-- ============================================================
USE DATABASE ECOABIDJAN;
USE SCHEMA PUBLIC;
USE WAREHOUSE ECOABIDJAN_WH;

-- ── 1. Mettre à jour le répertoire du stage ───────────────────
-- (nécessaire avant AI_COMPLETE pour qu'il voie les nouveaux fichiers)
ALTER STAGE PHOTOS_STAGE REFRESH;

-- ── 2. Analyse multimodale avec Cortex AI_COMPLETE ───────────
-- Ce CTE analyse toutes les photos du stage qui n'ont pas encore d'analyse
-- et met à jour la table SIGNALEMENTS avec le JSON de résultat.
--
-- Prérequis : les photos ont été téléversées dans PHOTOS_STAGE
-- via : PUT file://chemin/photo.jpg @PHOTOS_STAGE AUTO_COMPRESS=FALSE;

WITH photos_stage AS (
  SELECT
    RELATIVE_PATH                                                     AS fichier,
    BUILD_SCOPED_FILE_URL(@PHOTOS_STAGE, RELATIVE_PATH)             AS url_photo
  FROM DIRECTORY(@PHOTOS_STAGE)
),
analyse_cortex AS (
  SELECT
    p.fichier,
    p.url_photo,
    -- Appel multimodal : modèle vision capable d'analyser une image
    SNOWFLAKE.CORTEX.AI_COMPLETE(
      'claude-3-5-sonnet',            -- ou 'llama3.2-90b-vision' selon disponibilité
      ARRAY_CONSTRUCT(
        OBJECT_CONSTRUCT('role', 'system',
          'content', 'Tu es un expert en analyse de déchets urbains. Analyse la photo et réponds UNIQUEMENT en JSON strict selon ce schéma : {"objets":["..."],"materiaux":[{"nom":"...","pourcentage":0}],"volume_m3":0,"poids_estime_kg":0,"risque":"faible|moyen|élevé","priorite":"basse|moyenne|haute","resume":"..."}'
        ),
        OBJECT_CONSTRUCT('role', 'user',
          'content', ARRAY_CONSTRUCT(
            OBJECT_CONSTRUCT('type', 'image_url', 'image_url', OBJECT_CONSTRUCT('url', p.url_photo)),
            OBJECT_CONSTRUCT('type', 'text', 'text', 'Analyse ce dépôt sauvage de déchets.')
          )
        )
      )
    ):choices[0]:message:content::STRING                              AS analyse_json_raw
  FROM photos_stage p
)
UPDATE SIGNALEMENTS s
SET
  ANALYSE_IA     = TRY_PARSE_JSON(a.analyse_json_raw),
  MIS_A_JOUR_LE  = CURRENT_TIMESTAMP()
FROM analyse_cortex a
WHERE s.URL_PHOTO LIKE '%' || a.fichier
  AND s.ANALYSE_IA IS NULL;

-- ── 3. Classification du matériau principal avec AI_CLASSIFY ──
-- Utile pour des pipelines de tri automatique ou des stats rapides.
SELECT
  s.ID                                                              AS signalement_id,
  s.COMMUNE,
  SNOWFLAKE.CORTEX.AI_CLASSIFY(
    s.ANALYSE_IA:resume::STRING,          -- texte du résumé IA
    ARRAY_CONSTRUCT('plastique','métal','carton/papier','organique','gravats','mixte')
  )                                                                 AS materiau_principal,
  s.ANALYSE_IA:poids_estime_kg::FLOAT                              AS poids_kg,
  s.ANALYSE_IA:risque::STRING                                       AS risque,
  s.CREE_LE
FROM SIGNALEMENTS s
WHERE s.ANALYSE_IA IS NOT NULL
ORDER BY s.CREE_LE DESC;

-- ── 4. Vérification du tri (bonus) ───────────────────────────
-- Sur une photo de déclaration « déchets triés », vérifie si le tri est correct.
WITH tri_check AS (
  SELECT
    d.ID                                                            AS declaration_id,
    d.USAGER_ID,
    SNOWFLAKE.CORTEX.AI_COMPLETE(
      'claude-3-5-sonnet',
      ARRAY_CONSTRUCT(
        OBJECT_CONSTRUCT('role', 'user',
          'content', ARRAY_CONSTRUCT(
            OBJECT_CONSTRUCT('type', 'image_url', 'image_url', OBJECT_CONSTRUCT('url', BUILD_SCOPED_FILE_URL(@PHOTOS_STAGE, REPLACE(d.URL_PHOTO, 'stage://', '')))),
            OBJECT_CONSTRUCT('type', 'text', 'text', 'Cette photo montre-t-elle des déchets correctement triés (une seule matière, propres) ? Réponds avec : {"tri_correct":true|false,"message":"..."}')
          )
        )
      )
    ):choices[0]:message:content::STRING                            AS tri_json_raw
  FROM DECLARATIONS d
  WHERE d.URL_PHOTO IS NOT NULL AND d.TRI_VALIDE IS NULL
)
UPDATE DECLARATIONS d
SET TRI_VALIDE = TRY_PARSE_JSON(t.tri_json_raw):tri_correct::BOOLEAN
FROM tri_check t
WHERE d.ID = t.declaration_id;
