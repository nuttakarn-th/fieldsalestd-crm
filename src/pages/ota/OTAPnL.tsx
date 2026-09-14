/**
 * OTAPnL.tsx — Profit & Loss Table for OTA Module
 * Route: /ota/pnl
 * Auto-calculates revenue from orders; manual cost input per group per month.
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import { useOTAStore, OTAGroupCost } from "@/store/otaStore";
import { TrendingUp, TrendingDown, ChevronDown } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtB(n: number) {
  return `฿${Math.round(n).toLocaleString("th-TH")}`;
}

function getCurrentYM() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function buildMonthOptions() {
  const opts: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = -6; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("th-TH", { month: "long", year: "numeric" });
    opts.push({ value, label });
  }
  return opts;
}

// Sort group codes by date embedded in the code: OA0901TCP → 09/01
function groupSortKey(code: string): string {
  const m = code.match(/OA(\d{2})(\d{2})/);
  if (m) return `${m[1]}${m[2]}`; // MMDD
  return code;
}

// Cost field labels
const COST_FIELDS: { key: keyof OTAGroupCost; label: string }[] = [
  { key: "attraction", label: "Attraction" },
  { key: "meals",      label: "Meals" },
  { key: "car",        label: "Car" },
  { key: "guide_fee",  label: "Guide Fee" },
  { key: "tip_driver", label: "Tip Driver" },
  { key: "other_fee",  label: "Other Fee" },
];

// ─── Inline editable cell ─────────────────────────────────────────────────────

interface EditCellProps {
  value: number;
  onSave: (v: number) => void;
}

function EditCell({ value, onSave }: EditCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const start = () => {
    setDraft(value === 0 ? "" : String(value));
    setEditing(true);
  };
  const commit = () => {
    const num = parseFloat(draft.replace(/,/g, "")) || 0;
    onSave(num);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        autoFocus
        className="w-full text-right text-sm border border-purple-400 rounded px-1 py-0.5 outline-none"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
      />
    );
  }
  return (
    <span
      className="cursor-pointer hover:bg-purple-50 rounded px-1 py-0.5 text-sm block text-right w-full"
      onClick={start}
    >
      {value === 0 ? <span className="text-gray-300">-</span> : value.toLocaleString("th-TH")}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OTAPnL() {
  const orders          = useOTAStore((s) => s.orders);
  const packages        = useOTAStore((s) => s.packages);
  const groupCosts      = useOTAStore((s) => s.groupCosts);
  const upsertGroupCost = useOTAStore((s) => s.upsertGroupCost);
  const loadGroupCostsByMonth = useOTAStore((s) => s.loadGroupCostsByMonth);

  const [month, setMonth]   = useState(getCurrentYM());
  const monthOptions = useMemo(() => buildMonthOptions(), []);

  // Load costs for selected month
  useEffect(() => {
    loadGroupCostsByMonth(month);
  }, [month, loadGroupCostsByMonth]);

  // ── Build rows from orders ─────────────────────────────────────────────────

  const rows = useMemo(() => {
    const [yr, mo] = month.split("-").map(Number);

    // Filter orders to this month (by usage_date)
    const monthOrders = orders.filter((o) => {
      const d = new Date(o.usage_date);
      return d.getFullYear() === yr && d.getMonth() + 1 === mo;
    });

    // Group by group_number
    const groupMap = new Map<string, { pax: number; revenue: number; packageCodes: Set<string> }>();
    for (const o of monthOrders) {
      const gn = o.group_number || o.order_number;
      if (!groupMap.has(gn)) groupMap.set(gn, { pax: 0, revenue: 0, packageCodes: new Set() });
      const g = groupMap.get(gn)!;
      g.pax += o.pax;
      g.revenue += o.revenue;
      const pkg = packages.find((p) => p.id === o.package_id);
      if (pkg) g.packageCodes.add(pkg.code);
    }

    // Sort by embedded date in group code
    const sorted = [...groupMap.entries()].sort((a, b) =>
      groupSortKey(a[0]).localeCompare(groupSortKey(b[0]))
    );

    // Merge with stored costs
    const costsThisMonth = groupCosts.filter((c) => c.month === month);

    return sorted.map(([code, data], idx) => {
      const cost = costsThisMonth.find((c) => c.group_code === code) ?? {
        id: "", group_code: code, month,
        attraction: 0, meals: 0, car: 0,
        guide_fee: 0, tip_driver: 0, other_fee: 0,
        note: "", created_at: "",
      };
      const totalCost = cost.attraction + cost.meals + cost.car +
                        cost.guide_fee + cost.tip_driver + cost.other_fee;
      const profit = data.revenue - totalCost;
      return {
        no: idx + 1,
        code,
        pax: data.pax,
        revenue: data.revenue,
        cost,
        totalCost,
        profit,
        packageCodes: [...data.packageCodes],
      };
    });
  }, [orders, packages, groupCosts, month]);

  // ── Summary ───────────────────────────────────────────────────────────────

  const totalRevenue  = rows.reduce((s, r) => s + r.revenue, 0);
  const totalCostAll  = rows.reduce((s, r) => s + r.totalCost, 0);
  const totalProfit   = totalRevenue - totalCostAll;
  const totalPax      = rows.reduce((s, r) => s + r.pax, 0);

  // ── Save handler ──────────────────────────────────────────────────────────

  const saveCostField = useCallback(
    (groupCode: string, field: keyof OTAGroupCost, value: number) => {
      const existing = groupCosts.find(
        (c) => c.group_code === groupCode && c.month === month
      ) ?? {
        group_code: groupCode, month,
        attraction: 0, meals: 0, car: 0,
        guide_fee: 0, tip_driver: 0, other_fee: 0,
        note: "",
      };
      upsertGroupCost({ ...existing, [field]: value } as Omit<OTAGroupCost, "id" | "created_at">);
    },
    [groupCosts, month, upsertGroupCost]
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Profit &amp; Loss</h1>
          <p className="text-sm text-gray-500">ตารางสรุปกำไร-ขาดทุนรายกรุ๊ป</p>
        </div>

        {/* Month selector */}
        <div className="relative">
          <select
            className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-gray-700 shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          >
            {monthOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* KPI summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "กรุ๊ปทั้งหมด", value: `${rows.length} กรุ๊ป`, color: "text-gray-900" },
          { label: "PAX รวม",      value: `${totalPax.toLocaleString("th-TH")} คน`, color: "text-gray-900" },
          { label: "รายได้รวม",    value: fmtB(totalRevenue), color: "text-blue-700" },
          {
            label: "กำไร / ขาดทุน",
            value: fmtB(totalProfit),
            color: totalProfit >= 0 ? "text-green-600" : "text-red-500",
          },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
            <div className="text-xs text-gray-500 mb-1">{k.label}</div>
            <div className={`text-lg font-bold ${k.color}`}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          ไม่มีข้อมูล Order ในเดือนนี้
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
          <table className="w-full text-sm border-collapse bg-white">
            <thead>
              <tr className="bg-[#1e1b4b] text-white text-xs">
                <th className="px-3 py-3 text-center w-8">#</th>
                <th className="px-3 py-3 text-left min-w-[120px]">Group Code</th>
                <th className="px-3 py-3 text-center">PAX</th>
                <th className="px-3 py-3 text-right">รายได้สุทธิ</th>
                {COST_FIELDS.map((f) => (
                  <th key={f.key} className="px-2 py-3 text-right min-w-[90px]">{f.label}</th>
                ))}
                <th className="px-3 py-3 text-right min-w-[100px]">Total Cost</th>
                <th className="px-3 py-3 text-right min-w-[110px]">กำไร / ขาดทุน</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.code}
                  className={i % 2 === 0 ? "bg-white" : "bg-purple-50/30"}
                >
                  <td className="px-3 py-2 text-center text-gray-400">{row.no}</td>
                  <td className="px-3 py-2 font-medium text-gray-800">
                    <div>{row.code}</div>
                    {row.packageCodes.length > 0 && (
                      <div className="text-[10px] text-purple-500 mt-0.5">
                        {row.packageCodes.join(", ")}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center font-semibold text-gray-700">
                    {row.pax}
                  </td>
                  <td className="px-3 py-2 text-right text-blue-700 font-medium">
                    {fmtB(row.revenue)}
                  </td>
                  {COST_FIELDS.map((f) => (
                    <td key={f.key} className="px-2 py-1">
                      <EditCell
                        value={row.cost[f.key] as number}
                        onSave={(v) => saveCostField(row.code, f.key, v)}
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right font-medium text-gray-700">
                    {fmtB(row.totalCost)}
                  </td>
                  <td className="px-3 py-2 text-right font-bold">
                    <div className={`flex items-center justify-end gap-1 ${row.profit >= 0 ? "text-green-600" : "text-red-500"}`}>
                      {row.profit >= 0
                        ? <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                        : <TrendingDown className="w-3.5 h-3.5 shrink-0" />}
                      {fmtB(row.profit)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Footer totals */}
            <tfoot>
              <tr className="bg-[#1e1b4b]/5 font-bold text-sm border-t-2 border-[#1e1b4b]/20">
                <td colSpan={2} className="px-3 py-3 text-gray-700">รวม</td>
                <td className="px-3 py-3 text-center text-gray-700">{totalPax}</td>
                <td className="px-3 py-3 text-right text-blue-700">{fmtB(totalRevenue)}</td>
                {COST_FIELDS.map((f) => {
                  const total = rows.reduce((s, r) => s + (r.cost[f.key] as number), 0);
                  return (
                    <td key={f.key} className="px-2 py-3 text-right text-gray-600">
                      {total > 0 ? fmtB(total) : "-"}
                    </td>
                  );
                })}
                <td className="px-3 py-3 text-right text-gray-700">{fmtB(totalCostAll)}</td>
                <td className="px-3 py-3 text-right">
                  <span className={`flex items-center justify-end gap-1 ${totalProfit >= 0 ? "text-green-600" : "text-red-500"}`}>
                    {totalProfit >= 0
                      ? <TrendingUp className="w-4 h-4 shrink-0" />
                      : <TrendingDown className="w-4 h-4 shrink-0" />}
                    {fmtB(totalProfit)}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-400">
        💡 คลิกที่ช่องต้นทุนเพื่อแก้ไข — บันทึกอัตโนมัติเมื่อกด Enter หรือคลิกออก
      </p>
    </div>
  );
}
