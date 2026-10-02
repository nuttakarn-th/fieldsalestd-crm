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
 *   สายหัวคณะ        (Senior Group)     — วัยเกษียณ 58+ หัวหน้ากลุ่มเพื่อน เที่ยวถี่
 *
 * ── B2B Personas ──
 *   Outing B2B   — กลุ่มออกนอกสถานที่ทีม / Team Building
 *   Seminar B2B  — กลุ่มประชุม/สัมมนา
 */

import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { Customer, Lead } from "@/store/crmStore";

// ─── Types ──────────────────────────────────────────────────────────────────

export type B2CPersona =
  | "สายคุ้มค่า"
  | "สายธรรมชาติ"
  | "สายกิจกรรม"
  | "สายชิลล์พรีเมียม"
  | "สายหัวคณะ";

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
  source?: string;              // utm_source: เช่น "QR-โรงแรม", "LINE-Bio"
  source_channel?: string;      // user-selected: Facebook/Instagram/TikTok/เพื่อนแนะนำ/Google/อื่นๆ
  travel_experience?: string;   // B2C only: first_time / 1-3_times / 4_plus_times
  matched_customer_id?: string;
  submitted_at?: string;
}

// ─── B2C Persona Logic (ตรง PRD) ─────────────────────────────────────────────
//
// Q1: q1_style — สไตล์การเที่ยว
//   1=FullTour (แพ็กเกจจัดครบ)  2=Nature (ลุยธรรมชาติ)
//   3=NicheActivity (กิจกรรมเฉพาะทาง)  4=Chill (พักผ่อน/ชิลล์)
//
// Q2: q2_companion — ผู้ร่วมเดินทาง
//   1=Solo  2=Friends/Couple  3=Family
//
// Q3: q3_budget — งบประมาณ
//   1=Value (ประหยัด)  2=Standard (มาตรฐาน)  3=Premium (สายเปย์)
//
// Q4: q4_age — ช่วงอายุ (ใช้ detect สายหัวคณะด้วย)
//   1=20-25(GenZ)  2=26-35(GenY)  3=36-45(GenX)  4=46-55(GenX/BB)  5=56+(BabyBoomer/Senior)
//
// Logic (Top-down จาก PRD + สายหัวคณะ):
//   IF q4==5 AND q2==2 (กลุ่มเพื่อน) → สายหัวคณะ   ← Senior Group Leader
//   ELSE IF q1==3 → สายกิจกรรม
//   ELSE IF q1==4 AND q3==3 → สายชิลล์พรีเมียม
//   ELSE IF q1==2 AND (q2==2 OR q2==3) → สายธรรมชาติ
//   ELSE IF q1==1 AND (q3==1 OR q3==2) → สายคุ้มค่า
//   ELSE → สายคุ้มค่า (fallback)

export function inferPersonaB2C(q1: number, q2: number, q3: number, q4: number): B2CPersona {
  // สายหัวคณะ: อายุ 56+ เดินทางกับกลุ่มเพื่อน
  if (q4 === 5 && q2 === 2) return "สายหัวคณะ";
  if (q1 === 3) return "สายกิจกรรม";
  if (q1 === 4 && q3 === 3) return "สายชิลล์พรีเมียม";
  if (q1 === 2 && (q2 === 2 || q2 === 3)) return "สายธรรมชาติ";
  if (q1 === 1 && (q3 === 1 || q3 === 2)) return "สายคุ้มค่า";
  return "สายคุ้มค่า"; // fallback
}

export function ageGroupFromQ4(q4: number): string {
  if (q4 === 1) return "GenZ";
  if (q4 === 2) return "GenY";
  if (q4 === 3) return "GenX";
  if (q4 === 4) return "BabyBoomer";
  if (q4 === 5) return "Senior";
  return "BabyBoomer";
}

// ─── B2B Persona Logic (ตรง PRD) ─────────────────────────────────────────────
//
// Q1: q1_purpose — จุดประสงค์
//   1=Outing (พาพนักงานพักผ่อน/team building)  2=Seminar (สัมมนา/ดูงาน)
//
// Q2: q2_role — บทบาทในองค์กร
//   1=HR/Admin  2=เลขา/ฝ่ายจัดซื้อ  3=Executive/ผู้บริหาร
//
// Q3: q3_size — จำนวนคน
//   1=10-20 คน  2=21-50 คน  3=50+ คน
//
// Q4: q4_challenge — ความท้าทาย
//   1=BudgetControl  2=MassSatisfaction  3=VIPCare
//
// Logic (Top-down จาก PRD):
//   IF q1==2 OR q4==3 → Seminar B2B
//   ELSE → Outing B2B

