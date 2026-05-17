import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Phone, Mail, MessageCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCRM } from "@/store/crmStore";
import { useAuth, type AppRole } from "@/store/authStore";
import { useChatUI } from "@/components/ChatWidget";

/* ── Role display order ── */
const ROLE_ORDER: AppRole[] = [
  "Admin",
  "Sales Manager",
  "Sales",
  "Marketing",
  "Co-Ordinator",
  "Accounting",
];

/* ── Line SVG icon ── */
function LineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.627.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.105.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
    </svg>
  );
}

/* ── Member Card ── */
interface MemberCardProps {
  u: ReturnType<typeof useAuth extends (s: any) => infer R ? never : never> extends never
    ? import("@/store/authStore").AppUser
    : import("@/store/authStore").AppUser;

  onChat: (name: string) => void;
}

function MemberCard({ u, onChat }: MemberCardProps) {
  return (
    <div className="bg-card border rounded-2xl overflow-hidden shadow-soft hover:shadow-elegant hover:-translate-y-1 transition-all duration-300 group flex flex-col">
      {/* Photo */}
      <div className="aspect-square w-full overflow-hidden bg-muted shrink-0">
        <img
          src={u.avatar_url || "/Blank-Display.png"}
          alt={u.full_name}
          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
          onError={(e) => { (e.target as HTMLImageElement).src = "/Blank-Display.png"; }}
        />
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        {/* Name + Role */}
        <div className="text-center">
          <h3 className="font-bold text-sm leading-tight truncate" style={{ fontFamily: "'Inter', sans-serif" }}>
            {u.full_name}
          </h3>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
            {u.department || u.role}
          </p>
        </div>

        {/* Divider */}
        <div className="border-t border-border/50" />

        {/* Contact icon buttons */}
        <div className="flex items-center justify-center gap-2">
          {u.tel ? (
            <a
              href={`tel:${u.tel}`}
              className="w-8 h-8 rounded-full bg-pink-500/10 text-pink-500 flex items-center justify-center hover:bg-pink-500 hover:text-white transition-colors"
              title={u.tel}
            >
              <Phone className="w-3.5 h-3.5" />
            </a>
          ) : (
            <span className="w-8 h-8 rounded-full bg-muted/40 text-muted-foreground/30 flex items-center justify-center cursor-not-allowed">
              <Phone className="w-3.5 h-3.5" />
            </span>
          )}

          {u.email ? (
            <a
              href={`mailto:${u.email}`}
              className="w-8 h-8 rounded-full bg-violet-500/10 text-violet-500 flex items-center justify-center hover:bg-violet-500 hover:text-white transition-colors"
              title={u.email}
            >
              <Mail className="w-3.5 h-3.5" />
            </a>
          ) : (
            <span className="w-8 h-8 rounded-full bg-muted/40 text-muted-foreground/30 flex items-center justify-center cursor-not-allowed">
              <Mail className="w-3.5 h-3.5" />
            </span>
          )}

          {u.line_qr_url ? (
            <a
              href={u.line_qr_url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center hover:bg-green-500 hover:text-white transition-colors"
              title="LINE"
            >
              <LineIcon className="w-3.5 h-3.5" />
            </a>
          ) : (
            <span className="w-8 h-8 rounded-full bg-muted/40 text-muted-foreground/30 flex items-center justify-center cursor-not-allowed">
              <LineIcon className="w-3.5 h-3.5" />
            </span>
          )}

          <button
            onClick={() => onChat(u.full_name)}
            className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
            title="แชทใน CRM"
          >
            <MessageCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function SalesTeam() {
  const openChat = useChatUI((s) => s.open);
  const users = useAuth((s) => s.users);

  /* Flatten all users sorted by role order, then name */
  const sortedMembers = useMemo(() => {
    return [...users].sort((a, b) => {
      const ri = ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role);
      if (ri !== 0) return ri;
      return a.full_name.localeCompare(b.full_name, "th");
    });
  }, [users]);

  const totalMembers = users.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
      {/* Standalone header — same pattern as TourPresentation / ContactInfo */}
      <header className="px-5 sm:px-8 py-5 max-w-7xl mx-auto flex items-center gap-3">
        <Link to="/">
          <Button variant="outline" size="icon" className="shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="w-9 h-9 rounded-full overflow-hidden shadow-md shrink-0">
          <img
            src="/logo-icon.png"
            alt="Standard Tour"
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = "/logo-icon.svg"; }}
          />
        </div>
        <span className="font-bold text-sm text-muted-foreground">Standard Tour</span>
      </header>

    <div className="px-4 sm:px-8 py-4 space-y-10 max-w-7xl mx-auto">

      {/* ── Page Header ── */}
      <div className="text-center space-y-2 pb-4">
        <h1
          className="text-4xl sm:text-5xl tracking-tight"
          style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }}
        >
          Standard{" "}
          <span className="bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 bg-clip-text text-transparent">
            Teams
          </span>
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg">
          บริการด้วยจิต ดูแลด้วยใจ
        </p>
        <p className="text-xs text-muted-foreground/60">
          ทีมงานทั้งหมด {totalMembers} คน
        </p>
      </div>

      {/* ── Single Grid ── */}
      {sortedMembers.length === 0 ? (
        <div className="rounded-xl border border-dashed p-14 text-center text-muted-foreground">
          ยังไม่มีพนักงานในระบบ — Admin เพิ่มได้ที่หน้า User Management
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          {sortedMembers.map((u) => (
            <MemberCard
              key={u.user_id}
              u={u}
              onChat={openChat as (name: string) => void}
            />
          ))}
        </div>
      )}
    </div>
    </div>
  );
}
