import { useState } from "react";
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

const TOUR_CATS: TourCategory[] = ["Outbound", "Domestic", "Incentive"];
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
function TourSection({ canEdit }: { canEdit: boolean }) {
  const tours = useServices((s) => s.tours);
  const addTour = useServices((s) => s.addTour);
  const updateTour = useServices((s) => s.updateTour);
  const deleteTour = useServices((s) => s.deleteTour);

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    category: "Outbound" as TourCategory,
    code: "", city: "", country: "", period: "", duration: "", price_per_seat: 0, note: "", quota: 0,
  });

  const openAdd = () => { setEditId(null); setForm({ category: "Outbound", code: "", city: "", country: "", period: "", duration: "", price_per_seat: 0, note: "", quota: 0 }); setOpen(true); };
  const openEdit = (id: string) => {
    const t = tours.find((x) => x.id === id); if (!t) return;
    setEditId(id);
    setForm({ category: t.category, code: t.code, city: t.city, country: t.country, period: t.period, duration: t.duration, price_per_seat: t.price_per_seat, note: t.note ?? "", quota: t.quota });
    setOpen(true);
  };
  const submit = () => {
    if (!form.code || !form.city) { toast.error("กรุณากรอกรหัสและชื่อเมือง"); return; }
    if (editId) updateTour(editId, form); else addTour(form);
    toast.success(editId ? "อัปเดตทัวร์แล้ว" : "เพิ่มทัวร์ใหม่แล้ว");
    setOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">รวม {tours.length} โปรแกรม · Outbound / Domestic / Incentive</p>
        {canEdit && <Button onClick={openAdd} className="bg-gradient-pink text-accent-foreground"><Plus className="w-4 h-4 mr-1" /> เพิ่มทัวร์</Button>}
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
              <div><label className="text-xs font-semibold">รหัสทัวร์</label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
              <div><label className="text-xs font-semibold">โควต้า</label><Input type="number" value={form.quota} onChange={(e) => setForm({ ...form, quota: Number(e.target.value) })} /></div>
              <div><label className="text-xs font-semibold">ชื่อเมือง</label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              <div><label className="text-xs font-semibold">ประเทศ</label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
              <div><label className="text-xs font-semibold">ช่วงเวลา</label><Input value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} placeholder="15-18 มี.ค. 2026" /></div>
              <div><label className="text-xs font-semibold">ระยะเวลา</label><Input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="4 วัน 3 คืน" /></div>
              <div><label className="text-xs font-semibold">ราคา/ที่นั่ง</label><Input type="number" value={form.price_per_seat} onChange={(e) => setForm({ ...form, price_per_seat: Number(e.target.value) })} /></div>
              <div><label className="text-xs font-semibold">หมายเหตุ</label><Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
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
function CarSection({ canEdit }: { canEdit: boolean }) {
  const cars = useServices((s) => s.cars);
  const addCar = useServices((s) => s.addCar);
  const updateCar = useServices((s) => s.updateCar);
  const deleteCar = useServices((s) => s.deleteCar);

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", type: "", total_seats: 4, rate_per_day: 0, seat_material: "ผ้า" as SeatMaterial, note: "", quota: 0 });

  const openAdd = () => { setEditId(null); setForm({ name: "", type: "", total_seats: 4, rate_per_day: 0, seat_material: "ผ้า", note: "", quota: 0 }); setOpen(true); };
  const openEdit = (id: string) => {
    const c = cars.find((x) => x.id === id); if (!c) return;
    setEditId(id);
    setForm({ name: c.name, type: c.type, total_seats: c.total_seats, rate_per_day: c.rate_per_day, seat_material: c.seat_material, note: c.note ?? "", quota: c.quota });
    setOpen(true);
  };
  const submit = () => {
    if (!form.name) { toast.error("กรุณากรอกชื่อรถ"); return; }
    if (editId) updateCar(editId, form); else addCar(form);
    toast.success(editId ? "อัปเดตแล้ว" : "เพิ่มรถใหม่แล้ว"); setOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">รวม {cars.length} คัน</p>
        {canEdit && <Button onClick={openAdd} className="bg-gradient-pink text-accent-foreground"><Plus className="w-4 h-4 mr-1" /> เพิ่มรถ</Button>}
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
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "แก้ไขรถ" : "เพิ่มรถใหม่"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-semibold">ชื่อรถ</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="text-xs font-semibold">ประเภท</label><Input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder="SUV / Van / Sedan" /></div>
            <div><label className="text-xs font-semibold">ที่นั่ง</label><Input type="number" value={form.total_seats} onChange={(e) => setForm({ ...form, total_seats: Number(e.target.value) })} /></div>
            <div><label className="text-xs font-semibold">ราคา/วัน</label><Input type="number" value={form.rate_per_day} onChange={(e) => setForm({ ...form, rate_per_day: Number(e.target.value) })} /></div>
            <div>
              <label className="text-xs font-semibold">ประเภทเบาะ</label>
              <Select value={form.seat_material} onValueChange={(v) => setForm({ ...form, seat_material: v as SeatMaterial })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SEAT_MATS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-xs font-semibold">โควต้า</label><Input type="number" value={form.quota} onChange={(e) => setForm({ ...form, quota: Number(e.target.value) })} /></div>
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

function FlightSection({ canEdit }: { canEdit: boolean }) {
  const items = useServices((s) => s.flights);
  const add = useServices((s) => s.addFlight);
  const update = useServices((s) => s.updateFlight);
  const del = useServices((s) => s.deleteFlight);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [f, setF] = useState({ airline: "", route: "", note: "", quota: 0 });
  const openAdd = () => { setEditId(null); setF({ airline: "", route: "", note: "", quota: 0 }); setOpen(true); };
  const openEdit = (id: string) => { const x = items.find((i) => i.id === id); if (!x) return; setEditId(id); setF({ airline: x.airline, route: x.route, note: x.note ?? "", quota: x.quota }); setOpen(true); };
  const submit = () => { if (!f.airline) { toast.error("ใส่ชื่อสายการบิน"); return; } editId ? update(editId, f) : add(f); toast.success("บันทึกแล้ว"); setOpen(false); };
  return (
    <SimpleTable
      title="ตั๋วเครื่องบิน"
      cols={["สายการบิน", "เส้นทาง", "หมายเหตุ", "โควต้า"]}
      rows={items.map((i) => ({ id: i.id, cells: [i.airline, i.route, i.note || "-", <QuotaBadge key="q" q={i.quota} />] }))}
      canEdit={canEdit} onAdd={openAdd} onEdit={openEdit} onDelete={(id) => { del(id); toast.success("ลบแล้ว"); }}
      dialog={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? "แก้ไข" : "เพิ่ม"}ตั๋วเครื่องบิน</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className="text-xs font-semibold">สายการบิน</label><Input value={f.airline} onChange={(e) => setF({ ...f, airline: e.target.value })} /></div>
              <div><label className="text-xs font-semibold">เส้นทาง</label><Input value={f.route} onChange={(e) => setF({ ...f, route: e.target.value })} placeholder="BKK-HND" /></div>
              <div><label className="text-xs font-semibold">โควต้า</label><Input type="number" value={f.quota} onChange={(e) => setF({ ...f, quota: Number(e.target.value) })} /></div>
              <div className="col-span-2"><label className="text-xs font-semibold">หมายเหตุ</label><Input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>ยกเลิก</Button><Button onClick={submit} className="bg-gradient-primary text-primary-foreground">บันทึก</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      }
    />
  );
}

function HotelSection({ canEdit }: { canEdit: boolean }) {
  const items = useServices((s) => s.hotels);
  const add = useServices((s) => s.addHotel);
  const update = useServices((s) => s.updateHotel);
  const del = useServices((s) => s.deleteHotel);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [f, setF] = useState({ name: "", city: "", country: "", note: "", quota: 0 });
  const openAdd = () => { setEditId(null); setF({ name: "", city: "", country: "", note: "", quota: 0 }); setOpen(true); };
  const openEdit = (id: string) => { const x = items.find((i) => i.id === id); if (!x) return; setEditId(id); setF({ name: x.name, city: x.city, country: x.country, note: x.note ?? "", quota: x.quota }); setOpen(true); };
  const submit = () => { if (!f.name) { toast.error("ใส่ชื่อโรงแรม"); return; } editId ? update(editId, f) : add(f); toast.success("บันทึกแล้ว"); setOpen(false); };
  return (
    <SimpleTable
      title="โรงแรม"
      cols={["ชื่อโรงแรม", "เมือง", "ประเทศ", "หมายเหตุ", "โควต้า"]}
      rows={items.map((i) => ({ id: i.id, cells: [i.name, i.city, i.country, i.note || "-", <QuotaBadge key="q" q={i.quota} />] }))}
      canEdit={canEdit} onAdd={openAdd} onEdit={openEdit} onDelete={(id) => { del(id); toast.success("ลบแล้ว"); }}
      dialog={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? "แก้ไข" : "เพิ่ม"}โรงแรม</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className="text-xs font-semibold">ชื่อโรงแรม</label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
              <div><label className="text-xs font-semibold">เมือง</label><Input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></div>
              <div><label className="text-xs font-semibold">ประเทศ</label><Input value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })} /></div>
              <div><label className="text-xs font-semibold">โควต้า</label><Input type="number" value={f.quota} onChange={(e) => setF({ ...f, quota: Number(e.target.value) })} /></div>
              <div className="col-span-2"><label className="text-xs font-semibold">หมายเหตุ</label><Input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>ยกเลิก</Button><Button onClick={submit} className="bg-gradient-primary text-primary-foreground">บันทึก</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      }
    />
  );
}

