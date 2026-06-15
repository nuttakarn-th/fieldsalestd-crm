import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarIcon, MapPin, Plus, Route, Trash2, ChevronRight, Navigation, Clock, Lock, Eye, GripVertical, CheckCircle2, Timer } from "lucide-react";
import { TimeInput24, nowHHMM } from "@/components/TimeInput24";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VoiceTextarea } from "@/components/VoiceTextarea";
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
  // narrow selector: ดึงแค่ field ที่ใช้ใน dropdown — ลด re-render เมื่อ note/tier/spend เปลี่ยน
  type CustOpt = { customer_id: string; full_name: string; company: string };
  const eqCustOpts = (a: CustOpt[], b: CustOpt[]) =>
    a.length === b.length && a.every((x, i) => x.customer_id === b[i].customer_id && x.full_name === b[i].full_name);
  const customers = useCRM(
    (s) => s.customers.map((c): CustOpt => ({ customer_id: c.customer_id, full_name: c.full_name, company: c.company })),
    eqCustOpts,
  );
  const addRoute = useCRM((s) => s.addRoute);
  const addStop = useCRM((s) => s.addStop);
  const deleteStop = useCRM((s) => s.deleteStop);
  const reorderStops = useCRM((s) => s.reorderStops);
  const deleteRoute = useCRM((s) => s.deleteRoute);

  const [date, setDate] = useState<Date>(new Date());
  const [openStop, setOpenStop] = useState<RoutePlan | null>(null);
  const [stopForm, setStopForm] = useState({
    place_name: "", address: "", purpose: PURPOSES[0], planned_time: "09:00", customer_id: "none", note: "",
  });
  const [openNewRoute, setOpenNewRoute] = useState(false);
  const [newRouteTitle, setNewRouteTitle] = useState("");
  const dragStopId = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

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
            <p className="font-semibold">หน้านี้สำหรับ Sales และ OB Co-ordinator เท่านั้น</p>
            <p className="text-sm text-muted-foreground">กรุณา Login ด้วย Account Sales หรือ OB Co-ordinator เพื่อใช้งาน Planning + Route</p>
          </div>
        </div>
      </div>
    );
  }

  const openCreateRoute = () => {
    setNewRouteTitle(`แผนเยี่ยมลูกค้า ${dateKey}`);
    setOpenNewRoute(true);
  };

  const createRoute = () => {
    const title = newRouteTitle.trim() || `แผนเยี่ยมลูกค้า ${dateKey}`;
    addRoute(currentRep as never, dateKey, title);
    setOpenNewRoute(false);
    setNewRouteTitle("");
    toast.success(`สร้าง Route "${title}" แล้ว`);
  };

  function fmtCompleted(iso?: string) {
    if (!iso) return "";
    return new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false });
  }

  const handleDragStart = (stopId: string) => { dragStopId.current = stopId; };
  const handleDragOver = (e: React.DragEvent, stopId: string) => { e.preventDefault(); setDragOverId(stopId); };
  const handleDragEnd = () => { dragStopId.current = null; setDragOverId(null); };
  const handleDrop = (routeId: string, pendingStops: typeof todayRoutes[0]["stops"], toStopId: string) => {
    const fromId = dragStopId.current;
    if (!fromId || fromId === toStopId) { setDragOverId(null); return; }
    const ids = pendingStops.map((s) => s.stop_id);
    const fromIdx = ids.indexOf(fromId);
    const toIdx = ids.indexOf(toStopId);
    if (fromIdx < 0 || toIdx < 0) { setDragOverId(null); return; }
    const reordered = [...ids];
    reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, fromId);
    reorderStops(routeId, reordered);
    setDragOverId(null);
    dragStopId.current = null;
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
          <Button onClick={openCreateRoute} className="bg-gradient-pink text-accent-foreground hover:opacity-90">
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
                <div className="px-3 pt-3 pb-2 sm:px-4 sm:pt-4 border-b bg-gradient-to-r from-primary/5 to-accent/5">
                  {/* Row 1: title + delete */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm sm:text-base leading-snug">{r.title}</h3>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <Badge variant="outline" className="border-primary/40 text-primary text-[10px] h-5">{r.stops.length} จุด</Badge>
                        <Badge variant="outline" className="border-success/40 text-success text-[10px] h-5">เสร็จ {completed}/{r.stops.length}</Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 hidden sm:block">Route ID: {r.route_id}</p>
                    </div>
                    <Button size="icon" variant="ghost" className="shrink-0 w-7 h-7 mt-0.5" onClick={() => { deleteRoute(r.route_id); toast.success("ลบ Route แล้ว"); }}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                  {/* Row 2: action buttons */}
                  <div className="flex items-center gap-2 mt-2">
                    <Button size="sm" variant="outline" className="h-8 text-xs px-3 shrink-0" onClick={() => {
                      const defaultTime = r.date === ymd(new Date()) ? nowHHMM() : "09:00";
                      setStopForm({ place_name: "", address: "", purpose: PURPOSES[0], planned_time: defaultTime, customer_id: "none", note: "" });
                      setOpenStop(r);
                    }}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> เพิ่มจุด
                    </Button>
                    <Link to={`/app/mission/${r.route_id}`} className="flex-1 sm:flex-none">
                      <Button size="sm" className="w-full h-8 text-xs bg-gradient-primary text-primary-foreground">
                        เริ่ม Mission <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </Link>
                    {hasCompleted && (
                      <Link to={`/app/route-completed/${r.route_id}`} className="shrink-0">
                        <Button size="sm" variant="outline" className="h-8 text-xs border-success/40 text-success hover:bg-success/10 px-2.5">
                          <Eye className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline ml-1">ข้อมูล Route</span>
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
                {(() => {
                  if (r.stops.length === 0) {
                    return <p className="p-6 text-sm text-muted-foreground text-center">ยังไม่มีจุดเยี่ยม — กดปุ่ม "เพิ่มจุด" ด้านบน</p>;
                  }
                  const sorted = r.stops.slice().sort((a, b) => a.seq - b.seq);
                  const pending = sorted.filter((s) => s.status !== "completed");
                  const done = sorted.filter((s) => s.status === "completed");
                  return (
                    <div>
                      {/* ── รอดำเนินการ (draggable) ── */}
                      {pending.length > 0 && (
                        <div>
                          {pending.map((s) => {
                            const isActive = s.status === "in_progress";
                            const isDragOver = dragOverId === s.stop_id;
                            return (
                              <div
                                key={s.stop_id}
                                draggable
                                onDragStart={() => handleDragStart(s.stop_id)}
                                onDragOver={(e) => handleDragOver(e, s.stop_id)}
                                onDrop={() => handleDrop(r.route_id, pending, s.stop_id)}
                                onDragEnd={handleDragEnd}
                                className={`flex items-start gap-3 px-3 py-3 border-b last:border-b-0 transition-colors select-none
                                  ${isDragOver ? "bg-primary/10 border-l-2 border-l-primary" : "hover:bg-muted/30"}
                                  ${isActive ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}
                              >
                                {/* drag handle */}
                                <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5 cursor-grab active:cursor-grabbing">
                                  <GripVertical className="w-4 h-4 text-muted-foreground/50" />
                                </div>
                                {/* seq badge */}
                                <div className={`w-8 h-8 rounded-full font-bold flex items-center justify-center shrink-0 text-sm
                                  ${isActive ? "bg-primary text-primary-foreground shadow-glow" : "bg-muted text-muted-foreground"}`}>
                                  {s.seq}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-semibold truncate">{s.place_name}</p>
                                    <Badge variant="outline" className="text-[10px]">{s.purpose}</Badge>
                                    {isActive && (
                                      <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px]">
                                        <Timer className="w-2.5 h-2.5 mr-1" /> กำลังทำ
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{s.planned_time ?? "-"}</span>
                                    {s.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{s.address}</span>}
                                  </div>
                                  {s.note && <p className="text-xs text-muted-foreground mt-1 bg-muted/40 rounded px-2 py-1 whitespace-pre-wrap">📝 {s.note}</p>}
                                </div>
                                <Button size="icon" variant="ghost" className="shrink-0" onClick={() => deleteStop(r.route_id, s.stop_id)}>
                                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* ── เสร็จแล้ว section ── */}
                      {done.length > 0 && (
                        <div className="border-t-2 border-success/20">
                          <div className="px-3 py-1.5 bg-success/8 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                            <span className="text-xs font-semibold text-success">เสร็จแล้ว {done.length} จุด</span>
                          </div>
                          {done.map((s) => (
                            <div key={s.stop_id} className="flex items-start gap-3 px-3 py-3 bg-success/5 border-b last:border-b-0 border-success/10">
                              <div className="w-8 h-8 rounded-full bg-success/20 text-success flex items-center justify-center shrink-0">
                                <CheckCircle2 className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-semibold truncate text-success/80">{s.place_name}</p>
                                  <Badge variant="outline" className="text-[10px] border-success/30 text-success/70">{s.purpose}</Badge>
                                  <Badge className="bg-success/15 text-success border-success/30 text-[10px]">
                                    เสร็จ {s.duration_min}m
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />นัด {s.planned_time ?? "-"}</span>
                                  {s.completed_at && (
                                    <span className="flex items-center gap-1 text-success font-medium">
                                      <CheckCircle2 className="w-3 h-3" />เสร็จ {fmtCompleted(s.completed_at)} น.
                                    </span>
                                  )}
                                  {s.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{s.address}</span>}
                                </div>
                                {s.note && <p className="text-xs text-success/60 mt-1 italic">"{s.note}"</p>}
                              </div>
                              <Button size="icon" variant="ghost" className="shrink-0 opacity-40 hover:opacity-100" onClick={() => deleteStop(r.route_id, s.stop_id)}>
                                <Trash2 className="w-4 h-4 text-muted-foreground" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
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
                <TimeInput24
                  value={stopForm.planned_time}
                  onChange={(v) => setStopForm({ ...stopForm, planned_time: v })}
                  min={openStop?.date === ymd(new Date()) ? nowHHMM() : undefined}
                  className="w-full"
                />
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
              <VoiceTextarea rows={3} value={stopForm.note} onChange={(e) => setStopForm({ ...stopForm, note: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenStop(null)}>ยกเลิก</Button>
            <Button onClick={submitStop} className="bg-gradient-pink text-accent-foreground">เพิ่มจุด</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openNewRoute} onOpenChange={setOpenNewRoute}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>สร้าง Route ใหม่ — {dateKey}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold">ชื่อ Route *</label>
              <Input
                value={newRouteTitle}
                onChange={(e) => setNewRouteTitle(e.target.value)}
                placeholder="เช่น เยี่ยมลูกค้าเชียงใหม่ หรือ Field Sale วันจันทร์"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") createRoute(); }}
              />
              <p className="text-[11px] text-muted-foreground mt-1">ชื่อนี้จะแสดงบน Route ID เพื่อหาง่าย</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNewRoute(false)}>ยกเลิก</Button>
            <Button onClick={createRoute} className="bg-gradient-pink text-accent-foreground">
              <Plus className="w-4 h-4 mr-2" /> สร้าง
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}