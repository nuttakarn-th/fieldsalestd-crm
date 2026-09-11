/**
 * MarketingOBLeads.tsx — OB Leads — Master-Detail layout v3
 *
 * Route: /marketing/ob-leads
 * Layout: Stats row → split pane (list left + detail right)
 *   · Left  — scrollable compact list, fills own height (no page scroll)
 *   · Right — selected lead full detail, uses remaining width
 */

import { useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search, Users2, Phone, Calendar, ChevronRight,
  CheckCircle2, XCircle, Clock, Sparkles,
  Mail, MapPin, User, Star, Banknote, Tag, FileText,
  ExternalLink, MessageCircle, Download,
} from "lucide-react";
import { toast } from "sonner";
import { exportToExcel, type ExcelField } from "@/lib/excelUtils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCRM, isClosedStatus, isLostStatus, type Customer, type Lead } from "@/store/crmStore";
import { useServices } from "@/store/serviceStore";
import { useActiveOBNames } from "@/store/authStore";

// ── Export fields ─────────────────────────────────────────────────────────────
const OB_EXPORT_FIELDS: ExcelField[] = [
  { key: "full_name",         header: "ชื่อ-นามสกุล",      required: true },
  { key: "phone",             header: "เบอร์โทรศัพท์",      required: true },
  { key: "line_id",           header: "Line ID" },
  { key: "email",             header: "อีเมล" },
  { key: "province",          header: "จังหวัด" },
  { key: "source",            header: "ช่องทางที่มา" },
  { key: "segment",           header: "กลุ่มลูกค้า" },
  { key: "customer_tier",     header: "Tier" },
  { key: "total_trips",       header: "จำนวนการซื้อ (ครั้ง)", type: "number" as const },
  { key: "total_spend",       header: "ยอดซื้อรวม (บาท)",    type: "number" as const },
  { key: "first_contact_date",header: "วันที่เพิ่มข้อมูล" },
  { key: "created_by",        header: "Sales ที่ดูแล" },
  { key: "lead_status",       header: "สถานะ Lead ล่าสุด" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function thaiDate(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso.includes("T") ? iso : iso + "T00:00:00");
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
}
function thaiDateTime(iso?: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
function thaiCurrency(n?: number | null) {
  if (!n) return null;
  return n.toLocaleString("th-TH") + " ฿";
}
function fmtMoney(n: number): string {
  if (!n) return "฿0";
  if (n >= 1_000_000) return `฿${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `฿${Math.round(n / 1_000)}K`;
  return `฿${n.toLocaleString("th-TH")}`;
}

const TH_MONTHS_SHORT = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];

/** "2026-09-25" or ISO datetime → "25 ก.ย. 69" */
function fmtThaiDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const datePart = dateStr.split("T")[0];
  const parts = datePart.split("-");
  if (parts.length < 3) return null;
  const [y, m, d] = parts;
  const monthIdx = parseInt(m, 10) - 1;
  if (monthIdx < 0 || monthIdx > 11) return null;
  const buddhistShort = String(parseInt(y, 10) + 543).slice(-2);
  return `${parseInt(d, 10)} ${TH_MONTHS_SHORT[monthIdx]} ${buddhistShort}`;
}

/** ISO datetime → "10.35 น." */
function fmtThaiTime(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}.${mm} น.`;
}

/** "2026-12" → "ธ.ค. 69" */
function fmtTravelMonth(ym: string | null | undefined): string | null {
  if (!ym) return null;
  const parts = ym.split("-");
  if (parts.length < 2) return null;
  const [y, m] = parts;
  const monthIdx = parseInt(m, 10) - 1;
  if (monthIdx < 0 || monthIdx > 11) return null;
  const buddhistShort = String(parseInt(y, 10) + 543).slice(-2);
  return `${TH_MONTHS_SHORT[monthIdx]} ${buddhistShort}`;
}

/** relative date: "X วันที่แล้ว" */
function fmtRelativeDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const diffMs = Date.now() - d.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return "วันนี้";
  if (days === 1) return "เมื่อวาน";
  if (days < 7) return `${days} วันที่แล้ว`;
  if (days < 30) return `${Math.floor(days / 7)} สัปดาห์ที่แล้ว`;
  if (days < 365) return `${Math.floor(days / 30)} เดือนที่แล้ว`;
  return `${Math.floor(days / 365)} ปีที่แล้ว`;
}

/** future date: "อีก X วัน" */
function fmtFutureDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const diffMs = d.getTime() - Date.now();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (days < 0) return `เกิน ${Math.abs(days)} วัน`;
  if (days === 0) return "วันนี้";
  if (days === 1) return "พรุ่งนี้";
  if (days < 7) return `อีก ${days} วัน`;
  if (days < 30) return `อีก ${Math.floor(days / 7)} สัปดาห์`;
  return `อีก ${Math.floor(days / 30)} เดือน`;
}

