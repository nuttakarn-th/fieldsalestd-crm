/**
 * AdminAuditLog.tsx — Admin-only page: full system history + Restore
 * v2: compact rows + pagination (20/50/100)
 */

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/store/authStore";
import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";
import { toast } from "sonner";
import {
  Search, RefreshCw, RotateCcw, Filter,
  ChevronDown, ChevronUp, AlertTriangle, CheckCircle2,
  User, Package, Users, Megaphone, Calendar, Tag,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuditEntry {
  id: string;
  event_type: string;
  actor: string;
  role: string;
  department: string;
  subject: string;
  detail: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  meta: Record<string, unknown> | null;
  snapshot: Record<string, unknown> | null;
  restored_at: string | null;
  restored_by: string | null;
  created_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const EVENT_LABELS: Record<string, string> = {
  tour_added: "เพิ่มโปรแกรม", tour_deleted: "ลบโปรแกรม",
  tour_published: "เผยแพร่", tour_unpublished: "ซ่อนโปรแกรม",
  period_cancelled: "ยกเลิก Period", period_restored: "คืน Period",
  period_deleted: "ลบ Period", period_nearly_full: "Period ใกล้เต็ม",
  import_complete: "Import สำเร็จ",
  lead_added: "เพิ่ม Lead", lead_updated: "แก้ไข Lead",
  lead_deleted: "ลบ Lead", lead_won: "ปิดการขาย", lead_lost: "Lead หลุด",
  lead_status_changed: "เปลี่ยน Status",
  customer_added: "เพิ่มลูกค้า", customer_updated: "แก้ไขลูกค้า",
  customer_deleted: "ลบลูกค้า",
  campaign_added: "สร้าง Campaign", campaign_updated: "แก้ไข Campaign",
  campaign_deleted: "ลบ Campaign", campaign_status_changed: "เปลี่ยน Status",
  seat_booked: "จองที่นั่ง", seat_released: "คืนที่นั่ง",
};

const DELETE_EVENTS = new Set([
  "tour_deleted", "period_deleted", "customer_deleted", "lead_deleted",
]);

function eventBadgeClass(type: string): string {
  if (type.includes("deleted"))  return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  if (type.includes("added"))    return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  if (type.includes("updated") || type.includes("changed"))
    return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  if (type.includes("won"))      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
  if (type.includes("lost"))     return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
  if (type.includes("published")) return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
  return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
}

function entityIcon(type: string) {
  switch (type) {
    case "tour":     return <Package className="w-3.5 h-3.5" />;
    case "period":   return <Calendar className="w-3.5 h-3.5" />;
    case "customer": return <User className="w-3.5 h-3.5" />;
    case "lead":     return <Users className="w-3.5 h-3.5" />;
    case "campaign": return <Megaphone className="w-3.5 h-3.5" />;
    default:         return <Tag className="w-3.5 h-3.5" />;
  }
}

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("th-TH", {
    day: "2-digit", month: "short",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatDateFull(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("th-TH", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Restore logic ─────────────────────────────────────────────────────────────

async function restoreEntry(
  entry: AuditEntry,
  actorName: string,
): Promise<{ ok: boolean; message: string }> {
  if (!SUPABASE_ENABLED || !supabase)
    return { ok: false, message: "Supabase ไม่พร้อมใช้งาน" };

  try {
    // ── period_cancelled: un-cancel โดยไม่ต้องใช้ snapshot ──────────────────
    if (entry.event_type === "period_cancelled") {
      const tourId   = entry.entity_id;
      const meta     = entry.meta as { period_id?: string; start_date?: string } | null;
      const periodId = meta?.period_id;
      const startDate = meta?.start_date ?? entry.detail;
      if (!tourId) return { ok: false, message: "ไม่พบ tourId ใน log" };

      const { data: tourRow, error: fetchErr } = await supabase
        .from("tours").select("id, periods").eq("id", tourId).single();
      if (fetchErr || !tourRow) throw fetchErr ?? new Error("ไม่พบ Tour ในระบบ");

      const currentPeriods: Record<string, unknown>[] =
        Array.isArray(tourRow.periods) ? tourRow.periods : [];

      // หา period ด้วย period_id ก่อน ถ้าไม่มีให้ fallback ด้วย start_date
      const updatedPeriods = currentPeriods.map((p) => {
        const matchById   = periodId && p.period_id === periodId;
        const matchByDate = !periodId && startDate && p.start_date === startDate;
        if (matchById || matchByDate) return { ...p, cancelled: false };
        return p;
      });
      const changed = updatedPeriods.some(
        (p, i) => p.cancelled !== currentPeriods[i].cancelled,
      );
      if (!changed) return { ok: false, message: "ไม่พบ Period ที่ตรงกัน หรือ Period ไม่ได้ถูกยกเลิก" };

      const { error: updErr } = await supabase
        .from("tours").update({ periods: updatedPeriods }).eq("id", tourId);
      if (updErr) throw updErr;

    // ── Delete events: ต้องมี snapshot ──────────────────────────────────────
    } else {
      const snap = entry.snapshot;
      if (!snap) return { ok: false, message: "ไม่มี snapshot — ไม่สามารถ Restore ได้" };

    if (entry.event_type === "tour_deleted") {
      const { id, ...rest } = snap as Record<string, unknown>;
      const { error } = await supabase.from("tours").insert({ id: id ?? snap.id, ...rest });
      if (error) throw error;

    } else if (entry.event_type === "period_deleted") {
      const tourId = (snap._tourId ?? snap.tour_id) as string;
      if (!tourId) throw new Error("ไม่พบ tourId ใน snapshot");
      const { data: tourRow, error: fetchErr } = await supabase
        .from("tours").select("id, periods").eq("id", tourId).single();
      if (fetchErr || !tourRow) throw fetchErr ?? new Error("ไม่พบ Tour ในระบบ");
      const { _tourId, _tourTitle, _tourCode, _tourCountry, _tourContinent,
              _tourCategory, _tourDuration, _tourPeriod, ...periodData } =
        snap as Record<string, unknown>;
      void _tourId; void _tourTitle; void _tourCode; void _tourCountry;
      void _tourContinent; void _tourCategory; void _tourDuration; void _tourPeriod;
      const currentPeriods: unknown[] = Array.isArray(tourRow.periods) ? tourRow.periods : [];
      const exists = currentPeriods.some(
        (p) => (p as Record<string, unknown>).period_id === periodData.period_id,
      );
      if (exists) return { ok: false, message: "Period นี้มีอยู่ในระบบแล้ว" };
      const { error: updErr } = await supabase
        .from("tours").update({ periods: [...currentPeriods, periodData] }).eq("id", tourId);
      if (updErr) throw updErr;

    } else if (entry.event_type === "customer_deleted") {
      const { error } = await supabase.from("customers").insert(snap);
      if (error) throw error;

    } else if (entry.event_type === "lead_deleted") {
      const { error } = await supabase.from("leads").insert(snap);
      if (error) throw error;

    } else {
      return { ok: false, message: `ไม่รองรับ Restore: ${entry.event_type}` };
    }
    } // closes the outer else (delete events branch)

    await supabase
      .from("activity_log")
      .update({ restored_at: new Date().toISOString(), restored_by: actorName })
      .eq("id", entry.id);

    return { ok: true, message: "Restore สำเร็จ" };
  } catch (err: unknown) {
    return { ok: false, message: err instanceof Error ? err.message : JSON.stringify(err) };
  }
}

// ── Main component ────────────────────────────────────────────────────────────

const PAGE_SIZE_OPTIONS = [20, 50, 100];

export default function AdminAuditLog() {
  const { users, currentUserId } = useAuth();
  const currentUser = currentUserId ? users.find((u) => u.user_id === currentUserId) : null;
  const actorName = currentUser?.full_name ?? "Admin";

  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterEvent, setFilterEvent] = useState("all");
  const [filterDept, setFilterDept] = useState("all");
  const [filterActor, setFilterActor] = useState("all");
  const [showDeletedOnly, setShowDeletedOnly] = useState(false);

  // Pagination
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(1);

  const loadEntries = useCallback(async () => {
    if (!SUPABASE_ENABLED || !supabase) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) {
      console.error("[AdminAuditLog]", error);
      toast.error("โหลด Audit Log ล้มเหลว");
    } else {
      setEntries((data as AuditEntry[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void loadEntries(); }, [loadEntries]);

  const handleRestore = async (entry: AuditEntry) => {
    setRestoring(entry.id);
    const result = await restoreEntry(entry, actorName);
    if (result.ok) {
      toast.success(`Restore สำเร็จ — ${entry.entity_name || entry.detail}`);
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entry.id
            ? { ...e, restored_at: new Date().toISOString(), restored_by: actorName }
            : e,
        ),
      );
    } else {
      toast.error(`Restore ล้มเหลว: ${result.message}`);
    }
    setRestoring(null);
  };

  // Filtered
  const filtered = entries.filter((e) => {
    if (showDeletedOnly && !DELETE_EVENTS.has(e.event_type)) return false;
    if (filterEvent !== "all" && e.event_type !== filterEvent) return false;
    if (filterDept !== "all" && e.department !== filterDept) return false;
    if (filterActor !== "all" && e.actor !== filterActor) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        e.actor.toLowerCase().includes(q) ||
        e.subject.toLowerCase().includes(q) ||
        e.detail.toLowerCase().includes(q) ||
        e.entity_name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, filterEvent, filterDept, filterActor, showDeletedOnly, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const uniqueActors = Array.from(new Set(entries.map((e) => e.actor))).sort();
  const uniqueEvents = Array.from(new Set(entries.map((e) => e.event_type))).sort();
  const pendingRestore = filtered.filter((e) => DELETE_EVENTS.has(e.event_type) && !e.restored_at).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">System Audit Log</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            ประวัติการเปลี่ยนแปลงทั้งหมดในระบบ — Admin Only
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void loadEntries()} disabled={loading} className="gap-1.5">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 mb-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
          {/* Search */}
          <div className="relative col-span-2 sm:col-span-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input
              placeholder="ค้นหา..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          {/* Event */}
          <Select value={filterEvent} onValueChange={setFilterEvent}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Event" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Event ทั้งหมด</SelectItem>
              {uniqueEvents.map((ev) => (
                <SelectItem key={ev} value={ev}>{EVENT_LABELS[ev] ?? ev}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Dept */}
          <Select value={filterDept} onValueChange={setFilterDept}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="แผนก" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">แผนกทั้งหมด</SelectItem>
              <SelectItem value="OB">OB</SelectItem>
              <SelectItem value="Sales">Sales</SelectItem>
              <SelectItem value="Marketing">Marketing</SelectItem>
              <SelectItem value="System">System</SelectItem>
            </SelectContent>
          </Select>
          {/* Actor */}
          <Select value={filterActor} onValueChange={setFilterActor}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="ผู้ใช้" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ผู้ใช้ทั้งหมด</SelectItem>
              {uniqueActors.map((a) => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-2">
          {/* Deleted-only toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showDeletedOnly}
              onChange={(e) => setShowDeletedOnly(e.target.checked)}
              className="rounded border-gray-300 w-3.5 h-3.5"
            />
            <span className="text-xs text-gray-600 dark:text-gray-400">แสดงเฉพาะรายการที่ถูกลบ</span>
          </label>

          {/* Page size selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500 dark:text-gray-400">แสดง</span>
            {PAGE_SIZE_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => setPageSize(n)}
                className={`text-xs px-2 py-0.5 rounded border transition-colors
                  ${pageSize === n
                    ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white"
                    : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400"
                  }`}
              >
                {n}
              </button>
            ))}
            <span className="text-xs text-gray-500 dark:text-gray-400">รายการ/หน้า</span>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="flex items-center gap-3 mb-2 flex-wrap">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {filtered.length} รายการ (จาก {entries.length})
          {filtered.length > 0 && ` · หน้า ${page}/${totalPages}`}
        </span>
        {pendingRestore > 0 && (
          <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0 gap-1 text-xs py-0">
            <AlertTriangle className="w-3 h-3" />
            {pendingRestore} ยังไม่ได้ Restore
          </Badge>
        )}
        <div className="flex items-center gap-1 ml-auto">
          <span className="text-xs text-gray-400 mr-1">ตัวกรอง:</span>
          {[
            { label: "ทั้งหมด", event: "all", dept: "all", actor: "all", deleted: false },
          ].length === 0 && null}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" />
          กำลังโหลด...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-sm text-gray-400 dark:text-gray-600">
          ไม่พบรายการที่ตรงกับเงื่อนไข
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[24px_130px_1fr_90px_80px_100px] gap-2 px-3 py-1.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              <div />
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">Event</div>
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">รายละเอียด</div>
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">ผู้ใช้</div>
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">วันที่</div>
              <div />
            </div>

            {paginated.map((entry, idx) => {
              const isDeleted = DELETE_EVENTS.has(entry.event_type);
              const isCancelled = entry.event_type === "period_cancelled";
              const hasSnapshot = !!entry.snapshot;
              const isRestored = !!entry.restored_at;
              const isExpanded = expandedId === entry.id;
              const isLast = idx === paginated.length - 1;

              return (
                <div key={entry.id}>
                  {/* Main row */}
                  <div
                    className={`
                      grid grid-cols-[24px_130px_1fr_90px_80px_100px] gap-2 px-3 py-1.5 items-center
                      ${!isLast || isExpanded ? "border-b border-gray-100 dark:border-gray-800" : ""}
                      ${(isDeleted || isCancelled) && !isRestored ? "bg-red-50/40 dark:bg-red-950/10" : "hover:bg-gray-50 dark:hover:bg-gray-800/30"}
                      transition-colors
                    `}
                  >
                    {/* Entity icon */}
                    <div className="text-gray-400 dark:text-gray-600 flex items-center justify-center">
                      {entityIcon(entry.entity_type)}
                    </div>

                    {/* Event badge */}
                    <div className="flex items-center gap-1 min-w-0">
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded whitespace-nowrap truncate max-w-full ${eventBadgeClass(entry.event_type)}`}>
                        {EVENT_LABELS[entry.event_type] ?? entry.event_type}
                      </span>
                      {isRestored && (
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" title="Restored" />
                      )}
                    </div>

                    {/* Detail */}
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate leading-tight">
                        {entry.entity_name || entry.subject}
                      </p>
                      {entry.detail && (
                        <p className="text-xs text-gray-400 dark:text-gray-600 truncate leading-tight">
                          {entry.detail}
                        </p>
                      )}
                    </div>

                    {/* Actor */}
                    <div className="min-w-0">
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{entry.actor}</p>
                      {entry.department && entry.department !== "System" && (
                        <p className="text-xs text-gray-400 dark:text-gray-600 truncate">[{entry.department}]</p>
                      )}
                    </div>

                    {/* Date */}
                    <div className="text-xs text-gray-400 dark:text-gray-600 whitespace-nowrap">
                      {formatDateShort(entry.created_at)}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-1">
                      {(hasSnapshot || entry.meta) && (
                        <button
                          className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                          title="ดูรายละเอียด"
                        >
                          {isExpanded
                            ? <ChevronUp className="w-3.5 h-3.5" />
                            : <ChevronDown className="w-3.5 h-3.5" />
                          }
                        </button>
                      )}
                      {((isDeleted && hasSnapshot) || isCancelled) && !isRestored && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-xs gap-1 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                          disabled={restoring === entry.id}
                          onClick={() => void handleRestore(entry)}
                        >
                          {restoring === entry.id
                            ? <RefreshCw className="w-3 h-3 animate-spin" />
                            : <RotateCcw className="w-3 h-3" />
                          }
                          Restore
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Expanded snapshot */}
                  {isExpanded && (
                    <div className={`px-4 py-3 bg-gray-50 dark:bg-gray-800/50 ${!isLast ? "border-b border-gray-100 dark:border-gray-800" : ""}`}>
                      <div className="flex items-center gap-4 mb-2 flex-wrap">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          Snapshot — {formatDateFull(entry.created_at)}
                        </p>
                        {isRestored && entry.restored_by && (
                          <p className="text-xs text-emerald-600 dark:text-emerald-500">
                            ✓ Restore โดย {entry.restored_by} · {formatDateFull(entry.restored_at!)}
                          </p>
                        )}
                      </div>
                      <pre className="text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900 rounded-lg p-3 overflow-auto max-h-48 font-mono border border-gray-200 dark:border-gray-700">
                        {JSON.stringify(entry.snapshot ?? entry.meta, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                หน้า {page} / {totalPages} · รายการ {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} จาก {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline" size="icon"
                  className="w-7 h-7"
                  disabled={page === 1}
                  onClick={() => setPage(1)}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                {/* Page number chips */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let p: number;
                  if (totalPages <= 5) p = i + 1;
                  else if (page <= 3) p = i + 1;
                  else if (page >= totalPages - 2) p = totalPages - 4 + i;
                  else p = page - 2 + i;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-7 h-7 text-xs rounded border transition-colors
                        ${p === page
                          ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white font-medium"
                          : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400"
                        }`}
                    >
                      {p}
                    </button>
                  );
                })}
                <Button
                  variant="outline" size="icon"
                  className="w-7 h-7"
                  disabled={page === totalPages}
                  onClick={() => setPage(totalPages)}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
