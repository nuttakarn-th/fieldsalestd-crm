/**
 * AdsDashboard.tsx
 * Marketing → วิเคราะห์ Ads จาก Meta Business Suite Excel Export
 * รองรับ Role: Marketing, Admin, Sales Manager
 */
import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart2, TrendingUp, Target, DollarSign,
  Eye, MousePointerClick, Flame, ChevronDown, ChevronUp,
  FileSpreadsheet, X, RefreshCw, Lightbulb, AlertCircle,
  ArrowUpRight, ArrowDownRight, Minus, List, LayoutDashboard,
  Images, Loader2, Key, Zap, CheckCircle2, Info,
  Settings2, Users, ImageOff, Clock, Trash2, Database,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, Cell, PieChart, Pie, LabelList,
} from "recharts";
import { StandaloneHeader } from "@/components/StandaloneHeader";
import { useCurrentUser } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────
interface AdRow {
  campaign: string;
  adSet: string;
  status: string;
  reach: number;
  impressions: number;
  spend: number;
  resultType: string;
  costPerResult: number;
  startDate: string;
  endDate: string;
  cpm: number;
  ctr: number;
  engagement: number;
  likes: number;
  // IDs (optional — present when user exports with ID columns)
  adId?: string;
  adSetId?: string;
  campaignId?: string;
}

// ─── Meta Graph API ───────────────────────────────────────────────────────────
const META_API = "https://graph.facebook.com/v19.0";

// ID column name patterns (Thai + English — covers both export styles)
const AD_ID_PATTERNS     = ["รหัสโฆษณา","ad id","รหัส ad","id โฆษณา","id_ad","ad_id"];
const ADSET_ID_PATTERNS  = ["รหัสชุดโฆษณา","ad set id","adset id","id ชุดโฆษณา","id_adset","adset_id"];
const CAMPAIGN_ID_PATTERNS = ["รหัสแคมเปญ","campaign id","id แคมเปญ","campaign_id"];

function findColIdx(headers: string[], patterns: string[]): number {
  return headers.findIndex(h =>
    patterns.some(p => String(h ?? "").toLowerCase().trim() === p.toLowerCase())
  );
}

// Detect which row contains the actual column headers
// Meta exports often have 1–2 title/blank rows before the real header row
function findHeaderRow(raw: any[][]): number {
  for (let i = 0; i < Math.min(raw.length, 6); i++) {
    const row = raw[i];
    if (!row) continue;
    const text = row.map(c => String(c ?? "").trim()).join(" ").toLowerCase();
    // Real header rows always contain both campaign name + status columns
    if ((text.includes("ชื่อแคมเปญ") || text.includes("campaign")) &&
        (text.includes("สถานะ") || text.includes("status") || text.includes("reach") || text.includes("เข้าถึง"))) {
      return i;
    }
  }
  return 0; // fallback
}

// Detect which column index data actually starts at (some exports have empty col A)
function findDataStartCol(headerRow: any[]): number {
  // First non-empty cell that looks like a column header
  for (let i = 0; i < headerRow.length; i++) {
    const v = String(headerRow[i] ?? "").trim();
    if (v.length > 1) return i;
  }
  return 0;
}

async function fetchAdThumbnail(id: string, token: string, isAdSet = false): Promise<string | null> {
  try {
    let url: string;
    if (isAdSet) {
      // Ad Set → get first ad's creative
      url = `${META_API}/${id}/ads?fields=creative%7Bthumbnail_url%2Cimage_url%7D&limit=1&access_token=${token}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.error) return null;
      const ad = data?.data?.[0];
      return ad?.creative?.image_url || ad?.creative?.thumbnail_url || null;
    } else {
      // Ad → get creative directly
      url = `${META_API}/${id}?fields=creative%7Bthumbnail_url%2Cimage_url%7D&access_token=${token}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.error) return null;
      return data?.creative?.image_url || data?.creative?.thumbnail_url || null;
    }
  } catch {
    return null;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number, dec = 0) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000 ? `${(n / 1_000).toFixed(dec === 0 ? 1 : dec)}K`
  : n.toFixed(dec);

const fmtTHB = (n: number) =>
  n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtPct = (n: number) => `${n.toFixed(2)}%`;

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  active:               { label: "กำลังแสดง",   color: "bg-green-100 text-green-700 border-green-300" },
  not_delivering:       { label: "หยุดแสดง",     color: "bg-amber-100 text-amber-700 border-amber-300" },
  permanently_deleted:  { label: "ถูกลบถาวร",   color: "bg-red-100 text-red-700 border-red-300" },
};

const COLORS = [
  "#7c3aed","#8b5cf6","#a78bfa","#c4b5fd",
  "#ec4899","#f472b6","#0ea5e9","#38bdf8",
  "#10b981","#34d399","#f59e0b","#fbbf24",
];

