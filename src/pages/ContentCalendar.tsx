/**
 * ContentCalendar.tsx — v232
 * วางแผน Content Social Media — Calendar View + List View
 * Platform: Facebook / Instagram / TikTok / LINE / YouTube / Lemon8 / X / LinkedIn (multi-select + logos)
 * Content Type: Single Photo / Photo Album / Short VDO / Long VDO
 */
import { useState, useMemo } from "react";
import { ThaiDateInput } from "@/components/ThaiDateInput";
import {
  CalendarDays, List, Plus, Pencil, Trash2,
  ChevronLeft, ChevronRight, Megaphone, X as CloseIcon,
  Filter, Image, Images, Video, Clapperboard,
} from "lucide-react";
import { useCRM, CONTENT_CHANNELS, CONTENT_STATUSES, CONTENT_TYPES } from "@/store/crmStore";
import type { ContentPost, ContentChannel, ContentStatus, ContentType } from "@/store/crmStore";
import { Button } from "@/components/ui/button";

// ─── Static campaigns ─────────────────────────────────────────────────────────
const CAMPAIGNS = [
  { id: "CMP-001", name: "Summer Tour Promo 2026" },
  { id: "CMP-002", name: "Early Bird Japan" },
  { id: "CMP-003", name: "Incentive Corporate Campaign" },
];

// ─── Platform config ──────────────────────────────────────────────────────────
interface PlatformConfig {
  color: string;       // tailwind bg pill (unselected dot)
  selectedBg: string;  // bg when pill selected
  selectedText: string;
  textColor: string;
  dotBg: string;       // calendar dot bg (hex/tw)
}
const PLATFORM: Record<ContentChannel, PlatformConfig> = {
  Facebook:  { color:"bg-[#1877F2]", selectedBg:"bg-[#1877F2]", selectedText:"text-white", textColor:"text-[#1877F2]", dotBg:"bg-[#1877F2]" },
  Instagram: { color:"bg-[#E1306C]", selectedBg:"bg-[#E1306C]", selectedText:"text-white", textColor:"text-[#E1306C]", dotBg:"bg-[#E1306C]" },
  TikTok:    { color:"bg-[#010101]", selectedBg:"bg-[#010101]", selectedText:"text-white", textColor:"text-[#010101]", dotBg:"bg-[#010101]" },
  LINE:      { color:"bg-[#06C755]", selectedBg:"bg-[#06C755]", selectedText:"text-white", textColor:"text-[#06C755]", dotBg:"bg-[#06C755]" },
  YouTube:   { color:"bg-[#FF0000]", selectedBg:"bg-[#FF0000]", selectedText:"text-white", textColor:"text-[#FF0000]", dotBg:"bg-[#FF0000]" },
  Lemon8:    { color:"bg-[#FFD600]", selectedBg:"bg-[#FFD600]", selectedText:"text-black", textColor:"text-[#b59600]", dotBg:"bg-[#FFD600]" },
  X:         { color:"bg-[#14171A]", selectedBg:"bg-[#14171A]", selectedText:"text-white", textColor:"text-[#14171A]", dotBg:"bg-[#14171A]" },
  LinkedIn:  { color:"bg-[#0A66C2]", selectedBg:"bg-[#0A66C2]", selectedText:"text-white", textColor:"text-[#0A66C2]", dotBg:"bg-[#0A66C2]" },
};

