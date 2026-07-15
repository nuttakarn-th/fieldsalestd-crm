/**
 * OBExecutiveDashboard.tsx — OB Manager Executive View
 *
 * ใช้เฉพาะ role: "OB Manager"
 * Rendered from ExecutiveDashboard.tsx เมื่อตรวจพบ role = "OB Manager"
 *
 * Section 1 — KPI Scorecard    : ยอดขาย / Pax / Achievement% / MoM / YoY
 * Section 2 — Revenue Trend    : 6-month bar chart + target line
 * Section 3 — Revenue by Source: แหล่งที่มา Lead (horizontal bar)
 * Section 4 — Conversion Funnel: New→Won pipeline
 * Section 5 — Top Closings     : ดีลที่ปิดได้ TOP ของเดือน
 */

import { useMemo, useState } from "react";
import {
  Trophy, TrendingUp, TrendingDown, Target, Users2, Award, Minus,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  ComposedChart, Line, Cell,
} from "recharts";
import { useCRM, formatTHB, isClosedStatus, isLostStatus } from "@/store/crmStore";
import { useActiveOBNames } from "@/store/authStore";
import { Badge } from "@/components/ui/badge";

// ── Helpers ───────────────────────────────────────────────────────────────────

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function lastNMonths(n: number) {
  const out: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("th-TH", { month: "short", year: "2-digit" }),
    });
  }
  return out;
}

function pct(a: number, b: number) {
  if (!b) return 0;
  return Math.round((a / b) * 100);
}

