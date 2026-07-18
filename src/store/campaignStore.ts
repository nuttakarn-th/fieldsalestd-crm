/**
 * campaignStore — Marketing Campaign Management
 * ข้อมูลเก็บใน Supabase → ทุกเครื่องเห็นข้อมูลเดียวกัน
 * Fallback เป็น in-memory SEED เมื่อ SUPABASE_ENABLED = false
 */
import { create } from "zustand";
import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";
import { toast } from "sonner";

export type CampaignStatus = "Draft" | "Scheduled" | "Active" | "Paused" | "Completed";
export type CampaignTargetTeam = "OB" | "Sales" | "Both";

export const CAMPAIGN_CHANNELS = [
  "Facebook",
  "Instagram",
  "LINE OA",
  "Google Ads",
  "TikTok",
  "Email",
  "LinkedIn",
  "YouTube",
  "X (Twitter)",
  "อื่นๆ",
] as const;

export const CAMPAIGN_STATUS_LIST: CampaignStatus[] = [
  "Draft",
  "Scheduled",
  "Active",
  "Paused",
  "Completed",
];

export interface Campaign {
  id: string;
  campaign_id: string;           // CMP-001, CMP-002, ...
  name: string;
  channels: string[];
  target_team: CampaignTargetTeam;
  budget?: number;               // งบประมาณ (บาท)
  start_date: string;            // YYYY-MM-DD
  end_date: string;              // YYYY-MM-DD
  reach: number;
  leads: number;
  status: CampaignStatus;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ── Fallback SEED (ใช้เมื่อ Supabase ปิด) ────────────────────────────────────
const SEED: Campaign[] = [
  {
    id: "seed-camp-001",
    campaign_id: "CMP-001",
    name: "Summer Tour Promo 2026",
    channels: ["Facebook", "LINE OA", "Instagram", "TikTok"],
    target_team: "OB",
    start_date: "2026-07-18",
    end_date: "2026-08-31",
    reach: 12450,
    leads: 87,
    status: "Active",
    created_by: "ระบบ",
    created_at: "2026-04-15T00:00:00.000Z",
    updated_at: "2026-05-01T00:00:00.000Z",
  },
  {
    id: "seed-camp-002",
    campaign_id: "CMP-002",
    name: "Early Bird Japan",
    channels: ["Google Ads"],
    target_team: "Both",
    start_date: "2026-05-10",
    end_date: "2026-06-30",
    reach: 0,
    leads: 0,
    status: "Scheduled",
    created_by: "ระบบ",
    created_at: "2026-04-20T00:00:00.000Z",
    updated_at: "2026-04-20T00:00:00.000Z",
  },
  {
    id: "seed-camp-003",
    campaign_id: "CMP-003",
    name: "Incentive Corporate",
    channels: ["Email", "LinkedIn"],
    target_team: "Sales",
    start_date: "2026-01-01",
    end_date: "2026-03-31",
    reach: 8200,
    leads: 45,
    status: "Completed",
    created_by: "ระบบ",
    created_at: "2025-12-15T00:00:00.000Z",
    updated_at: "2026-03-31T00:00:00.000Z",
  },
];

// ── Row mapper: Supabase row → Campaign ──────────────────────────────────────
function rowToCampaign(row: Record<string, unknown>): Campaign {
  return {
    id:          row.id as string,
    campaign_id: row.campaign_id as string,
    name:        row.name as string,
    channels:    (row.channels as string[]) ?? [],
    target_team: (row.target_team as CampaignTargetTeam) ?? "Both",
    budget:      row.budget != null ? Number(row.budget) : undefined,
    start_date:  row.start_date as string,
    end_date:    row.end_date as string,
    reach:       Number(row.reach ?? 0),
    leads:       Number(row.leads ?? 0),
    status:      (row.status as CampaignStatus) ?? "Draft",
    notes:       row.notes as string | undefined,
    created_by:  (row.created_by as string) ?? "",
    created_at:  row.created_at as string,
    updated_at:  row.updated_at as string,
  };
}

// ── Store ─────────────────────────────────────────────────────────────────────
interface CampaignStore {
  campaigns: Campaign[];
  loading: boolean;
  _nextNum: number;

