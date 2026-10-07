/**
 * personaScorer.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Persona Scoring Engine — คำนวณ Persona ที่น่าจะ match จาก Lead signals
 *
 * Personas:
 *   OB B2C: สายคุ้มค่า / สายธรรมชาติ / สายกิจกรรม / สายชิลล์พรีเมียม / สายหัวคณะ / สายมือใหม่
 *   OB B2B: Outing B2B (คุณปลา) / Seminar B2B (คุณโจ)
 *   TRP:    R1 (ทัวร์ต่างชาติ) / R2 (คู่ค้า) / R3 (ราชการ) / R4 (ออนไลน์)
 */

import type { Source, BUType } from "@/store/crmStore";

// ── Types ─────────────────────────────────────────────────────────────────────

export type OBB2CPersona =
  | "สายคุ้มค่า"
  | "สายธรรมชาติ"
  | "สายกิจกรรม"
  | "สายชิลล์พรีเมียม"
  | "สายหัวคณะ"
  | "สายมือใหม่";

export type OBB2BPersona = "Outing B2B" | "Seminar B2B";
export type TRPPersona   = "R1" | "R2" | "R3" | "R4";
export type Department   = "OB_B2C" | "OB_B2B" | "TRP" | "TK" | "UNKNOWN";

export interface PersonaScore {
  tag:        string;           // persona_tag value
  label:      string;           // display name (ป้าแดง / พี่ต้ม …)
  score:      number;           // total score
  confidence: number;           // 0–100
  dept:       Department;
  emoji:      string;
  color:      string;           // tailwind gradient class
  actions:    string[];         // suggested next actions
  reason:     string;           // short explanation
}

export interface PersonaMatchResult {
  dept:        Department;
  isB2B:       boolean;
  topMatch:    PersonaScore | null;
  allScores:   PersonaScore[];
  confidence:  number;           // same as topMatch.confidence
}

// ── Persona metadata ──────────────────────────────────────────────────────────

const OB_B2C_META: Record<OBB2CPersona, { label: string; emoji: string; color: string; actions: string[] }> = {
  "สายคุ้มค่า": {
    label: "พี่ต้ม — สายคุ้มค่า",
    emoji: "💰",
    color: "from-orange-400 to-amber-500",
    actions: [
      "ส่งโปรแกรม Series ราคาดี พร้อมเปรียบเทียบ Value",
      "เน้นจุด Highlight ว่าคุ้มกว่าจัดเองยังไง",
      "แนะนำ Join Tour ราคาประหยัด",
    ],
  },
  "สายธรรมชาติ": {
    label: "น้องนิ้ง — สายธรรมชาติ",
    emoji: "🌿",
    color: "from-green-400 to-teal-500",
    actions: [
      "ส่งโปรแกรมที่เน้นธรรมชาติ เช่น จิ่วจ้ายโกว แชงกรีล่า",
      "แนบภาพวิวสวยๆ จากทริปจริง",
      "พูดถึง pace ช้า ไม่เร่งรีบ",
    ],
  },
  "สายกิจกรรม": {
    label: "น้องเฟิร์น — สายกิจกรรม",
    emoji: "🎯",
    color: "from-pink-400 to-rose-500",
    actions: [
      "เสนอโปรแกรมที่มีกิจกรรม เช่น สกีรีสอร์ท เดินป่า",
      "ส่ง Content สั้น TikTok-style ภาพเคลื่อนไหว",
      "แนะนำ Photo Spots ยอดนิยม",
    ],
  },
  "สายชิลล์พรีเมียม": {
    label: "คุณแอน — สายชิลล์พรีเมียม",
    emoji: "✨",
    color: "from-purple-400 to-violet-600",
    actions: [
      "เสนอโปรแกรม Premium ที่พักระดับ 5 ดาว",
      "เน้น Private Tour / ไม่ปะปนกลุ่มอื่น",
      "ส่ง Proposal หน้าตาสวยงามอย่างเป็นทางการ",
    ],
  },
  "สายหัวคณะ": {
    label: "ป้าแดง — สายหัวคณะ",
    emoji: "👴",
    color: "from-rose-400 to-red-500",
    actions: [
      "ให้ราคาพิเศษสำหรับกรุ๊ป + สิทธิ์หัวหน้าคณะฟรี",
      "เสนอ Join Series ที่ผู้สูงอายุเดินทางได้สะดวก",
      "ติดต่อ Line เป็นหลัก พูดคุยไม่เป็นทางการ",
    ],
  },
  "สายมือใหม่": {
    label: "น้องมิ้น — สายมือใหม่",
    emoji: "🌟",
    color: "from-blue-400 to-indigo-500",
    actions: [
      "อธิบาย Process จองทัวร์ให้เข้าใจง่าย",
      "เสนอโปรแกรม Beginner-Friendly",
      "ส่งลิงก์รีวิว + FAQ ประกอบ",
    ],
  },
};

