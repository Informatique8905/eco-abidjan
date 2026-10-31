'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { RefreshCw, MapPin, Loader, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { QRCodeSVG } from 'qrcode.react';
import {
  getCurrentUser, addDeclaration, getRelayPoints,
  calcDeclarationValue, generateQRCode, getPricing, formatFCFA
} from '@/src/services/storage';
import { WASTE_LABELS } from '@/src/data/seed';
import type { WasteItem, WasteType } from '@/src/types';
import { api } from '@/src/services/api';

const MATS: { type: WasteType; emoji: string; label: string }[] = [
  { type: 'carton',          emoji: '📦', label: 'Carton' },
  { type: 'plastique_pet',   emoji: '🧴', label: 'Bouteilles PET' },
  { type: 'aluminium',       emoji: '🥫', label: 'Canettes alu' },
  { type: 'plastique_pehd',  emoji: '🪣', label: 'Bidons PEHD' },
  { type: 'plastique_pp',    emoji: '🪣', label: 'Bouchons / Seaux' },
  { type: 'sachets',         emoji: '🛍️', label: 'Sachets / Films' },
  { type: 'papier',          emoji: '📄', label: 'Papier blanc' },
];

const PAYMENT_METHODS = [
  { value: 'orange_money', label: 'Orange Money' },
  { value: 'mtn_momo',     label: 'MTN MoMo' },
  { value: 'moov',         label: 'Moov Money' },
  { value: 'wave',         label: 'Wave' },
];

const SLOTS = [
  '31/10/2026 à 08h–12h',
  '31/10/2026 à 13h–17h',
  '01/11/2026 à 08h–12h',
  '01/11/2026 à 13h–17h',
];

function Stepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const btn = "grid h-11 w-11 place-items-center rounded-full bg-[#E8F5EA] text-xl font-bold text-[#2A7A3A] active:scale-90 transition-transform select-none";
  return (
    <div className="flex items-center gap-3">
      <button type="button" className={btn} onClick={() => onChange(Math.max(0, value - 1))} aria-label="Moins un kg">−</button>
      <span className="w-20 text-center font-display text-2xl font-extrabold text-[#16160F]">{value} kg</span>
      <button type="button" className={btn} onClick={() => onChange(value + 1)} aria-label="Plus un kg">+</button>
    </div>
  );
}

type Done =
  | { kind: 'paiement'; amount: number; slot: string; paymentLabel: string }
  | { kind: 'points'; points: number; qrCode: string; relayName: string; before?: number; after?: number };

