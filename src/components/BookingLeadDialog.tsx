/**
 * BookingLeadDialog.tsx
 *
 * Popup ที่เด้งขึ้นหลังจากบันทึกการจองที่นั่งจากหน้า Stock
 * Step 1 — เลือก: บันทึกลูกค้าเลย / ไว้ภายหลัง
 * Step 2 — ฟอร์มเก็บข้อมูลลูกค้า (ชื่อ, เบอร์, LINE, source)
 *           → addCustomer + addLead (status=จองแล้ว, tour_id/period_id pre-filled)
 */

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useCRM, type Source, type Segment, type Customer } from "@/store/crmStore";
import { useBookingLedger } from "@/store/bookingLedgerStore";

// ── Props ─────────────────────────────────────────────────────────────────────

export interface BookingLeadDialogProps {
  open: boolean;
  onClose: () => void;
  onCancel?: () => void;       // ปิด dialog โดยไม่บันทึกอะไร
  onConfirmQuota?: () => void; // ตัด quota จริง (เรียกตอนกด บันทึกเลย / ไว้ภายหลัง)
  tourId: string;
  tourName: string;
  periodId: string;
  periodLabel: string; // start_date string e.g. "2026-10-08"
  seats: number;
  pricePerSeat?: number; // ราคา/ที่นั่ง สำหรับ booking ledger
  actorName: string;
}

// ── Source chips ──────────────────────────────────────────────────────────────

const SOURCES: Source[] = ["Walk-in", "Field Sale", "FB", "Line OA", "Referral", "TikTok", "Agent"];
const ROOM_TYPES = ["TWN", "SGL", "DBL", "TRP"] as const;
const FOOD_PRESETS = ["ปกติ", "มังสวิรัติ", "ฮาลาล"] as const;

// ── Helper ────────────────────────────────────────────────────────────────────

