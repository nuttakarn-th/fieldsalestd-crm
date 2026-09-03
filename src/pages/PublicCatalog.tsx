/**
 * PublicCatalog.tsx — v2 (Flat Table)
 * แต่ละแถว = 1 Period
 * Filter: search · category · status · เดือนเดินทาง · ที่นั่งว่าง ≥ X
 * ไม่ต้อง Login · Read-only · Realtime
 */
import { useEffect, useState, useMemo, useRef } from "react";
import { Search, RefreshCw, Share2, FileText } from "lucide-react";
import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";
import type { TourItem } from "@/store/serviceStore";

// ── Category colors ───────────────────────────────────────────────────────────
const CAT = {
  "International Tour": { label: "INT", bg: "#dcfce7", text: "#15803d", strip: "#22c55e" },
  "Domestic":           { label: "DOM", bg: "#fff7ed", text: "#c2410c", strip: "#f97316" },
  "Incentive":          { label: "INC", bg: "#f3e8ff", text: "#7c3aed", strip: "#a855f7" },
} as const;

function getCat(cat: string) {
  return CAT[cat as keyof typeof CAT] ?? CAT["Incentive"];
}

// ── Period status ─────────────────────────────────────────────────────────────
function pStatus(quota: number, total: number): "full" | "low" | "ok" {
  if (quota <= 0) return "full";
  if (total > 0 && quota / total <= 0.2) return "low";
  return "ok";
}

// ── Thai date ─────────────────────────────────────────────────────────────────
const TH_M = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];

