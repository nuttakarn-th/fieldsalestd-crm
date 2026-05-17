import React, { useMemo, useState } from "react";
import { PackageSearch, Plus, Pencil, Trash2, Plane, Car, Hotel, FileBadge, Shield, MapPinned, Lock } from "lucide-react";
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
  type TourCategory,
  type SeatMaterial,
  type VisaType,
} from "@/store/serviceStore";
import { toast } from "sonner";
import { ImportExportMenu } from "@/components/ImportExportMenu";
import type { ExcelField } from "@/lib/excelUtils";

const TOUR_CATS: TourCategory[] = ["International Tour", "Domestic", "Incentive"];
const SEAT_MATS: SeatMaterial[] = ["หนัง", "ผ้า", "กำมะหยี่"];
const VISA_TYPES: VisaType[] = ["TR", "TS", "Non-Immigrant", "O", "ED", "O-A", "O-X"];

function QuotaBadge({ q }: { q: number }) {
  const tone = q === 0 ? "bg-destructive/15 text-destructive border-destructive/30" : q < 5 ? "bg-warning/20 text-warning-foreground border-warning/40" : "bg-success/15 text-success border-success/30";
  return <Badge variant="outline" className={`${tone} text-[10px]`}>คงเหลือ {q}</Badge>;
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
          <h1 className="text-2xl font-bold">All Service</h1>
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
  { key: "category",      header: "ประเภท",          example: "International Tour" },
  { key: "code",          header: "รหัสทัวร์",       example: "HQO-KMG04", required: true },
  { key: "city",          header: "เมือง",           example: "คุนหมิง",    required: true },
  { key: "country",       header: "ประเทศ",          example: "จีน" },
  { key: "price_per_seat",header: "ราคา/ที่นั่ง",   example: "25900",  type: "number" },
  { key: "quota",         header: "โควต้า",          example: "24",     type: "number" },
  { key: "note",          header: "หมายเหตุ",        example: "ซากุระบาน" },
];

