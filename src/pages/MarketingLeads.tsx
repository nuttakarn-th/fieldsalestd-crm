/**
 * MarketingLeads.tsx
 * Marketing → เพิ่ม Prospect / Lead ใหม่
 * Sales → ดู Lead ที่มีอยู่ กดขอรับ Lead ไปติดตาม
 */
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Users, Plus, Phone, ChevronRight, Search,
  CheckCircle2, Clock, Trash2, Megaphone, X, Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useCurrentUser } from "@/store/authStore";
import { useMarketingLeads, type LeadSource, type MarketingLead } from "@/store/marketingLeadsStore";
import { PageHelp } from "@/components/PageHelp";
import { toast } from "sonner";

const SOURCES: LeadSource[] = ["LINE", "Facebook", "Instagram", "TikTok", "Website", "Walk-in", "Referral", "อื่นๆ"];

const SOURCE_COLOR: Record<LeadSource, string> = {
  LINE:       "bg-green-500/10 text-green-700 border-green-300",
  Facebook:   "bg-blue-500/10 text-blue-700 border-blue-300",
  Instagram:  "bg-pink-500/10 text-pink-700 border-pink-300",
  TikTok:     "bg-purple-500/10 text-purple-700 border-purple-300",
  Website:    "bg-indigo-500/10 text-indigo-700 border-indigo-300",
  "Walk-in":  "bg-amber-500/10 text-amber-700 border-amber-300",
  Referral:   "bg-emerald-500/10 text-emerald-700 border-emerald-300",
  "อื่นๆ":    "bg-slate-500/10 text-slate-700 border-slate-300",
};

function formatDateTH(iso: string) {
  const d = new Date(iso);
  const dd   = String(d.getDate()).padStart(2, "0");
  const mm   = String(d.getMonth() + 1).padStart(2, "0");
  const yy   = String(d.getFullYear()).slice(2);
  return `${dd}/${mm}/${yy}`;
}

