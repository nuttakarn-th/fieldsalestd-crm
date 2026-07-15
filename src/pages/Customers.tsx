import { useEffect, useMemo, useState } from "react";
import { fmtDate } from "@/lib/dateUtils";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Pencil, Phone, MessageCircle, ArrowRightLeft, Lock, Inbox, Mail, MapPin, Megaphone, Trash2, Clock, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCRM, formatTHB, tierBadge, SOURCES, type Customer, type SalesRep, type Tier, type Source } from "@/store/crmStore";
import { useCurrentUser, useActiveSalesNames, useActiveOBNames } from "@/store/authStore";
import { useDeleteRequests } from "@/store/deleteRequestStore";
import { Textarea } from "@/components/ui/textarea";
import { CustomerLeadDialog } from "@/components/CustomerLeadDialog";
import { EditCustomerDialog } from "@/components/EditCustomerDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ImportExportMenu } from "@/components/ImportExportMenu";
import type { ExcelField } from "@/lib/excelUtils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const CUSTOMER_FIELDS: ExcelField[] = [
  // ── ข้อมูลพื้นฐาน ──────────────────────────────────────────
  { key: "full_name",    header: "ชื่อ-นามสกุล",        example: "สมชาย ใจดี",              required: true },
  { key: "company",      header: "องค์กร/บริษัท",        example: "บริษัท ABC จำกัด" },
  { key: "phone",        header: "เบอร์โทรศัพท์",        example: "0812345678",              required: true },
  { key: "line_id",      header: "Line ID",               example: "somchai_line" },
  { key: "email",        header: "อีเมล",                 example: "somchai@email.com" },
  // ── ข้อมูลการตลาด ──────────────────────────────────────────
  { key: "birthday",     header: "วันเกิด (DD-MM-YYYY)",  example: "20-05-1990", type: "date" as const },
  { key: "province",     header: "จังหวัด",               example: "กรุงเทพฯ" },
  { key: "interests",    header: "ความสนใจ (คั่นด้วย ,)", example: "ทัวร์ต่างประเทศ,ครอบครัว" },
  { key: "group_type",   header: "ประเภทกลุ่ม",           example: "ครอบครัว" },
  { key: "budget_range", header: "งบประมาณ",              example: "30,000-60,000" },
  // ── ข้อมูลการขาย ────────────────────────────────────────────
  { key: "source",       header: "ช่องทาง",               example: "FB" },
  { key: "segment",      header: "กลุ่มลูกค้า",           example: "B2C Individual" },
  { key: "created_by",   header: "Sales ที่ดูแล",         example: "เฟิร์ส" },
  { key: "note",         header: "บันทึก",                example: "พบที่งาน Travel Expo สนใจทัวร์ญี่ปุ่น" },
];

