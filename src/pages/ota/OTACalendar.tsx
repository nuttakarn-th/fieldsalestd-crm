/**
 * OTACalendar.tsx — ตารางงานรายวัน จาก usage_date
 * v4: no "+more" truncation · Export PDF (no revenue) · Save JPG
 */
import { useMemo, useState, useRef, useCallback } from "react";
import { useOTAStore } from "@/store/otaStore";
import { ChevronLeft, ChevronRight, X, FileDown, Image } from "lucide-react";
import { toJpeg } from "html-to-image";

const today = new Date();

const MONTH_TH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const DAY_TH   = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสฯ", "ศุกร์", "เสาร์"];

function fmtTHDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return `${DAY_TH[d.getDay()]}ที่ ${d.getDate()} ${MONTH_TH[d.getMonth()]} ${d.getFullYear()}`;
}
function fmtMoney(n: number) {
  if (!n) return "—";
  return "฿" + n.toLocaleString("th-TH");
}
function fmtMoneyShort(n: number) {
  if (!n) return "—";
  if (n >= 1000000) return "฿" + (n / 1000000).toFixed(1) + "M";
  if (n >= 1000)    return "฿" + (n / 1000).toFixed(0) + "k";
  return "฿" + n;
}

interface PkgGroup {
  pkgId: string;
  code: string;
  name: string;
  totalPax: number;
  orderCount: number;
  totalRevenue: number;
  nationalities: string[];
  guides: string[];
}

function uniq(arr: (string | undefined)[]): string[] {
  return [...new Set(arr.filter(Boolean) as string[])];
}

