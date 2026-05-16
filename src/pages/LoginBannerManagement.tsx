import { useState, useRef } from "react";
import { Plus, Trash2, Edit2, Check, X, Upload, ArrowUp, ArrowDown, Image as ImageIcon } from "lucide-react";
import { useSiteSettings, BannerSlide } from "@/store/siteSettingsStore";
import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Matching gradient palette used on Login page
const SLIDE_GRADIENTS = [
  "from-indigo-600 via-purple-700 to-pink-600",
  "from-sky-500 via-blue-700 to-indigo-700",
  "from-emerald-500 via-teal-600 to-cyan-600",
  "from-amber-500 via-orange-600 to-rose-500",
];

interface DraftSlide {
  imageUrl: string;
  title: string;
  subtitle: string;
}

const emptyDraft = (): DraftSlide => ({ imageUrl: "", title: "", subtitle: "" });

async function uploadBannerImage(file: File, slideId: string): Promise<string | null> {
  if (!SUPABASE_ENABLED || !supabase) return null;
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `banners/${slideId}.${ext}`;
  const { error } = await supabase.storage.from("presentations").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("presentations").getPublicUrl(path);
  return data.publicUrl;
}

// ---- Small slide preview card ----
function SlidePreview({ slide, index }: { slide: BannerSlide; index: number }) {
  return (
    <div className={`relative w-full aspect-video rounded-xl overflow-hidden bg-gradient-to-br ${SLIDE_GRADIENTS[index % SLIDE_GRADIENTS.length]}`}>
      {slide.imageUrl && (
        <img src={slide.imageUrl} alt={slide.title} className="absolute inset-0 w-full h-full object-cover" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      <div className="absolute bottom-2 left-3 right-3 text-white">
        <p className="font-bold text-sm leading-tight line-clamp-1">{slide.title || "ไม่มีหัวข้อ"}</p>
        {slide.subtitle && <p className="text-[11px] text-white/75 mt-0.5 line-clamp-1">{slide.subtitle}</p>}
      </div>
      {!slide.imageUrl && (
        <div className="absolute top-2 right-2 bg-black/30 rounded-md px-1.5 py-0.5">
          <span className="text-[10px] text-white/70">Gradient</span>
        </div>
      )}
    </div>
  );
}

export default function LoginBannerManagement() {
  const bannerSlides = useSiteSettings((s) => s.bannerSlides);
  const setBannerSlides = useSiteSettings((s) => s.setBannerSlides);
  const addBannerSlide = useSiteSettings((s) => s.addBannerSlide);
  const updateBannerSlide = useSiteSettings((s) => s.updateBannerSlide);
  const removeBannerSlide = useSiteSettings((s) => s.removeBannerSlide);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DraftSlide>(emptyDraft());
  const [editUploading, setEditUploading] = useState(false);

  // Add state
  const [adding, setAdding] = useState(false);
  const [addDraft, setAddDraft] = useState<DraftSlide>(emptyDraft());
  const [addUploading, setAddUploading] = useState(false);

  const editFileRef = useRef<HTMLInputElement>(null);
  const addFileRef = useRef<HTMLInputElement>(null);

  // ---- Handlers ----

  const startEdit = (slide: BannerSlide) => {
    setEditingId(slide.id);
    setEditDraft({ imageUrl: slide.imageUrl, title: slide.title, subtitle: slide.subtitle ?? "" });
    setAdding(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(emptyDraft());
  };

  const saveEdit = () => {
    if (!editingId) return;
    if (!editDraft.title.trim()) { toast.error("กรุณากรอกหัวข้อ"); return; }
    updateBannerSlide(editingId, {
      title: editDraft.title.trim(),
      subtitle: editDraft.subtitle.trim() || undefined,
      imageUrl: editDraft.imageUrl.trim(),
    });
    toast.success("บันทึกสำเร็จ");
    cancelEdit();
  };

  const handleEditFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingId) return;
    setEditUploading(true);
    try {
      const url = await uploadBannerImage(file, editingId);
      if (url) setEditDraft((d) => ({ ...d, imageUrl: url }));
      else toast.error("Supabase ยังไม่ได้เชื่อมต่อ — วาง URL แทนได้");
    } catch (err: unknown) {
      toast.error("อัปโหลดล้มเหลว: " + String(err));
    } finally {
      setEditUploading(false);
      if (editFileRef.current) editFileRef.current.value = "";
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm("ลบ Slide นี้?")) return;
    removeBannerSlide(id);
    toast.success("ลบแล้ว");
    if (editingId === id) cancelEdit();
  };

  const moveSlide = (index: number, dir: -1 | 1) => {
    const arr = [...bannerSlides];
    const target = index + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[index], arr[target]] = [arr[target], arr[index]];
    setBannerSlides(arr);
  };

  // ---- Add slide ----
  const handleAddFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const tempId = `bs-${Date.now()}`;
    setAddUploading(true);
    try {
      const url = await uploadBannerImage(file, tempId);
      if (url) setAddDraft((d) => ({ ...d, imageUrl: url }));
      else toast.error("Supabase ยังไม่ได้เชื่อมต่อ — วาง URL แทนได้");
    } catch (err: unknown) {
      toast.error("อัปโหลดล้มเหลว: " + String(err));
    } finally {
      setAddUploading(false);
      if (addFileRef.current) addFileRef.current.value = "";
    }
  };

  const saveAdd = () => {
    if (!addDraft.title.trim()) { toast.error("กรุณากรอกหัวข้อ"); return; }
    addBannerSlide({
      id: `bs-${Date.now()}`,
      title: addDraft.title.trim(),
      subtitle: addDraft.subtitle.trim() || undefined,
      imageUrl: addDraft.imageUrl.trim(),
    });
    toast.success("เพิ่ม Slide แล้ว");
    setAdding(false);
    setAddDraft(emptyDraft());
  };

  const cancelAdd = () => {
    setAdding(false);
    setAddDraft(emptyDraft());
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold">จัดการ Login Banner</h1>
          <p className="text-sm text-muted-foreground mt-0.5">กำหนดภาพและข้อความที่แสดงในหน้าเข้าสู่ระบบ</p>
        </div>
        <Button
          onClick={() => { setAdding(true); cancelEdit(); }}
          className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white border-0"
          disabled={adding}
        >
          <Plus className="w-4 h-4 mr-1.5" /> เพิ่ม Slide
        </Button>
      </div>

      {/* Add form */}
      {adding && (
        <SlideForm
          draft={addDraft}
          setDraft={setAddDraft}
          uploading={addUploading}
          fileRef={addFileRef}
          onFileUpload={handleAddFileUpload}
          onSave={saveAdd}
          onCancel={cancelAdd}
          slideIndex={bannerSlides.length}
          label="Slide ใหม่"
        />
      )}

      {/* Slide list */}
      {bannerSlides.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>ยังไม่มี Slide — กด "เพิ่ม Slide" เพื่อเริ่ม</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bannerSlides.map((slide, i) => (
            <div key={slide.id} className="rounded-2xl border bg-card shadow-sm overflow-hidden">
              {editingId === slide.id ? (
                // Edit mode
                <div className="p-5">
                  <p className="text-xs font-semibold text-muted-foreground mb-3">แก้ไข Slide {i + 1}</p>
                  <SlideForm
                    draft={editDraft}
                    setDraft={setEditDraft}
                    uploading={editUploading}
                    fileRef={editFileRef}
                    onFileUpload={handleEditFileUpload}
                    onSave={saveEdit}
                    onCancel={cancelEdit}
                    slideIndex={i}
                    label=""
                  />
                </div>
              ) : (
                // View mode
                <div className="flex gap-4 p-4 items-start">
                  {/* Preview */}
                  <div className="w-40 flex-shrink-0">
                    <SlidePreview slide={slide} index={i} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 py-1">
                    <p className="font-semibold leading-tight">{slide.title}</p>
                    {slide.subtitle && <p className="text-sm text-muted-foreground mt-0.5">{slide.subtitle}</p>}
                    {slide.imageUrl ? (
                      <p className="text-xs text-muted-foreground mt-1.5 truncate">🖼 {slide.imageUrl}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1.5">🎨 Gradient สี (ยังไม่มีภาพ)</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => startEdit(slide)}
                      className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition"
                      title="แก้ไข"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveSlide(i, -1)}
                      disabled={i === 0}
                      className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition disabled:opacity-30"
                      title="เลื่อนขึ้น"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveSlide(i, 1)}
                      disabled={i === bannerSlides.length - 1}
                      className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition disabled:opacity-30"
                      title="เลื่อนลง"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(slide.id)}
                      className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-muted-foreground hover:text-red-600 transition"
                      title="ลบ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Live preview note */}
      {bannerSlides.length > 0 && (
        <div className="rounded-xl bg-muted/50 border px-4 py-3 text-sm text-muted-foreground">
          💡 การเปลี่ยนแปลงมีผลทันที — เปิดหน้า Login ในแท็บใหม่เพื่อดูตัวอย่าง
        </div>
      )}
    </div>
  );
}

// ---- Reusable slide form ----
interface SlideFormProps {
  draft: DraftSlide;
  setDraft: React.Dispatch<React.SetStateAction<DraftSlide>>;
  uploading: boolean;
  fileRef: React.RefObject<HTMLInputElement>;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void;
  onCancel: () => void;
  slideIndex: number;
  label: string;
}

function SlideForm({ draft, setDraft, uploading, fileRef, onFileUpload, onSave, onCancel, slideIndex, label }: SlideFormProps) {
  return (
    <div className="space-y-4">
      {label && <p className="text-sm font-semibold text-muted-foreground">{label}</p>}

      {/* Mini preview */}
      <div className="w-48">
        <SlidePreview
          slide={{ id: "preview", imageUrl: draft.imageUrl, title: draft.title || "หัวข้อ", subtitle: draft.subtitle || undefined }}
          index={slideIndex}
        />
      </div>

      {/* Title */}
      <div>
        <label className="text-xs font-semibold block mb-1">หัวข้อ <span className="text-red-500">*</span></label>
        <Input
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          placeholder="เช่น ยินดีต้อนรับสู่ Standard Tour"
        />
      </div>

      {/* Subtitle */}
      <div>
        <label className="text-xs font-semibold block mb-1">คำอธิบาย (ไม่บังคับ)</label>
        <Input
          value={draft.subtitle}
          onChange={(e) => setDraft((d) => ({ ...d, subtitle: e.target.value }))}
          placeholder="เช่น ผู้นำด้านบริการท่องเที่ยวคุณภาพ"
        />
      </div>

      {/* Image URL */}
      <div>
        <label className="text-xs font-semibold block mb-1">URL รูปภาพ (ไม่บังคับ — ถ้าว่างจะใช้ Gradient)</label>
        <Input
          value={draft.imageUrl}
          onChange={(e) => setDraft((d) => ({ ...d, imageUrl: e.target.value }))}
          placeholder="https://..."
        />
      </div>

      {/* Upload button */}
      <div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileUpload} />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="gap-1.5"
        >
          <Upload className="w-3.5 h-3.5" />
          {uploading ? "กำลังอัปโหลด..." : "อัปโหลดรูปภาพ"}
        </Button>
        <span className="text-xs text-muted-foreground ml-2">หรือวาง URL ข้างบน</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={onSave} className="gap-1.5">
          <Check className="w-3.5 h-3.5" /> บันทึก
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} className="gap-1.5">
          <X className="w-3.5 h-3.5" /> ยกเลิก
        </Button>
      </div>
    </div>
  );
}
