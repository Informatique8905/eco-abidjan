'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Trophy, Star, Target, Gift, CheckCircle, Loader } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { getCurrentUser, redeemPoints, formatFCFA } from '@/src/services/storage';
import { DEMO_CHALLENGES, DEMO_REWARDS } from '@/src/data/seed';
import type { User } from '@/src/types';

const LEVELS = [
  { name: 'Graine', minKg: 0, maxKg: 20, bonus: 0 },
  { name: 'Pousse', minKg: 20, maxKg: 100, bonus: 20 },
  { name: 'Arbre', minKg: 100, maxKg: 300, bonus: 50 },
  { name: 'Forêt', minKg: 300, maxKg: Infinity, bonus: 100 },
];

export default function ChallengesPage() {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [redeemed, setRedeemed] = useState<string[]>([]);

  useEffect(() => { setUser(getCurrentUser()); }, []);

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <Trophy className="w-12 h-12 text-[#2A7A3A] mx-auto mb-4" />
        <h1 className="text-xl font-bold mb-3">Challenges & Récompenses</h1>
        <p className="text-[#5C5C48] text-sm mb-6">Connectez-vous pour voir vos défis et échanger vos points.</p>
        <Button asChild><Link href="/connexion?redirect=/challenges">Se connecter</Link></Button>
      </div>
    );
  }

  const currentLevel = LEVELS.find(l => user.level === l.name) ?? LEVELS[0];
  const nextLevel = LEVELS.find(l => l.minKg > (currentLevel?.maxKg ?? 0)) ?? null;
  const levelProgress = nextLevel ? Math.min((user.totalKgRecycled - (currentLevel?.minKg ?? 0)) / ((nextLevel.minKg) - (currentLevel?.minKg ?? 0)) * 100, 100) : 100;

  async function handleRedeem(rewardId: string, pointsCost: number, title: string) {
    setRedeeming(rewardId);
    await new Promise(r => setTimeout(r, 600));
    const ok = redeemPoints(user!.id, pointsCost, `Bon d'achat : ${title}`);
    setRedeeming(null);
    if (ok) { setRedeemed(p => [...p, rewardId]); setUser(u => u ? { ...u, points: u.points - pointsCost } : u); toast(`Bon d'achat obtenu ! Présentez le QR code en caisse.`, 'success'); }
    else toast('Solde insuffisant.', 'error');
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold text-[#16160F]">Challenges & Récompenses</h1>

      {/* Points balance */}
      <Card className="p-5 bg-gradient-to-r from-[#2A7A3A] to-[#3A9A4A] text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/80 text-sm">Solde de points</p>
            <p className="text-4xl font-extrabold">{user.points.toLocaleString('fr-FR')}</p>
            <p className="text-white/70 text-xs mt-1">{formatFCFA(user.points * 10)} en bons d'achat</p>
          </div>
          <div className="text-right">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
              <Star className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-white/40 text-white bg-white/10">{user.level}</Badge>
          <span className="text-white/70 text-xs">{user.totalKgRecycled.toFixed(1)} kg recyclés</span>
        </div>
      </Card>

      {/* Level progress */}
      <Card>
        <CardHeader><CardTitle>Niveau actuel : {user.level}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {nextLevel ? (
            <>
              <p className="text-sm text-[#5C5C48]">Prochain niveau : <strong>{nextLevel.name}</strong> ({nextLevel.minKg} kg)</p>
              <div className="h-2.5 bg-[#DEDED0] rounded-full overflow-hidden">
                <div className="h-full bg-[#2A7A3A] rounded-full transition-all" style={{ width: `${levelProgress}%` }} />
              </div>
              <p className="text-xs text-[#5C5C48]">{user.totalKgRecycled.toFixed(1)} / {nextLevel.minKg} kg · {nextLevel.bonus} points bonus au niveau {nextLevel.name}</p>
            </>
          ) : (
            <div className="flex items-center gap-2 text-[#2A7A3A]"><CheckCircle className="w-5 h-5" /><span className="font-semibold">Niveau maximum atteint !</span></div>
          )}
          <div className="grid grid-cols-4 gap-2 pt-2">
            {LEVELS.map(l => (
              <div key={l.name} className={`p-2 rounded-lg text-center text-xs ${user.totalKgRecycled >= l.minKg ? 'bg-[#E8F5EA] text-[#2A7A3A] font-semibold' : 'bg-gray-50 text-[#5C5C48]'}`}>
                {user.totalKgRecycled >= l.minKg ? '🌿' : '·'}<br />{l.name}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Challenges */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Target className="w-5 h-5 text-[#2A7A3A]" />Défis du mois</h2>
        <div className="space-y-3">
          {DEMO_CHALLENGES.map(ch => {
            const pct = Math.min((ch.progress / ch.target) * 100, 100);
            return (
              <Card key={ch.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-sm">{ch.title}</p>
                    <p className="text-xs text-[#5C5C48]">{ch.description}</p>
                  </div>
                  <Badge variant="info">+{ch.points} pts</Badge>
                </div>
                <div className="h-2 bg-[#DEDED0] rounded-full overflow-hidden mb-1">
                  <div className="h-full bg-[#2A7A3A] rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-[#5C5C48]">{ch.progress} / {ch.target} {ch.unit}</p>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Rewards */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Gift className="w-5 h-5 text-[#2A7A3A]" />Catalogue de récompenses</h2>
        <p className="text-xs text-[#5C5C48] mb-3">100 points = 1 000 FCFA</p>
        <div className="space-y-3">
          {DEMO_REWARDS.map(rw => {
            const done = redeemed.includes(rw.id);
            const canAfford = user.points >= rw.pointsCost;
            return (
              <Card key={rw.id} className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#E8F5EA] rounded-xl flex items-center justify-center flex-shrink-0">
                    <Gift className="w-6 h-6 text-[#2A7A3A]" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{rw.title}</p>
                    <p className="text-xs text-[#5C5C48]">{rw.partner} · {rw.description}</p>
                    <p className="text-xs font-semibold text-[#2A7A3A] mt-1">{rw.pointsCost} points</p>
                  </div>
                  {done ? (
                    <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" />Obtenu</Badge>
                  ) : (
                    <Button size="sm" onClick={() => handleRedeem(rw.id, rw.pointsCost, rw.title)} disabled={!canAfford || redeeming === rw.id} variant={canAfford ? 'default' : 'outline'}>
                      {redeeming === rw.id ? <Loader className="w-4 h-4 animate-spin" /> : 'Échanger'}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
