'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getDashboardStats, getNotifications, formatFCFA, resetStore } from '@/src/services/storage';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Button } from '@/components/ui/button';
import { api } from '@/src/services/api';

const COLORS = ['#2A7A3A', '#3A9A4A', '#5ABD6A', '#7ACD8A', '#9ADD9A', '#BAEDB0'];

export default function DashboardPage() {
  const [stats, setStats] = useState<ReturnType<typeof getDashboardStats> | null>(null);
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    const local = getDashboardStats();
    setStats(local);
    setNotifCount(getNotifications().filter(n => !n.read).length);

    // Tente de récupérer les KPIs Snowflake en arrière-plan
    api.getKpis().then(kpis => {
      if (kpis?.summary) {
        setStats(prev => prev ? {
          ...prev,
          totalWeightKg: kpis.summary.TOTAL_WEIGHT_KG ?? prev.totalWeightKg,
          totalRemunerationFCFA: kpis.summary.TOTAL_REMUNERATION_FCFA ?? prev.totalRemunerationFCFA,
          totalReports: kpis.summary.TOTAL_REPORTS ?? prev.totalReports,
          treatedReports: kpis.summary.TREATED_REPORTS ?? prev.treatedReports,
        } : prev);
      }
    }).catch(() => {});
  }, []);

  if (!stats) return <div className="animate-pulse space-y-4"><div className="skeleton h-32 rounded-xl" /><div className="skeleton h-64 rounded-xl" /></div>;

  const communeData = Object.entries(stats.byCommune).map(([commune, d]) => ({ commune, kg: d.weightKg, signalements: d.reports }));
  const pieData = [
    { name: 'Plastique', value: Math.round(stats.totalWeightKg * 0.45) },
    { name: 'Métal', value: Math.round(stats.totalWeightKg * 0.25) },
    { name: 'Carton', value: Math.round(stats.totalWeightKg * 0.20) },
    { name: 'Autre', value: Math.round(stats.totalWeightKg * 0.10) },
  ];
  const topCommune = communeData.sort((a, b) => b.kg - a.kg)[0];

  const KPI = [
    { label: 'Tonnage collecté', value: `${stats.totalWeightKg.toFixed(0)} kg`, emoji: '📈', color: 'text-[#2A7A3A]' },
    { label: 'Rémunérations', value: formatFCFA(stats.totalRemunerationFCFA), emoji: '💰', color: 'text-[#2A7A3A]' },
    { label: 'Points distribués', value: stats.totalPointsDistributed.toLocaleString('fr-FR'), emoji: '⭐', color: 'text-[#2A7A3A]' },
    { label: 'Signalements ouverts', value: String(stats.openReports), emoji: '⚠️', color: 'text-[#E05A1A]' },
    { label: 'Signalements traités', value: String(stats.treatedReports), emoji: '✅', color: 'text-[#2A7A3A]' },
    { label: 'Coût évité', value: formatFCFA(stats.savedCostFCFA), emoji: '📊', color: 'text-[#2A7A3A]' },
    { label: 'Coût collecte', value: formatFCFA(stats.collectionCostFCFA), emoji: '🚚', color: 'text-[#5C5C48]' },
    { label: 'Notifications', value: String(notifCount), emoji: '🔄', color: notifCount > 0 ? 'text-[#E05A1A]' : 'text-[#5C5C48]' },
  ];

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#16160F]">Tableau de bord</h1>
          <p className="text-[#5C5C48] text-sm">Données en temps réel</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { resetStore(); window.location.reload(); }}>
          Réinitialiser
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI.map(k => (
          <Card key={k.label} className="p-4">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs text-[#5C5C48] font-medium">{k.label}</p>
              <span className="text-base flex-shrink-0">{k.emoji}</span>
            </div>
            <p className={`text-xl font-extrabold ${k.color}`}>{k.value}</p>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Bar chart by commune */}
        <Card>
          <CardHeader>
            <CardTitle>Tonnage par commune</CardTitle>
            <p className="text-xs text-[#5C5C48]">
              {topCommune ? `${topCommune.commune} concentre le plus de déchets (${topCommune.kg} kg)` : 'Données en attente'}
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={communeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DEDED0" />
                <XAxis dataKey="commune" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => [`${v} kg`, 'Tonnage']} />
                <Bar dataKey="kg" fill="#2A7A3A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie chart by material */}
        <Card>
          <CardHeader>
            <CardTitle>Répartition par matière</CardTitle>
            <p className="text-xs text-[#5C5C48]">Le plastique représente ~45% du volume collecté</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any, n: any) => [`${v} kg`, n]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 justify-center mt-2">
              {pieData.map((d, i) => <div key={d.name} className="flex items-center gap-1.5 text-xs"><div className="w-3 h-3 rounded-full" style={{ background: COLORS[i] }} />{d.name}</div>)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Signalements par commune */}
      <Card>
        <CardHeader>
          <CardTitle>Signalements par commune</CardTitle>
          <p className="text-xs text-[#5C5C48]">Nombre de dépôts sauvages signalés par zone</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={communeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#DEDED0" />
              <XAxis dataKey="commune" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="signalements" fill="#E05A1A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
