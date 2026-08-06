/**
 * marketingRevenueStore.ts
 * Revenue actual + target สำหรับ Marketing Dashboard — 3 บริการ
 * ทุก field กรอกเองทั้งหมด ไม่ดึงจาก crmStore
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface RevenueEntry {
  month: string;           // "YYYY-MM"
  ob_target: number | null;
  ob_actual: number | null;
  rental_target: number | null;
  rental_actual: number | null;
  ticket_target: number | null;
  ticket_actual: number | null;
}

interface MarketingRevenueState {
  entries: RevenueEntry[];
  setEntry: (patch: Partial<RevenueEntry> & { month: string }) => void;
}

const BLANK: Omit<RevenueEntry, "month"> = {
  ob_target: null, ob_actual: null,
  rental_target: null, rental_actual: null,
  ticket_target: null, ticket_actual: null,
};

// Seed data — ตัวเลขจำลอง (user กรอกเองทีหลัง)
const SEED: RevenueEntry[] = [
  { month: "2026-01", ob_target: 1400000, ob_actual: 1250000, rental_target:  80000, rental_actual:  72000, ticket_target: 50000, ticket_actual: 47000 },
  { month: "2026-02", ob_target: 1400000, ob_actual:  980000, rental_target:  80000, rental_actual:  85000, ticket_target: 50000, ticket_actual: 53000 },
  { month: "2026-03", ob_target: 1600000, ob_actual: 1450000, rental_target:  90000, rental_actual:  87000, ticket_target: 60000, ticket_actual: 62500 },
  { month: "2026-04", ob_target: 1600000, ob_actual: 1320000, rental_target:  90000, rental_actual:  94000, ticket_target: 60000, ticket_actual: 57000 },
  { month: "2026-05", ob_target: 1800000, ob_actual: 1580000, rental_target: 100000, rental_actual:  97000, ticket_target: 70000, ticket_actual: 73500 },
  { month: "2026-06", ob_target: 1500000, ob_actual: 1100000, rental_target: 100000, rental_actual: 108000, ticket_target: 70000, ticket_actual: 66000 },
  { month: "2026-07", ob_target: 1600000, ob_actual: 1400000, rental_target: 120000, rental_actual: 113000, ticket_target: 80000, ticket_actual: 77000 },
  { month: "2026-08", ob_target: 1600000, ob_actual:    null, rental_target: 120000, rental_actual:   null, ticket_target: 80000, ticket_actual:   null },
  { month: "2026-09", ob_target: 1700000, ob_actual:    null, rental_target: 130000, rental_actual:   null, ticket_target: 90000, ticket_actual:   null },
  { month: "2026-10", ob_target: 1800000, ob_actual:    null, rental_target: 130000, rental_actual:   null, ticket_target: 90000, ticket_actual:   null },
  { month: "2026-11", ob_target: 2000000, ob_actual:    null, rental_target: 150000, rental_actual:   null, ticket_target:100000, ticket_actual:   null },
  { month: "2026-12", ob_target: 2200000, ob_actual:    null, rental_target: 150000, rental_actual:   null, ticket_target:100000, ticket_actual:   null },
];

export const useMarketingRevenueStore = create<MarketingRevenueState>()(
  persist(
    (set) => ({
      entries: SEED,
      setEntry: (patch) =>
        set((s) => {
          const idx = s.entries.findIndex((e) => e.month === patch.month);
          if (idx >= 0) {
            const next = [...s.entries];
            next[idx] = { ...next[idx], ...patch };
            return { entries: next };
          }
          return {
            entries: [
              ...s.entries,
              { ...BLANK, ...patch } as RevenueEntry,
            ].sort((a, b) => a.month.localeCompare(b.month)),
          };
        }),
    }),
    { name: "marketing-revenue-store-v2" }
  )
);
