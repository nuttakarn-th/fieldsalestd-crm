import { useState, useEffect, useRef } from "react";
import { User as UserIcon, Save, Eye, EyeOff, Camera, Trash2, Download, Edit3, X, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth, useCurrentUser } from "@/store/authStore";
import { useSiteSettings } from "@/store/siteSettingsStore";
import { roleBadgeColor } from "@/config/roleMenus";
import { compressImage } from "@/lib/imageCompression";
import { toPng } from "html-to-image";
import { toast } from "sonner";

const COMPANY_NAME = "บริษัท สแตนดาร์ดทัวร์ จำกัด";

export default function MyProfile() {
  const user = useCurrentUser();
  const updateUser = useAuth((s) => s.updateUser);
  const settings = useSiteSettings();

  const cardRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const lineQrRef = useRef<HTMLInputElement>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  // form state (used in edit dialog)
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [email, setEmail] = useState("");
  const [tel, setTel] = useState("");
  const [pwd, setPwd] = useState("");
  const [avatar, setAvatar] = useState<string | undefined>(undefined);
  const [lineQr, setLineQr] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name);
      setDepartment(user.department ?? user.role);
      setEmail(user.email ?? "");
      setTel(user.tel ?? "");
      setPwd(user.password);
      setAvatar(user.avatar_url);
      setLineQr(user.line_qr_url);
    }
  }, [user]);

  if (!user) return null;

  const save = () => {
    if (!fullName.trim()) {
      toast.error("กรุณากรอกชื่อ-นามสกุล");
      return;
    }
    updateUser(user.user_id, {
      full_name: fullName.trim(),
      department: department.trim() || undefined,
      email,
      tel,
      password: pwd,
      avatar_url: avatar,
      line_qr_url: lineQr,
    });
    toast.success("บันทึกข้อมูลเรียบร้อย");
    setEditOpen(false);
  };

  const handlePhotoFile = async (f: File | null) => {
    if (!f) return;
    try {
      const r = await compressImage(f, { maxWidth: 800, maxSizeKB: 250 });
      setAvatar(r.dataUrl);
    } catch {
      toast.error("อัปโหลดรูปไม่สำเร็จ");
    }
  };

  const handleLineQrFile = async (f: File | null) => {
    if (!f) return;
    try {
      const r = await compressImage(f, { maxWidth: 600, maxSizeKB: 200 });
      setLineQr(r.dataUrl);
    } catch {
      toast.error("อัปโหลด QR ไม่สำเร็จ");
    }
  };

  // vCard QR contains contact info
  const vCard = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${user.full_name}`,
    `ORG:${COMPANY_NAME}`,
    `TITLE:${user.department ?? user.role}`,
    user.tel ? `TEL;TYPE=cell:${user.tel}` : "",
    user.email ? `EMAIL:${user.email}` : "",
    `ADR:;;${settings.hqAddress};;;;TH`,
    `URL:https://www.standardtour.com`,
    "END:VCARD",
  ].filter(Boolean).join("\n");

  const downloadCard = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      // 4:5 ratio at high resolution
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });
      const a = document.createElement("a");
      a.download = `${user.full_name}_namecard.png`;
      a.href = dataUrl;
      a.click();
      toast.success("ดาวน์โหลดนามบัตรเรียบร้อย");
    } catch (e) {
      console.error(e);
      toast.error("ดาวน์โหลดไม่สำเร็จ");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-md mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">นามบัตรดิจิทัล</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
            <Edit3 className="w-4 h-4 mr-1" /> แก้ไข
          </Button>
          <Button size="sm" onClick={downloadCard} disabled={downloading} className="bg-gradient-primary text-primary-foreground">
            <Download className="w-4 h-4 mr-1" /> {downloading ? "กำลังบันทึก..." : "ดาวน์โหลด"}
          </Button>
        </div>
      </div>

      {/* Namecard — 4:5 vertical */}
      <div
        ref={cardRef}
        className="relative w-full bg-white text-gray-900 rounded-2xl border shadow-elegant overflow-hidden"
        style={{ aspectRatio: "4 / 5" }}
      >
        {/* Top accent stripe */}
        <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-fuchsia-600 via-purple-600 to-rose-500" />

        <div className="h-full flex flex-col items-center px-6 pt-10 pb-4 text-center">
          {/* Avatar */}
          <div className="mb-4">
            {avatar ? (
              <img src={avatar} alt={user.full_name} className="w-28 h-28 rounded-full object-cover border-4 border-white shadow-lg ring-2 ring-purple-200" />
            ) : (
              <div className={`w-28 h-28 rounded-full bg-gradient-to-br ${roleBadgeColor(user.role)} flex items-center justify-center text-3xl font-bold text-white border-4 border-white shadow-lg`}>
                {user.full_name[0]?.toUpperCase() ?? <UserIcon className="w-10 h-10" />}
              </div>
            )}
          </div>

          {/* Name */}
          <h2 className="text-2xl font-bold leading-tight">{user.full_name}</h2>
          <p className="text-sm text-gray-600 mt-0.5">{user.department || user.role}</p>
          <p className="text-xs text-gray-500 mt-0.5">{COMPANY_NAME}</p>

          {/* Contact info */}
          <div className="w-full mt-4 space-y-1 text-sm">
            {user.tel && <p className="text-gray-700">📱 {user.tel}</p>}
            {user.email && <p className="text-gray-700 truncate">✉️ {user.email}</p>}
          </div>

          {/* QR codes */}
          <div className="w-full mt-3 grid grid-cols-2 gap-3">
            <div className="flex flex-col items-center">
              <div className="bg-white p-1.5 rounded-md border">
                <QRCodeSVG value={vCard} size={80} level="M" />
              </div>
              <p className="text-[10px] text-gray-500 mt-1">Contact vCard</p>
            </div>
            <div className="flex flex-col items-center">
              {lineQr ? (
                <img src={lineQr} alt="Line QR" className="w-[80px] h-[80px] rounded-md border bg-white object-contain p-1" />
              ) : (
                <div className="w-[80px] h-[80px] rounded-md border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                  <QrCode className="w-6 h-6 text-gray-400" />
                </div>
              )}
              <p className="text-[10px] text-gray-500 mt-1">Line QR</p>
            </div>
          </div>

          {/* Footer info — small */}
          <div className="mt-auto pt-3 w-full">
            <p className="text-[9px] text-gray-500 leading-snug">
              {settings.hqAddress}
            </p>
            <p className="text-[9px] text-gray-500 leading-snug mt-0.5">
              www.standardtour.com · เลขผู้เสียภาษี {settings.taxId} · ใบอนุญาต {settings.license}
            </p>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        ส่งภาพนี้ให้ลูกค้าเพื่อ save เป็นรายชื่อในมือถือ — สแกน QR ซ้ายเพื่อเพิ่มเป็น Contact, ขวาเพื่อเพิ่มใน Line
      </p>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>แก้ไขข้อมูล Profile</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Avatar + Line QR uploads */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-semibold">รูป Profile</label>
                <div className="relative">
                  {avatar ? (
                    <img src={avatar} alt="" className="w-full aspect-square rounded-lg object-cover border" />
                  ) : (
                    <div className={`w-full aspect-square rounded-lg bg-gradient-to-br ${roleBadgeColor(user.role)} flex items-center justify-center text-2xl font-bold text-white`}>
                      {user.full_name[0]?.toUpperCase()}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => photoRef.current?.click()}
                    className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow"
                    title="เปลี่ยนรูป"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  {avatar && (
                    <button type="button" onClick={() => setAvatar(undefined)} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive text-white flex items-center justify-center text-xs">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                  <input ref={photoRef} type="file" accept="image/*" hidden onChange={(e) => handlePhotoFile(e.target.files?.[0] ?? null)} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold">Line QR ส่วนตัว</label>
                <div className="relative">
                  {lineQr ? (
                    <img src={lineQr} alt="" className="w-full aspect-square rounded-lg object-contain bg-white border p-2" />
                  ) : (
                    <div className="w-full aspect-square rounded-lg border-2 border-dashed flex items-center justify-center bg-muted/30">
                      <QrCode className="w-10 h-10 text-muted-foreground" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => lineQrRef.current?.click()}
                    className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow"
                    title="อัปโหลด QR"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  {lineQr && (
                    <button type="button" onClick={() => setLineQr(undefined)} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive text-white flex items-center justify-center text-xs">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                  <input ref={lineQrRef} type="file" accept="image/*" hidden onChange={(e) => handleLineQrFile(e.target.files?.[0] ?? null)} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold">ชื่อ-นามสกุล *</label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold">Username</label>
                <Input value={user.username} disabled />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold">แผนก / ตำแหน่ง</label>
                <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="เช่น Senior Sales" />
              </div>
              <div>
                <label className="text-xs font-semibold">Role</label>
                <div className="h-9 flex items-center">
                  <Badge className={`bg-gradient-to-br ${roleBadgeColor(user.role)} text-white border-0`}>{user.role}</Badge>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold">Password</label>
              <div className="relative">
                <Input
                  type={showPwd ? "text" : "password"}
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  className="pr-10"
                />
                <button type="button" onClick={() => setShowPwd((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">เว้นเหมือนเดิมเพื่อไม่เปลี่ยน</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold">E-mail</label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
              </div>
              <div>
                <label className="text-xs font-semibold">Tel</label>
                <Input value={tel} onChange={(e) => setTel(e.target.value)} placeholder="08x-xxx-xxxx" />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>ยกเลิก</Button>
            <Button onClick={save} className="bg-gradient-primary text-primary-foreground">
              <Save className="w-4 h-4 mr-1" /> บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
