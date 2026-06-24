/**
 * MarketingHub.tsx — Marketing Intelligence Feed
 * รวม 4 signal type ที่ Marketing ต้องรู้ เรียงตาม urgency
 * 🔥 At-Risk · 📣 Almost Full · ✅ Group Closed · ❌ Cancelled
 */
import { useMemo, useState } from "react";
import { Megaphone, Flame, Volume2, CheckCircle2, XCircle, ChevronDown, ChevronUp, ExternalLink, TrendingUp } from "lucide-react";
import { useServices } from "@/store/serviceStore";
import { useAtRiskPeriods } from "@/components/AtRiskNotification";
import { useNavigate } from "react-router-dom";

// ── types ─────────────────────────────────────────────────────────────────────
type SignalType = "at-risk" | "almost-full" | "closed" | "cancelled";

interface MarketingSignal {
  type: SignalType;
  tourId: string;
  periodId: string;
  tourCode: string;
  tourCity: string;
  country: string;
  category: string;
  startDate: string;
  daysLeft: number;       // ลบ = ผ่านมาแล้ว, บวก = อีกกี่วัน
  fillRate: number;       // %
  quota: number;          // ที่นั่งว่าง
  totalSeats: number;
  urgency: number;        // สำหรับ sort (ยิ่งน้อยยิ่งด่วน)
  actionHint: string;     // คำแนะนำสำหรับ Marketing
}

// ── signal config ─────────────────────────────────────────────────────────────
const SIGNAL_META: Record<SignalType, {
  label: string; emoji: string; color: string;
  bg: string; border: string; textColor: string; lightBg: string;
}> = {
  "at-risk": {
    label: "ต้องโปรโมทด่วน", emoji: "🔥",
    color: "#ea580c", bg: "#fff7ed", border: "#fed7aa",
    textColor: "#c2410c", lightBg: "#ffedd5",
  },
  "almost-full": {
    label: "ใกล้เต็ม — สร้าง FOMO", emoji: "📣",
    color: "#16a34a", bg: "#f0fdf4", border: "#86efac",
    textColor: "#15803d", lightBg: "#dcfce7",
  },
  "closed": {
    label: "ปิดกรุ๊ปสำเร็จ", emoji: "✅",
    color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe",
    textColor: "#1d4ed8", lightBg: "#dbeafe",
  },
  "cancelled": {
    label: "Period ถูกยกเลิก", emoji: "❌",
    color: "#9333ea", bg: "#fdf4ff", border: "#e9d5ff",
    textColor: "#7e22ce", lightBg: "#f3e8ff",
  },
};

const ACTION_HINTS: Record<SignalType, string> = {
  "at-risk":     "ยิง Ads / ส่ง Offer พิเศษ / โพสต์ Promotion ด่วน",
  "almost-full": "โพสต์ \"เหลือ X ที่นั่งสุดท้าย!\" สร้าง Urgency",
  "closed":      "โพสต์ฉลอง กรุ๊ปเต็มแล้ว + ชวน Pre-register รอบถัดไป",
  "cancelled":   "ลบ / แก้ไข post ที่โปรโมทไว้ + เสนอรอบทดแทน",
};

// ── helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
}

function daysFromNow(iso: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(iso); d.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - today.getTime()) / 86400000);
}

// ── main hook ─────────────────────────────────────────────────────────────────
export function useMarketingSignals(): MarketingSignal[] {
  const tours = useServices((s) => s.tours);
  const atRiskIds = new Set(useAtRiskPeriods().map((p) => p.periodId));

  return useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const signals: MarketingSignal[] = [];

    for (const t of tours) {
      for (const p of t.periods ?? []) {
        if (!p.start_date) continue;
        const days = daysFromNow(p.start_date);
        const booked = p.total_seats - p.quota;
        const fill = p.total_seats > 0 ? Math.round(booked / p.total_seats * 100) : 0;

        const base = {
          tourId: t.id, periodId: p.period_id,
          tourCode: t.code, tourCity: t.city,
          country: t.country, category: t.category,
          startDate: p.start_date, daysLeft: days,
          fillRate: fill, quota: p.quota, totalSeats: p.total_seats,
        };

        // ❌ Cancelled (upcoming or recent — within 14 days past)
        if (p.cancelled && days >= -14) {
          signals.push({ ...base, type: "cancelled", urgency: 10 + (days < 0 ? 0 : days), actionHint: ACTION_HINTS["cancelled"] });
          continue;
        }
        if (p.cancelled) continue;

        // 🔥 At-Risk: fill < 40% + ≤ 30 days
        if (atRiskIds.has(p.period_id)) {
          const urgency = days <= 7 ? days : 50 + days;
          signals.push({ ...base, type: "at-risk", urgency, actionHint: ACTION_HINTS["at-risk"] });
          continue;
        }

        // ✅ Closed: quota === 0 (เต็มแล้ว) + upcoming
        if (p.quota === 0 && days >= 0) {
          signals.push({ ...base, type: "closed", urgency: 200 + days, actionHint: ACTION_HINTS["closed"] });
          continue;
        }

        // 📣 Almost Full: fill ≥ 80% + ยังมีที่ว่าง + upcoming ≤ 60 days
        if (fill >= 80 && p.quota > 0 && days >= 0 && days <= 60) {
          signals.push({ ...base, type: "almost-full", urgency: 100 + days, actionHint: ACTION_HINTS["almost-full"] });
        }
      }
    }

    return signals.sort((a, b) => a.urgency - b.urgency);
  }, [tours, atRiskIds]);
}

