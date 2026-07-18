/**
 * CampaignManagement — Project-style Campaign management
 * Features: Create / Edit / Delete / inline status change / search + filter / sort / Action Plans drawer
 */
import { useState, useEffect, useMemo } from "react";
import {
  Megaphone, Plus, Calendar, Search, Pencil, Trash2,
  BarChart3, ChevronDown, X, LayoutList, CalendarDays,
  ArrowUpDown, ChevronUp, Rocket, CheckCircle2, Zap,
} from "lucide-react";
import { CampaignCalendar } from "@/components/CampaignCalendar";
import { CampaignDetail }  from "@/components/CampaignDetail";
import { useActionPlans }  from "@/store/actionPlanStore";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label }    from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import { logActivity } from "@/lib/activityLog";
import {
  useCampaigns,
  CAMPAIGN_CHANNELS,
  CAMPAIGN_DEPARTMENTS,
  CAMPAIGN_STATUS_LIST,
  type Campaign,
  type CampaignStatus,
} from "@/store/campaignStore";
import { useCurrentUser } from "@/store/authStore";

// ── Color configs with full dark-mode support ─────────────────────────────────

type StatusCfg = {
  label: string;
  cls: string;         // badge class
  dot: string;         // dot color
  accent: string;      // hex for inline styles (left border)
  chipActive: string;  // filter chip when active
};

const STATUS_CFG: Record<CampaignStatus, StatusCfg> = {
  Draft:     {
    label: "Draft",
    cls:  "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-700/60 dark:text-slate-200 dark:border-slate-500",
    dot:  "bg-slate-400 dark:bg-slate-300",
    accent: "#94a3b8",
    chipActive: "bg-slate-200 text-slate-800 border-slate-400 dark:bg-slate-600 dark:text-slate-100 dark:border-slate-400",
  },
  Scheduled: {
    label: "Scheduled",
    cls:  "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-400/20 dark:text-amber-300 dark:border-amber-400/60",
    dot:  "bg-amber-500 dark:bg-amber-400",
    accent: "#f59e0b",
    chipActive: "bg-amber-100 text-amber-800 border-amber-400 dark:bg-amber-400/25 dark:text-amber-300 dark:border-amber-400/70",
  },
  Active:    {
    label: "Active",
    cls:  "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-400/20 dark:text-emerald-300 dark:border-emerald-400/60",
    dot:  "bg-emerald-500 dark:bg-emerald-400",
    accent: "#10b981",
    chipActive: "bg-emerald-100 text-emerald-800 border-emerald-400 dark:bg-emerald-400/25 dark:text-emerald-300 dark:border-emerald-400/70",
  },
  Paused:    {
    label: "Paused",
    cls:  "bg-orange-50 text-orange-700 border-orange-300 dark:bg-orange-400/20 dark:text-orange-300 dark:border-orange-400/60",
    dot:  "bg-orange-500 dark:bg-orange-400",
    accent: "#f97316",
    chipActive: "bg-orange-100 text-orange-800 border-orange-400 dark:bg-orange-400/25 dark:text-orange-300 dark:border-orange-400/70",
  },
  Completed: {
    label: "Completed",
    cls:  "bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-400/20 dark:text-sky-300 dark:border-sky-400/60",
    dot:  "bg-sky-500 dark:bg-sky-400",
    accent: "#0ea5e9",
    chipActive: "bg-sky-100 text-sky-800 border-sky-400 dark:bg-sky-400/25 dark:text-sky-300 dark:border-sky-400/70",
  },
};

type DeptCfg = { badge: string; circle: string; emoji: string };
const DEPT_CFG: Record<string, DeptCfg> = {
  Outbound:       {
    badge:  "bg-orange-50 text-orange-700 border-orange-300 dark:bg-orange-400/20 dark:text-orange-300 dark:border-orange-400/50",
    circle: "bg-orange-100 dark:bg-orange-400/25",
    emoji: "✈️",
  },
  Ticket:         {
    badge:  "bg-violet-50 text-violet-700 border-violet-300 dark:bg-violet-400/20 dark:text-violet-300 dark:border-violet-400/50",
    circle: "bg-violet-100 dark:bg-violet-400/25",
    emoji: "🎫",
  },
  Transportation: {
    badge:  "bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-400/20 dark:text-sky-300 dark:border-sky-400/50",
    circle: "bg-sky-100 dark:bg-sky-400/25",
    emoji: "🚍",
  },
};

