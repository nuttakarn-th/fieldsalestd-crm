import { useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Link } from "react-router-dom";
import { CalendarIcon, MapPin, Plus, Route, Trash2, ChevronLeft, ChevronRight, Navigation, Clock, Lock, Eye, GripVertical, CheckCircle2, Timer, LogIn, LogOut, Building2, Loader2 } from "lucide-react";
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
import { useSiteSettings } from "@/store/siteSettingsStore";
import { useCurrentUser } from "@/store/authStore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CHECKIN_RADIUS_M = 200; // รัศมี GPS ที่อนุญาต (เมตร)

// ── Haversine distance (เมตร) ─────────────────────────────────────────────────
function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── GPS helper → ส่งคืน position หรือ throw ──────────────────────────────────
function getGPS(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Browser ไม่รองรับ GPS"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 12_000,
      maximumAge: 0,
    });
  });
}

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
  // ── Office GPS from siteSettings ─────────────────────────────────────────────
  const officeLat = useSiteSettings((s) => s.officeLat);
  const officeLng = useSiteSettings((s) => s.officeLng);
  // ── Current user (for warning link to WebSetting) ─────────────────────────────
  const currentUser = useCurrentUser();
  const canSetOffice = currentUser?.role === "Admin" || currentUser?.role === "Sales Manager";
  // ── Stable selector ──────────────────────────────────────────────────────────
  // Zustand v5 ไม่รองรับ equalityFn เป็น arg ที่ 2 → selector .map() สร้าง array ใหม่ทุก render
  // → Zustand เห็นว่า state เปลี่ยน → re-render → loop → React #185
  // แก้: useShallow บน raw array ก่อน แล้วค่อย .map() ผ่าน useMemo
  // ──────────────────────────────────────────────────────────────────────────────
  type CustOpt = { customer_id: string; full_name: string; company: string };
  const rawCustomers = useCRM(useShallow((s) => s.customers));
  const customers = useMemo(
    () => rawCustomers.map((c): CustOpt => ({ customer_id: c.customer_id, full_name: c.full_name, company: c.company })),
    [rawCustomers],
  );
  const addRoute = useCRM((s) => s.addRoute);
  const addStop = useCRM((s) => s.addStop);
  const deleteStop = useCRM((s) => s.deleteStop);
  const reorderStops = useCRM((s) => s.reorderStops);
  const deleteRoute = useCRM((s) => s.deleteRoute);
  const checkinRoute = useCRM((s) => s.checkinRoute);
  const checkoutRoute = useCRM((s) => s.checkoutRoute);

  const [date, setDate] = useState<Date>(new Date());
  const [openStop, setOpenStop] = useState<RoutePlan | null>(null);
  const [stopForm, setStopForm] = useState({
    place_name: "", address: "", purpose: PURPOSES[0], planned_time: "09:00", customer_id: "none", note: "",
  });
  const [openNewRoute, setOpenNewRoute] = useState(false);
  const [newRouteTitle, setNewRouteTitle] = useState("");
  const [gpsLoading, setGpsLoading] = useState<"checkin" | "checkout" | null>(null);
  const dragStopId = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const dateKey = ymd(date);
  const isToday = dateKey === ymd(new Date());
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
    addRoute(currentRep as never, dateKey, title, true, true);
    setOpenNewRoute(false);
    setNewRouteTitle("");
    toast.success(`สร้าง Route "${title}" แล้ว`);
  };

  // ── day-level route: route แรกของวันสำหรับ check-in/out ──────────────────
  const dayRoute = todayRoutes[0] ?? null;
  const hasCheckinEnabled  = (dayRoute?.has_checkin  ?? true);
  const hasCheckoutEnabled = (dayRoute?.has_checkout ?? true);

  // ── GPS helper: ตรวจรัศมีออฟฟิศ ─────────────────────────────────────────
  const verifyOfficeGPS = async (): Promise<{ lat: number; lng: number } | null> => {
    if (!officeLat || !officeLng) {
      toast.error("ยังไม่ได้ตั้งพิกัดออฟฟิศ — ให้ Admin/Manager กด 'ตั้งตำแหน่งออฟฟิศ' ก่อน");
      return null;
    }
    const pos = await getGPS();
    const dist = distanceMeters(pos.coords.latitude, pos.coords.longitude, officeLat, officeLng);
    if (dist > CHECKIN_RADIUS_M) {
      toast.error(`คุณอยู่ห่างออฟฟิศ ${Math.round(dist)} เมตร — ต้องอยู่ภายใน ${CHECKIN_RADIUS_M} เมตร`);
      return null;
    }
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  };

  // ── GPS Check-in (day-level) — auto-create route if none exists ──────────
  const handleCheckin = async () => {
    setGpsLoading("checkin");
    try {
      const coords = await verifyOfficeGPS();
      if (!coords) return;
      // ถ้าวันนี้ยังไม่มี route → สร้างอัตโนมัติ
      let routeId = dayRoute?.route_id;
      if (!routeId) {
        routeId = addRoute(currentRep as never, dateKey, `แผนงาน ${dateKey}`, true, true);
      }
      await checkinRoute(routeId, coords.lat, coords.lng);
      toast.success("✅ Check-in เรียบร้อย!");
    } catch (e: any) {
      if (e?.code === 1) toast.error("ไม่ได้รับอนุญาต GPS — กรุณาเปิด Location ในเบราว์เซอร์");
      else if (e?.code === 3) toast.error("GPS หมดเวลา — ลองใหม่อีกครั้ง");
      else toast.error("ไม่สามารถรับ GPS ได้");
    } finally {
      setGpsLoading(null);
    }
  };

  // ── GPS Check-out (day-level) ─────────────────────────────────────────────
  const handleCheckout = async () => {
    if (!dayRoute) return;
    setGpsLoading("checkout");
    try {
      const coords = await verifyOfficeGPS();
      if (!coords) return;
      await checkoutRoute(dayRoute.route_id, coords.lat, coords.lng);
      toast.success("✅ Check-out เรียบร้อย! ขอบคุณสำหรับงานวันนี้");
    } catch (e: any) {
      if (e?.code === 1) toast.error("ไม่ได้รับอนุญาต GPS — กรุณาเปิด Location ในเบราว์เซอร์");
      else if (e?.code === 3) toast.error("GPS หมดเวลา — ลองใหม่อีกครั้ง");
      else toast.error("ไม่สามารถรับ GPS ได้");
    } finally {
      setGpsLoading(null);
    }
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
        <div className="flex items-center gap-2 flex-wrap">
          {/* ── Day navigator: ◀ [date picker] ▶ [วันนี้] ── */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline" size="icon" className="h-10 w-10"
              onClick={() => setDate((d) => { const p = new Date(d); p.setDate(p.getDate() - 1); return p; })}
              title="วันก่อนหน้า"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-10 min-w-[160px]">
                  <CalendarIcon className="w-4 h-4 mr-2 shrink-0" />
                  {format(date, "EEE d MMM yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
            <Button
              variant="outline" size="icon" className="h-10 w-10"
              onClick={() => setDate((d) => { const n = new Date(d); n.setDate(n.getDate() + 1); return n; })}
              title="วันถัดไป"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            {dateKey !== ymd(new Date()) && (
              <Button variant="ghost" size="sm" className="h-10 text-xs text-muted-foreground" onClick={() => setDate(new Date())}>
                วันนี้
              </Button>
            )}
          </div>
          <Button onClick={openCreateRoute} className="bg-gradient-pink text-accent-foreground hover:opacity-90">
            <Plus className="w-4 h-4 mr-2" /> สร้าง Route
          </Button>
        </div>
      </div>

      {/* ── Office coords warning (no coords set yet) ── */}
      {!officeLat && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 px-4 py-2.5 flex items-center gap-2 text-xs text-amber-700">
          <Building2 className="w-3.5 h-3.5 shrink-0" />
          <span>⚠️ ยังไม่ได้ตั้งพิกัดออฟฟิศ — {canSetOffice ? <><a href="/web-setting" className="underline font-semibold">ไปตั้งค่าที่ Web Setting → พิกัดออฟฟิศ</a></> : "รอ Admin ตั้งพิกัดออฟฟิศก่อน"}</span>
        </div>
      )}

      {/* ── Day-level Check-in / Check-out banner (วันนี้เสมอ) ── */}
      {isToday && (
        <div className="rounded-xl border overflow-hidden shadow-sm">
          {/* header */}
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 border-b">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-500 shrink-0" />
              <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">การเข้า-ออกงานวันนี้</span>
              <span className="text-[11px] text-muted-foreground">(GPS ต้องอยู่ภายใน {CHECKIN_RADIUS_M}m จากออฟฟิศ)</span>
            </div>
          </div>

          {/* office coords warning (for non-admin / no coords set) */}
          {!officeLat && !canSetOffice && (
            <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/20 border-b flex items-center gap-2 text-xs text-amber-700">
              <span>⚠️</span>
              <span>รอ Admin/Manager ตั้งพิกัดออฟฟิศก่อน</span>
            </div>
          )}

          {/* Check-in / Check-out panels */}
          <div className="grid grid-cols-2 divide-x bg-white dark:bg-card">
            {/* ── Check-in ── */}
            {hasCheckinEnabled ? (
              <div className={cn("flex items-center gap-3 px-4 py-3", dayRoute?.checkin_at ? "bg-emerald-50/50 dark:bg-emerald-950/10" : "bg-amber-50/40 dark:bg-amber-950/10")}>
                <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0",
                  dayRoute?.checkin_at ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-500")}>
                  <LogIn className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Check-in เข้างาน</p>
                  {dayRoute?.checkin_at ? (
                    <p className="text-base font-bold text-emerald-600">
                      {new Date(dayRoute.checkin_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false })} น.
                    </p>
                  ) : (
                    <p className="text-sm text-amber-600 font-medium">ยังไม่ได้ Check-in</p>
                  )}
                </div>
                {!dayRoute?.checkin_at && (
                  <Button
                    size="sm"
                    className="h-8 px-3 bg-amber-500 hover:bg-amber-600 text-white shrink-0"
                    onClick={handleCheckin}
                    disabled={gpsLoading === "checkin" || !officeLat}
                  >
                    {gpsLoading === "checkin"
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <><LogIn className="w-3.5 h-3.5 mr-1.5" />Check-in</>
                    }
                  </Button>
                )}
                {dayRoute?.checkin_at && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 px-4 py-3 opacity-40">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <LogIn className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Check-in</p>
                  <p className="text-xs text-muted-foreground">ไม่ต้องผ่านออฟฟิศ</p>
                </div>
              </div>
            )}

            {/* ── Check-out ── */}
            {hasCheckoutEnabled ? (
              <div className={cn("flex items-center gap-3 px-4 py-3",
                dayRoute?.checkout_at ? "bg-emerald-50/50 dark:bg-emerald-950/10" :
                dayRoute?.checkin_at ? "bg-blue-50/40 dark:bg-blue-950/10" : "opacity-50")}>
                <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0",
                  dayRoute?.checkout_at ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-500")}>
                  <LogOut className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Check-out ออกงาน</p>
                  {dayRoute?.checkout_at ? (
                    <p className="text-base font-bold text-emerald-600">
                      {new Date(dayRoute.checkout_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false })} น.
                    </p>
                  ) : dayRoute?.checkin_at ? (
                    <p className="text-sm text-blue-500 font-medium">รอ Check-out</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">รอ Check-in ก่อน</p>
                  )}
                </div>
                {!dayRoute?.checkout_at && dayRoute?.checkin_at && (
                  <Button
                    size="sm"
                    className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                    onClick={handleCheckout}
                    disabled={gpsLoading === "checkout" || !officeLat}
                  >
                    {gpsLoading === "checkout"
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <><LogOut className="w-3.5 h-3.5 mr-1.5" />Check-out</>
                    }
                  </Button>
                )}
                {dayRoute?.checkout_at && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 px-4 py-3 opacity-40">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <LogOut className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Check-out</p>
                  <p className="text-xs text-muted-foreground">ไม่ต้องกลับออฟฟิศ</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
                    <Button size="icon" variant="ghost" className="shrink-0 w-7 h-7 mt-0.5" onClick={async () => {
                      if (!confirm("ลบ Route นี้?")) return;
                      await deleteRoute(r.route_id);
                      // toast ขึ้นเฉพาะเมื่อ route หายออกจาก store (deleteRoute จะ rollback ถ้า Supabase fail)
                      if (!useCRM.getState().routes.some((x) => x.route_id === r.route_id)) {
                        toast.success("ลบ Route แล้ว");
                      }
                    }}>
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
          <div className="space-y-4">
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
