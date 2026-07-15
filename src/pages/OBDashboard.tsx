/**
 * OBDashboard.tsx — OB Team Daily Operations Dashboard
 *
 * ใช้สำหรับ: OB Co-ordinator + OB Manager
 * แนวคิด: ทีม OB เห็นข้อมูลเดียวกันทั้งหมด ไม่แบ่งรายคน
 *
 * Zone 1 — Monthly Pulse   : เป้า / ปิดได้ / Pipeline / Follow-up วันนี้
 * Zone 2 — Action List     : Follow-up เกินกำหนด + วันนี้ + Hot
 * Zone 3 — Pipeline Funnel : New → Contacted → Quotation → Negotiating → Won
 * Zone 4 — At-Risk Deals   : ดีลที่ไม่มีการติดต่อ > 7 วัน
 * Zone 5 — Recent Closings : ปิดดีลล่าสุดเดือนนี้
 */

import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Target, Users, Phone, AlertTriangle, CheckCircle2, Clock,
  ArrowRight, TrendingUp, Flame, CalendarDays, Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCRM, formatTHB, isClosedStatus, isLostStatus } from "@/store/crmStore";
import { useCurrentUser, useActiveOBNames } from "@/store/authStore";

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function prevMonthKey() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function thaiShortDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  const TH_MONTH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  return `${d.getDate()} ${TH_MONTH[d.getMonth()]}`;
}

function daysDiff(isoDate: string) {
  const now = Date.now();
  const then = new Date(isoDate + "T00:00:00").getTime();
  return Math.floor((now - then) / 86_400_000);
}

