/**
 * MarketingDashboardPage.tsx — Team Sales Dashboard (Marketing view)
 * Route: /marketing/dashboard (rendered inside MarketingLayout)
 *
 * แสดงภาพรวมการขาย แยก 2 ทีม:
 *   - OB Team (สีม่วง) — assigned_to อยู่ใน obSet
 *   - Sales Team (สีน้ำเงิน) — assigned_to ไม่อยู่ใน obSet
 * เป็นข้อมูล aggregate ของทีม ไม่แสดงรายหัว
 */

import { useMemo, useState } from "react";
import { TrendingUp, Users2, Users, Target, ChevronDown, Award, Activity, Layers, Zap, Clock, AlertTriangle, BarChart3 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCRM, isClosedStatus, isLostStatus, formatTHB, type Lead, type BUType } from "@/store/crmStore";
import { useActiveOBNames } from "@/store/authStore";
import { DateRangeFilter, resolveRange, inRange, type RangePreset } from "@/components/DateRangeFilter";
import type { DateRange } from "react-day-picker";

// ── Month helpers ─────────────────────────────────────────────────────────────

function mkMonthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("th-TH", { month: "long", year: "numeric" });
}

function monthOptions() {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = mkMonthKey(d);
    return { key, label: monthLabel(key) };
  });
}

// ── Lead helpers ──────────────────────────────────────────────────────────────

function stageKey(l: Lead): "new" | "contacted" | "quotation" | "negotiating" | "won" | "lost" {
  if (isClosedStatus(l.status)) return "won";
  if (isLostStatus(l.status))   return "lost";
  if (l.status === "กำลังเจรจา" || l.status === "กำลังเจรจา") return "negotiating";
  if (l.status === "ส่ง Quote แล้ว") return "quotation";
  if (l.status === "ติดต่อแล้ว" || l.status === "ตอบแล้ว") return "contacted";
  return "new";
}

interface TeamStats {
  wonRevenue: number;
  wonPax:     number;
  wonCount:   number;
  lostCount:  number;
  activeCount: number;
  totalLeads: number;
  winRate:    number;
  target:     number;
  stages:     Record<string, number>;
}

