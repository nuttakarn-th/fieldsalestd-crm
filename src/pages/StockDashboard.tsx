/**
 * StockDashboard.tsx — Full Stock / Tour Management Dashboard (Dark Mode)
 */
import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, LabelList,
} from "recharts";
import { MapContainer, TileLayer, CircleMarker, Tooltip as LTooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useServices, type TourItem } from "@/store/serviceStore";
import {
  ArrowLeft, Globe2, MapPin, TrendingUp, PackageSearch,
  CheckCircle2, XCircle, CalendarDays, Layers, AlertTriangle, Maximize2, Minimize2,
} from "lucide-react";

// ─── Thai country name → {city, lat, lng} for Leaflet heatmap ────────────────
const CITY_COORDS: Record<string, { city: string; lat: number; lng: number }> = {
  "จีน":        { city: "Beijing",        lat: 39.9042, lng: 116.4074 },
  "ญี่ปุ่น":    { city: "Tokyo",          lat: 35.6762, lng: 139.6503 },
  "เกาหลีใต้":  { city: "Seoul",          lat: 37.5665, lng: 126.9780 },
  "เกาหลี":     { city: "Seoul",          lat: 37.5665, lng: 126.9780 },
  "ไต้หวัน":    { city: "Taipei",         lat: 25.0320, lng: 121.5654 },
  "ฮ่องกง":     { city: "Hong Kong",      lat: 22.3193, lng: 114.1694 },
  "มองโกเลีย":  { city: "Ulaanbaatar",    lat: 47.8864, lng: 106.9057 },
  "สิงคโปร์":   { city: "Singapore",      lat:  1.3521, lng: 103.8198 },
  "มาเลเซีย":   { city: "Kuala Lumpur",   lat:  3.1390, lng: 101.6869 },
  "อินโดนีเซีย":{ city: "Jakarta",        lat: -6.2088, lng: 106.8456 },
  "เวียดนาม":   { city: "Hanoi",          lat: 21.0285, lng: 105.8542 },
  "กัมพูชา":    { city: "Phnom Penh",     lat: 11.5564, lng: 104.9282 },
  "ลาว":        { city: "Vientiane",      lat: 17.9757, lng: 102.6331 },
  "พม่า":       { city: "Yangon",         lat: 16.8661, lng:  96.1951 },
  "เมียนมา":    { city: "Yangon",         lat: 16.8661, lng:  96.1951 },
  "ฟิลิปปินส์": { city: "Manila",         lat: 14.5995, lng: 120.9842 },
  "บรูไน":      { city: "Bandar Seri",    lat:  4.9031, lng: 114.9398 },
  "บาหลี":      { city: "Bali",           lat: -8.3405, lng: 115.0920 },
  "อินเดีย":    { city: "New Delhi",      lat: 28.6139, lng:  77.2090 },
  "เนปาล":      { city: "Kathmandu",      lat: 27.7172, lng:  85.3240 },
  "ศรีลังกา":   { city: "Colombo",        lat:  6.9271, lng:  79.8612 },
  "ภูฏาน":      { city: "Thimphu",        lat: 27.4728, lng:  89.6393 },
  "มัลดีฟส์":   { city: "Malé",           lat:  4.1755, lng:  73.5093 },
  "คาซัคสถาน":  { city: "Almaty",         lat: 43.2220, lng:  76.8512 },
  "อุซเบกิสถาน":{ city: "Samarkand",      lat: 39.6270, lng:  66.9750 },
  "คีร์กีซสถาน":{ city: "Bishkek",        lat: 42.8746, lng:  74.5698 },
  "ฝรั่งเศส":   { city: "Paris",          lat: 48.8566, lng:   2.3522 },
  "สวิตเซอร์แลนด์":{ city: "Zurich",     lat: 47.3769, lng:   8.5417 },
  "อิตาลี":     { city: "Rome",           lat: 41.9028, lng:  12.4964 },
  "เยอรมนี":    { city: "Frankfurt",      lat: 50.1109, lng:   8.6821 },
  "สเปน":       { city: "Barcelona",      lat: 41.3851, lng:   2.1734 },
  "อังกฤษ":     { city: "London",         lat: 51.5074, lng:  -0.1278 },
  "สหราชอาณาจักร":{ city: "London",       lat: 51.5074, lng:  -0.1278 },
  "สกอตแลนด์":  { city: "Edinburgh",      lat: 55.9533, lng:  -3.1883 },
  "ออสเตรีย":   { city: "Vienna",         lat: 48.2082, lng:  16.3738 },
  "เนเธอร์แลนด์":{ city: "Amsterdam",    lat: 52.3676, lng:   4.9041 },
  "เบลเยียม":   { city: "Brussels",       lat: 50.8503, lng:   4.3517 },
  "โปรตุเกส":   { city: "Lisbon",         lat: 38.7223, lng:  -9.1393 },
  "กรีซ":       { city: "Athens",         lat: 37.9838, lng:  23.7275 },
  "ตุรกี":      { city: "Istanbul",       lat: 41.0082, lng:  28.9784 },
  "สาธารณรัฐเช็ก":{ city: "Prague",      lat: 50.0755, lng:  14.4378 },
  "ฮังการี":    { city: "Budapest",       lat: 47.4979, lng:  19.0402 },
  "โปแลนด์":    { city: "Krakow",         lat: 50.0647, lng:  19.9450 },
  "นอร์เวย์":   { city: "Bergen",         lat: 60.3913, lng:   5.3221 },
  "สวีเดน":     { city: "Stockholm",      lat: 59.3293, lng:  18.0686 },
  "ฟินแลนด์":   { city: "Helsinki",       lat: 60.1699, lng:  24.9384 },
  "เดนมาร์ก":   { city: "Copenhagen",     lat: 55.6761, lng:  12.5683 },
  "ไอร์แลนด์":  { city: "Dublin",         lat: 53.3498, lng:  -6.2603 },
  "ไอซ์แลนด์":  { city: "Reykjavik",      lat: 64.1265, lng: -21.8174 },
  "รัสเซีย":    { city: "Moscow",         lat: 55.7558, lng:  37.6173 },
  "โครเอเชีย":  { city: "Dubrovnik",      lat: 42.6507, lng:  18.0944 },
  "สโลวีเนีย":  { city: "Ljubljana",      lat: 46.0569, lng:  14.5058 },
  "มอลตา":      { city: "Valletta",       lat: 35.8997, lng:  14.5147 },
  "โรมาเนีย":   { city: "Bucharest",      lat: 44.4268, lng:  26.1025 },
  "บัลแกเรีย":  { city: "Sofia",          lat: 42.6977, lng:  23.3219 },
  "เซอร์เบีย":  { city: "Belgrade",       lat: 44.7866, lng:  20.4489 },
  "แอลเบเนีย":  { city: "Tirana",         lat: 41.3275, lng:  19.8187 },
  "มอนเตเนโกร": { city: "Kotor",          lat: 42.4247, lng:  18.7712 },
  "ดูไบ":       { city: "Dubai",          lat: 25.2048, lng:  55.2708 },
  "UAE":        { city: "Dubai",          lat: 25.2048, lng:  55.2708 },
  "สหรัฐอาหรับเอมิเรตส์":{ city: "Dubai",lat: 25.2048, lng:  55.2708 },
  "อิสราเอล":   { city: "Jerusalem",      lat: 31.7683, lng:  35.2137 },
  "จอร์แดน":    { city: "Petra",          lat: 30.3285, lng:  35.4444 },
  "ซาอุดีอาระเบีย":{ city: "Riyadh",     lat: 24.6877, lng:  46.7219 },
  "โอมาน":      { city: "Muscat",         lat: 23.5880, lng:  58.3829 },
  "กาตาร์":     { city: "Doha",           lat: 25.2854, lng:  51.5310 },
  "คูเวต":      { city: "Kuwait City",    lat: 29.3759, lng:  47.9774 },
  "บาห์เรน":    { city: "Manama",         lat: 26.2235, lng:  50.5876 },
  "อียิปต์":    { city: "Cairo",          lat: 30.0444, lng:  31.2357 },
  "โมร็อกโก":   { city: "Marrakech",      lat: 31.6295, lng:  -7.9811 },
  "แอฟริกาใต้": { city: "Cape Town",      lat:-33.9249, lng:  18.4241 },
  "แทนซาเนีย":  { city: "Serengeti",      lat: -2.3333, lng:  34.8333 },
  "เคนยา":      { city: "Nairobi",        lat: -1.2921, lng:  36.8219 },
  "มาดากัสการ์":{ city: "Antananarivo",   lat:-18.9137, lng:  47.5361 },
  "เอธิโอเปีย": { city: "Addis Ababa",    lat:  9.0320, lng:  38.7469 },
  "ซิมบับเว":   { city: "Victoria Falls", lat:-17.9243, lng:  25.8572 },
  "กานา":       { city: "Accra",          lat:  5.6037, lng:  -0.1870 },
  "อเมริกา":    { city: "New York",       lat: 40.7128, lng: -74.0060 },
  "สหรัฐอเมริกา":{ city: "New York",     lat: 40.7128, lng: -74.0060 },
  "USA":        { city: "Los Angeles",    lat: 34.0522, lng:-118.2437 },
  "แคนาดา":     { city: "Vancouver",      lat: 49.2827, lng:-123.1207 },
  "เม็กซิโก":   { city: "Cancún",         lat: 21.1619, lng: -86.8515 },
  "เปรู":       { city: "Machu Picchu",   lat:-13.1631, lng: -72.5450 },
  "บราซิล":     { city: "Rio de Janeiro", lat:-22.9068, lng: -43.1729 },
  "อาร์เจนตินา":{ city: "Buenos Aires",  lat:-34.6037, lng: -58.3816 },
  "ชิลี":       { city: "Santiago",       lat:-33.4489, lng: -70.6693 },
  "โคลอมเบีย":  { city: "Bogotá",         lat:  4.7110, lng: -74.0721 },
  "โบลิเวีย":   { city: "La Paz",         lat:-16.5000, lng: -68.1500 },
  "ออสเตรเลีย": { city: "Sydney",         lat:-33.8688, lng: 151.2093 },
  "นิวซีแลนด์": { city: "Queenstown",     lat:-45.0312, lng: 168.6626 },
  "ฟิจิ":       { city: "Suva",           lat:-18.1248, lng: 178.4501 },
  "วานูอาตู":   { city: "Port Vila",      lat:-17.7333, lng: 168.3167 },
  "ไทย":        { city: "Bangkok",        lat: 13.7563, lng: 100.5018 },
  "Thailand":   { city: "Bangkok",        lat: 13.7563, lng: 100.5018 },
};

