import { forwardRef } from "react";
import { Phone, Mail, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

const COMPANY_NAME = "บริษัท สแตนดาร์ดทัวร์ จำกัด";
const HQ_ADDRESS_DEFAULT = "172/8 ถนนช้างคลาน ตำบลช้างคลาน อำเภอเมือง จังหวัดเชียงใหม่ 50100";

function LineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.627.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.105.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
    </svg>
  );
}

export interface DigitalNamecardProps {
  fullName: string;
  position: string;
  avatar?: string;
  tel?: string;
  email?: string;
  lineQrUrl?: string;
  vCard: string;
  /** "day" → logo-color  |  "night" → logo-white  */
  theme?: "day" | "night";
  hqAddress?: string;
}

/**
 * Shared digital namecard — used in MyProfile & SalesTeam NamecardModal.
 * Pass a ref for html-to-image download.
 */
export const DigitalNamecard = forwardRef<HTMLDivElement, DigitalNamecardProps>(
  ({ fullName, position, avatar, tel, email, lineQrUrl, vCard, theme = "day", hqAddress }, ref) => {
    const logoSrc = "/logo-white.png";
    const logoFallback = "/logo-white.svg";
    const address = hqAddress || HQ_ADDRESS_DEFAULT;

    return (
      <div
        ref={ref}
        className="relative w-full bg-white text-gray-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        style={{ aspectRatio: "5 / 10" }}
      >
        {/* ── Gradient header with Logo ── */}
        <div className="relative flex items-center justify-center py-3 bg-gradient-to-r from-fuchsia-600 via-purple-600 to-rose-500 shrink-0">
          <img
            src={logoSrc}
            alt="Standard Tour"
            className="h-8 w-auto object-contain drop-shadow"
            onError={(e) => { (e.target as HTMLImageElement).src = logoFallback; }}
          />
        </div>

        {/* ── Main content — fills remaining height ── */}
        <div className="flex flex-col items-center px-4 pt-4 flex-1 min-h-0">

          {/* Profile photo — bigger square */}
          <div className="w-44 h-44 rounded-2xl overflow-hidden shadow-lg border-2 border-white ring-2 ring-purple-100 mb-2 shrink-0">
            <img
              src={avatar || "/Blank-Display.png"}
              alt={fullName}
              className="w-full h-full object-cover object-top"
              onError={(e) => { (e.target as HTMLImageElement).src = "/Blank-Display.png"; }}
            />
          </div>

          {/* Name */}
          <h2 className="text-[22px] font-bold leading-tight text-center text-gray-900 mb-0.5">
            {fullName}
          </h2>

          {/* Position — thin, italic, gray */}
          <p className="text-sm font-light italic text-gray-400 tracking-wider text-center mb-2">
            {position}
          </p>

          {/* ── Contact — tighter spacing ── */}
          {(tel || email || lineQrUrl) && (
            <>
              <div className="w-full border-t border-gray-100 mb-1.5" />
              <div className="flex flex-col items-center gap-1 w-full mb-1.5">
                {tel && (
                  <div className="flex items-center gap-2 text-[14px] text-gray-700">
                    <Phone className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                    <span className="font-medium">{tel}</span>
                  </div>
                )}
                {email && (
                  <div className="flex items-center gap-2 text-[12px] text-gray-700">
                    <Mail className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                    <span className="truncate max-w-[190px]">{email}</span>
                  </div>
                )}
                {lineQrUrl && (
                  <div className="flex items-center gap-2 text-[14px] text-gray-700">
                    <LineIcon className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    <span className="font-medium">LINE</span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── QR codes — side by side ── */}
          <div className="w-full border-t border-gray-100 mb-2" />
          <div className="flex items-start justify-center gap-4">
            {/* vCard QR */}
            <div className="flex flex-col items-center gap-1">
              <div className="bg-white p-1.5 rounded-xl border border-gray-100 shadow-sm">
                <QRCodeSVG value={vCard} size={105} level="H" includeMargin={false} />
              </div>
              <p className="text-[9px] text-gray-400 font-medium tracking-wide">Contact vCard</p>
            </div>

            {/* LINE QR */}
            <div className="flex flex-col items-center gap-1">
              {lineQrUrl ? (
                <img
                  src={lineQrUrl}
                  alt="LINE QR"
                  className="w-[108px] h-[108px] rounded-xl border border-gray-100 shadow-sm object-contain bg-white p-1"
                />
              ) : (
                <div className="w-[108px] h-[108px] rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50">
                  <QrCode className="w-7 h-7 text-gray-200" />
                </div>
              )}
              <p className="text-[9px] text-gray-400 font-medium tracking-wide">LINE QR</p>
            </div>
          </div>

          {/* ── Spacer — pushes footer to bottom ── */}
          <div className="flex-1" />

          {/* ── Footer — pinned to bottom ── */}
          <div className="w-full border-t border-gray-100 mb-1.5" />
          <div className="text-center space-y-0.5 pb-2">
            <p className="text-[10px] font-semibold text-gray-600">{COMPANY_NAME}</p>
            <p className="text-[8px] text-gray-400 leading-relaxed px-3 mx-auto">{address}</p>
            <p className="text-[10px] text-gray-500 font-medium">www.standardtour.com</p>
          </div>

        </div>
      </div>
    );
  }
);

DigitalNamecard.displayName = "DigitalNamecard";
