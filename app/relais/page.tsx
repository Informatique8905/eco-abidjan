'use client';
import { useState } from 'react';
import { QrCode, CheckCircle, Loader, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { scanDeposit, formatFCFA } from '@/src/services/storage';

export default function RelaisPage() {
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<{ success: boolean; pointsBefore?: number; pointsAfter?: number; declarationId?: string } | null>(null);
  const [userName, setUserName] = useState('');

  async function handleScan(inputCode?: string) {
    const c = (inputCode ?? code).trim().toUpperCase();
    if (!c) { toast('Veuillez saisir un code.', 'error'); return; }
    setScanning(true);
    await new Promise(r => setTimeout(r, 800));
    const res = scanDeposit(c);
    setScanning(false);
    if (!res.success) { toast('Code non trouvé ou déjà utilisé.', 'error'); return; }
    setResult({ success: true, pointsBefore: res.pointsBefore, pointsAfter: res.pointsAfter });
    toast('Dépôt validé ! Points crédités.', 'success');
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Espace Point Relais</h1>
      <p className="text-[#5C5C48] text-sm mb-8">Scannez le code d'un usager pour valider son dépôt et créditer ses points.</p>

      {!result ? (
        <Card className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-[#E8F5EA] rounded-full flex items-center justify-center mx-auto mb-3">
              <QrCode className="w-8 h-8 text-[#2A7A3A]" strokeWidth={2} />
            </div>
            <h2 className="text-lg font-semibold">Scanner un code</h2>
          </div>

          <div className="space-y-4">
            <Input
              label="Code usager"
              placeholder="ECO-4F7K2"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              hint="Saisir ou scanner le code QR de l'usager"
            />

            <div className="bg-[#E8F5EA] p-3 rounded-xl text-xs text-[#5C5C48]">
              <strong className="text-[#2A7A3A]">Codes de démo disponibles :</strong>
              <br />ECO-DEC001 · ECO-4F7K2
            </div>

            <Button onClick={() => handleScan()} className="w-full" disabled={scanning}>
              {scanning ? <><Loader className="w-4 h-4 mr-2 animate-spin" />Validation…</> : <><Search className="w-4 h-4 mr-2" />Valider le code</>}
            </Button>

            <Button variant="outline" className="w-full" onClick={() => handleScan('ECO-4F7K2')}>
              Simuler scan ECO-4F7K2
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="p-6 text-center">
          <div className="w-16 h-16 bg-[#E8F5EA] rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-[#2A7A3A]" />
          </div>
          <h2 className="text-xl font-bold text-[#16160F] mb-2">Dépôt validé !</h2>
          <p className="text-sm text-[#5C5C48] mb-6">Les points ont été crédités instantanément sur le compte de l'usager.</p>

          <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-[#5C5C48]">Solde avant</span>
              <span className="font-semibold">{result.pointsBefore} points</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#5C5C48]">Points gagnés</span>
              <span className="font-semibold text-[#2A7A3A]">+ {(result.pointsAfter ?? 0) - (result.pointsBefore ?? 0)} points</span>
            </div>
            <div className="border-t border-[#DEDED0] pt-3 flex justify-between font-bold text-base">
              <span>Nouveau solde</span>
              <span className="text-[#2A7A3A]">{result.pointsAfter} points</span>
            </div>
            <div className="text-xs text-[#5C5C48] pt-1">
              Équivalent : {formatFCFA((result.pointsAfter ?? 0) * 10)} en bons d'achat
            </div>
          </div>

          <Button onClick={() => { setResult(null); setCode(''); }} className="w-full">Valider un autre dépôt</Button>
        </Card>
      )}
    </div>
  );
}
