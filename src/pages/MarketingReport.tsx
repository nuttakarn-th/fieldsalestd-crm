import { BarChart3, TrendingUp, Users, Clock, Target, Zap } from "lucide-react";
import { useCRM } from "@/store/crmStore";
import type { Lead, SalesRep, BUType } from "@/store/crmStore";

// ─── helpers ───────────────────────────────────────────────────────────────

/** ดึง timestamp จาก lead_id รูปแบบ L<timestamp> */
function leadCreatedAt(lead: Lead): Date | null {
  const ts = parseInt(lead.lead_id.replace("L", ""), 10);
  if (isNaN(ts)) return null;
  return new Date(ts);
}

/** จำนวนวันระหว่างสองวัน (round) */
function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── component ────────────────────────────────────────────────────────────

export default function MarketingReport() {
  const leads = useCRM((s) => s.leads);

  // ── Closed Won leads with valid timestamps ──
  const wonLeads = leads.filter(
    (l) => l.status === "Closed Won" && l.closed_date && leadCreatedAt(l)
  );

  // ── Avg. Time to Close (overall) ──
  const closeTimes = wonLeads.map((l) => {
    const created = leadCreatedAt(l)!;
    const closed = new Date(l.closed_date!);
    return daysBetween(created, closed);
  });
  const avgDays =
    closeTimes.length > 0
      ? Math.round(closeTimes.reduce((a, b) => a + b, 0) / closeTimes.length)
      : null;
  const minDays = closeTimes.length > 0 ? Math.min(...closeTimes) : null;
  const maxDays = closeTimes.length > 0 ? Math.max(...closeTimes) : null;

  // ── Breakdown by Sales Rep ──
  const repBreakdown = (["เฟิร์ส", "โดนัท", "ปาม"] as SalesRep[]).map((rep) => {
    const repLeads = wonLeads.filter((l) => l.assigned_to === rep);
    const times = repLeads.map((l) =>
      daysBetween(leadCreatedAt(l)!, new Date(l.closed_date!))
    );
    const avg = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null;
    return { rep, count: repLeads.length, avg };
  }).filter((r) => r.count > 0);

  // ── Breakdown by BU Type ──
  const buTypes: BUType[] = ["ทัวร์ต่างประเทศ", "ทัวร์ภายในประเทศ", "เช่ารถ ท่องเที่ยว", "จองตั๋วเครื่องบิน"];
  const buBreakdown = buTypes.map((bu) => {
    const buLeads = wonLeads.filter((l) => l.bu_type === bu);
    const times = buLeads.map((l) =>
      daysBetween(leadCreatedAt(l)!, new Date(l.closed_date!))
    );
    const avg = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null;
    return { bu, count: buLeads.length, avg };
  }).filter((r) => r.count > 0);

  // ── Lead Source Breakdown (real data) ──
  const allLeads = leads;
  const sourceMap: Record<string, number> = {};
  allLeads.forEach((l) => {
    // source lives on customer — approximate via lead_category as fallback
    // map bu_type to channel group for illustration
    const src = l.bu_type;
    sourceMap[src] = (sourceMap[src] || 0) + 1;
  });

  // ── Conversion rate ──
  const totalLeads = leads.length;
  const wonCount = leads.filter((l) => l.status === "Closed Won").length;
  const lostCount = leads.filter((l) => l.status === "Closed Lost").length;
  const convRate = totalLeads > 0 ? ((wonCount / totalLeads) * 100).toFixed(1) : "0.0";

  // ── Funnel stage counts ──
  const stageCounts: Record<string, number> = {
    New: 0, Contacted: 0, "Quotation Sent": 0,
    Negotiating: 0, "Closed Won": 0, "Closed Lost": 0,
  };
  leads.forEach((l) => { stageCounts[l.status] = (stageCounts[l.status] || 0) + 1; });

  // ── colour helper ──
  const barMax = Math.max(...Object.values(stageCounts), 1);
  const stageColors: Record<string, string> = {
    New: "bg-slate-400",
    Contacted: "bg-blue-400",
    "Quotation Sent": "bg-amber-400",
    Negotiating: "bg-orange-400",
    "Closed Won": "bg-emerald-500",
    "Closed Lost": "bg-red-400",
  };

  const repColors = ["bg-purple-500", "bg-indigo-500", "bg-violet-500"];
  const buColors = ["bg-blue-500", "bg-teal-500", "bg-cyan-500", "bg-sky-500"];
  const repBarMax = repBreakdown.length > 0 ? Math.max(...repBreakdown.map((r) => r.avg ?? 0), 1) : 1;
  const buBarMax  = buBreakdown.length  > 0 ? Math.max(...buBreakdown.map((r) => r.avg  ?? 0), 1) : 1;

  return (
    <div className="p-4 sm:p-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
          <BarChart3 className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Marketing Report</h1>
          <p className="text-sm text-muted-foreground">สรุปประสิทธิภาพช่องทางการตลาดและการปิดการขาย</p>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Avg. Time to Close"
          value={avgDays !== null ? `${avgDays} วัน` : "—"}
          sub={closeTimes.length > 0 ? `จาก ${closeTimes.length} deals` : "ยังไม่มีข้อมูล"}
          icon={Clock}
          accent="text-purple-600"
        />
        <MetricCard
          label="Win Rate"
          value={`${convRate}%`}
          sub={`${wonCount} Won / ${totalLeads} ทั้งหมด`}
          icon={Target}
          accent="text-emerald-600"
        />
        <MetricCard
          label="Fastest Close"
          value={minDays !== null ? `${minDays} วัน` : "—"}
          sub="เร็วที่สุด"
          icon={Zap}
          accent="text-amber-600"
        />
        <MetricCard
          label="Longest Close"
          value={maxDays !== null ? `${maxDays} วัน` : "—"}
          sub="นานที่สุด"
          icon={TrendingUp}
          accent="text-red-500"
        />
      </div>

      {/* ── Avg. Time to Close by Sales Rep ── */}
      <div className="bg-card rounded-xl border shadow-soft p-5">
        <h3 className="font-bold mb-1">Avg. Time to Close — แยกตาม Sales</h3>
        <p className="text-xs text-muted-foreground mb-4">วันเฉลี่ยจากสร้าง Lead → Closed Won ต่อ Sales Rep</p>
        {repBreakdown.length === 0 ? (
          <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูล Closed Won</p>
        ) : (
          <div className="space-y-3">
            {repBreakdown.map((r, i) => (
              <div key={r.rep} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {r.rep.charAt(0)}
                </div>
                <div className="w-20 text-sm font-medium shrink-0">{r.rep}</div>
                <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                  <div
                    className={`h-full ${repColors[i % repColors.length]} transition-all`}
                    style={{ width: `${((r.avg ?? 0) / repBarMax) * 100}%` }}
                  />
                </div>
                <div className="w-20 text-right">
                  <span className="font-bold text-sm">{r.avg} วัน</span>
                  <span className="text-xs text-muted-foreground ml-1">({r.count})</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Avg. Time to Close by BU Type ── */}
      <div className="bg-card rounded-xl border shadow-soft p-5">
        <h3 className="font-bold mb-1">Avg. Time to Close — แยกตาม BU Type</h3>
        <p className="text-xs text-muted-foreground mb-4">ทัวร์ประเภทไหนใช้เวลาปิดนานกว่ากัน</p>
        {buBreakdown.length === 0 ? (
          <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูล Closed Won</p>
        ) : (
          <div className="space-y-3">
            {buBreakdown.map((r, i) => (
              <div key={r.bu} className="flex items-center gap-3">
                <span className="w-44 text-sm shrink-0">{r.bu}</span>
                <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                  <div
                    className={`h-full ${buColors[i % buColors.length]} transition-all`}
                    style={{ width: `${((r.avg ?? 0) / buBarMax) * 100}%` }}
                  />
                </div>
                <div className="w-20 text-right">
                  <span className="font-bold text-sm">{r.avg} วัน</span>
                  <span className="text-xs text-muted-foreground ml-1">({r.count})</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Pipeline Funnel ── */}
      <div className="bg-card rounded-xl border shadow-soft p-5">
        <h3 className="font-bold mb-1">Pipeline Status</h3>
        <p className="text-xs text-muted-foreground mb-4">Lead ทั้งหมดแยกตามสถานะปัจจุบัน</p>
        <div className="space-y-2">
          {Object.entries(stageCounts).map(([stage, count]) => (
            <div key={stage} className="flex items-center gap-3">
              <span className="w-36 text-sm shrink-0">{stage}</span>
              <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                <div
                  className={`h-full ${stageColors[stage] || "bg-gray-400"}`}
                  style={{ width: `${(count / barMax) * 100}%` }}
                />
              </div>
              <span className="w-8 text-right font-bold text-sm">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Overview ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border shadow-soft p-5 text-center">
          <Users className="w-5 h-5 mx-auto text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground mb-1">Lead ทั้งหมด</p>
          <p className="text-4xl font-extrabold">{totalLeads}</p>
        </div>
        <div className="bg-card rounded-xl border shadow-soft p-5 text-center">
          <Target className="w-5 h-5 mx-auto text-emerald-500 mb-2" />
          <p className="text-xs text-muted-foreground mb-1">Closed Won</p>
          <p className="text-4xl font-extrabold text-emerald-600">{wonCount}</p>
        </div>
        <div className="bg-card rounded-xl border shadow-soft p-5 text-center">
          <BarChart3 className="w-5 h-5 mx-auto text-red-400 mb-2" />
          <p className="text-xs text-muted-foreground mb-1">Closed Lost</p>
          <p className="text-4xl font-extrabold text-red-500">{lostCount}</p>
        </div>
      </div>

    </div>
  );
}

// ─── sub-components ──────────────────────────────────────────────────────

function MetricCard({
  label, value, sub, icon: Icon, accent,
}: {
  label: string;
  value: string;
  sub: string;
  icon: typeof Clock;
  accent?: string;
}) {
  return (
    <div className="bg-card rounded-xl border p-4 shadow-soft flex flex-col gap-2">
      <div className={`p-2 rounded-lg bg-accent/10 w-fit ${accent ?? "text-accent"}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-xs text-muted-foreground font-medium leading-tight">{label}</p>
      <p className={`text-2xl md:text-3xl font-extrabold leading-none ${accent ?? ""}`}>{value}</p>
      <p className="text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );
}
