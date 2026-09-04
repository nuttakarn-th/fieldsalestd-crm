/**
 * OTACalendar.tsx — ตารางงานรายวัน จาก usage_date
 * Mirror: Standard Daycation Database → Calendar page
 */
import { useMemo, useState } from "react";
import { useOTAStore } from "@/store/otaStore";
import { ChevronLeft, ChevronRight } from "lucide-react";

const today = new Date();
const PLATFORM_DOT: Record<string, string> = {
  "Trip.com":     "bg-blue-500",
  "KKday":        "bg-orange-500",
  "Agent Offline":"bg-gray-400",
  "GetYourGuide": "bg-green-500",
  "Viator":       "bg-red-500",
  "Airbnb":       "bg-pink-500",
};

export default function OTACalendar() {
  const { orders, packages } = useOTAStore();
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-12
  const [year, setYear] = useState(today.getFullYear());

  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  const monthOrders = useMemo(() => orders.filter((o) => o.usage_date.startsWith(prefix)), [orders, prefix]);

  // Group orders by day
  const byDay = useMemo(() => {
    const map: Record<number, typeof orders> = {};
    monthOrders.forEach((o) => {
      const day = parseInt(o.usage_date.slice(8, 10), 10);
      if (!map[day]) map[day] = [];
      map[day].push(o);
    });
    return map;
  }, [monthOrders]);

  const firstDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthName = new Date(year, month - 1, 1).toLocaleString("en", { month: "long" });

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear((y) => y - 1); } else setMonth((m) => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear((y) => y + 1); } else setMonth((m) => m + 1); };

  const isToday = (day: number) =>
    today.getDate() === day && today.getMonth() + 1 === month && today.getFullYear() === year;

  const totalPax = monthOrders.reduce((s, o) => s + o.pax, 0);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Calendar</h1>
          <p className="text-muted-foreground text-sm">Daily itinerary schedule by usage date</p>
        </div>
        <div className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{monthOrders.length}</span> orders · {" "}
          <span className="font-semibold text-foreground">{totalPax}</span> pax
        </div>
      </div>

      {/* Month header */}
      <div className="rounded-2xl overflow-hidden border border-border shadow-sm">
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ background: "linear-gradient(135deg, #4c1d95, #be185d)" }}
        >
          <button onClick={prevMonth} className="w-9 h-9 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full transition-colors text-white">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold text-white">{monthName} {year}</h2>
          <button onClick={nextMonth} className="w-9 h-9 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full transition-colors text-white">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 bg-muted/50">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
            <div key={d} className={`text-center py-2.5 text-xs font-semibold ${i === 0 || i === 6 ? "text-rose-500" : "text-purple-600 dark:text-purple-400"}`}>{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 bg-card">
          {/* Empty cells before first day */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="border-t border-l border-border min-h-[110px] bg-muted/20" />
          ))}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const dayOrders = byDay[day] ?? [];
            const dayPax = dayOrders.reduce((s, o) => s + o.pax, 0);
            const isT = isToday(day);

            return (
              <div
                key={day}
                className={`border-t border-l border-border min-h-[110px] p-2 ${isT ? "ring-2 ring-inset ring-rose-500 bg-rose-50/30 dark:bg-rose-900/10" : "hover:bg-muted/30"} transition-colors`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ${isT ? "bg-rose-500 text-white" : "text-foreground"}`}>
                    {day}
                  </span>
                  {dayPax > 0 && (
                    <span className="text-xs text-muted-foreground font-medium">{dayPax} pax</span>
                  )}
                </div>

                {/* Order chips */}
                <div className="space-y-1">
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
    </div>
  );
}
