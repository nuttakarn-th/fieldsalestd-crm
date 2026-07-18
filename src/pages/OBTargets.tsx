/**
 * OBTargets.tsx — OB Team yearly target planner (OB Manager only)
 *
 * โหมด Simple (default): กรอก total_sales + total_pax รายเดือน (2 columns)
 * โหมด Advanced:         แสดง "เป้ารวม (อ้างอิง)" read-only จาก Simple
 *                        + กรอก Domestic / International / Incentive แยก
 *                        + แสดง delta ถ้า breakdown ยังไม่ครบเป้า
 */
import { useMemo, useState, useCallback } from "react";
import { Target, Save, ChevronLeft, ChevronRight, SlidersHorizontal, LayoutList, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCRM, formatTHB } from "@/store/crmStore";
import { toast } from "sonner";

const OB_TEAM_REP = "OB Team";

function yearMonths(year: number): string[] {
  return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
}
function thMonthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("th-TH", { month: "long" });
}
function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

interface MonthRow {
  month:               string;
  total_sales:         number;
  total_pax:           number;
  domestic_sales:      number;
  domestic_pax:        number;
  international_sales: number;
  international_pax:   number;
  incentive_sales:     number;
  incentive_pax:       number;
}

const EMPTY_ROW = (month: string): MonthRow => ({
  month,
  total_sales: 0, total_pax: 0,
  domestic_sales: 0, domestic_pax: 0,
  international_sales: 0, international_pax: 0,
  incentive_sales: 0, incentive_pax: 0,
});

// ── ต้องอยู่นอก OBTargets — ถ้าอยู่ข้างในจะ unmount ทุก render → เสีย focus ──
function NumCell({ value, onChange }: { value: number; onChange: (v: string) => void }) {
  return (
    <Input
      type="number"
      min={0}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="text-right h-8 w-full min-w-[90px]"
      placeholder="0"
    />
  );
}

