/**
 * AdsReport.tsx
 * หน้า Upload + วิเคราะห์ผล Meta Ads จาก CSV Export
 * Route: /marketing/ads-report
 */
import { useCallback, useRef, useState } from "react";
import {
  Upload, FileText, X, ChevronDown, ChevronRight, Save, CheckCircle2,
  TrendingUp, Eye, Users, MessageCircle, DollarSign, MousePointerClick,
  AlertTriangle, Info, BarChart2,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ColumnMap {
  name?:           number;
  status?:         number;
  spend?:          number;
  impressions?:    number;
  reach?:          number;
  cpm?:            number;
  ctr?:            number;
  cpcLink?:        number;
  cpcAll?:         number;
  messages?:       number;
  costPerMsg?:     number;
  pageEngagement?: number;
  roas?:           number;
  startDate?:      number;
  endDate?:        number;
}

interface AdRow {
  name:            string;
  status:          string;
  spend:           number | null;
  impressions:     number | null;
  reach:           number | null;
  cpm:             number | null;
  ctr:             number | null;
  cpcLink:         number | null;
  cpcAll:          number | null;
  messages:        number | null;
  costPerMsg:      number | null;
  pageEngagement:  number | null;
  roas:            number | null;
  startDate:       string;
  endDate:         string;
  group:           string;
}

// ── CSV Parser (RFC 4180 — handles quoted fields with commas) ─────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQuote = false;
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') { inQuote = true; }
      else if (ch === ',') { result.push(cur.trim()); cur = ""; }
      else { cur += ch; }
    }
  }
  result.push(cur.trim());
  return result;
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = parseCSVLine(lines[0]);
  const rows = lines.slice(1).map((l) => parseCSVLine(l));
  return { headers, rows };
}

// ── Column detector (fuzzy Thai keyword match) ────────────────────────────────

const COL_PATTERNS: { key: keyof ColumnMap; keywords: string[] }[] = [
  { key: "name",           keywords: ["ชื่อโฆษณา"] },
  { key: "status",         keywords: ["สถานะ"] },
  { key: "spend",          keywords: ["จำนวนเงินที่ใช้จ่าย", "ใช้จ่าย"] },
  { key: "impressions",    keywords: ["อิมเพรสชัน"] },
  { key: "reach",          keywords: ["การเข้าถึง"] },
  { key: "cpm",            keywords: ["cpm", "ต้นทุนต่ออิมเพรสชั่น"] },
  { key: "ctr",            keywords: ["ctr"] },
  { key: "cpcLink",        keywords: ["cpc (ต้นทุนต่อการคลิกลิงก์)", "cpc (ลิงก์)"] },
  { key: "cpcAll",         keywords: ["cpc (ทั้งหมด)"] },
  { key: "messages",       keywords: ["ผู้ติดต่อผ่านการส่งข้อความ"] },
  { key: "costPerMsg",     keywords: ["ต้นทุนต่อการเริ่มการสนทนา"] },
  { key: "pageEngagement", keywords: ["การมีส่วนร่วมกับเพจ"] },
  { key: "roas",           keywords: ["roas"] },
  { key: "startDate",      keywords: ["เริ่มการรายงาน", "เริ่มการ"] },
  { key: "endDate",        keywords: ["สิ้นสุดการรายงาน", "สิ้นสุด"] },
];

function detectColumns(headers: string[]): ColumnMap {
  const map: ColumnMap = {};
  const lowerHeaders = headers.map((h) => h.toLowerCase().trim());
  for (const { key, keywords } of COL_PATTERNS) {
    for (let i = 0; i < lowerHeaders.length; i++) {
      if (keywords.some((kw) => lowerHeaders[i].includes(kw.toLowerCase()))) {
        map[key] = i;
        break;
      }
    }
  }
  return map;
}

// ── Row converter ─────────────────────────────────────────────────────────────

function n(val: string | undefined): number | null {
  if (!val || val.trim() === "" || val.trim() === "-") return null;
  const num = parseFloat(val.replace(/,/g, ""));
  return isNaN(num) ? null : num;
}

