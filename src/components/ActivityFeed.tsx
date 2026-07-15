/**
 * ActivityFeed.tsx — Bell icon + popover แสดง activity log สำหรับ Marketing role
 *
 * แสดงกิจกรรมทุก Role: Tour/Period, Lead, Customer, Campaign, Booking
 * ใช้ใน MarketingLayout header ควบคู่กับ TeamNotifications
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, X, Package, Users, Target, Megaphone, BookOpen, ShoppingCart, Zap } from "lucide-react";
import { useActivityLog, type ActivityLog } from "@/store/activityLogStore";

// ── Event → Icon / colour mapping ────────────────────────────────────────────

interface EventMeta {
  icon:    React.ReactNode;
  color:   string;   // Tailwind bg class
  border:  string;   // Tailwind border class
  text:    string;   // Tailwind text class
}

function getEventMeta(event_type: string): EventMeta {
  // ⚡ Period ใกล้เต็ม — highlight แยกพิเศษ
  if (event_type === "period_nearly_full") {
    return {
      icon:   <Zap className="w-3.5 h-3.5" />,
      color:  "bg-yellow-500/20",
      border: "border-yellow-400/40",
      text:   "text-yellow-400",
    };
  }
  if (event_type.startsWith("tour_") || event_type.startsWith("period_") || event_type === "import_complete") {
    return {
      icon:   <Package className="w-3.5 h-3.5" />,
      color:  "bg-violet-500/15",
      border: "border-violet-500/30",
      text:   "text-violet-400",
    };
  }
  if (event_type.startsWith("lead_")) {
    return {
      icon:   <Target className="w-3.5 h-3.5" />,
      color:  "bg-blue-500/15",
      border: "border-blue-500/30",
      text:   "text-blue-400",
    };
  }
  if (event_type.startsWith("customer_")) {
    return {
      icon:   <Users className="w-3.5 h-3.5" />,
      color:  "bg-emerald-500/15",
      border: "border-emerald-500/30",
      text:   "text-emerald-400",
    };
  }
  if (event_type.startsWith("campaign_")) {
    return {
      icon:   <Megaphone className="w-3.5 h-3.5" />,
      color:  "bg-orange-500/15",
      border: "border-orange-500/30",
      text:   "text-orange-400",
    };
  }
  if (event_type.startsWith("seat_")) {
    return {
      icon:   <ShoppingCart className="w-3.5 h-3.5" />,
      color:  "bg-amber-500/15",
      border: "border-amber-500/30",
      text:   "text-amber-400",
    };
  }
  return {
    icon:   <BookOpen className="w-3.5 h-3.5" />,
    color:  "bg-zinc-500/15",
    border: "border-zinc-500/30",
    text:   "text-zinc-400",
  };
}

// ── Relative time formatter ───────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 1)   return "เมื่อกี้";
  if (mins < 60)  return `${mins} นาทีที่แล้ว`;
  if (hours < 24) return `${hours} ชม.ที่แล้ว`;
  if (days < 7)   return `${days} วันที่แล้ว`;
  return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

// ── Single log row ────────────────────────────────────────────────────────────

function LogRow({ log }: { log: ActivityLog }) {
  const meta = getEventMeta(log.event_type);
  return (
    <div className="flex gap-2.5 px-3 py-2.5 hover:bg-white/3 transition-colors">
      {/* Icon badge */}
      <div className={`shrink-0 w-7 h-7 rounded-full border flex items-center justify-center mt-0.5 ${meta.color} ${meta.border} ${meta.text}`}>
        {meta.icon}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold text-white/90 leading-snug truncate">
          {log.subject}
        </p>
        {log.detail && (
          <p className="text-[11px] text-white/50 leading-snug mt-0.5 truncate">
            {log.detail}
          </p>
        )}
        <p className="text-[10px] text-white/30 mt-1 leading-none">
          {log.actor}{log.role ? ` · ${log.role}` : ""}
          {" · "}{relativeTime(log.created_at)}
        </p>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
        <Bell className="w-5 h-5 text-white/20" />
      </div>
      <p className="text-white/40 text-sm font-medium">ยังไม่มีกิจกรรม</p>
      <p className="text-white/25 text-xs mt-1">กิจกรรมจากทุก Role จะปรากฏที่นี่</p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ActivityFeed() {
  const [open, setOpen]           = useState(false);
  const btnRef                    = useRef<HTMLButtonElement>(null);
  const popRef                    = useRef<HTMLDivElement>(null);
  const [popPos, setPopPos]       = useState({ top: 0, right: 0 });

  const logs        = useActivityLog((s) => s.logs);
  const unreadCount = useActivityLog((s) => s.unreadCount);
  const markAllRead = useActivityLog((s) => s.markAllRead);
  const init        = useActivityLog((s) => s.init);

  // init: subscribe on mount
  useEffect(() => {
    const cleanup = init();
    return cleanup;
  }, [init]);

  // Position popover below the bell button
  useEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setPopPos({
      top:   r.bottom + 8,
      right: window.innerWidth - r.right,
    });
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        popRef.current && !popRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function handleOpen() {
    setOpen((v) => !v);
    if (!open) markAllRead();
  }

  const badge = unreadCount > 0;

  // ── Popover JSX ─────────────────────────────────────────────────────────────
  const popover = open && createPortal(
    <div
      ref={popRef}
      style={{
        position:  "fixed",
        top:       popPos.top,
        right:     popPos.right,
        width:     340,
        zIndex:    9999,
        background: "#111116",
        maxHeight:  480,
      }}
      className="flex flex-col rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
    >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/8">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-white/60" />
            <p className="text-sm font-bold text-white/80">กิจกรรมทั้งหมด</p>
            {logs.length > 0 && (
              <span className="text-[10px] text-white/30 font-medium">{logs.length} รายการ</span>
            )}
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/8 transition-colors"
          >
            <X className="w-3.5 h-3.5 text-white/40" />
          </button>
        </div>

        {/* Log list */}
        <div className="overflow-y-auto flex-1" style={{ maxHeight: 400 }}>
          {logs.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="divide-y divide-white/5">
              {logs.map((log) => (
                <LogRow key={log.id} log={log} />
              ))}
            </div>
          )}
        </div>
    </div>,
    document.body,
  );

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleOpen}
        aria-label="กิจกรรมทั้งหมด"
        className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted/50 transition-colors"
      >
        <Bell className="w-5 h-5 text-muted-foreground" />
        {badge && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-0.5 rounded-full bg-orange-500 text-[9px] font-bold flex items-center justify-center text-white leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {popover}
    </>
  );
}
