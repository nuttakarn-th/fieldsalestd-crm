/**
 * AuditTrailList — แสดงประวัติการแก้ไขจากตาราง audit_trail
 * (บันทึกโดย DB trigger ทุกครั้งที่ เพิ่ม/แก้/ลบ ลูกค้า, Lead, การจอง, โปรแกรม, Period)
 * ผู้แก้ไขมาจาก JWT ของผู้ที่ล็อกอิน → ปลอมหรือลบประวัติจากหน้าเว็บไม่ได้
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

export interface AuditRow {
  id: number;
  created_at: string;
  actor_name: string | null;
  table_name: string;
  action: string;
  record_label: string | null;
  summary: string | null;
}

const TABLE_LABEL: Record<string, string> = {
  customers: "ลูกค้า",
  leads: "Lead",
  bookings: "การจอง",
  periods: "Period",
  tours: "โปรแกรม",
};

const ACTION_CLASS: Record<string, string> = {
  "เพิ่ม": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "แก้ไข": "bg-blue-50 text-blue-700 border-blue-200",
  "ลบ":   "bg-red-50 text-red-700 border-red-200",
};

function fmtDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("th-TH", {
      day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

interface Props {
  tourId?: string;
  periodId?: string;
  table?: string;          // "" = ทั้งหมด
  action?: string;         // "" = ทั้งหมด
  search?: string;
  pageSize?: number;
  compact?: boolean;
}

export default function AuditTrailList({
  tourId, periodId, table = "", action = "", search = "", pageSize = 50, compact = false,
}: Props) {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(pageSize);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    let q = supabase
      .from("audit_trail")
      .select("id, created_at, actor_name, table_name, action, record_label, summary")
      .order("created_at", { ascending: false })
      .limit(limit + 1);
    if (tourId)   q = q.eq("tour_id", tourId);
    if (periodId) q = q.eq("period_id", periodId);
    if (table)    q = q.eq("table_name", table);
    if (action)   q = q.eq("action", action);
    if (search.trim()) {
      const s = search.trim().replace(/[%,()]/g, " ");
      q = q.or(`summary.ilike.%${s}%,actor_name.ilike.%${s}%,record_label.ilike.%${s}%`);
    }
    const { data, error } = await q;
    setLoading(false);
    if (error) { console.warn("[audit_trail]", error.message); return; }
    const list = (data ?? []) as AuditRow[];
    setHasMore(list.length > limit);
    setRows(list.slice(0, limit));
  }, [tourId, periodId, table, action, search, limit]);

  useEffect(() => { load(); }, [load]);

  if (!loading && rows.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-6 text-center">
        ยังไม่มีประวัติการแก้ไข (เริ่มบันทึกตั้งแต่ 25 พ.ย. 69)
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="rounded-xl border divide-y">
        {rows.map((r) => (
          <div key={r.id} className={`flex gap-3 px-3 ${compact ? "py-2" : "py-2.5"} text-sm`}>
            <div className="w-28 shrink-0 text-xs text-muted-foreground pt-0.5">{fmtDateTime(r.created_at)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${ACTION_CLASS[r.action] ?? "bg-muted"}`}>
                  {r.action} {TABLE_LABEL[r.table_name] ?? r.table_name}
                </span>
                <span className="text-xs font-medium">{r.actor_name ?? "ไม่ทราบ"}</span>
              </div>
              <p className={`mt-0.5 break-words ${r.action === "ลบ" ? "text-red-700" : "text-foreground"}`}>
                {r.summary}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
          {loading ? "กำลังโหลด…" : "↻ รีเฟรช"}
        </Button>
        {hasMore && (
          <Button variant="outline" size="sm" onClick={() => setLimit((l) => l + pageSize)}>
            ดูเพิ่ม
          </Button>
        )}
      </div>
    </div>
  );
}
