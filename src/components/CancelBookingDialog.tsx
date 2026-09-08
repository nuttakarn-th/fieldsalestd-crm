/**
 * CancelBookingDialog.tsx  v2  — B+C Combined
 *
 * Popup เมื่อกด "−" (release seats) จากหน้า Stock
 *
 * ── Data source: Leads ที่ status="จองแล้ว" ใน period นั้น (แสดงชื่อลูกค้าชัดเจน)
 * ── Partial cancel: ใส่จำนวนที่นั่งที่ต้องการยกเลิก (1 ถึง lead.pax_count)
 *    • cancelCount = lead.pax_count  → updateLeadStatus → "ยกเลิก" + คืน quota
 *    • cancelCount < lead.pax_count  → updateLead pax_count -= count + คืน quota
 * ── Audit trail: cancel booking ledger record ที่ผูกกับ lead (ถ้ามี)
 * ── Fallback: ถ้าไม่พบ lead ใดใน period → คืนที่นั่งตรงๆ (เหมือนเดิม)
 */

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useCRM } from "@/store/crmStore";
import { useBookingLedger } from "@/store/bookingLedgerStore";
import { useServices } from "@/store/serviceStore";

// ── Props ─────────────────────────────────────────────────────────────────────

export interface CancelBookingDialogProps {
  open: boolean;
  onClose: () => void;
  tourId: string;
  tourName: string;
  periodId: string;
  periodLabel: string;
  /** จำนวนที่นั่งที่ต้องการคืน (delta จาก caller — ใช้เป็น default) */
  seatsToRelease: number;
  actorName: string;
}

