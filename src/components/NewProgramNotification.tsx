/**
 * NewProgramNotification.tsx
 * ✨ แจ้งเตือนโปรแกรมทัวร์ใหม่ที่เพิ่งสร้าง (ทุก Role เห็น)
 * - Tour ที่สร้างภายใน 7 วัน (updated_at ≤ 7 วัน)
 * - Period ที่สร้างภายใน 7 วัน (period.created_at ≤ 7 วัน)
 */
import { useMemo, useState } from "react";
import { Sparkles, ExternalLink, Calendar, MapPin } from "lucide-react";
import { useServices } from "@/store/serviceStore";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNavigate } from "react-router-dom";

const NEW_DAYS = 7; // ถือว่า "ใหม่" ถ้าสร้างใน 7 วันที่ผ่านมา

export interface NewProgramItem {
  type: "tour" | "period";
  tourId: string;
  periodId?: string;
  tourCode: string;
  tourCity: string;
  country: string;
  category: string;
  startDate?: string;   // period start_date
  createdAt: string;    // ISO timestamp
  createdBy?: string;
  daysAgo: number;
}

// ── hook ──────────────────────────────────────────────────────────────────────
export function useNewPrograms(): NewProgramItem[] {
  const tours = useServices((s) => s.tours);
  return useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cutoff = new Date(today.getTime() - NEW_DAYS * 86400000);
    const results: NewProgramItem[] = [];

    for (const t of tours) {
      // ── New Tour ────────────────────────────────────────────────────────────
      const tourTs = t.updated_at ? new Date(t.updated_at) : null;
      // เช็คว่า tour นี้เพิ่งถูกสร้าง: ไม่มี periods เลย หรือ updated_at ใหม่มาก
      // ใช้ updated_at เป็น proxy สำหรับ created_at (addTour sets updated_at = now)
      if (tourTs && tourTs >= cutoff && (!t.periods || t.periods.length === 0)) {
        const daysAgo = Math.floor((today.getTime() - tourTs.getTime()) / 86400000);
        results.push({
          type: "tour",
          tourId: t.id,
          tourCode: t.code,
          tourCity: t.city,
          country: t.country,
          category: t.category,
          createdAt: t.updated_at!,
          createdBy: t.created_by,
          daysAgo,
        });
      }

      // ── New Period ──────────────────────────────────────────────────────────
      for (const p of t.periods ?? []) {
        if (p.cancelled) continue;
        const periodTs = p.created_at ? new Date(p.created_at) : null;
        if (!periodTs || periodTs < cutoff) continue;
        const daysAgo = Math.floor((today.getTime() - periodTs.getTime()) / 86400000);
        results.push({
          type: "period",
          tourId: t.id,
          periodId: p.period_id,
          tourCode: t.code,
          tourCity: t.city,
          country: t.country,
          category: t.category,
          startDate: p.start_date,
          createdAt: p.created_at!,
          createdBy: p.created_by,
          daysAgo,
        });
      }
    }

    // เรียงจากใหม่สุดก่อน
    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [tours]);
}

// ── helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("th-TH", {
    day: "numeric", month: "short", year: "2-digit",
  });
}

function daysAgoLabel(n: number) {
  if (n === 0) return "วันนี้";
  if (n === 1) return "เมื่อวาน";
  return `${n} วันที่แล้ว`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function NewProgramNotification({ collapsed }: { collapsed: boolean }) {
  const items = useNewPrograms();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const todayCount = items.filter((i) => i.daysAgo === 0).length;
  const total = items.length;

  if (total === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={`${total} โปรแกรมใหม่ใน ${NEW_DAYS} วันที่ผ่านมา`}
          className="relative flex items-center gap-2 w-full rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-sidebar-accent group"
        >
          <div className="relative shrink-0">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] rounded-full text-[9px] font-bold text-white flex items-center justify-center px-0.5 bg-emerald-500">
              {total > 9 ? "9+" : total}
            </span>
          </div>
          {!collapsed && (
            <span className="text-xs font-semibold truncate text-emerald-600">
              ✨ {todayCount > 0 ? `${todayCount} ใหม่วันนี้` : `${total} โปรแกรมใหม่`}
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
        <div className="px-4 py-3 border-b flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <p className="text-sm font-bold text-foreground">โปรแกรมใหม่</p>
            <span className="text-xs font-bold px-1.5 py-0.5 rounded-full text-white bg-emerald-500">
              {total}
            </span>
          </div>
          <button
            type="button"
            onClick={() => { setOpen(false); navigate("/app/all-service"); }}
            className="flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-400 hover:underline font-semibold"
          >
            ดูทั้งหมด <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        {/* Legend */}
        <div className="px-4 py-2 flex items-center gap-3 bg-muted/20 border-b text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            โปรแกรมทัวร์ใหม่
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-teal-400 inline-block" />
            Period ใหม่
          </span>
          <span className="ml-auto">ย้อนหลัง {NEW_DAYS} วัน</span>
        </div>

        {/* List */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-border/50">
          {items.map((item, idx) => (
            <div
              key={`${item.type}-${item.tourId}-${item.periodId ?? idx}`}
              className="px-4 py-3 hover:bg-muted/20 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                    {/* Type badge */}
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white ${item.type === "tour" ? "bg-emerald-500" : "bg-teal-500"}`}>
                      {item.type === "tour" ? "✨ โปรแกรมใหม่" : "📅 Period ใหม่"}
                    </span>
                    {/* Days ago */}
                    <span className="text-[9px] text-muted-foreground">
                      {daysAgoLabel(item.daysAgo)}
                    </span>
                  </div>

                  {/* Tour code + city */}
                  <p className="text-xs font-bold text-foreground truncate">{item.tourCode}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                    <p className="text-[10px] text-muted-foreground truncate">{item.tourCity} · {item.country}</p>
                  </div>

                  {/* Period start date */}
                  {item.startDate && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3 text-teal-500 shrink-0" />
                      <p className="text-[10px] text-teal-600 font-medium">เดินทาง {fmtDate(item.startDate)}</p>
                    </div>
                  )}

                  {/* Category */}
                  <p className="text-[10px] text-muted-foreground mt-0.5">{item.category}</p>
                </div>

                {/* Created by */}
                {item.createdBy && (
                  <div className="text-right shrink-0">
                    <p className="text-[9px] text-muted-foreground">สร้างโดย</p>
                    <p className="text-[10px] font-semibold text-foreground">{item.createdBy}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t bg-muted/10 text-[10px] text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-emerald-500" />
          โปรแกรมและ Period ที่เพิ่มใหม่ใน {NEW_DAYS} วันที่ผ่านมา — ทุกตำแหน่งรับทราบ
        </div>
      </PopoverContent>
    </Popover>
  );
}
