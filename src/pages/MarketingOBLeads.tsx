/**
 * MarketingOBLeads.tsx — OB Leads view for Marketing role
 *
 * Route: /marketing/ob-leads
 * Redesign v2: แสดงทุก leads ทันที, pipeline summary bar, table layout
 */

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Users2, Phone, Calendar, ChevronRight,
  TrendingUp, CheckCircle2, XCircle, Clock, Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCRM, isClosedStatus, isLostStatus, type Customer, type Lead } from "@/store/crmStore";
import { useActiveOBNames } from "@/store/authStore";

// ── Helpers ───────────────────────────────────────────────────────────────────

function thaiDate(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso.includes("T") ? iso : iso + "T00:00:00");
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

function thaiCurrency(n?: number | null) {
  if (!n) return null;
  return n.toLocaleString("th-TH") + " ฿";
}

interface StatusMeta {
  label: string;
  color: string;      // text/bg classes for badge
  bar: string;        // bg class for left border bar
  dot: string;
  group: "active" | "won" | "lost";
}

function obStatusMeta(status: string): StatusMeta {
  switch (status) {
    case "ใหม่":
      return { label: "ใหม่",             color: "bg-slate-100 text-slate-600 border-slate-200",      bar: "bg-slate-400",   dot: "bg-slate-400",   group: "active" };
    case "ติดต่อแล้ว":
    case "ตอบแล้ว":
      return { label: "ติดต่อแล้ว",       color: "bg-blue-100 text-blue-700 border-blue-200",          bar: "bg-blue-500",    dot: "bg-blue-500",    group: "active" };
    case "ส่ง Quote แล้ว":
      return { label: "ส่ง Quote",        color: "bg-violet-100 text-violet-700 border-violet-200",    bar: "bg-violet-500",  dot: "bg-violet-500",  group: "active" };
    case "กำลังเจรจา":
      return { label: "กำลังเจรจา",       color: "bg-amber-100 text-amber-700 border-amber-200",       bar: "bg-amber-500",   dot: "bg-amber-500",   group: "active" };
    case "จองแล้ว":
      return { label: "จองแล้ว",          color: "bg-emerald-100 text-emerald-700 border-emerald-200", bar: "bg-emerald-500", dot: "bg-emerald-500", group: "won"    };
    case "ยกเลิก":
      return { label: "ยกเลิก",           color: "bg-red-100 text-red-600 border-red-200",             bar: "bg-red-400",     dot: "bg-red-400",     group: "lost"   };
    default:
      return { label: status,             color: "bg-muted text-muted-foreground border-border",       bar: "bg-muted-foreground", dot: "bg-muted-foreground", group: "active" };
  }
}

function leadPriority(status: string): number {
  if (status === "กำลังเจรจา")    return 0;
  if (status === "ส่ง Quote แล้ว") return 1;
  if (status === "ตอบแล้ว" || status === "ติดต่อแล้ว") return 2;
  if (status === "ใหม่")           return 3;
  if (isClosedStatus(status))      return 4;
  if (isLostStatus(status))        return 5;
  return 6;
}

// ── Status filter tabs ────────────────────────────────────────────────────────

const STATUS_GROUPS = [
  { key: "all",    label: "ทั้งหมด",   icon: null },
  { key: "active", label: "กำลังดำเนินการ", icon: null },
  { key: "won",    label: "จองแล้ว",   icon: null },
  { key: "lost",   label: "ยกเลิก",   icon: null },
] as const;

// ── Pipeline summary stat card ────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number;
  total: number;
  icon: React.ReactNode;
  colorClass: string;
  active: boolean;
  onClick: () => void;
}

