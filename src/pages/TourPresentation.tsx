import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Facebook, Instagram, Youtube, Globe, ExternalLink, Music2, Edit3, Upload, FileText, Download, Trash2, Save, Plus, X, Image as ImageIcon, Eye, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VoiceTextarea } from "@/components/VoiceTextarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useSiteSettings, type SocialLink, type PresentationItem } from "@/store/siteSettingsStore";
import { useCurrentUser } from "@/store/authStore";
import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";
import { compressImage } from "@/lib/imageCompression";
import { toast } from "sonner";

const ICON_MAP: Record<string, any> = {
  Facebook, Instagram, TikTok: Music2, YouTube: Youtube, Website: Globe,
};

// Gradient per platform name — fallback uses tone class
const GRADIENT_MAP: Record<string, string> = {
  Facebook:  "from-blue-500 to-blue-700",
  Instagram: "from-yellow-400 via-pink-500 to-purple-600",
  TikTok:    "from-gray-900 via-neutral-800 to-gray-900",
  YouTube:   "from-red-500 to-rose-700",
  Website:   "from-emerald-400 to-teal-600",
  Line:      "from-green-400 to-green-600",
  Twitter:   "from-sky-400 to-sky-600",
  LinkedIn:  "from-blue-600 to-blue-800",
};