function pct(a: number, b: number) {
  if (!b) return 0;
  return Math.min(100, Math.round((a / b) * 100));
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PulseCard({
  icon: Icon, label, value, sub, color, progress,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  progress?: number; // 0-100
}) {
  return (
    <div className="bg-card rounded-xl border shadow-sm p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
      </div>
      <p className="text-2xl font-bold leading-tight">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
      {progress !== undefined && (
        <div className="w-full bg-muted/60 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all ${
              progress >= 100 ? "bg-emerald-500" : progress >= 70 ? "bg-amber-500" : "bg-red-500"
            }`}
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      )}
    </div>
  );
}

function SectionHeader({
  icon: Icon, title, sub, linkTo,
}: {
  icon: React.ElementType; title: string; sub?: string; linkTo?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-teal-500" />
        <h2 className="font-bold text-sm">{title}</h2>
        {sub && <span className="text-xs text-muted-foreground">({sub})</span>}
      </div>
      {linkTo && (
        <Link to={linkTo}>
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1">
            ดูทั้งหมด <ArrowRight className="w-3 h-3" />
          </Button>
        </Link>
      )}
    </div>
  );
}

function FunnelBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const width = total > 0 ? Math.max(4, Math.round((count / total) * 100)) : 4;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-28 shrink-0 text-right">{label}</span>
      <div className="flex-1 bg-muted/40 rounded-full h-6 overflow-hidden">
        <div
          className={`h-full ${color} rounded-full flex items-center px-2 transition-all`}
          style={{ width: `${width}%` }}
        >
          {count > 0 && <span className="text-[10px] font-bold text-white whitespace-nowrap">{count}</span>}
        </div>
      </div>
      <span className="text-xs font-semibold w-8 text-right">{count}</span>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function OBDashboard() {
  const user     = useCurrentUser();
  const obNames  = useActiveOBNames();
  const allLeads = useCRM((s) => s.leads);
  const targets  = useCRM((s) => s.targets);

  const today    = todayStr();
  const thisMonth = currentMonthKey();
  const lastMonth = prevMonthKey();

  const obSet = useMemo(() => new Set(obNames), [obNames]);

  // ── OB Pool: leads where assigned_to is an OB Co-ordinator ──────────────────
  const obLeads = useMemo(
    () => allLeads.filter((l) => obSet.has(l.assigned_to)),
    [allLeads, obSet],
  );

  const activeLeads = useMemo(
    () => obLeads.filter((l) => !isClosedStatus(l.status) && !isLostStatus(l.status)),
    [obLeads],
  );

  const wonThisMonth = useMemo(
    () => obLeads.filter((l) => isClosedStatus(l.status) && (l.closed_date ?? "").startsWith(thisMonth)),
    [obLeads, thisMonth],
  );

  const wonLastMonth = useMemo(
    () => obLeads.filter((l) => isClosedStatus(l.status) && (l.closed_date ?? "").startsWith(lastMonth)),
    [obLeads, lastMonth],
  );

  const wonRevenue  = useMemo(() => wonThisMonth.reduce((s, l) => s + (l.quoted_price || 0), 0), [wonThisMonth]);
  const wonPax      = useMemo(() => wonThisMonth.reduce((s, l) => s + (l.pax_count || 0), 0), [wonThisMonth]);
  const _lastRevenue = useMemo(() => wonLastMonth.reduce((s, l) => s + (l.quoted_price || 0), 0), [wonLastMonth]);

  // ── Team target this month (sum of all OB Co-ordinator targets) ──────────────
  const teamTarget = useMemo(
    () =>
      targets
        .filter((t) => t.month === thisMonth && obSet.has(t.rep))
        .reduce((s, t) => s + t.domestic_sales + t.international_sales, 0),
    [targets, thisMonth, obSet],
  );

  const achievement = pct(wonRevenue, teamTarget);

  // ── Follow-up ──────────────────────────────────────────────────────────────
  const overdueLeads = useMemo(
    () => activeLeads.filter((l) => l.next_followup_date && l.next_followup_date < today).sort(
      (a, b) => (a.next_followup_date ?? "").localeCompare(b.next_followup_date ?? ""),
    ),
    [activeLeads, today],
  );

  const todayLeads = useMemo(
    () => activeLeads.filter((l) => l.next_followup_date === today),
    [activeLeads, today],
  );

  const hotLeads = useMemo(
    () =>
      activeLeads
        .filter(
          (l) =>
            (l.status === "Negotiating" || l.status === "กำลังเจรจา" || l.status === "Quotation Sent") &&
            (!l.next_followup_date || l.next_followup_date >= today),
        )
        .slice(0, 5),
    [activeLeads, today],
  );

  // ── At-Risk: active leads with no follow-up or overdue > 7 days ─────────────
  const atRiskLeads = useMemo(
    () =>
      activeLeads
        .filter(
          (l) =>
            !l.next_followup_date ||
            daysDiff(l.next_followup_date) > 7,
        )
        .sort((a, b) => {
          const da = a.next_followup_date ? daysDiff(a.next_followup_date) : 999;
          const db = b.next_followup_date ? daysDiff(b.next_followup_date) : 999;
          return db - da;
        })
        .slice(0, 8),
    [activeLeads, today],
  );

  // ── Pipeline Funnel counts ───────────────────────────────────────────────────
  const funnelCounts = useMemo(() => {
    const counts = { new: 0, contacted: 0, quotation: 0, negotiating: 0, won: 0 };
    obLeads.forEach((l) => {
      if (l.status === "New")                                 counts.new++;
      else if (l.status === "Contacted" || l.status === "ตอบแล้ว") counts.contacted++;
      else if (l.status === "Quotation Sent")                 counts.quotation++;
      else if (l.status === "Negotiating" || l.status === "กำลังเจรจา") counts.negotiating++;
      else if (isClosedStatus(l.status))                      counts.won++;
    });
    return counts;
  }, [obLeads]);

  const funnelMax = Math.max(1, funnelCounts.new, funnelCounts.contacted, funnelCounts.quotation, funnelCounts.negotiating, funnelCounts.won);

  // ── Recent closings ──────────────────────────────────────────────────────────
  const recentWon = useMemo(
    () =>
      obLeads
        .filter((l) => isClosedStatus(l.status) && l.closed_date)
        .sort((a, b) => (b.closed_date ?? "").localeCompare(a.closed_date ?? ""))
        .slice(0, 8),
    [obLeads],
  );

  // ── Render ────────────────────────────────────────────────────────────────────
  const isOBManager = user?.role === "OB Manager";

  return (
    <div className="p-4 sm:p-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-md">
          <Target className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold">OB Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("th-TH", { month: "long", year: "numeric" })} · ทีม OB {obNames.length} คน
          </p>
        </div>
        {isOBManager && (
          <Link to="/app/executive" className="ml-auto">
            <Button variant="outline" size="sm" className="gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Executive View
            </Button>
          </Link>
        )}
      </div>

      {/* ── Zone 1: Monthly Pulse ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <PulseCard
          icon={Target}
          label="เป้าทีมเดือนนี้"
          value={teamTarget > 0 ? formatTHB(teamTarget) : "ยังไม่ตั้งเป้า"}
          sub={teamTarget > 0 ? `${wonPax} / ${targets.filter(t => t.month === thisMonth && obSet.has(t.rep)).reduce((s, t) => s + t.domestic_pax + t.international_pax, 0)} ท่าน` : undefined}
          color="bg-teal-500/15 text-teal-600"
        />
        <PulseCard
          icon={Award}
          label="ยอดปิดได้แล้ว"
          value={formatTHB(wonRevenue)}
          sub={teamTarget > 0 ? `${achievement}% ของเป้า · ${wonThisMonth.length} ดีล` : `${wonThisMonth.length} ดีล`}
          color={achievement >= 100 ? "bg-emerald-500/15 text-emerald-600" : achievement >= 70 ? "bg-amber-500/15 text-amber-600" : "bg-red-500/15 text-red-600"}
          progress={teamTarget > 0 ? achievement : undefined}
        />
        <PulseCard
          icon={TrendingUp}
          label="Pipeline ที่มีอยู่"
          value={activeLeads.length + " ดีล"}
          sub={`มูลค่า ${formatTHB(activeLeads.reduce((s, l) => s + (l.quoted_price || 0), 0))}`}
          color="bg-blue-500/15 text-blue-600"
        />
        <PulseCard
          icon={Phone}
          label="Follow-up วันนี้"
          value={todayLeads.length + overdueLeads.length}
          sub={overdueLeads.length > 0 ? `⚠️ เกินกำหนด ${overdueLeads.length} ราย` : "ไม่มีที่เกินกำหนด"}
          color={overdueLeads.length > 0 ? "bg-red-500/15 text-red-600" : "bg-teal-500/15 text-teal-600"}
        />
      </div>

      {/* ── Zone 2 + 3: Action List & Funnel ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Action List */}
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b">
            <SectionHeader icon={CalendarDays} title="วันนี้ต้องทำอะไร" linkTo="/app/followup" />
          </div>
          <div className="divide-y divide-border/60 max-h-72 overflow-y-auto">
            {overdueLeads.length === 0 && todayLeads.length === 0 && hotLeads.length === 0 && (
              <div className="py-8 text-center text-muted-foreground text-sm">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400/60" />
                ไม่มีรายการที่ต้องทำวันนี้ 🎉
              </div>
            )}
            {overdueLeads.map((l) => (
              <div key={l.lead_id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30">
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold truncate">{l.customer_name}</p>
                  <p className="text-[10px] text-muted-foreground">{l.bu_type} · {l.pax_count} ท่าน</p>
                </div>
                <Badge variant="outline" className="text-[10px] border-red-300 text-red-600 shrink-0">
                  เกิน {daysDiff(l.next_followup_date!)} วัน
                </Badge>
              </div>
            ))}
            {todayLeads.map((l) => (
              <div key={l.lead_id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold truncate">{l.customer_name}</p>
                  <p className="text-[10px] text-muted-foreground">{l.bu_type} · {l.pax_count} ท่าน</p>
                </div>
                <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-600 shrink-0">วันนี้</Badge>
              </div>
            ))}
            {hotLeads.map((l) => (
              <div key={l.lead_id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold truncate">{l.customer_name}</p>
                  <p className="text-[10px] text-muted-foreground">{l.status} · {formatTHB(l.quoted_price || 0)}</p>
                </div>
                <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-600 shrink-0">Hot</Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Pipeline Funnel */}
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b">
            <SectionHeader icon={TrendingUp} title="Pipeline Funnel" sub={`${obLeads.length} leads ทั้งหมด`} />
          </div>
          <div className="px-4 py-4 space-y-3">
            <FunnelBar label="🆕 New"             count={funnelCounts.new}         total={funnelMax} color="bg-slate-400"   />
            <FunnelBar label="📞 Contacted"        count={funnelCounts.contacted}   total={funnelMax} color="bg-blue-400"    />
            <FunnelBar label="📄 Quotation"        count={funnelCounts.quotation}   total={funnelMax} color="bg-violet-500"  />
            <FunnelBar label="🤝 Negotiating"      count={funnelCounts.negotiating} total={funnelMax} color="bg-amber-500"   />
            <FunnelBar label="✅ Won"               count={funnelCounts.won}         total={funnelMax} color="bg-emerald-500" />
            <div className="pt-2 border-t border-border/50 flex justify-between text-[11px] text-muted-foreground">
              <span>Conversion: {pct(funnelCounts.won, obLeads.length)}%</span>
              <span>Active: {activeLeads.length} ดีล · มูลค่า {formatTHB(activeLeads.reduce((s,l)=>s+(l.quoted_price||0),0))}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Zone 4: At-Risk ── */}
      {atRiskLeads.length > 0 && (
        <div className="bg-card rounded-xl border border-amber-200/60 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-amber-200/60 bg-amber-50/50 dark:bg-amber-500/5">
            <SectionHeader icon={AlertTriangle} title="⚠️ ดีลเสี่ยงหลุด" sub={`ไม่มีการติดต่อ > 7 วัน · ${atRiskLeads.length} รายการ`} linkTo="/app/followup" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-muted-foreground text-xs">
                <tr>
                  <th className="px-4 py-2 text-left">ลูกค้า</th>
                  <th className="px-4 py-2 text-left">ประเภท</th>
                  <th className="px-4 py-2 text-right">Pax</th>
                  <th className="px-4 py-2 text-right">มูลค่า</th>
                  <th className="px-4 py-2 text-center">นัดล่าสุด</th>
                  <th className="px-4 py-2 text-center">ขาดติดต่อ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {atRiskLeads.map((l) => {
                  const daysAgo = l.next_followup_date ? daysDiff(l.next_followup_date) : null;
                  return (
                    <tr key={l.lead_id} className="hover:bg-muted/30">
                      <td className="px-4 py-2.5 font-medium">{l.customer_name}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{l.bu_type}</td>
                      <td className="px-4 py-2.5 text-right text-xs">{l.pax_count} ท่าน</td>
                      <td className="px-4 py-2.5 text-right text-xs font-semibold">{formatTHB(l.quoted_price || 0)}</td>
                      <td className="px-4 py-2.5 text-center text-xs text-muted-foreground">
                        {l.next_followup_date ? thaiShortDate(l.next_followup_date) : "-"}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            !daysAgo ? "border-slate-300 text-slate-500" :
                            daysAgo > 14 ? "border-red-300 text-red-600 bg-red-50 dark:bg-red-500/10" :
                            "border-amber-300 text-amber-600"
                          }`}
                        >
                          {daysAgo != null ? `${daysAgo} วัน` : "ไม่มีนัด"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Zone 5: Recent Closings ── */}
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b">
          <SectionHeader icon={Award} title="✅ ปิดดีลล่าสุด" sub={`${wonThisMonth.length} ดีลเดือนนี้`} linkTo="/app/pipeline" />
        </div>
        {recentWon.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            <Flame className="w-8 h-8 mx-auto mb-2 opacity-30" />
            ยังไม่มีดีลที่ปิดได้ — เดินหน้าต่อ!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-muted-foreground text-xs">
                <tr>
                  <th className="px-4 py-2 text-left">ลูกค้า</th>
                  <th className="px-4 py-2 text-left">ประเภท</th>
                  <th className="px-4 py-2 text-right">Pax</th>
                  <th className="px-4 py-2 text-right">ยอดขาย</th>
                  <th className="px-4 py-2 text-center">วันปิด</th>
                  <th className="px-4 py-2 text-center">เดือน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {recentWon.map((l) => (
                  <tr key={l.lead_id} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-medium">{l.customer_name}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{l.bu_type}</td>
                    <td className="px-4 py-2.5 text-right text-xs">{l.pax_count} ท่าน</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-emerald-600">{formatTHB(l.quoted_price || 0)}</td>
                    <td className="px-4 py-2.5 text-center text-xs text-muted-foreground">
                      {l.closed_date ? thaiShortDate(l.closed_date) : "-"}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          l.closed_date?.startsWith(thisMonth)
                            ? "border-emerald-300 text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10"
                            : "border-border text-muted-foreground"
                        }`}
                      >
                        {l.closed_date?.startsWith(thisMonth) ? "เดือนนี้" : l.closed_date?.slice(0, 7) ?? "-"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
