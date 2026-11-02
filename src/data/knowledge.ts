/**
 * Base de connaissance EcoAbidjan — injectée dans le prompt Grok (RAG)
 * Sources : ANAGED, ONAD, Mairie d'Abidjan, données terrain
 */

export const COMMUNE_RISK_ZONES: Record<string, string> = {
  Abobo:       'Zone à forte densité, risque inondation en saison des pluies (mai–juillet). Caniveaux souvent obstrués par les plastiques.',
  Adjamé:      'Zone commerciale dense, fort volume de cartons/emballages. Marché Adjamé : point névralgique de dépôts sauvages.',
  Attécoubé:   'Zone résidentielle populaire, dépôts fréquents en bordure de lagune.',
  Cocody:      'Zone résidentielle aisée, dépôts principalement gravats/déchets verts. Faible risque sanitaire.',
  Koumassi:    'Zone industrielle + résidentielle. Risque déchets toxiques (huiles, batteries) près des ateliers.',
  Marcory:     'Zone mixte, dépôts fréquents autour du marché Marcory. Risque moyen.',
  Plateau:     'Centre des affaires, déchets majoritairement bureautiques (papier, carton). Nettoyage rapide.',
  'Port-Bouët':'Zone portuaire + aéroportuaire. Risque déchets industriels/chimiques. Intervention prioritaire.',
  Treichville: 'Zone très dense, marché de poissons → déchets organiques à forte odeur. Intervention urgente recommandée.',
  Yopougon:    'Plus grande commune d\'Abidjan (1,5M hab). Volume très élevé, dépôts sauvages structurels. 3 décharges informelles recensées.',
  Anyama:      'Périphérie nord, dépôts gravats fréquents liés à la construction.',
  Bingerville: 'Zone résidentielle calme, faible volume, dépôts verts et ménagers.',
  Songon:      'Zone périurbaine, accès difficile pour la collecte. Dépôts anciens et volumineux.',
};

export const WASTE_KNOWLEDGE = `
## Contexte déchets Abidjan (ANAGED / ONAD 2025)

### Production de déchets
- Abidjan produit ~4 500 tonnes de déchets par jour
- Taux de collecte officiel : ~60% (40% en dépôts sauvages)
- Communes les plus touchées : Yopougon, Abobo, Adjamé, Treichville

### Types de déchets et risques sanitaires
- **Plastiques (PET, PEHD, PP)** : risque faible à moyen, valorisables. Coliba Africa et Recyplast achètent à 40–100 F/kg
- **Matières organiques** : risque élevé (odeurs, moustiques, paludisme). Intervention sous 48h recommandée
- **Déchets chimiques/toxiques** (huiles, peintures, batteries) : risque très élevé, contamination sols et nappes phréatiques
- **Gravats** : risque faible sanitaire, fort encombrement. Occupation illégale voie publique
- **Carton/papier** : recyclable, faible risque. Priorité basse sauf volume élevé
- **Caoutchouc/pneus** : risque moyen-élevé (gîtes à moustiques, incendie)

### Saisonnalité
- **Saison des pluies (mai–juillet, oct–nov)** : risque inondation multiplié x3, déchets organiques critiques
- **Saison sèche (déc–mars)** : risque incendie (pneus, plastiques)

### Partenaires de collecte Abidjan
- Coliba Africa : plastiques PET/PEHD, Cocody/Plateau
- Recyplast CI : plastiques mixtes, Yopougon/Abobo
- TIP SARL : déchets industriels
- Envipur : déchets toxiques/chimiques (intervention urgente)
- SOCOREMF-CI : métaux ferreux et non ferreux

### Coûts de collecte estimés
- Camion benne 10T : ~45 000 F/tournée
- Coût évité par recyclage : ~15 000 F/tonne
- Amende dépôt sauvage : 100 000 à 500 000 F CFA (loi 2013)
`;

export const SEASONAL_CONTEXT = (): string => {
  const month = new Date().getMonth() + 1; // 1-12
  if ([5, 6, 7].includes(month)) return 'SAISON DES PLUIES (mai-juillet) : risques inondation et propagation élevés. Urgence x2 pour déchets organiques et plastiques obstruant caniveaux.';
  if ([10, 11].includes(month)) return 'PETITE SAISON DES PLUIES (oct-nov) : vigilance caniveaux. Risque sanitaire accru.';
  if ([12, 1, 2, 3].includes(month)) return 'SAISON SÈCHE : risque incendie pour pneus et plastiques. Chaleur accélère dégradation matières organiques.';
  return 'PÉRIODE INTERMÉDIAIRE : conditions météo normales.';
};
