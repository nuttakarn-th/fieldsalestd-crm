/**
 * okrFollowerStore.ts
 * OKR Follower Growth — ติดตามเป้า Social Follower รายไตรมาส
 * ข้อมูลเก็บใน Supabase (ไม่ใช่ localStorage) เพื่อให้ใช้งานได้จากทุกเครื่อง
 */
import { create } from "zustand";
import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";

export interface OKRMonth {
  month: string;           // "YYYY-MM"
  facebook: number | null;
  youtube: number | null;
  tiktok: number | null;
  instagram: number | null;
  google_maps: number | null;
  google_rating: number | null;
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
  loading: boolean;
  error: string | null;
  fetchAll: () => Promise<void>;
  setEntry: (entry: OKRMonth) => Promise<void>;
  setTargets: (t: Partial<OKRTargets>) => Promise<void>;
}

const DEFAULT_TARGETS: OKRTargets = {
  facebook: 10000,
  youtube: 500,
  tiktok: 2000,
  instagram: null,
  google_maps: null,
};

export const useOKRFollowerStore = create<OKRFollowerState>()((set, get) => ({
  entries: [],
  targets: DEFAULT_TARGETS,
  loading: false,
  error: null,

  fetchAll: async () => {
    if (!SUPABASE_ENABLED) return;
    set({ loading: true, error: null });
    try {
      const [entriesRes, targetsRes] = await Promise.all([
        supabase
          .from("okr_follower_entries")
          .select("*")
          .order("month", { ascending: true }),
        supabase
          .from("okr_follower_targets")
          .select("*")
          .eq("id", 1)
          .single(),
      ]);

      if (entriesRes.error) throw entriesRes.error;
      if (targetsRes.error && targetsRes.error.code !== "PGRST116") throw targetsRes.error;

      set({
        entries: (entriesRes.data ?? []) as OKRMonth[],
        targets: targetsRes.data
          ? {
              facebook:    targetsRes.data.facebook    ?? DEFAULT_TARGETS.facebook,
              youtube:     targetsRes.data.youtube     ?? DEFAULT_TARGETS.youtube,
              tiktok:      targetsRes.data.tiktok      ?? DEFAULT_TARGETS.tiktok,
              instagram:   targetsRes.data.instagram   ?? null,
              google_maps: targetsRes.data.google_maps ?? null,
            }
          : DEFAULT_TARGETS,
        loading: false,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ loading: false, error: msg });
    }
  },

  setEntry: async (entry: OKRMonth) => {
    // Optimistic update
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
    });

    if (!SUPABASE_ENABLED) return;
    try {
      const { error } = await supabase.from("okr_follower_entries").upsert({
        month:         entry.month,
        facebook:      entry.facebook,
        youtube:       entry.youtube,
        tiktok:        entry.tiktok,
        instagram:     entry.instagram,
        google_maps:   entry.google_maps,
        google_rating: entry.google_rating,
        updated_at:    new Date().toISOString(),
      }, { onConflict: "month" });
      if (error) throw error;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
    }
  },

  setTargets: async (t: Partial<OKRTargets>) => {
    // Optimistic update
    set((s) => ({ targets: { ...s.targets, ...t } }));

    if (!SUPABASE_ENABLED) return;
    try {
      const current = get().targets;
      const { error } = await supabase.from("okr_follower_targets").upsert({
        id:          1,
        facebook:    t.facebook    ?? current.facebook,
        youtube:     t.youtube     ?? current.youtube,
        tiktok:      t.tiktok      ?? current.tiktok,
        instagram:   "instagram"   in t ? t.instagram   : current.instagram,
        google_maps: "google_maps" in t ? t.google_maps : current.google_maps,
        updated_at:  new Date().toISOString(),
      }, { onConflict: "id" });
      if (error) throw error;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
    }
  },
}));
