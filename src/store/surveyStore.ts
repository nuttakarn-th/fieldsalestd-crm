/**
 * surveyStore.ts
 *
 * Zustand store + utilities สำหรับระบบ Persona Survey
 *
 * ── B2C Personas ──
 *   สายคุ้มค่า       (Value Hunter)     — ราคา/คุณค่าเป็นหลัก
 *   สายธรรมชาติ      (Nature Lover)     — ชอบธรรมชาติ/ผ่อนคลาย
 *   สายกิจกรรม       (Activity Seeker)  — ชอบผจญภัย/กิจกรรม
 *   สายชิลล์พรีเมียม (Chill Premium)   — ชอบสะดวกสบาย/หรูหรา
 *
 * ── B2B Personas ──
 *   Outing B2B   — กลุ่มออกนอกสถานที่ทีม / Team Building
 *   Seminar B2B  — กลุ่มประชุม/สัมมนา
 */

import { create } from "zustand";
import { supabase } from "@/lib/supabaseClient";
import type { Customer, Lead } from "@/store/crmStore";

// ─── Types ──────────────────────────────────────────────────────────────────

export type B2CPersona =
  | "สายคุ้มค่า"
  | "สายธรรมชาติ"
  | "สายกิจกรรม"
  | "สายชิลล์พรีเมียม";

export type B2BPersona = "Outing B2B" | "Seminar B2B";

export type PersonaTag = B2CPersona | B2BPersona;

export interface SurveyResponse {
  id?: number;
  type: "b2c" | "b2b";
  persona_tag?: PersonaTag;
  q1?: number; // คำถามข้อ 1 (1-based index ของตัวเลือกที่เลือก)
  q2?: number;
  q3?: number;
  q4?: number;
  phone?: string;
  name?: string;
  source?: string;           // เช่น "QR-โรงแรม", "Facebook", "LINE"
  matched_customer_id?: string;
  submitted_at?: string;
}

// ─── B2C Persona Logic ───────────────────────────────────────────────────────
//
// Q1: งบประมาณต่อคน?
//   1=น้อยกว่า 5,000   2=5,000–10,000   3=10,000–20,000   4=มากกว่า 20,000
//
// Q2: ชอบทริปแบบไหน?
//   1=แบบเต็มโปรแกรม/จัดการทุกอย่าง   2=ธรรมชาติ/ผ่อนคลาย
//   3=กิจกรรมผจญภัย/ท้าทาย           4=หรูหรา/สบาย
//
// Q3: คนเดินทางด้วยกัน?
//   1=คนเดียว   2=คู่/เพื่อน   3=ครอบครัว   4=กลุ่มใหญ่
//
// Q4: สิ่งสำคัญที่สุดในการเลือกทัวร์?
//   1=ราคา   2=สถานที่/เส้นทาง   3=กิจกรรม/ประสบการณ์   4=ความสะดวก/บริการ

export function inferPersonaB2C(q1: number, q2: number, q3: number, q4: number): B2CPersona {
  // Score matrix
  let scoreValue   = 0; // สายคุ้มค่า
  let scoreNature  = 0; // สายธรรมชาติ
  let scoreActive  = 0; // สายกิจกรรม
  let scoreChill   = 0; // สายชิลล์พรีเมียม

  // Q1: งบ
  if (q1 === 1) scoreValue   += 3;
  if (q1 === 2) { scoreValue += 1; scoreNature += 1; }
  if (q1 === 3) { scoreNature += 1; scoreActive += 1; }
  if (q1 === 4) scoreChill   += 3;

  // Q2: ประเภททริป
  if (q2 === 1) scoreValue   += 2;
  if (q2 === 2) scoreNature  += 3;
  if (q2 === 3) scoreActive  += 3;
  if (q2 === 4) scoreChill   += 3;

  // Q3: กลุ่ม
  if (q3 === 1) { scoreActive += 1; scoreChill += 1; }
  if (q3 === 2) { scoreNature += 1; scoreChill += 1; }
  if (q3 === 3) { scoreValue  += 1; scoreNature += 1; }
  if (q3 === 4) scoreValue    += 2;

  // Q4: ปัจจัยเลือก
  if (q4 === 1) scoreValue   += 3;
  if (q4 === 2) scoreNature  += 2;
  if (q4 === 3) scoreActive  += 2;
  if (q4 === 4) scoreChill   += 2;

  const max = Math.max(scoreValue, scoreNature, scoreActive, scoreChill);
  if (max === scoreValue)  return "สายคุ้มค่า";
  if (max === scoreNature) return "สายธรรมชาติ";
  if (max === scoreActive) return "สายกิจกรรม";
  return "สายชิลล์พรีเมียม";
}

