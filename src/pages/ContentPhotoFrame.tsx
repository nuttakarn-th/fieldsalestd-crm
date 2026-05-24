/**
 * ContentPhotoFrame.tsx — v3 Interactive Editor
 * - Per-photo independent TmplPos (cx/cy/scale/rotation/flipH/flipV)
 * - New photos inherit active photo's position
 * - Corner handles: drag to resize (center-fixed)
 * - Rotation circle handle above template
 * - Flip H / Flip V buttons
 * - Fixed 56px thumbnail height in template panel
 * - FolderGroup: pencil icon → inline rename
 */
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Layers, Upload, Trash2, Download, Plus, Check, ImageIcon, X,
  Folder, FolderOpen, ChevronRight, ChevronDown, ChevronUp,
  Maximize2, AlignCenter, Info, Pencil, RotateCcw,
  FlipHorizontal, FlipVertical, SlidersHorizontal,
} from "lucide-react";
import { useCRM, type ContentTemplate } from "@/store/crmStore";
import { toast } from "sonner";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface TmplPos {
  cx: number;       // center X in canvas pixel space
  cy: number;       // center Y in canvas pixel space
  scale: number;    // 0.05 → 5
  rotation: number; // radians
  flipH: boolean;
  flipV: boolean;
}

type DragMode = "none" | "move" | "resize-tl" | "resize-tr" | "resize-bl" | "resize-br" | "rotate";

interface DragState {
  mode: DragMode;
  startMx: number;
  startMy: number;
  startCx: number;
  startCy: number;
  startScale: number;
  startRotation: number;
  startAngle: number;   // for rotate: atan2(startMy-cy, startMx-cx)
  startDist: number;    // for resize: dist(center, startMouse)
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload  = () => res(img);
    img.onerror = () => rej(new Error("load failed"));
    img.src = src;
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload  = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

/** Rotate local point (lx,ly) around canvas origin (cx,cy) by angle */
function rotPoint(cx: number, cy: number, lx: number, ly: number, angle: number) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: cx + lx * cos - ly * sin, y: cy + lx * sin + ly * cos };
}

function defaultPos(): TmplPos {
  return { cx: 0, cy: 0, scale: 1, rotation: 0, flipH: false, flipV: false };
}

function fitFullPos(photo: HTMLImageElement, t: ContentTemplate): TmplPos {
  const scale = Math.max(photo.naturalWidth / t.width, photo.naturalHeight / t.height);
  return {
    cx: photo.naturalWidth  / 2,
    cy: photo.naturalHeight / 2,
    scale,
    rotation: 0,
    flipH: false,
    flipV: false,
  };
}

/** Get canvas-space corner points + rotation handle for a given TmplPos */
function getHandles(pos: TmplPos, t: ContentTemplate, r: number) {
  const { cx, cy, scale, rotation } = pos;
  const tw = t.width  * scale;
  const th = t.height * scale;
  // above-center handle offset in canvas px
  const d = 36 * r;
  const corners = [
    { ...rotPoint(cx, cy, -tw / 2, -th / 2, rotation), mode: "resize-tl" as DragMode },
    { ...rotPoint(cx, cy, +tw / 2, -th / 2, rotation), mode: "resize-tr" as DragMode },
    { ...rotPoint(cx, cy, -tw / 2, +th / 2, rotation), mode: "resize-bl" as DragMode },
    { ...rotPoint(cx, cy, +tw / 2, +th / 2, rotation), mode: "resize-br" as DragMode },
  ];
  // Rotation handle: above template top-center in rotated space
  const rotHandle = rotPoint(cx, cy, 0, -(th / 2 + d), rotation);
  return { corners, rotHandle, tw, th };
}

/** Test if canvas point (mx,my) is inside the template rectangle */
function hitInsideTemplate(mx: number, my: number, pos: TmplPos, t: ContentTemplate): boolean {
  const { cx, cy, scale, rotation } = pos;
  const tw = t.width  * scale / 2;
  const th = t.height * scale / 2;
  // Transform point to template-local space (rotate back)
  const dx = mx - cx;
  const dy = my - cy;
  const cos = Math.cos(-rotation);
  const sin = Math.sin(-rotation);
  const lx = dx * cos - dy * sin;
  const ly = dx * sin + dy * cos;
  return Math.abs(lx) <= tw && Math.abs(ly) <= th;
}

// ─────────────────────────────────────────────────────────────────────────────
// PhotoThumb
// ─────────────────────────────────────────────────────────────────────────────

