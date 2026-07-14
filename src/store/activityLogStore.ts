/**
 * activityLogStore — Zustand store สำหรับ Universal Activity Log
 *
 * - รับ entry จาก logActivity() ทาง local bus (ทันที ไม่รอ network)
 * - รับ realtime INSERT จาก Supabase activity_log (cross-device/cross-user)
 * - De-duplicate ด้วย id เพื่อป้องกัน entry ซ้ำกัน
 * - เก็บสูงสุด MAX_LOGS รายการในหน่วยความจำ
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

interface ActivityLogState {
  logs:        ActivityLog[];
  unreadCount: number;
  /** ISO string — ครั้งล่าสุดที่ Marketing user กด "อ่านแล้ว" */
  lastReadAt:  string;

  // Actions
  addEntry:    (entry: ActivityLog) => void;
  markAllRead: () => void;

  /** เรียกครั้งเดียวตอน mount — โหลด 100 รายการล่าสุดจาก Supabase + subscribe realtime */
  init:        () => () => void;
}

const MAX_LOGS = 100;
const EPOCH    = new Date(0).toISOString();

// ── Store ─────────────────────────────────────────────────────────────────────

export const useActivityLog = create<ActivityLogState>()((set, get) => ({
  logs:        [],
  unreadCount: 0,
  lastReadAt:  EPOCH,

  // ── addEntry: de-duplicate then prepend ──────────────────────────────────────
  addEntry: (entry) => {
    const existing = get().logs;
    if (existing.some((l) => l.id === entry.id)) return; // de-dup

    const isUnread = new Date(entry.created_at) > new Date(get().lastReadAt);
    set({
      logs:        [entry, ...existing].slice(0, MAX_LOGS),
      unreadCount: isUnread ? get().unreadCount + 1 : get().unreadCount,
    });
  },

  // ── markAllRead ──────────────────────────────────────────────────────────────
  markAllRead: () =>
    set({ unreadCount: 0, lastReadAt: new Date().toISOString() }),

  // ── init: load history + subscribe ──────────────────────────────────────────
  init: () => {
    const { addEntry } = get();

    // 1. Subscribe local bus (ทันทีเมื่อ logActivity() ถูกเรียก)
    const unsubLocal = _subscribeLocalActivity((entry) => addEntry(entry as ActivityLog));

    // 2. Supabase: load 100 รายการล่าสุด
    if (SUPABASE_ENABLED && supabase) {
      supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(MAX_LOGS)
        .then(({ data, error }) => {
          if (error) {
            console.error("[activityLog] loadRecent ล้มเหลว:", error);
            return;
          }
          (data as ActivityLog[]).forEach((row) => addEntry(row));
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
          (payload) => {
            addEntry(payload.new as ActivityLog);
          },
        )
        .subscribe((status) => {
          console.info("[activityLog] realtime:", status);
        });

      unsubRealtime = () => supabase!.removeChannel(channel);
    }

    // คืน cleanup function
    return () => {
      unsubLocal();
      unsubRealtime?.();
    };
  },
}));
