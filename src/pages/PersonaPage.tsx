/**
 * PersonaPage.tsx
 *
 * Route: /marketing/persona
 * Access: Marketing, Admin
 *
 * Tabs:
 *   1. "Persona Cards" — โปรไฟล์ลูกค้า 6 กลุ่ม (B2C 4 + B2B 2)
 *   2. "Survey Dashboard" — embed PersonaSurveyDashboard
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, BarChart2, ChevronRight } from "lucide-react";
import PersonaSurveyDashboard from "./PersonaSurveyDashboard";

// ─── Persona Data ─────────────────────────────────────────────────────────────

interface PersonaProfile {
  id: string;
  tag: string;
  emoji: string;
  name: string;
  age: string;
  job: string;
  color: string;           // tailwind gradient
  badgeColor: string;      // badge bg/text/border
  travelWith: string;
  frequency: string;
  budget: string;
  destinations: string;
  channels: string[];
  motivations: string[];
  painPoints: string[];
  quote: string;
  type: "b2c" | "b2b";
}

const PERSONAS: PersonaProfile[] = [
  // ── B2C ──────────────────────────────────────────────────────────────────
  {
    id: "kumkha",
    tag: "สายคุ้มค่า",
    emoji: "💰",
    name: "พี่ตั้ม",
    age: "42 ปี",
    job: "พนักงานเอกชน / พ่อบ้าน",
    color: "from-amber-400 to-orange-500",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-300",
    travelWith: "ครอบครัว (สามี/ภรรยา + ลูก 1-2 คน)",
    frequency: "1-2 ครั้ง/ปี ช่วงปิดเทอมหรือวันหยุดยาว",
    budget: "4,000–8,000 บาท/คน",
    destinations: "เหนือ, อีสาน, ทะเลอ่าวไทย (ใกล้-ไม่แพง)",
    channels: ["Facebook", "Line กลุ่มครอบครัว", "เพื่อนแนะนำ"],
    motivations: [
      "แพ็กเกจจัดครบ ไม่ต้องคิดเอง",
      "คุ้มค่า ได้เที่ยวเยอะ ราคาไม่แพง",
      "เด็กสนุก ผู้ใหญ่ไม่เหนื่อย",
    ],
    painPoints: [
      "กลัวจ่ายแล้วไม่คุ้ม ของไม่ครบ",
      "กังวลเรื่องความปลอดภัยลูก",
      "ไม่มีเวลาวางแผนเอง",
    ],
    quote: "\"ขอแค่ราคาโอเค แล้วลูกสนุก พ่อแม่ก็แฮปปี้แล้ว\"",
    type: "b2c",
  },
  {
    id: "nature",
    tag: "สายธรรมชาติ",
    emoji: "🌿",
    name: "น้องนิ้ง",
    age: "29 ปี",
    job: "พนักงานออฟฟิศ / กราฟิกดีไซเนอร์",
    color: "from-green-400 to-emerald-600",
    badgeColor: "bg-green-100 text-green-800 border-green-300",
    travelWith: "กลุ่มเพื่อน 3-6 คน หรือแฟน",
    frequency: "3-4 ครั้ง/ปี เน้น long weekend",
    budget: "8,000–15,000 บาท/คน",
    destinations: "เหนือ (ดอย), ใต้ (ทะเลลึก), ธรรมชาติ unseen",
    channels: ["Instagram", "TikTok", "Google รีวิว"],
    motivations: [
      "หนีเมือง พักผ่อนท่ามกลางธรรมชาติ",
      "ถ่ายรูปสวย มี content ลง IG",
      "ได้ไปสถานที่ที่ยังไม่มีใครรู้จัก",
    ],
    painPoints: [
      "กลัวได้ทัวร์แมส คนเยอะ",
      "อยากได้ประสบการณ์จริง ไม่ใช่แค่เที่ยวผ่านๆ",
      "กังวลเรื่อง guide ไม่มีคุณภาพ",
    ],
    quote: "\"อยากได้ทริปที่รู้สึกว่าเราค้นพบเองจริงๆ ไม่ใช่แค่ตามรอยคนอื่น\"",
    type: "b2c",
  },
  {
    id: "activity",
    tag: "สายกิจกรรม",
    emoji: "⚡",
    name: "น้องเฟิร์น",
    age: "23 ปี",
    job: "นักศึกษา/ฟรีแลนซ์ content creator",
    color: "from-blue-400 to-indigo-600",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-300",
    travelWith: "คนเดียว หรือกลุ่มเล็ก 2-3 คน",
    frequency: "4-6 ครั้ง/ปี จัดตามโอกาส",
    budget: "5,000–20,000 บาท/ทริป (ยืดหยุ่น)",
    destinations: "กิจกรรม extreme, วัฒนธรรมเฉพาะ, เทศกาล",
    channels: ["TikTok", "YouTube", "Facebook Group ท่องเที่ยว"],
    motivations: [
      "ได้ลองกิจกรรมใหม่ที่ไม่เคยทำ",
      "ได้ content ที่ไม่เหมือนใคร",
      "ความตื่นเต้น ผจญภัย ท้าทายตัวเอง",
    ],
    painPoints: [
      "ทัวร์ทั่วไปน่าเบื่อ ไม่มีอะไรแปลกใหม่",
      "งบจำกัด แต่อยากได้ประสบการณ์คุ้ม",
      "อยากให้มีกิจกรรมจริงจัง ไม่ใช่แค่ดูวิว",
    ],
    quote: "\"ถ้าไม่ได้ทำอะไรที่หัวใจเต้นแรง ก็ไม่คุ้มที่จะออกจากบ้าน\"",
    type: "b2c",
  },
  {
    id: "chill",
    tag: "สายชิลล์พรีเมียม",
    emoji: "💎",
    name: "คุณแอน",
    age: "39 ปี",
    job: "เจ้าของธุรกิจ / ผู้บริหารระดับกลาง",
    color: "from-purple-400 to-violet-600",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-300",
    travelWith: "คู่รัก หรือเพื่อนสนิท 2-4 คน",
    frequency: "2-3 ครั้ง/ปี เน้นช่วง low season หนีคนเยอะ",
    budget: "20,000 บาทขึ้นไป/คน",
    destinations: "ที่พักบูติก, SPA resort, ต่างประเทศใกล้",
    channels: ["Instagram", "Line OA แบรนด์ที่ trust", "เพื่อนแนะนำ"],
    motivations: [
      "พักผ่อนจริงๆ ไม่ต้องคิด ไม่ต้องรีบ",
      "Service ดี รู้สึก special",
      "ไม่อยากวางแผนเอง แค่บอกว่าอยากได้อะไร",
    ],
    painPoints: [
      "กลัว service ไม่ match ราคา",
      "ไม่ชอบทริปที่รีบเร่ง ยัดสถานที่เยอะ",
      "อยากได้ที่ปรึกษา ไม่ใช่แค่ขายทัวร์",
    ],
    quote: "\"ไม่ได้ขอมาก แค่อยากรู้สึกว่าจ่ายแล้วได้รับการดูแลจริงๆ\"",
    type: "b2c",
  },
  // ── B2B ──────────────────────────────────────────────────────────────────
  {
    id: "outing",
    tag: "Outing B2B",
    emoji: "🏕️",
    name: "คุณปลา",
    age: "34 ปี",
    job: "HR Manager / ฝ่ายบุคคล",
    color: "from-orange-400 to-red-500",
    badgeColor: "bg-orange-100 text-orange-800 border-orange-300",
    travelWith: "พนักงานองค์กร 20-50 คน",
    frequency: "1 ครั้ง/ปี ช่วง Q4 หรือสิ้นปีงบประมาณ",
    budget: "3,000–6,000 บาท/คน (งบบริษัท)",
    destinations: "เหนือ, ทะเล, รีสอร์ทที่มีห้องประชุม/กิจกรรม",
    channels: ["Google", "Line", "แนะนำจาก HR คนอื่น"],
    motivations: [
      "สร้าง team bonding ให้พนักงาน",
      "ได้รับงบ ต้องใช้ให้คุ้มและดูดี",
      "ต้องการ operator ที่เชื่อถือได้ จัดการได้ครบ",
    ],
    painPoints: [
      "กลัวกิจกรรมน่าเบื่อ พนักงานไม่ enjoy",
      "ต้องรายงาน management ว่าคุ้มค่า",
      "กังวลเรื่อง logistics คนเยอะ",
    ],
    quote: "\"ขอแค่ทริปออกมาดี พนักงานไม่บ่น แล้วปีหน้าจ้างเราอีกได้เลย\"",
    type: "b2b",
  },
  {
    id: "seminar",
    tag: "Seminar B2B",
    emoji: "🎯",
    name: "คุณโอ",
    age: "46 ปี",
    job: "Executive Secretary / ผู้ช่วยผู้บริหาร",
    color: "from-teal-400 to-cyan-600",
    badgeColor: "bg-teal-100 text-teal-800 border-teal-300",
    travelWith: "ผู้บริหาร + พนักงานระดับสูง 50+ คน",
    frequency: "2-3 ครั้ง/ปี (สัมมนา, ดูงาน, ประชุมใหญ่)",
    budget: "8,000–20,000 บาท/คน (งบสูง ต้องการคุณภาพ)",
    destinations: "โรงแรม 4-5 ดาว, ต่างประเทศดูงาน",
    channels: ["Google", "ติดต่อตรง", "Referral จาก partner"],
    motivations: [
      "ภาพลักษณ์องค์กร งานต้องออกมาดูดี",
      "ผู้บริหารพอใจ ไม่มีปัญหาระหว่างทริป",
      "ต้องการ one-stop service จัดได้ครบในที่เดียว",
    ],
    painPoints: [
      "กลัวงานผิดพลาด เสียหน้าต่อผู้บริหาร",
      "ต้องการ flexibility สูง เปลี่ยนแผนได้",
      "ต้องการ document ครบ ใบเสนอราคา/ใบเสร็จ",
    ],
    quote: "\"งานนี้ต้องไม่มีพลาด เพราะคนที่โดนตำหนิถ้าผิดพลาด คือฉัน\"",
    type: "b2b",
  },
];

// ─── Persona Card ─────────────────────────────────────────────────────────────

function PersonaCard({ p, onClick }: { p: PersonaProfile; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="bg-card border rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group"
    >
      {/* Header gradient */}
      <div className={`bg-gradient-to-br ${p.color} p-5 relative`}>
        <div className="text-4xl mb-2">{p.emoji}</div>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${p.badgeColor}`}>
          {p.tag}
        </span>
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <ChevronRight className="w-5 h-5 text-white/80" />
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        <div>
          <p className="font-bold text-foreground text-base">{p.name}</p>
          <p className="text-xs text-muted-foreground">{p.age} · {p.job}</p>
        </div>

        <div className="space-y-1.5 text-xs">
          <div className="flex gap-2">
            <span className="text-muted-foreground w-14 shrink-0">เดินกับ</span>
            <span className="text-foreground">{p.travelWith}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-muted-foreground w-14 shrink-0">งบ/คน</span>
            <span className="text-foreground font-medium">{p.budget}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-muted-foreground w-14 shrink-0">ช่องทาง</span>
            <span className="text-foreground">{p.channels.join(", ")}</span>
          </div>
        </div>

        {/* Quote */}
        <p className="text-xs text-muted-foreground italic border-l-2 border-border pl-2.5 leading-relaxed">
          {p.quote}
        </p>
      </div>
    </div>
  );
}

// ─── Persona Detail Modal ─────────────────────────────────────────────────────

function PersonaDetail({ p, onClose }: { p: PersonaProfile; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-card rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`bg-gradient-to-br ${p.color} p-6 rounded-t-2xl`}>
          <div className="text-5xl mb-3">{p.emoji}</div>
          <h2 className="text-white font-bold text-xl">{p.name}</h2>
          <p className="text-white/80 text-sm">{p.age} · {p.job}</p>
          <span className={`inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${p.badgeColor}`}>
            {p.tag}
          </span>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Quote */}
          <blockquote className="text-sm text-foreground italic border-l-4 border-primary/30 pl-4 py-1 bg-muted/30 rounded-r-lg">
            {p.quote}
          </blockquote>

          {/* Travel info */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">พฤติกรรมการเดินทาง</h3>
            <div className="space-y-1.5 text-sm">
              {[
                ["เดินทางกับ", p.travelWith],
                ["ความถี่", p.frequency],
                ["งบประมาณ", p.budget],
                ["Destination", p.destinations],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-3">
                  <span className="text-muted-foreground w-24 shrink-0 text-xs">{k}</span>
                  <span className="text-foreground text-xs">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Channels */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">ช่องทางที่ใช้</h3>
            <div className="flex flex-wrap gap-1.5">
              {p.channels.map(ch => (
                <span key={ch} className="bg-muted text-foreground text-xs px-2.5 py-1 rounded-full border">
                  {ch}
                </span>
              ))}
            </div>
          </div>

          {/* Motivations */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-green-600 mb-2">✅ แรงจูงใจ (Why they buy)</h3>
            <ul className="space-y-1">
              {p.motivations.map(m => (
                <li key={m} className="flex items-start gap-2 text-xs text-foreground">
                  <span className="text-green-500 mt-0.5">•</span>
                  {m}
                </li>
              ))}
            </ul>
          </div>

          {/* Pain Points */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-red-500 mb-2">⚠️ Pain Points (ความกังวล)</h3>
            <ul className="space-y-1">
              {p.painPoints.map(pp => (
                <li key={pp} className="flex items-start gap-2 text-xs text-foreground">
                  <span className="text-red-400 mt-0.5">•</span>
                  {pp}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Close */}
        <div className="p-4 border-t">
          <button
            onClick={onClose}
            className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = "cards" | "survey";

export default function PersonaPage() {
  const [tab, setTab] = useState<Tab>("cards");
  const [selected, setSelected] = useState<PersonaProfile | null>(null);
  const [typeFilter, setTypeFilter] = useState<"all" | "b2c" | "b2b">("all");

  const filtered = PERSONAS.filter(p => typeFilter === "all" || p.type === typeFilter);
  const b2c = filtered.filter(p => p.type === "b2c");
  const b2b = filtered.filter(p => p.type === "b2b");

  return (
    <div className="min-h-screen bg-background">
      {/* ── Page Header ── */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
                🎭 Persona
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                โปรไฟล์กลุ่มลูกค้า Standard Tour — B2C 4 กลุ่ม · B2B 2 กลุ่ม
              </p>
            </div>

            {/* Tabs */}
            <div className="flex bg-muted rounded-xl p-1 gap-1">
              <button
                onClick={() => setTab("cards")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  tab === "cards"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Persona Cards
              </button>
              <button
                onClick={() => setTab("survey")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  tab === "survey"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                Survey Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      {tab === "cards" && (
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">
          {/* Filter */}
          <div className="flex gap-2">
            {(["all", "b2c", "b2b"] as const).map(f => (
              <button
                key={f}
                onClick={() => setTypeFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  typeFilter === f
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary/50"
                }`}
              >
                {f === "all" ? "ทั้งหมด" : f === "b2c" ? "B2C — ลูกค้าบุคคล" : "B2B — องค์กร"}
              </button>
            ))}
          </div>

          {/* B2C Grid */}
          {b2c.length > 0 && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                👤 B2C — ลูกค้าบุคคล ({b2c.length} กลุ่ม)
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {b2c.map(p => (
                  <PersonaCard key={p.id} p={p} onClick={() => setSelected(p)} />
                ))}
              </div>
            </div>
          )}

          {/* B2B Grid */}
          {b2b.length > 0 && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                🏢 B2B — องค์กร ({b2b.length} กลุ่ม)
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {b2b.map(p => (
                  <PersonaCard key={p.id} p={p} onClick={() => setSelected(p)} />
                ))}
              </div>
            </div>
          )}

          {/* Footer note */}
          <p className="text-xs text-muted-foreground text-center pt-2">
            คลิกที่ card เพื่อดูรายละเอียดเต็ม · Persona ถูกกำหนดจากผลสำรวจ + ข้อมูล CRM
          </p>
        </div>
      )}

      {tab === "survey" && (
        <div className="max-w-5xl mx-auto">
          <PersonaSurveyDashboard />
        </div>
      )}

      {/* ── Detail Modal ── */}
      {selected && (
        <PersonaDetail p={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
