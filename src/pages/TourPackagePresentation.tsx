/**
 * TourPackagePresentation.tsx  v4
 * หน้านำเสนอ Package ทัวร์ — Dashboard Layout + Real Book Flipbook
 *
 * Layout:
 *  ┌──────────────────────────────────────────────────────────┐
 *  │  Header                                                  │
 *  ├──────────────────────────────────────────────────────────┤
 *  │  Banner Slider 1920×700  (admin-editable)                │
 *  ├──────────┬───────────────────────────────────────────────┤
 *  │ Filter   │  🔥 Highlight Program                        │
 *  │ Sidebar  │  Category sections (max 8 + show more)       │
 *  └──────────┴───────────────────────────────────────────────┘
 *
 * Flipbook: dual-page spread — left page static, right page 3D-flips
 */

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  BookOpen, Upload, Trash2, Edit3, Save, X, Plus, Tag,
  Globe2, MapPin, Clock, ChevronLeft, ChevronRight, Loader2,
  ZoomIn, ZoomOut, FileText, Image as ImageIcon, Filter,
  MessageCircle, LogIn, Star, StarOff,
  Share2, ChevronDown, ChevronUp, Settings, ImagePlus, Link2,
  SlidersHorizontal,
} from "lucide-react";
import { Link } from "react-router-dom";
import { StandaloneHeader } from "@/components/StandaloneHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useSiteSettings, type TourPackageItem, type TourPackageBanner } from "@/store/siteSettingsStore";
import { useCurrentUser } from "@/store/authStore";
import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";
import { compressImage } from "@/lib/imageCompression";
import { toast } from "sonner";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const PDFJS_CDN    = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const PRESET_CONTINENTS = ["เอเชีย", "ยุโรป", "อเมริกา", "โอเชียเนีย", "แอฟริกา", "ตะวันออกกลาง", "ในประเทศ"];
const PRESET_TOUR_TYPES = ["ครอบครัว", "Premium", "กิน เที่ยว", "Wellness", "ธรรมชาติ", "City Break", "Adventure", "Honeymoon", "บริษัท"];
const CARDS_PER_CATEGORY = 8;

const CONTINENT_COLORS: Record<string, { bg: string; text: string; border: string; emoji: string }> = {
  ยุโรป:        { bg: "bg-blue-50",    text: "text-blue-700",   border: "border-blue-200",   emoji: "🏰" },
  เอเชีย:       { bg: "bg-orange-50",  text: "text-orange-700", border: "border-orange-200", emoji: "🏯" },
  อเมริกา:      { bg: "bg-red-50",     text: "text-red-700",    border: "border-red-200",    emoji: "🗽" },
  โอเชียเนีย:   { bg: "bg-emerald-50", text: "text-emerald-700",border: "border-emerald-200",emoji: "🦘" },
  แอฟริกา:      { bg: "bg-amber-50",   text: "text-amber-700",  border: "border-amber-200",  emoji: "🦁" },
  ตะวันออกกลาง: { bg: "bg-purple-50",  text: "text-purple-700", border: "border-purple-200", emoji: "🕌" },
  ในประเทศ:     { bg: "bg-teal-50",    text: "text-teal-700",   border: "border-teal-200",   emoji: "🇹🇭" },
};

// ─────────────────────────────────────────────────────────────────────────────
// PDF.js helpers
// ─────────────────────────────────────────────────────────────────────────────

async function getPdfjsLib(): Promise<any> {
  const w = window as any;
  if (w.pdfjsLib) return w.pdfjsLib;
  return new Promise<any>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = PDFJS_CDN;
    script.onload = () => {
      const lib = w.pdfjsLib;
      if (!lib) { reject(new Error("pdfjsLib not found")); return; }
      lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      resolve(lib);
    };
    script.onerror = () => reject(new Error("Failed to load PDF.js from CDN"));
    document.head.appendChild(script);
  });
}

async function renderPdfToImages(
  url: string,
  onProgress?: (done: number, total: number) => void,
  maxPages?: number
): Promise<string[]> {
  const pdfjsLib = await getPdfjsLib();
  const pdf      = await pdfjsLib.getDocument({ url, withCredentials: false }).promise;
  const count    = maxPages ? Math.min(pdf.numPages, maxPages) : pdf.numPages;
  const pages: string[] = [];
  for (let i = 1; i <= count; i++) {
    const page     = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.8 });
    const canvas   = document.createElement("canvas");
    canvas.width   = viewport.width;
    canvas.height  = viewport.height;
    const ctx      = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport }).promise;
    pages.push(canvas.toDataURL("image/jpeg", 0.88));
    onProgress?.(i, pdf.numPages);
  }
  return pages;
}

// Cache for PDF first-page thumbnails
const pdfThumbCache = new Map<string, string>();

// ─────────────────────────────────────────────────────────────────────────────
// PdfCoverThumb — lazy-loads first page of PDF as cover
// ─────────────────────────────────────────────────────────────────────────────

