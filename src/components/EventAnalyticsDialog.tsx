/**
 * EventAnalyticsDialog.tsx
 * วิเคราะห์ยอด View แยกตาม Event/Channel ข้ามทุกโปรแกรม
 * Left: รายการ Event → Right: Ranking โปรแกรมใน Event นั้น
 */

import { useState, useEffect } from "react";
import { BarChart2, Eye, X, TrendingUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getEventAnalytics, type EventStat } from "@/lib/shortLink";
import type { TourItem } from "@/store/serviceStore";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  tours: TourItem[];
}

function tourName(pkg_id: string, tours: TourItem[]): string {
  const tourId = pkg_id.replace(/^tour_/, "").replace(/^d_tour_/, "");
  const t = tours.find((t) => t.id === tourId);
  return t?.name ?? pkg_id;
}

const SOURCE_LABELS: Record<string, string> = {
  facebook: "📘 Facebook",
  line: "💬 LINE",
  instagram: "📸 Instagram",
  tiktok: "🎵 TikTok",
  "qr-event": "🎪 QR งาน",
  brochure: "📄 โบรชัวร์",
  link: "🔗 ลิงค์",
  direct: "🖥 Direct",
};

function sourceLabel(src: string): string {
  return SOURCE_LABELS[src] ?? `🏷 ${src}`;
}

export function EventAnalyticsDialog({ open, onClose, tours }: Props) {
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<EventStat[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSelected(null);
    getEventAnalytics().then((data) => {
      setEvents(data);
      if (data.length > 0) setSelected(data[0].source);
      setLoading(false);
    });
  }, [open]);

  const selectedEvent = events.find((e) => e.source === selected);
  const maxViews = selectedEvent
    ? Math.max(...selectedEvent.programs.map((p) => p.views), 1)
    : 1;

  const totalAllViews = events.reduce((s, e) => s + e.totalViews, 0);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-2xl p-0 gap-0 overflow-hidden">

        {/* Header */}
        <DialogHeader className="px-4 pt-4 pb-3 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <BarChart2 className="w-4 h-4 text-primary shrink-0" />
            Event Analytics — View ตาม Channel
            <span className="ml-auto text-xs font-normal text-muted-foreground flex items-center gap-1">
              <Eye className="w-3 h-3" /> รวม {totalAllViews.toLocaleString()} views
            </span>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground gap-2">
            <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            กำลังโหลด…
          </div>
        ) : events.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            ยังไม่มีข้อมูล View — สร้าง Short Link แล้วแชร์ให้ลูกค้าก่อน
          </div>
        ) : (
          <div className="flex overflow-hidden" style={{ height: "min(70vh, 520px)" }}>

            {/* ── Left: Channel list ── */}
            <div className="w-44 shrink-0 border-r border-border overflow-y-auto bg-muted/20">
              <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border">
                Channel / Event
              </p>
              {events.map((ev) => (
                <button
                  key={ev.source}
                  onClick={() => setSelected(ev.source)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 border-b border-border/50 transition-colors",
                    selected === ev.source
                      ? "bg-primary/10 text-primary font-semibold"
                      : "hover:bg-muted text-foreground"
                  )}
                >
                  <p className="text-xs font-medium truncate">{sourceLabel(ev.source)}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Eye className="w-2.5 h-2.5" />
                    {ev.totalViews.toLocaleString()} views · {ev.programs.length} โปรแกรม
                  </p>
                </button>
              ))}
            </div>

            {/* ── Right: Program ranking ── */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {selectedEvent ? (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-4 h-4 text-primary shrink-0" />
                    <div>
                      <p className="text-sm font-bold">{sourceLabel(selectedEvent.source)}</p>
                      <p className="text-[11px] text-muted-foreground">
                        รวม {selectedEvent.totalViews.toLocaleString()} views · {selectedEvent.programs.length} โปรแกรม
                      </p>
                    </div>
                  </div>

                  {selectedEvent.programs.filter(p => p.views > 0).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">ยังไม่มี View ในช่องทางนี้</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedEvent.programs.map((prog, idx) => {
                        const name = tourName(prog.pkg_id, tours);
                        const pct = Math.round((prog.views / maxViews) * 100);
                        const isTop = idx === 0;
                        return (
                          <div key={prog.pkg_id} className="group">
                            <div className="flex items-center gap-2 mb-1">
                              {/* Rank */}
                              <span className={cn(
                                "shrink-0 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center",
                                idx === 0 ? "bg-amber-400 text-white" :
                                idx === 1 ? "bg-slate-400 text-white" :
                                idx === 2 ? "bg-orange-400 text-white" :
                                "bg-muted text-muted-foreground"
                              )}>
                                {idx + 1}
                              </span>
                              <span className="flex-1 text-xs font-medium truncate" title={name}>{name}</span>
                              <span className={cn(
                                "shrink-0 text-xs font-bold tabular-nums",
                                isTop ? "text-primary" : "text-foreground"
                              )}>
                                {prog.views.toLocaleString()}
                                <Eye className="w-3 h-3 inline ml-0.5 text-muted-foreground" />
                              </span>
                            </div>
                            {/* Bar */}
                            <div className="ml-7 h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-500",
                                  isTop ? "bg-primary" : "bg-primary/40"
                                )}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-12">เลือก Channel ด้านซ้าย</p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
