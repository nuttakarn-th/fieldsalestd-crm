/**
 * SurveyB2C.tsx — แบบสำรวจพฤติกรรมการท่องเที่ยวต่างประเทศ (B2C)
 *
 * Public page — ไม่ต้อง Login
 * Route: /survey/b2c
 *
 * คำถาม 4 ข้อตาม PRD:
 *   Q1: สไตล์การเที่ยว (q1_style)
 *   Q2: ผู้ร่วมเดินทาง (q2_companion)
 *   Q3: งบประมาณ (q3_budget)
 *   Q4: ช่วงอายุ (q4_age)
 */

import { useState, useEffect } from "react";
import { inferPersonaB2C, ageGroupFromQ4, useSurveyStore, PERSONA_EMOJI, PERSONA_COLORS } from "@/store/surveyStore";
import type { B2CPersona } from "@/store/surveyStore";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TourItem {
  id: string;
  city: string;
  title?: string;
  country: string;
  duration: string;
  nextPeriod?: string; // ISO date
}

// ─── Questions (ตาม PRD) ──────────────────────────────────────────────────────

const questions = [
  {
    id: 1,
    question: "สไตล์การเที่ยวต่างประเทศแบบไหนที่เป็นตัวคุณที่สุด?",
    emoji: "✈️",
    options: [
      { value: 1, label: "ชอบแพ็กเกจทัวร์ที่จัดให้ครบ คุ้มค่า มีไกด์ดูแลตลอดทริป", emoji: "🗺️" },
      { value: 2, label: "เน้นลุยชมธรรมชาติสวยๆ เดินเยอะได้", emoji: "🌿" },
      { value: 3, label: "ไปเพื่อทำกิจกรรมที่อินเป็นพิเศษ (วิ่งเทรล / ชิมคาเฟ่ดัง)", emoji: "⚡" },
      { value: 4, label: "เน้นพักผ่อน ตารางหลวมๆ นอนโรงแรมดี ชิล", emoji: "🛋️" },
    ],
  },
  {
    id: 2,
    question: "ทริปหน้า เล็งไว้ว่าจะไปกับใคร?",
    emoji: "👥",
    options: [
      { value: 1, label: "ไปคนเดียวลุยๆ", emoji: "🧍" },
      { value: 2, label: "ไปกับแก๊งเพื่อน / แฟน", emoji: "👫" },
      { value: 3, label: "พาครอบครัว (มีเด็กหรือผู้ใหญ่) ไปด้วย", emoji: "👨‍👩‍👧‍👦" },
    ],
  },
  {
    id: 3,
    question: "งบประมาณต่อคน/ทริป ที่รู้สึกว่า 'จ่ายแล้วแฮปปี้ คุ้มค่า'?",
    emoji: "💰",
    options: [
      { value: 1, label: "เน้นประหยัด", emoji: "🪙" },
      { value: 2, label: "จ่ายราคามาตรฐาน ขอให้สมกับประสบการณ์", emoji: "💳" },
      { value: 3, label: "สายเปย์ เน้นความสะดวกสบาย พรีเมียมเป็นหลัก", emoji: "💎" },
    ],
  },
  {
    id: 4,
    question: "ขอทราบช่วงอายุของคุณสักนิด (เพื่อปรับสปีดการเดินทัวร์ให้พอดี!)",
    emoji: "🎂",
    options: [
      { value: 1, label: "20–25 ปี", emoji: "🌟" },
      { value: 2, label: "26–35 ปี", emoji: "⭐" },
      { value: 3, label: "36–45 ปี", emoji: "✨" },
      { value: 4, label: "46–55 ปี", emoji: "🌠" },
      { value: 5, label: "56 ปีขึ้นไป", emoji: "☀️" },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function SurveyB2C() {
  const submitSurvey = useSurveyStore((s) => s.submitSurvey);

  const [answers, setAnswers]     = useState<Record<number, number>>({});
  const [current, setCurrent]     = useState(0);
  const [phone, setPhone]             = useState("");
  const [name, setName]               = useState("");
  const [sourceChannel, setSourceChannel] = useState("");
  const [travelExp, setTravelExp]     = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [persona, setPersona]     = useState<B2CPersona | null>(null);
  const [saving, setSaving]       = useState(false);
  const [tours, setTours]         = useState<TourItem[]>([]);

  const totalQ = questions.length;
  const progress = Math.round((current / totalQ) * 100);

  // โหลดทัวร์ที่เปิดบริการอยู่
  useEffect(() => {
    async function loadTours() {
      const { data } = await supabase
        .from("tours")
        .select("id, city, title, country, duration, periods")
        .eq("is_published", true)
        .eq("archived", false)
        .order("updated_at", { ascending: false })
        .limit(6);
      if (!data) return;
      const items: TourItem[] = data.map((t: any) => {
        // หา period ที่ใกล้สุดในอนาคต
        const futurePeriods = (t.periods ?? [])
          .filter((p: any) => !p.cancelled && p.start_date && new Date(p.start_date) >= new Date())
          .sort((a: any, b: any) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
        return {
          id: t.id,
          city: t.city,
          title: t.title,
          country: t.country,
          duration: t.duration,
          nextPeriod: futurePeriods[0]?.start_date,
        };
      }).filter((t) => t.nextPeriod); // แสดงเฉพาะที่มี period ข้างหน้า
      setTours(items);
    }
    loadTours();
  }, []);

  function handleSelect(qIndex: number, value: number) {
    const updated = { ...answers, [qIndex + 1]: value };
    setAnswers(updated);
    if (qIndex < totalQ - 1) {
      setTimeout(() => setCurrent(qIndex + 1), 280);
    } else {
      setCurrent(totalQ);
    }
  }

  async function handleSubmit() {
    const { 1: q1, 2: q2, 3: q3, 4: q4 } = answers;
    if (!q1 || !q2 || !q3 || !q4) return;
    setSaving(true);
    const tag = inferPersonaB2C(q1, q2, q3, q4);
    const ageGroup = ageGroupFromQ4(q4);
    setPersona(tag);
    await submitSurvey({
      type: "b2c",
      persona_tag: tag,
      q1, q2, q3, q4,
      phone: phone.trim() || undefined,
      name: name.trim() || undefined,
      source: new URLSearchParams(window.location.search).get("src") ?? undefined,
      source_channel: sourceChannel || undefined,
      travel_experience: travelExp || undefined,
    });
    // บันทึก age_group ถ้ามีเบอร์โทร (จะ match กับ customer)
    if (phone.trim()) {
      supabase.from("customers").update({ age_group: ageGroup }).eq("phone", phone.trim()).then(() => {});
    }
    setSaving(false);
    setSubmitted(true);
  }

  function formatPeriodDate(iso: string) {
    return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
  }

  // ── Thank You page ──────────────────────────────────────────────────────────
  if (submitted && persona) {
    const emoji = PERSONA_EMOJI[persona];
    const colorClass = PERSONA_COLORS[persona];
    const personaDescriptions: Record<B2CPersona, string> = {
      "สายคุ้มค่า":       "ทัวร์เส้นทางยอดฮิต เก็บแลนด์มาร์คครบ คุ้มทุกบาท",
      "สายธรรมชาติ":      "ลุยชมวิว อุทยาน เมืองโบราณ เดินเท้าชมธรรมชาติ",
      "สายกิจกรรม":       "ทริปธีมชัดเจน วิ่งเทรล / คาเฟ่ทัวร์ / กิจกรรมเฉพาะทาง",
      "สายชิลล์พรีเมียม": "Slow Travel โรงแรม 4-5 ดาว ตารางหลวม มีเวลาอิสระ",
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4 pb-12">
        <div className="max-w-sm mx-auto space-y-5 pt-6">
          {/* Persona card */}
          <div className="bg-white rounded-3xl shadow-xl p-8 text-center space-y-4">
            <div className="text-6xl">{emoji}</div>
            <h1 className="text-2xl font-bold text-gray-800">ขอบคุณ! 🎉</h1>
            <p className="text-gray-500 text-sm">คุณคือ</p>
            <div className={`inline-block px-5 py-2 rounded-full text-base font-bold border ${colorClass}`}>
              {persona}
            </div>
            <p className="text-gray-500 text-sm leading-relaxed">
              {personaDescriptions[persona]}
            </p>
            <div className="space-y-3 pt-2">
              <a
                href="https://lin.ee/your-line-id"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-3 px-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold text-sm transition-colors"
              >
                💬 คุยกับเราที่ LINE
              </a>
            </div>
          </div>

          {/* Tour programs */}
          {tours.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-gray-700 px-1">
                🗓️ โปรแกรมทัวร์ที่เปิดให้บริการอยู่ตอนนี้
              </h2>
              {tours.map((t) => (
                <a
                  key={t.id}
                  href={`https://standardtour-hub.vercel.app/tour-packages?pkg=tour_${t.id}&preview=1`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-800 leading-tight">
                        {t.title || t.city}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {t.country} · {t.duration}
                      </p>
                    </div>
                    {t.nextPeriod && (
                      <span className="shrink-0 text-xs bg-indigo-50 text-indigo-600 font-medium px-2 py-1 rounded-lg">
                        {formatPeriodDate(t.nextPeriod)}
                      </span>
                    )}
                  </div>
                </a>
              ))}
              <a
                href="https://standardtour-hub.vercel.app/tour-packages"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition-colors text-center"
              >
                🗺️ ดูโปรแกรมทัวร์ทั้งหมด
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Contact form ────────────────────────────────────────────────────────────
  if (current === totalQ) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white rounded-3xl shadow-xl p-8 space-y-5">
          <div className="text-center space-y-1">
            <div className="text-4xl">📝</div>
            <h2 className="text-xl font-bold text-gray-800">เกือบเสร็จแล้ว!</h2>
            <p className="text-sm text-gray-500">กรอกข้อมูลเพื่อรับโปรแกรมที่ใช่สำหรับคุณ</p>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">
                ชื่อ <span className="text-gray-400">(ไม่บังคับ)</span>
              </label>
              <input
                type="text"
                placeholder="ชื่อของคุณ"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">
                เบอร์โทร <span className="text-gray-400">(ไม่บังคับ)</span>
              </label>
              <input
                type="tel"
                placeholder="0812345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>

            {/* ── คำถามเพิ่มเติม ── */}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">
                รู้จัก Standard Tour จากที่ไหน? <span className="text-gray-400">(ไม่บังคับ)</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {["Facebook", "Instagram", "TikTok", "เพื่อนแนะนำ", "Google", "อื่นๆ"].map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setSourceChannel(sourceChannel === ch ? "" : ch)}
                    className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all ${
                      sourceChannel === ch
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-gray-200 bg-gray-50 text-gray-600 hover:border-indigo-300"
                    }`}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">
                เคยเดินทางต่างประเทศมาแล้วกี่ครั้ง? <span className="text-gray-400">(ไม่บังคับ)</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: "ครั้งแรกเลย 🌟", value: "first_time" },
                  { label: "1–3 ครั้ง ✈️", value: "1-3_times" },
                  { label: "4+ ครั้ง 🧳", value: "4_plus_times" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTravelExp(travelExp === opt.value ? "" : opt.value)}
                    className={`py-2 px-2 rounded-xl text-xs font-medium border transition-all text-center ${
                      travelExp === opt.value
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-gray-200 bg-gray-50 text-gray-600 hover:border-indigo-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition-colors"
          >
            {saving ? "กำลังประมวลผล…" : "ดูผลลัพธ์ Persona ของฉัน →"}
          </button>
        </div>
      </div>
    );
  }

  // ── Question cards ──────────────────────────────────────────────────────────
  const q = questions[current];
  const isGrid = q.options.length <= 4;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-sm w-full space-y-5">
        {/* Header */}
        <div className="text-center space-y-1">
          <p className="text-xs text-indigo-400 font-medium uppercase tracking-wide">
            Standard Tour — ค้นหา Persona ของคุณ
          </p>
          <h1 className="text-lg font-bold text-gray-800">คุณเป็นนักท่องเที่ยวแบบไหน?</h1>
        </div>

        {/* Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-400">
            <span>ข้อ {current + 1} / {totalQ}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question card */}
        <div className="bg-white rounded-3xl shadow-lg p-6 space-y-4">
          <div className="text-center space-y-1">
            <div className="text-3xl">{q.emoji}</div>
            <h2 className="text-sm font-semibold text-gray-800 leading-snug">
              {q.question}
            </h2>
          </div>

          <div className={`grid gap-2.5 ${isGrid && q.options.length === 4 ? "grid-cols-2" : "grid-cols-1"}`}>
            {q.options.map((opt) => {
              const selected = answers[q.id] === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(current, opt.value)}
                  className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-all duration-150 ${
                    isGrid && q.options.length === 4
                      ? "flex-col items-center text-center"
                      : ""
                  } ${
                    selected
                      ? "border-indigo-500 bg-indigo-50 scale-[0.98]"
                      : "border-gray-100 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/50 active:scale-[0.98]"
                  }`}
                >
                  <span className={isGrid && q.options.length === 4 ? "text-2xl" : "text-xl shrink-0"}>
                    {opt.emoji}
                  </span>
                  <span className="text-xs font-medium text-gray-700 leading-tight">
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between text-xs text-gray-400 px-1">
          <button
            type="button"
            onClick={() => current > 0 && setCurrent(current - 1)}
            className={current === 0 ? "invisible" : "hover:text-gray-600"}
          >
            ← ย้อนกลับ
          </button>
          <button
            type="button"
            onClick={() => handleSelect(current, answers[q.id] ?? 1)}
            className="hover:text-gray-600"
          >
            ข้ามข้อนี้ →
          </button>
        </div>
      </div>
    </div>
  );
}
