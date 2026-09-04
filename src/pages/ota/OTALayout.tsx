/**
 * OTALayout.tsx — Dedicated sidebar layout for OTA Module
 * Route: /ota/*
 * Access: OTA role + Marketing + Marketing Manager + Admin
 */
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  ClipboardList, BarChart3, CalendarDays, Package, Settings2, ChevronLeft, ChevronRight, LogOut,
} from "lucide-react";
import { useCurrentUser } from "@/store/authStore";
import { UserMenu } from "@/components/UserMenu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface NavItem { label: string; icon: typeof ClipboardList; to: string; end?: boolean }

const NAV_ITEMS: NavItem[] = [
  { label: "Order Entry", icon: ClipboardList, to: "/ota/order-entry" },
  { label: "Dashboard",   icon: BarChart3,     to: "/ota/dashboard"   },
  { label: "Calendar",    icon: CalendarDays,  to: "/ota/calendar"    },
  { label: "Packages",    icon: Package,       to: "/ota/packages"    },
  { label: "Platforms",   icon: Settings2,     to: "/ota/platforms"   },
];

export default function OTALayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const [collapsed, setCollapsed] = useState(false);

  // ── Role guard ────────────────────────────────────────────────────────────
  const allowed = ["OTA", "Marketing", "Marketing Manager", "Admin"];
  if (currentUser && !allowed.includes(currentUser.role)) {
    navigate("/app", { replace: true });
    return null;
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      <aside
        className={cn(
          "relative flex flex-col bg-[#1e1b4b] text-white transition-all duration-300 shrink-0",
          collapsed ? "w-16" : "w-56"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-4 border-b border-white/10">
          <div className="w-8 h-8 bg-purple-400 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0">
            OTA
          </div>
          {!collapsed && (
            <div className="leading-tight min-w-0">
              <div className="font-bold text-sm truncate">Standard Tour</div>
              <div className="text-xs text-purple-300 truncate">OTA Module</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1 px-2">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname.startsWith(item.to);
            const Icon = item.icon;
            const btn = (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-purple-500 text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
            return collapsed ? (
              <Tooltip key={item.to}>
                <TooltipTrigger asChild>{btn}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            ) : btn;
          })}
        </nav>

        {/* User + back */}
        <div className="border-t border-white/10 px-2 py-3 space-y-1">
          {!collapsed && (
            <div className="px-3 py-1">
              <UserMenu />
            </div>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to="/app"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/60 hover:bg-white/10 hover:text-white transition-colors"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                {!collapsed && <span>Back to CRM</span>}
              </Link>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">Back to CRM</TooltipContent>}
          </Tooltip>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="absolute -right-3 top-20 w-6 h-6 bg-purple-600 hover:bg-purple-500 rounded-full flex items-center justify-center shadow z-10 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-3 h-3 text-white" />
          ) : (
            <ChevronLeft className="w-3 h-3 text-white" />
          )}
        </button>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