function StatCard({ label, value, total, icon, colorClass, active, onClick }: StatCardProps) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <button
      onClick={onClick}
      className={`flex-1 min-w-0 rounded-xl border p-3 text-left transition-all ${
        active
          ? "ring-2 ring-offset-1 ring-violet-400/60 border-violet-300/60 bg-violet-50/60 dark:bg-violet-900/20"
          : "bg-card hover:border-muted-foreground/30 hover:shadow-sm"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${colorClass}`}>
          {icon}
        </div>
        <span className={`text-xl font-bold ${active ? "text-violet-600 dark:text-violet-400" : "text-foreground"}`}>
          {value}
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground font-medium truncate">{label}</p>
      {/* Mini progress bar */}
      <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${colorClass.replace("bg-opacity-", "bg-").split(" ")[0]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </button>
  );
}

// ── Lead row (table-style) ────────────────────────────────────────────────────

interface LeadRowProps {
  customer: Customer;
  lead: Lead | undefined;
  onClick: () => void;
}

function LeadRow({ customer, lead, onClick }: LeadRowProps) {
  const meta = lead ? obStatusMeta(lead.status) : obStatusMeta("ใหม่");
  const date = lead?.next_followup_date ? thaiDate(lead.next_followup_date) : null;
  const value = lead?.closed_price || lead?.quoted_price;

  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors group border-b border-border last:border-0"
    >
      {/* Color bar */}
      <div className={`w-1 h-10 rounded-full shrink-0 ${meta.bar}`} />

      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shrink-0 text-white font-bold text-sm">
        {customer.full_name.charAt(0)}
      </div>

      {/* Name + company */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{customer.full_name}</p>
        <p className="text-[11px] text-muted-foreground truncate">
          {customer.company && customer.company !== "-" ? customer.company : customer.phone}
        </p>
      </div>

      {/* Program */}
      {lead && (
        <div className="hidden sm:block flex-1 min-w-0">
          <p className="text-xs text-foreground/80 truncate font-medium">
            {lead.program || lead.bu_type || "—"}
          </p>
          <p className="text-[11px] text-muted-foreground">{lead.pax_count} ท่าน</p>
        </div>
      )}

      {/* Coordinator */}
      {lead && (
        <div className="hidden md:flex items-center gap-1 text-[11px] text-muted-foreground w-28 shrink-0">
          <Users2 className="w-3 h-3 shrink-0" />
          <span className="truncate">{lead.assigned_to || "—"}</span>
        </div>
      )}

      {/* Follow-up date */}
      <div className="hidden lg:flex items-center gap-1 text-[11px] text-muted-foreground w-20 shrink-0">
        {date ? (
          <>
            <Calendar className="w-3 h-3 shrink-0" />
            <span>{date}</span>
          </>
        ) : (
          <span className="text-muted-foreground/40">—</span>
        )}
      </div>

      {/* Value */}
      {value ? (
        <div className="hidden xl:block text-xs font-semibold text-emerald-600 w-24 text-right shrink-0">
          {thaiCurrency(value)}
        </div>
      ) : (
        <div className="hidden xl:block w-24 shrink-0" />
      )}

      {/* Status badge */}
      <Badge variant="outline" className={`text-[10px] shrink-0 ${meta.color}`}>
        {meta.label}
      </Badge>

      {/* Arrow */}
      <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-violet-500 transition-colors shrink-0" />
    </button>
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

  const obSet = useMemo(() => new Set(obNames), [obNames]);

  // OB customers
  const obCustomers = useMemo(
    () => customers.filter(
      (c) => obSet.has(c.created_by) || obSet.has(c.transferred_to ?? "") || obSet.has(c.transferred_from ?? ""),
    ),
    [customers, obSet],
  );

  // Map: customer_id → most active OB lead
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

  // Stats
  const stats = useMemo(() => {
    const s = { active: 0, won: 0, lost: 0, all: obCustomers.length };
    obCustomers.forEach((c) => {
      const status = latestLeadByCustomer.get(c.customer_id)?.status ?? "ใหม่";
      const g = obStatusMeta(status).group;
      if (g === "active") s.active++;
      else if (g === "won") s.won++;
      else if (g === "lost") s.lost++;
    });
    return s;
  }, [obCustomers, latestLeadByCustomer]);

  // Filtered list
  const filtered = useMemo(() => {
    let list = obCustomers;

    if (statusGroup !== "all") {
      list = list.filter((c) => {
        const lead = latestLeadByCustomer.get(c.customer_id);
        const g = obStatusMeta(lead?.status ?? "ใหม่").group;
        return g === statusGroup;
      });
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
      const la = latestLeadByCustomer.get(a.customer_id);
      const lb = latestLeadByCustomer.get(b.customer_id);
      const pa = leadPriority(la?.status ?? "ใหม่");
      const pb = leadPriority(lb?.status ?? "ใหม่");
      if (pa !== pb) return pa - pb;
      return (b.last_contacted_at ?? "").localeCompare(a.last_contacted_at ?? "");
    });
  }, [obCustomers, search, statusGroup, latestLeadByCustomer]);

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-5xl">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-violet-500 flex items-center justify-center shadow-md shrink-0">
          <Users2 className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold">OB Leads</h1>
          <p className="text-sm text-muted-foreground">
            ลูกค้า Outbound {obCustomers.length} ราย · ทีม {obNames.length} คน
          </p>
        </div>
      </div>

      {/* ── Pipeline summary — คลิกเพื่อ filter ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatCard
          label="ทั้งหมด"
          value={stats.all}
          total={stats.all}
          icon={<Sparkles className="w-4 h-4 text-violet-600" />}
          colorClass="bg-violet-100 text-violet-600 dark:bg-violet-900/30"
          active={statusGroup === "all"}
          onClick={() => setStatusGroup("all")}
        />
        <StatCard
          label="กำลังดำเนินการ"
          value={stats.active}
          total={stats.all}
          icon={<Clock className="w-4 h-4 text-amber-600" />}
          colorClass="bg-amber-100 text-amber-600 dark:bg-amber-900/30"
          active={statusGroup === "active"}
          onClick={() => setStatusGroup("active")}
        />
        <StatCard
          label="จองแล้ว"
          value={stats.won}
          total={stats.all}
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          colorClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30"
          active={statusGroup === "won"}
          onClick={() => setStatusGroup("won")}
        />
        <StatCard
          label="ยกเลิก"
          value={stats.lost}
          total={stats.all}
          icon={<XCircle className="w-4 h-4 text-red-500" />}
          colorClass="bg-red-100 text-red-500 dark:bg-red-900/30"
          active={statusGroup === "lost"}
          onClick={() => setStatusGroup("lost")}
        />
      </div>

      {/* ── Search bar + active filter label ── */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="ค้นหาชื่อ / เบอร์ / โปรแกรม..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
        <p className="text-xs text-muted-foreground ml-auto shrink-0">
          แสดง <span className="font-semibold text-foreground">{filtered.length}</span> / {obCustomers.length} ราย
        </p>
      </div>

      {/* ── Lead list ── */}
      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">

        {/* Column headers (desktop) */}
        <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-muted/40 border-b text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <div className="w-1 shrink-0" />
          <div className="w-9 shrink-0" />
          <div className="flex-1">ลูกค้า</div>
          <div className="flex-1">โปรแกรม</div>
          <div className="hidden md:block w-28">Coordinator</div>
          <div className="hidden lg:block w-20">นัดติดตาม</div>
          <div className="hidden xl:block w-24 text-right">มูลค่า</div>
          <div className="w-20 text-right">สถานะ</div>
          <div className="w-4 shrink-0" />
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">ไม่พบ leads ในกลุ่มนี้</p>
            {statusGroup !== "all" && (
              <button
                onClick={() => setStatusGroup("all")}
                className="mt-2 text-xs text-violet-500 hover:underline"
              >
                ดูทั้งหมด →
              </button>
            )}
          </div>
        ) : (
          <div>
            {filtered.map((c) => (
              <LeadRow
                key={c.customer_id}
                customer={c}
                lead={latestLeadByCustomer.get(c.customer_id)}
                onClick={() => navigate(`/marketing/customers/${c.customer_id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
