/**
 * ContentPhotoFrame.tsx — v2 Interactive Editor
 * - ลากกรอบรูป (Template) เพื่อขยับตำแหน่ง
 * - Scale slider ปรับขนาด Template
 * - ปุ่ม "เต็มภาพ" (Fit Full) และ "ตรงกลาง"
 * - Template Library แบบโฟล์เดอร์ที่ตั้งชื่อได้
 */
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Layers, Upload, Trash2, Download, Plus, Check, ImageIcon, X,
  Folder, FolderOpen, ChevronRight, ChevronDown,
  Maximize2, AlignCenter, Info,
} from "lucide-react";
import { useCRM, type ContentTemplate } from "@/store/crmStore";
import { toast } from "sonner";

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

// ─────────────────────────────────────────────────────────────────────────────
// PhotoThumb — renders a File as <img> via objectURL
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
// TemplateMiniCard — thumbnail card with folder assignment dropdown
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
      {/* Thumbnail */}
      <div
        onClick={onSelect}
        className="relative cursor-pointer overflow-hidden rounded-t-lg"
        style={{ aspectRatio: `${template.width}/${template.height}` }}
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

        {/* Folder assign menu */}
        <div className="relative z-20">
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(v => !v); }}
            title="ย้ายโฟล์เดอร์"
            className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center rounded hover:text-amber-600 text-muted-foreground transition-all"
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
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center rounded hover:text-red-500 text-muted-foreground transition-all"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
      <p className="text-[9px] text-muted-foreground px-1.5 pb-1 leading-none">
        {template.width}×{template.height}px
        {template.folder && <span className="ml-1 text-amber-500">📁 {template.folder}</span>}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FolderGroup — collapsible folder section
// ─────────────────────────────────────────────────────────────────────────────

