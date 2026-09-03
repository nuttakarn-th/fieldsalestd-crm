/**
 * MarketingLayout.tsx — Dedicated sidebar layout for Marketing role
 * Route: /marketing/* (standalone, independent from AppLayout)
 *
 * Features:
 *  - Collapsible sidebar (icon-only mode) — toggle via < > button on sidebar edge
 *  - Collapsible section categories — click section header to fold/unfold items
 *  - Tooltip on every icon in collapsed mode
 */
import { Outlet, Link, useLocation } from "react-router-dom";
import { MessageSquare, ChevronDown, ChevronRight, ChevronLeft, ChevronRight as ChevronRightIcon, ChevronUp } from "lucide-react";
import { useMemo, useState, useEffect, useRef } from "react";
import {
  Home, BarChart3, Megaphone, LayoutGrid, Users, PackageSearch,
  TrendingUp, Target, Users2, CheckSquare, Images, BookOpen, UserPlus, Radio,
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
import { WatchlistNotification } from "@/components/WatchlistNotification";
import { PromoReadyNotification } from "@/components/PromoReadyNotification";
import { ReadyToTravelNotification } from "@/components/ReadyToTravelNotification";
import { ActivityFeed } from "@/components/ActivityFeed";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// ── Navigation config ────────────────────────────────────────────────────────

interface NavItem { label: string; icon: typeof Home; to: string; end?: boolean; newTab?: boolean }
interface NavSection { category: string; items: NavItem[]; defaultCollapsed?: boolean }

const NAV_SECTIONS: NavSection[] = [
  {
    category: "OVERVIEW",
    items: [
      { label: "Home",              icon: Home,          to: "/marketing",              end: true },
      { label: "Dashboard",         icon: BarChart3,     to: "/marketing/dashboard"               },
    ],
  },
  {
    category: "LIVE SALES",
    items: [
      { label: "Live Sales Board",  icon: Radio,         to: "/war-room",  newTab: true           },
    ],
  },
  {
    category: "LEADS",
    items: [
      { label: "OB Leads",          icon: Users2,        to: "/marketing/ob-leads"                },
      { label: "Sales Leads",       icon: Users,         to: "/marketing/sales-leads"             },
      { label: "All Leads",         icon: UserPlus,      to: "/marketing/customers"               },
      { label: "Marketing Leads",   icon: Target,        to: "/marketing/marketing-leads"         },
    ],
  },
  {
    category: "CAMPAIGNS",
    items: [
      { label: "Campaigns",         icon: Megaphone,     to: "/marketing/campaigns"               },
      { label: "Audience Builder",  icon: Target,        to: "/audience-builder/line-export"      },
    ],
  },
  {
    category: "CONTENT",
    items: [
      { label: "Content",           icon: LayoutGrid,    to: "/marketing-contents/calendar"       },
      { label: "Gallery",           icon: Images,        to: "/gallery"                           },
    ],
  },
  {
    category: "STOCK",
    items: [
      { label: "Service & Stock",   icon: PackageSearch, to: "/marketing/all-service"             },
      { label: "Stock Analytics",   icon: TrendingUp,    to: "/marketing/stock-analytics"         },
    ],
  },
  {
    category: "REPORTS",
    items: [
      { label: "Revenue Dashboard", icon: TrendingUp,    to: "/marketing/revenue-dashboard"        },
      { label: "OKR Follower",      icon: Target,        to: "/marketing/okr-follower"             },
      { label: "Ads Dashboard",     icon: TrendingUp,    to: "/ads-dashboard"                      },
      { label: "Ads Report",        icon: BarChart3,     to: "/marketing/ads-report"               },
    ],
  },
  {
    category: "WORKSPACE",
    defaultCollapsed: true, // ใช้ไม่บ่อยเท่า section อื่น — พับไว้ก่อน
    items: [
      { label: "My Tasks",          icon: CheckSquare,   to: "/marketing/tasks"                   },
      { label: "Tour Presentation", icon: BookOpen,      to: "/tour-presentation"                 },
    ],
  },
];

// Category label colors
function catColor(category: string) {
  if (category === "OVERVIEW")    return "text-violet-400/80";
  if (category === "LIVE SALES")  return "text-rose-400/90";
  if (category === "LEADS")       return "text-purple-400/80";
  if (category === "CAMPAIGNS") return "text-fuchsia-400/75";
  if (category === "CONTENT")   return "text-violet-400/70";
  if (category === "STOCK")     return "text-purple-400/70";
  if (category === "REPORTS")   return "text-violet-400/85";
  return "text-violet-400/50";
}

// ── useActiveItem: check if current URL matches a nav item ───────────────────
function useIsActive(item: NavItem) {
  const location = useLocation();
  return useMemo(() => {
    try {
      const toUrl  = new URL(item.to, "http://x");
      if (toUrl.pathname !== location.pathname) return false;
      const toDept  = new URLSearchParams(toUrl.search).get("dept");
      const curDept = new URLSearchParams(location.search).get("dept");
      return toDept === curDept;
    } catch {
      return location.pathname === item.to;
    }
  }, [item.to, location.pathname, location.search]);
}

// ── SideNavItem ──────────────────────────────────────────────────────────────
function SideNavItem({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const Icon = item.icon;
  const isActive = useIsActive(item);

  const cls = `relative flex items-center rounded-lg font-medium transition-colors ${
    isActive
      ? "bg-violet-500/10 text-violet-400"
      : "text-muted-foreground hover:text-foreground hover:bg-violet-500/5"
  }`;

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {item.newTab ? (
            <a href={item.to} target="_blank" rel="noopener noreferrer" className={`${cls} w-8 h-8 justify-center mx-auto`}>
              <Icon className="w-4.5 h-4.5 w-[18px] h-[18px] shrink-0" />
            </a>
          ) : (
            <Link to={item.to} className={`${cls} w-8 h-8 justify-center mx-auto`}>
              <Icon className="w-4.5 h-4.5 w-[18px] h-[18px] shrink-0" />
            </Link>
          )}
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs font-medium">
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  if (item.newTab) {
    return (
      <a href={item.to} target="_blank" rel="noopener noreferrer" className={`${cls} gap-2 px-3 py-1.5 text-sm`}>
        <Icon className="w-4 h-4 shrink-0" />
        <span className="truncate">{item.label}</span>
      </a>
    );
  }

  return (
    <Link to={item.to} className={`${cls} gap-2 px-3 py-1.5 text-sm`}>
      {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-violet-400"/>}
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
  // Sidebar collapsed state (พับเหลือแค่ icon)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Section collapsed state — ใช้ Set เก็บ category ที่พับอยู่
  const [closedSections, setClosedSections] = useState<Set<string>>(
    () => new Set(NAV_SECTIONS.filter((s) => s.defaultCollapsed).map((s) => s.category))
  );

  // Custom smooth scroll — ใช้ rAF แทน behavior:"smooth" (Edge มีบั๊ก)
  const smoothScrollTop = (duration = 350) => {
    const main = document.querySelector("main");
    const mainStart = main ? main.scrollTop : 0;
    const winStart = window.scrollY || document.documentElement.scrollTop || 0;
    if (mainStart === 0 && winStart === 0) return;
    const startTime = performance.now();
    const ease = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    const frame = (now: number) => {
      const p = Math.min((now - startTime) / duration, 1);
      const f = 1 - ease(p);
      if (main && mainStart > 0) main.scrollTop = mainStart * f;
      if (winStart > 0) {
        document.documentElement.scrollTop = winStart * f;
        document.body.scrollTop = winStart * f;
      }
      if (p < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };

  // Scroll-to-top FAB
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollElRef = useRef<Element | null>(null);
  useEffect(() => {
    const onElementScroll = (e: Event) => {
      const el = e.target as Element;
      if (el && el !== document.documentElement && el !== document.body) {
        scrollElRef.current = el;
        setShowScrollTop(el.scrollTop > 300);
      }
    };
    const onWindowScroll = () => setShowScrollTop(window.scrollY > 300);
    document.addEventListener("scroll", onElementScroll, { passive: true, capture: true });
    window.addEventListener("scroll", onWindowScroll, { passive: true });
    return () => {
      document.removeEventListener("scroll", onElementScroll, { capture: true });
      window.removeEventListener("scroll", onWindowScroll);
    };
  }, []);

  function toggleSection(category: string) {
    setClosedSections((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  return (
    <div className="min-h-screen flex bg-background">

      {/* ── Sidebar wrapper — relative so floating toggle can escape overflow:hidden ── */}
      <div className="relative shrink-0">

        {/* Floating collapse toggle — always visible at top of sidebar edge */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setSidebarCollapsed((v) => !v)}
              className="absolute right-[-13px] top-[68px] z-50 w-6 h-6 rounded-full bg-card border border-violet-500/30 shadow-md flex items-center justify-center text-muted-foreground hover:text-violet-500 hover:border-violet-400 transition-colors"
              aria-label={sidebarCollapsed ? "ขยาย sidebar" : "พับ sidebar"}
            >
              {sidebarCollapsed
                ? <ChevronRightIcon className="w-3 h-3" />
                : <ChevronLeft className="w-3 h-3" />
              }
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            {sidebarCollapsed ? "ขยาย" : "พับ sidebar"}
          </TooltipContent>
        </Tooltip>

        {/* ── Sidebar ── */}
        <aside
          className={`flex flex-col border-r border-violet-500/15 transition-[width] duration-200 ease-in-out overflow-hidden h-screen sticky top-0 ${
            sidebarCollapsed ? "w-[60px]" : "w-56"
          }`}
          style={{background:"linear-gradient(180deg,rgba(127,119,221,0.10) 0%,rgba(127,119,221,0.04) 35%,var(--card) 65%)"}}
        >
        {/* Top violet accent line */}
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-violet-500 via-purple-400 to-transparent pointer-events-none z-10"/>

        {/* ── Brand ── */}
        <div className={`border-b border-border shrink-0 ${sidebarCollapsed ? "px-0 pt-4 pb-3 flex justify-center" : "px-4 pt-4 pb-3"}`}>
          <div className={`flex items-center ${sidebarCollapsed ? "justify-center" : "gap-2.5"}`}>
            <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 shadow-sm">
              <img
                src="/logo-icon.png"
                alt="Standard Tour"
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = "/logo-icon.svg"; }}
              />
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <p className="text-sm font-bold leading-none truncate">Standard Tour CRM</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-none truncate">Travel Sales Suite</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Global alerts — ไม่ผูกกับ section ไหน (ก่อนหน้านี้เคยแทรกอยู่ใต้ CAMPAIGNS ทำให้ดูเหมือนเป็นส่วนหนึ่งของแคมเปญ) ── */}
        <div className={`shrink-0 border-b border-border ${sidebarCollapsed ? "px-0 py-2 flex flex-col items-center gap-1" : "px-2 py-1.5 space-y-0.5"}`}>
          <NewProgramNotification collapsed={sidebarCollapsed} />
          <AtRiskNotification collapsed={sidebarCollapsed} />
          <WatchlistNotification collapsed={sidebarCollapsed} />
          <PromoReadyNotification collapsed={sidebarCollapsed} campaignUrl="/marketing/campaign-management" />
          <ReadyToTravelNotification collapsed={sidebarCollapsed} stockUrl="/marketing/all-service" />
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {NAV_SECTIONS.map((section) => {
            const isClosed = closedSections.has(section.category);

            if (sidebarCollapsed) {
              // Icon-only mode — แสดงทุก item เป็น icon + tooltip, ไม่มี section header
              return (
                <div key={section.category} className="flex flex-col items-center gap-0.5 py-1">
                  {section.items.map((item) => (
                    <SideNavItem key={item.to} item={item} collapsed={true} />
                  ))}
                  {/* Divider ระหว่าง section */}
                  <div className="w-6 border-t border-border/40 my-1" />
                </div>
              );
            }

            // Expanded mode
            return (
              <div key={section.category}>
                {/* Section header — คลิกพับ/ขยาย */}
                <button
                  onClick={() => toggleSection(section.category)}
                  className="w-full flex items-center justify-between pt-2 pb-0.5 px-3 group"
                >
                  <p className={`text-[9px] font-bold uppercase tracking-widest ${catColor(section.category)}`}>
                    {section.category}
                  </p>
                  {isClosed
                    ? <ChevronRight className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                    : <ChevronDown  className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                  }
                </button>

                {/* Items (hidden when section is closed) */}
                {!isClosed && (
                  <>
                    {section.items.map((item) => (
                      <SideNavItem key={item.to} item={item} collapsed={false} />
                    ))}
                  </>
                )}
              </div>
            );
          })}
        </nav>

        </aside>
      </div>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <header className="h-16 border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-40 flex items-center px-4 gap-3">
          <GlobalSearch />
          <div className="ml-auto flex items-center gap-1 shrink-0">
            <ChatBtn />
            <ActivityFeed />
            <StandyBtn />
            <UserMenu />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto pb-20">
          <Outlet />
        </main>
      </div>

      {/* Chat panel + AI Standy */}
      <ChatWidget />
      <StandyWidget />

      {/* Scroll-to-top FAB */}
      {showScrollTop && (
        <button
          onClick={() => smoothScrollTop()}
          className="fixed z-50 bottom-6 right-4 sm:right-6 w-10 h-10 rounded-full bg-card border border-violet-500/30 shadow-lg flex items-center justify-center text-violet-500 hover:bg-violet-500 hover:text-white transition-colors"
          aria-label="กลับขึ้นบน"
          title="กลับขึ้นบน"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
