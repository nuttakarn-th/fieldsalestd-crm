import { useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { addDays, format, startOfWeek, subWeeks, addWeeks } from "date-fns";
import { th } from "date-fns/locale";
import {
  ChevronLeft, ChevronRight, Download, FileSpreadsheet, Printer,
  CheckCircle2, Clock, SkipForward, AlertCircle, ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useCRM, SALES_REPS, type StopStatus } from "@/store/crmStore";
import { cn } from "@/lib/utils";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function ymd(d: Date) { return format(d, "yyyy-MM-dd"); }

const STATUS_LABELS: Record<StopStatus, string> = {
  planned:     "แผน",
  in_progress: "กำลังไป",
  completed:   "เสร็จ ✓",
  skipped:     "ข้าม",
};

const STATUS_COLORS: Record<StopStatus, string> = {
  planned:     "bg-purple-50 text-purple-700 border-purple-200",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  completed:   "bg-green-50 text-green-700 border-green-200",
  skipped:     "bg-gray-100 text-gray-500 border-gray-200",
};

const DAY_SHORT: Record<string, string> = {
  Monday: "จ.", Tuesday: "อ.", Wednesday: "พ.",
  Thursday: "พฤ.", Friday: "ศ.", Saturday: "ส.", Sunday: "อา.",
};

// ─── Flat row type ────────────────────────────────────────────────────────────
interface ReportRow {
  date:       string;      // YYYY-MM-DD
  dayLabel:   string;      // จ./อ./...
  rep:        string;
  place:      string;
  purpose:    string;
  address:    string;      // phone / address
  status:     StopStatus;
  time:       string;
  note:       string;
  customer:   string;      // customer full_name or company
  routeId:    string;
  stopId:     string;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function PlanReport() {
  const { routes, customers } = useCRM(
    useShallow((s) => ({ routes: s.routes, customers: s.customers })),
  );

  // ── Week state ──────────────────────────────────────────────────────────────
  const [baseMonday, setBaseMonday] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const weekDays = useMemo(
    () => Array.from({ length: 6 }, (_, i) => addDays(baseMonday, i)),
    [baseMonday],
  );
  const weekLabel = `${format(weekDays[0], "d MMM", { locale: th })} – ${format(weekDays[5], "d MMM yyyy", { locale: th })}`;
  const weekKeys  = useMemo(() => new Set(weekDays.map(ymd)), [weekDays]);

  // ── Filters ─────────────────────────────────────────────────────────────────
  const [filterRep,    setFilterRep]    = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // ── Build flat rows ─────────────────────────────────────────────────────────
  const custMap = useMemo(() => {
    const m: Record<string, string> = {};
    customers.forEach((c) => { m[c.customer_id] = c.company || c.full_name; });
    return m;
  }, [customers]);

  const allRows = useMemo((): ReportRow[] => {
    const rows: ReportRow[] = [];
    routes.forEach((r) => {
      if (!weekKeys.has(r.date)) return;
      r.stops.forEach((s) => {
        const dayOfWeek = format(new Date(r.date), "EEEE"); // Monday, Tuesday, ...
        rows.push({
          date:      r.date,
          dayLabel:  DAY_SHORT[dayOfWeek] ?? dayOfWeek,
          rep:       r.rep,
          place:     s.place_name,
          purpose:   s.purpose,
          address:   s.address,
          status:    s.status,
          time:      s.planned_time ?? "",
          note:      s.note ?? "",
          customer:  s.customer_id ? (custMap[s.customer_id] ?? "") : "",
          routeId:   r.route_id,
          stopId:    s.stop_id,
        });
      });
    });
    // Sort by date then time then rep
    return rows.sort((a, b) =>
      a.date.localeCompare(b.date) || a.time.localeCompare(b.time) || a.rep.localeCompare(b.rep),
    );
  }, [routes, weekKeys, custMap]);

  // ── Filtered rows ────────────────────────────────────────────────────────────
  const rows = useMemo(() => {
    return allRows.filter((r) => {
      if (filterRep    !== "all" && r.rep    !== filterRep)    return false;
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      return true;
    });
  }, [allRows, filterRep, filterStatus]);

  // ── Summary stats ────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total    = allRows.length;
    const done     = allRows.filter((r) => r.status === "completed").length;
    const planned  = allRows.filter((r) => r.status === "planned").length;
    const skipped  = allRows.filter((r) => r.status === "skipped").length;
    const byRep: Record<string, number> = {};
    allRows.forEach((r) => { byRep[r.rep] = (byRep[r.rep] ?? 0) + 1; });
    return { total, done, planned, skipped, byRep };
  }, [allRows]);

  // ── Export CSV ───────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ["วัน", "วันที่", "Sales", "ลูกค้า/สถานที่", "เบอร์", "วัตถุประสงค์", "เวลา", "สถานะ", "หมายเหตุ"];
    const csvRows = [
      headers.join(","),
      ...rows.map((r) => [
        r.dayLabel,
        r.date,
        r.rep,
        `"${r.customer || r.place}"`,
        `"${r.address}"`,
        `"${r.purpose}"`,
        r.time,
        STATUS_LABELS[r.status],
        `"${r.note}"`,
      ].join(",")),
    ];
    const blob = new Blob(["﻿" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `plan-report-${ymd(weekDays[0])}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Print ─────────────────────────────────────────────────────────────────────
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = () => window.print();

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full min-h-screen bg-gray-50">
      {/* ── Top bar ── */}
      <div className="bg-white border-b sticky top-0 z-20 px-4 py-3 flex items-center justify-between gap-3 flex-wrap print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-50">
            <ClipboardList className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-base font-semibold leading-tight text-gray-900">รายงานแผนงาน</h1>
            <p className="text-xs text-muted-foreground">สรุปการวางแผนของทีม Sales</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Week navigator */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setBaseMonday((d) => subWeeks(d, 1))}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            </button>
            <span className="text-sm font-medium text-gray-700 min-w-[150px] text-center">{weekLabel}</span>
            <button
              onClick={() => setBaseMonday((d) => addWeeks(d, 1))}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
            <button
              onClick={() => setBaseMonday(startOfWeek(new Date(), { weekStartsOn: 1 }))}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              สัปดาห์นี้
            </button>
          </div>

          {/* Rep filter */}
          <Select value={filterRep} onValueChange={setFilterRep}>
            <SelectTrigger className="h-8 text-xs w-[130px]">
              <SelectValue placeholder="ทุก Sales" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุก Sales</SelectItem>
              {SALES_REPS.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status filter */}
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 text-xs w-[120px]">
              <SelectValue placeholder="ทุกสถานะ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกสถานะ</SelectItem>
              <SelectItem value="planned">แผน</SelectItem>
              <SelectItem value="in_progress">กำลังไป</SelectItem>
              <SelectItem value="completed">เสร็จ ✓</SelectItem>
              <SelectItem value="skipped">ข้าม</SelectItem>
            </SelectContent>
          </Select>

          {/* Export */}
          <Button size="sm" variant="outline" onClick={exportCSV} className="h-8 text-xs gap-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV
          </Button>
          <Button size="sm" variant="outline" onClick={handlePrint} className="h-8 text-xs gap-1.5">
            <Printer className="w-3.5 h-3.5" /> Print
          </Button>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div className="grid grid-cols-4 gap-px bg-gray-200 border-b print:hidden">
        {[
          { label: "ทั้งหมด",      value: stats.total,   color: "#1D4ED8", icon: <ClipboardList className="w-4 h-4" /> },
          { label: "เสร็จแล้ว",    value: stats.done,    color: "#16A34A", icon: <CheckCircle2 className="w-4 h-4" /> },
          { label: "ยังไม่ได้ไป",  value: stats.planned, color: "#D97706", icon: <Clock className="w-4 h-4" /> },
          { label: "ข้าม",          value: stats.skipped, color: "#9CA3AF", icon: <SkipForward className="w-4 h-4" /> },
        ].map((s) => (
          <div key={s.label} className="bg-white px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: s.color + "18", color: s.color }}>
              {s.icon}
            </div>
            <div>
              <p className="text-xl font-semibold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Per-rep summary chips ── */}
      {Object.keys(stats.byRep).length > 0 && (
        <div className="bg-white border-b px-4 py-2 flex items-center gap-2 flex-wrap print:hidden">
          <span className="text-xs text-muted-foreground font-medium">Sales:</span>
          {Object.entries(stats.byRep).map(([rep, cnt]) => (
            <button
              key={rep}
              onClick={() => setFilterRep(filterRep === rep ? "all" : rep)}
              className={cn(
                "text-[11px] px-2.5 py-1 rounded-full border transition-colors",
                filterRep === rep
                  ? "bg-amber-500 text-white border-amber-500"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50",
              )}
            >
              {rep} · {cnt}
            </button>
          ))}
        </div>
      )}

      {/* ── Table ── */}
      <div ref={printRef} className="flex-1 overflow-auto p-4">
        {/* Print header */}
        <div className="hidden print:block mb-4">
          <h2 className="text-lg font-bold">รายงานแผนงาน Sales</h2>
          <p className="text-sm text-gray-500">{weekLabel} {filterRep !== "all" ? `· ${filterRep}` : ""}</p>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-muted-foreground">
            <AlertCircle className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">ไม่มีข้อมูลแผนงานในสัปดาห์นี้</p>
            {(filterRep !== "all" || filterStatus !== "all") && (
              <button
                onClick={() => { setFilterRep("all"); setFilterStatus("all"); }}
                className="mt-2 text-xs text-purple-600 underline"
              >
                ล้าง Filter
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left font-semibold w-12">วัน</th>
                  <th className="px-4 py-3 text-left font-semibold w-20">วันที่</th>
                  <th className="px-4 py-3 text-left font-semibold w-20">Sales</th>
                  <th className="px-4 py-3 text-left font-semibold">ลูกค้า / สถานที่</th>
                  <th className="px-4 py-3 text-left font-semibold w-32">เบอร์ติดต่อ</th>
                  <th className="px-4 py-3 text-left font-semibold w-44">วัตถุประสงค์</th>
                  <th className="px-4 py-3 text-left font-semibold w-16">เวลา</th>
                  <th className="px-4 py-3 text-left font-semibold w-24">สถานะ</th>
                  <th className="px-4 py-3 text-left font-semibold">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const prevRow = rows[idx - 1];
                  const isNewDate = !prevRow || prevRow.date !== row.date;
                  return (
                    <>
                      {isNewDate && idx > 0 && (
                        <tr key={`sep-${row.date}`}>
                          <td colSpan={9} className="h-px bg-gray-100 p-0" />
                        </tr>
                      )}
                      <tr
                        key={`${row.routeId}-${row.stopId}`}
                        className={cn(
                          "border-b border-gray-50 hover:bg-gray-50 transition-colors",
                          row.status === "completed" ? "opacity-75" : "",
                          row.status === "skipped"   ? "opacity-50" : "",
                        )}
                      >
                        {/* Day */}
                        <td className="px-4 py-2.5">
                          <span className="font-semibold text-gray-700 text-xs">{row.dayLabel}</span>
                        </td>
                        {/* Date */}
                        <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(row.date), "d MMM", { locale: th })}
                        </td>
                        {/* Rep */}
                        <td className="px-4 py-2.5">
                          <span className="text-xs font-medium text-gray-700 whitespace-nowrap">{row.rep}</span>
                        </td>
                        {/* Customer / place */}
                        <td className="px-4 py-2.5">
                          <div>
                            <p className={cn("font-medium text-gray-900", row.status === "completed" && "line-through text-gray-500")}>
                              {row.customer || row.place}
                            </p>
                            {row.customer && row.place !== row.customer && (
                              <p className="text-xs text-muted-foreground">{row.place}</p>
                            )}
                          </div>
                        </td>
                        {/* Phone */}
                        <td className="px-4 py-2.5 text-xs text-gray-600 whitespace-nowrap">{row.address}</td>
                        {/* Purpose */}
                        <td className="px-4 py-2.5">
                          <span className="text-xs text-gray-600">{row.purpose}</span>
                        </td>
                        {/* Time */}
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{row.time}</td>
                        {/* Status */}
                        <td className="px-4 py-2.5">
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border",
                            STATUS_COLORS[row.status],
                          )}>
                            {STATUS_LABELS[row.status]}
                          </span>
                        </td>
                        {/* Note */}
                        <td className="px-4 py-2.5 text-xs text-muted-foreground italic">{row.note}</td>
                      </tr>
                    </>
                  );
                })}
              </tbody>
            </table>

            {/* Footer */}
            <div className="px-4 py-2.5 bg-gray-50 border-t text-xs text-muted-foreground flex items-center justify-between">
              <span>แสดง {rows.length} รายการ {rows.length !== allRows.length ? `(จากทั้งหมด ${allRows.length})` : ""}</span>
              <span>สัปดาห์ {weekLabel}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Print styles ── */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:block, .print\\:block * { visibility: visible; }
          table, table * { visibility: visible; }
          [ref="printRef"], [ref="printRef"] * { visibility: visible; }
          .bg-white { background: white !important; }
          .border { border: 1px solid #e5e7eb !important; }
          @page { margin: 1cm; }
        }
      `}</style>
    </div>
  );
}
