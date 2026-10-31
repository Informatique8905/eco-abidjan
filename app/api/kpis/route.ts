import { NextResponse } from 'next/server';
import { query, snowflakeConfigured } from '@/lib/snowflake';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!snowflakeConfigured()) return NextResponse.json({ error: 'Snowflake non configuré' }, { status: 503 });
  try {
    const [summary, byCommune, byMaterial, daily] = await Promise.all([
      query(`SELECT * FROM KPI_SUMMARY`),
      query(`SELECT * FROM KPI_BY_COMMUNE ORDER BY TONNAGE_T DESC`),
      query(`SELECT * FROM KPI_BY_MATERIAL ORDER BY TONNAGE_T DESC`),
      query(`SELECT TO_CHAR(JOUR, 'DD/MM') AS LABEL, TONNAGE_T, REMUNERATIONS_FCFA, POINTS FROM KPI_DAILY ORDER BY JOUR`),
    ]);
    return NextResponse.json({ summary: summary[0], byCommune, byMaterial, daily });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
