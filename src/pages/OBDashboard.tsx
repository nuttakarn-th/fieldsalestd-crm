/**
 * OBDashboard.tsx — OB Co-ordinator Hub
 * แสดงข้อมูลเฉพาะ Outbound team:
 * 1. KPI: ลูกค้า / Pipeline / Revenue / Overdue
 * 2. Online Channel Breakdown (FB, Line OA, Website, TikTok, Google)
 * 3. Marketing Leads Pool (ยังไม่มีคนรับ)
 * 4. Agent Customers (source = Agent)
 * 5. Follow-up (overdue / today / upcoming)
 * 6. ลูกค้าออนไลน์ล่าสุด
 */
import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Users, KanbanSquare, CalendarDays, AlertCircle, CheckCircle2,
  Clock, ArrowRight, TrendingUp, UserPlus, Handshake, BarChart3,
  Globe, Phone,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCRM, formatTHB } from "@/store/crmStore";
import { useCurrentUser } from "@/store/authStore";
import { useMarketingLeads } from "@/store/marketingLeadsStore";

// ─── helpers ──────────────────────────────────────────────
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const ONLINE_SOURCES = ["FB", "Line OA", "Website", "TikTok", "Google"] as const;
const SOURCE_COLORS: Record<string, string> = {
  "FB":       "bg-blue-500",
  "Line OA":  "bg-green-500",
  "Website":  "bg-purple-500",
  "TikTok":   "bg-pink-500",
  "Google":   "bg-amber-500",
  "Agent":    "bg-teal-500",
  "Referral": "bg-indigo-500",
  "Field Sale": "bg-slate-400",
  "Walk-in":  "bg-orange-400",
};

