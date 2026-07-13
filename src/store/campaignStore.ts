/**
 * campaignStore — Marketing Campaign Management
 * CRUD for campaigns with Zustand + persist
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CampaignStatus = "Draft" | "Scheduled" | "Active" | "Paused" | "Completed";

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
  campaign_id: string;   // CMP-001, CMP-002, ...
  name: string;
  channels: string[];
  budget?: number;       // งบประมาณ (บาท)
  start_date: string;    // YYYY-MM-DD
  end_date: string;      // YYYY-MM-DD
  reach: number;
  leads: number;
  status: CampaignStatus;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface CampaignStore {
  campaigns: Campaign[];
  _nextNum: number;
  addCampaign: (
    data: Omit<Campaign, "id" | "campaign_id" | "created_at" | "updated_at">
  ) => void;
  updateCampaign: (id: string, patch: Partial<Campaign>) => void;
  deleteCampaign: (id: string) => void;
}

// ── Seed data (matches previous hardcoded rows) ───────────────────────────────

const SEED: Campaign[] = [
  {
    id: "seed-camp-001",
    campaign_id: "CMP-001",
    name: "Summer Tour Promo 2026",
    channels: ["Facebook", "LINE OA"],
    start_date: "2026-05-01",
    end_date: "2026-05-31",
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
    name: "Incentive Corporate Campaign",
    channels: ["Email", "LinkedIn"],
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

// ── Store ─────────────────────────────────────────────────────────────────────

export const useCampaigns = create<CampaignStore>()(
  persist(
    (set) => ({
      campaigns: SEED,
      _nextNum: 4, // next free number → CMP-004

      addCampaign: (data) =>
        set((s) => {
          const num = s._nextNum;
          const campaign_id = `CMP-${String(num).padStart(3, "0")}`;
          const now = new Date().toISOString();
          return {
            _nextNum: num + 1,
            campaigns: [
              {
                ...data,
                id: crypto.randomUUID(),
                campaign_id,
                created_at: now,
                updated_at: now,
              },
              ...s.campaigns,
            ],
          };
        }),

      updateCampaign: (id, patch) =>
        set((s) => ({
          campaigns: s.campaigns.map((c) =>
            c.id === id
              ? { ...c, ...patch, updated_at: new Date().toISOString() }
              : c
          ),
        })),

      deleteCampaign: (id) =>
        set((s) => ({ campaigns: s.campaigns.filter((c) => c.id !== id) })),
    }),
    { name: "stdtour-campaigns-v1" }
  )
);
