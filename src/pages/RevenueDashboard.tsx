/**
 * RevenueDashboard.tsx
 * ติดตามรายได้จริง vs เป้าหมาย รายเดือน — 3 บริการ
 *   - ทัวร์ OB   : target อ่านจาก crmStore (OB Team monthly_targets), actual กรอกเอง
 *   - รถเช่า     : target + actual กรอกเองใน marketingRevenueStore
 *   - จองตั๋ว    : target + actual กรอกเองใน marketingRevenueStore
 * Role: Marketing / Marketing Manager only (วางก่อน OKR Follower ใน sidebar)
 */
import { useState, useMemo } from "react";
import {
  TrendingUp, TrendingDown, Minus,
  Pencil, Check, X, ChevronRight, ChevronLeft,
  Car, Ticket, Globe,
} from "lucide-react";
import { useCRM } from "@/store/crmStore";
import { useMarketingRevenueStore } from "@/store/marketingRevenueStore";
import type { RevenueEntry } from "@/store/marketingRevenueStore";

// ─── Constants ────────────────────────────────────────────────────────────────
const THAI_MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

type ServiceKey = "ob" | "rental" | "ticket";

interface ServiceDef {
  key: ServiceKey;
  label: string;
  labelEn: string;
  color: string;
  bgGrad: string;
  icon: typeof Car;
}

const SERVICES: ServiceDef[] = [
  { key: "ob",     label: "ทัวร์ OB",  labelEn: "OB Tours",  color: "#8b5cf6", bgGrad: "from-violet-500/15 to-purple-500/5",   icon: Globe  },
  { key: "rental", label: "รถเช่า",    labelEn: "Car Rental", color: "#06b6d4", bgGrad: "from-cyan-500/15 to-sky-500/5",        icon: Car    },
  { key: "ticket", label: "จองตั๋ว",   labelEn: "Tickets",   color: "#f59e0b", bgGrad: "from-amber-500/15 to-yellow-500/5",    icon: Ticket },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function monthLabel(m: string, short = false): string {
  const [y, mo] = m.split("-");
  const th = THAI_MONTHS[parseInt(mo) - 1];
  return short ? th : `${th} ${parseInt(y) + 543}`;
}

function yearMonthsList(year: number): string[] {
  return Array.from({ length: 12 }, (_, i) =>
    `${year}-${String(i + 1).padStart(2, "0")}`
  );
}

const THIS_YEAR = new Date().getFullYear();

function fmtBaht(n: number | null | undefined, compact = false): string {
  if (n == null) return "—";
  if (compact) {
    if (n >= 1_000_000) return `฿${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    if (n >= 1_000)     return `฿${(n / 1_000).toFixed(0)}K`;
    return `฿${n}`;
  }
  return `฿${n.toLocaleString()}`;
}

function achPct(actual: number | null, target: number | null): number | null {
  if (!actual || !target) return null;
  return Math.round((actual / target) * 100);
}

function gapStatus(pct: number | null): "good" | "warn" | "bad" | "none" {
  if (pct == null) return "none";
  if (pct >= 100) return "good";
  if (pct >= 80)  return "warn";
  return "bad";
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────
interface BarChartProps {
  months: string[];
  targets: (number | null)[];
  actuals: (number | null)[];
  color: string;
}

function BarChart({ months, targets, actuals, color }: BarChartProps) {
  const allVals = [...targets, ...actuals].filter((v): v is number => v != null);
  const maxVal = allVals.length ? Math.max(...allVals) : 1;

  const W = 700;
  const H = 140;
  const PAD = { top: 8, right: 8, bottom: 28, left: 8 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const n = months.length;
  const groupW = innerW / n;
  const barW = Math.min(groupW * 0.32, 20);
  const gap = 3;

  function barH(val: number | null) {
    if (!val) return 0;
    return (val / maxVal) * innerH;
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ minHeight: 100 }}>
      {/* Y grid lines */}
      {[0.25, 0.5, 0.75, 1].map((frac) => {
        const y = PAD.top + innerH * (1 - frac);
        return (
          <line
            key={frac}
            x1={PAD.left} y1={y} x2={PAD.left + innerW} y2={y}
            stroke="currentColor" strokeOpacity={0.08} strokeWidth={1}
          />
        );
      })}
      {/* Bars */}
      {months.map((_, i) => {
        const cx = PAD.left + (i + 0.5) * groupW;
        const tH = barH(targets[i]);
        const aH = barH(actuals[i]);
        const tX = cx - barW - gap / 2;
        const aX = cx + gap / 2;

        return (
          <g key={i}>
            {/* Target bar (dimmed) */}
            {tH > 0 && (
              <rect
                x={tX} y={PAD.top + innerH - tH}
                width={barW} height={tH}
                fill={color} opacity={0.22} rx={3}
              />
            )}
            {/* Actual bar */}
            {aH > 0 && (
              <rect
                x={aX} y={PAD.top + innerH - aH}
                width={barW} height={aH}
                fill={color} opacity={0.85} rx={3}
              />
            )}
            {/* X label */}
            <text
              x={cx} y={H - 6}
              textAnchor="middle" fontSize={9} fill="currentColor" opacity={0.5}
            >
              {monthLabel(months[i], true)}
            </text>
          </g>
        );
      })}
      {/* Legend */}
      <rect x={PAD.left} y={2} width={10} height={6} fill={color} opacity={0.22} rx={1}/>
      <text x={PAD.left + 13} y={9} fontSize={8} fill="currentColor" opacity={0.5}>เป้า</text>
      <rect x={PAD.left + 40} y={2} width={10} height={6} fill={color} opacity={0.85} rx={1}/>
      <text x={PAD.left + 53} y={9} fontSize={8} fill="currentColor" opacity={0.5}>จริง</text>
    </svg>
  );
}

// ─── Achievement Badge ─────────────────────────────────────────────────────────
function AchBadge({ pct }: { pct: number | null }) {
  const st = gapStatus(pct);
  if (st === "none") return <span className="text-muted-foreground/50 text-xs">—</span>;
  const cls =
    st === "good" ? "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400" :
    st === "warn" ? "text-amber-600 bg-amber-500/10 dark:text-amber-400" :
                   "text-rose-600 bg-rose-500/10 dark:text-rose-400";
  const Icon = st === "good" ? TrendingUp : st === "warn" ? Minus : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold ${cls}`}>
      <Icon className="w-3 h-3" />
      {pct}%
    </span>
  );
}

