/**
 * ActivityFeed.tsx — Bell icon + popover แสดง activity log สำหรับทุก Role
 *
 * - แสดงกิจกรรมทุก Role: Tour/Period, Lead, Customer, Campaign, Booking
 * - Sales Manager เห็น pending delete requests ของฝ่าย Sales
 * - OB Manager เห็น pending delete requests ของฝ่าย OB
 * - Admin เห็น pending delete requests ทั้งหมด
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, X, Package, Users, Target, Megaphone, BookOpen, ShoppingCart, Zap, Trash2, ShieldCheck, ShieldX, Clock } from "lucide-react";
import { useActivityLog, type ActivityLog } from "@/store/activityLogStore";
import { useDeleteRequests } from "@/store/deleteRequestStore";
import { useCurrentUser } from "@/store/authStore";
import { useCRM } from "@/store/crmStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface EventMeta {
  icon:    React.ReactNode;
  color:   string;
  border:  string;
  text:    string;
}

function getEventMeta(event_type: string): EventMeta {
  if (event_type === "period_nearly_full") {
    return { icon: <Zap className="w-3.5 h-3.5" />, color: "bg-yellow-500/20", border: "border-yellow-500/40", text: "text-yellow-600 dark:text-yellow-400" };
  }
  if (event_type.startsWith("tour_") || event_type.startsWith("period_") || event_type === "import_complete") {
    return { icon: <Package className="w-3.5 h-3.5" />, color: "bg-violet-500/15", border: "border-violet-500/30", text: "text-violet-600 dark:text-violet-400" };
  }
  if (event_type.startsWith("lead_")) {
    return { icon: <Target className="w-3.5 h-3.5" />, color: "bg-blue-500/15", border: "border-blue-500/30", text: "text-blue-600 dark:text-blue-400" };
  }
  if (event_type.startsWith("customer_")) {
    return { icon: <Users className="w-3.5 h-3.5" />, color: "bg-emerald-500/15", border: "border-emerald-500/30", text: "text-emerald-600 dark:text-emerald-400" };
  }
  if (event_type.startsWith("campaign_")) {
    return { icon: <Megaphone className="w-3.5 h-3.5" />, color: "bg-orange-500/15", border: "border-orange-500/30", text: "text-orange-600 dark:text-orange-400" };
  }
  if (event_type.startsWith("seat_")) {
    return { icon: <ShoppingCart className="w-3.5 h-3.5" />, color: "bg-amber-500/15", border: "border-amber-500/30", text: "text-amber-600 dark:text-amber-400" };
  }
  return { icon: <BookOpen className="w-3.5 h-3.5" />, color: "bg-muted/60", border: "border-border", text: "text-muted-foreground" };
}

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

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short", hour12: false });
}

function LogRow({ log }: { log: ActivityLog }) {
  const meta = getEventMeta(log.event_type);
  return (
    <div className="flex gap-2.5 px-3 py-2.5 hover:bg-muted/40 transition-colors">
      <div className={`shrink-0 w-7 h-7 rounded-full border flex items-center justify-center mt-0.5 ${meta.color} ${meta.border} ${meta.text}`}>
        {meta.icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold text-foreground leading-snug truncate">{log.subject}</p>
        {log.detail && (
          <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 truncate">{log.detail}</p>
        )}
        <p className="text-[10px] text-muted-foreground/60 mt-1 leading-none">
          {log.actor}{log.role ? ` · ${log.role}` : ""}{" · "}{relativeTime(log.created_at)}
        </p>
      </div>
    </div>
  );
}

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

export function ActivityFeed() {
  const [open, setOpen]     = useState(false);
  const btnRef              = useRef<HTMLButtonElement>(null);
  const popRef              = useRef<HTMLDivElement>(null);
  const [popPos, setPopPos] = useState({ top: 0, right: 0 });

  const logs        = useActivityLog((s) => s.logs);
  const unreadCount = useActivityLog((s) => s.unreadCount);
  const markAllRead = useActivityLog((s) => s.markAllRead);
  const init        = useActivityLog((s) => s.init);

  const user          = useCurrentUser();
  const deleteCustomer = useCRM((s) => s.deleteCustomer);
  const { requests: deleteRequests, loadRequests, approveRequest, rejectRequest } = useDeleteRequests();

  // Determine role-based visibility
  const isAdmin       = user?.role === "Admin";
  const isSalesManager = user?.role === "Sales Manager";
  const isOBManager   = user?.role === "OB Manager";
  const isAnyManager  = isAdmin || isSalesManager || isOBManager;

  // Filter pending requests by department for each manager type
  const pendingRequests = deleteRequests.filter((r) => {
    if (r.status !== "pending") return false;
    if (isAdmin) return true;
    if (isSalesManager) return (r.department ?? "sales") === "sales";
    if (isOBManager) return r.department === "ob";
    return false;
  });

  useEffect(() => { const cleanup = init(); return cleanup; }, [init]);
  useEffect(() => { if (isAnyManager) loadRequests(); }, [isAnyManager, loadRequests]);

  useEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setPopPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
  }, [open]);

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

  function handleOpen() { setOpen((v) => !v); if (!open) markAllRead(); }

  const totalBadge = unreadCount + (isAnyManager ? pendingRequests.length : 0);

  const popover = open && createPortal(
    <div
      ref={popRef}
      style={{ position: "fixed", top: popPos.top, right: popPos.right, width: 360, zIndex: 9999, maxHeight: 520 }}
      className="flex flex-col rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm font-bold text-foreground">กิจกรรมทั้งหมด</p>
          {logs.length > 0 && (
            <span className="text-[10px] text-muted-foreground/60 font-medium">{logs.length} รายการ</span>
          )}
        </div>
        <button
          onClick={() => setOpen(false)}
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted/60 transition-colors"
        >
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      <div className="overflow-y-auto flex-1" style={{ maxHeight: 460 }}>

        {/* ── Pending Delete Requests (Manager เท่านั้น) ── */}
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
                      <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive px-1.5 h-4">
                        รออนุมัติ
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      โดย <strong>{req.requested_by}</strong>
                      {req.reason && ` · ${req.reason}`}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3" />{fmtTime(req.created_at)}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        className="h-7 text-xs gap-1 bg-destructive hover:bg-destructive/90 text-white flex-1"
                        onClick={() => approveRequest(req.id, user?.full_name ?? "Manager", deleteCustomer)}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" /> อนุมัติลบ
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1 flex-1"
                        onClick={() => rejectRequest(req.id, user?.full_name ?? "Manager")}
                      >
                        <ShieldX className="w-3.5 h-3.5" /> ปฏิเสธ
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Activity Log ── */}
        {logs.length === 0 && pendingRequests.length === 0 ? (
          <EmptyState />
        ) : logs.length === 0 ? null : (
          <div className="divide-y divide-border/50">
            {logs.map((log) => <LogRow key={log.id} log={log} />)}
          </div>
        )}

        {/* Empty state when no logs but there were pending requests shown above */}
        {logs.length === 0 && pendingRequests.length > 0 && (
          <div className="py-4 text-center">
            <p className="text-xs text-muted-foreground/60">ยังไม่มีกิจกรรมล่าสุด</p>
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
