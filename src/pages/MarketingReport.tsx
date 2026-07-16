import { useState, useMemo } from "react";
import { BarChart3, TrendingUp, Users, Clock, Target, Zap, Map, Cake, Phone, Download, Copy, Check, Gift } from "lucide-react";
import { useCRM } from "@/store/crmStore";
import type { Lead, SalesRep, BUType, Customer } from "@/store/crmStore";
import ProvinceHeatmap from "./ProvinceHeatmap";

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
  const [activeTab, setActiveTab] = useState<"report" | "heatmap" | "birthday">("report");
  const leads = useCRM((s) => s.leads);

  // ── Closed Won leads with valid timestamps ──
  const wonLeads = leads.filter(
    (l) => l.status === "จองแล้ว" && l.closed_date && leadCreatedAt(l)
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
  const wonCount = leads.filter((l) => l.status === "จองแล้ว").length;
  const lostCount = leads.filter((l) => l.status === "ยกเลิก").length;
  const convRate = totalLeads > 0 ? ((wonCount / totalLeads) * 100).toFixed(1) : "0.0";

  // ── Funnel stage counts ──
  const stageCounts: Record<string, number> = {
    New: 0, Contacted: 0, "ส่ง Quote แล้ว": 0,
    Negotiating: 0, "จองแล้ว": 0, "ยกเลิก": 0,
  };
  leads.forEach((l) => { stageCounts[l.status] = (stageCounts[l.status] || 0) + 1; });

  // ── colour helper ──
  const barMax = Math.max(...Object.values(stageCounts), 1);
  const stageColors: Record<string, string> = {
    New: "bg-slate-400",
    Contacted: "bg-blue-400",
    "ส่ง Quote แล้ว": "bg-amber-400",
    Negotiating: "bg-orange-400",
    "จองแล้ว": "bg-emerald-500",
    "ยกเลิก": "bg-red-400",
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

      {/* ── Tab Buttons ── */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("report")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "report"
              ? "bg-primary text-primary-foreground shadow-glow"
              : "bg-muted text-muted-foreground hover:bg-accent"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Marketing Report
        </button>
        <button
          onClick={() => setActiveTab("heatmap")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "heatmap"
              ? "bg-primary text-primary-foreground shadow-glow"
              : "bg-muted text-muted-foreground hover:bg-accent"
          }`}
        >
          <Map className="w-4 h-4" />
          Province Heatmap
        </button>
        <button
          onClick={() => setActiveTab("birthday")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "birthday"
              ? "bg-pink-600 text-white shadow-glow"
              : "bg-muted text-muted-foreground hover:bg-accent"
          }`}
        >
          <Cake className="w-4 h-4" />
          Birthday Campaign
        </button>
      </div>

      {/* ── Heatmap Tab ── */}
      {activeTab === "heatmap" && (
        <div className="-mx-4 sm:-mx-6">
          <ProvinceHeatmap />
        </div>
      )}

      {/* ── Birthday Campaign Tab ── */}
      {activeTab === "birthday" && <BirthdayCampaign />}

      {/* ── Report Tab content only shows when activeTab === "report" ── */}
      {activeTab === "report" && (<>

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

      </>)}

    </div>
  );
}

// ─── Birthday Campaign Component ─────────────────────────────────────────

