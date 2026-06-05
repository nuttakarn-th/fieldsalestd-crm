import { useEffect } from "react";
import { Bell, CheckCircle2, Clock, UserPlus, ExternalLink, Trash2, ShieldCheck, ShieldX } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCRM } from "@/store/crmStore";
import { useDeleteRequests } from "@/store/deleteRequestStore";
import { useCurrentUser } from "@/store/authStore";

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short", hour12: false });
}

export function TeamNotifications() {
  const user = useCurrentUser();
  const notifications = useCRM((s) => s.teamNotifications);
  const markNotificationsRead = useCRM((s) => s.markNotificationsRead);
  const deleteCustomer = useCRM((s) => s.deleteCustomer);
  const { requests, loadRequests, approveRequest, rejectRequest } = useDeleteRequests();

  const isManager = user?.role === "Admin" || user?.role === "Sales Manager";

  // โหลด delete requests เมื่อ Manager/Admin เปิดระบบ
  useEffect(() => {
    if (isManager) loadRequests();
  }, [isManager, loadRequests]);

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const unreadNotifs  = notifications.filter((n) => !n.read).length;
  const totalBadge    = unreadNotifs + (isManager ? pendingRequests.length : 0);

  return (
    <Popover onOpenChange={(open) => open && markNotificationsRead()}>
      <PopoverTrigger asChild>
        <button
          className="relative w-10 h-10 rounded-full hover:bg-secondary flex items-center justify-center transition-smooth"
          aria-label="Team notifications"
        >
          <Bell className="w-5 h-5 text-muted-foreground" />
          {totalBadge > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center px-1">
              {totalBadge}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-[360px] p-0" align="end">
        <div className="p-4 border-b">
          <p className="font-bold">แจ้งเตือนกิจกรรมทีม</p>
          <p className="text-xs text-muted-foreground">
            {isManager ? "Mission, ลูกค้าใหม่ และคำขอลบลูกค้า" : "Mission และลูกค้าใหม่จาก Sales ทุกคน"}
          </p>
        </div>

        <div className="max-h-[480px] overflow-y-auto divide-y">

          {/* ── Pending Delete Requests (Manager/Admin เท่านั้น) ── */}
          {isManager && pendingRequests.length > 0 && (
            <>
              <div className="px-3 py-2 bg-destructive/5 border-b border-destructive/10">
                <p className="text-xs font-bold text-destructive flex items-center gap-1.5">
                  <Trash2 className="w-3 h-3" />
                  คำขอลบลูกค้า รอการอนุมัติ ({pendingRequests.length} รายการ)
                </p>
              </div>
              {pendingRequests.map((req) => (
                <div key={req.id} className="p-3 bg-destructive/5 hover:bg-destructive/10 transition">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-destructive/15 text-destructive flex items-center justify-center shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold">ขอลบ: {req.customer_name}</p>
                        <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive">
                          รออนุมัติ
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        โดย <strong>{req.requested_by}</strong>
                        {req.reason && ` · เหตุผล: ${req.reason}`}
                      </p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" />{fmtTime(req.created_at)}
                      </p>
                      {/* Approve / Reject buttons */}
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
            </>
          )}

          {/* ── Team notifications ── */}
          {notifications.length === 0 && pendingRequests.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">ยังไม่มีแจ้งเตือนใหม่</div>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className="p-3 hover:bg-muted/40">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    {n.type === "mission_completed" ? <CheckCircle2 className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold">{n.title}</p>
                      <Badge variant="outline" className="text-[10px]">{n.sales}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.detail}</p>
                    <div className="flex items-center justify-between gap-2 mt-2">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />{fmtTime(n.created_at)}
                      </span>
                      {n.action_url && (
                        <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
                          <Link to={n.action_url}>ดูรายละเอียด <ExternalLink className="w-3 h-3 ml-1" /></Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
