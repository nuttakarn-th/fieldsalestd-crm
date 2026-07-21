/**
 * AdsReport.tsx
 * หน้า Upload + วิเคราะห์ผล Meta Ads จาก CSV Export
 * Route: /marketing/ads-report
 *
 * v2: Supabase persistence — ทีม Marketing ทุกคนเห็น report เดียวกัน
 *     + Compare mode: เลือก 2 period เปรียบเทียบ KPI side-by-side
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Upload, FileText, X, ChevronDown, ChevronRight, Save, CheckCircle2,
  TrendingUp, Eye, Users, MessageCircle, DollarSign, MousePointerClick,
  AlertTriangle, Info, BarChart2, Plus, Trash2, GitCompare, Loader2,
  CloudUpload,
} from "lucide-react";
import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";
import { useCurrentUser } from "@/store/authStore";

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

interface ReportMeta {
  id:           string;
  period_label: string;
  file_name:    string;
  uploaded_at:  string;
  uploaded_by:  string | null;
}

interface ReportData extends ReportMeta {
  ads:    AdRow[];
  colMap: ColumnMap;
}

// ── CSV Parser (RFC 4180) ─────────────────────────────────────────────────────

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
      } else { cur += ch; }
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
  return { headers: parseCSVLine(lines[0]), rows: lines.slice(1).map(parseCSVLine) };
}

// ── Column Detector ───────────────────────────────────────────────────────────

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
  { key: "startDate",      keywords: ["เริ่มการรายงาน"] },
  { key: "endDate",        keywords: ["สิ้นสุดการรายงาน"] },
];

function detectColumns(headers: string[]): ColumnMap {
  const map: ColumnMap = {};
  const lower = headers.map((h) => h.toLowerCase().trim());
  for (const { key, keywords } of COL_PATTERNS) {
    for (let i = 0; i < lower.length; i++) {
      if (keywords.some((kw) => lower[i].includes(kw.toLowerCase()))) {
        map[key] = i; break;
      }
    }
  }
  return map;
}

// ── Row Converter ─────────────────────────────────────────────────────────────

function n(val?: string): number | null {
  if (!val || val.trim() === "" || val.trim() === "-") return null;
  const num = parseFloat(val.replace(/,/g, ""));
  return isNaN(num) ? null : num;
}

function getGroup(name: string): string {
  return name.split("|")[0].trim() || name;
}

function convertRows(rows: string[][], cm: ColumnMap): AdRow[] {
  return rows
    .filter((r) => r.some((c) => c.trim() !== ""))
    .map((r) => {
      const g = (idx?: number) => (idx !== undefined ? r[idx] : undefined);
      const name = g(cm.name) ?? "";
      return {
        name, group: getGroup(name),
        status:          g(cm.status)          ?? "",
        spend:           n(g(cm.spend)),
        impressions:     n(g(cm.impressions)),
        reach:           n(g(cm.reach)),
        cpm:             n(g(cm.cpm)),
        ctr:             n(g(cm.ctr)),
        cpcLink:         n(g(cm.cpcLink)),
        cpcAll:          n(g(cm.cpcAll)),
        messages:        n(g(cm.messages)),
        costPerMsg:      n(g(cm.costPerMsg)),
        pageEngagement:  n(g(cm.pageEngagement)),
        roas:            n(g(cm.roas)),
        startDate:       g(cm.startDate) ?? "",
        endDate:         g(cm.endDate)   ?? "",
      };
    });
}

// ── Formatters ────────────────────────────────────────────────────────────────

const fmtB  = (v: number | null) => v === null ? "—" : v.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtN  = (v: number | null, dp = 2) => v === null ? "—" : v.toLocaleString("th-TH", { minimumFractionDigits: dp, maximumFractionDigits: dp });
const fmtInt = (v: number | null) => v === null ? "—" : Math.round(v).toLocaleString("th-TH");

function sumN(rows: AdRow[], key: keyof AdRow): number {
  return rows.reduce((a, r) => a + (typeof r[key] === "number" ? (r[key] as number) : 0), 0);
}
function avgN(rows: AdRow[], key: keyof AdRow): number | null {
  const vals = rows.map((r) => r[key]).filter((v) => typeof v === "number") as number[];
  return vals.length === 0 ? null : vals.reduce((a, b) => a + b, 0) / vals.length;
}

// Delta badge for comparison
function DeltaBadge({ a, b, higherIsBetter = true, pct = false }: {
  a: number | null; b: number | null; higherIsBetter?: boolean; pct?: boolean;
}) {
  if (a === null || b === null || b === 0) return <span className="text-xs text-muted-foreground">—</span>;
  const diff = a - b;
  const diffPct = (diff / Math.abs(b)) * 100;
  const good = higherIsBetter ? diff >= 0 : diff <= 0;
  const sign = diff >= 0 ? "+" : "";
  const label = pct
    ? `${sign}${fmtN(diffPct, 1)}%`
    : `${sign}${fmtN(diffPct, 1)}%`;
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${good ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
      {label}
    </span>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === "active")
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Active</span>;
  if (s === "not_delivering")
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-400"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />Paused</span>;
  if (s === "archived")
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-500/15 text-zinc-400"><span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />Archived</span>;
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground">{status}</span>;
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KPICard({ label, value, compareValue, icon, accent, available, higherIsBetter = true }: {
  label: string; value: string; compareValue?: string | null;
  icon: React.ReactNode; accent: string; available: boolean; higherIsBetter?: boolean;
}) {
  const numA = available ? parseFloat(value.replace(/[^0-9.-]/g, "")) : null;
  const numB = compareValue != null ? parseFloat(compareValue.replace(/[^0-9.-]/g, "")) : null;

  return (
    <div className={`rounded-2xl border bg-card p-4 flex flex-col gap-2 ${!available ? "opacity-40" : ""}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${accent}`}>{icon}</div>
      </div>
      <div className="flex items-end gap-2 flex-wrap">
        <p className="text-2xl font-bold tracking-tight">{available ? value : "ไม่มีข้อมูล"}</p>
        {compareValue !== undefined && compareValue !== null && (
          <DeltaBadge a={numA} b={numB} higherIsBetter={higherIsBetter} />
        )}
      </div>
      {compareValue !== undefined && compareValue !== null && available && (
        <p className="text-xs text-muted-foreground">เทียบ: {compareValue}</p>
      )}
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
      {cm.spend          !== undefined && <td className="py-2.5 px-2 text-right text-xs tabular-nums">{fmtB(ad.spend)}</td>}
      {cm.impressions    !== undefined && <td className="py-2.5 px-2 text-right text-xs tabular-nums">{fmtInt(ad.impressions)}</td>}
      {cm.reach          !== undefined && <td className="py-2.5 px-2 text-right text-xs tabular-nums">{fmtInt(ad.reach)}</td>}
      {cm.cpm            !== undefined && <td className="py-2.5 px-2 text-right text-xs tabular-nums">{fmtB(ad.cpm)}</td>}
      {cm.ctr            !== undefined && <td className="py-2.5 px-2 text-right text-xs tabular-nums">{ad.ctr !== null ? fmtN(ad.ctr, 2) + "%" : "—"}</td>}
      {cm.messages       !== undefined && <td className="py-2.5 px-2 text-right text-xs tabular-nums">{fmtInt(ad.messages)}</td>}
      {cm.costPerMsg     !== undefined && <td className="py-2.5 px-2 text-right text-xs tabular-nums">{fmtB(ad.costPerMsg)}</td>}
      {cm.pageEngagement !== undefined && <td className="py-2.5 px-2 text-right text-xs tabular-nums">{fmtInt(ad.pageEngagement)}</td>}
    </tr>
  );
}

// ── Group Card ────────────────────────────────────────────────────────────────

function GroupCard({ groupName, ads, cm, expanded, onToggle }: {
  groupName: string; ads: AdRow[]; cm: ColumnMap; expanded: boolean; onToggle: () => void;
}) {
  const totalSpend = sumN(ads, "spend");
  const totalMsgs  = sumN(ads, "messages");
  const totalImpr  = sumN(ads, "impressions");
  const totalReach = sumN(ads, "reach");
  const avgCPM     = avgN(ads, "cpm");
  const avgCTR     = avgN(ads, "ctr");
  const active     = ads.filter((a) => a.status.toLowerCase() === "active").length;

  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm truncate">{groupName}</span>
            <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{ads.length} โฆษณา</span>
            {active > 0 && <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full">{active} กำลังแสดง</span>}
          </div>
          <div className="flex gap-4 mt-1.5 flex-wrap">
            {cm.spend        !== undefined && <span className="text-xs text-muted-foreground">ใช้จ่าย <b className="text-foreground">฿{fmtB(totalSpend)}</b></span>}
            {cm.impressions  !== undefined && <span className="text-xs text-muted-foreground">Impr. <b className="text-foreground">{fmtInt(totalImpr)}</b></span>}
            {cm.reach        !== undefined && <span className="text-xs text-muted-foreground">Reach <b className="text-foreground">{fmtInt(totalReach)}</b></span>}
            {cm.messages     !== undefined && <span className="text-xs text-muted-foreground">Msg <b className="text-foreground">{fmtInt(totalMsgs)}</b></span>}
            {cm.cpm          !== undefined && avgCPM !== null && <span className="text-xs text-muted-foreground">CPM avg <b className="text-foreground">฿{fmtB(avgCPM)}</b></span>}
            {cm.ctr          !== undefined && avgCTR !== null && <span className="text-xs text-muted-foreground">CTR avg <b className="text-foreground">{fmtN(avgCTR, 2)}%</b></span>}
          </div>
        </div>
        <div className="shrink-0 text-muted-foreground">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </button>

      {expanded && (
        <div className="overflow-x-auto border-t border-border/50">
          <table className="w-full min-w-max text-left">
            <thead>
              <tr className="bg-muted/30">
                <th className="py-2 px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Ad Name</th>
                <th className="py-2 px-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center">Status</th>
                {cm.spend          !== undefined && <th className="py-2 px-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Spend (฿)</th>}
                {cm.impressions    !== undefined && <th className="py-2 px-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Impr.</th>}
                {cm.reach          !== undefined && <th className="py-2 px-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Reach</th>}
                {cm.cpm            !== undefined && <th className="py-2 px-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-right">CPM</th>}
                {cm.ctr            !== undefined && <th className="py-2 px-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-right">CTR</th>}
                {cm.messages       !== undefined && <th className="py-2 px-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Messages</th>}
                {cm.costPerMsg     !== undefined && <th className="py-2 px-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Cost/Msg</th>}
                {cm.pageEngagement !== undefined && <th className="py-2 px-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Page Eng.</th>}
              </tr>
            </thead>
            <tbody>
              {ads.map((ad, i) => <AdTableRow key={i} ad={ad} cm={cm} />)}
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
    try { return JSON.parse(localStorage.getItem(key) ?? "{}") as { win?: string; fix?: string; plan?: string }; }
    catch { return {}; }
  };
  const [win,   setWin]   = useState(() => load().win  ?? "");
  const [fix,   setFix]   = useState(() => load().fix  ?? "");
  const [plan,  setPlan]  = useState(() => load().plan ?? "");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem(key, JSON.stringify({ win, fix, plan }));
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="rounded-2xl border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <BarChart2 className="w-4 h-4 text-violet-400" />
        <h3 className="font-semibold text-sm">Insights — {period || "ช่วงเวลานี้"}</h3>
        <span className="text-xs text-muted-foreground ml-1">บันทึกเฉพาะ browser นี้</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {([
          { key: "win",  label: "Win — สิ่งที่ทำได้ดี",    color: "emerald", val: win,  set: setWin,  ph: "โฆษณาตัวไหนทำได้ดี? เพราะอะไร?" },
          { key: "fix",  label: "Fix — สิ่งที่ต้องแก้ไข", color: "amber",   val: fix,  set: setFix,  ph: "โฆษณาตัวไหนแย่? ปัญหาคืออะไร?" },
          { key: "plan", label: "Plan — แผนถัดไป",         color: "violet",  val: plan, set: setPlan, ph: "จะปรับอะไรในช่วงถัดไป?" },
        ] as const).map(({ key: k, label, color, val, set, ph }) => (
          <div key={k} className="space-y-1.5">
            <label className={`text-xs font-semibold flex items-center gap-1.5 text-${color}-400`}>
              <span className={`w-2 h-2 rounded-full bg-${color}-400`} /> {label}
            </label>
            <textarea value={val} onChange={(e) => set(e.target.value)} placeholder={ph}
              className={`w-full rounded-xl border bg-muted/30 px-3 py-2.5 text-sm resize-none h-28 focus:outline-none focus:ring-2 focus:ring-${color}-500/40 placeholder:text-muted-foreground/40`}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <button onClick={handleSave}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${saved ? "bg-emerald-500/20 text-emerald-400" : "bg-violet-600 hover:bg-violet-500 text-white"}`}>
          {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? "บันทึกแล้ว!" : "บันทึก Insights"}
        </button>
      </div>
    </div>
  );
}

// ── Upload Zone ───────────────────────────────────────────────────────────────

function UploadZone({ onFile, compact = false }: { onFile: (text: string, name: string) => void; compact?: boolean }) {
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

  if (compact) {
    return (
      <label className={`flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer transition-all text-sm font-semibold
        ${dragging ? "bg-violet-500/20 text-violet-300" : "bg-violet-600 hover:bg-violet-500 text-white"}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <Plus className="w-4 h-4" /> Upload Report
        <input ref={inputRef} type="file" accept=".csv" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f); e.target.value = ""; }} />
      </label>
    );
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={`rounded-2xl border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center gap-3 py-16 px-8 text-center
        ${dragging ? "border-violet-500 bg-violet-500/10" : "border-border hover:border-violet-400 hover:bg-muted/20"}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-violet-500/15 flex items-center justify-center">
        <Upload className="w-7 h-7 text-violet-400" />
      </div>
      <div>
        <p className="font-semibold text-sm">ลาก CSV มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์</p>
        <p className="text-xs text-muted-foreground mt-1">ไฟล์ Meta Ads Manager Export (.csv)</p>
      </div>
      <input ref={inputRef} type="file" accept=".csv" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f); e.target.value = ""; }} />
    </div>
  );
}

// ── Compare KPI Panel ─────────────────────────────────────────────────────────

function ComparePanel({ a, b }: { a: ReportData; b: ReportData }) {
  type KPIRow = { label: string; valA: string; valB: string; numA: number | null; numB: number | null; higherIsBetter: boolean };

  const rows: KPIRow[] = [
    { label: "ยอดใช้จ่าย (฿)", valA: `฿${fmtB(sumN(a.ads, "spend"))}`, valB: `฿${fmtB(sumN(b.ads, "spend"))}`, numA: sumN(a.ads, "spend"), numB: sumN(b.ads, "spend"), higherIsBetter: false },
    { label: "Impressions",     valA: fmtInt(sumN(a.ads, "impressions")), valB: fmtInt(sumN(b.ads, "impressions")), numA: sumN(a.ads, "impressions"), numB: sumN(b.ads, "impressions"), higherIsBetter: true },
    { label: "Reach",           valA: fmtInt(sumN(a.ads, "reach")),       valB: fmtInt(sumN(b.ads, "reach")),       numA: sumN(a.ads, "reach"),       numB: sumN(b.ads, "reach"),       higherIsBetter: true },
    { label: "Messages",        valA: fmtInt(sumN(a.ads, "messages")),    valB: fmtInt(sumN(b.ads, "messages")),    numA: sumN(a.ads, "messages"),    numB: sumN(b.ads, "messages"),    higherIsBetter: true },
    { label: "CPM เฉลี่ย",     valA: `฿${fmtB(avgN(a.ads, "cpm"))}`,   valB: `฿${fmtB(avgN(b.ads, "cpm"))}`,   numA: avgN(a.ads, "cpm"),         numB: avgN(b.ads, "cpm"),         higherIsBetter: false },
    { label: "CTR เฉลี่ย",     valA: `${fmtN(avgN(a.ads, "ctr"), 2)}%`, valB: `${fmtN(avgN(b.ads, "ctr"), 2)}%`, numA: avgN(a.ads, "ctr"),        numB: avgN(b.ads, "ctr"),         higherIsBetter: true },
    { label: "จำนวนโฆษณา",     valA: String(a.ads.length),              valB: String(b.ads.length),              numA: a.ads.length,               numB: b.ads.length,               higherIsBetter: true },
  ];

  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/20">
        <GitCompare className="w-4 h-4 text-violet-400" />
        <span className="font-semibold text-sm">เปรียบเทียบ KPI</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/50">
              <th className="py-2.5 px-4 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-left w-32">KPI</th>
              <th className="py-2.5 px-4 text-xs font-semibold text-violet-400 text-right">{a.period_label}</th>
              <th className="py-2.5 px-4 text-xs font-semibold text-blue-400 text-right">{b.period_label}</th>
              <th className="py-2.5 px-4 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center">เปลี่ยน</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ label, valA, valB, numA, numB, higherIsBetter }) => (
              <tr key={label} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                <td className="py-3 px-4 text-xs text-muted-foreground">{label}</td>
                <td className="py-3 px-4 text-sm font-semibold text-right text-violet-300">{valA}</td>
                <td className="py-3 px-4 text-sm font-semibold text-right text-blue-300">{valB}</td>
                <td className="py-3 px-4 text-center">
                  <DeltaBadge a={numA} b={numB} higherIsBetter={higherIsBetter} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Supabase Helpers ──────────────────────────────────────────────────────────

async function sbLoadReports(): Promise<ReportMeta[]> {
  if (!supabase) return lsLoadList();
  const { data, error } = await supabase
    .from("ads_reports")
    .select("id, period_label, file_name, uploaded_at, uploaded_by")
    .order("uploaded_at", { ascending: false });
  if (error) { console.error("[AdsReport] load:", error); return lsLoadList(); }
  return (data ?? []) as ReportMeta[];
}

async function sbSaveReport(payload: {
  period_label: string; start_date: string; end_date: string;
  file_name: string; uploaded_by: string; rows_json: AdRow[]; col_map: ColumnMap;
}): Promise<string | null> {
  if (!supabase) { return lsSaveReport(payload); }
  const { data, error } = await supabase
    .from("ads_reports")
    .insert({ ...payload, rows_json: payload.rows_json, col_map: payload.col_map })
    .select("id")
    .single();
  if (error) { console.error("[AdsReport] save:", error); return lsSaveReport(payload); }
  return data?.id ?? null;
}

async function sbLoadData(id: string): Promise<{ ads: AdRow[]; colMap: ColumnMap } | null> {
  if (!supabase) return lsLoadData(id);
  const { data, error } = await supabase
    .from("ads_reports")
    .select("rows_json, col_map")
    .eq("id", id)
    .single();
  if (error) { console.error("[AdsReport] loadData:", error); return lsLoadData(id); }
  return { ads: (data.rows_json as AdRow[]) ?? [], colMap: (data.col_map as ColumnMap) ?? {} };
}

async function sbDeleteReport(id: string): Promise<void> {
  if (!supabase) { lsDeleteReport(id); return; }
  const { error } = await supabase.from("ads_reports").delete().eq("id", id);
  if (error) console.error("[AdsReport] delete:", error);
}

// ── localStorage Fallback ─────────────────────────────────────────────────────

const LS_LIST = "ads-report-list-v2";
const lsKey   = (id: string) => `ads-report-data-v2::${id}`;

function lsLoadList(): ReportMeta[] {
  try { return JSON.parse(localStorage.getItem(LS_LIST) ?? "[]"); } catch { return []; }
}
function lsSaveList(list: ReportMeta[]) {
  localStorage.setItem(LS_LIST, JSON.stringify(list));
}
function lsSaveReport(payload: { period_label: string; file_name: string; uploaded_by: string; rows_json: AdRow[]; col_map: ColumnMap; start_date: string; end_date: string }): string {
  const id = `local-${Date.now()}`;
  const list = lsLoadList();
  const meta: ReportMeta = { id, period_label: payload.period_label, file_name: payload.file_name, uploaded_at: new Date().toISOString(), uploaded_by: payload.uploaded_by };
  lsSaveList([meta, ...list]);
  localStorage.setItem(lsKey(id), JSON.stringify({ ads: payload.rows_json, colMap: payload.col_map }));
  return id;
}
function lsLoadData(id: string): { ads: AdRow[]; colMap: ColumnMap } | null {
  try { return JSON.parse(localStorage.getItem(lsKey(id)) ?? "null"); } catch { return null; }
}
function lsDeleteReport(id: string) {
  lsSaveList(lsLoadList().filter((r) => r.id !== id));
  localStorage.removeItem(lsKey(id));
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdsReport() {
  const currentUser = useCurrentUser();

  const [reports,       setReports]       = useState<ReportMeta[]>([]);
  const [activeReport,  setActiveReport]  = useState<ReportData | null>(null);
  const [compareReport, setCompareReport] = useState<ReportData | null>(null);
  const [compareMode,   setCompareMode]   = useState(false);
  const [loadingList,   setLoadingList]   = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [filterStatus,  setFilterStatus]  = useState<"all" | "active" | "not_delivering" | "archived">("all");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [missingCols,   setMissingCols]   = useState<string[]>([]);

  // ── Load report list on mount ──
  useEffect(() => {
    setLoadingList(true);
    sbLoadReports().then((list) => { setReports(list); setLoadingList(false); });
  }, []);

  // ── Select a report to view ──
  const selectReport = async (meta: ReportMeta, forCompare = false) => {
    setLoadingReport(true);
    const data = await sbLoadData(meta.id);
    setLoadingReport(false);
    if (!data) return;
    const report: ReportData = { ...meta, ...data };
    if (forCompare) {
      setCompareReport(report);
    } else {
      setActiveReport(report);
      setCompareReport(null);
      setCompareMode(false);
      // expand all groups
      const groups: Record<string, boolean> = {};
      data.ads.forEach((a) => { groups[a.group] = true; });
      setExpandedGroups(groups);
    }
  };

  // ── Parse + Save new CSV ──
  const handleFile = async (text: string, fileName: string) => {
    const { headers, rows } = parseCSV(text);
    const colMap  = detectColumns(headers);
    const ads     = convertRows(rows, colMap);
    const start   = ads.find((a) => a.startDate)?.startDate ?? "";
    const end     = ads.find((a) => a.endDate)?.endDate     ?? "";
    const period  = start && end ? `${start} – ${end}` : fileName.replace(".csv", "");

    const missing = (["spend","impressions","messages","cpm","ctr"] as (keyof ColumnMap)[])
      .filter((k) => colMap[k] === undefined)
      .map((k) => ({ spend: "ยอดใช้จ่าย", impressions: "Impressions", messages: "Messages", cpm: "CPM", ctr: "CTR" }[k] ?? k));
    setMissingCols(missing);

    setSaving(true);
    const id = await sbSaveReport({
      period_label: period,
      start_date:   start,
      end_date:     end,
      file_name:    fileName,
      uploaded_by:  currentUser?.full_name ?? "unknown",
      rows_json:    ads,
      col_map:      colMap,
    });
    setSaving(false);

    // Refresh list
    const newList = await sbLoadReports();
    setReports(newList);

    // Auto-select new report
    if (id) {
      const meta = newList.find((r) => r.id === id);
      if (meta) {
        const report: ReportData = { ...meta, ads, colMap };
        setActiveReport(report);
        setCompareReport(null);
        setCompareMode(false);
        const groups: Record<string, boolean> = {};
        ads.forEach((a) => { groups[a.group] = true; });
        setExpandedGroups(groups);
      }
    }
  };

  // ── Delete a report ──
  const handleDelete = async (id: string) => {
    await sbDeleteReport(id);
    const newList = await sbLoadReports();
    setReports(newList);
    if (activeReport?.id === id)  setActiveReport(null);
    if (compareReport?.id === id) setCompareReport(null);
    setDeleteConfirm(null);
  };

  const toggleGroup = (g: string) =>
    setExpandedGroups((prev) => ({ ...prev, [g]: !prev[g] }));

  // Filtered ads
  const filteredAds = !activeReport ? [] :
    filterStatus === "all" ? activeReport.ads :
    activeReport.ads.filter((a) => a.status.toLowerCase() === filterStatus);

  const groupEntries = Object.entries(
    filteredAds.reduce<Record<string, AdRow[]>>((acc, ad) => {
      if (!acc[ad.group]) acc[ad.group] = [];
      acc[ad.group].push(ad);
      return acc;
    }, {})
  ).sort(([, a], [, b]) => sumN(b, "spend") - sumN(a, "spend"));

  const cm = activeReport?.colMap ?? {};
  const ads = activeReport?.ads ?? [];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-violet-400" /> Meta Ads Report
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {SUPABASE_ENABLED
                ? "บันทึก report ลง Cloud — ทีม Marketing ทุกคนเห็นข้อมูลเดียวกัน"
                : "บันทึก report ลง localStorage (Supabase ยังไม่เปิดใช้งาน)"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {saving && <span className="flex items-center gap-1.5 text-xs text-violet-400"><Loader2 className="w-3.5 h-3.5 animate-spin" />กำลังบันทึก...</span>}
            <UploadZone onFile={handleFile} compact />
          </div>
        </div>

        {/* ── Saved Reports List ── */}
        <div className="rounded-2xl border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <CloudUpload className="w-3.5 h-3.5" /> Saved Reports
              {loadingList && <Loader2 className="w-3 h-3 animate-spin" />}
            </span>
            {compareMode && compareReport && (
              <button onClick={() => { setCompareMode(false); setCompareReport(null); }}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-muted transition-colors">
                <X className="w-3 h-3" /> ยกเลิกเปรียบเทียบ
              </button>
            )}
          </div>

          {reports.length === 0 && !loadingList && (
            <p className="text-xs text-muted-foreground text-center py-4">ยังไม่มี report — กด "Upload Report" เพื่อเริ่มต้น</p>
          )}

          <div className="flex flex-wrap gap-2">
            {reports.map((r) => {
              const isActive  = activeReport?.id  === r.id;
              const isCompare = compareReport?.id === r.id;
              return (
                <div key={r.id} className="flex items-center gap-0.5 group">
                  <button
                    onClick={() => {
                      if (compareMode && activeReport && activeReport.id !== r.id) {
                        selectReport(r, true);
                      } else {
                        selectReport(r, false);
                      }
                    }}
                    disabled={loadingReport}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                      isActive
                        ? "bg-violet-600 border-violet-600 text-white"
                        : isCompare
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "bg-muted/50 border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <FileText className="w-3 h-3" />
                    <span>{r.period_label}</span>
                    {isCompare && <span className="text-[9px] bg-blue-400/20 px-1 rounded">เปรียบ</span>}
                  </button>
                  {/* Delete button */}
                  {deleteConfirm === r.id ? (
                    <div className="flex items-center gap-1 ml-1">
                      <button onClick={() => handleDelete(r.id)}
                        className="text-[10px] bg-red-500/20 text-red-400 px-2 py-1 rounded-lg hover:bg-red-500/30 transition-colors">ลบ</button>
                      <button onClick={() => setDeleteConfirm(null)}
                        className="text-[10px] bg-muted text-muted-foreground px-2 py-1 rounded-lg hover:bg-muted/70 transition-colors">ยกเลิก</button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirm(r.id)}
                      className="w-6 h-6 rounded-lg opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 hover:bg-red-400/10 flex items-center justify-center transition-all ml-0.5">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Compare toggle */}
          {activeReport && reports.length >= 2 && (
            <div className="border-t border-border/40 pt-3">
              <button
                onClick={() => setCompareMode((v) => !v)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  compareMode
                    ? "bg-blue-600/20 text-blue-400 border border-blue-600/30"
                    : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground border border-border"
                }`}
              >
                <GitCompare className="w-3.5 h-3.5" />
                {compareMode ? "กำลังเลือก period เปรียบเทียบ — คลิก chip ด้านบน" : "เปรียบเทียบ 2 Period"}
              </button>
            </div>
          )}
        </div>

        {/* Loading indicator */}
        {loadingReport && (
          <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
            <span className="text-sm">กำลังโหลดข้อมูล...</span>
          </div>
        )}

        {/* ── Empty state: no reports yet ── */}
        {!loadingList && !loadingReport && reports.length === 0 && (
          <div className="space-y-4">
            <UploadZone onFile={handleFile} />
            <div className="rounded-2xl border bg-muted/20 p-4 flex gap-3">
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">วิธี Export CSV จาก Meta Ads Manager</p>
                <ol className="text-xs text-muted-foreground space-y-0.5 list-decimal list-inside">
                  <li>เปิด Meta Ads Manager → เลือกระดับ Campaign / Ad Set / Ad</li>
                  <li>กด "Export" → เลือก "Export Table Data (CSV)"</li>
                  <li>เลือก Columns ที่ต้องการแล้ว Download</li>
                  <li>นำไฟล์ .csv มาอัปโหลดที่นี่</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* ── Prompt to select a report ── */}
        {!loadingList && !loadingReport && reports.length > 0 && !activeReport && (
          <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground space-y-2">
            <FileText className="w-10 h-10 mx-auto text-muted-foreground/30" />
            <p className="text-sm">เลือก report ด้านบนเพื่อดูข้อมูล หรืออัปโหลด CSV ใหม่</p>
          </div>
        )}

        {/* ── Active Report ── */}
        {activeReport && !loadingReport && (
          <>
            {/* Compare Panel */}
            {compareMode && compareReport && (
              <ComparePanel a={activeReport} b={compareReport} />
            )}

            {/* Period info */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-muted-foreground">ช่วงเวลา: <b className="text-foreground">{activeReport.period_label}</b></span>
              <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{ads.length} โฆษณา</span>
              <span className="text-xs bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full">
                {ads.filter((a) => a.status.toLowerCase() === "active").length} กำลังแสดง
              </span>
              <span className="text-xs text-muted-foreground ml-auto">โดย {activeReport.uploaded_by ?? "—"}</span>
            </div>

            {/* Missing columns warning */}
            {missingCols.length > 0 && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300">ไม่พบ Column: <b>{missingCols.join(", ")}</b> — ระบบแสดงเฉพาะข้อมูลที่มี</p>
              </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: "ยอดใช้จ่าย (฿)", val: `฿${fmtB(sumN(ads,"spend"))}`,         cmpVal: compareReport ? `฿${fmtB(sumN(compareReport.ads,"spend"))}` : undefined,    icon: <DollarSign className="w-4 h-4 text-white" />,         acc: "bg-gradient-to-br from-violet-500 to-purple-600",  avail: cm.spend !== undefined,      hib: false },
                { label: "Impressions",     val: fmtInt(sumN(ads,"impressions")),          cmpVal: compareReport ? fmtInt(sumN(compareReport.ads,"impressions")) : undefined,   icon: <Eye className="w-4 h-4 text-white" />,                acc: "bg-gradient-to-br from-blue-500 to-indigo-600",    avail: cm.impressions !== undefined, hib: true  },
                { label: "Reach",           val: fmtInt(sumN(ads,"reach")),               cmpVal: compareReport ? fmtInt(sumN(compareReport.ads,"reach")) : undefined,         icon: <Users className="w-4 h-4 text-white" />,             acc: "bg-gradient-to-br from-cyan-500 to-blue-600",     avail: cm.reach !== undefined,       hib: true  },
                { label: "Messages",        val: fmtInt(sumN(ads,"messages")),             cmpVal: compareReport ? fmtInt(sumN(compareReport.ads,"messages")) : undefined,      icon: <MessageCircle className="w-4 h-4 text-white" />,     acc: "bg-gradient-to-br from-emerald-500 to-teal-600",  avail: cm.messages !== undefined,    hib: true  },
                { label: "CPM เฉลี่ย (฿)", val: `฿${fmtB(avgN(ads,"cpm"))}`,            cmpVal: compareReport ? `฿${fmtB(avgN(compareReport.ads,"cpm"))}` : undefined,       icon: <TrendingUp className="w-4 h-4 text-white" />,        acc: "bg-gradient-to-br from-orange-500 to-red-600",    avail: cm.cpm !== undefined,         hib: false },
                { label: "CTR เฉลี่ย",     val: `${fmtN(avgN(ads,"ctr"),2)}%`,           cmpVal: compareReport ? `${fmtN(avgN(compareReport.ads,"ctr"),2)}%` : undefined,     icon: <MousePointerClick className="w-4 h-4 text-white" />, acc: "bg-gradient-to-br from-pink-500 to-fuchsia-600",  avail: cm.ctr !== undefined,         hib: true  },
              ].map(({ label, val, cmpVal, icon, acc, avail, hib }) => (
                <KPICard key={label} label={label} value={val}
                  compareValue={compareMode && compareReport ? cmpVal : undefined}
                  icon={icon} accent={acc} available={avail} higherIsBetter={hib} />
              ))}
            </div>

            {/* Filter + expand/collapse */}
            <div className="flex items-center gap-2 flex-wrap">
              {(["all","active","not_delivering","archived"] as const).map((s) => {
                const labels = { all: `ทั้งหมด (${ads.length})`, active: `Active (${ads.filter((a)=>a.status.toLowerCase()==="active").length})`, not_delivering: `Paused (${ads.filter((a)=>a.status.toLowerCase()==="not_delivering").length})`, archived: `Archived (${ads.filter((a)=>a.status.toLowerCase()==="archived").length})` };
                return (
                  <button key={s} onClick={() => setFilterStatus(s)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${filterStatus===s ? "bg-violet-600 text-white" : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"}`}>
                    {labels[s]}
                  </button>
                );
              })}
              <button onClick={() => setExpandedGroups(Object.fromEntries(groupEntries.map(([g]) => [g, true])))}
                className="ml-auto px-3 py-1.5 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">ขยายทั้งหมด</button>
              <button onClick={() => setExpandedGroups(Object.fromEntries(groupEntries.map(([g]) => [g, false])))}
                className="px-3 py-1.5 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">ย่อทั้งหมด</button>
            </div>

            {/* Group Cards */}
            <div className="space-y-3">
              {groupEntries.length === 0
                ? <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground text-sm">ไม่มีโฆษณาในสถานะนี้</div>
                : groupEntries.map(([g, gAds]) => (
                  <GroupCard key={g} groupName={g} ads={gAds} cm={cm} expanded={expandedGroups[g] ?? false} onToggle={() => toggleGroup(g)} />
                ))
              }
            </div>

            {/* Insight Form */}
            <InsightForm period={activeReport.period_label} />
          </>
        )}
      </div>
    </div>
  );
}
