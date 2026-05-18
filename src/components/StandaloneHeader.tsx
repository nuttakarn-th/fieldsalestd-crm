import { Link } from "react-router-dom";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/UserMenu";
import { TeamNotifications } from "@/components/TeamNotifications";
import { ChatWidget, useChatUI } from "@/components/ChatWidget";
import { StandyBtn, StandyWidget } from "@/components/StandyWidget";
import { SwitchRoleBtn } from "@/components/SwitchRoleBtn";
import { useCRM } from "@/store/crmStore";
import { useCurrentUser } from "@/store/authStore";
import { useChatRead } from "@/store/chatReadStore";

function ChatHeaderBtn() {
  const toggle = useChatUI((s) => s.toggle);
  const messages = useCRM((s) => s.chatMessages);
  const currentUser = useCurrentUser();
  const currentRep = useCRM((s) => s.currentRep);
  const lastReadAt = useChatRead((s) => s.lastReadAt);
  const me = currentUser?.full_name || (currentRep === "All" ? "Manager" : currentRep);
  const unread = messages.filter(
    (m) => m.author !== me && new Date(m.created_at).getTime() > new Date(lastReadAt).getTime()
  ).length;
  return (
    <button
      onClick={toggle}
      className="shrink-0 relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
      aria-label="แชท"
    >
      <MessageSquare className="w-5 h-5 text-muted-foreground" />
      {unread > 0 && (
        <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-0.5 rounded-full bg-destructive text-[9px] font-bold flex items-center justify-center text-white leading-none">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  );
}

interface StandaloneHeaderProps {
  /** URL ปุ่ม ← กลับ (default "/") */
  backTo?: string;
  /** เนื้อหาพิเศษระหว่างโลโก้กับ icons ด้านขวา (เช่น action buttons ของ admin) */
  extra?: React.ReactNode;
}

/**
 * Header มาตรฐานสำหรับ standalone pages (ไม่อยู่ใน AppLayout)
 * แสดง: ← logo "Standard Tour" | spacer | Chat Bell User
 * รวม <ChatWidget /> ไว้ด้วยแล้ว — ไม่ต้องใส่ซ้ำในหน้า
 */
export function StandaloneHeader({ backTo = "/", extra }: StandaloneHeaderProps) {
  return (
    <>
      <header className="px-5 sm:px-8 py-5 max-w-7xl mx-auto flex items-center gap-3">
        <Link to={backTo}>
          <Button variant="outline" size="icon" className="shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="w-9 h-9 rounded-full overflow-hidden shadow-md shrink-0">
          <img
            src="/logo-icon.png"
            alt="Standard Tour"
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = "/logo-icon.svg"; }}
          />
        </div>
        <span className="font-bold text-sm text-muted-foreground">Standard Tour</span>
        <div className="flex-1">{extra ?? null}</div>
        <div className="flex items-center gap-1 shrink-0">
          <SwitchRoleBtn />
          <StandyBtn />
          <ChatHeaderBtn />
          <TeamNotifications />
          <UserMenu />
        </div>
      </header>
      <ChatWidget />
      <StandyWidget />
    </>
  );
}
