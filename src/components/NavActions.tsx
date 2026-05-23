/**
 * NavActions.tsx
 * ชุดปุ่มด้านขวาของ Navbar ที่ใช้ร่วมกันทุกหน้า
 * (SwitchRoleBtn · StandyBtn · Chat · Notifications · UserMenu)
 * พร้อม render ChatWidget + StandyWidget ด้วย
 */
import { MessageSquare } from "lucide-react";
import { SwitchRoleBtn } from "@/components/SwitchRoleBtn";
import { StandyBtn, StandyWidget } from "@/components/StandyWidget";
import { TeamNotifications } from "@/components/TeamNotifications";
import { UserMenu } from "@/components/UserMenu";
import { ChatWidget, useChatUI } from "@/components/ChatWidget";
import { useCRM } from "@/store/crmStore";
import { useCurrentUser } from "@/store/authStore";
import { useChatRead } from "@/store/chatReadStore";

function ChatBtn() {
  const toggle      = useChatUI((s) => s.toggle);
  const messages    = useCRM((s) => s.chatMessages);
  const currentUser = useCurrentUser();
  const currentRep  = useCRM((s) => s.currentRep);
  const lastReadAt  = useChatRead((s) => s.lastReadAt);
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

/**
 * ใส่ไว้ใน header ของทุกหน้า
 * จะ render ChatWidget + StandyWidget (overlay) โดยอัตโนมัติ
 */
export function NavActions() {
  return (
    <>
      <div className="flex items-center gap-1 shrink-0">
        <SwitchRoleBtn />
        <StandyBtn />
        <ChatBtn />
        <TeamNotifications />
        <UserMenu />
      </div>
      <ChatWidget />
      <StandyWidget />
    </>
  );
}
