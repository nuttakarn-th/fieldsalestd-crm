/**
 * TourContentLink.tsx
 * เลือก Tour → ระบบแนะนำ Content Ideas อัตโนมัติ 5 ข้อ
 * พร้อมปุ่ม "เพิ่มใน Calendar" ส่งตรงไปยัง Content Calendar
 */
import { useState, useMemo } from "react";
import {
  Plane, Search, Lightbulb, Plus, Check,
  Facebook, Instagram, MessageCircle, Clock, Hash, Sparkles,
  ChevronRight, MapPin, Banknote, CalendarDays,
} from "lucide-react";
import { useServices } from "@/store/serviceStore";
import { useCRM } from "@/store/crmStore";
import type { ContentChannel } from "@/store/crmStore";
import type { TourItem } from "@/store/serviceStore";

// ─── Idea generator ───────────────────────────────────────────────────────────

interface ContentIdea {
  title:     string;
  caption:   string;
  channel:   ContentChannel;
  best_time: string;
  hashtags:  string[];
}

function generateIdeas(tour: TourItem): ContentIdea[] {
  const { city, country, category, duration, price_per_seat } = tour;
  const priceStr   = price_per_seat.toLocaleString("th-TH");
  const isDomestic = category === "Domestic";
  const isIncentive = category === "Incentive";
  const base = isDomestic ? city : `${city} ${country}`;

  return [
    {
      title:   `🔥 โปรพิเศษ ${base} เริ่มต้น ${priceStr} บาท`,
      caption: `✈️ ${base} ${duration}\n💰 ราคาเริ่มต้น ${priceStr} บาท/ท่าน\n✅ รวมตั๋วเครื่องบิน + โรงแรม + ไกด์\n📞 สอบถามได้เลย! Standard Tour ยินดีให้คำปรึกษาค่ะ`,
      channel: "Facebook",
      best_time: "18:00–20:00",
      hashtags: [`#${country.replace(/\s/g,"")}`, `#ทัวร์${isDomestic?"ไทย":country}`, "#StandardTour", "#โปรโมชั่น"],
    },
    {
      title:   `📸 ${base} — ไฮไลต์ที่ไม่ควรพลาด`,
      caption: `🌏 ${base} มีอะไรน่าเที่ยวบ้าง?\n\n👉 สถานที่สวยงาม ประสบการณ์ใหม่ที่คุณจะประทับใจ\n🗓 ระยะเวลา ${duration}\n\nสนใจ DM มาได้เลยนะคะ 💜`,
      channel: "Instagram",
      best_time: "12:00–13:00",
      hashtags: [`#${base.replace(/\s/g,"")}`, "#ท่องเที่ยว", "#TravelThailand", "#StandardTour"],
    },
    {
      title:   `💬 ถาม: ถ้าไป ${base} คุณอยากทำอะไรก่อน?`,
      caption: `คอมเมนต์บอกกันหน่อยนะคะ 👇\n\nA) ช้อปปิ้งก่อนเลย 🛍\nB) กินอาหารท้องถิ่น 🍜\nC) ถ่ายรูปสวยๆ 📸\nD) ดูวิวทิวทัศน์ 🏔\n\n${base} รอคุณอยู่นะคะ — Standard Tour`,
      channel: "Facebook",
      best_time: "19:00–21:00",
      hashtags: [`#${country.replace(/\s/g,"")}`, "#เที่ยวไหนดี", "#ทัวร์ราคาดี", "#StandardTour"],
    },
    {
      title:   `📋 ${base} ${duration} — สิ่งที่ควรรู้ก่อนเดินทาง`,
      caption: `🎒 เตรียมตัวไป ${base} ต้องรู้อะไรบ้าง?\n\n📌 เอกสารที่ต้องใช้\n📌 สภาพอากาศช่วงนี้\n📌 ของที่ควรพกไป\n📌 เงินทิปไกด์\n\nสนใจโปรแกรมทัวร์ทักมาได้เลยค่ะ 💬`,
      channel: "LINE",
      best_time: "07:00–09:00",
      hashtags: [`#${base.replace(/\s/g,"")}`, "#เตรียมตัวเที่ยว", "#TravelTips"],
    },
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
        "#StandardTour", "#ทัวร์กลุ่ม",
      ],
    },
  ];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function ChannelIcon({ ch }: { ch: ContentChannel }) {
  if (ch === "Facebook")  return <Facebook  className="w-3.5 h-3.5" />;
  if (ch === "Instagram") return <Instagram className="w-3.5 h-3.5" />;
  return <MessageCircle className="w-3.5 h-3.5" />;
}

