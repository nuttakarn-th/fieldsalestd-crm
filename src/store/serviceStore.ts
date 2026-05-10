import { create } from "zustand";
import { persist } from "zustand/middleware";

// ===== Tour =====
export type TourCategory = "International Tour" | "Domestic" | "Incentive";
export interface TourItem {
  id: string;
  category: TourCategory;
  code: string;
  city: string;
  country: string;
  period: string; // ช่วงเวลาทัวร์
  duration: string; // 4 วัน 3 คืน
  price_per_seat: number;
  note?: string;
  quota: number; // จำนวนโควต้าคงเหลือ
}

// ===== Car rental =====
export type SeatMaterial = "หนัง" | "ผ้า" | "กำมะหยี่";
export interface CarItem {
  id: string;
  name: string;
  type: string; // SUV / Sedan / Van
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

  // adjust quota +/-
  adjustQuota: (kind: "tour" | "car" | "flight" | "hotel" | "visa" | "insurance", id: string, delta: number) => void;
}

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

// Mockup seed cleared — Admin เพิ่มข้อมูลจริงผ่านหน้า All Service
const seedTours: TourItem[] = [];
const seedCars: CarItem[] = [];
const seedFlights: FlightItem[] = [];
const seedHotels: HotelItem[] = [];
const seedVisas: VisaItem[] = [];
const seedInsurances: InsuranceItem[] = [];

export const useServices = create<ServiceState>()(
  persist(
    (set, get) => ({
      tours: seedTours,
      cars: seedCars,
      flights: seedFlights,
      hotels: seedHotels,
      visas: seedVisas,
      insurances: seedInsurances,

      addTour: (t) => set({ tours: [...get().tours, { ...t, id: uid() }] }),
      updateTour: (id, p) => set({ tours: get().tours.map((x) => (x.id === id ? { ...x, ...p } : x)) }),
      deleteTour: (id) => set({ tours: get().tours.filter((x) => x.id !== id) }),

      addCar: (c) => set({ cars: [...get().cars, { ...c, id: uid() }] }),
      updateCar: (id, p) => set({ cars: get().cars.map((x) => (x.id === id ? { ...x, ...p } : x)) }),
      deleteCar: (id) => set({ cars: get().cars.filter((x) => x.id !== id) }),

      addFlight: (f) => set({ flights: [...get().flights, { ...f, id: uid() }] }),
      updateFlight: (id, p) => set({ flights: get().flights.map((x) => (x.id === id ? { ...x, ...p } : x)) }),
      deleteFlight: (id) => set({ flights: get().flights.filter((x) => x.id !== id) }),

      addHotel: (h) => set({ hotels: [...get().hotels, { ...h, id: uid() }] }),
      updateHotel: (id, p) => set({ hotels: get().hotels.map((x) => (x.id === id ? { ...x, ...p } : x)) }),
      deleteHotel: (id) => set({ hotels: get().hotels.filter((x) => x.id !== id) }),

      addVisa: (v) => set({ visas: [...get().visas, { ...v, id: uid() }] }),
      updateVisa: (id, p) => set({ visas: get().visas.map((x) => (x.id === id ? { ...x, ...p } : x)) }),
      deleteVisa: (id) => set({ visas: get().visas.filter((x) => x.id !== id) }),

      addInsurance: (i) => set({ insurances: [...get().insurances, { ...i, id: uid() }] }),
      updateInsurance: (id, p) => set({ insurances: get().insurances.map((x) => (x.id === id ? { ...x, ...p } : x)) }),
      deleteInsurance: (id) => set({ insurances: get().insurances.filter((x) => x.id !== id) }),

      adjustQuota: (kind, id, delta) => {
        const apply = <T extends { id: string; quota: number }>(arr: T[]) =>
          arr.map((x) => (x.id === id ? { ...x, quota: Math.max(0, x.quota + delta) } : x));
        switch (kind) {
          case "tour": set({ tours: apply(get().tours) }); break;
          case "car": set({ cars: apply(get().cars) }); break;
          case "flight": set({ flights: apply(get().flights) }); break;
          case "hotel": set({ hotels: apply(get().hotels) }); break;
          case "visa": set({ visas: apply(get().visas) }); break;
          case "insurance": set({ insurances: apply(get().insurances) }); break;
        }
      },
    }),
    { name: "stdtour-services-v2" },
  ),
);