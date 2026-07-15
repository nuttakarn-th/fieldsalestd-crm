import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";
import { logActivity } from "@/lib/activityLog";

// ===== Tour =====
export type TourCategory = "International Tour" | "Domestic" | "Incentive";

export const CANCEL_REASONS = [
  "กรุ๊ปไม่เต็ม",
  "สายการบินยกเลิก",
  "ปัญหาวีซ่า",
  "เลื่อนวันเดินทาง",
  "เหตุสุดวิสัย",
  "ปัญหาประเทศปลายทาง",
  "อื่นๆ",
] as const;
export type CancelReason = typeof CANCEL_REASONS[number];

/** Period เดินทางของทัวร์ 1 โปรแกรม — เช่น HQO-TFU06-EU มีหลาย period */
export interface TourPeriod {
  period_id: string;        // uuid ภายใน (ไม่ใช่ PK ใน DB)
  start_date?: string;      // ISO "2026-07-26" — เลือกจาก date picker
  end_date?: string;        // ISO "2026-07-31"
  nights?: number;          // คืน (auto-calc จาก start/end_date)
  days?: number;            // วัน (nights + 1)
  travel_date: string;      // display text เช่น "26-31 ก.ค. 2569" (auto-gen หรือ custom)
  price_per_seat: number;
  total_seats: number;      // ที่นั่งทั้งหมดของ period นี้
  quota: number;            // ที่นั่งว่างของ period นี้
  airline_code?: string;    // เช่น "FD", "TG"
  departure_city?: string;  // สนามบินต้นทาง: "CNX" | "DMK" | "BKK"
  project?: string;         // โครงการ (ถ้ามี)
  note?: string;            // หมายเหตุเฉพาะ period
  cancelled?: boolean;      // period ถูกยกเลิก
  cancel_reason?: string;   // เหตุผลการยกเลิก
  // ── Phase 1+2 UI fields (UI only — ไม่มี DB migration ยัง) ──
  freeday?: boolean;        // มี free day ในทัวร์
  shopping?: boolean;       // มี shopping stop
  all_in?: boolean;         // จอง จ่าย จบ (ราคา all-in)
  vat7?: boolean;           // ราคารวม VAT 7% แล้ว
  promo?: boolean;          // มีโปรโมชั่น (legacy)
  special_price?: number;   // ราคาพิเศษ — เมื่อกรอก icon 🔥 แสดงอัตโนมัติ
  footnote?: string;        // ข้อความแสดงเมื่อ expand แถว
  tags?: string[];          // category tags เช่น ["ครอบครัว", "ธรรมชาติ"]
  seat_hold?: boolean;      // วางที่นั่ง (💸 แสดงต่อท้ายวันเดินทาง)
  // ── Audit trail ──
  created_by?: string;      // ชื่อผู้ใช้ที่สร้าง period นี้
  created_at?: string;      // ISO timestamp เมื่อสร้าง
  updated_by?: string;      // ชื่อผู้ใช้ที่แก้ไขล่าสุด
  updated_at?: string;      // ISO timestamp เมื่อแก้ไขล่าสุด
  // ── Period Archive (v252) ──
  archived?: boolean;       // Period ถูก Archive แล้ว (ซ่อนจากตาราง)
  archived_at?: string;     // ISO timestamp เมื่อ Archive
  archived_by?: string;     // ชื่อผู้ที่ Archive
}

