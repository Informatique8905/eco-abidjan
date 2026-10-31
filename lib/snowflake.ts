import fs from 'fs';
import snowflake from 'snowflake-sdk';

snowflake.configure({ logLevel: 'ERROR' });

type Row = Record<string, any>;

let pool: ReturnType<typeof snowflake.createPool> | null = null;

function getPool() {
  if (pool) return pool;
  const opts: any = {
    account: process.env.SNOWFLAKE_ACCOUNT!,
    username: process.env.SNOWFLAKE_USER!,
    role: process.env.SNOWFLAKE_ROLE,
    warehouse: process.env.SNOWFLAKE_WAREHOUSE || 'COMPUTE_WH',
    database: process.env.SNOWFLAKE_DATABASE || 'ECOABIDJAN',
    schema: process.env.SNOWFLAKE_SCHEMA || 'CORE',
    clientSessionKeepAlive: true,
  };
  if (process.env.SNOWFLAKE_TOKEN) {
    opts.authenticator = 'OAUTH';
    opts.token = process.env.SNOWFLAKE_TOKEN;
    if (process.env.SNOWFLAKE_HOST) opts.accessUrl = `https://${process.env.SNOWFLAKE_HOST}`;
  } else if (process.env.SNOWFLAKE_PRIVATE_KEY_PATH) {
    opts.authenticator = 'SNOWFLAKE_JWT';
    opts.privateKeyPath = process.env.SNOWFLAKE_PRIVATE_KEY_PATH;
    if (process.env.SNOWFLAKE_PRIVATE_KEY_PASSPHRASE) opts.privateKeyPass = process.env.SNOWFLAKE_PRIVATE_KEY_PASSPHRASE;
    if (!fs.existsSync(/*turbopackIgnore: true*/ opts.privateKeyPath)) throw new Error(`Clé privée introuvable : ${opts.privateKeyPath}`);
  } else {
    opts.password = process.env.SNOWFLAKE_PASSWORD;
  }
  pool = snowflake.createPool(opts, { max: 5, min: 0 });
  return pool;
}

export async function query<T = Row>(sqlText: string, binds: any[] = []): Promise<T[]> {
  return getPool().use(
    (conn) =>
      new Promise<T[]>((resolve, reject) => {
        conn.execute({
          sqlText,
          binds,
          complete: (err, _stmt, rows) => (err ? reject(err) : resolve((rows || []) as T[])),
        });
      }),
  );
}

export async function callProc<T = any>(name: string, binds: any[]): Promise<T> {
  const placeholders = binds.map(() => '?').join(', ');
  const rows = await query(`CALL ${name}(${placeholders})`, binds);
  const v = Object.values(rows[0] ?? {})[0];
  return (typeof v === 'string' ? JSON.parse(v) : v) as T;
}

export function parseVariant<T = any>(v: unknown): T {
  if (typeof v !== 'string') return v as T;
  try { return JSON.parse(v) as T; } catch { return v as T; }
}

export const snowflakeConfigured = (): boolean =>
  !!(process.env.SNOWFLAKE_ACCOUNT && (process.env.SNOWFLAKE_PASSWORD || process.env.SNOWFLAKE_PRIVATE_KEY_PATH || process.env.SNOWFLAKE_TOKEN));
