-- ============================================================
-- EcoAbidjan : mise en place complète de la base Snowflake
-- À exécuter dans une feuille SQL Snowsight (Run All) ou via Snow CLI
-- ============================================================

-- ------------------------------------------------------------
-- 01_setup.sql
-- ------------------------------------------------------------
-- EcoAbidjan : environnement Snowflake
USE ROLE ACCOUNTADMIN;

-- Cortex AI (AI_COMPLETE, AI_CLASSIFY, AI_EXTRACT) : à exécuter une fois par un ACCOUNTADMIN
-- GRANT USE AI FUNCTIONS ON ACCOUNT TO ROLE ACCOUNTADMIN;
-- Si le modèle vision n'est pas disponible dans votre région :
-- ALTER ACCOUNT SET CORTEX_ENABLED_CROSS_REGION = 'ANY_REGION';

CREATE WAREHOUSE IF NOT EXISTS COMPUTE_WH WAREHOUSE_SIZE = XSMALL AUTO_SUSPEND = 60 AUTO_RESUME = TRUE;
CREATE DATABASE IF NOT EXISTS ECOABIDJAN;
CREATE SCHEMA IF NOT EXISTS ECOABIDJAN.CORE;
USE SCHEMA ECOABIDJAN.CORE;

-- Stage interne pour les photos (SSE requis pour TO_FILE / Cortex et les URL présignées)
CREATE STAGE IF NOT EXISTS ECOABIDJAN.CORE.PHOTOS
  ENCRYPTION = (TYPE = 'SNOWFLAKE_SSE')
  DIRECTORY = (ENABLE = TRUE)
  COMMENT = 'Photos des dépôts sauvages signalés';

-- ------------------------------------------------------------
-- 02_tables.sql
-- ------------------------------------------------------------
USE SCHEMA ECOABIDJAN.CORE;

-- Paramètres métier (dont le seuil Y)
CREATE OR REPLACE TABLE CONFIG (KEY STRING PRIMARY KEY, VALUE FLOAT, DESCRIPTION STRING);
INSERT INTO CONFIG VALUES
  ('WEIGHT_THRESHOLD_Y', 20,    'Seuil Y (kg) : au-dessus = rémunération directe (commerçant), en dessous = points (ménage)'),
  ('POINTS_PER_KG',      10,    'Points attribués par kg déposé en point relais'),
  ('POINT_VALUE_FCFA',   5,     'Valeur d''un point en bon d''achat (FCFA)'),
  ('VOUCHER_STEP_POINTS',500,   'Nombre de points pour un bon d''achat'),
  ('COLLECT_COST_PER_KG',35,    'Coût moyen de collecte (FCFA/kg)'),
  ('TRUCK_COST_PER_KM',  650,   'Coût camion de collecte (FCFA/km)'),
  ('DEPOT_LON',          -4.0100,'Centre de tri (Treichville) - longitude'),
  ('DEPOT_LAT',          5.2925, 'Centre de tri (Treichville) - latitude');

CREATE OR REPLACE TABLE PRICES (MATERIAL STRING PRIMARY KEY, PRICE_PER_KG NUMBER(10,2));
INSERT INTO PRICES VALUES ('CARTON', 200), ('PLASTIQUE', 250), ('ALUMINIUM', 300);

CREATE OR REPLACE TABLE COMMUNES (COMMUNE_ID INT PRIMARY KEY, NAME STRING, CENTER GEOGRAPHY);
INSERT INTO COMMUNES
SELECT column1, column2, ST_MAKEPOINT(column3, column4) FROM VALUES
  (1,  'Cocody',      -3.9810, 5.3600),
  (2,  'Yopougon',    -4.0750, 5.3450),
  (3,  'Abobo',       -4.0200, 5.4180),
  (4,  'Treichville', -4.0090, 5.2980),
  (5,  'Marcory',     -3.9930, 5.3050),
  (6,  'Plateau',     -4.0160, 5.3200),
  (7,  'Koumassi',    -3.9450, 5.2970),
  (8,  'Adjamé',      -4.0220, 5.3620),
  (9,  'Attécoubé',   -4.0480, 5.3400),
  (10, 'Port-Bouët',  -3.9300, 5.2550),
  (11, 'Anyama',      -4.0470, 5.4900),
  (12, 'Bingerville', -3.8870, 5.3580),
  (13, 'Songon',      -4.2070, 5.3610);