interface StatusMeta {
  label: string;
  color: string;
  bar: string;
  pill: string;
  group: "active" | "won" | "lost";
}

function statusMeta(status: string): StatusMeta {
  switch (status) {
    case "ใหม่":
      return { label: "ใหม่",           color: "text-slate-600",  bar: "bg-slate-400",   pill: "bg-slate-100 text-slate-600 border-slate-200",      group: "active" };
    case "ติดต่อแล้ว":
    case "ตอบแล้ว":
      return { label: "ติดต่อแล้ว",     color: "text-blue-600",   bar: "bg-blue-500",    pill: "bg-blue-100 text-blue-700 border-blue-200",          group: "active" };
    case "ส่ง Quote แล้ว":
      return { label: "ส่ง Quote",      color: "text-violet-600", bar: "bg-violet-500",  pill: "bg-violet-100 text-violet-700 border-violet-200",    group: "active" };
    case "กำลังเจรจา":
      return { label: "กำลังเจรจา",    color: "text-amber-600",  bar: "bg-amber-500",   pill: "bg-amber-100 text-amber-700 border-amber-200",       group: "active" };
    case "จองแล้ว":
      return { label: "จองแล้ว ✓",     color: "text-emerald-600",bar: "bg-emerald-500", pill: "bg-emerald-100 text-emerald-700 border-emerald-200", group: "won"    };
    case "ยกเลิก":
      return { label: "ยกเลิก",        color: "text-red-500",    bar: "bg-red-400",     pill: "bg-red-100 text-red-600 border-red-200",             group: "lost"   };
    default:
      return { label: status,           color: "text-muted-foreground", bar: "bg-muted-foreground", pill: "bg-muted text-muted-foreground border-border", group: "active" };
  }
}

function leadPriority(status: string): number {
  if (status === "กำลังเจรจา")      return 0;
  if (status === "ส่ง Quote แล้ว")   return 1;
  if (status === "ตอบแล้ว" || status === "ติดต่อแล้ว") return 2;
  if (status === "ใหม่")             return 3;
  if (isClosedStatus(status))        return 4;
  if (isLostStatus(status))          return 5;
  return 6;
}

// ── RFM Model ─────────────────────────────────────────────────────────────────

type RFMSegment = "Champion" | "Loyal" | "At Risk" | "Big Spender" | "New" | "ทั่วไป";
type RFMScore = 1 | 2 | 3; // 1 = ดี, 2 = เตือน, 3 = แย่

interface RFMResult {
  rDays: number | null;
  rLabel: string;
  rScore: RFMScore;
  fScore: RFMScore;
  mScore: RFMScore;
  segment: RFMSegment;
  insight: string;
}

