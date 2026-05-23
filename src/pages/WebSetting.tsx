/**
 * WebSetting.tsx — ตั้งค่าระบบ Web (Admin เท่านั้น)
 * Sidebar: ✎ คำอธิบายหน้า | 🤖 Bot Chat | 🖼️ Login Banner
 */
import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import {
  Settings2, HelpCircle, Bot, Image as ImageIcon,
  Save, RotateCcw, ChevronRight, Check,
  ToggleLeft, ToggleRight, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrentUser } from "@/store/authStore";
import {
  useWebSettings, PAGE_HELP_DEFAULTS,
  type BotSettings,
} from "@/store/webSettingsStore";
import { toast } from "sonner";

type SidebarTab = "help" | "bot" | "banner";

const PAGE_LABELS: Record<string, string> = {
  "service-stock":        "Service and Stock",
  "customers":            "Leads / Customers",
  "pipeline":             "Sales Pipeline",
  "followup":             "Follow-up",
  "mission":              "Mission (Check-in)",
  "planning":             "Planning + Route",
  "executive-dashboard":  "Executive Dashboard",
  "quotation":            "Quotation / Invoice",
  "financial-report":     "Financial Report",
  "sales-mission":        "Sales Mission (Manager)",
  "targets":              "Target Pipeline",
  "heatmap":              "Province Heatmap",
  "booking-overview":     "Booking Overview",
  "campaigns":            "Campaign Management",
  "contents":             "Contents Management",
  "marketing-leads":      "Marketing Leads",
  "payment":              "Payment / Invoice",
  "ob-dashboard":         "OB Dashboard",
};

function ToggleSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${value ? "bg-primary" : "bg-muted"}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${value ? "translate-x-4.5" : "translate-x-0.5"}`} />
    </button>
  );
}

/* ── Help Text Editor ── */
function HelpTextSection() {
  const pageHelp = useWebSettings((s) => s.pageHelp);
  const setPageHelp = useWebSettings((s) => s.setPageHelp);
  const resetPageHelp = useWebSettings((s) => s.resetPageHelp);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const keys = Object.keys(PAGE_HELP_DEFAULTS);

  const openEdit = (key: string) => {
    setEditing(key);
    setDraft(pageHelp[key] ?? PAGE_HELP_DEFAULTS[key] ?? "");
  };

  const save = (key: string) => {
    setPageHelp(key, draft.trim() || PAGE_HELP_DEFAULTS[key]);
    toast.success("บันทึกคำอธิบายแล้ว ✅");
    setEditing(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <HelpCircle className="w-5 h-5 text-primary" />
        <div>
          <h2 className="font-bold text-base">คำอธิบายหน้า (?) Tooltip</h2>
          <p className="text-xs text-muted-foreground">ข้อความที่แสดงเมื่อ User กด (?) บน Title ของแต่ละหน้า</p>
        </div>
      </div>

      <div className="space-y-2">
        {keys.map((key) => {
          const label = PAGE_LABELS[key] ?? key;
          const current = pageHelp[key] ?? PAGE_HELP_DEFAULTS[key];
          const isCustom = !!pageHelp[key];
          const isEditing = editing === key;

          return (
            <div key={key} className="bg-card rounded-xl border p-3 space-y-2">
              <div className="flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{label}</span>
                  {isCustom && <Badge variant="outline" className="text-[10px] text-primary border-primary/40">แก้ไขแล้ว</Badge>}
                </div>
                <div className="flex gap-1">
                  {isCustom && (
                    <button
                      onClick={() => { resetPageHelp(key); toast.success("รีเซ็ตเป็นค่าเริ่มต้น"); if (editing === key) setEditing(null); }}
                      className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" /> รีเซ็ต
                    </button>
                  )}
                  <button
                    onClick={() => isEditing ? setEditing(null) : openEdit(key)}
                    className="text-[10px] text-primary hover:underline"
                  >
                    {isEditing ? "ยกเลิก" : "✎ แก้ไข"}
                  </button>
                </div>
              </div>

              {isEditing ? (
                <div className="space-y-2">
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={3}
                    className="text-xs resize-none"
                    placeholder={PAGE_HELP_DEFAULTS[key]}
                  />
                  <Button size="sm" onClick={() => save(key)} className="bg-gradient-primary text-primary-foreground h-7 text-xs gap-1">
                    <Save className="w-3 h-3" /> บันทึก
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground leading-relaxed">{current}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Bot Settings ── */
function BotSection() {
  const bot = useWebSettings((s) => s.botSettings);
  const setBotSettings = useWebSettings((s) => s.setBotSettings);

  const toggle = (key: keyof BotSettings) => {
    const val = bot[key];
    if (typeof val === "boolean") setBotSettings({ [key]: !val } as Partial<BotSettings>);
  };

  const rows: { key: keyof BotSettings; label: string; desc: string }[] = [
    { key: "enabled",             label: "เปิดใช้งาน Chat Bot",              desc: "แสดงปุ่ม Bot และรับคำถามจาก User" },
    { key: "allowStockQuery",     label: "ถามข้อมูล Stock ได้",              desc: "ทัวร์, รถเช่า, โรงแรม, วีซ่า, ประกัน" },
    { key: "allowMyCustomers",    label: "ถามข้อมูลลูกค้าตัวเองได้",        desc: "Lead และ Customer ที่ assign ให้ตัวเอง" },
    { key: "allowOtherCustomers", label: "ถามข้อมูลลูกค้าคนอื่นได้",        desc: "เฉพาะ Manager/Admin เท่านั้น" },
    { key: "allowGeneral",        label: "ถามเรื่องทั่วไปได้",               desc: "สภาพอากาศ, ข่าว, การวางแผนเดินทาง" },
    { key: "tableResponse",       label: "ตอบเป็นตารางเมื่อข้อมูลมาก",      desc: "แสดงผลอ่านง่ายขึ้นเมื่อมีหลายรายการ" },
    { key: "smartSuggest",        label: "แนะนำคำถามถัดไป (Smart Card)",     desc: "ช่วยให้ Bot ถามกลับเพื่อเจาะจงคำตอบ เช่น ถาม 'คุนหมิง' → Bot แสดงตัวเลือกเพิ่ม" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Bot className="w-5 h-5 text-primary" />
        <div>
          <h2 className="font-bold text-base">ตั้งค่า Chat Bot</h2>
          <p className="text-xs text-muted-foreground">เปิด/ปิด สิทธิ์การสอบถาม และลักษณะการตอบกลับ</p>
        </div>
      </div>

      <div className="space-y-2">
        {rows.map(({ key, label, desc }) => (
          <div key={key} className="bg-card rounded-xl border p-3 flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
            <ToggleSwitch value={bot[key] as boolean} onChange={() => toggle(key)} />
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl border p-3 space-y-2">
        <p className="text-sm font-medium">ลักษณะการตอบ (Tone)</p>
        <Select value={bot.tone} onValueChange={(v) => setBotSettings({ tone: v as BotSettings["tone"] })}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="concise">กระชับ — ตอบสั้น เจาะจง</SelectItem>
            <SelectItem value="detailed">ละเอียด — อธิบายครบถ้วน</SelectItem>
            <SelectItem value="friendly">เป็นกันเอง — ใช้ภาษาทั่วไป</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Info className="w-3 h-3" /> ตั้งค่า Tone ส่งผลต่อรูปแบบประโยค ไม่ใช่ความถูกต้องของข้อมูล
        </p>
      </div>
    </div>
  );
}

/* ── Main ── */
export default function WebSetting() {
  const user = useCurrentUser();
  const [tab, setTab] = useState<SidebarTab>("help");

  if (!user || user.role !== "Admin") return <Navigate to="/" replace />;

  const tabs: { key: SidebarTab; label: string; icon: React.ElementType }[] = [
    { key: "help",   label: "คำอธิบายหน้า (?)",    icon: HelpCircle },
    { key: "bot",    label: "ตั้งค่า Chat Bot",      icon: Bot },
    { key: "banner", label: "Login Banner",           icon: ImageIcon },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background border-b px-4 sm:px-8 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-600 to-zinc-700 flex items-center justify-center shrink-0">
          <Settings2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold leading-tight">Web Setting</h1>
          <p className="text-xs text-muted-foreground">ตั้งค่าระบบ — เฉพาะ Admin</p>
        </div>
        <Link to="/" className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
          กลับหน้าหลัก <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="flex max-w-5xl mx-auto">
        {/* Sidebar */}
        <aside className="w-52 shrink-0 sticky top-[57px] self-start h-[calc(100vh-57px)] overflow-y-auto border-r p-3 space-y-1">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                tab === key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </button>
          ))}
        </aside>

        {/* Content */}
        <main className="flex-1 p-4 sm:p-6 min-h-[calc(100vh-57px)]">
          {tab === "help"   && <HelpTextSection />}
          {tab === "bot"    && <BotSection />}
          {tab === "banner" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <ImageIcon className="w-5 h-5 text-primary" />
                <div>
                  <h2 className="font-bold text-base">Login Banner</h2>
                  <p className="text-xs text-muted-foreground">จัดการ Slide ภาพและข้อความที่แสดงบนหน้าเข้าสู่ระบบ</p>
                </div>
              </div>
              <div className="bg-card rounded-xl border p-6 flex flex-col items-center gap-4 text-center">
                <ImageIcon className="w-12 h-12 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">จัดการ Banner หน้า Login ในหน้าถัดไป</p>
                <Link to="/login-banner">
                  <Button className="bg-gradient-primary text-primary-foreground gap-2">
                    <ImageIcon className="w-4 h-4" /> เปิดหน้า Login Banner
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
