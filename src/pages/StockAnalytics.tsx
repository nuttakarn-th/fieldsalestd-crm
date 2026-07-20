/**
 * StockAnalytics.tsx — YoY Stock Analytics Dashboard
 * เปรียบเทียบสถิติ Period ปีต่อปี: โปรแกรม, ที่นั่ง, Booking Rate, มูลค่า
 */
import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, Cell, PieChart, Pie,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, CalendarDays, Globe, Users, Wallet, BarChart3, Camera, Activity, Clock, Lightbulb, AlertTriangle, CheckCircle2, Bell } from "lucide-react";
import { useServices } from "@/store/serviceStore";
import type { TourPeriod, TourItem } from "@/store/serviceStore";
import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";
import { useAtRiskPeriods } from "@/components/AtRiskNotification";

// ── helpers ──────────────────────────────────────────────────────────────────
const BE = (y: number) => y + 543; // CE → Buddhist Era
const CE_NOW = new Date().getFullYear();

const MONTHS_TH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
                   "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

function fmtMB(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString();
}

type PeriodRow = TourPeriod & { country: string; category: string };

// ── derive flat period list with parent meta ──────────────────────────────────
function useFlatPeriods(): PeriodRow[] {
  const tours = useServices((s) => s.tours);
  return useMemo(() => {
    const rows: PeriodRow[] = [];
    for (const t of tours) {
      for (const p of t.periods ?? []) {
        if (p.start_date) {
          rows.push({ ...p, country: t.country, category: t.category });
        }
      }
    }
    return rows;
  }, [tours]);
}

// ── aggregate stats for a given year ─────────────────────────────────────────
interface YearStats {
  periods: number;
  totalSeats: number;
  booked: number;
  rate: number;          // %
  revenue: number;
  byMonth: { m: number; periods: number; booked: number; rate: number }[];
  byCountry: { country: string; periods: number; booked: number; rate: number; revenue: number }[];
  byCategory: { cat: string; periods: number; booked: number }[];
}

function calcYear(rows: PeriodRow[], year: number): YearStats {
  const filtered = rows.filter((p) => {
    const y = new Date(p.start_date!).getFullYear();
    return y === year && !p.cancelled;
  });

  const totalSeats = filtered.reduce((s, p) => s + p.total_seats, 0);
  const booked = filtered.reduce((s, p) => s + (p.total_seats - p.quota), 0);
  const revenue = filtered.reduce((s, p) => {
    const price = (p.special_price && p.special_price > 0 && p.special_price < p.price_per_seat)
      ? p.special_price : p.price_per_seat;
    return s + (p.total_seats - p.quota) * price;
  }, 0);

  // by month (1-12)
  const byMonth = MONTHS_TH.map((_, idx) => {
    const m = idx + 1;
    const ps = filtered.filter((p) => new Date(p.start_date!).getMonth() + 1 === m);
    const ts = ps.reduce((s, p) => s + p.total_seats, 0);
    const bk = ps.reduce((s, p) => s + (p.total_seats - p.quota), 0);
    return { m, periods: ps.length, booked: bk, rate: ts > 0 ? Math.round(bk / ts * 100) : 0 };
  });

  // by country
  const countryMap = new Map<string, { periods: number; ts: number; bk: number; rev: number }>();
  for (const p of filtered) {
    const c = countryMap.get(p.country) ?? { periods: 0, ts: 0, bk: 0, rev: 0 };
    const price = (p.special_price && p.special_price > 0 && p.special_price < p.price_per_seat)
      ? p.special_price : p.price_per_seat;
    countryMap.set(p.country, {
      periods: c.periods + 1,
      ts: c.ts + p.total_seats,
      bk: c.bk + (p.total_seats - p.quota),
      rev: c.rev + (p.total_seats - p.quota) * price,
    });
  }
  const byCountry = [...countryMap.entries()]
    .map(([country, d]) => ({ country, periods: d.periods, booked: d.bk, rate: d.ts > 0 ? Math.round(d.bk / d.ts * 100) : 0, revenue: d.rev }))
    .sort((a, b) => b.revenue - a.revenue);

  // by category
  const catMap = new Map<string, { periods: number; bk: number }>();
  for (const p of filtered) {
    const c = catMap.get(p.category) ?? { periods: 0, bk: 0 };
    catMap.set(p.category, { periods: c.periods + 1, bk: c.bk + (p.total_seats - p.quota) });
  }
  const byCategory = [...catMap.entries()].map(([cat, d]) => ({ cat, ...d })).sort((a, b) => b.periods - a.periods);

  return {
    periods: filtered.length,
    totalSeats,
    booked,
    rate: totalSeats > 0 ? Math.round(booked / totalSeats * 100) : 0,
    revenue,
    byMonth,
    byCountry,
    byCategory,
  };
}

// ── delta badge ───────────────────────────────────────────────────────────────
function Delta({ cur, prev, unit = "" }: { cur: number; prev: number; unit?: string }) {
  if (prev === 0) return <span className="text-xs text-muted-foreground">—</span>;
  const diff = cur - prev;
  const pct = Math.round(Math.abs(diff) / prev * 100);
  if (diff === 0) return <span className="flex items-center gap-0.5 text-xs text-muted-foreground"><Minus className="w-3 h-3" />0%</span>;
  if (diff > 0) return (
    <span className="flex items-center gap-0.5 text-xs text-emerald-600 font-semibold">
      <TrendingUp className="w-3 h-3" />+{pct}%{unit && ` (${unit}${diff.toLocaleString()})`}
    </span>
  );
  return (
    <span className="flex items-center gap-0.5 text-xs text-red-500 font-semibold">
      <TrendingDown className="w-3 h-3" />-{pct}%{unit && ` (${unit}${Math.abs(diff).toLocaleString()})`}
    </span>
  );
}

