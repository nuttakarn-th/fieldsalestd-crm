import { useCallback, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Link } from "react-router-dom";
import { addDays, format, startOfWeek, subWeeks, addWeeks, differenceInDays } from "date-fns";
import { th } from "date-fns/locale";
import {
  CalendarRange, CalendarDays, Download, Upload, FileSpreadsheet, FileDown,
  ChevronLeft, ChevronRight, Plus, CheckCircle2, XCircle, SkipForward,
  Clock, Phone, User, Lightbulb, Loader2, Lock, MapPin, History,
  ArrowRight, AlertCircle, CheckCheck, FileUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useCRM, SALES_REPS, type RoutePlan, type StopStatus } from "@/store/crmStore";
import { useCurrentUser } from "@/store/authStore";
import { StopDialog } from "@/components/StopDialog";
import { downloadTemplate, exportToExcel, parseExcelFile, type ExcelField } from "@/lib/excelUtils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { nowHHMM, TimeInput24 } from "@/components/TimeInput24";

// ─── Activity types ────────────────────────────────────────────────────────────
const ACTIVITY_GROUPS = [
  { group: "Sales",           items: ["Field Sale (New Prospect)", "Follow-up Visit"] },
  { group: "Operational",     items: ["Site Survey", "Partner Meeting", "On-site Training"] },
  { group: "Admin/Marketing", items: ["Office Day", "Event", "Seminar", "Government Contact"] },
  { group: "Relationship",    items: ["After Sales", "Gift Delivery", "Dinner Meeting"] },
  { group: "Support",         items: ["Coffee Shop (Remote Work)", "Transit", "Hotel"] },
  { group: "อื่นๆ",           items: ["พบลูกค้า", "นำเสนอแพ็คเกจ", "ปิดการขาย", "Follow up", "อื่นๆ"] },
];
const PURPOSES = ACTIVITY_GROUPS.flatMap((g) => g.items);

