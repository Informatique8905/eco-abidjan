import { NextResponse } from 'next/server';
import { query, snowflakeConfigured } from '@/lib/snowflake';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!snowflakeConfigured()) return NextResponse.json({ error: 'Snowflake non configuré' }, { status: 503 });
  try {
    const [config, prices, relays] = await Promise.all([
      query(`SELECT KEY, VALUE, DESCRIPTION FROM CONFIG`),
      query(`SELECT MATERIAL, PRICE_PER_KG FROM PRICES ORDER BY PRICE_PER_KG`),
      query(`SELECT RELAY_ID, NAME, COMMUNE, ST_X(LOCATION) LON, ST_Y(LOCATION) LAT FROM RELAY_POINTS ORDER BY RELAY_ID`),
    ]);
    const cfg = Object.fromEntries(config.map((r: any) => [r.KEY, Number(r.VALUE)]));
    return NextResponse.json({ config: cfg, prices, relays });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
