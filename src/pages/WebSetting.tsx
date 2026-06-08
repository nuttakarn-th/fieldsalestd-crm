/**
 * WebSetting.tsx — ตั้งค่าระบบ Web (Admin เท่านั้น)
 * Sidebar: ✎ คำอธิบายหน้า | 🤖 Bot Chat | 🖼️ Login Banner
 */
import { useState, useEffect } from "react";
import { Navigate, Link } from "react-router-dom";
import {
  Settings2, HelpCircle, Bot, Image as ImageIcon,
  Save, RotateCcw, ChevronLeft, Check,
  ToggleLeft, ToggleRight, Info,
  Brain, Plus, Trash2, Pencil, X, Tag, ChevronRight as ChevronRightIcon,
  ChevronRight, Globe2, Copy,
} from "lucide-react";
import { NavActions } from "@/components/NavActions";
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
import { useBotQA, type BotQA, type BotQADraft } from "@/store/botQAStore";
import { useSiteSettings, type OgMeta } from "@/store/siteSettingsStore";
import { generateOgHtml } from "@/lib/ogMeta";
import { toast } from "sonner";

type SidebarTab = "help" | "bot" | "training" | "banner" | "og";

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

/* ── Bot Training Section ── */
const CATEGORIES = ["ทั่วไป", "ทัวร์", "รถเช่า", "ราคา", "วีซ่า", "ประกัน", "เงื่อนไข", "ติดต่อ"];
const EMPTY_DRAFT: BotQADraft = { keywords: [], answer: "", category: "ทั่วไป", active: true, match_mode: "any", priority: 0 };