function computeRFM(customer: Customer): RFMResult {
  const now = Date.now();

  // R — Recency (วันที่ติดต่อล่าสุด)
  let rDays: number | null = null;
  let rLabel = "ไม่มีข้อมูล";
  let rScore: RFMScore = 3;
  if (customer.last_contacted_at) {
    rDays = Math.floor((now - new Date(customer.last_contacted_at).getTime()) / 86_400_000);
    if (rDays <= 7)        rLabel = `${rDays} วันที่แล้ว`;
    else if (rDays <= 30)  rLabel = `${Math.floor(rDays / 7)} สัปดาห์ที่แล้ว`;
    else                   rLabel = `${Math.floor(rDays / 30)} เดือนที่แล้ว`;
    rScore = rDays <= 60 ? 1 : rDays <= 180 ? 2 : 3;
  }

  // F — Frequency (จำนวนครั้งที่ซื้อ)
  const fScore: RFMScore = customer.total_trips >= 3 ? 1 : customer.total_trips >= 1 ? 2 : 3;

  // M — Monetary (ยอดรวม)
  const mScore: RFMScore = customer.total_spend >= 50_000 ? 1 : customer.total_spend >= 10_000 ? 2 : 3;

  // Segment logic
  let segment: RFMSegment;
  if (customer.total_trips === 0)              segment = "New";
  else if (fScore === 1 && mScore === 1 && rScore <= 2) segment = "Champion";
  else if (fScore === 1 && rScore === 3)        segment = "At Risk";
  else if (mScore === 1 && fScore >= 2)         segment = "Big Spender";
  else if (fScore === 1)                        segment = "Loyal";
  else                                          segment = "ทั่วไป";

  // Auto insight
  const insight =
    segment === "Champion"    ? `ลูกค้า Champion ยอดสูง ใช้บริการบ่อย${rScore === 2 ? ` — หายไป ${rLabel} แล้ว ควรโทรติดตามด่วน` : " — ดูแลรักษาความสัมพันธ์ต่อเนื่อง"}` :
    segment === "At Risk"     ? `เคยซื้อบ่อยแต่หายนาน ${rLabel} — ควรโทรหาด่วน เสนอโปรพิเศษหรือ package ใหม่` :
    segment === "Big Spender" ? `ยอดต่อครั้งสูงแต่ซื้อไม่บ่อย — มีศักยภาพสูง ลองเสนอ package พรีเมียม` :
    segment === "Loyal"       ? `ใช้บริการสม่ำเสมอ — เหมาะสำหรับ upsell หรือ cross-sell package ใหม่` :
    segment === "New"         ? `ลูกค้าใหม่ยังไม่เคยซื้อ — ติดตามพูดคุย เสนอ package เริ่มต้น` :
                                `ลูกค้าทั่วไป — ติดตามอย่างสม่ำเสมอเพื่อสร้างความสัมพันธ์`;

  return { rDays, rLabel, rScore, fScore, mScore, segment, insight };
}

