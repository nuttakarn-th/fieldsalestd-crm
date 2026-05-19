import { Link, Navigate } from "react-router-dom";
import { Briefcase, Sparkles, Phone, ArrowRight, UserCog, User as UserIcon, Image, Images, Users2, MessageSquare, PackageSearch, LayoutDashboard, Users, Megaphone, BarChart3, AlarmClock } from "lucide-react";
import { useCurrentUser, useAuth, type AppRole } from "@/store/authStore";
import { SwitchRoleBtn } from "@/components/SwitchRoleBtn";
import { UserMenu } from "@/components/UserMenu";
import { TeamNotifications } from "@/components/TeamNotifications";
import { ChatWidget, useChatUI } from "@/components/ChatWidget";
import { StandyBtn, StandyWidget } from "@/components/StandyWidget";
import { AddCustomerFAB } from "@/components/AddCustomerFAB";
import { useCRM } from "@/store/crmStore";
import { useChatRead } from "@/store/chatReadStore";

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

const marketingTiles = [
  {
    title: "Sales Dashboard",
    description: "ภาพรวมยอดขาย, Lead, Pipeline และเป้าหมายของทีม",
    icon: LayoutDashboard,
    to: "/marketing-dashboard",
    gradient: "from-purple-600 via-violet-600 to-indigo-600",
  },
  {
    title: "Leads/Customers",
    description: "รายชื่อลูกค้า, สถานะ, ประวัติการติดต่อและข้อมูลการจอง",
    icon: Users,
    to: "/marketing-customers",
    gradient: "from-blue-500 via-blue-600 to-indigo-600",
  },
  {
    title: "Campaign Management",
    description: "จัดการแคมเปญการตลาด, โปรโมชัน และติดตามผล",
    icon: Megaphone,
    to: "/marketing-campaigns",
    gradient: "from-rose-500 via-pink-500 to-fuchsia-600",
  },
  {
    title: "Marketing Report",
    description: "รายงานผลแคมเปญ, ยอดขาย และวิเคราะห์ข้อมูลการตลาด",
    icon: BarChart3,
    to: "/marketing-report",
    gradient: "from-amber-400 via-orange-500 to-rose-500",
  },
];

const profileTile = {
  title: "My Profile",
  description: "ข้อมูลส่วนตัว นามบัตรดิจิทัล พร้อมดาวน์โหลดเป็นภาพได้",
  icon: UserIcon,
  to: "/profile",
  gradient: "from-emerald-500 via-teal-500 to-cyan-600",
};

const adminUserTile = {
  title: "Add/Edit User",
  description: "จัดการผู้ใช้งานในระบบ — เพิ่ม / แก้ไข / ลบ และตั้งค่า Role",
  icon: UserCog,
  to: "/users",
  gradient: "from-slate-600 via-zinc-700 to-neutral-800",
};

const loginBannerTile = {
  title: "Login Banner",
  description: "จัดการ Slide ภาพและข้อความที่แสดงบนหน้าเข้าสู่ระบบ",
  icon: Image,
  to: "/login-banner",
  gradient: "from-violet-500 via-purple-600 to-indigo-700",
};

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
  if (!user) return <Navigate to="/login" replace />;
  const effectiveRole: AppRole = user.role === "Admin" && viewAsRole ? viewAsRole : user.role;
  const isMarketing = effectiveRole === "Marketing";
  const sharedTiles = baseTiles.filter((t) => isMarketing ? t.to !== "/app" : true);
  const tiles = [
    ...(isMarketing ? marketingTiles : []),
    ...sharedTiles,
    ...(effectiveRole === "Admin" ? [adminUserTile, loginBannerTile] : []),
    profileTile,
  ];
  const isSales = effectiveRole === "Sales" || effectiveRole === "OB Co-ordinator";
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

      <main className="flex-1 flex flex-col sm:justify-center max-w-5xl w-full mx-auto px-4 sm:px-6 py-3 sm:py-8">
        {/* Title */}
        <div className="flex flex-col items-center mb-6 sm:mb-8">
          <h2
            className="tracking-tighter leading-none text-white sm:whitespace-nowrap"
            style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900, fontSize: "clamp(2.5rem, 9.5vw, 8.5rem)" }}
          >
            Standard Tour Hub.
          </h2>
          <p className="text-white/40 mt-2 text-sm sm:text-base">ระบบติดตามการขาย และจัดการลูกค้า Standard Tour</p>
        </div>

        {/* Grid:
            Mobile  → 1 column (horizontal card — ครบทุกเมนูใน 1 หน้า)
            Tablet  → 3 column vertical card
            Desktop → 4–5 column compact vertical card              */}
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
      </main>

      <ChatWidget />
      <StandyWidget />
      {isSales && <AddCustomerFAB />}
    </div>
  );
}
