/**
 * PublicCatalog.tsx
 * หน้าโปรแกรมทัวร์แบบ Public (ไม่ต้อง Login)
 * - Read-only, ไม่แสดงราคา/รายได้
 * - Filter ได้ตาม category / สถานะ / search
 * - Realtime update ผ่าน Supabase
 * - 2-Panel: รายการซ้าย, Period detail ขวา
 * - INT = สีเขียว, DOM = สีส้ม
 */
import { useEffect, useState, useMemo, useRef } from "react";
import { Link2, Search, RefreshCw, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";
import type { TourItem, TourPeriod } from "@/store/serviceStore";

// ── Color tokens ──────────────────────────────────────────────────────────────
const CAT_COLOR = {
  "International Tour": {
    border: "#22c55e",
    tag: { bg: "#dcfce7", text: "#15803d", label: "INT" },
    header: { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d" },
  },
  "Domestic": {
    border: "#f97316",
    tag: { bg: "#fff7ed", text: "#c2410c", label: "DOM" },
    header: { bg: "#fff7ed", border: "#fed7aa", text: "#c2410c" },
  },
  "Incentive": {
    border: "#a855f7",
    tag: { bg: "#f3e8ff", text: "#7c3aed", label: "INC" },
    header: { bg: "#faf5ff", border: "#e9d5ff", text: "#7c3aed" },
  },
} as const;

function getCatColor(cat: string) {
  return CAT_COLOR[cat as keyof typeof CAT_COLOR] ?? CAT_COLOR["Incentive"];
}

// ── Period status ─────────────────────────────────────────────────────────────
function periodStatus(quota: number, total: number): "full" | "low" | "ok" {
  if (quota <= 0) return "full";
  if (total > 0 && quota / total <= 0.2) return "low";
  return "ok";
}

// ── Fill dots ─────────────────────────────────────────────────────────────────
function FillDots({ quota, total }: { quota: number; total: number }) {
  if (!total) return null;
  const filled = Math.round(((total - quota) / total) * 5);
  const st = periodStatus(quota, total);
  const dotColor = st === "full" ? "#ef4444" : st === "low" ? "#f97316" : "#22c55e";
  return (
    <span className="flex items-center gap-0.5" aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className="inline-block rounded-full"
          style={{
            width: 7, height: 7,
            background: i < filled ? dotColor : "#e5e7eb",
          }}
        />
      ))}
    </span>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ quota, total }: { quota: number; total: number }) {
  const st = periodStatus(quota, total);
  if (st === "full") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
      style={{ background: "#fef2f2", color: "#dc2626" }}>
      <XCircle className="w-3 h-3" /> เต็มแล้ว
    </span>
  );
  if (st === "low") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
      style={{ background: "#fff7ed", color: "#c2410c" }}>
      <AlertCircle className="w-3 h-3" /> ใกล้เต็ม
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
      style={{ background: "#f0fdf4", color: "#15803d" }}>
      <CheckCircle className="w-3 h-3" /> ว่าง
    </span>
  );
}

