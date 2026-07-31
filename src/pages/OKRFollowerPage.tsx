/**
 * OKRFollowerPage.tsx
 * OKR Follower Growth — ติดตามเป้า Social Follower รายไตรมาส
 * 4 platforms: Facebook, YouTube, TikTok, Google Maps (Reviews)
 * Reporter: บีม · รายเดือน
 */
import { useState } from "react";
import { Target, TrendingUp, TrendingDown, Minus, Plus, Pencil, X } from "lucide-react";
import { useOKRFollowerStore } from "@/store/okrFollowerStore";
import type { OKRMonth, OKRTargets } from "@/store/okrFollowerStore";

// ─── Constants ────────────────────────────────────────────────────────────────
const THAI_MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

type PlatformKey = "facebook" | "youtube" | "tiktok" | "google_maps";

interface PlatformDef {
  key: PlatformKey;
  label: string;
  abbr: string;
  color: string;
  gradient: string;
}

const PLATFORMS: PlatformDef[] = [
  { key: "facebook",    label: "Facebook",       abbr: "FB", color: "#1877F2", gradient: "from-blue-500 to-blue-600"    },
  { key: "youtube",     label: "YouTube",        abbr: "YT", color: "#FF0000", gradient: "from-red-500 to-rose-600"     },
  { key: "tiktok",      label: "TikTok",         abbr: "TT", color: "#00C2CB", gradient: "from-cyan-500 to-pink-500"    },
  { key: "google_maps", label: "Google Map รีวิว", abbr: "GM", color: "#34A853", gradient: "from-green-500 to-emerald-600" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtNum(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

function monthLabel(m: string, short = false): string {
  const [y, mo] = m.split("-");
  const th = THAI_MONTHS[parseInt(mo) - 1];
  return short ? th : `${th} ${y}`;
}

function lastNMonths(n: number): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

function currentQuarter(): { q: number; year: number } {
  const now = new Date();
  return { q: Math.ceil((now.getMonth() + 1) / 3), year: now.getFullYear() };
}

// ─── Mini SVG Bar Chart ───────────────────────────────────────────────────────
function MiniBarChart({
  entries, platform, target, color,
}: {
  entries: OKRMonth[];
  platform: PlatformKey;
  target: number | null;
  color: string;
}) {
  const W = 280, H = 130;
  const PAD = { top: 16, right: 8, bottom: 24, left: 34 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const months = lastNMonths(12);
  const values = months.map((m) => {
    const e = entries.find((x) => x.month === m);
    return e ? (e[platform] as number | null) : null;
  });

  const positives = values.filter((v): v is number => v != null && v > 0);
  const maxVal = Math.max(1, ...positives, ...(target != null && target > 0 ? [target] : [])) * 1.15;

  const barStep = chartW / months.length;
  const barW = barStep * 0.55;
  const toY = (v: number) => PAD.top + chartH - (v / maxVal) * chartH;
  const targetY = target && target > 0 ? toY(target) : null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      {/* Horizontal grid lines */}
      {[0, 0.5, 1].map((pct) => {
        const y = PAD.top + chartH * (1 - pct);
        const val = pct * maxVal;
        return (
          <g key={pct}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
              stroke="currentColor" strokeOpacity={0.07} strokeWidth={1} />
            <text x={PAD.left - 4} y={y + 3.5} textAnchor="end"
              fontSize={8} fill="currentColor" fillOpacity={0.4}>
              {fmtNum(Math.round(val))}
            </text>
          </g>
        );
      })}

      {/* Target dashed line */}
      {targetY != null && (
        <line x1={PAD.left} y1={targetY} x2={W - PAD.right} y2={targetY}
          stroke={color} strokeWidth={1.5} strokeDasharray="4 3" strokeOpacity={0.65} />
      )}

      {/* Bars */}
      {months.map((m, i) => {
        const val = values[i];
        if (!val) return null;
        const x = PAD.left + i * barStep + (barStep - barW) / 2;
        const bh = (val / maxVal) * chartH;
        const y = PAD.top + chartH - bh;
        const isLatest = i === months.length - 1;
        return (
          <rect key={m} x={x} y={y} width={barW} height={bh} rx={2}
            fill={color} fillOpacity={isLatest ? 1 : 0.45} />
        );
      })}

      {/* Month labels (every 2nd) */}
      {months.map((m, i) => {
        if (i % 2 !== 0) return null;
        return (
          <text key={m} x={PAD.left + i * barStep + barStep / 2} y={H - 6}
            textAnchor="middle" fontSize={8} fill="currentColor" fillOpacity={0.45}>
            {monthLabel(m, true)}
          </text>
        );
      })}
    </svg>
  );
}

// ─── Platform Card ────────────────────────────────────────────────────────────
function PlatformCard({
  platform, entries, target,
}: {
  platform: PlatformDef;
  entries: OKRMonth[];
  target: number | null;
}) {
  const sorted = [...entries].sort((a, b) => b.month.localeCompare(a.month));
  const latestEntry = sorted.find((e) => e[platform.key] != null);
  const current = latestEntry ? (latestEntry[platform.key] as number) : null;

  const pct = current != null && target ? Math.min((current / target) * 100, 100) : 0;
  const remaining = current != null && target ? Math.max(target - current, 0) : null;

  // Month-over-month change
  const withData = [...entries]
    .sort((a, b) => a.month.localeCompare(b.month))
    .filter((e) => e[platform.key] != null);
  const last2 = withData.slice(-2);
  const mom =
    last2.length === 2
      ? (last2[1][platform.key] as number) - (last2[0][platform.key] as number)
      : null;

  const noTarget = target == null || target === 0;

  return (
    <div className="bg-card border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className={`h-1.5 bg-gradient-to-r ${platform.gradient}`} />
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${platform.gradient} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
              {platform.abbr}
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground leading-none mb-0.5">{platform.label}</p>
              <p className="text-2xl font-bold leading-none">{fmtNum(current)}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            {noTarget ? (
              <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">รอกรอกเป้า</span>
            ) : (
              <>
                <p className="text-[10px] text-muted-foreground">เป้า</p>
                <p className="text-sm font-semibold">{fmtNum(target)}</p>
              </>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {!noTarget && (
          <div className="mb-2">
            <div className="relative h-2 bg-muted rounded-full overflow-hidden mb-1">
              <div
                className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${platform.gradient} transition-all duration-700`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="font-medium">{pct.toFixed(1)}%</span>
              {remaining != null && remaining > 0 && (
                <span>เหลืออีก {fmtNum(remaining)}</span>
              )}
              {remaining === 0 && (
                <span className="text-green-500 font-semibold">✓ บรรลุเป้า!</span>
              )}
            </div>
          </div>
        )}

        {/* MoM delta */}
        {mom != null && (
          <div className={`flex items-center gap-1 text-[10px] mt-1 ${
            mom > 0 ? "text-green-500" : mom < 0 ? "text-red-500" : "text-muted-foreground"
          }`}>
            {mom > 0 ? <TrendingUp className="w-3 h-3" /> : mom < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            <span>{mom > 0 ? "+" : ""}{fmtNum(mom)} vs เดือนที่แล้ว</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── YoY Panel ────────────────────────────────────────────────────────────────
function YoYPanel({ entries }: { entries: OKRMonth[] }) {
  const currYear = String(new Date().getFullYear());
  const prevYear = String(parseInt(currYear) - 1);

  const getFirstLast = (yr: string, key: PlatformKey) => {
    const yrEntries = entries
      .filter((e) => e.month.startsWith(yr) && e[key] != null)
      .sort((a, b) => a.month.localeCompare(b.month));
    const first = yrEntries[0]?.[key] as number | null;
    const last  = yrEntries[yrEntries.length - 1]?.[key] as number | null;
    return { first, last };
  };

  return (
    <div className="bg-card border rounded-2xl p-4">
      <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-emerald-500" />
        เปรียบเทียบ Year-over-Year
      </h3>
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-xs min-w-[340px]">
          <thead>
            <tr className="text-muted-foreground border-b">
              <th className="text-left py-1.5 pr-2 font-medium">Platform</th>
              <th className="text-center py-1.5 px-1 font-medium whitespace-nowrap">ต้นปี {prevYear}</th>
              <th className="text-center py-1.5 px-1 font-medium whitespace-nowrap">ปลายปี {prevYear}</th>
              <th className="text-center py-1.5 px-1 font-medium whitespace-nowrap">ปัจจุบัน</th>
              <th className="text-center py-1.5 px-1 font-medium">YoY</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {PLATFORMS.map((p) => {
              const prev    = getFirstLast(prevYear, p.key);
              const curr    = getFirstLast(currYear, p.key);
              const prevEnd = prev.last;
              const currNow = curr.last;
              const growth  = prevEnd && currNow
                ? ((currNow - prevEnd) / prevEnd) * 100
                : null;

              return (
                <tr key={p.key}>
                  <td className="py-2 pr-2">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full bg-gradient-to-br ${p.gradient} shrink-0`} />
                      <span className="font-medium">{p.label}</span>
                    </div>
                  </td>
                  <td className="text-center py-2 px-1 text-muted-foreground">{fmtNum(prev.first)}</td>
                  <td className="text-center py-2 px-1 text-muted-foreground">{fmtNum(prevEnd)}</td>
                  <td className="text-center py-2 px-1 font-semibold">{fmtNum(currNow)}</td>
                  <td className="text-center py-2 px-1">
                    {growth != null ? (
                      <span className={`font-semibold ${growth > 0 ? "text-green-500" : "text-red-500"}`}>
                        {growth > 0 ? "+" : ""}{growth.toFixed(1)}%
                      </span>
                    ) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Input Form ───────────────────────────────────────────────────────────────
function InputForm() {
  const { entries, setEntry } = useOKRFollowerStore();
  const months = lastNMonths(24);
  const defaultMonth = months[months.length - 1];
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [values, setValues] = useState<Record<PlatformKey, string>>({
    facebook: "", youtube: "", tiktok: "", google_maps: "",
  });
  const [saved, setSaved] = useState(false);

  const handleMonthChange = (m: string) => {
    setSelectedMonth(m);
    const existing = entries.find((e) => e.month === m);
    if (existing) {
      setValues({
        facebook:    existing.facebook    != null ? String(existing.facebook)    : "",
        youtube:     existing.youtube     != null ? String(existing.youtube)     : "",
        tiktok:      existing.tiktok      != null ? String(existing.tiktok)      : "",
        google_maps: existing.google_maps != null ? String(existing.google_maps) : "",
      });
    } else {
      setValues({ facebook: "", youtube: "", tiktok: "", google_maps: "" });
    }
  };

  const toNum = (s: string): number | null => {
    const cleaned = s.replace(/,/g, "").trim();
    if (!cleaned) return null;
    const n = parseInt(cleaned, 10);
    return isNaN(n) ? null : n;
  };

  const handleSave = () => {
    setEntry({
      month:        selectedMonth,
      facebook:     toNum(values.facebook),
      youtube:      toNum(values.youtube),
      tiktok:       toNum(values.tiktok),
      google_maps:  toNum(values.google_maps),
      google_rating: null,
      updated_at:   new Date().toISOString(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  return (
    <div className="bg-card border rounded-2xl p-4">
      <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
        <Plus className="w-4 h-4 text-violet-500" />
        บันทึกข้อมูลประจำเดือน
      </h3>

      {/* Month select */}
      <div className="mb-3">
        <label className="text-xs text-muted-foreground mb-1 block">เดือน</label>
        <select
          value={selectedMonth}
          onChange={(e) => handleMonthChange(e.target.value)}
          className="w-full rounded-lg border bg-background text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
        >
          {[...months].reverse().map((m) => (
            <option key={m} value={m}>{monthLabel(m)}</option>
          ))}
        </select>
      </div>

      {/* Platform inputs */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {PLATFORMS.map((p) => (
          <div key={p.key}>
            <label className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full bg-gradient-to-br ${p.gradient} shrink-0`} />
              {p.label}
            </label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="จำนวน"
              value={values[p.key]}
              onChange={(e) => setValues((v) => ({ ...v, [p.key]: e.target.value }))}
              className="w-full rounded-lg border bg-background text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-500/30 placeholder:text-muted-foreground/40"
            />
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        className={`w-full py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
          saved
            ? "bg-green-500 text-white"
            : "bg-violet-600 hover:bg-violet-700 active:scale-[0.98] text-white"
        }`}
      >
        {saved ? "✓ บันทึกแล้ว!" : "บันทึก"}
      </button>
    </div>
  );
}

// ─── Edit Targets Modal ───────────────────────────────────────────────────────
function EditTargetsModal({ onClose }: { onClose: () => void }) {
  const { targets, setTargets } = useOKRFollowerStore();
  const [vals, setVals] = useState<Record<PlatformKey, string>>({
    facebook:    String(targets.facebook),
    youtube:     String(targets.youtube),
    tiktok:      String(targets.tiktok),
    google_maps: targets.google_maps != null ? String(targets.google_maps) : "",
  });

  const handleSave = () => {
    const toNum = (s: string): number | null => {
      const n = parseInt(s.trim(), 10);
      return isNaN(n) ? null : n;
    };
    setTargets({
      facebook:    toNum(vals.facebook)    ?? targets.facebook,
      youtube:     toNum(vals.youtube)     ?? targets.youtube,
      tiktok:      toNum(vals.tiktok)      ?? targets.tiktok,
      google_maps: toNum(vals.google_maps),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl border shadow-2xl w-full max-w-xs animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-sm">แก้ไขเป้าหมาย</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          {PLATFORMS.map((p) => (
            <div key={p.key}>
              <label className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full bg-gradient-to-br ${p.gradient}`} />
                {p.label} — เป้าหมาย
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder={p.key === "google_maps" ? "ยังไม่กำหนด" : "กรอกเป้าหมาย"}
                value={vals[p.key]}
                onChange={(e) => setVals((v) => ({ ...v, [p.key]: e.target.value }))}
                className="w-full rounded-lg border bg-background text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              />
            </div>
          ))}
        </div>
        <div className="flex gap-2 p-4 border-t">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl border text-sm hover:bg-muted transition-colors">
            ยกเลิก
          </button>
          <button onClick={handleSave} className="flex-1 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors">
            บันทึก
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OKRFollowerPage() {
  const { entries, targets } = useOKRFollowerStore();
  const [showEditTargets, setShowEditTargets] = useState(false);
  const { q, year } = currentQuarter();

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5 pb-10">
      {showEditTargets && (
        <EditTargetsModal onClose={() => setShowEditTargets(false)} />
      )}

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-sm">
              <Target className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">OKR Follower Growth</h1>
          </div>
          <div className="flex items-center gap-2 ml-11.5">
            <span className="text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded-full font-medium">
              Q{q}/{year}
            </span>
            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
              บีม · รายเดือน
            </span>
          </div>
        </div>
        <button
          onClick={() => setShowEditTargets(true)}
          className="flex items-center gap-1.5 text-xs border rounded-xl px-3 py-2 hover:bg-muted transition-colors shrink-0"
        >
          <Pencil className="w-3.5 h-3.5" />
          แก้ไขเป้า
        </button>
      </div>

      {/* ── 4 Platform Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {PLATFORMS.map((p) => (
          <PlatformCard
            key={p.key}
            platform={p}
            entries={entries}
            target={targets[p.key as keyof OKRTargets] as number | null}
          />
        ))}
      </div>

      {/* ── 4 Mini Charts 2×2 ── */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          ความคืบหน้ารายเดือน (12 เดือนล่าสุด)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {PLATFORMS.map((p) => (
            <div key={p.key} className="bg-card border rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${p.gradient} flex items-center justify-center text-white text-[10px] font-bold`}>
                    {p.abbr}
                  </div>
                  <span className="text-sm font-semibold">{p.label}</span>
                </div>
                {targets[p.key as keyof OKRTargets] != null && (
                  <span className="text-[10px] text-muted-foreground">
                    เป้า {fmtNum(targets[p.key as keyof OKRTargets] as number)}
                  </span>
                )}
              </div>
              <MiniBarChart
                entries={entries}
                platform={p.key}
                target={targets[p.key as keyof OKRTargets] as number | null}
                color={p.color}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom Row: YoY + Input ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <YoYPanel entries={entries} />
        <InputForm />
      </div>
    </div>
  );
}
