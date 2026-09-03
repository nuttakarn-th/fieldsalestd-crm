/**
 * PromoReadyNotification.tsx
 * 📣 แจ้งเตือน "เตรียมโปรโมท" — เหลือ 31–180 วัน + fill rate < 70%
 * ช่วงเวลาเหมาะสมที่สุดสำหรับการทำการตลาดเชิงรุก
 * แสดงทุก Role ใน AppSidebar / MarketingLayout
 */
import { useMemo, useState } from "react";
import { Megaphone, Calendar, MapPin, ExternalLink, TrendingUp } from "lucide-react";
import { useServices } from "@/store/serviceStore";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNavigate } from "react-router-dom";

// ── Thresholds ────────────────────────────────────────────────────────────────
const DAYS_MIN       = 31;   // > 30 วัน (ไม่ overlap กับ WatchlistNotification)
const DAYS_MAX       = 180;  // ไม่เกิน 6 เดือน (ไม่ไกลเกินไป)
const FILL_THRESHOLD = 70;   // fill rate < 70% → ควรทำการตลาด

// ── Types ─────────────────────────────────────────────────────────────────────
export interface PromoReadyPeriod {
  tourId: string;
  periodId: string;
  tourCode: string;
  tourCity: string;
  country: string;
  category: string;
  startDate: string;
  daysUntil: number;
  fillRate: number;   // %
  quota: number;      // ที่นั่งว่าง
  totalSeats: number;
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function usePromoReadyPeriods(): PromoReadyPeriod[] {
  const tours = useServices((s) => s.tours);
  return useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const results: PromoReadyPeriod[] = [];

    for (const t of tours) {
      for (const p of t.periods ?? []) {
        if (p.cancelled || !p.start_date) continue;
        const start = new Date(p.start_date);
        start.setHours(0, 0, 0, 0);
        const daysUntil = Math.ceil((start.getTime() - today.getTime()) / 86400000);
        if (daysUntil < DAYS_MIN || daysUntil > DAYS_MAX) continue;

        const booked   = p.total_seats - p.quota;
        const fillRate = p.total_seats > 0 ? Math.round(booked / p.total_seats * 100) : 0;
        if (fillRate >= FILL_THRESHOLD) continue;

        results.push({
          tourId:     t.id,
          periodId:   p.period_id,
          tourCode:   t.code,
          tourCity:   t.city,
          country:    t.country,
          category:   t.category,
          startDate:  p.start_date,
          daysUntil,
          fillRate,
          quota:      p.quota,
          totalSeats: p.total_seats,
        });
      }
    }
    return results.sort((a, b) => a.daysUntil - b.daysUntil);
  }, [tours]);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
}

function FillBar({ fillRate }: { fillRate: number }) {
  const color =
    fillRate >= 50 ? "#3B82F6" :
    fillRate >= 30 ? "#60A5FA" :
    "#93C5FD";
  return (
    <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${fillRate}%`, background: color }} />
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export function PromoReadyNotification({
  collapsed,
  campaignUrl = "/app/campaign-management",
}: {
  collapsed: boolean;
  campaignUrl?: string;
}) {
  const periods = usePromoReadyPeriods();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const total = periods.length;
  if (total === 0) return null;

  // แบ่งกลุ่มย่อย: 31–60 วัน vs 61–180 วัน
  const soon  = periods.filter((p) => p.daysUntil <= 60);
  const later = periods.filter((p) => p.daysUntil > 60);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={`${total} period ควรเริ่มทำการตลาด (31–180 วัน, fill < ${FILL_THRESHOLD}%)`}
          className="relative flex items-center gap-2 w-full rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-sidebar-accent group"
        >
          <div className="relative shrink-0">
            <Megaphone className="w-4 h-4 text-blue-500" />
            <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] rounded-full text-[9px] font-bold text-white flex items-center justify-center px-0.5 bg-blue-500">
              {total > 9 ? "9+" : total}
            </span>
          </div>
          {!collapsed && (
            <span className="text-xs font-semibold truncate text-blue-600 dark:text-blue-400">
              📣 {soon.length > 0 ? `${soon.length} ด่วน · ` : ""}{total} เตรียมโปรโมท
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="right"
        align="end"
        className="w-[360px] p-0 shadow-xl rounded-2xl border border-border overflow-hidden"
        sideOffset={8}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b flex items-center justify-between bg-blue-50 dark:bg-blue-950/40">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-blue-500" />
            <p className="text-sm font-bold text-foreground">เตรียมโปรโมท</p>
            <span className="text-xs font-bold px-1.5 py-0.5 rounded-full text-white bg-blue-500">
              {total}
            </span>
          </div>
          <button
            type="button"
            onClick={() => { setOpen(false); navigate(campaignUrl); }}
            className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-semibold"
          >
            สร้าง Campaign <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        {/* Legend */}
        <div className="px-4 py-2 flex items-center gap-3 bg-muted/20 border-b text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
            31–60 วัน ({soon.length})
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-300 inline-block" />
            61–180 วัน ({later.length})
          </span>
          <span className="ml-auto">fill rate &lt; {FILL_THRESHOLD}%</span>
        </div>

        {/* List */}
        <div className="max-h-[400px] overflow-y-auto divide-y divide-border/50">
          {periods.map((p) => {
            const isSoon = p.daysUntil <= 60;
            return (
              <div key={`${p.tourId}-${p.periodId}`} className="px-4 py-3 hover:bg-muted/20 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white ${isSoon ? "bg-blue-500" : "bg-blue-300"}`}>
                        อีก {p.daysUntil} วัน
                      </span>
                      <span className="text-[9px] text-muted-foreground">{p.category}</span>
                    </div>
                    <p className="text-xs font-bold text-foreground truncate">{p.tourCode}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                      <p className="text-[10px] text-muted-foreground truncate">{p.tourCity} · {p.country}</p>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3 text-blue-500 shrink-0" />
                      <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                        เดินทาง {fmtDate(p.startDate)}
                      </p>
                    </div>
                    <FillBar fillRate={p.fillRate} />
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-bold leading-none text-blue-500">{p.fillRate}%</p>
                    <p className="text-[10px] text-muted-foreground">fill rate</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">ว่าง {p.quota}/{p.totalSeats}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t bg-muted/10 text-[10px] text-muted-foreground flex items-center gap-1.5">
          <TrendingUp className="w-3 h-3 text-blue-500" />
          Period 31–180 วัน ที่ยังว่างเกิน {100 - FILL_THRESHOLD}% — ช่วงเวลาดีที่สุดสำหรับ Campaign
        </div>
      </PopoverContent>
    </Popover>
  );
}
