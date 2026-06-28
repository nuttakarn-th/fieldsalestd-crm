/**
 * PostPerformanceTracker.tsx
 * บันทึก Reach / Engagement / Lead ต่อ Post
 * รู้ว่า Content ไหนสร้าง Lead ได้จริง
 */
import { useState, useMemo } from "react";
import { BarChart3, TrendingUp, Users, Heart, MessageSquare, Share2, Target, Pencil, Check, Facebook, Instagram, MessageCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useCRM } from "@/store/crmStore";
import type { ContentPost, ContentChannel } from "@/store/crmStore";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const CH_COLOR: Record<ContentChannel, string> = {
  Facebook:  "text-blue-600 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/40",
  Instagram: "text-pink-600 bg-pink-100 dark:text-pink-300 dark:bg-pink-900/40",
  TikTok:    "text-slate-900 bg-slate-100 dark:text-slate-200 dark:bg-slate-800",
  LINE:      "text-green-600 bg-green-100 dark:text-green-300 dark:bg-green-900/40",
  YouTube:   "text-red-600 bg-red-100 dark:text-red-300 dark:bg-red-900/40",
  Lemon8:    "text-yellow-700 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-900/40",
  X:         "text-slate-900 bg-slate-100 dark:text-slate-200 dark:bg-slate-800",
  LinkedIn:  "text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/40",
};
function ChannelIcon({ ch }: { ch: ContentChannel }) {
  if (ch === "Facebook")  return <Facebook  className="w-3 h-3" />;
  if (ch === "Instagram") return <Instagram className="w-3 h-3" />;
  return <MessageCircle className="w-3 h-3" />;
}
function engRate(post: ContentPost): string {
  if (!post.reach || post.reach === 0) return "—";
  const eng = (post.likes ?? 0) + (post.comments ?? 0) + (post.shares ?? 0);
  return ((eng / post.reach) * 100).toFixed(1) + "%";
}

