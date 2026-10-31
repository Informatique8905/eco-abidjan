'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, AlertTriangle, RefreshCw, Trophy, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { label: 'Accueil', href: '/', icon: Home },
  { label: 'Signaler', href: '/signaler', icon: AlertTriangle },
  { label: 'Recycler', href: '/recycler', icon: RefreshCw },
  { label: 'Challenges', href: '/challenges', icon: Trophy },
  { label: 'Profil', href: '/profil', icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();
  if (pathname.startsWith('/admin')) return null;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#DEDED0] pb-safe" aria-label="Navigation principale mobile">
      <div className="flex">
        {TABS.map(tab => {
          const active = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn('flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] transition-colors', {
                'text-[#2A7A3A]': active,
                'text-[#5C5C48]': !active,
              })}
              aria-current={active ? 'page' : undefined}
            >
              <tab.icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
