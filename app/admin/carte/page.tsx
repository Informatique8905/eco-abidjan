'use client';
import { useEffect, useState } from 'react';
import { Map } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getReports, getRelayPoints } from '@/src/services/storage';
import type { Report, RelayPoint } from '@/src/types';
import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false, loading: () => <div className="skeleton h-96 rounded-xl" /> });

export default function CartePage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [relays, setRelays] = useState<RelayPoint[]>([]);

  useEffect(() => {
    setReports(getReports());
    setRelays(getRelayPoints());
  }, []);

  return (
    <div className="space-y-4 max-w-6xl">
      <h1 className="text-2xl font-bold">Carte</h1>
      <div className="flex gap-3 text-xs flex-wrap">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-[#E05A1A]" />Signalement (Priorité haute)</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-yellow-400" />Signalement (En cours)</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-[#2A7A3A]" />Signalement (Traité)</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-500" />Point relais</div>
      </div>
      <MapView reports={reports} relays={relays} height={500} />
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-2">Signalements ({reports.length})</h3>
          <div className="space-y-2">
            {reports.map(r => (
              <div key={r.id} className="flex items-center justify-between text-xs">
                <span className="text-[#5C5C48] truncate flex-1">{r.trackingNumber} · {r.commune}</span>
                <Badge variant={r.status === 'reçu' ? 'info' : r.status === 'en_cours' ? 'warning' : 'success'}>{r.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-2">Points relais ({relays.length})</h3>
          <div className="space-y-2">
            {relays.map(r => (
              <div key={r.id} className="flex items-center justify-between text-xs">
                <span className="text-[#5C5C48] truncate flex-1">{r.name}</span>
                <span className="text-[#2A7A3A] font-medium">{Math.round((r.currentLoadKg / r.capacityKg) * 100)}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
