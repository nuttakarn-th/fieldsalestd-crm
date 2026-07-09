/**
 * MarketingLayout.tsx — Dedicated sidebar layout for Marketing role
 * Route: /marketing (standalone, independent from AppLayout)
 */
import { Outlet, NavLink } from "react-router-dom";
import {
  Home, BarChart3, Megaphone, LayoutGrid, Users, PackageSearch,
  TrendingUp, Target, Users2, UserCircle, Star, GitBranch,
} from "lucide-react";
import { useCurrentUser } from "@/store/authStore";
import { TeamNotifications } from "@/components/TeamNotifications";

// ── Navigation config ────────────────────────────────────────────────────────

interface NavItem { label: string; icon: typeof Home; to: string; end?: boolean }

const NAV_MAIN: NavItem[] = [
  { label: "Home",              icon: Home,          to: "/marketing",                    end: true },
  { label: "Dashboard",         icon: BarChart3,     to: "/marketing-dashboard"                     },
  { label: "Campaigns",         icon: Megaphone,     to: "/app/campaigns"                           },
  { label: "Content",           icon: LayoutGrid,    to: "/marketing-contents/calendar"             },
  { label: "Leads & Customers", icon: Users,         to: "/app/customers"                           },
  { label: "Service & Stock",   icon: PackageSearch, to: "/app/all-service"                         },
  { label: "Reports",           icon: BarChart3,     to: "/app/marketing-report"                    },
];

const NAV_SHORTCUTS: NavItem[] = [
  { label: "Audience Builder",  icon: Target,       to: "/audience-builder/line-export" },
  { label: "Marketing Leads",   icon: Users2,       to: "/app/marketing-leads"          },
  { label: "Stock Analytics",   icon: TrendingUp,   to: "/app/stock-analytics"          },
  { label: "My Tasks",          icon: UserCircle,   to: "/profile"                       },
];

// ── NavLink helper ───────────────────────────────────────────────────────────
function SideNavItem({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
        }`
      }
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="truncate">{item.label}</span>
    </NavLink>
  );
}

// ── Main layout ──────────────────────────────────────────────────────────────
export default function MarketingLayout() {
  const user = useCurrentUser();

  return (
    <div className="min-h-screen flex bg-background">

      {/* ── Sidebar ── */}
      <aside className="w-56 shrink-0 flex flex-col bg-card border-r border-border">

        {/* Brand */}
        <div className="px-4 pt-4 pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
              <span className="text-white font-black text-[11px] tracking-tight">ST</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold leading-none truncate">Standard Tour Hub</p>
              <span className="inline-flex mt-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400">
                Marketing
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {NAV_MAIN.map((item) => (
            <SideNavItem key={item.to} item={item} />
          ))}

          <div className="pt-4 pb-1.5 px-3">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">
              Shortcuts
            </p>
          </div>

          {NAV_SHORTCUTS.map((item) => (
            <SideNavItem key={item.to} item={item} />
          ))}
        </nav>

        {/* Upgrade to Pro */}
        <div className="p-3">
          <div className="rounded-xl bg-gradient-to-br from-amber-500/10 to-yellow-400/5 border border-amber-400/20 p-3 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-500" />
              <p className="text-xs font-bold text-amber-600 dark:text-amber-400">Upgrade to Pro</p>
            </div>
            <p className="text-[10px] text-muted-foreground leading-snug">
              ปลดล็อคทุกฟีเจอร์พิเศษ
            </p>
            <button className="w-full py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-400 text-white text-[11px] font-bold hover:opacity-90 transition-opacity">
              Upgrade Now
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <header className="h-14 border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-40 flex items-center justify-end px-5 gap-2">
          <TeamNotifications />
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user?.full_name ?? ""}
              className="w-8 h-8 rounded-full object-cover border-2 border-purple-500/30 cursor-pointer hover:scale-105 transition-transform"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold cursor-pointer hover:scale-105 transition-transform select-none">
              {user?.full_name?.[0]?.toUpperCase() ?? "M"}
            </div>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
