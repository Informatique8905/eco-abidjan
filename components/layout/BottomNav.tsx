'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const TABS = [
  { label: 'Accueil',    href: '/',           emoji: '🏠' },
  { label: 'Signaler',   href: '/signaler',   emoji: '📸' },
  { label: 'Recycler',   href: '/recycler',   emoji: '♻️' },
  { label: 'Challenges', href: '/challenges', emoji: '🏆' },
  { label: 'Profil',     href: '/profil',     emoji: '👤' },
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
              <span className={cn('text-xl leading-none', { 'drop-shadow-sm': active })}>{tab.emoji}</span>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
