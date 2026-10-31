'use client';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { ChevronRight, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { getDashboardStats, getRelayPoints, formatFCFA } from '@/src/services/storage';
import { PRICING } from '@/src/data/seed';

function AnimatedCounter({ target, suffix = '', prefix = '' }: { target: number; suffix?: string; prefix?: string }) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let start = 0;
    const duration = 1500;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setValue(target); clearInterval(timer); } else setValue(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target]);
  return <span ref={ref}>{prefix}{value.toLocaleString('fr-FR')}{suffix}</span>;
}

export default function HomePage() {
  const [stats, setStats] = useState({ totalWeightKg: 0, totalRemunerationFCFA: 0, totalReports: 0, treatedReports: 0 });
  const relays = getRelayPoints();

  useEffect(() => {
    const s = getDashboardStats();
    setStats({ totalWeightKg: s.totalWeightKg, totalRemunerationFCFA: s.totalRemunerationFCFA, totalReports: s.totalReports, treatedReports: s.treatedReports });
  }, []);

  const WASTE_PRICES = [
    { material: 'Bouteilles PET', sorted: 100, unsorted: 40 },
    { material: 'Bidons PEHD', sorted: 100, unsorted: 40 },
    { material: 'Canettes aluminium', sorted: 300, unsorted: 120 },
    { material: 'Carton', sorted: 50, unsorted: 0 },
    { material: 'Papier blanc', sorted: 50, unsorted: 0 },
    { material: 'Sachets/Films', sorted: 50, unsorted: 20 },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4">

      {/* Hero — photo + 2 CTAs */}
      <section className="py-8 md:py-12">
        {/* Photo hero */}
        <div className="relative rounded-3xl overflow-hidden mb-8 h-64 md:h-80">
          <img
            src="/hero.jpg"
            alt="Un enfant trie ses déchets plastiques à Abidjan"
            className="w-full h-full object-cover"
          />
          {/* Overlay texte */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent flex items-end p-6 md:p-8">
            <div>
              <h1 className="font-display text-3xl md:text-5xl font-extrabold text-white leading-tight mb-2">
                Une bonne habitude<br />aujourd'hui,<br />
                <span className="text-[#7ACD8A]">un réflexe pour la vie.</span>
              </h1>
              <p className="text-white/80 text-sm max-w-xs">
                Réduire · Trier · Valoriser — à Abidjan, chaque geste compte.
              </p>
            </div>
          </div>
        </div>

        {/* 2 CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/signaler" aria-label="Signaler un dépôt sauvage"
            className="group relative flex flex-col items-center gap-3 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2A7A3A]/40 rounded-3xl">
            <span className="relative grid h-32 w-32 place-items-center rounded-3xl bg-[#2A7A3A] text-white shadow-glow transition-transform active:scale-95 group-hover:scale-105">
              <span className="absolute inset-0 rounded-3xl bg-[#2A7A3A]/30 animate-ping-slow" />
              <span className="relative text-5xl animate-wiggle">📸</span>
            </span>
            <span className="font-display text-lg font-extrabold text-[#2A7A3A]">Signaler un dépôt</span>
            <span className="text-xs text-[#5C5C48]">Anonyme · Sans compte</span>
          </Link>

          <div className="hidden sm:block w-px h-20 bg-[#DEDED0]" />
          <div className="sm:hidden w-20 h-px bg-[#DEDED0]" />

          <Link href="/recycler" aria-label="Recycler mes déchets"
            className="group relative flex flex-col items-center gap-3 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2A7A3A]/40 rounded-3xl">
            <span className="relative grid h-32 w-32 place-items-center rounded-3xl bg-white border-2 border-[#2A7A3A] transition-transform active:scale-95 group-hover:scale-105 group-hover:bg-[#E8F5EA]">
              <span className="relative text-5xl">♻️</span>
            </span>
            <span className="font-display text-lg font-extrabold text-[#2A7A3A]">Recycler mes déchets</span>
            <span className="text-xs text-[#5C5C48]">Soyez rémunéré(e)</span>
          </Link>
        </div>
      </section>

      {/* Counters */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-12">
        {[
          { emoji: '⚖️', label: 'kg recyclés', value: Math.max(stats.totalWeightKg, 12400) },
          { emoji: '📍', label: 'Dépôts signalés', value: Math.max(stats.totalReports, 284) },
          { emoji: '✅', label: 'Dépôts traités', value: Math.max(stats.treatedReports, 196) },
          { emoji: '💰', label: 'FCFA reversés', value: Math.max(stats.totalRemunerationFCFA, 1850000) },
        ].map((s, i) => (
          <Card key={i} className="p-4 text-center rounded-2xl">
            <div className="text-3xl mb-1">{s.emoji}</div>
            <div className="font-display text-2xl font-extrabold text-[#16160F]">
              <AnimatedCounter target={s.value} />
            </div>
            <p className="text-xs text-[#5C5C48] mt-0.5">{s.label}</p>
          </Card>
        ))}
      </section>

      {/* How it works */}
      <section className="mb-12">
        <h2 className="font-display text-2xl font-extrabold text-[#16160F] mb-5 text-center">Comment ça marche</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { emoji: '📸', step: '1', title: 'Signalez', text: 'Une photo, votre position. L\'IA analyse le dépôt sauvage et l\'admin est alerté en temps réel.' },
            { emoji: '♻️', step: '2', title: 'Déclarez', text: 'Indiquez le type et le poids de vos déchets. Rémunération directe au-dessus du seuil, points en dessous.' },
            { emoji: '🎁', step: '3', title: 'Récoltez', text: 'Échangez vos points en bons d\'achat dans les supermarchés partenaires d\'Abidjan.' },
          ].map(s => (
            <div key={s.step} className="flex gap-4 p-5 rounded-2xl border border-[#DEDED0] bg-white">
              <div className="text-4xl flex-shrink-0">{s.emoji}</div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-5 bg-[#2A7A3A] rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{s.step}</span>
                  <h3 className="font-bold text-[#16160F]">{s.title}</h3>
                </div>
                <p className="text-sm text-[#5C5C48] leading-relaxed">{s.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tip box */}
      <section className="mb-10 rounded-2xl bg-[#E8F5EA] border border-[#2A7A3A]/20 p-5">
        <p className="font-bold text-[#2A7A3A] mb-1">💡 Astuce : triez pour gagner plus</p>
        <p className="text-sm text-[#5C5C48]">
          Les canettes aluminium triées valent <strong>300 F/kg</strong>, contre 120 F mélangées.
          Le carton trié vaut <strong>50 F/kg</strong>, rien s'il est mélangé.
          Deux sacs séparés, trois fois plus de revenus.
        </p>
      </section>

      {/* Pricing table */}
      <section className="mb-12">
        <h2 className="font-display text-2xl font-extrabold text-[#16160F] mb-1">Grille de prix</h2>
        <p className="text-[#5C5C48] text-sm mb-4">Prix payés aux usagers pour leurs déchets triés ou mélangés.</p>
        <div className="overflow-x-auto rounded-2xl border border-[#DEDED0]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#0A2010] text-white">
                <th className="text-left px-4 py-3 font-semibold">Matière</th>
                <th className="text-right px-4 py-3 font-semibold">Trié (F/kg)</th>
                <th className="text-right px-4 py-3 font-semibold">Mélangé (F/kg)</th>
              </tr>
            </thead>
            <tbody>
              {WASTE_PRICES.map((row, i) => (
                <tr key={i} className="border-t border-[#DEDED0] hover:bg-[#E8F5EA]/40 transition-colors">
                  <td className="px-4 py-3 font-medium">{row.material}</td>
                  <td className="px-4 py-3 text-right text-[#2A7A3A] font-bold">{row.sorted} F</td>
                  <td className="px-4 py-3 text-right text-[#5C5C48]">{row.unsorted > 0 ? `${row.unsorted} F` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-[#5C5C48] mt-2">Collecte à domicile au-delà de {PRICING.threshold_kg} kg. En dessous : dépôt au point relais.</p>
      </section>

      {/* Relay points preview */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl font-extrabold text-[#16160F]">Points relais</h2>
          <Link href="/relais" className="text-[#2A7A3A] text-sm font-bold flex items-center gap-1 hover:underline">
            Voir tous <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          {relays.slice(0, 4).map(rp => (
            <div key={rp.id} className="flex items-start gap-3 p-4 rounded-2xl border border-[#DEDED0] bg-white hover:border-[#2A7A3A]/40 transition-colors">
              <div className="text-2xl flex-shrink-0">🏪</div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-[#16160F] truncate">{rp.name}</p>
                <p className="text-xs text-[#5C5C48]">{rp.commune} · {rp.hours}</p>
                <div className="mt-1.5 h-1.5 rounded-full bg-[#DEDED0] overflow-hidden">
                  <div className="h-full bg-[#2A7A3A] rounded-full transition-all" style={{ width: `${Math.min((rp.currentLoadKg / rp.capacityKg) * 100, 100)}%` }} />
                </div>
                <p className="text-xs text-[#5C5C48] mt-0.5">{rp.currentLoadKg} / {rp.capacityKg} kg</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Partners */}
      <section className="mb-16 py-8 border-t border-[#DEDED0]">
        <p className="text-center text-xs text-[#5C5C48] uppercase tracking-wider font-bold mb-5">Acheteurs partenaires de déchets</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-center">
          {['Coliba Africa', 'Recyplast', 'TIP SARL', 'Envipur', 'SOCOREMF-CI', 'Conceptos Plásticos'].map(p => (
            <div key={p} className="px-4 py-2.5 rounded-xl border border-[#DEDED0] text-sm text-[#5C5C48] font-medium hover:border-[#2A7A3A]/40 hover:bg-[#E8F5EA]/30 transition-colors">{p}</div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#DEDED0] py-8 text-center text-xs text-[#5C5C48] space-y-2 mb-nav">
        <div className="flex justify-center gap-6 flex-wrap">
          <Link href="#" className="hover:text-[#2A7A3A]">À propos</Link>
          <Link href="#" className="hover:text-[#2A7A3A]">Contact</Link>
          <Link href="#" className="hover:text-[#2A7A3A]">Mentions légales</Link>
          <Link href="#" className="hover:text-[#2A7A3A]">Confidentialité</Link>
        </div>
        <p>© 2026 EcoAbidjan · Hack for Humanity · Loi n° 2013-450 sur la protection des données</p>
      </footer>
    </div>
  );
}
