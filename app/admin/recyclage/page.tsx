'use client';
import { useEffect, useState } from 'react';
import { getDeclarations, formatDate, formatFCFA } from '@/src/services/storage';
import { WASTE_LABELS } from '@/src/data/seed';
import { Badge } from '@/components/ui/badge';
import type { Declaration } from '@/src/types';

const STATUS_COLORS = { en_attente: 'info', déposé: 'success', collecté: 'success', payé: 'success' } as const;

export default function RecyclagePage() {
  const [declarations, setDeclarations] = useState<Declaration[]>([]);
  useEffect(() => { setDeclarations(getDeclarations()); }, []);
  const totalRemu = declarations.filter(d => d.isLargeVolume).reduce((a, b) => a + b.totalValue, 0);
  const totalPoints = declarations.filter(d => !d.isLargeVolume).reduce((a, b) => a + b.pointsEarned, 0);

  return (
    <div className="space-y-6 max-w-5xl">
      <h1 className="text-2xl font-bold">Recyclage</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Déclarations', value: declarations.length },
          { label: 'Gros volumes', value: declarations.filter(d => d.isLargeVolume).length },
          { label: 'Rémunérations', value: formatFCFA(totalRemu) },
          { label: 'Points distribués', value: totalPoints.toLocaleString('fr-FR') },
        ].map(s => (
          <div key={s.label} className="bg-white border border-[#DEDED0] rounded-xl p-4">
            <p className="text-xs text-[#5C5C48]">{s.label}</p>
            <p className="text-xl font-bold text-[#2A7A3A] mt-1">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#DEDED0]">
        <table className="w-full text-sm">
          <thead className="bg-[#0A2010] text-white">
            <tr>{['Date', 'Commune', 'Matières', 'Poids', 'Type', 'Valeur/Points', 'Statut'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {declarations.map(d => (
              <tr key={d.id} className="border-t border-[#DEDED0] hover:bg-gray-50">
                <td className="px-4 py-3 text-xs text-[#5C5C48]">{formatDate(d.createdAt)}</td>
                <td className="px-4 py-3">{d.commune}</td>
                <td className="px-4 py-3 text-xs text-[#5C5C48] max-w-32 truncate">{d.items.map(i => WASTE_LABELS[i.type]).join(', ')}</td>
                <td className="px-4 py-3">{d.totalWeightKg.toFixed(1)} kg</td>
                <td className="px-4 py-3"><Badge variant={d.isLargeVolume ? 'warning' : 'info'}>{d.isLargeVolume ? 'Collecte' : 'Relais'}</Badge></td>
                <td className="px-4 py-3 font-semibold text-[#2A7A3A]">{d.isLargeVolume ? formatFCFA(d.totalValue) : `${d.pointsEarned} pts`}</td>
                <td className="px-4 py-3"><Badge variant={(STATUS_COLORS as any)[d.status] ?? 'outline'}>{d.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
