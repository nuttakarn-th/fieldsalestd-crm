/**
 * OTAPnL.tsx — Profit & Loss (redesigned v2)
 * Mobile: accordion cards | Desktop: table
 */

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useOTAStore, OTAGroupCost } from "@/store/otaStore";
import {
  TrendingUp, TrendingDown, ChevronDown, ChevronUp,
  Users, DollarSign, BarChart2, Package,
  ArrowUpDown, ArrowUp, ArrowDown,
  Pencil, Check, X, Download, Upload, AlertCircle, AlignJustify,
} from "lucide-react";
import * as XLSX from "xlsx";

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
  const m = code.match(/[A-Z]+(\d{2})(\d{2})/);
  if (m) return `${m[1]}${m[2]}`;
  return code;
}
function groupDay(code: string, month: string): string {
  const m = code.match(/[A-Z]+\d{2}(\d{2})/);
  if (!m) return "";
  const [yr, mo] = month.split("-");
  const day = m[1];
  const d = new Date(`${yr}-${mo}-${day}`);
  if (isNaN(d.getTime())) return "";
  const dayNum = d.getDate();
  const monthName = d.toLocaleString("en-GB", { month: "short" });
  return `${dayNum} ${monthName} ${yr}`;
}

type SortBy = "date" | "revenue" | "profit";
type SortDir = "asc" | "desc";
type DraftCosts = Record<string, number>;

const COST_FIELDS: { key: keyof OTAGroupCost; label: string; emoji: string }[] = [
  { key: "attraction", label: "Attraction",  emoji: "🏞️" },
  { key: "meals",      label: "Meals",        emoji: "🍱" },
  { key: "car",        label: "Car",          emoji: "🚌" },
  { key: "guide_fee",  label: "Guide Fee",    emoji: "🧭" },
  { key: "tip_driver", label: "Tip Driver",   emoji: "💰" },
  { key: "other_fee",  label: "Other Fee",    emoji: "📦" },
];

// ─── Mobile Group Card ────────────────────────────────────────────────────────

