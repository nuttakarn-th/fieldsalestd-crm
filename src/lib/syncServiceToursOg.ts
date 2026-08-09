/**
 * syncServiceToursOg.ts
 *
 * Sync serviceStore tours (ตาราง `tours`) → `tour_packages_og`
 * เพื่อให้ short link ที่สร้างจาก ShareDialog (pkgId = `tour_{id}`)
 * มี OG image, title, ฯลฯ สำหรับ link preview บน Line / Facebook / ฯลฯ
 */

import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";
import { extractAndUploadPdfCover } from "@/lib/pdfCover";

interface TourRow {
  id: string;
  title?: string | null;
  country?: string | null;
  city?: string | null;
  duration?: string | null;
  pdf_url?: string | null;
}

// ─── Single-tour sync (call after PDF upload) ────────────────────────────────

/**
 * Extract PDF cover + upsert ใน `tour_packages_og` สำหรับ 1 tour
 * pkgId = `tour_${tour.id}`  (ตรงกับ ShareDialog)
 */
export async function syncOneTourOg(tour: TourRow): Promise<void> {
  if (!SUPABASE_ENABLED || !supabase || !tour.pdf_url) return;
  const pkgId = `tour_${tour.id}`;
  try {
    const cover_url = await extractAndUploadPdfCover(pkgId, tour.pdf_url);
    if (!cover_url) return;

    const { error } = await supabase.from("tour_packages_og").upsert(
      {
        id: pkgId,
        title: tour.title ?? tour.country ?? null,
        duration: tour.duration ?? null,
        cover_url,
        pdf_url: tour.pdf_url,
        country: tour.country ?? null,
        city: tour.city ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
    if (error) console.warn("[syncServiceToursOg] upsert error:", error.message);
  } catch (err) {
    console.warn("[syncServiceToursOg] syncOneTourOg failed:", err);
  }
}

// ─── Batch sync (call on mount to backfill missing covers) ───────────────────

/**
 * อ่านทุก tour จากตาราง `tours` ที่มี pdf_url
 * และยังไม่มี cover_url ใน `tour_packages_og`
 * แล้ว extract + upsert ทีละตัว
 */
export async function syncServiceToursOg(): Promise<void> {
  if (!SUPABASE_ENABLED || !supabase) return;

  // 1. ดึง tours ที่มี pdf_url
  const { data: tours, error: toursErr } = await supabase
    .from("tours")
    .select("id, title, country, city, duration, pdf_url")
    .not("pdf_url", "is", null);

  if (toursErr || !tours?.length) return;

  // 2. ดึง tour_packages_og ที่มี cover_url แล้ว (เพื่อ skip)
  const ids = tours.map((t) => `tour_${t.id}`);
  const { data: existing } = await supabase
    .from("tour_packages_og")
    .select("id, cover_url")
    .in("id", ids);

  const hasCover = new Set(
    (existing ?? []).filter((r) => r.cover_url).map((r) => r.id),
  );

  // 3. Process เฉพาะ tour ที่ยังไม่มี cover
  for (const tour of tours) {
    const pkgId = `tour_${tour.id}`;
    if (hasCover.has(pkgId)) continue; // ข้ามถ้ามีอยู่แล้ว

    await syncOneTourOg(tour);
  }
}