function VisaSection({ canEdit }: { canEdit: boolean }) {
  const items = useServices((s) => s.visas);
  const add = useServices((s) => s.addVisa);
  const update = useServices((s) => s.updateVisa);
  const del = useServices((s) => s.deleteVisa);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [f, setF] = useState({ visa_type: "TR" as VisaType, country: "", note: "", quota: 0 });
  const openAdd = () => { setEditId(null); setF({ visa_type: "TR", country: "", note: "", quota: 0 }); setOpen(true); };
  const openEdit = (id: string) => { const x = items.find((i) => i.id === id); if (!x) return; setEditId(id); setF({ visa_type: x.visa_type, country: x.country, note: x.note ?? "", quota: x.quota }); setOpen(true); };
  const submit = () => { if (!f.country) { toast.error("ใส่ประเทศ"); return; } editId ? update(editId, f) : add(f); toast.success("บันทึกแล้ว"); setOpen(false); };
  const VISA_DESC: Record<VisaType, string> = {
    "TR": "วีซ่าท่องเที่ยว",
    "TS": "วีซ่าผ่านทาง",
    "Non-Immigrant": "วีซ่าทำงาน/ธุรกิจ",
    "O": "วีซ่าคู่สมรส",
    "ED": "วีซ่าการศึกษา",
    "O-A": "วีซ่าเกษียณอายุ (O-A)",
    "O-X": "วีซ่าเกษียณอายุ (O-X)",
  };
  return (
    <SimpleTable
      title="Visa"
      cols={["ประเภท", "ประเทศ", "หมายเหตุ", "โควต้า"]}
      rows={items.map((i) => ({ id: i.id, cells: [`${i.visa_type} · ${VISA_DESC[i.visa_type]}`, i.country, i.note || "-", <QuotaBadge key="q" q={i.quota} />] }))}
      canEdit={canEdit} onAdd={openAdd} onEdit={openEdit} onDelete={(id) => { del(id); toast.success("ลบแล้ว"); }}
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
              <div><label className="text-xs font-semibold">โควต้า</label><Input type="number" value={f.quota} onChange={(e) => setF({ ...f, quota: Number(e.target.value) })} /></div>
              <div className="col-span-2"><label className="text-xs font-semibold">หมายเหตุ</label><Input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>ยกเลิก</Button><Button onClick={submit} className="bg-gradient-primary text-primary-foreground">บันทึก</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      }
    />
  );
}

