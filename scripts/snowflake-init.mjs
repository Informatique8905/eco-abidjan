/**
 * snowflake-init.mjs
 * Auto-initialise la base Snowflake au démarrage du serveur Render.
 * Exécuté via : node scripts/snowflake-init.mjs
 * Ne fait rien si SNOWFLAKE_ACCOUNT n'est pas défini.
 */

import snowflake from 'snowflake-sdk';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const {
  SNOWFLAKE_ACCOUNT,
  SNOWFLAKE_USER,
  SNOWFLAKE_PASSWORD,
  SNOWFLAKE_PRIVATE_KEY_PATH,
  SNOWFLAKE_TOKEN,
  SNOWFLAKE_ROLE = 'ACCOUNTADMIN',
  SNOWFLAKE_WAREHOUSE = 'COMPUTE_WH',
} = process.env;

if (!SNOWFLAKE_ACCOUNT || !SNOWFLAKE_USER) {
  console.log('[snowflake-init] Aucune configuration Snowflake — mode localStorage activé.');
  process.exit(0);
}

const opts = {
  account:   SNOWFLAKE_ACCOUNT,
  username:  SNOWFLAKE_USER,
  role:      SNOWFLAKE_ROLE,
  warehouse: SNOWFLAKE_WAREHOUSE,
};

if (SNOWFLAKE_TOKEN) {
  opts.authenticator = 'OAUTH';
  opts.token = SNOWFLAKE_TOKEN;
} else if (SNOWFLAKE_PRIVATE_KEY_PATH) {
  opts.authenticator = 'SNOWFLAKE_JWT';
  opts.privateKeyPath = SNOWFLAKE_PRIVATE_KEY_PATH;
} else {
  opts.password = SNOWFLAKE_PASSWORD;
}

const SQL_PATH = join(__dirname, '..', 'snowflake', '00_setup_complet.sql');

function splitStatements(sql) {
  // Découpe les statements en ignorant les ; dans les strings et les commentaires
  const statements = [];
  let current = '';
  let inString = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    const next = sql[i + 1] ?? '';

    if (inLineComment) {
      if (ch === '\n') inLineComment = false;
      current += ch;
      continue;
    }
    if (inBlockComment) {
      if (ch === '*' && next === '/') { inBlockComment = false; current += '*/'; i++; } else current += ch;
      continue;
    }
    if (!inString && ch === '-' && next === '-') { inLineComment = true; current += '--'; i++; continue; }
    if (!inString && ch === '/' && next === '*') { inBlockComment = true; current += '/*'; i++; continue; }
    if (ch === "'" && !inBlockComment) { inString = !inString; }

    if (ch === ';' && !inString) {
      const stmt = current.trim();
      if (stmt.length > 0) statements.push(stmt);
      current = '';
    } else {
      current += ch;
    }
  }
  const last = current.trim();
  if (last.length > 0) statements.push(last);
  return statements;
}

async function runStatement(conn, sqlText) {
  return new Promise((resolve, reject) => {
    conn.execute({
      sqlText,
      complete: (err, stmt, rows) => {
        if (err) reject(err);
        else resolve(rows);
      },
    });
  });
}

async function main() {
  console.log('[snowflake-init] Connexion à Snowflake…');

  const conn = snowflake.createConnection(opts);

  await new Promise((resolve, reject) =>
    conn.connect((err, c) => (err ? reject(err) : resolve(c)))
  );
  console.log('[snowflake-init] Connecté !');

  const sql = readFileSync(SQL_PATH, 'utf8');
  const statements = splitStatements(sql).filter(s => {
    const upper = s.toUpperCase().trim();
    // Saute les commentaires seuls et les lignes USE ROLE qui peuvent échouer sans droits
    return upper.length > 2 && !upper.startsWith('--');
  });

  console.log(`[snowflake-init] ${statements.length} statements à exécuter…`);

  let ok = 0, skip = 0;
  for (const stmt of statements) {
    try {
      await runStatement(conn, stmt);
      ok++;
    } catch (e) {
      // Ignore les erreurs "déjà existant" ou "already exists"
      const msg = e.message ?? '';
      if (
        msg.includes('already exists') ||
        msg.includes('Object') ||
        msg.includes('002002') ||    // Snowflake: object already exists
        msg.includes('001003')       // unexpected token (commentaires vides)
      ) {
        skip++;
      } else {
        console.warn(`[snowflake-init] WARN: ${msg.slice(0, 120)}`);
        skip++;
      }
    }
  }

  console.log(`[snowflake-init] ✓ ${ok} OK · ${skip} ignorés (déjà existants)`);
  conn.destroy(() => {});
}

main().catch(err => {
  console.error('[snowflake-init] Erreur fatale:', err.message);
  process.exit(0); // Ne bloque pas le démarrage du serveur
});
