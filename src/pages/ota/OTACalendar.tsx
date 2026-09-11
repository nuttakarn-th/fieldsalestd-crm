/**
 * OTACalendar.tsx — ตารางงานรายวัน จาก usage_date
 * v3: group by package_id + rich day popup (mobile bottom sheet + desktop modal)
 */
import { useMemo, useState } from "react";
import { useOTAStore } from "@/store/otaStore";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

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

// ── helper: unique compact list ──────────────────────────────────────────────
function uniq(arr: (string | undefined)[]): string[] {
  return [...new Set(arr.filter(Boolean) as string[])];
}

export default function OTACalendar() {
  const { orders, packages } = useOTAStore();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year,  setYear]  = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [tab, setTab] = useState<"summary" | "orders">("summary");

  const prefix = `${year}-${String(month).padStart(2, "0")}`;

  const monthOrders = useMemo(
    () => orders.filter((o) => o.usage_date.startsWith(prefix)),
    [orders, prefix]
  );

  // Group by day → by package (with nationality + guide aggregation)
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

  // Raw orders per day (for detail tab)
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

  // ── Tab content (shared between mobile + desktop) ────────────────────────
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
        { label: "pax รวม",  value: sheetTotalPax,             color: "text-purple-600 dark:text-purple-400" },
        { label: "orders",   value: sheetOrders.length,         color: "text-foreground" },
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
        <button
          key={t}
          onClick={() => setTab(t)}
          className={`text-xs px-3 py-1 rounded-full transition-colors ${
            tab === t
              ? "bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-medium"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          {t === "summary" ? "สรุป" : "รายละเอียด"}
        </button>
      ))}
    </div>
  );

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
        <div className="grid grid-cols-7 bg-card">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`e-${i}`} className="border-t border-l border-border min-h-[60px] md:min-h-[110px] bg-muted/20" />
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
                  min-h-[72px] md:min-h-[110px] p-1 md:p-2
                  ${isT ? "ring-2 ring-inset ring-rose-500 bg-rose-50/30 dark:bg-rose-900/10" : ""}
                  ${hasOrders ? "cursor-pointer hover:bg-muted/30 active:bg-muted/50" : ""}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs md:text-sm font-semibold w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-full
                    ${isT ? "bg-rose-500 text-white" : "text-foreground"}`}>
                    {day}
                  </span>
                  {dayPax > 0 && (
                    <span className="hidden md:inline text-xs text-muted-foreground font-medium leading-none">
                      {dayPax} pax
                    </span>
                  )}
                </div>

                {/* Mobile B+C: mini pills + total row */}
                <div className="md:hidden flex flex-col gap-[2px] flex-1">
                  {groups.slice(0, 3).map((g) => (
                    <div key={g.pkgId}
                      className="bg-purple-100 dark:bg-purple-900/50 rounded-[3px] px-[3px] py-[1px] text-[7px] font-bold text-purple-700 dark:text-purple-300 leading-tight truncate">
                      {g.code}·{g.totalPax}p
                    </div>
                  ))}
                  {groups.length > 3 && (
                    <div className="text-[7px] text-muted-foreground pl-[2px]">+{groups.length - 3}</div>
                  )}
                </div>
                {/* Mobile bottom summary row */}
                {dayPax > 0 && (
                  <div className="md:hidden flex items-center justify-between border-t border-purple-200 dark:border-purple-800 mt-1 pt-[2px]">
                    <span className="text-[8px] font-bold text-purple-600 dark:text-purple-400">{dayPax}p</span>
                    <span className="text-[7px] font-semibold text-green-600 dark:text-green-400">
                      {fmtMoneyShort(groups.reduce((s, g) => s + g.totalRevenue, 0)).replace("฿", "")}
                    </span>
                  </div>
                )}

                {/* Desktop chips */}
                <div className="hidden md:block space-y-0.5">
                  {groups.slice(0, 4).map((g) => (
                    <div key={g.pkgId}
                      className="flex items-center justify-between bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200 rounded px-1.5 py-0.5 text-xs font-medium"
                      title={`${g.name} · ${g.orderCount} orders · ${g.totalPax} pax`}>
                      <span className="truncate font-mono">{g.code}</span>
                      <span className="shrink-0 ml-1 text-purple-600 dark:text-purple-300 font-semibold">
                        {g.totalPax} pax{g.totalRevenue ? `/${fmtMoneyShort(g.totalRevenue).replace("฿", "")}` : ""}
                      </span>
                    </div>
                  ))}
                  {groups.length > 4 && (
                    <div className="text-xs text-muted-foreground pl-1">+{groups.length - 4} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─────────────────── MOBILE BOTTOM SHEET ─────────────────── */}
      {selectedDay !== null && (
        <div className="md:hidden fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedDay(null)} />
          <div className="relative bg-card rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col">
            {/* Pull handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
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

            {/* Tabs */}
            <div className="px-5 pt-3 pb-2 shrink-0">
              <TabBar />
            </div>

            {/* Scrollable body */}
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

            {/* Modal header */}
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

            {/* Modal body */}
            <div className="overflow-y-auto flex-1 px-6 py-5">
              {/* Metric Cards */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: "pax รวม",  value: sheetTotalPax,              color: "text-purple-600 dark:text-purple-400" },
                  { label: "orders",   value: sheetOrders.length,          color: "text-foreground" },
                  { label: "revenue",  value: fmtMoneyShort(sheetTotalRev), color: "text-green-600 dark:text-green-400" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-muted/50 rounded-xl p-4 text-center">
                    <p className={`text-2xl font-semibold ${color}`}>{value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{label}</p>
                  </div>
                ))}
              </div>

              {tab === "summary" ? (
                /* Desktop summary — table */
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
                /* Desktop orders tab */
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
                        {o.nationality && <span className="text-muted-foreground text-xs">🌏 {o.nationality}</span>}
                        {o.guide_name  && <span className="text-muted-foreground text-xs">👤 {o.guide_name}</span>}
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