// ─── Platform SVG logos (inline, brand-accurate) ──────────────────────────────
function PlatformLogo({ ch, size = 20 }: { ch: ContentChannel; size?: number }) {
  const s = size;
  if (ch === "Facebook") return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
  );
  if (ch === "Instagram") return (
    <svg width={s} height={s} viewBox="0 0 24 24"><defs><radialGradient id="ig" cx="30%" cy="107%" r="150%"><stop offset="0%" stopColor="#fdf497"/><stop offset="5%" stopColor="#fdf497"/><stop offset="45%" stopColor="#fd5949"/><stop offset="60%" stopColor="#d6249f"/><stop offset="90%" stopColor="#285AEB"/></radialGradient></defs><rect width="24" height="24" rx="6" fill="url(#ig)"/><rect x="2" y="2" width="20" height="20" rx="5" fill="none" stroke="white" strokeWidth="1.8"/><circle cx="12" cy="12" r="4.5" fill="none" stroke="white" strokeWidth="1.8"/><circle cx="17.5" cy="6.5" r="1.2" fill="white"/></svg>
  );
  if (ch === "TikTok") return (
    <svg width={s} height={s} viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#010101"/><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.19 8.19 0 004.79 1.53V6.77a4.85 4.85 0 01-1.02-.08z" fill="white"/></svg>
  );
  if (ch === "LINE") return (
    <svg width={s} height={s} viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#06C755"/><path d="M12 3C7.03 3 3 6.48 3 10.75c0 3.8 3.37 6.98 7.93 7.56.31.07.73.2.84.47.1.24.06.61.03.85l-.14.82c-.04.25-.2.99.87.54 1.07-.45 5.75-3.38 7.85-5.79C21.62 13.44 22 12.14 22 10.75 22 6.48 17.97 3 12 3zm-3.5 9.5h-2a.5.5 0 010-1h1.5V9a.5.5 0 011 0v3a.5.5 0 01-.5.5zm2 0a.5.5 0 01-1 0V9a.5.5 0 011 0v3.5zm4 0h-2a.5.5 0 01-.5-.5V9a.5.5 0 011 0v2.5h1.5a.5.5 0 010 1zm4-3h-1.5v.5h1.5a.5.5 0 010 1h-1.5v.5h1.5a.5.5 0 010 1h-2a.5.5 0 01-.5-.5V9a.5.5 0 01.5-.5h2a.5.5 0 010 1z" fill="white"/></svg>
  );
  if (ch === "YouTube") return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="#FF0000"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
  );
  if (ch === "Lemon8") return (
    <svg width={s} height={s} viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#FFD600"/><text x="12" y="17" textAnchor="middle" fontSize="13" fontWeight="bold" fontFamily="Arial" fill="#333">L8</text></svg>
  );
  if (ch === "X") return (
    <svg width={s} height={s} viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#14171A"/><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="white"/></svg>
  );
  // LinkedIn
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="#0A66C2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
  );
}

// ─── Content Type config ──────────────────────────────────────────────────────
function ContentTypeIcon({ type, size = 14 }: { type: ContentType; size?: number }) {
  if (type === "Single Photo") return <Image style={{width:size,height:size}} />;
  if (type === "Photo Album")  return <Images style={{width:size,height:size}} />;
  if (type === "Short VDO")    return <Video style={{width:size,height:size}} />;
  return <Clapperboard style={{width:size,height:size}} />;
}

const CONTENT_TYPE_COLOR: Record<ContentType, string> = {
  "Single Photo": "bg-blue-100 text-blue-700",
  "Photo Album":  "bg-purple-100 text-purple-700",
  "Short VDO":    "bg-pink-100 text-pink-700",
  "Long VDO":     "bg-orange-100 text-orange-700",
};

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<ContentStatus, string> = {
  Draft:     "text-slate-600 bg-slate-100 dark:text-slate-300 dark:bg-slate-800",
  Scheduled: "text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/40",
  Published: "text-purple-700 bg-purple-100 dark:text-purple-300 dark:bg-purple-900/40",
  Done:      "text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/40",
};
const STATUS_NEXT: Record<ContentStatus, ContentStatus | null> = {
  Draft: "Scheduled", Scheduled: "Published", Published: "Done", Done: null,
};

// ─── Calendar helpers ─────────────────────────────────────────────────────────
const DAYS_TH   = ["อา","จ","อ","พ","พฤ","ศ","ส"];
const MONTHS_TH = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
const MONTHS_FULL = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];

// ─── Empty form ───────────────────────────────────────────────────────────────
const emptyForm = (): Omit<ContentPost, "post_id" | "created_at"> => ({
  title:          "",
  caption:        "",
  channels:       [],
  content_type:   "Single Photo",
  scheduled_date: new Date().toISOString().slice(0, 10),
  status:         "Draft",
  campaign_id:    undefined,
});

