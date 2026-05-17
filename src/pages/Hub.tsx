import { Link, Navigate } from "react-router-dom";
import { Briefcase, Sparkles, Phone, ArrowRight, UserCog, User as UserIcon, Image, Images, Users2, MessageSquare } from "lucide-react";
import { useCurrentUser } from "@/store/authStore";
import { UserMenu } from "@/components/UserMenu";
import { TeamNotifications } from "@/components/TeamNotifications";
import { ChatWidget, useChatUI } from "@/components/ChatWidget";
import { AddCustomerFAB } from "@/components/AddCustomerFAB";
import { useCRM } from "@/store/crmStore";
import { useChatRead } from "@/store/chatReadStore";

const baseTiles = [
  {
    title: "Sales CRM",
    description: "ระบบจัดการการขาย, ลูกค้า, Pipeline, Planning, Mission และรายงาน",
    icon: Briefcase,
    to: "/app",
    gradient: "from-fuchsia-500 via-pink-500 to-rose-500",
  },
  {
    title: "Standard Tour Presentation",
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
    title: "ข้อมูลติดต่อ",
    description: "Line ID, QR, เบอร์โทรแต่ละแผนก และที่อยู่บริษัท",
    icon: Phone,
    to: "/contact-info",
    gradient: "from-sky-500 via-indigo-500 to-purple-600",
  },
  {
    title: "ข้อมูลทีมงาน",
    description: "รายชื่อและข้อมูลทีมงานทุกตำแหน่ง พร้อมช่องทางติดต่อ",
    icon: Users2,
    to: "/teams",
    gradient: "from-violet-500 via-purple-600 to-fuchsia-600",
  },
];

const profileTile = {
  title: "My Profile",
  description: "ข้อมูลส่วนตัว นามบัตรดิจิทัล พร้อมดาวน์โหลดเป็นภาพได้",
  icon: UserIcon,
  to: "/app/profile",
  gradient: "from-emerald-500 via-teal-500 to-cyan-600",
};

const adminUserTile = {
  title: "Add/Edit User",
  description: "จัดการผู้ใช้งานในระบบ — เพิ่ม / แก้ไข / ลบ และตั้งค่า Role",
  icon: UserCog,
  to: "/app/users",
  gradient: "from-slate-600 via-zinc-700 to-neutral-800",
};

const loginBannerTile = {
  title: "Login Banner",
  description: "จัดการ Slide ภาพและข้อความที่แสดงบนหน้าเข้าสู่ระบบ",
  icon: Image,
  to: "/app/login-banner",
  gradient: "from-violet-500 via-purple-600 to-indigo-700",
};

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
  if (!user) return <Navigate to="/login" replace />;
  const tiles = [
    ...baseTiles,
    ...(user.role === "Admin" ? [adminUserTile, loginBannerTile] : []),
    profileTile,
  ];
  const isSales = user.role === "Sales";
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/40 to-background">
      <header className="px-6 py-5 max-w-6xl mx-auto flex items-center gap-3">
        <Link to="/" className="flex items-center gap-3 group" aria-label="กลับหน้าหลัก">
          <div className="w-11 h-11 rounded-full overflow-hidden shadow-glow group-hover:scale-105 transition shrink-0">
            <img
              src="/logo-icon.png"
              alt="Standard Tour"
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = "/logo-icon.svg"; }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold leading-tight truncate">Standard Tour Hub</h1>
            <p className="text-xs text-muted-foreground truncate">สวัสดี {user.full_name} · {user.role}</p>
          </div>
        </Link>
        <div className="flex-1" />
        <div className="flex items-center gap-1 shrink-0">
          <HubChatButton />
          <TeamNotifications />
          <UserMenu />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pb-16 pt-4 sm:pt-6">
        <div className="text-center mb-8 sm:mb-10">
          <h2 className="font-inter font-extrabold text-4xl sm:text-5xl md:text-6xl lg:text-7xl tracking-tighter leading-none">
            Standard Tour Hub.
          </h2>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">ระบบติดตามการขาย และจัดการลูกค้า Standard Tour</p>
        </div>

        {/* Mobile: 2 คอลัมน์ 1:1 | Tablet: 3 คอลัมน์ | Desktop: 4-5 คอลัมน์ 3:4 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {tiles.map((t) => (
            <Link key={t.title} to={t.to} className="group">
              <article
                className={`relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col items-center justify-center text-center text-white shadow-elegant transition-transform group-hover:-translate-y-1 bg-gradient-to-br ${t.gradient} aspect-square sm:aspect-[3/4]`}
              >
                <div className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full bg-white/10 blur-2xl" />
                <t.icon className="relative w-14 h-14 sm:w-14 sm:h-14 lg:w-16 lg:h-16 mb-3 sm:mb-3" strokeWidth={1.5} />
                <div className="relative space-y-1.5 sm:space-y-2">
                  <h2 className="text-base sm:text-lg lg:text-xl font-bold leading-tight">{t.title}</h2>
                  <p className="hidden sm:block text-xs text-white/85 line-clamp-3">{t.description}</p>
                  <span className="inline-flex items-center justify-center gap-1 text-xs font-semibold pt-1 sm:pt-2">
                    เข้าใช้งาน <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </main>

      <ChatWidget />
      {isSales && <AddCustomerFAB />}
    </div>
  );
}
