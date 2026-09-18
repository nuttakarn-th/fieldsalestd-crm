/**
 * OTAContentCalendar.tsx — ปฏิทินบริหาร Content + To-do Checklist
 * Route: /ota/content-calendar
 *
 * - Platform ปรับแต่งได้อิสระ (เพิ่ม/แก้/ลบ)
 * - Pillar แสดงในแต่ละวันของปฏิทินอัตโนมัติ
 * - กดวันที่ → Day panel: เพิ่ม Task + checklist โพสแล้ว
 */
import { useState, useMemo, useEffect, useRef } from "react";
import {
  ChevronLeft, ChevronRight, Plus, X, Trash2,
  Check, ChevronDown, ChevronUp, CalendarDays, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────
interface CustomPlatform {
  id: string;
  name: string;
  color: ColorKey; // key into COLOR_MAP
}

interface ContentTask {
  id: string;
  date: string;          // YYYY-MM-DD
  title: string;
  notes: string;
  platforms: string[];   // platform ids ที่วางแผนจะโพส
  postedOn: string[];    // platform ids ที่โพสแล้ว
  pillarId?: string;
}

interface ContentPillar {
  id: string;
  dayOfWeek: number;     // 0=Sun … 6=Sat
  platformId: string;
  title: string;         // template ชื่อหัวข้อ
}

// ─── Color palette ────────────────────────────────────────────────────────────
type ColorKey = "blue" | "pink" | "green" | "red" | "yellow" | "orange" | "purple" | "teal" | "indigo" | "gray";

const COLOR_MAP: Record<ColorKey, { bg: string; text: string; dot: string; label: string }> = {
  blue:   { bg: "bg-blue-100",   text: "text-blue-800",   dot: "bg-blue-500",   label: "น้ำเงิน"  },
  pink:   { bg: "bg-pink-100",   text: "text-pink-800",   dot: "bg-pink-500",   label: "ชมพู"    },
  green:  { bg: "bg-green-100",  text: "text-green-800",  dot: "bg-green-500",  label: "เขียว"   },
  red:    { bg: "bg-red-100",    text: "text-red-800",    dot: "bg-red-500",    label: "แดง"     },
  yellow: { bg: "bg-yellow-100", text: "text-yellow-800", dot: "bg-yellow-500", label: "เหลือง"  },
  orange: { bg: "bg-orange-100", text: "text-orange-800", dot: "bg-orange-500", label: "ส้ม"     },
  purple: { bg: "bg-purple-100", text: "text-purple-800", dot: "bg-purple-500", label: "ม่วง"    },
  teal:   { bg: "bg-teal-100",   text: "text-teal-800",   dot: "bg-teal-500",   label: "น้ำทะเล"},
  indigo: { bg: "bg-indigo-100", text: "text-indigo-800", dot: "bg-indigo-500", label: "คราม"    },
  gray:   { bg: "bg-gray-100",   text: "text-gray-700",   dot: "bg-gray-400",   label: "เทา"     },
};
const COLOR_KEYS = Object.keys(COLOR_MAP) as ColorKey[];

const DEFAULT_PLATFORMS: CustomPlatform[] = [
  { id: "facebook",  name: "Facebook",  color: "blue"  },
  { id: "instagram", name: "Instagram", color: "pink"  },
  { id: "line",      name: "LINE",      color: "green" },
  { id: "youtube",   name: "YouTube",   color: "red"   },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const DAY_NAMES_TH = ["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัส","ศุกร์","เสาร์"];
const DAY_SHORT    = ["อา","จ","อ","พ","พฤ","ศ","ส"];
const MONTH_TH = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
                  "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];

function toYMD(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}
function fmtDateTH(ymd: string) {
  const d = new Date(ymd + "T00:00:00");
  return d.toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
function monthBounds(y: number, m: number) {
  return { days: new Date(y, m, 0).getDate(), firstDow: new Date(y, m - 1, 1).getDay() };
}

const T_KEY  = "ota_content_tasks_v2";
const P_KEY  = "ota_content_pillars_v2";
const PL_KEY = "ota_platforms_v1";

function load<T>(key: string): T[] { try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; } }
function save(key: string, v: unknown) { localStorage.setItem(key, JSON.stringify(v)); }

function taskDone(t: ContentTask) { return t.platforms.length > 0 && t.platforms.every(p => t.postedOn.includes(p)); }
function taskProgress(t: ContentTask) {
  if (!t.platforms.length) return null;
  return `${t.postedOn.filter(p => t.platforms.includes(p)).length}/${t.platforms.length}`;
}

function platById(platforms: CustomPlatform[], id: string): CustomPlatform | undefined {
  return platforms.find(p => p.id === id);
}
function cfgByPlat(p: CustomPlatform) { return COLOR_MAP[p.color]; }

// ─── Sub-components ───────────────────────────────────────────────────────────

/** สีจุด + ชื่อ Platform แบบ pill */
function PlatPill({ platform, posted }: { platform: CustomPlatform; posted: boolean }) {
  const c = cfgByPlat(platform);
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium rounded px-1.5 py-0.5",
      posted ? "bg-muted text-muted-foreground line-through" : `${c.bg} ${c.text}`)}>
      {posted ? <Check className="w-2.5 h-2.5" /> : <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", c.dot)} />}
      {platform.name}
    </span>
  );
}

