/**
 * OTADashboard.tsx — Enhanced KPI + Charts สำหรับ OTA Module
 * Tabs: Overview · Revenue · Operations · Markets
 */
import { useMemo, useState } from "react";
import { useOTAStore } from "@/store/otaStore";
import {
  PieChart, Pie, Cell, Tooltip as RTooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, AreaChart, Area,
} from "recharts";
import {
  ShoppingCart, Banknote, Users, TrendingUp, Bus, Layers,
  DollarSign, BarChart3,
} from "lucide-react";

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
  icon: Icon, label, value, color, sub, badge,
}: {
  icon: typeof ShoppingCart;
  label: string;
  value: string;
  color: string;
  sub?: string;
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

export default function OTADashboard() {
  const { orders, packages } = useOTAStore();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [tab, setTab] = useState<Tab>("overview");

  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  const monthOrders = useMemo(
    () => orders.filter((o) => o.usage_date.startsWith(prefix)),
    [orders, prefix]
  );

  // Previous month for MoM comparison
  const prevPrefix = useMemo(() => {
    const d = new Date(year, month - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, [year, month]);
  const prevMonthOrders = useMemo(
    () => orders.filter((o) => o.usage_date.startsWith(prevPrefix)),
    [orders, prevPrefix]
  );

  // ── KPI values ────────────────────────────────────────────────────────────────
  const totalOrders = monthOrders.length;
  const totalRevenue = monthOrders.reduce((s, o) => s + o.revenue, 0);
  const totalGross = monthOrders.reduce((s, o) => s + (o.gross_price ?? 0), 0);
  const totalPax = monthOrders.reduce((s, o) => s + o.pax, 0);
  const avgPax = totalOrders > 0 ? (totalPax / totalOrders).toFixed(1) : "0";
  const revPAX = totalPax > 0 ? totalRevenue / totalPax : 0;
  const uniqueGroups = new Set(monthOrders.map((o) => o.group_number).filter(Boolean)).size;
  const monthName = new Date(year, month - 1, 1).toLocaleString("en", { month: "long" });

  const momBadge = (curr: number, prev: number) =>
    prev === 0 ? undefined : { pct: ((curr - prev) / prev) * 100 };

  const prevOrders = prevMonthOrders.length;
  const prevRevenue = prevMonthOrders.reduce((s, o) => s + o.revenue, 0);
  const prevPax = prevMonthOrders.reduce((s, o) => s + o.pax, 0);

  const ytdRevenue = useMemo(
    () => orders.filter((o) => o.usage_date.startsWith(`${year}-`)).reduce((s, o) => s + o.revenue, 0),
    [orders, year]
  );

  // ── OVERVIEW data ─────────────────────────────────────────────────────────────
  const platformOrderData = useMemo(() => {
    const map: Record<string, number> = {};
    monthOrders.forEach((o) => { map[o.platform] = (map[o.platform] ?? 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [monthOrders]);

  const platformPaxData = useMemo(() => {
    const map: Record<string, number> = {};
    monthOrders.forEach((o) => { map[o.platform] = (map[o.platform] ?? 0) + o.pax; });
    return Object.entries(map).map(([name, pax]) => ({ name, pax }));
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
    return Object.entries(map).map(([name, v]) => ({ name, ...v }));
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
    return Object.entries(map).map(([name, v]) => ({ name, ...v }));
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
    }));
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
    return Object.entries(map).map(([name, value]) => ({ name, value }));
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

  const packageData = useMemo(() => {
    const map: Record<string, { orders: number; pax: number }> = {};
    monthOrders.forEach((o) => {
      const pkg = packages.find((p) => p.id === o.package_id);
      const code = pkg?.code ?? "Other";
      if (!map[code]) map[code] = { orders: 0, pax: 0 };
      map[code].orders += 1;
      map[code].pax += o.pax;
    });
    return Object.entries(map).map(([name, v]) => ({ name, ...v }));
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
  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); } else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); } else setMonth((m) => m + 1);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">OTA Dashboard</h1>
          <p className="text-muted-foreground text-sm">วิเคราะห์ performance OTA รายเดือน</p>
        </div>
        <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5">
          <button onClick={prevMonth} className="hover:text-purple-600 transition-colors text-muted-foreground">◀</button>
          <span className="text-sm font-semibold min-w-[130px] text-center">{monthName} {year}</span>
          <button onClick={nextMonth} className="hover:text-purple-600 transition-colors text-muted-foreground">▶</button>
        </div>
      </div>

      {/* KPI Cards — 8 cards, 2 rows on mobile */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
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
          icon={DollarSign} label="Gross Revenue" value={fmtB(totalGross)}
          color="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600"
        />
        <KPICard
          icon={Users} label="People" value={String(totalPax)}
          color="bg-pink-100 dark:bg-pink-900/40 text-pink-600"
          badge={momBadge(totalPax, prevPax)}
        />
        <KPICard
          icon={TrendingUp} label="Avg / Order" value={avgPax}
          color="bg-blue-100 dark:bg-blue-900/40 text-blue-600"
        />
        <KPICard
          icon={BarChart3} label="RevPAX" value={fmtB(revPAX)}
          color="bg-violet-100 dark:bg-violet-900/40 text-violet-600"
          sub="รายได้ต่อคน"
        />
        <KPICard
          icon={Bus} label="Total Groups" value={String(uniqueGroups || totalOrders)}
          color="bg-orange-100 dark:bg-orange-900/40 text-orange-600"
        />
        <KPICard
          icon={Layers} label="YTD Revenue" value={fmtBK(ytdRevenue)}
          color="bg-rose-100 dark:bg-rose-900/40 text-rose-600"
          sub={`ทั้งปี ${year}`}
        />
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 border-b border-border pb-3 flex-wrap">
        <TabBtn active={tab === "overview"} onClick={() => setTab("overview")}>📊 Overview</TabBtn>
        <TabBtn active={tab === "revenue"} onClick={() => setTab("revenue")}>💰 Revenue</TabBtn>
        <TabBtn active={tab === "operations"} onClick={() => setTab("operations")}>⚙️ Operations</TabBtn>
        <TabBtn active={tab === "markets"} onClick={() => setTab("markets")}>🌏 Markets</TabBtn>
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

          <ChartCard title="Monthly Comparison (Last 12 Months)">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <RTooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="orders" fill="#7c3aed" name="Orders" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="pax" fill="#db2777" name="People" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="revenue" fill="#a78bfa" name="Revenue (฿k)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

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
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={guideData} dataKey="value" nameKey="name"
                      cx="50%" cy="50%" outerRadius={80}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
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
