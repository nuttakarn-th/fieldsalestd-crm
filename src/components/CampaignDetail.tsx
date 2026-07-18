/**
 * CampaignDetail.tsx
 * Slide-in drawer แสดงรายละเอียด Campaign + Action Plan tasks
 */
import { useEffect, useState } from "react";
import {
  X, Plus, Trash2, CalendarDays, Clock, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { type Campaign } from "@/store/campaignStore";
import { useActionPlans, type ActionPlan, type ActionPlanStatus } from "@/store/actionPlanStore";

// ── Helpers ───────────────────────────────────────────────────────────────────

const TH_MONTH_SHORT = [
  "ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.",
  "ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค.",
];

function fmtDate(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()} ${TH_MONTH_SHORT[d.getMonth()]} ${d.getFullYear() + 543}`;
}

function diffDays(a?: string, b?: string): number | null {
  if (!a || !b) return null;
  const ms = new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime();
  return Math.max(1, Math.round(ms / 86_400_000) + 1);
}

function fmtRange(start?: string, end?: string): string {
  if (!start && !end) return "-";
  if (!end) return fmtDate(start);
  return `${fmtDate(start)} – ${fmtDate(end)}`;
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<ActionPlanStatus, { bg: string; text: string; dot: string; next: string }> = {
  Todo:        { bg: "bg-zinc-100 dark:bg-zinc-800",       text: "text-zinc-500 dark:text-zinc-400",   dot: "bg-zinc-400",   next: "In Progress" },
  "In Progress": { bg: "bg-violet-100 dark:bg-violet-900/40", text: "text-violet-700 dark:text-violet-300", dot: "bg-violet-500", next: "Done" },
  Done:        { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500", next: "Todo" },
};

// ── Campaign status config ────────────────────────────────────────────────────
const CAMP_STATUS_CFG: Record<string, string> = {
  Active:    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  Scheduled: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  Paused:    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  Draft:     "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  Completed: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
};

// ── Task row ──────────────────────────────────────────────────────────────────

function TaskRow({
  plan, onToggle, onDelete,
}: {
  plan: ActionPlan;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const cfg = STATUS_CFG[plan.status];
  const days = diffDays(plan.start_date, plan.end_date);
  const isDone = plan.status === "Done";

  return (
    <div className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors group border-b border-border/50 last:border-0">
      {/* Status toggle button */}
      <button
        onClick={onToggle}
        title={`คลิกเพื่อเปลี่ยนเป็น ${cfg.next}`}
        className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border-2 shrink-0 transition-all ${
          isDone
            ? "bg-emerald-500 border-emerald-500"
            : plan.status === "In Progress"
            ? "bg-violet-500/20 border-violet-500"
            : "border-muted-foreground/30 hover:border-violet-400"
        }`}
      >
        {isDone && (
          <svg width="8" height="6" viewBox="0 0 8 6" fill="none" className="shrink-0">
            <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
        {plan.status === "In Progress" && (
          <div className="w-2 h-2 rounded-sm bg-violet-500" />
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] font-medium leading-snug ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}>
          {plan.title}
        </p>
        {(plan.start_date || plan.end_date) && (
          <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
            <CalendarDays className="w-3 h-3" />
            {fmtRange(plan.start_date, plan.end_date)}
            {days && <span className="text-muted-foreground/60">· {days} วัน</span>}
          </p>
        )}
      </div>

      {/* Status badge */}
      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${cfg.bg} ${cfg.text}`}>
        {plan.status}
      </span>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-all"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  campaign: Campaign | null;
  onClose: () => void;
  onEdit: (c: Campaign) => void;
}

export function CampaignDetail({ campaign, onClose, onEdit }: Props) {
  const { plansByCampaign, loading, loadPlans, addPlan, updatePlan, deletePlan, toggleStatus } = useActionPlans();
  const [newTitle, setNewTitle]         = useState("");
  const [newStart, setNewStart]         = useState("");
  const [newEnd, setNewEnd]             = useState("");
  const [showAddForm, setShowAddForm]   = useState(false);

  useEffect(() => {
    if (campaign) {
      loadPlans(campaign.id);
      setShowAddForm(false);
      setNewTitle("");
      setNewStart("");
      setNewEnd("");
    }
  }, [campaign?.id, loadPlans]);

  if (!campaign) return null;

  const plans = plansByCampaign[campaign.id] ?? [];
  const done  = plans.filter((p) => p.status === "Done").length;
  const pct   = plans.length > 0 ? Math.round((done / plans.length) * 100) : 0;

  const campDays = diffDays(campaign.start_date, campaign.end_date);

  async function handleAdd() {
    if (!newTitle.trim()) return;
    await addPlan(campaign!.id, newTitle.trim(), newStart || undefined, newEnd || undefined);
    setNewTitle("");
    setNewStart("");
    setNewEnd("");
    setShowAddForm(false);
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full sm:max-w-md bg-card border-l border-border shadow-2xl z-50 flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-mono text-muted-foreground">{campaign.campaign_id}</span>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${CAMP_STATUS_CFG[campaign.status] ?? ""}`}>
                {campaign.status}
              </span>
              {(campaign.target_teams ?? []).map((t) => (
                <span key={t} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  t === "Outbound"       ? "bg-orange-100 text-orange-700" :
                  t === "Ticket"         ? "bg-violet-100 text-violet-700" :
                  t === "Transportation" ? "bg-sky-100 text-sky-700" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {t === "Outbound" ? "✈️" : t === "Ticket" ? "🎫" : "🚍"} {t}
                </span>
              ))}
            </div>
            <h2 className="text-base font-bold leading-snug">{campaign.name}</h2>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <CalendarDays className="w-3 h-3" />
                {fmtRange(campaign.start_date, campaign.end_date)}
              </span>
              {campDays && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {campDays} วัน
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onEdit(campaign)}>
              แก้ไข
            </Button>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Channels */}
        {campaign.channels.length > 0 && (
          <div className="px-5 py-2 border-b border-border flex items-center gap-1.5 flex-wrap shrink-0">
            {campaign.channels.map((ch) => (
              <span key={ch} className="text-[11px] px-2 py-0.5 rounded bg-muted text-muted-foreground">{ch}</span>
            ))}
            {campaign.notes && (
              <span className="text-[11px] text-muted-foreground/60 ml-auto truncate max-w-[160px]">{campaign.notes}</span>
            )}
          </div>
        )}

        {/* Progress */}
        <div className="px-5 py-3 border-b border-border shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground font-medium">ความคืบหน้า Action Plan</span>
            <span className="text-xs font-bold text-foreground">{done}/{plans.length} tasks · {pct}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Action Plans */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center justify-between px-5 py-2.5 sticky top-0 bg-card border-b border-border z-10">
            <span className="text-xs font-semibold text-foreground">Action Plan</span>
            <button
              onClick={() => setShowAddForm((v) => !v)}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              เพิ่ม task
            </button>
          </div>

          {/* Add form */}
          {showAddForm && (
            <div className="px-4 py-3 bg-muted/30 border-b border-border space-y-2">
              <Input
                placeholder="ชื่องาน เช่น ออกแบบ Creative Assets"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                className="h-8 text-sm"
                autoFocus
              />
              <div className="flex gap-2">
                <div className="flex-1 space-y-0.5">
                  <p className="text-[10px] text-muted-foreground">วันเริ่ม</p>
                  <Input
                    type="date"
                    value={newStart}
                    onChange={(e) => setNewStart(e.target.value)}
                    className="h-7 text-xs"
                  />
                </div>
                <div className="flex-1 space-y-0.5">
                  <p className="text-[10px] text-muted-foreground">วันสิ้นสุด</p>
                  <Input
                    type="date"
                    value={newEnd}
                    onChange={(e) => setNewEnd(e.target.value)}
                    className="h-7 text-xs"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="h-7 text-xs flex-1" onClick={handleAdd} disabled={!newTitle.trim()}>
                  เพิ่ม
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowAddForm(false)}>
                  ยกเลิก
                </Button>
              </div>
            </div>
          )}

          {/* Task list */}
          {loading && plans.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">กำลังโหลด…</div>
          ) : plans.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-muted-foreground">ยังไม่มี Action Plan</p>
              <p className="text-xs text-muted-foreground/60 mt-1">กด "+ เพิ่ม task" เพื่อเริ่มวางแผน</p>
            </div>
          ) : (
            <div>
              {plans.map((plan) => (
                <TaskRow
                  key={plan.id}
                  plan={plan}
                  onToggle={() => toggleStatus(plan.id, campaign.id)}
                  onDelete={() => deletePlan(plan.id, campaign.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