function fmtDate(iso: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${TH_M[d.getMonth()]} ${d.getFullYear() + 543}`;
}

function monthKey(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  return `${TH_M[parseInt(m) - 1]} ${parseInt(y) + 543}`;
}

// ── Flat row type ─────────────────────────────────────────────────────────────
interface FlatRow {
  tourId: string;
  code: string;
  title: string;
  city: string;
  country: string;
  category: string;
  duration: string;
  pdfUrl: string | null;
  periodId: string;
  startDate: string;
  endDate: string;
  travelDate: string;
  quota: number;
  totalSeats: number;
}

function flatten(tours: TourItem[]): FlatRow[] {
  const rows: FlatRow[] = [];
  for (const t of tours) {
    for (const p of t.periods ?? []) {
      if (p.cancelled) continue;
      rows.push({
        tourId:     t.id,
        code:       t.code,
        title:      t.title ?? t.city,
        city:       t.city,
        country:    t.country,
        category:   t.category,
        duration:   t.duration ?? "",
        pdfUrl:     t.pdf_url ?? null,
        periodId:   p.period_id,
        startDate:  p.start_date ?? p.travel_date ?? "",
        endDate:    p.end_date ?? "",
        travelDate: p.travel_date ?? p.start_date ?? "",
        quota:      p.quota ?? 0,
        totalSeats: p.total_seats ?? t.total_seats ?? 0,
      });
    }
  }
  rows.sort((a, b) => (a.startDate > b.startDate ? 1 : -1));
  return rows;
}

// ── Seat bar ──────────────────────────────────────────────────────────────────
function SeatBar({ quota, total }: { quota: number; total: number }) {
  if (!total) return <span className="text-xs text-gray-400">-</span>;
  const st = pStatus(quota, total);
  const pct = Math.round(((total - quota) / total) * 100);
  const color = st === "full" ? "#ef4444" : st === "low" ? "#f97316" : "#22c55e";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden flex-1" style={{ minWidth: 48 }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs tabular-nums text-gray-500 whitespace-nowrap shrink-0">{quota}/{total}</span>
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ quota, total }: { quota: number; total: number }) {
  const st = pStatus(quota, total);
  if (st === "full") return <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-600">เต็มแล้ว</span>;
  if (st === "low")  return <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-50 text-orange-600">ใกล้เต็ม</span>;
  return <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-50 text-green-700">ว่าง</span>;
}

// ── Chip button ───────────────────────────────────────────────────────────────
function Chip({ active, onClick, children, activeBg = "#d1fae5", activeText = "#065f46" }: {
  active: boolean; onClick: () => void; children: React.ReactNode;
  activeBg?: string; activeText?: string;
}) {
  return (
    <button onClick={onClick}
      className="px-3 py-1 rounded-full text-xs font-semibold border transition-all whitespace-nowrap"
      style={active
        ? { background: activeBg, color: activeText, borderColor: "transparent" }
        : { background: "transparent", color: "#6b7280", borderColor: "#e5e7eb" }}>
      {children}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PublicCatalog() {
  const [tours, setTours]             = useState<TourItem[]>([]);
  const [loading, setLoading]         = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [copied, setCopied]           = useState(false);

  const [search, setSearch]           = useState("");
  const [catFilter, setCatFilter]     = useState("all");
  const [stFilter, setStFilter]       = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [seatMin, setSeatMin]         = useState(0);

  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  async function fetchTours() {
    if (!SUPABASE_ENABLED || !supabase) { setLoading(false); return; }
    const { data } = await supabase
      .from("tours")
      .select("id,code,city,country,category,duration,period,total_seats,quota,periods,pdf_url,title,is_published")
      .order("code", { ascending: true });
    if (data) {
      setTours(data as TourItem[]);
      setLastUpdated(new Date());
    }
    setLoading(false);
  }

  // ── Realtime ───────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchTours();
    if (!SUPABASE_ENABLED || !supabase) return;
    const ch = supabase
      .channel("public-catalog-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "tours" }, () => fetchTours())
      .subscribe();
    channelRef.current = ch;
    return () => { supabase?.removeChannel(ch); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Flatten + filter ───────────────────────────────────────────────────────
  const rows = useMemo(() => flatten(tours), [tours]);

  const months = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) { const k = monthKey(r.startDate); if (k) s.add(k); }
    return Array.from(s).sort();
  }, [rows]);

  const filtered = useMemo(() => rows.filter(r => {
    if (catFilter !== "all" && r.category !== catFilter) return false;
    if (stFilter !== "all" && pStatus(r.quota, r.totalSeats) !== stFilter) return false;
    if (monthFilter !== "all" && monthKey(r.startDate) !== monthFilter) return false;
    if (seatMin > 0 && r.quota < seatMin) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!r.code.toLowerCase().includes(q) && !r.title.toLowerCase().includes(q) &&
          !r.city.toLowerCase().includes(q) && !r.country.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [rows, catFilter, stFilter, monthFilter, seatMin, search]);

  // Stats
  const statOk   = filtered.filter(r => pStatus(r.quota, r.totalSeats) === "ok").length;
  const statLow  = filtered.filter(r => pStatus(r.quota, r.totalSeats) === "low").length;
  const statFull = filtered.filter(r => pStatus(r.quota, r.totalSeats) === "full").length;
  const uniquePgm = new Set(filtered.map(r => r.tourId)).size;

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">

      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/logo-icon.png" alt="Standard Tour"
              className="w-8 h-8 rounded-full object-cover shrink-0"
              onError={e => { (e.target as HTMLImageElement).src = "/logo-icon.svg"; }} />
            <div className="min-w-0">
              <p className="font-bold text-sm text-gray-900 leading-tight">Standard Tour</p>
              <p className="text-[11px] text-gray-400 leading-tight hidden sm:block">แคตตาล็อกโปรแกรมทัวร์ · อ่านอย่างเดียว</p>
            </div>
            <span className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-50 text-green-700 border border-green-200">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Live
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {lastUpdated && (
              <span className="hidden md:block text-[11px] text-gray-400">
                อัปเดต {lastUpdated.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <button onClick={fetchTours}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors" title="รีเฟรช">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={copyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ background: copied ? "#059669" : "#16a34a" }}>
              <Share2 className="w-3.5 h-3.5" />
              {copied ? "คัดลอกแล้ว!" : "แชร์ลิงค์"}
            </button>
          </div>
        </div>
      </header>

      {/* ── Filter bar ── */}
      <div className="bg-white border-b border-gray-100 sticky top-[57px] z-10">
        <div className="max-w-screen-xl mx-auto px-4 py-2.5 flex flex-wrap items-center gap-2">

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหาโปรแกรม..."
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg w-44 focus:outline-none focus:ring-2 focus:ring-green-100" />
          </div>

          <div className="w-px h-5 bg-gray-200 hidden sm:block" />

          {/* Category */}
          <Chip active={catFilter === "all"} onClick={() => setCatFilter("all")}>ทั้งหมด</Chip>
          <Chip active={catFilter === "International Tour"} onClick={() => setCatFilter("International Tour")}
            activeBg="#dcfce7" activeText="#15803d">INT</Chip>
          <Chip active={catFilter === "Domestic"} onClick={() => setCatFilter("Domestic")}
            activeBg="#fff7ed" activeText="#c2410c">DOM</Chip>
          <Chip active={catFilter === "Incentive"} onClick={() => setCatFilter("Incentive")}
            activeBg="#f3e8ff" activeText="#7c3aed">INC</Chip>

          <div className="w-px h-5 bg-gray-200 hidden sm:block" />

          {/* Status */}
          <Chip active={stFilter === "all"} onClick={() => setStFilter("all")}>ทุกสถานะ</Chip>
          <Chip active={stFilter === "ok"} onClick={() => setStFilter("ok")}
            activeBg="#f0fdf4" activeText="#15803d">ว่าง</Chip>
          <Chip active={stFilter === "low"} onClick={() => setStFilter("low")}
            activeBg="#fff7ed" activeText="#c2410c">ใกล้เต็ม</Chip>
          <Chip active={stFilter === "full"} onClick={() => setStFilter("full")}
            activeBg="#fef2f2" activeText="#dc2626">เต็ม</Chip>

          <div className="w-px h-5 bg-gray-200 hidden sm:block" />

          {/* Month */}
          <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none text-gray-600">
            <option value="all">📅 เดือนเดินทาง: ทั้งหมด</option>
            {months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>

          {/* Min seats */}
          <select value={seatMin} onChange={e => setSeatMin(Number(e.target.value))}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none text-gray-600">
            <option value={0}>💺 ที่นั่งว่าง: ทั้งหมด</option>
            <option value={1}>มีที่นั่ง (1+)</option>
            <option value={5}>5+ ที่นั่ง</option>
            <option value={10}>10+ ที่นั่ง</option>
          </select>
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className="max-w-screen-xl mx-auto w-full px-4 pt-3 pb-1">
        <p className="text-[12px] text-gray-500">
          <span className="font-semibold text-gray-700">{uniquePgm}</span> โปรแกรม ·{" "}
          <span className="font-semibold text-gray-700">{filtered.length}</span> Period ·{" "}
          <span className="font-semibold text-green-600">{statOk} ว่าง</span> ·{" "}
          <span className="font-semibold text-orange-500">{statLow} ใกล้เต็ม</span> ·{" "}
          <span className="font-semibold text-red-500">{statFull} เต็ม</span>
        </p>
      </div>

      {/* ── Table ── */}
      <div className="max-w-screen-xl mx-auto w-full px-4 pb-10 flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
            <RefreshCw className="w-5 h-5 animate-spin" /> กำลังโหลด...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
            <Search className="w-8 h-8" />
            <p className="text-sm">ไม่พบ Period ที่ตรงเงื่อนไข</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto shadow-sm">
            {/* Head */}
            <div className="hidden md:grid text-[11px] font-semibold uppercase tracking-wide text-gray-400 bg-gray-50 border-b border-gray-200"
              style={{ gridTemplateColumns: "72px 1fr 170px 72px 160px 100px 48px", padding: "8px 16px" }}>
              <span>ประเภท</span>
              <span>โปรแกรม</span>
              <span>วันเดินทาง</span>
              <span>ระยะ</span>
              <span>ที่นั่งว่าง</span>
              <span>สถานะ</span>
              <span className="text-center">PDF</span>
            </div>

            {/* Rows */}
            {filtered.map((r, i) => {
              const cat = getCat(r.category);
              return (
                <div key={`${r.tourId}-${r.periodId}`}
                  className="border-b border-gray-100 last:border-0 hover:bg-blue-50/30 transition-colors"
                  style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>

                  {/* Desktop row */}
                  <div className="hidden md:grid items-center py-2.5 px-4"
                    style={{ gridTemplateColumns: "72px 1fr 170px 72px 160px 100px 48px" }}>

                    {/* Category */}
                    <span className="inline-flex w-fit px-2 py-0.5 rounded text-[11px] font-bold"
                      style={{ background: cat.bg, color: cat.text }}>{cat.label}</span>

                    {/* Name */}
                    <div className="min-w-0 flex items-center gap-2 pr-2">
                      <div className="w-0.5 h-7 rounded-full shrink-0" style={{ background: cat.strip }} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate leading-tight">{r.title}</p>
                        <p className="text-[11px] text-gray-400 leading-tight truncate">
                          {r.code}{r.city ? ` · ${r.city}` : ""}{r.country ? `, ${r.country}` : ""}
                        </p>
                      </div>
                    </div>

                    {/* Date */}
                    <div className="text-xs text-gray-700">
                      {r.startDate && r.endDate
                        ? <>{fmtDate(r.startDate)}<span className="text-gray-400"> – </span>{fmtDate(r.endDate)}</>
                        : fmtDate(r.travelDate)}
                    </div>

                    {/* Duration */}
                    <div className="text-xs text-gray-500">{r.duration || "-"}</div>

                    {/* Seat bar */}
                    <SeatBar quota={r.quota} total={r.totalSeats} />

                    {/* Status */}
                    <StatusBadge quota={r.quota} total={r.totalSeats} />

                    {/* PDF */}
                    <div className="flex justify-center">
                      {r.pdfUrl ? (
                        <a href={r.pdfUrl} target="_blank" rel="noopener noreferrer"
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors" title="ดู PDF">
                          <FileText className="w-4 h-4" />
                        </a>
                      ) : (
                        <span className="p-1.5 text-gray-200 cursor-default" title="ไม่มี PDF">
                          <FileText className="w-4 h-4" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Mobile card */}
                  <div className="md:hidden p-3 flex items-start gap-3">
                    <div className="w-1 self-stretch rounded-full shrink-0" style={{ background: cat.strip }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: cat.bg, color: cat.text }}>{cat.label}</span>
                        <span className="text-xs font-semibold text-gray-900 truncate">{r.title}</span>
                      </div>
                      <p className="text-[11px] text-gray-400 mb-1">{r.code}{r.city ? ` · ${r.city}` : ""}</p>
                      <p className="text-xs text-gray-700 mb-1">
                        {r.startDate && r.endDate
                          ? `${fmtDate(r.startDate)} – ${fmtDate(r.endDate)}`
                          : fmtDate(r.travelDate)}
                        {r.duration ? ` · ${r.duration}` : ""}
                      </p>
                      <div className="flex items-center gap-2">
                        <SeatBar quota={r.quota} total={r.totalSeats} />
                        <StatusBadge quota={r.quota} total={r.totalSeats} />
                        {r.pdfUrl && (
                          <a href={r.pdfUrl} target="_blank" rel="noopener noreferrer"
                            className="text-red-400 hover:text-red-600">
                            <FileText className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-3 text-center text-[11px] text-gray-400">
        อ่านได้อย่างเดียว · ไม่แสดงราคา/รายได้ · ข้อมูล Realtime จาก Standard Tour Hub
      </footer>
    </div>
  );
}
