/**
 * incentiveStore.ts
 * Zustand store for Incentive Tour Pipeline
 * Persisted to localStorage (no Supabase table required yet)
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

// ── Types ─────────────────────────────────────────────────────────────────────

export const INCENTIVE_STATUSES = [
  "รับเรื่อง",
  "ออกแบบแผน",
  "ส่ง Proposal",
  "รอยืนยัน",
  "ยืนยันแล้ว",
  "ดำเนินการ",
] as const;

export type IncentiveStatus = (typeof INCENTIVE_STATUSES)[number];

export interface IncentiveRequest {
  id: string;
  company: string;        // ชื่อบริษัท / กลุ่มลูกค้า
  contact?: string;       // ชื่อผู้ติดต่อ
  group_size?: number;    // จำนวนคน
  date_from?: string;     // YYYY-MM-DD ช่วงวันที่ต้องการ
  date_to?: string;
  destination?: string;   // ปลายทาง
  budget?: number;        // งบประมาณ (บาท)
  status: IncentiveStatus;
  assigned_to?: string;   // ผู้รับผิดชอบ
  notes?: string;
  created_at: string;     // ISO timestamp
  updated_at: string;
  created_by?: string;
}

// ── Store ─────────────────────────────────────────────────────────────────────

interface IncentiveState {
  requests: IncentiveRequest[];
  addRequest: (r: Omit<IncentiveRequest, "id" | "created_at" | "updated_at">) => string;
  updateRequest: (id: string, patch: Partial<Omit<IncentiveRequest, "id" | "created_at">>) => void;
  moveStatus: (id: string, status: IncentiveStatus) => void;
  deleteRequest: (id: string) => void;
}

const uid = () => Math.random().toString(36).slice(2, 10);

export const useIncentive = create<IncentiveState>()(
  persist(
    (set, get) => ({
      requests: [],

      addRequest: (r) => {
        const id = uid();
        const now = new Date().toISOString();
        const req: IncentiveRequest = { ...r, id, created_at: now, updated_at: now };
        set({ requests: [...get().requests, req] });
        return id;
      },

      updateRequest: (id, patch) => {
        set({
          requests: get().requests.map((r) =>
            r.id === id ? { ...r, ...patch, updated_at: new Date().toISOString() } : r
          ),
        });
      },

      moveStatus: (id, status) => {
        set({
          requests: get().requests.map((r) =>
            r.id === id ? { ...r, status, updated_at: new Date().toISOString() } : r
          ),
        });
      },

      deleteRequest: (id) => {
        set({ requests: get().requests.filter((r) => r.id !== id) });
      },
    }),
    { name: "incentive-pipeline-v1" }
  )
);
