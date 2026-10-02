/**
 * SurveyB2B.tsx — แบบสำรวจสำหรับลูกค้าองค์กร (B2B)
 *
 * Public page — ไม่ต้อง Login
 * Route: /survey/b2b
 *
 * คำถาม 4 ข้อตาม PRD:
 *   Q1: จุดประสงค์ (q1_purpose)
 *   Q2: บทบาท (q2_role)
 *   Q3: จำนวนคน (q3_size)
 *   Q4: ความท้าทาย (q4_challenge)
 */

import { useState, useEffect } from "react";
import { inferPersonaB2B, useSurveyStore, PERSONA_EMOJI, PERSONA_COLORS } from "@/store/surveyStore";
import type { B2BPersona } from "@/store/surveyStore";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TourItem {
  id: string;
  city: string;
  title?: string;
  country: string;
  duration: string;
  nextPeriod?: string;
}

// ─── Questions (ตาม PRD) ──────────────────────────────────────────────────────

const questions = [
  {
    id: 1,
    question: "จุดประสงค์หลักในการพาทีมออกทริปครั้งนี้คืออะไร?",
    emoji: "🎯",
    options: [
      { value: 1, label: "พักผ่อน / ท่องเที่ยว / Team Outing", emoji: "🏖️" },
      { value: 2, label: "สัมมนา / ดูงาน / ประชุมนอกสถานที่", emoji: "📋" },
    ],
  },
  {
    id: 2,
    question: "คุณมีบทบาทอะไรในการจัดทริปครั้งนี้?",
    emoji: "👔",
    options: [
      { value: 1, label: "HR / Admin / ฝ่ายบุคคล", emoji: "🗂️" },
      { value: 2, label: "เลขา / ฝ่ายจัดซื้อ / ธุรการ", emoji: "📌" },
      { value: 3, label: "ผู้บริหาร / Executive", emoji: "💼" },
    ],
  },
  {
    id: 3,
    question: "จำนวนผู้เดินทางประมาณเท่าไหร่?",
    emoji: "👥",
    options: [
      { value: 1, label: "10–20 คน", emoji: "🙋" },
      { value: 2, label: "21–50 คน", emoji: "👨‍👩‍👧" },
      { value: 3, label: "50 คนขึ้นไป", emoji: "🏟️" },
    ],
  },
  {
    id: 4,
    question: "ความท้าทายหลักในการจัดทริปขององค์กรคุณคืออะไร?",
    emoji: "⚡",
    options: [
      { value: 1, label: "คุมงบให้อยู่ในกรอบที่กำหนด", emoji: "💰" },
      { value: 2, label: "ทำยังไงให้พนักงานพึงพอใจทุกคน", emoji: "😊" },
      { value: 3, label: "ดูแล VIP หรือผู้บริหารระดับสูงเป็นพิเศษ", emoji: "⭐" },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function SurveyB2B() {
  const submitSurvey = useSurveyStore((s) => s.submitSurvey);

  const [answers, setAnswers]     = useState<Record<number, number>>({});
  const [current, setCurrent]     = useState(0);
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone]         = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [persona, setPersona]     = useState<B2BPersona | null>(null);
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
      }).filter((t) => t.nextPeriod);
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
    const tag = inferPersonaB2B(q1, q2, q3, q4);
    setPersona(tag);
    await submitSurvey({
      type: "b2b",
      persona_tag: tag,
      q1, q2, q3, q4,
      phone: phone.trim() || undefined,
      name: contactName.trim() ? `${contactName.trim()} (${companyName.trim()})` : companyName.trim() || undefined,
      source: new URLSearchParams(window.location.search).get("src") ?? undefined,
    });
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

    const personaDescriptions: Record<B2BPersona, string> = {
      "Outing B2B":  "ทริปพักผ่อน Team Outing จัดเต็ม สนุก บรรยากาศดี ทีมได้พักผ่อนจริง",
      "Seminar B2B": "แพ็คเกจสัมมนาครบวงจร ห้องประชุม อุปกรณ์ A/V สถานที่ดีงาม",
    };

    const personaServices: Record<B2BPersona, string[]> = {
      "Outing B2B":  ["กิจกรรม Team Building", "ทริปทะเล / ภูเขา", "งานเลี้ยง Dinner", "ทัวร์ต่างประเทศ"],
      "Seminar B2B": ["ห้องประชุมนอกสถานที่", "สัมมนาต่างประเทศ", "Study Tour", "Corporate Retreat"],
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 p-4 pb-12">
        <div className="max-w-sm mx-auto space-y-5 pt-6">
          {/* Persona card */}
          <div className="bg-white rounded-3xl shadow-xl p-8 text-center space-y-4">
            <div className="text-6xl">{emoji}</div>
            <h1 className="text-2xl font-bold text-gray-800">ขอบคุณ! 🎉</h1>
            <p className="text-gray-500 text-sm">ทริปที่ใช่สำหรับองค์กรของคุณคือ</p>
            <div className={`inline-block px-5 py-2 rounded-full text-base font-bold border ${colorClass}`}>
              {persona}
            </div>
            <p className="text-gray-500 text-sm leading-relaxed">
              {personaDescriptions[persona]}
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {personaServices[persona].map((s) => (
                <span key={s} className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                  {s}
                </span>
              ))}
            </div>
            <div className="space-y-3 pt-2">
              <a
                href="https://lin.ee/your-line-id"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-3 px-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold text-sm transition-colors"
              >
                💬 ติดต่อทีม Standard Tour
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
                      <span className="shrink-0 text-xs bg-teal-50 text-teal-600 font-medium px-2 py-1 rounded-lg">
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
                className="block w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold text-sm transition-colors text-center"
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
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white rounded-3xl shadow-xl p-8 space-y-5">
          <div className="text-center space-y-1">
            <div className="text-4xl">📝</div>
            <h2 className="text-xl font-bold text-gray-800">เกือบเสร็จแล้ว!</h2>
            <p className="text-sm text-gray-500">กรอกข้อมูลเพื่อให้ทีมงานติดต่อกลับ</p>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">
                ชื่อบริษัท / องค์กร <span className="text-gray-400">(ไม่บังคับ)</span>
              </label>
              <input
                type="text"
                placeholder="บริษัท ABC จำกัด"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">
                ชื่อผู้ติดต่อ <span className="text-gray-400">(ไม่บังคับ)</span>
              </label>
              <input
                type="text"
                placeholder="ชื่อ-นามสกุล"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">
                เบอร์โทรติดต่อ <span className="text-gray-400">(ไม่บังคับ)</span>
              </label>
              <input
                type="tel"
                placeholder="0812345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
              />
            </div>
          </div>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition-colors"
          >
            {saving ? "กำลังประมวลผล…" : "ดูแพ็คเกจที่เหมาะกับองค์กรของฉัน →"}
          </button>
        </div>
      </div>
    );
  }

  // ── Question cards ──────────────────────────────────────────────────────────
  const q = questions[current];

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-sm w-full space-y-5">
        {/* Header */}
        <div className="text-center space-y-1">
          <p className="text-xs text-teal-500 font-medium uppercase tracking-wide">
            Standard Tour — Corporate Travel
          </p>
          <h1 className="text-lg font-bold text-gray-800">ค้นหาแพ็คเกจที่ใช่สำหรับองค์กรของคุณ</h1>
        </div>

        {/* Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-400">
            <span>ข้อ {current + 1} / {totalQ}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-500 rounded-full transition-all duration-500"
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

          <div className="grid gap-2.5 grid-cols-1">
            {q.options.map((opt) => {
              const selected = answers[q.id] === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(current, opt.value)}
                  className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all duration-150 ${
                    selected
                      ? "border-teal-500 bg-teal-50 scale-[0.98]"
                      : "border-gray-100 bg-gray-50 hover:border-teal-300 hover:bg-teal-50/50 active:scale-[0.98]"
                  }`}
                >
                  <span className="text-xl shrink-0">{opt.emoji}</span>
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
