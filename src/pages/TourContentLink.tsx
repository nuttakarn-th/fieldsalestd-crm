/**
 * TourContentLink.tsx
 * เลือก Tour → ระบบแนะนำ Content Ideas อัตโนมัติ 5 ข้อ
 * พร้อมปุ่ม "เพิ่มใน Calendar" ส่งตรงไปยัง Content Calendar
 */
import { useState, useMemo } from "react";
import { Plane, Search, Lightbulb, Plus, Check, Facebook, Instagram, MessageCircle, Clock, Hash } from "lucide-react";
import { useServices } from "@/store/serviceStore";
import { useCRM } from "@/store/crmStore";
import type { ContentChannel } from "@/store/crmStore";
import type { TourItem } from "@/store/serviceStore";

// ─── Idea generator ───────────────────────────────────────────────────────────

interface ContentIdea {
  title:    string;
  caption:  string;
  channel:  ContentChannel;
  best_time: string;
  hashtags: string[];
}

function generateIdeas(tour: TourItem): ContentIdea[] {
  const { city, country, category, duration, price_per_seat } = tour;
  const priceStr = price_per_seat.toLocaleString("th-TH");
  const isDomestic = category === "Domestic";
  const isIncentive = category === "Incentive";

  const base = isDomestic ? city : `${city} ${country}`;

  const allIdeas: ContentIdea[] = [
    // Idea 1 — โปรโมชั่น / ราคา
    {
      title: `🔥 โปรพิเศษ ${base} เริ่มต้น ${priceStr} บาท`,
      caption: `✈️ ${base} ${duration}\n💰 ราคาเริ่มต้น ${priceStr} บาท/ท่าน\n✅ รวมตั๋วเครื่องบิน + โรงแรม + ไกด์\n📞 สอบถามได้เลย! Standard Tour ยินดีให้คำปรึกษาค่ะ`,
      channel: "Facebook",
      best_time: "18:00–20:00",
      hashtags: [`#${country.replace(/\s/g,"")}`, `#ทัวร์${isDomestic ? "ไทย" : country}`, "#StandardTour", "#โปรโมชั่น"],
    },
    // Idea 2 — Highlight จุดเด่น
    {
      title: `📸 ${base} — ไฮไลต์ที่ไม่ควรพลาด`,
      caption: `🌏 ${base} มีอะไรน่าเที่ยวบ้าง?\n\n👉 สถานที่สวยงาม ประสบการณ์ใหม่ที่คุณจะประทับใจ\n🗓 ระยะเวลา ${duration}\n\nสนใจ DM มาได้เลยนะคะ 💜`,
      channel: "Instagram",
      best_time: "12:00–13:00",
      hashtags: [`#${base.replace(/\s/g,"")}`, "#ท่องเที่ยว", "#TravelThailand", "#StandardTour"],
    },
    // Idea 3 — Social Proof / คำถาม Engagement
    {
      title: `💬 ถาม: ถ้าไป ${base} คุณอยากทำอะไรก่อน?`,
      caption: `คอมเมนต์บอกกันหน่อยนะคะ 👇\n\nA) ช้อปปิ้งก่อนเลย 🛍\nB) กินอาหารท้องถิ่น 🍜\nC) ถ่ายรูปสวยๆ 📸\nD) ดูวิวทิวทัศน์ 🏔\n\n${base} รอคุณอยู่นะคะ — Standard Tour`,
      channel: "Facebook",
      best_time: "19:00–21:00",
      hashtags: [`#${country.replace(/\s/g,"")}`, "#เที่ยวไหนดี", "#ทัวร์ราคาดี", "#StandardTour"],
    },
    // Idea 4 — LINE / ข้อมูลเชิงลึก
    {
      title: `📋 ${base} ${duration} — สิ่งที่ควรรู้ก่อนเดินทาง`,
      caption: `🎒 เตรียมตัวไป ${base} ต้องรู้อะไรบ้าง?\n\n📌 เอกสารที่ต้องใช้\n📌 สภาพอากาศช่วงนี้\n📌 ของที่ควรพกไป\n📌 เงินทิปไกด์\n\nสนใจโปรแกรมทัวร์ทักมาได้เลยค่ะ 💬`,
      channel: "LINE",
      best_time: "07:00–09:00",
      hashtags: [`#${base.replace(/\s/g,"")}`, "#เตรียมตัวเที่ยว", "#TravelTips"],
    },
    // Idea 5 — Incentive / กลุ่ม
    {
      title: isIncentive
        ? `🏆 Incentive Trip ${base} — พาทีมไปชาร์จพลัง!`
        : `👫 พาครอบครัว/เพื่อนไป ${base} กับ Standard Tour`,
      caption: isIncentive
        ? `🌟 ทริป Incentive ที่ ${base}\n✅ แพ็กเกจกลุ่ม ราคาพิเศษ\n✅ โปรแกรม Team Building\n✅ จัดได้ตั้งแต่ 10 คนขึ้นไป\n\nสนใจติดต่อ Standard Tour ได้เลยค่ะ 📞`
        : `🎉 ไป ${base} กับคนที่คุณรัก!\n🗓 ${duration} | 💰 เริ่ม ${priceStr} บาท\n✅ บริการครบ จัดเต็ม ไม่ต้องวางแผนเอง\n\nจองด่วน! ที่นั่งมีจำนวนจำกัดนะคะ`,
      channel: "Facebook",
      best_time: "11:00–12:00",
      hashtags: [
        isIncentive ? "#IncentiveTrip" : "#ทริปครอบครัว",
        `#${country.replace(/\s/g,"")}`,
        "#StandardTour",
        "#ทัวร์กลุ่ม",
      ],
    },
  ];

  return allIdeas;
}

