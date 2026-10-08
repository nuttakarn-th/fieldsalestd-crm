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
  | "สายหัวคณะ"
  | "สายมือใหม่";

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
  q5?: number;
  phone?: string;
  name?: string;
  source?: string;              // utm_source: เช่น "QR-โรงแรม", "LINE-Bio"
  source_channel?: string;      // user-selected: Facebook/Instagram/TikTok/เพื่อนแนะนำ/Google/อื่นๆ
  travel_experience?: string;   // B2C only: first_time / 1-3_times / 4_plus_times
  matched_customer_id?: string;
  submitted_at?: string;
}

// ─── B2C Persona Scoring Matrix ──────────────────────────────────────────────
//
// คำถาม 5 ข้อ (ชุดใหม่ v379):
//   Q1: q1_region — โซนปลายทาง
//     1=เอเชียตะวันออก (ญี่ปุ่น เกาหลี จีน)
//     2=อาเซียน (เวียดนาม บาหลี สิงคโปร์)
//     3=ยุโรป / ระยะไกล
//     4=ในประเทศ (ทะเล/ภูเขา)
//
//   Q2: q2_style — สไตล์การเที่ยว (เลือกที่ใช่ที่สุด)
//     1=ธรรมชาติ ภูเขา อากาศดี
//     2=คาเฟ่ ชิล ถ่ายรูป ช้อปปิ้ง
//     3=กิจกรรมเฉพาะทาง (สกี ดำน้ำ วิ่งเทรล)
//     4=กิน/วัฒนธรรมท้องถิ่น จัดเต็ม
//
//   Q3: q3_days — จำนวนวันที่อยากเดินทาง
//     1=3-4 วัน  2=5-6 วัน  3=7 วันขึ้นไป
//
//   Q4: q4_budget — งบประมาณต่อคน/ทริป
//     1=ต่ำกว่า 25,000 บาท  2=25,000–45,000 บาท
//     3=45,000–65,000 บาท  4=65,000 บาทขึ้นไป
//
//   Q5: q5_pain — Pain point หลักที่ทำให้ลังเลจองทัวร์
//     1=ตารางแน่นเกิน ไม่มีเวลาอิสระ
//     2=สถานที่ซ้ำซาก / ไม่น่าสนใจ
//     3=กังวลอาหาร / ที่พักไม่ตอบโจทย์
//     4=วันเดินทางไม่ตรงกับช่วงที่สะดวก
//
// travel_experience (contact form) เป็น bonus signal:
//   "first_time"   → สายมือใหม่ +10
//   "4_plus_times" → สายหัวคณะ +8

type ScoreMap = Record<B2CPersona, number[]>;

// แต่ละ array = คะแนนที่ persona นี้ได้จากแต่ละตัวเลือก (index 0 = option 1)
const Q1_SCORES: ScoreMap = {
  //                          [เอเชียตะวันออก, อาเซียน, ยุโรป, ในประเทศ]
  "สายคุ้มค่า":        [1, 2, 0, 3],
  "สายธรรมชาติ":       [3, 1, 4, 1],
  "สายกิจกรรม":        [2, 2, 3, 0],
  "สายชิลล์พรีเมียม":  [2, 2, 3, 1],
  "สายหัวคณะ":         [2, 3, 0, 1],
  "สายมือใหม่":        [2, 3, 0, 0],
};

const Q2_SCORES: ScoreMap = {
  //                          [ธรรมชาติ, คาเฟ่ชิล, กิจกรรม, กิน/วัฒนธรรม]
  "สายคุ้มค่า":        [1, 1, 0, 4],
  "สายธรรมชาติ":       [5, 0, 1, 1],
  "สายกิจกรรม":        [1, 0, 5, 0],
  "สายชิลล์พรีเมียม":  [1, 5, 0, 1],
  "สายหัวคณะ":         [1, 2, 0, 3],
  "สายมือใหม่":        [1, 3, 0, 3],
};

const Q3_SCORES: ScoreMap = {
  //                          [3-4วัน, 5-6วัน, 7+วัน]
  "สายคุ้มค่า":        [2, 3, 1],
  "สายธรรมชาติ":       [0, 2, 4],
  "สายกิจกรรม":        [0, 2, 4],
  "สายชิลล์พรีเมียม":  [4, 3, 0],
  "สายหัวคณะ":         [1, 3, 2],
  "สายมือใหม่":        [2, 3, 0],
};

