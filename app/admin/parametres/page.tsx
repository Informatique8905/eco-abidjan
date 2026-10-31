'use client';
import { useState } from 'react';
import { Settings, Save, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { getPricing, updatePricing, resetStore } from '@/src/services/storage';
import type { PricingConfig } from '@/src/types';

export default function ParametresPage() {
  const { toast } = useToast();
  const [pricing, setPricing] = useState<PricingConfig>(getPricing());
  const [saved, setSaved] = useState(false);

  function setP<K extends keyof PricingConfig>(k: K, v: number) {
    setPricing(p => ({ ...p, [k]: v }));
    setSaved(false);
  }

  function handleSave() {
    updatePricing(pricing);
    setSaved(true);
    toast('Paramètres enregistrés. Les indicateurs sont recalculés.', 'success');
  }

  const PRICE_FIELDS: { key: keyof PricingConfig; label: string; unit: string }[] = [
    { key: 'plastique_pet_sorted', label: 'PET trié', unit: 'F/kg' },
    { key: 'plastique_pet_unsorted', label: 'PET non trié', unit: 'F/kg' },
    { key: 'plastique_pehd_sorted', label: 'PEHD trié', unit: 'F/kg' },
    { key: 'aluminium_sorted', label: 'Aluminium trié', unit: 'F/kg' },
    { key: 'aluminium_unsorted', label: 'Aluminium non trié', unit: 'F/kg' },
    { key: 'carton_sorted', label: 'Carton trié', unit: 'F/kg' },
    { key: 'papier_sorted', label: 'Papier trié', unit: 'F/kg' },
    { key: 'threshold_kg', label: 'Seuil Y (collecte directe)', unit: 'kg' },
    { key: 'points_per_fcfa', label: 'Points par FCFA', unit: 'pts/F' },
    { key: 'points_to_fcfa', label: '1 point vaut', unit: 'FCFA' },
    { key: 'collection_cost_per_km', label: 'Coût collecte/km', unit: 'F/km' },
    { key: 'collection_cost_per_tour', label: 'Coût fixe/tournée', unit: 'FCFA' },
    { key: 'state_cost_per_kg', label: 'Coût État/kg évité', unit: 'F/kg' },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Paramètres</h1>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => { resetStore(); window.location.reload(); }}>
            <RotateCcw className="w-4 h-4 mr-2" />Réinitialiser démo
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />Enregistrer
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Settings className="w-4 h-4" />Grille de prix et seuils</CardTitle></CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {PRICE_FIELDS.map(f => (
              <div key={f.key}>
                <label className="text-sm font-medium text-[#16160F] flex justify-between mb-1">
                  <span>{f.label}</span>
                  <span className="text-[#2A7A3A] font-semibold">{pricing[f.key]} {f.unit}</span>
                </label>
                <input
                  type="number"
                  min={0}
                  step={f.unit.includes('kg') ? 1 : 0.01}
                  value={pricing[f.key] as number}
                  onChange={e => setP(f.key, +e.target.value)}
                  className="w-full h-10 border border-[#DEDED0] rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2A7A3A]"
                />
              </div>
            ))}
          </div>
          {saved && <p className="text-xs text-[#2A7A3A] mt-4 flex items-center gap-1">Paramètres enregistrés · Les calculs sont mis à jour en temps réel</p>}
        </CardContent>
      </Card>
    </div>
  );
}