export interface TourItem {
  id: string;
  category: TourCategory;
  code: string;
  city: string;
  country: string;
  period: string;           // legacy — ใช้เมื่อ periods[] ว่าง
  duration: string;
  price_per_seat: number;   // legacy — ใช้เมื่อ periods[] ว่าง
  note?: string;
  total_seats: number;      // aggregate หรือ legacy value
  quota: number;            // aggregate หรือ legacy value
  periods?: TourPeriod[];   // NEW — multi-period (Option B)
  pdf_url?: string;         // URL ไฟล์ PDF โปรแกรมทัวร์ใน Supabase Storage
  is_published?: boolean;   // แสดงในหน้า Package Program หรือไม่
  // ── Audit trail (tour-level) ──
  created_by?: string;      // ชื่อผู้ใช้ที่สร้าง
  updated_by?: string;      // ชื่อผู้ใช้ที่แก้ไขล่าสุด
  updated_at?: string;      // ISO timestamp เมื่อแก้ไขล่าสุด
  // ── Phase 3 fields (migration 24 — มีใน DB แล้ว) ──
  title?: string;           // ชื่อเต็มโปรแกรม เช่น "ยุโรป 6 ประเทศ สวิส ฝรั่งเศส"
  countries?: string[];     // รองรับหลายประเทศ (จีน, ญี่ปุ่น ...)
  continent?: string;       // ทวีป (auto-calc จากประเทศ)
  tour_types?: string[];    // ประเภททัวร์ chips เช่น ["ครอบครัว", "Premium"]
  description?: string;     // คำอธิบายโปรแกรม
  // ── Archive system (v252) ──
  archived?: boolean;       // โปรแกรมถูก Archive แล้ว (ซ่อนจากหน้าหลัก)
  archived_at?: string;     // ISO timestamp เมื่อ Archive
  archived_by?: string;     // ชื่อผู้ที่ Archive
}

// ===== Car rental — ไม่มีโควต้า, total_seats = จำนวนที่นั่งในรถ =====
export type SeatMaterial = "หนัง" | "ผ้า" | "กำมะหยี่" | "ไม่ระบุ";
export interface CarItem {
  id: string;
  name: string;
  type: string;
  total_seats: number;   // จำนวนที่นั่งในรถ (ไม่ใช่โควต้า)
  rate_per_day: number;
  seat_material: SeatMaterial;
  note?: string;
}

// ===== Booking sub-services — ไม่มีโควต้า (บริการ Unlimited) =====
export interface FlightItem  { id: string; airline: string; route: string; note?: string }
export interface HotelItem   { id: string; name: string; city: string; country: string; note?: string }
export type VisaType = "TR" | "TS" | "Non-Immigrant" | "O" | "ED" | "O-A" | "O-X";
export interface VisaItem     { id: string; visa_type: VisaType; country: string; note?: string }
export interface InsuranceItem { id: string; plan_name: string; coverage: string; price: number; note?: string }

interface ServiceState {
  tours: TourItem[];
  cars: CarItem[];
  flights: FlightItem[];
  hotels: HotelItem[];
  visas: VisaItem[];
  insurances: InsuranceItem[];
  isLoadingTours: boolean;

  addTour: (t: Omit<TourItem, "id">) => string;
  updateTour: (id: string, p: Partial<TourItem>) => void;
  deleteTour: (id: string) => void;
  archiveTour: (id: string, archivedBy?: string) => void;
  restoreTour: (id: string) => void;
  archivePeriod: (tourId: string, periodId: string, archivedBy?: string) => void;
  restorePeriod: (tourId: string, periodId: string) => void;
  /** ปรับที่นั่งว่าง (legacy — tour ที่ไม่มี periods[]): delta < 0 = ตัดออก, delta > 0 = เพิ่มกลับ */
  adjustQuota: (tourId: string, delta: number) => void;

  // ── Period CRUD ──
  /** เพิ่ม period ใหม่ให้โปรแกรม */
  addPeriod: (tourId: string, p: Omit<TourPeriod, "period_id">) => void;
  /** แก้ไข period ที่มีอยู่ */
  updatePeriod: (tourId: string, periodId: string, p: Partial<Omit<TourPeriod, "period_id">>) => void;
  /** ลบ period */
  deletePeriod: (tourId: string, periodId: string) => void;
  /** ลบ periods ทั้งหมดของโปรแกรม (ใช้ก่อน re-import เพื่อ replace) */
  clearPeriods: (tourId: string) => void;
  /** ปรับที่นั่งว่างของ period ที่ระบุ: delta < 0 = ตัดออก, delta > 0 = เพิ่มกลับ */
  adjustPeriodQuota: (tourId: string, periodId: string, delta: number, updatedBy?: string) => void;

