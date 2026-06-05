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
  MessageCircle, LogIn, Flame,
  Share2, ChevronDown, ChevronUp, Settings, ImagePlus, Link2,
  SlidersHorizontal, Check, Search, Maximize2, Minimize2,
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

// renderPdfToImages with page dimensions (for flipbook)
async function renderPdfToImagesWithSize(
  url: string,
  onProgress?: (done: number, total: number) => void,
): Promise<{ images: string[]; width: number; height: number }> {
  const pdfjsLib = await getPdfjsLib();
  const pdf      = await pdfjsLib.getDocument({ url, withCredentials: false }).promise;
  const images: string[] = [];
  let w = 0, h = 0;
  for (let i = 1; i <= pdf.numPages; i++) {
    const page     = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.8 });
    const canvas   = document.createElement("canvas");
    canvas.width   = viewport.width;
    canvas.height  = viewport.height;
    if (i === 1) { w = viewport.width; h = viewport.height; }
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport }).promise;
    images.push(canvas.toDataURL("image/jpeg", 0.88));
    onProgress?.(i, pdf.numPages);
  }
  return { images, width: w, height: h };
}

// Cache for PDF first-page thumbnails
const pdfThumbCache = new Map<string, string>();

// ─────────────────────────────────────────────────────────────────────────────
// Matrix utilities — ported from rematrix + matrix.coffee (flipbook-vue)
// ─────────────────────────────────────────────────────────────────────────────

type Mat4 = number[]; // 16-element column-major 4×4 matrix

const m4Id = (): Mat4 => [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];

function m4Mul(a: Mat4, b: Mat4): Mat4 {
  const r = new Array(16).fill(0);
  for (let c = 0; c < 4; c++)
    for (let rr = 0; rr < 4; rr++)
      for (let k = 0; k < 4; k++)
        r[c*4+rr] += a[k*4+rr] * b[c*4+k];
  return r;
}
const m4Persp = (d: number): Mat4 => { const m = m4Id(); m[11] = -1/d; return m; };
const m4Tr    = (x: number, y = 0): Mat4 => { const m = m4Id(); m[12] = x; m[13] = y; return m; };
const m4Tr3   = (x: number, y: number, z: number): Mat4 => { const m = m4Id(); m[12]=x; m[13]=y; m[14]=z; return m; };
const m4RotY  = (deg: number): Mat4 => {
  const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  return [c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1];
};
const m4Str  = (m: Mat4): string => `matrix3d(${m.join(',')})`;
const m4TrX  = (m: Mat4, x: number): number => (x*m[0]+m[12]) / (x*m[3]+m[15]);

class FM { // FlipMatrix
  m: Mat4;
  constructor(src?: Mat4 | FM) { this.m = src ? (src instanceof FM ? [...src.m] : [...src]) : m4Id(); }
  clone()                      { return new FM(this); }
  mul(n: Mat4)                 { this.m = m4Mul(this.m, n); return this; }
  persp(d: number)             { return this.mul(m4Persp(d)); }
  tr(x: number, y = 0)        { return this.mul(m4Tr(x, y)); }
  tr3(x: number, y: number, z: number) { return this.mul(m4Tr3(x, y, z)); }
  rotY(d: number)              { return this.mul(m4RotY(d)); }
  trX(x: number)               { return m4TrX(this.m, x); }
  str()                        { return m4Str(this.m); }
}

// Easing (from flipbook-vue)
const easeIn    = (x: number) => x * x;
const easeOut   = (x: number) => 1 - easeIn(1 - x);
const easeInOut = (x: number) => x < 0.5 ? easeIn(x*2)/2 : 0.5 + easeOut((x-0.5)*2)/2;

// ─────────────────────────────────────────────────────────────────────────────
// makePolygons + computeLighting — ported from flipbook-vue makePolygonArray
// ─────────────────────────────────────────────────────────────────────────────

interface FBPolygon {
  key:       string;
  image:     string | null;
  lighting:  string;
  bgPos:     string;
  transform: string;
  z:         number;
}

function computeLighting(rot: number, dRotate: number, ambient: number, gloss: number): string {
  const gradients: string[] = [];
  const lp = [-0.5, -0.25, 0, 0.25, 0.5];
  if (ambient < 1) {
    const bk = 1 - ambient;
    const diff = lp.map(d => (1 - Math.cos((rot - dRotate * d) / 180 * Math.PI)) * bk);
    gradients.push(`linear-gradient(to right,rgba(0,0,0,${diff[0]}),rgba(0,0,0,${diff[1]}) 25%,rgba(0,0,0,${diff[2]}) 50%,rgba(0,0,0,${diff[3]}) 75%,rgba(0,0,0,${diff[4]}))`);
  }
  if (gloss > 0) {
    const DEG = 30, POW = 200;
    const spec = lp.map(d => Math.max(
      Math.cos((rot + DEG - dRotate * d) / 180 * Math.PI) ** POW,
      Math.cos((rot - DEG - dRotate * d) / 180 * Math.PI) ** POW,
    ));
    gradients.push(`linear-gradient(to right,rgba(255,255,255,${spec[0]*gloss}),rgba(255,255,255,${spec[1]*gloss}) 25%,rgba(255,255,255,${spec[2]*gloss}) 50%,rgba(255,255,255,${spec[3]*gloss}) 75%,rgba(255,255,255,${spec[4]*gloss}))`);
  }
  return gradients.join(',');
}

function makePolygons(p: {
  face: 'front' | 'back';
  progress: number;
  direction: 'left' | 'right';
  image: string | null;
  viewW: number; pageWidth: number; pageHeight: number;
  xMargin: number; yMargin: number;
  nPolygons: number; perspective: number; ambient: number; gloss: number;
}): FBPolygon[] {
  const { face, progress, direction, image, viewW, pageWidth, pageHeight,
          xMargin, yMargin, nPolygons, perspective: persp, ambient, gloss } = p;

  // Page x position and origin side — displayedPages=2 always (desktop)
  let pageX = xMargin;
  let originRight = false;
  if (direction === 'left') {
    if (face === 'back')  pageX = viewW / 2; else originRight = true;
  } else {
    if (face === 'front') pageX = viewW / 2; else originRight = true;
  }

  // Build page-level transform matrix (perspective centred on viewport)
  const pageMat = new FM();
  pageMat.tr(viewW / 2);
  pageMat.persp(persp);
  pageMat.tr(-viewW / 2);
  pageMat.tr(pageX, yMargin);

  // Page rotation from flip progress
  let pageRotation = 0;
  if (progress > 0.5) pageRotation = -(progress - 0.5) * 2 * 180;
  if (direction === 'left') pageRotation = -pageRotation;
  if (face === 'back')      pageRotation += 180;
  if (pageRotation !== 0) {
    if (originRight) pageMat.tr(pageWidth);
    pageMat.rotY(pageRotation);
    if (originRight) pageMat.tr(-pageWidth);
  }

  // Cylinder parameters
  let theta = progress < 0.5
    ? progress * 2 * Math.PI
    : (1 - (progress - 0.5) * 2) * Math.PI;
  if (theta === 0) theta = 1e-9;
  const radius = pageWidth / theta;
  const dRadian = theta / nPolygons;

  let rotate  = dRadian / 2 / Math.PI * 180;
  let dRotate = dRadian / Math.PI * 180;
  if (originRight) rotate = -theta / Math.PI * 180 + dRotate / 2;
  if (face === 'back') { rotate = -rotate; dRotate = -dRotate; }

  const polygons: FBPolygon[] = [];
  let radian = 0;

  for (let i = 0; i < nPolygons; i++) {
    const bgPos = `${i / (nPolygons - 1) * 100}% 0px`;
    const m     = pageMat.clone();

    const rad = originRight ? theta - radian : radian;
    let x = Math.sin(rad) * radius;
    if (originRight) x = pageWidth - x;
    let z = (1 - Math.cos(rad)) * radius;
    if (face === 'back') z = -z;

    m.tr3(x, 0, z);
    m.rotY(-rotate);

    const lighting = computeLighting(pageRotation - rotate, dRotate, ambient, gloss);
    polygons.push({ key: `${face}${i}`, image, lighting, bgPos, transform: m.str(), z: Math.abs(Math.round(z)) });

    radian += dRadian;
    rotate += dRotate;
  }
  return polygons;
}

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
// BookFlipbookModal — polygon curl effect (ported from flipbook-vue)
// ─────────────────────────────────────────────────────────────────────────────

