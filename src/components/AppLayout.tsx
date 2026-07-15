import { Outlet, Link } from "react-router-dom";
import { useEffect } from "react";
import { MessageSquare } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { GlobalSearch } from "@/components/GlobalSearch";
import { ChatWidget, useChatUI } from "@/components/ChatWidget";
import { StandyWidget, StandyBtn } from "@/components/StandyWidget";
import { AddCustomerFAB } from "@/components/AddCustomerFAB";
import { ActivityFeed } from "@/components/ActivityFeed";
import { UserMenu } from "@/components/UserMenu";
import { SwitchRoleBtn } from "@/components/SwitchRoleBtn";
import { useCurrentUser, useAuth } from "@/store/authStore";
import { useCRM, type SalesRep } from "@/store/crmStore";
import { useChatRead } from "@/store/chatReadStore";

function ChatHeaderButton() {
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
      className="shrink-0 relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted/50 transition-colors"
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

export default function AppLayout() {
  const user = useCurrentUser();
  const viewAsRole = useAuth((s) => s.viewAsRole);
  const setCurrentRep = useCRM((s) => s.setCurrentRep);

  // ใช้ primitive selectors แยกเพื่อป้องกัน effect re-run เมื่อ users array replace
  // (useCurrentUser() return new object ref ทุกครั้งที่ loadUsersFromSupabase runs)
  const currentUserId = useAuth((s) => s.currentUserId);
  const currentUserRole = useAuth(
    (s) => s.users.find((u) => u.user_id === s.currentUserId)?.role ?? null
  );
  const currentUserFullName = useAuth(
    (s) => s.users.find((u) => u.user_id === s.currentUserId)?.full_name ?? null
  );

  useEffect(() => {
    if (!currentUserId) return;
    const effectiveRole = currentUserRole === "Admin" && viewAsRole ? viewAsRole : currentUserRole;
    if (effectiveRole === "Sales") {
      // Sales ใช้ชื่อตัวเอง — เห็นเฉพาะลูกค้าของตัวเอง
      setCurrentRep(currentUserFullName as SalesRep);
    } else {
      // OB Co-ordinator, OB Manager, Admin, Sales Manager และ role อื่นๆ → "All"
      // OB role จะถูก filter เพิ่มเติมใน Customers/Pipeline ด้วย useActiveOBNames()
      setCurrentRep("All");
    }
  }, [currentUserId, currentUserRole, currentUserFullName, viewAsRole, setCurrentRep]);

  const effectiveRole = user ? (user.role === "Admin" && viewAsRole ? viewAsRole : user.role) : null;
  const showFAB = effectiveRole === "Sales" || effectiveRole === "OB Co-ordinator";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-40 flex items-center px-3 sm:px-6 gap-3">
            <SidebarTrigger className="shrink-0" />
            <Link to="/" className="flex items-center gap-2 shrink-0 group" aria-label="กลับหน้าหลัก" title="หน้าหลัก">
              <div className="w-8 h-8 shrink-0 rounded-full overflow-hidden group-hover:scale-105 transition">
                <img
                  src="/logo-icon.png"
                  alt="Standard Tour"
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = "/logo-icon.svg"; }}
                />
              </div>
              <span className="hidden md:inline font-bold text-sm">Standard Tour CRM</span>
            </Link>
            <GlobalSearch />
            <div className="ml-auto flex items-center gap-1 shrink-0">
              <SwitchRoleBtn />
              <ChatHeaderButton />
              <ActivityFeed />
              <StandyBtn />
              <UserMenu />
            </div>
          </header>
          <main className={`flex-1 overflow-auto${showFAB ? " pb-28" : ""}`}>
            <Outlet />
          </main>
        </div>
        <ChatWidget />
        <StandyWidget />
        {showFAB && <AddCustomerFAB />}
      </div>
    </SidebarProvider>
  );
}
