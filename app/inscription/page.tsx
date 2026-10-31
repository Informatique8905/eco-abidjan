'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { registerUser } from '@/src/services/storage';
import type { Commune, UserRole } from '@/src/types';

const COMMUNES: Commune[] = ['Abobo','Adjamé','Attécoubé','Cocody','Koumassi','Marcory','Plateau','Port-Bouët','Treichville','Yopougon','Anyama','Bingerville','Songon'];

export default function InscriptionPage() {
  const router  = useRouter();
  const { toast } = useToast();

  const [step,      setStep]      = useState(0);
  const [role,      setRole]      = useState<'citizen' | 'merchant'>('citizen');
  const [firstName, setFirstName] = useState('');
  const [name,      setName]      = useState('');
  const [phone,     setPhone]     = useState('');
  const [commune,   setCommune]   = useState<Commune>('Abobo');
  const [consent,   setConsent]   = useState(false);
  const [errors,    setErrors]    = useState<Record<string, string>>({});

  function formatPhone(v: string) {
    const d = v.replace(/\D/g, '').slice(0, 10);
    return [d.slice(0,2), d.slice(2,4), d.slice(4,6), d.slice(6,8), d.slice(8,10)].filter(Boolean).join(' ');
  }

  function validateStep0() {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = 'Prénom requis';
    if (!name.trim())      e.name      = 'Nom requis';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep1() {
    const e: Record<string, string> = {};
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) e.phone   = 'Numéro invalide (10 chiffres)';
    if (!consent)            e.consent = 'Veuillez accepter les conditions';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function finish() {
    if (!validateStep1()) return;
    const user = registerUser({
      phone: phone.replace(/\s/g, ''),
      name,
      firstName,
      role: role as UserRole,
      commune,
      pin: '0000', // PIN par défaut — connexion par téléphone uniquement
    });
    toast(`Bienvenue, ${user.firstName} ! 🎉`, 'success');
    router.push('/connexion');
  }

  const progress = step === 0 ? 50 : 100;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#F7F7F2]">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🌿</div>
          <h1 className="font-display text-3xl font-extrabold text-[#16160F]">Créer un compte</h1>
          <p className="text-[#5C5C48] mt-1 text-sm">Étape {step + 1} sur 2</p>
        </div>

        {/* Progress */}
        <div className="h-1.5 bg-[#DEDED0] rounded-full mb-6 overflow-hidden">
          <div className="h-full bg-[#2A7A3A] rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>

        <div className="bg-white rounded-2xl border border-[#DEDED0] p-6 space-y-5">

          {/* Step 0 — Identité + type */}
          {step === 0 && (
            <>
              {/* Type de compte */}
              <div>
                <p className="text-sm font-bold text-[#16160F] mb-3">Je suis…</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { val: 'citizen',  label: 'Un particulier', emoji: '🏠', sub: 'Ménage · Famille' },
                    { val: 'merchant', label: 'Un commerçant',  emoji: '🏪', sub: 'Commerce · Entreprise' },
                  ].map(o => (
                    <button key={o.val} onClick={() => setRole(o.val as any)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${role === o.val ? 'border-[#2A7A3A] bg-[#E8F5EA]' : 'border-[#DEDED0] hover:border-[#2A7A3A]/40'}`}>
                      <div className="text-2xl mb-1">{o.emoji}</div>
                      <p className="font-bold text-sm text-[#16160F]">{o.label}</p>
                      <p className="text-xs text-[#5C5C48]">{o.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              <Input label="Prénom" placeholder="Ex. Aminata" value={firstName} onChange={e => setFirstName(e.target.value)} error={errors.firstName} autoFocus />
              <Input label="Nom" placeholder="Ex. Koné" value={name} onChange={e => setName(e.target.value)} error={errors.name} />

              <Button onClick={() => { if (validateStep0()) setStep(1); }} className="w-full">
                Continuer →
              </Button>
            </>
          )}

          {/* Step 1 — Téléphone + commune + consent */}
          {step === 1 && (
            <>
              <div>
                <label className="text-sm font-bold text-[#16160F] block mb-2">📱 Numéro de téléphone</label>
                <div className="flex">
                  <span className="flex items-center px-3 bg-[#E8F5EA] border border-r-0 border-[#DEDED0] rounded-l-xl text-sm font-bold text-[#2A7A3A] flex-shrink-0">+225</span>
                  <input
                    type="tel" inputMode="numeric" placeholder="07 00 00 00 00"
                    value={phone} onChange={e => { setPhone(formatPhone(e.target.value)); setErrors(er => ({ ...er, phone: '' })); }}
                    className={`flex-1 h-12 px-4 border rounded-r-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2A7A3A] bg-white ${errors.phone ? 'border-[#E05A1A]' : 'border-[#DEDED0]'}`}
                    autoFocus
                  />
                </div>
                {errors.phone && <p className="text-xs text-[#E05A1A] mt-1">{errors.phone}</p>}
              </div>

              <Select label="🏘️ Commune" value={commune} onChange={e => setCommune(e.target.value as Commune)} options={COMMUNES.map(c => ({ value: c, label: c }))} />

              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={consent} onChange={e => { setConsent(e.target.checked); setErrors(er => ({ ...er, consent: '' })); }} className="mt-1 accent-[#2A7A3A]" />
                <span className="text-xs text-[#5C5C48] leading-relaxed">
                  J'accepte les <span className="text-[#2A7A3A] font-semibold">conditions d'utilisation</span> et la <span className="text-[#2A7A3A] font-semibold">politique de confidentialité</span>. Mes données sont protégées (loi n° 2013-450).
                </span>
              </label>
              {errors.consent && <p className="text-xs text-[#E05A1A]">{errors.consent}</p>}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(0)}>‹ Retour</Button>
                <Button onClick={finish} className="flex-1">✅ Créer mon compte</Button>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-sm text-[#5C5C48] mt-5">
          Déjà un compte ?{' '}
          <Link href="/connexion" className="text-[#2A7A3A] font-bold hover:underline">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