CREATE OR REPLACE TABLE USERS (
  USER_ID STRING PRIMARY KEY,
  USER_TYPE STRING,            -- MENAGE | COMMERCANT
  NAME STRING,
  PHONE STRING,
  COMMUNE STRING,
  LOCATION GEOGRAPHY,
  POINTS_BALANCE NUMBER DEFAULT 0,
  CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE OR REPLACE TABLE RELAY_POINTS (RELAY_ID STRING PRIMARY KEY, NAME STRING, COMMUNE STRING, LOCATION GEOGRAPHY);

CREATE OR REPLACE TABLE REPORTS (
  REPORT_ID STRING PRIMARY KEY,
  TRACKING_NUMBER STRING,
  USER_ID STRING,
  LOCATION GEOGRAPHY,
  COMMUNE STRING,
  ADDRESS STRING,
  PHOTO_PATH STRING,           -- chemin relatif dans @PHOTOS
  REPORTED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
  AI_DESCRIPTION STRING,
  AI_CATEGORY STRING,
  AI_OBJECTS ARRAY,
  AI_MATERIALS ARRAY,
  AI_WEIGHT_KG FLOAT,
  AI_RAW VARIANT,
  STATUS STRING DEFAULT 'NOUVEAU',  -- NOUVEAU | ANALYSE | PLANIFIE | TRAITE
  PRIORITY STRING DEFAULT 'moyenne' -- basse | moyenne | haute
);

CREATE OR REPLACE TABLE DECLARATIONS (
  DECL_ID STRING PRIMARY KEY,
  USER_ID STRING,
  MATERIAL STRING,
  WEIGHT_KG FLOAT,
  DECLARED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
  CHANNEL STRING,              -- REMUNERATION | POINTS
  AMOUNT_FCFA NUMBER(12,2) DEFAULT 0,
  POINTS NUMBER DEFAULT 0,
  RELAY_ID STRING,
  STATUS STRING                -- COMPLETED | PENDING_SCAN | A_COLLECTER
);

CREATE OR REPLACE TABLE POINTS_LEDGER (
  LEDGER_ID STRING DEFAULT UUID_STRING(), USER_ID STRING, DECL_ID STRING, RELAY_ID STRING,
  BALANCE_BEFORE NUMBER, DELTA NUMBER, BALANCE_AFTER NUMBER, TS TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE OR REPLACE TABLE PAYMENTS (
  PAYMENT_ID STRING DEFAULT UUID_STRING(), USER_ID STRING, DECL_ID STRING,
  AMOUNT_FCFA NUMBER(12,2), METHOD STRING DEFAULT 'MOBILE_MONEY', TS TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- (03_synthetic_data removed — aucune donnée fictive, base vide au démarrage)

-- ------------------------------------------------------------
-- 04_ai_functions.sql
-- ------------------------------------------------------------
-- Analyse IA des photos de dépôts sauvages : AI_COMPLETE (vision) + AI_CLASSIFY + AI_EXTRACT
USE SCHEMA ECOABIDJAN.CORE;

-- Dépôt côté serveur d'une photo (base64) dans @PHOTOS : évite le PUT client
CREATE OR REPLACE PROCEDURE UPLOAD_PHOTO(P_PATH STRING, P_B64 STRING)
RETURNS STRING
LANGUAGE PYTHON
RUNTIME_VERSION = '3.11'
PACKAGES = ('snowflake-snowpark-python')
HANDLER = 'run'
AS
$$
import base64, io

def run(session, p_path, p_b64):
    data = base64.b64decode(p_b64.split(',')[-1])
    session.file.put_stream(io.BytesIO(data), f"@ECOABIDJAN.CORE.PHOTOS/{p_path}",
                            auto_compress=False, overwrite=True)
    session.sql("ALTER STAGE ECOABIDJAN.CORE.PHOTOS REFRESH").collect()
    return p_path
$$;

CREATE OR REPLACE PROCEDURE ANALYZE_REPORT(P_REPORT_ID STRING)
RETURNS VARIANT
LANGUAGE SQL
AS
$$
DECLARE
  v_path STRING;
  v_desc STRING;
  v_cat VARIANT;
  v_ext VARIANT;
  v_weight FLOAT;
BEGIN
  SELECT PHOTO_PATH INTO :v_path FROM REPORTS WHERE REPORT_ID = :P_REPORT_ID;

  -- 1) Vision : description détaillée du dépôt
  SELECT AI_COMPLETE(
           'claude-sonnet-4-5',
           'Tu es un expert en gestion des déchets à Abidjan. Décris précisément ce dépôt sauvage : '
           || 'liste chaque type d''objet visible, les matériaux (plastique, carton, aluminium, verre, organique, textile, gravats...), '
           || 'le volume approximatif en m3 et une estimation du poids total en kg en justifiant. '
           || 'Indique aussi la part valorisable (recyclable). Réponds en français, de façon concise.',
           TO_FILE('@ECOABIDJAN.CORE.PHOTOS', :v_path))
    INTO :v_desc;

  -- 2) Catégorie principale
  SELECT AI_CLASSIFY(:v_desc,
           ['Plastiques', 'Ordures ménagères', 'Cartons/Papiers', 'Métaux/Aluminium',
            'Gravats/BTP', 'Encombrants', 'Déchets verts', 'Mixte'])
    INTO :v_cat;

  -- 3) Extraction structurée
  SELECT AI_EXTRACT(
           text => :v_desc,
           responseFormat => {
             'objets': 'Liste des objets identifiés, séparés par des virgules',
             'materiaux': 'Liste des matériaux identifiés, séparés par des virgules',
             'poids_kg': 'Poids total estimé en kilogrammes, nombre uniquement',
             'volume_m3': 'Volume estimé en m3, nombre uniquement',
             'part_recyclable': 'Pourcentage valorisable estimé, nombre uniquement'
           })
    INTO :v_ext;

  v_weight := TRY_TO_DOUBLE(REPLACE(REGEXP_SUBSTR(:v_ext:response:poids_kg::STRING, '[0-9]+([.,][0-9]+)?'), ',', '.'));

  UPDATE REPORTS SET
    AI_DESCRIPTION = :v_desc,
    AI_CATEGORY    = :v_cat:labels[0]::STRING,
    AI_OBJECTS     = IFF(IS_ARRAY(:v_ext:response:objets), :v_ext:response:objets::ARRAY, SPLIT(:v_ext:response:objets::STRING, ',')),
    AI_MATERIALS   = IFF(IS_ARRAY(:v_ext:response:materiaux), :v_ext:response:materiaux::ARRAY, SPLIT(:v_ext:response:materiaux::STRING, ',')),
    AI_WEIGHT_KG   = :v_weight,
    AI_RAW         = OBJECT_CONSTRUCT('classify', :v_cat, 'extract', :v_ext),
    STATUS         = 'ANALYSE'
  WHERE REPORT_ID = :P_REPORT_ID;

  RETURN OBJECT_CONSTRUCT(
    'report_id', :P_REPORT_ID,
    'description', :v_desc,
    'categorie', :v_cat:labels[0]::STRING,
    'extraction', :v_ext:response,
    'poids_kg', :v_weight);