function BookFlipbookModal({ pkg, onClose }: { pkg: TourPackageItem; onClose: () => void }) {
  const [pages,         setPages]      = useState<string[]>([]);
  const [imgW,          setImgW]       = useState(0);
  const [imgH,          setImgH]       = useState(0);
  const [loading,       setLoading]    = useState(true);
  const [loadProgress,  setProgress]   = useState(0);
  const [loadTotal,     setTotal]      = useState(0);
  const [spread,        setSpread]     = useState(0);
  const [,          forceUpdate]       = useState(0);
  const [zoom,          setZoom]       = useState(1);
  const [isMobile,      setIsMobile]   = useState(window.innerWidth < 768);
  const [isFullscreen,  setIsFullscreen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const flipRef    = useRef<{
    progress:    number;
    direction:   'right' | 'left';
    frontImg:    string | null;
    backImg:     string | null;
    t0:          number;
    startSpread: number;
  } | null>(null);
  const rafRef      = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const mouseStartX = useRef<number | null>(null);
  const mouseDragging = useRef(false);

  const FLIP_MS = 1000;
  const N_POLY  = 10;
  const PERSP   = 2400;
  const AMBIENT = 0.4;
  const GLOSS   = 0.6;

  // Virtual page layout: spread 0 = [blank | cover], then pairs
  // virtual[0]=blank, virtual[i]=pages[i-1] for i>=1
  // Spread s: left=virtual[s*2], right=virtual[s*2+1]
  const totalSpreads = useMemo(() => Math.ceil((pages.length + 1) / 2), [pages]);
  const lPg = useCallback((s: number): string | null =>
    s === 0 ? null : (pages[s * 2 - 1] ?? null), [pages]);
  const rPg = useCallback((s: number): string | null =>
    pages[s * 2] ?? null, [pages]);

  // Compute display book dimensions from window size
  // Mobile: larger maxW so single pages are readable; desktop: dual-page side-by-side
  const { pageW, pageH } = useMemo(() => {
    if (imgW === 0 || imgH === 0) return { pageW: 0, pageH: 0 };
    const maxH  = window.innerHeight * (isMobile ? 0.65 : 0.72);
    const maxW  = window.innerWidth  * (isMobile ? 0.42 : 0.37);   // per-page width
    const scale = Math.min(maxH / imgH, maxW / imgW, 1);
    return { pageW: Math.floor(imgW * scale), pageH: Math.floor(imgH * scale) };
  }, [imgW, imgH, isMobile]);
  const bookW = pageW * 2;

  // Window resize + fullscreen change
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    const onFSChange = () => setIsFullscreen(!!document.fullscreenElement);
    window.addEventListener("resize", onResize);
    document.addEventListener("fullscreenchange", onFSChange);
    return () => {
      window.removeEventListener("resize", onResize);
      document.removeEventListener("fullscreenchange", onFSChange);
    };
  }, []);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      modalRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  // Load PDF
  useEffect(() => {
    setLoading(true);
    setSpread(0);
    flipRef.current = null;
    renderPdfToImagesWithSize(pkg.pdfUrl, (d, t) => { setProgress(d); setTotal(t); })
      .then(({ images, width, height }) => {
        setPages(images);
        setImgW(width);
        setImgH(height);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        toast.error("ไม่สามารถโหลด PDF ได้");
        setLoading(false);
      });
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      flipRef.current = null;
    };
  }, [pkg.pdfUrl]);

  // RAF flip animation
  function startFlip(dir: 'right' | 'left', frontImg: string | null, backImg: string | null) {
    if (flipRef.current) return;
    const startSpr = spread;
    flipRef.current = { progress: 0, direction: dir, frontImg, backImg, t0: performance.now(), startSpread: startSpr };
    const tick = (now: number) => {
      const fl = flipRef.current;
      if (!fl) return;
      fl.progress = easeInOut(Math.min((now - fl.t0) / FLIP_MS, 1));
      forceUpdate(c => c + 1);
      if (now - fl.t0 < FLIP_MS) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        const nextSpr = dir === 'right' ? startSpr + 1 : startSpr - 1;
        flipRef.current = null;
        setSpread(nextSpr);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  function goNext() {
    if (flipRef.current || spread >= totalSpreads - 1) return;
    startFlip('right', rPg(spread), lPg(spread + 1));
  }

  function goPrev() {
    if (flipRef.current || spread <= 0) return;
    startFlip('left', lPg(spread), rPg(spread - 1));
  }

  // ── Touch swipe (mobile) ──
  function onTouchStart(e: React.TouchEvent) { touchStartX.current = e.touches[0].clientX; }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (dx < -50) goNext(); else if (dx > 50) goPrev();
  }

  // ── Mouse drag (desktop) ──
  function onMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return; // left button only
    mouseStartX.current = e.clientX;
    mouseDragging.current = false;
  }
  function onMouseMove(e: React.MouseEvent) {
    if (mouseStartX.current === null) return;
    if (Math.abs(e.clientX - mouseStartX.current) > 8) mouseDragging.current = true;
  }
  function onMouseUp(e: React.MouseEvent) {
    if (mouseStartX.current === null) return;
    const dx = e.clientX - mouseStartX.current;
    mouseStartX.current = null;
    if (!mouseDragging.current) return; // was a click, not a drag
    if (dx < -50) goNext(); else if (dx > 50) goPrev();
    mouseDragging.current = false;
  }
  function onMouseLeave() {
    mouseStartX.current = null;
    mouseDragging.current = false;
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if      (e.key === "ArrowRight" || e.key === "PageDown") goNext();
      else if (e.key === "ArrowLeft"  || e.key === "PageUp")   goPrev();
      else if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [spread, pages.length, totalSpreads]);

  const canPrev = spread > 0;
  const canNext = spread < totalSpreads - 1;

  // Polygon data for this render
  const fl         = flipRef.current;
  const dispSpread = fl ? fl.startSpread : spread;

  let staticL = lPg(dispSpread);
  let staticR = rPg(dispSpread);
  if (fl) {
    if (fl.direction === 'right') staticR = rPg(dispSpread + 1);
    else                          staticL = lPg(dispSpread - 1);
  }

  const polyBase = fl && pageW > 0 ? {
    viewW: bookW, pageWidth: pageW, pageHeight: pageH,
    xMargin: 0, yMargin: 0,
    nPolygons: N_POLY, perspective: PERSP, ambient: AMBIENT, gloss: GLOSS,
    progress: fl.progress, direction: fl.direction,
  } : null;

  const allPolygons = polyBase
    ? [
        ...makePolygons({ ...polyBase, face: 'front', image: fl!.frontImg }),
        ...makePolygons({ ...polyBase, face: 'back',  image: fl!.backImg  }),
      ].sort((a, b) => a.z - b.z)
    : [];

  // Single-page (cover) vs dual-page layout
  // spread=0 idle → single page; animating or spread>0 → dual page
  const isDouble  = !!fl || spread > 0;
  const displayW  = isDouble ? bookW : pageW;
  const rightLeft = isDouble ? pageW : 0;   // x-position of right/cover page

  function goToSpread(i: number) { if (!flipRef.current) setSpread(i); }

  return (
    <div ref={modalRef} className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex flex-col">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-b from-black/80 to-transparent shrink-0 border-b border-white/10">
        <BookOpen className="w-5 h-5 text-violet-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">{pkg.title}</p>
          {pages.length > 0 && !loading && (
            <p className="text-white/50 text-xs">
              {`สเปรด ${spread + 1} / ${totalSpreads} · ${pages.length} หน้า`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 bg-white/10 rounded-lg px-2 py-1">
          <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="text-white/70 hover:text-white p-0.5">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-white text-xs font-medium w-10 text-center">{(zoom * 100).toFixed(0)}%</span>
          <button onClick={() => setZoom(z => Math.min(2, z + 0.25))} className="text-white/70 hover:text-white p-0.5">
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
        <a href={pkg.pdfUrl} target="_blank" rel="noreferrer"
          className="hidden sm:flex items-center gap-1.5 text-xs text-white/70 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-all">
          <FileText className="w-3.5 h-3.5" /> PDF
        </a>
        <button onClick={toggleFullscreen}
          className="w-8 h-8 flex items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all"
          title={isFullscreen ? "ออกจากเต็มจอ" : "เต็มจอ"}>
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
        <button onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Viewer */}
      <div
        className="flex-1 min-h-0 flex items-center justify-center relative select-none"
        style={{ cursor: mouseDragging.current ? "grabbing" : "grab" }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
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
                    <div className="h-full bg-violet-500 rounded-full transition-all"
                      style={{ width: `${(loadProgress / loadTotal) * 100}%` }} />
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
              <Button variant="outline" size="sm" className="text-white border-white/30 hover:bg-white/10 mt-2">เปิดในแท็บใหม่</Button>
            </a>
          </div>
        )}

        {!loading && pages.length > 0 && (
          <div className="flex items-center gap-3 sm:gap-4 h-full py-2 px-2 sm:px-4">

            {/* Prev */}
            <button onClick={goPrev} disabled={!canPrev || !!flipRef.current}
              className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-all disabled:opacity-20 z-10">
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Book */}
            <div className="flex-1 flex items-center justify-center overflow-hidden">
              <div style={{ transform: `scale(${zoom})`, transformOrigin: "center center", transition: "transform 0.2s" }}>

                {/* Polygon flipbook — mobile + desktop */}
                {pageW > 0 && (
                  <div style={{ filter: "drop-shadow(0 30px 70px rgba(0,0,0,0.85))" }}>
                    {/*
                      displayW = pageW  → spread 0 idle (cover only, no blank page)
                      displayW = bookW  → spread 1+ or animating (dual-page spread)
                    */}
                    <div
                      className="relative select-none"
                      style={{ width: displayW, height: pageH, background: "transparent", overflow: "visible" }}
                    >
                      {/* Left page — only in dual-page mode */}
                      {isDouble && (
                        <div
                          className="absolute left-0 top-0 overflow-hidden"
                          style={{
                            width: pageW, height: pageH,
                            background: staticL ? "#f8f7f2" : "transparent",
                            boxShadow: staticL
                              ? "inset -8px 0 20px rgba(0,0,0,0.15), inset 4px 0 8px rgba(255,255,255,0.9)"
                              : "none",
                          }}
                        >
                          {staticL && (
                            <img src={staticL} alt="L" className="w-full h-full object-cover" draggable={false} />
                          )}
                        </div>
                      )}

                      {/* Right / cover page */}
                      <div
                        className="absolute top-0 overflow-hidden"
                        style={{
                          left: rightLeft, width: pageW, height: pageH, background: "#f8f7f2",
                          boxShadow: isDouble ? "inset 8px 0 20px rgba(0,0,0,0.12)" : "none",
                        }}
                      >
                        {staticR
                          ? <img src={staticR} alt="R" className="w-full h-full object-cover" draggable={false} />
                          : <div className="w-full h-full" style={{ background: "#f2efe6" }} />}
                      </div>

                      {/* Spine — idle dual-page with both pages present */}
                      {!fl && isDouble && staticL && (
                        <div
                          className="absolute top-0 z-10 pointer-events-none"
                          style={{
                            left: pageW - 5, width: 10, height: pageH,
                            background: "linear-gradient(to right, rgba(0,0,0,0.22), rgba(255,255,255,0.28), rgba(0,0,0,0.22))",
                            boxShadow: "0 0 6px rgba(0,0,0,0.35)",
                          }}
                        />
                      )}

                      {/* Polygon flip strips — container always bookW so matrix positions are correct */}
                      {fl && pageW > 0 && (
                        <div
                          className="absolute top-0 left-0"
                          style={{ width: bookW, height: pageH, transformStyle: "preserve-3d", overflow: "visible" }}
                        >
                          {allPolygons.map(poly => (
                            <div
                              key={poly.key}
                              style={{
                                position: "absolute",
                                top: 0, left: 0,
                                width:  pageW / N_POLY,
                                height: pageH,
                                backgroundImage:    poly.image ? `url("${poly.image}")` : "none",
                                backgroundSize:     `${pageW}px ${pageH}px`,
                                backgroundPosition: poly.bgPos,
                                backgroundRepeat:   "no-repeat",
                                transform:          poly.transform,
                                transformOrigin:    "0 0",
                                backfaceVisibility: "hidden",
                                WebkitBackfaceVisibility: "hidden" as "hidden",
                                zIndex: poly.z,
                              }}
                            >
                              {poly.lighting && (
                                <div style={{
                                  position: "absolute", inset: 0,
                                  backgroundImage: poly.lighting,
                                  pointerEvents: "none",
                                }} />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Next */}
            <button onClick={goNext} disabled={!canNext || !!flipRef.current}
              className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-all disabled:opacity-20 z-10">
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      {!loading && pages.length > 0 && (
        <div className="shrink-0 bg-black/70 border-t border-white/10 py-2 px-4 flex items-center gap-2 overflow-x-auto">
          {totalSpreads <= 15 ? (
            Array.from({ length: totalSpreads }).map((_, si) => (
              <button key={si} onClick={() => goToSpread(si)}
                className={`shrink-0 relative flex gap-0.5 overflow-hidden rounded transition-all border-2 ${
                  si === spread ? "border-violet-400 scale-110" : "border-transparent opacity-50 hover:opacity-100"
                }`}
                style={{ height: 40 }}>
                {lPg(si) && <img src={lPg(si)!} alt="" className="h-full w-auto object-cover" />}
                {!lPg(si) && <div className="h-full w-5 bg-white/5" />}
                {rPg(si) && <img src={rPg(si)!} alt="" className="h-full w-auto object-cover" />}
                {!rPg(si) && <div className="h-full w-5 bg-white/5" />}
              </button>
            ))
          ) : (
            <div className="flex-1 flex items-center gap-3">
              <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-500 rounded-full transition-all"
                  style={{ width: `${((spread + 1) / totalSpreads) * 100}%` }}
                />
              </div>
              <span className="text-white/60 text-xs whitespace-nowrap">
                {`${spread + 1} / ${totalSpreads}`}
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
  const dragStartX              = useRef<number | null>(null);
  const isDragging              = useRef(false);

  useEffect(() => {
    if (banners.length <= 1 || paused) return;
    intervalRef.current = setInterval(() => setIdx(i => (i + 1) % banners.length), 5000);
    return () => { intervalRef.current && clearInterval(intervalRef.current); };
  }, [banners.length, paused]);

  const prev = () => setIdx(i => (i - 1 + banners.length) % banners.length);
  const next = () => setIdx(i => (i + 1) % banners.length);

  // Touch handlers
  const onTouchStartBanner = (e: React.TouchEvent) => { dragStartX.current = e.touches[0].clientX; };
  const onTouchEndBanner   = (e: React.TouchEvent) => {
    if (dragStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - dragStartX.current;
    if (Math.abs(dx) > 40) { dx < 0 ? next() : prev(); setPaused(false); }
    dragStartX.current = null;
  };
  // Mouse drag handlers
  const onMouseDownBanner  = (e: React.MouseEvent) => { dragStartX.current = e.clientX; isDragging.current = false; };
  const onMouseMoveBanner  = (e: React.MouseEvent) => {
    if (dragStartX.current !== null && Math.abs(e.clientX - dragStartX.current) > 5) isDragging.current = true;
  };
  const onMouseUpBanner    = (e: React.MouseEvent) => {
    if (dragStartX.current === null) return;
    const dx = e.clientX - dragStartX.current;
    if (isDragging.current && Math.abs(dx) > 40) { dx < 0 ? next() : prev(); setPaused(false); }
    dragStartX.current = null; isDragging.current = false;
  };

  if (banners.length === 0) {
    if (!canEdit) return null;
    return (
      <div
        className="relative w-full flex items-center justify-center bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-950/30 dark:to-indigo-950/30 border-b border-border/40"
        style={{ aspectRatio: "1920/700" }}
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
      className="relative w-full overflow-hidden bg-gray-900 select-none"
      style={{ aspectRatio: "1920/700", cursor: banners.length > 1 ? "grab" : "default" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={(e) => { setPaused(false); onMouseUpBanner(e); }}
      onTouchStart={onTouchStartBanner}
      onTouchEnd={onTouchEndBanner}
      onMouseDown={onMouseDownBanner}
      onMouseMove={onMouseMoveBanner}
      onMouseUp={onMouseUpBanner}
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
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center z-10 transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={next}
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
  allContinents, allTourTypes, allCountriesByContinent,
  activeContinents, activeTourTypes, activeCountries,
  onToggleContinent, onToggleTourType, onToggleCountry, onClear, hasActive,
  searchQuery, onSearchChange,
}: {
  allContinents: string[];
  allTourTypes: string[];
  allCountriesByContinent: Record<string, string[]>;
  activeContinents: Set<string>;
  activeTourTypes: Set<string>;
  activeCountries: Set<string>;
  onToggleContinent: (v: string) => void;
  onToggleTourType: (v: string) => void;
  onToggleCountry: (v: string) => void;
  onClear: () => void;
  hasActive: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const totalActive = activeContinents.size + activeTourTypes.size + activeCountries.size + (searchQuery.trim() ? 1 : 0);

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

      {/* ── Keyword Search ── */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="ค้นหา ชื่อ ประเทศ เมือง แท็ก..."
          className="w-full pl-8 pr-7 py-1.5 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-violet-400 placeholder:text-muted-foreground/60"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {allContinents.length > 0 && (
        <div>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
            <Globe2 className="w-3 h-3" /> ทวีป / ภูมิภาค
          </p>
          <div className="flex flex-col gap-1">
            {allContinents.map(c => {
              const clr        = CONTINENT_COLORS[c];
              const active     = activeContinents.has(c);
              const subItems   = allCountriesByContinent[c] ?? [];
              const hasSubItems = subItems.length > 0;
              const isInland   = c === "ในประเทศ";
              const activeSubCount = subItems.filter(s => activeCountries.has(s)).length;

              return (
                <div key={c}>
                  {/* ── Continent row ── */}
                  <button
                    onClick={() => onToggleContinent(c)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left group ${
                      active
                        ? "bg-violet-600 text-white shadow-sm"
                        : "hover:bg-muted/80 text-foreground border border-transparent hover:border-border"
                    }`}
                  >
                    {/* Emoji */}
                    <span className="shrink-0 text-base leading-none">{clr?.emoji ?? "🌍"}</span>

                    {/* Label */}
                    <span className="flex-1 truncate">{c}</span>

                    {/* Count badge — show total sub-items when not active */}
                    {!active && hasSubItems && (
                      <span className="shrink-0 text-[10px] font-semibold bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full leading-none">
                        {subItems.length}
                      </span>
                    )}

                    {/* Active sub-count badge */}
                    {active && activeSubCount > 0 && (
                      <span className="shrink-0 text-[10px] font-bold bg-white/30 text-white px-1.5 py-0.5 rounded-full leading-none">
                        {activeSubCount}/{subItems.length}
                      </span>
                    )}

                    {/* Chevron — rotates when expanded */}
                    {hasSubItems ? (
                      <ChevronDown
                        className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                          active ? "rotate-180 opacity-80" : "opacity-30 group-hover:opacity-60"
                        }`}
                      />
                    ) : (
                      active && <Check className="w-3.5 h-3.5 shrink-0 opacity-80" />
                    )}
                  </button>

                  {/* ── Sub-filter: countries / provinces (expands when active) ── */}
                  {active && hasSubItems && (
                    <div className="mt-1 mb-1.5 ml-2 rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50/60 dark:bg-violet-950/20 overflow-hidden">
                      {/* Sub-header */}
                      <div className="flex items-center justify-between px-3 py-1.5 border-b border-violet-200/60 dark:border-violet-800/60">
                        <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
                          {isInland ? "🗺️ เลือกจังหวัด" : "🌐 เลือกประเทศ"}
                        </span>
                        {activeSubCount > 0 && (
                          <button
                            onClick={e => { e.stopPropagation(); subItems.forEach(s => activeCountries.has(s) && onToggleCountry(s)); }}
                            className="text-[10px] text-violet-500 hover:text-violet-700 hover:underline"
                          >
                            ล้าง ({activeSubCount})
                          </button>
                        )}
                      </div>
                      {/* Items */}
                      <div className="p-1.5 flex flex-col gap-0.5 max-h-40 overflow-y-auto">
                        {subItems.map(country => {
                          const countryActive = activeCountries.has(country);
                          return (
                            <button
                              key={country}
                              onClick={() => onToggleCountry(country)}
                              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all text-left ${
                                countryActive
                                  ? "bg-violet-600 text-white shadow-sm"
                                  : "hover:bg-violet-100 dark:hover:bg-violet-900/40 text-foreground"
                              }`}
                            >
                              <span className={`w-3.5 h-3.5 rounded-sm border shrink-0 flex items-center justify-center transition-colors ${
                                countryActive
                                  ? "bg-white/30 border-white/50"
                                  : "border-border"
                              }`}>
                                {countryActive && <Check className="w-2.5 h-2.5" />}
                              </span>
                              <span className="truncate flex-1">{country}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
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
      {/* Mobile / Tablet filter toggle (below lg) */}
      <div className="lg:hidden w-full mb-3">
        <button
          onClick={() => setMobileOpen(o => !o)}
          className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border bg-card shadow-sm text-sm font-medium"
        >
          <Filter className="w-4 h-4 text-violet-500 shrink-0" />
          <span className="flex-1 text-left">กรองโปรแกรม</span>
          {hasActive && (
            <span className="w-5 h-5 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
              {totalActive}
            </span>
          )}
          {mobileOpen ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
        </button>
        {mobileOpen && (
          <div className="mt-2 p-4 rounded-xl border bg-card shadow-md">
            {sidebarContent}
          </div>
        )}
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-56 xl:w-64 shrink-0 self-start sticky top-20">
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
      {/* Cover 1:1 — คลิกที่รูปเปิด flipbook ได้เลย */}
      <div
        className="relative aspect-square bg-muted/30 overflow-hidden cursor-pointer"
        onClick={onOpen}
        title="คลิกเพื่อเปิดอ่าน"
      >
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

        {/* Highlight badge — always visible on highlighted cards */}
        {pkg.isHighlight && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-orange-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            <Flame className="w-3 h-3 fill-current" /> แนะนำ
          </div>
        )}

        {/* Open hint overlay on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 pointer-events-none">
          <BookOpen className="w-8 h-8 text-white drop-shadow-lg" />
          <span className="text-white text-xs font-semibold drop-shadow-lg">เปิดอ่าน</span>
        </div>

        {/* Admin action buttons — stopPropagation ป้องกัน trigger onOpen */}
        {canEdit && (
          <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all pointer-events-auto">
            <button
              onClick={e => { e.stopPropagation(); onUploadCover(); }}
              title="เปลี่ยนภาพปก"
              className="w-8 h-8 rounded-full bg-white/90 text-violet-600 flex items-center justify-center shadow hover:bg-white transition-all"
            >
              <ImageIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={e => { e.stopPropagation(); onToggleHighlight(); }}
              title={pkg.isHighlight ? "ยกเลิก Highlight" : "ตั้งเป็น Highlight"}
              className={`w-8 h-8 rounded-full flex items-center justify-center shadow transition-all ${
                pkg.isHighlight
                  ? "bg-orange-500 text-white"
                  : "bg-black/50 text-white hover:bg-orange-500"
              }`}
            >
              <Flame className={`w-3.5 h-3.5 ${pkg.isHighlight ? "fill-current" : ""}`} />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-2.5 sm:p-3 flex-1 flex flex-col gap-1">
        <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-muted-foreground">
          <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0 text-violet-400" />
          <span className="truncate">{[pkg.country, pkg.city].filter(Boolean).join(" · ") || "—"}</span>
        </div>

        <h3 className="font-bold text-xs sm:text-sm leading-snug line-clamp-2 flex-1">{pkg.title}</h3>

        {pkg.duration && (
          <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-muted-foreground">
            <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-500 shrink-0" />
            <span>{pkg.duration}</span>
          </div>
        )}

        {pkg.tourTypes.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {pkg.tourTypes.slice(0, 2).map(tag => (
              <span key={tag} className="text-[9px] sm:text-[10px] font-medium px-1.5 py-0.5 bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 rounded-full border border-violet-100 dark:border-violet-800">
                {tag}
              </span>
            ))}
            {pkg.tourTypes.length > 2 && (
              <span className="text-[9px] sm:text-[10px] text-muted-foreground">+{pkg.tourTypes.length - 2}</span>
            )}
          </div>
        )}

        {/* Action buttons — flex-wrap เพื่อรองรับหน้าจอเล็ก */}
        <div className="mt-auto pt-2 flex flex-wrap gap-1">
          <Button
            onClick={onOpen}
            size="sm"
            className="flex-1 min-w-[70px] bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700 gap-1 h-7 sm:h-8 text-[11px] sm:text-xs px-2"
          >
            <BookOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="hidden xs:inline sm:inline">เปิดอ่าน</span>
            <span className="xs:hidden sm:hidden">อ่าน</span>
          </Button>
          <button
            onClick={handleShare}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg border bg-background hover:bg-muted flex items-center justify-center transition-colors shrink-0"
            title="แชร์"
          >
            <Share2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground" />
          </button>
          {canEdit && (
            <>
              <button onClick={onEdit} className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg border bg-background hover:bg-muted flex items-center justify-center transition-colors shrink-0" title="แก้ไข">
                <Edit3 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground" />
              </button>
              <button onClick={onDelete} className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg border bg-background hover:bg-destructive/10 flex items-center justify-center transition-colors shrink-0" title="ลบ">
                <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-destructive" />
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
    <section className="mb-8 sm:mb-10">
      <div className="flex items-center gap-2 mb-3 sm:mb-4">
        <span className="text-lg sm:text-xl">{emoji}</span>
        <h2 className="text-base sm:text-lg font-black tracking-tight">{title}</h2>
        <span className="text-[10px] sm:text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-medium">
          {packages.length} โปรแกรม
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
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
// World countries data — Asia first, auto-maps to continent
// ─────────────────────────────────────────────────────────────────────────────

const WORLD_COUNTRIES: { name: string; continent: string; zone: string }[] = [
  // ── เอเชียตะวันออก ──────────────────────────────────────────────
  { name: "ญี่ปุ่น",            continent: "เอเชีย", zone: "เอเชียตะวันออก" },
  { name: "เกาหลีใต้",          continent: "เอเชีย", zone: "เอเชียตะวันออก" },
  { name: "จีน",                continent: "เอเชีย", zone: "เอเชียตะวันออก" },
  { name: "ฮ่องกง",             continent: "เอเชีย", zone: "เอเชียตะวันออก" },
  { name: "ไต้หวัน",            continent: "เอเชีย", zone: "เอเชียตะวันออก" },
  { name: "มองโกเลีย",          continent: "เอเชีย", zone: "เอเชียตะวันออก" },
  // ── เอเชียตะวันออกเฉียงใต้ ─────────────────────────────────────
  { name: "สิงคโปร์",           continent: "เอเชีย", zone: "เอเชียตะวันออกเฉียงใต้" },
  { name: "มาเลเซีย",           continent: "เอเชีย", zone: "เอเชียตะวันออกเฉียงใต้" },
  { name: "เวียดนาม",           continent: "เอเชีย", zone: "เอเชียตะวันออกเฉียงใต้" },
  { name: "อินโดนีเซีย",        continent: "เอเชีย", zone: "เอเชียตะวันออกเฉียงใต้" },
  { name: "บาหลี",              continent: "เอเชีย", zone: "เอเชียตะวันออกเฉียงใต้" },
  { name: "ฟิลิปปินส์",         continent: "เอเชีย", zone: "เอเชียตะวันออกเฉียงใต้" },
  { name: "กัมพูชา",            continent: "เอเชีย", zone: "เอเชียตะวันออกเฉียงใต้" },
  { name: "ลาว",                continent: "เอเชีย", zone: "เอเชียตะวันออกเฉียงใต้" },
  { name: "เมียนมาร์",          continent: "เอเชีย", zone: "เอเชียตะวันออกเฉียงใต้" },
  { name: "บรูไน",              continent: "เอเชีย", zone: "เอเชียตะวันออกเฉียงใต้" },
  // ── เอเชียใต้ ───────────────────────────────────────────────────
  { name: "อินเดีย",            continent: "เอเชีย", zone: "เอเชียใต้" },
  { name: "เนปาล",              continent: "เอเชีย", zone: "เอเชียใต้" },
  { name: "ศรีลังกา",           continent: "เอเชีย", zone: "เอเชียใต้" },
  { name: "มัลดีฟส์",           continent: "เอเชีย", zone: "เอเชียใต้" },
  { name: "ภูฏาน",              continent: "เอเชีย", zone: "เอเชียใต้" },
  { name: "บังกลาเทศ",          continent: "เอเชีย", zone: "เอเชียใต้" },
  // ── ตะวันออกกลาง ────────────────────────────────────────────────
  { name: "ดูไบ / UAE",         continent: "ตะวันออกกลาง", zone: "ตะวันออกกลาง" },
  { name: "กาตาร์",             continent: "ตะวันออกกลาง", zone: "ตะวันออกกลาง" },
  { name: "ซาอุดีอาระเบีย",     continent: "ตะวันออกกลาง", zone: "ตะวันออกกลาง" },
  { name: "อิสราเอล",           continent: "ตะวันออกกลาง", zone: "ตะวันออกกลาง" },
  { name: "จอร์แดน",            continent: "ตะวันออกกลาง", zone: "ตะวันออกกลาง" },
  { name: "ตุรกี",              continent: "ตะวันออกกลาง", zone: "ตะวันออกกลาง" },
  { name: "อิหร่าน",            continent: "ตะวันออกกลาง", zone: "ตะวันออกกลาง" },
  { name: "โอมาน",              continent: "ตะวันออกกลาง", zone: "ตะวันออกกลาง" },
  { name: "คูเวต",              continent: "ตะวันออกกลาง", zone: "ตะวันออกกลาง" },
  // ── ยุโรปตะวันตก ────────────────────────────────────────────────
  { name: "ฝรั่งเศส",           continent: "ยุโรป", zone: "ยุโรปตะวันตก" },
  { name: "อิตาลี",             continent: "ยุโรป", zone: "ยุโรปตะวันตก" },
  { name: "สวิตเซอร์แลนด์",     continent: "ยุโรป", zone: "ยุโรปตะวันตก" },
  { name: "เยอรมนี",            continent: "ยุโรป", zone: "ยุโรปตะวันตก" },
  { name: "อังกฤษ",             continent: "ยุโรป", zone: "ยุโรปตะวันตก" },
  { name: "สเปน",               continent: "ยุโรป", zone: "ยุโรปตะวันตก" },
  { name: "ออสเตรีย",           continent: "ยุโรป", zone: "ยุโรปตะวันตก" },
  { name: "เนเธอร์แลนด์",       continent: "ยุโรป", zone: "ยุโรปตะวันตก" },
  { name: "เบลเยียม",           continent: "ยุโรป", zone: "ยุโรปตะวันตก" },
  { name: "โปรตุเกส",           continent: "ยุโรป", zone: "ยุโรปตะวันตก" },
  { name: "ลักเซมเบิร์ก",       continent: "ยุโรป", zone: "ยุโรปตะวันตก" },
  { name: "ไอร์แลนด์",          continent: "ยุโรป", zone: "ยุโรปตะวันตก" },
  // ── ยุโรปเหนือ ──────────────────────────────────────────────────
  { name: "นอร์เวย์",           continent: "ยุโรป", zone: "ยุโรปเหนือ" },
  { name: "สวีเดน",             continent: "ยุโรป", zone: "ยุโรปเหนือ" },
  { name: "ฟินแลนด์",           continent: "ยุโรป", zone: "ยุโรปเหนือ" },
  { name: "เดนมาร์ก",           continent: "ยุโรป", zone: "ยุโรปเหนือ" },
  { name: "ไอซ์แลนด์",          continent: "ยุโรป", zone: "ยุโรปเหนือ" },
  // ── ยุโรปใต้ / ตะวันออก ─────────────────────────────────────────
  { name: "กรีซ",               continent: "ยุโรป", zone: "ยุโรปใต้" },
  { name: "โครเอเชีย",          continent: "ยุโรป", zone: "ยุโรปใต้" },
  { name: "มอนเตเนโกร",         continent: "ยุโรป", zone: "ยุโรปใต้" },
  { name: "สาธารณรัฐเช็ก",      continent: "ยุโรป", zone: "ยุโรปตะวันออก" },
  { name: "โปแลนด์",            continent: "ยุโรป", zone: "ยุโรปตะวันออก" },
  { name: "ฮังการี",            continent: "ยุโรป", zone: "ยุโรปตะวันออก" },
  { name: "รัสเซีย",            continent: "ยุโรป", zone: "ยุโรปตะวันออก" },
  { name: "โรมาเนีย",           continent: "ยุโรป", zone: "ยุโรปตะวันออก" },
  { name: "บัลแกเรีย",          continent: "ยุโรป", zone: "ยุโรปตะวันออก" },
  // ── อเมริกา ─────────────────────────────────────────────────────
  { name: "สหรัฐอเมริกา",       continent: "อเมริกา", zone: "อเมริกาเหนือ" },
  { name: "แคนาดา",             continent: "อเมริกา", zone: "อเมริกาเหนือ" },
  { name: "เม็กซิโก",           continent: "อเมริกา", zone: "อเมริกาเหนือ" },
  { name: "บราซิล",             continent: "อเมริกา", zone: "อเมริกาใต้" },
  { name: "เปรู",               continent: "อเมริกา", zone: "อเมริกาใต้" },
  { name: "อาร์เจนตินา",        continent: "อเมริกา", zone: "อเมริกาใต้" },
  { name: "คิวบา",              continent: "อเมริกา", zone: "อเมริกาใต้" },
  // ── โอเชียเนีย ──────────────────────────────────────────────────
  { name: "ออสเตรเลีย",         continent: "โอเชียเนีย", zone: "โอเชียเนีย" },
  { name: "นิวซีแลนด์",         continent: "โอเชียเนีย", zone: "โอเชียเนีย" },
  { name: "มอริเชียส",          continent: "โอเชียเนีย", zone: "โอเชียเนีย" },
  { name: "ฟิจิ",               continent: "โอเชียเนีย", zone: "โอเชียเนีย" },
  // ── แอฟริกา ─────────────────────────────────────────────────────
  { name: "อียิปต์",            continent: "แอฟริกา", zone: "แอฟริกา" },
  { name: "แอฟริกาใต้",         continent: "แอฟริกา", zone: "แอฟริกา" },
  { name: "โมร็อกโก",           continent: "แอฟริกา", zone: "แอฟริกา" },
  { name: "เคนยา",              continent: "แอฟริกา", zone: "แอฟริกา" },
  { name: "แทนซาเนีย",          continent: "แอฟริกา", zone: "แอฟริกา" },
  { name: "มาดากัสการ์",        continent: "แอฟริกา", zone: "แอฟริกา" },
];

const THAI_PROVINCES = [
  "กรุงเทพมหานคร","กระบี่","กาญจนบุรี","กาฬสินธุ์","กำแพงเพชร",
  "ขอนแก่น","จันทบุรี","ฉะเชิงเทรา","ชลบุรี","ชัยนาท","ชัยภูมิ",
  "ชุมพร","เชียงราย","เชียงใหม่","ตรัง","ตราด","ตาก","นครนายก",
  "นครปฐม","นครพนม","นครราชสีมา","นครศรีธรรมราช","นครสวรรค์",
  "นนทบุรี","นราธิวาส","น่าน","บึงกาฬ","บุรีรัมย์","ปทุมธานี",
  "ประจวบคีรีขันธ์","ปราจีนบุรี","ปัตตานี","พระนครศรีอยุธยา","พะเยา",
  "พังงา","พัทลุง","พิจิตร","พิษณุโลก","เพชรบุรี","เพชรบูรณ์","แพร่",
  "ภูเก็ต","มหาสารคาม","มุกดาหาร","แม่ฮ่องสอน","ยโสธร","ยะลา",
  "ร้อยเอ็ด","ระนอง","ระยอง","ราชบุรี","ลพบุรี","ลำปาง","ลำพูน",
  "เลย","ศรีสะเกษ","สกลนคร","สงขลา","สตูล","สมุทรปราการ",
  "สมุทรสงคราม","สมุทรสาคร","สระแก้ว","สระบุรี","สิงห์บุรี",
  "สุโขทัย","สุพรรณบุรี","สุราษฎร์ธานี","สุรินทร์","หนองคาย",
  "หนองบัวลำภู","อ่างทอง","อำนาจเจริญ","อุดรธานี","อุตรดิตถ์",
  "อุทัยธานี","อุบลราชธานี",
];

// ─────────────────────────────────────────────────────────────────────────────
// CountryCombobox — searchable dropdown (abroad = world countries, inland = provinces)
// ─────────────────────────────────────────────────────────────────────────────

function CountryCombobox({
  value, onChange, isInland,
}: {
  value: string;
  onChange: (country: string, continent: string) => void;
  isInland: boolean;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen]   = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── Inland: flat province list ──────────────────────────────────
  const filteredProvinces = query
    ? THAI_PROVINCES.filter(p => p.includes(query))
    : THAI_PROVINCES;

  // ── Abroad: group by zone, Asia zones first ─────────────────────
  const filteredAbroad = query
    ? WORLD_COUNTRIES.filter(c => c.name.includes(query) || c.zone.includes(query) || c.continent.includes(query))
    : WORLD_COUNTRIES;

  const abroadGroups = (() => {
    const map: Record<string, typeof WORLD_COUNTRIES> = {};
    for (const c of filteredAbroad) {
      if (!map[c.zone]) map[c.zone] = [];
      map[c.zone].push(c);
    }
    return map;
  })();

  const clear = () => { setQuery(""); onChange("", ""); };

  return (
    <div ref={wrapRef} className="relative mt-1">
      <div className="relative">
        <Input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onChange("", ""); }}
          onFocus={() => setOpen(true)}
          placeholder={isInland ? "ค้นหาจังหวัด..." : "ค้นหาประเทศ..."}
          className="pr-7"
        />
        {value && (
          <button
            type="button"
            onMouseDown={e => { e.preventDefault(); clear(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-[999] top-full mt-1 left-0 right-0 max-h-56 overflow-auto rounded-xl border bg-popover shadow-xl">
          {isInland ? (
            filteredProvinces.length === 0
              ? <p className="text-xs text-muted-foreground p-3 text-center">ไม่พบจังหวัด</p>
              : filteredProvinces.map(p => (
                  <button
                    key={p} type="button"
                    onMouseDown={e => { e.preventDefault(); onChange(p, "ในประเทศ"); setQuery(p); setOpen(false); }}
                    className={`w-full text-left px-3 py-1.5 text-sm transition-colors hover:bg-muted ${value === p ? "bg-violet-50 dark:bg-violet-950/40 text-violet-700 font-semibold" : ""}`}
                  >
                    {p}
                  </button>
                ))
          ) : (
            Object.keys(abroadGroups).length === 0
              ? <p className="text-xs text-muted-foreground p-3 text-center">ไม่พบประเทศ</p>
              : Object.entries(abroadGroups).map(([zone, countries]) => (
                  <div key={zone}>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 pt-2 pb-0.5 bg-muted/60 sticky top-0">
                      {zone}
                    </p>
                    {countries.map(c => (
                      <button
                        key={c.name} type="button"
                        onMouseDown={e => { e.preventDefault(); onChange(c.name, c.continent); setQuery(c.name); setOpen(false); }}
                        className={`w-full text-left px-3 py-1.5 text-sm transition-colors hover:bg-muted flex items-center justify-between gap-2 ${value === c.name ? "bg-violet-50 dark:bg-violet-950/40 text-violet-700 font-semibold" : ""}`}
                      >
                        <span>{c.name}</span>
                        {value !== c.name && <span className="text-[10px] text-muted-foreground shrink-0">{c.continent}</span>}
                        {value === c.name && <Check className="w-3.5 h-3.5 text-violet-600 shrink-0" />}
                      </button>
                    ))}
                  </div>
                ))
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AddEditDialog
// ─────────────────────────────────────────────────────────────────────────────

type FormData = Omit<TourPackageItem, "id" | "uploadedAt" | "pdfUrl" | "pdfName" | "coverUrl" | "isHighlight">;

const EMPTY_FORM: FormData = {
  title: "", duration: "", continent: "", country: "", city: "", tourTypes: [], description: "", extraCountries: [],
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
        extraCountries: editItem.extraCountries ?? [],
      });
    } else setForm(EMPTY_FORM);
    setTypeInput("");
  }, [editItem, open]);

  const isInland = form.continent === "ในประเทศ";

  function toggleInland(inland: boolean) {
    setForm(f => ({ ...f, continent: inland ? "ในประเทศ" : "", country: "", city: "" }));
  }
  function handleCountryChange(country: string, continent: string) {
    setForm(f => ({ ...f, country, continent: isInland ? "ในประเทศ" : continent }));
  }
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
            {/* ── ชื่อโปรแกรม ── */}
            <div className="col-span-2">
              <Label>ชื่อโปรแกรมทัวร์ *</Label>
              <Input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="เช่น ยุโรป 6 ประเทศ สวิส ฝรั่งเศส"
              />
            </div>

            {/* ── ระยะเวลา ── */}
            <div>
              <Label>ระยะเวลา</Label>
              <Input
                value={form.duration}
                onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                placeholder="6 วัน 4 คืน"
              />
            </div>

            {/* ── ประเภทการเดินทาง toggle ── */}
            <div>
              <Label>ประเภทการเดินทาง *</Label>
              <div className="flex mt-1 rounded-lg overflow-hidden border divide-x">
                <button
                  type="button"
                  onClick={() => toggleInland(false)}
                  className={`flex-1 py-1.5 text-xs font-semibold transition-colors ${!isInland ? "bg-violet-600 text-white" : "bg-background text-muted-foreground hover:bg-muted"}`}
                >
                  ✈️ ต่างประเทศ
                </button>
                <button
                  type="button"
                  onClick={() => toggleInland(true)}
                  className={`flex-1 py-1.5 text-xs font-semibold transition-colors ${isInland ? "bg-violet-600 text-white" : "bg-background text-muted-foreground hover:bg-muted"}`}
                >
                  🇹🇭 ภายในประเทศ
                </button>
              </div>
            </div>

            {/* ── ประเทศ / จังหวัด (searchable combobox) ── */}
            <div className="col-span-2 sm:col-span-1">
              <Label>{isInland ? "จังหวัด" : "ประเทศ"}</Label>
              <CountryCombobox
                value={form.country}
                onChange={handleCountryChange}
                isInland={isInland}
              />
              {/* Auto-detected continent badge */}
              {!isInland && form.continent && (
                <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                  <Globe2 className="w-3 h-3" />
                  ทวีป: <span className="font-semibold text-foreground">{form.continent}</span>
                </p>
              )}
            </div>

            {/* ── ประเทศเพิ่มเติม (ประเทศที่ 2, 3...) ── */}
            {!isInland && (
              <div className="col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-xs text-muted-foreground">ประเทศเพิ่มเติม (สำหรับโปรแกรมหลายประเทศ)</Label>
                  {(form.extraCountries ?? []).length < 4 && (
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, extraCountries: [...(f.extraCountries ?? []), ""] }))}
                      className="text-[11px] text-violet-600 hover:text-violet-700 flex items-center gap-1 font-semibold"
                    >
                      <Plus className="w-3 h-3" /> + เพิ่มประเทศที่ {(form.extraCountries ?? []).length + 2}
                    </button>
                  )}
                </div>
                {(form.extraCountries ?? []).length > 0 && (
                  <div className="space-y-1.5">
                    {(form.extraCountries ?? []).map((ec, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground w-16 shrink-0">ประเทศที่ {idx + 2}</span>
                        <div className="flex-1">
                          <CountryCombobox
                            value={ec}
                            onChange={(country) => {
                              const updated = [...(form.extraCountries ?? [])];
                              updated[idx] = country;
                              setForm(f => ({ ...f, extraCountries: updated }));
                            }}
                            isInland={false}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = (form.extraCountries ?? []).filter((_, i) => i !== idx);
                            setForm(f => ({ ...f, extraCountries: updated }));
                          }}
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── เมือง / จุดเด่น ── */}
            <div className="col-span-2 sm:col-span-1">
              <Label>{isInland ? "เมือง / อำเภอ" : "เมือง / จุดเด่น"}</Label>
              <Input
                className="mt-1"
                value={form.city}
                onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                placeholder={isInland ? "เช่น อำเภอเมือง, หัวหิน..." : "โตเกียว, เซอร์แมท..."}
              />
            </div>
          </div>

          {/* ── ประเภททัวร์ ── */}
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

          {/* ── คำอธิบาย ── */}
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
  const canEdit   = !!user && (["Admin", "Sales Manager", "OB Co-ordinator", "Marketing"] as string[]).includes(user.role);

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
  const [activeCountries,  setActiveCountries]  = useState<Set<string>>(new Set());
  const [searchQuery,      setSearchQuery]      = useState("");

  // Upload refs
  const pdfRef             = useRef<HTMLInputElement>(null);
  const highlightCoverRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // ── Filter options ─────────────────────────────────────────────────────────
  const allContinents = useMemo(() => [...new Set(packages.map(p => p.continent).filter(Boolean))].sort(), [packages]);
  const allTourTypes  = useMemo(() => [...new Set(packages.flatMap(p => p.tourTypes))].sort(), [packages]);

  // countries grouped by continent (only for active continents, or all if none active)
  const allCountriesByContinent = useMemo(() => {
    const relevant = activeContinents.size > 0
      ? packages.filter(p => activeContinents.has(p.continent))
      : packages;
    const map: Record<string, string[]> = {};
    for (const p of relevant) {
      if (!p.continent || !p.country) continue;
      if (!map[p.continent]) map[p.continent] = [];
      if (!map[p.continent].includes(p.country)) map[p.continent].push(p.country);
      // รวมประเทศเพิ่มเติมเข้า filter list ด้วย
      for (const ec of (p.extraCountries ?? [])) {
        if (!ec) continue;
        // หา continent ของประเทศนั้นจาก WORLD_COUNTRIES
        const found = WORLD_COUNTRIES.find(w => w.name === ec);
        const ecContinent = found?.continent ?? p.continent;
        if (!map[ecContinent]) map[ecContinent] = [];
        if (!map[ecContinent].includes(ec)) map[ecContinent].push(ec);
      }
    }
    // sort each list
    for (const k of Object.keys(map)) map[k].sort();
    return map;
  }, [packages, activeContinents]);

  // ── Filtered packages ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return packages.filter(pkg => {
      if (activeContinents.size > 0 && !activeContinents.has(pkg.continent)) return false;
      if (activeCountries.size  > 0 && !activeCountries.has(pkg.country) && !(pkg.extraCountries ?? []).some(ec => activeCountries.has(ec))) return false;
      if (activeTourTypes.size  > 0 && !pkg.tourTypes.some(t => activeTourTypes.has(t))) return false;
      if (q) {
        const haystack = [
          pkg.title,
          pkg.country,
          pkg.city,
          pkg.continent,
          pkg.duration,
          pkg.description ?? "",
          ...(pkg.tourTypes),
          ...(pkg.extraCountries ?? []),
        ].join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [packages, activeContinents, activeCountries, activeTourTypes, searchQuery]);

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

  const hasActiveFilter = activeContinents.size + activeTourTypes.size + activeCountries.size > 0 || searchQuery.trim() !== "";

  function toggleContinent(v: string) {
    setActiveContinents(prev => {
      const n = new Set(prev);
      if (n.has(v)) {
        n.delete(v);
        // clear countries that belong to this continent
        const countriesOfContinent = allCountriesByContinent[v] ?? [];
        if (countriesOfContinent.length > 0) {
          setActiveCountries(pc => {
            const nc = new Set(pc);
            countriesOfContinent.forEach(c => nc.delete(c));
            return nc;
          });
        }
      } else {
        n.add(v);
      }
      return n;
    });
  }
  function toggleCountry(v: string) {
    setActiveCountries(prev => { const n = new Set(prev); n.has(v) ? n.delete(v) : n.add(v); return n; });
  }
  function toggleTourType(v: string) {
    setActiveTourTypes(prev => { const n = new Set(prev); n.has(v) ? n.delete(v) : n.add(v); return n; });
  }
  function clearAllFilters() {
    setActiveContinents(new Set()); setActiveTourTypes(new Set()); setActiveCountries(new Set()); setSearchQuery("");
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
        <StandaloneHeader backTo="/tour-presentation" hideChat />
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
        <div className="max-w-screen-2xl mx-auto px-3 sm:px-5 lg:px-8 pt-5 flex flex-wrap items-center gap-3">
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
      <div className="max-w-screen-2xl mx-auto px-3 sm:px-5 lg:px-8 pt-5 pb-20 flex flex-col lg:flex-row gap-0 lg:gap-8 items-start">

        {/* Left sidebar */}
        {packages.length > 0 && (
          <FilterSidebar
            allContinents={allContinents}
            allTourTypes={allTourTypes}
            allCountriesByContinent={allCountriesByContinent}
            activeContinents={activeContinents}
            activeTourTypes={activeTourTypes}
            activeCountries={activeCountries}
            onToggleContinent={toggleContinent}
            onToggleTourType={toggleTourType}
            onToggleCountry={toggleCountry}
            onClear={clearAllFilters}
            hasActive={hasActiveFilter}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        )}

        {/* Content */}
        <main className="flex-1 min-w-0 w-full">

          {packages.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed p-8 sm:p-16 text-center bg-card/50">
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
                <section className="mb-8 sm:mb-10">
                  <div className="flex items-center gap-2 mb-3 sm:mb-4">
                    <span className="text-xl sm:text-2xl">🔥</span>
                    <h2 className="text-base sm:text-lg font-black tracking-tight">Highlight Program</h2>
                    <span className="text-[10px] sm:text-xs text-muted-foreground bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                      {highlightPkgs.length} โปรแกรม
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
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
