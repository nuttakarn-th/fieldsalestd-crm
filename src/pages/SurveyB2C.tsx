/**
 * SurveyB2C.tsx — หน้าแบบสอบถาม Persona สำหรับลูกค้า B2C
 *
 * Public page — ไม่ต้อง login
 * Route: /survey/b2c
 *
 * UX: Card-tap เลือกคำตอบทีละข้อ → เลื่อนไปข้อถัดไปอัตโนมัติ
 * เวลา: ~30 วินาที (4 คำถาม)
 */

import { useState } from "react";
import { inferPersonaB2C, useSurveyStore, PERSONA_EMOJI, PERSONA_COLORS } from "@/store/surveyStore";
import type { B2CPersona } from "@/store/surveyStore";

// ─── Questions ────────────────────────────────────────────────────────────────

const questions = [
  {
    id: 1,
    question: "งบประมาณท่องเที่ยวต่อคนของคุณ?",
    emoji: "💵",
    options: [
      { value: 1, label: "น้อยกว่า 5,000 บาท", emoji: "🪙" },
      { value: 2, label: "5,000 – 10,000 บาท", emoji: "💳" },
      { value: 3, label: "10,000 – 20,000 บาท", emoji: "💰" },
      { value: 4, label: "มากกว่า 20,000 บาท", emoji: "💎" },
    ],
  },
  {
    id: 2,
    question: "คุณชอบทริปแบบไหนมากที่สุด?",
    emoji: "✈️",
    options: [
      { value: 1, label: "จัดเต็ม มีไกด์ ดูแลทุกอย่าง", emoji: "🗺️" },
      { value: 2, label: "ธรรมชาติ วิว ผ่อนคลาย", emoji: "🌿" },
      { value: 3, label: "กิจกรรม ผจญภัย ท้าทาย", emoji: "⚡" },
      { value: 4, label: "หรูหรา สะดวกสบาย ชิลล์", emoji: "🛋️" },
    ],
  },
  {
    id: 3,
    question: "มักเดินทางกับใคร?",
    emoji: "👥",
    options: [
      { value: 1, label: "คนเดียว / Solo", emoji: "🧍" },
      { value: 2, label: "คู่ / เพื่อนสนิท", emoji: "👫" },
      { value: 3, label: "ครอบครัว", emoji: "👨‍👩‍👧‍👦" },
      { value: 4, label: "กลุ่มใหญ่ / ทีม", emoji: "🎉" },
    ],
  },
  {
    id: 4,
    question: "สิ่งสำคัญที่สุดในการเลือกทัวร์?",
    emoji: "⭐",
    options: [
      { value: 1, label: "ราคาคุ้มค่า", emoji: "🏷️" },
      { value: 2, label: "สถานที่ / เส้นทาง", emoji: "📍" },
      { value: 3, label: "กิจกรรม / ประสบการณ์", emoji: "🎯" },
      { value: 4, label: "ความสะดวก / บริการ", emoji: "🌟" },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function SurveyB2C() {
  const submitSurvey = useSurveyStore((s) => s.submitSurvey);

  const [answers, setAnswers]     = useState<Record<number, number>>({});
  const [current, setCurrent]     = useState(0);       // 0-based question index
  const [phone, setPhone]         = useState("");
  const [name, setName]           = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [persona, setPersona]     = useState<B2CPersona | null>(null);
  const [saving, setSaving]       = useState(false);

  const totalQ = questions.length;
  const progress = Math.round(((current) / totalQ) * 100);

  // เลือกคำตอบ → เลื่อนข้อถัดไป
  function handleSelect(qIndex: number, value: number) {
    const updated = { ...answers, [qIndex + 1]: value };
    setAnswers(updated);

    if (qIndex < totalQ - 1) {
      setTimeout(() => setCurrent(qIndex + 1), 300);
    } else {
      // ทุกข้อตอบครบ → แสดง contact form
      setCurrent(totalQ);
    }
  }

  async function handleSubmit() {
    const { 1: q1, 2: q2, 3: q3, 4: q4 } = answers;
    if (!q1 || !q2 || !q3 || !q4) return;
    setSaving(true);

    const tag = inferPersonaB2C(q1, q2, q3, q4);
    setPersona(tag);

    await submitSurvey({
      type: "b2c",
      persona_tag: tag,
      q1, q2, q3, q4,
      phone: phone.trim() || undefined,
      name: name.trim() || undefined,
      source: new URLSearchParams(window.location.search).get("src") ?? undefined,
    });

    setSaving(false);
    setSubmitted(true);
  }

  // ── Thank You page ──────────────────────────────────────────────────────────
  if (submitted && persona) {
    const emoji = PERSONA_EMOJI[persona];
    const colorClass = PERSONA_COLORS[persona];
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white rounded-3xl shadow-xl p-8 text-center space-y-5">
          <div className="text-6xl">{emoji}</div>
          <h1 className="text-2xl font-bold text-gray-800">ขอบคุณ! 🎉</h1>
          <p className="text-gray-500 text-sm">คุณคือ</p>
          <div className={`inline-block px-5 py-2 rounded-full text-lg font-bold border ${colorClass}`}>
            {persona}
          </div>
          <p className="text-gray-500 text-sm leading-relaxed">
            ทีมงานจะนำเสนอโปรแกรมทัวร์ที่เหมาะกับคุณโดยเฉพาะ
          </p>

          <div className="pt-2 space-y-3">
            <a
              href="https://lin.ee/your-line-id"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3 px-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold text-sm transition-colors"
            >
              💬 คุยกับเราที่ LINE
            </a>
            <a
              href="/packages"
              className="block w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition-colors"
            >
              🗺️ ดูโปรแกรมทัวร์
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ── Contact form (after all questions) ────────────────────────────────────
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

  // ── Question cards ─────────────────────────────────────────────────────────
  const q = questions[current];
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
            <h2 className="text-base font-semibold text-gray-800 leading-snug">
              {q.question}
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {q.options.map((opt) => {
              const selected = answers[q.id] === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(current, opt.value)}
                  className={`flex flex-col items-center gap-1.5 p-4 rounded-2xl border-2 text-center transition-all duration-150 ${
                    selected
                      ? "border-indigo-500 bg-indigo-50 scale-95"
                      : "border-gray-100 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/50 active:scale-95"
                  }`}
                >
                  <span className="text-2xl">{opt.emoji}</span>
                  <span className="text-xs font-medium text-gray-700 leading-tight">
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Skip / back nav */}
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