const SEGMENT_STYLE: Record<RFMSegment, { label: string; pill: string }> = {
  "Champion":    { label: "Champion",    pill: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300" },
  "At Risk":     { label: "At Risk",     pill: "bg-red-100 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-400" },
  "Big Spender": { label: "Big Spender", pill: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400" },
  "Loyal":       { label: "Loyal",       pill: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300" },
  "New":         { label: "New",         pill: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300" },
  "ทั่วไป":      { label: "ทั่วไป",      pill: "bg-muted text-muted-foreground border-border" },
};

const RFM_SCORE_COLOR: Record<RFMScore, string> = {
  1: "text-emerald-600 dark:text-emerald-400",
  2: "text-amber-600 dark:text-amber-400",
  3: "text-red-500 dark:text-red-400",
};

// ── Compact list row ──────────────────────────────────────────────────────────

interface ListRowProps {
  customer: Customer;
  lead?: Lead;
  selected: boolean;
  onClick: () => void;
  nextFollowup?: string | null;
}

function ListRow({ customer, lead, selected, onClick, nextFollowup }: ListRowProps) {
  const meta  = statusMeta(lead?.status ?? "ใหม่");
  const value = lead?.closed_price || lead?.quoted_price;
  const rfm   = computeRFM(customer);
  const seg   = SEGMENT_STYLE[rfm.segment];
  const lastContact = fmtRelativeDate(customer.last_contacted_at);
  const nextFmt = nextFollowup ? fmtFutureDate(nextFollowup) : null;
  return (
    <button
      data-id={customer.customer_id}
      onClick={onClick}
      className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 transition-colors border-b border-border last:border-0 group ${
        selected
          ? "bg-violet-50/80 dark:bg-violet-900/20 border-l-2 border-l-violet-500"
          : "hover:bg-muted/40"
      }`}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-sm font-bold ${
        selected ? "bg-violet-500" : "bg-violet-400/80"
      }`}>
        {customer.full_name.charAt(0)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className={`text-sm font-semibold truncate leading-tight ${selected ? "text-violet-700 dark:text-violet-300" : ""}`}>
            {customer.full_name}
          </p>
          {rfm.segment !== "ทั่วไป" && (
            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${seg.pill}`}>{seg.label}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${meta.pill}`}>{meta.label}</span>
          {lastContact && (
            <span className="text-[9px] text-muted-foreground">📞 {lastContact}</span>
          )}
          {nextFmt && (
            <span className={`text-[9px] font-medium ${nextFollowup && new Date(nextFollowup) < new Date() ? "text-red-500" : "text-amber-600 dark:text-amber-400"}`}>
              ⏰ {nextFmt}
            </span>
          )}
        </div>
      </div>

      <div className="text-right shrink-0">
        {value ? (
          <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{fmtMoney(value)}</p>
        ) : customer.total_spend > 0 ? (
          <p className="text-[9px] text-muted-foreground tabular-nums">{fmtMoney(customer.total_spend)}</p>
        ) : null}
      </div>
    </button>
  );
}

// ── Detail info row helper ────────────────────────────────────────────────────

function InfoRow({ icon, label, value, className = "" }: { icon: React.ReactNode; label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-start gap-2.5 ${className}`}>
      <div className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{label}</p>
        <p className="text-sm text-foreground/90 leading-snug">{value}</p>
      </div>
    </div>
  );
}

// ── Right detail panel ────────────────────────────────────────────────────────

interface DetailPanelProps {
  customer: Customer | null;
  leads: Lead[];
  onNavigate: () => void;
}

function DetailPanel({ customer, leads, onNavigate }: DetailPanelProps) {
  const tours = useServices((s) => s.tours);
  const rfm   = customer ? computeRFM(customer) : null;

  if (!customer) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 text-muted-foreground p-8">
        <Users2 className="w-12 h-12 opacity-15" />
        <p className="text-sm">เลือก Lead ทางซ้ายเพื่อดูรายละเอียด</p>
      </div>
    );
  }

  const bestLead   = leads[0]; // already sorted by leadPriority
  const meta       = statusMeta(bestLead?.status ?? "ใหม่");
  const lastContact= thaiDateTime(customer.last_contacted_at);
  const tierColors: Record<string, string> = {
    "Gold":     "bg-amber-100 text-amber-700 border-amber-300",
    "Silver":   "bg-slate-100 text-slate-600 border-slate-300",
    "Bronze":   "bg-orange-100 text-orange-600 border-orange-300",
    "Platinum": "bg-violet-100 text-violet-700 border-violet-300",
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">

      {/* ── Customer header ── */}
      <div className={`px-6 py-5 border-b border-border bg-gradient-to-r from-violet-50/60 to-transparent dark:from-violet-900/20`}>
        <div className="flex items-start gap-4">
          {/* Big avatar */}
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white text-xl font-bold shrink-0 shadow-md">
            {customer.full_name.charAt(0)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold leading-tight">{customer.full_name}</h2>
              <Badge variant="outline" className={`text-[9px] px-2 ${tierColors[customer.customer_tier] ?? "bg-muted text-muted-foreground"}`}>
                <Star className="w-2.5 h-2.5 mr-1" />{customer.customer_tier}
              </Badge>
              <Badge variant="outline" className={`text-[9px] px-2 ${meta.pill}`}>
                {meta.label}
              </Badge>
            </div>
            {customer.company && customer.company !== "-" && (
              <p className="text-sm text-muted-foreground mt-0.5">{customer.company}</p>
            )}
            {lastContact && (
              <p className="text-[11px] text-muted-foreground/70 mt-1">ติดต่อล่าสุด {lastContact}</p>
            )}
          </div>

          {/* Navigate button */}
          <Button
            onClick={onNavigate}
            size="sm"
            variant="outline"
            className="shrink-0 gap-1.5 text-xs border-violet-300 text-violet-600 hover:bg-violet-50"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            โปรไฟล์เต็ม
          </Button>
        </div>
      </div>

      {/* ── RFM Profile card ── */}
      {rfm && (
        <div className="px-5 py-4 border-b border-border">
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">RFM Profile</p>
              <Badge variant="outline" className={`text-[9px] px-2 ${SEGMENT_STYLE[rfm.segment].pill}`}>
                {SEGMENT_STYLE[rfm.segment].label}
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-muted/30 rounded-xl p-3 text-center">
                <p className={`text-sm font-bold ${RFM_SCORE_COLOR[rfm.rScore]}`}>{rfm.rLabel}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">ล่าสุด (R)</p>
              </div>
              <div className="bg-muted/30 rounded-xl p-3 text-center">
                <p className={`text-sm font-bold ${RFM_SCORE_COLOR[rfm.fScore]}`}>{customer.total_trips} ครั้ง</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">ความถี่ (F)</p>
              </div>
              <div className="bg-muted/30 rounded-xl p-3 text-center">
                <p className={`text-sm font-bold ${RFM_SCORE_COLOR[rfm.mScore]}`}>{fmtMoney(customer.total_spend)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">ยอดรวม (M)</p>
              </div>
            </div>
            <div className="rounded-xl border border-violet-200/60 bg-violet-50/60 dark:bg-violet-900/15 dark:border-violet-800/40 px-3.5 py-2.5">
              <p className="text-[10px] font-bold text-violet-600 dark:text-violet-400 mb-1">คำแนะนำ</p>
              <p className="text-[11px] text-foreground/70 leading-relaxed">{rfm.insight}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Lead history (cards) ── */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

        {/* Contact info + Customer data */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border rounded-xl p-4 space-y-2.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">ข้อมูลติดต่อ</p>
            <InfoRow icon={<Phone className="w-4 h-4" />} label="เบอร์โทร" value={
              <a href={`tel:${customer.phone}`} className="hover:text-violet-600 transition-colors">{customer.phone}</a>
            } />
            {customer.line_id && customer.line_id !== "-" && (
              <InfoRow icon={<MessageCircle className="w-4 h-4" />} label="LINE ID" value={customer.line_id} />
            )}
            {customer.province && (
              <InfoRow icon={<MapPin className="w-4 h-4" />} label="จังหวัด" value={customer.province} />
            )}
            <InfoRow icon={<Tag className="w-4 h-4" />} label="แหล่งที่มา" value={customer.source} />
            <InfoRow icon={<User className="w-4 h-4" />} label="Sales ที่ดูแล" value={customer.created_by} />
          </div>
          <div className="bg-card border rounded-xl p-4 space-y-2.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">ข้อมูลลูกค้า</p>
            <div className="grid grid-cols-1 gap-2">
              <div>
                <p className="text-muted-foreground text-[10px]">ทริปสำเร็จ</p>
                <p className="font-bold text-violet-600">{customer.total_trips} ครั้ง</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[10px]">ยอดใช้จริง</p>
                <p className="font-bold text-emerald-600">{fmtMoney(customer.total_spend)}</p>
              </div>
              {customer.first_contact_date && (
                <div>
                  <p className="text-muted-foreground text-[10px]">เพิ่มเมื่อ</p>
                  <p className="font-semibold text-sm">{thaiDate(customer.first_contact_date)}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* LEADS */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            LEADS ({leads.length})
          </p>
          {leads.length === 0 ? (
            (customer.total_trips > 0 || customer.total_spend > 0) ? (
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-900/20 border border-amber-200/60">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-800/40 flex items-center justify-center shrink-0 mt-0.5">
                  <Banknote className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">มียอดซื้อแต่ไม่มี Lead ในระบบ</p>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    ยอด <span className="font-semibold text-foreground/80">{thaiCurrency(customer.total_spend)}</span>
                    {" · "}{customer.total_trips} ครั้ง — ข้อมูลนำเข้าจากระบบเก่า
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground border border-dashed border-border rounded-xl">
                <p className="text-sm">ยังไม่มี Lead</p>
              </div>
            )
          ) : (
            <div className="space-y-2">
              {leads.map((l) => {
                const lm = statusMeta(l.status);
                const lv = l.closed_price || l.quoted_price;
                const period = l.period_id ? tours.find((t) => t.id === l.tour_id)?.periods?.find((p) => p.period_id === l.period_id) : null;
                const tripStart = fmtThaiDate(period?.start_date);
                const tripEnd   = fmtThaiDate(period?.end_date);
                const tripLabel = tripStart && tripEnd ? `${tripStart} – ${tripEnd}` : tripStart || fmtTravelMonth(l.travel_month);
                const closedLabel = fmtThaiDate(l.closed_date);
                const closedTime  = isClosedStatus(l.status) ? fmtThaiTime(l.updated_at) : null;
                return (
                  <div key={l.lead_id} className="border border-border rounded-xl overflow-hidden bg-card">
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className={`w-1 h-10 rounded-full shrink-0 ${lm.bar}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold truncate">{l.program || l.bu_type || "—"}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${lm.pill}`}>{lm.label}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1"><Users2 className="w-3 h-3" />{l.pax_count} ท่าน</span>
                          {tripLabel && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{tripLabel}</span>}
                          {l.assigned_to && <span>· {l.assigned_to}</span>}
                        </div>
                        {closedLabel && (
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                            ✓ จอง {closedLabel}{closedTime ? ` (${closedTime})` : ""}
                          </p>
                        )}
                      </div>
                      {lv ? (
                        <div className="text-right shrink-0 space-y-0.5">
                          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{fmtMoney(lv)}</p>
                          {(l.discount ?? 0) > 0 ? (
                            <span className="inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-700">
                              โปรโมชั่น -{(l.discount!).toLocaleString()}
                            </span>
                          ) : (
                            <span className="inline-block text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                              ราคาเต็ม
                            </span>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Note */}
        {customer.note && (
          <div className="bg-amber-50/60 dark:bg-amber-900/15 border border-amber-200/60 rounded-xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600/80 mb-2 flex items-center gap-1">
              <FileText className="w-3 h-3" /> บันทึก
            </p>
            <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{customer.note}</p>
          </div>
        )}

        {/* Interest tags */}
        {(customer.interests?.length ?? 0) > 0 && (
          <div className="bg-card border rounded-xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">ความสนใจ</p>
            <div className="flex flex-wrap gap-1.5">
              {customer.interests!.map((tag) => (
                <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 border border-violet-200/60">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function MarketingOBLeads() {
  const navigate  = useNavigate();
  const obNames   = useActiveOBNames();
  const allLeads  = useCRM((s) => s.leads);
  const customers = useCRM((s) => s.customers);

  const [search, setSearch]           = useState("");
  const [statusGroup, setStatusGroup] = useState<"active" | "won" | "lost" | "all">("all");
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState("all");
  const [sortBy, setSortBy]             = useState<"default" | "spend" | "recent" | "frequent">("default");
  const [filterStatus, setFilterStatus] = useState<"all" | "no_lead" | "active" | "quoted" | "closed" | "lost">("all");

  const obCustomers = useMemo(
    () => customers.filter((c) => c.channel === "OB"),
    [customers],
  );

  const sourceOptions = useMemo(() => {
    const set = new Set<string>();
    obCustomers.forEach((c) => { if (c.source) set.add(c.source); });
    return Array.from(set).sort();
  }, [obCustomers]);

  const latestLeadByCustomer = useMemo(() => {
    const map = new Map<string, Lead>();
    allLeads.forEach((l) => {
      const cur = map.get(l.customer_id);
      if (!cur || leadPriority(l.status) < leadPriority(cur.status)) {
        map.set(l.customer_id, l);
      }
    });
    return map;
  }, [allLeads]);

  const nextFollowupByCustomer = useMemo(() => {
    const map = new Map<string, string>();
    allLeads.forEach((l) => {
      if (!l.next_followup_date || isClosedStatus(l.status) || isLostStatus(l.status)) return;
      const cur = map.get(l.customer_id);
      if (!cur || l.next_followup_date < cur) map.set(l.customer_id, l.next_followup_date);
    });
    return map;
  }, [allLeads]);

  const stats = useMemo(() => {
    const s = { active: 0, won: 0, lost: 0, all: obCustomers.length, wonValue: 0, pipelineValue: 0 };
    obCustomers.forEach((c) => {
      const lead = latestLeadByCustomer.get(c.customer_id);
      const g = statusMeta(lead?.status ?? "ใหม่").group;
      if (g === "active") {
        s.active++;
        if (lead?.quoted_price) s.pipelineValue += lead.quoted_price;
      } else if (g === "won") {
        s.won++;
        s.wonValue += lead?.closed_price || lead?.quoted_price || 0;
      } else if (g === "lost") {
        s.lost++;
      }
    });
    return s;
  }, [obCustomers, latestLeadByCustomer]);

  const filtered = useMemo(() => {
    let list = obCustomers;
    if (statusGroup !== "all") {
      list = list.filter((c) => statusMeta(latestLeadByCustomer.get(c.customer_id)?.status ?? "ใหม่").group === statusGroup);
    }
    if (sourceFilter !== "all") {
      list = list.filter((c) => c.source === sourceFilter);
    }
    if (filterStatus !== "all") {
      list = list.filter((c) => {
        const lead = latestLeadByCustomer.get(c.customer_id);
        const st = lead?.status;
        if (filterStatus === "no_lead")  return !st || st === "ใหม่";
        if (filterStatus === "closed")   return st ? isClosedStatus(st) : false;
        if (filterStatus === "lost")     return st ? isLostStatus(st) : false;
        if (filterStatus === "quoted")   return st === "ส่ง Quote แล้ว";
        if (filterStatus === "active")   return st ? !isClosedStatus(st) && !isLostStatus(st) && st !== "ส่ง Quote แล้ว" : false;
        return true;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.full_name.toLowerCase().includes(q) ||
          (c.company ?? "").toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (latestLeadByCustomer.get(c.customer_id)?.program ?? "").toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => {
      if (sortBy === "spend")    return b.total_spend - a.total_spend;
      if (sortBy === "frequent") return b.total_trips - a.total_trips;
      if (sortBy === "recent")   return (b.last_contacted_at ?? "").localeCompare(a.last_contacted_at ?? "");
      // default: lead priority then last_contacted_at
      const pa = leadPriority(latestLeadByCustomer.get(a.customer_id)?.status ?? "ใหม่");
      const pb = leadPriority(latestLeadByCustomer.get(b.customer_id)?.status ?? "ใหม่");
      if (pa !== pb) return pa - pb;
      return (b.last_contacted_at ?? "").localeCompare(a.last_contacted_at ?? "");
    });
  }, [obCustomers, search, statusGroup, sourceFilter, filterStatus, sortBy, latestLeadByCustomer]);

  // Export-ready records (follows current filter)
  const exportData = useMemo(() =>
    filtered.map((c) => ({
      full_name:          c.full_name,
      phone:              c.phone,
      line_id:            c.line_id ?? "",
      email:              c.email ?? "",
      province:           c.province ?? "",
      source:             c.source ?? "",
      segment:            c.segment ?? "",
      customer_tier:      c.customer_tier ?? "",
      total_trips:        c.total_trips,
      total_spend:        c.total_spend,
      first_contact_date: c.first_contact_date ?? "",
      created_by:         c.created_by ?? "",
      lead_status:        latestLeadByCustomer.get(c.customer_id)?.status ?? "",
    })),
    [filtered, latestLeadByCustomer],
  );

  const handleExport = () => {
    exportToExcel(exportData, OB_EXPORT_FIELDS, "OB Leads", `OB_leads`);
    toast.success(`Export ${exportData.length} รายการเรียบร้อย ✅`);
  };

  // Auto-select first item on load / filter change
  useEffect(() => {
    if (filtered.length > 0) {
      setSelectedId((prev) => {
        // Keep current if still in filtered list
        if (prev && filtered.some((c) => c.customer_id === prev)) return prev;
        return filtered[0].customer_id;
      });
    } else {
      setSelectedId(null);
    }
  }, [filtered]);

  // ── Activity Feed scroll-to highlight ──
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const id = searchParams.get("highlight");
    if (!id) return;
    // entity_id in log is leadId — resolve to customer_id
    const matchLead = allLeads.find((l) => l.lead_id === id);
    const customerId = matchLead?.customer_id ?? id;
    setSelectedId(customerId);
    const timer = setTimeout(() => {
      const el = document.querySelector(`[data-id="${customerId}"]`) as HTMLElement | null;
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("row-highlight");
      setTimeout(() => el.classList.remove("row-highlight"), 2200);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchParams, allLeads]);

  const selectedCustomer = selectedId ? obCustomers.find((c) => c.customer_id === selectedId) ?? null : null;
  const selectedLeads = useMemo(
    () => selectedId
      ? allLeads
          .filter((l) => l.customer_id === selectedId)
          .sort((a, b) => leadPriority(a.status) - leadPriority(b.status))
      : [],
    [allLeads, selectedId],
  );

  // Filter tab config
  const TABS = [
    { key: "all" as const,    label: "ทั้งหมด",          icon: <Sparkles className="w-3.5 h-3.5" />,     count: stats.all,    activeClass: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
    { key: "active" as const, label: "ดำเนินการ",        icon: <Clock className="w-3.5 h-3.5" />,         count: stats.active, activeClass: "bg-amber-500/10 text-amber-600" },
    { key: "won" as const,    label: "จองแล้ว",          icon: <CheckCircle2 className="w-3.5 h-3.5" />,  count: stats.won,    activeClass: "bg-emerald-500/10 text-emerald-600" },
    { key: "lost" as const,   label: "ยกเลิก",           icon: <XCircle className="w-3.5 h-3.5" />,       count: stats.lost,   activeClass: "bg-red-500/10 text-red-500" },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-4 sm:p-5 gap-3 overflow-hidden">

      {/* ── Header row ── */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-violet-500 flex items-center justify-center shadow-md shrink-0">
          <Users2 className="w-4.5 h-4.5 text-white w-[18px] h-[18px]" />
        </div>
        <div>
          <h1 className="text-lg font-bold leading-tight">OB Leads</h1>
          <p className="text-xs text-muted-foreground">Outbound {obCustomers.length} ราย · ทีม {obNames.length} คน</p>
        </div>

        {/* Filter tabs — inline in header */}
        <div className="ml-auto flex items-center gap-1 bg-muted/50 rounded-xl p-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusGroup(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusGroup === tab.key
                  ? `${tab.activeClass} shadow-sm`
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon}
              {tab.label}
              <span className={`min-w-[18px] h-[18px] rounded-full text-[10px] font-bold flex items-center justify-center px-1 ${
                statusGroup === tab.key ? "bg-current/20" : "bg-muted"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/60">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-[11px] text-muted-foreground">จองแล้ว</span>
          <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">{fmtMoney(stats.wonValue)}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200/60">
          <Banknote className="w-3.5 h-3.5 text-violet-600" />
          <span className="text-[11px] text-muted-foreground">Pipeline</span>
          <span className="text-sm font-bold text-violet-700 dark:text-violet-400 tabular-nums">{fmtMoney(stats.pipelineValue)}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="font-semibold text-amber-600">{stats.active}</span> ดำเนินการ
            <span className="opacity-40">·</span>
            <span className="font-semibold text-red-500">{stats.lost}</span> ยกเลิก
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-[11px] gap-1.5 border-violet-200 text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:text-violet-400"
            onClick={handleExport}
          >
            <Download className="w-3.5 h-3.5" />
            Export Excel ({filtered.length})
          </Button>
        </div>
      </div>

      {/* ── Split pane ── */}
      <div className="flex gap-3 flex-1 min-h-0 overflow-hidden">

        {/* ── Left: list panel ── */}
        <div className="w-96 shrink-0 flex flex-col bg-card border rounded-xl overflow-hidden shadow-sm">

          {/* Search + Filters */}
          <div className="p-2.5 border-b border-border shrink-0 space-y-2">
            {/* Filter dropdowns */}
            <div className="flex gap-1.5">
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="flex-1 h-8 rounded-lg border border-border bg-background text-xs px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-violet-400 cursor-pointer"
              >
                <option value="all">ทุกแหล่งที่มา</option>
                {sourceOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                className={`w-full h-8 rounded-lg border bg-background text-xs px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-violet-400 cursor-pointer transition ${filterStatus !== "all" ? "border-violet-400 text-violet-700 dark:text-violet-300 font-medium" : "border-border"}`}
              >
                <option value="all">ทุกสถานะ Lead</option>
                <option value="no_lead">ยังไม่มี Lead</option>
                <option value="active">กำลังติดตาม</option>
                <option value="quoted">ส่ง Quote แล้ว</option>
                <option value="closed">จองแล้ว</option>
                <option value="lost">ยกเลิก</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="flex-1 h-8 rounded-lg border border-border bg-background text-xs px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-violet-400 cursor-pointer"
              >
                <option value="default">เรียงตามสถานะ</option>
                <option value="spend">ยอดสูงสุด</option>
                <option value="frequent">ซื้อบ่อยสุด</option>
                <option value="recent">ติดต่อล่าสุด</option>
              </select>
            </div>
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="ค้นหา..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>

          {/* Count */}
          <div className="px-3 py-1.5 border-b border-border shrink-0 bg-muted/20">
            <p className="text-[10px] text-muted-foreground font-medium">
              {filtered.length} รายการ
            </p>
          </div>

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                <Users2 className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p>ไม่พบ leads</p>
                {statusGroup !== "all" && (
                  <button onClick={() => setStatusGroup("all")} className="mt-1 text-xs text-violet-500 hover:underline">
                    ดูทั้งหมด →
                  </button>
                )}
              </div>
            ) : (
              filtered.map((c) => (
                <ListRow
                  key={c.customer_id}
                  customer={c}
                  lead={latestLeadByCustomer.get(c.customer_id)}
                  selected={c.customer_id === selectedId}
                  onClick={() => setSelectedId(c.customer_id)}
                  nextFollowup={nextFollowupByCustomer.get(c.customer_id)}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Right: detail panel ── */}
        <div className="flex-1 bg-card border rounded-xl overflow-hidden shadow-sm flex flex-col">
          <DetailPanel
            customer={selectedCustomer}
            leads={selectedLeads}
            onNavigate={() => selectedId && navigate(`/marketing/customers/${selectedId}`)}
          />
        </div>

      </div>
    </div>
  );
}
