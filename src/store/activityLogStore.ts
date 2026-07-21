/**
 * activityLogStore — Zustand store สำหรับ Universal Activity Log
 *
 * v2 improvements:
 * - lastReadAt persisted to localStorage → badge ไม่ reset หลัง Refresh
 * - clearLogs() — ล้าง list ใน local (ไม่ลบ DB)
 * - mutedCategories persisted to localStorage — mute event category ได้
 * - isUnread() helper — compute per-entry unread state ใน component
 * - toastEntry — entry ล่าสุดสำหรับ real-time toast (popup ปิดอยู่)
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

/** หมวด event ที่ผู้ใช้ mute ได้ */
export type NotifCategory = "tour" | "lead" | "customer" | "campaign" | "seat" | "system";

export function eventCategory(event_type: string): NotifCategory {
  if (event_type.startsWith("tour_") || event_type.startsWith("period_") || event_type === "import_complete" || event_type === "period_nearly_full") return "tour";
  if (event_type.startsWith("lead_"))     return "lead";
  if (event_type.startsWith("customer_")) return "customer";
  if (event_type.startsWith("campaign_")) return "campaign";
  if (event_type.startsWith("seat_"))     return "seat";
  return "system";
}

interface ActivityLogState {
  logs:             ActivityLog[];
  lastReadAt:       string;          // ISO — persisted to localStorage
  mutedCategories:  Set<NotifCategory>; // persisted to localStorage
  toastEntry:       ActivityLog | null; // entry ล่าสุดสำหรับ toast (cleared หลัง consumed)

  // Actions
  addEntry:          (entry: ActivityLog, feedOpen?: boolean) => void;
  markAllRead:       () => void;
  clearLogs:         () => void;
  toggleMute:        (cat: NotifCategory) => void;
  consumeToast:      () => void;
  isUnread:          (entry: ActivityLog) => boolean;

  /** เรียกครั้งเดียวตอน mount — โหลด 100 รายการล่าสุดจาก Supabase + subscribe realtime */
  init: (getFeedOpen: () => boolean) => () => void;
}

const MAX_LOGS        = 100;
const EPOCH           = new Date(0).toISOString();
const LS_LAST_READ    = "crm_activity_lastReadAt";
const LS_MUTED        = "crm_activity_mutedCategories";

function loadLastReadAt(): string {
  try { return localStorage.getItem(LS_LAST_READ) ?? EPOCH; } catch { return EPOCH; }
}
function saveLastReadAt(iso: string) {
  try { localStorage.setItem(LS_LAST_READ, iso); } catch { /* ignore */ }
}
function loadMuted(): Set<NotifCategory> {
  try {
    const raw = localStorage.getItem(LS_MUTED);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as NotifCategory[]);
  } catch { return new Set(); }
}
function saveMuted(s: Set<NotifCategory>) {
  try { localStorage.setItem(LS_MUTED, JSON.stringify([...s])); } catch { /* ignore */ }
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useActivityLog = create<ActivityLogState>()((set, get) => ({
  logs:            [],
  lastReadAt:      loadLastReadAt(),
  mutedCategories: loadMuted(),
  toastEntry:      null,

  // ── isUnread helper ──────────────────────────────────────────────────────────
  isUnread: (entry) => new Date(entry.created_at) > new Date(get().lastReadAt),

  // ── addEntry: de-duplicate → prepend → optional toast ───────────────────────
  addEntry: (entry, feedOpen = false) => {
    const { logs, lastReadAt, mutedCategories } = get();
    if (logs.some((l) => l.id === entry.id)) return; // de-dup

    const isNew = new Date(entry.created_at) > new Date(lastReadAt);
    const cat   = eventCategory(entry.event_type);
    const muted = mutedCategories.has(cat);

    set({
      logs:       [entry, ...logs].slice(0, MAX_LOGS),
      // ถ้า feed กำลังเปิดอยู่ → ไม่ toast; ถ้า muted → ไม่ toast
      toastEntry: (isNew && !feedOpen && !muted) ? entry : get().toastEntry,
    });
  },

  // ── markAllRead ──────────────────────────────────────────────────────────────
  markAllRead: () => {
    const iso = new Date().toISOString();
    saveLastReadAt(iso);
    set({ lastReadAt: iso, toastEntry: null });
  },

  // ── clearLogs — local only ───────────────────────────────────────────────────
  clearLogs: () => set({ logs: [], toastEntry: null }),

  // ── toggleMute ───────────────────────────────────────────────────────────────
  toggleMute: (cat) => {
    const next = new Set(get().mutedCategories);
    if (next.has(cat)) next.delete(cat); else next.add(cat);
    saveMuted(next);
    set({ mutedCategories: next });
  },

  // ── consumeToast ─────────────────────────────────────────────────────────────
  consumeToast: () => set({ toastEntry: null }),

  // ── init: load history + subscribe ──────────────────────────────────────────
  init: (getFeedOpen) => {
    const { addEntry } = get();

    // 1. Subscribe local bus (ทันทีเมื่อ logActivity() ถูกเรียก)
    const unsubLocal = _subscribeLocalActivity((entry) =>
      addEntry(entry as ActivityLog, getFeedOpen())
    );

    // 2. Supabase: load 100 รายการล่าสุด (ไม่ trigger toast — เป็น history)
    if (SUPABASE_ENABLED && supabase) {
      supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(MAX_LOGS)
        .then(({ data, error }) => {
          if (error) { console.error("[activityLog] loadRecent ล้มเหลว:", error); return; }
          // reverse → forEach เพื่อให้ newest อยู่บนสุด หลัง prepend ทั้งหมด
          ;[...(data as ActivityLog[])].reverse().forEach((row) => {
            // history load → ไม่ toast (feedOpen=true เป็น workaround)
            get().addEntry(row, true);
          });
        });
    }

    // 3. Supabase Realtime — รับ INSERT จาก user อื่นๆ
    let unsubRealtime: (() => void) | null = null;
    if (SUPABASE_ENABLED && supabase) {
      const channel = supabase
        .channel("activity-log-realtime")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "activity_log" },
          (payload) => { addEntry(payload.new as ActivityLog, getFeedOpen()); },
        )
        .subscribe((status) => { console.info("[activityLog] realtime:", status); });

      unsubRealtime = () => supabase!.removeChannel(channel);
    }

    return () => { unsubLocal(); unsubRealtime?.(); };
  },
}));
