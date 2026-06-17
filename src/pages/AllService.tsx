import React, { useMemo, useState, useEffect } from "react";
import { PackageSearch, Plus, Pencil, Trash2, Plane, Car, Hotel, FileBadge, Shield, MapPinned, Lock, Minus, ChevronDown, ChevronRight, CalendarDays, XCircle, AlertTriangle, FileUp, Globe, GlobeLock, FileX } from "lucide-react";
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
  const addPeriod      = useServices((s) => s.addPeriod);
  const updatePeriod   = useServices((s) => s.updatePeriod);
  const deletePeriod   = useServices((s) => s.deletePeriod);
  const uploadTourPDF  = useServices((s) => s.uploadTourPDF);
  const deleteTourPDF  = useServices((s) => s.deleteTourPDF);
  const togglePublish  = useServices((s) => s.togglePublish);
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
                    <div className={`group flex items-center gap-3 px-3 py-2.5 transition-colors ${isExpanded ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-muted/40 border-l-2 border-l-transparent"}`}>
                      {/* expand toggle */}
                      <button
                        className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted shrink-0 transition-colors"
                        onClick={() => toggleExpand(t.id)}
                        disabled={!hasPeriods}
                      >
                        {hasPeriods
                          ? (isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-primary" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />)
                          : <span className="w-3.5 h-3.5 block opacity-0" />}
                      </button>

                      {/* Code + Duration */}
                      <div className="shrink-0 w-[140px]">
                        <span className="font-mono text-[11px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded">{t.code}</span>
                        {t.duration && <div className="text-[10px] text-muted-foreground mt-0.5">{t.duration}</div>}
                      </div>

                      {/* Destination */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm leading-tight truncate">{t.city}</div>
                        <div className="text-[11px] text-muted-foreground">{t.country}</div>
                      </div>

                      {/* Period count OR legacy label */}
                      <div className="shrink-0 w-[110px]">
                        {hasPeriods ? (
                          <Badge variant="outline" className="text-[10px] gap-1 border-primary/30 text-primary font-semibold">
                            <CalendarDays className="w-3 h-3" />{t.periods!.length} Period
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">ยังไม่มี period</span>
                        )}
                      </div>

                      {/* Price range */}
                      <div className="shrink-0 w-[100px] text-right">
                        <span className="font-bold text-sm">{priceLabel}</span>
                        <span className="text-[10px] text-muted-foreground ml-0.5">฿</span>
                      </div>

                      {/* Quota summary */}
                      <div className="shrink-0 w-[115px]">
                        {hasPeriods ? (
                          <div className="text-[11px] leading-snug">
                            <div className="font-medium">รวม {t.periods!.reduce((s,p)=>s+p.total_seats,0)} ที่</div>
                            <div className="text-muted-foreground">ว่าง {t.periods!.filter(p=>!p.cancelled).reduce((s,p)=>s+p.quota,0)}</div>
                          </div>
                        ) : (
                          <QuotaBar quota={t.quota} total_seats={t.total_seats} canEdit={canEdit} tourId={t.id} />
                        )}
                      </div>

                      {/* Actions */}
                      {canEdit && (
                        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* PDF indicator (always visible if has pdf) */}
                          {t.pdf_url && (
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded mr-1 ${t.is_published ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                              {t.is_published ? "🌐 Live" : "PDF"}
                            </span>
                          )}
                          {/* PDF Upload / Remove */}
                          {t.pdf_url ? (
                            <Button
                              size="icon" variant="ghost" className="h-7 w-7" title="ลบ PDF"
                              onClick={async () => {
                                if (!confirm("ลบ PDF และยกเลิกการแสดงในเว็บ?")) return;
                                await deleteTourPDF(t.id);
                                toast.success("ลบ PDF แล้ว");
                              }}
                            ><FileX className="w-3.5 h-3.5 text-destructive/70" /></Button>
                          ) : (
                            <>
                              <input
                                id={`pdf-upload-${t.id}`} type="file" accept="application/pdf" className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0]; e.target.value = "";
                                  if (!file) return;
                                  if (file.size > 20 * 1024 * 1024) { toast.error("ไฟล์ใหญ่เกิน 20 MB"); return; }
                                  setUploadingId(t.id);
                                  const url = await uploadTourPDF(t.id, file);
                                  setUploadingId(null);
                                  if (url) toast.success("อัปโหลด PDF สำเร็จ"); else toast.error("อัปโหลดล้มเหลว");
                                }}
                              />
                              <Button
                                size="icon" variant="ghost" className="h-7 w-7" title="อัปโหลด PDF โปรแกรม"
                                disabled={uploadingId === t.id}
                                onClick={() => document.getElementById(`pdf-upload-${t.id}`)?.click()}
                              >
                                {uploadingId === t.id
                                  ? <span className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                  : <FileUp className="w-3.5 h-3.5" />}
                              </Button>
                            </>
                          )}
                          {/* Publish toggle — เปิดได้เฉพาะเมื่อมี PDF */}
                          <Button
                            size="icon" variant="ghost" className="h-7 w-7"
                            title={t.is_published ? "ซ่อนจากหน้าเว็บ" : "แสดงในหน้าเว็บ"}
                            disabled={!t.pdf_url}
                            onClick={() => {
                              togglePublish(t.id, !t.is_published);
                              toast.success(t.is_published ? "ซ่อนจากหน้า Package แล้ว" : "แสดงในหน้า Package แล้ว");
                            }}
                          >
                            {t.is_published
                              ? <Globe className="w-3.5 h-3.5 text-green-600" />
                              : <GlobeLock className="w-3.5 h-3.5 text-muted-foreground/50" />}
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(t.id)}><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                            const booked = t.total_seats - t.quota;
                            if (booked > 0) { toast.error(`ไม่สามารถลบได้ มีที่นั่งถูกจองแล้ว ${booked} ที่`); return; }
                            if (confirm("ลบทัวร์นี้?")) { deleteTour(t.id); toast.success("ลบแล้ว"); }
                          }}><Trash2 className="w-3.5 h-3.5 text-destructive/70" /></Button>
                        </div>
                      )}
                    </div>

                    {/* ── Period Cards ── */}
                    {hasPeriods && isExpanded && (
                      <div className="bg-muted/20 border-t px-4 py-3 space-y-2">
                        {t.periods!.map((p) => {
                          const isCancelled = !!p.cancelled;
                          const isFull = !isCancelled && p.quota === 0;
                          return (
                            <div key={p.period_id} className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm transition-colors ${
                              isCancelled
                                ? "border-destructive/20 bg-destructive/5 opacity-75"
                                : isFull
                                  ? "border-amber-200 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-950/20"
                                  : "border-border/60 bg-background hover:border-primary/30 hover:shadow-sm"
                            }`}>
                              {/* Status pill */}
                              <span className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${
                                isCancelled
                                  ? "bg-destructive/15 text-destructive"
                                  : isFull
                                    ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400"
                                    : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                              }`}>
                                {isCancelled ? "❌ ยกเลิก" : isFull ? "🔴 เต็ม" : "✅ เปิด"}
                              </span>

                              {/* Date range — PRIMARY */}
                              <div className="flex-1 min-w-0">
                                <div className={`font-semibold leading-tight ${isCancelled ? "line-through opacity-60" : ""}`}>
                                  {p.start_date ? fmtThai(p.start_date) : p.travel_date}
                                  {p.end_date && p.end_date !== p.start_date ? ` – ${fmtThai(p.end_date)}` : ""}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {(p.days || p.nights) && (
                                    <span className="text-[10px] text-muted-foreground">{p.days}วัน {p.nights}คืน</span>
                                  )}
                                  {isCancelled && p.cancel_reason && (
                                    <span className="text-[10px] text-destructive/70">{p.cancel_reason}</span>
                                  )}
                                </div>
                              </div>

                              {/* Price */}
                              <div className="shrink-0 text-right w-[90px]">
                                <span className="font-bold">{p.price_per_seat.toLocaleString()}</span>
                                <span className="text-[10px] text-muted-foreground ml-0.5">฿</span>
                              </div>

                              {/* Quota */}
                              <div className="shrink-0 w-[120px]">
                                {isCancelled
                                  ? <span className="text-[10px] text-muted-foreground">—</span>
                                  : <PeriodQuotaBar quota={p.quota} total_seats={p.total_seats} canEdit={canEdit} tourId={t.id} periodId={p.period_id} />
                                }
                              </div>

                              {/* Tags: airline + project + note */}
                              <div className="flex gap-1 shrink-0">
                                {p.airline_code && (
                                  <span className="px-1.5 py-0.5 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 text-[10px] font-mono rounded border border-sky-100 dark:border-sky-900/40">{p.airline_code}</span>
                                )}
                                {p.project && (
                                  <span className="px-1.5 py-0.5 bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 text-[10px] rounded border border-violet-100 dark:border-violet-900/40">{p.project}</span>
                                )}
                                {p.note && (
                                  <span className="px-1.5 py-0.5 bg-muted text-muted-foreground text-[10px] rounded" title={p.note}>📝</span>
                                )}
                              </div>

                              {/* Actions — show on hover */}
                              {canEdit && (
                                <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button size="icon" variant="ghost" className="h-7 w-7" title="แก้ไข / ยกเลิก" onClick={() => openEditPeriod(t.id, p)}><Pencil className="w-3.5 h-3.5" /></Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                                    const booked = p.total_seats - p.quota;
                                    if (booked > 0) { toast.error(`ลบไม่ได้ มีที่จองแล้ว ${booked} ที่`); return; }
                                    if (confirm("ลบ period นี้?")) { deletePeriod(t.id, p.period_id); toast.success("ลบ period แล้ว"); }
                                  }}><Trash2 className="w-3.5 h-3.5 text-destructive/70" /></Button>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Add period — dashed card */}
                        {canEdit && (
                          <button
                            onClick={() => openAddPeriod(t.id)}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-dashed border-border hover:border-primary/50 hover:text-primary text-muted-foreground text-xs transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" /> เพิ่ม Period ใหม่
                          </button>
                        )}
                      </div>
                    )}

                    {/* ── No-periods: dashed add button ── */}
                    {!hasPeriods && canEdit && (
                      <div className="px-10 pb-2.5 pt-0">
                        <button
                          onClick={() => openAddPeriod(t.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-dashed border-primary/30 text-primary/60 hover:text-primary hover:border-primary/60 transition-colors text-[11px] font-medium"
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
