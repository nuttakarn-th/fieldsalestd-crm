/**
 * marketingLeadsStore — Marketing Leads (Prospect Pool)
 * Marketing ลงข้อมูล Prospect → Sales กดขอ Lead ไปติดตาม
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type LeadSource = "LINE" | "Facebook" | "Instagram" | "Walk-in" | "Referral" | "TikTok" | "Website" | "อื่นๆ";
export type LeadStatus = "available" | "claimed";

export interface MarketingLead {
  id: string;
  name: string;
  phone: string;
  source: LeadSource;
  interest: string;      // สนใจทัวร์/โปรแกรมอะไร
  budget: string;        // งบประมาณ
  groupSize: string;     // จำนวนคน
  notes: string;
  status: LeadStatus;
  claimed_by: string | null;     // full_name ของ Sales ที่รับ
  created_by: string;            // full_name ของ Marketing ที่ลง
  created_at: string;
  claimed_at: string | null;
}

interface MarketingLeadsState {
  leads: MarketingLead[];
  addLead: (lead: Omit<MarketingLead, "id" | "status" | "claimed_by" | "claimed_at" | "created_at">) => void;
  claimLead: (id: string, claimedBy: string) => void;
  deleteLead: (id: string) => void;
  updateLead: (id: string, patch: Partial<MarketingLead>) => void;
}

export const useMarketingLeads = create<MarketingLeadsState>()(
  persist(
    (set) => ({
      leads: [],

      addLead: (data) =>
        set((s) => ({
          leads: [
            {
              ...data,
              id: crypto.randomUUID(),
              status: "available",
              claimed_by: null,
              claimed_at: null,
              created_at: new Date().toISOString(),
            },
            ...s.leads,
          ],
        })),

      claimLead: (id, claimedBy) =>
        set((s) => ({
          leads: s.leads.map((l) =>
            l.id === id
              ? { ...l, status: "claimed", claimed_by: claimedBy, claimed_at: new Date().toISOString() }
              : l
          ),
        })),

      deleteLead: (id) =>
        set((s) => ({ leads: s.leads.filter((l) => l.id !== id) })),

      updateLead: (id, patch) =>
        set((s) => ({
          leads: s.leads.map((l) => (l.id === id ? { ...l, ...patch } : l)),
        })),
    }),
    { name: "stdtour-marketing-leads-v1" }
  )
);
