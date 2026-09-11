/**
 * OTAOrderEntry.tsx — บันทึก OTA Orders รายวัน
 * Mirror: Standard Daycation Database → Order Entry page
 * v2: + Export XLSX + Import XLSX
 */
import React, { useState, useMemo, useRef, useEffect } from "react";
import { Plus, Search, Pencil, Trash2, ChevronLeft, ChevronRight, X, Check, Download, Upload, AlertCircle, SlidersHorizontal, ChevronDown } from "lucide-react";
import { useOTAStore, OTAPlatform, OTA_PLATFORMS, OTAOrder } from "@/store/otaStore";
import { useCurrentUser } from "@/store/authStore";
import { cn } from "@/lib/utils";
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

// ── Sort config ───────────────────────────────────────────────────────────────
type SortKey = "booking_date" | "usage_date" | "gross_price" | "commission_pct" | "commAmt" | "discount" | "revenue";

const SORT_COLS: Array<{ label: string; key: SortKey | null; align?: "left" | "center" | "right" }> = [
  { label: "Booking Date",    key: "booking_date"   },
  { label: "Usage Date",      key: "usage_date"     },
  { label: "Order #",         key: null             },
  { label: "Group #",         key: null             },
  { label: "People",          key: null,             align: "center" },
  { label: "Platform",        key: null             },
  { label: "Package Code",    key: null             },
  { label: "Package Details", key: null             },
  { label: "Nationality",     key: null             },
  { label: "Guide",           key: null             },
  { label: "Pickup Hotel",    key: null             },
  { label: "Gross Price",     key: "gross_price",    align: "right"  },
  { label: "Comm %",          key: "commission_pct", align: "center" },
  { label: "Comm Amount",     key: "commAmt",        align: "right"  },
  { label: "Discount",        key: "discount",       align: "right"  },
  { label: "Net Revenue",     key: "revenue",        align: "right"  },
  { label: "",                key: null             },
];

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

