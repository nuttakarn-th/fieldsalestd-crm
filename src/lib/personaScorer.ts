/**
 * personaScorer.ts  — v2 (4+3 system)
 * ─────────────────────────────────────────────────────────────────────────────
 * OB B2C  : C1 ครอบครัว / C2a เพื่อนสายสนุก / C2b คู่รัก / C3 วัยเกษียณ
 * OB B2B  : B1 บริษัทเอกชน Incentive / B2 ราชการ-การศึกษา / B3 เอเจนซี่ & คู่ค้า
 * TRP     : R1 / R2 / R3 / R4  (ไม่เปลี่ยน)
 * Flag    : isFirstTime — overlay ทุก segment
 */

import type { Source, BUType } from "@/store/crmStore";

// ── Types ─────────────────────────────────────────────────────────────────────

export type OBB2CPersona = "C1" | "C2a" | "C2b" | "C3";
export type OBB2BPersona = "B1" | "B2" | "B3";
export type TRPPersona   = "R1" | "R2" | "R3" | "R4";
export type Department   = "OB_B2C" | "OB_B2B" | "TRP" | "TK" | "UNKNOWN";

export interface PersonaScore {
  tag:        string;
  label:      string;
  score:      number;
  confidence: number;   // 0–100
  dept:       Department;
  emoji:      string;
  color:      string;   // tailwind gradient
  actions:    string[];
  reason:     string;
}

export interface PersonaMatchResult {
  dept:        Department;
  isB2B:       boolean;
  isFirstTime: boolean;
  topMatch:    PersonaScore | null;
  allScores:   PersonaScore[];
  confidence:  number;
}

// ── Persona metadata ──────────────────────────────────────────────────────────

const OB_B2C_META: Record<OBB2CPersona, { tag: string; label: string; emoji: string; color: string; actions: string[] }> = {
  C1: {
    tag: "C1",
    label: "C1 — ครอบครัวไทยใจกว้าง",
    emoji: "👨‍👩‍👧‍👦",
    color: "from-orange-400 to-amber-500",
    actions: [
      "เสนอโปรแกรม Series ที่เหมาะครอบครัว (พ่อ-แม่-ลูก)",
      "ระบุ Highlight ที่เด็กสนุก ผู้ใหญ่ชอบ",
      "แนะนำช่วงปิดเทอม มี.ค. / ต.ค. / ส.ค.",
    ],
  },
  C2a: {
    tag: "C2a",
    label: "C2a — เพื่อนสายสนุก/กิจกรรม",
    emoji: "🎯",
    color: "from-pink-400 to-rose-500",
    actions: [
      "ส่ง Highlight กิจกรรม / Photo Spots ยอดนิยม",
      "เน้น Content สั้น TikTok-style ภาพสวย",
      "เสนอ Join Tour ราคาดี ไม่ต้องรอกรุ๊ป",
    ],
  },
  C2b: {
    tag: "C2b",
    label: "C2b — คู่รัก/ทริปส่วนตัว",
    emoji: "💑",
    color: "from-purple-400 to-violet-600",
    actions: [
      "เสนอโปรแกรม Private / Semi-Private ไม่ปะปนกลุ่ม",
      "ระบุที่พัก Romantic / บรรยากาศดี",
      "ส่ง Proposal หน้าตาสวยงาม พร้อม add-on พิเศษ",
    ],
  },
  C3: {
    tag: "C3",
    label: "C3 — วัยเกษียณใจสู้",
    emoji: "🌸",
    color: "from-rose-400 to-red-500",
    actions: [
      "เน้น Pace ช้า ไม่เร่งรีบ โรงแรมดี อาหารถูกปาก",
      "ระบุข้อมูลการเดินทางสะดวก (รถ AC ตลอด)",
      "ติดต่อ Line เป็นหลัก ใช้ภาษาเป็นกันเอง",
    ],
  },
};

