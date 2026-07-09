/**
 * MarketingPortal.tsx — Marketing Hub Portal Homepage
 * Route: /marketing (index) — ใช้ร่วมกับ MarketingLayout
 *
 * Layout:
 *   [Welcome + Search]  [Banner]
 *   [Categories 3×3 grid]
 *   [Today's Focus | Quick Actions | Activity Feed]
 *   [Footer links]
 */
import { useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  TrendingUp, Megaphone, Users, Briefcase, BarChart3, Zap,
  Target, MessageSquare, Globe, Search, ChevronRight, Flame,
  CheckCircle2, Volume2, UserPlus, FileText, ArrowRight, Activity,
} from "lucide-react";
import { useCurrentUser } from "@/store/authStore";
import { useMarketingSignals } from "./MarketingHub";

// ── Animation CSS ────────────────────────────────────────────────────────────
const ANIM_CSS = `
@keyframes portalFadeUp {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}
.portal-fade {
  animation: portalFadeUp 0.45s cubic-bezier(.22,1,.36,1) forwards;
  opacity: 0;
}
.portal-cat-card {
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}
.portal-cat-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 28px -8px rgba(139,92,246,0.15);
}
.dark .portal-cat-card:hover {
  box-shadow: 0 10px 28px -8px rgba(139,92,246,0.30);
}
`;

// ── Category data ─────────────────────────────────────────────────────────────
type CategoryItem = {
  label: string;
  desc: string;
  icon: LucideIcon;
  gradient: string;
  count: number;
  to: string;
};

const CATEGORIES: CategoryItem[] = [
  {
    label: "Intelligence",
    desc: "วิเคราะห์ข้อมูลเชิงลึก เพื่อวางกลยุทธ์ให้แม่นยำ",
    icon: TrendingUp,
    gradient: "from-violet-500 to-purple-600",
    count: 3,
    to: "/app/marketing-hub",
  },
  {
    label: "Campaigns & Content",
    desc: "สร้างและจัดการแคมเปญ และเนื้อหาการตลาด",
    icon: Megaphone,
    gradient: "from-pink-500 to-rose-500",
    count: 3,
    to: "/app/campaigns",
  },
  {
    label: "Customers & Stock",
    desc: "จัดการลูกค้า และสต็อกสินค้าอย่างมีประสิทธิภาพ",
    icon: Users,
    gradient: "from-blue-500 to-indigo-500",
    count: 3,
    to: "/app/customers",
  },
  {
    label: "Company & Personal",
    desc: "เครื่องมือสำหรับการทำงาน และการจัดการองค์กร",
    icon: Briefcase,
    gradient: "from-orange-500 to-amber-500",
    count: 5,
    to: "/team-resources/team",
  },
  {
    label: "Reports & Analytics",
    desc: "รายงานและวิเคราะห์ประสิทธิภาพแบบเรียลไทม์",
    icon: BarChart3,
    gradient: "from-emerald-500 to-teal-500",
    count: 4,
    to: "/app/marketing-report",
  },
  {
    label: "Automation & Workflow",
    desc: "ระบบอัตโนมัติและเวิร์กโฟลว์ ช่วยประหยัดเวลา",
    icon: Zap,
    gradient: "from-purple-500 to-violet-600",
    count: 2,
    to: "/team-resources/workflow",
  },
  {
    label: "Audience & Data",
    desc: "จัดการกลุ่มเป้าหมายและข้อมูลอย่างเป็นระบบ",
    icon: Target,
    gradient: "from-cyan-500 to-teal-600",
    count: 3,
    to: "/audience-builder/line-export",
  },
  {
    label: "Communication",
    desc: "สื่อสารกับทีมและลูกค้า ได้อย่างมีประสิทธิภาพ",
    icon: MessageSquare,
    gradient: "from-sky-500 to-blue-600",
    count: 3,
    to: "/app/marketing-leads",
  },
  {
    label: "Integrations",
    desc: "เชื่อมต่อกับเครื่องมือ และแพลตฟอร์มอื่นๆ",
    icon: Globe,
    gradient: "from-violet-600 to-indigo-700",
    count: 6,
    to: "/ads-dashboard",
  },
];

// ── Quick actions ─────────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { label: "สร้างแคมเปญ",  icon: Megaphone, to: "/app/campaigns",                 gradient: "from-pink-500 to-rose-500"    },
  { label: "เพิ่มคอนเทนต์", icon: FileText,  to: "/marketing-contents/calendar",   gradient: "from-violet-500 to-purple-600" },
  { label: "ดูรายงาน",      icon: BarChart3, to: "/app/marketing-report",           gradient: "from-emerald-500 to-teal-500"  },
  { label: "เพิ่มลูกค้า",   icon: UserPlus,  to: "/app/customers",                  gradient: "from-blue-500 to-indigo-500"   },
];

