import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { BarChart3, TrendingUp, Building2, Landmark, GraduationCap, School, Filter, Trophy } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell,
} from "recharts";
import { useCRM, formatTHB, LEAD_CATEGORIES, type LeadCategory, type SalesRep } from "@/store/crmStore";
import { useActiveSalesNames } from "@/store/authStore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangeFilter, resolveRange, inRange, type RangePreset } from "@/components/DateRangeFilter";
import type { DateRange } from "react-day-picker";

const PALETTE = [
  "hsl(210 90% 55%)",          // ลูกค้าทั่วไป — blue
  "hsl(var(--accent))",         // บริษัทเอกชน — pink
  "hsl(var(--gold))",           // หน่วยงานราชการ — gold
  "hsl(var(--primary-glow))",   // มหาวิทยาลัยเอกชน — pink-glow
  "hsl(var(--primary))",        // มหาวิทยาลัยรัฐบาล — purple
];

function lastNMonths(n: number) {
  const out: { key: string; label: string; year: number; month: number }[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("th-TH", { month: "short" }),
      year: d.getFullYear(),
      month: d.getMonth(),
    });
  }
  return out;
}

export default function ExecutiveDashboard() {
  const leads = useCRM((s) => s.leads);
  const targets = useCRM((s) => s.targets);
  const currentRep = useCRM((s) => s.currentRep);
  const SALES_REPS = useActiveSalesNames() as SalesRep[];

  // Per-section date range filters
  const [overviewPreset, setOverviewPreset] = useState<RangePreset>("year");
  const [overviewCustom, setOverviewCustom] = useState<DateRange | undefined>();
  const [repPreset, setRepPreset] = useState<RangePreset>("year");
  const [repCustom, setRepCustom] = useState<DateRange | undefined>();
  const [catPreset, setCatPreset] = useState<RangePreset>("all");
  const [catCustom, setCatCustom] = useState<DateRange | undefined>();
  const [rankPreset, setRankPreset] = useState<RangePreset>("month");
  const [rankCustom, setRankCustom] = useState<DateRange | undefined>();

  const [catFilter, setCatFilter] = useState<LeadCategory | "All">("All");
  const [repFocus, setRepFocus] = useState<SalesRep | "All">("All");

  const overviewRange = resolveRange(overviewPreset, overviewCustom);
  const repRange = resolveRange(repPreset, repCustom);
  const catRange = resolveRange(catPreset, catCustom);
  const rankRange = resolveRange(rankPreset, rankCustom);

  // Determine months to show in overview based on selected range
  const overviewMonths = useMemo(() => {
    if (!overviewRange.from || !overviewRange.to) return lastNMonths(12);
    const out: { key: string; label: string; year: number; month: number }[] = [];
    const start = new Date(overviewRange.from.getFullYear(), overviewRange.from.getMonth(), 1);
    const end = new Date(overviewRange.to.getFullYear(), overviewRange.to.getMonth(), 1);
    const cur = new Date(start);
    while (cur <= end) {
      out.push({
        key: `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`,
        label: cur.toLocaleDateString("th-TH", { month: "short" }),
        year: cur.getFullYear(),
        month: cur.getMonth(),
      });
      cur.setMonth(cur.getMonth() + 1);
    }
    return out.length ? out : lastNMonths(6);
  }, [overviewRange.from, overviewRange.to]);

  const repMonths = useMemo(() => {
    if (!repRange.from || !repRange.to) return lastNMonths(12);
    const out: { key: string; label: string; year: number; month: number }[] = [];
    const start = new Date(repRange.from.getFullYear(), repRange.from.getMonth(), 1);
    const end = new Date(repRange.to.getFullYear(), repRange.to.getMonth(), 1);
    const cur = new Date(start);
    while (cur <= end) {
      out.push({
        key: `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`,
        label: cur.toLocaleDateString("th-TH", { month: "short" }),
        year: cur.getFullYear(),
        month: cur.getMonth(),
      });
      cur.setMonth(cur.getMonth() + 1);
    }
    return out.length ? out : lastNMonths(6);
  }, [repRange.from, repRange.to]);

  const wonLeads = useMemo(() => leads.filter((l) => l.status === "Closed Won" && l.closed_date), [leads]);

  // Chart 1: Total / Domestic / International — Sales + Pax per month
  const overview = useMemo(() => {
    return overviewMonths.map((m) => {
      const inMonth = wonLeads.filter((l) => {
        const d = new Date(l.closed_date!);
        return d.getFullYear() === m.year && d.getMonth() === m.month;
      });
      const dom = inMonth.filter((l) => l.scope === "Domestic");
      const intl = inMonth.filter((l) => l.scope === "International");
      return {
        month: m.label,
        ยอดรวม: inMonth.reduce((s, l) => s + l.quoted_price, 0),
        Domestic: dom.reduce((s, l) => s + l.quoted_price, 0),
        International: intl.reduce((s, l) => s + l.quoted_price, 0),
        Pax_รวม: inMonth.reduce((s, l) => s + l.pax_count, 0),
        Pax_Dom: dom.reduce((s, l) => s + l.pax_count, 0),
        Pax_Intl: intl.reduce((s, l) => s + l.pax_count, 0),
      };
    });
  }, [overviewMonths, wonLeads]);

  // Chart 2: Each Sales vs Target per month
  const perRep = useMemo(() => {
    return repMonths.map((m) => {
      const row: Record<string, number | string> = { month: m.label };
      SALES_REPS.forEach((rep) => {
        const sales = wonLeads
          .filter((l) => l.assigned_to === rep)
          .filter((l) => {
            const d = new Date(l.closed_date!);
            return d.getFullYear() === m.year && d.getMonth() === m.month;
          })
          .reduce((s, l) => s + l.quoted_price, 0);
        const t = targets.find((x) => x.month === m.key && x.rep === rep);
        const target = (t?.domestic_sales ?? 0) + (t?.international_sales ?? 0);
        row[`${rep}`] = sales;
        row[`เป้า ${rep}`] = target;
      });
      return row;
    });
  }, [repMonths, wonLeads, targets]);

  // Chart 3: Lead Source by category
  const sourceFiltered = useMemo(() => {
    let l = leads;
    if (repFocus !== "All") l = l.filter((x) => x.assigned_to === repFocus);
    if (catFilter !== "All") l = l.filter((x) => x.lead_category === catFilter);
    // Filter by closed_date OR (for open leads) by next_followup
    if (catRange.from && catRange.to) {
      l = l.filter((x) => inRange(x.closed_date ?? x.next_followup_date, catRange));
    }
    return l;
  }, [leads, repFocus, catFilter, catRange]);

  const categoryStats = useMemo(() => {
    return LEAD_CATEGORIES.map((cat) => {
      const inCat = sourceFiltered.filter((l) => l.lead_category === cat);
      const won = inCat.filter((l) => l.status === "Closed Won");
      return {
        category: cat,
        leads: inCat.length,
        won: won.length,
        revenue: won.reduce((s, l) => s + l.quoted_price, 0),
      };
    });
  }, [sourceFiltered]);

  // Sales Ranking — for selected period
  const ranking = useMemo(() => {
    return SALES_REPS.map((rep) => {
      const repLeads = leads.filter((l) => l.assigned_to === rep);
      const periodLeads = rankRange.from
        ? repLeads.filter((l) => inRange(l.closed_date ?? l.next_followup_date, rankRange))
        : repLeads;
      const won = periodLeads.filter((l) => l.status === "Closed Won");
      const lost = periodLeads.filter((l) => l.status === "Closed Lost");
      const quoted = periodLeads.filter((l) => ["Quotation Sent", "Negotiating", "Closed Won", "Closed Lost"].includes(l.status));
      const revenue = won.reduce((s, l) => s + l.quoted_price, 0);
      const pax = won.reduce((s, l) => s + l.pax_count, 0);
      const conversion = periodLeads.length > 0 ? (won.length / periodLeads.length) * 100 : 0;
      const winRate = (won.length + lost.length) > 0 ? (won.length / (won.length + lost.length)) * 100 : 0;
      const qtWinRate = quoted.length > 0 ? (won.length / quoted.length) * 100 : 0;
      return { rep, deals: won.length, revenue, pax, conversion, winRate, qtWinRate, leadCount: periodLeads.length };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [leads, rankRange]);

  const totalRev = overview.reduce((s, r) => s + (r.ยอดรวม as number), 0);
  const totalPax = overview.reduce((s, r) => s + (r.Pax_รวม as number), 0);
  const totalTarget = perRep.reduce((s, r) => {
    return s + SALES_REPS.reduce((ss, rep) => ss + ((r[`เป้า ${rep}`] as number) || 0), 0);
  }, 0);
  const achievement = totalTarget > 0 ? (totalRev / totalTarget) * 100 : 0;

  const catIcon = (c: LeadCategory) => {
    if (c === "บริษัทเอกชน") return Building2;
    if (c === "หน่วยงานราชการ") return Landmark;
    if (c === "มหาวิทยาลัยเอกชน") return School;
    return GraduationCap;
  };

  // Manager-only guard (after hooks)
  if (currentRep !== "All") return <Navigate to="/app" replace />;

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-gold flex items-center justify-center shadow-glow">
            <BarChart3 className="w-5 h-5 text-gold-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-gold">Executive Dashboard</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">วิเคราะห์ยอดขายรายเดือน ประสิทธิภาพแต่ละคน และที่มาของ Lead — เฉพาะ Manager</p>
      </div>

      {/* Top KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="ยอดขายรวม" value={formatTHB(totalRev)} tone="primary" />
        <KPI label="Pax รวม" value={`${totalPax} ท่าน`} tone="accent" />
        <KPI label="เป้ารวม (ทีม)" value={formatTHB(totalTarget)} tone="muted" />
        <KPI label="Achievement" value={`${achievement.toFixed(1)}%`} tone="gold" highlight />
      </div>

      {/* Chart 1 */}
      <section className="bg-card rounded-xl border shadow-soft p-5">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-3">
          <div>
            <h3 className="font-bold flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> ยอดขายรายเดือน — รวม / Domestic / International</h3>
            <p className="text-xs text-muted-foreground">เปรียบเทียบยอดขาย (THB) และจำนวน Pax • {overviewRange.label}</p>
          </div>
          <DateRangeFilter value={overviewPreset} custom={overviewCustom} onChange={(p, c) => { setOverviewPreset(p); setOverviewCustom(c); }} />
        </header>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-72">
            <p className="text-xs font-semibold text-muted-foreground mb-1">ยอดขาย (THB)</p>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={overview}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatTHB(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Domestic" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} />
                <Bar dataKey="International" stackId="a" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="h-72">
            <p className="text-xs font-semibold text-muted-foreground mb-1">จำนวน Pax (ท่าน)</p>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={overview}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="Pax_รวม" stroke="hsl(var(--gold))" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="Pax_Dom" stroke="hsl(var(--primary))" strokeWidth={2} />
                <Line type="monotone" dataKey="Pax_Intl" stroke="hsl(var(--accent))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Chart 2 */}
      <section className="bg-card rounded-xl border shadow-soft p-5">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-3">
          <div>
            <h3 className="font-bold flex items-center gap-2"><BarChart3 className="w-4 h-4 text-accent" /> Sales แต่ละคน vs Target</h3>
            <p className="text-xs text-muted-foreground">แท่ง = ยอดที่ทำได้ / เส้น = เป้าที่ Manager กำหนด • {repRange.label}</p>
          </div>
          <DateRangeFilter value={repPreset} custom={repCustom} onChange={(p, c) => { setRepPreset(p); setRepCustom(c); }} />
        </header>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={perRep}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatTHB(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {SALES_REPS.map((rep, i) => (
                <Bar key={rep} dataKey={rep} fill={PALETTE[i]} radius={[4, 4, 0, 0]} />
              ))}
              {SALES_REPS.map((rep, i) => (
                <Line key={`t-${rep}`} type="monotone" dataKey={`เป้า ${rep}`} stroke={PALETTE[i]} strokeDasharray="5 5" strokeWidth={2} dot={false} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Chart 3 */}
      <section className="bg-card rounded-xl border shadow-soft p-5">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-3">
          <div>
            <h3 className="font-bold flex items-center gap-2"><Filter className="w-4 h-4 text-gold" /> ที่มาของ Lead — แยกตามหมวดหมู่</h3>
            <p className="text-xs text-muted-foreground">เอกชน / ราชการ / ม.เอกชน / ม.รัฐบาล • {catRange.label}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <DateRangeFilter value={catPreset} custom={catCustom} onChange={(p, c) => { setCatPreset(p); setCatCustom(c); }} />
            <Select value={catFilter} onValueChange={(v) => setCatFilter(v as never)}>
              <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">ทุกหมวดหมู่</SelectItem>
                {LEAD_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={repFocus} onValueChange={(v) => setRepFocus(v as never)}>
              <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">ทุก Sales</SelectItem>
                {SALES_REPS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
          {categoryStats.map((s, i) => {
            const Icon = catIcon(s.category);
            return (
              <div key={s.category} className="rounded-xl border p-4 bg-gradient-card flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-2" style={{ background: PALETTE[i] + "26", color: PALETTE[i] }}>
                  <Icon className="w-6 h-6" />
                </div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">{s.category}</p>
                <p className="text-5xl font-extrabold leading-none my-1" style={{ color: PALETTE[i] }}>{s.leads}</p>
                <p className="text-[11px] text-muted-foreground mt-2">Lead • ปิดได้ {s.won}</p>
                <p className="text-[11px] font-semibold text-foreground/80">{formatTHB(s.revenue)}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-72">
            <p className="text-xs font-semibold text-muted-foreground mb-1">จำนวน Lead ตามหมวดหมู่</p>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryStats} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis dataKey="category" type="category" stroke="hsl(var(--muted-foreground))" fontSize={11} width={130} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="leads" radius={[0, 6, 6, 0]}>
                  {categoryStats.map((_, i) => <Cell key={i} fill={PALETTE[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="h-72">
            <p className="text-xs font-semibold text-muted-foreground mb-1">สัดส่วนรายได้ตามหมวดหมู่</p>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryStats.filter((c) => c.revenue > 0)} dataKey="revenue" nameKey="category" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={3}>
                  {categoryStats.map((_, i) => <Cell key={i} fill={PALETTE[i]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatTHB(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Sales Ranking */}
      <section className="bg-card rounded-xl border shadow-soft p-5">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-3">
          <div>
            <h3 className="font-bold flex items-center gap-2"><Trophy className="w-4 h-4 text-gold" /> Sales Ranking — อันดับพนักงานขาย</h3>
            <p className="text-xs text-muted-foreground">จัดอันดับตามยอดขาย • {rankRange.label}</p>
          </div>
          <DateRangeFilter value={rankPreset} custom={rankCustom} onChange={(p, c) => { setRankPreset(p); setRankCustom(c); }} />
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground text-xs">
              <tr>
                <th className="p-3 text-center w-16">อันดับ</th>
                <th className="p-3 text-left">Sales</th>
                <th className="p-3 text-right">ดีลที่ปิดสำเร็จ</th>
                <th className="p-3 text-right">ยอดขาย (฿)</th>
                <th className="p-3 text-right">Pax</th>
                <th className="p-3 text-right">Conversion (Lead)</th>
                <th className="p-3 text-right">Win Rate (QT)</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {ranking.map((r, i) => {
                const medalBg = i === 0 ? "bg-gradient-gold text-gold-foreground" : i === 1 ? "bg-muted text-foreground" : i === 2 ? "bg-accent/20 text-accent" : "bg-muted/50 text-muted-foreground";
                return (
                  <tr key={r.rep} className={`hover:bg-muted/30 transition-smooth ${i === 0 ? "bg-gold/5" : ""}`}>
                    <td className="p-3 text-center">
                      <span className={`inline-flex w-8 h-8 rounded-full items-center justify-center text-sm font-bold ${medalBg}`}>{i + 1}</span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-pink text-accent-foreground flex items-center justify-center text-xs font-bold">{r.rep[0]}</div>
                        <div>
                          <p className="font-semibold">{r.rep}</p>
                          <p className="text-[11px] text-muted-foreground">{r.leadCount} leads ในช่วงนี้</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-right font-semibold">{r.deals}</td>
                    <td className="p-3 text-right font-bold text-primary">{formatTHB(r.revenue)}</td>
                    <td className="p-3 text-right text-foreground/80">{r.pax} ท่าน</td>
                    <td className="p-3 text-right">
                      <span className="inline-block px-2 py-0.5 rounded bg-accent/15 text-accent font-semibold text-xs">{r.conversion.toFixed(1)}%</span>
                    </td>
                    <td className="p-3 text-right">
                      <span className="inline-block px-2 py-0.5 rounded bg-gold/20 text-gold-foreground font-semibold text-xs">{r.qtWinRate.toFixed(1)}%</span>
                    </td>
                  </tr>
                );
              })}
              {ranking.every((r) => r.deals === 0) && (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">ยังไม่มีดีลปิดในช่วงนี้</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function KPI({ label, value, tone, highlight }: { label: string; value: string; tone: "primary" | "accent" | "muted" | "gold"; highlight?: boolean }) {
  const toneClass =
    tone === "primary" ? "bg-primary/10 text-primary"
    : tone === "accent" ? "bg-accent/15 text-accent"
    : tone === "gold" ? "bg-gold/15 text-gold-foreground"
    : "bg-muted text-foreground";
  return (
    <div className={`rounded-xl border p-5 shadow-soft flex flex-col items-center justify-center text-center min-h-[140px] ${highlight ? "bg-gradient-gold text-gold-foreground border-gold/40" : "bg-card"}`}>
      <p className={`text-xs font-medium ${highlight ? "text-gold-foreground/80" : "text-muted-foreground"}`}>{label}</p>
      <p className="text-3xl md:text-4xl font-extrabold mt-2 leading-none">{value}</p>
      {!highlight && <span className={`inline-block mt-3 px-2 py-0.5 rounded-md text-[10px] ${toneClass}`}>{tone === "gold" ? "Highlight" : "Live"}</span>}
    </div>
  );
}