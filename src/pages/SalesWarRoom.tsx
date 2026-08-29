/**
 * SalesWarRoom.tsx
 * Real-time Sales Board — fullscreen presentation for event days.
 *
 * Route: /war-room  (standalone, no sidebar)
 * Data : activity_log (seat_booked / seat_released events) + serviceStore (price fallback)
 * Live : Supabase Realtime subscription on activity_log INSERT
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { useServices } from "@/store/serviceStore";
import { useCRM } from "@/store/crmStore";
import { supabase } from "@/lib/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

type Filter = "today" | "week" | "month" | "custom";

interface BookingEvent {
  entity_id: string;
  entity_name: string;
  event_type: string;
  meta: { delta?: number; period_id?: string; price_per_seat?: number } | null;
  created_at: string;
}

interface EnrichedEvent {
  tourId: string;
  tourName: string;
  periodId: string;
  periodLabel: string;
  eventType: string;
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

function getPresetRange(filter: Filter): { start: Date; end: Date } {
  const now = new Date();
  if (filter === "today") {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0),
      end:   new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59),
    };
  }
  if (filter === "week") {
    const d = new Date(now);
    const day = d.getDay();
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    d.setHours(0, 0, 0, 0);
    return { start: d, end: now };
  }
  // month
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0),
    end:   now,
  };
}

function filterLabel(f: Filter, from?: string, to?: string): string {
  if (f === "today") return "วันนี้";
  if (f === "week")  return "สัปดาห์นี้";
  if (f === "month") return "เดือนนี้";
  if (from && to)    return `${from} – ${to}`;
  if (from)          return `ตั้งแต่ ${from}`;
  return "กำหนดเอง";
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

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function SalesWarRoom() {
  const tours     = useServices(s => s.tours);
  const leads     = useCRM(s => s.leads);
  const customers = useCRM(s => s.customers);
  const [filter, setFilter]         = useState<Filter>("today");
  const [customFrom, setCustomFrom] = useState<string>(todayIso());
  const [customTo,   setCustomTo]   = useState<string>(todayIso());
  const [showCalendar, setShowCalendar] = useState(false);
  const [events, setEvents]         = useState<EnrichedEvent[]>([]);
  const [loading, setLoading]       = useState(true);
  const [now, setNow]               = useState(new Date());
  const [showAllRanks, setShowAllRanks] = useState(false);
  const [showHistory,  setShowHistory]  = useState(false);
  const tickerRef = useRef<HTMLDivElement>(null);

  // Clock tick every minute
  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(iv);
  }, []);

  // ── Enrich raw event with price ───────────────────────────────────────────
  // Priority: meta.price_per_seat (stored at booking time) → special_price → price_per_seat
  const enrich = useCallback((ev: BookingEvent): EnrichedEvent => {
    const tour   = tours.find(t => t.id === ev.entity_id);
    const period = tour?.periods?.find(p => p.period_id === ev.meta?.period_id);
    const price  = ev.meta?.price_per_seat
      ?? period?.special_price
      ?? period?.price_per_seat
      ?? tour?.price_per_seat
      ?? 0;
    const rawDelta = Number(ev.meta?.delta) || 0;
    const seats    = Math.abs(rawDelta);
    // seat_released → revenue ติดลบ (หัก)
    const sign = ev.event_type === "seat_released" ? -1 : 1;
    // Period label: try start_date → travel_date → periodId
    const periodLabel = period?.start_date
      ? new Date(period.start_date).toLocaleDateString("th-TH", { day:"numeric", month:"short", year:"2-digit" })
      : (period?.travel_date ?? ev.meta?.period_id ?? "");
    return {
      tourId:      ev.entity_id,
      tourName:    ev.entity_name ?? "ไม่ระบุโปรแกรม",
      periodId:    ev.meta?.period_id ?? "",
      periodLabel,
      eventType:   ev.event_type,
      seats:       seats * sign,
      price,
      revenue:     price * seats * sign,
      createdAt:   ev.created_at,
    };
  }, [tours]);

  // ── Compute date range for query ─────────────────────────────────────────
  const getQueryRange = useCallback((): { startIso: string; endIso: string | null } => {
    if (filter === "custom") {
      return {
        startIso: new Date(customFrom + "T00:00:00").toISOString(),
        endIso:   new Date(customTo   + "T23:59:59").toISOString(),
      };
    }
    const { start, end } = getPresetRange(filter);
    return { startIso: start.toISOString(), endIso: end.toISOString() };
  }, [filter, customFrom, customTo]);

  // ── Fetch from Supabase ───────────────────────────────────────────────────
  const fetchEvents = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const { startIso, endIso } = getQueryRange();
    let q = supabase
      .from("activity_log")
      .select("entity_id, entity_name, event_type, meta, created_at")
      .in("event_type", ["seat_booked", "seat_released"])
      .gte("created_at", startIso)
      .order("created_at", { ascending: false });
    if (endIso) q = q.lte("created_at", endIso);

    const { data, error } = await q;
    if (!error && data) {
      setEvents((data as BookingEvent[]).map(enrich));
    }
    setLoading(false);
  }, [getQueryRange, enrich]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    if (!supabase) return;
    const { startIso, endIso } = getQueryRange();
    const channel = supabase
      .channel("war-room-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_log" },
        (payload) => {
          const row = payload.new as BookingEvent;
          if (!["seat_booked", "seat_released"].includes(row.event_type)) return;
          const rowDate = new Date(row.created_at);
          if (rowDate < new Date(startIso)) return;
          if (endIso && rowDate > new Date(endIso)) return;
          const enriched = enrich(row);
          setEvents(prev => [enriched, ...prev]);
        }
      )
      .subscribe();
    return () => { supabase?.removeChannel(channel); };
  }, [filter, customFrom, customTo, enrich, getQueryRange]);

  // ── Compute totals ────────────────────────────────────────────────────────
  const totalRevenue = events.reduce((s, e) => s + e.revenue, 0);
  const totalSeats   = events.reduce((s, e) => s + e.seats,   0);
  // 1 Transaction = 1 unique Tour+Period (ไม่ว่าจะบันทึกกี่ครั้ง)
  const uniqueBookings    = new Set(events.map(e => `${e.tourId}::${e.periodId}`)).size;
  const totalTransactions = uniqueBookings;
  const avgPerTx          = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  // ── Leaderboard ───────────────────────────────────────────────────────────
  const byTour: Record<string, EnrichedEvent[]> = {};
  events.forEach(e => {
    if (!byTour[e.tourId]) byTour[e.tourId] = [];
    byTour[e.tourId].push(e);
  });
  const allLeaderboard: LeaderRow[] = Object.entries(byTour)
    .map(([tourId, evs]) => ({
      tourId,
      tourName: evs[0].tourName,
      seats:    evs.reduce((s, e) => s + e.seats,   0),
      revenue:  evs.reduce((s, e) => s + e.revenue, 0),
    }))
    .filter(r => r.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue);

  const leaderboard = showAllRanks ? allLeaderboard : allLeaderboard.slice(0, 5);
  const maxRevenue  = allLeaderboard[0]?.revenue ?? 1;

  // ── Ticker items (latest 8) ───────────────────────────────────────────────
  const tickerItems = events.slice(0, 8);

  // ── Styles ────────────────────────────────────────────────────────────────
  const ftab = (active: boolean): React.CSSProperties => ({
    padding:"5px 18px", borderRadius:6, fontSize:13, fontWeight:500,
    border:"0.5px solid "+(active?"#4a4a8a":"#1e1e30"),
    background: active?"#1a1a30":"transparent",
    color: active?"#a0a0ff":"#555", cursor:"pointer", transition:"all .15s",
  });

  const badgeColors: Array<{bg:string;color:string}> = [
    {bg:"#3d2e00",color:"#F5C842"},
    {bg:"#141830",color:"#8890c8"},
    {bg:"#2a1800",color:"#cd7c3a"},
    {bg:"#0f0f1e",color:"#505070"},
    {bg:"#0f0f1e",color:"#505070"},
  ];

  const label = filterLabel(filter, filter === "custom" ? customFrom : undefined, filter === "custom" ? customTo : undefined);

  return (
    <div style={{background:"#07070f",minHeight:"100vh",display:"flex",flexDirection:"column",fontFamily:"var(--font-sans)",color:"#e0e0f0"}}>

      {/* ── Topbar ── */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 24px",borderBottom:"0.5px solid #1a1a2e",flexShrink:0,flexWrap:"wrap" as const,gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{width:8,height:8,borderRadius:"50%",background:"#22c55e",display:"inline-block",animation:"pulse-dot 1.8s ease-in-out infinite"}}/>
          <span style={{fontSize:13,fontWeight:500,color:"#22c55e",letterSpacing:"0.06em"}}>LIVE SALES BOARD</span>
          <span style={{fontSize:12,color:"#333",marginLeft:4}}>
            {now.toLocaleTimeString("th-TH",{hour:"2-digit",minute:"2-digit"})}
            {" · "}{label}
          </span>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap" as const}}>
          {(["today","week","month"] as Filter[]).map(f=>(
            <button key={f} style={ftab(filter===f)} onClick={()=>{setFilter(f);setShowCalendar(false);}}>
              {filterLabel(f)}
            </button>
          ))}
          {/* Calendar toggle */}
          <button
            style={{...ftab(filter==="custom"), padding:"5px 12px"}}
            onClick={()=>{
              setShowCalendar(v => !v);
              if (filter !== "custom") setFilter("custom");
            }}
            title="เลือกวันเอง"
          >
            📅{filter==="custom" ? ` ${customFrom === customTo ? customFrom : `${customFrom}…`}` : ""}
          </button>
          <button onClick={()=>setShowHistory(true)} title="ประวัติการจอง" style={{...ftab(false),padding:"5px 14px",marginLeft:4}}>
            📋 ประวัติ
          </button>
          <button onClick={()=>window.location.reload()} title="รีเฟรช" style={{...ftab(false),padding:"5px 10px",marginLeft:4}}>↻</button>
        </div>
      </div>

      {/* ── Calendar Picker Panel ── */}
      {showCalendar && (
        <div style={{
          background:"#0d0d1e",borderBottom:"0.5px solid #1a1a2e",
          padding:"12px 24px",display:"flex",alignItems:"center",gap:16,flexWrap:"wrap" as const,
        }}>
          <span style={{fontSize:12,color:"#555"}}>ช่วงวันที่:</span>
          <label style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:12,color:"#777"}}>ตั้งแต่</span>
            <input
              type="date"
              value={customFrom}
              max={customTo}
              onChange={e => setCustomFrom(e.target.value)}
              style={{
                background:"#111128",border:"0.5px solid #2a2a4a",borderRadius:6,
                color:"#a0a0ff",fontSize:12,padding:"4px 8px",cursor:"pointer",
              }}
            />
          </label>
          <label style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:12,color:"#777"}}>ถึง</span>
            <input
              type="date"
              value={customTo}
              min={customFrom}
              max={todayIso()}
              onChange={e => setCustomTo(e.target.value)}
              style={{
                background:"#111128",border:"0.5px solid #2a2a4a",borderRadius:6,
                color:"#a0a0ff",fontSize:12,padding:"4px 8px",cursor:"pointer",
              }}
            />
          </label>
          {/* Quick presets */}
          {[
            {label:"เมื่อวาน", action:()=>{
              const d = new Date(); d.setDate(d.getDate()-1);
              const iso = d.toISOString().slice(0,10);
              setCustomFrom(iso); setCustomTo(iso);
            }},
            {label:"7 วันล่าสุด", action:()=>{
              const d = new Date(); d.setDate(d.getDate()-6);
              setCustomFrom(d.toISOString().slice(0,10)); setCustomTo(todayIso());
            }},
            {label:"เดือนที่แล้ว", action:()=>{
              const now2 = new Date();
              const first = new Date(now2.getFullYear(), now2.getMonth()-1, 1);
              const last  = new Date(now2.getFullYear(), now2.getMonth(), 0);
              setCustomFrom(first.toISOString().slice(0,10));
              setCustomTo(last.toISOString().slice(0,10));
            }},
          ].map(p=>(
            <button key={p.label} onClick={p.action} style={{
              fontSize:11,padding:"3px 10px",borderRadius:5,
              border:"0.5px solid #2a2a4a",background:"transparent",
              color:"#666",cursor:"pointer",
            }}>{p.label}</button>
          ))}
          <button
            onClick={()=>setShowCalendar(false)}
            style={{marginLeft:"auto",fontSize:11,color:"#444",background:"transparent",border:"none",cursor:"pointer"}}
          >✕ ปิด</button>
        </div>
      )}

      {/* ── Body ── */}
      {loading ? (
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:16}}>
            <div style={{width:36,height:36,borderRadius:"50%",border:"2px solid #4a4a8a",borderTopColor:"#a0a0ff",animation:"spin .7s linear infinite"}}/>
            <span style={{fontSize:13,color:"#444"}}>กำลังโหลดข้อมูล…</span>
          </div>
        </div>
      ) : (
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"28px 40px",gap:28}}>

          {/* ── Hero Revenue ── */}
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:11,fontWeight:500,color:"#555",letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:12}}>
              ยอดขายรวม · {label}
            </div>
            <div style={{
              fontSize:"clamp(72px,10vw,140px)",fontWeight:700,lineHeight:1,
              letterSpacing:"-0.03em",color:"#F5C842",
              textShadow:"0 0 80px rgba(245,200,66,0.35)",
            }}>
              ฿{fmt(totalRevenue)}
            </div>
            <div style={{fontSize:14,color:"#3a3a5a",marginTop:12,letterSpacing:"0.04em"}}>
              {totalTransactions} รายการ &nbsp;·&nbsp; {totalSeats} ที่นั่ง
            </div>
          </div>

          {/* ── Stats Row ── */}
          <div style={{display:"flex",gap:12,flexWrap:"wrap" as const,justifyContent:"center"}}>
            {[
              {label:"ที่นั่งที่จอง",  value:`${fmt(totalSeats)}`,                    unit:"ที่นั่ง"},
              {label:"Transactions",   value:`${fmt(totalTransactions)}`,              unit:"รายการ"},
              {label:"เฉลี่ย/รายการ", value:`฿${fmt(Math.round(avgPerTx))}`,          unit:""},
              {label:"โปรแกรมที่ขาย", value:`${allLeaderboard.length}`,               unit:"โปรแกรม"},
            ].map(c=>(
              <div key={c.label} style={{
                background:"#0d0d1e",border:"0.5px solid #1a1a2e",borderRadius:12,
                padding:"14px 22px",minWidth:130,textAlign:"center",
              }}>
                <div style={{fontSize:10,color:"#555",textTransform:"uppercase" as const,letterSpacing:"0.10em",marginBottom:6}}>{c.label}</div>
                <div style={{fontSize:26,fontWeight:600,color:"#c0c0e0",lineHeight:1}}>
                  {c.value}
                  {c.unit && <span style={{fontSize:12,color:"#555",marginLeft:4}}>{c.unit}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* ── Leaderboard ── */}
          <div style={{width:"100%",maxWidth:720}}>
            <div style={{fontSize:10,color:"#444",letterSpacing:"0.12em",textTransform:"uppercase" as const,marginBottom:12,display:"flex",alignItems:"center",gap:10}}>
              อันดับโปรแกรม
              <span style={{flex:1,height:"0.5px",background:"#1a1a2e"}}/>
            </div>

            {allLeaderboard.length === 0 ? (
              <div style={{textAlign:"center",color:"#333",fontSize:13,padding:"32px 0"}}>
                ยังไม่มีการจองใน{label}
              </div>
            ) : (
              <div style={{display:"flex",flexDirection:"column" as const,gap:0}}>
                {leaderboard.map((row, i) => {
                  const bc = badgeColors[i] ?? badgeColors[3];
                  const barPct = maxRevenue > 0 ? (row.revenue/maxRevenue)*100 : 0;
                  return (
                    <div key={row.tourId} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"0.5px solid #10101e"}}>
                      <div style={{
                        width:28,height:28,borderRadius:8,flexShrink:0,
                        background:bc.bg,color:bc.color,
                        display:"flex",alignItems:"center",justifyContent:"center",
                        fontSize:12,fontWeight:700,
                      }}>{i+1}</div>
                      <div style={{flex:1,overflow:"hidden"}}>
                        <div style={{fontSize:14,color:"#b8b8d8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const,marginBottom:6}}>
                          {row.tourName}
                        </div>
                        <div style={{height:4,background:"#0d0d1e",borderRadius:2}}>
                          <div style={{
                            height:4,borderRadius:2,
                            background: i===0?"linear-gradient(90deg,#F5C842,#e0a800)":"#2a2a6a",
                            width:`${barPct}%`,transition:"width .5s",
                          }}/>
                        </div>
                      </div>
                      <div style={{textAlign:"right" as const,flexShrink:0,minWidth:90}}>
                        <div style={{fontSize:15,color:i===0?"#F5C842":"#7070c0",fontWeight:600}}>
                          ฿{fmt(row.revenue)}
                        </div>
                        <div style={{fontSize:11,color:"#444",marginTop:2}}>
                          {row.seats} ที่นั่ง
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Show more / less */}
            {allLeaderboard.length > 5 && (
              <button
                onClick={() => setShowAllRanks(v => !v)}
                style={{
                  marginTop:10, width:"100%", padding:"7px 0",
                  border:"0.5px solid #1a1a2e", borderRadius:8,
                  background:"transparent", color:"#555",
                  fontSize:12, cursor:"pointer", transition:"color .15s",
                }}
                onMouseEnter={e => (e.currentTarget.style.color="#a0a0ff")}
                onMouseLeave={e => (e.currentTarget.style.color="#555")}
              >
                {showAllRanks
                  ? `▲ ย่อ (แสดง 5 อันดับ)`
                  : `▼ ดูทั้งหมด ${allLeaderboard.length} โปรแกรม`}
              </button>
            )}
          </div>

        </div>
      )}

      {/* ── Live Ticker ── */}
      <div ref={tickerRef} style={{background:"#04040c",borderTop:"0.5px solid #1a1a2e",padding:"9px 24px",overflow:"hidden",whiteSpace:"nowrap" as const,flexShrink:0}}>
        {tickerItems.length === 0 ? (
          <span style={{fontSize:12,color:"#333"}}>รอการจองใหม่…</span>
        ) : (
          <div style={{display:"inline-flex",gap:48,animation:"ticker-scroll 30s linear infinite"}}>
            {[...tickerItems,...tickerItems].map((ev, i) => (
              <span key={i} style={{display:"inline-flex",alignItems:"center",gap:8,fontSize:12,color:"#4a4a6a"}}>
                <span style={{width:6,height:6,borderRadius:"50%",background:"#22c55e",flexShrink:0}}/>
                <span>เพิ่งจอง:</span>
                <span style={{color:"#8888cc"}}>{ev.tourName}</span>
                <span style={{color:"#F5C842"}}>+{Math.abs(ev.seats)} ที่นั่ง</span>
                <span style={{color:"#3a3a5a"}}>·</span>
                <span>{timeAgo(ev.createdAt)}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── History Modal ── */}
      {showHistory && (
        <div
          onClick={() => setShowHistory(false)}
          style={{
            position:"fixed",inset:0,background:"rgba(0,0,0,0.72)",
            display:"flex",alignItems:"center",justifyContent:"center",
            zIndex:9999,padding:24,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background:"#0d0d1e",border:"0.5px solid #2a2a4a",borderRadius:16,
              width:"100%",maxWidth:600,maxHeight:"80vh",display:"flex",flexDirection:"column" as const,
              overflow:"hidden",boxShadow:"0 24px 80px rgba(0,0,0,0.6)",
            }}
          >
            {/* Header */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px",borderBottom:"0.5px solid #1a1a2e",flexShrink:0}}>
              <div>
                <div style={{fontSize:14,fontWeight:600,color:"#c0c0e0"}}>📋 ประวัติการจอง</div>
                <div style={{fontSize:11,color:"#444",marginTop:2}}>{label} · {allLeaderboard.length} รายการจอง</div>
              </div>
              <button onClick={()=>setShowHistory(false)} style={{background:"transparent",border:"none",color:"#555",fontSize:18,cursor:"pointer",lineHeight:1}}>✕</button>
            </div>

            {/* List */}
            <div style={{overflowY:"auto" as const,flex:1}}>
              {events.length === 0 ? (
                <div style={{textAlign:"center",color:"#333",fontSize:13,padding:"40px 0"}}>ไม่มีรายการ</div>
              ) : (
                (() => {
                  // Group by tourId+periodId → net seats/revenue, latest timestamp
                  const groups: Record<string, {
                    tourId: string; periodId: string;
                    tourName: string; periodLabel: string;
                    netSeats: number; netRevenue: number; latestAt: string;
                  }> = {};
                  events.forEach(e => {
                    const key = `${e.tourId}::${e.periodId}`;
                    if (!groups[key]) groups[key] = { tourId: e.tourId, periodId: e.periodId, tourName: e.tourName, periodLabel: e.periodLabel, netSeats: 0, netRevenue: 0, latestAt: e.createdAt };
                    groups[key].netSeats   += e.seats;
                    groups[key].netRevenue += e.revenue;
                    if (e.createdAt > groups[key].latestAt) groups[key].latestAt = e.createdAt;
                  });
                  return Object.values(groups)
                    .filter(g => g.netSeats > 0)
                    .sort((a,b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime())
                    .map((g, i) => {
                      const dt      = new Date(g.latestAt);
                      const dateStr = dt.toLocaleDateString("th-TH", {day:"numeric",month:"short",year:"2-digit"});
                      const timeStr = dt.toLocaleTimeString("th-TH", {hour:"2-digit",minute:"2-digit"});
                      // หาชื่อลูกค้าจาก leads ที่ match tour+period ในช่วงวันที่เดียวกัน
                      const { startIso, endIso } = getQueryRange();
                      const matchedLeads = leads.filter(l => {
                        if (l.tour_id !== g.tourId) return false;
                        if (l.period_id !== g.periodId) return false;
                        if (l.status !== "จองแล้ว") return false;
                        const leadDate = l.created_at ? new Date(l.created_at) : null;
                        if (!leadDate) return false;
                        if (leadDate < new Date(startIso)) return false;
                        if (endIso && leadDate > new Date(endIso)) return false;
                        return true;
                      });
                      const custNames = matchedLeads.map(l => {
                        const c = customers.find(c => c.customer_id === l.customer_id);
                        return c?.full_name ?? l.customer_id;
                      }).filter(Boolean);
                      return (
                        <div key={i} style={{
                          display:"flex",alignItems:"flex-start",gap:14,
                          padding:"12px 20px",borderBottom:"0.5px solid #10101e",
                        }}>
                          <div style={{
                            width:32,height:32,borderRadius:8,flexShrink:0,
                            background:"#0e2a0e",display:"flex",alignItems:"center",
                            justifyContent:"center",fontSize:14,marginTop:1,
                          }}>🎟️</div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:13,color:"#c0c0e0",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>
                              {g.tourName}
                            </div>
                            <div style={{fontSize:11,color:"#555",marginTop:3,display:"flex",gap:8,flexWrap:"wrap" as const}}>
                              {g.periodLabel && <span style={{color:"#4a4a6a"}}>📅 {g.periodLabel}</span>}
                              <span style={{color:"#22c55e"}}>+{g.netSeats} ที่นั่ง</span>
                              <span style={{color:"#F5C842"}}>฿{fmt(Math.round(g.netRevenue))}</span>
                            </div>
                            {custNames.length > 0 && (
                              <div style={{fontSize:11,color:"#7878aa",marginTop:4}}>
                                👤 {custNames.join(" · ")}
                              </div>
                            )}
                          </div>
                          <div style={{textAlign:"right" as const,flexShrink:0,fontSize:11,color:"#444"}}>
                            <div>{dateStr}</div>
                            <div style={{marginTop:2,color:"#333"}}>{timeStr}</div>
                          </div>
                        </div>
                      );
                    });
                })()
              )}
            </div>

            {/* Summary footer */}
            <div style={{
              padding:"10px 20px",borderTop:"0.5px solid #1a1a2e",flexShrink:0,
              display:"flex",gap:20,fontSize:12,color:"#555",
            }}>
              <span>รวม <span style={{color:"#F5C842",fontWeight:600}}>฿{fmt(totalRevenue)}</span></span>
              <span>ที่นั่งสุทธิ <span style={{color:"#c0c0e0",fontWeight:600}}>{totalSeats} ที่นั่ง</span></span>
            </div>
          </div>
        </div>
      )}

      {/* CSS keyframes */}
      <style>{`
        @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes ticker-scroll { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.4) sepia(1) saturate(2) hue-rotate(200deg); cursor:pointer; }
      `}</style>
    </div>
  );
}