// ── PDF export — layout matches JPG (no revenue) ─────────────────────────────
function buildCalendarPDF(
  year: number, month: number, monthName: string,
  byDayGrouped: Record<number, PkgGroup[]>,
  firstDay: number, daysInMonth: number,
  totalOrders: number, totalPax: number
): string {
  const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const now = new Date().toLocaleString("th-TH", {
    year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  let cells = "";
  for (let i = 0; i < firstDay; i++) {
    cells += `<div class="cell empty"></div>`;
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const groups = byDayGrouped[day] ?? [];
    const dayPax = groups.reduce((s, g) => s + g.totalPax, 0);
    const chips = groups.map(g =>
      `<div class="chip"><span class="chip-code">${g.code}</span><span class="chip-pax">${g.totalPax}p</span></div>`
    ).join("");
    cells += `
      <div class="cell">
        <div class="day-row">
          <span class="day-num">${day}</span>
          ${dayPax > 0 ? `<span class="day-pax">${dayPax} pax</span>` : ""}
        </div>
        <div class="chips">${chips}</div>
      </div>`;
  }

  return `<!DOCTYPE html><html lang="th">
<head>
<meta charset="UTF-8"/>
<title>OTA Calendar — ${monthName} ${year}</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  * { box-sizing: border-box; margin: 0; padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important; }
  body { font-family: Arial, sans-serif; background: #fff; color: #1f2937;
         -webkit-print-color-adjust: exact; print-color-adjust: exact; }

  /* ── OTA Header ── */
  .ota-header { display: flex; justify-content: space-between; align-items: flex-start;
                padding: 14px 18px 12px; border-bottom: 1px solid #e5e7eb; }
  .brand-sub   { font-size: 9pt; font-weight: 700; color: #7c3aed; letter-spacing: 0.04em; }
  .brand-title { font-size: 20pt; font-weight: 900; color: #1f2937; line-height: 1.1; }
  .brand-desc  { font-size: 8.5pt; color: #6b7280; margin-top: 2px; }
  .brand-date  { font-size: 7.5pt; color: #9ca3af; margin-top: 1px; }
  .ota-kpi { display: flex; gap: 24px; margin-top: 4px; }
  .kpi-item { text-align: center; }
  .kpi-num  { font-size: 24pt; font-weight: 900; color: #7c3aed; line-height: 1; }
  .kpi-lbl  { font-size: 7.5pt; color: #6b7280; font-weight: 600; margin-top: 2px; }

  /* ── Gradient month bar ── */
  .month-bar { background: linear-gradient(135deg, #4c1d95 0%, #be185d 100%) !important;
               text-align: center; padding: 10px 0; color: #fff !important;
               font-size: 16pt; font-weight: 800; }

  /* ── Day headers ── */
  .day-headers { display: grid; grid-template-columns: repeat(7, 1fr); }
  .dh { text-align: center; font-size: 7.5pt; font-weight: 700; padding: 5px 0;
        border-right: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb;
        background: #f5f3ff !important; }
  .dh.we { color: #be185d !important; }
  .dh.wd { color: #6d28d9 !important; }

  /* ── Grid ── */
  .grid { display: grid; grid-template-columns: repeat(7, 1fr);
          border-left: 1px solid #e5e7eb; border-top: 1px solid #e5e7eb; }
  .cell { border-right: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb;
          min-height: 75px; padding: 5px 6px; background: #fff !important; }
  .cell.empty { background: #fafafa !important; }
  .day-row { display: flex; justify-content: space-between; align-items: center;
             margin-bottom: 4px; }
  .day-num { font-size: 9.5pt; font-weight: 700; color: #374151; }
  .day-pax { font-size: 7pt; font-weight: 700; color: #7c3aed !important; }
  .chips { display: flex; flex-direction: column; gap: 3px; }
  .chip { display: flex; justify-content: space-between; align-items: center;
          background: #ede9fe !important; border-radius: 4px; padding: 3px 6px; }
  .chip-code { font-family: monospace; font-size: 7.5pt; font-weight: 700; color: #5b21b6 !important; }
  .chip-pax  { font-size: 7pt; font-weight: 700; color: #7c3aed !important; }

  /* ── Footer ── */
  .footer { padding: 6px 18px; text-align: right; font-size: 7.5pt; color: #9ca3af;
            border-top: 1px solid #f3f4f6; margin-top: 4px; }
</style>
</head>
<body>
  <div class="ota-header">
    <div class="ota-brand">
      <div class="brand-sub">OTA (Standard Tour)</div>
      <div class="brand-title">Calendar</div>
      <div class="brand-desc">Daily itinerary schedule by usage date</div>
      <div class="brand-date">ดาวน์โหลดเมื่อ ${now}</div>
    </div>
    <div class="ota-kpi">
      <div class="kpi-item">
        <div class="kpi-num">${totalOrders}</div>
        <div class="kpi-lbl">Orders</div>
      </div>
      <div class="kpi-item">
        <div class="kpi-num">${totalPax}</div>
        <div class="kpi-lbl">PAX รวม</div>
      </div>
    </div>
  </div>
  <div class="month-bar">${monthName} ${year}</div>
  <div class="day-headers">
    ${DAY_LABELS.map((d, i) => `<div class="dh ${i===0||i===6?"we":"wd"}">${d}</div>`).join("")}
  </div>
  <div class="grid">
    ${cells}
  </div>
  <div class="footer">ข้อมูลนี้ไม่แสดงรายได้ — ใช้สำหรับการจัดสรรรถเท่านั้น</div>
  <script>window.onload=()=>window.print();</script>
</body></html>`;
}

export default function OTACalendar() {
  const { orders, packages } = useOTAStore();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year,  setYear]  = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [tab, setTab] = useState<"summary" | "orders">("summary");
  const [exportingJpg, setExportingJpg] = useState(false);
  const calendarRef    = useRef<HTMLDivElement>(null);
  const exportWrapRef  = useRef<HTMLDivElement>(null);

  const prefix = `${year}-${String(month).padStart(2, "0")}`;

  const monthOrders = useMemo(
    () => orders.filter((o) => o.usage_date.startsWith(prefix)),
    [orders, prefix]
  );

  const byDayGrouped = useMemo(() => {
    const map: Record<number, PkgGroup[]> = {};
    monthOrders.forEach((o) => {
      const day = parseInt(o.usage_date.slice(8, 10), 10);
      if (!map[day]) map[day] = [];
      const pkg  = packages.find((p) => p.id === o.package_id);
      const code = pkg?.code ?? "?";
      const name = pkg?.name ?? o.package_details ?? "";
      const ex   = map[day].find((g) => g.pkgId === o.package_id);
      if (ex) {
        ex.totalPax     += o.pax;
        ex.orderCount++;
        ex.totalRevenue += o.revenue;
        if (o.nationality) ex.nationalities.push(o.nationality);
        if (o.guide_name)  ex.guides.push(o.guide_name);
      } else {
        map[day].push({
          pkgId: o.package_id, code, name,
          totalPax: o.pax, orderCount: 1, totalRevenue: o.revenue,
          nationalities: o.nationality ? [o.nationality] : [],
          guides:        o.guide_name  ? [o.guide_name]  : [],
        });
      }
    });
    Object.values(map).forEach((g) => g.sort((a, b) => a.code.localeCompare(b.code)));
    return map;
  }, [monthOrders, packages]);

  const byDay = useMemo(() => {
    const map: Record<number, typeof orders> = {};
    monthOrders.forEach((o) => {
      const day = parseInt(o.usage_date.slice(8, 10), 10);
      if (!map[day]) map[day] = [];
      map[day].push(o);
    });
    return map;
  }, [monthOrders]);

  const firstDay    = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthName   = new Date(year, month - 1, 1).toLocaleString("en", { month: "long" });

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear((y) => y - 1); } else setMonth((m) => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear((y) => y + 1); } else setMonth((m) => m + 1); };
  const isToday   = (day: number) =>
    today.getDate() === day && today.getMonth() + 1 === month && today.getFullYear() === year;

  const totalPax = monthOrders.reduce((s, o) => s + o.pax, 0);

  // ── Export handlers ───────────────────────────────────────────────────────
  const handleExportPDF = () => {
    const html = buildCalendarPDF(year, month, monthName, byDayGrouped, firstDay, daysInMonth, monthOrders.length, totalPax);
    const w = window.open("", "_blank", "width=1100,height=800");
    if (!w) return;
    w.document.write(html);
    w.document.close();
  };

  const handleSaveJPG = useCallback(async () => {
    if (!exportWrapRef.current || exportingJpg) return;
    // 1. Enter export mode → triggers re-render (today hidden, header shown)
    setExportingJpg(true);
    await new Promise((r) => setTimeout(r, 120)); // wait for paint
    try {
      const dataUrl = await toJpeg(exportWrapRef.current, {
        quality: 0.95,
        backgroundColor: "#ffffff",
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.download = `OTA-Calendar-${monthName}-${year}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("JPG export failed", err);
    } finally {
      setExportingJpg(false);
    }
  }, [exportingJpg, monthName, year]);

  // ── Selected day data ──────────────────────────────────────────────────────
  const sheetGroups  = selectedDay !== null ? (byDayGrouped[selectedDay] ?? []) : [];
  const sheetOrders  = selectedDay !== null ? (byDay[selectedDay] ?? []) : [];
  const sheetDateStr = selectedDay !== null
    ? `${year}-${String(month).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`
    : "";
  const sheetTotalPax = sheetGroups.reduce((s, g) => s + g.totalPax, 0);
  const sheetTotalRev = sheetGroups.reduce((s, g) => s + g.totalRevenue, 0);

  const openDay = (day: number) => {
    if ((byDayGrouped[day]?.length ?? 0) === 0) return;
    setSelectedDay(day);
    setTab("summary");
  };

  // ── Shared sub-components ─────────────────────────────────────────────────
  const SummaryTab = () => (
    <div className="space-y-2">
      {sheetGroups.map((g) => {
        const nats   = uniq(g.nationalities);
        const guides = uniq(g.guides);
        return (
          <div key={g.pkgId} className="bg-muted/40 rounded-xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-xs font-bold bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded shrink-0">
                  {g.code}
                </span>
                <span className="text-xs text-muted-foreground truncate">{g.name}</span>
              </div>
              <span className="font-bold text-purple-600 dark:text-purple-400 text-sm shrink-0 ml-2">{g.totalPax} pax</span>
            </div>
            <div className="px-4 py-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>{g.orderCount} orders</span>
              <span className="text-green-600 dark:text-green-400 font-medium">{fmtMoney(g.totalRevenue)}</span>
              {nats.length > 0 && <span>🌏 {nats.join(" · ")}</span>}
              {guides.length > 0 && <span>👤 {guides.join(", ")}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );

  const OrdersTab = () => (
    <div className="space-y-2">
      {sheetOrders.map((o) => {
        const pkg = packages.find((p) => p.id === o.package_id);
        return (
          <div key={o.id} className="bg-card rounded-xl border border-border px-4 py-3 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded text-[11px]">
                  {pkg?.code ?? "?"}
                </span>
                <span className="text-muted-foreground font-mono">{o.order_number}</span>
              </div>
              <span className="font-semibold">{o.pax} pax</span>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-muted-foreground">
              <span className="text-[11px] bg-muted px-1.5 py-0.5 rounded">{o.platform}</span>
              {o.nationality   && <span>🌏 {o.nationality}</span>}
              {o.guide_name    && <span>👤 {o.guide_name}</span>}
              {o.pickup_hotel  && <span>🏨 {o.pickup_hotel}</span>}
            </div>
            <div className="flex gap-4 text-muted-foreground">
              <span>฿{o.gross_price.toLocaleString()} gross</span>
              <span className="text-green-600 dark:text-green-400">฿{o.revenue.toLocaleString()} net</span>
            </div>
          </div>
        );
      })}
    </div>
  );

  const MetricCards = () => (
    <div className="grid grid-cols-3 gap-2 mb-4">
      {[
        { label: "pax รวม",  value: sheetTotalPax,               color: "text-purple-600 dark:text-purple-400" },
        { label: "orders",   value: sheetOrders.length,           color: "text-foreground" },
        { label: "revenue",  value: fmtMoneyShort(sheetTotalRev), color: "text-green-600 dark:text-green-400", isText: true },
      ].map(({ label, value, color, isText }) => (
        <div key={label} className="bg-muted/50 rounded-xl p-3 text-center">
          <p className={`text-lg font-semibold ${color}`}>{isText ? value : value}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
        </div>
      ))}
    </div>
  );

  const TabBar = ({ className = "" }: { className?: string }) => (
    <div className={`flex gap-1.5 ${className}`}>
      {(["summary", "orders"] as const).map((t) => (
        <button key={t} onClick={() => setTab(t)}
          className={`text-xs px-3 py-1 rounded-full transition-colors ${
            tab === t
              ? "bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-medium"
              : "text-muted-foreground hover:bg-muted"
          }`}>
          {t === "summary" ? "สรุป" : "รายละเอียด"}
        </button>
      ))}
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Calendar</h1>
          <p className="text-muted-foreground text-xs hidden sm:block">Daily itinerary schedule by usage date</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Export buttons */}
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:border-purple-400 hover:text-purple-600 transition-colors"
            title="Export calendar as PDF (no revenue)"
          >
            <FileDown className="w-3.5 h-3.5" /> Export PDF
          </button>
          <button
            onClick={handleSaveJPG}
            disabled={exportingJpg}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:border-purple-400 hover:text-purple-600 disabled:opacity-50 transition-colors"
            title="Save calendar as JPG (no revenue)"
          >
            <Image className="w-3.5 h-3.5" />
            {exportingJpg ? "กำลัง..." : "Save JPG"}
          </button>
          {/* Summary */}
          <div className="text-sm text-muted-foreground text-right">
            <span className="font-semibold text-foreground">{monthOrders.length}</span> orders ·{" "}
            <span className="font-semibold text-foreground">{totalPax}</span> pax
          </div>
        </div>
      </div>

      {/* Calendar — exportWrapRef captures header + grid + footer for JPG */}
      <div ref={exportWrapRef} style={{ background: "#fff" }}>

        {/* ── Export-only header (hidden in normal view) ── */}
        {exportingJpg && (
          <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #e5e7eb", fontFamily: "Arial, sans-serif" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#7c3aed", letterSpacing: "0.05em", marginBottom: 2 }}>
                  OTA (Standard Tour)
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#1f2937", lineHeight: 1.1, marginBottom: 4 }}>
                  Calendar
                </div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>Daily itinerary schedule by usage date</div>
                <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>
                  ดาวน์โหลดเมื่อ{" "}
                  {new Date().toLocaleString("th-TH", {
                    year: "numeric", month: "long", day: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </div>
              </div>
              <div style={{ display: "flex", gap: 20, marginTop: 4 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: "#7c3aed" }}>{monthOrders.length}</div>
                  <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 600 }}>Orders</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: "#7c3aed" }}>{totalPax}</div>
                  <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 600 }}>PAX รวม</div>
                </div>
              </div>
            </div>
          </div>
        )}

      <div ref={calendarRef} className="rounded-2xl overflow-hidden border border-border shadow-sm bg-card" style={exportingJpg ? { borderRadius: 0, border: "none" } : {}}>
        {/* Month nav */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ background: "linear-gradient(135deg, #4c1d95, #be185d)" }}>
          <button onClick={prevMonth} className="w-9 h-9 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full transition-colors text-white">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl md:text-2xl font-bold text-white">{monthName} {year}</h2>
          <button onClick={nextMonth} className="w-9 h-9 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full transition-colors text-white">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 bg-muted/50">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d, i) => (
            <div key={d} className={`text-center py-2 text-[10px] md:text-xs font-semibold
              ${i === 0 || i === 6 ? "text-rose-500" : "text-purple-600 dark:text-purple-400"}`}>
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`e-${i}`} className="border-t border-l border-border min-h-[60px] md:min-h-[100px] bg-muted/20" />
          ))}

          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const groups    = byDayGrouped[day] ?? [];
            const dayPax    = groups.reduce((s, g) => s + g.totalPax, 0);
            const isT       = isToday(day);
            const hasOrders = groups.length > 0;

            return (
              <div key={day}
                onClick={() => openDay(day)}
                className={`border-t border-l border-border transition-colors flex flex-col
                  min-h-[72px] md:min-h-[100px] p-1 md:p-1.5
                  ${isT && !exportingJpg ? "ring-2 ring-inset ring-rose-500 bg-rose-50/30 dark:bg-rose-900/10" : ""}
                  ${hasOrders ? "cursor-pointer hover:bg-muted/30 active:bg-muted/50" : ""}`}
              >
                <div className="flex items-start justify-between mb-1">
                  <span className={`text-xs md:text-sm font-semibold w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-full shrink-0
                    ${isT && !exportingJpg ? "bg-rose-500 text-white" : "text-foreground"}`}>
                    {day}
                  </span>
                  {dayPax > 0 && (
                    <div className="hidden md:flex flex-col items-end leading-tight">
                      <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400">{dayPax} pax</span>
                      {!exportingJpg && (
                        <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">
                          {fmtMoneyShort(groups.reduce((s, g) => s + g.totalRevenue, 0))}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Mobile */}
                <div className="md:hidden flex flex-col gap-[2px] flex-1">
                  {groups.map((g) => (
                    <div key={g.pkgId}
                      className="bg-purple-100 dark:bg-purple-900/50 rounded-[3px] px-[3px] py-[1px] text-[7px] font-bold text-purple-700 dark:text-purple-300 leading-tight truncate">
                      {g.code}·{g.totalPax}p
                    </div>
                  ))}
                </div>
                {dayPax > 0 && (
                  <div className="md:hidden flex items-center justify-between border-t border-purple-200 dark:border-purple-800 mt-1 pt-[2px]">
                    <span className="text-[8px] font-bold text-purple-600 dark:text-purple-400">{dayPax}p</span>
                    {!exportingJpg && (
                      <span className="text-[7px] font-semibold text-green-600 dark:text-green-400">
                        {fmtMoneyShort(groups.reduce((s, g) => s + g.totalRevenue, 0)).replace("฿", "")}
                      </span>
                    )}
                  </div>
                )}

                {/* Desktop chips — all groups shown (no truncation) */}
                <div className="hidden md:flex flex-col gap-[3px]">
                  {groups.map((g) => (
                    <div key={g.pkgId}
                      className="flex items-center justify-between bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200 rounded px-1.5 py-[3px] text-xs font-medium"
                      title={`${g.name} · ${g.orderCount} orders · ${g.totalPax} pax`}>
                      <span className="truncate font-mono text-[11px]">{g.code}</span>
                      <span className="shrink-0 ml-1 text-purple-600 dark:text-purple-300 font-semibold text-[11px]">{g.totalPax}p</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

        {/* ── Export-only footer summary ── */}
        {exportingJpg && (
          <div style={{ padding: "10px 24px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "flex-end" }}>
            <span style={{ fontSize: 9, color: "#9ca3af", fontFamily: "Arial, sans-serif" }}>
              ข้อมูลนี้ไม่แสดงรายได้ — ใช้สำหรับการจัดสรรรถเท่านั้น
            </span>
          </div>
        )}
      </div>{/* end exportWrapRef */}

      {/* ─────────────────── MOBILE BOTTOM SHEET ─────────────────── */}
      {selectedDay !== null && (
        <div className="md:hidden fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedDay(null)} />
          <div className="relative bg-card rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>
            <div className="flex items-start justify-between px-5 py-3 border-b border-border shrink-0">
              <div>
                <p className="font-semibold text-base">{fmtTHDate(sheetDateStr)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {sheetGroups.length} packages · {sheetOrders.length} orders
                </p>
              </div>
              <button onClick={() => setSelectedDay(null)} className="p-2 hover:bg-muted rounded-lg transition-colors -mr-1 -mt-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 pt-3 pb-2 shrink-0"><TabBar /></div>
            <div className="overflow-y-auto flex-1 px-5 pb-6 space-y-0">
              <MetricCards />
              {tab === "summary" ? <SummaryTab /> : <OrdersTab />}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────── DESKTOP MODAL ─────────────────── */}
      {selectedDay !== null && (
        <div className="hidden md:flex fixed inset-0 z-[60] items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedDay(null)} />
          <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-2xl mx-6 max-h-[80vh] flex flex-col border border-border">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <div>
                <p className="font-semibold text-lg">{fmtTHDate(sheetDateStr)}</p>
                <p className="text-sm text-muted-foreground">
                  {sheetGroups.length} packages · {sheetOrders.length} orders
                </p>
              </div>
              <div className="flex items-center gap-3">
                <TabBar />
                <button onClick={() => setSelectedDay(null)} className="p-2 hover:bg-muted rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-5">
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: "pax รวม",  value: sheetTotalPax,               color: "text-purple-600 dark:text-purple-400" },
                  { label: "orders",   value: sheetOrders.length,           color: "text-foreground" },
                  { label: "revenue",  value: fmtMoneyShort(sheetTotalRev), color: "text-green-600 dark:text-green-400" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-muted/50 rounded-xl p-4 text-center">
                    <p className={`text-2xl font-semibold ${color}`}>{value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{label}</p>
                  </div>
                ))}
              </div>
              {tab === "summary" ? (
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        {["Package","ชื่อโปรแกรม","Orders","Nationality","Guide","Pax","Revenue"].map((h) => (
                          <th key={h} className={`px-3 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap
                            ${["Pax","Revenue"].includes(h) ? "text-right" : "text-left"}`}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sheetGroups.map((g, i) => {
                        const nats   = uniq(g.nationalities).join(" · ");
                        const guides = uniq(g.guides).join(", ");
                        return (
                          <tr key={g.pkgId} className={i % 2 === 0 ? "" : "bg-muted/20"}>
                            <td className="px-3 py-2.5">
                              <span className="font-mono text-xs font-bold bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded">
                                {g.code}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-xs text-muted-foreground max-w-[160px] truncate">{g.name || "—"}</td>
                            <td className="px-3 py-2.5 text-muted-foreground">{g.orderCount}</td>
                            <td className="px-3 py-2.5 text-muted-foreground text-xs">{nats || "—"}</td>
                            <td className="px-3 py-2.5 text-muted-foreground text-xs">{guides || "—"}</td>
                            <td className="px-3 py-2.5 text-right font-semibold text-purple-600 dark:text-purple-400">{g.totalPax}</td>
                            <td className="px-3 py-2.5 text-right text-green-600 dark:text-green-400 text-xs">{fmtMoney(g.totalRevenue)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="border-t border-border bg-muted/30">
                      <tr>
                        <td colSpan={5} className="px-3 py-2.5 text-sm font-semibold text-muted-foreground">รวม</td>
                        <td className="px-3 py-2.5 text-right font-bold text-purple-600 dark:text-purple-400">{sheetTotalPax}</td>
                        <td className="px-3 py-2.5 text-right font-bold text-green-600 dark:text-green-400 text-sm">{fmtMoney(sheetTotalRev)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="space-y-2">
                  {sheetOrders.map((o) => {
                    const pkg = packages.find((p) => p.id === o.package_id);
                    return (
                      <div key={o.id} className="rounded-xl border border-border px-4 py-3 text-sm flex items-center gap-4 flex-wrap">
                        <span className="font-mono text-xs font-bold bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded shrink-0">
                          {pkg?.code ?? "?"}
                        </span>
                        <span className="font-mono text-muted-foreground text-xs">{o.order_number}</span>
                        <span className="text-xs bg-muted px-2 py-0.5 rounded">{o.platform}</span>
                        <span className="font-semibold">{o.pax} pax</span>
                        {o.nationality  && <span className="text-muted-foreground text-xs">🌏 {o.nationality}</span>}
                        {o.guide_name   && <span className="text-muted-foreground text-xs">👤 {o.guide_name}</span>}
                        {o.pickup_hotel && <span className="text-muted-foreground text-xs">🏨 {o.pickup_hotel}</span>}
                        <span className="ml-auto text-green-600 dark:text-green-400 text-xs shrink-0">฿{o.revenue.toLocaleString()} net</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