function getGroup(name: string): string {
  const parts = name.split("|");
  return parts[0].trim() || name;
}

function convertRows(rows: string[][], cm: ColumnMap): AdRow[] {
  return rows
    .filter((r) => r.some((c) => c.trim() !== ""))
    .map((r) => {
      const get = (idx?: number) => (idx !== undefined ? r[idx] : undefined);
      const name = get(cm.name) ?? "";
      return {
        name,
        status:          get(cm.status) ?? "",
        spend:           n(get(cm.spend)),
        impressions:     n(get(cm.impressions)),
        reach:           n(get(cm.reach)),
        cpm:             n(get(cm.cpm)),
        ctr:             n(get(cm.ctr)),
        cpcLink:         n(get(cm.cpcLink)),
        cpcAll:          n(get(cm.cpcAll)),
        messages:        n(get(cm.messages)),
        costPerMsg:      n(get(cm.costPerMsg)),
        pageEngagement:  n(get(cm.pageEngagement)),
        roas:            n(get(cm.roas)),
        startDate:       get(cm.startDate) ?? "",
        endDate:         get(cm.endDate) ?? "",
        group:           getGroup(name),
      };
    });
}

// ── Formatters ────────────────────────────────────────────────────────────────

function fmtN(v: number | null, dp = 2): string {
  if (v === null) return "—";
  return v.toLocaleString("th-TH", { minimumFractionDigits: dp, maximumFractionDigits: dp });
}
function fmtB(v: number | null): string {
  if (v === null) return "—";
  return v.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtInt(v: number | null): string {
  if (v === null) return "—";
  return Math.round(v).toLocaleString("th-TH");
}
function sumN(rows: AdRow[], key: keyof AdRow): number {
  return rows.reduce((a, r) => a + (typeof r[key] === "number" ? (r[key] as number) : 0), 0);
}
function avgN(rows: AdRow[], key: keyof AdRow): number | null {
  const vals = rows.map((r) => r[key]).filter((v) => typeof v === "number") as number[];
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === "active") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active
    </span>
  );
  if (s === "not_delivering") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-400">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Paused
    </span>
  );
  if (s === "archived") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-500/15 text-zinc-400">
      <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" /> Archived
    </span>
  );
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground">{status}</span>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

interface KPICardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  accent: string;
  available: boolean;
}

