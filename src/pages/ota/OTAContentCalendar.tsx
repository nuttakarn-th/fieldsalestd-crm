/**
 * OTAContentCalendar.tsx — ปฏิทินบริหาร Content สำหรับทีม OTA / Marketing
 * Route: /ota/content-calendar
 * เก็บ Pillars + one-off entries ใน localStorage
 */
import { useState, useMemo, useEffect } from "react";
import {
  ChevronLeft, ChevronRight, Plus, X, Pencil, Check, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────
type Platform = "Facebook" | "Instagram" | "LINE" | "YouTube";

interface ContentPillar {
  id: string;
  dayOfWeek: number; // 0=Sun … 6=Sat
  platform: Platform;
  topic: string;
}

interface ContentEntry {
  id: string;
  date: string; // YYYY-MM-DD
  platform: Platform;
  topic: string;
}

// ─── Platform config ──────────────────────────────────────────────────────────
const PLATFORMS: { value: Platform; label: string; color: string; text: string; dot: string }[] = [
  { value: "Facebook",  label: "Facebook",  color: "bg-blue-100",   text: "text-blue-800",   dot: "bg-blue-500"   },
  { value: "Instagram", label: "Instagram", color: "bg-pink-100",   text: "text-pink-800",   dot: "bg-pink-500"   },
  { value: "LINE",      label: "LINE",      color: "bg-green-100",  text: "text-green-800",  dot: "bg-green-500"  },
  { value: "YouTube",   label: "YouTube",   color: "bg-red-100",    text: "text-red-800",    dot: "bg-red-500"    },
];

const DAY_NAMES_TH = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์"];
const DAY_SHORT    = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const MONTH_TH = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
                  "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];

function platCfg(p: Platform) { return PLATFORMS.find(x => x.value === p)!; }
function monthBounds(y: number, m: number) {
  const start = new Date(y, m - 1, 1);
  const end   = new Date(y, m, 0);
  return { start, end, days: end.getDate(), firstDow: start.getDay() };
}
function toYMD(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}

// ─── Storage helpers ──────────────────────────────────────────────────────────
const PILLAR_KEY = "ota_content_pillars";
const ENTRY_KEY  = "ota_content_entries";
function loadPillars(): ContentPillar[]  { try { return JSON.parse(localStorage.getItem(PILLAR_KEY) || "[]"); } catch { return []; } }
function loadEntries(): ContentEntry[]   { try { return JSON.parse(localStorage.getItem(ENTRY_KEY)  || "[]"); } catch { return []; } }
function savePillars(p: ContentPillar[]) { localStorage.setItem(PILLAR_KEY, JSON.stringify(p)); }
function saveEntries(e: ContentEntry[])  { localStorage.setItem(ENTRY_KEY,  JSON.stringify(e)); }

// ─── Pill component ───────────────────────────────────────────────────────────
function ContentPill({ platform, topic, onRemove }: { platform: Platform; topic: string; onRemove?: () => void }) {
  const cfg = platCfg(platform);
  return (
    <span className={cn("flex items-center gap-1 text-[10px] font-medium rounded px-1.5 py-0.5 leading-tight group", cfg.color, cfg.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dot)} />
      <span className="truncate max-w-[80px]">{topic}</span>
      {onRemove && (
        <button onClick={onRemove} className="opacity-0 group-hover:opacity-100 ml-0.5 hover:text-red-600">
          <X className="w-2.5 h-2.5" />
        </button>
      )}
    </span>
  );
}

// ─── Add-entry modal (inline) ─────────────────────────────────────────────────
function AddEntryPanel({
  date, onAdd, onClose,
}: { date: string; onAdd: (e: Omit<ContentEntry, "id">) => void; onClose: () => void }) {
  const [platform, setPlatform] = useState<Platform>("Facebook");
  const [topic, setTopic] = useState("");
  const label = new Date(date + "T00:00:00").toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-t-2xl sm:rounded-xl w-full sm:max-w-sm p-5 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="font-semibold text-sm">{label}</p>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Platform</label>
          <div className="flex gap-2 flex-wrap">
            {PLATFORMS.map(p => (
              <button
                key={p.value}
                onClick={() => setPlatform(p.value)}
                className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors",
                  platform === p.value ? `${p.color} ${p.text} border-transparent` : "border-border text-muted-foreground hover:border-border-strong"
                )}
              >
                <span className={cn("w-2 h-2 rounded-full", p.dot)} />
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">หัวข้อ Content</label>
          <input
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-purple-400"
            placeholder="เช่น รีวิวสถานที่, รีวิวลูกค้า, โปรโมชั่น..."
            value={topic}
            onChange={e => setTopic(e.target.value)}
            onKeyDown={e => e.key === "Enter" && topic.trim() && onAdd({ date, platform, topic: topic.trim() })}
            autoFocus
          />
        </div>
        <Button
          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          disabled={!topic.trim()}
          onClick={() => topic.trim() && onAdd({ date, platform, topic: topic.trim() })}
        >
          เพิ่ม Content
        </Button>
      </div>
    </div>
  );
}

// ─── Pillar editor ────────────────────────────────────────────────────────────
function PillarEditor({
  pillars, onAdd, onRemove,
}: { pillars: ContentPillar[]; onAdd: (p: Omit<ContentPillar, "id">) => void; onRemove: (id: string) => void }) {
  const [day, setDay]       = useState(1);
  const [platform, setPlatform] = useState<Platform>("Facebook");
  const [topic, setTopic]   = useState("");

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      <p className="font-semibold text-sm">Pillar ประจำสัปดาห์</p>
      <p className="text-xs text-muted-foreground">กำหนดครั้งเดียว ระบบจะแสดงซ้ำทุกสัปดาห์โดยอัตโนมัติ</p>

      {/* add form */}
      <div className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          {DAY_NAMES_TH.map((d, i) => (
            <button
              key={i}
              onClick={() => setDay(i)}
              className={cn("px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors",
                day === i ? "bg-purple-600 text-white border-transparent" : "border-border text-muted-foreground hover:border-border-strong"
              )}
            >
              {d}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {PLATFORMS.map(p => (
            <button
              key={p.value}
              onClick={() => setPlatform(p.value)}
              className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors",
                platform === p.value ? `${p.color} ${p.text} border-transparent` : "border-border text-muted-foreground"
              )}
            >
              <span className={cn("w-2 h-2 rounded-full", p.dot)} />
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-purple-400"
            placeholder="หัวข้อ Content..."
            value={topic}
            onChange={e => setTopic(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && topic.trim()) { onAdd({ dayOfWeek: day, platform, topic: topic.trim() }); setTopic(""); } }}
          />
          <Button
            size="sm"
            disabled={!topic.trim()}
            onClick={() => { if (topic.trim()) { onAdd({ dayOfWeek: day, platform, topic: topic.trim() }); setTopic(""); }}}
            className="bg-purple-600 hover:bg-purple-700 text-white px-3"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* pillar list grouped by day */}
      <div className="space-y-2">
        {DAY_NAMES_TH.map((d, i) => {
          const items = pillars.filter(p => p.dayOfWeek === i);
          if (!items.length) return null;
          return (
            <div key={i} className="flex items-start gap-2">
              <span className="text-xs font-medium text-muted-foreground w-14 pt-0.5 shrink-0">{d}</span>
              <div className="flex flex-wrap gap-1.5">
                {items.map(p => (
                  <div key={p.id} className="flex items-center gap-1">
                    <ContentPill platform={p.platform} topic={p.topic} />
                    <button onClick={() => onRemove(p.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {!pillars.length && <p className="text-xs text-muted-foreground">ยังไม่มี Pillar — เพิ่มด้านบนได้เลย</p>}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function OTAContentCalendar() {
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [pillars, setPillars]   = useState<ContentPillar[]>(loadPillars);
  const [entries, setEntries]   = useState<ContentEntry[]>(loadEntries);
  const [addDate, setAddDate]   = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => { savePillars(pillars); }, [pillars]);
  useEffect(() => { saveEntries(entries); }, [entries]);

  const { days, firstDow } = useMemo(() => monthBounds(year, month), [year, month]);

  function prevMonth() { if (month === 1) { setYear(y => y - 1); setMonth(12); } else setMonth(m => m - 1); }
  function nextMonth() { if (month === 12) { setYear(y => y + 1); setMonth(1); } else setMonth(m => m + 1); }

  function addPillar(p: Omit<ContentPillar, "id">) {
    setPillars(prev => [...prev, { ...p, id: `pillar-${Date.now()}` }]);
  }
  function removePillar(id: string) { setPillars(prev => prev.filter(p => p.id !== id)); }

  function addEntry(e: Omit<ContentEntry, "id">) {
    setEntries(prev => [...prev, { ...e, id: `entry-${Date.now()}` }]);
    setAddDate(null);
  }
  function removeEntry(id: string) { setEntries(prev => prev.filter(e => e.id !== id)); }

  // build calendar grid: 7 cols, pad start with empty cells
  const leadingEmpties = firstDow; // Sun=0
  const totalCells = leadingEmpties + days;
  const trailingEmpties = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);

  const todayYMD = toYMD(today.getFullYear(), today.getMonth() + 1, today.getDate());

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto pb-24 md:pb-8">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span>📅</span> Content Calendar
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">บริหาร Content ทีมตาม Platform และ Pillar</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowEditor(v => !v)}
          className={cn("shrink-0 gap-1.5", showEditor && "border-purple-400 text-purple-600")}
        >
          <Pencil className="w-4 h-4" />
          <span className="hidden sm:inline">Pillars</span>
        </Button>
      </div>

      {/* ── Platform legend ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {PLATFORMS.map(p => (
          <div key={p.value} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={cn("w-2.5 h-2.5 rounded-full", p.dot)} />
            {p.label}
          </div>
        ))}
      </div>

      {/* ── Pillar editor (collapsible) ──────────────────────────────────────── */}
      {showEditor && (
        <div className="mb-5">
          <PillarEditor pillars={pillars} onAdd={addPillar} onRemove={removePillar} />
        </div>
      )}

      {/* ── Month nav ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-semibold text-base">
          {MONTH_TH[month - 1]} {year + 543}
        </span>
        <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* ── Calendar grid ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_SHORT.map((d, i) => (
          <div key={d} className={cn("text-center text-xs font-medium py-1.5",
            i === 0 || i === 6 ? "text-muted-foreground" : "text-muted-foreground")}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {/* leading empty cells */}
        {Array.from({ length: leadingEmpties }).map((_, i) => (
          <div key={`lead-${i}`} />
        ))}

        {/* day cells */}
        {Array.from({ length: days }).map((_, i) => {
          const d = i + 1;
          const dow = (firstDow + i) % 7;
          const ymd = toYMD(year, month, d);
          const isToday   = ymd === todayYMD;
          const isWeekend = dow === 0 || dow === 6;

          const pillarItems = pillars.filter(p => p.dayOfWeek === dow);
          const entryItems  = entries.filter(e => e.date === ymd);
          const allItems    = [...pillarItems.map(p => ({ platform: p.platform, topic: p.topic, isPillar: true, id: p.id })),
                               ...entryItems.map(e => ({ platform: e.platform, topic: e.topic, isPillar: false, id: e.id }))];

          return (
            <div
              key={ymd}
              className={cn(
                "border rounded-lg p-1.5 min-h-[80px] sm:min-h-[100px] cursor-pointer hover:border-purple-300 transition-colors group",
                isWeekend ? "bg-muted/30 border-border/50" : "bg-card border-border",
                isToday && "ring-2 ring-purple-400 ring-offset-1"
              )}
              onClick={() => setAddDate(ymd)}
            >
              <div className={cn("text-xs font-medium mb-1 flex items-center justify-between",
                isToday ? "text-purple-600" : isWeekend ? "text-muted-foreground" : "text-foreground"
              )}>
                <span>{d}</span>
                <Plus className="w-3 h-3 opacity-0 group-hover:opacity-50 text-purple-500" />
              </div>

              <div className="space-y-0.5 overflow-hidden">
                {allItems.slice(0, 3).map(item => (
                  <ContentPill
                    key={item.id}
                    platform={item.platform}
                    topic={item.topic}
                    onRemove={item.isPillar ? undefined : (e => { e.stopPropagation(); removeEntry(item.id); })}
                  />
                ))}
                {allItems.length > 3 && (
                  <span className="text-[9px] text-muted-foreground pl-1">+{allItems.length - 3} อื่นๆ</span>
                )}
              </div>
            </div>
          );
        })}

        {/* trailing empty cells */}
        {Array.from({ length: trailingEmpties }).map((_, i) => (
          <div key={`trail-${i}`} />
        ))}
      </div>

      {/* ── Stats row ────────────────────────────────────────────────────────── */}
      <div className="mt-4 flex gap-3 flex-wrap">
        {PLATFORMS.map(p => {
          const pillarCount = pillars.filter(x => x.platform === p.value).length;
          const entryCount  = entries.filter(x => x.platform === p.value && x.date.startsWith(`${year}-${String(month).padStart(2,"0")}`)).length;
          const total = pillarCount * Math.ceil(days / 7) + entryCount;
          return (
            <div key={p.value} className={cn("flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium", p.color, p.text)}>
              <span className={cn("w-2 h-2 rounded-full", p.dot)} />
              {p.label}
              <span className="font-bold">~{total} โพส</span>
            </div>
          );
        })}
      </div>

      {/* ── Add entry modal ───────────────────────────────────────────────────── */}
      {addDate && (
        <AddEntryPanel
          date={addDate}
          onAdd={addEntry}
          onClose={() => setAddDate(null)}
        />
      )}
    </div>
  );
}
