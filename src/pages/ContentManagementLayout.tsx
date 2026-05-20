/**
 * ContentManagementLayout.tsx
 * Layout wrapper สำหรับ Contents Management
 * มี Sidebar ซ้ายแสดง 4 เครื่องมือ + Header กลับ Hub
 */
import { NavLink, Outlet, Navigate, useLocation } from "react-router-dom";
import { CalendarRange, Plane, BookOpen, TrendingUp, Layers, ChevronLeft, LayoutGrid } from "lucide-react";
import { useCurrentUser } from "@/store/authStore";

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
      <header className="h-14 border-b bg-card flex items-center px-4 gap-3 shrink-0 shadow-soft">
        <a href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-4 h-4" />
          Hub
        </a>
        <span className="text-muted-foreground/40">/</span>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
            <LayoutGrid className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold text-sm">Contents Management</span>
        </div>
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