const OB_B2B_META: Record<OBB2BPersona, { label: string; emoji: string; color: string; actions: string[] }> = {
  "Outing B2B": {
    label: "คุณปลา — Outing B2B",
    emoji: "🏢",
    color: "from-emerald-500 to-green-600",
    actions: [
      "สร้าง Proposal แพ็คเกจ Outing พร้อมราคา per head",
      "ระบุ Activity ที่ทำได้ในกรุ๊ป (Team Building)",
      "นัด Present ผ่าน Line หรือพบตัวที่บริษัท",
    ],
  },
  "Seminar B2B": {
    label: "คุณโจ — Seminar B2B",
    emoji: "🎓",
    color: "from-sky-500 to-blue-600",
    actions: [
      "เตรียมเอกสารใบเสนอราคาอย่างเป็นทางการ",
      "ระบุ Reference จากหน่วยงานที่เคยทำ",
      "สอบถามงบประมาณจากต้นสังกัด + กำหนดการอนุมัติ",
    ],
  },
};

const TRP_META: Record<TRPPersona, { label: string; emoji: string; color: string; actions: string[] }> = {
  R1: {
    label: "R1 — ทัวร์ต่างชาติรายประจำ",
    emoji: "🌍",
    color: "from-blue-400 to-indigo-600",
    actions: [
      "เสนอสัญญาประจำ Annual Contract",
      "ยืนยันคนขับพูดภาษาอังกฤษได้",
      "Lock ราคาล่วงหน้า พร้อม SLA ตรงเวลา",
    ],
  },
  R2: {
    label: "R2 — บริษัททัวร์คู่ค้า",
    emoji: "🤝",
    color: "from-purple-400 to-violet-600",
    actions: [
      "ตอบ Quote ภายใน 30 นาที",
      "แจ้งรถว่างที่มี + ราคา Net",
      "สร้าง Relationship ระยะยาว Commission-based",
    ],
  },
  R3: {
    label: "R3 — หน่วยงานพาคณะ",
    emoji: "🏫",
    color: "from-green-400 to-emerald-600",
    actions: [
      "เตรียมใบเสนอราคาอย่างเป็นทางการ พร้อมตรา",
      "แนบสำเนาประกันภัย + มาตรฐานความปลอดภัย",
      "เริ่มติดต่อ 4–6 สัปดาห์ล่วงหน้า",
    ],
  },
  R4: {
    label: "R4 — ลูกค้าเช่าเองออนไลน์",
    emoji: "📱",
    color: "from-teal-400 to-cyan-600",
    actions: [
      "ส่งราคาชัดเจน พร้อมเงื่อนไขทันที",
      "ส่งลิงก์รีวิว Google Maps / Facebook",
      "ตอบเร็ว ภายใน 10–15 นาที",
    ],
  },
};

// ── Scoring inputs ────────────────────────────────────────────────────────────

export interface ScorerInputs {
  source:   Source;
  buType:   BUType;
  pax:      number;        // parsed integer
  budget:   string;        // e.g. "<30k"
  tourType: string;        // e.g. "ครอบครัว"
  company:  string;        // ถ้ามี → B2B signal
}

// ── Helper ────────────────────────────────────────────────────────────────────

function clampConfidence(raw: number, max: number): number {
  if (max === 0) return 0;
  return Math.round(Math.min(100, (raw / max) * 100));
}

function toScore(tag: string, score: number, meta: { label: string; emoji: string; color: string; actions: string[] }, dept: Department, reason: string): PersonaScore {
  return { tag, label: meta.label, score, confidence: 0, dept, emoji: meta.emoji, color: meta.color, actions: meta.actions, reason };
}

