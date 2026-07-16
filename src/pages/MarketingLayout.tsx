/**
 * MarketingLayout.tsx — Dedicated sidebar layout for Marketing role
 * Route: /marketing/* (standalone, independent from AppLayout)
 */
import { Outlet, Link, useLocation } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import { useMemo } from "react";
import {
  Home, BarChart3, Megaphone, LayoutGrid, Users, PackageSearch,
  TrendingUp, Target, Users2, CheckSquare, Images, BookOpen, UserPlus,
} from "lucide-react";
import { useCurrentUser } from "@/store/authStore";
import { useCRM } from "@/store/crmStore";
import { useChatRead } from "@/store/chatReadStore";
import { UserMenu } from "@/components/UserMenu";
import { GlobalSearch } from "@/components/GlobalSearch";
import { ChatWidget, useChatUI } from "@/components/ChatWidget";
import { StandyWidget, StandyBtn } from "@/components/StandyWidget";
import { NewProgramNotification } from "@/components/NewProgramNotification";
import { AtRiskNotification } from "@/components/AtRiskNotification";
import { ActivityFeed } from "@/components/ActivityFeed";

// ── Navigation config ────────────────────────────────────────────────────────

interface NavItem { label: string; icon: typeof Home; to: string; end?: boolean }
interface NavSection { category: string; items: NavItem[] }

const NAV_SECTIONS: NavSection[] = [
  {
    category: "OVERVIEW",
    items: [
      { label: "Home",              icon: Home,          to: "/marketing",              end: true },
      { label: "Dashboard",         icon: BarChart3,     to: "/marketing-dashboard"               },
    ],
  },
  {
    category: "CAMPAIGNS",
    items: [
      { label: "Campaigns",         icon: Megaphone,     to: "/marketing/campaigns"               },
      { label: "Content",           icon: LayoutGrid,    to: "/marketing-contents/calendar"       },
      { label: "Gallery",           icon: Images,        to: "/gallery"                           },
    ],
  },
  {
    category: "OUTBOUND LEADS",
    items: [
      { label: "OB Leads",          icon: Users2,        to: "/marketing/ob-leads"                },
    ],
  },
  {
    category: "SALES LEADS",
    items: [
      { label: "Sales Leads",       icon: Users,         to: "/marketing/sales-leads"             },
      { label: "ลูกค้าทั้งหมด",      icon: UserPlus,      to: "/marketing/customers"               },
      { label: "Marketing Leads",   icon: Target,        to: "/marketing/marketing-leads"         },
    ],
  },
  {
    category: "STOCK & TOOLS",
    items: [
      { label: "Service & Stock",   icon: PackageSearch, to: "/marketing/all-service"             },
      { label: "Stock Analytics",   icon: TrendingUp,    to: "/marketing/stock-analytics"         },
      { label: "Reports",           icon: BarChart3,     to: "/marketing/marketing-report"        },
      { label: "Audience Builder",  icon: Target,        to: "/audience-builder/line-export"      },
      { label: "My Tasks",          icon: CheckSquare,   to: "/marketing/tasks"                   },
      { label: "Tour Presentation", icon: BookOpen,      to: "/tour-presentation"                 },
    ],
  },
];

// ── Nav item — uses Link + manual active check to support ?dept= query params ─
function SideNavItem({ item }: { item: NavItem }) {
  const Icon = item.icon;
  const location = useLocation();

  const isActive = useMemo(() => {
    try {
      const toUrl  = new URL(item.to, "http://x");
      if (toUrl.pathname !== location.pathname) return false;
      // If link has query params, they must match exactly
      const toDept  = new URLSearchParams(toUrl.search).get("dept");
      const curDept = new URLSearchParams(location.search).get("dept");
      return toDept === curDept; // both null → match; or same value
    } catch {
      return location.pathname === item.to;
    }
  }, [item.to, location.pathname, location.search]);

  return (
    <Link
      to={item.to}
      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        isActive
          ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
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
          {NAV_SECTIONS.map((section) => (
            <div key={section.category}>
              {/* Section header */}
              <div className="pt-3 pb-1 px-3">
                <p className={`text-[9px] font-bold uppercase tracking-widest ${
                  section.category === "OUTBOUND LEADS"
                    ? "text-purple-500/70"
                    : section.category === "SALES LEADS"
                    ? "text-blue-500/70"
                    : "text-muted-foreground/50"
                }`}>
                  {section.category}
                </p>
              </div>
              {section.items.map((item) => <SideNavItem key={item.to} item={item} />)}

              {/* Notification badges หลัง CAMPAIGNS section */}
              {section.category === "CAMPAIGNS" && (
                <div className="px-1 space-y-0.5 pt-0.5">
                  <NewProgramNotification collapsed={false} />
                  <AtRiskNotification collapsed={false} />
                </div>
              )}
            </div>
          ))}
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
            <StandyBtn />
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
      {/* AI Standy chatbot */}
      <StandyWidget />
    </div>
  );
}