const CH_COLOR: Record<ContentChannel, string> = {
  Facebook:  "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",
  Instagram: "bg-pink-50 text-pink-700 border border-pink-200 dark:bg-pink-900/30 dark:text-pink-300",
  LINE:      "bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-300",
};

const CAT_STYLE: Record<string, string> = {
  "International Tour": "bg-blue-50 text-blue-700 border border-blue-200",
  "Domestic":           "bg-emerald-50 text-emerald-700 border border-emerald-200",
  "Incentive":          "bg-amber-50 text-amber-700 border border-amber-200",
};
const CAT_LABEL: Record<string, string> = {
  "International Tour": "ต่างประเทศ",
  "Domestic":           "ในประเทศ",
  "Incentive":          "Incentive",
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function TourContentLink() {
  const tours = useServices((s) => s.tours);
  const { addContentPost } = useCRM();

  const [search,   setSearch]   = useState("");
  const [selected, setSelected] = useState<TourItem | null>(null);
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());

  const filtered = useMemo(() =>
    tours.filter((t) =>
      `${t.city} ${t.country} ${t.code}`.toLowerCase().includes(search.toLowerCase())
    ), [tours, search]);

  const ideas = useMemo(() => selected ? generateIdeas(selected) : [], [selected]);

  function addToCalendar(idea: ContentIdea, idx: number) {
    addContentPost({
      title:          idea.title,
      caption:        idea.caption,
      channels:       [idea.channel],
      content_type:   "Single Photo" as const,
      scheduled_date: new Date().toISOString().slice(0, 10),
      status:         "Draft",
      tour_id:        selected?.id,
    });
    setAddedIds((prev) => new Set([...prev, idx]));
  }

  return (
    <div className="flex flex-col h-full">

      {/* ── Top header bar ── */}
      <div className="flex items-center gap-3 px-5 py-4 border-b bg-card shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-md">
          <Plane className="w-4.5 h-4.5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold leading-tight">Tour → Content Link</h1>
          <p className="text-xs text-muted-foreground">เลือกโปรแกรมทัวร์ → ได้ไอเดีย Content อัตโนมัติ 5 ข้อ</p>
        </div>
        {selected && (
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-full">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>สร้างไอเดียสำหรับ <span className="font-semibold text-foreground">{selected.city}</span></span>
          </div>
        )}
      </div>

      {/* ── Body: split panel ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ════ LEFT: Tour list (fixed 300px) ════ */}
        <div className="w-[300px] shrink-0 border-r flex flex-col bg-muted/20">

          {/* Search */}
          <div className="px-3 pt-3 pb-2 border-b bg-card">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                className="w-full pl-8 pr-3 py-2 border rounded-lg text-xs bg-background placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="ค้นหา (ชื่อเมือง, ประเทศ, รหัส)"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setSelected(null); setAddedIds(new Set()); }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 pl-0.5">{filtered.length} โปรแกรม</p>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {tours.length === 0 ? (
              <div className="p-6 text-center">
                <Plane className="w-7 h-7 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">ยังไม่มีข้อมูล Tour</p>
                <p className="text-[10px] text-muted-foreground mt-1">เพิ่มทัวร์ใน Service and Stock ก่อน</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-xs text-muted-foreground">ไม่พบทัวร์ที่ค้นหา</p>
              </div>
            ) : (
              <div className="py-2 px-2 space-y-1">
                {filtered.map((t) => {
                  const isActive = selected?.id === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => { setSelected(t); setAddedIds(new Set()); }}
                      className={`w-full text-left px-3 py-2.5 rounded-lg transition-all group flex items-center gap-2 ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "hover:bg-muted/70 text-foreground"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <p className={`font-semibold text-xs truncate ${isActive ? "text-white" : ""}`}>
                            {t.city}, {t.country}
                          </p>
                          <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0 rounded-full border ${
                            isActive
                              ? "bg-white/20 text-white border-white/30"
                              : CAT_STYLE[t.category] ?? "bg-gray-100 text-gray-600 border-gray-200"
                          }`}>
                            {CAT_LABEL[t.category] ?? t.category}
                          </span>
                        </div>
                        <div className={`flex items-center gap-2 text-[10px] ${isActive ? "text-white/80" : "text-muted-foreground"}`}>
                          <span>{t.code}</span>
                          <span>·</span>
                          <span>{t.duration}</span>
                          <span>·</span>
                          <span className={`font-semibold ${isActive ? "text-white" : "text-primary"}`}>
                            ฿{t.price_per_seat.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${isActive ? "text-white" : "text-muted-foreground/40 group-hover:translate-x-0.5"}`} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ════ RIGHT: Content ideas ════ */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {!selected ? (

            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-10 text-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-100 dark:border-amber-800 flex items-center justify-center">
                <Lightbulb className="w-8 h-8 text-amber-400" />
              </div>
              <div>
                <p className="font-semibold text-base text-foreground">เลือกโปรแกรมทัวร์ทางซ้าย</p>
                <p className="text-sm text-muted-foreground mt-1">ระบบจะสร้างไอเดีย Content 5 ข้อให้อัตโนมัติ<br/>พร้อมบทความ Caption + ช่องทาง + เวลาโพสต์</p>
              </div>
              <div className="flex items-center gap-3 mt-2">
                {(["Facebook","Instagram","LINE"] as ContentChannel[]).map((ch) => (
                  <span key={ch} className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full ${CH_COLOR[ch]}`}>
                    <ChannelIcon ch={ch} /> {ch}
                  </span>
                ))}
              </div>
            </div>

          ) : (
            <div className="flex flex-col h-full overflow-hidden">

              {/* Selected tour banner */}
              <div className="shrink-0 px-5 py-3 bg-gradient-to-r from-primary/10 to-indigo-50 dark:from-primary/20 dark:to-indigo-900/20 border-b flex items-center gap-4">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shrink-0">
                  <MapPin className="w-4.5 h-4.5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-foreground">{selected.city}, {selected.country}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <CalendarDays className="w-3 h-3" /> {selected.duration}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Banknote className="w-3 h-3" /> ฿{selected.price_per_seat.toLocaleString()}/ท่าน
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${CAT_STYLE[selected.category] ?? ""}`}>
                      {CAT_LABEL[selected.category] ?? selected.category}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-primary font-semibold bg-primary/10 px-2.5 py-1 rounded-full shrink-0">
                  <Sparkles className="w-3.5 h-3.5" />
                  {addedIds.size}/{ideas.length} เพิ่มแล้ว
                </div>
              </div>

              {/* Ideas list — scrollable */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {ideas.map((idea, idx) => (
                  <div
                    key={idx}
                    className={`bg-card border rounded-xl overflow-hidden transition-all ${
                      addedIds.has(idx) ? "border-emerald-200 dark:border-emerald-700" : "border-border hover:border-primary/30 hover:shadow-sm"
                    }`}
                  >
                    {/* Card top bar: channel + add button */}
                    <div className={`flex items-center justify-between px-4 py-2.5 border-b ${
                      addedIds.has(idx) ? "bg-emerald-50/60 dark:bg-emerald-900/20" : "bg-muted/30"
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground/60">#{idx + 1}</span>
                        <span className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${CH_COLOR[idea.channel]}`}>
                          <ChannelIcon ch={idea.channel} /> {idea.channel}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Clock className="w-3 h-3" /> {idea.best_time}
                        </span>
                      </div>
                      <button
                        onClick={() => addToCalendar(idea, idx)}
                        disabled={addedIds.has(idx)}
                        className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                          addedIds.has(idx)
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 cursor-default"
                            : "bg-primary text-primary-foreground hover:opacity-90 active:scale-95"
                        }`}
                      >
                        {addedIds.has(idx)
                          ? <><Check className="w-3.5 h-3.5" /> เพิ่มแล้ว</>
                          : <><Plus className="w-3.5 h-3.5" /> เพิ่มใน Calendar</>
                        }
                      </button>
                    </div>

                    {/* Title */}
                    <div className="px-4 pt-3 pb-1">
                      <p className="font-bold text-sm leading-snug text-foreground">{idea.title}</p>
                    </div>

                    {/* Caption — full text, no clamp */}
                    <div className="px-4 pb-3">
                      <div className="mt-2 bg-muted/40 dark:bg-muted/20 rounded-lg px-3.5 py-3 border border-border/50">
                        <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-line">
                          {idea.caption}
                        </p>
                      </div>
                    </div>

                    {/* Hashtags footer */}
                    <div className="px-4 pb-3 flex items-center gap-1.5 flex-wrap">
                      <Hash className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                      {idea.hashtags.map((tag) => (
                        <span key={tag} className="text-[11px] text-primary/70 dark:text-primary/60 bg-primary/6 px-1.5 py-0.5 rounded font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
