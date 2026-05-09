import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Phone, MapPin, Clock, MessageCircle, Edit3, Save, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useSiteSettings, type PhoneEntry } from "@/store/siteSettingsStore";
import { useCurrentUser } from "@/store/authStore";
import { toast } from "sonner";

export default function ContactInfo() {
  const user = useCurrentUser();
  const isAdmin = user?.role === "Admin";
  const settings = useSiteSettings();

  const [editOpen, setEditOpen] = useState(false);
  const [lineId, setLineId] = useState(settings.lineId);
  const [lineUrl, setLineUrl] = useState(settings.lineUrl);
  const [workingHours, setWorkingHours] = useState(settings.workingHours);
  const [phones, setPhones] = useState<PhoneEntry[]>(settings.phones);
  const [hqAddress, setHqAddress] = useState(settings.hqAddress);
  const [bkkAddress, setBkkAddress] = useState(settings.bkkAddress);
  const [taxId, setTaxId] = useState(settings.taxId);
  const [license, setLicense] = useState(settings.license);

  const openEdit = () => {
    setLineId(settings.lineId);
    setLineUrl(settings.lineUrl);
    setWorkingHours(settings.workingHours);
    setPhones(settings.phones);
    setHqAddress(settings.hqAddress);
    setBkkAddress(settings.bkkAddress);
    setTaxId(settings.taxId);
    setLicense(settings.license);
    setEditOpen(true);
  };

  const saveEdit = () => {
    settings.setContact({ lineId, lineUrl, workingHours, phones, hqAddress, bkkAddress, taxId, license });
    setEditOpen(false);
    toast.success("บันทึกข้อมูลติดต่อแล้ว — ทุกคนเห็นการเปลี่ยนแปลงทันที");
  };

  const updatePhone = (i: number, patch: Partial<PhoneEntry>) => {
    setPhones((arr) => arr.map((p, idx) => idx === i ? { ...p, ...patch } : p));
  };
  const addPhone = () => setPhones([...phones, { label: "", num: "" }]);
  const removePhone = (i: number) => setPhones(phones.filter((_, idx) => idx !== i));

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
      <header className="px-6 py-6 max-w-5xl mx-auto flex items-center gap-3">
        <Link to="/"><Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">ข้อมูลติดต่อ</h1>
          <p className="text-sm text-muted-foreground">Line, เบอร์โทรแต่ละแผนก และที่อยู่บริษัท</p>
        </div>
        {isAdmin && (
          <Button variant="outline" onClick={openEdit}>
            <Edit3 className="w-4 h-4 mr-2" /> แก้ไข (Admin)
          </Button>
        )}
      </header>

      <main className="max-w-5xl mx-auto px-6 pb-16 space-y-6">
        <section className="rounded-3xl bg-card border shadow-soft p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><MessageCircle className="w-5 h-5 text-emerald-600" /> Line Official</h2>
          <div className="grid md:grid-cols-[200px_1fr] gap-4 items-center">
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex flex-col items-center justify-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(settings.lineUrl)}`}
                alt="Line QR"
                className="w-44 h-44 rounded-lg bg-white p-2"
              />
              <p className="text-xs text-muted-foreground mt-2">สแกนเพิ่มเพื่อน</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Line ID</p>
              <p className="text-2xl font-bold text-emerald-700">{settings.lineId}</p>
              <a href={settings.lineUrl} target="_blank" rel="noreferrer" className="inline-block">
                <Button className="bg-emerald-600 hover:bg-emerald-700"><MessageCircle className="w-4 h-4 mr-2" /> เพิ่มเพื่อนบน Line</Button>
              </a>
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-card border shadow-soft p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Phone className="w-5 h-5 text-primary" /> เบอร์โทรแต่ละแผนก</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {settings.phones.map((p, i) => (
              <a key={`${p.label}-${i}`} href={`tel:${p.num.replace(/-/g, "")}`} className="flex items-center justify-between rounded-2xl border bg-muted/30 hover:bg-muted/50 transition p-4">
                <div>
                  <p className="text-xs text-muted-foreground">{p.label}</p>
                  <p className="font-bold text-lg">{p.num}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center"><Phone className="w-4 h-4" /></div>
              </a>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-card border shadow-soft p-6 space-y-3">
          <h2 className="text-xl font-bold flex items-center gap-2"><Clock className="w-5 h-5 text-accent" /> เวลาทำการ</h2>
          <p className="text-sm">{settings.workingHours}</p>
        </section>

        <section className="rounded-3xl bg-card border shadow-soft p-6 space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2"><MapPin className="w-5 h-5 text-destructive" /> ที่อยู่บริษัท</h2>
          <div>
            <p className="font-semibold">บริษัท สแตนดาร์ดทัวร์ จำกัด</p>
            <p className="text-sm text-muted-foreground mt-1">เลขประจำตัวผู้เสียภาษี {settings.taxId} · ใบอนุญาตเลขที่ {settings.license}</p>
          </div>
          <div className="rounded-2xl border bg-muted/30 p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">สำนักงานใหญ่</p>
            <p className="text-sm">{settings.hqAddress}</p>
          </div>
          <div className="rounded-2xl border bg-muted/30 p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">สาขากรุงเทพฯ</p>
            <p className="text-sm">{settings.bkkAddress}</p>
          </div>
        </section>
      </main>

      {/* Admin Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>แก้ไขข้อมูลติดต่อ (Admin)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Line ID</Label><Input value={lineId} onChange={(e) => setLineId(e.target.value)} /></div>
              <div><Label>Line URL</Label><Input value={lineUrl} onChange={(e) => setLineUrl(e.target.value)} /></div>
            </div>
            <div><Label>เวลาทำการ</Label><Input value={workingHours} onChange={(e) => setWorkingHours(e.target.value)} /></div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>เบอร์โทรแผนก</Label>
                <Button size="sm" variant="outline" onClick={addPhone}><Plus className="w-3 h-3 mr-1" />เพิ่ม</Button>
              </div>
              <div className="space-y-2">
                {phones.map((p, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input className="flex-1" placeholder="แผนก" value={p.label} onChange={(e) => updatePhone(i, { label: e.target.value })} />
                    <Input className="w-44" placeholder="08x-xxx-xxxx" value={p.num} onChange={(e) => updatePhone(i, { num: e.target.value })} />
                    <Button size="icon" variant="ghost" onClick={() => removePhone(i)}><X className="w-4 h-4 text-destructive" /></Button>
                  </div>
                ))}
              </div>
            </div>

            <div><Label>ที่อยู่สำนักงานใหญ่</Label><Input value={hqAddress} onChange={(e) => setHqAddress(e.target.value)} /></div>
            <div><Label>ที่อยู่สาขากรุงเทพฯ</Label><Input value={bkkAddress} onChange={(e) => setBkkAddress(e.target.value)} /></div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label>เลขประจำตัวผู้เสียภาษี</Label><Input value={taxId} onChange={(e) => setTaxId(e.target.value)} /></div>
              <div><Label>เลขใบอนุญาต</Label><Input value={license} onChange={(e) => setLicense(e.target.value)} /></div>
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
