import { useState } from "react";
import { Plus, Pencil, Trash2, Eye, EyeOff, KeyRound, UserCog, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth, ALL_ROLES, type AppRole, type AppUser } from "@/store/authStore";
import { toast } from "sonner";

type FormState = {
  full_name: string;
  username: string;
  password: string;
  role: AppRole | "";
  email: string;
  tel: string;
};

const emptyForm: FormState = { full_name: "", username: "", password: "", role: "", email: "", tel: "" };

export default function UserManagement() {
  const users = useAuth((s) => s.users);
  const addUser = useAuth((s) => s.addUser);
  const updateUser = useAuth((s) => s.updateUser);
  const deleteUser = useAuth((s) => s.deleteUser);
  const resetPassword = useAuth((s) => s.resetPassword);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [resetTarget, setResetTarget] = useState<AppUser | null>(null);
  const [newPwd, setNewPwd] = useState("");

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (u: AppUser) => {
    setEditing(u);
    setForm({
      full_name: u.full_name,
      username: u.username,
      password: u.password,
      role: u.role === "Admin" ? "" : u.role,
      email: u.email ?? "",
      tel: u.tel ?? "",
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (editing) {
      if (!form.full_name.trim() || !form.username.trim() || !form.password.trim()) {
        toast.error("กรุณากรอกข้อมูลที่บังคับ");
        return;
      }
      // username uniqueness (excluding self)
      const dup = users.some(
        (x) => x.user_id !== editing.user_id && x.username.toLowerCase() === form.username.trim().toLowerCase(),
      );
      if (dup) { toast.error("Username นี้ถูกใช้แล้ว"); return; }
      updateUser(editing.user_id, {
        full_name: form.full_name.trim(),
        username: form.username.trim(),
        password: form.password,
        role: editing.role === "Admin" ? "Admin" : (form.role || editing.role),
        email: form.email,
        tel: form.tel,
      });
      toast.success("อัปเดต User เรียบร้อย");
      setOpen(false);
      return;
    }
    if (!form.role) { toast.error("กรุณาเลือก Role"); return; }
    const r = await addUser({
      full_name: form.full_name,
      username: form.username,
      password: form.password,
      role: form.role as AppRole,
      email: form.email,
      tel: form.tel,
    });
    if (!r.ok) { toast.error(r.error || "เพิ่ม User ไม่สำเร็จ"); return; }
    toast.success(`เพิ่ม User สำเร็จ (${r.user_id})`);
    setOpen(false);
  };

  const handleDelete = (u: AppUser) => {
    if (u.role === "Admin") { toast.error("ไม่สามารถลบ Admin"); return; }
    if (!confirm(`ลบ User: ${u.full_name} (${u.username}) ?`)) return;
    deleteUser(u.user_id);
    toast.success("ลบ User แล้ว");
  };

  const handleReset = async () => {
    if (!resetTarget || !newPwd.trim()) { toast.error("กรุณาใส่ Password ใหม่"); return; }
    await resetPassword(resetTarget.user_id, newPwd);
    toast.success(`Reset Password ของ ${resetTarget.username} แล้ว`);
    setResetTarget(null);
    setNewPwd("");
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-gold flex items-center justify-center shadow-glow">
            <UserCog className="w-5 h-5 text-gold-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Add/Edit User</h1>
            <p className="text-sm text-muted-foreground">จัดการผู้ใช้งานของระบบ — สำหรับ Admin เท่านั้น</p>
          </div>
        </div>
        <Button onClick={openAdd} className="bg-gradient-primary text-primary-foreground">
          <Plus className="w-4 h-4 mr-1" /> Add User
        </Button>
      </div>

      <div className="bg-card rounded-xl border shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="p-3 text-left">User ID</th>
                <th className="p-3 text-left">ชื่อ-นามสกุล</th>
                <th className="p-3 text-left">Username</th>
                <th className="p-3 text-left">Password</th>
                <th className="p-3 text-left">Role</th>
                <th className="p-3 text-left">E-mail</th>
                <th className="p-3 text-left">Tel</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((u) => {
                const isAdmin = u.role === "Admin";
                const reveal = revealed[u.user_id];
                return (
                  <tr key={u.user_id} className="hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs">{u.user_id}</td>
                    <td className="p-3 font-semibold">{u.full_name}</td>
                    <td className="p-3">{u.username}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">{reveal ? (u.plain_password ?? "(reset เพื่อดูรหัส)") : "••••••"}</span>
                        <button
                          onClick={() => setRevealed({ ...revealed, [u.user_id]: !reveal })}
                          className="text-muted-foreground hover:text-foreground"
                          aria-label="toggle password"
                        >
                          {reveal ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge variant={isAdmin ? "default" : "outline"} className={isAdmin ? "bg-destructive text-destructive-foreground" : ""}>
                        {u.role}
                      </Badge>
                    </td>
                    <td className="p-3 text-muted-foreground">{u.email || "-"}</td>
                    <td className="p-3 text-muted-foreground">{u.tel || "-"}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(u)} title="Edit">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setResetTarget(u)} title="Reset Password">
                          <KeyRound className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(u)}
                          disabled={isAdmin}
                          title={isAdmin ? "ลบ Admin ไม่ได้" : "Delete"}
                        >
                          <Trash2 className={`w-4 h-4 ${isAdmin ? "text-muted-foreground/40" : "text-destructive"}`} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? `แก้ไข User: ${editing.user_id}` : "เพิ่ม User ใหม่"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold">ชื่อ-นามสกุล *</label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold">Username *</label>
                <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-semibold">Password *</label>
                <Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold">Role *</label>
              {editing?.role === "Admin" ? (
                <Input value="Admin (ไม่สามารถเปลี่ยนได้)" disabled />
              ) : (
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as AppRole })}>
                  <SelectTrigger><SelectValue placeholder="เลือก Role..." /></SelectTrigger>
                  <SelectContent>
                    {ALL_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold">E-mail</label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-semibold">Tel</label>
                <Input value={form.tel} onChange={(e) => setForm({ ...form, tel: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleSubmit} className="bg-gradient-primary text-primary-foreground">
              {editing ? "บันทึกการแก้ไข" : "เพิ่ม User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset password dialog */}
      <Dialog open={!!resetTarget} onOpenChange={(o) => !o && setResetTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          {resetTarget && (
            <div className="space-y-3">
              <div className="rounded-lg bg-muted/40 p-3 text-sm">
                <p>User: <span className="font-semibold">{resetTarget.full_name}</span></p>
                <p className="text-xs text-muted-foreground">Username: {resetTarget.username}</p>
              </div>
              <div>
                <label className="text-xs font-semibold">Password ใหม่</label>
                <Input value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="กรอก Password ใหม่" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetTarget(null)}>
              <X className="w-4 h-4 mr-1" /> ยกเลิก
            </Button>
            <Button onClick={handleReset} className="bg-gradient-pink text-accent-foreground">
              <KeyRound className="w-4 h-4 mr-1" /> Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}