// ─── Platform Manager ─────────────────────────────────────────────────────────
function PlatformManager({ platforms, onSave }: { platforms: CustomPlatform[]; onSave: (p: CustomPlatform[]) => void }) {
  const [list, setList]     = useState<CustomPlatform[]>(platforms);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<ColorKey>("blue");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState<ColorKey>("blue");

  function add() {
    if (!newName.trim()) return;
    const updated = [...list, { id: `plt-${Date.now()}`, name: newName.trim(), color: newColor }];
    setList(updated); onSave(updated); setNewName(""); setNewColor("blue");
  }
  function remove(id: string) { const u = list.filter(p => p.id !== id); setList(u); onSave(u); }
  function startEdit(p: CustomPlatform) { setEditId(p.id); setEditName(p.name); setEditColor(p.color); }
  function commitEdit() {
    if (!editName.trim()) { setEditId(null); return; }
    const u = list.map(p => p.id === editId ? { ...p, name: editName.trim(), color: editColor } : p);
    setList(u); onSave(u); setEditId(null);
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4 mb-4">
      <p className="font-semibold text-sm">Platform ที่ใช้โพส</p>

      {/* existing */}
      <div className="space-y-2">
        {list.map(p => {
          const c = cfgByPlat(p);
          if (editId === p.id) return (
            <div key={p.id} className="flex items-center gap-2">
              <input autoFocus className="flex-1 text-sm border border-border rounded-lg px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-purple-400"
                value={editName} onChange={e => setEditName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditId(null); }} />
              <div className="flex gap-1 flex-wrap">
                {COLOR_KEYS.map(ck => (
                  <button key={ck} onClick={() => setEditColor(ck)}
                    className={cn("w-5 h-5 rounded-full border-2 transition-all", COLOR_MAP[ck].dot,
                      editColor === ck ? "border-foreground scale-125" : "border-transparent")} />
                ))}
              </div>
              <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white px-2" onClick={commitEdit}>บันทึก</Button>
            </div>
          );
          return (
            <div key={p.id} className="flex items-center gap-2">
              <span className={cn("flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg", c.bg, c.text)}>
                <span className={cn("w-2 h-2 rounded-full", c.dot)} />{p.name}
              </span>
              <div className="ml-auto flex gap-1">
                <button onClick={() => startEdit(p)} className="text-muted-foreground hover:text-foreground p-1"><ChevronDown className="w-3.5 h-3.5" /></button>
                <button onClick={() => remove(p.id)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          );
        })}
      </div>

      {/* add new */}
      <div className="border-t border-border pt-3 space-y-2">
        <p className="text-xs text-muted-foreground font-medium">เพิ่ม Platform ใหม่</p>
        <div className="flex gap-1.5 flex-wrap">
          {COLOR_KEYS.map(ck => (
            <button key={ck} onClick={() => setNewColor(ck)}
              className={cn("w-5 h-5 rounded-full border-2 transition-all", COLOR_MAP[ck].dot,
                newColor === ck ? "border-foreground scale-125" : "border-transparent")} />
          ))}
        </div>
        <div className="flex gap-2">
          <input className="flex-1 border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-purple-400"
            placeholder="ชื่อ Platform เช่น TikTok, Twitter..."
            value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && add()} />
          <Button size="sm" onClick={add} disabled={!newName.trim()} className="bg-purple-600 hover:bg-purple-700 text-white px-3">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Pillar Manager ────────────────────────────────────────────────────────────
function PillarManager({ pillars, platforms, onAdd, onRemove }: {
  pillars: ContentPillar[];
  platforms: CustomPlatform[];
  onAdd: (p: Omit<ContentPillar, "id">) => void;
  onRemove: (id: string) => void;
}) {
  const [day, setDay]           = useState(1);
  const [platformId, setPlatformId] = useState(platforms[0]?.id ?? "");
  const [title, setTitle]       = useState("");

  // sync platformId when platforms list changes
  useEffect(() => {
    if (!platforms.find(p => p.id === platformId) && platforms.length > 0) {
      setPlatformId(platforms[0].id);
    }
  }, [platforms, platformId]);

  function submit() {
    if (!title.trim() || !platformId) return;
    onAdd({ dayOfWeek: day, platformId, title: title.trim() });
    setTitle("");
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4 mb-4">
      <div>
        <p className="font-semibold text-sm">Pillar ประจำสัปดาห์</p>
        <p className="text-xs text-muted-foreground mt-0.5">Template หัวข้อที่แนะนำอัตโนมัติ และแสดงในปฏิทินทุกสัปดาห์</p>
      </div>

      <div className="space-y-2">
        {/* day picker */}
        <div className="flex gap-1.5 flex-wrap">
          {DAY_NAMES_TH.map((d, i) => (
            <button key={i} onClick={() => setDay(i)}
              className={cn("px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors",
                day === i ? "bg-purple-600 text-white border-transparent" : "border-border text-muted-foreground")}>
              {d}
            </button>
          ))}
        </div>

        {/* platform picker */}
        {platforms.length > 0 ? (
          <div className="flex gap-1.5 flex-wrap">
            {platforms.map(p => {
              const c = cfgByPlat(p);
              return (
                <button key={p.id} onClick={() => setPlatformId(p.id)}
                  className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors",
                    platformId === p.id ? `${c.bg} ${c.text} border-transparent` : "border-border text-muted-foreground")}>
                  <span className={cn("w-2 h-2 rounded-full", c.dot)} />{p.name}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">ยังไม่มี Platform — เพิ่มด้านบนก่อน</p>
        )}

        {/* title input */}
        <div className="flex gap-2">
          <input
            className="flex-1 border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-purple-400"
            placeholder="Template ชื่อหัวข้อ... เช่น รีวิวสถานที่เที่ยว"
            value={title} onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === "Enter" && submit()} />
          <Button size="sm" onClick={submit} disabled={!title.trim() || !platformId}
            className="bg-purple-600 hover:bg-purple-700 text-white px-3">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* pillar list by day */}
      <div className="space-y-1.5">
        {DAY_NAMES_TH.map((d, i) => {
          const items = pillars.filter(p => p.dayOfWeek === i);
          if (!items.length) return null;
          return (
            <div key={i} className="flex items-start gap-2">
              <span className="text-xs font-medium text-muted-foreground w-14 pt-1 shrink-0">{d}</span>
              <div className="flex flex-wrap gap-1.5">
                {items.map(p => {
                  const plat = platById(platforms, p.platformId);
                  if (!plat) return null;
                  const c = cfgByPlat(plat);
                  return (
                    <span key={p.id} className={cn("inline-flex items-center gap-1.5 text-xs font-medium rounded-lg px-2 py-1", c.bg, c.text)}>
                      {plat.name} · {p.title}
                      <button onClick={() => onRemove(p.id)} className="hover:text-red-600 ml-0.5"><X className="w-3 h-3" /></button>
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
        {!pillars.length && <p className="text-xs text-muted-foreground">ยังไม่มี Pillar — เพิ่มด้านบนเพื่อให้ระบบแนะนำหัวข้ออัตโนมัติ</p>}
      </div>
    </div>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────
function TaskCard({ task, platforms, onUpdate, onDelete }: {
  task: ContentTask;
  platforms: CustomPlatform[];
  onUpdate: (t: ContentTask) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editTitle, setEditTitle] = useState(false);
  const [title, setTitle]       = useState(task.title);
  const [notes, setNotes]       = useState(task.notes);
  const done     = taskDone(task);
  const progress = taskProgress(task);
  const titleRef = useRef<HTMLInputElement>(null);

  function togglePosted(id: string) {
    const already = task.postedOn.includes(id);
    onUpdate({ ...task, postedOn: already ? task.postedOn.filter(x => x !== id) : [...task.postedOn, id] });
  }
  function togglePlatform(id: string) {
    const has = task.platforms.includes(id);
    const newPlats  = has ? task.platforms.filter(x => x !== id) : [...task.platforms, id];
    const newPosted = task.postedOn.filter(x => newPlats.includes(x));
    onUpdate({ ...task, platforms: newPlats, postedOn: newPosted });
  }
  function commitTitle() {
    if (title.trim()) onUpdate({ ...task, title: title.trim() });
    else setTitle(task.title);
    setEditTitle(false);
  }
  function commitNotes() { onUpdate({ ...task, notes }); }
  useEffect(() => { if (editTitle) titleRef.current?.focus(); }, [editTitle]);

  return (
    <div className={cn("border rounded-xl transition-colors", done ? "border-border bg-muted/30" : "border-border bg-card")}>
      {/* Header */}
      <div className="flex items-start gap-2 p-3">
        <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors",
          done ? "border-green-500 bg-green-500" : "border-border")}>
          {done && <Check className="w-3 h-3 text-white" />}
        </div>
        <div className="flex-1 min-w-0">
          {editTitle ? (
            <input ref={titleRef}
              className="w-full text-sm font-medium bg-background border border-purple-400 rounded px-2 py-0.5 focus:outline-none"
              value={title} onChange={e => setTitle(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={e => { if (e.key === "Enter") commitTitle(); if (e.key === "Escape") { setTitle(task.title); setEditTitle(false); } }} />
          ) : (
            <p className={cn("text-sm font-medium cursor-pointer hover:text-purple-600 truncate", done && "line-through text-muted-foreground")}
              onClick={() => setEditTitle(true)}>
              {task.title}
            </p>
          )}
          {progress && <span className="text-[11px] text-muted-foreground">{progress} platform โพสแล้ว</span>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setExpanded(v => !v)} className="text-muted-foreground hover:text-foreground p-0.5">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button onClick={onDelete} className="text-muted-foreground hover:text-destructive p-0.5">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
          {/* Platform selector */}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5 font-medium">วางแผนโพสบน</p>
            <div className="flex gap-1.5 flex-wrap">
              {platforms.map(p => {
                const selected = task.platforms.includes(p.id);
                const c = cfgByPlat(p);
                return (
                  <button key={p.id} onClick={() => togglePlatform(p.id)}
                    className={cn("flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium border transition-all",
                      selected ? `${c.bg} ${c.text} border-transparent` : "border-border text-muted-foreground hover:border-border")}>
                    <span className={cn("w-2 h-2 rounded-full", c.dot)} />{p.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Posted checklist */}
          {task.platforms.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5 font-medium">โพสแล้วบน</p>
              <div className="space-y-1.5">
                {task.platforms.map(pid => {
                  const plat = platById(platforms, pid);
                  if (!plat) return null;
                  const c = cfgByPlat(plat);
                  const posted = task.postedOn.includes(pid);
                  return (
                    <button key={pid} onClick={() => togglePosted(pid)}
                      className={cn("w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm border transition-all text-left",
                        posted ? "bg-green-50 border-green-200 text-green-800" : `${c.bg} border-transparent ${c.text} hover:brightness-95`)}>
                      <div className={cn("w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                        posted ? "bg-green-500 border-green-500" : "border-current opacity-50")}>
                        {posted && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className={cn("font-medium flex-1", posted && "line-through")}>{plat.name}</span>
                      {posted && <span className="text-xs text-green-600">โพสแล้ว ✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5 font-medium">รายละเอียด / โน้ตเนื้อหา</p>
            <textarea
              className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-purple-400 resize-none"
              rows={3}
              placeholder="ใส่รายละเอียดเนื้อหา, link, hashtag, หรือโน้ตสำหรับทีม..."
              value={notes} onChange={e => setNotes(e.target.value)} onBlur={commitNotes} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── New Task Form ────────────────────────────────────────────────────────────
function NewTaskForm({ date, pillarSuggestions, platforms, onAdd, onCancel }: {
  date: string;
  pillarSuggestions: ContentPillar[];
  platforms: CustomPlatform[];
  onAdd: (t: Omit<ContentTask, "id">) => void;
  onCancel: () => void;
}) {
  const [title, setTitle]       = useState("");
  const [notes, setNotes]       = useState("");
  const [platIds, setPlatIds]   = useState<string[]>([]);

  function toggle(id: string) {
    setPlatIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }
  function submit() {
    if (!title.trim()) return;
    onAdd({ date, title: title.trim(), notes, platforms: platIds, postedOn: [] });
  }

  return (
    <div className="border border-purple-300 rounded-xl p-3 space-y-3 bg-purple-50/30">
      <input autoFocus
        className="w-full text-sm font-medium border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-purple-400"
        placeholder="ชื่อหัวข้อ Content..."
        value={title} onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") onCancel(); }} />

      {/* Pillar suggestions */}
      {pillarSuggestions.length > 0 && !title && (
        <div>
          <p className="text-[11px] text-muted-foreground mb-1.5">แนะนำจาก Pillar:</p>
          <div className="flex gap-1.5 flex-wrap">
            {pillarSuggestions.map(p => {
              const plat = platById(platforms, p.platformId);
              if (!plat) return null;
              const c = cfgByPlat(plat);
              return (
                <button key={p.id} onClick={() => { setTitle(p.title); setPlatIds([p.platformId]); }}
                  className={cn("text-xs px-2 py-1 rounded-lg font-medium border-0", c.bg, c.text)}>
                  {plat.name} · {p.title}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Platform selector */}
      <div>
        <p className="text-[11px] text-muted-foreground mb-1.5">โพสบน Platform:</p>
        <div className="flex gap-1.5 flex-wrap">
          {platforms.map(p => {
            const c = cfgByPlat(p);
            return (
              <button key={p.id} onClick={() => toggle(p.id)}
                className={cn("flex items-center gap-1 text-xs px-2 py-1 rounded-lg border font-medium transition-all",
                  platIds.includes(p.id) ? `${c.bg} ${c.text} border-transparent` : "border-border text-muted-foreground")}>
                <span className={cn("w-1.5 h-1.5 rounded-full", c.dot)} />{p.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2">
        <Button size="sm" disabled={!title.trim()} onClick={submit}
          className="flex-1 bg-purple-600 hover:bg-purple-700 text-white">
          <Plus className="w-3.5 h-3.5 mr-1" />เพิ่ม Task
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>ยกเลิก</Button>
      </div>
    </div>
  );
}

// ─── Day Panel ────────────────────────────────────────────────────────────────
function DayPanel({ ymd, tasks, pillars, platforms, onClose, onAdd, onUpdate, onDelete }: {
  ymd: string;
  tasks: ContentTask[];
  pillars: ContentPillar[];
  platforms: CustomPlatform[];
  onClose: () => void;
  onAdd: (t: Omit<ContentTask, "id">) => void;
  onUpdate: (t: ContentTask) => void;
  onDelete: (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const dow = new Date(ymd + "T00:00:00").getDay();
  const suggestions = pillars.filter(p => p.dayOfWeek === dow);
  const doneCount = tasks.filter(taskDone).length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between px-4 py-3 border-b border-border shrink-0">
        <div>
          <p className="font-semibold text-sm">{fmtDateTH(ymd)}</p>
          {tasks.length > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">{doneCount}/{tasks.length} task โพสแล้ว</p>
          )}
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground mt-0.5">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Pillar hint for this day */}
      {suggestions.length > 0 && tasks.length === 0 && (
        <div className="px-4 pt-3">
          <p className="text-[11px] text-muted-foreground mb-1.5 font-medium">Pillar ของวันนี้:</p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map(p => {
              const plat = platById(platforms, p.platformId);
              if (!plat) return null;
              const c = cfgByPlat(plat);
              return (
                <span key={p.id} className={cn("inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-medium", c.bg, c.text)}>
                  <span className={cn("w-1.5 h-1.5 rounded-full", c.dot)} />{plat.name} · {p.title}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {tasks.length === 0 && !adding && (
          <div className="text-center py-8">
            <CalendarDays className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">ยังไม่มี Content วันนี้</p>
            <p className="text-xs text-muted-foreground/70 mt-1">กด + เพิ่ม Task เพื่อวางแผน</p>
          </div>
        )}

        {tasks.map(t => (
          <TaskCard key={t.id} task={t} platforms={platforms}
            onUpdate={onUpdate} onDelete={() => onDelete(t.id)} />
        ))}

        {adding ? (
          <NewTaskForm date={ymd} pillarSuggestions={suggestions} platforms={platforms}
            onAdd={(t) => { onAdd(t); setAdding(false); }}
            onCancel={() => setAdding(false)} />
        ) : (
          <button onClick={() => setAdding(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-sm text-purple-600 hover:text-purple-700 border border-dashed border-purple-300 rounded-xl hover:border-purple-400 transition-colors">
            <Plus className="w-4 h-4" />เพิ่ม Content Task
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
type Tab = "pillar" | "platform";

export default function OTAContentCalendar() {
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const [tasks,     setTasks]     = useState<ContentTask[]>(() => load<ContentTask>(T_KEY));
  const [pillars,   setPillars]   = useState<ContentPillar[]>(() => load<ContentPillar>(P_KEY));
  const [platforms, setPlatforms] = useState<CustomPlatform[]>(() => {
    const saved = load<CustomPlatform>(PL_KEY);
    return saved.length > 0 ? saved : DEFAULT_PLATFORMS;
  });

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [settingsTab,  setSettingsTab]  = useState<Tab>("pillar");
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => { save(T_KEY,  tasks);     }, [tasks]);
  useEffect(() => { save(P_KEY,  pillars);   }, [pillars]);
  useEffect(() => { save(PL_KEY, platforms); }, [platforms]);

  const { days, firstDow } = useMemo(() => monthBounds(year, month), [year, month]);
  const todayYMD = toYMD(today.getFullYear(), today.getMonth() + 1, today.getDate());

  function prevMonth() { if (month === 1) { setYear(y => y - 1); setMonth(12); } else setMonth(m => m - 1); }
  function nextMonth() { if (month === 12) { setYear(y => y + 1); setMonth(1); } else setMonth(m => m + 1); }

  function addTask(t: Omit<ContentTask, "id">) {
    setTasks(prev => [...prev, { ...t, id: `task-${Date.now()}-${Math.random().toString(36).slice(2,6)}` }]);
  }
  function updateTask(t: ContentTask) { setTasks(prev => prev.map(x => x.id === t.id ? t : x)); }
  function deleteTask(id: string)     { setTasks(prev => prev.filter(x => x.id !== id)); }

  function addPillar(p: Omit<ContentPillar, "id">) {
    setPillars(prev => [...prev, { ...p, id: `pillar-${Date.now()}` }]);
  }
  function removePillar(id: string) { setPillars(prev => prev.filter(p => p.id !== id)); }

  const trailingEmpties = (firstDow + days) % 7 === 0 ? 0 : 7 - ((firstDow + days) % 7);
  const selectedTasks   = selectedDate ? tasks.filter(t => t.date === selectedDate) : [];

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* ── Header ── */}
      <div className="shrink-0 px-4 sm:px-6 pt-5 pb-3 flex items-start justify-between gap-3 border-b border-border">
        <div>
          <h1 className="text-xl font-bold">📅 Content Calendar</h1>
          <p className="text-xs text-muted-foreground mt-0.5">วางแผนและติดตามการโพส Content รายวัน</p>
        </div>
        <button
          onClick={() => setShowSettings(v => !v)}
          className={cn("flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors shrink-0",
            showSettings ? "border-purple-400 bg-purple-50 text-purple-700" : "border-border text-muted-foreground hover:text-foreground")}>
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">ตั้งค่า</span>
        </button>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Left: Calendar ── */}
        <div className={cn("flex flex-col overflow-hidden transition-all",
          selectedDate ? "hidden sm:flex sm:flex-1" : "flex-1")}>
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">

            {/* Settings panel */}
            {showSettings && (
              <div className="mb-4">
                {/* Tab strip */}
                <div className="flex border-b border-border mb-4">
                  {(["pillar","platform"] as Tab[]).map(tab => (
                    <button key={tab} onClick={() => setSettingsTab(tab)}
                      className={cn("px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
                        settingsTab === tab ? "border-purple-600 text-purple-700" : "border-transparent text-muted-foreground hover:text-foreground")}>
                      {tab === "pillar" ? "Pillar (หัวข้อประจำสัปดาห์)" : "Platform"}
                    </button>
                  ))}
                </div>
                {settingsTab === "platform" ? (
                  <PlatformManager platforms={platforms} onSave={setPlatforms} />
                ) : (
                  <PillarManager pillars={pillars} platforms={platforms} onAdd={addPillar} onRemove={removePillar} />
                )}
              </div>
            )}

            {/* Month nav */}
            <div className="flex items-center justify-between mb-3">
              <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="font-semibold">{MONTH_TH[month - 1]} {year + 543}</span>
              <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DAY_SHORT.map((d, i) => (
                <div key={d} className={cn("text-center text-xs font-medium py-1",
                  i === 0 || i === 6 ? "text-muted-foreground/60" : "text-muted-foreground")}>{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDow }).map((_, i) => <div key={`l${i}`} />)}

              {Array.from({ length: days }).map((_, i) => {
                const d      = i + 1;
                const dow    = (firstDow + i) % 7;
                const ymd    = toYMD(year, month, d);
                const dayTasks   = tasks.filter(t => t.date === ymd);
                const doneTasks  = dayTasks.filter(taskDone).length;
                const dayPillars = pillars.filter(p => p.dayOfWeek === dow);
                const isToday    = ymd === todayYMD;
                const isSelected = ymd === selectedDate;
                const isWeekend  = dow === 0 || dow === 6;
                const allDone    = dayTasks.length > 0 && doneTasks === dayTasks.length;

                return (
                  <div key={ymd} onClick={() => setSelectedDate(isSelected ? null : ymd)}
                    className={cn(
                      "border rounded-xl p-1.5 min-h-[80px] sm:min-h-[90px] cursor-pointer transition-all",
                      isSelected  ? "border-purple-500 ring-2 ring-purple-400 ring-offset-1 bg-purple-50/50" :
                      isToday     ? "border-purple-300 ring-1 ring-purple-300" :
                      isWeekend   ? "bg-muted/20 border-border/40 hover:border-border" :
                                    "bg-card border-border hover:border-purple-300"
                    )}>
                    {/* date + done badge */}
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn("text-xs font-medium",
                        isToday ? "text-purple-600 font-bold" :
                        isWeekend ? "text-muted-foreground/70" : "text-foreground")}>{d}</span>
                      {allDone && <Check className="w-3 h-3 text-green-500" />}
                      {dayTasks.length > 0 && !allDone && (
                        <span className="text-[9px] text-muted-foreground">{doneTasks}/{dayTasks.length}</span>
                      )}
                    </div>

                    {/* Tasks */}
                    <div className="space-y-0.5 overflow-hidden">
                      {dayTasks.slice(0, 2).map(t => {
                        const done = taskDone(t);
                        const mainPlat = platById(platforms, t.platforms[0] ?? "");
                        const c = mainPlat ? cfgByPlat(mainPlat) : null;
                        return (
                          <div key={t.id} className={cn(
                            "text-[10px] font-medium rounded px-1.5 py-0.5 flex items-center gap-1 min-w-0",
                            done ? "bg-muted text-muted-foreground line-through" :
                            c    ? `${c.bg} ${c.text}` : "bg-muted text-muted-foreground")}>
                            <span className="truncate flex-1">{t.title}</span>
                            {!done && t.platforms.length > 0 && (
                              <span className="flex gap-0.5 shrink-0">
                                {t.platforms.slice(0, 4).map(pid => {
                                  const pp = platById(platforms, pid);
                                  if (!pp) return null;
                                  const pc = cfgByPlat(pp);
                                  return <span key={pid} className={cn("w-2 h-2 rounded-full border border-white/60", pc.dot)} />;
                                })}
                              </span>
                            )}
                          </div>
                        );
                      })}
                      {dayTasks.length > 2 && <div className="text-[9px] text-muted-foreground pl-1">+{dayTasks.length - 2}</div>}
                    </div>

                    {/* Pillar indicators (แสดงเมื่อไม่มี task) */}
                    {dayPillars.length > 0 && dayTasks.length === 0 && (
                      <div className="mt-1 space-y-0.5">
                        {dayPillars.slice(0, 2).map(p => {
                          const plat = platById(platforms, p.platformId);
                          if (!plat) return null;
                          const c = cfgByPlat(plat);
                          return (
                            <div key={p.id} className={cn(
                              "text-[9px] font-medium rounded px-1 py-0.5 truncate opacity-60 border border-dashed",
                              c.bg, c.text)}>
                              {plat.name}: {p.title}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {Array.from({ length: trailingEmpties }).map((_, i) => <div key={`r${i}`} />)}
            </div>

            {/* Legend */}
            <div className="mt-4 flex gap-3 flex-wrap items-center">
              {platforms.map(p => {
                const c = cfgByPlat(p);
                return (
                  <div key={p.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className={cn("w-2 h-2 rounded-full", c.dot)} />{p.name}
                  </div>
                );
              })}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Check className="w-3 h-3 text-green-500" />โพสครบแล้ว
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-3 h-3 border border-dashed border-muted-foreground rounded-sm" />Pillar (ยังไม่มี task)
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: Day Panel ── */}
        {selectedDate && (
          <div className={cn(
            "flex flex-col border-l border-border bg-background",
            "w-full sm:w-80 md:w-96 shrink-0",
            "fixed inset-0 sm:relative sm:inset-auto z-40 sm:z-auto"
          )}>
            <DayPanel
              ymd={selectedDate}
              tasks={selectedTasks}
              pillars={pillars}
              platforms={platforms}
              onClose={() => setSelectedDate(null)}
              onAdd={addTask}
              onUpdate={updateTask}
              onDelete={deleteTask}
            />
          </div>
        )}
      </div>
    </div>
  );
}
