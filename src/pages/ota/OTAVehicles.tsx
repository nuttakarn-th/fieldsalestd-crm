/**
 * OTAVehicles.tsx — Vehicle Summary for OTA Module
 * Route: /ota/vehicles
 * Shows daily vehicle grouping based on join rules + capacity escalation
 */
import { useMemo, useState } from "react";
import { useOTAStore } from "@/store/otaStore";
import { Bus } from "lucide-react";

// ── Vehicle Config ─────────────────────────────────────────────────────────────

const VEHICLE_JOIN_PAIRS: string[][] = [
  ["CMP", "CMS"],
  ["CML", "CMD"],
];

function vehicleGroupKey(code: string): string {
  for (const pair of VEHICLE_JOIN_PAIRS) {
    if (pair.includes(code)) return [...pair].sort().join("+");
  }
  return code.replace(/-\d+$/, ""); // sub-itinerary: strip -N suffix
}

function calcVehicles(pax: number): { count: number; type: "Van" | "Bus" } {
  if (pax > 26) return { count: 1, type: "Bus" };
  if (pax >= 14) return { count: 2, type: "Van" };
  return { count: 1, type: "Van" };
}

interface VehicleGroup {
  date: string;
  groupKey: string;
  packages: string[];
  orderCount: number;
  totalPax: number;
  vehicleCount: number;
  vehicleType: "Van" | "Bus";
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const today = new Date();
const fmtISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function monthBounds(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const last = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  return { start, end };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function OTAVehicles() {
  const { orders, packages } = useOTAStore();

  const [selYear,  setSelYear]  = useState(today.getFullYear());
  const [selMonth, setSelMonth] = useState(today.getMonth() + 1);

  const { start, end } = useMemo(() => monthBounds(selYear, selMonth), [selYear, selMonth]);

  // ── Compute vehicle groups ──────────────────────────────────────────────────
  const vehicleGroups = useMemo<VehicleGroup[]>(() => {
    const opsOrders = orders.filter(
      (o) => o.usage_date >= start && o.usage_date <= end
    );
    const map: Record<string, { packages: Set<string>; pax: number; orders: number }> = {};
    opsOrders.forEach((o) => {
      const pkg  = packages.find((p) => p.id === o.package_id);
      const code = pkg?.code ?? "Other";
      const gk   = vehicleGroupKey(code);
      const key  = `${o.usage_date}||${gk}`;
      if (!map[key]) map[key] = { packages: new Set(), pax: 0, orders: 0 };
      map[key].packages.add(code);
      map[key].pax    += o.pax;
      map[key].orders += 1;
    });
    return Object.entries(map).map(([key, v]) => {
      const [date, gk] = key.split("||");
      const { count, type } = calcVehicles(v.pax);
      return {
        date,
        groupKey: gk,
        packages: [...v.packages].sort(),
        orderCount: v.orders,
        totalPax:   v.pax,
        vehicleCount: count,
        vehicleType:  type,
      };
    }).sort((a, b) => a.date.localeCompare(b.date) || a.groupKey.localeCompare(b.groupKey));
  }, [orders, packages, start, end]);

  const totalVehicles = useMemo(
    () => vehicleGroups.reduce((s, g) => s + g.vehicleCount, 0),
    [vehicleGroups]
  );
  const totalVans = vehicleGroups
    .filter((g) => g.vehicleType === "Van")
    .reduce((s, g) => s + g.vehicleCount, 0);
  const totalBuses = vehicleGroups
    .filter((g) => g.vehicleType === "Bus")
    .reduce((s, g) => s + g.vehicleCount, 0);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Bus className="w-6 h-6 text-purple-600" />
            Vehicle Summary
          </h1>
          <p className="text-muted-foreground text-xs md:text-sm mt-0.5">
            สรุปจำนวนรถแยกตามกรุ๊ปและ Package — คำนวณจาก Usage Date
          </p>
        </div>

        {/* Month dropdown */}
        <div className="relative">
          <select
            value={`${selYear}-${String(selMonth).padStart(2, "0")}`}
            onChange={(e) => {
              const [y, m] = e.target.value.split("-").map(Number);
              setSelYear(y); setSelMonth(m);
            }}
            className="appearance-none bg-background border border-border rounded-lg pl-3 pr-8 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer hover:border-purple-400 transition-colors"
          >
            {Array.from({ length: 19 }, (_, i) => {
              const d = new Date(today.getFullYear(), today.getMonth() - 12 + i, 1);
              const y = d.getFullYear();
              const m = d.getMonth() + 1;
              const val = `${y}-${String(m).padStart(2, "0")}`;
              return (
                <option key={val} value={val}>
                  {d.toLocaleString("en", { month: "long" })} {y}
                </option>
              );
            })}
          </select>
          <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* ── KPI strip ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "รถรวม", value: totalVehicles, color: "border-l-purple-500", textColor: "text-purple-600" },
          { label: "🚐 Van", value: totalVans,    color: "border-l-blue-500",   textColor: "text-blue-600" },
          { label: "🚌 Bus", value: totalBuses,   color: "border-l-amber-500",  textColor: "text-amber-600" },
        ].map((k) => (
          <div key={k.label} className={`bg-card border border-border border-l-4 ${k.color} rounded-xl p-4`}>
            <div className="text-xs text-muted-foreground mb-1">{k.label}</div>
            <div className={`text-3xl font-black ${k.textColor}`}>{k.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{vehicleGroups.length} กรุ๊ป</div>
          </div>
        ))}
      </div>

