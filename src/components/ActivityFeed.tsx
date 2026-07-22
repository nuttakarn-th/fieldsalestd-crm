/**
 * ActivityFeed.tsx v2 — Bell icon + popover แสดง activity log
 *
 * Features v2:
 * ✅ badge ไม่ reset หลัง Refresh (lastReadAt persist localStorage)
 * ✅ Role-aware unread count (นับเฉพาะ events ที่ role นั้นมองเห็น)
 * ✅ Unread highlight — แถวที่ยังไม่อ่านมีจุดฟ้า + bg สว่างกว่า
 * ✅ Clickable rows — กดแถวแล้วไปหน้าที่เกี่ยวข้อง
 * ✅ Group by day — วันนี้ / เมื่อวาน / สัปดาห์นี้ / เก่ากว่า
 * ✅ Clear all — ล้าง list ใน local
 * ✅ Mute filter — ปิด/เปิด แต่ละ category ได้
 * ✅ Real-time toast — แสดง toast มุมขวาบนเมื่อมี entry ใหม่ขณะ popup ปิด
 */

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Bell, X, Package, Users, Target, Megaphone, BookOpen,
  ShoppingCart, Zap, Trash2, ShieldCheck, ShieldX, Clock,
  Settings2, Trash, ChevronDown, ChevronUp,
  Eye, EyeOff, RefreshCw, CircleX, RotateCcw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/sonner";
import { useActivityLog, eventCategory, type ActivityLog, type NotifCategory } from "@/store/activityLogStore";

// ── isUnread utility (inline — ไม่เก็บใน store state) ─────────────────────────
function makeIsUnread(lastReadAt: string) {
  return (entry: ActivityLog) => new Date(entry.created_at) > new Date(lastReadAt);
}
import { useDeleteRequests } from "@/store/deleteRequestStore";
import { useCurrentUser, useActiveSalesTeamNames } from "@/store/authStore";
import { useCRM } from "@/store/crmStore";
import { useServices } from "@/store/serviceStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ── Event meta ────────────────────────────────────────────────────────────────

interface EventMeta { icon: React.ReactNode; color: string; border: string; text: string }

function getEventMeta(event_type: string): EventMeta {
  // ── Positive (Green) — รายได้เข้า / เปิดตัว ─────────────────────────────────
  if (event_type === "seat_booked")
    return { icon: <ShoppingCart className="w-3.5 h-3.5" />, color: "bg-green-500/15", border: "border-green-500/30", text: "text-green-700 dark:text-green-400" };
  if (event_type === "tour_published")
    return { icon: <Eye className="w-3.5 h-3.5" />, color: "bg-green-500/15", border: "border-green-500/30", text: "text-green-700 dark:text-green-400" };

  // ── Negative (Red) — ยกเลิก / ลบถาวร ────────────────────────────────────────
  if (event_type === "period_cancelled")
    return { icon: <CircleX className="w-3.5 h-3.5" />, color: "bg-red-500/15", border: "border-red-500/30", text: "text-red-600 dark:text-red-400" };
  if (event_type === "tour_deleted")
    return { icon: <Trash className="w-3.5 h-3.5" />, color: "bg-red-500/15", border: "border-red-500/30", text: "text-red-600 dark:text-red-400" };

  // ── Neutral-negative (Amber) — คืนของ / ซ่อน ──────────────────────────────
  if (event_type === "seat_released")
    return { icon: <RotateCcw className="w-3.5 h-3.5" />, color: "bg-amber-500/15", border: "border-amber-500/30", text: "text-amber-700 dark:text-amber-400" };
  if (event_type === "tour_unpublished")
    return { icon: <EyeOff className="w-3.5 h-3.5" />, color: "bg-amber-500/15", border: "border-amber-500/30", text: "text-amber-700 dark:text-amber-400" };

  // ── Recovery (Teal) — คืนสถานะ ──────────────────────────────────────────────
  if (event_type === "period_restored")
    return { icon: <RefreshCw className="w-3.5 h-3.5" />, color: "bg-teal-500/15", border: "border-teal-500/30", text: "text-teal-700 dark:text-teal-400" };

  // ── Warning (Yellow) — ใกล้เต็ม ──────────────────────────────────────────────
  if (event_type === "period_nearly_full")
    return { icon: <Zap className="w-3.5 h-3.5" />, color: "bg-yellow-500/20", border: "border-yellow-500/40", text: "text-yellow-600 dark:text-yellow-400" };

  // ── System/Neutral (Violet) — เพิ่มโปรแกรม, import ──────────────────────────
  if (event_type === "tour_added" || event_type === "import_complete")
    return { icon: <Package className="w-3.5 h-3.5" />, color: "bg-violet-500/15", border: "border-violet-500/30", text: "text-violet-600 dark:text-violet-400" };

  // ── Fallback กลุ่มอื่น ────────────────────────────────────────────────────────
  if (event_type.startsWith("lead_"))
    return { icon: <Target className="w-3.5 h-3.5" />, color: "bg-blue-500/15", border: "border-blue-500/30", text: "text-blue-600 dark:text-blue-400" };
  if (event_type.startsWith("customer_"))
    return { icon: <Users className="w-3.5 h-3.5" />, color: "bg-emerald-500/15", border: "border-emerald-500/30", text: "text-emerald-600 dark:text-emerald-400" };
  if (event_type.startsWith("campaign_"))
    return { icon: <Megaphone className="w-3.5 h-3.5" />, color: "bg-orange-500/15", border: "border-orange-500/30", text: "text-orange-600 dark:text-orange-400" };

  return { icon: <BookOpen className="w-3.5 h-3.5" />, color: "bg-muted/60", border: "border-border", text: "text-muted-foreground" };
}