const Q4_SCORES: ScoreMap = {
  //                          [<25k, 25-45k, 45-65k, 65k+]
  "สายคุ้มค่า":        [4, 3, 0, 0],
  "สายธรรมชาติ":       [1, 4, 2, 0],
  "สายกิจกรรม":        [2, 4, 2, 0],
  "สายชิลล์พรีเมียม":  [0, 1, 4, 5],
  "สายหัวคณะ":         [3, 4, 0, 0],
  "สายมือใหม่":        [4, 3, 0, 0],
};

const Q5_SCORES: ScoreMap = {
  //                          [ตารางแน่น, สถานที่ซ้ำซาก, อาหาร/ที่พัก, วันไม่ตรง]
  "สายคุ้มค่า":        [1, 1, 2, 3],
  "สายธรรมชาติ":       [2, 4, 1, 1],
  "สายกิจกรรม":        [1, 4, 1, 1],
  "สายชิลล์พรีเมียม":  [5, 1, 3, 1],
  "สายหัวคณะ":         [1, 1, 3, 4],
  "สายมือใหม่":        [3, 1, 3, 2],
};

const TRAVEL_EXP_BONUS: Record<string, Partial<Record<B2CPersona, number>>> = {
  "first_time":   { "สายมือใหม่": 10 },
  "1-3_times":    { "สายธรรมชาติ": 2, "สายกิจกรรม": 2, "สายชิลล์พรีเมียม": 1 },
  "4_plus_times": { "สายหัวคณะ": 8 },
};

// Persona order สำหรับ tie-breaking (อยู่ก่อน = ชนะ tie)
const B2C_PERSONA_ORDER: B2CPersona[] = [
  "สายชิลล์พรีเมียม",
  "สายธรรมชาติ",
  "สายกิจกรรม",
  "สายหัวคณะ",
  "สายคุ้มค่า",
  "สายมือใหม่", // ต้องมี travel_exp เป็น first_time ถึงจะชนะ
];

export function inferPersonaB2C(
  q1: number,
  q2: number,
  q3: number,
  q4: number,
  q5?: number,
  travelExp?: string,
): B2CPersona {
  const scores: Record<B2CPersona, number> = {
    "สายคุ้มค่า": 0,
    "สายธรรมชาติ": 0,
    "สายกิจกรรม": 0,
    "สายชิลล์พรีเมียม": 0,
    "สายหัวคณะ": 0,
    "สายมือใหม่": 0,
  };

  for (const p of B2C_PERSONA_ORDER) {
    scores[p] += Q1_SCORES[p][q1 - 1] ?? 0;
    scores[p] += Q2_SCORES[p][q2 - 1] ?? 0;
    scores[p] += Q3_SCORES[p][q3 - 1] ?? 0;
    scores[p] += Q4_SCORES[p][q4 - 1] ?? 0;
    if (q5) scores[p] += Q5_SCORES[p][q5 - 1] ?? 0;
    if (travelExp) scores[p] += TRAVEL_EXP_BONUS[travelExp]?.[p] ?? 0;
  }

  // เลือก persona ที่คะแนนสูงสุด (tie-break ตาม B2C_PERSONA_ORDER)
  return B2C_PERSONA_ORDER.reduce((best, p) =>
    scores[p] > scores[best] ? p : best,
  B2C_PERSONA_ORDER[0]);
}

/** @deprecated ใช้เฉพาะ backward-compat — Q4 ตอนนี้คือ budget ไม่ใช่ age */
export function ageGroupFromQ4(_q4: number): string {
  return "GenY";
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
  "สายมือใหม่":        "bg-sky-100 text-sky-800 border-sky-300",
  "Outing B2B":        "bg-orange-100 text-orange-800 border-orange-300",
  "Seminar B2B":       "bg-teal-100 text-teal-800 border-teal-300",
};

export const PERSONA_EMOJI: Record<PersonaTag, string> = {
  "สายคุ้มค่า":        "💰",
  "สายธรรมชาติ":       "🌿",
  "สายกิจกรรม":        "⚡",
  "สายชิลล์พรีเมียม":  "💎",
  "สายหัวคณะ":         "👑",
  "สายมือใหม่":        "🌏",
  "Outing B2B":        "🏕️",
  "Seminar B2B":       "🎯",
};

