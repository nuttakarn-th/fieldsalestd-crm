import { useState, useEffect, useRef } from "react";
import { User as UserIcon, Save, Eye, EyeOff, Camera, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth, useCurrentUser } from "@/store/authStore";
import { roleBadgeColor } from "@/config/roleMenus";
import { compressImage } from "@/lib/imageCompression";
import { toast } from "sonner";

export default function MyProfile() {
  const user = useCurrentUser();
  const updateUser = useAuth((s) => s.updateUser);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [tel, setTel] = useState("");
  const [pwd, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [avatar, setAvatar] = useState<string | undefined>(undefined);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name);
      setEmail(user.email ?? "");
      setTel(user.tel ?? "");
      setPwd(user.password);
      setAvatar(user.avatar_url);
    }
  }, [user]);

  if (!user) return null;

  const save = () => {
    if (!fullName.trim()) {
      toast.error("กรุณากรอกชื่อ-นามสกุล");
      return;
    }
    updateUser(user.user_id, { full_name: fullName.trim(), email, tel, password: pwd, avatar_url: avatar });
    toast.success("บันทึกข้อมูลเรียบร้อย");
  };

  const handleFile = async (f: File | null) => {
    if (!f) return;
    try {
      const r = await compressImage(f, { maxWidth: 512, maxSizeKB: 200 });
      setAvatar(r.dataUrl);
      updateUser(user.user_id, { avatar_url: r.dataUrl });
      toast.success("อัปโหลดรูปโปรไฟล์เรียบร้อย");
    } catch (e) {
      toast.error("อัปโหลดรูปไม่สำเร็จ");
    }
  };

  const removeAvatar = () => {
    setAvatar(undefined);
    updateUser(user.user_id, { avatar_url: "" });
    toast.success("ลบรูปโปรไฟล์แล้ว");
  };

  return (
    <div className="p-4 sm:p-6 max-w-2xl space-y-5">
      <div className="flex items-center gap-4">
        <div className="relative group">
          {avatar ? (
            <img src={avatar} alt={user.full_name} className="w-20 h-20 rounded-2xl object-cover shadow-glow" />
          ) : (
            <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${roleBadgeColor(user.role)} flex items-center justify-center shadow-glow text-2xl font-bold text-white`}>
              {user.full_name[0]?.toUpperCase() ?? <UserIcon className="w-8 h-8" />}
            </div>
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-elegant hover:scale-105 transition"
            title="เปลี่ยนรูปโปรไฟล์"
          >
            <Camera className="w-4 h-4" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <div>
          <h1 className="text-2xl font-bold">My Profile</h1>
          <p className="text-sm text-muted-foreground">แก้ไขข้อมูลส่วนตัว · อัปโหลดรูปโปรไฟล์</p>
          {avatar && (
            <button onClick={removeAvatar} className="text-xs text-destructive inline-flex items-center gap-1 mt-1 hover:underline">
              <Trash2 className="w-3 h-3" /> ลบรูป
            </button>
          )}
        </div>
      </div>

      <div className="bg-card rounded-xl border shadow-soft p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">User ID</p>
            <p className="font-mono">{user.user_id}</p>
          </div>
          <Badge className={`bg-gradient-to-br ${roleBadgeColor(user.role)} text-white border-0`}>{user.role}</Badge>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold">ชื่อ-นามสกุล</label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="ชื่อ นามสกุล" />
          </div>
          <div>
            <label className="text-xs font-semibold">Username</label>
            <Input value={user.username} disabled />
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
            <button
              type="button"
              onClick={() => setShowPwd((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
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
        <div className="pt-2">
          <Button onClick={save} className="bg-gradient-primary text-primary-foreground">
            <Save className="w-4 h-4 mr-1" /> บันทึก
          </Button>
        </div>
      </div>
    </div>
  );
}