function InsuranceSection({ canEdit }: { canEdit: boolean }) {
  const items = useServices((s) => s.insurances);
  const add = useServices((s) => s.addInsurance);
  const update = useServices((s) => s.updateInsurance);
  const del = useServices((s) => s.deleteInsurance);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [f, setF] = useState({ plan_name: "", coverage: "", price: 0, note: "", quota: 0 });
  const openAdd = () => { setEditId(null); setF({ plan_name: "", coverage: "", price: 0, note: "", quota: 0 }); setOpen(true); };
  const openEdit = (id: string) => { const x = items.find((i) => i.id === id); if (!x) return; setEditId(id); setF({ plan_name: x.plan_name, coverage: x.coverage, price: x.price, note: x.note ?? "", quota: x.quota }); setOpen(true); };
  const submit = () => { if (!f.plan_name) { toast.error("ใส่ชื่อแผน"); return; } editId ? update(editId, f) : add(f); toast.success("บันทึกแล้ว"); setOpen(false); };
  return (
    <SimpleTable
      title="ประกันการเดินทาง"
      cols={["แผน", "วงเงิน", "ราคา", "หมายเหตุ", "โควต้า"]}
      rows={items.map((i) => ({ id: i.id, cells: [i.plan_name, i.coverage, i.price.toLocaleString(), i.note || "-", <QuotaBadge key="q" q={i.quota} />] }))}
      canEdit={canEdit} onAdd={openAdd} onEdit={openEdit} onDelete={(id) => { del(id); toast.success("ลบแล้ว"); }}
      dialog={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? "แก้ไข" : "เพิ่ม"}ประกัน</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className="text-xs font-semibold">ชื่อแผน</label><Input value={f.plan_name} onChange={(e) => setF({ ...f, plan_name: e.target.value })} /></div>
              <div><label className="text-xs font-semibold">วงเงิน</label><Input value={f.coverage} onChange={(e) => setF({ ...f, coverage: e.target.value })} /></div>
              <div><label className="text-xs font-semibold">ราคา</label><Input type="number" value={f.price} onChange={(e) => setF({ ...f, price: Number(e.target.value) })} /></div>
              <div><label className="text-xs font-semibold">โควต้า</label><Input type="number" value={f.quota} onChange={(e) => setF({ ...f, quota: Number(e.target.value) })} /></div>
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
}
function SimpleTable({ title, cols, rows, canEdit, onAdd, onEdit, onDelete, dialog }: SimpleTableProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{title} · {rows.length} รายการ</p>
        {canEdit && <Button onClick={onAdd} className="bg-gradient-pink text-accent-foreground"><Plus className="w-4 h-4 mr-1" /> เพิ่ม</Button>}
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