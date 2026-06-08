import { useMemo, useState, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { Users2, MapPin, CheckCircle2, TrendingUp, ImageIcon, Clock, Map as MapIcon, FileDown, Printer, ChevronLeft, ChevronRight, CalendarClock } from "lucide-react";
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
  const [completedPage, setCompletedPage] = useState(1);
  const COMPLETED_PAGE_SIZE = 10;

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

  /* ── Route Report PDF (A4 รายบุคคล) ── */
  const downloadRouteReportPDF = useCallback(() => {
    if (!reportRep || reportItems.length === 0) return;
    const win = window.open("", "_blank");
    if (!win) return;

    const now = new Date();
    const exportDateStr = now.toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
    const exportTimeStr = now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false });
    // ชื่อไฟล์ PDF: Route Report-ชื่อเซลล์_DDMMYYYY
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yyyy = now.getFullYear();
    const fileTitle = `Route Report-${reportRep}_${dd}${mm}${yyyy}`;

    const totalMin = reportItems.reduce((a, s) => a + (s.duration_min ?? 0), 0);
    const totalHr = Math.floor(totalMin / 60);
    const totalMinRem = totalMin % 60;
    // ตัวเลขไม่ตัดคำ — ใช้ format กระชับ
    const totalTimeStr = totalHr > 0 ? `${totalHr}ชม.${totalMinRem}น.` : `${totalMin}น.`;

    // Haversine distance (km)
    function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // group by date
    const byDate = new Map<string, typeof reportItems>();
    reportItems.forEach((s) => {
      const arr = byDate.get(s.routeDate) ?? [];
      arr.push(s);
      byDate.set(s.routeDate, arr);
    });

    // ระยะทางรวมทั้งหมด
    let totalDistKm = 0;
    byDate.forEach((stops) => {
      for (let i = 1; i < stops.length; i++) {
        const p = stops[i - 1]; const c = stops[i];
        if (p.lat && p.lng && c.lat && c.lng) totalDistKm += haversineKm(p.lat, p.lng, c.lat, c.lng);
      }
    });

    // Detail sections per date
    let detailSections = "";
    byDate.forEach((stops, date) => {
      const d = new Date(date);
      const dateLabel = d.toLocaleDateString("th-TH", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

      let dayDistKm = 0;
      for (let i = 1; i < stops.length; i++) {
        const p = stops[i - 1]; const c = stops[i];
        if (p.lat && p.lng && c.lat && c.lng) dayDistKm += haversineKm(p.lat, p.lng, c.lat, c.lng);
      }
      const dayDistStr = dayDistKm > 0 ? `${dayDistKm.toFixed(1)} กม.` : "—";
      const dayMin = stops.reduce((a, s) => a + (s.duration_min ?? 0), 0);

      let rows = "";
      stops.forEach((s) => {
        const dt = s.completed_at ? new Date(s.completed_at) : null;
        const timeStr = dt ? dt.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false }) : "-";
        const seqNum = String(reportItems.indexOf(s) + 1).padStart(2, "0");
        rows += `
          <tr>
            <td class="seq-cell">${seqNum}</td>
            <td style="padding:2px 4px;vertical-align:middle;text-align:center">
              ${s.field_photo_url
                ? `<img class="thumb" src="${s.field_photo_url}" alt="${s.place_name || ""}"/>`
                : `<div class="no-thumb"></div>`}
            </td>
            <td class="place-cell">
              <div class="pn">${s.place_name || "-"}</div>
              ${s.address ? `<div class="pa">${s.address}</div>` : ""}
            </td>
            <td><span class="ptag">${s.purpose || "-"}</span></td>
            <td class="tc">${timeStr}</td>
            <td class="tc dc">${s.duration_min ?? 0}น.</td>
            <td class="nc">${s.note ? `"${s.note}"` : "<span class='nd'>—</span>"}</td>
          </tr>`;
      });

      detailSections += `
        <div class="day-block">
          <div class="dh">
            <span class="dl">📅 ${dateLabel}</span>
            <span class="dm">
              <span class="mc dist">📍 ${dayDistStr}</span>
              <span class="mc tm">⏱ ${dayMin}น.</span>
              <span class="mc st">🏢 ${stops.length} จุด</span>
            </span>
          </div>
          <table>
            <thead><tr>
              <th style="width:26px">ที่</th>
              <th style="width:62px;text-align:center">รูป</th>
              <th style="width:24%">สถานที่</th>
              <th style="width:14%">ประเภท</th>
              <th style="width:9%" class="tc">เวลา</th>
              <th style="width:9%" class="tc">ใช้เวลา</th>
              <th>บันทึกการพบ</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
    });

    win.document.write(`<!DOCTYPE html><html lang="th"><head>
      <meta charset="utf-8">
      <title>${fileTitle}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link href="https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;700&display=swap" rel="stylesheet">
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Google Sans',Arial,sans-serif;font-size:8.5pt;color:#1e293b;background:#fff;padding:18px 22px;line-height:1.3}
        /* Header */
        .hdr{display:flex;align-items:flex-start;justify-content:space-between;padding-bottom:10px;margin-bottom:10px;border-bottom:3px solid #7c3aed}
        .co{font-size:9.5pt;font-weight:700;color:#7c3aed}
        .rt{font-size:14pt;font-weight:700;color:#1e293b;margin:2px 0 1px;white-space:nowrap}
        .rsub{font-size:7.5pt;color:#64748b;margin-top:2px}
        .rbadge{background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;border-radius:8px;padding:6px 16px;text-align:right}
        .rn{font-size:13pt;font-weight:700;white-space:nowrap}
        .rr{font-size:7pt;color:#c4b5fd;margin-top:1px}
        /* Photo thumbnail ในตาราง */
        .thumb{width:55px;height:42px;object-fit:cover;border-radius:4px;border:1px solid #ddd6fe;display:block;margin:0 auto}
        .no-thumb{width:55px;height:42px;background:#f1f5f9;border-radius:4px;border:1px solid #e2e8f0;display:block;margin:0 auto}
        /* Summary bar — 1 แถว */
        .sum{display:flex;gap:0;margin-bottom:10px;border:1.5px solid #e2e8f0;border-radius:8px;overflow:hidden}
        .sc{flex:1;padding:7px 10px;background:#faf9ff;border-right:1px solid #e2e8f0;text-align:center}
        .sc:last-child{border-right:none}
        .sv{font-size:12pt;font-weight:700;white-space:nowrap;letter-spacing:-0.02em}
        .sl{font-size:6.5pt;color:#64748b;margin-top:1px}
        .g{color:#059669}.p{color:#7c3aed}.a{color:#b45309}.b{color:#0369a1}
        /* Day block */
        .day-block{margin-bottom:10px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;page-break-inside:avoid}
        .dh{background:linear-gradient(90deg,#7c3aed,#6d28d9);color:#fff;padding:5px 10px;display:flex;align-items:center;justify-content:space-between;gap:6px}
        .dl{font-size:8.5pt;font-weight:700}
        .dm{display:flex;gap:5px}
        .mc{border-radius:10px;padding:1px 8px;font-size:7pt;font-weight:600;background:rgba(255,255,255,.18)}
        .dist{background:rgba(16,185,129,.28)}
        .tm{background:rgba(251,191,36,.28)}
        .st{background:rgba(255,255,255,.15)}
        /* Table */
        table{border-collapse:collapse;width:100%;font-size:8pt}
        thead tr{background:#f3f0ff}
        thead th{padding:4px 6px;text-align:left;font-weight:700;font-size:7.5pt;color:#5b21b6;border-bottom:1.5px solid #ddd6fe}
        .tc{text-align:center}
        tbody td{padding:3px 6px;border-bottom:1px solid #f1f5f9;vertical-align:middle;line-height:1.25}
        tbody tr:nth-child(even){background:#faf9ff}
        .seq-cell{color:#7c3aed;font-weight:700;font-size:7.5pt;text-align:center;white-space:nowrap}
        .pn{font-weight:600;font-size:8pt;color:#1e293b}
        .pa{font-size:6.5pt;color:#94a3b8}
        .ptag{background:#ede9fe;color:#5b21b6;border-radius:3px;padding:1px 5px;font-size:7pt;font-weight:600;white-space:nowrap}
        .dc{color:#7c3aed;font-weight:700;white-space:nowrap}
        .nc{font-size:7.5pt;color:#374151;font-style:italic;line-height:1.25}
        .nd{color:#cbd5e1;font-style:normal}
        /* Footer */
        .footer{margin-top:14px;padding-top:8px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:7pt;color:#94a3b8}
        @media print{body{padding:6px 10px}@page{size:A4;margin:10mm 8mm}.day-block{page-break-inside:avoid}}
      </style>
    </head><body>

      <div class="hdr">
        <div>
          <div class="co">บริษัท สแตนดาร์ดทัวร์ จำกัด</div>
          <div class="rt">รายงาน Sales Mission Route</div>
          <div class="rsub">ช่วงเวลา: ${range.label} &nbsp;·&nbsp; ${reportItems.length} จุด &nbsp;·&nbsp; ส่งออก: ${exportDateStr} ${exportTimeStr}</div>
        </div>
        <div class="rbadge">
          <div class="rn">${reportRep}</div>
          <div class="rr">Sales Representative</div>
        </div>
      </div>

      <div class="sum">
        <div class="sc"><div class="sv g">${reportItems.length}</div><div class="sl">จุดที่เยี่ยมชม</div></div>
        <div class="sc"><div class="sv p">${totalTimeStr}</div><div class="sl">เวลารวมทั้งหมด</div></div>
        <div class="sc"><div class="sv a">${reportItems.length > 0 ? Math.round(totalMin / reportItems.length) : 0}น.</div><div class="sl">เฉลี่ย/จุด</div></div>
        <div class="sc"><div class="sv b">${totalDistKm > 0 ? totalDistKm.toFixed(1) + "กม." : "N/A"}</div><div class="sl">ระยะทาง GPS</div></div>
        <div class="sc"><div class="sv">${byDate.size}</div><div class="sl">วันออกพื้นที่</div></div>
      </div>

      ${detailSections}

      <div class="footer">
        <span>บริษัท สแตนดาร์ดทัวร์ จำกัด · Standard Tour Co., Ltd.</span>
        <span>Field Sale CRM · ${exportDateStr}</span>
      </div>

    </body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 600);
  }, [reportRep, reportItems, range]);

  /* ── Export PDF (print window) ── */
  const exportPDF = useCallback(() => {
    const win = window.open("", "_blank");
    if (!win) return;
    const rangeLabel = range.label;
    const now = new Date();
    const exportDateStr = now.toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
    const exportTimeStr = now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false });

    function fmtMin(m: number) {
      const h = Math.floor(m / 60); const r = m % 60;
      return h > 0 ? `${h}ชม.${r}น.` : `${m}น.`;
    }

    const totalRows = stats.reduce((a, s) => ({
      routes: a.routes + s.routes, planned: a.planned + s.planned,
      completed: a.completed + s.completed, skipped: a.skipped + s.skipped,
      totalMin: a.totalMin + s.totalMin,
    }), { routes: 0, planned: 0, completed: 0, skipped: 0, totalMin: 0 });
    const overallRateCalc = totalRows.planned ? Math.round((totalRows.completed / totalRows.planned) * 100) : 0;

    const rows = stats.map((s, i) => {
      const rate = s.planned ? Math.round((s.completed / s.planned) * 100) : 0;
      const rateColor = rate >= 80 ? "#059669" : rate >= 50 ? "#b45309" : "#dc2626";
      return `<tr class="${i % 2 === 1 ? "alt" : ""}">
        <td class="rep-cell">${s.rep}</td>
        <td class="tc">${s.routes}</td>
        <td class="tc">${s.planned}</td>
        <td class="tc cg">${s.completed}</td>
        <td class="tc cr">${s.skipped}</td>
        <td class="tc">${fmtMin(s.totalMin)}</td>
        <td class="tc">${fmtMin(s.avgMin)}</td>
        <td class="tc" style="color:${rateColor};font-weight:700">${rate}%</td>
      </tr>`;
    }).join("");

    const completedRows = completedItems.map((s, i) => {
      const dt = s.completed_at ? new Date(s.completed_at) : null;
      const dd2 = dt ? String(dt.getDate()).padStart(2,"0") : "";
      const mm2 = dt ? String(dt.getMonth()+1).padStart(2,"0") : "";
      const yy2 = dt ? String(dt.getFullYear()).slice(2) : "";
      const hh2 = dt ? String(dt.getHours()).padStart(2,"0") : "";
      const mi2 = dt ? String(dt.getMinutes()).padStart(2,"0") : "";
      const dateStr = dd2 ? `${dd2}/${mm2}/${yy2}` : "-";
      const timeStr = hh2 ? `${hh2}:${mi2}` : "-";
      return `<tr class="${i % 2 === 1 ? "alt" : ""}">
        <td><span class="rep-tag">${s.rep}</span></td>
        <td><div class="pn">${s.place_name || "-"}</div></td>
        <td><span class="ptag">${s.purpose || "-"}</span></td>
        <td class="tc mono">${dateStr}</td>
        <td class="tc mono">${timeStr}</td>
        <td class="tc" style="color:#7c3aed;font-weight:700;white-space:nowrap">${fmtMin(s.duration_min ?? 0)}</td>
        <td class="note-cell">${s.note ? `"${s.note}"` : "<span class='nd'>—</span>"}</td>
      </tr>`;
    }).join("");

    win.document.write(`<!DOCTYPE html><html lang="th"><head>
      <meta charset="utf-8">
      <title>Sales Mission Report — ${rangeLabel}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link href="https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;700&display=swap" rel="stylesheet">
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Google Sans',Arial,sans-serif;font-size:8pt;color:#1e293b;background:#fff;padding:16px 20px;line-height:1.3}
        /* ── Header ── */
        .hdr{display:flex;align-items:flex-start;justify-content:space-between;padding-bottom:9px;margin-bottom:9px;border-bottom:3px solid #7c3aed}
        .co{font-size:8.5pt;font-weight:700;color:#7c3aed}
        .ht{font-size:13pt;font-weight:700;color:#1e293b;margin:2px 0 1px}
        .hsub{font-size:7pt;color:#64748b;margin-top:2px}
        .badge{background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;border-radius:8px;padding:6px 14px;text-align:right}
        .bn{font-size:11pt;font-weight:700;white-space:nowrap}
        .bs{font-size:6.5pt;color:#c4b5fd;margin-top:1px}
        /* ── Summary bar ── */
        .sum{display:flex;gap:0;margin-bottom:9px;border:1.5px solid #e2e8f0;border-radius:8px;overflow:hidden}
        .sc{flex:1;padding:6px 8px;background:#faf9ff;border-right:1px solid #e2e8f0;text-align:center}
        .sc:last-child{border-right:none}
        .sv{font-size:11pt;font-weight:700;white-space:nowrap;letter-spacing:-0.02em}
        .sl{font-size:6pt;color:#64748b;margin-top:1px}
        .cg2{color:#059669}.cp{color:#7c3aed}.ca{color:#b45309}.cb{color:#0369a1}
        /* ── Section heading ── */
        .sec{font-size:9pt;font-weight:700;color:#4c1d95;margin:10px 0 5px;padding-left:8px;border-left:3px solid #7c3aed}
        /* ── Tables ── */
        table{border-collapse:collapse;width:100%;font-size:7.5pt}
        thead tr{background:linear-gradient(90deg,#7c3aed,#6d28d9)}
        thead th{padding:4px 6px;text-align:left;font-weight:700;font-size:7pt;color:#fff}
        .tc{text-align:center}
        tbody td{padding:2.5px 6px;border-bottom:1px solid #f1f5f9;vertical-align:middle;line-height:1.2}
        tbody tr.alt{background:#f8f7ff}
        tfoot td{padding:3px 6px;background:#ede9fe;font-weight:700;font-size:7.5pt;border-top:1.5px solid #ddd6fe}
        .cg{color:#059669;font-weight:700}
        .cr{color:#dc2626;font-weight:600}
        .rep-cell{font-weight:600;color:#1e293b}
        .rep-tag{background:#ede9fe;color:#5b21b6;border-radius:3px;padding:1px 5px;font-size:6.5pt;font-weight:700;white-space:nowrap}
        .pn{font-weight:600;font-size:7.5pt;color:#1e293b}
        .ptag{background:#f0fdf4;color:#166534;border-radius:3px;padding:1px 5px;font-size:6.5pt;font-weight:600;white-space:nowrap}
        .mono{font-size:7pt;color:#475569}
        .note-cell{font-size:7pt;color:#374151;font-style:italic;line-height:1.2}
        .nd{color:#cbd5e1;font-style:normal}
        /* ── Footer ── */
        .footer{margin-top:12px;padding-top:7px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:6.5pt;color:#94a3b8}
        @media print{body{padding:6px 10px}@page{size:A4;margin:10mm 8mm}}
      </style>
    </head><body>

      <div class="hdr">
        <div>
          <div class="co">บริษัท สแตนดาร์ดทัวร์ จำกัด</div>
          <div class="ht">Sales Mission Report</div>
          <div class="hsub">ช่วงเวลา: ${rangeLabel} &nbsp;·&nbsp; ส่งออก: ${exportDateStr} ${exportTimeStr}</div>
        </div>
        <div class="badge">
          <div class="bn">${overallRateCalc}%</div>
          <div class="bs">อัตราเสร็จงาน</div>
        </div>
      </div>

      <div class="sum">
        <div class="sc"><div class="sv cb">${totalRows.routes}</div><div class="sl">Routes ทั้งหมด</div></div>
        <div class="sc"><div class="sv cp">${totalRows.planned}</div><div class="sl">จุดที่วางแผน</div></div>
        <div class="sc"><div class="sv cg2">${totalRows.completed}</div><div class="sl">Complete แล้ว</div></div>
        <div class="sc"><div class="sv cr">${totalRows.skipped}</div><div class="sl">Skipped</div></div>
        <div class="sc"><div class="sv">${fmtMin(totalRows.totalMin)}</div><div class="sl">เวลารวมทั้งหมด</div></div>
        <div class="sc"><div class="sv">${stats.length}</div><div class="sl">จำนวน Sales</div></div>
      </div>

      <div class="sec">ตารางสรุปรายคน</div>
      <table>
        <thead><tr>
          <th>Sales</th>
          <th class="tc" style="width:52px">Routes</th>
          <th class="tc" style="width:52px">วางแผน</th>
          <th class="tc" style="width:60px">Complete</th>
          <th class="tc" style="width:52px">Skipped</th>
          <th class="tc" style="width:72px">เวลารวม</th>
          <th class="tc" style="width:65px">เฉลี่ย/จุด</th>
          <th class="tc" style="width:52px">% เสร็จ</th>
        </tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr>
          <td>รวมทั้งหมด</td>
          <td class="tc">${totalRows.routes}</td>
          <td class="tc">${totalRows.planned}</td>
          <td class="tc cg">${totalRows.completed}</td>
          <td class="tc cr">${totalRows.skipped}</td>
          <td class="tc">${fmtMin(totalRows.totalMin)}</td>
          <td class="tc">—</td>
          <td class="tc" style="color:#7c3aed">${overallRateCalc}%</td>
        </tr></tfoot>
      </table>

      ${completedItems.length > 0 ? `
      <div class="sec">รายการ Mission Complete (${completedItems.length} รายการ)</div>
      <table>
        <thead><tr>
          <th style="width:68px">Sales</th>
          <th>สถานที่</th>
          <th style="width:18%">ประเภท</th>
          <th class="tc" style="width:58px">วันที่</th>
          <th class="tc" style="width:40px">เวลา</th>
          <th class="tc" style="width:54px">ใช้เวลา</th>
          <th>หมายเหตุ</th>
        </tr></thead>
        <tbody>${completedRows}</tbody>
      </table>` : ""}

      <div class="footer">
        <span>บริษัท สแตนดาร์ดทัวร์ จำกัด · Standard Tour Co., Ltd.</span>
        <span>Field Sale CRM · ${exportDateStr}</span>
      </div>

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
          <DateRangeFilter value={preset} custom={custom} onChange={(p, c) => { setPreset(p); setCustom(c); setCompletedPage(1); }} />
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
              <DateRangeFilter value={preset} custom={custom} onChange={(p, c) => { setPreset(p); setCustom(c); setCompletedPage(1); }} />
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
          <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
            <Button
              variant="default"
              onClick={downloadRouteReportPDF}
              disabled={reportItems.length === 0}
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              <Printer className="w-4 h-4" />
              Download PDF
            </Button>
            <Button variant="outline" onClick={() => setReportRep(null)}>ปิด</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Completed items list with pagination ── */}
      {(() => {
        const totalPages = Math.max(1, Math.ceil(completedItems.length / COMPLETED_PAGE_SIZE));
        const safePage = Math.min(completedPage, totalPages);
        const pageItems = completedItems.slice((safePage - 1) * COMPLETED_PAGE_SIZE, safePage * COMPLETED_PAGE_SIZE);
        return (
          <div className="bg-card rounded-xl border shadow-soft overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success" />
                <h2 className="font-bold text-sm">Mission Complete ของทีม</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">ใหม่ → เก่า</span>
                <Badge variant="outline" className="text-xs">{completedItems.length} รายการ</Badge>
              </div>
            </div>

            {/* List */}
            {completedItems.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground text-sm">ไม่มีรายการในช่วงเวลานี้</div>
            ) : (
              <ul className="divide-y">
                {pageItems.map((s, idx) => {
                  const rowNo = (safePage - 1) * COMPLETED_PAGE_SIZE + idx + 1;
                  return (
                    <li key={`${s.route_id}-${s.stop_id}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 transition-colors">
                      {/* Row number */}
                      <span className="text-[11px] text-muted-foreground/60 w-5 text-right shrink-0 font-mono">{rowNo}</span>

                      {/* Thumbnail */}
                      <div className="w-11 h-9 rounded-md bg-muted/60 overflow-hidden flex items-center justify-center shrink-0 border border-border/50">
                        {s.field_photo_url ? (
                          <img src={s.field_photo_url} alt={s.place_name} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-muted-foreground/40" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Name + badges row */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-semibold text-sm truncate leading-tight">{s.place_name}</p>
                          <Badge className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/20 font-medium">{s.rep}</Badge>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{s.purpose}</Badge>
                        </div>
                        {/* Meta row */}
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                            <CalendarClock className="w-3 h-3 shrink-0" />{fmtDateTime(s.completed_at)}
                          </span>
                          <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                            <Clock className="w-3 h-3 shrink-0" />{s.duration_min ?? 0} นาที
                          </span>
                          {s.note && (
                            <span className="text-[11px] text-muted-foreground italic truncate max-w-[240px]">
                              "{s.note}"
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Pagination footer */}
            {totalPages > 1 && (
              <div className="px-4 py-2.5 border-t bg-muted/10 flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">
                  หน้า {safePage} / {totalPages} · แสดง {(safePage - 1) * COMPLETED_PAGE_SIZE + 1}–{Math.min(safePage * COMPLETED_PAGE_SIZE, completedItems.length)} จาก {completedItems.length}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline" size="icon"
                    className="w-7 h-7"
                    disabled={safePage <= 1}
                    onClick={() => setCompletedPage(safePage - 1)}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                    .reduce<(number | "…")[]>((acc, p, i, arr) => {
                      if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push("…");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      p === "…" ? (
                        <span key={`ellipsis-${i}`} className="px-1 text-xs text-muted-foreground">…</span>
                      ) : (
                        <Button
                          key={p}
                          variant={p === safePage ? "default" : "outline"}
                          size="icon"
                          className={`w-7 h-7 text-xs ${p === safePage ? "bg-primary text-primary-foreground" : ""}`}
                          onClick={() => setCompletedPage(p as number)}
                        >
                          {p}
                        </Button>
                      )
                    )}
                  <Button
                    variant="outline" size="icon"
                    className="w-7 h-7"
                    disabled={safePage >= totalPages}
                    onClick={() => setCompletedPage(safePage + 1)}
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}