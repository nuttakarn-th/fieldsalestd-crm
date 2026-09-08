import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Upload,
  Plus,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { useOTAStore } from "@/store/otaStore";
import type { OTAAuditAction } from "@/store/otaStore";
import { cn } from "@/lib/utils";

/* ── helpers ─────────────────────────────────────────────────────────────── */

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "เมื่อกี้";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ชั่วโมงที่แล้ว`;
  const d = Math.floor(h / 24);
  return `${d} วันที่แล้ว`;
}

const ACTION_META: Record<
  OTAAuditAction,
  { label: string; Icon: typeof Bell; color: string }
> = {
  import:       { label: "Import",    Icon: Upload, color: "text-blue-500"   },
  add_order:    { label: "เพิ่ม",     Icon: Plus,   color: "text-green-500"  },
  update_order: { label: "แก้ไข",    Icon: Pencil, color: "text-amber-500"  },
  delete_order: { label: "ลบ",        Icon: Trash2, color: "text-red-500"    },
};

/* ── component ───────────────────────────────────────────────────────────── */

interface OTANotificationBellProps {
  collapsed?: boolean;
}

export function OTANotificationBell({ collapsed = false }: OTANotificationBellProps) {
  const auditLog        = useOTAStore((s) => s.auditLog);
  const markAllAuditRead = useOTAStore((s) => s.markAllAuditRead);

  const [open, setOpen] = useState(false);
  const popoverRef      = useRef<HTMLDivElement>(null);
  const buttonRef       = useRef<HTMLButtonElement>(null);

  const unread = auditLog.filter((e) => !e.read).length;
  const visible = auditLog.slice(0, 20);

  /* mark read on open */
  useEffect(() => {
    if (open && unread > 0) markAllAuditRead();
  }, [open, unread, markAllAuditRead]);

  /* close on outside click */
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
          open
            ? "bg-white/20 text-white"
            : "text-white/60 hover:bg-white/10 hover:text-white"
        )}
        title="การแจ้งเตือน"
      >
        <span className="relative shrink-0">
          <Bell className="w-4 h-4" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] rounded-full bg-red-500 text-[9px] font-bold flex items-center justify-center text-white leading-none px-0.5">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </span>
        {!collapsed && <span className="flex-1 text-left">การแจ้งเตือน</span>}
        {!collapsed && unread > 0 && (
          <span className="shrink-0 min-w-[18px] h-[18px] rounded-full bg-red-500 text-[9px] font-bold flex items-center justify-center text-white px-1">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Popover */}
      {open && (
        <div
          ref={popoverRef}
          className="absolute left-full bottom-0 ml-2 z-50 w-80 rounded-xl shadow-2xl border border-border bg-background text-foreground overflow-hidden"
          style={{ maxHeight: "70vh" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50">
            <span className="font-semibold text-sm">การแจ้งเตือน Order</span>
            <button
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* List */}
          <div className="overflow-y-auto" style={{ maxHeight: "calc(70vh - 52px)" }}>
            {visible.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                <Bell className="w-8 h-8 opacity-30" />
                <span className="text-sm">ยังไม่มีการแจ้งเตือน</span>
              </div>
            ) : (
              visible.map((entry) => {
                const meta = ACTION_META[entry.action];
                const Icon = meta.Icon;
                return (
                  <div
                    key={entry.id}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 border-b border-border last:border-0 transition-colors",
                      !entry.read ? "bg-blue-50 dark:bg-blue-950/20" : "hover:bg-muted/30"
                    )}
                  >
                    {/* Icon */}
                    <div className={cn("mt-0.5 shrink-0", meta.color)}>
                      <Icon className="w-4 h-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-snug text-foreground">{entry.detail}</p>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                        <span className="font-medium truncate max-w-[120px]">{entry.actor}</span>
                        <span>·</span>
                        <span>{relativeTime(entry.timestamp)}</span>
                      </div>
                    </div>

                    {/* Unread dot */}
                    {!entry.read && (
                      <div className="shrink-0 mt-1.5 w-2 h-2 rounded-full bg-blue-500" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
