/**
 * TourPackagePresentation.tsx
 * หน้านำเสนอ Package ทัวร์ — Card Menu + PDF Flipbook Viewer
 *
 * Features:
 * - Filter bar: ทวีป / ประเทศ / เมือง / ประเภททัวร์ (multiple selection, AND between categories)
 * - Card grid: cover + title + duration + tags + CTA button
 * - PDF Flipbook Modal: loads pdfjs from CDN, renders pages as canvas images, 3D flip animation
 * - Mobile-friendly: swipe/touch to flip pages
 */

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  BookOpen, Upload, Trash2, Edit3, Save, X, Plus, Tag,
  Globe2, MapPin, Clock, ChevronLeft, ChevronRight, Loader2,
  ZoomIn, ZoomOut, FileText, Image as ImageIcon, Filter,
  FlipHorizontal2,
} from "lucide-react";
import { StandaloneHeader } from "@/components/StandaloneHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useSiteSettings, type TourPackageItem } from "@/store/siteSettingsStore";
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

// ─────────────────────────────────────────────────────────────────────────────
// PDF.js loader (dynamic CDN)
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

async function renderPdfToImages(url: string, onProgress?: (done: number, total: number) => void): Promise<string[]> {
  const pdfjsLib = await getPdfjsLib();
  const pdf      = await pdfjsLib.getDocument({ url, withCredentials: false }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
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

// ─────────────────────────────────────────────────────────────────────────────
// FlipbookModal
// ─────────────────────────────────────────────────────────────────────────────

function FlipbookModal({ pkg, onClose }: { pkg: TourPackageItem; onClose: () => void }) {
  const [pages,        setPages]       = useState<string[]>([]);
  const [pageIdx,      setPageIdx]     = useState(0);
  const [loading,      setLoading]     = useState(true);
  const [loadProgress, setProgress]    = useState(0);
  const [loadTotal,    setTotal]       = useState(0);
  const [zoom,         setZoom]        = useState(1);
  const [flipDir,      setFlipDir]     = useState<"none" | "fwd" | "bwd">("none");
  const [animating,    setAnimating]   = useState(false);
  const touchStartX   = useRef<number | null>(null);

  // Load PDF on mount
  useEffect(() => {
    setLoading(true);
    renderPdfToImages(pkg.pdfUrl, (done, total) => {
      setProgress(done);
      setTotal(total);
    })
      .then(imgs => { setPages(imgs); setLoading(false); })
      .catch(err => {
        console.error(err);
        toast.error("ไม่สามารถโหลด PDF ได้ — กรุณาลอง 'เปิดในแท็บใหม่'");
        setLoading(false);
      });
  }, [pkg.pdfUrl]);

  // Page navigation with flip animation
  function goNext() {
    if (animating || pageIdx >= pages.length - 1) return;
    setFlipDir("fwd");
    setAnimating(true);
    setTimeout(() => {
      setPageIdx(p => p + 1);
      setFlipDir("none");
      setAnimating(false);
    }, 480);
  }

  function goPrev() {
    if (animating || pageIdx <= 0) return;
    setFlipDir("bwd");
    setAnimating(true);
    setTimeout(() => {
      setPageIdx(p => p - 1);
      setFlipDir("none");
      setAnimating(false);
    }, 480);
  }

  // Touch/swipe support
  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (dx < -50) goNext();
    else if (dx > 50) goPrev();
  }

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "PageDown") goNext();
      else if (e.key === "ArrowLeft" || e.key === "PageUp") goPrev();
      else if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIdx, animating]);

  // Flip CSS transform
  const flipTransform = flipDir === "fwd"
    ? "rotateY(-90deg)"
    : flipDir === "bwd"
    ? "rotateY(90deg)"
    : "rotateY(0deg)";

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-3 bg-black/60 border-b border-white/10 shrink-0">
        <BookOpen className="w-5 h-5 text-violet-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">{pkg.title}</p>
          {pages.length > 0 && (
            <p className="text-white/50 text-xs">
              หน้า {pageIdx + 1} / {pages.length}
            </p>
          )}
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-1 bg-white/10 rounded-lg px-2 py-1">
          <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="text-white/70 hover:text-white">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-white text-xs font-medium w-12 text-center">{(zoom * 100).toFixed(0)}%</span>
          <button onClick={() => setZoom(z => Math.min(3, z + 0.25))} className="text-white/70 hover:text-white">
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        {/* Open in new tab fallback */}
        <a
          href={pkg.pdfUrl}
          target="_blank"
          rel="noreferrer"
          className="hidden sm:flex items-center gap-1.5 text-xs text-white/70 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-all"
        >
          <FileText className="w-3.5 h-3.5" /> แท็บใหม่
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
          <div className="flex items-center gap-2 sm:gap-6 h-full py-4 px-2">

            {/* Prev button */}
            <button
              onClick={goPrev}
              disabled={pageIdx === 0 || animating}
              className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-all disabled:opacity-30"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Book / page display */}
            <div
              className="flex-1 max-w-[800px] flex items-center justify-center overflow-hidden"
              style={{ perspective: "1200px" }}
            >
              {/* Book shadow base */}
              <div className="relative" style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}>
                <div className="relative shadow-2xl" style={{ filter: "drop-shadow(0 30px 60px rgba(0,0,0,0.8))" }}>
                  {/* Page with flip animation */}
                  <div
                    style={{
                      transformOrigin: "center center",
                      transition: flipDir !== "none" ? "transform 0.48s cubic-bezier(0.645, 0.045, 0.355, 1)" : "none",
                      transform: flipTransform,
                      backfaceVisibility: "hidden",
                    }}
                  >
                    <img
                      src={pages[pageIdx]}
                      alt={`หน้า ${pageIdx + 1}`}
                      className="max-h-[70vh] sm:max-h-[78vh] max-w-full object-contain rounded-sm select-none"
                      draggable={false}
                      style={{ boxShadow: "inset -4px 0 12px rgba(0,0,0,0.15)" }}
                    />
                  </div>
                </div>

                {/* Page curl shadow overlay */}
                <div
                  className="absolute bottom-0 right-0 w-16 h-16 pointer-events-none"
                  style={{
                    background: "radial-gradient(ellipse at bottom right, rgba(0,0,0,0.3) 0%, transparent 70%)",
                  }}
                />
              </div>
            </div>

            {/* Next button */}
            <button
              onClick={goNext}
              disabled={pageIdx === pages.length - 1 || animating}
              className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-all disabled:opacity-30"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        )}
      </div>

      {/* ── Page thumbnails strip (bottom) ── */}
      {!loading && pages.length > 0 && (
        <div className="shrink-0 bg-black/60 border-t border-white/10 py-2 px-4 flex items-center gap-2 overflow-x-auto">
          {/* Progress dots for many pages */}
          {pages.length <= 20 ? (
            pages.map((pg, i) => (
              <button
                key={i}
                onClick={() => !animating && setPageIdx(i)}
                className={`shrink-0 relative overflow-hidden rounded transition-all border-2 ${
                  i === pageIdx ? "border-violet-400 scale-110" : "border-transparent opacity-60 hover:opacity-100"
                }`}
                style={{ width: 44, height: 60 }}
              >
                <img src={pg} alt="" className="w-full h-full object-cover" />
              </button>
            ))
          ) : (
            // For many pages: show mini page indicator
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-500 rounded-full transition-all"
                  style={{ width: `${((pageIdx + 1) / pages.length) * 100}%` }}
                />
              </div>
              <span className="text-white/60 text-xs whitespace-nowrap">
                {pageIdx + 1} / {pages.length}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FilterChip
// ─────────────────────────────────────────────────────────────────────────────

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap ${
        active
          ? "bg-violet-600 text-white border-violet-600 shadow-sm"
          : "bg-card text-muted-foreground border-border hover:border-violet-400 hover:text-violet-600"
      }`}
    >
      {label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PackageCard
// ─────────────────────────────────────────────────────────────────────────────

function PackageCard({
  pkg, isAdmin, onOpen, onEdit, onDelete, onUploadCover,
}: {
  pkg: TourPackageItem;
  isAdmin: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onUploadCover: () => void;
}) {
  const CONTINENT_COLOR: Record<string, string> = {
    ยุโรป: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    เอเชีย: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    อเมริกา: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    โอเชียเนีย: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    แอฟริกา: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    ตะวันออกกลาง: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    ในประเทศ: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  };
  const contColor = CONTINENT_COLOR[pkg.continent] ?? "bg-muted text-muted-foreground";

  return (
    <article className="group bg-card rounded-2xl border shadow-sm overflow-hidden flex flex-col hover:shadow-lg transition-shadow">
      {/* Cover */}
      <div className="relative aspect-[3/2] bg-muted/30 overflow-hidden">
        {pkg.coverUrl ? (
          <img
            src={pkg.coverUrl}
            alt={pkg.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-violet-50 to-indigo-100 dark:from-violet-950/30 dark:to-indigo-950/30">
            <BookOpen className="w-14 h-14 text-violet-300" />
          </div>
        )}

        {/* Continent badge */}
        <div className={`absolute top-2 left-2 text-[11px] font-bold px-2 py-0.5 rounded-full ${contColor}`}>
          {pkg.continent}
        </div>

        {/* Admin: upload cover */}
        {isAdmin && (
          <button
            onClick={onUploadCover}
            className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-white/90 text-violet-600 flex items-center justify-center shadow hover:bg-white opacity-0 group-hover:opacity-100 transition-all"
            title="อัปโหลดภาพปก"
          >
            <ImageIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col gap-2">
        {/* Location */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="w-3.5 h-3.5 shrink-0 text-violet-400" />
          <span className="truncate">{[pkg.country, pkg.city].filter(Boolean).join(" · ")}</span>
        </div>

        {/* Title */}
        <h3 className="font-bold text-sm leading-snug line-clamp-2 flex-1">{pkg.title}</h3>

        {/* Duration */}
        {pkg.duration && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>{pkg.duration}</span>
          </div>
        )}

        {/* Tour type tags */}
        {pkg.tourTypes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {pkg.tourTypes.slice(0, 3).map(tag => (
              <span key={tag} className="text-[10px] font-medium px-2 py-0.5 bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 rounded-full border border-violet-100 dark:border-violet-800">
                {tag}
              </span>
            ))}
            {pkg.tourTypes.length > 3 && (
              <span className="text-[10px] text-muted-foreground px-1">+{pkg.tourTypes.length - 3}</span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-auto pt-3 flex gap-2">
          <Button
            onClick={onOpen}
            size="sm"
            className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700 gap-1.5"
          >
            <FlipHorizontal2 className="w-3.5 h-3.5" /> เปิด Flipbook
          </Button>
          {isAdmin && (
            <>
              <Button size="icon" variant="ghost" className="shrink-0" onClick={onEdit} title="แก้ไข">
                <Edit3 className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" className="shrink-0" onClick={onDelete} title="ลบ">
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AddEditDialog
// ─────────────────────────────────────────────────────────────────────────────

type FormData = Omit<TourPackageItem, "id" | "uploadedAt" | "pdfUrl" | "pdfName" | "coverUrl">;

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
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [typeInput, setTypeInput] = useState("");

  useEffect(() => {
    if (editItem) {
      setForm({
        title: editItem.title, duration: editItem.duration,
        continent: editItem.continent, country: editItem.country,
        city: editItem.city, tourTypes: editItem.tourTypes,
        description: editItem.description ?? "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
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

          {/* Tour Types */}
          <div>
            <Label>ประเภททัวร์</Label>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {PRESET_TOUR_TYPES.map(t => (
                <button
                  key={t}
                  type="button"
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
                    <button onClick={() => removeType(t)} className="hover:text-red-500">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <Label>คำอธิบายเพิ่มเติม (ไม่บังคับ)</Label>
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
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function TourPackagePresentation() {
  const settings    = useSiteSettings();
  const user        = useCurrentUser();
  const isAdmin     = user?.role === "Admin";

  const packages    = settings.tourPackages ?? [];

  // ── State ──────────────────────────────────────────────────────────────────
  const [flipbookPkg, setFlipbookPkg] = useState<TourPackageItem | null>(null);
  const [editPkg,     setEditPkg]     = useState<TourPackageItem | null>(null);
  const [addOpen,     setAddOpen]     = useState(false);

  // Active filters — keyed by category
  const [activeContinents, setActiveContinents] = useState<Set<string>>(new Set());
  const [activeCountries,  setActiveCountries]  = useState<Set<string>>(new Set());
  const [activeCities,     setActiveCities]     = useState<Set<string>>(new Set());
  const [activeTourTypes,  setActiveTourTypes]  = useState<Set<string>>(new Set());

  // Upload refs
  const pdfRef   = useRef<HTMLInputElement>(null);
  const coverRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadingCoverId, setUploadingCoverId] = useState<string | null>(null);
  const [pendingPdf, setPendingPdf] = useState<{ url: string; name: string } | null>(null);
  const [pendingAddOpen, setPendingAddOpen] = useState(false);

  // ── Derived filter options ─────────────────────────────────────────────────
  const allContinents = useMemo(() => [...new Set(packages.map(p => p.continent).filter(Boolean))].sort(), [packages]);
  const allCountries  = useMemo(() => [...new Set(packages.map(p => p.country).filter(Boolean))].sort(), [packages]);
  const allCities     = useMemo(() => [...new Set(packages.map(p => p.city).filter(Boolean))].sort(), [packages]);
  const allTourTypes  = useMemo(() => [...new Set(packages.flatMap(p => p.tourTypes))].sort(), [packages]);

  // ── Filtered packages ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return packages.filter(pkg => {
      if (activeContinents.size > 0 && !activeContinents.has(pkg.continent)) return false;
      if (activeCountries.size  > 0 && !activeCountries.has(pkg.country))   return false;
      if (activeCities.size     > 0 && !activeCities.has(pkg.city))         return false;
      if (activeTourTypes.size  > 0 && !pkg.tourTypes.some(t => activeTourTypes.has(t))) return false;
      return true;
    });
  }, [packages, activeContinents, activeCountries, activeCities, activeTourTypes]);

  function toggleFilter(set: Set<string>, setter: (s: Set<string>) => void, val: string) {
    const next = new Set(set);
    next.has(val) ? next.delete(val) : next.add(val);
    setter(next);
  }

  function clearAllFilters() {
    setActiveContinents(new Set());
    setActiveCountries(new Set());
    setActiveCities(new Set());
    setActiveTourTypes(new Set());
  }

  const hasActiveFilter = activeContinents.size + activeCountries.size + activeCities.size + activeTourTypes.size > 0;

  // ── Upload PDF ─────────────────────────────────────────────────────────────
  async function handlePdfUpload(file: File | null) {
    if (!file) return;
    if (file.type !== "application/pdf") { toast.error("กรุณาเลือกไฟล์ PDF เท่านั้น"); return; }
    if (!SUPABASE_ENABLED || !supabase) { toast.error("ต้องเชื่อมต่อ Supabase"); return; }
    setUploadingPdf(true);
    try {
      const safeName = file.name.replace(/[^\w.\-]/g, "_");
      const path     = `tour-packages/${Date.now()}-${safeName}`;
      const { data, error } = await supabase.storage
        .from("presentations")
        .upload(path, file, { contentType: "application/pdf", upsert: false });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("presentations").getPublicUrl(data.path);
      setPendingPdf({ url: urlData.publicUrl, name: file.name });
      setPendingAddOpen(true);
      toast.success(`อัปโหลด PDF สำเร็จ — กรอกรายละเอียดโปรแกรมทัวร์`);
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
      const { data, error } = await supabase.storage
        .from("presentations")
        .upload(path, coverFile, { contentType: "image/jpeg", upsert: false });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("presentations").getPublicUrl(data.path);
      settings.updateTourPackage(id, { coverUrl: urlData.publicUrl });
      toast.success("อัปโหลดภาพปกสำเร็จ");
    } catch (e: any) {
      toast.error(`อัปโหลดปกล้มเหลว: ${e?.message ?? ""}`);
    } finally {
      setUploadingCoverId(null);
      if (coverRefs.current[id]) coverRefs.current[id]!.value = "";
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

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-violet-50/20 to-indigo-50/20 dark:from-background dark:via-violet-950/10 dark:to-indigo-950/10">
      <StandaloneHeader backTo="/tour-presentation" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">

        {/* ── Page Hero ── */}
        <div className="pt-8 pb-6 text-center">
          <div className="inline-flex items-center gap-2 bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
            <BookOpen className="w-3.5 h-3.5" />
            Package Presentation
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-2">
            โปรแกรมทัวร์ Standard Tour
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
            เลือกดูโปรแกรมทัวร์ที่สนใจ แล้วเปิดอ่านในรูปแบบ E-Booklet แบบพลิกหน้า
          </p>
        </div>

        {/* ── Admin: Upload PDF button ── */}
        {isAdmin && (
          <div className="flex justify-center mb-6">
            <Button
              onClick={() => pdfRef.current?.click()}
              disabled={uploadingPdf}
              className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700"
            >
              <Upload className="w-4 h-4" />
              {uploadingPdf ? "กำลังอัปโหลด..." : "+ เพิ่ม Package ทัวร์ (PDF)"}
            </Button>
            <input
              ref={pdfRef}
              type="file"
              accept="application/pdf"
              hidden
              onChange={e => handlePdfUpload(e.target.files?.[0] ?? null)}
            />
          </div>
        )}

        {/* ── Filter Bar ── */}
        {packages.length > 0 && (
          <div className="mb-6 rounded-2xl bg-card border shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">กรองโปรแกรมทัวร์</span>
              {hasActiveFilter && (
                <button
                  onClick={clearAllFilters}
                  className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> ล้างทั้งหมด
                </button>
              )}
            </div>

            {/* Continent */}
            {allContinents.length > 0 && (
              <div className="mb-2">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <Globe2 className="w-3 h-3" /> ทวีป
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {allContinents.map(c => (
                    <FilterChip
                      key={c}
                      label={c}
                      active={activeContinents.has(c)}
                      onClick={() => toggleFilter(activeContinents, setActiveContinents, c)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Country */}
            {allCountries.length > 0 && (
              <div className="mb-2">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> ประเทศ
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {allCountries.map(c => (
                    <FilterChip
                      key={c}
                      label={c}
                      active={activeCountries.has(c)}
                      onClick={() => toggleFilter(activeCountries, setActiveCountries, c)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* City */}
            {allCities.length > 1 && (
              <div className="mb-2">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> เมือง
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {allCities.map(c => (
                    <FilterChip
                      key={c}
                      label={c}
                      active={activeCities.has(c)}
                      onClick={() => toggleFilter(activeCities, setActiveCities, c)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Tour types */}
            {allTourTypes.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <Tag className="w-3 h-3" /> ประเภททัวร์
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {allTourTypes.map(t => (
                    <FilterChip
                      key={t}
                      label={t}
                      active={activeTourTypes.has(t)}
                      onClick={() => toggleFilter(activeTourTypes, setActiveTourTypes, t)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Result count ── */}
        {hasActiveFilter && (
          <p className="text-sm text-muted-foreground mb-4">
            แสดง <span className="font-bold text-foreground">{filtered.length}</span> จาก {packages.length} โปรแกรม
          </p>
        )}

        {/* ── Card Grid ── */}
        {packages.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed p-16 text-center bg-card/50">
            <BookOpen className="w-16 h-16 mx-auto text-muted-foreground/40 mb-4" />
            <p className="font-semibold text-lg">ยังไม่มีโปรแกรมทัวร์</p>
            <p className="text-sm text-muted-foreground mt-1">
              {isAdmin ? "กดปุ่ม '+ เพิ่ม Package ทัวร์' เพื่อเริ่มอัปโหลดไฟล์ PDF" : "Admin จะเพิ่มโปรแกรมทัวร์ที่นี่"}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(pkg => (
              <div key={pkg.id}>
                {/* Hidden cover upload input per card */}
                <input
                  ref={el => { coverRefs.current[pkg.id] = el; }}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={e => handleCoverUpload(pkg.id, e.target.files?.[0] ?? null)}
                />
                <PackageCard
                  pkg={pkg}
                  isAdmin={isAdmin}
                  onOpen={() => setFlipbookPkg(pkg)}
                  onEdit={() => setEditPkg(pkg)}
                  onDelete={() => handleDelete(pkg)}
                  onUploadCover={() => coverRefs.current[pkg.id]?.click()}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── Flipbook Modal ── */}
      {flipbookPkg && (
        <FlipbookModal pkg={flipbookPkg} onClose={() => setFlipbookPkg(null)} />
      )}

      {/* ── Add/Edit Dialog ── */}
      <AddEditDialog
        open={pendingAddOpen || !!editPkg}
        editItem={editPkg}
        onClose={() => { setEditPkg(null); setPendingPdf(null); setPendingAddOpen(false); }}
        onSave={handleSave}
      />
    </div>
  );
}