// ─── Main component ───────────────────────────────────────────────────────────
export default function ContentCalendar() {
  const { contentPosts, addContentPost, updateContentPost, deleteContentPost } = useCRM();

  const [view, setView]             = useState<"calendar" | "list">("calendar");
  const [calYear, setCalYear]       = useState(new Date().getFullYear());
  const [calMonth, setCalMonth]     = useState(new Date().getMonth());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId]         = useState<string | null>(null);
  const [form, setForm]             = useState(emptyForm());
  const [filterStatus, setFilterStatus]   = useState<ContentStatus | "All">("All");
  const [filterChannel, setFilterChannel] = useState<ContentChannel | "All">("All");
  const [selectedDay, setSelectedDay]     = useState<string | null>(null);

  // ── Calendar grid ──────────────────────────────────────────────────────────
  const calDays = useMemo(() => {
    const firstDay    = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [calYear, calMonth]);

  const postsByDate = useMemo(() => {
    const map: Record<string, ContentPost[]> = {};
    contentPosts.forEach((p) => {
      if (!map[p.scheduled_date]) map[p.scheduled_date] = [];
      map[p.scheduled_date].push(p);
    });
    return map;
  }, [contentPosts]);

  const listPosts = useMemo(() => {
    return contentPosts
      .filter((p) => filterStatus === "All" || p.status === filterStatus)
      .filter((p) => filterChannel === "All" || (p.channels ?? []).includes(filterChannel))
      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
  }, [contentPosts, filterStatus, filterChannel]);

  const dayPosts = selectedDay ? (postsByDate[selectedDay] ?? []) : [];

  const counts = useMemo(() => {
    const c: Record<ContentStatus, number> = { Draft: 0, Scheduled: 0, Published: 0, Done: 0 };
    contentPosts.forEach((p) => { c[p.status]++; });
    return c;
  }, [contentPosts]);

  // ── Toggle platform in form ────────────────────────────────────────────────
  function toggleChannel(ch: ContentChannel) {
    const cur = form.channels ?? [];
    if (cur.includes(ch)) setForm({ ...form, channels: cur.filter((c) => c !== ch) });
    else setForm({ ...form, channels: [...cur, ch] });
  }

  // ── Handlers ───────────────────────────────────────────────────────────────
  function openNew(date?: string) {
    setEditId(null);
    setForm({ ...emptyForm(), scheduled_date: date ?? new Date().toISOString().slice(0, 10) });
    setDialogOpen(true);
  }
  function openEdit(p: ContentPost) {
    setEditId(p.post_id);
    setForm({
      title: p.title, caption: p.caption,
      channels: p.channels ?? [],
      content_type: p.content_type ?? "Single Photo",
      scheduled_date: p.scheduled_date, status: p.status,
      campaign_id: p.campaign_id,
    });
    setDialogOpen(true);
  }
  function savePost() {
    if (!form.title.trim()) return;
    if (editId) updateContentPost(editId, form);
    else addContentPost(form);
    setDialogOpen(false);
  }
  function advanceStatus(p: ContentPost) {
    const next = STATUS_NEXT[p.status];
    if (next) updateContentPost(p.post_id, { status: next });
  }
  function prevMonth() {
    if (calMonth === 0) { setCalYear((y) => y - 1); setCalMonth(11); }
    else setCalMonth((m) => m - 1);
    setSelectedDay(null);
  }
  function nextMonth() {
    if (calMonth === 11) { setCalYear((y) => y + 1); setCalMonth(0); }
    else setCalMonth((m) => m + 1);
    setSelectedDay(null);
  }

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="p-4 sm:p-6 space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-glow">
            <CalendarDays className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Content Calendar</h1>
            <p className="text-sm text-muted-foreground">วางแผนโพสต์ Social Media ทุกช่องทาง</p>
          </div>
        </div>
        <Button onClick={() => openNew()} className="bg-gradient-to-br from-purple-600 to-indigo-600 text-white">
          <Plus className="w-4 h-4 mr-1" /> เพิ่ม Content
        </Button>
      </div>

      {/* ── Status summary strip ── */}
      <div className="grid grid-cols-4 gap-3">
        {CONTENT_STATUSES.map((s) => (
          <div key={s} className="bg-card border rounded-xl p-3 text-center shadow-soft">
            <p className="text-2xl font-extrabold">{counts[s]}</p>
            <p className={`text-[11px] font-semibold mt-0.5 rounded px-1.5 py-0.5 inline-block ${STATUS_COLOR[s]}`}>{s}</p>
          </div>
        ))}
      </div>

      {/* ── View toggle ── */}
      <div className="flex gap-2">
        {(["calendar","list"] as const).map((v) => (
          <button key={v} onClick={() => setView(v)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === v ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}>
            {v === "calendar" ? <><CalendarDays className="w-4 h-4"/>Calendar</> : <><List className="w-4 h-4"/>List</>}
          </button>
        ))}
      </div>

      {/* ════════════════════════════ CALENDAR VIEW ════════════════════════════ */}
      {view === "calendar" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-muted transition-all"><ChevronLeft className="w-4 h-4"/></button>
            <h2 className="font-bold text-lg">{MONTHS_FULL[calMonth]} {calYear}</h2>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-muted transition-all"><ChevronRight className="w-4 h-4"/></button>
          </div>

          <div className="bg-card border rounded-xl overflow-hidden shadow-soft">
            <div className="grid grid-cols-7 border-b">
              {DAYS_TH.map((d, i) => (
                <div key={d} className={`py-2 text-center text-xs font-semibold ${i===0?"text-red-500":i===6?"text-blue-500":"text-muted-foreground"}`}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {calDays.map((day, idx) => {
                if (!day) return <div key={`e-${idx}`} className="border-b border-r p-1 min-h-[80px] bg-muted/20"/>;
                const dateStr = `${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                const posts   = postsByDate[dateStr] ?? [];
                const isToday = dateStr === todayStr;
                const isSel   = dateStr === selectedDay;
                const dow     = new Date(calYear, calMonth, day).getDay();
                return (
                  <div key={day} onClick={() => setSelectedDay(isSel ? null : dateStr)}
                    className={`border-b border-r p-1 min-h-[80px] cursor-pointer transition-all ${isSel?"bg-primary/10 ring-1 ring-inset ring-primary":"hover:bg-muted/40"}`}>
                    <div className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-0.5 ${isToday?"bg-primary text-primary-foreground":dow===0?"text-red-500":dow===6?"text-blue-500":""}`}>
                      {day}
                    </div>
                    <div className="space-y-0.5">
                      {posts.slice(0,3).map((p) => {
                        const ch = (p.channels ?? [])[0];
                        const dotBg = ch ? PLATFORM[ch]?.dotBg : "bg-slate-400";
                        return (
                          <div key={p.post_id} className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate text-white ${dotBg ?? "bg-slate-400"}`}>
                            {p.title}
                          </div>
                        );
                      })}
                      {posts.length > 3 && <div className="text-[9px] text-muted-foreground pl-1">+{posts.length-3} อีก</div>}
                      {posts.length === 0 && (
                        <button onClick={(e)=>{e.stopPropagation();openNew(dateStr);}} className="w-full text-[10px] text-muted-foreground/50 hover:text-primary transition-all text-left pl-0.5 mt-1">+ เพิ่ม</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Day detail */}
          {selectedDay && (
            <div className="bg-card border rounded-xl shadow-soft p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">
                  {(() => { const d = new Date(selectedDay+"T00:00:00"); return `${d.getDate()} ${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`; })()}
                  <span className="text-xs text-muted-foreground ml-2">({dayPosts.length} รายการ)</span>
                </h3>
                <button onClick={() => openNew(selectedDay)} className="flex items-center gap-1 text-xs text-primary hover:underline"><Plus className="w-3.5 h-3.5"/>เพิ่ม</button>
              </div>
              {dayPosts.length === 0
                ? <p className="text-sm text-muted-foreground">ยังไม่มี Content วันนี้</p>
                : <div className="space-y-2">{dayPosts.map((p) => <PostRow key={p.post_id} post={p} onEdit={()=>openEdit(p)} onDelete={()=>deleteContentPost(p.post_id)} onAdvance={()=>advanceStatus(p)}/>)}</div>
              }
            </div>
          )}

          {/* Platform legend */}
          <div className="flex gap-3 flex-wrap">
            {CONTENT_CHANNELS.map((ch) => (
              <div key={ch} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={`w-3 h-3 rounded-sm ${PLATFORM[ch].dotBg}`}/>
                {ch}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════════════════════════════ LIST VIEW ════════════════════════════ */}
      {view === "list" && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap items-center">
            <Filter className="w-4 h-4 text-muted-foreground"/>
            <select value={filterStatus} onChange={(e)=>setFilterStatus(e.target.value as ContentStatus|"All")} className="text-sm border rounded-lg px-2 py-1.5 bg-background">
              <option value="All">ทุกสถานะ</option>
              {CONTENT_STATUSES.map((s)=><option key={s}>{s}</option>)}
            </select>
            <select value={filterChannel} onChange={(e)=>setFilterChannel(e.target.value as ContentChannel|"All")} className="text-sm border rounded-lg px-2 py-1.5 bg-background">
              <option value="All">ทุกช่องทาง</option>
              {CONTENT_CHANNELS.map((c)=><option key={c}>{c}</option>)}
            </select>
            <span className="ml-auto text-xs text-muted-foreground">{listPosts.length} รายการ</span>
          </div>
          {listPosts.length === 0
            ? <div className="bg-card border rounded-xl p-10 text-center"><CalendarDays className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3"/><p className="text-muted-foreground text-sm">ยังไม่มี Content</p></div>
            : <div className="bg-card border rounded-xl shadow-soft overflow-hidden divide-y">{listPosts.map((p)=><PostRow key={p.post_id} post={p} onEdit={()=>openEdit(p)} onDelete={()=>deleteContentPost(p.post_id)} onAdvance={()=>advanceStatus(p)} showDate/>)}</div>
          }
        </div>
      )}

      {/* ════════════════════════════ DIALOG ════════════════════════════ */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="bg-background border rounded-2xl shadow-2xl w-full max-w-lg my-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-lg">{editId ? "แก้ไข Content" : "เพิ่ม Content ใหม่"}</h3>
              <button onClick={() => setDialogOpen(false)} className="p-1.5 rounded-lg hover:bg-muted"><CloseIcon className="w-4 h-4"/></button>
            </div>

            <div className="p-5 space-y-4">

              {/* ── Title ── */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">หัวข้อ *</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                  placeholder="เช่น: โปรโมชั่น Summer Tour วันสุดท้าย!"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>

              {/* ── Caption ── */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Caption / เนื้อหา</label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background resize-none"
                  rows={3}
                  placeholder="เขียน caption ที่จะใช้โพสต์..."
                  value={form.caption}
                  onChange={(e) => setForm({ ...form, caption: e.target.value })}
                />
              </div>

              {/* ── Content Type ── */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-2 block">ประเภท Content</label>
                <div className="grid grid-cols-4 gap-2">
                  {CONTENT_TYPES.map((t) => {
                    const sel = form.content_type === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setForm({ ...form, content_type: t })}
                        className={`flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl border-2 transition-all text-center ${sel ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20" : "border-border hover:border-purple-300 hover:bg-muted/40"}`}
                      >
                        <ContentTypeIcon type={t} size={18}/>
                        <span className={`text-[10px] font-semibold leading-tight ${sel?"text-purple-700":"text-muted-foreground"}`}>{t}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Platform multi-select ── */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-2 block">
                  ช่องทาง
                  <span className="ml-1 text-[10px] text-muted-foreground/70">({form.channels.length > 0 ? `เลือก ${form.channels.length} ช่องทาง` : "เลือกได้หลาย Platform"})</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {CONTENT_CHANNELS.map((ch) => {
                    const sel = (form.channels ?? []).includes(ch);
                    const cfg = PLATFORM[ch];
                    return (
                      <button
                        key={ch}
                        type="button"
                        onClick={() => toggleChannel(ch)}
                        className={`flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl border-2 transition-all ${sel ? `border-transparent ${cfg.selectedBg} ${cfg.selectedText}` : "border-border hover:border-slate-300 bg-background hover:bg-muted/40"}`}
                      >
                        <PlatformLogo ch={ch} size={22}/>
                        <span className={`text-[10px] font-semibold leading-tight ${sel ? cfg.selectedText : "text-muted-foreground"}`}>{ch}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Date + Status row ── */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">วันที่โพสต์</label>
                  <ThaiDateInput className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                    value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}/>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">สถานะ</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                    value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ContentStatus })}>
                    {CONTENT_STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* ── Campaign ── */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Campaign (ถ้ามี)</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                  value={form.campaign_id ?? ""} onChange={(e) => setForm({ ...form, campaign_id: e.target.value || undefined })}>
                  <option value="">— ไม่ระบุ —</option>
                  {CAMPAIGNS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-2 p-5 border-t justify-end">
              <button onClick={() => setDialogOpen(false)} className="px-4 py-2 rounded-lg text-sm bg-muted hover:bg-accent transition-all">ยกเลิก</button>
              <button onClick={savePost} disabled={!form.title.trim()}
                className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all disabled:opacity-40">
                {editId ? "บันทึก" : "เพิ่ม Content"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PostRow sub-component ────────────────────────────────────────────────────
function PostRow({
  post, onEdit, onDelete, onAdvance, showDate,
}: {
  post: ContentPost;
  onEdit: () => void;
  onDelete: () => void;
  onAdvance: () => void;
  showDate?: boolean;
}) {
  const nextStatus = STATUS_NEXT[post.status];
  const camp = CAMPAIGNS.find((c) => c.id === post.campaign_id);
  const d = new Date(post.scheduled_date + "T00:00:00");
  const dateLabel = `${d.getDate()} ${MONTHS_TH[d.getMonth()]}`;
  const channels = post.channels ?? [];

  return (
    <div className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-all">
      {/* Platform dots */}
      <div className="flex flex-col gap-0.5 mt-1.5 shrink-0">
        {channels.slice(0,3).map((ch) => (
          <div key={ch} title={ch} className="w-2 h-2 rounded-full shrink-0">
            <PlatformLogo ch={ch} size={10}/>
          </div>
        ))}
        {channels.length === 0 && <div className="w-2 h-2 rounded-full bg-slate-300"/>}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {showDate && <span className="text-xs text-muted-foreground w-12 shrink-0">{dateLabel}</span>}
          <p className="font-semibold text-sm truncate">{post.title}</p>
        </div>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {/* Content type */}
          <span className={`flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${CONTENT_TYPE_COLOR[post.content_type ?? "Single Photo"]}`}>
            <ContentTypeIcon type={post.content_type ?? "Single Photo"} size={10}/>
            {post.content_type ?? "—"}
          </span>
          {/* Platform logos row */}
          <div className="flex items-center gap-0.5">
            {channels.map((ch) => (
              <span key={ch} title={ch} className="inline-flex">
                <PlatformLogo ch={ch} size={14}/>
              </span>
            ))}
          </div>
          {/* Status */}
          <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${STATUS_COLOR[post.status]}`}>{post.status}</span>
          {camp && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Megaphone className="w-3 h-3"/> {camp.name}
            </span>
          )}
        </div>
        {post.caption && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{post.caption}</p>}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {nextStatus && (
          <button onClick={onAdvance} title={`→ ${nextStatus}`}
            className="px-2 py-1 rounded text-[11px] font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-all">
            → {nextStatus}
          </button>
        )}
        <button onClick={onEdit} className="p-1.5 rounded hover:bg-muted transition-all text-muted-foreground hover:text-foreground"><Pencil className="w-3.5 h-3.5"/></button>
        <button onClick={onDelete} className="p-1.5 rounded hover:bg-red-50 transition-all text-muted-foreground hover:text-red-500"><Trash2 className="w-3.5 h-3.5"/></button>
      </div>
    </div>
  );
}
