'use client';
import React, { createContext, useContext, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';
interface Toast { id: string; message: string; type: ToastType }
interface ToastContextValue { toast: (msg: string, type?: ToastType) => void }

const ToastCtx = createContext<ToastContextValue>({ toast: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now().toString();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);

  const icons = { success: CheckCircle, error: XCircle, info: Info };

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm md:bottom-6">
        {toasts.map(t => {
          const Icon = icons[t.type];
          return (
            <div key={t.id} className={cn('flex items-start gap-3 p-4 rounded-xl shadow-lg border text-sm animate-in slide-in-from-bottom-2 duration-200', {
              'bg-white border-[#2A7A3A] text-[#16160F]': t.type === 'success',
              'bg-white border-[#E05A1A] text-[#16160F]': t.type === 'error',
              'bg-white border-[#5C5C48] text-[#16160F]': t.type === 'info',
            })}>
              <Icon className={cn('w-5 h-5 mt-0.5 flex-shrink-0', { 'text-[#2A7A3A]': t.type === 'success', 'text-[#E05A1A]': t.type === 'error', 'text-[#5C5C48]': t.type === 'info' })} />
              <span className="flex-1">{t.message}</span>
              <button onClick={() => setToasts(p => p.filter(x => x.id !== t.id))} className="text-[#5C5C48] hover:text-[#16160F]"><X className="w-4 h-4" /></button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() { return useContext(ToastCtx); }
