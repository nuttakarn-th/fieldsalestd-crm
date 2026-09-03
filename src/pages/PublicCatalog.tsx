/**
 * PublicCatalog.tsx — v5 (Modern Card Grid + Urgency + Drawer)
 * Klook-style card grid · urgency cues · period side-drawer
 */
import { useEffect, useState, useMemo, useRef } from "react";
import {
  Search, RefreshCw, Share2, FileText,
  ChevronDown, Globe, MapPin, Phone, MessageCircle,
  SlidersHorizontal, X, Calendar, Users, Flame, ArrowRight,
  ChevronRight,
} from "lucide-react";
import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";
import type { TourItem } from "@/store/serviceStore";

// ── Category config ───────────────────────────────────────────────────────────
const CATEGORIES = [
  {
    key: "International Tour", label: "ทัวร์ต่างประเทศ", sublabel: "International",
    short: "INT", chipLabel: "✈️ ต่างประเทศ",
    bg: "#dcfce7", text: "#15803d", strip: "#22c55e", headerBg: "#f0fdf4",
    grad: "linear-gradient(135deg,#22c55e,#16a34a)", icon: Globe,
  },
  {
    key: "Domestic", label: "ทัวร์ในประเทศ", sublabel: "Domestic",
    short: "DOM", chipLabel: "🏔️ ในประเทศ",
    bg: "#fff7ed", text: "#c2410c", strip: "#f97316", headerBg: "#fff7ed",
    grad: "linear-gradient(135deg,#f97316,#ea580c)", icon: MapPin,
  },
] as const;

function getCat(cat: string) { return CATEGORIES.find(c => c.key === cat) ?? CATEGORIES[2]; }

// ── Country flag images (flagcdn.com) ────────────────────────────────────────
const FLAG_CODES: Record<string, string> = {
  "จีน":"cn","ญี่ปุ่น":"jp","เกาหลี":"kr","ไต้หวัน":"tw","ฮ่องกง":"hk",
  "สิงคโปร์":"sg","เวียดนาม":"vn","มาเลเซีย":"my","อินโดนีเซีย":"id",
  "กัมพูชา":"kh","พม่า":"mm","อิตาลี":"it","ฝรั่งเศส":"fr",
  "สวิตเซอร์แลนด์":"ch","อังกฤษ":"gb","เยอรมนี":"de","สเปน":"es",
  "ดูไบ":"ae","ตุรกี":"tr","ออสเตรเลีย":"au","ไทย":"th","จอร์เจีย":"ge",
  "นิวซีแลนด์":"nz","อินเดีย":"in","เนปาล":"np","ภูฏาน":"bt",
  "ฟิลิปปินส์":"ph","บรูไน":"bn","ลาว":"la","ศรีลังกา":"lk",
};
function getFlagCode(country: string): string | null {
  for (const [k, v] of Object.entries(FLAG_CODES)) if (country?.includes(k)) return v;
  return null;
}
function FlagImg({ country, size = 40 }: { country: string; size?: number }) {
  const code = getFlagCode(country);
  if (!code) return <span className="text-4xl leading-none">✈️</span>;
  return (
    <img
      src={`https://flagcdn.com/w${size}/${code}.png`}
      srcSet={`https://flagcdn.com/w${size * 2}/${code}.png 2x`}
      alt={country}
      width={size} height={Math.round(size * 0.67)}
      className="rounded-sm object-cover drop-shadow-md"
      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
    />
  );
}

// ── Thai date ────────────────────────────────────────────────────────────────
const TH_M = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
function fmtDate(iso: string): string {
  if (!iso) return "-"; const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${TH_M[d.getMonth()]} ${d.getFullYear() + 543}`;
}
function monthKey(iso: string): string {
  if (!iso) return ""; const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,"0")}`;
}
function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  return `${TH_M[parseInt(m) - 1]} ${parseInt(y) + 543}`;
}

// ── Period helpers ────────────────────────────────────────────────────────────
type PStatus = "full" | "low" | "ok";
function pStatus(quota: number, total: number): PStatus {
  if (quota <= 0) return "full";
  if (total > 0 && quota / total <= 0.2) return "low";
  return "ok";
}

