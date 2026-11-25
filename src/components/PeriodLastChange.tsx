/**
 * PeriodLastChange — แสดง "แก้ไขล่าสุด: <แก้อะไร>" ใต้แต่ละ Period
 * ข้อมูลจาก view period_last_change (สรุปจาก audit_trail ที่ DB trigger บันทึก)
 *
 * ใช้: เรียก usePeriodLastChangeLoader(tours) 1 ครั้งในหน้า แล้ววาง <PeriodLastChange periodId=... />
 */
import { useEffect, useRef } from "react";
import { create } from "zustand";
import { supabase } from "@/lib/supabase";

interface LastChange {
  short_summary: string | null;
  actor_name: string | null;
  created_at: string;
  table_name: string;
}

interface State {
  byPeriod: Record<string, LastChange>;
  load: () => Promise<void>;
}

const usePeriodLastChangeStore = create<State>((set) => ({
  byPeriod: {},
  load: async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("period_last_change")
      .select("period_id, short_summary, actor_name, created_at, table_name");
    if (error) { console.warn("[period_last_change]", error.message); return; }
    const map: Record<string, LastChange> = {};
    for (const r of data ?? []) map[(r as { period_id: string }).period_id] = r as unknown as LastChange;
    set({ byPeriod: map });
  },
}));

/** โหลดใหม่ทุกครั้งที่ข้อมูล tours เปลี่ยน (realtime) — หน่วง 1 วินาทีกันยิงถี่ */
export function usePeriodLastChangeLoader(dep: unknown) {
  const load = usePeriodLastChangeStore((s) => s.load);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { load(); }, 1000);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [dep, load]);
}

const SOURCE_LABEL: Record<string, string> = {
  periods: "",
  bookings: "การจอง · ",
  leads: "Lead · ",
};

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("th-TH", {
      day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

export default function PeriodLastChange({ periodId }: { periodId: string }) {
  const c = usePeriodLastChangeStore((s) => s.byPeriod[periodId]);
  if (!c || !c.short_summary) return null;
  return (
    <div className="text-[10px] text-muted-foreground w-full" title={c.short_summary}>
      แก้ไขล่าสุด:{" "}
      <span className="text-foreground/80">
        {SOURCE_LABEL[c.table_name] ?? ""}{c.short_summary}
      </span>
      <span className="ml-1 text-muted-foreground/60">
        · {c.actor_name ?? "ไม่ทราบ"} · {fmt(c.created_at)}
      </span>
    </div>
  );
}
