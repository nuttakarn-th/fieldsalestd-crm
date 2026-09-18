/**
 * OTADashboard.tsx — Enhanced KPI + Charts สำหรับ OTA Module
 * Tabs: Overview · Revenue · Operations · Markets
 */
import { useMemo, useState } from "react";
import { useOTAStore, OTAVehicleJoinGroup } from "@/store/otaStore";
import {
  PieChart, Pie, Cell, Tooltip as RTooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, AreaChart, Area, ComposedChart,
} from "recharts";
import {
  ShoppingCart, Banknote, Users, TrendingUp, Bus, Layers,
  DollarSign, BarChart3, FileDown,
} from "lucide-react";
import { downloadOTAReport } from "./OTAReportGenerator";

const COLORS = ["#7c3aed", "#db2777", "#a78bfa", "#f9a8d4", "#60a5fa", "#34d399", "#fb923c", "#fbbf24"];
const GUIDE_COLORS: Record<string, string> = {
  "Chinese Guide": "#db2777",
  "English Guide": "#7c3aed",
  "No Guide": "#94a3b8",
};
const DOW_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const today = new Date();
const fmtB = (n: number) => `฿${n.toLocaleString("th-TH", { minimumFractionDigits: 2 })}`;
const fmtBK = (n: number) => `฿${(n / 1000).toFixed(1)}k`;

type Tab = "overview" | "revenue" | "operations" | "markets";

