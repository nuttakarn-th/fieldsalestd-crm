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
  Search, Users, Phone, Calendar, ChevronRight,
  Mail, MapPin, User, Star, Tag, FileText,
  ExternalLink, MessageCircle, Download,
  TrendingUp, Hash,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCRM, SOURCES, type Customer, type Source } from "@/store/crmStore";
import { useActiveOBNames } from "@/store/authStore";
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

function ListRow({ customer, selected, onClick }: { customer: Customer; selected: boolean; onClick: () => void }) {
  return (
    <button
      data-id={customer.customer_id}
      onClick={onClick}
      className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 transition-colors border-b border-border last:border-0 group ${
        selected ? "bg-orange-50 dark:bg-orange-900/20" : "hover:bg-muted/50"
      }`}
    >
      {/* Source color bar */}
      <div className={`w-1 h-8 rounded-full shrink-0 ${
        customer.source === "Line OA" ? "bg-emerald-400" :
        customer.source === "FB"      ? "bg-blue-400"    :
        customer.source === "TikTok"  ? "bg-pink-400"    :
        "bg-orange-400"
      }`} />

      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-sm font-bold ${
        selected ? "bg-orange-500" : "bg-orange-400/80"
      }`}>
        {customer.full_name.charAt(0)}
      </div>

      {/* Name + source badge */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate leading-tight ${selected ? "text-orange-700 dark:text-orange-300" : ""}`}>
          {customer.full_name}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Badge variant="outline" className={`text-[9px] px-1.5 py-0 shrink-0 ${sourceColor(customer.source)}`}>
            {customer.source}
          </Badge>
          <p className="text-[10px] text-muted-foreground truncate leading-tight">
            {customer.company && customer.company !== "-" ? customer.company : customer.phone}
          </p>
        </div>
      </div>

      {/* Total spend */}
      {customer.total_spend && customer.total_spend > 0 ? (
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

function DetailPanel({ customer, onNavigate }: { customer: Customer | null; onNavigate: () => void }) {
  if (!customer) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 text-muted-foreground p-8">
        <Users className="w-12 h-12 opacity-15" />
        <p className="text-sm">เลือกลูกค้าทางซ้ายเพื่อดูรายละเอียด</p>
      </div>
    );
  }

  const lastContact = thaiDateTime(customer.last_contacted_at);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">

      {/* Header */}
      <div className="px-6 py-5 border-b border-border bg-gradient-to-r from-orange-50/60 to-transparent dark:from-orange-900/20">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-xl font-bold shrink-0 shadow-md">
            {customer.full_name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold leading-tight">{customer.full_name}</h2>
              <Badge variant="outline" className={`text-[9px] px-2 ${TIER_COLOR[customer.customer_tier] ?? "bg-muted text-muted-foreground"}`}>
                <Star className="w-2.5 h-2.5 mr-1" />{customer.customer_tier}
              </Badge>
              <Badge variant="outline" className={`text-[9px] px-2 ${sourceColor(customer.source)}`}>
                {customer.source}
              </Badge>
            </div>
            {customer.company && customer.company !== "-" && (
              <p className="text-sm text-muted-foreground mt-0.5">{customer.company}</p>
            )}
            {lastContact && (
              <p className="text-[11px] text-muted-foreground/70 mt-1">ติดต่อล่าสุด {lastContact}</p>
            )}
          </div>
          <Button
            onClick={onNavigate}
            size="sm"
            variant="outline"
            className="shrink-0 gap-1.5 text-xs border-orange-300 text-orange-600 hover:bg-orange-50"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            โปรไฟล์เต็ม
          </Button>
        </div>
      </div>

      {/* 2-column detail grid */}
      <div className="flex-1 p-5 grid grid-cols-1 lg:grid-cols-2 gap-5 content-start">

        {/* Contact card */}
        <div className="bg-card border rounded-xl p-4 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">ข้อมูลติดต่อ</p>
          <InfoRow icon={<Phone className="w-4 h-4" />} label="เบอร์โทร" value={
            <a href={`tel:${customer.phone}`} className="hover:text-orange-600 transition-colors">{customer.phone}</a>
          } />
          {customer.line_id && customer.line_id !== "-" && (
            <InfoRow icon={<MessageCircle className="w-4 h-4" />} label="LINE ID" value={customer.line_id} />
          )}
          {customer.email && (
            <InfoRow icon={<Mail className="w-4 h-4" />} label="อีเมล" value={customer.email} />
          )}
          {customer.province && (
            <InfoRow icon={<MapPin className="w-4 h-4" />} label="จังหวัด" value={customer.province} />
          )}
          {customer.fb_name && (
            <InfoRow icon={<Tag className="w-4 h-4" />} label="Facebook" value={customer.fb_name} />
          )}
          {customer.tiktok_username && (
            <InfoRow icon={<Tag className="w-4 h-4" />} label="TikTok" value={`@${customer.tiktok_username}`} />
          )}
        </div>

        {/* Profile card */}
        <div className="bg-card border rounded-xl p-4 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">ข้อมูลลูกค้า</p>
          <InfoRow icon={<Tag className="w-4 h-4" />} label="แหล่งที่มา" value={customer.source} />
          <InfoRow icon={<Hash className="w-4 h-4" />} label="กลุ่มลูกค้า" value={customer.segment} />
          <InfoRow icon={<User className="w-4 h-4" />} label="Sales ที่ดูแล" value={customer.created_by} />
          {customer.transferred_to && (
            <InfoRow icon={<User className="w-4 h-4" />} label="โอนให้" value={customer.transferred_to} />
          )}
          {customer.first_contact_date && (
            <InfoRow icon={<Calendar className="w-4 h-4" />} label="รู้จักกันตั้งแต่" value={thaiDate(customer.first_contact_date) ?? "—"} />
          )}
        </div>

        {/* History */}
        <div className="bg-card border rounded-xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">ประวัติการซื้อ</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{customer.total_trips}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">ครั้งที่ซื้อ</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-emerald-600 leading-tight">{thaiCurrency(customer.total_spend) || "—"}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">ยอดซื้อรวม</p>
            </div>
          </div>
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
          <div className="bg-card border rounded-xl p-4 lg:col-span-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">ความสนใจ</p>
            <div className="flex flex-wrap gap-1.5">
              {customer.interests!.map((tag) => (
                <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border border-orange-200/60">
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
  const obNames   = useActiveOBNames();
  const customers = useCRM((s) => s.customers);
  const allLeads  = useCRM((s) => s.leads);

  const [search, setSearch]               = useState("");
  const [sourceFilter, setSourceFilter]   = useState<Source | "all">("all");
  const [selectedId, setSelectedId]       = useState<string | null>(null);

  const obSet = useMemo(() => new Set(obNames), [obNames]);

  const salesCustomers = useMemo(
    () => customers.filter(
      (c) =>
        !obSet.has(c.created_by) &&
        !obSet.has(c.transferred_to ?? "") &&
        !obSet.has(c.transferred_from ?? ""),
    ),
    [customers, obSet],
  );

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
    return [...list].sort((a, b) =>
      (b.last_contacted_at ?? "").localeCompare(a.last_contacted_at ?? ""),
    );
  }, [salesCustomers, search, sourceFilter]);

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
        <div className="w-72 shrink-0 flex flex-col bg-card border rounded-xl overflow-hidden shadow-sm">
          {/* Search */}
          <div className="p-2.5 border-b border-border shrink-0">
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
                  selected={c.customer_id === selectedId}
                  onClick={() => setSelectedId(c.customer_id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Right: detail */}
        <div className="flex-1 bg-card border rounded-xl overflow-hidden shadow-sm flex flex-col">
          <DetailPanel
            customer={selectedCustomer}
            onNavigate={() => selectedId && navigate(`/marketing/customers/${selectedId}`)}
          />
        </div>
      </div>
    </div>
  );
}