function BirthdayCampaign() {
  const customers = useCRM((s) => s.customers);
  const [filter, setFilter] = useState<"month" | "week">("month");
  const [copied, setCopied] = useState<string | null>(null);

  const today = new Date();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();

  // ─ helper: parse birthday YYYY-MM-DD ─
  function parseBirthday(bday: string): { month: number; day: number } | null {
    const parts = bday.split("-");
    if (parts.length !== 3) return null;
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    if (isNaN(m) || isNaN(d)) return null;
    return { month: m, day: d };
  }

  // ─ days until next birthday ─
  function daysUntil(month: number, day: number): number {
    const now = new Date();
    let next = new Date(now.getFullYear(), month - 1, day);
    if (next < now) next = new Date(now.getFullYear() + 1, month - 1, day);
    return Math.ceil((next.getTime() - now.setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));
  }

  const filtered = useMemo(() => {
    return customers
      .filter((c) => {
        if (!c.birthday) return false;
        const bd = parseBirthday(c.birthday);
        if (!bd) return false;
        if (filter === "month") return bd.month === todayMonth;
        // week: เกิดใน 7 วันข้างหน้า (รวมวันนี้)
        const days = daysUntil(bd.month, bd.day);
        return days <= 7;
      })
      .map((c) => {
        const bd = parseBirthday(c.birthday!)!;
        return { ...c, bdMonth: bd.month, bdDay: bd.day, daysLeft: daysUntil(bd.month, bd.day) };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [customers, filter, todayMonth]);

  function isToday(month: number, day: number) {
    return month === todayMonth && day === todayDay;
  }

  function copyGreeting(c: Customer) {
    const text = `🎂 สุขสันต์วันเกิดค่ะ คุณ${c.full_name}! ขอให้มีความสุขมากๆ นะคะ Standard Tour ขอส่งความปรารถนาดีมาให้ค่ะ 🎉`;
    navigator.clipboard.writeText(text);
    setCopied(c.customer_id);
    setTimeout(() => setCopied(null), 2000);
  }

  function exportCSV() {
    const header = "ชื่อ,บริษัท,เบอร์โทร,LINE ID,วันเกิด,เหลืออีก(วัน)";
    const rows = filtered.map(
      (c) =>
        `"${c.full_name}","${c.company ?? "-"}","${c.phone}","${c.line_id ?? "-"}","${c.bdDay}/${c.bdMonth}","${c.daysLeft}"`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `birthday-campaign-${filter === "month" ? "month" : "7days"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const todayCount = filtered.filter((c) => isToday(c.bdMonth, c.bdDay)).length;
  const soonCount  = filtered.filter((c) => c.daysLeft <= 7 && !isToday(c.bdMonth, c.bdDay)).length;

  return (
    <div className="space-y-5">
      {/* ── Summary strip ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-pink-50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-800 rounded-xl p-4 text-center">
          <Gift className="w-5 h-5 mx-auto text-pink-500 mb-1" />
          <p className="text-2xl font-extrabold text-pink-600">{todayCount}</p>
          <p className="text-xs text-muted-foreground">เกิดวันนี้ 🎂</p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-xl p-4 text-center">
          <Cake className="w-5 h-5 mx-auto text-purple-500 mb-1" />
          <p className="text-2xl font-extrabold text-purple-600">{soonCount}</p>
          <p className="text-xs text-muted-foreground">เร็วๆ นี้ (≤7 วัน)</p>
        </div>
        <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 text-center">
          <Users className="w-5 h-5 mx-auto text-indigo-500 mb-1" />
          <p className="text-2xl font-extrabold text-indigo-600">{filtered.length}</p>
          <p className="text-xs text-muted-foreground">รายการทั้งหมด</p>
        </div>
      </div>

      {/* ── Filter + Export ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setFilter("month")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            filter === "month" ? "bg-pink-600 text-white" : "bg-muted text-muted-foreground hover:bg-accent"
          }`}
        >
          เดือนนี้ ({today.toLocaleString("th-TH", { month: "long" })})
        </button>
        <button
          onClick={() => setFilter("week")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            filter === "week" ? "bg-pink-600 text-white" : "bg-muted text-muted-foreground hover:bg-accent"
          }`}
        >
          7 วันข้างหน้า
        </button>
        <div className="ml-auto">
          <button
            onClick={exportCSV}
            disabled={filtered.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition-all"
          >
            <Download className="w-4 h-4" />
            Export CSV ({filtered.length})
          </button>
        </div>
      </div>

      {/* ── List ── */}
      {filtered.length === 0 ? (
        <div className="bg-card border rounded-xl p-10 text-center">
          <Cake className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground text-sm">ไม่มีลูกค้าที่มีวันเกิด{filter === "month" ? "ในเดือนนี้" : "ใน 7 วันข้างหน้า"}</p>
          <p className="text-xs text-muted-foreground mt-1">เพิ่มวันเกิดใน Customer Profile เพื่อใช้งาน Birthday Campaign</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border shadow-soft overflow-hidden">
          <div className="divide-y divide-border">
            {filtered.map((c) => {
              const today_ = isToday(c.bdMonth, c.bdDay);
              return (
                <div
                  key={c.customer_id}
                  className={`flex items-center gap-3 px-4 py-3 ${today_ ? "bg-pink-50 dark:bg-pink-950/20" : ""}`}
                >
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${today_ ? "bg-gradient-to-br from-pink-500 to-rose-600" : "bg-gradient-to-br from-purple-500 to-indigo-600"}`}>
                    {c.full_name.charAt(0)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm truncate">{c.full_name}</p>
                      {today_ && (
                        <span className="text-[10px] bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300 px-2 py-0.5 rounded-full font-bold">🎂 วันนี้!</span>
                      )}
                      {!today_ && c.daysLeft <= 3 && (
                        <span className="text-[10px] bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold">อีก {c.daysLeft} วัน</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>
                      {c.line_id && <span>LINE: {c.line_id}</span>}
                      <span className="text-pink-500 font-medium">
                        🎂 {c.bdDay}/{c.bdMonth}
                        {!today_ && <> · อีก {c.daysLeft} วัน</>}
                      </span>
                    </div>
                  </div>

                  {/* Copy greeting */}
                  <button
                    onClick={() => copyGreeting(c)}
                    title="Copy ข้อความอวยพร"
                    className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      copied === c.customer_id
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-muted hover:bg-pink-100 hover:text-pink-700 text-muted-foreground"
                    }`}
                  >
                    {copied === c.customer_id ? (
                      <><Check className="w-3.5 h-3.5" /> Copied!</>
                    ) : (
                      <><Copy className="w-3.5 h-3.5" /> อวยพร</>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {filtered.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          ข้อความที่ Copy ไว้สามารถส่งผ่าน LINE / Facebook ได้เลย
        </p>
      )}
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
