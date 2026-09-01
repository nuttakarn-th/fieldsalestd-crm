/**
 * CancelBookingDialog.tsx
 *
 * Popup ที่ขึ้นเมื่อผู้ใช้กด "-" (release seats) จากหน้า Stock
 * — แสดงรายการ active bookings ของ period นั้น
 * — ให้เลือก booking ที่จะยกเลิก + ใส่เหตุผล
 * — calls cancelBooking (ledger) + adjustPeriodQuota (serviceStore)
 *
 * หากไม่มี bookings (anonymous หรือ Supabase ปิด) → fallback: cancel ทันที
 */

import { useState, useEffect } from "react";
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
import { useBookingLedger, type BookingRecord } from "@/store/bookingLedgerStore";
import { useServices } from "@/store/serviceStore";

// ── Props ─────────────────────────────────────────────────────────────────────

export interface CancelBookingDialogProps {
  open: boolean;
  onClose: () => void;
  tourId: string;
  tourName: string;
  periodId: string;
  periodLabel: string;
  /** จำนวนที่นั่งที่ต้องการคืน (delta จาก caller) */
  seatsToRelease: number;
  actorName: string;
}

// ── Helper ────────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("th-TH", {
      day: "numeric", month: "short", year: "2-digit",
      hour: "2-digit", minute: "2-digit",
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
  const { loadBookingsForPeriod, cancelBooking, getActiveBookingsForPeriod } = useBookingLedger.getState();
  const bookings = useBookingLedger((s) => s.bookings);
  const adjustPeriodQuota = useServices((s) => s.adjustPeriodQuota);

  const [loading, setLoading]         = useState(false);
  const [activeBookings, setActive]   = useState<BookingRecord[]>([]);
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [reason, setReason]           = useState("");
  const [saving, setSaving]           = useState(false);

  // โหลด bookings เมื่อ dialog เปิด
  useEffect(() => {
    if (!open) return;
    setSelectedId(null);
    setReason("");
    setLoading(true);
    loadBookingsForPeriod(tourId, periodId).finally(() => setLoading(false));
  }, [open, tourId, periodId, loadBookingsForPeriod]);

  // sync จาก store
  useEffect(() => {
    setActive(getActiveBookingsForPeriod(tourId, periodId));
  }, [bookings, tourId, periodId, getActiveBookingsForPeriod]);

  async function handleConfirm() {
    if (!selectedId && activeBookings.length > 0) {
      toast.error("กรุณาเลือก Booking ที่ต้องการยกเลิก");
      return;
    }
    setSaving(true);
    try {
      if (selectedId) {
        const rec = activeBookings.find((b) => b.id === selectedId);
        const ok = await cancelBooking(selectedId, actorName, reason.trim() || undefined);
        if (!ok) { toast.error("ยกเลิก Booking ล้มเหลว"); setSaving(false); return; }
        // คืนที่นั่งตามจำนวนใน booking record (ไม่ใช่ seatsToRelease เพื่อความแม่นยำ)
        const releaseCount = rec?.seats ?? seatsToRelease;
        adjustPeriodQuota(tourId, periodId, releaseCount, actorName);
        toast.success(`ยกเลิก Booking "${rec?.customer_name ?? "ไม่ระบุชื่อ"}" — คืน ${releaseCount} ที่นั่งแล้ว`);
      } else {
        // fallback: ไม่มี booking record → คืนที่นั่งตรงๆ
        adjustPeriodQuota(tourId, periodId, seatsToRelease, actorName);
        toast.success(`คืน ${seatsToRelease} ที่นั่งแล้ว`);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  }

  function handleNoRecord() {
    // ผู้ใช้กด "คืนที่นั่งโดยไม่ระบุ Booking" → fallback path
    adjustPeriodQuota(tourId, periodId, seatsToRelease, actorName);
    toast.success(`คืน ${seatsToRelease} ที่นั่งแล้ว (ไม่ได้ระบุ Booking)`);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="text-lg">🔄</span>
            ยกเลิกการจอง
          </DialogTitle>
        </DialogHeader>

        {/* Summary badge */}
        <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
          <p className="font-medium text-foreground truncate">{tourName}</p>
          <p className="text-muted-foreground text-xs mt-0.5">
            {periodLabel} · คืน <span className="font-semibold text-foreground">{seatsToRelease} ที่นั่ง</span>
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-6">กำลังโหลด…</p>
        ) : activeBookings.length === 0 ? (
          <div className="text-center py-4 space-y-2">
            <p className="text-sm text-muted-foreground">ไม่พบ Booking ที่ active ใน Period นี้</p>
            <p className="text-xs text-muted-foreground">(อาจถูกบันทึกก่อนระบบ Ledger หรือยังไม่มีข้อมูล)</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            <Label className="text-xs text-muted-foreground">เลือก Booking ที่ต้องการยกเลิก</Label>
            {activeBookings.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelectedId(b.id === selectedId ? null : b.id)}
                className={`w-full text-left rounded-lg border px-3 py-2.5 transition-colors text-sm ${
                  selectedId === b.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {b.customer_name ?? <span className="text-muted-foreground italic">ไม่ระบุชื่อ</span>}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {b.seats} ที่นั่ง · จองโดย {b.booked_by ?? "?"} · {formatDate(b.booked_at)}
                    </p>
                    {b.customer_phone && (
                      <p className="text-xs text-muted-foreground">{b.customer_phone}</p>
                    )}
                  </div>
                  <span className={`mt-0.5 text-lg ${selectedId === b.id ? "opacity-100" : "opacity-0"}`}>✓</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* เหตุผล */}
        {(activeBookings.length > 0 && selectedId) && (
          <div className="space-y-1">
            <Label htmlFor="cancel-reason" className="text-xs">เหตุผลการยกเลิก (ไม่บังคับ)</Label>
            <Input
              id="cancel-reason"
              placeholder="เช่น ลูกค้าขอยกเลิก, เปลี่ยนโปรแกรม ฯลฯ"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        )}

        <DialogFooter className="flex gap-2 pt-1">
          {activeBookings.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={handleNoRecord}
              disabled={saving}
            >
              คืนที่นั่งโดยไม่ระบุ Booking
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
            disabled={saving || (activeBookings.length > 0 && !selectedId)}
          >
            {saving ? "กำลังบันทึก…" : activeBookings.length === 0 ? `คืน ${seatsToRelease} ที่นั่ง` : "ยืนยันยกเลิก"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
