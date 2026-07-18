/**
 * CampaignManagement — Project-style Campaign management
 * Features: Create / Edit / Delete / inline status change / search + filter / sort / Action Plans drawer
 */
import { useState, useEffect, useMemo } from "react";
import {
  Megaphone, Plus, Calendar, TrendingUp, Search, Pencil, Trash2,
  Users2, BarChart3, ChevronDown, X, LayoutList, CalendarDays,
  ArrowUpDown, ChevronUp, Rocket, CheckCircle2, Zap,
} from "lucide-react";
import { CampaignCalendar } from "@/components/CampaignCalendar";
import { CampaignDetail }  from "@/components/CampaignDetail";
import { useActionPlans }  from "@/store/actionPlanStore";
import { Button }   from "@/components/ui/button";
import { Badge }    from "@/components/ui/badge";
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

// ── Constants ─────────────────────────────────────────────────────────────────

type StatusCfg = { label: string; cls: string; dot: string; accent: string; selectBg: string };

const STATUS_CFG: Record<CampaignStatus, StatusCfg> = {
  Draft:     { label: "Draft",     cls: "bg-slate-100 text-slate-600 border-slate-200",        dot: "bg-slate-400",    accent: "#94a3b8", selectBg: "bg-slate-100" },
  Scheduled: { label: "Scheduled", cls: "bg-amber-50 text-amber-700 border-amber-200",         dot: "bg-amber-400",    accent: "#f59e0b", selectBg: "bg-amber-50" },
  Active:    { label: "Active",    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",   dot: "bg-emerald-500",  accent: "#10b981", selectBg: "bg-emerald-50" },
  Paused:    { label: "Paused",    cls: "bg-orange-50 text-orange-700 border-orange-200",      dot: "bg-orange-500",   accent: "#f97316", selectBg: "bg-orange-50" },
  Completed: { label: "Completed", cls: "bg-sky-50 text-sky-700 border-sky-200",              dot: "bg-sky-500",      accent: "#0ea5e9", selectBg: "bg-sky-50" },
};

const DEPT_CFG: Record<string, { bg: string; text: string; border: string; emoji: string; circleBg: string }> = {
  Outbound:       { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", emoji: "✈️", circleBg: "bg-orange-100" },
  Ticket:         { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200", emoji: "🎫", circleBg: "bg-violet-100" },
  Transportation: { bg: "bg-sky-50",    text: "text-sky-700",    border: "border-sky-200",    emoji: "🚍", circleBg: "bg-sky-100" },
};

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
  if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
    return `${s.getDate()}–${e.getDate()} ${sm} ${sy}`;
  }
  if (s.getFullYear() === e.getFullYear()) {
    return `${s.getDate()} ${sm} – ${e.getDate()} ${em} ${sy}`;
  }
  return `${s.getDate()} ${sm} ${sy} – ${e.getDate()} ${em} ${ey}`;
}

function diffDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const ms = new Date(end + "T00:00:00").getTime() - new Date(start + "T00:00:00").getTime();
  return Math.max(1, Math.round(ms / 86_400_000) + 1);
}

// ── Form types ────────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  channels: string[];
  target_teams: string[];
  start_date: string;
  end_date: string;
  budget: string;
  status: CampaignStatus;
  notes: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  channels: [],
  target_teams: [],
  start_date: "",
  end_date: "",
  budget: "",
  status: "Draft",
  notes: "",
};

