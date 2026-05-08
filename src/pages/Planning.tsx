import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarIcon, MapPin, Plus, Route, Trash2, ChevronRight, Navigation, Clock, Lock, Eye } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useCRM, type RoutePlan } from "@/store/crmStore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Activity tracking categories
const ACTIVITY_GROUPS: { group: string; items: string[] }[] = [
  { group: "Sales", items: ["Field Sale (New Prospect)", "Follow-up Visit"] },
  { group: "Operational", items: ["Site Survey", "Partner Meeting", "On-site Training"] },
  { group: "Admin/Marketing", items: ["Office Day", "Event", "Seminar", "Government Contact"] },
  { group: "Relationship", items: ["After Sales", "Gift Delivery", "Dinner Meeting"] },
  { group: "Support", items: ["Coffee Shop (Remote Work)", "Transit", "Hotel"] },
  { group: "อื่นๆ", items: ["พบลูกค้า", "นำเสนอแพ็คเกจ", "ปิดการขาย", "Follow up", "อื่นๆ"] },
];
const PURPOSES = ACTIVITY_GROUPS.flatMap((g) => g.items);

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function Planning() {
  const currentRep = useCRM((s) => s.currentRep);
  const routes = useCRM((s) => s.routes);
  const customers = useCRM((s) => s.customers);
  const addRoute = useCRM((s) => s.addRoute);
  const addStop = useCRM((s) => s.addStop);
  const deleteStop = useCRM((s) => s.deleteStop);
  const deleteRoute = useCRM((s) => s.deleteRoute);

  const [date, setDate] = useState<Date>(new Date());
  const [openStop, setOpenStop] = useState<RoutePlan | null>(null);
  const [stopForm, setStopForm] = useState({
    place_name: "", address: "", purpose: PURPOSES[0], planned_time: "09:00", customer_id: "none", note: "",
  });

  const dateKey = ymd(date);
  const todayRoutes = useMemo(
    () => routes.filter((r) => r.rep === currentRep && r.date === dateKey).sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [routes, currentRep, dateKey],
  );

  if (currentRep === "All") {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-warning/40 bg-warning/10 p-6 flex items-center gap-3">
          <Lock className="w-5 h-5 text-warning-foreground" />
          <div>
            <p className="font-semibold">หน้านี้สำหรับ Sales เท่านั้น</p>
            <p className="text-sm text-muted-foreground">สลับ Role เป็น Sales ที่ Sidebar เพื่อใช้งาน Planning + Route</p>
          </div>
        </div>
      </div>
    );
  }

  const createRoute = () => {
    addRoute(currentRep as never, dateKey, `แผนเยี่ยมลูกค้า ${dateKey}`);
    toast.success("สร้าง Route ใหม่แล้ว");
  };

  const submitStop = () => {
    if (!openStop) return;
    const isOffice = stopForm.purpose === "Office Day";
    if (!isOffice && !stopForm.place_name.trim()) { toast.error("กรุณาใส่ชื่อสถานที่"); return; }
    addStop(openStop.route_id, {
      place_name: isOffice ? "Office Day" : stopForm.place_name,
      address: isOffice ? "" : stopForm.address,
      purpose: stopForm.purpose,
      planned_time: stopForm.planned_time,
      customer_id: !isOffice && stopForm.customer_id !== "none" ? stopForm.customer_id : undefined,
      note: stopForm.note,
    });
    setOpenStop(null);
    setStopForm({ place_name: "", address: "", purpose: PURPOSES[0], planned_time: "09:00", customer_id: "none", note: "" });
    toast.success("เพิ่มจุดเยี่ยมแล้ว");
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <Route className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Planning + Route</h1>
            <p className="text-sm text-muted-foreground">วางแผนเส้นทางเยี่ยมลูกค้ารายวัน — เพิ่มจุดได้ไม่จำกัด</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-10">
                <CalendarIcon className="w-4 h-4 mr-2" />
                {format(date, "EEE d MMM yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
          <Button onClick={createRoute} className="bg-gradient-pink text-accent-foreground hover:opacity-90">
            <Plus className="w-4 h-4 mr-2" /> สร้าง Route
          </Button>
        </div>
      </div>

      {todayRoutes.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center bg-card">
          <Navigation className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="font-semibold">ยังไม่มีแผนของวันนี้</p>
          <p className="text-sm text-muted-foreground">กด "สร้าง Route" เพื่อเริ่มวางแผน</p>
        </div>
      ) : (
        <div className="space-y-4">
          {todayRoutes.map((r) => {
            const completed = r.stops.filter((s) => s.status === "completed").length;
            const hasCompleted = completed > 0;
            return (
              <div key={r.route_id} className="bg-card rounded-xl border shadow-soft overflow-hidden">
                <div className="p-4 border-b bg-gradient-to-r from-primary/5 to-accent/5 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold">{r.title}</h3>
                      <Badge variant="outline" className="border-primary/40 text-primary">{r.stops.length} จุด</Badge>
                      <Badge variant="outline" className="border-success/40 text-success">เสร็จ {completed}/{r.stops.length}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Route ID: {r.route_id}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setOpenStop(r)}>
                      <Plus className="w-4 h-4 mr-1" /> เพิ่มจุด
                    </Button>
                    <Link to={`/app/mission/${r.route_id}`}>
                      <Button size="sm" className="bg-gradient-primary text-primary-foreground">
                        เริ่ม Mission <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </Link>
                    {hasCompleted && (
                      <Link to={`/app/route-completed/${r.route_id}`}>
                        <Button size="sm" variant="outline" className="border-success/40 text-success hover:bg-success/10">
                          <Eye className="w-4 h-4 mr-1" /> ข้อมูล Route
                        </Button>
                      </Link>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => { deleteRoute(r.route_id); toast.success("ลบ Route แล้ว"); }}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <ol className="divide-y">
                  {r.stops.length === 0 ? (
                    <li className="p-6 text-sm text-muted-foreground text-center">ยังไม่มีจุดเยี่ยม — กดปุ่ม "เพิ่มจุด" ด้านบน</li>
                  ) : r.stops.map((s) => (
                    <li key={s.stop_id} className="p-3 flex items-start gap-3 hover:bg-muted/30">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0">
                        {s.seq}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold truncate">{s.place_name}</p>
                          <Badge variant="outline" className="text-[10px]">{s.purpose}</Badge>
                          {s.status === "completed" && <Badge className="bg-success/15 text-success border-success/30 text-[10px]">เสร็จแล้ว · {s.duration_min}m</Badge>}
                          {s.status === "in_progress" && <Badge className="bg-warning/20 text-warning-foreground border-warning/40 text-[10px]">กำลังทำ</Badge>}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{s.planned_time ?? "-"}</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{s.address || "-"}</span>
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => deleteStop(r.route_id, s.stop_id)}>
                        <Trash2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </li>
                  ))}
                </ol>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!openStop} onOpenChange={(o) => !o && setOpenStop(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>เพิ่มจุดเยี่ยม</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold">วัตถุประสงค์ *</label>
                <Select value={stopForm.purpose} onValueChange={(v) => setStopForm({ ...stopForm, purpose: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {ACTIVITY_GROUPS.map((g) => (
                      <div key={g.group}>
                        <div className="px-2 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{g.group}</div>
                        {g.items.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold">เวลานัด</label>
                <Input type="time" value={stopForm.planned_time} onChange={(e) => setStopForm({ ...stopForm, planned_time: e.target.value })} />
              </div>
            </div>
            {stopForm.purpose !== "Office Day" && (
              <>
                <div>
                  <label className="text-xs font-semibold">ชื่อสถานที่ / บริษัท *</label>
                  <Input value={stopForm.place_name} onChange={(e) => setStopForm({ ...stopForm, place_name: e.target.value })} placeholder="เช่น บมจ. พัฒนาดี" />
                </div>
                <div>
                  <label className="text-xs font-semibold">ที่อยู่</label>
                  <Input value={stopForm.address} onChange={(e) => setStopForm({ ...stopForm, address: e.target.value })} placeholder="เช่น สีลม กรุงเทพฯ" />
                </div>
                <div>
                  <label className="text-xs font-semibold">ลูกค้า (ถ้ามี)</label>
                  <Select value={stopForm.customer_id} onValueChange={(v) => setStopForm({ ...stopForm, customer_id: v })}>
                    <SelectTrigger><SelectValue placeholder="เลือกลูกค้า..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— ไม่ระบุ —</SelectItem>
                      {customers.slice(0, 30).map((c) => (
                        <SelectItem key={c.customer_id} value={c.customer_id}>{c.full_name} {c.company !== "-" && `· ${c.company}`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div>
              <label className="text-xs font-semibold">โน๊ต</label>
              <Textarea rows={2} value={stopForm.note} onChange={(e) => setStopForm({ ...stopForm, note: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenStop(null)}>ยกเลิก</Button>
            <Button onClick={submitStop} className="bg-gradient-pink text-accent-foreground">เพิ่มจุด</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}