// ─── Excel import fields ───────────────────────────────────────────────────────
const PLAN_FIELDS: ExcelField[] = [
  { key: "date",         header: "วันที่ (DD-MM-YYYY)", example: "23-06-2026", required: true, type: "date" as const },
  { key: "place_name",   header: "ชื่อสถานที่ / บริษัท", example: "บมจ. พัฒนาดี",  required: true },
  { key: "address",      header: "เบอร์ติดต่อ / ที่อยู่",  example: "089-123-4567" },
  { key: "purpose",      header: "วัตถุประสงค์",           example: "Field Sale (New Prospect)" },
  { key: "planned_time", header: "เวลานัด",                 example: "10:00" },
  { key: "note",         header: "หมายเหตุ",                example: "นัดไว้กับคุณสมชาย" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function ymd(d: Date) { return format(d, "yyyy-MM-dd"); }
const DAY_LABELS_SHORT = ["จ", "อ", "พ", "พฤ", "ศ", "ส"];
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }

function StatusBadge({ status }: { status: StopStatus }) {
  const cfg: Record<StopStatus, { label: string; cls: string }> = {
    planned:     { label: "แผน",     cls: "bg-purple-50 text-purple-700 border-purple-200" },
    in_progress: { label: "กำลังไป", cls: "bg-amber-50  text-amber-700  border-amber-200"  },
    completed:   { label: "เสร็จ ✓", cls: "bg-green-50  text-green-700  border-green-200"  },
    skipped:     { label: "ข้าม",    cls: "bg-gray-100  text-gray-500   border-gray-200"   },
  };
  const c = cfg[status];
  return (
    <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border", c.cls)}>
      {c.label}
    </span>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function CalendarPlan() {
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
  const crmRaw = useCRM((s) => s);

  // ── Tab state ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"week" | "month" | "import">("week");

  // ════════════════════════════════════════════════════════════════════════
  // TAB 1 — แผนสัปดาห์
  // ════════════════════════════════════════════════════════════════════════
  const [baseMonday, setBaseMonday] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const weekDays = useMemo(() => Array.from({ length: 6 }, (_, i) => addDays(baseMonday, i)), [baseMonday]);
  const weekLabel = `${format(weekDays[0], "d MMM", { locale: th })} – ${format(weekDays[5], "d MMM yyyy", { locale: th })}`;

  const [addOpen, setAddOpen] = useState<{ dayKey: string; routeId: string | null } | null>(null);
  const [saving, setSaving] = useState(false);
  const [stopForm, setStopForm] = useState({ customer_id: "none", place_name: "", address: "", purpose: PURPOSES[0], planned_time: "09:00", note: "" });

  const weekRoutes = useMemo(() => {
    const keys = new Set(weekDays.map(ymd));
    return routes.filter((r) => r.rep === currentRep && keys.has(r.date));
  }, [routes, weekDays, currentRep]);

  const routeByDay = useMemo(() => {
    const m = new Map<string, RoutePlan>();
    weekRoutes.forEach((r) => m.set(r.date, r));
    return m;
  }, [weekRoutes]);

  const weekStats = useMemo(() => {
    let planned = 0, done = 0, skipped = 0;
    weekRoutes.forEach((r) => r.stops.forEach((s) => {
      if (s.status === "completed") done++;
      else if (s.status === "skipped") skipped++;
      else planned++;
    }));
    return { total: planned + done + skipped, planned, done, skipped };
  }, [weekRoutes]);

  const suggested = useMemo(() => {
    const today = new Date();
    const lastVisit: Record<string, Date> = {};
    routes.forEach((r) => r.stops.forEach((s) => {
      if (s.customer_id && s.status === "completed" && s.completed_at) {
        const d = new Date(s.completed_at);
        if (!lastVisit[s.customer_id] || d > lastVisit[s.customer_id]) lastVisit[s.customer_id] = d;
      }
    }));
    return customers.filter((c: any) => {
      const lv = lastVisit[c.customer_id];
      return !lv || differenceInDays(today, lv) >= 30;
    }).slice(0, 8);
  }, [customers, routes]);

  const openAdd = (dayKey: string, customerId?: string) => {
    const existingRoute = routeByDay.get(dayKey) ?? null;
    let form = { customer_id: "none", place_name: "", address: "", purpose: PURPOSES[0], planned_time: "09:00", note: "" };
    if (customerId) {
      const c = customers.find((x: any) => x.customer_id === customerId);
      if (c) { form = { ...form, customer_id: c.customer_id, place_name: (c as any).company || c.full_name, address: (c as any).tel ?? "" }; }
    }
    setStopForm(form);
    setAddOpen({ dayKey, routeId: existingRoute?.route_id ?? null });
  };

  const handleCustomerChange = (customerId: string) => {
    if (customerId === "none") { setStopForm((f) => ({ ...f, customer_id: "none", place_name: "", address: "" })); return; }
    const c = customers.find((x: any) => x.customer_id === customerId);
    setStopForm((f) => ({ ...f, customer_id: customerId, place_name: (c as any)?.company || c?.full_name || f.place_name, address: (c as any)?.tel ?? f.address }));
  };

  const submitStop = async () => {
    if (!addOpen) return;
    if (!stopForm.place_name.trim() && stopForm.purpose !== "Office Day") { toast.error("กรุณาใส่ชื่อสถานที่"); return; }
    setSaving(true);
    try {
      let routeId = addOpen.routeId;
      if (!routeId) {
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
    } finally { setSaving(false); }
  };

  // ════════════════════════════════════════════════════════════════════════
  // TAB 2 — ปฏิทิน (month view)
  // ════════════════════════════════════════════════════════════════════════
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
  const todayKey = ymd(new Date());

  const monthGrid = useMemo(() => {
    const first = startOfMonth(cursor);
    const startDay = (first.getDay() + 6) % 7;
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

  const myRoutes = useMemo(() => routes.filter((r) => r.rep === currentRep), [routes, currentRep]);

  const byDate = useMemo(() => {
    const m = new Map<string, RoutePlan[]>();
    myRoutes.forEach((r) => { const arr = m.get(r.date) ?? []; arr.push(r); m.set(r.date, arr); });
    return m;
  }, [myRoutes]);

  const openCreateRoute = (date: string) => {
    setDayOpen(null);
    setNewRouteOpen({ date });
    setNewTitle(`แผนเยี่ยมลูกค้า ${date}`);
    const defaultTime = date === todayKey ? nowHHMM() : "09:00";
    setNewPlace(""); setNewAddress(""); setNewTime(defaultTime); setNewPurpose("พบลูกค้า"); setNewNote("");
  };

  const submitNewRoute = () => {
    if (!newRouteOpen) return;
    if (!newTitle.trim()) return toast.error("กรุณาตั้งชื่อ Route");
    const id = addRoute(currentRep as never, newRouteOpen.date, newTitle.trim());
    if (newPlace.trim()) addStop(id, { place_name: newPlace.trim(), address: newAddress.trim(), purpose: newPurpose, planned_time: newTime, note: newNote });
    toast.success("สร้าง Route แล้ว");
    setNewRouteOpen(null);
  };

  // ════════════════════════════════════════════════════════════════════════
  // TAB 3 — Import / Export
  // ════════════════════════════════════════════════════════════════════════
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importRows, setImportRows] = useState<Record<string, unknown>[] | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImporting(true);
    try {
      const { rows, skipped } = await parseExcelFile(file, PLAN_FIELDS);
      setImportRows(rows);
      if (skipped > 0) toast.info(`ข้าม ${skipped} แถวที่ไม่สมบูรณ์`);
    } catch {
      toast.error("ไม่สามารถอ่านไฟล์ได้"); setImportRows(null);
    } finally { setImporting(false); }
  };

  const handleImport = useCallback(() => {
    if (!importRows || importRows.length === 0) return;
    const grouped = new Map<string, Record<string, unknown>[]>();
    importRows.forEach((row) => {
      const date = String(row.date ?? "").trim();
      if (!date) return;
      if (!grouped.has(date)) grouped.set(date, []);
      grouped.get(date)!.push(row);
    });
    let created = 0, stopsAdded = 0;
    grouped.forEach((dateRows, date) => {
      const existingRoute = routes.find((r) => r.rep === currentRep && r.date === date);
      let routeId: string;
      if (!existingRoute) {
        const dateLabel = new Date(date).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
        routeId = addRoute(currentRep as never, date, `แผนเยี่ยมลูกค้า ${dateLabel}`);
        created++;
      } else { routeId = existingRoute.route_id; }
      dateRows.forEach((row) => {
        addStop(routeId, {
          place_name:   String(row.place_name || ""),
          address:      String(row.address || ""),
          purpose:      String(row.purpose || PURPOSES[0]),
          planned_time: String(row.planned_time || "09:00"),
          note:         String(row.note || "") || undefined,
        });
        stopsAdded++;
      });
    });
    toast.success(`Import สำเร็จ — Route ใหม่ ${created} วัน · จุด ${stopsAdded} แห่ง`);
    setImportFile(null); setImportRows(null);
    if (fileRef.current) fileRef.current.value = "";
    setActiveTab("week");
  }, [importRows, routes, currentRep, addRoute, addStop]);

  // Export current week to Excel
  const exportWeekExcel = useCallback(() => {
    const exportFields: ExcelField[] = [
      { key: "date",    header: "วันที่" },
      { key: "day",     header: "วัน" },
      { key: "place",   header: "ลูกค้า / สถานที่" },
      { key: "address", header: "เบอร์ติดต่อ" },
      { key: "purpose", header: "วัตถุประสงค์" },
      { key: "time",    header: "เวลา" },
      { key: "status",  header: "สถานะ" },
      { key: "note",    header: "หมายเหตุ" },
    ];
    const DAY_TH: Record<string, string> = { Monday: "จันทร์", Tuesday: "อังคาร", Wednesday: "พุธ", Thursday: "พฤหัส", Friday: "ศุกร์", Saturday: "เสาร์" };
    const STATUS_TH: Record<string, string> = { planned: "แผน", in_progress: "กำลังไป", completed: "เสร็จ", skipped: "ข้าม" };
    const custMap: Record<string, string> = {};
    customers.forEach((c: any) => { custMap[c.customer_id] = c.company || c.full_name; });
    const data: Record<string, unknown>[] = [];
    weekDays.forEach((d) => {
      const route = routeByDay.get(ymd(d));
      route?.stops.forEach((s) => {
        data.push({
          date:    ymd(d),
          day:     DAY_TH[format(d, "EEEE")] ?? "",
          place:   s.customer_id ? (custMap[s.customer_id] || s.place_name) : s.place_name,
          address: s.address,
          purpose: s.purpose,
          time:    s.planned_time ?? "",
          status:  STATUS_TH[s.status] ?? s.status,
          note:    s.note ?? "",
        });
      });
    });
    if (data.length === 0) { toast.error("ไม่มีข้อมูลแผนในสัปดาห์นี้"); return; }
    exportToExcel(data, exportFields, "แผนสัปดาห์", `CalendarPlan_${ymd(weekDays[0])}`);
    toast.success("Export Excel สำเร็จ");
  }, [weekDays, routeByDay, customers]);

  // Guard: Sales only
  const crmCurrentRep = useCRM((s) => s.currentRep);
  if (crmCurrentRep === "All") {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-warning/40 bg-warning/10 p-6 flex items-center gap-3">
          <Lock className="w-5 h-5 text-warning-foreground" />
          <div>
            <p className="font-semibold">หน้านี้สำหรับ Sales เท่านั้น</p>
            <p className="text-sm text-muted-foreground">สลับ Role เป็น Sales เพื่อวางแผนการเยี่ยมลูกค้า</p>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full min-h-screen bg-gray-50">

      {/* ── Top bar ── */}
      <div className="bg-white border-b sticky top-0 z-20 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-primary shadow-glow">
            <CalendarRange className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-base font-semibold leading-tight text-gray-900">Calendar Plan</h1>
            <p className="text-xs text-muted-foreground">วางแผน · ดูปฏิทิน · Import/Export</p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-lg border border-gray-200 bg-gray-100 p-0.5">
          {([
            { id: "week",   label: "แผนสัปดาห์", icon: CalendarRange },
            { id: "month",  label: "ปฏิทิน",      icon: CalendarDays },
            { id: "import", label: "Import/Export", icon: FileSpreadsheet },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5",
                activeTab === id ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700",
              )}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>

        {/* Right-side controls per tab */}
        {activeTab === "week" && (
          <div className="flex items-center gap-1.5">
            <button onClick={() => setBaseMonday((d) => subWeeks(d, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 border border-gray-200">
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            </button>
            <span className="text-sm font-medium text-gray-700 min-w-[160px] text-center">{weekLabel}</span>
            <button onClick={() => setBaseMonday((d) => addWeeks(d, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 border border-gray-200">
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
            <button onClick={() => setBaseMonday(startOfWeek(new Date(), { weekStartsOn: 1 }))} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
              สัปดาห์นี้
            </button>
          </div>
        )}
        {activeTab === "month" && (
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="px-3 h-8 rounded-md border bg-card flex items-center font-semibold min-w-36 justify-center text-sm">
              {cursor.toLocaleDateString("th-TH", { month: "long", year: "numeric" })}
            </div>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" className="h-8 text-xs" onClick={() => setCursor(startOfMonth(new Date()))}>วันนี้</Button>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════
          TAB: แผนสัปดาห์
      ════════════════════════════════════════ */}
      {activeTab === "week" && (<>
        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-px bg-gray-200 border-b">
          {[
            { label: "ทั้งสัปดาห์", value: weekStats.total,   color: "#534AB7" },
            { label: "เสร็จแล้ว",   value: weekStats.done,    color: "#16A34A" },
            { label: "ยังไม่ได้ไป", value: weekStats.planned, color: "#CA8A04" },
            { label: "ข้าม",        value: weekStats.skipped, color: "#9CA3AF" },
          ].map((s) => (
            <div key={s.label} className="bg-white px-4 py-2.5 text-center">
              <p className="text-xl font-semibold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="flex-1 overflow-x-auto">
          <div className="grid min-w-[700px]" style={{ gridTemplateColumns: "repeat(6, minmax(0, 1fr))" }}>
            {weekDays.map((day, i) => {
              const dk = ymd(day);
              const route = routeByDay.get(dk);
              const isToday = dk === todayKey;
              const isSat = i === 5;
              return (
                <div key={dk} className={cn("border-r border-gray-200 min-h-[calc(100vh-230px)] flex flex-col", isSat && "bg-gray-50")}>
                  {/* Day header */}
                  <div className={cn("px-2 py-2 border-b border-gray-200 flex items-center gap-1.5 sticky top-[105px] bg-white z-10", isSat && "bg-gray-50")}>
                    <span className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0", isToday ? "text-white" : "text-gray-600")}
                      style={{ background: isToday ? "#534AB7" : "transparent" }}>
                      {format(day, "d")}
                    </span>
                    <p className="text-[11px] font-medium text-gray-500">{DAY_LABELS_SHORT[i]}</p>
                    {route && <span className="ml-auto text-[10px] text-muted-foreground">{route.stops.length} จุด</span>}
                  </div>
                  {/* Stops */}
                  <div className="flex-1 p-2 space-y-1.5 overflow-y-auto">
                    {route?.stops.map((stop) => (
                      <div key={stop.stop_id} className={cn("rounded-lg p-2 border text-[11px] group relative",
                        stop.status === "completed" ? "bg-green-50 border-green-100 opacity-75"
                          : stop.status === "skipped" ? "bg-gray-50 border-gray-200 opacity-60"
                          : "bg-white border-purple-100")}>
                        <div className="flex items-start justify-between gap-1 mb-0.5">
                          <p className={cn("font-semibold leading-tight", stop.status === "completed" && "line-through text-gray-500")}>{stop.place_name}</p>
                          <StatusBadge status={stop.status} />
                        </div>
                        <p className="text-muted-foreground truncate">{stop.purpose}</p>
                        {stop.planned_time && <p className="text-muted-foreground mt-0.5"><Clock className="w-3 h-3 inline mr-0.5" />{stop.planned_time}</p>}
                        {stop.address && <p className="text-muted-foreground truncate"><Phone className="w-3 h-3 inline mr-0.5" />{stop.address}</p>}
                        {/* Hover actions */}
                        {stop.status === "planned" && (
                          <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                            <button title="เสร็จ" onClick={() => updateStop(route.route_id, stop.stop_id, { status: "completed", completed_at: new Date().toISOString() })}
                              className="w-5 h-5 rounded flex items-center justify-center bg-green-100 text-green-700 hover:bg-green-200"><CheckCircle2 className="w-3 h-3" /></button>
                            <button title="ข้าม" onClick={() => updateStop(route.route_id, stop.stop_id, { status: "skipped" })}
                              className="w-5 h-5 rounded flex items-center justify-center bg-gray-100 text-gray-500 hover:bg-gray-200"><SkipForward className="w-3 h-3" /></button>
                            <button title="ลบ" onClick={() => deleteStop(route.route_id, stop.stop_id)}
                              className="w-5 h-5 rounded flex items-center justify-center bg-red-50 text-red-400 hover:bg-red-100"><XCircle className="w-3 h-3" /></button>
                          </div>
                        )}
                      </div>
                    ))}
                    {!isSat && (
                      <button onClick={() => openAdd(dk)}
                        className="w-full border border-dashed border-gray-300 rounded-lg py-2 text-[11px] text-gray-400 hover:border-purple-300 hover:text-purple-600 hover:bg-purple-50 transition-colors flex items-center justify-center gap-1">
                        <Plus className="w-3 h-3" /> เพิ่มจุด
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Suggested customers */}
        {suggested.length > 0 && (
          <div className="border-t bg-white px-4 py-3">
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> ลูกค้าที่ควรเยี่ยม (ไม่ได้เจอ 30+ วัน)
            </p>
            <div className="flex gap-2 flex-wrap">
              {suggested.map((c: any) => (
                <button key={c.customer_id} onClick={() => openAdd(ymd(weekDays[0]), c.customer_id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-purple-200 text-[11px] text-purple-700 bg-purple-50 hover:bg-purple-100">
                  <User className="w-3 h-3" />{c.company || c.full_name}
                </button>
              ))}
            </div>
          </div>
        )}
      </>)}

      {/* ════════════════════════════════════════
          TAB: ปฏิทิน (month view)
      ════════════════════════════════════════ */}
      {activeTab === "month" && (
        <div className="p-4 space-y-4 flex-1">
          <div className="bg-card rounded-xl border shadow-soft overflow-hidden">
            <div className="grid grid-cols-7 bg-muted/50 text-xs font-semibold text-muted-foreground">
              {["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"].map((d, i) => (
                <div key={d} className={cn("p-2 text-center", i === 6 && "bg-rose-100 text-rose-600 font-bold dark:bg-rose-900/40 dark:text-rose-400")}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {monthGrid.map((c) => {
                if (!c.date) return <div key={c.key} className="min-h-24 border-t border-r bg-muted/20" />;
                const key = ymd(c.date);
                const dayRoutes = byDate.get(key) ?? [];
                const isToday = key === todayKey;
                const isPast = key < todayKey;
                const isSunday = c.date.getDay() === 0;
                return (
                  <button key={c.key} onClick={() => setDayOpen({ date: key, routes: dayRoutes })}
                    className={cn("text-left min-h-24 border-t border-r p-1.5 flex flex-col gap-1 transition",
                      isSunday ? "bg-rose-50 dark:bg-rose-950/30" : "",
                      isToday ? "bg-primary/5" : "",
                      isPast ? "opacity-60 cursor-default hover:bg-transparent" : "hover:bg-primary/5")}>
                    <div className="flex items-center justify-between">
                      <span className={cn("text-xs font-bold",
                        isToday ? "w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center" :
                        isSunday ? "text-rose-600" : "")}>
                        {c.date.getDate()}
                      </span>
                      {dayRoutes.length > 0 && <span className="text-[10px] text-muted-foreground">{dayRoutes.reduce((a, r) => a + r.stops.length, 0)} จุด</span>}
                    </div>
                    <div className="space-y-0.5 overflow-hidden">
                      {dayRoutes.slice(0, 2).map((r) => (
                        <span key={r.route_id} className="block w-full text-left text-[11px] rounded px-1.5 py-1 bg-gradient-to-r from-primary/15 to-accent/15 truncate">
                          <span className="font-semibold">{r.stops.length} จุด</span>
                          <span className="text-muted-foreground"> · เสร็จ {r.stops.filter((s) => s.status === "completed").length}</span>
                        </span>
                      ))}
                      {dayRoutes.length > 2 && <p className="text-[10px] text-muted-foreground">+{dayRoutes.length - 2} อื่นๆ</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          TAB: Import / Export
      ════════════════════════════════════════ */}
      {activeTab === "import" && (
        <div className="p-6 flex-1 space-y-6 max-w-3xl mx-auto w-full">

          {/* Download template */}
          <div className="bg-white rounded-xl border p-5 shadow-soft space-y-3">
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5 text-purple-600" />
              <h2 className="font-semibold text-gray-900">ดาวน์โหลด Template</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              ดาวน์โหลด Template Excel สำหรับกรอกแผนการเยี่ยมลูกค้า ระบุวันที่, สถานที่, เบอร์, วัตถุประสงค์ และเวลานัด
            </p>
            <div className="bg-purple-50 rounded-lg p-3 text-xs text-purple-700 space-y-1">
              {PLAN_FIELDS.map((f) => (
                <div key={f.key} className="flex items-center gap-2">
                  <span className="font-semibold w-40 shrink-0">{f.header}{f.required ? " *" : ""}</span>
                  <span className="text-purple-500">เช่น {f.example}</span>
                </div>
              ))}
            </div>
            <Button onClick={() => downloadTemplate(PLAN_FIELDS, "แผนการเยี่ยมลูกค้า", "CalendarPlan")}
              style={{ background: "#534AB7", color: "#fff" }} className="gap-2">
              <Download className="w-4 h-4" /> ดาวน์โหลด Template (.xlsx)
            </Button>
          </div>

          {/* Upload & Import */}
          <div className="bg-white rounded-xl border p-5 shadow-soft space-y-4">
            <div className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-green-600" />
              <h2 className="font-semibold text-gray-900">Import แผนจาก Excel</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              อัพโหลดไฟล์ Excel ที่กรอกข้อมูลแล้ว ระบบจะสร้าง Route + จุดเยี่ยมให้อัตโนมัติตามวันที่
            </p>

            {/* File drop zone */}
            <label className={cn("flex flex-col items-center gap-3 border-2 border-dashed rounded-xl p-8 cursor-pointer transition",
              importFile ? "border-green-400 bg-green-50" : "border-gray-300 hover:border-purple-400 hover:bg-purple-50/40")}>
              <FileUp className={cn("w-10 h-10", importFile ? "text-green-500" : "text-gray-400")} />
              <div className="text-center">
                {importFile
                  ? <><p className="font-medium text-green-700">{importFile.name}</p><p className="text-xs text-green-600 mt-1">{importRows?.length ?? 0} แถวพร้อม Import</p></>
                  : <><p className="text-sm font-medium text-gray-600">คลิกหรือลากไฟล์ .xlsx มาวางที่นี่</p><p className="text-xs text-gray-400 mt-1">รองรับ .xlsx เท่านั้น</p></>}
              </div>
              <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={handleFileChange} />
            </label>

            {/* Preview table */}
            {importing && <div className="flex items-center justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-purple-600" /></div>}

            {importRows && importRows.length > 0 && (
              <div className="rounded-lg border overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-500 border-b flex items-center justify-between">
                  <span>ตัวอย่างข้อมูล ({Math.min(importRows.length, 5)} จาก {importRows.length} แถว)</span>
                  <span className="text-purple-600">{new Set(importRows.map((r) => String(r.date))).size} วัน</span>
                </div>
                <table className="w-full text-xs">
                  <thead><tr className="border-b bg-gray-50 text-gray-500">
                    {PLAN_FIELDS.map((f) => <th key={f.key} className="px-3 py-2 text-left font-medium">{f.header}</th>)}
                  </tr></thead>
                  <tbody>
                    {importRows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-b hover:bg-gray-50">
                        {PLAN_FIELDS.map((f) => <td key={f.key} className="px-3 py-2 text-gray-700">{String(row[f.key] ?? "")}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {importRows.length > 5 && <div className="px-3 py-2 text-xs text-muted-foreground bg-gray-50 border-t">... และอีก {importRows.length - 5} แถว</div>}
              </div>
            )}

            {importRows && importRows.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-lg px-4 py-3">
                <AlertCircle className="w-4 h-4 shrink-0" /> ไม่พบข้อมูลในไฟล์ที่อัพโหลด
              </div>
            )}

            <div className="flex gap-2">
              {importFile && (
                <Button variant="outline" onClick={() => { setImportFile(null); setImportRows(null); if (fileRef.current) fileRef.current.value = ""; }}>
                  ล้าง
                </Button>
              )}
              <Button onClick={handleImport} disabled={!importRows || importRows.length === 0}
                className="gap-2" style={{ background: "#16A34A", color: "#fff" }}>
                <CheckCheck className="w-4 h-4" /> Confirm Import ({importRows?.length ?? 0} จุด)
              </Button>
            </div>
          </div>

          {/* Export */}
          <div className="bg-white rounded-xl border p-5 shadow-soft space-y-3">
            <div className="flex items-center gap-2">
              <FileDown className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold text-gray-900">Export แผนสัปดาห์</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Export แผนสัปดาห์ปัจจุบัน (<span className="font-medium">{weekLabel}</span>) ออกเป็น Excel หรือ PDF
            </p>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={exportWeekExcel} className="gap-2">
                <FileSpreadsheet className="w-4 h-4" /> Export Excel
              </Button>
              <Button variant="outline" onClick={() => { setActiveTab("week"); }} className="gap-2 text-muted-foreground">
                <CalendarRange className="w-4 h-4" /> ไปหน้าแผนสัปดาห์
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Month tab dialogs ── */}
      <Dialog open={!!openRoute} onOpenChange={(o) => !o && setOpenRoute(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{openRoute?.title}</DialogTitle></DialogHeader>
          {openRoute && (
            <div className="space-y-2 max-h-[60vh] overflow-auto">
              {openRoute.stops.length === 0 && <p className="text-sm text-muted-foreground">ยังไม่มีจุดเยี่ยม</p>}
              {openRoute.stops.map((s) => (
                <div key={s.stop_id} className="p-3 rounded-lg border flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center shrink-0">{s.seq}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{s.place_name}</p>
                      <Badge variant="outline" className="text-[10px]">{s.purpose}</Badge>
                      {s.status === "completed" && <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">เสร็จ</Badge>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      {s.planned_time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{s.planned_time}</span>}
                      {s.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{s.address}</span>}
                    </div>
                    {s.note && <p className="text-xs text-muted-foreground mt-1 bg-muted/40 rounded px-2 py-1">{s.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenRoute(null)}>ปิด</Button>
            {openRoute && (
              <Link to={`/app/mission/${openRoute.route_id}`} onClick={() => setOpenRoute(null)}>
                <Button className="bg-gradient-primary text-primary-foreground">ไปหน้า Mission <ArrowRight className="w-4 h-4 ml-1" /></Button>
              </Link>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!dayOpen} onOpenChange={(o) => !o && setDayOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {dayOpen && dayOpen.date < todayKey && <History className="w-4 h-4 text-muted-foreground" />}
              วันที่ {dayOpen?.date}
              {dayOpen && dayOpen.date < todayKey && <Badge variant="outline" className="text-[10px] text-muted-foreground">ข้อมูลย้อนหลัง</Badge>}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[50vh] overflow-auto">
            {dayOpen && dayOpen.date < todayKey && (
              <div className="flex items-start gap-2 rounded-lg bg-muted/50 border px-3 py-2 text-xs text-muted-foreground">
                <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" /> ไม่สามารถเพิ่มหรือแก้ไขแผนในวันที่ผ่านมาได้
              </div>
            )}
            {dayOpen && dayOpen.routes.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">ยังไม่มี Route ในวันนี้</p>}
            {dayOpen?.routes.map((r) => (
              <button key={r.route_id} onClick={() => { setDayOpen(null); setOpenRoute(r); }}
                className="w-full text-left p-3 rounded-lg border hover:bg-muted/40">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{r.title}</p>
                  <Badge variant="outline">{r.stops.length} จุด · เสร็จ {r.stops.filter((s) => s.status === "completed").length}</Badge>
                </div>
              </button>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDayOpen(null)}>ปิด</Button>
            {dayOpen && dayOpen.date >= todayKey && (
              <>
                <Button variant="outline" onClick={() => dayOpen && setQuickStopDate(dayOpen.date)}>
                  <Plus className="w-4 h-4 mr-1" /> เพิ่มจุดเยี่ยม
                </Button>
                <Button onClick={() => dayOpen && openCreateRoute(dayOpen.date)} className="bg-gradient-primary text-primary-foreground">
                  <Plus className="w-4 h-4 mr-1" /> เพิ่ม Route ละเอียด
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StopDialog open={!!quickStopDate} onClose={() => setQuickStopDate(null)}
        autoCreateForDate={quickStopDate ?? undefined} rep={currentRep} title={`เพิ่มจุดเยี่ยม — ${quickStopDate ?? ""}`} />

      <Dialog open={!!newRouteOpen} onOpenChange={(o) => !o && setNewRouteOpen(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>เพิ่ม Route ใหม่ — {newRouteOpen?.date}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-sm font-medium">ชื่อ Route *</label><Input className="mt-1" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} /></div>
            <p className="text-xs text-muted-foreground">ใส่จุดเยี่ยมแรก (ไม่บังคับ)</p>
            <div><label className="text-sm font-medium">ชื่อสถานที่ / บริษัท</label><Input className="mt-1" value={newPlace} onChange={(e) => setNewPlace(e.target.value)} /></div>
            <div><label className="text-sm font-medium">ที่อยู่ / เบอร์</label><Input className="mt-1" value={newAddress} onChange={(e) => setNewAddress(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium">เวลานัด</label>
                <TimeInput24 value={newTime} onChange={setNewTime} min={newRouteOpen?.date === todayKey ? nowHHMM() : undefined} className="mt-1 w-full" />
              </div>
              <div><label className="text-sm font-medium">วัตถุประสงค์</label>
                <Input className="mt-1" value={newPurpose} onChange={(e) => setNewPurpose(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewRouteOpen(null)}>ยกเลิก</Button>
            <Button onClick={submitNewRoute} className="bg-gradient-primary text-primary-foreground"><Plus className="w-4 h-4 mr-1" /> สร้าง Route</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Week tab add-stop dialog */}
      <Dialog open={!!addOpen} onOpenChange={(o) => { if (!o) setAddOpen(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>เพิ่มจุดเยี่ยม · {addOpen && format(new Date(addOpen.dayKey), "EEEE d MMM yyyy", { locale: th })}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">ลูกค้า</label>
              <Select value={stopForm.customer_id} onValueChange={handleCustomerChange}>
                <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue placeholder="เลือกลูกค้า (ไม่บังคับ)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">– ไม่ระบุลูกค้า –</SelectItem>
                  {customers.map((c: any) => (
                    <SelectItem key={c.customer_id} value={c.customer_id}>
                      {c.company ? `${c.company} · ${c.full_name}` : c.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">ชื่อสถานที่</label>
              <Input className="mt-1 h-9 text-sm" placeholder="ชื่อบริษัท / สถานที่" value={stopForm.place_name} onChange={(e) => setStopForm((f) => ({ ...f, place_name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">เบอร์ติดต่อ</label>
                <Input className="mt-1 h-9 text-sm" placeholder="08X-XXX-XXXX" value={stopForm.address} onChange={(e) => setStopForm((f) => ({ ...f, address: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">เวลา</label>
                <Input type="time" className="mt-1 h-9 text-sm" value={stopForm.planned_time} onChange={(e) => setStopForm((f) => ({ ...f, planned_time: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">วัตถุประสงค์</label>
              <Select value={stopForm.purpose} onValueChange={(v) => setStopForm((f) => ({ ...f, purpose: v }))}>
                <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTIVITY_GROUPS.map((g) => (
                    <div key={g.group}>
                      <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase">{g.group}</div>
                      {g.items.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">หมายเหตุ</label>
              <Input className="mt-1 h-9 text-sm" placeholder="รายละเอียดเพิ่มเติม..." value={stopForm.note} onChange={(e) => setStopForm((f) => ({ ...f, note: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(null)}>ยกเลิก</Button>
            <Button onClick={submitStop} disabled={saving} style={{ background: "#534AB7", color: "#fff" }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} เพิ่มจุดเยี่ยม
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
