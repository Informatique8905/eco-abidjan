'use client';
import { useEffect } from 'react';
import { initializeStore } from '@/src/services/storage';

export default function StoreInit() {
  useEffect(() => { initializeStore(); }, []);
  return null;
}