// ── Navigate target ────────────────────────────────────────────────────────────
/** คืน path ที่ควร navigate ไปเมื่อกดแถว activity */
function getNavTarget(log: ActivityLog, role: string): string | null {
  const isMarketing = role === "Marketing";
  const base = (path: string) => isMarketing ? path.replace(/^\/app\//, "/marketing/") : path;

  if (log.event_type.startsWith("tour_") || log.event_type.startsWith("period_") || log.event_type === "import_complete" || log.event_type === "period_nearly_full") {
    return base("/app/all-service");
  }
  if (log.event_type.startsWith("lead_")) {
    // ถ้า detail มี "OB" → pipeline OB, else pipeline sales
    const dept = (log as any).department;
    if (isMarketing) return dept === "OB" ? "/marketing/ob-leads" : "/marketing/sales-leads";
    return "/app/pipeline";
  }
  if (log.event_type.startsWith("customer_")) {
    if (isMarketing) return "/marketing/customers";
    return "/app/customers";
  }
  if (log.event_type.startsWith("campaign_")) {
    if (isMarketing) return "/marketing/campaigns";
    return null;
  }
  if (log.event_type.startsWith("seat_")) {
    return base("/app/all-service");
  }
  return null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 1)   return "เมื่อกี้";
  if (mins < 60)  return `${mins} นาทีที่แล้ว`;
  if (hours < 24) return `${hours} ชม.ที่แล้ว`;
  if (days < 7)   return `${days} วันที่แล้ว`;
  return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short", hour12: false });
}

/** จัดกลุ่ม logs ตามวัน */
function groupByDay(logs: ActivityLog[]) {
  const today     = new Date(); today.setHours(0,0,0,0);
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo   = new Date(today.getTime() - 7 * 86400000);

  const groups: { label: string; items: ActivityLog[] }[] = [
    { label: "วันนี้",     items: [] },
    { label: "เมื่อวาน",   items: [] },
    { label: "สัปดาห์นี้", items: [] },
    { label: "เก่ากว่า",  items: [] },
  ];
  for (const log of logs) {
    const d = new Date(log.created_at); d.setHours(0,0,0,0);
    if (d >= today)     groups[0].items.push(log);
    else if (d >= yesterday) groups[1].items.push(log);
    else if (d >= weekAgo)   groups[2].items.push(log);
    else                     groups[3].items.push(log);
  }
  return groups.filter((g) => g.items.length > 0);
}

// ── Category config (mute panel) ─────────────────────────────────────────────

