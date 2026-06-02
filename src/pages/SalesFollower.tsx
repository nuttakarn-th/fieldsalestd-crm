import { useMemo, useState, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { Users2, MapPin, CheckCircle2, TrendingUp, ImageIcon, Clock, Map as MapIcon, FileDown } from "lucide-react";
import { fmtDateTime } from "@/lib/dateUtils";
import { PageHelp } from "@/components/PageHelp";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from "recharts";
import { useCRM } from "@/store/crmStore";
import { useActiveSalesNames, useCurrentUser, useAuth } from "@/store/authStore";
import { Badge } from "@/components/ui/badge";
import { DateRangeFilter, resolveRange, inRange, type RangePreset } from "@/components/DateRangeFilter";
import type { DateRange } from "react-day-picker";

export default function SalesFollower() {
  const currentRep = useCRM((s) => s.currentRep);
  const routes = useCRM((s) => s.routes);
  const SALES_REPS = useActiveSalesNames();
  const user = useCurrentUser();
  const viewAsRole = useAuth((s) => s.viewAsRole);
  const effectiveRole = user?.role === "Admin" && viewAsRole ? viewAsRole : user?.role;

  const [preset, setPreset] = useState<RangePreset>("month");
  const [custom, setCustom] = useState<DateRange | undefined>();
  const [reportRep, setReportRep] = useState<string | null>(null);

  const range = resolveRange(preset, custom);

  const stats = useMemo(() => {
    return SALES_REPS.map((rep) => {
      const repRoutes = routes.filter((r) => r.rep === rep && inRange(r.date, range));
      const stops = repRoutes.flatMap((r) => r.stops);
      const planned = stops.length;
      const completed = stops.filter((s) => s.status === "completed").length;
      const skipped = stops.filter((s) => s.status === "skipped").length;
      const inProg = stops.filter((s) => s.status === "in_progress").length;
      const totalMin = stops.reduce((a, s) => a + (s.duration_min ?? 0), 0);
      const avgMin = completed ? Math.round(totalMin / completed) : 0;
      const completionRate = planned ? Math.round((completed / planned) * 100) : 0;
      return { rep, planned, completed, skipped, inProg, totalMin, avgMin, completionRate, routes: repRoutes.length };
    });
  }, [routes, range]);

  // ── declare completedItems ก่อน exportPDF (ป้องกัน TDZ error) ──
  const completedItems = useMemo(() => {
    return routes
      .flatMap((r) => r.stops.filter((s) => s.status === "completed").map((s) => ({ ...s, rep: r.rep })))
      .filter((s) => inRange(s.completed_at ?? null, range))
      .sort((a, b) => new Date(b.completed_at ?? 0).getTime() - new Date(a.completed_at ?? 0).getTime());
  }, [routes, range]);

  const reportItems = useMemo(() => {
    if (!reportRep) return [];
    return routes
      .filter((r) => r.rep === reportRep)
      .flatMap((r) => r.stops.filter((s) => s.status === "completed").map((s) => ({ ...s, routeTitle: r.title, routeDate: r.date })))
      .filter((s) => inRange(s.completed_at ?? s.routeDate, range))
      .sort((a, b) => new Date(a.completed_at ?? a.routeDate).getTime() - new Date(b.completed_at ?? b.routeDate).getTime());
  }, [reportRep, routes, range]);

  const totals = stats.reduce(
    (a, s) => ({
      planned: a.planned + s.planned,
      completed: a.completed + s.completed,
      routes: a.routes + s.routes,
      totalMin: a.totalMin + s.totalMin,
    }),
    { planned: 0, completed: 0, routes: 0, totalMin: 0 },
  );
  const overallRate = totals.planned ? Math.round((totals.completed / totals.planned) * 100) : 0;

  /* ── Export PDF (print window) ── */
  const exportPDF = useCallback(() => {
    const win = window.open("", "_blank");
    if (!win) return;
    const rangeLabel = range.label;
    const rows = stats.map((s) => `
      <tr>
        <td>${s.rep}</td>
        <td>${s.routes}</td>
        <td>${s.planned}</td>
        <td class="green">${s.completed}</td>
        <td>${s.skipped}</td>
        <td>${s.totalMin}</td>
        <td>${s.avgMin} m</td>
        <td class="bold">${s.completionRate}%</td>
      </tr>`).join("");
    const totalRows = stats.reduce((a, s) => ({
      routes: a.routes + s.routes, planned: a.planned + s.planned,
      completed: a.completed + s.completed, skipped: a.skipped + s.skipped,
      totalMin: a.totalMin + s.totalMin,
    }), { routes: 0, planned: 0, completed: 0, skipped: 0, totalMin: 0 });
    const overallRateCalc = totalRows.planned ? Math.round((totalRows.completed / totalRows.planned) * 100) : 0;
    const completedRows = completedItems.map((s) => {
      const dt = s.completed_at ? new Date(s.completed_at) : null;
      const dd = dt ? String(dt.getDate()).padStart(2,"0") : "";
      const mm = dt ? String(dt.getMonth()+1).padStart(2,"0") : "";
      const yy = dt ? String(dt.getFullYear()).slice(2) : "";
      const hh = dt ? String(dt.getHours()).padStart(2,"0") : "";
      const mi = dt ? String(dt.getMinutes()).padStart(2,"0") : "";
      return `<tr>
        <td>${s.rep}</td>
        <td>${s.place_name || "-"}</td>
        <td>${s.purpose || "-"}</td>
        <td>${dd && mm && yy ? `${dd}/${mm}/${yy} ${hh}:${mi}` : "-"}</td>
        <td>${s.duration_min ?? 0} นาที</td>
        <td>${s.note ? `"${s.note}"` : "-"}</td>
      </tr>`;
    }).join("");
    win.document.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8">
      <title>Sales Mission Report — ${rangeLabel}</title>
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11pt; color: #1e293b; margin: 0; padding: 24px; }
        h1 { font-size: 18pt; margin: 0 0 4px; }
        .sub { color: #64748b; font-size: 10pt; margin-bottom: 20px; }
        .stats { display: flex; gap: 16px; margin-bottom: 20px; }
        .stat { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 16px; min-width: 90px; }
        .stat-val { font-size: 22pt; font-weight: 800; }
        .stat-lbl { font-size: 8pt; color: #64748b; }
        table { border-collapse: collapse; width: 100%; font-size: 10pt; }
        th { background: #f1f5f9; padding: 6px 10px; text-align: left; font-weight: 700; border-bottom: 2px solid #e2e8f0; }
        td { padding: 5px 10px; border-bottom: 1px solid #f1f5f9; }
        .green { color: #16a34a; font-weight: 700; }
        .bold { font-weight: 800; }
        .tfoot td { background: #f8fafc; font-weight: 700; }
        h2 { font-size: 13pt; margin: 24px 0 8px; }
        @media print { body { padding: 10px; } }
      </style>
    </head><body>
      <h1>Sales Mission Report</h1>
      <div class="sub">ช่วงเวลา: ${rangeLabel} · ส่งออกเมื่อ ${new Date().toLocaleDateString("th-TH")}</div>
      <div class="stats">
        <div class="stat"><div class="stat-val">${totalRows.routes}</div><div class="stat-lbl">Routes</div></div>
        <div class="stat"><div class="stat-val">${totalRows.planned}</div><div class="stat-lbl">วางแผน</div></div>
        <div class="stat" style="color:#16a34a"><div class="stat-val">${totalRows.completed}</div><div class="stat-lbl">Complete</div></div>
        <div class="stat"><div class="stat-val">${overallRateCalc}%</div><div class="stat-lbl">อัตราเสร็จ</div></div>
      </div>
      <h2>ตารางสรุปรายคน</h2>
      <table>
        <thead><tr>
          <th>Sales</th><th>Routes</th><th>วางแผน</th><th>Complete</th><th>Skipped</th><th>เวลารวม (นาที)</th><th>เฉลี่ย/จุด</th><th>% เสร็จ</th>
        </tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr>
          <td>รวม</td><td>${totalRows.routes}</td><td>${totalRows.planned}</td>
          <td class="green">${totalRows.completed}</td><td>${totalRows.skipped}</td>
          <td>${totalRows.totalMin}</td><td>-</td><td class="bold">${overallRateCalc}%</td>
        </tr></tfoot>
      </table>
      ${completedItems.length > 0 ? `
      <h2>รายการ Mission Complete (${completedItems.length} รายการ)</h2>
      <table>
        <thead><tr><th>Sales</th><th>สถานที่</th><th>ประเภท</th><th>วันเวลา</th><th>เวลา</th><th>หมายเหตุ</th></tr></thead>
        <tbody>${completedRows}</tbody>
      </table>` : ""}
    </body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 600);
  }, [stats, completedItems, range]);

  // ── Guard: อนุญาตเฉพาะ Admin (currentRep="All") และ Sales Manager ──
  if (currentRep !== "All" && effectiveRole !== "Sales Manager") return <Navigate to="/app" replace />;

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-pink flex items-center justify-center shadow-glow">
            <Users2 className="w-5 h-5 text-accent-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-2xl font-bold">Sales Mission</h1>
              <PageHelp pageKey="sales-mission" defaultText="ติดตาม Mission Sales ทั้งทีม — ดูสถิติ Route ที่ Complete, กรองตามช่วงเวลา และ Export PDF รายงาน" />
            </div>
            <p className="text-sm text-muted-foreground">ติดตามภารกิจ Mission Complete ของ Sales ทุกคน</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DateRangeFilter value={preset} custom={custom} onChange={(p, c) => { setPreset(p); setCustom(c); }} />
          <Button size="sm" variant="outline" onClick={exportPDF} className="gap-1 shrink-0">
            <FileDown className="w-4 h-4" /> Export PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Routes ทั้งหมด", value: totals.routes, icon: MapPin, tone: "text-primary bg-primary/10" },
          { label: "จุดที่วางแผน", value: totals.planned, icon: MapPin, tone: "text-accent bg-accent/10" },
          { label: "Complete แล้ว", value: totals.completed, icon: CheckCircle2, tone: "text-success bg-success/10" },
          { label: "อัตราเสร็จงาน", value: `${overallRate}%`, icon: TrendingUp, tone: "text-gold bg-gold/10" },
        ].map((c) => (
          <div key={c.label} className="bg-card rounded-xl border p-4 shadow-soft">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.tone}`}>
                <c.icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold mt-2">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl border p-5 shadow-soft">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold">เปรียบเทียบ Planned vs Completed (รายคน)</h2>
          <span className="text-xs text-muted-foreground">ช่วง: {range.label}</span>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={stats}>
            <defs>
              <linearGradient id="sfPlanned" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
              </linearGradient>
              <linearGradient id="sfCompleted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={1} />
                <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0.35} />
              </linearGradient>
              <linearGradient id="sfSkipped" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity={1} />
                <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.35} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="rep" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
            <YAxis stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
            <Legend />
            <Bar dataKey="planned" name="วางแผน" fill="url(#sfPlanned)" radius={[8, 8, 0, 0]} />
            <Bar dataKey="completed" name="Complete" fill="url(#sfCompleted)" radius={[8, 8, 0, 0]} />
            <Bar dataKey="skipped" name="Skipped" fill="url(#sfSkipped)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-card rounded-xl border p-5 shadow-soft">
        <h2 className="font-bold mb-3">เวลาเฉลี่ยต่อจุด (นาที)</h2>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={stats}>
            <defs>
              <linearGradient id="sfAvgMin" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--gold))" stopOpacity={1} />
                <stop offset="100%" stopColor="hsl(var(--gold))" stopOpacity={0.35} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="rep" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
            <YAxis stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
            <Bar dataKey="avgMin" name="นาที/จุด" fill="url(#sfAvgMin)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-card rounded-xl border shadow-soft overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="font-bold">ตารางสรุปรายคน</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left p-3">Sales</th>
                <th className="text-right p-3">Routes</th>
                <th className="text-right p-3">วางแผน</th>
                <th className="text-right p-3">Complete</th>
                <th className="text-right p-3">Skipped</th>
                <th className="text-right p-3">เวลารวม (นาที)</th>
                <th className="text-right p-3">เวลาเฉลี่ย/จุด</th>
                <th className="text-right p-3 bg-gold/10 text-gold-foreground">% เสร็จ</th>
                <th className="text-right p-3">Route Report</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {stats.map((s) => (
                <tr key={s.rep} className="hover:bg-muted/30">
                  <td className="p-3 font-semibold">{s.rep}</td>
                  <td className="p-3 text-right">{s.routes}</td>
                  <td className="p-3 text-right">{s.planned}</td>
                  <td className="p-3 text-right text-success font-semibold">{s.completed}</td>
                  <td className="p-3 text-right text-muted-foreground">{s.skipped}</td>
                  <td className="p-3 text-right">{s.totalMin}</td>
                  <td className="p-3 text-right">{s.avgMin} m</td>
                  <td className="p-3 text-right font-bold bg-gold/5">{s.completionRate}%</td>
                  <td className="p-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => setReportRep(s.rep)}>
                      <MapIcon className="w-3.5 h-3.5 mr-1" /> ดู Report
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!reportRep} onOpenChange={(o) => !o && setReportRep(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapIcon className="w-5 h-5 text-primary" /> Route Report — {reportRep}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <DateRangeFilter value={preset} custom={custom} onChange={(p, c) => { setPreset(p); setCustom(c); }} />
              <Badge variant="outline">{reportItems.length} รายการ · {range.label}</Badge>
            </div>

            {reportItems.length > 1 && (
              <div className="rounded-xl border bg-gradient-to-br from-primary/5 to-accent/5 p-4">
                <p className="text-xs text-muted-foreground mb-2 font-semibold">เส้นทางการทำ Mission (ตามลำดับเวลา)</p>
                <svg viewBox={`0 0 ${Math.max(reportItems.length * 90, 300)} 110`} className="w-full h-32">
                  {reportItems.map((s, i) => {
                    if (i === 0) return null;
                    const x1 = 30 + (i - 1) * 90;
                    const x2 = 30 + i * 90;
                    return (
                      <line key={`l-${s.stop_id}`} x1={x1} y1={55} x2={x2} y2={55}
                            stroke="hsl(var(--primary))" strokeWidth={2} strokeDasharray="4 4" />
                    );
                  })}
                  {reportItems.map((s, i) => {
                    const x = 30 + i * 90;
                    return (
                      <g key={s.stop_id}>
                        <circle cx={x} cy={55} r={14} fill="hsl(var(--primary))" />
                        <text x={x} y={60} textAnchor="middle" fill="hsl(var(--primary-foreground))" fontSize={12} fontWeight={700}>{i + 1}</text>
                        <text x={x} y={88} textAnchor="middle" fill="hsl(var(--foreground))" fontSize={10}>
                          {(s.place_name || "-").slice(0, 12)}
                        </text>
                        <text x={x} y={102} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={9}>
                          {s.completed_at ? new Date(s.completed_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false }) : ""}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            )}

            <ol className="space-y-2 max-h-[55vh] overflow-auto pr-1">
              {reportItems.length === 0 && (
                <li className="text-sm text-muted-foreground text-center py-8">ไม่มี Mission ในช่วงนี้</li>
              )}
              {reportItems.map((s, i) => (
                <li key={s.stop_id} className="flex items-start gap-3 p-3 rounded-lg border bg-background">
                  <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shrink-0">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{s.place_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.routeDate} · {s.completed_at ? fmtDateTime(s.completed_at).split(" ")[1] : "-"} · {s.duration_min ?? 0} นาที
                    </p>
                    {s.note && <p className="text-xs italic text-muted-foreground mt-0.5">"{s.note}"</p>}
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setReportRep(null)}>ปิด</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="bg-card rounded-xl border shadow-soft overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between gap-3">
          <h2 className="font-bold">รายการ Mission Complete ของทีม (ใหม่ → เก่า)</h2>
          <Badge variant="outline">{completedItems.length} รายการ</Badge>
        </div>
        <ul className="divide-y">
          {completedItems.length === 0 && <li className="p-8 text-center text-muted-foreground">ไม่มีรายการในช่วงเวลานี้</li>}
          {completedItems.map((s) => (
            <li key={`${s.route_id}-${s.stop_id}`} className="p-3 flex items-center gap-3">
              <div className="w-20 h-16 rounded-lg bg-muted/60 overflow-hidden flex items-center justify-center shrink-0">
                {s.field_photo_url ? (
                  <img src={s.field_photo_url} alt={s.place_name} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold truncate">{s.place_name}</p>
                  <Badge variant="outline">{s.rep}</Badge>
                  <Badge variant="outline">{s.purpose}</Badge>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-3 mt-1 flex-wrap">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmtDateTime(s.completed_at)}</span>
                  <span>· {s.duration_min ?? 0} นาที</span>
                </div>
                {s.note && <p className="text-xs text-muted-foreground mt-1 line-clamp-2 italic">"{s.note}"</p>}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}