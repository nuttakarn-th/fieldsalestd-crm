/**
 * PublicCatalog.tsx — v3 (Accordion + INT/DOM sections)
 * แสดงชื่อโปรแกรม → กดขยายดู Period ทั้งหมด
 * แยก INT / DOM / INC section | Filter + Sort | ไม่ต้อง Login
 */
import { useEffect, useState, useMemo, useRef } from "react";
import {
  Search, RefreshCw, Share2, FileText,
  ChevronDown, ChevronRight, Globe, MapPin,
} from "lucide-react";
import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";
import type { TourItem } from "@/store/serviceStore";

// ── Category config ───────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: "International Tour", label: "INT", short: "INT",   bg: "#dcfce7", text: "#15803d", strip: "#22c55e", headerBg: "#f0fdf4", icon: Globe  },
  { key: "Domestic",           label: "DOM", short: "DOM",   bg: "#fff7ed", text: "#c2410c", strip: "#f97316", headerBg: "#fff7ed", icon: MapPin },
  { key: "Incentive",          label: "INC", short: "INC",   bg: "#f3e8ff", text: "#7c3aed", strip: "#a855f7", headerBg: "#faf5ff", icon: Globe  },
] as const;

function getCat(cat: string) {
  return CATEGORIES.find(c => c.key === cat) ?? CATEGORIES[2];
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

// ── Period helpers ────────────────────────────────────────────────────────────
function pStatus(quota: number, total: number): "full" | "low" | "ok" {
  if (quota <= 0) return "full";
  if (total > 0 && quota / total <= 0.2) return "low";
  return "ok";
}

// ── Seat bar ──────────────────────────────────────────────────────────────────
function SeatBar({ quota, total }: { quota: number; total: number }) {
  if (!total) return <span className="text-xs text-gray-400">-</span>;
  const st = pStatus(quota, total);
  const pct = Math.round(((total - quota) / total) * 100);
  const color = st === "full" ? "#ef4444" : st === "low" ? "#f97316" : "#22c55e";
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden" style={{ width: 56 }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs tabular-nums text-gray-600 whitespace-nowrap">{quota}/{total}</span>
    </div>
  );
}

function StatusBadge({ quota, total }: { quota: number; total: number }) {
  const st = pStatus(quota, total);
  if (st === "full") return <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-600 whitespace-nowrap">เต็มแล้ว</span>;
  if (st === "low")  return <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-50 text-orange-600 whitespace-nowrap">ใกล้เต็ม</span>;
  return <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-50 text-green-700 whitespace-nowrap">ว่าง</span>;
}

// ── Filter chip ───────────────────────────────────────────────────────────────
function Chip({ active, onClick, children, activeBg = "#d1fae5", activeText = "#065f46" }: {
  active: boolean; onClick: () => void; children: React.ReactNode;
  activeBg?: string; activeText?: string;
}) {
  return (
    <button onClick={onClick}
      className="px-3 py-1 rounded-full text-xs font-semibold border transition-all whitespace-nowrap"
      style={active
        ? { background: activeBg, color: activeText, borderColor: "transparent" }
        : { background: "white", color: "#6b7280", borderColor: "#e5e7eb" }}>
      {children}
    </button>
  );
}

// ── Period sub-table (expanded) ───────────────────────────────────────────────
interface PeriodRow {
  period_id: string;
  start_date: string;
  end_date: string;
  travel_date: string;
  quota: number;
  total_seats: number;
  cancelled: boolean;
}

