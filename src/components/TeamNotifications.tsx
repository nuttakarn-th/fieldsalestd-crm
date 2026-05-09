import { Bell, CheckCircle2, Clock, UserPlus, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCRM } from "@/store/crmStore";

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short", hour12: false });
}

export function TeamNotifications() {
  const notifications = useCRM((s) => s.teamNotifications);
  const markNotificationsRead = useCRM((s) => s.markNotificationsRead);
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <Popover onOpenChange={(open) => open && markNotificationsRead()}>
      <PopoverTrigger asChild>
        <button className="relative w-10 h-10 rounded-full hover:bg-secondary flex items-center justify-center transition-smooth" aria-label="Team notifications">
          <Bell className="w-5 h-5 text-muted-foreground" />
          {unread > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center px-1">{unread}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-0" align="end">
        <div className="p-4 border-b">
          <p className="font-bold">แจ้งเตือนกิจกรรมทีม</p>
          <p className="text-xs text-muted-foreground">Mission และลูกค้าใหม่จาก Sales ทุกคน</p>
        </div>
        <div className="max-h-[420px] overflow-y-auto divide-y">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">ยังไม่มีแจ้งเตือนใหม่</div>
          ) : notifications.map((n) => (
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
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{fmtTime(n.created_at)}</span>
                    {n.action_url && (
                      <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
                        <Link to={n.action_url}>ดูรายละเอียด <ExternalLink className="w-3 h-3 ml-1" /></Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}