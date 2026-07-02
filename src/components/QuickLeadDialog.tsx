/**
 * QuickLeadDialog.tsx
 * ฟอร์ม Quick Capture — Sales เพิ่ม Lead ได้ใน 30 วินาที
 * Fields: ชื่อ + เบอร์ + ประเภทบริการ + requirement_tags + urgency + หมายเหตุ
 */
import { useState } from "react";
import { Zap, X, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCRM, BU_TYPES, REQUIREMENT_TAGS, SOURCES, type BUType, type Urgency, type Source } from "@/store/crmStore";
import { useCurrentUser } from "@/store/authStore";
import { CustomerLeadDialog } from "@/components/CustomerLeadDialog";
import { toast } from "sonner";

interface QuickLeadDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const URGENCY_PILLS: { val: Urgency; label: string; active: string; idle: string }[] = [
  { val: "Cold", label: "🔵 Cold", active: "bg-blue-100 text-blue-700 border-blue-400", idle: "bg-muted text-muted-foreground border-border" },
  { val: "Warm", label: "🟡 Warm", active: "bg-amber-100 text-amber-700 border-amber-400", idle: "bg-muted text-muted-foreground border-border" },
  { val: "Hot",  label: "🔴 Hot",  active: "bg-red-100 text-red-700 border-red-400",   idle: "bg-muted text-muted-foreground border-border" },
];

