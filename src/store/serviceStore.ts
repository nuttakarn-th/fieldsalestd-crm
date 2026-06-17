import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";

// ===== Tour =====
export type TourCategory = "International Tour" | "Domestic" | "Incentive";

/** Period เดินทางของทัวร์ 1 โปรแกรม — เช่น HQO-TFU06-EU มีหลาย period */
export interface TourPeriod {
  period_id: string;        // uuid ภายใน (ไม่ใช่ PK ใน DB)
  travel_date: string;      // เช่น "26-31 ก.ค. 2569" (text ยืดหยุ่น)
  price_per_seat: number;
  total_seats: number;      // ที่นั่งทั้งหมดของ period นี้
  quota: number;            // ที่นั่งว่างของ period นี้
  airline_code?: string;    // เช่น "FD", "TG"
  project?: string;         // โครงการ (ถ้ามี)
  note?: string;            // หมายเหตุเฉพาะ period
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

  addTour: (t: Omit<TourItem, "id">) => void;
  updateTour: (id: string, p: Partial<TourItem>) => void;
  deleteTour: (id: string) => void;
  /** ปรับที่นั่งว่าง (legacy — tour ที่ไม่มี periods[]): delta < 0 = ตัดออก, delta > 0 = เพิ่มกลับ */
  adjustQuota: (tourId: string, delta: number) => void;

  // ── Period CRUD ──
  /** เพิ่ม period ใหม่ให้โปรแกรม */
  addPeriod: (tourId: string, p: Omit<TourPeriod, "period_id">) => void;
  /** แก้ไข period ที่มีอยู่ */
  updatePeriod: (tourId: string, periodId: string, p: Partial<Omit<TourPeriod, "period_id">>) => void;
  /** ลบ period */
  deletePeriod: (tourId: string, periodId: string) => void;
  /** ปรับที่นั่งว่างของ period ที่ระบุ: delta < 0 = ตัดออก, delta > 0 = เพิ่มกลับ */
  adjustPeriodQuota: (tourId: string, periodId: string, delta: number) => void;

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

  loadFromSupabase: () => Promise<void>;
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

export const useServices = create<ServiceState>()(
  persist(
    (set, get) => ({
      tours: [],
      cars: [],
      flights: [],
      hotels: [],
      visas: [],
      insurances: [],

      // ── Tour ──
      addTour: (t) => {
        // quota เริ่มต้น = total_seats (ยังไม่มีคนจอง)
        const item: TourItem = { ...t, quota: t.total_seats, id: uid() };
        set({ tours: [...get().tours, item] });
        sbInsert("tours", item);
      },
      updateTour: (id, p) => {
        set({ tours: get().tours.map((x) => (x.id === id ? { ...x, ...p } : x)) });
        sbUpdate("tours", id, p);
      },
      deleteTour: (id) => {
        set({ tours: get().tours.filter((x) => x.id !== id) });
        sbDelete("tours", id);
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

      adjustPeriodQuota: (tourId, periodId, delta) => {
        const newTours = get().tours.map((t) => {
          if (t.id !== tourId) return t;
          const periods = (t.periods ?? []).map((x) => {
            if (x.period_id !== periodId) return x;
            return { ...x, quota: Math.max(0, x.quota + delta) };
          });
          const quota = periods.reduce((s, x) => s + x.quota, 0);
          return { ...t, periods, quota };
        });
        set({ tours: newTours });
        const updated = newTours.find((t) => t.id === tourId);
        if (updated) sbUpdate("tours", tourId, { periods: updated.periods, quota: updated.quota });
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
        }
      },
    }),
    { name: "stdtour-services-v4" },
  ),
);