export default function RecyclerPage() {
  const { toast } = useToast();
  const user = getCurrentUser();
  const pricing = getPricing();
  const relays = getRelayPoints().filter(r => r.isActive);

  const [sorted, setSorted] = useState<boolean | null>(null);
  const [kg, setKg]         = useState<Record<WasteType, number>>({} as Record<WasteType, number>);
  const [paymentMethod, setPaymentMethod] = useState('orange_money');
  const [slot, setSlot]     = useState(SLOTS[0]);
  const [declaring, setDeclaring] = useState(false);
  const [done, setDone]     = useState<Done | null>(null);
  const [balance, setBalance] = useState(user?.points ?? 0);

  useEffect(() => { if (user) setBalance(user.points); }, []);

  const nearestRelay = relays.find(r => r.commune === user?.commune) ?? relays[0];

  // Build items from kg state (only non-zero)
  const items: WasteItem[] = (Object.entries(kg) as [WasteType, number][])
    .filter(([, v]) => v > 0)
    .map(([type, weightKg]) => ({ type, weightKg, sorted: sorted ?? true }));

  const calc       = calcDeclarationValue(items);
  const totalKg    = items.reduce((a, b) => a + b.weightKg, 0);
  const isLarge    = totalKg >= pricing.threshold_kg;

  const card = "rounded-2xl border-2 border-[#DEDED0] bg-white p-5";

  // ── Gate: not logged in ──────────────────────────────────────────
  if (!user) {
    return (
      <main className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">♻️</div>
        <h1 className="font-display text-3xl font-extrabold text-[#2A7A3A] mb-3">Vos déchets valent de l'argent</h1>
        <p className="text-[#5C5C48] text-sm mb-8">Connectez-vous pour déclarer vos déchets et recevoir votre rémunération ou vos points.</p>
        <div className="flex flex-col gap-3">
          <Button asChild className="shadow-glow">
            <Link href="/connexion?redirect=/recycler">Se connecter</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/inscription">Créer un compte</Link>
          </Button>
        </div>
      </main>
    );
  }

  // ── Result: paiement direct ──────────────────────────────────────
  if (done?.kind === 'paiement') {
    return (
      <main className="max-w-xl mx-auto space-y-4 px-4 py-10 mb-nav">
        <div className={card + ' text-center'}>
          <div className="text-6xl mb-2">💰</div>
          <h1 className="font-display text-4xl font-extrabold text-[#2A7A3A]">{formatFCFA(done.amount)}</h1>
          <p className="text-[#5C5C48] text-sm mt-2">
            Un collecteur passe chez vous le <strong>{done.slot}</strong>.<br />
            Paiement par <strong>{done.paymentLabel}</strong> à l'enlèvement.
          </p>
        </div>
        <div className="rounded-2xl bg-[#E8F5EA] border border-[#2A7A3A]/20 p-4 text-center">
          <p className="text-sm font-bold text-[#2A7A3A]">✅ Collecte planifiée</p>
          <p className="text-xs text-[#5C5C48] mt-1">Visible dans votre historique et par l'admin pour organisation de tournée.</p>
        </div>
        <button onClick={() => { setDone(null); setSorted(null); setKg({} as Record<WasteType, number>); }}
          className="w-full rounded-2xl border-2 border-[#2A7A3A] py-3 font-bold text-[#2A7A3A] hover:bg-[#E8F5EA] transition-colors">
          Nouvelle déclaration
        </button>
      </main>
    );
  }

  // ── Result: points + QR code ─────────────────────────────────────
  if (done?.kind === 'points') {
    function simulateScan() {
      if (done?.kind !== 'points') return;
      const before = balance;
      const after  = before + done.points;
      setBalance(after);
      setDone({ ...done, before, after });
      toast(`+${done.points} points crédités 🎉`, 'success');
    }

    return (
      <main className="max-w-xl mx-auto space-y-4 px-4 py-10 mb-nav">
        <div className={card + ' text-center'}>
          <p className="text-[#5C5C48] font-semibold mb-1">Rendez-vous au point relais</p>
          <h1 className="font-display text-2xl font-extrabold text-[#2A7A3A]">🏪 {done.relayName}</h1>
          <p className="text-sm text-[#5C5C48] mt-4 mb-2">Montrez ce code au magasin :</p>
          {/* Dark code badge like the reference */}
          <div className="mx-auto my-3 w-fit rounded-2xl bg-[#16160F] px-6 py-4 font-mono text-3xl font-bold tracking-widest text-white">
            {done.qrCode}
          </div>
          <div className="flex justify-center mt-3">
            <div className="p-3 bg-white border-2 border-[#DEDED0] rounded-xl">
              <QRCodeSVG value={done.qrCode} size={120} fgColor="#16160F" />
            </div>
          </div>
          <p className="text-sm mt-3">À gagner : <strong className="text-[#2A7A3A]">{done.points} points</strong></p>
        </div>

        {/* Before/after — apparaît après le scan */}
        {done.after === undefined ? (
          <button onClick={simulateScan}
            className="w-full rounded-2xl bg-[#2A7A3A] py-4 text-lg font-bold text-white shadow-glow active:scale-95 transition-transform">
            🏪 Le magasin scanne mon code (démo)
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-2xl bg-[#E8F5EA] border border-[#DEDED0] p-4">
              <p className="text-xs text-[#5C5C48] mb-1">Avant</p>
              <p className="font-display text-3xl font-extrabold text-[#16160F]">{done.before}</p>
              <p className="text-xs text-[#5C5C48]">points</p>
            </div>
            <div className="rounded-2xl bg-[#2A7A3A] p-4 text-white">
              <p className="text-xs opacity-80 mb-1">Après</p>
              <p className="font-display text-3xl font-extrabold">{done.after} 🌱</p>
              <p className="text-xs opacity-80">points</p>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-[#5C5C48]">
          100 points = 1 000 F en bon d'achat dans les supermarchés partenaires.
        </p>
        <button onClick={() => { setDone(null); setSorted(null); setKg({} as Record<WasteType, number>); }}
          className="w-full rounded-2xl border-2 border-[#2A7A3A] py-3 font-bold text-[#2A7A3A] hover:bg-[#E8F5EA] transition-colors">
          Nouvelle déclaration
        </button>
      </main>
    );
  }

  // ── Main form (inline sections) ──────────────────────────────────
  async function handleDeclare() {
    if (items.length === 0) { toast('Veuillez indiquer au moins un type de déchet.', 'error'); return; }
    setDeclaring(true);
    await new Promise(r => setTimeout(r, 800));
    const qr = generateQRCode();
    const decl = addDeclaration({
      userId: user!.id,
      items,
      totalWeightKg: totalKg,
      totalValue: calc.total,
      pointsEarned: isLarge ? 0 : calc.points,
      isLargeVolume: isLarge,
      status: 'en_attente',
      paymentMethod: isLarge ? paymentMethod as any : undefined,
      collectionSlot: isLarge ? slot : undefined,
      relayPointId: !isLarge ? nearestRelay?.id : undefined,
      commune: user!.commune,
      qrCode: qr,
    });
    setDeclaring(false);

    if (isLarge) {
      setDone({ kind: 'paiement', amount: calc.total, slot, paymentLabel: PAYMENT_METHODS.find(m => m.value === paymentMethod)?.label ?? paymentMethod });
    } else {
      setDone({ kind: 'points', points: calc.points, qrCode: qr, relayName: nearestRelay?.name ?? 'Point relais' });
    }
    toast('Déclaration enregistrée !', 'success');

    // Sync backend best-effort
    if (user) {
      api.createDeclaration({
        userId: user.id,
        material: items.map(i => i.type).join(',').toUpperCase(),
        weightKg: totalKg,
      }).catch(() => {});
    }
  }

  return (
    <main className="max-w-xl mx-auto space-y-5 px-4 py-8 mb-nav">
      <div>
        <h1 className="font-display text-4xl font-extrabold text-[#2A7A3A]">Vos déchets valent de l'argent ♻️</h1>
        <p className="text-[#5C5C48] text-sm mt-1">Bonjour {user.firstName} · Solde actuel : <strong>{balance} points</strong></p>
      </div>

      {/* Section 1 — Triés ou mélangés ? */}
      <section className={card}>
        <h2 className="font-bold mb-3">1. Vos déchets sont-ils triés ?</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { v: true,  emoji: '🗂️', title: 'Triés',    desc: 'Meilleur prix' },
            { v: false, emoji: '🛍️', title: 'Mélangés', desc: '100 F/kg' },
          ].map(opt => (
            <button key={opt.title} type="button" onClick={() => { setSorted(opt.v); setKg({} as Record<WasteType, number>); }}
              className={`rounded-2xl border-2 p-4 text-center transition-all active:scale-95 ${sorted === opt.v ? 'border-[#2A7A3A] bg-[#E8F5EA]' : 'border-[#DEDED0] hover:border-[#2A7A3A]/40'}`}>
              <div className="text-4xl mb-1">{opt.emoji}</div>
              <div className="font-bold text-sm">{opt.title}</div>
              <div className="text-xs text-[#5C5C48]">{opt.desc}</div>
            </button>
          ))}
        </div>
        {sorted === false && (
          <p className="mt-3 rounded-xl bg-[#E8F5EA] p-3 text-sm">
            💡 <strong>Astuce :</strong> séparez carton, plastique et aluminium pour gagner jusqu'à 3× plus.
          </p>
        )}
      </section>

      {/* Section 2 — Quantités */}
      {sorted !== null && (
        <section className={card + ' space-y-4'}>
          <h2 className="font-bold">2. Combien ? <span className="font-normal text-[#5C5C48] text-sm">(estimation)</span></h2>
          {sorted ? (
            MATS.map(m => {
              const price = (pricing as any)[`${m.type}_sorted`] ?? 0;
              return (
                <div key={m.type} className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-3xl">{m.emoji}</span>{' '}
                    <strong>{m.label}</strong>
                    <div className="text-xs text-[#5C5C48]">{price} F/kg</div>
                  </div>
                  <Stepper value={kg[m.type] ?? 0} onChange={n => setKg(prev => ({ ...prev, [m.type]: n }))} />
                </div>
              );
            })
          ) : (
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="text-3xl">🛍️</span> <strong>Total mélangé</strong>
                <div className="text-xs text-[#5C5C48]">100 F/kg</div>
              </div>
              <Stepper
                value={kg['sachets'] ?? 0}
                onChange={n => setKg({ sachets: n } as Record<WasteType, number>)}
              />
            </div>
          )}
        </section>
      )}

      {/* Live price card */}
      {totalKg > 0 && (
        <section className="rounded-2xl bg-[#2A7A3A] p-5 text-white">
          {isLarge ? (
            <>
              <p className="text-sm opacity-80">≥ {pricing.threshold_kg} kg · Collecte à domicile</p>
              <p className="font-display text-4xl font-extrabold">{formatFCFA(calc.total)}</p>
            </>
          ) : (
            <>
              <p className="text-sm opacity-80">&lt; {pricing.threshold_kg} kg · Dépôt au point relais</p>
              <p className="font-display text-4xl font-extrabold">+{calc.points} points</p>
            </>
          )}
          <p className="text-xs opacity-70 mt-1">{totalKg.toFixed(1)} kg au total</p>
        </section>
      )}

      {/* Large volume — paiement + créneau */}
      {isLarge && totalKg > 0 && (
        <section className={card + ' space-y-3'}>
          <p className="font-bold text-[#2A7A3A] text-sm">🚛 Collecte à domicile</p>
          <Select label="Mode de paiement" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} options={PAYMENT_METHODS} />
          <Select label="Créneau de collecte" value={slot} onChange={e => setSlot(e.target.value)} options={SLOTS.map(s => ({ value: s, label: s }))} />
        </section>
      )}

      {/* Small volume — point relais */}
      {!isLarge && totalKg > 0 && nearestRelay && (
        <section className={card}>
          <p className="font-bold text-sm mb-3">📍 Point relais le plus proche</p>
          <div className="flex items-center gap-3">
            <div className="text-3xl">🏪</div>
            <div>
              <p className="font-bold text-sm">{nearestRelay.name}</p>
              <p className="text-xs text-[#5C5C48]">{nearestRelay.address}</p>
              <p className="text-xs text-[#5C5C48]">{nearestRelay.hours}</p>
            </div>
          </div>
        </section>
      )}

      {/* Submit */}
      {sorted !== null && (
        <button type="button" onClick={handleDeclare} disabled={items.length === 0 || declaring}
          className="w-full rounded-2xl bg-[#2A7A3A] py-4 text-lg font-bold text-white shadow-glow disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all flex items-center justify-center gap-2">
          {declaring
            ? <><Loader className="w-5 h-5 animate-spin" /> Envoi en cours…</>
            : isLarge ? '🚛 Demander la collecte' : '🎁 Obtenir mon code'}
        </button>
      )}

      <p className="text-center text-sm text-[#5C5C48]">
        Vous voyez un dépôt sauvage ?{' '}
        <Link href="/signaler" className="font-bold text-[#2A7A3A] underline">Signalez-le</Link>
      </p>
    </main>
  );
}