      {/* ── Join rules reminder ─────────────────────────────────────────────── */}
      <div className="bg-muted/50 rounded-xl px-4 py-3 text-xs text-muted-foreground flex flex-wrap gap-x-5 gap-y-1">
        <span><span className="font-semibold text-foreground">Join rules:</span></span>
        <span>CMP + CMS → 1 กรุ๊ป</span>
        <span>CML + CMD → 1 กรุ๊ป</span>
        <span>CRW-1 + CRW-2 → 1 กรุ๊ป (sub-itinerary)</span>
        <span className="ml-auto"><span className="font-semibold text-foreground">Capacity:</span> 1–13 = 1 Van · 14–26 = 2 Van · &gt;26 = 1 Bus</span>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      {vehicleGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <Bus className="w-12 h-12 opacity-20" />
          <p className="text-sm">ไม่มีข้อมูลในเดือนที่เลือก</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-card border-b border-border">
                <tr className="text-muted-foreground text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-semibold">Usage Date</th>
                  <th className="text-left px-4 py-3 font-semibold">Package Group</th>
                  <th className="text-center px-4 py-3 font-semibold">Orders</th>
                  <th className="text-center px-4 py-3 font-semibold">PAX</th>
                  <th className="text-center px-4 py-3 font-semibold">รถ (คัน)</th>
                  <th className="text-center px-4 py-3 font-semibold">ประเภท</th>
                </tr>
              </thead>
              <tbody>
                {vehicleGroups.map((g, i) => (
                  <tr
                    key={i}
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 tabular-nums text-muted-foreground whitespace-nowrap">
                      {new Date(g.date + "T00:00:00").toLocaleDateString("th-TH", {
                        weekday: "short", day: "numeric", month: "short",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {g.packages.map((p) => (
                          <span
                            key={p}
                            className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-md text-[11px] font-mono font-semibold"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums">{g.orderCount}</td>
                    <td className="px-4 py-3 text-center tabular-nums font-semibold">{g.totalPax}</td>
                    <td className="px-4 py-3 text-center tabular-nums font-black text-purple-600 text-lg">
                      {g.vehicleCount}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          g.vehicleType === "Bus"
                            ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                            : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                        }`}
                      >
                        {g.vehicleType === "Bus" ? "🚌" : "🚐"} {g.vehicleType}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/40 border-t-2 border-border font-semibold text-sm">
                  <td className="px-4 py-3 text-muted-foreground" colSpan={2}>
                    รวมทั้งเดือน — {vehicleGroups.length} กรุ๊ป
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums">
                    {vehicleGroups.reduce((s, g) => s + g.orderCount, 0)}
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums">
                    {vehicleGroups.reduce((s, g) => s + g.totalPax, 0)}
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums text-purple-600 text-lg font-black">
                    {totalVehicles}
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                    🚐×{totalVans} · 🚌×{totalBuses}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
