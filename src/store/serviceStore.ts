import { create } from "zustand";
import { persist } from "zustand/middleware";

// ===== Tour =====
export type TourCategory = "Outbound" | "Domestic" | "Incentive";
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

const seedTours: TourItem[] = [
  { id: uid(), category: "Outbound", code: "HQO-KMG04-DR", city: "คุนหมิง โหลวผิง", country: "จีน", period: "15-18 มี.ค. 2026", duration: "4 วัน 3 คืน", price_per_seat: 25900, note: "ซากุระบาน", quota: 24 },
  { id: uid(), category: "Outbound", code: "HQO-CKG01-PN", city: "ฉงชิ่ง ต้าจู๋", country: "จีน", period: "10-13 เม.ย. 2026", duration: "4 วัน 3 คืน", price_per_seat: 27900, quota: 20 },
  { id: uid(), category: "Domestic", code: "DOM-CNX01", city: "เชียงใหม่ ปาย", country: "ไทย", period: "ทุกสัปดาห์", duration: "3 วัน 2 คืน", price_per_seat: 6900, quota: 30 },
  { id: uid(), category: "Incentive", code: "INC-PUKET01", city: "ภูเก็ต", country: "ไทย", period: "พ.ค. 2026", duration: "4 วัน 3 คืน", price_per_seat: 18500, note: "Incentive องค์กร 50+ ท่าน", quota: 80 },
];

const seedCars: CarItem[] = [
  { id: uid(), name: "Toyota Commuter", type: "Van", total_seats: 12, rate_per_day: 2500, seat_material: "หนัง", quota: 5 },
  { id: uid(), name: "Toyota Camry", type: "Sedan", total_seats: 4, rate_per_day: 2200, seat_material: "หนัง", quota: 3 },
  { id: uid(), name: "Honda CR-V", type: "SUV", total_seats: 5, rate_per_day: 2400, seat_material: "ผ้า", quota: 4 },
];

const seedFlights: FlightItem[] = [
  { id: uid(), airline: "Thai Airways", route: "BKK-HND", quota: 50 },
  { id: uid(), airline: "Bangkok Airways", route: "BKK-CNX", quota: 80 },
];
const seedHotels: HotelItem[] = [
  { id: uid(), name: "Centara Grand", city: "Bangkok", country: "Thailand", quota: 30 },
  { id: uid(), name: "Shangri-La", city: "Chiang Mai", country: "Thailand", quota: 20 },
];
const seedVisas: VisaItem[] = [
  { id: uid(), visa_type: "TR", country: "Japan", quota: 100 },
  { id: uid(), visa_type: "Non-Immigrant", country: "China", quota: 40 },
];
const seedInsurances: InsuranceItem[] = [
  { id: uid(), plan_name: "Silver Travel", coverage: "1,000,000 THB", price: 350, quota: 200 },
  { id: uid(), plan_name: "Gold Travel", coverage: "3,000,000 THB", price: 850, quota: 200 },
];

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
    { name: "stdtour-services-v1" },
  ),
);