function FolderGroup({
  label, open, onToggle, count, isNamed = false, children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  count: number;
  isNamed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-1.5 px-1 py-1 rounded-lg hover:bg-muted/60 transition-colors text-left"
      >
        {open
          ? <ChevronDown  className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
          : <ChevronRight className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />}
        {isNamed
          ? <FolderOpen className="w-3.5 h-3.5 shrink-0 text-amber-500" />
          : <Folder     className="w-3.5 h-3.5 shrink-0 text-muted-foreground/50" />}
        <span className="text-[11px] font-semibold flex-1 truncate">{label}</span>
        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full shrink-0">{count}</span>
      </button>
      {open && <div className="mt-1.5 space-y-1.5 pl-1">{children}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

interface TmplPos { x: number; y: number; scale: number; }

export default function ContentPhotoFrame() {
  const { contentTemplates, addContentTemplate, updateContentTemplate, deleteContentTemplate } = useCRM();

  // Selection
  const [selectedId, setSelectedId] = useState<string | null>(contentTemplates[0]?.template_id ?? null);
  // Photos
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  // Template overlay position/scale (in canvas/photo pixel coords)
  const [tmpl, setTmpl] = useState<TmplPos>({ x: 0, y: 0, scale: 1 });
  // Folder open/close state
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set(["__none__"]));
  // Redraw trigger
  const [drawTick, setDrawTick] = useState(0);

  // Refs
  const editorRef       = useRef<HTMLCanvasElement>(null);
  const photoImgRef     = useRef<HTMLImageElement | null>(null);
  const templateImgRef  = useRef<HTMLImageElement | null>(null);
  const dragRef         = useRef({ active: false, startMx: 0, startMy: 0, startTx: 0, startTy: 0 });
  const templateInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef    = useRef<HTMLInputElement>(null);

  const selectedTemplate = contentTemplates.find(t => t.template_id === selectedId) ?? null;
  const activePhoto      = photoFiles[activeIdx] ?? null;

  // ── Derived folder groups ────────────────────────────────────────────────

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

  // ── Auto-select first template ───────────────────────────────────────────

  useEffect(() => {
    if (!selectedId && contentTemplates.length > 0) setSelectedId(contentTemplates[0].template_id);
  }, [contentTemplates, selectedId]);

  // ── Load template image when selection changes ───────────────────────────

  useEffect(() => {
    if (!selectedTemplate) { templateImgRef.current = null; setDrawTick(v => v + 1); return; }
    loadImg(selectedTemplate.dataUrl).then(img => {
      templateImgRef.current = img;
      if (photoImgRef.current) setTmpl(fitFullPos(photoImgRef.current, selectedTemplate));
      setDrawTick(v => v + 1);
    }).catch(() => { templateImgRef.current = null; setDrawTick(v => v + 1); });
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load photo image when active photo changes ───────────────────────────

  useEffect(() => {
    if (!activePhoto) { photoImgRef.current = null; setDrawTick(v => v + 1); return; }
    const url = URL.createObjectURL(activePhoto);
    loadImg(url)
      .then(img => {
        photoImgRef.current = img;
        if (selectedTemplate) setTmpl(fitFullPos(img, selectedTemplate));
        setDrawTick(v => v + 1);
      })
      .catch(() => {})
      .finally(() => URL.revokeObjectURL(url));
  }, [activePhoto]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Canvas draw effect ───────────────────────────────────────────────────

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

    // 1. Draw background photo (full size)
    ctx.drawImage(photo, 0, 0);

    // 2. Draw template at current position/scale
    if (frame && selectedTemplate) {
      const { x, y, scale } = tmpl;
      const tw = selectedTemplate.width  * scale;
      const th = selectedTemplate.height * scale;
      ctx.drawImage(frame, x, y, tw, th);

      // 3. Draw selection border + corner handles
      const rect = canvas.getBoundingClientRect();
      const r = rect.width > 0 ? canvas.width / rect.width : 1; // canvas px per CSS px
      const lw = Math.max(2, 2 * r);

      ctx.save();
      ctx.setLineDash([lw * 3.5, lw * 1.5]);
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.shadowColor  = "rgba(0,0,0,0.5)";
      ctx.shadowBlur   = lw * 2;
      ctx.lineWidth = lw;
      ctx.strokeRect(x, y, tw, th);
      ctx.shadowBlur = 0;
      ctx.setLineDash([]);
      // Corner squares
      ctx.fillStyle = "rgba(99,102,241,0.95)";
      const hs = lw * 3.5;
      [[x, y], [x + tw, y], [x, y + th], [x + tw, y + th]].forEach(([hx, hy]) => {
        ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs);
      });
      ctx.restore();
    }
  }, [drawTick, tmpl, selectedTemplate]);

  // ── Fit / Center helpers ─────────────────────────────────────────────────

  function fitFullPos(photo: HTMLImageElement, t: ContentTemplate): TmplPos {
    const scale = Math.max(photo.naturalWidth / t.width, photo.naturalHeight / t.height);
    return {
      x: (photo.naturalWidth  - t.width  * scale) / 2,
      y: (photo.naturalHeight - t.height * scale) / 2,
      scale,
    };
  }

  function handleFitFull() {
    if (!photoImgRef.current || !selectedTemplate) return;
    setTmpl(fitFullPos(photoImgRef.current, selectedTemplate));
  }

  function handleCenter() {
    if (!photoImgRef.current || !selectedTemplate) return;
    setTmpl(prev => ({
      ...prev,
      x: (photoImgRef.current!.naturalWidth  - selectedTemplate.width  * prev.scale) / 2,
      y: (photoImgRef.current!.naturalHeight - selectedTemplate.height * prev.scale) / 2,
    }));
  }

  // ── Canvas mouse interaction ─────────────────────────────────────────────

  function canvasXY(e: React.MouseEvent<HTMLCanvasElement>) {
    const c = editorRef.current!;
    const r = c.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (c.width  / r.width),
      y: (e.clientY - r.top)  * (c.height / r.height),
    };
  }

  function hitTest(cx: number, cy: number) {
    if (!selectedTemplate) return false;
    const { x, y, scale } = tmpl;
    return cx >= x && cx <= x + selectedTemplate.width  * scale
        && cy >= y && cy <= y + selectedTemplate.height * scale;
  }

  function onMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    const { x, y } = canvasXY(e);
    if (!hitTest(x, y)) return;
    dragRef.current = { active: true, startMx: x, startMy: y, startTx: tmpl.x, startTy: tmpl.y };
  }

  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const { x, y } = canvasXY(e);
    const canvasEl = editorRef.current!;
    canvasEl.style.cursor = dragRef.current.active ? "grabbing" : hitTest(x, y) ? "grab" : "crosshair";
    if (!dragRef.current.active) return;
    const { startMx, startMy, startTx, startTy } = dragRef.current;
    setTmpl(p => ({ ...p, x: startTx + (x - startMx), y: startTy + (y - startMy) }));
  }

  function onMouseUp()    { dragRef.current.active = false; }
  function onMouseLeave() {
    dragRef.current.active = false;
    if (editorRef.current) editorRef.current.style.cursor = "crosshair";
  }

  // ── Upload: Templates ────────────────────────────────────────────────────

  async function onTemplateUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    for (const file of files) {
      if (file.size > 8 * 1024 * 1024) { toast.error(`"${file.name}" ใหญ่เกิน 8MB`); continue; }
      const dataUrl = await fileToDataUrl(file).catch(() => null);
      if (!dataUrl) continue;
      const img = await loadImg(dataUrl).catch(() => null);
      addContentTemplate({
        name: file.name.replace(/\.[^.]+$/, ""),
        dataUrl,
        width:  img?.naturalWidth  ?? 1080,
        height: img?.naturalHeight ?? 1080,
      });
      toast.success(`เพิ่ม "${file.name.replace(/\.[^.]+$/, "")}" แล้ว ✅`);
    }
  }

  // ── Upload: Photos ───────────────────────────────────────────────────────

  function onPhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    const startIdx = photoFiles.length;
    setPhotoFiles(prev => [...prev, ...files]);
    setActiveIdx(startIdx);
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
    if (!files.length) return;
    const startIdx = photoFiles.length;
    setPhotoFiles(prev => [...prev, ...files]);
    setActiveIdx(startIdx);
  }, [photoFiles.length]);

  // ── Download ─────────────────────────────────────────────────────────────

  async function downloadOne(file: File) {
    if (!templateImgRef.current || !selectedTemplate) { toast.error("เลือก Template ก่อน"); return; }
    const url = URL.createObjectURL(file);
    const photo = await loadImg(url).catch(() => null);
    URL.revokeObjectURL(url);
    if (!photo) { toast.error("โหลดรูปไม่ได้"); return; }
    const c = document.createElement("canvas");
    c.width  = photo.naturalWidth;
    c.height = photo.naturalHeight;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(photo, 0, 0);
    ctx.drawImage(
      templateImgRef.current,
      tmpl.x, tmpl.y,
      selectedTemplate.width  * tmpl.scale,
      selectedTemplate.height * tmpl.scale,
    );
    const a = document.createElement("a");
    a.download = `framed_${file.name.replace(/\.[^.]+$/, "")}.png`;
    a.href = c.toDataURL("image/png");
    a.click();
  }

  async function downloadAll() {
    if (!photoFiles.length) return;
    toast.info(`กำลัง Download ${photoFiles.length} รูป...`);
    for (let i = 0; i < photoFiles.length; i++) {
      if (i > 0) await new Promise(r => setTimeout(r, 350));
      await downloadOne(photoFiles[i]);
    }
    toast.success(`Download ครบ ${photoFiles.length} รูป ✅`);
  }

  // ── Folder helpers ───────────────────────────────────────────────────────

  function toggleFolder(key: string) {
    setOpenFolders(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function handleDeleteTemplate(id: string) {
    deleteContentTemplate(id);
    if (selectedId === id) setSelectedId(contentTemplates.find(t => t.template_id !== id)?.template_id ?? null);
    toast.success("ลบ Template แล้ว");
  }

  // ── Computed display info ────────────────────────────────────────────────

  const pw = photoImgRef.current?.naturalWidth  ?? 0;
  const ph = photoImgRef.current?.naturalHeight ?? 0;
  const tw = selectedTemplate ? Math.round(selectedTemplate.width  * tmpl.scale) : 0;
  const th = selectedTemplate ? Math.round(selectedTemplate.height * tmpl.scale) : 0;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex overflow-hidden bg-background"
      style={{ height: "calc(100vh - 56px)" }} // subtract ContentManagementLayout header
    >

      {/* ══════════════ LEFT: Template Library ══════════════ */}
      <div className="w-56 shrink-0 border-r bg-card flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-3 py-2.5 border-b flex items-center justify-between shrink-0">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
            Templates ({contentTemplates.length})
          </p>
          <button
            onClick={() => templateInputRef.current?.click()}
            className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-all"
          >
            <Plus className="w-3 h-3" /> เพิ่ม
          </button>
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
              onClick={() => templateInputRef.current?.click()}
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
                >
                  {(grouped[folder] ?? []).map(t => (
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
              ))}
            </>
          )}
        </div>
      </div>

      {/* ══════════════ RIGHT: Editor Workspace ══════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* ── Toolbar ── */}
        <div className="shrink-0 px-4 py-2 border-b bg-card flex items-center gap-2 flex-wrap">

          {/* Template chip */}
          {selectedTemplate ? (
            <div className="flex items-center gap-2 shrink-0">
              <div
                className="w-6 h-6 rounded border overflow-hidden shrink-0"
                style={{ backgroundImage: "repeating-conic-gradient(#e5e7eb 0% 25%, #f9fafb 0% 50%)", backgroundSize: "6px 6px" }}
              >
                <img src={selectedTemplate.dataUrl} className="w-full h-full object-contain" alt="" />
              </div>
              <span className="text-xs font-semibold text-muted-foreground max-w-[100px] truncate">
                {selectedTemplate.name}
              </span>
            </div>
          ) : (
            <span className="text-xs text-amber-600 font-medium">⚠️ เลือก Template</span>
          )}

          <div className="w-px h-5 bg-border mx-0.5 shrink-0" />

          {/* Upload photos */}
          <button
            onClick={() => photoInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 text-white hover:bg-violet-700 transition-all shrink-0"
          >
            <ImageIcon className="w-3.5 h-3.5" /> อัปโหลดรูปภาพ
          </button>
          <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={onPhotoUpload} />

          {/* Controls — shown only when photo is loaded */}
          {pw > 0 && selectedTemplate && (
            <>
              <div className="w-px h-5 bg-border mx-0.5 shrink-0" />

              {/* Scale slider */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted-foreground font-medium">ขนาด Template</span>
                <input
                  type="range"
                  min="0.05"
                  max="5"
                  step="0.005"
                  value={tmpl.scale}
                  onChange={e => setTmpl(p => ({ ...p, scale: parseFloat(e.target.value) }))}
                  className="w-28 accent-violet-600"
                />
                <span className="text-xs font-bold w-10 text-right tabular-nums">
                  {(tmpl.scale * 100).toFixed(0)}%
                </span>
              </div>

              {/* Fit full */}
              <button
                onClick={handleFitFull}
                title="ขยาย Template ให้คลุมภาพทั้งหมด"
                className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-muted hover:bg-accent transition-all shrink-0"
              >
                <Maximize2 className="w-3.5 h-3.5" /> เต็มภาพ
              </button>

              {/* Center */}
              <button
                onClick={handleCenter}
                title="วาง Template ตรงกลางภาพ"
                className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-muted hover:bg-accent transition-all shrink-0"
              >
                <AlignCenter className="w-3.5 h-3.5" /> ตรงกลาง
              </button>

              {/* Position info */}
              <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                x:{Math.round(tmpl.x)} y:{Math.round(tmpl.y)} · {tw}×{th} / {pw}×{ph}px
              </span>
            </>
          )}

          {/* Download All */}
          {photoFiles.length > 0 && selectedTemplate && (
            <button
              onClick={downloadAll}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-all shrink-0"
            >
              <Download className="w-3.5 h-3.5" /> Download ทั้งหมด ({photoFiles.length})
            </button>
          )}
        </div>

        {/* ── Canvas editor ── */}
        <div
          className="flex-1 min-h-0 bg-[#111827] flex items-center justify-center relative overflow-hidden"
          onDrop={onDrop}
          onDragOver={e => e.preventDefault()}
        >
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

          {/* Canvas — always mounted so ref is valid */}
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
          />

          {/* Hint overlay */}
          {activePhoto && selectedTemplate && pw > 0 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm text-white text-[11px] px-3 py-1.5 rounded-full pointer-events-none flex items-center gap-1.5 whitespace-nowrap">
              <Info className="w-3 h-3 shrink-0" />
              ลากกรอบเพื่อขยับตำแหน่ง · ใช้ Slider ปรับขนาด · กด "เต็มภาพ" เพื่อให้กรอบคลุมทั้งหมด
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

                {/* Per-photo download */}
                <button
                  onClick={async e => {
                    e.stopPropagation();
                    await downloadOne(f);
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
                    setActiveIdx(Math.max(0, i === activeIdx ? i - 1 : activeIdx > i ? activeIdx - 1 : activeIdx));
                  }}
                  className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600"
                >
                  <X className="w-2.5 h-2.5" />
                </button>

                {/* Active border overlay */}
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
