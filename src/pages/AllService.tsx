import React, { useMemo, useState, useEffect } from "react";
import { PackageSearch, Plus, Pencil, Trash2, Plane, Car, Hotel, FileBadge, Shield, MapPinned, Lock, Minus, ChevronDown, ChevronRight, CalendarDays, XCircle, AlertTriangle, FileUp, Globe, GlobeLock, FileX, Search, Save, X, SlidersHorizontal } from "lucide-react";
import { PageHelp } from "@/components/PageHelp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrentUser } from "@/store/authStore";
import { canEditServices } from "@/config/roleMenus";
import {
  useServices,
  CANCEL_REASONS,
  type TourCategory,
  type TourPeriod,
  type SeatMaterial,
  type VisaType,
} from "@/store/serviceStore";
import { toast } from "sonner";
import { ImportExportMenu } from "@/components/ImportExportMenu";
import type { ExcelField } from "@/lib/excelUtils";

const TOUR_CATS: TourCategory[] = ["International Tour", "Domestic", "Incentive"];
const SEAT_MATS: SeatMaterial[] = ["ไม่ระบุ", "หนัง", "ผ้า", "กำมะหยี่"];
const CATEGORY_TAGS = [
  "Adventure", "City Break", "Wellness", "กิน เที่ยว", "ครอบครัว",
  "ความงาม", "จีน", "ทะเล", "ธรรมชาติ", "ประวัติศาสตร์",
  "ประเพณีไทย", "ล่องเรือ", "สายมู", "เกาหลี", "โบราณ", "ไทย",
];
const VISA_TYPES: VisaType[] = ["TR", "TS", "Non-Immigrant", "O", "ED", "O-A", "O-X"];

// ── Quota Progress Bar (legacy tour ที่ไม่มี periods[]) ──
function QuotaBar({ quota, total_seats, canEdit, tourId }: { quota: number; total_seats: number; canEdit: boolean; tourId: string }) {
  const adjustQuota = useServices((s) => s.adjustQuota);
  const [adjusting, setAdjusting] = useState(false);
  const [delta, setDelta] = useState("");

  if (total_seats === 0) return <span className="text-xs text-muted-foreground">—</span>;

  const booked = total_seats - quota;
  const pct = Math.round((quota / total_seats) * 100);
  const barColor = quota === 0 ? "bg-destructive" : pct <= 20 ? "bg-amber-500" : "bg-success";

  return (
    <div className="min-w-[110px] space-y-0.5">
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span className="font-semibold text-foreground">ว่าง {quota}</span>
        <span>/{total_seats}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">จอง {booked} ที่</span>
        {quota === 0 && <span className="text-[10px] font-bold text-destructive">FULL</span>}
      </div>
      {canEdit && !adjusting && (
        <button className="text-[10px] text-primary hover:underline" onClick={() => setAdjusting(true)}>ปรับที่นั่ง ±</button>
      )}
      {canEdit && adjusting && (
        <div className="flex items-center gap-1 mt-1">
          <button className="w-5 h-5 rounded border text-xs flex items-center justify-center hover:bg-muted" onClick={() => adjustQuota(tourId, -1)}>
            <Minus className="w-3 h-3" />
          </button>
          <Input type="number" className="h-5 w-14 text-[10px] px-1" placeholder="±" value={delta} onChange={(e) => setDelta(e.target.value)} />
          <Button size="sm" className="h-5 text-[10px] px-2" onClick={() => {
            const d = parseInt(delta);
            if (!isNaN(d) && d !== 0) { adjustQuota(tourId, d); toast.success(`ปรับที่นั่ง ${d > 0 ? "+" : ""}${d} แล้ว`); }
            setDelta(""); setAdjusting(false);
          }}>ตกลง</Button>
          <Button size="sm" variant="ghost" className="h-5 text-[10px] px-1" onClick={() => { setDelta(""); setAdjusting(false); }}>✕</Button>
        </div>
      )}
    </div>
  );
}

// ── Period Quota Bar (inline สำหรับ period sub-table) ──
function PeriodQuotaBar({ quota, total_seats, canEdit, tourId, periodId }: {
  quota: number; total_seats: number; canEdit: boolean; tourId: string; periodId: string;
}) {
  const adjustPeriodQuota = useServices((s) => s.adjustPeriodQuota);
  const [adjusting, setAdjusting] = useState(false);
  const [delta, setDelta] = useState("");

  if (total_seats === 0) return <span className="text-xs text-muted-foreground">—</span>;
  const booked = total_seats - quota;
  const pct = Math.round((quota / total_seats) * 100);
  const barColor = quota === 0 ? "bg-destructive" : pct <= 20 ? "bg-amber-500" : "bg-success";

  return (
    <div className="min-w-[100px] space-y-0.5">
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span className="font-semibold text-foreground">ว่าง {quota}</span>
        <span>/{total_seats}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">จอง {booked}</span>
        {quota === 0 && <span className="text-[10px] font-bold text-destructive">FULL</span>}
      </div>
      {canEdit && !adjusting && (
        <button className="text-[10px] text-primary hover:underline" onClick={() => setAdjusting(true)}>ปรับ ±</button>
      )}
      {canEdit && adjusting && (
        <div className="flex items-center gap-1 mt-1">
          <button className="w-5 h-5 rounded border text-xs flex items-center justify-center hover:bg-muted"
            onClick={() => adjustPeriodQuota(tourId, periodId, -1)}>
            <Minus className="w-3 h-3" />
          </button>
          <Input type="number" className="h-5 w-12 text-[10px] px-1" placeholder="±" value={delta} onChange={(e) => setDelta(e.target.value)} />
          <Button size="sm" className="h-5 text-[10px] px-2" onClick={() => {
            const d = parseInt(delta);
            if (!isNaN(d) && d !== 0) { adjustPeriodQuota(tourId, periodId, d); toast.success(`ปรับ ${d > 0 ? "+" : ""}${d}`); }
            setDelta(""); setAdjusting(false);
          }}>OK</Button>
          <Button size="sm" variant="ghost" className="h-5 text-[10px] px-1" onClick={() => { setDelta(""); setAdjusting(false); }}>✕</Button>
        </div>
      )}
    </div>
  );
}

