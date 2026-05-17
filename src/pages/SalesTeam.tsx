import { useMemo, useRef, useState } from "react";
import { Phone, Mail, MessageCircle, Download, QrCode, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import { useAuth, type AppRole, type AppUser } from "@/store/authStore";
import { useSiteSettings } from "@/store/siteSettingsStore";
import { useChatUI } from "@/components/ChatWidget";
import { StandaloneHeader } from "@/components/StandaloneHeader";
import { toast } from "sonner";

const COMPANY_NAME = "บริษัท สแตนดาร์ดทัวร์ จำกัด";

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

/* ── Namecard Popup (3:4) ── */
interface NamecardModalProps {
  u: AppUser;
  onClose: () => void;
}

function NamecardModal({ u, onClose }: NamecardModalProps) {
  const settings = useSiteSettings();
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const vCard = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${u.full_name}`,
    `ORG:${COMPANY_NAME}`,
    `TITLE:${u.department ?? u.role}`,
    u.tel ? `TEL;TYPE=cell:${u.tel}` : "",
    u.email ? `EMAIL:${u.email}` : "",
    settings.hqAddress ? `ADR:;;${settings.hqAddress};;;;TH` : "",
    `URL:https://www.standardtour.com`,
    "END:VCARD",
  ].filter(Boolean).join("\n");

  const downloadCard = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 3,
        backgroundColor: "#ffffff",
      });
      const a = document.createElement("a");
      a.download = `${u.full_name}_namecard.png`;
      a.href = dataUrl;
      a.click();
      toast.success("ดาวน์โหลดนามบัตรเรียบร้อย");
    } catch (e) {
      console.error(e);
      toast.error("ดาวน์โหลดไม่สำเร็จ");
    } finally {
      setDownloading(false);
    }
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-xs sm:max-w-sm flex flex-col gap-3">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center text-gray-600 hover:text-gray-900 hover:scale-110 transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* ── Namecard 3:4 ── */}
        <div
          ref={cardRef}
          className="relative w-full bg-white text-gray-900 rounded-2xl overflow-hidden shadow-2xl"
          style={{ aspectRatio: "3 / 4" }}
        >
          {/* Top gradient stripe */}
          <div className="absolute top-0 left-0 right-0 h-2.5 bg-gradient-to-r from-fuchsia-600 via-purple-600 to-rose-500" />

          {/* Content */}
          <div className="h-full flex flex-col items-center px-5 pt-8 pb-4">
            {/* Avatar */}
            <div className="mb-3 mt-1">
              <img
                src={u.avatar_url || "/Blank-Display.png"}
                alt={u.full_name}
                className="w-24 h-24 rounded-full object-cover object-top border-4 border-white shadow-lg ring-2 ring-purple-200"
                onError={(e) => { (e.target as HTMLImageElement).src = "/Blank-Display.png"; }}
              />
            </div>

            {/* Name + Position */}
            <h2 className="text-xl font-bold leading-tight text-center" style={{ fontFamily: "'Inter', sans-serif" }}>
              {u.full_name}
            </h2>
            <p className="text-xs text-gray-500 tracking-widest uppercase mt-0.5 text-center">
              {u.department || u.role}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5 text-center">{COMPANY_NAME}</p>

            {/* Divider */}
            <div className="w-full border-t border-gray-100 my-3" />

            {/* Contact */}
            <div className="w-full space-y-1.5 text-sm">
              {u.tel && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Phone className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                  <span>{u.tel}</span>
                </div>
              )}
              {u.email && (
                <div className="flex items-center gap-2 text-gray-700 overflow-hidden">
                  <Mail className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                  <span className="truncate text-xs">{u.email}</span>
                </div>
              )}
              {u.line_qr_url && (
                <div className="flex items-center gap-2 text-gray-700">
                  <LineIcon className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  <span className="text-xs">LINE</span>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="w-full border-t border-gray-100 my-3" />

            {/* QR Grid */}
            <div className="w-full grid grid-cols-2 gap-3">
              {/* VCard QR */}
              <div className="flex flex-col items-center gap-1">
                <div className="bg-white p-1.5 rounded-lg border border-gray-100 shadow-sm">
                  <QRCodeSVG
                    value={vCard}
                    size={96}
                    level="H"
                    includeMargin={false}
                  />
                </div>
                <p className="text-[10px] text-gray-400 font-medium">Contact vCard</p>
              </div>

              {/* Personal Line QR */}
              <div className="flex flex-col items-center gap-1">
                {u.line_qr_url ? (
                  <img
                    src={u.line_qr_url}
                    alt="Line QR"
                    className="w-[96px] h-[96px] rounded-lg border border-gray-100 shadow-sm object-contain bg-white p-1"
                  />
                ) : (
                  <div className="w-[96px] h-[96px] rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50">
                    <QrCode className="w-7 h-7 text-gray-300" />
                  </div>
                )}
                <p className="text-[10px] text-gray-400 font-medium">LINE QR</p>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-auto pt-2 w-full text-center">
              <p className="text-[9px] text-gray-400">www.standardtour.com</p>
            </div>
          </div>
        </div>

        {/* Download button */}
        <Button
          onClick={downloadCard}
          disabled={downloading}
          className="w-full bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white hover:opacity-90"
        >
          <Download className="w-4 h-4 mr-2" />
          {downloading ? "กำลังบันทึก..." : "ดาวน์โหลดนามบัตร"}
        </Button>
      </div>
    </div>
  );
}