// ─── Sub-components ────────────────────────────────────────
function StatCard({
  icon: Icon, label, value, sub, color,
}: { icon: React.ElementType; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-card rounded-xl border shadow-sm p-4 flex items-center gap-3">
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

function SectionHeader({ icon: Icon, title, linkTo, linkLabel }: {
  icon: React.ElementType; title: string; linkTo?: string; linkLabel?: string;
}) {
  return (
    <div className="px-4 py-3 border-b flex items-center justify-between">
      <h3 className="font-semibold flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary" />
        {title}
      </h3>
      {linkTo && (
        <Link to={linkTo}>
          <Button size="sm" variant="ghost" className="h-7 text-xs">
            {linkLabel ?? "ดูทั้งหมด"} <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </Link>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────
export default function OBDashboard() {
  const user = useCurrentUser();
  const me   = user?.full_name ?? "";
  const today = todayStr();

  const allLeads     = useCRM((s) => s.leads);
  const allCustomers = useCRM((s) => s.customers);
  const mktLeads     = useMarketingLeads((s) => s.leads);

  // ── OB's own data ──────────────────────────────────────
  const myLeads = useMemo(() => allLeads.filter((l) => l.assigned_to === me), [allLeads, me]);
  const myCustomers = useMemo(() => allCustomers.filter((c) => c.created_by === me), [allCustomers, me]);
  const activeLeads = useMemo(
    () => myLeads.filter((l) => !["Closed Won", "Closed Lost"].includes(l.status)),
    [myLeads],
  );
  const wonLeads = useMemo(() => myLeads.filter((l) => l.status === "Closed Won"), [myLeads]);
  const pipelineValue = useMemo(() => activeLeads.reduce((s, l) => s + (l.quoted_price || 0), 0), [activeLeads]);
  const wonRevenue    = useMemo(() => wonLeads.reduce((s, l) => s + (l.quoted_price || 0), 0), [wonLeads]);

  // ── Follow-ups ─────────────────────────────────────────
  const overdueFollowups = useMemo(
    () => activeLeads.filter((l) => l.next_followup_date && l.next_followup_date < today),
    [activeLeads, today],
  );
  const todayFollowups = useMemo(
    () => activeLeads.filter((l) => l.next_followup_date === today),
    [activeLeads, today],
  );
  const upcomingFollowups = useMemo(
    () =>
      activeLeads
        .filter((l) => l.next_followup_date && l.next_followup_date > today)
        .sort((a, b) => (a.next_followup_date ?? "").localeCompare(b.next_followup_date ?? ""))
        .slice(0, 5),
    [activeLeads, today],
  );

  // ── Source breakdown ───────────────────────────────────
  const sourceBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    myCustomers.forEach((c) => { map[c.source] = (map[c.source] || 0) + 1; });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .map(([source, count]) => ({ source, count }));
  }, [myCustomers]);

  const maxSourceCount = useMemo(
    () => Math.max(1, ...sourceBreakdown.map((s) => s.count)),
    [sourceBreakdown],
  );

  const onlineSourceCount = useMemo(
    () => myCustomers.filter((c) => (ONLINE_SOURCES as readonly string[]).includes(c.source)).length,
    [myCustomers],
  );

  // ── Agent Customers ────────────────────────────────────
  const agentCustomers = useMemo(
    () =>
      myCustomers
        .filter((c) => c.source === "Agent")
        .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
        .slice(0, 8),
    [myCustomers],
  );

  // ── Marketing Leads Pool ───────────────────────────────
  const availableMktLeads = useMemo(() => mktLeads.filter((l) => l.status === "available"), [mktLeads]);
  const recentMktLeads    = useMemo(
    () => [...mktLeads].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5),
    [mktLeads],
  );

  // ── Tier distribution ──────────────────────────────────
  const tierCounts = useMemo(() => {
    const m = { New: 0, Regular: 0, VIP: 0 };
    myCustomers.forEach((c) => { m[c.customer_tier] = (m[c.customer_tier] || 0) + 1; });
    return m;
  }, [myCustomers]);

  const cust = (id: string) => allCustomers.find((c) => c.customer_id === id);

  // ─────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 space-y-6">

      {/* ── Header ───────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Outbound Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            สวัสดีคุณ <span className="font-semibold text-foreground">{me}</span>
            {" "}— ภาพรวม Online Channel & Outbound วันนี้
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to="/app/marketing-leads">
            <Button variant="outline" size="sm">
              <UserPlus className="w-4 h-4 mr-1.5" /> Marketing Leads
            </Button>
          </Link>
          <Link to="/app/followup">
            <Button variant="outline" size="sm">
              <CalendarDays className="w-4 h-4 mr-1.5" /> Follow-up
            </Button>
          </Link>
          <Link to="/app/customers">
            <Button variant="outline" size="sm">
              <Users className="w-4 h-4 mr-1.5" /> ลูกค้าทั้งหมด
            </Button>
          </Link>
        </div>
      </div>

      {/* ── KPI Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Users}       label="ลูกค้า OB ทั้งหมด"    value={myCustomers.length}      sub={`Online ${onlineSourceCount} ราย`}    color="bg-primary/10 text-primary" />
        <StatCard icon={KanbanSquare} label="Active Pipeline"       value={activeLeads.length}      sub={formatTHB(pipelineValue)}              color="bg-amber-100 text-amber-600" />
        <StatCard icon={TrendingUp}  label="ปิดดีลสำเร็จ"          value={wonLeads.length}         sub={formatTHB(wonRevenue)}                 color="bg-emerald-100 text-emerald-600" />
        <StatCard icon={AlertCircle} label="Follow-up เกินกำหนด"   value={overdueFollowups.length}                                             color="bg-red-100 text-red-600" />
      </div>

      {/* ── Row 1: Source Breakdown + Marketing Leads Pool ─ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Online Channel Breakdown */}
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <SectionHeader icon={BarChart3} title="Online Channel Breakdown" />
          <div className="p-4 space-y-2.5">
            {sourceBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">ยังไม่มีข้อมูลลูกค้า</p>
            ) : (
              sourceBreakdown.map(({ source, count }) => {
                const pct = Math.round((count / maxSourceCount) * 100);
                const barColor = SOURCE_COLORS[source] ?? "bg-slate-400";
                const isOnline = (ONLINE_SOURCES as readonly string[]).includes(source);
                return (
                  <div key={source}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${barColor}`} />
                        <span className="text-sm font-medium">{source}</span>
                        {isOnline && (
                          <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full leading-none">Online</span>
                        )}
                      </div>
                      <span className="text-sm font-bold tabular-nums">{count} ราย</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}

            {/* Tier strip */}
            <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-2">
              {(["New", "Regular", "VIP"] as const).map((tier) => {
                const cls = tier === "VIP"
                  ? "text-amber-600 bg-amber-50 dark:bg-amber-950/20"
                  : tier === "Regular"
                  ? "text-sky-600 bg-sky-50 dark:bg-sky-950/20"
                  : "text-slate-600 bg-slate-50 dark:bg-slate-900/30";
                return (
                  <div key={tier} className={`rounded-lg px-2 py-2 text-center ${cls}`}>
                    <p className="text-lg font-bold">{tierCounts[tier]}</p>
                    <p className="text-[10px] font-medium">{tier}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Marketing Leads Pool */}
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-primary" />
              Marketing Leads Pool
              {availableMktLeads.length > 0 && (
                <span className="ml-1 bg-primary text-primary-foreground text-[10px] rounded-full px-1.5 py-0.5 font-bold">
                  {availableMktLeads.length} ใหม่
                </span>
              )}
            </h3>
            <Link to="/app/marketing-leads">
              <Button size="sm" variant="ghost" className="h-7 text-xs">
                จัดการ <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>

          {availableMktLeads.length > 0 && (
            <div className="mx-4 mt-3 mb-1 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-sm font-medium">รอการติดตาม</span>
              </div>
              <span className="text-xl font-bold text-primary">{availableMktLeads.length} lead</span>
            </div>
          )}

          {recentMktLeads.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center py-8">
              ยังไม่มี Marketing Leads
            </p>
          ) : (
            <ul className="divide-y">
              {recentMktLeads.map((l) => (
                <li key={l.id} className="px-4 py-2.5 flex items-center gap-2.5 hover:bg-muted/30">
                  <div className={`w-1.5 h-8 rounded-full shrink-0 ${l.status === "available" ? "bg-primary" : "bg-muted-foreground/30"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{l.name}</p>
                    <p className="text-[11px] text-muted-foreground">{l.source} · {l.interest}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant={l.status === "available" ? "default" : "outline"} className="text-[10px]">
                      {l.status === "available" ? "ว่าง" : (l.claimed_by ?? "รับแล้ว")}
                    </Badge>
                    {l.groupSize && <p className="text-[10px] text-muted-foreground mt-0.5">{l.groupSize} คน</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ── Row 2: Follow-up + Agent Customers ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Follow-up */}
        <div className="space-y-4">
          {overdueFollowups.length > 0 && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-red-700 dark:text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  เกินกำหนด ({overdueFollowups.length})
                </h3>
                <Link to="/app/followup">
                  <Button size="sm" variant="ghost" className="text-red-600 h-7 text-xs">
                    ดูทั้งหมด <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
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

          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b bg-amber-50/50 dark:bg-amber-950/20 flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                Follow-up วันนี้ ({todayFollowups.length})
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

          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <SectionHeader icon={CalendarDays} title="นัดที่กำลังจะมาถึง" linkTo="/app/followup" />
            {upcomingFollowups.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground text-center">ยังไม่มีนัด</p>
            ) : (
              <ul className="divide-y">
                {upcomingFollowups.map((l) => {
                  const c = cust(l.customer_id);
                  return (
                    <li key={l.lead_id} className="px-4 py-2.5 flex items-center gap-2 hover:bg-muted/30">
                      <div className="w-8 text-center shrink-0">
                        <p className="text-[10px] text-muted-foreground">{l.next_followup_date?.slice(5) ?? "—"}</p>
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

        {/* Agent + Online recent */}
        <div className="space-y-4">
          {/* Agent Customers */}
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b bg-teal-50/50 dark:bg-teal-950/20 flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Handshake className="w-4 h-4 text-teal-600" />
                ลูกค้า Agent
                <Badge className="bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300 text-[10px]">
                  {myCustomers.filter((c) => c.source === "Agent").length} ราย
                </Badge>
              </h3>
              <Link to="/app/customers">
                <Button size="sm" variant="ghost" className="h-7 text-xs">
                  ดูทั้งหมด <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
            {agentCustomers.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground space-y-1">
                <Handshake className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                <p>ยังไม่มีลูกค้าจาก Agent</p>
                <p className="text-[11px]">เพิ่มลูกค้าใหม่โดยเลือก Source = Agent</p>
              </div>
            ) : (
              <ul className="divide-y">
                {agentCustomers.map((c) => {
                  const agentActiveLeads = allLeads.filter(
                    (l) => l.customer_id === c.customer_id && !["Closed Won", "Closed Lost"].includes(l.status),
                  );
                  return (
                    <li key={c.customer_id} className="hover:bg-muted/30">
                      <Link to={`/app/customers/${c.customer_id}`} className="px-4 py-2.5 flex items-center gap-3 block">
                        <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 font-bold text-sm flex items-center justify-center shrink-0">
                          {c.full_name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{c.full_name}</p>
                          <p className="text-[11px] text-muted-foreground">{c.company !== "-" ? c.company : c.phone}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <Badge variant="outline" className="text-[10px]">{c.customer_tier}</Badge>
                          {agentActiveLeads.length > 0 && (
                            <p className="text-[10px] text-primary font-medium mt-0.5">{agentActiveLeads.length} lead active</p>
                          )}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Online recent customers */}
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <SectionHeader icon={Globe} title="ลูกค้าออนไลน์ล่าสุด" linkTo="/app/customers" />
            {myCustomers.filter((c) => (ONLINE_SOURCES as readonly string[]).includes(c.source)).length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground text-center">ยังไม่มีลูกค้าออนไลน์</p>
            ) : (
              <ul className="divide-y">
                {myCustomers
                  .filter((c) => (ONLINE_SOURCES as readonly string[]).includes(c.source))
                  .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
                  .slice(0, 6)
                  .map((c) => (
                    <li key={c.customer_id} className="hover:bg-muted/30">
                      <Link to={`/app/customers/${c.customer_id}`} className="px-4 py-2.5 flex items-center gap-3 block">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${SOURCE_COLORS[c.source] ?? "bg-slate-400"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{c.full_name}</p>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <span>{c.source}</span>
                            <span>·</span>
                            <Phone className="w-2.5 h-2.5 inline" />
                            <span>{c.phone}</span>
                          </p>
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
