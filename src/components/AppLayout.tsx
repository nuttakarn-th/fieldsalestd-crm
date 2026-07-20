import { Outlet, Link, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { MessageSquare, AlertTriangle } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { GlobalSearch } from "@/components/GlobalSearch";
import { ChatWidget, useChatUI } from "@/components/ChatWidget";
import { StandyWidget, StandyBtn } from "@/components/StandyWidget";
import { AddCustomerFAB } from "@/components/AddCustomerFAB";
import { ActivityFeed } from "@/components/ActivityFeed";
import { UserMenu } from "@/components/UserMenu";
import { SwitchRoleBtn } from "@/components/SwitchRoleBtn";
import { useCurrentUser, useAuth, useJWTSecondsLeft } from "@/store/authStore";
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

/** Banner แจ้งเตือนเมื่อ session ใกล้หมดอายุ (< 30 นาที) */
function SessionExpiryBanner() {
  const secsLeft = useJWTSecondsLeft();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || secsLeft === null || secsLeft > 30 * 60) return null;

  const mins = Math.max(0, Math.floor(secsLeft / 60));
  const expired = secsLeft <= 0;

  return (
    <div className={`flex items-center gap-2 px-4 py-2 text-sm font-medium ${
      expired ? "bg-destructive/90 text-white" : "bg-amber-500/90 text-white"
    }`}>
      <AlertTriangle className="w-4 h-4 shrink-0" />
      {expired
        ? "Session หมดอายุแล้ว — ข้อมูลใหม่จะไม่ถูกบันทึกไปยัง Cloud กรุณา Login ใหม่"
        : `Session จะหมดอายุใน ${mins} นาที — กรุณา Logout แล้ว Login ใหม่เพื่อความต่อเนื่อง`}
      <button
        onClick={() => setDismissed(true)}
        className="ml-auto text-white/80 hover:text-white text-lg leading-none"
        aria-label="ปิด"
      >×</button>
    </div>
  );
}

// Marketing role มี sidebar/shell แยกของตัวเอง (MarketingLayout + /marketing/*)
// หลายหน้ายังถูก dual-registered ไว้ทั้งใต้ /app/* (AppLayout) และ /marketing/* (MarketingLayout)
// ถ้า Marketing หลุดเข้ามาทาง /app/* ของหน้าที่มีเทียบเท่าใน /marketing อยู่แล้ว ให้ redirect ไปเส้นทางนั้นแทน
// เพื่อไม่ให้เห็น 2 sidebar คู่ขนาน — path ที่ยังไม่มีเทียบเท่า (เช่น /app/marketing-hub) ไม่อยู่ใน mapping นี้ ปล่อย render ปกติ
const APP_TO_MARKETING_PATH: Record<string, string> = {
  "/app": "/marketing",
  "/app/customers": "/marketing/customers",
  "/app/campaigns": "/marketing/campaigns",
  "/app/all-service": "/marketing/all-service",
  "/app/stock-analytics": "/marketing/stock-analytics",
  "/app/marketing-report": "/marketing/marketing-report",
  "/app/marketing-leads": "/marketing/marketing-leads",
};

export default function AppLayout() {
  const user = useCurrentUser();
  const viewAsRole = useAuth((s) => s.viewAsRole);
  const setCurrentRep = useCRM((s) => s.setCurrentRep);
  const location = useLocation();

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
    if (effectiveRole === "Sales" || effectiveRole === "OB Co-ordinator") {
      // Sales + OB Co-ordinator ใช้ชื่อตัวเอง
      // OB Co-ordinator จะถูก expand เป็น OB pool ใน Customers/Pipeline โดยอัตโนมัติ
      // Guard: ถ้า fullName ยังไม่โหลด (null) → อย่า set เป็น null เพราะจะทำให้ filter พัง
      if (currentUserFullName) {
        setCurrentRep(currentUserFullName as SalesRep);
      }
    } else {
      // OB Manager, Admin, Sales Manager และ role อื่นๆ → "All"
      setCurrentRep("All");
    }
  }, [currentUserId, currentUserRole, currentUserFullName, viewAsRole, setCurrentRep]);

  const effectiveRole = user ? (user.role === "Admin" && viewAsRole ? viewAsRole : user.role) : null;
  const showFAB = effectiveRole === "Sales" || effectiveRole === "OB Co-ordinator";

  // Marketing → กันหลุดเข้า /app/* ของหน้าที่มีเทียบเท่าใน /marketing/* อยู่แล้ว (เก็บ query string ไว้ด้วย)
  if (effectiveRole === "Marketing") {
    const path = location.pathname;
    const mapped =
      APP_TO_MARKETING_PATH[path] ??
      (path.startsWith("/app/customers/") ? `/marketing${path.slice("/app".length)}` : null);
    if (mapped) {
      return <Navigate to={`${mapped}${location.search}`} replace />;
    }
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <SessionExpiryBanner />
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