const OB_B2B_META: Record<OBB2BPersona, { tag: string; label: string; emoji: string; color: string; actions: string[] }> = {
  B1: {
    tag: "B1",
    label: "B1 — บริษัทเอกชน Incentive",
    emoji: "🏆",
    color: "from-emerald-500 to-green-600",
    actions: [
      "เตรียม Proposal แพ็คเกจ Outing + ราคา per head",
      "เสนอ Activity Team Building เพิ่ม",
      "นัด Present ผ่าน Line หรือพบตัวที่บริษัท",
    ],
  },
  B2: {
    tag: "B2",
    label: "B2 — ราชการ / การศึกษา",
    emoji: "🎓",
    color: "from-sky-500 to-blue-600",
    actions: [
      "เตรียมใบเสนอราคาอย่างเป็นทางการ พร้อมตรา",
      "แนบหนังสือค้ำประกัน + ประกันภัย",
      "ติดต่อล่วงหน้า 4–6 สัปดาห์ก่อนกำหนดการ",
    ],
  },
  B3: {
    tag: "B3",
    label: "B3 — เอเจนซี่ & คู่ค้า",
    emoji: "🤝",
    color: "from-amber-500 to-yellow-600",
    actions: [
      "ตอบ Quote ภายใน 30 นาที พร้อมราคา Net",
      "แจ้งรถว่าง + Availability ล่วงหน้า",
      "สร้าง Relationship ระยะยาว Repeat Business",
    ],
  },
};

