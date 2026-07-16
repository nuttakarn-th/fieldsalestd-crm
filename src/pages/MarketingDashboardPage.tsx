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
import { TrendingUp, Users2, Users, Target, ChevronDown, Award } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCRM, isClosedStatus, isLostStatus, formatTHB, type Lead } from "@/store/crmStore";
import { useActiveOBNames } from "@/store/authStore";

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
  if (l.status === "Negotiating" || l.status === "กำลังเจรจา") return "negotiating";
  if (l.status === "Quotation Sent") return "quotation";
  if (l.status === "Contacted" || l.status === "ตอบแล้ว") return "contacted";
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

function computeTeamStats(leads: Lead[], targets: ReturnType<typeof useCRM>["targets"] extends never ? [] : any[], reps: Set<string>, month: string): TeamStats {
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

  const target = targets
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
    { key: "contacted",   label: "Contacted" },
    { key: "quotation",   label: "Quotation" },
    { key: "negotiating", label: "Negotiate" },
    { key: "won",         label: "Won" },
    { key: "lost",        label: "Lost" },
  ];
  return (
    <div className="flex gap-2 mt-3">
      {STAGE_LABELS.map(({ key, label }) => (
        <div key={key} className="flex-1 text-center bg-muted/30 rounded-lg py-2 px-1 border border-border/50">
          <p className={`text-base font-semibold leading-none ${key === "won" ? wonColor : key === "lost" ? lostColor : ""}`}>
            {stages[key] ?? 0}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1 leading-none">{label}</p>
        </div>
      ))}
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
      <div className="flex justify-between text-xs">
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
    <div className={`rounded-2xl border ${borderCls} p-5 space-y-4`}>
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
      <div className="grid grid-cols-4 gap-2">
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

  const obSet = useMemo(() => new Set(obNames), [obNames]);

  // Separate leads by team (all-time pool, filter by month inside compute)
  const obLeads    = useMemo(() => allLeads.filter((l) => obSet.has(l.assigned_to)), [allLeads, obSet]);
  const salesLeads = useMemo(() => allLeads.filter((l) => !obSet.has(l.assigned_to)), [allLeads, obSet]);

  // Get sales rep names (not in OB) from targets — deduplicated
  const salesReps = useMemo(() => {
    const s = new Set<string>();
    allTargets.forEach((t: any) => { if (!obSet.has(t.rep) && t.rep !== "All") s.add(t.rep); });
    return s;
  }, [allTargets, obSet]);

  const obStats    = useMemo(() => computeTeamStats(obLeads, allTargets,    obSet,     month), [obLeads,    allTargets, obSet,     month]);
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

  return (
    <div className="p-5 sm:p-7 space-y-6 max-w-5xl">

      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">ภาพรวมการขาย (Team Dashboard)</h1>
          <p className="text-sm text-muted-foreground mt-0.5">รายงานระดับทีม — OB Team vs Sales Team</p>
        </div>
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-44 h-9 text-sm">
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
    </div>
  );
}