function formFromCampaign(c: Campaign): FormState {
  return {
    name:         c.name,
    channels:     [...c.channels],
    target_teams: [...(c.target_teams ?? [])],
    start_date:   c.start_date,
    end_date:     c.end_date,
    budget:       c.budget !== undefined ? String(c.budget) : "",
    status:       c.status,
    notes:        c.notes ?? "",
  };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon: Icon, gradient, iconBg, iconColor, subLabel,
}: {
  label: string;
  value: string | number;
  icon: typeof Megaphone;
  gradient: string;
  iconBg: string;
  iconColor: string;
  subLabel?: string;
}) {
  return (
    <div className={`rounded-2xl border p-5 bg-gradient-to-br ${gradient} relative overflow-hidden`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
          <p className="text-4xl font-bold tracking-tight">{value}</p>
          {subLabel && <p className="text-[11px] text-muted-foreground mt-1.5">{subLabel}</p>}
        </div>
        <div className={`p-2.5 rounded-xl ${iconBg} shrink-0`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
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

  // ── Search / filter / sort ──
  const [viewMode, setViewMode]         = useState<"table" | "calendar">("table");
  const [search, setSearch]             = useState("");
  const [filterStatus, setFilterStatus] = useState<"All" | CampaignStatus>("All");
  const [sortKey, setSortKey]           = useState<SortKey>("date");
  const [sortDir, setSortDir]           = useState<SortDir>("asc");

  // ── Detail drawer ──
  const [detailCampaign, setDetailCampaign] = useState<Campaign | null>(null);

  // ── Dialog (create / edit) ──
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId]         = useState<string | null>(null);
  const [form, setForm]             = useState<FormState>(EMPTY_FORM);
  const [formErr, setFormErr]       = useState("");

  // ── Delete confirm ──
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);

  // ── Computed stats ──
  const activeCnt   = campaigns.filter((c) => c.status === "Active").length;
  const totalCamps  = campaigns.length;
  const doneCnt     = campaigns.filter((c) => c.status === "Completed").length;

  // ── Sort helper ──
  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  function SortBtn({ col, label }: { col: SortKey; label: string }) {
    const active = sortKey === col;
    return (
      <button
        onClick={() => toggleSort(col)}
        className={`flex items-center gap-1 text-left hover:text-foreground transition-colors font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}
      >
        {label}
        {active
          ? <ChevronUp className={`w-3 h-3 transition-transform ${sortDir === "desc" ? "rotate-180" : ""}`} />
          : <ArrowUpDown className="w-3 h-3 opacity-40" />}
      </button>
    );
  }

  // ── Filtered + sorted list ──
  const q = search.toLowerCase();
  const filtered = useMemo(() => {
    const base = campaigns.filter((c) => {
      const matchStatus = filterStatus === "All" || c.status === filterStatus;
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
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

  // ── Handlers ──
  function openCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setFormErr("");
    setDialogOpen(true);
  }

  function openEdit(c: Campaign) {
    setEditId(c.id);
    setForm(formFromCampaign(c));
    setFormErr("");
    setDialogOpen(true);
  }

  function toggleChannel(ch: string) {
    setForm((f) => ({
      ...f,
      channels: f.channels.includes(ch)
        ? f.channels.filter((x) => x !== ch)
        : [...f.channels, ch],
    }));
  }

  function handleSave() {
    if (!form.name.trim()) {
      setFormErr("กรุณาระบุชื่อแคมเปญ");
      return;
    }
    if (form.channels.length === 0) {
      setFormErr("กรุณาเลือกช่องทางอย่างน้อย 1 ช่องทาง");
      return;
    }
    if (form.target_teams.length === 0) {
      setFormErr("กรุณาเลือกแผนกอย่างน้อย 1 แผนก");
      return;
    }
    const payload = {
      name:         form.name.trim(),
      channels:     form.channels,
      target_teams: form.target_teams,
      start_date:   form.start_date,
      end_date:     form.end_date,
      budget:       form.budget ? parseFloat(form.budget) : undefined,
      reach:        0,
      leads:        0,
      status:       form.status,
      notes:        form.notes.trim() || undefined,
      created_by:   actorName,
    };
    if (editId) {
      updateCampaign(editId, payload);
      logActivity({
        event_type:  "campaign_updated",
        actor:       actorName,
        subject:     "แก้ไขแคมเปญ",
        detail:      `${payload.name} · ${payload.channels.join(", ")}`,
        entity_type: "campaign",
        entity_id:   editId,
        entity_name: payload.name,
      });
    } else {
      addCampaign(payload);
      logActivity({
        event_type:  "campaign_added",
        actor:       actorName,
        subject:     "สร้างแคมเปญใหม่",
        detail:      `${payload.name} · ${payload.channels.join(", ")}`,
        entity_type: "campaign",
        entity_name: payload.name,
      });
    }
    setDialogOpen(false);
    setEditId(null);
    setForm(EMPTY_FORM);
  }

  function handleInlineStatus(id: string, status: CampaignStatus) {
    const camp = campaigns.find((c) => c.id === id);
    updateCampaign(id, { status });
    if (camp) {
      logActivity({
        event_type:  "campaign_status_changed",
        actor:       actorName,
        subject:     `แคมเปญ → ${status}`,
        detail:      camp.name,
        entity_type: "campaign",
        entity_id:   id,
        entity_name: camp.name,
        meta:        { new_status: status },
      });
    }
  }

  function handleDelete() {
    if (deleteTarget) {
      logActivity({
        event_type:  "campaign_deleted",
        actor:       actorName,
        subject:     "ลบแคมเปญ",
        detail:      deleteTarget.name,
        entity_type: "campaign",
        entity_id:   deleteTarget.id,
        entity_name: deleteTarget.name,
      });
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
          {/* View toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden h-9 shrink-0">
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 text-xs font-medium transition-colors
                ${viewMode === "table"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"}`}
            >
              <LayoutList className="w-3.5 h-3.5" />
              ตาราง
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`flex items-center gap-1.5 px-3 text-xs font-medium transition-colors border-l border-border
                ${viewMode === "calendar"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"}`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              ปฏิทิน
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
          label="Active Campaigns"
          value={activeCnt}
          icon={Zap}
          gradient="from-emerald-50 to-teal-50/60 border-emerald-100"
          iconBg="bg-emerald-100"
          iconColor="text-emerald-600"
          subLabel={activeCnt > 0 ? "กำลังดำเนินการอยู่" : "ยังไม่มี Campaign ที่ Active"}
        />
        <StatCard
          label="Campaigns ทั้งหมด"
          value={totalCamps}
          icon={Rocket}
          gradient="from-violet-50 to-purple-50/60 border-violet-100"
          iconBg="bg-violet-100"
          iconColor="text-violet-600"
          subLabel={`${CAMPAIGN_DEPARTMENTS.length} แผนก · ${CAMPAIGN_CHANNELS.length} ช่องทาง`}
        />
        <StatCard
          label="Completed"
          value={doneCnt}
          icon={CheckCircle2}
          gradient="from-sky-50 to-blue-50/60 border-sky-100"
          iconBg="bg-sky-100"
          iconColor="text-sky-600"
          subLabel={totalCamps > 0 ? `${Math.round((doneCnt / totalCamps) * 100)}% ของทั้งหมด` : "ยังไม่มี"}
        />
      </div>

      {/* ── Filter bar ── */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
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
        <div className="flex items-center gap-1.5 flex-wrap">
          {(["All", ...CAMPAIGN_STATUS_LIST] as const).map((s) => {
            const isAll = s === "All";
            const active = filterStatus === s;
            const cfg = !isAll ? STATUS_CFG[s] : null;
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(s as typeof filterStatus)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                  active
                    ? isAll
                      ? "bg-foreground text-background border-foreground"
                      : `${cfg!.cls} border-current`
                    : "bg-background text-muted-foreground border-border hover:border-muted-foreground/40 hover:text-foreground"
                }`}
              >
                {!isAll && cfg && <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />}
                {isAll ? "ทั้งหมด" : s}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Calendar View ── */}
      {viewMode === "calendar" && (
        <CampaignCalendar
          campaigns={campaigns}
          onSelect={(c) => setDetailCampaign(c)}
        />
      )}

      {/* ── Table ── */}
      {viewMode === "table" && (
        <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-5 py-3.5 text-left" style={{ minWidth: 170 }}>
                    <SortBtn col="date" label="ช่วงเวลา" />
                  </th>
                  <th className="px-5 py-3.5 text-left" style={{ minWidth: 220 }}>
                    <SortBtn col="name" label="ชื่อแคมเปญ" />
                  </th>
                  <th className="px-5 py-3.5 text-left" style={{ minWidth: 130 }}>
                    <SortBtn col="team" label="ทีม" />
                  </th>
                  <th className="px-5 py-3.5 text-left" style={{ minWidth: 160 }}>ช่องทาง</th>
                  <th className="px-5 py-3.5 text-left" style={{ minWidth: 150 }}>ความคืบหน้า</th>
                  <th className="px-5 py-3.5 text-center" style={{ minWidth: 130 }}>
                    <SortBtn col="status" label="สถานะ" />
                  </th>
                  <th className="px-5 py-3.5 text-center" style={{ minWidth: 80 }}>จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center">
                          <BarChart3 className="w-7 h-7 text-muted-foreground/40" />
                        </div>
                        <div>
                          <p className="font-medium text-muted-foreground">
                            {search || filterStatus !== "All" ? "ไม่พบแคมเปญที่ตรงกับเงื่อนไข" : "ยังไม่มีแคมเปญ"}
                          </p>
                          {!search && filterStatus === "All" && (
                            <p className="text-xs text-muted-foreground/60 mt-1">กด "+ สร้าง Campaign" เพื่อเริ่มต้น</p>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                {filtered.map((c) => {
                  const plans = plansByCampaign[c.id] ?? [];
                  const done  = plans.filter((p) => p.status === "Done").length;
                  const pct   = plans.length > 0 ? Math.round((done / plans.length) * 100) : null;
                  const days  = diffDays(c.start_date, c.end_date);
                  const statusCfg = STATUS_CFG[c.status];

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-muted/20 transition-colors cursor-pointer group"
                      onClick={() => setDetailCampaign(c)}
                    >
                      {/* ช่วงเวลา */}
                      <td className="px-5 py-4">
                        <div
                          className="pl-3 border-l-2"
                          style={{ borderColor: statusCfg.accent }}
                        >
                          <div className="text-xs font-semibold text-foreground leading-snug">
                            {fmtPeriod(c.start_date, c.end_date)}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[10px] font-mono text-muted-foreground/70 bg-muted px-1.5 py-0.5 rounded">
                              {c.campaign_id}
                            </span>
                            {days > 0 && (
                              <span className="text-[10px] text-muted-foreground/50">{days} วัน</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* ชื่อ */}
                      <td className="px-5 py-4">
                        <div className="font-semibold text-foreground leading-snug group-hover:text-primary transition-colors">
                          {c.name}
                        </div>
                        {c.notes && (
                          <div className="text-[11px] text-muted-foreground/60 truncate max-w-[220px] mt-0.5">
                            {c.notes}
                          </div>
                        )}
                        {c.budget && (
                          <div className="text-[11px] text-muted-foreground/70 mt-0.5">
                            💰 {Number(c.budget).toLocaleString("th-TH")} บาท
                          </div>
                        )}
                      </td>

                      {/* ทีม */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {(c.target_teams ?? []).map((t) => {
                            const d = DEPT_CFG[t];
                            if (!d) return null;
                            return (
                              <div
                                key={t}
                                title={t}
                                className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg border ${d.bg} ${d.text} ${d.border}`}
                              >
                                <span className="text-sm leading-none">{d.emoji}</span>
                                <span className="hidden sm:inline">{t}</span>
                              </div>
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
                            <span
                              key={ch}
                              className="text-[11px] px-2 py-0.5 rounded-md bg-muted/70 text-muted-foreground border border-border/50"
                            >
                              {ch}
                            </span>
                          ))}
                          {c.channels.length > 3 && (
                            <span className="text-[11px] px-2 py-0.5 rounded-md bg-muted/70 text-muted-foreground border border-border/50">
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
                              <span className={`text-[11px] font-bold ${pct === 100 ? "text-emerald-600" : "text-violet-600"}`}>{pct}%</span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${pct === 100 ? "bg-emerald-500" : "bg-violet-500"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[11px] text-muted-foreground/40 italic">ยังไม่มี task</span>
                            </div>
                            <div className="h-1.5 bg-muted/40 rounded-full" />
                          </div>
                        )}
                      </td>

                      {/* สถานะ */}
                      <td className="px-5 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="relative inline-flex items-center">
                          <select
                            value={c.status}
                            onChange={(e) => handleInlineStatus(c.id, e.target.value as CampaignStatus)}
                            className={`appearance-none text-[11px] font-semibold pl-5 pr-5 py-1.5 rounded-full border cursor-pointer focus:outline-none transition-colors ${STATUS_CFG[c.status].cls} ${STATUS_CFG[c.status].selectBg}`}
                            style={{ backgroundImage: "none" }}
                          >
                            {CAMPAIGN_STATUS_LIST.map((s) => (
                              <option key={s} value={s} className="bg-white text-gray-800">{s}</option>
                            ))}
                          </select>
                          <span className={`pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${STATUS_CFG[c.status].dot}`} />
                          <ChevronDown className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 opacity-50" />
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEdit(c)}
                            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                            title="แก้ไข"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(c)}
                            className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
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

          {/* Footer */}
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
            <DialogTitle>
              {editId ? "แก้ไขแคมเปญ" : "สร้าง Campaign ใหม่"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="camp-name">ชื่อแคมเปญ <span className="text-destructive">*</span></Label>
              <Input
                id="camp-name"
                placeholder="เช่น Summer Tour Promo 2026"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            {/* Channels */}
            <div className="space-y-1.5">
              <Label>ช่องทาง <span className="text-destructive">*</span></Label>
              <div className="flex flex-wrap gap-1.5">
                {CAMPAIGN_CHANNELS.map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => toggleChannel(ch)}
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

            {/* Target Departments — multi-select */}
            <div className="space-y-1.5">
              <Label>แผนกเป้าหมาย <span className="text-destructive">*</span></Label>
              <div className="flex gap-2">
                {CAMPAIGN_DEPARTMENTS.map((dept) => {
                  const active = form.target_teams.includes(dept.id);
                  const d = DEPT_CFG[dept.id];
                  const colorCls = active
                    ? dept.id === "Outbound"
                      ? "bg-orange-500 text-white border-orange-500"
                      : dept.id === "Ticket"
                      ? "bg-violet-500 text-white border-violet-500"
                      : "bg-sky-500 text-white border-sky-500"
                    : `${d.bg} ${d.text} ${d.border} hover:opacity-80`;
                  return (
                    <button
                      key={dept.id}
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          target_teams: active
                            ? f.target_teams.filter((x) => x !== dept.id)
                            : [...f.target_teams, dept.id],
                        }))
                      }
                      className={`flex-1 text-xs px-2 py-2.5 rounded-xl border transition-all font-semibold flex items-center justify-center gap-1.5 ${colorCls}`}
                    >
                      <span>{d.emoji}</span>
                      <span>{dept.id}</span>
                      {active && <span className="text-[10px] opacity-80">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="camp-start">วันที่เริ่ม</Label>
                <Input
                  id="camp-start"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="camp-end">วันที่สิ้นสุด</Label>
                <Input
                  id="camp-end"
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                />
              </div>
            </div>

            {/* Status + Budget */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="camp-status">สถานะ</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v as CampaignStatus }))}
                >
                  <SelectTrigger id="camp-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CAMPAIGN_STATUS_LIST.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="camp-budget">งบประมาณ (บาท)</Label>
                <Input
                  id="camp-budget"
                  type="number"
                  min="0"
                  placeholder="ไม่บังคับ"
                  value={form.budget}
                  onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="camp-notes">หมายเหตุ</Label>
              <Textarea
                id="camp-notes"
                placeholder="รายละเอียดเพิ่มเติม…"
                rows={3}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>

            {/* Error */}
            {formErr && (
              <p className="text-xs text-destructive bg-destructive/5 px-3 py-2 rounded-lg">{formErr}</p>
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
              คุณต้องการลบ <span className="font-semibold text-foreground">"{deleteTarget?.name}"</span> ({deleteTarget?.campaign_id}) ออกจากระบบ?
              การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              ลบแคมเปญ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
