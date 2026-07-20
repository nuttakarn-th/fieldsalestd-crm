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
import { useMemo, useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  TrendingUp, Megaphone, Users, BarChart3, Zap,
  Target, LayoutGrid, ChevronRight, Flame,
  CheckCircle2, Volume2, UserPlus, FileText, ArrowRight, Activity,
  Search, X, Images, BookOpen, Phone, AlertTriangle,
} from "lucide-react";
import { useCurrentUser } from "@/store/authStore";
import { useMarketingSignals } from "./MarketingHub";
import { useAtRiskPeriods } from "@/components/AtRiskNotification";
import { AhagramWidget } from "@/components/AhagramWidget";

// ── Animation CSS ────────────────────────────────────────────────────────────
const ANIM_CSS = `
@keyframes portalFadeUp {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes urgentRing {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.55); }
  50%       { box-shadow: 0 0 0 6px rgba(239,68,68,0); }
}
.urgent-ring { animation: urgentRing 1.6s ease-in-out infinite; }
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
    desc: "วิเคราะห์ Signal และข้อมูลเชิงลึก เพื่อวางกลยุทธ์ให้แม่นยำ",
    icon: TrendingUp,
    gradient: "from-violet-500 to-purple-600",
    count: 3,
    to: "/app/marketing-hub",
  },
  {
    label: "Campaigns",
    desc: "สร้างและจัดการแคมเปญการตลาด",
    icon: Megaphone,
    gradient: "from-pink-500 to-rose-500",
    count: 3,
    to: "/app/campaigns",
  },
  {
    label: "Content",
    desc: "ปฏิทินเนื้อหา, คลังภาพ, ติดตาม Performance",
    icon: LayoutGrid,
    gradient: "from-sky-500 to-blue-500",
    count: 5,
    to: "/marketing-contents/calendar",
  },
  {
    label: "Audience",
    desc: "กลุ่มเป้าหมาย LINE, Facebook, Birthday, VIP และอื่นๆ",
    icon: Target,
    gradient: "from-cyan-500 to-teal-600",
    count: 6,
    to: "/audience-builder/line-export",
  },
  {
    label: "Reports",
    desc: "รายงานและวิเคราะห์ประสิทธิภาพการตลาดแบบเรียลไทม์",
    icon: BarChart3,
    gradient: "from-emerald-500 to-teal-500",
    count: 4,
    to: "/app/marketing-report",
  },
  {
    label: "Team",
    desc: "ทีม Marketing, โครงสร้างองค์กร",
    icon: Users,
    gradient: "from-orange-500 to-amber-500",
    count: 2,
    to: "/team-resources/team",
  },
];

// ── Quick actions ─────────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { label: "สร้างแคมเปญ",  icon: Megaphone, to: "/app/campaigns",                 gradient: "from-pink-500 to-rose-500"    },
  { label: "เพิ่มคอนเทนต์", icon: FileText,  to: "/marketing-contents/calendar",   gradient: "from-violet-500 to-purple-600" },
  { label: "ดูรายงาน",      icon: BarChart3, to: "/app/marketing-report",           gradient: "from-emerald-500 to-teal-500"  },
  { label: "เพิ่มลูกค้า",   icon: UserPlus,  to: "/marketing/customers",            gradient: "from-blue-500 to-indigo-500"   },
];

// ── Tool search index (categories + nav shortcuts) ───────────────────────────
type ToolEntry = { label: string; desc: string; icon: LucideIcon; gradient: string; to: string };

const TOOL_INDEX: ToolEntry[] = [
  ...CATEGORIES,
  { label: "Dashboard",         desc: "Marketing dashboard overview",                    icon: BarChart3,   gradient: "from-emerald-500 to-teal-500",   to: "/marketing-dashboard"               },
  { label: "Ads Dashboard",     desc: "โฆษณา Facebook, Google Ads, ติดตามผล",           icon: Megaphone,   gradient: "from-pink-500 to-rose-500",      to: "/ads-dashboard"                      },
  { label: "LINE Export",       desc: "Export กลุ่มลูกค้าส่ง LINE broadcast",           icon: Target,      gradient: "from-cyan-500 to-teal-600",      to: "/audience-builder/line-export"       },
  { label: "Birthday List",     desc: "ลูกค้าที่มีวันเกิดในช่วงที่เลือก",              icon: Users,       gradient: "from-orange-500 to-amber-500",   to: "/audience-builder/birthday"          },
  { label: "Tour Link",         desc: "สร้าง Link โปรแกรมทัวร์ สำหรับแชร์",            icon: FileText,    gradient: "from-sky-500 to-blue-500",       to: "/marketing-contents/tour-link"       },
  { label: "Photo Frame",       desc: "กรอบรูป, Banner, สำหรับโพสต์",                  icon: LayoutGrid,  gradient: "from-sky-500 to-blue-500",       to: "/marketing-contents/photo-frame"     },
  { label: "Marketing Leads",   desc: "Leads ที่มาจากช่องทาง Marketing",               icon: UserPlus,    gradient: "from-blue-500 to-indigo-500",    to: "/app/marketing-leads"                },
  { label: "Stock Analytics",   desc: "วิเคราะห์สต็อก, ที่นั่ง, Period",              icon: TrendingUp,  gradient: "from-violet-500 to-purple-600",  to: "/app/stock-analytics"                },
  { label: "My Tasks",          desc: "งานส่วนตัว, บันทึกงาน, to-do",                icon: CheckCircle2, gradient: "from-pink-500 to-rose-500",     to: "/marketing/tasks"                    },
  { label: "Gallery",           desc: "คลังรูปถ่ายทัวร์, อัลบั้ม, รูปสำหรับโพสต์",   icon: Images,       gradient: "from-fuchsia-500 to-pink-500",  to: "/gallery"                            },
  { label: "Tour Presentation", desc: "Company Profile, Social Links, สไลด์ทัวร์",    icon: BookOpen,     gradient: "from-violet-500 to-indigo-600", to: "/tour-presentation"                  },
  { label: "Contact Info",      desc: "เบอร์โทร, ที่อยู่, LINE, เวลาทำการ",           icon: Phone,        gradient: "from-slate-500 to-gray-600",    to: "/contact-info"                       },
];

// ── ToolSearch component ──────────────────────────────────────────────────────
function ToolSearch() {
  const [q, setQ]         = useState("");
  const [open, setOpen]   = useState(false);
  const wrapRef           = useRef<HTMLDivElement>(null);
  const navigate          = useNavigate();

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return TOOL_INDEX.filter(
      (t) => t.label.toLowerCase().includes(s) || t.desc.toLowerCase().includes(s)
    ).slice(0, 6);
  }, [q]);

  const handleSelect = (to: string) => {
    setOpen(false);
    setQ("");
    navigate(to);
  };

  return (
    <div ref={wrapRef} className="relative z-[60] w-full max-w-md">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="ค้นหาเครื่องมือ, แคมเปญ, รายงาน..."
          className="w-full h-10 pl-9 pr-9 rounded-xl border border-border bg-muted/40 hover:border-purple-400/60 focus:border-purple-400 focus:bg-card focus:outline-none text-sm placeholder:text-muted-foreground transition-colors"
        />
        {q && (
          <button
            type="button"
            onClick={() => { setQ(""); setOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50">
          {results.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.to}
                type="button"
                onClick={() => handleSelect(t.to)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/60 transition-colors text-left"
              >
                <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${t.gradient} flex items-center justify-center shrink-0`}>
                  <Icon className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{t.label}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{t.desc}</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
              </button>
            );
          })}
        </div>
      )}

      {/* No results */}
      {open && q.trim() && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg p-4 text-center z-50">
          <p className="text-sm text-muted-foreground">ไม่พบเครื่องมือที่ตรงกัน</p>
        </div>
      )}
    </div>
  );
}

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

  // At-risk breakdown for Danger banner (sorted by daysLeft asc)
  const atRisk        = useAtRiskPeriods();
  const criticalCount = atRisk.filter((p) => p.level === "critical").length;
  const warningCount  = atRisk.filter((p) => p.level === "warning").length;
  const mostUrgent    = atRisk[0] ?? null; // most days-left critical first

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
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5 items-stretch">

          {/* Welcome */}
          <div className="portal-fade space-y-4 relative z-10" style={{ animationDelay: "0ms" }}>
            <div>
              <p className="text-sm text-muted-foreground">
                Welcome back, {firstName}! 👋
              </p>
              <h1
                style={{ fontFamily: "'Inter', 'Kanit', sans-serif", fontWeight: 900, fontSize: "2.6rem", letterSpacing: "-0.02em", lineHeight: 1 }}
                className="mt-1"
              >
                Marketing Hub
                <span className="text-purple-500">.</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                ศูนย์รวมเครื่องมือการตลาด ครบ จบ ในที่เดียว
              </p>
            </div>

            {/* Tool search */}
            <ToolSearch />
          </div>

          {/* ── Right column: 2-card stack / normal banner ── */}
          {totalUrgent > 0 ? (
            /* ── DANGER MODE: 2 cards stacked, fill full height ── */
            <div className="portal-fade flex flex-col gap-3 h-full" style={{ animationDelay: "70ms" }}>

              {/* Card 1 — Critical ≤7 วัน (สีแดง, ใหญ่กว่า) */}
              {criticalCount > 0 ? (
                <div
                  className="relative overflow-hidden rounded-2xl cursor-pointer group urgent-ring flex-[3] flex flex-col justify-between"
                  style={{ minHeight: 120 }}
                  onClick={() => navigate("/app/stock-analytics")}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-red-700 via-red-600 to-rose-500" />
                  <div className="relative p-4 flex flex-col justify-between h-full" style={{ paddingRight: 90 }}>
                    {/* Chip */}
                    <span className="inline-flex items-center gap-1 text-[9px] font-extrabold bg-white/20 text-white px-2 py-0.5 rounded-full w-fit uppercase tracking-wide">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      เร่งด่วนมาก
                    </span>
                    {/* Main content */}
                    <div className="mt-2">
                      <p className="text-white font-black leading-none" style={{ fontSize: 32 }}>
                        {criticalCount}
                        <span className="text-base font-bold ml-1.5 opacity-80">โปรแกรม</span>
                      </p>
                      <p className="text-white/70 text-xs mt-0.5">เหลือ ≤ 7 วัน — ต้องดำเนินการวันนี้</p>
                      {mostUrgent && (
                        <p className="text-white/55 text-[10px] mt-1 leading-tight">
                          ⏰ <span className="text-white font-semibold">{mostUrgent.tourCode}</span>
                          {" "}เหลือ <span className="text-white font-bold">{mostUrgent.daysLeft} วัน</span>
                          {" "}· fill {mostUrgent.fillRate}%
                        </p>
                      )}
                    </div>
                    {/* CTA */}
                    <button className="mt-3 w-fit px-3 py-1.5 rounded-lg bg-white text-red-600 text-xs font-extrabold flex items-center gap-1.5 hover:bg-red-50 group-hover:gap-2.5 transition-all shadow-sm">
                      ดำเนินการเลย <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </div>
                  {/* Icon */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-70 group-hover:scale-110 group-hover:opacity-90 transition-all">
                    <AlertTriangle className="w-14 h-14 text-white" strokeWidth={1.5} />
                  </div>
                </div>
              ) : (
                /* placeholder ว่าง ถ้าไม่มี critical */
                <div className="flex-[3] rounded-2xl bg-green-50 border border-green-200 flex items-center justify-center p-4">
                  <p className="text-green-600 text-sm font-semibold">✅ ไม่มีโปรแกรมด่วนมาก</p>
                </div>
              )}

              {/* Card 2 — Warning ≤30 วัน (สีส้ม, เล็กกว่า) */}
              {warningCount > 0 ? (
                <div
                  className="relative overflow-hidden rounded-2xl cursor-pointer group flex-[2] flex flex-col justify-between"
                  style={{ minHeight: 80 }}
                  onClick={() => navigate("/app/stock-analytics")}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500 via-orange-500 to-orange-400" />
                  <div className="relative px-4 py-3 flex items-center gap-4 h-full" style={{ paddingRight: 80 }}>
                    {/* Number */}
                    <div className="shrink-0">
                      <p className="text-white font-black leading-none" style={{ fontSize: 28 }}>{warningCount}</p>
                      <p className="text-white/70 text-[10px] leading-tight">โปรแกรม</p>
                    </div>
                    {/* Info */}
                    <div className="min-w-0">
                      <p className="text-white font-bold text-xs leading-tight">ต้องเฝ้าระวัง</p>
                      <p className="text-white/70 text-[10px] mt-0.5">เหลือ 8–30 วัน · fill rate ต่ำกว่า 40%</p>
                      {/* Mini progress bar */}
                      <div className="mt-1.5 h-1 w-24 rounded-full bg-white/25 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-white/80 transition-all"
                          style={{ width: `${Math.round((warningCount / Math.max(totalUrgent, 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  {/* Icon */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-3xl opacity-70 group-hover:scale-110 group-hover:opacity-90 transition-all select-none">
                    ⚠️
                  </div>
                </div>
              ) : (
                <div className="flex-[2] rounded-2xl bg-green-50 border border-green-200 flex items-center justify-center p-3">
                  <p className="text-green-600 text-xs font-medium">✅ ไม่มีรายการเฝ้าระวัง</p>
                </div>
              )}
            </div>
          ) : (
            /* ── NORMAL MODE — ไม่มี at-risk ── */
            <div
              className="portal-fade relative overflow-hidden rounded-2xl cursor-pointer group h-full"
              style={{ animationDelay: "70ms", minHeight: 140 }}
              onClick={() => navigate("/app/marketing-hub")}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-500 to-pink-500" />
              <div className="relative p-5 h-full flex flex-col justify-between" style={{ paddingRight: 120 }}>
                <div>
                  <p className="text-white font-black text-base leading-tight">แคมเปญฤดูร้อนพร้อมแล้ว!</p>
                  <p className="text-white/70 text-xs mt-1.5 leading-relaxed">
                    เตรียมแคมเปญ Summer Promotion เพิ่มยอดขายให้ปังในไตรมาสนี้
                  </p>
                </div>
                <div>
                  <button className="mt-3 px-4 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-bold border border-white/20 transition-colors flex items-center gap-1.5 group-hover:gap-2.5">
                    ดูแคมเปญ <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                  </button>
                  <div className="flex gap-1 mt-3">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className={`h-1.5 rounded-full transition-all ${i === 0 ? "w-4 bg-white" : "w-1.5 bg-white/30"}`} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-6xl select-none opacity-90 drop-shadow-lg group-hover:scale-110 transition-transform">
                📣
              </div>
            </div>
          )}
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
          <Link
            to="/contact-info"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
          >
            <Phone className="w-3.5 h-3.5" />
            Contact Info
          </Link>
          {/* 🎮 AHAGRAM Test — inline footer entry */}
          <AhagramWidget inline />
        </div>

      </div>
    </>
  );
}
