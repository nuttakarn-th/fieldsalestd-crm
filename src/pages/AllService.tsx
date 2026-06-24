import React, { useMemo, useState, useEffect } from "react";
import { PackageSearch, Plus, Pencil, Trash2, Plane, Car, Hotel, FileBadge, Shield, MapPinned, Lock, Minus, ChevronDown, ChevronRight, CalendarDays, XCircle, AlertTriangle, FileUp, Globe, GlobeLock, FileX, Search, Save, X, SlidersHorizontal, MoreVertical, Info, FileText, AlertCircle, CheckSquare } from "lucide-react";
import { PageHelp } from "@/components/PageHelp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

// ── normalize category string จาก Excel → TourCategory ─────────────────────
// Excel อาจส่ง "Domestic Tour" / "domestic" / "ภายในประเทศ" ฯลฯ
function normalizeTourCat(raw: string): TourCategory {
  const s = raw.trim().toLowerCase();
  if (s.startsWith("domestic") || s.includes("ในประเทศ") || s.includes("ภายใน")) return "Domestic";
  if (s.startsWith("incentive") || s.includes("กรุ๊ป"))                           return "Incentive";
  return "International Tour";
}

/* ========= Tour ========= */
const TOUR_FIELDS: ExcelField[] = [
  { key: "category",       header: "ประเภท",                    example: "International Tour" },
  { key: "code",           header: "รหัสทัวร์",                 example: "HQO-KMG04", required: true },
  { key: "city",           header: "เมือง / เส้นทาง",          example: "คุนหมิง",   required: true },
  { key: "country",        header: "ประเทศ",                    example: "จีน" },
  { key: "start_date",     header: "วันเดินทาง (DD-MM-YYYY)",  example: "01-07-2026", type: "date" as const },
  { key: "end_date",       header: "วันกลับ (DD-MM-YYYY)",     example: "06-07-2026", type: "date" as const },
  { key: "nights",         header: "จำนวนคืน",                 example: "5",         type: "number" as const },
  { key: "days",           header: "จำนวนวัน",                 example: "6",         type: "number" as const },
  { key: "price_per_seat", header: "ราคา/ที่นั่ง (฿)",         example: "25900",     type: "number" as const },
  { key: "special_price",  header: "ราคาพิเศษ (฿)",            example: "23900",     type: "number" as const },
  { key: "total_seats",    header: "จำนวนที่นั่ง",             example: "20",        type: "number" as const },
  { key: "airline_code",   header: "สายการบิน",                example: "FD" },
  { key: "departure_city", header: "บิน (CNX/DMK/BKK)",        example: "CNX" },
  { key: "freeday",        header: "Free Day (TRUE/FALSE)",     example: "FALSE" },
  { key: "shopping",       header: "ลงร้าน (TRUE/FALSE)",      example: "FALSE" },
  { key: "all_in",         header: "จอง จ่าย จบ (TRUE/FALSE)", example: "FALSE" },
  { key: "vat7",           header: "รวม VAT7% (TRUE/FALSE)",   example: "FALSE" },
  { key: "cancelled",      header: "ยกเลิก (TRUE/FALSE)",      example: "FALSE" },
  { key: "cancel_reason",  header: "เหตุผลยกเลิก",             example: "" },
  { key: "project",        header: "โครงการ / Campaign",       example: "" },
  { key: "footnote",       header: "หมายเหตุย่อ",              example: "" },
  { key: "tags",           header: "Tag (คั่นด้วย ,)",          example: "ครอบครัว,ธรรมชาติ" },
  { key: "note",           header: "หมายเหตุ",                 example: "ซากุระบาน" },
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
  manualNights: false,   // true = user overrode auto-calc
  price_per_seat: "",
  special_price: "",        // ราคาพิเศษ — เมื่อกรอก 🔥 auto-on
  total_seats: "",
  airline_code: "",
  departure_city: "" as "" | "CNX" | "DMK" | "BKK",
  project: "",
  note: "",
  cancelled: false,
  cancel_reason: "",
  // Phase 1+2 UI fields
  freeday: false,
  shopping: false,
  all_in: false,
  vat7: false,
  seat_hold: false,
  promo: false,
  footnote: "",
  tags: [] as string[],
});