// ── KPI card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, curVal, prevVal, format, color }:
  { icon: typeof CalendarDays; label: string; curVal: number; prevVal: number; format: (n: number) => string; color: string }) {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wide">
        <Icon className="w-4 h-4" style={{ color }} />
        {label}
      </div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-2xl font-bold text-foreground leading-none">{format(curVal)}</p>
          <p className="text-xs text-muted-foreground mt-1">ปีก่อน: {format(prevVal)}</p>
        </div>
        <Delta cur={curVal} prev={prevVal} />
      </div>
    </div>
  );
}

// ── PIE COLORS ────────────────────────────────────────────────────────────────
const PIE_COLORS = ["#7C3AED", "#EC4899", "#F59E0B", "#10B981", "#3B82F6", "#6366F1", "#EF4444", "#14B8A6"];

// ── At-Risk Banner (ใน StockAnalytics page) ───────────────────────────────────
function AtRiskBanner() {
  const atRisk = useAtRiskPeriods();
  const [collapsed, setCollapsed] = useState(true);
  if (atRisk.length === 0) return null;

  const critical = atRisk.filter((p) => p.level === "critical");
  const warning  = atRisk.filter((p) => p.level === "warning");
  const hasCrit  = critical.length > 0;

  return (
    <div className={`rounded-2xl border-2 overflow-hidden transition-all ${hasCrit ? "border-red-200 bg-red-50 dark:border-red-500/40 dark:bg-red-950/40" : "border-amber-200 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-950/40"}`}>
      {/* Header row */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:opacity-80 transition-opacity"
      >
        <Bell className={`w-4 h-4 shrink-0 ${hasCrit ? "text-red-500 dark:text-red-400" : "text-amber-500 dark:text-amber-400"}`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold ${hasCrit ? "text-red-700 dark:text-red-300" : "text-amber-700 dark:text-amber-300"}`}>
            {hasCrit ? `🚨 ${critical.length} Period ต้องโปรโมทด่วน` : `⚠ ${warning.length} Period เฝ้าระวัง`}
            {hasCrit && warning.length > 0 && (
              <span className="ml-2 text-xs font-normal text-amber-600 dark:text-amber-400">+ ⚠ {warning.length} อยู่ในเฝ้าระวัง</span>
            )}
          </p>
          <p className={`text-xs ${hasCrit ? "text-red-500 dark:text-red-400/80" : "text-amber-500 dark:text-amber-400/80"}`}>
            fill rate &lt; 40% ใกล้วันเดินทาง — คลิกเพื่อดูรายละเอียด
          </p>
        </div>
        <span className={`text-xs font-semibold shrink-0 ${hasCrit ? "text-red-400 dark:text-red-400/70" : "text-amber-400 dark:text-amber-400/70"}`}>
          {collapsed ? "▸ ขยาย" : "▾ ย่อ"}
        </span>
      </button>

      {/* Collapsible period list */}
      {!collapsed && (
        <div className="border-t border-current/10">
          {/* Critical */}
          {critical.length > 0 && (
            <div>
              <div className="px-4 py-1.5 bg-red-100 dark:bg-red-500/20 text-[10px] font-bold uppercase text-red-600 dark:text-red-300 tracking-wider">
                🚨 ด่วนมาก — เหลือ ≤ 7 วัน ({critical.length} period)
              </div>
              <div className="divide-y divide-red-100 dark:divide-red-900/40">
                {critical.map((p) => <AtRiskRow key={p.periodId} p={p} />)}
              </div>
            </div>
          )}
          {/* Warning */}
          {warning.length > 0 && (
            <div>
              <div className="px-4 py-1.5 bg-amber-100 dark:bg-amber-500/20 text-[10px] font-bold uppercase text-amber-600 dark:text-amber-300 tracking-wider">
                ⚠ เฝ้าระวัง — เหลือ 8–30 วัน ({warning.length} period)
              </div>
              <div className="divide-y divide-amber-100 dark:divide-amber-900/40">
                {warning.map((p) => <AtRiskRow key={p.periodId} p={p} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AtRiskRow({ p }: { p: ReturnType<typeof useAtRiskPeriods>[number] }) {
  const isCrit = p.level === "critical";
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
  return (
    <div className="px-4 py-2.5 flex items-center gap-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
      <span className={`shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full text-white ${isCrit ? "bg-red-500" : "bg-amber-400"}`}>
        {p.daysLeft}d
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground truncate">{p.tourCode} · {p.tourCity}</p>
        <p className="text-[10px] text-muted-foreground">{p.country} · เดินทาง {fmtDate(p.startDate)}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className={`text-sm font-bold ${isCrit ? "text-red-500 dark:text-red-400" : "text-amber-500 dark:text-amber-400"}`}>{p.fillRate}%</p>
        <p className="text-[10px] text-muted-foreground">ว่าง {p.quota} ที่</p>
      </div>
      {/* mini fill bar */}
      <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden shrink-0">
        <div className="h-full rounded-full" style={{ width: `${p.fillRate}%`, background: isCrit ? "#EF4444" : "#F59E0B" }} />
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function StockAnalytics() {
  const allPeriods = useFlatPeriods();

  // derive available years from data
  const availableYears = useMemo(() => {
    const ys = new Set<number>();
    for (const p of allPeriods) {
      ys.add(new Date(p.start_date!).getFullYear());
    }
    const sorted = [...ys].sort((a, b) => b - a);
    // ensure current year is always present
    if (!ys.has(CE_NOW)) sorted.unshift(CE_NOW);
    return sorted;
  }, [allPeriods]);

  const [yearA, setYearA] = useState(CE_NOW);          // ปีปัจจุบัน (หลัก)
  const [yearB, setYearB] = useState(CE_NOW - 1);      // ปีเปรียบเทียบ
  const [activeTab, setActiveTab] = useState<"yoy" | "pacing" | "predictive">("yoy");
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshotMsg, setSnapshotMsg] = useState<string | null>(null);
  const [pacingData, setPacingData] = useState<{ date: string; booked: number; label: string }[]>([]);
  const [pacingLoading, setPacingLoading] = useState(false);
  const tours = useServices((s) => s.tours);

  const statsA = useMemo(() => calcYear(allPeriods, yearA), [allPeriods, yearA]);
  const statsB = useMemo(() => calcYear(allPeriods, yearB), [allPeriods, yearB]);

  // ── Load pacing data from Supabase (period_snapshots) ────────────────────
  const loadPacingData = async () => {
    if (!SUPABASE_ENABLED || !supabase) return;
    setPacingLoading(true);
    const { data, error } = await supabase
      .from("period_snapshots")
      .select("snapshot_date, booked")
      .order("snapshot_date", { ascending: true });
    if (!error && data) {
      // aggregate booked by snapshot_date
      const agg = new Map<string, number>();
      for (const row of data as { snapshot_date: string; booked: number }[]) {
        agg.set(row.snapshot_date, (agg.get(row.snapshot_date) ?? 0) + row.booked);
      }
      setPacingData([...agg.entries()].map(([date, booked]) => ({
        date, booked,
        label: new Date(date).toLocaleDateString("th-TH", { day: "numeric", month: "short" }),
      })));
    }
    setPacingLoading(false);
  };

  // ── Take snapshot now ───────────────────────────────────────────────────────
  const takeSnapshot = async () => {
    if (!SUPABASE_ENABLED || !supabase) {
      setSnapshotMsg("⚠ Supabase ยังไม่ได้เปิดใช้งาน");
      return;
    }
    setSnapshotLoading(true);
    setSnapshotMsg(null);
    const today = new Date().toISOString().slice(0, 10);
    const rows: object[] = [];
    for (const t of tours as TourItem[]) {
      for (const p of t.periods ?? []) {
        if (!p.start_date || p.cancelled) continue;
        rows.push({
          snapshot_date: today,
          tour_id: t.id,
          period_id: p.period_id,
          tour_code: t.code,
          country: t.country,
          category: t.category,
          start_date: p.start_date,
          total_seats: p.total_seats,
          quota: p.quota,
          booked: p.total_seats - p.quota,
          price_per_seat: p.price_per_seat,
          special_price: p.special_price ?? null,
        });
      }
    }
    if (rows.length === 0) {
      setSnapshotMsg("ไม่มี period ที่ active");
      setSnapshotLoading(false);
      return;
    }
    // upsert — ถ้า snapshot วันนี้มีแล้วให้ update
    const { error } = await supabase
      .from("period_snapshots")
      .upsert(rows, { onConflict: "snapshot_date,period_id" });
    if (error) {
      setSnapshotMsg(`❌ Error: ${error.message}`);
    } else {
      setSnapshotMsg(`✅ บันทึก snapshot ${rows.length} period แล้ว (${today})`);
      loadPacingData();
    }
    setSnapshotLoading(false);
  };

  // monthly merged for chart
  const monthlyData = MONTHS_TH.map((label, i) => ({
    label,
    [`periods_${yearA}`]: statsA.byMonth[i].periods,
    [`periods_${yearB}`]: statsB.byMonth[i].periods,
    [`rate_${yearA}`]: statsA.byMonth[i].rate,
    [`rate_${yearB}`]: statsB.byMonth[i].rate,
  }));

  // top countries union
  const allCountries = useMemo(() => {
    const s = new Set([...statsA.byCountry.map((c) => c.country), ...statsB.byCountry.map((c) => c.country)]);
    return [...s].sort();
  }, [statsA, statsB]);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <div className="bg-card border-b border-border px-6 py-4 sticky top-0 z-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground">Stock Analytics</h1>
            <p className="text-xs text-muted-foreground">เปรียบเทียบสถิติปีต่อปี</p>
          </div>
        </div>

        {/* Year selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-muted/40 rounded-xl px-3 py-1.5">
            <span className="text-xs text-muted-foreground font-medium">เปรียบเทียบ</span>
            <select
              value={yearB}
              onChange={(e) => setYearB(Number(e.target.value))}
              className="text-xs font-bold bg-transparent border-0 outline-none text-violet-600 cursor-pointer"
            >
              {availableYears.filter((y) => y !== yearA).map((y) => (
                <option key={y} value={y}>พ.ศ. {BE(y)}</option>
              ))}
            </select>
            <span className="text-muted-foreground text-xs">vs</span>
            <select
              value={yearA}
              onChange={(e) => setYearA(Number(e.target.value))}
              className="text-xs font-bold bg-transparent border-0 outline-none text-pink-600 cursor-pointer"
            >
              {availableYears.filter((y) => y !== yearB).map((y) => (
                <option key={y} value={y}>พ.ศ. {BE(y)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-5 space-y-6 max-w-7xl mx-auto">

        {/* ── At-Risk Alert Banner ── */}
        <AtRiskBanner />

        {/* ── Tab switcher ── */}
        <div className="flex gap-1 bg-muted/40 rounded-xl p-1 w-fit">
          {([["yoy", "📊 YoY เปรียบเทียบ"], ["pacing", "📈 Pacing & Snapshot"], ["predictive", "🔮 Predictive"]] as const).map(([tab, label]) => (
            <button key={tab} type="button"
              onClick={() => { setActiveTab(tab); if (tab === "pacing") loadPacingData(); }}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === tab ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >{label}</button>
          ))}
        </div>

        {/* ── Legend pills ── */}
        <div className="flex items-center gap-3 text-xs font-semibold">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-pink-500 inline-block" />
            พ.ศ. {BE(yearA)} (ปีหลัก)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-violet-500 inline-block" />
            พ.ศ. {BE(yearB)} (เปรียบเทียบ)
          </span>
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard icon={CalendarDays} label="Period ทั้งหมด"
            curVal={statsA.periods} prevVal={statsB.periods}
            format={(n) => n.toLocaleString()} color="#EC4899" />
          <KpiCard icon={Users} label="ที่นั่งทั้งหมด"
            curVal={statsA.totalSeats} prevVal={statsB.totalSeats}
            format={(n) => n.toLocaleString()} color="#7C3AED" />
          <KpiCard icon={Users} label="ที่นั่งที่จอง"
            curVal={statsA.booked} prevVal={statsB.booked}
            format={(n) => n.toLocaleString()} color="#F59E0B" />
          <KpiCard icon={Globe} label="Booking Rate"
            curVal={statsA.rate} prevVal={statsB.rate}
            format={(n) => `${n}%`} color="#10B981" />
          <KpiCard icon={Wallet} label="มูลค่าประมาณ"
            curVal={statsA.revenue} prevVal={statsB.revenue}
            format={fmtMB} color="#3B82F6" />
        </div>

        {/* ── Monthly Period Count Chart ── */}
        <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
          <h2 className="text-sm font-bold text-foreground mb-4">จำนวน Period รายเดือน</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--popover))", color: "hsl(var(--popover-foreground))" }}
                formatter={(val, name) => {
                  const y = name === `periods_${yearA}` ? BE(yearA) : BE(yearB);
                  return [`${val} periods`, `พ.ศ. ${y}`];
                }}
              />
              <Bar dataKey={`periods_${yearB}`} fill="#7C3AED" radius={[4, 4, 0, 0]} maxBarSize={18} name={`periods_${yearB}`} />
              <Bar dataKey={`periods_${yearA}`} fill="#EC4899" radius={[4, 4, 0, 0]} maxBarSize={18} name={`periods_${yearA}`} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ── Monthly Booking Rate Line ── */}
        <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
          <h2 className="text-sm font-bold text-foreground mb-4">Booking Rate รายเดือน (%)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthlyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--popover))", color: "hsl(var(--popover-foreground))" }}
                formatter={(val, name) => {
                  const y = name === `rate_${yearA}` ? BE(yearA) : BE(yearB);
                  return [`${val}%`, `พ.ศ. ${y}`];
                }}
              />
              <Line dataKey={`rate_${yearB}`} stroke="#7C3AED" strokeWidth={2} dot={{ r: 3 }} name={`rate_${yearB}`} connectNulls />
              <Line dataKey={`rate_${yearA}`} stroke="#EC4899" strokeWidth={2} dot={{ r: 3 }} name={`rate_${yearA}`} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* ── Country Table + Category Pie ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Country breakdown table */}
          <div className="lg:col-span-2 bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b flex items-center gap-2">
              <Globe className="w-4 h-4 text-violet-500" />
              <h2 className="text-sm font-bold text-foreground">เปรียบเทียบรายประเทศ</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/30 text-muted-foreground">
                    <th className="text-left px-4 py-2 font-semibold">ประเทศ</th>
                    <th className="text-right px-3 py-2 font-semibold text-pink-500">Period {BE(yearA)}</th>
                    <th className="text-right px-3 py-2 font-semibold text-violet-500">Period {BE(yearB)}</th>
                    <th className="text-right px-3 py-2 font-semibold text-pink-500">Rate {BE(yearA)}</th>
                    <th className="text-right px-3 py-2 font-semibold text-violet-500">Rate {BE(yearB)}</th>
                    <th className="text-right px-4 py-2 font-semibold">Δ Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {allCountries.map((country) => {
                    const a = statsA.byCountry.find((c) => c.country === country);
                    const b = statsB.byCountry.find((c) => c.country === country);
                    const rateDiff = (a?.rate ?? 0) - (b?.rate ?? 0);
                    return (
                      <tr key={country} className="border-t border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2 font-medium text-foreground">{country}</td>
                        <td className="px-3 py-2 text-right font-bold text-pink-600">{a?.periods ?? 0}</td>
                        <td className="px-3 py-2 text-right font-bold text-violet-600">{b?.periods ?? 0}</td>
                        <td className="px-3 py-2 text-right">
                          <RateBar rate={a?.rate ?? 0} />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <RateBar rate={b?.rate ?? 0} color="#7C3AED" />
                        </td>
                        <td className="px-4 py-2 text-right">
                          {rateDiff !== 0 && (
                            <span className={`font-bold ${rateDiff > 0 ? "text-emerald-600" : "text-red-500"}`}>
                              {rateDiff > 0 ? "+" : ""}{rateDiff}%
                            </span>
                          )}
                          {rateDiff === 0 && <span className="text-muted-foreground">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                  {allCountries.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">ไม่มีข้อมูล</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Category pie */}
          <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
            <h2 className="text-sm font-bold text-foreground mb-1">หมวดหมู่ (พ.ศ. {BE(yearA)})</h2>
            <p className="text-xs text-muted-foreground mb-3">จำนวน Period แบ่งตาม Category</p>
            {statsA.byCategory.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-xs">ไม่มีข้อมูล</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={statsA.byCategory.map((c) => ({ name: c.cat, value: c.periods }))}
                      dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={70}
                      paddingAngle={2}>
                      {statsA.byCategory.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--popover))", color: "hsl(var(--popover-foreground))" }} formatter={(val) => [`${val} periods`]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1 mt-1">
                  {statsA.byCategory.slice(0, 7).map((c, i) => (
                    <div key={c.cat} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-foreground truncate max-w-[120px]">{c.cat}</span>
                      </div>
                      <span className="font-bold text-muted-foreground">{c.periods}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {activeTab === "yoy" && (<>

        {/* ── Seasonality Heatmap ── */}
        <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
          <h2 className="text-sm font-bold text-foreground mb-1">Seasonality — Booking Rate รายเดือน × ประเทศ (พ.ศ. {BE(yearA)})</h2>
          <p className="text-xs text-muted-foreground mb-4">ช่วยวางแผนว่าเดือนไหน ประเทศไหน ขายดีที่สุด</p>
          <SeasonalityHeatmap periods={allPeriods} year={yearA} />
        </div>

        </>)}

        {/* ── PACING TAB ── */}
        {activeTab === "pacing" && (<>

        {/* Snapshot control */}
        <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Camera className="w-4 h-4 text-violet-500" />
                <h2 className="text-sm font-bold text-foreground">บันทึก Snapshot วันนี้</h2>
              </div>
              <p className="text-xs text-muted-foreground max-w-sm">
                กดเพื่อบันทึกสถานะที่นั่งทุก period ณ วันนี้ลงฐานข้อมูล
                ข้อมูลจะใช้สร้าง Pacing chart แสดงว่ายอดจองสะสมเพิ่มขึ้นยังไงตามเวลา
              </p>
              {snapshotMsg && (
                <p className={`text-xs mt-2 font-medium ${snapshotMsg.startsWith("✅") ? "text-emerald-600" : "text-red-500"}`}>{snapshotMsg}</p>
              )}
            </div>
            <button
              type="button"
              onClick={takeSnapshot}
              disabled={snapshotLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}
            >
              <Camera className="w-4 h-4" />
              {snapshotLoading ? "กำลังบันทึก..." : "บันทึก Snapshot ตอนนี้"}
            </button>
          </div>
          {!SUPABASE_ENABLED && (
            <div className="mt-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
              ⚠ Supabase ยังไม่ได้เปิดใช้งาน — ข้อมูล Snapshot จะถูกบันทึกเมื่อเปิด VITE_USE_SUPABASE=true
            </div>
          )}
        </div>

        {/* Pacing chart */}
        <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-pink-500" />
            <h2 className="text-sm font-bold text-foreground">Pacing — ยอดจองสะสมตามเวลา</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            แกน X = วันที่บันทึก Snapshot · แกน Y = ที่นั่งที่จองทั้งหมดรวมทุก period
          </p>
          {pacingLoading ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-xs gap-2">
              <Clock className="w-4 h-4 animate-spin" />กำลังโหลด...
            </div>
          ) : pacingData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <p className="text-muted-foreground text-xs text-center">ยังไม่มีข้อมูล Snapshot<br />กด "บันทึก Snapshot ตอนนี้" เพื่อเริ่มเก็บข้อมูล</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={pacingData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--popover))", color: "hsl(var(--popover-foreground))" }}
                  formatter={(val) => [`${val} ที่นั่ง`, "จองสะสม"]}
                  labelFormatter={(lbl) => `วันที่: ${lbl}`}
                />
                <Line dataKey="booked" stroke="#EC4899" strokeWidth={2.5} dot={{ r: 4, fill: "#EC4899" }} name="booked" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent events log */}
        <RecentEventsLog />

        </>)}

        {/* ── PREDICTIVE TAB ── */}
        {activeTab === "predictive" && (
          <PredictiveTab allPeriods={allPeriods} yearA={yearA} />
        )}

      </div>
    </div>
  );
}

// ── Rate bar pill ─────────────────────────────────────────────────────────────
function RateBar({ rate, color = "#EC4899" }: { rate: number; color?: string }) {
  const bg = rate >= 80 ? "#EF4444" : rate >= 55 ? "#F97316" : rate >= 30 ? "#EAB308" : color;
  return (
    <div className="flex items-center justify-end gap-1.5">
      <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${rate}%`, background: bg }} />
      </div>
      <span className="w-8 text-right font-bold" style={{ color: bg }}>{rate}%</span>
    </div>
  );
}