export const ALL_PERSONAS: PersonaTag[] = [
  "สายคุ้มค่า",
  "สายธรรมชาติ",
  "สายกิจกรรม",
  "สายชิลล์พรีเมียม",
  "สายหัวคณะ",
  "สายมือใหม่",
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
  "สายมือใหม่": {
    who: "พนักงานออฟฟิศ / บัณฑิตใหม่ · 26–35 ปี · ยังไม่เคยไปต่างประเทศ",
    budget: "12,000–18,000 บ./คน",
    trigger: "รีวิว 'ครั้งแรกก็ทำได้' + ทีมช่วย visa ครบ",
    channels: "TikTok, Google, Facebook Group ท่องเที่ยว",
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

// ─── New 4+3 Persona System — ใช้สำหรับ Service Program Tagging ─────────────
// (แยกออกจาก Survey ไม่กระทบ scoring matrix เดิม)

export const SERVICE_PERSONA_TAGS = ["C1", "C2a", "C2b", "C3", "B1", "B2", "B3"] as const;
export type ServicePersonaTag = typeof SERVICE_PERSONA_TAGS[number];

export const SERVICE_PERSONA_LABELS: Record<ServicePersonaTag, string> = {
  C1:  "ครอบครัวไทยใจกว้าง",
  C2a: "เพื่อนสายสนุก",
  C2b: "คู่รัก/ทริปส่วนตัว",
  C3:  "วัยเกษียณใจสู้",
  B1:  "บริษัทเอกชน Incentive",
  B2:  "ราชการ / การศึกษา",
  B3:  "เอเจนซี่ & คู่ค้า",
};

export const SERVICE_PERSONA_EMOJI: Record<ServicePersonaTag, string> = {
  C1: "👨‍👩‍👧‍👦", C2a: "🎯", C2b: "💑", C3: "🌸",
  B1: "🏆", B2: "🎓", B3: "🤝",
};

export const SERVICE_PERSONA_COLORS: Record<ServicePersonaTag, string> = {
  C1:  "bg-orange-100 text-orange-800 border-orange-300",
  C2a: "bg-pink-100 text-pink-800 border-pink-300",
  C2b: "bg-purple-100 text-purple-800 border-purple-300",
  C3:  "bg-rose-100 text-rose-800 border-rose-300",
  B1:  "bg-emerald-100 text-emerald-800 border-emerald-300",
  B2:  "bg-sky-100 text-sky-800 border-sky-300",
  B3:  "bg-amber-100 text-amber-800 border-amber-300",
};

export const SERVICE_PERSONA_QUICK_INFO: Record<ServicePersonaTag, {
  who: string; budget: string; trigger: string; channels: string;
}> = {
  C1: {
    who: "พ่อแม่ 38–55 ปี + ลูก · ครอบครัว 4–8 คน",
    budget: "฿18,000–35,000/ท่าน",
    trigger: "ปิดเทอม มี.ค. / ต.ค. / ส.ค.",
    channels: "Facebook, Line OA, Referral",
  },
  C2a: {
    who: "กลุ่มเพื่อน 22–35 ปี · 3–8 คน",
    budget: "฿12,000–25,000/ท่าน",
    trigger: "วันหยุดยาว / Photo Spot ฮิต",
    channels: "TikTok, Instagram, Facebook Group",
  },
  C2b: {
    who: "คู่รัก / Solo 25–45 ปี · 1–2 คน",
    budget: "฿20,000–60,000+/ท่าน",
    trigger: "ความเป็นส่วนตัว / วันพิเศษ",
    channels: "Instagram, Google, Referral",
  },
  C3: {
    who: "วัยเกษียณ 55–75 ปี · กลุ่มเพื่อน 6–20 คน",
    budget: "฿22,000–60,000/ท่าน",
    trigger: "เพื่อนชวน / Pace ช้า / ดูแลดี",
    channels: "Line OA, Word-of-Mouth",
  },
  B1: {
    who: "HR Manager / MD · บริษัทเอกชน",
    budget: "฿1.5M–10M/กรุ๊ป",
    trigger: "Reward / Incentive ประจำปี",
    channels: "Referral, Field Sale, Line OA",
  },
  B2: {
    who: "รองผอ. / เลขาวิชาการ · ราชการ / มหาวิทยาลัย",
    budget: "฿500K–3M/โครงการ",
    trigger: "ศึกษาดูงาน / พัฒนาบุคลากร / ปิดงบ ก.ย.",
    channels: "Field Sale, Referral",
  },
  B3: {
    who: "เจ้าของ / ผจก.ทัวร์ · Sub-contractor",
    budget: "ราคา Net สุทธิ",
    trigger: "ตอบไว / ราคาดี / Repeat Business",
    channels: "Agent Network, Line ตรง",
  },
};