const TRP_META: Record<TRPPersona, { tag: string; label: string; emoji: string; color: string; actions: string[] }> = {
  R1: {
    tag: "R1",
    label: "R1 — ทัวร์ต่างชาติรายประจำ",
    emoji: "🌍",
    color: "from-blue-400 to-indigo-600",
    actions: [
      "เสนอสัญญา Annual Contract",
      "ยืนยันคนขับพูดภาษาอังกฤษได้",
      "Lock ราคาล่วงหน้า พร้อม SLA ตรงเวลา",
    ],
  },
  R2: {
    tag: "R2",
    label: "R2 — บริษัททัวร์คู่ค้า",
    emoji: "🤝",
    color: "from-purple-400 to-violet-600",
    actions: [
      "ตอบ Quote ภายใน 30 นาที",
      "แจ้งรถว่าง + ราคา Net",
      "สร้าง Relationship ระยะยาว Commission-based",
    ],
  },
  R3: {
    tag: "R3",
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
    tag: "R4",
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function clampConf(score: number, maxScore: number): number {
  if (maxScore === 0) return 0;
  return Math.round(Math.min(100, (score / (maxScore * 1.25)) * 100));
}

function toScore<T extends string>(
  tag: T,
  score: number,
  meta: { tag: string; label: string; emoji: string; color: string; actions: string[] },
  dept: Department,
  reason: string
): PersonaScore {
  return { tag, label: meta.label, score, confidence: 0, dept, emoji: meta.emoji, color: meta.color, actions: meta.actions, reason };
}

// ── Inputs ────────────────────────────────────────────────────────────────────

export interface ScorerInputs {
  source:      Source;
  buType:      BUType;
  pax:         number;
  budget:      string;
  tourType:    string;
  company:     string;
  isFirstTime: boolean;
}

// ── Main scorer ───────────────────────────────────────────────────────────────

export function scorePersona(inputs: ScorerInputs): PersonaMatchResult {
  const { source, buType, pax, budget, tourType, company, isFirstTime } = inputs;

  const isTRP = buType === "เช่ารถ ท่องเที่ยว";
  const isTK  = buType === "จองตั๋วเครื่องบิน";
  const isOB  = !isTRP && !isTK;

  // B2B detection
  const compLow = company.toLowerCase().trim();
  const b2bSignals = [
    compLow.length > 0,
    tourType === "องค์กร",
    pax >= 20,
    source === "Agent",
  ].filter(Boolean).length;
  const isB2B = isOB && b2bSignals >= 1;

  // ─── TRP ──────────────────────────────────────────────────────────────────
  if (isTRP) {
    const s: Record<TRPPersona, number> = { R1: 0, R2: 0, R3: 0, R4: 0 };

    if (source === "Agent")    { s.R1 += 10; s.R2 += 5; }
    if (source === "Referral") { s.R1 += 5;  s.R2 += 6; s.R3 += 3; }
    if (source === "Google" || source === "Website") { s.R4 += 8; }
    if (source === "TikTok")   { s.R4 += 6; }
    if (source === "Line OA")  { s.R2 += 4;  s.R3 += 3; s.R4 += 4; }
    if (source === "Walk-in")  { s.R4 += 5; }
    if (source === "Field Sale") { s.R1 += 3; s.R2 += 3; }
    if (source === "FB")       { s.R4 += 5; }

    if (pax <= 6)              { s.R4 += 7; s.R1 += 1; }
    else if (pax <= 15)        { s.R4 += 5; s.R2 += 4; s.R3 += 3; }
    else if (pax <= 30)        { s.R2 += 8; s.R1 += 5; s.R3 += 5; }
    else                       { s.R1 += 8; s.R3 += 8; s.R2 += 5; }

    if (compLow.length > 0)    { s.R1 += 5; s.R2 += 7; s.R3 += 3; }
    else                       { s.R4 += 5; }

    const scores = (Object.keys(s) as TRPPersona[])
      .map((tag) => toScore(tag, s[tag], TRP_META[tag], "TRP",
        `Source: ${source} · ${pax} คน${compLow ? ` · "${company}"` : ""}`))
      .sort((a, b) => b.score - a.score);

    const maxS = scores[0]?.score ?? 0;
    scores.forEach((sc, i) => {
      sc.confidence = clampConf(sc.score, maxS);
      if (i === 0) sc.confidence = Math.max(sc.confidence, 45);
    });

    return { dept: "TRP", isB2B: false, isFirstTime, topMatch: scores[0] ?? null, allScores: scores, confidence: scores[0]?.confidence ?? 0 };
  }

  // ─── TK ───────────────────────────────────────────────────────────────────
  if (isTK) {
    return { dept: "TK", isB2B: false, isFirstTime, topMatch: null, allScores: [], confidence: 0 };
  }

  // ─── OB B2B ───────────────────────────────────────────────────────────────
  if (isB2B) {
    const s: Record<OBB2BPersona, number> = { B1: 0, B2: 0, B3: 0 };

    // Source
    if (source === "Agent")      { s.B3 += 10; s.B1 += 2; }
    if (source === "Referral")   { s.B1 += 5;  s.B2 += 5; s.B3 += 3; }
    if (source === "Field Sale") { s.B1 += 5;  s.B2 += 4; }
    if (source === "Line OA")    { s.B1 += 3;  s.B3 += 3; }

    // Pax
    if (pax >= 15 && pax <= 60)  { s.B1 += 7; s.B2 += 4; }
    if (pax > 60)                { s.B2 += 7; s.B1 += 3; }
    if (pax >= 10 && pax < 15)  { s.B1 += 4; s.B3 += 3; }
    if (pax < 10 && compLow.length > 0) { s.B3 += 6; }

    // Budget
    if (budget === "<30k" || budget === "30k-50k") { s.B3 += 4; s.B1 += 2; }
    if (budget === "50k-80k")    { s.B1 += 5; s.B2 += 4; }
    if (budget === "80k+" || budget === "Luxury") { s.B1 += 5; }

    // Company name hints
    if (compLow.includes("มหาวิทยาลัย") || compLow.includes("วิทยาลัย") ||
        compLow.includes("โรงเรียน") || compLow.includes("school")) {
      s.B2 += 10;
    }
    if (compLow.includes("ราชการ") || compLow.includes("กรม") ||
        compLow.includes("สำนักงาน") || compLow.includes("เทศบาล") ||
        compLow.includes("กระทรวง") || compLow.includes("องค์การ")) {
      s.B2 += 10;
    }
    if (compLow.includes("ทัวร์") || compLow.includes("tour") ||
        compLow.includes("travel") || compLow.includes("ท่องเที่ยว") ||
        compLow.includes("agency") || compLow.includes("เอเจนซี")) {
      s.B3 += 10;
    }
    if (compLow.includes("บจก") || compLow.includes("บมจ") ||
        compLow.includes("co.,") || compLow.includes("corp") ||
        compLow.includes("จำกัด")) {
      s.B1 += 5;
    }

    // Tour type
    if (tourType === "องค์กร") { s.B1 += 5; s.B2 += 3; }
    if (tourType === "VIP")    { s.B1 += 3; }

    const scores = (Object.keys(s) as OBB2BPersona[])
      .map((tag) => toScore(tag, s[tag], OB_B2B_META[tag], "OB_B2B",
        `${pax} คน · "${company}" · Source: ${source}`))
      .sort((a, b) => b.score - a.score);

    const maxS = scores[0]?.score ?? 0;
    scores.forEach((sc, i) => {
      sc.confidence = clampConf(sc.score, maxS);
      if (i === 0) sc.confidence = Math.max(sc.confidence, 50);
    });

    return { dept: "OB_B2B", isB2B: true, isFirstTime, topMatch: scores[0] ?? null, allScores: scores, confidence: scores[0]?.confidence ?? 0 };
  }

  // ─── OB B2C ───────────────────────────────────────────────────────────────
  const s: Record<OBB2CPersona, number> = { C1: 0, C2a: 0, C2b: 0, C3: 0 };

  // ── Source ──
  switch (source) {
    case "FB":         { s.C1 += 5; s.C3 += 4; s.C2a += 2; break; }
    case "Line OA":    { s.C3 += 6; s.C1 += 4; s.C2b += 2; break; }
    case "TikTok":     { s.C2a += 8; s.C2b += 3; break; }
    case "Google":     { s.C2a += 4; s.C2b += 4; s.C1 += 2; break; }
    case "Website":    { s.C2b += 5; s.C2a += 3; s.C1 += 2; break; }
    case "Referral":   { s.C3 += 5; s.C1 += 4; s.C2b += 4; break; }
    case "Walk-in":    { s.C1 += 4; s.C3 += 4; s.C2a += 2; break; }
    case "Field Sale": { s.C3 += 5; s.C1 += 3; break; }
    default: break;
  }

  // ── Pax — strongest signal ──
  if (pax === 1)           { s.C2b += 8; s.C2a += 3; }
  else if (pax === 2)      { s.C2b += 10; s.C2a += 3; }
  else if (pax === 3)      { s.C2a += 6; s.C2b += 4; s.C1 += 3; }
  else if (pax <= 5)       { s.C1 += 6; s.C2a += 5; }
  else if (pax <= 10)      { s.C1 += 7; s.C3 += 4; s.C2a += 3; }
  else if (pax <= 19)      { s.C3 += 7; s.C1 += 5; }
  else                     { s.C3 += 9; s.C1 += 4; }

  // ── Budget ──
  switch (budget) {
    case "<30k":    { s.C2a += 5; s.C1 += 3; break; }
    case "30k-50k": { s.C1 += 5; s.C2a += 4; s.C3 += 3; break; }
    case "50k-80k": { s.C2b += 5; s.C1 += 3; s.C3 += 4; break; }
    case "80k+":    { s.C2b += 7; s.C3 += 3; break; }
    case "Luxury":  { s.C2b += 10; break; }
    default: break;
  }

  // ── Tour type ──
  switch (tourType) {
    case "ครอบครัว":  { s.C1 += 10; break; }
    case "ผู้สูงอายุ": { s.C3 += 12; break; }
    case "เน้นกิน":   { s.C2b += 4; s.C2a += 3; s.C3 += 2; break; }
    case "ถ่ายรูป":   { s.C2a += 8; s.C2b += 3; break; }
    case "VIP":       { s.C2b += 8; s.C3 += 3; break; }
    default: break;
  }

  const scores = (Object.keys(s) as OBB2CPersona[])
    .map((tag) => toScore(tag, s[tag], OB_B2C_META[tag], "OB_B2C",
      `Source: ${source} · ${pax} คน · งบ ${budget} · ${tourType || "—"}`))
    .sort((a, b) => b.score - a.score);

  const maxS   = scores[0]?.score ?? 0;
  const gap    = (scores[0]?.score ?? 0) - (scores[1]?.score ?? 0);

  scores.forEach((sc, i) => {
    sc.confidence = clampConf(sc.score, maxS);
    if (i === 0) {
      if (gap <= 2) sc.confidence = Math.min(sc.confidence, 52);
      else          sc.confidence = Math.max(sc.confidence, 45);
    }
  });

  return { dept: "OB_B2C", isB2B: false, isFirstTime, topMatch: scores[0] ?? null, allScores: scores, confidence: scores[0]?.confidence ?? 0 };
}
