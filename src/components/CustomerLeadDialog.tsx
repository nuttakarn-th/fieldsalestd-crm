import { useEffect, useMemo, useState, useCallback } from "react";
import { ThaiDateInput } from "@/components/ThaiDateInput";
import { ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  useCRM, SOURCES, BU_TYPES, MONTHS, BUDGETS, TOUR_TYPES, URGENCY_OPTIONS,
  LEAD_STATUSES, OB_LEAD_STATUSES, OB_STAGE_META,
  type Source, type SalesRep, type BUType, type Urgency, type LeadStatus,
} from "@/store/crmStore";
import { useActiveSalesNames, useAuth } from "@/store/authStore";
import { useServices } from "@/store/serviceStore";

// ── WonCelebration ────────────────────────────────────────────────────────────
interface WonData {
  program: string;
  pax: number;
  price: number;
  periodLabel: string;
  customerName: string;
}

const CONFETTI_COLORS = ["#f59e0b","#10b981","#6366f1","#ec4899","#3b82f6","#f97316","#a855f7"];

function WonCelebration({ data, onClose }: { data: WonData; onClose: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 30); return () => clearTimeout(t); }, []);
  const handleClose = useCallback(() => { setVisible(false); setTimeout(onClose, 300); }, [onClose]);

  const confettiPieces = useMemo(() => Array.from({ length: 40 }, (_, i) => ({
    id: i,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 0.8}s`,
    dur: `${0.9 + Math.random() * 0.7}s`,
    size: `${6 + Math.random() * 8}px`,
    rotate: `${Math.random() * 720}deg`,
  })), []);

  const priceDisplay = data.price > 0
    ? data.price.toLocaleString("th-TH") + " บาท"
    : "—";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)" }}
      onClick={handleClose}
    >
      {/* Confetti */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <style>{`
          @keyframes confetti-fall {
            0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
            100% { transform: translateY(110vh) rotate(var(--r)); opacity: 0; }
          }
          @keyframes pop-in {
            0%   { opacity: 0; transform: scale(0.7) translateY(20px); }
            60%  { transform: scale(1.05) translateY(-4px); }
            100% { opacity: 1; transform: scale(1) translateY(0); }
          }
          @keyframes bounce-num {
            0%,100% { transform: scale(1); }
            50%      { transform: scale(1.08); }
          }
        `}</style>
        {confettiPieces.map((p) => (
          <div
            key={p.id}
            style={{
              position: "absolute",
              left: p.left,
              top: "-10px",
              width: p.size,
              height: p.size,
              background: p.color,
              borderRadius: "2px",
              animation: `confetti-fall ${p.dur} ${p.delay} ease-in forwards`,
              "--r": p.rotate,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          animation: visible ? "pop-in 0.45s cubic-bezier(.34,1.56,.64,1) forwards" : "none",
          opacity: 0,
        }}
        className="relative mx-4 w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
      >
        {/* gradient header */}
        <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 px-6 pt-8 pb-6 text-white text-center">
          <div className="text-5xl mb-2" style={{ animation: "bounce-num 1.2s ease-in-out infinite" }}>🎉</div>
          <p className="text-lg font-bold tracking-wide">ปิดดีลสำเร็จ!</p>
          <p className="text-sm opacity-80 mt-0.5">{data.customerName}</p>
        </div>

        {/* body */}
        <div className="bg-white dark:bg-zinc-900 px-6 py-5 space-y-4">
          {/* program */}
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl px-4 py-3 text-center">
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-widest mb-0.5">โปรแกรม</p>
            <p className="font-bold text-sm text-gray-800 dark:text-gray-100 leading-snug">{data.program || "—"}</p>
            {data.periodLabel && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{data.periodLabel}</p>
            )}
          </div>

          {/* big numbers row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 text-center">
              <p className="text-xs text-amber-600 font-semibold uppercase tracking-widest">มูลค่า</p>
              <p
                className="text-2xl font-extrabold text-amber-500 leading-tight mt-0.5"
                style={{ animation: "bounce-num 1.4s 0.2s ease-in-out infinite" }}
              >
                {priceDisplay}
              </p>
            </div>
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-3 text-center">
              <p className="text-xs text-indigo-500 font-semibold uppercase tracking-widest">จำนวน</p>
              <p
                className="text-2xl font-extrabold text-indigo-500 leading-tight mt-0.5"
                style={{ animation: "bounce-num 1.4s 0.4s ease-in-out infinite" }}
              >
                {data.pax} <span className="text-base font-semibold">ท่าน</span>
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-sm shadow hover:opacity-90 transition-opacity active:scale-95"
          >
            เยี่ยมมาก! ✨
          </button>
        </div>
      </div>
    </div>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────────
const TH_MONTHS = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
const TH_DAYS_SHORT   = ["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัสบดี","ศุกร์","เสาร์"];
const TH_MONTHS_SHORT = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];

const ALL_MONTHS_KEY = "__all__"; // sentinel = ทุกเดือน (ไม่กรอง)

function matchesMonth(start_date: string | undefined, travelMonth: string): boolean {
  if (travelMonth === ALL_MONTHS_KEY) return true; // ทุกเดือน → แสดงทั้งหมด
  if (!start_date) return true;
  const mIdx = TH_MONTHS.indexOf(travelMonth);
  if (mIdx < 0) return true;
  const m = parseInt((start_date.split("-")[1]) ?? "0", 10);
  return m === mIdx + 1;
}
function monthFromISO(start_date?: string): string {
  if (!start_date) return ALL_MONTHS_KEY;
  const m = parseInt((start_date.split("-")[1]) ?? "1", 10) - 1;
  return TH_MONTHS[m] ?? ALL_MONTHS_KEY;
}
/** "2026-08-09" → "ศ. 9 ส.ค. 69" */
function fmtThaiDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  const yy = String(d.getFullYear() + 543).slice(-2);
  return `(${TH_DAYS_SHORT[d.getDay()]}) ${d.getDate()} ${TH_MONTHS_SHORT[d.getMonth()]} ${yy}`;
}
/** 🟢 plenty · 🟡 ≤20% หรือ ≤3 ที่ · 🔴 FULL */
function seatEmoji(quota: number, total: number): string {
  if (quota === 0) return "🔴";
  if (quota <= 3 || quota / total <= 0.2) return "🟡";
  return "🟢";
}

// ─────────────────────────────────────────────────────────────────────────────

export function CustomerLeadDialog({
  open,
  onOpenChange,
  prefilledCustomerId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  prefilledCustomerId?: string;
}) {
  const currentUserFullName = useAuth(
    (s) => s.users.find((u) => u.user_id === s.currentUserId)?.full_name ?? null
  );
  const isOB = useAuth(
    (s) => s.users.find((u) => u.user_id === s.currentUserId)?.role === "OB Co-ordinator"
  );
  const customers  = useCRM((s) => s.customers);
  const currentRep = useCRM((s) => s.currentRep);
  const addCustomer    = useCRM((s) => s.addCustomer);
  const updateCustomer = useCRM((s) => s.updateCustomer);
  const addLead        = useCRM((s) => s.addLead);
  const tours   = useServices((s) => s.tours);
  const cars    = useServices((s) => s.cars);
  const flights = useServices((s) => s.flights);

  // ── Won celebration popup ────────────────────────────────────────────────────
  const [wonData, setWonData] = useState<WonData | null>(null);

  // UI state
  const [mode, setMode]                   = useState<"new" | "existing">("new");
  const [existingId, setExistingId]       = useState("");
  const [showEnrichment, setShowEnrichment] = useState(false);

  // ── Zone 1: Intent ──────────────────────────────────────────────────────────
  const [source, setSource]               = useState<Source>("Line OA");
  const SALES_REPS = useActiveSalesNames() as SalesRep[];
  const [owner, setOwner]                 = useState<SalesRep>((SALES_REPS[0] ?? "") as SalesRep);
  const [buType, setBuType]               = useState<BUType>("ทัวร์ต่างประเทศ");
  const [intProgram, setIntProgram]       = useState("__custom__");
  const [tourId, setTourId]               = useState<string | undefined>(undefined);
  const [periodId, setPeriodId]           = useState<string | undefined>(undefined);
  const [carServiceId, setCarServiceId]   = useState("__custom__");
  const [flightServiceId, setFlightServiceId] = useState("__custom__");
  const [intNote, setIntNote]             = useState("");
  const [domProvince, setDomProvince]     = useState("");
  const [carDetail, setCarDetail]         = useState("");
  const [flightDetail, setFlightDetail]   = useState("");
  const [travelMonth, setTravelMonth]     = useState(ALL_MONTHS_KEY);
  const [pax, setPax]                     = useState("2");
  const [urgency, setUrgency]             = useState<Urgency>("Warm");

  // ── Zone 2: Contact ─────────────────────────────────────────────────────────
  const [fullName, setFullName]           = useState("");
  const [phone, setPhone]                 = useState("");
  const [lineId, setLineId]               = useState("");
  const [email, setEmail]                 = useState("");

  // ── Zone 3: Enrichment ──────────────────────────────────────────────────────
  const [budget, setBudget]               = useState(BUDGETS[0] ?? "<30k");
  const [tourType, setTourType]           = useState(TOUR_TYPES[0] ?? "ครอบครัว");
  const [province, setProvince]           = useState("");
  const [company, setCompany]             = useState("");
  const [birthday, setBirthday]           = useState("");
  const [nextFollowUp, setNextFollowUp]   = useState(new Date().toISOString().split("T")[0]);
  const [meetingNote, setMeetingNote]     = useState("");

  // ── Smart Status ─────────────────────────────────────────────────────────────
  const smartStatus = useMemo<LeadStatus>(() => {
    if (isOB) return "ตอบแล้ว";
    if (phone.trim() || lineId.trim()) return "ติดต่อแล้ว";
    return "New";
  }, [isOB, phone, lineId]);
  const [statusOverride, setStatusOverride] = useState<LeadStatus | "__auto__">("__auto__");
  const finalStatus: LeadStatus = statusOverride === "__auto__" ? smartStatus : statusOverride;
  const isInquiry = !isOB && !phone.trim() && !lineId.trim();
  const activeStatuses = isOB ? OB_LEAD_STATUSES : LEAD_STATUSES;

  // ── Effects ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!owner && SALES_REPS[0]) setOwner(SALES_REPS[0]);
  }, [owner, SALES_REPS]);

  useEffect(() => {
    if (open) {
      const me = currentUserFullName ?? (currentRep !== "All" ? currentRep : "");
      if (me) setOwner(me as SalesRep);
    }
  }, [open, currentRep, currentUserFullName]);

  useEffect(() => {
    if (open && prefilledCustomerId) {
      setMode("existing");
      setExistingId(prefilledCustomerId);
    }
  }, [open, prefilledCustomerId]);

  useEffect(() => {
    if (mode === "existing" && existingId) {
      const c = customers.find((x) => x.customer_id === existingId);
      if (c) {
        setFullName(c.full_name);
        setCompany(c.company === "-" ? "" : c.company);
        setPhone(c.phone === "-" ? "" : c.phone);
        setLineId(c.line_id);
        setEmail(c.email ?? "");
        setProvince(c.province ?? "");
        setBirthday(c.birthday ?? "");
        setMeetingNote(c.note ?? "");
        setSource(c.source);
      }
    }
  }, [existingId, mode, customers]);

  // ── กรองทัวร์ให้เหลือเฉพาะที่มี period ในเดือนที่เลือก ────────────────────
  const toursInMonth = useMemo(() => {
    if (travelMonth === ALL_MONTHS_KEY) return tours;
    return tours.filter((t) =>
      (t.periods ?? []).some((p) => matchesMonth(p.start_date, travelMonth))
    );
  }, [tours, travelMonth]);

  // Clear tourId + periodId ถ้าเปลี่ยนเดือนแล้วโปรแกรมที่เลือกไม่มี period ในเดือนใหม่
  useEffect(() => {
    if (!tourId || travelMonth === ALL_MONTHS_KEY) return;
    const t = tours.find((x) => x.id === tourId);
    const still = (t?.periods ?? []).some((p) => matchesMonth(p.start_date, travelMonth));
    if (!still) { setTourId(undefined); setIntProgram("__custom__"); setPeriodId(undefined); }
  }, [travelMonth, tourId, tours]);

  // ── Reset ────────────────────────────────────────────────────────────────────
  const reset = () => {
    setMode("new"); setExistingId(""); setShowEnrichment(false);
    setSource("Line OA"); setBuType("ทัวร์ต่างประเทศ");
    setIntProgram("__custom__"); setTourId(undefined); setPeriodId(undefined);
    setCarServiceId("__custom__"); setFlightServiceId("__custom__");
    setIntNote(""); setDomProvince(""); setCarDetail(""); setFlightDetail("");
    setTravelMonth(ALL_MONTHS_KEY); setPax("2"); setUrgency("Warm");
    setFullName(""); setPhone(""); setLineId(""); setEmail("");
    setBudget(BUDGETS[0] ?? "<30k"); setTourType(TOUR_TYPES[0] ?? "ครอบครัว");
    setProvince(""); setCompany(""); setBirthday("");
    setNextFollowUp(new Date().toISOString().split("T")[0]);
    setMeetingNote(""); setStatusOverride("__auto__");
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const submit = () => {
    if (!fullName.trim()) { toast.error("กรุณากรอกชื่อลูกค้า"); return; }

    let cid = existingId;
    const customerPatch = {
      full_name: fullName,
      company: company || "-",
      phone: phone || "-",
      line_id: lineId,
      email: email || undefined,
      province: province || undefined,
      birthday: birthday || undefined,
      note: meetingNote || undefined,
      source,
    };
    if (mode === "new") {
      cid = addCustomer({ ...customerPatch, segment: "B2C Individual", created_by: owner, interests: [buType] });
    } else if (existingId) {
      updateCustomer(existingId, customerPatch);
      // Auto-merge bu_type into customer interests
      const existingCust = customers.find((c) => c.customer_id === existingId);
      const existingInterests = existingCust?.interests ?? [];
      if (!existingInterests.includes(buType)) {
        updateCustomer(existingId, { interests: [...existingInterests, buType] });
      }
    } else {
      toast.error("กรุณาเลือกลูกค้าเดิม"); return;
    }

    let program = "";
    if (buType === "ทัวร์ต่างประเทศ")
      program = intProgram === "__custom__" ? intNote : intProgram;
    else if (buType === "ทัวร์ภายในประเทศ")
      program = intProgram === "__custom__" ? `ทัวร์ในประเทศ: จ.${domProvince}` : intProgram;
    else if (buType === "เช่ารถ ท่องเที่ยว")
      program = carServiceId === "__custom__"
        ? `เช่ารถ: ${carDetail}`
        : (() => { const c = cars.find((x) => x.id === carServiceId); return c ? `เช่ารถ: ${c.name} ${c.type}` : carDetail; })();
    else
      program = flightServiceId === "__custom__"
        ? `จองตั๋ว: ${flightDetail}`
        : (() => { const f = flights.find((x) => x.id === flightServiceId); return f ? `จองตั๋ว: ${f.airline} ${f.route}` : flightDetail; })();

    // ── คำนวณราคาจาก Period ที่เลือก ─────────────────────────────────────────
    const paxNum = parseInt(pax) || 1;
    const selectedTour = tours.find((t) => t.id === tourId);
    const selectedPeriod = selectedTour?.periods?.find((p) => p.period_id === periodId);
    const pricePerSeat = selectedPeriod?.price_per_seat ?? 0;
    const calcPrice = pricePerSeat > 0 ? pricePerSeat * paxNum : 0;

    addLead({
      customer_id: cid,
      assigned_to: owner,
      bu_type: buType,
      lead_category: "ลูกค้าทั่วไป",
      scope: buType === "ทัวร์ภายในประเทศ" ? "Domestic" : "International",
      program,
      tour_id: tourId,
      period_id: periodId,
      pax_count: paxNum,
      travel_month: travelMonth === ALL_MONTHS_KEY ? "" : travelMonth,
      tour_type: tourType,
      budget_range: budget,
      urgency,
      next_followup_date: finalStatus === "จองแล้ว" ? undefined : nextFollowUp,
      quoted_price: calcPrice,
      closed_price: finalStatus === "จองแล้ว" ? calcPrice : undefined,
      status: finalStatus,
    });

    toast.success(isInquiry ? "บันทึก Quick Inquiry แล้ว (⚠️ ยังไม่มีข้อมูลติดต่อ)" : "สร้าง Lead สำเร็จ");

    // ── Won celebration popup ─────────────────────────────────────────────────
    if (finalStatus === "จองแล้ว") {
      let periodLabel = "";
      if (selectedPeriod?.start_date) {
        const s = new Date(selectedPeriod.start_date + "T00:00:00");
        const sStr = `${s.getDate()} ${TH_MONTHS_SHORT[s.getMonth()]} ${String(s.getFullYear() + 543).slice(-2)}`;
        if (selectedPeriod.end_date) {
          const e = new Date(selectedPeriod.end_date + "T00:00:00");
          const eStr = `${e.getDate()} ${TH_MONTHS_SHORT[e.getMonth()]} ${String(e.getFullYear() + 543).slice(-2)}`;
          periodLabel = `${sStr} – ${eStr}`;
        } else {
          periodLabel = sStr;
        }
      }
      setWonData({
        program,
        pax: paxNum,
        price: calcPrice,
        periodLabel,
        customerName: fullName,
      });
      reset();
      onOpenChange(false);
      return;
    }

    reset();
    onOpenChange(false);
  };

  // ── Period selector (reusable) ───────────────────────────────────────────────
  const PeriodSelector = () => {
    const allPeriods = tours.find((x) => x.id === tourId)?.periods ?? [];
    if (allPeriods.length === 0) return null;
    const filtered = allPeriods.filter((p) => matchesMonth(p.start_date, travelMonth));
    const sel = allPeriods.find((p) => p.period_id === periodId && periodId !== "__none__");
    return (
      <div>
        <Label className="text-xs">
          เลือกวันเดินทาง (Period)
          {filtered.length > 0
            ? <span className="ml-1 text-muted-foreground">— {filtered.length} Period ใน{travelMonth === ALL_MONTHS_KEY ? "ทุกเดือน" : travelMonth}</span>
            : <span className="ml-1 text-warning-foreground">— ไม่มี Period ในเดือน{travelMonth}</span>}
        </Label>
        {filtered.length > 0 ? (
          <Select value={periodId ?? "__none__"} onValueChange={(v) => {
            if (v !== "__none__") {
              const p = allPeriods.find((x) => x.period_id === v);
              if (p?.start_date) setTravelMonth(monthFromISO(p.start_date));
            }
            setPeriodId(v === "__none__" ? undefined : v);
          }}>
            <SelectTrigger>
              {sel ? (
                <span className="text-sm truncate">
                  {seatEmoji(sel.quota, sel.total_seats)}{" "}
                  {fmtThaiDate(sel.start_date)}
                  {sel.end_date ? ` → ${fmtThaiDate(sel.end_date)}` : ""}
                  {" · "}{sel.price_per_seat.toLocaleString()}฿/คน
                </span>
              ) : (
                <SelectValue placeholder="เลือกวันเดินทาง..." />
              )}
            </SelectTrigger>
            <SelectContent className="max-h-60">
              <SelectItem value="__none__">— ยังไม่ระบุ —</SelectItem>
              {filtered.map((p) => (
                <SelectItem key={p.period_id} value={p.period_id} disabled={p.quota === 0}>
                  <div className="flex flex-col gap-0.5 py-0.5">
                    <div className="flex items-center gap-1.5">
                      <span>{seatEmoji(p.quota, p.total_seats)}</span>
                      <span className="font-medium">
                        {fmtThaiDate(p.start_date)}
                        {p.end_date ? ` → ${fmtThaiDate(p.end_date)}` : ""}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {p.price_per_seat.toLocaleString()}฿/คน · ว่าง {p.quota}/{p.total_seats}
                      {p.quota === 0 ? " · FULL" : p.quota <= 3 ? " · ⚠️ เหลือน้อย" : ""}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="text-[11px] text-muted-foreground bg-muted/40 rounded px-2 py-1.5">
            💡 เปลี่ยนเดือนเดินทางด้านบน หรือเลือก "— ยังไม่ระบุ —" หากยังไม่แน่ใจ
          </p>
        )}
      </div>
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            เพิ่มลูกค้า / สร้าง Lead ใหม่
            {isInquiry ? (
              <Badge variant="outline" className="text-warning-foreground border-warning/50 bg-warning/10 text-[11px] font-normal">
                <AlertTriangle className="w-3 h-3 mr-1" />Quick Inquiry
              </Badge>
            ) : (
              <Badge variant="outline" className="text-success border-success/50 bg-success/10 text-[11px] font-normal">
                ✅ Full Lead
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* ลูกค้าใหม่ / เดิม */}
        <Tabs value={mode} onValueChange={(v) => setMode(v as "new" | "existing")}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="new">🆕 ลูกค้าใหม่</TabsTrigger>
            <TabsTrigger value="existing">🔎 ลูกค้าเดิม</TabsTrigger>
          </TabsList>
          <TabsContent value="existing" className="mt-3">
            <Label>เลือกลูกค้าเดิม</Label>
            <Select value={existingId} onValueChange={setExistingId}>
              <SelectTrigger><SelectValue placeholder="ค้นหาจากรายชื่อ..." /></SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.customer_id} value={c.customer_id}>
                    {c.full_name} • {c.phone} {c.company !== "-" ? `• ${c.company}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TabsContent>
          <TabsContent value="new" />
        </Tabs>

        {/* ══ Zone 1: ความต้องการ (Intent) ══════════════════════════════════════ */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-muted-foreground border-b pb-1">📋 ความต้องการ</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>ช่องทางที่มา</Label>
              <Select value={source} onValueChange={(v) => setSource(v as Source)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sales Owner</Label>
              <Select value={owner} onValueChange={(v) => setOwner(v as SalesRep)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SALES_REPS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>ประเภทบริการ</Label>
            <Select value={buType} onValueChange={(v) => {
              setBuType(v as BUType);
              setIntProgram("__custom__"); setTourId(undefined); setPeriodId(undefined);
            }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{BU_TYPES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {/* เดือน + Pax — ก่อนเลือกโปรแกรม */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>เดือนเดินทาง</Label>
              <Select value={travelMonth} onValueChange={setTravelMonth}>
                <SelectTrigger><SelectValue placeholder="เลือกเดือน..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_MONTHS_KEY}>📅 ทุกเดือน (ดู Period ทั้งหมด)</SelectItem>
                  {MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>จำนวน Pax</Label>
              <Input type="number" min="1" value={pax} onChange={(e) => setPax(e.target.value)} />
            </div>
          </div>

          {/* Tour selectors */}
          {(buType === "ทัวร์ต่างประเทศ" || buType === "ทัวร์ภายในประเทศ") && (
            <>
              <div>
                <Label>
                  โปรแกรมทัวร์{" "}
                  {travelMonth !== ALL_MONTHS_KEY ? (
                    <span className="ml-1 text-[10px] text-muted-foreground">
                      — {toursInMonth.length} โปรแกรมที่มี Period ใน{travelMonth}
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">(เลือกจาก All Service หรือระบุเอง)</span>
                  )}
                </Label>
                <Select value={intProgram} onValueChange={(v) => {
                  setIntProgram(v); setPeriodId(undefined);
                  if (v !== "__custom__") {
                    const cat = buType === "ทัวร์ต่างประเทศ"
                      ? (["International Tour", "Incentive"] as const)
                      : (["Domestic"] as const);
                    const t = toursInMonth.find((x) =>
                      (cat as readonly string[]).includes(x.category) &&
                      `${x.code} - ${x.city} ${x.duration}` === v
                    );
                    setTourId(t?.id);
                  } else { setTourId(undefined); }
                }}>
                  <SelectTrigger><SelectValue placeholder="เลือกโปรแกรม..." /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {buType === "ทัวร์ต่างประเทศ" && (["International Tour", "Incentive"] as const).map((cat) => {
                      const items = toursInMonth.filter((t) => t.category === cat);
                      if (items.length === 0) return null;
                      return (
                        <div key={cat}>
                          <div className="px-2 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{cat}</div>
                          {items.map((t) => (
                            <SelectItem key={t.id} value={`${t.code} - ${t.city} ${t.duration}`}>
                              {t.code} · {t.city} ({t.duration})
                            </SelectItem>
                          ))}
                        </div>
                      );
                    })}
                    {buType === "ทัวร์ภายในประเทศ" && toursInMonth.filter((t) => t.category === "Domestic").map((t) => (
                      <SelectItem key={t.id} value={`${t.code} - ${t.city} ${t.duration}`}>
                        {t.code} · {t.city} ({t.duration})
                      </SelectItem>
                    ))}
                    <div className="px-2 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">อื่นๆ</div>
                    <SelectItem value="__custom__">📝 ระบุเอง...</SelectItem>
                  </SelectContent>
                </Select>
                {intProgram === "__custom__" && buType === "ทัวร์ต่างประเทศ" && (
                  <Textarea className="mt-2" placeholder="ระบุโปรแกรมที่ต้องการ..." value={intNote} onChange={(e) => setIntNote(e.target.value)} />
                )}
                {intProgram === "__custom__" && buType === "ทัวร์ภายในประเทศ" && (
                  <Input className="mt-2" value={domProvince} onChange={(e) => setDomProvince(e.target.value)} placeholder="เช่น เชียงใหม่ 3 วัน 2 คืน" />
                )}
              </div>
            </>
          )}
          {buType === "เช่ารถ ท่องเที่ยว" && (
            <div>
              <Label>รถเช่า</Label>
              <Select value={carServiceId} onValueChange={setCarServiceId}>
                <SelectTrigger><SelectValue placeholder="เลือกรถ..." /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {cars.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name} · {c.type} · {c.total_seats} ที่นั่ง · {c.rate_per_day.toLocaleString()}฿/วัน</SelectItem>
                  ))}
                  <SelectItem value="__custom__">📝 ระบุเอง...</SelectItem>
                </SelectContent>
              </Select>
              {carServiceId === "__custom__" && (
                <Textarea className="mt-2" placeholder="รายละเอียดรถเช่า..." value={carDetail} onChange={(e) => setCarDetail(e.target.value)} />
              )}
            </div>
          )}
          {buType === "จองตั๋วเครื่องบิน" && (
            <div>
              <Label>เที่ยวบิน</Label>
              <Select value={flightServiceId} onValueChange={setFlightServiceId}>
                <SelectTrigger><SelectValue placeholder="เลือกเที่ยวบิน..." /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {flights.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.airline} · {f.route}</SelectItem>
                  ))}
                  <SelectItem value="__custom__">📝 ระบุเอง...</SelectItem>
                </SelectContent>
              </Select>
              {flightServiceId === "__custom__" && (
                <Textarea className="mt-2" placeholder="รายละเอียดเที่ยวบิน..." value={flightDetail} onChange={(e) => setFlightDetail(e.target.value)} />
              )}
            </div>
          )}

          {/* Period (filtered by month selected above) */}
          {tourId && <PeriodSelector />}

          <div>
            <Label>ความเร่งด่วน</Label>
            <Select value={urgency} onValueChange={(v) => setUrgency(v as Urgency)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{URGENCY_OPTIONS.map((u) => <SelectItem key={u.val} value={u.val}>{u.emoji} {u.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        {/* ══ Zone 2: ข้อมูลติดต่อ (Contact) ═══════════════════════════════════ */}
        <div className="border-t pt-3 space-y-3">
          <p className="text-sm font-semibold text-muted-foreground border-b pb-1">
            👤 ข้อมูลติดต่อ
            {isInquiry && (
              <span className="ml-2 text-[10px] font-normal text-warning-foreground">
                ⚠️ กรอกเบอร์หรือ LINE เพื่อ Upgrade เป็น Full Lead
              </span>
            )}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>ชื่อลูกค้า *</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="ชื่อจริง / Nickname / ชื่อ LINE" />
            </div>
            <div>
              <Label>
                เบอร์โทร{" "}
                <span className="text-[10px] text-muted-foreground">(ไม่บังคับ)</span>
              </Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label>Line ID</Label>
              <Input value={lineId} onChange={(e) => setLineId(e.target.value)} />
            </div>
            <div>
              <Label>อีเมล</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@email.com" />
            </div>
          </div>
        </div>

        {/* ══ Zone 3: รายละเอียดเพิ่มเติม (Enrichment, collapsible) ════════════ */}
        <div className="border-t pt-3">
          <button
            type="button"
            onClick={() => setShowEnrichment((v) => !v)}
            className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors w-full pb-2"
          >
            {showEnrichment ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            📊 รายละเอียดเพิ่มเติม
            {!showEnrichment && <span className="text-[10px] font-normal">(คลิกเพื่อขยาย)</span>}
          </button>

          {showEnrichment && (
            <div className="space-y-3 mt-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>งบประมาณ/ท่าน</Label>
                  <Select value={budget} onValueChange={setBudget}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{BUDGETS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>ประเภททัวร์</Label>
                  <Select value={tourType} onValueChange={setTourType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TOUR_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>จังหวัด <span className="text-[10px] text-muted-foreground">(Geo)</span></Label>
                  <Input value={province} onChange={(e) => setProvince(e.target.value)} placeholder="เช่น กรุงเทพฯ, เชียงใหม่" />
                </div>
                <div>
                  <Label>บริษัท / องค์กร</Label>
                  <Input value={company} onChange={(e) => setCompany(e.target.value)} />
                </div>
                <div className="col-span-2">
                  <Label>วันเกิด <span className="text-[10px] text-muted-foreground">(🎂 สำหรับ Birthday Campaign)</span></Label>
                  <ThaiDateInput value={birthday} onChange={(e) => setBirthday(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>นัด Follow Up</Label>
                <ThaiDateInput value={nextFollowUp} onChange={(e) => setNextFollowUp(e.target.value)} />
              </div>
              <div>
                <Label>หมายเหตุ / บันทึก</Label>
                <Textarea
                  value={meetingNote}
                  onChange={(e) => setMeetingNote(e.target.value)}
                  placeholder="เช่น ชอบทัวร์ญี่ปุ่น ไม่เอาจีน / งบ 40k ต่อท่าน / ติดต่อได้หลัง 18.00 น."
                  className="min-h-[60px]"
                />
              </div>
            </div>
          )}
        </div>

        {/* ══ Smart Status ═══════════════════════════════════════════════════════ */}
        <div className="border-t pt-3 bg-muted/20 rounded-lg px-3 pb-3 space-y-2">
          <p className="text-xs text-muted-foreground">
            📍 Lead จะเข้า Pipeline ที่:{" "}
            <span className="font-semibold text-foreground">{finalStatus}</span>
            {statusOverride === "__auto__" && (
              <span className="ml-1 text-[10px]">
                {isOB
                  ? "(OB — อัตโนมัติ)"
                  : isInquiry
                  ? "(ไม่มีข้อมูลติดต่อ)"
                  : phone.trim()
                  ? "(มีเบอร์โทร)"
                  : "(มี LINE)"}
              </span>
            )}
          </p>
          <div className="flex items-center gap-2">
            <Label className="text-xs shrink-0 text-muted-foreground">เปลี่ยนได้:</Label>
            <Select value={statusOverride} onValueChange={(v) => setStatusOverride(v as LeadStatus | "__auto__")}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__auto__">🤖 อัตโนมัติ ({smartStatus})</SelectItem>
                {activeStatuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {OB_STAGE_META[s] ? `${OB_STAGE_META[s].emoji} ${s}` : s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
          <Button onClick={submit} className="bg-gradient-primary">
            {isInquiry ? "💾 บันทึก Quick Inquiry" : "✅ บันทึก & สร้าง Lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* 🎉 Won Celebration Popup */}
    {wonData && (
      <WonCelebration
        data={wonData}
        onClose={() => setWonData(null)}
      />
    )}
    </>
  );
}
