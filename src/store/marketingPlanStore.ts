/**
 * marketingPlanStore.ts
 * Marketing Master Plan 2027 — Zustand store backed by Supabase
 */
import { create } from "zustand";
import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";

export type PlanSide   = "off" | "on";
export type KpiType    = "ok" | "est" | "na";
export type ItemStatus = "pending" | "in_progress" | "done" | "cancelled";

export interface PlanItem {
  id: string;
  year: number;
  side: PlanSide;
  level: 1 | 2 | 3;
  parent_id: string | null;
  sort_order: number;
  title: string;
  subtitle: string | null;
  description: string | null;
  departments: string[];
  dept_shares: Record<string, number> | null;
  dept_shares_src: string | null;
  budget: number;
  budget_note: string | null;
  monthly_amounts: number[];     // length 12
  actual_amounts: number[];      // length 12
  kpi: string | null;
  kpi_type: KpiType | null;
  status: ItemStatus;
  owner: string | null;
  is_new: boolean;
  is_na: boolean;
  wait_note: string | null;
  pending_note: string | null;
  warn_note: string | null;
  unscheduled_note: string | null;
  action_plan: string | null;
  gantt_spans: Array<{
    s: number; e: number; t: string; light?: boolean;
    name?: string;    // ชื่อเต็มแคมเปญ
    season?: string;  // High / Mid / Low
    doing?: string;   // ช่วงนี้ทำไร
    warn?: string;    // กติกา/จุดระวัง
    owner?: string;   // ผู้รับผิดชอบ
  }> | null;
  created_at: string;
  updated_at: string;
}

export type PlanItemInput = Omit<PlanItem, "id" | "created_at" | "updated_at">;

interface MarketingPlanState {
  items: PlanItem[];
  loading: boolean;
  error: string | null;
  fetchAll: (year?: number) => Promise<void>;
  createItem: (data: PlanItemInput) => Promise<PlanItem | null>;
  updateItem: (id: string, data: Partial<PlanItemInput>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  updateStatus: (id: string, status: ItemStatus) => Promise<void>;
  updateActual: (id: string, monthIndex: number, amount: number) => Promise<void>;
}

export const useMarketingPlanStore = create<MarketingPlanState>()((set, get) => ({
  items: [],
  loading: false,
  error: null,

  fetchAll: async (year = 2027) => {
    if (!SUPABASE_ENABLED) return;
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from("marketing_plan_items")
        .select("*")
        .eq("year", year)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      set({ items: (data ?? []) as PlanItem[], loading: false });
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : String(err) });
    }
  },

  createItem: async (data) => {
    if (!SUPABASE_ENABLED) return null;
    try {
      const payload = {
        ...data,
        monthly_amounts: data.monthly_amounts ?? Array(12).fill(0),
        actual_amounts:  data.actual_amounts  ?? Array(12).fill(0),
      };
      const { data: created, error } = await supabase
        .from("marketing_plan_items")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      set((s) => ({ items: [...s.items, created as PlanItem].sort((a, b) => a.sort_order - b.sort_order) }));
      return created as PlanItem;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
      return null;
    }
  },

  updateItem: async (id, data) => {
    // Optimistic
    set((s) => ({
      items: s.items.map((x) => x.id === id ? { ...x, ...data, updated_at: new Date().toISOString() } : x),
    }));
    if (!SUPABASE_ENABLED) return;
    try {
      const { error } = await supabase
        .from("marketing_plan_items")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
      get().fetchAll(); // revert optimistic
    }
  },

  deleteItem: async (id) => {
    // Optimistic: also remove children (cascade handled by DB)
    const toRemove = new Set<string>();
    const collect = (pid: string) => {
      toRemove.add(pid);
      get().items.filter((x) => x.parent_id === pid).forEach((c) => collect(c.id));
    };
    collect(id);
    set((s) => ({ items: s.items.filter((x) => !toRemove.has(x.id)) }));
    if (!SUPABASE_ENABLED) return;
    try {
      const { error } = await supabase.from("marketing_plan_items").delete().eq("id", id);
      if (error) throw error;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
      get().fetchAll();
    }
  },

  updateStatus: async (id, status) => {
    get().updateItem(id, { status });
  },

  updateActual: async (id, monthIndex, amount) => {
    const item = get().items.find((x) => x.id === id);
    if (!item) return;
    const actual_amounts = [...item.actual_amounts];
    actual_amounts[monthIndex] = amount;
    get().updateItem(id, { actual_amounts });
  },
}));