function KPICard({ label, value, sub, icon, accent, available }: KPICardProps) {
  return (
    <div className={`rounded-2xl border bg-card p-4 flex flex-col gap-2 ${!available ? "opacity-40" : ""}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${accent}`}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold tracking-tight">{available ? value : "ไม่มีข้อมูล"}</p>
      {sub && available && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ── Ad Table Row ──────────────────────────────────────────────────────────────

function AdTableRow({ ad, cm }: { ad: AdRow; cm: ColumnMap }) {
  return (
    <tr className="border-b border-border/50 hover:bg-muted/30 transition-colors">
      <td className="py-2.5 px-3 text-xs font-medium max-w-[200px]">
        <span className="truncate block" title={ad.name}>{ad.name}</span>
      </td>
      <td className="py-2.5 px-2 text-center"><StatusBadge status={ad.status} /></td>
      {cm.spend         !== undefined && <td className="py-2.5 px-2 text-right text-xs tabular-nums">{fmtB(ad.spend)}</td>}
      {cm.impressions   !== undefined && <td className="py-2.5 px-2 text-right text-xs tabular-nums">{fmtInt(ad.impressions)}</td>}
      {cm.reach         !== undefined && <td className="py-2.5 px-2 text-right text-xs tabular-nums">{fmtInt(ad.reach)}</td>}
      {cm.cpm           !== undefined && <td className="py-2.5 px-2 text-right text-xs tabular-nums">{fmtB(ad.cpm)}</td>}
      {cm.ctr           !== undefined && <td className="py-2.5 px-2 text-right text-xs tabular-nums">{ad.ctr !== null ? fmtN(ad.ctr, 2) + "%" : "—"}</td>}
      {cm.messages      !== undefined && <td className="py-2.5 px-2 text-right text-xs tabular-nums">{fmtInt(ad.messages)}</td>}
      {cm.costPerMsg    !== undefined && <td className="py-2.5 px-2 text-right text-xs tabular-nums">{fmtB(ad.costPerMsg)}</td>}
      {cm.pageEngagement !== undefined && <td className="py-2.5 px-2 text-right text-xs tabular-nums">{fmtInt(ad.pageEngagement)}</td>}
    </tr>
  );
}

// ── Group Card ────────────────────────────────────────────────────────────────

function GroupCard({
  groupName,
  ads,
  cm,
  expanded,
  onToggle,
}: {
  groupName: string;
  ads: AdRow[];
  cm: ColumnMap;
  expanded: boolean;
  onToggle: () => void;
}) {
  const totalSpend  = sumN(ads, "spend");
  const totalMsgs   = sumN(ads, "messages");
  const totalImpr   = sumN(ads, "impressions");
  const totalReach  = sumN(ads, "reach");
  const avgCPM      = avgN(ads, "cpm");
  const avgCTR      = avgN(ads, "ctr");
  const activeCount = ads.filter((a) => a.status.toLowerCase() === "active").length;

  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      {/* Group header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm truncate">{groupName}</span>
            <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{ads.length} โฆษณา</span>
            {activeCount > 0 && (
              <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full">{activeCount} กำลังแสดง</span>
            )}
          </div>
          <div className="flex gap-4 mt-1.5 flex-wrap">
            {cm.spend       !== undefined && <span className="text-xs text-muted-foreground">ใช้จ่าย <b className="text-foreground">฿{fmtB(totalSpend)}</b></span>}
            {cm.impressions !== undefined && <span className="text-xs text-muted-foreground">Impr. <b className="text-foreground">{fmtInt(totalImpr)}</b></span>}
            {cm.reach       !== undefined && <span className="text-xs text-muted-foreground">Reach <b className="text-foreground">{fmtInt(totalReach)}</b></span>}
            {cm.messages    !== undefined && <span className="text-xs text-muted-foreground">Messages <b className="text-foreground">{fmtInt(totalMsgs)}</b></span>}
            {cm.cpm         !== undefined && avgCPM !== null && <span className="text-xs text-muted-foreground">CPM avg <b className="text-foreground">฿{fmtB(avgCPM)}</b></span>}
            {cm.ctr         !== undefined && avgCTR !== null && <span className="text-xs text-muted-foreground">CTR avg <b className="text-foreground">{fmtN(avgCTR, 2)}%</b></span>}
          </div>
        </div>
        <div className="shrink-0 text-muted-foreground">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </button>

      {/* Ad table */}
      {expanded && (
        <div className="overflow-x-auto border-t border-border/50">
          <table className="w-full min-w-max text-left">
            <thead>
              <tr className="bg-muted/30">
                <th className="py-2 px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Ad Name</th>
                <th className="py-2 px-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center">Status</th>
                {cm.spend         !== undefined && <th className="py-2 px-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Spend (฿)</th>}
                {cm.impressions   !== undefined && <th className="py-2 px-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Impr.</th>}
                {cm.reach         !== undefined && <th className="py-2 px-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Reach</th>}
                {cm.cpm           !== undefined && <th className="py-2 px-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-right">CPM</th>}
                {cm.ctr           !== undefined && <th className="py-2 px-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-right">CTR</th>}
                {cm.messages      !== undefined && <th className="py-2 px-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Messages</th>}
                {cm.costPerMsg    !== undefined && <th className="py-2 px-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Cost/Msg</th>}
                {cm.pageEngagement !== undefined && <th className="py-2 px-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Page Eng.</th>}
              </tr>
            </thead>
            <tbody>
              {ads.map((ad, i) => (
                <AdTableRow key={i} ad={ad} cm={cm} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Insight Form ──────────────────────────────────────────────────────────────

function InsightForm({ period }: { period: string }) {
  const key = `ads-insight::${period}`;
  const load = () => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return { win: "", fix: "", plan: "" };
      return JSON.parse(raw) as { win: string; fix: string; plan: string };
    } catch { return { win: "", fix: "", plan: "" }; }
  };

  const [win,  setWin]  = useState(() => load().win);
  const [fix,  setFix]  = useState(() => load().fix);
  const [plan, setPlan] = useState(() => load().plan);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem(key, JSON.stringify({ win, fix, plan }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="rounded-2xl border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <BarChart2 className="w-4 h-4 text-violet-400" />
        <h3 className="font-semibold text-sm">Insights — {period || "ช่วงเวลานี้"}</h3>
        <span className="text-xs text-muted-foreground ml-1">บันทึกอัตโนมัติลง localStorage</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Win */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold flex items-center gap-1.5 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Win — สิ่งที่ทำได้ดี
          </label>
          <textarea
            value={win}
            onChange={(e) => setWin(e.target.value)}
            placeholder="โฆษณาตัวไหนทำได้ดี? เพราะอะไร?"
            className="w-full rounded-xl border bg-muted/30 px-3 py-2.5 text-sm resize-none h-28 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 placeholder:text-muted-foreground/40"
          />
        </div>

        {/* Fix */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold flex items-center gap-1.5 text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-400" /> Fix — สิ่งที่ต้องแก้ไข
          </label>
          <textarea
            value={fix}
            onChange={(e) => setFix(e.target.value)}
            placeholder="โฆษณาตัวไหนแย่? ปัญหาคืออะไร?"
            className="w-full rounded-xl border bg-muted/30 px-3 py-2.5 text-sm resize-none h-28 focus:outline-none focus:ring-2 focus:ring-amber-500/40 placeholder:text-muted-foreground/40"
          />
        </div>

        {/* Plan */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold flex items-center gap-1.5 text-violet-400">
            <span className="w-2 h-2 rounded-full bg-violet-400" /> Plan — แผนถัดไป
          </label>
          <textarea
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            placeholder="จะปรับอะไรในช่วงถัดไป?"
            className="w-full rounded-xl border bg-muted/30 px-3 py-2.5 text-sm resize-none h-28 focus:outline-none focus:ring-2 focus:ring-violet-500/40 placeholder:text-muted-foreground/40"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            saved
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-violet-600 hover:bg-violet-500 text-white"
          }`}
        >
          {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? "บันทึกแล้ว!" : "บันทึก Insights"}
        </button>
      </div>
    </div>
  );
}

// ── Upload Zone ───────────────────────────────────────────────────────────────

function UploadZone({ onFile }: { onFile: (text: string, name: string) => void }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const readFile = (file: File) => {
    if (!file.name.endsWith(".csv")) { alert("กรุณาอัปโหลดไฟล์ .csv เท่านั้น"); return; }
    const reader = new FileReader();
    reader.onload = (e) => onFile(e.target?.result as string, file.name);
    reader.readAsText(file, "utf-8");
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) readFile(file);
  }, []);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={`rounded-2xl border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center gap-3 py-16 px-8 text-center ${
        dragging
          ? "border-violet-500 bg-violet-500/10"
          : "border-border hover:border-violet-400 hover:bg-muted/20"
      }`}
    >
      <div className="w-14 h-14 rounded-2xl bg-violet-500/15 flex items-center justify-center">
        <Upload className="w-7 h-7 text-violet-400" />
      </div>
      <div>
        <p className="font-semibold text-sm">ลาก CSV มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์</p>
        <p className="text-xs text-muted-foreground mt-1">ไฟล์ Meta Ads Manager Export (.csv)</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f); e.target.value = ""; }}
      />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdsReport() {
  const [ads,      setAds]      = useState<AdRow[]>([]);
  const [cm,       setCM]       = useState<ColumnMap>({});
  const [fileName, setFileName] = useState("");
  const [period,   setPeriod]   = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "not_delivering" | "archived">("all");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [missingCols, setMissingCols] = useState<string[]>([]);

  const handleFile = (text: string, name: string) => {
    const { headers, rows } = parseCSV(text);
    const colMap = detectColumns(headers);
    const converted = convertRows(rows, colMap);

    // Detect period from data
    const start = converted.find((a) => a.startDate)?.startDate ?? "";
    const end   = converted.find((a) => a.endDate)?.endDate   ?? "";
    const periodStr = start && end ? `${start} – ${end}` : name.replace(".csv", "");

    // Find missing important columns
    const important: { key: keyof ColumnMap; label: string }[] = [
      { key: "spend",      label: "ยอดใช้จ่าย" },
      { key: "impressions", label: "Impressions" },
      { key: "messages",   label: "ผู้ติดต่อ Messages" },
      { key: "cpm",        label: "CPM" },
      { key: "ctr",        label: "CTR" },
    ];
    const missing = important.filter((c) => colMap[c.key] === undefined).map((c) => c.label);

    setAds(converted);
    setCM(colMap);
    setFileName(name);
    setPeriod(periodStr);
    setMissingCols(missing);
    // expand all groups by default
    const groups: Record<string, boolean> = {};
    converted.forEach((a) => { groups[a.group] = true; });
    setExpandedGroups(groups);
  };

  const clearData = () => {
    setAds([]); setCM({}); setFileName(""); setPeriod(""); setMissingCols([]);
    setExpandedGroups({});
  };

  // Filtered ads
  const filteredAds = filterStatus === "all"
    ? ads
    : ads.filter((a) => a.status.toLowerCase() === filterStatus);

  // Groups
  const groupEntries = Object.entries(
    filteredAds.reduce<Record<string, AdRow[]>>((acc, ad) => {
      if (!acc[ad.group]) acc[ad.group] = [];
      acc[ad.group].push(ad);
      return acc;
    }, {})
  ).sort(([, a], [, b]) => sumN(b, "spend") - sumN(a, "spend"));

  const toggleGroup = (g: string) =>
    setExpandedGroups((prev) => ({ ...prev, [g]: !prev[g] }));

  // Totals
  const totalSpend    = sumN(ads, "spend");
  const totalImpr     = sumN(ads, "impressions");
  const totalReach    = sumN(ads, "reach");
  const totalMsgs     = sumN(ads, "messages");
  const avgCPM        = avgN(ads, "cpm");
  const avgCTR        = avgN(ads, "ctr");

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-violet-400" /> Meta Ads Report
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              อัปโหลด CSV จาก Meta Ads Manager เพื่อวิเคราะห์ผลโฆษณา
            </p>
          </div>
          {ads.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-1.5">
                <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground truncate max-w-[180px]">{fileName}</span>
              </div>
              <button
                onClick={clearData}
                className="w-8 h-8 rounded-xl bg-muted hover:bg-destructive/20 hover:text-destructive flex items-center justify-center transition-colors"
                title="ลบข้อมูล"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* ── Upload Zone (empty state) ── */}
        {ads.length === 0 && (
          <div className="space-y-4">
            <UploadZone onFile={handleFile} />

            {/* Guide */}
            <div className="rounded-2xl border bg-muted/20 p-4 flex gap-3">
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">วิธี Export CSV จาก Meta Ads Manager</p>
                <ol className="text-xs text-muted-foreground space-y-0.5 list-decimal list-inside">
                  <li>เปิด Meta Ads Manager → เลือก Campaign / Ad Set / Ad level</li>
                  <li>กด "Export" → เลือก "Export Table Data (CSV)"</li>
                  <li>เลือก Columns ที่ต้องการ (ยิ่งครบยิ่งดี) แล้ว Download</li>
                  <li>นำไฟล์ .csv มาอัปโหลดที่นี่</li>
                </ol>
                <p className="text-xs text-muted-foreground mt-1">
                  ระบบรองรับ Column ภาษาไทยและอังกฤษ · ถ้า Column บางตัวขาด ระบบจะข้ามและแสดงเท่าที่มี
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Data loaded ── */}
        {ads.length > 0 && (
          <>
            {/* Period + ad count summary */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-muted-foreground">ช่วงเวลา: <b className="text-foreground">{period}</b></span>
              <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{ads.length} โฆษณา</span>
              <span className="text-xs bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full">
                {ads.filter((a) => a.status.toLowerCase() === "active").length} กำลังแสดง
              </span>
            </div>

            {/* Missing columns warning */}
            {missingCols.length > 0 && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300">
                  ไม่พบ Column: <b>{missingCols.join(", ")}</b> — ระบบจะแสดงเฉพาะข้อมูลที่มี
                </p>
              </div>
            )}

            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <KPICard
                label="ยอดใช้จ่าย (฿)"
                value={`฿${fmtB(totalSpend)}`}
                icon={<DollarSign className="w-4 h-4 text-white" />}
                accent="bg-gradient-to-br from-violet-500 to-purple-600"
                available={cm.spend !== undefined}
              />
              <KPICard
                label="Impressions"
                value={fmtInt(totalImpr)}
                icon={<Eye className="w-4 h-4 text-white" />}
                accent="bg-gradient-to-br from-blue-500 to-indigo-600"
                available={cm.impressions !== undefined}
              />
              <KPICard
                label="Reach"
                value={fmtInt(totalReach)}
                icon={<Users className="w-4 h-4 text-white" />}
                accent="bg-gradient-to-br from-cyan-500 to-blue-600"
                available={cm.reach !== undefined}
              />
              <KPICard
                label="Messages"
                value={fmtInt(totalMsgs)}
                icon={<MessageCircle className="w-4 h-4 text-white" />}
                accent="bg-gradient-to-br from-emerald-500 to-teal-600"
                available={cm.messages !== undefined}
              />
              <KPICard
                label="CPM เฉลี่ย (฿)"
                value={`฿${fmtB(avgCPM)}`}
                sub="ต้นทุนต่อ 1,000 Impressions"
                icon={<TrendingUp className="w-4 h-4 text-white" />}
                accent="bg-gradient-to-br from-orange-500 to-red-600"
                available={cm.cpm !== undefined}
              />
              <KPICard
                label="CTR เฉลี่ย"
                value={avgCTR !== null ? `${fmtN(avgCTR, 2)}%` : "—"}
                sub="Click-through rate"
                icon={<MousePointerClick className="w-4 h-4 text-white" />}
                accent="bg-gradient-to-br from-pink-500 to-fuchsia-600"
                available={cm.ctr !== undefined}
              />
            </div>

            {/* ── Filter ── */}
            <div className="flex items-center gap-2 flex-wrap">
              {(["all", "active", "not_delivering", "archived"] as const).map((s) => {
                const labels: Record<typeof s, string> = {
                  all: `ทั้งหมด (${ads.length})`,
                  active: `Active (${ads.filter((a) => a.status.toLowerCase() === "active").length})`,
                  not_delivering: `Paused (${ads.filter((a) => a.status.toLowerCase() === "not_delivering").length})`,
                  archived: `Archived (${ads.filter((a) => a.status.toLowerCase() === "archived").length})`,
                };
                return (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      filterStatus === s
                        ? "bg-violet-600 text-white"
                        : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    }`}
                  >
                    {labels[s]}
                  </button>
                );
              })}
              <button
                onClick={() =>
                  setExpandedGroups(
                    Object.fromEntries(groupEntries.map(([g]) => [g, true]))
                  )
                }
                className="ml-auto px-3 py-1.5 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                ขยายทั้งหมด
              </button>
              <button
                onClick={() =>
                  setExpandedGroups(
                    Object.fromEntries(groupEntries.map(([g]) => [g, false]))
                  )
                }
                className="px-3 py-1.5 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                ย่อทั้งหมด
              </button>
            </div>

            {/* ── Group Cards ── */}
            <div className="space-y-3">
              {groupEntries.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground text-sm">
                  ไม่มีโฆษณาในสถานะนี้
                </div>
              ) : (
                groupEntries.map(([groupName, groupAds]) => (
                  <GroupCard
                    key={groupName}
                    groupName={groupName}
                    ads={groupAds}
                    cm={cm}
                    expanded={expandedGroups[groupName] ?? false}
                    onToggle={() => toggleGroup(groupName)}
                  />
                ))
              )}
            </div>

            {/* ── Insight Form ── */}
            <InsightForm period={period} />
          </>
        )}
      </div>
    </div>
  );
}