// ─── Channel icon ─────────────────────────────────────────────────────────────
function ChannelIcon({ ch }: { ch: ContentChannel }) {
  if (ch === "Facebook")  return <Facebook  className="w-3.5 h-3.5" />;
  if (ch === "Instagram") return <Instagram className="w-3.5 h-3.5" />;
  return <MessageCircle className="w-3.5 h-3.5" />;
}
const CH_COLOR: Record<ContentChannel, string> = {
  Facebook:  "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Instagram: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  LINE:      "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function TourContentLink() {
  const tours = useServices((s) => s.tours);
  const { addContentPost } = useCRM();

  const [search, setSearch]         = useState("");
  const [selected, setSelected]     = useState<TourItem | null>(null);
  const [addedIds, setAddedIds]     = useState<Set<number>>(new Set());

  const filtered = useMemo(() =>
    tours.filter((t) =>
      `${t.city} ${t.country} ${t.code}`.toLowerCase().includes(search.toLowerCase())
    ),
    [tours, search]
  );

  const ideas = useMemo(() => selected ? generateIdeas(selected) : [], [selected]);

  function addToCalendar(idea: ContentIdea, idx: number) {
    addContentPost({
      title:          idea.title,
      caption:        idea.caption,
      channel:        idea.channel,
      scheduled_date: new Date().toISOString().slice(0, 10),
      status:         "Draft",
      tour_id:        selected?.id,
    });
    setAddedIds((prev) => new Set([...prev, idx]));
  }

  return (
    <div className="p-4 sm:p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-glow">
          <Plane className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Tour → Content Link</h1>
          <p className="text-sm text-muted-foreground">เลือกโปรแกรมทัวร์ → ได้ไอเดีย Content อัตโนมัติ 5 ข้อ</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── Left: Tour list ── */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm bg-background"
              placeholder="ค้นหาทัวร์ (ชื่อเมือง, ประเทศ, รหัส)"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSelected(null); setAddedIds(new Set()); }}
            />
          </div>

          {tours.length === 0 ? (
            <div className="bg-card border rounded-xl p-8 text-center">
              <Plane className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูล Tour</p>
              <p className="text-xs text-muted-foreground mt-1">เพิ่มทัวร์ใน Service and Stock ก่อนครับ</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {filtered.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setSelected(t); setAddedIds(new Set()); }}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    selected?.id === t.id
                      ? "border-primary bg-primary/10 shadow-glow"
                      : "bg-card hover:bg-muted/40 border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm">{t.city}, {t.country}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.code} · {t.duration}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      t.category === "International Tour" ? "bg-blue-100 text-blue-700" :
                      t.category === "Domestic" ? "bg-emerald-100 text-emerald-700" :
                      "bg-amber-100 text-amber-700"
                    }`}>
                      {t.category === "International Tour" ? "ต่างประเทศ" : t.category === "Domestic" ? "ในประเทศ" : "Incentive"}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-primary mt-1">฿{t.price_per_seat.toLocaleString()}/ท่าน</p>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">ไม่พบทัวร์ที่ค้นหา</p>
              )}
            </div>
          )}
        </div>

        {/* ── Right: Content ideas ── */}
        <div className="space-y-3">
          {!selected ? (
            <div className="bg-card border-2 border-dashed border-border rounded-xl p-10 text-center h-full flex flex-col items-center justify-center">
              <Lightbulb className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm font-medium">เลือกทัวร์ทางซ้าย</p>
              <p className="text-xs text-muted-foreground mt-1">ระบบจะสร้างไอเดีย Content 5 ข้อให้อัตโนมัติ</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <p className="font-semibold text-sm">ไอเดีย Content สำหรับ <span className="text-primary">{selected.city}, {selected.country}</span></p>
              </div>
              <div className="space-y-3">
                {ideas.map((idea, idx) => (
                  <div key={idx} className="bg-card border rounded-xl p-4 space-y-2">
                    {/* Title row */}
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm leading-snug flex-1">{idea.title}</p>
                      <button
                        onClick={() => addToCalendar(idea, idx)}
                        disabled={addedIds.has(idx)}
                        className={`shrink-0 flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-all ${
                          addedIds.has(idx)
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-primary text-primary-foreground hover:opacity-90"
                        }`}
                      >
                        {addedIds.has(idx) ? <><Check className="w-3 h-3" /> เพิ่มแล้ว</> : <><Plus className="w-3 h-3" /> เพิ่มใน Calendar</>}
                      </button>
                    </div>

                    {/* Caption preview */}
                    <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-2 leading-relaxed whitespace-pre-line line-clamp-3">
                      {idea.caption}
                    </p>

                    {/* Meta row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${CH_COLOR[idea.channel]}`}>
                        <ChannelIcon ch={idea.channel} /> {idea.channel}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="w-3 h-3" /> {idea.best_time}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Hash className="w-3 h-3" />
                        {idea.hashtags.slice(0, 3).join(" ")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