END;
$$;

-- ------------------------------------------------------------
-- 05_business_logic.sql
-- ------------------------------------------------------------
-- Parcours B : déclaration de déchets recyclables, seuil Y, rémunération ou points
USE SCHEMA ECOABIDJAN.CORE;

CREATE OR REPLACE PROCEDURE PROCESS_DECLARATION(P_USER_ID STRING, P_MATERIAL STRING, P_WEIGHT_KG FLOAT)
RETURNS VARIANT
LANGUAGE SQL
AS
$$
DECLARE
  v_y FLOAT;
  v_price FLOAT;
  v_ppk FLOAT;
  v_decl STRING DEFAULT UUID_STRING();
  v_amount FLOAT;
  v_points NUMBER;
  v_balance NUMBER;
  v_relay_id STRING;
  v_relay_name STRING;
  v_relay_dist FLOAT;
  v_relay_lon FLOAT;
  v_relay_lat FLOAT;
BEGIN
  SELECT VALUE INTO :v_y FROM CONFIG WHERE KEY = 'WEIGHT_THRESHOLD_Y';
  SELECT VALUE INTO :v_ppk FROM CONFIG WHERE KEY = 'POINTS_PER_KG';
  SELECT PRICE_PER_KG INTO :v_price FROM PRICES WHERE MATERIAL = UPPER(:P_MATERIAL);

  IF (P_WEIGHT_KG > v_y) THEN
    -- Gros volume (commerçant) : rémunération directe + mise en tournée de collecte
    v_amount := ROUND(P_WEIGHT_KG * v_price, 0);
    INSERT INTO DECLARATIONS (DECL_ID, USER_ID, MATERIAL, WEIGHT_KG, CHANNEL, AMOUNT_FCFA, STATUS)
      VALUES (:v_decl, :P_USER_ID, UPPER(:P_MATERIAL), :P_WEIGHT_KG, 'REMUNERATION', :v_amount, 'A_COLLECTER');
    INSERT INTO PAYMENTS (USER_ID, DECL_ID, AMOUNT_FCFA) VALUES (:P_USER_ID, :v_decl, :v_amount);
    RETURN OBJECT_CONSTRUCT('decl_id', :v_decl, 'channel', 'REMUNERATION', 'threshold_y', :v_y,
                            'material', UPPER(:P_MATERIAL), 'weight_kg', :P_WEIGHT_KG,
                            'price_per_kg', :v_price, 'amount_fcfa', :v_amount);
  ELSE
    -- Petit volume (ménage) : orientation vers le point relais le plus proche
    v_points := ROUND(P_WEIGHT_KG * v_ppk);
    SELECT r.RELAY_ID, r.NAME, ROUND(ST_DISTANCE(r.LOCATION, u.LOCATION)), ST_X(r.LOCATION), ST_Y(r.LOCATION), u.POINTS_BALANCE
      INTO :v_relay_id, :v_relay_name, :v_relay_dist, :v_relay_lon, :v_relay_lat, :v_balance
      FROM RELAY_POINTS r, USERS u
     WHERE u.USER_ID = :P_USER_ID
     ORDER BY ST_DISTANCE(r.LOCATION, u.LOCATION) LIMIT 1;
    INSERT INTO DECLARATIONS (DECL_ID, USER_ID, MATERIAL, WEIGHT_KG, CHANNEL, POINTS, RELAY_ID, STATUS)
      VALUES (:v_decl, :P_USER_ID, UPPER(:P_MATERIAL), :P_WEIGHT_KG, 'POINTS', :v_points, :v_relay_id, 'PENDING_SCAN');
    RETURN OBJECT_CONSTRUCT('decl_id', :v_decl, 'channel', 'POINTS', 'threshold_y', :v_y,
                            'material', UPPER(:P_MATERIAL), 'weight_kg', :P_WEIGHT_KG,
                            'points_pending', :v_points, 'balance_current', :v_balance,
                            'relay', OBJECT_CONSTRUCT('id', :v_relay_id, 'name', :v_relay_name,
                                                      'distance_m', :v_relay_dist, 'lon', :v_relay_lon, 'lat', :v_relay_lat));
  END IF;