export default function TourPresentation() {
  const user = useCurrentUser();
  const isAdmin = user?.role === "Admin";
  const settings = useSiteSettings();

  const [editOpen, setEditOpen] = useState(false);
  const [profile, setProfile] = useState(settings.companyProfile);
  const [links, setLinks] = useState<SocialLink[]>(settings.socialLinks);

  const [previewItem, setPreviewItem] = useState<PresentationItem | null>(null);
  const [editingItem, setEditingItem] = useState<PresentationItem | null>(null);

  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadingCover, setUploadingCover] = useState<string | null>(null); // id of item being processed

  const pdfRef = useRef<HTMLInputElement>(null);
  const coverRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const previewFrameRef = useRef<HTMLIFrameElement>(null);

  const goFullscreen = () => {
    const el = previewFrameRef.current as any;
    if (!el) return;
    const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
    if (req) req.call(el).catch(() => toast.error("เบราว์เซอร์ไม่รองรับ full screen"));
  };

  const presentations = settings.presentations ?? [];

  const openEdit = () => {
    setProfile(settings.companyProfile);
    setLinks(settings.socialLinks);
    setEditOpen(true);
  };

  const saveEdit = () => {
    settings.setProfile(profile);
    settings.setSocial(links);
    setEditOpen(false);
    toast.success("บันทึกข้อมูลแล้ว — ทุกคนเห็นการเปลี่ยนแปลงทันที");
  };

  const updateLink = (i: number, patch: Partial<SocialLink>) => {
    setLinks((arr) => arr.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  };
  const addLink = () => setLinks([...links, { name: "Custom", url: "https://", tone: "bg-slate-600" }]);
  const removeLink = (i: number) => setLinks(links.filter((_, idx) => idx !== i));

  const uploadFileToSupabase = async (file: File, prefix: string): Promise<string> => {
    if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not enabled");
    const safeName = file.name.replace(/[^\w.\-]/g, "_");
    const path = `${prefix}/${Date.now()}-${safeName}`;
    const { data, error } = await supabase.storage
      .from("presentations")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from("presentations").getPublicUrl(data.path);
    return urlData.publicUrl;
  };

  const handlePdfUpload = async (file: File | null) => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("กรุณาเลือกไฟล์ PDF เท่านั้น");
      return;
    }
    setUploadingPdf(true);
    try {
      const pdfUrl = await uploadFileToSupabase(file, "pdf");
      const id = `p-${Date.now()}`;
      const newItem: PresentationItem = {
        id,
        title: file.name.replace(/\.pdf$/i, ""),
        pdfUrl,
        pdfName: file.name,
        uploadedAt: new Date().toISOString(),
      };
      settings.addPresentation(newItem);
      toast.success(`อัปโหลด ${file.name} สำเร็จ — กดอัปโหลดภาพปกถัดไป`);
    } catch (e: any) {
      console.error(e);
      toast.error(`อัปโหลด PDF ไม่สำเร็จ: ${e?.message || ""}`);
    } finally {
      setUploadingPdf(false);
      if (pdfRef.current) pdfRef.current.value = "";
    }
  };

  const handleCoverUpload = async (id: string, file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("กรุณาเลือกไฟล์รูปภาพ");
      return;
    }
    setUploadingCover(id);
    try {
      // Compress before upload
      const compressed = await compressImage(file, { maxWidth: 1200, maxSizeKB: 400 });
      const blob = await fetch(compressed.dataUrl).then((r) => r.blob());
      const coverFile = new File([blob], `cover-${id}.jpg`, { type: blob.type || "image/jpeg" });
      const coverUrl = await uploadFileToSupabase(coverFile, "covers");
      settings.updatePresentation(id, { coverUrl });
      toast.success("อัปโหลดภาพปกสำเร็จ");
    } catch (e: any) {
      console.error(e);
      toast.error(`อัปโหลดภาพปกไม่สำเร็จ: ${e?.message || ""}`);
    } finally {
      setUploadingCover(null);
      if (coverRefs.current[id]) coverRefs.current[id]!.value = "";
    }
  };

  const removeItem = (item: PresentationItem) => {
    if (!confirm(`ลบ "${item.title}" ?`)) return;
    settings.removePresentation(item.id);
    toast.success("ลบเอกสารแล้ว");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
      <header className="px-6 py-6 max-w-6xl mx-auto flex items-center gap-3">
        <Link to="/"><Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Standard Tour Presentation</h1>
          <p className="text-sm text-muted-foreground">Company Profile · ช่องทางสื่อ · เอกสารนำเสนอ</p>
        </div>
        {isAdmin && (
          <Button variant="outline" onClick={openEdit}>
            <Edit3 className="w-4 h-4 mr-2" /> แก้ไขข้อมูลทั่วไป
          </Button>
        )}
      </header>

      <main className="max-w-6xl mx-auto px-6 pb-16 space-y-6">
        <section className="rounded-3xl bg-card border shadow-soft p-6">
          <h2 className="text-xl font-bold mb-2">Company Profile</h2>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {settings.companyProfile}
          </p>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="rounded-xl bg-muted/40 p-3"><p className="text-xs text-muted-foreground">ก่อตั้ง</p><p className="font-semibold">2533</p></div>
            <div className="rounded-xl bg-muted/40 p-3"><p className="text-xs text-muted-foreground">ใบอนุญาต</p><p className="font-semibold">{settings.license}</p></div>
            <div className="rounded-xl bg-muted/40 p-3"><p className="text-xs text-muted-foreground">สำนักงาน</p><p className="font-semibold">เชียงใหม่ · กรุงเทพฯ</p></div>
            <div className="rounded-xl bg-muted/40 p-3"><p className="text-xs text-muted-foreground">บริการ</p><p className="font-semibold">Tour · Flight · Rent</p></div>
          </div>
        </section>

        {/* Presentations Section */}
        <section className="rounded-3xl bg-card border shadow-soft p-6">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> เอกสารนำเสนอ ({presentations.length})
            </h2>
            {isAdmin && (
              <>
                <input ref={pdfRef} type="file" accept="application/pdf" hidden onChange={(e) => handlePdfUpload(e.target.files?.[0] ?? null)} />
                <Button onClick={() => pdfRef.current?.click()} disabled={uploadingPdf} className="bg-gradient-primary text-primary-foreground">
                  <Upload className="w-4 h-4 mr-2" /> {uploadingPdf ? "กำลังอัปโหลด..." : "+ เพิ่ม PDF"}
                </Button>
              </>
            )}
          </div>

          {presentations.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed p-10 text-center bg-muted/20">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
              <p className="font-medium">ยังไม่มีเอกสาร</p>
              <p className="text-xs text-muted-foreground mt-1">
                {isAdmin ? "กดปุ่ม '+ เพิ่ม PDF' เพื่อเริ่มอัปโหลด" : "Admin จะอัปโหลดเอกสารให้เห็นที่นี่"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {presentations.map((item) => (
                <article key={item.id} className="rounded-2xl border overflow-hidden bg-background flex flex-col group">
                  {/* Cover */}
                  <div className="relative aspect-[4/3] bg-muted/40 overflow-hidden">
                    {item.coverUrl ? (
                      <img src={item.coverUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-gradient-to-br from-muted to-muted/40">
                        <FileText className="w-12 h-12 mb-1" />
                        <span className="text-xs">ยังไม่มีภาพปก</span>
                      </div>
                    )}
                    {isAdmin && (
                      <>
                        <input
                          ref={(el) => { coverRefs.current[item.id] = el; }}
                          type="file" accept="image/*" hidden
                          onChange={(e) => handleCoverUpload(item.id, e.target.files?.[0] ?? null)}
                        />
                        <button
                          onClick={() => coverRefs.current[item.id]?.click()}
                          disabled={uploadingCover === item.id}
                          title="เปลี่ยนภาพปก"
                          className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-105 transition opacity-0 group-hover:opacity-100"
                        >
                          {uploadingCover === item.id ? <span className="text-[10px]">...</span> : <ImageIcon className="w-4 h-4" />}
                        </button>
                      </>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="font-semibold line-clamp-2 mb-1">{item.title}</h3>
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      <FileText className="w-3 h-3" /> {item.pdfName}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(item.uploadedAt).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" })}
                    </p>

                    <div className="mt-auto pt-3 flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => setPreviewItem(item)}>
                        <Eye className="w-4 h-4 mr-1" /> ดู
                      </Button>
                      <a href={item.pdfUrl} download={item.pdfName} target="_blank" rel="noreferrer" className="flex-1">
                        <Button size="sm" className="w-full bg-gradient-primary text-primary-foreground">
                          <Download className="w-4 h-4 mr-1" /> ดาวน์โหลด
                        </Button>
                      </a>
                      {isAdmin && (
                        <>
                          <Button size="icon" variant="ghost" onClick={() => setEditingItem(item)} title="แก้ไขชื่อ">
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => removeItem(item)} title="ลบ">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-3xl bg-card border shadow-soft p-6">
          <h2 className="text-xl font-bold mb-4">ช่องทางสื่อโซเชียล</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {settings.socialLinks.map((c) => {
              const Icon = ICON_MAP[c.name] ?? ExternalLink;
              const gradient = GRADIENT_MAP[c.name];
              return (
                <a
                  key={c.name}
                  href={c.url}
                  target="_blank"
                  rel="noreferrer"
                  className={`group relative aspect-square rounded-2xl text-white flex flex-col items-center justify-center gap-2 shadow-soft transition-all hover:scale-105 hover:shadow-lg overflow-hidden
                    ${gradient ? `bg-gradient-to-br ${gradient}` : c.tone}`}
                >
                  {/* Subtle inner glow */}
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                  {/* Icon */}
                  <Icon className="relative w-8 h-8 sm:w-9 sm:h-9 drop-shadow" strokeWidth={1.6} />
                  {/* Name */}
                  <span className="relative text-[11px] sm:text-xs font-semibold tracking-wide text-white/90 leading-none">
                    {c.name}
                  </span>
                  {/* External link badge */}
                  <ExternalLink className="relative w-3 h-3 absolute top-2 right-2 opacity-50 group-hover:opacity-90 transition-opacity" />
                </a>
              );
            })}
          </div>
        </section>
      </main>

      {/* Preview PDF Dialog */}
      <Dialog open={!!previewItem} onOpenChange={(o) => !o && setPreviewItem(null)}>
        <DialogContent className="!max-w-[96vw] w-[96vw] h-[95vh] !p-0 overflow-hidden flex flex-col gap-0 sm:rounded-2xl">
          <DialogHeader className="pl-5 pr-14 py-3 border-b flex flex-row items-center gap-2 space-y-0 shrink-0">
            <FileText className="w-5 h-5 text-primary shrink-0" />
            <DialogTitle className="flex-1 text-base truncate">{previewItem?.title}</DialogTitle>
            <Button size="sm" variant="outline" onClick={goFullscreen} title="เต็มจอ — สำหรับนำเสนอ">
              <Maximize2 className="w-4 h-4 mr-1" /> เต็มจอ
            </Button>
            {previewItem && (
              <a href={previewItem.pdfUrl} target="_blank" rel="noreferrer">
                <Button size="sm" variant="outline" title="เปิดในแท็บใหม่">
                  <ExternalLink className="w-4 h-4 mr-1" /> แท็บใหม่
                </Button>
              </a>
            )}
            {previewItem && (
              <a href={previewItem.pdfUrl} download={previewItem.pdfName} target="_blank" rel="noreferrer">
                <Button size="sm" className="bg-gradient-primary text-primary-foreground">
                  <Download className="w-4 h-4 mr-1" /> ดาวน์โหลด
                </Button>
              </a>
            )}
          </DialogHeader>
          {previewItem && (
            <div className="flex-1 bg-black/80 min-h-0">
              <iframe
                ref={previewFrameRef}
                src={`${previewItem.pdfUrl}#toolbar=1&view=FitH`}
                className="w-full h-full block bg-white"
                title={previewItem.title}
                allowFullScreen
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Item Title Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(o) => !o && setEditingItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>แก้ไขชื่อเอกสาร</DialogTitle></DialogHeader>
          {editingItem && (
            <div className="space-y-3">
              <Label>ชื่อเอกสาร</Label>
              <Input
                value={editingItem.title}
                onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>ยกเลิก</Button>
            <Button
              className="bg-gradient-primary text-primary-foreground"
              onClick={() => {
                if (editingItem) {
                  settings.updatePresentation(editingItem.id, { title: editingItem.title.trim() || "(ไม่มีชื่อ)" });
                  toast.success("บันทึกแล้ว");
                  setEditingItem(null);
                }
              }}
            >
              <Save className="w-4 h-4 mr-1" /> บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Edit Dialog (general info) */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>แก้ไขข้อมูลทั่วไป (Admin)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Company Profile</Label>
              <VoiceTextarea rows={5} value={profile} onChange={(e) => setProfile(e.target.value)} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>ลิงก์ช่องทางสื่อ</Label>
                <Button size="sm" variant="outline" onClick={addLink}><Plus className="w-3 h-3 mr-1" />เพิ่มลิงก์</Button>
              </div>
              <div className="space-y-2">
                {links.map((l, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input className="w-32" placeholder="ชื่อ" value={l.name} onChange={(e) => updateLink(i, { name: e.target.value })} />
                    <Input className="flex-1" placeholder="https://..." value={l.url} onChange={(e) => updateLink(i, { url: e.target.value })} />
                    <Button size="icon" variant="ghost" onClick={() => removeLink(i)}><X className="w-4 h-4 text-destructive" /></Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>ยกเลิก</Button>
            <Button onClick={saveEdit} className="bg-gradient-primary text-primary-foreground">
              <Save className="w-4 h-4 mr-1" /> บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
