import { NextRequest, NextResponse } from 'next/server';
import { callProc, parseVariant, query, snowflakeConfigured } from '@/lib/snowflake';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET() {
  if (!snowflakeConfigured()) return NextResponse.json({ error: 'Snowflake non configuré — mode démo localStorage actif' }, { status: 503 });
  try {
    const rows = await query(
      `SELECT REPORT_ID, USER_ID, COMMUNE, ST_X(LOCATION) LON, ST_Y(LOCATION) LAT,
              TO_CHAR(REPORTED_AT, 'YYYY-MM-DD') AS DATE_STR, TO_CHAR(REPORTED_AT, 'HH24:MI') AS TIME_STR,
              PHOTO_PATH, IFF(PHOTO_PATH IS NULL, NULL, GET_PRESIGNED_URL(@PHOTOS, PHOTO_PATH, 3600)) AS PHOTO_URL,
              AI_DESCRIPTION, AI_CATEGORY, AI_OBJECTS, AI_MATERIALS, AI_WEIGHT_KG, STATUS
         FROM REPORTS ORDER BY REPORTED_AT DESC LIMIT 500`,
    );
    return NextResponse.json(
      rows.map((r: any) => ({ ...r, AI_OBJECTS: parseVariant(r.AI_OBJECTS), AI_MATERIALS: parseVariant(r.AI_MATERIALS) })),
    );
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!snowflakeConfigured()) return NextResponse.json({ error: 'Snowflake non configuré' }, { status: 503 });
  try {
    const { userId, lat, lon, imageBase64, mimeType } = await req.json();
    if (!imageBase64 || typeof lat !== 'number' || typeof lon !== 'number') {
      return NextResponse.json({ error: 'Photo et position GPS requises' }, { status: 400 });
    }
    const reportId = crypto.randomUUID();
    const ext = mimeType === 'image/png' ? 'png' : 'jpg';
    const path = `reports/${new Date().toISOString().slice(0, 10)}/${reportId}.${ext}`;
    await query(`CALL UPLOAD_PHOTO(?, ?)`, [path, imageBase64]);
    await query(
      `INSERT INTO REPORTS (REPORT_ID, USER_ID, LOCATION, COMMUNE, PHOTO_PATH)
       SELECT ?, ?, ST_MAKEPOINT(?, ?),
              (SELECT NAME FROM COMMUNES ORDER BY ST_DISTANCE(CENTER, ST_MAKEPOINT(?, ?)) LIMIT 1), ?`,
      [reportId, userId || 'ANONYME', lon, lat, lon, lat, path],
    );
    const analysis = await callProc('ANALYZE_REPORT', [reportId]);
    return NextResponse.json({ reportId, path, analysis });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
