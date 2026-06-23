/**
 * StockDashboard.tsx — Full Stock / Tour Management Dashboard (Dark Mode)
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from "recharts";
import { useServices, type TourItem } from "@/store/serviceStore";
import {
  ArrowLeft, Globe2, MapPin, TrendingUp, PackageSearch,
  CheckCircle2, XCircle, CalendarDays, Layers,
} from "lucide-react";

// ─── brand palette (ใช้งานได้ทั้ง dark/light) ───────────────────────────────
const C_INTL   = "#A78BFA"; // violet-400
const C_DOM    = "#FCD34D"; // amber-300
const C_INC    = "#38BDF8"; // sky-400
const C_BOOKED = "#F472B6"; // pink-400
const C_AVAIL  = "#4ADE80"; // green-400
const C_CANCEL = "#F87171"; // red-400

// ─── helpers ────────────────────────────────────────────────────────────────
function fmtM(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}K`;
  return v.toLocaleString();
}
function fmtMB(v: number) {
  if (v >= 1_000_000) return `฿${(v / 1_000_000).toFixed(1)} ล้าน`;
  if (v >= 1_000)     return `฿${(v / 1_000).toFixed(0)}K`;
  return `฿${v.toLocaleString()}`;
}
const MONTH_TH = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];

// ─── KPI Card ───────────────────────────────────────────────────────────────
function KPICard({
  label, value, sub, color = C_INTL, icon: Icon,
}: {
  label: string; value: string; sub?: string; color?: string; icon: React.ElementType;
}) {
  return (
    <div className="bg-card rounded-2xl border border-border px-5 py-4 flex items-start gap-4 min-w-0">
      <div className="rounded-xl p-2.5 shrink-0" style={{ background: `${color}18` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide truncate">{label}</p>
        <p className="text-2xl font-bold mt-0.5 leading-none" style={{ color }}>{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Mini Donut ─────────────────────────────────────────────────────────────
function MiniDonut({ pct, color, bg }: { pct: number; color: string; bg: string }) {
  return (
    <div className="relative w-16 h-16 shrink-0">
      <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
        <circle cx="18" cy="18" r="15" fill="none" strokeWidth="5" stroke={bg} />
        <circle cx="18" cy="18" r="15" fill="none" strokeWidth="5" stroke={color}
          strokeDasharray={`${pct * 0.942} 94.2`} strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[13px] font-bold" style={{ color }}>
        {pct}%
      </span>
    </div>
  );
}

// ─── Custom Tooltip ──────────────────────────────────────────────────────────
function ChartTip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border shadow-xl rounded-xl px-3 py-2.5 text-xs">
      <p className="font-semibold text-foreground mb-1.5">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 mb-0.5">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold text-foreground">{fmtMB(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Section Header ──────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, sub, color = C_INTL }: {
  icon: React.ElementType; title: string; sub?: string; color?: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-4 h-4" style={{ color }} />
      <h2 className="text-sm font-bold text-foreground">{title}</h2>
      {sub && <span className="text-[11px] text-muted-foreground ml-1">{sub}</span>}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function StockDashboard() {
  const navigate = useNavigate();
  const tours    = useServices((s) => s.tours) as TourItem[];

  const [yearFilter, setYearFilter] = useState<number | "all">("all");

  // ── filtered tours ──
  const filteredTours = useMemo(() => {
    if (yearFilter === "all") return tours;
    return tours.map((t) => ({
      ...t,
      periods: (t.periods ?? []).filter((p) => {
        if (!p.start_date) return true;
        return new Date(p.start_date).getFullYear() === yearFilter;
      }),
    })).filter((t) => (t.periods ?? []).length > 0);
  }, [tours, yearFilter]);

  // ── global stats ──
  const global = useMemo(() => {
    let totalSeats = 0, booked = 0, available = 0;
    let capacityValue = 0, bookedValue = 0;
    let activePeriods = 0, cancelledPeriods = 0, cancelledValue = 0;
    for (const t of filteredTours) {
      for (const p of t.periods ?? []) {
        if (p.cancelled) {
          cancelledPeriods++;
          cancelledValue += p.total_seats * p.price_per_seat;
        } else {
          activePeriods++;
          totalSeats    += p.total_seats;
          booked        += p.total_seats - p.quota;
          available     += p.quota;
          capacityValue += p.total_seats * p.price_per_seat;
          bookedValue   += (p.total_seats - p.quota) * p.price_per_seat;
        }
      }
    }
    const bookingRate = totalSeats > 0 ? Math.round((booked / totalSeats) * 100) : 0;
    const valueRate   = capacityValue > 0 ? Math.round((bookedValue / capacityValue) * 100) : 0;
    return { totalSeats, booked, available, capacityValue, bookedValue, activePeriods, cancelledPeriods, cancelledValue, bookingRate, valueRate };
  }, [filteredTours]);

  // ── revenue by month ──
  const revenueByMonth = useMemo(() => {
    const map: Record<string, { capacity: number; booked: number }> = {};
    for (const t of filteredTours) {
      for (const p of t.periods ?? []) {
        if (!p.start_date || p.cancelled) continue;
        const dt  = new Date(p.start_date);
        const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
        if (!map[key]) map[key] = { capacity: 0, booked: 0 };
        map[key].capacity += p.total_seats * p.price_per_seat;
        map[key].booked   += (p.total_seats - p.quota) * p.price_per_seat;
      }
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([key, v]) => {
      const [yr, mo] = key.split("-");
      return { key, label: `${MONTH_TH[+mo - 1]}'${String(+yr + 543).slice(-2)}`, ...v };
    });
  }, [filteredTours]);

  // ── category breakdown ──
  const catStats = useMemo(() => {
    const cats = [
      { key: "International Tour", label: "International Tour", color: C_INTL, ringBg: `${C_INTL}25` },
      { key: "Domestic",           label: "Domestic",           color: C_DOM,  ringBg: `${C_DOM}25`  },
      { key: "Incentive",          label: "Incentive",          color: C_INC,  ringBg: `${C_INC}25`  },
    ] as const;
    return cats.map(({ key, label, color, ringBg }) => {
      const ts = filteredTours.filter((t) => t.category === key);
      let seats = 0, bk = 0, cap = 0, bkv = 0, periods = 0, cancelled = 0;
      for (const t of ts) for (const p of t.periods ?? []) {
        if (p.cancelled) { cancelled++; continue; }
        periods++; seats += p.total_seats; bk += p.total_seats - p.quota;
        cap += p.total_seats * p.price_per_seat;
        bkv += (p.total_seats - p.quota) * p.price_per_seat;
      }
      return { key, label, color, ringBg, programs: ts.length, seats, booked: bk, cap, bookedVal: bkv,
        rate: seats > 0 ? Math.round((bk / seats) * 100) : 0, periods, cancelled };
    });
  }, [filteredTours]);

  // ── by continent ──
  const continentStats = useMemo(() => {
    const map: Record<string, { seats: number; booked: number; cap: number; bookedVal: number; programs: number }> = {};
    for (const t of filteredTours) {
      const cont = t.continent || (t.category === "Domestic" ? "ไทย" : t.country || "อื่นๆ");
      if (!map[cont]) map[cont] = { seats: 0, booked: 0, cap: 0, bookedVal: 0, programs: 0 };
      map[cont].programs++;
      for (const p of t.periods ?? []) {
        if (p.cancelled) continue;
        map[cont].seats     += p.total_seats;
        map[cont].booked    += p.total_seats - p.quota;
        map[cont].cap       += p.total_seats * p.price_per_seat;
        map[cont].bookedVal += (p.total_seats - p.quota) * p.price_per_seat;
      }
    }
    return Object.entries(map)
      .map(([name, v]) => ({ name, ...v, rate: v.seats > 0 ? Math.round((v.booked / v.seats) * 100) : 0 }))
      .sort((a, b) => b.bookedVal - a.bookedVal).slice(0, 10);
  }, [filteredTours]);

  // ── top countries ──
  const countryStats = useMemo(() => {
    const map: Record<string, { seats: number; booked: number; cap: number; bookedVal: number; programs: number }> = {};
    for (const t of filteredTours) {
      for (const c of (t.countries?.length ? t.countries : [t.country || "—"])) {
        if (!map[c]) map[c] = { seats: 0, booked: 0, cap: 0, bookedVal: 0, programs: 0 };
        map[c].programs++;
        for (const p of t.periods ?? []) {
          if (p.cancelled) continue;
          map[c].seats     += p.total_seats;
          map[c].booked    += p.total_seats - p.quota;
          map[c].cap       += p.total_seats * p.price_per_seat;
          map[c].bookedVal += (p.total_seats - p.quota) * p.price_per_seat;
        }
      }
    }
    return Object.entries(map)
      .map(([name, v]) => ({ name, ...v, rate: v.seats > 0 ? Math.round((v.booked / v.seats) * 100) : 0 }))
      .sort((a, b) => b.bookedVal - a.bookedVal).slice(0, 12);
  }, [filteredTours]);

  // ── heatmap ──
  const heatmapData = useMemo(() => {
    const years = new Set<number>();
    for (const t of filteredTours) for (const p of t.periods ?? [])
      if (p.start_date) years.add(new Date(p.start_date).getFullYear());
    const yearList = Array.from(years).sort();
    const grid: Record<string, Record<number, { periods: number; booked: number; seats: number }>> = {};
    for (const t of filteredTours) for (const p of t.periods ?? []) {
      if (!p.start_date || p.cancelled) continue;
      const d = new Date(p.start_date); const mo = d.getMonth(); const yr = d.getFullYear();
      if (!grid[mo]) grid[mo] = {};
      if (!grid[mo][yr]) grid[mo][yr] = { periods: 0, booked: 0, seats: 0 };
      grid[mo][yr].periods++; grid[mo][yr].booked += p.total_seats - p.quota; grid[mo][yr].seats += p.total_seats;
    }
    return { grid, yearList };
  }, [filteredTours]);

  // ── stock health ──
  const healthData = useMemo(() => {
    let full = 0, low = 0, ok = 0;
    for (const t of filteredTours) for (const p of t.periods ?? []) {
      if (p.cancelled) continue;
      const pct = p.total_seats > 0 ? (p.quota / p.total_seats) * 100 : 100;
      if (pct === 0) full++; else if (pct <= 20) low++; else ok++;
    }
    return [
      { name: "ปิดกรุ๊ป (FULL)", value: full, color: C_CANCEL },
      { name: "ใกล้เต็ม (<20%)", value: low,  color: C_DOM    },
      { name: "ว่างปกติ",        value: ok,   color: C_AVAIL  },
    ];
  }, [filteredTours]);

  // ── upcoming (90d) ──
  const upcoming = useMemo(() => {
    const today = new Date(); const limit = new Date(); limit.setDate(today.getDate() + 90);
    const list: { tourCode: string; category: string; start: string; seats: number; quota: number; airline: string }[] = [];
    for (const t of filteredTours) for (const p of t.periods ?? []) {
      if (!p.start_date || p.cancelled) continue;
      const d = new Date(p.start_date);
      if (d >= today && d <= limit)
        list.push({ tourCode: t.code, category: t.category, start: p.start_date, seats: p.total_seats, quota: p.quota, airline: p.airline_code || "—" });
    }
    return list.sort((a, b) => a.start.localeCompare(b.start)).slice(0, 20);
  }, [filteredTours]);

  // ── cancellation by month ──
  const cancelByMonth = useMemo(() => {
    const map: Record<string, { count: number; value: number }> = {};
    for (const t of filteredTours) for (const p of t.periods ?? []) {
      if (!p.cancelled || !p.start_date) continue;
      const dt = new Date(p.start_date);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      if (!map[key]) map[key] = { count: 0, value: 0 };
      map[key].count++; map[key].value += p.total_seats * p.price_per_seat;
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([key, v]) => {
      const [yr, mo] = key.split("-");
      return { label: `${MONTH_TH[+mo - 1]}'${String(+yr + 543).slice(-2)}`, ...v };
    });
  }, [filteredTours]);

  // ── available years ──
  const availableYears = useMemo(() => {
    const s = new Set<number>();
    for (const t of tours) for (const p of t.periods ?? [])
      if (p.start_date) s.add(new Date(p.start_date).getFullYear());
    return Array.from(s).sort().reverse();
  }, [tours]);

  // ─── render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <div className="bg-card border-b border-border sticky top-0 z-20">
        <div className="max-w-screen-2xl mx-auto px-6 py-3 flex items-center gap-4">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> กลับ
          </button>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-2">
            <PackageSearch className="w-5 h-5" style={{ color: C_INTL }} />
            <h1 className="text-base font-bold text-foreground">Stock Dashboard</h1>
            <span className="text-[11px] px-2 py-0.5 rounded-full font-medium border"
              style={{ background: `${C_INTL}15`, color: C_INTL, borderColor: `${C_INTL}30` }}>
              Executive View
            </span>
          </div>
          {/* Year filter */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">ช่วงปี:</span>
            <div className="flex items-center gap-1">
              {(["all" as const, ...availableYears]).map((y) => (
                <button key={y}
                  onClick={() => setYearFilter(y)}
                  className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                  style={yearFilter === y
                    ? { background: C_INTL, color: "#fff" }
                    : { background: "transparent", color: "hsl(var(--muted-foreground))", border: "1px solid hsl(var(--border))" }
                  }
                >{y === "all" ? "ทั้งหมด" : y + 543}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KPICard label="มูลค่า Capacity" value={fmtMB(global.capacityValue)} sub={`${global.activePeriods} periods`} color={C_INTL} icon={Layers} />
          <KPICard label="มูลค่าจอง"      value={fmtMB(global.bookedValue)}    sub={`${global.valueRate}% ของ capacity`} color={C_BOOKED} icon={TrendingUp} />
          <KPICard label="Booking Rate"   value={`${global.bookingRate}%`}     sub={`${global.booked.toLocaleString()} / ${global.totalSeats.toLocaleString()} ที่`} color={C_INC} icon={CheckCircle2} />
          <KPICard label="ที่นั่งว่าง"   value={global.available.toLocaleString()} sub="ยังสามารถรับได้" color={C_AVAIL} icon={PackageSearch} />
          <KPICard label="Periods ทั้งหมด" value={global.activePeriods.toLocaleString()} sub={`${filteredTours.length} โปรแกรม`} color={C_DOM} icon={CalendarDays} />
          <KPICard label="ยกเลิกแล้ว"   value={`${global.cancelledPeriods} Period`} sub={fmtMB(global.cancelledValue)} color={C_CANCEL} icon={XCircle} />
        </div>

        {/* ── Revenue by Month + Stock Health ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Area Chart */}
          <div className="xl:col-span-2 bg-card rounded-2xl border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-foreground">มูลค่ารายเดือน</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">Capacity vs มูลค่าจองจริง</p>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-3 h-1 rounded-full inline-block" style={{background:C_INTL}} /> Capacity</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-1 rounded-full inline-block" style={{background:C_BOOKED}} /> จอง</span>
              </div>
            </div>
            {revenueByMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={revenueByMonth} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradCap" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C_INTL}   stopOpacity={0.25} />
                      <stop offset="95%" stopColor={C_INTL}   stopOpacity={0}    />
                    </linearGradient>
                    <linearGradient id="gradBk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C_BOOKED} stopOpacity={0.3}  />
                      <stop offset="95%" stopColor={C_BOOKED} stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tickFormatter={fmtM} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={50} />
                  <Tooltip content={<ChartTip />} />
                  <Area type="monotone" dataKey="capacity" name="Capacity" stroke={C_INTL}   strokeWidth={2} fill="url(#gradCap)" />
                  <Area type="monotone" dataKey="booked"   name="จอง"     stroke={C_BOOKED} strokeWidth={2} fill="url(#gradBk)"  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">ยังไม่มีข้อมูล Period</div>
            )}
          </div>

          {/* Stock Health Donut */}
          <div className="bg-card rounded-2xl border border-border p-5">
            <h2 className="text-sm font-bold text-foreground mb-1">Stock Health</h2>
            <p className="text-[11px] text-muted-foreground mb-3">สถานะที่นั่งทั้งหมด</p>
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie data={healthData} cx="50%" cy="50%" innerRadius={42} outerRadius={65} dataKey="value" paddingAngle={3}>
                  {healthData.map((e) => <Cell key={e.name} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={(v: number) => `${v} period`} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-1">
              {healthData.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                    <span className="text-muted-foreground">{d.name}</span>
                  </div>
                  <span className="font-bold" style={{ color: d.color }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Category Breakdown ── */}
        <div>
          <SectionHeader icon={Layers} title="แยกตามประเภท" color={C_INTL} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {catStats.map((c) => (
              <div key={c.key} className="bg-card rounded-2xl border border-border p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">{c.label}</p>
                    <p className="text-xl font-bold mt-0.5" style={{ color: c.color }}>{c.programs} โปรแกรม</p>
                  </div>
                  <MiniDonut pct={c.rate} color={c.color} bg={c.ringBg} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { lbl: "ที่นั่งรวม",       val: c.seats.toLocaleString(),  clr: "text-foreground" },
                    { lbl: "จองแล้ว",          val: c.booked.toLocaleString(), clr: "", style: { color: c.color } },
                    { lbl: "มูลค่า Capacity",  val: fmtMB(c.cap),             clr: "text-foreground" },
                    { lbl: "มูลค่าจอง",        val: fmtMB(c.bookedVal),       clr: "", style: { color: c.color } },
                  ].map(({ lbl, val, clr, style: s }) => (
                    <div key={lbl} className="rounded-lg p-2" style={{ background: c.ringBg }}>
                      <p className="text-muted-foreground text-[10px]">{lbl}</p>
                      <p className={`font-bold text-[11px] ${clr}`} style={s}>{val}</p>
                    </div>
                  ))}
                </div>
                {c.cancelled > 0 && (
                  <div className="mt-2 text-[10px] rounded-lg px-2.5 py-1.5" style={{ background: `${C_CANCEL}15`, color: C_CANCEL }}>
                    ❌ ยกเลิก {c.cancelled} period
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── By Continent + By Country ── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Continent */}
          <div className="bg-card rounded-2xl border border-border p-5">
            <SectionHeader icon={Globe2} title="แยกตามทวีป / ภูมิภาค" color={C_INC} />
            {continentStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(220, continentStats.length * 38)}>
                <BarChart data={continentStats} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" tickFormatter={fmtM} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis dataKey="name" type="category" width={72} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip content={<ChartTip />} />
                  <Bar dataKey="cap"       name="Capacity"  fill={`${C_INTL}30`} radius={[0,4,4,0]} />
                  <Bar dataKey="bookedVal" name="มูลค่าจอง" fill={C_INTL}       radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">ยังไม่มีข้อมูล Continent</div>
            )}
          </div>

          {/* Country table */}
          <div className="bg-card rounded-2xl border border-border p-5">
            <SectionHeader icon={MapPin} title="Top ประเทศ (by มูลค่าจอง)" color={C_DOM} />
            <div className="overflow-auto max-h-[300px]">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border text-[10px] text-muted-foreground uppercase tracking-wide">
                    <th className="text-left py-1.5 font-medium">#</th>
                    <th className="text-left py-1.5 font-medium">ประเทศ</th>
                    <th className="text-right py-1.5 font-medium">โปรแกรม</th>
                    <th className="text-right py-1.5 font-medium">จอง%</th>
                    <th className="text-right py-1.5 font-medium">มูลค่าจอง</th>
                  </tr>
                </thead>
                <tbody>
                  {countryStats.map((c, i) => (
                    <tr key={c.name} className="border-b border-border/40 hover:bg-muted/40 transition-colors">
                      <td className="py-2 text-muted-foreground/40 w-6">{i + 1}</td>
                      <td className="py-2 font-medium text-foreground">{c.name}</td>
                      <td className="py-2 text-right text-muted-foreground">{c.programs}</td>
                      <td className="py-2 text-right">
                        <span className="font-semibold" style={{ color: c.rate >= 70 ? C_BOOKED : c.rate >= 40 ? C_DOM : "hsl(var(--muted-foreground))" }}>
                          {c.rate}%
                        </span>
                      </td>
                      <td className="py-2 text-right font-semibold" style={{ color: C_INTL }}>{fmtMB(c.bookedVal)}</td>
                    </tr>
                  ))}
                  {countryStats.length === 0 && (
                    <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">ยังไม่มีข้อมูลประเทศ</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Monthly Heatmap ── */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <SectionHeader icon={CalendarDays} title="Period Heatmap รายเดือน" sub="— จำนวน Period ที่เปิดขายแต่ละเดือน" color={C_INTL} />
          {heatmapData.yearList.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="text-xs border-collapse w-full">
                <thead>
                  <tr>
                    <th className="text-left text-[10px] text-muted-foreground font-medium py-1.5 pr-3 w-10">เดือน</th>
                    {heatmapData.yearList.map((y) => (
                      <th key={y} className="text-center text-[10px] text-muted-foreground font-medium py-1.5 px-1 min-w-[52px]">
                        {y + 543}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MONTH_TH.map((mo, mi) => (
                    <tr key={mi}>
                      <td className="text-muted-foreground font-medium py-1 pr-3 text-[11px]">{mo}</td>
                      {heatmapData.yearList.map((y) => {
                        const cell = heatmapData.grid[mi]?.[y];
                        const count = cell?.periods ?? 0;
                        const rate  = cell && cell.seats > 0 ? Math.round((cell.booked / cell.seats) * 100) : 0;
                        const intensity = Math.min(count / 8, 1);
                        const bg = count === 0 ? "hsl(var(--muted))" : `rgba(167, 139, 250, ${0.1 + intensity * 0.65})`;
                        return (
                          <td key={y} className="text-center py-0.5 px-1">
                            <div className="rounded-lg mx-auto flex flex-col items-center justify-center cursor-default transition-transform hover:scale-105"
                              style={{ background: bg, minHeight: 36, width: 48 }}
                              title={count > 0 ? `${mo} ${y + 543}: ${count} period, จอง ${rate}%` : "ไม่มี period"}>
                              {count > 0 ? (
                                <>
                                  <span className={`text-[12px] font-bold ${intensity > 0.5 ? "text-white" : "text-violet-300"}`}>{count}</span>
                                  <span className={`text-[8px] ${intensity > 0.5 ? "text-violet-100" : "text-violet-400"}`}>{rate}%</span>
                                </>
                              ) : (
                                <span className="text-muted-foreground/30 text-[10px]">—</span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center gap-1.5 mt-3">
                <span className="text-[10px] text-muted-foreground">Intensity:</span>
                {[0.1, 0.25, 0.42, 0.58, 0.75].map((op, i) => (
                  <div key={i} className="w-5 h-4 rounded" style={{ background: `rgba(167,139,250,${op})` }} />
                ))}
                <span className="text-[10px] text-muted-foreground ml-1">มาก</span>
              </div>
            </div>
          ) : (
            <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">ยังไม่มีข้อมูล</div>
          )}
        </div>

        {/* ── Cancellation + Upcoming ── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Cancellation by month */}
          <div className="bg-card rounded-2xl border border-border p-5">
            <SectionHeader icon={XCircle} title="การยกเลิกรายเดือน" color={C_CANCEL} />
            {cancelByMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={cancelByMonth} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis yAxisId="left"  orientation="left"  dataKey="count" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} width={28} />
                  <YAxis yAxisId="right" orientation="right" dataKey="value" tickFormatter={fmtM} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} width={44} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                  <Bar yAxisId="left"  dataKey="count" name="Period ยกเลิก" fill={`${C_CANCEL}40`} radius={[4,4,0,0]} />
                  <Bar yAxisId="right" dataKey="value" name="มูลค่าที่หาย"  fill={C_CANCEL}       radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[180px] flex flex-col items-center justify-center gap-2">
                <CheckCircle2 className="w-8 h-8" style={{ color: `${C_AVAIL}50` }} />
                <p className="text-sm text-muted-foreground">ไม่มี Period ที่ยกเลิก</p>
              </div>
            )}
          </div>

          {/* Upcoming 90 days */}
          <div className="bg-card rounded-2xl border border-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <CalendarDays className="w-4 h-4" style={{ color: C_DOM }} />
              <h2 className="text-sm font-bold text-foreground">Upcoming Periods (90 วัน)</h2>
              <span className="ml-auto text-[10px] text-muted-foreground">{upcoming.length} รายการ</span>
            </div>
            <div className="space-y-1.5 overflow-y-auto max-h-[220px] pr-1">
              {upcoming.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">ไม่มี Period ใน 90 วันข้างหน้า</p>
              ) : upcoming.map((u, i) => {
                const pct = u.seats > 0 ? Math.round(((u.seats - u.quota) / u.seats) * 100) : 0;
                const d   = new Date(u.start);
                const daysAway = Math.round((d.getTime() - Date.now()) / 86400000);
                const color = u.category === "International Tour" ? C_INTL : u.category === "Domestic" ? C_DOM : C_INC;
                return (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 transition-colors">
                    <div className="text-center min-w-[36px]">
                      <p className="text-[10px] text-muted-foreground leading-none">{MONTH_TH[d.getMonth()]}</p>
                      <p className="text-base font-bold text-foreground leading-tight">{d.getDate()}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-foreground truncate">{u.tourCode}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{u.airline} · {u.seats - u.quota}/{u.seats} ที่</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] font-bold" style={{ color }}>{pct}%</span>
                      <span className="text-[9px] text-muted-foreground/60">{daysAway}d</span>
                    </div>
                    <div className="w-1.5 h-8 rounded-full shrink-0" style={{ background: `${color}20` }}>
                      <div className="w-full rounded-full transition-all" style={{ height: `${pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="text-center py-4">
          <p className="text-[11px] text-muted-foreground/50">
            Standard Tour CRM · Stock Dashboard · ข้อมูลอ้างอิงจาก Periods ที่บันทึกในระบบ
          </p>
        </div>
      </div>
    </div>
  );
}
