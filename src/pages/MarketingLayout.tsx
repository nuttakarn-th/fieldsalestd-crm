/**
 * MarketingLayout.tsx — Dedicated sidebar layout for Marketing role
 * Route: /marketing/* (standalone, independent from AppLayout)
 */
import { Outlet, NavLink } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import {
  Home, BarChart3, Megaphone, LayoutGrid, Users, PackageSearch,
  TrendingUp, Target, Users2, CheckSquare, Images, BookOpen,
} from "lucide-react";
import { useCurrentUser } from "@/store/authStore";
import { useCRM } from "@/store/crmStore";
import { useChatRead } from "@/store/chatReadStore";
import { TeamNotifications } from "@/components/TeamNotifications";
import { UserMenu } from "@/components/UserMenu";
import { GlobalSearch } from "@/components/GlobalSearch";
import { ChatWidget, useChatUI } from "@/components/ChatWidget";
import { NewProgramNotification } from "@/components/NewProgramNotification";
import { AtRiskNotification } from "@/components/AtRiskNotification";
import { ActivityFeed } from "@/components/ActivityFeed";

// ── Navigation config ────────────────────────────────────────────────────────

interface NavItem { label: string; icon: typeof Home; to: string; end?: boolean }

const NAV_MAIN: NavItem[] = [
  { label: "Home",              icon: Home,          to: "/marketing",                    end: true },
  { label: "Dashboard",         icon: BarChart3,     to: "/marketing-dashboard"                     },
  { label: "Campaigns",         icon: Megaphone,     to: "/app/campaigns"                           },
  { label: "Content",           icon: LayoutGrid,    to: "/marketing-contents/calendar"             },
  { label: "Gallery",           icon: Images,        to: "/gallery"                                 },
  { label: "Leads & Customers", icon: Users,         to: "/app/customers"                           },
  { label: "Service & Stock",   icon: PackageSearch, to: "/app/all-service"                         },
  { label: "Reports",           icon: BarChart3,     to: "/app/marketing-report"                    },
];

const NAV_SHORTCUTS: NavItem[] = [
  { label: "Audience Builder",  icon: Target,       to: "/audience-builder/line-export" },
  { label: "Marketing Leads",   icon: Users2,       to: "/app/marketing-leads"          },
  { label: "Stock Analytics",   icon: TrendingUp,   to: "/app/stock-analytics"          },
  { label: "My Tasks",          icon: CheckSquare,  to: "/marketing/tasks"               },
  { label: "Tour Presentation", icon: BookOpen,     to: "/tour-presentation"             },
];

// ── NavLink item ─────────────────────────────────────────────────────────────
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

// ── Chat header button (unread badge) ────────────────────────────────────────
function ChatBtn() {
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
      className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted/50 transition-colors"
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

// ── Main layout ──────────────────────────────────────────────────────────────
export default function MarketingLayout() {
  const user = useCurrentUser();

  return (
    <div className="min-h-screen flex bg-background">

      {/* ── Sidebar ── */}
      <aside className="w-56 shrink-0 flex flex-col bg-card border-r border-border">

        {/* Brand — real logo */}
        <div className="px-4 pt-4 pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 shadow-sm">
              <img
                src="/logo-icon.png"
                alt="Standard Tour"
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = "/logo-icon.svg"; }}
              />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold leading-none truncate">Standard Tour CRM</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-none truncate">Travel Sales Suite</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {NAV_MAIN.map((item) => <SideNavItem key={item.to} item={item} />)}

          {/* ── Report Notifications — แสดงใต้เมนู Reports ── */}
          <div className="px-1 space-y-0.5 pt-0.5">
            <NewProgramNotification collapsed={false} />
            <AtRiskNotification collapsed={false} />
          </div>

          <div className="pt-3 pb-1.5 px-3">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">
              Shortcuts
            </p>
          </div>

          {NAV_SHORTCUTS.map((item) => <SideNavItem key={item.to} item={item} />)}
        </nav>
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar — matches AppLayout style */}
        <header className="h-16 border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-40 flex items-center px-4 gap-3">
          {/* Customer search */}
          <GlobalSearch />

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-1 shrink-0">
            <ChatBtn />
            <ActivityFeed />
            <TeamNotifications />
            <UserMenu />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* Chat panel (same as AppLayout) */}
      <ChatWidget />
    </div>
  );
}
