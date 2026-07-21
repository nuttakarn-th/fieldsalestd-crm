/**
 * activityLogStore v2 — Zustand store สำหรับ Universal Activity Log
 *
 * v2 improvements:
 * - lastReadAt persisted to localStorage → badge ไม่ reset หลัง Refresh
 * - clearLogs() — ล้าง list ใน local (ไม่ลบ DB)
 * - mutedCategories เป็น plain Record<string,boolean> (serializable, ไม่ใช้ Set)
 * - toastEntry — entry ล่าสุดสำหรับ real-time toast
 * - init รับ getFeedOpen callback เพื่อ suppress toast ขณะ popup เปิดอยู่
 */

import { create } from "zustand";
import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";
import {
  _subscribeLocalActivity,
  type ActivityEntry,
  type ActivityEventType,
} from "@/lib/activityLog";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ActivityLog extends ActivityEntry {
  id:         string;
  created_at: string;
  event_type: ActivityEventType | string;
}

export type NotifCategory = "tour" | "lead" | "customer" | "campaign" | "seat" | "system";

export function eventCategory(event_type: string): NotifCategory {
  if (
    event_type.startsWith("tour_") ||
    event_type.startsWith("period_") ||
    event_type === "import_complete" ||
    event_type === "period_nearly_full"
  ) return "tour";
  if (event_type.startsWith("lead_"))     return "lead";
  if (event_type.startsWith("customer_")) return "customer";
  if (event_type.startsWith("campaign_")) return "campaign";
  if (event_type.startsWith("seat_"))     return "seat";
  return "system";
}

interface ActivityLogState {
  logs:             ActivityLog[];
  lastReadAt:       string;                      // ISO — persisted to localStorage
  mutedCategories:  Record<string, boolean>;     // plain object, serializable
  toastEntry:       ActivityLog | null;

  addEntry:    (entry: ActivityLog, feedOpen?: boolean) => void;
  markAllRead: () => void;
  clearLogs:   () => void;
  toggleMute:  (cat: NotifCategory) => void;
  consumeToast:() => void;

  init: (getFeedOpen: () => boolean) => () => void;
}

// ── localStorage helpers ──────────────────────────────────────────────────────

const MAX_LOGS     = 100;
const EPOCH        = new Date(0).toISOString();
const LS_LAST_READ = "crm_activity_lastReadAt";
const LS_MUTED     = "crm_activity_mutedCategories";

function loadLastReadAt(): string {
  try { return localStorage.getItem(LS_LAST_READ) ?? EPOCH; } catch { return EPOCH; }
}
function saveLastReadAt(iso: string) {
  try { localStorage.setItem(LS_LAST_READ, iso); } catch { /* noop */ }
}
function loadMuted(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(LS_MUTED);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch { return {}; }
}
function saveMuted(m: Record<string, boolean>) {
  try { localStorage.setItem(LS_MUTED, JSON.stringify(m)); } catch { /* noop */ }
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useActivityLog = create<ActivityLogState>()((set, get) => ({
  logs:            [],
  lastReadAt:      loadLastReadAt(),
  mutedCategories: loadMuted(),
  toastEntry:      null,

  // ── addEntry ──────────────────────────────────────────────────────────────────
  addEntry: (entry, feedOpen = false) => {
    const state = get();
    if (state.logs.some((l) => l.id === entry.id)) return; // de-dup

    const isNew = new Date(entry.created_at) > new Date(state.lastReadAt);
    const cat   = eventCategory(entry.event_type);
    const muted = !!state.mutedCategories[cat];

    set({
      logs:       [entry, ...state.logs].slice(0, MAX_LOGS),
      toastEntry: (isNew && !feedOpen && !muted) ? entry : state.toastEntry,
    });
  },

  // ── markAllRead ───────────────────────────────────────────────────────────────
  markAllRead: () => {
    const iso = new Date().toISOString();
    saveLastReadAt(iso);
    set({ lastReadAt: iso, toastEntry: null });
  },

  // ── clearLogs — local only ────────────────────────────────────────────────────
  clearLogs: () => set({ logs: [], toastEntry: null }),

  // ── toggleMute ────────────────────────────────────────────────────────────────
  toggleMute: (cat) => {
    const current = get().mutedCategories;
    const next = { ...current, [cat]: !current[cat] };
    saveMuted(next);
    set({ mutedCategories: next });
  },

  // ── consumeToast ──────────────────────────────────────────────────────────────
  consumeToast: () => set({ toastEntry: null }),

  // ── init: load history + subscribe ───────────────────────────────────────────
  init: (getFeedOpen) => {
    const store = get();

    // 1. Subscribe local bus
    const unsubLocal = _subscribeLocalActivity((entry) => {
      get().addEntry(entry as ActivityLog, getFeedOpen());
    });

    // 2. Load 100 รายการล่าสุดจาก Supabase (history → ไม่ toast)
    if (SUPABASE_ENABLED && supabase) {
      supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(MAX_LOGS)
        .then(({ data, error }) => {
          if (error) { console.error("[activityLog] load ล้มเหลว:", error); return; }
          // reverse เพื่อ prepend ในลำดับที่ถูกต้อง (newest on top)
          ;[...(data as ActivityLog[])].reverse().forEach((row) => {
            get().addEntry(row, true); // feedOpen=true → suppress toast
          });
        });
    }

    // 3. Supabase Realtime — รับ INSERT จาก user อื่น
    let unsubRealtime: (() => void) | null = null;
    if (SUPABASE_ENABLED && supabase) {
      const channel = supabase
        .channel("activity-log-realtime")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "activity_log" },
          (payload) => { get().addEntry(payload.new as ActivityLog, getFeedOpen()); },
        )
        .subscribe((status) => { console.info("[activityLog] realtime:", status); });

      unsubRealtime = () => supabase!.removeChannel(channel);
    }

    void store; // suppress unused warning
    return () => {
      unsubLocal();
      unsubRealtime?.();
    };
  },
}));
