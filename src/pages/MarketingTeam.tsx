/**
 * MarketingTeam.tsx
 * หน้าทีม Marketing — ดึงภาพและข้อมูลจาก User ระบบจริง
 * Filter: role === "Marketing"
 * สไตล์: Standard Teams + role-color accent ตาม department
 */
import { useMemo, useRef, useState } from "react";
import { Phone, Mail, MessageCircle, Download, X } from "lucide-react";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import { useAuth, type AppUser } from "@/store/authStore";
import { useSiteSettings } from "@/store/siteSettingsStore";
import { useChatUI } from "@/components/ChatWidget";
import { DigitalNamecard } from "@/components/DigitalNamecard";
import { toast } from "sonner";

const COMPANY_NAME = "บริษัท สแตนดาร์ดทัวร์ จำกัด";

// ── Role-color mapping (detect from department field) ─────────────────────────
type RoleKey = "mgr" | "exec" | "cm" | "gd" | "vdo" | "mkt";

function detectRole(u: AppUser): RoleKey {
  const d = (u.department || "").toLowerCase();
  if (d.includes("manager"))                          return "mgr";
  if (d.includes("executive"))                        return "exec";
  if (d.includes("content"))                          return "cm";
  if (d.includes("graphic") || d.includes("design")) return "gd";
  if (d.includes("vdo")     || d.includes("video"))  return "vdo";
  return "mkt";
}

const ROLE_META: Record<RoleKey, {
  color: string; label: string; gradient: string;
  bgLight: string; bgDark: string;
}> = {
  mgr:  { color:"#7c3aed", label:"Manager",    gradient:"linear-gradient(135deg,#5b21b6,#8b5cf6)", bgLight:"#f3e8ff", bgDark:"rgba(192,132,252,0.18)" },
  exec: { color:"#2563eb", label:"Executive",  gradient:"linear-gradient(135deg,#1e40af,#3b82f6)", bgLight:"#eff6ff", bgDark:"rgba(96,165,250,0.18)"  },
  cm:   { color:"#16a34a", label:"Content",    gradient:"linear-gradient(135deg,#166534,#22c55e)", bgLight:"#f0fdf4", bgDark:"rgba(74,222,128,0.15)"  },
  gd:   { color:"#ea580c", label:"Design",     gradient:"linear-gradient(135deg,#c2410c,#f97316)", bgLight:"#fff7ed", bgDark:"rgba(251,146,60,0.15)"  },
  vdo:  { color:"#dc2626", label:"Video",      gradient:"linear-gradient(135deg,#991b1b,#ef4444)", bgLight:"#fef2f2", bgDark:"rgba(248,113,113,0.15)" },
  mkt:  { color:"#db2777", label:"Marketing",  gradient:"linear-gradient(135deg,#9d174d,#ec4899)", bgLight:"#fdf2f8", bgDark:"rgba(236,72,153,0.15)"  },
};

// ── Sort order: Manager first, then others ────────────────────────────────────
const ROLE_SORT: RoleKey[] = ["mgr", "exec", "cm", "gd", "vdo", "mkt"];

// ── Fade-in animation CSS ─────────────────────────────────────────────────────
const ANIM_CSS = `
@keyframes mktMemberFadeUp {
  from { opacity: 0; transform: translateY(22px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0)    scale(1);    }
}
.mkt-member-card {
  transition: transform 0.24s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.24s ease;
}
.mkt-member-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 14px 36px rgba(0,0,0,0.14);
}
.dark .mkt-member-card:hover {
  box-shadow: 0 14px 36px rgba(0,0,0,0.5);
}
`;

// ── Line SVG icon ─────────────────────────────────────────────────────────────
function LineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.627.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.105.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
    </svg>
  );
}