// ─── Inline editable number field ─────────────────────────────────────────────
function NumField({ value, onChange, icon: Icon, placeholder }: {
  value?: number; onChange: (v: number | undefined) => void;
  icon: typeof Heart; placeholder: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState("");
  if (editing) return (
    <input
      autoFocus
      type="number"
      min={0}
      className="w-20 border rounded px-1.5 py-0.5 text-xs bg-background text-center"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const n = parseInt(draft, 10);
        onChange(isNaN(n) ? undefined : n);
        setEditing(false);
      }}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
    />
  );
  return (
    <button
      onClick={() => { setDraft(value !== undefined ? String(value) : ""); setEditing(true); }}
      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground group"
    >
      <Icon className="w-3 h-3" />
      <span className={value !== undefined ? "font-semibold text-foreground" : "text-muted-foreground/60"}>
        {value !== undefined ? value.toLocaleString() : placeholder}
      </span>
      <Pencil className="w-2.5 h-2.5 opacity-0 group-hover:opacity-60 transition-opacity" />
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function PostPerformanceTracker() {
  const { contentPosts, updateContentPost } = useCRM();
  const [sortBy, setSortBy] = useState<"date" | "reach" | "leads">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filterCh, setFilterCh] = useState<ContentChannel | "All">("All");

  // ── Summary totals ─────────────────────────────────────────────────────────
  const totals = useMemo(() => ({
    posts:    contentPosts.length,
    reach:    contentPosts.reduce((s, p) => s + (p.reach ?? 0), 0),
    leads:    contentPosts.reduce((s, p) => s + (p.leads_generated ?? 0), 0),
    engagement: contentPosts.reduce((s, p) => s + (p.likes ?? 0) + (p.comments ?? 0) + (p.shares ?? 0), 0),
  }), [contentPosts]);

  // ── Top performer ──────────────────────────────────────────────────────────
  const topByLeads = useMemo(() =>
    [...contentPosts].sort((a, b) => (b.leads_generated ?? 0) - (a.leads_generated ?? 0))[0],
    [contentPosts]
  );
  const topByReach = useMemo(() =>
    [...contentPosts].sort((a, b) => (b.reach ?? 0) - (a.reach ?? 0))[0],
    [contentPosts]
  );

  // ── Sorted + filtered list ─────────────────────────────────────────────────
  const sorted = useMemo(() => {
    let list = contentPosts.filter((p) => filterCh === "All" || (p.channels ?? []).includes(filterCh));
    list = [...list].sort((a, b) => {
      let va = 0, vb = 0;
      if (sortBy === "date")  { va = a.scheduled_date.localeCompare(b.scheduled_date); return sortDir === "asc" ? va : -va; }
      if (sortBy === "reach") { va = a.reach ?? 0; vb = b.reach ?? 0; }
      if (sortBy === "leads") { va = a.leads_generated ?? 0; vb = b.leads_generated ?? 0; }
      return sortDir === "asc" ? va - vb : vb - va;
    });
    return list;
  }, [contentPosts, sortBy, sortDir, filterCh]);

  function toggleSort(col: "date" | "reach" | "leads") {
    if (sortBy === col) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
  }
  function SortIcon({ col }: { col: "date" | "reach" | "leads" }) {
    if (sortBy !== col) return <ChevronDown className="w-3 h-3 opacity-30" />;
    return sortDir === "desc" ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />;
  }

  const MONTHS_TH = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
  function fmtDate(s: string) {
    const d = new Date(s + "T00:00:00");
    return `${d.getDate()} ${MONTHS_TH[d.getMonth()]}`;
  }

  return (
    <div className="p-4 sm:p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-glow">
          <BarChart3 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Post Performance Tracker</h1>
          <p className="text-sm text-muted-foreground">บันทึก Reach / Engagement / Lead ต่อ Post — คลิกตัวเลขเพื่อแก้ไข</p>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Posts ทั้งหมด"   value={totals.posts.toString()}        icon={BarChart3}    accent="text-purple-600" bg="bg-purple-50 dark:bg-purple-950/20" />
        <SummaryCard label="Total Reach"      value={totals.reach.toLocaleString()}  icon={TrendingUp}   accent="text-blue-600"   bg="bg-blue-50 dark:bg-blue-950/20" />
        <SummaryCard label="Total Engagement" value={totals.engagement.toLocaleString()} icon={Heart}    accent="text-pink-600"   bg="bg-pink-50 dark:bg-pink-950/20" />
        <SummaryCard label="Leads จาก Content" value={totals.leads.toString()}        icon={Target}       accent="text-emerald-600" bg="bg-emerald-50 dark:bg-emerald-950/20" />
      </div>

      {/* Top performers */}
      {(topByLeads || topByReach) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {topByLeads && (topByLeads.leads_generated ?? 0) > 0 && (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1">🏆 สร้าง Lead สูงสุด</p>
              <p className="font-semibold text-sm truncate">{topByLeads.title}</p>
              <p className="text-xs text-muted-foreground">{topByLeads.leads_generated} leads · {(topByLeads.channels?.[0] ?? "Facebook")} · {fmtDate(topByLeads.scheduled_date)}</p>
            </div>
          )}
          {topByReach && (topByReach.reach ?? 0) > 0 && (
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
              <p className="text-xs font-bold text-blue-700 dark:text-blue-400 mb-1">📡 Reach สูงสุด</p>
              <p className="font-semibold text-sm truncate">{topByReach.title}</p>
              <p className="text-xs text-muted-foreground">{(topByReach.reach ?? 0).toLocaleString()} reach · {(topByReach.channels?.[0] ?? "Facebook")} · {fmtDate(topByReach.scheduled_date)}</p>
            </div>
          )}
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 flex-wrap items-center">
        <span className="text-xs text-muted-foreground font-medium">ช่องทาง:</span>
        {(["All", "Facebook", "Instagram", "LINE"] as const).map((ch) => (
          <button
            key={ch}
            onClick={() => setFilterCh(ch)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterCh === ch ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >{ch === "All" ? "ทั้งหมด" : ch}</button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">{sorted.length} Posts</span>
      </div>

      {/* Table */}
      {contentPosts.length === 0 ? (
        <div className="bg-card border rounded-xl p-10 text-center">
          <BarChart3 className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">ยังไม่มี Content Post — สร้างใน Content Calendar ก่อนครับ</p>
        </div>
      ) : (
        <div className="bg-card border rounded-xl shadow-soft overflow-hidden">
          {/* Table header */}
          <div className="bg-muted/40 border-b px-4 py-2 grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] gap-3 text-xs font-semibold text-muted-foreground items-center">
            <button onClick={() => toggleSort("date")} className="flex items-center gap-1 text-left">
              Post <SortIcon col="date" />
            </button>
            <span>ช่องทาง</span>
            <button onClick={() => toggleSort("reach")} className="flex items-center gap-1">
              Reach <SortIcon col="reach" />
            </button>
            <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> Likes</span>
            <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Comments</span>
            <span className="flex items-center gap-1"><Share2 className="w-3 h-3" /> Shares</span>
            <button onClick={() => toggleSort("leads")} className="flex items-center gap-1">
              <Target className="w-3 h-3 text-emerald-500" /> Leads <SortIcon col="leads" />
            </button>
          </div>

          {/* Rows */}
          <div className="divide-y">
            {sorted.map((p) => (
              <div key={p.post_id} className="px-4 py-3 grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] gap-3 items-center hover:bg-muted/20 transition-all">
                {/* Post info */}
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{p.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">{fmtDate(p.scheduled_date)}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      p.status === "Published" || p.status === "Done" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
                    }`}>{p.status}</span>
                    <span className="text-[10px] text-muted-foreground">{engRate(p)} ER</span>
                  </div>
                </div>
                {/* Channel */}
                <span className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${CH_COLOR[p.channels?.[0] ?? "Facebook"]}`}>
                  <ChannelIcon ch={p.channels?.[0] ?? "Facebook"} /> {p.channels?.join(" + ") ?? "Facebook"}
                </span>
                {/* Editable metrics */}
                <NumField value={p.reach}           onChange={(v) => updateContentPost(p.post_id, { reach: v })}           icon={TrendingUp}    placeholder="—" />
                <NumField value={p.likes}           onChange={(v) => updateContentPost(p.post_id, { likes: v })}           icon={Heart}         placeholder="—" />
                <NumField value={p.comments}        onChange={(v) => updateContentPost(p.post_id, { comments: v })}        icon={MessageSquare} placeholder="—" />
                <NumField value={p.shares}          onChange={(v) => updateContentPost(p.post_id, { shares: v })}          icon={Share2}        placeholder="—" />
                <NumField value={p.leads_generated} onChange={(v) => updateContentPost(p.post_id, { leads_generated: v })} icon={Target}        placeholder="—" />
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">คลิกที่ตัวเลข "—" เพื่อกรอกข้อมูล Reach / Engagement / Lead แต่ละ Post</p>
    </div>
  );
}

// ─── Summary card ─────────────────────────────────────────────────────────────
function SummaryCard({ label, value, icon: Icon, accent, bg }: {
  label: string; value: string; icon: typeof BarChart3; accent: string; bg: string;
}) {
  return (
    <div className={`${bg} border rounded-xl p-4`}>
      <Icon className={`w-4 h-4 ${accent} mb-2`} />
      <p className={`text-2xl font-extrabold ${accent}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}
