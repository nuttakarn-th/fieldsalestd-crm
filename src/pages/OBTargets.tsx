/**
 * OBTargets.tsx — OB Team yearly target planner (OB Manager only)
 *
 * โหมด Simple (default): ตั้งเป้ายอดรวม + Pax รวม รายเดือน (2 columns)
 * โหมด Advanced:         แยก Domestic / International / Incentive (6 columns)
 *
 * Data model: domestic_sales เก็บ "ยอดรวม" ในโหมด Simple
 *             switching to Advanced → ยอดรวมปรากฏใน Domestic, Inter/Incentive = 0
 */
import { useMemo, useState, useCallback } from "react";
import { Target, Save, ChevronLeft, ChevronRight, SlidersHorizontal, LayoutList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCRM, formatTHB } from "@/store/crmStore";
import { toast } from "sonner";

// ── Constants ──────────────────────────────────────────────────────────────────
const OB_TEAM_REP = "OB Team";

// ── Helpers ────────────────────────────────────────────────────────────────────
function yearMonths(year: number): string[] {
  return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
}

function thMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("th-TH", { month: "long" });
}

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// ── Types ──────────────────────────────────────────────────────────────────────
interface MonthRow {
  month:               string;
  domestic_sales:      number;
  domestic_pax:        number;
  international_sales: number;
  international_pax:   number;
  incentive_sales:     number;
  incentive_pax:       number;
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function OBTargets() {
  const targets   = useCRM((s) => s.targets);
  const setTarget = useCRM((s) => s.setTarget);

  const [year, setYear]         = useState(new Date().getFullYear());
  const [draft, setDraft]       = useState<Record<string, MonthRow>>({});
  const [splitMode, setSplitMode] = useState(false);  // false = Simple, true = Advanced
  const months  = useMemo(() => yearMonths(year), [year]);
  const curKey  = currentMonthKey();

  // Build base rows from stored targets
  const baseRows = useMemo((): Record<string, MonthRow> => {
    const map: Record<string, MonthRow> = {};
    for (const month of months) {
      const t = targets.find((x) => x.month === month && x.rep === OB_TEAM_REP);
      map[month] = {
        month,
        domestic_sales:      t?.domestic_sales      ?? 0,
        domestic_pax:        t?.domestic_pax        ?? 0,
        international_sales: t?.international_sales ?? 0,
        international_pax:   t?.international_pax   ?? 0,
        incentive_sales:     t?.incentive_sales     ?? 0,
        incentive_pax:       t?.incentive_pax       ?? 0,
      };
    }
    return map;
  }, [targets, months]);

  const getRow = useCallback(
    (month: string): MonthRow => draft[month] ?? baseRows[month] ?? {
      month,
      domestic_sales: 0, domestic_pax: 0,
      international_sales: 0, international_pax: 0,
      incentive_sales: 0, incentive_pax: 0,
    },
    [draft, baseRows]
  );

  const updateField = useCallback(
    (month: string, field: keyof Omit<MonthRow, "month">, value: string) => {
      setDraft((prev) => ({
        ...prev,
        [month]: { ...getRow(month), [field]: parseInt(value) || 0 },
      }));
    },
    [getRow]
  );

  // In Simple mode: update total → store in domestic_sales, zero inter+incentive
  const updateSimple = useCallback(
    (month: string, field: "domestic_sales" | "domestic_pax", value: string) => {
      setDraft((prev) => ({
        ...prev,
        [month]: {
          ...getRow(month),
          [field]: parseInt(value) || 0,
          // zero-out the other types when entering simple total
          ...(field === "domestic_sales"
            ? { international_sales: 0, incentive_sales: 0 }
            : { international_pax: 0, incentive_pax: 0 }),
        },
      }));
    },
    [getRow]
  );

  // Save all 12 months
  const save = () => {
    months.forEach((month) => {
      const r = getRow(month);
      setTarget(month, OB_TEAM_REP, {
        domestic_sales:      r.domestic_sales,
        domestic_pax:        r.domestic_pax,
        international_sales: r.international_sales,
        international_pax:   r.international_pax,
        incentive_sales:     r.incentive_sales,
        incentive_pax:       r.incentive_pax,
      });
    });
    setDraft({});
    toast.success(`บันทึกเป้าหมายทีม OB ปี ${year} แล้ว`);
  };

  // Totals
  const totals = useMemo(() => months.reduce(
    (acc, month) => {
      const r = getRow(month);
      acc.total_sales      += r.domestic_sales + r.international_sales + r.incentive_sales;
      acc.total_pax        += r.domestic_pax   + r.international_pax   + r.incentive_pax;
      acc.domestic_sales   += r.domestic_sales;
      acc.domestic_pax     += r.domestic_pax;
      acc.international_sales += r.international_sales;
      acc.international_pax   += r.international_pax;
      acc.incentive_sales  += r.incentive_sales;
      acc.incentive_pax    += r.incentive_pax;
      return acc;
    },
    { total_sales: 0, total_pax: 0, domestic_sales: 0, domestic_pax: 0,
      international_sales: 0, international_pax: 0, incentive_sales: 0, incentive_pax: 0 }
  ), [months, getRow]);

  const isDirty = Object.keys(draft).length > 0;

  // ── Number input cell ───────────────────────────────────────────────────────
  const NumInput = ({ month, field, placeholder = "0" }: {
    month: string;
    field: keyof Omit<MonthRow, "month">;
    placeholder?: string;
  }) => {
    const r = getRow(month);
    const isSimpleField = field === "domestic_sales" || field === "domestic_pax";
    return (
      <Input
        type="number"
        min={0}
        value={r[field] || ""}
        onChange={(e) =>
          !splitMode && isSimpleField
            ? updateSimple(month, field as "domestic_sales" | "domestic_pax", e.target.value)
            : updateField(month, field, e.target.value)
        }
        className="text-right h-8 w-full min-w-[90px]"
        placeholder={placeholder}
      />
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-6xl">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-teal-500/15 flex items-center justify-center shrink-0">
            <Target className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-none">เป้าหมายทีม OB</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              กำหนดยอดขายและจำนวน Pax รายเดือน — ทีม OB รวม ไม่แยกรายคน
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Simple / Advanced toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSplitMode((v) => !v)}
            className={`gap-2 text-xs ${splitMode ? "border-teal-500 text-teal-600 bg-teal-500/8" : ""}`}
          >
            {splitMode
              ? <><LayoutList className="w-3.5 h-3.5" /> โหมดรวม</>
              : <><SlidersHorizontal className="w-3.5 h-3.5" /> แยกประเภท</>}
          </Button>

          {/* Year nav */}
          <Button variant="outline" size="icon" onClick={() => { setYear((y) => y - 1); setDraft({}); }}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="px-5 h-9 rounded-md border bg-card flex items-center font-bold text-sm min-w-[72px] justify-center">
            {year}
          </div>
          <Button variant="outline" size="icon" onClick={() => { setYear((y) => y + 1); setDraft({}); }}>
            <ChevronRight className="w-4 h-4" />
          </Button>

          {/* Save */}
          <Button onClick={save} className="bg-teal-600 hover:bg-teal-700 text-white gap-2">
            <Save className="w-4 h-4" />
            บันทึกเป้า{isDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />}
          </Button>
        </div>
      </div>

      {/* ── Summary cards ── */}
      {!splitMode ? (
        // Simple mode: 2 cards
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border p-4 bg-teal-500/8">
            <p className="text-xs text-muted-foreground">เป้ายอดรวม (ทั้งปี)</p>
            <p className="text-2xl font-bold mt-1 text-teal-600">{formatTHB(totals.total_sales)}</p>
          </div>
          <div className="rounded-xl border p-4 bg-teal-500/8">
            <p className="text-xs text-muted-foreground">เป้า Pax รวม (ทั้งปี)</p>
            <p className="text-2xl font-bold mt-1 text-teal-600">{totals.total_pax.toLocaleString()} ท่าน</p>
          </div>
        </div>
      ) : (
        // Advanced mode: 4 cards
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Domestic (ยอด)", value: formatTHB(totals.domestic_sales),        color: "text-violet-600", bg: "bg-violet-500/8" },
            { label: "Domestic (Pax)",  value: `${totals.domestic_pax} ท่าน`,           color: "text-violet-600", bg: "bg-violet-500/8" },
            { label: "International (ยอด)", value: formatTHB(totals.international_sales), color: "text-teal-600",   bg: "bg-teal-500/8"   },
            { label: "International (Pax)",  value: `${totals.international_pax} ท่าน`,   color: "text-teal-600",   bg: "bg-teal-500/8"   },
          ].map((c) => (
            <div key={c.label} className={`rounded-xl border p-4 ${c.bg}`}>
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className={`text-lg font-bold mt-1 ${c.color}`}>{c.value}</p>
            </div>
          ))}
          {(totals.incentive_sales > 0 || totals.incentive_pax > 0) && (
            <>
              <div className="rounded-xl border p-4 bg-amber-500/8">
                <p className="text-xs text-muted-foreground">Incentive (ยอด)</p>
                <p className="text-lg font-bold mt-1 text-amber-600">{formatTHB(totals.incentive_sales)}</p>
              </div>
              <div className="rounded-xl border p-4 bg-amber-500/8">
                <p className="text-xs text-muted-foreground">Incentive (Pax)</p>
                <p className="text-lg font-bold mt-1 text-amber-600">{totals.incentive_pax} ท่าน</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Mode label ── */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {splitMode
          ? <><SlidersHorizontal className="w-3.5 h-3.5" /> โหมดแยกประเภท — Domestic / International / Incentive</>
          : <><LayoutList className="w-3.5 h-3.5" /> โหมดรวม — กรอกยอดรวมและ Pax รวมต่อเดือน</>
        }
      </div>

      {/* ── Table ── */}
      <div className="bg-card rounded-xl border shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground border-b border-border">
                <th className="text-left p-3 font-semibold w-28">เดือน</th>

                {!splitMode ? (
                  <>
                    <th className="text-right p-3 font-semibold">
                      <div>ยอดรวม</div>
                      <div className="text-[10px] font-normal opacity-70">(THB)</div>
                    </th>
                    <th className="text-right p-3 font-semibold">
                      <div>Pax รวม</div>
                      <div className="text-[10px] font-normal opacity-70">(ท่าน)</div>
                    </th>
                  </>
                ) : (
                  <>
                    <th className="text-right p-3 font-semibold text-violet-600">
                      <div>Domestic</div>
                      <div className="text-[10px] font-normal opacity-70">ยอด (THB)</div>
                    </th>
                    <th className="text-right p-3 font-semibold text-violet-600">
                      <div>Domestic</div>
                      <div className="text-[10px] font-normal opacity-70">Pax</div>
                    </th>
                    <th className="text-right p-3 font-semibold text-teal-600">
                      <div>International</div>
                      <div className="text-[10px] font-normal opacity-70">ยอด (THB)</div>
                    </th>
                    <th className="text-right p-3 font-semibold text-teal-600">
                      <div>International</div>
                      <div className="text-[10px] font-normal opacity-70">Pax</div>
                    </th>
                    <th className="text-right p-3 font-semibold text-amber-600">
                      <div>Incentive</div>
                      <div className="text-[10px] font-normal opacity-70">ยอด (THB)</div>
                    </th>
                    <th className="text-right p-3 font-semibold text-amber-600">
                      <div>Incentive</div>
                      <div className="text-[10px] font-normal opacity-70">Pax</div>
                    </th>
                  </>
                )}

                <th className="text-right p-3 font-semibold bg-teal-500/5 text-teal-700">
                  รวม (THB)
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {months.map((month) => {
                const r         = getRow(month);
                const rowTotal  = r.domestic_sales + r.international_sales + r.incentive_sales;
                const rowPax    = r.domestic_pax   + r.international_pax   + r.incentive_pax;
                const isCurrent = month === curKey;
                const inDraft   = !!draft[month];

                return (
                  <tr key={month} className={`transition-colors ${isCurrent ? "bg-teal-500/5" : "hover:bg-muted/30"}`}>
                    {/* Month label */}
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />}
                        <span className={`font-medium text-sm ${isCurrent ? "text-teal-600" : ""}`}>
                          {thMonthLabel(month)}
                        </span>
                        {inDraft && <span className="w-1 h-1 rounded-full bg-amber-400 shrink-0" title="ยังไม่บันทึก" />}
                      </div>
                    </td>

                    {!splitMode ? (
                      <>
                        <td className="p-2"><NumInput month={month} field="domestic_sales" /></td>
                        <td className="p-2"><NumInput month={month} field="domestic_pax" /></td>
                      </>
                    ) : (
                      <>
                        <td className="p-2"><NumInput month={month} field="domestic_sales" /></td>
                        <td className="p-2"><NumInput month={month} field="domestic_pax" /></td>
                        <td className="p-2"><NumInput month={month} field="international_sales" /></td>
                        <td className="p-2"><NumInput month={month} field="international_pax" /></td>
                        <td className="p-2"><NumInput month={month} field="incentive_sales" /></td>
                        <td className="p-2"><NumInput month={month} field="incentive_pax" /></td>
                      </>
                    )}

                    {/* Row total */}
                    <td className="p-3 text-right bg-teal-500/5">
                      <span className={rowTotal > 0 ? "font-bold text-teal-600" : "text-muted-foreground/30"}>
                        {rowTotal > 0 ? formatTHB(rowTotal) : "—"}
                      </span>
                      {rowPax > 0 && (
                        <div className="text-[10px] text-muted-foreground">{rowPax} ท่าน</div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            <tfoot>
              <tr className="bg-muted/40 border-t-2 border-border font-bold text-sm">
                <td className="p-3 text-muted-foreground">รวมทั้งปี</td>

                {!splitMode ? (
                  <>
                    <td className="p-3 text-right text-teal-600">{formatTHB(totals.total_sales)}</td>
                    <td className="p-3 text-right text-teal-600">{totals.total_pax.toLocaleString()} ท่าน</td>
                  </>
                ) : (
                  <>
                    <td className="p-3 text-right text-violet-600">{formatTHB(totals.domestic_sales)}</td>
                    <td className="p-3 text-right text-violet-600">{totals.domestic_pax} ท่าน</td>
                    <td className="p-3 text-right text-teal-600">{formatTHB(totals.international_sales)}</td>
                    <td className="p-3 text-right text-teal-600">{totals.international_pax} ท่าน</td>
                    <td className="p-3 text-right text-amber-600">{formatTHB(totals.incentive_sales)}</td>
                    <td className="p-3 text-right text-amber-600">{totals.incentive_pax} ท่าน</td>
                  </>
                )}

                <td className="p-3 text-right bg-teal-500/10 text-teal-700">
                  <div>{formatTHB(totals.total_sales)}</div>
                  <div className="text-[11px] font-normal text-teal-600/70">{totals.total_pax} ท่าน</div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

    </div>
  );
}
