/**
 * MarketingLeads.tsx
 * Marketing → เพิ่ม / Import / Download Template
 * Sales    → ดู + กดรับ Lead
 * ทุก Role → Export XLSX
 */
import { useState, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Users, Plus, Phone, ChevronRight, Search,
  CheckCircle2, Clock, Trash2, Megaphone, X, Filter,
  FileDown, Upload, FileSpreadsheet, AlertCircle,
} from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useCurrentUser } from "@/store/authStore";
import { useMarketingLeads, type LeadSource, type MarketingLead } from "@/store/marketingLeadsStore";
import { PageHelp } from "@/components/PageHelp";
import { toast } from "sonner";

/* ─────────────────────────────────────────────── */
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

/** XLSX column headers (Thai) ↔ field mapping */
const COL_MAP: Record<string, keyof Pick<MarketingLead, "name"|"phone"|"source"|"interest"|"budget"|"groupSize"|"notes">> = {
  "ชื่อ-นามสกุล":         "name",
  "เบอร์โทร":             "phone",
  "แหล่งที่มา":           "source",
  "สนใจทัวร์/โปรแกรม":   "interest",
  "งบประมาณ":             "budget",
  "จำนวนคน":              "groupSize",
  "หมายเหตุ":             "notes",
};
const VALID_SOURCES = new Set<string>(SOURCES);