  loadCampaigns: () => Promise<void>;
  addCampaign: (data: Omit<Campaign, "id" | "campaign_id" | "created_at" | "updated_at">) => Promise<void>;
  updateCampaign: (id: string, patch: Partial<Campaign>) => Promise<void>;
  deleteCampaign: (id: string) => Promise<void>;
}

export const useCampaigns = create<CampaignStore>((set, get) => ({
  campaigns: SUPABASE_ENABLED ? [] : SEED,
  loading:   false,
  _nextNum:  4,

  // ── Load all campaigns from Supabase ──────────────────────────────────────
  loadCampaigns: async () => {
    if (!SUPABASE_ENABLED || !supabase) return;
    set({ loading: true });

    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[campaigns] load ล้มเหลว:", error);
      toast.error("โหลด Campaign ไม่สำเร็จ");
    } else {
      const campaigns = ((data ?? []) as Record<string, unknown>[]).map(rowToCampaign);
      // คำนวณ _nextNum จาก campaign_id สูงสุดที่มีอยู่
      const nums = campaigns
        .map((c) => parseInt(c.campaign_id.replace("CMP-", ""), 10))
        .filter((n) => !isNaN(n));
      const maxNum = nums.length > 0 ? Math.max(...nums) : 0;
      set({ campaigns, _nextNum: maxNum + 1 });
    }

    set({ loading: false });
  },

  // ── Add ───────────────────────────────────────────────────────────────────
  addCampaign: async (data) => {
    const num = get()._nextNum;
    const campaign_id = `CMP-${String(num).padStart(3, "0")}`;
    const now = new Date().toISOString();
    const newCampaign: Campaign = {
      ...data,
      id:          crypto.randomUUID(),
      campaign_id,
      created_at:  now,
      updated_at:  now,
    };

    // Optimistic update
    set({ campaigns: [newCampaign, ...get().campaigns], _nextNum: num + 1 });

    if (SUPABASE_ENABLED && supabase) {
      const row = {
        id:          newCampaign.id,
        campaign_id: newCampaign.campaign_id,
        name:        newCampaign.name,
        channels:    newCampaign.channels,
        target_team: newCampaign.target_team,
        budget:      newCampaign.budget ?? null,
        start_date:  newCampaign.start_date,
        end_date:    newCampaign.end_date,
        reach:       newCampaign.reach,
        leads:       newCampaign.leads,
        status:      newCampaign.status,
        notes:       newCampaign.notes ?? null,
        created_by:  newCampaign.created_by,
        created_at:  newCampaign.created_at,
        updated_at:  newCampaign.updated_at,
      };
      const { error } = await supabase.from("campaigns").insert(row);
      if (error) {
        console.error("[campaigns] insert ล้มเหลว:", error);
        toast.error("บันทึก Campaign ไม่สำเร็จ");
        // Rollback
        set({ campaigns: get().campaigns.filter((c) => c.id !== newCampaign.id), _nextNum: num });
      }
    }
  },

  // ── Update ────────────────────────────────────────────────────────────────
  updateCampaign: async (id, patch) => {
    const updated_at = new Date().toISOString();
    const prev = get().campaigns;
    set({
      campaigns: prev.map((c) =>
        c.id === id ? { ...c, ...patch, updated_at } : c
      ),
    });

    if (SUPABASE_ENABLED && supabase) {
      const { error } = await supabase
        .from("campaigns")
        .update({ ...patch, updated_at })
        .eq("id", id);
      if (error) {
        console.error("[campaigns] update ล้มเหลว:", error);
        toast.error("อัพเดต Campaign ไม่สำเร็จ");
        set({ campaigns: prev });
      }
    }
  },

  // ── Delete ────────────────────────────────────────────────────────────────
  deleteCampaign: async (id) => {
    const prev = get().campaigns;
    set({ campaigns: prev.filter((c) => c.id !== id) });

    if (SUPABASE_ENABLED && supabase) {
      const { error } = await supabase.from("campaigns").delete().eq("id", id);
      if (error) {
        console.error("[campaigns] delete ล้มเหลว:", error);
        toast.error("ลบ Campaign ไม่สำเร็จ");
        set({ campaigns: prev });
      }
    }
  },
}));
