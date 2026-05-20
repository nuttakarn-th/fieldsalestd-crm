/**
 * ContentCalendar.tsx
 * วางแผน Content Social Media — Calendar View + List View
 * Channel: Facebook / Instagram / LINE
 * Status: Draft → Scheduled → Published → Done
 */
import { useState, useMemo } from "react";
import {
  CalendarDays, List, Plus, Pencil, Trash2, Facebook,
  Instagram, MessageCircle, ChevronLeft, ChevronRight,
  Megaphone, X, Check, Filter,
} from "lucide-react";
import { useCRM, CONTENT_CHANNELS, CONTENT_STATUSES } from "@/store/crmStore";
import type { ContentPost, ContentChannel, ContentStatus } from "@/store/crmStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ─── Static campaigns (sync with CampaignManagement) ─────────────────────────
const CAMPAIGNS = [
  { id: "CMP-001", name: "Summer Tour Promo 2026" },
  { id: "CMP-002", name: "Early Bird Japan" },
  { id: "CMP-003", name: "Incentive Corporate Campaign" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const CHANNEL_COLOR: Record<ContentChannel, string> = {
  Facebook:  "bg-blue-500",
  Instagram: "bg-pink-500",
  LINE:      "bg-green-500",
};
const CHANNEL_TEXT: Record<ContentChannel, string> = {
  Facebook:  "text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/40",
  Instagram: "text-pink-700 bg-pink-100 dark:text-pink-300 dark:bg-pink-900/40",
  LINE:      "text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/40",
};
const STATUS_COLOR: Record<ContentStatus, string> = {
  Draft:     "text-slate-600 bg-slate-100 dark:text-slate-300 dark:bg-slate-800",
  Scheduled: "text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/40",
  Published: "text-purple-700 bg-purple-100 dark:text-purple-300 dark:bg-purple-900/40",
  Done:      "text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/40",
};
const STATUS_NEXT: Record<ContentStatus, ContentStatus | null> = {
  Draft: "Scheduled", Scheduled: "Published", Published: "Done", Done: null,
};

function ChannelIcon({ channel }: { channel: ContentChannel }) {
  if (channel === "Facebook")  return <Facebook  className="w-3.5 h-3.5" />;
  if (channel === "Instagram") return <Instagram className="w-3.5 h-3.5" />;
  return <MessageCircle className="w-3.5 h-3.5" />;
}

const DAYS_TH = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const MONTHS_TH = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
const MONTHS_FULL = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];

// ─── Empty form ───────────────────────────────────────────────────────────────
const emptyForm = (): Omit<ContentPost, "post_id" | "created_at"> => ({
  title:          "",
  caption:        "",
  channel:        "Facebook",
  scheduled_date: new Date().toISOString().slice(0, 10),
  status:         "Draft",
  campaign_id:    undefined,
});

// ─── Main component ───────────────────────────────────────────────────────────
export default function ContentCalendar() {
  const { contentPosts, addContentPost, updateContentPost, deleteContentPost } = useCRM();

  const [view, setView]           = useState<"calendar" | "list">("calendar");
  const [calYear, setCalYear]     = useState(new Date().getFullYear());
  const [calMonth, setCalMonth]   = useState(new Date().getMonth()); // 0-based
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId]       = useState<string | null>(null);
  const [form, setForm]           = useState(emptyForm());
  const [filterStatus, setFilterStatus] = useState<ContentStatus | "All">("All");
  const [filterChannel, setFilterChannel] = useState<ContentChannel | "All">("All");
  const [selectedDay, setSelectedDay] = useState<string | null>(null); // YYYY-MM-DD

  // ── Calendar grid ──────────────────────────────────────────────────────────
  const calDays = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [calYear, calMonth]);

  // ── Posts indexed by date for calendar ────────────────────────────────────
  const postsByDate = useMemo(() => {
    const map: Record<string, ContentPost[]> = {};
    contentPosts.forEach((p) => {
      if (!map[p.scheduled_date]) map[p.scheduled_date] = [];
      map[p.scheduled_date].push(p);
    });
    return map;
  }, [contentPosts]);

  // ── Filtered list ──────────────────────────────────────────────────────────
  const listPosts = useMemo(() => {
    return contentPosts
      .filter((p) => filterStatus  === "All" || p.status  === filterStatus)
      .filter((p) => filterChannel === "All" || p.channel === filterChannel)
      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
  }, [contentPosts, filterStatus, filterChannel]);

  // ── Day detail posts ───────────────────────────────────────────────────────
  const dayPosts = selectedDay ? (postsByDate[selectedDay] ?? []) : [];

  // ── Handlers ───────────────────────────────────────────────────────────────
  function openNew(date?: string) {
    setEditId(null);
    setForm({ ...emptyForm(), scheduled_date: date ?? new Date().toISOString().slice(0, 10) });
    setDialogOpen(true);
  }
  function openEdit(p: ContentPost) {
    setEditId(p.post_id);
    setForm({ title: p.title, caption: p.caption, channel: p.channel, scheduled_date: p.scheduled_date, status: p.status, campaign_id: p.campaign_id });
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
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
    setSelectedDay(null);
  }
  function nextMonth() {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
    setSelectedDay(null);
  }

  const todayStr = new Date().toISOString().slice(0, 10);

  // ── Summary counts ─────────────────────────────────────────────────────────
  const counts = useMemo(() => {
    const c: Record<ContentStatus, number> = { Draft: 0, Scheduled: 0, Published: 0, Done: 0 };
    contentPosts.forEach((p) => { c[p.status]++ });
    return c;
  }, [contentPosts]);

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
        <button
          onClick={() => setView("calendar")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === "calendar" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
        >
          <CalendarDays className="w-4 h-4" /> Calendar
        </button>
        <button
          onClick={() => setView("list")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === "list" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
        >
          <List className="w-4 h-4" /> List
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* CALENDAR VIEW */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {view === "calendar" && (
        <div className="space-y-3">
          {/* Month nav */}
          <div className="flex items-center justify-between">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-muted transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="font-bold text-lg">{MONTHS_FULL[calMonth]} {calYear}</h2>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-muted transition-all">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Grid */}
          <div className="bg-card border rounded-xl overflow-hidden shadow-soft">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b">
              {DAYS_TH.map((d, i) => (
                <div key={d} className={`py-2 text-center text-xs font-semibold ${i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-muted-foreground"}`}>{d}</div>
              ))}
            </div>
            {/* Cells */}
            <div className="grid grid-cols-7">
              {calDays.map((day, idx) => {
                if (!day) return <div key={`empty-${idx}`} className="border-b border-r p-1 min-h-[80px] bg-muted/20" />;
                const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const posts   = postsByDate[dateStr] ?? [];
                const isToday = dateStr === todayStr;
                const isSel   = dateStr === selectedDay;
                const dow     = (new Date(calYear, calMonth, day)).getDay();
                return (
                  <div
                    key={day}
                    onClick={() => setSelectedDay(isSel ? null : dateStr)}
                    className={`border-b border-r p-1 min-h-[80px] cursor-pointer transition-all ${isSel ? "bg-primary/10 ring-1 ring-inset ring-primary" : "hover:bg-muted/40"}`}
                  >
                    <div className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-0.5 ${isToday ? "bg-primary text-primary-foreground" : dow === 0 ? "text-red-500" : dow === 6 ? "text-blue-500" : ""}`}>
                      {day}
                    </div>
                    <div className="space-y-0.5">
                      {posts.slice(0, 3).map((p) => (
                        <div key={p.post_id} className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate text-white ${CHANNEL_COLOR[p.channel]}`}>
                          {p.title}
                        </div>
                      ))}
                      {posts.length > 3 && (
                        <div className="text-[9px] text-muted-foreground pl-1">+{posts.length - 3} อีก</div>
                      )}
                      {posts.length === 0 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); openNew(dateStr); }}
                          className="w-full text-[10px] text-muted-foreground/50 hover:text-primary transition-all text-left pl-0.5 mt-1"
                        >+ เพิ่ม</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Day detail panel */}
          {selectedDay && (
            <div className="bg-card border rounded-xl shadow-soft p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">
                  {(() => { const d = new Date(selectedDay + "T00:00:00"); return `${d.getDate()} ${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`; })()}
                  <span className="text-xs text-muted-foreground ml-2">({dayPosts.length} รายการ)</span>
                </h3>
                <button onClick={() => openNew(selectedDay)} className="flex items-center gap-1 text-xs text-primary hover:underline">
                  <Plus className="w-3.5 h-3.5" /> เพิ่ม
                </button>
              </div>
              {dayPosts.length === 0 ? (
                <p className="text-sm text-muted-foreground">ยังไม่มี Content วันนี้</p>
              ) : (
                <div className="space-y-2">
                  {dayPosts.map((p) => (
                    <PostRow key={p.post_id} post={p} onEdit={() => openEdit(p)} onDelete={() => deleteContentPost(p.post_id)} onAdvance={() => advanceStatus(p)} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Channel legend */}
          <div className="flex gap-3 flex-wrap">
            {CONTENT_CHANNELS.map((ch) => (
              <div key={ch} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={`w-3 h-3 rounded-sm ${CHANNEL_COLOR[ch]}`} />
                {ch}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* LIST VIEW */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {view === "list" && (
        <div className="space-y-3">
          {/* Filters */}
          <div className="flex gap-2 flex-wrap items-center">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as ContentStatus | "All")}
              className="text-sm border rounded-lg px-2 py-1.5 bg-background"
            >
              <option value="All">ทุกสถานะ</option>
              {CONTENT_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
            <select
              value={filterChannel}
              onChange={(e) => setFilterChannel(e.target.value as ContentChannel | "All")}
              className="text-sm border rounded-lg px-2 py-1.5 bg-background"
            >
              <option value="All">ทุกช่องทาง</option>
              {CONTENT_CHANNELS.map((c) => <option key={c}>{c}</option>)}
            </select>
            <span className="ml-auto text-xs text-muted-foreground">{listPosts.length} รายการ</span>
          </div>

          {listPosts.length === 0 ? (
            <div className="bg-card border rounded-xl p-10 text-center">
              <CalendarDays className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground text-sm">ยังไม่มี Content — กด "เพิ่ม Content" เพื่อเริ่มวางแผน</p>
            </div>
          ) : (
            <div className="bg-card border rounded-xl shadow-soft overflow-hidden divide-y">
              {listPosts.map((p) => (
                <PostRow key={p.post_id} post={p} onEdit={() => openEdit(p)} onDelete={() => deleteContentPost(p.post_id)} onAdvance={() => advanceStatus(p)} showDate />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* ADD / EDIT DIALOG */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-background border rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-lg">{editId ? "แก้ไข Content" : "เพิ่ม Content ใหม่"}</h3>
              <button onClick={() => setDialogOpen(false)} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-5 space-y-4">
              {/* Title */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">หัวข้อ *</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                  placeholder="เช่น: โปรโมชั่น Summer Tour วันสุดท้าย!"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>

              {/* Caption */}
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

              {/* Channel + Date row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">ช่องทาง</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                    value={form.channel}
                    onChange={(e) => setForm({ ...form, channel: e.target.value as ContentChannel })}
                  >
                    {CONTENT_CHANNELS.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">วันที่โพสต์</label>
                  <input
                    type="date"
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                    value={form.scheduled_date}
                    onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
                  />
                </div>
              </div>

              {/* Status + Campaign row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">สถานะ</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as ContentStatus })}
                  >
                    {CONTENT_STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Campaign (ถ้ามี)</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                    value={form.campaign_id ?? ""}
                    onChange={(e) => setForm({ ...form, campaign_id: e.target.value || undefined })}
                  >
                    <option value="">— ไม่ระบุ —</option>
                    {CAMPAIGNS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-2 p-5 border-t justify-end">
              <button onClick={() => setDialogOpen(false)} className="px-4 py-2 rounded-lg text-sm bg-muted hover:bg-accent transition-all">ยกเลิก</button>
              <button
                onClick={savePost}
                disabled={!form.title.trim()}
                className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all disabled:opacity-40"
              >
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

  return (
    <div className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-all">
      {/* Channel dot */}
      <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${CHANNEL_COLOR[post.channel]}`} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {showDate && <span className="text-xs text-muted-foreground w-12 shrink-0">{dateLabel}</span>}
          <p className="font-semibold text-sm truncate">{post.title}</p>
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className={`flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded ${CHANNEL_TEXT[post.channel]}`}>
            <ChannelIcon channel={post.channel} />
            {post.channel}
          </span>
          <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${STATUS_COLOR[post.status]}`}>
            {post.status}
          </span>
          {camp && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Megaphone className="w-3 h-3" /> {camp.name}
            </span>
          )}
        </div>
        {post.caption && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{post.caption}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {nextStatus && (
          <button
            onClick={onAdvance}
            title={`→ ${nextStatus}`}
            className="px-2 py-1 rounded text-[11px] font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-all"
          >
            → {nextStatus}
          </button>
        )}
        <button onClick={onEdit} className="p-1.5 rounded hover:bg-muted transition-all text-muted-foreground hover:text-foreground">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button onClick={onDelete} className="p-1.5 rounded hover:bg-red-50 transition-all text-muted-foreground hover:text-red-500">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
