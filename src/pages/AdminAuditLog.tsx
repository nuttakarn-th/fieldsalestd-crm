/**
 * AdminAuditLog.tsx — Admin-only page: full system history + Restore
 *
 * แสดงทุก event จาก activity_log (Supabase)
 * กรองตาม event_type / actor / department / วันที่
 * มีปุ่ม Restore สำหรับ entries ที่มี snapshot (deleted items)
 */

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/store/authStore";
import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";
import { toast } from "sonner";
import {
  Search,
  RefreshCw,
  RotateCcw,
  Filter,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  Package,
  Users,
  Megaphone,
  Calendar,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
  tour_added:         "เพิ่มโปรแกรม",
  tour_deleted:       "ลบโปรแกรม",
  tour_published:     "เผยแพร่โปรแกรม",
  tour_unpublished:   "ซ่อนโปรแกรม",
  period_cancelled:   "ยกเลิก Period",
  period_restored:    "คืนค่า Period",
  period_deleted:     "ลบ Period",
  period_nearly_full: "Period ใกล้เต็ม",
  import_complete:    "Import สำเร็จ",
  lead_added:         "เพิ่ม Lead",
  lead_updated:       "แก้ไข Lead",
  lead_deleted:       "ลบ Lead",
  lead_won:           "Lead ปิดการขาย",
  lead_lost:          "Lead หลุด",
  lead_status_changed:"เปลี่ยน Status Lead",
  customer_added:     "เพิ่มลูกค้า",
  customer_updated:   "แก้ไขลูกค้า",
  customer_deleted:   "ลบลูกค้า",
  campaign_added:     "สร้าง Campaign",
  campaign_updated:   "แก้ไข Campaign",
  campaign_deleted:   "ลบ Campaign",
  campaign_status_changed: "เปลี่ยน Status Campaign",
  seat_booked:        "จองที่นั่ง",
  seat_released:      "คืนที่นั่ง",
};

const DELETE_EVENTS = new Set([
  "tour_deleted",
  "period_deleted",
  "customer_deleted",
  "lead_deleted",
]);

function eventBadgeClass(type: string): string {
  if (type.includes("deleted"))    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  if (type.includes("added"))      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  if (type.includes("updated") || type.includes("changed"))
                                   return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  if (type.includes("won"))        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
  if (type.includes("lost"))       return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
  if (type.includes("published"))  return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
  return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
}

