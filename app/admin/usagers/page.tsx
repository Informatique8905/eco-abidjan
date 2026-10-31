'use client';
import { useState, useEffect } from 'react';
import { Users, Search } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getUsers, formatFCFA } from '@/src/services/storage';
import type { User } from '@/src/types';

const ROLE_LABELS = { citizen: 'Ménage', merchant: 'Commerçant', admin: 'Admin', relay: 'Point relais' };

export default function UsagersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => { setUsers(getUsers().filter(u => u.role !== 'admin')); }, []);

  const filtered = users.filter(u => `${u.firstName} ${u.name} ${u.phone} ${u.commune}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Usagers ({users.length})</h1>
        <button className="text-sm text-[#2A7A3A] hover:underline">Exporter CSV</button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5C5C48]" />
        <input
          type="search"
          placeholder="Rechercher par nom, téléphone ou commune…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full h-11 pl-10 pr-4 border border-[#DEDED0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2A7A3A]"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#DEDED0]">
        <table className="w-full text-sm">
          <thead className="bg-[#0A2010] text-white">
            <tr>
              {['Usager', 'Téléphone', 'Rôle', 'Commune', 'Points', 'kg recyclés', 'Niveau'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} className="border-t border-[#DEDED0] hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{u.firstName} {u.name}</td>
                <td className="px-4 py-3 text-[#5C5C48]">+225 {u.phone}</td>
                <td className="px-4 py-3"><Badge variant="outline">{ROLE_LABELS[u.role]}</Badge></td>
                <td className="px-4 py-3 text-[#5C5C48]">{u.commune}</td>
                <td className="px-4 py-3 text-[#2A7A3A] font-semibold">{u.points}</td>
                <td className="px-4 py-3">{u.totalKgRecycled.toFixed(1)} kg</td>
                <td className="px-4 py-3"><Badge variant="success">{u.level}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-center py-6 text-sm text-[#5C5C48]">Aucun usager</p>}
      </div>
    </div>
  );
}
