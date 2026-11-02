import { NextRequest, NextResponse } from 'next/server';
import { buildRAGContext, formatRAGContext } from '@/src/services/rag';
import type { Commune } from '@/src/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { imageBase64, context, commune } = await req.json();

  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'XAI_API_KEY non configuré' }, { status: 503 });
  }

  // Construction du contexte RAG
  const ragCtx = buildRAGContext(commune as Commune | undefined);
  const ragText = formatRAGContext(ragCtx);

  const prompt = `Tu es un système d'analyse de déchets de précision. Tu analyses des photos de dépôts sauvages à Abidjan (Côte d'Ivoire) pour la plateforme EcoAbidjan.

${ragText}
${context ? `Contexte signalement : ${context}` : ''}

INSTRUCTIONS STRICTES :
1. Analyse UNIQUEMENT ce que tu vois réellement dans la photo — AUCUNE estimation aléatoire
2. Pour le poids : utilise les densités réelles (plastique=30-100kg/m³, organique=250-400kg/m³, carton=80-120kg/m³, métal=200-500kg/m³, gravats=1200-1800kg/m³)
3. Pour le volume : estime en regardant les dimensions relatives des objets par rapport à des repères connus (bouteille=0.5L, sac=50L, benne=10m³)
4. Les pourcentages des matériaux DOIVENT totaliser exactement 100
5. Sois précis au kg près pour les petits dépôts, à 10kg près pour les grands
6. Si la photo est floue ou ne montre pas clairement des déchets, indique risque="faible" et un resume explicatif

Réponds UNIQUEMENT en JSON valide (pas de texte avant ou après) :
{
  "objets": ["liste précise des objets identifiés"],
  "materiaux": [
    { "nom": "plastique", "pourcentage": 45 }
  ],
  "volume_m3": 0.8,
  "poids_estime_kg": 65,
  "risque": "faible|moyen|élevé",
  "priorite": "basse|moyenne|haute",
  "resume": "Description factuelle en 2 phrases : ce qui est visible + recommandation d'intervention"
}

Matériaux : plastique, organique, carton, métal, verre, gravats, chimique, caoutchouc, bois, textile.
Risque = impact sanitaire/environnemental réel. Priorité = urgence intervention (haute si risque sanitaire immédiat ou zone dense).`;

  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'grok-2-vision-1212',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64.startsWith('data:')
                    ? imageBase64
                    : `data:image/jpeg;base64,${imageBase64}`,
                },
              },
              { type: 'text', text: prompt },
            ],
          },
        ],
        max_tokens: 1000,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Grok API error:', err);
      return NextResponse.json({ error: 'Erreur Grok API' }, { status: 502 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? '';

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: 'Réponse Grok invalide' }, { status: 502 });

    const analysis = JSON.parse(jsonMatch[0]);
    // Ajoute les métadonnées RAG pour le debug/audit
    analysis._rag = {
      commune: commune ?? null,
      seasonal: ragCtx.seasonal.slice(0, 60),
    };
    return NextResponse.json(analysis);
  } catch (e) {
    console.error('analyze error:', e);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
