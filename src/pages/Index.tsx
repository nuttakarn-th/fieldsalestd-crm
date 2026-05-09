import { useMemo, useState } from "react";
import { Users, KanbanSquare, DollarSign, TrendingUp, Trophy, BarChart3, AlertCircle, Target } from "lucide-react";
import { useCRM, formatTHB, LEAD_STATUSES, LOST_REASONS } from "@/store/crmStore";
import { useActiveSalesNames } from "@/store/authStore";
import { Link } from "react-router-dom";
import { DateRangeFilter, resolveRange, inRange, type RangePreset } from "@/components/DateRangeFilter";
import type { DateRange } from "react-day-picker";

export default function Index() {
  const leads = useCRM((s) => s.leads);
  const customers = useCRM((s) => s.customers);
  const currentRep = useCRM((s) => s.currentRep);
  const targets = useCRM((s) => s.targets);
  const SALES_REPS = useActiveSalesNames();

  const [preset, setPreset] = useState<RangePreset>("month");
  const [custom, setCustom] = useState<DateRange | undefined>();
  const range = useMemo(() => resolveRange(preset, custom), [preset, custom]);

  const repScoped = useMemo(
    () => (currentRep === "All" ? leads : leads.filter((l) => l.assigned_to === currentRep)),
    [leads, currentRep],
  );

  // Apply date range: closed leads use closed_date; active leads use next_followup_date.
  const filtered = useMemo(() => {
    if (!range.from || !range.to) return repScoped;
    return repScoped.filter((l) => {
      const dateStr = l.closed_date ?? l.next_followup_date;
      return inRange(dateStr, range);
    });
  }, [repScoped, range]);

  const metrics = useMemo(() => {
    const won = filtered.filter((l) => l.status === "Closed Won");
    const active = filtered.filter((l) => !["Closed Won", "Closed Lost"].includes(l.status));
    const revenue = won.reduce((s, l) => s + (l.quoted_price || 0), 0);
    const pipeline = active.reduce((s, l) => s + (l.quoted_price || 0), 0);
    const winRate = filtered.length > 0 ? ((won.length / filtered.length) * 100).toFixed(1) : "0";
    const pipelineData = LEAD_STATUSES.map((s) => ({ status: s, count: filtered.filter((l) => l.status === s).length }));
    const lostData = LOST_REASONS.map((r) => ({ reason: r, count: filtered.filter((l) => l.lost_reason === r).length }))
      .sort((a, b) => b.count - a.count);
    return { totalLeads: filtered.length, revenue, pipeline, winRate, pipelineData, lostData };
  }, [filtered]);

  const top5 = useMemo(() =>
    [...filtered].filter((l) => l.status === "Closed Won").sort((a, b) => b.quoted_price - a.quoted_price).slice(0, 5),
  [filtered]);

  const cust = (id: string) => customers.find((c) => c.customer_id === id);

  // Per-rep target progress for current month (shown for individual sales view)
  const monthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const targetBlocks = useMemo(() => {
    const reps = currentRep === "All" ? SALES_REPS : [currentRep];
    return reps.map((rep) => {
      const t = targets.find((x) => x.month === monthKey && x.rep === rep);
      const myWon = leads.filter((l) => l.assigned_to === rep && l.status === "Closed Won" && l.closed_date?.startsWith(monthKey));
      const dom = myWon.filter((l) => l.scope === "Domestic");
      const intl = myWon.filter((l) => l.scope === "International");
      return {
        rep,
        dom_sales: dom.reduce((s, l) => s + l.quoted_price, 0),
        dom_pax: dom.reduce((s, l) => s + l.pax_count, 0),
        intl_sales: intl.reduce((s, l) => s + l.quoted_price, 0),
        intl_pax: intl.reduce((s, l) => s + l.pax_count, 0),
        target: {
          dom_sales: t?.domestic_sales ?? 0, dom_pax: t?.domestic_pax ?? 0,
          intl_sales: t?.international_sales ?? 0, intl_pax: t?.international_pax ?? 0,
        },
      };
    });
  }, [currentRep, leads, targets, monthKey]);

  const cards = [
    { label: "Lead ที่รับผิดชอบ", value: metrics.totalLeads, icon: Users, color: "text-primary bg-primary/10" },
    { label: "มูลค่า Pipeline", value: formatTHB(metrics.pipeline), icon: KanbanSquare, color: "text-warning-foreground bg-warning/20" },
    { label: "ยอดขายสำเร็จ (Won)", value: formatTHB(metrics.revenue), icon: DollarSign, color: "text-success bg-success/15" },
    { label: "Win Rate", value: `${metrics.winRate}%`, icon: TrendingUp, color: "text-accent bg-accent/15" },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">ภาพรวมการขาย (Sales Dashboard)</h1>
          <p className="text-sm text-muted-foreground">
            {currentRep === "All" ? "สรุปประสิทธิภาพของทีมทั้งหมด" : `ผลงานของ: ${currentRep}`} · ช่วง: <span className="font-semibold">{range.label}</span>
          </p>
        </div>
        <DateRangeFilter
          value={preset}
          custom={custom}
          onChange={(p, c) => { setPreset(p); setCustom(c); }}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-card rounded-xl border p-5 shadow-soft flex items-center gap-4">
            <div className={`p-3 rounded-lg ${c.color}`}><c.icon className="w-6 h-6" /></div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-medium">{c.label}</p>
              <p className="text-xl font-bold truncate">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Target progress (current month) */}
      <div className="bg-card rounded-xl border shadow-soft p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="text-accent w-5 h-5" />
            <h3 className="font-bold">เป้าหมายเดือนนี้ ({new Date().toLocaleDateString("th-TH", { month: "long", year: "numeric" })})</h3>
          </div>
          <Link to="/app/targets" className="text-xs text-accent font-semibold hover:underline">ตั้งเป้า →</Link>
        </div>
        <div className="space-y-4">
          {targetBlocks.map((b) => (
            <div key={b.rep} className="space-y-2">
              <p className="text-sm font-semibold">{b.rep}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <ProgressRow label="Domestic — ยอดขาย" value={b.dom_sales} target={b.target.dom_sales} unit="thb" tone="primary" />
                <ProgressRow label="Domestic — Pax" value={b.dom_pax} target={b.target.dom_pax} unit="pax" tone="primary" />
                <ProgressRow label="International — ยอดขาย" value={b.intl_sales} target={b.target.intl_sales} unit="thb" tone="accent" />
                <ProgressRow label="International — Pax" value={b.intl_pax} target={b.target.intl_pax} unit="pax" tone="accent" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-card rounded-xl border shadow-soft p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="text-primary w-5 h-5" />
            <h3 className="font-bold">Sales Pipeline (จำนวน Lead)</h3>
          </div>
          <div className="space-y-3">
            {metrics.pipelineData.map((d) => {
              const max = Math.max(...metrics.pipelineData.map((x) => x.count), 1);
              const pct = (d.count / max) * 100;
              return (
                <div key={d.status} className="flex items-center gap-3">
                  <span className="w-32 text-xs text-muted-foreground truncate">{d.status}</span>
                  <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                    <div
                      className={`h-full transition-all ${d.status === "Closed Won" ? "bg-success" : d.status === "Closed Lost" ? "bg-destructive" : "bg-primary"}`}
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-sm font-bold">{d.count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-card rounded-xl border shadow-soft p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="text-destructive w-5 h-5" />
            <h3 className="font-bold">Lost Reason Analysis</h3>
          </div>
          <div className="space-y-3">
            {metrics.lostData.map((d) => {
              const max = Math.max(...metrics.lostData.map((x) => x.count), 1);
              const pct = (d.count / max) * 100;
              return (
                <div key={d.reason} className="flex items-center gap-3">
                  <span className="w-40 text-xs text-muted-foreground truncate">{d.reason}</span>
                  <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                    <div className="h-full bg-destructive/70" style={{ width: `${Math.max(pct, 2)}%` }} />
                  </div>
                  <span className="w-8 text-right text-sm font-bold">{d.count}</span>
                </div>
              );
            })}
            {metrics.lostData.every((d) => d.count === 0) && (
              <p className="text-sm text-muted-foreground text-center py-6">ยังไม่มีดีลที่เสีย</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border shadow-soft p-5">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="text-accent w-5 h-5" />
          <h3 className="font-bold">Top 5 ปิดการขายสูงสุด</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="p-3 text-center w-16">อันดับ</th>
                <th className="p-3 text-left">ลูกค้า / องค์กร</th>
                <th className="p-3 text-left">โปรแกรม</th>
                <th className="p-3 text-right">มูลค่า</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {top5.map((d, i) => {
                const c = cust(d.customer_id);
                const medal = ["bg-yellow-100 text-yellow-700", "bg-slate-200 text-slate-700", "bg-orange-100 text-orange-700"][i] ?? "text-muted-foreground";
                return (
                  <tr key={d.lead_id} className="hover:bg-muted/30">
                    <td className="p-3 text-center">
                      <span className={`inline-flex w-7 h-7 rounded-full items-center justify-center text-xs font-bold ${medal}`}>{i + 1}</span>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold">{c?.full_name}</div>
                      <div className="text-xs text-muted-foreground">{c?.company !== "-" ? c?.company : "B2C"}</div>
                    </td>
                    <td className="p-3 text-foreground/80 text-xs">{d.program}</td>
                    <td className="p-3 text-right font-bold text-success">{formatTHB(d.quoted_price)}</td>
                  </tr>
                );
              })}
              {top5.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">ยังไม่มีดีลที่ปิดได้</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ProgressRow({ label, value, target, unit, tone }: { label: string; value: number; target: number; unit: "thb" | "pax"; tone: "primary" | "accent" }) {
  const pct = target > 0 ? Math.min((value / target) * 100, 100) : 0;
  const fmt = (n: number) => unit === "thb" ? new Intl.NumberFormat("th-TH").format(n) : `${n}`;
  const bar = tone === "primary" ? "bg-gradient-primary" : "bg-gradient-pink";
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">
          {fmt(value)} <span className="text-muted-foreground">/ {fmt(target)} {unit === "thb" ? "บ." : "ท่าน"}</span>
        </span>
      </div>
      <div className="h-2 bg-background rounded-full overflow-hidden">
        <div className={`h-full ${bar} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] text-muted-foreground mt-1">{pct.toFixed(0)}% ของเป้า</p>
    </div>
  );
}