'use client';
import { useState, useEffect } from 'react';
import { Truck, Loader, CheckCircle, BarChart3 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { getDeclarations, getTours, addTour, formatDate, formatFCFA, getPricing } from '@/src/services/storage';
import { planRoute } from '@/src/services/ia';
import type { CollectionTour, Declaration } from '@/src/types';

export default function CollectesPage() {
  const { toast } = useToast();
  const [declarations, setDeclarations] = useState<Declaration[]>([]);
  const [tours, setTours] = useState<CollectionTour[]>([]);
  const [planning, setPlanning] = useState(false);
  const [lastRoute, setLastRoute] = useState<any>(null);

  useEffect(() => {
    setDeclarations(getDeclarations().filter(d => d.isLargeVolume));
    setTours(getTours());
  }, []);

  async function handlePlanTour() {
    const pending = declarations.filter(d => d.status === 'en_attente');
    if (pending.length === 0) { toast('Aucune demande en attente.', 'info'); return; }
    setPlanning(true);
    await new Promise(r => setTimeout(r, 1200));
    const stops = pending.map(d => ({ id: d.id, address: d.commune, latitude: 5.35 + (Math.random() - 0.5) * 0.1, longitude: -4.02 + (Math.random() - 0.5) * 0.1, weightKg: d.totalWeightKg }));
    const route = planRoute(stops);
    const pricing = getPricing();
    const cost = Math.round(route.totalDistanceKm * pricing.collection_cost_per_km + pricing.collection_cost_per_tour);
    const tour = addTour({
      date: new Date().toISOString().slice(0, 10),
      communes: [...new Set(pending.map(d => d.commune))],
      stops: route.stops.map((s, i) => ({ order: i + 1, declarationId: s.id, userId: pending.find(d => d.id === s.id)?.userId ?? '', address: s.address, latitude: s.latitude, longitude: s.longitude, weightKg: s.weightKg, commune: s.address as any })),
      totalWeightKg: pending.reduce((a, b) => a + b.totalWeightKg, 0),
      totalDistanceKm: route.totalDistanceKm,
      estimatedDurationMin: route.estimatedDurationMin,
      estimatedCostFCFA: cost,
      optimizedByAI: true,
      status: 'planifiée',
    });
    setTours(getTours());
    setLastRoute({ ...route, cost, savings: route.savingsKm });
    setPlanning(false);
    toast(`Tournée planifiée ! ${route.stops.length} arrêts · ${route.totalDistanceKm} km`, 'success');
  }

  const STATUS_COLORS = { planifiée: 'info', en_cours: 'warning', terminée: 'success' } as const;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Collectes & Tournées</h1>
        <Button onClick={handlePlanTour} disabled={planning}>
          {planning ? <><Loader className="w-4 h-4 mr-2 animate-spin" />Planification IA…</> : <><BarChart3 className="w-4 h-4 mr-2" />Planifier avec l'IA</>}
        </Button>
      </div>

      {/* Pending large volume declarations */}
      <Card>
        <CardHeader><CardTitle>Demandes de collecte ({declarations.filter(d => d.status === 'en_attente').length} en attente)</CardTitle></CardHeader>
        <CardContent>
          {declarations.length === 0 ? (
            <p className="text-sm text-[#5C5C48] text-center py-4">Aucune demande de collecte</p>
          ) : (
            <div className="space-y-3">
              {declarations.map(d => (
                <div key={d.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-[#DEDED0]">
                  <div>
                    <p className="font-semibold text-sm">{d.commune} · {d.totalWeightKg} kg</p>
                    <p className="text-xs text-[#5C5C48]">{formatDate(d.createdAt)} · Créneau : {d.collectionSlot}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={(STATUS_COLORS as any)[d.status] ?? 'outline'}>{d.status}</Badge>
                    <span className="text-sm font-semibold text-[#2A7A3A]">{formatFCFA(d.totalValue)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI route result */}
      {lastRoute && (
        <Card className="border-[#2A7A3A]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#2A7A3A]">
              <CheckCircle className="w-5 h-5" />Tournée optimisée par l'IA
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><p className="text-[#5C5C48] text-xs">Arrêts</p><p className="font-bold text-lg">{lastRoute.stops.length}</p></div>
            <div><p className="text-[#5C5C48] text-xs">Distance</p><p className="font-bold text-lg">{lastRoute.totalDistanceKm} km</p></div>
            <div><p className="text-[#5C5C48] text-xs">Durée estimée</p><p className="font-bold text-lg">{lastRoute.estimatedDurationMin} min</p></div>
            <div><p className="text-[#5C5C48] text-xs">Coût estimé</p><p className="font-bold text-lg text-[#2A7A3A]">{formatFCFA(lastRoute.cost)}</p></div>
            {lastRoute.savings > 0 && <div className="col-span-2 md:col-span-4"><p className="text-xs text-[#2A7A3A]">Économie vs ordre initial : {lastRoute.savings} km ({Math.round(lastRoute.savings * 400)} FCFA)</p></div>}
          </CardContent>
        </Card>
      )}

      {/* Existing tours */}
      <div>
        <h2 className="font-semibold mb-3">Tournées planifiées</h2>
        <div className="space-y-3">
          {tours.map(t => (
            <Card key={t.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Truck className="w-4 h-4 text-[#2A7A3A]" />
                    <span className="font-semibold text-sm">{t.date} · {t.communes.join(', ')}</span>
                    <Badge variant={(STATUS_COLORS as any)[t.status] ?? 'outline'}>{t.status}</Badge>
                    {t.optimizedByAI && <Badge variant="info">IA</Badge>}
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-xs text-[#5C5C48] mt-2">
                    <span>{t.stops.length} arrêts</span>
                    <span>{t.totalWeightKg} kg</span>
                    <span>{t.totalDistanceKm} km</span>
                  </div>
                </div>
                <span className="text-sm font-semibold text-[#2A7A3A]">{formatFCFA(t.estimatedCostFCFA)}</span>
              </div>
              {t.stops.length > 0 && (
                <div className="mt-3 space-y-1">
                  {t.stops.map(s => (
                    <div key={s.order} className="flex items-center gap-2 text-xs text-[#5C5C48]">
                      <span className="w-5 h-5 bg-[#E8F5EA] rounded-full text-[#2A7A3A] font-bold flex items-center justify-center text-[10px]">{s.order}</span>
                      <span>{s.address} · {s.weightKg} kg</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
          {tours.length === 0 && <p className="text-sm text-[#5C5C48] text-center py-6">Aucune tournée planifiée</p>}
        </div>
      </div>
    </div>
  );
}
