import { NextRequest, NextResponse } from 'next/server';
import { callProc, snowflakeConfigured } from '@/lib/snowflake';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!snowflakeConfigured()) return NextResponse.json({ error: 'Snowflake non configuré' }, { status: 503 });
  try {
    const { declId } = await req.json();
    if (!declId) return NextResponse.json({ error: 'declId requis' }, { status: 400 });
    const result = await callProc('SCAN_AT_RELAY', [declId]);
    if (result?.error) return NextResponse.json(result, { status: 409 });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
