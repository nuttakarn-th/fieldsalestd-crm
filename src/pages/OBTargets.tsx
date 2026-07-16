/**
 * OBTargets.tsx — OB Team yearly target planner (OB Manager only)
 * Route: /app/ob-targets
 *
 * กำหนดเป้าหมายการขายของทีม OB รายเดือน ทั้งปี
 *  • rep = "OB Team" (team-level ไม่ใช่รายคน)
 *  • แสดง 12 เดือน เลือกปีได้
 *  • Domestic + International ยอดขาย (THB) และ Pax
 *  • บันทึกทั้ง 12 เดือนพร้อมกัน
 */
import { useMemo, useState, useCallback } from "react";
import { Target, Save, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCRM, formatTHB } from "@/store/crmStore";
import { toast } from "sonner";

// ── Constants ─────────────────────────────────────────────────────────────────
const OB_TEAM_REP = "OB Team";

// ── Helpers ───────────────────────────────────────────────────────────────────
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

// ── Types ─────────────────────────────────────────────────────────────────────
interface MonthRow {
  month:               string;
  domestic_sales:      number;
  domestic_pax:        number;
  international_sales: number;
  international_pax:   number;
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function OBTargets() {
  const targets   = useCRM((s) => s.targets);
  const setTarget = useCRM((s) => s.setTarget);

  const [year, setYear]   = useState(new Date().getFullYear());
  const [draft, setDraft] = useState<Record<string, MonthRow>>({});
  const months = useMemo(() => yearMonths(year), [year]);
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
      };
    }
    return map;
  }, [targets, months]);

  const getRow = useCallback(
    (month: string): MonthRow => draft[month] ?? baseRows[month] ?? {
      month, domestic_sales: 0, domestic_pax: 0, international_sales: 0, international_pax: 0,
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

  // Save all 12 months
  const save = () => {
    months.forEach((month) => {
      const r = getRow(month);
      setTarget(month, OB_TEAM_REP, {
        domestic_sales:      r.domestic_sales,
        domestic_pax:        r.domestic_pax,
        international_sales: r.international_sales,
        international_pax:   r.international_pax,
      });
    });
    setDraft({});
    toast.success(`บันทึกเป้าหมายทีม OB ปี ${year} แล้ว`);
  };

  // Yearly totals
  const totals = useMemo(() => {
    return months.reduce(
      (acc, month) => {
        const r = getRow(month);
        acc.domestic_sales      += r.domestic_sales;
        acc.domestic_pax        += r.domestic_pax;
        acc.international_sales += r.international_sales;
        acc.international_pax   += r.international_pax;
        return acc;
      },
      { domestic_sales: 0, domestic_pax: 0, international_sales: 0, international_pax: 0 }
    );
  }, [months, getRow]);

  const isDirty = Object.keys(draft).length > 0;

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-5xl">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-teal-500/15 flex items-center justify-center">
              <Target className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-none">เป้าหมายทีม OB</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                กำหนดยอดขายและจำนวน Pax รายเดือน — ทีม OB รวม ไม่แยกรายคน
              </p>
            </div>
          </div>
        </div>

        {/* Year nav + Save */}
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="icon" onClick={() => { setYear((y) => y - 1); setDraft({}); }}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="px-5 h-9 rounded-md border bg-card flex items-center font-bold text-sm min-w-[80px] justify-center">
            {year}
          </div>
          <Button variant="outline" size="icon" onClick={() => { setYear((y) => y + 1); setDraft({}); }}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            onClick={save}
            className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
          >
            <Save className="w-4 h-4" />
            บันทึกเป้า{isDirty && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />}
          </Button>
        </div>
      </div>

      {/* ── Yearly summary cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "เป้า Domestic (ยอด)",
            value: formatTHB(totals.domestic_sales),
            sub: "ทั้งปี",
            color: "text-violet-600 dark:text-violet-400",
            bg: "bg-violet-500/10",
          },
          {
            label: "เป้า Domestic (Pax)",
            value: `${totals.domestic_pax.toLocaleString()} ท่าน`,
            sub: "ทั้งปี",
            color: "text-violet-600 dark:text-violet-400",
            bg: "bg-violet-500/10",
          },
          {
            label: "เป้า International (ยอด)",
            value: formatTHB(totals.international_sales),
            sub: "ทั้งปี",
            color: "text-teal-600 dark:text-teal-400",
            bg: "bg-teal-500/10",
          },
          {
            label: "เป้า International (Pax)",
            value: `${totals.international_pax.toLocaleString()} ท่าน`,
            sub: "ทั้งปี",
            color: "text-teal-600 dark:text-teal-400",
            bg: "bg-teal-500/10",
          },
        ].map((c) => (
          <div key={c.label} className={`rounded-xl border p-4 ${c.bg}`}>
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className={`text-lg font-bold mt-1 ${c.color}`}>{c.value}</p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* ── 12-month table ── */}
      <div className="bg-card rounded-xl border shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground">
                <th className="text-left p-3 font-semibold w-28">เดือน</th>
                <th className="text-right p-3 font-semibold">
                  <div>Domestic</div>
                  <div className="text-[10px] font-normal opacity-70">ยอดขาย (THB)</div>
                </th>
                <th className="text-right p-3 font-semibold">
                  <div>Domestic</div>
                  <div className="text-[10px] font-normal opacity-70">Pax (ท่าน)</div>
                </th>
                <th className="text-right p-3 font-semibold">
                  <div>International</div>
                  <div className="text-[10px] font-normal opacity-70">ยอดขาย (THB)</div>
                </th>
                <th className="text-right p-3 font-semibold">
                  <div>International</div>
                  <div className="text-[10px] font-normal opacity-70">Pax (ท่าน)</div>
                </th>
                <th className="text-right p-3 font-semibold bg-teal-500/5 text-teal-700 dark:text-teal-400">
                  รวม (THB)
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {months.map((month) => {
                const r          = getRow(month);
                const rowTotal   = r.domestic_sales + r.international_sales;
                const isCurrent  = month === curKey;
                const hasData    = rowTotal > 0 || r.domestic_pax > 0 || r.international_pax > 0;
                const inDraft    = !!draft[month];

                return (
                  <tr
                    key={month}
                    className={`transition-colors ${isCurrent ? "bg-teal-500/5" : "hover:bg-muted/30"}`}
                  >
                    {/* Month label */}
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        {isCurrent && (
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
                        )}
                        <span className={`font-medium text-sm ${isCurrent ? "text-teal-600 dark:text-teal-400" : ""}`}>
                          {thMonthLabel(month)}
                        </span>
                        {inDraft && (
                          <span className="w-1 h-1 rounded-full bg-amber-400 shrink-0" title="มีการแก้ไขที่ยังไม่บันทึก" />
                        )}
                      </div>
                    </td>

                    {/* Domestic sales */}
                    <td className="p-2">
                      <Input
                        type="number"
                        min={0}
                        value={r.domestic_sales || ""}
                        onChange={(e) => updateField(month, "domestic_sales", e.target.value)}
                        className="text-right h-8 w-full"
                        placeholder="0"
                      />
                    </td>

                    {/* Domestic pax */}
                    <td className="p-2">
                      <Input
                        type="number"
                        min={0}
                        value={r.domestic_pax || ""}
                        onChange={(e) => updateField(month, "domestic_pax", e.target.value)}
                        className="text-right h-8 w-full"
                        placeholder="0"
                      />
                    </td>

                    {/* International sales */}
                    <td className="p-2">
                      <Input
                        type="number"
                        min={0}
                        value={r.international_sales || ""}
                        onChange={(e) => updateField(month, "international_sales", e.target.value)}
                        className="text-right h-8 w-full"
                        placeholder="0"
                      />
                    </td>

                    {/* International pax */}
                    <td className="p-2">
                      <Input
                        type="number"
                        min={0}
                        value={r.international_pax || ""}
                        onChange={(e) => updateField(month, "international_pax", e.target.value)}
                        className="text-right h-8 w-full"
                        placeholder="0"
                      />
                    </td>

                    {/* Row total */}
                    <td className="p-3 text-right font-bold bg-teal-500/5">
                      <span className={rowTotal > 0 ? "text-teal-600 dark:text-teal-400" : "text-muted-foreground/30"}>
                        {hasData ? formatTHB(rowTotal) : "—"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Yearly totals row */}
            <tfoot>
              <tr className="bg-muted/40 border-t-2 border-border font-bold text-sm">
                <td className="p-3 text-muted-foreground">รวมทั้งปี</td>
                <td className="p-3 text-right text-violet-600 dark:text-violet-400">
                  {formatTHB(totals.domestic_sales)}
                </td>
                <td className="p-3 text-right text-violet-600 dark:text-violet-400">
                  {totals.domestic_pax.toLocaleString()} ท่าน
                </td>
                <td className="p-3 text-right text-teal-600 dark:text-teal-400">
                  {formatTHB(totals.international_sales)}
                </td>
                <td className="p-3 text-right text-teal-600 dark:text-teal-400">
                  {totals.international_pax.toLocaleString()} ท่าน
                </td>
                <td className="p-3 text-right bg-teal-500/10 text-teal-700 dark:text-teal-300">
                  {formatTHB(totals.domestic_sales + totals.international_sales)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

    </div>
  );
}
