/**
 * shortLink.ts — Short URL helpers
 *
 * สร้าง/จัดการ short links สำหรับ share โปรแกรมทัวร์
 * แต่ละ short link สามารถระบุ source (channel) เพื่อ track ว่า
 * มาจาก Facebook / LINE / QR ที่งาน / etc.
 */

import { supabase } from "@/lib/supabase";

// ── Base62: 0-9, A-Z, a-z ─────────────────────────────────────────────────
const B62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/**
 * สุ่ม code ขนาด `len` ตัวอักษร (default 3 → 10×62² = ~38K combinations)
 * ตัวแรกเป็นตัวเลข 0-9 เสมอ → ป้องกันชนกับ SPA routes (/app, /login ฯลฯ)
 */
export function genCode(len = 3): string {
  const first = B62[Math.floor(Math.random() * 10)]; // '0'-'9'
  const rest = Array.from({ length: len - 1 }, () => B62[Math.floor(Math.random() * 62)]).join("");
  return first + rest;
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface ShortLink {
  code: string;
  pkg_id: string;
  source: string;
  view_count: number;
  created_at: string;
}

// ── URL helpers ───────────────────────────────────────────────────────────────
export const SHORT_BASE = "https://stdtour.vercel.app";

export function shortUrl(code: string): string {
  // code ที่ขึ้นต้นด้วยตัวเลข → root-level: stdtour.vercel.app/3Ak
  // code เก่า (ขึ้นต้นด้วยตัวอักษร เช่น O6X19) → legacy /s/ path
  return /^[0-9]/.test(code)
    ? `${SHORT_BASE}/${code}`
    : `${SHORT_BASE}/s/${code}`;
}

// ── CRUD helpers ──────────────────────────────────────────────────────────────

/**
 * สร้าง short link ใหม่สำหรับ pkg_id + source
 * retry ถึง 3 ครั้งกรณี code ชน (ความน่าจะเป็นต่ำมาก)
 */
export async function createShortLink(
  pkg_id: string,
  source: string
): Promise<ShortLink | null> {
  if (!supabase) return null;
  for (let i = 0; i < 3; i++) {
    const code = genCode();
    const { data, error } = await supabase
      .from("short_links")
      .insert({ code, pkg_id, source, view_count: 0 })
      .select()
      .single();
    if (!error && data) return data as ShortLink;
  }
  return null;
}

/** โหลด short links ทั้งหมดของ pkg_id นี้ เรียงตาม created_at */
export async function getLinksForPkg(pkg_id: string): Promise<ShortLink[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("short_links")
    .select("*")
    .eq("pkg_id", pkg_id)
    .order("created_at", { ascending: true });
  return (data ?? []) as ShortLink[];
}

/** โหลด view count รวมทุก pkg_id → returns map { pkg_id → total views } */
export async function getAllViewCounts(): Promise<Record<string, number>> {
  if (!supabase) return {};
  const { data } = await supabase
    .from("short_links")
    .select("pkg_id, view_count");
  if (!data) return {};
  const map: Record<string, number> = {};
  for (const row of data as { pkg_id: string; view_count: number }[]) {
    map[row.pkg_id] = (map[row.pkg_id] ?? 0) + row.view_count;
  }
  return map;
}

// ── Event Analytics ───────────────────────────────────────────────────────────

export interface ProgramStat {
  pkg_id: string;
  views: number;
}

export interface EventStat {
  source: string;
  totalViews: number;
  programs: ProgramStat[];
}

/**
 * โหลดทุก short_links แล้วจัด group ตาม source (= channel / event)
 * Returns array เรียงตาม totalViews DESC
 */
export async function getEventAnalytics(): Promise<EventStat[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("short_links")
    .select("source, pkg_id, view_count");
  if (!data) return [];

  const map = new Map<string, Map<string, number>>();
  for (const row of data as { source: string; pkg_id: string; view_count: number }[]) {
    if (!map.has(row.source)) map.set(row.source, new Map());
    const prog = map.get(row.source)!;
    prog.set(row.pkg_id, (prog.get(row.pkg_id) ?? 0) + row.view_count);
  }

  const result: EventStat[] = [];
  for (const [source, programs] of map) {
    const programList = [...programs.entries()]
      .map(([pkg_id, views]) => ({ pkg_id, views }))
      .sort((a, b) => b.views - a.views);
    const totalViews = programList.reduce((s, p) => s + p.views, 0);
    result.push({ source, totalViews, programs: programList });
  }
  return result.sort((a, b) => b.totalViews - a.totalViews);
}

// ── Snapshot / Baseline ───────────────────────────────────────────────────────

export interface EventSnapshot {
  id: string;
  channel: string;
  snapshot_name: string | null;
  snapped_at: string;
  baselines: Record<string, number>; // { link_code → view_count }
}

/**
 * บันทึก snapshot ณ ตอนนี้ สำหรับ channel นั้น
 * baselines = { code: view_count } ของทุก link ใน channel นั้น
 */
export async function saveSnapshot(
  channel: string,
  links: ShortLink[],
  snapshotName?: string,
): Promise<boolean> {
  if (!supabase) return false;
  const baselines: Record<string, number> = {};
  for (const l of links) baselines[l.code] = l.view_count;
  const { error } = await supabase.from("event_snapshots").insert({
    channel,
    snapshot_name: snapshotName ?? null,
    baselines,
  });
  return !error;
}

/** โหลด snapshot ล่าสุดของ channel นี้ */
export async function getLatestSnapshot(channel: string): Promise<EventSnapshot | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("event_snapshots")
    .select("*")
    .eq("channel", channel)
    .order("snapped_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as EventSnapshot | null;
}

/** ลบ short link (code = PK) */
export async function deleteShortLink(code: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("short_links").delete().eq("code", code);
}

/**
 * นับ "direct view" — การคลิกเปิดโปรแกรมโดยตรงจากหน้า /tour-packages
 * ใช้ row พิเศษ: code = 'd_{pkg_id}', source = 'direct'
 * ไม่ต้องเปลี่ยน schema ใดๆ — getAllViewCounts() รวมค่านี้อัตโนมัติ
 */
export async function incrementDirectView(pkg_id: string): Promise<void> {
  if (!supabase) return;
  const code = `d_${pkg_id}`;

  // พยายาม insert ครั้งแรก (view_count = 1)
  const { error: insertErr } = await supabase
    .from("short_links")
    .insert({ code, pkg_id, source: "direct", view_count: 1 });

  if (!insertErr) return; // insert สำเร็จ — จบ

  // row มีอยู่แล้ว → read current count แล้ว +1
  const { data } = await supabase
    .from("short_links")
    .select("view_count")
    .eq("code", code)
    .single();

  if (data) {
    await supabase
      .from("short_links")
      .update({ view_count: (data as { view_count: number }).view_count + 1 })
      .eq("code", code);
  }
}