// ── Signal Row ────────────────────────────────────────────────────────────────
function SignalRow({ s }: { s: MarketingSignal }) {
  const meta = SIGNAL_META[s.type];
  return (
    <div className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors border-b border-border/40 last:border-0">
      {/* Type badge */}
      <span
        className="shrink-0 mt-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full"
        style={{ background: meta.lightBg, color: meta.textColor, border: `1px solid ${meta.border}` }}
      >
        {meta.emoji} {s.daysLeft >= 0 ? `${s.daysLeft}d` : `${Math.abs(s.daysLeft)}d ก่อน`}
      </span>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-foreground">{s.tourCode}</span>
          <span className="text-xs text-muted-foreground">{s.tourCity} · {s.country}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          เดินทาง {fmtDate(s.startDate)} · {s.category}
        </p>
        <p className="text-[11px] mt-1 font-medium" style={{ color: meta.color }}>
          → {s.actionHint}
        </p>
      </div>

      {/* Stats */}
      <div className="shrink-0 text-right">
        <p className="text-base font-bold leading-none" style={{ color: meta.color }}>
          {s.type === "cancelled" ? "ยกเลิก" : `${s.fillRate}%`}
        </p>
        {s.type !== "cancelled" && (
          <p className="text-[10px] text-muted-foreground">
            {s.type === "closed" ? "เต็มแล้ว" : `ว่าง ${s.quota}/${s.totalSeats}`}
          </p>
        )}
      </div>

      {/* Fill bar (not for cancelled) */}
      {s.type !== "cancelled" && (
        <div className="w-12 shrink-0 self-center">
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${s.fillRate}%`, background: meta.color }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Signal Section (collapsible) ──────────────────────────────────────────────
function SignalSection({ type, signals }: { type: SignalType; signals: MarketingSignal[] }) {
  const [open, setOpen] = useState(true);
  const meta = SIGNAL_META[type];
  if (signals.length === 0) return null;

  return (
    <div className="rounded-2xl border-2 overflow-hidden" style={{ borderColor: meta.border, background: meta.bg }}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-opacity hover:opacity-80"
      >
        <span className="text-lg">{meta.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold" style={{ color: meta.textColor }}>{meta.label}</p>
          <p className="text-xs" style={{ color: meta.color }}>{signals.length} โปรแกรม</p>
        </div>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full text-white shrink-0"
          style={{ background: meta.color }}
        >
          {signals.length}
        </span>
        {open
          ? <ChevronUp className="w-4 h-4 shrink-0" style={{ color: meta.textColor }} />
          : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: meta.textColor }} />}
      </button>

      {/* Rows */}
      {open && (
        <div className="bg-white/70 border-t" style={{ borderColor: meta.border }}>
          {signals.map((s) => <SignalRow key={`${s.type}-${s.periodId}`} s={s} />)}
        </div>
      )}
    </div>
  );
}

// ── Summary Card ──────────────────────────────────────────────────────────────
function SummaryCard({ type, count, onClick }: { type: SignalType; count: number; onClick: () => void }) {
  const meta = SIGNAL_META[type];
  const icons: Record<SignalType, typeof Flame> = {
    "at-risk": Flame,
    "almost-full": Volume2,
    "closed": CheckCircle2,
    "cancelled": XCircle,
  };
  const Icon = icons[type];

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border-2 p-4 text-left transition-all hover:shadow-md hover:-translate-y-0.5 flex flex-col gap-2"
      style={{ borderColor: count > 0 ? meta.border : "#E5E7EB", background: count > 0 ? meta.bg : "#F9FAFB" }}
    >
      <div className="flex items-center justify-between">
        <Icon className="w-5 h-5" style={{ color: count > 0 ? meta.color : "#9CA3AF" }} />
        <span
          className="text-xl font-black"
          style={{ color: count > 0 ? meta.color : "#9CA3AF" }}
        >
          {count}
        </span>
      </div>
      <div>
        <p className="text-xs font-bold" style={{ color: count > 0 ? meta.textColor : "#6B7280" }}>{meta.emoji} {meta.label}</p>
      </div>
    </button>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function MarketingHub() {
  const navigate = useNavigate();
  const signals = useMarketingSignals();

  const byType = useMemo(() => ({
    "at-risk":    signals.filter((s) => s.type === "at-risk"),
    "almost-full": signals.filter((s) => s.type === "almost-full"),
    "closed":     signals.filter((s) => s.type === "closed"),
    "cancelled":  signals.filter((s) => s.type === "cancelled"),
  }), [signals]);

  const [activeFilter, setActiveFilter] = useState<SignalType | "all">("all");

  const filteredSignals = activeFilter === "all"
    ? signals
    : signals.filter((s) => s.type === activeFilter);

  const totalActions = byType["at-risk"].length + byType["almost-full"].length + byType["cancelled"].length;

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <div className="bg-white border-b px-6 py-4 sticky top-0 z-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center shadow">
            <Megaphone className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground">Marketing Hub</h1>
            <p className="text-xs text-muted-foreground">ติดตาม Stock ที่ต้องดำเนินการด้าน Marketing</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {totalActions > 0 && (
            <span className="text-xs font-bold px-2.5 py-1 bg-red-500 text-white rounded-full">
              {totalActions} รายการต้องดำเนินการ
            </span>
          )}
          <button
            type="button"
            onClick={() => navigate("/app/stock-analytics")}
            className="flex items-center gap-1.5 text-xs text-violet-600 font-semibold hover:underline px-3 py-1.5 rounded-lg border border-violet-200 hover:bg-violet-50 transition-colors"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Stock Analytics
            <ExternalLink className="w-3 h-3 opacity-60" />
          </button>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-5 space-y-5 max-w-5xl mx-auto">

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard type="at-risk"    count={byType["at-risk"].length}    onClick={() => setActiveFilter("at-risk")} />
          <SummaryCard type="almost-full" count={byType["almost-full"].length} onClick={() => setActiveFilter("almost-full")} />
          <SummaryCard type="closed"     count={byType["closed"].length}     onClick={() => setActiveFilter("closed")} />
          <SummaryCard type="cancelled"  count={byType["cancelled"].length}  onClick={() => setActiveFilter("cancelled")} />
        </div>

        {/* ── Filter tabs ── */}
        <div className="flex gap-1.5 flex-wrap">
          {([["all", "ทั้งหมด"], ["at-risk", "🔥 ต้องโปรโมท"], ["almost-full", "📣 ใกล้เต็ม"], ["closed", "✅ ปิดกรุ๊ป"], ["cancelled", "❌ ยกเลิก"]] as const).map(([f, label]) => (
            <button
              key={f}
              type="button"
              onClick={() => setActiveFilter(f)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${activeFilter === f ? "bg-foreground text-background border-foreground" : "bg-white text-muted-foreground border-border hover:border-foreground"}`}
            >
              {label}
              {f !== "all" && (
                <span className="ml-1 opacity-60">
                  ({f === "at-risk" ? byType["at-risk"].length : f === "almost-full" ? byType["almost-full"].length : f === "closed" ? byType["closed"].length : byType["cancelled"].length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── No signals state ── */}
        {signals.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🎉</p>
            <p className="text-base font-bold text-foreground">ทุก Period อยู่ในสถานะปกติ</p>
            <p className="text-sm text-muted-foreground mt-1">ไม่มี Signal ที่ต้องดำเนินการตอนนี้</p>
          </div>
        )}

        {/* ── Feed: Sections by type (all view) ── */}
        {activeFilter === "all" && signals.length > 0 && (
          <div className="space-y-4">
            <SignalSection type="at-risk"    signals={byType["at-risk"]} />
            <SignalSection type="cancelled"  signals={byType["cancelled"]} />
            <SignalSection type="almost-full" signals={byType["almost-full"]} />
            <SignalSection type="closed"     signals={byType["closed"]} />
          </div>
        )}

        {/* ── Feed: Filtered flat list ── */}
        {activeFilter !== "all" && filteredSignals.length > 0 && (
          <div className="bg-white rounded-2xl border-2 overflow-hidden" style={{ borderColor: SIGNAL_META[activeFilter].border }}>
            {filteredSignals.map((s) => <SignalRow key={`${s.type}-${s.periodId}`} s={s} />)}
          </div>
        )}

        {activeFilter !== "all" && filteredSignals.length === 0 && (
          <div className="text-center py-12">
            <p className="text-3xl mb-2">{SIGNAL_META[activeFilter].emoji}</p>
            <p className="text-sm text-muted-foreground">ไม่มี Period ใน category นี้ตอนนี้</p>
          </div>
        )}

        {/* ── Legend ── */}
        <div className="rounded-xl bg-muted/30 border border-border p-4 text-xs text-muted-foreground space-y-1.5">
          <p className="font-bold text-foreground text-xs mb-2">คำอธิบาย Signal</p>
          <p>🔥 <strong>ต้องโปรโมทด่วน</strong> — fill rate &lt; 40% และเหลือ ≤ 30 วันก่อนเดินทาง</p>
          <p>📣 <strong>ใกล้เต็ม</strong> — fill rate ≥ 80% ยังมีที่นั่งเหลือ และออกเดินทางใน 60 วัน</p>
          <p>✅ <strong>ปิดกรุ๊ปสำเร็จ</strong> — ที่นั่งว่างเหลือ 0 (เต็มแล้ว) ยังไม่ออกเดินทาง</p>
          <p>❌ <strong>Period ถูกยกเลิก</strong> — ยกเลิกแล้ว ทั้งที่ยังไม่ออกเดินทาง หรือยกเลิกใน 14 วันที่ผ่านมา</p>
        </div>

      </div>
    </div>
  );
}
