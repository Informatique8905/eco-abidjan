'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, MapPin, CreditCard, Star, Gift, Trophy, Filter } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getCurrentUser, getDeclarationsByUser, getReports, getTransactions, formatDate, formatFCFA } from '@/src/services/storage';
import { WASTE_LABELS } from '@/src/data/seed';
import type { User } from '@/src/types';

const STATUS_COLORS = { reçu: 'info', en_cours: 'warning', traité: 'success', en_attente: 'info', déposé: 'success', collecté: 'success', payé: 'success' } as const;

export default function HistoriquePage() {
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    const u = getCurrentUser();
    setUser(u);
    if (!u) return;
    const reports = getReports().filter(r => r.userId === u.id || (!r.anonymous && !r.userId));
    const declarations = getDeclarationsByUser(u.id);
    const txs = getTransactions(u.id);
    const all = [
      ...reports.map(r => ({ type: 'report', id: r.id, title: `Signalement ${r.trackingNumber}`, subtitle: `${r.commune} · ${r.address}`, status: r.status, date: r.createdAt })),
      ...declarations.map(d => ({ type: 'declaration', id: d.id, title: `Déclaration ${d.isLargeVolume ? 'gros volume' : 'petit volume'}`, subtitle: `${d.totalWeightKg.toFixed(1)} kg · ${d.items.map(i => WASTE_LABELS[i.type]).join(', ')}`, status: d.status, amount: d.isLargeVolume ? d.totalValue : undefined, points: !d.isLargeVolume ? d.pointsEarned : undefined, date: d.createdAt })),
      ...txs.filter(t => t.declarationId || t.reportId).map(t => ({ type: 'points', id: t.id, title: `${t.delta > 0 ? '+' : ''}${t.delta} points`, subtitle: t.reason, points: t.delta, date: t.createdAt })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setItems(all);
  }, []);

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <h1 className="text-xl font-bold mb-3">Historique</h1>
        <p className="text-[#5C5C48] text-sm mb-6">Connectez-vous pour voir votre historique.</p>
        <Button asChild><Link href="/connexion?redirect=/historique">Se connecter</Link></Button>
      </div>
    );
  }

  const filtered = filter === 'all' ? items : items.filter(i => i.type === filter);
  const icons: Record<string, typeof AlertTriangle> = { report: AlertTriangle, declaration: RefreshCw, deposit: MapPin, payment: CreditCard, points: Star, voucher: Gift, challenge: Trophy };
  const FILTERS = [{ val: 'all', label: 'Tout' }, { val: 'report', label: 'Signalements' }, { val: 'declaration', label: 'Recyclage' }, { val: 'points', label: 'Points' }];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Mon historique</h1>

      {/* Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {FILTERS.map(f => (
          <button key={f.val} onClick={() => setFilter(f.val)} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === f.val ? 'bg-[#2A7A3A] text-white' : 'bg-gray-100 text-[#5C5C48] hover:bg-gray-200'}`}>{f.label}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-[#5C5C48]">
          <Filter className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Aucune activité</p>
          <p className="text-sm mt-1">Commencez par signaler un dépôt ou recycler vos déchets.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => {
            const Icon = icons[item.type] ?? Star;
            return (
              <Card key={item.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-[#E8F5EA] rounded-xl flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-[#2A7A3A]" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm truncate">{item.title}</p>
                      {item.status && <Badge variant={(STATUS_COLORS as any)[item.status] ?? 'outline'} className="flex-shrink-0">{item.status}</Badge>}
                    </div>
                    <p className="text-xs text-[#5C5C48] mt-0.5 truncate">{item.subtitle}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-[#5C5C48]">{formatDate(item.date)}</p>
                      {item.amount && <span className="text-xs font-semibold text-[#2A7A3A]">{formatFCFA(item.amount)}</span>}
                      {item.points && !item.amount && <span className={`text-xs font-semibold ${item.points > 0 ? 'text-[#2A7A3A]' : 'text-[#E05A1A]'}`}>{item.points > 0 ? '+' : ''}{item.points} pts</span>}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