export default function OBTargets() {
  const targets   = useCRM((s) => s.targets);
  const setTarget = useCRM((s) => s.setTarget);

  const [year,      setYear]      = useState(new Date().getFullYear());
  const [draft,     setDraft]     = useState<Record<string, MonthRow>>({});
  const [splitMode, setSplitMode] = useState(false);
  const months = useMemo(() => yearMonths(year), [year]);
  const curKey = currentMonthKey();

  const baseRows = useMemo((): Record<string, MonthRow> => {
    const map: Record<string, MonthRow> = {};
    for (const month of months) {
      const t = targets.find((x) => x.month === month && x.rep === OB_TEAM_REP);
      map[month] = {
        month,
        total_sales:         t?.total_sales         ?? 0,
        total_pax:           t?.total_pax           ?? 0,
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
    (month: string): MonthRow => draft[month] ?? baseRows[month] ?? EMPTY_ROW(month),
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

  const save = () => {
    months.forEach((month) => {
      const r = getRow(month);
      setTarget(month, OB_TEAM_REP, {
        total_sales:         r.total_sales,
        total_pax:           r.total_pax,
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

  const totals = useMemo(() => months.reduce(
    (acc, month) => {
      const r = getRow(month);
      acc.total_sales         += r.total_sales;
      acc.total_pax           += r.total_pax;
      acc.domestic_sales      += r.domestic_sales;
      acc.domestic_pax        += r.domestic_pax;
      acc.international_sales += r.international_sales;
      acc.international_pax   += r.international_pax;
      acc.incentive_sales     += r.incentive_sales;
      acc.incentive_pax       += r.incentive_pax;
      return acc;
    },
    { total_sales: 0, total_pax: 0, domestic_sales: 0, domestic_pax: 0,
      international_sales: 0, international_pax: 0, incentive_sales: 0, incentive_pax: 0 }
  ), [months, getRow]);

  const isDirty = Object.keys(draft).length > 0;

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
          <Button
            variant="outline" size="sm"
            onClick={() => setSplitMode((v) => !v)}
            className={`gap-2 text-xs ${splitMode ? "border-teal-500 text-teal-600 bg-teal-500/8" : ""}`}
          >
            {splitMode
              ? <><LayoutList className="w-3.5 h-3.5" />โหมดรวม</>
              : <><SlidersHorizontal className="w-3.5 h-3.5" />แยกประเภท</>}
          </Button>
          <Button variant="outline" size="icon" onClick={() => { setYear((y) => y - 1); setDraft({}); }}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="px-5 h-9 rounded-md border bg-card flex items-center font-bold text-sm min-w-[72px] justify-center">
            {year}
          </div>
          <Button variant="outline" size="icon" onClick={() => { setYear((y) => y + 1); setDraft({}); }}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button onClick={save} className="bg-teal-600 hover:bg-teal-700 text-white gap-2">
            <Save className="w-4 h-4" />
            บันทึกเป้า{isDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />}
          </Button>
        </div>
      </div>

      {/* ── Summary cards ── */}
      {!splitMode ? (
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border p-4 bg-muted/40 col-span-2">
            <p className="text-xs text-muted-foreground">เป้ารวม (อ้างอิงจากโหมดรวม)</p>
            <div className="flex items-baseline gap-4 mt-1">
              <span className="text-xl font-bold text-foreground/70">{formatTHB(totals.total_sales)}</span>
              <span className="text-sm text-muted-foreground">{totals.total_pax} ท่าน</span>
            </div>
          </div>
          {[
            { label: "Domestic", sales: totals.domestic_sales, pax: totals.domestic_pax, color: "text-violet-600", bg: "bg-violet-500/8" },
            { label: "International", sales: totals.international_sales, pax: totals.international_pax, color: "text-teal-600", bg: "bg-teal-500/8" },
            { label: "Incentive", sales: totals.incentive_sales, pax: totals.incentive_pax, color: "text-amber-600", bg: "bg-amber-500/8" },
          ].map((c) => (
            <div key={c.label} className={`rounded-xl border p-4 ${c.bg}`}>
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className={`text-lg font-bold mt-1 ${c.color}`}>{formatTHB(c.sales)}</p>
              <p className="text-[10px] text-muted-foreground/70">{c.pax} ท่าน</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Advanced mode note ── */}
      {splitMode && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
          <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
          <span>คอลัมน์ <strong>เป้ารวม</strong> คือยอดที่กรอกในโหมดรวม — ใช้เป็น reference เท่านั้น ไม่สามารถแก้ไขได้ที่นี่</span>
        </div>
      )}

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
                      <div>ยอดรวม</div><div className="text-[10px] font-normal opacity-70">(THB)</div>
                    </th>
                    <th className="text-right p-3 font-semibold">
                      <div>Pax รวม</div><div className="text-[10px] font-normal opacity-70">(ท่าน)</div>
                    </th>
                  </>
                ) : (
                  <>
                    {/* Reference column */}
                    <th className="text-right p-3 font-semibold text-muted-foreground bg-muted/30">
                      <div>เป้ารวม</div><div className="text-[10px] font-normal opacity-70">อ้างอิง (THB)</div>
                    </th>
                    <th className="text-right p-3 font-semibold text-violet-600">
                      <div>Domestic</div><div className="text-[10px] font-normal opacity-70">ยอด (THB)</div>
                    </th>
                    <th className="text-right p-3 font-semibold text-violet-600">
                      <div>Domestic</div><div className="text-[10px] font-normal opacity-70">Pax</div>
                    </th>
                    <th className="text-right p-3 font-semibold text-teal-600">
                      <div>International</div><div className="text-[10px] font-normal opacity-70">ยอด (THB)</div>
                    </th>
                    <th className="text-right p-3 font-semibold text-teal-600">
                      <div>International</div><div className="text-[10px] font-normal opacity-70">Pax</div>
                    </th>
                    <th className="text-right p-3 font-semibold text-amber-600">
                      <div>Incentive</div><div className="text-[10px] font-normal opacity-70">ยอด (THB)</div>
                    </th>
                    <th className="text-right p-3 font-semibold text-amber-600">
                      <div>Incentive</div><div className="text-[10px] font-normal opacity-70">Pax</div>
                    </th>
                  </>
                )}

                <th className="text-right p-3 font-semibold bg-teal-500/5 text-teal-700">
                  {splitMode ? "รวม Breakdown" : "รวม (THB)"}
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {months.map((month) => {
                const r          = getRow(month);
                const isCurrent  = month === curKey;
                const inDraft    = !!draft[month];

                // Breakdown sum (Advanced)
                const breakdownSales = r.domestic_sales + r.international_sales + r.incentive_sales;
                const breakdownPax   = r.domestic_pax   + r.international_pax   + r.incentive_pax;
                const deltaSales     = r.total_sales - breakdownSales;
                const hasRef         = r.total_sales > 0;
                const balanced       = Math.abs(deltaSales) <= 0;

                return (
                  <tr key={month} className={`transition-colors ${isCurrent ? "bg-teal-500/5" : "hover:bg-muted/30"}`}>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />}
                        <span className={`font-medium text-sm ${isCurrent ? "text-teal-600" : ""}`}>
                          {thMonthLabel(month)}
                        </span>
                        {inDraft && <span className="w-1 h-1 rounded-full bg-amber-400 shrink-0" />}
                      </div>
                    </td>

                    {!splitMode ? (
                      <>
                        <td className="p-2"><NumCell value={r.total_sales} onChange={(v) => updateField(month, "total_sales", v)} /></td>
                        <td className="p-2"><NumCell value={r.total_pax} onChange={(v) => updateField(month, "total_pax", v)} /></td>
                      </>
                    ) : (
                      <>
                        {/* Reference (read-only) */}
                        <td className="p-3 text-right bg-muted/20">
                          {hasRef ? (
                            <div>
                              <span className="font-semibold text-foreground/60 text-sm">{formatTHB(r.total_sales)}</span>
                              <div className="text-[10px] text-muted-foreground">{r.total_pax} ท่าน</div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground/30 text-xs">—</span>
                          )}
                        </td>
                        <td className="p-2"><NumCell value={r.domestic_sales} onChange={(v) => updateField(month, "domestic_sales", v)} /></td>
                        <td className="p-2"><NumCell value={r.domestic_pax} onChange={(v) => updateField(month, "domestic_pax", v)} /></td>
                        <td className="p-2"><NumCell value={r.international_sales} onChange={(v) => updateField(month, "international_sales", v)} /></td>
                        <td className="p-2"><NumCell value={r.international_pax} onChange={(v) => updateField(month, "international_pax", v)} /></td>
                        <td className="p-2"><NumCell value={r.incentive_sales} onChange={(v) => updateField(month, "incentive_sales", v)} /></td>
                        <td className="p-2"><NumCell value={r.incentive_pax} onChange={(v) => updateField(month, "incentive_pax", v)} /></td>
                      </>
                    )}

                    {/* Row total / breakdown sum */}
                    <td className="p-3 text-right bg-teal-500/5">
                      {!splitMode ? (
                        <span className={r.total_sales > 0 ? "font-bold text-teal-600" : "text-muted-foreground/30"}>
                          {r.total_sales > 0 ? formatTHB(r.total_sales) : "—"}
                        </span>
                      ) : (
                        <div>
                          <span className={breakdownSales > 0 ? "font-bold text-teal-600 text-sm" : "text-muted-foreground/30 text-sm"}>
                            {breakdownSales > 0 ? formatTHB(breakdownSales) : "—"}
                          </span>
                          {/* Delta indicator */}
                          {hasRef && breakdownSales > 0 && (
                            <div className={`flex items-center justify-end gap-0.5 mt-0.5 text-[10px] ${balanced ? "text-emerald-600" : "text-amber-600"}`}>
                              {balanced
                                ? <><CheckCircle2 className="w-3 h-3" />ครบ</>
                                : <><AlertTriangle className="w-3 h-3" />{deltaSales > 0 ? `ขาด ${formatTHB(deltaSales)}` : `เกิน ${formatTHB(-deltaSales)}`}</>
                              }
                            </div>
                          )}
                          {breakdownPax > 0 && (
                            <div className="text-[10px] text-muted-foreground">{breakdownPax} ท่าน</div>
                          )}
                        </div>
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
                    <td className="p-3 text-right text-muted-foreground bg-muted/30">{formatTHB(totals.total_sales)}</td>
                    <td className="p-3 text-right text-violet-600">{formatTHB(totals.domestic_sales)}</td>
                    <td className="p-3 text-right text-violet-600">{totals.domestic_pax} ท่าน</td>
                    <td className="p-3 text-right text-teal-600">{formatTHB(totals.international_sales)}</td>
                    <td className="p-3 text-right text-teal-600">{totals.international_pax} ท่าน</td>
                    <td className="p-3 text-right text-amber-600">{formatTHB(totals.incentive_sales)}</td>
                    <td className="p-3 text-right text-amber-600">{totals.incentive_pax} ท่าน</td>
                  </>
                )}
                <td className="p-3 text-right bg-teal-500/10 text-teal-700">
                  {!splitMode ? (
                    <div>
                      <div>{formatTHB(totals.total_sales)}</div>
                      <div className="text-[11px] font-normal text-teal-600/70">{totals.total_pax} ท่าน</div>
                    </div>
                  ) : (
                    <div>
                      <div>{formatTHB(totals.domestic_sales + totals.international_sales + totals.incentive_sales)}</div>
                      <div className="text-[11px] font-normal text-teal-600/70">
                        {totals.domestic_pax + totals.international_pax + totals.incentive_pax} ท่าน
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

    </div>
  );
}
