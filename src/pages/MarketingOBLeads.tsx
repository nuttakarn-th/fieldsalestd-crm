/**
 * MarketingOBLeads.tsx — OB Leads view for Marketing role
 *
 * Route: /marketing/ob-leads
 * จุดประสงค์: ติดตาม pipeline ของ OB team แบบ card view
 * แสดง: ชื่อลูกค้า, สถานะ OB lead, pax, coordinator, วันนัด
 */

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Users2, Phone, Calendar, ChevronRight, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCRM, isClosedStatus, isLostStatus, type Customer, type Lead } from "@/store/crmStore";
import { useActiveOBNames } from "@/store/authStore";

// ── Helpers ───────────────────────────────────────────────────────────────────

function thaiDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso.includes("T") ? iso : iso + "T00:00:00");
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

function obStatusMeta(status: string) {
  switch (status) {
    case "ใหม่":
      return { label: "ใหม่",            color: "bg-slate-100 text-slate-600 border-slate-200",  dot: "bg-slate-400"   };
    case "ติดต่อแล้ว":
    case "ตอบแล้ว":
      return { label: "ตอบแล้ว",        color: "bg-blue-100 text-blue-700 border-blue-200",     dot: "bg-blue-500"    };
    case "ส่ง Quote แล้ว":
      return { label: "ส่ง Quote แล้ว", color: "bg-violet-100 text-violet-700 border-violet-200", dot: "bg-violet-500" };
    case "กำลังเจรจา":
      return { label: "กำลังเจรจา",     color: "bg-amber-100 text-amber-700 border-amber-200",  dot: "bg-amber-500"   };
    case "จองแล้ว":
      return { label: "จองแล้ว ✅",     color: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" };
    case "ยกเลิก":
      return { label: "ยกเลิก",         color: "bg-red-100 text-red-600 border-red-200",         dot: "bg-red-400"     };
    default:
      return { label: status,            color: "bg-muted text-muted-foreground border-border",   dot: "bg-muted-foreground" };
  }
}

// Priority sort: active deals first, then new, then closed/lost
function leadPriority(status: string): number {
  if (status === "กำลังเจรจา" || status === "กำลังเจรจา") return 0;
  if (status === "ส่ง Quote แล้ว")                           return 1;
  if (status === "ตอบแล้ว" || status === "ติดต่อแล้ว")       return 2;
  if (status === "ใหม่")                                      return 3;
  if (isClosedStatus(status))                                return 4;
  if (isLostStatus(status))                                  return 5;
  return 6;
}

// STATUS filter tabs
const STATUS_GROUPS = [
  { key: "active", label: "Active",     statuses: ["ใหม่", "ติดต่อแล้ว", "ตอบแล้ว", "ส่ง Quote แล้ว", "กำลังเจรจา", "กำลังเจรจา"] },
  { key: "won",    label: "จองแล้ว ✅", statuses: ["จองแล้ว", "จองแล้ว"] },
  { key: "lost",   label: "ยกเลิก",    statuses: ["ยกเลิก", "ยกเลิก"] },
  { key: "all",    label: "ทั้งหมด",   statuses: [] },
] as const;

// ── Sub-component: Customer Card ──────────────────────────────────────────────

interface OBCardProps {
  customer: Customer;
  activeLead: Lead | undefined;
  onClick: () => void;
}

function OBCard({ customer, activeLead, onClick }: OBCardProps) {
  const meta = activeLead ? obStatusMeta(activeLead.status) : obStatusMeta("New");

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-card rounded-xl border shadow-sm p-4 hover:shadow-md hover:border-purple-300/60 transition-all group"
    >
      {/* Top row: name + status */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{customer.full_name}</p>
          {customer.company && customer.company !== "-" && (
            <p className="text-[11px] text-muted-foreground truncate">{customer.company}</p>
          )}
        </div>
        <Badge variant="outline" className={`text-[10px] shrink-0 ${meta.color}`}>
          {meta.label}
        </Badge>
      </div>

      {/* Lead info */}
      {activeLead && (
        <div className="space-y-1.5 mb-3">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground/80 truncate">{activeLead.program || activeLead.bu_type}</span>
            <span>·</span>
            <span>{activeLead.pax_count} ท่าน</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users2 className="w-3 h-3" />
              {activeLead.assigned_to}
            </span>
            {activeLead.next_followup_date && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {thaiDate(activeLead.next_followup_date)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Bottom row: phone + source + arrow */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Phone className="w-3 h-3" />
            {customer.phone}
          </span>
          <Badge variant="outline" className="text-[9px] py-0 px-1.5 h-4">
            {customer.source}
          </Badge>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-purple-500 transition-colors" />
      </div>
    </button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function MarketingOBLeads() {
  const navigate   = useNavigate();
  const obNames    = useActiveOBNames();
  const allLeads   = useCRM((s) => s.leads);
  const customers  = useCRM((s) => s.customers);

  const [search, setSearch]     = useState("");
  const [statusGroup, setStatusGroup] = useState<"active" | "won" | "lost" | "all">("active");

  const obSet = useMemo(() => new Set(obNames), [obNames]);

  // OB customers: created by / transferred to/from OB Co-ordinator
  const obCustomers = useMemo(
    () => customers.filter(
      (c) => obSet.has(c.created_by) || obSet.has(c.transferred_to ?? "") || obSet.has(c.transferred_from ?? "")
    ),
    [customers, obSet],
  );

  // Map: customer_id → most recent / most active OB lead
  const latestLeadByCustomer = useMemo(() => {
    const map = new Map<string, Lead>();
    allLeads
      .filter((l) => obSet.has(l.assigned_to))
      .forEach((l) => {
        const cur = map.get(l.customer_id);
        if (!cur || leadPriority(l.status) < leadPriority(cur.status)) {
          map.set(l.customer_id, l);
        }
      });
    return map;
  }, [allLeads, obSet]);

  // Filter by status group
  const groupStatuses = STATUS_GROUPS.find((g) => g.key === statusGroup)?.statuses ?? [];

  const filtered = useMemo(() => {
    let list = obCustomers;

    // Status group filter
    if (statusGroup !== "all") {
      list = list.filter((c) => {
        const lead = latestLeadByCustomer.get(c.customer_id);
        const s = lead?.status ?? "New";
        return (groupStatuses as readonly string[]).includes(s);
      });
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.full_name.toLowerCase().includes(q) ||
          (c.company ?? "").toLowerCase().includes(q) ||
          c.phone.includes(q),
      );
    }

    // Sort: active leads first by priority, then by last_contacted
    return [...list].sort((a, b) => {
      const la = latestLeadByCustomer.get(a.customer_id);
      const lb = latestLeadByCustomer.get(b.customer_id);
      const pa = leadPriority(la?.status ?? "New");
      const pb = leadPriority(lb?.status ?? "New");
      if (pa !== pb) return pa - pb;
      return (b.last_contacted_at ?? "").localeCompare(a.last_contacted_at ?? "");
    });
  }, [obCustomers, search, statusGroup, latestLeadByCustomer, groupStatuses]);

  // Stats per group
  const stats = useMemo(() => {
    const result: Record<string, number> = { active: 0, won: 0, lost: 0, all: obCustomers.length };
    obCustomers.forEach((c) => {
      const s = latestLeadByCustomer.get(c.customer_id)?.status ?? "New";
      if (["ใหม่","ติดต่อแล้ว","ตอบแล้ว","ส่ง Quote แล้ว","กำลังเจรจา","กำลังเจรจา"].includes(s)) result.active++;
      else if (isClosedStatus(s)) result.won++;
      else if (isLostStatus(s))   result.lost++;
    });
    return result;
  }, [obCustomers, latestLeadByCustomer]);

  return (
    <div className="p-4 sm:p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-violet-500 flex items-center justify-center shadow-md">
          <Users2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold">OB Leads</h1>
          <p className="text-sm text-muted-foreground">
            ลูกค้า Outbound {obCustomers.length} ราย · ทีม {obNames.length} คน
          </p>
        </div>
      </div>

      {/* Status group tabs */}
      <div className="flex items-center gap-1 border-b border-border pb-3">
        {STATUS_GROUPS.map((g) => (
          <button
            key={g.key}
            onClick={() => setStatusGroup(g.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              statusGroup === g.key
                ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                : "text-muted-foreground hover:bg-muted/60"
            }`}
          >
            {g.label}
            <span className={`text-[10px] rounded-full px-1.5 py-0.5 font-bold ${
              statusGroup === g.key ? "bg-purple-500 text-white" : "bg-muted text-muted-foreground"
            }`}>
              {stats[g.key]}
            </span>
          </button>
        ))}

        {/* Search */}
        <div className="relative ml-auto w-52">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="ค้นหาชื่อ / เบอร์..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {/* Card grid */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <Users2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">ไม่พบลูกค้าในกลุ่มนี้</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((c) => (
            <OBCard
              key={c.customer_id}
              customer={c}
              activeLead={latestLeadByCustomer.get(c.customer_id)}
              onClick={() => navigate(`/marketing/customers/${c.customer_id}`)}
            />
          ))}
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground pt-2">
        แสดง {filtered.length} / {obCustomers.length} ราย
      </p>
    </div>
  );
}