function PdfCoverThumb({ pdfUrl, alt }: { pdfUrl: string; alt: string }) {
  const [src, setSrc]       = useState<string | null>(pdfThumbCache.get(pdfUrl) ?? null);
  const [loading, setLoading] = useState(!pdfThumbCache.has(pdfUrl));
  const containerRef          = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pdfThumbCache.has(pdfUrl)) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      renderPdfToImages(pdfUrl, undefined, 1)
        .then(imgs => {
          if (imgs[0]) {
            pdfThumbCache.set(pdfUrl, imgs[0]);
            setSrc(imgs[0]);
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }, { rootMargin: "300px" });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [pdfUrl]);

  return (
    <div ref={containerRef} className="w-full h-full">
      {loading && (
        <div className="w-full h-full bg-gradient-to-br from-violet-50 to-indigo-100 dark:from-violet-950/30 dark:to-indigo-950/30 flex items-center justify-center animate-pulse">
          <BookOpen className="w-10 h-10 text-violet-300" />
        </div>
      )}
      {src && (
        <img src={src} alt={alt} className="w-full h-full object-cover" draggable={false} />
      )}
      {!loading && !src && (
        <div className="w-full h-full bg-gradient-to-br from-violet-50 to-indigo-100 dark:from-violet-950/30 dark:to-indigo-950/30 flex items-center justify-center">
          <BookOpen className="w-10 h-10 text-violet-300" />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BookFlipbookModal — real dual-page book experience
// ─────────────────────────────────────────────────────────────────────────────

type FlipPhase = "idle" | "fwd" | "bwd";

function BookFlipbookModal({ pkg, onClose }: { pkg: TourPackageItem; onClose: () => void }) {
  const [pages,         setPages]      = useState<string[]>([]);
  const [loading,       setLoading]    = useState(true);
  const [loadProgress,  setProgress]   = useState(0);
  const [loadTotal,     setTotal]      = useState(0);
  const [spread,        setSpread]     = useState(0);   // current spread index
  const [flipPhase,     setFlipPhase]  = useState<FlipPhase>("idle");
  const [isAnimating,   setAnimating]  = useState(false);
  const [zoom,          setZoom]       = useState(1);
  const [isMobile,      setIsMobile]   = useState(window.innerWidth < 768);
  const [mobilePageIdx, setMobilePageIdx] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const flipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Spread calculations
  const totalSpreads = useMemo(() => Math.ceil(pages.length / 2), [pages]);
  // Page indices for each position
  const lIdx = (s: number) => s * 2;
  const rIdx = (s: number) => s * 2 + 1;
  const pg   = (i: number) => (i >= 0 && i < pages.length ? pages[i] : null);

  // During fwd animation: current right page flips to become next left page
  // During bwd animation: current left page flips back to become prev right page
  const staticLeft = flipPhase === "bwd"
    ? pg(lIdx(spread - 1))   // reveal prev left
    : pg(lIdx(spread));       // current left (stays)

  const staticRight = flipPhase === "fwd"
    ? pg(rIdx(spread + 1))   // reveal next right
    : pg(rIdx(spread));       // current right (stays)

  // The flipper face content
  const flipFrontSrc = flipPhase === "fwd"
    ? pg(rIdx(spread))        // current right page flips away
    : pg(lIdx(spread));       // current left page flips back (bwd)

  const flipBackSrc = flipPhase === "fwd"
    ? pg(lIdx(spread + 1))   // next left is revealed on back
    : pg(rIdx(spread - 1));  // prev right is revealed on back (bwd)

  // Flipper position: right half for fwd, left half for bwd
  const flipperOnRight = flipPhase !== "bwd";

  // CSS angle: fwd goes 0→-180 (around left/spine edge), bwd goes 0→+180 (around right/spine edge)
  const [flipAngle, setFlipAngle] = useState(0);

  // ── Window resize detection ──────────────────────────────────────────────
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ── Load PDF ─────────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    renderPdfToImages(pkg.pdfUrl, (done, total) => {
      setProgress(done); setTotal(total);
    })
      .then(imgs => { setPages(imgs); setLoading(false); })
      .catch(err => {
        console.error(err);
        toast.error("ไม่สามารถโหลด PDF ได้");
        setLoading(false);
      });
    return () => { flipTimeoutRef.current && clearTimeout(flipTimeoutRef.current); };
  }, [pkg.pdfUrl]);

  // ── Navigation (desktop book spread) ────────────────────────────────────
  function goNext() {
    if (isMobile) {
      setMobilePageIdx(i => Math.min(i + 1, pages.length - 1));
      return;
    }
    if (isAnimating || spread >= totalSpreads - 1) return;
    setFlipPhase("fwd");
    setFlipAngle(0);
    setAnimating(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setFlipAngle(-180));
    });
    flipTimeoutRef.current = setTimeout(() => {
      setSpread(s => s + 1);
      setFlipPhase("idle");
      setFlipAngle(0);
      setAnimating(false);
    }, 620);
  }

  function goPrev() {
    if (isMobile) {
      setMobilePageIdx(i => Math.max(i - 1, 0));
      return;
    }
    if (isAnimating || spread <= 0) return;
    setFlipPhase("bwd");
    setFlipAngle(0);
    setAnimating(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setFlipAngle(180));
    });
    flipTimeoutRef.current = setTimeout(() => {
      setSpread(s => s - 1);
      setFlipPhase("idle");
      setFlipAngle(0);
      setAnimating(false);
    }, 620);
  }

  // Touch
  function onTouchStart(e: React.TouchEvent) { touchStartX.current = e.touches[0].clientX; }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (dx < -50) goNext();
    else if (dx > 50) goPrev();
  }

  // Keyboard
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "PageDown") goNext();
      else if (e.key === "ArrowLeft" || e.key === "PageUp") goPrev();
      else if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [spread, isAnimating, isMobile, mobilePageIdx, pages.length]);

  const canPrev = isMobile ? mobilePageIdx > 0 : spread > 0;
  const canNext = isMobile ? mobilePageIdx < pages.length - 1 : spread < totalSpreads - 1;

  // ── Page thumbnail strip ─────────────────────────────────────────────────
  function goToSpread(i: number) {
    if (!isAnimating) { setSpread(i); setFlipPhase("idle"); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex flex-col" style={{ fontFamily: "inherit" }}>

      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-b from-black/80 to-transparent shrink-0 border-b border-white/10">
        <BookOpen className="w-5 h-5 text-violet-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">{pkg.title}</p>
          {pages.length > 0 && !loading && (
            <p className="text-white/50 text-xs">
              {isMobile
                ? `หน้า ${mobilePageIdx + 1} / ${pages.length}`
                : `สเปรด ${spread + 1} / ${totalSpreads} · ${pages.length} หน้า`}
            </p>
          )}
        </div>

        {/* Zoom (desktop only) */}
        {!isMobile && (
          <div className="flex items-center gap-1 bg-white/10 rounded-lg px-2 py-1">
            <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="text-white/70 hover:text-white">
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-white text-xs font-medium w-12 text-center">{(zoom * 100).toFixed(0)}%</span>
            <button onClick={() => setZoom(z => Math.min(2, z + 0.25))} className="text-white/70 hover:text-white">
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        )}

        <a
          href={pkg.pdfUrl}
          target="_blank"
          rel="noreferrer"
          className="hidden sm:flex items-center gap-1.5 text-xs text-white/70 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-all"
        >
          <FileText className="w-3.5 h-3.5" /> PDF
        </a>

        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── Book viewer ── */}
      <div
        className="flex-1 min-h-0 flex items-center justify-center relative overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white">
            <Loader2 className="w-10 h-10 animate-spin text-violet-400" />
            <div className="text-center">
              <p className="font-medium">กำลังโหลด PDF...</p>
              {loadTotal > 0 && (
                <>
                  <p className="text-white/60 text-sm mt-1">{loadProgress} / {loadTotal} หน้า</p>
                  <div className="w-48 h-1.5 bg-white/20 rounded-full mt-2 mx-auto overflow-hidden">
                    <div
                      className="h-full bg-violet-500 rounded-full transition-all"
                      style={{ width: `${(loadProgress / loadTotal) * 100}%` }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {!loading && pages.length === 0 && (
          <div className="text-center text-white/50 space-y-2">
            <FileText className="w-16 h-16 mx-auto opacity-30" />
            <p>ไม่สามารถโหลดหน้า PDF ได้</p>
            <a href={pkg.pdfUrl} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm" className="text-white border-white/30 hover:bg-white/10 mt-2">
                เปิดในแท็บใหม่
              </Button>
            </a>
          </div>
        )}

        {!loading && pages.length > 0 && (
          <div className="flex items-center gap-3 sm:gap-6 h-full py-4 px-2 sm:px-6">

            {/* Prev button */}
            <button
              onClick={goPrev}
              disabled={!canPrev || isAnimating}
              className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-all disabled:opacity-20 z-10"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* ── Book spread ── */}
            <div
              className="flex-1 flex items-center justify-center overflow-hidden"
              style={{ perspective: "2400px" }}
            >
              <div
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: "center center",
                  transition: "transform 0.2s",
                }}
              >
                {/* MOBILE: single page */}
                {isMobile && (
                  <div className="relative shadow-2xl rounded-sm overflow-hidden"
                    style={{ filter: "drop-shadow(0 20px 50px rgba(0,0,0,0.8))" }}>
                    <img
                      src={pages[mobilePageIdx]}
                      alt={`หน้า ${mobilePageIdx + 1}`}
                      className="max-h-[70vh] max-w-[90vw] object-contain select-none"
                      draggable={false}
                    />
                  </div>
                )}

                {/* DESKTOP: two-page spread with real book flip */}
                {!isMobile && (
                  <div
                    className="relative flex items-stretch"
                    style={{
                      filter: "drop-shadow(0 30px 70px rgba(0,0,0,0.85))",
                      transformStyle: "preserve-3d",
                    }}
                  >
                    {/* Left page */}
                    <div
                      className="relative overflow-hidden"
                      style={{
                        background: "#f8f7f2",
                        boxShadow: "inset -8px 0 20px rgba(0,0,0,0.15), inset 4px 0 8px rgba(255,255,255,0.9)",
                      }}
                    >
                      {staticLeft ? (
                        <img
                          src={staticLeft}
                          alt="left page"
                          className="block max-h-[74vh] w-auto select-none"
                          draggable={false}
                        />
                      ) : (
                        <div
                          className="flex items-center justify-center max-h-[74vh]"
                          style={{ width: "clamp(200px, 30vw, 480px)", height: "clamp(280px, 42vw, 680px)", background: "#f0ede4" }}
                        />
                      )}
                    </div>

                    {/* Book spine */}
                    <div
                      className="shrink-0 w-[6px] sm:w-[10px] z-10"
                      style={{
                        background: "linear-gradient(to right, rgba(0,0,0,0.25), rgba(255,255,255,0.3), rgba(0,0,0,0.25))",
                        boxShadow: "0 0 8px rgba(0,0,0,0.4)",
                      }}
                    />

                    {/* Right page container (position relative for flipper) */}
                    <div className="relative" style={{ transformStyle: "preserve-3d" }}>
                      {/* Static right background (revealed after flip) */}
                      <div
                        className="overflow-hidden"
                        style={{
                          background: "#f8f7f2",
                          boxShadow: "inset 8px 0 20px rgba(0,0,0,0.12)",
                        }}
                      >
                        {staticRight ? (
                          <img
                            src={staticRight}
                            alt="right page"
                            className="block max-h-[74vh] w-auto select-none"
                            draggable={false}
                          />
                        ) : (
                          <div
                            style={{ background: "#f0ede4" }}
                            className="max-h-[74vh]"
                          />
                        )}
                      </div>

                      {/* Flipper (the page being turned) — only visible during animation */}
                      {flipPhase !== "idle" && (
                        <div
                          className="absolute inset-0"
                          style={{
                            transformStyle: "preserve-3d",
                            transformOrigin: flipperOnRight ? "left center" : "right center",
                            transform: `rotateY(${flipAngle}deg)`,
                            transition: isAnimating ? "transform 0.62s cubic-bezier(0.4, 0, 0.2, 1)" : "none",
                            zIndex: 20,
                          }}
                        >
                          {/* Front face */}
                          <div
                            className="absolute inset-0"
                            style={{
                              backfaceVisibility: "hidden",
                              background: "#f8f7f2",
                              overflow: "hidden",
                              boxShadow: flipperOnRight
                                ? "8px 0 24px rgba(0,0,0,0.2)"
                                : "-8px 0 24px rgba(0,0,0,0.2)",
                            }}
                          >
                            {flipFrontSrc && (
                              <img
                                src={flipFrontSrc}
                                alt="flip front"
                                className="block max-h-[74vh] w-auto select-none"
                                draggable={false}
                              />
                            )}
                          </div>

                          {/* Back face */}
                          <div
                            className="absolute inset-0"
                            style={{
                              backfaceVisibility: "hidden",
                              transform: "rotateY(180deg)",
                              background: "#f8f7f2",
                              overflow: "hidden",
                              boxShadow: flipperOnRight
                                ? "-8px 0 24px rgba(0,0,0,0.2)"
                                : "8px 0 24px rgba(0,0,0,0.2)",
                            }}
                          >
                            {flipBackSrc && (
                              <img
                                src={flipBackSrc}
                                alt="flip back"
                                className="block max-h-[74vh] w-auto select-none"
                                draggable={false}
                              />
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Next button */}
            <button
              onClick={goNext}
              disabled={!canNext || isAnimating}
              className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-all disabled:opacity-20 z-10"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        )}
      </div>

      {/* ── Thumbnail strip / progress ── */}
      {!loading && pages.length > 0 && (
        <div className="shrink-0 bg-black/70 border-t border-white/10 py-2 px-4 flex items-center gap-2 overflow-x-auto">
          {!isMobile && totalSpreads <= 15 ? (
            Array.from({ length: totalSpreads }).map((_, si) => (
              <button
                key={si}
                onClick={() => goToSpread(si)}
                className={`shrink-0 relative flex gap-0.5 overflow-hidden rounded transition-all border-2 ${
                  si === spread ? "border-violet-400 scale-110" : "border-transparent opacity-50 hover:opacity-100"
                }`}
                style={{ height: 48 }}
              >
                {pg(lIdx(si)) && <img src={pg(lIdx(si))!} alt="" className="h-full w-auto object-cover" />}
                {pg(rIdx(si)) && <img src={pg(rIdx(si))!} alt="" className="h-full w-auto object-cover" />}
                {!pg(lIdx(si)) && !pg(rIdx(si)) && <div className="h-full w-8 bg-white/10" />}
              </button>
            ))
          ) : (
            <div className="flex-1 flex items-center gap-3">
              <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-500 rounded-full transition-all"
                  style={{
                    width: `${isMobile
                      ? ((mobilePageIdx + 1) / pages.length) * 100
                      : ((spread + 1) / totalSpreads) * 100}%`
                  }}
                />
              </div>
              <span className="text-white/60 text-xs whitespace-nowrap">
                {isMobile
                  ? `${mobilePageIdx + 1} / ${pages.length}`
                  : `${spread + 1} / ${totalSpreads}`}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BannerSlider
// ─────────────────────────────────────────────────────────────────────────────

function BannerSlider({ banners, canEdit, onManage }: {
  banners: TourPackageBanner[];
  canEdit: boolean;
  onManage: () => void;
}) {
  const [idx, setIdx]           = useState(0);
  const [paused, setPaused]     = useState(false);
  const intervalRef             = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (banners.length <= 1 || paused) return;
    intervalRef.current = setInterval(() => setIdx(i => (i + 1) % banners.length), 5000);
    return () => { intervalRef.current && clearInterval(intervalRef.current); };
  }, [banners.length, paused]);

  if (banners.length === 0) {
    if (!canEdit) return null;
    return (
      <div
        className="relative w-full flex items-center justify-center bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-950/30 dark:to-indigo-950/30 border-b border-border/40"
        style={{ aspectRatio: "1920/700", maxHeight: "60vh" }}
      >
        <div className="text-center space-y-3">
          <ImagePlus className="w-12 h-12 mx-auto text-violet-400" />
          <p className="text-sm font-semibold text-muted-foreground">เพิ่ม Banner สำหรับหน้านี้</p>
          <Button size="sm" variant="outline" onClick={onManage} className="gap-2">
            <Settings className="w-3.5 h-3.5" /> จัดการ Banner
          </Button>
        </div>
      </div>
    );
  }

  const current = banners[idx];

  return (
    <div
      className="relative w-full overflow-hidden bg-gray-900"
      style={{ aspectRatio: "1920/700", maxHeight: "60vh" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {banners.map((b, i) => (
        <div
          key={b.id}
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: i === idx ? 1 : 0, zIndex: i === idx ? 1 : 0 }}
        >
          {b.imageUrl ? (
            <img
              src={b.imageUrl}
              alt={b.title ?? "banner"}
              className="w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-violet-800 to-indigo-900" />
          )}
          {/* Overlay for text */}
          {(b.title || b.subtitle) && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex items-end justify-start p-6 sm:p-12">
              <div className="max-w-2xl">
                {b.title && (
                  <h2 className="text-white text-2xl sm:text-4xl lg:text-5xl font-black leading-tight drop-shadow-lg">
                    {b.title}
                  </h2>
                )}
                {b.subtitle && (
                  <p className="text-white/80 text-sm sm:text-lg mt-2 drop-shadow">
                    {b.subtitle}
                  </p>
                )}
              </div>
            </div>
          )}
          {b.linkUrl && (
            <a href={b.linkUrl} target="_blank" rel="noreferrer" className="absolute inset-0 z-5" aria-label={b.title} />
          )}
        </div>
      ))}

      {/* Dots */}
      {banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`rounded-full transition-all ${i === idx
                ? "w-6 h-2 bg-white"
                : "w-2 h-2 bg-white/50 hover:bg-white/80"}`}
            />
          ))}
        </div>
      )}

      {/* Arrow nav */}
      {banners.length > 1 && (
        <>
          <button
            onClick={() => setIdx(i => (i - 1 + banners.length) % banners.length)}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center z-10 transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIdx(i => (i + 1) % banners.length)}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center z-10 transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Admin manage btn */}
      {canEdit && (
        <button
          onClick={onManage}
          className="absolute top-3 right-3 z-20 flex items-center gap-1.5 text-xs bg-black/50 hover:bg-black/70 text-white px-3 py-1.5 rounded-lg transition-all"
        >
          <Settings className="w-3 h-3" /> จัดการ Banner
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BannerManageDialog
// ─────────────────────────────────────────────────────────────────────────────

function BannerManageDialog({
  open, banners, onClose, onAdd, onUpdate, onRemove, onUploadImage,
}: {
  open: boolean;
  banners: TourPackageBanner[];
  onClose: () => void;
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<TourPackageBanner>) => void;
  onRemove: (id: string) => void;
  onUploadImage: (id: string, file: File) => void;
}) {
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImagePlus className="w-5 h-5 text-violet-500" />
            จัดการ Banner หน้าโปรแกรมทัวร์
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2 mb-3">
          ขนาดแนะนำ: <span className="font-semibold">1920 × 700 px</span>
        </p>

        <div className="space-y-3">
          {banners.map(b => (
            <div key={b.id} className="border rounded-xl overflow-hidden">
              {/* Preview */}
              <div className="relative w-full h-28 bg-muted">
                {b.imageUrl
                  ? <img src={b.imageUrl} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center text-muted-foreground text-xs">ยังไม่มีภาพ</div>
                }
                <button
                  onClick={() => fileRefs.current[b.id]?.click()}
                  className="absolute bottom-2 right-2 text-xs bg-white/90 hover:bg-white px-2.5 py-1 rounded-lg shadow font-medium gap-1 flex items-center"
                >
                  <Upload className="w-3 h-3" /> อัปโหลด
                </button>
                <input
                  ref={el => { fileRefs.current[b.id] = el; }}
                  type="file" accept="image/*" hidden
                  onChange={e => { const f = e.target.files?.[0]; if (f) onUploadImage(b.id, f); }}
                />
              </div>
              <div className="p-3 space-y-2">
                <Input
                  value={b.title ?? ""}
                  onChange={e => onUpdate(b.id, { title: e.target.value })}
                  placeholder="หัวข้อ Banner"
                />
                <Input
                  value={b.subtitle ?? ""}
                  onChange={e => onUpdate(b.id, { subtitle: e.target.value })}
                  placeholder="ซับไตเติล (ไม่บังคับ)"
                />
                <div className="flex gap-2 items-center">
                  <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <Input
                    value={b.linkUrl ?? ""}
                    onChange={e => onUpdate(b.id, { linkUrl: e.target.value })}
                    placeholder="URL เมื่อคลิก (ไม่บังคับ)"
                    className="flex-1"
                  />
                  <button
                    onClick={() => onRemove(b.id)}
                    className="text-destructive hover:bg-destructive/10 p-1.5 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          <Button variant="outline" className="w-full gap-2" onClick={onAdd}>
            <Plus className="w-4 h-4" /> เพิ่ม Banner ใหม่
          </Button>
        </div>

        <DialogFooter className="mt-4">
          <Button onClick={onClose}>เสร็จสิ้น</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FilterSidebar
// ─────────────────────────────────────────────────────────────────────────────

function FilterSidebar({
  allContinents, allTourTypes,
  activeContinents, activeTourTypes,
  onToggleContinent, onToggleTourType, onClear, hasActive,
}: {
  allContinents: string[];
  allTourTypes: string[];
  activeContinents: Set<string>;
  activeTourTypes: Set<string>;
  onToggleContinent: (v: string) => void;
  onToggleTourType: (v: string) => void;
  onClear: () => void;
  hasActive: boolean;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarContent = (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-violet-500" />
          <span className="font-bold text-sm">กรองโปรแกรม</span>
        </div>
        {hasActive && (
          <button onClick={onClear} className="text-xs text-violet-600 hover:underline flex items-center gap-1">
            <X className="w-3 h-3" /> ล้าง
          </button>
        )}
      </div>

      {allContinents.length > 0 && (
        <div>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
            <Globe2 className="w-3 h-3" /> ทวีป
          </p>
          <div className="flex flex-col gap-1.5">
            {allContinents.map(c => {
              const clr = CONTINENT_COLORS[c];
              const active = activeContinents.has(c);
              return (
                <button
                  key={c}
                  onClick={() => onToggleContinent(c)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                    active
                      ? "bg-violet-600 text-white shadow-sm"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  <span>{clr?.emoji ?? "🌍"}</span>
                  <span className="flex-1 truncate">{c}</span>
                  {active && <X className="w-3 h-3 shrink-0 opacity-70" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {allTourTypes.length > 0 && (
        <div>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
            <Tag className="w-3 h-3" /> ประเภททัวร์
          </p>
          <div className="flex flex-wrap gap-1.5">
            {allTourTypes.map(t => (
              <button
                key={t}
                onClick={() => onToggleTourType(t)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                  activeTourTypes.has(t)
                    ? "bg-violet-600 text-white border-violet-600"
                    : "bg-background text-muted-foreground border-border hover:border-violet-400 hover:text-violet-600"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile filter toggle */}
      <div className="lg:hidden mb-4">
        <button
          onClick={() => setMobileOpen(o => !o)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border bg-card shadow-sm text-sm font-medium"
        >
          <Filter className="w-4 h-4 text-violet-500" />
          กรองโปรแกรม
          {hasActive && (
            <span className="ml-1 w-5 h-5 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center">
              {activeContinents.size + activeTourTypes.size}
            </span>
          )}
          {mobileOpen ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
        </button>
        {mobileOpen && (
          <div className="mt-2 p-4 rounded-xl border bg-card shadow-md">
            {sidebarContent}
          </div>
        )}
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-56 xl:w-64 shrink-0 self-start sticky top-4">
        <div className="rounded-2xl border bg-card shadow-sm p-4">
          {sidebarContent}
        </div>
      </aside>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PackageCard — 1:1 cover, share button, highlight toggle
// ─────────────────────────────────────────────────────────────────────────────

function PackageCard({
  pkg, canEdit, onOpen, onEdit, onDelete, onUploadCover, onToggleHighlight,
}: {
  pkg: TourPackageItem;
  canEdit: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onUploadCover: () => void;
  onToggleHighlight: () => void;
}) {
  const clr = CONTINENT_COLORS[pkg.continent] ?? { bg: "bg-muted", text: "text-muted-foreground", border: "border-border", emoji: "🌍" };

  async function handleShare() {
    const shareUrl = `${window.location.origin}/tour-packages?pkg=${pkg.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: pkg.title, text: `${pkg.title} — Standard Tour`, url: shareUrl });
        return;
      } catch (_) { /* user cancelled */ }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("คัดลอกลิงก์แล้ว ✅");
    } catch {
      toast.info(shareUrl);
    }
  }

  return (
    <article className="group bg-card rounded-2xl border shadow-sm overflow-hidden flex flex-col hover:shadow-lg transition-all hover:-translate-y-0.5">
      {/* Cover 1:1 */}
      <div className="relative aspect-square bg-muted/30 overflow-hidden">
        {pkg.coverUrl ? (
          <img
            src={pkg.coverUrl}
            alt={pkg.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <PdfCoverThumb pdfUrl={pkg.pdfUrl} alt={pkg.title} />
        )}

        {/* Continent badge */}
        <div className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${clr.bg} ${clr.text} border ${clr.border}`}>
          {clr.emoji} {pkg.continent}
        </div>

        {/* Highlight badge */}
        {pkg.isHighlight && (
          <div className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-amber-900 border border-amber-300">
            🔥 Highlight
          </div>
        )}

        {/* Hover overlay actions */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-end justify-end p-2 gap-1 opacity-0 group-hover:opacity-100">
          {canEdit && (
            <>
              <button
                onClick={onUploadCover}
                title="เปลี่ยนภาพปก"
                className="w-8 h-8 rounded-full bg-white/90 text-violet-600 flex items-center justify-center shadow hover:bg-white transition-all"
              >
                <ImageIcon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onToggleHighlight}
                title={pkg.isHighlight ? "ยกเลิก Highlight" : "ตั้งเป็น Highlight"}
                className={`w-8 h-8 rounded-full flex items-center justify-center shadow transition-all ${
                  pkg.isHighlight ? "bg-amber-400 text-amber-900" : "bg-white/90 text-amber-500 hover:bg-white"
                }`}
              >
                {pkg.isHighlight ? <StarOff className="w-3.5 h-3.5" /> : <Star className="w-3.5 h-3.5" />}
              </button>
            </>
          )}
          <button
            onClick={handleShare}
            title="แชร์โปรแกรม"
            className="w-8 h-8 rounded-full bg-white/90 text-foreground flex items-center justify-center shadow hover:bg-white transition-all"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4 flex-1 flex flex-col gap-1.5">
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <MapPin className="w-3 h-3 shrink-0 text-violet-400" />
          <span className="truncate">{[pkg.country, pkg.city].filter(Boolean).join(" · ") || "—"}</span>
        </div>

        <h3 className="font-bold text-sm leading-snug line-clamp-2 flex-1">{pkg.title}</h3>

        {pkg.duration && (
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="w-3 h-3 text-amber-500 shrink-0" />
            <span>{pkg.duration}</span>
          </div>
        )}

        {pkg.tourTypes.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {pkg.tourTypes.slice(0, 3).map(tag => (
              <span key={tag} className="text-[10px] font-medium px-1.5 py-0.5 bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 rounded-full border border-violet-100 dark:border-violet-800">
                {tag}
              </span>
            ))}
            {pkg.tourTypes.length > 3 && (
              <span className="text-[10px] text-muted-foreground">+{pkg.tourTypes.length - 3}</span>
            )}
          </div>
        )}

        <div className="mt-auto pt-2 flex gap-1.5">
          <Button
            onClick={onOpen}
            size="sm"
            className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700 gap-1 h-8 text-xs"
          >
            <BookOpen className="w-3.5 h-3.5" /> เปิดอ่าน
          </Button>
          <button
            onClick={handleShare}
            className="w-8 h-8 rounded-lg border bg-background hover:bg-muted flex items-center justify-center transition-colors shrink-0"
            title="แชร์"
          >
            <Share2 className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          {canEdit && (
            <>
              <button onClick={onEdit} className="w-8 h-8 rounded-lg border bg-background hover:bg-muted flex items-center justify-center transition-colors shrink-0" title="แก้ไข">
                <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <button onClick={onDelete} className="w-8 h-8 rounded-lg border bg-background hover:bg-destructive/10 flex items-center justify-center transition-colors shrink-0" title="ลบ">
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CategorySection — max 8 cards + show more
// ─────────────────────────────────────────────────────────────────────────────

function CategorySection({
  title, emoji, packages, canEdit, onOpen, onEdit, onDelete, onUploadCover, onToggleHighlight,
}: {
  title: string;
  emoji: string;
  packages: TourPackageItem[];
  canEdit: boolean;
  onOpen: (pkg: TourPackageItem) => void;
  onEdit: (pkg: TourPackageItem) => void;
  onDelete: (pkg: TourPackageItem) => void;
  onUploadCover: (id: string, file: File) => void;
  onToggleHighlight: (pkg: TourPackageItem) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? packages : packages.slice(0, CARDS_PER_CATEGORY);
  const hasMore = packages.length > CARDS_PER_CATEGORY;
  const coverRefs = useRef<Record<string, HTMLInputElement | null>>({});

  return (
    <section className="mb-10">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">{emoji}</span>
        <h2 className="text-lg font-black tracking-tight">{title}</h2>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-medium">
          {packages.length} โปรแกรม
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-4">
        {shown.map(pkg => (
          <div key={pkg.id}>
            <input
              ref={el => { coverRefs.current[pkg.id] = el; }}
              type="file" accept="image/*" hidden
              onChange={e => { const f = e.target.files?.[0]; if (f) onUploadCover(pkg.id, f); }}
            />
            <PackageCard
              pkg={pkg}
              canEdit={canEdit}
              onOpen={() => onOpen(pkg)}
              onEdit={() => onEdit(pkg)}
              onDelete={() => onDelete(pkg)}
              onUploadCover={() => coverRefs.current[pkg.id]?.click()}
              onToggleHighlight={() => onToggleHighlight(pkg)}
            />
          </div>
        ))}
      </div>
      {hasMore && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setExpanded(e => !e)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-violet-600 hover:text-violet-700 border border-violet-200 hover:border-violet-400 bg-violet-50 hover:bg-violet-100 px-5 py-2 rounded-full transition-all"
          >
            {expanded ? (
              <><ChevronUp className="w-4 h-4" /> แสดงน้อยลง</>
            ) : (
              <><ChevronDown className="w-4 h-4" /> ดูเพิ่มเติม {packages.length - CARDS_PER_CATEGORY} โปรแกรม</>
            )}
          </button>
        </div>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AddEditDialog
// ─────────────────────────────────────────────────────────────────────────────

type FormData = Omit<TourPackageItem, "id" | "uploadedAt" | "pdfUrl" | "pdfName" | "coverUrl" | "isHighlight">;

const EMPTY_FORM: FormData = {
  title: "", duration: "", continent: "", country: "", city: "", tourTypes: [], description: "",
};

function AddEditDialog({
  open, editItem, onClose, onSave,
}: {
  open: boolean;
  editItem: TourPackageItem | null;
  onClose: () => void;
  onSave: (data: FormData) => void;
}) {
  const [form, setForm]         = useState<FormData>(EMPTY_FORM);
  const [typeInput, setTypeInput] = useState("");

  useEffect(() => {
    if (editItem) {
      setForm({
        title: editItem.title, duration: editItem.duration,
        continent: editItem.continent, country: editItem.country,
        city: editItem.city, tourTypes: editItem.tourTypes,
        description: editItem.description ?? "",
      });
    } else setForm(EMPTY_FORM);
    setTypeInput("");
  }, [editItem, open]);

  function addType(t: string) {
    const v = t.trim();
    if (!v || form.tourTypes.includes(v)) return;
    setForm(f => ({ ...f, tourTypes: [...f.tourTypes, v] }));
    setTypeInput("");
  }
  function removeType(t: string) {
    setForm(f => ({ ...f, tourTypes: f.tourTypes.filter(x => x !== t) }));
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{editItem ? "แก้ไข Package ทัวร์" : "เพิ่ม Package ทัวร์ใหม่"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>ชื่อโปรแกรมทัวร์ *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="เช่น ยุโรป 6 ประเทศ สวิส ฝรั่งเศส" />
            </div>
            <div>
              <Label>ระยะเวลา</Label>
              <Input value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} placeholder="6 วัน 4 คืน" />
            </div>
            <div>
              <Label>ทวีป *</Label>
              <select
                value={form.continent}
                onChange={e => setForm(f => ({ ...f, continent: e.target.value }))}
                className="w-full h-9 rounded-md border bg-background px-3 text-sm"
              >
                <option value="">-- เลือกทวีป --</option>
                {PRESET_CONTINENTS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <Label>ประเทศ</Label>
              <Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} placeholder="ญี่ปุ่น, สวิตเซอร์แลนด์..." />
            </div>
            <div>
              <Label>เมือง / จุดเด่น</Label>
              <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="โตเกียว, เซอร์แมท..." />
            </div>
          </div>
          <div>
            <Label>ประเภททัวร์</Label>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {PRESET_TOUR_TYPES.map(t => (
                <button key={t} type="button"
                  onClick={() => form.tourTypes.includes(t) ? removeType(t) : addType(t)}
                  className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition-all ${
                    form.tourTypes.includes(t)
                      ? "bg-violet-600 text-white border-violet-600"
                      : "bg-background text-muted-foreground border-border hover:border-violet-400"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5 mt-2">
              <Input
                value={typeInput}
                onChange={e => setTypeInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addType(typeInput); } }}
                placeholder="พิมพ์ประเภทเพิ่มเติม..."
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => addType(typeInput)}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {form.tourTypes.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {form.tourTypes.map(t => (
                  <span key={t} className="text-[11px] bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded-full flex items-center gap-1 border border-violet-200 dark:border-violet-700">
                    {t}
                    <button onClick={() => removeType(t)} className="hover:text-red-500"><X className="w-2.5 h-2.5" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div>
            <Label>คำอธิบายเพิ่มเติม</Label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full mt-1 rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-400"
              placeholder="ไฮไลต์ หรือรายละเอียดย่อ..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>ยกเลิก</Button>
          <Button
            className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
            onClick={() => onSave(form)}
            disabled={!form.title || !form.continent}
          >
            <Save className="w-4 h-4 mr-1" /> บันทึก
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PublicHeader
// ─────────────────────────────────────────────────────────────────────────────

function PublicHeader({ lineUrl }: { lineUrl?: string }) {
  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-background/80 backdrop-blur-md border-b border-border/60 shadow-sm">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full overflow-hidden shadow-md shrink-0 border border-border/40">
          <img
            src="/logo-icon.png" alt="Standard Tour"
            className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).src = "/logo-icon.svg"; }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-sm sm:text-base leading-tight">Standard Tour</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground leading-none">โปรแกรมทัวร์ &amp; E-Booklet</p>
        </div>
        {lineUrl && (
          <a
            href={lineUrl} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-[#06C755] text-white hover:bg-[#05b34c] transition-colors shrink-0 shadow-sm"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">สอบถาม LINE</span>
            <span className="sm:hidden">LINE</span>
          </a>
        )}
        <Link to="/login" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 px-2 py-1 rounded-lg hover:bg-muted" title="Staff">
          <LogIn className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Staff</span>
        </Link>
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function TourPackagePresentation() {
  const settings  = useSiteSettings();
  const user      = useCurrentUser();
  const canEdit   = !!user;

  const packages         = settings.tourPackages ?? [];
  const tourPackageBanners = settings.tourPackageBanners ?? [];

  // ── State ──────────────────────────────────────────────────────────────────
  const [flipbookPkg, setFlipbookPkg]     = useState<TourPackageItem | null>(null);
  const [editPkg,     setEditPkg]         = useState<TourPackageItem | null>(null);
  const [pendingAddOpen, setPendingAddOpen] = useState(false);
  const [pendingPdf,  setPendingPdf]      = useState<{ url: string; name: string } | null>(null);
  const [bannerMgrOpen, setBannerMgrOpen] = useState(false);
  const [uploadingPdf, setUploadingPdf]   = useState(false);
  const [uploadingCoverId, setUploadingCoverId] = useState<string | null>(null);

  // Filters
  const [activeContinents, setActiveContinents] = useState<Set<string>>(new Set());
  const [activeTourTypes,  setActiveTourTypes]  = useState<Set<string>>(new Set());

  // Upload refs
  const pdfRef             = useRef<HTMLInputElement>(null);
  const highlightCoverRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // ── Filter options ─────────────────────────────────────────────────────────
  const allContinents = useMemo(() => [...new Set(packages.map(p => p.continent).filter(Boolean))].sort(), [packages]);
  const allTourTypes  = useMemo(() => [...new Set(packages.flatMap(p => p.tourTypes))].sort(), [packages]);

  // ── Filtered packages ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return packages.filter(pkg => {
      if (activeContinents.size > 0 && !activeContinents.has(pkg.continent)) return false;
      if (activeTourTypes.size  > 0 && !pkg.tourTypes.some(t => activeTourTypes.has(t))) return false;
      return true;
    });
  }, [packages, activeContinents, activeTourTypes]);

  // ── Highlight packages ─────────────────────────────────────────────────────
  const highlightPkgs = useMemo(() => filtered.filter(p => p.isHighlight), [filtered]);

  // ── Group by continent ─────────────────────────────────────────────────────
  const byContinent = useMemo(() => {
    const map: Record<string, TourPackageItem[]> = {};
    for (const pkg of filtered) {
      if (!map[pkg.continent]) map[pkg.continent] = [];
      map[pkg.continent].push(pkg);
    }
    return map;
  }, [filtered]);

  const hasActiveFilter = activeContinents.size + activeTourTypes.size > 0;

  function toggleContinent(v: string) {
    setActiveContinents(prev => { const n = new Set(prev); n.has(v) ? n.delete(v) : n.add(v); return n; });
  }
  function toggleTourType(v: string) {
    setActiveTourTypes(prev => { const n = new Set(prev); n.has(v) ? n.delete(v) : n.add(v); return n; });
  }
  function clearAllFilters() {
    setActiveContinents(new Set()); setActiveTourTypes(new Set());
  }

  // ── Upload PDF ─────────────────────────────────────────────────────────────
  async function handlePdfUpload(file: File | null) {
    if (!file) return;
    if (file.type !== "application/pdf") { toast.error("กรุณาเลือกไฟล์ PDF เท่านั้น"); return; }
    if (!SUPABASE_ENABLED || !supabase) { toast.error("ต้องเชื่อมต่อ Supabase"); return; }
    setUploadingPdf(true);
    try {
      const safeName = file.name.replace(/[^\w.\-]/g, "_");
      const path     = `tour-packages/${Date.now()}-${safeName}`;
      const { data, error } = await supabase.storage.from("presentations").upload(path, file, { contentType: "application/pdf", upsert: false });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("presentations").getPublicUrl(data.path);
      setPendingPdf({ url: urlData.publicUrl, name: file.name });
      setPendingAddOpen(true);
      toast.success("อัปโหลด PDF สำเร็จ — กรอกรายละเอียด");
    } catch (e: any) {
      toast.error(`อัปโหลดล้มเหลว: ${e?.message ?? ""}`);
    } finally {
      setUploadingPdf(false);
      if (pdfRef.current) pdfRef.current.value = "";
    }
  }

  // ── Upload Cover ───────────────────────────────────────────────────────────
  async function handleCoverUpload(id: string, file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("กรุณาเลือกไฟล์รูปภาพ"); return; }
    if (!SUPABASE_ENABLED || !supabase) { toast.error("ต้องเชื่อมต่อ Supabase"); return; }
    setUploadingCoverId(id);
    try {
      const compressed = await compressImage(file, { maxWidth: 1200, maxSizeKB: 400 });
      const blob       = await fetch(compressed.dataUrl).then(r => r.blob());
      const coverFile  = new File([blob], `cover-pkg-${id}.jpg`, { type: "image/jpeg" });
      const path       = `tour-covers/${Date.now()}-${coverFile.name}`;
      const { data, error } = await supabase.storage.from("presentations").upload(path, coverFile, { contentType: "image/jpeg", upsert: false });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("presentations").getPublicUrl(data.path);
      settings.updateTourPackage(id, { coverUrl: urlData.publicUrl });
      toast.success("อัปโหลดภาพปกสำเร็จ");
    } catch (e: any) {
      toast.error(`อัปโหลดปกล้มเหลว: ${e?.message ?? ""}`);
    } finally {
      setUploadingCoverId(null);
    }
  }

  // ── Banner upload ──────────────────────────────────────────────────────────
  async function handleBannerImageUpload(id: string, file: File) {
    if (!SUPABASE_ENABLED || !supabase) { toast.error("ต้องเชื่อมต่อ Supabase"); return; }
    try {
      const compressed = await compressImage(file, { maxWidth: 1920, maxSizeKB: 800 });
      const blob       = await fetch(compressed.dataUrl).then(r => r.blob());
      const bannerFile = new File([blob], `tour-banner-${id}.jpg`, { type: "image/jpeg" });
      const path       = `tour-banners/${Date.now()}-${bannerFile.name}`;
      const { data, error } = await supabase.storage.from("presentations").upload(path, bannerFile, { contentType: "image/jpeg", upsert: false });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("presentations").getPublicUrl(data.path);
      settings.updateTourPackageBanner(id, { imageUrl: urlData.publicUrl });
      toast.success("อัปโหลด Banner สำเร็จ");
    } catch (e: any) {
      toast.error(`อัปโหลด Banner ล้มเหลว: ${e?.message ?? ""}`);
    }
  }

  // ── Save (add/edit) ────────────────────────────────────────────────────────
  function handleSave(data: FormData) {
    if (editPkg) {
      settings.updateTourPackage(editPkg.id, data);
      toast.success("แก้ไขข้อมูลแล้ว ✅");
      setEditPkg(null);
    } else if (pendingPdf) {
      const newPkg: TourPackageItem = {
        id: `pkg-${Date.now()}`,
        ...data,
        pdfUrl: pendingPdf.url,
        pdfName: pendingPdf.name,
        uploadedAt: new Date().toISOString(),
      };
      settings.addTourPackage(newPkg);
      toast.success(`เพิ่ม "${data.title}" แล้ว ✅`);
      setPendingPdf(null);
      setPendingAddOpen(false);
    }
  }

  function handleDelete(pkg: TourPackageItem) {
    if (!confirm(`ลบ "${pkg.title}" ?`)) return;
    settings.removeTourPackage(pkg.id);
    toast.success("ลบ Package แล้ว");
  }

  function handleToggleHighlight(pkg: TourPackageItem) {
    settings.updateTourPackage(pkg.id, { isHighlight: !pkg.isHighlight });
    toast.success(pkg.isHighlight ? "ยกเลิก Highlight แล้ว" : "ตั้งเป็น Highlight แล้ว 🔥");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">

      {/* ── Header ── */}
      {user ? (
        <StandaloneHeader backTo="/tour-presentation" />
      ) : (
        <PublicHeader lineUrl={settings.lineUrl} />
      )}

      {/* ── Banner Slider ── */}
      <BannerSlider
        banners={tourPackageBanners}
        canEdit={canEdit}
        onManage={() => setBannerMgrOpen(true)}
      />

      {/* ── Staff upload button ── */}
      {canEdit && (
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 pt-5 flex flex-wrap items-center gap-3">
          <Button
            onClick={() => pdfRef.current?.click()}
            disabled={uploadingPdf}
            className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700 h-9"
            size="sm"
          >
            <Upload className="w-4 h-4" />
            {uploadingPdf ? "กำลังอัปโหลด..." : "+ เพิ่ม Package ทัวร์ (PDF)"}
          </Button>
          <input ref={pdfRef} type="file" accept="application/pdf" hidden onChange={e => handlePdfUpload(e.target.files?.[0] ?? null)} />
          {hasActiveFilter && (
            <span className="text-sm text-muted-foreground">
              แสดง <span className="font-bold text-foreground">{filtered.length}</span> จาก {packages.length} โปรแกรม
            </span>
          )}
        </div>
      )}

      {/* ── Main layout: sidebar + content ── */}
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 pt-6 pb-16 flex gap-6 lg:gap-8 items-start">

        {/* Left sidebar */}
        {packages.length > 0 && (
          <FilterSidebar
            allContinents={allContinents}
            allTourTypes={allTourTypes}
            activeContinents={activeContinents}
            activeTourTypes={activeTourTypes}
            onToggleContinent={toggleContinent}
            onToggleTourType={toggleTourType}
            onClear={clearAllFilters}
            hasActive={hasActiveFilter}
          />
        )}

        {/* Content */}
        <main className="flex-1 min-w-0">

          {packages.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed p-16 text-center bg-card/50">
              <BookOpen className="w-16 h-16 mx-auto text-muted-foreground/40 mb-4" />
              <p className="font-semibold text-lg">ยังไม่มีโปรแกรมทัวร์</p>
              <p className="text-sm text-muted-foreground mt-1">
                {canEdit ? "กดปุ่ม '+ เพิ่ม Package ทัวร์' เพื่อเริ่มอัปโหลดไฟล์ PDF" : "ระบบจะแสดงโปรแกรมทัวร์ที่นี่"}
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border p-12 text-center bg-card/50">
              <Filter className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="font-medium">ไม่มีโปรแกรมที่ตรงกับ Filter ที่เลือก</p>
              <button onClick={clearAllFilters} className="text-violet-600 text-sm mt-2 hover:underline">
                ล้าง Filter ทั้งหมด
              </button>
            </div>
          ) : (
            <>
              {/* ── Highlight section ── */}
              {highlightPkgs.length > 0 && (
                <section className="mb-10">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">🔥</span>
                    <h2 className="text-lg font-black tracking-tight">Highlight Program</h2>
                    <span className="text-xs text-muted-foreground bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                      {highlightPkgs.length} โปรแกรม
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-4">
                    {highlightPkgs.map(pkg => (
                      <div key={pkg.id}>
                        <input
                          ref={el => { highlightCoverRefs.current[pkg.id] = el; }}
                          type="file" accept="image/*" hidden
                          onChange={e => handleCoverUpload(pkg.id, e.target.files?.[0] ?? null)}
                        />
                        <PackageCard
                          pkg={pkg}
                          canEdit={canEdit}
                          onOpen={() => setFlipbookPkg(pkg)}
                          onEdit={() => setEditPkg(pkg)}
                          onDelete={() => handleDelete(pkg)}
                          onUploadCover={() => highlightCoverRefs.current[pkg.id]?.click()}
                          onToggleHighlight={() => handleToggleHighlight(pkg)}
                        />
                      </div>
                    ))}
                  </div>
                  <hr className="mt-8 border-border/50" />
                </section>
              )}

              {/* ── Category sections ── */}
              {Object.entries(byContinent).map(([continent, pkgs]) => (
                <CategorySection
                  key={continent}
                  title={continent}
                  emoji={CONTINENT_COLORS[continent]?.emoji ?? "🌍"}
                  packages={pkgs}
                  canEdit={canEdit}
                  onOpen={setFlipbookPkg}
                  onEdit={setEditPkg}
                  onDelete={handleDelete}
                  onUploadCover={(id, file) => handleCoverUpload(id, file)}
                  onToggleHighlight={handleToggleHighlight}
                />
              ))}
            </>
          )}
        </main>
      </div>

      {/* ── Flipbook Modal ── */}
      {flipbookPkg && (
        <BookFlipbookModal pkg={flipbookPkg} onClose={() => setFlipbookPkg(null)} />
      )}

      {/* ── Add/Edit Dialog ── */}
      <AddEditDialog
        open={pendingAddOpen || !!editPkg}
        editItem={editPkg}
        onClose={() => { setEditPkg(null); setPendingPdf(null); setPendingAddOpen(false); }}
        onSave={handleSave}
      />

      {/* ── Banner Manager Dialog ── */}
      <BannerManageDialog
        open={bannerMgrOpen}
        banners={tourPackageBanners}
        onClose={() => setBannerMgrOpen(false)}
        onAdd={() => settings.addTourPackageBanner({ id: `tb-${Date.now()}`, imageUrl: "", title: "", subtitle: "" })}
        onUpdate={(id, patch) => settings.updateTourPackageBanner(id, patch)}
        onRemove={id => settings.removeTourPackageBanner(id)}
        onUploadImage={handleBannerImageUpload}
      />
    </div>
  );
}
