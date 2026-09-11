/**
 * MarketingSalesLeads.tsx — Sales Leads — Master-Detail layout
 *
 * Route: /marketing/sales-leads
 * Theme: Orange 🟠
 * Layout: Stats summary → split pane (list left + detail right)
 */

import { useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search, Users, Phone, Calendar,
  Mail, MapPin, User, Star, Tag, FileText,
  ExternalLink, MessageCircle, Download,
  TrendingUp, Banknote, Users2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCRM, SOURCES, isClosedStatus, isLostStatus, type Customer, type Lead, type Source } from "@/store/crmStore";
import { useServices } from "@/store/serviceStore";
import { toast } from "sonner";

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

function fmtThaiTime(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}.${mm} น.`;
}

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

type RFMSegment = "Champion" | "Loyal" | "At Risk" | "Big Spender" | "New" | "ทั่วไป";
type RFMScore = 1 | 2 | 3;

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
  let rDays: number | null = null;
  let rLabel = "ไม่มีข้อมูล";
  let rScore: RFMScore = 3;
  if (customer.last_contacted_at) {
    rDays = Math.floor((now - new Date(customer.last_contacted_at).getTime()) / 86_400_000);
    if (rDays <= 7)       rLabel = `${rDays} วันที่แล้ว`;
    else if (rDays <= 30) rLabel = `${Math.floor(rDays / 7)} สัปดาห์ที่แล้ว`;
    else                  rLabel = `${Math.floor(rDays / 30)} เดือนที่แล้ว`;
    rScore = rDays <= 60 ? 1 : rDays <= 180 ? 2 : 3;
  }
  const fScore: RFMScore = customer.total_trips >= 3 ? 1 : customer.total_trips >= 1 ? 2 : 3;
  const mScore: RFMScore = customer.total_spend >= 50_000 ? 1 : customer.total_spend >= 10_000 ? 2 : 3;
  let segment: RFMSegment;
  if (customer.total_trips === 0)                              segment = "New";
  else if (fScore === 1 && mScore === 1 && rScore <= 2)        segment = "Champion";
  else if (fScore === 1 && rScore === 3)                       segment = "At Risk";
  else if (mScore === 1 && fScore >= 2)                        segment = "Big Spender";
  else if (fScore === 1)                                       segment = "Loyal";
  else                                                         segment = "ทั่วไป";
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

function statusMeta(status: string) {
  switch (status) {
    case "ใหม่":
      return { label: "ใหม่",        bar: "bg-slate-400",   pill: "bg-slate-100 text-slate-600 border-slate-200" };
    case "ติดต่อแล้ว":
    case "ตอบแล้ว":
      return { label: "ติดต่อแล้ว",  bar: "bg-blue-500",    pill: "bg-blue-100 text-blue-700 border-blue-200" };
    case "ส่ง Quote แล้ว":
      return { label: "ส่ง Quote",   bar: "bg-violet-500",  pill: "bg-violet-100 text-violet-700 border-violet-200" };
    case "กำลังเจรจา":
      return { label: "กำลังเจรจา", bar: "bg-amber-500",   pill: "bg-amber-100 text-amber-700 border-amber-200" };
    case "จองแล้ว":
      return { label: "จองแล้ว ✓",  bar: "bg-emerald-500", pill: "bg-emerald-100 text-emerald-700 border-emerald-200" };
    case "ยกเลิก":
      return { label: "ยกเลิก",     bar: "bg-red-400",     pill: "bg-red-100 text-red-600 border-red-200" };
    default:
      return { label: status,        bar: "bg-muted-foreground", pill: "bg-muted text-muted-foreground border-border" };
  }
}

function leadPriority(status: string): number {
  if (status === "กำลังเจรจา")     return 0;
  if (status === "ส่ง Quote แล้ว") return 1;
  if (status === "ติดต่อแล้ว" || status === "ตอบแล้ว") return 2;
  if (status === "ใหม่")            return 3;
  if (isClosedStatus(status as Parameters<typeof isClosedStatus>[0]))       return 4;
  if (isLostStatus(status as Parameters<typeof isLostStatus>[0]))         return 5;
  return 6;
}

const SOURCE_COLOR: Record<string, string> = {
  "FB":         "bg-blue-100 text-blue-700 border-blue-200",
  "Line OA":    "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Website":    "bg-sky-100 text-sky-700 border-sky-200",
  "TikTok":     "bg-pink-100 text-pink-700 border-pink-200",
  "Google":     "bg-amber-100 text-amber-700 border-amber-200",
  "Field Sale": "bg-orange-100 text-orange-700 border-orange-200",
  "Walk-in":    "bg-orange-100 text-orange-600 border-orange-200",
  "Referral":   "bg-teal-100 text-teal-700 border-teal-200",
  "Agent":      "bg-violet-100 text-violet-700 border-violet-200",
};
function sourceColor(s: string) {
  return SOURCE_COLOR[s] ?? "bg-muted text-muted-foreground border-border";
}

const TIER_COLOR: Record<string, string> = {
  "Gold":     "bg-amber-100 text-amber-700 border-amber-300",
  "Silver":   "bg-slate-100 text-slate-600 border-slate-300",
  "Bronze":   "bg-orange-100 text-orange-600 border-orange-300",
  "Platinum": "bg-violet-100 text-violet-700 border-violet-300",
};

function exportCSV(customers: Customer[]) {
  const BOM = "﻿";
  const header = ["ชื่อ-นามสกุล","องค์กร","เบอร์โทร","Line ID","อีเมล","จังหวัด","ช่องทาง","กลุ่มลูกค้า","Sales","ติดต่อล่าสุด"];
  const rows = customers.map((c) => [
    c.full_name, c.company ?? "", c.phone, c.line_id ?? "", c.email ?? "",
    c.province ?? "", c.source, c.segment, c.created_by,
    c.last_contacted_at ? new Date(c.last_contacted_at).toLocaleDateString("th-TH") : "",
  ]);
  const csv = BOM + [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `sales_leads_${new Date().toISOString().split("T")[0]}.csv`; a.click();
  URL.revokeObjectURL(url);
  toast.success(`Export ${customers.length} รายการแล้ว ✅`);
}

// ── Compact list row ──────────────────────────────────────────────────────────

function ListRow({ customer, lead, selected, onClick, nextFollowup }: {
  customer: Customer; lead?: Lead; selected: boolean; onClick: () => void; nextFollowup?: string | null;
}) {
  const rfm = computeRFM(customer);
  const seg = SEGMENT_STYLE[rfm.segment];
  const meta = lead ? statusMeta(lead.status) : null;
  const lastContact = fmtRelativeDate(customer.last_contacted_at);
  const nextFmt = nextFollowup ? fmtFutureDate(nextFollowup) : null;
  return (
    <button
      data-id={customer.customer_id}
      onClick={onClick}
      className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 transition-colors border-b border-border last:border-0 ${
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
          {meta ? (
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${meta.pill}`}>{meta.label}</span>
          ) : (
            <Badge variant="outline" className={`text-[9px] px-1.5 py-0 shrink-0 ${sourceColor(customer.source)}`}>{customer.source}</Badge>
          )}
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
      {customer.total_spend > 0 ? (
        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0 tabular-nums">
          {fmtMoney(customer.total_spend)}
        </span>
      ) : null}
    </button>
  );
}