// ─── YTD Summary Card ─────────────────────────────────────────────────────────
interface YTDCardProps {
  svc: ServiceDef;
  ytdActual: number;
  ytdTarget: number;
  active: boolean;
  onClick: () => void;
}

function YTDCard({ svc, ytdActual, ytdTarget, active, onClick }: YTDCardProps) {
  const pct = achPct(ytdActual, ytdTarget);
  const st  = gapStatus(pct);
  const Icon = svc.icon;

  const ringCls = active ? "ring-2" : "ring-0 hover:ring-1";
  const ringColor = svc.key === "ob" ? "ring-violet-400" : svc.key === "rental" ? "ring-cyan-400" : "ring-amber-400";

  return (
    <button
      onClick={onClick}
      className={`flex-1 min-w-0 bg-card rounded-xl border border-border/60 p-4 text-left transition-all ${ringCls} ${ringColor} bg-gradient-to-br ${svc.bgGrad}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: svc.color + "22" }}>
          <Icon className="w-4 h-4" style={{ color: svc.color }} />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{svc.labelEn}</p>
          <p className="text-sm font-semibold leading-tight">{svc.label}</p>
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex items-baseline justify-between gap-1">
          <span className="text-xs text-muted-foreground">จริง YTD</span>
          <span className="text-base font-bold tabular-nums" style={{ color: svc.color }}>{fmtBaht(ytdActual, true)}</span>
        </div>
        <div className="flex items-baseline justify-between gap-1">
          <span className="text-xs text-muted-foreground">เป้า YTD</span>
          <span className="text-sm tabular-nums text-muted-foreground">{fmtBaht(ytdTarget, true)}</span>
        </div>
        <div className="flex items-center justify-between gap-1 pt-1">
          <span className="text-xs text-muted-foreground">ทำได้</span>
          <AchBadge pct={pct} />
        </div>
      </div>
      {ytdTarget > 0 && (
        <div className="mt-3 h-1 rounded-full bg-muted/50 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min(100, (ytdActual / ytdTarget) * 100)}%`,
              background: st === "good" ? "#10b981" : st === "warn" ? "#f59e0b" : "#f43f5e",
            }}
          />
        </div>
      )}
    </button>
  );
}

