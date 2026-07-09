import { Link, Navigate } from "react-router-dom";
import { Briefcase, Sparkles, Phone, ArrowRight, UserCog, User as UserIcon, Images, Users2, MessageSquare, PackageSearch, LayoutDashboard, Users, Megaphone, BarChart3, AlarmClock, LayoutGrid, Target, Settings2, UserPlus, TrendingUp, Bell, GitBranch, type LucideIcon } from "lucide-react";
import { useEffect } from "react";
import { useCurrentUser, useAuth, type AppRole } from "@/store/authStore";
import { useSiteSettings } from "@/store/siteSettingsStore";
import { applyOgMeta } from "@/lib/ogMeta";
import { SwitchRoleBtn } from "@/components/SwitchRoleBtn";
import { UserMenu } from "@/components/UserMenu";
import { TeamNotifications } from "@/components/TeamNotifications";
import { ChatWidget, useChatUI } from "@/components/ChatWidget";
import { StandyBtn, StandyWidget } from "@/components/StandyWidget";
import { AddCustomerFAB } from "@/components/AddCustomerFAB";
import { useCRM } from "@/store/crmStore";
import { useChatRead } from "@/store/chatReadStore";
import { useAtRiskPeriods } from "@/components/AtRiskNotification";
import { useMarketingSignals } from "@/pages/MarketingHub";

const baseTiles = [
  {
    title: "Sales&CRM",
    description: "ระบบจัดการการขาย, ลูกค้า, Pipeline, Planning, Mission และรายงาน",
    icon: Briefcase,
    to: "/app",
    gradient: "from-fuchsia-500 via-pink-500 to-rose-500",
  },
  {
    title: "STD Presentation",
    description: "Company Profile และช่องทางสื่อโซเชียลทั้งหมดของบริษัท",
    icon: Sparkles,
    to: "/tour-presentation",
    gradient: "from-amber-400 via-orange-500 to-rose-500",
  },
  {
    title: "Gallery",
    description: "อัลบั้มภาพสถานที่ท่องเที่ยว รีวิว และกิจกรรมของบริษัท",
    icon: Images,
    to: "/gallery",
    gradient: "from-cyan-500 via-sky-500 to-indigo-500",
  },
  {
    title: "Contact us",
    description: "Line ID, QR, เบอร์โทรแต่ละแผนก และที่อยู่บริษัท",
    icon: Phone,
    to: "/contact-info",
    gradient: "from-sky-500 via-indigo-500 to-purple-600",
  },
  {
    title: "Teams",
    description: "รายชื่อและข้อมูลทีมงานทุกตำแหน่ง พร้อมช่องทางติดต่อ",
    icon: Users2,
    to: "/teams",
    gradient: "from-violet-500 via-purple-600 to-fuchsia-600",
  },
  {
    title: "Service and Stock",
    description: "ทัวร์, รถเช่า, ตั๋วเครื่องบิน, โรงแรม, วีซ่า และประกันภัย",
    icon: PackageSearch,
    to: "/service-stock",
    gradient: "from-emerald-500 via-teal-500 to-cyan-500",
  },
];

// ── Marketing — 1-screen compact grid ────────────────────────────────────────────
interface CompactTile { title: string; icon: LucideIcon; to: string; }

function CompactCard({ tile, rgb }: { tile: CompactTile; rgb: string }) {
  return (
    <Link to={tile.to} className="group">
      <div
        className="flex items-center gap-2.5 rounded-xl px-3 py-3 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:brightness-115 group-hover:shadow-lg active:scale-[0.97] cursor-pointer select-none"
        style={{ background: `rgba(${rgb},0.22)`, border: `1.5px solid rgba(${rgb},0.45)` }}
      >
        <tile.icon className="w-4 h-4 shrink-0 text-white/90" strokeWidth={2} />
        <span className="text-[12px] font-semibold text-white leading-tight truncate">{tile.title}</span>
      </div>
    </Link>
  );
}

function SectionRow({
  emoji, label, color, rgb, tiles, cols, delay = 0,
}: {
  emoji: string; label: string; color: string; rgb: string;
  tiles: CompactTile[]; cols?: number; delay?: number;
}) {
  const c = cols ?? tiles.length;
  return (
    <div
      className="animate-in fade-in slide-in-from-bottom-3 duration-500 fill-mode-both"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
        <span className="text-[11px] font-bold" style={{ color }}>{label}</span>
        <div className="flex-1 h-px" style={{ background: `${color}33` }} />
      </div>
      <div className="grid gap-2" style={{ gridTemplateColumns: c >= 5 ? `repeat(auto-fill, minmax(110px, 1fr))` : `repeat(${c}, 1fr)` }}>
        {tiles.map((t) => <CompactCard key={t.title} tile={t} rgb={rgb} />)}
      </div>
    </div>
  );
}