/* ── Add Lead Form (Marketing only) ── */
function AddLeadForm({ onClose, createdBy }: { onClose: () => void; createdBy: string }) {
  const addLead = useMarketingLeads((s) => s.addLead);
  const [form, setForm] = useState({
    name: "", phone: "", source: "LINE" as LeadSource,
    interest: "", budget: "", groupSize: "", notes: "",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("กรุณากรอกชื่อและเบอร์โทร");
      return;
    }
    addLead({ ...form, created_by: createdBy });
    toast.success("เพิ่ม Lead ใหม่เรียบร้อยแล้ว ✅");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg">เพิ่ม Lead ใหม่</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground">ชื่อ - นามสกุล *</label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="คุณสมชาย..." className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">เบอร์โทร *</label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="08XXXXXXXX" className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">แหล่งที่มา</label>
              <Select value={form.source} onValueChange={(v) => set("source", v)}>
                <SelectTrigger className="mt-1 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground">สนใจทัวร์ / โปรแกรม</label>
              <Input value={form.interest} onChange={(e) => set("interest", e.target.value)} placeholder="เช่น ทัวร์ญี่ปุ่น ฮอกไกโด..." className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">งบประมาณ</label>
              <Input value={form.budget} onChange={(e) => set("budget", e.target.value)} placeholder="เช่น 30,000-50,000 บาท" className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">จำนวนคน</label>
              <Input value={form.groupSize} onChange={(e) => set("groupSize", e.target.value)} placeholder="เช่น 2 คน" className="mt-1" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground">หมายเหตุ</label>
              <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="ข้อมูลเพิ่มเติม..." rows={2} className="mt-1 resize-none text-sm" />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>ยกเลิก</Button>
            <Button type="submit" size="sm" className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white gap-1">
              <Plus className="w-4 h-4" /> เพิ่ม Lead
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Lead Card ── */
function LeadCard({
  lead, canDelete, canClaim, onClaim, onDelete,
}: {
  lead: MarketingLead;
  canDelete: boolean;
  canClaim: boolean;
  onClaim: () => void;
  onDelete: () => void;
}) {
  const isClaimed = lead.status === "claimed";
  return (
    <article className="bg-card rounded-xl border p-4 space-y-3 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center shrink-0 text-white font-bold text-sm">
          {lead.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm truncate">{lead.name}</p>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${SOURCE_COLOR[lead.source]}`}>
              {lead.source}
            </span>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Phone className="w-3 h-3" /> {lead.phone}
          </p>
        </div>
        <Badge variant={isClaimed ? "secondary" : "outline"} className={`text-[10px] shrink-0 ${isClaimed ? "text-muted-foreground" : "text-emerald-600 border-emerald-400"}`}>
          {isClaimed ? "รับแล้ว" : "ว่าง"}
        </Badge>
      </div>

      {/* Info */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        {lead.interest && (
          <div className="col-span-2">
            <span className="text-muted-foreground">สนใจ:</span>{" "}
            <span className="font-medium">{lead.interest}</span>
          </div>
        )}
        {lead.budget && (
          <div>
            <span className="text-muted-foreground">งบ:</span>{" "}
            <span className="font-medium">{lead.budget}</span>
          </div>
        )}
        {lead.groupSize && (
          <div>
            <span className="text-muted-foreground">จำนวน:</span>{" "}
            <span className="font-medium">{lead.groupSize}</span>
          </div>
        )}
        {lead.notes && (
          <div className="col-span-2 text-muted-foreground italic">{lead.notes}</div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t">
        <div className="text-[10px] text-muted-foreground">
          <span>โดย {lead.created_by}</span>
          <span className="mx-1">·</span>
          <span>{formatDateTH(lead.created_at)}</span>
          {isClaimed && lead.claimed_by && (
            <span className="ml-2 text-emerald-600">✓ {lead.claimed_by} รับแล้ว</span>
          )}
        </div>
        <div className="flex gap-1.5">
          {canDelete && (
            <button
              onClick={onDelete}
              className="text-[10px] text-destructive hover:underline flex items-center gap-0.5"
            >
              <Trash2 className="w-3 h-3" /> ลบ
            </button>
          )}
          {canClaim && !isClaimed && (
            <Button size="sm" onClick={onClaim} className="h-7 text-xs bg-gradient-to-r from-emerald-500 to-teal-500 text-white gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> รับ Lead นี้
            </Button>
          )}
          {isClaimed && canClaim && (
            <span className="text-[10px] text-muted-foreground italic flex items-center gap-1">
              <Clock className="w-3 h-3" /> ถูกรับแล้ว
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

/* ── Main Page ── */
export default function MarketingLeads() {
  const user = useCurrentUser();
  const leads     = useMarketingLeads((s) => s.leads);
  const addLead   = useMarketingLeads((s) => s.addLead);
  const claimLead = useMarketingLeads((s) => s.claimLead);
  const deleteLead = useMarketingLeads((s) => s.deleteLead);

  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "available" | "claimed">("all");
  const [filterSource, setFilterSource] = useState<"all" | LeadSource>("all");

  if (!user) return null;

  const isMarketing = user.role === "Marketing" || user.role === "Admin";
  const isSales = ["Sales", "Sales Manager", "OB Co-ordinator"].includes(user.role);
  const me = user.full_name;

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      const q = search.toLowerCase();
      const matchSearch = !q || l.name.toLowerCase().includes(q) || l.phone.includes(q) || l.interest.toLowerCase().includes(q);
      const matchStatus = filterStatus === "all" || l.status === filterStatus;
      const matchSource = filterSource === "all" || l.source === filterSource;
      return matchSearch && matchStatus && matchSource;
    });
  }, [leads, search, filterStatus, filterSource]);

  const availableCount = leads.filter((l) => l.status === "available").length;
  const claimedCount   = leads.filter((l) => l.status === "claimed").length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background border-b px-4 sm:px-8 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shrink-0">
          <Users className="w-5 h-5 text-white" />
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold leading-tight">Marketing Leads</h1>
          <PageHelp
            pageKey="marketing-leads"
            defaultText="รายชื่อ Prospect ที่ Marketing ลงข้อมูลไว้ — Sales กดขอ Lead ไปติดตามได้"
          />
        </div>
        <div className="flex-1" />
        {isMarketing && (
          <Button
            size="sm"
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white gap-1"
          >
            <Plus className="w-4 h-4" /> เพิ่ม Lead
          </Button>
        )}
        <Link to="/" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 ml-2">
          กลับหน้าหลัก <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Stats */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-5 pb-2">
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-card rounded-xl border p-3 text-center">
            <p className="text-2xl font-bold">{leads.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Lead ทั้งหมด</p>
          </div>
          <div className="bg-card rounded-xl border p-3 text-center">
            <p className="text-2xl font-bold text-emerald-600">{availableCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">ยังว่างอยู่</p>
          </div>
          <div className="bg-card rounded-xl border p-3 text-center">
            <p className="text-2xl font-bold text-muted-foreground">{claimedCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">ถูกรับแล้ว</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อ, เบอร์, ความสนใจ..."
              className="pl-8 h-8 text-sm"
            />
          </div>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}>
            <SelectTrigger className="h-8 w-28 text-xs">
              <Filter className="w-3 h-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทั้งหมด</SelectItem>
              <SelectItem value="available">ว่างอยู่</SelectItem>
              <SelectItem value="claimed">รับแล้ว</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterSource} onValueChange={(v) => setFilterSource(v as typeof filterSource)}>
            <SelectTrigger className="h-8 w-32 text-xs">
              <Megaphone className="w-3 h-3 mr-1" />
              <SelectValue placeholder="แหล่งที่มา" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกช่องทาง</SelectItem>
              {SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Role hint */}
        {isSales && !isMarketing && (
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 mb-4">
            💡 กด <strong>รับ Lead นี้</strong> เพื่อรับ Prospect ไปติดตาม — Lead จะถูกเพิ่มไปยัง Leads/Customers ของคุณ
          </div>
        )}

        {/* List */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-muted-foreground">
            <Users className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">{leads.length === 0 ? "ยังไม่มี Lead — Marketing เพิ่มได้เลย" : "ไม่พบ Lead ที่ตรงกับการค้นหา"}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                canDelete={isMarketing || (lead.created_by === me)}
                canClaim={isSales || isMarketing}
                onClaim={() => {
                  claimLead(lead.id, me);
                  toast.success(`รับ Lead "${lead.name}" เรียบร้อยแล้ว — ไปติดตามได้เลย 🎯`);
                }}
                onDelete={() => {
                  deleteLead(lead.id);
                  toast.success("ลบ Lead เรียบร้อยแล้ว");
                }}
              />
            ))}
          </div>
        )}
      </div>

      {showForm && <AddLeadForm onClose={() => setShowForm(false)} createdBy={me} />}
    </div>
  );
}
