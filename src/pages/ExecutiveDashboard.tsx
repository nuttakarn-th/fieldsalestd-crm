import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { BarChart3, TrendingUp, Building2, Landmark, GraduationCap, School, Filter, Trophy, Activity, Target, Clock, AlertTriangle, Layers, Zap } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, ComposedChart,
} from "recharts";
import { useCRM, formatTHB, LEAD_CATEGORIES, type LeadCategory, type SalesRep, type BUType } from "@/store/crmStore";
import { useActiveSalesNames, useCurrentUser } from "@/store/authStore";
import OBExecutiveDashboard from "@/pages/OBExecutiveDashboard";
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
  const user = useCurrentUser();
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
  const [insightPreset, setInsightPreset] = useState<RangePreset>("year");
  const [insightCustom, setInsightCustom] = useState<DateRange | undefined>();

  const [catFilter, setCatFilter] = useState<LeadCategory | "All">("All");
  const [repFocus, setRepFocus] = useState<SalesRep | "All">("All");

  const overviewRange = resolveRange(overviewPreset, overviewCustom);
  const repRange = resolveRange(repPreset, repCustom);
  const catRange = resolveRange(catPreset, catCustom);
  const rankRange = resolveRange(rankPreset, rankCustom);
  const insightRange = resolveRange(insightPreset, insightCustom);

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

  const wonLeads = useMemo(() => leads.filter((l) => l.status === "จองแล้ว" && l.closed_date), [leads]);

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
      const won = inCat.filter((l) => l.status === "จองแล้ว");
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
      const won = periodLeads.filter((l) => l.status === "จองแล้ว");
      const lost = periodLeads.filter((l) => l.status === "ยกเลิก");
      const quoted = periodLeads.filter((l) => ["ส่ง Quote แล้ว", "กำลังเจรจา", "จองแล้ว", "ยกเลิก"].includes(l.status));
      const revenue = won.reduce((s, l) => s + l.quoted_price, 0);
      const pax = won.reduce((s, l) => s + l.pax_count, 0);
      const conversion = periodLeads.length > 0 ? (won.length / periodLeads.length) * 100 : 0;
      const winRate = (won.length + lost.length) > 0 ? (won.length / (won.length + lost.length)) * 100 : 0;
      const qtWinRate = quoted.length > 0 ? (won.length / quoted.length) * 100 : 0;
      return { rep, deals: won.length, revenue, pax, conversion, winRate, qtWinRate, leadCount: periodLeads.length };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [leads, rankRange]);

  // ─── Marketing Insights shared filtered set ────────────────────────────────
  const insightLeads = useMemo(() => {
    if (!insightRange.from || !insightRange.to) return leads;
    return leads.filter((l) => inRange(l.closed_date ?? l.next_followup_date, insightRange));
  }, [leads, insightRange]);

  // ① Lead Source Attribution — by BU Type
  const buAttribution = useMemo(() => {
    const BU_TYPES: BUType[] = ["ทัวร์ต่างประเทศ", "ทัวร์ภายในประเทศ", "เช่ารถ ท่องเที่ยว", "จองตั๋วเครื่องบิน"];
    const BU_COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--gold))", "hsl(210 90% 55%)"];
    return BU_TYPES.map((type, i) => {
      const inType = insightLeads.filter((l) => l.bu_type === type);
      const won = inType.filter((l) => l.status === "จองแล้ว");
      const revenue = won.reduce((s, l) => s + l.quoted_price, 0);
      const rate = inType.length > 0 ? (won.length / inType.length) * 100 : 0;
      return { type, shortType: type.replace("ทัวร์", ""), total: inType.length, won: won.length, revenue, rate, color: BU_COLORS[i] };
    }).sort((a, b) => b.total - a.total);
  }, [insightLeads]);

  // ② Funnel Drop-off — current status distribution
  const funnelData = useMemo(() => {
    const STAGES = [
      { key: "ใหม่", label: "Lead ใหม่" },
      { key: "ติดต่อแล้ว", label: "ติดต่อแล้ว" },
      { key: "ตอบแล้ว", label: "ตอบกลับ" },
      { key: "ส่ง Quote แล้ว", label: "ส่ง Quote" },
      { key: "กำลังเจรจา", label: "กำลังเจรจา" },
      { key: "จองแล้ว", label: "ปิดดีล ✓" },
    ];
    const STAGE_ORDER: Record<string, number> = {
      "ใหม่": 0, "ติดต่อแล้ว": 1, "ตอบแล้ว": 2, "ส่ง Quote แล้ว": 3, "กำลังเจรจา": 4, "จองแล้ว": 5, "ยกเลิก": 99,
    };
    const totalLeads = insightLeads.length;
    return STAGES.map((s, idx) => {
      const count = insightLeads.filter((l) => {
        if (l.status === "ยกเลิก") return false;
        return (STAGE_ORDER[l.status] ?? 0) >= idx;
      }).length;
      const pct = totalLeads > 0 ? (count / totalLeads) * 100 : 0;
      return { ...s, count, pct };
    });
  }, [insightLeads]);

  // ③ Revenue Forecast — weighted pipeline
  const revForecast = useMemo(() => {
    const STAGE_PROB: Record<string, number> = {
      "ใหม่": 0.05, "ติดต่อแล้ว": 0.10, "ตอบแล้ว": 0.20, "ส่ง Quote แล้ว": 0.40, "กำลังเจรจา": 0.70,
    };
    const STAGE_LABELS: Record<string, string> = {
      "ใหม่": "Lead ใหม่", "ติดต่อแล้ว": "ติดต่อแล้ว", "ตอบแล้ว": "ตอบกลับ", "ส่ง Quote แล้ว": "ส่ง Quote", "กำลังเจรจา": "กำลังเจรจา",
    };
    const open = leads.filter((l) => !["จองแล้ว", "ยกเลิก"].includes(l.status));
    const lostCount = leads.filter((l) => l.status === "ยกเลิก").length;
    const wonCount = wonLeads.length;
    const historicalWinRate = (wonCount + lostCount) > 0 ? wonCount / (wonCount + lostCount) : 0.3;
    let weighted = 0;
    let bestCase = 0;
    const byStage = Object.entries(STAGE_PROB).map(([stage, prob]) => {
      const inStage = open.filter((l) => l.status === stage);
      const value = inStage.reduce((s, l) => s + l.quoted_price, 0);
      const wVal = value * prob;
      weighted += wVal;
      bestCase += value;
      return { stage, label: STAGE_LABELS[stage], count: inStage.length, value, prob, wVal };
    }).filter((s) => s.count > 0);
    return { byStage, weighted, bestCase, historicalWinRate, openCount: open.length };
  }, [leads, wonLeads]);

  // ④ Tour Program Performance — top 10 by revenue
  const programPerf = useMemo(() => {
    const map = new Map<string, { program: string; total: number; won: number; revenue: number; pax: number }>();
    insightLeads.forEach((l) => {
      const key = l.program?.trim() || "ไม่ระบุโปรแกรม";
      const p = map.get(key) ?? { program: key, total: 0, won: 0, revenue: 0, pax: 0 };
      p.total++;
      if (l.status === "จองแล้ว") { p.won++; p.revenue += l.quoted_price; p.pax += l.pax_count; }
      map.set(key, p);
    });
    return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [insightLeads]);

  // ⑤ Stale / Overdue Follow-up Leads
  const staleLeads = useMemo(() => {
    const now = new Date();
    const active = leads.filter((l) => !["จองแล้ว", "ยกเลิก"].includes(l.status));
    const overdue = active.filter((l) => {
      if (!l.next_followup_date) return true;
      return new Date(l.next_followup_date) < now;
    });
    const repMap = new Map<string, number>();
    overdue.forEach((l) => repMap.set(l.assigned_to, (repMap.get(l.assigned_to) ?? 0) + 1));
    const byRep = [...repMap.entries()].map(([rep, count]) => ({ rep, count })).sort((a, b) => b.count - a.count);
    const daysArr = overdue.filter((l) => l.next_followup_date)
      .map((l) => Math.floor((now.getTime() - new Date(l.next_followup_date!).getTime()) / (1000 * 60 * 60 * 24)));
    const avgDays = daysArr.length > 0 ? Math.round(daysArr.reduce((a, b) => a + b, 0) / daysArr.length) : 0;
    return { overdue: overdue.length, active: active.length, byRep, avgDays };
  }, [leads]);

  // ⑥ Lost Reason Analysis
  const lostReasons = useMemo(() => {
    const map = new Map<string, { reason: string; count: number; revenue: number }>();
    insightLeads.filter((l) => l.status === "ยกเลิก").forEach((l) => {
      const key = l.lost_reason?.trim() || "ไม่ระบุสาเหตุ";
      const r = map.get(key) ?? { reason: key, count: 0, revenue: 0 };
      r.count++;
      r.revenue += l.quoted_price;
      map.set(key, r);
    });
    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 8);
  }, [insightLeads]);

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

  // OB Manager → render OB-specific executive dashboard
  if (user?.role === "OB Manager") return <OBExecutiveDashboard />;

  // Sales Manager-only guard (after hooks)
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
                <defs>
                  <linearGradient id="barDom" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                  </linearGradient>
                  <linearGradient id="barIntl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={1} />
                    <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0.45} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatTHB(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Domestic" stackId="a" fill="url(#barDom)" radius={[0, 0, 8, 8]} />
                <Bar dataKey="International" stackId="a" fill="url(#barIntl)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="h-72">
            <p className="text-xs font-semibold text-muted-foreground mb-1">จำนวน Pax (ท่าน)</p>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={overview} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="paxTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="paxDom" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="paxIntl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--gold))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--gold))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="Pax_รวม" stroke="hsl(var(--primary))" strokeWidth={3} fill="url(#paxTotal)" dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 0 }} activeDot={{ r: 6 }} />
                <Area type="monotone" dataKey="Pax_Dom" stroke="hsl(var(--accent))" strokeWidth={2} fill="url(#paxDom)" />
                <Area type="monotone" dataKey="Pax_Intl" stroke="hsl(var(--gold))" strokeWidth={2} fill="url(#paxIntl)" />
              </AreaChart>
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
            <ComposedChart data={perRep}>
              <defs>
                {SALES_REPS.map((rep, i) => (
                  <linearGradient key={`g-${rep}`} id={`rep-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={PALETTE[i]} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={PALETTE[i]} stopOpacity={0.3} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatTHB(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {SALES_REPS.map((rep, i) => (
                <Bar key={rep} dataKey={rep} fill={`url(#rep-${i})`} radius={[8, 8, 0, 0]} />
              ))}
              {SALES_REPS.map((rep, i) => (
                <Line key={`t-${rep}`} type="monotone" dataKey={`เป้า ${rep}`} stroke={PALETTE[i]} strokeDasharray="5 5" strokeWidth={2} dot={false} />
              ))}
            </ComposedChart>
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
                <defs>
                  {PALETTE.map((color, i) => (
                    <linearGradient key={`cat-${i}`} id={`cat-${i}`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={color} stopOpacity={1} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis dataKey="category" type="category" stroke="hsl(var(--muted-foreground))" fontSize={11} width={130} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                <Bar dataKey="leads" radius={[0, 8, 8, 0]}>
                  {categoryStats.map((_, i) => <Cell key={i} fill={`url(#cat-${i})`} />)}
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

      {/* ─── MARKETING INSIGHTS ─── */}
      <div className="pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
              <Activity className="w-5 h-5 text-primary" /> Marketing Insights
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">ที่มา Lead / Funnel / Forecast / โปรแกรม / Follow-up / สาเหตุยกเลิก — ช่วงเวลา: {insightRange.label}</p>
          </div>
          <DateRangeFilter value={insightPreset} custom={insightCustom} onChange={(p, c) => { setInsightPreset(p); setInsightCustom(c); }} />
        </div>

        {/* Row 1: Lead Source Attribution + Funnel Drop-off */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

          {/* ① Lead Source Attribution */}
          <section className="bg-card rounded-xl border shadow-soft p-5">
            <h3 className="font-bold flex items-center gap-2 mb-1"><Zap className="w-4 h-4 text-primary" /> ที่มา Lead — แยกตามประเภทบริการ</h3>
            <p className="text-xs text-muted-foreground mb-4">Lead ทั้งหมด + Conversion Rate ต่อประเภทบริการ</p>
            <div className="space-y-3">
              {buAttribution.map((b) => (
                <div key={b.type}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground">{b.type}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{b.total} lead</span>
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: b.color + "20", color: b.color }}>
                        ปิดได้ {b.rate.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.max(4, b.rate)}%`, background: b.color }} />
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span className="text-[10px] text-muted-foreground">{b.won} ดีลที่ปิดสำเร็จ</span>
                    <span className="text-[10px] text-muted-foreground">{formatTHB(b.revenue)}</span>
                  </div>
                </div>
              ))}
              {buAttribution.every((b) => b.total === 0) && (
                <p className="text-center text-muted-foreground text-sm py-6">ยังไม่มีข้อมูลในช่วงนี้</p>
              )}
            </div>
          </section>

          {/* ② Funnel Drop-off */}
          <section className="bg-card rounded-xl border shadow-soft p-5">
            <h3 className="font-bold flex items-center gap-2 mb-1"><Layers className="w-4 h-4 text-accent" /> Sales Funnel — Drop-off แต่ละขั้น</h3>
            <p className="text-xs text-muted-foreground mb-4">สัดส่วน Lead ที่ยังอยู่ใน pipeline ณ แต่ละ stage</p>
            <div className="space-y-2.5">
              {funnelData.map((s, i) => {
                const COLORS = [
                  "hsl(var(--muted-foreground))",
                  "hsl(210 90% 55%)",
                  "hsl(var(--gold))",
                  "hsl(var(--accent))",
                  "hsl(var(--primary-glow))",
                  "hsl(var(--primary))",
                ];
                const prev = i > 0 ? funnelData[i - 1] : null;
                const drop = prev && prev.count > 0 ? ((prev.count - s.count) / prev.count * 100) : 0;
                return (
                  <div key={s.key} className="flex items-center gap-3">
                    <div className="w-24 text-right text-xs text-muted-foreground shrink-0">{s.label}</div>
                    <div className="flex-1 h-6 rounded bg-muted overflow-hidden relative">
                      <div className="h-full rounded transition-all duration-700"
                        style={{ width: `${Math.max(2, s.pct)}%`, background: COLORS[i] }} />
                    </div>
                    <div className="w-20 shrink-0 text-right">
                      <span className="text-sm font-bold text-foreground">{s.count}</span>
                      <span className="text-[10px] text-muted-foreground ml-1">({s.pct.toFixed(0)}%)</span>
                    </div>
                    {drop > 0 && (
                      <div className="w-14 shrink-0 text-right">
                        <span className="text-[10px] text-rose-500">-{drop.toFixed(0)}%</span>
                      </div>
                    )}
                    {drop === 0 && i > 0 && <div className="w-14 shrink-0" />}
                    {i === 0 && <div className="w-14 shrink-0" />}
                  </div>
                );
              })}
              {insightLeads.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-6">ยังไม่มีข้อมูลในช่วงนี้</p>
              )}
            </div>
          </section>
        </div>

        {/* Row 2: Revenue Forecast + Tour Program Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

          {/* ③ Revenue Forecast */}
          <section className="bg-card rounded-xl border shadow-soft p-5">
            <h3 className="font-bold flex items-center gap-2 mb-1"><Target className="w-4 h-4 text-gold" /> Revenue Forecast — ประมาณการรายได้</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Pipeline ที่เปิดอยู่ × โอกาสปิดดีลแต่ละ Stage • Win Rate ประวัติ: {(revForecast.historicalWinRate * 100).toFixed(0)}%
            </p>

            {/* Big number */}
            <div className="flex gap-4 mb-5">
              <div className="flex-1 rounded-xl bg-primary/10 p-4 text-center">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-1">Weighted Forecast</p>
                <p className="text-2xl font-black text-primary leading-none">{formatTHB(Math.round(revForecast.weighted))}</p>
                <p className="text-[10px] text-muted-foreground mt-1">ตาม % โอกาสสำเร็จ</p>
              </div>
              <div className="flex-1 rounded-xl bg-muted/60 p-4 text-center">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-1">Best Case</p>
                <p className="text-2xl font-black text-foreground leading-none">{formatTHB(revForecast.bestCase)}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{revForecast.openCount} deals ในมือ</p>
              </div>
            </div>

            {/* By stage breakdown */}
            <div className="space-y-2">
              {revForecast.byStage.map((s) => (
                <div key={s.stage} className="flex items-center gap-2 text-sm">
                  <div className="w-28 text-xs text-muted-foreground">{s.label}</div>
                  <div className="w-10 text-center text-[10px] font-bold text-foreground/60 bg-muted rounded px-1">{(s.prob * 100).toFixed(0)}%</div>
                  <div className="flex-1 text-xs text-foreground">{formatTHB(s.value)}</div>
                  <div className="text-xs font-semibold text-primary">{formatTHB(Math.round(s.wVal))}</div>
                  <div className="w-8 text-[10px] text-muted-foreground text-right">{s.count}</div>
                </div>
              ))}
              {revForecast.byStage.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-4">ไม่มี Lead ที่เปิดอยู่</p>
              )}
            </div>
          </section>

          {/* ④ Tour Program Performance */}
          <section className="bg-card rounded-xl border shadow-soft p-5">
            <h3 className="font-bold flex items-center gap-2 mb-1"><BarChart3 className="w-4 h-4 text-primary" /> Tour Program — ประสิทธิภาพโปรแกรม</h3>
            <p className="text-xs text-muted-foreground mb-4">Top โปรแกรมที่สร้างรายได้สูงสุด + อัตราการปิดดีล</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground border-b">
                    <th className="pb-2 text-left font-medium">โปรแกรม</th>
                    <th className="pb-2 text-right font-medium">Lead</th>
                    <th className="pb-2 text-right font-medium">ปิด</th>
                    <th className="pb-2 text-right font-medium">Rate</th>
                    <th className="pb-2 text-right font-medium">รายได้</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {programPerf.map((p, i) => {
                    const rate = p.total > 0 ? (p.won / p.total) * 100 : 0;
                    return (
                      <tr key={p.program} className="hover:bg-muted/20">
                        <td className="py-2 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${i === 0 ? "bg-gradient-gold text-gold-foreground" : "bg-muted text-muted-foreground"}`}>{i + 1}</span>
                            <span className="truncate max-w-[120px]" title={p.program}>{p.program}</span>
                          </div>
                        </td>
                        <td className="py-2 text-right text-muted-foreground">{p.total}</td>
                        <td className="py-2 text-right font-semibold">{p.won}</td>
                        <td className="py-2 text-right">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${rate >= 50 ? "bg-primary/15 text-primary" : rate >= 30 ? "bg-gold/15 text-gold-foreground" : "bg-muted text-muted-foreground"}`}>
                            {rate.toFixed(0)}%
                          </span>
                        </td>
                        <td className="py-2 text-right font-semibold text-foreground">{formatTHB(p.revenue)}</td>
                      </tr>
                    );
                  })}
                  {programPerf.length === 0 && (
                    <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">ยังไม่มีข้อมูลในช่วงนี้</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Row 3: Stale Leads + Lost Reason */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* ⑤ Stale / Overdue Follow-up */}
          <section className="bg-card rounded-xl border shadow-soft p-5">
            <h3 className="font-bold flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-rose-500" />
              Lead ที่เลยกำหนด Follow-up
              {staleLeads.overdue > 0 && (
                <span className="ml-auto text-xs font-bold text-white bg-rose-500 px-2 py-0.5 rounded-full">{staleLeads.overdue}</span>
              )}
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Lead ที่ไม่มีวัน Follow-up หรือเลยกำหนดแล้ว — เฉลี่ยเลยมา {staleLeads.avgDays} วัน
            </p>

            {/* Summary bar */}
            <div className="flex gap-3 mb-5">
              <div className="flex-1 rounded-xl bg-rose-500/10 p-3 text-center border border-rose-500/20">
                <p className="text-2xl font-black text-rose-500 leading-none">{staleLeads.overdue}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Lead ค้าง</p>
              </div>
              <div className="flex-1 rounded-xl bg-muted/50 p-3 text-center">
                <p className="text-2xl font-black text-foreground leading-none">{staleLeads.active}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Active ทั้งหมด</p>
              </div>
              <div className="flex-1 rounded-xl bg-muted/50 p-3 text-center">
                <p className="text-2xl font-black text-foreground leading-none">
                  {staleLeads.active > 0 ? Math.round((staleLeads.overdue / staleLeads.active) * 100) : 0}%
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">% ค้าง</p>
              </div>
            </div>

            {/* By rep */}
            <div className="space-y-2">
              {staleLeads.byRep.map((r) => (
                <div key={r.rep} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-gradient-pink text-accent-foreground flex items-center justify-center text-[10px] font-bold shrink-0">{r.rep[0]}</div>
                  <span className="flex-1 text-sm text-foreground">{r.rep}</span>
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                    <span className="text-sm font-bold text-rose-500">{r.count}</span>
                    <span className="text-xs text-muted-foreground">lead ค้าง</span>
                  </div>
                </div>
              ))}
              {staleLeads.byRep.length === 0 && (
                <p className="text-center text-emerald-600 font-semibold text-sm py-4">✓ ไม่มี Lead ค้าง — ทุกคน Follow-up ทัน!</p>
              )}
            </div>
          </section>

          {/* ⑥ Lost Reason Analysis */}
          <section className="bg-card rounded-xl border shadow-soft p-5">
            <h3 className="font-bold flex items-center gap-2 mb-1"><AlertTriangle className="w-4 h-4 text-amber-500" /> Lost Reason — สาเหตุที่ลูกค้ายกเลิก</h3>
            <p className="text-xs text-muted-foreground mb-4">
              จาก {insightLeads.filter((l) => l.status === "ยกเลิก").length} deal ที่ยกเลิกในช่วงนี้
            </p>
            {lostReasons.length > 0 ? (
              <div className="space-y-3">
                {lostReasons.map((r, i) => {
                  const maxCount = lostReasons[0].count;
                  const pct = (r.count / maxCount) * 100;
                  return (
                    <div key={r.reason}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-foreground flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground font-mono w-4">{i + 1}.</span>
                          <span className="truncate max-w-[160px]" title={r.reason}>{r.reason}</span>
                        </span>
                        <span className="text-xs font-bold text-foreground ml-2 shrink-0">{r.count} deal</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-amber-400 transition-all duration-700" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">มูลค่า {formatTHB(r.revenue)}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-muted-foreground text-sm py-8">ยังไม่มี Lead ที่ยกเลิกในช่วงนี้</p>
            )}
          </section>
        </div>
      </div>

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