// ── Tour status (aggregate across periods) ────────────────────────────────────
function tourAggStatus(tour: TourItem): "full" | "low" | "ok" | "no-period" {
  const active = (tour.periods ?? []).filter(p => !p.cancelled);
  if (!active.length) return "no-period";
  if (active.every(p => periodStatus(p.quota, p.total_seats) === "full")) return "full";
  if (active.some(p => periodStatus(p.quota, p.total_seats) === "ok")) return "ok";
  return "low";
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PublicCatalog() {
  const [tours, setTours]             = useState<TourItem[]>([]);
  const [loading, setLoading]         = useState(true);
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [catFilter, setCatFilter]     = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch]           = useState("");
  const [copied, setCopied]           = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const channelRef                    = useRef<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  async function fetchTours() {
    if (!SUPABASE_ENABLED || !supabase) return;
    const { data } = await supabase
      .from("tours")
      .select("id,code,city,country,category,duration,period,total_seats,quota,periods,pdf_url,title,is_published,archived")
      .eq("archived", false)
      .order("code", { ascending: true });
    if (data) {
      setTours(data as TourItem[]);
      setLastUpdated(new Date());
    }
    setLoading(false);
  }

  // ── Realtime ───────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchTours();
    if (!SUPABASE_ENABLED || !supabase) { setLoading(false); return; }
    const ch = supabase
      .channel("public-catalog-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "tours" }, () => {
        fetchTours();
      })
      .subscribe();
    channelRef.current = ch;
    return () => { supabase?.removeChannel(ch); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return tours.filter(t => {
      if (t.archived) return false;
      if (catFilter !== "all" && t.category !== catFilter) return false;
      if (statusFilter !== "all" && tourAggStatus(t) !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!t.code.toLowerCase().includes(q) && !t.city.toLowerCase().includes(q) && !(t.title ?? "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [tours, catFilter, statusFilter, search]);

  const intTours = filtered.filter(t => t.category === "International Tour");
  const domTours = filtered.filter(t => t.category === "Domestic");
  const incTours = filtered.filter(t => t.category === "Incentive");

  const selectedTour = tours.find(t => t.id === selectedId) ?? null;

  // ── Share ──────────────────────────────────────────────────────────────────
  function copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  // ── Chip helper ────────────────────────────────────────────────────────────
  function Chip({ label, value, active, onClick }: { label: string; value: string; active: boolean; onClick: () => void }) {
    return (
      <button
        onClick={onClick}
        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
          active
            ? "bg-green-600 text-white border-green-600"
            : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
        }`}
      >
        {label}
      </button>
    );
  }

  // ── Tour row (left panel) ──────────────────────────────────────────────────
  function TourRow({ t }: { t: TourItem }) {
    const c = getCatColor(t.category);
    const isSelected = selectedId === t.id;
    const activePeriods = (t.periods ?? []).filter(p => !p.cancelled);
    return (
      <button
        onClick={() => setSelectedId(t.id)}
        className="w-full text-left px-3 py-2.5 border-b border-gray-100 flex items-center justify-between gap-2 transition-colors"
        style={{
          borderLeft: `3px solid ${isSelected ? "#16a34a" : c.border}`,
          background: isSelected ? "#f0fdf4" : "white",
        }}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: c.tag.bg, color: c.tag.text }}
            >
              {c.tag.label}
            </span>
            {activePeriods.length > 0 && (
              <span className="text-[9px] text-gray-400">{activePeriods.length} period</span>
            )}
          </div>
          <p className="text-xs font-semibold text-gray-800 truncate leading-tight">
            {t.title || t.city}
          </p>
          <p className="text-[10px] text-gray-400 truncate">{t.code} · {t.country}</p>
        </div>
        <FillDots
          quota={activePeriods.reduce((s, p) => s + p.quota, 0)}
          total={activePeriods.reduce((s, p) => s + p.total_seats, 0)}
        />
      </button>
    );
  }

  // ── Period detail rows (right panel) ──────────────────────────────────────
  function PeriodRows({ tour }: { tour: TourItem }) {
    const c = getCatColor(tour.category);
    const active = (tour.periods ?? []).filter(p => !p.cancelled);
    if (!active.length) {
      return (
        <div className="text-center py-12 text-gray-400 text-sm">ไม่มี Period ที่เปิดขาย</div>
      );
    }
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: c.header.bg, borderBottom: `1px solid ${c.header.border}` }}>
              <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: c.header.text }}>วันเดินทาง</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: c.header.text }}>ที่นั่งว่าง</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: c.header.text }}>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {active.map((p: TourPeriod) => (
              <tr key={p.period_id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                <td className="px-4 py-3 text-gray-800 text-sm font-medium">{p.travel_date || p.start_date || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: p.total_seats ? `${Math.round(((p.total_seats - p.quota) / p.total_seats) * 100)}%` : "0%",
                          background: periodStatus(p.quota, p.total_seats) === "full" ? "#ef4444"
                            : periodStatus(p.quota, p.total_seats) === "low" ? "#f97316" : "#22c55e",
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {p.quota <= 0 ? "เต็ม" : `${p.quota} / ${p.total_seats}`}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge quota={p.quota} total={p.total_seats} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between gap-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center text-white text-sm font-bold">S</div>
          <div>
            <p className="text-sm font-semibold text-gray-800 leading-tight">Standard Tour</p>
            <p className="text-[11px] text-gray-400">โปรแกรมทัวร์ · ดูข้อมูลได้อย่างเดียว</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Live indicator */}
          <div className="flex items-center gap-1.5 text-[11px] text-green-600">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Live
          </div>
          {lastUpdated && (
            <span className="hidden sm:block text-[11px] text-gray-400">
              อัปเดต {lastUpdated.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          {/* Refresh */}
          <button
            onClick={() => { setLoading(true); fetchTours(); }}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors"
            title="รีเฟรช"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          {/* Share */}
          <button
            onClick={copyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-xs font-medium text-gray-700 transition-colors"
          >
            <Link2 className="w-3.5 h-3.5" />
            {copied ? "คัดลอกแล้ว!" : "คัดลอกลิงค์"}
          </button>
        </div>
      </header>

      {/* Filter bar */}
      <div className="bg-white border-b border-gray-100 px-4 py-2.5 flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="ค้นหาชื่อ / รหัสโปรแกรม"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-400 w-44"
          />
        </div>
        <div className="w-px h-5 bg-gray-200" />
        {/* Category */}
        <div className="flex items-center gap-1.5">
          {[["all","ทั้งหมด"],["International Tour","International"],["Domestic","Domestic"],["Incentive","Incentive"]].map(([v,l]) => (
            <Chip key={v} label={l} value={v} active={catFilter === v} onClick={() => setCatFilter(v)} />
          ))}
        </div>
        <div className="w-px h-5 bg-gray-200" />
        {/* Status */}
        <div className="flex items-center gap-1.5">
          {[["all","ทุกสถานะ"],["ok","ว่าง"],["low","ใกล้เต็ม"],["full","เต็ม"]].map(([v,l]) => (
            <Chip key={v} label={l} value={v} active={statusFilter === v} onClick={() => setStatusFilter(v)} />
          ))}
        </div>
        <div className="ml-auto text-xs text-gray-400">
          {filtered.length} โปรแกรม
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 101px)" }}>
        {/* Left panel */}
        <div className="w-[340px] min-w-[280px] bg-white border-r border-gray-200 overflow-y-auto flex-shrink-0">
          {loading && (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">กำลังโหลด...</div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-400 text-sm">
              <Search className="w-8 h-8 opacity-30" />
              ไม่พบโปรแกรมที่ตรงเงื่อนไข
            </div>
          )}
          {!loading && intTours.length > 0 && (
            <div>
              <div className="sticky top-0 px-3 py-1.5 text-[10px] font-semibold text-green-700 bg-green-50 border-b border-green-100 flex items-center justify-between" style={{ letterSpacing: "0.05em" }}>
                INTERNATIONAL TOUR
                <span className="bg-green-100 text-green-700 rounded-full px-1.5 py-0.5 text-[9px]">{intTours.length}</span>
              </div>
              {intTours.map(t => <TourRow key={t.id} t={t} />)}
            </div>
          )}
          {!loading && domTours.length > 0 && (
            <div>
              <div className="sticky top-0 px-3 py-1.5 text-[10px] font-semibold bg-orange-50 border-b border-orange-100 flex items-center justify-between" style={{ color: "#c2410c", letterSpacing: "0.05em" }}>
                DOMESTIC
                <span className="rounded-full px-1.5 py-0.5 text-[9px]" style={{ background: "#fed7aa", color: "#c2410c" }}>{domTours.length}</span>
              </div>
              {domTours.map(t => <TourRow key={t.id} t={t} />)}
            </div>
          )}
          {!loading && incTours.length > 0 && (
            <div>
              <div className="sticky top-0 px-3 py-1.5 text-[10px] font-semibold text-purple-700 bg-purple-50 border-b border-purple-100 flex items-center justify-between" style={{ letterSpacing: "0.05em" }}>
                INCENTIVE
                <span className="bg-purple-100 text-purple-700 rounded-full px-1.5 py-0.5 text-[9px]">{incTours.length}</span>
              </div>
              {incTours.map(t => <TourRow key={t.id} t={t} />)}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {!selectedTour ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
                <Search className="w-7 h-7 opacity-40" />
              </div>
              <p className="text-sm">เลือกโปรแกรมทางซ้ายเพื่อดู Period</p>
            </div>
          ) : (() => {
            const c = getCatColor(selectedTour.category);
            const active = (selectedTour.periods ?? []).filter(p => !p.cancelled);
            return (
              <div>
                {/* Detail header */}
                <div
                  className="px-6 py-4 border-b sticky top-0"
                  style={{ background: c.header.bg, borderColor: c.header.border }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-base font-semibold text-gray-800 leading-tight">
                        {selectedTour.title || selectedTour.city}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs font-medium" style={{ color: c.header.text }}>{selectedTour.code}</span>
                        <span className="text-gray-300">·</span>
                        <span className="text-xs text-gray-500">{selectedTour.country}</span>
                        <span className="text-gray-300">·</span>
                        <span className="text-xs text-gray-500">{selectedTour.duration}</span>
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: c.tag.bg, color: c.tag.text }}
                        >
                          {c.tag.label}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-400">{active.length} Period</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        ว่างรวม {active.reduce((s, p) => s + p.quota, 0)} ที่นั่ง
                      </p>
                    </div>
                  </div>
                </div>

                {/* Period table */}
                <PeriodRows tour={selectedTour} />

                {/* Read-only note */}
                <div className="mx-4 my-4 p-3 rounded-lg bg-white border border-gray-100 flex items-center gap-2 text-xs text-gray-400">
                  <span className="shrink-0">ℹ️</span>
                  หน้านี้แสดงข้อมูลแบบ Read-only อัปเดต Realtime · ไม่แสดงราคา · ไม่สามารถแก้ไขได้
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
