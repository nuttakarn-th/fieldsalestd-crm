/**
 * RevenueDashboard.tsx v2 — redesigned
 * Zone 1 : Header + year picker + 3 service tabs
 * Zone 2 : Bar (actual) + Line (target) combo chart + 4-stat KPI row
 * Zone 3 : Click-to-edit table · past+current visible · future collapsed
 *
 * ทุก field กรอกเองจาก store (ไม่ดึง crmStore)
 */
import { useState, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
import { useMarketingRevenueStore } from "@/store/marketingRevenueStore";

// ── Module-level constants ────────────────────────────────────────────────────
const THIS_YEAR = new Date().getFullYear();
const THIS_MONTH = new Date().getMonth(); // 0-indexed
const NOW_STR = `${THIS_YEAR}-${String(THIS_MONTH + 1).padStart(2, "0")}`;

const THAI_MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

const SERVICES = [
  {
    key: "ob"     as const, label: "ทัวร์ OB", color: "#8b5cf6",
    tf: "ob_target"     as const, af: "ob_actual"     as const,
  },
  {
    key: "rental" as const, label: "รถเช่า",   color: "#06b6d4",
    tf: "rental_target" as const, af: "rental_actual" as const,
  },
  {
    key: "ticket" as const, label: "จองตั๋ว",  color: "#f59e0b",
    tf: "ticket_target" as const, af: "ticket_actual" as const,
  },
] as const;

type SvcKey = typeof SERVICES[number]["key"];

interface RowData {
  month: string;
  target: number | null;
  actual: number | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function yearMonthsList(year: number): string[] {
  return Array.from({ length: 12 }, (_, i) =>
    `${year}-${String(i + 1).padStart(2, "0")}`
  );
}

function fmtShort(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000)     return `${(v / 1_000).toFixed(0)}K`;
  return String(Math.round(v));
}

function fmtFull(v: number): string {
  return `฿${v.toLocaleString("th-TH")}`;
}

// ── EditCell — click a cell to edit (spreadsheet style) ───────────────────────
function EditCell({
  value, onSave, accent,
}: {
  value: number | null;
  onSave: (v: number | null) => void;
  accent: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState("");

  function start() {
    setDraft(value != null ? String(value) : "");
    setEditing(true);
  }

  function commit() {
    const raw = draft.trim().replace(/[,฿\s]/g, "");
    const n   = raw === "" ? null : Number(raw);
    onSave(n != null && !isNaN(n) ? n : null);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        autoFocus
        type="text"
        inputMode="numeric"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === "Enter")  { e.preventDefault(); commit(); }
          if (e.key === "Escape") setEditing(false);
        }}
        className="w-full bg-background border border-violet-400/50 rounded px-2 py-0.5
                   text-right text-sm font-mono focus:outline-none focus:ring-1
                   focus:ring-violet-400/40"
      />
    );
  }

  return (
    <button
      onClick={start}
      title="คลิกเพื่อแก้ไข"
      className="w-full text-right px-1 py-0.5 rounded
                 hover:bg-muted/50 transition-colors text-sm group"
    >
      {value != null ? (
        <span className="font-mono" style={{ color: accent }}>{fmtFull(value)}</span>
      ) : (
        <span className="text-muted-foreground/25 group-hover:text-muted-foreground/50
                         transition-colors">—</span>
      )}
    </button>
  );
}

