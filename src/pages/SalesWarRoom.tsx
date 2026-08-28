/**
 * SalesWarRoom.tsx
 * Real-time Sales Board — fullscreen presentation for event days.
 *
 * Route: /war-room  (standalone, no sidebar)
 * Data : activity_log (seat_booked events) + serviceStore (price lookup)
 * Live : Supabase Realtime subscription on activity_log INSERT
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { useServices } from "@/store/serviceStore";
import { supabase } from "@/lib/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

type Filter = "today" | "week" | "month";

interface BookingEvent {
  entity_id: string;
  entity_name: string;
  meta: { delta?: number; period_id?: string } | null;
  created_at: string;
}

interface EnrichedEvent {
  tourId: string;
  tourName: string;
  seats: number;
  price: number;
  revenue: number;
  createdAt: string;
}

interface LeaderRow {
  tourId: string;
  tourName: string;
  seats: number;
  revenue: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getStartDate(filter: Filter): Date {
  const now = new Date();
  if (filter === "today") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  }
  if (filter === "week") {
    const d = new Date(now);
    const day = d.getDay(); // 0=Sun
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    d.setHours(0, 0, 0, 0);
    return d;
  }
  // month
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
}

function filterLabel(f: Filter): string {
  if (f === "today") return "วันนี้";
  if (f === "week")  return "สัปดาห์นี้";
  return "เดือนนี้";
}

function fmt(n: number): string {
  return n.toLocaleString("th-TH");
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1)  return "เมื่อกี้";
  if (diff < 60) return `${diff} นาทีที่แล้ว`;
  const h = Math.floor(diff / 60);
  return `${h} ชั่วโมงที่แล้ว`;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function SalesWarRoom() {
  const tours = useServices(s => s.tours);
  const [filter, setFilter]     = useState<Filter>("today");
  const [events, setEvents]     = useState<EnrichedEvent[]>([]);
  const [loading, setLoading]   = useState(true);
  const [now, setNow]           = useState(new Date());
  const tickerRef = useRef<HTMLDivElement>(null);

  // Clock tick every minute
  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(iv);
  }, []);

  // ── Enrich raw event with price from serviceStore ─────────────────────────
  const enrich = useCallback((ev: BookingEvent): EnrichedEvent => {
    const tour   = tours.find(t => t.id === ev.entity_id);
    const period = tour?.periods?.find(p => p.period_id === ev.meta?.period_id);
    const price  = period?.price_per_seat ?? tour?.price_per_seat ?? 0;
    const seats  = Math.abs(Number(ev.meta?.delta) || 0);
    return {
      tourId:    ev.entity_id,
      tourName:  ev.entity_name ?? "ไม่ระบุโปรแกรม",
      seats,
      price,
      revenue:   price * seats,
      createdAt: ev.created_at,
    };
  }, [tours]);

  // ── Fetch from Supabase ───────────────────────────────────────────────────
  const fetchEvents = useCallback(async (f: Filter) => {
    if (!supabase) return;
    setLoading(true);
    const start = getStartDate(f).toISOString();
    const { data, error } = await supabase
      .from("activity_log")
      .select("entity_id, entity_name, meta, created_at")
      .eq("event_type", "seat_booked")
      .gte("created_at", start)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setEvents((data as BookingEvent[]).map(enrich));
    }
    setLoading(false);
  }, [enrich]);

  useEffect(() => { fetchEvents(filter); }, [filter, fetchEvents]);

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel("war-room-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_log" },
        (payload) => {
          const row = payload.new as BookingEvent & { event_type: string };
          if (row.event_type !== "seat_booked") return;
          const rowDate = new Date(row.created_at);
          if (rowDate < getStartDate(filter)) return;
          const enriched = enrich(row);
          setEvents(prev => [enriched, ...prev]);
        }
      )
      .subscribe();
    return () => { supabase?.removeChannel(channel); };
  }, [filter, enrich]);

  // ── Compute totals ────────────────────────────────────────────────────────
  const totalRevenue      = events.reduce((s, e) => s + e.revenue, 0);
  const totalSeats        = events.reduce((s, e) => s + e.seats,   0);
  const totalTransactions = events.length;
  const avgPerTx          = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  // ── Leaderboard ───────────────────────────────────────────────────────────
  const byTour: Record<string, EnrichedEvent[]> = {};
  events.forEach(e => {
    if (!byTour[e.tourId]) byTour[e.tourId] = [];
    byTour[e.tourId].push(e);
  });
  const leaderboard: LeaderRow[] = Object.entries(byTour)
    .map(([tourId, evs]) => ({
      tourId,
      tourName: evs[0].tourName,
      seats:    evs.reduce((s, e) => s + e.seats,   0),
      revenue:  evs.reduce((s, e) => s + e.revenue, 0),
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const maxRevenue = leaderboard[0]?.revenue ?? 1;

  // ── Ticker items (latest 8) ───────────────────────────────────────────────
  const tickerItems = events.slice(0, 8);

  // ── Styles ────────────────────────────────────────────────────────────────
  const S = {
    screen:  { background:"#07070f", minHeight:"100vh", display:"flex", flexDirection:"column" as const, fontFamily:"var(--font-sans)", color:"#e0e0f0" },
    topbar:  { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 24px", borderBottom:"0.5px solid #1a1a2e", flexShrink:0 },
    ftab:    (active:boolean):React.CSSProperties => ({
      padding:"5px 18px", borderRadius:6, fontSize:13, fontWeight:500,
      border:"0.5px solid "+(active?"#4a4a8a":"#1e1e30"),
      background: active?"#1a1a30":"transparent",
      color: active?"#a0a0ff":"#555", cursor:"pointer", transition:"all .15s",
    }),
    main:    { display:"grid", gridTemplateColumns:"1fr 1fr", flex:1, minHeight:0 },
    left:    { padding:"32px 28px", display:"flex", flexDirection:"column" as const, justifyContent:"center", borderRight:"0.5px solid #1a1a2e" },
    right:   { padding:"24px 24px", display:"flex", flexDirection:"column" as const },
    heroLbl: { fontSize:11, fontWeight:500, color:"#555", letterSpacing:"0.12em", textTransform:"uppercase" as const, marginBottom:8 },
    heroNum: { fontSize:60, fontWeight:600, lineHeight:1, letterSpacing:"-0.02em", color:"#F5C842", marginBottom:8 },
    heroSub: { fontSize:13, color:"#4a4a6a" },
    stats:   { display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:22 },
    card:    { background:"#0d0d1e", border:"0.5px solid #1a1a2e", borderRadius:10, padding:"12px 14px" },
    cardLbl: { fontSize:11, color:"#555", textTransform:"uppercase" as const, letterSpacing:"0.08em", marginBottom:4 },
    cardVal: { fontSize:22, fontWeight:500, color:"#c0c0e0" },
    secLbl:  { fontSize:11, color:"#444", letterSpacing:"0.10em", textTransform:"uppercase" as const, marginBottom:14, display:"flex", alignItems:"center", gap:8 },
    rankRow: { display:"flex", alignItems:"center", gap:10, paddingTop:9, paddingBottom:9, borderBottom:"0.5px solid #10101e" },
    ticker:  { background:"#04040c", borderTop:"0.5px solid #1a1a2e", padding:"9px 24px", overflow:"hidden", whiteSpace:"nowrap" as const, flexShrink:0 },
  };

  const badgeColors: Array<{bg:string;color:string}> = [
    {bg:"#3d2e00",color:"#F5C842"},
    {bg:"#141830",color:"#8890c8"},
    {bg:"#2a1800",color:"#cd7c3a"},
    {bg:"#0f0f1e",color:"#505070"},
    {bg:"#0f0f1e",color:"#505070"},
  ];

  return (
    <div style={S.screen}>
      {/* ── Topbar ── */}
      <div style={S.topbar}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          {/* Live dot */}
          <span style={{width:8,height:8,borderRadius:"50%",background:"#22c55e",display:"inline-block",animation:"pulse-dot 1.8s ease-in-out infinite"}}/>
          <span style={{fontSize:13,fontWeight:500,color:"#22c55e",letterSpacing:"0.06em"}}>LIVE SALES BOARD</span>
          <span style={{fontSize:12,color:"#333",marginLeft:4}}>
            {now.toLocaleTimeString("th-TH",{hour:"2-digit",minute:"2-digit"})}
            {" · "}{filterLabel(filter)}
          </span>
        </div>

        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          {(["today","week","month"] as Filter[]).map(f=>(
            <button key={f} style={S.ftab(filter===f)} onClick={()=>setFilter(f)}>
              {filterLabel(f)}
            </button>
          ))}
          <button
            onClick={()=>window.location.reload()}
            title="รีเฟรช"
            style={{...S.ftab(false),padding:"5px 10px",marginLeft:4}}
          >↻</button>
        </div>
      </div>

      {/* ── Main grid ── */}
      {loading ? (
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:16}}>
            <div style={{width:36,height:36,borderRadius:"50%",border:"2px solid #4a4a8a",borderTopColor:"#a0a0ff",animation:"spin .7s linear infinite"}}/>
            <span style={{fontSize:13,color:"#444"}}>กำลังโหลดข้อมูล…</span>
          </div>
        </div>
      ) : (
        <div style={S.main}>
          {/* ── Left: hero + stats ── */}
          <div style={S.left}>
            <div style={S.heroLbl}>ยอดขายรวม{" "}
              <span style={{color:"#333",fontWeight:400}}>({filterLabel(filter)})</span>
            </div>
            <div style={S.heroNum}>
              ฿{fmt(totalRevenue)}
            </div>
            <div style={S.heroSub}>
              {totalTransactions} รายการ · {totalSeats} ที่นั่ง
            </div>

            <div style={S.stats}>
              <div style={S.card}>
                <div style={S.cardLbl}>ที่นั่งที่จอง</div>
                <div style={S.cardVal}>{fmt(totalSeats)}<span style={{fontSize:13,color:"#555",marginLeft:4}}>ที่นั่ง</span></div>
              </div>
              <div style={S.card}>
                <div style={S.cardLbl}>Transactions</div>
                <div style={S.cardVal}>{fmt(totalTransactions)}<span style={{fontSize:13,color:"#555",marginLeft:4}}>รายการ</span></div>
              </div>
              <div style={S.card}>
                <div style={S.cardLbl}>เฉลี่ย/รายการ</div>
                <div style={S.cardVal}>฿{fmt(Math.round(avgPerTx))}</div>
              </div>
              <div style={S.card}>
                <div style={S.cardLbl}>โปรแกรมที่ขาย</div>
                <div style={S.cardVal}>{Object.keys(byTour).length}<span style={{fontSize:13,color:"#555",marginLeft:4}}>โปรแกรม</span></div>
              </div>
            </div>
          </div>

          {/* ── Right: leaderboard ── */}
          <div style={S.right}>
            <div style={S.secLbl}>
              อันดับโปรแกรม
              <span style={{flex:1,height:"0.5px",background:"#1a1a2e"}}/>
            </div>

            {leaderboard.length === 0 ? (
              <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:"#333",fontSize:13}}>
                ยังไม่มีการจองใน{filterLabel(filter)}
              </div>
            ) : leaderboard.map((row, i) => {
              const bc = badgeColors[i] ?? badgeColors[3];
              const barPct = maxRevenue > 0 ? (row.revenue/maxRevenue)*100 : 0;
              return (
                <div key={row.tourId} style={S.rankRow}>
                  <div style={{
                    width:24,height:24,borderRadius:6,flexShrink:0,
                    background:bc.bg,color:bc.color,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:11,fontWeight:700,
                  }}>{i+1}</div>
                  <div style={{flex:1,overflow:"hidden"}}>
                    <div style={{fontSize:13,color:"#b8b8d8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {row.tourName}
                    </div>
                    <div style={{height:3,background:"#0d0d1e",borderRadius:2,marginTop:5}}>
                      <div style={{
                        height:3,borderRadius:2,
                        background: i===0?"#F5C842":"#4a4a9a",
                        width:`${barPct}%`,transition:"width .4s",
                      }}/>
                    </div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:13,color:i===0?"#F5C842":"#7070c0",fontWeight:500}}>
                      ฿{fmt(row.revenue)}
                    </div>
                    <div style={{fontSize:11,color:"#444",marginTop:1}}>
                      {row.seats} ที่นั่ง
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Live Ticker ── */}
      <div style={S.ticker} ref={tickerRef}>
        {tickerItems.length === 0 ? (
          <span style={{fontSize:12,color:"#333"}}>รอการจองใหม่…</span>
        ) : (
          <div style={{display:"inline-flex",gap:48,animation:"ticker-scroll 30s linear infinite"}}>
            {[...tickerItems,...tickerItems].map((ev, i) => (
              <span key={i} style={{display:"inline-flex",alignItems:"center",gap:8,fontSize:12,color:"#4a4a6a"}}>
                <span style={{width:6,height:6,borderRadius:"50%",background:"#22c55e",flexShrink:0}}/>
                <span>เพิ่งจอง:</span>
                <span style={{color:"#8888cc"}}>{ev.tourName}</span>
                <span style={{color:"#F5C842"}}>+{ev.seats} ที่นั่ง</span>
                <span style={{color:"#3a3a5a"}}>·</span>
                <span>{timeAgo(ev.createdAt)}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* CSS keyframes */}
      <style>{`
        @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes ticker-scroll { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
      `}</style>
    </div>
  );
}