function TourSection({ canEdit }: { canEdit: boolean }) {
  const tours = useServices((s) => s.tours);
  const addTour = useServices((s) => s.addTour);
  const updateTour = useServices((s) => s.updateTour);
  const deleteTour = useServices((s) => s.deleteTour);

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    category: "International Tour" as TourCategory,
    code: "", city: "", country: "",
    startDate: "" as string, returnDate: "" as string,
    days: "" as string, nights: "" as string,
    price_per_seat: "" as string,
    note: "",
    quota: "" as string,
  });

  const blankForm = () => ({
    category: "International Tour" as TourCategory,
    code: "", city: "", country: "",
    startDate: "", returnDate: "",
    days: "", nights: "",
    price_per_seat: "",
    note: "",
    quota: "",
  });

  const parseDuration = (s: string): { days: string; nights: string } => {
    const dMatch = s.match(/(\d+)\s*วัน/);
    const nMatch = s.match(/(\d+)\s*คืน/);
    return { days: dMatch?.[1] ?? "", nights: nMatch?.[1] ?? "" };
  };

  const parsePeriod = (p: string): { startDate: string; returnDate: string } => {
    const m = p.match(/(\d{4}-\d{2}-\d{2}).*?(\d{4}-\d{2}-\d{2})/);
    return { startDate: m?.[1] ?? "", returnDate: m?.[2] ?? "" };
  };

  const fmtThai = (iso: string): string => {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
    } catch { return iso; }
  };

  React.useEffect(() => {
    if (form.startDate && form.returnDate) {
      const s = new Date(form.startDate);
      const r = new Date(form.returnDate);
      if (!isNaN(s.getTime()) && !isNaN(r.getTime()) && r >= s) {
        const nights = Math.round((r.getTime() - s.getTime()) / 86400000);
        const days = nights + 1;
        setForm((f) => ({ ...f, days: String(days), nights: String(nights) }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.startDate, form.returnDate]);

  const openAdd = () => { setEditId(null); setForm(blankForm()); setOpen(true); };
  const openEdit = (id: string) => {
    const t = tours.find((x) => x.id === id); if (!t) return;
    setEditId(id);
    const dur = parseDuration(t.duration);
    const per = parsePeriod(t.period);
    setForm({
      category: t.category, code: t.code, city: t.city, country: t.country,
      startDate: per.startDate, returnDate: per.returnDate,
      days: dur.days, nights: dur.nights,
      price_per_seat: String(t.price_per_seat),
      note: t.note ?? "",
      quota: String(t.quota),
    });
    setOpen(true);
  };
  const submit = () => {
    if (!form.code || !form.city) { toast.error("กรุณากรอกรหัสและชื่อเมือง"); return; }
    const days = Number(form.days || 0);
    const nights = Number(form.nights || 0);
    const duration = days || nights ? `${days} วัน ${nights} คืน` : "";
    const period = form.startDate && form.returnDate
      ? `${fmtThai(form.startDate)} - ${fmtThai(form.returnDate)} | ${form.startDate} ถึง ${form.returnDate}`
      : "";
    const payload = {
      category: form.category,
      code: form.code,
      city: form.city,
      country: form.country,
      period,
      duration,
      price_per_seat: Number(form.price_per_seat || 0),
      note: form.note,
      quota: Number(form.quota || 0),
    };
    if (editId) updateTour(editId, payload); else addTour(payload);
    toast.success(editId ? "อัปเดตทัวร์แล้ว" : "เพิ่มทัวร์ใหม่แล้ว");
    setOpen(false);
  };

  const exportData = useMemo(() =>
    tours.map((t) => ({
      category: t.category,
      code: t.code,
      city: t.city,
      country: t.country,
      price_per_seat: t.price_per_seat,
      quota: t.quota,
      note: t.note ?? "",
    })), [tours]);

  const handleImport = (rows: Record<string, unknown>[]) => {
    rows.forEach((row) => {
      addTour({
        category: (row.category as TourCategory) || "International Tour",
        code: String(row.code ?? ""),
        city: String(row.city ?? ""),
        country: String(row.country ?? ""),
        period: "",
        duration: "",
        price_per_seat: Number(row.price_per_seat ?? 0),
        quota: Number(row.quota ?? 0),
        note: String(row.note ?? ""),
      });
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm text-muted-foreground">รวม {tours.length} โปรแกรม · International Tour / Domestic / Incentive</p>
        <div className="flex items-center gap-2">
          <ImportExportMenu
            fields={TOUR_FIELDS}
            sheetName="ทัวร์"
            filename="tours"
            data={exportData}
            onImport={handleImport}
          />
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="p-2 text-left">รหัส</th>
                    <th className="p-2 text-left">เมือง / ประเทศ</th>
                    <th className="p-2 text-left">ช่วงเวลา</th>
                    <th className="p-2 text-left">ระยะเวลา</th>
                    <th className="p-2 text-right">ราคา/ที่นั่ง</th>
                    <th className="p-2 text-left">หมายเหตุ</th>
                    <th className="p-2 text-center">โควต้า</th>
                    {canEdit && <th className="p-2"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((t) => (
                    <tr key={t.id} className="hover:bg-muted/30">
                      <td className="p-2 font-mono text-xs">{t.code}</td>
                      <td className="p-2"><div className="font-semibold">{t.city}</div><div className="text-xs text-muted-foreground">{t.country}</div></td>
                      <td className="p-2 text-xs">{t.period}</td>
                      <td className="p-2 text-xs">{t.duration}</td>
                      <td className="p-2 text-right font-bold">{t.price_per_seat.toLocaleString()}</td>
                      <td className="p-2 text-xs text-muted-foreground">{t.note || "-"}</td>
                      <td className="p-2 text-center"><QuotaBadge q={t.quota} /></td>
                      {canEdit && (
                        <td className="p-2 text-right">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(t.id)}><Pencil className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => { if (confirm("ลบทัวร์นี้?")) { deleteTour(t.id); toast.success("ลบแล้ว"); } }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "แก้ไขทัวร์" : "เพิ่มทัวร์ใหม่"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold">ประเภท</label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as TourCategory })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TOUR_CATS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold">รหัสทัวร์</label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="HQO-KMG04-DR" /></div>
              <div><label className="text-xs font-semibold">โควต้า</label><Input type="number" min={0} value={form.quota} onChange={(e) => setForm({ ...form, quota: e.target.value })} placeholder="เช่น 24" /></div>
              <div><label className="text-xs font-semibold">ชื่อเมือง</label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="คุนหมิง โหลวผิง" /></div>
              <div><label className="text-xs font-semibold">ประเทศ</label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="จีน" /></div>
              <div className="col-span-2 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold">วันที่เดินทาง</label>
                  <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-semibold">วันที่กลับ</label>
                  <Input type="date" value={form.returnDate} min={form.startDate || undefined} onChange={(e) => setForm({ ...form, returnDate: e.target.value })} />
                </div>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold">ระยะเวลา <span className="text-[10px] text-muted-foreground">(คำนวณอัตโนมัติจากวันที่ — แก้ตัวเลขเองได้)</span></label>
                <div className="flex items-center gap-1.5">
                  <Input type="number" min={0} value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })} placeholder="4" className="w-full" />
                  <span className="text-xs text-muted-foreground shrink-0">วัน</span>
                  <Input type="number" min={0} value={form.nights} onChange={(e) => setForm({ ...form, nights: e.target.value })} placeholder="3" className="w-full" />
                  <span className="text-xs text-muted-foreground shrink-0">คืน</span>
                </div>
              </div>
              <div><label className="text-xs font-semibold">ราคา/ที่นั่ง</label><Input type="number" min={0} value={form.price_per_seat} onChange={(e) => setForm({ ...form, price_per_seat: e.target.value })} placeholder="25900" /></div>
              <div><label className="text-xs font-semibold">หมายเหตุ</label><Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="ซากุระบาน" /></div>
            </div>
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

/* ========= Car ========= */
const CAR_FIELDS: ExcelField[] = [
  { key: "name",         header: "ชื่อรถ",         example: "Toyota Commuter", required: true },
  { key: "type",         header: "ประเภท",          example: "Van" },
  { key: "total_seats",  header: "จำนวนที่นั่ง",   example: "12",   type: "number" },
  { key: "rate_per_day", header: "ราคา/วัน",        example: "2500", type: "number" },
  { key: "seat_material",header: "ประเภทเบาะ",      example: "หนัง" },
  { key: "quota",        header: "โควต้า",          example: "5",    type: "number" },
  { key: "note",         header: "หมายเหตุ",        example: "" },
];

function CarSection({ canEdit }: { canEdit: boolean }) {
  const cars = useServices((s) => s.cars);
  const addCar = useServices((s) => s.addCar);
  const updateCar = useServices((s) => s.updateCar);
  const deleteCar = useServices((s) => s.deleteCar);

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", type: "", total_seats: "" as string, rate_per_day: "" as string, seat_material: "ผ้า" as SeatMaterial, note: "", quota: "" as string });

  const openAdd = () => { setEditId(null); setForm({ name: "", type: "", total_seats: "", rate_per_day: "", seat_material: "ผ้า", note: "", quota: "" }); setOpen(true); };
  const openEdit = (id: string) => {
    const c = cars.find((x) => x.id === id); if (!c) return;
    setEditId(id);
    setForm({ name: c.name, type: c.type, total_seats: String(c.total_seats), rate_per_day: String(c.rate_per_day), seat_material: c.seat_material, note: c.note ?? "", quota: String(c.quota) });
    setOpen(true);
  };
  const submit = () => {
    if (!form.name) { toast.error("กรุณากรอกชื่อรถ"); return; }
    const payload = { name: form.name, type: form.type, total_seats: Number(form.total_seats || 0), rate_per_day: Number(form.rate_per_day || 0), seat_material: form.seat_material, note: form.note, quota: Number(form.quota || 0) };
    if (editId) updateCar(editId, payload); else addCar(payload);
    toast.success(editId ? "อัปเดตแล้ว" : "เพิ่มรถใหม่แล้ว"); setOpen(false);
  };

  const exportData = useMemo(() =>
    cars.map((c) => ({
      name: c.name, type: c.type,
      total_seats: c.total_seats, rate_per_day: c.rate_per_day,
      seat_material: c.seat_material, quota: c.quota, note: c.note ?? "",
    })), [cars]);

  const handleImport = (rows: Record<string, unknown>[]) => {
    rows.forEach((row) => {
      addCar({
        name: String(row.name ?? ""),
        type: String(row.type ?? ""),
        total_seats: Number(row.total_seats ?? 0),
        rate_per_day: Number(row.rate_per_day ?? 0),
        seat_material: (row.seat_material as SeatMaterial) || "ผ้า",
        quota: Number(row.quota ?? 0),
        note: String(row.note ?? ""),
      });
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm text-muted-foreground">รวม {cars.length} คัน</p>
        <div className="flex items-center gap-2">
          <ImportExportMenu
            fields={CAR_FIELDS}
            sheetName="รถเช่า"
            filename="cars"
            data={exportData}
            onImport={handleImport}
          />
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
                <th className="p-3 text-center">โควต้า</th>
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
                  <td className="p-3 text-center"><QuotaBadge q={c.quota} /></td>
                  {canEdit && (
                    <td className="p-3 text-right">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(c.id)}><Pencil className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => { if (confirm("ลบรถคันนี้?")) { deleteCar(c.id); toast.success("ลบแล้ว"); } }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </td>
                  )}
                </tr>
              ))}
              {cars.length === 0 && (
                <tr><td colSpan={canEdit ? 8 : 7} className="p-8 text-center text-muted-foreground">ยังไม่มีรายการ</td></tr>
              )}
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
            <div><label className="text-xs font-semibold">ที่นั่ง</label><Input type="number" min={0} value={form.total_seats} onChange={(e) => setForm({ ...form, total_seats: e.target.value })} placeholder="12" /></div>
            <div><label className="text-xs font-semibold">ราคา/วัน</label><Input type="number" min={0} value={form.rate_per_day} onChange={(e) => setForm({ ...form, rate_per_day: e.target.value })} placeholder="2500" /></div>
            <div>
              <label className="text-xs font-semibold">ประเภทเบาะ</label>
              <Select value={form.seat_material} onValueChange={(v) => setForm({ ...form, seat_material: v as SeatMaterial })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SEAT_MATS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-xs font-semibold">โควต้า</label><Input type="number" min={0} value={form.quota} onChange={(e) => setForm({ ...form, quota: e.target.value })} placeholder="5" /></div>
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
  { key: "quota",   header: "โควต้า",    example: "50", type: "number" },
  { key: "note",    header: "หมายเหตุ",  example: "" },
];

function FlightSection({ canEdit }: { canEdit: boolean }) {
  const items = useServices((s) => s.flights);
  const add = useServices((s) => s.addFlight);
  const update = useServices((s) => s.updateFlight);
  const del = useServices((s) => s.deleteFlight);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [f, setF] = useState({ airline: "", route: "", note: "", quota: "" as string });
  const openAdd = () => { setEditId(null); setF({ airline: "", route: "", note: "", quota: "" }); setOpen(true); };
  const openEdit = (id: string) => { const x = items.find((i) => i.id === id); if (!x) return; setEditId(id); setF({ airline: x.airline, route: x.route, note: x.note ?? "", quota: String(x.quota) }); setOpen(true); };
  const submit = () => { if (!f.airline) { toast.error("ใส่ชื่อสายการบิน"); return; } const p = { ...f, quota: Number(f.quota || 0) }; editId ? update(editId, p) : add(p); toast.success("บันทึกแล้ว"); setOpen(false); };

  const exportData = useMemo(() => items.map((i) => ({ airline: i.airline, route: i.route, quota: i.quota, note: i.note ?? "" })), [items]);
  const handleImport = (rows: Record<string, unknown>[]) => {
    rows.forEach((row) => add({ airline: String(row.airline ?? ""), route: String(row.route ?? ""), quota: Number(row.quota ?? 0), note: String(row.note ?? "") }));
  };

  return (
    <SimpleTable
      title="ตั๋วเครื่องบิน"
      cols={["สายการบิน", "เส้นทาง", "หมายเหตุ", "โควต้า"]}
      rows={items.map((i) => ({ id: i.id, cells: [i.airline, i.route, i.note || "-", <QuotaBadge key="q" q={i.quota} />] }))}
      canEdit={canEdit} onAdd={openAdd} onEdit={openEdit} onDelete={(id) => { del(id); toast.success("ลบแล้ว"); }}
      importExport={<ImportExportMenu fields={FLIGHT_FIELDS} sheetName="ตั๋วเครื่องบิน" filename="flights" data={exportData} onImport={handleImport} />}
      dialog={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? "แก้ไข" : "เพิ่ม"}ตั๋วเครื่องบิน</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className="text-xs font-semibold">สายการบิน</label><Input value={f.airline} onChange={(e) => setF({ ...f, airline: e.target.value })} /></div>
              <div><label className="text-xs font-semibold">เส้นทาง</label><Input value={f.route} onChange={(e) => setF({ ...f, route: e.target.value })} placeholder="BKK-HND" /></div>
              <div><label className="text-xs font-semibold">โควต้า</label><Input type="number" min={0} value={f.quota} onChange={(e) => setF({ ...f, quota: e.target.value })} placeholder="50" /></div>
              <div className="col-span-2"><label className="text-xs font-semibold">หมายเหตุ</label><Input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></div>
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
  { key: "quota",   header: "โควต้า",     example: "30", type: "number" },
  { key: "note",    header: "หมายเหตุ",   example: "" },
];

function HotelSection({ canEdit }: { canEdit: boolean }) {
  const items = useServices((s) => s.hotels);
  const add = useServices((s) => s.addHotel);
  const update = useServices((s) => s.updateHotel);
  const del = useServices((s) => s.deleteHotel);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [f, setF] = useState({ name: "", city: "", country: "", note: "", quota: "" as string });
  const openAdd = () => { setEditId(null); setF({ name: "", city: "", country: "", note: "", quota: "" }); setOpen(true); };
  const openEdit = (id: string) => { const x = items.find((i) => i.id === id); if (!x) return; setEditId(id); setF({ name: x.name, city: x.city, country: x.country, note: x.note ?? "", quota: String(x.quota) }); setOpen(true); };
  const submit = () => { if (!f.name) { toast.error("ใส่ชื่อโรงแรม"); return; } const p = { ...f, quota: Number(f.quota || 0) }; editId ? update(editId, p) : add(p); toast.success("บันทึกแล้ว"); setOpen(false); };

  const exportData = useMemo(() => items.map((i) => ({ name: i.name, city: i.city, country: i.country, quota: i.quota, note: i.note ?? "" })), [items]);
  const handleImport = (rows: Record<string, unknown>[]) => {
    rows.forEach((row) => add({ name: String(row.name ?? ""), city: String(row.city ?? ""), country: String(row.country ?? ""), quota: Number(row.quota ?? 0), note: String(row.note ?? "") }));
  };

  return (
    <SimpleTable
      title="โรงแรม"
      cols={["ชื่อโรงแรม", "เมือง", "ประเทศ", "หมายเหตุ", "โควต้า"]}
      rows={items.map((i) => ({ id: i.id, cells: [i.name, i.city, i.country, i.note || "-", <QuotaBadge key="q" q={i.quota} />] }))}
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
              <div><label className="text-xs font-semibold">โควต้า</label><Input type="number" min={0} value={f.quota} onChange={(e) => setF({ ...f, quota: e.target.value })} placeholder="30" /></div>
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
  { key: "visa_type", header: "ประเภทวีซ่า", example: "TR",        required: true },
  { key: "country",   header: "ประเทศ",       example: "ญี่ปุ่น",  required: true },
  { key: "quota",     header: "โควต้า",       example: "100",       type: "number" },
  { key: "note",      header: "หมายเหตุ",     example: "" },
];

function VisaSection({ canEdit }: { canEdit: boolean }) {
  const items = useServices((s) => s.visas);
  const add = useServices((s) => s.addVisa);
  const update = useServices((s) => s.updateVisa);
  const del = useServices((s) => s.deleteVisa);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [f, setF] = useState({ visa_type: "TR" as VisaType, country: "", note: "", quota: "" as string });
  const openAdd = () => { setEditId(null); setF({ visa_type: "TR", country: "", note: "", quota: "" }); setOpen(true); };
  const openEdit = (id: string) => { const x = items.find((i) => i.id === id); if (!x) return; setEditId(id); setF({ visa_type: x.visa_type, country: x.country, note: x.note ?? "", quota: String(x.quota) }); setOpen(true); };
  const submit = () => { if (!f.country) { toast.error("ใส่ประเทศ"); return; } const p = { ...f, quota: Number(f.quota || 0) }; editId ? update(editId, p) : add(p); toast.success("บันทึกแล้ว"); setOpen(false); };
  const VISA_DESC: Record<VisaType, string> = {
    "TR": "วีซ่าท่องเที่ยว",
    "TS": "วีซ่าผ่านทาง",
    "Non-Immigrant": "วีซ่าทำงาน/ธุรกิจ",
    "O": "วีซ่าคู่สมรส",
    "ED": "วีซ่าการศึกษา",
    "O-A": "วีซ่าเกษียณอายุ (O-A)",
    "O-X": "วีซ่าเกษียณอายุ (O-X)",
  };

  const exportData = useMemo(() => items.map((i) => ({ visa_type: i.visa_type, country: i.country, quota: i.quota, note: i.note ?? "" })), [items]);
  const handleImport = (rows: Record<string, unknown>[]) => {
    rows.forEach((row) => add({ visa_type: (row.visa_type as VisaType) || "TR", country: String(row.country ?? ""), quota: Number(row.quota ?? 0), note: String(row.note ?? "") }));
  };

  return (
    <SimpleTable
      title="Visa"
      cols={["ประเภท", "ประเทศ", "หมายเหตุ", "โควต้า"]}
      rows={items.map((i) => ({ id: i.id, cells: [`${i.visa_type} · ${VISA_DESC[i.visa_type]}`, i.country, i.note || "-", <QuotaBadge key="q" q={i.quota} />] }))}
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
              <div><label className="text-xs font-semibold">โควต้า</label><Input type="number" min={0} value={f.quota} onChange={(e) => setF({ ...f, quota: e.target.value })} placeholder="100" /></div>
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
  { key: "plan_name", header: "ชื่อแผน",     example: "แผน A",           required: true },
  { key: "coverage",  header: "วงเงิน",       example: "1,000,000 THB" },
  { key: "price",     header: "ราคา",         example: "350",             type: "number" },
  { key: "quota",     header: "โควต้า",       example: "200",             type: "number" },
  { key: "note",      header: "หมายเหตุ",     example: "" },
];

function InsuranceSection({ canEdit }: { canEdit: boolean }) {
  const items = useServices((s) => s.insurances);
  const add = useServices((s) => s.addInsurance);
  const update = useServices((s) => s.updateInsurance);
  const del = useServices((s) => s.deleteInsurance);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [f, setF] = useState({ plan_name: "", coverage: "", price: "" as string, note: "", quota: "" as string });
  const openAdd = () => { setEditId(null); setF({ plan_name: "", coverage: "", price: "", note: "", quota: "" }); setOpen(true); };
  const openEdit = (id: string) => { const x = items.find((i) => i.id === id); if (!x) return; setEditId(id); setF({ plan_name: x.plan_name, coverage: x.coverage, price: String(x.price), note: x.note ?? "", quota: String(x.quota) }); setOpen(true); };
  const submit = () => { if (!f.plan_name) { toast.error("ใส่ชื่อแผน"); return; } const p = { ...f, price: Number(f.price || 0), quota: Number(f.quota || 0) }; editId ? update(editId, p) : add(p); toast.success("บันทึกแล้ว"); setOpen(false); };

  const exportData = useMemo(() => items.map((i) => ({ plan_name: i.plan_name, coverage: i.coverage, price: i.price, quota: i.quota, note: i.note ?? "" })), [items]);
  const handleImport = (rows: Record<string, unknown>[]) => {
    rows.forEach((row) => add({ plan_name: String(row.plan_name ?? ""), coverage: String(row.coverage ?? ""), price: Number(row.price ?? 0), quota: Number(row.quota ?? 0), note: String(row.note ?? "") }));
  };

  return (
    <SimpleTable
      title="ประกันการเดินทาง"
      cols={["แผน", "วงเงิน", "ราคา", "หมายเหตุ", "โควต้า"]}
      rows={items.map((i) => ({ id: i.id, cells: [i.plan_name, i.coverage, i.price.toLocaleString(), i.note || "-", <QuotaBadge key="q" q={i.quota} />] }))}
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
              <div><label className="text-xs font-semibold">โควต้า</label><Input type="number" min={0} value={f.quota} onChange={(e) => setF({ ...f, quota: e.target.value })} placeholder="200" /></div>
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