END;
$$;

-- Simulation du scan par le magasin relais : crédit instantané des points
CREATE OR REPLACE PROCEDURE SCAN_AT_RELAY(P_DECL_ID STRING)
RETURNS VARIANT
LANGUAGE SQL
AS
$$
DECLARE
  v_user STRING;
  v_points NUMBER;
  v_relay STRING;
  v_status STRING;
  v_before NUMBER;
  v_after NUMBER;
  v_pval FLOAT;
BEGIN
  SELECT USER_ID, POINTS, RELAY_ID, STATUS INTO :v_user, :v_points, :v_relay, :v_status
    FROM DECLARATIONS WHERE DECL_ID = :P_DECL_ID;
  IF (v_status <> 'PENDING_SCAN') THEN
    RETURN OBJECT_CONSTRUCT('error', 'Déclaration déjà scannée ou non éligible');
  END IF;
  SELECT POINTS_BALANCE INTO :v_before FROM USERS WHERE USER_ID = :v_user;
  SELECT VALUE INTO :v_pval FROM CONFIG WHERE KEY = 'POINT_VALUE_FCFA';
  v_after := v_before + v_points;

  UPDATE USERS SET POINTS_BALANCE = :v_after WHERE USER_ID = :v_user;
  UPDATE DECLARATIONS SET STATUS = 'COMPLETED' WHERE DECL_ID = :P_DECL_ID;
  INSERT INTO POINTS_LEDGER (USER_ID, DECL_ID, RELAY_ID, BALANCE_BEFORE, DELTA, BALANCE_AFTER)
    VALUES (:v_user, :P_DECL_ID, :v_relay, :v_before, :v_points, :v_after);

  RETURN OBJECT_CONSTRUCT('decl_id', :P_DECL_ID, 'user_id', :v_user, 'relay_id', :v_relay,
                          'balance_before', :v_before, 'points_added', :v_points, 'balance_after', :v_after,
                          'voucher_value_before_fcfa', :v_before * :v_pval,
                          'voucher_value_after_fcfa', :v_after * :v_pval);