// Short label for chart display
function shortLabel(s: string, max = 16): string {
  const clean = s.replace(/^โพสต์:\s*["'""]?/i, "").replace(/["'""]?\s*$/, "");
  return clean.length > max ? clean.slice(0, max) + "…" : clean;
}

// ─── Parse Excel ──────────────────────────────────────────────────────────────
function parseExcel(buffer: ArrayBuffer): AdRow[] {
  const wb = XLSX.read(buffer, { type: "array" });

  // Prefer "Raw Data Report" sheet if available (cleaner than "Formatted Report")
  const sheetName = wb.SheetNames.find(n =>
    n.toLowerCase().includes("raw") || n.toLowerCase().includes("data")
  ) ?? wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
  if (!raw || raw.length < 2) return [];

  // Auto-detect header row + data start column
  const headerRowIdx = findHeaderRow(raw);
  const headers      = raw[headerRowIdx] ?? [];
  const startCol     = findDataStartCol(headers);

  // Build column index map by name (relative to startCol)
  const hNorm = headers.map(h => String(h ?? "").toLowerCase().trim());
  const col = (patterns: string[]) => {
    const idx = hNorm.findIndex(h => patterns.some(p => h === p.toLowerCase()));
    return idx >= 0 ? idx : -1;
  };

  const C = {
    campaign:      col(["ชื่อแคมเปญ","campaign name","campaign"]),
    adSet:         col(["ชื่อชุดโฆษณา","ad set name","adset name"]),
    adId:          col(AD_ID_PATTERNS),
    status:        col(["สถานะการแสดงโฆษณา","delivery status","status"]),
    level:         col(["ระดับการแสดงโฆษณา","reporting level","level"]),
    reach:         col(["การเข้าถึง","reach"]),
    impressions:   col(["อิมเพรสชัน","impressions"]),
    spend:         col(["จำนวนเงินที่ใช้จ่ายไป (thb)","amount spent (thb)","spend","จำนวนเงินที่ใช้จ่ายไป"]),
    resultType:    col(["ประเภทผลลัพธ์","result indicator","objective"]),
    costPerResult: col(["ต้นทุนต่อผลลัพธ์","cost per result"]),
    startDate:     col(["เริ่ม","starts","start date","start"]),
    endDate:       col(["สิ้นสุด","ends","end date","end"]),
    cpm:           col(["cpm (ต้นทุนต่ออิมเพรสชั่น 1,000 ครั้ง)","cpm"]),
    ctr:           col(["ctr (ทั้งหมด)","ctr (all)","ctr"]),
    engagement:    col(["การมีส่วนร่วมกับเพจ","page engagement","engagements"]),
    likes:         col(["การกดถูกใจบน facebook","facebook likes","likes"]),
    adSetId:       col(ADSET_ID_PATTERNS),
    campaignId:    col(CAMPAIGN_ID_PATTERNS),
  };

  // For "ID โฆษณา" — real numeric IDs appear only on "ad" level rows
  // "All" string in that column = campaign/adset summary row, not a real ID

  const rows: AdRow[] = [];
  for (let i = headerRowIdx + 1; i < raw.length; i++) {
    const r = raw[i];
    if (!r) continue;

    const campaign = String(r[C.campaign] ?? "").trim();
    if (!campaign) continue; // skip totals / empty rows

    const levelVal = C.level >= 0 ? String(r[C.level] ?? "").toLowerCase().trim() : "";

    // Use ONLY adset-level rows as the single source of truth.
    // - "campaign" rows = grand total per campaign → skip (inflates totals)
    // - "ad" rows = individual ad within adset → skip (duplicates adset data)
    // - "adset" rows = one row per ad set → correct granularity for this dashboard
    // If no level column detected (old format), include everything (fallback).
    if (C.level >= 0) {
      if (levelVal === "campaign" || levelVal === "ad") continue;
      // If level column exists but row has no level value → likely a sub-total row, skip
      if (levelVal === "" || levelVal === "all") continue;
    }

    // Extract raw Ad ID — only valid if it's a real number (not "All")
    const rawAdId = C.adId >= 0 ? r[C.adId] : undefined;
    const adIdStr = rawAdId !== undefined && rawAdId !== "All" && rawAdId !== null && rawAdId !== ""
      ? String(Math.round(Number(rawAdId)))
      : undefined;
    const isValidId = adIdStr && !isNaN(Number(adIdStr)) && adIdStr.length > 5;

    rows.push({
      campaign,
      adSet:         String(r[C.adSet]         ?? "").trim(),
      status:        String(r[C.status]         ?? ""),
      reach:         Number(r[C.reach]          ?? 0),
      impressions:   Number(r[C.impressions]    ?? 0),
      spend:         Number(r[C.spend]          ?? 0),
      resultType:    String(r[C.resultType]     ?? ""),
      costPerResult: Number(r[C.costPerResult]  ?? 0),
      startDate:     String(r[C.startDate]      ?? ""),
      endDate:       String(r[C.endDate]        ?? ""),
      cpm:           Number(r[C.cpm]            ?? 0),
      ctr:           Number(r[C.ctr]            ?? 0),
      engagement:    Number(r[C.engagement]     ?? 0),
      likes:         Number(r[C.likes]          ?? 0),
      adId:          isValidId ? adIdStr : undefined,
      adSetId:       C.adSetId >= 0 && r[C.adSetId] && r[C.adSetId] !== "All"
                       ? String(Math.round(Number(r[C.adSetId]))) : undefined,
      campaignId:    C.campaignId >= 0 && r[C.campaignId] && r[C.campaignId] !== "All"
                       ? String(Math.round(Number(r[C.campaignId]))) : undefined,
    });
  }
  return rows;
}

// ─── AI Analysis ──────────────────────────────────────────────────────────────
function generateAnalysis(rows: AdRow[], totals: ReturnType<typeof calcTotals>): {
  summary: string;
  best: string;
  worst: string;
  bestRow: AdRow | null;
  worstRow: AdRow | null;
  insights: string[];
  goals: string[];
} {
  if (!rows.length) return { summary: "", best: "", worst: "", bestRow: null, worstRow: null, insights: [], goals: [] };

  const sorted = [...rows].sort((a, b) => b.spend - a.spend);
  const bestCTR = [...rows].sort((a, b) => b.ctr - a.ctr)[0];
  const bestEngage = [...rows].sort((a, b) => b.engagement - a.engagement)[0];
  const worstCPM = [...rows].sort((a, b) => b.cpm - a.cpm)[0];
  const lowestCTR = [...rows].filter(r => r.ctr > 0).sort((a, b) => a.ctr - b.ctr)[0];

  const engageRows = rows.filter(r => r.resultType.includes("ส่วนร่วม"));
  const reachRows  = rows.filter(r => r.resultType.includes("เข้าถึง"));

  const insights: string[] = [];

  // CTR insight
  if (bestCTR.ctr > 5) {
    insights.push(`📌 โฆษณา "${shortLabel(bestCTR.adSet, 24)}" มี CTR สูงถึง ${fmtPct(bestCTR.ctr)} — แสดงว่า Creative มีความน่าสนใจสูง ควรนำ concept นี้ไปต่อยอด`);
  } else {
    insights.push(`⚠️ CTR เฉลี่ยทั้งหมดอยู่ที่ ${fmtPct(totals.avgCTR)} ซึ่งต่ำกว่าเกณฑ์ Facebook Ads ทั่วไป (1–2%) — ควรปรับ Creative หรือ Audience Targeting`);
  }

  // CPM insight
  if (reachRows.length > 0) {
    const avgReachCPM = reachRows.reduce((s, r) => s + r.cpm, 0) / reachRows.length;
    if (avgReachCPM < 10) {
      insights.push(`✅ แคมเปญ Reach มี CPM เฉลี่ย ฿${avgReachCPM.toFixed(2)} — ถือว่าดี สามารถขยาย Budget เพื่อเพิ่ม Awareness ได้`);
    } else {
      insights.push(`💸 CPM แคมเปญ Reach อยู่ที่ ฿${avgReachCPM.toFixed(2)} — ลอง Narrow Audience หรือเปลี่ยน Placement เพื่อลดต้นทุน`);
    }
  }

  // Engagement insight
  if (engageRows.length > 0) {
    const avgCPE = engageRows.reduce((s, r) => s + r.costPerResult, 0) / engageRows.length;
    insights.push(`💬 ต้นทุนต่อการมีส่วนร่วม (CPE) เฉลี่ยอยู่ที่ ฿${avgCPE.toFixed(2)} — ${avgCPE < 2 ? "ดีมาก เหมาะกับการสร้าง Social Proof" : "ลองปรับ Audience ให้ตรง Interest มากขึ้น"}`);
  }

  // Budget allocation
  const totalCampaigns = [...new Set(rows.map(r => r.campaign))].length;
  if (totalCampaigns > 3) {
    insights.push(`📊 งบถูกกระจายใน ${totalCampaigns} แคมเปญ — ลองทดสอบการเพิ่มงบใน ${sorted[0] ? `"${shortLabel(sorted[0].campaign, 20)}"` : "แคมเปญอันดับ 1"} ที่มีประสิทธิภาพดีสุดก่อน`);
  }

  // Status insight
  const deleted = rows.filter(r => r.status === "permanently_deleted");
  if (deleted.length > 0) {
    insights.push(`🗑️ มี ${deleted.length} Ad Set ที่ถูกลบถาวร — ตรวจสอบเหตุผลและนำ Learnings ไปปรับ Ad Set ใหม่`);
  }

  const goals: string[] = [
    `🎯 เพิ่ม CTR เฉลี่ยจาก ${fmtPct(totals.avgCTR)} ให้ถึง 2.0% ด้วยการ A/B Test Headline และ Visual ใหม่`,
    `📉 ลด CPM จาก ฿${totals.avgCPM.toFixed(2)} ลง 15–20% โดย Narrow Audience ตาม Interest & Lookalike`,
    `💡 สร้าง Engagement Campaign เฉพาะ Content ที่มี CTR > 3% เพื่อ Build Social Proof ก่อน Run Reach`,
    `📅 กำหนดตาราง Campaign Review ทุก 7 วัน เพื่อปรับ Budget ตาม Performance ที่เกิดขึ้นจริง`,
    `🔄 ทดสอบ Retargeting Audience จาก Engagement ของโพสต์ที่ดีที่สุด เพื่อเพิ่ม Conversion Rate`,
  ];

  return {
    summary: `จากข้อมูล ${rows.length} Ad Sets ในงบประมาณรวม ฿${fmtTHB(totals.totalSpend)} เข้าถึงผู้ชม ${fmt(totals.totalReach)} คน (${fmt(totals.totalImpressions)} Impressions) ต้นทุนต่อ 1,000 Impressions เฉลี่ย ฿${totals.avgCPM.toFixed(2)} และ CTR รวม ${fmtPct(totals.avgCTR)}`,
    best: `"${shortLabel(bestEngage.adSet, 30)}" — มีส่วนร่วมสูงสุด ${fmt(bestEngage.engagement)} interactions`,
    worst: lowestCTR ? `"${shortLabel(lowestCTR.adSet, 30)}" — CTR ต่ำสุดเพียง ${fmtPct(lowestCTR.ctr)}` : "",
    bestRow: bestEngage ?? null,
    worstRow: lowestCTR ?? null,
    insights,
    goals,
  };
}

// ─── Calc Totals ──────────────────────────────────────────────────────────────
function calcTotals(rows: AdRow[]) {
  const totalSpend      = rows.reduce((s, r) => s + r.spend, 0);
  const totalReach      = rows.reduce((s, r) => s + r.reach, 0);
  const totalImpressions = rows.reduce((s, r) => s + r.impressions, 0);
  const totalEngagement = rows.reduce((s, r) => s + r.engagement, 0);
  const avgCPM          = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
  const avgCTR          = rows.filter(r => r.ctr > 0).reduce((s, r) => s + r.ctr, 0) / (rows.filter(r => r.ctr > 0).length || 1);
  const avgCostResult   = rows.filter(r => r.costPerResult > 0).reduce((s, r) => s + r.costPerResult, 0) / (rows.filter(r => r.costPerResult > 0).length || 1);
  return { totalSpend, totalReach, totalImpressions, totalEngagement, avgCPM, avgCTR, avgCostResult };
}

// ─── Metric Card ──────────────────────────────────────────────────────────────
function MetricCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 flex items-start gap-3 shadow-sm">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-black leading-tight">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Drop Zone ────────────────────────────────────────────────────────────────
function DropZone({ onFile }: { onFile: (buf: ArrayBuffer, name: string) => void }) {
  const [drag, setDrag] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.name.match(/\.xlsx?$/i)) { toast.error("รองรับเฉพาะไฟล์ .xlsx / .xls เท่านั้น"); return; }
    const reader = new FileReader();
    reader.onload = e => e.target?.result && onFile(e.target.result as ArrayBuffer, file.name);
    reader.readAsArrayBuffer(file);
  };

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
      onClick={() => ref.current?.click()}
      className={`rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition-all ${
        drag ? "border-violet-500 bg-violet-50 dark:bg-violet-950/20 scale-[1.01]" : "border-border hover:border-violet-400 hover:bg-muted/40"
      }`}
    >
      <input ref={ref} type="file" accept=".xlsx,.xls" hidden onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
        <FileSpreadsheet className="w-8 h-8 text-white" />
      </div>
      <p className="font-bold text-lg">ลาก Excel มาวางที่นี่</p>
      <p className="text-sm text-muted-foreground mt-1">หรือคลิกเพื่อเลือกไฟล์ (.xlsx / .xls)</p>
      <p className="text-xs text-muted-foreground mt-3 opacity-70">รองรับ Meta Business Suite → Ads Reporting Export</p>
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border bg-popover shadow-lg p-3 text-sm max-w-[220px]">
      <p className="font-semibold text-xs mb-1 line-clamp-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="text-xs">
          {p.name}: <span className="font-bold">{typeof p.value === "number" && p.value > 100 ? fmt(p.value) : p.value?.toFixed ? p.value.toFixed(2) : p.value}</span>
        </p>
      ))}
    </div>
  );
}

