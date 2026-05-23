/**
 * ContentManagementLayout.tsx
 * Layout wrapper สำหรับ Contents Management
 * มี Sidebar ซ้ายแสดง 4 เครื่องมือ + Header กลับ Hub
 */
import { NavLink, Outlet, Navigate, useLocation, Link } from "react-router-dom";
import { CalendarRange, Plane, BookOpen, TrendingUp, Layers, ChevronLeft, LayoutGrid } from "lucide-react";
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
  if (!user) return <Navigate to="/login" replace />;

  const location = useLocation();
  // ถ้าอยู่ที่ root /marketing-contents → redirect ไป calendar
  if (location.pathname === "/marketing-contents" || location.pathname === "/marketing-contents/") {
    return <Navigate to="/marketing-contents/calendar" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* ── Top bar ── */}
      <header className="h-14 border-b bg-card/80 backdrop-blur-xl flex items-center px-4 gap-3 shrink-0 sticky top-0 z-40 shadow-soft">
        {/* Logo + back */}
        <Link to="/" className="flex items-center gap-2 group shrink-0" title="กลับหน้าหลัก">
          <div className="w-8 h-8 rounded-full overflow-hidden group-hover:scale-105 transition shrink-0">
            <img src="/logo-icon.png" alt="Standard Tour" className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = "/logo-icon.svg"; }} />
          </div>
        </Link>
        {/* Breadcrumb */}
        <Link to="/" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0">
          <ChevronLeft className="w-3.5 h-3.5" /> Hub
        </Link>
        <span className="text-muted-foreground/40 text-xs">/</span>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shrink-0">
            <LayoutGrid className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold text-sm truncate">Contents Management</span>
        </div>
        <div className="flex-1" />
        <NavActions />
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ── */}
        <aside className="w-56 shrink-0 border-r bg-card overflow-y-auto">
          <div className="p-3 space-y-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                      isActive
                        ? `bg-gradient-to-br ${item.gradient} shadow-sm`
                        : "bg-muted group-hover:bg-muted/80"
                    }`}>
                      <item.icon className={`w-4 h-4 ${isActive ? "text-white" : "text-muted-foreground"}`} />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold leading-tight ${isActive ? "text-primary" : ""}`}>
                        {item.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground leading-tight truncate">{item.desc}</p>
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
