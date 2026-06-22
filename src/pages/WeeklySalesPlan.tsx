import { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { addDays, format, startOfWeek, subWeeks, addWeeks, differenceInDays } from "date-fns";
import { th } from "date-fns/locale";
import {
  ChevronLeft, ChevronRight, Plus, CheckCircle2, XCircle, Clock,
  SkipForward, CalendarDays, User, Phone, MapPin, Lightbulb, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useCRM, type StopStatus } from "@/store/crmStore";
import { useCurrentUser } from "@/store/authStore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Activity types (เหมือน Planning.tsx) ───────────────────────────────────
const ACTIVITY_GROUPS = [
  { group: "Sales",            items: ["Field Sale (New Prospect)", "Follow-up Visit"] },
  { group: "Operational",      items: ["Site Survey", "Partner Meeting", "On-site Training"] },
  { group: "Admin/Marketing",  items: ["Office Day", "Event", "Seminar", "Government Contact"] },
  { group: "Relationship",     items: ["After Sales", "Gift Delivery", "Dinner Meeting"] },
  { group: "Support",          items: ["Coffee Shop (Remote Work)", "Transit", "Hotel"] },
  { group: "อื่นๆ",            items: ["พบลูกค้า", "นำเสนอแพ็คเกจ", "ปิดการขาย", "Follow up", "อื่นๆ"] },
];
const PURPOSES = ACTIVITY_GROUPS.flatMap((g) => g.items);

// ─── Day helpers ─────────────────────────────────────────────────────────────
function ymd(d: Date) { return format(d, "yyyy-MM-dd"); }
const DAY_LABELS = ["จ", "อ", "พ", "พฤ", "ศ", "ส"];

// ─── Status badge ────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: StopStatus }) {
  const cfg = {
    planned:     { label: "แผน",    cls: "bg-purple-50 text-purple-700 border-purple-200" },
    in_progress: { label: "กำลังไป", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    completed:   { label: "เสร็จ ✓", cls: "bg-green-50 text-green-700 border-green-200" },
    skipped:     { label: "ข้าม",   cls: "bg-gray-100 text-gray-500 border-gray-200" },
  }[status];
  return (
    <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border", cfg.cls)}>
      {cfg.label}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function WeeklySalesPlan() {
  const user = useCurrentUser();
  const currentRep = user?.full_name ?? "";

  const { routes, customers, addRoute, addStop, deleteStop, updateStop } = useCRM(
    useShallow((s) => ({
      routes:     s.routes,
      customers:  s.customers,
      addRoute:   s.addRoute,
      addStop:    s.addStop,
      deleteStop: s.deleteStop,
      updateStop: s.updateStop,
    })),
  );

  // ── Week state ──────────────────────────────────────────────────────────────
  const [baseMonday, setBaseMonday] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const weekDays = useMemo(
    () => Array.from({ length: 6 }, (_, i) => addDays(baseMonday, i)),
    [baseMonday],
  );
  const weekLabel = `${format(weekDays[0], "d MMM", { locale: th })} – ${format(weekDays[5], "d MMM yyyy", { locale: th })}`;

  // ── Dialog state ────────────────────────────────────────────────────────────
  const [addOpen, setAddOpen] = useState<{ dayKey: string; routeId: string | null } | null>(null);
  const [saving, setSaving] = useState(false);
  const [stopForm, setStopForm] = useState({
    customer_id:  "none",
    place_name:   "",
    address:      "",
    purpose:      PURPOSES[0],
    planned_time: "09:00",
    note:         "",
  });

  // ── Filtered routes for this week + this rep ────────────────────────────────
  const weekRoutes = useMemo(() => {
    const keys = new Set(weekDays.map(ymd));
    return routes.filter((r) => r.rep === currentRep && keys.has(r.date));
  }, [routes, weekDays, currentRep]);

  const routeByDay = useMemo(() => {
    const m = new Map<string, typeof weekRoutes[0]>();
    weekRoutes.forEach((r) => m.set(r.date, r));
    return m;
  }, [weekRoutes]);

  // ── Week stats ──────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    let planned = 0, done = 0, skipped = 0;
    weekRoutes.forEach((r) => r.stops.forEach((s) => {
      if (s.status === "completed")   done++;
      else if (s.status === "skipped") skipped++;
      else planned++;
    }));
    return { total: planned + done + skipped, planned, done, skipped };
  }, [weekRoutes]);

  // ── Suggested customers (ไม่ได้เจอนาน 30+ วัน) ─────────────────────────────
  const suggested = useMemo(() => {
    const today = new Date();
    // build last-visit map per customer
    const lastVisit: Record<string, Date> = {};
    routes.forEach((r) => {
      r.stops.forEach((s) => {
        if (s.customer_id && s.status === "completed" && s.completed_at) {
          const d = new Date(s.completed_at);
          if (!lastVisit[s.customer_id] || d > lastVisit[s.customer_id]) {
            lastVisit[s.customer_id] = d;
          }
        }
      });
    });
    return customers
      .filter((c) => {
        const lv = lastVisit[c.customer_id];
        return !lv || differenceInDays(today, lv) >= 30;
      })
      .slice(0, 8);
  }, [customers, routes]);

  // ── Open add-stop dialog ────────────────────────────────────────────────────
  const openAdd = (dayKey: string, customerId?: string) => {
    const existingRoute = routeByDay.get(dayKey) ?? null;
    let customerPreset = "none";
    let placePreset = "";
    let phonePreset = "";
    if (customerId) {
      const c = customers.find((x) => x.customer_id === customerId);
      if (c) {
        customerPreset = c.customer_id;
        placePreset = c.company || c.full_name;
        phonePreset = c.tel ?? "";
      }
    }
    setStopForm({
      customer_id:  customerPreset,
      place_name:   placePreset,
      address:      phonePreset,   // ใส่เบอร์ชั่วคราวใน address (will refine below)
      purpose:      PURPOSES[0],
      planned_time: "09:00",
      note:         "",
    });
    setAddOpen({ dayKey, routeId: existingRoute?.route_id ?? null });
  };

  // ── Customer select changed → auto-fill ────────────────────────────────────
  const handleCustomerChange = (customerId: string) => {
    if (customerId === "none") {
      setStopForm((f) => ({ ...f, customer_id: "none", place_name: "", address: "" }));
      return;
    }
    const c = customers.find((x) => x.customer_id === customerId);
    setStopForm((f) => ({
      ...f,
      customer_id: customerId,
      place_name:  c ? (c.company || c.full_name) : f.place_name,
      address:     c?.tel ?? f.address,
    }));
  };

  // ── Submit stop ─────────────────────────────────────────────────────────────
  const submitStop = async () => {
    if (!addOpen) return;
    if (!stopForm.place_name.trim() && stopForm.purpose !== "Office Day") {
      toast.error("กรุณาใส่ชื่อสถานที่"); return;
    }
    setSaving(true);
    try {
      let routeId = addOpen.routeId;
      if (!routeId) {
        // สร้าง route ใหม่สำหรับวันนั้น
        const dateLabel = format(new Date(addOpen.dayKey), "d MMM yyyy", { locale: th });
        routeId = addRoute(currentRep as never, addOpen.dayKey, `แผนเยี่ยมลูกค้า ${dateLabel}`);
      }
      const isOffice = stopForm.purpose === "Office Day";
      addStop(routeId, {
        place_name:   isOffice ? "Office Day" : stopForm.place_name.trim(),
        address:      isOffice ? "" : stopForm.address.trim(),
        purpose:      stopForm.purpose,
        planned_time: stopForm.planned_time,
        customer_id:  stopForm.customer_id !== "none" ? stopForm.customer_id : undefined,
        note:         stopForm.note.trim() || undefined,
      });
      toast.success("เพิ่มจุดเยี่ยมแล้ว");
      setAddOpen(null);
    } finally {
      setSaving(false);
    }
  };

  // ── Mark done / skip ────────────────────────────────────────────────────────
  const markDone = (routeId: string, stopId: string) => {
    updateStop(routeId, stopId, { status: "completed", completed_at: new Date().toISOString() });
  };
  const markSkip = (routeId: string, stopId: string) => {
    updateStop(routeId, stopId, { status: "skipped" });
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full min-h-screen bg-gray-50">
      {/* ── Top bar ── */}
      <div className="bg-white border-b sticky top-0 z-20 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#EEEDFE" }}>
            <CalendarDays className="w-5 h-5" style={{ color: "#534AB7" }} />
          </div>
          <div>
            <h1 className="text-base font-semibold leading-tight text-gray-900">แผนสัปดาห์</h1>
            <p className="text-xs text-muted-foreground">วางแผนการเยี่ยมลูกค้าล่วงหน้า</p>
          </div>
        </div>

        {/* Week navigator */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setBaseMonday((d) => subWeeks(d, 1))}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
          <span className="text-sm font-medium text-gray-700 min-w-[160px] text-center">{weekLabel}</span>
          <button
            onClick={() => setBaseMonday((d) => addWeeks(d, 1))}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
          <button
            onClick={() => setBaseMonday(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            สัปดาห์นี้
          </button>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div className="grid grid-cols-4 gap-px bg-gray-200 border-b">
        {[
          { label: "ทั้งสัปดาห์", value: stats.total,   color: "#534AB7" },
          { label: "เสร็จแล้ว",   value: stats.done,    color: "#16A34A" },
          { label: "ยังไม่ได้ไป", value: stats.planned, color: "#CA8A04" },
          { label: "ข้าม",        value: stats.skipped, color: "#9CA3AF" },
        ].map((s) => (
          <div key={s.label} className="bg-white px-4 py-2.5 text-center">
            <p className="text-xl font-semibold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[11px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Day grid ── */}
      <div className="flex-1 overflow-x-auto">
        <div className="grid min-w-[700px]" style={{ gridTemplateColumns: "repeat(6, minmax(0, 1fr))" }}>
          {weekDays.map((day, i) => {
            const dk = ymd(day);
            const route = routeByDay.get(dk);
            const isToday = ymd(day) === ymd(new Date());
            const isPast  = day < new Date() && !isToday;
            const isSat   = i === 5;

            return (
              <div
                key={dk}
                className={cn(
                  "border-r border-gray-200 min-h-[calc(100vh-220px)] flex flex-col",
                  isSat && "bg-gray-50",
                  isPast && !isSat && "bg-white",
                )}
              >
                {/* Day header */}
                <div className={cn(
                  "px-2 py-2 border-b border-gray-200 flex items-center gap-1.5 sticky top-[105px] bg-white z-10",
                  isSat && "bg-gray-50",
                )}>
                  <span className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0",
                    isToday ? "text-white" : "text-gray-600",
                  )} style={{ background: isToday ? "#534AB7" : "transparent" }}>
                    {format(day, "d")}
                  </span>
                  <div>
                    <p className="text-[11px] font-medium text-gray-500">{DAY_LABELS[i]}</p>
                  </div>
                  {route && (
                    <span className="ml-auto text-[10px] text-muted-foreground shrink-0">
                      {route.stops.length} จุด
                    </span>
                  )}
                </div>

                {/* Stops */}
                <div className="flex-1 p-2 space-y-1.5 overflow-y-auto">
                  {route?.stops.map((stop) => (
                    <div
                      key={stop.stop_id}
                      className={cn(
                        "rounded-lg p-2 border text-[11px] group relative",
                        stop.status === "completed" ? "bg-green-50 border-green-100 opacity-75"
                          : stop.status === "skipped" ? "bg-gray-50 border-gray-200 opacity-60"
                          : "bg-white border-purple-100",
                      )}
                    >
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <p className={cn(
                          "font-semibold leading-tight",
                          stop.status === "completed" && "line-through text-gray-500",
                        )}>
                          {stop.place_name}
                        </p>
                        <StatusBadge status={stop.status} />
                      </div>
                      <p className="text-muted-foreground truncate">{stop.purpose}</p>
                      {stop.planned_time && (
                        <p className="text-muted-foreground mt-0.5">
                          <Clock className="w-3 h-3 inline mr-0.5" />{stop.planned_time}
                        </p>
                      )}
                      {stop.address && (
                        <p className="text-muted-foreground truncate">
                          <Phone className="w-3 h-3 inline mr-0.5" />{stop.address}
                        </p>
                      )}
                      {stop.note && (
                        <p className="text-muted-foreground mt-0.5 truncate italic">{stop.note}</p>
                      )}
                      {/* Quick action buttons (hover) */}
                      {stop.status === "planned" && (
                        <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                          <button
                            title="เสร็จแล้ว"
                            onClick={() => markDone(route.route_id, stop.stop_id)}
                            className="w-5 h-5 rounded flex items-center justify-center bg-green-100 text-green-700 hover:bg-green-200"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                          </button>
                          <button
                            title="ข้าม"
                            onClick={() => markSkip(route.route_id, stop.stop_id)}
                            className="w-5 h-5 rounded flex items-center justify-center bg-gray-100 text-gray-500 hover:bg-gray-200"
                          >
                            <SkipForward className="w-3 h-3" />
                          </button>
                          <button
                            title="ลบ"
                            onClick={() => { deleteStop(route.route_id, stop.stop_id); }}
                            className="w-5 h-5 rounded flex items-center justify-center bg-red-50 text-red-400 hover:bg-red-100"
                          >
                            <XCircle className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add button */}
                  {!isSat && (
                    <button
                      onClick={() => openAdd(dk)}
                      className="w-full border border-dashed border-gray-300 rounded-lg py-2 text-[11px] text-gray-400 hover:border-purple-300 hover:text-purple-600 hover:bg-purple-50 transition-colors flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> เพิ่มจุด
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Suggested customers strip ── */}
      {suggested.length > 0 && (
        <div className="border-t bg-white px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            ลูกค้าที่ควรเยี่ยม (ไม่ได้เจอ 30+ วัน)
          </p>
          <div className="flex gap-2 flex-wrap">
            {suggested.map((c) => (
              <button
                key={c.customer_id}
                onClick={() => openAdd(ymd(weekDays[0]), c.customer_id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-purple-200 text-[11px] text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors"
              >
                <User className="w-3 h-3" />
                {c.company || c.full_name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Add Stop Dialog ── */}
      <Dialog open={!!addOpen} onOpenChange={(o) => { if (!o) setAddOpen(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              เพิ่มจุดเยี่ยม ·{" "}
              {addOpen && format(new Date(addOpen.dayKey), "EEEE d MMM yyyy", { locale: th })}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-1">
            {/* Customer select */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">ลูกค้า</label>
              <Select value={stopForm.customer_id} onValueChange={handleCustomerChange}>
                <SelectTrigger className="mt-1 h-9 text-sm">
                  <SelectValue placeholder="เลือกลูกค้า (ไม่บังคับ)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">– ไม่ระบุลูกค้า –</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.customer_id} value={c.customer_id}>
                      {c.company ? `${c.company} · ${c.full_name}` : c.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Place name */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">สถานที่ / ชื่อ</label>
              <Input
                className="mt-1 h-9 text-sm"
                placeholder="ชื่อบริษัท / ร้าน / สถานที่"
                value={stopForm.place_name}
                onChange={(e) => setStopForm((f) => ({ ...f, place_name: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Phone / Address */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">เบอร์ติดต่อ</label>
                <Input
                  className="mt-1 h-9 text-sm"
                  placeholder="08X-XXX-XXXX"
                  value={stopForm.address}
                  onChange={(e) => setStopForm((f) => ({ ...f, address: e.target.value }))}
                />
              </div>
              {/* Time */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">เวลา</label>
                <Input
                  type="time"
                  className="mt-1 h-9 text-sm"
                  value={stopForm.planned_time}
                  onChange={(e) => setStopForm((f) => ({ ...f, planned_time: e.target.value }))}
                />
              </div>
            </div>

            {/* Purpose */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">วัตถุประสงค์</label>
              <Select value={stopForm.purpose} onValueChange={(v) => setStopForm((f) => ({ ...f, purpose: v }))}>
                <SelectTrigger className="mt-1 h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_GROUPS.map((g) => (
                    <div key={g.group}>
                      <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{g.group}</div>
                      {g.items.map((item) => (
                        <SelectItem key={item} value={item}>{item}</SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Note */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">หมายเหตุ</label>
              <Input
                className="mt-1 h-9 text-sm"
                placeholder="รายละเอียดเพิ่มเติม..."
                value={stopForm.note}
                onChange={(e) => setStopForm((f) => ({ ...f, note: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(null)}>ยกเลิก</Button>
            <Button onClick={submitStop} disabled={saving} style={{ background: "#534AB7", color: "#fff" }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              เพิ่มจุดเยี่ยม
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
