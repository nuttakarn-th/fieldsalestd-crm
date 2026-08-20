/**
 * MarketingOBLeads.tsx — OB Leads — Master-Detail layout v3
 *
 * Route: /marketing/ob-leads
 * Layout: Stats row → split pane (list left + detail right)
 *   · Left  — scrollable compact list, fills own height (no page scroll)
 *   · Right — selected lead full detail, uses remaining width
 */

import { useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search, Users2, Phone, Calendar, ChevronRight,
  CheckCircle2, XCircle, Clock, Sparkles,
  Mail, MapPin, User, Star, Banknote, Tag, FileText,
  ExternalLink, MessageCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCRM, isClosedStatus, isLostStatus, type Customer, type Lead } from "@/store/crmStore";
import { useActiveOBNames } from "@/store/authStore";

// ── Helpers ───────────────────────────────────────────────────────────────────

function thaiDate(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso.includes("T") ? iso : iso + "T00:00:00");
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
}
function thaiDateTime(iso?: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
function thaiCurrency(n?: number | null) {
  if (!n) return null;
  return n.toLocaleString("th-TH") + " ฿";
}
function fmtMoney(n: number): string {
  if (!n) return "฿0";
  if (n >= 1_000_000) return `฿${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `฿${Math.round(n / 1_000)}K`;
  return `฿${n.toLocaleString("th-TH")}`;
}

interface StatusMeta {
  label: string;
  color: string;
  bar: string;
  pill: string;
  group: "active" | "won" | "lost";
}

function statusMeta(status: string): StatusMeta {
  switch (status) {
    case "ใหม่":
      return { label: "ใหม่",           color: "text-slate-600",  bar: "bg-slate-400",   pill: "bg-slate-100 text-slate-600 border-slate-200",      group: "active" };
    case "ติดต่อแล้ว":
    case "ตอบแล้ว":
      return { label: "ติดต่อแล้ว",     color: "text-blue-600",   bar: "bg-blue-500",    pill: "bg-blue-100 text-blue-700 border-blue-200",          group: "active" };
    case "ส่ง Quote แล้ว":
      return { label: "ส่ง Quote",      color: "text-violet-600", bar: "bg-violet-500",  pill: "bg-violet-100 text-violet-700 border-violet-200",    group: "active" };
    case "กำลังเจรจา":
      return { label: "กำลังเจรจา",    color: "text-amber-600",  bar: "bg-amber-500",   pill: "bg-amber-100 text-amber-700 border-amber-200",       group: "active" };
    case "จองแล้ว":
      return { label: "จองแล้ว ✓",     color: "text-emerald-600",bar: "bg-emerald-500", pill: "bg-emerald-100 text-emerald-700 border-emerald-200", group: "won"    };
    case "ยกเลิก":
      return { label: "ยกเลิก",        color: "text-red-500",    bar: "bg-red-400",     pill: "bg-red-100 text-red-600 border-red-200",             group: "lost"   };
    default:
      return { label: status,           color: "text-muted-foreground", bar: "bg-muted-foreground", pill: "bg-muted text-muted-foreground border-border", group: "active" };
  }
}

function leadPriority(status: string): number {
  if (status === "กำลังเจรจา")      return 0;
  if (status === "ส่ง Quote แล้ว")   return 1;
  if (status === "ตอบแล้ว" || status === "ติดต่อแล้ว") return 2;
  if (status === "ใหม่")             return 3;
  if (isClosedStatus(status))        return 4;
  if (isLostStatus(status))          return 5;
  return 6;
}

// ── Compact list row ──────────────────────────────────────────────────────────

interface ListRowProps {
  customer: Customer;
  lead?: Lead;
  selected: boolean;
  onClick: () => void;
}

function ListRow({ customer, lead, selected, onClick }: ListRowProps) {
  const meta  = statusMeta(lead?.status ?? "ใหม่");
  const value = lead?.closed_price || lead?.quoted_price;
  return (
    <button
      data-id={customer.customer_id}
      onClick={onClick}
      className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 transition-colors border-b border-border last:border-0 group ${
        selected
          ? "bg-violet-50 dark:bg-violet-900/20"
          : "hover:bg-muted/50"
      }`}
    >
      {/* Status bar */}
      <div className={`w-1 h-8 rounded-full shrink-0 ${meta.bar}`} />

      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-sm font-bold ${
        selected ? "bg-violet-500" : "bg-violet-400/80"
      }`}>
        {customer.full_name.charAt(0)}
      </div>

      {/* Name + status pill + program */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate leading-tight ${selected ? "text-violet-700 dark:text-violet-300" : ""}`}>
          {customer.full_name}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Badge variant="outline" className={`text-[9px] px-1.5 py-0 shrink-0 ${meta.pill}`}>
            {meta.label}
          </Badge>
          <p className="text-[10px] text-muted-foreground truncate leading-tight">
            {lead?.program || lead?.bu_type || customer.phone}
          </p>
        </div>
      </div>

      {/* Deal value */}
      {value ? (
        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0 tabular-nums">
          {fmtMoney(value)}
        </span>
      ) : null}
    </button>
  );
}

