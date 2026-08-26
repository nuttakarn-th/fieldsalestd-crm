/**
 * EventAnalyticsDialog.tsx
 * วิเคราะห์ยอด View แยกตาม Event/Channel ข้ามทุกโปรแกรม
 * รองรับ Snapshot/Baseline — นับ view เฉพาะช่วงงาน
 */

import { useState, useEffect } from "react";
import { BarChart2, Eye, Camera, Clock, TrendingUp, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getEventAnalytics,
  getLinksForPkg,
  saveSnapshot,
  getLatestSnapshot,
  type EventStat,
  type EventSnapshot,
} from "@/lib/shortLink";
import type { TourItem } from "@/store/serviceStore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  tours: TourItem[];
}

function tourName(pkg_id: string, tours: TourItem[]): string {
  const tourId = pkg_id.replace(/^tour_/, "").replace(/^d_tour_/, "");
  const t = tours.find((t) => t.id === tourId);
  return t?.title ?? t?.city ?? pkg_id;
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

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("th-TH", {
    day: "numeric", month: "short", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

export function EventAnalyticsDialog({ open, onClose, tours }: Props) {
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<EventStat[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  // Snapshot state per channel
  const [snapshots, setSnapshots] = useState<Record<string, EventSnapshot | null>>({});
  const [snapping, setSnapping] = useState(false);
  const [snapName, setSnapName] = useState("");
  const [showSnapInput, setShowSnapInput] = useState(false);

  // View mode
  const [mode, setMode] = useState<"total" | "event">("total");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSelected(null);
    setMode("total");
    setShowSnapInput(false);
    setSnapName("");
    getEventAnalytics().then((data) => {
      setEvents(data);
      if (data.length > 0) setSelected(data[0].source);
      setLoading(false);
      // โหลด snapshot ของทุก channel
      data.forEach((ev) => {
        getLatestSnapshot(ev.source).then((snap) => {
          setSnapshots((prev) => ({ ...prev, [ev.source]: snap }));
        });
      });
    });
  }, [open]);

  const selectedEvent = events.find((e) => e.source === selected);
  const selectedSnap = selected ? snapshots[selected] ?? null : null;

  // คำนวณ net views (current - baseline)
  function netViews(prog: { pkg_id: string; views: number }): number {
    if (!selectedSnap) return prog.views;
    // หาทุก link ใน pkg_id นี้ที่มี baseline
    const base = Object.entries(selectedSnap.baselines)
      .filter(([code]) => {
        // link code ไม่ได้ map ตรงๆ กับ pkg_id — ต้องหาใน selectedEvent
        // แต่เนื่องจาก baselines เก็บ code ทั้งหมดในช่วง snapshot
        // เราเก็บ baseline ต่อ code ไม่ใช่ต่อ pkg_id
        // ดังนั้นต้องหาจาก selectedEvent.programs ไม่ได้
        // วิธีที่ถูกต้อง: ต้องโหลด links per pkg + channel แต่จะช้า
        // ใช้วิธีง่ายกว่า: baseline per channel per pkg_id (เก็บแบบ pkg_id)
        return code === prog.pkg_id; // ดูด้านล่าง — เปลี่ยนวิธีเก็บ
      })
      .reduce((s, [, v]) => s + v, 0);
    return Math.max(0, prog.views - base);
  }

  // views สำหรับแสดง
  function displayViews(prog: { pkg_id: string; views: number }): number {
    if (mode === "total" || !selectedSnap) return prog.views;
    const base = (selectedSnap.baselines as Record<string, number>)[prog.pkg_id] ?? 0;
    return Math.max(0, prog.views - base);
  }

  const displayPrograms = selectedEvent
    ? [...selectedEvent.programs]
        .map((p) => ({ ...p, displayV: displayViews(p) }))
        .sort((a, b) => b.displayV - a.displayV)
    : [];

  const maxDisplayViews = Math.max(...displayPrograms.map((p) => p.displayV), 1);
  const totalDisplayViews = displayPrograms.reduce((s, p) => s + p.displayV, 0);
  const totalAllViews = events.reduce((s, e) => s + e.totalViews, 0);

  async function handleSnapshot() {
    if (!selected || !selectedEvent) return;
    setSnapping(true);
    // สร้าง baselines จาก pkg_id → views (เก็บ per pkg_id เพื่อ net calc ง่าย)
    const baselines: Record<string, number> = {};
    for (const prog of selectedEvent.programs) {
      baselines[prog.pkg_id] = prog.views;
    }
    // บันทึกโดยใช้ baselines แบบ pkg_id key (override ShortLink[] param)
    const ok = await (async () => {
      const { supabase } = await import("@/lib/supabase");
      if (!supabase) return false;
      const { error } = await supabase.from("event_snapshots").insert({
        channel: selected,
        snapshot_name: snapName.trim() || null,
        baselines,
      });
      return !error;
    })();
    setSnapping(false);
    if (ok) {
      toast.success("บันทึก Baseline แล้ว");
      const snap = await getLatestSnapshot(selected);
      setSnapshots((prev) => ({ ...prev, [selected]: snap }));
      setShowSnapInput(false);
      setSnapName("");
      setMode("event");
    } else {
      toast.error("บันทึกล้มเหลว");
    }
  }

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
          <div className="flex overflow-hidden" style={{ height: "min(75vh, 560px)" }}>

            {/* ── Left: Channel list ── */}
            <div className="w-44 shrink-0 border-r border-border overflow-y-auto bg-muted/20">
              <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border">
                Channel / Event
              </p>
              {events.map((ev) => {
                const hasSnap = !!snapshots[ev.source];
                return (
                  <button
                    key={ev.source}
                    onClick={() => { setSelected(ev.source); setMode("total"); setShowSnapInput(false); }}
                    className={cn(
                      "w-full text-left px-3 py-2.5 border-b border-border/50 transition-colors",
                      selected === ev.source
                        ? "bg-primary/10 text-primary font-semibold"
                        : "hover:bg-muted text-foreground"
                    )}
                  >
                    <p className="text-xs font-medium truncate flex items-center gap-1">
                      {sourceLabel(ev.source)}
                      {hasSnap && <span className="text-[9px] bg-emerald-100 text-emerald-700 rounded px-1">📸</span>}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Eye className="w-2.5 h-2.5" />
                      {ev.totalViews.toLocaleString()} · {ev.programs.length} โปรแกรม
                    </p>
                  </button>
                );
              })}
            </div>

            {/* ── Right: Program ranking ── */}
            <div className="flex-1 flex flex-col overflow-hidden">

              {selectedEvent && (
                <>
                  {/* Toolbar */}
                  <div className="px-4 py-3 border-b border-border space-y-2 shrink-0">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{sourceLabel(selectedEvent.source)}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {mode === "event" && selectedSnap
                            ? `วิวในงาน: ${totalDisplayViews.toLocaleString()} · (total: ${selectedEvent.totalViews.toLocaleString()})`
                            : `รวม ${selectedEvent.totalViews.toLocaleString()} views · ${selectedEvent.programs.length} โปรแกรม`
                          }
                        </p>
                      </div>

                      {/* Mode toggle */}
                      {selectedSnap && (
                        <div className="flex text-[11px] rounded-lg border border-border overflow-hidden shrink-0">
                          <button
                            onClick={() => setMode("total")}
                            className={cn("px-2 py-1 transition-colors", mode === "total" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
                          >ทั้งหมด</button>
                          <button
                            onClick={() => setMode("event")}
                            className={cn("px-2 py-1 transition-colors border-l border-border", mode === "event" ? "bg-emerald-500 text-white" : "hover:bg-muted")}
                          >ในงาน</button>
                        </div>
                      )}
                    </div>

                    {/* Snapshot info or button */}
                    {selectedSnap ? (
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-1.5">
                        <Camera className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span className="flex-1 truncate">
                          Baseline: <strong className="text-emerald-700 dark:text-emerald-400">{selectedSnap.snapshot_name ?? "ไม่ระบุชื่อ"}</strong>
                          {" · "}<Clock className="w-2.5 h-2.5 inline" /> {fmtTime(selectedSnap.snapped_at)}
                        </span>
                        <button
                          onClick={() => setShowSnapInput(true)}
                          className="shrink-0 text-[10px] text-primary hover:underline"
                        >อัปเดต</button>
                      </div>
                    ) : showSnapInput ? (
                      <div className="flex gap-2 items-center">
                        <Input
                          placeholder="ชื่อ snapshot เช่น ก่อนงาน TITF"
                          value={snapName}
                          onChange={(e) => setSnapName(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleSnapshot()}
                          className="h-7 text-xs flex-1"
                        />
                        <Button size="sm" className="h-7 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shrink-0" onClick={handleSnapshot} disabled={snapping}>
                          {snapping ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "บันทึก"}
                        </Button>
                        <button onClick={() => setShowSnapInput(false)} className="text-muted-foreground text-xs shrink-0">ยกเลิก</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowSnapInput(true)}
                        className="flex items-center gap-1.5 text-[11px] text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg px-3 py-1.5 transition-colors w-full"
                      >
                        <Camera className="w-3 h-3 shrink-0" />
                        📸 บันทึก Baseline ก่อนงาน — นับ view เฉพาะช่วงงาน
                      </button>
                    )}
                  </div>

                  {/* Program list */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {displayPrograms.filter(p => p.displayV > 0).length === 0 ? (
                      <div className="text-sm text-muted-foreground text-center py-8 flex flex-col items-center gap-2">
                        <Info className="w-5 h-5" />
                        {mode === "event"
                          ? "ยังไม่มี View หลัง Baseline — งานยังไม่เริ่มหรือยังไม่มีคนสแกน"
                          : "ยังไม่มี View ในช่องทางนี้"
                        }
                      </div>
                    ) : (
                      displayPrograms.map((prog, idx) => {
                        const name = tourName(prog.pkg_id, tours);
                        const pct = Math.round((prog.displayV / maxDisplayViews) * 100);
                        return (
                          <div key={prog.pkg_id}>
                            <div className="flex items-center gap-2 mb-1">
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
                                "shrink-0 text-xs font-bold tabular-nums flex items-center gap-0.5",
                                idx === 0 ? "text-primary" : "text-foreground"
                              )}>
                                {prog.displayV.toLocaleString()}
                                <Eye className="w-3 h-3 text-muted-foreground" />
                              </span>
                            </div>
                            <div className="ml-7 h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-500",
                                  mode === "event" ? "bg-emerald-500" : idx === 0 ? "bg-primary" : "bg-primary/40"
                                )}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
