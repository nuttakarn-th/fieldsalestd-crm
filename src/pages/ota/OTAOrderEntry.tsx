/**
 * OTAOrderEntry.tsx — บันทึก OTA Orders รายวัน
 * Mirror: Standard Daycation Database → Order Entry page
 * v2: + Export XLSX + Import XLSX
 */
import { useState, useMemo, useRef, useEffect } from "react";
import { Plus, Search, Pencil, Trash2, ChevronLeft, ChevronRight, X, Check, Download, Upload, AlertCircle } from "lucide-react";
import { useOTAStore, OTAPlatform, OTA_PLATFORMS, OTAOrder } from "@/store/otaStore";
import { useCurrentUser } from "@/store/authStore";
import { toast } from "sonner";
import * as XLSX from "xlsx";

// ── Nationality data ──────────────────────────────────────────────────────────
const TOP_NATIONALITIES = [
  "China","United States","United Kingdom","Germany","France",
  "Japan","South Korea","Singapore","Australia","India",
];
const MORE_NATIONALITIES = [
  "Thailand","Russia","UAE","Taiwan","Hong Kong","Malaysia","Indonesia",
  "Philippines","Vietnam","Brazil","Canada","Italy","Spain","Netherlands",
  "Sweden","Norway","Denmark","Switzerland","Austria","Poland",
  "New Zealand","South Africa","Mexico","Argentina","Turkey","Israel",
  "Egypt","Saudi Arabia","Belgium","Portugal","Greece",
];

// ── Guide options ─────────────────────────────────────────────────────────────
const GUIDE_OPTIONS = ["Chinese Guide", "English Guide", "No Guide"];

// ── SearchCombobox ────────────────────────────────────────────────────────────
interface ComboOption { value: string; label: string; sublabel?: string; group?: string }

