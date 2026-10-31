import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { imageBase64, context } = await req.json();

  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'XAI_API_KEY non configuré' }, { status: 503 });
  }

  const prompt = `Tu es un expert en gestion des déchets à Abidjan, Côte d'Ivoire. Analyse cette photo d'un dépôt sauvage ou d'une accumulation de déchets.

Contexte : ${context || 'Signalement citoyen depuis Abidjan'}

Réponds UNIQUEMENT en JSON valide avec cette structure exacte :
{
  "objets": ["liste des objets visibles"],
  "materiaux": [
    { "nom": "plastique", "pourcentage": 45 },
    { "nom": "organique", "pourcentage": 30 }
  ],
  "volume_m3": 1.5,
  "poids_estime_kg": 200,
  "risque": "faible|moyen|élevé",
  "priorite": "basse|moyenne|haute",
  "resume": "Description courte en français (2 phrases max)"
}

Matériaux possibles : plastique, organique, carton, métal, verre, gravats, chimique, caoutchouc, bois, textile.
Risque = impact sanitaire/environnemental. Priorité = urgence d'intervention.`;

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
              { type: 'image_url', image_url: { url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}` } },
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

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: 'Réponse Grok invalide' }, { status: 502 });

    const analysis = JSON.parse(jsonMatch[0]);
    return NextResponse.json(analysis);
  } catch (e) {
    console.error('analyze error:', e);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
