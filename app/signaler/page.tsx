'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { getCurrentUser, addReport } from '@/src/services/storage';
import { analyzerPhoto } from '@/src/services/ia';
import type { WasteAnalysis, Commune } from '@/src/types';
import { COMMUNE_CENTERS } from '@/src/data/seed';
import { api } from '@/src/services/api';

const COMMUNES: Commune[] = ['Abobo','Adjamé','Attécoubé','Cocody','Koumassi','Marcory','Plateau','Port-Bouët','Treichville','Yopougon','Anyama','Bingerville','Songon'];
const STEPS = ['Photo', 'Lieu', 'Identité', 'Analyse IA', 'Envoi'];

export default function SignalerPage() {
  const router = useRouter();
  const { toast } = useToast();
  const currentUser = getCurrentUser();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [geoAccuracy, setGeoAccuracy] = useState<number | null>(null);
  const [commune, setCommune] = useState<Commune>('Abobo');
  const [address, setAddress] = useState('');
  const [anonymous, setAnonymous] = useState(true);
  const [reporterName, setReporterName] = useState(currentUser ? `${currentUser.firstName} ${currentUser.name}` : '');
  const [reporterPhone, setReporterPhone] = useState(currentUser ? currentUser.phone : '');
  const [analysis, setAnalysis] = useState<WasteAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setPhotoPreview(ev.target?.result as string);
      setStep(1);
    };
    reader.readAsDataURL(file);
    setPhotoFile(file);
  }

  function requestGeo() {
    if (!consentGiven) {
      toast('Veuillez d\'abord accepter la géolocalisation.', 'info');
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => { setLat(pos.coords.latitude); setLng(pos.coords.longitude); setGeoAccuracy(Math.round(pos.coords.accuracy)); setGeoLoading(false); toast('Position obtenue !', 'success'); },
      () => { setGeoLoading(false); toast('Position non disponible. Saisissez votre adresse.', 'info'); }
    );
  }

  function setCommmuneFallback(c: Commune) {
    setCommune(c);
    const center = COMMUNE_CENTERS[c];
    if (center && !lat) { setLat(center[0] + (Math.random() - 0.5) * 0.01); setLng(center[1] + (Math.random() - 0.5) * 0.01); }
  }

  async function runAnalysis() {
    setAnalyzing(true);
    try {
      const result = await analyzerPhoto(photoPreview ?? '');
      setAnalysis(result);
    } catch { toast('Analyse échouée, réessayez.', 'error'); }
    setAnalyzing(false);
  }

  function nextStep() {
    if (step === 0 && !photoPreview) { toast('Veuillez fournir une photo.', 'error'); return; }
    if (step === 1 && !lat) { toast('Veuillez indiquer votre position ou votre commune.', 'error'); return; }
    if (step === 2) { /* Identity optional */ }
    if (step === 3 && !analysis) { runAnalysis(); return; }
    if (step < STEPS.length - 1) setStep(s => s + 1);
    if (step === 2 && !analysis) runAnalysis();
  }

  function submit() {
    // 1. Sauvegarde localStorage (toujours, immédiat)
    const report = addReport({
      userId: currentUser?.id,
      anonymous: anonymous || !currentUser,
      photoUrl: photoPreview ?? undefined,
      latitude: lat ?? COMMUNE_CENTERS[commune][0],
      longitude: lng ?? COMMUNE_CENTERS[commune][1],
      commune,
      address: address || `${commune}, Abidjan`,
      analysis: analysis ?? undefined,
      status: 'reçu',
      priority: analysis?.priorite ?? 'moyenne',
    });
    setTrackingNumber(report.trackingNumber);
    setStep(STEPS.length - 1);
    toast('Signalement envoyé !', 'success');

    // 2. Sync backend en arrière-plan (best-effort, ne bloque pas l'UX)
    if (photoPreview && lat && lng) {
      api.createReport({
        userId: currentUser?.id,
        lat,
        lon: lng,
        imageBase64: photoPreview,
        mimeType: photoFile?.type,
      }).catch(() => {}); // silencieux si Snowflake absent
    }
  }

  const progress = ((step + 1) / STEPS.length) * 100;
  const riskColors = { faible: 'success', moyen: 'warning', élevé: 'error' } as const;
  const priorityColors = { basse: 'success', moyenne: 'warning', haute: 'error' } as const;

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-extrabold text-[#16160F] mb-1">Signaler un dépôt 📸</h1>
      <p className="text-[#5C5C48] text-sm mb-6">Sans compte · Anonyme par défaut</p>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          {STEPS.map((s, i) => (
            <span key={s} className={`text-xs font-medium ${i === step ? 'text-[#2A7A3A]' : i < step ? 'text-[#5C5C48]' : 'text-[#DEDED0]'}`}>{s}</span>
          ))}
        </div>
        <div className="h-2 bg-[#DEDED0] rounded-full overflow-hidden">
          <div className="h-full bg-[#2A7A3A] rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Step 0: Photo */}
      {step === 0 && (
        <div className="space-y-4">
          {photoPreview ? (
            <div className="relative rounded-2xl overflow-hidden border-2 border-[#2A7A3A]">
              <img src={photoPreview} alt="Aperçu du dépôt" className="w-full h-56 object-cover" />
              <button onClick={() => { setPhotoPreview(null); setPhotoFile(null); setAnalysis(null); }}
                className="absolute top-2 right-2 bg-white rounded-full px-3 py-1 shadow text-[#E05A1A] text-xs font-bold border border-[#E05A1A]">
                Changer
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center py-6 gap-6">
              {/* Grand bouton caméra animé */}
              <button type="button"
                onClick={() => (document.getElementById('capture') as HTMLInputElement)?.click()}
                aria-label="Prendre une photo du dépôt"
                className="group relative grid h-44 w-44 place-items-center rounded-3xl bg-[#2A7A3A] text-white shadow-glow transition-transform active:scale-95 hover:scale-105 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2A7A3A]/40">
                <span className="absolute inset-0 rounded-3xl bg-[#2A7A3A]/30 animate-ping-slow" />
                <span className="relative text-7xl animate-wiggle">📸</span>
              </button>
              <p className="font-display text-xl font-extrabold text-[#2A7A3A]">Prendre une photo</p>

              <div className="flex items-center gap-3 w-full max-w-xs">
                <div className="flex-1 h-px bg-[#DEDED0]" />
                <span className="text-xs text-[#5C5C48] font-medium">ou</span>
                <div className="flex-1 h-px bg-[#DEDED0]" />
              </div>

              <button type="button" onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl border-2 border-[#DEDED0] hover:border-[#2A7A3A] hover:bg-[#E8F5EA]/30 transition-colors text-sm font-semibold text-[#5C5C48]">
                <span className="text-xl">📤</span>
                Importer depuis la galerie
              </button>
            </div>
          )}
          <input id="capture" type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          <p className="text-xs text-[#5C5C48] text-center">Photo compressée automatiquement · Signalement anonyme par défaut</p>

          {/* Canaux messagerie */}
          <div className="mt-6 rounded-2xl border border-[#DEDED0] bg-white p-4">
            <p className="text-xs font-bold text-[#5C5C48] uppercase tracking-wide mb-3 text-center">Ou signalez directement via</p>
            <div className="grid grid-cols-3 gap-3">
              <a href="https://wa.me/2250700000099?text=Je+veux+signaler+un+dépôt+sauvage+à+Abidjan"
                target="_blank" rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 border-transparent hover:border-[#25D366] hover:bg-[#25D366]/5 active:scale-95 transition-all">
                <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="48" height="48" rx="12" fill="#25D366"/>
                  <path d="M24 8C15.163 8 8 15.163 8 24c0 2.837.745 5.5 2.047 7.81L8 40l8.393-2.008A15.935 15.935 0 0 0 24 40c8.837 0 16-7.163 16-16S32.837 8 24 8Z" fill="white"/>
                  <path d="M31.5 27.4c-.4-.2-2.4-1.2-2.8-1.3-.4-.1-.7-.2-1 .2-.3.4-1.1 1.3-1.3 1.6-.2.3-.5.3-.9.1-.4-.2-1.7-.6-3.2-2-.8-.7-1.3-1.6-1.5-1.9-.2-.4 0-.6.1-.8l.6-.7c.2-.2.2-.4.3-.6.1-.2 0-.4 0-.6-.1-.2-1-2.4-1.4-3.3-.3-.8-.7-.7-.9-.7h-.8c-.3 0-.7.1-1 .5-.4.4-1.4 1.3-1.4 3.2s1.4 3.7 1.6 4c.2.3 2.7 4.1 6.6 5.7 3.9 1.7 3.9 1.1 4.6 1 .7-.1 2.4-.9 2.7-1.9.3-.9.3-1.7.2-1.9-.1-.1-.4-.2-.8-.4Z" fill="#25D366"/>
                </svg>
                <span className="text-xs font-bold text-[#16160F]">WhatsApp</span>
              </a>

              <a href="https://t.me/EcoAbidjanBot"
                target="_blank" rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 border-transparent hover:border-[#2AABEE] hover:bg-[#2AABEE]/5 active:scale-95 transition-all">
                <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="48" height="48" rx="12" fill="#2AABEE"/>
                  <path d="M9.5 23.5 38 12l-5 26-9-8-5 4 1-8 15-13-17 10-8-2Z" fill="white"/>
                </svg>
                <span className="text-xs font-bold text-[#16160F]">Telegram</span>
              </a>

              <a href="https://snapchat.com/add/ecoabidjan"
                target="_blank" rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 border-transparent hover:border-[#FFFC00] hover:bg-[#FFFC00]/10 active:scale-95 transition-all">
                <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="48" height="48" rx="12" fill="#FFFC00"/>
                  <path d="M24 9c-3.3 0-6.7 2.1-7.6 6-.3 1.4-.3 2.8-.3 4.2-.7.1-1.4-.1-2-.4-.3-.1-.5-.1-.6.2-.1.5.3.8.7 1 1 .4 1.7.7 1.9 1.5.1.3-.1.6-.3.9-1.1 1.6-2.7 2.8-4.4 3.3-.3.1-.5.3-.4.6.1.4.6.7 1.3.9.4.1.7.2.8.5.1.3 0 .5-.2.8-.3.3-.7.5-.7.9 0 .5.5.8 1.1.8.4 0 .8-.1 1.2-.1 1 0 1.9.4 2.8 1.1 1.3 1 2.5 1.5 4 1.5s2.7-.5 4-1.5c.9-.7 1.8-1.1 2.8-1.1.4 0 .8.1 1.2.1.6 0 1.1-.3 1.1-.8 0-.4-.4-.6-.7-.9-.2-.3-.3-.5-.2-.8.1-.3.4-.4.8-.5.7-.2 1.2-.5 1.3-.9.1-.3-.1-.5-.4-.6-1.7-.5-3.3-1.7-4.4-3.3-.2-.3-.4-.6-.3-.9.2-.8.9-1.1 1.9-1.5.4-.2.8-.5.7-1-.1-.3-.3-.3-.6-.2-.6.3-1.3.5-2 .4 0-1.4 0-2.8-.3-4.2C30.7 11.1 27.3 9 24 9Z" fill="#16160F"/>
                </svg>
                <span className="text-xs font-bold text-[#16160F]">Snapchat</span>
              </a>
            </div>
            <p className="text-[10px] text-[#5C5C48] text-center mt-2">Notre chatbot reçoit vos photos 24h/24 et les transmet automatiquement</p>
          </div>
        </div>
      )}

      {/* Step 1: Location */}
      {step === 1 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">2. Lieu du dépôt</h2>
          {/* Consent for geolocation */}
          <div className="mb-4 p-3 bg-[#E8F5EA] rounded-xl text-xs text-[#5C5C48]">
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={consentGiven} onChange={e => setConsentGiven(e.target.checked)} className="mt-0.5" />
              <span>J'accepte que ma position GPS soit utilisée pour ce signalement (loi n° 2013-450 sur les données personnelles)</span>
            </label>
          </div>
          <Button onClick={requestGeo} variant="outline" className="w-full mb-4" disabled={geoLoading}>
            <span className="mr-2">📍</span>
            {geoLoading ? 'Localisation...' : 'Utiliser ma position GPS'}
          </Button>
          {lat && <p className="text-xs text-[#2A7A3A] mb-3">Position obtenue {geoAccuracy && `(précision : ±${geoAccuracy} m)`}</p>}
          <div className="mb-3">
            <Select
              label="Commune"
              value={commune}
              onChange={e => setCommmuneFallback(e.target.value as Commune)}
              options={COMMUNES.map(c => ({ value: c, label: c }))}
            />
          </div>
          <Input label="Adresse ou repère (optionnel)" placeholder="Ex. Rue du Canal, face au marché" value={address} onChange={e => setAddress(e.target.value)} />
        </Card>
      )}

      {/* Step 2: Identity */}
      {step === 2 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">3. Votre identité</h2>
          <div className="flex items-center justify-between mb-5 p-3 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm font-medium">Signalement anonyme</p>
              <p className="text-xs text-[#5C5C48]">Aucune donnée personnelle n'est enregistrée</p>
            </div>
            <button
              onClick={() => setAnonymous(p => !p)}
              className={`relative w-12 h-6 rounded-full transition-colors ${anonymous ? 'bg-[#2A7A3A]' : 'bg-gray-300'}`}
              aria-pressed={anonymous}
              aria-label="Signalement anonyme"
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${anonymous ? '' : 'translate-x-6'}`} />
            </button>
          </div>
          {!anonymous && (
            <div className="space-y-4">
              <Input label="Nom et prénom" placeholder="Ex. Koné Aminata" value={reporterName} onChange={e => setReporterName(e.target.value)} />
              <Input label="Téléphone (facultatif)" type="tel" placeholder="+225 07 00 00 00 00" value={reporterPhone} onChange={e => setReporterPhone(e.target.value)} />
            </div>
          )}
        </Card>
      )}

      {/* Step 3: AI Analysis */}
      {step === 3 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">4. Analyse par l'IA</h2>
          {analyzing ? (
            <div className="flex flex-col items-center py-8 gap-3">
              <span className="text-4xl animate-spin inline-block">⏳</span>
              <p className="text-sm text-[#5C5C48]">Analyse de la photo en cours…</p>
              <p className="text-xs text-[#5C5C48]/70">Snowflake Cortex · IA multimodale</p>
            </div>
          ) : analysis ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="success">Analysé par IA</Badge>
                <Badge variant={riskColors[analysis.risque]}>Risque {analysis.risque}</Badge>
                <Badge variant={priorityColors[analysis.priorite]}>Priorité {analysis.priorite}</Badge>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl text-sm">{analysis.resume}</div>
              <div>
                <p className="text-xs font-semibold text-[#5C5C48] mb-2">Matériaux détectés</p>
                <div className="space-y-1.5">
                  {analysis.materiaux.map(m => (
                    <div key={m.nom} className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-[#DEDED0] rounded-full overflow-hidden">
                        <div className="h-full bg-[#2A7A3A] rounded-full" style={{ width: `${m.pourcentage}%` }} />
                      </div>
                      <span className="text-xs w-24 text-right capitalize">{m.nom} {m.pourcentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-gray-50 rounded-xl"><p className="text-xs text-[#5C5C48]">Volume estimé</p><p className="font-semibold">{analysis.volume_m3} m³</p></div>
                <div className="p-3 bg-gray-50 rounded-xl"><p className="text-xs text-[#5C5C48]">Poids estimé</p><p className="font-semibold">{analysis.poids_estime_kg} kg</p></div>
              </div>
              <p className="text-xs text-[#5C5C48]">Vous pouvez corriger les informations si nécessaire.</p>
            </div>
          ) : (
            <Button onClick={runAnalysis} className="w-full"><span className="mr-2">👁️</span>Lancer l'analyse IA</Button>
          )}
        </Card>
      )}

      {/* Step 4: Confirmation */}
      {step === 4 && trackingNumber && (
        <div className="rounded-2xl border-2 border-[#DEDED0] bg-white p-6 text-center space-y-4">
          <div className="text-5xl">✅</div>
          <h2 className="font-display text-2xl font-extrabold text-[#2A7A3A]">Signalement envoyé !</h2>
          <p className="text-[#5C5C48] text-sm">Votre numéro de suivi :</p>
          {/* Dark code badge */}
          <div className="mx-auto w-fit rounded-2xl bg-[#16160F] px-6 py-4 font-mono text-2xl font-bold tracking-widest text-white">
            {trackingNumber}
          </div>
          <p className="text-xs text-[#5C5C48]">
            L'administrateur a été notifié avec la photo, la localisation et l'analyse IA.
          </p>
          <div className="flex flex-col gap-3 pt-2">
            <Button onClick={() => router.push('/historique')} className="shadow-glow">Voir mes signalements</Button>
            <Button variant="outline" onClick={() => { setStep(0); setPhotoPreview(null); setAnalysis(null); setTrackingNumber(''); }}>
              Faire un autre signalement
            </Button>
          </div>
        </div>
      )}

      {/* Navigation */}
      {step < STEPS.length - 1 && (
        <div className="flex justify-between mt-6 gap-3">
          {step > 0 ? (
            <Button variant="outline" onClick={() => setStep(s => s - 1)}><span className="mr-1">‹</span> Retour</Button>
          ) : <div />}
          {step === 3 && analysis ? (
            <Button onClick={submit} className="flex-1">
              <span className="mr-2">✅</span> Envoyer le signalement
            </Button>
          ) : step !== 3 ? (
            <Button onClick={nextStep} className="flex-1">
              Continuer <span className="ml-1">›</span>
            </Button>
          ) : (
            <Button onClick={runAnalysis} className="flex-1" disabled={analyzing}>
              {analyzing ? <span className="mr-2 animate-spin inline-block">⏳</span> : null}
              {analyzing ? 'Analyse…' : 'Analyser la photo'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
