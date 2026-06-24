/**
 * AtRiskNotification.tsx
 * Bell icon + popover แสดง period ที่ใกล้วันเดินทางแต่ fill rate ต่ำ
 * แสดงทุก role ใน AppSidebar footer
 */
import { useMemo, useState } from "react";
import { Bell, AlertTriangle, TrendingDown, ExternalLink } from "lucide-react";
import { useServices } from "@/store/serviceStore";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNavigate } from "react-router-dom";

// ── At-Risk criteria ──────────────────────────────────────────────────────────
// Critical: เหลือ ≤ 7 วัน + fill rate < 40%
// Warning:  เหลือ 8–30 วัน + fill rate < 40%
const DAYS_CRITICAL = 7;
const DAYS_WARNING  = 30;
const FILL_THRESHOLD = 40; // %

export type AtRiskLevel = "critical" | "warning";

export interface AtRiskPeriod {
  tourId: string;
  periodId: string;
  tourCode: string;
  tourCity: string;
  country: string;
  startDate: string;
  daysLeft: number;
  fillRate: number;    // %
  quota: number;       // ที่นั่งว่าง
  totalSeats: number;
  level: AtRiskLevel;
}

// ── hook ──────────────────────────────────────────────────────────────────────
export function useAtRiskPeriods(): AtRiskPeriod[] {
  const tours = useServices((s) => s.tours);
  return useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const results: AtRiskPeriod[] = [];

    for (const t of tours) {
      for (const p of t.periods ?? []) {
        if (!p.start_date || p.cancelled) continue;
        const start = new Date(p.start_date);
        start.setHours(0, 0, 0, 0);
        const daysLeft = Math.ceil((start.getTime() - today.getTime()) / 86400000);
        if (daysLeft < 0 || daysLeft > DAYS_WARNING) continue;

        const booked = p.total_seats - p.quota;
        const fillRate = p.total_seats > 0 ? Math.round(booked / p.total_seats * 100) : 0;
        if (fillRate >= FILL_THRESHOLD) continue;

        results.push({
          tourId: t.id,
          periodId: p.period_id,
          tourCode: t.code,
          tourCity: t.city,
          country: t.country,
          startDate: p.start_date,
          daysLeft,
          fillRate,
          quota: p.quota,
          totalSeats: p.total_seats,
          level: daysLeft <= DAYS_CRITICAL ? "critical" : "warning",
        });
      }
    }
    return results.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [tours]);
}

// ── helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
}

// ── Component ─────────────────────────────────────────────────────────────────
export function AtRiskNotification({ collapsed }: { collapsed: boolean }) {
  const atRisk = useAtRiskPeriods();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const criticalCount = atRisk.filter((p) => p.level === "critical").length;
  const totalCount    = atRisk.length;

  if (totalCount === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={`At-Risk Alert: ${totalCount} period ต้องดูแลด่วน`}
          className="relative flex items-center gap-2 w-full rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-sidebar-accent group"
        >
          <div className="relative shrink-0">
            <Bell className={`w-4 h-4 ${criticalCount > 0 ? "text-red-500" : "text-amber-500"}`} />
            {/* Badge */}
            <span
              className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] rounded-full text-[9px] font-bold text-white flex items-center justify-center px-0.5"
              style={{ background: criticalCount > 0 ? "#EF4444" : "#F59E0B" }}
            >
              {totalCount > 9 ? "9+" : totalCount}
            </span>
          </div>
          {!collapsed && (
            <span className={`text-xs font-semibold truncate ${criticalCount > 0 ? "text-red-600" : "text-amber-600"}`}>
              {criticalCount > 0 ? `🚨 ${criticalCount} ด่วนมาก` : `⚠ ${totalCount} ต้องดูแล`}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="right"
        align="end"
        className="w-[340px] p-0 shadow-xl rounded-2xl border border-border overflow-hidden"
        sideOffset={8}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b flex items-center justify-between"
          style={{ background: criticalCount > 0 ? "#FEF2F2" : "#FFFBEB" }}>
          <div className="flex items-center gap-2">
            <AlertTriangle className={`w-4 h-4 ${criticalCount > 0 ? "text-red-500" : "text-amber-500"}`} />
            <p className="text-sm font-bold text-foreground">At-Risk Alert</p>
            <span className="text-xs font-bold px-1.5 py-0.5 rounded-full text-white"
              style={{ background: criticalCount > 0 ? "#EF4444" : "#F59E0B" }}>
              {totalCount}
            </span>
          </div>
          <button
            type="button"
            onClick={() => { setOpen(false); navigate("/app/stock-analytics"); }}
            className="flex items-center gap-1 text-[10px] text-violet-600 hover:underline font-semibold"
          >
            ดูใน Analytics <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        {/* Legend */}
        <div className="px-4 py-2 flex items-center gap-3 bg-muted/20 border-b text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            🚨 ≤7 วัน
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            ⚠ 8–30 วัน
          </span>
          <span className="ml-auto">fill rate &lt; {FILL_THRESHOLD}%</span>
        </div>

        {/* Period list */}
        <div className="max-h-[360px] overflow-y-auto divide-y divide-border/50">
          {atRisk.map((p) => {
            const isCrit = p.level === "critical";
            return (
              <div
                key={p.periodId}
                className="px-4 py-3 hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white ${isCrit ? "bg-red-500" : "bg-amber-400"}`}>
                        {isCrit ? `🚨 ${p.daysLeft}d` : `⚠ ${p.daysLeft}d`}
                      </span>
                      <span className="text-xs font-bold text-foreground truncate">{p.tourCode}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">{p.tourCity} · {p.country}</p>
                    <p className="text-[10px] text-muted-foreground">เดินทาง {fmtDate(p.startDate)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {/* Fill rate donut-ish */}
                    <p className={`text-base font-bold leading-none ${isCrit ? "text-red-500" : "text-amber-500"}`}>
                      {p.fillRate}%
                    </p>
                    <p className="text-[10px] text-muted-foreground">fill rate</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">ว่าง {p.quota}/{p.totalSeats}</p>
                  </div>
                </div>
                {/* Fill bar */}
                <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${p.fillRate}%`,
                      background: isCrit ? "#EF4444" : "#F59E0B",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t bg-muted/10 text-[10px] text-muted-foreground flex items-center gap-1.5">
          <TrendingDown className="w-3 h-3" />
          Period ที่เหลือ &lt; 30 วัน และ fill rate &lt; {FILL_THRESHOLD}% — ควรโปรโมทด่วน
        </div>
      </PopoverContent>
    </Popover>
  );
}
