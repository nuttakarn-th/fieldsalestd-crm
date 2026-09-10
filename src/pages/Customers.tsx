import { useEffect, useMemo, useState } from "react";
import { fmtDate } from "@/lib/dateUtils";
import { Navigate, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { Search, Plus, Pencil, Phone, MessageCircle, ArrowRightLeft, Lock, Inbox, Mail, MapPin, Megaphone, Trash2, Clock, SlidersHorizontal, X, Users2, Calendar, Star, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCRM, formatTHB, tierBadge, SOURCES, isClosedStatus, isLostStatus, LEAD_STATUSES, URGENCY_OPTIONS, LOST_REASONS, type Customer, type Lead, type LeadStatus, type SalesRep, type Tier, type Source } from "@/store/crmStore";
import { Label } from "@/components/ui/label";
import { useServices } from "@/store/serviceStore";
import { useCurrentUser, useActiveSalesNames, useActiveOBNames, useActiveSalesTeamNames, useAllSalesTeamNames } from "@/store/authStore";
import { useDeleteRequests } from "@/store/deleteRequestStore";
import { Textarea } from "@/components/ui/textarea";
import { CustomerLeadDialog } from "@/components/CustomerLeadDialog";
import { EditCustomerDialog } from "@/components/EditCustomerDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ImportExportMenu } from "@/components/ImportExportMenu";
import type { ExcelField } from "@/lib/excelUtils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const CUSTOMER_FIELDS: ExcelField[] = [
  // ── ข้อมูลพื้นฐาน ──────────────────────────────────────────
  { key: "full_name",    header: "ชื่อ-นามสกุล",        example: "สมชาย ใจดี",              required: true },
  { key: "company",      header: "องค์กร/บริษัท",        example: "บริษัท ABC จำกัด" },
  { key: "phone",        header: "เบอร์โทรศัพท์",        example: "0812345678",              required: true },
  { key: "line_id",      header: "Line ID",               example: "somchai_line" },
  { key: "email",        header: "อีเมล",                 example: "somchai@email.com" },
  // ── ข้อมูลการตลาด ──────────────────────────────────────────
  { key: "birthday",     header: "วันเกิด (DD-MM-YYYY)",  example: "20-05-1990", type: "date" as const },
  { key: "province",     header: "จังหวัด",               example: "กรุงเทพฯ" },
  { key: "interests",    header: "ความสนใจ (คั่นด้วย ,)", example: "ทัวร์ต่างประเทศ,ครอบครัว" },
  { key: "group_type",   header: "ประเภทกลุ่ม",           example: "ครอบครัว" },
  { key: "budget_range", header: "งบประมาณ",              example: "30,000-60,000" },
  // ── ข้อมูลการขาย ────────────────────────────────────────────
  { key: "source",       header: "ช่องทาง",               example: "FB" },
  { key: "segment",      header: "กลุ่มลูกค้า",           example: "B2C Individual" },
  { key: "created_by",   header: "Sales ที่ดูแล",         example: "เฟิร์ส" },
  { key: "note",         header: "บันทึก",                example: "พบที่งาน Travel Expo สนใจทัวร์ญี่ปุ่น" },
];

