import { NextRequest, NextResponse } from 'next/server';
import { callProc, query, snowflakeConfigured } from '@/lib/snowflake';

export const dynamic = 'force-dynamic';
const MATERIALS = ['CARTON', 'PLASTIQUE', 'ALUMINIUM'];

export async function POST(req: NextRequest) {
  if (!snowflakeConfigured()) return NextResponse.json({ error: 'Snowflake non configuré' }, { status: 503 });
  try {
    const { userId, material, weightKg } = await req.json();
    const w = Number(weightKg);
    if (!userId || !MATERIALS.includes(String(material).toUpperCase()) || !(w > 0) || w > 10000) {
      return NextResponse.json({ error: 'Usager, matériau et poids valides requis' }, { status: 400 });
    }
    const result = await callProc('PROCESS_DECLARATION', [userId, material, w]);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  if (!snowflakeConfigured()) return NextResponse.json([]);
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) return NextResponse.json([]);
  try {
    const rows = await query(
      `SELECT DECL_ID, MATERIAL, WEIGHT_KG, CHANNEL, AMOUNT_FCFA, POINTS, STATUS,
              TO_CHAR(DECLARED_AT, 'YYYY-MM-DD HH24:MI') AS DECLARED_AT
         FROM DECLARATIONS WHERE USER_ID = ? ORDER BY DECLARED_AT DESC LIMIT 10`,
      [userId],
    );
    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
