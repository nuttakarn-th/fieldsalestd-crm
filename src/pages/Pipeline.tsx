import { useMemo, useState } from "react";
import { Pencil, AlertCircle, Calendar, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  useCRM, formatTHB, statusColor, urgencyBadge, tierBadge,
  LEAD_STATUSES, LOST_REASONS, type LeadStatus, type Lead, type Customer,
} from "@/store/crmStore";
import { EditCustomerDialog } from "@/components/EditCustomerDialog";

export default function Pipeline() {
  const leads = useCRM((s) => s.leads);
  const customers = useCRM((s) => s.customers);
  const currentRep = useCRM((s) => s.currentRep);
  const updateLeadStatus = useCRM((s) => s.updateLeadStatus);

  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [pendingLost, setPendingLost] = useState<string | null>(null);
  const [reason, setReason] = useState(LOST_REASONS[0]);

  const visible = useMemo(
    () => (currentRep === "All" ? leads : leads.filter((l) => l.assigned_to === currentRep)),
    [leads, currentRep],
  );

  const grouped = useMemo(() => {
    const map: Record<LeadStatus, Lead[]> = {
      "New": [], "Contacted": [], "Quotation Sent": [], "Negotiating": [], "Closed Won": [], "Closed Lost": [],
    };
    visible.forEach((l) => map[l.status].push(l));
    return map;
  }, [visible]);

  const handleStatusChange = (leadId: string, newStatus: LeadStatus) => {
    if (newStatus === "Closed Lost") {
      setPendingLost(leadId);
      setReason(LOST_REASONS[0]);
    } else {
      updateLeadStatus(leadId, newStatus);
      toast.success(`ย้ายไปสถานะ ${newStatus}`);
    }
  };

  const confirmLost = () => {
    if (pendingLost) {
      updateLeadStatus(pendingLost, "Closed Lost", reason);
      toast.error(`Closed Lost: ${reason}`);
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-3">
        {LEAD_STATUSES.map((status) => {
          const items = grouped[status];
          const total = items.reduce((s, l) => s + (l.quoted_price || 0), 0);
          return (
            <div key={status} className="bg-muted/30 rounded-xl p-3 border min-w-0">
              <div className="flex items-center justify-between mb-3">
                <Badge variant="outline" className={statusColor(status)}>{status}</Badge>
                <span className="text-xs font-semibold">{items.length}</span>
              </div>
              {total > 0 && <div className="text-[11px] text-muted-foreground mb-2">{formatTHB(total)}</div>}
              <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                {items.map((lead) => {
                  const c = cust(lead.customer_id);
                  return (
                    <div key={lead.lead_id} className="bg-card rounded-lg p-3 border shadow-soft hover:shadow-pop transition-smooth">
                      {lead.status === "Closed Lost" && lead.lost_reason && (
                        <div className="bg-destructive/10 text-destructive text-[11px] px-2 py-1 rounded mb-2 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" /> {lead.lost_reason}
                        </div>
                      )}
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{c?.full_name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{c?.company !== "-" ? c?.company : "B2C"}</p>
                        </div>
                        <button onClick={() => c && setEditingCustomer(c)} className="shrink-0 text-muted-foreground hover:text-primary">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
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
                      <Select value={lead.status} onValueChange={(v) => handleStatusChange(lead.lead_id, v as LeadStatus)}>
                        <SelectTrigger className="h-7 text-[11px]"><SelectValue /></SelectTrigger>
                        <SelectContent>{LEAD_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
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
          <DialogHeader><DialogTitle>ระบุเหตุผลที่เสียดีล (Lost Reason)</DialogTitle></DialogHeader>
          <Label>เหตุผลหลัก *</Label>
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{LOST_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingLost(null)}>ยกเลิก</Button>
            <Button variant="destructive" onClick={confirmLost}>ยืนยัน Closed Lost</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EditCustomerDialog customer={editingCustomer} onClose={() => setEditingCustomer(null)} />
    </div>
  );
}