/* ── Member Card ── */
interface MemberCardProps {
  u: AppUser;
  onOpenCard: (u: AppUser) => void;
  onMention: (name: string) => void;
}

function MemberCard({ u, onOpenCard, onMention }: MemberCardProps) {
  return (
    <div className="bg-card border rounded-2xl overflow-hidden shadow-soft hover:shadow-elegant hover:-translate-y-1 transition-all duration-300 group flex flex-col">
      {/* Photo — click to open namecard */}
      <button
        className="aspect-square w-full overflow-hidden bg-muted shrink-0 cursor-pointer relative"
        onClick={() => onOpenCard(u)}
        title="ดูนามบัตร"
      >
        <img
          src={u.avatar_url || "/Blank-Display.png"}
          alt={u.full_name}
          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
          onError={(e) => { (e.target as HTMLImageElement).src = "/Blank-Display.png"; }}
        />
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-white text-[10px] font-semibold bg-black/40 px-2 py-1 rounded-full">ดูนามบัตร</span>
        </div>
      </button>

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
            <button
              onClick={() => onOpenCard(u)}
              className="w-8 h-8 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center hover:bg-green-500 hover:text-white transition-colors"
              title="LINE QR"
            >
              <LineIcon className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="w-8 h-8 rounded-full bg-muted/40 text-muted-foreground/30 flex items-center justify-center cursor-not-allowed">
              <LineIcon className="w-3.5 h-3.5" />
            </span>
          )}

          {/* Chat → mention */}
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

/* ── Main Page ── */
export default function SalesTeam() {
  const openChat = useChatUI((s) => s.open);
  const users = useAuth((s) => s.users);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);

  /* Flatten all users sorted by role order, then name */
  const sortedMembers = useMemo(() => {
    return [...users].sort((a, b) => {
      const ri = ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role);
      if (ri !== 0) return ri;
      return a.full_name.localeCompare(b.full_name, "th");
    });
  }, [users]);

  const totalMembers = users.length;

  const handleMention = (name: string) => {
    // Open chat and pre-fill @mention
    openChat(name as any);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
      <StandaloneHeader backTo="/" />

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
                onOpenCard={setSelectedUser}
                onMention={handleMention}
              />
            ))}
          </div>
        )}
      </div>

      {/* Namecard modal */}
      {selectedUser && (
        <NamecardModal u={selectedUser} onClose={() => setSelectedUser(null)} />
      )}
    </div>
  );
}