// ── Detail info row ───────────────────────────────────────────────────────────

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{label}</p>
        <p className="text-sm text-foreground/90 leading-snug">{value}</p>
      </div>
    </div>
  );
}

// ── Right detail panel ────────────────────────────────────────────────────────

function DetailPanel({ customer, leads, onNavigate }: { customer: Customer | null; leads: Lead[]; onNavigate: () => void }) {
  const tours = useServices((s) => s.tours);
  const rfm = customer ? computeRFM(customer) : null;

  if (!customer) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 text-muted-foreground p-8">
        <Users className="w-12 h-12 opacity-15" />
        <p className="text-sm">เลือกลูกค้าทางซ้ายเพื่อดูรายละเอียด</p>
      </div>
    );
  }

  const lastContact = thaiDateTime(customer.last_contacted_at);
  const bestLead = leads[0];
  const meta = bestLead ? statusMeta(bestLead.status) : null;

  return (
    <div className="flex-1 flex flex-col min-h-0">

      {/* Header */}
      <div className="px-5 py-4 border-b border-border bg-gradient-to-r from-violet-50/60 to-transparent dark:from-violet-900/20 shrink-0">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white text-xl font-bold shrink-0 shadow">
            {customer.full_name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold">{customer.full_name}</h2>
              <Badge variant="outline" className={`text-[9px] px-2 ${TIER_COLOR[customer.customer_tier] ?? "bg-muted text-muted-foreground"}`}>
                <Star className="w-2.5 h-2.5 mr-1" />{customer.customer_tier}
              </Badge>
              {meta && (
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${meta.pill}`}>{meta.label}</span>
              )}
            </div>
            {lastContact && (
              <p className="text-[11px] text-muted-foreground mt-0.5">{customer.source} · {customer.created_by} · ติดต่อล่าสุด {lastContact}</p>
            )}
          </div>
          <Button onClick={onNavigate} size="sm" variant="outline" className="shrink-0 gap-1.5 text-xs border-violet-300 text-violet-600 hover:bg-violet-50">
            <ExternalLink className="w-3.5 h-3.5" />โปรไฟล์เต็ม
          </Button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-5 divide-x divide-border border-b border-border shrink-0">
        {[
          { label: "ทริปสำเร็จ", value: `${customer.total_trips} ครั้ง`, cls: "text-violet-600 dark:text-violet-400" },
          { label: "ยอดใช้จริง", value: fmtMoney(customer.total_spend), cls: "text-emerald-600 dark:text-emerald-400" },
          { label: "Active Lead", value: `${leads.filter((l) => !isClosedStatus(l.status) && !isLostStatus(l.status)).length}`, cls: "text-amber-600" },
          { label: "Lead ทั้งหมด", value: `${leads.length}`, cls: "text-foreground" },
          { label: "Lead เสีย",   value: `${leads.filter((l) => isLostStatus(l.status)).length}`, cls: "text-destructive" },
        ].map(({ label, value, cls }) => (
          <div key={label} className="px-2 py-2.5 text-center">
            <p className={`text-sm font-bold ${cls}`}>{value}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

        {/* RFM Profile card */}
        {rfm && (
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
        )}

        {/* Contact info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border rounded-xl p-4 space-y-2.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">ข้อมูลติดต่อ</p>
            <InfoRow icon={<Phone className="w-4 h-4" />} label="เบอร์โทร" value={
              <a href={`tel:${customer.phone}`} className="hover:text-violet-600 transition-colors">{customer.phone}</a>
            } />
            {customer.line_id && customer.line_id !== "-" && (
              <InfoRow icon={<MessageCircle className="w-4 h-4" />} label="LINE ID" value={customer.line_id} />
            )}
            {customer.email && <InfoRow icon={<Mail className="w-4 h-4" />} label="อีเมล" value={customer.email} />}
            {customer.province && <InfoRow icon={<MapPin className="w-4 h-4" />} label="จังหวัด" value={customer.province} />}
            {customer.fb_name && <InfoRow icon={<Tag className="w-4 h-4" />} label="Facebook" value={customer.fb_name} />}
          </div>
          <div className="bg-card border rounded-xl p-4 space-y-2.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">ข้อมูลลูกค้า</p>
            <InfoRow icon={<Tag className="w-4 h-4" />} label="แหล่งที่มา" value={customer.source} />
            <InfoRow icon={<User className="w-4 h-4" />} label="Sales ที่ดูแล" value={customer.created_by} />
            {customer.transferred_to && <InfoRow icon={<User className="w-4 h-4" />} label="โอนให้" value={customer.transferred_to} />}
            {customer.first_contact_date && <InfoRow icon={<Calendar className="w-4 h-4" />} label="รู้จักกันตั้งแต่" value={thaiDate(customer.first_contact_date) ?? "—"} />}
          </div>
        </div>

        {/* LEADS */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">LEADS ({leads.length})</p>
          {leads.length === 0 ? (
            (customer.total_trips > 0 || customer.total_spend > 0) ? (
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-900/20 border border-amber-200/60">
                <Banknote className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-amber-700">มียอดซื้อแต่ไม่มี Lead ในระบบ</p>
                  <p className="text-[11px] text-muted-foreground mt-1">ยอด {fmtMoney(customer.total_spend)} · {customer.total_trips} ครั้ง</p>
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
                            <span className="inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                              โปรโมชั่น -{(l.discount!).toLocaleString()}
                            </span>
                          ) : (
                            <span className="inline-block text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">ราคาเต็ม</span>
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

        {/* Interests */}
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

export default function MarketingSalesLeads() {
  const navigate  = useNavigate();
  const customers = useCRM((s) => s.customers);
  const allLeads  = useCRM((s) => s.leads);

  const [search, setSearch]               = useState("");
  const [sourceFilter, setSourceFilter]   = useState<Source | "all">("all");
  const [filterStatus, setFilterStatus]   = useState<"all" | "no_lead" | "active" | "quoted" | "closed" | "lost">("all");
  const [selectedId, setSelectedId]       = useState<string | null>(null);

  const salesCustomers = useMemo(
    () => customers.filter((c) => c.channel === "Sales"),
    [customers],
  );

  const latestLeadByCustomer = useMemo(() => {
    const map = new Map<string, Lead>();
    allLeads.forEach((l) => {
      const cur = map.get(l.customer_id);
      if (!cur || leadPriority(l.status) < leadPriority(cur.status)) map.set(l.customer_id, l);
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

  const filtered = useMemo(() => {
    let list = salesCustomers;
    if (sourceFilter !== "all") list = list.filter((c) => c.source === sourceFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.full_name.toLowerCase().includes(q) ||
          (c.company ?? "").toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.email ?? "").toLowerCase().includes(q),
      );
    }
    if (filterStatus !== "all") {
      list = list.filter((c) => {
        const lead = latestLeadByCustomer.get(c.customer_id);
        const st = lead?.status;
        if (filterStatus === "no_lead")  return !st;
        if (filterStatus === "closed")   return st ? isClosedStatus(st) : false;
        if (filterStatus === "lost")     return st ? isLostStatus(st) : false;
        if (filterStatus === "quoted")   return st === "ส่ง Quote แล้ว";
        if (filterStatus === "active")   return st ? !isClosedStatus(st) && !isLostStatus(st) && st !== "ส่ง Quote แล้ว" : false;
        return true;
      });
    }
    return [...list].sort((a, b) =>
      (b.last_contacted_at ?? "").localeCompare(a.last_contacted_at ?? ""),
    );
  }, [salesCustomers, search, sourceFilter, filterStatus, latestLeadByCustomer]);

  // Auto-select first item
  useEffect(() => {
    if (filtered.length > 0) {
      setSelectedId((prev) => {
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

  const selectedCustomer = selectedId ? salesCustomers.find((c) => c.customer_id === selectedId) ?? null : null;

  const selectedLeads = useMemo(
    () => selectedId
      ? allLeads.filter((l) => l.customer_id === selectedId).sort((a, b) => leadPriority(a.status) - leadPriority(b.status))
      : [],
    [allLeads, selectedId],
  );

  // Stats by source (top 4)
  const topSources = useMemo(() => {
    const counts: Record<string, number> = {};
    salesCustomers.forEach((c) => { counts[c.source] = (counts[c.source] ?? 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [salesCustomers]);

  const totalSpend = useMemo(
    () => salesCustomers.reduce((sum, c) => sum + (c.total_spend ?? 0), 0),
    [salesCustomers],
  );

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-4 sm:p-5 gap-3 overflow-hidden">

      {/* ── Header row ── */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-md shrink-0">
          <Users className="w-[18px] h-[18px] text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold leading-tight">Sales Leads</h1>
          <p className="text-xs text-muted-foreground">ลูกค้า Sales {salesCustomers.length} ราย</p>
        </div>

        {/* Source quick filter chips */}
        <div className="ml-auto flex items-center gap-1.5 flex-wrap">
          {/* Source select */}
          <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as Source | "all")}>
            <SelectTrigger className="h-8 w-36 text-xs border-orange-200/60">
              <SelectValue placeholder="ทุกช่องทาง" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกช่องทาง</SelectItem>
              {SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs border-orange-200/60 text-orange-600 hover:bg-orange-50"
            onClick={() => exportCSV(filtered)}
          >
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
        </div>
      </div>

      {/* ── Source mini stats ── */}
      <div className="grid grid-cols-5 gap-2 shrink-0">
        {topSources.map(([src, count]) => (
          <button
            key={src}
            onClick={() => setSourceFilter(src === sourceFilter ? "all" : src as Source)}
            className={`rounded-xl border p-2.5 text-left transition-all hover:shadow-sm ${
              sourceFilter === src
                ? "ring-2 ring-offset-1 ring-orange-400/60 border-orange-300/60 bg-orange-50/60 dark:bg-orange-900/20"
                : "bg-card"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xl font-bold ${sourceFilter === src ? "text-orange-600" : "text-foreground"}`}>{count}</span>
              <Badge variant="outline" className={`text-[9px] px-1.5 ${sourceColor(src)}`}>{src}</Badge>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 truncate">ลูกค้า</p>
            <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-orange-400"
                style={{ width: `${Math.round((count / salesCustomers.length) * 100)}%` }}
              />
            </div>
          </button>
        ))}
        {/* Total + Revenue card */}
        <div className="rounded-xl border p-2.5 bg-orange-50/40 dark:bg-orange-900/10 border-orange-200/40">
          <div className="flex items-center justify-between">
            <span className="text-xl font-bold text-orange-600">{salesCustomers.length}</span>
            <TrendingUp className="w-4 h-4 text-orange-400" />
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">ทั้งหมด</p>
          {totalSpend > 0 && (
            <p className="text-[10px] font-bold text-emerald-600 mt-0.5 tabular-nums">{fmtMoney(totalSpend)}</p>
          )}
        </div>
      </div>

      {/* ── Split pane ── */}
      <div className="flex gap-3 flex-1 min-h-0 overflow-hidden">

        {/* Left: list */}
        <div className="w-1/4 min-w-[280px] shrink-0 flex flex-col bg-card border rounded-xl overflow-hidden shadow-sm">
          {/* Search */}
          <div className="p-2.5 border-b border-border shrink-0 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="ค้นหา..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
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
          </div>
          {/* Count */}
          <div className="px-3 py-1.5 border-b border-border shrink-0 bg-muted/20">
            <p className="text-[10px] text-muted-foreground font-medium">{filtered.length} รายการ</p>
          </div>
          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p>ไม่พบลูกค้า</p>
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

        {/* Right: detail */}
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
