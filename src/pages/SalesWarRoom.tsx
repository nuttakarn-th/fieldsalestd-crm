/**
 * SalesWarRoom.tsx
 * Real-time Sales Board — fullscreen presentation for event days.
 *
 * Route: /war-room  (standalone, no sidebar)
 * Data : Dual-source merge —
 *   • bookings table (Ledger): new bookings from v277+, accounting by booked_at
 *   • activity_log (legacy): old seat_booked/released events before Ledger existed
 *   Per tour+period: if bookings data exists → use it; else fall back to activity_log
 * Live : Supabase Realtime on bookings INSERT/UPDATE + activity_log INSERT
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { useServices } from "@/store/serviceStore";
import { supabase } from "@/lib/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

type Filter = "today" | "week" | "month" | "custom";

interface BookingRow {
  id: string;
  tour_id: string;
  period_id: string;
  customer_name?: string | null;
  seats: number;
  price_per_seat: number;
  booked_by?: string | null;
  booked_at: string;
  status: "active" | "cancelled";
  cancelled_at?: string | null;
}

// Legacy type — activity_log rows (ข้อมูลก่อน Booking Ledger)
interface ActivityLogRow {
  entity_id: string;
  entity_name: string;
  event_type: string;
  meta: { delta?: number; period_id?: string; price_per_seat?: number } | null;
  created_at: string;
}

interface EnrichedEvent {
  id: string;
  tourId: string;
  tourName: string;
  periodId: string;
  periodLabel: string;
  customerName: string;
  seats: number;
  price: number;
  revenue: number;   // negative if cancelled
  bookedAt: string;  // always booked_at — for date grouping
  status: "active" | "cancelled";
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

function shortDateLabel(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

function fmtRevenue(v: number): string {
  if (v >= 1_000_000) return `฿${(v/1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `฿${Math.round(v/1_000)}K`;
  return `฿${v}`;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function SalesWarRoom() {
  const tours = useServices(s => s.tours);
  const [filter, setFilter]         = useState<Filter>("today");
  const [customFrom, setCustomFrom] = useState<string>(todayIso());
  const [customTo,   setCustomTo]   = useState<string>(todayIso());
  const [showCalendar, setShowCalendar] = useState(false);
  const [events, setEvents]         = useState<EnrichedEvent[]>([]);
  const [loading, setLoading]       = useState(true);
  const [now, setNow]               = useState(new Date());
  const [showAllRanks, setShowAllRanks] = useState(false);
  const [showHistory,  setShowHistory]  = useState(false);
  const [showChart,    setShowChart]    = useState(false);
  const [chartSub,     setChartSub]     = useState<"hourly" | "program">("hourly");
  const [chartTooltip, setChartTooltip] = useState<{
    x: number; y: number; prog: string; val: number; color: string; groupLabel: string;
  } | null>(null);
  const tickerRef = useRef<HTMLDivElement>(null);

  // Clock tick every minute
  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(iv);
  }, []);

  // ── Enrich booking row ───────────────────────────────────────────────────
  // Revenue is booked at booked_at date; cancelled bookings carry negative revenue
  // so that cancellations always net against the original booking date.
  const enrich = useCallback((row: BookingRow): EnrichedEvent => {
    const tour   = tours.find(t => t.id === row.tour_id);
    const period = tour?.periods?.find(p => p.period_id === row.period_id);
    // Price: stored in bookings table (priority) → fall back to current period data
    const price = row.price_per_seat
      || period?.special_price
      || period?.price_per_seat
      || tour?.price_per_seat
      || 0;
    const sign = row.status === "cancelled" ? -1 : 1;
    const periodLabel = period?.start_date
      ? new Date(period.start_date).toLocaleDateString("th-TH", { day:"numeric", month:"short", year:"2-digit" })
      : (period?.travel_date ?? row.period_id ?? "");
    return {
      id:          row.id,
      tourId:      row.tour_id,
      tourName:    tour?.title ?? "ไม่ระบุโปรแกรม",
      periodId:    row.period_id,
      periodLabel,
      customerName: row.customer_name ?? "ไม่ระบุชื่อ",
      seats:       row.seats * sign,
      price,
      revenue:     price * row.seats * sign,
      bookedAt:    row.booked_at,
      status:      row.status,
    };
  }, [tours]);

  // ── Enrich legacy activity_log row (fallback สำหรับข้อมูลก่อน Ledger) ──────
  const enrichLegacy = useCallback((ev: ActivityLogRow): EnrichedEvent => {
    const tour   = tours.find(t => t.id === ev.entity_id);
    const period = tour?.periods?.find(p => p.period_id === ev.meta?.period_id);
    const price  = ev.meta?.price_per_seat
      ?? period?.special_price
      ?? period?.price_per_seat
      ?? tour?.price_per_seat
      ?? 0;
    const rawDelta = Number(ev.meta?.delta) || 0;
    const seats    = Math.abs(rawDelta);
    const sign = ev.event_type === "seat_released" ? -1 : 1;
    const periodLabel = period?.start_date
      ? new Date(period.start_date).toLocaleDateString("th-TH", { day:"numeric", month:"short", year:"2-digit" })
      : (period?.travel_date ?? ev.meta?.period_id ?? "");
    return {
      id:          `log::${ev.entity_id}::${ev.meta?.period_id}::${ev.created_at}`,
      tourId:      ev.entity_id,
      tourName:    ev.entity_name ?? "ไม่ระบุโปรแกรม",
      periodId:    ev.meta?.period_id ?? "",
      periodLabel,
      customerName: "—",
      seats:       seats * sign,
      price,
      revenue:     price * seats * sign,
      bookedAt:    ev.created_at,
      status:      sign === 1 ? "active" : "cancelled",
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

  // ── Fetch from Supabase — dual-source merge ───────────────────────────────
  const fetchEvents = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const { startIso, endIso } = getQueryRange();

    // 1. Bookings table (new — accounting by booked_at)
    let bq = supabase
      .from("bookings")
      .select("id, tour_id, period_id, customer_name, seats, price_per_seat, booked_by, booked_at, status, cancelled_at")
      .gte("booked_at", startIso)
      .order("booked_at", { ascending: false });
    if (endIso) bq = bq.lte("booked_at", endIso);

    // 2. Activity log (legacy — seat_booked/released before Ledger)
    let aq = supabase
      .from("activity_log")
      .select("entity_id, entity_name, event_type, meta, created_at")
      .in("event_type", ["seat_booked", "seat_released"])
      .gte("created_at", startIso)
      .order("created_at", { ascending: false });
    if (endIso) aq = aq.lte("created_at", endIso);

    const [bRes, aRes] = await Promise.all([bq, aq]);

    // 3. Enrich bookings
    const bookingEvents: EnrichedEvent[] = !bRes.error && bRes.data
      ? (bRes.data as BookingRow[]).map(enrich)
      : [];

    // 4. Set of tour+period pairs already covered by bookings table
    //    → suppress matching activity_log entries to avoid double-counting
    const coveredPairs = new Set(
      bookingEvents.map(e => `${e.tourId}::${e.periodId}`)
    );

    // 5. Legacy events for pairs NOT in bookings table
    const legacyEvents: EnrichedEvent[] = !aRes.error && aRes.data
      ? (aRes.data as ActivityLogRow[])
          .filter(ev => !coveredPairs.has(`${ev.entity_id}::${ev.meta?.period_id ?? ""}`))
          .map(enrichLegacy)
      : [];

    // 6. Merge and sort by bookedAt desc
    const merged = [...bookingEvents, ...legacyEvents].sort(
      (a, b) => new Date(b.bookedAt).getTime() - new Date(a.bookedAt).getTime()
    );
    setEvents(merged);
    setLoading(false);
  }, [getQueryRange, enrich, enrichLegacy]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    if (!supabase) return;
    const { startIso, endIso } = getQueryRange();
    const channel = supabase
      .channel("war-room-realtime-v2")
      // bookings INSERT — new booking created
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "bookings" }, (payload) => {
        const row = payload.new as BookingRow;
        const rowDate = new Date(row.booked_at);
        if (rowDate < new Date(startIso)) return;
        if (endIso && rowDate > new Date(endIso)) return;
        const enriched = enrich(row);
        // Remove legacy log entry for same tour+period if exists (avoid double-count)
        setEvents(prev => [
          enriched,
          ...prev.filter(e =>
            e.id !== enriched.id &&
            !(e.id.startsWith("log::") && e.tourId === enriched.tourId && e.periodId === enriched.periodId)
          ),
        ]);
      })
      // bookings UPDATE — e.g. active → cancelled
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "bookings" }, (payload) => {
        const row = payload.new as BookingRow;
        const enriched = enrich(row);
        setEvents(prev => prev.map(e => e.id === enriched.id ? enriched : e));
      })
      // activity_log INSERT — legacy seat_booked/released event (ก่อน Ledger)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_log" }, (payload) => {
        const row = payload.new as ActivityLogRow;
        if (!["seat_booked", "seat_released"].includes(row.event_type)) return;
        const rowDate = new Date(row.created_at);
        if (rowDate < new Date(startIso)) return;
        if (endIso && rowDate > new Date(endIso)) return;
        const enriched = enrichLegacy(row);
        const pairKey = `${enriched.tourId}::${enriched.periodId}`;
        // Only add if bookings table doesn't already cover this tour+period
        setEvents(prev => {
          const alreadyCovered = prev.some(e => !e.id.startsWith("log::") && e.tourId === enriched.tourId && e.periodId === enriched.periodId);
          if (alreadyCovered) return prev;
          return [enriched, ...prev.filter(e => e.id !== enriched.id)];
        });
        // suppress unused variable warning
        void pairKey;
      })
      .subscribe();
    return () => { supabase?.removeChannel(channel); };
  }, [filter, customFrom, customTo, enrich, enrichLegacy, getQueryRange]);

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

  // ── Chart data ────────────────────────────────────────────────────────────
  const isSingleDay = filter === "today" || (filter === "custom" && customFrom === customTo);
  const CHART_COLORS = ["#F5C842","#6366f1","#10b981","#f97316","#ec4899","#06b6d4"] as const;
  const chartTours = allLeaderboard.slice(0, 5);

  // แปลง UTC → เวลาไทย (UTC+7) แบบ fixed offset — ไม่ขึ้นกับ timezone เครื่อง
  const toThaiDate = (iso: string): string =>
    new Date(new Date(iso).getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const toThaiHour = (iso: string): number =>
    new Date(new Date(iso).getTime() + 7 * 60 * 60 * 1000).getUTCHours();

  // กลุ่มตาม booked_at (accounting date) → net ตรงกับ hero number
  const byDate: Record<string, Record<string, number>> = {};
  events.forEach(e => {
    const dk = toThaiDate(e.bookedAt);
    if (!byDate[dk]) byDate[dk] = {};
    byDate[dk][e.tourId] = (byDate[dk][e.tourId] ?? 0) + e.revenue;
  });
  const dateKeys = Object.keys(byDate).sort();

  const byHour: Record<number, Record<string, number>> = {};
  events.forEach(e => {
    const h = toThaiHour(e.bookedAt);
    if (!byHour[h]) byHour[h] = {};
    byHour[h][e.tourId] = (byHour[h][e.tourId] ?? 0) + e.revenue;
  });
  const hourKeys = Object.keys(byHour).map(Number).sort((a, b) => a - b);

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
          <button onClick={()=>setShowChart(v=>!v)} title="ดูกราฟ" style={{...ftab(showChart),padding:"5px 14px",marginLeft:4}}>
            📊 กราฟ
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

          {/* ── Chart Panel ── */}
          {showChart && events.length > 0 && (() => {
            const W=700, H=190;
            const PL=58, PB=30, PT=8, PR=14;
            const cW=W-PL-PR, cH=H-PB-PT;

            const isProg = isSingleDay && chartSub === "program";
            const isHourly = isSingleDay && chartSub === "hourly";

            const groups = isHourly
              ? hourKeys.map(h => ({ label: `${h}:00`, byTour: byHour[h] }))
              : dateKeys.map(dk => ({ label: shortDateLabel(dk), byTour: byDate[dk] }));

            const maxStacked = isProg
              ? (chartTours[0]?.revenue ?? 1)
              : groups.reduce((mx, g) => {
                  // รวมทุกโปรแกรม (ไม่ใช่แค่ top 5) เพื่อให้ scale ถูกต้อง
                  const total = Object.values(g.byTour).reduce((s, v) => s + Math.max(0, v), 0);
                  return Math.max(mx, total);
                }, 0);
            const niceMax = Math.ceil(maxStacked / 100_000) * 100_000 || 1;
            const ticks = [0,1,2,3,4].map(i => ({ v:(i/4)*niceMax, y:PT+cH-(i/4)*cH }));

            return (
              <div style={{width:"100%",maxWidth:720,background:"#0d0d1e",border:"0.5px solid #1a1a2e",borderRadius:14,padding:"16px 20px 14px",marginBottom:4}}>
                {/* Header */}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div style={{fontSize:10,color:"#555",letterSpacing:"0.12em",textTransform:"uppercase" as const}}>
                    {isSingleDay
                      ? (chartSub === "program" ? "ยอดตามโปรแกรม" : "ยอดตามช่วงเวลา (รายชั่วโมง)")
                      : `ยอดรายวัน (${dateKeys.length} วัน)`}
                  </div>
                  {isSingleDay && (
                    <div style={{display:"flex",gap:4}}>
                      {(["hourly","program"] as const).map(tab=>(
                        <button key={tab} onClick={()=>setChartSub(tab)} style={{
                          padding:"3px 10px",borderRadius:5,fontSize:11,cursor:"pointer",
                          background:chartSub===tab?"#1d3461":"#111128",
                          border:`0.5px solid ${chartSub===tab?"#2563eb":"#1a1a30"}`,
                          color:chartSub===tab?"#60a5fa":"#555",
                        }}>{tab==="hourly"?"รายชั่วโมง":"ตามโปรแกรม"}</button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Legend */}
                <div style={{display:"flex",gap:12,flexWrap:"wrap" as const,marginBottom:12}}>
                  {chartTours.map((t,i)=>(
                    <div key={t.tourId} style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:"#666"}}>
                      <div style={{width:7,height:7,borderRadius:"50%",background:CHART_COLORS[i],flexShrink:0}}/>
                      {t.tourName.length>22 ? t.tourName.slice(0,22)+"…" : t.tourName}
                    </div>
                  ))}
                  {/* อื่นๆ — แสดงเมื่อมีโปรแกรมนอก top 5 */}
                  {allLeaderboard.length > chartTours.length && (
                    <div style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:"#666"}}>
                      <div style={{width:7,height:7,borderRadius:"50%",background:"#3a3a5c",flexShrink:0}}/>
                      อื่นๆ
                    </div>
                  )}
                </div>

                {/* SVG */}
                {isProg ? (
                  // Horizontal bar by program
                  <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{display:"block"}}>
                    {chartTours.map((t,i)=>{
                      const rowH = cH / chartTours.length;
                      const bw = (t.revenue / niceMax) * cW;
                      const y = PT + i * rowH;
                      return (
                        <g key={t.tourId}>
                          <text x={PL-6} y={y+rowH/2+4} textAnchor="end" fontSize={9} fill="#555">
                            {t.tourName.length>18?t.tourName.slice(0,18)+"…":t.tourName}
                          </text>
                          <rect x={PL} y={y+rowH*0.2} width={cW} height={rowH*0.6} fill="#111128" rx={4}/>
                          <rect x={PL} y={y+rowH*0.2} width={bw} height={rowH*0.6} fill={CHART_COLORS[i]} opacity={0.85} rx={4}/>
                          <text x={PL+bw+5} y={y+rowH/2+4} fontSize={9} fill={CHART_COLORS[i]} fontWeight="bold">
                            {fmtRevenue(t.revenue)}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                ) : groups.length > 0 ? (
                  // Stacked bar (hourly or multi-day)
                  <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{display:"block"}}>
                    {/* Grid + Y labels */}
                    {ticks.map((tk,i)=>(
                      <g key={i}>
                        <line x1={PL} y1={tk.y} x2={PL+cW} y2={tk.y} stroke="#141420" strokeWidth={1}/>
                        <text x={PL-5} y={tk.y+3} textAnchor="end" fontSize={9} fill="#444">
                          {fmtRevenue(tk.v)}
                        </text>
                      </g>
                    ))}
                    {/* Bars */}
                    {groups.map((g, gi)=>{
                      const gap = cW / groups.length;
                      const bw  = Math.min(gap * 0.6, 48);
                      const cx  = PL + gi * gap + gap / 2;
                      let yOff  = PT + cH;
                      const rects: React.ReactNode[] = [];
                      chartTours.forEach((t, ti) => {
                        const v = g.byTour[t.tourId] ?? 0;
                        if (v <= 0) return;
                        const bh = (v / niceMax) * cH;
                        yOff -= bh;
                        const capturedY = yOff;
                        const capturedV = v;
                        rects.push(
                          <rect key={t.tourId}
                            x={cx-bw/2} y={capturedY}
                            width={bw} height={bh}
                            fill={CHART_COLORS[ti]} opacity={0.85} rx={2}
                            style={{cursor:"default"}}
                            onMouseEnter={(e) => {
                              const r = e.currentTarget.getBoundingClientRect();
                              setChartTooltip({ x: r.left+r.width/2, y: r.top, prog: t.tourName, val: capturedV, color: CHART_COLORS[ti], groupLabel: g.label });
                            }}
                            onMouseLeave={() => setChartTooltip(null)}
                          />
                        );
                      });
                      // segment "อื่นๆ" — โปรแกรมนอก top 5
                      const top5Ids = new Set(chartTours.map(t => t.tourId));
                      const othersV = Object.entries(g.byTour)
                        .filter(([id]) => !top5Ids.has(id))
                        .reduce((s, [, v]) => s + Math.max(0, v), 0);
                      if (othersV > 0) {
                        const bh = (othersV / niceMax) * cH;
                        yOff -= bh;
                        const capturedY = yOff;
                        const capturedOthers = othersV;
                        rects.push(
                          <rect key="__others__"
                            x={cx-bw/2} y={capturedY}
                            width={bw} height={bh}
                            fill="#3a3a5c" opacity={0.7} rx={2}
                            style={{cursor:"default"}}
                            onMouseEnter={(e) => {
                              const r = e.currentTarget.getBoundingClientRect();
                              setChartTooltip({ x: r.left+r.width/2, y: r.top, prog: "โปรแกรมอื่นๆ", val: capturedOthers, color: "#3a3a5c", groupLabel: g.label });
                            }}
                            onMouseLeave={() => setChartTooltip(null)}
                          />
                        );
                      }
                      // label แสดงยอดรวมทุกโปรแกรม (ตรงกับ hero number)
                      const totalV = Object.values(g.byTour).reduce((s, v) => s + Math.max(0, v), 0);
                      return (
                        <g key={gi}>
                          {rects}
                          {totalV > 0 && (
                            <text x={cx} y={yOff - 4} textAnchor="middle" fontSize={9} fill="#666">
                              {fmtRevenue(totalV)}
                            </text>
                          )}
                          <text x={cx} y={PT+cH+18} textAnchor="middle" fontSize={9} fill="#555">
                            {g.label}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                ) : (
                  <div style={{textAlign:"center",color:"#333",fontSize:12,padding:"32px 0"}}>ไม่มีข้อมูลกราฟ</div>
                )}
              </div>
            );
          })()}

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
                <span>{timeAgo(ev.bookedAt)}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Chart Tooltip ── */}
      {chartTooltip && (
        <div style={{
          position:"fixed",
          left: chartTooltip.x,
          top:  chartTooltip.y - 10,
          transform:"translate(-50%,-100%)",
          background:"#1a1a2e",
          border:"0.5px solid #2a2a4a",
          borderRadius:8,
          padding:"7px 11px",
          fontSize:11,
          color:"#ccc",
          pointerEvents:"none",
          zIndex:9999,
          minWidth:130,
          boxShadow:"0 6px 24px rgba(0,0,0,0.6)",
        }}>
          <div style={{color:"#555",marginBottom:4,fontSize:10}}>{chartTooltip.groupLabel}</div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:chartTooltip.color,flexShrink:0}}/>
            <span style={{color:"#a0a0cc",flex:1}}>
              {chartTooltip.prog.length>22 ? chartTooltip.prog.slice(0,22)+"…" : chartTooltip.prog}
            </span>
            <span style={{color:"#F5C842",fontWeight:700,marginLeft:8}}>{fmtRevenue(chartTooltip.val)}</span>
          </div>
        </div>
      )}

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
                  // Group by tourId+periodId → net seats/revenue, latest timestamp, customer names
                  const groups: Record<string, {
                    tourId: string; periodId: string;
                    tourName: string; periodLabel: string;
                    netSeats: number; netRevenue: number; latestAt: string;
                    custNames: string[];
                  }> = {};
                  events.forEach(e => {
                    const key = `${e.tourId}::${e.periodId}`;
                    if (!groups[key]) groups[key] = { tourId: e.tourId, periodId: e.periodId, tourName: e.tourName, periodLabel: e.periodLabel, netSeats: 0, netRevenue: 0, latestAt: e.bookedAt, custNames: [] };
                    groups[key].netSeats   += e.seats;
                    groups[key].netRevenue += e.revenue;
                    if (e.bookedAt > groups[key].latestAt) groups[key].latestAt = e.bookedAt;
                    // ใช้ชื่อลูกค้าจาก booking record โดยตรง
                    if (e.status === "active" && e.customerName && e.customerName !== "ไม่ระบุชื่อ") {
                      if (!groups[key].custNames.includes(e.customerName)) groups[key].custNames.push(e.customerName);
                    }
                  });
                  return Object.values(groups)
                    .filter(g => g.netSeats > 0)
                    .sort((a,b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime())
                    .map((g, i) => {
                      const dt      = new Date(g.latestAt);
                      const dateStr = dt.toLocaleDateString("th-TH", {day:"numeric",month:"short",year:"2-digit"});
                      const timeStr = dt.toLocaleTimeString("th-TH", {hour:"2-digit",minute:"2-digit"});
                      const custNames = g.custNames;
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
