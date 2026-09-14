/**
 * OTAPnL.tsx — Profit & Loss (redesigned v2)
 * Mobile: accordion cards | Desktop: table
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import { useOTAStore, OTAGroupCost } from "@/store/otaStore";
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp, Users, DollarSign, BarChart2, Package } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtB(n: number) {
  return `฿${Math.round(n).toLocaleString("th-TH")}`;
}
function fmtShort(n: number) {
  if (Math.abs(n) >= 1000) return `฿${(n / 1000).toFixed(1)}k`;
  return `฿${Math.round(n)}`;
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
function groupSortKey(code: string): string {
  const m = code.match(/OA(\d{2})(\d{2})/);
  if (m) return `${m[1]}${m[2]}`;
  return code;
}

const COST_FIELDS: { key: keyof OTAGroupCost; label: string; emoji: string }[] = [
  { key: "attraction", label: "Attraction",  emoji: "🏞️" },
  { key: "meals",      label: "Meals",        emoji: "🍱" },
  { key: "car",        label: "Car",          emoji: "🚌" },
  { key: "guide_fee",  label: "Guide Fee",    emoji: "🧭" },
  { key: "tip_driver", label: "Tip Driver",   emoji: "💰" },
  { key: "other_fee",  label: "Other Fee",    emoji: "📦" },
];

// ─── Inline number input ──────────────────────────────────────────────────────

function CostInput({ label, emoji, value, onSave }: {
  label: string; emoji: string; value: number; onSave: (v: number) => void;
}) {
  const [draft, setDraft] = useState(value === 0 ? "" : String(value));

  useEffect(() => {
    setDraft(value === 0 ? "" : String(value));
  }, [value]);

  const commit = () => {
    const num = parseFloat(draft.replace(/,/g, "")) || 0;
    onSave(num);
  };

  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">
        {emoji} {label}
      </label>
      <div className="relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">฿</span>
        <input
          type="number"
          inputMode="numeric"
          className="w-full pl-6 pr-2 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-300 transition-all"
          placeholder="0"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") { commit(); (e.target as HTMLInputElement).blur(); } }}
        />
      </div>
    </div>
  );
}

// ─── Desktop inline edit cell ─────────────────────────────────────────────────

function EditCell({ value, onSave }: { value: number; onSave: (v: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const start = () => { setDraft(value === 0 ? "" : String(value)); setEditing(true); };
  const commit = () => { onSave(parseFloat(draft.replace(/,/g, "")) || 0); setEditing(false); };
  if (editing) return (
    <input autoFocus
      className="w-full text-right text-xs border border-purple-400 rounded px-1 py-1 outline-none bg-purple-50"
      value={draft} onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
    />
  );
  return (
    <button onClick={start}
      className="w-full text-right text-xs py-1 px-1 rounded hover:bg-purple-50 transition-colors block"
    >
      {value === 0 ? <span className="text-gray-300">—</span> : fmtB(value)}
    </button>
  );
}

// ─── Mobile Group Card ────────────────────────────────────────────────────────

function GroupCard({ row, month, saveCost }: {
  row: ReturnType<typeof buildRows>[number];
  month: string;
  saveCost: (code: string, field: keyof OTAGroupCost, val: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const isProfit = row.profit >= 0;
  const hasCosts = row.totalCost > 0;

  return (
    <div className={`rounded-2xl border bg-white overflow-hidden shadow-sm transition-all ${open ? "border-purple-200 shadow-purple-100" : "border-gray-100"}`}>
      {/* Card header — always visible */}
      <button
        className="w-full text-left px-4 py-3.5 flex items-center gap-3"
        onClick={() => setOpen((o) => !o)}
      >
        {/* Left: group + package */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-bold text-[#1e1b4b] text-base tracking-tight">{row.code}</span>
            {row.packageCodes.length > 0 && (
              <span className="text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full font-medium">
                {row.packageCodes.join("+")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span>{row.pax} PAX</span>
            <span>·</span>
            <span className="text-blue-600 font-medium">{fmtB(row.revenue)}</span>
            {hasCosts && (
              <>
                <span>·</span>
                <span className="text-gray-400">ต้นทุน {fmtB(row.totalCost)}</span>
              </>
            )}
          </div>
        </div>

        {/* Right: profit pill + chevron */}
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-sm font-bold px-2.5 py-1 rounded-xl ${isProfit ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>
            {isProfit ? "+" : ""}{fmtShort(row.profit)}
          </span>
          {open
            ? <ChevronUp className="w-4 h-4 text-gray-400" />
            : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {/* Expanded cost inputs */}
      {open && (
        <div className="border-t border-gray-100 px-4 pt-3 pb-4 bg-gray-50/50">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium mb-3">กรอกต้นทุน</p>
          <div className="grid grid-cols-2 gap-3">
            {COST_FIELDS.map((f) => (
              <CostInput
                key={f.key}
                label={f.label}
                emoji={f.emoji}
                value={row.cost[f.key] as number}
                onSave={(v) => saveCost(row.code, f.key, v)}
              />
            ))}
          </div>
          {/* Summary row */}
          <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              รายได้ <span className="font-semibold text-blue-600">{fmtB(row.revenue)}</span>
              &nbsp;− ต้นทุน <span className="font-semibold text-gray-700">{fmtB(row.totalCost)}</span>
            </div>
            <div className={`flex items-center gap-1 font-bold text-sm ${isProfit ? "text-green-600" : "text-red-500"}`}>
              {isProfit ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {fmtB(row.profit)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Type helper ──────────────────────────────────────────────────────────────

function buildRows(
  orders: ReturnType<typeof useOTAStore.getState>["orders"],
  packages: ReturnType<typeof useOTAStore.getState>["packages"],
  groupCosts: ReturnType<typeof useOTAStore.getState>["groupCosts"],
  month: string
) {
  const [yr, mo] = month.split("-").map(Number);
  const monthOrders = orders.filter((o) => {
    const d = new Date(o.usage_date);
    return d.getFullYear() === yr && d.getMonth() + 1 === mo;
  });
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
  const sorted = [...groupMap.entries()].sort((a, b) =>
    groupSortKey(a[0]).localeCompare(groupSortKey(b[0]))
  );
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
    return { no: idx + 1, code, pax: data.pax, revenue: data.revenue,
      cost, totalCost, profit: data.revenue - totalCost,
      packageCodes: [...data.packageCodes] };
  });
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OTAPnL() {
  const orders              = useOTAStore((s) => s.orders);
  const packages            = useOTAStore((s) => s.packages);
  const groupCosts          = useOTAStore((s) => s.groupCosts);
  const upsertGroupCost     = useOTAStore((s) => s.upsertGroupCost);
  const loadGroupCostsByMonth = useOTAStore((s) => s.loadGroupCostsByMonth);

  const [month, setMonth] = useState(getCurrentYM());
  const monthOptions = useMemo(() => buildMonthOptions(), []);

  useEffect(() => { loadGroupCostsByMonth(month); }, [month, loadGroupCostsByMonth]);

  const rows = useMemo(
    () => buildRows(orders, packages, groupCosts, month),
    [orders, packages, groupCosts, month]
  );

  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const totalCostAll = rows.reduce((s, r) => s + r.totalCost, 0);
  const totalProfit  = totalRevenue - totalCostAll;
  const totalPax     = rows.reduce((s, r) => s + r.pax, 0);

  const saveCost = useCallback(
    (groupCode: string, field: keyof OTAGroupCost, value: number) => {
      const existing = groupCosts.find(
        (c) => c.group_code === groupCode && c.month === month
      ) ?? { group_code: groupCode, month, attraction: 0, meals: 0, car: 0,
              guide_fee: 0, tip_driver: 0, other_fee: 0, note: "" };
      upsertGroupCost({ ...existing, [field]: value } as Omit<OTAGroupCost, "id" | "created_at">);
    },
    [groupCosts, month, upsertGroupCost]
  );

  const kpis = [
    { label: "กรุ๊ป", value: `${rows.length}`, sub: "กรุ๊ป", icon: Package, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "PAX รวม", value: `${totalPax.toLocaleString("th-TH")}`, sub: "คน", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "รายได้รวม", value: fmtB(totalRevenue), sub: "", icon: DollarSign, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "กำไร / ขาดทุน", value: fmtB(totalProfit), sub: "", icon: BarChart2,
      color: totalProfit >= 0 ? "text-green-600" : "text-red-500",
      bg:    totalProfit >= 0 ? "bg-green-50" : "bg-red-50" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Sticky Header ──────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-[#1e1b4b] leading-tight">Profit &amp; Loss</h1>
          <p className="text-[11px] text-gray-400">ตารางสรุปกำไร-ขาดทุนรายกรุ๊ป</p>
        </div>
        <div className="relative shrink-0">
          <select
            className="appearance-none bg-purple-600 text-white text-sm font-semibold rounded-xl px-4 py-2 pr-8 cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-400 shadow-sm"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          >
            {monthOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white pointer-events-none" />
        </div>
      </div>

      <div className="p-4 space-y-4 pb-32">

        {/* ── KPI Cards ────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          {kpis.map((k) => {
            const Icon = k.icon;
            return (
              <div key={k.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5 flex items-center gap-3">
                <div className={`${k.bg} rounded-xl p-2 shrink-0`}>
                  <Icon className={`w-4 h-4 ${k.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-400 font-medium truncate">{k.label}</p>
                  <p className={`text-base font-bold leading-tight ${k.color}`}>{k.value}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Content ──────────────────────────────────────────────────────────── */}
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-300 gap-3">
            <BarChart2 className="w-12 h-12" />
            <p className="text-sm">ไม่มีข้อมูล Order ในเดือนนี้</p>
          </div>
        ) : (
          <>
            {/* ── Mobile Cards ───────────────────────────────────────────────── */}
            <div className="md:hidden space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{rows.length} กรุ๊ป</p>
                <p className="text-[10px] text-gray-400">แตะเพื่อกรอกต้นทุน</p>
              </div>
              {rows.map((row) => (
                <GroupCard key={row.code} row={row} month={month} saveCost={saveCost} />
              ))}
            </div>

            {/* ── Desktop Table ───────────────────────────────────────────────── */}
            <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-100 shadow-sm bg-white">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-[#1e1b4b] text-white text-xs">
                    <th className="px-3 py-3 text-center w-8">#</th>
                    <th className="px-3 py-3 text-left min-w-[130px]">Group Code</th>
                    <th className="px-3 py-3 text-center w-16">PAX</th>
                    <th className="px-3 py-3 text-right min-w-[100px]">รายได้สุทธิ</th>
                    {COST_FIELDS.map((f) => (
                      <th key={f.key} className="px-2 py-3 text-right min-w-[85px] font-medium">
                        {f.emoji} {f.label}
                      </th>
                    ))}
                    <th className="px-3 py-3 text-right min-w-[95px]">Total Cost</th>
                    <th className="px-3 py-3 text-right min-w-[105px]">กำไร/ขาดทุน</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={row.code}
                      className={`border-b border-gray-50 hover:bg-purple-50/20 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}
                    >
                      <td className="px-3 py-2.5 text-center text-gray-300 text-xs">{row.no}</td>
                      <td className="px-3 py-2.5">
                        <div className="font-bold text-[#1e1b4b] text-sm">{row.code}</div>
                        {row.packageCodes.length > 0 && (
                          <div className="text-[10px] text-purple-500 mt-0.5">{row.packageCodes.join(", ")}</div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center font-semibold text-gray-700 text-sm">{row.pax}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-blue-600 text-sm">{fmtB(row.revenue)}</td>
                      {COST_FIELDS.map((f) => (
                        <td key={f.key} className="px-2 py-1.5">
                          <EditCell value={row.cost[f.key] as number} onSave={(v) => saveCost(row.code, f.key, v)} />
                        </td>
                      ))}
                      <td className="px-3 py-2.5 text-right text-sm font-medium text-gray-600">{fmtB(row.totalCost)}</td>
                      <td className="px-3 py-2.5 text-right">
                        <span className={`inline-flex items-center gap-1 font-bold text-sm px-2 py-0.5 rounded-lg
                          ${row.profit >= 0 ? "text-green-600 bg-green-50" : "text-red-500 bg-red-50"}`}>
                          {row.profit >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {fmtB(row.profit)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[#1e1b4b]/5 border-t-2 border-[#1e1b4b]/10 font-bold">
                    <td colSpan={2} className="px-3 py-3 text-sm text-gray-700">รวมทั้งหมด</td>
                    <td className="px-3 py-3 text-center text-sm text-gray-700">{totalPax}</td>
                    <td className="px-3 py-3 text-right text-sm text-blue-600">{fmtB(totalRevenue)}</td>
                    {COST_FIELDS.map((f) => {
                      const total = rows.reduce((s, r) => s + (r.cost[f.key] as number), 0);
                      return (
                        <td key={f.key} className="px-2 py-3 text-right text-xs text-gray-500">
                          {total > 0 ? fmtB(total) : "—"}
                        </td>
                      );
                    })}
                    <td className="px-3 py-3 text-right text-sm text-gray-700">{fmtB(totalCostAll)}</td>
                    <td className="px-3 py-3 text-right">
                      <span className={`inline-flex items-center gap-1 font-bold text-sm px-2 py-0.5 rounded-lg
                        ${totalProfit >= 0 ? "text-green-600 bg-green-50" : "text-red-500 bg-red-50"}`}>
                        {totalProfit >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {fmtB(totalProfit)}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ── Mobile Sticky Summary Bar ─────────────────────────────────────────── */}
      {rows.length > 0 && (
        <div className="md:hidden fixed bottom-16 left-0 right-0 z-10 bg-[#1e1b4b] text-white px-4 py-3 flex items-center justify-between shadow-2xl">
          <div className="text-xs">
            <div className="text-white/60 text-[10px] font-medium uppercase tracking-wide">รายได้</div>
            <div className="font-bold text-sm">{fmtB(totalRevenue)}</div>
          </div>
          <div className="w-px h-8 bg-white/20" />
          <div className="text-xs">
            <div className="text-white/60 text-[10px] font-medium uppercase tracking-wide">ต้นทุน</div>
            <div className="font-bold text-sm">{fmtB(totalCostAll)}</div>
          </div>
          <div className="w-px h-8 bg-white/20" />
          <div className="text-xs text-right">
            <div className="text-white/60 text-[10px] font-medium uppercase tracking-wide">กำไร/ขาดทุน</div>
            <div className={`font-bold text-base ${totalProfit >= 0 ? "text-green-400" : "text-red-400"}`}>
              {totalProfit >= 0 ? "+" : ""}{fmtB(totalProfit)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