// ─── brand palette (ใช้งานได้ทั้ง dark/light) ───────────────────────────────
const C_INTL   = "#A78BFA"; // violet-400
const C_DOM    = "#FCD34D"; // amber-300
const C_INC    = "#38BDF8"; // sky-400
const C_BOOKED = "#F472B6"; // pink-400
const C_AVAIL  = "#4ADE80"; // green-400
const C_CANCEL = "#F87171"; // red-400

// ─── helpers ────────────────────────────────────────────────────────────────
function fmtM(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}K`;
  return v.toLocaleString();
}
function fmtMB(v: number) {
  if (v >= 1_000_000) return `฿${(v / 1_000_000).toFixed(1)} ล้าน`;
  if (v >= 1_000)     return `฿${(v / 1_000).toFixed(0)}K`;
  return `฿${v.toLocaleString()}`;
}
const MONTH_TH = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];

// ─── KPI Card ───────────────────────────────────────────────────────────────
function KPICard({
  label, value, sub, color = C_INTL, icon: Icon, alert = false,
}: {
  label: string; value: string; sub?: string; color?: string; icon: React.ElementType; alert?: boolean;
}) {
  return (
    <div className={`bg-card rounded-2xl border px-5 py-4 flex items-start gap-4 min-w-0 transition-all ${alert ? "border-red-500/50 shadow-[0_0_12px_rgba(248,113,113,0.15)]" : "border-border"}`}>
      <div className="rounded-xl p-2.5 shrink-0" style={{ background: `${color}18` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide truncate">{label}</p>
          {alert && <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />}
        </div>
        <p className="text-2xl font-bold mt-0.5 leading-none" style={{ color }}>{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Mini Donut ─────────────────────────────────────────────────────────────
function MiniDonut({ pct, color, bg }: { pct: number; color: string; bg: string }) {
  return (
    <div className="relative w-16 h-16 shrink-0">
      <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
        <circle cx="18" cy="18" r="15" fill="none" strokeWidth="5" stroke={bg} />
        <circle cx="18" cy="18" r="15" fill="none" strokeWidth="5" stroke={color}
          strokeDasharray={`${pct * 0.942} 94.2`} strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[13px] font-bold" style={{ color }}>
        {pct}%
      </span>
    </div>
  );
}

// ─── Custom Tooltip ──────────────────────────────────────────────────────────
function ChartTip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border shadow-xl rounded-xl px-3 py-2.5 text-xs">
      <p className="font-semibold text-foreground mb-1.5">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 mb-0.5">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold text-foreground">{fmtMB(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Section Header ──────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, sub, color = C_INTL }: {
  icon: React.ElementType; title: string; sub?: string; color?: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-4 h-4" style={{ color }} />
      <h2 className="text-sm font-bold text-foreground">{title}</h2>
      {sub && <span className="text-[11px] text-muted-foreground ml-1">{sub}</span>}
    </div>
  );
}

// ─── World Map Section ───────────────────────────────────────────────────────
type MapMode = "rate" | "programs" | "revenue";
type CountryStat = { name: string; programs: number; seats: number; booked: number; bookedVal: number; rate: number };

// ─── Map helpers ─────────────────────────────────────────────────────────────
function MapInvalidator({ trigger }: { trigger: number }) {
  const map = useMap();
  useEffect(() => { setTimeout(() => map.invalidateSize(), 150); }, [map, trigger]);
  return null;
}

type HeatPoint = { c: CountryStat; coord: { city: string; lat: number; lng: number } };
type RGB = { r: number; g: number; b: number };

function CanvasHeatLayer({ points, mode, maxPrograms, maxRevenue }: {
  points: HeatPoint[]; mode: MapMode; maxPrograms: number; maxRevenue: number;
}) {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const getRGB = useCallback((c: CountryStat): RGB => {
    if (mode === "rate") {
      if (c.rate >= 80) return { r: 239, g: 68,  b: 68  };
      if (c.rate >= 55) return { r: 249, g: 115, b: 22  };
      if (c.rate >= 30) return { r: 234, g: 179, b: 8   };
      return                   { r: 34,  g: 197, b: 94  };
    }
    if (mode === "programs") {
      const t = c.programs / maxPrograms;
      if (t >= 0.7) return { r: 124, g: 58,  b: 237 };
      if (t >= 0.4) return { r: 167, g: 139, b: 250 };
      return               { r: 196, g: 181, b: 253 };
    }
    const t = c.bookedVal / maxRevenue;
    if (t >= 0.7) return { r: 2,   g: 132, b: 199 };
    if (t >= 0.4) return { r: 56,  g: 189, b: 248 };
    return               { r: 186, g: 230, b: 253 };
  }, [mode, maxPrograms, maxRevenue]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const size = map.getSize();
    canvas.width  = size.x;
    canvas.height = size.y;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, size.x, size.y);

    for (const { c, coord } of points) {
      const pt = map.latLngToContainerPoint(L.latLng(coord.lat, coord.lng));
      // pixel radius: compare point to 1 degree north
      const northPt = map.latLngToContainerPoint(L.latLng(coord.lat + 3, coord.lng));
      const degPx = Math.abs(pt.y - northPt.y) / 3;
      const sizeM  = 0.35 + (c.programs / maxPrograms) * 0.65;
      const R = Math.max(degPx * (4.0 * sizeM), 14); // ~4° radius scaled by intensity

      const { r, g, b } = getRGB(c);
      const grad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, R);
      grad.addColorStop(0,    `rgba(${r},${g},${b},0.92)`);
      grad.addColorStop(0.10, `rgba(${r},${g},${b},0.80)`);
      grad.addColorStop(0.25, `rgba(${r},${g},${b},0.55)`);
      grad.addColorStop(0.50, `rgba(${r},${g},${b},0.25)`);
      grad.addColorStop(0.75, `rgba(${r},${g},${b},0.08)`);
      grad.addColorStop(1,    `rgba(${r},${g},${b},0)`);

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, R, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }
  }, [map, points, getRGB, maxPrograms]);

  useEffect(() => {
    const container = map.getContainer();
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position:absolute;top:0;left:0;pointer-events:none;z-index:650;";
    container.appendChild(canvas);
    canvasRef.current = canvas;

    draw();
    map.on("move moveend zoomend resize", draw);
    return () => {
      map.off("move moveend zoomend resize", draw);
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      canvasRef.current = null;
    };
  }, [map, draw]);

  return null;
}

// ─── World Leaflet Heatmap ───────────────────────────────────────────────────
type MapMode = "rate" | "programs" | "revenue";
type CountryStat = { name: string; programs: number; seats: number; booked: number; bookedVal: number; rate: number };

function WorldMapSection({ countryStats }: { countryStats: CountryStat[] }) {
  const [mode, setMode] = useState<MapMode>("rate");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fsCounter, setFsCounter] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = () => {
      setIsFullscreen(!!document.fullscreenElement);
      setFsCounter((n) => n + 1);
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => undefined);
    } else {
      document.exitFullscreen().catch(() => undefined);
    }
  }, []);

  const maxPrograms = useMemo(() => Math.max(...countryStats.map((c) => c.programs), 1), [countryStats]);
  const maxRevenue  = useMemo(() => Math.max(...countryStats.map((c) => c.bookedVal), 1), [countryStats]);

  const points = useMemo(() =>
    countryStats
      .map((c) => ({ c, coord: CITY_COORDS[c.name.trim()] }))
      .filter((p): p is { c: CountryStat; coord: { city: string; lat: number; lng: number } } => !!p.coord),
  [countryStats]);

  const modes: { key: MapMode; label: string; color: string }[] = [
    { key: "rate",     label: "Booking Rate", color: C_BOOKED },
    { key: "programs", label: "โปรแกรม",      color: C_INTL   },
    { key: "revenue",  label: "มูลค่าจอง",    color: C_INC    },
  ];

  return (
    <div
      ref={containerRef}
      className={`bg-card border border-border flex flex-col overflow-hidden transition-all ${
        isFullscreen ? "fixed inset-0 z-[9999] rounded-none" : "rounded-2xl"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Globe2 className="w-4 h-4" style={{ color: C_INTL }} />
          <h2 className="text-sm font-bold text-foreground">World Heatmap — การกระจายโปรแกรมทั่วโลก</h2>
          <span className="text-[11px] text-muted-foreground">({points.length}/{countryStats.length} ประเทศ)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden text-[11px]">
            {modes.map((m) => (
              <button key={m.key} onClick={() => setMode(m.key)}
                className="px-3 py-1.5 font-medium transition-all"
                style={mode === m.key
                  ? { background: m.color, color: "#fff" }
                  : { background: "transparent", color: "hsl(var(--muted-foreground))" }}>
                {m.label}
              </button>
            ))}
          </div>
          <button onClick={toggleFullscreen}
            className="p-1.5 rounded-lg border border-border hover:bg-muted transition-colors"
            title={isFullscreen ? "ออกจากเต็มจอ" : "ขยายเต็มจอ"}>
            {isFullscreen
              ? <Minimize2 className="w-3.5 h-3.5 text-muted-foreground" />
              : <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />}
          </button>
        </div>
      </div>

      {/* Leaflet Map */}
      <div className={isFullscreen ? "flex-1" : "aspect-[8/5]"} style={{ minHeight: 0 }}>
        <MapContainer
          center={[20, 100]}
          zoom={4}
          scrollWheelZoom
          zoomControl
          style={{ height: "100%", width: "100%" }}
          className="z-0"
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a> &copy; <a href="https://carto.com">CARTO</a>'
            subdomains="abcd"
            maxZoom={18}
          />
          <MapInvalidator trigger={fsCounter} />
          {/* Canvas handles radial gradient glow visuals */}
          <CanvasHeatLayer points={points} mode={mode} maxPrograms={maxPrograms} maxRevenue={maxRevenue} />
          {/* Invisible CircleMarkers for hover tooltips */}
          {points.map(({ c, coord }) => {
            const rateColor = c.rate >= 80 ? "#EF4444" : c.rate >= 55 ? "#F97316" : c.rate >= 30 ? "#EAB308" : "#22C55E";
            return (
              <CircleMarker
                key={c.name}
                center={[coord.lat, coord.lng]}
                radius={28}
                pathOptions={{ fillColor: "transparent", fillOpacity: 0, stroke: false }}
              >
                <LTooltip direction="top" offset={[0, -12]} opacity={1} sticky>
                  <div style={{ fontSize: 12, lineHeight: 1.6, minWidth: 155 }}>
                    <strong style={{ display: "block", marginBottom: 4 }}>{c.name}</strong>
                    <span style={{ color: "#888", fontSize: 11 }}>{coord.city}</span>
                    <hr style={{ margin: "4px 0", borderColor: "#e5e7eb" }} />
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <span style={{ color: "#6b7280" }}>โปรแกรม</span>
                      <strong>{c.programs}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <span style={{ color: "#6b7280" }}>Booking Rate</span>
                      <strong style={{ color: rateColor }}>{c.rate}%</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <span style={{ color: "#6b7280" }}>มูลค่าจอง</span>
                      <strong>{fmtMB(c.bookedVal)}</strong>
                    </div>
                  </div>
                </LTooltip>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 px-4 py-2 border-t border-border shrink-0 flex-wrap">
        {mode === "rate" && (
          <>
            <span className="text-[10px] text-muted-foreground">Booking Rate:</span>
            {[
              { color: "#22C55E", label: "<30%"  },
              { color: "#EAB308", label: "30–54%" },
              { color: "#F97316", label: "55–79%" },
              { color: "#EF4444", label: "80%+"   },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ background: l.color }} />
                <span className="text-[10px] text-muted-foreground">{l.label}</span>
              </div>
            ))}
          </>
        )}
        {mode === "programs" && (
          <>
            <span className="text-[10px] text-muted-foreground">จำนวนโปรแกรม:</span>
            {[["#C4B5FD","น้อย"], ["#A78BFA","กลาง"], ["#7C3AED","มาก"]].map(([c, l]) => (
              <div key={l} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ background: c }} />
                <span className="text-[10px] text-muted-foreground">{l}</span>
              </div>
            ))}
          </>
        )}
        {mode === "revenue" && (
          <>
            <span className="text-[10px] text-muted-foreground">มูลค่าจอง:</span>
            {[["#BAE6FD","น้อย"], ["#38BDF8","กลาง"], ["#0284C7","มาก"]].map(([c, l]) => (
              <div key={l} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ background: c }} />
                <span className="text-[10px] text-muted-foreground">{l}</span>
              </div>
            ))}
          </>
        )}
        <span className="text-[10px] text-muted-foreground/40 ml-auto">Scroll to zoom · Drag to pan · Hover for stats</span>
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function StockDashboard() {
  const navigate = useNavigate();
  const tours    = useServices((s) => s.tours) as TourItem[];

  const [yearFilter, setYearFilter] = useState<number | "all">("all");

  // ── filtered tours ──
  const filteredTours = useMemo(() => {
    if (yearFilter === "all") return tours;
    return tours.map((t) => ({
      ...t,
      periods: (t.periods ?? []).filter((p) => {
        if (!p.start_date) return true;
        return new Date(p.start_date).getFullYear() === yearFilter;
      }),
    })).filter((t) => (t.periods ?? []).length > 0);
  }, [tours, yearFilter]);

  // ── global stats ──
  const global = useMemo(() => {
    let totalSeats = 0, booked = 0, available = 0;
    let capacityValue = 0, bookedValue = 0;
    let activePeriods = 0, cancelledPeriods = 0, cancelledValue = 0;
    for (const t of filteredTours) {
      for (const p of t.periods ?? []) {
        if (p.cancelled) {
          cancelledPeriods++;
          cancelledValue += p.total_seats * p.price_per_seat;
        } else {
          activePeriods++;
          totalSeats    += p.total_seats;
          booked        += p.total_seats - p.quota;
          available     += p.quota;
          capacityValue += p.total_seats * p.price_per_seat;
          bookedValue   += (p.total_seats - p.quota) * p.price_per_seat;
        }
      }
    }
    const bookingRate = totalSeats > 0 ? Math.round((booked / totalSeats) * 100) : 0;
    const valueRate   = capacityValue > 0 ? Math.round((bookedValue / capacityValue) * 100) : 0;
    return { totalSeats, booked, available, capacityValue, bookedValue, activePeriods, cancelledPeriods, cancelledValue, bookingRate, valueRate };
  }, [filteredTours]);

  // ── revenue by month ──
  const revenueByMonth = useMemo(() => {
    const map: Record<string, { capacity: number; booked: number }> = {};
    for (const t of filteredTours) {
      for (const p of t.periods ?? []) {
        if (!p.start_date || p.cancelled) continue;
        const dt  = new Date(p.start_date);
        const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
        if (!map[key]) map[key] = { capacity: 0, booked: 0 };
        map[key].capacity += p.total_seats * p.price_per_seat;
        map[key].booked   += (p.total_seats - p.quota) * p.price_per_seat;
      }
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([key, v]) => {
      const [yr, mo] = key.split("-");
      return { key, label: `${MONTH_TH[+mo - 1]}'${String(+yr + 543).slice(-2)}`, ...v };
    });
  }, [filteredTours]);

  // ── category breakdown ──
  const catStats = useMemo(() => {
    const cats = [
      { key: "International Tour", label: "International Tour", color: C_INTL, ringBg: `${C_INTL}25` },
      { key: "Domestic",           label: "Domestic",           color: C_DOM,  ringBg: `${C_DOM}25`  },
      { key: "Incentive",          label: "Incentive",          color: C_INC,  ringBg: `${C_INC}25`  },
    ] as const;
    return cats.map(({ key, label, color, ringBg }) => {
      const ts = filteredTours.filter((t) => t.category === key);
      let seats = 0, bk = 0, cap = 0, bkv = 0, periods = 0, cancelled = 0;
      for (const t of ts) for (const p of t.periods ?? []) {
        if (p.cancelled) { cancelled++; continue; }
        periods++; seats += p.total_seats; bk += p.total_seats - p.quota;
        cap += p.total_seats * p.price_per_seat;
        bkv += (p.total_seats - p.quota) * p.price_per_seat;
      }
      return { key, label, color, ringBg, programs: ts.length, seats, booked: bk, cap, bookedVal: bkv,
        rate: seats > 0 ? Math.round((bk / seats) * 100) : 0, periods, cancelled };
    });
  }, [filteredTours]);

  // ── by continent ──
  const continentStats = useMemo(() => {
    const map: Record<string, { seats: number; booked: number; cap: number; bookedVal: number; programs: number }> = {};
    for (const t of filteredTours) {
      const cont = t.continent || (t.category === "Domestic" ? "ไทย" : t.country || "อื่นๆ");
      if (!map[cont]) map[cont] = { seats: 0, booked: 0, cap: 0, bookedVal: 0, programs: 0 };
      map[cont].programs++;
      for (const p of t.periods ?? []) {
        if (p.cancelled) continue;
        map[cont].seats     += p.total_seats;
        map[cont].booked    += p.total_seats - p.quota;
        map[cont].cap       += p.total_seats * p.price_per_seat;
        map[cont].bookedVal += (p.total_seats - p.quota) * p.price_per_seat;
      }
    }
    return Object.entries(map)
      .map(([name, v]) => ({ name, ...v, rate: v.seats > 0 ? Math.round((v.booked / v.seats) * 100) : 0 }))
      .sort((a, b) => b.bookedVal - a.bookedVal).slice(0, 10);
  }, [filteredTours]);

  // ── top countries ──
  const countryStats = useMemo(() => {
    const map: Record<string, { seats: number; booked: number; cap: number; bookedVal: number; programs: number }> = {};
    for (const t of filteredTours) {
      for (const c of (t.countries?.length ? t.countries : [t.country || "—"])) {
        if (!map[c]) map[c] = { seats: 0, booked: 0, cap: 0, bookedVal: 0, programs: 0 };
        map[c].programs++;
        for (const p of t.periods ?? []) {
          if (p.cancelled) continue;
          map[c].seats     += p.total_seats;
          map[c].booked    += p.total_seats - p.quota;
          map[c].cap       += p.total_seats * p.price_per_seat;
          map[c].bookedVal += (p.total_seats - p.quota) * p.price_per_seat;
        }
      }
    }
    return Object.entries(map)
      .map(([name, v]) => ({ name, ...v, rate: v.seats > 0 ? Math.round((v.booked / v.seats) * 100) : 0 }))
      .sort((a, b) => b.bookedVal - a.bookedVal).slice(0, 12);
  }, [filteredTours]);

  // ── heatmap (กรองเฉพาะปี ค.ศ. 2010–2040 เพื่อกันข้อมูลผิดพลาด) ──
  const heatmapData = useMemo(() => {
    const MIN_YEAR = 2010, MAX_YEAR = 2040;
    const years = new Set<number>();
    for (const t of filteredTours) for (const p of t.periods ?? []) {
      if (!p.start_date) continue;
      const y = new Date(p.start_date).getFullYear();
      if (y >= MIN_YEAR && y <= MAX_YEAR) years.add(y);
    }
    const yearList = Array.from(years).sort();
    const grid: Record<string, Record<number, { periods: number; booked: number; seats: number }>> = {};
    for (const t of filteredTours) for (const p of t.periods ?? []) {
      if (!p.start_date || p.cancelled) continue;
      const d = new Date(p.start_date); const mo = d.getMonth(); const yr = d.getFullYear();
      if (yr < MIN_YEAR || yr > MAX_YEAR) continue;
      if (!grid[mo]) grid[mo] = {};
      if (!grid[mo][yr]) grid[mo][yr] = { periods: 0, booked: 0, seats: 0 };
      grid[mo][yr].periods++; grid[mo][yr].booked += p.total_seats - p.quota; grid[mo][yr].seats += p.total_seats;
    }
    return { grid, yearList };
  }, [filteredTours]);

  // ── stock health ──
  const healthData = useMemo(() => {
    let full = 0, low = 0, ok = 0;
    for (const t of filteredTours) for (const p of t.periods ?? []) {
      if (p.cancelled) continue;
      const pct = p.total_seats > 0 ? (p.quota / p.total_seats) * 100 : 100;
      if (pct === 0) full++; else if (pct <= 20) low++; else ok++;
    }
    return [
      { name: "ปิดกรุ๊ป (FULL)", value: full, color: C_CANCEL },
      { name: "ใกล้เต็ม (<20%)", value: low,  color: C_DOM    },
      { name: "ว่างปกติ",        value: ok,   color: C_AVAIL  },
    ];
  }, [filteredTours]);

  // ── upcoming (90d) ──
  const upcoming = useMemo(() => {
    const today = new Date(); const limit = new Date(); limit.setDate(today.getDate() + 90);
    const list: { tourCode: string; category: string; start: string; seats: number; quota: number; airline: string }[] = [];
    for (const t of filteredTours) for (const p of t.periods ?? []) {
      if (!p.start_date || p.cancelled) continue;
      const d = new Date(p.start_date);
      if (d >= today && d <= limit)
        list.push({ tourCode: t.code, category: t.category, start: p.start_date, seats: p.total_seats, quota: p.quota, airline: p.airline_code || "—" });
    }
    return list.sort((a, b) => a.start.localeCompare(b.start)).slice(0, 20);
  }, [filteredTours]);

  // ── cancellation by month ──
  const cancelByMonth = useMemo(() => {
    const map: Record<string, { count: number; value: number }> = {};
    for (const t of filteredTours) for (const p of t.periods ?? []) {
      if (!p.cancelled || !p.start_date) continue;
      const dt = new Date(p.start_date);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      if (!map[key]) map[key] = { count: 0, value: 0 };
      map[key].count++; map[key].value += p.total_seats * p.price_per_seat;
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([key, v]) => {
      const [yr, mo] = key.split("-");
      return { label: `${MONTH_TH[+mo - 1]}'${String(+yr + 543).slice(-2)}`, ...v };
    });
  }, [filteredTours]);

  // ── available years ── (กรองเฉพาะปีที่สมเหตุสมผล: ค.ศ. 2010–2040)
  const availableYears = useMemo(() => {
    const s = new Set<number>();
    const MIN_YEAR = 2010, MAX_YEAR = 2040;
    for (const t of tours) for (const p of t.periods ?? []) {
      if (!p.start_date) continue;
      const y = new Date(p.start_date).getFullYear();
      if (y >= MIN_YEAR && y <= MAX_YEAR) s.add(y);
    }
    return Array.from(s).sort().reverse();
  }, [tours]);

  // ─── render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <div className="bg-card border-b border-border sticky top-0 z-20">
        <div className="max-w-screen-2xl mx-auto px-6 py-3 flex items-center gap-4">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> กลับ
          </button>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-2">
            <PackageSearch className="w-5 h-5" style={{ color: C_INTL }} />
            <h1 className="text-base font-bold text-foreground">Stock Dashboard</h1>
            <span className="text-[11px] px-2 py-0.5 rounded-full font-medium border"
              style={{ background: `${C_INTL}15`, color: C_INTL, borderColor: `${C_INTL}30` }}>
              Executive View
            </span>
          </div>
          {/* Year filter */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">ช่วงปี:</span>
            <div className="flex items-center gap-1">
              {(["all" as const, ...availableYears]).map((y) => (
                <button key={y}
                  onClick={() => setYearFilter(y)}
                  className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                  style={yearFilter === y
                    ? { background: C_INTL, color: "#fff" }
                    : { background: "transparent", color: "hsl(var(--muted-foreground))", border: "1px solid hsl(var(--border))" }
                  }
                >{y === "all" ? "ทั้งหมด" : y + 543}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KPICard label="มูลค่า Capacity" value={fmtMB(global.capacityValue)} sub={`${global.activePeriods} periods`} color={C_INTL} icon={Layers} />
          <KPICard label="มูลค่าจอง"      value={fmtMB(global.bookedValue)}    sub={`${global.valueRate}% ของ capacity`} color={C_BOOKED} icon={TrendingUp} />
          <KPICard label="Booking Rate"   value={`${global.bookingRate}%`}
            sub={`${global.booked.toLocaleString()} / ${global.totalSeats.toLocaleString()} ที่`}
            color={global.bookingRate < 15 ? C_CANCEL : global.bookingRate < 35 ? "#FB923C" : C_INC}
            alert={global.bookingRate < 15}
            icon={CheckCircle2} />
          <KPICard label="ที่นั่งว่าง"   value={global.available.toLocaleString()} sub="ยังสามารถรับได้" color={C_AVAIL} icon={PackageSearch} />
          <KPICard label="Periods ทั้งหมด" value={global.activePeriods.toLocaleString()} sub={`${filteredTours.length} โปรแกรม`} color={C_DOM} icon={CalendarDays} />
          <KPICard label="ยกเลิกแล้ว"   value={`${global.cancelledPeriods} Period`}
            sub={fmtMB(global.cancelledValue)}
            color={C_CANCEL}
            alert={global.cancelledPeriods > 0}
            icon={XCircle} />
        </div>

        {/* ── Revenue by Month + Stock Health ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Area Chart */}
          <div className="xl:col-span-2 bg-card rounded-2xl border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-foreground">มูลค่ารายเดือน</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">Capacity vs มูลค่าจองจริง</p>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-3 h-1 rounded-full inline-block" style={{background:C_INTL}} /> Capacity</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-1 rounded-full inline-block" style={{background:C_BOOKED}} /> จอง</span>
              </div>
            </div>
            {revenueByMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={revenueByMonth} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradCap" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C_INTL}   stopOpacity={0.25} />
                      <stop offset="95%" stopColor={C_INTL}   stopOpacity={0}    />
                    </linearGradient>
                    <linearGradient id="gradBk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C_BOOKED} stopOpacity={0.3}  />
                      <stop offset="95%" stopColor={C_BOOKED} stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tickFormatter={fmtM} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} width={56} />
                  <Tooltip content={<ChartTip />} />
                  <Area type="monotone" dataKey="capacity" name="Capacity" stroke={C_INTL}   strokeWidth={2} fill="url(#gradCap)" />
                  <Area type="monotone" dataKey="booked"   name="จอง"     stroke={C_BOOKED} strokeWidth={2} fill="url(#gradBk)"  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">ยังไม่มีข้อมูล Period</div>
            )}
          </div>

          {/* Stock Health Donut */}
          <div className="bg-card rounded-2xl border border-border p-5">
            <h2 className="text-sm font-bold text-foreground mb-1">Stock Health</h2>
            <p className="text-[11px] text-muted-foreground mb-3">สถานะที่นั่งทั้งหมด</p>
            <div className="relative">
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={healthData} cx="50%" cy="50%" innerRadius={42} outerRadius={65} dataKey="value" paddingAngle={3}>
                    {healthData.map((e) => <Cell key={e.name} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v} period`} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              {/* Center label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-bold text-foreground leading-none">{global.bookingRate}%</span>
                <span className="text-[9px] text-muted-foreground mt-0.5">จองแล้ว</span>
              </div>
            </div>
            <div className="space-y-2 mt-1">
              {healthData.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                    <span className="text-muted-foreground">{d.name}</span>
                  </div>
                  <span className="font-bold" style={{ color: d.color }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Category Breakdown ── */}
        <div>
          <SectionHeader icon={Layers} title="แยกตามประเภท" color={C_INTL} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {catStats.map((c) => (
              <div key={c.key} className="bg-card rounded-2xl border border-border p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">{c.label}</p>
                    <p className="text-xl font-bold mt-0.5" style={{ color: c.color }}>{c.programs} โปรแกรม</p>
                  </div>
                  <MiniDonut pct={c.rate} color={c.color} bg={c.ringBg} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { lbl: "ที่นั่งรวม",       val: c.seats.toLocaleString(),  clr: "text-foreground" },
                    { lbl: "จองแล้ว",          val: c.booked.toLocaleString(), clr: "", style: { color: c.color } },
                    { lbl: "มูลค่า Capacity",  val: fmtMB(c.cap),             clr: "text-foreground" },
                    { lbl: "มูลค่าจอง",        val: fmtMB(c.bookedVal),       clr: "", style: { color: c.color } },
                  ].map(({ lbl, val, clr, style: s }) => (
                    <div key={lbl} className="rounded-lg p-2" style={{ background: c.ringBg }}>
                      <p className="text-muted-foreground text-[10px]">{lbl}</p>
                      <p className={`font-bold text-[11px] ${clr}`} style={s}>{val}</p>
                    </div>
                  ))}
                </div>
                {c.cancelled > 0 && (
                  <div className="mt-2 text-[10px] rounded-lg px-2.5 py-1.5" style={{ background: `${C_CANCEL}15`, color: C_CANCEL }}>
                    ❌ ยกเลิก {c.cancelled} period
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── World Map + Heatmap (side-by-side on XL) ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
          {/* World Map — 2/3 width */}
          <div className="xl:col-span-2">
            <WorldMapSection countryStats={countryStats} />
          </div>

          {/* Period Heatmap — 1/3 width */}
          <div className="bg-card rounded-2xl border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays className="w-4 h-4" style={{ color: C_INTL }} />
              <h2 className="text-sm font-bold text-foreground">Period Heatmap</h2>
              <span className="text-[10px] text-muted-foreground">รายเดือน</span>
            </div>
            {heatmapData.yearList.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="text-xs border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left text-[10px] text-muted-foreground font-medium py-1 pr-3 sticky left-0 bg-card w-8">เดือน</th>
                      {heatmapData.yearList.map((y) => (
                        <th key={y} className="text-center text-[10px] text-muted-foreground font-semibold py-1 px-0.5 w-[58px]">
                          {y + 543}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {MONTH_TH.map((mo, mi) => (
                      <tr key={mi}>
                        <td className="text-muted-foreground font-medium py-0.5 pr-3 text-[10px] sticky left-0 bg-card">{mo}</td>
                        {heatmapData.yearList.map((y) => {
                          const cell = heatmapData.grid[mi]?.[y];
                          const count = cell?.periods ?? 0;
                          const rate  = cell && cell.seats > 0 ? Math.round((cell.booked / cell.seats) * 100) : 0;
                          // สี เขียว→เหลือง→ส้ม→แดง ตาม booking rate
                          const heatColor = (r: number) => {
                            if (r >= 80) return { bg: "rgba(239,68,68,0.85)",  text: "#fff",     sub: "rgba(255,255,255,0.8)" };
                            if (r >= 55) return { bg: "rgba(249,115,22,0.80)", text: "#fff",     sub: "rgba(255,255,255,0.8)" };
                            if (r >= 30) return { bg: "rgba(234,179,8,0.75)",  text: "#78350f",  sub: "rgba(120,53,15,0.7)"  };
                            if (r >  0)  return { bg: "rgba(34,197,94,0.65)",  text: "#14532d",  sub: "rgba(20,83,45,0.7)"   };
                            return            { bg: "rgba(34,197,94,0.25)",  text: "#166534",  sub: "rgba(22,101,52,0.6)"  };
                          };
                          const clr = count > 0 ? heatColor(rate) : null;
                          return (
                            <td key={y} className="text-center py-0.5 px-0.5">
                              <div className="rounded-md mx-auto flex flex-col items-center justify-center cursor-default transition-transform hover:scale-105"
                                style={{ background: clr ? clr.bg : "hsl(var(--muted))", height: 36, width: 52 }}
                                title={count > 0 ? `${mo} ${y+543}: ${count} periods, จอง ${rate}%` : "ไม่มี period"}>
                                {count > 0 && clr ? (
                                  <>
                                    <span className="text-[13px] font-bold leading-none" style={{ color: clr.text }}>{count}</span>
                                    <span className="text-[9px]" style={{ color: clr.sub }}>{rate}%</span>
                                  </>
                                ) : (
                                  <span className="text-muted-foreground/25 text-[10px]">—</span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {[
                    { bg: "rgba(34,197,94,0.35)",  label: "0%" },
                    { bg: "rgba(34,197,94,0.65)",  label: "<30%" },
                    { bg: "rgba(234,179,8,0.75)",  label: "30–54%" },
                    { bg: "rgba(249,115,22,0.80)", label: "55–79%" },
                    { bg: "rgba(239,68,68,0.85)",  label: "80%+" },
                  ].map((l) => (
                    <div key={l.label} className="flex items-center gap-1">
                      <div className="w-3.5 h-3 rounded-sm" style={{ background: l.bg }} />
                      <span className="text-[9px] text-muted-foreground">{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">ยังไม่มีข้อมูล</div>
            )}
          </div>
        </div>

        {/* ── By Continent + By Country ── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Continent */}
          <div className="bg-card rounded-2xl border border-border p-5">
            <SectionHeader icon={Globe2} title="แยกตามทวีป / ภูมิภาค" color={C_INC} />
            {continentStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(200, continentStats.length * 34)}>
                <BarChart data={continentStats} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" tickFormatter={fmtM} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis dataKey="name" type="category" width={72} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip content={<ChartTip />} />
                  <Bar dataKey="cap"       name="Capacity"  fill={`${C_INTL}30`} radius={[0,4,4,0]} />
                  <Bar dataKey="bookedVal" name="มูลค่าจอง" fill={C_INTL}       radius={[0,4,4,0]}>
                    <LabelList dataKey="bookedVal" position="right" formatter={(v: number) => fmtM(v)}
                      style={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">ยังไม่มีข้อมูล Continent</div>
            )}
          </div>

          {/* Country table */}
          <div className="bg-card rounded-2xl border border-border p-5">
            <SectionHeader icon={MapPin} title="Top ประเทศ (by มูลค่าจอง)" color={C_DOM} />
            <div className="overflow-auto max-h-[280px]">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border text-[10px] text-muted-foreground uppercase tracking-wide">
                    <th className="text-left py-1.5 font-medium">#</th>
                    <th className="text-left py-1.5 font-medium">ประเทศ</th>
                    <th className="text-right py-1.5 font-medium">โปรแกรม</th>
                    <th className="text-right py-1.5 font-medium">จอง%</th>
                    <th className="text-right py-1.5 font-medium">มูลค่าจอง</th>
                  </tr>
                </thead>
                <tbody>
                  {countryStats.map((c, i) => (
                    <tr key={c.name} className="border-b border-border/40 hover:bg-muted/40 transition-colors">
                      <td className="py-1.5 text-muted-foreground/40 w-6">{i + 1}</td>
                      <td className="py-1.5 font-medium text-foreground">{c.name}</td>
                      <td className="py-1.5 text-right text-muted-foreground">{c.programs}</td>
                      <td className="py-1.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full transition-all"
                              style={{ width: `${c.rate}%`, background: c.rate >= 70 ? C_BOOKED : c.rate >= 40 ? C_DOM : "hsl(var(--muted-foreground))" }} />
                          </div>
                          <span className="font-semibold text-[11px] w-8 text-right" style={{ color: c.rate >= 70 ? C_BOOKED : c.rate >= 40 ? C_DOM : "hsl(var(--muted-foreground))" }}>
                            {c.rate}%
                          </span>
                        </div>
                      </td>
                      <td className="py-1.5 text-right font-semibold" style={{ color: C_INTL }}>{fmtMB(c.bookedVal)}</td>
                    </tr>
                  ))}
                  {countryStats.length === 0 && (
                    <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">ยังไม่มีข้อมูลประเทศ</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Cancellation + Upcoming ── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Cancellation by month */}
          <div className="bg-card rounded-2xl border border-border p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4" style={{ color: C_CANCEL }} />
                <h2 className="text-sm font-bold text-foreground">การยกเลิกรายเดือน</h2>
              </div>
              {global.cancelledPeriods > 0 && (
                <div className="text-right">
                  <p className="text-[11px] font-semibold" style={{ color: C_CANCEL }}>{global.cancelledPeriods} Periods</p>
                  <p className="text-[10px] text-muted-foreground">{fmtMB(global.cancelledValue)}</p>
                </div>
              )}
            </div>
            {cancelByMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={cancelByMonth} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis yAxisId="left"  orientation="left"  dataKey="count" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} width={28} />
                  <YAxis yAxisId="right" orientation="right" dataKey="value" tickFormatter={fmtM} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} width={44} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                  <Bar yAxisId="left"  dataKey="count" name="Period ยกเลิก" fill={`${C_CANCEL}40`} radius={[4,4,0,0]} />
                  <Bar yAxisId="right" dataKey="value" name="มูลค่าที่หาย"  fill={C_CANCEL}       radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[180px] flex flex-col items-center justify-center gap-2">
                <CheckCircle2 className="w-8 h-8" style={{ color: `${C_AVAIL}50` }} />
                <p className="text-sm text-muted-foreground">ไม่มี Period ที่ยกเลิก</p>
              </div>
            )}
          </div>

          {/* Upcoming 90 days */}
          <div className="bg-card rounded-2xl border border-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <CalendarDays className="w-4 h-4" style={{ color: C_DOM }} />
              <h2 className="text-sm font-bold text-foreground">Upcoming Periods (90 วัน)</h2>
              <span className="ml-auto text-[10px] text-muted-foreground">{upcoming.length} รายการ</span>
            </div>
            <div className="space-y-1.5 overflow-y-auto max-h-[220px] pr-1">
              {upcoming.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">ไม่มี Period ใน 90 วันข้างหน้า</p>
              ) : upcoming.map((u, i) => {
                const pct = u.seats > 0 ? Math.round(((u.seats - u.quota) / u.seats) * 100) : 0;
                const d   = new Date(u.start);
                const daysAway = Math.round((d.getTime() - Date.now()) / 86400000);
                const color = u.category === "International Tour" ? C_INTL : u.category === "Domestic" ? C_DOM : C_INC;
                const isUrgent = u.quota > 0 && u.quota <= 5;
                const isFull   = u.quota === 0;
                return (
                  <div key={i} className={`flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 transition-colors ${isFull ? "opacity-60" : ""}`}>
                    <div className="text-center min-w-[36px]">
                      <p className="text-[10px] text-muted-foreground leading-none">{MONTH_TH[d.getMonth()]}</p>
                      <p className="text-base font-bold text-foreground leading-tight">{d.getDate()}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-[11px] font-semibold text-foreground truncate">{u.tourCode}</p>
                        {isFull   && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold shrink-0" style={{ background: `${C_CANCEL}25`, color: C_CANCEL }}>FULL</span>}
                        {isUrgent && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold shrink-0" style={{ background: `${C_DOM}25`, color: C_DOM }}>เหลือ {u.quota}</span>}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">{u.airline} · ว่าง {u.quota}/{u.seats} ที่นั่ง</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] font-bold" style={{ color }}>{pct}%</span>
                      <span className="text-[9px] text-muted-foreground/60">{daysAway}d</span>
                    </div>
                    <div className="w-1.5 h-8 rounded-full shrink-0" style={{ background: `${color}20` }}>
                      <div className="w-full rounded-full transition-all" style={{ height: `${pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="text-center py-4">
          <p className="text-[11px] text-muted-foreground/50">
            Standard Tour CRM · Stock Dashboard · ข้อมูลอ้างอิงจาก Periods ที่บันทึกในระบบ
          </p>
        </div>
      </div>
    </div>
  );
}
