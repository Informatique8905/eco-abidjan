-- ============================================================
-- EcoAbidjan – Script 02 : Données synthétiques (graine fixe)
-- ============================================================
USE DATABASE ECOABIDJAN;
USE SCHEMA PUBLIC;
USE WAREHOUSE ECOABIDJAN_WH;

-- Graine aléatoire fixe pour reproducibilité
-- (Snowflake RANDOM() est déterministe à l'intérieur d'une session si vous
--  spécifiez le même SEQUENCE / SEQ4 seed ; ici on utilise MOD pour la répartition)

-- ── 1. Comptes de démo ────────────────────────────────────────
INSERT INTO USAGERS (ID, TELEPHONE, NOM, PRENOM, ROLE, COMMUNE, POINTS, KG_RECYCLES, NIVEAU, CODE_PIN) VALUES
  ('u001', '0700000001', 'Koné',    'Aminata',   'citizen',  'Abobo',    240, 18.5,  'Graine', '1234'),
  ('u002', '0700000002', 'Bamba',   'Ibrahim',   'merchant', 'Yopougon', 0,   320.0, 'Forêt',  '1234'),
  ('u003', '0700000003', 'Relais',  'Cocody',    'relay',    'Cocody',   0,   0,     'Graine', '1234'),
  ('u004', '0700000004', 'Admin',   'EcoAbidjan','admin',    'Plateau',  0,   0,     'Graine', '1234');

-- ── 2. Points relais (2 par commune pilote) ───────────────────
INSERT INTO POINTS_RELAIS (NOM, COMMUNE, ADRESSE, LOCALISATION, CAPACITE_KG, CHARGE_ACTUELLE_KG, HORAIRES) VALUES
  ('Supermarché A+ – Abobo Gare',       'Abobo',    'Abobo Gare, face marché',      TO_GEOGRAPHY('POINT(-4.018 5.420)'), 700, 210, 'Lun–Sam 8h–20h'),
  ('Cash Express – Abobo Baoulé',       'Abobo',    'Quartier Baoulé, Abobo',       TO_GEOGRAPHY('POINT(-4.022 5.416)'), 700, 140, 'Lun–Dim 7h–21h'),
  ('Supermarché Bamba – Yopougon',      'Yopougon', 'Zone Selmer, Yopougon',        TO_GEOGRAPHY('POINT(-4.073 5.347)'), 600, 320, 'Lun–Sam 8h–20h'),
  ('Maxi Shop – Yopougon Marché',       'Yopougon', 'Marché Yopougon Centre',       TO_GEOGRAPHY('POINT(-4.078 5.342)'), 600,  90, 'Lun–Dim 7h–22h'),
  ('Leader Price – Cocody Riviera',     'Cocody',   'Riviera 2, Cocody',            TO_GEOGRAPHY('POINT(-3.978 5.362)'), 500, 180, 'Lun–Sam 9h–21h'),
  ('Shop Express – Cocody Centre',      'Cocody',   'Av. Christiani, Cocody',       TO_GEOGRAPHY('POINT(-3.983 5.358)'), 500,  60, 'Lun–Dim 8h–20h'),
  ('Supermarchex – Koumassi',           'Koumassi', 'Zone Industrielle, Koumassi',  TO_GEOGRAPHY('POINT(-3.943 5.299)'), 500, 115, 'Lun–Sam 8h–20h'),
  ('Orca Deco – Koumassi Résidentiel',  'Koumassi', 'Koumassi Résidentiel',         TO_GEOGRAPHY('POINT(-3.948 5.295)'), 500,  75, 'Lun–Sam 9h–19h');

-- ── 3. Génération de 500 ménages avec GENERATOR ───────────────
-- Répartis sur 4 communes pilotes, positions aléatoires dans chaque commune
INSERT INTO USAGERS (TELEPHONE, NOM, PRENOM, ROLE, COMMUNE, POINTS, KG_RECYCLES, NIVEAU, CODE_PIN, LOCALISATION)
SELECT
  '07' || LPAD(SEQ4()::VARCHAR, 8, '0')                                        AS TELEPHONE,
  'Ménage'                                                                      AS NOM,
  'Usager_' || SEQ4()                                                           AS PRENOM,
  'citizen'                                                                     AS ROLE,
  CASE MOD(SEQ4(), 4)
    WHEN 0 THEN 'Abobo'
    WHEN 1 THEN 'Yopougon'
    WHEN 2 THEN 'Cocody'
    ELSE        'Koumassi'
  END                                                                           AS COMMUNE,
  FLOOR(UNIFORM(0, 500, RANDOM()))                                              AS POINTS,
  ROUND(UNIFORM(0, 50, RANDOM()), 1)                                           AS KG_RECYCLES,
  'Graine'                                                                      AS NIVEAU,
  '0000'                                                                        AS CODE_PIN,
  -- Position aléatoire dans la commune (±0.02 deg autour du centre)
  TO_GEOGRAPHY('POINT(' ||
    CASE MOD(SEQ4(), 4)
      WHEN 0 THEN -4.020 + UNIFORM(-0.02, 0.02, RANDOM())
      WHEN 1 THEN -4.075 + UNIFORM(-0.02, 0.02, RANDOM())
      WHEN 2 THEN -3.980 + UNIFORM(-0.02, 0.02, RANDOM())
      ELSE        -3.945 + UNIFORM(-0.02, 0.02, RANDOM())
    END || ' ' ||
    CASE MOD(SEQ4(), 4)
      WHEN 0 THEN 5.418 + UNIFORM(-0.02, 0.02, RANDOM())
      WHEN 1 THEN 5.345 + UNIFORM(-0.02, 0.02, RANDOM())
      WHEN 2 THEN 5.360 + UNIFORM(-0.02, 0.02, RANDOM())
      ELSE        5.297 + UNIFORM(-0.02, 0.02, RANDOM())
    END || ')')                                                                 AS LOCALISATION
