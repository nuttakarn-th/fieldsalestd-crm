/**
 * IncentivePipeline.tsx
 * Kanban board สำหรับติดตาม Incentive Tour requests
 * 6 columns: รับเรื่อง → ออกแบบแผน → ส่ง Proposal → รอยืนยัน → ยืนยันแล้ว → ดำเนินการ
 */
import { useState, useMemo } from "react";
import {
  Plus, Pencil, Trash2, ChevronRight, Users, CalendarRange,
  MapPin, Banknote, X, Save, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  useIncentive,
  INCENTIVE_STATUSES,
  type IncentiveStatus,
  type IncentiveRequest,
} from "@/store/incentiveStore";
import { useAuth } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThaiDateInput } from "@/components/ThaiDateInput";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// ── Column config ─────────────────────────────────────────────────────────────

const COLUMN_CONFIG: Record<IncentiveStatus, { color: string; bg: string; dot: string; emoji: string }> = {
  "รับเรื่อง":     { color: "text-sky-700",    bg: "bg-sky-50 border-sky-200",     dot: "bg-sky-400",    emoji: "📥" },
  "ออกแบบแผน":    { color: "text-violet-700",  bg: "bg-violet-50 border-violet-200", dot: "bg-violet-400", emoji: "✏️" },
  "ส่ง Proposal": { color: "text-amber-700",   bg: "bg-amber-50 border-amber-200",  dot: "bg-amber-400",  emoji: "📤" },
  "รอยืนยัน":     { color: "text-orange-700",  bg: "bg-orange-50 border-orange-200", dot: "bg-orange-400", emoji: "⏳" },
  "ยืนยันแล้ว":   { color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", dot: "bg-emerald-400", emoji: "✅" },
  "ดำเนินการ":    { color: "text-primary",     bg: "bg-primary/5 border-primary/20",  dot: "bg-primary",    emoji: "🚀" },
};

// ── Blank form ────────────────────────────────────────────────────────────────

const blankForm = (): Omit<IncentiveRequest, "id" | "created_at" | "updated_at"> => ({
  company: "",
  contact: "",
  group_size: undefined,
  date_from: "",
  date_to: "",
  destination: "",
  budget: undefined,
  status: "รับเรื่อง",
  assigned_to: "",
  notes: "",
  created_by: "",
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso?: string) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
}

function fmtBudget(n?: number) {
  if (!n) return null;
  return n.toLocaleString("th-TH") + " ฿";
}

// ── Card Component ────────────────────────────────────────────────────────────

function IncentiveCard({
  req,
  onEdit,
  onDelete,
  onMove,
}: {
  req: IncentiveRequest;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (status: IncentiveStatus) => void;
}) {
  const cfg = COLUMN_CONFIG[req.status];
  const currentIdx = INCENTIVE_STATUSES.indexOf(req.status);
  const nextStatus = currentIdx < INCENTIVE_STATUSES.length - 1 ? INCENTIVE_STATUSES[currentIdx + 1] : null;

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-3 space-y-2 group hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-bold text-foreground leading-tight">{req.company}</p>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
          >
            <Pencil className="w-3 h-3 text-muted-foreground" />
          </button>
          <button
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10"
          >
            <Trash2 className="w-3 h-3 text-destructive" />
          </button>
        </div>
      </div>

      {/* Contact */}
      {req.contact && (
        <p className="text-[11px] text-muted-foreground">{req.contact}</p>
      )}

      {/* Info pills */}
      <div className="flex flex-wrap gap-1.5">
        {req.group_size && (
          <span className="flex items-center gap-1 text-[10px] bg-muted rounded-full px-2 py-0.5 font-medium">
            <Users className="w-3 h-3" /> {req.group_size} คน
          </span>
        )}
        {req.destination && (
          <span className="flex items-center gap-1 text-[10px] bg-muted rounded-full px-2 py-0.5 font-medium">
            <MapPin className="w-3 h-3" /> {req.destination}
          </span>
        )}
        {fmtBudget(req.budget) && (
          <span className="flex items-center gap-1 text-[10px] bg-muted rounded-full px-2 py-0.5 font-medium">
            <Banknote className="w-3 h-3" /> {fmtBudget(req.budget)}
          </span>
        )}
      </div>

      {/* Date range */}
      {(req.date_from || req.date_to) && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <CalendarRange className="w-3 h-3 shrink-0" />
          {fmtDate(req.date_from)} – {fmtDate(req.date_to)}
        </div>
      )}

      {/* Notes */}
      {req.notes && (
        <p className="text-[10px] text-muted-foreground italic line-clamp-2">{req.notes}</p>
      )}

      {/* Assigned + Move button */}
      <div className="flex items-center justify-between pt-1 border-t border-border/50">
        {req.assigned_to ? (
          <span className="text-[10px] font-medium text-muted-foreground">
            👤 {req.assigned_to}
          </span>
        ) : <span />}
        {nextStatus && (
          <button
            onClick={() => onMove(nextStatus)}
            className={cn(
              "flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors",
              COLUMN_CONFIG[nextStatus].bg,
              COLUMN_CONFIG[nextStatus].color,
              "hover:opacity-80"
            )}
          >
            {COLUMN_CONFIG[nextStatus].emoji} {nextStatus}
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
        {!nextStatus && (
          <span className="text-[10px] font-semibold text-emerald-600">🎉 เสร็จสิ้น</span>
        )}
      </div>
    </div>
  );
}

// ── Dialog Form ───────────────────────────────────────────────────────────────

function IncentiveDialog({
  open,
  onClose,
  initial,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  initial: Omit<IncentiveRequest, "id" | "created_at" | "updated_at">;
  onSave: (data: Omit<IncentiveRequest, "id" | "created_at" | "updated_at">) => void;
}) {
  const [form, setForm] = useState(initial);
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  // reset when dialog opens
  const handleOpenChange = (v: boolean) => { if (!v) onClose(); };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🎯 {initial.company ? "แก้ไข Incentive Request" : "เพิ่ม Incentive Request ใหม่"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 mt-2">
          {/* Company */}
          <div className="col-span-2">
            <Label>ชื่อบริษัท / กลุ่มลูกค้า *</Label>
            <Input className="mt-1" value={form.company}
              onChange={(e) => set({ company: e.target.value })}
              placeholder="บริษัท ABC จำกัด" />
          </div>

          {/* Contact */}
          <div>
            <Label>ผู้ติดต่อ</Label>
            <Input className="mt-1" value={form.contact ?? ""}
              onChange={(e) => set({ contact: e.target.value })}
              placeholder="คุณสมชาย" />
          </div>

          {/* Group size */}
          <div>
            <Label>จำนวนคน</Label>
            <Input className="mt-1" type="number" min={1}
              value={form.group_size ?? ""}
              onChange={(e) => set({ group_size: e.target.value ? Number(e.target.value) : undefined })}
              placeholder="50" />
          </div>

          {/* Date from */}
          <div>
            <Label>วันที่เดินทาง (จาก)</Label>
            <ThaiDateInput className="mt-1" value={form.date_from ?? ""}
              onChange={(e) => set({ date_from: e.target.value })} />
          </div>

          {/* Date to */}
          <div>
            <Label>วันที่เดินทาง (ถึง)</Label>
            <ThaiDateInput className="mt-1" value={form.date_to ?? ""}
              onChange={(e) => set({ date_to: e.target.value })} />
          </div>

          {/* Destination */}
          <div>
            <Label>ปลายทาง</Label>
            <Input className="mt-1" value={form.destination ?? ""}
              onChange={(e) => set({ destination: e.target.value })}
              placeholder="ญี่ปุ่น, เชียงใหม่..." />
          </div>

          {/* Budget */}
          <div>
            <Label>งบประมาณ (฿)</Label>
            <Input className="mt-1" type="number" min={0}
              value={form.budget ?? ""}
              onChange={(e) => set({ budget: e.target.value ? Number(e.target.value) : undefined })}
              placeholder="500000" />
          </div>

          {/* Status */}
          <div>
            <Label>สถานะ</Label>
            <select
              className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={form.status}
              onChange={(e) => set({ status: e.target.value as IncentiveStatus })}
            >
              {INCENTIVE_STATUSES.map((s) => (
                <option key={s} value={s}>{COLUMN_CONFIG[s].emoji} {s}</option>
              ))}
            </select>
          </div>

          {/* Assigned to */}
          <div>
            <Label>ผู้รับผิดชอบ</Label>
            <Input className="mt-1" value={form.assigned_to ?? ""}
              onChange={(e) => set({ assigned_to: e.target.value })}
              placeholder="ชื่อ OB..." />
          </div>

          {/* Notes */}
          <div className="col-span-2">
            <Label>หมายเหตุ</Label>
            <textarea
              rows={3}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
              value={form.notes ?? ""}
              onChange={(e) => set({ notes: e.target.value })}
              placeholder="รายละเอียดเพิ่มเติม..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-1" /> ยกเลิก
          </Button>
          <Button
            onClick={() => {
              if (!form.company.trim()) { toast.error("กรุณาใส่ชื่อบริษัท/กลุ่มลูกค้า"); return; }
              onSave(form);
            }}
            className="bg-primary text-primary-foreground"
          >
            <Save className="w-4 h-4 mr-1" /> บันทึก
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function IncentivePipeline() {
  const requests = useIncentive((s) => s.requests);
  const addRequest = useIncentive((s) => s.addRequest);
  const updateRequest = useIncentive((s) => s.updateRequest);
  const moveStatus = useIncentive((s) => s.moveStatus);
  const deleteRequest = useIncentive((s) => s.deleteRequest);
  const { user } = useAuth();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formInit, setFormInit] = useState<Omit<IncentiveRequest, "id" | "created_at" | "updated_at">>(blankForm());

  // Group requests by status
  const byStatus = useMemo(() => {
    const map: Record<IncentiveStatus, IncentiveRequest[]> = {
      "รับเรื่อง": [], "ออกแบบแผน": [], "ส่ง Proposal": [],
      "รอยืนยัน": [], "ยืนยันแล้ว": [], "ดำเนินการ": [],
    };
    for (const r of requests) {
      map[r.status].push(r);
    }
    return map;
  }, [requests]);

  const openAdd = () => {
    setEditId(null);
    setFormInit({ ...blankForm(), created_by: user?.full_name ?? "" });
    setDialogOpen(true);
  };

  const openEdit = (req: IncentiveRequest) => {
    setEditId(req.id);
    const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = req;
    setFormInit(rest);
    setDialogOpen(true);
  };

  const handleSave = (data: Omit<IncentiveRequest, "id" | "created_at" | "updated_at">) => {
    if (editId) {
      updateRequest(editId, data);
      toast.success("อัปเดตแล้ว");
    } else {
      addRequest(data);
      toast.success("✅ เพิ่ม Incentive Request แล้ว");
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    if (!confirm("ลบ request นี้?")) return;
    deleteRequest(id);
    toast.success("ลบแล้ว");
  };

  return (
    <div className="p-4 md:p-6 space-y-4 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            🎯 Incentive Pipeline
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            ติดตามโปรเจกต์ทัวร์ Incentive — {requests.length} รายการ
          </p>
        </div>
        <Button onClick={openAdd} className="bg-primary text-primary-foreground">
          <Plus className="w-4 h-4 mr-1" /> เพิ่ม Request
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 pb-6">
        {INCENTIVE_STATUSES.map((status) => {
          const cfg = COLUMN_CONFIG[status];
          const cards = byStatus[status];
          return (
            <div key={status} className="flex flex-col gap-2 min-w-0">
              {/* Column header */}
              <div className={cn("flex items-center gap-2 px-3 py-2 rounded-xl border", cfg.bg)}>
                <span className="text-base">{cfg.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-xs font-bold truncate", cfg.color)}>{status}</p>
                  <p className="text-[10px] text-muted-foreground">{cards.length} รายการ</p>
                </div>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-2 flex-1">
                {cards.map((req) => (
                  <IncentiveCard
                    key={req.id}
                    req={req}
                    onEdit={() => openEdit(req)}
                    onDelete={() => handleDelete(req.id)}
                    onMove={(s) => {
                      moveStatus(req.id, s);
                      toast.success(`ย้ายไป "${s}" แล้ว`);
                    }}
                  />
                ))}

                {/* Add to this column */}
                <button
                  onClick={() => {
                    setEditId(null);
                    setFormInit({ ...blankForm(), status, created_by: user?.full_name ?? "" });
                    setDialogOpen(true);
                  }}
                  className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors w-full"
                >
                  <Plus className="w-3.5 h-3.5" /> เพิ่มที่นี่
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dialog */}
      {dialogOpen && (
        <IncentiveDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          initial={formInit}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
