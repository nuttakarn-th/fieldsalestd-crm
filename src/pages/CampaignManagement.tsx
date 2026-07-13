/**
 * CampaignManagement — fully functional with Zustand store
 * Features: Create / Edit / Delete / inline status change / search + filter
 */
import { useState } from "react";
import {
  Megaphone, Plus, Calendar, TrendingUp, Search, Pencil, Trash2,
  Users2, BarChart3, ChevronDown, X,
} from "lucide-react";
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

import {
  useCampaigns,
  CAMPAIGN_CHANNELS,
  CAMPAIGN_STATUS_LIST,
  type Campaign,
  type CampaignStatus,
} from "@/store/campaignStore";
import { useCurrentUser } from "@/store/authStore";

// ── Constants ─────────────────────────────────────────────────────────────────

type StatusCfg = { label: string; cls: string; dot: string };

const STATUS_CFG: Record<CampaignStatus, StatusCfg> = {
  Draft:     { label: "Draft",     cls: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",       dot: "bg-zinc-400"    },
  Scheduled: { label: "Scheduled", cls: "bg-amber-400/20 text-amber-300 border-amber-400/40",    dot: "bg-amber-400"   },
  Active:    { label: "Active",    cls: "bg-emerald-400/15 text-emerald-400 border-emerald-400/30", dot: "bg-emerald-400" },
  Paused:    { label: "Paused",    cls: "bg-orange-400/15 text-orange-400 border-orange-400/30", dot: "bg-orange-400"  },
  Completed: { label: "Completed", cls: "bg-sky-400/15 text-sky-400 border-sky-400/30",          dot: "bg-sky-400"     },
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
    return `${s.getDate()}-${e.getDate()} ${sm} ${sy}`;
  }
  if (s.getFullYear() === e.getFullYear()) {
    return `${s.getDate()} ${sm} - ${e.getDate()} ${em} ${sy}`;
  }
  return `${s.getDate()} ${sm} ${sy} - ${e.getDate()} ${em} ${ey}`;
}

function fmtNum(n: number): string {
  return n.toLocaleString("th-TH");
}

// ── Form types ────────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  channels: string[];
  start_date: string;
  end_date: string;
  budget: string;
  reach: string;
  leads: string;
  status: CampaignStatus;
  notes: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  channels: [],
  start_date: "",
  end_date: "",
  budget: "",
  reach: "0",
  leads: "0",
  status: "Draft",
  notes: "",
};

