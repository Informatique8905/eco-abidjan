'use client';
import { useState } from 'react';
import { BarChart3, Play, Loader } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { runSimulation, DEFAULT_PARAMS } from '@/src/services/simulation';
import { formatFCFA } from '@/src/services/storage';
import type { SimulationParams, SimulationResult } from '@/src/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function SimulationPage() {
  const [params, setParams] = useState<SimulationParams>({ ...DEFAULT_PARAMS });
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [running, setRunning] = useState(false);

  async function handleRun() {
    setRunning(true);
    await new Promise(r => setTimeout(r, 1000));
    setResult(runSimulation(params));
    setRunning(false);
  }

  function setP<K extends keyof SimulationParams>(k: K, v: SimulationParams[K]) {
    setParams(p => ({ ...p, [k]: v }));
  }

  const barData = result ? Object.entries(result.byCommune).map(([commune, d]) => ({ commune, kg: d.totalKg, remu: d.remuneration })) : [];

  return (
    <div className="space-y-6 max-w-5xl">
      <h1 className="text-2xl font-bold">Simulation</h1>
      <p className="text-[#5C5C48] text-sm">Modifiez les paramètres et lancez la simulation pour voir les résultats projetés.</p>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Parameters */}
        <Card>
          <CardHeader><CardTitle>Paramètres</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: 'Ménages', key: 'households', min: 50, max: 5000, step: 50 },
              { label: 'Commerçants', key: 'merchants', min: 10, max: 2000, step: 10 },
              { label: 'Taille ménage (pers.)', key: 'householdSize', min: 1, max: 20, step: 1 },
              { label: 'kg/pers./jour', key: 'kgPerPersonPerDay', min: 0.1, max: 3, step: 0.1 },
              { label: 'Taux participation (%)', key: 'participationRate', min: 0.1, max: 1, step: 0.05 },
              { label: 'Part triés (%)', key: 'sortedRate', min: 0, max: 1, step: 0.05 },
              { label: 'Jours', key: 'days', min: 7, max: 365, step: 7 },
            ].map(p => (
              <div key={p.key}>
                <label className="text-sm font-medium text-[#16160F] flex justify-between">
                  <span>{p.label}</span>
                  <span className="text-[#2A7A3A] font-semibold">
                    {p.key === 'participationRate' || p.key === 'sortedRate'
                      ? `${Math.round((params[p.key as keyof SimulationParams] as number) * 100)}%`
                      : params[p.key as keyof SimulationParams]}
                  </span>
                </label>
                <input
                  type="range"
                  min={p.min} max={p.max} step={p.step}
                  value={params[p.key as keyof SimulationParams] as number}
                  onChange={e => setP(p.key as keyof SimulationParams, +e.target.value as any)}
                  className="w-full mt-1 accent-[#2A7A3A]"
                  aria-label={p.label}
                />
              </div>
            ))}
            <Button onClick={handleRun} className="w-full" disabled={running}>
              {running ? <><Loader className="w-4 h-4 mr-2 animate-spin" />Simulation…</> : <><Play className="w-4 h-4 mr-2" />Lancer la simulation</>}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <div className="space-y-4">
            <Card className="p-5 bg-[#2A7A3A] text-white">
              <h3 className="font-bold text-lg mb-3">Résultats – {params.days} jours</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="opacity-70 text-xs">Tonnage total</p><p className="font-bold text-xl">{result.totals.kg.toLocaleString('fr-FR')} kg</p></div>
                <div><p className="opacity-70 text-xs">Rémunérations</p><p className="font-bold text-xl">{formatFCFA(result.totals.remuneration)}</p></div>
                <div><p className="opacity-70 text-xs">Points distribués</p><p className="font-bold">{result.totals.points.toLocaleString('fr-FR')}</p></div>
                <div><p className="opacity-70 text-xs">Coût collecte</p><p className="font-bold">{formatFCFA(result.totals.collectionCost)}</p></div>
                <div><p className="opacity-70 text-xs">Coût évité (État)</p><p className="font-bold">{formatFCFA(result.totals.savedCost)}</p></div>
                <div><p className="opacity-70 text-xs">Bilan net</p><p className={`font-bold ${result.totals.netBalance >= 0 ? 'text-green-200' : 'text-red-200'}`}>{formatFCFA(result.totals.netBalance)}</p></div>
              </div>
            </Card>

            <Card>
              <CardHeader><CardTitle>Par commune</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#DEDED0" />
                    <XAxis dataKey="commune" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: any, n: any) => [n === 'remu' ? formatFCFA(v) : `${v} kg`, n === 'kg' ? 'Tonnage' : 'Rémunération']} />
                    <Bar dataKey="kg" fill="#2A7A3A" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="overflow-x-auto rounded-xl border border-[#DEDED0]">
              <table className="w-full text-xs">
                <thead className="bg-[#0A2010] text-white">
                  <tr>{['Commune','Ménages','Commerçants','Tonnage','Rémunération','Coût évité'].map(h => <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {Object.entries(result.byCommune).map(([c, d]) => (
                    <tr key={c} className="border-t border-[#DEDED0]">
                      <td className="px-3 py-2 font-medium">{c}</td>
                      <td className="px-3 py-2">{d.households}</td>
                      <td className="px-3 py-2">{d.merchants}</td>
                      <td className="px-3 py-2">{d.totalKg.toLocaleString('fr-FR')} kg</td>
                      <td className="px-3 py-2 text-[#2A7A3A]">{formatFCFA(d.remuneration)}</td>
                      <td className="px-3 py-2">{formatFCFA(d.savedCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!result && (
          <div className="flex items-center justify-center text-[#5C5C48] text-sm">
            <div className="text-center"><BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>Lancez la simulation pour voir les résultats</p></div>
          </div>
        )}
      </div>
    </div>
  );
}