// Stat card color scheme
type StatScheme = "emerald" | "violet" | "sky";
const STAT_SCHEME: Record<StatScheme, {
  border: string; bg: string; accentBar: string; iconBg: string; iconColor: string;
}> = {
  emerald: {
    border:    "border-emerald-200 dark:border-emerald-500/50",
    bg:        "from-emerald-50 to-white dark:from-emerald-950/70 dark:to-card",
    accentBar: "from-emerald-400 to-emerald-600",
    iconBg:    "bg-emerald-100 dark:bg-emerald-500/25",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  violet: {
    border:    "border-violet-200 dark:border-violet-500/50",
    bg:        "from-violet-50 to-white dark:from-violet-950/70 dark:to-card",
    accentBar: "from-violet-400 to-violet-600",
    iconBg:    "bg-violet-100 dark:bg-violet-500/25",
    iconColor: "text-violet-600 dark:text-violet-400",
  },
  sky: {
    border:    "border-sky-200 dark:border-sky-500/50",
    bg:        "from-sky-50 to-white dark:from-sky-950/70 dark:to-card",
    accentBar: "from-sky-400 to-sky-500",
    iconBg:    "bg-sky-100 dark:bg-sky-500/25",
    iconColor: "text-sky-600 dark:text-sky-400",
  },
};

// ── Thai month names ──────────────────────────────────────────────────────────
const TH_MONTH = [
  "ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.",
  "ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค.",
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtPeriod(start: string, end: string): string {
  if (!start || !end) return "-";
  const s = new Date(start + "T00:00:00");
  const e = new Date(end   + "T00:00:00");
  const sm = TH_MONTH[s.getMonth()];
  const em = TH_MONTH[e.getMonth()];
  const sy = s.getFullYear() + 543;
  const ey = e.getFullYear() + 543;
  if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth())
    return `${s.getDate()}–${e.getDate()} ${sm} ${sy}`;
  if (s.getFullYear() === e.getFullYear())
    return `${s.getDate()} ${sm} – ${e.getDate()} ${em} ${sy}`;
  return `${s.getDate()} ${sm} ${sy} – ${e.getDate()} ${em} ${ey}`;
}
function diffDays(start: string, end: string): number {
  if (!start || !end) return 0;
  return Math.max(1, Math.round(
    (new Date(end + "T00:00:00").getTime() - new Date(start + "T00:00:00").getTime()) / 86_400_000
  ) + 1);
}

// ── Form types ────────────────────────────────────────────────────────────────
interface FormState {
  name: string; channels: string[]; target_teams: string[];
  start_date: string; end_date: string; budget: string;
  status: CampaignStatus; notes: string;
}
const EMPTY_FORM: FormState = {
  name: "", channels: [], target_teams: [],
  start_date: "", end_date: "", budget: "", status: "Draft", notes: "",
};
function formFromCampaign(c: Campaign): FormState {
  return {
    name: c.name, channels: [...c.channels], target_teams: [...(c.target_teams ?? [])],
    start_date: c.start_date, end_date: c.end_date,
    budget: c.budget !== undefined ? String(c.budget) : "",
    status: c.status, notes: c.notes ?? "",
  };
}

// ── StatCard sub-component ────────────────────────────────────────────────────
function StatCard({
  label, value, icon: Icon, scheme, subLabel,
}: {
  label: string; value: string | number; icon: typeof Megaphone;
  scheme: StatScheme; subLabel?: string;
}) {
  const s = STAT_SCHEME[scheme];
  return (
    <div className={`rounded-2xl border-2 ${s.border} bg-gradient-to-br ${s.bg} p-5 relative overflow-hidden`}>
      {/* top accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${s.accentBar}`} />
      <div className="flex items-start justify-between gap-3 pt-1">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
          <p className="text-4xl font-bold tracking-tight text-foreground">{value}</p>
          {subLabel && (
            <p className="text-[11px] text-muted-foreground mt-1.5">{subLabel}</p>
          )}
        </div>
        <div className={`p-2.5 rounded-xl ${s.iconBg} shrink-0 mt-1`}>
          <Icon className={`w-5 h-5 ${s.iconColor}`} />
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
type SortKey = "date" | "name" | "status" | "team";
type SortDir = "asc" | "desc";

export default function CampaignManagement() {
  const { campaigns, loadCampaigns, addCampaign, updateCampaign, deleteCampaign } = useCampaigns();
  useEffect(() => { loadCampaigns(); }, [loadCampaigns]);
  const user = useCurrentUser();
  const actorName = user?.full_name ?? user?.username ?? "ไม่ระบุ";
  const { plansByCampaign } = useActionPlans();

  const [viewMode, setViewMode]         = useState<"table" | "calendar">("table");
  const [search, setSearch]             = useState("");
  const [filterStatus, setFilterStatus] = useState<"All" | CampaignStatus>("All");
  const [sortKey, setSortKey]           = useState<SortKey>("date");
  const [sortDir, setSortDir]           = useState<SortDir>("asc");
  const [detailCampaign, setDetailCampaign] = useState<Campaign | null>(null);
  const [dialogOpen, setDialogOpen]     = useState(false);
  const [editId, setEditId]             = useState<string | null>(null);
  const [form, setForm]                 = useState<FormState>(EMPTY_FORM);
  const [formErr, setFormErr]           = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);

  const activeCnt  = campaigns.filter((c) => c.status === "Active").length;
  const totalCamps = campaigns.length;
  const doneCnt    = campaigns.filter((c) => c.status === "Completed").length;

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  function SortBtn({ col, label }: { col: SortKey; label: string }) {
    const active = sortKey === col;
    return (
      <button
        onClick={() => toggleSort(col)}
        className={`flex items-center gap-1 hover:text-foreground transition-colors font-semibold text-xs ${
          active ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        {label}
        {active
          ? <ChevronUp className={`w-3 h-3 ${sortDir === "desc" ? "rotate-180" : ""} transition-transform`} />
          : <ArrowUpDown className="w-3 h-3 opacity-40" />}
      </button>
    );
  }

  const q = search.toLowerCase();
  const filtered = useMemo(() => {
    const base = campaigns.filter((c) => {
      const matchStatus = filterStatus === "All" || c.status === filterStatus;
      const matchSearch = !q || c.name.toLowerCase().includes(q) ||
        c.campaign_id.toLowerCase().includes(q) ||
        c.channels.some((ch) => ch.toLowerCase().includes(q));
      return matchStatus && matchSearch;
    });
    return [...base].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "date")   cmp = a.start_date.localeCompare(b.start_date);
      if (sortKey === "name")   cmp = a.name.localeCompare(b.name);
      if (sortKey === "status") cmp = a.status.localeCompare(b.status);
      if (sortKey === "team")   cmp = (a.target_teams?.[0] ?? "").localeCompare(b.target_teams?.[0] ?? "");
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [campaigns, q, filterStatus, sortKey, sortDir]);

  function openCreate() { setEditId(null); setForm(EMPTY_FORM); setFormErr(""); setDialogOpen(true); }
  function openEdit(c: Campaign) { setEditId(c.id); setForm(formFromCampaign(c)); setFormErr(""); setDialogOpen(true); }
  function toggleChannel(ch: string) {
    setForm((f) => ({
      ...f, channels: f.channels.includes(ch)
        ? f.channels.filter((x) => x !== ch) : [...f.channels, ch],
    }));
  }

  function handleSave() {
    if (!form.name.trim())           { setFormErr("กรุณาระบุชื่อแคมเปญ"); return; }
    if (!form.channels.length)       { setFormErr("กรุณาเลือกช่องทางอย่างน้อย 1 ช่องทาง"); return; }
    if (!form.target_teams.length)   { setFormErr("กรุณาเลือกแผนกอย่างน้อย 1 แผนก"); return; }
    const payload = {
      name: form.name.trim(), channels: form.channels, target_teams: form.target_teams,
      start_date: form.start_date, end_date: form.end_date,
      budget: form.budget ? parseFloat(form.budget) : undefined,
      reach: 0, leads: 0, status: form.status,
      notes: form.notes.trim() || undefined, created_by: actorName,
    };
    if (editId) {
      updateCampaign(editId, payload);
      logActivity({ event_type: "campaign_updated", actor: actorName, subject: "แก้ไขแคมเปญ",
        detail: `${payload.name} · ${payload.channels.join(", ")}`, entity_type: "campaign",
        entity_id: editId, entity_name: payload.name });
    } else {
      addCampaign(payload);
      logActivity({ event_type: "campaign_added", actor: actorName, subject: "สร้างแคมเปญใหม่",
        detail: `${payload.name} · ${payload.channels.join(", ")}`, entity_type: "campaign",
        entity_name: payload.name });
    }
    setDialogOpen(false); setEditId(null); setForm(EMPTY_FORM);
  }

  function handleInlineStatus(id: string, status: CampaignStatus) {
    const camp = campaigns.find((c) => c.id === id);
    updateCampaign(id, { status });
    if (camp) logActivity({ event_type: "campaign_status_changed", actor: actorName,
      subject: `แคมเปญ → ${status}`, detail: camp.name, entity_type: "campaign",
      entity_id: id, entity_name: camp.name, meta: { new_status: status } });
  }

  function handleDelete() {
    if (deleteTarget) {
      logActivity({ event_type: "campaign_deleted", actor: actorName, subject: "ลบแคมเปญ",
        detail: deleteTarget.name, entity_type: "campaign",
        entity_id: deleteTarget.id, entity_name: deleteTarget.name });
      deleteCampaign(deleteTarget.id);
    }
    setDeleteTarget(null);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-pink flex items-center justify-center shadow-glow">
            <Megaphone className="w-5 h-5 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Campaign Management</h1>
            <p className="text-sm text-muted-foreground">จัดการแคมเปญการตลาดทั้งหมด</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex rounded-lg border border-border overflow-hidden h-9 shrink-0">
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 text-xs font-medium transition-colors
                ${viewMode === "table" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
            >
              <LayoutList className="w-3.5 h-3.5" /> ตาราง
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`flex items-center gap-1.5 px-3 text-xs font-medium border-l border-border transition-colors
                ${viewMode === "calendar" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
            >
              <CalendarDays className="w-3.5 h-3.5" /> ปฏิทิน
            </button>
          </div>
          <Button onClick={openCreate} className="bg-gradient-primary text-primary-foreground flex-1 sm:flex-none gap-1.5">
            <Plus className="w-4 h-4" /> สร้าง Campaign
          </Button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Active Campaigns" value={activeCnt} icon={Zap} scheme="emerald"
          subLabel={activeCnt > 0 ? "กำลังดำเนินการอยู่" : "ยังไม่มี Campaign ที่ Active"}
        />
        <StatCard
          label="Campaigns ทั้งหมด" value={totalCamps} icon={Rocket} scheme="violet"
          subLabel={`${CAMPAIGN_DEPARTMENTS.length} แผนก · ${CAMPAIGN_CHANNELS.length} ช่องทาง`}
        />
        <StatCard
          label="Completed" value={doneCnt} icon={CheckCircle2} scheme="sky"
          subLabel={totalCamps > 0 ? `${Math.round((doneCnt / totalCamps) * 100)}% ของทั้งหมด` : "ยังไม่มี"}
        />
      </div>

      {/* ── Filter bar ── */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="ค้นหาชื่อ, ID, ช่องทาง…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {/* Status filter chips */}
        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
          <button
            onClick={() => setFilterStatus("All")}
            className={`text-xs px-3 py-1.5 rounded-full border font-semibold transition-all ${
              filterStatus === "All"
                ? "bg-foreground text-background border-foreground"
                : "bg-transparent text-muted-foreground border-border hover:border-muted-foreground hover:text-foreground"
            }`}
          >
            ทั้งหมด
          </button>
          {CAMPAIGN_STATUS_LIST.map((s) => {
            const cfg = STATUS_CFG[s];
            const active = filterStatus === s;
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-semibold transition-all ${
                  active ? cfg.chipActive : "bg-transparent text-muted-foreground border-border hover:border-muted-foreground hover:text-foreground"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {s}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Calendar View ── */}
      {viewMode === "calendar" && (
        <CampaignCalendar campaigns={campaigns} onSelect={(c) => setDetailCampaign(c)} />
      )}

      {/* ── Table ── */}
      {viewMode === "table" && (
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-5 py-3.5 text-left" style={{ minWidth: 170 }}><SortBtn col="date" label="ช่วงเวลา" /></th>
                  <th className="px-5 py-3.5 text-left" style={{ minWidth: 220 }}><SortBtn col="name" label="ชื่อแคมเปญ" /></th>
                  <th className="px-5 py-3.5 text-left" style={{ minWidth: 140 }}><SortBtn col="team" label="ทีม" /></th>
                  <th className="px-5 py-3.5 text-left" style={{ minWidth: 160 }}>
                    <span className="text-xs font-semibold text-muted-foreground">ช่องทาง</span>
                  </th>
                  <th className="px-5 py-3.5 text-left" style={{ minWidth: 150 }}>
                    <span className="text-xs font-semibold text-muted-foreground">ความคืบหน้า</span>
                  </th>
                  <th className="px-5 py-3.5 text-center" style={{ minWidth: 130 }}><SortBtn col="status" label="สถานะ" /></th>
                  <th className="px-5 py-3.5 text-center" style={{ minWidth: 80 }}>
                    <span className="text-xs font-semibold text-muted-foreground">จัดการ</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">

                {/* Empty state */}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                          <BarChart3 className="w-7 h-7 text-muted-foreground/40" />
                        </div>
                        <p className="font-medium text-muted-foreground">
                          {search || filterStatus !== "All" ? "ไม่พบแคมเปญที่ตรงกับเงื่อนไข" : "ยังไม่มีแคมเปญ"}
                        </p>
                        {!search && filterStatus === "All" && (
                          <p className="text-xs text-muted-foreground/50">กด "+ สร้าง Campaign" เพื่อเริ่มต้น</p>
                        )}
                      </div>
                    </td>
                  </tr>
                )}

                {filtered.map((c) => {
                  const plans = plansByCampaign[c.id] ?? [];
                  const done  = plans.filter((p) => p.status === "Done").length;
                  const pct   = plans.length > 0 ? Math.round((done / plans.length) * 100) : null;
                  const days  = diffDays(c.start_date, c.end_date);
                  const scfg  = STATUS_CFG[c.status];

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-muted/30 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                      onClick={() => setDetailCampaign(c)}
                    >
                      {/* ช่วงเวลา */}
                      <td className="px-5 py-4">
                        <div className="pl-3" style={{ borderLeft: `3px solid ${scfg.accent}` }}>
                          <div className="text-xs font-semibold text-foreground leading-snug">
                            {fmtPeriod(c.start_date, c.end_date)}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              {c.campaign_id}
                            </span>
                            {days > 0 && (
                              <span className="text-[10px] text-muted-foreground/60">{days} วัน</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* ชื่อ */}
                      <td className="px-5 py-4">
                        <div className="font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
                          {c.name}
                        </div>
                        {c.notes && (
                          <div className="text-[11px] text-muted-foreground/60 truncate max-w-[220px] mt-0.5">{c.notes}</div>
                        )}
                        {c.budget && (
                          <div className="text-[11px] text-muted-foreground/70 mt-0.5">
                            💰 {Number(c.budget).toLocaleString("th-TH")} บาท
                          </div>
                        )}
                      </td>

                      {/* ทีม */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1 flex-wrap">
                          {(c.target_teams ?? []).map((t) => {
                            const d = DEPT_CFG[t];
                            if (!d) return null;
                            return (
                              <span key={t} title={t}
                                className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg border ${d.badge}`}
                              >
                                <span className="text-sm leading-none">{d.emoji}</span>
                                <span className="hidden sm:inline">{t}</span>
                              </span>
                            );
                          })}
                          {(!c.target_teams || c.target_teams.length === 0) && (
                            <span className="text-[11px] text-muted-foreground/40 italic">-</span>
                          )}
                        </div>
                      </td>

                      {/* ช่องทาง */}
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1">
                          {c.channels.slice(0, 3).map((ch) => (
                            <span key={ch}
                              className="text-[11px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border"
                            >
                              {ch}
                            </span>
                          ))}
                          {c.channels.length > 3 && (
                            <span className="text-[11px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
                              +{c.channels.length - 3}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* ความคืบหน้า */}
                      <td className="px-5 py-4">
                        {pct !== null ? (
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[11px] text-muted-foreground">{done}/{plans.length} tasks</span>
                              <span className={`text-[11px] font-bold ${pct === 100 ? "text-emerald-500 dark:text-emerald-400" : "text-violet-600 dark:text-violet-400"}`}>
                                {pct}%
                              </span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${pct === 100 ? "bg-emerald-500" : "bg-violet-500"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span className="text-[11px] text-muted-foreground/40 italic">ยังไม่มี task</span>
                            <div className="h-2 bg-muted/40 rounded-full mt-1.5" />
                          </div>
                        )}
                      </td>

                      {/* สถานะ */}
                      <td className="px-5 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="relative inline-flex items-center">
                          <select
                            value={c.status}
                            onChange={(e) => handleInlineStatus(c.id, e.target.value as CampaignStatus)}
                            className={`appearance-none text-[11px] font-semibold pl-5 pr-5 py-1.5 rounded-full border cursor-pointer focus:outline-none transition-colors ${scfg.cls}`}
                            style={{ backgroundImage: "none" }}
                          >
                            {CAMPAIGN_STATUS_LIST.map((s) => (
                              <option key={s} value={s} className="bg-background text-foreground">{s}</option>
                            ))}
                          </select>
                          <span className={`pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${scfg.dot}`} />
                          <ChevronDown className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 opacity-60" />
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(c)}
                            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                            title="แก้ไข"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setDeleteTarget(c)}
                            className="p-1.5 rounded-lg hover:bg-destructive/15 transition-colors text-muted-foreground hover:text-destructive"
                            title="ลบ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filtered.length > 0 && (
            <div className="px-5 py-2.5 border-t border-border/60 flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">
                แสดง <span className="font-semibold text-foreground">{filtered.length}</span> จาก {campaigns.length} แคมเปญ
              </p>
              <p className="text-[11px] text-muted-foreground">คลิก row เพื่อดู Action Plan</p>
            </div>
          )}
        </div>
      )}

      {/* ── Campaign Detail Drawer ── */}
      <CampaignDetail
        campaign={detailCampaign}
        onClose={() => setDetailCampaign(null)}
        onEdit={(c) => { setDetailCampaign(null); openEdit(c); }}
      />

      {/* ── Create / Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "แก้ไขแคมเปญ" : "สร้าง Campaign ใหม่"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="camp-name">ชื่อแคมเปญ <span className="text-destructive">*</span></Label>
              <Input id="camp-name" placeholder="เช่น Summer Tour Promo 2026" value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>

            <div className="space-y-1.5">
              <Label>ช่องทาง <span className="text-destructive">*</span></Label>
              <div className="flex flex-wrap gap-1.5">
                {CAMPAIGN_CHANNELS.map((ch) => (
                  <button key={ch} type="button" onClick={() => toggleChannel(ch)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                      form.channels.includes(ch)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    }`}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>แผนกเป้าหมาย <span className="text-destructive">*</span></Label>
              <div className="flex gap-2">
                {CAMPAIGN_DEPARTMENTS.map((dept) => {
                  const active = form.target_teams.includes(dept.id);
                  const d = DEPT_CFG[dept.id];
                  return (
                    <button key={dept.id} type="button"
                      onClick={() => setForm((f) => ({
                        ...f,
                        target_teams: active
                          ? f.target_teams.filter((x) => x !== dept.id)
                          : [...f.target_teams, dept.id],
                      }))}
                      className={`flex-1 text-xs px-2 py-2.5 rounded-xl border transition-all font-semibold flex items-center justify-center gap-1.5 ${
                        active
                          ? dept.id === "Outbound" ? "bg-orange-500 text-white border-orange-500"
                          : dept.id === "Ticket"   ? "bg-violet-500 text-white border-violet-500"
                          :                          "bg-sky-500 text-white border-sky-500"
                          : `${d.badge} hover:opacity-80`
                      }`}
                    >
                      <span>{d.emoji}</span>
                      <span>{dept.id}</span>
                      {active && <span className="text-[10px] opacity-80">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="camp-start">วันที่เริ่ม</Label>
                <Input id="camp-start" type="date" value={form.start_date}
                  onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="camp-end">วันที่สิ้นสุด</Label>
                <Input id="camp-end" type="date" value={form.end_date}
                  onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="camp-status">สถานะ</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as CampaignStatus }))}>
                  <SelectTrigger id="camp-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CAMPAIGN_STATUS_LIST.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="camp-budget">งบประมาณ (บาท)</Label>
                <Input id="camp-budget" type="number" min="0" placeholder="ไม่บังคับ" value={form.budget}
                  onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="camp-notes">หมายเหตุ</Label>
              <Textarea id="camp-notes" placeholder="รายละเอียดเพิ่มเติม…" rows={3} value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>

            {formErr && (
              <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg border border-destructive/20">{formErr}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleSave} className="bg-gradient-primary text-primary-foreground">
              {editId ? "บันทึกการแก้ไข" : "สร้างแคมเปญ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete AlertDialog ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบแคมเปญ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบ <span className="font-semibold text-foreground">"{deleteTarget?.name}"</span> ({deleteTarget?.campaign_id})?
              การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              ลบแคมเปญ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