// ── BarLineChart ──────────────────────────────────────────────────────────────
function BarLineChart({
  months, targets, actuals, color,
}: {
  months: string[];
  targets: (number | null)[];
  actuals: (number | null)[];
  color: string;
}) {
  const allVals = [...targets, ...actuals].filter((v): v is number => v != null && v > 0);
  const maxVal  = allVals.length ? Math.max(...allVals) * 1.18 : 1_000_000;

  const W = 640, H = 140;
  const PL = 4, PR = 4, PT = 10, PB = 22;
  const iW = W - PL - PR;
  const iH = H - PT - PB;
  const n     = months.length;
  const slotW = iW / n;
  const barW  = Math.max(slotW * 0.42, 6);

  function cx(i: number) { return PL + (i + 0.5) * slotW; }
  function cy(v: number) { return PT + iH * (1 - v / maxVal); }

  // Dashed target line
  const pts: [number, number][] = [];
  months.forEach((_, i) => {
    const t = targets[i];
    if (t != null && t > 0) pts.push([cx(i), cy(t)]);
  });
  const linePath = pts.length > 1
    ? `M ${pts.map(([x, y]) => `${x},${y}`).join(" L ")}`
    : "";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none">
      {/* Y grid */}
      {[0.25, 0.5, 0.75, 1].map(f => (
        <line key={f}
          x1={PL} y1={cy(maxVal * f)} x2={W - PR} y2={cy(maxVal * f)}
          stroke="currentColor" strokeOpacity={0.06} strokeWidth={1} />
      ))}

      {/* Current month column highlight */}
      {months.map((m, i) => m === NOW_STR ? (
        <rect key="cur-bg"
          x={cx(i) - slotW / 2 + 1} y={PT}
          width={slotW - 2} height={iH}
          fill={color} fillOpacity={0.09} rx={4} />
      ) : null)}

      {/* Bars — actual */}
      {months.map((m, i) => {
        const a = actuals[i];
        if (!a || a <= 0) return null;
        const bH   = iH * (a / maxVal);
        const past = m <= NOW_STR;
        return (
          <rect key={`b${i}`}
            x={cx(i) - barW / 2} y={cy(a)}
            width={barW} height={bH}
            fill={color} opacity={past ? 0.82 : 0.25} rx={3} />
        );
      })}

      {/* Dashed target line */}
      {linePath && (
        <path d={linePath} fill="none" stroke={color}
          strokeWidth={1.5} strokeOpacity={0.42} strokeDasharray="4,3" />
      )}

      {/* Target dots */}
      {months.map((_, i) => {
        const t = targets[i];
        if (!t || t <= 0) return null;
        return (
          <circle key={`d${i}`} cx={cx(i)} cy={cy(t)} r={2.5}
            fill="none" stroke={color} strokeWidth={1.5} strokeOpacity={0.52} />
        );
      })}

      {/* X month labels */}
      {months.map((m, i) => (
        <text key={`l${i}`}
          x={cx(i)} y={H - 5}
          textAnchor="middle"
          fontSize={8} fill="currentColor"
          opacity={m === NOW_STR ? 0.88 : 0.38}
          fontWeight={m === NOW_STR ? "700" : "400"}>
          {THAI_MONTHS[parseInt(m.split("-")[1]) - 1]}
        </text>
      ))}
    </svg>
  );
}

