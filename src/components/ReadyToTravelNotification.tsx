/**
 * ReadyToTravelNotification.tsx
 * 🟣 แจ้งเตือน "พร้อมเดินทาง" สำหรับ OB Co-ordinator
 * - International Tour: quota ≤ 10 ที่นั่ง
 * - Domestic:           quota ≤ 4 ที่นั่ง
 * - เฉพาะ period ที่ไม่ยกเลิก + วันเดินทางยังไม่ถึง (upcoming)
 */
import { useMemo, useState } from "react";
import { PlaneTakeoff, ExternalLink, Calendar, Users, MapPin } from "lucide-react";
import { useServices } from "@/store/serviceStore";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

// ── Thresholds ────────────────────────────────────────────────────────────────

const INT_THRESHOLD = 10;  // International Tour
const DOM_THRESHOLD = 4;   // Domestic

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ReadyItem {
  tourId: string;
  periodId: string;
  tourCode: string;
  tourCity: string;
  country: string;
  category: string;       // "International Tour" | "Domestic"
  quota: number;
  total_seats: number;
  start_date: string;     // YYYY-MM-DD
  end_date?: string;
  threshold: number;      // INT_THRESHOLD or DOM_THRESHOLD
  daysUntil: number;      // วันที่เหลือก่อนเดินทาง
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useReadyToTravel(): { international: ReadyItem[]; domestic: ReadyItem[]; all: ReadyItem[] } {
  const tours = useServices((s) => s.tours);

  return useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const international: ReadyItem[] = [];
    const domestic: ReadyItem[] = [];

    for (const t of tours) {
      // เฉพาะ International Tour และ Domestic (ไม่รวม Incentive)
      const isInt = t.category === "International Tour";
      const isDom = t.category === "Domestic";
      if (!isInt && !isDom) continue;

      const threshold = isInt ? INT_THRESHOLD : DOM_THRESHOLD;

      for (const p of t.periods ?? []) {
        if (p.cancelled) continue;
        if (!p.start_date) continue;
        const startDate = new Date(p.start_date);
        startDate.setHours(0, 0, 0, 0);
        // เฉพาะ upcoming (วันเดินทางยังไม่ผ่าน)
        if (startDate < today) continue;
        // เฉพาะ quota ต่ำกว่า threshold
        if (p.quota > threshold) continue;

        const daysUntil = Math.ceil((startDate.getTime() - today.getTime()) / 86400000);
        const item: ReadyItem = {
          tourId: t.id,
          periodId: p.period_id,
          tourCode: t.code,
          tourCity: t.city,
          country: t.country,
          category: t.category,
          quota: p.quota,
          total_seats: p.total_seats,
          start_date: p.start_date,
          end_date: p.end_date,
          threshold,
          daysUntil,
        };
        if (isInt) international.push(item);
        else domestic.push(item);
      }
    }

    // เรียงจากวันเดินทางใกล้สุด
    const sort = (arr: ReadyItem[]) => arr.sort((a, b) => a.daysUntil - b.daysUntil);
    return { international: sort(international), domestic: sort(domestic), all: sort([...international, ...domestic]) };
  }, [tours]);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
}

function QuotaBadge({ quota, threshold }: { quota: number; threshold: number }) {
  const pct = quota / threshold;
  const color = quota === 0 ? "bg-red-500" : pct <= 0.3 ? "bg-orange-500" : "bg-amber-400";
  return (
    <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white", color)}>
      {quota === 0 ? "เต็ม" : `${quota} ที่ว่าง`}
    </span>
  );
}

function DaysBadge({ days }: { days: number }) {
  if (days === 0) return <span className="text-[9px] font-bold text-red-600">วันนี้!</span>;
  if (days <= 7) return <span className="text-[9px] font-bold text-orange-600">อีก {days} วัน</span>;
  if (days <= 30) return <span className="text-[9px] text-amber-600">อีก {days} วัน</span>;
  return <span className="text-[9px] text-muted-foreground">อีก {days} วัน</span>;
}

// ── Row in popup ──────────────────────────────────────────────────────────────