// ── Main Scorer ───────────────────────────────────────────────────────────────

export function scorePersona(inputs: ScorerInputs): PersonaMatchResult {
  const { source, buType, pax, budget, tourType, company } = inputs;
  const isTRP = buType === "เช่ารถ ท่องเที่ยว";
  const isTK  = buType === "จองตั๋วเครื่องบิน";
  const isOB  = !isTRP && !isTK;

  // ── Detect B2B for OB ─────────────────────────────────────────────────────
  const b2bSignals = [
    company.trim().length > 0,
    tourType === "องค์กร",
    pax >= 20,
    source === "Agent",
  ].filter(Boolean).length;
  const isB2B = isOB && b2bSignals >= 1;

  // ─────────────────────────────────────────────────────────────────────────
  // TRP Scoring
  // ─────────────────────────────────────────────────────────────────────────
  if (isTRP) {
    const s: Record<TRPPersona, number> = { R1: 0, R2: 0, R3: 0, R4: 0 };

    // Source signals
    if (source === "Agent")   { s.R1 += 10; s.R2 += 5; }
    if (source === "Referral") { s.R1 += 5; s.R2 += 6; s.R3 += 3; }
    if (source === "Google" || source === "FB" || source === "Website") { s.R4 += 8; }
    if (source === "TikTok") { s.R4 += 6; }
    if (source === "Line OA") { s.R2 += 4; s.R3 += 3; s.R4 += 4; }
    if (source === "Walk-in") { s.R4 += 5; }
    if (source === "Field Sale") { s.R1 += 3; s.R2 += 3; }

    // Pax signals
    if (pax >= 1 && pax <= 6)   { s.R4 += 7; s.R1 += 1; }
    if (pax >= 7 && pax <= 15)  { s.R4 += 7; s.R2 += 4; s.R3 += 3; }
    if (pax >= 16 && pax <= 30) { s.R2 += 8; s.R1 += 5; s.R3 += 5; }
    if (pax > 30)               { s.R1 += 8; s.R3 += 8; s.R2 += 5; }

    // Company signals
    if (company.trim().length > 0) { s.R1 += 5; s.R2 += 7; s.R3 += 3; }
    else                           { s.R4 += 5; }

    const reasonMap: Record<TRPPersona, string> = {
      R1: `Source: ${source} · ${pax} คน · มีชื่อบริษัท → คาดเป็นทัวร์ต่างชาติรายประจำ`,
      R2: `Source: ${source} · ${pax} คน → คาดเป็นบริษัททัวร์คู่ค้า`,
      R3: `Source: ${source} · ${pax} คน → คาดเป็นหน่วยงานพาคณะ`,
      R4: `Source: ${source} · ${pax} คน → คาดเป็นลูกค้าเช่าเองออนไลน์`,
    };

    const scores: PersonaScore[] = (Object.keys(s) as TRPPersona[]).map((tag) =>
      toScore(tag, s[tag], TRP_META[tag], "TRP", reasonMap[tag])
    );
    scores.sort((a, b) => b.score - a.score);
    const maxS = scores[0]?.score ?? 0;
    scores.forEach((sc, i) => {
      sc.confidence = clampConfidence(sc.score, maxS * 1.2);
      if (i === 0) sc.confidence = Math.max(sc.confidence, 45); // top always >= 45
    });

    return { dept: "TRP", isB2B: false, topMatch: scores[0] ?? null, allScores: scores, confidence: scores[0]?.confidence ?? 0 };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TK (no scoring yet)
  // ─────────────────────────────────────────────────────────────────────────
  if (isTK) {
    return { dept: "TK", isB2B: false, topMatch: null, allScores: [], confidence: 0 };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // OB B2B Scoring
  // ─────────────────────────────────────────────────────────────────────────
  if (isB2B) {
    const s: Record<OBB2BPersona, number> = { "Outing B2B": 0, "Seminar B2B": 0 };

    // Pax
    if (pax >= 15 && pax <= 50) { s["Outing B2B"] += 8; s["Seminar B2B"] += 3; }
    if (pax > 50)               { s["Outing B2B"] += 2; s["Seminar B2B"] += 8; }
    if (pax >= 10 && pax < 15)  { s["Outing B2B"] += 5; s["Seminar B2B"] += 1; }

    // Budget
    if (budget === "<30k")     { s["Outing B2B"] += 6; s["Seminar B2B"] += 2; }
    if (budget === "30k-50k")  { s["Outing B2B"] += 4; s["Seminar B2B"] += 5; }
    if (budget === "50k-80k")  { s["Outing B2B"] += 2; s["Seminar B2B"] += 6; }
    if (budget === "80k+")     { s["Outing B2B"] += 1; s["Seminar B2B"] += 5; }
    if (budget === "Luxury")   { s["Outing B2B"] += 1; s["Seminar B2B"] += 3; }

    // Tour type
    if (tourType === "องค์กร") { s["Outing B2B"] += 5; s["Seminar B2B"] += 5; }
    if (tourType === "VIP")    { s["Outing B2B"] += 2; s["Seminar B2B"] += 4; }

    // Source
    if (source === "Referral")   { s["Outing B2B"] += 4; s["Seminar B2B"] += 4; }
    if (source === "Agent")      { s["Seminar B2B"] += 3; }
    if (source === "Field Sale") { s["Outing B2B"] += 5; s["Seminar B2B"] += 4; }
    if (source === "Line OA")    { s["Outing B2B"] += 3; s["Seminar B2B"] += 2; }

    // Company name hints
    const compLow = company.toLowerCase();
    if (compLow.includes("มหาวิทยาลัย") || compLow.includes("วิทยาลัย") || compLow.includes("โรงเรียน")) {
      s["Seminar B2B"] += 8;
    }
    if (compLow.includes("ราชการ") || compLow.includes("กรม") || compLow.includes("สำนักงาน") || compLow.includes("เทศบาล")) {
      s["Seminar B2B"] += 8;
    }
    if (compLow.includes("บจก") || compLow.includes("บมจ") || compLow.includes("co.,") || compLow.includes("corp")) {
      s["Outing B2B"] += 5;
    }

    const scores: PersonaScore[] = (Object.keys(s) as OBB2BPersona[]).map((tag) => {
      const reason = tag === "Outing B2B"
        ? `${pax} คน · บริษัท "${company}" → น่าจะเป็น Outing/Team Building`
        : `${pax} คน · "${company}" → น่าจะเป็น Seminar/ดูงาน`;
      return toScore(tag, s[tag], OB_B2B_META[tag], "OB_B2B", reason);
    });
    scores.sort((a, b) => b.score - a.score);
    const maxS = scores[0]?.score ?? 0;
    scores.forEach((sc, i) => {
      sc.confidence = clampConfidence(sc.score, maxS * 1.2);
      if (i === 0) sc.confidence = Math.max(sc.confidence, 50);
    });

    return { dept: "OB_B2B", isB2B: true, topMatch: scores[0] ?? null, allScores: scores, confidence: scores[0]?.confidence ?? 0 };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // OB B2C Scoring
  // ─────────────────────────────────────────────────────────────────────────
  const s: Record<OBB2CPersona, number> = {
    "สายคุ้มค่า": 0, "สายธรรมชาติ": 0, "สายกิจกรรม": 0,
    "สายชิลล์พรีเมียม": 0, "สายหัวคณะ": 0, "สายมือใหม่": 0,
  };

  // ── Source ──
  switch (source) {
    case "TikTok":     s["สายกิจกรรม"] += 5; s["สายมือใหม่"] += 5; s["สายธรรมชาติ"] += 2; break;
    case "FB":         s["สายคุ้มค่า"] += 4; s["สายหัวคณะ"] += 4; s["สายธรรมชาติ"] += 2; break;
    case "Google":     s["สายมือใหม่"] += 5; s["สายคุ้มค่า"] += 3; s["สายกิจกรรม"] += 2; break;
    case "Line OA":    s["สายหัวคณะ"] += 5; s["สายชิลล์พรีเมียม"] += 3; s["สายคุ้มค่า"] += 2; break;
    case "Referral":   s["สายชิลล์พรีเมียม"] += 5; s["สายหัวคณะ"] += 5; s["สายคุ้มค่า"] += 2; break;
    case "Walk-in":    s["สายคุ้มค่า"] += 4; s["สายหัวคณะ"] += 3; s["สายมือใหม่"] += 2; break;
    case "Website":    s["สายมือใหม่"] += 4; s["สายธรรมชาติ"] += 3; s["สายกิจกรรม"] += 2; break;
    case "Field Sale": s["สายหัวคณะ"] += 4; s["สายชิลล์พรีเมียม"] += 3; s["สายคุ้มค่า"] += 2; break;
    default: break;
  }

  // ── Pax ──
  if (pax === 1)           { s["สายชิลล์พรีเมียม"] += 4; s["สายกิจกรรม"] += 3; s["สายมือใหม่"] += 3; }
  else if (pax === 2)      { s["สายชิลล์พรีเมียม"] += 3; s["สายธรรมชาติ"] += 3; s["สายกิจกรรม"] += 3; s["สายมือใหม่"] += 3; }
  else if (pax <= 5)       { s["สายคุ้มค่า"] += 3; s["สายธรรมชาติ"] += 3; s["สายกิจกรรม"] += 2; s["สายมือใหม่"] += 2; }
  else if (pax <= 10)      { s["สายคุ้มค่า"] += 4; s["สายหัวคณะ"] += 4; s["สายธรรมชาติ"] += 2; }
  else if (pax <= 19)      { s["สายหัวคณะ"] += 6; s["สายคุ้มค่า"] += 2; }
  else                     { s["สายหัวคณะ"] += 8; }

  // ── Budget ──
  switch (budget) {
    case "<30k":    s["สายมือใหม่"] += 6; s["สายคุ้มค่า"] += 5; s["สายกิจกรรม"] += 2; break;
    case "30k-50k": s["สายคุ้มค่า"] += 4; s["สายธรรมชาติ"] += 3; s["สายหัวคณะ"] += 3; s["สายกิจกรรม"] += 2; break;
    case "50k-80k": s["สายธรรมชาติ"] += 4; s["สายกิจกรรม"] += 3; s["สายชิลล์พรีเมียม"] += 3; s["สายหัวคณะ"] += 2; break;
    case "80k+":    s["สายชิลล์พรีเมียม"] += 7; s["สายหัวคณะ"] += 2; s["สายธรรมชาติ"] += 1; break;
    case "Luxury":  s["สายชิลล์พรีเมียม"] += 10; break;
    default: break;
  }

  // ── Tour Type ──
  switch (tourType) {
    case "ครอบครัว":  s["สายคุ้มค่า"] += 3; s["สายธรรมชาติ"] += 3; s["สายมือใหม่"] += 3; break;
    case "ผู้สูงอายุ": s["สายหัวคณะ"] += 9; s["สายชิลล์พรีเมียม"] += 2; break;
    case "เน้นกิน":   s["สายชิลล์พรีเมียม"] += 4; s["สายคุ้มค่า"] += 3; s["สายธรรมชาติ"] += 2; break;
    case "ถ่ายรูป":   s["สายกิจกรรม"] += 5; s["สายมือใหม่"] += 4; s["สายธรรมชาติ"] += 3; break;
    case "VIP":       s["สายชิลล์พรีเมียม"] += 9; s["สายหัวคณะ"] += 2; break;
    default: break;
  }

  const scores: PersonaScore[] = (Object.keys(s) as OBB2CPersona[]).map((tag) => {
    const meta = OB_B2C_META[tag];
    const reason = `Source: ${source} · ${pax} คน · งบ ${budget} · ${tourType}`;
    return toScore(tag, s[tag], meta, "OB_B2C", reason);
  });

  scores.sort((a, b) => b.score - a.score);
  const maxS = scores[0]?.score ?? 0;
  const secondS = scores[1]?.score ?? 0;

  scores.forEach((sc, i) => {
    sc.confidence = clampConfidence(sc.score, maxS * 1.3);
    if (i === 0) {
      // ถ้า gap ระหว่าง top กับ 2nd น้อย → confidence ต่ำ
      const gap = maxS - secondS;
      if (gap <= 2) sc.confidence = Math.min(sc.confidence, 55);
      else sc.confidence = Math.max(sc.confidence, 45);
    }
  });

  return { dept: "OB_B2C", isB2B: false, topMatch: scores[0] ?? null, allScores: scores.slice(0, 6), confidence: scores[0]?.confidence ?? 0 };
}
