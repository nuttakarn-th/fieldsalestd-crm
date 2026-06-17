import React, { useMemo, useState, useEffect } from "react";
import { PackageSearch, Plus, Pencil, Trash2, Plane, Car, Hotel, FileBadge, Shield, MapPinned, Lock, Minus, ChevronDown, ChevronRight, CalendarDays, XCircle, AlertTriangle } from "lucide-react";
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

/* ========= Tour ========= */
const TOUR_FIELDS: ExcelField[] = [
  { key: "category",      header: "ประเภท",            example: "International Tour" },
  { key: "code",          header: "รหัสทัวร์",         example: "HQO-KMG04", required: true },
  { key: "city",          header: "เมือง",             example: "คุนหมิง",    required: true },
  { key: "country",       header: "ประเทศ",            example: "จีน" },
  { key: "price_per_seat",header: "ราคา/ที่นั่ง",     example: "25900",  type: "number" },
  { key: "total_seats",   header: "จำนวนที่นั่งทั้งหมด", example: "40",  type: "number" },
  { key: "note",          header: "หมายเหตุ",          example: "ซากุระบาน" },
];

// ── blank form helpers ──────────────────────────────────────────────────────
const blankTourForm = () => ({
  category: "International Tour" as TourCategory,
  code: "", city: "", country: "",
  startDate: "", returnDate: "",
  days: "", nights: "",
  note: "",
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
});

