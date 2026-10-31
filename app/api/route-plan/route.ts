import { NextRequest, NextResponse } from 'next/server';
import { callProc, snowflakeConfigured } from '@/lib/snowflake';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  if (!snowflakeConfigured()) return NextResponse.json({ error: 'Snowflake non configuré' }, { status: 503 });
  const sp = req.nextUrl.searchParams;
  const commune = sp.get('commune') || 'TOUTES';
  const stops = Math.min(Math.max(Number(sp.get('stops') || 12), 2), 40);
  const days = Math.min(Math.max(Number(sp.get('days') || 7), 1), 30);
  try {
    const plan = await callProc('PLAN_COLLECTION_ROUTE', [commune, stops, days]);
    if (typeof plan?.ai_summary === 'string' && plan.ai_summary.startsWith('"')) {
      try { plan.ai_summary = JSON.parse(plan.ai_summary); } catch { }
    }
    return NextResponse.json(plan);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
