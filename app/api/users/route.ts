import { NextRequest, NextResponse } from 'next/server';
import { query, snowflakeConfigured } from '@/lib/snowflake';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!snowflakeConfigured()) return NextResponse.json([]);
  const type = req.nextUrl.searchParams.get('type') === 'COMMERCANT' ? 'COMMERCANT' : 'MENAGE';
  const q = `%${req.nextUrl.searchParams.get('q') ?? ''}%`;
  try {
    const rows = await query(
      `SELECT USER_ID, NAME, COMMUNE, POINTS_BALANCE, ST_X(LOCATION) LON, ST_Y(LOCATION) LAT
         FROM USERS WHERE USER_TYPE = ? AND (NAME ILIKE ? OR USER_ID ILIKE ?)
        ORDER BY USER_ID LIMIT 100`,
      [type, q, q],
    );
    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