export function inferPersonaB2B(q1: number, _q2: number, _q3: number, q4: number): B2BPersona {
  if (q1 === 2 || q4 === 3) return "Seminar B2B";
  return "Outing B2B";
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

  const avgPax =
    closedLeads.reduce((s, l) => s + (l.pax_count ?? 1), 0) / closedLeads.length;

  // สายหัวคณะ: เที่ยวถี่ (≥4 trips) + จองหลายที่นั่งต่อครั้ง (avgPax ≥ 4) + ราคาต่อหัวปานกลาง
  if (closedLeads.length >= 4 && avgPax >= 4 && avgPricePerSeat < 15000) {
    return "สายหัวคณะ";
  }

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
  "สายหัวคณะ":         "bg-rose-100 text-rose-800 border-rose-300",
  "Outing B2B":        "bg-orange-100 text-orange-800 border-orange-300",
  "Seminar B2B":       "bg-teal-100 text-teal-800 border-teal-300",
};

export const PERSONA_EMOJI: Record<PersonaTag, string> = {
  "สายคุ้มค่า":        "💰",
  "สายธรรมชาติ":       "🌿",
  "สายกิจกรรม":        "⚡",
  "สายชิลล์พรีเมียม":  "💎",
  "สายหัวคณะ":         "👑",
  "Outing B2B":        "🏕️",
  "Seminar B2B":       "🎯",
};

export const ALL_PERSONAS: PersonaTag[] = [
  "สายคุ้มค่า",
  "สายธรรมชาติ",
  "สายกิจกรรม",
  "สายชิลล์พรีเมียม",
  "สายหัวคณะ",
  "Outing B2B",
  "Seminar B2B",
];

/** Quick info สำหรับ Hover Tooltip บนหน้า Program */
export const PERSONA_QUICK_INFO: Record<PersonaTag, {
  who: string;
  budget: string;
  trigger: string;
  channels: string;
}> = {
  "สายคุ้มค่า": {
    who: "ครอบครัว (สามี/ภรรยา + ลูก) · 35–50 ปี",
    budget: "4,000–8,000 บ./คน",
    trigger: "โปรโมชั่นราคาพิเศษ + เพื่อนแนะนำ",
    channels: "Facebook, Line กลุ่มครอบครัว",
  },
  "สายธรรมชาติ": {
    who: "คู่รัก / กลุ่มเพื่อน · 25–38 ปี",
    budget: "8,000–15,000 บ./คน",
    trigger: "รูปสวย + รีวิวจริง + ที่พักไม่แออัด",
    channels: "Instagram, Reels, Blog รีวิว",
  },
  "สายกิจกรรม": {
    who: "กลุ่มเพื่อน / solo · 20–35 ปี",
    budget: "5,000–12,000 บ./คน",
    trigger: "Activity ใหม่ที่ไม่เคยทำ + Challenge",
    channels: "TikTok, YouTube Vlog",
  },
  "สายชิลล์พรีเมียม": {
    who: "คู่รัก / solo professional · 30–45 ปี",
    budget: "15,000 บ.+/คน",
    trigger: "โรงแรม 5★ วิวดี + บริการส่วนตัว",
    channels: "Instagram Aesthetic, Influencer",
  },
  "สายหัวคณะ": {
    who: "วัยเกษียณ 58–70 ปี · หัวหน้ากลุ่มเพื่อน 5–15 คน",
    budget: "6,000–12,000 บ./คน · จอง 5+ ครั้ง/ปี",
    trigger: "OB ที่รู้จักแนะนำมา + เพื่อนกลุ่มเห็นด้วย",
    channels: "โทรหา OB โดยตรง, Line ส่วนตัว",
  },
  "Outing B2B": {
    who: "HR Manager / Admin · จัด Outing บริษัท",
    budget: "งบต่อหัวตายตัว (ยืดหยุ่นได้)",
    trigger: "ราคาต่อหัวชัด + ใบเสนอราคาพร้อม",
    channels: "Email, Line Official, PDF Proposal",
  },
  "Seminar B2B": {
    who: "Training Manager / L&D · จัด Seminar",
    budget: "Quality > ราคา",
    trigger: "Venue ครบ + Portfolio งานที่เคยทำ",
    channels: "LinkedIn, Email Formal",
  },
};