// ── Helper ────────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("th-TH", {
      day: "numeric", month: "short", year: "2-digit",
    });
  } catch {
    return iso;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CancelBookingDialog({
  open, onClose,
  tourId, tourName, periodId, periodLabel,
  seatsToRelease, actorName,
}: CancelBookingDialogProps) {
  // ── Store hooks ───────────────────────────────────────────────────────────
  const leads    = useCRM((s) => s.leads);
  const customers = useCRM((s) => s.customers);
  const updateLeadStatus = useCRM((s) => s.updateLeadStatus);
  const updateLead       = useCRM((s) => s.updateLead);
  const adjustPeriodQuota = useServices((s) => s.adjustPeriodQuota);

  // ── Local state ───────────────────────────────────────────────────────────
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [cancelCount, setCancelCount]       = useState<number>(seatsToRelease);
  const [reason, setReason]                 = useState("");
  const [saving, setSaving]                 = useState(false);

  // Reset เมื่อ dialog เปิดใหม่
  useEffect(() => {
    if (!open) return;
    setSelectedLeadId(null);
    setCancelCount(seatsToRelease);
    setReason("");
    setSaving(false);
  }, [open, seatsToRelease]);

  // ── Leads ที่ "จองแล้ว" ใน period นี้ ────────────────────────────────────
  const activeLeads = useMemo(
    () =>
      leads.filter(
        (l) =>
          l.tour_id === tourId &&
          l.period_id === periodId &&
          l.status === "จองแล้ว",
      ),
    [leads, tourId, periodId],
  );

  const selectedLead = activeLeads.find((l) => l.lead_id === selectedLeadId) ?? null;
  const selectedCustomer = selectedLead
    ? customers.find((c) => c.customer_id === selectedLead.customer_id)
    : null;
  const maxCancel = selectedLead?.pax_count ?? seatsToRelease;

  // ── Select lead ───────────────────────────────────────────────────────────
  function handleSelectLead(leadId: string) {
    if (selectedLeadId === leadId) {
      setSelectedLeadId(null);
      setCancelCount(seatsToRelease);
    } else {
      setSelectedLeadId(leadId);
      const lead = activeLeads.find((l) => l.lead_id === leadId);
      if (lead) {
        // default: ยกเลิกตามจำนวนที่ user กด แต่ไม่เกิน pax ของ lead นั้น
        setCancelCount(Math.min(seatsToRelease, lead.pax_count));
      }
    }
    setReason("");
  }

  // ── Confirm ───────────────────────────────────────────────────────────────
  async function handleConfirm() {
    if (!selectedLeadId && activeLeads.length > 0) {
      toast.error("กรุณาเลือกลูกค้าที่ต้องการยกเลิก");
      return;
    }
    setSaving(true);
    try {
      if (selectedLead) {
        const count = Math.max(1, Math.min(cancelCount, maxCancel));
        const custName = selectedCustomer?.full_name ?? "ลูกค้า";

        if (count >= selectedLead.pax_count) {
          // ── ยกเลิกทั้ง lead ──────────────────────────────────────────────
          updateLeadStatus(selectedLead.lead_id, "ยกเลิก", reason.trim() || undefined);

          // Audit trail: cancel booking ledger record ที่ผูก lead นี้ (ถ้ามี)
          try {
            const { getActiveBookingsForPeriod, cancelBooking } = useBookingLedger.getState();
            const linkedBooking = getActiveBookingsForPeriod(tourId, periodId)
              .find((b) => b.lead_id === selectedLead.lead_id);
            if (linkedBooking) {
              cancelBooking(linkedBooking.id, actorName, reason.trim() || undefined);
            }
          } catch {
            // audit trail fail is non-critical — ไม่หยุด flow หลัก
          }

          adjustPeriodQuota(tourId, periodId, count, actorName, custName);
          toast.success(`ยกเลิกการจองของ "${custName}" — คืน ${count} ที่นั่ง`);
        } else {
          // ── ยกเลิกบางส่วน: ลด pax_count ────────────────────────────────
          updateLead(selectedLead.lead_id, { pax_count: selectedLead.pax_count - count });
          adjustPeriodQuota(tourId, periodId, count, actorName, custName);
          toast.success(
            `ลดที่นั่ง "${custName}" จาก ${selectedLead.pax_count} → ${selectedLead.pax_count - count} ที่ — คืน ${count} ที่นั่ง`,
          );
        }
      } else {
        // ── Fallback: ไม่มี lead ในระบบ ─────────────────────────────────
        adjustPeriodQuota(tourId, periodId, seatsToRelease, actorName);
        toast.success(`คืน ${seatsToRelease} ที่นั่งแล้ว`);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  }

  function handleNoRecord() {
    adjustPeriodQuota(tourId, periodId, seatsToRelease, actorName);
    toast.success(`คืน ${seatsToRelease} ที่นั่งแล้ว (ไม่ได้ระบุลูกค้า)`);
    onClose();
  }

  // ── UI ────────────────────────────────────────────────────────────────────
  const confirmLabel = saving
    ? "กำลังบันทึก…"
    : activeLeads.length === 0
    ? `คืน ${seatsToRelease} ที่นั่ง`
    : selectedLead
    ? cancelCount >= maxCancel
      ? `ยืนยัน ยกเลิกทั้งหมด (${cancelCount} ที่)`
      : `ยืนยัน คืน ${cancelCount} ที่นั่ง`
    : "ยืนยันยกเลิก";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="text-lg">🔄</span>
            ยกเลิกการจอง
          </DialogTitle>
        </DialogHeader>

        {/* ── Summary badge ── */}
        <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
          <p className="font-medium text-foreground truncate">{tourName}</p>
          <p className="text-muted-foreground text-xs mt-0.5">
            {periodLabel
              ? (() => {
                  try {
                    return new Date(periodLabel).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
                  } catch { return periodLabel; }
                })()
              : "–"}
            {" · "}คืน <span className="font-semibold text-foreground">{seatsToRelease} ที่นั่ง</span>
          </p>
        </div>

        {/* ── Lead list ── */}
        {activeLeads.length === 0 ? (
          <div className="text-center py-5 space-y-1.5">
            <p className="text-sm text-muted-foreground">ไม่พบลูกค้าที่จองใน Period นี้</p>
            <p className="text-xs text-muted-foreground">
              (อาจถูกบันทึกก่อนระบบ หรือยังไม่มีข้อมูล)
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              <Label className="text-xs text-muted-foreground">
                เลือกลูกค้าที่ต้องการยกเลิก
              </Label>
              {activeLeads.map((lead) => {
                const cust = customers.find((c) => c.customer_id === lead.customer_id);
                const isSelected = selectedLeadId === lead.lead_id;
                return (
                  <button
                    key={lead.lead_id}
                    type="button"
                    onClick={() => handleSelectLead(lead.lead_id)}
                    className={`w-full text-left rounded-lg border px-3 py-2.5 transition-colors text-sm ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">
                          {cust?.full_name ?? (
                            <span className="text-muted-foreground italic">ไม่ระบุชื่อ</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {lead.pax_count} ที่นั่ง
                          {cust?.phone ? ` · ${cust.phone}` : ""}
                          {lead.assigned_to ? ` · ${lead.assigned_to}` : ""}
                          {lead.closed_date
                            ? ` · จอง ${formatDate(lead.closed_date)}`
                            : ""}
                        </p>
                      </div>
                      <span
                        className={`mt-0.5 text-base shrink-0 transition-opacity ${
                          isSelected ? "opacity-100 text-primary" : "opacity-0"
                        }`}
                      >
                        ✓
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* ── Partial cancel input (แสดงเมื่อเลือก lead แล้ว) ── */}
            {selectedLead && (
              <div className="space-y-3 pt-1 border-t border-border">
                <div className="space-y-1 pt-2">
                  <Label className="text-xs font-semibold">
                    จำนวนที่นั่งที่ต้องการยกเลิก
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={maxCancel}
                      value={cancelCount}
                      onChange={(e) => {
                        const v = Math.max(1, Math.min(maxCancel, Number(e.target.value) || 1));
                        setCancelCount(v);
                      }}
                      className="h-8 text-sm w-24"
                    />
                    <span className="text-xs text-muted-foreground">
                      / {maxCancel} ที่นั่ง
                    </span>
                    {cancelCount < maxCancel ? (
                      <span className="text-xs text-amber-600 dark:text-amber-400">
                        เหลือ {maxCancel - cancelCount} ที่ (ยังจองอยู่)
                      </span>
                    ) : (
                      <span className="text-xs text-destructive font-medium">
                        ยกเลิกทั้งหมด
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="cancel-reason" className="text-xs">
                    เหตุผลการยกเลิก{" "}
                    <span className="text-muted-foreground font-normal">(ไม่บังคับ)</span>
                  </Label>
                  <Input
                    id="cancel-reason"
                    placeholder="เช่น ลูกค้าขอยกเลิก, เปลี่ยนโปรแกรม ฯลฯ"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Footer ── */}
        <DialogFooter className="flex gap-2 pt-1">
          {activeLeads.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground mr-auto"
              onClick={handleNoRecord}
              disabled={saving}
            >
              คืนที่นั่งโดยไม่ระบุลูกค้า
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={saving}
          >
            ยกเลิก
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={handleConfirm}
            disabled={saving || (activeLeads.length > 0 && !selectedLeadId)}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
