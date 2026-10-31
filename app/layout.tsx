import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/ui/toast';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import StoreInit from '@/components/StoreInit';

export const metadata: Metadata = {
  title: 'EcoAbidjan – Signalement & Recyclage',
  description: 'Signalez les dépôts sauvages et valorisez vos déchets recyclables à Abidjan grâce à l\'intelligence artificielle.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'EcoAbidjan' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#2A7A3A',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@700;800;900&family=Nunito:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossOrigin="anonymous" />
      </head>
      <body>
        <StoreInit />
        <ToastProvider>
          <Header />
          <main className="min-h-screen pb-20 md:pb-0">
            {children}
          </main>
          <BottomNav />
        </ToastProvider>
      </body>
    </html>
  );
}
