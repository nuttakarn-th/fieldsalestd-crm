import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Facebook, Instagram, Youtube, Globe, ExternalLink, Music2, Edit3, Upload, FileText, Download, Trash2, Save, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VoiceTextarea } from "@/components/VoiceTextarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useSiteSettings, type SocialLink } from "@/store/siteSettingsStore";
import { useCurrentUser } from "@/store/authStore";
import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";
import { toast } from "sonner";

const ICON_MAP: Record<string, any> = {
  Facebook, Instagram, TikTok: Music2, YouTube: Youtube, Website: Globe,
};

export default function TourPresentation() {
  const user = useCurrentUser();
  const isAdmin = user?.role === "Admin";
  const settings = useSiteSettings();

  const [editOpen, setEditOpen] = useState(false);
  const [profile, setProfile] = useState(settings.companyProfile);
  const [links, setLinks] = useState<SocialLink[]>(settings.socialLinks);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const handlePdfUpload = async (file: File | null) => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("กรุณาเลือกไฟล์ PDF เท่านั้น");
      return;
    }
    if (!SUPABASE_ENABLED || !supabase) {
      toast.error("Supabase ยังไม่ได้เปิดใช้");
      return;
    }
    setUploading(true);
    try {
      const fileName = `presentation-${Date.now()}.pdf`;
      const { data, error } = await supabase.storage
        .from("presentations")
        .upload(fileName, file, { contentType: "application/pdf", upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("presentations").getPublicUrl(data.path);
      settings.setPdf(urlData.publicUrl, file.name);
      toast.success("อัปโหลด PDF สำเร็จ — Sales เห็นทุกคน");
    } catch (e: any) {
      console.error(e);
      toast.error(`อัปโหลด PDF ไม่สำเร็จ: ${e?.message || ""}`);
    } finally {
      setUploading(false);
    }
  };

  const removePdf = () => {
    settings.setPdf(undefined, undefined);
    toast.success("ลบ PDF แล้ว");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
      <header className="px-6 py-6 max-w-5xl mx-auto flex items-center gap-3">
        <Link to="/"><Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Standard Tour Presentation</h1>
          <p className="text-sm text-muted-foreground">Company Profile · ช่องทางสื่อ · เอกสารนำเสนอ</p>
        </div>
        {isAdmin && (
          <Button variant="outline" onClick={openEdit}>
            <Edit3 className="w-4 h-4 mr-2" /> แก้ไข (Admin)
          </Button>
        )}
      </header>

      <main className="max-w-5xl mx-auto px-6 pb-16 space-y-6">
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

        {/* PDF Section */}
        <section className="rounded-3xl bg-card border shadow-soft p-6">
          <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> เอกสารนำเสนอ (PDF)
            </h2>
            {isAdmin && (
              <div className="flex gap-2">
                <input ref={fileRef} type="file" accept="application/pdf" hidden onChange={(e) => handlePdfUpload(e.target.files?.[0] ?? null)} />
                <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  <Upload className="w-4 h-4 mr-1" /> {uploading ? "กำลังอัปโหลด..." : settings.presentationPdfUrl ? "เปลี่ยน PDF" : "อัปโหลด PDF"}
                </Button>
                {settings.presentationPdfUrl && (
                  <Button size="sm" variant="ghost" onClick={removePdf}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {settings.presentationPdfUrl ? (
            <div className="space-y-3">
              <div className="rounded-xl border overflow-hidden bg-muted/30 aspect-[4/3]">
                <iframe src={settings.presentationPdfUrl} className="w-full h-full" title="Tour Presentation" />
              </div>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="font-medium">{settings.presentationPdfName ?? "Tour Presentation.pdf"}</span>
                </div>
                <a href={settings.presentationPdfUrl} download target="_blank" rel="noreferrer">
                  <Button size="sm" className="bg-gradient-primary text-primary-foreground">
                    <Download className="w-4 h-4 mr-2" /> ดาวน์โหลด PDF
                  </Button>
                </a>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed p-10 text-center bg-muted/20">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
              <p className="font-medium">ยังไม่มีเอกสารนำเสนอ</p>
              <p className="text-xs text-muted-foreground mt-1">
                {isAdmin ? "กดปุ่ม 'อัปโหลด PDF' ด้านบน" : "Admin จะอัปโหลดเอกสารให้ Sales เห็นที่นี่"}
              </p>
            </div>
          )}
        </section>

        <section className="rounded-3xl bg-card border shadow-soft p-6">
          <h2 className="text-xl font-bold mb-4">ช่องทางสื่อโซเชียล</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {settings.socialLinks.map((c) => {
              const Icon = ICON_MAP[c.name] ?? ExternalLink;
              return (
                <a key={c.name} href={c.url} target="_blank" rel="noreferrer"
                  className={`rounded-2xl ${c.tone} text-white p-4 flex items-center justify-between hover:opacity-90 transition shadow-soft`}>
                  <span className="flex items-center gap-3 font-semibold"><Icon className="w-5 h-5" /> {c.name}</span>
                  <ExternalLink className="w-4 h-4 opacity-80" />
                </a>
              );
            })}
          </div>
        </section>
      </main>

      {/* Admin Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>แก้ไขข้อมูล Tour Presentation (Admin)</DialogTitle>
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
