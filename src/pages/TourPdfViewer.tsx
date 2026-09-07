/**
 * TourPdfViewer.tsx
 *
 * Standalone public page at /view
 * URL params: ?pdf=<encodedUrl>&title=<encodedTitle>&pkg=<pkgId>
 *
 * Flow:
 *   1. Show PDF in fullscreen iframe with a dark header + X button
 *   2. User taps X → CTA overlay slides up
 *   3. CTA: "สนใจโปรแกรมนี้มั้ย?" + Add LINE button + ดูโปรแกรมอื่น
 *   4. Add LINE → opens LINE OA in new tab
 *   5. ดูโปรแกรมอื่น → navigate to /tour-packages
 */

import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { X, ArrowLeft, MessageCircle } from "lucide-react";

const LINE_URL = "https://line.me/R/ti/p/@standardtour";

export default function TourPdfViewer() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const pdfUrl = searchParams.get("pdf") ?? "";
  const title  = searchParams.get("title") ?? "โปรแกรมทัวร์";

  const [showCta, setShowCta] = useState(false);

  // If no PDF URL, bounce to tour packages page
  if (!pdfUrl) {
    navigate("/tour-packages", { replace: true });
    return null;
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "#0d0d0d",
      display: "flex", flexDirection: "column",
      fontFamily: "'Sarabun', 'Noto Sans Thai', sans-serif",
    }}>

      {/* ── Header ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px",
        background: "rgba(10,10,10,0.95)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        flexShrink: 0,
      }}>
        {/* Logo + title */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, overflow: "hidden" }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: "linear-gradient(135deg, #7c3aed, #5b21b6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 11 }}>ST</span>
          </div>
          <span style={{
            color: "rgba(255,255,255,0.85)", fontWeight: 600, fontSize: 13,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {title}
          </span>
        </div>

        {/* X button */}
        <button
          onClick={() => setShowCta(true)}
          aria-label="ปิด"
          style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "rgba(255,255,255,0.7)",
            flexShrink: 0,
            transition: "background 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}
          onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
        >
          <X size={17} />
        </button>
      </div>

      {/* ── PDF Viewer ── */}
      {!showCta && (
        <iframe
          src={pdfUrl}
          title={title}
          style={{ flex: 1, border: "none", background: "#f5f5f5" }}
          allow="fullscreen"
        />
      )}

      {/* ── CTA Overlay ── */}
      {showCta && (
        <div style={{
          flex: 1,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "32px 24px",
          background: "linear-gradient(160deg, #1a0a2e 0%, #0f0f1e 60%, #0a0a14 100%)",
          textAlign: "center",
        }}>

          {/* Icon circle */}
          <div style={{
            width: 80, height: 80, borderRadius: "50%",
            background: "rgba(124,58,237,0.15)",
            border: "1.5px solid rgba(124,58,237,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 24,
          }}>
            <MessageCircle size={38} color="#a78bfa" />
          </div>

          {/* Heading */}
          <h2 style={{
            color: "#fff", fontSize: 26, fontWeight: 700,
            margin: "0 0 10px 0", lineHeight: 1.3,
          }}>
            สนใจโปรแกรมนี้มั้ย?
          </h2>

          <p style={{
            color: "rgba(255,255,255,0.55)", fontSize: 15, lineHeight: 1.7,
            margin: "0 0 36px 0", maxWidth: 280,
          }}>
            ทีมงานพร้อมตอบทุกคำถาม<br />
            และจัดโปรโมชั่นพิเศษให้คุณ
          </p>

          {/* Add LINE button */}
          <button
            onClick={() => window.open(LINE_URL, "_blank", "noopener,noreferrer")}
            style={{
              width: "100%", maxWidth: 320, height: 54,
              borderRadius: 14,
              background: "#06C755",
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: 10,
              color: "#fff", fontWeight: 700, fontSize: 16,
              fontFamily: "inherit",
              marginBottom: 12,
              boxShadow: "0 6px 24px rgba(6,199,85,0.35)",
              transition: "opacity 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            {/* LINE logo SVG */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
              <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.064-.022.133-.031.199-.031.211 0 .391.09.51.25l2.444 3.317V8.108c0-.345.282-.63.626-.63.352 0 .632.285.632.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
            </svg>
            เพิ่ม LINE เพื่อสอบถาม
          </button>

          {/* Browse more */}
          <button
            onClick={() => navigate("/tour-packages")}
            style={{
              width: "100%", maxWidth: 320, height: 48,
              borderRadius: 14,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.14)",
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: 8,
              color: "rgba(255,255,255,0.7)", fontWeight: 600, fontSize: 15,
              fontFamily: "inherit",
              transition: "background 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
          >
            <ArrowLeft size={16} />
            ดูโปรแกรมทัวร์อื่น
          </button>

          {/* Branding footnote */}
          <p style={{
            color: "rgba(255,255,255,0.2)", fontSize: 11,
            margin: "28px 0 0 0",
          }}>
            Standard Tour · ท่องเที่ยวครบวงจร
          </p>
        </div>
      )}
    </div>
  );
}