// interest key → short label + color
const INTEREST_STYLE: Record<string, { label: string; className: string }> = {
  "ทัวร์ต่างประเทศ":  { label: "✈️ Intl",   className: "bg-blue-100 text-blue-700 border-blue-200" },
  "ทัวร์ภายในประเทศ": { label: "🏔️ Dom",    className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  "เช่ารถ ท่องเที่ยว":{ label: "🚗 รถ",     className: "bg-amber-100 text-amber-700 border-amber-200" },
  "จองตั๋วเครื่องบิน":{ label: "🎫 ตั๋ว",   className: "bg-sky-100 text-sky-700 border-sky-200" },
  "โรงแรม":           { label: "🏨 Hotel",  className: "bg-purple-100 text-purple-700 border-purple-200" },
  "Visa":             { label: "📋 Visa",   className: "bg-rose-100 text-rose-700 border-rose-200" },
  "ประกันการเดินทาง": { label: "🛡️ ประกัน", className: "bg-orange-100 text-orange-700 border-orange-200" },
};

// ── Marketing Export helpers ──────────────────────────────────────────────────
function exportCSV(rows: string[][], filename: string) {
  const BOM = "﻿";
  const csv = BOM + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function exportLineList(customers: Customer[]) {
  const header = ["ชื่อ", "เบอร์โทร", "Line ID", "จังหวัด", "ความสนใจ", "กลุ่มลูกค้า"];
  const rows = customers.map((c) => [
    c.full_name, c.phone, c.line_id ?? "",
    c.province ?? "", (c.interests ?? []).join("|"), c.segment,
  ]);
  exportCSV([header, ...rows], `LINE_broadcast_list_${new Date().toISOString().split("T")[0]}.csv`);
  toast.success(`Export ${customers.length} รายการสำหรับ LINE OA แล้ว ✅`);
}

function exportFBList(customers: Customer[]) {
  // Facebook Custom Audience format
  const header = ["phone", "email", "fn", "ln", "ct", "country"];
  const rows = customers.map((c) => {
    const [fn, ...rest] = c.full_name.split(" ");
    return [
      c.phone.replace(/\D/g, ""),
      c.email ?? "",
      fn ?? "", rest.join(" "),
      c.province ?? "", "TH",
    ];
  });
  exportCSV([header, ...rows], `FB_custom_audience_${new Date().toISOString().split("T")[0]}.csv`);
  toast.success(`Export ${customers.length} รายการสำหรับ Facebook Custom Audience แล้ว ✅`);
}

export default function Customers() {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const customers = useCRM((s) => s.customers);
  const currentRep = useCRM((s) => s.currentRep);
  const transferCustomer = useCRM((s) => s.transferCustomer);
  const deleteCustomer = useCRM((s) => s.deleteCustomer);
  const addCustomer = useCRM((s) => s.addCustomer);
  const { requests: deleteRequests, loadRequests, addRequest } = useDeleteRequests();

  // โหลด delete requests เพื่อตรวจสอบสถานะ "รอลบ" ของลูกค้าแต่ละราย
  useEffect(() => { loadRequests(); }, [loadRequests]);

  // Set ของ customer_id ที่มี pending delete request อยู่ (ใช้ lookup O(1))
  const pendingDeleteIds = useMemo(
    () => new Set(deleteRequests.filter((r) => r.status === "pending").map((r) => r.customer_id)),
    [deleteRequests],
  );
  const SALES_REPS = useActiveSalesNames() as SalesRep[];
  const obNames = useActiveOBNames();
  const isMarketing = user?.role === "Marketing" || user?.role === "Admin";
  const isAdmin = user?.role === "Admin";
  const isSalesManager = user?.role === "Sales Manager";
  const isOBManager = user?.role === "OB Manager";
  const isOBRole = user?.role === "OB Co-ordinator" || isOBManager;
  const canDirectDelete = isAdmin || isSalesManager || isOBManager;
  const [q, setQ] = useState("");
  // debounce q 200ms — ป้องกัน filter 300+ รายการทุก keydown
  const [debouncedQ, setDebouncedQ] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 200);
    return () => clearTimeout(t);
  }, [q]);

  const [openAdd, setOpenAdd] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [transferOf, setTransferOf] = useState<Customer | null>(null);
  const [transferTo, setTransferTo] = useState<SalesRep | "">("");
  const [deleteOf, setDeleteOf] = useState<Customer | null>(null);
  const [deleteReason, setDeleteReason] = useState("");

  // Filters
  const [filterTier, setFilterTier] = useState<Tier | "all">("all");
  const [filterSource, setFilterSource] = useState<Source | "all">("all");
  const [filterDateRange, setFilterDateRange] = useState<"all" | "7d" | "30d" | "90d" | "365d">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "spend_desc" | "spend_asc" | "name">("newest");
  const [showFilters, setShowFilters] = useState(false);
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(1);

  const scoped = useMemo(() => {
    // Guard: ถ้า currentRep = null/undefined (Supabase ยังโหลดชื่อไม่เสร็จ)
    // ให้ treat เป็น "All" เพื่อป้องกัน obSet.add(null) ที่ทำให้ filter คืน 0 records
    const effectiveRep = currentRep || "All";
    if (effectiveRep !== "All") {
      if (isOBRole) {
        // OB Co-ordinator: เห็นของตัวเอง + OB pool ทั้งแผนก
        // obSet รวมชื่อตัวเองเสมอ (กันกรณี obNames ยังโหลดไม่ครบ)
        const obSet = new Set(obNames);
        obSet.add(effectiveRep);
        return customers.filter((c) =>
          obSet.has(c.created_by) ||
          (c.transferred_to != null && obSet.has(c.transferred_to)) ||
          (c.transferred_from != null && obSet.has(c.transferred_from)),
        );
      }
      // Sales — เห็นเฉพาะของตัวเอง
      return customers.filter((c) =>
        c.created_by === effectiveRep ||
        c.transferred_from === effectiveRep ||
        c.transferred_to === effectiveRep,
      );
    }
    // currentRep === "All"
    if (isOBRole) {
      // OB Manager: เห็น OB pool เท่านั้น
      // ถ้า obNames ว่าง (ยังไม่มี OB Co-ord ในระบบ) → fallback เห็นทั้งหมด
      if (obNames.length === 0) return customers;
      const obSet = new Set(obNames);
      return customers.filter((c) =>
        obSet.has(c.created_by) ||
        (c.transferred_to != null && obSet.has(c.transferred_to)) ||
        (c.transferred_from != null && obSet.has(c.transferred_from)),
      );
    }
    // Admin, Sales Manager, Marketing → เห็นทั้งหมด
    return customers;
  }, [customers, currentRep, isOBRole, obNames]);

  const filtered = useMemo(() => {
    const s = debouncedQ.trim().toLowerCase();
    let list = scoped;

    // Search
    if (s) {
      list = list.filter((c) =>
        c.full_name.toLowerCase().includes(s) ||
        c.phone.includes(s) ||
        c.company.toLowerCase().includes(s) ||
        c.line_id.toLowerCase().includes(s) ||
        c.created_by.toLowerCase().includes(s) ||
        (c.email ?? "").toLowerCase().includes(s) ||
        (c.province ?? "").toLowerCase().includes(s) ||
        (c.note ?? "").toLowerCase().includes(s),
      );
    }

    // Tier filter
    if (filterTier !== "all") list = list.filter((c) => c.customer_tier === filterTier);

    // Source filter
    if (filterSource !== "all") list = list.filter((c) => c.source === filterSource);

    // Date range filter (created_at)
    if (filterDateRange !== "all") {
      const days = { "7d": 7, "30d": 30, "90d": 90, "365d": 365 }[filterDateRange];
      const threshold = Date.now() - days * 24 * 60 * 60 * 1000;
      list = list.filter((c) => c.created_at && new Date(c.created_at).getTime() >= threshold);
    }

    // Sort
    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return (new Date(b.created_at ?? 0).getTime()) - (new Date(a.created_at ?? 0).getTime());
        case "oldest":
          return (new Date(a.created_at ?? 0).getTime()) - (new Date(b.created_at ?? 0).getTime());
        case "spend_desc":
          return b.total_spend - a.total_spend;
        case "spend_asc":
          return a.total_spend - b.total_spend;
        case "name":
          return a.full_name.localeCompare(b.full_name, "th");
      }
    });
    return sorted;
  }, [scoped, debouncedQ, filterTier, filterSource, filterDateRange, sortBy]);

  // Reset to page 1 whenever filter/search changes (ใช้ debouncedQ ไม่ใช่ q ดิบ)
  useEffect(() => { setPage(1); }, [debouncedQ, filterTier, filterSource, filterDateRange, sortBy]);

  const resetFilters = () => {
    setFilterTier("all");
    setFilterSource("all");
    setFilterDateRange("all");
    setSortBy("newest");
    setQ("");
  };
  const hasActiveFilter = filterTier !== "all" || filterSource !== "all" || filterDateRange !== "all" || q !== "";
  const activeFilterCount = [filterTier !== "all", filterSource !== "all", filterDateRange !== "all"].filter(Boolean).length;
  const DATE_LABELS: Record<string, string> = { "7d": "7 วัน", "30d": "30 วัน", "90d": "90 วัน", "365d": "1 ปี" };

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedCustomers = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Build export-ready records from filtered customers
  const exportData = useMemo(() =>
    filtered.map((c) => ({
      full_name: c.full_name,
      company: c.company,
      phone: c.phone,
      line_id: c.line_id,
      email: c.email ?? "",
      province: c.province ?? "",
      source: c.source,
      segment: c.segment,
    })),
    [filtered],
  );

  const handleImport = (rows: Record<string, unknown>[]) => {
    rows.forEach((row) => {
      // แปลง interests: รับทั้ง string คั่นด้วย , หรือ array
      const rawInterests = row.interests;
      const interests: string[] = rawInterests
        ? (typeof rawInterests === "string"
            ? rawInterests.split(",").map((s) => s.trim()).filter(Boolean)
            : Array.isArray(rawInterests) ? rawInterests : [])
        : [];

      addCustomer({
        full_name:    String(row.full_name    ?? ""),
        company:      String(row.company      ?? "-"),
        phone:        String(row.phone        ?? ""),
        line_id:      String(row.line_id      ?? "-"),
        email:        row.email      ? String(row.email)      : undefined,
        birthday:     row.birthday   ? String(row.birthday)   : undefined,
        province:     row.province   ? String(row.province)   : undefined,
        interests:    interests.length > 0 ? interests : undefined,
        note:         row.note       ? String(row.note)       : undefined,
        source:       (row.source    as Source) || "Field Sale",
        segment:      (row.segment   as any)    || "B2C Individual",
        created_by:   (row.created_by as any)   || "เฟิร์ส",
      } as any);
    });
    toast.success(`นำเข้า ${rows.length} ลูกค้าแล้ว`);
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">ฐานข้อมูลลูกค้า</h1>
          <p className="text-sm text-muted-foreground">
            {currentRep === "All" ? "จัดการข้อมูลลูกค้าทั้งทีม" : `ฐานข้อมูลลูกค้าของ ${currentRep}`} — {filtered.length} รายการ
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <ImportExportMenu
            fields={CUSTOMER_FIELDS}
            sheetName="ลูกค้า"
            filename="customers"
            data={exportData}
            onImport={handleImport}
          />
          {/* Marketing Export — LINE & Facebook */}
          {isMarketing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-50 gap-1.5">
                  <Megaphone className="w-4 h-4" />
                  <span className="hidden sm:inline">Marketing Export</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Export สำหรับแคมเปญ ({filtered.length} คน)
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => exportLineList(filtered)} className="gap-2 cursor-pointer">
                  <span className="text-base">💬</span>
                  <div>
                    <p className="font-semibold text-sm">LINE OA Broadcast List</p>
                    <p className="text-xs text-muted-foreground">ชื่อ + เบอร์ + Line ID + ความสนใจ</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportFBList(filtered)} className="gap-2 cursor-pointer">
                  <span className="text-base">📱</span>
                  <div>
                    <p className="font-semibold text-sm">Facebook Custom Audience</p>
                    <p className="text-xs text-muted-foreground">Phone + Email + ชื่อ + จังหวัด (FB format)</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="px-3 py-1.5 text-[11px] text-muted-foreground">
                  💡 ใช้ Filter ก่อน Export เพื่อเลือกกลุ่มเป้าหมาย
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button className="bg-gradient-primary" onClick={() => setOpenAdd(true)}><Plus className="w-4 h-4 mr-2" /> เพิ่มลูกค้า / สร้าง Lead</Button>
        </div>
      </div>

      <div className="bg-card rounded-xl border shadow-soft p-3 space-y-2">
        {/* Row 1: Search + Filter toggle + Sort */}
        <div className="flex gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่อ, เบอร์โทร, องค์กร..." className="pl-9 h-10" />
          </div>
          <Button
            variant={activeFilterCount > 0 ? "default" : "outline"}
            className={`shrink-0 gap-1.5 h-10 ${activeFilterCount > 0 ? "bg-gradient-primary" : ""}`}
            onClick={() => setShowFilters((v) => !v)}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline text-sm">กรอง</span>
            {activeFilterCount > 0 && (
              <span className="bg-white/90 text-primary rounded-full w-4 h-4 text-[10px] font-bold flex items-center justify-center leading-none">
                {activeFilterCount}
              </span>
            )}
          </Button>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="w-[120px] sm:w-[140px] h-10 shrink-0 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">ใหม่ → เก่า</SelectItem>
              <SelectItem value="oldest">เก่า → ใหม่</SelectItem>
              <SelectItem value="spend_desc">ยอดมาก → น้อย</SelectItem>
              <SelectItem value="spend_asc">ยอดน้อย → มาก</SelectItem>
              <SelectItem value="name">ชื่อ ก-ฮ</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Active filter chips (when filters active and panel closed) */}
        {activeFilterCount > 0 && !showFilters && (
          <div className="flex gap-1.5 flex-wrap items-center">
            {filterDateRange !== "all" && (
              <button
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs border border-primary/20 hover:bg-primary/20 transition"
                onClick={() => setFilterDateRange("all")}
              >
                {DATE_LABELS[filterDateRange]}
                <X className="w-3 h-3" />
              </button>
            )}
            {filterTier !== "all" && (
              <button
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs border border-primary/20 hover:bg-primary/20 transition"
                onClick={() => setFilterTier("all")}
              >
                {filterTier} <X className="w-3 h-3" />
              </button>
            )}
            {filterSource !== "all" && (
              <button
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs border border-primary/20 hover:bg-primary/20 transition"
                onClick={() => setFilterSource("all")}
              >
                {filterSource} <X className="w-3 h-3" />
              </button>
            )}
            <button
              className="text-xs text-muted-foreground hover:text-destructive transition ml-auto"
              onClick={resetFilters}
            >
              ล้างทั้งหมด
            </button>
          </div>
        )}

        {/* Expandable filter panel */}
        {showFilters && (
          <div className="grid grid-cols-2 gap-2 pt-2 border-t">
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground font-medium">ช่วงเวลาเพิ่ม</label>
              <Select value={filterDateRange} onValueChange={(v) => setFilterDateRange(v as any)}>
                <SelectTrigger className="h-9 w-full text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกช่วงเวลา</SelectItem>
                  <SelectItem value="7d">7 วันล่าสุด</SelectItem>
                  <SelectItem value="30d">30 วันล่าสุด</SelectItem>
                  <SelectItem value="90d">90 วันล่าสุด</SelectItem>
                  <SelectItem value="365d">1 ปีล่าสุด</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground font-medium">Tier</label>
              <Select value={filterTier} onValueChange={(v) => setFilterTier(v as any)}>
                <SelectTrigger className="h-9 w-full text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุก Tier</SelectItem>
                  <SelectItem value="VIP">VIP</SelectItem>
                  <SelectItem value="Regular">Regular</SelectItem>
                  <SelectItem value="New">New</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground font-medium">ช่องทาง</label>
              <Select value={filterSource} onValueChange={(v) => setFilterSource(v as any)}>
                <SelectTrigger className="h-9 w-full text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกช่องทาง</SelectItem>
                  {SOURCES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="ghost" size="sm"
                onClick={() => { resetFilters(); setShowFilters(false); }}
                className="w-full h-9 text-xs text-muted-foreground hover:text-destructive"
              >
                ล้างตัวกรอง
              </Button>
            </div>
          </div>
        )}

        {/* Count row */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{filtered.length} รายการ · หน้า {page}/{totalPages}</span>
          {hasActiveFilter && !showFilters && activeFilterCount === 0 && (
            <button onClick={resetFilters} className="text-destructive/70 hover:text-destructive transition">
              ล้างการค้นหา
            </button>
          )}
        </div>
      </div>

      {/* Mobile: Compact list */}
      <div className="flex flex-col md:hidden bg-card border rounded-xl shadow-soft overflow-hidden divide-y">
        {filtered.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">ไม่พบข้อมูลลูกค้า</div>
        )}
        {pagedCustomers.map((c) => (
          <div
            key={c.customer_id}
            className="flex items-center gap-3 px-3 py-2 hover:bg-muted/40 transition cursor-pointer active:bg-muted/60"
            onClick={() => navigate(`/app/customers/${c.customer_id}`)}
          >
            {/* Avatar circle */}
            <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center shrink-0 text-white font-bold text-sm">
              {c.full_name.charAt(0)}
            </div>

            {/* Main info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm truncate">{c.full_name}</span>
                <Badge variant="outline" className={`${tierBadge(c.customer_tier)} shrink-0 text-[10px] px-1.5 py-0`}>{c.customer_tier}</Badge>
                {pendingDeleteIds.has(c.customer_id) && (
                  <Clock className="w-3 h-3 text-amber-500 shrink-0" title="รอ Manager อนุมัติลบ" />
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                {c.phone && c.phone !== "-" && (
                  <a href={`tel:${c.phone}`} className="flex items-center gap-1 text-primary" onClick={(e) => e.stopPropagation()}>
                    <Phone className="w-3 h-3" />{c.phone}
                  </a>
                )}
                {c.line_id && (
                  <span className="flex items-center gap-1 text-success truncate">
                    <MessageCircle className="w-3 h-3 shrink-0" />{c.line_id}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">
                  <span className="w-3 h-3 rounded-full bg-gradient-pink text-white flex items-center justify-center text-[8px] font-bold">{c.created_by[0]}</span>
                  {c.created_by}
                </span>
                {c.source && <span className="text-[10px] text-muted-foreground">{c.source}</span>}
                {c.total_spend > 0 && <span className="text-[10px] font-semibold text-primary ml-auto">฿{formatTHB(c.total_spend)}</span>}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
              {c.transferred_from === currentRep && c.transferred_to ? (
                <span className="text-muted-foreground p-1.5"><Lock className="w-4 h-4" /></span>
              ) : (
                <>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(c)}>
                    <Pencil className="w-3.5 h-3.5 text-primary" />
                  </Button>
                  {currentRep !== "All" && c.created_by === currentRep && (
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setTransferOf(c); setTransferTo(""); }}>
                      <ArrowRightLeft className="w-3.5 h-3.5 text-amber-600" />
                    </Button>
                  )}
                  {currentRep !== "All" && !canDirectDelete && (
                    pendingDeleteIds.has(c.customer_id) ? (
                      <span className="h-8 w-8 flex items-center justify-center text-amber-500">
                        <Clock className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setDeleteOf(c); setDeleteReason(""); }}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive/70" />
                      </Button>
                    )
                  )}
                  {canDirectDelete && (
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setDeleteOf(c); setDeleteReason(""); }}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: Table */}
      <div className="hidden md:block bg-card rounded-xl border shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left py-2 px-3 font-medium">ชื่อลูกค้า / องค์กร</th>
                <th className="text-left py-2 px-3 font-medium">ติดต่อ</th>
                <th className="text-left py-2 px-3 font-medium">บริการที่สนใจ</th>
                <th className="text-left py-2 px-3 font-medium">ช่องทาง / กลุ่ม</th>
                <th className="text-left py-2 px-3 font-medium">Tier</th>
                <th className="text-left py-2 px-3 font-medium">Sales</th>
                <th className="text-right py-2 px-3 font-medium">ยอดซื้อ</th>
                <th className="py-2 px-3 font-medium w-24">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {pagedCustomers.map((c) => (
                <tr
                  key={c.customer_id}
                  className="hover:bg-muted/30 transition cursor-pointer"
                  onClick={() => navigate(`/app/customers/${c.customer_id}`)}
                >
                  {/* ชื่อ / องค์กร / จังหวัด */}
                  <td className="py-1.5 px-3 max-w-[200px]">
                    <div className="font-semibold truncate">{c.full_name}</div>
                    <div className="text-xs text-muted-foreground truncate">{c.company !== "-" ? c.company : "B2C"}</div>
                    {c.province && (
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                        <MapPin className="w-2.5 h-2.5" />{c.province}
                      </div>
                    )}
                    {c.transferred_from === currentRep && c.transferred_to && (
                      <div className="mt-1 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-300">
                        <ArrowRightLeft className="w-2.5 h-2.5" /> โอน → {c.transferred_to}
                      </div>
                    )}
                    {c.transferred_to === currentRep && c.transferred_from && c.transferred_from !== currentRep && (
                      <div className="mt-1 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-300">
                        <Inbox className="w-2.5 h-2.5" /> รับโอนจาก {c.transferred_from}
                      </div>
                    )}
                    {c.last_contacted_at && (
                      <div className="mt-0.5 text-[10px] text-muted-foreground">
                        ติดต่อล่าสุด {fmtDate(c.last_contacted_at)}
                      </div>
                    )}
                    {c.note && (
                      <div className="mt-0.5 text-[10px] text-muted-foreground italic truncate max-w-[180px]" title={c.note}>
                        📝 {c.note}
                      </div>
                    )}
                    {pendingDeleteIds.has(c.customer_id) && (
                      <div className="mt-1 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-300 font-medium">
                        <Clock className="w-2.5 h-2.5" /> รอ Manager อนุมัติลบ
                      </div>
                    )}
                  </td>
                  {/* ติดต่อ */}
                  <td className="py-1.5 px-3">
                    <div className="flex items-center gap-1.5 text-xs"><Phone className="w-3 h-3 text-primary" /> {c.phone}</div>
                    <div className="flex items-center gap-1.5 text-xs text-success mt-0.5"><MessageCircle className="w-3 h-3" /> {c.line_id || "—"}</div>
                    {c.email && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                        <Mail className="w-3 h-3" />
                        <span className="truncate max-w-[130px]">{c.email}</span>
                      </div>
                    )}
                  </td>
                  {/* บริการที่สนใจ */}
                  <td className="py-1.5 px-3">
                    <div className="flex flex-wrap gap-1">
                      {(c.interests ?? []).length > 0
                        ? (c.interests!).map((key) => {
                            const style = INTEREST_STYLE[key];
                            if (!style) return null;
                            return (
                              <span key={key} className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${style.className}`}>
                                {style.label}
                              </span>
                            );
                          })
                        : <span className="text-xs text-muted-foreground">—</span>
                      }
                    </div>
                  </td>
                  {/* ช่องทาง */}
                  <td className="py-1.5 px-3">
                    <div className="text-sm">{c.source}</div>
                    <div className="text-xs text-muted-foreground">{c.segment}</div>
                  </td>
                  <td className="py-1.5 px-3"><Badge variant="outline" className={tierBadge(c.customer_tier)}>{c.customer_tier}</Badge></td>
                  <td className="py-1.5 px-3">
                    <div className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-accent/10 text-accent border border-accent/30">
                      <span className="w-5 h-5 rounded-full bg-gradient-pink text-accent-foreground flex items-center justify-center text-[10px] font-bold">{c.created_by[0]}</span>
                      <span className="font-semibold">{c.created_by}</span>
                    </div>
                  </td>
                  <td className="py-1.5 px-3 text-right">
                    <div className="font-semibold">{formatTHB(c.total_spend)}</div>
                    <div className="text-xs text-muted-foreground">{c.total_trips} ทริป</div>
                  </td>
                  <td className="py-1.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {c.transferred_from === currentRep && c.transferred_to ? (
                        <span title="โอนแล้ว ไม่สามารถแก้ไขได้" className="inline-flex items-center text-muted-foreground">
                          <Lock className="w-4 h-4" />
                        </span>
                      ) : (
                        <>
                          <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditing(c); }} title="แก้ไข"><Pencil className="w-4 h-4 text-primary" /></Button>
                          {currentRep !== "All" && c.created_by === currentRep && (
                            <Button size="icon" variant="ghost" title="โอนลูกค้า" onClick={(e) => { e.stopPropagation(); setTransferOf(c); setTransferTo(""); }}>
                              <ArrowRightLeft className="w-4 h-4 text-amber-600" />
                            </Button>
                          )}
                          {currentRep !== "All" && !canDirectDelete && (
                            pendingDeleteIds.has(c.customer_id) ? (
                              <span title="รอ Manager อนุมัติลบอยู่" className="w-8 h-8 flex items-center justify-center text-amber-500">
                                <Clock className="w-4 h-4" />
                              </span>
                            ) : (
                              <Button size="icon" variant="ghost" title="ขอลบลูกค้า" onClick={(e) => { e.stopPropagation(); setDeleteOf(c); setDeleteReason(""); }}>
                                <Trash2 className="w-4 h-4 text-destructive/70 hover:text-destructive" />
                              </Button>
                            )
                          )}
                          {canDirectDelete && (
                            <Button size="icon" variant="ghost" title={isAdmin ? "ลบทันที (Admin)" : "ลบทันที (Sales Manager)"} onClick={(e) => { e.stopPropagation(); setDeleteOf(c); setDeleteReason(""); }}>
                              <Trash2 className="w-4 h-4 text-destructive hover:text-destructive" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="p-12 text-center text-muted-foreground">ไม่พบข้อมูลลูกค้า</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination bar — shared for both mobile & desktop */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-card border rounded-xl px-4 py-2.5 shadow-soft">
          <span className="text-xs text-muted-foreground">
            แสดง {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} จาก {filtered.length} รายการ
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline" size="sm" className="h-8 px-3 text-xs"
              disabled={page === 1}
              onClick={() => setPage(1)}
            >«</Button>
            <Button
              variant="outline" size="sm" className="h-8 px-3 text-xs"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >‹ ก่อน</Button>
            <span className="text-xs font-semibold px-3 py-1.5 bg-primary/10 text-primary rounded-lg border border-primary/20">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline" size="sm" className="h-8 px-3 text-xs"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >ถัดไป ›</Button>
            <Button
              variant="outline" size="sm" className="h-8 px-3 text-xs"
              disabled={page === totalPages}
              onClick={() => setPage(totalPages)}
            >»</Button>
          </div>
        </div>
      )}

      <CustomerLeadDialog open={openAdd} onOpenChange={setOpenAdd} />
      <EditCustomerDialog customer={editing} onClose={() => setEditing(null)} />

      <Dialog open={!!transferOf} onOpenChange={(o) => !o && setTransferOf(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>โอนลูกค้าให้ Sales คนอื่น</DialogTitle></DialogHeader>
          {transferOf && (
            <div className="space-y-3">
              <p className="text-sm">
                ลูกค้า: <b>{transferOf.full_name}</b>{transferOf.company !== "-" && ` · ${transferOf.company}`}
              </p>
              <p className="text-xs text-muted-foreground">
                หลังโอน ลูกค้านี้จะยังแสดงในระบบของคุณในสถานะ "โอนลูกค้า" และไม่สามารถแก้ไขข้อมูลได้
              </p>
              <div>
                <label className="text-xs font-semibold">เลือก Sales ปลายทาง</label>
                <Select value={transferTo} onValueChange={(v) => setTransferTo(v as SalesRep)}>
                  <SelectTrigger><SelectValue placeholder="เลือก Sales..." /></SelectTrigger>
                  <SelectContent>
                    {SALES_REPS.filter((r) => r !== transferOf.created_by).map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferOf(null)}>ยกเลิก</Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              disabled={!transferTo}
              onClick={() => {
                if (!transferOf || !transferTo) return;
                transferCustomer(transferOf.customer_id, transferTo as SalesRep);
                toast.success(`โอนลูกค้า ${transferOf.full_name} ให้ ${transferTo} แล้ว`);
                setTransferOf(null);
              }}
            >ยืนยันโอน</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Request Dialog ── */}
      <Dialog open={!!deleteOf} onOpenChange={(o) => !o && setDeleteOf(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              {isAdmin ? "ลบลูกค้า (Admin)" : isSalesManager ? "ลบลูกค้า (Sales Manager)" : isOBManager ? "ลบลูกค้า (OB Manager)" : "ขอลบลูกค้า"}
            </DialogTitle>
          </DialogHeader>
          {deleteOf && (
            <div className="space-y-4">
              <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3 space-y-1">
                <p className="text-sm font-semibold">{deleteOf.full_name}</p>
                {deleteOf.company !== "-" && <p className="text-xs text-muted-foreground">{deleteOf.company}</p>}
                <p className="text-xs text-muted-foreground">{deleteOf.phone}</p>
              </div>
              {canDirectDelete ? (
                <p className="text-xs text-destructive/80 leading-relaxed">
                  ⚠️ การลบโดย {isAdmin ? "Admin" : isSalesManager ? "Sales Manager" : "OB Manager"} จะ<strong>ลบทันทีถาวร</strong> ไม่สามารถกู้คืนได้
                </p>
              ) : (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  ⚠️ คำขอลบจะถูกส่งให้ <strong>{user?.role === "OB Co-ordinator" ? "OB Manager" : "Sales Manager"}</strong> พิจารณา
                  ข้อมูลจะยังคงอยู่จนกว่า Manager จะอนุมัติ
                </p>
              )}
              <div>
                <label className="text-xs font-semibold block mb-1.5">เหตุผลในการลบ <span className="text-muted-foreground font-normal">(ถ้ามี)</span></label>
                <Textarea
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="เช่น ลูกค้าซ้ำ / ข้อมูลผิด / ลูกค้าขอให้ลบออก..."
                  rows={3}
                  className="text-sm resize-none"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOf(null)}>ยกเลิก</Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!deleteOf || !user) return;
                if (canDirectDelete) {
                  // Admin / Sales Manager ลบตรงได้เลย ไม่ต้องผ่าน approval
                  deleteCustomer(deleteOf.customer_id);
                } else {
                  await addRequest({
                    customer_id: deleteOf.customer_id,
                    customer_name: deleteOf.full_name,
                    requested_by: user.full_name,
                    reason: deleteReason.trim() || undefined,
                    department: user.role === "OB Co-ordinator" ? "ob" : "sales",
                  });
                }
                setDeleteOf(null);
              }}
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              {canDirectDelete ? "ลบทันที" : "ส่งคำขอให้ Manager"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
