import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Pencil, Plus, Phone, MessageCircle, Mail, MapPin, Cake, Star,
  TrendingUp, CalendarDays, Clock, ChevronDown, ChevronUp, ArrowRightLeft,
  User, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useCRM, formatTHB, tierBadge, statusColor, urgencyBadge, isLostStatus,
  LEAD_STATUSES, URGENCY_OPTIONS,
  type Customer, type Lead, type LeadStatus, type TransferLog,
} from "@/store/crmStore";
import { EditCustomerDialog } from "@/components/EditCustomerDialog";
import { CustomerLeadDialog } from "@/components/CustomerLeadDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

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
      <div className="flex items-start justify-between gap-2 p-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="outline" className={`${statusColor(lead.status)} text-xs`}>{lead.status}</Badge>
            {urgencyOpt && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-semibold ${urgencyBadge(lead.urgency)}`}>
                {urgencyOpt.emoji} {lead.urgency}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground font-mono">{lead.lead_id}</span>
          </div>
          <p className="mt-0.5 font-semibold text-sm truncate">{lead.program || lead.bu_type}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-muted-foreground">
            <span>🗓️ {lead.travel_month}</span>
            <span>👥 {lead.pax_count} ท่าน</span>
            <span>💰 {lead.budget_range}</span>
            {lead.quoted_price > 0 && <span className="font-semibold text-primary">฿ {formatTHB(lead.quoted_price)}</span>}
          </div>
          {lead.next_followup_date && !["จองแล้ว", "ยกเลิก"].includes(lead.status) && (
            <div className="flex items-center gap-1 text-[11px] mt-0.5 text-amber-700">
              <CalendarDays className="w-3 h-3" /> Follow up: {new Date(lead.next_followup_date).toLocaleDateString("th-TH", { dateStyle: "medium" })}
            </div>
          )}
          {lead.closed_date && (
            <div className="flex items-center gap-1 text-[11px] mt-0.5 text-muted-foreground">
              <Clock className="w-3 h-3" /> ปิดดีล: {new Date(lead.closed_date).toLocaleDateString("th-TH", { dateStyle: "medium" })}
            </div>
          )}
          {lead.lost_reason && (
            <div className="text-[11px] mt-0.5 text-destructive">❌ {lead.lost_reason}</div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs text-muted-foreground hidden sm:block">{lead.assigned_to}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded((v) => !v)}>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="border-t bg-muted/30 px-3 py-2.5 space-y-2.5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <div><span className="text-muted-foreground">BU Type</span><p className="font-medium">{lead.bu_type}</p></div>
            <div><span className="text-muted-foreground">Category</span><p className="font-medium">{lead.lead_category}</p></div>
            <div><span className="text-muted-foreground">Scope</span><p className="font-medium">{lead.scope}</p></div>
            <div><span className="text-muted-foreground">Tour Type</span><p className="font-medium">{lead.tour_type}</p></div>
            <div><span className="text-muted-foreground">Assigned to</span><p className="font-medium">{lead.assigned_to}</p></div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">📝 หมายเหตุ Lead</p>
            {editingNote ? (
              <div className="space-y-1.5">
                <Textarea value={statusNote} onChange={(e) => setStatusNote(e.target.value)} className="min-h-[60px] text-sm" placeholder="เพิ่มหมายเหตุ..." />
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 text-xs" onClick={() => { updateLead(lead.lead_id, { status_note: statusNote || null }); setEditingNote(false); toast.success("บันทึกหมายเหตุแล้ว"); }}>บันทึก</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setStatusNote(lead.status_note ?? ""); setEditingNote(false); }}>ยกเลิก</Button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition min-h-[28px] rounded px-2 py-1 hover:bg-muted" onClick={() => setEditingNote(true)}>
                {lead.status_note || <span className="italic text-xs">คลิกเพื่อเพิ่มหมายเหตุ...</span>}
              </div>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">เปลี่ยนสถานะ</p>
            <Select value={lead.status} onValueChange={(v) => { updateLeadStatus(lead.lead_id, v as LeadStatus); toast.success(`เปลี่ยนสถานะ Lead เป็น "${v}" แล้ว`); }}>
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

/* ── Compact profile card (replaces 4 separate cards) ── */
function ProfileCard({ customer }: { customer: Customer }) {
  const [showMore, setShowMore] = useState(false);
  const birthdayDisplay = customer.birthday
    ? new Date(customer.birthday).toLocaleDateString("th-TH", { day: "numeric", month: "long" })
    : null;

  return (
    <div className="bg-card border rounded-xl shadow-soft overflow-hidden">
      {/* Contact action row */}
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        {customer.phone && customer.phone !== "-" && (
          <a href={`tel:${customer.phone}`} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary/8 hover:bg-primary/15 text-primary text-xs font-medium transition">
            <Phone className="w-3.5 h-3.5" /> {customer.phone}
          </a>
        )}
        {customer.line_id && (
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-50 text-green-700 text-xs font-medium border border-green-100">
            <MessageCircle className="w-3.5 h-3.5" /> {customer.line_id}
          </div>
        )}
        {customer.email && (
          <a href={`mailto:${customer.email}`} className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition">
            <Mail className="w-3.5 h-3.5 text-muted-foreground" />
          </a>
        )}
      </div>

      {/* Key info grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 px-4 py-3 text-xs">
        <div>
          <p className="text-muted-foreground">ช่องทาง</p>
          <p className="font-medium mt-0.5">{customer.source}</p>
        </div>
        <div>
          <p className="text-muted-foreground">กลุ่มลูกค้า</p>
          <p className="font-medium mt-0.5 leading-tight">{customer.segment}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Sales</p>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="w-4 h-4 rounded-full bg-gradient-pink text-white flex items-center justify-center text-[9px] font-bold shrink-0">
              {customer.created_by[0]}
            </span>
            <span className="font-medium text-accent">{customer.created_by}</span>
          </div>
        </div>
        <div>
          <p className="text-muted-foreground">เพิ่มเมื่อ</p>
          <p className="font-medium mt-0.5">
            {customer.created_at
              ? new Date(customer.created_at).toLocaleDateString("th-TH", { dateStyle: "medium" })
              : customer.first_contact_date}
          </p>
        </div>
        {customer.province && (
          <div>
            <p className="text-muted-foreground">จังหวัด</p>
            <p className="font-medium mt-0.5 flex items-center gap-1"><MapPin className="w-3 h-3" />{customer.province}</p>
          </div>
        )}
        {customer.last_contacted_at && (
          <div>
            <p className="text-muted-foreground">ติดต่อล่าสุด</p>
            <p className="font-medium mt-0.5">{new Date(customer.last_contacted_at).toLocaleDateString("th-TH", { dateStyle: "medium" })}</p>
          </div>
        )}
      </div>

      {/* Interests */}
      {(customer.interests ?? []).length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-1">
          {customer.interests!.map((key) => {
            const style = INTEREST_STYLE[key];
            if (!style) return null;
            return (
              <span key={key} className={`text-[11px] px-2 py-0.5 rounded border font-medium ${style.className}`}>
                {style.label}
              </span>
            );
          })}
        </div>
      )}

      {/* Note + birthday (show more toggle) */}
      {(customer.note || birthdayDisplay) && (
        <>
          <button
            onClick={() => setShowMore((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2 border-t text-xs text-muted-foreground hover:bg-muted/40 transition"
          >
            <span>{showMore ? "ซ่อนรายละเอียด" : "ดูเพิ่มเติม (บันทึก / วันเกิด)"}</span>
            {showMore ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {showMore && (
            <div className="px-4 pb-3 space-y-2 text-xs">
              {birthdayDisplay && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Cake className="w-3.5 h-3.5" /> วันเกิด: <span className="font-medium text-foreground">{birthdayDisplay}</span>
                </div>
              )}
              {customer.note && (
                <p className="text-sm text-foreground whitespace-pre-wrap bg-muted/40 rounded-lg p-2">{customer.note}</p>
              )}
            </div>
          )}
        </>
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
      const order: Record<string, number> = {
        "ใหม่": 0, "ติดต่อแล้ว": 1, "ตอบแล้ว": 2, "ส่ง Quote แล้ว": 3, "กำลังเจรจา": 4, "จองแล้ว": 5, "ยกเลิก": 6,
      };
      return (order[a.status] ?? 7) - (order[b.status] ?? 7);
    });

  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [openAddLead, setOpenAddLead] = useState(false);
  const [leadFilter, setLeadFilter] = useState<LeadStatus | "all">("all");
  const [mobileTab, setMobileTab] = useState<"info" | "leads">("info");

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

  const wonLeads      = customerLeads.filter((l) => l.status === "จองแล้ว");
  const lostLeads     = customerLeads.filter((l) => isLostStatus(l.status));
  const activeLeads   = customerLeads.filter((l) => !isLostStatus(l.status) && l.status !== "จองแล้ว");
  const wonAmount     = wonLeads.reduce((sum, l) => sum + (l.closed_price ?? l.quoted_price ?? 0), 0);
  const activeQuoted  = activeLeads.reduce((sum, l) => sum + (l.quoted_price || 0), 0);
  const filteredLeads = leadFilter === "all" ? customerLeads : customerLeads.filter((l) => l.status === leadFilter);

  return (
    <div className="p-3 sm:p-6 space-y-3 sm:space-y-4 max-w-5xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-start gap-2">
        <Button variant="ghost" size="icon" className="mt-0.5 shrink-0 h-8 w-8" onClick={() => navigate("/app/customers")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold truncate">{customer.full_name}</h1>
            <Badge variant="outline" className={`${tierBadge(customer.customer_tier)} shrink-0 text-xs`}>
              {customer.customer_tier}
            </Badge>
            {customer.customer_tier === "VIP" && <Star className="w-4 h-4 text-accent fill-accent" />}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {customer.company !== "-" ? customer.company : "B2C Individual"}
            {customer.province ? ` · ${customer.province}` : ""}
            {" · "}
            <span className="font-mono">{customer.customer_id}</span>
          </p>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <Button variant="outline" size="sm" className="h-8 text-xs px-2.5" onClick={() => setEditingCustomer(customer)}>
            <Pencil className="w-3.5 h-3.5 sm:mr-1" /><span className="hidden sm:inline">แก้ไข</span>
          </Button>
          <Button size="sm" className="bg-gradient-primary h-8 text-xs px-2.5" onClick={() => setOpenAddLead(true)}>
            <Plus className="w-3.5 h-3.5 sm:mr-1" /><span className="hidden sm:inline">สร้าง Lead</span>
          </Button>
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {/* 1 — ทริปสำเร็จ (Closed Won) */}
        <div className="bg-card border border-emerald-100 rounded-xl shadow-soft p-2.5 text-center">
          <p className="text-xl font-bold text-emerald-600">{wonLeads.length}</p>
          <p className="text-[11px] text-muted-foreground leading-tight">ทริปสำเร็จ</p>
        </div>
        {/* 2 — ยอดที่ใช้บริการจริง */}
        <div className="bg-card border border-emerald-100 rounded-xl shadow-soft p-2.5 text-center">
          <p className="text-sm font-bold text-emerald-600 leading-tight">{formatTHB(wonAmount)}</p>
          <p className="text-[11px] text-muted-foreground leading-tight">ยอดใช้บริการจริง</p>
        </div>
        {/* 3 — Active Leads */}
        <div className="bg-card border rounded-xl shadow-soft p-2.5 text-center">
          <p className="text-xl font-bold text-amber-500">{activeLeads.length}</p>
          <p className="text-[11px] text-muted-foreground leading-tight">Active Leads</p>
        </div>
        {/* 4 — ยอด Quote ที่รอปิด */}
        <div className="bg-card border rounded-xl shadow-soft p-2.5 text-center">
          <p className="text-sm font-bold text-amber-500 leading-tight">{formatTHB(activeQuoted)}</p>
          <p className="text-[11px] text-muted-foreground leading-tight">Quote รอปิด</p>
        </div>
        {/* 5 — Lead เสีย */}
        <div className="bg-card border rounded-xl shadow-soft p-2.5 text-center col-span-2 sm:col-span-1">
          <p className="text-xl font-bold text-destructive/70">{lostLeads.length}</p>
          <p className="text-[11px] text-muted-foreground leading-tight">Lead เสีย</p>
        </div>
      </div>

      {/* ── Mobile tab bar ── */}
      <div className="flex lg:hidden rounded-xl border bg-card shadow-soft overflow-hidden">
        <button
          onClick={() => setMobileTab("info")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition ${
            mobileTab === "info" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <User className="w-4 h-4" /> ข้อมูล
        </button>
        <button
          onClick={() => setMobileTab("leads")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition ${
            mobileTab === "leads" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <FileText className="w-4 h-4" /> Leads
          {activeLeads.length > 0 && (
            <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold ${mobileTab === "leads" ? "bg-white/20" : "bg-amber-100 text-amber-700"}`}>
              {activeLeads.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Desktop: 2-col | Mobile: tabbed ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Left: Profile (hidden on mobile when leads tab active) */}
        <div className={`lg:col-span-1 space-y-3 ${mobileTab === "leads" ? "hidden lg:block" : ""}`}>
          <ProfileCard customer={customer} />

          {/* Transfer log (desktop always, mobile in info tab) */}
          {(customer.transfer_logs ?? []).length > 0 && (
            <div className="bg-card border rounded-xl shadow-soft overflow-hidden">
              <div className="px-4 py-2.5 border-b bg-muted/30 flex items-center gap-2">
                <ArrowRightLeft className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="font-semibold text-xs">โอนลูกค้า ({(customer.transfer_logs ?? []).length} ครั้ง)</p>
              </div>
              <div className="p-3">
                <ol className="relative border-l border-border space-y-3 ml-3">
                  {[...(customer.transfer_logs ?? [])].reverse().map((log: TransferLog) => (
                    <li key={log.log_id} className="ml-4">
                      <div className="absolute -left-[7px] mt-1 w-3 h-3 rounded-full border-2 border-background bg-primary" />
                      <div className="bg-muted/30 rounded-lg px-2.5 py-2 space-y-0.5">
                        <p className="text-xs font-medium">
                          <span className="text-muted-foreground">{log.from_rep}</span>
                          {" → "}
                          <span className="font-semibold text-primary">{log.to_rep}</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          🕐 {new Date(log.transferred_at).toLocaleDateString("th-TH", { dateStyle: "medium" })}
                          {log.transferred_by && log.transferred_by !== log.from_rep && ` · โดย ${log.transferred_by}`}
                        </p>
                        {log.note && <p className="text-xs text-muted-foreground italic">📝 {log.note}</p>}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Right: Leads (hidden on mobile when info tab active) */}
        <div className={`lg:col-span-2 space-y-3 ${mobileTab === "info" ? "hidden lg:block" : ""}`}>
          <div className="bg-card border rounded-xl shadow-soft overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <p className="font-semibold text-sm">Leads ทั้งหมด ({customerLeads.length})</p>
              </div>
              <Select value={leadFilter} onValueChange={(v) => setLeadFilter(v as any)}>
                <SelectTrigger className="h-7 w-36 text-xs"><SelectValue placeholder="กรองสถานะ" /></SelectTrigger>
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
              <div className="border-t px-4 py-2 bg-muted/20 text-xs text-muted-foreground flex justify-between items-center">
                <span>✅ ปิดได้ {wonLeads.length} leads · ยอดซื้อจริง {formatTHB(customer.total_spend)}</span>
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