function computeTeamStats(
  leads: Lead[],
  targets: ReturnType<typeof useCRM>["targets"] extends never ? [] : any[],
  reps: Set<string>,
  month: string,
  aggregateRep?: string, // เช่น "OB Team" — เป้าแบบรวมทีม (ไม่ใช่รายคน) ที่ตั้งจากหน้า "เป้าหมายทีม OB"
): TeamStats {
  const monthLeads = leads.filter((l) => {
    const d = l.created_at ?? "";
    return d.startsWith(month);
  });

  const wonRevenue  = monthLeads.filter((l) => isClosedStatus(l.status)).reduce((s, l) => s + (l.value ?? 0), 0);
  const wonPax      = monthLeads.filter((l) => isClosedStatus(l.status)).reduce((s, l) => s + (l.pax_count ?? 0), 0);
  const wonCount    = monthLeads.filter((l) => isClosedStatus(l.status)).length;
  const lostCount   = monthLeads.filter((l) => isLostStatus(l.status)).length;
  const activeCount = monthLeads.filter((l) => !isClosedStatus(l.status) && !isLostStatus(l.status)).length;
  const winRate     = (wonCount + lostCount) > 0 ? Math.round(wonCount / (wonCount + lostCount) * 100) : 0;

  // Priority: ใช้ target แบบ "รวมทีม" (aggregateRep) ถ้ามีและ > 0 — ไม่งั้น sum เป้ารายคน
  // เหมือน logic ใน OBDashboard.tsx (เป้าทีม OB ตั้งเป็นก้อนเดียว ไม่แยกรายคน)
  const aggTarget = aggregateRep
    ? targets.find((t: any) => t.month === month && t.rep === aggregateRep)
    : undefined;
  const target = (aggTarget && (aggTarget.total_sales ?? 0) > 0)
    ? aggTarget.total_sales
    : targets
        .filter((t: any) => t.month === month && reps.has(t.rep))
        .reduce((s: number, t: any) => s + (t.domestic_sales ?? 0) + (t.international_sales ?? 0), 0);

  const stages: Record<string, number> = { new: 0, contacted: 0, quotation: 0, negotiating: 0, won: 0, lost: 0 };
  monthLeads.forEach((l) => { stages[stageKey(l)] = (stages[stageKey(l)] ?? 0) + 1; });

  return { wonRevenue, wonPax, wonCount, lostCount, activeCount, totalLeads: monthLeads.length, winRate, target, stages };
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface StatCardProps { label: string; value: string; sub?: string; accent?: string }
function StatCard({ label, value, sub, accent }: StatCardProps) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-2xl font-semibold leading-none ${accent ?? ""}`}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

interface FunnelProps { stages: Record<string, number>; color: "purple" | "blue" }
function PipelineFunnel({ stages, color }: FunnelProps) {
  const wonColor  = color === "purple" ? "text-violet-600" : "text-blue-600";
  const lostColor = "text-red-500";
  const STAGE_LABELS = [
    { key: "new",         label: "New" },
    { key: "contacted",   label: "ติดต่อแล้ว" },
    { key: "quotation",   label: "Quotation" },
    { key: "negotiating", label: "Negotiate" },
    { key: "won",         label: "Won" },
    { key: "lost",        label: "Lost" },
  ];
  return (
    <div className="overflow-x-auto -mx-4 sm:-mx-5 px-4 sm:px-5 pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div className="flex gap-2 mt-3 min-w-[320px]">
        {STAGE_LABELS.map(({ key, label }) => (
          <div key={key} className="flex-1 min-w-[46px] text-center bg-muted/30 rounded-lg py-2 px-1 border border-border/50">
            <p className={`text-base font-semibold leading-none ${key === "won" ? wonColor : key === "lost" ? lostColor : ""}`}>
              {stages[key] ?? 0}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1 leading-none">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ProgressBarProps { value: number; max: number; color: "purple" | "blue" }
function ProgressBar({ value, max, color }: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, Math.round(value / max * 100)) : 0;
  const barCls = color === "purple" ? "bg-violet-600" : "bg-blue-600";
  const textCls = color === "purple" ? "text-violet-600" : "text-blue-600";
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap justify-between gap-1 text-xs">
        <span className="text-muted-foreground">ยอดขายทีม vs เป้าหมาย</span>
        <span className={`font-semibold ${textCls}`}>{formatTHB(value)} / {formatTHB(max)} ({pct}%)</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${barCls}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

interface TeamBlockProps {
  title:   string;
  badge:   string;
  members: number;
  stats:   TeamStats;
  color:   "purple" | "blue";
}
function TeamBlock({ title, badge, members, stats, color }: TeamBlockProps) {
  const borderCls  = color === "purple" ? "border-violet-300/60 dark:border-violet-700/40" : "border-blue-300/60 dark:border-blue-700/40";
  const badgeCls   = color === "purple"
    ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
    : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
  const wonCls     = color === "purple" ? "text-violet-600" : "text-blue-600";

  return (
    <div className={`rounded-2xl border ${borderCls} p-4 sm:p-5 space-y-4`}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color === "purple" ? "bg-violet-500/10" : "bg-blue-500/10"}`}>
          {color === "purple"
            ? <Users2 className="w-4.5 h-4.5 w-[18px] h-[18px] text-violet-600" />
            : <Users  className="w-[18px] h-[18px] text-blue-600" />}
        </div>
        <div>
          <h2 className="text-base font-semibold leading-none">{title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{members} คนในทีม</p>
        </div>
        <span className={`ml-auto text-[10px] font-semibold px-2.5 py-1 rounded-full ${badgeCls}`}>
          {badge}
        </span>
      </div>

      {/* Progress bar */}
      <ProgressBar value={stats.wonRevenue} max={stats.target} color={color} />

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
          <p className="text-[11px] text-muted-foreground">ยอดขาย</p>
          <p className={`text-sm font-semibold ${wonCls}`}>{formatTHB(stats.wonRevenue)}</p>
        </div>
        <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
          <p className="text-[11px] text-muted-foreground">Pax จอง</p>
          <p className="text-sm font-semibold">{stats.wonPax} ท่าน</p>
        </div>
        <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
          <p className="text-[11px] text-muted-foreground">Win Rate</p>
          <p className="text-sm font-semibold">{stats.winRate}%</p>
        </div>
        <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
          <p className="text-[11px] text-muted-foreground">Active Pipeline</p>
          <p className="text-sm font-semibold">{stats.activeCount} leads</p>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border/40 pt-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">
          Pipeline ทีม
        </p>
        <PipelineFunnel stages={stats.stages} color={color} />
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MarketingDashboardPage() {
  const obNames    = useActiveOBNames();
  const allLeads   = useCRM((s) => s.leads);
  const allTargets = useCRM((s) => s.targets);

  const months     = useMemo(monthOptions, []);
  const [month, setMonth] = useState(months[0].key);
  const [insightPreset, setInsightPreset] = useState<RangePreset>("year");
  const [insightCustom, setInsightCustom] = useState<DateRange | undefined>();
  const insightRange = resolveRange(insightPreset, insightCustom);

  const obSet = useMemo(() => new Set(obNames), [obNames]);

  // Separate leads by team (all-time pool, filter by month inside compute)
  const obLeads    = useMemo(() => allLeads.filter((l) => obSet.has(l.assigned_to)), [allLeads, obSet]);
  const salesLeads = useMemo(() => allLeads.filter((l) => !obSet.has(l.assigned_to)), [allLeads, obSet]);

  // Get sales rep names (not in OB) from targets — deduplicated
  // "OB Team" คือ rep พิเศษที่ใช้เก็บเป้าหมายรวมทีม OB (ตั้งจากหน้า "เป้าหมายทีม OB")
  // ไม่ใช่ชื่อคนจริง — ต้องกันไม่ให้หลุดเข้ามารวมกับเป้า Sales
  const salesReps = useMemo(() => {
    const s = new Set<string>();
    allTargets.forEach((t: any) => { if (!obSet.has(t.rep) && t.rep !== "All" && t.rep !== "OB Team") s.add(t.rep); });
    return s;
  }, [allTargets, obSet]);

  const obStats    = useMemo(() => computeTeamStats(obLeads, allTargets,    obSet,     month, "OB Team"), [obLeads,    allTargets, obSet,     month]);
  const salesStats = useMemo(() => computeTeamStats(salesLeads, allTargets, salesReps, month), [salesLeads, allTargets, salesReps, month]);

  // Combined KPI
  const combined = useMemo(() => ({
    revenue:  obStats.wonRevenue  + salesStats.wonRevenue,
    pax:      obStats.wonPax      + salesStats.wonPax,
    leads:    obStats.totalLeads  + salesStats.totalLeads,
    winRate:  (obStats.wonCount + salesStats.wonCount + obStats.lostCount + salesStats.lostCount) > 0
      ? Math.round((obStats.wonCount + salesStats.wonCount) / (obStats.wonCount + salesStats.wonCount + obStats.lostCount + salesStats.lostCount) * 100)
      : 0,
    target: obStats.target + salesStats.target,
  }), [obStats, salesStats]);

  // ── Marketing Insights ───────────────────────────────────────────────────────

  const insightLeads = useMemo(() => {
    if (!insightRange.from || !insightRange.to) return allLeads;
    return allLeads.filter((l) => inRange(l.closed_date ?? l.next_followup_date, insightRange));
  }, [allLeads, insightRange]);

  const wonLeadsAll = useMemo(() => allLeads.filter((l) => isClosedStatus(l.status)), [allLeads]);

  // ① BU Type Attribution
  const buAttribution = useMemo(() => {
    const BU_TYPES: BUType[] = ["ทัวร์ต่างประเทศ", "ทัวร์ภายในประเทศ", "เช่ารถ ท่องเที่ยว", "จองตั๋วเครื่องบิน"];
    const BU_COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--gold))", "hsl(210 90% 55%)"];
    return BU_TYPES.map((type, i) => {
      const inType = insightLeads.filter((l) => l.bu_type === type);
      const won = inType.filter((l) => isClosedStatus(l.status));
      const revenue = won.reduce((s, l) => s + l.quoted_price, 0);
      const rate = inType.length > 0 ? (won.length / inType.length) * 100 : 0;
      return { type, total: inType.length, won: won.length, revenue, rate, color: BU_COLORS[i] };
    }).sort((a, b) => b.total - a.total);
  }, [insightLeads]);

  // ② Funnel Drop-off
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
        if (isLostStatus(l.status)) return false;
        return (STAGE_ORDER[l.status] ?? 0) >= idx;
      }).length;
      const pct = totalLeads > 0 ? (count / totalLeads) * 100 : 0;
      return { ...s, count, pct };
    });
  }, [insightLeads]);

  // ③ Revenue Forecast
  const revForecast = useMemo(() => {
    const STAGE_PROB: Record<string, number> = {
      "ใหม่": 0.05, "ติดต่อแล้ว": 0.10, "ตอบแล้ว": 0.20, "ส่ง Quote แล้ว": 0.40, "กำลังเจรจา": 0.70,
    };
    const STAGE_LABELS: Record<string, string> = {
      "ใหม่": "Lead ใหม่", "ติดต่อแล้ว": "ติดต่อแล้ว", "ตอบแล้ว": "ตอบกลับ", "ส่ง Quote แล้ว": "ส่ง Quote", "กำลังเจรจา": "กำลังเจรจา",
    };
    const open = allLeads.filter((l) => !isClosedStatus(l.status) && !isLostStatus(l.status));
    const lostCount = allLeads.filter((l) => isLostStatus(l.status)).length;
    const wonCount = wonLeadsAll.length;
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
  }, [allLeads, wonLeadsAll]);

  // ④ Tour Program Performance
  const programPerf = useMemo(() => {
    const map = new Map<string, { program: string; total: number; won: number; revenue: number; pax: number }>();
    insightLeads.forEach((l) => {
      const key = l.program?.trim() || "ไม่ระบุโปรแกรม";
      const p = map.get(key) ?? { program: key, total: 0, won: 0, revenue: 0, pax: 0 };
      p.total++;
      if (isClosedStatus(l.status)) { p.won++; p.revenue += l.quoted_price; p.pax += l.pax_count; }
      map.set(key, p);
    });
    return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [insightLeads]);

  // ⑤ Stale / Overdue Follow-up
  const staleLeads = useMemo(() => {
    const now = new Date();
    const active = allLeads.filter((l) => !isClosedStatus(l.status) && !isLostStatus(l.status));
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
  }, [allLeads]);

  // ⑥ Lost Reason Analysis
  const lostReasons = useMemo(() => {
    const map = new Map<string, { reason: string; count: number; revenue: number }>();
    insightLeads.filter((l) => isLostStatus(l.status)).forEach((l) => {
      const key = l.lost_reason?.trim() || "ไม่ระบุสาเหตุ";
      const r = map.get(key) ?? { reason: key, count: 0, revenue: 0 };
      r.count++;
      r.revenue += l.quoted_price;
      map.set(key, r);
    });
    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 8);
  }, [insightLeads]);

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-5xl">

      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">ภาพรวมการขาย (Team Dashboard)</h1>
          <p className="text-sm text-muted-foreground mt-0.5">รายงานระดับทีม — OB Team vs Sales Team</p>
        </div>
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-full sm:w-44 h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((m) => (
              <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Combined KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="ยอดขายรวม (OB + Sales)"
          value={formatTHB(combined.revenue)}
          sub={combined.target > 0 ? `เป้า ${formatTHB(combined.target)}` : "ยังไม่มีเป้าหมาย"}
          accent="text-foreground"
        />
        <StatCard label="Pax รวม" value={`${combined.pax} ท่าน`} sub="จาก Lead ที่จองแล้ว" />
        <StatCard label="Lead รับเดือนนี้" value={`${combined.leads}`} sub="OB + Sales รวมกัน" />
        <StatCard label="Win Rate รวม" value={`${combined.winRate}%`} sub="ทั้งองค์กร" />
      </div>

      {/* OB Team block */}
      <TeamBlock
        title="ทีม Outbound (OB)"
        badge="OB Team"
        members={obNames.length}
        stats={obStats}
        color="purple"
      />

      {/* Sales Team block */}
      <TeamBlock
        title="ทีม Sales"
        badge="Sales Team"
        members={salesReps.size}
        stats={salesStats}
        color="blue"
      />

      {/* ─── Marketing Insights ─── */}
      <div className="pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Activity className="w-5 h-5 text-violet-600" /> Marketing Insights
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">ที่มา Lead / Funnel / Forecast / โปรแกรม / Follow-up / สาเหตุยกเลิก — {insightRange.label}</p>
          </div>
          <DateRangeFilter value={insightPreset} custom={insightCustom} onChange={(p, c) => { setInsightPreset(p); setInsightCustom(c); }} />
        </div>

        {/* Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

          {/* ① BU Type Attribution */}
          <div className="bg-card rounded-2xl border border-border p-4 sm:p-5 space-y-3">
            <div>
              <h3 className="font-semibold flex items-center gap-2 text-sm"><Zap className="w-4 h-4 text-violet-600" /> ที่มา Lead — แยกตามประเภทบริการ</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Conversion Rate ต่อประเภทบริการ</p>
            </div>
            <div className="space-y-3 pt-1">
              {buAttribution.map((b) => (
                <div key={b.type}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{b.type}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{b.total} lead</span>
                      <span className="text-[11px] font-bold px-1.5 py-0.5 rounded" style={{ background: b.color + "20", color: b.color }}>
                        ปิด {b.rate.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.max(3, b.rate)}%`, background: b.color }} />
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span className="text-[10px] text-muted-foreground">{b.won} ดีล</span>
                    <span className="text-[10px] text-muted-foreground">{formatTHB(b.revenue)}</span>
                  </div>
                </div>
              ))}
              {buAttribution.every((b) => b.total === 0) && (
                <p className="text-center text-muted-foreground text-sm py-4">ยังไม่มีข้อมูล</p>
              )}
            </div>
          </div>

          {/* ② Funnel Drop-off */}
          <div className="bg-card rounded-2xl border border-border p-4 sm:p-5 space-y-3">
            <div>
              <h3 className="font-semibold flex items-center gap-2 text-sm"><Layers className="w-4 h-4 text-violet-600" /> Sales Funnel — Drop-off แต่ละขั้น</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Lead ที่ยังอยู่ใน pipeline ณ แต่ละ stage</p>
            </div>
            <div className="space-y-2 pt-1">
              {funnelData.map((s, i) => {
                const COLORS = ["#9ca3af","hsl(210 90% 55%)","hsl(var(--gold))","hsl(var(--accent))","hsl(var(--primary-glow))","#7c3aed"];
                const prev = i > 0 ? funnelData[i - 1] : null;
                const drop = prev && prev.count > 0 ? ((prev.count - s.count) / prev.count * 100) : 0;
                return (
                  <div key={s.key} className="flex items-center gap-2">
                    <span className="w-24 text-right text-xs text-muted-foreground shrink-0">{s.label}</span>
                    <div className="flex-1 h-5 rounded bg-muted overflow-hidden">
                      <div className="h-full rounded" style={{ width: `${Math.max(2, s.pct)}%`, background: COLORS[i] }} />
                    </div>
                    <span className="w-10 text-right text-sm font-bold text-foreground shrink-0">{s.count}</span>
                    <span className="w-12 text-right text-[10px] shrink-0">
                      {drop > 0 ? <span className="text-rose-500">-{drop.toFixed(0)}%</span> : null}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

          {/* ③ Revenue Forecast */}
          <div className="bg-card rounded-2xl border border-border p-4 sm:p-5 space-y-3">
            <div>
              <h3 className="font-semibold flex items-center gap-2 text-sm"><Target className="w-4 h-4 text-amber-500" /> Revenue Forecast</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Pipeline ที่เปิดอยู่ × % โอกาสปิดดีล • Win Rate: {(revForecast.historicalWinRate * 100).toFixed(0)}%</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-violet-500/10 p-3 text-center border border-violet-500/20">
                <p className="text-[10px] text-muted-foreground font-semibold mb-1">Weighted</p>
                <p className="text-lg font-black text-violet-600 leading-none">{formatTHB(Math.round(revForecast.weighted))}</p>
              </div>
              <div className="rounded-xl bg-muted/50 p-3 text-center">
                <p className="text-[10px] text-muted-foreground font-semibold mb-1">Best Case</p>
                <p className="text-lg font-black text-foreground leading-none">{formatTHB(revForecast.bestCase)}</p>
              </div>
            </div>
            <div className="space-y-1.5 pt-1">
              {revForecast.byStage.map((s) => (
                <div key={s.stage} className="flex items-center gap-2 text-xs">
                  <span className="w-28 text-muted-foreground">{s.label}</span>
                  <span className="w-8 text-center text-[10px] font-bold bg-muted rounded px-1">{(s.prob * 100).toFixed(0)}%</span>
                  <span className="flex-1 text-foreground">{formatTHB(s.value)}</span>
                  <span className="font-semibold text-violet-600">{formatTHB(Math.round(s.wVal))}</span>
                  <span className="w-6 text-[10px] text-muted-foreground text-right">{s.count}</span>
                </div>
              ))}
              {revForecast.byStage.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-2">ไม่มี Lead ที่เปิดอยู่</p>
              )}
            </div>
          </div>

          {/* ④ Tour Program Performance */}
          <div className="bg-card rounded-2xl border border-border p-4 sm:p-5 space-y-3">
            <div>
              <h3 className="font-semibold flex items-center gap-2 text-sm"><BarChart3 className="w-4 h-4 text-violet-600" /> Tour Program — Top โปรแกรม</h3>
              <p className="text-xs text-muted-foreground mt-0.5">อันดับโปรแกรมตามรายได้ + Conversion</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground border-b border-border/50">
                    <th className="pb-2 text-left font-medium">โปรแกรม</th>
                    <th className="pb-2 text-right font-medium">Lead</th>
                    <th className="pb-2 text-right font-medium">Rate</th>
                    <th className="pb-2 text-right font-medium">รายได้</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {programPerf.map((p, i) => {
                    const rate = p.total > 0 ? (p.won / p.total) * 100 : 0;
                    return (
                      <tr key={p.program}>
                        <td className="py-1.5 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0 ${i === 0 ? "bg-amber-400 text-white" : "bg-muted text-muted-foreground"}`}>{i + 1}</span>
                            <span className="truncate max-w-[100px]" title={p.program}>{p.program}</span>
                          </div>
                        </td>
                        <td className="py-1.5 text-right text-muted-foreground">{p.total}</td>
                        <td className="py-1.5 text-right">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${rate >= 50 ? "bg-violet-500/15 text-violet-600" : rate >= 30 ? "bg-amber-400/15 text-amber-600" : "bg-muted text-muted-foreground"}`}>
                            {rate.toFixed(0)}%
                          </span>
                        </td>
                        <td className="py-1.5 text-right font-semibold">{formatTHB(p.revenue)}</td>
                      </tr>
                    );
                  })}
                  {programPerf.length === 0 && (
                    <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">ยังไม่มีข้อมูล</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Row 3 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* ⑤ Stale / Overdue Follow-up */}
          <div className="bg-card rounded-2xl border border-border p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-rose-500 shrink-0" />
              <h3 className="font-semibold text-sm">Lead เลยกำหนด Follow-up</h3>
              {staleLeads.overdue > 0 && (
                <span className="ml-auto text-[11px] font-bold text-white bg-rose-500 px-2 py-0.5 rounded-full">{staleLeads.overdue}</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground -mt-1">เฉลี่ยเลยมา {staleLeads.avgDays} วัน จาก {staleLeads.active} active leads</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-rose-500/10 p-3 text-center border border-rose-500/20">
                <p className="text-xl font-black text-rose-500 leading-none">{staleLeads.overdue}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">ค้าง</p>
              </div>
              <div className="rounded-xl bg-muted/50 p-3 text-center">
                <p className="text-xl font-black text-foreground leading-none">{staleLeads.active}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Active</p>
              </div>
              <div className="rounded-xl bg-muted/50 p-3 text-center">
                <p className="text-xl font-black text-foreground leading-none">
                  {staleLeads.active > 0 ? Math.round((staleLeads.overdue / staleLeads.active) * 100) : 0}%
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">% ค้าง</p>
              </div>
            </div>
            <div className="space-y-2 pt-1">
              {staleLeads.byRep.map((r) => (
                <div key={r.rep} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-violet-500/20 text-violet-700 flex items-center justify-center text-[10px] font-bold shrink-0">{r.rep[0]}</div>
                  <span className="flex-1 text-sm">{r.rep}</span>
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span className="text-sm font-bold text-rose-500">{r.count}</span>
                </div>
              ))}
              {staleLeads.byRep.length === 0 && (
                <p className="text-center text-emerald-600 font-semibold text-sm py-2">✓ ทุกคน Follow-up ทัน!</p>
              )}
            </div>
          </div>

          {/* ⑥ Lost Reason Analysis */}
          <div className="bg-card rounded-2xl border border-border p-4 sm:p-5 space-y-3">
            <div>
              <h3 className="font-semibold flex items-center gap-2 text-sm"><AlertTriangle className="w-4 h-4 text-amber-500" /> Lost Reason — สาเหตุที่ยกเลิก</h3>
              <p className="text-xs text-muted-foreground mt-0.5">จาก {insightLeads.filter((l) => isLostStatus(l.status)).length} deal ที่ยกเลิกในช่วงนี้</p>
            </div>
            {lostReasons.length > 0 ? (
              <div className="space-y-2.5 pt-1">
                {lostReasons.map((r, i) => {
                  const maxCount = lostReasons[0].count;
                  const pct = (r.count / maxCount) * 100;
                  return (
                    <div key={r.reason}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-foreground flex items-center gap-1">
                          <span className="text-[10px] text-muted-foreground font-mono w-3">{i + 1}.</span>
                          <span className="truncate max-w-[150px]" title={r.reason}>{r.reason}</span>
                        </span>
                        <span className="text-xs font-bold ml-2 shrink-0">{r.count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{formatTHB(r.revenue)}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-muted-foreground text-sm py-6">ยังไม่มี Lead ที่ยกเลิกในช่วงนี้</p>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
