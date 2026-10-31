'use client';
import { useState, useEffect } from 'react';
import { Eye } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { getReports, updateReport, formatDate } from '@/src/services/storage';
import type { Report } from '@/src/types';
import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false, loading: () => <div className="skeleton h-40 rounded-xl" /> });

const STATUS_OPTIONS = [{ value: 'reçu', label: 'Reçu' }, { value: 'en_cours', label: 'En cours' }, { value: 'traité', label: 'Traité' }];
const PRIORITY_COLORS  = { haute: 'error', moyenne: 'warning', basse: 'success' } as const;
const STATUS_COLORS    = { reçu: 'info', en_cours: 'warning', traité: 'success' } as const;
const PRIORITY_EMOJI   = { haute: '🔴', moyenne: '🟡', basse: '🟢' };

export default function SignalementsAdminPage() {
  const { toast } = useToast();
  const [reports,  setReports]  = useState<Report[]>([]);
  const [selected, setSelected] = useState<Report | null>(null);
  const [filter,   setFilter]   = useState('all');

  useEffect(() => { setReports(getReports()); }, []);

  function handleStatus(id: string, status: Report['status']) {
    updateReport(id, { status });
    setReports(getReports());
    if (selected?.id === id) setSelected(r => r ? { ...r, status } : r);
    toast(`Statut mis à jour : ${status}`, 'success');
  }

  const filtered = filter === 'all' ? reports : reports.filter(r => r.status === filter);

  return (
    <div className="space-y-5 max-w-7xl">
      <div>
        <h1 className="font-display text-2xl font-extrabold">📍 Signalements</h1>
        <p className="text-sm text-[#5C5C48]">{reports.length} signalement{reports.length > 1 ? 's' : ''} au total</p>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        {[{ value: 'all', label: 'Tous' }, ...STATUS_OPTIONS].map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${filter === f.value ? 'bg-[#2A7A3A] text-white' : 'bg-[#E8F5EA] text-[#2A7A3A] hover:bg-[#2A7A3A]/10'}`}>
            {f.label} ({f.value === 'all' ? reports.length : reports.filter(r => r.status === f.value).length})
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-5">
        {/* Liste */}
        <div className="lg:col-span-2 space-y-2">
          {filtered.map(r => (
            <button key={r.id} onClick={() => setSelected(r)}
              className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${selected?.id === r.id ? 'border-[#2A7A3A] bg-[#E8F5EA]/60' : 'border-[#DEDED0] bg-white hover:border-[#2A7A3A]/40'}`}>
              <div className="flex items-start gap-3">
                {/* Miniature photo */}
                {r.photoUrl ? (
                  <img src={r.photoUrl} alt="Photo dépôt" className="w-14 h-14 object-cover rounded-xl flex-shrink-0 border border-[#DEDED0]" />
                ) : (
                  <div className="w-14 h-14 bg-[#E8F5EA] rounded-xl flex items-center justify-center flex-shrink-0 text-2xl">📷</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    <span className="font-bold text-sm">{r.trackingNumber}</span>
                    <Badge variant={STATUS_COLORS[r.status]}>{r.status}</Badge>
                  </div>
                  <p className="text-xs text-[#5C5C48] truncate">{r.commune} · {r.address}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs">{PRIORITY_EMOJI[r.priority]}</span>
                    <span className="text-xs text-[#5C5C48]">Priorité {r.priority}</span>
                    <span className="text-xs text-[#DEDED0] mx-1">·</span>
                    <span className="text-xs text-[#5C5C48]">{formatDate(r.createdAt)}</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-[#5C5C48] text-sm">Aucun signalement pour ce filtre</div>
          )}
        </div>

        {/* Détail */}
        <div className="lg:col-span-3">
          {selected ? (
            <Card className="p-0 overflow-hidden sticky top-6">
              {/* Photo pleine largeur */}
              {selected.photoUrl ? (
                <div className="relative">
                  <img src={selected.photoUrl} alt="Photo du dépôt sauvage" className="w-full h-52 object-cover" />
                  <div className="absolute top-3 left-3 flex gap-2">
                    <Badge variant={STATUS_COLORS[selected.status]}>{selected.status}</Badge>
                    <Badge variant={PRIORITY_COLORS[selected.priority]}>Priorité {selected.priority}</Badge>
                  </div>
                </div>
              ) : (
                <div className="w-full h-32 bg-gradient-to-br from-[#E8F5EA] to-[#DEDED0] flex items-center justify-center text-5xl">🗑️</div>
              )}

              <div className="p-5 space-y-4">
                {/* Infos */}
                <div>
                  <h2 className="font-display text-xl font-extrabold text-[#16160F] mb-2">{selected.trackingNumber}</h2>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-[#5C5C48] text-xs">Commune</span><p className="font-semibold">{selected.commune}</p></div>
                    <div><span className="text-[#5C5C48] text-xs">Date</span><p className="font-semibold">{formatDate(selected.createdAt)}</p></div>
                    <div className="col-span-2"><span className="text-[#5C5C48] text-xs">Adresse</span><p className="font-semibold">{selected.address}</p></div>
                    {selected.anonymous && <div className="col-span-2"><p className="text-xs text-[#5C5C48] italic">Signalement anonyme</p></div>}
                  </div>
                </div>

                {/* Carte mini — position du signalement */}
                <div>
                  <p className="text-xs font-bold text-[#5C5C48] mb-1.5">📍 Localisation GPS</p>
                  <MapView
                    reports={[selected]}
                    height={160}
                    center={[selected.latitude, selected.longitude]}
                    zoom={14}
                  />
                  <p className="text-xs text-[#5C5C48] mt-1">{selected.latitude.toFixed(5)}, {selected.longitude.toFixed(5)}</p>
                </div>

                {/* Analyse IA */}
                {selected.analysis && (
                  <div className="rounded-2xl bg-[#E8F5EA] p-4 space-y-2">
                    <p className="font-bold text-sm text-[#2A7A3A]">🤖 Analyse IA — Snowflake Cortex</p>
                    <p className="text-sm">{selected.analysis.resume}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                      <div className="bg-white rounded-xl p-2 text-center">
                        <p className="text-[#5C5C48]">Volume</p>
                        <p className="font-bold text-[#16160F]">{selected.analysis.volume_m3} m³</p>
                      </div>
                      <div className="bg-white rounded-xl p-2 text-center">
                        <p className="text-[#5C5C48]">Poids estimé</p>
                        <p className="font-bold text-[#16160F]">{selected.analysis.poids_estime_kg} kg</p>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {selected.analysis.materiaux.map(m => (
                        <div key={m.nom} className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-white rounded-full overflow-hidden">
                            <div className="h-full bg-[#2A7A3A] rounded-full" style={{ width: `${m.pourcentage}%` }} />
                          </div>
                          <span className="text-xs w-28 text-right capitalize font-medium">{m.nom} {m.pourcentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Changer statut */}
                <div>
                  <p className="text-xs font-bold text-[#5C5C48] mb-2">Changer le statut</p>
                  <div className="flex gap-2 flex-wrap">
                    {STATUS_OPTIONS.map(s => (
                      <Button key={s.value} size="sm"
                        variant={selected.status === s.value ? 'default' : 'outline'}
                        onClick={() => handleStatus(selected.id, s.value as Report['status'])}>
                        {s.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <div className="flex items-center justify-center h-64 text-[#5C5C48] text-sm rounded-2xl border-2 border-dashed border-[#DEDED0]">
              <div className="text-center">
                <div className="text-4xl mb-2">👆</div>
                Sélectionnez un signalement pour voir les détails
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