function SearchCombobox({
  value, onChange, options, placeholder = "Select...", searchPlaceholder = "Search...",
}: {
  value: string;
  onChange: (v: string) => void;
  options: ComboOption[];
  placeholder?: string;
  searchPlaceholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = query
    ? options.filter((o) =>
        o.label.toLowerCase().includes(query.toLowerCase()) ||
        (o.sublabel?.toLowerCase().includes(query.toLowerCase()))
      )
    : options;

  // Group by opt.group
  const groupOrder: string[] = [];
  const groups: Record<string, ComboOption[]> = {};
  filtered.forEach((o) => {
    const g = o.group ?? "";
    if (!groupOrder.includes(g)) groupOrder.push(g);
    if (!groups[g]) groups[g] = [];
    groups[g].push(o);
  });

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); setQuery(""); }}
        className="w-full flex items-center justify-between px-3 py-2 text-sm bg-background border border-border rounded-lg hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 text-left transition-colors"
      >
        <span className={selected ? "text-foreground" : "text-muted-foreground"}>
          {selected ? (
            <span>
              <span className="font-medium">{selected.label}</span>
              {selected.sublabel && <span className="ml-1 text-muted-foreground font-normal">{selected.sublabel}</span>}
            </span>
          ) : placeholder}
        </span>
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>

      {open && (
        <div className="absolute z-[60] top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
            <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {/* Options list */}
          <div className="max-h-56 overflow-y-auto py-1">
            {groupOrder.map((g) => (
              <div key={g}>
                {g && (
                  <div className="px-3 pt-2 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{g}</div>
                )}
                {groups[g].map((opt) => {
                  const isSelected = opt.value === value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { onChange(opt.value); setOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors ${isSelected ? "bg-pink-500 text-white" : "hover:bg-muted"}`}
                    >
                      <div className="font-medium leading-tight">{opt.label}</div>
                      {opt.sublabel && (
                        <div className={`text-xs leading-tight ${isSelected ? "text-white/80" : "text-muted-foreground"}`}>
                          {opt.sublabel}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-4 text-sm text-center text-muted-foreground">ไม่พบรายการ</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const PLATFORM_COLORS: Record<OTAPlatform, string> = {
  "Trip.com":     "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  "KKday":        "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  "Agent Offline":"bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
  "GetYourGuide": "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  "Viator":       "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  "Airbnb":       "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300",
};

const today = new Date();
const EMPTY_FORM = {
  booking_date: today.toISOString().slice(0, 10),
  usage_date: today.toISOString().slice(0, 10),
  order_number: "",
  group_number: "",
  pax: 2,
  platform: "Trip.com" as OTAPlatform,
  package_id: "",
  package_details: "",
  nationality: "",
  guide_name: "",
  pickup_hotel: "",
  gross_price: 0,
  commission_pct: 0,
  discount: 0,
  revenue: 0,
};

// Export column headers (match import template)
const EXPORT_HEADERS = [
  "Booking Date", "Usage Date", "Order #", "Group #", "People",
  "Platform", "Package Code", "Package Details", "Nationality", "Guide",
  "Pickup Hotel", "Gross Price", "Commission %", "Commission Amount", "Discount", "Net Revenue (THB)",
];

interface ImportError { row: number; message: string }

export default function OTAOrderEntry() {
  const { orders, packages, addOrder, updateOrder, deleteOrder, getPackageByCode } = useOTAStore();
  const currentUser = useCurrentUser();
  const importRef = useRef<HTMLInputElement>(null);

  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [importErrors, setImportErrors] = useState<ImportError[]>([]);
  const [showImportResult, setShowImportResult] = useState(false);
  const [importStats, setImportStats] = useState({ success: 0, failed: 0 });

  // ── Filtered orders ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const prefix = `${year}-${String(month).padStart(2, "0")}`;
    return orders
      .filter((o) => o.usage_date.startsWith(prefix))
      .filter((o) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          o.order_number.toLowerCase().includes(q) ||
          o.platform.toLowerCase().includes(q) ||
          o.nationality?.toLowerCase().includes(q) ||
          packages.find((p) => p.id === o.package_id)?.code.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.usage_date.localeCompare(b.usage_date));
  }, [orders, packages, month, year, search]);

  const totalPax = filtered.reduce((s, o) => s + o.pax, 0);
  const totalRevenue = filtered.reduce((s, o) => s + o.revenue, 0);
  const monthName = new Date(year, month - 1, 1).toLocaleString("en", { month: "long" });

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear((y) => y - 1); } else setMonth((m) => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear((y) => y + 1); } else setMonth((m) => m + 1); };

  // ── Form helpers ──────────────────────────────────────────────────────────
  const openAdd = () => { setForm({ ...EMPTY_FORM }); setEditId(null); setShowForm(true); };
  const openEdit = (o: OTAOrder) => {
    setForm({
      booking_date: o.booking_date, usage_date: o.usage_date,
      order_number: o.order_number, group_number: o.group_number,
      pax: o.pax, platform: o.platform,
      package_id: o.package_id, package_details: o.package_details ?? "",
      nationality: o.nationality ?? "", guide_name: o.guide_name ?? "",
      pickup_hotel: o.pickup_hotel ?? "",
      gross_price: o.gross_price ?? 0,
      commission_pct: o.commission_pct ?? 0,
      discount: o.discount ?? 0,
      revenue: o.revenue,
    });
    setEditId(o.id); setShowForm(true);
  };
  const computeNet = (g: number, pct: number, disc: number) => +(g - g * pct / 100 - disc).toFixed(2);
  const handleSubmit = async () => {
    if (!form.usage_date || !form.order_number || !form.package_id) { toast.error("กรุณากรอก Usage Date, Order # และ Package"); return; }
    const pkg = packages.find((p) => p.id === form.package_id);
    const net = computeNet(form.gross_price, form.commission_pct, form.discount);
    const payload = { ...form, package_details: pkg?.name ?? form.package_details, revenue: net, created_by: currentUser?.full_name ?? "" };
    if (editId) { await updateOrder(editId, payload); toast.success("แก้ไข Order สำเร็จ"); }
    else { await addOrder(payload); toast.success("เพิ่ม Order สำเร็จ"); }
    setShowForm(false);
  };
  const handleDelete = async (id: string) => { if (confirm("ลบ Order นี้?")) { await deleteOrder(id); toast.success("ลบ Order แล้ว"); } };

  // ── Export XLSX ───────────────────────────────────────────────────────────
  const handleExport = () => {
    const rows = filtered.map((o) => {
      const pkg = packages.find((p) => p.id === o.package_id);
      const commAmt = +(o.gross_price * o.commission_pct / 100).toFixed(2);
      return [
        o.booking_date, o.usage_date, o.order_number, o.group_number,
        o.pax, o.platform, pkg?.code ?? "", o.package_details ?? "",
        o.nationality ?? "", o.guide_name ?? "", o.pickup_hotel ?? "",
        o.gross_price, o.commission_pct, commAmt, o.discount, o.revenue,
      ];
    });
    const ws = XLSX.utils.aoa_to_sheet([EXPORT_HEADERS, ...rows]);
    ws["!cols"] = [12,12,14,12,8,16,12,30,14,14,16,12,10,14,10,14].map((w) => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    XLSX.writeFile(wb, `OTA_Orders_${monthName}_${year}.xlsx`);
    toast.success(`Export ${filtered.length} orders สำเร็จ`);
  };

  // ── Download Template ─────────────────────────────────────────────────────
  const handleDownloadTemplate = () => {
    const exampleRow = [
      "2026-09-01", "2026-09-04", "TP-123456", "G-001",
      2, "Trip.com", "CMP", "Chiang Mai - Ping River",
      "Chinese", "John", 874,
    ];
    const note = ["** Platform ที่ใช้ได้: " + OTA_PLATFORMS.join(" | ")];
    const ws = XLSX.utils.aoa_to_sheet([EXPORT_HEADERS, exampleRow, note]);
    ws["!cols"] = [12,12,14,12,8,16,14,30,14,14,14].map((w) => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    XLSX.writeFile(wb, "OTA_Orders_Template.xlsx");
  };

  // ── Import XLSX ───────────────────────────────────────────────────────────
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: "binary", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        // Skip header row
        const dataRows = rows.slice(1).filter((r) => (r as unknown[]).some((c) => c !== ""));
        const errors: ImportError[] = [];
        let success = 0;
        dataRows.forEach((row, i) => {
          const rowNum = i + 2;
          const [bookingDate, usageDate, orderNum, groupNum, pax, platform, pkgCode, pkgDetails, nationality, guide, revenue] = row as string[];
          // Validate
          if (!usageDate || !orderNum) { errors.push({ row: rowNum, message: "Usage Date และ Order # ห้ามว่าง" }); return; }
          if (!OTA_PLATFORMS.includes(platform as OTAPlatform)) { errors.push({ row: rowNum, message: `Platform "${platform}" ไม่ถูกต้อง` }); return; }
          const pkg = getPackageByCode(String(pkgCode));
          const toDate = (v: unknown): string => {
            if (!v) return today.toISOString().slice(0, 10);
            if (v instanceof Date) return v.toISOString().slice(0, 10);
            return String(v).slice(0, 10);
          };
          void addOrder({
            booking_date: toDate(bookingDate),
            usage_date: toDate(usageDate),
            order_number: String(orderNum),
            group_number: String(groupNum ?? ""),
            pax: parseInt(String(pax)) || 1,
            platform: platform as OTAPlatform,
            package_id: pkg?.id ?? "",
            package_details: String(pkgDetails ?? pkg?.name ?? ""),
            nationality: String(nationality ?? ""),
            guide_name: String(guide ?? ""),
            revenue: parseFloat(String(revenue)) || 0,
            created_by: currentUser?.full_name ?? "Import",
          });
          success++;
        });
        setImportStats({ success, failed: errors.length });
        setImportErrors(errors);
        setShowImportResult(true);
        if (success > 0) toast.success(`Import สำเร็จ ${success} rows`);
        if (errors.length > 0) toast.error(`${errors.length} rows มีข้อผิดพลาด`);
      } catch {
        toast.error("ไม่สามารถอ่านไฟล์ได้ กรุณาตรวจสอบ format");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short" });
  const fmtCurrency = (n: number) => n.toLocaleString("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 2 });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Order Entry</h1>
          <p className="text-muted-foreground text-sm">บันทึก OTA orders รายวัน</p>
        </div>
        <div className="flex gap-2">
          {/* Import */}
          <div className="relative">
            <input ref={importRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportFile} />
            <button onClick={() => importRef.current?.click()}
              className="flex items-center gap-2 border border-border hover:bg-muted px-3 py-2 rounded-lg text-sm font-medium transition-colors">
              <Upload className="w-4 h-4" /> Import
            </button>
          </div>
          {/* Export */}
          <button onClick={handleExport}
            className="flex items-center gap-2 border border-border hover:bg-muted px-3 py-2 rounded-lg text-sm font-medium transition-colors">
            <Download className="w-4 h-4" /> Export
          </button>
          {/* Add */}
          <button onClick={openAdd}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Add Order
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5">
          <button onClick={prevMonth} className="hover:text-purple-600 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm font-semibold min-w-[120px] text-center">{monthName} {year}</span>
          <button onClick={nextMonth} className="hover:text-purple-600 transition-colors"><ChevronRight className="w-4 h-4" /></button>
        </div>
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหา order, platform..."
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-muted rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
        <div className="ml-auto flex gap-4 text-sm text-muted-foreground">
          <span><span className="font-semibold text-foreground">{filtered.length}</span> orders</span>
          <span><span className="font-semibold text-foreground">{totalPax}</span> pax</span>
          <span className="font-semibold text-purple-600">{fmtCurrency(totalRevenue)}</span>
        </div>
      </div>

      {/* Template hint */}
      <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
        <button onClick={handleDownloadTemplate} className="text-purple-600 hover:underline flex items-center gap-1">
          <Download className="w-3 h-3" /> ดาวน์โหลด Import Template
        </button>
        <span>· รองรับ .xlsx / .xls / .csv</span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground">
                {["Booking Date","Usage Date","Order #","Group #","People","Platform","Package","Nationality","Guide","Gross","Comm%","Net Revenue",""].map((h) => (
                  <th key={h} className="text-left px-3 py-2.5 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={13} className="text-center py-12 text-muted-foreground">ยังไม่มี Order ในเดือนนี้</td></tr>
              ) : (
                filtered.map((o) => {
                  const pkg = packages.find((p) => p.id === o.package_id);
                  return (
                    <tr key={o.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2.5 whitespace-nowrap">{fmtDate(o.booking_date)}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap font-medium">{fmtDate(o.usage_date)}</td>
                      <td className="px-3 py-2.5">{o.order_number}</td>
                      <td className="px-3 py-2.5">{o.group_number}</td>
                      <td className="px-3 py-2.5 text-center font-semibold">{o.pax}</td>
                      <td className="px-3 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PLATFORM_COLORS[o.platform] ?? "bg-purple-100 text-purple-800"}`}>{o.platform}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="font-mono text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded">{pkg?.code ?? "-"}</span>
                        <span className="ml-2 text-muted-foreground text-xs truncate max-w-[120px] inline-block align-middle">{o.package_details}</span>
                      </td>
                      <td className="px-3 py-2.5">{o.nationality}</td>
                      <td className="px-3 py-2.5">{o.guide_name}</td>
                      <td className="px-3 py-2.5 text-right text-sm">{o.gross_price > 0 ? fmtCurrency(o.gross_price) : "-"}</td>
                      <td className="px-3 py-2.5 text-center text-sm text-muted-foreground">{o.commission_pct > 0 ? `${o.commission_pct}%` : "-"}</td>
                      <td className="px-3 py-2.5 font-semibold text-right text-purple-600 dark:text-purple-400">{fmtCurrency(o.revenue)}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(o)} className="p-1.5 hover:bg-muted rounded transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDelete(o.id)} className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 rounded transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add/Edit Modal ───────────────────────────────────────────────────── */}
      {showForm && (() => {
        const commissionAmt = +(form.gross_price * form.commission_pct / 100).toFixed(2);
        const netRevenue    = +(form.gross_price - commissionAmt - form.discount).toFixed(2);
        const selectedPkg   = packages.find((p) => p.id === form.package_id);
        const inputCls = "w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500";
        const labelCls = "block text-xs font-medium text-foreground/70 mb-1";
        return (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl w-full max-w-xl shadow-2xl max-h-[95vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
                <div>
                  <h2 className="font-bold text-lg">{editId ? "Edit Order" : "Add New Order"}</h2>
                  <p className="text-xs text-muted-foreground">Fill in the details to {editId ? "update" : "create"} a new order.</p>
                </div>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-muted rounded-lg transition-colors"><X className="w-4 h-4" /></button>
              </div>

              <div className="px-6 py-5 space-y-4">
                {/* Row 1: Booking Date | Usage Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Booking Date</label>
                    <input type="date" value={form.booking_date} onChange={(e) => setForm((f) => ({ ...f, booking_date: e.target.value }))} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Usage Date</label>
                    <input type="date" value={form.usage_date} onChange={(e) => setForm((f) => ({ ...f, usage_date: e.target.value }))} className={inputCls} />
                  </div>
                </div>

                {/* Row 2: Order # | Group # */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Order Number <span className="text-red-500">*</span></label>
                    <input value={form.order_number} onChange={(e) => setForm((f) => ({ ...f, order_number: e.target.value }))} placeholder="ORD-001" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Group Number</label>
                    <input value={form.group_number} onChange={(e) => setForm((f) => ({ ...f, group_number: e.target.value }))} placeholder="Optional" className={inputCls} />
                  </div>
                </div>

                {/* Row 3: People | Platform (searchable) */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Number of People <span className="text-red-500">*</span></label>
                    <input type="number" min={1} value={form.pax}
                      onChange={(e) => setForm((f) => ({ ...f, pax: parseInt(e.target.value) || 1 }))}
                      className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Platform <span className="text-red-500">*</span></label>
                    <SearchCombobox
                      value={form.platform}
                      onChange={(v) => {
                        const price = selectedPkg?.platform_prices.find((pp) => pp.platform === v)?.price ?? 0;
                        setForm((f) => ({ ...f, platform: v as OTAPlatform, gross_price: price }));
                      }}
                      options={[
                        { value: "", label: "", sublabel: "Platforms" },
                        ...OTA_PLATFORMS.map((p) => ({ value: p, label: p, group: "Platforms" })),
                      ].filter(o => o.value !== "")}
                      placeholder="Select platform"
                      searchPlaceholder="Search or type new platform..."
                    />
                  </div>
                </div>

                {/* Row 4: Package Code (searchable) | Package Details (auto) */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Package Code <span className="text-red-500">*</span></label>
                    <SearchCombobox
                      value={form.package_id}
                      onChange={(v) => {
                        const pkg = packages.find((p) => p.id === v);
                        const price = pkg?.platform_prices.find((pp) => pp.platform === form.platform)?.price ?? 0;
                        setForm((f) => ({ ...f, package_id: v, gross_price: price }));
                      }}
                      options={packages.map((p) => ({ value: p.id, label: p.code, sublabel: p.name }))}
                      placeholder="Select package"
                      searchPlaceholder="Search packages..."
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Package Details</label>
                    <input readOnly value={selectedPkg?.name ?? ""} placeholder="Auto-populated when package selected"
                      className={`${inputCls} bg-muted/50 cursor-default text-muted-foreground`} />
                  </div>
                </div>

                {/* Row 5: Nationality (searchable) | Guide (select) */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Nationality</label>
                    <SearchCombobox
                      value={form.nationality}
                      onChange={(v) => setForm((f) => ({ ...f, nationality: v }))}
                      options={[
                        ...TOP_NATIONALITIES.map((n) => ({ value: n, label: n, group: "Top Nationalities" })),
                        ...MORE_NATIONALITIES.map((n) => ({ value: n, label: n, group: "More" })),
                      ]}
                      placeholder="Select nationality"
                      searchPlaceholder="Search nationality..."
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Guide <span className="text-red-500">*</span></label>
                    <select value={form.guide_name} onChange={(e) => setForm((f) => ({ ...f, guide_name: e.target.value }))}
                      className={inputCls}>
                      <option value=""></option>
                      {GUIDE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                </div>

                {/* Row 6: Pickup Hotel (full width) */}
                <div>
                  <label className={labelCls}>Pickup Hotel</label>
                  <input value={form.pickup_hotel} onChange={(e) => setForm((f) => ({ ...f, pickup_hotel: e.target.value }))} placeholder="Hotel name (optional)" className={inputCls} />
                </div>

                {/* Row 7: Gross Price | Commission % */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Gross Price <span className="text-red-500">*</span></label>
                    <input type="number" min={0} step="0.01" value={form.gross_price}
                      onChange={(e) => setForm((f) => ({ ...f, gross_price: parseFloat(e.target.value) || 0 }))}
                      className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Commission % <span className="text-red-500">*</span></label>
                    <input type="number" min={0} max={100} step="0.1" value={form.commission_pct}
                      onChange={(e) => setForm((f) => ({ ...f, commission_pct: parseFloat(e.target.value) || 0 }))}
                      placeholder="e.g. 15" className={inputCls} />
                  </div>
                </div>

                {/* Row 8: Commission Amount (auto) | Discount */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Commission Amount</label>
                    <input readOnly value={commissionAmt.toFixed(2)}
                      className={`${inputCls} bg-muted/50 cursor-default text-muted-foreground`} />
                  </div>
                  <div>
                    <label className={labelCls}>Discount</label>
                    <input type="number" min={0} step="0.01" value={form.discount}
                      onChange={(e) => setForm((f) => ({ ...f, discount: parseFloat(e.target.value) || 0 }))}
                      className={inputCls} />
                  </div>
                </div>

                {/* Row 9: Net Revenue (full width, purple) */}
                <div>
                  <label className={labelCls}>Net Revenue</label>
                  <div className={`${inputCls} bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 font-bold text-purple-600 dark:text-purple-400`}>
                    {netRevenue.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 px-6 py-4 border-t border-border sticky bottom-0 bg-card">
                <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 text-sm font-medium bg-muted hover:bg-muted/80 rounded-xl transition-colors">Cancel</button>
                <button onClick={handleSubmit} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors">
                  <Check className="w-4 h-4" /> {editId ? "Save Changes" : "Create Order"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Import Result Modal ──────────────────────────────────────────────── */}
      {showImportResult && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-bold text-lg">ผลการ Import</h2>
              <button onClick={() => setShowImportResult(false)} className="p-2 hover:bg-muted rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex gap-4">
                <div className="flex-1 bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-green-600">{importStats.success}</div>
                  <div className="text-xs text-green-600/80">สำเร็จ</div>
                </div>
                <div className="flex-1 bg-red-50 dark:bg-red-900/20 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-red-600">{importStats.failed}</div>
                  <div className="text-xs text-red-600/80">ผิดพลาด</div>
                </div>
              </div>
              {importErrors.length > 0 && (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {importErrors.map((e, i) => (
                    <div key={i} className="flex gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg p-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>Row {e.row}: {e.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-5 border-t border-border">
              <button onClick={() => setShowImportResult(false)} className="w-full px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">ปิด</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