export function QuickLeadDialog({ open, onOpenChange }: QuickLeadDialogProps) {
  const addCustomer = useCRM((s) => s.addCustomer);
  const addLead     = useCRM((s) => s.addLead);
  const currentRep  = useCRM((s) => s.currentRep);
  const user        = useCurrentUser();

  const [name,      setName]      = useState("");
  const [phone,     setPhone]     = useState("");
  const [buType,    setBuType]    = useState<BUType>("ทัวร์ต่างประเทศ");
  const [source,    setSource]    = useState<Source>("Field Sale");
  const [tags,      setTags]      = useState<string[]>([]);
  const [urgency,   setUrgency]   = useState<Urgency>("Cold");
  const [note,      setNote]      = useState("");
  const [followup,  setFollowup]  = useState(() => new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]);
  const [noPhone,   setNoPhone]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [fullOpen,  setFullOpen]  = useState(false);

  const addDays = (days: number) => new Date(Date.now() + days * 86400000).toISOString().split("T")[0];
  const QUICK_FOLLOWUP = [
    { label: "พรุ่งนี้", days: 1 },
    { label: "+3 วัน",   days: 3 },
    { label: "+7 วัน",   days: 7 },
    { label: "+14 วัน",  days: 14 },
  ];

  // ใช้ชื่อ user ที่ login อยู่เสมอ — ไม่ fallback เป็น "เฟิร์ส" อีกต่อไป
  const rep = user?.full_name ?? (currentRep !== "All" ? currentRep : "");

  const toggleTag = (t: string) =>
    setTags((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);

  const reset = () => {
    setName(""); setPhone(""); setBuType("ทัวร์ต่างประเทศ");
    setTags([]); setSource("Field Sale"); setUrgency("Cold"); setNote(""); setFollowup(addDays(7)); setNoPhone(false); setSaving(false);
  };

  const handleClose = () => { reset(); onOpenChange(false); };

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error("กรุณาระบุชื่อลูกค้า"); return; }
    if (!noPhone && !phone.trim()) { toast.error("กรุณาระบุเบอร์โทร หรือติ๊ก 'ยังไม่ได้เบอร์'"); return; }
    setSaving(true);
    try {
      const today = new Date().toISOString().split("T")[0];

      const customerId = addCustomer({
        full_name: name.trim(),
        phone: phone.trim(),
        company: "",
        line_id: "",
        source,
        segment: "B2C Individual",
        note: note.trim() || undefined,
        created_by: rep,
        last_contacted_at: new Date().toISOString(),
        first_contact_date: today,
      } as any);

      addLead({
        customer_id: customerId,
        assigned_to: rep,
        bu_type: buType,
        program: tags.length > 0 ? tags.join(", ") : buType,
        pax_count: 2,
        travel_month: "",
        tour_type: "",
        budget_range: "",
        urgency,
        next_followup_date: followup,
        quoted_price: 0,
        status_note: note.trim() || null,
        requirement_tags: tags,
      } as any);

      toast.success(`เพิ่ม Lead "${name.trim()}" แล้ว ✅`);
      handleClose();
    } catch (e) {
      toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setSaving(false);
    }
  };

  const openFull = () => { onOpenChange(false); setFullOpen(true); };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogContent className="max-w-sm p-0 overflow-hidden gap-0">
          {/* Header */}
          <DialogHeader className="px-5 pt-5 pb-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
            <DialogTitle className="flex items-center gap-2 text-white">
              <Zap className="w-4 h-4" /> Quick Lead Capture
            </DialogTitle>
            <p className="text-[11px] text-white/75 mt-0.5">เพิ่ม Lead ด่วน — กรอกแค่ข้อมูลสำคัญ</p>
          </DialogHeader>

          <div className="px-5 py-4 space-y-3.5">
            {/* ชื่อ + เบอร์ */}
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2 space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">ชื่อลูกค้า *</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ชื่อ-นามสกุล"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                />
              </div>
              <div className="col-span-2 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    เบอร์โทร {!noPhone && "*"}
                  </label>
                  <button
                    type="button"
                    onClick={() => { setNoPhone((v) => !v); setPhone(""); }}
                    className={`text-[11px] px-2 py-0.5 rounded-full border transition-all ${
                      noPhone
                        ? "bg-amber-100 text-amber-700 border-amber-400 font-semibold dark:bg-amber-900/40 dark:text-amber-300"
                        : "bg-muted text-muted-foreground border-border hover:border-amber-300"
                    }`}
                  >
                    {noPhone ? "✕ ยังไม่ได้เบอร์" : "ยังไม่ได้เบอร์"}
                  </button>
                </div>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={noPhone ? "— ยังไม่มีเบอร์ —" : "0812345678"}
                  type="tel"
                  inputMode="tel"
                  disabled={noPhone}
                  className={noPhone ? "opacity-40" : ""}
                />
              </div>
            </div>

            {/* ประเภทบริการ + ช่องทางที่มา */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">ประเภทบริการ</label>
                <Select value={buType} onValueChange={(v) => setBuType(v as BUType)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BU_TYPES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">ช่องทางที่มา</label>
                <Select value={source} onValueChange={(v) => setSource(v as Source)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Requirement Tags */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">ความสนใจ (เลือกได้หลายอย่าง)</label>
              <div className="flex flex-wrap gap-1.5">
                {REQUIREMENT_TAGS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTag(t)}
                    className={`text-[11px] px-2.5 py-1 rounded-full border transition-all ${
                      tags.includes(t)
                        ? "bg-emerald-100 text-emerald-700 border-emerald-400 font-semibold"
                        : "bg-muted text-muted-foreground border-border hover:border-emerald-300"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Urgency */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">ความเร่งด่วน</label>
              <div className="flex gap-2">
                {URGENCY_PILLS.map((p) => (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() => setUrgency(p.val)}
                    className={`flex-1 text-xs py-1.5 rounded-lg border transition-all font-medium ${
                      urgency === p.val ? p.active : p.idle
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* หมายเหตุ */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">หมายเหตุ (ไม่บังคับ)</label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="บันทึกการพบลูกค้า, ความต้องการเพิ่มเติม..."
                rows={2}
                className="text-sm resize-none"
              />
            </div>

            {/* วันนัด Follow-up */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                วันนัดหมาย / Follow-up
              </label>
              <div className="flex gap-1.5 flex-wrap">
                {QUICK_FOLLOWUP.map((q) => (
                  <button
                    key={q.days}
                    type="button"
                    onClick={() => setFollowup(addDays(q.days))}
                    className={`text-[11px] px-2.5 py-1 rounded-full border transition-all ${
                      followup === addDays(q.days)
                        ? "bg-emerald-500 text-white border-emerald-500 font-semibold"
                        : "bg-muted text-muted-foreground border-border hover:border-emerald-300"
                    }`}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
              <input
                type="date" lang="th-TH"
                value={followup}
                onChange={(e) => setFollowup(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 pb-5 flex flex-col gap-2">
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
            >
              <Zap className="w-3.5 h-3.5 mr-1.5" />
              {saving ? "กำลังบันทึก..." : "บันทึก Lead"}
            </Button>
            <button
              type="button"
              onClick={openFull}
              className="text-[11px] text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 transition-colors"
            >
              กรอกข้อมูลเพิ่มเติม (ฟอร์มเต็ม) <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Full form fallback */}
      <CustomerLeadDialog open={fullOpen} onOpenChange={setFullOpen} />
    </>
  );
}