interface PeriodRow {
  period_id: string; start_date: string; end_date: string;
  travel_date: string; quota: number; total_seats: number; cancelled: boolean;
}

// ── Chip ─────────────────────────────────────────────────────────────────────
function Chip({ active, onClick, children, activeBg="#d1fae5", activeText="#065f46" }: {
  active: boolean; onClick: () => void; children: React.ReactNode;
  activeBg?: string; activeText?: string;
}) {
  return (
    <button onClick={onClick}
      className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap"
      style={active
        ? { background: activeBg, color: activeText, borderColor: "transparent" }
        : { background: "white", color: "#6b7280", borderColor: "#e5e7eb" }}>
      {children}
    </button>
  );
}

// ── Period Drawer ─────────────────────────────────────────────────────────────
function PeriodDrawer({ tour, onClose }: { tour: TourItem | null; onClose: () => void }) {
  const cat = tour ? getCat(tour.category) : null;
  const periods = ((tour?.periods ?? []) as PeriodRow[]).filter(p => !p.cancelled);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{ background: tour ? "rgba(0,0,0,0.4)" : "transparent", pointerEvents: tour ? "auto" : "none" }}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className="fixed top-0 right-0 h-full z-50 bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out"
        style={{
          width: "min(480px, 100vw)",
          transform: tour ? "translateX(0)" : "translateX(100%)",
        }}
      >
        {!tour ? null : (
          <>
            {/* Drawer header */}
            <div className="shrink-0 p-5 border-b border-gray-100" style={{ background: cat!.headerBg }}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold" style={{ background: cat!.bg, color: cat!.text }}>
                      {cat!.short}
                    </span>
                    <span className="text-xs text-gray-500">{tour.duration ?? ""}</span>
                  </div>
                  <p className="font-bold text-gray-900 text-lg leading-tight">{tour.title ?? tour.city}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {tour.city}{tour.country ? `, ${tour.country}` : ""}
                    {" · "}{tour.code}
                  </p>
                </div>
                <button onClick={onClose}
                  className="p-2 rounded-full hover:bg-white/70 text-gray-400 hover:text-gray-700 transition-colors shrink-0">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {tour.pdf_url && (
                <a href={tour.pdf_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors">
                  <FileText className="w-4 h-4" />
                  ดาวน์โหลด PDF โปรแกรม
                </a>
              )}
            </div>

            {/* Period list */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                  {periods.length} รอบเดินทาง
                </p>
              </div>

              {periods.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
                  <Calendar className="w-8 h-8 text-gray-300" />
                  <p className="text-sm">ไม่มีรอบเดินทาง</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {periods.map(p => {
                    const total = p.total_seats > 0 ? p.total_seats : (tour.total_seats ?? 0);
                    const st = pStatus(p.quota, total);
                    const pct = total > 0 ? Math.round(((total - p.quota) / total) * 100) : 0;
                    const barColor = st === "full" ? "#ef4444" : st === "low" ? "#f97316" : "#22c55e";
                    const sd = p.start_date ?? p.travel_date ?? "";
                    const ed = p.end_date ?? "";
                    return (
                      <div key={p.period_id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                        {/* Date range */}
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">
                              {fmtDate(sd)}
                              {ed && <><span className="text-gray-300 mx-2">→</span>{fmtDate(ed)}</>}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">{tour.duration ?? ""}</p>
                          </div>
                          <div className="text-right">
                            {st === "full" && <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-600">เต็มแล้ว</span>}
                            {st === "low"  && <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-600">🔥 ใกล้เต็ม</span>}
                            {st === "ok"   && <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700">ว่าง</span>}
                          </div>
                        </div>

                        {/* Booking meter */}
                        {total > 0 && (
                          <div className="space-y-1">
                            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
                            </div>
                            <div className="flex justify-between text-[11px] text-gray-400">
                              <span>จองแล้ว {total - p.quota}/{total} ที่นั่ง</span>
                              {st !== "full" && (
                                <span className="font-semibold" style={{ color: barColor }}>
                                  ว่าง {p.quota} ที่นั่ง
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Drawer footer CTA */}
            <div className="shrink-0 p-4 border-t border-gray-100 bg-gray-50 flex gap-3">
              <a href="tel:027370333"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-green-600 text-green-700 font-semibold text-sm hover:bg-green-50 transition-colors">
                <Phone className="w-4 h-4" /> โทรสอบถาม
              </a>
              <a href="https://line.me/ti/p/~@standardtour" target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white font-semibold text-sm transition-colors"
                style={{ background: "#06c755" }}>
                <MessageCircle className="w-4 h-4" /> LINE สอบถาม
              </a>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ── Program Card ──────────────────────────────────────────────────────────────
function ProgramCard({ tour, onClick }: { tour: TourItem; onClick: () => void }) {
  const cat = getCat(tour.category);
  const periods = ((tour.periods ?? []) as PeriodRow[]).filter(p => !p.cancelled);

  // Normalize: period total_seats=0 means "use tour.total_seats"
  const effPeriods = periods.map(p => ({
    quota: p.quota ?? 0,
    total: p.total_seats > 0 ? p.total_seats : (tour.total_seats ?? 0),
    date:  p.start_date ?? p.travel_date ?? "",
  }));

  // Aggregated stats (correct denominator)
  const totalQuota = effPeriods.reduce((s, p) => s + p.quota, 0);
  const totalSeats = effPeriods.reduce((s, p) => s + p.total, 0);
  const minQuota   = effPeriods.length ? Math.min(...effPeriods.map(p => p.quota)) : 0;
  const hasOk  = effPeriods.some(p => pStatus(p.quota, p.total) === "ok");
  const hasLow = effPeriods.some(p => pStatus(p.quota, p.total) === "low");
  const rowSt: PStatus = hasOk ? "ok" : hasLow ? "low" : "full";
  const pct = totalSeats > 0 ? Math.round(((totalSeats - totalQuota) / totalSeats) * 100) : 0;
  const barColor = rowSt === "full" ? "#ef4444" : rowSt === "low" ? "#f97316" : "#22c55e";

  // Next departure
  const upcoming = effPeriods
    .filter(p => pStatus(p.quota, p.total) !== "full")
    .map(p => p.date)
    .filter(Boolean).sort();
  const nextDate = upcoming[0];

  // Urgency
  const urgency = rowSt === "full" ? null
    : minQuota <= 3 && minQuota > 0 ? `🔥 เหลือ ${minQuota} ที่นั่ง!`
    : rowSt === "low" ? "⚡ ใกล้เต็มแล้ว"
    : null;

  const isFull = rowSt === "full";

  return (
    <div
      onClick={onClick}
      className="rounded-2xl overflow-hidden cursor-pointer group transition-all duration-200"
      style={{
        background: isFull ? "#f3f4f6" : "#ffffff",
        opacity: isFull ? 0.75 : 1,
        boxShadow: isFull
          ? "0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.06)"
          : "0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)",
      }}
      onMouseEnter={e => {
        if (!isFull) {
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)";
          (e.currentTarget as HTMLDivElement).style.boxShadow = "0 12px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)";
        }
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = "";
        (e.currentTarget as HTMLDivElement).style.boxShadow = isFull
          ? "0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.06)"
          : "0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)";
      }}
    >
      {/* Destination hero header */}
      <div className="relative h-20 flex items-end pb-3 px-4 overflow-hidden"
           style={{ background: isFull ? "linear-gradient(135deg,#9ca3af,#6b7280)" : cat.grad }}>
        {/* subtle highlight overlay */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "radial-gradient(circle at 80% 20%, rgba(255,255,255,0.6) 0%, transparent 60%)",
        }} />

        {/* FULL: centered "เต็มแล้ว" overlay */}
        {isFull && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/20">
            <span className="text-2xl leading-none">🔒</span>
            <span className="text-white font-bold text-base tracking-wide drop-shadow">เต็มทุกรอบแล้ว</span>
          </div>
        )}

        {/* Duration badge — top left */}
        {tour.duration && (
          <div className="absolute top-3 left-3">
            <span className="text-[11px] font-semibold text-white bg-black/20 px-2 py-0.5 rounded-full">
              {tour.duration}
            </span>
          </div>
        )}
        {/* Status badge — top right */}
        <div className="absolute top-3 right-3">
          {rowSt === "ok"   && <span className="text-[11px] font-bold text-green-700 bg-white/90 px-2 py-0.5 rounded-full shadow-sm">ว่าง</span>}
          {rowSt === "low"  && <span className="text-[11px] font-bold text-orange-700 bg-white/90 px-2 py-0.5 rounded-full shadow-sm">ใกล้เต็ม</span>}
          {rowSt === "full" && <span className="text-[11px] font-bold text-white bg-red-500 px-2 py-0.5 rounded-full shadow-sm">เต็มแล้ว</span>}
        </div>
        {/* Flag + city */}
        <div className={`relative flex items-end gap-2 min-w-0 ${isFull ? "opacity-40" : ""}`}>
          <FlagImg country={tour.country ?? ""} size={40} />
          <div className="min-w-0 pb-0.5">
            <p className="text-white font-bold text-sm leading-tight truncate drop-shadow-sm">
              {tour.city || tour.country || "—"}
            </p>
            {tour.country && tour.country !== tour.city && (
              <p className="text-white/75 text-xs leading-tight">{tour.country}</p>
            )}
          </div>
        </div>
      </div>

      {/* Card body */}
      <div className={`p-4 ${isFull ? "opacity-50" : ""}`}>
        {/* Program name + code */}
        <div className="mb-3">
          <p className={`font-bold text-base leading-tight line-clamp-2 transition-colors ${isFull ? "text-gray-500" : "text-gray-900 group-hover:text-green-800"}`}>
            {tour.title ?? tour.city}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{tour.code}</p>
        </div>

        {/* Booking meter */}
        {totalSeats > 0 && (
          <div className="mb-3">
            <div className="h-2 rounded-full bg-gray-200 overflow-hidden mb-1.5">
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-gray-400">จองแล้ว {pct}%</span>
              <span className="font-semibold" style={{ color: barColor }}>
                {rowSt !== "full" ? `ว่าง ${totalQuota} ที่นั่ง` : "เต็มทุกรอบ"}
              </span>
            </div>
          </div>
        )}

        {/* Price row */}
        {(tour as TourItem & { price_per_seat?: number }).price_per_seat
          ? (
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] text-gray-400">ราคาเริ่มต้น/ท่าน</span>
              <span className={`font-bold text-base ${isFull ? "text-gray-400" : "text-green-700"}`}>
                ฿{((tour as TourItem & { price_per_seat?: number }).price_per_seat ?? 0).toLocaleString("th-TH")}
              </span>
            </div>
          ) : null}

        {/* Info row */}
        <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            {periods.length} รอบเดินทาง
          </span>
          {nextDate && rowSt !== "full" && (
            <span className="flex items-center gap-1 text-green-600 font-medium">
              <ArrowRight className="w-3 h-3" />
              รอบแรก {fmtDate(nextDate)}
            </span>
          )}
        </div>

        {/* Urgency banner */}
        {urgency && (
          <div className="mb-3 px-3 py-1.5 rounded-lg bg-orange-50 border border-orange-100">
            <p className="text-xs font-bold text-orange-700">{urgency}</p>
          </div>
        )}

        {/* Bottom action row */}
        <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
          <button
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-colors text-white"
            style={{ background: isFull ? "#9ca3af" : cat.grad }}>
            {isFull ? "เต็มแล้ว" : "ดูรอบเดินทาง"}
            {!isFull && <ChevronRight className="w-4 h-4" />}
          </button>
          {tour.pdf_url && (
            <a href={tour.pdf_url} target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
              title="ดาวน์โหลด PDF">
              <FileText className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Category Section ──────────────────────────────────────────────────────────
function CategorySection({
  catKey, tours, onSelect,
}: { catKey: string; tours: TourItem[]; onSelect: (t: TourItem) => void }) {
  const cfg = getCat(catKey);
  const Icon = cfg.icon;
  if (tours.length === 0) return null;
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: cfg.grad }}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="font-bold text-gray-900">{cfg.label}</p>
          <p className="text-xs text-gray-400">{cfg.sublabel}</p>
        </div>
        <span className="ml-auto text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: cfg.bg, color: cfg.text }}>
          {tours.length} โปรแกรม
        </span>
      </div>
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
        {tours.map(t => (
          <ProgramCard key={t.id} tour={t} onClick={() => onSelect(t)} />
        ))}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PublicCatalog() {
  const [tours, setTours]               = useState<TourItem[]>([]);
  const [loading, setLoading]           = useState(true);
  const [lastUpdated, setLastUpdated]   = useState<Date | null>(null);
  const [copied, setCopied]             = useState(false);
  const [selectedTour, setSelectedTour] = useState<TourItem | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [search, setSearch]           = useState("");
  const [catFilter, setCatFilter]     = useState("all");
  const [stFilter, setStFilter]       = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [sortBy, setSortBy]           = useState<"name" | "date" | "seats">("date");

  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(null);

  async function fetchTours() {
    if (!SUPABASE_ENABLED || !supabase) { setLoading(false); return; }
    const { data } = await supabase
      .from("tours")
      .select("id,code,city,country,category,duration,period,total_seats,quota,periods,pdf_url,title,is_published,price_per_seat")
      .order("code", { ascending: true });
    if (data) { setTours(data as TourItem[]); setLastUpdated(new Date()); }
    setLoading(false);
  }

  useEffect(() => {
    fetchTours();
    if (!SUPABASE_ENABLED || !supabase) return;
    const ch = supabase
      .channel("public-catalog-v5")
      .on("postgres_changes", { event: "*", schema: "public", table: "tours" }, () => fetchTours())
      .subscribe();
    channelRef.current = ch;
    return () => { supabase?.removeChannel(ch); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close drawer on Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") setSelectedTour(null); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  const months = useMemo(() => {
    const s = new Set<string>();
    for (const t of tours) {
      for (const p of (t.periods ?? []) as { start_date?: string; travel_date?: string; cancelled?: boolean }[]) {
        if (p.cancelled) continue;
        const k = monthKey(p.start_date ?? p.travel_date ?? "");
        if (k) s.add(k);
      }
    }
    return Array.from(s).sort();
  }, [tours]);

  const filteredTours = useMemo(() => {
    return tours
      .filter(t => {
        if (catFilter !== "all" && t.category !== catFilter) return false;
        if (search) {
          const q = search.toLowerCase();
          if (!t.code.toLowerCase().includes(q) && !(t.title ?? "").toLowerCase().includes(q) &&
              !t.city.toLowerCase().includes(q) && !t.country.toLowerCase().includes(q)) return false;
        }
        const periods = (t.periods ?? []) as { start_date?: string; travel_date?: string; quota: number; total_seats?: number; cancelled?: boolean }[];
        const matchP = periods.filter(p => {
          if (p.cancelled) return false;
          const sd = p.start_date ?? p.travel_date ?? "";
          if (monthFilter !== "all" && monthKey(sd) !== monthFilter) return false;
          if (stFilter !== "all") {
            const total = p.total_seats ?? t.total_seats ?? 0;
            if (pStatus(p.quota, total) !== stFilter) return false;
          }
          return true;
        });
        return matchP.length > 0;
      })
      .sort((a, b) => {
        if (sortBy === "name") return (a.title ?? a.city).localeCompare(b.title ?? b.city, "th");
        if (sortBy === "seats") {
          const qa = (a.periods ?? []).reduce((s: number, p: { quota?: number }) => s + (p.quota ?? 0), 0);
          const qb = (b.periods ?? []).reduce((s: number, p: { quota?: number }) => s + (p.quota ?? 0), 0);
          return qb - qa;
        }
        const getMin = (t: TourItem) => {
          const dates = (t.periods ?? [])
            .filter((p: { cancelled?: boolean }) => !p.cancelled)
            .map((p: { start_date?: string; travel_date?: string }) => p.start_date ?? p.travel_date ?? "")
            .filter(Boolean);
          return dates.length ? dates.sort()[0] : "9999";
        };
        return getMin(a).localeCompare(getMin(b));
      });
  }, [tours, catFilter, search, monthFilter, stFilter, sortBy]);

  const grouped = useMemo(() => {
    const map = new Map<string, TourItem[]>();
    for (const cat of CATEGORIES) map.set(cat.key, []);
    for (const t of filteredTours) {
      if (!map.has(t.category)) map.set(t.category, []);
      map.get(t.category)!.push(t);
    }
    return map;
  }, [filteredTours]);

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  const hasAdvanced = stFilter !== "all" || sortBy !== "date";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/logo-icon.png" alt="Standard Tour"
              className="w-8 h-8 rounded-full object-cover shrink-0"
              onError={e => { (e.target as HTMLImageElement).src = "/logo-icon.svg"; }} />
            <div className="min-w-0">
              <p className="font-bold text-sm text-gray-900 leading-tight">Standard Tour</p>
              <p className="text-[11px] text-gray-400 leading-tight hidden sm:block">แคตตาล็อกโปรแกรมทัวร์</p>
            </div>
            <span className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-50 text-green-700 border border-green-200">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Real-time
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {lastUpdated && <span className="hidden lg:block text-[11px] text-gray-400">ล่าสุด {lastUpdated.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</span>}
            <button onClick={fetchTours} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"><RefreshCw className="w-4 h-4" /></button>
            <button onClick={copyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ background: copied ? "#059669" : "#16a34a" }}>
              <Share2 className="w-3.5 h-3.5" />
              {copied ? "คัดลอกแล้ว!" : "แชร์ลิงค์"}
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <div style={{ background: "linear-gradient(135deg,#16a34a,#059669)" }}>
        <div className="max-w-screen-xl mx-auto px-4 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-white">
            <p className="font-bold text-xl leading-tight">ค้นหาโปรแกรมทัวร์ Standard Tour</p>
            <p className="text-green-100 text-sm mt-1">ดูรอบเดินทาง · ที่นั่งว่าง · ดาวน์โหลด PDF โดยไม่ต้องสมัครสมาชิก</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a href="tel:027370333" className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-semibold transition-colors">
              <Phone className="w-3.5 h-3.5" /> โทรสอบถาม
            </a>
            <a href="https://line.me/ti/p/~@standardtour" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white text-green-700 text-sm font-bold hover:bg-green-50 transition-colors">
              <MessageCircle className="w-3.5 h-3.5" /> LINE
            </a>
          </div>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="bg-white border-b border-gray-100 sticky top-[57px] z-20 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 pt-2.5 pb-2 flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อโปรแกรม เมือง ประเทศ..."
              className="pl-8 pr-8 py-1.5 text-sm border border-gray-200 rounded-xl w-56 focus:outline-none focus:ring-2 focus:ring-green-100" />
            {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>}
          </div>

          <div className="w-px h-5 bg-gray-200 hidden sm:block" />

          <Chip active={catFilter === "all"} onClick={() => setCatFilter("all")}>🗺️ ทั้งหมด</Chip>
          {CATEGORIES.map(c => (
            <Chip key={c.key} active={catFilter === c.key} onClick={() => setCatFilter(c.key)} activeBg={c.bg} activeText={c.text}>
              {c.chipLabel}
            </Chip>
          ))}

          <div className="w-px h-5 bg-gray-200 hidden sm:block" />

          <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
            className="text-xs border border-gray-200 rounded-xl px-2 py-1.5 bg-white focus:outline-none text-gray-600">
            <option value="all">📅 ทุกเดือน</option>
            {months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>

          <button onClick={() => setShowAdvanced(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ml-auto"
            style={showAdvanced || hasAdvanced
              ? { background: "#eff6ff", color: "#2563eb", borderColor: "#bfdbfe" }
              : { background: "white", color: "#6b7280", borderColor: "#e5e7eb" }}>
            <SlidersHorizontal className="w-3.5 h-3.5" />
            ตัวกรอง
            {hasAdvanced && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
          </button>
        </div>

        {showAdvanced && (
          <div className="max-w-screen-xl mx-auto px-4 pb-2.5 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase">สถานะ:</span>
            <Chip active={stFilter === "all"}  onClick={() => setStFilter("all")}>ทุกสถานะ</Chip>
            <Chip active={stFilter === "ok"}   onClick={() => setStFilter("ok")}  activeBg="#f0fdf4" activeText="#15803d">✅ ว่าง</Chip>
            <Chip active={stFilter === "low"}  onClick={() => setStFilter("low")} activeBg="#fff7ed" activeText="#c2410c">⚠️ ใกล้เต็ม</Chip>
            <Chip active={stFilter === "full"} onClick={() => setStFilter("full")} activeBg="#fef2f2" activeText="#dc2626">🔴 เต็ม</Chip>
            <div className="w-px h-5 bg-gray-200 hidden sm:block" />
            <span className="text-[11px] font-bold text-gray-400 uppercase">เรียง:</span>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as "name"|"date"|"seats")}
              className="text-xs border border-gray-200 rounded-xl px-2 py-1.5 bg-white text-gray-600 focus:outline-none">
              <option value="date">วันเดินทางใกล้สุด</option>
              <option value="name">ชื่อโปรแกรม A-Z</option>
              <option value="seats">ที่นั่งว่างมากสุด</option>
            </select>
            {hasAdvanced && (
              <button onClick={() => { setStFilter("all"); setSortBy("date"); }}
                className="text-xs text-red-500 hover:text-red-700 underline">ล้าง</button>
            )}
          </div>
        )}
      </div>

      {/* ── Stats ── */}
      <div className="max-w-screen-xl mx-auto w-full px-4 pt-4 pb-2">
        <p className="text-sm text-gray-500">
          พบ <span className="font-bold text-gray-800">{filteredTours.length}</span> โปรแกรม
          {CATEGORIES.map(c => {
            const n = grouped.get(c.key)?.length ?? 0;
            if (!n) return null;
            return <span key={c.key}> · <span className="font-semibold" style={{ color: c.text }}>{n} {c.label}</span></span>;
          })}
        </p>
      </div>

      {/* ── Content ── */}
      <div className="max-w-screen-xl mx-auto w-full px-4 pb-12 flex-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
            <RefreshCw className="w-7 h-7 animate-spin text-green-400" />
            <p className="text-sm">กำลังโหลดโปรแกรมทัวร์...</p>
          </div>
        ) : filteredTours.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
            <Search className="w-12 h-12 text-gray-200" />
            <p className="text-base font-semibold text-gray-500">ไม่พบโปรแกรมที่ตรงเงื่อนไข</p>
            <button onClick={() => { setSearch(""); setCatFilter("all"); setStFilter("all"); setMonthFilter("all"); setSortBy("date"); }}
              className="text-sm text-green-600 hover:text-green-800 underline">ล้าง filter ทั้งหมด</button>
          </div>
        ) : catFilter !== "all" ? (
          <div className="mt-2">
            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
              {(grouped.get(catFilter) ?? []).map(t => (
                <ProgramCard key={t.id} tour={t} onClick={() => setSelectedTour(t)} />
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-2">
            {CATEGORIES.map(c => (
              <CategorySection
                key={c.key}
                catKey={c.key}
                tours={grouped.get(c.key) ?? []}
                onSelect={t => setSelectedTour(t)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Footer CTA ── */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-screen-xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <p className="font-bold text-gray-800">สนใจจองโปรแกรมทัวร์?</p>
            <p className="text-xs text-gray-500 mt-0.5">ทีมงานพร้อมให้คำแนะนำและดูแลทุกขั้นตอน</p>
          </div>
          <div className="flex gap-3">
            <a href="tel:027370333"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-green-600 text-green-700 font-semibold text-sm hover:bg-green-50 transition-colors">
              <Phone className="w-4 h-4" /> 02-737-0333
            </a>
            <a href="https://line.me/ti/p/~@standardtour" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-semibold text-sm"
              style={{ background: "#06c755" }}>
              <MessageCircle className="w-4 h-4" /> LINE @standardtour
            </a>
          </div>
        </div>
        <div className="border-t border-gray-100 py-2 text-center text-[11px] text-gray-400">
          ข้อมูลอัปเดต Real-time · ไม่แสดงราคา/รายได้ · Standard Tour Hub
        </div>
      </footer>

      {/* ── Period Drawer ── */}
      <PeriodDrawer tour={selectedTour} onClose={() => setSelectedTour(null)} />
    </div>
  );
}