function KPICard({
  icon: Icon, label, value, color, sub, sub2, badge,
}: {
  icon: typeof ShoppingCart;
  label: string;
  value: string;
  color: string;
  sub?: string;
  sub2?: string;
  badge?: { pct: number };
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-start justify-between mb-2">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        {badge && (
          <span
            className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
              badge.pct >= 0
                ? "bg-green-100 dark:bg-green-900/30 text-green-600"
                : "bg-red-100 dark:bg-red-900/30 text-red-500"
            }`}
          >
            {badge.pct >= 0 ? "+" : ""}{badge.pct.toFixed(0)}%
          </span>
        )}
      </div>
      <div className="text-muted-foreground text-xs mb-0.5">{label}</div>
      <div className="text-xl font-bold leading-tight">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      {sub2 && <div className="text-xs text-indigo-500 mt-0.5">{sub2}</div>}
    </div>
  );
}

function TabBtn({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        active ? "bg-purple-600 text-white" : "text-muted-foreground hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
        <span className="w-1 h-4 bg-purple-600 rounded-full inline-block" />
        {title}
      </h3>
      {children}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
      ยังไม่มีข้อมูลในเดือนนี้
    </div>
  );
}

// ── Period helpers ────────────────────────────────────────────────────────────
type PeriodType = "day" | "week" | "month" | "quarter" | "year" | "ytd" | "custom";
const PERIOD_LABELS: Record<PeriodType, string> = {
  day: "วัน", week: "สัปดาห์", month: "เดือน", quarter: "ไตรมาส", year: "ปี", ytd: "YTD", custom: "กำหนดเอง",
};

function fmtISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function computePeriod(ref: Date, type: PeriodType): { start: string; end: string; label: string; year: number; month: number } {
  const d = new Date(ref);
  let start: Date, end: Date, label: string;
  switch (type as Exclude<PeriodType, "custom">) {
    case "day":
      start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      end = start;
      label = d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
      break;
    case "week": {
      const dow = d.getDay();
      start = new Date(d); start.setDate(d.getDate() - dow);
      end   = new Date(start); end.setDate(start.getDate() + 6);
      label = `${start.getDate()} – ${end.getDate()} ${end.toLocaleString("en", { month: "short" })} ${end.getFullYear()}`;
      break;
    }
    case "month":
      start = new Date(d.getFullYear(), d.getMonth(), 1);
      end   = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      label = d.toLocaleString("en", { month: "long", year: "numeric" });
      break;
    case "quarter": {
      const q = Math.floor(d.getMonth() / 3);
      start = new Date(d.getFullYear(), q * 3, 1);
      end   = new Date(d.getFullYear(), q * 3 + 3, 0);
      label = `Q${q + 1} ${d.getFullYear()}`;
      break;
    }
    case "year":
      start = new Date(d.getFullYear(), 0, 1);
      end   = new Date(d.getFullYear(), 11, 31);
      label = String(d.getFullYear());
      break;
    case "ytd":
      start = new Date(d.getFullYear(), 0, 1);
      end   = today;
      label = `Jan – ${today.toLocaleString("en", { month: "short" })} ${d.getFullYear()}`;
      break;
    default:
      start = end = d; label = "";
  }
  return { start: fmtISO(start), end: fmtISO(end), label, year: d.getFullYear(), month: d.getMonth() + 1 };
}

function shiftRef(ref: Date, type: PeriodType, dir: 1 | -1): Date {
  const d = new Date(ref);
  switch (type) {
    case "day":     d.setDate(d.getDate() + dir); break;
    case "week":    d.setDate(d.getDate() + dir * 7); break;
    case "month":   d.setMonth(d.getMonth() + dir); break;
    case "quarter": d.setMonth(d.getMonth() + dir * 3); break;
    case "year":
    case "ytd":     d.setFullYear(d.getFullYear() + dir); break;
  }
  return d;
}

// ── Vehicle Grouping Config ───────────────────────────────────────────────────
// (join groups now loaded dynamically from Supabase via otaStore)
function buildVehicleGroupKeyFn(joinGroups: OTAVehicleJoinGroup[]): (code: string) => string {
  return (code: string) => {
    for (const jg of joinGroups) {
      if (jg.package_codes.includes(code)) {
        return jg.package_codes.slice().sort().join("+");
      }
    }
    return code.replace(/-\d+$/, "");
  };
}


/** Capacity rule → { count, type } */
function calcVehicles(pax: number): { count: number; type: "Van" | "Bus" } {
  if (pax > 26) return { count: 1, type: "Bus" };
  if (pax >= 14) return { count: 2, type: "Van" };
  return { count: 1, type: "Van" };
}

interface VehicleGroup {
  date: string;
  groupKey: string;
  packages: string[];
  orderCount: number;
  totalPax: number;
  vehicleCount: number;
  vehicleType: "Van" | "Bus";
}

// ─── Vehicle Calendar Grid ────────────────────────────────────────────────────

// Purple heatmap: light → dark as vehicle count grows
function heatStyle(total: number, isWeekend: boolean): {
  bg: string; text: string; dayText: string; vanIcon: string; busIcon: string;
} {
  if (total === 0) return {
    bg: isWeekend ? "bg-purple-50" : "bg-white",
    text: "text-purple-400",
    dayText: isWeekend ? "text-purple-400" : "text-slate-400",
    vanIcon: "text-purple-300",
    busIcon: "text-rose-300",
  };
  if (total <= 2)  return { bg: "bg-purple-100", text: "text-purple-800",  dayText: "text-purple-700",  vanIcon: "text-purple-600",  busIcon: "text-rose-500" };
  if (total <= 4)  return { bg: "bg-purple-300", text: "text-purple-900",  dayText: "text-purple-900",  vanIcon: "text-purple-800",  busIcon: "text-rose-600" };
  if (total <= 6)  return { bg: "bg-purple-500", text: "text-white",       dayText: "text-white",       vanIcon: "text-purple-100",  busIcon: "text-rose-100" };
  return           { bg: "bg-purple-700", text: "text-white",              dayText: "text-white",       vanIcon: "text-purple-100",  busIcon: "text-rose-100" };
}

// Inline SVG icons for vehicle type — renders with currentColor
function VanIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" width="22" height="22" fill="currentColor" className={className} aria-hidden="true">
      <path d="M59.706,30.519l-.284-.04a6.956,6.956,0,0,1-4.61-2.73L46,16a5.025,5.025,0,0,0-4-2H5a5.006,5.006,0,0,0-5,5V41a5.006,5.006,0,0,0,5,5H6.685a6.985,6.985,0,0,0,12.63,0h25.37a6.985,6.985,0,0,0,12.63,0H59a5.006,5.006,0,0,0,5-5V35.469A5.026,5.026,0,0,0,59.706,30.519ZM62,38H61a3.006,3.006,0,0,1-2.829-2H62ZM2,36a1,1,0,0,1,1,1v2a1,1,0,0,1-1,1ZM13,48a5,5,0,1,1,5-5A5.006,5.006,0,0,1,13,48Zm38,0a5,5,0,1,1,5-5A5.006,5.006,0,0,1,51,48Zm8-4H57.92a7,7,0,1,0-13.84,0H19.92A7,7,0,1,0,6.08,44H5a2.993,2.993,0,0,1-2.821-2.018A3,3,0,0,0,5,39V37a3,3,0,0,0-3-3V19a3,3,0,0,1,3-3H42a3.017,3.017,0,0,1,2.4,1.2l8.812,11.749a8.943,8.943,0,0,0,5.928,3.51l.284.04A3.006,3.006,0,0,1,61.605,34H57a1,1,0,0,0-1,1,5.006,5.006,0,0,0,5,5h1v1A3,3,0,0,1,59,44Z"/>
      <path d="M46.55,22.4a1,1,0,0,0-1.6,1.2l2.85,3.8A1,1,0,0,1,47,29H37a1,1,0,0,1-1-1V20a1,1,0,0,1,1-1h4a1,1,0,0,1,.8.4l.9,1.2a1,1,0,1,0,1.6-1.2l-.9-1.2A3.014,3.014,0,0,0,41,17H37a3,3,0,0,0-3,3v8a3,3,0,0,0,3,3H47a3,3,0,0,0,2.4-4.8Z"/>
      <path d="M29,17H6a3,3,0,0,0-3,3v8a3,3,0,0,0,3,3H29a3,3,0,0,0,3-3V20A3,3,0,0,0,29,17ZM5,28V20a1,1,0,0,1,1-1h6V29H6A1,1,0,0,1,5,28Zm9-9h7V29H14Zm16,9a1,1,0,0,1-1,1H23V19h6a1,1,0,0,1,1,1Z"/>
      <path d="M51,40a3,3,0,1,0,3,3A3,3,0,0,0,51,40Zm0,4a1,1,0,1,1,1-1A1,1,0,0,1,51,44Z"/>
      <path d="M13,40a3,3,0,1,0,3,3A3,3,0,0,0,13,40Zm0,4a1,1,0,1,1,1-1A1,1,0,0,1,13,44Z"/>
      <path d="M39,32H37a1,1,0,0,0,0,2h2a1,1,0,0,0,0-2Z"/>
      <path d="M29,32a1,1,0,0,0-1,1v1a1,1,0,0,0,2,0V33A1,1,0,0,0,29,32Z"/>
    </svg>
  );
}

function BusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 570.502 570.502" width="22" height="22" fill="currentColor" className={className} aria-hidden="true">
      <path clipRule="evenodd" d="m517.092 390.006h-54.394c-5.08 0-9.201-4.121-9.201-9.201s4.121-9.201 9.201-9.201h54.394c3.131 0 5.687-2.54 5.687-5.672v-105.034c0-27.333-10.655-53.036-30.001-72.366s-45.081-29.984-72.446-29.984h-373.893c-15.448 0-28.004 12.557-28.004 27.988v157.082c0 15.432 12.572 27.988 28.004 27.988h58.244c5.08 0 9.201 4.121 9.201 9.201s-4.121 9.201-9.201 9.201h-58.244c-25.591 0-46.407-20.8-46.407-46.391v-157.083c0-25.576 20.815-46.391 46.407-46.391h373.892c32.285 0 62.622 12.557 85.45 35.369s35.4 53.132 35.4 85.386v105.035c-.015 13.275-10.814 24.073-24.089 24.073z" fillRule="evenodd"/>
      <path clipRule="evenodd" d="m381.911 390.006h-196.458c-5.08 0-9.201-4.121-9.201-9.201s4.121-9.201 9.201-9.201h196.459c5.08 0 9.201 4.121 9.201 9.201.001 5.08-4.121 9.201-9.202 9.201z" fillRule="evenodd"/>
      <path clipRule="evenodd" d="m506.836 202.62h-497.618c-5.08 0-9.201-4.122-9.201-9.201s4.121-9.201 9.201-9.201h497.618c5.08 0 9.201 4.122 9.201 9.201 0 5.08-4.121 9.201-9.201 9.201z" fillRule="evenodd"/>
      <path clipRule="evenodd" d="m531.98 332.736c-.447 0-.911-.032-1.374-.096l-40.193-6.023c-1.917-.287-3.674-1.166-5.064-2.508l-46.359-45.177h-429.789c-5.08 0-9.201-4.121-9.201-9.201s4.121-9.201 9.201-9.201h433.527c2.396 0 4.697.943 6.422 2.603l46.902 45.72 37.254 5.576c5.032.751 8.483 5.431 7.732 10.463-.655 4.553-4.569 7.844-9.058 7.844z" fillRule="evenodd"/>
      <path clipRule="evenodd" d="m99.779 278.917c-5.08 0-9.201-4.121-9.201-9.201v-76.296c0-5.08 4.121-9.201 9.201-9.201s9.201 4.121 9.201 9.201v76.296c.001 5.08-4.121 9.201-9.201 9.201z" fillRule="evenodd"/>
      <path clipRule="evenodd" d="m205.885 278.917c-5.08 0-9.201-4.121-9.201-9.201v-76.296c0-5.08 4.121-9.201 9.201-9.201s9.201 4.121 9.201 9.201v76.296c0 5.08-4.121 9.201-9.201 9.201z" fillRule="evenodd"/>
      <path clipRule="evenodd" d="m311.989 278.917c-5.08 0-9.201-4.121-9.201-9.201v-76.296c0-5.08 4.121-9.201 9.201-9.201s9.201 4.121 9.201 9.201v76.296c.001 5.08-4.121 9.201-9.201 9.201z" fillRule="evenodd"/>
      <path clipRule="evenodd" d="m418.095 278.917c-5.08 0-9.201-4.121-9.201-9.201v-76.296c0-5.08 4.121-9.201 9.201-9.201s9.201 4.121 9.201 9.201v76.296c0 5.08-4.121 9.201-9.201 9.201z" fillRule="evenodd"/>
      <path clipRule="evenodd" d="m561.31 270.897c-3.578 0-6.981-2.092-8.467-5.591l-8.067-18.898h-12.812c-5.08 0-9.201-4.122-9.201-9.201s4.122-9.201 9.201-9.201h18.882c3.69 0 7.013 2.205 8.467 5.591l10.448 24.489c1.997 4.68-.176 10.08-4.857 12.077-1.166.495-2.38.734-3.594.734z" fillRule="evenodd"/>
      <path clipRule="evenodd" d="m422.296 430.359c-27.349 0-49.586-22.237-49.586-49.554s22.237-49.554 49.586-49.554 49.586 22.237 49.586 49.554c0 27.333-22.237 49.554-49.586 49.554zm0-80.705c-17.189 0-31.183 13.978-31.183 31.151 0 17.174 13.995 31.15 31.183 31.15 17.189 0 31.183-13.978 31.183-31.151 0-17.174-13.978-31.15-31.183-31.15z" fillRule="evenodd"/>
      <path clipRule="evenodd" d="m145.068 430.359c-27.349 0-49.586-22.237-49.586-49.554s22.237-49.554 49.586-49.554 49.586 22.237 49.586 49.554c0 27.333-22.253 49.554-49.586 49.554zm0-80.705c-17.189 0-31.183 13.978-31.183 31.151 0 17.174 13.994 31.151 31.183 31.151s31.183-13.978 31.183-31.151c0-17.174-13.994-31.151-31.183-31.151z" fillRule="evenodd"/>
    </svg>
  );
}

function VehicleCalendar({
  vehicleGroups, year, month, totalVehiclesUsed,
}: {
  vehicleGroups: VehicleGroup[];
  year: number;
  month: number;
  totalVehiclesUsed: number;
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const dayMap = useMemo(() => {
    const m: Record<string, { van: number; bus: number; groups: VehicleGroup[] }> = {};
    vehicleGroups.forEach((g) => {
      if (!m[g.date]) m[g.date] = { van: 0, bus: 0, groups: [] };
      if (g.vehicleType === "Bus") m[g.date].bus += g.vehicleCount;
      else                          m[g.date].van += g.vehicleCount;
      m[g.date].groups.push(g);
    });
    return m;
  }, [vehicleGroups]);

  const weeks = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay  = new Date(year, month, 0);
    const startOffset = (firstDay.getDay() + 6) % 7; // Mon=0
    const cells: (number | null)[] = [
      ...Array(startOffset).fill(null),
      ...Array.from({ length: lastDay.getDate() }, (_, i) => i + 1),
    ];
    while (cells.length % 7 !== 0) cells.push(null);
    const rows: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [year, month]);

  const totalVan = vehicleGroups.filter(g => g.vehicleType === "Van").reduce((s, g) => s + g.vehicleCount, 0);
  const totalBus = vehicleGroups.filter(g => g.vehicleType === "Bus").reduce((s, g) => s + g.vehicleCount, 0);
  const todayStr = new Date().toISOString().slice(0, 10);

  // Mon=0 … Fri=4 | Sat=5, Sun=6
  const DOW = [
    { label: "จ",  weekend: false },
    { label: "อ",  weekend: false },
    { label: "พ",  weekend: false },
    { label: "พฤ", weekend: false },
    { label: "ศ",  weekend: false },
    { label: "ส",  weekend: true  },
    { label: "อา", weekend: true  },
  ];

  const selectedGroups = selectedDate ? (dayMap[selectedDate]?.groups ?? []) : [];

  return (
    <div className="space-y-3">
      {/* KPI strip */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="border border-purple-200 rounded-lg px-3 py-1.5 bg-purple-50 flex items-center gap-2">
          <VanIcon className="text-purple-600 shrink-0" />
          <div>
            <div className="text-[10px] text-purple-500 font-semibold leading-none">VAN</div>
            <div className="text-lg font-black text-purple-700 leading-tight">{totalVan} <span className="text-xs font-semibold">คัน</span></div>
          </div>
        </div>
        <div className="border border-rose-200 rounded-lg px-3 py-1.5 bg-rose-50 flex items-center gap-2">
          <BusIcon className="text-rose-500 shrink-0" />
          <div>
            <div className="text-[10px] text-rose-500 font-semibold leading-none">BUS</div>
            <div className="text-lg font-black text-rose-600 leading-tight">{totalBus} <span className="text-xs font-semibold">คัน</span></div>
          </div>
        </div>
        <div className="border border-purple-300 rounded-lg px-3 py-1.5 bg-purple-100">
          <div className="text-[10px] text-purple-600 font-semibold leading-none">รวม</div>
          <div className="text-lg font-black text-purple-800 leading-tight">{totalVehiclesUsed} <span className="text-xs font-semibold">คัน</span></div>
        </div>
        {/* Heatmap legend */}
        <div className="ml-auto flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span>น้อย</span>
          <span className="w-4 h-4 rounded-sm bg-purple-100 border border-purple-200 inline-block" />
          <span className="w-4 h-4 rounded-sm bg-purple-300 border border-purple-400 inline-block" />
          <span className="w-4 h-4 rounded-sm bg-purple-500 border border-purple-600 inline-block" />
          <span className="w-4 h-4 rounded-sm bg-purple-700 border border-purple-800 inline-block" />
          <span>มาก</span>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="rounded-xl border border-purple-200 overflow-hidden shadow-sm">
        {/* Header row */}
        <div className="grid grid-cols-7">
          {DOW.map(({ label, weekend }, i) => (
            <div
              key={i}
              className={[
                "text-center text-[11px] font-bold py-2 tracking-wide",
                weekend
                  ? "bg-purple-700 text-purple-100"
                  : "bg-purple-900 text-white",
              ].join(" ")}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-t border-purple-100 first:border-0">
            {week.map((day, di) => {
              const isWeekend = di >= 5;

              if (!day) {
                return (
                  <div
                    key={di}
                    className={[
                      "min-h-[72px] border-r border-purple-100 last:border-0",
                      isWeekend ? "bg-purple-50/60" : "bg-white/50",
                    ].join(" ")}
                  />
                );
              }

              const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const info    = dayMap[dateStr];
              const van     = info?.van ?? 0;
              const bus     = info?.bus ?? 0;
              const total   = van + bus;
              const isToday    = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              const { bg, text, dayText, vanIcon, busIcon } = heatStyle(total, isWeekend);

              return (
                <button
                  key={di}
                  onClick={() => total > 0 ? setSelectedDate(isSelected ? null : dateStr) : undefined}
                  className={[
                    "min-h-[72px] p-2 border-r border-purple-100 last:border-0 transition-all flex flex-col",
                    bg,
                    total > 0 ? "cursor-pointer hover:brightness-95" : "cursor-default",
                    isSelected ? "ring-2 ring-inset ring-white/70 brightness-90" : "",
                  ].join(" ")}
                >
                  {/* Day number */}
                  <span className={[
                    "text-[11px] font-black leading-none mb-auto self-start",
                    isToday
                      ? "bg-white text-purple-700 rounded-full w-5 h-5 flex items-center justify-center shadow"
                      : dayText,
                  ].join(" ")}>
                    {day}
                  </span>

                  {/* Vehicle icons — van (purple) + bus (pink) */}
                  {total > 0 && (
                    <div className="flex flex-col items-center justify-center gap-1 flex-1">
                      {van > 0 && (
                        <span className={`flex items-center gap-1 font-black text-[13px] leading-none ${vanIcon}`}>
                          <VanIcon />
                          {van}
                        </span>
                      )}
                      {bus > 0 && (
                        <span className={`flex items-center gap-1 font-black text-[13px] leading-none ${busIcon}`}>
                          <BusIcon />
                          {bus}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Detail panel */}
      {selectedDate && selectedGroups.length > 0 && (
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black text-purple-800 flex items-center gap-2">
              {new Date(selectedDate).toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long" })}
              <span className="px-2 py-0.5 bg-purple-700 text-white rounded-full text-[10px] font-bold">
                {(dayMap[selectedDate]?.van ?? 0) + (dayMap[selectedDate]?.bus ?? 0)} คัน
              </span>
            </p>
            <button onClick={() => setSelectedDate(null)} className="text-purple-400 hover:text-purple-700 text-sm font-bold">✕</button>
          </div>
          <div className="space-y-1.5">
            {selectedGroups.map((g, i) => (
              <div key={i} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-purple-200 shadow-sm">
                <span className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-black text-white tracking-wider ${
                  g.vehicleType === "Bus" ? "bg-rose-500" : "bg-purple-600"
                }`}>
                  {g.vehicleType === "Bus"
                    ? <BusIcon className="text-white" />
                    : <VanIcon className="text-white" />
                  }
                  {g.vehicleCount}
                </span>
                <div className="flex flex-wrap gap-1 flex-1">
                  {g.packages.map((p) => (
                    <span key={p} className="px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded text-[10px] font-mono font-bold border border-purple-200">{p}</span>
                  ))}
                </div>
                <span className="text-[10px] text-slate-500 whitespace-nowrap font-medium">{g.totalPax} PAX · {g.orderCount} orders</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function OTADashboard() {
  const { orders, packages, vehicleJoinGroups } = useOTAStore();
  const [periodType, setPeriodType] = useState<PeriodType>("month");
  const [refDate, setRefDate] = useState(today);
  const [customRange, setCustomRange] = useState({ start: fmtISO(today), end: fmtISO(today) });
  const [dateField, setDateField] = useState<"usage_date" | "booking_date">("usage_date");
  const [tab, setTab] = useState<Tab>("overview");

  // Platform ROI table sort
  type RoiCol = "name" | "gross" | "net" | "commission" | "rate";
  const [roiSort, setRoiSort] = useState<{ col: RoiCol; dir: "asc" | "desc" }>({ col: "net", dir: "desc" });
  const toggleRoiSort = (col: RoiCol) =>
    setRoiSort((s) => ({ col, dir: s.col === col && s.dir === "desc" ? "asc" : "desc" }));
  const SortIcon = ({ col }: { col: RoiCol }) => (
    <span className="ml-1 text-[10px] opacity-60">
      {roiSort.col === col ? (roiSort.dir === "desc" ? "▼" : "▲") : "⇅"}
    </span>
  );

  const { start: startDate, end: endDate, label: periodLabel, year, month } = useMemo(() => {
    if (periodType === "custom") {
      const s = customRange.start || fmtISO(today);
      const e = customRange.end || fmtISO(today);
      const d = new Date(s);
      return {
        start: s, end: e,
        label: `${s} – ${e}`,
        year: d.getFullYear(),
        month: d.getMonth() + 1,
      };
    }
    return computePeriod(refDate, periodType);
  }, [refDate, periodType, customRange]);

  const monthOrders = useMemo(
    () => orders.filter((o) => (o[dateField] ?? o.usage_date) >= startDate && (o[dateField] ?? o.usage_date) <= endDate),
    [orders, startDate, endDate, dateField]
  );

  // Previous period for comparison badges
  const { start: prevStart, end: prevEnd } = useMemo(
    () => computePeriod(shiftRef(refDate, periodType, -1), periodType),
    [refDate, periodType]
  );
  const prevMonthOrders = useMemo(
    () => orders.filter((o) => (o[dateField] ?? o.usage_date) >= prevStart && (o[dateField] ?? o.usage_date) <= prevEnd),
    [orders, prevStart, prevEnd, dateField]
  );

  // ── KPI values ────────────────────────────────────────────────────────────────
  const totalOrders = monthOrders.length;
  const totalRevenue = monthOrders.reduce((s, o) => s + o.revenue, 0);
  const totalGross = monthOrders.reduce((s, o) => s + (o.gross_price ?? 0), 0);
  const totalPax = monthOrders.reduce((s, o) => s + o.pax, 0);
  const avgPax = totalOrders > 0 ? (totalPax / totalOrders).toFixed(1) : "0";
  const revPAX = totalPax > 0 ? totalRevenue / totalPax : 0;
  const uniqueGroups = new Set(monthOrders.map((o) => o.group_number).filter(Boolean)).size;
  const monthName = new Date(year, month - 1, 1).toLocaleString("en", { month: "long" }); // kept for PDF export

  const momBadge = (curr: number, prev: number) =>
    prev === 0 ? undefined : { pct: ((curr - prev) / prev) * 100 };

  const prevOrders = prevMonthOrders.length;
  const prevRevenue = prevMonthOrders.reduce((s, o) => s + o.revenue, 0);
  const prevPax = prevMonthOrders.reduce((s, o) => s + o.pax, 0);

  const ytdRevenue = useMemo(() => {
    const ytdStart = `${year}-01-01`;
    const ytdEnd   = periodType === "ytd" ? endDate : fmtISO(today);
    return orders.filter((o) => (o[dateField] ?? o.usage_date) >= ytdStart && (o[dateField] ?? o.usage_date) <= ytdEnd)
      .reduce((s, o) => s + o.revenue, 0);
  }, [orders, year, periodType, endDate, dateField]);

  const commissionTotal = useMemo(
    () => monthOrders.reduce((s, o) => s + (o.gross_price * o.commission_pct) / 100, 0),
    [monthOrders]
  );
  const discountTotal = useMemo(
    () => monthOrders.reduce((s, o) => s + (o.discount ?? 0), 0),
    [monthOrders]
  );

  // ── OVERVIEW data ─────────────────────────────────────────────────────────────
  const platformOrderData = useMemo(() => {
    const map: Record<string, number> = {};
    monthOrders.forEach((o) => { map[o.platform] = (map[o.platform] ?? 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [monthOrders]);

  const platformPaxData = useMemo(() => {
    const map: Record<string, number> = {};
    monthOrders.forEach((o) => { map[o.platform] = (map[o.platform] ?? 0) + o.pax; });
    return Object.entries(map).map(([name, pax]) => ({ name, pax }))
      .sort((a, b) => b.pax - a.pax);
  }, [monthOrders]);

  const monthlyData = useMemo(() => {
    const result = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1);
      const p = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const mo = orders.filter((o) => o.usage_date.startsWith(p));
      result.push({
        name: d.toLocaleString("en", { month: "short", year: "2-digit" }),
        orders: mo.length,
        pax: mo.reduce((s, o) => s + o.pax, 0),
        revenue: Math.round(mo.reduce((s, o) => s + o.revenue, 0) / 1000),
      });
    }
    return result;
  }, [orders, month, year]);

  const platformTrendData = useMemo(() => {
    const platforms = ["Trip.com", "KKday", "Agent Offline", "GetYourGuide", "Viator", "Airbnb"];
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1);
      const p = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const row: Record<string, string | number> = {
        name: d.toLocaleString("en", { month: "short", year: "2-digit" }),
      };
      platforms.forEach((pl) => {
        row[pl] = orders.filter((o) => o.usage_date.startsWith(p) && o.platform === pl).length;
      });
      result.push(row);
    }
    return result;
  }, [orders, month, year]);

  // ── REVENUE data ──────────────────────────────────────────────────────────────
  const revenueByPlatform = useMemo(() => {
    const map: Record<string, { gross: number; net: number }> = {};
    monthOrders.forEach((o) => {
      if (!map[o.platform]) map[o.platform] = { gross: 0, net: 0 };
      map[o.platform].gross += o.gross_price ?? 0;
      map[o.platform].net += o.revenue;
    });
    return Object.entries(map).map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.net - a.net);
  }, [monthOrders]);

  const revenueByPackage = useMemo(() => {
    const map: Record<string, { revenue: number; pax: number }> = {};
    monthOrders.forEach((o) => {
      const pkg = packages.find((p) => p.id === o.package_id);
      const code = pkg?.code ?? "Other";
      if (!map[code]) map[code] = { revenue: 0, pax: 0 };
      map[code].revenue += o.revenue;
      map[code].pax += o.pax;
    });
    return Object.entries(map).map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [monthOrders, packages]);

  const { topPkgByPlatformData, topPkgCodes } = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    const pkgTotals: Record<string, number> = {};
    monthOrders.forEach((o) => {
      const pkg = packages.find((p) => p.id === o.package_id);
      const code = pkg?.code ?? "Other";
      if (!map[o.platform]) map[o.platform] = {};
      map[o.platform][code] = (map[o.platform][code] ?? 0) + o.revenue;
      pkgTotals[code] = (pkgTotals[code] ?? 0) + o.revenue;
    });
    const topPkgCodes = Object.entries(pkgTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([c]) => c);
    const topPkgByPlatformData = Object.entries(map).map(([platform, pkgs]) => {
      const row: Record<string, string | number> = { platform };
      topPkgCodes.forEach((code) => { row[code] = pkgs[code] ?? 0; });
      return row;
    });
    return { topPkgByPlatformData, topPkgCodes };
  }, [monthOrders, packages]);

  const revPaxByPlatform = useMemo(() => {
    const map: Record<string, { rev: number; pax: number }> = {};
    monthOrders.forEach((o) => {
      if (!map[o.platform]) map[o.platform] = { rev: 0, pax: 0 };
      map[o.platform].rev += o.revenue;
      map[o.platform].pax += o.pax;
    });
    return Object.entries(map).map(([name, v]) => ({
      name,
      revPax: v.pax > 0 ? Math.round(v.rev / v.pax) : 0,
    })).sort((a, b) => b.revPax - a.revPax);
  }, [monthOrders]);

  // Revenue Forecast: 6 historical + current + 3 projected (linear extrapolation)
  const revenueForecast = useMemo(() => {
    const hist: { name: string; actual?: number; forecast?: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1);
      const p = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const mo = orders.filter((o) => o.usage_date.startsWith(p));
      hist.push({
        name: d.toLocaleString("en", { month: "short", year: "2-digit" }),
        actual: Math.round(mo.reduce((s, o) => s + o.revenue, 0) / 1000),
      });
    }
    hist.push({
      name: monthName.slice(0, 3) + " '" + String(year).slice(2),
      actual: Math.round(totalRevenue / 1000),
    });
    const last3 = hist.slice(-4, -1).map((h) => h.actual ?? 0);
    const avg = last3.length ? Math.round(last3.reduce((s, v) => s + v, 0) / last3.length) : 0;
    const trend =
      last3.length >= 2
        ? Math.round((last3[last3.length - 1] - last3[0]) / (last3.length - 1))
        : 0;
    for (let i = 1; i <= 3; i++) {
      const d = new Date(year, month - 1 + i, 1);
      hist.push({
        name: d.toLocaleString("en", { month: "short", year: "2-digit" }),
        forecast: Math.max(0, avg + trend * i),
      });
    }
    return hist;
  }, [orders, month, year, totalRevenue, monthName]);

  // ── OPERATIONS data ───────────────────────────────────────────────────────────
  const guideData = useMemo(() => {
    const map: Record<string, number> = {};
    monthOrders.forEach((o) => {
      const g = o.guide_name ?? "No Guide";
      map[g] = (map[g] ?? 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [monthOrders]);

  const dowData = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    monthOrders.forEach((o) => {
      const d = new Date(o.usage_date);
      const dow = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
      counts[dow] += 1;
    });
    return DOW_LABELS.map((label, i) => ({ label, orders: counts[i] }));
  }, [monthOrders]);

  const leadTimeData = useMemo(() => {
    const buckets: Record<string, number> = {
      "Same Day": 0, "1-3 d": 0, "4-7 d": 0, "1-2 wk": 0, "2-4 wk": 0, "1+ mo": 0,
    };
    monthOrders.forEach((o) => {
      const diff = Math.round(
        (new Date(o.usage_date).getTime() - new Date(o.booking_date).getTime()) / 86400000
      );
      if (diff <= 0) buckets["Same Day"]++;
      else if (diff <= 3) buckets["1-3 d"]++;
      else if (diff <= 7) buckets["4-7 d"]++;
      else if (diff <= 14) buckets["1-2 wk"]++;
      else if (diff <= 28) buckets["2-4 wk"]++;
      else buckets["1+ mo"]++;
    });
    return Object.entries(buckets).map(([label, count]) => ({ label, count }));
  }, [monthOrders]);

  const hotelData = useMemo(() => {
    const map: Record<string, number> = {};
    monthOrders.forEach((o) => {
      const h = o.pickup_hotel?.trim();
      if (h) map[h] = (map[h] ?? 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
  }, [monthOrders]);

  // ── Vehicle groups (always by usage_date, regardless of dateField) ────────────
  const vehicleGroupKeyFn = useMemo(
    () => buildVehicleGroupKeyFn(vehicleJoinGroups),
    [vehicleJoinGroups]
  );

  const vehicleGroups = useMemo<VehicleGroup[]>(() => {
    const opsOrders = orders.filter(
      (o) => o.usage_date >= startDate && o.usage_date <= endDate
    );
    const map: Record<string, { packages: Set<string>; pax: number; orders: number }> = {};
    opsOrders.forEach((o) => {
      const pkg = packages.find((p) => p.id === o.package_id);
      const code = pkg?.code ?? "Other";
      const gk = vehicleGroupKeyFn(code);
      const key = `${o.usage_date}||${gk}`;
      if (!map[key]) map[key] = { packages: new Set(), pax: 0, orders: 0 };
      map[key].packages.add(code);
      map[key].pax += o.pax;
      map[key].orders += 1;
    });
    return Object.entries(map).map(([key, v]) => {
      const [date, gk] = key.split("||");
      const { count, type } = calcVehicles(v.pax);
      return {
        date,
        groupKey: gk,
        packages: [...v.packages].sort(),
        orderCount: v.orders,
        totalPax: v.pax,
        vehicleCount: count,
        vehicleType: type,
      };
    }).sort((a, b) => a.date.localeCompare(b.date) || a.groupKey.localeCompare(b.groupKey));
  }, [orders, packages, startDate, endDate, vehicleGroupKeyFn]);

  const totalVehiclesUsed = useMemo(
    () => vehicleGroups.reduce((s, g) => s + g.vehicleCount, 0),
    [vehicleGroups]
  );

  // จำนวนกรุ๊ปดิบ ก่อนใช้ Join Rules (แต่ละ package+date = 1 กรุ๊ป)
  const rawGroupCount = useMemo(() => {
    const opsOrders = orders.filter(
      (o) => o.usage_date >= startDate && o.usage_date <= endDate
    );
    const seen = new Set<string>();
    opsOrders.forEach((o) => {
      const pkg = packages.find((p) => p.id === o.package_id);
      const code = pkg?.code ?? "Other";
      seen.add(`${o.usage_date}||${code}`);
    });
    return seen.size;
  }, [orders, packages, startDate, endDate]);

  const packageData = useMemo(() => {
    const map: Record<string, { orders: number; pax: number }> = {};
    monthOrders.forEach((o) => {
      const pkg = packages.find((p) => p.id === o.package_id);
      const code = pkg?.code ?? "Other";
      if (!map[code]) map[code] = { orders: 0, pax: 0 };
      map[code].orders += 1;
      map[code].pax += o.pax;
    });
    return Object.entries(map).map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.orders - a.orders);
  }, [monthOrders, packages]);

  // ── MARKETS data ──────────────────────────────────────────────────────────────
  const nationalityData = useMemo(() => {
    const map: Record<string, number> = {};
    monthOrders.forEach((o) => {
      if (o.nationality) map[o.nationality] = (map[o.nationality] ?? 0) + o.pax;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, pax]) => ({ name, pax }));
  }, [monthOrders]);

  const top5Nationalities = useMemo(() => {
    const map: Record<string, number> = {};
    orders.forEach((o) => { if (o.nationality) map[o.nationality] = (map[o.nationality] ?? 0) + o.pax; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n]) => n);
  }, [orders]);

  const nationalityTrend = useMemo(() => {
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1);
      const p = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const mo = orders.filter((o) => o.usage_date.startsWith(p));
      const row: Record<string, string | number> = {
        name: d.toLocaleString("en", { month: "short", year: "2-digit" }),
      };
      top5Nationalities.forEach((nat) => {
        row[nat] = mo.filter((o) => o.nationality === nat).reduce((s, o) => s + o.pax, 0);
      });
      result.push(row);
    }
    return result;
  }, [orders, month, year, top5Nationalities]);

  const platformsInMonth = useMemo(
    () => [...new Set(monthOrders.map((o) => o.platform))],
    [monthOrders]
  );

  const natPlatformData = useMemo(() => {
    const top8Nat = nationalityData.slice(0, 8).map((n) => n.name);
    return top8Nat.map((nat) => {
      const row: Record<string, string | number> = { name: nat };
      platformsInMonth.forEach((pl) => {
        row[pl] = monthOrders.filter((o) => o.nationality === nat && o.platform === pl)
          .reduce((s, o) => s + o.pax, 0);
      });
      return row;
    });
  }, [monthOrders, nationalityData, platformsInMonth]);

  // ── Navigation ────────────────────────────────────────────────────────────────
  const navPrev = () => setRefDate((d) => shiftRef(d, periodType, -1));
  const navNext = () => setRefDate((d) => shiftRef(d, periodType, 1));
  const canNavNext = periodType !== "ytd" && periodType !== "custom" && endDate < fmtISO(today);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4 md:space-y-6">
      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">OTA Dashboard</h1>
          <p className="text-muted-foreground text-xs md:text-sm hidden sm:block">วิเคราะห์ performance OTA</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            onClick={() => downloadOTAReport({
              month, year, monthName,
              generatedAt: new Date().toISOString(),
              totalOrders, totalRevenue, totalGross, totalPax,
              avgPax, revPAX, uniqueGroups, ytdRevenue,
              commissionTotal, discountTotal,
              prevOrders, prevRevenue, prevPax,
              revenueByPlatform, platformOrderData, monthlyData, revenueByPackage, nationalityData,
              topPickupHotels: hotelData.slice(0, 8),
            })}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          >
            <FileDown className="w-4 h-4" />
            <span className="hidden sm:inline">Export PDF</span>
          </button>

          {/* Date field toggle */}
          <div className="flex items-center bg-muted rounded-lg p-0.5 gap-0.5">
            <button
              onClick={() => setDateField("usage_date")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                dateField === "usage_date" ? "bg-purple-600 text-white" : "text-muted-foreground hover:text-foreground"
              }`}
              title="กรองตามวันที่ใช้บริการ"
            >📅 ใช้บริการ</button>
            <button
              onClick={() => setDateField("booking_date")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                dateField === "booking_date" ? "bg-purple-600 text-white" : "text-muted-foreground hover:text-foreground"
              }`}
              title="กรองตามวันที่รับออร์เดอร์"
            >🛒 รับออร์เดอร์</button>
          </div>

          {/* Period type pills */}
          <div className="flex items-center bg-muted rounded-lg p-0.5 gap-0.5">
            {(Object.keys(PERIOD_LABELS) as PeriodType[]).map((p) => (
              <button key={p}
                onClick={() => setPeriodType(p)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  periodType === p
                    ? "bg-purple-600 text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>

          {/* Period navigator (hidden for custom) */}
          {periodType !== "custom" && (
            <div className="flex items-center gap-1 bg-muted rounded-lg px-2 py-1.5">
              {periodType !== "ytd" && (
                <button onClick={navPrev} className="hover:text-purple-600 transition-colors text-muted-foreground px-1">◀</button>
              )}
              {periodType === "ytd" && (
                <button onClick={navPrev} className="hover:text-purple-600 transition-colors text-muted-foreground px-1">◀</button>
              )}
              <span className="text-sm font-semibold min-w-[120px] text-center">{periodLabel}</span>
              {periodType !== "ytd" ? (
                <button onClick={navNext} disabled={!canNavNext}
                  className={`px-1 transition-colors ${canNavNext ? "hover:text-purple-600 text-muted-foreground" : "text-muted-foreground/30 cursor-not-allowed"}`}>▶</button>
              ) : (
                <span className="px-1 text-muted-foreground/30">▶</span>
              )}
            </div>
          )}
          {/* Custom date range picker */}
          {periodType === "custom" && (
            <div className="flex items-center gap-1.5 bg-muted rounded-lg px-2 py-1">
              <input
                type="date"
                value={customRange.start}
                max={customRange.end}
                onChange={(e) => setCustomRange((r) => ({ ...r, start: e.target.value }))}
                className="text-xs bg-background border border-border rounded px-1.5 py-0.5 text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
              <span className="text-xs text-muted-foreground">–</span>
              <input
                type="date"
                value={customRange.end}
                min={customRange.start}
                onChange={(e) => setCustomRange((r) => ({ ...r, end: e.target.value }))}
                className="text-xs bg-background border border-border rounded px-1.5 py-0.5 text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* ── KPI Cards — horizontal scroll on mobile ───────────────────────────── */}
      {/* Top 4 in 2×2 grid */}
      <div className="grid grid-cols-2 gap-3">
        <KPICard
          icon={ShoppingCart} label="Orders" value={String(totalOrders)}
          color="bg-purple-100 dark:bg-purple-900/40 text-purple-600"
          badge={momBadge(totalOrders, prevOrders)}
        />
        <KPICard
          icon={Banknote} label="Net Revenue" value={fmtB(totalRevenue)}
          color="bg-green-100 dark:bg-green-900/40 text-green-600"
          badge={momBadge(totalRevenue, prevRevenue)}
        />
        <KPICard
          icon={Users} label="People" value={String(totalPax)}
          color="bg-pink-100 dark:bg-pink-900/40 text-pink-600"
          badge={momBadge(totalPax, prevPax)}
        />
        <KPICard
          icon={DollarSign} label="Gross Revenue" value={fmtB(totalGross)}
          color="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600"
        />
      </div>
      {/* Secondary 5 KPIs — horizontal scroll strip on mobile, grid on desktop */}
      <div className="flex md:grid md:grid-cols-5 gap-3 overflow-x-auto pb-1 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0">
        {[
          { icon: TrendingUp, label: "Avg / Order",    value: avgPax,                   color: "bg-blue-100 dark:bg-blue-900/40 text-blue-600",    sub: undefined as string | undefined },
          { icon: BarChart3,  label: "RevPAX",         value: fmtB(revPAX),             color: "bg-violet-100 dark:bg-violet-900/40 text-violet-600", sub: "รายได้ต่อคน" },
          { icon: Bus,        label: "กรุ๊ป (โปรแกรม)", value: String(rawGroupCount),    color: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600", sub: "กรุ๊ป" },
          { icon: Bus,        label: "Vehicles Used",  value: String(totalVehiclesUsed), color: "bg-orange-100 dark:bg-orange-900/40 text-orange-600", sub: "คัน" },
          { icon: Layers,     label: "YTD Revenue",    value: fmtBK(ytdRevenue),        color: "bg-rose-100 dark:bg-rose-900/40 text-rose-600",    sub: `ทั้งปี ${year}` },
        ].map((k) => (
          <div key={k.label} className="shrink-0 w-40 md:w-auto">
            <KPICard icon={k.icon} label={k.label} value={k.value} color={k.color} sub={k.sub} />
          </div>
        ))}
      </div>

      {/* ── Tab bar — full-width segmented control ────────────────────────────── */}
      <div className="grid grid-cols-4 bg-muted rounded-xl p-1 gap-1">
        {([
          { key: "overview",    emoji: "📊", label: "Overview"  },
          { key: "revenue",     emoji: "💰", label: "Revenue"   },
          { key: "operations",  emoji: "⚙️", label: "Ops"       },
          { key: "markets",     emoji: "🌏", label: "Markets"   },
        ] as { key: Tab; emoji: string; label: string }[]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex flex-col items-center justify-center py-2 rounded-lg text-[11px] font-medium transition-colors gap-0.5 ${
              tab === t.key
                ? "bg-card text-purple-600 shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="text-base leading-none">{t.emoji}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>


      {/* ── Tab: Overview ─────────────────────────────────────────────────────── */}
      {tab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ChartCard title="Orders by Platform">
              {platformOrderData.length === 0 ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={platformOrderData} dataKey="value" nameKey="name"
                      cx="50%" cy="50%" outerRadius={80}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {platformOrderData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <RTooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="People by Platform">
              {platformPaxData.length === 0 ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={platformPaxData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11 }} />
                    <RTooltip />
                    <Bar dataKey="pax" fill="#db2777" radius={[0, 4, 4, 0]} name="คน" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          {/* Monthly Comparison — แยกเป็น 2 charts ไม่งงกว่า dual-axis เดิม */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ChartCard title="Orders & People — รายเดือน (12 เดือน)">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData} barGap={2} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} domain={[0, "auto"]} />
                  <RTooltip />
                  <Legend />
                  <Bar dataKey="orders" fill="#7c3aed" name="Orders" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pax" fill="#db2777" name="People" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Revenue (฿k) — รายเดือน (12 เดือน)">
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, "auto"]} />
                  <RTooltip formatter={(v: number) => [`฿${(v * 1000).toLocaleString()}`, "Revenue"]} />
                  <Bar dataKey="revenue" fill="#a78bfa" name="Revenue (฿k)" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="revenue" stroke="#7c3aed" strokeWidth={2} dot={{ r: 3 }} tooltipType="none" legendType="none" />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <ChartCard title="Platform Order Trend (Last 6 Months)">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={platformTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <RTooltip />
                <Legend />
                {["Trip.com", "KKday", "Agent Offline", "GetYourGuide", "Viator", "Airbnb"].map((pl, i) => (
                  <Line key={pl} type="monotone" dataKey={pl} stroke={COLORS[i]} strokeWidth={2} dot={{ r: 3 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {/* ── Tab: Revenue ──────────────────────────────────────────────────────── */}
      {tab === "revenue" && (
        <div className="space-y-4">
          <ChartCard title="Gross vs. Net Revenue by Platform">
            {revenueByPlatform.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={revenueByPlatform}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <RTooltip formatter={(v: number) => `฿${v.toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="gross" fill="#a78bfa" name="Gross Revenue" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="net" fill="#7c3aed" name="Net Revenue" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ChartCard title="Net Revenue by Package">
              {revenueByPackage.length === 0 ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={revenueByPackage} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <YAxis dataKey="name" type="category" width={50} tick={{ fontSize: 11 }} />
                    <RTooltip formatter={(v: number) => `฿${v.toLocaleString()}`} />
                    <Bar dataKey="revenue" fill="#7c3aed" radius={[0, 4, 4, 0]} name="Net Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="RevPAX (รายได้/คน) by Platform">
              {revPaxByPlatform.length === 0 ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={revPaxByPlatform} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `฿${v}`} />
                    <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11 }} />
                    <RTooltip formatter={(v: number) => `฿${v.toLocaleString()}`} />
                    <Bar dataKey="revPax" fill="#db2777" radius={[0, 4, 4, 0]} name="RevPAX" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          <ChartCard title="Platform ROI — Commission Analysis">
            {revenueByPlatform.length === 0 ? <EmptyChart /> : (() => {
              const roiRows = [...revenueByPlatform].sort((a, b) => {
                const commission = (r: typeof a) => r.gross - r.net;
                const rate = (r: typeof a) => r.gross > 0 ? (r.gross - r.net) / r.gross : 0;
                const valA = roiSort.col === "name" ? a.name : roiSort.col === "gross" ? a.gross : roiSort.col === "net" ? a.net : roiSort.col === "commission" ? commission(a) : rate(a);
                const valB = roiSort.col === "name" ? b.name : roiSort.col === "gross" ? b.gross : roiSort.col === "net" ? b.net : roiSort.col === "commission" ? commission(b) : rate(b);
                if (typeof valA === "string") return roiSort.dir === "asc" ? valA.localeCompare(valB as string) : (valB as string).localeCompare(valA);
                return roiSort.dir === "asc" ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
              });
              return (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b border-border">
                      {([
                        { col: "name" as RoiCol,       label: "Platform",       align: "left"  },
                        { col: "gross" as RoiCol,      label: "Gross Revenue",  align: "right" },
                        { col: "net" as RoiCol,        label: "Net Revenue",    align: "right" },
                        { col: "commission" as RoiCol, label: "Commission (฿)", align: "right" },
                        { col: "rate" as RoiCol,       label: "Eff. Rate",      align: "right" },
                      ] as { col: RoiCol; label: string; align: string }[]).map(({ col, label, align }) => (
                        <th key={col}
                          className={`pb-2 font-medium cursor-pointer select-none hover:text-foreground transition-colors ${align === "right" ? "text-right" : ""}`}
                          onClick={() => toggleRoiSort(col)}>
                          {label}<SortIcon col={col} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {roiRows.map((r) => {
                      const commission = r.gross - r.net;
                      const rate = r.gross > 0 ? (commission / r.gross) * 100 : 0;
                      return (
                        <tr key={r.name} className="hover:bg-muted/40 transition-colors">
                          <td className="py-2.5 font-medium">{r.name}</td>
                          <td className="py-2.5 text-right text-muted-foreground tabular-nums">{fmtB(r.gross)}</td>
                          <td className="py-2.5 text-right font-semibold text-purple-600 dark:text-purple-400 tabular-nums">{fmtB(r.net)}</td>
                          <td className="py-2.5 text-right text-rose-500 dark:text-rose-400 tabular-nums">{fmtB(commission)}</td>
                          <td className="py-2.5 text-right">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              rate < 10
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : rate < 20
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            }`}>
                              {rate.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border font-bold">
                      <td className="pt-2.5">Total</td>
                      <td className="pt-2.5 text-right text-muted-foreground tabular-nums">{fmtB(totalGross)}</td>
                      <td className="pt-2.5 text-right text-purple-600 dark:text-purple-400 tabular-nums">{fmtB(totalRevenue)}</td>
                      <td className="pt-2.5 text-right text-rose-500 dark:text-rose-400 tabular-nums">{fmtB(totalGross - totalRevenue)}</td>
                      <td className="pt-2.5 text-right">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-foreground">
                          {totalGross > 0 ? (((totalGross - totalRevenue) / totalGross) * 100).toFixed(1) : "0.0"}%
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              );
            })()}
          </ChartCard>

          <ChartCard title="Top Packages by Platform (Net Revenue — เดือนนี้)">
            {topPkgByPlatformData.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topPkgByPlatformData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="platform" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <RTooltip formatter={(v: number) => `฿${v.toLocaleString()}`} />
                  <Legend />
                  {topPkgCodes.map((code, i) => (
                    <Bar key={code} dataKey={code} stackId="a" fill={COLORS[i % COLORS.length]} name={code} radius={i === topPkgCodes.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Revenue Forecast (฿k) — 6 เดือนที่ผ่านมา + 3 เดือนคาดการณ์">
            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
              <span className="flex items-center gap-1"><span className="w-6 h-0.5 bg-purple-600 inline-block" /> Actual</span>
              <span className="flex items-center gap-1"><span className="w-6 h-0.5 bg-purple-300 inline-block border-dashed border-t border-purple-300" /> Forecast (avg trend)</span>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={revenueForecast}>
                <defs>
                  <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `฿${v}k`} />
                <RTooltip formatter={(v: number) => [`฿${v}k`]} />
                <Legend />
                <Area
                  type="monotone" dataKey="actual" stroke="#7c3aed"
                  fill="url(#actualGrad)" strokeWidth={2} name="Actual" connectNulls
                />
                <Area
                  type="monotone" dataKey="forecast" stroke="#a78bfa"
                  fill="url(#forecastGrad)" strokeWidth={2} strokeDasharray="6 3"
                  name="Forecast" connectNulls
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {/* ── Tab: Operations ───────────────────────────────────────────────────── */}
      {tab === "operations" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ChartCard title="Guide Language Breakdown">
              {guideData.length === 0 ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={guideData} dataKey="value" nameKey="name"
                      cx="50%" cy="52%" outerRadius={80}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={{ strokeWidth: 1 }}
                    >
                      {guideData.map((entry, i) => (
                        <Cell key={i} fill={GUIDE_COLORS[entry.name] ?? COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <RTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Bookings by Day of Week (Usage Date)">
              {totalOrders === 0 ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dowData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RTooltip />
                    <Bar dataKey="orders" name="Orders" radius={[4, 4, 0, 0]}>
                      {dowData.map((entry, i) => (
                        <Cell key={i} fill={entry.label === "Sat" || entry.label === "Sun" ? "#db2777" : "#7c3aed"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          <ChartCard title="Booking Lead Time (ระยะห่างระหว่าง Booking → Usage Date)">
            {totalOrders === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={leadTimeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RTooltip />
                  <Bar dataKey="count" name="Orders" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Orders & People by Package">
            {packageData.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={packageData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RTooltip />
                  <Legend />
                  <Bar dataKey="orders" fill="#7c3aed" name="Orders" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pax" fill="#db2777" name="People" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* ── Vehicle Summary — Calendar Grid ──────────────────────────── */}
          <ChartCard title={`Vehicle Summary — ${rawGroupCount} กรุ๊ป · ${totalVehiclesUsed} คัน`}>
            {vehicleGroups.length === 0 ? <EmptyChart /> : (
              <VehicleCalendar
                vehicleGroups={vehicleGroups}
                year={year}
                month={month}
                totalVehiclesUsed={totalVehiclesUsed}
              />
            )}
          </ChartCard>

          <ChartCard title={`Pickup Hotels — ${hotelData.length} แห่งในเดือนนี้`}>
            {hotelData.length === 0 ? (
              <EmptyChart />
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {hotelData.map((h, i) => (
                  <div key={h.name} className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        i === 0 ? "bg-yellow-400 text-yellow-900" :
                        i === 1 ? "bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200" :
                        i === 2 ? "bg-orange-300 text-orange-800" :
                        "bg-muted text-muted-foreground"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{h.name}</div>
                      <div className="h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full transition-all"
                          style={{ width: `${(h.count / hotelData[0].count) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-bold text-muted-foreground tabular-nums">{h.count}</span>
                  </div>
                ))}
              </div>
            )}
          </ChartCard>
        </div>
      )}

      {/* ── Tab: Markets ──────────────────────────────────────────────────────── */}
      {tab === "markets" && (
        <div className="space-y-4">
          <ChartCard title="People by Nationality (Top 10) — เดือนนี้">
            {nationalityData.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={nationalityData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 11 }} />
                  <RTooltip />
                  <Bar dataKey="pax" fill="#7c3aed" radius={[0, 4, 4, 0]} name="คน" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Nationality Trend — Top 5 Markets (6 เดือนที่ผ่านมา)">
            {top5Nationalities.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={nationalityTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RTooltip />
                  <Legend />
                  {top5Nationalities.map((nat, i) => (
                    <Line key={nat} type="monotone" dataKey={nat} stroke={COLORS[i]} strokeWidth={2} dot={{ r: 3 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Nationality × Platform (People — เดือนนี้)">
            {natPlatformData.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={natPlatformData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RTooltip />
                  <Legend />
                  {platformsInMonth.map((pl, i) => (
                    <Bar key={pl} dataKey={pl} stackId="a" fill={COLORS[i % COLORS.length]} name={pl} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      )}
    </div>
  );
}
