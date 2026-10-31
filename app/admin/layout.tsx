'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/layout/AdminSidebar';
import { getCurrentUser } from '@/src/services/storage';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  useEffect(() => {
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') router.push('/connexion?redirect=/admin/tableau-de-bord');
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 overflow-auto p-6 max-w-full">
        {children}
      </main>
    </div>
  );
}
