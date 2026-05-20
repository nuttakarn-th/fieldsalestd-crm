/**
 * AudienceBuilderLayout.tsx
 * Layout wrapper สำหรับ Audience Builder & Segmentation
 * Sidebar แสดง 6 เครื่องมือ — เข้าถึงได้จาก Marketing + Admin
 */
import { NavLink, Outlet, Navigate, useLocation } from "react-router-dom";
import { ChevronLeft, Target, MessageCircle, Facebook, Cake, RefreshCcw, Diamond, Globe } from "lucide-react";
import { useCurrentUser } from "@/store/authStore";

export const AUDIENCE_NAV = [
  {
    title: "LINE Export",
    desc:  "Export Phone + Name + Interest สำหรับ LINE OA",
    icon:  MessageCircle,
    to:    "/audience-builder/line-export",
    gradient: "from-green-500 to-emerald-600",
    roles: ["Admin", "Marketing"],
  },
  {
    title: "Facebook Audience",
    desc:  "Export Phone/Email สำหรับ FB Custom Audience",
    icon:  Facebook,
    to:    "/audience-builder/facebook",
    gradient: "from-blue-500 to-indigo-600",
    roles: ["Admin", "Marketing"],
  },
  {
    title: "Birthday Campaign",
    desc:  "ลูกค้าวันเกิดเดือนนี้/เดือนหน้า",
    icon:  Cake,
    to:    "/audience-builder/birthday",
    gradient: "from-pink-500 to-rose-600",
    roles: ["Admin", "Marketing"],
  },
  {
    title: "Cold Lead Re-engage",
    desc:  "Lead ไม่มีการเคลื่อนไหว 60-90 วัน",
    icon:  RefreshCcw,
    to:    "/audience-builder/cold-lead",
    gradient: "from-amber-500 to-orange-600",
    roles: ["Admin", "Marketing", "Sales Manager", "Sales"],
  },
  {
    title: "VIP Loyalty List",
    desc:  "ลูกค้า Tier VIP + Regular",
    icon:  Diamond,
    to:    "/audience-builder/vip",
    gradient: "from-violet-500 to-purple-600",
    roles: ["Admin", "Marketing", "Sales Manager"],
  },
  {
    title: "Interest Segment",
    desc:  "กรองด้วย Interest Tag",
    icon:  Globe,
    to:    "/audience-builder/interest",
    gradient: "from-teal-500 to-cyan-600",
    roles: ["Admin", "Marketing", "Sales Manager"],
  },
];

export default function AudienceBuilderLayout() {
  const user     = useCurrentUser();
  const location = useLocation();

  if (!user) return <Navigate to="/login" replace />;

  if (location.pathname === "/audience-builder" || location.pathname === "/audience-builder/") {
    return <Navigate to="/audience-builder/line-export" replace />;
  }

  const visibleNav = AUDIENCE_NAV.filter((n) => n.roles.includes(user.role));

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
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
            <Target className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold text-sm">Audience Builder</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ── */}
        <aside className="w-56 shrink-0 border-r bg-card overflow-y-auto">
          <div className="p-3 space-y-1">
            {visibleNav.map((item) => (
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
                      <p className="text-[10px] text-muted-foreground leading-tight">{item.desc}</p>
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