const adminUserTile = {
  title: "Add/Edit User",
  description: "จัดการผู้ใช้งานในระบบ — เพิ่ม / แก้ไข / ลบ และตั้งค่า Role",
  icon: UserCog,
  to: "/users",
  gradient: "from-slate-600 via-zinc-700 to-neutral-800",
};

const webSettingTile = {
  title: "Web Setting",
  description: "ตั้งค่าคำอธิบายหน้า (?), Bot Chat และ Login Banner ของระบบ",
  icon: Settings2,
  to: "/web-setting",
  gradient: "from-slate-600 via-zinc-700 to-neutral-800",
};

const profileTile = {
  title: "My Profile",
  description: "ข้อมูลส่วนตัว นามบัตรดิจิทัล พร้อมดาวน์โหลดเป็นภาพได้",
  icon: UserIcon,
  to: "/profile",
  gradient: "from-emerald-500 via-teal-500 to-cyan-600",
};

// ── Marketing categorised grid ────────────────────────────────────────────────
// ── Marketing categorised grid ────────────────────────────────────────────
function MarketingCategorisedGrid() {
  const signals     = useMarketingSignals();
  const urgentCount = signals.filter((s) => s.type === "at-risk" || s.type === "cancelled").length;
  const fomoCount   = signals.filter((s) => s.type === "almost-full").length;
  const totalCount  = signals.length;

  const intel: CompactTile[] = [
    { title: "Ads Dashboard",    icon: TrendingUp,    to: "/ads-dashboard" },
    { title: "Stock Analytics",  icon: BarChart3,     to: "/app/stock-analytics" },
    { title: "Marketing Report", icon: BarChart3,     to: "/app/marketing-report" },
  ];
  const campaigns: CompactTile[] = [
    { title: "Campaign Mgmt",    icon: Megaphone,     to: "/app/campaigns" },
    { title: "Contents",         icon: LayoutGrid,    to: "/marketing-contents" },
    { title: "Audience Builder", icon: Target,        to: "/audience-builder" },
    { title: "Workflow",         icon: GitBranch,     to: "/app/marketing-workflow" },
  ];
  const custStock: CompactTile[] = [
    { title: "Leads/Customers",  icon: Users,         to: "/app/customers" },
    { title: "Marketing Leads",  icon: UserPlus,      to: "/app/marketing-leads" },
    { title: "Service & Stock",  icon: PackageSearch, to: "/app/all-service" },
  ];
  const company: CompactTile[] = [
    { title: "Presentation",  icon: Sparkles,  to: "/tour-presentation" },
    { title: "Gallery",       icon: Images,    to: "/gallery" },
    { title: "Contact us",    icon: Phone,     to: "/contact-info" },
    { title: "Teams",         icon: Users2,    to: "/teams" },
    { title: "My Profile",    icon: UserIcon,  to: "/profile" },
  ];

  // Top 3 urgent signals for Today's Focus
  const topUrgent = signals
    .filter((s) => s.type === "at-risk" || s.type === "cancelled")
    .slice(0, 3);

  return (
    <div className="flex flex-col gap-3.5">
      {/* ── Hero: Marketing Hub ──────────────────────────────────────────── */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
      <Link to="/app/marketing-hub" className="group">
        <div
          className="relative overflow-hidden rounded-2xl px-5 py-4 flex items-center gap-4 transition-all duration-200 group-hover:brightness-108 group-hover:scale-[1.008]"
          style={{ background: "linear-gradient(135deg,#6d28d9 0%,#a855f7 45%,#db2777 100%)" }}
        >
          <div className="absolute right-0 top-0 h-full w-36 bg-white/5 skew-x-[-18deg] translate-x-10 pointer-events-none" />
          {totalCount > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-[3px] rounded-b-2xl overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-400 via-amber-300 to-purple-400 opacity-70 transition-all duration-700"
                style={{ width: `${Math.min(100, totalCount * 5)}%` }}
              />
            </div>
          )}
          <div className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-white/15">
            <Bell className="w-4 h-4 text-white" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-black text-white leading-none">Marketing Hub</span>
              <span className="text-[8px] font-bold bg-white/20 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wide">HOME</span>
              {totalCount > 0 && (
                <span className="text-[8px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full animate-pulse">
                  {totalCount} รายการ
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              {totalCount === 0 ? (
                <span className="text-[9px] font-semibold text-emerald-400">✅ ทุก Period ปกติดี</span>
              ) : (
                <>
                  {urgentCount > 0 && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/30 text-red-300 border border-red-500/40">
                      🔥 {urgentCount} ด่วน
                    </span>
                  )}
                  {fomoCount > 0 && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/35">
                      📊 {fomoCount} ใกล้เต็ม
                    </span>
                  )}
                  <span className="text-[9px] text-white/35">{totalCount} รายการรวม</span>
                </>
              )}
            </div>
          </div>
          <ArrowRight className="shrink-0 w-4 h-4 text-white/60 transition-transform duration-200 group-hover:translate-x-2" />
        </div>
      </Link>
      </div>

      {/* ── Compact rows ─────────────────────────────────────────────────────────────── */}
      <SectionRow emoji="🎯" label="Intelligence"        color="#a855f7" rgb="168,85,247"   tiles={intel}     cols={3} delay={80}  />
      <SectionRow emoji="📣" label="Campaigns & Content" color="#ec4899" rgb="236,72,153"   tiles={campaigns}  cols={3} delay={160} />
      <SectionRow emoji="👥" label="Customers & Stock"   color="#3b82f6" rgb="59,130,246"   tiles={custStock}  cols={3} delay={240} />
      <SectionRow emoji="🏢" label="Company & Personal"  color="#f59e0b" rgb="245,158,11"   tiles={company}    cols={5} delay={320} />

      {/* ── Today's Focus — top urgent tours ────────────────────────────────── */}
      {topUrgent.length > 0 && (
        <div
          className="animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both mt-1"
          style={{ animationDelay: "400ms" }}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-[13px] leading-none">📌</span>
            <span className="text-[9px] font-black uppercase tracking-widest text-red-400">
              Today's Focus
            </span>
            <div className="flex-1 h-px bg-red-500/30" />
            <Link
              to="/app/marketing-hub"
              className="text-[9px] text-white/30 hover:text-white/60 transition-colors"
            >
              ดูทั้งหมด →
            </Link>
          </div>
          <div className="flex gap-2 flex-wrap">
            {topUrgent.map((s) => (
              <Link key={s.periodId} to="/app/marketing-hub" className="group/focus">
                <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-all duration-150 group-hover/focus:brightness-115 bg-red-500/10 border border-red-500/25">
                  <span className="text-[10px]">{s.type === "cancelled" ? "❌" : "🔥"}</span>
                  <span className="text-[10px] font-bold text-white/80">{s.tourCode}</span>
                  <span className="text-[9px] text-white/40">{s.tourCity}</span>
                  <span className="text-[9px] font-semibold" style={{ color: s.daysLeft <= 7 ? "#f87171" : "#fb923c" }}>
                    {s.daysLeft >= 0 ? `${s.daysLeft}d` : "ยกเลิก"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StaleLeadBtn() {
  const leads     = useCRM((s) => s.leads);
  const currentRep = useCRM((s) => s.currentRep);
  const user      = useCurrentUser();
  const today     = new Date().toISOString().split("T")[0];

  const stale = leads.filter((l) => {
    const isOpen    = l.status !== "Closed Won" && l.status !== "Closed Lost";
    const overdue   = l.next_followup_date && l.next_followup_date < today;
    const isMyLead  = currentRep === "All" || l.assigned_to === currentRep;
    const isSalesRole = user?.role === "Sales";
    return isOpen && overdue && (isSalesRole ? isMyLead : true);
  }).length;

  if (stale === 0) return null;

  return (
    <Link
      to="/app/followup"
      className="shrink-0 relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
      aria-label={`Lead เลยกำหนด Follow Up ${stale} รายการ`}
      title={`Lead เลยกำหนด Follow Up ${stale} รายการ`}
    >
      <AlarmClock className="w-5 h-5 text-amber-400" />
      <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-0.5 rounded-full bg-amber-500 text-[9px] font-bold flex items-center justify-center text-white leading-none">
        {stale > 9 ? "9+" : stale}
      </span>
    </Link>
  );
}



function HubChatButton() {
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
      className="shrink-0 relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
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

export default function Hub() {
  const user = useCurrentUser();
  const viewAsRole = useAuth((s) => s.viewAsRole);
  const ogMain = useSiteSettings((s) => s.ogMain);
  useEffect(() => {
    applyOgMeta(ogMain, `${window.location.origin}/`);
  }, [ogMain]);
  if (!user) return <Navigate to="/login" replace />;
  const effectiveRole: AppRole = user.role === "Admin" && viewAsRole ? viewAsRole : user.role;
  const isMarketing = effectiveRole === "Marketing";
  const sharedTiles = baseTiles.filter((t) => !isMarketing);
  const tiles = [
    ...sharedTiles,
    ...(effectiveRole === "Admin" ? [adminUserTile, webSettingTile] : []),
    profileTile,
  ];
  const isSales = effectiveRole === "Sales" || effectiveRole === "Sales Manager" || effectiveRole === "OB Co-ordinator";
  return (
    <div className="min-h-screen text-white flex flex-col" style={{ background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)" }}>
      <header className="px-6 py-5 flex items-center gap-3">
        <Link to="/" className="flex items-center gap-3 group" aria-label="กลับหน้าหลัก">
          <div className="w-11 h-11 rounded-full overflow-hidden shadow-glow group-hover:scale-105 transition shrink-0">
            <img
              src="/logo-icon.png"
              alt="Standard Tour"
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = "/logo-icon.svg"; }}
            />
          </div>
          <div className="hidden sm:flex flex-col flex-1 min-w-0">
            <h1 className="text-lg font-bold leading-tight truncate">Standard Tour Hub</h1>
            <p className="text-xs text-white/60 truncate">สวัสดี {user.full_name} · {user.role}</p>
          </div>
        </Link>
        <div className="flex-1" />
        <div className="flex items-center gap-1 shrink-0">
          <SwitchRoleBtn variant="dark" />
          <StandyBtn />
          <StaleLeadBtn />
          <HubChatButton />
          <TeamNotifications />
          <UserMenu />
        </div>
      </header>

      <main className="flex-1 flex flex-col max-w-5xl w-full mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Title */}
        <div className={`flex flex-col ${isMarketing ? "items-start mb-5" : "items-center mb-6 sm:mb-8 sm:justify-center"}`}>
          <h2
            className="tracking-tighter leading-none text-white sm:whitespace-nowrap"
            style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900, fontSize: isMarketing ? "clamp(1.8rem, 5vw, 3.5rem)" : "clamp(2.5rem, 9.5vw, 8.5rem)" }}
          >
            {isMarketing ? "Marketing Hub." : "Standard Tour Hub."}
          </h2>
          <p className="text-white/40 mt-1 text-sm">
            {isMarketing ? `สวัสดี ${user.full_name} — เลือกเครื่องมือด้านล่างเพื่อเริ่มงาน` : "ระบบติดตามการขาย และจัดการลูกค้า Standard Tour"}
          </p>
        </div>

        {/* ── Marketing: categorised layout ── */}
        {isMarketing && <MarketingCategorisedGrid />}

        {/* ── Other roles: flat grid ── */}
        {!isMarketing && (
        <div className="grid grid-cols-1 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-2.5">
          {tiles.map((t) => (
            <Link key={t.title} to={t.to} className="group">
              <article
                className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${t.gradient} text-white shadow-elegant transition-all group-hover:-translate-y-0.5 group-hover:shadow-2xl
                  flex flex-row items-center gap-3 px-4 py-3.5
                  sm:flex-col sm:items-center sm:justify-center sm:text-center sm:px-2 sm:py-3 sm:aspect-[3/4]`}
              >
                <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/10 blur-2xl pointer-events-none" />

                {/* Icon */}
                <t.icon
                  className="relative shrink-0 w-8 h-8 sm:w-10 sm:h-10 sm:mb-2"
                  strokeWidth={1.5}
                />

                {/* Text */}
                <div className="relative flex-1 sm:flex-none text-left sm:text-center">
                  <h2
                    className="text-sm sm:text-[15px] leading-tight"
                    style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }}
                  >{t.title}</h2>
                  <p className="hidden sm:block text-[10px] text-white/80 mt-0.5 line-clamp-2 leading-snug">{t.description}</p>
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold mt-1 opacity-90">
                    เข้าใช้งาน <ArrowRight className="w-2.5 h-2.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>

                {/* Mobile arrow */}
                <ArrowRight className="sm:hidden shrink-0 w-4 h-4 opacity-60 transition-transform group-hover:translate-x-0.5" />
              </article>
            </Link>
          ))}
        </div>
        )}
      </main>

      <ChatWidget />
      <StandyWidget />
      {isSales && <AddCustomerFAB />}
    </div>
  );
}
