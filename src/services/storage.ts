'use client';
import type { User, Report, Declaration, RelayPoint, CollectionTour, Notification, PointTransaction, PricingConfig } from '../types';
import { PRICING } from '../data/seed';

const KEYS = {
  users: 'eco_users',
  reports: 'eco_reports',
  declarations: 'eco_declarations',
  relayPoints: 'eco_relay_points',
  tours: 'eco_tours',
  notifications: 'eco_notifications',
  transactions: 'eco_transactions',
  pricing: 'eco_pricing',
  currentUser: 'eco_current_user',
  initialized: 'eco_initialized',
};

function get<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}

function set<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function initializeStore(): void {
  if (get(KEYS.initialized, false)) return;
  // Crée uniquement le compte administrateur — pas de données fictives
  const adminPhone = process.env.NEXT_PUBLIC_ADMIN_PHONE ?? '0700000000';
  const adminUser: User = {
    id: 'admin-001',
    phone: adminPhone,
    name: 'Admin',
    firstName: 'EcoAbidjan',
    role: 'admin',
    commune: 'Plateau',
    points: 0,
    totalKgRecycled: 0,
    level: 'Graine',
    pin: '0000',
    createdAt: new Date().toISOString(),
  };
  set(KEYS.users, [adminUser]);
  set(KEYS.reports, []);
  set(KEYS.declarations, []);
  set(KEYS.relayPoints, []);
  set(KEYS.tours, []);
  set(KEYS.notifications, []);
  set(KEYS.transactions, []);
  set(KEYS.pricing, PRICING);
  set(KEYS.initialized, true);
}

export function resetStore(): void {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  initializeStore();
}

// ── Auth ─────────────────────────────────────────────────────────
export function login(phone: string): User | null {
  const users = get<User[]>(KEYS.users, []);
  const normalized = phone.replace(/\D/g, '').slice(-8); // derniers 8 chiffres
  const user = users.find(u => u.phone.replace(/\D/g, '').slice(-8) === normalized);
  if (user) { set(KEYS.currentUser, user.id); return user; }
  return null;
}

export function logout(): void { localStorage.removeItem(KEYS.currentUser); }

export function getCurrentUser(): User | null {
  const id = get<string | null>(KEYS.currentUser, null);
  if (!id) return null;
  return get<User[]>(KEYS.users, []).find(u => u.id === id) ?? null;
}

export function registerUser(data: Omit<User, 'id' | 'points' | 'totalKgRecycled' | 'level' | 'createdAt'>): User {
  const users = get<User[]>(KEYS.users, []);
  const newUser: User = {
    ...data,
    id: 'u' + Date.now(),
    points: 0,
    totalKgRecycled: 0,
    level: 'Graine',
    createdAt: new Date().toISOString(),
  };
  set(KEYS.users, [...users, newUser]);
  set(KEYS.currentUser, newUser.id);
  return newUser;
}

// ── Reports ──────────────────────────────────────────────────────
export function getReports(): Report[] { return get<Report[]>(KEYS.reports, []); }

