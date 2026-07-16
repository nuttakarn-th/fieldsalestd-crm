/**
 * MarketingSalesLeads.tsx — Sales Leads view for Marketing role
 *
 * Route: /marketing/sales-leads
 * จุดประสงค์: ข้อมูลติดต่อลูกค้า Sales — เน้น contact + source + company
 * แสดง: table view พร้อม search, filter by source, export CSV
 */

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Download, Users, Phone, MessageCircle,
  SlidersHorizontal, X, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCRM, SOURCES, type Customer, type Source } from "@/store/crmStore";
import { useActiveOBNames } from "@/store/authStore";
import { toast } from "sonner";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso.includes("T") ? iso : iso + "T00:00:00");
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
}

const SOURCE_COLOR: Record<string, string> = {
  "FB":         "bg-blue-100 text-blue-700 border-blue-200",
  "Line OA":    "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Website":    "bg-sky-100 text-sky-700 border-sky-200",
  "TikTok":     "bg-pink-100 text-pink-700 border-pink-200",
  "Google":     "bg-amber-100 text-amber-700 border-amber-200",
  "Field Sale": "bg-purple-100 text-purple-700 border-purple-200",
  "Walk-in":    "bg-orange-100 text-orange-700 border-orange-200",
  "Referral":   "bg-teal-100 text-teal-700 border-teal-200",
  "Agent":      "bg-violet-100 text-violet-700 border-violet-200",
};

function sourceColor(s: string) {
  return SOURCE_COLOR[s] ?? "bg-muted text-muted-foreground border-border";
}

const PAGE_SIZE = 30;

// ── Export CSV ────────────────────────────────────────────────────────────────
function exportCSV(customers: Customer[]) {
  const BOM = "﻿";
  const header = ["ชื่อ-นามสกุล", "องค์กร", "เบอร์โทร", "Line ID", "อีเมล", "จังหวัด", "ช่องทาง", "กลุ่มลูกค้า", "Sales ที่ดูแล", "วันที่ติดต่อล่าสุด"];
  const rows = customers.map((c) => [
    c.full_name,
    c.company ?? "",
    c.phone,
    c.line_id ?? "",
    c.email ?? "",
    c.province ?? "",
    c.source,
    c.segment,
    c.created_by,
    c.last_contacted_at ? new Date(c.last_contacted_at).toLocaleDateString("th-TH") : "",
  ]);
  const csv = BOM + [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sales_leads_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`Export ${customers.length} รายการแล้ว ✅`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function MarketingSalesLeads() {
  const navigate   = useNavigate();
  const obNames    = useActiveOBNames();
  const customers  = useCRM((s) => s.customers);

  const [search,     setSearch]     = useState("");
  const [sourceFilter, setSourceFilter] = useState<Source | "all">("all");
  const [segFilter,  setSegFilter]  = useState<string>("all");
  const [page,       setPage]       = useState(1);

  const obSet = useMemo(() => new Set(obNames), [obNames]);

  // Sales customers: NOT in OB pool
  const salesCustomers = useMemo(
    () => customers.filter(
      (c) =>
        !obSet.has(c.created_by) &&
        !obSet.has(c.transferred_to ?? "") &&
        !obSet.has(c.transferred_from ?? ""),
    ),
    [customers, obSet],
  );

  // Distinct segments in this set
  const segments = useMemo(
    () => Array.from(new Set(salesCustomers.map((c) => c.segment))).sort(),
    [salesCustomers],
  );

  // Filtered list
  const filtered = useMemo(() => {
    let list = salesCustomers;
    if (sourceFilter !== "all") list = list.filter((c) => c.source === sourceFilter);
    if (segFilter !== "all")    list = list.filter((c) => c.segment === segFilter);
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
    return list.slice().sort((a, b) =>
      (b.last_contacted_at ?? "").localeCompare(a.last_contacted_at ?? ""),
    );
  }, [salesCustomers, search, sourceFilter, segFilter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page on filter change
  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleSource = (v: string) => { setSourceFilter(v as Source | "all"); setPage(1); };
  const handleSeg    = (v: string) => { setSegFilter(v); setPage(1); };

  const hasFilters = sourceFilter !== "all" || segFilter !== "all" || search.trim();

  return (
    <div className="p-4 sm:p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-md">
          <Users className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Sales Leads</h1>
          <p className="text-sm text-muted-foreground">
            ลูกค้า Sales {salesCustomers.length} ราย
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto gap-1.5"
          onClick={() => exportCSV(filtered)}
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="ค้นหาชื่อ, องค์กร, เบอร์, อีเมล..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>

        {/* Source filter */}
        <Select value={sourceFilter} onValueChange={handleSource}>
          <SelectTrigger className="w-36 h-9 text-xs">
            <SlidersHorizontal className="w-3 h-3 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="ช่องทาง" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกช่องทาง</SelectItem>
            {SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Segment filter */}
        <Select value={segFilter} onValueChange={handleSeg}>
          <SelectTrigger className="w-36 h-9 text-xs">
            <SelectValue placeholder="กลุ่มลูกค้า" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกกลุ่ม</SelectItem>
            {segments.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Clear filters */}
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 gap-1 text-muted-foreground"
            onClick={() => { handleSearch(""); handleSource("all"); handleSeg("all"); }}
          >
            <X className="w-3.5 h-3.5" /> ล้าง
          </Button>
        )}

        <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
          {filtered.length} รายการ
        </span>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b border-border/60">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">ชื่อ / องค์กร</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">ติดต่อ</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">ช่องทาง</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">กลุ่ม</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Sales</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">ติดต่อล่าสุด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {pageData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground text-sm">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    ไม่พบรายการ
                  </td>
                </tr>
              ) : (
                pageData.map((c) => (
                  <tr
                    key={c.customer_id}
                    onClick={() => navigate(`/marketing/customers/${c.customer_id}`)}
                    className="hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    {/* ชื่อ / องค์กร */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-sm">{c.full_name}</p>
                      {c.company && c.company !== "-" && (
                        <p className="text-[11px] text-muted-foreground truncate max-w-[160px]">{c.company}</p>
                      )}
                    </td>

                    {/* ติดต่อ */}
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          <span>{c.phone}</span>
                        </div>
                        {c.line_id && (
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <MessageCircle className="w-3 h-3 text-emerald-500" />
                            <span>{c.line_id}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* ช่องทาง */}
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`text-[10px] ${sourceColor(c.source)}`}>
                        {c.source}
                      </Badge>
                    </td>

                    {/* กลุ่มลูกค้า */}
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted-foreground">{c.segment}</span>
                    </td>

                    {/* Sales rep */}
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium">{c.created_by}</span>
                      {c.transferred_to && (
                        <p className="text-[10px] text-muted-foreground">→ {c.transferred_to}</p>
                      )}
                    </td>

                    {/* วันติดต่อล่าสุด */}
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted-foreground">
                        {fmtDate(c.last_contacted_at ?? c.created_at)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-border/50 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              หน้า {page} / {totalPages} · {filtered.length} รายการ
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
