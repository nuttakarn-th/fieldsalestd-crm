/**
 * StockAnalytics.tsx — YoY Stock Analytics Dashboard
 * เปรียบเทียบสถิติ Period ปีต่อปี: โปรแกรม, ที่นั่ง, Booking Rate, มูลค่า
 */
import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, Cell, PieChart, Pie,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, CalendarDays, Globe, Users, Wallet, BarChart3 } from "lucide-react";
import { useServices } from "@/store/serviceStore";
import type { TourPeriod } from "@/store/serviceStore";

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
    <div className="bg-white rounded-2xl border border-border shadow-sm p-4 flex flex-col gap-2">
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

  const statsA = useMemo(() => calcYear(allPeriods, yearA), [allPeriods, yearA]);
  const statsB = useMemo(() => calcYear(allPeriods, yearB), [allPeriods, yearB]);

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
      <div className="bg-white border-b px-6 py-4 sticky top-0 z-20 flex items-center justify-between">
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
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
          <h2 className="text-sm font-bold text-foreground mb-4">จำนวน Period รายเดือน</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
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
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
          <h2 className="text-sm font-bold text-foreground mb-4">Booking Rate รายเดือน (%)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthlyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
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
          <div className="lg:col-span-2 bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
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
          <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
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
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(val) => [`${val} periods`]} />
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

        {/* ── Seasonality Heatmap ── */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
          <h2 className="text-sm font-bold text-foreground mb-1">Seasonality — Booking Rate รายเดือน × ประเทศ (พ.ศ. {BE(yearA)})</h2>
          <p className="text-xs text-muted-foreground mb-4">ช่วยวางแผนว่าเดือนไหน ประเทศไหน ขายดีที่สุด</p>
          <SeasonalityHeatmap periods={allPeriods} year={yearA} />
        </div>

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
