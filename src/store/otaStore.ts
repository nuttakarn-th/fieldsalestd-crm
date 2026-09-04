/**
 * otaStore.ts
 * Zustand store สำหรับ OTA Module
 * ปัจจุบัน: localStorage persistence
 * TODO (Sep 17+): switch to Supabase — tables: ota_orders, ota_packages
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ─── Types ────────────────────────────────────────────────────────────────────

export type OTAPlatform = "Trip.com" | "KKday" | "Agent Offline" | "GetYourGuide" | "Viator" | "Airbnb";

export const OTA_PLATFORMS: OTAPlatform[] = [
  "Trip.com",
  "KKday",
  "Agent Offline",
  "GetYourGuide",
  "Viator",
  "Airbnb",
];

export interface OTAOrder {
  id: string;              // uuid
  booking_date: string;    // ISO date YYYY-MM-DD
  usage_date: string;      // ISO date YYYY-MM-DD
  order_number: string;
  group_number: string;
  pax: number;
  platform: OTAPlatform;
  package_id: string;      // FK → OTAPackage.id
  package_details?: string;
  nationality?: string;
  guide_name?: string;
  revenue: number;         // ราคาที่ได้จาก platform (บาท)
  created_at: string;
  created_by?: string;
}

export interface PlatformPrice {
  platform: OTAPlatform;
  price: number;
}

export interface OTAPackage {
  id: string;
  code: string;            // เช่น "CMP", "CMC"
  name: string;            // ชื่อเต็ม
  platform_prices: PlatformPrice[];
  created_at: string;
}

// ─── Store interface ──────────────────────────────────────────────────────────

interface OTAState {
  orders: OTAOrder[];
  packages: OTAPackage[];

  // Orders
  addOrder: (o: Omit<OTAOrder, "id" | "created_at">) => string;
  updateOrder: (id: string, patch: Partial<OTAOrder>) => void;
  deleteOrder: (id: string) => void;

  // Packages
  addPackage: (p: Omit<OTAPackage, "id" | "created_at">) => string;
  updatePackage: (id: string, patch: Partial<OTAPackage>) => void;
  deletePackage: (id: string) => void;

  // Helpers
  getOrdersByMonth: (year: number, month: number) => OTAOrder[]; // month 1-12
  getPackageByCode: (code: string) => OTAPackage | undefined;
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

// ─── Seed packages (Chiang Mai Daycation) ────────────────────────────────────

const SEED_PACKAGES: OTAPackage[] = [
  {
    id: "pkg-cmb",
    code: "CMB",
    name: "Buatong Waterfall + Elely Cafe",
    platform_prices: [
      { platform: "KKday", price: 653 },
      { platform: "Trip.com", price: 437.5 },
      { platform: "Viator", price: 0 },
    ],
    created_at: new Date(0).toISOString(),
  },
  {
    id: "pkg-cmc",
    code: "CMC",
    name: "Buatong Waterfall + Tiger Kingdom + Elephant Poopoo Paper Park",
    platform_prices: [
      { platform: "KKday", price: 812 },
      { platform: "Trip.com", price: 0 },
      { platform: "Viator", price: 0 },
      { platform: "GetYourGuide", price: 0 },
    ],
    created_at: new Date(1).toISOString(),
  },
  {
    id: "pkg-cmd",
    code: "CMD",
    name: "Baan Kang Wat + Wat Pha Lat + Wat Doi Suthep Half Day Tour",
    platform_prices: [
      { platform: "KKday", price: 844 },
      { platform: "Agent Offline", price: 850 },
      { platform: "Viator", price: 0 },
      { platform: "GetYourGuide", price: 0 },
    ],
    created_at: new Date(2).toISOString(),
  },
  {
    id: "pkg-cme",
    code: "CME",
    name: "Maetang Elephant Camp + Buatong Waterfall",
    platform_prices: [
      { platform: "KKday", price: 1532 },
      { platform: "Agent Offline", price: 1530 },
    ],
    created_at: new Date(3).toISOString(),
  },
  {
    id: "pkg-cmi",
    code: "CMI",
    name: "CMI - Inthanon Nation Park",
    platform_prices: [
      { platform: "KKday", price: 1294 },
      { platform: "Viator", price: 0 },
      { platform: "GetYourGuide", price: 0 },
    ],
    created_at: new Date(4).toISOString(),
  },
];

// ─── Store ────────────────────────────────────────────────────────────────────

export const useOTAStore = create<OTAState>()(
  persist(
    (set, get) => ({
      orders: [],
      packages: SEED_PACKAGES,

      // ── Orders ──────────────────────────────────────────────────────────────

      addOrder: (o) => {
        const id = uid();
        const order: OTAOrder = {
          ...o,
          id,
          created_at: new Date().toISOString(),
        };
        set((s) => ({ orders: [order, ...s.orders] }));
        return id;
      },

      updateOrder: (id, patch) =>
        set((s) => ({
          orders: s.orders.map((o) => (o.id === id ? { ...o, ...patch } : o)),
        })),

      deleteOrder: (id) =>
        set((s) => ({ orders: s.orders.filter((o) => o.id !== id) })),

      // ── Packages ─────────────────────────────────────────────────────────────

      addPackage: (p) => {
        const id = uid();
        const pkg: OTAPackage = { ...p, id, created_at: new Date().toISOString() };
        set((s) => ({ packages: [...s.packages, pkg] }));
        return id;
      },

      updatePackage: (id, patch) =>
        set((s) => ({
          packages: s.packages.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),

      deletePackage: (id) =>
        set((s) => ({ packages: s.packages.filter((p) => p.id !== id) })),

      // ── Helpers ───────────────────────────────────────────────────────────────

      getOrdersByMonth: (year, month) => {
        const prefix = `${year}-${String(month).padStart(2, "0")}`;
        return get().orders.filter((o) => o.usage_date.startsWith(prefix));
      },

      getPackageByCode: (code) =>
        get().packages.find((p) => p.code.toUpperCase() === code.toUpperCase()),
    }),
    {
      name: "ota-store-v1",
    }
  )
);