  addCar: (c: Omit<CarItem, "id">) => void;
  updateCar: (id: string, p: Partial<CarItem>) => void;
  deleteCar: (id: string) => void;

  addFlight: (f: Omit<FlightItem, "id">) => void;
  updateFlight: (id: string, p: Partial<FlightItem>) => void;
  deleteFlight: (id: string) => void;

  addHotel: (h: Omit<HotelItem, "id">) => void;
  updateHotel: (id: string, p: Partial<HotelItem>) => void;
  deleteHotel: (id: string) => void;

  addVisa: (v: Omit<VisaItem, "id">) => void;
  updateVisa: (id: string, p: Partial<VisaItem>) => void;
  deleteVisa: (id: string) => void;

  addInsurance: (i: Omit<InsuranceItem, "id">) => void;
  updateInsurance: (id: string, p: Partial<InsuranceItem>) => void;
  deleteInsurance: (id: string) => void;

  /** อัปโหลด PDF โปรแกรมทัวร์ไป Supabase Storage แล้วบันทึก pdf_url */
  uploadTourPDF: (tourId: string, file: File) => Promise<string | null>;
  /** ลบ PDF และล้าง pdf_url + is_published */
  deleteTourPDF: (tourId: string) => Promise<void>;
  /** เปิด/ปิด แสดงในหน้า Package Program */
  togglePublish: (tourId: string, value: boolean) => void;

  loadFromSupabase: () => Promise<void>;
  /** Subscribe Supabase Realtime สำหรับ tours table — คืน unsubscribe fn */
  subscribeToursRealtime: () => () => void;
}

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function sbInsert(table: string, row: object) {
  if (!SUPABASE_ENABLED || !supabase) return;
  supabase.from(table).insert(row).then(({ error }) => {
    if (error) console.error(`[supabase] insert ${table} ล้มเหลว:`, error);
  });
}
function sbUpdate(table: string, id: string, patch: object) {
  if (!SUPABASE_ENABLED || !supabase) return;
  supabase.from(table).update(patch).eq("id", id).then(({ error }) => {
    if (error) console.error(`[supabase] update ${table} ล้มเหลว:`, error);
  });
}
function sbDelete(table: string, id: string) {
  if (!SUPABASE_ENABLED || !supabase) return;
  supabase.from(table).delete().eq("id", id).then(({ error }) => {
    if (error) console.error(`[supabase] delete ${table} ล้มเหลว:`, error);
  });
}

// ── Phase 2: Event logging — บันทึกทุก quota change ──────────────────────────
function logBookingEvent(event: {
  event_type: string;
  tour_id: string;
  period_id: string;
  tour_code?: string;
  country?: string;
  category?: string;
  start_date?: string | null;
  old_quota?: number | null;
  new_quota?: number | null;
  delta?: number | null;
  total_seats?: number | null;
  actor?: string | null;
  notes?: string | null;
}) {
  sbInsert("booking_events", event);
}