FROM TABLE(GENERATOR(ROWCOUNT => 500));

-- ── 4. Génération de 200 commerçants ─────────────────────────
INSERT INTO USAGERS (TELEPHONE, NOM, PRENOM, ROLE, COMMUNE, POINTS, KG_RECYCLES, NIVEAU, CODE_PIN)
SELECT
  '05' || LPAD(SEQ4()::VARCHAR, 8, '0')  AS TELEPHONE,
  'Commerce_' || SEQ4()                  AS NOM,
  'Gérant_' || SEQ4()                    AS PRENOM,
  'merchant'                             AS ROLE,
  CASE MOD(SEQ4(), 4)
    WHEN 0 THEN 'Abobo'
    WHEN 1 THEN 'Yopougon'
    WHEN 2 THEN 'Cocody'
    ELSE        'Koumassi'
  END                                    AS COMMUNE,
  0                                      AS POINTS,
  ROUND(UNIFORM(10, 500, RANDOM()), 1)   AS KG_RECYCLES,
  'Pousse'                               AS NIVEAU,
  '0000'                                 AS CODE_PIN
FROM TABLE(GENERATOR(ROWCOUNT => 200));

-- ── 5. Déclarations simulées sur 30 jours ────────────────────
-- ~60% des ménages font une déclaration sur 30 jours
INSERT INTO DECLARATIONS (USAGER_ID, ITEMS, POIDS_TOTAL_KG, VALEUR_TOTALE, POINTS_GAGNES, GROS_VOLUME, STATUT, QR_CODE, COMMUNE)
SELECT
  u.ID,
  PARSE_JSON('[{"type":"plastique_pet","poids_kg":' || ROUND(UNIFORM(0.5, 8, RANDOM()), 1) || ',"trie":true},'
           || '{"type":"aluminium","poids_kg":' || ROUND(UNIFORM(0.2, 2, RANDOM()), 1) || ',"trie":true}]'),
  ROUND(UNIFORM(1, 10, RANDOM()), 1)                    AS POIDS_TOTAL_KG,
  ROUND(UNIFORM(100, 1500, RANDOM()), 0)                AS VALEUR_TOTALE,
  FLOOR(UNIFORM(10, 150, RANDOM()))                     AS POINTS_GAGNES,
  FALSE                                                 AS GROS_VOLUME,
  CASE UNIFORM(1, 3, RANDOM())
    WHEN 1 THEN 'en_attente'
    WHEN 2 THEN 'déposé'
    ELSE        'collecté'
  END                                                   AS STATUT,
  'ECO-' || LEFT(UUID_STRING(), 5)                     AS QR_CODE,
  u.COMMUNE
FROM USAGERS u
WHERE u.ROLE = 'citizen'
  AND RANDOM() < 0.6   -- 60% de taux de participation
LIMIT 300;

-- Déclarations gros volumes (commerçants > seuil 50 kg)
INSERT INTO DECLARATIONS (USAGER_ID, ITEMS, POIDS_TOTAL_KG, VALEUR_TOTALE, POINTS_GAGNES, GROS_VOLUME, STATUT, QR_CODE, COMMUNE, MODE_PAIEMENT, CRENEAU_COLLECTE)
SELECT
  u.ID,
  PARSE_JSON('[{"type":"carton","poids_kg":' || ROUND(UNIFORM(30, 150, RANDOM()), 1) || ',"trie":true}]'),
  ROUND(UNIFORM(50, 200, RANDOM()), 1)                  AS POIDS_TOTAL_KG,
  ROUND(UNIFORM(2500, 12000, RANDOM()), 0)              AS VALEUR_TOTALE,
  0                                                     AS POINTS_GAGNES,
  TRUE                                                  AS GROS_VOLUME,
  CASE UNIFORM(1, 3, RANDOM())
    WHEN 1 THEN 'en_attente'
    WHEN 2 THEN 'collecté'
    ELSE        'payé'
  END                                                   AS STATUT,
  'ECO-' || LEFT(UUID_STRING(), 5)                     AS QR_CODE,
  u.COMMUNE,
  CASE UNIFORM(1, 4, RANDOM())
    WHEN 1 THEN 'orange_money'
    WHEN 2 THEN 'mtn_momo'
    WHEN 3 THEN 'moov'
    ELSE        'wave'
  END                                                   AS MODE_PAIEMENT,
  '31/10/2026 à 08h–12h'                               AS CRENEAU_COLLECTE
FROM USAGERS u
WHERE u.ROLE = 'merchant'
LIMIT 150;
