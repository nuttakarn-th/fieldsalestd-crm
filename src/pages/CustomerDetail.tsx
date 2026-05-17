import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Pencil, Plus, Phone, MessageCircle, Mail, MapPin, Cake, Star,
  TrendingUp, CalendarDays, Clock, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useCRM, formatTHB, tierBadge, statusColor, urgencyBadge,
  LEAD_STATUSES, URGENCY_OPTIONS,
  type Customer, type Lead, type LeadStatus,
} from "@/store/crmStore";
import { EditCustomerDialog } from "@/components/EditCustomerDialog";
import { CustomerLeadDialog } from "@/components/CustomerLeadDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

// interest key → short label + color (same as Customers.tsx)
const INTEREST_STYLE: Record<string, { label: string; className: string }> = {
  "ทัวร์ต่างประเทศ":  { label: "✈️ ทัวร์ต่างประเทศ",   className: "bg-blue-100 text-blue-700 border-blue-200" },
  "ทัวร์ภายในประเทศ": { label: "🏔️ ทัวร์ภายในประเทศ",  className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  "เช่ารถ ท่องเที่ยว":{ label: "🚗 เช่ารถท่องเที่ยว",  className: "bg-amber-100 text-amber-700 border-amber-200" },
  "จองตั๋วเครื่องบิน":{ label: "🎫 จองตั๋วเครื่องบิน", className: "bg-sky-100 text-sky-700 border-sky-200" },
  "โรงแรม":           { label: "🏨 โรงแรม",            className: "bg-purple-100 text-purple-700 border-purple-200" },
  "Visa":             { label: "📋 Visa",              className: "bg-rose-100 text-rose-700 border-rose-200" },
  "ประกันการเดินทาง": { label: "🛡️ ประกันการเดินทาง",  className: "bg-orange-100 text-orange-700 border-orange-200" },
};

function LeadCard({ lead }: { lead: Lead }) {
  const updateLeadStatus = useCRM((s) => s.updateLeadStatus);
  const updateLead = useCRM((s) => s.updateLead);
  const [expanded, setExpanded] = useState(false);
  const [statusNote, setStatusNote] = useState(lead.status_note ?? "");
  const [editingNote, setEditingNote] = useState(false);

  const urgencyOpt = URGENCY_OPTIONS.find((u) => u.val === lead.urgency);

  return (
    <div className="border rounded-xl bg-card shadow-soft overflow-hidden">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 p-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={`${statusColor(lead.status)} text-xs`}>{lead.status}</Badge>
            {urgencyOpt && (
              <span className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold ${urgencyBadge(lead.urgency)}`}>
                {urgencyOpt.emoji} {lead.urgency}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground font-mono">{lead.lead_id}</span>
          </div>
          <p className="mt-1 font-semibold truncate">{lead.program || lead.bu_type}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-muted-foreground">
            <span>🗓️ {lead.travel_month}</span>
            <span>👥 {lead.pax_count} ท่าน</span>
            <span>💰 {lead.budget_range}</span>
            {lead.quoted_price > 0 && <span className="font-semibold text-primary">฿ {formatTHB(lead.quoted_price)}</span>}
          </div>
          {lead.next_followup_date && !["Closed Won", "Closed Lost"].includes(lead.status) && (
            <div className="flex items-center gap-1 text-[11px] mt-1 text-amber-700">
              <CalendarDays className="w-3 h-3" /> Follow up: {new Date(lead.next_followup_date).toLocaleDateString("th-TH", { dateStyle: "medium" })}
            </div>
          )}
          {lead.closed_date && (
            <div className="flex items-center gap-1 text-[11px] mt-1 text-muted-foreground">
              <Clock className="w-3 h-3" /> ปิดดีล: {new Date(lead.closed_date).toLocaleDateString("th-TH", { dateStyle: "medium" })}
            </div>
          )}
          {lead.lost_reason && (
            <div className="text-[11px] mt-1 text-destructive">❌ {lead.lost_reason}</div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs text-muted-foreground hidden sm:block">{lead.assigned_to}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded((v) => !v)}>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t bg-muted/30 px-4 py-3 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <div><span className="text-muted-foreground">BU Type</span><p className="font-medium">{lead.bu_type}</p></div>
            <div><span className="text-muted-foreground">Category</span><p className="font-medium">{lead.lead_category}</p></div>
            <div><span className="text-muted-foreground">Scope</span><p className="font-medium">{lead.scope}</p></div>
            <div><span className="text-muted-foreground">Tour Type</span><p className="font-medium">{lead.tour_type}</p></div>
            <div><span className="text-muted-foreground">Assigned to</span><p className="font-medium">{lead.assigned_to}</p></div>
          </div>

          {/* Status note */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">📝 หมายเหตุ Lead</p>
            {editingNote ? (
              <div className="space-y-1.5">
                <Textarea
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  className="min-h-[60px] text-sm"
                  placeholder="เพิ่มหมายเหตุ..."
                />
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 text-xs" onClick={() => {
                    updateLead(lead.lead_id, { status_note: statusNote || null });
                    setEditingNote(false);
                    toast.success("บันทึกหมายเหตุแล้ว");
                  }}>บันทึก</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => {
                    setStatusNote(lead.status_note ?? "");
                    setEditingNote(false);
                  }}>ยกเลิก</Button>
                </div>
              </div>
            ) : (
              <div
                className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition min-h-[28px] rounded px-2 py-1 hover:bg-muted"
                onClick={() => setEditingNote(true)}
              >
                {lead.status_note || <span className="italic text-xs">คลิกเพื่อเพิ่มหมายเหตุ...</span>}
              </div>
            )}
          </div>

          {/* Change status */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">เปลี่ยนสถานะ</p>
            <Select
              value={lead.status}
              onValueChange={(v) => {
                updateLeadStatus(lead.lead_id, v as LeadStatus);
                toast.success(`เปลี่ยนสถานะ Lead เป็น "${v}" แล้ว`);
              }}
            >
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEAD_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className={`text-xs ${statusColor(s)}`}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomerDetail() {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const customers = useCRM((s) => s.customers);
  const leads = useCRM((s) => s.leads);

  const customer = customers.find((c) => c.customer_id === customerId);
  const customerLeads = leads
    .filter((l) => l.customer_id === customerId)
    .sort((a, b) => {
      // Active leads first, then by status group, then closed
      const order: Record<string, number> = {
        "New": 0, "Contacted": 1, "Quotation Sent": 2, "Negotiating": 3, "Closed Won": 4, "Closed Lost": 5,
      };
      return (order[a.status] ?? 6) - (order[b.status] ?? 6);
    });

  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [openAddLead, setOpenAddLead] = useState(false);
  const [leadFilter, setLeadFilter] = useState<LeadStatus | "all">("all");

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground gap-4">
        <p className="text-lg">ไม่พบข้อมูลลูกค้า</p>
        <Button variant="outline" onClick={() => navigate("/app/customers")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> กลับไปรายการลูกค้า
        </Button>
      </div>
    );
  }

  // Stats
  const wonLeads = customerLeads.filter((l) => l.status === "Closed Won");
  const activeLeads = customerLeads.filter((l) => !["Closed Won", "Closed Lost"].includes(l.status));
  const totalQuoted = customerLeads.reduce((sum, l) => sum + (l.quoted_price || 0), 0);

  const filteredLeads = leadFilter === "all" ? customerLeads : customerLeads.filter((l) => l.status === leadFilter);

  const birthdayDisplay = customer.birthday
    ? new Date(customer.birthday).toLocaleDateString("th-TH", { day: "numeric", month: "long" })
    : null;

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-5xl mx-auto">

      {/* ── Back + Header ── */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" className="mt-0.5 shrink-0" onClick={() => navigate("/app/customers")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold truncate">{customer.full_name}</h1>
            <Badge variant="outline" className={`${tierBadge(customer.customer_tier)} shrink-0`}>
              {customer.customer_tier}
            </Badge>
            {customer.customer_tier === "VIP" && <Star className="w-4 h-4 text-accent fill-accent" />}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {customer.company !== "-" ? customer.company : "B2C Individual"}
            {customer.province ? ` · ${customer.province}` : ""}
            {" · "}
            <span className="font-mono text-xs">{customer.customer_id}</span>
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setEditingCustomer(customer)}>
            <Pencil className="w-4 h-4 mr-1.5" /> แก้ไข
          </Button>
          <Button size="sm" className="bg-gradient-primary" onClick={() => setOpenAddLead(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> สร้าง Lead
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Left column: Profile ── */}
        <div className="lg:col-span-1 space-y-4">

          {/* Contact info */}
          <div className="bg-card border rounded-xl shadow-soft p-4 space-y-2.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">📞 ติดต่อ</p>
            <div className="space-y-1.5 text-sm">
              <a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-primary hover:underline">
                <Phone className="w-3.5 h-3.5 shrink-0" /> {customer.phone}
              </a>
              <div className="flex items-center gap-2 text-success">
                <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{customer.line_id || "—"}</span>
              </div>
              {customer.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{customer.email}</span>
                </div>
              )}
              {customer.province && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span>{customer.province}</span>
                </div>
              )}
              {birthdayDisplay && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Cake className="w-3.5 h-3.5 shrink-0" />
                  <span>{birthdayDisplay}</span>
                </div>
              )}
            </div>
          </div>

          {/* Customer details */}
          <div className="bg-card border rounded-xl shadow-soft p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">👤 ข้อมูลเพิ่มเติม</p>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">ช่องทาง</span>
                <span className="font-medium">{customer.source}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">กลุ่มลูกค้า</span>
                <span className="font-medium text-right max-w-[140px] text-xs leading-tight">{customer.segment}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sales</span>
                <div className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-accent/10 text-accent border border-accent/30">
                  <span className="w-4 h-4 rounded-full bg-gradient-pink text-white flex items-center justify-center text-[9px] font-bold">
                    {customer.created_by[0]}
                  </span>
                  {customer.created_by}
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">เพิ่มเมื่อ</span>
                <span className="text-xs">
                  {customer.created_at
                    ? new Date(customer.created_at).toLocaleDateString("th-TH", { dateStyle: "medium" })
                    : customer.first_contact_date}
                </span>
              </div>
              {customer.last_contacted_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ติดต่อล่าสุด</span>
                  <span className="text-xs">
                    {new Date(customer.last_contacted_at).toLocaleDateString("th-TH", { dateStyle: "medium" })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Interests */}
          {(customer.interests ?? []).length > 0 && (
            <div className="bg-card border rounded-xl shadow-soft p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">🎯 บริการที่สนใจ</p>
              <div className="flex flex-wrap gap-1.5">
                {customer.interests!.map((key) => {
                  const style = INTEREST_STYLE[key];
                  if (!style) return null;
                  return (
                    <span key={key} className={`text-xs px-2 py-0.5 rounded border font-medium ${style.className}`}>
                      {style.label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Note */}
          {customer.note && (
            <div className="bg-card border rounded-xl shadow-soft p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">📝 บันทึก</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{customer.note}</p>
            </div>
          )}
        </div>

        {/* ── Right column: Stats + Leads ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Stats strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-card border rounded-xl shadow-soft p-3 text-center">
              <p className="text-2xl font-bold text-primary">{customer.total_trips}</p>
              <p className="text-xs text-muted-foreground mt-0.5">ทริปที่ซื้อแล้ว</p>
            </div>
            <div className="bg-card border rounded-xl shadow-soft p-3 text-center">
              <p className="text-xl font-bold text-success">{formatTHB(customer.total_spend)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">ยอดซื้อรวม</p>
            </div>
            <div className="bg-card border rounded-xl shadow-soft p-3 text-center">
              <p className="text-2xl font-bold text-amber-600">{activeLeads.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Leads ที่ active</p>
            </div>
            <div className="bg-card border rounded-xl shadow-soft p-3 text-center">
              <p className="text-xl font-bold">{formatTHB(totalQuoted)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">มูลค่า quoted รวม</p>
            </div>
          </div>

          {/* Leads section */}
          <div className="bg-card border rounded-xl shadow-soft overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <p className="font-semibold text-sm">Leads ทั้งหมด ({customerLeads.length})</p>
              </div>
              <Select value={leadFilter} onValueChange={(v) => setLeadFilter(v as any)}>
                <SelectTrigger className="h-7 w-44 text-xs"><SelectValue placeholder="กรองสถานะ" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกสถานะ</SelectItem>
                  {LEAD_STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 space-y-2">
              {filteredLeads.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground space-y-3">
                  <p className="text-sm">{leadFilter !== "all" ? `ไม่มี Lead ที่มีสถานะ "${leadFilter}"` : "ยังไม่มี Lead สำหรับลูกค้าคนนี้"}</p>
                  {leadFilter === "all" && (
                    <Button size="sm" className="bg-gradient-primary" onClick={() => setOpenAddLead(true)}>
                      <Plus className="w-4 h-4 mr-1.5" /> สร้าง Lead แรก
                    </Button>
                  )}
                </div>
              ) : (
                filteredLeads.map((lead) => <LeadCard key={lead.lead_id} lead={lead} />)
              )}
            </div>

            {filteredLeads.length > 0 && (
              <div className="border-t px-4 py-2.5 bg-muted/20 text-xs text-muted-foreground flex justify-between items-center">
                <span>
                  ✅ ปิดได้ {wonLeads.length} leads · ยอดซื้อจริง {formatTHB(customer.total_spend)}
                </span>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setOpenAddLead(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Lead ใหม่
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <EditCustomerDialog customer={editingCustomer} onClose={() => setEditingCustomer(null)} />
      <CustomerLeadDialog
        open={openAddLead}
        onOpenChange={setOpenAddLead}
        prefilledCustomerId={customer.customer_id}
      />
    </div>
  );
}