function entityIcon(type: string) {
  switch (type) {
    case "tour":     return <Package className="w-4 h-4" />;
    case "period":   return <Calendar className="w-4 h-4" />;
    case "customer": return <User className="w-4 h-4" />;
    case "lead":     return <Users className="w-4 h-4" />;
    case "campaign": return <Megaphone className="w-4 h-4" />;
    default:         return <Tag className="w-4 h-4" />;
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("th-TH", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Restore logic ─────────────────────────────────────────────────────────────

async function restoreEntry(
  entry: AuditEntry,
  actorName: string
): Promise<{ ok: boolean; message: string }> {
  if (!SUPABASE_ENABLED || !supabase) {
    return { ok: false, message: "Supabase ไม่พร้อมใช้งาน" };
  }
  const snap = entry.snapshot;
  if (!snap) return { ok: false, message: "ไม่มี snapshot — ไม่สามารถ Restore ได้" };

  try {
    if (entry.event_type === "tour_deleted") {
      // Re-insert tour row from snapshot
      const { id, ...rest } = snap as Record<string, unknown>;
      const { error } = await supabase.from("tours").insert({ id: id ?? snap.id, ...rest });
      if (error) throw error;

    } else if (entry.event_type === "period_deleted") {
      // Fetch current tour's periods array and append the period back
      const tourId = (snap._tourId ?? snap.tour_id) as string;
      if (!tourId) throw new Error("ไม่พบ tourId ใน snapshot");

      const { data: tourRow, error: fetchErr } = await supabase
        .from("tours")
        .select("id, periods")
        .eq("id", tourId)
        .single();
      if (fetchErr || !tourRow) throw fetchErr ?? new Error("ไม่พบ Tour ในระบบ");

      // Remove internal meta fields added to snapshot
      const { _tourId, _tourTitle, _tourCode, _tourCountry, _tourContinent, _tourCategory, _tourDuration, _tourPeriod, ...periodData } = snap as Record<string, unknown>;
      void _tourId; void _tourTitle; void _tourCode; void _tourCountry; void _tourContinent; void _tourCategory; void _tourDuration; void _tourPeriod;

      const currentPeriods: unknown[] = Array.isArray(tourRow.periods) ? tourRow.periods : [];
      // Only add if not already present
      const exists = currentPeriods.some(
        (p) => (p as Record<string, unknown>).period_id === periodData.period_id
      );
      if (exists) return { ok: false, message: "Period นี้มีอยู่ในระบบแล้ว" };

      const newPeriods = [...currentPeriods, periodData];
      const { error: updErr } = await supabase
        .from("tours")
        .update({ periods: newPeriods })
        .eq("id", tourId);
      if (updErr) throw updErr;

    } else if (entry.event_type === "customer_deleted") {
      const { error } = await supabase.from("customers").insert(snap);
      if (error) throw error;

    } else if (entry.event_type === "lead_deleted") {
      const { error } = await supabase.from("leads").insert(snap);
      if (error) throw error;

    } else {
      return { ok: false, message: `ไม่รองรับ Restore สำหรับ event: ${entry.event_type}` };
    }

    // Mark as restored in activity_log
    await supabase
      .from("activity_log")
      .update({ restored_at: new Date().toISOString(), restored_by: actorName })
      .eq("id", entry.id);

    return { ok: true, message: "Restore สำเร็จ" };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    return { ok: false, message: msg };
  }
}

// ── Main component ────────────────────────────────────────────────────────────

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
  const [filterActor, setFilterActor] = useState("");
  const [showDeletedOnly, setShowDeletedOnly] = useState(false);

  const loadEntries = useCallback(async () => {
    if (!SUPABASE_ENABLED || !supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      console.error("[AdminAuditLog] load error:", error);
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
      // Update local state to show restored_at
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entry.id
            ? { ...e, restored_at: new Date().toISOString(), restored_by: actorName }
            : e
        )
      );
    } else {
      toast.error(`Restore ล้มเหลว: ${result.message}`);
    }
    setRestoring(null);
  };

  // Apply filters
  const filtered = entries.filter((e) => {
    if (showDeletedOnly && !DELETE_EVENTS.has(e.event_type)) return false;
    if (filterEvent !== "all" && e.event_type !== filterEvent) return false;
    if (filterDept !== "all" && e.department !== filterDept) return false;
    if (filterActor && !e.actor.toLowerCase().includes(filterActor.toLowerCase())) return false;
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

  const uniqueActors = Array.from(new Set(entries.map((e) => e.actor))).sort();
  const uniqueEvents = Array.from(new Set(entries.map((e) => e.event_type))).sort();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            System Audit Log
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            ประวัติการเปลี่ยนแปลงทั้งหมดในระบบ — Admin Only
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void loadEntries()}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 mb-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400">
          <Filter className="w-4 h-4" />
          ตัวกรอง
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="ค้นหา..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Event type */}
          <Select value={filterEvent} onValueChange={setFilterEvent}>
            <SelectTrigger>
              <SelectValue placeholder="Event ทั้งหมด" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Event ทั้งหมด</SelectItem>
              {uniqueEvents.map((ev) => (
                <SelectItem key={ev} value={ev}>
                  {EVENT_LABELS[ev] ?? ev}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Department */}
          <Select value={filterDept} onValueChange={setFilterDept}>
            <SelectTrigger>
              <SelectValue placeholder="แผนกทั้งหมด" />
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
          <Select
            value={filterActor || "all"}
            onValueChange={(v) => setFilterActor(v === "all" ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="ผู้ใช้ทั้งหมด" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ผู้ใช้ทั้งหมด</SelectItem>
              {uniqueActors.map((a) => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Deleted-only toggle */}
        <label className="flex items-center gap-2 cursor-pointer w-fit">
          <input
            type="checkbox"
            checked={showDeletedOnly}
            onChange={(e) => setShowDeletedOnly(e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            แสดงเฉพาะรายการที่ถูกลบ (Restorable)
          </span>
        </label>
      </div>

      {/* Stats strip */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          แสดง <span className="font-semibold text-gray-900 dark:text-white">{filtered.length}</span>
          {" "}จาก{" "}
          <span className="font-semibold text-gray-900 dark:text-white">{entries.length}</span> รายการ
        </div>
        {filtered.filter((e) => DELETE_EVENTS.has(e.event_type) && !e.restored_at).length > 0 && (
          <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0 gap-1">
            <AlertTriangle className="w-3 h-3" />
            {filtered.filter((e) => DELETE_EVENTS.has(e.event_type) && !e.restored_at).length} รายการยังไม่ถูก Restore
          </Badge>
        )}
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <RefreshCw className="w-6 h-6 animate-spin mr-2" />
          กำลังโหลด...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400 dark:text-gray-600">
          ไม่พบรายการที่ตรงกับเงื่อนไข
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => {
            const isDeleted = DELETE_EVENTS.has(entry.event_type);
            const hasSnapshot = !!entry.snapshot;
            const isRestored = !!entry.restored_at;
            const isExpanded = expandedId === entry.id;

            return (
              <div
                key={entry.id}
                className={`
                  bg-white dark:bg-gray-900 rounded-xl border transition-all
                  ${isDeleted && !isRestored
                    ? "border-red-200 dark:border-red-900/50"
                    : "border-gray-200 dark:border-gray-800"}
                `}
              >
                {/* Main row */}
                <div className="flex items-start gap-3 p-4">
                  {/* Entity icon */}
                  <div className="mt-0.5 w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 flex-shrink-0">
                    {entityIcon(entry.entity_type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Event badge */}
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${eventBadgeClass(entry.event_type)}`}>
                          {EVENT_LABELS[entry.event_type] ?? entry.event_type}
                        </span>
                        {/* Department badge */}
                        {entry.department && entry.department !== "System" && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                            {entry.department}
                          </span>
                        )}
                        {/* Restored badge */}
                        {isRestored && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Restored
                          </span>
                        )}
                      </div>

                      {/* Timestamp */}
                      <span className="text-xs text-gray-400 dark:text-gray-600 flex items-center gap-1 flex-shrink-0">
                        <Clock className="w-3 h-3" />
                        {formatDate(entry.created_at)}
                      </span>
                    </div>

                    {/* Subject + detail */}
                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                      {entry.subject}
                    </p>
                    {entry.detail && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                        {entry.detail}
                      </p>
                    )}

                    {/* Actor */}
                    <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
                      โดย: <span className="text-gray-600 dark:text-gray-400 font-medium">{entry.actor}</span>
                      {entry.role && ` · ${entry.role}`}
                    </p>

                    {/* Restore info */}
                    {isRestored && entry.restored_by && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">
                        Restore โดย: {entry.restored_by} · {formatDate(entry.restored_at!)}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Expand button (if has snapshot) */}
                    {(hasSnapshot || entry.meta) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8"
                        onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    )}

                    {/* Restore button */}
                    {isDeleted && hasSnapshot && !isRestored && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700"
                        disabled={restoring === entry.id}
                        onClick={() => void handleRestore(entry)}
                      >
                        {restoring === entry.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3.5 h-3.5" />
                        )}
                        Restore
                      </Button>
                    )}
                  </div>
                </div>

                {/* Expanded snapshot / meta */}
                {isExpanded && (
                  <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-3">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                      Snapshot Data
                    </p>
                    <pre className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg p-3 overflow-auto max-h-64 font-mono">
                      {JSON.stringify(entry.snapshot ?? entry.meta, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