// ── Namecard Modal (same as SalesTeam) ────────────────────────────────────────
function NamecardModal({ u, onClose }: { u: AppUser; onClose: () => void }) {
  const settings  = useSiteSettings();
  const theme     = useAuth((s) => s.theme);
  const cardRef   = useRef<HTMLDivElement>(null);
  const [dl, setDl] = useState(false);

  const vCard = [
    "BEGIN:VCARD", "VERSION:3.0",
    `FN:${u.full_name}`,
    `ORG:${COMPANY_NAME}`,
    `TITLE:${u.department ?? u.role}`,
    u.tel   ? `TEL;TYPE=cell:${u.tel}`   : "",
    u.email ? `EMAIL:${u.email}`          : "",
    settings.hqAddress ? `ADR:;;${settings.hqAddress};;;;TH` : "",
    "URL:https://www.standardtour.com",
    "END:VCARD",
  ].filter(Boolean).join("\n");

  const download = async () => {
    if (!cardRef.current) return;
    setDl(true);
    try {
      const url = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 3, backgroundColor: "#ffffff" });
      const a = document.createElement("a");
      a.download = `${u.full_name}_namecard.png`;
      a.href = url; a.click();
      toast.success("ดาวน์โหลดนามบัตรเรียบร้อย");
    } catch { toast.error("ดาวน์โหลดไม่สำเร็จ"); }
    finally { setDl(false); }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-[300px] my-4 flex flex-col gap-3">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-20 w-7 h-7 rounded-full bg-white/90 shadow-lg flex items-center justify-center text-gray-600 hover:text-gray-900 hover:scale-110 transition-all"
        >
          <X className="w-3.5 h-3.5" />
        </button>
        <DigitalNamecard
          ref={cardRef}
          fullName={u.full_name}
          position={u.department || u.role}
          avatar={u.avatar_url}
          tel={u.tel}
          email={u.email}
          lineQrUrl={u.line_qr_url}
          vCard={vCard}
          theme={theme}
          hqAddress={settings.hqAddress}
        />
        <Button
          onClick={download}
          disabled={dl}
          className="w-full bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white hover:opacity-90"
        >
          <Download className="w-4 h-4 mr-2" />
          {dl ? "กำลังบันทึก..." : "ดาวน์โหลดนามบัตร"}
        </Button>
      </div>
    </div>
  );
}

