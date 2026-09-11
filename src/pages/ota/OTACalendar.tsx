/**
 * OTACalendar.tsx — ตารางงานรายวัน จาก usage_date
 * v2: group by package_id — แสดง total pax ต่อ Package เท่านั้น (ไม่แยก platform)
 */
import { useMemo, useState } from "react";
import { useOTAStore } from "@/store/otaStore";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

const today = new Date();

const fmtDate = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const fmtCurrency = (n: number) =>
  n.toLocaleString("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 0 });

interface PkgGroup {
  pkgId: string;
  code: string;
  name: string;
  totalPax: number;
  orderCount: number;
  totalRevenue: number;
}

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

  // Group by day → then by package
  const byDayGrouped = useMemo(() => {
    const map: Record<number, PkgGroup[]> = {};
    monthOrders.forEach((o) => {
      const day = parseInt(o.usage_date.slice(8, 10), 10);
      if (!map[day]) map[day] = [];
      const pkg = packages.find((p) => p.id === o.package_id);
      const code = pkg?.code ?? "?";
      const name = pkg?.name ?? o.package_details ?? "";
      const existing = map[day].find((g) => g.pkgId === o.package_id);
      if (existing) {
        existing.totalPax += o.pax;
        existing.orderCount++;
        existing.totalRevenue += o.revenue;
      } else {
        map[day].push({ pkgId: o.package_id, code, name, totalPax: o.pax, orderCount: 1, totalRevenue: o.revenue });
      }
    });
    // sort each day by code
    Object.values(map).forEach((g) => g.sort((a, b) => a.code.localeCompare(b.code)));
    return map;
  }, [monthOrders, packages]);

  // For bottom sheet: keep individual orders per day
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

  const sheetGroups   = selectedDay !== null ? (byDayGrouped[selectedDay] ?? []) : [];
  const sheetOrders   = selectedDay !== null ? (byDay[selectedDay] ?? []) : [];
  const sheetDateStr  = selectedDay !== null
    ? `${year}-${String(month).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`
    : "";
  const sheetTotalPax = sheetGroups.reduce((s, g) => s + g.totalPax, 0);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
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

      {/* Calendar */}
      <div className="rounded-2xl overflow-hidden border border-border shadow-sm">
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

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 bg-muted/50">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
            <div key={d} className={`text-center py-2 text-[10px] md:text-xs font-semibold
              ${i === 0 || i === 6 ? "text-rose-500" : "text-purple-600 dark:text-purple-400"}`}>
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 bg-card">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`e-${i}`} className="border-t border-l border-border min-h-[60px] md:min-h-[110px] bg-muted/20" />
          ))}

          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const groups    = byDayGrouped[day] ?? [];
            const dayPax    = groups.reduce((s, g) => s + g.totalPax, 0);
            const isT       = isToday(day);
            const hasOrders = groups.length > 0;
            const SHOW_MAX  = 4;

            return (
              <div key={day}
                onClick={() => hasOrders && setSelectedDay(day)}
                className={`border-t border-l border-border transition-colors
                  min-h-[60px] md:min-h-[110px] p-1 md:p-2
                  ${isT ? "ring-2 ring-inset ring-rose-500 bg-rose-50/30 dark:bg-rose-900/10" : ""}
                  ${hasOrders ? "cursor-pointer hover:bg-muted/30 active:bg-muted/50" : ""}`}
              >
                {/* Day number + pax total */}
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

                {/* Mobile: dot per unique package */}
                <div className="md:hidden flex flex-wrap gap-[3px] px-0.5">
                  {groups.slice(0, 6).map((g) => (
                    <span key={g.pkgId} className="w-2 h-2 rounded-full shrink-0 bg-purple-500" />
                  ))}
                  {groups.length > 6 && (
                    <span className="text-[8px] text-muted-foreground leading-none self-center">+{groups.length - 6}</span>
                  )}
                </div>

                {/* Desktop: chip per package — code + total pax */}
                <div className="hidden md:block space-y-0.5">
                  {groups.slice(0, SHOW_MAX).map((g) => (
                    <div key={g.pkgId}
                      className="flex items-center justify-between bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200 rounded px-1.5 py-0.5 text-xs font-medium"
                      title={`${g.name} · ${g.orderCount} orders · ${g.totalPax} pax`}>
                      <span className="truncate font-mono">{g.code}</span>
                      <span className="shrink-0 ml-1 text-purple-600 dark:text-purple-300 font-semibold">{g.totalPax} pax</span>
                    </div>
                  ))}
                  {groups.length > SHOW_MAX && (
                    <div className="text-xs text-muted-foreground pl-1">+{groups.length - SHOW_MAX} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Bottom Sheet (mobile day detail) ── */}
      {selectedDay !== null && (
        <div className="md:hidden fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedDay(null)} />
          <div className="relative bg-card rounded-t-2xl shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
              <div>
                <p className="font-bold text-base">วันที่ {selectedDay} {monthName} {year}</p>
                <p className="text-xs text-muted-foreground">{fmtDate(sheetDateStr)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-purple-600">
                  {sheetOrders.length} orders · {sheetTotalPax} pax
                </span>
                <button onClick={() => setSelectedDay(null)} className="p-2 hover:bg-muted rounded-lg transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Package groups */}
            <div className="overflow-y-auto flex-1 px-4 py-3 space-y-3">
              {sheetGroups.map((g) => {
                const pkgOrders = sheetOrders.filter(o => o.package_id === g.pkgId);
                return (
                  <div key={g.pkgId} className="bg-muted/40 rounded-xl p-4">
                    {/* Package header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded font-bold">
                          {g.code}
                        </span>
                        <span className="text-xs text-muted-foreground truncate max-w-[160px]">{g.name}</span>
                      </div>
                      <span className="font-bold text-purple-600 text-sm shrink-0">{g.totalPax} pax</span>
                    </div>
                    {/* Summary row */}
                    <div className="flex gap-4 text-xs text-muted-foreground mb-3">
                      <span>{g.orderCount} orders</span>
                      <span>{fmtCurrency(g.totalRevenue)}</span>
                    </div>
                    {/* Individual orders */}
                    <div className="space-y-2">
                      {pkgOrders.map(o => (
                        <div key={o.id} className="bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 text-xs flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground font-mono truncate max-w-[180px]">{o.order_number}</span>
                            <span className="font-semibold">{o.pax} pax</span>
                          </div>
                          <div className="flex flex-wrap gap-2 text-muted-foreground">
                            {o.nationality && <span>🌏 {o.nationality}</span>}
                            {o.guide_name  && <span>👤 {o.guide_name}</span>}
                            {o.pickup_hotel && <span>🏨 {o.pickup_hotel}</span>}
                          </div>
                        </div>
                      ))}
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
