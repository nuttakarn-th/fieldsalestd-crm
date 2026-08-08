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

/** สุ่ม code ขนาด `len` ตัวอักษร (default 5 → 62^5 = ~916M combinations) */
export function genCode(len = 5): string {
  return Array.from({ length: len }, () => B62[Math.floor(Math.random() * 62)]).join("");
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
export const SHORT_BASE = "https://stour.vercel.app/s";

export function shortUrl(code: string): string {
  return `${SHORT_BASE}/${code}`;
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
    const code = genCode(5);
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
