/**
 * FollowupLogDialog.tsx
 * Dialog บันทึกผลการ Follow-up — กรอกได้ใน 15 วินาที
 * Fields: ผลการติดต่อ (pills) + หมายเหตุ (optional) + วันนัดครั้งต่อไป
 */
import { useState } from "react";
import { ClipboardCheck, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCRM, type FollowupResult, type Lead } from "@/store/crmStore";
import { useCurrentUser } from "@/store/authStore";
import { toast } from "sonner";

interface FollowupLogDialogProps {
  lead: Lead;
  customerName: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const RESULT_PILLS: { val: FollowupResult; emoji: string; color: string; active: string }[] = [
  {
    val: "ไม่เจอ/ไม่รับ",
    emoji: "📵",
    color: "bg-muted text-muted-foreground border-border",
    active: "bg-slate-100 text-slate-700 border-slate-400 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-500",
  },
  {
    val: "เจอแต่ไม่ว่าง",
    emoji: "🕐",
    color: "bg-muted text-muted-foreground border-border",
    active: "bg-amber-100 text-amber-700 border-amber-400 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-500",
  },
  {
    val: "คุยแล้ว",
    emoji: "💬",
    color: "bg-muted text-muted-foreground border-border",
    active: "bg-blue-100 text-blue-700 border-blue-400 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-500",
  },
  {
    val: "นัดได้แล้ว",
    emoji: "✅",
    color: "bg-muted text-muted-foreground border-border",
    active: "bg-emerald-100 text-emerald-700 border-emerald-400 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-500",
  },
];

const QUICK_DATES = [
  { label: "+1 วัน",   days: 1 },
  { label: "+3 วัน",   days: 3 },
  { label: "+7 วัน",   days: 7 },
  { label: "+14 วัน",  days: 14 },
  { label: "+30 วัน",  days: 30 },
];

function addDays(days: number): string {
  const d = new Date(Date.now() + days * 86400000);
  return d.toISOString().split("T")[0];
}

export function FollowupLogDialog({ lead, customerName, open, onOpenChange }: FollowupLogDialogProps) {
  const addFollowupLog = useCRM((s) => s.addFollowupLog);
  const user = useCurrentUser();

  const [result, setResult]     = useState<FollowupResult | null>(null);
  const [note, setNote]         = useState("");
  const [nextDate, setNextDate] = useState<string>(addDays(7));
  const [noNext, setNoNext]     = useState(false);
  const [saving, setSaving]     = useState(false);

  const reset = () => {
    setResult(null); setNote(""); setNextDate(addDays(7)); setNoNext(false); setSaving(false);
  };

  const handleClose = () => { reset(); onOpenChange(false); };

  const handleSubmit = async () => {
    if (!result) { toast.error("กรุณาเลือกผลการติดต่อ"); return; }
    setSaving(true);
    try {
      addFollowupLog(lead.lead_id, {
        date: new Date().toISOString().split("T")[0],
        result,
        note: note.trim() || undefined,
        next_followup_date: noNext ? null : nextDate,
        logged_by: user?.full_name ?? "Unknown",
      });
      toast.success(`บันทึกผลแล้ว — ${result}`);
      handleClose();
    } finally {
      setSaving(false);
    }
  };

  // Quick-pick วันนัดใหม่ highlight
  const matchedQuick = QUICK_DATES.find((q) => addDays(q.days) === nextDate)?.days ?? null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-sm p-0 overflow-hidden gap-0">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
          <DialogTitle className="flex items-center gap-2 text-white text-sm">
            <ClipboardCheck className="w-4 h-4" />
            บันทึกผลการ Follow-up
          </DialogTitle>
          <p className="text-[11px] text-white/75 mt-0.5 truncate">
            {customerName} · {lead.bu_type}
          </p>
        </DialogHeader>

        <div className="px-5 py-4 space-y-4">
          {/* ผลการติดต่อ */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              ผลการติดต่อ *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {RESULT_PILLS.map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => setResult(p.val)}
                  className={`text-xs px-3 py-2.5 rounded-xl border-2 transition-all font-medium flex items-center gap-1.5 ${
                    result === p.val ? p.active : p.color + " hover:border-muted-foreground/40"
                  }`}
                >
                  <span>{p.emoji}</span>
                  <span>{p.val}</span>
                </button>
              ))}
            </div>
          </div>

          {/* หมายเหตุ */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              หมายเหตุ (ไม่บังคับ)
            </label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="สั้นๆ เช่น ลูกค้าออกไปข้างนอก, นัดโทรหาช่วงบ่าย..."
              rows={2}
              className="text-sm resize-none"
            />
          </div>

          {/* วันนัดครั้งต่อไป */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                นัดครั้งต่อไป
              </label>
              <button
                type="button"
                onClick={() => setNoNext((v) => !v)}
                className={`text-[11px] px-2 py-0.5 rounded-full border transition-all ${
                  noNext
                    ? "bg-destructive/10 text-destructive border-destructive/30 font-semibold"
                    : "bg-muted text-muted-foreground border-border"
                }`}
              >
                {noNext ? "✕ ไม่นัด" : "ไม่นัด"}
              </button>
            </div>

            {!noNext && (
              <>
                {/* Quick picks */}
                <div className="flex gap-1.5 flex-wrap">
                  {QUICK_DATES.map((q) => (
                    <button
                      key={q.days}
                      type="button"
                      onClick={() => setNextDate(addDays(q.days))}
                      className={`text-[11px] px-2.5 py-1 rounded-full border transition-all ${
                        matchedQuick === q.days
                          ? "bg-primary text-primary-foreground border-primary font-semibold"
                          : "bg-muted text-muted-foreground border-border hover:border-primary/50"
                      }`}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
                {/* Custom date */}
                <input
                  type="date" lang="th-TH"
                  value={nextDate}
                  onChange={(e) => setNextDate(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5">
          <Button
            onClick={handleSubmit}
            disabled={saving || !result}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold"
          >
            <ClipboardCheck className="w-3.5 h-3.5 mr-1.5" />
            {saving ? "กำลังบันทึก..." : "บันทึกผล"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