function formatPeriodLabel(label: string): string {
  if (!label) return "ไม่ระบุ period";
  try {
    return new Date(label).toLocaleDateString("th-TH", {
      day: "numeric", month: "short", year: "2-digit",
    });
  } catch {
    return label;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BookingLeadDialog({
  open, onClose, onCancel, onConfirmQuota,
  tourId, tourName, periodId, periodLabel, seats, pricePerSeat = 0, actorName,
}: BookingLeadDialogProps) {
  const addCustomer  = useCRM((s) => s.addCustomer);
  const addLead      = useCRM((s) => s.addLead);
  const addBooking   = useBookingLedger((s) => s.addBooking);
  const customers    = useCRM((s) => s.customers);

  const [step, setStep] = useState<"choice" | "form">("choice");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [activeSugg, setActiveSugg] = useState<"name" | "phone" | null>(null);

  // Form state — basic
  const [fullName, setFullName] = useState("");
  const [phone,    setPhone]    = useState("");
  const [lineId,   setLineId]   = useState("");
  const [source,   setSource]   = useState<Source>("Walk-in");
  const [note,     setNote]     = useState("");
  const [saving,   setSaving]   = useState(false);
  // Form state — trip manifest (optional)
  const [showExtra,       setShowExtra]       = useState(false);
  const [roomType,        setRoomType]        = useState("");
  const [roomPartner,     setRoomPartner]     = useState("");
  const [foodPref,        setFoodPref]        = useState("ปกติ");
  const [foodOther,       setFoodOther]       = useState("");
  const [depositAmount,   setDepositAmount]   = useState("");
  const [depositDate,     setDepositDate]     = useState("");
  const [balanceDueDate,  setBalanceDueDate]  = useState("");
  const [passportName,    setPassportName]    = useState("");
  const [emergencyContact,setEmergencyContact]= useState("");
  const [specialRequests, setSpecialRequests] = useState("");

  // ── Autocomplete helpers ──────────────────────────────────────────────────────
  const normalizePhone = (p: string) => p.replace(/\D/g, "");

  const nameSuggestions = useMemo(() => {
    const q = fullName.trim().toLowerCase();
    if (q.length < 2 || selectedCustomer) return [] as Customer[];
    return customers.filter((c) => c.full_name.toLowerCase().includes(q)).slice(0, 6);
  }, [fullName, customers, selectedCustomer]);

  const phoneSuggestions = useMemo(() => {
    const q = normalizePhone(phone.trim());
    if (q.length < 5 || selectedCustomer) return [] as Customer[];
    return customers.filter((c) => c.phone && normalizePhone(c.phone).includes(q)).slice(0, 6);
  }, [phone, customers, selectedCustomer]);

  function fillFromCustomer(c: Customer) {
    setFullName(c.full_name);
    setPhone(c.phone === "-" ? "" : (c.phone ?? ""));
    setLineId(c.line_id ?? "");
    setSelectedCustomer(c);
    setActiveSugg(null);
  }

  function reset() {
    setStep("choice");
    setFullName(""); setPhone(""); setLineId(""); setSource("Walk-in"); setNote("");
    setSaving(false);
    setSelectedCustomer(null); setActiveSugg(null);
    setShowExtra(false);
    setRoomType(""); setRoomPartner(""); setFoodPref("ปกติ"); setFoodOther("");
    setDepositAmount(""); setDepositDate(""); setBalanceDueDate("");
    setPassportName(""); setEmergencyContact(""); setSpecialRequests("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleLater() {
    onConfirmQuota?.(); // ตัด quota ตอนยืนยัน
    // บันทึก booking record แบบ anonymous (ไม่มีชื่อลูกค้า)
    addBooking({
      tour_id: tourId, period_id: periodId,
      lead_id: null, customer_name: null, customer_phone: null,
      seats, price_per_seat: pricePerSeat,
      booked_by: actorName, booked_at: new Date().toISOString(), notes: null,
    });
    handleClose();
    toast.info("บันทึกที่นั่งแล้ว — สามารถเพิ่มข้อมูลลูกค้าได้ภายหลัง");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) { toast.error("กรุณากรอกชื่อลูกค้า"); return; }
    onConfirmQuota?.(); // ตัด quota ตอนยืนยัน
    setSaving(true);

    const segment: Segment = "B2C Individual";
    const travelMonth = periodLabel ? periodLabel.slice(0, 7) : "";

    // 1. Create customer (or reuse existing for returning customers)
    const customerId = selectedCustomer
      ? selectedCustomer.customer_id
      : addCustomer({
          full_name: fullName.trim(),
          company:   "",
          phone:     phone.trim(),
          line_id:   lineId.trim(),
          source,
          segment,
          note:      note.trim() || undefined,
          created_by: actorName,
        });

    // 2. Create lead — status = จองแล้ว, linked to tour + period
    // skipQuotaAdjust = true เพราะ quota ถูกตัดไปแล้วจาก Stock page (AllService.tsx)
    const resolvedFoodPref = foodOther.trim() || foodPref || undefined;
    const leadId = addLead({
      customer_id:        customerId,
      assigned_to:        actorName,
      bu_type:            "ทัวร์ต่างประเทศ",
      lead_category:      "ลูกค้าทั่วไป",
      scope:              "International",
      program:            tourName,
      tour_id:            tourId,
      period_id:          periodId,
      pax_count:          seats,
      travel_month:       travelMonth,
      tour_type:          "",
      budget_range:       "",
      urgency:            "Hot",
      next_followup_date: null,
      quoted_price:       pricePerSeat * seats,
      status:             "จองแล้ว",
      // Trip Manifest fields
      passport_name:      passportName.trim() || undefined,
      room_type:          roomType || undefined,
      room_partner:       roomPartner.trim() || undefined,
      food_pref:          resolvedFoodPref,
      deposit_amount:     depositAmount ? Number(depositAmount) : null,
      deposit_date:       depositDate || null,
      balance_due_date:   balanceDueDate || null,
      emergency_contact:  emergencyContact.trim() || undefined,
      special_requests:   specialRequests.trim() || undefined,
    }, { skipQuotaAdjust: true });

    // 3. บันทึก Booking Ledger record พร้อม lead_id
    addBooking({
      tour_id: tourId, period_id: periodId,
      lead_id: leadId ?? null,
      customer_name: fullName.trim(),
      customer_phone: phone.trim() || null,
      seats, price_per_seat: pricePerSeat,
      booked_by: actorName, booked_at: new Date().toISOString(),
      notes: note.trim() || null,
    });

    setSaving(false);
    toast.success(`บันทึกลูกค้า "${fullName.trim()}" เรียบร้อย`);
    handleClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-md flex flex-col max-h-[90vh]">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="text-lg">🎟️</span>
            บันทึกการจอง
          </DialogTitle>
        </DialogHeader>

        {/* ── Booking summary badge ── */}
        <div className="shrink-0 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
          <p className="font-medium text-foreground truncate">{tourName}</p>
          <p className="text-muted-foreground text-xs mt-0.5">
            {formatPeriodLabel(periodLabel)} · <span className="font-semibold text-foreground">{seats} ที่นั่ง</span>
          </p>
        </div>

        {/* ── Step 1: choice ── */}
        {step === "choice" && (
          <div className="space-y-3 pt-1">
            <p className="text-sm text-muted-foreground">
              ต้องการบันทึกข้อมูลลูกค้าที่จองหรือไม่?
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="default"
                className="h-auto py-3 flex flex-col gap-1"
                onClick={() => setStep("form")}
              >
                <span className="text-base">📋</span>
                <span className="text-sm font-semibold">บันทึกเลย</span>
                <span className="text-[10px] opacity-70 font-normal">เพิ่มข้อมูลลูกค้าทันที</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-3 flex flex-col gap-1"
                onClick={handleLater}
              >
                <span className="text-base">⏰</span>
                <span className="text-sm font-semibold">ไว้ภายหลัง</span>
                <span className="text-[10px] opacity-60 font-normal">บันทึกแค่จำนวนที่นั่ง</span>
              </Button>
            </div>
            {onCancel && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground hover:text-destructive"
                onClick={onCancel}
              >
                ✕ ยกเลิก
              </Button>
            )}
          </div>
        )}

        {/* ── Step 2: form ── */}
        {step === "form" && (
          <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <div className="space-y-3 pt-1 overflow-y-auto flex-1 pr-1">
            {/* Name */}
            <div className="space-y-1">
              <Label htmlFor="bld-name" className="text-xs">ชื่อ-สกุล <span className="text-destructive">*</span></Label>
              {selectedCustomer && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-500/10 border border-green-500/30 text-xs text-green-600 dark:text-green-400 mb-1">
                  <span>🔄 ลูกค้าเก่า</span>
                  <span className="font-semibold">{selectedCustomer.full_name}</span>
                  <button type="button" className="ml-auto opacity-60 hover:opacity-100" onClick={() => setSelectedCustomer(null)}>✕</button>
                </div>
              )}
              <div className="relative">
                <Input
                  id="bld-name"
                  placeholder="ชื่อลูกค้า"
                  value={fullName}
                  onChange={(e) => { setFullName(e.target.value); setSelectedCustomer(null); }}
                  onFocus={() => setActiveSugg("name")}
                  onBlur={() => setTimeout(() => setActiveSugg((a) => a === "name" ? null : a), 150)}
                  autoFocus
                />
                {activeSugg === "name" && nameSuggestions.length > 0 && (
                  <div className="absolute z-50 top-full mt-1 left-0 right-0 rounded-md border bg-popover shadow-md overflow-hidden">
                    {nameSuggestions.map((c) => (
                      <button
                        key={c.customer_id}
                        type="button"
                        className="w-full flex items-start gap-2 px-3 py-2 text-left text-xs hover:bg-muted/60 transition-colors"
                        onMouseDown={() => fillFromCustomer(c)}
                      >
                        <span className="text-muted-foreground mt-0.5">👤</span>
                        <span>
                          <span className="font-medium text-foreground">{c.full_name}</span>
                          {c.phone && c.phone !== "-" && <span className="text-muted-foreground ml-1.5">{c.phone}</span>}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Phone + LINE */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="bld-phone" className="text-xs">เบอร์โทร</Label>
                <div className="relative">
                  <Input
                    id="bld-phone"
                    placeholder="08x-xxx-xxxx"
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); setSelectedCustomer(null); }}
                    onFocus={() => setActiveSugg("phone")}
                    onBlur={() => setTimeout(() => setActiveSugg((a) => a === "phone" ? null : a), 150)}
                  />
                  {activeSugg === "phone" && phoneSuggestions.length > 0 && (
                    <div className="absolute z-50 top-full mt-1 left-0 right-0 rounded-md border bg-popover shadow-md overflow-hidden">
                      {phoneSuggestions.map((c) => (
                        <button
                          key={c.customer_id}
                          type="button"
                          className="w-full flex items-start gap-2 px-3 py-2 text-left text-xs hover:bg-muted/60 transition-colors"
                          onMouseDown={() => fillFromCustomer(c)}
                        >
                          <span className="text-muted-foreground mt-0.5">📞</span>
                          <span>
                            <span className="font-medium text-foreground">{c.full_name}</span>
                            {c.phone && c.phone !== "-" && <span className="text-muted-foreground ml-1.5">{c.phone}</span>}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="bld-line" className="text-xs">LINE ID</Label>
                <Input
                  id="bld-line"
                  placeholder="@lineid"
                  value={lineId}
                  onChange={(e) => setLineId(e.target.value)}
                />
              </div>
            </div>

            {/* Source chips */}
            <div className="space-y-1">
              <Label className="text-xs">ช่องทาง</Label>
              <div className="flex flex-wrap gap-1.5">
                {SOURCES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSource(s)}
                    className={`px-2.5 py-0.5 rounded-full text-xs border transition-colors ${
                      source === s
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Note */}
            <div className="space-y-1">
              <Label htmlFor="bld-note" className="text-xs">หมายเหตุ (ไม่บังคับ)</Label>
              <Input
                id="bld-note"
                placeholder="ต้องการรถ, ห้องพิเศษ ฯลฯ"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            {/* ── Trip Manifest collapsible ── */}
            <div className="border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setShowExtra((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/40 transition-colors"
              >
                <span>🛂 รายละเอียดผู้โดยสาร (Trip Manifest)</span>
                <span>{showExtra ? "▲" : "▼"}</span>
              </button>
              {showExtra && (
                <div className="px-3 pb-3 pt-2 space-y-2.5 border-t">
                  {/* Passport name */}
                  <div className="space-y-1">
                    <Label className="text-xs">ชื่อบน Passport</Label>
                    <Input placeholder="ตามพาสปอร์ต" value={passportName} onChange={(e) => setPassportName(e.target.value)} />
                  </div>
                  {/* Room type + partner */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">ประเภทห้อง</Label>
                      <div className="flex flex-wrap gap-1">
                        {ROOM_TYPES.map((r) => (
                          <button key={r} type="button" onClick={() => setRoomType(roomType === r ? "" : r)}
                            className={`px-2 py-0.5 rounded text-xs border transition-colors ${roomType === r ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
                          >{r}</button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">คู่นอน (ถ้ามี)</Label>
                      <Input placeholder="ชื่อ-สกุล" value={roomPartner} onChange={(e) => setRoomPartner(e.target.value)} />
                    </div>
                  </div>
                  {/* Food pref */}
                  <div className="space-y-1">
                    <Label className="text-xs">อาหาร</Label>
                    <div className="flex flex-wrap gap-1 mb-1">
                      {FOOD_PRESETS.map((f) => (
                        <button key={f} type="button" onClick={() => { setFoodPref(f); setFoodOther(""); }}
                          className={`px-2 py-0.5 rounded text-xs border transition-colors ${foodPref === f && !foodOther ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
                        >{f}</button>
                      ))}
                    </div>
                    <Input placeholder="อื่นๆ / แพ้... (ระบุ)" value={foodOther}
                      onChange={(e) => { setFoodOther(e.target.value); if (e.target.value) setFoodPref(""); }}
                    />
                  </div>
                  {/* Deposit */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">มัดจำ (บาท)</Label>
                      <Input type="number" placeholder="0" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">วันที่จ่ายมัดจำ</Label>
                      <Input type="date" value={depositDate} onChange={(e) => setDepositDate(e.target.value)} />
                    </div>
                  </div>
                  {/* Balance due */}
                  <div className="space-y-1">
                    <Label className="text-xs">วันครบกำหนดชำระส่วนที่เหลือ</Label>
                    <Input type="date" value={balanceDueDate} onChange={(e) => setBalanceDueDate(e.target.value)} />
                  </div>
                  {/* Emergency contact */}
                  <div className="space-y-1">
                    <Label className="text-xs">เบอร์ฉุกเฉิน</Label>
                    <Input placeholder="08x-xxx-xxxx" value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} />
                  </div>
                  {/* Special requests */}
                  <div className="space-y-1">
                    <Label className="text-xs">ความต้องการพิเศษ</Label>
                    <Input placeholder="รถเข็น, ห้องชั้นล่าง ฯลฯ" value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)} />
                  </div>
                </div>
              )}
            </div>

            </div>{/* end scrollable zone */}

            {/* Actions — fixed at bottom, outside scroll */}
            <div className="flex gap-2 pt-2 shrink-0 border-t mt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="flex-1"
                onClick={() => setStep("choice")}
              >
                ← ย้อนกลับ
              </Button>
              <Button
                type="submit"
                size="sm"
                className="flex-1"
                disabled={saving}
              >
                {saving ? "กำลังบันทึก…" : "บันทึกลูกค้า"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
