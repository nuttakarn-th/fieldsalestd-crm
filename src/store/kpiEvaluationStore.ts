/**
 * kpiEvaluationStore.ts
 * เก็บผลการประเมิน KPI รายบุคคล
 * Marketing Manager: สร้าง / แก้ไข / ดูทั้งหมด
 * พนักงาน: ดูได้เฉพาะของตัวเอง และเฉพาะเมื่อ Manager toggle isShared = true
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KPIScore {
  kpiId: string;
  score: 1 | 2 | 3 | 4 | 5;
  note?: string;
}

export interface KPIEvaluation {
  id: string;
  evaluateeId: string;    // user_id ของพนักงาน
  evaluateeName: string;  // เก็บชื่อไว้เพื่อแสดงผล
  evaluatorId: string;    // user_id ของ Marketing Manager
  period: string;         // "2026-07" (YYYY-MM)
  positionKey: string;    // "vdo_content" | "graphic_designer" | ...
  positionTitle: string;  // "VDO Content Creator" (เก็บไว้เพื่อแสดง)
  scores: KPIScore[];
  weightedTotal: number;  // คำนวณและเก็บไว้แล้ว
  overallNote?: string;
  isShared: boolean;      // true = พนักงานดูได้
  createdAt: string;
  updatedAt: string;
}

interface KPIEvaluationState {
  evaluations: KPIEvaluation[];
  /** evalId[] ที่พนักงานแต่ละคนเปิดอ่านแล้ว — keyed by userId */
  seenEvalIds: Record<string, string[]>;
  /** สร้างหรืออัปเดต evaluation (ถ้า id มีอยู่แล้ว = update) */
  upsertEvaluation: (data: Omit<KPIEvaluation, "id" | "createdAt" | "updatedAt"> & { id?: string }) => string;
  toggleShare: (id: string) => void;
  deleteEvaluation: (id: string) => void;
  /** พนักงานเปิดดู evaluation นี้แล้ว → ล้าง badge */
  markSeen: (userId: string, evalId: string) => void;
  /** จำนวนผลประเมินที่ share แล้วแต่ยังไม่ได้เปิดดู */
  unseenCount: (userId: string) => number;
}

function genId(): string {
  return `eval-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useKPIEvaluationStore = create<KPIEvaluationState>()(
  persist(
    (set, get) => ({
      evaluations: [],

      upsertEvaluation: (data) => {
        const now = new Date().toISOString();
        const existing = data.id ? get().evaluations.find((e) => e.id === data.id) : undefined;

        if (existing) {
          set((s) => ({
            evaluations: s.evaluations.map((e) =>
              e.id === data.id ? { ...e, ...data, id: e.id, createdAt: e.createdAt, updatedAt: now } : e
            ),
          }));
          return data.id!;
        } else {
          const id = data.id || genId();
          const record: KPIEvaluation = { ...data, id, createdAt: now, updatedAt: now };
          set((s) => ({ evaluations: [...s.evaluations, record] }));
          return id;
        }
      },

      toggleShare: (id) =>
        set((s) => ({
          evaluations: s.evaluations.map((e) =>
            e.id === id
              ? { ...e, isShared: !e.isShared, updatedAt: new Date().toISOString() }
              : e
          ),
        })),

      deleteEvaluation: (id) =>
        set((s) => ({ evaluations: s.evaluations.filter((e) => e.id !== id) })),

      seenEvalIds: {},

      markSeen: (userId, evalId) =>
        set((s) => ({
          seenEvalIds: {
            ...s.seenEvalIds,
            [userId]: [...new Set([...(s.seenEvalIds[userId] ?? []), evalId])],
          },
        })),

      unseenCount: (userId) => {
        const seen = new Set(get().seenEvalIds[userId] ?? []);
        return get().evaluations.filter(
          (e) => e.evaluateeId === userId && e.isShared && !seen.has(e.id)
        ).length;
      },
    }),
    { name: "kpi-evaluation-store-v1" }
  )
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * คำนวณ weighted score
 * @param scores   KPIScore[] จาก form
 * @param weights  [{ id, weight }] จาก KPIItem[]
 */
export function calcWeightedScore(
  scores: KPIScore[],
  weights: { id: string; weight: number }[]
): number {
  let total = 0;
  scores.forEach((s) => {
    const w = weights.find((w) => w.id === s.kpiId);
    if (w) total += s.score * w.weight;
  });
  return Math.round(total * 100) / 100;
}

export type ScoreLabel = "ดีเยี่ยม" | "ดีมาก" | "ผ่านเกณฑ์" | "ต้องพัฒนา" | "ต่ำกว่าเกณฑ์";

export function scoreLabel(total: number): ScoreLabel {
  if (total >= 4.5) return "ดีเยี่ยม";
  if (total >= 4.0) return "ดีมาก";
  if (total >= 3.0) return "ผ่านเกณฑ์";
  if (total >= 2.0) return "ต้องพัฒนา";
  return "ต่ำกว่าเกณฑ์";
}

export function scoreBadgeClass(total: number): string {
  if (total >= 4.5) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
  if (total >= 4.0) return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
  if (total >= 3.0) return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  if (total >= 2.0) return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300";
  return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
}

/** สร้าง YYYY-MM string จากวันปัจจุบัน */
export function currentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** แปลง "2026-07" → "กรกฎาคม 2569" */
const THAI_MONTHS = [
  "มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
  "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม",
];
export function formatPeriodThai(period: string): string {
  const [y, m] = period.split("-").map(Number);
  if (!y || !m) return period;
  const buddhistYear = y + 543;
  return `${THAI_MONTHS[m - 1] ?? ""} ${buddhistYear}`;
}
