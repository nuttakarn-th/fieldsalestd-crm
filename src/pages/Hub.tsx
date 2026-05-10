import { Link, Navigate } from "react-router-dom";
import { Briefcase, Sparkles, Phone, ArrowRight, UserCog, User as UserIcon } from "lucide-react";
import { useCurrentUser } from "@/store/authStore";
import { UserMenu } from "@/components/UserMenu";
import { ChatWidget } from "@/components/ChatWidget";
import { AddCustomerFAB } from "@/components/AddCustomerFAB";

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
    title: "ข้อมูลติดต่อ",
    description: "Line ID, QR, เบอร์โทรแต่ละแผนก และที่อยู่บริษัท",
    icon: Phone,
    to: "/contact-info",
    gradient: "from-sky-500 via-indigo-500 to-purple-600",
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

export default function Hub() {
  const user = useCurrentUser();
  if (!user) return <Navigate to="/login" replace />;
  const tiles = [
    ...baseTiles,
    ...(user.role === "Admin" ? [adminUserTile] : []),
    profileTile,
  ];
  const isSales = user.role === "Sales";
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/40 to-background">
      <header className="px-6 py-6 max-w-6xl mx-auto flex items-center gap-3">
        <Link to="/" className="flex items-center gap-3 group" aria-label="กลับหน้าหลัก">
          <div className="w-12 h-12 rounded-2xl bg-white shadow-glow group-hover:scale-105 transition flex items-center justify-center overflow-hidden p-1.5">
            <img src="/favicon.ico" alt="Standard Tour" className="w-full h-full object-contain" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Standard Tour Hub</h1>
            <p className="text-sm text-muted-foreground">สวัสดี {user.full_name} · {user.role}</p>
          </div>
        </Link>
        <div className="flex-1" />
        <UserMenu />
      </header>

      <main className="max-w-6xl mx-auto px-6 pb-16 pt-6">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Sales & CRM</h2>
          <p className="text-muted-foreground mt-2">ระบบติดตามการขาย และจัดการลูกค้า Standard Tour</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {tiles.map((t) => (
            <Link key={t.title} to={t.to} className="group">
              <article className={`relative overflow-hidden rounded-3xl p-8 h-80 flex flex-col items-center justify-center text-center text-white shadow-elegant transition-transform group-hover:-translate-y-1 bg-gradient-to-br ${t.gradient}`}>
                <div className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
                <t.icon className="relative w-20 h-20 mb-5" strokeWidth={1.75} />
                <div className="relative space-y-2 max-w-xs">
                  <h2 className="text-2xl font-bold">{t.title}</h2>
                  <p className="text-sm text-white/85">{t.description}</p>
                  <span className="inline-flex items-center justify-center gap-1 text-sm font-semibold pt-3">
                    เข้าใช้งาน <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
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
