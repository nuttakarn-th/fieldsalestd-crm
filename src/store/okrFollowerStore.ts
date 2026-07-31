/**
 * okrFollowerStore.ts
 * Zustand store สำหรับ OKR Follower Growth
 * เก็บข้อมูล Follower รายเดือน 5 platforms: Facebook, YouTube, TikTok, Instagram, Google Maps (reviews)
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface OKRMonth {
  month: string;           // "YYYY-MM"
  facebook: number | null;
  youtube: number | null;
  tiktok: number | null;
  instagram: number | null;
  google_maps: number | null;   // จำนวนรีวิว Google Maps
  google_rating: number | null; // คะแนนเฉลี่ย (ไว้ใช้อนาคต)
  updated_at?: string;
}

export interface OKRTargets {
  facebook: number;
  youtube: number;
  tiktok: number;
  instagram: number | null;
  google_maps: number | null;
}

interface OKRFollowerState {
  entries: OKRMonth[];
  targets: OKRTargets;
  setEntry: (entry: OKRMonth) => void;
  setTargets: (t: Partial<OKRTargets>) => void;
}

const DEFAULT_TARGETS: OKRTargets = {
  facebook: 10000,
  youtube: 500,
  tiktok: 2000,
  instagram: null,
  google_maps: null,
};

// ─── Seed data — trajectory สมมุติ ──────────────────────────────────────────
// ผู้ใช้จะ override ด้วยข้อมูลจริงผ่าน InputForm
const SEED_ENTRIES: OKRMonth[] = [
  { month: "2025-08", facebook: 6800, youtube: 15, tiktok:  50, instagram: null, google_maps: null, google_rating: null },
  { month: "2025-09", facebook: 7000, youtube: 20, tiktok:  80, instagram: null, google_maps: null, google_rating: null },
  { month: "2025-10", facebook: 7200, youtube: 25, tiktok: 120, instagram: null, google_maps: null, google_rating: null },
  { month: "2025-11", facebook: 7400, youtube: 30, tiktok: 160, instagram: null, google_maps: null, google_rating: null },
  { month: "2025-12", facebook: 7500, youtube: 35, tiktok: 200, instagram: null, google_maps: null, google_rating: null },
  { month: "2026-01", facebook: 7600, youtube: 38, tiktok: 260, instagram: null, google_maps: null, google_rating: null },
  { month: "2026-02", facebook: 7700, youtube: 40, tiktok: 320, instagram: null, google_maps: null, google_rating: null },
  { month: "2026-03", facebook: 7900, youtube: 45, tiktok: 380, instagram: null, google_maps: null, google_rating: null },
  { month: "2026-04", facebook: 8100, youtube: 55, tiktok: 430, instagram: null, google_maps: null, google_rating: null },
  { month: "2026-05", facebook: 8250, youtube: 65, tiktok: 470, instagram: null, google_maps: null, google_rating: null },
  { month: "2026-06", facebook: 8350, youtube: 73, tiktok: 510, instagram: null, google_maps: null, google_rating: null },
  { month: "2026-07", facebook: 8500, youtube: 85, tiktok: 560, instagram: null, google_maps: null, google_rating: null },
];

export const useOKRFollowerStore = create<OKRFollowerState>()(
  persist(
    (set) => ({
      entries: SEED_ENTRIES,
      targets: DEFAULT_TARGETS,

      setEntry: (entry) =>
        set((s) => {
          const idx = s.entries.findIndex((e) => e.month === entry.month);
          if (idx >= 0) {
            const next = [...s.entries];
            next[idx] = { ...next[idx], ...entry };
            return { entries: next };
          }
          return {
            entries: [...s.entries, entry].sort((a, b) =>
              a.month.localeCompare(b.month)
            ),
          };
        }),

      setTargets: (t) =>
        set((s) => ({ targets: { ...s.targets, ...t } })),
    }),
    { name: "okr-follower-store-v1" }
  )
);