function TourSection({ canEdit }: { canEdit: boolean }) {
  const tours                  = useServices((s) => s.tours);
  const isLoadingTours         = useServices((s) => s.isLoadingTours);
  const addTour                = useServices((s) => s.addTour);
  const updateTour             = useServices((s) => s.updateTour);
  const deleteTour             = useServices((s) => s.deleteTour);
  const addPeriod              = useServices((s) => s.addPeriod);
  const updatePeriod           = useServices((s) => s.updatePeriod);
  const deletePeriod           = useServices((s) => s.deletePeriod);
  const uploadTourPDF          = useServices((s) => s.uploadTourPDF);
  const deleteTourPDF          = useServices((s) => s.deleteTourPDF);
  const togglePublish          = useServices((s) => s.togglePublish);
  const adjustPeriodQuota      = useServices((s) => s.adjustPeriodQuota);
  const subscribeToursRealtime = useServices((s) => s.subscribeToursRealtime);
  const currentUser            = useCurrentUser();
  const actorName              = currentUser?.full_name || currentUser?.username || "ไม่ระบุ";
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  // ── Subscribe Supabase Realtime เมื่อ component mount ──
  useEffect(() => {
    const unsub = subscribeToursRealtime();
    return unsub;
  }, [subscribeToursRealtime]);

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

  // ── tour type chip collapse (dialog) ──
  const [showAllChips, setShowAllChips] = useState(false);
  const togglePeriodExpand = (id: string) =>
    setExpandedPeriods((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  // ── filter state ──
  const [filterText, setFilterText]       = useState("");
  const [filterCat, setFilterCat]         = useState<TourCategory | "">("");
  const [filterCountry, setFilterCountry] = useState("");
  const [filterStatus, setFilterStatus]   = useState<"" | "ว่าง" | "ปิดกรุ๊ป" | "ยกเลิก">("");
  const [filterPromo, setFilterPromo]     = useState(false);
  const [filterSeatHold, setFilterSeatHold] = useState(false);
  const [filterTags, setFilterTags]       = useState<string[]>([]);
  const [filterOpen, setFilterOpen]       = useState(false);
  // ── date range filter (period travel date) ──
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo,   setFilterDateTo]   = useState("");
  // ── bulk selection (period_id set) ──
  const [selectedPeriods, setSelectedPeriods] = useState<Set<string>>(new Set());
  // ── import error reporting ──
  const [importErrors, setImportErrors] = useState<{row: number; code: string; issue: string}[]>([]);

  // ── period sort state ──
  const [periodSort, setPeriodSort] = useState<{field: 'date'|'price'|'quota'; dir: 'asc'|'desc'}>({field: 'date', dir: 'asc'});
  const togglePeriodSort = (field: 'date'|'price'|'quota') =>
    setPeriodSort((prev) => prev.field === field ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'asc' });
  const sortIcon = (field: 'date'|'price'|'quota') =>
    periodSort.field === field ? (periodSort.dir === 'asc' ? ' ↑' : ' ↓') : '';

  // ── import preview state ──
  const [importPreviewData, setImportPreviewData] = useState<{
    rows: Record<string, unknown>[];
    toCreate: number;
    toUpdate: number;
    preview: {
      code: string;
      action: "สร้างใหม่" | "เพิ่ม Period";
      city?: string;
      country?: string;
      start_date?: string;
      price_per_seat?: number;
      total_seats?: number;
      airline_code?: string;
    }[];
  } | null>(null);

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
  const openAdd = () => { setEditId(null); setForm(blankTourForm()); setShowAllChips(false); setOpen(true); };
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
      updateTour(editId, { ...payload, updated_by: actorName });
    } else {
      addTour({ ...payload, period: "", price_per_seat: 0, total_seats: 0, quota: 0, periods: [], created_by: actorName, updated_by: actorName });
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
      manualNights: false,   // reset to auto on open; user can override
      price_per_seat: String(p.price_per_seat),
      special_price: p.special_price ? String(p.special_price) : "",
      total_seats: String(p.total_seats),
      airline_code: p.airline_code ?? "",
      departure_city: (p.departure_city ?? "") as "" | "CNX" | "DMK" | "BKK",
      project: p.project ?? "",
      note: p.note ?? "",
      cancelled: p.cancelled ?? false,
      cancel_reason: p.cancel_reason ?? "",
      freeday: p.freeday ?? false,
      shopping: p.shopping ?? false,
      all_in: p.all_in ?? false,
      vat7: p.vat7 ?? false,
      seat_hold: p.seat_hold ?? false,
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
    const now = new Date().toISOString();
    const existingPeriod = pEditId
      ? tours.find((t) => t.id === pTourId)?.periods?.find((p) => p.period_id === pEditId)
      : undefined;
    const payload: Omit<TourPeriod, "period_id"> = {
      start_date: pForm.start_date,
      end_date: pForm.end_date || undefined,
      nights: pForm.nights ? Number(pForm.nights) : undefined,
      days: pForm.days ? Number(pForm.days) : undefined,
      travel_date: travelDate,
      price_per_seat: Number(pForm.price_per_seat || 0),
      special_price: pForm.special_price ? Number(pForm.special_price) : undefined,
      total_seats: seats,
      quota: pEditId ? (existingPeriod?.quota ?? seats) : seats,
      airline_code: pForm.airline_code || undefined,
      departure_city: pForm.departure_city || undefined,
      project: pForm.project || undefined,
      note: pForm.note || undefined,
      cancelled: pForm.cancelled || undefined,
      cancel_reason: pForm.cancelled ? (pForm.cancel_reason || undefined) : undefined,
      freeday: pForm.freeday || undefined,
      shopping: pForm.shopping || undefined,
      all_in: pForm.all_in || undefined,
      vat7: pForm.vat7 || undefined,
      seat_hold: pForm.seat_hold || undefined,
      promo: pForm.promo || undefined,
      footnote: pForm.footnote || undefined,
      tags: pForm.tags.length > 0 ? pForm.tags : undefined,
      // ── Audit trail ──
      updated_by: actorName,
      updated_at: now,
      created_by: pEditId ? (existingPeriod?.created_by ?? actorName) : actorName,
      created_at: pEditId ? (existingPeriod?.created_at ?? now) : now,
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

  // Auto-calc days/nights when period start/end date changes — skipped if user overrode manually
  React.useEffect(() => {
    if (pForm.manualNights) return;   // user is in manual mode — don't overwrite
    if (pForm.start_date && pForm.end_date) {
      const s = new Date(pForm.start_date); const e = new Date(pForm.end_date);
      if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e >= s) {
        const nights = Math.round((e.getTime() - s.getTime()) / 86400000);
        setPForm((f) => ({ ...f, nights: String(nights), days: String(nights + 1) }));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pForm.start_date, pForm.end_date, pForm.manualNights]);

  const exportData = useMemo(() => {
    const rows: Record<string, unknown>[] = [];
    tours.forEach((t) => {
      const periods = t.periods ?? [];
      if (periods.length > 0) {
        periods.forEach((p) => {
          rows.push({
            category:      t.category,
            code:          t.code,
            city:          t.city,
            country:       t.country,
            start_date:    p.start_date ?? "",
            end_date:      p.end_date ?? "",
            nights:        p.nights ?? "",
            days:          p.days ?? "",
            price_per_seat: p.price_per_seat,
            special_price: p.special_price ?? "",
            total_seats:   p.total_seats,
            airline_code:  p.airline_code ?? "",
            departure_city: p.departure_city ?? "",
            freeday:       p.freeday ? "TRUE" : "FALSE",
            shopping:      p.shopping ? "TRUE" : "FALSE",
            all_in:        p.all_in ? "TRUE" : "FALSE",
            vat7:          p.vat7 ? "TRUE" : "FALSE",
            cancelled:     p.cancelled ? "TRUE" : "FALSE",
            cancel_reason: p.cancel_reason ?? "",
            project:       p.project ?? "",
            footnote:      p.footnote ?? "",
            tags:          (p.tags ?? []).join(", "),
            note:          p.note ?? t.note ?? "",
          });
        });
      } else {
        rows.push({
          category:      t.category,
          code:          t.code,
          city:          t.city,
          country:       t.country,
          start_date:    "", end_date:  "",
          nights:        "", days:      "",
          price_per_seat: t.price_per_seat,
          special_price: "",
          total_seats:   t.total_seats,
          airline_code:  "", departure_city: "", freeday: "FALSE", shopping: "FALSE",
          all_in: "FALSE", vat7: "FALSE", cancelled: "FALSE",
          cancel_reason: "", project: "", footnote: "", tags: "",
          note: t.note ?? "",
        });
      }
    });
    return rows;
  }, [tours]);
  const handleImport = (rows: Record<string, unknown>[]) => {
    const parseBool = (v: unknown) => String(v).toUpperCase() === "TRUE";
    const errors: {row: number; code: string; issue: string}[] = [];

    // ── validate each row before processing ──
    rows.forEach((row, idx) => {
      const rowNum = idx + 2; // Excel row (header = 1)
      const code = String(row.code ?? "").trim();
      if (!code) {
        errors.push({ row: rowNum, code: "–", issue: "ไม่มีรหัสทัวร์ (code)" });
        return;
      }
      if (!row.price_per_seat || Number(row.price_per_seat) <= 0) {
        errors.push({ row: rowNum, code, issue: "ราคา/ที่นั่ง ว่างหรือ 0" });
      }
      if (!row.total_seats || Number(row.total_seats) <= 0) {
        errors.push({ row: rowNum, code, issue: "จำนวนที่นั่ง ว่างหรือ 0" });
      }
      if (row.start_date) {
        const d = String(row.start_date).trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
          errors.push({ row: rowNum, code, issue: `วันเดินทาง format ผิด: "${d}" (ต้องการ YYYY-MM-DD หรือ DD-MM-YYYY)` });
        }
      }
    });

    const buildPeriod = (row: Record<string, unknown>) => {
      const seats = Number(row.total_seats ?? 0);
      return {
        start_date:    String(row.start_date ?? ""),
        end_date:      String(row.end_date ?? ""),
        nights:        row.nights ? Number(row.nights) : undefined,
        days:          row.days   ? Number(row.days)   : undefined,
        travel_date:   String(row.start_date ?? ""),
        price_per_seat: Number(row.price_per_seat ?? 0),
        special_price: row.special_price ? Number(row.special_price) : undefined,
        total_seats:   seats,
        quota:         seats,
        airline_code:  String(row.airline_code ?? "") || undefined,
        departure_city: String(row.departure_city ?? "") || undefined,
        project:       String(row.project ?? "") || undefined,
        footnote:      String(row.footnote ?? "") || undefined,
        note:          String(row.note ?? "") || undefined,
        freeday:       parseBool(row.freeday),
        shopping:      parseBool(row.shopping),
        all_in:        parseBool(row.all_in),
        vat7:          parseBool(row.vat7),
        cancelled:     parseBool(row.cancelled),
        cancel_reason: String(row.cancel_reason ?? "") || undefined,
        tags:          row.tags ? String(row.tags).split(",").map((s) => s.trim()).filter(Boolean) : [],
      };
    };

    // ── group rows by code ── (แก้ bug: rows เดียวกัน code → สร้างซ้ำ เพราะ store ยัง update ไม่ทัน)
    const grouped = new Map<string, Record<string, unknown>[]>();
    rows.forEach((row) => {
      const code = String(row.code ?? "").trim();
      if (!code) return;
      if (!grouped.has(code)) grouped.set(code, []);
      grouped.get(code)!.push(row);
    });

    let created = 0; let periodsAdded = 0;

    grouped.forEach((codeRows, code) => {
      const existing = tours.find((t) => t.code === code);
      const firstRow = codeRows[0];
      const periodRows = codeRows.filter((r) => !!(r.start_date || r.price_per_seat));

      if (!existing) {
        // สร้างทัวร์ใหม่ครั้งเดียว และรับ ID กลับมาเพื่อ addPeriod ต่อ
        const seats = Number(firstRow.total_seats ?? 0);
        const newId = addTour({
          category:       normalizeTourCat(String(firstRow.category ?? "")),
          code,
          title:          String(firstRow.city ?? ""),
          city:           String(firstRow.city ?? ""),
          country:        String(firstRow.country ?? ""),
          continent:      detectContinent(String(firstRow.country ?? "")),
          period:         "",
          duration:       "",
          price_per_seat: Number(firstRow.price_per_seat ?? 0),
          total_seats:    seats,
          quota:          seats,
          note:           String(firstRow.note ?? ""),
          periods:        [],
        });
        created++;
        // เพิ่ม periods ทุก row ของ code นี้ โดยใช้ ID ที่เพิ่งสร้าง
        periodRows.forEach((row) => { addPeriod(newId, buildPeriod(row)); periodsAdded++; });
      } else {
        // ทัวร์มีอยู่แล้ว → เพิ่ม period เข้าไป
        periodRows.forEach((row) => { addPeriod(existing.id, buildPeriod(row)); periodsAdded++; });
      }
    });
    const msg = [
      created    && `สร้างใหม่ ${created} โปรแกรม`,
      periodsAdded && `เพิ่ม ${periodsAdded} Period`,
    ].filter(Boolean).join(", ");
    toast.success(`Import สำเร็จ — ${msg}`);
    if (errors.length > 0) {
      setImportErrors(errors);
      toast.warning(`พบ ${errors.length} แถวที่มีปัญหา — ดูรายละเอียดด้านล่าง`);
    }
  };

  // ── import preview — แสดง dialog ก่อน import จริง ──
  const handleImportPreview = (rows: Record<string, unknown>[]) => {
    // seenInBatch ช่วยให้รู้ว่า code นี้เพิ่งเห็นในไฟล์นี้แล้ว (ยังไม่อยู่ใน store)
    const seenInBatch = new Set<string>();
    const preview = rows.flatMap((row) => {
      const code = String(row.code ?? "").trim();
      if (!code) return [];
      const existsInStore = !!tours.find((t) => t.code === code);
      const isNewInBatch  = !existsInStore && !seenInBatch.has(code);
      // ครั้งแรกของ code ใหม่ = "สร้างใหม่", ครั้งถัดไป = "เพิ่ม Period"
      const action = (existsInStore || seenInBatch.has(code))
        ? ("เพิ่ม Period" as const)
        : ("สร้างใหม่" as const);
      seenInBatch.add(code);
      const extra = {
        city:           String(row.city ?? row["เมือง / เส้นทาง"] ?? "").trim() || undefined,
        country:        String(row.country ?? row["ประเทศ"] ?? "").trim() || undefined,
        start_date:     row.start_date ? String(row.start_date).trim() : undefined,
        price_per_seat: row.price_per_seat ? Number(row.price_per_seat) : undefined,
        total_seats:    row.total_seats ? Number(row.total_seats) : undefined,
        airline_code:   row.airline_code ? String(row.airline_code).trim() : undefined,
      };
      // ข้ามแถวที่ไม่มีทั้ง code ใหม่ และไม่มี period data (เช่น แถวที่ code ซ้ำและ data ว่าง)
      const hasPeriodData = !!(row.start_date || row.price_per_seat);
      if (!isNewInBatch && !hasPeriodData) return [];
      return [{ code, action, ...extra }];
    });
    // นับ unique programs ที่สร้างใหม่ (ไม่นับซ้ำ)
    const newProgramCodes = new Set(preview.filter((x) => x.action === "สร้างใหม่").map((x) => x.code));
    const toCreate = newProgramCodes.size;
    const toUpdate = preview.filter((x) => x.action === "เพิ่ม Period").length;
    setImportPreviewData({ rows, toCreate, toUpdate, preview });
  };

  // ── Export PDF (print-ready A4, font Kanit) ──
  const exportStockPDF = () => {
    const today = new Date().toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });

    // ── summary stats ──
    const totalPrograms = filteredTours.length;
    const allActivePeriods = filteredTours.flatMap(t => (t.periods ?? []).filter(p => !p.cancelled));
    const totalPeriods = allActivePeriods.length;
    const totalSeats = allActivePeriods.reduce((s, p) => s + (p.total_seats || 0), 0);
    const bookedSeats = allActivePeriods.reduce((s, p) => s + Math.max(0, (p.total_seats || 0) - (p.quota || 0)), 0);
    const lowStockCount = allActivePeriods.filter(p => p.quota > 0 && p.quota <= 3).length;
    const bookingRate = totalSeats > 0 ? Math.round((bookedSeats / totalSeats) * 100) : 0;

    const fmtD = (d?: string) => {
      if (!d) return "–";
      try { return new Date(d + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short" }); }
      catch { return d; }
    };
    const fmtP = (n: number) => n > 0 ? n.toLocaleString() : "–";

    // COL config (shared between header row + data rows)
    const COLS = "width:3px|width:88px|width:auto|width:115px|width:55px|width:82px|width:44px|width:38px|width:72px";
    const colgroup = `<colgroup>${COLS.split("|").map(w=>`<col style="${w}">`).join("")}</colgroup>`;

    const catDefs = [
      { label: "ทัวร์ต่างประเทศ", tag: "INTERNATIONAL", items: intlTours,
        hBg: "#1E3A5F", hAccent: "#DBEAFE", hText: "#2563EB", stripe: "#3B82F6" },
      { label: "ทัวร์ในประเทศ",   tag: "DOMESTIC",      items: domTours,
        hBg: "#78350F", hAccent: "#FEF3C7", hText: "#B45309", stripe: "#F59E0B" },
      { label: "Incentive & Group", tag: "INCENTIVE",    items: incTours,
        hBg: "#3B0764", hAccent: "#EDE9FE", hText: "#7C3AED", stripe: "#8B5CF6" },
    ];

    const catBlocks = catDefs.map(({ label, tag, items, hBg, hAccent, hText, stripe }) => {
      if (items.length === 0) return "";
      const catPeriods = items.flatMap(t => (t.periods ?? []).filter(p => !p.cancelled));
      const catSeats   = catPeriods.reduce((s, p) => s + (p.total_seats || 0), 0);

      const dataRows = items.flatMap((t) => {
        const ps = (t.periods ?? []).filter(p => !p.cancelled);
        if (ps.length === 0) return (
          `<tr style="background:#F9FAFB;border-top:1px solid #E5E7EB">
            <td style="width:3px;background:${stripe};padding:0"></td>
            <td style="padding:1.5px 6px;font-size:7.5px;font-weight:600;color:#374151;white-space:nowrap">${t.code}</td>
            <td colspan="7" style="padding:1.5px 6px;font-size:7.5px;color:#9CA3AF;font-style:italic">${t.title ?? t.city} — ยังไม่มีวันเดินทาง</td>
          </tr>`
        );
        return ps.map((p, i) => {
          const booked    = Math.max(0, (p.total_seats || 0) - (p.quota || 0));
          const rowBg     = i % 2 === 0 ? "#FFFFFF" : "#F8F9FB";
          const topBorder = i === 0 ? "border-top:1px solid #E5E7EB;" : "";
          const priceHtml = p.special_price
            ? `<span style="text-decoration:line-through;color:#9CA3AF;font-size:6.5px;margin-right:2px">${fmtP(p.price_per_seat)}</span><b style="color:#DC2626">${fmtP(p.special_price)}</b>`
            : `<b>${fmtP(p.price_per_seat)}</b>`;
          const statusHtml = p.quota === 0
            ? `<span style="background:#FEE2E2;color:#B91C1C;border-radius:8px;padding:1px 5px;font-size:6.5px;font-weight:700;white-space:nowrap">FULL</span>`
            : p.quota <= 3
              ? `<span style="background:#FFF7ED;color:#C2410C;border-radius:8px;padding:1px 5px;font-size:6.5px;font-weight:700;white-space:nowrap">⚠ ${p.quota} ที่</span>`
              : `<span style="background:#F0FDF4;color:#15803D;border-radius:8px;padding:1px 5px;font-size:6.5px;white-space:nowrap">ว่าง ${p.quota}</span>`;
          const airline   = [p.airline_code, p.departure_city].filter(Boolean).join("·") || "–";
          return (
            `<tr style="background:${rowBg};${topBorder}">
              <td style="padding:0;background:${i === 0 ? stripe : "transparent"}"></td>
              <td style="padding:2px 6px;font-size:7.5px;${i===0?"font-weight:600;color:#111827":"color:transparent"};white-space:nowrap">${i===0?t.code:""}</td>
              <td style="padding:2px 6px;font-size:7.5px;${i===0?"font-weight:500;color:#111827":"color:#9CA3AF"}">${i===0?(t.title??t.city):""}</td>
              <td style="padding:2px 6px;font-size:7.5px;white-space:nowrap;color:#374151">${fmtD(p.start_date)} – ${fmtD(p.end_date)}</td>
              <td style="padding:2px 6px;font-size:7px;text-align:center;color:#6B7280">${airline}</td>
              <td style="padding:2px 6px;font-size:7.5px;text-align:right">${priceHtml} <span style="font-size:6.5px;color:#9CA3AF">฿</span></td>
              <td style="padding:2px 6px;font-size:7.5px;text-align:center;color:#374151">${p.total_seats||"–"}</td>
              <td style="padding:2px 6px;font-size:7.5px;text-align:center;color:${booked>0?"#111827":"#D1D5DB"}">${booked>0?booked:"–"}</td>
              <td style="padding:2px 4px;text-align:center">${statusHtml}</td>
            </tr>`
          );
        }).join("");
      }).join("");

      return `
      <div style="margin-bottom:7px;border-radius:5px;overflow:hidden;border:1px solid #E5E7EB">
        <!-- Category header -->
        <div style="background:${hBg};color:#fff;padding:5px 10px;display:flex;justify-content:space-between;align-items:center">
          <div style="display:flex;align-items:center;gap:7px">
            <span style="font-size:7px;padding:1px 7px;border-radius:8px;background:rgba(255,255,255,0.18);letter-spacing:0.08em;font-weight:500">${tag}</span>
            <span style="font-size:10px;font-weight:700">${label}</span>
          </div>
          <span style="font-size:7.5px;opacity:0.75">${items.length} โปรแกรม &nbsp;·&nbsp; ${catPeriods.length} วันเดินทาง &nbsp;·&nbsp; ${catSeats.toLocaleString()} ที่นั่ง</span>
        </div>
        <!-- Column headers + data — single table for alignment -->
        <table style="width:100%;border-collapse:collapse">
          ${colgroup}
          <thead>
            <tr style="background:${hAccent}">
              <td style="padding:0;width:3px"></td>
              <td style="padding:2.5px 6px;font-size:7px;font-weight:700;color:${hText};letter-spacing:0.05em">รหัสทัวร์</td>
              <td style="padding:2.5px 6px;font-size:7px;font-weight:700;color:${hText}">โปรแกรม</td>
              <td style="padding:2.5px 6px;font-size:7px;font-weight:700;color:${hText}">วันเดินทาง – วันกลับ</td>
              <td style="padding:2.5px 6px;font-size:7px;font-weight:700;color:${hText};text-align:center">สายการบิน</td>
              <td style="padding:2.5px 6px;font-size:7px;font-weight:700;color:${hText};text-align:right">ราคา / ที่นั่ง</td>
              <td style="padding:2.5px 6px;font-size:7px;font-weight:700;color:${hText};text-align:center">รวม</td>
              <td style="padding:2.5px 6px;font-size:7px;font-weight:700;color:${hText};text-align:center">จอง</td>
              <td style="padding:2.5px 6px;font-size:7px;font-weight:700;color:${hText};text-align:center">สถานะ</td>
            </tr>
          </thead>
          <tbody>${dataRows}</tbody>
        </table>
      </div>`;
    }).join("");

    // ── stat items for summary bar ──
    const statItems = [
      { n: String(totalPrograms),              lbl: "โปรแกรม",      c: "#4F46E5" },
      { n: String(totalPeriods),               lbl: "วันเดินทาง",   c: "#0891B2" },
      { n: totalSeats.toLocaleString(),        lbl: "ที่นั่งรวม",   c: "#059669" },
      { n: bookedSeats.toLocaleString(),       lbl: "จองแล้ว",      c: "#D97706" },
      { n: String(lowStockCount),              lbl: "Low Stock ⚠",  c: lowStockCount > 0 ? "#DC2626" : "#9CA3AF" },
      { n: bookingRate + "%",                  lbl: "Booking Rate",  c: bookingRate > 70 ? "#DC2626" : bookingRate > 40 ? "#D97706" : "#374151" },
    ];
    const statBar = statItems.map(({ n, lbl, c }, i) =>
      `<div style="flex:1;padding:5px 6px;text-align:center;${i < statItems.length-1 ? "border-right:1px solid #E5E7EB;" : ""}background:#FAFAFA">
        <div style="font-size:14px;font-weight:700;color:${c};line-height:1">${n}</div>
        <div style="font-size:7px;color:#9CA3AF;margin-top:2px;letter-spacing:0.04em;text-transform:uppercase">${lbl}</div>
      </div>`
    ).join("");

    const filterNote = filteredTours.length < tours.length
      ? `<div style="background:rgba(255,255,255,0.15);border-radius:4px;padding:2px 10px;font-size:8px;margin-bottom:3px">กรองแล้ว ${filteredTours.length} / ${tours.length} โปรแกรม</div>`
      : "";

    const html = `<!DOCTYPE html>
<html lang="th"><head>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
  *{font-family:'Kanit',sans-serif;box-sizing:border-box;margin:0;padding:0}
  body{background:#fff;color:#1F2937;font-size:9px}
  @page{size:A4 portrait;margin:6mm 8mm}
  @media print{
    *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
    tr{page-break-inside:avoid}
    div[style*="margin-bottom:7px"]{page-break-inside:avoid}
  }
</style>
</head><body>

<!-- HEADER -->
<div style="background:linear-gradient(135deg,#1E1B4B 0%,#312E81 55%,#4338CA 100%);color:#fff;padding:9px 14px 8px;border-radius:6px 6px 0 0;display:flex;justify-content:space-between;align-items:center">
  <div style="display:flex;align-items:center;gap:10px">
    <div style="width:30px;height:30px;background:rgba(255,255,255,0.15);border-radius:8px;border:1.5px solid rgba(255,255,255,0.3);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0">SS</div>
    <div>
      <div style="font-size:14px;font-weight:700;letter-spacing:-0.02em">รายงาน Stock ทัวร์</div>
      <div style="font-size:8px;opacity:0.7;margin-top:1px">Standard Tour Hub &nbsp;·&nbsp; พิมพ์วันที่ ${today}</div>
    </div>
  </div>
  <div style="text-align:right;line-height:1.6">
    ${filterNote}
    <div style="font-size:8px;opacity:0.7">Standard Tour Hub CRM</div>
  </div>
</div>

<!-- STATS BAR -->
<div style="display:flex;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 6px 6px;overflow:hidden;margin-bottom:8px">
  ${statBar}
</div>

<!-- CATEGORY SECTIONS -->
${catBlocks}

<!-- FOOTER -->
<div style="display:flex;justify-content:space-between;align-items:center;font-size:7.5px;color:#9CA3AF;padding:6px 2px 0;border-top:1px solid #E5E7EB;margin-top:2px">
  <span>Standard Tour Hub CRM</span>
  <span>รวม ${totalPrograms} โปรแกรม &nbsp;·&nbsp; ${totalPeriods} วันเดินทาง &nbsp;·&nbsp; ${totalSeats.toLocaleString()} ที่นั่ง</span>
  <span>พิมพ์วันที่ ${today}</span>
</div>

<script>
  document.fonts.ready.then(()=>{ setTimeout(()=>{ window.print(); }, 500); });
<\/script>
</body></html>`;

    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
    else toast.error("ไม่สามารถเปิดหน้าต่างพิมพ์ได้ — ตรวจสอบ popup blocker");
  };

  // ── filter options (computed from store) ──
  const allCountries = useMemo(
    () => [...new Set(tours.map((t) => t.country).filter(Boolean))].sort(),
    [tours],
  );
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
      if (filterSeatHold) {
        const hasSeatHold = ps.some((p) => !!p.seat_hold);
        if (!hasSeatHold) return false;
      }
      if (filterPromo) {
        const has = (t.periods ?? []).some((p) =>
          typeof p.special_price === "number" && p.special_price > 0 && p.special_price < p.price_per_seat
        );
        if (!has) return false;
      }
      if (filterTags.length > 0) {
        const has = (t.periods ?? []).some((p) =>
          filterTags.every((tag) => (p.tags ?? []).includes(tag)),
        );
        if (!has) return false;
      }
      // ── date range filter — show tour if ANY period falls within range ──
      if (filterDateFrom || filterDateTo) {
        const periods = t.periods ?? [];
        if (periods.length > 0) {
          const has = periods.some((p) => {
            const d = p.start_date ?? "";
            if (!d) return false;
            if (filterDateFrom && d < filterDateFrom) return false;
            if (filterDateTo   && d > filterDateTo)   return false;
            return true;
          });
          if (!has) return false;
        }
      }
      return true;
    });
  }, [tours, filterText, filterCat, filterCountry, filterStatus, filterSeatHold, filterPromo, filterTags, filterDateFrom, filterDateTo]);

  const intlTours = useMemo(() => filteredTours.filter((t) => t.category === "International Tour"), [filteredTours]);
  const domTours  = useMemo(() => filteredTours.filter((t) => t.category === "Domestic"),          [filteredTours]);
  const incTours  = useMemo(() => filteredTours.filter((t) => t.category === "Incentive"),         [filteredTours]);

  const hasFilter = !!(filterText || filterCat || filterCountry || filterStatus || filterSeatHold || filterPromo || filterTags.length || filterDateFrom || filterDateTo);
  const clearFilters = () => {
    setFilterText(""); setFilterCat(""); setFilterCountry("");
    setFilterStatus(""); setFilterSeatHold(false); setFilterPromo(false); setFilterTags([]);
    setFilterDateFrom(""); setFilterDateTo("");
  };

  return (
    <div className="space-y-0 -mx-4 sm:-mx-6">
      {/* ── CSS keyframe animations ── */}
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(-5px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .anim-slide-down { animation: slideDown 0.25s ease-out; }
        .anim-fade-in    { animation: fadeInUp 0.18s ease-out both; }
        .anim-filter     { animation: slideDown 0.2s ease-out; }
      `}</style>
      {/* ── FILTER BAR (non-sticky) ── */}
      <div className="bg-card border-b border-border px-4 py-2.5 space-y-2">

        {/* ── MOBILE: compact search row + filter toggle ── */}
        <div className="flex items-center gap-2 sm:hidden">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input className="pl-8 h-9 text-sm" placeholder="ค้นหา..." value={filterText} onChange={(e) => setFilterText(e.target.value)} />
          </div>
          <button
            onClick={() => setFilterOpen((v) => !v)}
            className={`h-9 flex items-center gap-1.5 px-3 rounded-lg border text-sm font-medium transition-colors ${(filterOpen || hasFilter) ? "text-white border-transparent" : "border-border text-muted-foreground"}`}
            style={(filterOpen || hasFilter) ? {background: "#1F2937"} : undefined}
          >
            <SlidersHorizontal className="w-4 h-4" />
            ตัวกรอง
            {hasFilter && <span className="w-4 h-4 rounded-full bg-pink-500 text-white text-[9px] font-bold flex items-center justify-center">{[filterCat, filterCountry, filterStatus, filterSeatHold, filterPromo, ...filterTags].filter(Boolean).length}</span>}
          </button>
        </div>

        {/* ── MOBILE: expandable filter panel ── */}
        {filterOpen && (
          <div className="sm:hidden space-y-2 pt-1 pb-0.5 border-t border-border mt-1 anim-filter">
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
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setFilterPromo((v) => !v)}
                className={`h-8 px-3 rounded-lg text-sm font-medium border transition-colors ${filterPromo ? "text-white border-orange-500" : "border-border text-muted-foreground"}`}
                style={filterPromo ? {background: "#F59E0B"} : undefined}
              >🔥 Promo</button>
              <button
                onClick={() => setFilterSeatHold((v) => !v)}
                className={`h-8 px-3 rounded-lg text-sm font-medium border transition-colors ${filterSeatHold ? "text-white border-teal-600" : "border-border text-muted-foreground"}`}
                style={filterSeatHold ? {background: "#0D9488"} : undefined}
              >💸 วางที่นั่ง</button>
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
                    : {borderColor: "hsl(var(--border))", color: "hsl(var(--muted-foreground))"}}
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
            {/* Date range filter */}
            <div className="flex items-center gap-1 border border-border rounded-md px-2 h-8">
              <CalendarDays className="w-3 h-3 text-muted-foreground shrink-0" />
              <input
                type="date"
                className="h-full text-xs bg-transparent outline-none text-foreground w-[110px]"
                title="วันเดินทาง ตั้งแต่"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
              />
              <span className="text-muted-foreground/40 text-xs">–</span>
              <input
                type="date"
                className="h-full text-xs bg-transparent outline-none text-foreground w-[110px]"
                title="วันเดินทาง ถึง"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
              />
              {(filterDateFrom || filterDateTo) && (
                <button onClick={() => { setFilterDateFrom(""); setFilterDateTo(""); }} className="text-muted-foreground/40 hover:text-muted-foreground transition-colors ml-0.5">✕</button>
              )}
            </div>
            <button
              onClick={() => setFilterPromo((v) => !v)}
              className={`h-8 px-3 rounded-md text-xs font-medium border transition-colors ${filterPromo ? "text-white border-orange-500" : "border-border text-muted-foreground hover:border-orange-300 hover:text-orange-400"}`}
              style={filterPromo ? {background: "#F59E0B", borderColor: "#F59E0B"} : undefined}
            >🔥 Promo</button>
            <button
              onClick={() => setFilterSeatHold((v) => !v)}
              className={`h-8 px-3 rounded-md text-xs font-medium border transition-colors ${filterSeatHold ? "text-white border-teal-600" : "border-border text-muted-foreground hover:border-teal-400 hover:text-teal-600"}`}
              style={filterSeatHold ? {background: "#0D9488", borderColor: "#0D9488"} : undefined}
            >💸 วางที่นั่ง</button>
            {hasFilter && (
              <button onClick={clearFilters} className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md transition-colors">✕ ล้าง</button>
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
      <div className="flex items-center justify-between gap-2 flex-wrap px-4 py-3 border-b border-border bg-card">
        <div>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            {isLoadingTours && (
              <span className="inline-flex items-center gap-1 text-xs text-blue-500 font-medium">
                <span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin inline-block" />
                กำลังโหลด...
              </span>
            )}
            รวม <span className="font-semibold text-foreground">{filteredTours.length}</span>
            {hasFilter && <span className="text-muted-foreground"> / {tours.length}</span>} โปรแกรม
            {hasFilter && <span className="ml-1.5 text-[11px] text-amber-600 font-medium">(กรองอยู่)</span>}
          </p>
          <p className="hidden sm:block text-xs text-muted-foreground mt-0.5">🎯 โควต้าตัดอัตโนมัติเมื่อปิดดีล Closed Won · คืนอัตโนมัติเมื่อยกเลิก</p>
        </div>
        <div className="flex items-center gap-2">
          <ImportExportMenu fields={TOUR_FIELDS} sheetName="ทัวร์" filename="tours" data={exportData} onImport={handleImportPreview} canImport={canEdit} />
          <Button variant="outline" size="sm" className="gap-1.5" onClick={exportStockPDF} title="Export PDF รายงาน Stock">
            <FileText className="w-4 h-4 text-red-500" />
            <span className="hidden sm:inline">PDF</span>
          </Button>
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
                const bookedSeats = p.total_seats - p.quota;
                acc.totalSeats  += p.total_seats;
                acc.booked      += bookedSeats;
                acc.available   += p.quota;
                acc.periods     += 1;
                acc.totalValue  += p.total_seats * p.price_per_seat;
                acc.bookedValue += bookedSeats   * p.price_per_seat;
              } else {
                acc.cancelledPeriods += 1;
                acc.cancelledSeats   += p.total_seats;
                acc.cancelledValue   += p.total_seats * p.price_per_seat;
              }
            });
            return acc;
          },
          { totalSeats: 0, booked: 0, available: 0, periods: 0, totalValue: 0, bookedValue: 0, cancelledPeriods: 0, cancelledSeats: 0, cancelledValue: 0 }
        );
        if (stats.periods === 0 && stats.cancelledPeriods === 0) return null;
        const pct      = stats.totalSeats  > 0 ? Math.round((stats.booked      / stats.totalSeats)  * 100) : 0;
        const valuePct = stats.totalValue  > 0 ? Math.round((stats.bookedValue / stats.totalValue)  * 100) : 0;
        const fmtVal   = (v: number) => v >= 1_000_000
          ? `${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)} ล้าน`
          : v.toLocaleString();
        // ── category breakdown data ──
        const catBreakdown = [
          { label: "Intl", tours: intlTours, color: "#16A34A", bg: "#DCFCE7" },
          { label: "Dom",  tours: domTours,  color: "#F59E0B", bg: "#FEF3C7" },
          { label: "Inc",  tours: incTours,  color: "#7C3AED", bg: "#EDE9FE" },
        ] as const;

        return (
          <div className="hidden sm:flex items-stretch border-b border-border bg-card divide-x divide-border overflow-x-auto">
            {/* ── Label chip ── */}
            <div className="flex flex-col justify-center px-4 py-2.5 shrink-0">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">📊 Stock</span>
              <span className="text-[10px] text-muted-foreground/50 mt-0.5 whitespace-nowrap">{stats.periods} Period</span>
            </div>

            {/* ── ที่นั่งรวม ── */}
            <div className="flex flex-col justify-center px-4 py-2.5 min-w-[88px] shrink-0">
              <span className="text-[18px] font-bold text-foreground leading-none">{stats.totalSeats.toLocaleString()}</span>
              <span className="text-[10px] text-muted-foreground mt-1 whitespace-nowrap">ที่นั่งรวม</span>
            </div>

            {/* ── จองแล้ว + progress ── */}
            <div className="flex flex-col justify-center px-4 py-2.5 min-w-[108px] shrink-0">
              <div className="flex items-baseline gap-1.5 leading-none">
                <span className="text-[18px] font-bold" style={{color:"#F472B6"}}>{stats.booked.toLocaleString()}</span>
                <span className="text-[11px] font-semibold text-muted-foreground">{pct}%</span>
              </div>
              <span className="text-[10px] text-muted-foreground mt-1 mb-1.5 whitespace-nowrap">จองแล้ว</span>
              <div className="h-1.5 rounded-full overflow-hidden w-[72px] bg-pink-500/20">
                <div className="h-full rounded-full transition-all" style={{width:`${pct}%`, background:"#F472B6"}} />
              </div>
            </div>

            {/* ── ว่าง ── */}
            <div className="flex flex-col justify-center px-4 py-2.5 min-w-[80px] shrink-0">
              <span className="text-[18px] font-bold leading-none" style={{color:"#4ADE80"}}>{stats.available.toLocaleString()}</span>
              <span className="text-[10px] text-muted-foreground mt-1 whitespace-nowrap">ว่าง</span>
            </div>

            {/* ── มูลค่า Capacity ── */}
            <div className="hidden lg:flex flex-col justify-center px-4 py-2.5 min-w-[110px] shrink-0">
              <span className="text-[15px] font-bold text-foreground leading-none">฿{fmtVal(stats.totalValue)}</span>
              <span className="text-[10px] text-muted-foreground mt-1 whitespace-nowrap">💰 Capacity</span>
            </div>

            {/* ── มูลค่าจอง + progress ── */}
            <div className="hidden lg:flex flex-col justify-center px-4 py-2.5 min-w-[130px] shrink-0">
              <div className="flex items-baseline gap-1.5 leading-none">
                <span className="text-[15px] font-bold" style={{color:"#A78BFA"}}>฿{fmtVal(stats.bookedValue)}</span>
                <span className="text-[11px] font-semibold text-muted-foreground">{valuePct}%</span>
              </div>
              <span className="text-[10px] text-muted-foreground mt-1 mb-1.5 whitespace-nowrap">มูลค่าจอง</span>
              <div className="h-1.5 rounded-full overflow-hidden w-[72px] bg-purple-500/20">
                <div className="h-full rounded-full transition-all" style={{width:`${valuePct}%`, background:"#A78BFA"}} />
              </div>
            </div>

            {/* ── ยกเลิก ── */}
            {stats.cancelledPeriods > 0 && (
              <div className="flex flex-col justify-center px-4 py-2.5 min-w-[120px] shrink-0 bg-red-500/5">
                <div className="flex items-baseline gap-1.5 leading-none">
                  <span className="text-[15px] font-bold text-red-400">{stats.cancelledPeriods} Period</span>
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 mb-0.5 whitespace-nowrap">❌ ยกเลิกแล้ว</span>
                <span className="text-[10px] font-semibold text-red-400 whitespace-nowrap">
                  ฿{fmtVal(stats.cancelledValue)} <span className="text-[9px] font-normal text-muted-foreground/60">({stats.cancelledSeats.toLocaleString()} ที่)</span>
                </span>
              </div>
            )}

            {/* ── Dashboard button ── */}
            <div className="flex items-center pl-3 pr-2 shrink-0 border-l border-border">
              <button
                onClick={() => window.location.href = "/app/stock-dashboard"}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 transition-colors whitespace-nowrap"
                title="ดู Dashboard เต็มรูปแบบ"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
                </svg>
                Dashboard
              </button>
            </div>

            {/* ── Category breakdown ── */}
            <div className="hidden xl:flex items-center gap-3 px-4 ml-auto shrink-0">
              <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wide">แยกประเภท</span>
              {catBreakdown.map(({ label, tours: catTours, color, bg }) => {
                const cs = catTours.reduce((a, t) => {
                  (t.periods ?? []).filter(p => !p.cancelled).forEach(p => {
                    a.total  += p.total_seats;
                    a.booked += (p.total_seats - p.quota);
                  });
                  return a;
                }, { total: 0, booked: 0 });
                if (cs.total === 0) return null;
                const cp = Math.round((cs.booked / cs.total) * 100);
                return (
                  <div key={label} className="flex flex-col items-center gap-1" title={`${label}: ${cp}% จอง (${cs.booked}/${cs.total})`}>
                    <span className="text-[10px] font-bold" style={{color}}>{label}</span>
                    <div className="relative w-9 h-9 shrink-0">
                      <svg viewBox="0 0 36 36" className="w-9 h-9 -rotate-90">
                        <circle cx="18" cy="18" r="15" fill="none" strokeWidth="4" stroke={bg} />
                        <circle cx="18" cy="18" r="15" fill="none" strokeWidth="4" stroke={color}
                          strokeDasharray={`${cp * 0.942} 94.2`} strokeLinecap="round" />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold" style={{color}}>{cp}%</span>
                    </div>
                    <span className="text-[8px] text-muted-foreground whitespace-nowrap">{cs.booked}/{cs.total}</span>
                  </div>
                );
              })}
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
                // ── Period-level filter (matches tour-level logic but applied per period) ──
                const visiblePeriods = (t.periods ?? []).filter((p) => {
                  if (filterSeatHold && !p.seat_hold) return false;
                  if (filterPromo && !(typeof p.special_price === "number" && p.special_price > 0 && p.special_price < p.price_per_seat)) return false;
                  if (filterStatus === "ยกเลิก"  && !p.cancelled) return false;
                  if (filterStatus === "ปิดกรุ๊ป" && (p.cancelled || p.quota !== 0)) return false;
                  if (filterStatus === "ว่าง"     && (p.cancelled || p.quota <= 0))  return false;
                  if (filterTags.length > 0 && !filterTags.every((tag) => (p.tags ?? []).includes(tag))) return false;
                  if ((filterDateFrom || filterDateTo)) {
                    const d = p.start_date ?? "";
                    if (filterDateFrom && d < filterDateFrom) return false;
                    if (filterDateTo   && d > filterDateTo)   return false;
                  }
                  return true;
                });
                const periodFilterActive = !!(filterStatus || filterSeatHold || filterPromo || filterTags.length || filterDateFrom || filterDateTo);
                const prices = hasPeriods ? t.periods!.map((p) => p.price_per_seat) : [];
                const priceMin = prices.length ? Math.min(...prices) : t.price_per_seat;
                const priceMax = prices.length ? Math.max(...prices) : t.price_per_seat;
                const priceLabel = priceMin === priceMax
                  ? `฿${priceMin.toLocaleString()}`
                  : `฿${priceMin.toLocaleString()} – ฿${priceMax.toLocaleString()}`;

                return (
                  <div key={t.id} className="rounded-2xl overflow-hidden shadow-sm border" style={{borderColor: `${color}30`}}>
                    {/* ── Program Header Row — DESKTOP (sm+) ── */}
                    <div className={`hidden sm:flex items-center gap-2 px-4 py-2 transition-colors ${isExpanded ? "" : "hover:bg-muted/30"}`} style={{background: isExpanded ? bg : "hsl(var(--card))", borderLeft: `4px solid ${color}`}}>
                      <button className="w-6 h-6 flex items-center justify-center shrink-0 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors" onClick={() => toggleExpand(t.id)}>
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-0 flex-wrap">
                          <span className="font-bold text-sm text-foreground mr-2">{t.title ?? t.city}</span>
                          {t.duration && <><span className="text-muted-foreground/30 mr-2">|</span><span className="text-sm text-muted-foreground mr-2 whitespace-nowrap">{t.duration}</span></>}
                          <span className="text-muted-foreground/30 mr-2">|</span>
                          <span className="text-sm font-semibold font-mono mr-2" style={{color}}>{t.code}</span>
                          <button onClick={() => hasPeriods && toggleExpand(t.id)}
                            className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md border font-semibold text-[11px] transition-colors mr-1.5"
                            style={hasPeriods ? {borderColor:"#374151",color:"white",background:"#1F2937"} : {borderColor:"#E5E7EB",color:"#9CA3AF",background:"#F9FAFB"}}>
                            {hasPeriods ? (periodFilterActive && visiblePeriods.length !== t.periods!.length ? `${visiblePeriods.length}/${t.periods!.length} Period` : `${t.periods!.length} Period`) : "ยังไม่มี"}
                            {hasPeriods && (isExpanded ? <ChevronDown className="w-3 h-3 ml-0.5" /> : <ChevronRight className="w-3 h-3 ml-0.5" />)}
                          </button>
                          {t.continent && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{background:`${color}15`,color}}>{t.continent}</span>}
                        </div>
                        {t.title && t.city && t.city !== t.title && <div className="text-[11px] text-muted-foreground truncate mt-0.5">{t.city}</div>}
                      </div>
                      {/* ℹ Info popover — tags + description + audit */}
                      {((t.tour_types ?? []).length > 0 || t.description || t.created_by || t.updated_by) && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" title="ข้อมูลเพิ่มเติม">
                              <Info className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent align="end" className="w-60 p-3 space-y-2.5 text-xs">
                            {t.continent && (
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground shrink-0">ทวีป</span>
                                <span className="font-semibold px-2 py-0.5 rounded-full text-[10px]" style={{background:`${color}15`,color}}>{t.continent}</span>
                              </div>
                            )}
                            {(t.tour_types ?? []).length > 0 && (
                              <div>
                                <div className="text-muted-foreground mb-1">ประเภทโปรแกรม</div>
                                <div className="flex flex-wrap gap-1">
                                  {(t.tour_types ?? []).map((tag) => (
                                    <span key={tag} className="px-2 py-0.5 rounded-full border text-[10px] font-medium" style={{borderColor:`${color}40`,color}}>{tag}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {t.description && (
                              <div>
                                <div className="text-muted-foreground mb-0.5">คำอธิบาย</div>
                                <div className="text-foreground leading-relaxed">{t.description}</div>
                              </div>
                            )}
                            {(t.created_by || t.updated_by) && (
                              <div className="pt-2 border-t border-border space-y-0.5 text-[10px] text-muted-foreground">
                                {t.created_by && <div>สร้างโดย <span className="font-medium text-foreground">{t.created_by}</span></div>}
                                {t.updated_by && (
                                  <div>แก้ไขล่าสุด <span className="font-medium text-blue-400">{t.updated_by}</span>
                                    {t.updated_at && <span className="ml-1">· {new Date(t.updated_at).toLocaleDateString("th-TH", {day:"numeric",month:"short",year:"2-digit"})}</span>}
                                  </div>
                                )}
                              </div>
                            )}
                          </PopoverContent>
                        </Popover>
                      )}
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
                    <div className={`sm:hidden transition-colors`} style={{background: isExpanded ? bg : "hsl(var(--card))", borderLeft: `4px solid ${color}`}}>
                      {/* Top row: expand + name + period badge */}
                      <div className="flex items-start gap-2 px-3 pt-2.5 pb-1">
                        <button className="mt-0.5 w-6 h-6 flex items-center justify-center shrink-0 rounded-md text-muted-foreground" onClick={() => toggleExpand(t.id)}>
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-1.5 flex-wrap">
                            <span className="font-extrabold text-lg text-foreground leading-tight">{t.title ?? t.city}</span>
                            <button onClick={() => hasPeriods && toggleExpand(t.id)}
                              className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md border font-semibold text-[11px] mt-0.5"
                              style={hasPeriods ? {borderColor:"#374151",color:"white",background:"#1F2937"} : {borderColor:"hsl(var(--border))",color:"hsl(var(--muted-foreground))",background:"hsl(var(--muted))"}}>
                              {hasPeriods ? (periodFilterActive && visiblePeriods.length !== t.periods!.length ? `${visiblePeriods.length}/${t.periods!.length} Period` : `${t.periods!.length} Period`) : "ยังไม่มี"}
                              {hasPeriods && (isExpanded ? <ChevronDown className="w-3 h-3 ml-0.5" /> : <ChevronRight className="w-3 h-3 ml-0.5" />)}
                            </button>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {t.duration && <span className="text-xs text-muted-foreground whitespace-nowrap">{t.duration}</span>}
                            <span className="text-[11px] font-mono font-semibold text-muted-foreground whitespace-nowrap">{t.code}</span>
                            {t.continent && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{background:`${color}15`,color}}>{t.continent}</span>}
                          </div>
                        </div>
                      </div>
                      {/* Bottom row: ℹ info + + Period pill + ⋮ dropdown */}
                      {canEdit && (
                        <div className="flex items-center gap-2 px-3 pb-3 pt-1">
                          {/* ℹ Info popover */}
                          {((t.tour_types ?? []).length > 0 || t.description || t.created_by || t.updated_by) && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl shrink-0" title="ข้อมูลเพิ่มเติม">
                                  <Info className="w-4 h-4 text-muted-foreground" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent align="start" className="w-60 p-3 space-y-2.5 text-xs">
                                {t.continent && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">ทวีป</span>
                                    <span className="font-semibold px-2 py-0.5 rounded-full text-[10px]" style={{background:`${color}15`,color}}>{t.continent}</span>
                                  </div>
                                )}
                                {(t.tour_types ?? []).length > 0 && (
                                  <div>
                                    <div className="text-muted-foreground mb-1">ประเภทโปรแกรม</div>
                                    <div className="flex flex-wrap gap-1">
                                      {(t.tour_types ?? []).map((tag) => (
                                        <span key={tag} className="px-2 py-0.5 rounded-full border text-[10px] font-medium" style={{borderColor:`${color}40`,color}}>{tag}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {t.description && (
                                  <div>
                                    <div className="text-muted-foreground mb-0.5">คำอธิบาย</div>
                                    <div className="text-foreground leading-relaxed">{t.description}</div>
                                  </div>
                                )}
                                {(t.created_by || t.updated_by) && (
                                  <div className="pt-2 border-t space-y-0.5 text-[10px] text-muted-foreground">
                                    {t.created_by && <div>สร้างโดย <span className="font-medium text-muted-foreground">{t.created_by}</span></div>}
                                    {t.updated_by && (
                                      <div>แก้ไขล่าสุด <span className="font-medium text-blue-600">{t.updated_by}</span>
                                        {t.updated_at && <span className="ml-1">· {new Date(t.updated_at).toLocaleDateString("th-TH", {day:"numeric",month:"short",year:"2-digit"})}</span>}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </PopoverContent>
                            </Popover>
                          )}
                          {/* Primary CTA */}
                          <button
                            onClick={() => openAddPeriod(t.id)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-semibold shadow-sm transition-opacity hover:opacity-90 flex-1"
                            style={{background:"#EC4899"}}
                          >
                            <Plus className="w-4 h-4" /> เพิ่ม Period
                          </button>
                          {/* Secondary actions — ⋮ menu */}
                          <input id={`pdf-upload-mob-${t.id}`} type="file" accept="application/pdf" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; e.target.value = ""; if (!file) return; setUploadingId(t.id); const url = await uploadTourPDF(t.id, file); setUploadingId(null); if (url) toast.success("อัปโหลดสำเร็จ"); else toast.error("ล้มเหลว"); }} />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl shrink-0">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => openEdit(t.id)}>
                                <Pencil className="w-3.5 h-3.5 mr-2" /> แก้ไขโปรแกรม
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {t.pdf_url ? (
                                <>
                                  <DropdownMenuItem onClick={() => { togglePublish(t.id, !t.is_published); toast.success(t.is_published ? "ซ่อนแล้ว" : "แสดงบนเว็บแล้ว"); }}>
                                    {t.is_published ? <GlobeLock className="w-3.5 h-3.5 mr-2 text-amber-500" /> : <Globe className="w-3.5 h-3.5 mr-2 text-green-600" />}
                                    {t.is_published ? "ซ่อนจากเว็บ" : "แสดงบนเว็บ"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={async () => { if (!confirm("ลบ PDF?")) return; await deleteTourPDF(t.id); toast.success("ลบแล้ว"); }} className="text-destructive focus:text-destructive">
                                    <FileX className="w-3.5 h-3.5 mr-2" /> ลบ PDF
                                  </DropdownMenuItem>
                                </>
                              ) : (
                                <DropdownMenuItem onClick={() => document.getElementById(`pdf-upload-mob-${t.id}`)?.click()} disabled={uploadingId===t.id}>
                                  {uploadingId===t.id ? <span className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" /> : <FileUp className="w-3.5 h-3.5 mr-2" />}
                                  อัปโหลด PDF
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => { const booked = t.total_seats - t.quota; const ok = booked > 0 ? confirm(`⚠️ มีที่นั่งถูกจองแล้ว ${booked} ที่\n\nการลบจะทำให้ข้อมูลการจองหายทั้งหมด\n\nยืนยันการลบหรือไม่?`) : confirm("ลบโปรแกรมทัวร์นี้?"); if (ok) { deleteTour(t.id); toast.success("ลบแล้ว"); } }}>
                                <Trash2 className="w-3.5 h-3.5 mr-2" /> ลบโปรแกรม
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </div>

                    {/* ── Period Section (Mobile + Desktop) ── */}
                    {hasPeriods && isExpanded && (<>

                    {/* ════ MOBILE period cards (< sm) ════ */}
                    <div className="sm:hidden border-t anim-slide-down" style={{background: "#FAFAFA"}}>
                      <div className="p-3 space-y-2">
                        {visiblePeriods.map((p, pIdx) => {
                          const pid = p.period_id;
                          const hasPending = pendingQuota[pid] !== undefined;
                          const currentQuota = hasPending ? pendingQuota[pid] : p.quota;
                          const isCancelled = !!p.cancelled;
                          const isFullDisplay = !isCancelled && currentQuota === 0;
                          const bookedCount = p.total_seats - currentQuota;
                          const bookedPct = p.total_seats > 0 ? Math.round((bookedCount / p.total_seats) * 100) : 0;
                          const statusColor = isCancelled ? "#EF4444" : isFullDisplay ? "#9CA3AF" : "#16A34A";
                          const hasPromo = !!p.special_price && p.special_price > 0 && p.special_price < p.price_per_seat;
                          const barBg = isCancelled ? "#EF4444" : isFullDisplay ? "#9CA3AF" : "#16A34A";
                          return (
                            <div key={pid}
                              className={`rounded-xl border overflow-hidden anim-fade-in ${hasPending ? "ring-1 ring-amber-300" : ""}`}
                              style={{animationDelay: `${pIdx * 35}ms`, borderLeftWidth:"4px", borderLeftColor: statusColor, borderColor:`${statusColor}30`, background: isCancelled ? "#FFF5F5" : hasPending ? "#FFFBEB" : "white"}}
                            >
                              {/* Top: date + status */}
                              <div className="flex items-start justify-between px-3 pt-2.5 pb-1">
                                <div className="flex-1 min-w-0 pr-2">
                                  <div className={`text-sm font-bold leading-snug ${isCancelled ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                    {p.start_date ? fmtThai(p.start_date) : p.travel_date}
                                    {p.end_date && p.end_date !== p.start_date ? ` – ${fmtThai(p.end_date)}` : ""}
                                  </div>
                                  {/* Chips row */}
                                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                    {(p.days || p.nights) && <span className="text-[10px] text-white px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap" style={{background:"#1F2937"}}>{p.days}วัน {p.nights}คืน</span>}
                                    {p.airline_code && <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{p.airline_code}</span>}
                                    {hasPromo && <span className="text-xs">🔥</span>}
                                    {p.freeday && <span className="text-[10px] text-white px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap" style={{background:"#7C3AED"}}>Freeday</span>}
                                    {p.shopping && <span className="text-[10px] text-white px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap" style={{background:"#F59E0B"}}>ลงร้าน</span>}
                                    {p.all_in && <span className="text-[10px] text-white px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap" style={{background:"#16A34A"}}>จบ</span>}
                                    {p.vat7 && <span className="text-[10px] text-white px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap" style={{background:"#2563EB"}}>Vat7%</span>}
                                  </div>
                                </div>
                                <div className="shrink-0 mt-0.5">
                                  {isCancelled ? <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-400 whitespace-nowrap">ยกเลิก</span>
                                   : isFullDisplay ? <span className="px-2 py-1 rounded-full text-xs font-bold bg-muted text-muted-foreground whitespace-nowrap">ปิดกรุ๊ป</span>
                                   : <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-400 whitespace-nowrap">ว่าง</span>}
                                </div>
                              </div>
                              {/* Price + progress bar */}
                              <div className="flex items-center gap-3 px-3 pb-2.5">
                                <span className="font-bold text-base shrink-0 leading-none" style={{color:"#EC4899"}}>{p.price_per_seat.toLocaleString()}฿</span>
                                <div className="flex-1">
                                  <div className="flex justify-between text-[10px] mb-1">
                                    <span className={`font-semibold ${hasPending ? "text-amber-400" : "text-muted-foreground"}`}>จอง {bookedCount}/{p.total_seats}</span>
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
                                      <span className="text-sm font-bold text-foreground min-w-[28px] text-center">{currentQuota}</span>
                                      <button disabled={currentQuota <= 0}
                                        onClick={() => setPendingQuota((prev) => ({...prev, [pid]: Math.max((prev[pid] ?? p.quota) - 1, 0)}))}
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-base disabled:opacity-30 transition-colors"
                                        style={{background:"#16A34A"}}
                                      ><Plus className="w-4 h-4" /></button>
                                      {hasPending && (
                                        <>
                                          <button onClick={() => { const newQ = pendingQuota[pid]; if (newQ === undefined) return; adjustPeriodQuota(t.id, pid, newQ - p.quota, actorName); setPendingQuota((prev) => { const n = {...prev}; delete n[pid]; return n; }); toast.success("อัปเดตโควต้าแล้ว"); }}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg text-green-400 border border-green-500/20 bg-card"
                                          ><Save className="w-4 h-4" /></button>
                                          <button onClick={() => setPendingQuota((prev) => { const n = {...prev}; delete n[pid]; return n; })}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground border border-border bg-card"
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
                              {/* footnote/tags + audit trail */}
                              {(p.footnote || (p.tags ?? []).length > 0 || p.project || p.note || p.created_by || p.updated_by) && (
                                <div className="px-3 py-2 text-xs space-y-1 border-t border-border bg-muted/40">
                                  {p.footnote && <div className="text-muted-foreground italic">*{p.footnote}</div>}
                                  {(p.tags ?? []).length > 0 && <div className="flex gap-1 flex-wrap">{(p.tags ?? []).map((tg) => <span key={tg} className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[10px]">{tg}</span>)}</div>}
                                  {p.project && <div className="text-muted-foreground/60">โครงการ: <span className="text-muted-foreground">{p.project}</span></div>}
                                  {p.note && <div className="text-muted-foreground/60">หมายเหตุ: <span className="text-muted-foreground">{p.note}</span></div>}
                                  {/* Audit trail */}
                                  {(p.created_by || p.updated_by) && (
                                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 pt-1 border-t border-border mt-0.5">
                                      {p.created_by && (
                                        <span className="text-[10px] text-muted-foreground">
                                          สร้างโดย <span className="font-medium text-muted-foreground">{p.created_by}</span>
                                          {p.created_at && <span className="ml-1 text-muted-foreground/40">· {new Date(p.created_at).toLocaleDateString("th-TH", {day:"numeric",month:"short",year:"2-digit",hour:"2-digit",minute:"2-digit"})}</span>}
                                        </span>
                                      )}
                                      {p.updated_by && (
                                        <span className="text-[10px] text-muted-foreground">
                                          แก้ไขโดย <span className="font-medium text-blue-600">{p.updated_by}</span>
                                          {p.updated_at && <span className="ml-1 text-muted-foreground/40">· {new Date(p.updated_at).toLocaleDateString("th-TH", {day:"numeric",month:"short",year:"2-digit",hour:"2-digit",minute:"2-digit"})}</span>}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {/* Add Period (mobile) */}
                      {canEdit && (
                        <button onClick={() => openAddPeriod(t.id)} className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-colors hover:bg-muted/30" style={{color, borderTop:`1px dashed ${color}30`}}>
                          <Plus className="w-4 h-4" /> เพิ่ม Period ใหม่
                        </button>
                      )}
                    </div>

                    {/* ════ DESKTOP period table (sm+) ════ */}
                    <div className="hidden sm:block border-t anim-slide-down" style={{background: "#FAFAFA"}}>
                        {/* Column Headers — pl-7 matches card offset: px-3(wrapper)+border(4px)+px-3(inner)=28px */}
                        {/* v142: w-full — stretch to fill container width */}
                        {/* Bulk action toolbar */}
                        {selectedPeriods.size > 0 && (
                          <div className="flex items-center gap-2 px-3 py-1.5 border-b" style={{background:"#EFF6FF"}}>
                            <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
                            <span className="text-xs font-semibold text-blue-700">เลือก {selectedPeriods.size} Period</span>
                            <div className="flex items-center gap-1 ml-2">
                              <button
                                className="h-7 px-3 rounded-md text-xs font-semibold border transition-colors"
                                style={{background:"#DC2626",color:"#fff",borderColor:"#DC2626"}}
                                onClick={() => {
                                  if (!confirm(`ยืนยันยกเลิก ${selectedPeriods.size} Period ที่เลือก?`)) return;
                                  selectedPeriods.forEach((pid) => {
                                    const tour = tours.find(t => t.periods?.some(p => p.period_id === pid));
                                    if (!tour) return;
                                    const period = tour.periods?.find(p => p.period_id === pid);
                                    if (!period) return;
                                    updatePeriod(tour.id, pid, { ...period, cancelled: true, cancel_reason: "Bulk cancel", updated_by: actorName, updated_at: new Date().toISOString() });
                                  });
                                  toast.success(`ยกเลิก ${selectedPeriods.size} Period แล้ว`);
                                  setSelectedPeriods(new Set());
                                }}
                              >ยกเลิก Period ที่เลือก</button>
                              <button
                                className="h-7 px-3 rounded-md text-xs font-semibold border border-blue-300 text-blue-700 transition-colors hover:bg-blue-50"
                                onClick={() => {
                                  const rows: Record<string, unknown>[] = [];
                                  selectedPeriods.forEach((pid) => {
                                    const tour = tours.find(t => t.periods?.some(p => p.period_id === pid));
                                    if (!tour) return;
                                    const p = tour.periods?.find(p => p.period_id === pid);
                                    if (!p) return;
                                    rows.push({ category: tour.category, code: tour.code, city: tour.city, country: tour.country, start_date: p.start_date ?? "", end_date: p.end_date ?? "", nights: p.nights ?? "", days: p.days ?? "", price_per_seat: p.price_per_seat, special_price: p.special_price ?? "", total_seats: p.total_seats, airline_code: p.airline_code ?? "", departure_city: p.departure_city ?? "", cancelled: p.cancelled ? "TRUE" : "FALSE" });
                                  });
                                  import("@/lib/excelUtils").then(({ exportToExcel }) => {
                                    exportToExcel(rows, TOUR_FIELDS, "ทัวร์ (เลือก)", `tours-selected`);
                                    toast.success(`Export ${rows.length} Period แล้ว`);
                                  });
                                }}
                              >Export ที่เลือก</button>
                            </div>
                            <button className="ml-auto text-xs text-blue-500 hover:text-blue-700" onClick={() => setSelectedPeriods(new Set())}>✕ ยกเลิกการเลือก</button>
                          </div>
                        )}
                        <div className="flex items-center gap-1 pl-7 pr-3 py-1 border-b w-full select-none" style={{background: "#F3F4F6"}}>
                          {/* Bulk select-all checkbox — hidden when !canEdit */}
                          {canEdit ? (
                            <input
                              type="checkbox"
                              className="w-3.5 h-3.5 rounded accent-pink-500 shrink-0 cursor-pointer mr-0.5"
                              title="เลือกทุก Period ที่ยังไม่ยกเลิก"
                              checked={t.periods!.filter(p => !p.cancelled).length > 0 && t.periods!.filter(p => !p.cancelled).every(p => selectedPeriods.has(p.period_id))}
                              onChange={(e) => {
                                setSelectedPeriods(prev => {
                                  const next = new Set(prev);
                                  t.periods!.filter(p => !p.cancelled).forEach(p => e.target.checked ? next.add(p.period_id) : next.delete(p.period_id));
                                  return next;
                                });
                              }}
                            />
                          ) : (
                            <div className="w-3.5 shrink-0 mr-0.5" />
                          )}
                          {/* spacer — matches expand button w-6 in data rows */}
                          <div className="w-6 shrink-0" />
                          {/* Period — w-[165px] + 2-digit year in data row */}
                          <div
                            className="w-[165px] shrink-0 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap cursor-pointer hover:text-foreground transition-colors"
                            onClick={() => togglePeriodSort('date')}
                            title="เรียงตามวันเดินทาง"
                          >Period{sortIcon('date')}</div>
                          <div className="w-[56px] shrink-0 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap text-center">วัน/คืน</div>
                          <div className="w-8 shrink-0 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap text-center">🔥</div>
                          <div className="w-[46px] shrink-0 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap text-center">บิน</div>
                          <div className="w-9 shrink-0 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap text-center">เดินทาง</div>
                          <div className="w-2 shrink-0" />
                          <div className="w-9 shrink-0 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap text-center">FD</div>
                          <div className="w-9 shrink-0 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap text-center">ร้าน</div>
                          <div className="w-[62px] shrink-0 text-[10px] font-semibold text-muted-foreground tracking-wide whitespace-nowrap text-center">จอง จ่าย จบ</div>
                          <div className="w-[40px] shrink-0 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap text-center">Vat7%</div>
                          {/* separator VAT7% | ราคา */}
                          <div className="w-px h-4 bg-border shrink-0 self-center mx-1" />
                          {/* ราคา — clickable sort */}
                          <div
                            className="w-[80px] text-right shrink-0 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap cursor-pointer hover:text-foreground transition-colors"
                            onClick={() => togglePeriodSort('price')}
                            title="เรียงตามราคา"
                          >ราคา (฿){sortIcon('price')}</div>
                          {/* separator ราคา | Book */}
                          <div className="w-px h-4 bg-border shrink-0 self-center mx-1" />
                          {/* Book/โควต้า — flex-1 fills remaining space */}
                          <div
                            className="flex-1 min-w-[120px] max-w-[220px] text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap text-center cursor-pointer hover:text-foreground transition-colors"
                            onClick={() => togglePeriodSort('quota')}
                            title="เรียงตามที่นั่งว่าง"
                          >Book/โควต้า{sortIcon('quota')}</div>
                          <div className="w-[50px] shrink-0 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap text-center">+/-</div>
                          <div className="w-[50px] shrink-0 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap text-center">ข้อมูลเพิ่ม</div>
                          {/* สถานะ + actions — ml-auto กลุ่มนี้ชิดขวาสุด */}
                          <div className="ml-auto flex items-center gap-1 shrink-0">
                            <div className="w-[70px] text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap text-center">สถานะ</div>
                            {canEdit && <div className="w-[44px]" />}
                          </div>
                        </div>
                        {/* Period Cards — w-full stretches to container */}
                        <div className="px-3 py-1.5 space-y-1 w-full">
                        {[...visiblePeriods].sort((a, b) => {
                          const dir = periodSort.dir === 'asc' ? 1 : -1;
                          if (periodSort.field === 'date')  return dir * ((a.start_date || '') < (b.start_date || '') ? -1 : 1);
                          if (periodSort.field === 'price') return dir * (a.price_per_seat - b.price_per_seat);
                          if (periodSort.field === 'quota') return dir * (a.quota - b.quota);
                          return 0;
                        }).map((p, pIdx) => {
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
                          // Promo — auto when special_price is set and less than normal price
                          const hasPromo = !!p.special_price && p.special_price > 0 && p.special_price < p.price_per_seat;
                          const discount = hasPromo ? p.price_per_seat - p.special_price! : 0;

                          return (
                            <React.Fragment key={pid}>
                              {/* Period Card */}
                              <div
                                className={`rounded-xl overflow-hidden border anim-fade-in ${hasPending ? "ring-1 ring-amber-300" : ""}`}
                                style={{
                                  animationDelay: `${pIdx * 35}ms`,
                                  borderColor: `${statusColor}30`,
                                  borderLeftWidth: "4px",
                                  borderLeftColor: statusColor,
                                  background: isCancelled ? "#FFF5F5" : hasPending ? "#FFFBEB" : "white",
                                }}
                              >
                                <div className="flex items-center gap-1 px-3 py-1 w-full">
                                {/* 0. Bulk select checkbox — canEdit only, disabled when cancelled */}
                                {canEdit ? (
                                  <input
                                    type="checkbox"
                                    className={`w-3.5 h-3.5 rounded shrink-0 mr-0.5 ${isCancelled ? "opacity-25 cursor-not-allowed" : "accent-pink-500 cursor-pointer"}`}
                                    checked={selectedPeriods.has(pid)}
                                    disabled={isCancelled}
                                    title={isCancelled ? "Period ที่ยกเลิกแล้วไม่สามารถเลือกได้" : "เลือก Period นี้"}
                                    onChange={(e) => {
                                      if (isCancelled) return;
                                      setSelectedPeriods(prev => {
                                        const next = new Set(prev);
                                        e.target.checked ? next.add(pid) : next.delete(pid);
                                        return next;
                                      });
                                    }}
                                  />
                                ) : (
                                  <div className="w-3.5 shrink-0 mr-0.5" />
                                )}
                                {/* 1. Expand → footnote */}
                                <button
                                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted shrink-0 text-muted-foreground transition-colors"
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
                                    className={`text-xs font-semibold whitespace-nowrap overflow-hidden text-ellipsis ${isCancelled ? "line-through text-muted-foreground" : "text-foreground"}`}
                                    title={`${p.start_date ? fmtThai(p.start_date) : (p.travel_date ?? "")}${p.end_date && p.end_date !== p.start_date ? ` – ${fmtThai(p.end_date)}` : ""}`}
                                  >
                                    {p.start_date ? fmtThaiShort(p.start_date) : p.travel_date}
                                    {p.end_date && p.end_date !== p.start_date ? ` – ${fmtThaiShort(p.end_date)}` : ""}
                                    {p.seat_hold && <span className="ml-1" title="วางที่นั่ง">💸</span>}
                                  </div>
                                </div>

                                {/* 3. Badge วัน/คืน */}
                                <div className="w-[56px] shrink-0 flex justify-center">
                                  {(p.days || p.nights) ? (
                                    <span className="text-[10px] text-white px-2 py-0.5 rounded-full font-semibold whitespace-nowrap" style={{background: "#1F2937"}}>
                                      {p.days}วัน {p.nights}คืน
                                    </span>
                                  ) : <span className="text-muted-foreground/40 text-[10px]">–</span>}
                                </div>

                                {/* 4. PROMO — auto when special_price set */}
                                <div className="w-8 text-center shrink-0 leading-none">
                                  {hasPromo ? <span title={`ราคาพิเศษ ลด ${discount.toLocaleString()} บาท`} className="text-sm">🔥</span> : <span className="text-gray-200 text-xs">–</span>}
                                </div>

                                {/* 4.5 บิน — departure city (CNX/DMK/BKK) */}
                                <div className="w-[46px] shrink-0 text-center">
                                  {p.departure_city
                                    ? <span className="text-[11px] font-bold text-pink-500">{p.departure_city}</span>
                                    : <span className="text-gray-200 text-xs">–</span>}
                                </div>

                                {/* 5. เดินทาง (airline code) */}
                                <div className="w-9 shrink-0 text-[11px] font-mono text-muted-foreground text-center">
                                  {p.airline_code || <span className="text-gray-200">–</span>}
                                </div>

                                {/* separator */}
                                <div className="w-2 shrink-0 flex justify-center">
                                  <div className="w-px h-5 bg-border" />
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

                                {/* separator VAT7% | ราคา */}
                                <div className="w-px h-4 bg-border shrink-0 self-center mx-1" />

                                {/* 10. ราคา — 2-line เมื่อมี promo */}
                                <div className="w-[80px] text-right shrink-0 flex flex-col items-end leading-tight">
                                  {hasPromo ? (
                                    <>
                                      {/* ราคาพิเศษ */}
                                      <div className="flex items-baseline gap-0.5">
                                        <span className="font-bold text-sm" style={{color: isCancelled ? "#EF4444" : "#EA580C"}}>
                                          {p.special_price!.toLocaleString()}
                                        </span>
                                        <span className="text-[9px] text-orange-400">฿</span>
                                      </div>
                                      {/* ราคาปกติ (ขีดฆ่า) */}
                                      <div className="flex items-baseline gap-0.5">
                                        <span className="text-[9px] text-muted-foreground line-through">{p.price_per_seat.toLocaleString()}</span>
                                        <span className="text-[8px] text-muted-foreground/40">฿</span>
                                      </div>
                                      {/* ลดไป X บาท */}
                                      <span className="text-[8px] font-semibold text-orange-500">-{discount.toLocaleString()} บาท</span>
                                    </>
                                  ) : (
                                    <div className="flex items-baseline gap-0.5">
                                      <span className="font-bold text-sm" style={{
                                        color: isCancelled ? "#EF4444" : isFullDisplay ? "#9CA3AF" : "#16A34A"
                                      }}>{p.price_per_seat.toLocaleString()}</span>
                                      <span className="text-[9px] text-muted-foreground">฿</span>
                                    </div>
                                  )}
                                </div>

                                {/* separator ราคา | Book */}
                                <div className="w-px h-4 bg-border shrink-0 self-center mx-1" />

                                {/* 11. Progress bar — flex-1 matches header, fills remaining space */}
                                <div className="flex-1 min-w-[120px] max-w-[220px]">
                                  <div className="flex justify-between items-center mb-0.5">
                                    <span className={`text-[10px] font-semibold ${hasPending ? "text-amber-600" : "text-muted-foreground"}`}>
                                      จอง {bookedCount}<span className="font-normal text-muted-foreground">/{p.total_seats}</span>
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
                                        adjustPeriodQuota(t.id, pid, newQ - p.quota, actorName);
                                        setPendingQuota((prev) => { const n = { ...prev }; delete n[pid]; return n; });
                                        toast.success("อัปเดตโควต้าแล้ว");
                                      }}
                                    ><Save className="w-3.5 h-3.5" /></button>
                                  ) : <div className="w-7" />}
                                  {hasPending ? (
                                    <button
                                      className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border border-border"
                                      title="ยกเลิกการแก้ไข"
                                      onClick={() => setPendingQuota((prev) => { const n = { ...prev }; delete n[pid]; return n; })}
                                    ><X className="w-3.5 h-3.5" /></button>
                                  ) : <div className="w-7" />}
                                </div>

                                {/* 15+16. สถานะ + Actions — ml-auto กลุ่มชิดขวาสุด */}
                                <div className="ml-auto flex items-center gap-1 shrink-0">
                                  <div className="w-[70px] flex justify-center">
                                    {isCancelled ? (
                                      <span className="inline-flex flex-col items-center">
                                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/10 text-red-400 whitespace-nowrap">ยกเลิก</span>
                                        {p.cancel_reason && <span className="text-[9px] text-red-400/70 mt-0.5 text-center leading-tight max-w-[60px] truncate">*{p.cancel_reason}</span>}
                                      </span>
                                    ) : isFullDisplay ? (
                                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-muted text-muted-foreground whitespace-nowrap">ปิดกรุ๊ป</span>
                                    ) : currentQuota > 0 && currentQuota <= 3 ? (
                                      <span className="px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap bg-orange-500/10 text-orange-400">
                                        ⚠ เหลือ {currentQuota}
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-500/10 text-green-400 whitespace-nowrap">ว่าง</span>
                                    )}
                                  </div>
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
                                </div>
                              {/* Footnote — inside card */}
                              {isFootnoteOpen && (
                                <div className="px-9 py-2 text-xs space-y-1 border-t border-border bg-muted/40">
                                  {p.footnote && <div className="text-muted-foreground italic">*{p.footnote}</div>}
                                  {(p.tags ?? []).length > 0 && (
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-muted-foreground/60 text-[10px]">Tag:</span>
                                      {(p.tags ?? []).map((tag) => (
                                        <span key={tag} className="px-2 py-0.5 bg-card border border-border rounded-full text-[10px] text-muted-foreground">{tag}</span>
                                      ))}
                                    </div>
                                  )}
                                  {p.project && <div className="text-muted-foreground/60">โครงการ / Campaign: <span className="text-muted-foreground">{p.project}</span></div>}
                                  {p.note && <div className="text-muted-foreground/60">*หมายเหตุ: <span className="text-muted-foreground">{p.note}</span></div>}
                                  {/* ── Audit trail ── */}
                                  <div className="flex items-center gap-3 pt-1 border-t border-border mt-1 flex-wrap">
                                    {p.created_by && (
                                      <span className="text-muted-foreground">
                                        สร้างโดย <span className="font-medium text-muted-foreground">{p.created_by}</span>
                                        {p.created_at && <span className="ml-1 text-muted-foreground/40">· {new Date(p.created_at).toLocaleDateString("th-TH", {day:"numeric",month:"short",year:"2-digit",hour:"2-digit",minute:"2-digit"})}</span>}
                                      </span>
                                    )}
                                    {p.updated_by && p.updated_by !== p.created_by && (
                                      <span className="text-muted-foreground">
                                        แก้ไขโดย <span className="font-medium text-blue-600">{p.updated_by}</span>
                                        {p.updated_at && <span className="ml-1 text-muted-foreground/40">· {new Date(p.updated_at).toLocaleDateString("th-TH", {day:"numeric",month:"short",year:"2-digit",hour:"2-digit",minute:"2-digit"})}</span>}
                                      </span>
                                    )}
                                    {p.updated_by && p.updated_by === p.created_by && p.updated_at && p.updated_at !== p.created_at && (
                                      <span className="text-muted-foreground">
                                        อัปเดตล่าสุด <span className="ml-1 text-muted-foreground/40">{new Date(p.updated_at).toLocaleDateString("th-TH", {day:"numeric",month:"short",year:"2-digit",hour:"2-digit",minute:"2-digit"})}</span>
                                      </span>
                                    )}
                                    {!p.created_by && !p.updated_by && (
                                      <span className="text-muted-foreground/40 text-[10px]">ยังไม่มีข้อมูลเพิ่มเติม</span>
                                    )}
                                  </div>
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
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium transition-colors hover:bg-muted/30"
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
        <div className="py-14 flex flex-col items-center gap-3 bg-card border-t border-border anim-fade-in">
          {tours.length === 0 ? (
            <>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{background:"#F5F3FF"}}>
                <PackageSearch className="w-7 h-7" style={{color:"#7C3AED"}} />
              </div>
              <p className="text-base font-semibold text-foreground">ยังไม่มีโปรแกรมทัวร์</p>
              <p className="text-sm text-muted-foreground">เริ่มต้นด้วยการเพิ่มโปรแกรมทัวร์แรกของคุณ</p>
              {canEdit && (
                <button onClick={openAdd} className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity" style={{background:"#16A34A"}}>
                  <Plus className="w-4 h-4" /> เพิ่มโปรแกรมทัวร์แรก
                </button>
              )}
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{background:"#FFF7ED"}}>
                <Search className="w-7 h-7" style={{color:"#EA580C"}} />
              </div>
              <p className="text-base font-semibold text-foreground">ไม่พบโปรแกรมที่ตรงกับตัวกรอง</p>
              <button onClick={clearFilters} className="text-sm text-orange-600 hover:text-orange-700 underline">ล้างตัวกรองทั้งหมด</button>
            </>
          )}
        </div>
      )}

      {/* ── Program Dialog ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg w-[calc(100vw-24px)] sm:w-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <PackageSearch className="w-4 h-4" style={{color: "#7C3AED"}} />
              {editId ? "แก้ไขโปรแกรมทัวร์" : "เพิ่มโปรแกรมทัวร์ใหม่"}
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[72vh] pr-0.5 space-y-3.5">

            {/* ── ชื่อโปรแกรม ── */}
            <div>
              <label className="text-xs font-semibold">ชื่อโปรแกรมทัวร์ *</label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="เช่น ยุโรป 6 ประเทศ สวิส ฝรั่งเศส"
                className="mt-0.5"
              />
            </div>

            {/* ── รหัสทัวร์ + ระยะเวลา ── */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold">รหัสทัวร์</label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="HQO-TFU06-EU"
                  className="mt-0.5 font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-semibold">ระยะเวลา</label>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Input type="number" min={0} value={form.days}
                    onChange={(e) => setForm((f) => ({ ...f, days: e.target.value }))}
                    placeholder="6" className="text-center min-w-0" />
                  <span className="text-xs text-muted-foreground shrink-0">วัน</span>
                  <Input type="number" min={0} value={form.nights}
                    onChange={(e) => setForm((f) => ({ ...f, nights: e.target.value }))}
                    placeholder="5" className="text-center min-w-0" />
                  <span className="text-xs text-muted-foreground shrink-0">คืน</span>
                </div>
              </div>
            </div>

            {/* ── ประเภทการเดินทาง ── */}
            <div>
              <label className="text-xs font-semibold">ประเภทการเดินทาง *</label>
              <div className="grid grid-cols-3 gap-1.5 mt-1">
                {([
                  { value: "International Tour" as TourCategory, label: "✈️ ต่างประเทศ" },
                  { value: "Domestic"           as TourCategory, label: "🏠 ภายในประเทศ" },
                  { value: "Incentive"          as TourCategory, label: "🎯 Incentive" },
                ] as const).map(({ value, label }) => (
                  <button
                    key={value} type="button"
                    onClick={() => setForm((f) => ({ ...f, category: value }))}
                    className="py-2 rounded-xl text-xs font-semibold border-2 transition-all text-center leading-snug"
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
                        className="shrink-0 text-muted-foreground hover:text-red-500 transition-colors">
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
                {(showAllChips ? TOUR_TYPE_CHIPS : TOUR_TYPE_CHIPS.slice(0, 8)).map((chip) => (
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
                {!showAllChips && TOUR_TYPE_CHIPS.length > 8 && (
                  <button type="button" onClick={() => setShowAllChips(true)}
                    className="px-2.5 py-1 rounded-full text-xs font-medium border border-dashed transition-all"
                    style={{borderColor:"#A78BFA", color:"#7C3AED"}}>
                    +{TOUR_TYPE_CHIPS.length - 8} เพิ่มเติม
                  </button>
                )}
                {showAllChips && (
                  <button type="button" onClick={() => setShowAllChips(false)}
                    className="px-2.5 py-1 rounded-full text-xs font-medium border transition-all"
                    style={{borderColor:"#D1D5DB", color:"#9CA3AF"}}>
                    ย่อลง
                  </button>
                )}
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

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>ยกเลิก</Button>
            <Button className="flex-1 hover:opacity-90" onClick={submit} style={{background: "#16A34A", color: "#FFFFFF"}}>
              <Save className="w-3.5 h-3.5 mr-1.5" />บันทึกโปรแกรม
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Period Dialog — 2-column no-scroll layout ── */}
      <Dialog open={pOpen} onOpenChange={setPOpen}>
        <DialogContent className="max-w-[700px] w-[calc(100vw-16px)] sm:w-auto p-0 gap-0 rounded-2xl">
          {/* Header */}
          <DialogHeader className="px-4 pt-4 pb-2.5 border-b">
            <DialogTitle className="flex items-center gap-2 text-sm">
              <CalendarDays className="w-4 h-4 text-primary" />
              {pEditId ? "แก้ไข Period" : "เพิ่ม Period ใหม่"}
              <span className="text-xs font-normal text-muted-foreground bg-muted rounded px-2 py-0.5">
                {tours.find((t) => t.id === pTourId)?.code}
              </span>
            </DialogTitle>
          </DialogHeader>

          {/* Mobile: single column scroll / Desktop: 2-column no scroll */}
          <div className="overflow-y-auto max-h-[70vh] sm:max-h-none sm:overflow-visible">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 sm:divide-x">

            {/* ── LEFT: ข้อมูลพื้นฐาน ── */}
            <div className="px-4 py-3 space-y-2.5">
              {/* วันเดินทาง + วันกลับ */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-muted-foregrounduppercase tracking-wide">วันเดินทาง *</label>
                  <Input className="h-8 text-xs mt-0.5" type="date" value={pForm.start_date}
                    onChange={(e) => setPForm({ ...pForm, start_date: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foregrounduppercase tracking-wide">วันกลับ *</label>
                  <Input className="h-8 text-xs mt-0.5" type="date" value={pForm.end_date}
                    onChange={(e) => setPForm({ ...pForm, end_date: e.target.value })} min={pForm.start_date} />
                </div>
              </div>

              {/* Auto-calc + Manual override */}
              {pForm.start_date && pForm.end_date && pForm.days ? (
                <div className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 border ${pForm.manualNights ? "border-amber-300 bg-amber-50/60" : "border-primary/20 bg-primary/8"}`}>
                  <CalendarDays className={`w-3 h-3 shrink-0 ${pForm.manualNights ? "text-amber-500" : "text-primary"}`} />
                  {/* วัน — inline editable */}
                  <div className="flex items-center gap-0.5">
                    <input
                      type="number" min={1} max={30}
                      className={`w-8 h-5 text-center text-xs font-bold rounded border-0 bg-transparent outline-none focus:bg-card focus:border focus:border-primary/40 focus:rounded ${pForm.manualNights ? "text-amber-700" : "text-primary"}`}
                      value={pForm.days}
                      onChange={(e) => {
                        const d = Number(e.target.value);
                        if (d > 0) setPForm((f) => ({ ...f, days: String(d), nights: String(Math.max(0, d - 1)), manualNights: true }));
                      }}
                    />
                    <span className={`text-xs font-semibold ${pForm.manualNights ? "text-amber-700" : "text-primary"}`}>วัน</span>
                  </div>
                  {/* คืน — inline editable */}
                  <div className="flex items-center gap-0.5">
                    <input
                      type="number" min={0} max={30}
                      className={`w-8 h-5 text-center text-xs font-bold rounded border-0 bg-transparent outline-none focus:bg-card focus:border focus:border-primary/40 focus:rounded ${pForm.manualNights ? "text-amber-700" : "text-primary"}`}
                      value={pForm.nights}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        if (n >= 0) setPForm((f) => ({ ...f, nights: String(n), days: String(n + 1), manualNights: true }));
                      }}
                    />
                    <span className={`text-xs font-semibold ${pForm.manualNights ? "text-amber-700" : "text-primary"}`}>คืน</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground flex-1 truncate">{fmtThai(pForm.start_date)} – {fmtThai(pForm.end_date)}</span>
                  {/* badge + reset */}
                  {pForm.manualNights ? (
                    <button
                      type="button"
                      title="รีเซ็ตเป็นการคำนวณอัตโนมัติ"
                      onClick={() => setPForm((f) => {
                        // recalc
                        const s = new Date(f.start_date); const e2 = new Date(f.end_date);
                        const n = (!isNaN(s.getTime()) && !isNaN(e2.getTime())) ? Math.round((e2.getTime() - s.getTime()) / 86400000) : 0;
                        return { ...f, nights: String(n), days: String(n + 1), manualNights: false };
                      })}
                      className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300 hover:bg-amber-200 shrink-0 whitespace-nowrap"
                    >✏️ Manual · ↺ Auto</button>
                  ) : (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary/60 shrink-0 whitespace-nowrap">Auto</span>
                  )}
                </div>
              ) : (
                <div className="h-7 rounded-lg border border-dashed border-border flex items-center justify-center">
                  <span className="text-[10px] text-muted-foreground/40">เลือกวันเดินทางและวันกลับ</span>
                </div>
              )}

              {/* 💸 วางที่นั่ง — quick toggle right after วัน/คืน */}
              <button
                type="button"
                onClick={() => setPForm((f) => ({ ...f, seat_hold: !f.seat_hold }))}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all"
                style={pForm.seat_hold
                  ? { background: "#0D9488", color: "#fff", borderColor: "#0D9488" }
                  : { borderColor: "#E5E7EB", color: "#9CA3AF" }}
              >
                <span className="text-sm">💸</span>
                วางที่นั่ง
                {pForm.seat_hold && <span className="ml-auto text-[10px] opacity-80">เปิดอยู่</span>}
              </button>

              {/* ราคา + ที่นั่ง */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-muted-foregrounduppercase tracking-wide">ราคาปกติ (฿) *</label>
                  <Input className="h-8 text-xs mt-0.5" type="number" min={0}
                    value={pForm.price_per_seat} onChange={(e) => setPForm({ ...pForm, price_per_seat: e.target.value })} placeholder="29500" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foregrounduppercase tracking-wide">ที่นั่งทั้งหมด *</label>
                  <Input className="h-8 text-xs mt-0.5" type="number" min={0}
                    value={pForm.total_seats} onChange={(e) => setPForm({ ...pForm, total_seats: e.target.value })} placeholder="20" />
                </div>
              </div>

              {/* ราคาพิเศษ (optional — auto-trigger 🔥) */}
              <div>
                <label className="text-[10px] font-semibold text-muted-foregrounduppercase tracking-wide">
                  ราคาพิเศษ (฿)
                  {pForm.special_price && Number(pForm.special_price) > 0 && Number(pForm.special_price) < Number(pForm.price_per_seat) && (
                    <span className="ml-1.5 text-orange-500">🔥 auto</span>
                  )}
                </label>
                <div className="relative mt-0.5">
                  <Input
                    className={`h-8 text-xs pr-8 ${pForm.special_price && Number(pForm.special_price) < Number(pForm.price_per_seat) ? "border-orange-300 bg-orange-50/40 focus-visible:ring-orange-300" : ""}`}
                    type="number" min={0}
                    value={pForm.special_price}
                    onChange={(e) => setPForm({ ...pForm, special_price: e.target.value })}
                    placeholder="ว่างเปล่า = ไม่มีโปรโมชั่น"
                  />
                  {pForm.special_price && Number(pForm.special_price) > 0 && Number(pForm.special_price) < Number(pForm.price_per_seat) && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm">🔥</span>
                  )}
                </div>
                {pForm.special_price && pForm.price_per_seat && Number(pForm.special_price) < Number(pForm.price_per_seat) && (
                  <p className="text-[9px] text-orange-500 mt-0.5">
                    ลด {(Number(pForm.price_per_seat) - Number(pForm.special_price)).toLocaleString()} บาท จากราคาปกติ {Number(pForm.price_per_seat).toLocaleString()} บาท
                  </p>
                )}
                {pForm.special_price && pForm.price_per_seat && Number(pForm.special_price) >= Number(pForm.price_per_seat) && (
                  <p className="text-[9px] text-red-400 mt-0.5">⚠ ราคาพิเศษต้องน้อยกว่าราคาปกติ</p>
                )}
              </div>

              {/* สายการบิน + บิน (departure city) */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-muted-foregrounduppercase tracking-wide">สายการบิน</label>
                  <Input className="h-8 text-xs mt-0.5" value={pForm.airline_code}
                    onChange={(e) => setPForm({ ...pForm, airline_code: e.target.value })} placeholder="FD, TG, VZ..." />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-pink-500 uppercase tracking-wide">บิน (ต้นทาง)</label>
                  <div className="flex gap-1 mt-0.5">
                    {(["", "CNX", "DMK", "BKK"] as const).map((city) => (
                      <button
                        key={city || "none"}
                        type="button"
                        onClick={() => setPForm((f) => ({ ...f, departure_city: city }))}
                        className="flex-1 h-8 rounded-md text-xs font-bold border transition-all"
                        style={
                          pForm.departure_city === city
                            ? { background: city ? "#EC4899" : "#F3F4F6", color: city ? "#fff" : "#9CA3AF", borderColor: city ? "#EC4899" : "#E5E7EB" }
                            : { borderColor: "#E5E7EB", color: "#9CA3AF", background: "transparent" }
                        }
                      >
                        {city || "–"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── ตัวเลือก Chip — moved to left ── */}
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">ตัวเลือก Chip</label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {([
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
            </div>

            {/* ── RIGHT: Campaign / หมายเหตุ / Footnote ── */}
            <div className="px-4 py-3 space-y-2.5 bg-muted/10 border-t sm:border-t-0">

              {/* Campaign */}
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Campaign</label>
                <Input className="h-8 text-xs mt-0.5" value={pForm.project}
                  onChange={(e) => setPForm({ ...pForm, project: e.target.value })} placeholder="campaign name..." />
              </div>

              {/* หมายเหตุ */}
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">หมายเหตุ</label>
                <Input className="h-8 text-xs mt-0.5" value={pForm.note}
                  onChange={(e) => setPForm({ ...pForm, note: e.target.value })} placeholder="วางที่นั่งแล้ว / ราคาพิเศษ..." />
              </div>

              {/* Footnote */}
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Footnote (กด ▶ ขยายแถว)</label>
                <Input className="h-8 text-xs mt-1"
                  value={pForm.footnote}
                  onChange={(e) => setPForm((f) => ({ ...f, footnote: e.target.value }))}
                  placeholder="บริษัท ABC ประมาณ 10 ท่าน VIP..."
                />
              </div>
            </div>
          </div>
          </div>{/* end scroll wrapper */}

          {/* Bottom full-width: สถานะ (edit) + footer */}
          <div className="border-t px-4 py-2.5 shrink-0">
            {/* สถานะ Period — edit mode (mobile: stack, desktop: row) */}
            {pEditId && (
              <div className={`flex flex-wrap items-center gap-2 mb-2 rounded-lg px-3 py-1.5 border ${pForm.cancelled ? "border-destructive/30 bg-destructive/5" : "border-border bg-muted/20"}`}>
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
                    <SelectTrigger className="h-7 text-xs border-destructive/30 flex-1 min-w-[140px]">
                      <SelectValue placeholder="เลือกเหตุผล..." />
                    </SelectTrigger>
                    <SelectContent>
                      {CANCEL_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setPOpen(false)}>ยกเลิก</Button>
              <Button size="sm" onClick={submitPeriod}
                style={pForm.cancelled ? {background: "#EF4444", color: "#fff"} : {background: "#16A34A", color: "#fff"}}
                className="hover:opacity-90"
              >บันทึก</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Import Preview Dialog ── */}
      {importPreviewData && (
        <Dialog open={!!importPreviewData} onOpenChange={() => setImportPreviewData(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>ตรวจสอบก่อน Import</DialogTitle>
            </DialogHeader>
            <div className="flex gap-3 mb-4">
              <div className="flex-1 bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-green-700">{importPreviewData.toCreate}</div>
                <div className="text-xs text-green-600 mt-1 font-medium">ทัวร์ใหม่จะถูกสร้าง</div>
              </div>
              <div className="flex-1 bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-blue-700">{importPreviewData.toUpdate}</div>
                <div className="text-xs text-blue-600 mt-1 font-medium">Period จะถูกเพิ่มเข้าทัวร์เดิม</div>
              </div>
            </div>
            {importPreviewData.preview.length > 0 && (
              <div className="max-h-72 overflow-y-auto rounded-lg border text-xs">
                <table className="w-full">
                  <thead className="bg-muted sticky top-0 z-10">
                    <tr>
                      <th className="px-2.5 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">สถานะ</th>
                      <th className="px-2.5 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">รหัสทัวร์</th>
                      <th className="px-2.5 py-2 text-left font-semibold text-muted-foreground">เมือง / เส้นทาง</th>
                      <th className="px-2.5 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">ประเทศ</th>
                      <th className="px-2.5 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">วันเดินทาง</th>
                      <th className="px-2.5 py-2 text-right font-semibold text-muted-foreground whitespace-nowrap">ราคา/ที่นั่ง</th>
                      <th className="px-2.5 py-2 text-right font-semibold text-muted-foreground whitespace-nowrap">ที่นั่ง</th>
                      <th className="px-2.5 py-2 text-center font-semibold text-muted-foreground whitespace-nowrap">สายการบิน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {importPreviewData.preview.map((row, i) => (
                      <tr key={i} className={`hover:bg-muted/50 ${row.action === "สร้างใหม่" ? "bg-green-500/5" : "bg-blue-500/5"}`}>
                        <td className="px-2.5 py-1.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${
                            row.action === "สร้างใหม่" ? "bg-green-500/10 text-green-400" : "bg-blue-500/10 text-blue-400"
                          }`}>
                            {row.action === "สร้างใหม่" ? "✦ สร้างใหม่" : "+ Period"}
                          </span>
                        </td>
                        <td className="px-2.5 py-1.5 font-mono font-semibold text-foreground whitespace-nowrap">{row.code}</td>
                        <td className="px-2.5 py-1.5 text-foreground max-w-[200px] truncate" title={row.city}>{row.city || <span className="text-muted-foreground/40">–</span>}</td>
                        <td className="px-2.5 py-1.5 text-muted-foreground whitespace-nowrap">{row.country || <span className="text-muted-foreground/40">–</span>}</td>
                        <td className="px-2.5 py-1.5 text-muted-foreground whitespace-nowrap font-mono">
                          {row.start_date || <span className="text-muted-foreground/40">–</span>}
                        </td>
                        <td className="px-2.5 py-1.5 text-right text-foreground whitespace-nowrap font-medium">
                          {row.price_per_seat ? `฿${row.price_per_seat.toLocaleString()}` : <span className="text-muted-foreground/40">–</span>}
                        </td>
                        <td className="px-2.5 py-1.5 text-right text-muted-foreground whitespace-nowrap">
                          {row.total_seats ?? <span className="text-muted-foreground/40">–</span>}
                        </td>
                        <td className="px-2.5 py-1.5 text-center font-mono text-muted-foreground">
                          {row.airline_code || <span className="text-muted-foreground/40">–</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {importPreviewData.preview.length === 0 && (
              <div className="text-center py-4 text-sm text-muted-foreground">ไม่พบแถวที่ import ได้ — ตรวจสอบ format ไฟล์อีกครั้ง</div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setImportPreviewData(null)}>ยกเลิก</Button>
              <Button
                disabled={importPreviewData.preview.length === 0}
                onClick={() => { handleImport(importPreviewData.rows); setImportPreviewData(null); }}
                style={{background: "#16A34A", color: "#fff"}}
              >
                ยืนยัน Import {importPreviewData.rows.length} แถว
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Import Error Report Dialog ── */}
      {importErrors.length > 0 && (
        <Dialog open={importErrors.length > 0} onOpenChange={() => setImportErrors([])}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-orange-700">
                <AlertCircle className="w-5 h-5 text-orange-500" />
                พบปัญหาระหว่าง Import — {importErrors.length} แถว
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground mb-3">
              ข้อมูลที่ไม่มีปัญหายังถูก import เข้าระบบแล้ว แต่แถวด้านล่างนี้ควรแก้ไขแล้ว import ใหม่อีกครั้ง
            </p>
            <div className="max-h-72 overflow-y-auto rounded-lg border text-xs">
              <table className="w-full">
                <thead className="bg-orange-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-orange-700 whitespace-nowrap">แถว Excel</th>
                    <th className="px-3 py-2 text-left font-semibold text-orange-700 whitespace-nowrap">รหัสทัวร์</th>
                    <th className="px-3 py-2 text-left font-semibold text-orange-700">ปัญหาที่พบ</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {importErrors.map((err, i) => (
                    <tr key={i} className="hover:bg-orange-50/30">
                      <td className="px-3 py-2 font-mono font-bold text-orange-800">Row {err.row}</td>
                      <td className="px-3 py-2 font-mono text-foreground">{err.code}</td>
                      <td className="px-3 py-2 text-foreground">{err.issue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setImportErrors([])}>ปิด</Button>
              <Button
                onClick={() => {
                  const csv = ["แถว Excel,รหัสทัวร์,ปัญหาที่พบ", ...importErrors.map(e => `${e.row},"${e.code}","${e.issue}"`)].join("\n");
                  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a"); a.href = url; a.download = "import-errors.csv"; a.click();
                  URL.revokeObjectURL(url);
                }}
                style={{background:"#F97316",color:"#fff"}}
              >
                ดาวน์โหลด Error Report (.csv)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
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
  const [carSearch, setCarSearch] = useState("");
  const [showSkeleton, setShowSkeleton] = useState(cars.length === 0);

  useEffect(() => {
    const t = setTimeout(() => setShowSkeleton(false), 2000);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => { if (cars.length > 0) setShowSkeleton(false); }, [cars.length]);

  const filteredCars = useMemo(() => {
    if (!carSearch.trim()) return cars;
    const q = carSearch.toLowerCase();
    return cars.filter((c) => c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q));
  }, [cars, carSearch]);

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
    <div className="space-y-3 anim-tab-enter">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <p className="text-sm text-muted-foreground">
            รวม {cars.length} คัน
            {carSearch && filteredCars.length !== cars.length && <span className="ml-1.5 text-xs text-amber-600 font-medium">(กรอง {filteredCars.length})</span>}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">🚗 บริการเช่ารถ — ไม่จำกัดโควต้า (Unlimited)</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input className="pl-8 h-8 text-sm w-36 sm:w-44" placeholder="ค้นหารถ..." value={carSearch} onChange={(e) => setCarSearch(e.target.value)} />
            {carSearch && <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground" onClick={() => setCarSearch("")}><X className="w-3.5 h-3.5" /></button>}
          </div>
          <ImportExportMenu fields={CAR_FIELDS} sheetName="รถเช่า" filename="cars" data={exportData} onImport={handleImport} canImport={canEdit} />
          {canEdit && <Button onClick={openAdd} className="bg-gradient-pink text-accent-foreground"><Plus className="w-4 h-4 mr-1" /> เพิ่มรถ</Button>}
        </div>
      </div>

      {/* Skeleton — แสดงเมื่อ load จาก Supabase ยังไม่มาถึง */}
      {showSkeleton && (
        <>
          <div className="hidden sm:block bg-card rounded-xl border overflow-hidden animate-pulse">
            {[1,2,3].map((i) => (
              <div key={i} className="flex items-center gap-4 px-3 py-3.5 border-b last:border-0">
                <div className="h-4 bg-muted rounded w-1/4" />
                <div className="h-3 bg-muted/60 rounded w-1/6" />
                <div className="h-3 bg-muted/60 rounded w-1/12 ml-auto" />
                <div className="h-3 bg-muted/60 rounded w-1/6" />
              </div>
            ))}
          </div>
          <div className="sm:hidden space-y-2">
            {[1,2,3].map((i) => (
              <div key={i} className="bg-card rounded-xl border p-3.5 animate-pulse">
                <div className="h-4 bg-muted rounded w-2/5 mb-2" />
                <div className="h-3 bg-muted/60 rounded w-1/4" />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Desktop table — hidden on mobile */}
      {!showSkeleton && (
      <div className="hidden sm:block bg-card rounded-xl border shadow-soft overflow-hidden">
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
              {filteredCars.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30 anim-fade-in">
                  <td className="p-3 font-semibold">{c.name}</td>
                  <td className="p-3">{c.type}</td>
                  <td className="p-3 text-center">{c.total_seats}</td>
                  <td className="p-3 text-right font-bold">{c.rate_per_day.toLocaleString()}</td>
                  <td className="p-3">{c.seat_material}</td>
                  <td className="p-3 text-xs text-muted-foreground">{c.note || "-"}</td>
                  {canEdit && (
                    <td className="p-3 text-right whitespace-nowrap">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(c.id)}><Pencil className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => { if (confirm("ลบรถคันนี้?")) { deleteCar(c.id); toast.success("ลบแล้ว"); } }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </td>
                  )}
                </tr>
              ))}
              {filteredCars.length === 0 && cars.length === 0 && (
                <tr><td colSpan={canEdit ? 7 : 6} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center"><Car className="w-6 h-6 text-muted-foreground/40" /></div>
                    <p className="text-sm font-medium text-muted-foreground">ยังไม่มีรถในระบบ</p>
                    <p className="text-xs text-muted-foreground/60">เพิ่มรถเช่าเพื่อเริ่มจัดการบริการ</p>
                  </div>
                </td></tr>
              )}
              {filteredCars.length === 0 && cars.length > 0 && (
                <tr><td colSpan={canEdit ? 7 : 6} className="py-8 text-center">
                  <div className="flex flex-col items-center gap-1.5">
                    <Search className="w-5 h-5 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">ไม่พบรถที่ตรงกับ "<span className="font-medium">{carSearch}</span>"</p>
                    <button onClick={() => setCarSearch("")} className="text-xs text-blue-500 hover:underline mt-0.5">ล้างการค้นหา</button>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Mobile cards — hidden on sm+ */}
      {!showSkeleton && (
      <div className="sm:hidden space-y-2">
        {filteredCars.length === 0 && cars.length === 0 && (
          <div className="py-12 flex flex-col items-center gap-3 bg-card rounded-xl border">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center"><Car className="w-7 h-7 text-muted-foreground/40" /></div>
            <div className="text-center">
              <p className="text-sm font-semibold text-muted-foreground">ยังไม่มีรถในระบบ</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">เพิ่มรถเช่าเพื่อเริ่มจัดการบริการ</p>
            </div>
            {canEdit && <Button onClick={openAdd} size="sm" className="bg-gradient-pink text-accent-foreground"><Plus className="w-3.5 h-3.5 mr-1" /> เพิ่มรถคันแรก</Button>}
          </div>
        )}
        {filteredCars.length === 0 && cars.length > 0 && (
          <div className="py-8 flex flex-col items-center gap-2 bg-card rounded-xl border">
            <Search className="w-5 h-5 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">ไม่พบรถที่ตรงกับ "<span className="font-medium">{carSearch}</span>"</p>
            <button onClick={() => setCarSearch("")} className="text-xs text-blue-500 hover:underline">ล้างการค้นหา</button>
          </div>
        )}
        {filteredCars.map((c, idx) => (
          <div key={c.id} className="bg-card rounded-xl border shadow-soft p-3.5 anim-card-in" style={{animationDelay: `${idx * 40}ms`}}>
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-base text-foreground leading-snug">{c.name}</span>
                  {c.type && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{c.type}</span>}
                  {c.seat_material && c.seat_material !== "ไม่ระบุ" && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">{c.seat_material}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <div className="flex items-center gap-1">
                    <Car className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{c.total_seats} ที่นั่ง</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold text-foreground">฿{c.rate_per_day.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground">/วัน</span>
                  </div>
                </div>
                {c.note && <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{c.note}</p>}
              </div>
              {canEdit && (
                <div className="flex items-center gap-0.5 shrink-0">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(c.id)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { if (confirm("ลบรถคันนี้?")) { deleteCar(c.id); toast.success("ลบแล้ว"); } }}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      )}

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
    <div className="anim-tab-enter">
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
    </div>
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
      searchable searchPlaceholder="ค้นหาสายการบิน..."
      importExport={<ImportExportMenu fields={FLIGHT_FIELDS} sheetName="ตั๋วเครื่องบิน" filename="flights" data={exportData} onImport={handleImport} canImport={canEdit} />}
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
      searchable searchPlaceholder="ค้นหาโรงแรม..."
      importExport={<ImportExportMenu fields={HOTEL_FIELDS} sheetName="โรงแรม" filename="hotels" data={exportData} onImport={handleImport} canImport={canEdit} />}
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
      searchable searchPlaceholder="ค้นหา Visa..."
      importExport={<ImportExportMenu fields={VISA_FIELDS} sheetName="Visa" filename="visas" data={exportData} onImport={handleImport} canImport={canEdit} />}
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
      searchable searchPlaceholder="ค้นหาประกัน..."
      importExport={<ImportExportMenu fields={INSURANCE_FIELDS} sheetName="ประกัน" filename="insurances" data={exportData} onImport={handleImport} canImport={canEdit} />}
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
  searchable?: boolean;
  searchPlaceholder?: string;
}
function SimpleTable({ title, cols, rows, canEdit, onAdd, onEdit, onDelete, dialog, importExport, searchable, searchPlaceholder }: SimpleTableProps) {
  const [q, setQ] = useState("");
  const [ready, setReady] = useState(rows.length > 0);
  useEffect(() => {
    if (rows.length > 0) { setReady(true); return; }
    const t = setTimeout(() => setReady(true), 1800);
    return () => clearTimeout(t);
  }, [rows.length]);

  const filteredRows = useMemo(() => {
    if (!searchable || !q.trim()) return rows;
    const lq = q.toLowerCase();
    return rows.filter((r) =>
      r.cells.some((cell) => typeof cell === "string" && cell.toLowerCase().includes(lq))
    );
  }, [rows, q, searchable]);

  return (
    <div className="space-y-3 anim-tab-enter">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm text-muted-foreground">
          {title} · {rows.length} รายการ
          {searchable && q && filteredRows.length !== rows.length && (
            <span className="ml-1.5 text-xs text-amber-600 font-medium">(กรอง {filteredRows.length})</span>
          )}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {searchable && (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input className="pl-8 h-8 text-sm w-36 sm:w-44" placeholder={searchPlaceholder ?? "ค้นหา..."} value={q} onChange={(e) => setQ(e.target.value)} />
              {q && <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground" onClick={() => setQ("")}><X className="w-3.5 h-3.5" /></button>}
            </div>
          )}
          {importExport}
          {canEdit && <Button onClick={onAdd} className="bg-gradient-pink text-accent-foreground"><Plus className="w-4 h-4 mr-1" /> เพิ่ม</Button>}
        </div>
      </div>

      {/* Skeleton — show while data hasn't arrived yet */}
      {!ready && (
        <>
          <div className="hidden sm:block bg-card rounded-xl border overflow-hidden animate-pulse">
            {[1,2,3].map((i) => (
              <div key={i} className="flex items-center gap-4 px-3 py-3.5 border-b last:border-0">
                <div className="h-4 bg-muted rounded w-1/4" />
                <div className="h-3 bg-muted/60 rounded w-1/5" />
                <div className="h-3 bg-muted/60 rounded w-1/6 ml-auto" />
              </div>
            ))}
          </div>
          <div className="sm:hidden space-y-2">
            {[1,2,3].map((i) => (
              <div key={i} className="bg-card rounded-xl border p-3.5 animate-pulse">
                <div className="h-4 bg-muted rounded w-2/5 mb-2" />
                <div className="h-3 bg-muted/60 rounded w-1/3" />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Desktop table — hidden on mobile */}
      {ready && (
      <div className="hidden sm:block bg-card rounded-xl border shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                {cols.map((c) => <th key={c} className="p-3 text-left">{c}</th>)}
                {canEdit && <th className="p-3"></th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredRows.map((r) => (
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
              {filteredRows.length === 0 && rows.length === 0 && (
                <tr><td colSpan={cols.length + (canEdit ? 1 : 0)} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center"><PackageSearch className="w-6 h-6 text-muted-foreground/40" /></div>
                    <p className="text-sm font-medium text-muted-foreground">ยังไม่มีรายการ</p>
                  </div>
                </td></tr>
              )}
              {filteredRows.length === 0 && rows.length > 0 && (
                <tr><td colSpan={cols.length + (canEdit ? 1 : 0)} className="py-8 text-center">
                  <div className="flex flex-col items-center gap-1.5">
                    <Search className="w-5 h-5 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">ไม่พบรายการที่ตรงกับ "<span className="font-medium">{q}</span>"</p>
                    <button onClick={() => setQ("")} className="text-xs text-blue-500 hover:underline mt-0.5">ล้างการค้นหา</button>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Mobile cards — hidden on sm+ */}
      {ready && (
      <div className="sm:hidden space-y-2">
        {filteredRows.length === 0 && rows.length === 0 && (
          <div className="py-12 flex flex-col items-center gap-3 bg-card rounded-xl border">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center"><PackageSearch className="w-7 h-7 text-muted-foreground/40" /></div>
            <div className="text-center">
              <p className="text-sm font-semibold text-muted-foreground">ยังไม่มีรายการ</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">กด เพิ่ม เพื่อเริ่มต้น</p>
            </div>
            {canEdit && <Button onClick={onAdd} size="sm" className="bg-gradient-pink text-accent-foreground"><Plus className="w-3.5 h-3.5 mr-1" /> เพิ่มรายการแรก</Button>}
          </div>
        )}
        {filteredRows.length === 0 && rows.length > 0 && (
          <div className="py-8 flex flex-col items-center gap-2 bg-card rounded-xl border">
            <Search className="w-5 h-5 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">ไม่พบรายการที่ตรงกับ "<span className="font-medium">{q}</span>"</p>
            <button onClick={() => setQ("")} className="text-xs text-blue-500 hover:underline">ล้างการค้นหา</button>
          </div>
        )}
        {filteredRows.map((r, idx) => (
          <div key={r.id} className="bg-card rounded-xl border shadow-soft p-3.5 anim-card-in" style={{animationDelay: `${idx * 40}ms`}}>
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0 space-y-1">
                {r.cells.map((cell, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[10px] text-muted-foreground font-semibold shrink-0 mt-0.5 min-w-[56px]">{cols[i]}</span>
                    <span className={`text-sm text-foreground ${i === 0 ? "font-semibold" : ""}`}>{cell}</span>
                  </div>
                ))}
              </div>
              {canEdit && (
                <div className="flex items-center gap-0.5 shrink-0">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(r.id)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { if (confirm("ลบรายการนี้?")) onDelete(r.id); }}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      )}
      {dialog}
    </div>
  );
}

