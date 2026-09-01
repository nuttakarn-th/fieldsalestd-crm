/**
 * bookingLedgerStore.ts
 *
 * Booking Ledger — บันทึกการจอง/ยกเลิกแบบมี audit trail เต็มรูปแบบ
 * เชื่อมกับ CRM Lead + ใช้เป็น source of truth สำหรับ SalesWarRoom (accounting by booked_at date)
 */

import { create } from "zustand";
import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface BookingRecord {
  id: string;
  tour_id: string;
  period_id: string;
  // Customer link
  lead_id?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  // Booking details
  seats: number;
  price_per_seat: number;
  booked_by?: string | null;
  booked_at: string;          // ISO timestamptz
  notes?: string | null;
  // Cancellation
  status: "active" | "cancelled";
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  cancel_reason?: string | null;
}

export type AddBookingParams = Omit<BookingRecord, "id" | "status" | "cancelled_at" | "cancelled_by" | "cancel_reason">;

interface BookingLedgerState {
  bookings: BookingRecord[];
  isLoading: boolean;

  /** เพิ่ม booking ใหม่ → insert Supabase, คืน id (หรือ "" ถ้า fail) */
  addBooking: (params: AddBookingParams) => Promise<string>;
  /** ยกเลิก booking → update status + timestamps */
  cancelBooking: (id: string, cancelledBy: string, reason?: string) => Promise<boolean>;
  /** โหลด bookings ทั้งหมดจาก Supabase */
  loadBookings: () => Promise<void>;
  /** โหลด bookings สำหรับ period ที่ระบุ (ใช้ใน CancelBookingDialog) */
  loadBookingsForPeriod: (tourId: string, periodId: string) => Promise<BookingRecord[]>;
  /** Subscribe Realtime — คืน unsubscribe fn */
  subscribeRealtime: () => () => void;
  /** Helper: get active bookings for a period from local state */
  getActiveBookingsForPeriod: (tourId: string, periodId: string) => BookingRecord[];
}

// ── Store ──────────────────────────────────────────────────────────────────────

export const useBookingLedger = create<BookingLedgerState>()((set, get) => ({
  bookings: [],
  isLoading: false,

  addBooking: async (params) => {
    if (!SUPABASE_ENABLED || !supabase) return "";
    const { data, error } = await supabase
      .from("bookings")
      .insert({
        tour_id:       params.tour_id,
        period_id:     params.period_id,
        lead_id:       params.lead_id ?? null,
        customer_name: params.customer_name ?? null,
        customer_phone:params.customer_phone ?? null,
        seats:         params.seats,
        price_per_seat:params.price_per_seat,
        booked_by:     params.booked_by ?? null,
        booked_at:     params.booked_at,
        notes:         params.notes ?? null,
        status:        "active",
      })
      .select("*")
      .single();

    if (error || !data) {
      console.error("[bookingLedger] addBooking ล้มเหลว:", error);
      return "";
    }
    const record = data as BookingRecord;
    set({ bookings: [record, ...get().bookings] });
    return record.id;
  },

  cancelBooking: async (id, cancelledBy, reason) => {
    if (!SUPABASE_ENABLED || !supabase) return false;
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("bookings")
      .update({
        status:       "cancelled",
        cancelled_at: now,
        cancelled_by: cancelledBy,
        cancel_reason: reason ?? null,
      })
      .eq("id", id);

    if (error) {
      console.error("[bookingLedger] cancelBooking ล้มเหลว:", error);
      return false;
    }
    set({
      bookings: get().bookings.map((b) =>
        b.id === id
          ? { ...b, status: "cancelled", cancelled_at: now, cancelled_by: cancelledBy, cancel_reason: reason ?? null }
          : b
      ),
    });
    return true;
  },

  loadBookings: async () => {
    if (!SUPABASE_ENABLED || !supabase) return;
    set({ isLoading: true });
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .order("booked_at", { ascending: false });
    if (!error && data) {
      set({ bookings: data as BookingRecord[] });
    } else if (error) {
      console.error("[bookingLedger] loadBookings ล้มเหลว:", error);
    }
    set({ isLoading: false });
  },

  loadBookingsForPeriod: async (tourId, periodId) => {
    if (!SUPABASE_ENABLED || !supabase) return [];
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("tour_id", tourId)
      .eq("period_id", periodId)
      .order("booked_at", { ascending: false });
    if (error || !data) return [];
    const records = data as BookingRecord[];
    // merge เข้า local state (upsert โดย id)
    const existing = get().bookings;
    const merged = [...existing];
    records.forEach((r) => {
      const idx = merged.findIndex((b) => b.id === r.id);
      if (idx >= 0) merged[idx] = r; else merged.unshift(r);
    });
    set({ bookings: merged });
    return records;
  },

  getActiveBookingsForPeriod: (tourId, periodId) =>
    get().bookings.filter(
      (b) => b.tour_id === tourId && b.period_id === periodId && b.status === "active"
    ),

  subscribeRealtime: () => {
    if (!SUPABASE_ENABLED || !supabase) return () => {};
    const channel = supabase
      .channel("bookings-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, (payload) => {
        if (payload.eventType === "INSERT") {
          const rec = payload.new as BookingRecord;
          set((s) => ({ bookings: [rec, ...s.bookings.filter((b) => b.id !== rec.id)] }));
        } else if (payload.eventType === "UPDATE") {
          const rec = payload.new as BookingRecord;
          set((s) => ({ bookings: s.bookings.map((b) => b.id === rec.id ? rec : b) }));
        } else if (payload.eventType === "DELETE") {
          const id = (payload.old as { id: string }).id;
          set((s) => ({ bookings: s.bookings.filter((b) => b.id !== id) }));
        }
      })
      .subscribe();
    return () => { supabase?.removeChannel(channel); };
  },
}));