export const useServices = create<ServiceState>()(
  persist(
    (set, get) => ({
      tours: [],
      cars: [],
      flights: [],
      hotels: [],
      visas: [],
      insurances: [],
      isLoadingTours: false,

      // ── Tour ──
      addTour: (t) => {
        const now = new Date().toISOString();
        const id = uid();
        const item: TourItem = { ...t, quota: t.total_seats, id, updated_at: now };
        set({ tours: [...get().tours, item] });
        sbInsert("tours", { ...item, created_by: t.created_by, updated_by: t.created_by, updated_at: now });
        const actor = t.created_by ?? "ระบบ";
        logActivity({
          event_type:  "tour_added",
          actor,
          subject:     "เพิ่มโปรแกรมใหม่",
          detail:      `${t.code} · ${t.country} · ${t.total_seats} ที่นั่ง`,
          entity_type: "tour",
          entity_id:   id,
          entity_name: t.code,
        });
        return id;
      },
      updateTour: (id, p) => {
        const now = new Date().toISOString();
        const patch = { ...p, updated_at: now };
        set({ tours: get().tours.map((x) => (x.id === id ? { ...x, ...patch } : x)) });
        sbUpdate("tours", id, patch);
      },
      archiveTour: (id, archivedBy) => {
        const now = new Date().toISOString();
        const patch = { archived: true, archived_at: now, archived_by: archivedBy ?? "ระบบ" };
        set({ tours: get().tours.map((x) => (x.id === id ? { ...x, ...patch } : x)) });
        sbUpdate("tours", id, patch);
      },
      restoreTour: (id) => {
        set({ tours: get().tours.map((x) => (x.id === id ? { ...x, archived: false, archived_at: undefined, archived_by: undefined } : x)) });
        sbUpdate("tours", id, { archived: false, archived_at: null, archived_by: null });
      },
      archivePeriod: (tourId, periodId, archivedBy) => {
        const now = new Date().toISOString();
        const newTours = get().tours.map((t) => {
          if (t.id !== tourId) return t;
          const periods = (t.periods ?? []).map((p) =>
            p.period_id === periodId
              ? { ...p, archived: true, archived_at: now, archived_by: archivedBy ?? "ระบบ" }
              : p
          );
          return { ...t, periods };
        });
        set({ tours: newTours });
        const updated = newTours.find((t) => t.id === tourId);
        if (updated) sbUpdate("tours", tourId, { periods: updated.periods });
      },
      restorePeriod: (tourId, periodId) => {
        const newTours = get().tours.map((t) => {
          if (t.id !== tourId) return t;
          const periods = (t.periods ?? []).map((p) =>
            p.period_id === periodId
              ? { ...p, archived: false, archived_at: undefined, archived_by: undefined }
              : p
          );
          return { ...t, periods };
        });
        set({ tours: newTours });
        const updated = newTours.find((t) => t.id === tourId);
        if (updated) sbUpdate("tours", tourId, { periods: updated.periods });
      },
      deleteTour: (id) => {
        const tour = get().tours.find((x) => x.id === id);
        set({ tours: get().tours.filter((x) => x.id !== id) });
        sbDelete("tours", id);
        if (tour) {
          logActivity({
            event_type:  "tour_deleted",
            actor:       tour.updated_by ?? tour.created_by ?? "ระบบ",
            subject:     "ลบโปรแกรม",
            detail:      `${tour.code} · ${tour.country}`,
            entity_type: "tour",
            entity_id:   id,
            entity_name: tour.code,
          });
        }
      },
      adjustQuota: (tourId, delta) => {
        const tour = get().tours.find((x) => x.id === tourId);
        if (!tour) return;
        const newQuota = Math.max(0, tour.quota + delta);
        set({ tours: get().tours.map((x) => x.id === tourId ? { ...x, quota: newQuota } : x) });
        sbUpdate("tours", tourId, { quota: newQuota });
      },

      // ── Period CRUD ──────────────────────────────────────────────────────────
      addPeriod: (tourId, p) => {
        const period: TourPeriod = { ...p, period_id: uid() };
        const newTours = get().tours.map((t) => {
          if (t.id !== tourId) return t;
          const periods = [...(t.periods ?? []), period];
          // aggregate top-level quota/total_seats จาก periods ทั้งหมด
          const totalSeats = periods.reduce((s, x) => s + x.total_seats, 0);
          const quota = periods.reduce((s, x) => s + x.quota, 0);
          return { ...t, periods, total_seats: totalSeats, quota };
        });
        set({ tours: newTours });
        const updated = newTours.find((t) => t.id === tourId);
        if (updated) sbUpdate("tours", tourId, { periods: updated.periods, total_seats: updated.total_seats, quota: updated.quota });
        // Phase 2: log event
        const createdTour = get().tours.find((t) => t.id === tourId);
        if (createdTour) {
          logBookingEvent({
            event_type: "period_created",
            tour_id: tourId,
            period_id: period.period_id,
            tour_code: createdTour.code,
            country: createdTour.country,
            category: createdTour.category,
            start_date: period.start_date ?? null,
            old_quota: null,
            new_quota: period.total_seats,
            delta: null,
            total_seats: period.total_seats,
            actor: (period as { created_by?: string }).created_by ?? null,
          });
        }
      },

      updatePeriod: (tourId, periodId, p) => {
        const newTours = get().tours.map((t) => {
          if (t.id !== tourId) return t;
          const periods = (t.periods ?? []).map((x) =>
            x.period_id === periodId ? { ...x, ...p } : x
          );
          const totalSeats = periods.reduce((s, x) => s + x.total_seats, 0);
          const quota = periods.reduce((s, x) => s + x.quota, 0);
          return { ...t, periods, total_seats: totalSeats, quota };
        });
        set({ tours: newTours });
        const updated = newTours.find((t) => t.id === tourId);
        if (updated) sbUpdate("tours", tourId, { periods: updated.periods, total_seats: updated.total_seats, quota: updated.quota });
        // Phase 2: log event
        const updatedTour = get().tours.find((t) => t.id === tourId);
        const updatedPeriod = updatedTour?.periods?.find((x) => x.period_id === periodId);
        if (updatedTour && updatedPeriod) {
          const isCancelled = (p as { cancelled?: boolean }).cancelled;
          logBookingEvent({
            event_type: isCancelled ? "period_cancelled" : "period_updated",
            tour_id: tourId,
            period_id: periodId,
            tour_code: updatedTour.code,
            country: updatedTour.country,
            category: updatedTour.category,
            start_date: updatedPeriod.start_date ?? null,
            old_quota: null,
            new_quota: updatedPeriod.quota,
            delta: null,
            total_seats: updatedPeriod.total_seats,
            actor: (p as { updated_by?: string }).updated_by ?? null,
          });
          // Activity log — cancelled / restored only (ไม่ log ทุก edit เพื่อไม่ spam)
          const patchCancelled = (p as { cancelled?: boolean }).cancelled;
          if (typeof patchCancelled === "boolean") {
            const actor = (p as { updated_by?: string }).updated_by ?? "ระบบ";
            logActivity({
              event_type:  patchCancelled ? "period_cancelled" : "period_restored",
              actor,
              subject:     patchCancelled ? "ยกเลิก Period" : "คืนสถานะ Period",
              detail:      `${updatedTour.code} · ${updatedPeriod.start_date ?? ""}`,
              entity_type: "tour",
              entity_id:   tourId,
              entity_name: updatedTour.code,
            });
          }
        }
      },

      deletePeriod: (tourId, periodId) => {
        const newTours = get().tours.map((t) => {
          if (t.id !== tourId) return t;
          const periods = (t.periods ?? []).filter((x) => x.period_id !== periodId);
          const totalSeats = periods.reduce((s, x) => s + x.total_seats, 0);
          const quota = periods.reduce((s, x) => s + x.quota, 0);
          return { ...t, periods, total_seats: totalSeats, quota };
        });
        set({ tours: newTours });
        const updated = newTours.find((t) => t.id === tourId);
        if (updated) sbUpdate("tours", tourId, { periods: updated.periods, total_seats: updated.total_seats, quota: updated.quota });
      },

      clearPeriods: (tourId) => {
        const newTours = get().tours.map((t) => {
          if (t.id !== tourId) return t;
          return { ...t, periods: [], total_seats: 0, quota: 0 };
        });
        set({ tours: newTours });
        const updated = newTours.find((t) => t.id === tourId);
        if (updated) sbUpdate("tours", tourId, { periods: [], total_seats: 0, quota: 0 });
      },

      adjustPeriodQuota: (tourId, periodId, delta, updatedBy) => {
        const now = new Date().toISOString();
        const newTours = get().tours.map((t) => {
          if (t.id !== tourId) return t;
          const periods = (t.periods ?? []).map((x) => {
            if (x.period_id !== periodId) return x;
            return {
              ...x,
              quota: Math.max(0, x.quota + delta),
              ...(updatedBy ? { updated_by: updatedBy, updated_at: now } : {}),
            };
          });
          const quota = periods.reduce((s, x) => s + x.quota, 0);
          return { ...t, periods, quota };
        });
        set({ tours: newTours });
        const updated = newTours.find((t) => t.id === tourId);
        if (updated) sbUpdate("tours", tourId, { periods: updated.periods, quota: updated.quota });
        // Phase 2: log event
        const aqTour = get().tours.find((t) => t.id === tourId);
        const aqPeriod = aqTour?.periods?.find((x) => x.period_id === periodId);
        if (aqTour && aqPeriod) {
          logBookingEvent({
            event_type: "quota_adjusted",
            tour_id: tourId,
            period_id: periodId,
            tour_code: aqTour.code,
            country: aqTour.country,
            category: aqTour.category,
            start_date: aqPeriod.start_date ?? null,
            old_quota: aqPeriod.quota - delta,   // before this update
            new_quota: aqPeriod.quota,
            delta: delta,
            total_seats: aqPeriod.total_seats,
            actor: updatedBy ?? null,
          });
          // Activity log — seat booked (delta < 0) or released (delta > 0)
          logActivity({
            event_type:  delta < 0 ? "seat_booked" : "seat_released",
            actor:       updatedBy ?? "ระบบ",
            subject:     delta < 0 ? "จองที่นั่ง" : "คืนที่นั่ง",
            detail:      `${aqTour.code} · ${aqPeriod.start_date ?? ""} · ${Math.abs(delta)} ที่นั่ง`,
            entity_type: "tour",
            entity_id:   tourId,
            entity_name: aqTour.code,
            meta:        { delta, period_id: periodId },
          });

          // ⚡ Threshold alert — Period ใกล้เต็ม (fill rate ข้าม 80%)
          if (delta < 0 && aqPeriod.total_seats > 0) {
            const newQuota    = aqPeriod.quota;
            const oldQuota    = newQuota - delta;          // delta < 0 → oldQuota > newQuota
            const seats       = aqPeriod.total_seats;
            const newFill     = (seats - newQuota) / seats;
            const oldFill     = (seats - oldQuota) / seats;
            // Log เฉพาะเมื่อ fill rate ข้ามผ่าน 80% ครั้งแรก (ไม่ spam ทุก booking)
            if (newFill >= 0.8 && oldFill < 0.8) {
              logActivity({
                event_type:  "period_nearly_full",
                actor:       updatedBy ?? "ระบบ",
                subject:     "⚡ Period ใกล้เต็มแล้ว!",
                detail:      `${aqTour.code} · ${aqPeriod.start_date ?? ""} · fill ${Math.round(newFill * 100)}% (${seats - newQuota}/${seats} ที่นั่ง)`,
                entity_type: "tour",
                entity_id:   tourId,
                entity_name: aqTour.code,
                meta:        { fill_rate: newFill, remaining: newQuota, total_seats: seats, period_id: periodId },
              });
            }
          }
        }
      },

      // ── Tour PDF + Publish ──────────────────────────────────────────────────
      uploadTourPDF: async (tourId, file) => {
        if (!SUPABASE_ENABLED || !supabase) return null;
        const ext  = file.name.split(".").pop() ?? "pdf";
        const path = `${tourId}/${Date.now()}.${ext}`;
        const { data, error } = await supabase.storage
          .from("tour-pdfs")
          .upload(path, file, { contentType: "application/pdf", upsert: true });
        if (error || !data) { console.error("[supabase] upload tour PDF ล้มเหลว:", error); return null; }
        const { data: urlData } = supabase.storage.from("tour-pdfs").getPublicUrl(data.path);
        const pdf_url = urlData.publicUrl;
        set({ tours: get().tours.map((x) => x.id === tourId ? { ...x, pdf_url } : x) });
        sbUpdate("tours", tourId, { pdf_url });
        return pdf_url;
      },

      deleteTourPDF: async (tourId) => {
        if (!SUPABASE_ENABLED || !supabase) return;
        const tour = get().tours.find((x) => x.id === tourId);
        if (tour?.pdf_url) {
          // path = ส่วนหลัง bucket URL
          const prefix = `/storage/v1/object/public/tour-pdfs/`;
          const idx    = tour.pdf_url.indexOf(prefix);
          if (idx !== -1) {
            const objPath = tour.pdf_url.slice(idx + prefix.length);
            await supabase.storage.from("tour-pdfs").remove([objPath]);
          }
        }
        set({ tours: get().tours.map((x) => x.id === tourId ? { ...x, pdf_url: undefined, is_published: false } : x) });
        sbUpdate("tours", tourId, { pdf_url: null, is_published: false });
      },

      togglePublish: (tourId, value) => {
        const tour = get().tours.find((x) => x.id === tourId);
        set({ tours: get().tours.map((x) => x.id === tourId ? { ...x, is_published: value } : x) });
        sbUpdate("tours", tourId, { is_published: value });
        if (tour) {
          logActivity({
            event_type:  value ? "tour_published" : "tour_unpublished",
            actor:       tour.updated_by ?? tour.created_by ?? "ระบบ",
            subject:     value ? "เผยแพร่โปรแกรม" : "ยกเลิกเผยแพร่โปรแกรม",
            detail:      `${tour.code} · ${tour.country}`,
            entity_type: "tour",
            entity_id:   tourId,
            entity_name: tour.code,
          });
        }
      },

      // ── Car ──
      addCar: (c) => {
        const item: CarItem = { ...c, id: uid() };
        set({ cars: [...get().cars, item] });
        sbInsert("cars", item);
      },
      updateCar: (id, p) => {
        set({ cars: get().cars.map((x) => (x.id === id ? { ...x, ...p } : x)) });
        sbUpdate("cars", id, p);
      },
      deleteCar: (id) => {
        set({ cars: get().cars.filter((x) => x.id !== id) });
        sbDelete("cars", id);
      },

      // ── Flight ──
      addFlight: (f) => {
        const item: FlightItem = { ...f, id: uid() };
        set({ flights: [...get().flights, item] });
        sbInsert("flights", item);
      },
      updateFlight: (id, p) => {
        set({ flights: get().flights.map((x) => (x.id === id ? { ...x, ...p } : x)) });
        sbUpdate("flights", id, p);
      },
      deleteFlight: (id) => {
        set({ flights: get().flights.filter((x) => x.id !== id) });
        sbDelete("flights", id);
      },

      // ── Hotel ──
      addHotel: (h) => {
        const item: HotelItem = { ...h, id: uid() };
        set({ hotels: [...get().hotels, item] });
        sbInsert("hotels", item);
      },
      updateHotel: (id, p) => {
        set({ hotels: get().hotels.map((x) => (x.id === id ? { ...x, ...p } : x)) });
        sbUpdate("hotels", id, p);
      },
      deleteHotel: (id) => {
        set({ hotels: get().hotels.filter((x) => x.id !== id) });
        sbDelete("hotels", id);
      },

      // ── Visa ──
      addVisa: (v) => {
        const item: VisaItem = { ...v, id: uid() };
        set({ visas: [...get().visas, item] });
        sbInsert("visas", item);
      },
      updateVisa: (id, p) => {
        set({ visas: get().visas.map((x) => (x.id === id ? { ...x, ...p } : x)) });
        sbUpdate("visas", id, p);
      },
      deleteVisa: (id) => {
        set({ visas: get().visas.filter((x) => x.id !== id) });
        sbDelete("visas", id);
      },

      // ── Insurance ──
      addInsurance: (i) => {
        const item: InsuranceItem = { ...i, id: uid() };
        set({ insurances: [...get().insurances, item] });
        sbInsert("insurances", item);
      },
      updateInsurance: (id, p) => {
        set({ insurances: get().insurances.map((x) => (x.id === id ? { ...x, ...p } : x)) });
        sbUpdate("insurances", id, p);
      },
      deleteInsurance: (id) => {
        set({ insurances: get().insurances.filter((x) => x.id !== id) });
        sbDelete("insurances", id);
      },

      loadFromSupabase: async () => {
        if (!SUPABASE_ENABLED || !supabase) return;
        set({ isLoadingTours: true });
        try {
          const [tours, cars, flights, hotels, visas, insurances] = await Promise.all([
            supabase.from("tours").select("*"),
            supabase.from("cars").select("*"),
            supabase.from("flights").select("*"),
            supabase.from("hotels").select("*"),
            supabase.from("visas").select("*"),
            supabase.from("insurances").select("*"),
          ]);
          const updates: Partial<ServiceState> = {};
          if (tours.data) {
            updates.tours = (tours.data as (TourItem & { quota?: number })[]).map((t) => {
              const periods: TourPeriod[] = Array.isArray(t.periods) ? t.periods : [];
              // aggregate top-level fields จาก periods ถ้ามี — ไม่งั้นใช้ legacy value
              const totalSeats = periods.length > 0
                ? periods.reduce((s, p) => s + p.total_seats, 0)
                : (t.total_seats > 0 ? t.total_seats : (t.quota ?? 0));
              const quota = periods.length > 0
                ? periods.reduce((s, p) => s + p.quota, 0)
                : (t.quota ?? 0);
              return { ...t, periods, total_seats: totalSeats, quota };
            });
          }
          if (cars.data)       updates.cars       = cars.data       as CarItem[];
          if (flights.data)    updates.flights    = flights.data    as FlightItem[];
          if (hotels.data)     updates.hotels     = hotels.data     as HotelItem[];
          if (visas.data)      updates.visas      = visas.data      as VisaItem[];
          if (insurances.data) updates.insurances = insurances.data as InsuranceItem[];
          set(updates);
          const summary = [
            tours.data?.length      && `tours ${tours.data.length}`,
            cars.data?.length       && `cars ${cars.data.length}`,
            flights.data?.length    && `flights ${flights.data.length}`,
            hotels.data?.length     && `hotels ${hotels.data.length}`,
            visas.data?.length      && `visas ${visas.data.length}`,
            insurances.data?.length && `insurances ${insurances.data.length}`,
          ].filter(Boolean).join(", ");
          if (summary) console.info(`[supabase] โหลด services: ${summary}`);
        } catch (e) {
          console.error("[supabase] load services ล้มเหลว:", e);
        } finally {
          set({ isLoadingTours: false });
        }
      },

      subscribeToursRealtime: () => {
        if (!SUPABASE_ENABLED || !supabase) return () => {};
        let debounceTimer: ReturnType<typeof setTimeout>;
        const channel = supabase
          .channel("tours-realtime")
          .on("postgres_changes", { event: "*", schema: "public", table: "tours" }, () => {
            // debounce 600ms เพื่อไม่ให้ reload ซ้ำเร็วเกินไปเมื่อมีหลาย event
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
              get().loadFromSupabase();
            }, 600);
          })
          .subscribe((status) => {
            console.info("[supabase] tours realtime:", status);
          });
        return () => {
          clearTimeout(debounceTimer);
          supabase.removeChannel(channel);
        };
      },
    }),
    { name: "stdtour-services-v4" },
  ),
);