export default function AllService() {
  const user = useCurrentUser();
  const canEdit = user ? canEditServices(user.role) : false;
  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
          <PackageSearch className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-2xl font-bold">All Service</h1>
            <PageHelp pageKey="service-stock" defaultText="คลังข้อมูลบริการ — ทัวร์, รถเช่า, ตั๋ว, โรงแรม, วีซ่า, ประกัน · เพิ่ม/แก้ไขได้ตามสิทธิ์ Role" />
          </div>
          <p className="text-sm text-muted-foreground">
            คลังข้อมูลบริการของบริษัท · {canEdit ? "คุณมีสิทธิ์เพิ่ม/แก้ไขข้อมูล" : "คุณดูได้อย่างเดียว"}
          </p>
        </div>
        {!canEdit && (
          <Badge variant="outline" className="ml-auto border-warning/40 text-warning-foreground bg-warning/10">
            <Lock className="w-3 h-3 mr-1" /> Read Only
          </Badge>
        )}
      </div>

      <Tabs defaultValue="tour" className="space-y-4">
        <TabsList className="grid grid-cols-3 max-w-2xl">
          <TabsTrigger value="tour"><MapPinned className="w-4 h-4 mr-1" /> บริการทัวร์</TabsTrigger>
          <TabsTrigger value="car"><Car className="w-4 h-4 mr-1" /> บริการรถเช่า</TabsTrigger>
          <TabsTrigger value="booking"><Plane className="w-4 h-4 mr-1" /> บริการรับจอง</TabsTrigger>
        </TabsList>

        <TabsContent value="tour"><TourSection canEdit={canEdit} /></TabsContent>
        <TabsContent value="car"><CarSection canEdit={canEdit} /></TabsContent>
        <TabsContent value="booking"><BookingSection canEdit={canEdit} /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── Country → Continent lookup ─── */
const CONTINENT_MAP: Record<string, string> = {
  // เอเชียตะวันออก
  "จีน":"เอเชีย","ญี่ปุ่น":"เอเชีย","เกาหลีใต้":"เอเชีย","เกาหลี":"เอเชีย",
  "ไต้หวัน":"เอเชีย","ฮ่องกง":"เอเชีย","มองโกเลีย":"เอเชีย",
  // เอเชียตะวันออกเฉียงใต้
  "สิงคโปร์":"เอเชีย","มาเลเซีย":"เอเชีย","อินโดนีเซีย":"เอเชีย",
  "เวียดนาม":"เอเชีย","กัมพูชา":"เอเชีย","ลาว":"เอเชีย","พม่า":"เอเชีย",
  "เมียนมา":"เอเชีย","ฟิลิปปินส์":"เอเชีย","บรูไน":"เอเชีย","บาหลี":"เอเชีย",
  // เอเชียใต้
  "อินเดีย":"เอเชีย","เนปาล":"เอเชีย","ศรีลังกา":"เอเชีย","ภูฏาน":"เอเชีย","มัลดีฟส์":"เอเชีย",
  // เอเชียกลาง
  "คาซัคสถาน":"เอเชียกลาง","อุซเบกิสถาน":"เอเชียกลาง","คีร์กีซสถาน":"เอเชียกลาง",
  // ยุโรปตะวันตก
  "ฝรั่งเศส":"ยุโรป","สวิตเซอร์แลนด์":"ยุโรป","อิตาลี":"ยุโรป","เยอรมนี":"ยุโรป",
  "สเปน":"ยุโรป","อังกฤษ":"ยุโรป","สหราชอาณาจักร":"ยุโรป","ออสเตรีย":"ยุโรป",
  "เนเธอร์แลนด์":"ยุโรป","เบลเยียม":"ยุโรป","โปรตุเกส":"ยุโรป","กรีซ":"ยุโรป",
  "ตุรกี":"ยุโรป","สาธารณรัฐเช็ก":"ยุโรป","ฮังการี":"ยุโรป","โปแลนด์":"ยุโรป",
  "นอร์เวย์":"ยุโรป","สวีเดน":"ยุโรป","ฟินแลนด์":"ยุโรป","เดนมาร์ก":"ยุโรป",
  "ไอร์แลนด์":"ยุโรป","ไอซ์แลนด์":"ยุโรป","รัสเซีย":"ยุโรป","โครเอเชีย":"ยุโรป",
  "สโลวีเนีย":"ยุโรป","มอลตา":"ยุโรป","สกอตแลนด์":"ยุโรป","โรมาเนีย":"ยุโรป",
  "บัลแกเรีย":"ยุโรป","เซอร์เบีย":"ยุโรป","แอลเบเนีย":"ยุโรป","มอนเตเนโกร":"ยุโรป",
  // ตะวันออกกลาง
  "ดูไบ":"ตะวันออกกลาง","UAE":"ตะวันออกกลาง","สหรัฐอาหรับเอมิเรตส์":"ตะวันออกกลาง",
  "อิสราเอล":"ตะวันออกกลาง","จอร์แดน":"ตะวันออกกลาง","ซาอุดีอาระเบีย":"ตะวันออกกลาง",
  "โอมาน":"ตะวันออกกลาง","กาตาร์":"ตะวันออกกลาง","คูเวต":"ตะวันออกกลาง","บาห์เรน":"ตะวันออกกลาง",
  // แอฟริกา
  "อียิปต์":"แอฟริกา","โมร็อกโก":"แอฟริกา","แอฟริกาใต้":"แอฟริกา",
  "แทนซาเนีย":"แอฟริกา","เคนยา":"แอฟริกา","มาดากัสการ์":"แอฟริกา",
  "เอธิโอเปีย":"แอฟริกา","ซิมบับเว":"แอฟริกา","กานา":"แอฟริกา",
  // อเมริกา
  "อเมริกา":"อเมริกา","สหรัฐอเมริกา":"อเมริกา","USA":"อเมริกา",
  "แคนาดา":"อเมริกา","เม็กซิโก":"อเมริกา","เปรู":"อเมริกาใต้",
  "บราซิล":"อเมริกาใต้","อาร์เจนตินา":"อเมริกาใต้","ชิลี":"อเมริกาใต้",
  "โคลอมเบีย":"อเมริกาใต้","โบลิเวีย":"อเมริกาใต้",
  // โอเชียเนีย
  "ออสเตรเลีย":"โอเชียเนีย","นิวซีแลนด์":"โอเชียเนีย","ฟิจิ":"โอเชียเนีย","วานูอาตู":"โอเชียเนีย",
  // ภายในประเทศ
  "ไทย":"ภายในประเทศ","Thailand":"ภายในประเทศ",
};
const detectContinent = (country: string) => CONTINENT_MAP[country?.trim()] ?? "";

const POPULAR_COUNTRIES = [
  "จีน","ญี่ปุ่น","เกาหลีใต้","ไต้หวัน","ฮ่องกง","สิงคโปร์","มาเลเซีย",
  "เวียดนาม","กัมพูชา","อินโดนีเซีย","ฟิลิปปินส์","อินเดีย","เนปาล",
  "ศรีลังกา","ภูฏาน","มัลดีฟส์","พม่า","ลาว",
  "ฝรั่งเศส","สวิตเซอร์แลนด์","อิตาลี","เยอรมนี","สเปน","สหราชอาณาจักร",
  "ออสเตรีย","เนเธอร์แลนด์","กรีซ","ตุรกี","โปรตุเกส","สาธารณรัฐเช็ก",
  "ฮังการี","นอร์เวย์","สวีเดน","ฟินแลนด์","ไอซ์แลนด์","โครเอเชีย","มอลตา",
  "ดูไบ","สหรัฐอาหรับเอมิเรตส์","จอร์แดน","อิสราเอล","อียิปต์","โมร็อกโก",
  "แอฟริกาใต้","เคนยา","สหรัฐอเมริกา","แคนาดา","เม็กซิโก","เปรู","บราซิล",
  "ออสเตรเลีย","นิวซีแลนด์","คาซัคสถาน","อุซเบกิสถาน","มองโกเลีย","ไทย",
];

const TOUR_TYPE_CHIPS = [
  "ครอบครัว","Premium","กิน เที่ยว","Wellness","ธรรมชาติ",
  "City Break","Adventure","Honeymoon","บริษัท","Shopping","Luxury","ประวัติศาสตร์","ทะเล",
];

/* ========= Tour ========= */
const TOUR_FIELDS: ExcelField[] = [
  { key: "category",      header: "ประเภท",               example: "International Tour" },
  { key: "code",          header: "รหัสทัวร์",            example: "HQO-KMG04", required: true },
  { key: "city",          header: "เมือง / เส้นทาง",     example: "คุนหมิง",    required: true },
  { key: "country",       header: "ประเทศ",               example: "จีน" },
  { key: "start_date",    header: "วันเดินทาง (YYYY-MM-DD)", example: "2026-07-01" },
  { key: "end_date",      header: "วันกลับ (YYYY-MM-DD)", example: "2026-07-06" },
  { key: "price_per_seat",header: "ราคา/ที่นั่ง (฿)",    example: "25900", type: "number" as const },
  { key: "total_seats",   header: "จำนวนที่นั่ง",        example: "20",    type: "number" as const },
  { key: "airline_code",  header: "สายการบิน",           example: "FD" },
  { key: "project",       header: "โครงการ / Campaign",  example: "" },
  { key: "note",          header: "หมายเหตุ",             example: "ซากุระบาน" },
];

// ── blank form helpers ──────────────────────────────────────────────────────
const blankTourForm = () => ({
  category: "International Tour" as TourCategory,
  code: "",
  title: "",       // ชื่อโปรแกรมทัวร์เต็ม
  city: "",        // เมือง / จุดเด่น
  country: "",     // ประเทศหลัก
  country2: "",    // ประเทศที่ 2
  days: "", nights: "",
  tourTypes: [] as string[], // chip tags
  customType: "",  // พิมพ์ประเภทเพิ่มเติม
  description: "", // คำอธิบาย
  note: "",
  startDate: "", returnDate: "",  // unused in new dialog — kept for useEffect
});
const blankPeriodForm = () => ({
  start_date: "",
  end_date: "",
  nights: "",
  days: "",
  price_per_seat: "",
  total_seats: "",
  airline_code: "",
  project: "",
  note: "",
  cancelled: false,
  cancel_reason: "",
  // Phase 1+2 UI fields
  freeday: false,
  shopping: false,
  all_in: false,
  vat7: false,
  promo: false,
  footnote: "",
  tags: [] as string[],
});

function TourSection({ canEdit }: { canEdit: boolean }) {
  const tours       = useServices((s) => s.tours);
  const addTour     = useServices((s) => s.addTour);
  const updateTour  = useServices((s) => s.updateTour);
  const deleteTour  = useServices((s) => s.deleteTour);
  const addPeriod      = useServices((s) => s.addPeriod);
  const updatePeriod   = useServices((s) => s.updatePeriod);
  const deletePeriod   = useServices((s) => s.deletePeriod);
  const uploadTourPDF      = useServices((s) => s.uploadTourPDF);
  const deleteTourPDF      = useServices((s) => s.deleteTourPDF);
  const togglePublish      = useServices((s) => s.togglePublish);
  const adjustPeriodQuota  = useServices((s) => s.adjustPeriodQuota);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  // ── program dialog ──
  const [open, setOpen]       = useState(false);
  const [editId, setEditId]   = useState<string | null>(null);
  const [form, setForm]       = useState(blankTourForm());

  // ── period dialog ──
  const [pOpen, setPOpen]         = useState(false);
  const [pTourId, setPTourId]     = useState<string>("");
  const [pEditId, setPEditId]     = useState<string | null>(null); // period_id
  const [pForm, setPForm]         = useState(blankPeriodForm());

  // ── expanded programs ──
  const [expanded, setExpanded]   = useState<Set<string>>(new Set());
  const toggleExpand = (id: string) =>
    setExpanded((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  // ── inline quota pending edit (per period_id) ──
  const [pendingQuota, setPendingQuota] = useState<Record<string, number>>({});

  // ── footnote expand (per period_id) ──
  const [expandedPeriods, setExpandedPeriods] = useState<Set<string>>(new Set());
  const togglePeriodExpand = (id: string) =>
    setExpandedPeriods((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  // ── filter state ──
  const [filterText, setFilterText]       = useState("");
  const [filterCat, setFilterCat]         = useState<TourCategory | "">("");
  const [filterCountry, setFilterCountry] = useState("");
  const [filterAirline, setFilterAirline] = useState("");
  const [filterStatus, setFilterStatus]   = useState<"" | "ว่าง" | "ปิดกรุ๊ป" | "ยกเลิก">("");
  const [filterPromo, setFilterPromo]     = useState(false);
  const [filterTags, setFilterTags]       = useState<string[]>([]);
  const [filterOpen, setFilterOpen]       = useState(false);

  // ── period sort state ──
  const [periodSort, setPeriodSort] = useState<{field: 'date'|'price'|'quota'; dir: 'asc'|'desc'}>({field: 'date', dir: 'asc'});
  const togglePeriodSort = (field: 'date'|'price'|'quota') =>
    setPeriodSort((prev) => prev.field === field ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'asc' });
  const sortIcon = (field: 'date'|'price'|'quota') =>
    periodSort.field === field ? (periodSort.dir === 'asc' ? ' ↑' : ' ↓') : '';

  const parseDuration = (s: string) => {
    const dMatch = s.match(/(\d+)\s*วัน/); const nMatch = s.match(/(\d+)\s*คืน/);
    return { days: dMatch?.[1] ?? "", nights: nMatch?.[1] ?? "" };
  };
  const parsePeriod = (p: string) => {
    const m = p.match(/(\d{4}-\d{2}-\d{2}).*?(\d{4}-\d{2}-\d{2})/);
    return { startDate: m?.[1] ?? "", returnDate: m?.[2] ?? "" };
  };
  const fmtThai = (iso: string): string => {
    if (!iso) return "";
    try { return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" }); }
    catch { return iso; }
  };
  // Short format: 2-digit year ("1 มิ.ย. 69") for compact table display
  const fmtThaiShort = (iso: string): string => {
    if (!iso) return "";
    try {
      const full = new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
      return full.replace(/(\d{4})/, (y) => y.slice(2)); // 2569 → 69
    } catch { return iso; }
  };

  React.useEffect(() => {
    if (form.startDate && form.returnDate) {
      const s = new Date(form.startDate); const r = new Date(form.returnDate);
      if (!isNaN(s.getTime()) && !isNaN(r.getTime()) && r >= s) {
        const nights = Math.round((r.getTime() - s.getTime()) / 86400000);
        setForm((f) => ({ ...f, days: String(nights + 1), nights: String(nights) }));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.startDate, form.returnDate]);

  // ── program open/submit ──
  const openAdd = () => { setEditId(null); setForm(blankTourForm()); setOpen(true); };
  const openEdit = (id: string) => {
    const t = tours.find((x) => x.id === id); if (!t) return;
    setEditId(id);
    const dur = parseDuration(t.duration);
    setForm({
      category: t.category,
      code: t.code,
      title: t.title ?? t.city,
      city: t.title ? t.city : "",  // if has title, city = highlights; else city is the name
      country: t.country,
      country2: (t.countries ?? [])[1] ?? "",
      days: dur.days, nights: dur.nights,
      tourTypes: t.tour_types ?? [],
      customType: "",
      description: t.description ?? "",
      note: t.note ?? "",
      startDate: "", returnDate: "",
    });
    setOpen(true);
  };
  const submit = () => {
    if (!form.title && !form.city) { toast.error("กรุณากรอกชื่อโปรแกรมทัวร์"); return; }
    const days = Number(form.days || 0); const nights = Number(form.nights || 0);
    const duration = days || nights ? `${days} วัน ${nights} คืน` : "";
    const countries = [form.country, form.country2].filter(Boolean) as string[];
    const continent = detectContinent(form.country);
    const payload = {
      category: form.category,
      code: form.code,
      city: form.title || form.city,
      title: form.title || undefined,
      country: form.country,
      countries: countries.length > 0 ? countries : undefined,
      continent: continent || undefined,
      duration,
      note: form.note || undefined,
      tour_types: form.tourTypes.length > 0 ? form.tourTypes : undefined,
      description: form.description || undefined,
    };
    if (editId) {
      updateTour(editId, payload);
    } else {
      addTour({ ...payload, period: "", price_per_seat: 0, total_seats: 0, quota: 0, periods: [] });
    }
    toast.success(editId ? "อัปเดตโปรแกรมแล้ว" : "เพิ่มโปรแกรมใหม่แล้ว"); setOpen(false);
  };

  // ── period open/submit ──
  const openAddPeriod = (tourId: string) => {
    setPTourId(tourId); setPEditId(null); setPForm(blankPeriodForm()); setPOpen(true);
    setExpanded((prev) => new Set([...prev, tourId])); // auto-expand
  };
  const openEditPeriod = (tourId: string, p: TourPeriod) => {
    setPTourId(tourId); setPEditId(p.period_id);
    setPForm({
      start_date: p.start_date ?? "",
      end_date: p.end_date ?? "",
      nights: String(p.nights ?? ""),
      days: String(p.days ?? ""),
      price_per_seat: String(p.price_per_seat),
      total_seats: String(p.total_seats),
      airline_code: p.airline_code ?? "",
      project: p.project ?? "",
      note: p.note ?? "",
      cancelled: p.cancelled ?? false,
      cancel_reason: p.cancel_reason ?? "",
      freeday: p.freeday ?? false,
      shopping: p.shopping ?? false,
      all_in: p.all_in ?? false,
      vat7: p.vat7 ?? false,
      promo: p.promo ?? false,
      footnote: p.footnote ?? "",
      tags: p.tags ?? [],
    });
    setPOpen(true);
  };
  const genTravelDate = (start: string, end: string, d: string, n: string) => {
    if (!start) return "";
    const thStart = fmtThai(start);
    const thEnd = end ? fmtThai(end) : "";
    const label = thEnd && thEnd !== thStart ? `${thStart} – ${thEnd}` : thStart;
    const dur = (d || n) ? ` (${d || "?"}วัน ${n || "?"}คืน)` : "";
    return `${label}${dur}`;
  };

  const submitPeriod = () => {
    if (!pForm.start_date) { toast.error("ระบุวันที่เดินทาง"); return; }
    if (!pForm.price_per_seat || !pForm.total_seats) { toast.error("ระบุราคาและจำนวนที่นั่ง"); return; }
    const seats = Number(pForm.total_seats || 0);
    const travelDate = genTravelDate(pForm.start_date, pForm.end_date, pForm.days, pForm.nights);
    const payload: Omit<TourPeriod, "period_id"> = {
      start_date: pForm.start_date,
      end_date: pForm.end_date || undefined,
      nights: pForm.nights ? Number(pForm.nights) : undefined,
      days: pForm.days ? Number(pForm.days) : undefined,
      travel_date: travelDate,
      price_per_seat: Number(pForm.price_per_seat || 0),
      total_seats: seats,
      quota: pEditId
        ? (tours.find((t) => t.id === pTourId)?.periods?.find((p) => p.period_id === pEditId)?.quota ?? seats)
        : seats,
      airline_code: pForm.airline_code || undefined,
      project: pForm.project || undefined,
      note: pForm.note || undefined,
      cancelled: pForm.cancelled || undefined,
      cancel_reason: pForm.cancelled ? (pForm.cancel_reason || undefined) : undefined,
      freeday: pForm.freeday || undefined,
      shopping: pForm.shopping || undefined,
      all_in: pForm.all_in || undefined,
      vat7: pForm.vat7 || undefined,
      promo: pForm.promo || undefined,
      footnote: pForm.footnote || undefined,
      tags: pForm.tags.length > 0 ? pForm.tags : undefined,
    };
    if (pEditId) {
      updatePeriod(pTourId, pEditId, payload);
      toast.success("อัปเดต period แล้ว");
    } else {
      addPeriod(pTourId, payload);
      toast.success("เพิ่ม period ใหม่แล้ว");
    }
    setPOpen(false);
  };

  // Auto-calc days/nights when period start/end date changes
  React.useEffect(() => {
    if (pForm.start_date && pForm.end_date) {
      const s = new Date(pForm.start_date); const e = new Date(pForm.end_date);
      if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e >= s) {
        const nights = Math.round((e.getTime() - s.getTime()) / 86400000);
        setPForm((f) => ({ ...f, nights: String(nights), days: String(nights + 1) }));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pForm.start_date, pForm.end_date]);

  const exportData = useMemo(() => {
    const rows: Record<string, unknown>[] = [];
    tours.forEach((t) => {
      const periods = t.periods ?? [];
      if (periods.length > 0) {
        periods.forEach((p) => {
          rows.push({
            category: t.category, code: t.code, city: t.city, country: t.country,
            start_date: p.start_date ?? "", end_date: p.end_date ?? "",
            price_per_seat: p.price_per_seat, total_seats: p.total_seats,
            airline_code: p.airline_code ?? "", project: p.project ?? "",
            note: p.note ?? t.note ?? "",
          });
        });
      } else {
        rows.push({
          category: t.category, code: t.code, city: t.city, country: t.country,
          start_date: "", end_date: "",
          price_per_seat: t.price_per_seat, total_seats: t.total_seats,
          airline_code: "", project: "", note: t.note ?? "",
        });
      }
    });
    return rows;
  }, [tours]);
  const handleImport = (rows: Record<string, unknown>[]) => {
    rows.forEach((row) => {
      const seats = Number(row.total_seats ?? 0);
      addTour({ category: (row.category as TourCategory) || "International Tour",
        code: String(row.code ?? ""), city: String(row.city ?? ""),
        country: String(row.country ?? ""), period: "", duration: "",
        price_per_seat: Number(row.price_per_seat ?? 0),
        total_seats: seats, quota: seats, note: String(row.note ?? ""), periods: [] });
    });
    toast.success(`นำเข้า ${rows.length} ทัวร์แล้ว`);
  };

  // ── filter options (computed from store) ──
  const allCountries = useMemo(
    () => [...new Set(tours.map((t) => t.country).filter(Boolean))].sort(),
    [tours],
  );
  const allAirlines = useMemo(() => {
    const codes = tours.flatMap((t) =>
      (t.periods ?? []).map((p) => p.airline_code).filter(Boolean) as string[],
    );
    return [...new Set(codes)].sort();
  }, [tours]);

  const filteredTours = useMemo(() => {
    return tours.filter((t) => {
      if (filterText) {
        const q = filterText.toLowerCase();
        if (
          !t.city.toLowerCase().includes(q) &&
          !t.code.toLowerCase().includes(q) &&
          !t.country.toLowerCase().includes(q)
        ) return false;
      }
      if (filterCat && t.category !== filterCat) return false;
      if (filterCountry && t.country !== filterCountry) return false;
      if (filterAirline) {
        const has = (t.periods ?? []).some((p) => p.airline_code === filterAirline);
        if (!has) return false;
      }
      if (filterStatus) {
        const periods = t.periods ?? [];
        if (periods.length > 0) {
          const has = periods.some((p) => {
            if (filterStatus === "ยกเลิก") return !!p.cancelled;
            if (filterStatus === "ปิดกรุ๊ป") return !p.cancelled && p.quota === 0;
            if (filterStatus === "ว่าง") return !p.cancelled && p.quota > 0;
            return true;
          });
          if (!has) return false;
        }
      }
      if (filterPromo) {
        const has = (t.periods ?? []).some((p) => p.promo);
        if (!has) return false;
      }
      if (filterTags.length > 0) {
        const has = (t.periods ?? []).some((p) =>
          filterTags.every((tag) => (p.tags ?? []).includes(tag)),
        );
        if (!has) return false;
      }
      return true;
    });
  }, [tours, filterText, filterCat, filterCountry, filterAirline, filterStatus, filterPromo, filterTags]);

  const intlTours = useMemo(() => filteredTours.filter((t) => t.category === "International Tour"), [filteredTours]);
  const domTours  = useMemo(() => filteredTours.filter((t) => t.category === "Domestic"),          [filteredTours]);
  const incTours  = useMemo(() => filteredTours.filter((t) => t.category === "Incentive"),         [filteredTours]);

  const hasFilter = !!(filterText || filterCat || filterCountry || filterAirline || filterStatus || filterPromo || filterTags.length);
  const clearFilters = () => {
    setFilterText(""); setFilterCat(""); setFilterCountry(""); setFilterAirline("");
    setFilterStatus(""); setFilterPromo(false); setFilterTags([]);
  };

  return (
    <div className="space-y-0 -mx-4 sm:-mx-6">
      {/* ── FILTER BAR (non-sticky) ── */}
      <div className="bg-white border-b px-4 py-2.5 space-y-2">

        {/* ── MOBILE: compact search row + filter toggle ── */}
        <div className="flex items-center gap-2 sm:hidden">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input className="pl-8 h-9 text-sm" placeholder="ค้นหา..." value={filterText} onChange={(e) => setFilterText(e.target.value)} />
          </div>
          <button
            onClick={() => setFilterOpen((v) => !v)}
            className={`h-9 flex items-center gap-1.5 px-3 rounded-lg border text-sm font-medium transition-colors ${(filterOpen || hasFilter) ? "text-white border-gray-800" : "border-gray-200 text-gray-500"}`}
            style={(filterOpen || hasFilter) ? {background: "#1F2937"} : undefined}
          >
            <SlidersHorizontal className="w-4 h-4" />
            ตัวกรอง
            {hasFilter && <span className="w-4 h-4 rounded-full bg-pink-500 text-white text-[9px] font-bold flex items-center justify-center">{[filterCat, filterCountry, filterAirline, filterStatus, filterPromo, ...filterTags].filter(Boolean).length}</span>}
          </button>
        </div>

        {/* ── MOBILE: expandable filter panel ── */}
        {filterOpen && (
          <div className="sm:hidden space-y-2 pt-1 pb-0.5 border-t border-gray-100 mt-1">
            <div className="grid grid-cols-2 gap-2">
              <Select value={filterCat || "__all__"} onValueChange={(v) => setFilterCat(v === "__all__" ? "" : v as TourCategory)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="กลุ่มทัวร์" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">กลุ่มทั้งหมด</SelectItem>
                  {TOUR_CATS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterCountry || "__all__"} onValueChange={(v) => setFilterCountry(v === "__all__" ? "" : v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="ประเทศ" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">ทุกประเทศ</SelectItem>
                  {allCountries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterStatus || "__all__"} onValueChange={(v) => setFilterStatus(v === "__all__" ? "" : v as "ว่าง" | "ปิดกรุ๊ป" | "ยกเลิก")}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="สถานะ" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">ทุกสถานะ</SelectItem>
                  <SelectItem value="ว่าง">ว่าง</SelectItem>
                  <SelectItem value="ปิดกรุ๊ป">ปิดกรุ๊ป</SelectItem>
                  <SelectItem value="ยกเลิก">ยกเลิก</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterAirline || "__all__"} onValueChange={(v) => setFilterAirline(v === "__all__" ? "" : v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="สายการบิน" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">ทุกสายการบิน</SelectItem>
                  {allAirlines.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setFilterPromo((v) => !v)}
                className={`h-8 px-3 rounded-lg text-sm font-medium border transition-colors ${filterPromo ? "text-white border-orange-500" : "border-gray-200 text-gray-500"}`}
                style={filterPromo ? {background: "#F59E0B"} : undefined}
              >🔥 Promo</button>
              {hasFilter && (
                <button onClick={() => { clearFilters(); setFilterOpen(false); }} className="h-8 px-3 text-sm text-red-500 border border-red-200 rounded-lg">✕ ล้างทั้งหมด</button>
              )}
            </div>
            {/* Tag chips on mobile */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {CATEGORY_TAGS.map((tag) => (
                <button key={tag}
                  onClick={() => setFilterTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])}
                  className="px-2.5 py-1 rounded-full text-xs font-medium border transition-colors"
                  style={filterTags.includes(tag)
                    ? {background: "#1F2937", color: "#fff", borderColor: "#1F2937"}
                    : {borderColor: "#E5E7EB", color: "#9CA3AF"}}
                >{tag}</button>
              ))}
            </div>
          </div>
        )}

        {/* ── DESKTOP: full filter row ── */}
        <div className="hidden sm:block space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[160px] max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input className="pl-8 h-8 text-xs" placeholder="ค้นหารหัส / เมือง / ประเทศ..." value={filterText} onChange={(e) => setFilterText(e.target.value)} />
            </div>
            <Select value={filterCat || "__all__"} onValueChange={(v) => setFilterCat(v === "__all__" ? "" : v as TourCategory)}>
              <SelectTrigger className="h-8 text-xs w-[150px]"><SelectValue placeholder="กลุ่มทั้งหมด" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">กลุ่มทั้งหมด</SelectItem>
                {TOUR_CATS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterCountry || "__all__"} onValueChange={(v) => setFilterCountry(v === "__all__" ? "" : v)}>
              <SelectTrigger className="h-8 text-xs w-[120px]"><SelectValue placeholder="ประเทศทั้งหมด" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">ประเทศทั้งหมด</SelectItem>
                {allCountries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus || "__all__"} onValueChange={(v) => setFilterStatus(v === "__all__" ? "" : v as "ว่าง" | "ปิดกรุ๊ป" | "ยกเลิก")}>
              <SelectTrigger className="h-8 text-xs w-[120px]"><SelectValue placeholder="สถานะทั้งหมด" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">สถานะทั้งหมด</SelectItem>
                <SelectItem value="ว่าง">ว่าง</SelectItem>
                <SelectItem value="ปิดกรุ๊ป">ปิดกรุ๊ป</SelectItem>
                <SelectItem value="ยกเลิก">ยกเลิก</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterAirline || "__all__"} onValueChange={(v) => setFilterAirline(v === "__all__" ? "" : v)}>
              <SelectTrigger className="h-8 text-xs w-[110px]"><SelectValue placeholder="สายการบิน" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">ทั้งหมด</SelectItem>
                {allAirlines.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <button
              onClick={() => setFilterPromo((v) => !v)}
              className={`h-8 px-3 rounded-md text-xs font-medium border transition-colors ${filterPromo ? "text-white border-orange-500" : "border-gray-200 text-gray-500 hover:border-orange-300 hover:text-orange-600"}`}
              style={filterPromo ? {background: "#F59E0B", borderColor: "#F59E0B"} : undefined}
            >🔥 Promo</button>
            {hasFilter && (
              <button onClick={clearFilters} className="h-8 px-2.5 text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-md transition-colors">✕ ล้าง</button>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {CATEGORY_TAGS.map((tag) => (
              <button key={tag}
                onClick={() => setFilterTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])}
                className="px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors"
                style={filterTags.includes(tag)
                  ? {background: "#1F2937", color: "#fff", borderColor: "#1F2937"}
                  : {borderColor: "#E5E7EB", color: "#9CA3AF"}}
              >{tag}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── HEADER ACTIONS BAR ── */}
      <div className="flex items-center justify-between gap-2 flex-wrap px-4 py-3 border-b bg-white">
        <div>
          <p className="text-sm text-muted-foreground">
            รวม <span className="font-semibold text-foreground">{filteredTours.length}</span>
            {hasFilter && <span className="text-muted-foreground"> / {tours.length}</span>} โปรแกรม
            {hasFilter && <span className="ml-1.5 text-[11px] text-amber-600 font-medium">(กรองอยู่)</span>}
          </p>
          <p className="hidden sm:block text-xs text-muted-foreground mt-0.5">🎯 โควต้าตัดอัตโนมัติเมื่อปิดดีล Closed Won · คืนอัตโนมัติเมื่อยกเลิก</p>
        </div>
        <div className="flex items-center gap-2">
          <ImportExportMenu fields={TOUR_FIELDS} sheetName="ทัวร์" filename="tours" data={exportData} onImport={handleImport} />
          {canEdit && (
            <Button onClick={openAdd} style={{background: "#16A34A", color: "#FFFFFF"}} className="hover:opacity-90">
              <Plus className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">เพิ่มโปรแกรมทัวร์</span>
              <span className="sm:hidden">เพิ่มทัวร์</span>
            </Button>
          )}
        </div>
      </div>

      {/* ── STOCK SUMMARY BAR ── */}
      {(() => {
        const stats = filteredTours.reduce(
          (acc, t) => {
            (t.periods ?? []).forEach((p) => {
              if (!p.cancelled) {
                acc.totalSeats += p.total_seats;
                acc.booked    += p.total_seats - p.quota;
                acc.available += p.quota;
                acc.periods   += 1;
              }
            });
            return acc;
          },
          { totalSeats: 0, booked: 0, available: 0, periods: 0 }
        );
        if (stats.periods === 0) return null;
        const pct = stats.totalSeats > 0 ? Math.round((stats.booked / stats.totalSeats) * 100) : 0;
        return (
          <div className="hidden sm:flex items-center gap-4 px-6 py-2 border-b bg-gray-50 flex-wrap">
            <span className="text-[11px] text-gray-500 font-medium">📊 ภาพรวม Stock</span>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-gray-500">ที่นั่งทั้งหมด</span>
              <span className="text-[12px] font-bold text-gray-800">{stats.totalSeats.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full inline-block" style={{background:"#EC4899"}} />
              <span className="text-[11px] text-gray-500">จองแล้ว</span>
              <span className="text-[12px] font-bold" style={{color:"#EC4899"}}>{stats.booked.toLocaleString()}</span>
              <span className="text-[10px] text-gray-400">({pct}%)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full inline-block" style={{background:"#16A34A"}} />
              <span className="text-[11px] text-gray-500">ว่าง</span>
              <span className="text-[12px] font-bold" style={{color:"#16A34A"}}>{stats.available.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-gray-400">| {stats.periods} Period ที่เปิดอยู่</span>
            </div>
            <div className="flex-1 max-w-[160px]">
              <div className="h-2 rounded-full overflow-hidden" style={{background:"#E5E7EB"}}>
                <div className="h-full rounded-full" style={{width:`${pct}%`, background:"#EC4899"}} />
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── SECTIONS ── */}
      {(
        [
          { labelTh: "ทัวร์ต่างประเทศ", labelEn: "International Tours", items: intlTours, color: "#16A34A", bg: "#ECFDF5", textColor: "#065F46", Icon: Plane },
          { labelTh: "ทัวร์ในประเทศ",   labelEn: "Domestic Tours",      items: domTours,  color: "#F59E0B", bg: "#FFFBEB", textColor: "#92400E", Icon: MapPinned },
          { labelTh: "Incentive",        labelEn: "Incentive & Group",    items: incTours,  color: "#7C3AED", bg: "#F5F3FF", textColor: "#4C1D95", Icon: FileBadge },
        ] as const
      ).map(({ labelTh, labelEn, items, color, bg, textColor, Icon }) =>
        items.length === 0 ? null : (
          <div key={labelTh} className="mb-6">
            {/* ── Section Header Card ── */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 mx-4 sm:mx-6 mt-4 rounded-2xl" style={{background: bg, border: `1.5px solid ${color}30`}}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 shadow-sm" style={{background: color}}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-bold text-base leading-tight" style={{color: textColor}}>{labelTh}</div>
                  <div className="text-xs font-medium mt-0.5" style={{color: textColor, opacity: 0.65}}>{labelEn}</div>
                </div>
              </div>
              <span className="text-sm font-bold px-3 py-1.5 rounded-full text-white shadow-sm" style={{background: color}}>
                {items.length} โปรแกรม
              </span>
            </div>

            {/* Tour Cards */}
            <div className="space-y-2 px-4 sm:px-6 mt-3">
              {items.map((t) => {
                const hasPeriods = (t.periods?.length ?? 0) > 0;
                const isExpanded = expanded.has(t.id);
                const activePeriods = (t.periods ?? []).filter((p) => !p.cancelled);
                const prices = hasPeriods ? t.periods!.map((p) => p.price_per_seat) : [];
                const priceMin = prices.length ? Math.min(...prices) : t.price_per_seat;
                const priceMax = prices.length ? Math.max(...prices) : t.price_per_seat;
                const priceLabel = priceMin === priceMax
                  ? `฿${priceMin.toLocaleString()}`
                  : `฿${priceMin.toLocaleString()} – ฿${priceMax.toLocaleString()}`;

                return (
                  <div key={t.id} className="rounded-2xl overflow-hidden shadow-sm border" style={{borderColor: `${color}30`}}>
                    {/* ── Program Header Row — DESKTOP (sm+) ── */}
                    <div className={`hidden sm:flex items-center gap-2 px-4 py-2 transition-colors ${isExpanded ? "" : "hover:bg-gray-50/40"}`} style={{background: isExpanded ? bg : "white", borderLeft: `4px solid ${color}`}}>
                      <button className="w-6 h-6 flex items-center justify-center shrink-0 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100/80 transition-colors" onClick={() => toggleExpand(t.id)}>
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-0 flex-wrap">
                          <span className="font-bold text-sm text-gray-900 mr-2">{t.title ?? t.city}</span>
                          {t.duration && <><span className="text-gray-300 mr-2">|</span><span className="text-sm text-gray-500 mr-2 whitespace-nowrap">{t.duration}</span></>}
                          <span className="text-gray-300 mr-2">|</span>
                          <span className="text-sm font-semibold font-mono mr-2" style={{color}}>{t.code}</span>
                          <button onClick={() => hasPeriods && toggleExpand(t.id)}
                            className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md border font-semibold text-[11px] transition-colors mr-1.5"
                            style={hasPeriods ? {borderColor:"#374151",color:"white",background:"#1F2937"} : {borderColor:"#E5E7EB",color:"#9CA3AF",background:"#F9FAFB"}}>
                            {hasPeriods ? `${t.periods!.length} Period` : "ยังไม่มี"}
                            {hasPeriods && (isExpanded ? <ChevronDown className="w-3 h-3 ml-0.5" /> : <ChevronRight className="w-3 h-3 ml-0.5" />)}
                          </button>
                          {t.continent && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{background:`${color}15`,color}}>{t.continent}</span>}
                        </div>
                        {t.title && t.city && t.city !== t.title && <div className="text-[11px] text-gray-400 truncate mt-0.5">{t.city}</div>}
                        {(t.tour_types ?? []).length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {(t.tour_types ?? []).slice(0, 4).map((tag) => (
                              <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full border font-medium" style={{borderColor:`${color}40`,color}}>{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      {canEdit && (
                        <button onClick={() => openAddPeriod(t.id)} className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold shadow-sm transition-opacity hover:opacity-90" style={{background:"#EC4899"}}>
                          <Plus className="w-3.5 h-3.5" /> เพิ่ม Period
                        </button>
                      )}
                      {canEdit && (
                        <div className="flex items-center gap-0.5 shrink-0">
                          {t.pdf_url && <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded mr-1 ${t.is_published ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>{t.is_published ? "🌐 Live" : "PDF"}</span>}
                          {t.pdf_url ? (
                            <Button size="icon" variant="ghost" className="h-7 w-7" title="ลบ PDF" onClick={async () => { if (!confirm("ลบ PDF?")) return; await deleteTourPDF(t.id); toast.success("ลบ PDF แล้ว"); }}><FileX className="w-3.5 h-3.5 text-destructive/70" /></Button>
                          ) : (
                            <><input id={`pdf-upload-${t.id}`} type="file" accept="application/pdf" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; e.target.value = ""; if (!file) return; if (file.size > 20*1024*1024) { toast.error("ไฟล์ใหญ่เกิน 20 MB"); return; } setUploadingId(t.id); const url = await uploadTourPDF(t.id, file); setUploadingId(null); if (url) toast.success("อัปโหลด PDF สำเร็จ"); else toast.error("อัปโหลดล้มเหลว"); }} />
                            <Button size="icon" variant="ghost" className="h-7 w-7" title="อัปโหลด PDF" disabled={uploadingId===t.id} onClick={() => document.getElementById(`pdf-upload-${t.id}`)?.click()}>{uploadingId===t.id ? <span className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <FileUp className="w-3.5 h-3.5" />}</Button></>
                          )}
                          <Button size="icon" variant="ghost" className="h-7 w-7" disabled={!t.pdf_url} title={t.is_published ? "ซ่อนจากเว็บ (กดเพื่อปิด)" : "แสดงบนเว็บ (กดเพื่อเปิด)"} onClick={() => { togglePublish(t.id, !t.is_published); toast.success(t.is_published ? "ซ่อนแล้ว" : "แสดงแล้ว"); }}>{t.is_published ? <Globe className="w-3.5 h-3.5 text-green-600" /> : <GlobeLock className="w-3.5 h-3.5 text-muted-foreground/50" />}</Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" title="แก้ไขโปรแกรม" onClick={() => openEdit(t.id)}><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" title="ลบโปรแกรม" onClick={() => { const booked = t.total_seats - t.quota; const ok = booked > 0 ? confirm(`⚠️ โปรแกรมนี้มีที่นั่งถูกจองแล้ว ${booked} ที่\n\nการลบจะทำให้ข้อมูลการจองหายทั้งหมด ไม่สามารถกู้คืนได้\n\nยืนยันการลบโปรแกรมนี้หรือไม่?`) : confirm("ลบโปรแกรมทัวร์นี้?"); if (ok) { deleteTour(t.id); toast.success("ลบแล้ว"); } }}><Trash2 className="w-3.5 h-3.5 text-destructive/70" /></Button>
                        </div>
                      )}
                    </div>

                    {/* ── Program Header Row — MOBILE (< sm) ── */}
                    <div className={`sm:hidden transition-colors`} style={{background: isExpanded ? bg : "white", borderLeft: `4px solid ${color}`}}>
                      {/* Top row: expand + name + period badge */}
                      <div className="flex items-start gap-2 px-3 pt-2.5 pb-1">
                        <button className="mt-0.5 w-6 h-6 flex items-center justify-center shrink-0 rounded-md text-gray-400" onClick={() => toggleExpand(t.id)}>
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-base text-gray-900 leading-snug">{t.title ?? t.city}</span>
                            <button onClick={() => hasPeriods && toggleExpand(t.id)}
                              className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md border font-semibold text-[11px]"
                              style={hasPeriods ? {borderColor:"#374151",color:"white",background:"#1F2937"} : {borderColor:"#E5E7EB",color:"#9CA3AF",background:"#F9FAFB"}}>
                              {hasPeriods ? `${t.periods!.length} Period` : "ยังไม่มี"}
                              {hasPeriods && (isExpanded ? <ChevronDown className="w-3 h-3 ml-0.5" /> : <ChevronRight className="w-3 h-3 ml-0.5" />)}
                            </button>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500 flex-wrap">
                            {t.duration && <span className="whitespace-nowrap">{t.duration}</span>}
                            <span className="text-gray-300">|</span>
                            <span className="font-mono font-bold whitespace-nowrap" style={{color}}>{t.code}</span>
                            {t.continent && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{background:`${color}15`,color}}>{t.continent}</span>}
                          </div>
                        </div>
                      </div>
                      {/* Bottom row: action buttons */}
                      <div className="flex items-center gap-1.5 px-3 pb-2.5 pt-0.5 flex-wrap">
                        {canEdit && (
                          <button onClick={() => openAddPeriod(t.id)} className="w-9 h-9 rounded-full flex items-center justify-center text-white shadow-sm transition-opacity hover:opacity-90" style={{background:"#EC4899"}} title="เพิ่ม Period">
                            <Plus className="w-5 h-5" />
                          </button>
                        )}
                        {canEdit && (
                          <div className="flex items-center gap-0.5 ml-auto">
                            {t.pdf_url && <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${t.is_published ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>{t.is_published ? "🌐" : "PDF"}</span>}
                            {t.pdf_url ? (
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={async () => { if (!confirm("ลบ PDF?")) return; await deleteTourPDF(t.id); toast.success("ลบแล้ว"); }}><FileX className="w-3.5 h-3.5 text-destructive/70" /></Button>
                            ) : (
                              <><input id={`pdf-upload-mob-${t.id}`} type="file" accept="application/pdf" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; e.target.value = ""; if (!file) return; setUploadingId(t.id); const url = await uploadTourPDF(t.id, file); setUploadingId(null); if (url) toast.success("อัปโหลดสำเร็จ"); else toast.error("ล้มเหลว"); }} />
                              <Button size="icon" variant="ghost" className="h-7 w-7" disabled={uploadingId===t.id} onClick={() => document.getElementById(`pdf-upload-mob-${t.id}`)?.click()}>{uploadingId===t.id ? <span className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <FileUp className="w-3.5 h-3.5" />}</Button></>
                            )}
                            <Button size="icon" variant="ghost" className="h-7 w-7" disabled={!t.pdf_url} onClick={() => { togglePublish(t.id, !t.is_published); toast.success(t.is_published ? "ซ่อนแล้ว" : "แสดงแล้ว"); }}>{t.is_published ? <Globe className="w-3.5 h-3.5 text-green-600" /> : <GlobeLock className="w-3.5 h-3.5 text-muted-foreground/50" />}</Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(t.id)}><Pencil className="w-3.5 h-3.5" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { const booked = t.total_seats - t.quota; const ok = booked > 0 ? confirm(`⚠️ มีที่นั่งถูกจองแล้ว ${booked} ที่\n\nการลบจะทำให้ข้อมูลการจองหายทั้งหมด ไม่สามารถกู้คืนได้\n\nยืนยันการลบหรือไม่?`) : confirm("ลบโปรแกรมทัวร์นี้?"); if (ok) { deleteTour(t.id); toast.success("ลบแล้ว"); } }}><Trash2 className="w-3.5 h-3.5 text-destructive/70" /></Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── Period Section (Mobile + Desktop) ── */}
                    {hasPeriods && isExpanded && (<>

                    {/* ════ MOBILE period cards (< sm) ════ */}
                    <div className="sm:hidden border-t" style={{background: "#FAFAFA"}}>
                      <div className="p-3 space-y-2">
                        {t.periods!.map((p) => {
                          const pid = p.period_id;
                          const hasPending = pendingQuota[pid] !== undefined;
                          const currentQuota = hasPending ? pendingQuota[pid] : p.quota;
                          const isCancelled = !!p.cancelled;
                          const isFullDisplay = !isCancelled && currentQuota === 0;
                          const bookedCount = p.total_seats - currentQuota;
                          const bookedPct = p.total_seats > 0 ? Math.round((bookedCount / p.total_seats) * 100) : 0;
                          const statusColor = isCancelled ? "#EF4444" : isFullDisplay ? "#9CA3AF" : "#16A34A";
                          const barBg = isCancelled ? "#EF4444" : isFullDisplay ? "#9CA3AF" : "#16A34A";
                          return (
                            <div key={pid}
                              className={`rounded-xl border overflow-hidden ${hasPending ? "ring-1 ring-amber-300" : ""}`}
                              style={{borderLeftWidth:"4px", borderLeftColor: statusColor, borderColor:`${statusColor}30`, background: isCancelled ? "#FFF5F5" : hasPending ? "#FFFBEB" : "white"}}
                            >
                              {/* Top: date + status */}
                              <div className="flex items-start justify-between px-3 pt-2.5 pb-1">
                                <div className="flex-1 min-w-0 pr-2">
                                  <div className={`text-sm font-bold leading-snug ${isCancelled ? "line-through text-gray-400" : "text-gray-800"}`}>
                                    {p.start_date ? fmtThai(p.start_date) : p.travel_date}
                                    {p.end_date && p.end_date !== p.start_date ? ` – ${fmtThai(p.end_date)}` : ""}
                                  </div>
                                  {/* Chips row */}
                                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                    {(p.days || p.nights) && <span className="text-[10px] text-white px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap" style={{background:"#1F2937"}}>{p.days}วัน {p.nights}คืน</span>}
                                    {p.airline_code && <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{p.airline_code}</span>}
                                    {p.promo && <span className="text-xs">🔥</span>}
                                    {p.freeday && <span className="text-[10px] text-white px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap" style={{background:"#7C3AED"}}>Freeday</span>}
                                    {p.shopping && <span className="text-[10px] text-white px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap" style={{background:"#F59E0B"}}>ลงร้าน</span>}
                                    {p.all_in && <span className="text-[10px] text-white px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap" style={{background:"#16A34A"}}>จบ</span>}
                                    {p.vat7 && <span className="text-[10px] text-white px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap" style={{background:"#2563EB"}}>Vat7%</span>}
                                  </div>
                                </div>
                                <div className="shrink-0 mt-0.5">
                                  {isCancelled ? <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 whitespace-nowrap">ยกเลิก</span>
                                   : isFullDisplay ? <span className="px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 whitespace-nowrap">ปิดกรุ๊ป</span>
                                   : <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 whitespace-nowrap">ว่าง</span>}
                                </div>
                              </div>
                              {/* Price + progress bar */}
                              <div className="flex items-center gap-3 px-3 pb-2.5">
                                <span className="font-bold text-base shrink-0 leading-none" style={{color:"#EC4899"}}>{p.price_per_seat.toLocaleString()}฿</span>
                                <div className="flex-1">
                                  <div className="flex justify-between text-[10px] mb-1">
                                    <span className={`font-semibold ${hasPending ? "text-amber-600" : "text-gray-500"}`}>จอง {bookedCount}/{p.total_seats}</span>
                                    <span className={`font-semibold ${isCancelled ? "text-red-400" : hasPending ? "text-amber-500" : "text-emerald-600"}`}>{isCancelled ? "ยกเลิก" : `ว่าง ${currentQuota}`}</span>
                                  </div>
                                  <div className="relative h-3.5 rounded-full overflow-hidden" style={{background:"#E5E7EB"}}>
                                    <div className="absolute inset-y-0 left-0 rounded-full transition-all" style={{width:`${bookedPct}%`, background: barBg}} />
                                    {bookedPct >= 20 && <span className="absolute inset-y-0 left-1.5 flex items-center text-[8px] font-bold text-white">{bookedPct}%</span>}
                                  </div>
                                </div>
                              </div>
                              {/* Actions row (canEdit) */}
                              {canEdit && (
                                <div className="flex items-center gap-2 px-3 py-2 border-t" style={{borderColor:`${statusColor}15`, background:"#F9FAFB"}}>
                                  {!isCancelled && (
                                    <>
                                      <button disabled={currentQuota >= p.total_seats}
                                        onClick={() => setPendingQuota((prev) => ({...prev, [pid]: Math.min((prev[pid] ?? p.quota) + 1, p.total_seats)}))}
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-base disabled:opacity-30 transition-colors"
                                        style={{background:"#EF4444"}}
                                      ><Minus className="w-4 h-4" /></button>
                                      <span className="text-sm font-bold text-gray-700 min-w-[28px] text-center">{currentQuota}</span>
                                      <button disabled={currentQuota <= 0}
                                        onClick={() => setPendingQuota((prev) => ({...prev, [pid]: Math.max((prev[pid] ?? p.quota) - 1, 0)}))}
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-base disabled:opacity-30 transition-colors"
                                        style={{background:"#16A34A"}}
                                      ><Plus className="w-4 h-4" /></button>
                                      {hasPending && (
                                        <>
                                          <button onClick={() => { const newQ = pendingQuota[pid]; if (newQ === undefined) return; adjustPeriodQuota(t.id, pid, newQ - p.quota); setPendingQuota((prev) => { const n = {...prev}; delete n[pid]; return n; }); toast.success("อัปเดตโควต้าแล้ว"); }}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg text-green-600 border border-green-200 bg-white"
                                          ><Save className="w-4 h-4" /></button>
                                          <button onClick={() => setPendingQuota((prev) => { const n = {...prev}; delete n[pid]; return n; })}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 border border-gray-200 bg-white"
                                          ><X className="w-4 h-4" /></button>
                                        </>
                                      )}
                                    </>
                                  )}
                                  <div className="ml-auto flex items-center gap-0.5">
                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditPeriod(t.id, p)}><Pencil className="w-4 h-4" /></Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { const booked = p.total_seats - p.quota; const ok = booked > 0 ? confirm(`⚠️ Period นี้มีที่นั่งถูกจองแล้ว ${booked} ที่\n\nการลบจะทำให้ข้อมูลการจองหายทั้งหมด ไม่สามารถกู้คืนได้\n\nยืนยันการลบ Period นี้หรือไม่?`) : confirm("ลบ Period นี้?"); if (ok) { deletePeriod(t.id, p.period_id); toast.success("ลบ Period แล้ว"); } }}><Trash2 className="w-4 h-4 text-destructive/70" /></Button>
                                  </div>
                                </div>
                              )}
                              {/* footnote/tags */}
                              {(p.footnote || (p.tags ?? []).length > 0 || p.project || p.note) && (
                                <div className="px-3 py-2 text-xs space-y-1 border-t" style={{background:"#F9FAFB", borderColor:`${statusColor}15`}}>
                                  {p.footnote && <div className="text-gray-500 italic">*{p.footnote}</div>}
                                  {(p.tags ?? []).length > 0 && <div className="flex gap-1 flex-wrap">{(p.tags ?? []).map((tg) => <span key={tg} className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-[10px]">{tg}</span>)}</div>}
                                  {p.project && <div className="text-gray-400">โครงการ: <span className="text-gray-600">{p.project}</span></div>}
                                  {p.note && <div className="text-gray-400">หมายเหตุ: <span className="text-gray-600">{p.note}</span></div>}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {/* Add Period (mobile) */}
                      {canEdit && (
                        <button onClick={() => openAddPeriod(t.id)} className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-colors hover:bg-white" style={{color, borderTop:`1px dashed ${color}30`}}>
                          <Plus className="w-4 h-4" /> เพิ่ม Period ใหม่
                        </button>
                      )}
                    </div>

                    {/* ════ DESKTOP period table (sm+) ════ */}
                    <div className="hidden sm:block border-t" style={{background: "#FAFAFA"}}>
                        {/* Column Headers — pl-7 matches card offset: px-3(wrapper)+border(4px)+px-3(inner)=28px */}
                        {/* v142: w-full — stretch to fill container width */}
                        <div className="flex items-center gap-1 pl-7 pr-3 py-1 border-b w-full select-none" style={{background: "#F3F4F6"}}>
                          <div className="w-6 shrink-0" />
                          {/* Period — w-[165px] + 2-digit year in data row */}
                          <div
                            className="w-[165px] shrink-0 text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap cursor-pointer hover:text-gray-700 transition-colors"
                            onClick={() => togglePeriodSort('date')}
                            title="เรียงตามวันเดินทาง"
                          >Period{sortIcon('date')}</div>
                          <div className="w-[56px] shrink-0 text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap text-center">วัน/คืน</div>
                          <div className="w-8 shrink-0 text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap text-center">🔥</div>
                          <div className="w-9 shrink-0 text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap text-center">เดินทาง</div>
                          <div className="w-2 shrink-0" />
                          <div className="w-9 shrink-0 text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap text-center">FD</div>
                          <div className="w-9 shrink-0 text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap text-center">ร้าน</div>
                          <div className="w-[62px] shrink-0 text-[10px] font-semibold text-gray-500 tracking-wide whitespace-nowrap text-center">จอง จ่าย จบ</div>
                          <div className="w-[40px] shrink-0 text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap text-center">Vat7%</div>
                          {/* ราคา — clickable sort */}
                          <div
                            className="w-[60px] text-right shrink-0 text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap cursor-pointer hover:text-gray-700 transition-colors"
                            onClick={() => togglePeriodSort('price')}
                            title="เรียงตามราคา"
                          >ราคา (฿){sortIcon('price')}</div>
                          {/* Book/โควต้า — flex-1 fills remaining space, max-w to keep bar readable */}
                          <div
                            className="flex-1 min-w-[120px] max-w-[220px] text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap text-center cursor-pointer hover:text-gray-700 transition-colors"
                            onClick={() => togglePeriodSort('quota')}
                            title="เรียงตามที่นั่งว่าง"
                          >Book/โควต้า{sortIcon('quota')}</div>
                          <div className="w-[50px] shrink-0 text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap text-center">+/-</div>
                          <div className="w-[50px] shrink-0 text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap text-center">บันทึก</div>
                          <div className="w-[60px] shrink-0 text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap text-center">สถานะ</div>
                          {canEdit && <div className="flex gap-0.5 shrink-0 w-[44px]" />}
                        </div>
                        {/* Period Cards — w-full stretches to container */}
                        <div className="px-3 py-1.5 space-y-1 w-full">
                        {[...t.periods!].sort((a, b) => {
                          const dir = periodSort.dir === 'asc' ? 1 : -1;
                          if (periodSort.field === 'date')  return dir * ((a.start_date || '') < (b.start_date || '') ? -1 : 1);
                          if (periodSort.field === 'price') return dir * (a.price_per_seat - b.price_per_seat);
                          if (periodSort.field === 'quota') return dir * (a.quota - b.quota);
                          return 0;
                        }).map((p) => {
                          const pid = p.period_id;
                          const hasPending = pendingQuota[pid] !== undefined;
                          const currentQuota = hasPending ? pendingQuota[pid] : p.quota;
                          const isCancelled = !!p.cancelled;
                          const isFullDisplay = !isCancelled && currentQuota === 0;
                          const isFootnoteOpen = expandedPeriods.has(pid);
                          const bookedCount = p.total_seats - currentQuota;
                          const bookedPct = p.total_seats > 0 ? Math.round((bookedCount / p.total_seats) * 100) : 0;
                          const statusColor = isCancelled ? "#EF4444" : isFullDisplay ? "#9CA3AF" : "#16A34A";
                          const barBg = isCancelled ? "#EF4444" : isFullDisplay ? "#9CA3AF" : "#16A34A";

                          return (
                            <React.Fragment key={pid}>
                              {/* Period Card */}
                              <div
                                className={`rounded-xl overflow-hidden border ${hasPending ? "ring-1 ring-amber-300" : ""}`}
                                style={{
                                  borderColor: `${statusColor}30`,
                                  borderLeftWidth: "4px",
                                  borderLeftColor: statusColor,
                                  background: isCancelled ? "#FFF5F5" : hasPending ? "#FFFBEB" : "white",
                                }}
                              >
                                <div className="flex items-center gap-1 px-3 py-1 w-full">
                                {/* 1. Expand → footnote */}
                                <button
                                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 shrink-0 text-gray-400 transition-colors"
                                  onClick={() => togglePeriodExpand(pid)}
                                  title="แสดง footnote"
                                >
                                  {isFootnoteOpen
                                    ? <ChevronDown className="w-3 h-3" />
                                    : <ChevronRight className="w-3 h-3" />}
                                </button>

                                {/* 2. Period date range — w-[165px] + short year (69) for compact display */}
                                <div className="w-[165px] shrink-0 overflow-hidden">
                                  <div
                                    className={`text-xs font-semibold whitespace-nowrap overflow-hidden text-ellipsis ${isCancelled ? "line-through text-gray-400" : "text-gray-800"}`}
                                    title={`${p.start_date ? fmtThai(p.start_date) : (p.travel_date ?? "")}${p.end_date && p.end_date !== p.start_date ? ` – ${fmtThai(p.end_date)}` : ""}`}
                                  >
                                    {p.start_date ? fmtThaiShort(p.start_date) : p.travel_date}
                                    {p.end_date && p.end_date !== p.start_date ? ` – ${fmtThaiShort(p.end_date)}` : ""}
                                  </div>
                                </div>

                                {/* 3. Badge วัน/คืน */}
                                <div className="w-[56px] shrink-0 flex justify-center">
                                  {(p.days || p.nights) ? (
                                    <span className="text-[10px] text-white px-2 py-0.5 rounded-full font-semibold whitespace-nowrap" style={{background: "#1F2937"}}>
                                      {p.days}วัน {p.nights}คืน
                                    </span>
                                  ) : <span className="text-gray-300 text-[10px]">–</span>}
                                </div>

                                {/* 4. PROMO */}
                                <div className="w-8 text-center shrink-0 leading-none">
                                  {p.promo ? <span title="มีโปรโมชั่น" className="text-sm">🔥</span> : <span className="text-gray-200 text-xs">–</span>}
                                </div>

                                {/* 5. เดินทาง (airline code) */}
                                <div className="w-9 shrink-0 text-[11px] font-mono text-gray-600 text-center">
                                  {p.airline_code || <span className="text-gray-200">–</span>}
                                </div>

                                {/* separator */}
                                <div className="w-2 shrink-0 flex justify-center">
                                  <div className="w-px h-5 bg-gray-200" />
                                </div>

                                {/* 6. FREEDAY chip — "FD" abbreviated */}
                                <div className="w-9 shrink-0 flex justify-center" style={{opacity: isCancelled ? 0.5 : 1}}>
                                  {p.freeday
                                    ? <span className="text-[10px] text-white px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap" title="Freeday" style={{background: "#7C3AED"}}>FD</span>
                                    : <span className="text-gray-200 text-[10px]">–</span>}
                                </div>

                                {/* 7. ลงร้าน chip — "ร้าน" abbreviated */}
                                <div className="w-9 shrink-0 flex justify-center" style={{opacity: isCancelled ? 0.5 : 1}}>
                                  {p.shopping
                                    ? <span className="text-[10px] text-white px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap" title="ลงร้าน" style={{background: "#F59E0B"}}>ร้าน</span>
                                    : <span className="text-gray-200 text-[10px]">–</span>}
                                </div>

                                {/* 8. All-in chip */}
                                <div className="w-[62px] shrink-0 flex justify-center" style={{opacity: isCancelled ? 0.5 : 1}}>
                                  {p.all_in
                                    ? <span className="text-[10px] text-white px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap" title="จอง จ่าย จบ" style={{background: "#16A34A"}}>All-in</span>
                                    : <span className="text-gray-200 text-[10px]">–</span>}
                                </div>

                                {/* 9. VAT chip */}
                                <div className="w-[40px] shrink-0 flex justify-center" style={{opacity: isCancelled ? 0.5 : 1}}>
                                  {p.vat7
                                    ? <span className="text-[10px] text-white px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap" title="มีภาษีมูลค่าเพิ่ม 7%" style={{background: "#2563EB"}}>VAT</span>
                                    : <span className="text-gray-200 text-[10px]">–</span>}
                                </div>

                                {/* 10. ราคา — สีตามสถานะ: เขียว=ว่าง, แดง=ยกเลิก, เทา=ปิดกรุ๊ป */}
                                <div className="w-[60px] text-right shrink-0">
                                  <span className="font-bold text-sm" style={{
                                    color: isCancelled ? "#EF4444" : isFullDisplay ? "#9CA3AF" : "#16A34A"
                                  }}>{p.price_per_seat.toLocaleString()}</span>
                                  <span className="text-[9px] text-gray-400 ml-0.5">฿</span>
                                </div>

                                {/* 11. Progress bar — flex-1 matches header, fills remaining space */}
                                <div className="flex-1 min-w-[120px] max-w-[220px]">
                                  <div className="flex justify-between items-center mb-0.5">
                                    <span className={`text-[10px] font-semibold ${hasPending ? "text-amber-600" : "text-gray-600"}`}>
                                      จอง {bookedCount}<span className="font-normal text-gray-400">/{p.total_seats}</span>
                                    </span>
                                    {!isCancelled && (
                                      <span className={`text-[10px] font-semibold ${hasPending ? "text-amber-500" : "text-emerald-600"}`}>
                                        ว่าง {currentQuota}
                                      </span>
                                    )}
                                  </div>
                                  <div className="relative h-2.5 rounded-full overflow-hidden" style={{background: "#E5E7EB"}}>
                                    <div
                                      className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
                                      style={{width: `${bookedPct}%`, background: barBg}}
                                    />
                                    {bookedPct >= 20 && (
                                      <span className="absolute inset-y-0 left-1 flex items-center text-[8px] font-bold text-white">
                                        {bookedPct}%
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* 12. −/+ buttons (+ เพิ่มลูกค้า = ลด quota, − ลดลูกค้า = เพิ่ม quota) */}
                                {!isCancelled && canEdit ? (
                                  <div className="flex items-center gap-1 shrink-0 w-[50px]">
                                    <button
                                      className="w-6 h-6 rounded-full text-white flex items-center justify-center transition-all duration-150 disabled:opacity-30 hover:scale-110 shrink-0"
                                      style={{background: "#1F2937"}}
                                      disabled={currentQuota >= p.total_seats}
                                      title="ลดลูกค้า (คืนที่นั่ง)"
                                      onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.background = "#EF4444"; }}
                                      onMouseLeave={(e) => { e.currentTarget.style.background = "#1F2937"; }}
                                      onClick={() => setPendingQuota((prev) => ({ ...prev, [pid]: Math.min((prev[pid] ?? p.quota) + 1, p.total_seats) }))}
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <button
                                      className="w-6 h-6 rounded-full text-white flex items-center justify-center transition-all duration-150 disabled:opacity-30 hover:scale-110 shrink-0"
                                      style={{background: "#1F2937"}}
                                      disabled={currentQuota <= 0}
                                      title="เพิ่มลูกค้า (ลดที่นั่งว่าง)"
                                      onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.background = "#16A34A"; }}
                                      onMouseLeave={(e) => { e.currentTarget.style.background = "#1F2937"; }}
                                      onClick={() => setPendingQuota((prev) => ({ ...prev, [pid]: Math.max((prev[pid] ?? p.quota) - 1, 0) }))}
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : <div className="w-[50px] shrink-0" />}

                                {/* 13 & 14. Save / Cancel pending */}
                                <div className="flex items-center gap-0.5 w-[50px] shrink-0">
                                  {hasPending ? (
                                    <button
                                      className="w-7 h-7 flex items-center justify-center rounded-lg text-green-600 hover:bg-green-50 hover:text-green-700 transition-colors border border-green-200"
                                      title="บันทึกโควต้า"
                                      onClick={() => {
                                        const newQ = pendingQuota[pid];
                                        if (newQ === undefined) return;
                                        adjustPeriodQuota(t.id, pid, newQ - p.quota);
                                        setPendingQuota((prev) => { const n = { ...prev }; delete n[pid]; return n; });
                                        toast.success("อัปเดตโควต้าแล้ว");
                                      }}
                                    ><Save className="w-3.5 h-3.5" /></button>
                                  ) : <div className="w-7" />}
                                  {hasPending ? (
                                    <button
                                      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors border border-gray-200"
                                      title="ยกเลิกการแก้ไข"
                                      onClick={() => setPendingQuota((prev) => { const n = { ...prev }; delete n[pid]; return n; })}
                                    ><X className="w-3.5 h-3.5" /></button>
                                  ) : <div className="w-7" />}
                                </div>

                                {/* 15. สถานะ — badge */}
                                <div className="w-[60px] shrink-0 flex justify-center">
                                  {isCancelled ? (
                                    <span className="inline-flex flex-col items-center">
                                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 whitespace-nowrap">ยกเลิก</span>
                                      {p.cancel_reason && <span className="text-[9px] text-red-400 mt-0.5 text-center leading-tight max-w-[54px] truncate">*{p.cancel_reason}</span>}
                                    </span>
                                  ) : isFullDisplay ? (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 whitespace-nowrap">ปิดกรุ๊ป</span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-700 whitespace-nowrap">ว่าง</span>
                                  )}
                                </div>

                                {/* 16. Actions */}
                                {canEdit && (
                                  <div className="flex gap-0.5 shrink-0 w-[44px]">
                                    <Button size="icon" variant="ghost" className="h-6 w-6" title="แก้ไข / ยกเลิก" onClick={() => openEditPeriod(t.id, p)}>
                                      <Pencil className="w-3 h-3" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => {
                                      const booked = p.total_seats - p.quota;
                                      const ok = booked > 0
                                        ? confirm(`⚠️ Period นี้มีที่นั่งถูกจองแล้ว ${booked} ที่\n\nการลบจะทำให้ข้อมูลการจองหายทั้งหมด ไม่สามารถกู้คืนได้\n\nยืนยันการลบ Period นี้หรือไม่?`)
                                        : confirm("ลบ Period นี้?");
                                      if (ok) { deletePeriod(t.id, p.period_id); toast.success("ลบ Period แล้ว"); }
                                    }}>
                                      <Trash2 className="w-3 h-3 text-destructive/70" />
                                    </Button>
                                  </div>
                                )}
                                </div>
                              {/* Footnote — inside card */}
                              {isFootnoteOpen && (
                                <div className="px-9 py-2 text-xs space-y-1 border-t" style={{background: "#F9FAFB", borderColor: `${statusColor}20`}}>
                                  {p.footnote && <div className="text-gray-500 italic">*{p.footnote}</div>}
                                  {(p.tags ?? []).length > 0 && (
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-gray-400 text-[10px]">Tag:</span>
                                      {(p.tags ?? []).map((tag) => (
                                        <span key={tag} className="px-2 py-0.5 bg-white border border-gray-200 rounded-full text-[10px] text-gray-600">{tag}</span>
                                      ))}
                                    </div>
                                  )}
                                  {p.project && <div className="text-gray-400">โครงการ / Campaign: <span className="text-gray-600">{p.project}</span></div>}
                                  {p.note && <div className="text-gray-400">*หมายเหตุ: <span className="text-gray-600">{p.note}</span></div>}
                                  {!p.footnote && !(p.tags ?? []).length && !p.project && !p.note && (
                                    <span className="text-gray-300 text-[10px]">ยังไม่มีข้อมูลเพิ่มเติม</span>
                                  )}
                                </div>
                              )}
                              </div>{/* end card */}
                            </React.Fragment>
                          );
                        })}
                        </div>{/* end period cards wrapper */}

                        {/* Add Period button */}
                        {canEdit && (
                          <button
                            onClick={() => openAddPeriod(t.id)}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium transition-colors hover:bg-white"
                            style={{color, borderTop: `1px dashed ${color}30`}}
                          >
                            <Plus className="w-3.5 h-3.5" /> เพิ่ม Period ใหม่
                          </button>
                        )}
                      </div>{/* end desktop table */}
                    </>)}

                    {/* No-periods add button */}
                    {!hasPeriods && canEdit && (
                      <div className="px-10 pb-2.5 pt-0">
                        <button
                          onClick={() => openAddPeriod(t.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-dashed text-[11px] font-medium transition-colors hover:opacity-80"
                          style={{borderColor: `${color}50`, color: `${color}90`}}
                        >
                          <CalendarDays className="w-3 h-3" /> เพิ่ม Period แรก
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )
      )}

      {/* Empty state */}
      {filteredTours.length === 0 && (
        <div className="p-8 text-center text-muted-foreground bg-white border-t">
          {tours.length === 0 ? "ยังไม่มีโปรแกรมทัวร์" : "ไม่พบโปรแกรมที่ตรงกับตัวกรอง — ลองล้างตัวกรอง"}
        </div>
      )}

      {/* ── Program Dialog ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <PackageSearch className="w-4 h-4" style={{color: "#7C3AED"}} />
              {editId ? "แก้ไขโปรแกรมทัวร์" : "เพิ่มโปรแกรมทัวร์ใหม่"}
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[70vh] pr-1 space-y-4">

            {/* ── ชื่อโปรแกรม + รหัส ── */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-semibold">ชื่อโปรแกรมทัวร์ *</label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="เช่น ยุโรป 6 ประเทศ สวิส ฝรั่งเศส"
                  className="mt-0.5"
                />
              </div>
              <div>
                <label className="text-xs font-semibold">รหัสทัวร์</label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="HQO-TFU06-EU"
                  className="mt-0.5 font-mono text-xs"
                />
              </div>
            </div>

            {/* ── ระยะเวลา ── */}
            <div>
              <label className="text-xs font-semibold">ระยะเวลา</label>
              <div className="flex items-center gap-2 mt-0.5">
                <Input type="number" min={0} value={form.days}
                  onChange={(e) => setForm((f) => ({ ...f, days: e.target.value }))}
                  placeholder="6" className="w-20 text-center" />
                <span className="text-xs text-muted-foreground">วัน</span>
                <Input type="number" min={0} value={form.nights}
                  onChange={(e) => setForm((f) => ({ ...f, nights: e.target.value }))}
                  placeholder="5" className="w-20 text-center" />
                <span className="text-xs text-muted-foreground">คืน</span>
                {(form.days || form.nights) && (
                  <span className="text-xs font-semibold px-2 py-1 rounded-full text-white ml-1" style={{background: "#7C3AED"}}>
                    {form.days || 0} วัน {form.nights || 0} คืน
                  </span>
                )}
              </div>
            </div>

            {/* ── ประเภทการเดินทาง ── */}
            <div>
              <label className="text-xs font-semibold">ประเภทการเดินทาง *</label>
              <div className="flex gap-2 mt-1">
                {([
                  { value: "International Tour" as TourCategory, label: "✈️ ต่างประเทศ" },
                  { value: "Domestic"           as TourCategory, label: "🏠 ภายในประเทศ" },
                  { value: "Incentive"          as TourCategory, label: "🎯 Incentive" },
                ] as const).map(({ value, label }) => (
                  <button
                    key={value} type="button"
                    onClick={() => setForm((f) => ({ ...f, category: value }))}
                    className="flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-all"
                    style={form.category === value
                      ? {background: "#7C3AED", color: "#fff", borderColor: "#7C3AED"}
                      : {borderColor: "#E5E7EB", color: "#6B7280"}}
                  >{label}</button>
                ))}
              </div>
            </div>

            {/* ── ประเทศ ── */}
            <div>
              <label className="text-xs font-semibold">ประเทศ</label>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    className="pl-8"
                    value={form.country}
                    onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                    placeholder="ค้นหาประเทศ..."
                    list="country-list"
                  />
                  <datalist id="country-list">
                    {POPULAR_COUNTRIES.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>
                {form.country && detectContinent(form.country) && (
                  <span className="shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                    style={{background: "#EFF6FF", color: "#2563EB"}}>
                    🌍 {detectContinent(form.country)}
                  </span>
                )}
              </div>

              {/* ประเทศที่ 2 */}
              {form.country2 !== undefined && (
                <div className="mt-2">
                  {form.country2 === "" ? (
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, country2: " " }))}
                      className="text-xs font-medium flex items-center gap-1 transition-colors"
                      style={{color: "#7C3AED"}}
                    >
                      <Plus className="w-3 h-3" /> เพิ่มประเทศที่ 2
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                        <Input
                          className="pl-8"
                          value={form.country2.trim()}
                          onChange={(e) => setForm((f) => ({ ...f, country2: e.target.value }))}
                          placeholder="ประเทศที่ 2..."
                          list="country-list-2"
                          autoFocus
                        />
                        <datalist id="country-list-2">
                          {POPULAR_COUNTRIES.map((c) => <option key={c} value={c} />)}
                        </datalist>
                      </div>
                      {form.country2.trim() && detectContinent(form.country2.trim()) && (
                        <span className="shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                          style={{background: "#EFF6FF", color: "#2563EB"}}>
                          🌍 {detectContinent(form.country2.trim())}
                        </span>
                      )}
                      <button type="button"
                        onClick={() => setForm((f) => ({ ...f, country2: "" }))}
                        className="shrink-0 text-gray-400 hover:text-red-500 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── เมือง / จุดเด่น ── */}
            <div>
              <label className="text-xs font-semibold">เมือง / จุดเด่น</label>
              <Input
                className="mt-0.5"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                placeholder="โตเกียว, เซอร์แมท, ลูเซิร์น..."
              />
            </div>

            {/* ── ประเภททัวร์ chips ── */}
            <div>
              <label className="text-xs font-semibold">ประเภททัวร์</label>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {TOUR_TYPE_CHIPS.map((chip) => (
                  <button
                    key={chip} type="button"
                    onClick={() => setForm((f) => ({
                      ...f,
                      tourTypes: f.tourTypes.includes(chip)
                        ? f.tourTypes.filter((c) => c !== chip)
                        : [...f.tourTypes, chip],
                    }))}
                    className="px-2.5 py-1 rounded-full text-xs font-medium border transition-all"
                    style={form.tourTypes.includes(chip)
                      ? {background: "#7C3AED", color: "#fff", borderColor: "#7C3AED"}
                      : {borderColor: "#D1D5DB", color: "#6B7280"}}
                  >{chip}</button>
                ))}
                {/* custom types already added */}
                {form.tourTypes.filter((t) => !TOUR_TYPE_CHIPS.includes(t)).map((t) => (
                  <button key={t} type="button"
                    onClick={() => setForm((f) => ({ ...f, tourTypes: f.tourTypes.filter((c) => c !== t) }))}
                    className="px-2.5 py-1 rounded-full text-xs font-medium border flex items-center gap-1"
                    style={{background: "#1F2937", color: "#fff", borderColor: "#1F2937"}}>
                    {t} <X className="w-2.5 h-2.5" />
                  </button>
                ))}
              </div>
              {/* เพิ่มประเภทเอง */}
              <div className="flex items-center gap-1.5 mt-1.5">
                <Input
                  className="h-7 text-xs"
                  value={form.customType}
                  onChange={(e) => setForm((f) => ({ ...f, customType: e.target.value }))}
                  placeholder="พิมพ์ประเภทเพิ่มเติม..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && form.customType.trim()) {
                      e.preventDefault();
                      const val = form.customType.trim();
                      if (!form.tourTypes.includes(val))
                        setForm((f) => ({ ...f, tourTypes: [...f.tourTypes, val], customType: "" }));
                    }
                  }}
                />
                <Button type="button" size="icon" variant="outline" className="h-7 w-7 shrink-0"
                  onClick={() => {
                    const val = form.customType.trim();
                    if (val && !form.tourTypes.includes(val))
                      setForm((f) => ({ ...f, tourTypes: [...f.tourTypes, val], customType: "" }));
                  }}>
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* ── คำอธิบายเพิ่มเติม ── */}
            <div>
              <label className="text-xs font-semibold">คำอธิบายเพิ่มเติม</label>
              <textarea
                className="w-full mt-0.5 text-sm border rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Highlight หรือรายละเอียดย่อของโปรแกรม..."
              />
            </div>

            <p className="text-[10px] text-muted-foreground bg-muted/50 rounded px-2 py-1.5">
              💡 หลังเพิ่มโปรแกรมแล้ว กดปุ่ม "+ Period" เพื่อเพิ่มวันเดินทางและราคาแต่ละรอบ
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>ยกเลิก</Button>
            <Button onClick={submit} style={{background: "#16A34A", color: "#FFFFFF"}} className="hover:opacity-90">
              <Save className="w-3.5 h-3.5 mr-1.5" />บันทึกโปรแกรม
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Period Dialog — 2-column no-scroll layout ── */}
      <Dialog open={pOpen} onOpenChange={setPOpen}>
        <DialogContent className="max-w-[700px] p-0 gap-0">
          {/* Header */}
          <DialogHeader className="px-5 pt-4 pb-2.5 border-b">
            <DialogTitle className="flex items-center gap-2 text-sm">
              <CalendarDays className="w-4 h-4 text-primary" />
              {pEditId ? "แก้ไข Period" : "เพิ่ม Period ใหม่"}
              <span className="text-xs font-normal text-muted-foreground bg-muted rounded px-2 py-0.5">
                {tours.find((t) => t.id === pTourId)?.code}
              </span>
            </DialogTitle>
          </DialogHeader>

          {/* 2-column body — no scroll */}
          <div className="grid grid-cols-2 gap-0 divide-x">

            {/* ── LEFT: ข้อมูลพื้นฐาน ── */}
            <div className="px-4 py-3 space-y-2.5">
              {/* วันเดินทาง + วันกลับ */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">วันเดินทาง *</label>
                  <Input className="h-8 text-xs mt-0.5" type="date" value={pForm.start_date}
                    onChange={(e) => setPForm({ ...pForm, start_date: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">วันกลับ *</label>
                  <Input className="h-8 text-xs mt-0.5" type="date" value={pForm.end_date}
                    onChange={(e) => setPForm({ ...pForm, end_date: e.target.value })} min={pForm.start_date} />
                </div>
              </div>

              {/* Auto-calc */}
              {pForm.start_date && pForm.end_date && pForm.days ? (
                <div className="flex items-center gap-2 bg-primary/8 border border-primary/20 rounded-lg px-2.5 py-1.5">
                  <CalendarDays className="w-3 h-3 text-primary shrink-0" />
                  <span className="text-xs font-semibold text-primary">{pForm.days} วัน {pForm.nights} คืน</span>
                  <span className="text-[10px] text-muted-foreground">{fmtThai(pForm.start_date)} – {fmtThai(pForm.end_date)}</span>
                </div>
              ) : (
                <div className="h-7 rounded-lg border border-dashed border-gray-200 flex items-center justify-center">
                  <span className="text-[10px] text-gray-300">เลือกวันเดินทางและวันกลับ</span>
                </div>
              )}

              {/* ราคา + ที่นั่ง */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">ราคา/ที่นั่ง (฿) *</label>
                  <Input className="h-8 text-xs mt-0.5" type="number" min={0}
                    value={pForm.price_per_seat} onChange={(e) => setPForm({ ...pForm, price_per_seat: e.target.value })} placeholder="29500" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">ที่นั่งทั้งหมด *</label>
                  <Input className="h-8 text-xs mt-0.5" type="number" min={0}
                    value={pForm.total_seats} onChange={(e) => setPForm({ ...pForm, total_seats: e.target.value })} placeholder="20" />
                </div>
              </div>

              {/* สายการบิน + Campaign */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">สายการบิน</label>
                  <Input className="h-8 text-xs mt-0.5" value={pForm.airline_code}
                    onChange={(e) => setPForm({ ...pForm, airline_code: e.target.value })} placeholder="FD, TG, VZ..." />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Campaign</label>
                  <Input className="h-8 text-xs mt-0.5" value={pForm.project}
                    onChange={(e) => setPForm({ ...pForm, project: e.target.value })} placeholder="campaign name..." />
                </div>
              </div>

              {/* หมายเหตุ */}
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">หมายเหตุ</label>
                <Input className="h-8 text-xs mt-0.5" value={pForm.note}
                  onChange={(e) => setPForm({ ...pForm, note: e.target.value })} placeholder="วางที่นั่งแล้ว / ราคาพิเศษ..." />
              </div>
            </div>

            {/* ── RIGHT: ตัวเลือก / Tags / Footnote ── */}
            <div className="px-4 py-3 space-y-2.5 bg-muted/10">

              {/* Chip buttons */}
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">ตัวเลือก Chip</label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {([
                    { key: "promo"    as const, label: "🔥 Promotion", color: "#F59E0B" },
                    { key: "freeday"  as const, label: "Freeday",       color: "#7C3AED" },
                    { key: "shopping" as const, label: "ลงร้าน",        color: "#F59E0B" },
                    { key: "all_in"   as const, label: "จอง จ่าย จบ",  color: "#16A34A" },
                    { key: "vat7"     as const, label: "Vat7%",         color: "#2563EB" },
                  ] as const).map(({ key, label, color }) => (
                    <button key={key} type="button"
                      onClick={() => setPForm((f) => ({ ...f, [key]: !f[key] }))}
                      className="px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all"
                      style={pForm[key]
                        ? {background: color, color: "#fff", borderColor: color}
                        : {borderColor: "#E5E7EB", color: "#9CA3AF"}}
                    >{label}</button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Tag ประเภทโปรแกรม</label>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {CATEGORY_TAGS.map((tag) => (
                    <button key={tag} type="button"
                      onClick={() => setPForm((f) => ({
                        ...f, tags: f.tags.includes(tag) ? f.tags.filter((t) => t !== tag) : [...f.tags, tag],
                      }))}
                      className="px-1.5 py-0.5 rounded-full text-[10px] border transition-all"
                      style={pForm.tags.includes(tag)
                        ? {background: "#1F2937", color: "#fff", borderColor: "#1F2937"}
                        : {borderColor: "#E5E7EB", color: "#9CA3AF"}}
                    >{tag}</button>
                  ))}
                </div>
              </div>

              {/* Footnote */}
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Footnote (กด ▶ ขยายแถว)</label>
                <Input className="h-8 text-xs mt-1"
                  value={pForm.footnote}
                  onChange={(e) => setPForm((f) => ({ ...f, footnote: e.target.value }))}
                  placeholder="บริษัท ABC ประมาณ 10 ท่าน VIP..."
                />
              </div>
            </div>
          </div>

          {/* Bottom full-width: สถานะ (edit) + footer */}
          <div className="border-t px-5 py-2.5">
            <div className="flex items-center justify-between gap-3">
              {/* สถานะ Period — edit mode */}
              {pEditId ? (
                <div className={`flex items-center gap-3 flex-1 rounded-lg px-3 py-1.5 border ${pForm.cancelled ? "border-destructive/30 bg-destructive/5" : "border-border bg-muted/20"}`}>
                  <label className="text-xs font-semibold flex items-center gap-1.5 shrink-0">
                    <XCircle className="w-3.5 h-3.5 text-destructive" /> สถานะ
                  </label>
                  <button type="button"
                    onClick={() => setPForm((f) => ({ ...f, cancelled: !f.cancelled, cancel_reason: f.cancelled ? "" : f.cancel_reason }))}
                    className={`text-xs px-3 py-0.5 rounded-full font-semibold border transition-colors shrink-0 ${
                      pForm.cancelled
                        ? "bg-destructive text-white border-destructive"
                        : "bg-background border-border hover:border-destructive/50 hover:text-destructive"
                    }`}
                  >{pForm.cancelled ? "❌ ยกเลิกแล้ว" : "✅ เปิดอยู่"}</button>
                  {pForm.cancelled && (
                    <Select value={pForm.cancel_reason} onValueChange={(v) => setPForm({ ...pForm, cancel_reason: v })}>
                      <SelectTrigger className="h-7 text-xs border-destructive/30 flex-1">
                        <SelectValue placeholder="เลือกเหตุผล..." />
                      </SelectTrigger>
                      <SelectContent>
                        {CANCEL_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              ) : <div />}

              {/* Buttons */}
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={() => setPOpen(false)}>ยกเลิก</Button>
                <Button size="sm" onClick={submitPeriod}
                  style={pForm.cancelled ? {background: "#EF4444", color: "#fff"} : {background: "#16A34A", color: "#fff"}}
                  className="hover:opacity-90"
                >บันทึก</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ========= Car — ไม่มีโควต้า ========= */
const CAR_FIELDS: ExcelField[] = [
  { key: "name",         header: "ชื่อรถ",         example: "Toyota Commuter", required: true },
  { key: "type",         header: "ประเภท",          example: "Van" },
  { key: "total_seats",  header: "จำนวนที่นั่ง",   example: "12",   type: "number" },
  { key: "rate_per_day", header: "ราคา/วัน",        example: "2500", type: "number" },
  { key: "seat_material",header: "ประเภทเบาะ",      example: "หนัง" },
  { key: "note",         header: "หมายเหตุ",        example: "" },
];

function CarSection({ canEdit }: { canEdit: boolean }) {
  const cars = useServices((s) => s.cars);
  const addCar = useServices((s) => s.addCar);
  const updateCar = useServices((s) => s.updateCar);
  const deleteCar = useServices((s) => s.deleteCar);

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", type: "", total_seats: "", rate_per_day: "", seat_material: "ไม่ระบุ" as SeatMaterial, note: "" });

  const openAdd = () => { setEditId(null); setForm({ name: "", type: "", total_seats: "", rate_per_day: "", seat_material: "ไม่ระบุ", note: "" }); setOpen(true); };
  const openEdit = (id: string) => {
    const c = cars.find((x) => x.id === id); if (!c) return;
    setEditId(id);
    setForm({ name: c.name, type: c.type, total_seats: String(c.total_seats), rate_per_day: String(c.rate_per_day), seat_material: c.seat_material, note: c.note ?? "" });
    setOpen(true);
  };
  const submit = () => {
    if (!form.name) { toast.error("กรุณากรอกชื่อรถ"); return; }
    const payload = { name: form.name, type: form.type, total_seats: Number(form.total_seats || 0), rate_per_day: Number(form.rate_per_day || 0), seat_material: form.seat_material, note: form.note };
    if (editId) updateCar(editId, payload); else addCar(payload);
    toast.success(editId ? "อัปเดตแล้ว" : "เพิ่มรถใหม่แล้ว"); setOpen(false);
  };

  const exportData = useMemo(() =>
    cars.map((c) => ({ name: c.name, type: c.type, total_seats: c.total_seats, rate_per_day: c.rate_per_day, seat_material: c.seat_material, note: c.note ?? "" })), [cars]);

  const handleImport = (rows: Record<string, unknown>[]) => {
    rows.forEach((row) => addCar({
      name: String(row.name ?? ""), type: String(row.type ?? ""),
      total_seats: Number(row.total_seats ?? 0), rate_per_day: Number(row.rate_per_day ?? 0),
      seat_material: (row.seat_material as SeatMaterial) || "ผ้า", note: String(row.note ?? ""),
    }));
    toast.success(`นำเข้า ${rows.length} รถแล้ว`);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <p className="text-sm text-muted-foreground">รวม {cars.length} คัน</p>
          <p className="text-xs text-muted-foreground mt-0.5">🚗 บริการเช่ารถ — ไม่จำกัดโควต้า (Unlimited)</p>
        </div>
        <div className="flex items-center gap-2">
          <ImportExportMenu fields={CAR_FIELDS} sheetName="รถเช่า" filename="cars" data={exportData} onImport={handleImport} />
          {canEdit && <Button onClick={openAdd} className="bg-gradient-pink text-accent-foreground"><Plus className="w-4 h-4 mr-1" /> เพิ่มรถ</Button>}
        </div>
      </div>
      <div className="bg-card rounded-xl border shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="p-3 text-left">ชื่อรถ</th>
                <th className="p-3 text-left">ประเภท</th>
                <th className="p-3 text-center">ที่นั่ง</th>
                <th className="p-3 text-right">ราคา/วัน</th>
                <th className="p-3 text-left">เบาะ</th>
                <th className="p-3 text-left">หมายเหตุ</th>
                {canEdit && <th className="p-3"></th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {cars.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30">
                  <td className="p-3 font-semibold">{c.name}</td>
                  <td className="p-3">{c.type}</td>
                  <td className="p-3 text-center">{c.total_seats}</td>
                  <td className="p-3 text-right font-bold">{c.rate_per_day.toLocaleString()}</td>
                  <td className="p-3">{c.seat_material}</td>
                  <td className="p-3 text-xs text-muted-foreground">{c.note || "-"}</td>
                  {canEdit && (
                    <td className="p-3 text-right">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(c.id)}><Pencil className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => { if (confirm("ลบรถคันนี้?")) { deleteCar(c.id); toast.success("ลบแล้ว"); } }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </td>
                  )}
                </tr>
              ))}
              {cars.length === 0 && <tr><td colSpan={canEdit ? 7 : 6} className="p-8 text-center text-muted-foreground">ยังไม่มีรายการ</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "แก้ไขรถ" : "เพิ่มรถใหม่"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-semibold">ชื่อรถ</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Toyota Commuter" /></div>
            <div><label className="text-xs font-semibold">ประเภท</label><Input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder="SUV / Van / Sedan" /></div>
            <div><label className="text-xs font-semibold">จำนวนที่นั่ง</label><Input type="number" min={0} value={form.total_seats} onChange={(e) => setForm({ ...form, total_seats: e.target.value })} placeholder="12" /></div>
            <div><label className="text-xs font-semibold">ราคา/วัน</label><Input type="number" min={0} value={form.rate_per_day} onChange={(e) => setForm({ ...form, rate_per_day: e.target.value })} placeholder="2500" /></div>
            <div>
              <label className="text-xs font-semibold">ประเภทเบาะ</label>
              <Select value={form.seat_material} onValueChange={(v) => setForm({ ...form, seat_material: v as SeatMaterial })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SEAT_MATS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><label className="text-xs font-semibold">หมายเหตุ</label><Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>ยกเลิก</Button>
            <Button onClick={submit} className="bg-gradient-primary text-primary-foreground">บันทึก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ========= Booking (Flight/Hotel/Visa/Insurance) ========= */
function BookingSection({ canEdit }: { canEdit: boolean }) {
  return (
    <Tabs defaultValue="flight" className="space-y-3">
      <TabsList>
        <TabsTrigger value="flight"><Plane className="w-4 h-4 mr-1" /> ตั๋วเครื่องบิน</TabsTrigger>
        <TabsTrigger value="hotel"><Hotel className="w-4 h-4 mr-1" /> โรงแรม</TabsTrigger>
        <TabsTrigger value="visa"><FileBadge className="w-4 h-4 mr-1" /> Visa</TabsTrigger>
        <TabsTrigger value="insurance"><Shield className="w-4 h-4 mr-1" /> ประกันการเดินทาง</TabsTrigger>
      </TabsList>
      <TabsContent value="flight"><FlightSection canEdit={canEdit} /></TabsContent>
      <TabsContent value="hotel"><HotelSection canEdit={canEdit} /></TabsContent>
      <TabsContent value="visa"><VisaSection canEdit={canEdit} /></TabsContent>
      <TabsContent value="insurance"><InsuranceSection canEdit={canEdit} /></TabsContent>
    </Tabs>
  );
}

/* ---- Flight ---- */
const FLIGHT_FIELDS: ExcelField[] = [
  { key: "airline", header: "สายการบิน", example: "Thai Airways", required: true },
  { key: "route",   header: "เส้นทาง",   example: "BKK-HND" },
  { key: "note",    header: "หมายเหตุ",  example: "" },
];

function FlightSection({ canEdit }: { canEdit: boolean }) {
  const items = useServices((s) => s.flights);
  const add = useServices((s) => s.addFlight);
  const update = useServices((s) => s.updateFlight);
  const del = useServices((s) => s.deleteFlight);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [f, setF] = useState({ airline: "", route: "", note: "" });
  const openAdd = () => { setEditId(null); setF({ airline: "", route: "", note: "" }); setOpen(true); };
  const openEdit = (id: string) => { const x = items.find((i) => i.id === id); if (!x) return; setEditId(id); setF({ airline: x.airline, route: x.route, note: x.note ?? "" }); setOpen(true); };
  const submit = () => { if (!f.airline) { toast.error("ใส่ชื่อสายการบิน"); return; } editId ? update(editId, f) : add(f); toast.success("บันทึกแล้ว"); setOpen(false); };

  const exportData = useMemo(() => items.map((i) => ({ airline: i.airline, route: i.route, note: i.note ?? "" })), [items]);
  const handleImport = (rows: Record<string, unknown>[]) => {
    rows.forEach((row) => add({ airline: String(row.airline ?? ""), route: String(row.route ?? ""), note: String(row.note ?? "") }));
    toast.success(`นำเข้า ${rows.length} รายการแล้ว`);
  };

  return (
    <SimpleTable
      title="ตั๋วเครื่องบิน (Unlimited)"
      cols={["สายการบิน", "เส้นทาง", "หมายเหตุ"]}
      rows={items.map((i) => ({ id: i.id, cells: [i.airline, i.route, i.note || "-"] }))}
      canEdit={canEdit} onAdd={openAdd} onEdit={openEdit} onDelete={(id) => { del(id); toast.success("ลบแล้ว"); }}
      importExport={<ImportExportMenu fields={FLIGHT_FIELDS} sheetName="ตั๋วเครื่องบิน" filename="flights" data={exportData} onImport={handleImport} />}
      dialog={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? "แก้ไข" : "เพิ่ม"}ตั๋วเครื่องบิน</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><label className="text-xs font-semibold">สายการบิน</label><Input value={f.airline} onChange={(e) => setF({ ...f, airline: e.target.value })} /></div>
              <div><label className="text-xs font-semibold">เส้นทาง</label><Input value={f.route} onChange={(e) => setF({ ...f, route: e.target.value })} placeholder="BKK-HND" /></div>
              <div><label className="text-xs font-semibold">หมายเหตุ</label><Input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>ยกเลิก</Button><Button onClick={submit} className="bg-gradient-primary text-primary-foreground">บันทึก</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      }
    />
  );
}

/* ---- Hotel ---- */
const HOTEL_FIELDS: ExcelField[] = [
  { key: "name",    header: "ชื่อโรงแรม", example: "Mandarin Oriental", required: true },
  { key: "city",    header: "เมือง",       example: "Bangkok" },
  { key: "country", header: "ประเทศ",      example: "Thailand" },
  { key: "note",    header: "หมายเหตุ",   example: "" },
];

function HotelSection({ canEdit }: { canEdit: boolean }) {
  const items = useServices((s) => s.hotels);
  const add = useServices((s) => s.addHotel);
  const update = useServices((s) => s.updateHotel);
  const del = useServices((s) => s.deleteHotel);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [f, setF] = useState({ name: "", city: "", country: "", note: "" });
  const openAdd = () => { setEditId(null); setF({ name: "", city: "", country: "", note: "" }); setOpen(true); };
  const openEdit = (id: string) => { const x = items.find((i) => i.id === id); if (!x) return; setEditId(id); setF({ name: x.name, city: x.city, country: x.country, note: x.note ?? "" }); setOpen(true); };
  const submit = () => { if (!f.name) { toast.error("ใส่ชื่อโรงแรม"); return; } editId ? update(editId, f) : add(f); toast.success("บันทึกแล้ว"); setOpen(false); };

  const exportData = useMemo(() => items.map((i) => ({ name: i.name, city: i.city, country: i.country, note: i.note ?? "" })), [items]);
  const handleImport = (rows: Record<string, unknown>[]) => {
    rows.forEach((row) => add({ name: String(row.name ?? ""), city: String(row.city ?? ""), country: String(row.country ?? ""), note: String(row.note ?? "") }));
    toast.success(`นำเข้า ${rows.length} รายการแล้ว`);
  };

  return (
    <SimpleTable
      title="โรงแรม (Unlimited)"
      cols={["ชื่อโรงแรม", "เมือง", "ประเทศ", "หมายเหตุ"]}
      rows={items.map((i) => ({ id: i.id, cells: [i.name, i.city, i.country, i.note || "-"] }))}
      canEdit={canEdit} onAdd={openAdd} onEdit={openEdit} onDelete={(id) => { del(id); toast.success("ลบแล้ว"); }}
      importExport={<ImportExportMenu fields={HOTEL_FIELDS} sheetName="โรงแรม" filename="hotels" data={exportData} onImport={handleImport} />}
      dialog={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? "แก้ไข" : "เพิ่ม"}โรงแรม</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className="text-xs font-semibold">ชื่อโรงแรม</label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
              <div><label className="text-xs font-semibold">เมือง</label><Input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></div>
              <div><label className="text-xs font-semibold">ประเทศ</label><Input value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })} /></div>
              <div className="col-span-2"><label className="text-xs font-semibold">หมายเหตุ</label><Input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>ยกเลิก</Button><Button onClick={submit} className="bg-gradient-primary text-primary-foreground">บันทึก</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      }
    />
  );
}

/* ---- Visa ---- */
const VISA_FIELDS: ExcelField[] = [
  { key: "visa_type", header: "ประเภทวีซ่า", example: "TR",       required: true },
  { key: "country",   header: "ประเทศ",       example: "ญี่ปุ่น", required: true },
  { key: "note",      header: "หมายเหตุ",     example: "" },
];

function VisaSection({ canEdit }: { canEdit: boolean }) {
  const items = useServices((s) => s.visas);
  const add = useServices((s) => s.addVisa);
  const update = useServices((s) => s.updateVisa);
  const del = useServices((s) => s.deleteVisa);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [f, setF] = useState({ visa_type: "TR" as VisaType, country: "", note: "" });
  const openAdd = () => { setEditId(null); setF({ visa_type: "TR", country: "", note: "" }); setOpen(true); };
  const openEdit = (id: string) => { const x = items.find((i) => i.id === id); if (!x) return; setEditId(id); setF({ visa_type: x.visa_type, country: x.country, note: x.note ?? "" }); setOpen(true); };
  const submit = () => { if (!f.country) { toast.error("ใส่ประเทศ"); return; } editId ? update(editId, f) : add(f); toast.success("บันทึกแล้ว"); setOpen(false); };
  const VISA_DESC: Record<VisaType, string> = {
    "TR": "วีซ่าท่องเที่ยว", "TS": "วีซ่าผ่านทาง", "Non-Immigrant": "วีซ่าทำงาน/ธุรกิจ",
    "O": "วีซ่าคู่สมรส", "ED": "วีซ่าการศึกษา", "O-A": "วีซ่าเกษียณอายุ (O-A)", "O-X": "วีซ่าเกษียณอายุ (O-X)",
  };

  const exportData = useMemo(() => items.map((i) => ({ visa_type: i.visa_type, country: i.country, note: i.note ?? "" })), [items]);
  const handleImport = (rows: Record<string, unknown>[]) => {
    rows.forEach((row) => add({ visa_type: (row.visa_type as VisaType) || "TR", country: String(row.country ?? ""), note: String(row.note ?? "") }));
    toast.success(`นำเข้า ${rows.length} รายการแล้ว`);
  };

  return (
    <SimpleTable
      title="Visa (Unlimited)"
      cols={["ประเภท", "ประเทศ", "หมายเหตุ"]}
      rows={items.map((i) => ({ id: i.id, cells: [`${i.visa_type} · ${VISA_DESC[i.visa_type]}`, i.country, i.note || "-"] }))}
      canEdit={canEdit} onAdd={openAdd} onEdit={openEdit} onDelete={(id) => { del(id); toast.success("ลบแล้ว"); }}
      importExport={<ImportExportMenu fields={VISA_FIELDS} sheetName="Visa" filename="visas" data={exportData} onImport={handleImport} />}
      dialog={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? "แก้ไข" : "เพิ่ม"} Visa</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold">ประเภท</label>
                <Select value={f.visa_type} onValueChange={(v) => setF({ ...f, visa_type: v as VisaType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{VISA_TYPES.map((v) => <SelectItem key={v} value={v}>{v} · {VISA_DESC[v]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><label className="text-xs font-semibold">ประเทศ</label><Input value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })} /></div>
              <div className="col-span-2"><label className="text-xs font-semibold">หมายเหตุ</label><Input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>ยกเลิก</Button><Button onClick={submit} className="bg-gradient-primary text-primary-foreground">บันทึก</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      }
    />
  );
}

/* ---- Insurance ---- */
const INSURANCE_FIELDS: ExcelField[] = [
  { key: "plan_name", header: "ชื่อแผน", example: "แผน A",           required: true },
  { key: "coverage",  header: "วงเงิน",  example: "1,000,000 THB" },
  { key: "price",     header: "ราคา",    example: "350",             type: "number" },
  { key: "note",      header: "หมายเหตุ",example: "" },
];

function InsuranceSection({ canEdit }: { canEdit: boolean }) {
  const items = useServices((s) => s.insurances);
  const add = useServices((s) => s.addInsurance);
  const update = useServices((s) => s.updateInsurance);
  const del = useServices((s) => s.deleteInsurance);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [f, setF] = useState({ plan_name: "", coverage: "", price: "", note: "" });
  const openAdd = () => { setEditId(null); setF({ plan_name: "", coverage: "", price: "", note: "" }); setOpen(true); };
  const openEdit = (id: string) => { const x = items.find((i) => i.id === id); if (!x) return; setEditId(id); setF({ plan_name: x.plan_name, coverage: x.coverage, price: String(x.price), note: x.note ?? "" }); setOpen(true); };
  const submit = () => { if (!f.plan_name) { toast.error("ใส่ชื่อแผน"); return; } const p = { ...f, price: Number(f.price || 0) }; editId ? update(editId, p) : add(p); toast.success("บันทึกแล้ว"); setOpen(false); };

  const exportData = useMemo(() => items.map((i) => ({ plan_name: i.plan_name, coverage: i.coverage, price: i.price, note: i.note ?? "" })), [items]);
  const handleImport = (rows: Record<string, unknown>[]) => {
    rows.forEach((row) => add({ plan_name: String(row.plan_name ?? ""), coverage: String(row.coverage ?? ""), price: Number(row.price ?? 0), note: String(row.note ?? "") }));
    toast.success(`นำเข้า ${rows.length} รายการแล้ว`);
  };

  return (
    <SimpleTable
      title="ประกันการเดินทาง (Unlimited)"
      cols={["แผน", "วงเงิน", "ราคา", "หมายเหตุ"]}
      rows={items.map((i) => ({ id: i.id, cells: [i.plan_name, i.coverage, i.price.toLocaleString(), i.note || "-"] }))}
      canEdit={canEdit} onAdd={openAdd} onEdit={openEdit} onDelete={(id) => { del(id); toast.success("ลบแล้ว"); }}
      importExport={<ImportExportMenu fields={INSURANCE_FIELDS} sheetName="ประกัน" filename="insurances" data={exportData} onImport={handleImport} />}
      dialog={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? "แก้ไข" : "เพิ่ม"}ประกัน</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className="text-xs font-semibold">ชื่อแผน</label><Input value={f.plan_name} onChange={(e) => setF({ ...f, plan_name: e.target.value })} /></div>
              <div><label className="text-xs font-semibold">วงเงิน</label><Input value={f.coverage} onChange={(e) => setF({ ...f, coverage: e.target.value })} placeholder="1,000,000 THB" /></div>
              <div><label className="text-xs font-semibold">ราคา</label><Input type="number" min={0} value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} placeholder="350" /></div>
              <div className="col-span-2"><label className="text-xs font-semibold">หมายเหตุ</label><Input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>ยกเลิก</Button><Button onClick={submit} className="bg-gradient-primary text-primary-foreground">บันทึก</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      }
    />
  );
}

/* ========= Reusable simple table ========= */
interface SimpleTableProps {
  title: string;
  cols: string[];
  rows: { id: string; cells: React.ReactNode[] }[];
  canEdit: boolean;
  onAdd: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  dialog: React.ReactNode;
  importExport?: React.ReactNode;
}
function SimpleTable({ title, cols, rows, canEdit, onAdd, onEdit, onDelete, dialog, importExport }: SimpleTableProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm text-muted-foreground">{title} · {rows.length} รายการ</p>
        <div className="flex items-center gap-2">
          {importExport}
          {canEdit && <Button onClick={onAdd} className="bg-gradient-pink text-accent-foreground"><Plus className="w-4 h-4 mr-1" /> เพิ่ม</Button>}
        </div>
      </div>
      <div className="bg-card rounded-xl border shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                {cols.map((c) => <th key={c} className="p-3 text-left">{c}</th>)}
                {canEdit && <th className="p-3"></th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-muted/30">
                  {r.cells.map((c, i) => <td key={i} className="p-3">{c}</td>)}
                  {canEdit && (
                    <td className="p-3 text-right whitespace-nowrap">
                      <Button size="icon" variant="ghost" onClick={() => onEdit(r.id)}><Pencil className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => { if (confirm("ลบรายการนี้?")) onDelete(r.id); }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </td>
                  )}
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={cols.length + (canEdit ? 1 : 0)} className="p-8 text-center text-muted-foreground">ยังไม่มีรายการ</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {dialog}
    </div>
  );
}
