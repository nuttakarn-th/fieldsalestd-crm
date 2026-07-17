import { useMemo, useState } from "react";
import { fmtDateStr } from "@/lib/dateUtils";
import { Phone, Calendar as CalendarIcon, AlertCircle, Clock, RefreshCw, ClipboardCheck } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { VoiceTextarea } from "@/components/VoiceTextarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useCRM, urgencyBadge, statusColor, LEAD_STATUSES, LOST_REASONS, type Lead, type LeadStatus } from "@/store/crmStore";
import { useAuth } from "@/store/authStore";
import { FollowupLogDialog } from "@/components/FollowupLogDialog";
import { EditCustomerDialog } from "@/components/EditCustomerDialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const RESULT_COLOR: Record<string, string> = {
  "ไม่เจอ/ไม่รับ": "bg-slate-100 text-slate-600",
  "เจอแต่ไม่ว่าง":  "bg-amber-100 text-amber-700",
  "คุยแล้ว":        "bg-blue-100 text-blue-700",
  "นัดได้แล้ว":     "bg-emerald-100 text-emerald-700",
};

export default function FollowUp() {
  const leads        = useCRM((s) => s.leads);
  const customers    = useCRM((s) => s.customers);
  const currentRep   = useCRM((s) => s.currentRep);
  const updateLead   = useCRM((s) => s.updateLead);
  const updateLeadStatus = useCRM((s) => s.updateLeadStatus);

  // ── Department scoping ────────────────────────────────────────────────
  const authUsers     = useAuth((s) => s.users);
  const currentUserId = useAuth((s) => s.currentUserId);
  const currentUser   = authUsers.find((u) => u.user_id === currentUserId);
  const currentRole   = currentUser?.role ?? "";
  const isOBManager   = currentRole === "OB Manager";
  const isSalesManager = currentRole === "Sales Manager";
  const obRepNames    = new Set(
    authUsers.filter((u) => u.role === "OB Co-ordinator").map((u) => u.full_name)
  );

  // ── Dialog state ──────────────────────────────────────────────────────
  const [editing,    setEditing]    = useState<typeof customers[0] | null>(null);
  const [statusLead, setStatusLead] = useState<Lead | null>(null);
  const [logLead,    setLogLead]    = useState<Lead | null>(null);
  const [stStatus,   setStStatus]   = useState<LeadStatus>("ติดต่อแล้ว");
  const [stNote,     setStNote]     = useState("");
  const [stNext,     setStNext]     = useState<Date | undefined>(undefined);
  const [stLost,     setStLost]     = useState<string>(LOST_REASONS[0]);

  const openStatus = (l: Lead) => {
    setStatusLead(l);
    setStStatus(l.status);
    setStNote("");
    setStNext(l.next_followup_date ? new Date(l.next_followup_date) : undefined);
    setStLost(l.lost_reason ?? LOST_REASONS[0]);
  };

  const saveStatus = () => {
    if (!statusLead) return;
    const closed = ["จองแล้ว", "ยกเลิก"].includes(stStatus);
    if (stStatus === "ยกเลิก") {
      updateLeadStatus(statusLead.lead_id, "ยกเลิก", stLost);
    } else if (stStatus !== statusLead.status) {
      updateLeadStatus(statusLead.lead_id, stStatus);
    }
    updateLead(statusLead.lead_id, {
      next_followup_date: closed ? null : (stNext ? stNext.toISOString().split("T")[0] : statusLead.next_followup_date),
    });
    if (stNote.trim()) {
      updateLead(statusLead.lead_id, {
        program: `${statusLead.program}\n[${new Date().toLocaleDateString("th-TH")}] ${stNote.trim()}`,
      });
    }
    toast.success("อัปเดตสถานะลูกค้าแล้ว");
    setStatusLead(null);
  };

  // ── Data ──────────────────────────────────────────────────────────────
  const visible = useMemo(() => leads.filter((l) => {
    if (!l.next_followup_date) return false;
    if (["จองแล้ว", "ยกเลิก"].includes(l.status)) return false;
    if (isOBManager)   return obRepNames.has(l.assigned_to ?? "");
    if (isSalesManager) return !obRepNames.has(l.assigned_to ?? "");
    return currentRep === "All" || l.assigned_to === currentRep;
  }), [leads, currentRep, isOBManager, isSalesManager, obRepNames]);

  const today    = new Date().toISOString().split("T")[0];
  const overdue  = visible.filter((l) => l.next_followup_date! < today).sort((a, b) => a.next_followup_date!.localeCompare(b.next_followup_date!));
  const todays   = visible.filter((l) => l.next_followup_date === today);
  const upcoming = visible.filter((l) => l.next_followup_date! > today).sort((a, b) => a.next_followup_date!.localeCompare(b.next_followup_date!));

  const cust = (id: string) => customers.find((c) => c.customer_id === id);

  // ── Table Row ─────────────────────────────────────────────────────────
  const TableRow = ({ lead, dateClass }: { lead: Lead; dateClass: string }) => {
    const c       = cust(lead.customer_id);
    const logs    = lead.followup_logs ?? [];
    const lastLog = logs[logs.length - 1];

    return (
      <tr className="border-b border-border hover:bg-muted/30 transition-colors group">
        {/* วันนัด */}
        <td className={`pl-3 pr-2 py-1.5 text-xs font-semibold whitespace-nowrap ${dateClass}`}>
          {fmtDateStr(lead.next_followup_date)}
        </td>

        {/* ชื่อลูกค้า */}
        <td className="px-2 py-1.5 whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => c && setEditing(c)}
              className="text-sm font-semibold hover:text-primary transition-colors"
            >
              {c?.full_name ?? "—"}
            </button>
            <span className={`text-[10px] px-1.5 py-0 rounded-full border font-semibold leading-4 ${urgencyBadge(lead.urgency)}`}>
              {lead.urgency}
            </span>
          </div>
          {c?.phone && (
            <a href={`tel:${c.phone}`} className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-0.5 mt-0.5">
              <Phone className="w-2.5 h-2.5" />{c.phone}
            </a>
          )}
        </td>

        {/* โปรแกรม */}
        <td className="px-2 py-1.5 max-w-[220px]">
          <p className="text-xs text-foreground/80 truncate">{lead.program || lead.bu_type}</p>
          <p className="text-[10px] text-muted-foreground">{lead.pax_count} ท่าน</p>
        </td>

        {/* สถานะ */}
        <td className="px-2 py-1.5 whitespace-nowrap">
          <Badge variant="outline" className={`${statusColor(lead.status)} text-[10px] px-1.5 py-0`}>
            {lead.status}
          </Badge>
        </td>

        {/* Assigned */}
        <td className="px-2 py-1.5 text-[11px] text-muted-foreground whitespace-nowrap">
          {lead.assigned_to}
        </td>

        {/* ผลล่าสุด */}
        <td className="px-2 py-1.5">
          {lastLog ? (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap ${RESULT_COLOR[lastLog.result] ?? "bg-muted text-muted-foreground"}`}>
              {lastLog.result}
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground/50">—</span>
          )}
        </td>

        {/* Actions */}
        <td className="pl-2 pr-3 py-1.5">
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              onClick={() => setLogLead(lead)}
              className="h-6 px-2 text-[11px] bg-violet-600 hover:bg-violet-700 text-white gap-1"
            >
              <ClipboardCheck className="w-3 h-3" />
              <span className="hidden lg:inline">บันทึกผล</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => openStatus(lead)}
              className="h-6 px-2 text-[11px] border-primary/30 text-primary hover:bg-primary/10 gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span className="hidden lg:inline">Update</span>
            </Button>
          </div>
        </td>
      </tr>
    );
  };

  // ── Section header row ────────────────────────────────────────────────
  const SectionRow = ({
    label, count, bgClass, textClass, icon: Icon,
  }: { label: string; count: number; bgClass: string; textClass: string; icon: typeof Clock }) => (
    <tr className={bgClass}>
      <td colSpan={7} className={`px-3 py-1 text-xs font-bold ${textClass}`}>
        <span className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5" />
          {label}
          <span className="ml-1 px-1.5 py-0 rounded-full bg-white/60 text-inherit">{count}</span>
        </span>
      </td>
    </tr>
  );

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">ตาราง Follow Up</h1>
        <p className="text-sm text-muted-foreground">
          นัดหมายติดตามลูกค้า {currentRep !== "All" && `— ${currentRep}`}
        </p>
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-xl border p-4 shadow-soft flex items-center gap-3">
          <div className="p-2 rounded-lg bg-destructive/15 text-destructive shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">เลยกำหนด</p>
            <p className="text-3xl font-extrabold leading-none text-destructive">{overdue.length}</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border p-4 shadow-soft flex items-center gap-3">
          <div className="p-2 rounded-lg bg-warning/20 text-warning-foreground shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">วันนี้</p>
            <p className="text-3xl font-extrabold leading-none text-warning-foreground">{todays.length}</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border p-4 shadow-soft flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">ล่วงหน้า</p>
            <p className="text-3xl font-extrabold leading-none text-primary">{upcoming.length}</p>
          </div>
        </div>
      </div>

      {/* Compact Table */}
      <div className="bg-card rounded-xl border shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            {/* Column headers */}
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="pl-3 pr-2 py-2 text-left text-[11px] font-semibold text-muted-foreground whitespace-nowrap">วันนัด</th>
                <th className="px-2 py-2 text-left text-[11px] font-semibold text-muted-foreground">ชื่อลูกค้า</th>
                <th className="px-2 py-2 text-left text-[11px] font-semibold text-muted-foreground">โปรแกรม</th>
                <th className="px-2 py-2 text-left text-[11px] font-semibold text-muted-foreground">สถานะ</th>
                <th className="px-2 py-2 text-left text-[11px] font-semibold text-muted-foreground">ผู้รับผิดชอบ</th>
                <th className="px-2 py-2 text-left text-[11px] font-semibold text-muted-foreground">ผลล่าสุด</th>
                <th className="pl-2 pr-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* Overdue section */}
              {overdue.length > 0 && (
                <>
                  <SectionRow label="เลยกำหนด" count={overdue.length} bgClass="bg-destructive/8" textClass="text-destructive" icon={AlertCircle} />
                  {overdue.map((l) => <TableRow key={l.lead_id} lead={l} dateClass="text-destructive" />)}
                </>
              )}

              {/* Today section */}
              {todays.length > 0 && (
                <>
                  <SectionRow label="วันนี้" count={todays.length} bgClass="bg-amber-50" textClass="text-amber-700" icon={Clock} />
                  {todays.map((l) => <TableRow key={l.lead_id} lead={l} dateClass="text-amber-600 font-bold" />)}
                </>
              )}

              {/* Upcoming section */}
              {upcoming.length > 0 && (
                <>
                  <SectionRow label="นัดหมายล่วงหน้า" count={upcoming.length} bgClass="bg-primary/5" textClass="text-primary" icon={CalendarIcon} />
                  {upcoming.map((l) => <TableRow key={l.lead_id} lead={l} dateClass="text-primary" />)}
                </>
              )}

              {/* Empty state */}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-sm text-muted-foreground">
                    ✅ ไม่มีรายการที่ต้อง Follow Up
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Dialogs ── */}
      <EditCustomerDialog customer={editing} onClose={() => setEditing(null)} />

      {logLead && (
        <FollowupLogDialog
          lead={logLead}
          customerName={cust(logLead.customer_id)?.full_name ?? "ลูกค้า"}
          open={!!logLead}
          onOpenChange={(v) => { if (!v) setLogLead(null); }}
        />
      )}

      <Dialog open={!!statusLead} onOpenChange={(o) => !o && setStatusLead(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>อัปเดตสถานะลูกค้า</DialogTitle></DialogHeader>
          {statusLead && (
            <div className="space-y-3">
              <div className="rounded-lg bg-muted/40 p-3 text-sm">
                <p className="font-semibold">{cust(statusLead.customer_id)?.full_name}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{statusLead.program}</p>
              </div>
              <div>
                <Label>สถานะ</Label>
                <Select value={stStatus} onValueChange={(v) => setStStatus(v as LeadStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEAD_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {stStatus === "ยกเลิก" && (
                <div>
                  <Label>เหตุผลที่เสียดีล</Label>
                  <Select value={stLost} onValueChange={setStLost}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LOST_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>บันทึกรายละเอียด</Label>
                <VoiceTextarea rows={3} value={stNote} onChange={(e) => setStNote(e.target.value)} placeholder="สรุปการคุย, ข้อตกลง, สิ่งที่ลูกค้าต้องการ..." />
              </div>
              {!["จองแล้ว", "ยกเลิก"].includes(stStatus) && (
                <div>
                  <Label>นัด Follow up รอบถัดไป</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start", !stNext && "text-muted-foreground")}>
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        {stNext ? format(stNext, "EEE d MMM yyyy") : "เลือกวันที่"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={stNext} onSelect={setStNext} initialFocus className={cn("p-3 pointer-events-auto")} />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusLead(null)}>ยกเลิก</Button>
            <Button onClick={saveStatus} className="bg-gradient-primary text-primary-foreground">บันทึก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