// ─── B2B Persona Logic ───────────────────────────────────────────────────────
//
// Q1: จุดประสงค์หลัก?
//   1=Team Building/สันทนาการ   2=ประชุม/สัมมนา   3=รางวัลพนักงาน   4=งานเลี้ยง/ปาร์ตี้
//
// Q2: จำนวนผู้เข้าร่วม?
//   1=น้อยกว่า 20 คน   2=20-50 คน   3=50-100 คน   4=มากกว่า 100 คน
//
// Q3: ต้องการสิ่งอำนวยความสะดวกอะไร?
//   1=ห้องประชุม/โปรเจกเตอร์   2=กิจกรรมกลุ่ม   3=อาหาร/เครื่องดื่ม   4=ที่พักสำหรับหมู่คณะ
//
// Q4: งบประมาณต่อหัว?
//   1=น้อยกว่า 2,000   2=2,000–5,000   3=5,000–10,000   4=มากกว่า 10,000

export function inferPersonaB2B(q1: number, q2: number, q3: number, q4: number): B2BPersona {
  let scoreSeminar = 0;
  let scoreOuting  = 0;

  // Q1
  if (q1 === 1) scoreOuting  += 3;
  if (q1 === 2) scoreSeminar += 3;
  if (q1 === 3) { scoreOuting += 2; scoreSeminar += 1; }
  if (q1 === 4) scoreOuting  += 2;

  // Q2 — กลุ่มใหญ่ → Seminar
  if (q2 === 1) scoreOuting  += 1;
  if (q2 === 2) { scoreOuting += 1; scoreSeminar += 1; }
  if (q2 === 3) scoreSeminar += 2;
  if (q2 === 4) scoreSeminar += 3;

  // Q3
  if (q3 === 1) scoreSeminar += 3;
  if (q3 === 2) scoreOuting  += 3;
  if (q3 === 3) { scoreOuting += 1; scoreSeminar += 1; }
  if (q3 === 4) scoreOuting  += 2;

  // Q4 — งบสูง → Seminar
  if (q4 === 1) scoreOuting  += 1;
  if (q4 === 2) scoreOuting  += 1;
  if (q4 === 3) scoreSeminar += 1;
  if (q4 === 4) scoreSeminar += 2;

  return scoreSeminar >= scoreOuting ? "Seminar B2B" : "Outing B2B";
}

// ─── Auto-Inference from Customer/Lead data ──────────────────────────────────
//
// วิธีคำนวณ:
//   - ราคาเฉลี่ยต่อหัว + จำนวน pax_count → ประเมิน budget_range + travel_style
//   - ถ้า customer มี company → B2B persona
//   - ถ้า B2C → ประเมินจาก avg price/seat

export function inferPersonaFromCustomer(
  customer: Customer,
  leads: Lead[],
): PersonaTag | null {
  // ถ้ามี company → B2B
  if (customer.company) {
    const avgPax =
      leads.length > 0
        ? leads.reduce((s, l) => s + (l.pax_count ?? 1), 0) / leads.length
        : 1;
    return avgPax >= 20 ? "Seminar B2B" : "Outing B2B";
  }

  // B2C inference จาก closed leads ที่มีราคา
  const closedLeads = leads.filter(
    (l) => l.status === "จองแล้ว" || l.status === "ปิดการขาย",
  );
  if (closedLeads.length === 0) return null;

  const avgPricePerSeat =
    closedLeads.reduce((sum, l) => {
      const pax   = l.pax_count && l.pax_count > 0 ? l.pax_count : 1;
      const price = l.deal_value ?? 0;
      return sum + price / pax;
    }, 0) / closedLeads.length;

  if (avgPricePerSeat >= 20000) return "สายชิลล์พรีเมียม";
  if (avgPricePerSeat >= 10000) return "สายธรรมชาติ";
  if (avgPricePerSeat >= 5000)  return "สายกิจกรรม";
  return "สายคุ้มค่า";
}

