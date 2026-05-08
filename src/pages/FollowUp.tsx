import { useMemo, useState } from "react";
import { Phone, MessageCircle, Calendar as CalendarIcon, AlertCircle, Clock, Pencil, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useCRM, urgencyBadge, LEAD_STATUSES, LOST_REASONS, type Lead, type Customer, type LeadStatus } from "@/store/crmStore";
import { EditCustomerDialog } from "@/components/EditCustomerDialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function FollowUp() {
  const leads = useCRM((s) => s.leads);
  const customers = useCRM((s) => s.customers);
  const currentRep = useCRM((s) => s.currentRep);
  const updateLead = useCRM((s) => s.updateLead);
  const updateLeadStatus = useCRM((s) => s.updateLeadStatus);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [statusLead, setStatusLead] = useState<Lead | null>(null);
  const [stStatus, setStStatus] = useState<LeadStatus>("Contacted");
  const [stNote, setStNote] = useState("");
  const [stNext, setStNext] = useState<Date | undefined>(undefined);
  const [stLost, setStLost] = useState<string>(LOST_REASONS[0]);

  const openStatus = (l: Lead) => {
    setStatusLead(l);
    setStStatus(l.status);
    setStNote("");
    setStNext(l.next_followup_date ? new Date(l.next_followup_date) : undefined);
    setStLost(l.lost_reason ?? LOST_REASONS[0]);
  };

  const saveStatus = () => {
    if (!statusLead) return;
    const closed = ["Closed Won", "Closed Lost"].includes(stStatus);
    if (stStatus === "Closed Lost") {
      updateLeadStatus(statusLead.lead_id, "Closed Lost", stLost);
    } else if (stStatus !== statusLead.status) {
      updateLeadStatus(statusLead.lead_id, stStatus);
    }
    updateLead(statusLead.lead_id, {
      next_followup_date: closed ? null : (stNext ? stNext.toISOString().split("T")[0] : statusLead.next_followup_date),
    });
    if (stNote.trim()) {
      // Append note to program text as a lightweight log
      updateLead(statusLead.lead_id, {
        program: `${statusLead.program}\n[${new Date().toLocaleDateString("th-TH")}] ${stNote.trim()}`,
      });
    }
    toast.success("อัปเดตสถานะลูกค้าแล้ว");
    setStatusLead(null);
  };

  const visible = useMemo(() => leads.filter((l) =>
    l.next_followup_date && !["Closed Won", "Closed Lost"].includes(l.status) &&
    (currentRep === "All" || l.assigned_to === currentRep),
  ), [leads, currentRep]);

  const today = new Date().toISOString().split("T")[0];
  const overdue = visible.filter((l) => l.next_followup_date! < today).sort((a, b) => a.next_followup_date!.localeCompare(b.next_followup_date!));
  const todays = visible.filter((l) => l.next_followup_date === today);
  const upcoming = visible.filter((l) => l.next_followup_date! > today).sort((a, b) => a.next_followup_date!.localeCompare(b.next_followup_date!));

  const cust = (id: string) => customers.find((c) => c.customer_id === id);

  const Card = ({ lead }: { lead: Lead }) => {
    const c = cust(lead.customer_id);
    return (
      <div className="bg-card rounded-lg border p-3 flex flex-col md:flex-row md:items-center gap-3 shadow-soft">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold">{c?.full_name}</p>
            <Badge variant="outline" className={`${urgencyBadge(lead.urgency)} text-[10px]`}>{lead.urgency}</Badge>
            <span className="text-xs text-muted-foreground">{c?.company !== "-" ? c?.company : "B2C"}</span>
            {c && (
              <button onClick={() => setEditing(c)} className="ml-auto md:ml-0 inline-flex items-center gap-1 text-[11px] text-primary hover:text-accent transition-smooth">
                <Pencil className="w-3 h-3" /> แก้ไข
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{lead.program}</p>
          <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><CalendarIcon className="w-3 h-3" /> {lead.next_followup_date}</span>
            <span>👤 {lead.assigned_to}</span>
            <span>📌 {lead.status}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => openStatus(lead)} className="border-primary/40 text-primary hover:bg-primary/10">
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Update Status
          </Button>
          <a href={`tel:${c?.phone}`} className="px-3 py-1.5 rounded-md bg-primary/10 text-primary text-xs flex items-center gap-1.5 hover:bg-primary/20">
            <Phone className="w-3.5 h-3.5" /> {c?.phone}
          </a>
          <span className="px-3 py-1.5 rounded-md bg-success/10 text-success text-xs flex items-center gap-1.5">
            <MessageCircle className="w-3.5 h-3.5" /> {c?.line_id}
          </span>
        </div>
      </div>
    );
  };

  const Section = ({ title, items, icon: Icon, colorClass }: { title: string; items: Lead[]; icon: typeof Clock; colorClass: string }) => (
    <section className="space-y-2">
      <div className={`flex items-center gap-2 ${colorClass}`}>
        <Icon className="w-5 h-5" />
        <h2 className="font-bold">{title}</h2>
        <span className="text-sm">({items.length})</span>
      </div>
      <div className="space-y-2">
        {items.length === 0 ? <p className="text-sm text-muted-foreground pl-7">— ไม่มีรายการ —</p> : items.map((l) => <Card key={l.lead_id} lead={l} />)}
      </div>
    </section>
  );

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ตาราง Follow Up</h1>
        <p className="text-sm text-muted-foreground">นัดหมายติดตามลูกค้า {currentRep !== "All" && `— ${currentRep}`}</p>
      </div>
      <Section title="เลยกำหนด (Overdue)" items={overdue} icon={AlertCircle} colorClass="text-destructive" />
      <Section title="วันนี้ (Today)" items={todays} icon={Clock} colorClass="text-warning-foreground" />
      <Section title="นัดหมายล่วงหน้า (Upcoming)" items={upcoming} icon={CalendarIcon} colorClass="text-primary" />
      <EditCustomerDialog customer={editing} onClose={() => setEditing(null)} />

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
                <Label>สถานะ (อ้างอิง Sales Pipeline)</Label>
                <Select value={stStatus} onValueChange={(v) => setStStatus(v as LeadStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEAD_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {stStatus === "Closed Lost" && (
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
                <Textarea rows={3} value={stNote} onChange={(e) => setStNote(e.target.value)} placeholder="สรุปการคุย, ข้อตกลง, สิ่งที่ลูกค้าต้องการ..." />
              </div>
              {!["Closed Won", "Closed Lost"].includes(stStatus) && (
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