function momLabel(current: number, prev: number) {
  if (!prev) return { text: "—", positive: null };
  const diff = Math.round(((current - prev) / prev) * 100);
  return {
    text: diff >= 0 ? `+${diff}%` : `${diff}%`,
    positive: diff >= 0,
  };
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg px-3 py-2 text-xs space-y-1">
      <p className="font-semibold text-foreground">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color || p.fill }}>
          {p.name}: {typeof p.value === "number" && p.value > 1000 ? formatTHB(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KPICard({
  label, value, sub, trend, icon: Icon, color,
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: { text: string; positive: boolean | null };
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-card rounded-xl border shadow-sm p-4 space-y-2">
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
      </div>
      <p className="text-2xl font-bold leading-none">{value}</p>
      {(sub || trend) && (
        <div className="flex items-center gap-2">
          {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
          {trend && (
            <span className={`text-[11px] font-semibold flex items-center gap-0.5 ${
              trend.positive === null ? "text-muted-foreground" :
              trend.positive ? "text-emerald-600" : "text-red-500"
            }`}>
              {trend.positive === true && <TrendingUp className="w-3 h-3" />}
              {trend.positive === false && <TrendingDown className="w-3 h-3" />}
              {trend.positive === null && <Minus className="w-3 h-3" />}
              {trend.text}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Source colors ─────────────────────────────────────────────────────────────

const SOURCE_COLORS: Record<string, string> = {
  "Facebook":    "hsl(213 89% 52%)",
  "LINE OA":     "hsl(142 71% 45%)",
  "Agent":       "hsl(291 64% 42%)",
  "Website":     "hsl(180 72% 38%)",
  "Walk-in":     "hsl(24 95% 53%)",
  "Referral":    "hsl(45 93% 47%)",
  "อื่นๆ":        "hsl(var(--muted-foreground))",
};

function sourceColor(s: string) {
  return SOURCE_COLORS[s] ?? "hsl(var(--muted-foreground))";
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function OBExecutiveDashboard() {
  const allLeads = useCRM((s) => s.leads);
  const targets  = useCRM((s) => s.targets);
  const obNames  = useActiveOBNames();

  const [monthsShown] = useState(6);

  const obSet = useMemo(() => new Set(obNames), [obNames]);
  const thisMonth = currentMonthKey();
  const months6   = useMemo(() => lastNMonths(monthsShown), [monthsShown]);

  const obLeads = useMemo(
    () => allLeads.filter((l) => obSet.has(l.assigned_to)),
    [allLeads, obSet],
  );

  // ── Revenue per month ────────────────────────────────────────────────────────
  const revenueByMonth = useMemo(() => {
    const map = new Map<string, { revenue: number; pax: number }>();
    obLeads.forEach((l) => {
      if (!isClosedStatus(l.status) || !l.closed_date) return;
      const m = l.closed_date.slice(0, 7);
      const cur = map.get(m) ?? { revenue: 0, pax: 0 };
      map.set(m, { revenue: cur.revenue + (l.quoted_price || 0), pax: cur.pax + (l.pax_count || 0) });
    });
    return map;
  }, [obLeads]);

  const targetByMonth = useMemo(() => {
    const map = new Map<string, number>();
    targets
      .filter((t) => obSet.has(t.rep))
      .forEach((t) => {
        const cur = map.get(t.month) ?? 0;
        map.set(t.month, cur + t.domestic_sales + t.international_sales);
      });
    return map;
  }, [targets, obSet]);

  // ── This month KPIs ──────────────────────────────────────────────────────────
  const thisData  = revenueByMonth.get(thisMonth)  ?? { revenue: 0, pax: 0 };
  const lastMonthKey = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, []);
  const lastData  = revenueByMonth.get(lastMonthKey) ?? { revenue: 0, pax: 0 };

  const lastYearMonthKey = useMemo(() => {
    const [y, m] = thisMonth.split("-").map(Number);
    return `${y - 1}-${String(m).padStart(2, "0")}`;
  }, [thisMonth]);
  const lastYearData = revenueByMonth.get(lastYearMonthKey) ?? { revenue: 0, pax: 0 };

  const teamTarget    = targetByMonth.get(thisMonth) ?? 0;
  const achievement   = pct(thisData.revenue, teamTarget);
  const mom           = momLabel(thisData.revenue, lastData.revenue);
  const yoy           = momLabel(thisData.revenue, lastYearData.revenue);

  // ── 6-month trend chart data ─────────────────────────────────────────────────
  const trendData = useMemo(() =>
    months6.map((m) => {
      const d = revenueByMonth.get(m.key) ?? { revenue: 0, pax: 0 };
      const t = targetByMonth.get(m.key) ?? 0;
      return { name: m.label, ยอดขาย: d.revenue, เป้า: t || undefined, Pax: d.pax };
    }),
    [months6, revenueByMonth, targetByMonth],
  );

  // ── Revenue by Source ─────────────────────────────────────────────────────────
  const bySource = useMemo(() => {
    const map = new Map<string, number>();
    obLeads
      .filter((l) => isClosedStatus(l.status))
      .forEach((l) => {
        const src = (l as any).source ?? "อื่นๆ";
        map.set(src, (map.get(src) ?? 0) + (l.quoted_price || 0));
      });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [obLeads]);

  const maxSource = bySource[0]?.value ?? 1;

  // ── Funnel ───────────────────────────────────────────────────────────────────
  const funnel = useMemo(() => {
    const counts = { new: 0, contacted: 0, quotation: 0, negotiating: 0, won: 0, total: 0 };
    obLeads.forEach((l) => {
      counts.total++;
      if (l.status === "New")                                          counts.new++;
      else if (l.status === "Contacted" || l.status === "ตอบแล้ว")   counts.contacted++;
      else if (l.status === "Quotation Sent")                          counts.quotation++;
      else if (l.status === "Negotiating" || l.status === "กำลังเจรจา") counts.negotiating++;
      else if (isClosedStatus(l.status))                               counts.won++;
    });
    return counts;
  }, [obLeads]);

  // ── Top closings ─────────────────────────────────────────────────────────────
  const topWon = useMemo(() =>
    obLeads
      .filter((l) => isClosedStatus(l.status) && l.closed_date?.startsWith(thisMonth))
      .sort((a, b) => (b.quoted_price || 0) - (a.quoted_price || 0))
      .slice(0, 10),
    [obLeads, thisMonth],
  );

  // Deals lost this month (for win rate)
  const lostThisMonth = useMemo(
    () => obLeads.filter((l) => isLostStatus(l.status) && (l.closed_date ?? "").startsWith(thisMonth)),
    [obLeads, thisMonth],
  );
  const winRate = pct(topWon.length, topWon.length + lostThisMonth.length);

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-teal-500 flex items-center justify-center shadow-md">
          <Trophy className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold">OB Executive Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("th-TH", { month: "long", year: "numeric" })} · ทีม OB {obNames.length} คน
          </p>
        </div>
      </div>

      {/* ── Section 1: KPI Scorecard ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KPICard
          icon={Trophy}
          label="ยอดขายเดือนนี้"
          value={formatTHB(thisData.revenue)}
          sub={teamTarget > 0 ? `เป้า ${formatTHB(teamTarget)}` : undefined}
          trend={mom}
          color="bg-purple-500/15 text-purple-600"
        />
        <KPICard
          icon={Users2}
          label="Pax เดือนนี้"
          value={`${thisData.pax} ท่าน`}
          sub={`vs เดือนก่อน ${lastData.pax} ท่าน`}
          trend={momLabel(thisData.pax, lastData.pax)}
          color="bg-blue-500/15 text-blue-600"
        />
        <KPICard
          icon={Target}
          label="Achievement"
          value={teamTarget > 0 ? `${achievement}%` : "—"}
          sub={teamTarget > 0 ? `${topWon.length} ดีล / ${topWon.length + lostThisMonth.length + funnel.new + funnel.contacted + funnel.quotation + funnel.negotiating} ทั้งหมด` : "ยังไม่ตั้งเป้า"}
          color={achievement >= 100 ? "bg-emerald-500/15 text-emerald-600" : achievement >= 70 ? "bg-amber-500/15 text-amber-600" : "bg-red-500/15 text-red-600"}
        />
        <KPICard
          icon={TrendingUp}
          label="เดือนต่อเดือน (MoM)"
          value={mom.text}
          sub={`${formatTHB(lastData.revenue)} → ${formatTHB(thisData.revenue)}`}
          trend={mom}
          color="bg-teal-500/15 text-teal-600"
        />
        <KPICard
          icon={Award}
          label="Win Rate เดือนนี้"
          value={topWon.length + lostThisMonth.length > 0 ? `${winRate}%` : "—"}
          sub={`ปิดได้ ${topWon.length} / ทั้งหมด ${topWon.length + lostThisMonth.length} ดีล`}
          color="bg-amber-500/15 text-amber-600"
        />
      </div>

      {/* ── Section 2: Revenue Trend ── */}
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-purple-500" />
          <h2 className="font-bold text-sm">Revenue Trend 6 เดือน</h2>
        </div>
        <div className="p-4">
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={trendData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis
                tickFormatter={(v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}K` : v}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                width={48}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="ยอดขาย" fill="hsl(262 80% 60%)" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Line
                dataKey="เป้า"
                stroke="hsl(32 95% 55%)"
                strokeWidth={2}
                strokeDasharray="5 3"
                dot={{ fill: "hsl(32 95% 55%)", r: 4 }}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2 justify-center text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block bg-purple-500" /> ยอดขายจริง</span>
            <span className="flex items-center gap-1"><span className="w-4 border-t-2 border-dashed border-amber-500 inline-block" /> เป้าหมาย</span>
          </div>
        </div>
      </div>

      {/* ── Section 3 + 4: Source & Funnel ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Revenue by Source */}
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center gap-2">
            <Award className="w-4 h-4 text-teal-500" />
            <h2 className="font-bold text-sm">ยอดขายแยกตามแหล่ง Lead</h2>
          </div>
          {bySource.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">ยังไม่มีข้อมูล</div>
          ) : (
            <div className="px-4 py-4 space-y-3">
              {bySource.map(({ name, value }) => {
                const w = Math.max(4, Math.round((value / maxSource) * 100));
                return (
                  <div key={name} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-20 shrink-0 text-right truncate">{name}</span>
                    <div className="flex-1 bg-muted/40 rounded-full h-6 overflow-hidden">
                      <div
                        className="h-full rounded-full flex items-center px-2 transition-all"
                        style={{ width: `${w}%`, backgroundColor: sourceColor(name) + "cc" }}
                      >
                        <span className="text-[10px] font-bold text-white whitespace-nowrap">{formatTHB(value)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Conversion Funnel */}
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-500" />
            <h2 className="font-bold text-sm">Conversion Funnel</h2>
            <span className="text-xs text-muted-foreground ml-auto">{funnel.total} leads ทั้งหมด</span>
          </div>
          <div className="px-4 py-4 space-y-2">
            {([
              { key: "new",        label: "🆕 New",          count: funnel.new,         color: "bg-slate-400" },
              { key: "contacted",  label: "📞 Contacted",     count: funnel.contacted,   color: "bg-blue-400"  },
              { key: "quotation",  label: "📄 Quotation",     count: funnel.quotation,   color: "bg-violet-500"},
              { key: "negotiating",label: "🤝 Negotiating",   count: funnel.negotiating, color: "bg-amber-500" },
              { key: "won",        label: "✅ Won (all time)", count: funnel.won,         color: "bg-emerald-500"},
            ] as const).map(({ key, label, count, color }) => {
              const w = funnel.total > 0 ? Math.max(4, Math.round((count / funnel.total) * 100)) : 4;
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-28 shrink-0 text-right">{label}</span>
                  <div className="flex-1 bg-muted/40 rounded-full h-6 overflow-hidden">
                    <div className={`h-full ${color} rounded-full flex items-center px-2`} style={{ width: `${w}%` }}>
                      {count > 0 && <span className="text-[10px] font-bold text-white">{count}</span>}
                    </div>
                  </div>
                  <span className="text-xs font-semibold w-8 text-right">{count}</span>
                </div>
              );
            })}
            <div className="pt-2 border-t border-border/50 flex justify-between text-[11px] text-muted-foreground">
              <span>Win Rate (all time): {pct(funnel.won, funnel.total)}%</span>
              <span>Active: {funnel.new + funnel.contacted + funnel.quotation + funnel.negotiating} ดีล</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 5: Top Closings ── */}
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" />
          <h2 className="font-bold text-sm">Top Closings เดือนนี้</h2>
          <span className="text-xs text-muted-foreground ml-auto">{topWon.length} ดีล · {formatTHB(thisData.revenue)}</span>
        </div>
        {topWon.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">ยังไม่มีดีลที่ปิดได้เดือนนี้</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-muted-foreground text-xs">
                <tr>
                  <th className="px-4 py-2 text-center w-8">#</th>
                  <th className="px-4 py-2 text-left">ลูกค้า</th>
                  <th className="px-4 py-2 text-left">ประเภท</th>
                  <th className="px-4 py-2 text-left">Co-ordinator</th>
                  <th className="px-4 py-2 text-right">Pax</th>
                  <th className="px-4 py-2 text-right">ยอดขาย</th>
                  <th className="px-4 py-2 text-center">วันปิด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {topWon.map((l, i) => (
                  <tr key={l.lead_id} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5 text-center">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : (
                        <span className="text-xs text-muted-foreground">{i + 1}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-medium">{l.customer_name}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{l.bu_type}</td>
                    <td className="px-4 py-2.5 text-xs">
                      <Badge variant="outline" className="text-[10px] border-purple-300 text-purple-600">
                        {l.assigned_to}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs">{l.pax_count} ท่าน</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-emerald-600">
                      {formatTHB(l.quoted_price || 0)}
                    </td>
                    <td className="px-4 py-2.5 text-center text-xs text-muted-foreground">
                      {l.closed_date
                        ? new Date(l.closed_date + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short" })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/20">
                <tr>
                  <td colSpan={4} className="px-4 py-2 text-xs text-muted-foreground font-medium">รวม</td>
                  <td className="px-4 py-2 text-right text-xs font-semibold">
                    {topWon.reduce((s, l) => s + l.pax_count, 0)} ท่าน
                  </td>
                  <td className="px-4 py-2 text-right text-sm font-bold text-emerald-600">
                    {formatTHB(thisData.revenue)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
