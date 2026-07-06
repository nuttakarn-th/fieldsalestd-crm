import { useMemo, useState } from "react";
import { ThaiDateInput } from "@/components/ThaiDateInput";
import { Pencil, AlertCircle, Calendar, Users, RefreshCw, User as UserIcon, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { VoiceTextarea } from "@/components/VoiceTextarea";
import { toast } from "sonner";
import {
  useCRM, formatTHB, statusColor, urgencyBadge, tierBadge,
  LEAD_STATUSES, OB_LEAD_STATUSES, OB_STAGE_META, LOST_REASONS,
  isLostStatus,
  type LeadStatus, type Lead, type Customer,
} from "@/store/crmStore";
import { useCurrentUser } from "@/store/authStore";
import { EditCustomerDialog } from "@/components/EditCustomerDialog";
import { CustomerLeadDialog } from "@/components/CustomerLeadDialog";

export default function Pipeline() {
  const leads = useCRM((s) => s.leads);
  const customers = useCRM((s) => s.customers);
  const currentRep = useCRM((s) => s.currentRep);
  const updateLeadStatus = useCRM((s) => s.updateLeadStatus);
  const updateLead = useCRM((s) => s.updateLead);
  const user = useCurrentUser();
  const isOB = user?.role === "OB Co-ordinator";
  const activeStatuses = isOB ? OB_LEAD_STATUSES : LEAD_STATUSES;

  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [addLeadCustomerId, setAddLeadCustomerId] = useState<string | null>(null);
  const [pendingLost, setPendingLost] = useState<string | null>(null);
  const [reason, setReason] = useState(LOST_REASONS[0]);

  // Update-Status dialog state
  const [statusOpen, setStatusOpen] = useState<Lead | null>(null);
  const [newStatus, setNewStatus] = useState<LeadStatus>("New"); // overridden by isOB below
  const [newNote, setNewNote] = useState("");
  const [newFollowup, setNewFollowup] = useState("");

  const openStatusDialog = (lead: Lead) => {
    setStatusOpen(lead);
    setNewStatus(lead.status);
    setNewNote(lead.status_note ?? "");
    setNewFollowup(lead.next_followup_date ?? "");
  };

  const submitStatusUpdate = () => {
    if (!statusOpen) return;
    if (isLostStatus(newStatus) && !newNote.trim()) {
      // need lost_reason → fallback to dialog
      setPendingLost(statusOpen.lead_id);
      setReason(LOST_REASONS[0]);
      setStatusOpen(null);
      return;
    }
    // Update non-status fields first (note + follow-up)
    updateLead(statusOpen.lead_id, {
      status_note: newNote || null,
      next_followup_date: newFollowup || null,
    });
    // Then update status (handles closed_date etc.)
    if (newStatus !== statusOpen.status) {
      updateLeadStatus(statusOpen.lead_id, newStatus);
    }
    toast.success("อัปเดต Status เรียบร้อย");
    setStatusOpen(null);
  };

  const visible = useMemo(() => {
    const customerIds = new Set(customers.map((c) => c.customer_id));
    const base = currentRep === "All" ? leads : leads.filter((l) => l.assigned_to === currentRep);
    // กรอง leads ที่ customer ถูกลบออกไปแล้ว (ไม่แสดง "(ลูกค้าถูกลบ)")
    return base.filter((l) => customerIds.has(l.customer_id));
  }, [leads, customers, currentRep]);

  const grouped = useMemo(() => {
    const map: Partial<Record<LeadStatus, Lead[]>> = {};
    activeStatuses.forEach((s) => { map[s] = []; });
    visible.forEach((l) => {
      if (map[l.status] !== undefined) map[l.status]!.push(l);
    });
    return map;
  }, [visible, activeStatuses]);

  const handleStatusChange = (leadId: string, newStatus: LeadStatus) => {
    if (isLostStatus(newStatus)) {
      setPendingLost(leadId);
      setReason(LOST_REASONS[0]);
    } else {
      updateLeadStatus(leadId, newStatus);
      toast.success(`ย้ายไปสถานะ ${newStatus}`);
    }
  };

  const confirmLost = () => {
    if (pendingLost) {
      const lostStatus = isOB ? "ยกเลิก" : "Closed Lost";
      updateLeadStatus(pendingLost, lostStatus, reason);
      toast.error(`${lostStatus}: ${reason}`);
    }
    setPendingLost(null);
  };

  const cust = (id: string) => customers.find((c) => c.customer_id === id);

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Sales Pipeline</h1>
        <p className="text-sm text-muted-foreground">
          Kanban — {visible.length} leads {currentRep !== "All" && `• ผู้รับผิดชอบ: ${currentRep}`}
        </p>
      </div>

      <div className={`grid gap-3 ${isOB ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-4" : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6"}`}>
        {activeStatuses.map((status) => {
          const items = grouped[status] ?? [];
          const total = items.reduce((s, l) => s + (l.quoted_price || 0), 0);
          const obMeta = OB_STAGE_META[status];
          return (
            <div key={status} className="bg-muted/30 rounded-xl p-3 border min-w-0">
              <div className="flex items-center justify-between mb-1">
                <Badge variant="outline" className={statusColor(status)}>
                  {obMeta ? `${obMeta.emoji} ${status}` : status}
                </Badge>
                <span className="text-xs font-semibold">{items.length}</span>
              </div>
              {obMeta && <p className="text-[10px] text-muted-foreground mb-2 leading-tight">{obMeta.desc}</p>}
              {total > 0 && <div className="text-[11px] text-muted-foreground mb-2">{formatTHB(total)}</div>}
              <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                {items.map((lead) => {
                  const c = cust(lead.customer_id);
                  const noContact = !c || ((!c.phone || c.phone === "-") && !c.line_id);
                  return (
                    <div key={lead.lead_id} className="bg-card rounded-lg p-3 border shadow-soft hover:shadow-pop transition-smooth">
                      {/* ⚠️ Quick Inquiry — ยังไม่มีข้อมูลติดต่อ */}
                      {noContact && (
                        <div className="bg-warning/10 text-warning-foreground text-[11px] px-2 py-1 rounded mb-2 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" /> Quick Inquiry — ยังไม่มีข้อมูลติดต่อ
                        </div>
                      )}
                      {isLostStatus(lead.status) && lead.lost_reason && (
                        <div className="bg-destructive/10 text-destructive text-[11px] px-2 py-1 rounded mb-2 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" /> {lead.lost_reason}
                        </div>
                      )}
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{c?.full_name ?? "(ลูกค้าถูกลบ)"}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{c?.company !== "-" ? c?.company : "B2C"}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {c && (
                            <button onClick={() => setEditingCustomer(c)} title="แก้ไขข้อมูลลูกค้า" className="text-muted-foreground hover:text-primary">
                              <UserIcon className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button onClick={() => setAddLeadCustomerId(lead.customer_id)} title="สร้าง Lead ใหม่ (ลูกค้าเดิม)" className="text-muted-foreground hover:text-success">
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => openStatusDialog(lead)} title="Update Status + Note + Follow-up" className="text-muted-foreground hover:text-primary">
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 mb-2">
                        {c && <Badge variant="outline" className={`${tierBadge(c.customer_tier)} text-[10px] px-1.5 py-0`}>{c.customer_tier}</Badge>}
                        <Badge variant="outline" className={`${urgencyBadge(lead.urgency)} text-[10px] px-1.5 py-0`}>{lead.urgency}</Badge>
                      </div>
                      <p className="text-xs text-foreground/80 line-clamp-2 mb-2">{lead.program}</p>
                      <div className="grid grid-cols-2 gap-1 text-[11px] text-muted-foreground mb-2">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {lead.pax_count} pax</span>
                        <span>{lead.travel_month}</span>
                        <span>💰 {lead.budget_range}</span>
                        <span>👤 {lead.assigned_to}</span>
                        {lead.next_followup_date && (
                          <span className="col-span-2 flex items-center gap-1"><Calendar className="w-3 h-3" /> {lead.next_followup_date}</span>
                        )}
                      </div>
                      {lead.quoted_price > 0 && <div className="text-sm font-bold text-primary mb-2">{formatTHB(lead.quoted_price)}</div>}
                      {lead.status_note && (
                        <p className="text-[11px] text-muted-foreground italic line-clamp-2 mb-2 bg-muted/40 rounded px-2 py-1">📝 {lead.status_note}</p>
                      )}
                      <Button size="sm" variant="outline" className="w-full h-7 text-[11px]" onClick={() => openStatusDialog(lead)}>
                        <RefreshCw className="w-3 h-3 mr-1" /> Update Status
                      </Button>
                    </div>
                  );
                })}
                {items.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">ไม่มี Lead</p>}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!pendingLost} onOpenChange={(v) => !v && setPendingLost(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isOB ? "ระบุเหตุผลที่ยกเลิก" : "ระบุเหตุผลที่เสียดีล (Lost Reason)"}</DialogTitle></DialogHeader>
          <Label>เหตุผลหลัก *</Label>
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{LOST_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingLost(null)}>ยกเลิก</Button>
            <Button variant="destructive" onClick={confirmLost}>{isOB ? "ยืนยันการยกเลิก" : "ยืนยัน Closed Lost"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EditCustomerDialog customer={editingCustomer} onClose={() => setEditingCustomer(null)} />

      {/* สร้าง Lead ใหม่ให้ลูกค้าเดิม — เปิดจากปุ่ม ➕ บน card */}
      <CustomerLeadDialog
        open={!!addLeadCustomerId}
        onOpenChange={(v) => { if (!v) setAddLeadCustomerId(null); }}
        prefilledCustomerId={addLeadCustomerId ?? undefined}
      />

      <Dialog open={!!statusOpen} onOpenChange={(o) => !o && setStatusOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Update Status — {cust(statusOpen?.customer_id ?? "")?.full_name ?? statusOpen?.lead_id}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Status ใหม่ *</Label>
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v as LeadStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {activeStatuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {OB_STAGE_META[s] ? `${OB_STAGE_META[s].emoji} ${s}` : s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>โน้ต / รายละเอียดการคุยล่าสุด</Label>
              <VoiceTextarea
                rows={3}
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="เช่น คุยกับลูกค้าทาง LINE, ลูกค้าขอราคาเพิ่ม 2 คน..."
              />
            </div>
            <div>
              <Label>นัด Follow-up รอบถัดไป</Label>
              <ThaiDateInput value={newFollowup} onChange={(e) => setNewFollowup(e.target.value)} />
              <p className="text-[11px] text-muted-foreground mt-1">เว้นว่างถ้ายังไม่นัด</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusOpen(null)}>ยกเลิก</Button>
            <Button onClick={submitStatusUpdate} className="bg-gradient-primary text-primary-foreground">บันทึก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}