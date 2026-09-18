/**
 * OTALayout.tsx — Dedicated sidebar layout for OTA Module
 * Route: /ota/*
 * Access: OTA role + Marketing + Marketing Manager + Admin
 *
 * Mobile Navigation (Option A):
 *   Primary tab bar  : Order · Dashboard · Vehicles · P&L + "⋯ เพิ่มเติม"
 *   Secondary overlay: Calendar · Packages · Platforms · Content Calendar
 *   Desktop sidebar  : ไม่เปลี่ยน — แสดงทุก item เหมือนเดิม
 */
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  ClipboardList, BarChart3, CalendarDays, Package, Settings2,
  ChevronLeft, ChevronRight, LogOut, Bus, TrendingUp, MoreHorizontal, X,
  LayoutGrid, Home,
} from "lucide-react";
import { useCurrentUser, useAuth } from "@/store/authStore";
import { useOTAStore } from "@/store/otaStore";
import { UserMenu } from "@/components/UserMenu";
import { OTANotificationBell } from "@/components/OTANotificationBell";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface NavItem { label: string; mobileLabel?: string; icon: typeof ClipboardList; to: string }

/** รายการหลักใน Desktop sidebar */
const NAV_ITEMS: NavItem[] = [
  { label: "Order Entry", mobileLabel: "Order", icon: ClipboardList, to: "/ota/order-entry" },
  { label: "Dashboard",   mobileLabel: "Dash",  icon: BarChart3,     to: "/ota/dashboard"   },
  { label: "Calendar",                          icon: CalendarDays,  to: "/ota/calendar"    },
  { label: "Vehicles",                          icon: Bus,           to: "/ota/vehicles"    },
  { label: "P&L",                               icon: TrendingUp,    to: "/ota/pnl"         },
  { label: "Packages",                          icon: Package,       to: "/ota/packages"    },
  { label: "Platforms",                         icon: Settings2,     to: "/ota/platforms"   },
];

/** รายการเสริม — แสดงด้านล่าง sidebar คั่นด้วย divider */
const EXTRA_NAV_ITEMS: NavItem[] = [
  { label: "Content Calendar", mobileLabel: "Content", icon: LayoutGrid, to: "/ota/content-calendar" },
];

/** 4 รายการหลัก — แสดงใน Mobile Tab bar เสมอ */
const PRIMARY_NAV: NavItem[] = [
  { label: "Order Entry", mobileLabel: "Order",   icon: ClipboardList, to: "/ota/order-entry" },
  { label: "Dashboard",   mobileLabel: "Dash",    icon: BarChart3,     to: "/ota/dashboard"   },
  { label: "Vehicles",                            icon: Bus,           to: "/ota/vehicles"    },
  { label: "P&L",                                 icon: TrendingUp,    to: "/ota/pnl"         },
];

/** รายการรอง — แสดงใน "More" overlay บน Mobile */
const SECONDARY_NAV: NavItem[] = [
  { label: "Calendar",         mobileLabel: "Calendar", icon: CalendarDays, to: "/ota/calendar"         },
  { label: "Packages",                                  icon: Package,      to: "/ota/packages"         },
  { label: "Platforms",                                 icon: Settings2,    to: "/ota/platforms"        },
  { label: "Content Calendar", mobileLabel: "Content",  icon: LayoutGrid,   to: "/ota/content-calendar" },
];

