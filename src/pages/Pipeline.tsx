import { useMemo, useState } from "react";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  closestCenter, type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { ThaiDateInput } from "@/components/ThaiDateInput";
import {
  AlertCircle, Calendar, Users, RefreshCw, User as UserIcon, Plus,
  LayoutList, Columns3, ChevronDown, ChevronUp, GripVertical,
} from "lucide-react";
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
  isLostStatus, isClosedStatus,
  type LeadStatus, type Lead, type Customer,
} from "@/store/crmStore";
import { useCurrentUser, useActiveOBNames } from "@/store/authStore";
import { useServices } from "@/store/serviceStore";
import { EditCustomerDialog } from "@/components/EditCustomerDialog";
import { CustomerLeadDialog } from "@/components/CustomerLeadDialog";

// ── helper: split "CODE - ชื่อโปรแกรม" ───────────────────────────────────
function splitProg(p: string) {
  const i = p.indexOf(" - ");
  return i === -1 ? { code: "", name: p } : { code: p.slice(0, i), name: p.slice(i + 3) };
}

// ── helper: แปลง ISO date → "26 ก.ค." ───────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

export default function Pipeline() {
  const leads = useCRM((s) => s.leads);
  const customers = useCRM((s) => s.customers);
  const currentRep = useCRM((s) => s.currentRep);
  const updateLeadStatus = useCRM((s) => s.updateLeadStatus);
  const updateLead = useCRM((s) => s.updateLead);
  const user = useCurrentUser();
  const isOB = user?.role === "OB Co-ordinator";
  const isOBRole = user?.role === "OB Co-ordinator" || user?.role === "OB Manager";
  const obNames = useActiveOBNames();
  const activeStatuses = isOB ? OB_LEAD_STATUSES : LEAD_STATUSES;

  const tours = useServices((s) => s.tours);

  // ── ดึง period label "26 ก.ค. – 31 ก.ค." จาก tour_id + period_id ────────
  const getPeriodLabel = (tourId?: string, periodId?: string, fallback?: string): string => {
    if (!tourId || !periodId) return fallback ?? "";
    const period = tours.find((t) => t.id === tourId)?.periods?.find((p) => p.period_id === periodId);
    if (!period) return fallback ?? "";
    if (period.start_date && period.end_date) return `${fmtDate(period.start_date)} – ${fmtDate(period.end_date)}`;
    if (period.start_date) return fmtDate(period.start_date);
    return fallback ?? "";
  };

  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [addLeadCustomerId, setAddLeadCustomerId] = useState<string | null>(null);
  const [pendingLost, setPendingLost] = useState<string | null>(null);
  const [reason, setReason] = useState(LOST_REASONS[0]);

  // Update-Status dialog state
  const [statusOpen, setStatusOpen] = useState<Lead | null>(null);
  const [newStatus, setNewStatus] = useState<LeadStatus>("ใหม่"); // overridden by isOB below
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
    let base: typeof leads;
    // Guard: ถ้า currentRep = null (Supabase ยังโหลดชื่อไม่เสร็จ) → treat เป็น "All"
    const effectiveRep = currentRep || "All";
    if (effectiveRep !== "All") {
      if (isOBRole) {
        // OB Co-ordinator: เห็น leads ของตัวเอง + OB pool
        const obSet = new Set(obNames);
        obSet.add(effectiveRep); // รวมตัวเองเสมอ
        base = leads.filter((l) => obSet.has(l.assigned_to));
      } else {
        // Sales — เห็นเฉพาะของตัวเอง
        base = leads.filter((l) => l.assigned_to === effectiveRep);
      }
    } else if (isOBRole) {
      // OB Manager: เห็นเฉพาะ leads ของ OB Co-ordinator ไม่เห็น Sales leads
      // ถ้า obNames ยังโหลดไม่เสร็จ → รอก่อน (แสดง [] ชั่วคราว)
      if (obNames.length === 0) {
        base = [];
      } else {
        const obSet = new Set(obNames);
        base = leads.filter((l) => obSet.has(l.assigned_to));
      }
    } else {
      // Admin, Sales Manager → เห็นทั้งหมด
      base = leads;
    }
    // กรอง leads ที่ customer ถูกลบออกไปแล้ว
    return base.filter((l) => customerIds.has(l.customer_id));
  }, [leads, customers, currentRep, isOBRole, obNames]);

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
      const lostStatus = isOB ? "ยกเลิก" : "ยกเลิก";
      updateLeadStatus(pendingLost, lostStatus, reason);
      toast.error(`${lostStatus}: ${reason}`);
    }
    setPendingLost(null);
  };

  // ── Drag-and-drop ────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );
  const activeLead = activeId ? visible.find((l) => l.lead_id === activeId) ?? null : null;

  const onDragStart = ({ active }: DragStartEvent) => setActiveId(active.id as string);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over) return;
    const lead = visible.find((l) => l.lead_id === active.id);
    if (!lead) return;
    const targetStatus = over.id as LeadStatus;
    if (targetStatus !== lead.status && activeStatuses.includes(targetStatus)) {
      handleStatusChange(lead.lead_id, targetStatus);
    }
  };

  const cust = (id: string) => customers.find((c) => c.customer_id === id);

  // ── Compact Kanban card (Option B) ───────────────────────────────────────
  const KanbanCard = ({ lead }: { lead: Lead }) => {
    const c = cust(lead.customer_id);
    const noContact = !c || ((!c.phone || c.phone === "-") && !c.line_id);
    const isWon = isClosedStatus(lead.status);
    const isLost = isLostStatus(lead.status);
    const wonValue = (lead.closed_price || lead.quoted_price || 0);
    const { code, name } = splitProg(lead.program || lead.bu_type);
    const periodLabel = getPeriodLabel(lead.tour_id, lead.period_id, lead.travel_month);
    const [expanded, setExpanded] = useState(false);

    // ── การ์ด "ยกเลิก" — compact, ข้อความชัดแต่ de-emphasized ─────────────
    if (isLost) {
      return (
        <div className="bg-card rounded-lg border border-destructive/20 overflow-hidden">
          <div className="h-0.5 w-full bg-destructive/30" />
          <div className="px-2.5 py-1.5">
            {/* row 1: name + expand */}
            <div className="flex items-center justify-between gap-1">
              <p className="text-xs font-medium truncate text-foreground/70">{c?.full_name ?? "(ลูกค้าถูกลบ)"}</p>
              <button onClick={() => setExpanded(v => !v)} className="text-muted-foreground hover:text-foreground p-0.5 shrink-0">
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
            {/* row 2: program */}
            <p className="text-[10px] text-muted-foreground truncate mt-0.5">{name || lead.bu_type}{code && ` · ${code}`}</p>
            {/* row 3: lost reason + price */}
            <div className="flex items-center justify-between gap-1 mt-1">
              <p className="text-[11px] text-destructive font-medium truncate">
                ❌ {lead.lost_reason ?? "ไม่ระบุเหตุผล"}
              </p>
              {lead.quoted_price > 0 && (
                <p className="text-[10px] text-muted-foreground shrink-0">฿{lead.quoted_price.toLocaleString()}</p>
              )}
            </div>
          </div>
          {/* expand: detail + reopen */}
          {expanded && (
            <div className="border-t border-destructive/10 px-2.5 py-1.5 bg-muted/20">
              <p className="text-[10px] text-muted-foreground mb-1.5">
                <Users className="w-2.5 h-2.5 inline mr-0.5" />{lead.pax_count} ท่าน
                {periodLabel && ` · ${periodLabel}`}
                {lead.assigned_to && ` · ${lead.assigned_to}`}
              </p>
              <Button size="sm" variant="outline" className="w-full h-6 text-[10px]" onClick={() => openStatusDialog(lead)}>
                <RefreshCw className="w-2.5 h-2.5 mr-1" /> เปลี่ยนสถานะ
              </Button>
            </div>
          )}
        </div>
      );
    }

    // ── การ์ดปกติ ──────────────────────────────────────────────────────────
    return (
      <div className={`bg-card rounded-lg border shadow-soft transition-shadow hover:shadow-pop overflow-hidden ${isWon ? "border-emerald-200/70" : ""}`}>
        {/* accent line */}
        <div className={`h-0.5 w-full ${isWon ? "bg-emerald-400" : "bg-primary/30"}`} />

        <div className="px-2.5 pt-1.5 pb-1">
          {/* row 1: customer + actions */}
          <div className="flex items-center justify-between gap-1">
            <p className="font-semibold text-xs truncate">{c?.full_name ?? "(ลูกค้าถูกลบ)"}</p>
            <div className="flex gap-0.5 shrink-0">
              {noContact && <AlertCircle className="w-3 h-3 text-warning-foreground" title="ยังไม่มีข้อมูลติดต่อ" />}
              {c && (
                <button onClick={() => setEditingCustomer(c)} className="text-muted-foreground hover:text-primary p-0.5">
                  <UserIcon className="w-3 h-3" />
                </button>
              )}
              <button onClick={() => setAddLeadCustomerId(lead.customer_id)} className="text-muted-foreground hover:text-success p-0.5">
                <Plus className="w-3 h-3" />
              </button>
              <button onClick={() => setExpanded(v => !v)} className="text-muted-foreground hover:text-primary p-0.5">
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {/* row 2: badge + program (same row เพื่อประหยัดพื้นที่) */}
          <div className="flex items-center gap-1.5 mt-0.5">
            <Badge variant="outline" className={`${urgencyBadge(lead.urgency)} text-[9px] px-1 py-0 h-4 shrink-0`}>{lead.urgency}</Badge>
            {isWon && <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 rounded px-1 py-0 shrink-0">จองแล้ว</span>}
            <p className="text-[10px] font-medium truncate text-foreground/80">{name || lead.bu_type}</p>
          </div>

          {/* row 3: code + period + price */}
          <div className="flex items-center justify-between mt-0.5 gap-1">
            <div className="text-[9px] text-muted-foreground flex items-center gap-1.5 min-w-0">
              {code && <span className="font-mono shrink-0">{code}</span>}
              <span className="truncate">
                <Users className="w-2.5 h-2.5 inline mr-0.5" />{lead.pax_count} ท่าน
                {periodLabel && ` · ${periodLabel}`}
              </span>
            </div>
            <div className="text-right shrink-0">
              {isWon && wonValue > 0
                ? <p className="text-xs font-bold text-emerald-600">฿{wonValue.toLocaleString()}</p>
                : lead.quoted_price > 0
                  ? <p className="text-[9px] text-muted-foreground">฿{lead.quoted_price.toLocaleString()}</p>
                  : null}
            </div>
          </div>

          {/* row 4: follow-up + assigned_to */}
          {(lead.next_followup_date || lead.assigned_to) && (
            <div className="flex items-center justify-between mt-0.5">
              {lead.next_followup_date && !isWon ? (
                <span className="text-[9px] text-amber-600 flex items-center gap-0.5">
                  <Calendar className="w-2.5 h-2.5" />
                  {new Date(lead.next_followup_date + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                </span>
              ) : <span />}
              {lead.assigned_to && <p className="text-[9px] text-muted-foreground">{lead.assigned_to}</p>}
            </div>
          )}
        </div>

        {/* expand: update status */}
        {expanded && (
          <div className="border-t px-2.5 py-1.5 bg-muted/20">
            {lead.status_note && (
              <p className="text-[10px] text-muted-foreground italic mb-1.5 line-clamp-2">📝 {lead.status_note}</p>
            )}
            <Button size="sm" variant="outline" className="w-full h-6 text-[10px]" onClick={() => openStatusDialog(lead)}>
              <RefreshCw className="w-2.5 h-2.5 mr-1" /> Update Status
            </Button>
          </div>
        )}
      </div>
    );
  };

  // ── Draggable wrapper ────────────────────────────────────────────────────
  const DraggableCard = ({ lead }: { lead: Lead }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.lead_id });
    return (
      <div
        ref={setNodeRef}
        className={`relative group ${isDragging ? "opacity-40" : ""}`}
        {...attributes}
      >
        {/* drag handle — ลากที่แถบนี้เพื่อย้าย */}
        <div
          {...listeners}
          className="absolute left-0 top-0 bottom-0 w-5 flex items-center justify-center cursor-grab active:cursor-grabbing z-10 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="w-3 h-3 text-muted-foreground/50" />
        </div>
        <div className="pl-4">
          <KanbanCard lead={lead} />
        </div>
      </div>
    );
  };

  // ── Droppable column ──────────────────────────────────────────────────────
  const DroppableCol = ({ status, children }: { status: LeadStatus; children: React.ReactNode }) => {
    const { setNodeRef, isOver } = useDroppable({ id: status });
    return (
      <div
        ref={setNodeRef}
        className={`min-h-16 rounded-lg transition-colors duration-150 ${
          isOver && activeId ? "bg-primary/8 ring-2 ring-primary/30 ring-inset" : ""
        }`}
      >
        {children}
      </div>
    );
  };

  // ── Table view (Option D) ─────────────────────────────────────────────────
  const TableView = () => (
    <div className="bg-card border rounded-xl shadow-soft overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/40 border-b">
            <th className="text-left px-3 py-2 font-medium text-muted-foreground">ลูกค้า</th>
            <th className="text-left px-3 py-2 font-medium text-muted-foreground">โปรแกรม</th>
            <th className="text-left px-3 py-2 font-medium text-muted-foreground">สถานะ</th>
            <th className="text-center px-2 py-2 font-medium text-muted-foreground">ท่าน</th>
            <th className="text-left px-2 py-2 font-medium text-muted-foreground">วันเดินทาง</th>
            <th className="text-right px-3 py-2 font-medium text-muted-foreground">มูลค่า</th>
            <th className="text-left px-2 py-2 font-medium text-muted-foreground">ผู้รับผิดชอบ</th>
            <th className="text-left px-2 py-2 font-medium text-muted-foreground">Follow-up</th>
            <th className="px-2 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {visible.length === 0 && (
            <tr><td colSpan={9} className="text-center py-10 text-muted-foreground">ไม่มี Lead</td></tr>
          )}
          {visible.map((lead) => {
            const c = cust(lead.customer_id);
            const isWon = isClosedStatus(lead.status);
            const isLost = isLostStatus(lead.status);
            const wonValue = lead.closed_price || lead.quoted_price || 0;
            const { code, name } = splitProg(lead.program || lead.bu_type);
            const noContact = !c || ((!c.phone || c.phone === "-") && !c.line_id);
            const periodLabel = getPeriodLabel(lead.tour_id, lead.period_id, "");
            return (
              <tr key={lead.lead_id} className={`border-b last:border-0 hover:bg-muted/20 transition-colors ${isWon ? "bg-emerald-50/30" : isLost ? "bg-destructive/5 opacity-80" : ""}`}>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    {noContact && <AlertCircle className="w-3 h-3 text-warning-foreground shrink-0" />}
                    <div>
                      <p className="font-medium truncate max-w-[100px]">{c?.full_name ?? "(ถูกลบ)"}</p>
                      <p className="text-[10px] text-muted-foreground">{c?.company !== "-" ? c?.company : "B2C"}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <p className="font-medium truncate max-w-[160px]">{name || lead.bu_type}</p>
                  {code && <p className="text-[10px] text-muted-foreground font-mono">{code}</p>}
                </td>
                <td className="px-3 py-2">
                  <div>
                    <Badge variant="outline" className={`${statusColor(lead.status)} text-[10px] px-1.5 py-0`}>
                      {OB_STAGE_META[lead.status] ? `${OB_STAGE_META[lead.status].emoji} ${lead.status}` : lead.status}
                    </Badge>
                    {isLost && lead.lost_reason && (
                      <p className="text-[10px] text-destructive mt-0.5 truncate max-w-[140px]">❌ {lead.lost_reason}</p>
                    )}
                  </div>
                </td>
                <td className="px-2 py-2 text-center">
                  <span className="flex items-center justify-center gap-0.5">
                    <Users className="w-3 h-3 text-muted-foreground" />{lead.pax_count}
                  </span>
                </td>
                <td className="px-2 py-2">
                  {periodLabel ? (
                    <div>
                      <p className="text-xs font-medium">{periodLabel}</p>
                      <p className="text-[10px] text-muted-foreground">{lead.travel_month}</p>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">{lead.travel_month || "—"}</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {isWon && wonValue > 0
                    ? <span className="font-bold text-emerald-600">฿{wonValue.toLocaleString()}</span>
                    : lead.quoted_price > 0
                      ? <span className="text-muted-foreground">฿{lead.quoted_price.toLocaleString()}</span>
                      : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-2 py-2 text-muted-foreground">{lead.assigned_to}</td>
                <td className="px-2 py-2 text-muted-foreground">
                  {lead.next_followup_date && !isWon && !isLostStatus(lead.status)
                    ? <span className="text-amber-600 flex items-center gap-0.5">
                        <Calendar className="w-3 h-3" />
                        {new Date(lead.next_followup_date + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                      </span>
                    : <span>—</span>}
                </td>
                <td className="px-2 py-2">
                  <div className="flex gap-1">
                    {c && (
                      <button onClick={() => setEditingCustomer(c)} className="text-muted-foreground hover:text-primary">
                        <UserIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button onClick={() => openStatusDialog(lead)} className="text-muted-foreground hover:text-primary">
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setAddLeadCustomerId(lead.customer_id)} className="text-muted-foreground hover:text-success">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* ── Header ── */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Sales Pipeline</h1>
          <p className="text-sm text-muted-foreground">
            {visible.length} leads {currentRep !== "All" && `• ${currentRep}`}
          </p>
        </div>
        {/* View toggle */}
        <div className="flex items-center gap-1 border rounded-lg p-0.5 bg-muted/30">
          <Button
            size="sm"
            variant={viewMode === "kanban" ? "default" : "ghost"}
            className={`h-7 px-2.5 text-xs gap-1.5 ${viewMode === "kanban" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            onClick={() => setViewMode("kanban")}
          >
            <Columns3 className="w-3.5 h-3.5" /> Kanban
          </Button>
          <Button
            size="sm"
            variant={viewMode === "table" ? "default" : "ghost"}
            className={`h-7 px-2.5 text-xs gap-1.5 ${viewMode === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            onClick={() => setViewMode("table")}
          >
            <LayoutList className="w-3.5 h-3.5" /> ตาราง
          </Button>
        </div>
      </div>

      {/* ── Kanban view ── */}
      {viewMode === "kanban" && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <div className={`grid gap-3 ${isOB ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-4" : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6"}`}>
            {activeStatuses.map((status) => {
              const items = grouped[status] ?? [];
              const total = items.filter(l => isClosedStatus(l.status)).reduce((s, l) => s + (l.closed_price || l.quoted_price || 0), 0)
                || items.reduce((s, l) => s + (l.quoted_price || 0), 0);
              const obMeta = OB_STAGE_META[status];
              return (
                <div key={status} className="bg-muted/30 rounded-xl p-2.5 border min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="outline" className={statusColor(status)}>
                      {obMeta ? `${obMeta.emoji} ${status}` : status}
                    </Badge>
                    <span className="text-xs font-semibold">{items.length}</span>
                  </div>
                  {obMeta && <p className="text-[10px] text-muted-foreground mb-1.5 leading-tight">{obMeta.desc}</p>}
                  {total > 0 && <div className="text-[10px] text-muted-foreground mb-1.5">{formatTHB(total)}</div>}
                  <DroppableCol status={status}>
                    <div className="space-y-1.5 max-h-[72vh] overflow-y-auto pr-0.5 pt-0.5">
                      {items.map((lead) => (
                        <DraggableCard key={lead.lead_id} lead={lead} />
                      ))}
                      {items.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-6">
                          {activeId ? "⬇ วางที่นี่" : "ไม่มี Lead"}
                        </p>
                      )}
                    </div>
                  </DroppableCol>
                </div>
              );
            })}
          </div>

          {/* Ghost card while dragging */}
          <DragOverlay dropAnimation={null}>
            {activeLead ? (
              <div className="bg-card rounded-lg border border-primary/50 shadow-xl opacity-95 overflow-hidden w-[220px] rotate-1 scale-105">
                <div className={`h-0.5 w-full ${isClosedStatus(activeLead.status) ? "bg-emerald-400" : "bg-primary"}`} />
                <div className="px-2.5 py-2">
                  <p className="text-xs font-semibold truncate">{cust(activeLead.customer_id)?.full_name ?? "—"}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{splitProg(activeLead.program || activeLead.bu_type).name}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-muted-foreground"><Users className="w-2.5 h-2.5 inline mr-0.5" />{activeLead.pax_count} ท่าน</span>
                    {(activeLead.closed_price || activeLead.quoted_price) > 0 && (
                      <span className={`text-[10px] font-bold ${isClosedStatus(activeLead.status) ? "text-emerald-600" : "text-muted-foreground"}`}>
                        ฿{(activeLead.closed_price || activeLead.quoted_price).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* ── Table view ── */}
      {viewMode === "table" && <TableView />}

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
            <Button variant="destructive" onClick={confirmLost}>{isOB ? "ยืนยันการยกเลิก" : "ยืนยันยกเลิก"}</Button>
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