function GroupCard({ row, month, onSaveAll }: {
  row: ReturnType<typeof buildRows>[number];
  month: string;
  onSaveAll: (code: string, draft: DraftCosts) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DraftCosts>({});
  const isProfit = row.profit >= 0;
  const hasCosts = row.totalCost > 0;

  // Init draft whenever row cost changes or card opens
  useEffect(() => {
    const d: DraftCosts = {};
    COST_FIELDS.forEach((f) => { d[f.key as string] = row.cost[f.key] as number; });
    setDraft(d);
  }, [row.cost]);

  const draftTotal = COST_FIELDS.reduce((s, f) => s + (draft[f.key as string] ?? 0), 0);
  const draftProfit = row.revenue - draftTotal;

  return (
    <div className={`rounded-2xl border bg-white dark:bg-card overflow-hidden shadow-sm transition-all ${open ? "border-purple-200 dark:border-purple-500/60 shadow-purple-100" : "border-gray-100 dark:border-border"}`}>
      {/* Card header */}
      <button
        className="w-full text-left px-4 py-3.5 flex items-center gap-3"
        onClick={() => setOpen((o) => !o)}
      >
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
            {(() => { const day = groupDay(row.code, month); return day ? <span>{day}</span> : null; })()}
            <span>{row.pax} PAX</span>
            <span>·</span>
            <span className="text-blue-600 font-medium">{fmtB(row.revenue)}</span>
            {hasCosts && (
              <>
                <span>·</span>
                <span>ต้นทุน {fmtB(row.totalCost)}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-sm font-bold px-2.5 py-1 rounded-xl ${isProfit ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>
            {isProfit ? "+" : ""}{fmtB(row.profit)}
          </span>
          {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {/* Expanded: draft inputs + Save/Cancel */}
      {open && (
        <div className="border-t border-gray-100 dark:border-border px-4 pt-3 pb-4 bg-gray-50/50 dark:bg-muted/40">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium mb-3">กรอกต้นทุน</p>
          <div className="grid grid-cols-2 gap-3">
            {COST_FIELDS.map((f) => (
              <div key={f.key as string} className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">
                  {f.emoji} {f.label}
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">฿</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    className="w-full pl-6 pr-2 py-2 text-sm border border-gray-200 dark:border-border rounded-lg bg-gray-50 dark:bg-muted dark:text-foreground focus:bg-white dark:focus:bg-card focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-300 transition-all"
                    placeholder="0"
                    value={draft[f.key as string] === 0 ? "" : draft[f.key as string] ?? ""}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setDraft((d) => ({ ...d, [f.key as string]: val }));
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Preview + Save/Cancel */}
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-border space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>รายได้ <span className="font-semibold text-blue-600">{fmtB(row.revenue)}</span> − ต้นทุน <span className="font-semibold text-gray-700">{fmtB(draftTotal)}</span></span>
              <span className={`font-bold ${draftProfit >= 0 ? "text-green-600" : "text-red-500"}`}>
                {draftProfit >= 0 ? "+" : ""}{fmtB(draftProfit)}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const d: DraftCosts = {};
                  COST_FIELDS.forEach((f) => { d[f.key as string] = row.cost[f.key] as number; });
                  setDraft(d);
                }}
                className="flex-1 py-2 text-xs font-medium text-gray-500 dark:text-muted-foreground bg-white dark:bg-muted border border-gray-200 dark:border-border rounded-xl hover:bg-gray-50 dark:hover:bg-muted/70 transition-colors flex items-center justify-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> ยกเลิก
              </button>
              <button
                onClick={() => { onSaveAll(row.code, draft); setOpen(false); }}
                className="flex-1 py-2 text-xs font-medium text-white bg-purple-600 rounded-xl hover:bg-purple-700 transition-colors flex items-center justify-center gap-1"
              >
                <Check className="w-3.5 h-3.5" /> บันทึก
              </button>
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
  const sorted = [...groupMap.entries()];
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
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Row-level edit state (desktop)
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [draftCosts, setDraftCosts] = useState<DraftCosts>({});
  const [compact, setCompact] = useState(false);

  useEffect(() => { loadGroupCostsByMonth(month); }, [month, loadGroupCostsByMonth]);

  const rawRows = useMemo(
    () => buildRows(orders, packages, groupCosts, month),
    [orders, packages, groupCosts, month]
  );

  const rows = useMemo(() => {
    const sorted = [...rawRows].sort((a, b) => {
      let cmp = 0;
      if (sortBy === "date")    cmp = groupSortKey(a.code).localeCompare(groupSortKey(b.code));
      if (sortBy === "revenue") cmp = a.revenue - b.revenue;
      if (sortBy === "profit")  cmp = a.profit - b.profit;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted.map((r, i) => ({ ...r, no: i + 1 }));
  }, [rawRows, sortBy, sortDir]);

  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const totalCostAll = rows.reduce((s, r) => s + r.totalCost, 0);
  const totalProfit  = totalRevenue - totalCostAll;
  const totalPax     = rows.reduce((s, r) => s + r.pax, 0);

  // Save all cost fields for a row at once
  const saveAllCosts = useCallback(
    (groupCode: string, draft: DraftCosts) => {
      const existing = groupCosts.find(
        (c) => c.group_code === groupCode && c.month === month
      ) ?? { group_code: groupCode, month, attraction: 0, meals: 0, car: 0,
              guide_fee: 0, tip_driver: 0, other_fee: 0, note: "" };
      upsertGroupCost({
        ...existing,
        attraction: draft["attraction"] ?? 0,
        meals:      draft["meals"]      ?? 0,
        car:        draft["car"]        ?? 0,
        guide_fee:  draft["guide_fee"]  ?? 0,
        tip_driver: draft["tip_driver"] ?? 0,
        other_fee:  draft["other_fee"]  ?? 0,
      } as Omit<OTAGroupCost, "id" | "created_at">);
    },
    [groupCosts, month, upsertGroupCost]
  );

  // Desktop: start editing a row
  const startEdit = (row: typeof rows[number]) => {
    const d: DraftCosts = {};
    COST_FIELDS.forEach((f) => { d[f.key as string] = row.cost[f.key] as number; });
    setDraftCosts(d);
    setEditingRow(row.code);
  };

  const cancelEdit = () => { setEditingRow(null); setDraftCosts({}); };

  const confirmEdit = (row: typeof rows[number]) => {
    saveAllCosts(row.code, draftCosts);
    setEditingRow(null);
    setDraftCosts({});
  };

  // ── Export ────────────────────────────────────────────────────────────────────
  const handleExport = () => {
    const HEADERS = [
      "Group Code", "Date", "PAX", "รายได้สุทธิ (THB)",
      "Attraction", "Meals", "Car", "Guide Fee", "Tip Driver", "Other Fee",
      "Total Cost", "กำไร/ขาดทุน",
    ];
    const data = rows.map((r) => [
      r.code,
      groupDay(r.code, month),
      r.pax,
      r.revenue,
      r.cost.attraction, r.cost.meals, r.cost.car,
      r.cost.guide_fee, r.cost.tip_driver, r.cost.other_fee,
      r.totalCost,
      r.profit,
    ]);
    const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...data]);
    ws["!cols"] = [18,16,7,18,12,10,10,12,12,12,12,14].map((w) => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "P&L");
    const [yr, mo] = month.split("-");
    XLSX.writeFile(wb, `PnL_${yr}-${mo}.xlsx`);
  };

  // ── Import ────────────────────────────────────────────────────────────────────
  const importRef = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<{
    rows: { code: string; draft: DraftCosts }[];
    errors: string[];
  } | null>(null);

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        const dataRows = raw.slice(1).filter((r) => String(r[0] ?? "").trim());
        const pNum = (v: unknown) => parseFloat(String(v ?? "").replace(/[฿$,\s]/g, "")) || 0;
        const parsed: { code: string; draft: DraftCosts }[] = [];
        const errors: string[] = [];
        dataRows.forEach((r, i) => {
          const code = String(r[0] ?? "").trim();
          if (!code) { errors.push(`แถว ${i + 2}: ไม่มี Group Code`); return; }
          // Check group code exists in this month's rows
          if (!rows.find((row) => row.code === code)) {
            errors.push(`แถว ${i + 2}: "${code}" ไม่พบในเดือนนี้`);
            return;
          }
          parsed.push({
            code,
            draft: {
              attraction: pNum(r[4]),
              meals:      pNum(r[5]),
              car:        pNum(r[6]),
              guide_fee:  pNum(r[7]),
              tip_driver: pNum(r[8]),
              other_fee:  pNum(r[9]),
            },
          });
        });
        setImportPreview({ rows: parsed, errors });
      } catch {
        alert("ไม่สามารถอ่านไฟล์ได้ กรุณาใช้ไฟล์ที่ Export จากระบบ");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const confirmImport = () => {
    if (!importPreview) return;
    importPreview.rows.forEach(({ code, draft }) => saveAllCosts(code, draft));
    setImportPreview(null);
  };

  const kpis = [
    { label: "กรุ๊ป", value: `${rows.length}`, icon: Package, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "PAX รวม", value: `${totalPax.toLocaleString("th-TH")}`, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "รายได้รวม", value: fmtB(totalRevenue), icon: DollarSign, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "กำไร / ขาดทุน", value: fmtB(totalProfit), icon: BarChart2,
      color: totalProfit >= 0 ? "text-green-600" : "text-red-500",
      bg:    totalProfit >= 0 ? "bg-green-50" : "bg-red-50" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background">

      {/* ── Import file input (hidden) ────────────────────────────────────────── */}
      <input ref={importRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportFile} />

      {/* ── Sticky Header ──────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white dark:bg-card border-b border-gray-100 dark:border-border shadow-sm px-4 py-3 flex items-center justify-between gap-2">
        <div className="shrink-0">
          <h1 className="text-base font-bold text-[#1e1b4b] leading-tight">Profit &amp; Loss</h1>
          <p className="text-[11px] text-gray-400">ตารางสรุปกำไร-ขาดทุนรายกรุ๊ป</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Import */}
          <button
            onClick={() => importRef.current?.click()}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-xl transition-colors"
            title="Import ต้นทุนจาก Excel"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Import</span>
          </button>
          {/* Export */}
          <button
            onClick={handleExport}
            disabled={rows.length === 0}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-xl transition-colors disabled:opacity-40"
            title="Export เป็น Excel"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
          {/* Compact toggle — desktop only */}
          <button
            onClick={() => setCompact((c) => !c)}
            className={`hidden md:flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl transition-colors ${
              compact ? "bg-purple-100 text-purple-700" : "text-gray-600 bg-gray-100 hover:bg-gray-200"
            }`}
            title={compact ? "Normal view" : "Compact view"}
          >
            <AlignJustify className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">{compact ? "Normal" : "Compact"}</span>
          </button>
          {/* Month selector */}
          <div className="relative">
            <select
              className="appearance-none bg-purple-600 text-white text-sm font-semibold rounded-xl px-4 py-2 pr-8 cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-400 shadow-sm"
              value={month}
              onChange={(e) => { setMonth(e.target.value); cancelEdit(); }}
            >
              {monthOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ── Import Preview Modal ──────────────────────────────────────────────── */}
      {importPreview && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-card rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-border flex items-center justify-between">
              <h2 className="font-bold text-[#1e1b4b]">ยืนยันการ Import ต้นทุน</h2>
              <button onClick={() => setImportPreview(null)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-3 space-y-3">
              {importPreview.errors.length > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <span className="text-xs font-semibold text-red-600">{importPreview.errors.length} แถวที่ข้ามไป</span>
                  </div>
                  {importPreview.errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-500 ml-6">{e}</p>
                  ))}
                </div>
              )}
              {importPreview.rows.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">ไม่มีแถวที่สามารถ import ได้</p>
              ) : (
                <>
                  <p className="text-xs text-gray-500">จะอัพเดตต้นทุน <span className="font-semibold text-[#1e1b4b]">{importPreview.rows.length} กรุ๊ป</span></p>
                  <div className="space-y-1.5">
                    {importPreview.rows.map(({ code, draft }) => {
                      const total = COST_FIELDS.reduce((s, f) => s + (draft[f.key as string] ?? 0), 0);
                      const rev = rows.find((r) => r.code === code)?.revenue ?? 0;
                      return (
                        <div key={code} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
                          <span className="font-semibold text-[#1e1b4b]">{code}</span>
                          <span className="text-gray-500">ต้นทุน {fmtB(total)}</span>
                          <span className={`font-semibold ${rev - total >= 0 ? "text-green-600" : "text-red-500"}`}>
                            กำไร {fmtB(rev - total)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
            <div className="px-5 py-4 border-t border-gray-100 dark:border-border flex gap-2">
              <button onClick={() => setImportPreview(null)}
                className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                ยกเลิก
              </button>
              <button
                onClick={confirmImport}
                disabled={importPreview.rows.length === 0}
                className="flex-1 py-2.5 text-sm font-medium text-white bg-purple-600 rounded-xl hover:bg-purple-700 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                บันทึก {importPreview.rows.length} กรุ๊ป
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 space-y-4 pb-32">

        {/* ── KPI Cards ────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          {kpis.map((k) => {
            const Icon = k.icon;
            return (
              <div key={k.label} className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border shadow-sm p-3.5 flex items-center gap-3">
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
                <div className="flex items-center gap-2">
                  <p className="text-[10px] text-gray-400">แตะเพื่อกรอกต้นทุน</p>
                  <button
                    className="text-[10px] text-purple-600 bg-purple-50 px-2 py-1 rounded-lg flex items-center gap-1"
                    onClick={() => {
                      if (sortBy === "date") setSortDir(d => d === "asc" ? "desc" : "asc");
                      else { setSortBy("date"); setSortDir("asc"); }
                    }}
                  >
                    {sortBy === "date" && sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : sortBy === "date" ? <ArrowDown className="w-3 h-3" /> : <ArrowUpDown className="w-3 h-3" />}
                    วันที่
                  </button>
                </div>
              </div>
              {rows.map((row) => (
                <GroupCard key={row.code} row={row} month={month} onSaveAll={saveAllCosts} />
              ))}
            </div>

            {/* ── Desktop Table ───────────────────────────────────────────────── */}
            <div
              className="hidden md:block overflow-x-auto overflow-y-auto rounded-2xl border border-gray-100 dark:border-border shadow-sm bg-white dark:bg-card"
              style={{ maxHeight: "calc(100vh - 310px)" }}
            >
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#1e1b4b] text-white text-xs">
                    {/* Action column */}
                    <th className="px-2 py-2.5 text-center w-14"></th>
                    <th className="px-3 py-2.5 text-left min-w-[130px]">
                      <button
                        className="flex items-center gap-1 hover:text-purple-200 transition-colors"
                        onClick={() => { if (sortBy === "date") setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortBy("date"); setSortDir("asc"); } }}
                      >
                        Group Code
                        {sortBy === "date"
                          ? sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                          : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                      </button>
                    </th>
                    <th className="px-3 py-2.5 text-center w-16">PAX</th>
                    <th className="px-3 py-2.5 text-right min-w-[100px]">
                      <button
                        className="flex items-center gap-1 ml-auto hover:text-purple-200 transition-colors"
                        onClick={() => { if (sortBy === "revenue") setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortBy("revenue"); setSortDir("desc"); } }}
                      >
                        รายได้สุทธิ
                        {sortBy === "revenue"
                          ? sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                          : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                      </button>
                    </th>
                    {COST_FIELDS.map((f) => (
                      <th key={f.key as string} className="px-2 py-2.5 text-right min-w-[85px] font-medium">
                        {f.emoji} {f.label}
                      </th>
                    ))}
                    <th className="px-3 py-2.5 text-right min-w-[95px]">Total Cost</th>
                    <th className="px-3 py-2.5 text-right min-w-[105px]">
                      <button
                        className="flex items-center gap-1 ml-auto hover:text-purple-200 transition-colors"
                        onClick={() => { if (sortBy === "profit") setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortBy("profit"); setSortDir("desc"); } }}
                      >
                        กำไร/ขาดทุน
                        {sortBy === "profit"
                          ? sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                          : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const isEditing = editingRow === row.code;
                    // draft total & profit for preview while editing
                    const dTotal = isEditing
                      ? COST_FIELDS.reduce((s, f) => s + (draftCosts[f.key as string] ?? 0), 0)
                      : row.totalCost;
                    const dProfit = row.revenue - dTotal;

                    return (
                      <tr key={row.code}
                        className={`border-b border-gray-50 transition-colors
                          ${isEditing
                            ? "bg-amber-50/60 dark:bg-amber-900/20 border-l-2 border-l-amber-400"
                            : i % 2 === 0 ? "bg-white dark:bg-card hover:bg-purple-50/20 dark:hover:bg-purple-500/10" : "bg-gray-50/40 dark:bg-muted/30 hover:bg-purple-50/20 dark:hover:bg-purple-500/10"
                          }`}
                      >
                        {/* Action cell */}
                        <td className={`px-2 text-center ${compact ? "py-1" : "py-2"}`}>
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => confirmEdit(row)} title="บันทึก"
                                className="p-1 rounded-lg bg-green-500 hover:bg-green-600 text-white transition-colors">
                                <Check className="w-3 h-3" />
                              </button>
                              <button onClick={cancelEdit} title="ยกเลิก"
                                className="p-1 rounded-lg bg-gray-200 dark:bg-muted hover:bg-gray-300 dark:hover:bg-muted/70 text-gray-600 dark:text-muted-foreground transition-colors">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => startEdit(row)} title="แก้ไขต้นทุน"
                              className="p-1 rounded-lg text-gray-300 hover:text-purple-600 hover:bg-purple-50 transition-colors">
                              <Pencil className="w-3 h-3" />
                            </button>
                          )}
                        </td>

                        {/* Group Code */}
                        <td
                          className={`px-3 ${compact ? "py-1" : "py-2.5"}`}
                          title={compact ? [groupDay(row.code, month), row.packageCodes.join(", ")].filter(Boolean).join(" · ") : undefined}
                        >
                          <div className={`font-bold text-[#1e1b4b] ${compact ? "text-xs" : "text-sm"}`}>{row.code}</div>
                          {!compact && (() => { const day = groupDay(row.code, month); return day ? <div className="text-[10px] text-gray-400 mt-0.5">{day}</div> : null; })()}
                          {!compact && row.packageCodes.length > 0 && (
                            <div className="text-[10px] text-purple-500 mt-0.5">{row.packageCodes.join(", ")}</div>
                          )}
                        </td>

                        <td className={`px-3 text-center font-semibold text-gray-700 ${compact ? "py-1 text-xs" : "py-2.5 text-sm"}`}>{row.pax}</td>
                        <td className={`px-3 text-right font-semibold text-blue-600 ${compact ? "py-1 text-xs" : "py-2.5 text-sm"}`}>{fmtB(row.revenue)}</td>

                        {/* Cost fields — inputs when editing, display when not */}
                        {COST_FIELDS.map((f) => (
                          <td key={f.key as string} className={`px-2 ${compact ? "py-0.5" : "py-1.5"}`}>
                            {isEditing ? (
                              <input
                                type="number"
                                inputMode="numeric"
                                className="w-full text-right text-xs border border-amber-300 rounded px-1.5 py-1 outline-none bg-white dark:bg-muted dark:text-foreground focus:border-purple-400 focus:ring-1 focus:ring-purple-300"
                                placeholder="0"
                                value={draftCosts[f.key as string] === 0 ? "" : draftCosts[f.key as string] ?? ""}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setDraftCosts((d) => ({ ...d, [f.key as string]: val }));
                                }}
                              />
                            ) : (
                              <span className={`block text-right text-xs px-1 ${compact ? "py-0.5" : "py-1"} ${(row.cost[f.key] as number) === 0 ? "text-gray-300" : "text-gray-700"}`}>
                                {(row.cost[f.key] as number) === 0 ? "—" : fmtB(row.cost[f.key] as number)}
                              </span>
                            )}
                          </td>
                        ))}

                        {/* Total cost — live preview while editing */}
                        <td className={`px-3 text-right font-medium text-gray-600 ${compact ? "py-1 text-xs" : "py-2.5 text-sm"}`}>
                          {fmtB(dTotal)}
                        </td>

                        {/* Profit — live preview while editing */}
                        <td className={`px-3 text-right ${compact ? "py-1" : "py-2.5"}`}>
                          <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-lg
                            ${compact ? "text-xs" : "text-sm"}
                            ${dProfit >= 0 ? "text-green-600 bg-green-50" : "text-red-500 bg-red-50"}`}>
                            {dProfit >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {fmtB(dProfit)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-[#1e1b4b]/5 dark:bg-purple-500/10 border-t-2 border-[#1e1b4b]/10 dark:border-purple-400/30 font-bold">
                    <td className="px-2 py-3" />
                    <td colSpan={1} className="px-3 py-3 text-sm text-gray-700">รวมทั้งหมด</td>
                    <td className="px-3 py-3 text-center text-sm text-gray-700">{totalPax}</td>
                    <td className="px-3 py-3 text-right text-sm text-blue-600">{fmtB(totalRevenue)}</td>
                    {COST_FIELDS.map((f) => {
                      const total = rows.reduce((s, r) => s + (r.cost[f.key] as number), 0);
                      return (
                        <td key={f.key as string} className="px-2 py-3 text-right text-xs text-gray-500">
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