// ── Category Card ─────────────────────────────────────────────────────────────
function CategoryCard({ item, index }: { item: CategoryItem; index: number }) {
  const navigate = useNavigate();
  const Icon = item.icon;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(item.to)}
      onKeyDown={(e) => e.key === "Enter" && navigate(item.to)}
      className="portal-fade portal-cat-card bg-card border border-border rounded-xl p-4 cursor-pointer flex items-start gap-3 group"
      style={{ animationDelay: `${160 + index * 45}ms` }}
    >
      {/* Icon square */}
      <div
        className={`w-11 h-11 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-200`}
      >
        <Icon className="w-5 h-5 text-white" />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground leading-tight group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
          {item.label}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">
          {item.desc}
        </p>
      </div>

      {/* Count + arrow */}
      <div className="shrink-0 flex flex-col items-end gap-1.5 pt-0.5">
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground whitespace-nowrap">
          {item.count} เครื่องมือ
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-purple-500 group-hover:translate-x-0.5 transition-all" />
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MarketingPortal() {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const signals = useMarketingSignals();

  const byType = useMemo(() => ({
    "at-risk":     signals.filter((s) => s.type === "at-risk"),
    "almost-full": signals.filter((s) => s.type === "almost-full"),
    "closed":      signals.filter((s) => s.type === "closed"),
    "cancelled":   signals.filter((s) => s.type === "cancelled"),
  }), [signals]);

  // Most urgent signal for Today's Focus
  const topFocus = byType["at-risk"][0] ?? byType["almost-full"][0] ?? null;
  const totalUrgent = byType["at-risk"].length + byType["cancelled"].length;

  // Activity feed from signals
  type ActivityItem = {
    icon: LucideIcon;
    iconColor: string;
    iconBg: string;
    text: string;
    sub: string;
  };

  const activities = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];
    if (byType["at-risk"][0]) {
      const s = byType["at-risk"][0];
      items.push({
        icon: Flame,
        iconColor: "text-orange-500",
        iconBg: "bg-orange-500/10",
        text: `${s.tourCode} ต้องโปรโมทด่วน`,
        sub: `เหลืออีก ${s.daysLeft} วัน · fill ${s.fillRate}%`,
      });
    }
    if (byType["almost-full"][0]) {
      const s = byType["almost-full"][0];
      items.push({
        icon: Volume2,
        iconColor: "text-green-500",
        iconBg: "bg-green-500/10",
        text: `${s.tourCode} ใกล้เต็มแล้ว`,
        sub: `${s.fillRate}% เต็ม · ว่างอีก ${s.quota} ที่`,
      });
    }
    if (byType["closed"][0]) {
      const s = byType["closed"][0];
      items.push({
        icon: CheckCircle2,
        iconColor: "text-blue-500",
        iconBg: "bg-blue-500/10",
        text: `${s.tourCode} ปิดกรุ๊ปสำเร็จ`,
        sub: `เต็มทุก ${s.totalSeats} ที่นั่ง 🎉`,
      });
    }
    // Pad to at least 3 items
    while (items.length < 3) {
      items.push({
        icon: Activity,
        iconColor: "text-purple-500",
        iconBg: "bg-purple-500/10",
        text: "ระบบปกติ ไม่มี Signal ด่วน",
        sub: "ติดตามผลแคมเปญต่อไป",
      });
    }
    return items.slice(0, 3);
  }, [byType]);

  const firstName = user?.full_name?.split(" ")[0] ?? "Marketer";

  return (
    <>
      <style>{ANIM_CSS}</style>

      <div className="max-w-[1200px] mx-auto px-6 py-8 space-y-7">

        {/* ── Top row: Welcome + Banner ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5 items-start">

          {/* Welcome */}
          <div className="portal-fade space-y-4" style={{ animationDelay: "0ms" }}>
            <div>
              <p className="text-sm text-muted-foreground">
                Welcome back, {firstName}! 👋
              </p>
              <h1 className="text-[2.6rem] font-black tracking-tight mt-1 leading-none">
                Marketing Hub
                <span className="text-purple-500">.</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                ศูนย์รวมเครื่องมือการตลาด ครบ จบ ในที่เดียว
              </p>
            </div>

            {/* Search bar — click navigates to Intelligence feed */}
            <button
              onClick={() => navigate("/app/marketing-hub")}
              className="w-full max-w-md flex items-center gap-3 px-4 py-2.5 rounded-xl border border-border bg-muted/40 hover:border-purple-400/60 hover:bg-muted/70 transition-all text-left"
            >
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground flex-1">
                ค้นหาเครื่องมือ, แคมเปญ, รายงาน...
              </span>
              <kbd className="text-[10px] font-mono bg-background border border-border rounded px-1.5 py-0.5 text-muted-foreground shrink-0">
                Ctrl&nbsp;+&nbsp;K
              </kbd>
            </button>
          </div>

          {/* Banner */}
          <div
            className="portal-fade relative overflow-hidden rounded-2xl cursor-pointer group"
            style={{ animationDelay: "70ms", minHeight: 140 }}
            onClick={() => navigate("/app/marketing-hub")}
          >
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-500 to-pink-500" />
            {/* Content */}
            <div className="relative p-5" style={{ paddingRight: 120 }}>
              <p className="text-white font-black text-base leading-tight">
                {totalUrgent > 0
                  ? `${totalUrgent} โปรแกรมต้องดำเนินการด่วน!`
                  : "แคมเปญฤดูร้อนพร้อมแล้ว!"}
              </p>
              <p className="text-white/70 text-xs mt-1.5 leading-relaxed">
                {totalUrgent > 0
                  ? "ตรวจสอบ Marketing Signal และดำเนินการ"
                  : "เตรียมแคมเปญ Summer Promotion เพิ่มยอดขายให้ปังในไตรมาสนี้"}
              </p>
              <button className="mt-3 px-4 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-bold border border-white/20 transition-colors flex items-center gap-1.5 group-hover:gap-2.5">
                ดูแคมเปญ <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
              </button>
              {/* Carousel dots */}
              <div className="flex gap-1 mt-3">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${i === 0 ? "w-4 bg-white" : "w-1.5 bg-white/30"}`}
                  />
                ))}
              </div>
            </div>
            {/* Decorative megaphone */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-6xl select-none opacity-90 drop-shadow-lg group-hover:scale-110 transition-transform">
              📣
            </div>
          </div>
        </div>

        {/* ── Categories ── */}
        <div>
          <div
            className="portal-fade flex items-center justify-between mb-4"
            style={{ animationDelay: "120ms" }}
          >
            <h2 className="text-base font-bold">Categories</h2>
            <button
              onClick={() => navigate("/app/marketing-hub")}
              className="text-xs text-purple-500 hover:text-purple-400 font-medium transition-colors"
            >
              View all
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {CATEGORIES.map((item, i) => (
              <CategoryCard key={item.label} item={item} index={i} />
            ))}
          </div>
        </div>

        {/* ── Bottom 3-column section ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Today's Focus */}
          <div
            className="portal-fade bg-card border border-border rounded-xl p-4 space-y-3"
            style={{ animationDelay: "600ms" }}
          >
            <div className="flex items-center gap-2">
              <span className="text-base" role="img" aria-label="fire">🔥</span>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Today's Focus
              </p>
            </div>

            {topFocus ? (
              <>
                <div>
                  <p className="font-bold text-sm leading-tight">{topFocus.tourCode} {topFocus.tourCity}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    เหลือเวลาอีก {topFocus.daysLeft} วัน
                  </p>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">Fill rate</span>
                    <span className="font-bold">{topFocus.fillRate}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-pink-500 to-purple-500"
                      style={{ width: `${topFocus.fillRate}%`, transition: "width 0.6s ease" }}
                    />
                  </div>
                </div>

                {/* Next 2 signals */}
                {signals.slice(1, 3).map((s) => (
                  <div
                    key={s.periodId}
                    className="flex items-center gap-2 pt-2 border-t border-border/50"
                  >
                    <span className="text-[11px]" role="img" aria-label={s.type}>
                      {s.type === "at-risk" ? "🔥" : s.type === "almost-full" ? "📣" : s.type === "closed" ? "✅" : "❌"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{s.tourCode} {s.tourCity}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                      {s.daysLeft}d
                    </span>
                  </div>
                ))}
              </>
            ) : (
              <div className="text-center py-6">
                <p className="text-3xl mb-2">🎉</p>
                <p className="text-xs font-medium text-foreground">ทุก Period อยู่ในสถานะปกติ</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">ไม่มี Signal ด่วนตอนนี้</p>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div
            className="portal-fade bg-card border border-border rounded-xl p-4 space-y-3"
            style={{ animationDelay: "650ms" }}
          >
            <div className="flex items-center gap-2">
              <span className="text-base" role="img" aria-label="quick">⚡</span>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Quick Actions
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.label}
                    onClick={() => navigate(action.to)}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl bg-muted/40 hover:bg-muted/70 border border-border/50 hover:border-purple-400/30 transition-all group"
                  >
                    <div
                      className={`w-9 h-9 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}
                    >
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground text-center leading-tight">
                      {action.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Activity Feed */}
          <div
            className="portal-fade bg-card border border-border rounded-xl p-4 space-y-3"
            style={{ animationDelay: "700ms" }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base" role="img" aria-label="activity">📋</span>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Activity Feed
                </p>
              </div>
              <Link
                to="/app/marketing-hub"
                className="text-[10px] text-purple-500 hover:text-purple-400 font-medium transition-colors"
              >
                View all
              </Link>
            </div>

            <div className="space-y-3">
              {activities.map((a, i) => {
                const Icon = a.icon;
                return (
                  <div key={i} className="flex items-start gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-lg ${a.iconBg} flex items-center justify-center shrink-0 mt-0.5`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${a.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground leading-snug">{a.text}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{a.sub}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Footer links ── */}
        <div className="portal-fade flex items-center gap-6 pb-2" style={{ animationDelay: "760ms" }}>
          <Link
            to="/team-resources/team"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
          >
            <Users className="w-3.5 h-3.5" />
            Team Resources
          </Link>
          <Link
            to="/team-resources/workflow"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5" />
            Workflow &amp; SOP
          </Link>
        </div>

      </div>
    </>
  );
}