function BotTrainingSection() {
  const { qaList, loading, loadQA, addQA, updateQA, deleteQA, toggleQA } = useBotQA();
  const [showForm, setShowForm]   = useState(false);
  const [editId,  setEditId]      = useState<string | null>(null);
  const [draft,   setDraft]       = useState<BotQADraft>(EMPTY_DRAFT);
  const [kwInput, setKwInput]     = useState("");
  const [filter,  setFilter]      = useState<string>("ทั้งหมด");

  useEffect(() => { loadQA(); }, [loadQA]);

  const openAdd = () => {
    setEditId(null);
    setDraft(EMPTY_DRAFT);
    setKwInput("");
    setShowForm(true);
  };

  const openEdit = (qa: BotQA) => {
    setEditId(qa.id);
    setDraft({ keywords: qa.keywords, answer: qa.answer, category: qa.category, active: qa.active, match_mode: qa.match_mode, priority: qa.priority });
    setKwInput(qa.keywords.join(", "));
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditId(null); };

  const handleKwBlur = () => {
    const kws = kwInput.split(/[,\n]/).map(k => k.trim().toLowerCase()).filter(Boolean);
    setDraft(d => ({ ...d, keywords: kws }));
  };

  const handleSave = async () => {
    const kws = kwInput.split(/[,\n]/).map(k => k.trim().toLowerCase()).filter(Boolean);
    if (!kws.length) { toast.error("กรุณาใส่ Keyword อย่างน้อย 1 คำ"); return; }
    if (!draft.answer.trim()) { toast.error("กรุณาใส่คำตอบ"); return; }
    const payload = { ...draft, keywords: kws };
    if (editId) {
      await updateQA(editId, payload);
    } else {
      await addQA(payload);
    }
    closeForm();
  };

  const categories = ["ทั้งหมด", ...CATEGORIES];
  const filtered = filter === "ทั้งหมด" ? qaList : qaList.filter(q => q.category === filter);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          <div>
            <h2 className="font-bold text-base">เทรน Bot</h2>
            <p className="text-xs text-muted-foreground">เพิ่มคำถาม-คำตอบที่ Bot จะใช้ตอบก่อน rule engine เสมอ</p>
          </div>
        </div>
        <Button size="sm" onClick={openAdd} className="bg-gradient-to-br from-fuchsia-500 to-violet-600 text-white gap-1.5 shrink-0">
          <Plus className="w-3.5 h-3.5" /> เพิ่ม Q&A
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Q&A ทั้งหมด", value: qaList.length, color: "text-violet-600" },
          { label: "เปิดใช้งาน",  value: qaList.filter(q => q.active).length, color: "text-green-600" },
          { label: "ปิดใช้งาน",   value: qaList.filter(q => !q.active).length, color: "text-muted-foreground" },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl border p-3 text-center">
            <p className={"text-xl font-bold " + s.color}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Category filter */}
      <div className="flex gap-1.5 flex-wrap">
        {categories.map(c => (
          <button key={c} onClick={() => setFilter(c)}
            className={"text-[11px] px-2.5 py-1 rounded-full border transition-colors " + (
              filter === c
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
            )}
          >{c}</button>
        ))}
      </div>

      {/* Q&A Form */}
      {showForm && (
        <div className="bg-card rounded-2xl border-2 border-fuchsia-200 dark:border-fuchsia-800 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-sm">{editId ? "✎ แก้ไข Q&A" : "➕ เพิ่ม Q&A ใหม่"}</p>
            <button onClick={closeForm} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>

          <div className="space-y-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Keywords (คั่นด้วย , หรือ Enter)</label>
              <Input
                value={kwInput}
                onChange={e => setKwInput(e.target.value)}
                onBlur={handleKwBlur}
                placeholder="เช่น โปรโมชัน, ส่วนลด, ราคาพิเศษ"
                className="mt-1 text-sm h-9"
              />
              {draft.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {draft.keywords.map(k => (
                    <span key={k} className="text-[10px] px-2 py-0.5 rounded-full bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-700 dark:text-fuchsia-300">
                      {k}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">คำตอบ</label>
              <Textarea
                value={draft.answer}
                onChange={e => setDraft(d => ({ ...d, answer: e.target.value }))}
                rows={4}
                placeholder="พิมพ์คำตอบที่ต้องการให้ Bot ตอบ..."
                className="mt-1 text-sm resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">หมวดหมู่</label>
                <Select value={draft.category} onValueChange={v => setDraft(d => ({ ...d, category: v }))}>
                  <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Match Mode</label>
                <Select value={draft.match_mode} onValueChange={v => setDraft(d => ({ ...d, match_mode: v as "any"|"all" }))}>
                  <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">any — ตรงคำใดก็ได้</SelectItem>
                    <SelectItem value="all">all — ต้องมีทุกคำ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-muted-foreground">Priority</label>
                <Input
                  type="number" min={0} max={100}
                  value={draft.priority}
                  onChange={e => setDraft(d => ({ ...d, priority: parseInt(e.target.value) || 0 }))}
                  className="w-16 h-8 text-xs text-center"
                />
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <label className="text-xs font-medium text-muted-foreground">เปิดใช้งาน</label>
                <ToggleSwitch value={draft.active} onChange={v => setDraft(d => ({ ...d, active: v }))} />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={handleSave} className="bg-gradient-to-br from-fuchsia-500 to-violet-600 text-white gap-1.5 flex-1">
              <Save className="w-3.5 h-3.5" /> {editId ? "บันทึกการแก้ไข" : "เพิ่ม Q&A"}
            </Button>
            <Button size="sm" variant="outline" onClick={closeForm}>ยกเลิก</Button>
          </div>
        </div>
      )}

      {/* Q&A List */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">กำลังโหลด...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <Brain className="w-10 h-10 mx-auto text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">ยังไม่มี Q&A ในหมวดนี้</p>
          <Button size="sm" variant="outline" onClick={openAdd} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> เพิ่มคำถามแรก
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(qa => (
            <div key={qa.id} className={"bg-card rounded-xl border p-3 space-y-2 transition-opacity " + (!qa.active ? "opacity-50" : "")}>
              {/* Header row */}
              <div className="flex items-start gap-2 justify-between">
                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                  <Badge variant="outline" className="text-[10px] shrink-0">{qa.category}</Badge>
                  {qa.priority > 0 && (
                    <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300 shrink-0">P{qa.priority}</Badge>
                  )}
                  {!qa.active && <Badge variant="outline" className="text-[10px] text-muted-foreground shrink-0">ปิด</Badge>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => toggleQA(qa.id)}
                    className={"text-[10px] px-2 py-0.5 rounded-full border transition-colors " + (
                      qa.active
                        ? "border-green-300 text-green-600 hover:bg-green-50"
                        : "border-muted text-muted-foreground hover:bg-muted"
                    )}
                  >{qa.active ? "เปิด" : "ปิด"}</button>
                  <button onClick={() => openEdit(qa)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { if (confirm("ลบ Q&A นี้?")) deleteQA(qa.id); }}
                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Keywords */}
              <div className="flex flex-wrap gap-1">
                {qa.keywords.map(k => (
                  <span key={k} className="text-[10px] px-2 py-0.5 rounded-full bg-fuchsia-50 dark:bg-fuchsia-950/30 text-fuchsia-700 dark:text-fuchsia-300 border border-fuchsia-200 dark:border-fuchsia-800">
                    {k}
                  </span>
                ))}
                <span className="text-[10px] text-muted-foreground/60 px-1">({qa.match_mode})</span>
              </div>

              {/* Answer preview */}
              <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-2.5 py-1.5 whitespace-pre-wrap line-clamp-3">{qa.answer}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── OG Meta ── */
function OgCard({
  label, url, draft, setDraft, onSave, onCopy,
}: {
  label: string;
  url: string;
  draft: OgMeta;
  setDraft: React.Dispatch<React.SetStateAction<OgMeta>>;
  onSave: () => void;
  onCopy: () => void;
}) {
  const domain = new URL(url).hostname;
  return (
    <div className="bg-card rounded-2xl border p-4 space-y-4">
      {/* Card header */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm">{label}</p>
          <p className="text-[11px] text-muted-foreground font-mono truncate">{url}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={onCopy} className="gap-1.5 text-xs h-8">
            <Copy className="w-3.5 h-3.5" /> คัดลอก HTML Tags
          </Button>
          <Button size="sm" onClick={onSave} className="bg-gradient-primary text-primary-foreground gap-1.5 text-xs h-8">
            <Save className="w-3.5 h-3.5" /> บันทึก
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Fields */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">OG Title</label>
            <Input
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              className="mt-1 text-sm h-9"
              placeholder="ชื่อหน้าเมื่อแชร์"
            />
            <p className="text-[10px] text-muted-foreground mt-0.5">{draft.title.length}/60 ตัวอักษร (แนะนำไม่เกิน 60)</p>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">OG Description</label>
            <Textarea
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              rows={3}
              className="mt-1 text-sm resize-none"
              placeholder="คำอธิบายสั้นๆ เมื่อแชร์ลิงก์"
            />
            <p className="text-[10px] text-muted-foreground mt-0.5">{draft.description.length}/160 ตัวอักษร (แนะนำไม่เกิน 160)</p>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">OG Image URL</label>
            <Input
              value={draft.imageUrl}
              onChange={(e) => setDraft((d) => ({ ...d, imageUrl: e.target.value }))}
              className="mt-1 text-sm h-9 font-mono text-xs"
              placeholder="https://..."
            />
            <p className="text-[10px] text-muted-foreground mt-0.5">แนะนำขนาด 1200×630 px</p>
          </div>

          {/* Image thumbnail */}
          {draft.imageUrl && (
            <div className="rounded-lg overflow-hidden border aspect-video bg-muted">
              <img
                src={draft.imageUrl}
                alt="OG Preview"
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
          )}
        </div>

        {/* Social preview card */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Preview (Facebook / LINE)</p>
          <div className="border rounded-xl overflow-hidden shadow-sm bg-white dark:bg-zinc-900 max-w-xs">
            {draft.imageUrl ? (
              <div className="aspect-video bg-muted overflow-hidden">
                <img
                  src={draft.imageUrl}
                  alt="og preview"
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
            ) : (
              <div className="aspect-video bg-muted flex items-center justify-center">
                <Globe2 className="w-8 h-8 text-muted-foreground/30" />
              </div>
            )}
            <div className="px-3 py-2 border-t">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{domain}</p>
              <p className="text-xs font-semibold line-clamp-2 mt-0.5 text-zinc-900 dark:text-zinc-100">
                {draft.title || "ชื่อหน้า..."}
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-0.5">
                {draft.description || "คำอธิบาย..."}
              </p>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">* Preview อิงจากค่าในฟอร์ม ยังไม่ได้บันทึก</p>
        </div>
      </div>
    </div>
  );
}

function OgMetaSection() {
  const ogMain     = useSiteSettings((s) => s.ogMain);
  const ogPackages = useSiteSettings((s) => s.ogPackages);
  const setOgMain     = useSiteSettings((s) => s.setOgMain);
  const setOgPackages = useSiteSettings((s) => s.setOgPackages);

  const [mainDraft, setMainDraft] = useState<OgMeta>({ ...ogMain });
  const [pkgDraft,  setPkgDraft]  = useState<OgMeta>({ ...ogPackages });

  // Sync if another tab modifies store
  useEffect(() => { setMainDraft((d) => ({ ...d, ...ogMain })); }, [ogMain]);
  useEffect(() => { setPkgDraft((d)  => ({ ...d, ...ogPackages })); }, [ogPackages]);

  const saveMain = () => { setOgMain(mainDraft); toast.success("บันทึก OG Meta หน้าหลักแล้ว ✅"); };
  const savePkg  = () => { setOgPackages(pkgDraft); toast.success("บันทึก OG Meta หน้าทัวร์แล้ว ✅"); };

  const copyHtml = (og: OgMeta, url: string) => {
    const html = generateOgHtml(og, url);
    navigator.clipboard.writeText(html).then(() => toast.success("คัดลอก HTML Tags แล้ว ✅"));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Globe2 className="w-5 h-5 text-primary" />
        <div>
          <h2 className="font-bold text-base">OG Meta Tags</h2>
          <p className="text-xs text-muted-foreground">ชื่อ, คำอธิบาย และภาพที่แสดงเมื่อแชร์ลิงก์บน Facebook / LINE / Twitter</p>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 flex gap-2">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
          กด <strong>บันทึก</strong> เพื่ออัปเดตทันทีใน Browser (Google, Tab ชื่อ) — แต่ Facebook / LINE
          ใช้ static crawler ตอน build ต้องกด <strong>คัดลอก HTML Tags</strong> แล้วนำไปวางใน{" "}
          <code className="font-mono text-[11px] bg-amber-100 dark:bg-amber-900/30 px-1 rounded">index.html</code>{" "}
          แล้ว deploy ใหม่จึงจะเห็นผล
        </p>
      </div>

      <OgCard
        label="หน้าหลักระบบ"
        url="https://standardtour-hub.vercel.app/"
        draft={mainDraft}
        setDraft={setMainDraft}
        onSave={saveMain}
        onCopy={() => copyHtml(mainDraft, "https://standardtour-hub.vercel.app/")}
      />

      <OgCard
        label="หน้าโปรแกรมทัวร์ (ลูกค้า)"
        url="https://standardtour-hub.vercel.app/tour-packages"
        draft={pkgDraft}
        setDraft={setPkgDraft}
        onSave={savePkg}
        onCopy={() => copyHtml(pkgDraft, "https://standardtour-hub.vercel.app/tour-packages")}
      />
    </div>
  );
}

/* ── Main ── */
export default function WebSetting() {
  const user = useCurrentUser();
  const [tab, setTab] = useState<SidebarTab>("help");

  if (!user || user.role !== "Admin") return <Navigate to="/" replace />;

  const tabs: { key: SidebarTab; label: string; icon: React.ElementType }[] = [
    { key: "help",     label: "คำอธิบายหน้า (?)",  icon: HelpCircle },
    { key: "bot",      label: "ตั้งค่า Chat Bot",    icon: Bot },
    { key: "training", label: "เทรน Bot (Q&A)",      icon: Brain },
    { key: "banner",   label: "Login Banner",         icon: ImageIcon },
    { key: "og",       label: "OG Meta Tags",         icon: Globe2 },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b px-4 sm:px-6 h-14 flex items-center gap-3">
        {/* Logo + back */}
        <Link to="/" className="flex items-center gap-2 group shrink-0" title="กลับหน้าหลัก">
          <div className="w-8 h-8 rounded-full overflow-hidden group-hover:scale-105 transition shrink-0">
            <img src="/logo-icon.png" alt="Standard Tour" className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = "/logo-icon.svg"; }} />
          </div>
        </Link>
        {/* Breadcrumb — desktop only */}
        <Link to="/" className="hidden md:flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0">
          <ChevronLeft className="w-3.5 h-3.5" /> Hub
        </Link>
        <span className="hidden md:inline text-muted-foreground/40 text-xs">/</span>
        {/* Title — flex-1 on mobile */}
        <div className="flex items-center gap-2 min-w-0 flex-1 md:flex-none">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-600 to-zinc-700 flex items-center justify-center shrink-0">
            <Settings2 className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm leading-tight">Web Setting</p>
            <p className="text-[10px] text-muted-foreground leading-tight hidden sm:block">ตั้งค่าระบบ — เฉพาะ Admin</p>
          </div>
        </div>
        <div className="flex-1 hidden md:block" />
        <NavActions />
      </header>

      {/* Mobile tab bar */}
      <div className="md:hidden flex border-b overflow-x-auto">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={"flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all shrink-0 " + (
              tab === key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </button>
        ))}
      </div>

      <div className="flex max-w-5xl mx-auto">
        {/* Sidebar — desktop only */}
        <aside className="hidden md:block w-52 shrink-0 sticky top-14 self-start h-[calc(100vh-56px)] overflow-y-auto border-r p-3 space-y-1">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={"w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left " + (
                tab === key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </button>
          ))}
        </aside>

        {/* Content */}
        <main className="flex-1 p-4 sm:p-6 min-h-[calc(100vh-56px)]">
          {tab === "help"     && <HelpTextSection />}
          {tab === "bot"      && <BotSection />}
          {tab === "training" && <BotTrainingSection />}
          {tab === "og"       && <OgMetaSection />}
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