// ── Member Card ───────────────────────────────────────────────────────────────
function MemberCard({
  u, delay, onOpenCard, onMention,
}: {
  u: AppUser; delay: number;
  onOpenCard: (u: AppUser) => void;
  onMention:  (name: string) => void;
}) {
  const rk   = detectRole(u);
  const meta = ROLE_META[rk];

  return (
    <div
      className="mkt-member-card bg-card border rounded-2xl overflow-hidden shadow-soft flex flex-col"
      style={{ animation: `mktMemberFadeUp 0.55s ease ${delay}ms both` }}
    >
      {/* Role-color top stripe */}
      <div style={{ height: 4, background: meta.gradient, flexShrink: 0 }} />

      {/* Photo — click to open namecard */}
      <button
        className="aspect-square w-full overflow-hidden bg-muted shrink-0 cursor-pointer relative group/photo"
        onClick={() => onOpenCard(u)}
        title="ดูนามบัตร"
      >
        <img
          src={u.avatar_url || "/Blank-Display.png"}
          alt={u.full_name}
          className="w-full h-full object-cover object-top group-hover/photo:scale-105 transition-transform duration-500"
          onError={(e) => { (e.target as HTMLImageElement).src = "/Blank-Display.png"; }}
        />
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-white text-[10px] font-semibold bg-black/40 px-2 py-1 rounded-full">
            ดูนามบัตร
          </span>
        </div>
      </button>

      {/* Info */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <div className="text-center space-y-1">
          <h3 className="font-bold text-sm leading-tight">{u.full_name}</h3>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground leading-tight">
            {u.department || u.role}
          </p>
          {/* Role badge */}
          <span style={{
            display: "inline-block",
            fontSize: 9, fontWeight: 800,
            padding: "2px 9px", borderRadius: 20,
            background: meta.bgLight,
            color: meta.color,
          }}
            className="dark:[background:var(--badge-bg)] transition-colors"
          >
            {meta.label}
          </span>
        </div>

        <div className="border-t border-border/50" />

        {/* Contact buttons */}
        <div className="flex items-center justify-center gap-2">
          {u.tel ? (
            <a href={`tel:${u.tel}`}
              className="w-8 h-8 rounded-full bg-pink-500/10 text-pink-500 flex items-center justify-center hover:bg-pink-500 hover:text-white transition-colors"
              title={u.tel}>
              <Phone className="w-3.5 h-3.5" />
            </a>
          ) : (
            <span className="w-8 h-8 rounded-full bg-muted/40 text-muted-foreground/30 flex items-center justify-center cursor-not-allowed">
              <Phone className="w-3.5 h-3.5" />
            </span>
          )}

          {u.email ? (
            <a href={`mailto:${u.email}`}
              className="w-8 h-8 rounded-full bg-violet-500/10 text-violet-500 flex items-center justify-center hover:bg-violet-500 hover:text-white transition-colors"
              title={u.email}>
              <Mail className="w-3.5 h-3.5" />
            </a>
          ) : (
            <span className="w-8 h-8 rounded-full bg-muted/40 text-muted-foreground/30 flex items-center justify-center cursor-not-allowed">
              <Mail className="w-3.5 h-3.5" />
            </span>
          )}

          {u.line_qr_url ? (
            <button onClick={() => onOpenCard(u)}
              className="w-8 h-8 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center hover:bg-green-500 hover:text-white transition-colors"
              title="LINE QR">
              <LineIcon className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="w-8 h-8 rounded-full bg-muted/40 text-muted-foreground/30 flex items-center justify-center cursor-not-allowed">
              <LineIcon className="w-3.5 h-3.5" />
            </span>
          )}

          <button
            onClick={() => onMention(u.full_name)}
            className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
            title={`แชทกับ ${u.full_name}`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function MarketingTeam() {
  const openChat = useChatUI((s) => s.open);
  const users    = useAuth((s) => s.users);
  const [selected, setSelected] = useState<AppUser | null>(null);

  // Filter Marketing role + sort by role rank then name
  const members = useMemo(() => {
    return [...users]
      .filter((u) => u.role === "Marketing")
      .sort((a, b) => {
        const ra = ROLE_SORT.indexOf(detectRole(a));
        const rb = ROLE_SORT.indexOf(detectRole(b));
        if (ra !== rb) return ra - rb;
        return a.full_name.localeCompare(b.full_name, "th");
      });
  }, [users]);

  return (
    <>
      <style>{ANIM_CSS}</style>
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background p-6 pb-16">

        {/* ── Header ── */}
        <div className="text-center space-y-2 mb-10">
          <p className="text-[9px] font-extrabold tracking-[3px] uppercase text-muted-foreground/60">
            Standard Tour
          </p>
          <h1
            className="text-4xl sm:text-5xl tracking-tight"
            style={{ fontFamily: "'Inter','Kanit',sans-serif", fontWeight: 900 }}
          >
            Marketing{" "}
            <span className="bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 bg-clip-text text-transparent">
              Team
            </span>
          </h1>
          <p className="text-muted-foreground text-sm">บริการด้วยจิต ดูแลด้วยใจ</p>
          <p className="text-xs text-muted-foreground/50">
            ทีมงาน Marketing ทั้งหมด {members.length} คน
          </p>
        </div>

        {/* ── Legend badges ── */}
        {members.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {(["mgr","exec","cm","gd","vdo"] as RoleKey[]).map(rk => {
              const m   = ROLE_META[rk];
              const has = members.some(u => detectRole(u) === rk);
              if (!has) return null;
              return (
                <span
                  key={rk}
                  style={{ fontSize:10, fontWeight:800, padding:"3px 11px", borderRadius:20, background:m.gradient, color:"#fff" }}
                >
                  {m.label}
                </span>
              );
            })}
          </div>
        )}

        {/* ── Grid ── */}
        {members.length === 0 ? (
          <div className="max-w-lg mx-auto rounded-2xl border border-dashed p-14 text-center space-y-3">
            <p className="text-4xl">👥</p>
            <p className="font-semibold text-muted-foreground">
              ยังไม่มีสมาชิกทีม Marketing ในระบบ
            </p>
            <p className="text-xs text-muted-foreground/60">
              Admin เพิ่มพนักงานและตั้ง Role เป็น "Marketing" ได้ที่หน้า User Management
            </p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
            {members.map((u, i) => (
              <MemberCard
                key={u.user_id}
                u={u}
                delay={i * 90}
                onOpenCard={setSelected}
                onMention={(name) => openChat(name as any)}
              />
            ))}
          </div>
        )}
      </div>

      {selected && <NamecardModal u={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