// ── Detail info row helper ────────────────────────────────────────────────────

function InfoRow({ icon, label, value, className = "" }: { icon: React.ReactNode; label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-start gap-2.5 ${className}`}>
      <div className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{label}</p>
        <p className="text-sm text-foreground/90 leading-snug">{value}</p>
      </div>
    </div>
  );
}

// ── Right detail panel ────────────────────────────────────────────────────────

interface DetailPanelProps {
  customer: Customer | null;
  lead: Lead | undefined;
  onNavigate: () => void;
}

function DetailPanel({ customer, lead, onNavigate }: DetailPanelProps) {
  if (!customer) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 text-muted-foreground p-8">
        <Users2 className="w-12 h-12 opacity-15" />
        <p className="text-sm">เลือก Lead ทางซ้ายเพื่อดูรายละเอียด</p>
      </div>
    );
  }

  const meta       = statusMeta(lead?.status ?? "ใหม่");
  const value      = lead?.closed_price || lead?.quoted_price;
  const followup   = thaiDate(lead?.next_followup_date);
  const lastContact= thaiDateTime(customer.last_contacted_at);
  const tierColors: Record<string, string> = {
    "Gold":     "bg-amber-100 text-amber-700 border-amber-300",
    "Silver":   "bg-slate-100 text-slate-600 border-slate-300",
    "Bronze":   "bg-orange-100 text-orange-600 border-orange-300",
    "Platinum": "bg-violet-100 text-violet-700 border-violet-300",
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">

      {/* ── Customer header ── */}
      <div className={`px-6 py-5 border-b border-border bg-gradient-to-r from-violet-50/60 to-transparent dark:from-violet-900/20`}>
        <div className="flex items-start gap-4">
          {/* Big avatar */}
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white text-xl font-bold shrink-0 shadow-md">
            {customer.full_name.charAt(0)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold leading-tight">{customer.full_name}</h2>
              <Badge variant="outline" className={`text-[9px] px-2 ${tierColors[customer.customer_tier] ?? "bg-muted text-muted-foreground"}`}>
                <Star className="w-2.5 h-2.5 mr-1" />{customer.customer_tier}
              </Badge>
              <Badge variant="outline" className={`text-[9px] px-2 ${meta.pill}`}>
                {meta.label}
              </Badge>
            </div>
            {customer.company && customer.company !== "-" && (
              <p className="text-sm text-muted-foreground mt-0.5">{customer.company}</p>
            )}
            {lastContact && (
              <p className="text-[11px] text-muted-foreground/70 mt-1">ติดต่อล่าสุด {lastContact}</p>
            )}
          </div>

          {/* Navigate button */}
          <Button
            onClick={onNavigate}
            size="sm"
            variant="outline"
            className="shrink-0 gap-1.5 text-xs border-violet-300 text-violet-600 hover:bg-violet-50"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            โปรไฟล์เต็ม
          </Button>
        </div>
      </div>

      {/* ── Content: 2-column grid ── */}
      <div className="flex-1 p-5 grid grid-cols-1 lg:grid-cols-2 gap-5 content-start">

        {/* ── Contact card ── */}
        <div className="bg-card border rounded-xl p-4 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">ข้อมูลติดต่อ</p>
          <InfoRow icon={<Phone className="w-4 h-4" />} label="เบอร์โทร" value={
            <a href={`tel:${customer.phone}`} className="hover:text-violet-600 transition-colors">{customer.phone}</a>
          } />
          {customer.line_id && customer.line_id !== "-" && (
            <InfoRow icon={<MessageCircle className="w-4 h-4" />} label="LINE ID" value={customer.line_id} />
          )}
          {customer.email && (
            <InfoRow icon={<Mail className="w-4 h-4" />} label="อีเมล" value={customer.email} />
          )}
          {customer.province && (
            <InfoRow icon={<MapPin className="w-4 h-4" />} label="จังหวัด" value={customer.province} />
          )}
          <InfoRow icon={<Tag className="w-4 h-4" />} label="แหล่งที่มา" value={customer.source} />
          <InfoRow icon={<User className="w-4 h-4" />} label="สร้างโดย" value={customer.created_by} />
        </div>

        {/* ── Lead card ── */}
        {lead ? (
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">ข้อมูล Lead ปัจจุบัน</p>
            <InfoRow icon={<Sparkles className="w-4 h-4" />} label="โปรแกรม" value={lead.program || lead.bu_type || "—"} />
            <InfoRow icon={<Users2 className="w-4 h-4" />} label="จำนวน" value={`${lead.pax_count} ท่าน`} />
            {lead.travel_month && (
              <InfoRow icon={<Calendar className="w-4 h-4" />} label="เดือนที่จะเดินทาง" value={lead.travel_month} />
            )}
            <InfoRow icon={<User className="w-4 h-4" />} label="Coordinator" value={lead.assigned_to || "—"} />
            {followup && (
              <InfoRow icon={<Clock className="w-4 h-4" />} label="นัด Follow-up" value={followup} />
            )}
          </div>
        ) : (
          <div className="bg-muted/30 border border-dashed rounded-xl p-4 flex items-center justify-center text-muted-foreground text-sm">
            ยังไม่มี Lead
          </div>
        )}

        {/* ── Value card ── */}
        {value ? (
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200/60 rounded-xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600/80 mb-2">มูลค่า Deal</p>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {thaiCurrency(value)}
            </p>
            {lead?.closed_price && lead.closed_date && (
              <p className="text-[11px] text-emerald-600/70 mt-1">ปิดดีล {thaiDate(lead.closed_date)}</p>
            )}
            {!lead?.closed_price && (
              <p className="text-[11px] text-muted-foreground mt-1">ราคา Quote (ยังไม่ปิด)</p>
            )}
          </div>
        ) : null}

        {/* ── Note card ── */}
        {customer.note && (
          <div className="bg-amber-50/60 dark:bg-amber-900/15 border border-amber-200/60 rounded-xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600/80 mb-2 flex items-center gap-1">
              <FileText className="w-3 h-3" /> บันทึก
            </p>
            <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{customer.note}</p>
          </div>
        )}

        {/* ── History stats ── */}
        <div className="bg-card border rounded-xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">ประวัติลูกค้า</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-violet-600">{customer.total_trips}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">ครั้งที่ซื้อ</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-600">{thaiCurrency(customer.total_spend) || "—"}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">ยอดซื้อรวม</p>
            </div>
          </div>
          {customer.first_contact_date && (
            <p className="text-center text-[11px] text-muted-foreground/60 mt-3 border-t border-border pt-2">
              รู้จักกันตั้งแต่ {thaiDate(customer.first_contact_date)}
            </p>
          )}
        </div>

        {/* ── Interest tags ── */}
        {(customer.interests?.length ?? 0) > 0 && (
          <div className="bg-card border rounded-xl p-4 lg:col-span-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">ความสนใจ</p>
            <div className="flex flex-wrap gap-1.5">
              {customer.interests!.map((tag) => (
                <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 border border-violet-200/60">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function MarketingOBLeads() {
  const navigate  = useNavigate();
  const obNames   = useActiveOBNames();
  const allLeads  = useCRM((s) => s.leads);
  const customers = useCRM((s) => s.customers);

  const [search, setSearch]           = useState("");
  const [statusGroup, setStatusGroup] = useState<"active" | "won" | "lost" | "all">("all");
  const [selectedId, setSelectedId]   = useState<string | null>(null);

  const obSet = useMemo(() => new Set(obNames), [obNames]);

  const obCustomers = useMemo(
    () => customers.filter(
      (c) => obSet.has(c.created_by) || obSet.has(c.transferred_to ?? "") || obSet.has(c.transferred_from ?? ""),
    ),
    [customers, obSet],
  );

  const latestLeadByCustomer = useMemo(() => {
    const map = new Map<string, Lead>();
    allLeads
      .filter((l) => obSet.has(l.assigned_to))
      .forEach((l) => {
        const cur = map.get(l.customer_id);
        if (!cur || leadPriority(l.status) < leadPriority(cur.status)) {
          map.set(l.customer_id, l);
        }
      });
    return map;
  }, [allLeads, obSet]);

  const stats = useMemo(() => {
    const s = { active: 0, won: 0, lost: 0, all: obCustomers.length, wonValue: 0, pipelineValue: 0 };
    obCustomers.forEach((c) => {
      const lead = latestLeadByCustomer.get(c.customer_id);
      const g = statusMeta(lead?.status ?? "ใหม่").group;
      if (g === "active") {
        s.active++;
        if (lead?.quoted_price) s.pipelineValue += lead.quoted_price;
      } else if (g === "won") {
        s.won++;
        s.wonValue += lead?.closed_price || lead?.quoted_price || 0;
      } else if (g === "lost") {
        s.lost++;
      }
    });
    return s;
  }, [obCustomers, latestLeadByCustomer]);

  const filtered = useMemo(() => {
    let list = obCustomers;
    if (statusGroup !== "all") {
      list = list.filter((c) => statusMeta(latestLeadByCustomer.get(c.customer_id)?.status ?? "ใหม่").group === statusGroup);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.full_name.toLowerCase().includes(q) ||
          (c.company ?? "").toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (latestLeadByCustomer.get(c.customer_id)?.program ?? "").toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => {
      const pa = leadPriority(latestLeadByCustomer.get(a.customer_id)?.status ?? "ใหม่");
      const pb = leadPriority(latestLeadByCustomer.get(b.customer_id)?.status ?? "ใหม่");
      if (pa !== pb) return pa - pb;
      return (b.last_contacted_at ?? "").localeCompare(a.last_contacted_at ?? "");
    });
  }, [obCustomers, search, statusGroup, latestLeadByCustomer]);

  // Auto-select first item on load / filter change
  useEffect(() => {
    if (filtered.length > 0) {
      setSelectedId((prev) => {
        // Keep current if still in filtered list
        if (prev && filtered.some((c) => c.customer_id === prev)) return prev;
        return filtered[0].customer_id;
      });
    } else {
      setSelectedId(null);
    }
  }, [filtered]);

  // ── Activity Feed scroll-to highlight ──
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const id = searchParams.get("highlight");
    if (!id) return;
    setSelectedId(id);
    const timer = setTimeout(() => {
      const el = document.querySelector(`[data-id="${id}"]`) as HTMLElement | null;
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("row-highlight");
      setTimeout(() => el.classList.remove("row-highlight"), 2200);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchParams]);

  const selectedCustomer = selectedId ? obCustomers.find((c) => c.customer_id === selectedId) ?? null : null;
  const selectedLead     = selectedId ? latestLeadByCustomer.get(selectedId) : undefined;

  // Filter tab config
  const TABS = [
    { key: "all" as const,    label: "ทั้งหมด",          icon: <Sparkles className="w-3.5 h-3.5" />,     count: stats.all,    activeClass: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
    { key: "active" as const, label: "ดำเนินการ",        icon: <Clock className="w-3.5 h-3.5" />,         count: stats.active, activeClass: "bg-amber-500/10 text-amber-600" },
    { key: "won" as const,    label: "จองแล้ว",          icon: <CheckCircle2 className="w-3.5 h-3.5" />,  count: stats.won,    activeClass: "bg-emerald-500/10 text-emerald-600" },
    { key: "lost" as const,   label: "ยกเลิก",           icon: <XCircle className="w-3.5 h-3.5" />,       count: stats.lost,   activeClass: "bg-red-500/10 text-red-500" },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-4 sm:p-5 gap-3 overflow-hidden">

      {/* ── Header row ── */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-violet-500 flex items-center justify-center shadow-md shrink-0">
          <Users2 className="w-4.5 h-4.5 text-white w-[18px] h-[18px]" />
        </div>
        <div>
          <h1 className="text-lg font-bold leading-tight">OB Leads</h1>
          <p className="text-xs text-muted-foreground">Outbound {obCustomers.length} ราย · ทีม {obNames.length} คน</p>
        </div>

        {/* Filter tabs — inline in header */}
        <div className="ml-auto flex items-center gap-1 bg-muted/50 rounded-xl p-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusGroup(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusGroup === tab.key
                  ? `${tab.activeClass} shadow-sm`
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon}
              {tab.label}
              <span className={`min-w-[18px] h-[18px] rounded-full text-[10px] font-bold flex items-center justify-center px-1 ${
                statusGroup === tab.key ? "bg-current/20" : "bg-muted"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/60">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-[11px] text-muted-foreground">จองแล้ว</span>
          <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">{fmtMoney(stats.wonValue)}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200/60">
          <Banknote className="w-3.5 h-3.5 text-violet-600" />
          <span className="text-[11px] text-muted-foreground">Pipeline</span>
          <span className="text-sm font-bold text-violet-700 dark:text-violet-400 tabular-nums">{fmtMoney(stats.pipelineValue)}</span>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="font-semibold text-amber-600">{stats.active}</span> ดำเนินการ
          <span className="opacity-40">·</span>
          <span className="font-semibold text-red-500">{stats.lost}</span> ยกเลิก
        </div>
      </div>

      {/* ── Split pane ── */}
      <div className="flex gap-3 flex-1 min-h-0 overflow-hidden">

        {/* ── Left: list panel ── */}
        <div className="w-72 shrink-0 flex flex-col bg-card border rounded-xl overflow-hidden shadow-sm">

          {/* Search */}
          <div className="p-2.5 border-b border-border shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="ค้นหา..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>

          {/* Count */}
          <div className="px-3 py-1.5 border-b border-border shrink-0 bg-muted/20">
            <p className="text-[10px] text-muted-foreground font-medium">
              {filtered.length} รายการ
            </p>
          </div>

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                <Users2 className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p>ไม่พบ leads</p>
                {statusGroup !== "all" && (
                  <button onClick={() => setStatusGroup("all")} className="mt-1 text-xs text-violet-500 hover:underline">
                    ดูทั้งหมด →
                  </button>
                )}
              </div>
            ) : (
              filtered.map((c) => (
                <ListRow
                  key={c.customer_id}
                  customer={c}
                  lead={latestLeadByCustomer.get(c.customer_id)}
                  selected={c.customer_id === selectedId}
                  onClick={() => setSelectedId(c.customer_id)}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Right: detail panel ── */}
        <div className="flex-1 bg-card border rounded-xl overflow-hidden shadow-sm flex flex-col">
          <DetailPanel
            customer={selectedCustomer}
            lead={selectedLead}
            onNavigate={() => selectedId && navigate(`/marketing/customers/${selectedId}`)}
          />
        </div>

      </div>
    </div>
  );
}