const CAT_CONFIG: { id: NotifCategory; label: string; icon: React.ReactNode; color: string }[] = [
  { id: "tour",     label: "โปรแกรม/Period", icon: <Package className="w-3 h-3" />,    color: "text-violet-500" },
  { id: "lead",     label: "Leads",           icon: <Target className="w-3 h-3" />,      color: "text-blue-500"   },
  { id: "customer", label: "ลูกค้า",           icon: <Users className="w-3 h-3" />,       color: "text-emerald-500"},
  { id: "campaign", label: "Campaigns",        icon: <Megaphone className="w-3 h-3" />,   color: "text-orange-500" },
  { id: "seat",     label: "จองที่นั่ง",        icon: <ShoppingCart className="w-3 h-3" />,color: "text-amber-500"  },
  { id: "system",   label: "ระบบ/Import",      icon: <BookOpen className="w-3 h-3" />,    color: "text-muted-foreground" },
];

// ── DeptBadge ─────────────────────────────────────────────────────────────────

function DeptBadge({ dept }: { dept?: string }) {
  if (!dept || dept === "System" || dept === "Marketing") return null;
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border leading-none ${
      dept === "OB"
        ? "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/40"
        : "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/40"
    }`}>
      {dept}
    </span>
  );
}

// ── LogRow ─────────────────────────────────────────────────────────────────────

function LogRow({
  log, isUnread, role, onNavigate, tourNameMap,
}: {
  log: ActivityLog;
  isUnread: boolean;
  role: string;
  onNavigate: (path: string) => void;
  tourNameMap: Map<string, string>;
}) {
  const meta   = getEventMeta(log.event_type);
  const target = getNavTarget(log, role);

  return (
    <div
      onClick={() => target && onNavigate(target)}
      className={`flex gap-2.5 px-3 py-2.5 transition-colors group relative ${
        target ? "cursor-pointer" : ""
      } ${
        isUnread
          ? "bg-blue-50/60 dark:bg-blue-500/5 hover:bg-blue-50 dark:hover:bg-blue-500/10"
          : "hover:bg-muted/40"
      }`}
    >
      {/* Unread dot */}
      {isUnread && (
        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
      )}

      {/* Icon */}
      <div className={`shrink-0 w-7 h-7 rounded-full border flex items-center justify-center mt-0.5 ${meta.color} ${meta.border} ${meta.text}`}>
        {meta.icon}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className={`text-[12px] leading-snug truncate ${isUnread ? "font-bold text-foreground" : "font-semibold text-foreground"}`}>
            {log.subject}
          </p>
          <DeptBadge dept={(log as any).department} />
        </div>
        {/* ชื่อโปรแกรม — ใช้ program_name (log ใหม่) หรือ lookup จาก store (log เก่า) */}
        {(() => {
          const resolvedName = (log as any).program_name
            || (log.entity_type === "tour" && log.entity_id ? tourNameMap.get(log.entity_id) : undefined);
          const resolvedCode = (log as any).tour_code ?? undefined;
          return (
            <>
              {resolvedName && (
                <p className="text-[12px] font-semibold text-violet-600 dark:text-violet-400 mt-0.5 leading-snug truncate">
                  {resolvedName}
                </p>
              )}
              {resolvedCode && (
                <p className="text-[10px] font-mono text-muted-foreground/60 mt-0.5 leading-none">
                  {resolvedCode}
                </p>
              )}
            </>
          );
        })()}
        {log.detail && (
          <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 truncate">{log.detail}</p>
        )}
        <p className="text-[10px] text-muted-foreground/60 mt-1 leading-none">
          {log.actor}{log.role ? ` · ${log.role}` : ""}{" · "}{relativeTime(log.created_at)}
        </p>
      </div>

      {/* Arrow hint on hover */}
      {target && (
        <span className="shrink-0 self-center text-muted-foreground/0 group-hover:text-muted-foreground/40 transition-colors text-xs">›</span>
      )}
    </div>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
        <Bell className="w-5 h-5 text-muted-foreground/40" />
      </div>
      <p className="text-muted-foreground text-sm font-medium">ยังไม่มีกิจกรรม</p>
      <p className="text-muted-foreground/60 text-xs mt-1">กิจกรรมจากทุก Role จะปรากฏที่นี่</p>
    </div>
  );
}

// ── MutePanel ─────────────────────────────────────────────────────────────────

function MutePanel({
  mutedCategories,
  onToggle,
  visibleCats,
}: {
  mutedCategories: Record<string, boolean>;
  onToggle: (cat: NotifCategory) => void;
  visibleCats: NotifCategory[];
}) {
  return (
    <div className="px-3 py-3 border-t border-border bg-muted/20 space-y-1">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">การแจ้งเตือน</p>
      <div className="grid grid-cols-2 gap-1">
        {CAT_CONFIG.filter((c) => visibleCats.includes(c.id)).map((c) => {
          const muted = !!mutedCategories[c.id];
          return (
            <button
              key={c.id}
              onClick={() => onToggle(c.id)}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-colors text-left ${
                muted
                  ? "bg-muted/40 text-muted-foreground/50 line-through"
                  : `bg-card border border-border hover:border-border/80 ${c.color}`
              }`}
            >
              <span className={muted ? "opacity-30" : ""}>{c.icon}</span>
              {c.label}
              {muted && <span className="ml-auto text-[9px] font-bold text-muted-foreground/40">ปิด</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function ActivityFeed() {
  const [open, setOpen]         = useState(false);
  const [showMute, setShowMute] = useState(false);
  const [deptTab, setDeptTab]   = useState<"all" | "OB" | "Sales">("all");
  const btnRef                  = useRef<HTMLButtonElement>(null);
  const popRef                  = useRef<HTMLDivElement>(null);
  const [popPos, setPopPos]     = useState({ top: 0, right: 0 });
  const openRef                 = useRef(false); // sync ref for store init callback

  const navigate = useNavigate();

  // Store
  const logs            = useActivityLog((s) => s.logs);
  const lastReadAt      = useActivityLog((s) => s.lastReadAt);
  const mutedCategories = useActivityLog((s) => s.mutedCategories);
  const toastEntry      = useActivityLog((s) => s.toastEntry);
  const markAllRead     = useActivityLog((s) => s.markAllRead);
  const clearLogs       = useActivityLog((s) => s.clearLogs);
  const toggleMute      = useActivityLog((s) => s.toggleMute);
  const consumeToast    = useActivityLog((s) => s.consumeToast);
  const init            = useActivityLog((s) => s.init);

  // isUnread computed inline จาก lastReadAt (plain string, reactive)
  const isUnread = makeIsUnread(lastReadAt);

  // Tour name lookup map — fallback สำหรับ log เก่าที่ไม่มี program_name
  const tours = useServices((s) => s.tours);
  const tourNameMap = useMemo(
    () => new Map(tours.map((t) => [t.id, t.title || t.country || t.code])),
    [tours]
  );

  // Auth
  const user           = useCurrentUser();
  const deleteCustomer = useCRM((s) => s.deleteCustomer);
  const { requests: deleteRequests, loadRequests, approveRequest, rejectRequest } = useDeleteRequests();
  const salesTeamNames = useActiveSalesTeamNames();

  const role         = user?.role ?? "";
  const isAdmin      = role === "Admin";
  const isSalesManager = role === "Sales Manager";
  const isSalesRep   = role === "Sales";
  const isOBManager  = role === "OB Manager";
  const isMarketing  = role === "Marketing";
  const isAnyManager = isAdmin || isSalesManager || isOBManager;
  const isSalesTeamView = isSalesRep || isSalesManager;

  // ── Filter visible logs by role ────────────────────────────────────────────
  const visibleLogs = (() => {
    let filtered = logs;
    // Non-marketing/admin ไม่เห็น campaign events
    if (!isMarketing && !isAdmin) {
      filtered = filtered.filter((l) => !l.event_type.startsWith("campaign_"));
    }
    // Marketing dept tab
    if (isMarketing && deptTab !== "all") {
      filtered = filtered.filter((l) => (l as any).department === deptTab);
    }
    // Sales team เห็นเฉพาะ stock events + events ของทีม
    if (isSalesTeamView) {
      const salesNameSet = new Set(salesTeamNames);
      filtered = filtered.filter((l) => {
        const isStockEvent =
          l.event_type.startsWith("tour_") ||
          l.event_type.startsWith("period_") ||
          l.event_type.startsWith("seat_") ||
          l.event_type === "import_complete" ||
          l.event_type === "period_nearly_full";
        return isStockEvent || salesNameSet.has(l.actor);
      });
    }
    // กรอง muted categories
    filtered = filtered.filter((l) => !mutedCategories[eventCategory(l.event_type)]);
    return filtered;
  })();

  // Role-aware unread count (นับเฉพาะ events ที่ role นี้มองเห็น)
  const unreadCount = visibleLogs.filter((l) => isUnread(l)).length;

  // Delete requests
  const pendingRequests = deleteRequests.filter((r) => {
    if (r.status !== "pending") return false;
    if (isAdmin) return true;
    if (isSalesManager) return (r.department ?? "sales") === "sales";
    if (isOBManager) return r.department === "ob";
    return false;
  });

  const totalBadge = unreadCount + (isAnyManager ? pendingRequests.length : 0);

  // Categories visible to this role (for mute panel)
  const visibleCats: NotifCategory[] = ["tour", "lead", "customer", "seat", "system"];
  if (isMarketing || isAdmin) visibleCats.push("campaign");

  // ── Init ──────────────────────────────────────────────────────────────────
  const getFeedOpen = useCallback(() => openRef.current, []);
  useEffect(() => { const cleanup = init(getFeedOpen); return cleanup; }, [init, getFeedOpen]);
  useEffect(() => { if (isAnyManager) loadRequests(); }, [isAnyManager, loadRequests]);

  // ── Popup position ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setPopPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
  }, [open]);

  // ── Click outside ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        popRef.current && !popRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // ── Real-time toast ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!toastEntry) return;
    const meta = getEventMeta(toastEntry.event_type);
    const target = getNavTarget(toastEntry, role);
    toast(toastEntry.subject, {
      description: [toastEntry.detail, toastEntry.actor].filter(Boolean).join(" · "),
      duration: 4000,
      action: target
        ? { label: "ดู", onClick: () => navigate(target) }
        : undefined,
    });
    consumeToast();
  }, [toastEntry, role, navigate, consumeToast]);

  // ── Open handler ──────────────────────────────────────────────────────────
  function handleOpen() {
    const next = !open;
    openRef.current = next;
    setOpen(next);
    if (next) { markAllRead(); setShowMute(false); }
  }

  // ── Grouped logs ──────────────────────────────────────────────────────────
  const groups = groupByDay(visibleLogs);

  // ── Popover ───────────────────────────────────────────────────────────────
  const popover = open && createPortal(
    <div
      ref={popRef}
      style={{ position: "fixed", top: popPos.top, right: popPos.right, width: 380, zIndex: 9999, maxHeight: 560 }}
      className="flex flex-col rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl overflow-hidden"
    >
      {/* ── Header ── */}
      <div className="border-b border-border shrink-0">
        <div className="flex items-center justify-between px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-bold text-foreground">กิจกรรมทั้งหมด</p>
            {visibleLogs.length > 0 && (
              <span className="text-[10px] text-muted-foreground/60 font-medium">{visibleLogs.length} รายการ</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {/* Mute toggle */}
            <button
              onClick={() => setShowMute((v) => !v)}
              title="ตั้งค่าการแจ้งเตือน"
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                showMute ? "bg-muted text-foreground" : "hover:bg-muted/60 text-muted-foreground"
              }`}
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>
            {/* Clear */}
            {visibleLogs.length > 0 && (
              <button
                onClick={() => { if (window.confirm("ล้างรายการกิจกรรมทั้งหมด? (ข้อมูลใน database ยังคงอยู่)")) clearLogs(); }}
                title="ล้างรายการ"
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted/60 text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash className="w-3.5 h-3.5" />
              </button>
            )}
            {/* Close */}
            <button
              onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted/60 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Marketing dept filter tabs */}
        {isMarketing && (
          <div className="flex items-center gap-0.5 px-3 pb-2.5">
            {(["all", "OB", "Sales"] as const).map((d) => {
              const labels = { all: "ทั้งหมด", OB: "🟣 OB", Sales: "🔵 Sales" };
              const active = deptTab === d;
              return (
                <button
                  key={d}
                  onClick={() => setDeptTab(d)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                    active
                      ? d === "OB"
                        ? "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300"
                        : d === "Sales"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
                        : "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/60"
                  }`}
                >
                  {labels[d]}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Mute panel (collapsible) ── */}
      {showMute && (
        <MutePanel
          mutedCategories={mutedCategories}
          onToggle={toggleMute}
          visibleCats={visibleCats}
        />
      )}

      {/* ── Scrollable content ── */}
      <div className="overflow-y-auto flex-1">

        {/* Delete requests (Manager เท่านั้น) */}
        {isAnyManager && pendingRequests.length > 0 && (
          <div>
            <div className="px-3 py-2 bg-destructive/5 border-b border-destructive/10">
              <p className="text-xs font-bold text-destructive flex items-center gap-1.5">
                <Trash2 className="w-3 h-3" />
                คำขอลบลูกค้า รอการอนุมัติ ({pendingRequests.length} รายการ)
              </p>
            </div>
            {pendingRequests.map((req) => (
              <div key={req.id} className="p-3 bg-destructive/5 hover:bg-destructive/10 transition border-b border-destructive/10">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-destructive/15 text-destructive flex items-center justify-center shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[12px] font-semibold text-foreground">ขอลบ: {req.customer_name}</p>
                      <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive px-1.5 h-4">รออนุมัติ</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      โดย <strong>{req.requested_by}</strong>{req.reason && ` · ${req.reason}`}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3" />{fmtTime(req.created_at)}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" className="h-7 text-xs gap-1 bg-destructive hover:bg-destructive/90 text-white flex-1"
                        onClick={() => approveRequest(req.id, user?.full_name ?? "Manager", deleteCustomer)}>
                        <ShieldCheck className="w-3.5 h-3.5" /> อนุมัติลบ
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 flex-1"
                        onClick={() => rejectRequest(req.id, user?.full_name ?? "Manager")}>
                        <ShieldX className="w-3.5 h-3.5" /> ปฏิเสธ
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Activity log — grouped by day */}
        {visibleLogs.length === 0 && pendingRequests.length === 0 ? (
          <EmptyState />
        ) : visibleLogs.length === 0 ? (
          <div className="py-4 text-center">
            <p className="text-xs text-muted-foreground/60">ยังไม่มีกิจกรรมล่าสุด</p>
          </div>
        ) : (
          <div>
            {groups.map((group) => (
              <div key={group.label}>
                {/* Day separator */}
                <div className="sticky top-0 px-3 py-1.5 bg-muted/60 backdrop-blur-sm border-y border-border/40 z-10">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{group.label}</p>
                </div>
                <div className="divide-y divide-border/40">
                  {group.items.map((log) => (
                    <LogRow
                      key={log.id}
                      log={log}
                      isUnread={isUnread(log)}
                      role={role}
                      tourNameMap={tourNameMap}
                      onNavigate={(path) => { setOpen(false); navigate(path); }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      {visibleLogs.length > 0 && (
        <div className="px-3 py-2 border-t border-border bg-muted/10 shrink-0 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground/60">
            {unreadCount > 0 ? `${unreadCount} รายการยังไม่ได้อ่าน` : "อ่านครบแล้ว ✓"}
          </span>
          <button
            onClick={() => setShowMute((v) => !v)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <Settings2 className="w-3 h-3" />
            ตั้งค่า
            {showMute ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      )}
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
        <Bell className={`w-5 h-5 ${totalBadge > 0 ? "text-foreground" : "text-muted-foreground"}`} />
        {totalBadge > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-0.5 rounded-full bg-orange-500 text-[9px] font-bold flex items-center justify-center text-white leading-none">
            {totalBadge > 99 ? "99+" : totalBadge}
          </span>
        )}
      </button>
      {popover}
    </>
  );
}