function PeriodRow({ item }: { item: ReadyItem }) {
  const isInt = item.category === "International Tour";
  return (
    <div className="px-4 py-3 hover:bg-muted/20 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <span className={cn(
              "text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white",
              isInt ? "bg-violet-500" : "bg-teal-500"
            )}>
              {isInt ? "🌏 International" : "🏠 Domestic"}
            </span>
            <QuotaBadge quota={item.quota} threshold={item.threshold} />
            <DaysBadge days={item.daysUntil} />
          </div>
          <p className="text-xs font-bold text-foreground truncate">{item.tourCode}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
            <p className="text-[10px] text-muted-foreground truncate">{item.tourCity} · {item.country}</p>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <Calendar className="w-3 h-3 text-primary shrink-0" />
            <p className="text-[10px] text-primary font-medium">
              เดินทาง {fmtDate(item.start_date)}
              {item.end_date && ` – ${fmtDate(item.end_date)}`}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="flex items-center gap-1 justify-end">
            <Users className="w-3 h-3 text-muted-foreground" />
            <p className="text-[10px] font-semibold">
              {item.quota}/{item.total_seats}
            </p>
          </div>
          <p className="text-[9px] text-muted-foreground">ว่าง/ทั้งหมด</p>
        </div>
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ReadyToTravelNotification({ collapsed }: { collapsed: boolean }) {
  const { international, domestic, all } = useReadyToTravel();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const total = all.length;
  if (total === 0) return null;

  const urgentCount = all.filter((i) => i.daysUntil <= 7).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={`${total} period พร้อมเดินทาง (ที่นั่งใกล้เต็ม)`}
          className="relative flex items-center gap-2 w-full rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-sidebar-accent group"
        >
          <div className="relative shrink-0">
            <PlaneTakeoff className="w-4 h-4 text-primary" />
            <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] rounded-full text-[9px] font-bold text-white flex items-center justify-center px-0.5 bg-primary">
              {total > 9 ? "9+" : total}
            </span>
          </div>
          {!collapsed && (
            <span className="text-xs font-semibold truncate text-primary">
              🟣 {urgentCount > 0 ? `${urgentCount} ด่วน · ` : ""}{total} พร้อมเดินทาง
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="right"
        align="end"
        className="w-[380px] p-0 shadow-xl rounded-2xl border border-border overflow-hidden"
        sideOffset={8}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b flex items-center justify-between bg-primary/5">
          <div className="flex items-center gap-2">
            <PlaneTakeoff className="w-4 h-4 text-primary" />
            <p className="text-sm font-bold text-foreground">พร้อมเดินทาง</p>
            <span className="text-xs font-bold px-1.5 py-0.5 rounded-full text-white bg-primary">
              {total}
            </span>
          </div>
          <button
            type="button"
            onClick={() => { setOpen(false); navigate("/app/all-service"); }}
            className="flex items-center gap-1 text-[10px] text-primary hover:underline font-semibold"
          >
            จัดการ Stock <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        {/* Legend */}
        <div className="px-4 py-2 flex items-center gap-4 bg-muted/20 border-b text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-violet-500 inline-block" />
            International ≤ {INT_THRESHOLD} ที่ว่าง
            <span className="font-bold text-violet-700">({international.length})</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-teal-500 inline-block" />
            Domestic ≤ {DOM_THRESHOLD} ที่ว่าง
            <span className="font-bold text-teal-700">({domestic.length})</span>
          </span>
        </div>

        {/* List */}
        <div className="max-h-[400px] overflow-y-auto divide-y divide-border/50">
          {all.map((item) => (
            <PeriodRow key={`${item.tourId}-${item.periodId}`} item={item} />
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t bg-muted/10 text-[10px] text-muted-foreground flex items-center gap-1.5">
          <PlaneTakeoff className="w-3 h-3 text-primary" />
          เรียงตามวันเดินทางใกล้สุด · อัปเดตทุกครั้งที่เปิดแอป
        </div>
      </PopoverContent>
    </Popover>
  );
}