// ── KPI stat box ──────────────────────────────────────────────────────────────
function Stat({
  label, value, color,
}: {
  label: string; value: string; color?: string;
}) {
  return (
    <div className="flex-1 min-w-0 bg-muted/30 rounded-xl px-4 py-3">
      <p className="text-xs text-muted-foreground leading-none">{label}</p>
      <p className="text-xl font-bold mt-1.5 leading-none tabular-nums" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

// ── MonthRow (module-level so React sees a stable component reference) ─────────
function MonthRow({
  row, svcColor, onSave, isCurrent = false, dim = false,
}: {
  row: RowData;
  svcColor: string;
  onSave: (month: string, field: "target" | "actual", val: number | null) => void;
  isCurrent?: boolean;
  dim?: boolean;
}) {
  const { month, target, actual } = row;
  const mi     = parseInt(month.split("-")[1]) - 1;
  const pctRow = target && actual && target > 0
    ? Math.round((actual / target) * 100)
    : null;
  const gapRow = target != null && actual != null ? actual - target : null;

  return (
    <tr
      className={`border-b border-border/40 transition-colors hover:bg-muted/20
                  ${isCurrent ? "bg-muted/25" : ""}
                  ${dim ? "opacity-50" : ""}`}
    >
      {/* Month label */}
      <td className="px-3 py-2 text-sm whitespace-nowrap">
        <span className="font-medium text-foreground">{THAI_MONTHS[mi]}</span>
        {isCurrent && (
          <span
            className="ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{ background: `${svcColor}22`, color: svcColor }}
          >
            เดือนนี้
          </span>
        )}
      </td>

      {/* Target — editable */}
      <td className="px-2 py-1.5 w-36">
        <EditCell
          value={target}
          accent={svcColor}
          onSave={v => onSave(month, "target", v)}
        />
      </td>

      {/* Actual — editable */}
      <td className="px-2 py-1.5 w-36">
        <EditCell
          value={actual}
          accent={svcColor}
          onSave={v => onSave(month, "actual", v)}
        />
      </td>

      {/* Achievement % */}
      <td className="px-3 py-2 text-sm text-right font-mono w-20">
        {pctRow != null ? (
          <span className={
            pctRow >= 100 ? "text-emerald-500"
            : pctRow >= 80 ? "text-amber-500"
            : "text-red-400"
          }>{pctRow}%</span>
        ) : (
          <span className="text-muted-foreground/30">—</span>
        )}
      </td>

      {/* Gap */}
      <td className="px-3 py-2 text-sm text-right font-mono w-28">
        {gapRow != null ? (
          <span className={gapRow >= 0 ? "text-emerald-500" : "text-red-400"}>
            {gapRow >= 0 ? "+" : ""}{fmtShort(gapRow)}
          </span>
        ) : (
          <span className="text-muted-foreground/30">—</span>
        )}
      </td>
    </tr>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function RevenueDashboard() {
  const { entries, setEntry } = useMarketingRevenueStore();

  const [selectedYear, setSelectedYear] = useState(THIS_YEAR);
  const [activeTab,    setActiveTab]    = useState<SvcKey>("ob");
  const [showFuture,   setShowFuture]   = useState(false);

  const svc = SERVICES.find(s => s.key === activeTab)!;

  // ── Derived data ───────────────────────────────────────────────────────────
  const yearMonths = useMemo(() => yearMonthsList(selectedYear), [selectedYear]);

  const allRows = useMemo<RowData[]>(() =>
    yearMonths.map(m => {
      const e = entries.find(x => x.month === m);
      return {
        month:  m,
        target: e ? (e[svc.tf] ?? null) : null,
        actual: e ? (e[svc.af] ?? null) : null,
      };
    }),
    [yearMonths, entries, svc]
  );

  // Divide rows relative to real NOW_STR (not selected year)
  const pastRows   = allRows.filter(r => r.month <= NOW_STR);
  const futureRows = allRows.filter(r => r.month > NOW_STR);

  // KPI aggregates (past + current only)
  const ytdActual = pastRows.reduce((s, r) => s + (r.actual ?? 0), 0);
  const ytdTarget = pastRows.reduce((s, r) => s + (r.target ?? 0), 0);
  const pct       = ytdTarget > 0 ? (ytdActual / ytdTarget) * 100 : 0;
  const gap       = ytdActual - ytdTarget;
  const ytdLabel  = selectedYear === THIS_YEAR ? "YTD" : "รวมปี";

  // ── Save handler ───────────────────────────────────────────────────────────
  const handleSave = useCallback(
    (month: string, field: "target" | "actual", val: number | null) => {
      const key = field === "target" ? svc.tf : svc.af;
      setEntry({ month, [key]: val });
    },
    [svc, setEntry]
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">

      {/* ── Zone 1: Header + year picker ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold leading-tight">Revenue Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            ติดตามยอดขายจริง vs เป้าหมาย · คลิกตัวเลขเพื่อแก้ไข
          </p>
        </div>

        {/* Year picker */}
        <div className="flex items-center gap-1 bg-muted/50 rounded-xl px-1 py-1 shrink-0">
          <button
            onClick={() => { setSelectedYear(y => y - 1); setShowFuture(false); }}
            className="w-8 h-8 flex items-center justify-center rounded-lg
                       hover:bg-background/80 transition-colors"
            aria-label="ปีที่แล้ว"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold w-12 text-center tabular-nums">
            {selectedYear + 543}
          </span>
          <button
            onClick={() => { setSelectedYear(y => y + 1); setShowFuture(false); }}
            disabled={selectedYear >= THIS_YEAR}
            aria-label="ปีถัดไป"
            className="w-8 h-8 flex items-center justify-center rounded-lg
                       hover:bg-background/80 transition-colors
                       disabled:opacity-25 disabled:cursor-default"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Service tabs ── */}
      <div className="flex gap-0 border-b border-border">
        {SERVICES.map(s => {
          const isActive = activeTab === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setActiveTab(s.key)}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium
                          border-b-2 -mb-px transition-colors ${
                isActive
                  ? "text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              style={{ borderBottomColor: isActive ? s.color : "transparent" }}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0 transition-opacity"
                style={{ backgroundColor: s.color, opacity: isActive ? 1 : 0.3 }}
              />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* ── Zone 2a: KPI row ── */}
      <div className="flex gap-3">
        <Stat
          label={`${ytdLabel} ยอดจริง`}
          value={`฿${fmtShort(ytdActual)}`}
          color={svc.color}
        />
        <Stat
          label={`${ytdLabel} เป้าหมาย`}
          value={`฿${fmtShort(ytdTarget)}`}
        />
        <Stat
          label="ทำได้"
          value={`${Math.round(pct)}%`}
          color={pct >= 100 ? "#10b981" : pct >= 75 ? "#f59e0b" : "#f43f5e"}
        />
        <Stat
          label="Gap"
          value={`${gap >= 0 ? "+" : ""}฿${fmtShort(gap)}`}
          color={gap >= 0 ? "#10b981" : "#f43f5e"}
        />
      </div>

      {/* ── Zone 2b: Bar+Line chart ── */}
      <div className="rounded-2xl border border-border bg-card/50 p-4">
        {/* Legend */}
        <div className="flex items-center gap-5 mb-3">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-3 h-3 rounded-sm shrink-0"
              style={{ backgroundColor: svc.color }} />
            ยอดจริง (แท่ง)
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <svg width="18" height="10" viewBox="0 0 18 10">
              <line x1="1" y1="5" x2="17" y2="5"
                stroke={svc.color} strokeWidth="1.5"
                strokeOpacity={0.5} strokeDasharray="4,3" />
              <circle cx="9" cy="5" r="2.5"
                fill="none" stroke={svc.color}
                strokeWidth="1.5" strokeOpacity={0.55} />
            </svg>
            เป้าหมาย (เส้น)
          </span>
        </div>

        <BarLineChart
          months={yearMonths}
          targets={allRows.map(r => r.target)}
          actuals={allRows.map(r => r.actual)}
          color={svc.color}
        />
      </div>

      {/* ── Zone 3: Table ── */}
      <div className="rounded-2xl border border-border bg-card/50 overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="px-3 py-2.5 text-left text-xs font-semibold
                             text-muted-foreground uppercase tracking-wider">
                เดือน
              </th>
              <th className="px-2 py-2.5 text-right text-xs font-semibold
                             text-muted-foreground uppercase tracking-wider w-36">
                เป้าหมาย
              </th>
              <th className="px-2 py-2.5 text-right text-xs font-semibold
                             text-muted-foreground uppercase tracking-wider w-36">
                ยอดจริง
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold
                             text-muted-foreground uppercase tracking-wider w-20">
                %
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold
                             text-muted-foreground uppercase tracking-wider w-28">
                Gap
              </th>
            </tr>
          </thead>

          <tbody>
            {/* Past + current months — always visible */}
            {pastRows.map(row => (
              <MonthRow
                key={row.month}
                row={row}
                svcColor={svc.color}
                onSave={handleSave}
                isCurrent={row.month === NOW_STR}
              />
            ))}

            {/* Future months — collapsed by default */}
            {futureRows.length > 0 && (
              <>
                {showFuture && futureRows.map(row => (
                  <MonthRow
                    key={row.month}
                    row={row}
                    svcColor={svc.color}
                    onSave={handleSave}
                    dim
                  />
                ))}

                <tr>
                  <td colSpan={5} className="border-t border-border/40">
                    <button
                      onClick={() => setShowFuture(v => !v)}
                      className="w-full flex items-center justify-center gap-1.5
                                 py-2.5 text-xs text-muted-foreground
                                 hover:text-foreground transition-colors"
                    >
                      {showFuture
                        ? <ChevronUp   className="w-3.5 h-3.5" />
                        : <ChevronDown className="w-3.5 h-3.5" />}
                      {showFuture
                        ? "ซ่อนเดือนที่เหลือ"
                        : `แสดง ${futureRows.length} เดือนถัดไป`}
                    </button>
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Hint footer */}
      <p className="text-xs text-muted-foreground/60 text-center pb-2">
        คลิกตัวเลขเพื่อแก้ไข · Enter บันทึก · Escape ยกเลิก
      </p>
    </div>
  );
}