END;
$$;

-- ------------------------------------------------------------
-- 06_route_planning.sql
-- ------------------------------------------------------------
-- Module IA : planification de la tournée de collecte des commerçants à gros volume
USE SCHEMA ECOABIDJAN.CORE;

CREATE OR REPLACE PROCEDURE PLAN_COLLECTION_ROUTE(P_COMMUNE STRING, P_MAX_STOPS INT, P_DAYS INT)
RETURNS VARIANT
LANGUAGE PYTHON
RUNTIME_VERSION = '3.11'
PACKAGES = ('snowflake-snowpark-python')
HANDLER = 'run'
AS
$$
import json, math

def haversine(a, b):
    r = 6371.0
    lat1, lon1, lat2, lon2 = map(math.radians, (a[1], a[0], b[1], b[0]))
    h = math.sin((lat2-lat1)/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin((lon2-lon1)/2)**2
    return 2*r*math.asin(math.sqrt(h))

def tour_length(pts, order):
    return sum(haversine(pts[order[i]], pts[order[i+1]]) for i in range(len(order)-1))

def nearest_neighbor(pts):
    # 0 = dépôt ; retour au dépôt en fin de tournée
    unvisited, order = set(range(1, len(pts))), [0]
    while unvisited:
        last = order[-1]
        nxt = min(unvisited, key=lambda j: haversine(pts[last], pts[j]))
        order.append(nxt); unvisited.remove(nxt)
    return order + [0]

def two_opt(pts, order):
    improved = True
    while improved:
        improved = False
        for i in range(1, len(order)-2):
            for k in range(i+1, len(order)-1):
                new = order[:i] + order[i:k+1][::-1] + order[k+1:]
                if tour_length(pts, new) < tour_length(pts, order) - 1e-9:
                    order, improved = new, True
    return order

def run(session, p_commune, p_max_stops, p_days):
    cfg = {r['KEY']: r['VALUE'] for r in session.sql("SELECT KEY, VALUE FROM ECOABIDJAN.CORE.CONFIG").collect()}
    y = cfg['WEIGHT_THRESHOLD_Y']
    commune_filter = "" if not p_commune or p_commune.upper() == 'TOUTES' else "AND u.COMMUNE = ?"
    params = [y, int(p_days or 7)] + ([p_commune] if commune_filter else []) + [int(p_max_stops or 12)]
    rows = session.sql(f"""
        SELECT u.USER_ID, u.NAME, u.COMMUNE, ST_X(u.LOCATION) LON, ST_Y(u.LOCATION) LAT,
               SUM(d.WEIGHT_KG) VOLUME_KG,
               LISTAGG(DISTINCT d.MATERIAL, ', ') MATERIALS
          FROM ECOABIDJAN.CORE.USERS u
          JOIN ECOABIDJAN.CORE.DECLARATIONS d ON d.USER_ID = u.USER_ID
         WHERE u.USER_TYPE = 'COMMERCANT' AND d.WEIGHT_KG > ?
           AND (d.STATUS = 'A_COLLECTER' OR d.DECLARED_AT >= DATEADD('day', -?, CURRENT_TIMESTAMP()))
           {commune_filter}
         GROUP BY 1,2,3,4,5
         ORDER BY VOLUME_KG DESC
         LIMIT ?""", params=params).collect()
    if not rows:
        return {"stops": [], "total_km": 0, "message": "Aucun commerçant à gros volume sur la période"}

    depot = (cfg['DEPOT_LON'], cfg['DEPOT_LAT'])
    pts = [depot] + [(r['LON'], r['LAT']) for r in rows]
    naive = list(range(len(pts))) + [0]
    order = two_opt(pts, nearest_neighbor(pts))
    km = tour_length(pts, order)
    naive_km = tour_length(pts, naive)
    total_kg = sum(float(r['VOLUME_KG']) for r in rows)
    cost = km * cfg['TRUCK_COST_PER_KM'] + total_kg * cfg['COLLECT_COST_PER_KG']

    stops = []
    for rank, idx in enumerate(order[1:-1], start=1):
        r = rows[idx-1]
        stops.append({"order": rank, "user_id": r['USER_ID'], "name": r['NAME'], "commune": r['COMMUNE'],
                      "lon": r['LON'], "lat": r['LAT'], "volume_kg": round(float(r['VOLUME_KG']), 1),
                      "materials": r['MATERIALS'],
                      "leg_km": round(haversine(pts[order[rank-1]], pts[idx]), 2)})

    summary = None
    prompt = ("Tu es le planificateur logistique d'EcoAbidjan. Voici une tournée optimisée (algorithme plus proche voisin + 2-opt) "
              f"au départ du centre de tri de Treichville : {len(stops)} arrêts, {km:.1f} km (contre {naive_km:.1f} km sans optimisation), "
              f"{total_kg:.0f} kg à collecter, coût estimé {cost:.0f} FCFA. Arrêts : "
              + "; ".join(f"{s['order']}. {s['name']} ({s['commune']}, {s['volume_kg']} kg)" for s in stops)
              + ". Rédige en français une note opérationnelle courte (5 lignes max) : créneau horaire conseillé en tenant compte du trafic "
                "abidjanais, type et capacité de camion, points d'attention.")
    for model in ('claude-sonnet-4-5', 'pixtral-large', 'mistral-large2', 'llama3.1-70b'):
        try:
            summary = session.sql("SELECT AI_COMPLETE(?, ?) S", params=[model, prompt]).collect()[0]['S']
            break
        except Exception as e:
            summary = f"Résumé IA indisponible ({str(e)[:120]})"

    return {"depot": {"lon": depot[0], "lat": depot[1], "name": "Centre de tri Treichville"},
            "stops": stops, "total_km": round(km, 2), "naive_km": round(naive_km, 2),
            "gain_pct": round(100 * (1 - km / naive_km), 1) if naive_km else 0,
            "total_kg": round(total_kg, 1), "estimated_cost_fcfa": round(cost),
            "ai_summary": summary}
$$;

-- ------------------------------------------------------------
-- 07_kpis.sql
-- ------------------------------------------------------------
-- KPIs de la simulation (500 ménages, 200 commerçants)
USE SCHEMA ECOABIDJAN.CORE;

CREATE OR REPLACE VIEW KPI_SUMMARY AS
SELECT
  (SELECT COUNT_IF(USER_TYPE = 'MENAGE') FROM USERS)                         AS NB_MENAGES,
  (SELECT COUNT_IF(USER_TYPE = 'COMMERCANT') FROM USERS)                     AS NB_COMMERCANTS,
  ROUND(SUM(d.WEIGHT_KG) / 1000, 2)                                          AS TONNAGE_TOTAL_T,
  ROUND(SUM(IFF(d.CHANNEL = 'REMUNERATION', d.WEIGHT_KG, 0)) / 1000, 2)      AS TONNAGE_COMMERCANTS_T,
  ROUND(SUM(IFF(d.CHANNEL = 'POINTS', d.WEIGHT_KG, 0)) / 1000, 2)            AS TONNAGE_MENAGES_T,
  ROUND(SUM(d.WEIGHT_KG) * MAX(c.VALUE))                                     AS COUT_COLLECTE_FCFA,
  SUM(d.AMOUNT_FCFA)                                                         AS REMUNERATIONS_FCFA,
  SUM(IFF(d.STATUS = 'COMPLETED', d.POINTS, 0))                              AS POINTS_DISTRIBUES,
  ROUND(SUM(IFF(d.STATUS = 'COMPLETED', d.POINTS, 0)) * MAX(pv.VALUE))       AS VALEUR_BONS_FCFA,
  COUNT(*)                                                                   AS NB_DECLARATIONS,
  (SELECT COUNT(*) FROM REPORTS)                                             AS NB_SIGNALEMENTS
FROM DECLARATIONS d
CROSS JOIN (SELECT VALUE FROM CONFIG WHERE KEY = 'COLLECT_COST_PER_KG') c
CROSS JOIN (SELECT VALUE FROM CONFIG WHERE KEY = 'POINT_VALUE_FCFA') pv;

CREATE OR REPLACE VIEW KPI_BY_COMMUNE AS
SELECT u.COMMUNE,
       ROUND(SUM(d.WEIGHT_KG) / 1000, 2)                   AS TONNAGE_T,
       SUM(d.AMOUNT_FCFA)                                  AS REMUNERATIONS_FCFA,
       SUM(IFF(d.STATUS = 'COMPLETED', d.POINTS, 0))       AS POINTS_DISTRIBUES,
       COUNT(DISTINCT u.USER_ID)                           AS NB_USAGERS
FROM DECLARATIONS d JOIN USERS u ON u.USER_ID = d.USER_ID
GROUP BY u.COMMUNE;

CREATE OR REPLACE VIEW KPI_BY_MATERIAL AS
SELECT MATERIAL, ROUND(SUM(WEIGHT_KG) / 1000, 2) AS TONNAGE_T, SUM(AMOUNT_FCFA) AS REMUNERATIONS_FCFA
FROM DECLARATIONS GROUP BY MATERIAL;

CREATE OR REPLACE VIEW KPI_DAILY AS
SELECT DATE_TRUNC('day', DECLARED_AT)::DATE AS JOUR,
       ROUND(SUM(WEIGHT_KG) / 1000, 2) AS TONNAGE_T, SUM(AMOUNT_FCFA) AS REMUNERATIONS_FCFA, SUM(POINTS) AS POINTS
FROM DECLARATIONS GROUP BY 1;

-- Vérification
SELECT * FROM ECOABIDJAN.CORE.KPI_SUMMARY;