function PhotoThumb({ file }: { file: File }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return src ? <img src={src} className="w-full h-full object-cover" alt="" /> : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// TemplateMiniCard — fixed 56px height thumbnail
// ─────────────────────────────────────────────────────────────────────────────

function TemplateMiniCard({
  template, selected, folders, onSelect, onDelete, onAssignFolder,
}: {
  template: ContentTemplate;
  selected: boolean;
  folders: string[];
  onSelect: () => void;
  onDelete: () => void;
  onAssignFolder: (folder: string) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [creatingNew, setCreatingNew] = useState(false);
  const [newName, setNewName] = useState("");

  function submitNew() {
    const name = newName.trim();
    if (!name) return;
    onAssignFolder(name);
    setShowMenu(false);
    setCreatingNew(false);
    setNewName("");
  }

  return (
    <div
      className={`relative rounded-lg border overflow-visible group transition-all ${
        selected
          ? "ring-2 ring-amber-500 border-amber-300 bg-amber-50/50 dark:bg-amber-950/20"
          : "hover:border-amber-300 border-border"
      }`}
    >
      {/* Fixed-height thumbnail (56px) */}
      <div
        onClick={onSelect}
        className="relative cursor-pointer overflow-hidden rounded-t-lg"
        style={{ height: 56 }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "repeating-conic-gradient(#e5e7eb 0% 25%, #f9fafb 0% 50%)",
            backgroundSize: "10px 10px",
          }}
        />
        <img src={template.dataUrl} className="absolute inset-0 w-full h-full object-contain" alt={template.name} />
        {selected && (
          <div className="absolute top-1 right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center shadow">
            <Check className="w-2.5 h-2.5 text-white" />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-1.5 py-1 flex items-center gap-1">
        <p className="text-[10px] font-semibold flex-1 truncate leading-tight">{template.name}</p>

        {/* Folder assign menu — always visible */}
        <div className="relative z-20">
          <button
            onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); setShowMenu(v => !v); }}
            title="ย้ายโฟล์เดอร์"
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-amber-100 hover:text-amber-600 active:bg-amber-100 active:text-amber-600 text-muted-foreground/60 transition-all touch-manipulation"
          >
            <Folder className="w-3 h-3" />
          </button>
          {showMenu && (
            <div className="absolute left-0 bottom-full mb-1 bg-popover border rounded-lg shadow-xl p-1 z-50 min-w-[150px] text-xs">
              <button
                onClick={() => { onAssignFolder(""); setShowMenu(false); }}
                className="w-full text-left px-2 py-1 rounded hover:bg-muted flex items-center gap-1.5"
              >
                <X className="w-3 h-3" /> ไม่มีโฟล์เดอร์
              </button>
              {folders.map(f => (
                <button
                  key={f}
                  onClick={() => { onAssignFolder(f); setShowMenu(false); }}
                  className="w-full text-left px-2 py-1 rounded hover:bg-muted flex items-center gap-1.5"
                >
                  <Folder className="w-3 h-3 text-amber-500" />
                  <span className="flex-1 truncate">{f}</span>
                  {template.folder === f && <Check className="w-3 h-3 text-amber-500 shrink-0" />}
                </button>
              ))}
              <div className="border-t my-1" />
              {!creatingNew ? (
                <button
                  onClick={() => setCreatingNew(true)}
                  className="w-full text-left px-2 py-1 rounded hover:bg-muted flex items-center gap-1.5 text-muted-foreground"
                >
                  <Plus className="w-3 h-3" /> โฟล์เดอร์ใหม่...
                </button>
              ) : (
                <div className="px-1 flex gap-1 items-center">
                  <input
                    autoFocus
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") submitNew();
                      if (e.key === "Escape") { setCreatingNew(false); setNewName(""); }
                    }}
                    className="flex-1 text-[11px] border rounded px-1 py-0.5 bg-background"
                    placeholder="ชื่อโฟล์เดอร์"
                  />
                  <button onClick={submitNew} className="text-amber-600 hover:text-amber-700">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); onDelete(); }}
          title="ลบ Template"
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-100 hover:text-red-500 active:bg-red-100 active:text-red-500 text-muted-foreground/60 transition-all touch-manipulation"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
      <p className="text-[9px] text-muted-foreground px-1.5 pb-1 leading-none">
        {template.width}×{template.height}
        {template.folder && <span className="ml-1 text-amber-500">📁 {template.folder}</span>}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FolderGroup — collapsible with pencil-icon rename for named folders
// ─────────────────────────────────────────────────────────────────────────────

function FolderGroup({
  label, open, onToggle, count, isNamed = false, onRename, children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  count: number;
  isNamed?: boolean;
  onRename?: (newName: string) => void;
  children: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(label);

  function confirm() {
    const n = editName.trim();
    if (n && n !== label && onRename) onRename(n);
    setEditing(false);
  }

  return (
    <div>
      <div className="flex items-center gap-0.5 group/folder">
        {/* Use div+role instead of button so <input> inside is valid HTML */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => { if (!editing) onToggle(); }}
          onKeyDown={e => { if (!editing && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onToggle(); } }}
          className="flex-1 flex items-center gap-1.5 px-1 py-1 rounded-lg hover:bg-muted/60 transition-colors text-left min-w-0 cursor-pointer select-none"
        >
          {open
            ? <ChevronDown  className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
            : <ChevronRight className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />}
          {isNamed
            ? <FolderOpen className="w-3.5 h-3.5 shrink-0 text-amber-500" />
            : <Folder     className="w-3.5 h-3.5 shrink-0 text-muted-foreground/50" />}
          {editing ? (
            <input
              autoFocus
              value={editName}
              onClick={e => e.stopPropagation()}
              onChange={e => setEditName(e.target.value)}
              onBlur={confirm}
              onKeyDown={e => {
                e.stopPropagation();
                if (e.key === "Enter") { e.preventDefault(); confirm(); }
                if (e.key === "Escape") { setEditing(false); setEditName(label); }
              }}
              className="flex-1 text-[11px] font-semibold bg-background border border-amber-400 rounded px-1.5 py-0.5 min-w-0 outline-none ring-1 ring-amber-400"
            />
          ) : (
            <span className="text-[11px] font-semibold flex-1 truncate">{label}</span>
          )}
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full shrink-0">{count}</span>
        </div>

        {/* Pencil rename — always visible on touch, hover-only on desktop */}
        {isNamed && onRename && !editing && (
          <button
            onPointerDown={e => { e.stopPropagation(); e.preventDefault(); setEditName(label); setEditing(true); }}
            title="เปลี่ยนชื่อโฟล์เดอร์"
            className="opacity-100 md:opacity-0 md:group-hover/folder:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-amber-100 hover:text-amber-600 active:bg-amber-100 active:text-amber-600 text-muted-foreground transition-all shrink-0 touch-manipulation"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {open && <div className="mt-1.5 space-y-1.5 pl-1">{children}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function ContentPhotoFrame() {
  const { contentTemplates, addContentTemplate, updateContentTemplate, deleteContentTemplate } = useCRM();

  // ── State ──────────────────────────────────────────────────────────────────
  const [selectedId,      setSelectedId]      = useState<string | null>(contentTemplates[0]?.template_id ?? null);
  const [photoFiles,      setPhotoFiles]      = useState<File[]>([]);
  const [activeIdx,       setActiveIdx]       = useState(0);
  // Per-photo positions (undefined = not yet initialized for that photo)
  const [photoPositions,  setPhotoPositions]  = useState<(TmplPos | undefined)[]>([]);
  const [openFolders,     setOpenFolders]     = useState<Set<string>>(new Set(["__none__"]));
  const [drawTick,        setDrawTick]        = useState(0);
  const [showTemplatePanel,   setShowTemplatePanel]   = useState(false);
  const [showToolbar,         setShowToolbar]         = useState(true);
  const [showUploadMenu,      setShowUploadMenu]      = useState(false);
  const [uploadCreatingFolder, setUploadCreatingFolder] = useState(false);
  const [uploadNewFolderName,  setUploadNewFolderName]  = useState("");
  const uploadFolderRef = useRef<string | undefined>(undefined);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const editorRef        = useRef<HTMLCanvasElement>(null);
  const photoImgRef      = useRef<HTMLImageElement | null>(null);
  const templateImgRef   = useRef<HTMLImageElement | null>(null);
  const templateInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef    = useRef<HTMLInputElement>(null);
  const dragRef          = useRef<DragState>({
    mode: "none", startMx: 0, startMy: 0, startCx: 0, startCy: 0,
    startScale: 1, startRotation: 0, startAngle: 0, startDist: 0,
  });

  // ── Derived ────────────────────────────────────────────────────────────────
  const selectedTemplate = contentTemplates.find(t => t.template_id === selectedId) ?? null;
  const activePhoto      = photoFiles[activeIdx] ?? null;
  // Current active photo's position (undefined if not initialized)
  const curPos: TmplPos  = photoPositions[activeIdx] ?? defaultPos();
  const { cx, cy, scale, rotation, flipH, flipV } = curPos;

  const folders = useMemo(() => {
    const s = new Set<string>();
    contentTemplates.forEach(t => { if (t.folder) s.add(t.folder); });
    return Array.from(s).sort();
  }, [contentTemplates]);

  const grouped = useMemo(() => {
    const g: Record<string, ContentTemplate[]> = {};
    contentTemplates.forEach(t => {
      const k = t.folder ?? "__none__";
      (g[k] ??= []).push(t);
    });
    return g;
  }, [contentTemplates]);

  // ── Setter for current photo's position ────────────────────────────────────
  function setPos(patch: Partial<TmplPos>) {
    setPhotoPositions(prev => {
      const arr = [...prev];
      arr[activeIdx] = { ...(arr[activeIdx] ?? defaultPos()), ...patch };
      return arr;
    });
  }

  // ── Auto-select first template ─────────────────────────────────────────────
  useEffect(() => {
    if (!selectedId && contentTemplates.length > 0) setSelectedId(contentTemplates[0].template_id);
  }, [contentTemplates, selectedId]);

  // ── Load template image ────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedTemplate) {
      templateImgRef.current = null;
      // Reset all photo positions when template removed
      setPhotoPositions(prev => prev.map(() => undefined));
      setDrawTick(v => v + 1);
      return;
    }
    loadImg(selectedTemplate.dataUrl).then(img => {
      templateImgRef.current = img;
      // Reset all positions; active photo gets fitFullPos
      setPhotoPositions(prev => prev.map((_, i) => {
        if (i === activeIdx && photoImgRef.current) {
          return fitFullPos(photoImgRef.current, selectedTemplate);
        }
        return undefined; // will be fitFullPos'd when that photo is activated
      }));
      setDrawTick(v => v + 1);
    }).catch(() => { templateImgRef.current = null; setDrawTick(v => v + 1); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // ── Load active photo image ────────────────────────────────────────────────
  useEffect(() => {
    if (!activePhoto) { photoImgRef.current = null; setDrawTick(v => v + 1); return; }
    const url = URL.createObjectURL(activePhoto);
    loadImg(url)
      .then(img => {
        photoImgRef.current = img;
        // Only apply fitFullPos if this photo's position is not yet initialized
        setPhotoPositions(prev => {
          if (prev[activeIdx] !== undefined) return prev; // already has a position
          const arr = [...prev];
          arr[activeIdx] = selectedTemplate
            ? fitFullPos(img, selectedTemplate)
            : { cx: img.naturalWidth / 2, cy: img.naturalHeight / 2, scale: 1, rotation: 0, flipH: false, flipV: false };
          return arr;
        });
        setDrawTick(v => v + 1);
      })
      .catch(() => {})
      .finally(() => URL.revokeObjectURL(url));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePhoto]);

  // ── Canvas ratio helper ────────────────────────────────────────────────────
  function canvasR() {
    const c = editorRef.current;
    if (!c) return 1;
    const rect = c.getBoundingClientRect();
    return rect.width > 0 ? c.width / rect.width : 1;
  }

  // ── Canvas draw effect ─────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = editorRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const photo = photoImgRef.current;
    const frame = templateImgRef.current;

    if (!photo) {
      canvas.width = 1280; canvas.height = 720;
      ctx.fillStyle = "#111827";
      ctx.fillRect(0, 0, 1280, 720);
      return;
    }

    canvas.width  = photo.naturalWidth;
    canvas.height = photo.naturalHeight;

    // 1. Draw background photo
    ctx.drawImage(photo, 0, 0);

    // 2. Draw template with full transforms
    if (frame && selectedTemplate) {
      const tw = selectedTemplate.width  * scale;
      const th = selectedTemplate.height * scale;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotation);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      ctx.drawImage(frame, -tw / 2, -th / 2, tw, th);
      ctx.restore();

      // 3. Draw selection border (dashed, in rotated space)
      const r    = canvasR();
      const lw   = Math.max(2, 2 * r);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotation);
      ctx.setLineDash([lw * 3.5, lw * 1.5]);
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.shadowColor  = "rgba(0,0,0,0.5)";
      ctx.shadowBlur   = lw * 2;
      ctx.lineWidth = lw;
      ctx.strokeRect(-tw / 2, -th / 2, tw, th);
      ctx.shadowBlur = 0;
      ctx.setLineDash([]);
      ctx.restore();

      // 4. Corner squares + rotation handle
      const { corners, rotHandle } = getHandles(curPos, selectedTemplate, r);
      const hs = lw * 3.5;

      // Corner squares (resize handles)
      ctx.fillStyle = "rgba(99,102,241,0.95)";
      corners.forEach(c2 => {
        ctx.fillRect(c2.x - hs / 2, c2.y - hs / 2, hs, hs);
      });

      // Line from top-center of template to rotation handle
      const topCenter = rotPoint(cx, cy, 0, -th / 2, rotation);
      ctx.beginPath();
      ctx.moveTo(topCenter.x, topCenter.y);
      ctx.lineTo(rotHandle.x, rotHandle.y);
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = lw;
      ctx.stroke();

      // Rotation circle
      const rotRadius = hs * 1.3;
      ctx.beginPath();
      ctx.arc(rotHandle.x, rotHandle.y, rotRadius, 0, 2 * Math.PI);
      ctx.fillStyle = "rgba(139,92,246,0.95)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.lineWidth = lw * 0.6;
      ctx.stroke();

      // Rotation arrow symbol inside circle
      ctx.save();
      ctx.translate(rotHandle.x, rotHandle.y);
      ctx.strokeStyle = "white";
      ctx.lineWidth = lw * 0.8;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(0, 0, rotRadius * 0.45, -Math.PI * 0.15, Math.PI * 1.3);
      ctx.stroke();
      // Arrow tip
      const tipAngle = Math.PI * 1.3;
      const tipX = rotRadius * 0.45 * Math.cos(tipAngle);
      const tipY = rotRadius * 0.45 * Math.sin(tipAngle);
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(tipX - lw * 1.5, tipY - lw * 1.5);
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(tipX + lw * 1.5, tipY - lw * 1.5);
      ctx.stroke();
      ctx.restore();
    }
  }, [drawTick, cx, cy, scale, rotation, flipH, flipV, selectedTemplate, activeIdx]);

  // ── Fit / Center helpers ───────────────────────────────────────────────────
  function handleFitFull() {
    if (!photoImgRef.current || !selectedTemplate) return;
    setPos(fitFullPos(photoImgRef.current, selectedTemplate));
  }

  function handleCenter() {
    if (!photoImgRef.current) return;
    setPos({ cx: photoImgRef.current.naturalWidth / 2, cy: photoImgRef.current.naturalHeight / 2 });
  }

  function handleResetTransform() {
    setPos({ rotation: 0, flipH: false, flipV: false });
  }

  // ── Canvas coordinate helper ───────────────────────────────────────────────
  function canvasXY(e: React.MouseEvent<HTMLCanvasElement>) {
    const c = editorRef.current!;
    const r = c.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (c.width  / r.width),
      y: (e.clientY - r.top)  * (c.height / r.height),
    };
  }

  // ── Mouse interaction ──────────────────────────────────────────────────────
  function onMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!selectedTemplate) return;
    const { x, y } = canvasXY(e);
    const r   = canvasR();
    const lw  = Math.max(2, 2 * r);
    const hs  = lw * 3.5 * 1.5; // hit radius for handles (1.5x visual size)

    const { corners, rotHandle } = getHandles(curPos, selectedTemplate, r);

    // Check rotation handle first
    if (dist(x, y, rotHandle.x, rotHandle.y) < hs * 1.5) {
      dragRef.current = {
        mode: "rotate",
        startMx: x, startMy: y,
        startCx: cx, startCy: cy,
        startScale: scale, startRotation: rotation,
        startAngle: Math.atan2(y - cy, x - cx),
        startDist: 0,
      };
      return;
    }

    // Check corner handles
    for (const corner of corners) {
      if (dist(x, y, corner.x, corner.y) < hs) {
        dragRef.current = {
          mode: corner.mode,
          startMx: x, startMy: y,
          startCx: cx, startCy: cy,
          startScale: scale, startRotation: rotation,
          startAngle: 0,
          startDist: dist(cx, cy, x, y),
        };
        return;
      }
    }

    // Check inside template for move
    if (hitInsideTemplate(x, y, curPos, selectedTemplate)) {
      dragRef.current = {
        mode: "move",
        startMx: x, startMy: y,
        startCx: cx, startCy: cy,
        startScale: scale, startRotation: rotation,
        startAngle: 0, startDist: 0,
      };
    }
  }

  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const { x, y } = canvasXY(e);
    const d = dragRef.current;

    if (!selectedTemplate) return;

    // Update cursor when not dragging
    if (d.mode === "none") {
      const r   = canvasR();
      const lw  = Math.max(2, 2 * r);
      const hs  = lw * 3.5 * 1.5;
      const { corners, rotHandle } = getHandles(curPos, selectedTemplate, r);

      if (dist(x, y, rotHandle.x, rotHandle.y) < hs * 1.5) {
        editorRef.current!.style.cursor = "crosshair";
      } else if (corners.some(c2 => dist(x, y, c2.x, c2.y) < hs)) {
        editorRef.current!.style.cursor = "nwse-resize";
      } else if (hitInsideTemplate(x, y, curPos, selectedTemplate)) {
        editorRef.current!.style.cursor = "grab";
      } else {
        editorRef.current!.style.cursor = "crosshair";
      }
      return;
    }

    editorRef.current!.style.cursor = d.mode === "move" ? "grabbing" : d.mode === "rotate" ? "crosshair" : "nwse-resize";

    if (d.mode === "move") {
      setPos({ cx: d.startCx + (x - d.startMx), cy: d.startCy + (y - d.startMy) });
    } else if (d.mode.startsWith("resize-")) {
      const currDist = dist(d.startCx, d.startCy, x, y);
      if (d.startDist > 0) {
        const newScale = Math.max(0.05, Math.min(5, d.startScale * currDist / d.startDist));
        setPos({ scale: newScale });
      }
    } else if (d.mode === "rotate") {
      const currAngle = Math.atan2(y - d.startCy, x - d.startCx);
      const newRotation = d.startRotation + (currAngle - d.startAngle);
      setPos({ rotation: newRotation });
    }
  }

  function onMouseUp()    { dragRef.current.mode = "none"; }
  function onMouseLeave() {
    dragRef.current.mode = "none";
    if (editorRef.current) editorRef.current.style.cursor = "crosshair";
  }

  // ── Touch support for canvas ───────────────────────────────────────────────
  function touchXY(e: React.TouchEvent<HTMLCanvasElement>) {
    const t = e.touches[0];
    const c = editorRef.current!;
    const r = c.getBoundingClientRect();
    return { x: (t.clientX - r.left) * (c.width / r.width), y: (t.clientY - r.top) * (c.height / r.height) };
  }

  function onTouchStart(e: React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const t = e.touches[0];
    // Pass raw clientX/Y — onMouseDown will call canvasXY() to convert
    onMouseDown({ clientX: t.clientX, clientY: t.clientY } as unknown as React.MouseEvent<HTMLCanvasElement>);
  }

  function onTouchMove(e: React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const t = e.touches[0];
    // Pass raw clientX/Y — onMouseMove will call canvasXY() to convert
    onMouseMove({ clientX: t.clientX, clientY: t.clientY } as unknown as React.MouseEvent<HTMLCanvasElement>);
  }

  function onTouchEnd() { onMouseUp(); }

  // ── Upload: Templates ──────────────────────────────────────────────────────
  async function onTemplateUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    const folder = uploadFolderRef.current; // folder chosen before file picker opened
    for (const file of files) {
      if (file.size > 8 * 1024 * 1024) { toast.error(`"${file.name}" ใหญ่เกิน 8MB`); continue; }
      const dataUrl = await fileToDataUrl(file).catch(() => null);
      if (!dataUrl) continue;
      const img = await loadImg(dataUrl).catch(() => null);
      addContentTemplate({
        name:   file.name.replace(/\.[^.]+$/, ""),
        dataUrl,
        width:  img?.naturalWidth  ?? 1080,
        height: img?.naturalHeight ?? 1080,
        folder,
      });
      toast.success(`เพิ่ม "${file.name.replace(/\.[^.]+$/, "")}"${folder ? ` → 📁 ${folder}` : ""} ✅`);
    }
    // Auto-open the target folder so user can see the new templates
    if (folder) {
      setOpenFolders(prev => new Set([...prev, folder]));
    }
  }

  // ── Trigger upload after folder is chosen ─────────────────────────────────
  function triggerUpload(folder: string | undefined) {
    uploadFolderRef.current = folder;
    setShowUploadMenu(false);
    setUploadCreatingFolder(false);
    setUploadNewFolderName("");
    templateInputRef.current?.click();
  }

  // ── Upload: Photos (inherits current position) ─────────────────────────────
  function onPhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    const inheritPos = photoPositions[activeIdx]; // may be undefined if no current photo
    const startIdx   = photoFiles.length;
    setPhotoFiles(prev => [...prev, ...files]);
    setPhotoPositions(prev => [
      ...prev,
      ...files.map(() => inheritPos ? { ...inheritPos } : undefined),
    ]);
    setActiveIdx(startIdx);
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
    if (!files.length) return;
    const inheritPos = photoPositions[activeIdx];
    const startIdx   = photoFiles.length;
    setPhotoFiles(prev => [...prev, ...files]);
    setPhotoPositions(prev => [...prev, ...files.map(() => inheritPos ? { ...inheritPos } : undefined)]);
    setActiveIdx(startIdx);
  }, [photoFiles.length, photoPositions, activeIdx]);

  // ── Download ───────────────────────────────────────────────────────────────
  async function downloadOne(file: File, posIdx: number) {
    if (!templateImgRef.current || !selectedTemplate) { toast.error("เลือก Template ก่อน"); return; }
    const url = URL.createObjectURL(file);
    const photo = await loadImg(url).catch(() => null);
    URL.revokeObjectURL(url);
    if (!photo) { toast.error("โหลดรูปไม่ได้"); return; }

    // Use this photo's position, falling back to fitFullPos
    let pos = photoPositions[posIdx] ?? fitFullPos(photo, selectedTemplate);

    const c   = document.createElement("canvas");
    c.width   = photo.naturalWidth;
    c.height  = photo.naturalHeight;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(photo, 0, 0);

    const tw = selectedTemplate.width  * pos.scale;
    const th = selectedTemplate.height * pos.scale;
    ctx.save();
    ctx.translate(pos.cx, pos.cy);
    ctx.rotate(pos.rotation);
    ctx.scale(pos.flipH ? -1 : 1, pos.flipV ? -1 : 1);
    ctx.drawImage(templateImgRef.current, -tw / 2, -th / 2, tw, th);
    ctx.restore();

    const a    = document.createElement("a");
    a.download = `framed_${file.name.replace(/\.[^.]+$/, "")}.png`;
    a.href     = c.toDataURL("image/png");
    a.click();
  }

  async function downloadAll() {
    if (!photoFiles.length) return;
    toast.info(`กำลัง Download ${photoFiles.length} รูป...`);
    for (let i = 0; i < photoFiles.length; i++) {
      if (i > 0) await new Promise(r => setTimeout(r, 350));
      await downloadOne(photoFiles[i], i);
    }
    toast.success(`Download ครบ ${photoFiles.length} รูป ✅`);
  }

  // ── Folder helpers ─────────────────────────────────────────────────────────
  function toggleFolder(key: string) {
    setOpenFolders(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function handleRenameFolder(oldName: string, newName: string) {
    contentTemplates
      .filter(t => t.folder === oldName)
      .forEach(t => updateContentTemplate(t.template_id, { folder: newName }));
    setOpenFolders(prev => {
      const next = new Set(prev);
      if (next.has(oldName)) { next.delete(oldName); next.add(newName); }
      return next;
    });
    toast.success(`เปลี่ยนชื่อโฟล์เดอร์เป็น "${newName}" ✅`);
  }

  function handleDeleteTemplate(id: string) {
    deleteContentTemplate(id);
    if (selectedId === id) setSelectedId(contentTemplates.find(t => t.template_id !== id)?.template_id ?? null);
    toast.success("ลบ Template แล้ว");
  }

  // ── Computed display info ──────────────────────────────────────────────────
  const pw = photoImgRef.current?.naturalWidth  ?? 0;
  const ph = photoImgRef.current?.naturalHeight ?? 0;
  const tw = selectedTemplate ? Math.round(selectedTemplate.width  * scale) : 0;
  const th = selectedTemplate ? Math.round(selectedTemplate.height * scale) : 0;
  const rotDeg = (rotation * 180 / Math.PI).toFixed(1);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div
      className="relative flex overflow-hidden bg-background"
      style={{ height: "calc(100vh - 56px)" }}
    >
      {/* Mobile backdrop */}
      {showTemplatePanel && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setShowTemplatePanel(false)}
        />
      )}

      {/* ══════════════ LEFT: Template Library ══════════════ */}
      <div className={`absolute md:relative inset-y-0 left-0 z-50 md:z-auto w-64 md:w-52 shrink-0 border-r bg-card flex flex-col overflow-hidden transition-transform duration-300 ${
        showTemplatePanel ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      }`}>

        {/* Header */}
        <div className="px-3 py-2.5 border-b flex items-center justify-between shrink-0">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
            Templates ({contentTemplates.length})
          </p>
          <div className="flex items-center gap-1">

            {/* ── Upload + folder picker ── */}
            <div className="relative">
              <button
                onPointerDown={e => { e.preventDefault(); setShowUploadMenu(v => !v); setUploadCreatingFolder(false); setUploadNewFolderName(""); }}
                className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg bg-amber-500 text-white hover:bg-amber-600 active:bg-amber-600 transition-all touch-manipulation"
              >
                <Plus className="w-3 h-3" /> เพิ่ม
              </button>

              {showUploadMenu && (
                <>
                  {/* backdrop to close */}
                  <div className="fixed inset-0 z-40" onPointerDown={() => { setShowUploadMenu(false); setUploadCreatingFolder(false); }} />
                  <div className="absolute right-0 top-full mt-1 bg-popover border rounded-xl shadow-xl p-1.5 z-50 min-w-[190px] text-xs">
                    <p className="px-2 py-1 text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">เลือกโฟล์เดอร์</p>

                    {/* Existing folders */}
                    {folders.map(f => (
                      <button
                        key={f}
                        onPointerDown={e => { e.stopPropagation(); triggerUpload(f); }}
                        className="w-full text-left px-2 py-2 rounded-lg hover:bg-amber-50 active:bg-amber-50 hover:text-amber-700 flex items-center gap-2 touch-manipulation"
                      >
                        <FolderOpen className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="flex-1 truncate">{f}</span>
                      </button>
                    ))}

                    {/* Create new folder */}
                    <div className="border-t my-1" />
                    {!uploadCreatingFolder ? (
                      <button
                        onPointerDown={e => { e.stopPropagation(); setUploadCreatingFolder(true); }}
                        className="w-full text-left px-2 py-2 rounded-lg hover:bg-muted active:bg-muted flex items-center gap-2 text-muted-foreground touch-manipulation"
                      >
                        <Plus className="w-3.5 h-3.5" /> สร้างโฟล์เดอร์ใหม่...
                      </button>
                    ) : (
                      <div className="px-1 flex gap-1 items-center">
                        <input
                          autoFocus
                          value={uploadNewFolderName}
                          onChange={e => setUploadNewFolderName(e.target.value)}
                          onKeyDown={e => {
                            e.stopPropagation();
                            if (e.key === "Enter" && uploadNewFolderName.trim()) triggerUpload(uploadNewFolderName.trim());
                            if (e.key === "Escape") { setUploadCreatingFolder(false); setUploadNewFolderName(""); }
                          }}
                          className="flex-1 text-[11px] border border-amber-400 rounded-lg px-2 py-1 bg-background outline-none"
                          placeholder="ชื่อโฟล์เดอร์"
                        />
                        <button
                          onPointerDown={e => { e.stopPropagation(); if (uploadNewFolderName.trim()) triggerUpload(uploadNewFolderName.trim()); }}
                          className="w-6 h-6 flex items-center justify-center rounded-lg bg-amber-500 text-white hover:bg-amber-600 active:bg-amber-600 touch-manipulation"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setShowTemplatePanel(false)}
              className="md:hidden w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted transition-all text-muted-foreground"
              title="ปิด"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <input
            ref={templateInputRef}
            type="file"
            accept="image/png,image/webp,image/svg+xml"
            multiple
            className="hidden"
            onChange={onTemplateUpload}
          />
        </div>

        {/* Template list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {contentTemplates.length === 0 ? (
            <button
              onClick={() => triggerUpload(undefined)}
              className="w-full border-2 border-dashed border-amber-200 rounded-xl p-5 flex flex-col items-center gap-2 text-muted-foreground hover:border-amber-400 transition-colors"
            >
              <Upload className="w-7 h-7 text-amber-300" />
              <p className="text-xs text-center leading-snug">อัปโหลด Template<br />กรอบรูป PNG</p>
            </button>
          ) : (
            <>
              {/* Uncategorized */}
              {(grouped["__none__"] ?? []).length > 0 && (
                <FolderGroup
                  label="ไม่มีโฟล์เดอร์"
                  open={openFolders.has("__none__")}
                  onToggle={() => toggleFolder("__none__")}
                  count={grouped["__none__"].length}
                >
                  {grouped["__none__"].map(t => (
                    <TemplateMiniCard
                      key={t.template_id}
                      template={t}
                      selected={selectedId === t.template_id}
                      folders={folders}
                      onSelect={() => setSelectedId(t.template_id)}
                      onDelete={() => handleDeleteTemplate(t.template_id)}
                      onAssignFolder={folder =>
                        updateContentTemplate(t.template_id, { folder: folder || undefined })
                      }
                    />
                  ))}
                </FolderGroup>
              )}

              {/* Named folders */}
              {folders.map(folder => (
                <FolderGroup
                  key={folder}
                  label={folder}
                  open={openFolders.has(folder)}
                  onToggle={() => toggleFolder(folder)}
                  count={grouped[folder]?.length ?? 0}
                  isNamed
                  onRename={newName => handleRenameFolder(folder, newName)}
                >
                  {(grouped[folder] ?? []).map(t => (
                    <TemplateMiniCard
                      key={t.template_id}
                      template={t}
                      selected={selectedId === t.template_id}
                      folders={folders}
                      onSelect={() => setSelectedId(t.template_id)}
                      onDelete={() => handleDeleteTemplate(t.template_id)}
                      onAssignFolder={f =>
                        updateContentTemplate(t.template_id, { folder: f || undefined })
                      }
                    />
                  ))}
                </FolderGroup>
              ))}
            </>
          )}
        </div>
      </div>

      {/* ══════════════ RIGHT: Editor Workspace ══════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* ── Toolbar ── */}
        <div className={`shrink-0 border-b bg-card transition-all duration-200 ${showToolbar ? "block" : "hidden"}`}>
          <div className="px-3 py-2 flex items-center gap-2 overflow-x-auto">

          {/* Mobile: Templates toggle */}
          <button
            onClick={() => setShowTemplatePanel(v => !v)}
            className="md:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-100 text-amber-700 hover:bg-amber-200 active:bg-amber-200 transition-all shrink-0 touch-manipulation"
          >
            <Layers className="w-3.5 h-3.5" /> Templates
          </button>
          <div className="w-px h-5 bg-border shrink-0 md:hidden" />

          {/* Template chip */}
          {selectedTemplate ? (
            <div className="flex items-center gap-2 shrink-0">
              <div
                className="w-6 h-6 rounded border overflow-hidden shrink-0"
                style={{ backgroundImage: "repeating-conic-gradient(#e5e7eb 0% 25%, #f9fafb 0% 50%)", backgroundSize: "6px 6px" }}
              >
                <img src={selectedTemplate.dataUrl} className="w-full h-full object-contain" alt="" />
              </div>
              <span className="text-xs font-semibold text-muted-foreground max-w-[90px] truncate">
                {selectedTemplate.name}
              </span>
            </div>
          ) : (
            <span className="text-xs text-amber-600 font-medium">⚠️ เลือก Template</span>
          )}

          <div className="w-px h-5 bg-border shrink-0" />

          {/* Upload photos */}
          <button
            onClick={() => photoInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 text-white hover:bg-violet-700 transition-all shrink-0"
          >
            <ImageIcon className="w-3.5 h-3.5" /> อัปโหลดรูปภาพ
          </button>
          <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={onPhotoUpload} />

          {/* Controls — shown when photo + template are loaded */}
          {pw > 0 && selectedTemplate && (
            <>
              <div className="w-px h-5 bg-border shrink-0" />

              {/* Scale slider */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted-foreground font-medium hidden sm:inline">ขนาด</span>
                <input
                  type="range" min="0.05" max="5" step="0.005"
                  value={scale}
                  onChange={e => setPos({ scale: parseFloat(e.target.value) })}
                  className="w-24 accent-violet-600"
                />
                <span className="text-xs font-bold w-10 text-right tabular-nums">
                  {(scale * 100).toFixed(0)}%
                </span>
              </div>

              <div className="w-px h-5 bg-border shrink-0" />

              {/* Flip H */}
              <button
                onClick={() => setPos({ flipH: !flipH })}
                title="Flip แนวนอน"
                className={`flex items-center gap-1 text-xs font-medium px-2 py-1.5 rounded-lg transition-all shrink-0 ${
                  flipH ? "bg-violet-600 text-white" : "bg-muted hover:bg-accent"
                }`}
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Flip H</span>
              </button>

              {/* Flip V */}
              <button
                onClick={() => setPos({ flipV: !flipV })}
                title="Flip แนวตั้ง"
                className={`flex items-center gap-1 text-xs font-medium px-2 py-1.5 rounded-lg transition-all shrink-0 ${
                  flipV ? "bg-violet-600 text-white" : "bg-muted hover:bg-accent"
                }`}
              >
                <FlipVertical className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Flip V</span>
              </button>

              {/* Reset rotation/flip */}
              {(rotation !== 0 || flipH || flipV) && (
                <button
                  onClick={handleResetTransform}
                  title="Reset rotation และ flip"
                  className="flex items-center gap-1 text-xs font-medium px-2 py-1.5 rounded-lg bg-muted hover:bg-accent transition-all shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{rotDeg}°</span>
                </button>
              )}

              <div className="w-px h-5 bg-border shrink-0" />

              {/* Fit full */}
              <button
                onClick={handleFitFull}
                title="ขยาย Template ให้คลุมภาพ"
                className="flex items-center gap-1 text-xs font-medium px-2 py-1.5 rounded-lg bg-muted hover:bg-accent transition-all shrink-0"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">เต็มภาพ</span>
              </button>

              {/* Center */}
              <button
                onClick={handleCenter}
                title="วาง Template ตรงกลาง"
                className="flex items-center gap-1 text-xs font-medium px-2 py-1.5 rounded-lg bg-muted hover:bg-accent transition-all shrink-0"
              >
                <AlignCenter className="w-3.5 h-3.5" />
                <span className="hidden md:inline">กลาง</span>
              </button>

              {/* Position info */}
              <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums hidden lg:inline">
                {tw}×{th} / {pw}×{ph}px
              </span>
            </>
          )}

          {/* Download All */}
          {photoFiles.length > 0 && selectedTemplate && (
            <button
              onClick={downloadAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-700 transition-all shrink-0 touch-manipulation"
            >
              <Download className="w-3.5 h-3.5" /> Download ({photoFiles.length})
            </button>
          )}

          {/* Hide toolbar button — far right */}
          <button
            onClick={() => setShowToolbar(false)}
            title="ซ่อนเครื่องมือ"
            className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg hover:bg-muted active:bg-muted transition-all shrink-0 touch-manipulation"
          >
            <ChevronUp className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ซ่อน</span>
          </button>
          </div>
        </div>

        {/* ── Canvas editor ── */}
        <div
          className="flex-1 min-h-0 bg-[#111827] flex items-center justify-center relative overflow-hidden"
          onDrop={onDrop}
          onDragOver={e => e.preventDefault()}
        >
          {/* Floating pill — show toolbar when hidden */}
          {!showToolbar && (
            <button
              onClick={() => setShowToolbar(true)}
              className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-sm text-white text-xs font-medium shadow-lg hover:bg-black/90 active:bg-black/90 transition-all touch-manipulation"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              เครื่องมือ
            </button>
          )}
          {/* Upload prompt when no photo */}
          {!activePhoto && (
            <div
              onClick={() => photoInputRef.current?.click()}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 cursor-pointer text-white/40 hover:text-white/60 transition-colors"
            >
              <Upload className="w-14 h-14" />
              <p className="text-base font-medium">คลิกหรือลากรูปภาพมาวางที่นี่</p>
              {!selectedTemplate && (
                <p className="text-sm opacity-60">เลือก Template ในคอลัมน์ซ้ายก่อน</p>
              )}
            </div>
          )}

          <canvas
            ref={editorRef}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              width: "auto",
              height: "auto",
              cursor: "crosshair",
              display: activePhoto ? "block" : "none",
            }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseLeave}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          />

          {/* Hint overlay */}
          {activePhoto && selectedTemplate && pw > 0 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm text-white text-[11px] px-3 py-1.5 rounded-full pointer-events-none flex items-center gap-1.5 whitespace-nowrap">
              <Info className="w-3 h-3 shrink-0" />
              ลากกรอบ=ขยับ · มุม=ปรับขนาด · วงกลมม่วง=หมุน · Slider=ขนาด
            </div>
          )}
        </div>

        {/* ── Photo thumbnail strip ── */}
        {photoFiles.length > 0 && (
          <div className="shrink-0 border-t bg-card px-3 py-2 flex items-center gap-2 overflow-x-auto">
            {photoFiles.map((f, i) => (
              <div
                key={`${f.name}-${f.size}-${i}`}
                onClick={() => setActiveIdx(i)}
                className={`shrink-0 relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                  activeIdx === i
                    ? "border-violet-500 ring-1 ring-violet-400 shadow-md"
                    : "border-transparent hover:border-violet-300"
                }`}
                style={{ width: 76, height: 56 }}
              >
                <PhotoThumb file={f} />

                {/* Individual download */}
                <button
                  onClick={async e => {
                    e.stopPropagation();
                    await downloadOne(f, i);
                    toast.success(`Download "${f.name}" แล้ว ✅`);
                  }}
                  className="absolute bottom-0.5 right-0.5 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-emerald-700"
                >
                  <Download className="w-2.5 h-2.5" />
                </button>

                {/* Remove */}
                <button
                  onClick={e => {
                    e.stopPropagation();
                    setPhotoFiles(prev => prev.filter((_, j) => j !== i));
                    setPhotoPositions(prev => prev.filter((_, j) => j !== i));
                    setActiveIdx(Math.max(0, i === activeIdx ? i - 1 : activeIdx > i ? activeIdx - 1 : activeIdx));
                  }}
                  className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600"
                >
                  <X className="w-2.5 h-2.5" />
                </button>

                {activeIdx === i && (
                  <div className="absolute inset-0 border-2 border-violet-400 rounded-lg pointer-events-none" />
                )}
              </div>
            ))}

            {/* Add more */}
            <button
              onClick={() => photoInputRef.current?.click()}
              className="shrink-0 border-2 border-dashed border-violet-200 rounded-lg flex flex-col items-center justify-center gap-1 text-violet-400 hover:border-violet-400 hover:text-violet-600 transition-colors"
              style={{ width: 76, height: 56 }}
            >
              <Plus className="w-5 h-5" />
              <span className="text-[9px]">เพิ่มรูป</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
