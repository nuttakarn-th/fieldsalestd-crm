import { Outlet, Link } from "react-router-dom";
import { useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { GlobalSearch } from "@/components/GlobalSearch";
import { ChatWidget } from "@/components/ChatWidget";
import { AddCustomerFAB } from "@/components/AddCustomerFAB";
import { TeamNotifications } from "@/components/TeamNotifications";
import { UserMenu } from "@/components/UserMenu";
import { useCurrentUser, useAuth } from "@/store/authStore";
import { useCRM, type SalesRep } from "@/store/crmStore";

export default function AppLayout() {
  const user = useCurrentUser();
  const viewAsRole = useAuth((s) => s.viewAsRole);
  const setCurrentRep = useCRM((s) => s.setCurrentRep);

  useEffect(() => {
    if (!user) return;
    const effectiveRole = user.role === "Admin" && viewAsRole ? viewAsRole : user.role;
    if (effectiveRole === "Sales") {
      // Use this user's own name as currentRep (always exact match)
      setCurrentRep(user.full_name as SalesRep);
    } else if (user.role === "Admin" && !viewAsRole) {
      setCurrentRep("All");
    }
  }, [user, viewAsRole, setCurrentRep]);

  const effectiveRole = user ? (user.role === "Admin" && viewAsRole ? viewAsRole : user.role) : null;
  const showFAB = effectiveRole === "Sales";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-40 flex items-center px-3 sm:px-6 gap-3">
            <SidebarTrigger className="shrink-0" />
            <Link to="/" className="flex items-center gap-2 shrink-0 group" aria-label="กลับหน้าหลัก" title="หน้าหลัก">
              <div className="w-8 h-8 shrink-0 overflow-hidden group-hover:scale-105 transition">
                <img src="/logo-icon.svg" alt="Standard Tour" className="w-full h-full object-contain" />
              </div>
              <span className="hidden md:inline font-bold text-sm">Standard Tour CRM</span>
            </Link>
            <GlobalSearch />
            <TeamNotifications />
            <UserMenu />
          </header>
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
        <ChatWidget />
        {showFAB && <AddCustomerFAB />}
      </div>
    </SidebarProvider>
  );
}