// ─── Age Group helper ────────────────────────────────────────────────────────

export function inferAgeGroup(birthYear?: number): string | null {
  if (!birthYear) return null;
  const age = new Date().getFullYear() - birthYear;
  if (age <= 27) return "GenZ";
  if (age <= 43) return "GenY";
  if (age <= 59) return "GenX";
  return "BabyBoomer";
}

// ─── Store ───────────────────────────────────────────────────────────────────

interface SurveyState {
  responses: SurveyResponse[];
  loading: boolean;
  error: string | null;

  fetchResponses: () => Promise<void>;
  submitSurvey: (data: Omit<SurveyResponse, "id" | "submitted_at">) => Promise<SurveyResponse | null>;
  matchSurveyToCustomer: (phone: string, personaTag: PersonaTag) => Promise<void>;
}

export const useSurveyStore = create<SurveyState>((set, get) => ({
  responses: [],
  loading: false,
  error: null,

  fetchResponses: async () => {
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from("survey_responses")
      .select("*")
      .order("submitted_at", { ascending: false })
      .limit(500);
    if (error) {
      set({ loading: false, error: error.message });
    } else {
      set({ loading: false, responses: data ?? [] });
    }
  },

  submitSurvey: async (data) => {
    const { data: inserted, error } = await supabase
      .from("survey_responses")
      .insert([data])
      .select()
      .single();
    if (error) {
      console.error("Survey submit error:", error.message);
      return null;
    }
    set((s) => ({ responses: [inserted, ...s.responses] }));

    // Auto-match to customer by phone
    if (inserted.phone && inserted.persona_tag) {
      get().matchSurveyToCustomer(inserted.phone, inserted.persona_tag as PersonaTag);
    }
    return inserted;
  },

  matchSurveyToCustomer: async (phone: string, personaTag: PersonaTag) => {
    // หา customer ที่ phone ตรงกัน
    const { data: customers } = await supabase
      .from("customers")
      .select("customer_id, persona_tag")
      .eq("phone", phone)
      .limit(1);
    if (!customers || customers.length === 0) return;
    const customer = customers[0];
    if (customer.persona_tag) return; // ถ้ามีแล้วไม่เขียนทับ

    await supabase
      .from("customers")
      .update({ persona_tag: personaTag })
      .eq("customer_id", customer.customer_id);
  },
}));

// ─── Persona display helpers ─────────────────────────────────────────────────

export const PERSONA_COLORS: Record<PersonaTag, string> = {
  "สายคุ้มค่า":        "bg-amber-100 text-amber-800 border-amber-300",
  "สายธรรมชาติ":       "bg-green-100 text-green-800 border-green-300",
  "สายกิจกรรม":        "bg-blue-100 text-blue-800 border-blue-300",
  "สายชิลล์พรีเมียม":  "bg-purple-100 text-purple-800 border-purple-300",
  "Outing B2B":        "bg-orange-100 text-orange-800 border-orange-300",
  "Seminar B2B":       "bg-teal-100 text-teal-800 border-teal-300",
};

export const PERSONA_EMOJI: Record<PersonaTag, string> = {
  "สายคุ้มค่า":        "💰",
  "สายธรรมชาติ":       "🌿",
  "สายกิจกรรม":        "⚡",
  "สายชิลล์พรีเมียม":  "💎",
  "Outing B2B":        "🏕️",
  "Seminar B2B":       "🎯",
};

export const ALL_PERSONAS: PersonaTag[] = [
  "สายคุ้มค่า",
  "สายธรรมชาติ",
  "สายกิจกรรม",
  "สายชิลล์พรีเมียม",
  "Outing B2B",
  "Seminar B2B",
];
