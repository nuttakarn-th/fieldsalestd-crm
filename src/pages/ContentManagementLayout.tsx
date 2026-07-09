/**
 * ContentManagementLayout.tsx
 * Layout wrapper สำหรับ Contents Management
 * มี Sidebar ซ้ายแสดง 4 เครื่องมือ + Header กลับ Hub
 * Mobile: sidebar เป็น drawer สไลด์จากซ้าย
 */
import { useState } from "react";
import { NavLink, Outlet, Navigate, useLocation, Link } from "react-router-dom";
import {
  CalendarRange, Plane, BookOpen, TrendingUp, Layers,
  ChevronLeft, LayoutGrid, Menu, X,
} from "lucide-react";
import { useCurrentUser } from "@/store/authStore";
import { NavActions } from "@/components/NavActions";

const NAV_ITEMS = [
  {
    title: "Content Calendar",
    desc:  "วางแผนโพสต์รายเดือน",
    icon:  CalendarRange,
    to:    "/marketing-contents/calendar",
    gradient: "from-violet-500 to-indigo-600",
  },
  {
    title: "Tour → Content Link",
    desc:  "ไอเดีย Content จาก Tour",
    icon:  Plane,
    to:    "/marketing-contents/tour-link",
    gradient: "from-sky-500 to-blue-600",
  },
  {
    title: "Asset Library",
    desc:  "Caption & Hashtag Template",
    icon:  BookOpen,
    to:    "/marketing-contents/assets",
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    title: "Post Performance",
    desc:  "Reach / Engagement / Lead",
    icon:  TrendingUp,
    to:    "/marketing-contents/performance",
    gradient: "from-rose-500 to-pink-600",
  },
  {
    title: "Photo Frame Studio",
    desc:  "ใส่กรอบรูป Template → Download",
    icon:  Layers,
    to:    "/marketing-contents/photo-frame",
    gradient: "from-amber-500 to-orange-600",
  },
];

export default function ContentManagementLayout() {
  const user = useCurrentUser();
  const location = useLocation();
  const [showSidebar, setShowSidebar] = useState(false);

  if (!user) return <Navigate to="/login" replace />;

  if (location.pathname === "/marketing-contents" || location.pathname === "/marketing-contents/") {
    return <Navigate to="/marketing-contents/calendar" replace />;
  }

  const activeItem = NAV_ITEMS.find(n => location.pathname.startsWith(n.to));

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* ── Top bar ── */}
      <header className="h-14 border-b bg-card/80 backdrop-blur-xl flex items-center px-4 gap-2 shrink-0 sticky top-0 z-40 shadow-soft">

        {/* Logo — link to Hub (always visible, ทั้ง mobile และ desktop) */}
        <Link to="/" className="flex items-center gap-2 group shrink-0" title="กลับหน้าหลัก">
          <div className="w-8 h-8 rounded-full overflow-hidden group-hover:scale-105 transition shrink-0">
            <img src="/logo-icon.png" alt="Standard Tour" className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = "/logo-icon.svg"; }} />
          </div>
        </Link>

        {/* Breadcrumb — desktop only */}
        <Link to="/" className="hidden md:flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0">
          <ChevronLeft className="w-3.5 h-3.5" /> Hub
        </Link>
        <span className="hidden md:inline text-muted-foreground/40 text-xs">/</span>

        {/* Title */}
        <div className="flex items-center gap-2 min-w-0 flex-1 md:flex-none">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shrink-0">
            <LayoutGrid className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="min-w-0">
            <span className="font-semibold text-sm block truncate leading-tight">Contents</span>
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
        {/* hideChat: ไม่ให้ chat popup ลอยทับ layout ที่มี sub-page */}
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
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                <LayoutGrid className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-semibold text-sm">Contents Management</span>
            </div>
            <button
              onClick={() => setShowSidebar(false)}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 space-y-1">
            {/* ── กลับ Marketing Hub ── */}
            <Link
              to="/app/marketing-hub"
              onClick={() => setShowSidebar(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
            >
              <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
              กลับ Marketing Hub
            </Link>
            <div className="h-px bg-border my-1" />

            {NAV_ITEMS.map((item) => (
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