function TourSection({ canEdit }: { canEdit: boolean }) {
  const tours       = useServices((s) => s.tours);
  const addTour     = useServices((s) => s.addTour);
  const updateTour  = useServices((s) => s.updateTour);
  const deleteTour  = useServices((s) => s.deleteTour);
  const addPeriod    = useServices((s) => s.addPeriod);
  const updatePeriod = useServices((s) => s.updatePeriod);
  const deletePeriod = useServices((s) => s.deletePeriod);

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
    const dur = parseDuration(t.duration); const per = parsePeriod(t.period);
    setForm({ category: t.category, code: t.code, city: t.city, country: t.country,
      startDate: per.startDate, returnDate: per.returnDate, days: dur.days, nights: dur.nights,
      note: t.note ?? "" });
    setOpen(true);
  };
  const submit = () => {
    if (!form.code || !form.city) { toast.error("กรุณากรอกรหัสและชื่อเมือง"); return; }
    const days = Number(form.days || 0); const nights = Number(form.nights || 0);
    const duration = days || nights ? `${days} วัน ${nights} คืน` : "";
    if (editId) {
      updateTour(editId, { category: form.category, code: form.code, city: form.city, country: form.country,
        duration, note: form.note });
    } else {
      addTour({ category: form.category, code: form.code, city: form.city, country: form.country,
        period: "", duration, price_per_seat: 0, note: form.note,
        total_seats: 0, quota: 0, periods: [] });
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

  const exportData = useMemo(() =>
    tours.map((t) => ({ category: t.category, code: t.code, city: t.city, country: t.country,
      price_per_seat: t.price_per_seat, total_seats: t.total_seats, note: t.note ?? "" })), [tours]);
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <p className="text-sm text-muted-foreground">รวม {tours.length} โปรแกรม · International Tour / Domestic / Incentive</p>
          <p className="text-xs text-muted-foreground mt-0.5">🎯 โควต้าตัดอัตโนมัติเมื่อปิดดีล Closed Won · คืนอัตโนมัติเมื่อยกเลิก</p>
        </div>
        <div className="flex items-center gap-2">
          <ImportExportMenu fields={TOUR_FIELDS} sheetName="ทัวร์" filename="tours" data={exportData} onImport={handleImport} />
          {canEdit && <Button onClick={openAdd} className="bg-gradient-pink text-accent-foreground"><Plus className="w-4 h-4 mr-1" /> เพิ่มทัวร์</Button>}
        </div>
      </div>

      {TOUR_CATS.map((cat) => {
        const items = tours.filter((t) => t.category === cat);
        if (items.length === 0) return null;
        return (
          <div key={cat} className="bg-card rounded-xl border shadow-soft overflow-hidden">
            <div className="p-3 border-b bg-gradient-to-r from-primary/5 to-accent/5 flex items-center gap-2">
              <Badge className="bg-primary text-primary-foreground">{cat}</Badge>
              <span className="text-xs text-muted-foreground">{items.length} โปรแกรม</span>
            </div>
            <div className="divide-y">
              {items.map((t) => {
                const hasPeriods = (t.periods?.length ?? 0) > 0;
                const isExpanded = expanded.has(t.id);
                // สรุปราคาจาก periods
                const prices = hasPeriods ? t.periods!.map((p) => p.price_per_seat) : [];
                const priceLabel = hasPeriods
                  ? (Math.min(...prices) === Math.max(...prices)
                    ? `${Math.min(...prices).toLocaleString()}`
                    : `${Math.min(...prices).toLocaleString()} – ${Math.max(...prices).toLocaleString()}`)
                  : t.price_per_seat.toLocaleString();

                return (
                  <div key={t.id}>
                    {/* ── Program Row ── */}
                    <div className={`flex items-center gap-2 p-2 hover:bg-muted/30 ${isExpanded ? "bg-primary/5" : ""}`}>
                      {/* expand toggle */}
                      <button
                        className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted shrink-0"
                        onClick={() => toggleExpand(t.id)}
                        title={hasPeriods ? (isExpanded ? "ซ่อน periods" : "ดู periods") : "ไม่มี period"}
                      >
                        {hasPeriods
                          ? (isExpanded ? <ChevronDown className="w-4 h-4 text-primary" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />)
                          : <span className="w-4 h-4 block" />}
                      </button>

                      <div className="flex-1 min-w-0 grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto_auto_auto_auto] items-center gap-3 text-sm">
                        <div>
                          <div className="font-mono text-xs font-semibold">{t.code}</div>
                          <div className="text-[10px] text-muted-foreground">{t.duration}</div>
                        </div>
                        <div>
                          <div className="font-semibold truncate">{t.city}</div>
                          <div className="text-xs text-muted-foreground">{t.country}</div>
                        </div>
                        {/* period count badge หรือ legacy period text */}
                        <div className="text-xs text-muted-foreground">
                          {hasPeriods
                            ? <Badge variant="outline" className="text-[10px] gap-1 border-primary/40 text-primary">
                                <CalendarDays className="w-3 h-3" />{t.periods!.length} period
                              </Badge>
                            : <span className="line-clamp-1 max-w-[140px]">{t.period || "—"}</span>}
                        </div>
                        <div className="text-right font-bold text-sm">{priceLabel} <span className="text-[10px] font-normal text-muted-foreground">฿</span></div>
                        <div>
                          {hasPeriods
                            ? <div className="text-xs text-muted-foreground text-right">รวม {t.total_seats} / ว่าง {t.quota}</div>
                            : <QuotaBar quota={t.quota} total_seats={t.total_seats} canEdit={canEdit} tourId={t.id} />}
                        </div>
                        {canEdit && (
                          <div className="flex items-center gap-0.5 justify-end">
                            {hasPeriods
                              ? <Button size="sm" variant="outline" className="h-7 text-[10px] px-2" onClick={() => openAddPeriod(t.id)}>
                                  <Plus className="w-3 h-3 mr-0.5" />Period
                                </Button>
                              : null}
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(t.id)}><Pencil className="w-3.5 h-3.5" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                              const booked = t.total_seats - t.quota;
                              if (booked > 0) { toast.error(`ไม่สามารถลบได้ มีที่นั่งถูกจองแล้ว ${booked} ที่`); return; }
                              if (confirm("ลบทัวร์นี้?")) { deleteTour(t.id); toast.success("ลบแล้ว"); }
                            }}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── Period Sub-Table ── */}
                    {hasPeriods && isExpanded && (
                      <div className="bg-muted/30 border-t">
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead className="bg-muted/60 text-muted-foreground">
                              <tr>
                                <th className="px-3 py-2 text-left pl-10 w-8">สถานะ</th>
                                <th className="px-3 py-2 text-left">วันเดินทาง</th>
                                <th className="px-3 py-2 text-right">ราคา/ที่นั่ง</th>
                                <th className="px-3 py-2 text-left">ที่นั่ง / โควต้า</th>
                                <th className="px-3 py-2 text-left">สายการบิน</th>
                                <th className="px-3 py-2 text-left">โครงการ</th>
                                <th className="px-3 py-2 text-left">หมายเหตุ</th>
                                {canEdit && <th className="px-3 py-2" />}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                              {t.periods!.map((p) => {
                                const isCancelled = p.cancelled;
                                const isFull = !isCancelled && p.quota === 0;
                                const rowCls = isCancelled
                                  ? "bg-destructive/5 opacity-70 line-through-none"
                                  : isFull ? "bg-amber-50 dark:bg-amber-950/20" : "hover:bg-muted/50";
                                return (
                                <tr key={p.period_id} className={rowCls}>
                                  {/* Status badge */}
                                  <td className="px-3 py-2 pl-10">
                                    {isCancelled ? (
                                      <span className="inline-flex flex-col items-center gap-0.5">
                                        <span className="text-[10px] font-bold text-destructive leading-tight">❌</span>
                                        <span className="text-[9px] text-destructive/80 leading-tight max-w-[52px] text-center truncate" title={p.cancel_reason}>{p.cancel_reason || "ยกเลิก"}</span>
                                      </span>
                                    ) : isFull ? (
                                      <span className="text-[10px] font-bold text-amber-600">🔴 FULL</span>
                                    ) : (
                                      <span className="text-[10px] text-green-600 font-semibold">✅</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 font-medium">
                                    <div>{p.travel_date}</div>
                                    {(p.days || p.nights) && (
                                      <div className="text-[10px] text-muted-foreground">{p.days}วัน {p.nights}คืน</div>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-right font-bold">{p.price_per_seat.toLocaleString()}</td>
                                  <td className="px-3 py-2">
                                    {isCancelled
                                      ? <span className="text-[10px] text-muted-foreground">—</span>
                                      : <PeriodQuotaBar quota={p.quota} total_seats={p.total_seats} canEdit={canEdit} tourId={t.id} periodId={p.period_id} />
                                    }
                                  </td>
                                  <td className="px-3 py-2 text-muted-foreground">{p.airline_code || "—"}</td>
                                  <td className="px-3 py-2 text-muted-foreground">{p.project || "—"}</td>
                                  <td className="px-3 py-2 text-muted-foreground">{p.note || "—"}</td>
                                  {canEdit && (
                                    <td className="px-3 py-2 text-right whitespace-nowrap">
                                      <Button size="icon" variant="ghost" className="h-6 w-6" title="แก้ไข / ยกเลิก period" onClick={() => openEditPeriod(t.id, p)}><Pencil className="w-3 h-3" /></Button>
                                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => {
                                        const booked = p.total_seats - p.quota;
                                        if (booked > 0) { toast.error(`ลบไม่ได้ มีที่จองแล้ว ${booked} ที่`); return; }
                                        if (confirm("ลบ period นี้?")) { deletePeriod(t.id, p.period_id); toast.success("ลบ period แล้ว"); }
                                      }}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                                    </td>
                                  )}
                                </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        {canEdit && (
                          <div className="px-4 py-2 border-t border-border/50">
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-primary hover:text-primary" onClick={() => openAddPeriod(t.id)}>
                              <Plus className="w-3 h-3 mr-1" /> เพิ่ม Period ใหม่
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── No-periods: Add Period button ── */}
                    {!hasPeriods && canEdit && (
                      <div className="pl-9 pb-2">
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] text-muted-foreground hover:text-primary px-2" onClick={() => openAddPeriod(t.id)}>
                          <CalendarDays className="w-3 h-3 mr-1" /> เพิ่ม Period
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      {tours.length === 0 && (
        <div className="p-8 text-center text-muted-foreground bg-card border rounded-xl">ยังไม่มีโปรแกรมทัวร์</div>
      )}

      {/* ── Program Dialog ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "แก้ไขโปรแกรม" : "เพิ่มโปรแกรมทัวร์ใหม่"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold">ประเภท</label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as TourCategory })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TOUR_CATS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold">รหัสทัวร์</label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="HQO-TFU06-EU" /></div>
              <div><label className="text-xs font-semibold">ชื่อเมือง / เส้นทาง</label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="เฉิงตู 3 อุทยาน" /></div>
              <div><label className="text-xs font-semibold">ประเทศ</label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="จีน" /></div>
              <div>
                <label className="text-xs font-semibold">ระยะเวลา</label>
                <div className="flex items-center gap-1.5">
                  <Input type="number" min={0} value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })} placeholder="6" className="w-full" />
                  <span className="text-xs text-muted-foreground shrink-0">วัน</span>
                  <Input type="number" min={0} value={form.nights} onChange={(e) => setForm({ ...form, nights: e.target.value })} placeholder="5" className="w-full" />
                  <span className="text-xs text-muted-foreground shrink-0">คืน</span>
                </div>
              </div>

              <div className="col-span-2"><label className="text-xs font-semibold">หมายเหตุ (program level)</label><Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="ซากุระบาน / เดินทางโดยรถบัส" /></div>
            </div>
            <p className="text-[10px] text-muted-foreground bg-muted/50 rounded px-2 py-1.5">
              💡 หลังเพิ่มโปรแกรมแล้ว กดปุ่ม "+ Period" เพื่อเพิ่มวันเดินทางและราคาแต่ละรอบ
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>ยกเลิก</Button>
            <Button onClick={submit} className="bg-gradient-primary text-primary-foreground">บันทึก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Period Dialog ── */}
      <Dialog open={pOpen} onOpenChange={setPOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" />
              {pEditId ? "แก้ไข Period" : "เพิ่ม Period ใหม่"}
              <span className="text-xs font-normal text-muted-foreground bg-muted rounded px-2 py-0.5">
                {tours.find((t) => t.id === pTourId)?.code}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Date pickers */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold">วันเดินทาง *</label>
                <Input type="date" value={pForm.start_date} onChange={(e) => setPForm({ ...pForm, start_date: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-semibold">วันกลับ *</label>
                <Input type="date" value={pForm.end_date} onChange={(e) => setPForm({ ...pForm, end_date: e.target.value })} min={pForm.start_date} />
              </div>
            </div>

            {/* Auto-calc display */}
            {pForm.start_date && pForm.end_date && pForm.days && (
              <div className="bg-primary/8 border border-primary/20 rounded-lg px-3 py-2 flex items-center gap-3">
                <CalendarDays className="w-4 h-4 text-primary shrink-0" />
                <div className="text-sm">
                  <span className="font-semibold text-primary">{pForm.days} วัน {pForm.nights} คืน</span>
                  <span className="text-muted-foreground ml-2 text-xs">
                    {fmtThai(pForm.start_date)} – {fmtThai(pForm.end_date)}
                  </span>
                </div>
              </div>
            )}

            {/* Price & Seats */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold">ราคา/ที่นั่ง (฿) *</label>
                <Input type="number" min={0} value={pForm.price_per_seat} onChange={(e) => setPForm({ ...pForm, price_per_seat: e.target.value })} placeholder="29500" />
              </div>
              <div>
                <label className="text-xs font-semibold">จำนวนที่นั่งทั้งหมด *</label>
                <Input type="number" min={0} value={pForm.total_seats} onChange={(e) => setPForm({ ...pForm, total_seats: e.target.value })} placeholder="20" />
              </div>
              <div>
                <label className="text-xs font-semibold">โค้ดสายการบิน</label>
                <Input value={pForm.airline_code} onChange={(e) => setPForm({ ...pForm, airline_code: e.target.value })} placeholder="FD, TG, VZ..." />
              </div>
              <div>
                <label className="text-xs font-semibold">โครงการ / Campaign</label>
                <Input value={pForm.project} onChange={(e) => setPForm({ ...pForm, project: e.target.value })} placeholder="โครงการ / campaign" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold">หมายเหตุ</label>
                <Input value={pForm.note} onChange={(e) => setPForm({ ...pForm, note: e.target.value })} placeholder="วางที่นั่งแล้ว / ราคาพิเศษ..." />
              </div>
            </div>

            {/* Cancel section — edit mode only */}
            {pEditId && (
              <div className={`border rounded-lg p-3 space-y-2 ${pForm.cancelled ? "border-destructive/40 bg-destructive/5" : "border-border bg-muted/30"}`}>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5 text-destructive" />
                    สถานะ Period
                  </label>
                  <button
                    type="button"
                    onClick={() => setPForm((f) => ({ ...f, cancelled: !f.cancelled, cancel_reason: f.cancelled ? "" : f.cancel_reason }))}
                    className={`text-xs px-3 py-1 rounded-full font-semibold border transition-colors ${
                      pForm.cancelled
                        ? "bg-destructive text-destructive-foreground border-destructive"
                        : "bg-background border-border hover:border-destructive/50 hover:text-destructive"
                    }`}
                  >
                    {pForm.cancelled ? "❌ ยกเลิกแล้ว" : "✅ เปิดอยู่"}
                  </button>
                </div>
                {pForm.cancelled && (
                  <div>
                    <label className="text-xs text-muted-foreground">เหตุผลการยกเลิก *</label>
                    <Select value={pForm.cancel_reason} onValueChange={(v) => setPForm({ ...pForm, cancel_reason: v })}>
                      <SelectTrigger className="mt-1 border-destructive/30">
                        <SelectValue placeholder="เลือกเหตุผล..." />
                      </SelectTrigger>
                      <SelectContent>
                        {CANCEL_REASONS.map((r) => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPOpen(false)}>ยกเลิก</Button>
            <Button onClick={submitPeriod} className={pForm.cancelled ? "bg-destructive text-destructive-foreground" : "bg-gradient-primary text-primary-foreground"}>
              บันทึก
            </Button>
          </DialogFooter>
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
  const openAdd = () => { setEditId(null); setF({ name: "", city: "", co