'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Leaf, ChevronLeft, ChevronRight, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { registerUser } from '@/src/services/storage';
import type { Commune, UserRole } from '@/src/types';

const COMMUNES: Commune[] = ['Abobo','Adjamé','Attécoubé','Cocody','Koumassi','Marcory','Plateau','Port-Bouët','Treichville','Yopougon','Anyama','Bingerville','Songon'];
const STEPS = ['Type de compte', 'Identité', 'Téléphone', 'Localisation', 'Sécurité'];

export default function InscriptionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<'citizen' | 'merchant'>('citizen');
  const [firstName, setFirstName] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [commune, setCommune] = useState<Commune>('Abobo');
  const [quartier, setQuartier] = useState('');
  const [householdSize, setHouseholdSize] = useState(5);
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const progress = Math.round(((step + 1) / STEPS.length) * 100);

  function formatPhone(v: string) {
    const d = v.replace(/\D/g, '').slice(0, 10);
    return [d.slice(0, 2), d.slice(2, 4), d.slice(4, 6), d.slice(6, 8), d.slice(8, 10)].filter(Boolean).join(' ');
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (step === 1) {
      if (!firstName.trim()) e.firstName = 'Prénom requis';
      if (!name.trim()) e.name = 'Nom requis';
    }
    if (step === 2) {
      const digits = phone.replace(/\s/g, '');
      if (digits.length < 10) e.phone = 'Numéro invalide (10 chiffres)';
      if (codeSent && verifyCode !== '123456') e.code = 'Code incorrect (123456 en mode démo)';
    }
    if (step === 3) {
      if (!commune) e.commune = 'Commune requise';
    }
    if (step === 4) {
      if (pin.length < 4) e.pin = 'Code PIN à 4 chiffres';
      if (pin !== pinConfirm) e.pinConfirm = 'Les codes ne correspondent pas';
      if (!consent) e.consent = 'Vous devez accepter les conditions';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    if (!validate()) return;
    if (step === 2 && !codeSent) { setCodeSent(true); toast('Code envoyé : 123456 (mode démo)', 'info'); return; }
    if (step < STEPS.length - 1) setStep(s => s + 1);
  }

  function finish() {
    if (!validate()) return;
    const user = registerUser({
      phone: phone.replace(/\s/g, ''),
      name,
      firstName,
      role: role as UserRole,
      commune,
      quartier,
      householdSize: role === 'citizen' ? householdSize : undefined,
      businessName: role === 'merchant' ? businessName : undefined,
      businessType: role === 'merchant' ? businessType : undefined,
      pin,
    });
    toast(`Bienvenue, ${user.firstName} ! Votre compte est créé.`, 'success');
    router.push('/');
  }

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col w-72 bg-[#E8F5EA] border-r border-[#DEDED0] p-8 sticky top-0 h-screen">
        <div className="flex items-center gap-2 mb-10">
          <div className="w-8 h-8 bg-[#2A7A3A] rounded-lg flex items-center justify-center">
            <Leaf className="w-5 h-5 text-white" strokeWidth={2} />
          </div>
          <span className="font-bold text-[#16160F]">EcoAbidjan</span>
        </div>
        <div className="mb-6">
          <div className="flex justify-between text-xs text-[#5C5C48] mb-2">
            <span>Progression</span><span>{progress}%</span>
          </div>
          <div className="h-1.5 bg-[#DEDED0] rounded-full"><div className="h-full bg-[#2A7A3A] rounded-full transition-all" style={{ width: `${progress}%` }} /></div>
        </div>
        <nav className="space-y-1">
          {STEPS.map((s, i) => (
            <div key={s} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${i === step ? 'bg-white font-semibold text-[#2A7A3A]' : i < step ? 'text-[#5C5C48]' : 'text-[#DEDED0]'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i < step ? 'bg-[#2A7A3A] text-white' : i === step ? 'border-2 border-[#2A7A3A] text-[#2A7A3A]' : 'border-2 border-[#DEDED0] text-[#DEDED0]'}`}>
                {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              {s}
            </div>
          ))}
        </nav>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* Mobile progress */}
        <div className="md:hidden px-4 pt-4">
          <div className="flex justify-between text-xs text-[#5C5C48] mb-1"><span>Étape {step + 1}/{STEPS.length}</span><span>{progress}%</span></div>
          <div className="h-1.5 bg-[#DEDED0] rounded-full"><div className="h-full bg-[#2A7A3A] rounded-full transition-all" style={{ width: `${progress}%` }} /></div>
        </div>

        <div className="flex-1 flex items-start justify-center p-4 md:p-12">
          <Card className="w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-1">{STEPS[step]}</h2>

            {/* Step 0 */}
            {step === 0 && (
              <div className="mt-4 grid grid-cols-2 gap-4">
                {[{ val: 'citizen', label: 'Ménage', desc: 'Particulier' }, { val: 'merchant', label: 'Commerçant', desc: 'Commerce ou entreprise' }].map(o => (
                  <button key={o.val} onClick={() => setRole(o.val as any)} className={`p-5 rounded-xl border-2 text-left transition-all ${role === o.val ? 'border-[#2A7A3A] bg-[#E8F5EA]' : 'border-[#DEDED0]'}`}>
                    <p className="font-semibold text-sm">{o.label}</p>
                    <p className="text-xs text-[#5C5C48]">{o.desc}</p>
                  </button>
                ))}
              </div>
            )}

            {/* Step 1 */}
            {step === 1 && (
              <div className="mt-4 space-y-4">
                <Input label="Prénom" value={firstName} onChange={e => setFirstName(e.target.value)} error={errors.firstName} autoFocus />
                <Input label="Nom" value={name} onChange={e => setName(e.target.value)} error={errors.name} />
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="text-sm font-medium text-[#16160F] block mb-1.5">Numéro de téléphone</label>
                  <div className="flex">
                    <span className="flex items-center px-3 bg-gray-50 border border-r-0 border-[#DEDED0] rounded-l-xl text-sm text-[#5C5C48]">+225</span>
                    <input type="tel" inputMode="numeric" placeholder="07 00 00 00 00" value={phone} onChange={e => setPhone(formatPhone(e.target.value))} className="flex-1 h-12 px-3 border border-[#DEDED0] rounded-r-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2A7A3A]" />
                  </div>
                  {errors.phone && <p className="text-xs text-[#E05A1A] mt-1">{errors.phone}</p>}
                </div>
                {codeSent && (
                  <div>
                    <Input label="Code de vérification" inputMode="numeric" maxLength={6} placeholder="123456" value={verifyCode} onChange={e => setVerifyCode(e.target.value)} error={errors.code} hint="Mode démo : saisissez 123456" />
                  </div>
                )}
              </div>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <div className="mt-4 space-y-4">
                <Select label="Commune" value={commune} onChange={e => setCommune(e.target.value as Commune)} options={COMMUNES.map(c => ({ value: c, label: c }))} error={errors.commune} />
                <Input label="Quartier" placeholder="Ex. Abobo Gare" value={quartier} onChange={e => setQuartier(e.target.value)} />
                {role === 'citizen' && (
                  <div>
                    <label className="text-sm font-medium text-[#16160F] block mb-1.5">Nombre de personnes dans le ménage</label>
                    <input type="number" min={1} max={20} value={householdSize} onChange={e => setHouseholdSize(+e.target.value)} className="h-12 w-full border border-[#DEDED0] rounded-xl px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#2A7A3A]" />
                  </div>
                )}
                {role === 'merchant' && (
                  <>
                    <Input label="Nom du commerce" value={businessName} onChange={e => setBusinessName(e.target.value)} />
                    <Input label="Type d'activité" placeholder="Ex. Commerce alimentaire" value={businessType} onChange={e => setBusinessType(e.target.value)} />
                  </>
                )}
              </div>
            )}

            {/* Step 4 */}
            {step === 4 && (
              <div className="mt-4 space-y-4">
                <div className="relative">
                  <Input label="Code PIN (4 chiffres)" type={showPin ? 'text' : 'password'} inputMode="numeric" maxLength={4} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} error={errors.pin} />
                  <button type="button" className="absolute right-3 top-9" onClick={() => setShowPin(p => !p)}>{showPin ? <EyeOff className="w-4 h-4 text-[#5C5C48]" /> : <Eye className="w-4 h-4 text-[#5C5C48]" />}</button>
                </div>
                <Input label="Confirmer le code PIN" type="password" inputMode="numeric" maxLength={4} value={pinConfirm} onChange={e => setPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))} error={errors.pinConfirm} />
                <label className="flex items-start gap-3 cursor-pointer text-sm">
                  <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5" />
                  <span>J'accepte les <span className="text-[#2A7A3A]">conditions d'utilisation</span> et la <span className="text-[#2A7A3A]">politique de confidentialité</span>. Mes données sont protégées conformément à la loi n° 2013-450.</span>
                </label>
                {errors.consent && <p className="text-xs text-[#E05A1A]">{errors.consent}</p>}
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-3 mt-6">
              {step > 0 && <Button variant="outline" onClick={() => setStep(s => s - 1)}><ChevronLeft className="w-4 h-4 mr-1" />Retour</Button>}
              {step < STEPS.length - 1 ? (
                <Button onClick={next} className="flex-1">
                  {step === 2 && !codeSent ? 'Envoyer le code' : <>{STEPS[step + 1]} <ChevronRight className="w-4 h-4 ml-1" /></>}
                </Button>
              ) : (
                <Button onClick={finish} className="flex-1"><CheckCircle className="w-4 h-4 mr-2" />Créer mon compte</Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
