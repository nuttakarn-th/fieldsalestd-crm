/**
 * otaStore.ts
 * Zustand store สำหรับ OTA Module
 * v2: Full Supabase sync — ota_orders, ota_packages
 *     localStorage เป็น fallback/cache ผ่าน persist middleware
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

export type OTAPlatform = "Trip.com" | "KKday" | "Agent Offline" | "GetYourGuide" | "Viator" | "Airbnb";

export interface OTAPlatformConfig {
  id: string;
  platform: string;        // platform name (OTAPlatform or custom)
  commission_pct: number;  // e.g. 20 for 20%
  notes: string;
  created_at: string;
}

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
  pickup_hotel?: string;
  gross_price: number;
  commission_pct: number;
  discount: number;
  revenue: number;         // Net Revenue
  created_at: string;
  created_by?: string;
}

export interface PlatformPrice {
  platform: string;
  price: number;
}

export interface OTAPackage {
  id: string;
  code: string;
  name: string;
  platform_prices: PlatformPrice[];
  created_at: string;
}

// ─── Store interface ──────────────────────────────────────────────────────────

interface OTAState {
  orders: OTAOrder[];
  packages: OTAPackage[];
  platformConfigs: OTAPlatformConfig[];
  loaded: boolean; // ป้องกัน seed ทับข้อมูลจาก DB

  // Supabase loaders
  loadFromSupabase: () => Promise<void>;
  seedDefaultPackages: () => Promise<void>; // เพิ่ม packages เริ่มต้นด้วยมือ

  // Orders
  addOrder: (o: Omit<OTAOrder, "id" | "created_at">) => Promise<string>;
  updateOrder: (id: string, patch: Partial<OTAOrder>) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;

  // Packages
  addPackage: (p: Omit<OTAPackage, "id" | "created_at">) => Promise<string>;
  updatePackage: (id: string, patch: Partial<OTAPackage>) => Promise<void>;
  deletePackage: (id: string) => Promise<void>;

  // Platform Configs
  addPlatformConfig: (p: Omit<OTAPlatformConfig, "id" | "created_at">) => Promise<string>;
  updatePlatformConfig: (id: string, patch: Partial<OTAPlatformConfig>) => Promise<void>;
  deletePlatformConfig: (id: string) => Promise<void>;

  // Bulk import (upsert by order_number)
  importOrders: (rows: Omit<OTAOrder, "id" | "created_at">[]) => Promise<{ inserted: number; updated: number; errors: number }>;

  // Helpers
  getOrdersByMonth: (year: number, month: number) => OTAOrder[];
  getPackageByCode: (code: string) => OTAPackage | undefined;
  getPlatformConfig: (platform: string) => OTAPlatformConfig | undefined;
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

// ─── Seed packages (used only when DB is empty) ───────────────────────────────

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

// ─── Helper: map Supabase row → OTAOrder ─────────────────────────────────────

function rowToOrder(r: Record<string, unknown>): OTAOrder {
  return {
    id:              String(r.id),
    booking_date:    String(r.booking_date ?? "").slice(0, 10),
    usage_date:      String(r.usage_date ?? "").slice(0, 10),
    order_number:    String(r.order_number ?? ""),
    group_number:    String(r.group_number ?? ""),
    pax:             Number(r.pax ?? 1),
    platform:        String(r.platform ?? "") as OTAPlatform,
    package_id:      String(r.package_id ?? ""),
    package_details: String(r.package_details ?? ""),
    nationality:     String(r.nationality ?? ""),
    guide_name:      String(r.guide_name ?? ""),
    pickup_hotel:    String(r.pickup_hotel ?? ""),
    gross_price:     Number(r.gross_price ?? 0),
    commission_pct:  Number(r.commission_pct ?? 0),
    discount:        Number(r.discount ?? 0),
    revenue:         Number(r.revenue ?? 0),
    created_at:      String(r.created_at ?? new Date().toISOString()),
    created_by:      String(r.created_by ?? ""),
  };
}

function rowToPlatformConfig(r: Record<string, unknown>): OTAPlatformConfig {
  return {
    id:             String(r.id),
    platform:       String(r.platform ?? ""),
    commission_pct: Number(r.commission_pct ?? 0),
    notes:          String(r.notes ?? ""),
    created_at:     String(r.created_at ?? new Date().toISOString()),
  };
}

function rowToPackage(r: Record<string, unknown>): OTAPackage {
  let pp: PlatformPrice[] = [];
  try {
    pp = Array.isArray(r.platform_prices)
      ? (r.platform_prices as PlatformPrice[])
      : JSON.parse(String(r.platform_prices ?? "[]"));
  } catch { pp = []; }
  return {
    id:              String(r.id),
    code:            String(r.code ?? ""),
    name:            String(r.name ?? ""),
    platform_prices: pp,
    created_at:      String(r.created_at ?? new Date().toISOString()),
  };
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useOTAStore = create<OTAState>()(
  persist(
    (set, get) => ({
      orders:          [],
      packages:        SEED_PACKAGES,
      platformConfigs: [],
      loaded:          false,

      // ── Load from Supabase ─────────────────────────────────────────────────

      loadFromSupabase: async () => {
        if (!SUPABASE_ENABLED || !supabase) return;

        // Packages
        const { data: pkgData, error: pkgErr } = await supabase
          .from("ota_packages")
          .select("*")
          .order("created_at", { ascending: true });

        if (pkgErr) {
          console.error("[ota] load packages error:", pkgErr);
        } else {
          const pkgs = (pkgData ?? []).map(rowToPackage);
          set({ packages: pkgs });
        }

        // Orders
        const { data: ordData, error: ordErr } = await supabase
          .from("ota_orders")
          .select("*")
          .order("usage_date", { ascending: false });

        if (ordErr) {
          console.error("[ota] load orders error:", ordErr);
        } else {
          set({ orders: (ordData ?? []).map(rowToOrder), loaded: true });
        }

        // Platform Configs
        const { data: cfgData, error: cfgErr } = await supabase
          .from("ota_platform_configs")
          .select("*")
          .order("platform", { ascending: true });

        if (cfgErr) {
          console.error("[ota] load platform configs error:", cfgErr);
        } else {
          set({ platformConfigs: (cfgData ?? []).map(rowToPlatformConfig) });
        }
      },

      // ── Seed default packages manually ────────────────────────────────────

      seedDefaultPackages: async () => {
        await seedPackages();
        if (SUPABASE_ENABLED && supabase) {
          const { data } = await supabase.from("ota_packages").select("*").order("created_at");
          if (data) set({ packages: data.map(rowToPackage) });
        } else {
          set({ packages: SEED_PACKAGES });
        }
      },

      // ── Orders ──────────────────────────────────────────────────────────────

      addOrder: async (o) => {
        const id = uid();
        const order: OTAOrder = {
          gross_price: 0,
          commission_pct: 0,
          discount: 0,
          ...o,
          id,
          created_at: new Date().toISOString(),
        };

        if (SUPABASE_ENABLED && supabase) {
          const { error } = await supabase.from("ota_orders").insert({
            id:              order.id,
            booking_date:    order.booking_date,
            usage_date:      order.usage_date,
            order_number:    order.order_number,
            group_number:    order.group_number,
            pax:             order.pax,
            platform:        order.platform,
            package_id:      order.package_id || null,
            package_details: order.package_details ?? "",
            nationality:     order.nationality ?? "",
            guide_name:      order.guide_name ?? "",
            pickup_hotel:    order.pickup_hotel ?? "",
            gross_price:     order.gross_price,
            commission_pct:  order.commission_pct,
            discount:        order.discount,
            revenue:         order.revenue,
            created_by:      order.created_by ?? "",
          });
          if (error) {
            console.error("[ota] addOrder error:", error);
            toast.error(`บันทึก Order ไม่สำเร็จ — ${error.message}`);
            return id;
          }
        }

        set((s) => ({ orders: [order, ...s.orders] }));
        return id;
      },

      updateOrder: async (id, patch) => {
        if (SUPABASE_ENABLED && supabase) {
          const { error } = await supabase.from("ota_orders").update(patch).eq("id", id);
          if (error) {
            console.error("[ota] updateOrder error:", error);
            toast.error(`แก้ไข Order ไม่สำเร็จ — ${error.message}`);
            return;
          }
        }
        set((s) => ({
          orders: s.orders.map((o) => (o.id === id ? { ...o, ...patch } : o)),
        }));
      },

      deleteOrder: async (id) => {
        if (SUPABASE_ENABLED && supabase) {
          const { error } = await supabase.from("ota_orders").delete().eq("id", id);
          if (error) {
            console.error("[ota] deleteOrder error:", error);
            toast.error(`ลบ Order ไม่สำเร็จ — ${error.message}`);
            return;
          }
        }
        set((s) => ({ orders: s.orders.filter((o) => o.id !== id) }));
      },

      // ── Packages ──────────────────────────────────────────────────────────

      addPackage: async (p) => {
        const id = uid();
        const pkg: OTAPackage = { ...p, id, created_at: new Date().toISOString() };

        if (SUPABASE_ENABLED && supabase) {
          const { error } = await supabase.from("ota_packages").insert({
            id:              pkg.id,
            code:            pkg.code,
            name:            pkg.name,
            platform_prices: pkg.platform_prices,
          });
          if (error) {
            console.error("[ota] addPackage error:", error);
            toast.error(`บันทึก Package ไม่สำเร็จ — ${error.message}`);
            return id;
          }
        }

        set((s) => ({ packages: [...s.packages, pkg] }));
        return id;
      },

      updatePackage: async (id, patch) => {
        if (SUPABASE_ENABLED && supabase) {
          const { error } = await supabase.from("ota_packages").update(patch).eq("id", id);
          if (error) {
            console.error("[ota] updatePackage error:", error);
            toast.error(`แก้ไข Package ไม่สำเร็จ — ${error.message}`);
            return;
          }
        }
        set((s) => ({
          packages: s.packages.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        }));
      },

      deletePackage: async (id) => {
        if (SUPABASE_ENABLED && supabase) {
          const { error } = await supabase.from("ota_packages").delete().eq("id", id);
          if (error) {
            console.error("[ota] deletePackage error:", error);
            toast.error(`ลบ Package ไม่สำเร็จ — ${error.message}`);
            return;
          }
        }
        set((s) => ({ packages: s.packages.filter((p) => p.id !== id) }));
      },

      // ── Platform Configs ──────────────────────────────────────────────────

      addPlatformConfig: async (p) => {
        const id = uid();
        const cfg: OTAPlatformConfig = { ...p, id, created_at: new Date().toISOString() };

        if (SUPABASE_ENABLED && supabase) {
          const { error } = await supabase.from("ota_platform_configs").insert({
            id:             cfg.id,
            platform:       cfg.platform,
            commission_pct: cfg.commission_pct,
            notes:          cfg.notes ?? "",
          });
          if (error) {
            console.error("[ota] addPlatformConfig error:", error);
            toast.error(`บันทึก Platform ไม่สำเร็จ — ${error.message}`);
            return id;
          }
        }

        set((s) => ({ platformConfigs: [...s.platformConfigs, cfg] }));
        return id;
      },

      updatePlatformConfig: async (id, patch) => {
        if (SUPABASE_ENABLED && supabase) {
          const { error } = await supabase.from("ota_platform_configs").update(patch).eq("id", id);
          if (error) {
            console.error("[ota] updatePlatformConfig error:", error);
            toast.error(`แก้ไข Platform ไม่สำเร็จ — ${error.message}`);
            return;
          }
        }
        set((s) => ({
          platformConfigs: s.platformConfigs.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        }));
      },

      deletePlatformConfig: async (id) => {
        if (SUPABASE_ENABLED && supabase) {
          const { error } = await supabase.from("ota_platform_configs").delete().eq("id", id);
          if (error) {
            console.error("[ota] deletePlatformConfig error:", error);
            toast.error(`ลบ Platform ไม่สำเร็จ — ${error.message}`);
            return;
          }
        }
        set((s) => ({ platformConfigs: s.platformConfigs.filter((c) => c.id !== id) }));
      },

      // ── Bulk Import (upsert by order_number) ────────────────────────────────

      importOrders: async (rows) => {
        let inserted = 0;
        let updated = 0;
        let errors = 0;

        if (SUPABASE_ENABLED && supabase) {
          // Deduplicate ภายใน batch (Order # เดียวกัน 2 แถว → Postgres error)
          // เก็บแถวสุดท้ายของแต่ละ order_number และนับจำนวน skip
          const dedupMap = new Map<string, typeof rows[number]>();
          rows.forEach((r) => dedupMap.set(r.order_number, r));
          const dedupedRows = [...dedupMap.values()];
          const internalDups = rows.length - dedupedRows.length;
          if (internalDups > 0) {
            console.warn(`[ota] importOrders: ${internalDups} duplicate order_number(s) in batch — kept last occurrence each`);
          }

          // ดึง existing id จาก DB โดยตรง (ไม่พึ่ง local state ที่อาจยังไม่โหลด)
          const orderNums = dedupedRows.map((r) => r.order_number);
          const { data: existing } = await supabase
            .from("ota_orders")
            .select("id, order_number")
            .in("order_number", orderNums);

          const existingByOrderNum = new Map(
            (existing ?? []).map((r) => [r.order_number as string, r.id as string])
          );

          // Build upsert payload — ใช้ existing id ถ้ามี ไม่งั้นสร้างใหม่
          const records = dedupedRows.map((row) => {
            const existingId = existingByOrderNum.get(row.order_number);
            return {
              id:              existingId ?? uid(),
              booking_date:    row.booking_date,
              usage_date:      row.usage_date,
              order_number:    row.order_number,
              group_number:    row.group_number,
              pax:             row.pax,
              platform:        row.platform,
              package_id:      row.package_id || null,
              package_details: row.package_details ?? "",
              nationality:     row.nationality ?? "",
              guide_name:      row.guide_name ?? "",
              pickup_hotel:    row.pickup_hotel ?? "",
              gross_price:     row.gross_price,
              commission_pct:  row.commission_pct,
              discount:        row.discount,
              revenue:         row.revenue,
              created_by:      row.created_by ?? "",
            };
          });

          const { error } = await supabase
            .from("ota_orders")
            .upsert(records, { onConflict: "order_number" });

          if (error) {
            console.error("[ota] importOrders error:", error.message, error.details, error.hint);
            toast.error(`Import ล้มเหลว: ${error.message}`);
            return { inserted: 0, updated: 0, errors: rows.length };
          }

          // นับ inserted vs updated (อ้างอิงจาก DB lookup ที่ทำไว้)
          dedupedRows.forEach((row) => {
            if (existingByOrderNum.has(row.order_number)) updated++;
            else inserted++;
          });

          // Reload from DB เพื่อให้ state sync
          const { data } = await supabase
            .from("ota_orders")
            .select("*")
            .order("usage_date", { ascending: false });
          if (data) set({ orders: data.map(rowToOrder) });

        } else {
          // Local fallback
          rows.forEach((row) => {
            const existingId = existingByOrderNum.get(row.order_number);
            if (existingId) {
              set((s) => ({
                orders: s.orders.map((o) =>
                  o.id === existingId ? { ...o, ...row } : o
                ),
              }));
              updated++;
            } else {
              const id = uid();
              const order: OTAOrder = { ...row, id, created_at: new Date().toISOString() };
              set((s) => ({ orders: [order, ...s.orders] }));
              inserted++;
            }
          });
        }

        return { inserted, updated, errors };
      },

      // ── Helpers ──────────────────────────────────────────────────────────────

      getOrdersByMonth: (year, month) => {
        const prefix = `${year}-${String(month).padStart(2, "0")}`;
        return get().orders.filter((o) => o.usage_date.startsWith(prefix));
      },

      getPackageByCode: (code) =>
        get().packages.find((p) => p.code.toUpperCase() === code.toUpperCase()),

      getPlatformConfig: (platform) =>
        get().platformConfigs.find((c) => c.platform === platform),
    }),
    {
      name: "ota-store-v3",
      // version 3: เพิ่ม platformConfigs state
      version: 3,
      migrate: () => ({ orders: [], packages: [], platformConfigs: [], loaded: false }),
    }
  )
);

// ─── Seed helper (run once when DB packages table is empty) ──────────────────

async function seedPackages() {
  if (!supabase) return;
  const { error } = await supabase.from("ota_packages").upsert(
    SEED_PACKAGES.map((p) => ({
      id:              p.id,
      code:            p.code,
      name:            p.name,
      platform_prices: p.platform_prices,
    })),
    { onConflict: "id" }
  );
  if (error) console.error("[ota] seed packages error:", error);
}
