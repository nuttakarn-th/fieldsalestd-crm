/**
 * activityLog.ts — Universal activity logger
 *
 * เรียกใช้จาก component/store layer เพื่อ:
 *   1. เพิ่ม entry ลง local activityLogStore ทันที (ไม่รอ network)
 *   2. Fire-and-forget insert ไปยัง Supabase activity_log table
 *      (เปิด realtime → Marketing users ทุก device รับแจ้งเตือน)
 */

import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";

// ── Event type catalogue ──────────────────────────────────────────────────────

export type ActivityEventType =
  // Tour / Period (Stock)
  | "tour_added"
  | "tour_deleted"
  | "tour_published"
  | "tour_unpublished"
  | "period_cancelled"
  | "period_restored"
  | "period_nearly_full"
  | "import_complete"
  // Lead
  | "lead_added"
  | "lead_updated"
  | "lead_won"
  | "lead_lost"
  | "lead_status_changed"
  // Customer
  | "customer_added"
  | "customer_deleted"
  | "customer_updated"
  // Campaign
  | "campaign_added"
  | "campaign_updated"
  | "campaign_deleted"
  | "campaign_status_changed"
  // Booking / Quota
  | "seat_booked"
  | "seat_released";

// ── Entry shape ───────────────────────────────────────────────────────────────

export interface ActivityEntry {
  event_type:   ActivityEventType | string;
  actor:        string;       // full_name ของคนที่ทำ action
  role?:        string;       // role ของ actor
  subject:      string;       // หัวข้อสั้นๆ (ภาษาไทย)
  detail?:      string;       // รายละเอียดเพิ่มเติม
  entity_type?: string;       // 'tour' | 'customer' | 'lead' | 'campaign' | 'booking'
  entity_id?:   string;
  entity_name?: string;       // tour code, ชื่อลูกค้า, ชื่อ campaign, ...
  meta?:        Record<string, unknown>;
}

// ── Tiny in-process bus ───────────────────────────────────────────────────────
// activityLogStore subscribe ที่นี่เพื่อรับ local push ก่อน Supabase ตอบกลับ

type Listener = (entry: ActivityEntry & { id: string; created_at: string }) => void;
const _listeners: Set<Listener> = new Set();

export function _subscribeLocalActivity(fn: Listener): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

// ── Main export ───────────────────────────────────────────────────────────────

export function logActivity(entry: ActivityEntry): void {
  const id         = crypto.randomUUID();
  const created_at = new Date().toISOString();

  const full = { ...entry, id, created_at };

  // 1. Local push — ไม่รอ Supabase
  _listeners.forEach((fn) => fn(full));

  // 2. Supabase insert (fire-and-forget)
  if (!SUPABASE_ENABLED || !supabase) return;
  supabase
    .from("activity_log")
    .insert({
      id,
      event_type:  entry.event_type,
      actor:       entry.actor,
      role:        entry.role        ?? "",
      subject:     entry.subject,
      detail:      entry.detail      ?? "",
      entity_type: entry.entity_type ?? "",
      entity_id:   entry.entity_id   ?? "",
      entity_name: entry.entity_name ?? "",
      meta:        entry.meta        ?? {},
      created_at,
    })
    .then(({ error }) => {
      if (error) console.error("[activityLog] insert ล้มเหลว:", error);
    });
}