// ── MultiSelectDropdown ───────────────────────────────────────────────────────
function MultiSelectDropdown({
  label, options, selected, onChange, renderOption,
}: {
  label: string;
  options: string[];
  selected: Set<string>;
  onChange: (s: Set<string>) => void;
  renderOption?: (v: string) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const toggle = (v: string) => { const n = new Set(selected); n.has(v) ? n.delete(v) : n.add(v); onChange(n); };
  const count = selected.size;
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(v => !v)}
        className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors whitespace-nowrap",
          count > 0 ? "bg-purple-50 border-purple-300 text-purple-700 dark:bg-purple-900/30 dark:border-purple-600 dark:text-purple-300"
                    : "bg-muted border-border text-foreground hover:bg-muted/80")}>
        {label}
        {count > 0 && <span className="bg-purple-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold leading-none">{count}</span>}
        <ChevronDown className="w-3.5 h-3.5 opacity-50" />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 bg-white dark:bg-zinc-900 border border-border rounded-xl shadow-xl min-w-[180px] max-h-60 overflow-y-auto py-1">
          {options.length === 0
            ? <div className="px-3 py-2 text-xs text-muted-foreground">ไม่มีข้อมูล</div>
            : options.map(opt => (
                <button key={opt} onClick={() => toggle(opt)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted transition-colors text-left">
                  <div className={cn("w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                    selected.has(opt) ? "bg-purple-600 border-purple-600" : "border-border")}>
                    {selected.has(opt) && <Check className="w-3 h-3 text-white" />}
                  </div>
                  {renderOption ? renderOption(opt) : opt}
                </button>
              ))
          }
          {count > 0 && (
            <div className="border-t border-border mt-1 pt-1 px-3 pb-1">
              <button onClick={() => onChange(new Set())} className="text-xs text-muted-foreground hover:text-red-500 transition-colors">ล้างทั้งหมด</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function OTAOrderEntry() {
  const { orders, packages, platformConfigs, addOrder, updateOrder, deleteOrder, importOrders, getPackageByCode, highlightedOrderId, setHighlightedOrderId } = useOTAStore();
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
  const [importStats, setImportStats] = useState({ inserted: 0, updated: 0, failed: 0 });
  // Commission input mode: "pct" = กรอก % แล้วคำนวณยอด | "amt" = กรอกยอดแล้วคำนวณ %
  const [commissionMode, setCommissionMode] = useState<"pct" | "amt">("pct");
  const [commissionAmtDirect, setCommissionAmtDirect] = useState<number>(0);
  const [sortKey, setSortKey] = useState<SortKey>("usage_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [sheetOrder, setSheetOrder] = useState<OTAOrder | null>(null);

  // ── Filter state ──────────────────────────────────────────────────────────
  const [filterPlatforms, setFilterPlatforms] = useState<Set<string>>(new Set());
  const [filterNats, setFilterNats] = useState<Set<string>>(new Set());
  const [filterGuide, setFilterGuide] = useState("all");
  const [filterPkgCodes, setFilterPkgCodes] = useState<Set<string>>(new Set());
  const [filterPaxMin, setFilterPaxMin] = useState("");
  const [filterPaxMax, setFilterPaxMax] = useState("");
  const [filterPriceMin, setFilterPriceMin] = useState("");
  const [filterPriceMax, setFilterPriceMax] = useState("");
  const [showAdvFilters, setShowAdvFilters] = useState(false);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  // ── Notification highlight — scroll to row + flash orange ─────────────────
  useEffect(() => {
    if (!highlightedOrderId) return;
    // ถ้า order อยู่เดือนอื่น ให้เปลี่ยน month/year ไปก่อน
    const targetOrder = orders.find((o) => o.id === highlightedOrderId);
    if (targetOrder) {
      const d = new Date(targetOrder.usage_date);
      setMonth(d.getMonth() + 1);
      setYear(d.getFullYear());
    }
    // รอ render รอบถัดไปแล้วค่อย scroll
    const scrollTimer = setTimeout(() => {
      const row = document.querySelector<HTMLElement>(`[data-order-id="${highlightedOrderId}"]`);
      row?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
    // ล้าง highlight หลัง 2.5s
    const clearTimer = setTimeout(() => setHighlightedOrderId(null), 2500);
    return () => { clearTimeout(scrollTimer); clearTimeout(clearTimer); };
  }, [highlightedOrderId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Option lists (derived from month's orders) ────────────────────────────
  const monthOrders = useMemo(() => {
    const prefix = `${year}-${String(month).padStart(2, "0")}`;
    return orders.filter(o => o.usage_date.startsWith(prefix));
  }, [orders, month, year]);
  const availPlatforms = useMemo(() => [...new Set(monthOrders.map(o => o.platform))].sort(), [monthOrders]);
  const availNats      = useMemo(() => [...new Set(monthOrders.map(o => o.nationality ?? "").filter(Boolean))].sort(), [monthOrders]);
  const availGuides    = useMemo(() => [...new Set(monthOrders.map(o => o.guide_name ?? "").filter(Boolean))].sort(), [monthOrders]);
  const availPkgCodes  = useMemo(() => [...new Set(monthOrders.map(o => packages.find(p => p.id === o.package_id)?.code ?? "").filter(Boolean))].sort(), [monthOrders, packages]);

  const activeFilterCount = filterPlatforms.size + filterNats.size + (filterGuide !== "all" ? 1 : 0) + filterPkgCodes.size + (filterPaxMin || filterPaxMax ? 1 : 0) + (filterPriceMin || filterPriceMax ? 1 : 0);
  const clearAllFilters = () => { setFilterPlatforms(new Set()); setFilterNats(new Set()); setFilterGuide("all"); setFilterPkgCodes(new Set()); setFilterPaxMin(""); setFilterPaxMax(""); setFilterPriceMin(""); setFilterPriceMax(""); };

  // ── Filtered orders ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const prefix = `${year}-${String(month).padStart(2, "0")}`;
    return orders
      .filter((o) => o.usage_date.startsWith(prefix))
      .filter((o) => {
        if (!search) return true;
        const q = search.toLowerCase();
        const pkg = packages.find((p) => p.id === o.package_id);
        return (
          o.order_number.toLowerCase().includes(q) ||
          o.group_number?.toLowerCase().includes(q) ||
          o.platform.toLowerCase().includes(q) ||
          o.nationality?.toLowerCase().includes(q) ||
          o.guide_name?.toLowerCase().includes(q) ||
          o.pickup_hotel?.toLowerCase().includes(q) ||
          o.package_details?.toLowerCase().includes(q) ||
          pkg?.code.toLowerCase().includes(q) ||
          pkg?.name.toLowerCase().includes(q)
        );
      })
      .filter(o => filterPlatforms.size === 0 || filterPlatforms.has(o.platform))
      .filter(o => filterNats.size === 0 || filterNats.has(o.nationality ?? ""))
      .filter(o => filterGuide === "all" || o.guide_name === filterGuide)
      .filter(o => filterPkgCodes.size === 0 || filterPkgCodes.has(packages.find(p => p.id === o.package_id)?.code ?? ""))
      .filter(o => !filterPaxMin || o.pax >= parseInt(filterPaxMin))
      .filter(o => !filterPaxMax || o.pax <= parseInt(filterPaxMax))
      .filter(o => !filterPriceMin || o.gross_price >= parseFloat(filterPriceMin))
      .filter(o => !filterPriceMax || o.gross_price <= parseFloat(filterPriceMax))
      .sort((a, b) => {
        const getVal = (o: OTAOrder): number | string => {
          if (sortKey === "commAmt") return o.gross_price * o.commission_pct / 100;
          const v = o[sortKey as keyof OTAOrder];
          return (v ?? "") as number | string;
        };
        const va = getVal(a);
        const vb = getVal(b);
        const cmp = typeof va === "number" && typeof vb === "number"
          ? va - vb
          : String(va).localeCompare(String(vb));
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [orders, packages, month, year, search, sortKey, sortDir]);

  const totalPax = filtered.reduce((s, o) => s + o.pax, 0);
  const totalRevenue = filtered.reduce((s, o) => s + o.revenue, 0);
  const monthName = new Date(year, month - 1, 1).toLocaleString("en", { month: "long" });

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear((y) => y - 1); } else setMonth((m) => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear((y) => y + 1); } else setMonth((m) => m + 1); };

  // ── Form helpers ──────────────────────────────────────────────────────────
  const openAdd = () => {
    const defaultPlatform = EMPTY_FORM.platform;
    const cfg = platformConfigs.find((c) => c.platform === defaultPlatform);
    setForm({ ...EMPTY_FORM, commission_pct: cfg?.commission_pct ?? 0 });
    setEditId(null);
    setCommissionMode("pct");
    setCommissionAmtDirect(cfg ? +(EMPTY_FORM.gross_price * (cfg.commission_pct) / 100).toFixed(2) : 0);
    setShowForm(true);
  };
  const openEdit = (o: OTAOrder) => {
    const pct = o.commission_pct ?? 0;
    const gross = o.gross_price ?? 0;
    setForm({
      booking_date: o.booking_date, usage_date: o.usage_date,
      order_number: o.order_number, group_number: o.group_number,
      pax: o.pax, platform: o.platform,
      package_id: o.package_id, package_details: o.package_details ?? "",
      nationality: o.nationality ?? "", guide_name: o.guide_name ?? "",
      pickup_hotel: o.pickup_hotel ?? "",
      gross_price: gross,
      commission_pct: pct,
      discount: o.discount ?? 0,
      revenue: o.revenue,
    });
    setCommissionMode("pct");
    setCommissionAmtDirect(+(gross * pct / 100).toFixed(2));
    setEditId(o.id); setShowForm(true);
  };
  const computeNet = (g: number, pct: number, disc: number) => +(g - g * pct / 100 - disc).toFixed(2);
  const handleSubmit = async () => {
    if (!form.usage_date || !form.order_number || !form.package_id) { toast.error("กรุณากรอก Usage Date, Order # และ Package"); return; }
    const pkg = packages.find((p) => p.id === form.package_id);
    const net = computeNet(form.gross_price, form.commission_pct, form.discount);
    const payload = { ...form, package_details: pkg?.name ?? form.package_details, revenue: net, created_by: currentUser?.full_name ?? "" };
    if (editId) { await updateOrder(editId, payload, currentUser?.full_name ?? "ระบบ"); toast.success("แก้ไข Order สำเร็จ"); }
    else { await addOrder(payload); toast.success("เพิ่ม Order สำเร็จ"); }
    setShowForm(false);
  };
  const handleDelete = async (id: string) => { if (confirm("ลบ Order นี้?")) { await deleteOrder(id, currentUser?.full_name ?? "ระบบ"); toast.success("ลบ Order แล้ว"); } };

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
    reader.onload = async (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: "binary", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        // Skip header row
        const dataRows = rows.slice(1).filter((r) => (r as unknown[]).some((c) => c !== ""));
        const errors: ImportError[] = [];
        const validRows: Omit<OTAOrder, "id" | "created_at">[] = [];

        const toDate = (v: unknown): string => {
          if (!v) return today.toISOString().slice(0, 10);
          if (v instanceof Date) return v.toISOString().slice(0, 10);
          return String(v).slice(0, 10);
        };

        dataRows.forEach((row, i) => {
          const rowNum = i + 2;
          // 16 columns: Booking Date | Usage Date | Order # | Group # | People | Platform |
          //              Package Code | Package Details | Nationality | Guide | Pickup Hotel |
          //              Gross Price | Commission % | Commission Amount | Discount | Net Revenue
          const [
            bookingDate, usageDate, orderNum, groupNum, pax, platform,
            pkgCode, pkgDetails, nationality, guide, pickupHotel,
            grossRaw, commRaw, , discountRaw, revenueRaw,
          ] = row as unknown[];

          // Validate
          if (!usageDate || !orderNum) { errors.push({ row: rowNum, message: "Usage Date และ Order # ห้ามว่าง" }); return; }
          // Platform validation — fallback to OTA_PLATFORMS ถ้า configs ยังไม่โหลด
          const knownPlatforms = platformConfigs.length > 0
            ? platformConfigs.map((c) => c.platform)
            : [...OTA_PLATFORMS];
          if (!knownPlatforms.includes(String(platform))) { errors.push({ row: rowNum, message: `Platform "${platform}" ไม่ถูกต้อง (เพิ่มใน Platforms ก่อน)` }); return; }

          const pkg = getPackageByCode(String(pkgCode ?? ""));
          const grossPrice  = parseFloat(String(grossRaw ?? 0)) || 0;
          // Commission อาจเป็น decimal (0.2) หรือ % (20) — normalize เป็น %
          const commRawNum  = parseFloat(String(commRaw ?? 0)) || 0;
          const commPct     = commRawNum > 0 && commRawNum <= 1 ? commRawNum * 100 : commRawNum;
          const discount    = parseFloat(String(discountRaw ?? 0)) || 0;
          // Revenue: คำนวณใหม่เสมอ (ไม่ใช้ค่าจากไฟล์ เพราะอาจเป็น formula string)
          const revenue     = +(grossPrice - (grossPrice * commPct / 100) - discount).toFixed(2);
          void revenueRaw; // suppress unused warning

          validRows.push({
            booking_date:    toDate(bookingDate),
            usage_date:      toDate(usageDate),
            order_number:    String(orderNum),
            group_number:    String(groupNum ?? ""),
            pax:             parseInt(String(pax)) || 1,
            platform:        String(platform) as OTAPlatform,
            package_id:      pkg?.id ?? "",
            package_details: String(pkgDetails ?? pkg?.name ?? ""),
            nationality:     String(nationality ?? ""),
            guide_name:      String(guide ?? ""),
            pickup_hotel:    String(pickupHotel ?? ""),
            gross_price:     grossPrice,
            commission_pct:  commPct,
            discount:        discount,
            revenue:         revenue,
            created_by:      currentUser?.full_name ?? "Import",
          });
        });

        // Batch upsert — gets back inserted/updated/errors count
        let inserted = 0;
        let updated = 0;
        let batchErrors = 0;
        if (validRows.length > 0) {
          const result = await importOrders(validRows);
          inserted = result.inserted;
          updated  = result.updated;
          batchErrors = result.errors;
        }

        const totalFailed = errors.length + batchErrors;
        setImportStats({ inserted, updated, failed: totalFailed });
        setImportErrors(errors);
        setShowImportResult(true);

        if (inserted > 0 || updated > 0) {
          toast.success(`Import สำเร็จ: เพิ่ม ${inserted} | อัปเดต ${updated} orders`);
        }
        if (totalFailed > 0) toast.error(`${totalFailed} rows มีข้อผิดพลาด`);
      } catch {
        toast.error("ไม่สามารถอ่านไฟล์ได้ กรุณาตรวจสอบ format");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const fmtCurrency = (n: number) => n.toLocaleString("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 2 });

  return (
    <div className="p-4 w-full">
      {/* Flash animation keyframe */}
      <style>{`
        @keyframes row-flash {
          0%,100% { background-color: transparent; }
          20%,60%  { background-color: rgb(254 215 170 / 0.9); outline: 2px solid rgb(249 115 22); outline-offset: -2px; }
        }
        .row-flash-anim { animation: row-flash 0.55s ease-in-out 4; }
      `}</style>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Order Entry</h1>
          <p className="text-muted-foreground text-sm hidden sm:block">บันทึก OTA orders รายวัน</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Import */}
          <div className="relative">
            <input ref={importRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportFile} />
            <button onClick={() => importRef.current?.click()}
              className="flex items-center gap-1.5 border border-border hover:bg-muted px-3 py-2 rounded-lg text-sm font-medium transition-colors">
              <Upload className="w-4 h-4" /><span className="hidden sm:inline">Import</span>
            </button>
          </div>
          {/* Export */}
          <button onClick={handleExport}
            className="flex items-center gap-1.5 border border-border hover:bg-muted px-3 py-2 rounded-lg text-sm font-medium transition-colors">
            <Download className="w-4 h-4" /><span className="hidden sm:inline">Export</span>
          </button>
          {/* Add */}
          <button onClick={openAdd}
            className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Add Order
          </button>
        </div>
      </div>

      {/* ── Controls / Filter Bar ── */}
      <div className="flex flex-col gap-2 mb-4">

        {/* Row 1: Month + Search + Quick Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Month nav */}
          <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5 shrink-0">
            <button onClick={prevMonth} className="hover:text-purple-600 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm font-semibold min-w-[110px] text-center">{monthName} {year}</span>
            <button onClick={nextMonth} className="hover:text-purple-600 transition-colors"><ChevronRight className="w-4 h-4" /></button>
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหา order#, group#, guide, hotel, package..."
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-muted rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>

          {/* Platform */}
          <MultiSelectDropdown label="Platform" options={availPlatforms} selected={filterPlatforms} onChange={setFilterPlatforms}
            renderOption={v => <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", PLATFORM_COLORS[v as OTAPlatform] ?? "bg-gray-100 text-gray-700")}>{v}</span>} />

          {/* Nationality */}
          <MultiSelectDropdown label="Nationality" options={availNats} selected={filterNats} onChange={setFilterNats} />

          {/* Guide */}
          <select value={filterGuide} onChange={e => setFilterGuide(e.target.value)}
            className={cn("px-3 py-1.5 rounded-lg text-sm border transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500",
              filterGuide !== "all" ? "bg-purple-50 border-purple-300 text-purple-700 dark:bg-purple-900/30 dark:border-purple-600 dark:text-purple-300"
                                    : "bg-muted border-border")}>
            <option value="all">Guide: ทั้งหมด</option>
            {availGuides.map(g => <option key={g} value={g}>{g}</option>)}
          </select>

          {/* Advanced toggle */}
          <button onClick={() => setShowAdvFilters(v => !v)}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors",
              showAdvFilters || activeFilterCount > 0
                ? "bg-purple-50 border-purple-300 text-purple-700 dark:bg-purple-900/30 dark:border-purple-600 dark:text-purple-300"
                : "bg-muted border-border text-foreground hover:bg-muted/80")}>
            <SlidersHorizontal className="w-3.5 h-3.5" />
            เพิ่มเติม
            {activeFilterCount > 0 && <span className="bg-purple-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold leading-none">{activeFilterCount}</span>}
          </button>
        </div>

        {/* Row 2: Advanced Filters */}
        {showAdvFilters && (
          <div className="bg-muted/50 border border-border rounded-xl p-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Package Code */}
            <div>
              <p className="text-xs text-muted-foreground mb-1.5 font-medium">Package Code</p>
              <MultiSelectDropdown label="เลือก Code" options={availPkgCodes} selected={filterPkgCodes} onChange={setFilterPkgCodes}
                renderOption={v => <span className="font-mono text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded">{v}</span>} />
            </div>
            {/* Pax range */}
            <div>
              <p className="text-xs text-muted-foreground mb-1.5 font-medium">จำนวน Pax</p>
              <div className="flex items-center gap-1.5">
                <input type="number" min={1} placeholder="min" value={filterPaxMin} onChange={e => setFilterPaxMin(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm bg-white dark:bg-zinc-900 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
                <span className="text-muted-foreground text-xs">–</span>
                <input type="number" min={1} placeholder="max" value={filterPaxMax} onChange={e => setFilterPaxMax(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm bg-white dark:bg-zinc-900 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
            </div>
            {/* Price range */}
            <div>
              <p className="text-xs text-muted-foreground mb-1.5 font-medium">Gross Price (฿)</p>
              <div className="flex items-center gap-1.5">
                <input type="number" min={0} placeholder="min" value={filterPriceMin} onChange={e => setFilterPriceMin(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm bg-white dark:bg-zinc-900 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
                <span className="text-muted-foreground text-xs">–</span>
                <input type="number" min={0} placeholder="max" value={filterPriceMax} onChange={e => setFilterPriceMax(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm bg-white dark:bg-zinc-900 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
            </div>
            {/* Clear */}
            <div className="flex items-end">
              <button onClick={clearAllFilters} className="text-xs text-red-500 hover:text-red-700 transition-colors underline underline-offset-2">
                ล้าง Filter ทั้งหมด
              </button>
            </div>
          </div>
        )}

        {/* Row 3: Active chips + Summary */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[...filterPlatforms].map(p => (
            <span key={p} className="flex items-center gap-1 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs px-2 py-0.5 rounded-full">
              {p}<button onClick={() => { const s = new Set(filterPlatforms); s.delete(p); setFilterPlatforms(s); }}><X className="w-3 h-3" /></button>
            </span>
          ))}
          {[...filterNats].map(n => (
            <span key={n} className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs px-2 py-0.5 rounded-full">
              {n}<button onClick={() => { const s = new Set(filterNats); s.delete(n); setFilterNats(s); }}><X className="w-3 h-3" /></button>
            </span>
          ))}
          {filterGuide !== "all" && (
            <span className="flex items-center gap-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-xs px-2 py-0.5 rounded-full">
              {filterGuide}<button onClick={() => setFilterGuide("all")}><X className="w-3 h-3" /></button>
            </span>
          )}
          {[...filterPkgCodes].map(c => (
            <span key={c} className="flex items-center gap-1 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 text-xs px-2 py-0.5 rounded-full font-mono">
              {c}<button onClick={() => { const s = new Set(filterPkgCodes); s.delete(c); setFilterPkgCodes(s); }}><X className="w-3 h-3" /></button>
            </span>
          ))}
          {(filterPaxMin || filterPaxMax) && (
            <span className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs px-2 py-0.5 rounded-full">
              Pax {filterPaxMin || "1"}–{filterPaxMax || "∞"}
              <button onClick={() => { setFilterPaxMin(""); setFilterPaxMax(""); }}><X className="w-3 h-3" /></button>
            </span>
          )}
          {(filterPriceMin || filterPriceMax) && (
            <span className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs px-2 py-0.5 rounded-full">
              ฿{filterPriceMin || "0"}–{filterPriceMax || "∞"}
              <button onClick={() => { setFilterPriceMin(""); setFilterPriceMax(""); }}><X className="w-3 h-3" /></button>
            </span>
          )}
          {activeFilterCount > 0 && (
            <button onClick={clearAllFilters} className="text-xs text-muted-foreground hover:text-red-500 transition-colors">ล้างทั้งหมด</button>
          )}
          <span className="ml-auto text-sm text-muted-foreground flex gap-3">
            <span><span className="font-semibold text-foreground">{filtered.length}</span> orders</span>
            <span><span className="font-semibold text-foreground">{totalPax}</span> pax</span>
            <span className="font-semibold text-purple-600">{fmtCurrency(totalRevenue)}</span>
          </span>
        </div>
      </div>

      {/* Template hint */}
      <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
        <button onClick={handleDownloadTemplate} className="text-purple-600 hover:underline flex items-center gap-1">
          <Download className="w-3 h-3" /> ดาวน์โหลด Import Template
        </button>
        <span>· รองรับ .xlsx / .xls / .csv</span>
      </div>

      {/* ── Mobile Card List (compact 2-line, tap to open Bottom Sheet) ─────── */}
      <div className="md:hidden space-y-2 mb-4">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">ยังไม่มี Order ในเดือนนี้</div>
        ) : (
          filtered.map((o) => {
            const pkg = packages.find((p) => p.id === o.package_id);
            return (
              <button
                key={o.id}
                data-order-id={o.id}
                onClick={() => setSheetOrder(o)}
                className={cn(
                  "w-full text-left bg-card border border-border rounded-xl px-4 py-3 shadow-sm active:scale-[0.98] transition-transform",
                  highlightedOrderId === o.id && "row-flash-anim"
                )}
              >
                {/* Line 1: date · platform · pax */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold">{fmtDate(o.usage_date)}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PLATFORM_COLORS[o.platform] ?? "bg-purple-100 text-purple-800"}`}>{o.platform}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{o.pax} pax</span>
                </div>
                {/* Line 2: order # · net revenue */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                    {o.order_number}
                    {pkg?.code ? <span className="ml-2 font-mono bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-1 py-0.5 rounded text-[10px]">{pkg.code}</span> : null}
                  </span>
                  <span className="text-sm font-bold text-purple-600 dark:text-purple-400 shrink-0">{fmtCurrency(o.revenue)}</span>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* ── Bottom Sheet (order detail) ───────────────────────────────────────── */}
      {sheetOrder && (() => {
        const o = sheetOrder;
        const pkg = packages.find((p) => p.id === o.package_id);
        const commAmt = +(o.gross_price * o.commission_pct / 100).toFixed(2);
        return (
          <div className="md:hidden fixed inset-0 z-[60] flex flex-col justify-end">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50" onClick={() => setSheetOrder(null)} />
            {/* Sheet */}
            <div className="relative bg-card rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col">
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                <div>
                  <p className="font-bold text-base">{fmtDate(o.usage_date)}</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PLATFORM_COLORS[o.platform] ?? "bg-purple-100 text-purple-800"}`}>{o.platform}</span>
                </div>
                <button onClick={() => setSheetOrder(null)} className="p-2 hover:bg-muted rounded-lg transition-colors"><X className="w-4 h-4" /></button>
              </div>
              {/* Body — scrollable */}
              <div className="overflow-y-auto px-5 py-4 space-y-3 flex-1">
                {/* Order info */}
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-xs text-muted-foreground">Booking Date</p><p className="text-sm font-medium">{fmtDate(o.booking_date)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Usage Date</p><p className="text-sm font-medium">{fmtDate(o.usage_date)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Order #</p><p className="text-sm font-medium break-all">{o.order_number}</p></div>
                  {o.group_number && <div><p className="text-xs text-muted-foreground">Group #</p><p className="text-sm font-medium">{o.group_number}</p></div>}
                </div>
                {/* Package */}
                <div className="bg-muted/40 rounded-lg px-3 py-2">
                  <p className="text-xs text-muted-foreground mb-1">Package</p>
                  <div className="flex items-start gap-2">
                    {pkg?.code && <span className="font-mono text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded shrink-0">{pkg.code}</span>}
                    <p className="text-sm">{o.package_details}</p>
                  </div>
                </div>
                {/* People */}
                <div className="grid grid-cols-3 gap-3">
                  <div><p className="text-xs text-muted-foreground">Pax</p><p className="text-sm font-semibold">{o.pax}</p></div>
                  {o.nationality && <div><p className="text-xs text-muted-foreground">Nationality</p><p className="text-sm">{o.nationality}</p></div>}
                  {o.guide_name && <div><p className="text-xs text-muted-foreground">Guide</p><p className="text-sm">{o.guide_name}</p></div>}
                </div>
                {o.pickup_hotel && <div><p className="text-xs text-muted-foreground">Pickup Hotel</p><p className="text-sm">{o.pickup_hotel}</p></div>}
                {/* Financials */}
                <div className="bg-muted/40 rounded-lg px-3 py-3 grid grid-cols-2 gap-3">
                  <div><p className="text-xs text-muted-foreground">Gross Price</p><p className="text-sm font-medium">{o.gross_price > 0 ? fmtCurrency(o.gross_price) : "-"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Commission {o.commission_pct > 0 ? `(${+((+o.commission_pct).toFixed(1))}%)` : ""}</p><p className="text-sm text-muted-foreground">{commAmt > 0 ? fmtCurrency(commAmt) : "-"}</p></div>
                  {o.discount > 0 && <div><p className="text-xs text-muted-foreground">Discount</p><p className="text-sm text-muted-foreground">{fmtCurrency(o.discount)}</p></div>}
                  <div className="col-span-2 border-t border-border pt-2 mt-1">
                    <p className="text-xs text-muted-foreground">Net Revenue</p>
                    <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{fmtCurrency(o.revenue)}</p>
                  </div>
                </div>
              </div>
              {/* Footer actions */}
              <div className="flex gap-3 px-5 pt-4 pb-6 border-t border-border">
                <button
                  onClick={() => { setSheetOrder(null); handleDelete(o.id); }}
                  className="flex-1 flex items-center justify-center gap-2 border border-red-300 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 py-2.5 rounded-xl text-sm font-medium transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> ลบ
                </button>
                <button
                  onClick={() => { setSheetOrder(null); openEdit(o); }}
                  className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
                >
                  <Pencil className="w-4 h-4" /> แก้ไข
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Desktop Table ─────────────────────────────────────────────────────── */}
      <div className="hidden md:block rounded-xl border border-border overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground">
                {SORT_COLS.map((col) => (
                  <th
                    key={col.label || "actions"}
                    onClick={() => col.key && handleSort(col.key)}
                    className={cn(
                      "px-3 py-2.5 font-medium whitespace-nowrap",
                      col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left",
                      col.key && "cursor-pointer select-none hover:text-foreground transition-colors"
                    )}
                  >
                    {col.key ? (
                      <span className="inline-flex items-center gap-0.5">
                        {col.label}
                        <span className="text-[10px] leading-none opacity-60">
                          {sortKey === col.key ? (sortDir === "asc" ? " ▲" : " ▼") : " ⇅"}
                        </span>
                      </span>
                    ) : col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={17} className="text-center py-12 text-muted-foreground">ยังไม่มี Order ในเดือนนี้</td></tr>
              ) : (
                filtered.map((o) => {
                  const pkg = packages.find((p) => p.id === o.package_id);
                  const commAmt = +(o.gross_price * o.commission_pct / 100).toFixed(2);
                  return (
                    <tr
                      key={o.id}
                      data-order-id={o.id}
                      className={cn(
                        "border-t border-border hover:bg-muted/30 transition-colors",
                        highlightedOrderId === o.id && "row-flash-anim"
                      )}
                    >
                      <td className="px-3 py-2.5 whitespace-nowrap text-sm">{fmtDate(o.booking_date)}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap font-medium text-sm">{fmtDate(o.usage_date)}</td>
                      <td className="px-3 py-2.5 text-sm">{o.order_number}</td>
                      <td className="px-3 py-2.5 text-sm">{o.group_number}</td>
                      <td className="px-3 py-2.5 text-center font-semibold">{o.pax}</td>
                      <td className="px-3 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PLATFORM_COLORS[o.platform] ?? "bg-purple-100 text-purple-800"}`}>{o.platform}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="font-mono text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded">{pkg?.code ?? "-"}</span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground max-w-[160px] truncate">{o.package_details}</td>
                      <td className="px-3 py-2.5 text-sm">{o.nationality}</td>
                      <td className="px-3 py-2.5 text-sm whitespace-nowrap">{o.guide_name}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground max-w-[140px] truncate">{o.pickup_hotel ?? "-"}</td>
                      <td className="px-3 py-2.5 text-right text-sm">{o.gross_price > 0 ? fmtCurrency(o.gross_price) : "-"}</td>
                      <td className="px-3 py-2.5 text-center text-sm text-muted-foreground">{o.commission_pct > 0 ? `${+((+o.commission_pct).toFixed(1))}%` : "-"}</td>
                      <td className="px-3 py-2.5 text-right text-sm text-muted-foreground">{commAmt > 0 ? fmtCurrency(commAmt) : "-"}</td>
                      <td className="px-3 py-2.5 text-right text-sm text-muted-foreground">{o.discount > 0 ? fmtCurrency(o.discount) : "-"}</td>
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
      {/* end desktop table */}

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
                        const cfg = platformConfigs.find((c) => c.platform === v);
                        setForm((f) => ({
                          ...f,
                          platform: v as OTAPlatform,
                          gross_price: price > 0 ? price : f.gross_price,
                          commission_pct: cfg !== undefined ? cfg.commission_pct : f.commission_pct,
                        }));
                      }}
                      options={platformConfigs.map((c) => ({ value: c.platform, label: c.platform, group: "Platforms" }))}
                      placeholder="Select platform"
                      searchPlaceholder="Search platform..."
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

                {/* Row 7: Gross Price | Commission (with % / ฿ toggle) */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Gross Price <span className="text-red-500">*</span></label>
                    <input type="number" min={0} step="0.01"
                      value={form.gross_price === 0 ? "" : form.gross_price}
                      placeholder="0.00"
                      onChange={(e) => {
                        const g = parseFloat(e.target.value) || 0;
                        // ถ้าอยู่ใน ฿ mode ให้ sync pct จาก amt เดิม
                        if (commissionMode === "amt") {
                          const pct = g > 0 ? +(commissionAmtDirect / g * 100).toFixed(4) : 0;
                          setForm((f) => ({ ...f, gross_price: g, commission_pct: pct }));
                        } else {
                          setForm((f) => ({ ...f, gross_price: g }));
                        }
                      }}
                      className={inputCls} />
                  </div>
                  <div>
                    {/* Label + toggle pill */}
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-foreground/70">
                        {commissionMode === "pct" ? "Commission %" : "Commission (฿)"}
                        <span className="text-red-500"> *</span>
                      </label>
                      <div className="flex rounded border border-border overflow-hidden text-[10px] font-semibold">
                        <button type="button"
                          onClick={() => setCommissionMode("pct")}
                          className={`px-2 py-0.5 transition-colors ${commissionMode === "pct" ? "bg-purple-600 text-white" : "text-muted-foreground hover:bg-muted"}`}>
                          %
                        </button>
                        <button type="button"
                          onClick={() => {
                            // convert current pct → amt when switching to ฿ mode
                            setCommissionAmtDirect(+(form.gross_price * form.commission_pct / 100).toFixed(2));
                            setCommissionMode("amt");
                          }}
                          className={`px-2 py-0.5 transition-colors ${commissionMode === "amt" ? "bg-purple-600 text-white" : "text-muted-foreground hover:bg-muted"}`}>
                          ฿
                        </button>
                      </div>
                    </div>
                    {commissionMode === "pct" ? (
                      <input type="number" min={0} max={100} step="0.1"
                        value={form.commission_pct === 0 ? "" : form.commission_pct}
                        onChange={(e) => setForm((f) => ({ ...f, commission_pct: parseFloat(e.target.value) || 0 }))}
                        placeholder="e.g. 15" className={inputCls} />
                    ) : (
                      <input type="number" min={0} step="0.01"
                        value={commissionAmtDirect === 0 ? "" : commissionAmtDirect}
                        onChange={(e) => {
                          const amt = parseFloat(e.target.value) || 0;
                          setCommissionAmtDirect(amt);
                          const pct = form.gross_price > 0 ? +(amt / form.gross_price * 100).toFixed(4) : 0;
                          setForm((f) => ({ ...f, commission_pct: pct }));
                        }}
                        placeholder="e.g. 500" className={inputCls} />
                    )}
                  </div>
                </div>

                {/* Row 8: Commission (readonly opposite value) | Discount */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    {commissionMode === "pct" ? (
                      <>
                        <label className={labelCls}>Commission Amount (คำนวณ)</label>
                        <input readOnly value={commissionAmt.toFixed(2)}
                          className={`${inputCls} bg-muted/50 cursor-default text-muted-foreground`} />
                      </>
                    ) : (
                      <>
                        <label className={labelCls}>Commission % (คำนวณ)</label>
                        <input readOnly value={`${form.commission_pct.toFixed(2)} %`}
                          className={`${inputCls} bg-muted/50 cursor-default text-muted-foreground`} />
                      </>
                    )}
                  </div>
                  <div>
                    <label className={labelCls}>Discount</label>
                    <input type="number" min={0} step="0.01"
                      value={form.discount === 0 ? "" : form.discount}
                      placeholder="0"
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
              <div className="flex gap-3">
                <div className="flex-1 bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-green-600">{importStats.inserted}</div>
                  <div className="text-xs text-green-600/80">เพิ่มใหม่</div>
                </div>
                <div className="flex-1 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600">{importStats.updated}</div>
                  <div className="text-xs text-blue-600/80">อัปเดต</div>
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