export default function OTALayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const logout = useAuth((s) => s.logout);
  const setHighlightedOrderId = useOTAStore((s) => s.setHighlightedOrderId);
  const [collapsed, setCollapsed]   = useState(false);
  const [moreOpen,  setMoreOpen]    = useState(false);

  // ── Role guard ────────────────────────────────────────────────────────────
  const allowed = ["OTA", "Marketing", "Marketing Manager", "Admin"];
  if (currentUser && !allowed.includes(currentUser.role)) {
    navigate("/app", { replace: true });
    return null;
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* ── Sidebar (desktop only) ───────────────────────────────────────────── */}
      <aside
        className={cn(
          "relative flex-col bg-[#1e1b4b] text-white transition-all duration-300 shrink-0",
          "hidden md:flex",          // ซ่อนบนมือถือ
          collapsed ? "w-16" : "w-56"
        )}
      >
        {/* Logo + Bell */}
        <div className="flex items-center gap-2 px-4 py-4 border-b border-white/10">
          <div className="w-8 h-8 bg-purple-400 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0">
            OTA
          </div>
          {!collapsed && (
            <div className="leading-tight min-w-0 flex-1">
              <div className="font-bold text-sm truncate">Standard Tour</div>
              <div className="text-xs text-purple-300 truncate">OTA Module</div>
            </div>
          )}
          {/* Notification Bell — icon only, top-right of header */}
          <OTANotificationBell
            iconOnly
            onOrderClick={(id) => {
              setHighlightedOrderId(id);
              navigate("/ota/order-entry");
            }}
          />
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

        {/* Extra nav items (Content Calendar etc.) — คั่นด้วย divider */}
        <div className="border-t border-white/10 px-2 pt-2 pb-1 space-y-1">
          {EXTRA_NAV_ITEMS.map((item) => {
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
        </div>

        {/* User + back */}
        <div className="border-t border-white/10 px-2 py-3 space-y-1">
          {/* กลับ Home — แสดงเฉพาะ Role ที่ไม่ใช่ OTA */}
          {currentUser?.role !== "OTA" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => navigate("/marketing")}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <Home className="w-4 h-4 shrink-0" />
                  {!collapsed && <span>กลับ Home</span>}
                </button>
              </TooltipTrigger>
              {collapsed && <TooltipContent side="right">กลับ Home</TooltipContent>}
            </Tooltip>
          )}

          <div className="px-3 py-1">
            <UserMenu showName={!collapsed} />
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => logout()}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/60 hover:bg-white/10 hover:text-white transition-colors"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                {!collapsed && <span>Logout</span>}
              </button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">Logout</TooltipContent>}
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
      <main className="flex-1 overflow-auto pb-16 md:pb-0">
        <Outlet />
      </main>

      {/* ── Mobile Bottom Navigation (Option A) ────────────────────────────── */}
      {/* Desktop sidebar ซ่อน Mobile nav → md:hidden แน่นอน */}

      {/* More overlay — แสดงด้านบน Tab bar */}
      {moreOpen && (
        <>
          {/* backdrop */}
          <div
            className="fixed inset-0 z-40 md:hidden"
            onClick={() => setMoreOpen(false)}
          />
          {/* grid panel */}
          <div className="fixed bottom-[57px] left-0 right-0 z-50 md:hidden bg-[#1e1b4b] border-t border-white/10 px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-white/50 font-medium">เพิ่มเติม</span>
              <button onClick={() => setMoreOpen(false)} className="text-white/50 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {SECONDARY_NAV.map((item) => {
                const active = location.pathname.startsWith(item.to);
                const Icon   = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl text-[11px] font-medium transition-colors",
                      active
                        ? "bg-purple-500/30 text-purple-300"
                        : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-center leading-tight">{item.mobileLabel ?? item.label}</span>
                  </Link>
                );
              })}
              {/* กลับ Home — เฉพาะ non-OTA roles */}
              {currentUser?.role !== "OTA" && (
                <button
                  onClick={() => { setMoreOpen(false); navigate("/marketing"); }}
                  className="flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl text-[11px] font-medium bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <Home className="w-6 h-6" />
                  <span className="text-center leading-tight">Home</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Primary tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#1e1b4b] border-t border-white/10 flex safe-area-inset-bottom">
        {PRIMARY_NAV.map((item) => {
          const active = location.pathname.startsWith(item.to);
          const Icon   = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMoreOpen(false)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors",
                active ? "text-purple-300" : "text-white/50 hover:text-white"
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.mobileLabel ?? item.label}</span>
            </Link>
          );
        })}

        {/* More button */}
        <button
          onClick={() => setMoreOpen(v => !v)}
          className={cn(
            "flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors",
            moreOpen ? "text-purple-300" : "text-white/50 hover:text-white"
          )}
        >
          {moreOpen
            ? <X className="w-5 h-5" />
            : <MoreHorizontal className="w-5 h-5" />
          }
          <span>เพิ่มเติม</span>
        </button>
      </nav>
    </div>
  );
}
