'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logout, getNotifications } from '@/src/services/storage';
import { useEffect, useState } from 'react';

const NAV = [
  { label: 'Tableau de bord', href: '/admin/tableau-de-bord', emoji: '🏠' },
  { label: 'Signalements',    href: '/admin/signalements',    emoji: '⚠️' },
  { label: 'Carte',           href: '/admin/carte',           emoji: '🗺️' },
  { label: 'Collectes',       href: '/admin/collectes',       emoji: '🚚' },
  { label: 'Recyclage',       href: '/admin/recyclage',       emoji: '♻️' },
  { label: 'Usagers',         href: '/admin/usagers',         emoji: '👥' },
  { label: 'Points relais',   href: '/admin/points-relais',   emoji: '📍' },
  { label: 'Simulation',      href: '/admin/simulation',      emoji: '📊' },
  { label: 'Paramètres',      href: '/admin/parametres',      emoji: '⚙️' },
];

export default function AdminSidebar() {
  const pathname  = usePathname();
  const router    = useRouter();
  const [unread,  setUnread]  = useState(0);
  const [drawer,  setDrawer]  = useState(false);

  useEffect(() => {
    setUnread(getNotifications().filter(n => !n.read).length);
    setDrawer(false); // ferme le drawer sur navigation
  }, [pathname]);

  const NavLink = ({ item, onClick }: { item: { label: string; href: string; emoji: string; isMore?: boolean }; onClick?: () => void }) => {
    const active = pathname === item.href;
    return (
      <Link href={item.href} onClick={onClick}
        className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors', {
          'bg-[#2A7A3A] text-white': active,
          'text-white/70 hover:bg-white/10 hover:text-white': !active,
        })}
        aria-current={active ? 'page' : undefined}>
        <span className="text-base flex-shrink-0">{item.emoji}</span>
        {item.label}
        {item.label === 'Signalements' && unread > 0 && (
          <span className="ml-auto w-5 h-5 bg-[#E05A1A] rounded-full text-white text-[10px] flex items-center justify-center font-bold">{unread}</span>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* ── Sidebar desktop ── */}
      <aside className="hidden md:flex flex-col w-60 bg-[#0A2010] text-white min-h-screen sticky top-0 flex-shrink-0">
        <div className="p-5 border-b border-white/10">
          <Link href="/admin/tableau-de-bord" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#2A7A3A] rounded-lg flex items-center justify-center">
              <span className="text-lg">🌿</span>
            </div>
            <div>
              <div className="font-bold text-sm">EcoAbidjan</div>
              <div className="text-xs text-white/50">Administration</div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-0.5" aria-label="Navigation administration">
          {NAV.map(item => <NavLink key={item.href} item={item} />)}
        </nav>

        <div className="p-3 border-t border-white/10 space-y-1">
          <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:bg-white/10 hover:text-white">
            Vue usager
          </Link>
          <button onClick={() => { logout(); router.push('/connexion'); }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:bg-white/10 hover:text-white w-full">
            <span>🚪</span> Se déconnecter
          </button>
        </div>
      </aside>

      {/* ── Header mobile ── */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#0A2010] text-white flex items-center justify-between px-4 h-14 border-b border-white/10">
        <Link href="/admin/tableau-de-bord" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#2A7A3A] rounded-lg flex items-center justify-center">
            <span className="text-lg">🌿</span>
          </div>
          <span className="font-bold text-sm">Admin EcoAbidjan</span>
          {unread > 0 && <span className="w-5 h-5 bg-[#E05A1A] rounded-full text-white text-[10px] flex items-center justify-center font-bold">{unread}</span>}
        </Link>
        <button onClick={() => setDrawer(true)} aria-label="Ouvrir le menu" className="p-2 rounded-lg hover:bg-white/10">
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* ── Drawer mobile (menu complet) ── */}
      {drawer && (
        <div className="md:hidden fixed inset-0 z-[60] flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDrawer(false)} />
          <aside className="relative w-64 bg-[#0A2010] text-white h-full flex flex-col">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-[#2A7A3A] rounded-lg flex items-center justify-center">
                  <span className="text-lg">🌿</span>
                </div>
                <span className="font-bold text-sm">EcoAbidjan Admin</span>
              </div>
              <button onClick={() => setDrawer(false)} className="p-1 rounded-lg hover:bg-white/10"><X className="w-5 h-5" /></button>
            </div>
            <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
              {NAV.map(item => <NavLink key={item.href} item={item} onClick={() => setDrawer(false)} />)}
            </nav>
            <div className="p-3 border-t border-white/10 space-y-1">
              <Link href="/" onClick={() => setDrawer(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:bg-white/10 hover:text-white">
                Vue usager
              </Link>
              <button onClick={() => { logout(); router.push('/connexion'); }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:bg-white/10 hover:text-white w-full">
                <span>🚪</span> Se déconnecter
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Espace pour le header mobile fixe */}
      <div className="md:hidden h-14 flex-shrink-0" />
    </>
  );
}
