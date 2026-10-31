'use client';
import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getRelayPoints } from '@/src/services/storage';
import type { RelayPoint } from '@/src/types';

export default function PointsRelaisAdminPage() {
  const [relays, setRelays] = useState<RelayPoint[]>([]);
  useEffect(() => { setRelays(getRelayPoints()); }, []);

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold">Points Relais ({relays.length})</h1>
      <div className="grid md:grid-cols-2 gap-4">
        {relays.map(r => {
          const pct = Math.round((r.currentLoadKg / r.capacityKg) * 100);
          return (
            <Card key={r.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-[#E8F5EA] rounded-xl flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-[#2A7A3A]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm">{r.name}</p>
                    <Badge variant={r.isActive ? 'success' : 'error'}>{r.isActive ? 'Actif' : 'Inactif'}</Badge>
                  </div>
                  <p className="text-xs text-[#5C5C48]">{r.commune} · {r.address}</p>
                  <p className="text-xs text-[#5C5C48]">{r.hours}</p>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#5C5C48]">Remplissage</span>
                      <span className={pct > 80 ? 'text-[#E05A1A] font-semibold' : 'text-[#5C5C48]'}>{r.currentLoadKg} / {r.capacityKg} kg ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-[#DEDED0] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${pct > 80 ? 'bg-[#E05A1A]' : 'bg-[#2A7A3A]'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
