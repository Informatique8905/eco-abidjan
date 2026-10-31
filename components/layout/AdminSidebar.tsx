'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, AlertTriangle, Map, Truck, Recycle, Users, MapPin, BarChart3, Settings, LogOut, Leaf, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logout, getNotifications } from '@/src/services/storage';
import { useEffect, useState } from 'react';

const NAV = [
  { label: 'Tableau de bord', href: '/admin/tableau-de-bord', icon: LayoutDashboard },
  { label: 'Signalements', href: '/admin/signalements', icon: AlertTriangle },
  { label: 'Carte', href: '/admin/carte', icon: Map },
  { label: 'Collectes & Tournées', href: '/admin/collectes', icon: Truck },
  { label: 'Recyclage', href: '/admin/recyclage', icon: Recycle },
  { label: 'Usagers', href: '/admin/usagers', icon: Users },
  { label: 'Points relais', href: '/admin/points-relais', icon: MapPin },
  { label: 'Simulation', href: '/admin/simulation', icon: BarChart3 },
  { label: 'Paramètres', href: '/admin/parametres', icon: Settings },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    setUnread(getNotifications().filter(n => !n.read).length);
  }, [pathname]);

  return (
    <aside className="hidden md:flex flex-col w-60 bg-[#0A2010] text-white min-h-screen sticky top-0 flex-shrink-0">
      <div className="p-5 border-b border-white/10">
        <Link href="/admin/tableau-de-bord" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#2A7A3A] rounded-lg flex items-center justify-center">
            <Leaf className="w-5 h-5 text-white" strokeWidth={2} />
          </div>
          <div>
            <div className="font-bold text-sm">EcoAbidjan</div>
            <div className="text-xs text-white/50">Administration</div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-0.5" aria-label="Navigation administration">
        {NAV.map(item => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors', {
                'bg-[#2A7A3A] text-white': active,
                'text-white/70 hover:bg-white/10 hover:text-white': !active,
              })}
              aria-current={active ? 'page' : undefined}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
              {item.label}
              {item.label === 'Signalements' && unread > 0 && (
                <span className="ml-auto w-5 h-5 bg-[#E05A1A] rounded-full text-white text-[10px] flex items-center justify-center font-bold">{unread}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/10 space-y-1">
        <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:bg-white/10 hover:text-white">
          Vue usager
        </Link>
        <button
          onClick={() => { logout(); router.push('/connexion'); }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:bg-white/10 hover:text-white w-full"
        >
          <LogOut className="w-4 h-4" /> Se déconnecter
        </button>
      </div>
    </aside>
  );
}
