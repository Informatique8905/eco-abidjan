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

  const prompt = `Tu es un expert en gestion des déchets urbains à Abidjan, Côte d'Ivoire. Analyse cette photo d'un dépôt sauvage.

${ragText}

${context ? `Contexte additionnel du signalement : ${context}` : ''}

En utilisant le contexte terrain ci-dessus, analyse précisément ce dépôt et réponds UNIQUEMENT en JSON valide :
{
  "objets": ["liste des objets visibles dans la photo"],
  "materiaux": [
    { "nom": "plastique", "pourcentage": 45 },
    { "nom": "organique", "pourcentage": 30 }
  ],
  "volume_m3": 1.5,
  "poids_estime_kg": 200,
  "risque": "faible|moyen|élevé",
  "priorite": "basse|moyenne|haute",
  "resume": "Description précise en 2 phrases max, tenant compte du contexte local (commune, saison, historique)"
}

Matériaux possibles : plastique, organique, carton, métal, verre, gravats, chimique, caoutchouc, bois, textile.
Calibre ton évaluation de risque et priorité en fonction du contexte terrain fourni (commune, saison, historique des signalements).`;

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
        max_tokens: 800,
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
