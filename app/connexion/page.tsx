'use client';
import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { login } from '@/src/services/storage';

const DEMO_ACCOUNTS = [
  { emoji: '👩', label: 'Aminata Koné', sub: 'Ménage · Abobo',       phone: '07 00 00 00 01' },
  { emoji: '👨‍💼', label: 'Ibrahim Bamba', sub: 'Commerçant · Yopougon', phone: '07 00 00 00 02' },
  { emoji: '🏪', label: 'Point relais',   sub: 'Cocody',               phone: '07 00 00 00 03' },
  { emoji: '🛡️', label: 'Administrateur', sub: 'Tableau de bord',       phone: '07 00 00 00 04' },
];

export default function ConnexionPage() {
  return <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-4xl animate-wiggle">🌿</div></div>}><ConnexionForm /></Suspense>;
}

function ConnexionForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { toast }    = useToast();
  const redirect     = searchParams.get('redirect') ?? '/';

  const [phone,   setPhone]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  function formatPhone(v: string) {
    const d = v.replace(/\D/g, '').slice(0, 10);
    return [d.slice(0,2), d.slice(2,4), d.slice(4,6), d.slice(6,8), d.slice(8,10)].filter(Boolean).join(' ');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 8) { setError('Numéro invalide (ex. 07 00 00 00 01)'); return; }
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 400));
    const user = login(phone);
    setLoading(false);
    if (!user) { setError('Numéro introuvable. Vérifiez ou créez un compte.'); return; }
    toast(`Bienvenue, ${user.firstName} ! 👋`, 'success');
    if (user.role === 'admin') router.push('/admin/tableau-de-bord');
    else router.push(redirect);
  }

  function fillDemo(p: string) {
    setPhone(formatPhone(p.replace(/\s/g, '')));
    setError('');
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#F7F7F2]">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🌿</div>
          <h1 className="font-display text-3xl font-extrabold text-[#16160F]">Bon retour !</h1>
          <p className="text-[#5C5C48] mt-1 text-sm">Entrez votre numéro de téléphone pour vous identifier</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#DEDED0] p-6 mb-5">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="phone" className="text-sm font-bold text-[#16160F] block mb-2">
                📱 Numéro de téléphone
              </label>
              <div className="flex">
                <span className="flex items-center px-3 bg-[#E8F5EA] border border-r-0 border-[#DEDED0] rounded-l-xl text-sm font-bold text-[#2A7A3A] flex-shrink-0">+225</span>
                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="07 00 00 00 01"
                  value={phone}
                  onChange={e => { setPhone(formatPhone(e.target.value)); setError(''); }}
                  className={`flex-1 h-12 px-4 border rounded-r-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2A7A3A] bg-white ${error ? 'border-[#E05A1A]' : 'border-[#DEDED0]'}`}
                  autoComplete="tel"
                  autoFocus
                />
              </div>
              {error && <p className="text-xs text-[#E05A1A] mt-1.5 font-medium">{error}</p>}
            </div>

            <button type="submit" disabled={loading}
              className="w-full rounded-2xl bg-[#2A7A3A] py-4 text-base font-bold text-white shadow-glow disabled:opacity-50 active:scale-95 transition-all">
              {loading ? 'Connexion…' : 'Se connecter →'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-[#5C5C48] mb-6">
          Pas encore de compte ?{' '}
          <Link href="/inscription" className="text-[#2A7A3A] font-bold hover:underline">Créer un compte</Link>
        </p>

        {/* Comptes démo — 1 clic */}
        <div className="bg-[#E8F5EA] rounded-2xl p-4">
          <p className="text-xs font-bold text-[#2A7A3A] mb-3 uppercase tracking-wide">⚡ Comptes de démo — 1 clic</p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map(a => (
              <button key={a.phone} onClick={() => fillDemo(a.phone)}
                className="text-left px-3 py-2.5 rounded-xl bg-white border-2 border-transparent hover:border-[#2A7A3A] transition-all text-xs active:scale-95">
                <div className="text-lg mb-0.5">{a.emoji}</div>
                <p className="font-bold text-[#16160F]">{a.label}</p>
                <p className="text-[#5C5C48]">{a.sub}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