// interest key → short label + color
const INTEREST_STYLE: Record<string, { label: string; className: string }> = {
  "ทัวร์ต่างประเทศ":  { label: "✈️ Intl",   className: "bg-blue-100 text-blue-700 border-blue-200" },
  "ทัวร์ภายในประเทศ": { label: "🏔️ Dom",    className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  "เช่ารถ ท่องเที่ยว":{ label: "🚗 รถ",     className: "bg-amber-100 text-amber-700 border-amber-200" },
  "จองตั๋วเครื่องบิน":{ label: "🎫 ตั๋ว",   className: "bg-sky-100 text-sky-700 border-sky-200" },
  "โรงแรม":           { label: "🏨 Hotel",  className: "bg-purple-100 text-purple-700 border-purple-200" },
  "Visa":             { label: "📋 Visa",   className: "bg-rose-100 text-rose-700 border-rose-200" },
  "ประกันการเดินทาง": { label: "🛡️ ประกัน", className: "bg-orange-100 text-orange-700 border-orange-200" },
};

function leadStatusStyle(status: string) {
  const s = status as LeadStatus;
  if (isClosedStatus(s)) return {
    pill: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300",
    bar:  "bg-emerald-500",
    label: status,
  };
  if (isLostStatus(s)) return {
    pill: "bg-red-100 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-400",
    bar:  "bg-red-400",
    label: status,
  };
  if (status === "ส่ง Quote แล้ว") return {
    pill: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",
    bar:  "bg-blue-400",
    label: status,
  };
  return {
    pill: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400",
    bar:  "bg-amber-400",
    label: status,
  };
}

function fmtMoney(n: number): string {
  if (!n) return "฿0";
  if (n >= 1_000_000) return `฿${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `฿${Math.round(n / 1_000)}K`;
  return `฿${n.toLocaleString("th-TH")}`;
}

// ── RFM Model ────────────────────────────────────────────────────────────────
type RFMSegment = "Champion" | "Loyal" | "At Risk" | "Big Spender" | "New" | "ทั่วไป";
type RFMScore   = 1 | 2 | 3; // 1 = ดี, 2 = เตือน, 3 = แย่
interface RFMResult { rDays: number | null; rLabel: string; rScore: RFMScore; fScore: RFMScore; mScore: RFMScore; segment: RFMSegment; insight: string; }

function computeRFM(customer: Customer & { total_trips?: number; total_spend?: number }): RFMResult {
  const now  = Date.now();
  const trips = customer.total_trips ?? 0;
  const spend = customer.total_spend ?? 0;

  // R — Recency
  let rDays: number | null = null;
  let rLabel = "ไม่มีข้อมูล";
  let rScore: RFMScore = 3;
  if (customer.last_contacted_at) {
    rDays  = Math.floor((now - new Date(customer.last_contacted_at).getTime()) / 86_400_000);
    rLabel = rDays <= 7 ? `${rDays} วันที่แล้ว` : rDays <= 30 ? `${rDays} วัน` : rDays <= 90 ? `${Math.floor(rDays / 30)} เดือน` : `${Math.floor(rDays / 30)} เดือน`;
    rScore = rDays <= 30 ? 1 : rDays <= 90 ? 2 : 3;
  }

  // F — Frequency
  const fScore: RFMScore = trips >= 3 ? 1 : trips >= 1 ? 2 : 3;

  // M — Monetary
  const mScore: RFMScore = spend >= 50_000 ? 1 : spend >= 10_000 ? 2 : 3;

  // Segment
  let segment: RFMSegment;
  if (trips === 0)                                        segment = "New";
  else if (fScore === 1 && mScore === 1 && rScore <= 2)  segment = "Champion";
  else if (fScore === 1 && rScore === 3)                  segment = "At Risk";
  else if (mScore === 1 && fScore >= 2)                   segment = "Big Spender";
  else if (fScore === 1)                                  segment = "Loyal";
  else                                                    segment = "ทั่วไป";

  const insight =
    segment === "Champion"    ? `ลูกค้า Champion ยอดสูง ใช้บริการบ่อย${rScore === 2 ? ` — หายไป ${rLabel} แล้ว ควรโทรติดตามด่วน` : " — ดูแลรักษาความสัมพันธ์ต่อเนื่อง"}` :
    segment === "At Risk"     ? `เคยซื้อบ่อยแต่หายนาน ${rLabel} — ควรโทรหาด่วน เสนอโปรพิเศษหรือ package ใหม่` :
    segment === "Big Spender" ? `ยอดต่อครั้งสูงแต่ซื้อไม่บ่อย — มีศักยภาพสูง ลองเสนอ package พรีเมียม` :
    segment === "Loyal"       ? `ใช้บริการสม่ำเสมอ — เหมาะสำหรับ upsell หรือ cross-sell package ใหม่` :
    segment === "New"         ? `ลูกค้าใหม่ยังไม่เคยซื้อ — ติดตามพูดคุย เสนอ package เริ่มต้น` :
                                `ลูกค้าทั่วไป — ติดตามอย่างสม่ำเสมอเพื่อสร้างความสัมพันธ์`;

  return { rDays, rLabel, rScore, fScore, mScore, segment, insight };
}

const RFM_SEGMENT_STYLE: Record<RFMSegment, { label: string; pill: string }> = {
  "Champion":    { label: "Champion",    pill: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300" },
  "At Risk":     { label: "At Risk",     pill: "bg-red-100 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-400" },
  "Big Spender": { label: "Big Spender", pill: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400" },
  "Loyal":       { label: "Loyal",       pill: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300" },
  "New":         { label: "New",         pill: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300" },
  "ทั่วไป":      { label: "ทั่วไป",      pill: "bg-muted text-muted-foreground border-border" },
};
const RFM_SCORE_COLOR: Record<RFMScore, string> = {
  1: "text-emerald-600 dark:text-emerald-400",
  2: "text-amber-600 dark:text-amber-400",
  3: "text-red-500 dark:text-red-400",
};

// ── Marketing Export helpers ──────────────────────────────────────────────────
function exportCSV(rows: string[][], filename: string) {
  const BOM = "﻿";
  const csv = BOM + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function exportLineList(customers: Customer[]) {
  const header = ["ชื่อ", "เบอร์โทร", "Line ID", "จังหวัด", "ความสนใจ", "กลุ่มลูกค้า"];
  const rows = customers.map((c) => [
    c.full_name, c.phone, c.line_id ?? "",
    c.province ?? "", (c.interests ?? []).join("|"), c.segment,
  ]);
  exportCSV([header, ...rows], `LINE_broadcast_list_${new Date().toISOString().split("T")[0]}.csv`);
  toast.success(`Export ${customers.length} รายการสำหรับ LINE OA แล้ว ✅`);
}

function exportFBList(customers: Customer[]) {
  // Facebook Custom Audience format
  const header = ["phone", "email", "fn", "ln", "ct", "country"];
  const rows = customers.map((c) => {
    const [fn, ...rest] = c.full_name.split(" ");
    return [
      c.phone.replace(/\D/g, ""),
      c.email ?? "",
      fn ?? "", rest.join(" "),
      c.province ?? "", "TH",
    ];
  });
  exportCSV([header, ...rows], `FB_custom_audience_${new Date().toISOString().split("T")[0]}.csv`);
  toast.success(`Export ${customers.length} รายการสำหรับ Facebook Custom Audience แล้ว ✅`);
}

// ── Inline LeadEditDialog (สำหรับ split-pane — ไม่ต้อง navigate ไป CustomerDetail) ───
function LeadEditDialog({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const updateLead = useCRM((s) => s.updateLead);
  const updateLeadStatus = useCRM((s) => s.updateLeadStatus);

  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [urgency, setUrgency] = useState<string>(lead.urgency ?? "Warm");
  const [pax, setPax] = useState(String(lead.pax_count));
  const [travelMonth, setTravelMonth] = useState(lead.travel_month ?? "");
  const [quotedPrice, setQuotedPrice] = useState(String(lead.quoted_price ?? 0));
  const [nextFollowup, setNextFollowup] = useState(lead.next_followup_date ?? "");
  const [note, setNote] = useState(lead.status_note ?? "");
  const [lostReason, setLostReason] = useState(lead.lost_reason ?? LOST_REASONS[0]);
  const [lostNote, setLostNote] = useState("");

  const isCancelling = status === "ยกเลิก";

  function handleSave() {
    if (isCancelling && !lostReason) {
      toast.error("กรุณาระบุเหตุผลที่ยกเลิก");
      return;
    }
    const newPax = parseInt(pax) || lead.pax_count;
    const patch: Partial<Lead> = {
      urgency: urgency as "Hot" | "Warm" | "Cold",
      pax_count: newPax,
      travel_month: travelMonth,
      quoted_price: parseFloat(quotedPrice) || 0,
      next_followup_date: nextFollowup || null,
      status_note: note || null,
    };
    updateLead(lead.lead_id, patch);

    // ── ถ้า pax เปลี่ยน และ Lead อยู่ใน "จองแล้ว" ทั้งก่อนและหลัง → adjust quota ─
    const paxDelta = newPax - lead.pax_count;
    const bothWon = isClosedStatus(lead.status) && isClosedStatus(status);
    if (paxDelta !== 0 && bothWon) {
      const isTour = lead.bu_type === "ทัวร์ต่างประเทศ" || lead.bu_type === "ทัวร์ภายในประเทศ";
      if (isTour && lead.tour_id) {
        const { adjustQuota, adjustPeriodQuota } = useServices.getState();
        if (lead.period_id) adjustPeriodQuota(lead.tour_id, lead.period_id, -paxDelta);
        else adjustQuota(lead.tour_id, -paxDelta);
      }
    }

    const finalLostReason = isCancelling
      ? (lostNote.trim() ? `${lostReason} — ${lostNote.trim()}` : lostReason)
      : undefined;
    if (status !== lead.status || isCancelling) updateLeadStatus(lead.lead_id, status, finalLostReason);
    toast.success("บันทึก Lead เรียบร้อยแล้ว");
    onClose();
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">✏️ แก้ไข Lead</DialogTitle>
          <p className="text-xs text-muted-foreground">{lead.lead_id}</p>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div>
            <Label className="text-xs text-muted-foreground">โปรแกรม</Label>
            <p className="text-sm font-medium mt-0.5 text-foreground/80">{lead.program || lead.bu_type}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">สถานะ</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as LeadStatus)}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEAD_STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">ความเร่งด่วน</Label>
              <Select value={urgency} onValueChange={setUrgency}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {URGENCY_OPTIONS.map((u) => (
                    <SelectItem key={u.val} value={u.val} className="text-xs">{u.emoji} {u.val}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">จำนวน Pax</Label>
              <Input value={pax} onChange={(e) => setPax(e.target.value)} type="number" min={1} className="h-8 text-xs mt-1" />
            </div>
            <div>
              <Label className="text-xs">เดือนเดินทาง</Label>
              <Input value={travelMonth} onChange={(e) => setTravelMonth(e.target.value)} className="h-8 text-xs mt-1" placeholder="เช่น สิงหาคม" />
            </div>
            <div>
              <Label className="text-xs">ราคา Quote (฿)</Label>
              <Input value={quotedPrice} onChange={(e) => setQuotedPrice(e.target.value)} type="number" className="h-8 text-xs mt-1" />
            </div>
            <div>
              <Label className="text-xs">วัน Follow-up</Label>
              <Input value={nextFollowup} onChange={(e) => setNextFollowup(e.target.value)} type="date" className="h-8 text-xs mt-1" />
            </div>
          </div>
          {isCancelling && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 space-y-2.5">
              <p className="text-xs font-semibold text-destructive">❌ ระบุเหตุผลที่ยกเลิก</p>
              <div>
                <Label className="text-xs">เหตุผลหลัก *</Label>
                <Select value={lostReason} onValueChange={setLostReason}>
                  <SelectTrigger className="mt-1 border-destructive/30 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LOST_REASONS.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">รายละเอียดเพิ่มเติม (ไม่บังคับ)</Label>
                <Textarea
                  value={lostNote}
                  onChange={(e) => setLostNote(e.target.value)}
                  className="mt-1 min-h-[50px] text-sm border-destructive/30"
                  placeholder="เช่น ลูกค้าบอกว่าเพื่อนแนะนำบริษัทอื่น..."
                />
              </div>
            </div>
          )}
          <div>
            <Label className="text-xs">หมายเหตุ</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} className="min-h-[60px] text-sm mt-1" placeholder="เพิ่มหมายเหตุ..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}><X className="w-3.5 h-3.5 mr-1" />ยกเลิก</Button>
          <Button size="sm" className={isCancelling ? "bg-destructive hover:bg-destructive/90" : "bg-gradient-primary"} onClick={handleSave}>
            <Save className="w-3.5 h-3.5 mr-1" />{isCancelling ? "ยืนยันยกเลิก" : "บันทึก"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Customers() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useCurrentUser();
  const customers = useCRM((s) => s.customers);
  const leads     = useCRM((s) => s.leads);
  const currentRep = useCRM((s) => s.currentRep);
  const transferCustomer = useCRM((s) => s.transferCustomer);
  const deleteCustomer = useCRM((s) => s.deleteCustomer);
  const addCustomer = useCRM((s) => s.addCustomer);
  const { requests: deleteRequests, loadRequests, addRequest } = useDeleteRequests();

  // โหลด delete requests เพื่อตรวจสอบสถานะ "รอลบ" ของลูกค้าแต่ละราย
  useEffect(() => { loadRequests(); }, [loadRequests]);

  // Set ของ customer_id ที่มี pending delete request อยู่ (ใช้ lookup O(1))
  const pendingDeleteIds = useMemo(
    () => new Set(deleteRequests.filter((r) => r.status === "pending").map((r) => r.customer_id)),
    [deleteRequests],
  );

  // ── Compute won spend + trips live จาก leads store ───────────────────────
  // เพื่อให้ตัวเลขใน list ตรงกับ CustomerDetail เสมอ (รวม seed leads ด้วย)
  // แทนการใช้ c.total_spend / c.total_trips ที่อาจ stale ใน DB
  const { wonSpendMap, wonTripsMap } = useMemo(() => {
    const spendMap = new Map<string, number>();
    const tripsMap = new Map<string, number>();
    for (const l of leads) {
      if (!isClosedStatus(l.status)) continue;
      const val = l.closed_price || l.quoted_price || 0;
      spendMap.set(l.customer_id, (spendMap.get(l.customer_id) ?? 0) + val);
      tripsMap.set(l.customer_id, (tripsMap.get(l.customer_id) ?? 0) + 1);
    }
    return { wonSpendMap: spendMap, wonTripsMap: tripsMap };
  }, [leads]);

  const SALES_REPS     = useActiveSalesNames() as SalesRep[];
  const salesTeamNames = useAllSalesTeamNames(); // app_users + sales_reps (ครอบคลุมชื่อเก่า เช่น "เฟิร์ส","โดนัท")
  const obNames = useActiveOBNames();
  const isMarketing = user?.role === "Marketing" || user?.role === "Marketing Manager" || user?.role === "Admin";
  const isAdmin = user?.role === "Admin";
  const isSalesManager = user?.role === "Sales Manager";
  const isOBManager = user?.role === "OB Manager";
  const isOBRole = user?.role === "OB Co-ordinator" || isOBManager;
  const canDirectDelete = isAdmin || isSalesManager || isOBManager;
  // Split-pane: show for OB/Sales roles (Marketing redirects to its own page)
  const useSplitPane = (isOBRole || user?.role === "Sales" || isSalesManager) && !isMarketing && !isAdmin;

  // ── Marketing: Department filter (OB | Sales | all) via URL ?dept= ──────────
  const [searchParams, setSearchParams] = useSearchParams();
  const [deptFilter, setDeptFilter] = useState<"all" | "OB" | "Sales">(() => {
    const d = searchParams.get("dept");
    if (d === "ob") return "OB";
    if (d === "sales") return "Sales";
    return "all";
  });
  // sync URL param เมื่อ deptFilter เปลี่ยน
  useEffect(() => {
    if (!isMarketing) return;
    const p = new URLSearchParams(searchParams);
    if (deptFilter === "OB") p.set("dept", "ob");
    else if (deptFilter === "Sales") p.set("dept", "sales");
    else p.delete("dept");
    setSearchParams(p, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deptFilter, isMarketing]);

  // ── Activity Feed scroll-to highlight ──
  const highlightId = searchParams.get("highlight");
  useEffect(() => {
    if (!highlightId) return;
    const tryScroll = (attempts = 0) => {
      const el = document.querySelector<HTMLElement>(`[data-customer-id="${highlightId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("row-highlight");
        setTimeout(() => el.classList.remove("row-highlight"), 2200);
      } else if (attempts < 10) {
        setTimeout(() => tryScroll(attempts + 1), 200);
      }
    };
    tryScroll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightId]);

  // obSet สำหรับ determine department ของลูกค้า (Marketing view)
  const obSet = useMemo(() => new Set(obNames), [obNames]);

  const [q, setQ] = useState("");
  // debounce q 200ms — ป้องกัน filter 300+ รายการทุก keydown
  const [debouncedQ, setDebouncedQ] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 200);
    return () => clearTimeout(t);
  }, [q]);

  const [openAdd, setOpenAdd] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [transferOf, setTransferOf] = useState<Customer | null>(null);
  const [transferTo, setTransferTo] = useState<SalesRep | "">("");
  const [deleteOf, setDeleteOf] = useState<Customer | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  // Filters
  const [filterTier, setFilterTier] = useState<Tier | "all">("all");
  const [filterSource, setFilterSource] = useState<Source | "all">("all");
  const [filterDateRange, setFilterDateRange] = useState<"all" | "7d" | "30d" | "90d" | "365d">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "spend_desc" | "spend_asc" | "name">("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = pageSize;

  const scoped = useMemo(() => {
    // Guard: ถ้า currentRep = null/undefined (Supabase ยังโหลดชื่อไม่เสร็จ)
    // ให้ treat เป็น "All" เพื่อป้องกัน obSet.add(null) ที่ทำให้ filter คืน 0 records
    const effectiveRep = currentRep || "All";

    // ── OB Co-ordinator ──────────────────────────────────────────────────────
    // ใช้ exclusion filter (กรอง Sales ออก) โดยใช้ salesTeamNames ที่อยู่ใน dep array
    // Guard: ถ้า salesTeamNames ยังว่าง (users ยังโหลดไม่เสร็จ) → คืน [] เพื่อป้องกัน data leak
    if (user?.role === "OB Co-ordinator") {
      if (salesTeamNames.length === 0) return []; // รอ users โหลดก่อน
      const salesSet = new Set<string>(salesTeamNames);
      return customers.filter((c) => {
        const owner = c.transferred_to ?? c.created_by;
        return !salesSet.has(owner as string);
      });
    }

    // ── OB Manager ───────────────────────────────────────────────────────────
    if (isOBManager) {
      if (salesTeamNames.length === 0) return []; // รอ users โหลดก่อน
      const salesSet = new Set<string>(salesTeamNames);
      return customers.filter((c) => {
        const owner = c.transferred_to ?? c.created_by;
        return !salesSet.has(owner as string);
      });
    }

    if (effectiveRep !== "All") {
      // Sales — เห็นเฉพาะของตัวเอง
      return customers.filter((c) =>
        c.created_by === effectiveRep ||
        c.transferred_from === effectiveRep ||
        c.transferred_to === effectiveRep,
      );
    }

    // Sales Manager — เห็นทุก customer ของทีม Sales เท่านั้น ห้ามเห็น OB
    if (isSalesManager) {
      const salesSet = new Set<string>(salesTeamNames);
      return customers.filter((c) => {
        const owner = c.transferred_to ?? c.created_by;
        return salesSet.has(owner as string);
      });
    }

    // effectiveRep === "All" (Admin / Marketing)
    if (isOBRole) {
      // fallback safety (ไม่ควรถึงตรงนี้แล้ว แต่เผื่อ)
      if (salesTeamNames.length === 0) return [];
      const salesSet = new Set<string>(salesTeamNames);
      return customers.filter((c) => !salesSet.has((c.transferred_to ?? c.created_by) as string));
    }
    // Admin, Sales Manager, Marketing → เห็นทั้งหมด แต่ Marketing แยก dept ได้
    if (isMarketing && deptFilter !== "all") {
      if (deptFilter === "OB") {
        return customers.filter((c) =>
          obSet.has(c.created_by) ||
          (c.transferred_to != null && obSet.has(c.transferred_to)) ||
          (c.transferred_from != null && obSet.has(c.transferred_from)),
        );
      }
      // Sales dept — ลูกค้าที่ไม่ใช่ OB
      return customers.filter((c) =>
        !obSet.has(c.created_by) &&
        (c.transferred_to == null || !obSet.has(c.transferred_to)) &&
        (c.transferred_from == null || !obSet.has(c.transferred_from)),
      );
    }
    return customers;
  }, [customers, currentRep, isOBRole, isSalesManager, obNames, salesTeamNames, isMarketing, deptFilter, obSet]);

  const filtered = useMemo(() => {
    const s = debouncedQ.trim().toLowerCase();
    let list = scoped;

    // Search
    if (s) {
      list = list.filter((c) =>
        c.full_name.toLowerCase().includes(s) ||
        c.phone.includes(s) ||
        c.company.toLowerCase().includes(s) ||
        c.line_id.toLowerCase().includes(s) ||
        c.created_by.toLowerCase().includes(s) ||
        (c.email ?? "").toLowerCase().includes(s) ||
        (c.province ?? "").toLowerCase().includes(s) ||
        (c.note ?? "").toLowerCase().includes(s),
      );
    }

    // Tier filter
    if (filterTier !== "all") list = list.filter((c) => c.customer_tier === filterTier);

    // Source filter
    if (filterSource !== "all") list = list.filter((c) => c.source === filterSource);

    // Date range filter (created_at)
    if (filterDateRange !== "all") {
      const days = { "7d": 7, "30d": 30, "90d": 90, "365d": 365 }[filterDateRange];
      const threshold = Date.now() - days * 24 * 60 * 60 * 1000;
      list = list.filter((c) => c.created_at && new Date(c.created_at).getTime() >= threshold);
    }

    // Sort
    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return (new Date(b.created_at ?? 0).getTime()) - (new Date(a.created_at ?? 0).getTime());
        case "oldest":
          return (new Date(a.created_at ?? 0).getTime()) - (new Date(b.created_at ?? 0).getTime());
        case "spend_desc":
          return (wonSpendMap.get(b.customer_id) ?? 0) - (wonSpendMap.get(a.customer_id) ?? 0);
        case "spend_asc":
          return (wonSpendMap.get(a.customer_id) ?? 0) - (wonSpendMap.get(b.customer_id) ?? 0);
        case "name":
          return a.full_name.localeCompare(b.full_name, "th");
      }
    });
    return sorted;
  }, [scoped, debouncedQ, filterTier, filterSource, filterDateRange, sortBy]);

  // Reset to page 1 whenever filter/search/pageSize changes
  useEffect(() => { setPage(1); }, [debouncedQ, filterTier, filterSource, filterDateRange, sortBy, pageSize]);

  // ── Split-pane computed ───────────────────────────────────────────────────
  const latestLeadByCustomer = useMemo(() => {
    const map = new Map<string, LeadStatus>();
    const priority = (s: LeadStatus) => isLostStatus(s) ? 2 : isClosedStatus(s) ? 1 : 0;
    leads.forEach((l) => {
      const cur = map.get(l.customer_id);
      if (!cur || priority(l.status) < priority(cur)) map.set(l.customer_id, l.status);
    });
    return map;
  }, [leads]);

  const selectedCustomer = useMemo(
    () => (selectedId ? scoped.find((c) => c.customer_id === selectedId) ?? null : null),
    [scoped, selectedId],
  );

  // ── RFM Profile: คำนวณจากยอด live (wonSpendMap/wonTripsMap) ─────────────────
  const selectedRFM = useMemo(() => {
    if (!selectedCustomer) return null;
    const c = {
      ...selectedCustomer,
      total_trips: wonTripsMap.get(selectedCustomer.customer_id) ?? (selectedCustomer as any).total_trips ?? 0,
      total_spend: wonSpendMap.get(selectedCustomer.customer_id) ?? (selectedCustomer as any).total_spend ?? 0,
    };
    return computeRFM(c);
  }, [selectedCustomer, wonSpendMap, wonTripsMap]);

  const selectedLeads = useMemo(
    () =>
      selectedId
        ? leads
            .filter((l) => l.customer_id === selectedId)
            .sort((a, b) => {
              const p = (s: LeadStatus) => (isLostStatus(s) ? 2 : isClosedStatus(s) ? 1 : 0);
              return p(a.status) - p(b.status);
            })
        : [],
    [leads, selectedId],
  );

  // Auto-select first item when split-pane + filter changes
  useEffect(() => {
    if (!useSplitPane) return;
    setSelectedId((prev) => {
      if (prev && filtered.some((c) => c.customer_id === prev)) return prev;
      return filtered[0]?.customer_id ?? null;
    });
  }, [filtered, useSplitPane]);

  // Reset detail tab when selected customer changes
  useEffect(() => { setEditingLead(null); }, [selectedId]);

  const resetFilters = () => {
    setFilterTier("all");
    setFilterSource("all");
    setFilterDateRange("all");
    setSortBy("newest");
    setQ("");
  };
  const hasActiveFilter = filterTier !== "all" || filterSource !== "all" || filterDateRange !== "all" || q !== "";
  const activeFilterCount = [filterTier !== "all", filterSource !== "all", filterDateRange !== "all"].filter(Boolean).length;
  const DATE_LABELS: Record<string, string> = { "7d": "7 วัน", "30d": "30 วัน", "90d": "90 วัน", "365d": "1 ปี" };

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedCustomers = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Marketing revenue breakdown (OB vs Sales) — ใช้ scoped ทั้งหมด ไม่ผ่าน filter
  const marketingStats = useMemo(() => {
    if (!isMarketing) return null;
    let obCount = 0, obRev = 0, salesCount = 0, salesRev = 0;
    scoped.forEach((c) => {
      const isOB = obSet.has(c.created_by) || obSet.has(c.transferred_to ?? "") || obSet.has(c.transferred_from ?? "");
      const spend = wonSpendMap.get(c.customer_id) ?? 0;
      if (isOB) { obCount++; obRev += spend; }
      else { salesCount++; salesRev += spend; }
    });
    return { obCount, obRev, salesCount, salesRev, total: scoped.length, totalRev: obRev + salesRev };
  }, [isMarketing, scoped, obSet, wonSpendMap]);

  // Build export-ready records from filtered customers
  const exportData = useMemo(() =>
    filtered.map((c) => ({
      full_name: c.full_name,
      company: c.company,
      phone: c.phone,
      line_id: c.line_id,
      email: c.email ?? "",
      province: c.province ?? "",
      source: c.source,
      segment: c.segment,
    })),
    [filtered],
  );

  const handleImport = (rows: Record<string, unknown>[]) => {
    rows.forEach((row) => {
      // แปลง interests: รับทั้ง string คั่นด้วย , หรือ array
      const rawInterests = row.interests;
      const interests: string[] = rawInterests
        ? (typeof rawInterests === "string"
            ? rawInterests.split(",").map((s) => s.trim()).filter(Boolean)
            : Array.isArray(rawInterests) ? rawInterests : [])
        : [];

      addCustomer({
        full_name:    String(row.full_name    ?? ""),
        company:      String(row.company      ?? "-"),
        phone:        String(row.phone        ?? ""),
        line_id:      String(row.line_id      ?? "-"),
        email:        row.email      ? String(row.email)      : undefined,
        birthday:     row.birthday   ? String(row.birthday)   : undefined,
        province:     row.province   ? String(row.province)   : undefined,
        interests:    interests.length > 0 ? interests : undefined,
        note:         row.note       ? String(row.note)       : undefined,
        source:       (row.source    as Source) || "Field Sale",
        segment:      (row.segment   as any)    || "B2C Individual",
        created_by:   (row.created_by as any)   || "เฟิร์ส",
      } as any);
    });
    toast.success(`นำเข้า ${rows.length} ลูกค้าแล้ว`);
  };

  // Marketing role ที่เข้า /app/customers → redirect ไป /marketing/customers
  // (ตรวจ path ก่อน: ไม่ redirect ถ้าอยู่ใน /marketing/* อยู่แล้ว ป้องกัน infinite loop)
  // เก็บ query string (เช่น ?dept=ob) ไว้ด้วย — ไม่งั้นตัวกรอง OB/Sales จะหายไปตอน redirect
  if ((user?.role === "Marketing" || user?.role === "Marketing Manager") && location.pathname.startsWith("/app")) {
    return <Navigate to={`/marketing/customers${location.search}`} replace />;
  }

  // ── Split-pane layout (OB / Sales roles) ────────────────────────────────
  if (useSplitPane) {
    const activeLeads   = selectedLeads.filter((l) => !isClosedStatus(l.status) && !isLostStatus(l.status));
    const lostLeads     = selectedLeads.filter((l) => isLostStatus(l.status));
    const closedValue   = selectedLeads.filter((l) => isClosedStatus(l.status)).reduce((s, l) => s + (l.closed_price || l.quoted_price || 0), 0);
    const activeQuoted  = activeLeads.reduce((sum, l) => sum + (l.quoted_price ?? 0), 0);
    const latestStatus  = selectedCustomer ? latestLeadByCustomer.get(selectedCustomer.customer_id) : undefined;

    // ── Left-panel aggregate stats (ตาม filtered list) ──
    const filteredSet     = new Set(filtered.map((c) => c.customer_id));
    const panelTotalSpend = filtered.reduce((sum, c) => sum + (wonSpendMap.get(c.customer_id) ?? 0), 0);
    const panelTotalTrips = filtered.reduce((sum, c) => sum + (wonTripsMap.get(c.customer_id) ?? 0), 0);
    const panelPipeline   = leads
      .filter((l) => filteredSet.has(l.customer_id) && !isClosedStatus(l.status) && !isLostStatus(l.status))
      .reduce((sum, l) => sum + (l.quoted_price ?? 0), 0);

    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] p-3 sm:p-4 gap-3 overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center gap-3 shrink-0">
          <div>
            <h1 className="text-lg font-bold leading-tight">ฐานข้อมูลลูกค้า</h1>
            <p className="text-xs text-muted-foreground">
              {currentRep !== "All" ? currentRep : (isOBRole ? "OB ทั้งทีม" : "Sales ทั้งทีม")} · {filtered.length} ราย
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ImportExportMenu
              fields={CUSTOMER_FIELDS}
              sheetName="ลูกค้า"
              filename="customers"
              data={exportData}
              onImport={handleImport}
            />
            <Button className="bg-gradient-primary h-8 px-3 text-xs gap-1.5" onClick={() => setOpenAdd(true)}>
              <Plus className="w-3.5 h-3.5" /> เพิ่มลูกค้า / สร้าง Lead
            </Button>
          </div>
        </div>

        {/* ── Split pane ── */}
        <div className="flex gap-3 flex-1 min-h-0 overflow-hidden">

          {/* ── Left panel: list ── */}
          <div className="w-1/3 shrink-0 flex flex-col bg-card border rounded-xl overflow-hidden shadow-sm">

            {/* Summary stats strip */}
            <div className="grid grid-cols-3 shrink-0 border-b border-border bg-muted/10">
              <div className="px-2 py-2.5 text-center border-r border-border">
                <p className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400 leading-tight">{fmtMoney(panelTotalSpend)}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">ยอดรวม</p>
              </div>
              <div className="px-2 py-2.5 text-center border-r border-border">
                <p className="text-[12px] font-bold text-violet-600 dark:text-violet-400 leading-tight">{panelTotalTrips} ครั้ง</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">จองแล้ว</p>
              </div>
              <div className="px-2 py-2.5 text-center">
                <p className="text-[12px] font-bold text-amber-600 dark:text-amber-400 leading-tight">{fmtMoney(panelPipeline)}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">Pipeline</p>
              </div>
            </div>

            {/* Filter bar */}
            <div className="p-2.5 border-b border-border shrink-0 space-y-2">
              <div className="flex gap-1.5">
                <select
                  value={filterSource}
                  onChange={(e) => setFilterSource(e.target.value as Source | "all")}
                  className="flex-1 h-8 rounded-lg border border-border bg-background text-xs px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-violet-400 cursor-pointer"
                >
                  <option value="all">ทุกช่องทาง</option>
                  {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="flex-1 h-8 rounded-lg border border-border bg-background text-xs px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-violet-400 cursor-pointer"
                >
                  <option value="newest">ใหม่สุด</option>
                  <option value="spend_desc">ยอดสูงสุด</option>
                  <option value="spend_asc">ยอดน้อยสุด</option>
                  <option value="name">ชื่อ ก-ฮ</option>
                </select>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="ค้นหาชื่อ, เบอร์..."
                  className="pl-8 h-8 text-xs"
                />
              </div>
            </div>

            {/* Count */}
            <div className="px-3 py-1.5 border-b border-border shrink-0 bg-muted/20">
              <p className="text-[10px] text-muted-foreground font-medium">{filtered.length} รายการ</p>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  <Users2 className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p>ไม่พบลูกค้า</p>
                </div>
              ) : (
                filtered.map((c) => {
                  const status  = latestLeadByCustomer.get(c.customer_id) ?? "ใหม่";
                  const lStyle  = leadStatusStyle(status);
                  const spend   = wonSpendMap.get(c.customer_id) ?? 0;
                  const isSelected = c.customer_id === selectedId;
                  return (
                    <div
                      key={c.customer_id}
                      data-customer-id={c.customer_id}
                      className={`flex items-center gap-2.5 px-3 py-2.5 cursor-pointer border-b border-border transition-colors ${
                        isSelected
                          ? "bg-violet-50/80 dark:bg-violet-900/20 border-l-2 border-l-violet-500"
                          : "hover:bg-muted/40"
                      }`}
                      onClick={() => setSelectedId(c.customer_id)}
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {c.full_name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${isSelected ? "text-violet-700 dark:text-violet-300" : ""}`}>
                          {c.full_name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${lStyle.pill}`}>{lStyle.label}</span>
                          <span className="text-[10px] text-muted-foreground">{c.source}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {spend > 0
                          ? <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{fmtMoney(spend)}</p>
                          : <p className="text-[10px] text-muted-foreground">—</p>
                        }
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ── Right panel: detail ── */}
          <div className="flex-1 bg-card border rounded-xl overflow-hidden shadow-sm flex flex-col min-w-0">
            {!selectedCustomer ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Users2 className="w-10 h-10 opacity-20" />
                <p className="text-sm">เลือกลูกค้าจากรายการ</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0">

                {/* Customer header */}
                <div className="px-5 py-4 border-b border-border bg-gradient-to-r from-violet-50/60 to-transparent dark:from-violet-900/20 shrink-0">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white text-xl font-bold shrink-0 shadow">
                      {selectedCustomer.full_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg font-bold">{selectedCustomer.full_name}</h2>
                        <Badge variant="outline" className={`text-[10px] px-2 ${tierBadge(selectedCustomer.customer_tier)}`}>
                          <Star className="w-2.5 h-2.5 mr-1" />{selectedCustomer.customer_tier}
                        </Badge>
                        {latestStatus && (
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${leadStatusStyle(latestStatus).pill}`}>
                            {leadStatusStyle(latestStatus).label}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {selectedCustomer.source} · {selectedCustomer.created_by}
                        {selectedCustomer.last_contacted_at && ` · ติดต่อล่าสุด ${fmtDate(selectedCustomer.last_contacted_at)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                      <Button size="sm" variant="outline" className="h-8 px-3 text-xs gap-1.5"
                        onClick={() => setEditing(selectedCustomer)}>
                        <Pencil className="w-3.5 h-3.5" /> แก้ไขข้อมูล
                      </Button>
                      {currentRep !== "All" && selectedCustomer.created_by === currentRep && (
                        <Button size="sm" variant="outline"
                          className="h-8 px-3 text-xs gap-1.5 text-amber-600 border-amber-300 hover:bg-amber-50 dark:border-amber-700 dark:hover:bg-amber-900/20"
                          onClick={() => { setTransferOf(selectedCustomer); setTransferTo(""); }}>
                          <ArrowRightLeft className="w-3.5 h-3.5" /> โอน
                        </Button>
                      )}
                      {canDirectDelete ? (
                        <Button size="sm" variant="outline"
                          className="h-8 px-3 text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5"
                          onClick={() => { setDeleteOf(selectedCustomer); setDeleteReason(""); }}>
                          <Trash2 className="w-3.5 h-3.5" /> ลบ
                        </Button>
                      ) : currentRep !== "All" && !pendingDeleteIds.has(selectedCustomer.customer_id) ? (
                        <Button size="sm" variant="outline"
                          className="h-8 px-3 text-xs gap-1.5 text-destructive/70 border-destructive/20 hover:bg-destructive/5"
                          onClick={() => { setDeleteOf(selectedCustomer); setDeleteReason(""); }}>
                          <Trash2 className="w-3.5 h-3.5" /> ขอลบ
                        </Button>
                      ) : pendingDeleteIds.has(selectedCustomer.customer_id) ? (
                        <span className="h-8 flex items-center gap-1 px-2.5 text-xs text-amber-500 border border-amber-200 rounded-md">
                          <Clock className="w-3.5 h-3.5" /> รอ Manager
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Stats strip — 5 cols */}
                <div className="grid grid-cols-5 border-b border-border shrink-0">
                  {[
                    { label: "ทริปสำเร็จ", value: `${wonTripsMap.get(selectedCustomer.customer_id) ?? 0} ครั้ง`, cls: "text-violet-600 dark:text-violet-400" },
                    { label: "ยอดใช้จริง", value: fmtMoney(wonSpendMap.get(selectedCustomer.customer_id) ?? 0), cls: "text-emerald-600 dark:text-emerald-400" },
                    { label: "Active Lead", value: `${activeLeads.length}`, cls: "text-amber-600" },
                    { label: "Quote รอปิด", value: activeQuoted > 0 ? fmtMoney(activeQuoted) : "—", cls: "text-amber-600" },
                    { label: "Lead เสีย",   value: `${lostLeads.length}`, cls: "text-destructive" },
                  ].map(({ label, value, cls }) => (
                    <div key={label} className="px-2 py-2.5 text-center border-r border-border last:border-r-0">
                      <p className={`text-sm font-bold ${cls}`}>{value}</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>

                {/* ── Blog scroll: ข้อมูล + Leads + โอน + บันทึก ── */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">

                  {/* Row 1: ข้อมูลติดต่อ + ข้อมูลลูกค้า */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Contact card */}
                    <div className="bg-card border rounded-xl p-4 space-y-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">ข้อมูลติดต่อ</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <a href={`tel:${selectedCustomer.phone}`} className="text-violet-600 hover:underline">{selectedCustomer.phone}</a>
                        </div>
                        {selectedCustomer.line_id && selectedCustomer.line_id !== "-" && (
                          <div className="flex items-center gap-2">
                            <MessageCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span>{selectedCustomer.line_id}</span>
                          </div>
                        )}
                        {selectedCustomer.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate text-xs">{selectedCustomer.email}</span>
                          </div>
                        )}
                        {selectedCustomer.province && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="text-xs">{selectedCustomer.province}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1.5 pt-2 border-t border-border flex-wrap">
                        <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs gap-1" asChild>
                          <a href={`tel:${selectedCustomer.phone}`}><Phone className="w-3 h-3" /> โทร</a>
                        </Button>
                        {selectedCustomer.line_id && selectedCustomer.line_id !== "-" && (
                          <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs gap-1">
                            <MessageCircle className="w-3 h-3" /> LINE
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Customer info card */}
                    <div className="bg-card border rounded-xl p-4 space-y-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">ข้อมูลลูกค้า</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                        <div><p className="text-muted-foreground">ช่องทาง</p><p className="font-semibold mt-0.5">{selectedCustomer.source}</p></div>
                        <div><p className="text-muted-foreground">กลุ่มลูกค้า</p><p className="font-semibold mt-0.5 leading-tight">{(selectedCustomer as any).segment ?? "—"}</p></div>
                        <div><p className="text-muted-foreground">Sales</p><p className="font-semibold mt-0.5 text-violet-600 dark:text-violet-400">{selectedCustomer.created_by}</p></div>
                        {(selectedCustomer as any).birthday && (
                          <div><p className="text-muted-foreground">วันเกิด</p><p className="font-semibold mt-0.5">{new Date((selectedCustomer as any).birthday).toLocaleDateString("th-TH", { day: "numeric", month: "long" })}</p></div>
                        )}
                        {selectedCustomer.created_at && (
                          <div><p className="text-muted-foreground">เพิ่มเมื่อ</p><p className="font-semibold mt-0.5">{fmtDate(selectedCustomer.created_at)}</p></div>
                        )}
                        {selectedCustomer.last_contacted_at && (
                          <div><p className="text-muted-foreground">ติดต่อล่าสุด</p><p className="font-semibold mt-0.5">{fmtDate(selectedCustomer.last_contacted_at)}</p></div>
                        )}
                      </div>
                      {((selectedCustomer as any).interests ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-2 border-t border-border">
                          {((selectedCustomer as any).interests as string[]).map((key) => (
                            <span key={key} className="text-[10px] px-2 py-0.5 rounded-full border border-violet-200 bg-violet-50/50 text-violet-700 dark:bg-violet-900/20 dark:border-violet-700 dark:text-violet-300">{key}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Row 1.5: RFM Profile */}
                  {selectedRFM && (
                    <div className="bg-card border rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">RFM Profile</p>
                        <Badge variant="outline" className={`text-[9px] px-2 ${RFM_SEGMENT_STYLE[selectedRFM.segment].pill}`}>
                          {RFM_SEGMENT_STYLE[selectedRFM.segment].label}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-muted/40 border rounded-xl p-3 text-center">
                          <p className={`text-sm font-bold ${RFM_SCORE_COLOR[selectedRFM.rScore]}`}>{selectedRFM.rLabel}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">ล่าสุด (R)</p>
                        </div>
                        <div className="bg-muted/40 border rounded-xl p-3 text-center">
                          <p className={`text-sm font-bold ${RFM_SCORE_COLOR[selectedRFM.fScore]}`}>
                            {wonTripsMap.get(selectedCustomer?.customer_id ?? "") ?? (selectedCustomer as any)?.total_trips ?? 0} ครั้ง
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">ความถี่ (F)</p>
                        </div>
                        <div className="bg-muted/40 border rounded-xl p-3 text-center">
                          <p className={`text-sm font-bold ${RFM_SCORE_COLOR[selectedRFM.mScore]}`}>
                            {fmtMoney(wonSpendMap.get(selectedCustomer?.customer_id ?? "") ?? (selectedCustomer as any)?.total_spend ?? 0)}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">ยอดรวม (M)</p>
                        </div>
                      </div>
                      <div className="rounded-xl border border-violet-200/60 bg-violet-50/60 dark:bg-violet-900/15 dark:border-violet-800/40 px-3 py-2.5">
                        <p className="text-[10px] font-bold text-violet-600 dark:text-violet-400 mb-1">คำแนะนำ</p>
                        <p className="text-[11px] text-foreground/70 leading-relaxed">{selectedRFM.insight}</p>
                      </div>
                    </div>
                  )}

                  {/* Row 2: Leads */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        LEADS ({selectedLeads.length})
                      </p>
                      <Button size="sm"
                        className="h-7 px-2.5 text-xs gap-1 bg-violet-600 hover:bg-violet-700 text-white"
                        onClick={() => setOpenAdd(true)}>
                        <Plus className="w-3 h-3" /> สร้าง Lead
                      </Button>
                    </div>
                    {selectedLeads.length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground border border-dashed border-border rounded-xl">
                        <p className="text-sm mb-2">ยังไม่มี Lead</p>
                        <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setOpenAdd(true)}>
                          + สร้าง Lead แรก
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedLeads.map((l) => {
                          const lStyle = leadStatusStyle(l.status);
                          const lv = l.closed_price || l.quoted_price;
                          return (
                            <div key={l.lead_id} className="border border-border rounded-xl overflow-hidden bg-card">
                              <div className="flex items-center gap-3 px-4 py-3">
                                <div className={`w-1 h-10 rounded-full shrink-0 ${lStyle.bar}`} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-semibold truncate">{l.program || l.bu_type || "—"}</span>
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${lStyle.pill}`}>{lStyle.label}</span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground flex-wrap">
                                    <span className="flex items-center gap-1"><Users2 className="w-3 h-3" />{l.pax_count} ท่าน</span>
                                    {l.travel_month && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{l.travel_month}</span>}
                                    {l.assigned_to && <span>· {l.assigned_to}</span>}
                                  </div>
                                </div>
                                {lv ? (
                                  <div className="text-right shrink-0 space-y-0.5">
                                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{fmtMoney(lv)}</p>
                                    {(l.discount ?? 0) > 0 ? (
                                      <span className="inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-700">
                                        โปรโมชั่น -฿{formatTHB(l.discount!)}
                                      </span>
                                    ) : (
                                      <span className="inline-block text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                                        ราคาเต็ม
                                      </span>
                                    )}
                                    {l.closed_date && <p className="text-[10px] text-muted-foreground">ปิด {fmtDate(l.closed_date)}</p>}
                                  </div>
                                ) : null}
                              </div>
                              <div className="flex items-center gap-1 px-3 py-1.5 border-t border-border bg-muted/20">
                                <Button size="sm" variant="ghost"
                                  className="h-6 text-[10px] text-violet-600 dark:text-violet-400 px-2 gap-1 hover:bg-violet-50 dark:hover:bg-violet-900/20"
                                  onClick={() => setEditingLead(l)}>
                                  <Pencil className="w-3 h-3" /> แก้ไข Lead
                                </Button>
                                {(l.bu_type || l.status_note) && (
                                  <span className="text-[10px] text-muted-foreground truncate">
                                    {l.bu_type && `· ${l.bu_type}`}
                                    {l.status_note && ` · ${l.status_note}`}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Row 3: ประวัติโอน */}
                  {((selectedCustomer as any).transfer_logs ?? []).length > 0 && (
                    <div className="bg-card border rounded-xl overflow-hidden">
                      <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex items-center gap-2">
                        <ArrowRightLeft className="w-3.5 h-3.5 text-muted-foreground" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          ประวัติโอน ({((selectedCustomer as any).transfer_logs ?? []).length} ครั้ง)
                        </p>
                      </div>
                      <div className="p-3">
                        <ol className="relative border-l border-border space-y-3 ml-3">
                          {[...((selectedCustomer as any).transfer_logs ?? [])].reverse().map((log: any) => (
                            <li key={log.log_id} className="ml-4">
                              <div className="absolute -left-[7px] mt-1 w-3 h-3 rounded-full border-2 border-background bg-violet-500" />
                              <div className="bg-muted/30 rounded-lg px-2.5 py-2 space-y-0.5">
                                <p className="text-xs font-medium">
                                  <span className="text-muted-foreground">{log.from_rep}</span>
                                  {" → "}
                                  <span className="font-semibold text-violet-600 dark:text-violet-400">{log.to_rep}</span>
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  🕐 {fmtDate(log.transferred_at)}
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

                  {/* Row 4: บันทึก */}
                  {selectedCustomer.note && (
                    <div className="bg-amber-50/60 dark:bg-amber-900/15 border border-amber-200/60 rounded-xl p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600/80 mb-2">บันทึก</p>
                      <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{selectedCustomer.note}</p>
                    </div>
                  )}

                </div>

              </div>
            )}
          </div>
        </div>

        {/* Dialogs */}
        <CustomerLeadDialog open={openAdd} onOpenChange={setOpenAdd} />
        <EditCustomerDialog customer={editing} onClose={() => setEditing(null)} />
        {editingLead && <LeadEditDialog lead={editingLead} onClose={() => setEditingLead(null)} />}
        <Dialog open={!!transferOf} onOpenChange={(o) => !o && setTransferOf(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>โอนลูกค้าให้ Sales คนอื่น</DialogTitle></DialogHeader>
            {transferOf && (
              <div className="space-y-3">
                <p className="text-sm">ลูกค้า: <b>{transferOf.full_name}</b></p>
                <div>
                  <label className="text-xs font-semibold">เลือก Sales ปลายทาง</label>
                  <Select value={transferTo} onValueChange={(v) => setTransferTo(v as SalesRep)}>
                    <SelectTrigger><SelectValue placeholder="เลือก Sales..." /></SelectTrigger>
                    <SelectContent>
                      {SALES_REPS.filter((r) => r !== transferOf.created_by).map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setTransferOf(null)}>ยกเลิก</Button>
              <Button className="bg-amber-600 hover:bg-amber-700 text-white" disabled={!transferTo}
                onClick={() => { if (!transferOf || !transferTo) return; transferCustomer(transferOf.customer_id, transferTo as SalesRep); toast.success(`โอนลูกค้า ${transferOf.full_name} ให้ ${transferTo} แล้ว`); setTransferOf(null); }}>
                ยืนยันโอน
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={!!deleteOf} onOpenChange={(o) => !o && setDeleteOf(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="w-5 h-5" />
                {canDirectDelete ? "ลบลูกค้า" : "ขอลบลูกค้า"}
              </DialogTitle>
            </DialogHeader>
            {deleteOf && (
              <div className="space-y-4">
                <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3">
                  <p className="text-sm font-semibold">{deleteOf.full_name}</p>
                  <p className="text-xs text-muted-foreground">{deleteOf.phone}</p>
                </div>
                {canDirectDelete
                  ? <p className="text-xs text-destructive/80">⚠️ การลบจะ<strong>ถาวร</strong> ไม่สามารถกู้คืนได้</p>
                  : <p className="text-xs text-muted-foreground">⚠️ คำขอจะถูกส่งให้ Manager พิจารณา</p>
                }
                <div>
                  <label className="text-xs font-semibold block mb-1.5">เหตุผล (ถ้ามี)</label>
                  <Textarea value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} rows={3} className="text-sm resize-none" />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOf(null)}>ยกเลิก</Button>
              <Button variant="destructive" onClick={async () => {
                if (!deleteOf || !user) return;
                if (canDirectDelete) { deleteCustomer(deleteOf.customer_id); }
                else { await addRequest({ customer_id: deleteOf.customer_id, customer_name: deleteOf.full_name, requested_by: user.full_name, reason: deleteReason.trim() || undefined, department: user.role === "OB Co-ordinator" ? "ob" : "sales" }); }
                setDeleteOf(null);
              }}>
                <Trash2 className="w-4 h-4 mr-1.5" />
                {canDirectDelete ? "ลบทันที" : "ส่งคำขอให้ Manager"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">ฐานข้อมูลลูกค้า</h1>
          <p className="text-sm text-muted-foreground">
            {currentRep === "All" ? "จัดการข้อมูลลูกค้าทั้งทีม" : `ฐานข้อมูลลูกค้าของ ${currentRep}`} — {filtered.length} รายการ
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <ImportExportMenu
            fields={CUSTOMER_FIELDS}
            sheetName="ลูกค้า"
            filename="customers"
            data={exportData}
            onImport={handleImport}
          />
          {/* Marketing Export — LINE & Facebook */}
          {isMarketing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-50 gap-1.5">
                  <Megaphone className="w-4 h-4" />
                  <span className="hidden sm:inline">Marketing Export</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Export สำหรับแคมเปญ ({filtered.length} คน)
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => exportLineList(filtered)} className="gap-2 cursor-pointer">
                  <span className="text-base">💬</span>
                  <div>
                    <p className="font-semibold text-sm">LINE OA Broadcast List</p>
                    <p className="text-xs text-muted-foreground">ชื่อ + เบอร์ + Line ID + ความสนใจ</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportFBList(filtered)} className="gap-2 cursor-pointer">
                  <span className="text-base">📱</span>
                  <div>
                    <p className="font-semibold text-sm">Facebook Custom Audience</p>
                    <p className="text-xs text-muted-foreground">Phone + Email + ชื่อ + จังหวัด (FB format)</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="px-3 py-1.5 text-[11px] text-muted-foreground">
                  💡 ใช้ Filter ก่อน Export เพื่อเลือกกลุ่มเป้าหมาย
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button className="bg-gradient-primary" onClick={() => setOpenAdd(true)}><Plus className="w-4 h-4 mr-2" /> เพิ่มลูกค้า / สร้าง Lead</Button>
        </div>
      </div>

      {/* ── Marketing: Department Tab Filter ─────────────────────────────── */}
      {isMarketing && obNames.length > 0 && (
        <div className="flex items-center gap-1 bg-muted/40 rounded-xl p-1 w-fit">
          {(["all", "OB", "Sales"] as const).map((d) => {
            const labels = { all: "ลูกค้าทั้งหมด", OB: "📣 Outbound", Sales: "🤝 Sales" };
            const counts = {
              all: customers.length,
              OB:  customers.filter((c) => obSet.has(c.created_by)).length,
              Sales: customers.filter((c) => !obSet.has(c.created_by)).length,
            };
            const active = deptFilter === d;
            return (
              <button
                key={d}
                onClick={() => setDeptFilter(d)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? d === "OB"
                      ? "bg-purple-500 text-white shadow-sm"
                      : d === "Sales"
                      ? "bg-blue-500 text-white shadow-sm"
                      : "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {labels[d]}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  active ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                }`}>
                  {counts[d]}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Marketing revenue stats strip ── */}
      {isMarketing && marketingStats && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-50/70 dark:bg-violet-900/20 border border-violet-200/60">
            <div className="w-2 h-2 rounded-full bg-violet-500 shrink-0" />
            <span className="text-[11px] text-muted-foreground">OB</span>
            <span className="text-sm font-bold text-violet-700 dark:text-violet-400">{marketingStats.obCount} ราย</span>
            {marketingStats.obRev > 0 && (
              <>
                <span className="opacity-30">·</span>
                <span className="text-sm font-bold text-emerald-600 tabular-nums">{fmtMoney(marketingStats.obRev)}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-50/70 dark:bg-orange-900/20 border border-orange-200/60">
            <div className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
            <span className="text-[11px] text-muted-foreground">Sales</span>
            <span className="text-sm font-bold text-orange-700 dark:text-orange-400">{marketingStats.salesCount} ราย</span>
            {marketingStats.salesRev > 0 && (
              <>
                <span className="opacity-30">·</span>
                <span className="text-sm font-bold text-emerald-600 tabular-nums">{fmtMoney(marketingStats.salesRev)}</span>
              </>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/40 border border-border/60">
            <span className="text-[11px] text-muted-foreground">รวม</span>
            <span className="text-sm font-bold">{marketingStats.total} ราย</span>
            {marketingStats.totalRev > 0 && (
              <>
                <span className="opacity-30">·</span>
                <span className="text-sm font-bold text-emerald-600 tabular-nums">{fmtMoney(marketingStats.totalRev)}</span>
              </>
            )}
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl border shadow-soft p-3 space-y-2">
        {/* Row 1: Search + Filter toggle + Sort */}
        <div className="flex gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่อ, เบอร์โทร, องค์กร..." className="pl-9 h-10" />
          </div>
          <Button
            variant={activeFilterCount > 0 ? "default" : "outline"}
            className={`shrink-0 gap-1.5 h-10 ${activeFilterCount > 0 ? "bg-gradient-primary" : ""}`}
            onClick={() => setShowFilters((v) => !v)}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline text-sm">กรอง</span>
            {activeFilterCount > 0 && (
              <span className="bg-white/90 text-primary rounded-full w-4 h-4 text-[10px] font-bold flex items-center justify-center leading-none">
                {activeFilterCount}
              </span>
            )}
          </Button>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="w-[120px] sm:w-[140px] h-10 shrink-0 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">ใหม่ → เก่า</SelectItem>
              <SelectItem value="oldest">เก่า → ใหม่</SelectItem>
              <SelectItem value="spend_desc">ยอดมาก → น้อย</SelectItem>
              <SelectItem value="spend_asc">ยอดน้อย → มาก</SelectItem>
              <SelectItem value="name">ชื่อ ก-ฮ</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Active filter chips (when filters active and panel closed) */}
        {activeFilterCount > 0 && !showFilters && (
          <div className="flex gap-1.5 flex-wrap items-center">
            {filterDateRange !== "all" && (
              <button
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs border border-primary/20 hover:bg-primary/20 transition"
                onClick={() => setFilterDateRange("all")}
              >
                {DATE_LABELS[filterDateRange]}
                <X className="w-3 h-3" />
              </button>
            )}
            {filterTier !== "all" && (
              <button
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs border border-primary/20 hover:bg-primary/20 transition"
                onClick={() => setFilterTier("all")}
              >
                {filterTier} <X className="w-3 h-3" />
              </button>
            )}
            {filterSource !== "all" && (
              <button
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs border border-primary/20 hover:bg-primary/20 transition"
                onClick={() => setFilterSource("all")}
              >
                {filterSource} <X className="w-3 h-3" />
              </button>
            )}
            <button
              className="text-xs text-muted-foreground hover:text-destructive transition ml-auto"
              onClick={resetFilters}
            >
              ล้างทั้งหมด
            </button>
          </div>
        )}

        {/* Expandable filter panel */}
        {showFilters && (
          <div className="grid grid-cols-2 gap-2 pt-2 border-t">
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground font-medium">ช่วงเวลาเพิ่ม</label>
              <Select value={filterDateRange} onValueChange={(v) => setFilterDateRange(v as any)}>
                <SelectTrigger className="h-9 w-full text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกช่วงเวลา</SelectItem>
                  <SelectItem value="7d">7 วันล่าสุด</SelectItem>
                  <SelectItem value="30d">30 วันล่าสุด</SelectItem>
                  <SelectItem value="90d">90 วันล่าสุด</SelectItem>
                  <SelectItem value="365d">1 ปีล่าสุด</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground font-medium">Tier</label>
              <Select value={filterTier} onValueChange={(v) => setFilterTier(v as any)}>
                <SelectTrigger className="h-9 w-full text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุก Tier</SelectItem>
                  <SelectItem value="VIP">VIP</SelectItem>
                  <SelectItem value="Regular">Regular</SelectItem>
                  <SelectItem value="New">New</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground font-medium">ช่องทาง</label>
              <Select value={filterSource} onValueChange={(v) => setFilterSource(v as any)}>
                <SelectTrigger className="h-9 w-full text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกช่องทาง</SelectItem>
                  {SOURCES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="ghost" size="sm"
                onClick={() => { resetFilters(); setShowFilters(false); }}
                className="w-full h-9 text-xs text-muted-foreground hover:text-destructive"
              >
                ล้างตัวกรอง
              </Button>
            </div>
          </div>
        )}

        {/* Count row */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{filtered.length} รายการ · หน้า {page}/{totalPages}</span>
          {hasActiveFilter && !showFilters && activeFilterCount === 0 && (
            <button onClick={resetFilters} className="text-destructive/70 hover:text-destructive transition">
              ล้างการค้นหา
            </button>
          )}
        </div>
      </div>

      {/* Mobile: Compact list */}
      <div className="flex flex-col md:hidden bg-card border rounded-xl shadow-soft overflow-hidden divide-y">
        {filtered.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">ไม่พบข้อมูลลูกค้า</div>
        )}
        {pagedCustomers.map((c) => {
          const isOBCustomer = isMarketing && (obSet.has(c.created_by) || obSet.has(c.transferred_to ?? "") || obSet.has(c.transferred_from ?? ""));
          return (
          <div
            key={c.customer_id}
            data-customer-id={c.customer_id}
            className={`flex items-center gap-3 px-3 py-2 hover:bg-muted/40 transition cursor-pointer active:bg-muted/60 ${
              isMarketing ? (isOBCustomer ? "border-l-[3px] border-violet-400" : "border-l-[3px] border-orange-400") : ""
            }`}
            onClick={() => navigate(`/app/customers/${c.customer_id}`)}
          >
            {/* Avatar circle */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-sm ${
              isMarketing
                ? (isOBCustomer ? "bg-gradient-to-br from-violet-500 to-purple-600" : "bg-gradient-to-br from-orange-400 to-amber-500")
                : "bg-gradient-primary"
            }`}>
              {c.full_name.charAt(0)}
            </div>

            {/* Main info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm truncate">{c.full_name}</span>
                <Badge variant="outline" className={`${tierBadge(c.customer_tier)} shrink-0 text-[10px] px-1.5 py-0`}>{c.customer_tier}</Badge>
                {pendingDeleteIds.has(c.customer_id) && (
                  <Clock className="w-3 h-3 text-amber-500 shrink-0" title="รอ Manager อนุมัติลบ" />
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                {c.phone && c.phone !== "-" && (
                  <a href={`tel:${c.phone}`} className="flex items-center gap-1 text-primary" onClick={(e) => e.stopPropagation()}>
                    <Phone className="w-3 h-3" />{c.phone}
                  </a>
                )}
                {c.line_id && (
                  <span className="flex items-center gap-1 text-success truncate">
                    <MessageCircle className="w-3 h-3 shrink-0" />{c.line_id}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">
                  <span className="w-3 h-3 rounded-full bg-gradient-pink text-white flex items-center justify-center text-[8px] font-bold">{c.created_by[0]}</span>
                  {c.created_by}
                </span>
                {c.source && <span className="text-[10px] text-muted-foreground">{c.source}</span>}
                {(wonSpendMap.get(c.customer_id) ?? 0) > 0 && <span className="text-[10px] font-semibold text-primary ml-auto">฿{formatTHB(wonSpendMap.get(c.customer_id) ?? 0)}</span>}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
              {c.transferred_from === currentRep && c.transferred_to ? (
                <span className="text-muted-foreground p-1.5"><Lock className="w-4 h-4" /></span>
              ) : (
                <>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(c)}>
                    <Pencil className="w-3.5 h-3.5 text-primary" />
                  </Button>
                  {currentRep !== "All" && c.created_by === currentRep && (
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setTransferOf(c); setTransferTo(""); }}>
                      <ArrowRightLeft className="w-3.5 h-3.5 text-amber-600" />
                    </Button>
                  )}
                  {currentRep !== "All" && !canDirectDelete && (
                    pendingDeleteIds.has(c.customer_id) ? (
                      <span className="h-8 w-8 flex items-center justify-center text-amber-500">
                        <Clock className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setDeleteOf(c); setDeleteReason(""); }}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive/70" />
                      </Button>
                    )
                  )}
                  {canDirectDelete && (
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setDeleteOf(c); setDeleteReason(""); }}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
          );
        })}
      </div>

      {/* Desktop: Table */}
      <div className="hidden md:block bg-card rounded-xl border shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left py-2 px-3 font-medium">ชื่อลูกค้า / องค์กร</th>
                <th className="text-left py-2 px-3 font-medium">ติดต่อ</th>
                <th className="text-left py-2 px-3 font-medium">บริการที่สนใจ</th>
                <th className="text-left py-2 px-3 font-medium">ช่องทาง / กลุ่ม</th>
                <th className="text-left py-2 px-3 font-medium">Tier</th>
                <th className="text-left py-2 px-3 font-medium">Sales</th>
                {/* Sortable: วันที่เพิ่ม */}
                <th
                  className="text-left py-2 px-3 font-medium cursor-pointer select-none hover:text-foreground whitespace-nowrap"
                  onClick={() => setSortBy((prev) =>
                    prev === "newest" ? "oldest" : "newest"
                  )}
                  title="คลิกเพื่อเรียงตามวันที่เพิ่ม"
                >
                  วันที่เพิ่ม{" "}
                  {sortBy === "newest" ? "↓" : sortBy === "oldest" ? "↑" : <span className="opacity-40">↕</span>}
                </th>
                {/* Sortable: ยอดซื้อ */}
                <th
                  className="text-right py-2 px-3 font-medium cursor-pointer select-none hover:text-foreground"
                  onClick={() => setSortBy((prev) =>
                    prev === "spend_desc" ? "spend_asc" : "spend_desc"
                  )}
                  title="คลิกเพื่อเรียงตามยอดซื้อ"
                >
                  ยอดซื้อ{" "}
                  {sortBy === "spend_desc" ? "↓" : sortBy === "spend_asc" ? "↑" : <span className="opacity-40">↕</span>}
                </th>
                <th className="py-2 px-3 font-medium w-24">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {pagedCustomers.map((c) => {
                const isOBCustomer = isMarketing && (obSet.has(c.created_by) || obSet.has(c.transferred_to ?? "") || obSet.has(c.transferred_from ?? ""));
                return (
                <tr
                  key={c.customer_id}
                  data-customer-id={c.customer_id}
                  className={`hover:bg-muted/30 transition cursor-pointer ${
                    isMarketing ? (isOBCustomer ? "border-l-[3px] border-violet-400" : "border-l-[3px] border-orange-400") : ""
                  }`}
                  onClick={() => navigate(`/app/customers/${c.customer_id}`)}
                >
                  {/* ชื่อ / องค์กร — compact single line */}
                  <td className="py-1 px-3 max-w-[220px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {pendingDeleteIds.has(c.customer_id) && (
                        <Clock className="w-3 h-3 text-amber-500 shrink-0" title="รอ Manager อนุมัติลบ" />
                      )}
                      <span className="text-sm font-semibold truncate leading-none">{c.full_name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5 truncate">
                      <span className="truncate">{c.company !== "-" ? c.company : "B2C"}</span>
                      {c.province && <><span className="opacity-40">·</span><span className="shrink-0">{c.province}</span></>}
                      {c.last_contacted_at && <><span className="opacity-40">·</span><span className="shrink-0">{fmtDate(c.last_contacted_at)}</span></>}
                    </div>
                  </td>
                  {/* ติดต่อ — phone + LINE inline */}
                  <td className="py-1 px-3">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="flex items-center gap-1 text-foreground/80"><Phone className="w-3 h-3 text-primary shrink-0" />{c.phone}</span>
                      {c.line_id && c.line_id !== "-" && (
                        <span className="flex items-center gap-1 text-success shrink-0"><MessageCircle className="w-3 h-3 shrink-0" />{c.line_id}</span>
                      )}
                    </div>
                  </td>
                  {/* บริการที่สนใจ — max 3 badges */}
                  <td className="py-1 px-3">
                    <div className="flex items-center gap-1 flex-wrap">
                      {(c.interests ?? []).slice(0, 3).map((key) => {
                        const style = INTEREST_STYLE[key];
                        if (!style) return null;
                        return (
                          <span key={key} className={`text-[10px] px-1.5 py-0 rounded border font-medium leading-5 ${style.className}`}>
                            {style.label}
                          </span>
                        );
                      })}
                      {(c.interests ?? []).length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                      {(c.interests ?? []).length > 3 && <span className="text-[10px] text-muted-foreground">+{c.interests!.length - 3}</span>}
                    </div>
                  </td>
                  {/* ช่องทาง — source + segment inline */}
                  <td className="py-1 px-3">
                    <div className="text-xs font-medium">{c.source}</div>
                    <div className="text-[10px] text-muted-foreground leading-tight">{c.segment}</div>
                  </td>
                  <td className="py-1 px-3">
                    <Badge variant="outline" className={`${tierBadge(c.customer_tier)} text-[10px] px-1.5 py-0`}>{c.customer_tier}</Badge>
                  </td>
                  {/* Sales — dept badge inline + name */}
                  <td className="py-1 px-3">
                    <div className="flex items-center gap-1.5">
                      {isMarketing && (
                        <span className={`text-[9px] font-bold px-1.5 py-0 rounded-full leading-4 shrink-0 ${
                          obSet.has(c.created_by)
                            ? "bg-purple-100 text-purple-700 border border-purple-200"
                            : "bg-orange-100 text-orange-700 border border-orange-200"
                        }`}>
                          {obSet.has(c.created_by) ? "OB" : "Sales"}
                        </span>
                      )}
                      <div className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">
                        <span className="w-4 h-4 rounded-full bg-gradient-pink text-accent-foreground flex items-center justify-center text-[9px] font-bold shrink-0">{c.created_by[0]}</span>
                        <span className="font-semibold truncate max-w-[80px]">{c.created_by}</span>
                      </div>
                    </div>
                  </td>
                  {/* วันที่เพิ่ม */}
                  <td className="py-1 px-3 whitespace-nowrap">
                    {c.created_at ? (
                      <>
                        <div className="text-xs text-foreground/80">
                          {new Date(c.created_at).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {new Date(c.created_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  {/* ยอดซื้อ — amount + trips inline */}
                  <td className="py-1 px-3 text-right">
                    <div className="text-xs font-semibold">{formatTHB(wonSpendMap.get(c.customer_id) ?? 0)}</div>
                    <div className="text-[10px] text-muted-foreground">{wonTripsMap.get(c.customer_id) ?? 0} ทริป</div>
                  </td>
                  {/* จัดการ */}
                  <td className="py-1 px-2 text-center">
                    <div className="flex items-center justify-center gap-0.5">
                      {c.transferred_from === currentRep && c.transferred_to ? (
                        <span title="โอนแล้ว ไม่สามารถแก้ไขได้" className="inline-flex items-center text-muted-foreground">
                          <Lock className="w-3.5 h-3.5" />
                        </span>
                      ) : (
                        <>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setEditing(c); }} title="แก้ไข"><Pencil className="w-3.5 h-3.5 text-primary" /></Button>
                          {currentRep !== "All" && c.created_by === currentRep && (
                            <Button size="icon" variant="ghost" className="h-7 w-7" title="โอนลูกค้า" onClick={(e) => { e.stopPropagation(); setTransferOf(c); setTransferTo(""); }}>
                              <ArrowRightLeft className="w-3.5 h-3.5 text-amber-600" />
                            </Button>
                          )}
                          {currentRep !== "All" && !canDirectDelete && (
                            pendingDeleteIds.has(c.customer_id) ? (
                              <span title="รอ Manager อนุมัติลบอยู่" className="w-7 h-7 flex items-center justify-center text-amber-500">
                                <Clock className="w-3.5 h-3.5" />
                              </span>
                            ) : (
                              <Button size="icon" variant="ghost" className="h-7 w-7" title="ขอลบลูกค้า" onClick={(e) => { e.stopPropagation(); setDeleteOf(c); setDeleteReason(""); }}>
                                <Trash2 className="w-3.5 h-3.5 text-destructive/70 hover:text-destructive" />
                              </Button>
                            )
                          )}
                          {canDirectDelete && (
                            <Button size="icon" variant="ghost" className="h-7 w-7" title={isAdmin ? "ลบทันที (Admin)" : "ลบทันที (Sales Manager)"} onClick={(e) => { e.stopPropagation(); setDeleteOf(c); setDeleteReason(""); }}>
                              <Trash2 className="w-3.5 h-3.5 text-destructive hover:text-destructive" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="p-12 text-center text-muted-foreground">ไม่พบข้อมูลลูกค้า</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination bar — shared for both mobile & desktop */}
      <div className="flex items-center justify-between bg-card border rounded-xl px-4 py-2 shadow-soft gap-2 flex-wrap">
        {/* Left: info + page size */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            แสดง {filtered.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, filtered.length)} จาก {filtered.length} รายการ
          </span>
          {/* Page size selector */}
          <div className="flex items-center gap-1">
            {([20, 50, 100] as const).map((n) => (
              <button
                key={n}
                onClick={() => setPageSize(n)}
                className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                  pageSize === n
                    ? "bg-primary text-primary-foreground border-primary font-semibold"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        {/* Right: page navigation */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline" size="sm" className="h-7 px-2 text-xs"
            disabled={page === 1}
            onClick={() => setPage(1)}
          >«</Button>
          <Button
            variant="outline" size="sm" className="h-7 px-2.5 text-xs"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >‹ ก่อน</Button>
          <span className="text-xs font-semibold px-3 py-1 bg-primary/10 text-primary rounded-lg border border-primary/20">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline" size="sm" className="h-7 px-2.5 text-xs"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >ถัดไป ›</Button>
          <Button
            variant="outline" size="sm" className="h-7 px-2 text-xs"
            disabled={page === totalPages}
            onClick={() => setPage(totalPages)}
          >»</Button>
        </div>
      </div>

      <CustomerLeadDialog open={openAdd} onOpenChange={setOpenAdd} />
      <EditCustomerDialog customer={editing} onClose={() => setEditing(null)} />

      <Dialog open={!!transferOf} onOpenChange={(o) => !o && setTransferOf(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>โอนลูกค้าให้ Sales คนอื่น</DialogTitle></DialogHeader>
          {transferOf && (
            <div className="space-y-3">
              <p className="text-sm">
                ลูกค้า: <b>{transferOf.full_name}</b>{transferOf.company !== "-" && ` · ${transferOf.company}`}
              </p>
              <p className="text-xs text-muted-foreground">
                หลังโอน ลูกค้านี้จะยังแสดงในระบบของคุณในสถานะ "โอนลูกค้า" และไม่สามารถแก้ไขข้อมูลได้
              </p>
              <div>
                <label className="text-xs font-semibold">เลือก Sales ปลายทาง</label>
                <Select value={transferTo} onValueChange={(v) => setTransferTo(v as SalesRep)}>
                  <SelectTrigger><SelectValue placeholder="เลือก Sales..." /></SelectTrigger>
                  <SelectContent>
                    {SALES_REPS.filter((r) => r !== transferOf.created_by).map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferOf(null)}>ยกเลิก</Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              disabled={!transferTo}
              onClick={() => {
                if (!transferOf || !transferTo) return;
                transferCustomer(transferOf.customer_id, transferTo as SalesRep);
                toast.success(`โอนลูกค้า ${transferOf.full_name} ให้ ${transferTo} แล้ว`);
                setTransferOf(null);
              }}
            >ยืนยันโอน</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Request Dialog ── */}
      <Dialog open={!!deleteOf} onOpenChange={(o) => !o && setDeleteOf(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              {isAdmin ? "ลบลูกค้า (Admin)" : isSalesManager ? "ลบลูกค้า (Sales Manager)" : isOBManager ? "ลบลูกค้า (OB Manager)" : "ขอลบลูกค้า"}
            </DialogTitle>
          </DialogHeader>
          {deleteOf && (
            <div className="space-y-4">
              <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3 space-y-1">
                <p className="text-sm font-semibold">{deleteOf.full_name}</p>
                {deleteOf.company !== "-" && <p className="text-xs text-muted-foreground">{deleteOf.company}</p>}
                <p className="text-xs text-muted-foreground">{deleteOf.phone}</p>
              </div>
              {canDirectDelete ? (
                <p className="text-xs text-destructive/80 leading-relaxed">
                  ⚠️ การลบโดย {isAdmin ? "Admin" : isSalesManager ? "Sales Manager" : "OB Manager"} จะ<strong>ลบทันทีถาวร</strong> ไม่สามารถกู้คืนได้
                </p>
              ) : (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  ⚠️ คำขอลบจะถูกส่งให้ <strong>{user?.role === "OB Co-ordinator" ? "OB Manager" : "Sales Manager"}</strong> พิจารณา
                  ข้อมูลจะยังคงอยู่จนกว่า Manager จะอนุมัติ
                </p>
              )}
              <div>
                <label className="text-xs font-semibold block mb-1.5">เหตุผลในการลบ <span className="text-muted-foreground font-normal">(ถ้ามี)</span></label>
                <Textarea
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="เช่น ลูกค้าซ้ำ / ข้อมูลผิด / ลูกค้าขอให้ลบออก..."
                  rows={3}
                  className="text-sm resize-none"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOf(null)}>ยกเลิก</Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!deleteOf || !user) return;
                if (canDirectDelete) {
                  // Admin / Sales Manager ลบตรงได้เลย ไม่ต้องผ่าน approval
                  deleteCustomer(deleteOf.customer_id);
                } else {
                  await addRequest({
                    customer_id: deleteOf.customer_id,
                    customer_name: deleteOf.full_name,
                    requested_by: user.full_name,
                    reason: deleteReason.trim() || undefined,
                    department: user.role === "OB Co-ordinator" ? "ob" : "sales",
                  });
                }
                setDeleteOf(null);
              }}
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              {canDirectDelete ? "ลบทันที" : "ส่งคำขอให้ Manager"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
