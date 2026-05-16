import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";

// ===== Tour =====
export type TourCategory = "International Tour" | "Domestic" | "Incentive";
export interface TourItem {
  id: string;
  category: TourCategory;
  code: string;
  city: string;
  country: string;
  period: string;
  duration: string;
  price_per_seat: number;
  note?: string;
  quota: number;
}

// ===== Car rental =====
export type SeatMaterial = "หนัง" | "ผ้า" | "กำมะหยี่";
export interface CarItem {
  id: string;
  name: string;
  type: string;
  total_seats: number;
  rate_per_day: number;
  seat_material: SeatMaterial;
  note?: string;
  quota: number;
}

// ===== Booking sub-services =====
export interface FlightItem { id: string; airline: string; route: string; note?: string; quota: number }
export interface HotelItem { id: string; name: string; city: string; country: string; note?: string; quota: number }
export type VisaType = "TR" | "TS" | "Non-Immigrant" | "O" | "ED" | "O-A" | "O-X";
export interface VisaItem { id: string; visa_type: VisaType; country: string; note?: string; quota: number }
export interface InsuranceItem { id: string; plan_name: string; coverage: string; price: number; note?: string; quota: number }

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

  adjustQuota: (kind: "tour" | "car" | "flight" | "hotel" | "visa" | "insurance", id: string, delta: number) => void;

  loadFromSupabase: () => Promise<void>;
}

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

// Fire-and-forget Supabase insert/update/delete
function sbInsert(table: string, row: any) {
  if (!SUPABASE_ENABLED || !supabase) return;
  supabase.from(table).insert(row).then(({ error }) => {
    if (error) console.error(`[supabase] insert ${table} ล้มเหลว:`, error);
  });
}
function sbUpdate(table: string, id: string, patch: any) {
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

      addTour: (t) => {
        const item: TourItem = { ...t, id: uid() };
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

      adjustQuota: (kind, id, delta) => {
        const apply = <T extends { id: string; quota: number }>(arr: T[]) =>
          arr.map((x) => (x.id === id ? { ...x, quota: Math.max(0, x.quota + delta) } : x));
        const newQuota = (() => {
          let cur = 0;
          switch (kind) {
            case "tour": cur = get().tours.find((x) => x.id === id)?.quota ?? 0; break;
            case "car": cur = get().cars.find((x) => x.id === id)?.quota ?? 0; break;
            case "flight": cur = get().flights.find((x) => x.id === id)?.quota ?? 0; break;
            case "hotel": cur = get().hotels.find((x) => x.id === id)?.quota ?? 0; break;
            case "visa": cur = get().visas.find((x) => x.id === id)?.quota ?? 0; break;
            case "insurance": cur = get().insurances.find((x) => x.id === id)?.quota ?? 0; break;
          }
          return Math.max(0, cur + delta);
        })();
        switch (kind) {
          case "tour": set({ tours: apply(get().tours) }); sbUpdate("tours", id, { quota: newQuota }); break;
          case "car": set({ cars: apply(get().cars) }); sbUpdate("cars", id, { quota: newQuota }); break;
          case "flight": set({ flights: apply(get().flights) }); sbUpdate("flights", id, { quota: newQuota }); break;
          case "hotel": set({ hotels: apply(get().hotels) }); sbUpdate("hotels", id, { quota: newQuota }); break;
          case "visa": set({ visas: apply(get().visas) }); sbUpdate("visas", id, { quota: newQuota }); break;
          case "insurance": set({ insurances: apply(get().insurances) }); sbUpdate("insurances", id, { quota: newQuota }); break;
        }
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
          if (tours.data) updates.tours = tours.data as TourItem[];
          if (cars.data) updates.cars = cars.data as CarItem[];
          if (flights.data) updates.flights = flights.data as FlightItem[];
          if (hotels.data) updates.hotels = hotels.data as HotelItem[];
          if (visas.data) updates.visas = visas.data as VisaItem[];
          if (insurances.data) updates.insurances = insurances.data as InsuranceItem[];
          set(updates);
          const summary = [
            tours.data?.length && `tours ${tours.data.length}`,
            cars.data?.length && `cars ${cars.data.length}`,
            flights.data?.length && `flights ${flights.data.length}`,
            hotels.data?.length && `hotels ${hotels.data.length}`,
            visas.data?.length && `visas ${visas.data.length}`,
            insurances.data?.length && `insurances ${insurances.data.length}`,
          ].filter(Boolean).join(", ");
          if (summary) console.info(`[supabase] โหลด services: ${summary}`);
        } catch (e) {
          console.error("[supabase] load services ล้มเหลว:", e);
        }
      },
    }),
    { name: "stdtour-services-v3" },
  ),
);
