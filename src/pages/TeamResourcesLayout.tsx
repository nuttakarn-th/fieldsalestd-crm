/**
 * TeamResourcesLayout.tsx
 * Layout wrapper สำหรับ Team Resources — เอกสารอ้างอิงภายในทีม Marketing
 * Sidebar แสดง Workflow, SOP และอื่นๆ ที่จะมาเพิ่มในอนาคต
 * Mobile: sidebar เป็น drawer สไลด์จากซ้าย
 */
import { useState } from "react";
import { NavLink, Outlet, Navigate, useLocation, Link } from "react-router-dom";
import { ChevronLeft, GitBranch, BookOpen, Users2, Users, Menu, X } from "lucide-react";
import { useCurrentUser } from "@/store/authStore";
import { NavActions } from "@/components/NavActions";

export const TEAM_RESOURCES_NAV = [
  {
    title: "Marketing Workflow",
    desc:  "ขั้นตอนและ Workflow การทำงานของทีม",
    icon:  GitBranch,
    to:    "/team-resources/workflow",
    gradient: "from-violet-500 to-purple-600",
  },
  {
    title: "Org Chart",
    desc:  "โครงสร้างและสายการรายงานของทีม",
    icon:  Users2,
    to:    "/team-resources/org-chart",
    gradient: "from-blue-500 to-indigo-600",
  },
  {
    title: "Team Members",
    desc:  "สมาชิกและบทบาทหน้าที่ของทีม",
    icon:  Users,
    to:    "/team-resources/team",
    gradient: "from-teal-500 to-emerald-600",
  },
  // Future: SOP, Brand Guidelines, Training Docs, etc.
];

export default function TeamResourcesLayout() {
  const user     = useCurrentUser();
  const location = useLocation();
  const [showSidebar, setShowSidebar] = useState(false);

  if (!user) return <Navigate to="/login" replace />;

  if (location.pathname === "/team-resources" || location.pathname === "/team-resources/") {
    return <Navigate to="/team-resources/workflow" replace />;
  }

  const activeItem = TEAM_RESOURCES_NAV.find((n) => location.pathname.startsWith(n.to));

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* ── Top bar ── */}
      <header className="h-14 border-b bg-card/80 backdrop-blur-xl flex items-center px-4 gap-2 shrink-0 sticky top-0 z-40 shadow-soft">

        {/* Logo — always visible */}
        <Link to="/" className="flex items-center gap-2 group shrink-0" title="กลับหน้าหลัก">
          <div className="w-8 h-8 rounded-full overflow-hidden group-hover:scale-105 transition shrink-0">
            <img src="/logo-icon.png" alt="Standard Tour" className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = "/logo-icon.svg"; }} />
          </div>
        </Link>

        {/* Breadcrumb — desktop only */}
        <Link to="/" className="hidden md:flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0">
          <ChevronLeft className="w-3.5 h-3.5" /> Home
        </Link>
        <span className="hidden md:inline text-muted-foreground/40 text-xs">/</span>

        {/* Title */}
        <div className="flex items-center gap-2 min-w-0 flex-1 md:flex-none">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
            <BookOpen className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="min-w-0">
            <span className="font-semibold text-sm block truncate leading-tight">Team Resources</span>
            {/* Active sub-page name on mobile */}
            {activeItem && (
              <span className="text-[10px] text-muted-foreground leading-none truncate block md:hidden">
                {activeItem.title}
              </span>
            )}
          </div>
        </div>

        {/* Mobile hamburger — opens sidebar */}
        <button
          onClick={() => setShowSidebar(true)}
          className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted transition-colors shrink-0"
          title="เมนูเครื่องมือ"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex-1 hidden md:block" />
        {/* hideChat: ไม่ให้ chat popup ลอยทับ layout */}
        <NavActions hideChat />
      </header>

      {/* Mobile backdrop */}
      {showSidebar && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}

      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar — drawer on mobile, fixed on desktop ── */}
        <aside className={`
          fixed md:relative top-0 md:top-auto inset-y-0 left-0
          z-50 md:z-auto
          w-72 md:w-56 shrink-0
          border-r bg-card
          overflow-y-auto
          transition-transform duration-300
          ${showSidebar ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}>
          {/* Mobile sidebar header */}
          <div className="md:hidden flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <BookOpen className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-semibold text-sm">Team Resources</span>
            </div>
            <button
              onClick={() => setShowSidebar(false)}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 space-y-1">
            {TEAM_RESOURCES_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setShowSidebar(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-3 md:py-2.5 rounded-xl transition-all group ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className={`w-9 h-9 md:w-8 md:h-8 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                      isActive
                        ? `bg-gradient-to-br ${item.gradient} shadow-sm`
                        : "bg-muted group-hover:bg-muted/80"
                    }`}>
                      <item.icon className={`w-4 h-4 ${isActive ? "text-white" : "text-muted-foreground"}`} />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm md:text-xs font-semibold leading-tight ${isActive ? "text-primary" : ""}`}>
                        {item.title}
                      </p>
                      <p className="text-xs md:text-[10px] text-muted-foreground leading-tight">{item.desc}</p>
                    </div>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>

      </div>
    </div>
  );
}
