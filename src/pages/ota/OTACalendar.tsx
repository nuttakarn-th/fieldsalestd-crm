/**
 * OTACalendar.tsx — ตารางงานรายวัน จาก usage_date
 * Mobile: dot-only cells + bottom sheet
 * Desktop: chip view (unchanged)
 */
import { useMemo, useState } from "react";
import { useOTAStore } from "@/store/otaStore";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

const today = new Date();

const PLATFORM_DOT: Record<string, string> = {
  "Trip.com":      "bg-blue-500",
  "KKday":         "bg-orange-500",
  "Agent Offline": "bg-gray-400",
  "GetYourGuide":  "bg-green-500",
  "Viator":        "bg-red-500",
  "Airbnb":        "bg-pink-500",
};
const PLATFORM_BADGE: Record<string, string> = {
  "Trip.com":      "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "KKday":         "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  "Agent Offline": "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  "GetYourGuide":  "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  "Viator":        "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  "Airbnb":        "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
};

const fmtDate = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const fmtCurrency = (n: number) =>
  n.toLocaleString("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 0 });

export default function OTACalendar() {
  const { orders, packages } = useOTAStore();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  const monthOrders = useMemo(
    () => orders.filter((o) => o.usage_date.startsWith(prefix)),
    [orders, prefix]
  );

  const byDay = useMemo(() => {
    const map: Record<number, typeof orders> = {};
    monthOrders.forEach((o) => {
      const day = parseInt(o.usage_date.slice(8, 10), 10);
      if (!map[day]) map[day] = [];
      map[day].push(o);
    });
    return map;
  }, [monthOrders]);

  const firstDay   = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthName  = new Date(year, month - 1, 1).toLocaleString("en", { month: "long" });

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear((y) => y - 1); } else setMonth((m) => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear((y) => y + 1); } else setMonth((m) => m + 1); };
  const isToday   = (day: number) =>
    today.getDate() === day && today.getMonth() + 1 === month && today.getFullYear() === year;

  const totalPax = monthOrders.reduce((s, o) => s + o.pax, 0);

  // Sheet data
  const sheetOrders = selectedDay !== null ? (byDay[selectedDay] ?? []) : [];
  const sheetDateStr = selectedDay !== null
    ? `${year}-${String(month).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`
    : "";

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* ── Header ─────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Calendar</h1>
          <p className="text-muted-foreground text-xs hidden sm:block">Daily itinerary schedule by usage date</p>
        </div>
        <div className="text-sm text-muted-foreground text-right">
          <span className="font-semibold text-foreground">{monthOrders.length}</span> orders ·{" "}
          <span className="font-semibold text-foreground">{totalPax}</span> pax
        </div>
      </div>

      {/* ── Calendar ───────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden border border-border shadow-sm">
        {/* Month nav */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ background: "linear-gradient(135deg, #4c1d95, #be185d)" }}
        >
          <button onClick={prevMonth} className="w-9 h-9 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full transition-colors text-white">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl md:text-2xl font-bold text-white">{monthName} {year}</h2>
          <button onClick={nextMonth} className="w-9 h-9 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full transition-colors text-white">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 bg-muted/50">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
            <div key={d} className={`text-center py-2 text-[10px] md:text-xs font-semibold ${i === 0 || i === 6 ? "text-rose-500" : "text-purple-600 dark:text-purple-400"}`}>
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 bg-card">
          {/* Empty leading cells */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="border-t border-l border-border min-h-[60px] md:min-h-[110px] bg-muted/20" />
          ))}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const dayOrders = byDay[day] ?? [];
            const dayPax   = dayOrders.reduce((s, o) => s + o.pax, 0);
            const isT      = isToday(day);
            const hasOrders = dayOrders.length > 0;

            return (
              <div
                key={day}
                onClick={() => hasOrders && setSelectedDay(day)}
                className={`border-t border-l border-border transition-colors
                  min-h-[60px] md:min-h-[110px] p-1 md:p-2
                  ${isT ? "ring-2 ring-inset ring-rose-500 bg-rose-50/30 dark:bg-rose-900/10" : ""}
                  ${hasOrders ? "cursor-pointer active:bg-muted/50 hover:bg-muted/30" : ""}
                `}
              >
                {/* Day number */}
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs md:text-sm font-semibold w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-full
                    ${isT ? "bg-rose-500 text-white" : "text-foreground"}`}>
                    {day}
                  </span>
                  {dayPax > 0 && (
                    <span className="text-[9px] md:text-xs text-muted-foreground font-medium leading-none">
                      {dayPax}<span className="hidden md:inline"> pax</span>
                    </span>
                  )}
                </div>

                {/* ── Mobile: colored dots only ── */}
                <div className="md:hidden flex flex-wrap gap-[3px] px-0.5">
                  {dayOrders.slice(0, 6).map((o) => (
                    <span key={o.id} className={`w-2 h-2 rounded-full shrink-0 ${PLATFORM_DOT[o.platform] ?? "bg-gray-400"}`} />
                  ))}
                  {dayOrders.length > 6 && (
                    <span className="text-[8px] text-muted-foreground leading-none self-center">+{dayOrders.length - 6}</span>
                  )}
                </div>

                {/* ── Desktop: chips with text ── */}
                <div className="hidden md:block space-y-1">
                  {dayOrders.slice(0, 4).map((o) => {
                    const pkg = packages.find((p) => p.id === o.package_id);
                    return (
                      <div
                        key={o.id}
                        className="flex items-center gap-1 bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200 rounded px-1.5 py-0.5 text-xs font-medium"
                        title={`${pkg?.name ?? ""} · ${o.platform} · ${o.pax} pax`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PLATFORM_DOT[o.platform] ?? "bg-gray-400"}`} />
                        <span className="truncate">{pkg?.code ?? "?"} {o.pax} PAX</span>
                      </div>
                    );
                  })}
                  {dayOrders.length > 4 && (
                    <div className="text-xs text-muted-foreground pl-1">+{dayOrders.length - 4} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-4">
        {Object.entries(PLATFORM_DOT).map(([pl, cls]) => (
          <div key={pl} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={`w-2.5 h-2.5 rounded-full ${cls}`} />
            {pl}
          </div>
        ))}
      </div>

      {/* ── Bottom Sheet (mobile: day detail) ──────────────────────────────────── */}
      {selectedDay !== null && (
        <div className="md:hidden fixed inset-0 z-[60] flex flex-col justify-end">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedDay(null)} />
          {/* Sheet */}
          <div className="relative bg-card rounded-t-2xl shadow-2xl max-h-[80vh] flex flex-col">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
              <div>
                <p className="font-bold text-base">วันที่ {selectedDay} {monthName} {year}</p>
                <p className="text-xs text-muted-foreground">{fmtDate(sheetDateStr)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-purple-600">
                  {sheetOrders.length} orders · {sheetOrders.reduce((s, o) => s + o.pax, 0)} pax
                </span>
                <button onClick={() => setSelectedDay(null)} className="p-2 hover:bg-muted rounded-lg transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            {/* Order list */}
            <div className="overflow-y-auto flex-1 px-4 py-3 space-y-3">
              {sheetOrders.map((o) => {
                const pkg = packages.find((p) => p.id === o.package_id);
                const commAmt = +(o.gross_price * o.commission_pct / 100).toFixed(2);
                return (
                  <div key={o.id} className="bg-muted/40 rounded-xl p-4">
                    {/* Platform + pax */}
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${PLATFORM_BADGE[o.platform] ?? "bg-purple-100 text-purple-700"}`}>
                        {o.platform}
                      </span>
                      <span className="text-sm font-semibold">{o.pax} pax</span>
                    </div>
                    {/* Order # */}
                    <p className="text-xs text-muted-foreground mb-1">Order # <span className="text-foreground font-medium">{o.order_number}</span></p>
                    {/* Package */}
                    <div className="flex items-center gap-1.5 mb-2">
                      {pkg?.code && (
                        <span className="font-mono text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded">{pkg.code}</span>
                      )}
                      <span className="text-xs text-muted-foreground truncate">{o.package_details}</span>
                    </div>
                    {/* People details */}
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-2">
                      {o.nationality && <span>🌏 {o.nationality}</span>}
                      {o.guide_name  && <span>👤 {o.guide_name}</span>}
                      {o.pickup_hotel && <span>🏨 {o.pickup_hotel}</span>}
                    </div>
                    {/* Financials */}
                    <div className="flex items-center justify-between border-t border-border pt-2 text-sm">
                      <span className="text-muted-foreground text-xs">Gross {fmtCurrency(o.gross_price)} · Comm {fmtCurrency(commAmt)}</span>
                      <span className="font-bold text-purple-600 dark:text-purple-400">{fmtCurrency(o.revenue)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