function PeriodSubTable({
  tour, periods, monthFilter, stFilter,
}: {
  tour: TourItem; periods: PeriodRow[]; monthFilter: string; stFilter: string;
}) {
  const cat = getCat(tour.category);
  const visible = periods.filter(p => {
    if (p.cancelled) return false;
    const sd = p.start_date ?? p.travel_date ?? "";
    if (monthFilter !== "all" && monthKey(sd) !== monthFilter) return false;
    if (stFilter !== "all" && pStatus(p.quota, p.total_seats ?? tour.total_seats ?? 0) !== stFilter) return false;
    return true;
  });

  if (visible.length === 0) return (
    <div className="px-8 py-3 text-xs text-gray-400 border-t border-gray-100">ไม่มี Period ที่ตรงเงื่อนไข</div>
  );

  return (
    <div className="border-t border-gray-100">
      {/* Sub-header */}
      <div className="grid text-[10px] font-semibold uppercase tracking-wide text-gray-400 bg-gray-50 px-6 py-1.5"
        style={{ gridTemplateColumns: "1fr 80px 160px 100px 52px" }}>
        <span>วันเดินทาง</span>
        <span>ระยะเวลา</span>
        <span>ที่นั่งว่าง</span>
        <span>สถานะ</span>
        <span className="text-center">PDF</span>
      </div>

      {visible.map((p, i) => {
        const total = p.total_seats ?? tour.total_seats ?? 0;
        const sd = p.start_date ?? p.travel_date ?? "";
        const ed = p.end_date ?? "";
        return (
          <div key={p.period_id}
            className="grid items-center px-6 py-2 border-t border-gray-50 hover:bg-blue-50/30 transition-colors"
            style={{ gridTemplateColumns: "1fr 80px 160px 100px 52px", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>

            <div className="text-sm text-gray-800">
              {sd && ed
                ? <>{fmtDate(sd)}<span className="text-gray-400 mx-1">–</span>{fmtDate(ed)}</>
                : fmtDate(sd)}
            </div>

            <div className="text-xs text-gray-500">{tour.duration ?? "-"}</div>

            <SeatBar quota={p.quota} total={total} />

            <StatusBadge quota={p.quota} total={total} />

            <div className="flex justify-center">
              {tour.pdf_url ? (
                <a href={tour.pdf_url} target="_blank" rel="noopener noreferrer"
                  className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors" title="ดู PDF">
                  <FileText className="w-3.5 h-3.5" />
                </a>
              ) : (
                <span className="p-1 text-gray-200"><FileText className="w-3.5 h-3.5" /></span>
              )}
            </div>
          </div>
        );
      })}

      {/* Left color strip accent */}
      <style>{`.period-strip-${tour.id} { border-left: 3px solid ${cat.strip}; }`}</style>
    </div>
  );
}

// ── Program row ───────────────────────────────────────────────────────────────
function ProgramRow({
  tour, expanded, onToggle, monthFilter, stFilter,
}: {
  tour: TourItem; expanded: boolean; onToggle: () => void;
  monthFilter: string; stFilter: string;
}) {
  const cat = getCat(tour.category);
  const periods: PeriodRow[] = (tour.periods ?? []) as PeriodRow[];

  // Compute visible period stats (respecting filters)
  const visiblePeriods = periods.filter(p => {
    if (p.cancelled) return false;
    const sd = p.start_date ?? p.travel_date ?? "";
    if (monthFilter !== "all" && monthKey(sd) !== monthFilter) return false;
    if (stFilter !== "all") {
      const total = p.total_seats ?? tour.total_seats ?? 0;
      if (pStatus(p.quota, total) !== stFilter) return false;
    }
    return true;
  });

  const totalQuota = visiblePeriods.reduce((s, p) => s + (p.quota ?? 0), 0);
  const availCount = visiblePeriods.filter(p => {
    const t = p.total_seats ?? tour.total_seats ?? 0;
    return pStatus(p.quota, t) !== "full";
  }).length;

  // Overall row status: if any low → low, if any ok → ok, else full
  const hasOk  = visiblePeriods.some(p => pStatus(p.quota, p.total_seats ?? tour.total_seats ?? 0) === "ok");
  const hasLow = visiblePeriods.some(p => pStatus(p.quota, p.total_seats ?? tour.total_seats ?? 0) === "low");
  const rowSt: "ok" | "low" | "full" = hasOk ? "ok" : hasLow ? "low" : "full";

  return (
    <div className="border-b border-gray-100 last:border-0">
      {/* Program header row */}
      <button
        onClick={onToggle}
        className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group"
      >
        {/* Expand icon */}
        <span className="text-gray-400 group-hover:text-gray-600 transition-colors shrink-0">
          {expanded
            ? <ChevronDown className="w-4 h-4" />
            : <ChevronRight className="w-4 h-4" />}
        </span>

        {/* Color strip */}
        <div className="w-0.5 h-8 rounded-full shrink-0" style={{ background: cat.strip }} />

        {/* Program name + code */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate leading-tight">{tour.title ?? tour.city}</p>
          <p className="text-[11px] text-gray-400 leading-tight truncate">
            {tour.code}
            {tour.city ? ` · ${tour.city}` : ""}
            {tour.country ? `, ${tour.country}` : ""}
          </p>
        </div>

        {/* Duration */}
        <span className="hidden sm:block text-xs text-gray-500 shrink-0 w-20 text-right">{tour.duration ?? "-"}</span>

        {/* Period count */}
        <span className="hidden md:flex items-center gap-1 text-xs text-gray-500 shrink-0 w-20 justify-end">
          <span className="font-semibold text-gray-700">{visiblePeriods.length}</span> Period
        </span>

        {/* Available */}
        <span className="text-xs shrink-0 w-24 text-right hidden sm:block"
          style={{ color: rowSt === "ok" ? "#15803d" : rowSt === "low" ? "#c2410c" : "#dc2626" }}>
          ว่าง {availCount} Period
        </span>

        {/* Status */}
        <span className="shrink-0 hidden sm:block">
          {rowSt === "ok"   && <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-50 text-green-700">ว่าง</span>}
          {rowSt === "low"  && <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-50 text-orange-600">ใกล้เต็ม</span>}
          {rowSt === "full" && <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-600">เต็มแล้ว</span>}
        </span>

        {/* PDF icon */}
        <span className="shrink-0">
          {tour.pdf_url
            ? <a href={tour.pdf_url} target="_blank" rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors block" title="ดู PDF">
                <FileText className="w-4 h-4" />
              </a>
            : <span className="p-1.5 block text-gray-200"><FileText className="w-4 h-4" /></span>}
        </span>
      </button>

      {/* Expanded period table */}
      {expanded && (
        <PeriodSubTable
          tour={tour}
          periods={periods}
          monthFilter={monthFilter}
          stFilter={stFilter}
        />
      )}
    </div>
  );
}

// ── Category section ──────────────────────────────────────────────────────────
function CategorySection({
  catKey, tours, expandedIds, onToggle, monthFilter, stFilter,
}: {
  catKey: string;
  tours: TourItem[];
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  monthFilter: string;
  stFilter: string;
}) {
  const cfg = getCat(catKey);
  const Icon = cfg.icon;
  if (tours.length === 0) return null;
  return (
    <div className="mb-4">
      {/* Section header */}
      <div className="flex items-center gap-2 px-4 py-2 rounded-t-xl border-b-2"
        style={{ background: cfg.headerBg, borderColor: cfg.strip }}>
        <Icon className="w-4 h-4" style={{ color: cfg.text }} />
        <span className="font-bold text-sm" style={{ color: cfg.text }}>{cfg.label}</span>
        <span className="text-xs font-medium" style={{ color: cfg.text }}>— {catKey}</span>
        <span className="ml-auto text-xs font-semibold" style={{ color: cfg.text }}>{tours.length} โปรแกรม</span>
      </div>

      {/* Program rows */}
      <div className="bg-white border border-t-0 rounded-b-xl overflow-hidden border-gray-200"
        style={{ borderTop: `2px solid ${cfg.strip}` }}>
        {tours.map(t => (
          <ProgramRow
            key={t.id}
            tour={t}
            expanded={expandedIds.has(t.id)}
            onToggle={() => onToggle(t.id)}
            monthFilter={monthFilter}
            stFilter={stFilter}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PublicCatalog() {
  const [tours, setTours]             = useState<TourItem[]>([]);
  const [loading, setLoading]         = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [copied, setCopied]           = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

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
      .select("id,code,city,country,category,duration,period,total_seats,quota,periods,pdf_url,title,is_published")
      .order("code", { ascending: true });
    if (data) { setTours(data as TourItem[]); setLastUpdated(new Date()); }
    setLoading(false);
  }

  useEffect(() => {
    fetchTours();
    if (!SUPABASE_ENABLED || !supabase) return;
    const ch = supabase
      .channel("public-catalog-v3")
      .on("postgres_changes", { event: "*", schema: "public", table: "tours" }, () => fetchTours())
      .subscribe();
    channelRef.current = ch;
    return () => { supabase?.removeChannel(ch); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleExpand(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // Available months from all periods
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

  // Filter + sort tours
  const filteredTours = useMemo(() => {
    return tours
      .filter(t => {
        // Category
        if (catFilter !== "all" && t.category !== catFilter) return false;

        // Search
        if (search) {
          const q = search.toLowerCase();
          if (!t.code.toLowerCase().includes(q) &&
              !(t.title ?? "").toLowerCase().includes(q) &&
              !t.city.toLowerCase().includes(q) &&
              !t.country.toLowerCase().includes(q)) return false;
        }

        // Status + month filter — must have at least 1 matching period
        const periods = (t.periods ?? []) as { start_date?: string; travel_date?: string; quota: number; total_seats?: number; cancelled?: boolean }[];
        const matchPeriods = periods.filter(p => {
          if (p.cancelled) return false;
          const sd = p.start_date ?? p.travel_date ?? "";
          if (monthFilter !== "all" && monthKey(sd) !== monthFilter) return false;
          if (stFilter !== "all") {
            const total = p.total_seats ?? t.total_seats ?? 0;
            if (pStatus(p.quota, total) !== stFilter) return false;
          }
          return true;
        });
        if (matchPeriods.length === 0) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "name") return (a.title ?? a.city).localeCompare(b.title ?? b.city, "th");
        if (sortBy === "seats") {
          const qa = (a.periods ?? []).reduce((s: number, p: { quota?: number }) => s + (p.quota ?? 0), 0);
          const qb = (b.periods ?? []).reduce((s: number, p: { quota?: number }) => s + (p.quota ?? 0), 0);
          return qb - qa;
        }
        // date: earliest upcoming period
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

  // Group by category
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
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

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
          <Chip active={stFilter === "all"}  onClick={() => setStFilter("all")}>ทุกสถานะ</Chip>
          <Chip active={stFilter === "ok"}   onClick={() => setStFilter("ok")}  activeBg="#f0fdf4" activeText="#15803d">ว่าง</Chip>
          <Chip active={stFilter === "low"}  onClick={() => setStFilter("low")} activeBg="#fff7ed" activeText="#c2410c">ใกล้เต็ม</Chip>
          <Chip active={stFilter === "full"} onClick={() => setStFilter("full")} activeBg="#fef2f2" activeText="#dc2626">เต็ม</Chip>

          <div className="w-px h-5 bg-gray-200 hidden sm:block" />

          {/* Month */}
          <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none text-gray-600">
            <option value="all">📅 เดือนเดินทาง: ทั้งหมด</option>
            {months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>

          {/* Sort */}
          <select value={sortBy} onChange={e => setSortBy(e.target.value as "name" | "date" | "seats")}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none text-gray-600">
            <option value="date">เรียงตาม: วันเดินทาง</option>
            <option value="name">เรียงตาม: ชื่อโปรแกรม</option>
            <option value="seats">เรียงตาม: ที่นั่งว่างมากสุด</option>
          </select>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="max-w-screen-xl mx-auto w-full px-4 pt-3 pb-1">
        <p className="text-[12px] text-gray-500">
          <span className="font-semibold text-gray-700">{filteredTours.length}</span> โปรแกรม
          {CATEGORIES.map(c => {
            const n = grouped.get(c.key)?.length ?? 0;
            if (!n) return null;
            return <span key={c.key}> · <span className="font-semibold" style={{ color: c.text }}>{n} {c.short}</span></span>;
          })}
        </p>
      </div>

      {/* ── Content ── */}
      <div className="max-w-screen-xl mx-auto w-full px-4 pb-10 flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
            <RefreshCw className="w-5 h-5 animate-spin" /> กำลังโหลด...
          </div>
        ) : filteredTours.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
            <Search className="w-8 h-8" />
            <p className="text-sm">ไม่พบโปรแกรมที่ตรงเงื่อนไข</p>
          </div>
        ) : catFilter !== "all" ? (
          // Single category mode: show programs directly (no section header)
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm mt-2">
            {(grouped.get(catFilter) ?? []).map(t => (
              <ProgramRow key={t.id} tour={t}
                expanded={expandedIds.has(t.id)} onToggle={() => toggleExpand(t.id)}
                monthFilter={monthFilter} stFilter={stFilter} />
            ))}
          </div>
        ) : (
          // All categories: grouped sections
          <div className="mt-2">
            {CATEGORIES.map(c => (
              <CategorySection
                key={c.key}
                catKey={c.key}
                tours={grouped.get(c.key) ?? []}
                expandedIds={expandedIds}
                onToggle={toggleExpand}
                monthFilter={monthFilter}
                stFilter={stFilter}
              />
            ))}
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
