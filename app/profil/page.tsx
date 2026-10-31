'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { User as UserIcon, Settings, LogOut, Star, TrendingUp, BarChart2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getCurrentUser, logout, formatFCFA } from '@/src/services/storage';
import { useRouter } from 'next/navigation';
import type { User } from '@/src/types';

export default function ProfilPage() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => { setUser(getCurrentUser()); }, []);

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <UserIcon className="w-12 h-12 text-[#5C5C48] mx-auto mb-4" />
        <h1 className="text-xl font-bold mb-3">Mon profil</h1>
        <p className="text-sm text-[#5C5C48] mb-6">Connectez-vous pour accéder à votre profil.</p>
        <Button asChild><Link href="/connexion?redirect=/profil">Se connecter</Link></Button>
      </div>
    );
  }

  function handleLogout() { logout(); router.push('/'); }

  const roleLabel = { citizen: 'Ménage', merchant: 'Commerçant', admin: 'Administrateur', relay: 'Point relais' }[user.role] ?? user.role;

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-5">
      <h1 className="text-2xl font-bold">Mon profil</h1>

      {/* Identity card */}
      <Card className="p-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-[#E8F5EA] rounded-full flex items-center justify-center">
            <span className="text-[#2A7A3A] font-bold text-xl">{user.firstName?.[0]}{user.name?.[0]}</span>
          </div>
          <div>
            <h2 className="text-lg font-bold">{user.firstName} {user.name}</h2>
            <p className="text-sm text-[#5C5C48]">+225 {user.phone}</p>
            <div className="flex gap-2 mt-1">
              <Badge variant="success">{roleLabel}</Badge>
              <Badge variant="outline">{user.commune}</Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Points', value: user.points.toLocaleString('fr-FR'), icon: Star },
          { label: 'kg recyclés', value: user.totalKgRecycled.toFixed(1), icon: TrendingUp },
          { label: 'Niveau', value: user.level, icon: BarChart2 },
        ].map(s => (
          <Card key={s.label} className="p-3 text-center">
            <s.icon className="w-5 h-5 text-[#2A7A3A] mx-auto mb-1" strokeWidth={2} />
            <p className="font-bold text-base">{s.value}</p>
            <p className="text-xs text-[#5C5C48]">{s.label}</p>
          </Card>
        ))}
      </div>

      <p className="text-xs text-[#5C5C48] text-center">{formatFCFA(user.points * 10)} disponibles en bons d'achat</p>

      {/* Links */}
      <Card>
        <nav>
          {[
            { label: 'Mon historique', href: '/historique', icon: BarChart2 },
            { label: 'Mes challenges', href: '/challenges', icon: Star },
            ...(user.role === 'admin' ? [{ label: 'Administration', href: '/admin/tableau-de-bord', icon: Settings }] : []),
          ].map((item, i) => (
            <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors text-sm font-medium ${i > 0 ? 'border-t border-[#DEDED0]' : ''}`}>
              <item.icon className="w-4 h-4 text-[#5C5C48]" /> {item.label}
            </Link>
          ))}
          <button onClick={handleLogout} className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors text-sm font-medium text-[#E05A1A] border-t border-[#DEDED0] w-full">
            <LogOut className="w-4 h-4" /> Se déconnecter
          </button>
        </nav>
      </Card>
    </div>
  );
}
