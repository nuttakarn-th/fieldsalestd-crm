/**
 * actionPlanStore — Action Plans สำหรับแต่ละ Campaign
 * เก็บใน Supabase table: campaign_action_plans
 */
import { create } from "zustand";
import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";
import { toast } from "sonner";

export type ActionPlanStatus = "Todo" | "In Progress" | "Done";

export interface ActionPlan {
  id: string;
  campaign_id: string;
  title: string;
  start_date?: string;   // YYYY-MM-DD
  end_date?: string;     // YYYY-MM-DD
  status: ActionPlanStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

function rowToActionPlan(row: Record<string, unknown>): ActionPlan {
  return {
    id:          row.id as string,
    campaign_id: row.campaign_id as string,
    title:       row.title as string,
    start_date:  row.start_date as string | undefined,
    end_date:    row.end_date as string | undefined,
    status:      (row.status as ActionPlanStatus) ?? "Todo",
    sort_order:  Number(row.sort_order ?? 0),
    created_at:  row.created_at as string,
    updated_at:  row.updated_at as string,
  };
}

interface ActionPlanStore {
  /** keyed by campaign_id */
  plansByCampaign: Record<string, ActionPlan[]>;
  loading: boolean;

  loadPlans: (campaignId: string) => Promise<void>;
  addPlan: (campaignId: string, title: string, startDate?: string, endDate?: string) => Promise<void>;
  updatePlan: (id: string, campaignId: string, patch: Partial<ActionPlan>) => Promise<void>;
  deletePlan: (id: string, campaignId: string) => Promise<void>;
  toggleStatus: (id: string, campaignId: string) => Promise<void>;
}

export const useActionPlans = create<ActionPlanStore>((set, get) => ({
  plansByCampaign: {},
  loading: false,

  loadPlans: async (campaignId) => {
    if (!SUPABASE_ENABLED || !supabase) return;
    set({ loading: true });
    const { data, error } = await supabase
      .from("campaign_action_plans")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("sort_order", { ascending: true });
    if (error) {
      console.error("[actionPlan] load ล้มเหลว:", error);
    } else {
      const plans = ((data ?? []) as Record<string, unknown>[]).map(rowToActionPlan);
      set((s) => ({ plansByCampaign: { ...s.plansByCampaign, [campaignId]: plans } }));
    }
    set({ loading: false });
  },

  addPlan: async (campaignId, title, startDate, endDate) => {
    const now = new Date().toISOString();
    const existing = get().plansByCampaign[campaignId] ?? [];
    const newPlan: ActionPlan = {
      id:          crypto.randomUUID(),
      campaign_id: campaignId,
      title,
      start_date:  startDate,
      end_date:    endDate,
      status:      "Todo",
      sort_order:  existing.length,
      created_at:  now,
      updated_at:  now,
    };
    set((s) => ({
      plansByCampaign: {
        ...s.plansByCampaign,
        [campaignId]: [...existing, newPlan],
      },
    }));
    if (SUPABASE_ENABLED && supabase) {
      const { error } = await supabase.from("campaign_action_plans").insert({
        id:          newPlan.id,
        campaign_id: newPlan.campaign_id,
        title:       newPlan.title,
        start_date:  newPlan.start_date ?? null,
        end_date:    newPlan.end_date ?? null,
        status:      newPlan.status,
        sort_order:  newPlan.sort_order,
        created_at:  newPlan.created_at,
        updated_at:  newPlan.updated_at,
      });
      if (error) {
        console.error("[actionPlan] insert ล้มเหลว:", error);
        toast.error("เพิ่ม task ไม่สำเร็จ");
        set((s) => ({
          plansByCampaign: {
            ...s.plansByCampaign,
            [campaignId]: (s.plansByCampaign[campaignId] ?? []).filter((p) => p.id !== newPlan.id),
          },
        }));
      }
    }
  },

  updatePlan: async (id, campaignId, patch) => {
    const updated_at = new Date().toISOString();
    const prev = get().plansByCampaign[campaignId] ?? [];
    set((s) => ({
      plansByCampaign: {
        ...s.plansByCampaign,
        [campaignId]: prev.map((p) => p.id === id ? { ...p, ...patch, updated_at } : p),
      },
    }));
    if (SUPABASE_ENABLED && supabase) {
      const { error } = await supabase
        .from("campaign_action_plans")
        .update({ ...patch, updated_at })
        .eq("id", id);
      if (error) {
        console.error("[actionPlan] update ล้มเหลว:", error);
        toast.error("อัพเดต task ไม่สำเร็จ");
        set((s) => ({ plansByCampaign: { ...s.plansByCampaign, [campaignId]: prev } }));
      }
    }
  },

  deletePlan: async (id, campaignId) => {
    const prev = get().plansByCampaign[campaignId] ?? [];
    set((s) => ({
      plansByCampaign: {
        ...s.plansByCampaign,
        [campaignId]: prev.filter((p) => p.id !== id),
      },
    }));
    if (SUPABASE_ENABLED && supabase) {
      const { error } = await supabase.from("campaign_action_plans").delete().eq("id", id);
      if (error) {
        console.error("[actionPlan] delete ล้มเหลว:", error);
        toast.error("ลบ task ไม่สำเร็จ");
        set((s) => ({ plansByCampaign: { ...s.plansByCampaign, [campaignId]: prev } }));
      }
    }
  },

  toggleStatus: async (id, campaignId) => {
    const plans = get().plansByCampaign[campaignId] ?? [];
    const plan = plans.find((p) => p.id === id);
    if (!plan) return;
    const next: ActionPlanStatus =
      plan.status === "Todo"        ? "In Progress" :
      plan.status === "In Progress" ? "Done"        : "Todo";
    await get().updatePlan(id, campaignId, { status: next });
  },
}));
