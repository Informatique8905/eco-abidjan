'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/layout/AdminSidebar';
import { getCurrentUser, initializeStore } from '@/src/services/storage';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initializeStore(); // garantit que les données demo sont là
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') {
      router.push('/connexion?redirect=/admin/tableau-de-bord');
    } else {
      setReady(true);
    }
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-5xl mb-3 animate-wiggle">🌿</div>
          <p className="text-[#5C5C48] text-sm">Chargement administration…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 overflow-auto p-4 md:p-6 max-w-full pb-20 md:pb-6">
        {children}
      </main>
    </div>
  );
}
