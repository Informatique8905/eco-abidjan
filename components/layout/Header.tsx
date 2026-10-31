'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Leaf, Bell, Menu, X, User, LogOut, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCurrentUser, logout, getNotifications, markAllRead } from '@/src/services/storage';
import type { User as UserType, Notification } from '@/src/types';
import { formatDate } from '@/src/services/storage';

const NAV = [
  { label: 'Accueil', href: '/' },
  { label: 'Signaler', href: '/signaler' },
  { label: 'Recycler', href: '/recycler' },
  { label: 'Challenges', href: '/challenges' },
  { label: 'Historique', href: '/historique' },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserType | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    setUser(getCurrentUser());
    setNotifs(getNotifications());
  }, [pathname]);

  const unread = notifs.filter(n => !n.read).length;

  function handleLogout() {
    logout();
    setUser(null);
    setUserMenuOpen(false);
    router.push('/');
  }

  if (pathname.startsWith('/admin')) return null;

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur border-b border-[#DEDED0]">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 bg-[#2A7A3A] rounded-lg flex items-center justify-center">
            <Leaf className="w-5 h-5 text-white" strokeWidth={2} />
          </div>
          <span className="font-bold text-lg text-[#16160F]">EcoAbidjan</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Navigation principale">
          {NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={cn('px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150', {
                'bg-[#E8F5EA] text-[#2A7A3A]': pathname === item.href,
                'text-[#5C5C48] hover:bg-gray-50 hover:text-[#16160F]': pathname !== item.href,
              })}
              aria-current={pathname === item.href ? 'page' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Notifications (admin only visible if user is admin) */}
          {user?.role === 'admin' && (
            <div className="relative">
              <button
                className="relative p-2 rounded-lg hover:bg-gray-100 text-[#5C5C48] min-h-[44px] min-w-[44px] flex items-center justify-center"
                onClick={() => { setNotifOpen(p => !p); markAllRead(); setNotifs(n => n.map(x => ({ ...x, read: true }))); }}
                aria-label={`${unread} notification${unread !== 1 ? 's' : ''} non lue${unread !== 1 ? 's' : ''}`}
              >
                <Bell className="w-5 h-5" strokeWidth={2} />
                {unread > 0 && <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#E05A1A] rounded-full text-white text-[10px] flex items-center justify-center font-bold">{unread > 9 ? '9+' : unread}</span>}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-[#DEDED0] rounded-xl shadow-lg z-50 max-h-96 overflow-y-auto">
                  <div className="p-3 border-b border-[#DEDED0] flex items-center justify-between">
                    <span className="font-semibold text-sm">Notifications</span>
                    <button onClick={() => setNotifOpen(false)} className="text-[#5C5C48] hover:text-[#16160F]"><X className="w-4 h-4" /></button>
                  </div>
                  {notifs.length === 0 ? (
                    <p className="p-4 text-sm text-[#5C5C48] text-center">Aucune notification</p>
                  ) : notifs.slice(0, 10).map(n => (
                    <div key={n.id} className="p-3 border-b border-[#DEDED0]/50 hover:bg-gray-50">
                      <p className="text-sm font-medium text-[#16160F]">{n.title}</p>
                      <p className="text-xs text-[#5C5C48] mt-0.5">{n.message}</p>
                      <p className="text-xs text-[#5C5C48]/70 mt-1">{formatDate(n.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* User menu or login */}
          {user ? (
            <div className="relative">
              <button
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-sm font-medium text-[#16160F] min-h-[44px]"
                onClick={() => setUserMenuOpen(p => !p)}
                aria-expanded={userMenuOpen}
              >
                <div className="w-7 h-7 bg-[#E8F5EA] rounded-full flex items-center justify-center text-[#2A7A3A] font-bold text-xs">
                  {user.firstName?.[0]}{user.name?.[0]}
                </div>
                <span className="hidden md:block">{user.firstName} {user.name}</span>
                <ChevronDown className="w-4 h-4 text-[#5C5C48]" />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-[#DEDED0] rounded-xl shadow-lg z-50">
                  <Link href="/profil" className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-gray-50" onClick={() => setUserMenuOpen(false)}>
                    <User className="w-4 h-4" /> Mon profil
                  </Link>
                  {user.role === 'admin' && (
                    <Link href="/admin/tableau-de-bord" className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-gray-50 border-t border-[#DEDED0]" onClick={() => setUserMenuOpen(false)}>
                      Administration
                    </Link>
                  )}
                  <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-gray-50 w-full text-left border-t border-[#DEDED0] text-[#E05A1A]">
                    <LogOut className="w-4 h-4" /> Se déconnecter
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/connexion" className="hidden md:flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2A7A3A] text-white text-sm font-semibold hover:bg-[#225F2F] transition-colors min-h-[44px]">
              Se connecter
            </Link>
          )}

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
            onClick={() => setMenuOpen(p => !p)}
            aria-label="Menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="md:hidden border-t border-[#DEDED0] bg-white px-4 py-3">
          <nav className="flex flex-col gap-1">
            {NAV.map(item => (
              <Link key={item.href} href={item.href} className={cn('px-3 py-3 rounded-lg text-sm font-medium', { 'bg-[#E8F5EA] text-[#2A7A3A]': pathname === item.href, 'text-[#5C5C48]': pathname !== item.href })} onClick={() => setMenuOpen(false)}>{item.label}</Link>
            ))}
            {!user && <Link href="/connexion" className="mt-2 px-3 py-3 rounded-xl bg-[#2A7A3A] text-white text-sm font-semibold text-center" onClick={() => setMenuOpen(false)}>Se connecter</Link>}
          </nav>
        </div>
      )}
    </header>
  );
}