function formFromCampaign(c: Campaign): FormState {
  return {
    name:       c.name,
    channels:   [...c.channels],
    start_date: c.start_date,
    end_date:   c.end_date,
    budget:     c.budget !== undefined ? String(c.budget) : "",
    reach:      String(c.reach),
    leads:      String(c.leads),
    status:     c.status,
    notes:      c.notes ?? "",
  };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon: Icon, color = "text-primary",
}: {
  label: string;
  value: string | number;
  icon: typeof Megaphone;
  color?: string;
}) {
  return (
    <div className="bg-card rounded-xl border shadow-soft p-5 flex items-center gap-4">
      <div className={`p-3 rounded-lg bg-primary/10 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: CampaignStatus }) {
  const cfg = STATUS_CFG[status];
  return (
    <Badge variant="outline" className={`text-xs font-medium gap-1.5 ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </Badge>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function CampaignManagement() {
  const { campaigns, addCampaign, updateCampaign, deleteCampaign } = useCampaigns();
  const user = useCurrentUser();
  const actorName = user?.full_name ?? user?.username ?? "ไม่ระบุ";

  // ── Search / filter ──
  const [search, setSearch]           = useState("");
  const [filterStatus, setFilterStatus] = useState<"All" | CampaignStatus>("All");

  // ── Dialog (create / edit) ──
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId]         = useState<string | null>(null);
  const [form, setForm]             = useState<FormState>(EMPTY_FORM);
  const [formErr, setFormErr]       = useState("");

  // ── Delete confirm ──
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);

  // ── Computed stats ──
  const activeCnt  = campaigns.filter((c) => c.status === "Active").length;
  const totalReach = campaigns.reduce((s, c) => s + c.reach, 0);
  const totalLeads = campaigns.reduce((s, c) => s + c.leads, 0);

  // ── Filtered list ──
  const q = search.toLowerCase();
  const filtered = campaigns.filter((c) => {
    const matchStatus = filterStatus === "All" || c.status === filterStatus;
    const matchSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.campaign_id.toLowerCase().includes(q) ||
      c.channels.some((ch) => ch.toLowerCase().includes(q));
    return matchStatus && matchSearch;
  });

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
    const payload = {
      name:       form.name.trim(),
      channels:   form.channels,
      start_date: form.start_date,
      end_date:   form.end_date,
      budget:     form.budget ? parseFloat(form.budget) : undefined,
      reach:      parseInt(form.reach)  || 0,
      leads:      parseInt(form.leads)  || 0,
      status:     form.status,
      notes:      form.notes.trim() || undefined,
      created_by: actorName,
    };
    if (editId) {
      updateCampaign(editId, payload);
    } else {
      addCampaign(payload);
    }
    setDialogOpen(false);
    setEditId(null);
    setForm(EMPTY_FORM);
  }

  function handleInlineStatus(id: string, status: CampaignStatus) {
    updateCampaign(id, { status });
  }

  function handleDelete() {
    if (deleteTarget) deleteCampaign(deleteTarget.id);
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
        <Button onClick={openCreate} className="bg-gradient-primary text-primary-foreground w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-1" /> สร้าง Campaign
        </Button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Active Campaigns" value={activeCnt}          icon={Calendar}  color="text-emerald-400" />
        <StatCard label="Reach รวม"        value={fmtNum(totalReach)} icon={TrendingUp} color="text-sky-400"     />
        <StatCard label="Leads รวม"        value={fmtNum(totalLeads)} icon={Users2}    color="text-purple-400"  />
      </div>

      {/* ── Filter bar ── */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="ค้นหาชื่อ, ID, ช่องทาง…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as "All" | CampaignStatus)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="All">ทุกสถานะ</option>
          {CAMPAIGN_STATUS_LIST.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* ── Table ── */}
      <div className="bg-card rounded-xl border shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left w-24">ID</th>
                <th className="px-4 py-3 text-left min-w-[180px]">ชื่อแคมเปญ</th>
                <th className="px-4 py-3 text-left">ช่องทาง</th>
                <th className="px-4 py-3 text-left">ช่วงเวลา</th>
                <th className="px-4 py-3 text-right">Reach</th>
                <th className="px-4 py-3 text-right">Leads</th>
                <th className="px-4 py-3 text-right">งบ (บาท)</th>
                <th className="px-4 py-3 text-center w-36">สถานะ</th>
                <th className="px-4 py-3 text-center w-20">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                    <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>{search || filterStatus !== "All" ? "ไม่พบแคมเปญที่ตรงกับเงื่อนไข" : "ยังไม่มีแคมเปญ กด + สร้าง Campaign เลย"}</p>
                  </td>
                </tr>
              )}
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{c.campaign_id}</td>
                  <td className="px-4 py-3 font-semibold">{c.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.channels.map((ch) => (
                        <span key={ch} className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{ch}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {fmtPeriod(c.start_date, c.end_date)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmtNum(c.reach)}</td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums">{fmtNum(c.leads)}</td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                    {c.budget !== undefined ? fmtNum(c.budget) : "-"}
                  </td>

                  {/* Inline status dropdown */}
                  <td className="px-4 py-3 text-center">
                    <div className="relative inline-block">
                      <select
                        value={c.status}
                        onChange={(e) => handleInlineStatus(c.id, e.target.value as CampaignStatus)}
                        className={`appearance-none text-xs font-medium pl-5 pr-5 py-1 rounded-full border cursor-pointer focus:outline-none transition-colors ${STATUS_CFG[c.status].cls} bg-transparent`}
                        style={{ backgroundImage: "none" }}
                      >
                        {CAMPAIGN_STATUS_LIST.map((s) => (
                          <option key={s} value={s} className="bg-background text-foreground">{s}</option>
                        ))}
                      </select>
                      <span className={`pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full ${STATUS_CFG[c.status].dot}`} />
                      <ChevronDown className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 opacity-60" />
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => openEdit(c)}
                        className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        title="แก้ไข"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(c)}
                        className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                        title="ลบ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-4 py-2 border-t text-xs text-muted-foreground">
            แสดง {filtered.length} จาก {campaigns.length} แคมเปญ
          </div>
        )}
      </div>

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

            {/* Reach + Leads */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="camp-reach">Reach</Label>
                <Input
                  id="camp-reach"
                  type="number"
                  min="0"
                  value={form.reach}
                  onChange={(e) => setForm((f) => ({ ...f, reach: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="camp-leads">Leads</Label>
                <Input
                  id="camp-leads"
                  type="number"
                  min="0"
                  value={form.leads}
                  onChange={(e) => setForm((f) => ({ ...f, leads: e.target.value }))}
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
              <p className="text-xs text-destructive">{formErr}</p>
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
