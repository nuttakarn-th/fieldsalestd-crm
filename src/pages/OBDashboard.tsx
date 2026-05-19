/**
 * OBDashboard.tsx
 * แดชบอร์ดเฉพาะ OB Co-ordinator:
 * 1. Service & Stock Overview — ที่นั่งคงเหลือ
 * 2. My Pipeline — สรุป Lead ของตัวเอง
 * 3. Overdue / Today Follow-ups
 * 4. Recent Customers
 */
import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  PackageSearch, KanbanSquare, CalendarDays, Users,
  AlertCircle, CheckCircle2, Clock, ArrowRight, TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCRM, formatTHB } from "@/store/crmStore";
import { useServices } from "@/store/serviceStore";
import { useCurrentUser } from "@/store/authStore";

// ─── helpers ─────────────────────────────────────────────────────────────────
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-card rounded-xl border shadow-sm p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold leading-tight truncate">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function OBDashboard() {
  const user = useCurrentUser();
  const me = user?.full_name ?? "";

  const leads     = useCRM((s) => s.leads);
  const customers = useCRM((s) => s.customers);
  const tours     = useServices((s) => s.tours);
  const todayStr  = today();

  // ── My Leads ────────────────────────────────────────────────────────────
  const myLeads = useMemo(
    () => leads.filter((l) => l.assigned_to === me),
    [leads, me]
  );

  const activeLeads = useMemo(
    () => myLeads.filter((l) => !["Closed Won", "Closed Lost"].includes(l.status)),
    [myLeads]
  );

  const pipelineValue = useMemo(
    () => activeLeads.reduce((s, l) => s + (l.quoted_price || 0), 0),
    [activeLeads]
  );

  const wonLeads = useMemo(
    () => myLeads.filter((l) => l.status === "Closed Won"),
    [myLeads]
  );

  const wonRevenue = useMemo(
    () => wonLeads.reduce((s, l) => s + (l.quoted_price || 0), 0),
    [wonLeads]
  );

  // ── Follow-ups ──────────────────────────────────────────────────────────
  const overdueFollowups = useMemo(
    () =>
      activeLeads.filter(
        (l) => l.next_followup_date && l.next_followup_date < todayStr
      ),
    [activeLeads, todayStr]
  );

  const todayFollowups = useMemo(
    () =>
      activeLeads.filter((l) => l.next_followup_date === todayStr),
    [activeLeads, todayStr]
  );

  const upcomingFollowups = useMemo(
    () =>
      activeLeads
        .filter((l) => l.next_followup_date && l.next_followup_date > todayStr)
        .sort((a, b) => (a.next_followup_date ?? "").localeCompare(b.next_followup_date ?? ""))
        .slice(0, 5),
    [activeLeads, todayStr]
  );

  // ── My Recent Customers ─────────────────────────────────────────────────
  const myCustomers = useMemo(
    () =>
      customers
        .filter((c) => c.created_by === me)
        .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
        .slice(0, 6),
    [customers, me]
  );

  // ── Service Stock (tours only, show low-quota first) ─────────────────
  const tourStock = useMemo(
    () =>
      [...tours]
        .sort((a, b) => {
          const aPct = a.total_seats > 0 ? a.quota / a.total_seats : 1;
          const bPct = b.total_seats > 0 ? b.quota / b.total_seats : 1;
          return aPct - bPct;
        })
        .slice(0, 8),
    [tours]
  );

  const cust = (id: string) => customers.find((c) => c.customer_id === id);

  // ── Pipeline by status ──────────────────────────────────────────────────
  const STATUSES = ["New", "Contacted", "Qualified", "Proposal", "Negotiation"] as const;
  const pipelineByStatus = STATUSES.map((s) => ({
    status: s,
    count: activeLeads.filter((l) => l.status === s).length,
  }));

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">OB Co-ordinator Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            สวัสดีคุณ <span className="font-semibold text-foreground">{me}</span> — ภาพรวมงานของคุณวันนี้
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to="/app/followup">
            <Button variant="outline" size="sm">
              <CalendarDays className="w-4 h-4 mr-1.5" /> Follow-up
            </Button>
          </Link>
          <Link to="/app/pipeline">
            <Button variant="outline" size="sm">
              <KanbanSquare className="w-4 h-4 mr-1.5" /> Pipeline
            </Button>
          </Link>
          <Link to="/service-stock">
            <Button variant="outline" size="sm">
              <PackageSearch className="w-4 h-4 mr-1.5" /> Service & Stock
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Users}       label="Lead ทั้งหมด"          value={myLeads.length}         color="bg-primary/10 text-primary" />
        <StatCard icon={KanbanSquare} label="Active Pipeline"       value={activeLeads.length}     sub={formatTHB(pipelineValue)} color="bg-amber-100 text-amber-600" />
        <StatCard icon={TrendingUp}  label="ปิดการขายสำเร็จ"       value={wonLeads.length}         sub={formatTHB(wonRevenue)} color="bg-emerald-100 text-emerald-600" />
        <StatCard icon={AlertCircle} label="Follow-up เกินกำหนด"   value={overdueFollowups.length} color="bg-red-100 text-red-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── Follow-up Section ─────────────────────────────── */}
        <div className="space-y-4">
          {/* Overdue */}
          {overdueFollowups.length > 0 && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-red-700 dark:text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  เกินกำหนด ({overdueFollowups.length})
                </h3>
                <Link to="/app/followup">
                  <Button size="sm" variant="ghost" className="text-red-600 h-7 text-xs">ดูทั้งหมด <ArrowRight className="w-3 h-3 ml-1" /></Button>
                </Link>
              </div>
              <div className="space-y-1.5">
                {overdueFollowups.slice(0, 4).map((l) => {
                  const c = cust(l.customer_id);
                  return (
                    <div key={l.lead_id} className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                      <span className="font-medium truncate">{c?.full_name ?? "—"}</span>
                      <span className="text-muted-foreground text-xs ml-auto shrink-0">{l.next_followup_date}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Today */}
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b bg-amber-50/50 dark:bg-amber-950/20 flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                นัด Follow-up วันนี้ ({todayFollowups.length})
              </h3>
            </div>
            {todayFollowups.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground text-center">ไม่มีนัดวันนี้ 🎉</p>
            ) : (
              <ul className="divide-y">
                {todayFollowups.map((l) => {
                  const c = cust(l.customer_id);
                  return (
                    <li key={l.lead_id} className="px-4 py-2.5 flex items-center gap-2 hover:bg-muted/30">
                      <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{c?.full_name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{l.bu_type} · {l.urgency}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">{l.status}</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Upcoming */}
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" />
                นัดที่กำลังจะมาถึง
              </h3>
              <Link to="/app/followup">
                <Button size="sm" variant="ghost" className="h-7 text-xs">ดูทั้งหมด <ArrowRight className="w-3 h-3 ml-1" /></Button>
              </Link>
            </div>
            {upcomingFollowups.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground text-center">ยังไม่มีนัดที่กำลังจะมาถึง</p>
            ) : (
              <ul className="divide-y">
                {upcomingFollowups.map((l) => {
                  const c = cust(l.customer_id);
                  return (
                    <li key={l.lead_id} className="px-4 py-2.5 flex items-center gap-2 hover:bg-muted/30">
                      <div className="w-8 text-center">
                        <p className="text-[10px] text-muted-foreground leading-none">
                          {l.next_followup_date?.slice(5) ?? "—"}
                        </p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{c?.full_name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{l.bu_type}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">{l.urgency}</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* ── Right Column ──────────────────────────────────── */}
        <div className="space-y-4">
          {/* Pipeline by status */}
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <KanbanSquare className="w-4 h-4 text-primary" />
                My Pipeline
              </h3>
              <Link to="/app/pipeline">
                <Button size="sm" variant="ghost" className="h-7 text-xs">เปิด Pipeline <ArrowRight className="w-3 h-3 ml-1" /></Button>
              </Link>
            </div>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {pipelineByStatus.map(({ status, count }) => (
                <div key={status} className="bg-muted/40 rounded-lg px-3 py-2 text-center">
                  <p className="text-lg font-bold">{count}</p>
                  <p className="text-[10px] text-muted-foreground">{status}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Service Stock */}
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <PackageSearch className="w-4 h-4 text-primary" />
                Service & Stock Overview
              </h3>
              <Link to="/service-stock">
                <Button size="sm" variant="ghost" className="h-7 text-xs">ดูทั้งหมด <ArrowRight className="w-3 h-3 ml-1" /></Button>
              </Link>
            </div>
            {tourStock.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground text-center">ยังไม่มี Tour ในระบบ</p>
            ) : (
              <ul className="divide-y">
                {tourStock.map((t) => {
                  const pct = t.total_seats > 0 ? Math.round((t.quota / t.total_seats) * 100) : 0;
                  const low = pct < 30;
                  const mid = pct < 60 && pct >= 30;
                  const barColor = low ? "bg-red-500" : mid ? "bg-amber-400" : "bg-emerald-500";
                  return (
                    <li key={t.id} className="px-4 py-2.5 hover:bg-muted/30">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{t.code} — {t.city}</p>
                          <p className="text-[10px] text-muted-foreground">{t.period} · {t.duration}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-xs font-bold ${low ? "text-red-600" : mid ? "text-amber-600" : "text-emerald-600"}`}>
                            {t.quota}/{t.total_seats}
                          </span>
                          <p className="text-[10px] text-muted-foreground">ที่นั่งว่าง</p>
                        </div>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Recent Customers */}
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                ลูกค้าล่าสุดของฉัน
              </h3>
              <Link to="/app/customers">
                <Button size="sm" variant="ghost" className="h-7 text-xs">ดูทั้งหมด <ArrowRight className="w-3 h-3 ml-1" /></Button>
              </Link>
            </div>
            {myCustomers.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground text-center">ยังไม่มีลูกค้า</p>
            ) : (
              <ul className="divide-y">
                {myCustomers.map((c) => (
                  <li key={c.customer_id} className="hover:bg-muted/30">
                    <Link to={`/app/customers/${c.customer_id}`} className="px-4 py-2.5 flex items-center gap-3 block">
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                        {c.full_name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.full_name}</p>
                        <p className="text-[11px] text-muted-foreground">{c.phone || "—"}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">{c.customer_tier}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
