/**
 * OTADashboard.tsx — KPI + Charts สำหรับ OTA Module
 * Mirror: Standard Daycation Database → Dashboard page
 */
import { useMemo, useState } from "react";
import { useOTAStore, OTAPlatform } from "@/store/otaStore";
import {
  PieChart, Pie, Cell, Tooltip as RTooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
} from "recharts";
import { ShoppingCart, Banknote, Users, TrendingUp, Bus, Layers } from "lucide-react";

const COLORS = ["#7c3aed", "#db2777", "#a78bfa", "#f9a8d4", "#60a5fa", "#34d399"];

const today = new Date();

function KPICard({ icon: Icon, label, value, color }: { icon: typeof ShoppingCart; label: string; value: string; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-muted-foreground text-xs">{label}</div>
        <div className="text-xl font-bold">{value}</div>
      </div>
    </div>
  );
}

export default function OTADashboard() {
  const { orders, packages } = useOTAStore();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());

  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  const monthOrders = useMemo(() => orders.filter((o) => o.usage_date.startsWith(prefix)), [orders, prefix]);

  const totalOrders = monthOrders.length;
  const totalRevenue = monthOrders.reduce((s, o) => s + o.revenue, 0);
  const totalPax = monthOrders.reduce((s, o) => s + o.pax, 0);
  const avgPax = totalOrders > 0 ? (totalPax / totalOrders).toFixed(1) : "0";
  const uniqueGroups = new Set(monthOrders.map((o) => o.group_number).filter(Boolean)).size;
  const fmtB = (n: number) => `฿${n.toLocaleString("th-TH", { minimumFractionDigits: 2 })}`;
  const monthName = new Date(year, month - 1, 1).toLocaleString("en", { month: "long" });

  // Orders by Platform
  const platformOrderData = useMemo(() => {
    const map: Record<string, number> = {};
    monthOrders.forEach((o) => { map[o.platform] = (map[o.platform] ?? 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [monthOrders]);

  // People by Platform
  const platformPaxData = useMemo(() => {
    const map: Record<string, number> = {};
    monthOrders.forEach((o) => { map[o.platform] = (map[o.platform] ?? 0) + o.pax; });
    return Object.entries(map).map(([name, pax]) => ({ name, pax }));
  }, [monthOrders]);

  // Orders & People by Package
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

  // People by Nationality
  const nationalityData = useMemo(() => {
    const map: Record<string, number> = {};
    monthOrders.forEach((o) => { if (o.nationality) map[o.nationality] = (map[o.nationality] ?? 0) + o.pax; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, pax]) => ({ name, pax }));
  }, [monthOrders]);

  // Monthly Comparison (last 6 months)
  const monthlyData = useMemo(() => {
    const result = [];
    for (let i = 5; i >= 0; i--) {
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

  // Platform Trend (last 6 months)
  const platformTrendData = useMemo(() => {
    const platforms: OTAPlatform[] = ["Trip.com", "KKday", "Agent Offline", "GetYourGuide"];
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

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear((y) => y - 1); } else setMonth((m) => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear((y) => y + 1); } else setMonth((m) => m + 1); };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">วิเคราะห์ performance OTA รายเดือน</p>
        </div>
        <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5">
          <button onClick={prevMonth} className="hover:text-purple-600 transition-colors text-muted-foreground">◀</button>
          <span className="text-sm font-semibold min-w-[130px] text-center">{monthName} {year}</span>
          <button onClick={nextMonth} className="hover:text-purple-600 transition-colors text-muted-foreground">▶</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard icon={ShoppingCart} label="Orders" value={String(totalOrders)} color="bg-purple-100 dark:bg-purple-900/40 text-purple-600" />
        <KPICard icon={Banknote} label="Revenue" value={fmtB(totalRevenue)} color="bg-green-100 dark:bg-green-900/40 text-green-600" />
        <KPICard icon={Users} label="People" value={String(totalPax)} color="bg-pink-100 dark:bg-pink-900/40 text-pink-600" />
        <KPICard icon={TrendingUp} label="Avg / Order" value={avgPax} color="bg-blue-100 dark:bg-blue-900/40 text-blue-600" />
        <KPICard icon={Bus} label="Vehicles Used" value={String(totalOrders)} color="bg-orange-100 dark:bg-orange-900/40 text-orange-600" />
        <KPICard icon={Layers} label="Total Groups" value={String(uniqueGroups || totalOrders)} color="bg-rose-100 dark:bg-rose-900/40 text-rose-600" />
      </div>

      {/* Row 1: Platform donut + People by Platform bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard title="Orders by Platform">
          {platformOrderData.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={platformOrderData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
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
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                <RTooltip />
                <Bar dataKey="pax" fill="#db2777" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Row 2: Orders & People by Package */}
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

      {/* Row 3: Nationality */}
      <ChartCard title="People by Nationality (Top 10)">
        {nationalityData.length === 0 ? <EmptyChart /> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={nationalityData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11 }} />
              <RTooltip />
              <Bar dataKey="pax" fill="#7c3aed" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Row 4: Monthly comparison */}
      <ChartCard title="Monthly Comparison (Last 6 Months)">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
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

      {/* Row 5: Platform trend */}
      <ChartCard title="Platform Order Trend (Last 6 Months)">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={platformTrendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <RTooltip />
            <Legend />
            {["Trip.com", "KKday", "Agent Offline", "GetYourGuide"].map((pl, i) => (
              <Line key={pl} type="monotone" dataKey={pl} stroke={COLORS[i]} strokeWidth={2} dot={{ r: 4 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
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
  return <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">ยังไม่มีข้อมูลในเดือนนี้</div>;
}