// ─── Creative Card ────────────────────────────────────────────────────────────
function CreativeCard({ row, imageUrl, fetching }: {
  row: AdRow;
  imageUrl?: string;
  fetching?: boolean;
}) {
  return (
    <div className="rounded-2xl border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
      {/* Image area */}
      <div className="relative aspect-square bg-muted/40 overflow-hidden">
        {imageUrl ? (
          <>
            <img src={imageUrl} alt={row.adSet} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            {/* Metrics overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 gap-1">
              <div className="flex gap-2 flex-wrap">
                <span className="text-[10px] font-bold bg-violet-600/90 text-white px-2 py-0.5 rounded-full">฿{row.spend.toLocaleString()}</span>
                <span className="text-[10px] font-bold bg-blue-600/90 text-white px-2 py-0.5 rounded-full">{fmt(row.reach)} Reach</span>
                {row.ctr > 0 && <span className="text-[10px] font-bold bg-emerald-600/90 text-white px-2 py-0.5 rounded-full">CTR {row.ctr.toFixed(1)}%</span>}
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground/40">
            {fetching ? (
              <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
            ) : (
              <ImageOff className="w-8 h-8" />
            )}
          </div>
        )}
        {/* Status badge */}
        <div className="absolute top-2 left-2">
          {(() => {
            const st = STATUS_LABEL[row.status];
            return st ? (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${st.color}`}>{st.label}</span>
            ) : null;
          })()}
        </div>
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <p className="font-semibold text-xs leading-tight line-clamp-2">{row.adSet}</p>
        <p className="text-[10px] text-muted-foreground line-clamp-1">{row.campaign}</p>
        {/* Key metrics row */}
        <div className="grid grid-cols-3 gap-1 pt-1 border-t">
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">งบ</p>
            <p className="text-xs font-bold text-violet-700">฿{row.spend >= 1000 ? `${(row.spend/1000).toFixed(1)}K` : row.spend.toFixed(0)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">CTR</p>
            <p className={`text-xs font-bold ${row.ctr >= 2 ? "text-emerald-600" : row.ctr >= 1 ? "text-amber-600" : "text-red-500"}`}>
              {row.ctr > 0 ? `${row.ctr.toFixed(1)}%` : "—"}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">Engage</p>
            <p className="text-xs font-bold text-orange-600">{fmt(row.engagement)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdsDashboard() {
  const user     = useNavigate();
  const currentUser = useCurrentUser();
  const navigate = user;

  const [rows,      setRows]      = useState<AdRow[]>([]);
  const [fileName,  setFileName]  = useState<string>("");
  const [view,      setView]      = useState<"dashboard" | "list" | "creatives">("dashboard");
  const [sortKey,   setSortKey]   = useState<keyof AdRow>("spend");
  const [sortDir,   setSortDir]   = useState<"asc" | "desc">("desc");
  const [analysisOpen,  setAnalysisOpen]  = useState(true);
  const [settingsOpen,  setSettingsOpen]  = useState(false);

  // ── Ad Creative Images: adSet name → image URL (from Meta API) ──────────────
  const [adImages,     setAdImages]     = useState<Record<string, string>>({});

  // ── Meta API Settings (persisted in localStorage) ───────────────────────────
  const [accessToken,  setAccessToken]  = useState<string>(() => localStorage.getItem("meta-access-token") ?? "");
  const [tokenInput,   setTokenInput]   = useState<string>("");
  const [fetchingMeta, setFetchingMeta] = useState(false);
  const [metaFetchDone, setMetaFetchDone] = useState(false);

  // ── Cross-device persistence state ──────────────────────────────────────────
  const [savedReports,   setSavedReports]   = useState<{ id: string; fileName: string; uploadedAt: string }[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [savingReport,   setSavingReport]   = useState(false);

  // ── Load Token + saved reports on mount (Supabase → localStorage fallback) ──
  useEffect(() => {
    // 1. Instant local fallback
    const saved = localStorage.getItem("meta-access-token");
    if (saved) { setAccessToken(saved); setTokenInput(saved); }

    if (SUPABASE_ENABLED && supabase) {
      // 2. Authoritative token from Supabase (overrides local if present)
      supabase
        .from("site_settings")
        .select("payload")
        .eq("id", "marketing")
        .single()
        .then(({ data }) => {
          const t = data?.payload?.meta_access_token as string | undefined;
          if (t) {
            setAccessToken(t);
            setTokenInput(t);
            localStorage.setItem("meta-access-token", t);
          }
        });

      // 3. Load saved reports list
      setLoadingReports(true);
      supabase
        .from("ads_reports")
        .select("id, file_name, uploaded_at")
        .order("uploaded_at", { ascending: false })
        .limit(10)
        .then(({ data }) => {
          if (data) setSavedReports(data.map(r => ({ id: r.id, fileName: r.file_name, uploadedAt: r.uploaded_at })));
          setLoadingReports(false);
        });
    }
  }, []);

  // ── Clear token from everywhere ─────────────────────────────────────────────
  const clearToken = useCallback(async () => {
    setTokenInput("");
    localStorage.removeItem("meta-access-token");
    setAccessToken("");
    if (SUPABASE_ENABLED && supabase) {
      await supabase
        .from("site_settings")
        .upsert(
          { id: "marketing", payload: { meta_access_token: "" }, updated_at: new Date().toISOString() },
          { onConflict: "id" }
        );
    }
    toast.success("ล้าง Token แล้ว");
  }, []);

  // ── Save token to Supabase + localStorage ────────────────────────────────────
  const saveToken = useCallback(async () => {
    const t = tokenInput.trim();
    localStorage.setItem("meta-access-token", t);
    setAccessToken(t);
    if (SUPABASE_ENABLED && supabase) {
      await supabase
        .from("site_settings")
        .upsert(
          { id: "marketing", payload: { meta_access_token: t }, updated_at: new Date().toISOString() },
          { onConflict: "id" }
        );
    }
    toast.success(t ? "บันทึก Access Token แล้ว ✅ (ทุกเครื่อง)" : "ล้าง Token แล้ว");
    setSettingsOpen(false);
  }, [tokenInput]);

  // ── Load a saved report from Supabase ────────────────────────────────────────
  const loadReport = useCallback(async (reportId: string, name: string) => {
    if (!SUPABASE_ENABLED || !supabase) return;
    const { data, error } = await supabase
      .from("ads_reports")
      .select("rows_json")
      .eq("id", reportId)
      .single();
    if (error || !data) { toast.error("โหลดรายงานไม่สำเร็จ"); return; }
    setRows(data.rows_json as AdRow[]);
    setFileName(name);
    setMetaFetchDone(false);
    toast.success(`โหลด "${name}" สำเร็จ ✅`);
  }, []);

  // ── Delete a saved report ────────────────────────────────────────────────────
  const deleteReport = useCallback(async (reportId: string) => {
    if (!SUPABASE_ENABLED || !supabase) return;
    const { error } = await supabase.from("ads_reports").delete().eq("id", reportId);
    if (!error) {
      setSavedReports(prev => prev.filter(r => r.id !== reportId));
      toast.success("ลบรายงานแล้ว");
    }
  }, []);

  // Check if any row has IDs
  const hasIds = useMemo(() =>
    rows.some(r => r.adId || r.adSetId), [rows]);

  // Auto-fetch after Excel upload if token + IDs available
  useEffect(() => {
    if (rows.length > 0 && hasIds && accessToken && !metaFetchDone) {
      fetchMetaImages();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, hasIds, accessToken]);

  // ── Fetch thumbnails from Meta API ──────────────────────────────────────────
  const fetchMetaImages = useCallback(async () => {
    if (!accessToken) { toast.error("กรุณาตั้งค่า Access Token ก่อน"); setSettingsOpen(true); return; }
    if (!hasIds) { toast.error("ไม่พบ Ad ID / Ad Set ID ในไฟล์ — Export Excel ใหม่พร้อมคอลัมน์ ID"); return; }

    setFetchingMeta(true);
    setMetaFetchDone(false);
    let fetched = 0;
    let failed  = 0;
    const images: Record<string, string> = {};

    for (const row of rows) {
      const id = row.adId || row.adSetId;
      if (!id) continue;
      const isAdSet = !row.adId && !!row.adSetId;
      const url = await fetchAdThumbnail(id, accessToken, isAdSet);
      if (url) { images[row.adSet] = url; fetched++; }
      else failed++;
    }

    setAdImages(prev => ({ ...prev, ...images }));
    setFetchingMeta(false);
    setMetaFetchDone(true);

    if (fetched > 0) toast.success(`ดึงรูป Creative สำเร็จ ${fetched} รายการ 🎉`);
    if (failed > 0 && fetched === 0) toast.error("ดึงรูปไม่สำเร็จ — ตรวจสอบ Access Token และสิทธิ์ ads_read");
    else if (failed > 0) toast.warning(`ดึงไม่ได้ ${failed} รายการ (อาจหมดอายุหรือสิทธิ์ไม่ครบ)`);
  }, [rows, accessToken, hasIds]);

  if (!currentUser) { navigate("/login"); return null; }

  // ── Load File (+ save to Supabase for cross-device access) ─────────────────
  const handleFile = useCallback(async (buf: ArrayBuffer, name: string) => {
    try {
      const parsed = parseExcel(buf);
      if (!parsed.length) { toast.error("ไม่พบข้อมูล Ad Sets — ตรวจสอบ format ไฟล์"); return; }
      setRows(parsed);
      setFileName(name);
      toast.success(`โหลดข้อมูล ${parsed.length} Ad Sets สำเร็จ`);

      if (SUPABASE_ENABLED && supabase) {
        setSavingReport(true);
        const { data: inserted, error } = await supabase
          .from("ads_reports")
          .insert({
            file_name:   name,
            uploaded_by: currentUser?.email ?? "unknown",
            rows_json:   parsed,
          })
          .select("id, file_name, uploaded_at")
          .single();
        setSavingReport(false);
        if (!error && inserted) {
          toast.success("บันทึกรายงานไปยัง Cloud แล้ว ☁️");
          setSavedReports(prev =>
            [{ id: inserted.id, fileName: inserted.file_name, uploadedAt: inserted.uploaded_at }, ...prev].slice(0, 10)
          );
        }
      }
    } catch (e) {
      toast.error("อ่านไฟล์ไม่ได้ — ลองส่งออกใหม่จาก Meta Business Suite");
    }
  }, [currentUser]);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const totals   = useMemo(() => calcTotals(rows), [rows]);
  const analysis = useMemo(() => generateAnalysis(rows, totals), [rows, totals]);

  // Sorted rows for table
  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const av = a[sortKey] as number | string;
      const bv = b[sortKey] as number | string;
      if (typeof av === "number" && typeof bv === "number") return sortDir === "desc" ? bv - av : av - bv;
      return sortDir === "desc" ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv));
    });
  }, [rows, sortKey, sortDir]);

  // Chart data
  const spendData = useMemo(() =>
    [...rows].sort((a, b) => b.spend - a.spend).map(r => ({
      name: shortLabel(r.adSet),
      "งบที่ใช้": r.spend,
      "Reach": r.reach / 1000,
    })), [rows]);

  const ctrData = useMemo(() =>
    [...rows].filter(r => r.ctr > 0).sort((a, b) => b.ctr - a.ctr).map(r => ({
      name: shortLabel(r.adSet),
      "CTR (%)": +r.ctr.toFixed(2),
      "CPM": +r.cpm.toFixed(2),
    })), [rows]);

  const engageData = useMemo(() =>
    [...rows].sort((a, b) => b.engagement - a.engagement).map(r => ({
      name: shortLabel(r.adSet),
      "Engagement": r.engagement,
    })), [rows]);

  // Campaign pie data
  const campaignData = useMemo(() => {
    const map: Record<string, number> = {};
    rows.forEach(r => { map[r.campaign] = (map[r.campaign] || 0) + r.spend; });
    return Object.entries(map).map(([name, value]) => ({
      name: shortLabel(name, 20), value: +value.toFixed(2),
    })).sort((a, b) => b.value - a.value);
  }, [rows]);

  // Performance comparison — Top 5 by spend, normalized 0–100
  const perfCompareData = useMemo(() => {
    if (!rows.length) return [];
    const top5 = [...rows].sort((a, b) => b.spend - a.spend).slice(0, 5);
    const maxSpend  = Math.max(...top5.map(r => r.spend));
    const maxReach  = Math.max(...top5.map(r => r.reach));
    const maxCTR    = Math.max(...top5.map(r => r.ctr));
    const maxEngage = Math.max(...top5.map(r => r.engagement));
    return top5.map(r => ({
      name:          shortLabel(r.adSet, 14),
      "งบที่ใช้":   maxSpend  ? Math.round(r.spend      / maxSpend  * 100) : 0,
      "Reach":       maxReach  ? Math.round(r.reach      / maxReach  * 100) : 0,
      "CTR":         maxCTR    ? Math.round(r.ctr        / maxCTR    * 100) : 0,
      "Engagement":  maxEngage ? Math.round(r.engagement / maxEngage * 100) : 0,
    }));
  }, [rows]);

  const toggleSort = (k: keyof AdRow) => {
    if (sortKey === k) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortKey(k); setSortDir("desc"); }
  };
  const SortIcon = ({ k }: { k: keyof AdRow }) =>
    sortKey === k ? (sortDir === "desc" ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />) : <Minus className="w-3 h-3 opacity-30" />;

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (!rows.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-violet-50/30 to-background dark:via-violet-950/10">
        <StandaloneHeader backTo="/" />
        <main className="max-w-2xl mx-auto px-4 py-10">
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mx-auto mb-5 shadow-xl">
              <BarChart2 className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-black">Ads Dashboard</h1>
            <p className="text-muted-foreground mt-2 text-sm">วิเคราะห์ผล Meta Ads จากไฟล์ Excel Export — กราฟ + AI วิเคราะห์</p>

            {/* Token button — visible before upload */}
            <div className="mt-4 flex justify-center">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSettingsOpen(o => !o)}
                className={`gap-1.5 ${accessToken ? "border-emerald-400 text-emerald-600" : "border-amber-400 text-amber-600"}`}
              >
                <Key className="w-3.5 h-3.5" />
                {accessToken ? "Token ✓ (บันทึกแล้ว)" : "ตั้งค่า Meta Access Token"}
              </Button>
            </div>
          </div>

          {/* Settings panel — shown when settingsOpen */}
          {settingsOpen && (
            <div className="rounded-2xl border bg-card shadow-sm p-5 space-y-4 mb-6">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-violet-500" /> Meta API Settings
                </h3>
                <button onClick={() => setSettingsOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Facebook Access Token</label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      placeholder="EAA..."
                      value={tokenInput}
                      onChange={e => setTokenInput(e.target.value)}
                      className="flex-1 h-9 rounded-lg border bg-background px-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                    <Button size="sm" onClick={saveToken} disabled={!tokenInput.trim()} className="bg-violet-600 text-white border-0">บันทึก</Button>
                    {accessToken && (
                      <Button size="sm" variant="outline" onClick={clearToken} className="text-rose-600 border-rose-300">ลบ</Button>
                    )}
                  </div>
                  {accessToken && (
                    <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Token บันทึกแล้ว — {accessToken.slice(0,8)}...
                    </p>
                  )}
                </div>
                <div className="rounded-xl bg-muted/50 p-3 text-xs space-y-1.5 text-muted-foreground">
                  <p className="font-semibold text-foreground flex items-center gap-1"><Info className="w-3.5 h-3.5 text-blue-500" /> วิธีดึง Access Token</p>
                  <p>1. ไปที่ <strong>developers.facebook.com/tools/explorer</strong></p>
                  <p>2. เลือก App ของคุณ → กด <strong>Generate Access Token</strong></p>
                  <p>3. เลือก Permission: <strong>ads_read</strong></p>
                  <p>4. Copy token แล้ววางในช่องด้านบน</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Saved Reports from Cloud ── */}
          {SUPABASE_ENABLED && (loadingReports || savedReports.length > 0) && (
            <div className="rounded-2xl border bg-card shadow-sm p-5 space-y-3 mb-6">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Database className="w-4 h-4 text-violet-500" /> รายงานที่บันทึกไว้ (ทุกเครื่อง)
                </h3>
                {loadingReports && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
              </div>
              {savedReports.length === 0 && !loadingReports && (
                <p className="text-xs text-muted-foreground">ยังไม่มีรายงานที่บันทึก</p>
              )}
              <div className="space-y-2">
                {savedReports.map(r => (
                  <div key={r.id} className="flex items-center gap-3 rounded-xl border bg-muted/30 px-3 py-2.5 hover:bg-muted/50 transition-colors group">
                    <FileSpreadsheet className="w-4 h-4 text-violet-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{r.fileName}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {new Date(r.uploadedAt).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => loadReport(r.id, r.fileName)}
                      className="text-xs gap-1.5 text-violet-700 border-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/30 shrink-0"
                    >
                      <Database className="w-3 h-3" /> โหลด
                    </Button>
                    <button
                      onClick={() => deleteReport(r.id)}
                      className="text-rose-300 hover:text-rose-600 transition-colors p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 shrink-0 opacity-0 group-hover:opacity-100"
                      title="ลบรายงาน"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DropZone onFile={handleFile} />
          <div className="mt-8 rounded-2xl border bg-card p-5">
            <p className="font-bold text-sm mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" /> วิธีส่งออกข้อมูลจาก Meta Business Suite
            </p>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li>1. เข้า Meta Business Suite → Ads Manager</li>
              <li>2. เลือก Ad Sets ที่ต้องการ → กด <strong>Export</strong></li>
              <li>3. เลือก Format: <strong>Excel (.xlsx)</strong></li>
              <li>4. ดาวน์โหลดแล้วลากมาวางในกล่องด้านบน</li>
            </ol>
          </div>
        </main>
      </div>
    );
  }

  // ── Dashboard ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-violet-50/20 to-background dark:via-violet-950/10">
      <StandaloneHeader backTo="/" />
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 pb-20 pt-5 space-y-6">

        {/* ── Top bar ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-violet-600" /> Ads Dashboard
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              {fileName} — {rows.length} Ad Sets
              {hasIds && <span className="text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> มี Ad ID</span>}
              {savingReport && <span className="text-violet-500 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> กำลังบันทึก...</span>}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* Auto-fetch button */}
            {hasIds && (
              <Button
                size="sm"
                onClick={fetchMetaImages}
                disabled={fetchingMeta}
                className="gap-1.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white border-0"
              >
                {fetchingMeta
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> กำลังดึงรูป...</>
                  : metaFetchDone
                  ? <><CheckCircle2 className="w-3.5 h-3.5" /> ดึงรูปแล้ว</>
                  : <><Zap className="w-3.5 h-3.5" /> ดึงรูปอัตโนมัติ</>
                }
              </Button>
            )}
            {/* Settings button */}
            <Button size="sm" variant="outline" onClick={() => setSettingsOpen(o => !o)} className={`gap-1.5 ${accessToken ? "border-emerald-400 text-emerald-700" : "border-amber-400 text-amber-700"}`}>
              <Key className="w-3.5 h-3.5" />
              {accessToken ? "Token ✓" : "ตั้งค่า Token"}
            </Button>
            <div className="flex rounded-xl border overflow-hidden">
              <button onClick={() => setView("dashboard")} className={`px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-colors ${view === "dashboard" ? "bg-violet-600 text-white" : "hover:bg-muted"}`}>
                <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
              </button>
              <button onClick={() => setView("creatives")} className={`px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-colors ${view === "creatives" ? "bg-violet-600 text-white" : "hover:bg-muted"}`}>
                <Images className="w-3.5 h-3.5" /> Creatives
                {Object.keys(adImages).length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-orange-500 text-white text-[9px] flex items-center justify-center font-bold">
                    {Object.keys(adImages).length}
                  </span>
                )}
              </button>
              <button onClick={() => setView("list")} className={`px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-colors ${view === "list" ? "bg-violet-600 text-white" : "hover:bg-muted"}`}>
                <List className="w-3.5 h-3.5" /> รายการ
              </button>
            </div>
            <Button size="sm" variant="outline" onClick={() => { setRows([]); setFileName(""); setMetaFetchDone(false); }} className="gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> โหลดใหม่
            </Button>
          </div>
        </div>

        {/* ── Meta API Settings Panel ── */}
        {settingsOpen && (
          <div className="rounded-2xl border bg-card shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-violet-500" /> Meta API Settings
              </h3>
              <button onClick={() => setSettingsOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* How to get token */}
            <div className="rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-700/40 p-4 space-y-2">
              <p className="text-xs font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" /> วิธีรับ Access Token
              </p>
              <ol className="text-xs text-blue-800 dark:text-blue-300 space-y-1.5 list-decimal list-inside">
                <li>เปิด <a href="https://business.facebook.com/settings/system-users" target="_blank" rel="noreferrer" className="underline font-semibold">Meta Business Suite → Settings → System Users</a></li>
                <li>สร้าง System User → คลิก <strong>Generate New Token</strong></li>
                <li>เลือก App ของคุณ → เปิดสิทธิ์ <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">ads_read</code> และ <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">ads_management</code></li>
                <li>Copy Token มาวางด้านล่าง</li>
              </ol>
              <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1">
                💡 แนะนำ System User Token เพราะไม่หมดอายุ (ต่างจาก User Token ที่หมดใน 60 วัน)
              </p>
            </div>

            {/* How to export Excel with IDs */}
            <div className="rounded-xl bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-700/40 p-4 space-y-2">
              <p className="text-xs font-bold text-violet-700 dark:text-violet-400 flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5" /> Export Excel พร้อม Ad ID
              </p>
              <ol className="text-xs text-violet-800 dark:text-violet-300 space-y-1.5 list-decimal list-inside">
                <li>เปิด Meta Ads Manager → เลือก Campaign / Ad Set ที่ต้องการ</li>
                <li>คลิก <strong>Columns → Customize Columns</strong></li>
                <li>ค้นหา <strong>"รหัสชุดโฆษณา"</strong> (Ad Set ID) และ <strong>"รหัสโฆษณา"</strong> (Ad ID) → เพิ่มเข้า</li>
                <li>คลิก <strong>Export → Excel (.xlsx)</strong></li>
                <li>อัปโหลดไฟล์ใหม่ → ระบบจะดึงรูปให้อัตโนมัติ</li>
              </ol>
            </div>

            {/* Token input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Facebook Access Token</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={tokenInput}
                  onChange={e => setTokenInput(e.target.value)}
                  placeholder="EAAxxxxxxxxxxxxxxx..."
                  className="flex-1 rounded-lg border bg-background px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
                <Button size="sm" onClick={saveToken} className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white">
                  <Key className="w-3.5 h-3.5" /> บันทึก
                </Button>
                {accessToken && (
                  <Button size="sm" variant="outline" onClick={clearToken}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
              {accessToken && (
                <p className="text-[11px] text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Token บันทึกแล้ว — {accessToken.slice(0,8)}...
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── No-ID Warning (when token set but file has no IDs) ── */}
        {accessToken && rows.length > 0 && !hasIds && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <span className="font-semibold text-amber-800 dark:text-amber-400">ไม่พบ Ad ID ในไฟล์นี้</span>
              <span className="text-amber-700 dark:text-amber-500 ml-1">Export Excel ใหม่โดยเพิ่มคอลัมน์ "รหัสชุดโฆษณา" หรือ "รหัสโฆษณา" — ดูคำแนะนำใน Settings</span>
              <button onClick={() => setSettingsOpen(true)} className="ml-2 text-xs font-semibold text-amber-700 underline">ดูวิธี →</button>
            </div>
          </div>
        )}

        {/* ── Metric cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <MetricCard icon={DollarSign}        label="งบที่ใช้ทั้งหมด"  value={`฿${fmtTHB(totals.totalSpend)}`}       sub="THB"                    color="bg-violet-500/10 text-violet-600 ring-1 ring-violet-200" />
          <MetricCard icon={Users}             label="Reach รวม"        value={fmt(totals.totalReach)}                 sub="คนที่เห็นโฆษณา"          color="bg-blue-500/10 text-blue-600 ring-1 ring-blue-200" />
          <MetricCard icon={Eye}               label="Impressions"      value={fmt(totals.totalImpressions)}           sub="ครั้งที่แสดง"            color="bg-sky-500/10 text-sky-600 ring-1 ring-sky-200" />
          <MetricCard icon={MousePointerClick} label="CTR เฉลี่ย"       value={fmtPct(totals.avgCTR)}                  sub="Click-Through Rate"     color="bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-200" />
          <MetricCard icon={TrendingUp}        label="CPM เฉลี่ย"       value={`฿${totals.avgCPM.toFixed(2)}`}         sub="ต่อ 1,000 Impressions"  color="bg-amber-500/10 text-amber-600 ring-1 ring-amber-200" />
          <MetricCard icon={Flame}             label="Engagement รวม"   value={fmt(totals.totalEngagement)}            sub="Interactions"           color="bg-orange-500/10 text-orange-600 ring-1 ring-orange-200" />
        </div>

        {view === "dashboard" ? (
          <>
            {/* ── Charts row 1 ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

              {/* Spend + Reach bar */}
              <div className="rounded-2xl border bg-card p-5 shadow-sm">
                <h3 className="font-bold text-sm mb-1 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-violet-500" /> งบที่ใช้ vs Reach
                </h3>
                <p className="text-xs text-muted-foreground mb-4">เปรียบเทียบงบ (฿) และ Reach (พัน) ต่อ Ad Set</p>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={spendData} margin={{ bottom: 40, left: 4, right: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} angle={-30} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    <Bar dataKey="งบที่ใช้" fill="#7c3aed" radius={[4,4,0,0]} maxBarSize={32} />
                    <Bar dataKey="Reach"    fill="#38bdf8" radius={[4,4,0,0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* CTR + CPM bar */}
              <div className="rounded-2xl border bg-card p-5 shadow-sm">
                <h3 className="font-bold text-sm mb-1 flex items-center gap-2">
                  <MousePointerClick className="w-4 h-4 text-emerald-500" /> CTR (%) vs CPM (฿)
                </h3>
                <p className="text-xs text-muted-foreground mb-4">ประสิทธิภาพ Click-Through Rate และต้นทุนต่อพัน Impression</p>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={ctrData} margin={{ bottom: 40, left: 4, right: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} angle={-30} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    <Bar dataKey="CTR (%)" fill="#10b981" radius={[4,4,0,0]} maxBarSize={32} />
                    <Bar dataKey="CPM"     fill="#f59e0b" radius={[4,4,0,0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ── Charts row 2 ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

              {/* Engagement horizontal bar */}
              <div className="rounded-2xl border bg-card p-5 shadow-sm lg:col-span-2">
                <h3 className="font-bold text-sm mb-1 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-500" /> Engagement per Ad Set
                </h3>
                <p className="text-xs text-muted-foreground mb-4">Interactions รวมของแต่ละ Ad Set</p>
                <ResponsiveContainer width="100%" height={Math.max(220, engageData.length * 28)}>
                  <BarChart data={engageData} layout="vertical" margin={{ left: 8, right: 48, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "#64748b" }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: "#64748b" }} width={120} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="Engagement" radius={[0,4,4,0]} maxBarSize={22}>
                      {engageData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      <LabelList dataKey="Engagement" position="right" style={{ fontSize: 10, fill: "#64748b" }}
                        formatter={(v: number) => fmt(v)} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Campaign budget pie */}
              <div className="rounded-2xl border bg-card p-5 shadow-sm">
                <h3 className="font-bold text-sm mb-1 flex items-center gap-2">
                  <Target className="w-4 h-4 text-pink-500" /> สัดส่วนงบ
                </h3>
                <p className="text-xs text-muted-foreground mb-3">งบรวมจำแนกตามแคมเปญ</p>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={campaignData} cx="50%" cy="50%" outerRadius={72} innerRadius={32} dataKey="value"
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                      {campaignData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => `฿${fmtTHB(v)}`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 space-y-1.5">
                  {campaignData.slice(0, 5).map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px]">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="flex-1 truncate text-muted-foreground">{d.name}</span>
                      <span className="font-semibold shrink-0">฿{d.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Performance Comparison — Grouped Bar ── */}
            {perfCompareData.length >= 2 && (
              <div className="rounded-2xl border bg-card p-5 shadow-sm">
                <h3 className="font-bold text-sm mb-1 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-500" /> เปรียบเทียบ Performance — Top 5 Ad Sets
                </h3>
                <p className="text-xs text-muted-foreground mb-4">คะแนนเต็ม 100 (normalized เทียบ Ad Set ที่ดีที่สุดในแต่ละตัวชี้วัด)</p>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={perfCompareData} margin={{ bottom: 40, left: 4, right: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} angle={-25} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 10, fill: "#64748b" }} domain={[0, 100]} unit="%" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
                    <Bar dataKey="งบที่ใช้"  fill="#7c3aed" radius={[3,3,0,0]} maxBarSize={18} />
                    <Bar dataKey="Reach"      fill="#0ea5e9" radius={[3,3,0,0]} maxBarSize={18} />
                    <Bar dataKey="CTR"        fill="#10b981" radius={[3,3,0,0]} maxBarSize={18} />
                    <Bar dataKey="Engagement" fill="#f59e0b" radius={[3,3,0,0]} maxBarSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        ) : view === "creatives" ? (
          /* ── Creatives View ── */
          <div className="space-y-4">
            {/* Info bar */}
            {!metaFetchDone && !fetchingMeta && hasIds && (
              <div className="rounded-xl border bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-700/40 px-4 py-3 flex items-center gap-3">
                <Zap className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="text-sm text-blue-700 dark:text-blue-400">กดปุ่ม <strong>"ดึงรูปอัตโนมัติ"</strong> ในแถบด้านบน เพื่อดึงรูป Creative จาก Meta API</span>
              </div>
            )}
            {fetchingMeta && (
              <div className="rounded-xl border bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-700/40 px-4 py-3 flex items-center gap-3">
                <Loader2 className="w-4 h-4 text-violet-600 animate-spin shrink-0" />
                <span className="text-sm text-violet-700 dark:text-violet-400">กำลังดึงรูป Creative จาก Meta API...</span>
              </div>
            )}
            {metaFetchDone && (
              <div className="rounded-xl border bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-700/40 px-4 py-3 flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-sm text-emerald-700 dark:text-emerald-400">
                  ดึงรูปสำเร็จ {Object.keys(adImages).length} รายการ — hover ที่การ์ดเพื่อดู metrics
                </span>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {[...rows].sort((a, b) => b.spend - a.spend).map((row, i) => (
                <CreativeCard
                  key={i}
                  row={row}
                  imageUrl={adImages[row.adSet]}
                  fetching={fetchingMeta}
                />
              ))}
            </div>
          </div>

        ) : (
          /* ── List View ── */
          <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/60 border-b">
                    {([
                      ["adSet",        "Ad Set / รูป"],
                      ["status",       "สถานะ"],
                      ["spend",        "งบ (฿)"],
                      ["reach",        "Reach"],
                      ["impressions",  "Impr."],
                      ["ctr",          "CTR %"],
                      ["cpm",          "CPM ฿"],
                      ["engagement",   "Engage"],
                      ["costPerResult","CPR ฿"],
                    ] as [keyof AdRow, string][]).map(([k, label]) => (
                      <th key={k} className="px-3 py-2.5 text-left font-semibold text-muted-foreground cursor-pointer hover:text-foreground select-none whitespace-nowrap" onClick={() => toggleSort(k)}>
                        <span className="flex items-center gap-1">{label} <SortIcon k={k} /></span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((r, i) => {
                    const st = STATUS_LABEL[r.status] ?? { label: r.status, color: "bg-muted text-muted-foreground border-border" };
                    return (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2.5 max-w-[220px]">
                          <div className="flex items-center gap-2">
                            {/* Thumbnail from Meta API */}
                            <div className="w-10 h-10 rounded-lg bg-muted shrink-0 overflow-hidden border">
                              {adImages[r.adSet] ? (
                                <img src={adImages[r.adSet]} alt="" className="w-full h-full object-cover" />
                              ) : fetchingMeta ? (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                                </div>
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                                  <ImageOff className="w-4 h-4" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold truncate">{shortLabel(r.adSet, 20)}</p>
                              <p className="text-muted-foreground text-[10px] truncate">{shortLabel(r.campaign, 18)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${st.color}`}>{st.label}</span>
                        </td>
                        <td className="px-3 py-2.5 font-semibold text-violet-700 whitespace-nowrap">{fmtTHB(r.spend)}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap">{fmt(r.reach)}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap">{fmt(r.impressions)}</td>
                        <td className="px-3 py-2.5 font-semibold whitespace-nowrap">
                          <span className={r.ctr >= 2 ? "text-emerald-600" : r.ctr >= 1 ? "text-amber-600" : "text-red-500"}>
                            {fmtPct(r.ctr)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">{r.cpm.toFixed(2)}</td>
                        <td className="px-3 py-2.5 font-semibold whitespace-nowrap">{fmt(r.engagement)}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap">{r.costPerResult > 0 ? r.costPerResult.toFixed(2) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── AI Analysis ── */}
        <div className="rounded-2xl border bg-gradient-to-br from-violet-50/80 to-indigo-50/60 dark:from-violet-950/30 dark:to-indigo-950/20 shadow-sm overflow-hidden">
          {/* Header toggle */}
          <button
            onClick={() => setAnalysisOpen(o => !o)}
            className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-white/50 dark:hover:bg-white/5 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-md">
              <Lightbulb className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-sm">AI วิเคราะห์ผลโฆษณา & แนวทางปรับปรุง</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{analysis.summary}</p>
            </div>
            {analysisOpen ? <ChevronUp className="w-4 h-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />}
          </button>

          {analysisOpen && (
            <div className="border-t border-violet-200/50 dark:border-violet-700/30">

              {/* ── Section 1: Overview ── */}
              <div className="px-5 pt-5 pb-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-1 h-5 rounded-full bg-violet-500 block" />
                  <p className="font-bold text-sm text-violet-700 dark:text-violet-400">📊 สรุปภาพรวม</p>
                </div>
                <p className="text-sm leading-relaxed text-foreground/85 bg-white/60 dark:bg-white/5 rounded-xl px-4 py-3 border border-violet-200/50 dark:border-violet-700/30">
                  {analysis.summary}
                </p>
              </div>

              <div className="h-px bg-violet-200/40 dark:bg-violet-700/20 mx-5" />

              {/* ── Section 2: Best / Worst with Creative Image ── */}
              <div className="px-5 pt-4 pb-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-1 h-5 rounded-full bg-emerald-500 block" />
                  <p className="font-bold text-sm text-emerald-700 dark:text-emerald-400">🏆 Ad Set ที่โดดเด่น vs ต้องปรับปรุง</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Best */}
                  {analysis.bestRow && (
                    <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-700/40 p-4 flex gap-3">
                      {adImages[analysis.bestRow.adSet] && (
                        <img
                          src={adImages[analysis.bestRow.adSet]}
                          alt="Creative"
                          className="w-14 h-14 rounded-lg object-cover shrink-0 ring-2 ring-emerald-300"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 mb-1">
                          <ArrowUpRight className="w-3 h-3" /> ดีที่สุด
                        </p>
                        <p className="text-sm font-semibold leading-snug">{analysis.best}</p>
                        <div className="flex gap-3 mt-1.5">
                          <span className="text-[10px] text-emerald-700 font-medium">฿{analysis.bestRow.spend.toLocaleString()}</span>
                          <span className="text-[10px] text-blue-600 font-medium">{fmt(analysis.bestRow.reach)} Reach</span>
                          {analysis.bestRow.ctr > 0 && <span className="text-[10px] text-violet-600 font-medium">CTR {fmtPct(analysis.bestRow.ctr)}</span>}
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Worst */}
                  {analysis.worstRow && analysis.worst && (
                    <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-700/40 p-4 flex gap-3">
                      {adImages[analysis.worstRow.adSet] && (
                        <img
                          src={adImages[analysis.worstRow.adSet]}
                          alt="Creative"
                          className="w-14 h-14 rounded-lg object-cover shrink-0 ring-2 ring-red-300"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-red-700 dark:text-red-400 flex items-center gap-1 mb-1">
                          <ArrowDownRight className="w-3 h-3" /> ต้องปรับปรุง
                        </p>
                        <p className="text-sm font-semibold leading-snug">{analysis.worst}</p>
                        <div className="flex gap-3 mt-1.5">
                          <span className="text-[10px] text-red-700 font-medium">฿{analysis.worstRow.spend.toLocaleString()}</span>
                          <span className="text-[10px] text-blue-600 font-medium">{fmt(analysis.worstRow.reach)} Reach</span>
                          {analysis.worstRow.ctr > 0 && <span className="text-[10px] text-orange-600 font-medium">CTR {fmtPct(analysis.worstRow.ctr)}</span>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="h-px bg-violet-200/40 dark:bg-violet-700/20 mx-5" />

              {/* ── Section 3: Insights ── */}
              <div className="px-5 pt-4 pb-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-1 h-5 rounded-full bg-amber-500 block" />
                  <p className="font-bold text-sm text-amber-700 dark:text-amber-400">💡 Insights จากข้อมูล</p>
                </div>
                <div className="space-y-2">
                  {analysis.insights.map((ins, i) => (
                    <div key={i} className="flex gap-3 rounded-xl bg-white/70 dark:bg-white/5 border border-amber-100 dark:border-amber-800/30 px-4 py-3">
                      <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <p className="text-sm leading-relaxed">{ins}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-px bg-violet-200/40 dark:bg-violet-700/20 mx-5" />

              {/* ── Section 4: Goals ── */}
              <div className="px-5 pt-4 pb-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-1 h-5 rounded-full bg-indigo-500 block" />
                  <p className="font-bold text-sm text-indigo-700 dark:text-indigo-400">🎯 เป้าหมายและแนวทางต่อไป</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {analysis.goals.map((g, i) => (
                    <div key={i} className="flex gap-3 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-800/30 px-4 py-3">
                      <span className="w-5 h-5 rounded-full bg-indigo-200 dark:bg-indigo-800/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <p className="text-sm leading-relaxed">{g}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>

        {/* ── Upload new file ── */}
        <div className="rounded-2xl border bg-card p-4">
          <DropZone onFile={handleFile} />
        </div>

      </main>
    </div>
  );
}