// ─── Editable Row ─────────────────────────────────────────────────────────────
interface RowData {
  month: string;
  target: number | null;
  actual: number | null;
  targetEditable: boolean;
}

interface EditableRowProps {
  row: RowData;
  color: string;
  isCurrentMonth: boolean;
  onSave: (month: string, target: number | null, actual: number | null) => void;
}

function EditableRow({ row, color, isCurrentMonth, onSave }: EditableRowProps) {
  const [editing, setEditing] = useState(false);
  const [tVal, setTVal] = useState(String(row.target ?? ""));
  const [aVal, setAVal] = useState(String(row.actual ?? ""));

  function startEdit() {
    setTVal(String(row.target ?? ""));
    setAVal(String(row.actual ?? ""));
    setEditing(true);
  }

  function save() {
    const t = tVal.trim() === "" ? null : Number(tVal.replace(/[^0-9.]/g, ""));
    const a = aVal.trim() === "" ? null : Number(aVal.replace(/[^0-9.]/g, ""));
    onSave(row.month, row.targetEditable ? t : row.target, a);
    setEditing(false);
  }

  const pct = achPct(row.actual, row.target);
  const gap = row.actual != null && row.target != null ? row.actual - row.target : null;

  return (
    <tr className={`border-b border-border/40 transition-colors ${isCurrentMonth ? "bg-violet-500/5" : "hover:bg-muted/20"}`}>
      {/* Month */}
      <td className="py-2 px-3">
        <div className="flex items-center gap-1.5">
          {isCurrentMonth && <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0"/>}
          <span className={`text-sm font-medium ${isCurrentMonth ? "text-foreground" : "text-muted-foreground"}`}>
            {monthLabel(row.month)}
          </span>
        </div>
      </td>

      {/* Target */}
      <td className="py-2 px-3 text-right">
        {editing && row.targetEditable ? (
          <input
            type="number"
            value={tVal}
            onChange={(e) => setTVal(e.target.value)}
            className="w-28 text-right text-sm bg-muted/60 border border-border rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-violet-400"
            placeholder="0"
          />
        ) : (
          <span className="text-sm tabular-nums text-muted-foreground">{fmtBaht(row.target)}</span>
        )}
      </td>

      {/* Actual */}
      <td className="py-2 px-3 text-right">
        {editing ? (
          <input
            type="number"
            value={aVal}
            onChange={(e) => setAVal(e.target.value)}
            className="w-28 text-right text-sm bg-muted/60 border border-border rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-violet-400"
            placeholder="0"
          />
        ) : (
          <span className="text-sm font-semibold tabular-nums" style={{ color: row.actual ? color : undefined }}>
            {fmtBaht(row.actual)}
          </span>
        )}
      </td>

      {/* Achievement */}
      <td className="py-2 px-3 text-center">
        <AchBadge pct={pct} />
      </td>

      {/* Gap */}
      <td className="py-2 px-3 text-right">
        {gap != null ? (
          <span className={`text-xs tabular-nums font-medium ${gap >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>
            {gap >= 0 ? "+" : ""}{fmtBaht(gap, true)}
          </span>
        ) : (
          <span className="text-muted-foreground/40 text-xs">—</span>
        )}
      </td>

      {/* Edit controls */}
      <td className="py-2 px-2 text-center w-20">
        {editing ? (
          <div className="flex items-center justify-center gap-1">
            <button
              onClick={save}
              className="w-6 h-6 flex items-center justify-center rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-500"
            ><Check className="w-3.5 h-3.5"/></button>
            <button
              onClick={() => setEditing(false)}
              className="w-6 h-6 flex items-center justify-center rounded bg-muted/60 hover:bg-muted text-muted-foreground"
            ><X className="w-3.5 h-3.5"/></button>
          </div>
        ) : (
          <button
            onClick={startEdit}
            className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground/40 hover:text-foreground hover:bg-muted/60 transition-colors mx-auto"
          ><Pencil className="w-3 h-3"/></button>
        )}
      </td>
    </tr>
  );
}

// ─── Service Tab Content ───────────────────────────────────────────────────────
interface ServiceTabProps {
  svc: ServiceDef;
  rows: RowData[];
  months: string[];
  year: number;
  onSave: (month: string, target: number | null, actual: number | null) => void;
}

function ServiceTab({ svc, rows, months, year, onSave }: ServiceTabProps) {
  const rowMap = new Map(rows.map((r) => [r.month, r]));
  const nowStr = `${THIS_YEAR}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

  // compute chart data
  const chartTargets = months.map((m) => rowMap.get(m)?.target ?? null);
  const chartActuals = months.map((m) => rowMap.get(m)?.actual ?? null);

  // Monthly rows sorted ascending (ม.ค. ก่อน)
  const sortedRows = [...rows].sort((a, b) => a.month.localeCompare(b.month));

  // YTD: ปัจจุบัน → จนถึงเดือนนี้; ปีก่อน → ทั้งปี
  const curYear = String(year);
  const cutoff  = year === THIS_YEAR ? nowStr : `${year}-12`;
  const ytdRows  = rows.filter((r) => r.month.startsWith(curYear) && r.month <= cutoff);
  const ytdActual = ytdRows.reduce((s, r) => s + (r.actual ?? 0), 0);
  const ytdTarget = ytdRows.reduce((s, r) => s + (r.target ?? 0), 0);
  const ytdLabel  = year === THIS_YEAR ? "YTD" : "รวมทั้งปี";

  return (
    <div className="space-y-5">
      {/* Mini stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: `${ytdLabel} จริง`, val: fmtBaht(ytdActual, true), color: svc.color },
          { label: `${ytdLabel} เป้า`, val: fmtBaht(ytdTarget, true), color: undefined },
          { label: "ทำได้", val: (() => { const p = achPct(ytdActual, ytdTarget); return p ? `${p}%` : "—"; })(), color: gapStatus(achPct(ytdActual, ytdTarget)) === "good" ? "#10b981" : gapStatus(achPct(ytdActual, ytdTarget)) === "warn" ? "#f59e0b" : "#f43f5e" },
        ].map(({ label, val, color: c }) => (
          <div key={label} className="bg-card border border-border/50 rounded-lg px-3 py-2.5 text-center">
            <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
            <p className="text-lg font-bold tabular-nums leading-tight" style={{ color: c ?? "inherit" }}>{val}</p>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="bg-card border border-border/50 rounded-xl p-4">
        <p className="text-xs text-muted-foreground mb-2">จริง vs เป้า — ม.ค.–ธ.ค. {year + 543}</p>
        <BarChart months={months} targets={chartTargets} actuals={chartActuals} color={svc.color} />
      </div>

      {/* Monthly table */}
      <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="py-2.5 px-3 text-left text-xs font-semibold text-muted-foreground">เดือน</th>
              <th className="py-2.5 px-3 text-right text-xs font-semibold text-muted-foreground">เป้าหมาย</th>
              <th className="py-2.5 px-3 text-right text-xs font-semibold text-muted-foreground">ยอดจริง</th>
              <th className="py-2.5 px-3 text-center text-xs font-semibold text-muted-foreground">ทำได้</th>
              <th className="py-2.5 px-3 text-right text-xs font-semibold text-muted-foreground">Gap</th>
              <th className="py-2.5 px-2 text-center text-xs font-semibold text-muted-foreground w-20"></th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <EditableRow
                key={row.month}
                row={row}
                color={svc.color}
                isCurrentMonth={row.month === now}
                onSave={onSave}
              />
            ))}
          </tbody>
        </table>
        {sortedRows.length === 0 && (
          <div className="py-10 text-center text-muted-foreground text-sm">ยังไม่มีข้อมูล</div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function RevenueDashboard() {
  const [activeTab,    setActiveTab]    = useState<ServiceKey>("ob");
  const [selectedYear, setSelectedYear] = useState<number>(THIS_YEAR);

  const { entries, setEntry } = useMarketingRevenueStore();
  const obTargets = useCRM((s) => s.targets);

  const yearMonths = useMemo(() => yearMonthsList(selectedYear), [selectedYear]);
  const now = `${THIS_YEAR}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

  // ── Build row data per service (ทุกเดือนของปีที่เลือก) ──
  const allMonths = useMemo(() => {
    const yr = String(selectedYear);
    const set = new Set([
      ...yearMonths,
      ...entries.map((e) => e.month).filter((m) => m.startsWith(yr)),
    ]);
    return [...set].sort();
  }, [yearMonths, entries, selectedYear]);

  function getOBTarget(month: string): number | null {
    return obTargets.find((t) => t.rep === "OB Team" && t.month === month)?.total_sales ?? null;
  }

  function buildRows(svc: ServiceKey): RowData[] {
    return allMonths.map((month) => {
      const e: RevenueEntry | undefined = entries.find((en) => en.month === month);
      if (svc === "ob") return {
        month,
        target: getOBTarget(month),
        actual: e?.ob_actual ?? null,
        targetEditable: false,
      };
      if (svc === "rental") return {
        month,
        target: e?.rental_target ?? null,
        actual: e?.rental_actual ?? null,
        targetEditable: true,
      };
      return {
        month,
        target: e?.ticket_target ?? null,
        actual: e?.ticket_actual ?? null,
        targetEditable: true,
      };
    });
  }

  function handleSave(svc: ServiceKey) {
    return (month: string, target: number | null, actual: number | null) => {
      if (svc === "ob")     setEntry({ month, ob_actual: actual });
      if (svc === "rental") setEntry({ month, rental_target: target, rental_actual: actual });
      if (svc === "ticket") setEntry({ month, ticket_target: target, ticket_actual: actual });
    };
  }

  // ── YTD per service (for header cards) ──
  function ytd(svc: ServiceKey) {
    const rows = buildRows(svc);
    const yr = String(selectedYear);
    const cutoff = selectedYear === THIS_YEAR ? now : `${selectedYear}-12`;
    const ys = rows.filter((r) => r.month.startsWith(yr) && r.month <= cutoff);
    return {
      actual: ys.reduce((s, r) => s + (r.actual ?? 0), 0),
      target: ys.reduce((s, r) => s + (r.target ?? 0), 0),
    };
  }

  const activeRows   = buildRows(activeTab);
  const activeSvc    = SERVICES.find((s) => s.key === activeTab)!;
  const activeMonths = yearMonths;

  // ── Pagination — show 12 months max, handled by page offset ──
  // (for now all 12 months shown; pagination nav kept for future use)
  void page;
  void setPage;

  return (
    <div className="p-5 max-w-5xl mx-auto space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-violet-400" />
            Revenue Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            ติดตามรายได้จริง vs เป้าหมาย รายเดือน · 3 บริการ
          </p>
        </div>

        {/* Year picker */}
        <div className="flex items-center gap-1 bg-muted/40 rounded-xl p-1 shrink-0">
          <button
            onClick={() => setSelectedYear((y) => y - 1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
          ><ChevronLeft className="w-4 h-4"/></button>
          <span className="text-sm font-semibold px-2 min-w-[60px] text-center tabular-nums">
            {selectedYear + 543}
          </span>
          <button
            onClick={() => setSelectedYear((y) => y + 1)}
            disabled={selectedYear >= THIS_YEAR}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-card transition-colors disabled:opacity-30"
          ><ChevronRight className="w-4 h-4"/></button>
        </div>
      </div>

      {/* ── Summary Cards (clickable tabs) ── */}
      <div className="flex gap-3">
        {SERVICES.map((svc) => {
          const { actual, target } = ytd(svc.key);
          return (
            <YTDCard
              key={svc.key}
              svc={svc}
              ytdActual={actual}
              ytdTarget={target}
              active={activeTab === svc.key}
              onClick={() => setActiveTab(svc.key)}
            />
          );
        })}
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-1 bg-muted/40 rounded-xl p-1">
        {SERVICES.map((svc) => {
          const Icon = svc.icon;
          const isActive = activeTab === svc.key;
          return (
            <button
              key={svc.key}
              onClick={() => setActiveTab(svc.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" style={{ color: isActive ? svc.color : undefined }} />
              {svc.label}
              {svc.key === "ob" && (
                <span className="text-[10px] text-muted-foreground/60 bg-muted rounded px-1">เป้าจาก OB</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ── */}
      <ServiceTab
        key={`${activeTab}-${selectedYear}`}
        svc={activeSvc}
        rows={activeRows}
        months={activeMonths}
        year={selectedYear}
        onSave={handleSave(activeTab)}
      />

      {/* ── Note for OB tab ── */}
      {activeTab === "ob" && (
        <p className="text-xs text-muted-foreground bg-violet-500/5 border border-violet-500/15 rounded-lg px-3 py-2">
          💡 ยอดเป้าหมายทัวร์ OB ดึงมาจากหน้า <strong>OB Targets</strong> (ตั้งค่าโดย OB Manager) — ถ้าช่อง "เป้า" แสดง — ให้ไปกรอกใน OB Targets ก่อน
        </p>
      )}

    </div>
  );
}
