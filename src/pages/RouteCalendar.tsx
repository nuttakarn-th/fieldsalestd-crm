import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, Clock, ChevronRight as ArrowRight, Lock, Plus, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { VoiceTextarea } from "@/components/VoiceTextarea";
import { Label } from "@/components/ui/label";
import { useCRM, type RoutePlan } from "@/store/crmStore";
import { StopDialog } from "@/components/StopDialog";
import { toast } from "sonner";

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function ymd(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }

export default function RouteCalendar() {
  const currentRep = useCRM((s) => s.currentRep);
  const routes = useCRM((s) => s.routes);
  const addRoute = useCRM((s) => s.addRoute);

  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [openRoute, setOpenRoute] = useState<RoutePlan | null>(null);
  const [dayOpen, setDayOpen] = useState<{ date: string; routes: RoutePlan[] } | null>(null);
  const [newRouteOpen, setNewRouteOpen] = useState<{ date: string } | null>(null);
  const [quickStopDate, setQuickStopDate] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newPlace, setNewPlace] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newTime, setNewTime] = useState("09:00");
  const [newPurpose, setNewPurpose] = useState("พบลูกค้า");
  const [newNote, setNewNote] = useState("");

  const addStop = useCRM((s) => s.addStop);

  const openCreateRoute = (date: string) => {
    setDayOpen(null);
    setNewRouteOpen({ date });
    setNewTitle(`แผนเยี่ยมลูกค้า ${date}`);
    setNewPlace(""); setNewAddress(""); setNewTime("09:00"); setNewPurpose("พบลูกค้า"); setNewNote("");
  };

  const openQuickStop = (date: string) => {
    setDayOpen(null);
    setQuickStopDate(date);
  };

  const submitNewRoute = () => {
    if (!newRouteOpen) return;
    if (!newTitle.trim()) return toast.error("กรุณาตั้งชื่อ Route");
    const id = addRoute(currentRep as never, newRouteOpen.date, newTitle.trim());
    if (newPlace.trim()) {
      addStop(id, {
        place_name: newPlace.trim(),
        address: newAddress.trim(),
        purpose: newPurpose,
        planned_time: newTime,
        note: newNote,
      });
    }
    toast.success(`สร้าง Route แล้ว (${id})`);
    setNewRouteOpen(null);
  };

  const myRoutes = useMemo(
    () => routes.filter((r) => r.rep === currentRep),
    [routes, currentRep],
  );

  const grid = useMemo(() => {
    const first = startOfMonth(cursor);
    const startDay = (first.getDay() + 6) % 7; // Mon=0
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const cells: { date: Date | null; key: string }[] = [];
    for (let i = 0; i < startDay; i++) cells.push({ date: null, key: `e${i}` });
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(cursor.getFullYear(), cursor.getMonth(), d);
      cells.push({ date, key: ymd(date) });
    }
    while (cells.length % 7 !== 0) cells.push({ date: null, key: `t${cells.length}` });
    return cells;
  }, [cursor]);

  const byDate = useMemo(() => {
    const m = new Map<string, RoutePlan[]>();
    myRoutes.forEach((r) => {
      const arr = m.get(r.date) ?? [];
      arr.push(r);
      m.set(r.date, arr);
    });
    return m;
  }, [myRoutes]);

  const todayKey = ymd(new Date());

  if (currentRep === "All") {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-warning/40 bg-warning/10 p-6 flex items-center gap-3">
          <Lock className="w-5 h-5 text-warning-foreground" />
          <div>
            <p className="font-semibold">หน้านี้สำหรับ Sales เท่านั้น</p>
            <p className="text-sm text-muted-foreground">สลับ Role เป็น Sales เพื่อดูปฏิทินการติดตาม</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <CalendarDays className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">ปฏิทินการติดตาม (Route)</h1>
            <p className="text-sm text-muted-foreground">ดูแผนเยี่ยมแต่ละวัน · จิ้มเพื่อดูรายละเอียด · ลิงก์ไป Mission</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="px-4 h-9 rounded-md border bg-card flex items-center font-semibold min-w-44 justify-center">
            {cursor.toLocaleDateString("th-TH", { month: "long", year: "numeric" })}
          </div>
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={() => setCursor(startOfMonth(new Date()))}>วันนี้</Button>
        </div>
      </div>

      <div className="bg-card rounded-xl border shadow-soft overflow-hidden">
        {/* Day headers — Sunday (index 6) gets pink tint */}
        <div className="grid grid-cols-7 bg-muted/50 text-xs font-semibold text-muted-foreground">
          {["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"].map((d, i) => (
            <div key={d} className={`p-2 text-center ${i === 6 ? "bg-rose-100 text-rose-600 font-bold dark:bg-rose-900/40 dark:text-rose-400" : ""}`}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {grid.map((c) => {
            if (!c.date) return <div key={c.key} className="min-h-28 border-t border-r bg-muted/20" />;
            const key = ymd(c.date);
            const dayRoutes = byDate.get(key) ?? [];
            const isToday = key === todayKey;
            const isPast = key < todayKey;
            const isSunday = c.date.getDay() === 0;
            return (
              <button
                key={c.key}
                onClick={() => setDayOpen({ date: key, routes: dayRoutes })}
                className={[
                  "text-left min-h-28 border-t border-r p-1.5 flex flex-col gap-1 transition",
                  isSunday ? "bg-rose-50 dark:bg-rose-950/30" : "",
                  isToday ? "bg-primary/5" : "",
                  isPast ? "opacity-60 cursor-default hover:bg-transparent" : "hover:bg-primary/5",
                ].filter(Boolean).join(" ")}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${
                    isToday ? "w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center" :
                    isSunday ? "text-rose-600 font-bold" : ""
                  }`}>
                    {c.date.getDate()}
                  </span>
                  {dayRoutes.length > 0 && (
                    <span className="text-[10px] text-muted-foreground">{dayRoutes.reduce((a, r) => a + r.stops.length, 0)} จุด</span>
                  )}
                </div>
                <div className="space-y-1 overflow-hidden">
                  {dayRoutes.slice(0, 2).map((r) => {
                    const done = r.stops.filter((s) => s.status === "completed").length;
                    return (
                      <span
                        key={r.route_id}
                        className="block w-full text-left text-[11px] rounded px-1.5 py-1 bg-gradient-to-r from-primary/15 to-accent/15 truncate"
                      >
                        <span className="font-semibold">{r.stops.length} จุด</span>
                        <span className="text-muted-foreground"> · เสร็จ {done}</span>
                      </span>
                    );
                  })}
                  {dayRoutes.length > 2 && (
                    <p className="text-[10px] text-muted-foreground">+{dayRoutes.length - 2} อื่นๆ</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <Dialog open={!!openRoute} onOpenChange={(o) => !o && setOpenRoute(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{openRoute?.title}</DialogTitle>
          </DialogHeader>
          {openRoute && (
            <div className="space-y-2 max-h-[60vh] overflow-auto">
              {openRoute.stops.length === 0 && <p className="text-sm text-muted-foreground">ยังไม่มีจุดเยี่ยม</p>}
              {openRoute.stops.map((s) => (
                <div key={s.stop_id} className="p-3 rounded-lg border flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center shrink-0">{s.seq}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{s.place_name}</p>
                      <Badge variant="outline" className="text-[10px]">{s.purpose}</Badge>
                      {s.status === "completed" && <Badge className="bg-success/15 text-success border-success/30 text-[10px]">เสร็จ · {s.duration_min}m</Badge>}
                      {s.status === "in_progress" && <Badge className="bg-warning/20 text-warning-foreground border-warning/40 text-[10px]">กำลังทำ</Badge>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{s.planned_time}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{s.address}</span>
                    </div>
                    {s.note && (
                      <p className="text-xs text-muted-foreground mt-1 bg-muted/40 rounded px-2 py-1 whitespace-pre-wrap">📝 {s.note}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenRoute(null)}>ปิด</Button>
            {openRoute && (
              <Link to={`/app/mission/${openRoute.route_id}`} onClick={() => setOpenRoute(null)}>
                <Button className="bg-gradient-primary text-primary-foreground">
                  ไปหน้า Mission <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!dayOpen} onOpenChange={(o) => !o && setDayOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {dayOpen && dayOpen.date < todayKey && (
                <History className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
              วันที่ {dayOpen?.date}
              {dayOpen && dayOpen.date < todayKey && (
                <Badge variant="outline" className="text-[10px] border-muted text-muted-foreground font-normal">ข้อมูลย้อนหลัง</Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[50vh] overflow-auto">
            {/* Past date: show read-only notice */}
            {dayOpen && dayOpen.date < todayKey && (
              <div className="flex items-start gap-2 rounded-lg bg-muted/50 border px-3 py-2 text-xs text-muted-foreground">
                <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>ไม่สามารถเพิ่มหรือแก้ไขแผนในวันที่ผ่านมาได้ — แสดงเฉพาะรายงาน</span>
              </div>
            )}
            {dayOpen && dayOpen.routes.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">ยังไม่มี Route ในวันนี้</p>
            )}
            {dayOpen?.routes.map((r) => {
              const done = r.stops.filter((s) => s.status === "completed").length;
              return (
                <button key={r.route_id} onClick={() => { setDayOpen(null); setOpenRoute(r); }}
                  className="w-full text-left p-3 rounded-lg border hover:bg-muted/40">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{r.title}</p>
                    <Badge variant="outline">{r.stops.length} จุด · เสร็จ {done}</Badge>
                  </div>
                </button>
              );
            })}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDayOpen(null)}>ปิด</Button>
            {/* Only show add buttons for today or future dates */}
            {dayOpen && dayOpen.date >= todayKey && (
              <>
                <Button
                  variant="outline"
                  onClick={() => dayOpen && openQuickStop(dayOpen.date)}
                >
                  <Plus className="w-4 h-4 mr-2" /> เพิ่มจุดเยี่ยม
                </Button>
                <Button
                  onClick={() => dayOpen && openCreateRoute(dayOpen.date)}
                  className="bg-gradient-pink text-accent-foreground"
                >
                  <Plus className="w-4 h-4 mr-2" /> เพิ่ม Route + รายละเอียด
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StopDialog
        open={!!quickStopDate}
        onClose={() => setQuickStopDate(null)}
        autoCreateForDate={quickStopDate ?? undefined}
        rep={currentRep as string}
        title={`เพิ่มจุดเยี่ยม — ${quickStopDate ?? ""}`}
      />

      <Dialog open={!!newRouteOpen} onOpenChange={(o) => !o && setNewRouteOpen(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>เพิ่ม Route ใหม่ — {newRouteOpen?.date}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>ชื่อ Route *</Label><Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} /></div>
            <div className="text-xs text-muted-foreground -mt-2">ใส่จุดเยี่ยมแรก (ถ้าต้องการ ข้ามได้)</div>
            <div><Label>ชื่อสถานที่ / บริษัท</Label><Input value={newPlace} onChange={(e) => setNewPlace(e.target.value)} placeholder="เช่น บมจ. พัฒนาดี" /></div>
            <div><Label>ที่อยู่</Label><Input value={newAddress} onChange={(e) => setNewAddress(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>เวลานัด</Label><Input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} /></div>
              <div><Label>วัตถุประสงค์</Label><Input value={newPurpose} onChange={(e) => setNewPurpose(e.target.value)} /></div>
            </div>
            <div><Label>โน๊ต</Label><VoiceTextarea rows={3} value={newNote} onChange={(e) => setNewNote(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewRouteOpen(null)}>ยกเลิก</Button>
            <Button onClick={submitNewRoute} className="bg-gradient-pink text-accent-foreground">
              <Plus className="w-4 h-4 mr-2" /> สร้าง Route
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}