function formatDateTH(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getFullYear()).slice(2)}`;
}

/* ─────────────────────────────────────────────── */
/* Download Template                               */
/* ─────────────────────────────────────────────── */
function downloadTemplate() {
  const headers = Object.keys(COL_MAP);
  const sample = [
    ["คุณสมชาย ใจดี", "0812345678", "LINE", "ทัวร์ญี่ปุ่น ฮอกไกโด", "50,000-80,000 บาท", "2 คน", "สนใจเดือนธ.ค."],
    ["คุณมานี มีทอง", "0898765432", "Facebook", "ทัวร์ยุโรป", "120,000 บาท", "4 คน", ""],
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...sample]);

  /* Column widths */
  ws["!cols"] = [
    { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 26 },
    { wch: 22 }, { wch: 12 }, { wch: 30 },
  ];

  /* Header style note */
  const note: XLSX.Comment = {
    author: "Standard Tour",
    ref: "C2",
    t: `แหล่งที่มาที่ใช้ได้:\n${SOURCES.join(", ")}`,
  };
  ws["C1"].c = [note];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Marketing Leads");
  XLSX.writeFile(wb, "marketing-leads-template.xlsx");
}

/* ─────────────────────────────────────────────── */
/* Export current leads                            */
/* ─────────────────────────────────────────────── */
function exportLeads(leads: MarketingLead[]) {
  if (leads.length === 0) { toast.error("ไม่มีข้อมูลให้ Export"); return; }

  const rows = leads.map((l) => ({
    "ชื่อ-นามสกุล":       l.name,
    "เบอร์โทร":           l.phone,
    "แหล่งที่มา":         l.source,
    "สนใจทัวร์/โปรแกรม": l.interest,
    "งบประมาณ":           l.budget,
    "จำนวนคน":            l.groupSize,
    "หมายเหตุ":           l.notes,
    "สถานะ":              l.status === "claimed" ? "รับแล้ว" : "ว่าง",
    "รับโดย":             l.claimed_by ?? "",
    "ลงโดย":              l.created_by,
    "วันที่ลง":           formatDateTH(l.created_at),
    "วันที่รับ":          l.claimed_at ? formatDateTH(l.claimed_at) : "",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [
    { wch: 22 }, { wch: 14 }, { wch: 12 }, { wch: 26 }, { wch: 22 },
    { wch: 10 }, { wch: 30 }, { wch: 10 }, { wch: 16 }, { wch: 16 },
    { wch: 12 }, { wch: 12 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Marketing Leads");
  const today = new Date().toISOString().split("T")[0];
  XLSX.writeFile(wb, `marketing-leads-${today}.xlsx`);
  toast.success(`Export สำเร็จ — ${leads.length} รายการ ✅`);
}

/* ─────────────────────────────────────────────── */
/* Import Result Dialog                            */
/* ─────────────────────────────────────────────── */
interface ImportResult {
  ok:    Array<{ name: string; phone: string }>;
  skipped: Array<{ row: number; reason: string }>;
}

function ImportResultDialog({ result, onClose, onConfirm }: {
  result: ImportResult;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" /> ผลการ Import
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] overflow-auto pr-1">
          {result.ok.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-emerald-600 mb-1.5">
                ✅ พบ {result.ok.length} รายการที่พร้อม Import
              </p>
              <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-2 space-y-1 max-h-40 overflow-auto">
                {result.ok.map((r, i) => (
                  <p key={i} className="text-xs text-emerald-800 dark:text-emerald-300">
                    {i + 1}. {r.name} — {r.phone}
                  </p>
                ))}
              </div>
            </div>
          )}

          {result.skipped.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-amber-600 mb-1.5 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> ข้ามไป {result.skipped.length} แถว (ข้อมูลไม่ครบ)
              </p>
              <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-2 space-y-1 max-h-32 overflow-auto">
                {result.skipped.map((r, i) => (
                  <p key={i} className="text-xs text-amber-800 dark:text-amber-300">
                    แถว {r.row}: {r.reason}
                  </p>
                ))}
              </div>
            </div>
          )}

          {result.ok.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              ไม่พบรายการที่สามารถ Import ได้ — ตรวจสอบ Template และลองใหม่
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>ยกเลิก</Button>
          {result.ok.length > 0 && (
            <Button size="sm" onClick={onConfirm}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white gap-1">
              <CheckCircle2 className="w-4 h-4" /> Import {result.ok.length} รายการ
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────────────────────────── */
/* Add Lead Form (Marketing only)                  */
/* ─────────────────────────────────────────────── */
function AddLeadForm({ onClose, createdBy }: { onClose: () => void; createdBy: string }) {
  const addLead = useMarketingLeads((s) => s.addLead);
  const [form, setForm] = useState({
    name: "", phone: "", source: "LINE" as LeadSource,
    interest: "", budget: "", groupSize: "", notes: "",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) { toast.error("กรุณากรอกชื่อและเบอร์โทร"); return; }
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
                <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
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

/* ─────────────────────────────────────────────── */
/* Lead Card                                       */
/* ─────────────────────────────────────────────── */
function LeadCard({
  lead, canDelete, canClaim, onClaim, onDelete,
}: {
  lead: MarketingLead; canDelete: boolean; canClaim: boolean;
  onClaim: () => void; onDelete: () => void;
}) {
  const isClaimed = lead.status === "claimed";
  return (
    <article className="bg-card rounded-xl border p-4 space-y-3 hover:shadow-md transition-shadow">
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
        <Badge variant={isClaimed ? "secondary" : "outline"}
          className={`text-[10px] shrink-0 ${isClaimed ? "text-muted-foreground" : "text-emerald-600 border-emerald-400"}`}>
          {isClaimed ? "รับแล้ว" : "ว่าง"}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        {lead.interest && (
          <div className="col-span-2"><span className="text-muted-foreground">สนใจ:</span>{" "}<span className="font-medium">{lead.interest}</span></div>
        )}
        {lead.budget && (
          <div><span className="text-muted-foreground">งบ:</span>{" "}<span className="font-medium">{lead.budget}</span></div>
        )}
        {lead.groupSize && (
          <div><span className="text-muted-foreground">จำนวน:</span>{" "}<span className="font-medium">{lead.groupSize}</span></div>
        )}
        {lead.notes && (
          <div className="col-span-2 text-muted-foreground italic">{lead.notes}</div>
        )}
      </div>

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
            <button onClick={onDelete} className="text-[10px] text-destructive hover:underline flex items-center gap-0.5">
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

/* ─────────────────────────────────────────────── */
/* Main Page                                       */
/* ─────────────────────────────────────────────── */
export default function MarketingLeads() {
  const user      = useCurrentUser();
  const leads     = useMarketingLeads((s) => s.leads);
  const addLead   = useMarketingLeads((s) => s.addLead);
  const claimLead = useMarketingLeads((s) => s.claimLead);
  const deleteLead = useMarketingLeads((s) => s.deleteLead);

  const [showForm, setShowForm]           = useState(false);
  const [importResult, setImportResult]   = useState<ImportResult | null>(null);
  const [pendingRows, setPendingRows]     = useState<Array<Record<string, string>>>([]);
  const [search, setSearch]               = useState("");
  const [filterStatus, setFilterStatus]   = useState<"all" | "available" | "claimed">("all");
  const [filterSource, setFilterSource]   = useState<"all" | LeadSource>("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const isMarketing = user.role === "Marketing" || user.role === "Admin";
  const isSales     = ["Sales", "Sales Manager", "OB Co-ordinator"].includes(user.role);
  const me          = user.full_name;

  /* ── Filtered leads ── */
  const filtered = useMemo(() => leads.filter((l) => {
    const q = search.toLowerCase();
    return (
      (!q || l.name.toLowerCase().includes(q) || l.phone.includes(q) || l.interest.toLowerCase().includes(q)) &&
      (filterStatus === "all" || l.status === filterStatus) &&
      (filterSource === "all" || l.source === filterSource)
    );
  }), [leads, search, filterStatus, filterSource]);

  const availableCount = leads.filter((l) => l.status === "available").length;
  const claimedCount   = leads.filter((l) => l.status === "claimed").length;

  /* ── Import handler ── */
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";                // reset input so same file can be re-selected

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data  = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb    = XLSX.read(data, { type: "uint8array" });
        const ws    = wb.Sheets[wb.SheetNames[0]];
        const rows  = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

        const ok: ImportResult["ok"]          = [];
        const skipped: ImportResult["skipped"] = [];
        const parsed: Array<Record<string, string>> = [];

        rows.forEach((row, idx) => {
          const rowNum = idx + 2; // +1 header, +1 1-index
          const mapped: Record<string, string> = {};
          for (const [col, field] of Object.entries(COL_MAP)) {
            mapped[field] = String(row[col] ?? "").trim();
          }

          if (!mapped.name) {
            skipped.push({ row: rowNum, reason: "ไม่มีชื่อ-นามสกุล" });
            return;
          }
          if (!mapped.phone) {
            skipped.push({ row: rowNum, reason: `"${mapped.name}" — ไม่มีเบอร์โทร` });
            return;
          }
          // Normalize source
          if (!VALID_SOURCES.has(mapped.source)) mapped.source = "อื่นๆ";

          ok.push({ name: mapped.name, phone: mapped.phone });
          parsed.push(mapped);
        });

        setPendingRows(parsed);
        setImportResult({ ok, skipped });
      } catch {
        toast.error("ไม่สามารถอ่านไฟล์ได้ — ลองใช้ Template ที่ดาวน์โหลดมา");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function confirmImport() {
    let count = 0;
    for (const row of pendingRows) {
      addLead({
        name:      row.name,
        phone:     row.phone,
        source:    (row.source as LeadSource) || "อื่นๆ",
        interest:  row.interest  || "",
        budget:    row.budget    || "",
        groupSize: row.groupSize || "",
        notes:     row.notes     || "",
        created_by: me,
      });
      count++;
    }
    toast.success(`Import สำเร็จ ${count} รายการ ✅`);
    setImportResult(null);
    setPendingRows([]);
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Hidden file input ── */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* ── Header ── */}
      <div className="sticky top-0 z-30 bg-background border-b px-4 sm:px-8 py-3 flex items-center gap-2 flex-wrap">
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

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Download Template — Marketing/Admin */}
          {isMarketing && (
            <Button
              size="sm" variant="outline"
              onClick={downloadTemplate}
              className="gap-1 text-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Download Template
            </Button>
          )}

          {/* Import — Marketing/Admin */}
          {isMarketing && (
            <Button
              size="sm" variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="gap-1 text-xs"
            >
              <Upload className="w-3.5 h-3.5" /> Import
            </Button>
          )}

          {/* Export — all roles */}
          <Button
            size="sm" variant="outline"
            onClick={() => exportLeads(filtered)}
            className="gap-1 text-xs"
          >
            <FileDown className="w-3.5 h-3.5" /> Export
          </Button>

          {/* Add Lead — Marketing/Admin */}
          {isMarketing && (
            <Button
              size="sm"
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white gap-1"
            >
              <Plus className="w-4 h-4" /> เพิ่ม Lead
            </Button>
          )}
        </div>

        <Link to="/" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
          กลับหน้าหลัก <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* ── Body ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-5 pb-2">

        {/* Stats */}
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
              <Filter className="w-3 h-3 mr-1" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทั้งหมด</SelectItem>
              <SelectItem value="available">ว่างอยู่</SelectItem>
              <SelectItem value="claimed">รับแล้ว</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterSource} onValueChange={(v) => setFilterSource(v as typeof filterSource)}>
            <SelectTrigger className="h-8 w-32 text-xs">
              <Megaphone className="w-3 h-3 mr-1" /><SelectValue placeholder="แหล่งที่มา" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกช่องทาง</SelectItem>
              {SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Export note */}
        {isMarketing && (
          <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 mb-4 flex items-center gap-2">
            <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
            <span>
              <strong>Import:</strong> ดาวน์โหลด Template → กรอกข้อมูล → Import กลับมาได้เลย ·{" "}
              <strong>Export:</strong> ส่งออกรายการที่กรองไว้ (ปัจจุบัน {filtered.length} รายการ)
            </span>
          </div>
        )}

        {/* Sales hint */}
        {isSales && !isMarketing && (
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 mb-4">
            💡 กด <strong>รับ Lead นี้</strong> เพื่อรับ Prospect ไปติดตาม ·{" "}
            กด <strong>Export</strong> เพื่อดาวน์โหลดรายการ Lead เป็น Excel
          </div>
        )}

        {/* Lead Grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-muted-foreground">
            <Users className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">
              {leads.length === 0 ? "ยังไม่มี Lead — Marketing เพิ่มหรือ Import ได้เลย" : "ไม่พบ Lead ที่ตรงกับการค้นหา"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                canDelete={isMarketing || lead.created_by === me}
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

      {/* Modals */}
      {showForm && <AddLeadForm onClose={() => setShowForm(false)} createdBy={me} />}

      {importResult && (
        <ImportResultDialog
          result={importResult}
          onClose={() => { setImportResult(null); setPendingRows([]); }}
          onConfirm={confirmImport}
        />
      )}
    </div>
  );
}