// ── Seasonality Heatmap ───────────────────────────────────────────────────────
function SeasonalityHeatmap({ periods, year }: { periods: PeriodRow[]; year: number }) {
  const filtered = periods.filter((p) => new Date(p.start_date!).getFullYear() === year && !p.cancelled);
  const countries = [...new Set(filtered.map((p) => p.country))].sort();

  if (countries.length === 0) {
    return <p className="text-center text-xs text-muted-foreground py-8">ไม่มีข้อมูลสำหรับปีนี้</p>;
  }

  const getRate = (country: string, month: number) => {
    const ps = filtered.filter((p) => p.country === country && new Date(p.start_date!).getMonth() + 1 === month);
    const ts = ps.reduce((s, p) => s + p.total_seats, 0);
    const bk = ps.reduce((s, p) => s + (p.total_seats - p.quota), 0);
    if (ts === 0) return null;
    return Math.round(bk / ts * 100);
  };

  const cellColor = (rate: number | null) => {
    if (rate === null) return "bg-muted/20 text-muted-foreground/30";
    if (rate >= 80) return "bg-red-500 text-white";
    if (rate >= 60) return "bg-orange-400 text-white";
    if (rate >= 40) return "bg-yellow-300 text-yellow-900";
    if (rate >= 20) return "bg-emerald-200 text-emerald-800";
    return "bg-emerald-50 text-emerald-600";
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[10px] border-collapse">
        <thead>
          <tr>
            <th className="text-left px-2 py-1 font-semibold text-muted-foreground w-24">ประเทศ</th>
            {MONTHS_TH.map((m) => (
              <th key={m} className="text-center px-1 py-1 font-semibold text-muted-foreground">{m}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {countries.map((country) => (
            <tr key={country} className="hover:bg-muted/10">
              <td className="px-2 py-1 font-medium text-foreground text-[11px] truncate max-w-[96px]">{country}</td>
              {MONTHS_TH.map((_, i) => {
                const rate = getRate(country, i + 1);
                return (
                  <td key={i} className="px-0.5 py-0.5">
                    <div className={`rounded text-center py-1 px-0.5 font-bold min-w-[28px] ${cellColor(rate)}`}>
                      {rate !== null ? `${rate}%` : "·"}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground">
        <span className="font-semibold">Legend:</span>
        {[["bg-red-500 text-white", "≥80%"], ["bg-orange-400 text-white", "60-79%"], ["bg-yellow-300 text-yellow-900", "40-59%"], ["bg-emerald-200 text-emerald-800", "20-39%"], ["bg-emerald-50 text-emerald-600", "<20%"], ["bg-muted/20 text-muted-foreground/30", "ไม่มีข้อมูล"]].map(([cls, lbl]) => (
          <span key={lbl} className="flex items-center gap-1">
            <span className={`w-5 h-3 rounded text-[8px] flex items-center justify-center font-bold ${cls}`} />
            {lbl}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Recent booking events log ─────────────────────────────────────────────────
type BookingEvent = {
  id: string;
  event_type: string;
  tour_code: string | null;
  country: string | null;
  start_date: string | null;
  old_quota: number | null;
  new_quota: number | null;
  delta: number | null;
  actor: string | null;
  created_at: string;
};

function RecentEventsLog() {
  const [events, setEvents] = useState<BookingEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!SUPABASE_ENABLED || !supabase) return;
    setLoading(true);
    const { data } = await supabase
      .from("booking_events")
      .select("id, event_type, tour_code, country, start_date, old_quota, new_quota, delta, actor, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setEvents(data as BookingEvent[]);
    setLoading(false);
  };

  // load on mount
  useState(() => { load(); });

  const typeLabel: Record<string, { label: string; color: string }> = {
    period_created:   { label: "สร้าง Period",    color: "#10B981" },
    period_updated:   { label: "แก้ไข Period",    color: "#3B82F6" },
    period_cancelled: { label: "ยกเลิก Period",   color: "#EF4444" },
    quota_adjusted:   { label: "ปรับ Quota",      color: "#F59E0B" },
    period_deleted:   { label: "ลบ Period",        color: "#6B7280" },
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-violet-500" />
          <h2 className="text-sm font-bold text-foreground">Recent Activity Log</h2>
          <span className="text-xs text-muted-foreground">(50 รายการล่าสุด)</span>
        </div>
        <button onClick={load} className="text-xs text-violet-600 hover:underline font-medium">
          {loading ? "กำลังโหลด..." : "↺ Refresh"}
        </button>
      </div>
      {!SUPABASE_ENABLED ? (
        <div className="px-5 py-8 text-center text-xs text-amber-600">⚠ ต้องเปิด Supabase เพื่อดู activity log</div>
      ) : events.length === 0 ? (
        <div className="px-5 py-8 text-center text-xs text-muted-foreground">ยังไม่มี event — log จะเริ่มบันทึกเมื่อมีการสร้าง/แก้ไข Period</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/20 text-muted-foreground">
                <th className="text-left px-4 py-2 font-semibold">เวลา</th>
                <th className="text-left px-3 py-2 font-semibold">Event</th>
                <th className="text-left px-3 py-2 font-semibold">โปรแกรม</th>
                <th className="text-left px-3 py-2 font-semibold">ประเทศ</th>
                <th className="text-left px-3 py-2 font-semibold">วันเดินทาง</th>
                <th className="text-right px-3 py-2 font-semibold">Quota เดิม</th>
                <th className="text-right px-3 py-2 font-semibold">Quota ใหม่</th>
                <th className="text-right px-3 py-2 font-semibold">Delta</th>
                <th className="text-left px-4 py-2 font-semibold">ผู้ทำรายการ</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => {
                const t = typeLabel[e.event_type] ?? { label: e.event_type, color: "#6B7280" };
                const dt = new Date(e.created_at);
                const timeStr = dt.toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" });
                return (
                  <tr key={e.id} className="border-t border-border/40 hover:bg-muted/10">
                    <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">{timeStr}</td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: t.color }}>{t.label}</span>
                    </td>
                    <td className="px-3 py-2 font-medium">{e.tour_code ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{e.country ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                      {e.start_date ? new Date(e.start_date).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" }) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">{e.old_quota ?? "—"}</td>
                    <td className="px-3 py-2 text-right">{e.new_quota ?? "—"}</td>
                    <td className="px-3 py-2 text-right font-bold">
                      {e.delta !== null && e.delta !== undefined ? (
                        <span style={{ color: e.delta < 0 ? "#EF4444" : "#10B981" }}>
                          {e.delta > 0 ? "+" : ""}{e.delta}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{e.actor ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 3 — PREDICTIVE TAB
// ═══════════════════════════════════════════════════════════════════════════════

interface PredictiveTabProps { allPeriods: PeriodRow[]; yearA: number; }

function PredictiveTab({ allPeriods, yearA }: PredictiveTabProps) {
  // ── active periods (not cancelled, future or current year) ──────────────────
  const activePeriods = allPeriods.filter((p) => !p.cancelled && p.start_date);

  // ── Country fill-rate analysis ──────────────────────────────────────────────
  type CountryInsight = {
    country: string;
    periods: number;
    avgFillRate: number;   // %
    totalSeats: number;
    bookedSeats: number;
    remainingSeats: number;
    avgPrice: number;
    projectedRevenue: number;     // remaining × avgPrice × avgFillRate
    confirmedRevenue: number;     // booked × avgPrice
    recommendation: "เพิ่ม Period" | "ดีแล้ว" | "ระวัง";
    urgency: "high" | "medium" | "low";
  };

  const countryInsights = useMemo((): CountryInsight[] => {
    const map = new Map<string, { periods: number; ts: number; bk: number; rev: number; remaining: number }>();
    for (const p of activePeriods) {
      const price = (p.special_price && p.special_price > 0 && p.special_price < p.price_per_seat)
        ? p.special_price : p.price_per_seat;
      const bk = p.total_seats - p.quota;
      const c = map.get(p.country) ?? { periods: 0, ts: 0, bk: 0, rev: 0, remaining: 0 };
      map.set(p.country, {
        periods: c.periods + 1,
        ts: c.ts + p.total_seats,
        bk: c.bk + bk,
        rev: c.rev + bk * price,
        remaining: c.remaining + p.quota,
      });
    }
    return [...map.entries()].map(([country, d]) => {
      const avgFillRate = d.ts > 0 ? Math.round(d.bk / d.ts * 100) : 0;
      const avgPrice = d.bk > 0 ? Math.round(d.rev / d.bk) : 0;
      const projectedRevenue = Math.round(d.remaining * avgPrice * (avgFillRate / 100));
      const recommendation: CountryInsight["recommendation"] =
        avgFillRate >= 75 ? "เพิ่ม Period" : avgFillRate >= 40 ? "ดีแล้ว" : "ระวัง";
      const urgency: CountryInsight["urgency"] =
        avgFillRate >= 80 ? "high" : avgFillRate >= 60 ? "medium" : "low";
      return {
        country,
        periods: d.periods,
        avgFillRate,
        totalSeats: d.ts,
        bookedSeats: d.bk,
        remainingSeats: d.remaining,
        avgPrice,
        projectedRevenue,
        confirmedRevenue: d.rev,
        recommendation,
        urgency,
      };
    }).sort((a, b) => b.avgFillRate - a.avgFillRate);
  }, [activePeriods]);

  // ── Revenue projection ───────────────────────────────────────────────────────
  const totalConfirmed = countryInsights.reduce((s, c) => s + c.confirmedRevenue, 0);
  const totalProjectedExtra = countryInsights.reduce((s, c) => s + c.projectedRevenue, 0);
  const totalSeats = countryInsights.reduce((s, c) => s + c.totalSeats, 0);
  const totalBooked = countryInsights.reduce((s, c) => s + c.bookedSeats, 0);
  const totalRemaining = countryInsights.reduce((s, c) => s + c.remainingSeats, 0);
  const overallFillRate = totalSeats > 0 ? Math.round(totalBooked / totalSeats * 100) : 0;

  // optimistic: fill remaining at current rate; conservative: 70% of current rate
  const projOptimistic = totalConfirmed + totalProjectedExtra;
  const projConservative = totalConfirmed + Math.round(totalProjectedExtra * 0.7);

  // ── Next 12 months demand forecast (from historical month patterns) ───────────
  const monthDemand = useMemo(() => {
    const now = new Date();
    const results = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const m = d.getMonth() + 1;
      // historical fill rate for this month (all years)
      const ps = allPeriods.filter((p) => !p.cancelled && p.start_date && new Date(p.start_date).getMonth() + 1 === m);
      const ts = ps.reduce((s, p) => s + p.total_seats, 0);
      const bk = ps.reduce((s, p) => s + (p.total_seats - p.quota), 0);
      const rate = ts > 0 ? Math.round(bk / ts * 100) : 0;
      // upcoming periods in this month
      const upcoming = allPeriods.filter((p) => !p.cancelled && p.start_date && (() => {
        const pd = new Date(p.start_date!);
        return pd.getFullYear() === d.getFullYear() && pd.getMonth() + 1 === m && pd >= now;
      })());
      results.push({
        label: d.toLocaleDateString("th-TH", { month: "short", year: "2-digit" }),
        month: m,
        year: d.getFullYear(),
        historicalRate: rate,
        upcomingPeriods: upcoming.length,
        upcomingSeats: upcoming.reduce((s, p) => s + p.total_seats, 0),
      });
    }
    return results;
  }, [allPeriods]);

  const recColor = (r: CountryInsight["recommendation"]) =>
    r === "เพิ่ม Period" ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/40"
    : r === "ดีแล้ว"    ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/40"
    : "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/40";

  return (
    <div className="space-y-6">

      {/* ── Revenue Projection Banner ── */}
      <div className="rounded-2xl border p-5 shadow-sm overflow-hidden relative"
        style={{ background: "linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)" }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="relative">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="w-5 h-5 text-white/80" />
            <h2 className="text-sm font-bold text-white">Revenue Projection (ปีปัจจุบัน)</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "ยืนยันแล้ว", value: fmtMB(totalConfirmed), sub: `${totalBooked} ที่นั่ง`, color: "text-white" },
              { label: "คาดการณ์ (Conservative)", value: fmtMB(projConservative), sub: `fill rate ×70%`, color: "text-white/90" },
              { label: "คาดการณ์ (Optimistic)", value: fmtMB(projOptimistic), sub: `fill rate ×100%`, color: "text-white/90" },
              { label: "ที่นั่งว่างเหลือ", value: totalRemaining.toLocaleString(), sub: `Fill rate ปัจจุบัน ${overallFillRate}%`, color: "text-white/80" },
            ].map(({ label, value, sub, color }) => (
              <div key={label} className="bg-white/10 rounded-xl px-4 py-3">
                <p className="text-[10px] text-white/60 font-semibold uppercase tracking-wide mb-1">{label}</p>
                <p className={`text-xl font-bold ${color} leading-none`}>{value}</p>
                <p className="text-[10px] text-white/50 mt-1">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Capacity Recommendations ── */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-bold text-foreground">Capacity Recommendations</h2>
          <span className="text-xs text-muted-foreground ml-1">— วิเคราะห์จาก fill rate ต่อประเทศ</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/20 text-muted-foreground">
                <th className="text-left px-4 py-2 font-semibold">ประเทศ</th>
                <th className="text-right px-3 py-2 font-semibold">Period</th>
                <th className="text-right px-3 py-2 font-semibold">ที่นั่งทั้งหมด</th>
                <th className="text-right px-3 py-2 font-semibold">จองแล้ว</th>
                <th className="text-right px-3 py-2 font-semibold">Fill Rate</th>
                <th className="text-right px-3 py-2 font-semibold">Revenue ยืนยัน</th>
                <th className="text-right px-3 py-2 font-semibold">Revenue คาด</th>
                <th className="text-center px-4 py-2 font-semibold">แนะนำ</th>
              </tr>
            </thead>
            <tbody>
              {countryInsights.map((ci) => {
                const rateColor = ci.avgFillRate >= 75 ? "#EF4444" : ci.avgFillRate >= 50 ? "#F97316" : ci.avgFillRate >= 30 ? "#EAB308" : "#10B981";
                return (
                  <tr key={ci.country} className="border-t border-border/40 hover:bg-muted/10">
                    <td className="px-4 py-2.5 font-medium text-foreground">{ci.country}</td>
                    <td className="px-3 py-2.5 text-right text-muted-foreground">{ci.periods}</td>
                    <td className="px-3 py-2.5 text-right">{ci.totalSeats.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right font-bold">{ci.bookedSeats.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <div className="w-14 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${ci.avgFillRate}%`, background: rateColor }} />
                        </div>
                        <span className="font-bold w-8 text-right" style={{ color: rateColor }}>{ci.avgFillRate}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-violet-600">{fmtMB(ci.confirmedRevenue)}</td>
                    <td className="px-3 py-2.5 text-right text-muted-foreground">+{fmtMB(ci.projectedRevenue)}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${recColor(ci.recommendation)}`}>
                        {ci.recommendation === "เพิ่ม Period" && "🔥 "}
                        {ci.recommendation === "ระวัง" && "⚠ "}
                        {ci.recommendation === "ดีแล้ว" && "✓ "}
                        {ci.recommendation}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Legend */}
        <div className="px-5 py-2.5 border-t bg-muted/10 flex items-center gap-4 text-[10px] text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-100 dark:bg-blue-500/30 border border-blue-300 dark:border-blue-500/50 inline-block"/>✓ ดีแล้ว = fill 40–74% — เหมาะสม</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-100 dark:bg-emerald-500/30 border border-emerald-300 dark:border-emerald-500/50 inline-block"/>🔥 เพิ่ม Period = fill ≥ 75% — demand สูง ควรเปิดเพิ่ม</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-100 dark:bg-red-500/30 border border-red-300 dark:border-red-500/50 inline-block"/>⚠ ระวัง = fill &lt; 40% — อาจ over-supply หรือต้องโปรโมท</span>
        </div>
      </div>

      {/* ── Next 12 Months Demand Forecast ── */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
        <div className="flex items-center gap-2 mb-1">
          <Activity className="w-4 h-4 text-pink-500" />
          <h2 className="text-sm font-bold text-foreground">Demand Forecast — 12 เดือนข้างหน้า</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          สีพื้น = historical fill rate เดือนนั้น · ตัวเลขฟ้า = period ที่เปิดขายอยู่
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {monthDemand.map((m, i) => {
            const cellCls = m.historicalRate >= 75
              ? "bg-red-50 border-red-200 text-red-800 dark:bg-red-500/15 dark:border-red-500/40 dark:text-red-300"
              : m.historicalRate >= 50
              ? "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-500/15 dark:border-amber-500/40 dark:text-amber-300"
              : m.historicalRate >= 25
              ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-500/15 dark:border-emerald-500/40 dark:text-emerald-300"
              : "bg-muted/40 border-border text-muted-foreground";
            const isPast = (() => {
              const now = new Date();
              return new Date(m.year, m.month - 1) < new Date(now.getFullYear(), now.getMonth());
            })();
            return (
              <div key={i} className={`rounded-xl p-3 border transition-all ${cellCls} ${isPast ? "opacity-40" : ""}`}>
                <p className="text-[10px] font-bold mb-1">{m.label}</p>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs font-bold">
                      {m.historicalRate > 0 ? `${m.historicalRate}%` : "—"}
                    </p>
                    <p className="text-[9px] opacity-70">historical</p>
                  </div>
                  {m.upcomingPeriods > 0 && (
                    <div className="text-right">
                      <p className="text-xs font-bold text-blue-600 dark:text-blue-400">{m.upcomingPeriods}</p>
                      <p className="text-[9px] text-blue-400 dark:text-blue-500">period</p>
                    </div>
                  )}
                </div>
                {m.historicalRate >= 75 && !isPast && (
                  <div className="mt-1.5 text-[8px] font-bold text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-500/25 rounded px-1 py-0.5 text-center">HIGH DEMAND</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Quick Action Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            icon: AlertTriangle,
            cardCls: "bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/40",
            accentCls: "text-red-600 dark:text-red-300",
            chipCls: "bg-black/5 dark:bg-white/10 text-red-600 dark:text-red-300",
            title: "ต้องดูแลด่วน",
            desc: "ประเทศ fill rate ต่ำ < 30%",
            items: countryInsights.filter((c) => c.avgFillRate < 30).map((c) => `${c.country} (${c.avgFillRate}%)`),
          },
          {
            icon: TrendingUp,
            cardCls: "bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/40",
            accentCls: "text-emerald-600 dark:text-emerald-300",
            chipCls: "bg-black/5 dark:bg-white/10 text-emerald-600 dark:text-emerald-300",
            title: "เพิ่ม Period แนะนำ",
            desc: "ประเทศ fill rate สูง ≥ 75%",
            items: countryInsights.filter((c) => c.avgFillRate >= 75).map((c) => `${c.country} (${c.avgFillRate}%)`),
          },
          {
            icon: CheckCircle2,
            cardCls: "bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/40",
            accentCls: "text-blue-600 dark:text-blue-300",
            chipCls: "bg-black/5 dark:bg-white/10 text-blue-600 dark:text-blue-300",
            title: "สถานะดี",
            desc: "fill rate 40–74% — balance ดี",
            items: countryInsights.filter((c) => c.avgFillRate >= 40 && c.avgFillRate < 75).map((c) => `${c.country} (${c.avgFillRate}%)`),
          },
        ].map(({ icon: Icon, cardCls, accentCls, chipCls, title, desc, items }) => (
          <div key={title} className={`rounded-2xl border shadow-sm p-4 ${cardCls}`}>
            <div className={`flex items-center gap-2 mb-2 ${accentCls}`}>
              <Icon className="w-4 h-4" />
              <p className="text-xs font-bold">{title}</p>
            </div>
            <p className="text-[10px] text-muted-foreground mb-3">{desc}</p>
            {items.length === 0 ? (
              <p className="text-xs text-muted-foreground">ไม่มี</p>
            ) : (
              <div className="flex flex-col gap-1">
                {items.map((item) => (
                  <span key={item} className={`text-xs font-medium px-2 py-0.5 rounded-lg ${chipCls}`}>{item}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

    </div>
  );
}
