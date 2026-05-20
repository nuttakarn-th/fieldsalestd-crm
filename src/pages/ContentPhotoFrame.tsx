/**
 * ContentPhotoFrame.tsx
 * Photo Frame Studio — อัปโหลด Template กรอบรูป (PNG)
 * ระบบนำกรอบทับรูปที่ผู้ใช้อัปโหลด แล้วดาวน์โหลดได้ทันที
 */
import {
  useState, useRef, useEffect,
  forwardRef, useImperativeHandle, useCallback,
} from "react";
import {
  Layers, Upload, Trash2, Download, Plus,
  Check, ImageIcon, X, Info,
} from "lucide-react";
import { useCRM, type ContentTemplate } from "@/store/crmStore";
import { toast } from "sonner";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = () => reject(new Error("load failed"));
    img.src = src;
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getImageDimensions(dataUrl: string): Promise<{ w: number; h: number }> {
  return loadImage(dataUrl).then((img) => ({
    w: img.naturalWidth  || 1080,
    h: img.naturalHeight || 1080,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// FramedPhotoCard — renders photo + frame on <canvas>, exposes download()
// ─────────────────────────────────────────────────────────────────────────────

interface CardHandle { download: () => void; }

interface FramedPhotoCardProps {
  photoFile:        File;
  template:         ContentTemplate;
  onRemove:         () => void;
}

const FramedPhotoCard = forwardRef<CardHandle, FramedPhotoCardProps>(
  ({ photoFile, template, onRemove }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [ready, setReady]   = useState(false);
    const [error, setError]   = useState(false);

    useImperativeHandle(ref, () => ({
      download() {
        if (!canvasRef.current || !ready) return;
        const a = document.createElement("a");
        a.download = `framed_${photoFile.name.replace(/\.[^.]+$/, "")}.png`;
        a.href     = canvasRef.current.toDataURL("image/png");
        a.click();
      },
    }));

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      setReady(false);
      setError(false);

      canvas.width  = template.width;
      canvas.height = template.height;

      const photoUrl = URL.createObjectURL(photoFile);
      let cancelled  = false;

      Promise.all([loadImage(photoUrl), loadImage(template.dataUrl)])
        .then(([photo, frame]) => {
          if (cancelled) return;
          // 1. Draw photo (cover fill — photo fills canvas, centered)
          const scale = Math.max(
            template.width  / photo.naturalWidth,
            template.height / photo.naturalHeight,
          );
          const dw = photo.naturalWidth  * scale;
          const dh = photo.naturalHeight * scale;
          const dx = (template.width  - dw) / 2;
          const dy = (template.height - dh) / 2;
          ctx.drawImage(photo, dx, dy, dw, dh);
          // 2. Draw frame on top (transparent areas let photo show through)
          ctx.drawImage(frame, 0, 0, template.width, template.height);
          setReady(true);
        })
        .catch(() => { if (!cancelled) setError(true); })
        .finally(() => URL.revokeObjectURL(photoUrl));

      return () => { cancelled = true; URL.revokeObjectURL(photoUrl); };
    }, [photoFile, template]);

    function handleDownload() {
      if (!canvasRef.current || !ready) return;
      const a = document.createElement("a");
      a.download = `framed_${photoFile.name.replace(/\.[^.]+$/, "")}.png`;
      a.href     = canvasRef.current.toDataURL("image/png");
      a.click();
    }

    return (
      <div className="bg-card border rounded-xl overflow-hidden shadow-soft group relative">
        {/* Remove button */}
        <button
          onClick={onRemove}
          className="absolute top-2 left-2 z-10 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Canvas preview */}
        <div
          className="relative bg-muted/20 overflow-hidden"
          style={{ aspectRatio: `${template.width}/${template.height}` }}
        >
          {/* Loading spinner */}
          {!ready && !error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {/* Error state */}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 gap-1">
              <X className="w-6 h-6" />
              <span className="text-[10px]">โหลดไม่ได้</span>
            </div>
          )}
          {/* Canvas: always rendered, fade in when ready */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full transition-opacity duration-300"
            style={{ opacity: ready ? 1 : 0 }}
          />
        </div>

        {/* Footer */}
        <div className="px-2.5 py-2 flex items-center gap-2">
          <p className="text-[11px] text-muted-foreground flex-1 truncate">{photoFile.name}</p>
          <button
            onClick={handleDownload}
            disabled={!ready}
            title="Download"
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }
);
FramedPhotoCard.displayName = "FramedPhotoCard";

// ─────────────────────────────────────────────────────────────────────────────
// TemplateCard — thumbnail with checkerboard bg (shows transparency)
// ─────────────────────────────────────────────────────────────────────────────

function TemplateCard({
  template,
  selected,
  onSelect,
  onDelete,
}: {
  template:  ContentTemplate;
  selected:  boolean;
  onSelect:  () => void;
  onDelete:  () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`relative rounded-xl border overflow-hidden cursor-pointer transition-all group ${
        selected ? "ring-2 ring-amber-500 border-amber-300" : "hover:border-amber-300 border-border"
      }`}
    >
      {/* Thumbnail with checkerboard (transparent PNG indicator) */}
      <div
        className="relative overflow-hidden"
        style={{ aspectRatio: `${template.width}/${template.height}` }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "repeating-conic-gradient(#e5e7eb 0% 25%, #f9fafb 0% 50%)",
            backgroundSize: "12px 12px",
          }}
        />
        <img
          src={template.dataUrl}
          className="absolute inset-0 w-full h-full object-contain"
          alt={template.name}
        />
        {selected && (
          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center shadow">
            <Check className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-2 pt-1.5 pb-1 flex items-start gap-1">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold truncate leading-tight">{template.name}</p>
          <p className="text-[9px] text-muted-foreground">{template.width}×{template.height}px</p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="opacity-0 group-hover:opacity-100 shrink-0 w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-red-500 transition-all mt-0.5"
          title="ลบ Template"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function ContentPhotoFrame() {
  const { contentTemplates, addContentTemplate, deleteContentTemplate } = useCRM();

  const [selectedId, setSelectedId] = useState<string | null>(
    contentTemplates[0]?.template_id ?? null
  );
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const templateInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef    = useRef<HTMLInputElement>(null);
  const cardRefs         = useRef<(CardHandle | null)[]>([]);

  const selectedTemplate = contentTemplates.find((t) => t.template_id === selectedId) ?? null;

  // Auto-select first template when list changes
  useEffect(() => {
    if (!selectedId && contentTemplates.length > 0) {
      setSelectedId(contentTemplates[0].template_id);
    }
  }, [contentTemplates, selectedId]);

  // ── Upload Template ──────────────────────────────────────────────────────

  async function handleTemplateUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`"${file.name}" ใหญ่เกินไป (สูงสุด 5 MB)`);
        continue;
      }
      const dataUrl = await fileToDataUrl(file).catch(() => null);
      if (!dataUrl) { toast.error(`อ่านไฟล์ "${file.name}" ไม่ได้`); continue; }
      const { w, h } = await getImageDimensions(dataUrl).catch(() => ({ w: 1080, h: 1080 }));
      addContentTemplate({ name: file.name.replace(/\.[^.]+$/, ""), dataUrl, width: w, height: h });
      toast.success(`เพิ่ม Template "${file.name.replace(/\.[^.]+$/, "")}" แล้ว ✅`);
    }
  }

  function handleDeleteTemplate(id: string) {
    deleteContentTemplate(id);
    if (selectedId === id) {
      const next = contentTemplates.find((t) => t.template_id !== id);
      setSelectedId(next?.template_id ?? null);
    }
    toast.success("ลบ Template แล้ว");
  }

  // ── Upload Photos ────────────────────────────────────────────────────────

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    setPhotoFiles((prev) => [...prev, ...files]);
  }

  // Drag-and-drop for photos
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;
    setPhotoFiles((prev) => [...prev, ...files]);
  }, []);

  function removePhoto(index: number) {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
  }

  // ── Download All ─────────────────────────────────────────────────────────

  function downloadAll() {
    if (!selectedTemplate || photoFiles.length === 0) return;
    let count = 0;
    photoFiles.forEach((_, i) => {
      setTimeout(() => {
        cardRefs.current[i]?.download();
        count++;
        if (count === photoFiles.length) toast.success(`Download ครบ ${photoFiles.length} รูป ✅`);
      }, i * 300);
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-5 h-full flex flex-col gap-5">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-glow">
          <Layers className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Photo Frame Studio</h1>
          <p className="text-sm text-muted-foreground">อัปโหลด Template กรอบรูป PNG → ใส่รูปของคุณ → ดาวน์โหลดได้เลย</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg border">
          <Info className="w-3.5 h-3.5 shrink-0" />
          <span>Template ควรเป็น PNG โปร่งใส — ส่วนกลางเปิดโล่งให้รูปโชว์ผ่าน</span>
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div className="flex gap-4 flex-1 min-h-0">

        {/* ── Left: Template Library ── */}
        <div className="w-52 shrink-0 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
              Templates ({contentTemplates.length})
            </p>
            <button
              onClick={() => templateInputRef.current?.click()}
              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> เพิ่ม
            </button>
            <input
              ref={templateInputRef}
              type="file"
              accept="image/png,image/webp,image/svg+xml"
              multiple
              className="hidden"
              onChange={handleTemplateUpload}
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5">
            {contentTemplates.length === 0 ? (
              <button
                onClick={() => templateInputRef.current?.click()}
                className="w-full border-2 border-dashed border-amber-200 rounded-xl p-5 flex flex-col items-center gap-2 text-muted-foreground hover:border-amber-400 hover:text-amber-600 transition-colors"
              >
                <Upload className="w-7 h-7 text-amber-300" />
                <p className="text-xs font-medium text-center leading-snug">
                  อัปโหลด Template<br />กรอบรูป PNG
                </p>
              </button>
            ) : (
              contentTemplates.map((t) => (
                <TemplateCard
                  key={t.template_id}
                  template={t}
                  selected={selectedId === t.template_id}
                  onSelect={() => setSelectedId(t.template_id)}
                  onDelete={() => handleDeleteTemplate(t.template_id)}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Right: Workspace ── */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">

          {!selectedTemplate ? (
            <div className="flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-muted-foreground gap-3">
              <Layers className="w-12 h-12 opacity-20" />
              <p className="text-sm font-medium">เลือก Template ก่อน</p>
              <p className="text-xs text-center max-w-xs">
                เพิ่ม Template กรอบรูป PNG ในคอลัมน์ซ้าย แล้วคลิกเลือก
              </p>
              <button
                onClick={() => templateInputRef.current?.click()}
                className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-all"
              >
                <Upload className="w-4 h-4" /> อัปโหลด Template
              </button>
            </div>
          ) : (
            <>
              {/* Top bar */}
              <div className="flex items-center gap-3 flex-wrap shrink-0">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-md overflow-hidden border shrink-0"
                    style={{
                      backgroundImage: "repeating-conic-gradient(#e5e7eb 0% 25%, #f9fafb 0% 50%)",
                      backgroundSize: "8px 8px",
                    }}
                  >
                    <img src={selectedTemplate.dataUrl} className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold leading-tight">{selectedTemplate.name}</p>
                    <p className="text-[10px] text-muted-foreground">{selectedTemplate.width}×{selectedTemplate.height}px</p>
                  </div>
                </div>

                <button
                  onClick={() => photoInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-violet-600 text-white hover:bg-violet-700 transition-all"
                >
                  <ImageIcon className="w-4 h-4" /> อัปโหลดรูปภาพ
                </button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handlePhotoUpload}
                />

                {photoFiles.length > 0 && (
                  <>
                    <span className="text-xs text-muted-foreground">{photoFiles.length} รูป</span>
                    <button
                      onClick={() => setPhotoFiles([])}
                      className="text-xs text-muted-foreground hover:text-red-500 underline transition-colors"
                    >
                      ล้างทั้งหมด
                    </button>
                  </>
                )}

                {photoFiles.length > 1 && (
                  <button
                    onClick={downloadAll}
                    className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-all"
                  >
                    <Download className="w-4 h-4" /> Download ทั้งหมด ({photoFiles.length} รูป)
                  </button>
                )}
              </div>

              {/* Drop zone / photo grid */}
              {photoFiles.length === 0 ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => photoInputRef.current?.click()}
                  className="flex-1 border-2 border-dashed border-violet-200 rounded-xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-violet-400 hover:bg-violet-50/30 dark:hover:bg-violet-950/10 transition-colors"
                >
                  <Upload className="w-12 h-12 text-violet-300" />
                  <p className="text-sm font-medium text-muted-foreground">คลิกหรือลากรูปมาวางที่นี่</p>
                  <p className="text-xs text-muted-foreground">รองรับ JPG, PNG, WEBP — เลือกหลายรูปพร้อมกันได้</p>
                </div>
              ) : (
                <div
                  className="flex-1 overflow-y-auto"
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {photoFiles.map((file, i) => (
                      <FramedPhotoCard
                        key={`${file.name}-${file.size}-${i}`}
                        ref={(el) => { cardRefs.current[i] = el; }}
                        photoFile={file}
                        template={selectedTemplate}
                        onRemove={() => removePhoto(i)}
                      />
                    ))}
                    {/* Add more button */}
                    <button
                      onClick={() => photoInputRef.current?.click()}
                      className="border-2 border-dashed border-violet-200 rounded-xl flex flex-col items-center justify-center gap-2 text-violet-400 hover:border-violet-400 hover:text-violet-600 transition-colors min-h-[120px]"
                    >
                      <Plus className="w-6 h-6" />
                      <span className="text-xs font-medium">เพิ่มรูป</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
