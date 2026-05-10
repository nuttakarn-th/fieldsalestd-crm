import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, LogIn, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/store/authStore";
import { toast } from "sonner";

export default function Login() {
  const navigate = useNavigate();
  const login = useAuth((s) => s.login);
  const currentUserId = useAuth((s) => s.currentUserId);
  const theme = useAuth((s) => s.theme);
  const toggleTheme = useAuth((s) => s.toggleTheme);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  // After login always go to Hub (หน้าหลัก)
  const from = "/";

  useEffect(() => {
    if (currentUserId) navigate(from, { replace: true });
  }, [currentUserId, navigate, from]);

  const [submitting, setSubmitting] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const r = await login(username, password);
      if (!r.ok) {
        toast.error(r.error || "เข้าสู่ระบบไม่สำเร็จ");
        return;
      }
      toast.success("เข้าสู่ระบบสำเร็จ");
      navigate(from, { replace: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/40 to-background flex items-center justify-center px-4">
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs shadow-soft hover:shadow-elegant transition-smooth"
      >
        {theme === "day" ? <><Sun className="w-4 h-4" /> Day</> : <><Moon className="w-4 h-4" /> Night</>}
      </button>

      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-white items-center justify-center shadow-glow mb-3 overflow-hidden p-2">
            <img src="/favicon.ico" alt="Standard Tour" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold">Standard Tour CRM</h1>
          <p className="text-sm text-muted-foreground">เข้าสู่ระบบเพื่อเริ่มใช้งาน</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-2xl border shadow-elegant p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold">Username</label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              autoComplete="username"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-semibold">Password</label>
            <div className="relative">
              <Input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
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
          <Button type="submit" disabled={submitting} className="w-full bg-gradient-primary text-primary-foreground">
            <LogIn className="w-4 h-4 mr-2" /> {submitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </Button>

          <div className="text-[11px] text-muted-foreground bg-muted/40 rounded-lg p-3 space-y-1">
            <p className="font-semibold">บัญชี Admin เริ่มต้น</p>
            <p>Username: <span className="font-mono">admin</span></p>
            <p>Password: <span className="font-mono">adminstd</span></p>
          </div>
        </form>
      </div>
    </div>
  );
}