export function addReport(report: Omit<Report, 'id' | 'trackingNumber' | 'createdAt' | 'updatedAt'>): Report {
  const reports = getReports();
  const seq = String(reports.length + 1).padStart(5, '0');
  const newReport: Report = {
    ...report,
    id: 'sig' + Date.now(),
    trackingNumber: `SIG-2026-${seq}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  set(KEYS.reports, [newReport, ...reports]);
  addNotification({ type: 'report', title: `Nouveau signalement – ${report.commune}`, message: `${newReport.trackingNumber} · ${report.address} · ${report.priority === 'haute' ? 'Priorité haute' : 'Priorité ' + report.priority}`, refId: newReport.id });
  return newReport;
}

export function updateReport(id: string, updates: Partial<Report>): void {
  const reports = getReports();
  set(KEYS.reports, reports.map(r => r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r));
  // Award points if validated
  if (updates.status === 'traité') {
    const r = reports.find(x => x.id === id);
    if (r?.userId) awardPoints(r.userId, 5, 'Signalement validé', undefined, id);
  }
}

// ── Declarations ─────────────────────────────────────────────────
export function getDeclarations(): Declaration[] { return get<Declaration[]>(KEYS.declarations, []); }
export function getDeclarationsByUser(userId: string): Declaration[] { return getDeclarations().filter(d => d.userId === userId); }

export function addDeclaration(decl: Omit<Declaration, 'id' | 'createdAt'>): Declaration {
  const declarations = getDeclarations();
  const newDecl: Declaration = { ...decl, id: 'dec' + Date.now(), createdAt: new Date().toISOString() };
  set(KEYS.declarations, [newDecl, ...declarations]);
  if (newDecl.isLargeVolume) {
    addNotification({ type: 'declaration', title: `Collecte demandée – ${newDecl.commune}`, message: `${newDecl.totalWeightKg} kg · Rémunération ${formatFCFA(newDecl.totalValue)} · Créneau ${newDecl.collectionSlot ?? 'À planifier'}`, refId: newDecl.id });
  }
  return newDecl;
}

export function scanDeposit(qrCode: string, actualItems?: Declaration['items']): { success: boolean; declaration?: Declaration; pointsBefore?: number; pointsAfter?: number } {
  const declarations = getDeclarations();
  const idx = declarations.findIndex(d => d.qrCode === qrCode && d.status === 'en_attente');
  if (idx === -1) return { success: false };
  const decl = declarations[idx];
  const users = get<User[]>(KEYS.users, []);
  const userIdx = users.findIndex(u => u.id === decl.userId);
  if (userIdx === -1) return { success: false };
  const pointsBefore = users[userIdx].points;
  const items = actualItems ?? decl.items;
  const totalPts = decl.pointsEarned;
  users[userIdx].points += totalPts;
  users[userIdx].totalKgRecycled += decl.totalWeightKg;
  users[userIdx].level = computeLevel(users[userIdx].totalKgRecycled);
  set(KEYS.users, users);
  declarations[idx] = { ...decl, status: 'déposé', scannedAt: new Date().toISOString(), items };
  set(KEYS.declarations, declarations);
  addTransaction({ userId: decl.userId, declarationId: decl.id, delta: totalPts, balanceAfter: users[userIdx].points, reason: 'Dépôt au point relais' });
  // Refresh current user cache
  const current = get<string | null>(KEYS.currentUser, null);
  return { success: true, declaration: declarations[idx], pointsBefore, pointsAfter: users[userIdx].points };
}

// ── Relay Points ─────────────────────────────────────────────────
export function getRelayPoints(): RelayPoint[] { return get<RelayPoint[]>(KEYS.relayPoints, []); }

// ── Tours ─────────────────────────────────────────────────────────
export function getTours(): CollectionTour[] { return get<CollectionTour[]>(KEYS.tours, []); }

export function addTour(tour: Omit<CollectionTour, 'id' | 'createdAt'>): CollectionTour {
  const tours = getTours();
  const newTour: CollectionTour = { ...tour, id: 'tour' + Date.now(), createdAt: new Date().toISOString() };
  set(KEYS.tours, [newTour, ...tours]);
  return newTour;
}

// ── Notifications ────────────────────────────────────────────────
export function getNotifications(): Notification[] { return get<Notification[]>(KEYS.notifications, []); }

export function addNotification(n: Omit<Notification, 'id' | 'read' | 'createdAt'>): void {
  const notifs = getNotifications();
  set(KEYS.notifications, [{ ...n, id: 'n' + Date.now(), read: false, createdAt: new Date().toISOString() }, ...notifs]);
}

export function markNotificationRead(id: string): void {
  const notifs = getNotifications();
  set(KEYS.notifications, notifs.map(n => n.id === id ? { ...n, read: true } : n));
}

export function markAllRead(): void {
  set(KEYS.notifications, getNotifications().map(n => ({ ...n, read: true })));
}

// ── Points ────────────────────────────────────────────────────────
function addTransaction(t: Omit<PointTransaction, 'id' | 'createdAt'>): void {
  const txs = get<PointTransaction[]>(KEYS.transactions, []);
  set(KEYS.transactions, [{ ...t, id: 'tx' + Date.now(), createdAt: new Date().toISOString() }, ...txs]);
}

export function awardPoints(userId: string, points: number, reason: string, declarationId?: string, reportId?: string): void {
  const users = get<User[]>(KEYS.users, []);
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return;
  users[idx].points += points;
  users[idx].level = computeLevel(users[idx].totalKgRecycled);
  set(KEYS.users, users);
  addTransaction({ userId, declarationId, reportId, delta: points, balanceAfter: users[idx].points, reason });
}

export function redeemPoints(userId: string, points: number, reason: string): boolean {
  const users = get<User[]>(KEYS.users, []);
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1 || users[idx].points < points) return false;
  users[idx].points -= points;
  set(KEYS.users, users);
  addTransaction({ userId, delta: -points, balanceAfter: users[idx].points, reason });
  return true;
}

export function getTransactions(userId: string): PointTransaction[] {
  return get<PointTransaction[]>(KEYS.transactions, []).filter(t => t.userId === userId);
}

// ── Pricing ──────────────────────────────────────────────────────
export function getPricing(): PricingConfig { return get<PricingConfig>(KEYS.pricing, PRICING); }
export function updatePricing(config: Partial<PricingConfig>): void { set(KEYS.pricing, { ...getPricing(), ...config }); }

// ── Users (admin) ────────────────────────────────────────────────
export function getUsers(): User[] { return get<User[]>(KEYS.users, []); }
export function getUserById(id: string): User | null { return getUsers().find(u => u.id === id) ?? null; }

// ── Helpers ──────────────────────────────────────────────────────
export function computeLevel(kgTotal: number): User['level'] {
  if (kgTotal >= 300) return 'Forêt';
  if (kgTotal >= 100) return 'Arbre';
  if (kgTotal >= 20) return 'Pousse';
  return 'Graine';
}

export function formatFCFA(amount: number): string {
  return amount.toLocaleString('fr-FR').replace(',', ' ') + ' FCFA';
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function getPrice(type: string, sorted: boolean, config?: PricingConfig): number {
  const p = config ?? getPricing();
  const k = `${type}_${sorted ? 'sorted' : 'unsorted'}` as keyof PricingConfig;
  return (p[k] as number) ?? 0;
}

export function calcDeclarationValue(items: Declaration['items'], config?: PricingConfig): { total: number; points: number; detail: { type: string; kg: number; price: number; value: number }[] } {
  const p = config ?? getPricing();
  let total = 0;
  const detail: { type: string; kg: number; price: number; value: number }[] = [];
  for (const item of items) {
    const price = getPrice(item.type, item.sorted, p);
    const value = price * item.weightKg;
    total += value;
    detail.push({ type: item.type, kg: item.weightKg, price, value });
  }
  const points = Math.floor(total * p.points_per_fcfa);
  return { total, points, detail };
}

export function generateQRCode(prefix = 'ECO'): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return prefix + '-' + Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ── Stats for dashboard ─────────────────────────────────────────
export function getDashboardStats() {
  const reports = getReports();
  const declarations = getDeclarations();
  const pricing = getPricing();

  let totalWeightKg = 0, totalRemunerationFCFA = 0, totalPoints = 0;
  const byCommuneMap: Record<string, { weightKg: number; reports: number; declarations: number; remuneration: number }> = {};

  for (const d of declarations) {
    if (d.status === 'collecté' || d.status === 'payé' || d.status === 'déposé') {
      totalWeightKg += d.totalWeightKg;
      totalRemunerationFCFA += d.totalValue;
      totalPoints += d.pointsEarned;
    }
    if (!byCommuneMap[d.commune]) byCommuneMap[d.commune] = { weightKg: 0, reports: 0, declarations: 0, remuneration: 0 };
    byCommuneMap[d.commune].declarations++;
    if (d.status !== 'en_attente') {
      byCommuneMap[d.commune].weightKg += d.totalWeightKg;
      byCommuneMap[d.commune].remuneration += d.totalValue;
    }
  }

  for (const r of reports) {
    if (!byCommuneMap[r.commune]) byCommuneMap[r.commune] = { weightKg: 0, reports: 0, declarations: 0, remuneration: 0 };
    byCommuneMap[r.commune].reports++;
  }

  const tours = getTours();
  const collectionCost = tours.reduce((acc, t) => acc + t.estimatedCostFCFA, 0);
  const savedCost = totalWeightKg * pricing.state_cost_per_kg;

  return {
    totalWeightKg,
    totalRemunerationFCFA,
    totalPointsDistributed: totalPoints,
    totalReports: reports.length,
    openReports: reports.filter(r => r.status === 'reçu').length,
    treatedReports: reports.filter(r => r.status === 'traité').length,
    collectionCostFCFA: collectionCost,
    savedCostFCFA: savedCost,
    byCommune: byCommuneMap,
  };
}
