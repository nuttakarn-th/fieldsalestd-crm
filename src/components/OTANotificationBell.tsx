import { useEffect, useRef, useState } from "react";
import {
  Bell, Upload, Plus, Pencil, Trash2, X, Package,
  ShieldAlert, Filter, ChevronDown,
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
  { label: string; Icon: typeof Bell; color: string; bg: string }
> = {
  import:          { label: "Import",         Icon: Upload,     color: "text-blue-500",   bg: "bg-blue-50 dark:bg-blue-950/30"   },
  add_order:       { label: "เพิ่ม Order",    Icon: Plus,       color: "text-green-600",  bg: "bg-green-50 dark:bg-green-950/30" },
  update_order:    { label: "แก้ไข Order",    Icon: Pencil,     color: "text-amber-600",  bg: "bg-amber-50 dark:bg-amber-950/30" },
  delete_order:    { label: "ลบ Order",       Icon: Trash2,     color: "text-red-500",    bg: "bg-red-50 dark:bg-red-950/20"     },
  add_package:     { label: "เพิ่ม Package",  Icon: Package,    color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/30" },
  update_package:  { label: "แก้ไข Package",  Icon: Package,    color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-950/30" },
  delete_package:  { label: "ลบ Package",     Icon: Trash2,     color: "text-red-400",    bg: "bg-red-50 dark:bg-red-950/20"     },
  format_data:     { label: "Format ข้อมูล", Icon: ShieldAlert, color: "text-rose-600",   bg: "bg-rose-50 dark:bg-rose-950/30"   },
};

// Groups for filter pills
const FILTER_GROUPS: { key: OTAAuditAction | "all"; label: string }[] = [
  { key: "all",           label: "ทั้งหมด"     },
  { key: "add_order",     label: "เพิ่ม Order" },
  { key: "update_order",  label: "แก้ไข Order" },
  { key: "delete_order",  label: "ลบ Order"    },
  { key: "import",        label: "Import"       },
  { key: "add_package",   label: "Package"      },
  { key: "update_package",label: "แก้ไข Pkg"   },
  { key: "delete_package",label: "ลบ Pkg"      },
  { key: "format_data",   label: "Format"       },
];

/* ── component ───────────────────────────────────────────────────────────── */

interface OTANotificationBellProps {
  collapsed?: boolean;
  onOrderClick?: (orderId: string) => void;
}

export function OTANotificationBell({ collapsed = false, onOrderClick }: OTANotificationBellProps) {
  const auditLog          = useOTAStore((s) => s.auditLog);
  const markAllAuditRead  = useOTAStore((s) => s.markAllAuditRead);
  const deleteAuditEntry  = useOTAStore((s) => s.deleteAuditEntry);
  const clearAuditLog     = useOTAStore((s) => s.clearAuditLog);

  const [open, setOpen]             = useState(false);
  const [filterAction, setFilterAction] = useState<OTAAuditAction | "all">("all");
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef  = useRef<HTMLButtonElement>(null);

  const unread  = auditLog.filter((e) => !e.read).length;
  const visible = filterAction === "all"
    ? auditLog
    : auditLog.filter((e) => e.action === filterAction);

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
        setConfirmClearAll(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleClose = () => {
    setOpen(false);
    setShowFilterPanel(false);
    setConfirmClearAll(false);
  };

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
        {!collapsed && <span className="flex-1 text-left">การแจ้งเตือน OTA</span>}
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
          className="absolute left-full bottom-0 ml-2 z-50 w-80 rounded-xl shadow-2xl border border-border bg-background text-foreground overflow-hidden flex flex-col"
          style={{ maxHeight: "75vh" }}
        >
          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50 shrink-0">
            <span className="font-semibold text-sm">
              การแจ้งเตือน OTA
              {filterAction !== "all" && (
                <span className="ml-2 text-[10px] bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded-full">
                  {ACTION_META[filterAction]?.label}
                </span>
              )}
            </span>
            <div className="flex items-center gap-1">
              {/* Filter toggle */}
              <button
                onClick={() => setShowFilterPanel((v) => !v)}
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  showFilterPanel
                    ? "bg-purple-100 dark:bg-purple-900/40 text-purple-600"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
                title="Filter"
              >
                <Filter className="w-3.5 h-3.5" />
              </button>
              {/* Clear all */}
              {auditLog.length > 0 && (
                <button
                  onClick={() => setConfirmClearAll(true)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  title="ลบทั้งหมด"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* ── Confirm clear all banner ────────────────────────────────────── */}
          {confirmClearAll && (
            <div className="px-4 py-3 bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-800 shrink-0">
              <p className="text-xs text-red-700 dark:text-red-400 font-medium mb-2">
                ลบการแจ้งเตือนทั้งหมด {auditLog.length} รายการ?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmClearAll(false)}
                  className="flex-1 text-xs px-3 py-1.5 border border-border rounded-lg bg-background hover:bg-muted transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={() => { clearAuditLog(); setConfirmClearAll(false); }}
                  className="flex-1 text-xs px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
                >
                  ลบทั้งหมด
                </button>
              </div>
            </div>
          )}

          {/* ── Filter pills ────────────────────────────────────────────────── */}
          {showFilterPanel && (
            <div className="px-3 py-2.5 border-b border-border bg-muted/30 shrink-0">
              <p className="text-[10px] text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">Filter ตาม Action</p>
              <div className="flex flex-wrap gap-1">
                {FILTER_GROUPS.map(({ key, label }) => {
                  const count = key === "all"
                    ? auditLog.length
                    : auditLog.filter((e) => e.action === key).length;
                  if (key !== "all" && count === 0) return null;
                  const active = filterAction === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setFilterAction(key)}
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full border transition-colors font-medium",
                        active
                          ? "bg-purple-600 text-white border-purple-600"
                          : "bg-background border-border text-muted-foreground hover:border-purple-400 hover:text-purple-600"
                      )}
                    >
                      {label}
                      <span className={cn("ml-1", active ? "text-purple-200" : "text-muted-foreground/60")}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── List ───────────────────────────────────────────────────────── */}
          <div className="overflow-y-auto flex-1">
            {visible.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                <Bell className="w-8 h-8 opacity-30" />
                <span className="text-sm">
                  {filterAction !== "all" ? "ไม่มีการแจ้งเตือนประเภทนี้" : "ยังไม่มีการแจ้งเตือน"}
                </span>
                {filterAction !== "all" && (
                  <button
                    onClick={() => setFilterAction("all")}
                    className="text-xs text-purple-600 hover:underline"
                  >
                    ดูทั้งหมด
                  </button>
                )}
              </div>
            ) : (
              visible.map((entry) => {
                const meta = ACTION_META[entry.action] ?? ACTION_META.delete_order;
                const Icon = meta.Icon;
                const isClickable = !!entry.order_id && !!onOrderClick &&
                  entry.action !== "delete_order" && entry.action !== "format_data";
                const isFormat = entry.action === "format_data";

                return (
                  <div
                    key={entry.id}
                    className={cn(
                      "group flex items-start gap-3 px-4 py-3 border-b border-border last:border-0 transition-colors relative",
                      isFormat && "bg-rose-50/60 dark:bg-rose-950/10",
                      !entry.read && !isFormat && "bg-blue-50 dark:bg-blue-950/20",
                      isClickable && "cursor-pointer hover:bg-orange-50 dark:hover:bg-orange-950/20",
                      !isClickable && !isFormat && "hover:bg-muted/30"
                    )}
                    onClick={() => {
                      if (isClickable) {
                        onOrderClick!(entry.order_id!);
                        setOpen(false);
                      }
                    }}
                  >
                    {/* Icon badge */}
                    <div className={cn(
                      "mt-0.5 shrink-0 w-7 h-7 rounded-full flex items-center justify-center",
                      meta.bg
                    )}>
                      <Icon className={cn("w-3.5 h-3.5", meta.color)} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-6">
                      <p className={cn(
                        "text-sm leading-snug",
                        isFormat ? "text-rose-700 dark:text-rose-400 font-medium" : "text-foreground"
                      )}>
                        {entry.detail}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span className={cn(
                          "font-medium truncate max-w-[100px]",
                          isFormat && "text-rose-600 dark:text-rose-400"
                        )}>{entry.actor}</span>
                        <span>·</span>
                        <span>{relativeTime(entry.timestamp)}</span>
                        <span className={cn(
                          "px-1.5 py-0.5 rounded-full text-[9px] font-medium",
                          meta.bg, meta.color
                        )}>
                          {meta.label}
                        </span>
                        {isClickable && (
                          <span className="text-orange-500 font-medium">· กดเพื่อดู</span>
                        )}
                      </div>
                    </div>

                    {/* Delete button — shows on hover */}
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteAuditEntry(entry.id); }}
                      className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 p-1 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                      title="ลบการแจ้งเตือนนี้"
                    >
                      <X className="w-3 h-3" />
                    </button>

                    {/* Unread dot */}
                    {!entry.read && !isFormat && (
                      <div className="absolute right-3 bottom-3 w-2 h-2 rounded-full bg-blue-500 group-hover:opacity-0 transition-opacity" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* ── Footer: count ──────────────────────────────────────────────── */}
          {auditLog.length > 0 && (
            <div className="px-4 py-2 border-t border-border bg-muted/30 shrink-0 flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">
                {visible.length} รายการ{filterAction !== "all" ? ` (จาก ${auditLog.length})` : ""}
              </span>
              {filterAction !== "all" && (
                <button
                  onClick={() => setFilterAction("all")}
                  className="text-[10px] text-purple-600 hover:underline"
                >
                  ดูทั้งหมด
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
