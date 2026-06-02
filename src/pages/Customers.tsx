import { useMemo, useState } from "react";
import { fmtDate } from "@/lib/dateUtils";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Pencil, Phone, MessageCircle, ArrowRightLeft, Lock, Inbox, Mail, MapPin, Megaphone, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCRM, formatTHB, tierBadge, SOURCES, type Customer, type SalesRep, type Tier, type Source } from "@/store/crmStore";
import { useCurrentUser, useActiveSalesNames } from "@/store/authStore";
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
  { key: "birthday",     header: "วันเกิด (YYYY-MM-DD)",  example: "1990-05-20" },
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
  const { addRequest } = useDeleteRequests();
  const SALES_REPS = useActiveSalesNames() as SalesRep[];
  const isMarketing = user?.role === "Marketing" || user?.role === "Admin";
  const [q, setQ] = useState("");
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

  const scoped = useMemo(
    () => (currentRep === "All"
      ? customers
      : customers.filter((c) => c.created_by === currentRep || c.transferred_from === currentRep || c.transferred_to === currentRep)),
    [customers, currentRep],
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
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
  }, [scoped, q, filterTier, filterSource, filterDateRange, sortBy]);

  const resetFilters = () => {
    setFilterTier("all");
    setFilterSource("all");
    setFilterDateRange("all");
    setSortBy("newest");
    setQ("");
  };
  const hasActiveFilter = filterTier !== "all" || filterSource !== "all" || filterDateRange !== "all" || q !== "";

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

      <div className="bg-card rounded-xl border shadow-soft p-4 space-y-3">
        <div className="relative max-w-xl">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่อ, เบอร์โทร, องค์กร, Line ID, อีเมล, ชื่อ Sales..." className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={filterDateRange} onValueChange={(v) => setFilterDateRange(v as any)}>
            <SelectTrigger className="w-44 h-9"><SelectValue placeholder="ช่วงวันที่เพิ่ม" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกช่วงเวลา</SelectItem>
              <SelectItem value="7d">7 วันล่าสุด</SelectItem>
              <SelectItem value="30d">30 วันล่าสุด</SelectItem>
              <SelectItem value="90d">90 วันล่าสุด</SelectItem>
              <SelectItem value="365d">1 ปีล่าสุด</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterTier} onValueChange={(v) => setFilterTier(v as any)}>
            <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Tier" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุก Tier</SelectItem>
              <SelectItem value="VIP">VIP</SelectItem>
              <SelectItem value="Regular">Regular</SelectItem>
              <SelectItem value="New">New</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterSource} onValueChange={(v) => setFilterSource(v as any)}>
            <SelectTrigger className="w-44 h-9"><SelectValue placeholder="ช่องทาง" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกช่องทาง</SelectItem>
              {SOURCES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="w-44 h-9"><SelectValue placeholder="เรียงตาม" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">ใหม่ → เก่า</SelectItem>
              <SelectItem value="oldest">เก่า → ใหม่</SelectItem>
              <SelectItem value="spend_desc">ยอดซื้อมาก → น้อย</SelectItem>
              <SelectItem value="spend_asc">ยอดซื้อน้อย → มาก</SelectItem>
              <SelectItem value="name">ชื่อ ก-ฮ</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilter && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="h-9 text-muted-foreground">
              ล้างตัวกรอง
            </Button>
          )}
          <span className="ml-auto text-xs text-muted-foreground">{filtered.length} รายการ</span>
        </div>
      </div>

      {/* Mobile: Card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:hidden">
        {filtered.length === 0 && (
          <div className="col-span-full p-8 text-center text-muted-foreground bg-card border rounded-xl">ไม่พบข้อมูลลูกค้า</div>
        )}
        {filtered.map((c) => (
          <div
            key={c.customer_id}
            className="bg-card border rounded-xl p-4 shadow-soft space-y-2 cursor-pointer hover:border-primary/40 transition"
            onClick={() => navigate(`/app/customers/${c.customer_id}`)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate">{c.full_name}</p>
                <p className="text-xs text-muted-foreground truncate">{c.company !== "-" ? c.company : "B2C"}{c.province ? ` · ${c.province}` : ""}</p>
              </div>
              <Badge variant="outline" className={`${tierBadge(c.customer_tier)} shrink-0`}>{c.customer_tier}</Badge>
            </div>
            {/* Interest tags */}
            {(c.interests ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1">
                {c.interests!.map((key) => {
                  const style = INTEREST_STYLE[key];
                  if (!style) return null;
                  return <span key={key} className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${style.className}`}>{style.label}</span>;
                })}
              </div>
            )}
            <div className="grid grid-cols-2 gap-1 text-xs">
              <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 text-primary hover:underline"><Phone className="w-3 h-3" /> {c.phone}</a>
              <span className="flex items-center gap-1.5 text-success truncate"><MessageCircle className="w-3 h-3 shrink-0" /> {c.line_id || "—"}</span>
              {c.email && <span className="col-span-2 flex items-center gap-1.5 text-muted-foreground truncate"><Mail className="w-3 h-3 shrink-0" />{c.email}</span>}
              <span className="text-muted-foreground"><b className="text-foreground">{c.source}</b> · {c.segment}</span>
              <span className="text-right font-bold text-primary">{formatTHB(c.total_spend)}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-accent/10 text-accent border border-accent/30">
                <span className="w-4 h-4 rounded-full bg-gradient-pink text-white flex items-center justify-center text-[9px] font-bold">{c.created_by[0]}</span>
                {c.created_by}
              </span>
              <div className="flex gap-1">
                {c.transferred_from === currentRep && c.transferred_to ? (
                  <span title="โอนแล้ว" className="text-muted-foreground p-2"><Lock className="w-4 h-4" /></span>
                ) : (
                  <>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setEditing(c); }}><Pencil className="w-4 h-4 text-primary" /></Button>
                    {currentRep !== "All" && c.created_by === currentRep && (
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setTransferOf(c); setTransferTo(""); }}>
                        <ArrowRightLeft className="w-4 h-4 text-amber-600" />
                      </Button>
                    )}
                    {currentRep !== "All" && (
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setDeleteOf(c); setDeleteReason(""); }}>
                        <Trash2 className="w-4 h-4 text-destructive/70" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
            {c.created_at && (
              <p className="text-[10px] text-muted-foreground">เพิ่มเมื่อ {new Date(c.created_at).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short", hour12: false })}</p>
            )}
          </div>
        ))}
      </div>

      {/* Desktop: Table */}
      <div className="hidden md:block bg-card rounded-xl border shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left p-3 font-medium">ชื่อลูกค้า / องค์กร</th>
                <th className="text-left p-3 font-medium">ติดต่อ</th>
                <th className="text-left p-3 font-medium">บริการที่สนใจ</th>
                <th className="text-left p-3 font-medium">ช่องทาง / กลุ่ม</th>
                <th className="text-left p-3 font-medium">Tier</th>
                <th className="text-left p-3 font-medium">Sales</th>
                <th className="text-right p-3 font-medium">ยอดซื้อ</th>
                <th className="p-3 font-medium w-24">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((c) => (
                <tr
                  key={c.customer_id}
                  className="hover:bg-muted/30 transition cursor-pointer"
                  onClick={() => navigate(`/app/customers/${c.customer_id}`)}
                >
                  {/* ชื่อ / องค์กร / จังหวัด */}
                  <td className="p-3 max-w-[200px]">
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
                  </td>
                  {/* ติดต่อ */}
                  <td className="p-3">
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
                  <td className="p-3">
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
                  <td className="p-3">
                    <div className="text-sm">{c.source}</div>
                    <div className="text-xs text-muted-foreground">{c.segment}</div>
                  </td>
                  <td className="p-3"><Badge variant="outline" className={tierBadge(c.customer_tier)}>{c.customer_tier}</Badge></td>
                  <td className="p-3">
                    <div className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-accent/10 text-accent border border-accent/30">
                      <span className="w-5 h-5 rounded-full bg-gradient-pink text-accent-foreground flex items-center justify-center text-[10px] font-bold">{c.created_by[0]}</span>
                      <span className="font-semibold">{c.created_by}</span>
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <div className="font-semibold">{formatTHB(c.total_spend)}</div>
                    <div className="text-xs text-muted-foreground">{c.total_trips} ทริป</div>
                  </td>
                  <td className="p-3 text-center">
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
                          {currentRep !== "All" && (
                            <Button size="icon" variant="ghost" title="ขอลบลูกค้า" onClick={(e) => { e.stopPropagation(); setDeleteOf(c); setDeleteReason(""); }}>
                              <Trash2 className="w-4 h-4 text-destructive/70 hover:text-destructive" />
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
              <Trash2 className="w-5 h-5" /> ขอลบลูกค้า
            </DialogTitle>
          </DialogHeader>
          {deleteOf && (
            <div className="space-y-4">
              <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3 space-y-1">
                <p className="text-sm font-semibold">{deleteOf.full_name}</p>
                {deleteOf.company !== "-" && <p className="text-xs text-muted-foreground">{deleteOf.company}</p>}
                <p className="text-xs text-muted-foreground">{deleteOf.phone}</p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                ⚠️ คำขอลบจะถูกส่งให้ <strong>Sales Manager</strong> พิจารณา
                ข้อมูลจะยังคงอยู่จนกว่า Manager จะอนุมัติ
              </p>
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
                await addRequest({
                  customer_id: deleteOf.customer_id,
                  customer_name: deleteOf.full_name,
                  requested_by: user.full_name,
                  reason: deleteReason.trim() || undefined,
                });
                setDeleteOf(null);
              }}
            >
              <Trash2 className="w-4 h-4 mr-1.5" /> ส่งคำขอให้ Manager
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
