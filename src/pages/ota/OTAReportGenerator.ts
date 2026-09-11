/**
 * OTAReportGenerator.ts
 * สร้างรายงาน OTA Monthly Report เป็น HTML → พิมพ์เป็น A4 PDF
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OTAReportInput {
  month: number;
  year: number;
  monthName: string;
  generatedAt: string;
  // KPIs
  totalOrders: number;
  totalRevenue: number;
  totalGross: number;
  totalPax: number;
  avgPax: string;
  revPAX: number;
  uniqueGroups: number;
  ytdRevenue: number;
  commissionTotal: number;
  discountTotal: number;
  // MoM
  prevOrders: number;
  prevRevenue: number;
  prevPax: number;
  // Data arrays
  revenueByPlatform: Array<{ name: string; gross: number; net: number }>;
  platformOrderData: Array<{ name: string; value: number }>;
  monthlyData: Array<{ name: string; orders: number; revenue: number; pax: number }>;
  revenueByPackage: Array<{ name: string; revenue: number; pax: number }>;
  nationalityData: Array<{ name: string; pax: number }>;
  // Page 2 extras
  topPickupHotels: Array<{ name: string; count: number }>;
}

// ── Colors ────────────────────────────────────────────────────────────────────

const PLATFORM_COLOR: Record<string, string> = {
  "Trip.com":       "#f59e0b",
  "KKday":          "#ec4899",
  "Agent Offline":  "#8b5cf6",
  "GetYourGuide":   "#10b981",
  "Viator":         "#ef4444",
  "Airbnb":         "#f97316",
};
const PALETTE = ["#7c3aed","#db2777","#f59e0b","#10b981","#3b82f6","#ef4444","#8b5cf6","#f97316"];
const col = (name: string, i: number) => PLATFORM_COLOR[name] ?? PALETTE[i % PALETTE.length];

// ── Formatters ────────────────────────────────────────────────────────────────

const fmtB  = (n: number) => `฿${Math.round(n).toLocaleString("th-TH")}`;
const fmtBK = (n: number) =>
  n >= 1_000_000 ? `฿${(n / 1_000_000).toFixed(2)}M`
  : n >= 1_000   ? `฿${(n / 1_000).toFixed(1)}k`
  : fmtB(n);

function momHTML(curr: number, prev: number): string {
  if (prev === 0) return `<span style="font-size:10px;color:#94a3b8">ไม่มีข้อมูลเดือนก่อน</span>`;
  const pct = ((curr - prev) / prev) * 100;
  const up  = pct >= 0;
  return `<span style="color:${up ? "#16a34a" : "#dc2626"};font-size:10px;font-weight:700">
    ${up ? "▲" : "▼"} ${Math.abs(pct).toFixed(0)}% จากเดือนก่อน
  </span>`;
}

// ── SVG: Horizontal bar chart ─────────────────────────────────────────────────

function hBar(
  data: Array<{ name: string; value: number; color: string }>,
  vw = 400, rowH = 24,
): string {
  const max = Math.max(...data.map((d) => d.value), 1);
  const labelW = 110;
  const valW   = 80;
  const barAreaW = vw - labelW - valW - 8;
  const rows = data.map((d, i) => {
    const bw = Math.round((d.value / max) * barAreaW);
    const y  = i * rowH;
    const my = y + rowH * 0.68;
    return [
      `<text x="0" y="${my}" font-size="10" fill="#374151">${d.name}</text>`,
      `<rect x="${labelW}" y="${y + 4}" width="${bw}" height="${rowH - 9}" rx="3" fill="${d.color}" opacity="0.85"/>`,
      `<text x="${labelW + bw + 5}" y="${my}" font-size="10" fill="#374151">${fmtB(d.value)}</text>`,
    ].join("");
  });
  const svgH = data.length * rowH;
  return `<svg width="100%" viewBox="0 0 ${vw} ${svgH}" xmlns="http://www.w3.org/2000/svg"
    style="overflow:visible">${rows.join("")}</svg>`;
}

// ── SVG: Vertical grouped bar chart (revenue + orders) ────────────────────────

function vBar(
  data: Array<{ name: string; orders: number; revenue: number }>,
  vw = 420, vh = 140,
): string {
  const pL = 8, pB = 22, pT = 18;
  const chartW = vw - pL - 4;
  const chartH = vh - pB - pT;
  const n = data.length;
  const slot = chartW / n;
  const bw = Math.max(6, Math.floor(slot * 0.28));
  const maxRev = Math.max(...data.map((d) => d.revenue), 1);
  const maxOrd = Math.max(...data.map((d) => d.orders), 1);

  let els = "";
  // grid lines
  [0.25, 0.5, 0.75, 1].forEach((f) => {
    const y = pT + chartH - f * chartH;
    els += `<line x1="${pL}" y1="${y}" x2="${pL + chartW}" y2="${y}" stroke="#f1f5f9" stroke-width="1"/>`;
  });
  // axes
  els += `<line x1="${pL}" y1="${pT}" x2="${pL}" y2="${pT + chartH}" stroke="#e2e8f0" stroke-width="1"/>`;
  els += `<line x1="${pL}" y1="${pT + chartH}" x2="${pL + chartW}" y2="${pT + chartH}" stroke="#e2e8f0" stroke-width="1"/>`;

  data.forEach((d, i) => {
    const cx = pL + i * slot + slot / 2;
    // revenue bar (purple)
    const revH = Math.round((d.revenue / maxRev) * chartH);
    const ry   = pT + chartH - revH;
    els += `<rect x="${cx - bw - 1}" y="${ry}" width="${bw}" height="${revH}" rx="2" fill="#7c3aed" opacity="0.85"/>`;
    if (d.revenue > 0)
      els += `<text x="${cx - bw / 2 - 1}" y="${ry - 3}" text-anchor="middle" font-size="8" fill="#7c3aed">${d.revenue}k</text>`;
    // orders bar (pink)
    const ordH = Math.round((d.orders / maxOrd) * chartH);
    const oy   = pT + chartH - ordH;
    els += `<rect x="${cx + 1}" y="${oy}" width="${bw}" height="${ordH}" rx="2" fill="#db2777" opacity="0.85"/>`;
    if (d.orders > 0)
      els += `<text x="${cx + bw / 2 + 1}" y="${oy - 3}" text-anchor="middle" font-size="8" fill="#db2777">${d.orders}</text>`;
    // x-label
    els += `<text x="${cx}" y="${vh - 4}" text-anchor="middle" font-size="9" fill="#64748b">${d.name}</text>`;
  });

  // legend
  const ly = pT - 6;
  els += `<rect x="${pL + chartW - 110}" y="${ly - 7}" width="7" height="7" rx="1" fill="#7c3aed"/>`;
  els += `<text x="${pL + chartW - 100}" y="${ly}" font-size="8" fill="#374151">Revenue (฿k)</text>`;
  els += `<rect x="${pL + chartW - 48}" y="${ly - 7}" width="7" height="7" rx="1" fill="#db2777"/>`;
  els += `<text x="${pL + chartW - 38}" y="${ly}" font-size="8" fill="#374151">Orders</text>`;

  return `<svg width="100%" viewBox="0 0 ${vw} ${vh}" xmlns="http://www.w3.org/2000/svg">${els}</svg>`;
}

// ── SVG: Pie chart ────────────────────────────────────────────────────────────

function pie(data: Array<{ name: string; value: number }>, size = 90): string {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return `<svg width="${size}" height="${size}"></svg>`;
  const cx = size / 2, cy = size / 2, r = size / 2 - 2;
  let angle = -Math.PI / 2;
  const paths = data.map((d, i) => {
    const sweep = (d.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(angle);
    const y1 = cy + r * Math.sin(angle);
    const x2 = cx + r * Math.cos(angle + sweep);
    const y2 = cy + r * Math.sin(angle + sweep);
    const lg = sweep > Math.PI ? 1 : 0;
    const c  = col(d.name, i);
    const path = `<path d="M${cx} ${cy} L${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 ${lg} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}Z" fill="${c}" opacity="0.9"/>`;
    angle += sweep;
    return path;
  });
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">${paths.join("")}</svg>`;
}

// ── Main HTML Generator ───────────────────────────────────────────────────────

export function generateOTAReportHTML(d: OTAReportInput): string {
  const genDate = new Date(d.generatedAt).toLocaleDateString("th-TH", {
    day: "numeric", month: "long", year: "numeric",
  });
  const marginPct = d.totalGross > 0
    ? (100 - (d.commissionTotal / d.totalGross) * 100).toFixed(1)
    : "0";
  const commPct   = d.totalGross > 0
    ? ((d.commissionTotal / d.totalGross) * 100).toFixed(1)
    : "0";

  const revPlatSorted = [...d.revenueByPlatform]
    .sort((a, b) => b.net - a.net).slice(0, 6)
    .map((p, i) => ({ name: p.name, value: p.net, color: col(p.name, i) }));

  const pieData   = [...d.platformOrderData].sort((a, b) => b.value - a.value);
  const pieTotal  = pieData.reduce((s, p) => s + p.value, 0);
  const trend6    = d.monthlyData.slice(-6);
  const topPkgs   = [...d.revenueByPackage].sort((a, b) => b.revenue - a.revenue).slice(0, 6);
  const natTotal  = d.nationalityData.reduce((s, n) => s + n.pax, 0);
  const nat7      = d.nationalityData.slice(0, 7);

  const css = `
    @page { size: A4 portrait; margin: 12mm 13mm 10mm 13mm; }
    *,*::before,*::after { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:'Segoe UI',system-ui,sans-serif; font-size:11px; color:#1e293b;
           background:#fff; -webkit-print-color-adjust:exact; print-color-adjust:exact; }

    /* ── Header */
    .hdr { display:flex; align-items:center; justify-content:space-between;
           padding-bottom:8px; border-bottom:2.5px solid #7c3aed; margin-bottom:10px; }
    .logo { display:flex; align-items:center; gap:9px; }
    .logo-badge { width:38px; height:38px; background:linear-gradient(135deg,#7c3aed,#a855f7);
                  border-radius:9px; display:flex; align-items:center; justify-content:center;
                  color:#fff; font-weight:900; font-size:11px; flex-shrink:0; }
    .logo h1 { font-size:16px; font-weight:800; color:#1e293b; line-height:1.2; }
    .logo p  { font-size:10px; color:#7c3aed; font-weight:600; }
    .hdr-r { text-align:right; font-size:10px; color:#64748b; line-height:1.8; }
    .month-badge { background:#7c3aed; color:#fff; padding:3px 12px; border-radius:20px;
                   font-weight:800; font-size:13px; display:inline-block; margin-bottom:2px; }

    /* ── KPI row */
    .kpi-row { display:grid; grid-template-columns:repeat(4,1fr); gap:7px; margin-bottom:10px; }
    .kpi { border:1px solid #e2e8f0; border-radius:10px; padding:9px 10px; background:#fafafe; }
    .kpi.p { border-left:3px solid #7c3aed; }
    .kpi.k { border-left:3px solid #db2777; }
    .kpi.a { border-left:3px solid #f59e0b; }
    .kpi.t { border-left:3px solid #14b8a6; }
    .kpi-lbl { font-size:9px; color:#64748b; font-weight:600; text-transform:uppercase;
               letter-spacing:.05em; margin-bottom:3px; }
    .kpi-val { font-size:22px; font-weight:900; color:#1e293b; line-height:1; margin-bottom:3px; }
    .kpi-sub { font-size:9px; color:#94a3b8; margin-top:2px; }

    /* ── Layout */
    .row { display:grid; gap:8px; margin-bottom:9px; }
    .row-3-2 { grid-template-columns:3fr 2fr; }
    .row-half { grid-template-columns:1fr 1fr; }
    .panel { border:1px solid #e2e8f0; border-radius:10px; padding:9px 10px; }

    /* ── Section title */
    .stitle { font-size:9px; font-weight:800; color:#7c3aed; text-transform:uppercase;
              letter-spacing:.06em; margin-bottom:7px; display:flex; align-items:center; gap:5px; }
    .stitle::before { content:''; display:inline-block; width:3px; height:11px;
                      background:#7c3aed; border-radius:2px; flex-shrink:0; }

    /* ── Profitability */
    .prow { display:flex; justify-content:space-between; align-items:center;
            padding:5px 0; border-bottom:1px dashed #e2e8f0; }
    .prow:last-of-type { border-bottom:none; }
    .prow .lbl { font-size:11px; color:#475569; }
    .prow .val { font-size:12px; font-weight:700; }
    .prow.ded .val { color:#ef4444; }
    .prow.net .lbl { color:#7c3aed; font-weight:700; }
    .prow.net .val { color:#7c3aed; font-size:15px; }
    .pct-tag { font-size:9px; color:#94a3b8; margin-left:4px; }
    .margin-box { margin-top:8px; background:#f8f7ff; border-radius:6px;
                  padding:6px 8px; font-size:9px; color:#64748b; }

    /* ── Table */
    table { width:100%; border-collapse:collapse; font-size:10px; }
    th { background:#f1f0fe; color:#6d28d9; font-weight:700; padding:5px 6px;
         text-align:left; font-size:9px; text-transform:uppercase; letter-spacing:.04em; }
    th.r, td.r { text-align:right; }
    th.c, td.c { text-align:center; }
    td { padding:5px 6px; border-bottom:1px solid #f1f5f9; color:#374151; }
    td.rank { font-weight:900; color:#7c3aed; text-align:center; }
    tr:nth-child(even) td { background:#faf9ff; }
    tr:last-child td { border-bottom:none; }
    .rev-cell { color:#7c3aed; font-weight:700; }

    /* ── Nationality bars */
    .nat-row { display:flex; align-items:center; gap:5px; margin-bottom:5px; }
    .nat-lbl { font-size:10px; color:#374151; min-width:78px; white-space:nowrap;
               overflow:hidden; text-overflow:ellipsis; }
    .nat-bg { flex:1; background:#f1f5f9; border-radius:3px; height:8px; overflow:hidden; }
    .nat-fill { height:100%; border-radius:3px; background:linear-gradient(90deg,#7c3aed,#a855f7); }
    .nat-pct { font-size:9px; color:#7c3aed; font-weight:700; min-width:26px; text-align:right; }
    .nat-n   { font-size:9px; color:#94a3b8; min-width:28px; text-align:right; }

    /* ── Pie legend */
    .pie-wrap { display:flex; align-items:center; gap:10px; }
    .pie-legend { flex:1; }
    .leg-row { display:flex; align-items:center; gap:5px; margin-bottom:4px; }
    .leg-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
    .leg-txt { font-size:10px; color:#374151; flex:1; }
    .leg-pct { font-size:10px; font-weight:700; color:#374151; }

    /* ── Footer */
    .footer { border-top:1px solid #e2e8f0; margin-top:8px; padding-top:6px;
              display:flex; justify-content:space-between; font-size:9px; color:#94a3b8; }

    /* ── Print button (hidden when printing) */
    .print-btn { position:fixed; bottom:20px; right:20px; background:#7c3aed; color:#fff;
                 border:none; padding:10px 22px; border-radius:10px; font-size:13px;
                 font-weight:700; cursor:pointer; box-shadow:0 4px 14px rgba(124,58,237,.4);
                 z-index:999; }
    @media print { .print-btn { display:none; } }

    /* ── Page 2 */
    .page2 { page-break-before:always; padding-top:4px; }
    .page2-hdr { display:flex; align-items:center; justify-content:space-between;
                 padding-bottom:6px; border-bottom:2px solid #7c3aed; margin-bottom:9px; }
    .page2-hdr-l { font-size:12px; font-weight:800; color:#1e293b; }
    .page2-hdr-r { font-size:10px; color:#64748b; }
    .hotel-row { display:flex; align-items:center; gap:8px; padding:5px 0;
                 border-bottom:1px solid #f1f5f9; }
    .hotel-row:last-child { border-bottom:none; }
    .hotel-rank { width:18px; height:18px; border-radius:50%; display:flex; align-items:center;
                  justify-content:center; font-size:9px; font-weight:900; color:#fff; flex-shrink:0; }
    .hotel-name { flex:1; font-size:10px; color:#374151; }
    .hotel-bar-bg { width:70px; background:#f1f5f9; border-radius:3px; height:7px; overflow:hidden; }
    .hotel-bar-fill { height:100%; border-radius:3px; background:#7c3aed; }
    .hotel-cnt { font-size:10px; font-weight:700; color:#7c3aed; min-width:32px; text-align:right; }
    .com-rate { font-size:9px; color:#94a3b8; }
  `;

  return `<!DOCTYPE html>
<html lang="th">
<head><meta charset="UTF-8"/><title>OTA Report · ${d.monthName} ${d.year}</title>
<style>${css}</style></head>
<body>

<button class="print-btn" onclick="window.print()">🖨 พิมพ์ / บันทึก PDF</button>

<!-- HEADER -->
<div class="hdr">
  <div class="logo">
    <div class="logo-badge">OTA</div>
    <div>
      <h1>Standard Tour</h1>
      <p>OTA Monthly Performance Report</p>
    </div>
  </div>
  <div class="hdr-r">
    <div class="month-badge">${d.monthName} ${d.year}</div><br/>
    สร้างเมื่อ ${genDate} &nbsp;·&nbsp; ข้อมูลจาก ${d.revenueByPlatform.length} Platforms
  </div>
</div>

<!-- KPI ROW -->
<div class="kpi-row">
  <div class="kpi p">
    <div class="kpi-lbl">💰 Net Revenue</div>
    <div class="kpi-val">${fmtBK(d.totalRevenue)}</div>
    <div>${momHTML(d.totalRevenue, d.prevRevenue)}</div>
  </div>
  <div class="kpi k">
    <div class="kpi-lbl">📋 Orders รวม</div>
    <div class="kpi-val">${d.totalOrders}</div>
    <div>${momHTML(d.totalOrders, d.prevOrders)}</div>
  </div>
  <div class="kpi a">
    <div class="kpi-lbl">👥 Pax รวม</div>
    <div class="kpi-val">${d.totalPax}</div>
    <div>${momHTML(d.totalPax, d.prevPax)}</div>
    <div class="kpi-sub">เฉลี่ย ${d.avgPax} คน / order</div>
  </div>
  <div class="kpi t">
    <div class="kpi-lbl">📈 YTD Revenue</div>
    <div class="kpi-val">${fmtBK(d.ytdRevenue)}</div>
    <div class="kpi-sub">RevPAX ${fmtB(Math.round(d.revPAX))}/คน &nbsp;·&nbsp; ${d.uniqueGroups} กรุ๊ป</div>
  </div>
</div>

<!-- ZONE 2: Revenue by Platform + Profitability -->
<div class="row row-3-2">
  <div class="panel">
    <div class="stitle">รายได้สุทธิแยกตาม Platform</div>
    ${hBar(revPlatSorted, 400, 24)}
  </div>
  <div class="panel">
    <div class="stitle">Profitability</div>
    <div class="prow">
      <div class="lbl">Gross Revenue</div>
      <div class="val">${fmtB(d.totalGross)}</div>
    </div>
    <div class="prow ded">
      <div class="lbl">(−) Commission<span class="pct-tag">${commPct}%</span></div>
      <div class="val">−${fmtB(d.commissionTotal)}</div>
    </div>
    ${d.discountTotal > 0 ? `
    <div class="prow ded">
      <div class="lbl">(−) Discount</div>
      <div class="val">−${fmtB(d.discountTotal)}</div>
    </div>` : ""}
    <div class="prow net">
      <div class="lbl">= Net Revenue ✓</div>
      <div class="val">${fmtB(d.totalRevenue)}</div>
    </div>
    <div class="margin-box">
      กำไรหลัง commission:&nbsp;
      <strong style="color:#7c3aed">${marginPct}%</strong> ของ Gross Revenue
    </div>
  </div>
</div>

<!-- ZONE 3: Monthly Trend + Pie -->
<div class="row row-3-2">
  <div class="panel">
    <div class="stitle">แนวโน้ม 6 เดือนย้อนหลัง</div>
    ${vBar(trend6, 400, 140)}
  </div>
  <div class="panel">
    <div class="stitle">สัดส่วน Orders by Platform</div>
    <div class="pie-wrap">
      ${pie(pieData, 90)}
      <div class="pie-legend">
        ${pieData.map((p, i) => {
          const pct = pieTotal > 0 ? ((p.value / pieTotal) * 100).toFixed(0) : "0";
          return `<div class="leg-row">
            <div class="leg-dot" style="background:${col(p.name, i)}"></div>
            <div class="leg-txt">${p.name}</div>
            <div class="leg-pct">${pct}%</div>
          </div>`;
        }).join("")}
      </div>
    </div>
  </div>
</div>

<!-- ZONE 4: Top Packages + Nationality -->
<div class="row row-half">
  <div class="panel">
    <div class="stitle">Top Packages ที่ขายดีที่สุด</div>
    <table>
      <thead><tr>
        <th class="c" style="width:22px">#</th>
        <th>Package</th>
        <th class="r">Revenue</th>
        <th class="r">Pax</th>
        <th class="r">RevPAX</th>
      </tr></thead>
      <tbody>
        ${topPkgs.map((p, i) => `<tr>
          <td class="rank">${i + 1}</td>
          <td>${p.name}</td>
          <td class="r rev-cell">${fmtB(p.revenue)}</td>
          <td class="r">${p.pax}</td>
          <td class="r" style="color:#64748b">${p.pax > 0 ? fmtB(Math.round(p.revenue / p.pax)) : "−"}</td>
        </tr>`).join("")}
      </tbody>
    </table>
  </div>
  <div class="panel">
    <div class="stitle">กลุ่มลูกค้าแยกตามสัญชาติ</div>
    ${nat7.map((n) => {
      const pct = natTotal > 0 ? (n.pax / natTotal) * 100 : 0;
      return `<div class="nat-row">
        <div class="nat-lbl">${n.name}</div>
        <div class="nat-bg"><div class="nat-fill" style="width:${pct.toFixed(0)}%"></div></div>
        <div class="nat-pct">${pct.toFixed(0)}%</div>
        <div class="nat-n">${n.pax} คน</div>
      </div>`;
    }).join("")}
  </div>
</div>

<!-- FOOTER page 1 -->
<div class="footer">
  <span>Standard Tour · OTA Monthly Report · ${d.monthName} ${d.year}</span>
  <span>Confidential — สำหรับฝ่ายบริหารเท่านั้น</span>
  <span>หน้า 1 / 2</span>
</div>

<!-- ═══════════════════════ PAGE 2 ═══════════════════════ -->
<div class="page2">

  <!-- PAGE 2 HEADER -->
  <div class="page2-hdr">
    <div class="page2-hdr-l">Standard Tour · OTA Monthly Report · ${d.monthName} ${d.year} — หน้า 2</div>
    <div class="page2-hdr-r">สร้างเมื่อ ${genDate}</div>
  </div>

  <!-- ZONE P2-A: Commission by Platform + Top Pickup Hotels -->
  <div class="row row-half" style="margin-bottom:9px">

    <!-- Commission by Platform -->
    <div class="panel">
      <div class="stitle">Commission แยกตาม Platform</div>
      <table>
        <thead><tr>
          <th>Platform</th>
          <th class="r">Gross (฿)</th>
          <th class="r">Commission (฿)</th>
          <th class="r">Rate</th>
          <th class="r">Net (฿)</th>
        </tr></thead>
        <tbody>
          ${[...d.revenueByPlatform].sort((a,b) => (b.gross-b.net)-(a.gross-a.net)).map((p, i) => {
            const comm = p.gross - p.net;
            const rate = p.gross > 0 ? (comm / p.gross * 100).toFixed(1) : "0.0";
            return `<tr>
              <td><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${col(p.name,i)};margin-right:4px;vertical-align:middle"></span>${p.name}</td>
              <td class="r">${fmtB(p.gross)}</td>
              <td class="r" style="color:#ef4444;font-weight:700">${fmtB(comm)}</td>
              <td class="r"><span class="com-rate">${rate}%</span></td>
              <td class="r rev-cell">${fmtB(p.net)}</td>
            </tr>`;
          }).join("")}
        </tbody>
        <tfoot>
          <tr style="background:#f8f7ff">
            <td style="font-weight:700;font-size:10px">รวมทั้งหมด</td>
            <td class="r" style="font-weight:700">${fmtB(d.totalGross)}</td>
            <td class="r" style="color:#ef4444;font-weight:700">${fmtB(d.commissionTotal)}</td>
            <td class="r"><span class="com-rate">${d.totalGross > 0 ? (d.commissionTotal/d.totalGross*100).toFixed(1) : "0.0"}%</span></td>
            <td class="r rev-cell">${fmtB(d.totalRevenue)}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- Top Pickup Hotels -->
    <div class="panel">
      <div class="stitle">Top Pickup Hotels</div>
      ${d.topPickupHotels.length === 0
        ? `<div style="color:#94a3b8;font-size:10px;padding:12px 0">ไม่มีข้อมูล Pickup Hotel</div>`
        : (() => {
          const maxCnt = Math.max(...d.topPickupHotels.map(h => h.count), 1);
          const rankColors = ["#7c3aed","#db2777","#f59e0b","#10b981","#3b82f6","#8b5cf6","#f97316","#14b8a6"];
          return d.topPickupHotels.map((h, i) => `
            <div class="hotel-row">
              <div class="hotel-rank" style="background:${rankColors[i] ?? "#94a3b8"}">${i+1}</div>
              <div class="hotel-name">${h.name}</div>
              <div class="hotel-bar-bg"><div class="hotel-bar-fill" style="width:${(h.count/maxCnt*100).toFixed(0)}%;background:${rankColors[i] ?? "#7c3aed"}"></div></div>
              <div class="hotel-cnt">${h.count} orders</div>
            </div>`).join("");
        })()
      }
    </div>

  </div>

  <!-- ZONE P2-B: Monthly Comparison (last 6 months) -->
  <div class="panel" style="margin-bottom:9px">
    <div class="stitle">เปรียบเทียบรายเดือน (6 เดือนย้อนหลัง)</div>
    <table>
      <thead><tr>
        <th>เดือน</th>
        <th class="r">Orders</th>
        <th class="r">PAX</th>
        <th class="r">Gross Revenue (฿)</th>
        <th class="r">เทียบเดือนก่อน</th>
      </tr></thead>
      <tbody>
        ${d.monthlyData.slice(-6).map((m, i, arr) => {
          const prev = arr[i - 1];
          const revDiff = prev ? m.revenue - prev.revenue : 0;
          const revPct  = prev && prev.revenue > 0 ? (revDiff / prev.revenue * 100) : 0;
          const trend = prev
            ? `<span style="color:${revDiff>=0?"#16a34a":"#dc2626"};font-weight:700">${revDiff>=0?"▲":"▼"} ${Math.abs(revPct).toFixed(0)}%</span>`
            : `<span style="color:#94a3b8;font-size:9px">—</span>`;
          return `<tr>
            <td style="font-weight:${i===arr.length-1?"700":"400"};color:${i===arr.length-1?"#7c3aed":"#374151"}">${m.name}</td>
            <td class="r">${m.orders}</td>
            <td class="r">${m.pax}</td>
            <td class="r rev-cell">${fmtB(m.revenue)}</td>
            <td class="r">${trend}</td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>
  </div>

  <!-- FOOTER page 2 -->
  <div class="footer">
    <span>Standard Tour · OTA Monthly Report · ${d.monthName} ${d.year}</span>
    <span>Confidential — สำหรับฝ่ายบริหารเท่านั้น</span>
    <span>หน้า 2 / 2</span>
  </div>

</div>

</body></html>`;
}

// ── Entry point ───────────────────────────────────────────────────────────────

export function downloadOTAReport(input: OTAReportInput): void {
  const html = generateOTAReportHTML(input);
  const win  = window.open("", "_blank", "width=960,height=800");
  if (!win) {
    alert("กรุณาอนุญาต Popup เพื่อดูรายงาน\n(คลิก Allow / อนุญาต popup แล้วลองใหม่)");
    return;
  }
  win.document.write(html);
  win.document.close();
}
