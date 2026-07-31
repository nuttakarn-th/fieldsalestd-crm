/**
 * WatchlistNotification.tsx
 * ⚠️ แจ้งเตือนโปรแกรม "เฝ้าระวัง" — เหลือ 8–30 วัน + fill rate < 40%
 * แสดงทุก Role ใน AppSidebar ข้างล่าง ด่วนมาก
 */
import { useState } from "react";
import { Eye, TrendingDown, ExternalLink } from "lucide-react";
import { useAtRiskPeriods } from "@/components/AtRiskNotification";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNavigate } from "react-router-dom";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
}

export function WatchlistNotification({ collapsed }: { collapsed: boolean }) {
  const atRisk = useAtRiskPeriods();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  // เฉพาะ warning level (8–30 วัน, fill < 40%)
  const watchlist = atRisk.filter((p) => p.level === "warning");
  const count = watchlist.length;

  if (count === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={`${count} Period เฝ้าระวัง — fill rate ต่ำ เหลือ 8–30 วัน`}
          className="relative flex items-center gap-2 w-full rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-sidebar-accent group"
        >
          <div className="relative shrink-0">
            <Eye className="w-4 h-4 text-amber-500" />
            <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] rounded-full text-[9px] font-bold text-white flex items-center justify-center px-0.5 bg-amber-500">
              {count > 9 ? "9+" : count}
            </span>
          </div>
          {!collapsed && (
            <span className="text-xs font-semibold truncate text-amber-600">
              ⚠ {count} เฝ้าระวัง
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
        <div className="px-4 py-3 border-b flex items-center justify-between bg-amber-50 dark:bg-amber-950/50">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-amber-500" />
            <p className="text-sm font-bold text-foreground">เฝ้าระวัง</p>
            <span className="text-xs font-bold px-1.5 py-0.5 rounded-full text-white bg-amber-500">
              {count}
            </span>
          </div>
          <button
            type="button"
            onClick={() => { setOpen(false); navigate("/app/stock-analytics"); }}
            className="flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-400 hover:underline font-semibold"
          >
            ดูใน Analytics <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        {/* Legend */}
        <div className="px-4 py-2 flex items-center gap-3 bg-muted/20 border-b text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            ⚠ 8–30 วัน
          </span>
          <span className="ml-auto">fill rate &lt; 40% — ควรติดตาม</span>
        </div>

        {/* List */}
        <div className="max-h-[360px] overflow-y-auto divide-y divide-border/50">
          {watchlist.map((p) => (
            <div key={p.periodId} className="px-4 py-3 hover:bg-muted/20 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white bg-amber-400">
                      ⚠ {p.daysLeft}d
                    </span>
                    <span className="text-xs font-bold text-foreground truncate">{p.tourCode}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">{p.tourCity} · {p.country}</p>
                  <p className="text-[10px] text-muted-foreground">เดินทาง {fmtDate(p.startDate)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-base font-bold leading-none text-amber-500">{p.fillRate}%</p>
                  <p className="text-[10px] text-muted-foreground">fill rate</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">ว่าง {p.quota}/{p.totalSeats}</p>
                </div>
              </div>
              {/* Fill bar */}
              <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all bg-amber-400"
                  style={{ width: `${p.fillRate}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t bg-muted/10 text-[10px] text-muted-foreground flex items-center gap-1.5">
          <TrendingDown className="w-3 h-3 text-amber-500" />
          Period เหลือ 8–30 วัน และ fill rate ต่ำกว่า 40% — ควรโปรโมทก่อนเต็ม
        </div>
      </PopoverContent>
    </Popover>
  );
}
