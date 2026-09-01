/**
 * BookingLeadDialog.tsx
 *
 * Popup ที่เด้งขึ้นหลังจากบันทึกการจองที่นั่งจากหน้า Stock
 * Step 1 — เลือก: บันทึกลูกค้าเลย / ไว้ภายหลัง
 * Step 2 — ฟอร์มเก็บข้อมูลลูกค้า (ชื่อ, เบอร์, LINE, source)
 *           → addCustomer + addLead (status=จองแล้ว, tour_id/period_id pre-filled)
 */

import { useState } from "react";
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
import { useCRM, type Source, type Segment } from "@/store/crmStore";
import { useBookingLedger } from "@/store/bookingLedgerStore";

// ── Props ─────────────────────────────────────────────────────────────────────

export interface BookingLeadDialogProps {
  open: boolean;
  onClose: () => void;
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
  open, onClose,
  tourId, tourName, periodId, periodLabel, seats, pricePerSeat = 0, actorName,
}: BookingLeadDialogProps) {
  const addCustomer  = useCRM((s) => s.addCustomer);
  const addLead      = useCRM((s) => s.addLead);
  const addBooking   = useBookingLedger((s) => s.addBooking);

  const [step, setStep] = useState<"choice" | "form">("choice");

  // Form state
  const [fullName, setFullName] = useState("");
  const [phone,    setPhone]    = useState("");
  const [lineId,   setLineId]   = useState("");
  const [source,   setSource]   = useState<Source>("Walk-in");
  const [note,     setNote]     = useState("");
  const [saving,   setSaving]   = useState(false);

  function reset() {
    setStep("choice");
    setFullName(""); setPhone(""); setLineId(""); setSource("Walk-in"); setNote("");
    setSaving(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleLater() {
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
    setSaving(true);

    const segment: Segment = "B2C Individual";
    const travelMonth = periodLabel ? periodLabel.slice(0, 7) : "";

    // 1. Create customer
    const customerId = addCustomer({
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
      quoted_price:       0,
      status:             "จองแล้ว",
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="text-lg">🎟️</span>
            บันทึกการจอง
          </DialogTitle>
        </DialogHeader>

        {/* ── Booking summary badge ── */}
        <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
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
          </div>
        )}

        {/* ── Step 2: form ── */}
        {step === "form" && (
          <form onSubmit={handleSubmit} className="space-y-3 pt-1">
            {/* Name */}
            <div className="space-y-1">
              <Label htmlFor="bld-name" className="text-xs">ชื่อ-สกุล <span className="text-destructive">*</span></Label>
              <Input
                id="bld-name"
                placeholder="ชื่อลูกค้า"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoFocus
              />
            </div>

            {/* Phone + LINE */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="bld-phone" className="text-xs">เบอร์โทร</Label>
                <Input
                  id="bld-phone"
                  placeholder="08x-xxx-xxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
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

            {/* Actions */}
            <div className="flex gap-2 pt-1">
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
