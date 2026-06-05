import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Camera, CheckCircle2, Clock, Edit3, ImageIcon, MapPin, Route as RouteIcon, Save, X, Map as MapIcon, CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VoiceTextarea } from "@/components/VoiceTextarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DateRangeFilter, resolveRange, inRange, type RangePreset } from "@/components/DateRangeFilter";
import { useCRM, type RouteStop } from "@/store/crmStore";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

function fmtTime(iso?: string) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short", hour12: false });
}

interface CompletedItem extends RouteStop {
  routeTitle: string;
  routeDate: string;
  routeRep: string;
}

export default function CompletedRoute() {
  const { routeId } = useParams<{ routeId: string }>();
  const navigate = useNavigate();
  const routes = useCRM((s) => s.routes);
  const updateStop = useCRM((s) => s.updateStop);
  const route = routes.find((r) => r.route_id === routeId);
  const [preset, setPreset] = useState<RangePreset>("all");
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [editing, setEditing] = useState<CompletedItem | null>(null);
  const [editNote, setEditNote] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportDate, setReportDate] = useState<Date>(new Date());
  const [osrmDistanceKm, setOsrmDistanceKm] = useState<string | null>(null);

  // Listen for real road distance from OSRM (sent via postMessage from Leaflet iframe)
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "osrm_distance") setOsrmDistanceKm(e.data.km);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // Reset OSRM distance whenever report date or stops change
  useEffect(() => { setOsrmDistanceKm(null); }, [reportKey]);

  const range = useMemo(() => resolveRange(preset, customRange), [preset, customRange]);
  const completedItems = useMemo<CompletedItem[]>(() => {
    const sourceRoutes = route ? [route] : routes;
    return sourceRoutes
      .flatMap((r) => r.stops
        .filter((s) => s.status === "completed")
        .map((s) => ({ ...s, routeTitle: r.title, routeDate: r.date, routeRep: r.rep })))
      .filter((s) => inRange(s.completed_at ?? s.routeDate, range))
      .sort((a, b) => new Date(b.completed_at ?? b.routeDate).getTime() - new Date(a.completed_at ?? a.routeDate).getTime());
  }, [route, routes, range]);

  const openEdit = (item: CompletedItem) => {
    setEditing(item);
    setEditNote(item.note ?? "");
  };

  const reportKey = `${reportDate.getFullYear()}-${String(reportDate.getMonth() + 1).padStart(2, "0")}-${String(reportDate.getDate()).padStart(2, "0")}`;
  const reportStops = useMemo(() => {
    const all = (route ? [route] : routes)
      .filter((r) => r.date === reportKey)
      .flatMap((r) => r.stops.filter((s) => s.status === "completed"))
      .sort((a, b) => new Date(a.completed_at ?? 0).getTime() - new Date(b.completed_at ?? 0).getTime());
    return all;
  }, [route, routes, reportKey]);
  const reportPoints = reportStops.filter((s) => typeof s.lat === "number" && typeof s.lng === "number") as (RouteStop & { lat: number; lng: number })[];

  // Haversine distance between two GPS points (km)
  function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  const totalDistanceKm = useMemo(() => {
    if (reportPoints.length < 2) return 0;
    let sum = 0;
    for (let i = 0; i < reportPoints.length - 1; i++) {
      sum += haversineKm(reportPoints[i].lat, reportPoints[i].lng, reportPoints[i + 1].lat, reportPoints[i + 1].lng);
    }
    return sum;
  }, [reportPoints]);

  const leafletMapSrcdoc = useMemo(() => {
    if (reportPoints.length === 0) return "";
    const pointsJson = JSON.stringify(reportPoints.map((p, i) => ({
      lat: p.lat,
      lng: p.lng,
      name: p.place_name,
      time: p.completed_at ? new Date(p.completed_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false }) : "-",
      seq: i + 1,
    })));
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script><style>html,body,#map{margin:0;padding:0;width:100%;height:100%;overflow:hidden;}</style></head><body><div id="map"></div><script>
const pts=${pointsJson};
const map=L.map('map',{zoomControl:true});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© OpenStreetMap'}).addTo(map);
const latlngs=pts.map(p=>[p.lat,p.lng]);

// Add numbered markers
pts.forEach((p,i)=>{
  const isFirst=i===0,isLast=i===pts.length-1;
  const bg=isFirst?'#22c55e':isLast?'#ef4444':'#6366f1';
  const icon=L.divIcon({html:'<div style="background:'+bg+';color:#fff;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.4);line-height:1">'+p.seq+'</div>',iconSize:[30,30],iconAnchor:[15,15],className:''});
  L.marker([p.lat,p.lng],{icon}).bindPopup('<b>'+p.seq+'. '+p.name+'</b><br>'+p.time).addTo(map);
});
if(latlngs.length>0){map.fitBounds(latlngs,{padding:[25,25]});}

// Draw actual road route via OSRM (free, no API key)
if(pts.length>1){
  const osrmCoords=pts.map(p=>p.lng+','+p.lat).join(';');
  const osrmUrl='https://router.project-osrm.org/route/v1/driving/'+osrmCoords+'?overview=full&geometries=geojson';
  fetch(osrmUrl)
    .then(r=>r.json())
    .then(data=>{
      if(data.routes&&data.routes[0]){
        const roadLine=L.geoJSON(data.routes[0].geometry,{style:{color:'#6366f1',weight:5,opacity:0.85}}).addTo(map);
        // Re-fit to road bounds
        map.fitBounds(roadLine.getBounds(),{padding:[25,25]});
        // Send actual road distance back to parent
        const distKm=(data.routes[0].distance/1000).toFixed(1);
        window.parent.postMessage({type:'osrm_distance',km:distKm},'*');
      } else {
        L.polyline(latlngs,{color:'#6366f1',weight:4,opacity:0.6,dashArray:'8,5'}).addTo(map);
      }
    })
    .catch(()=>{
      L.polyline(latlngs,{color:'#6366f1',weight:4,opacity:0.6,dashArray:'8,5'}).addTo(map);
    });
}
<\/script></body></html>`;
  }, [reportPoints]);

  const saveEdit = () => {
    if (!editing) return;
    updateStop(editing.route_id, editing.stop_id, { note: editNote });
    toast.success("อัปเดตรายละเอียด Route แล้ว");
    setEditing(null);
    setEditNote("");
  };

  if (routeId && !route) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">ไม่พบข้อมูล Route นี้</p>
        <Button variant="outline" className="mt-3" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4 mr-2" /> กลับ</Button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold truncate">ข้อมูล Route</h1>
            <p className="text-sm text-muted-foreground">{route ? `${route.title} · ${route.rep}` : "รายการ Route ที่ Complete ทั้งหมด"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DateRangeFilter value={preset} custom={customRange} onChange={(p, c) => { setPreset(p); setCustomRange(c); }} />
          <Button variant="outline" className="border-primary/40 text-primary hover:bg-primary/10" onClick={() => setReportOpen(true)}>
            <MapIcon className="w-4 h-4 mr-2" /> Route Report
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-soft p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><RouteIcon className="w-5 h-5" /></div>
          <div>
            <p className="font-bold">รายการ Mission ที่เสร็จสิ้น</p>
            <p className="text-sm text-muted-foreground">ช่วงเวลา: {range.label}</p>
          </div>
        </div>
        <Badge className="bg-success/15 text-success border-success/30"><CheckCircle2 className="w-3 h-3 mr-1" /> {completedItems.length} รายการ</Badge>
      </div>

      <section className="space-y-3">
        {completedItems.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center bg-card text-muted-foreground">ไม่มี Route ที่ Complete ในช่วงเวลานี้</div>
        ) : completedItems.map((s) => (
          <article key={`${s.route_id}-${s.stop_id}`} className="rounded-xl border bg-card shadow-soft overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr]">
              <div className="h-48 md:h-full min-h-48 bg-muted/60">
                {s.field_photo_url ? (
                  <img src={s.field_photo_url} alt={`รูปประกอบ ${s.place_name}`} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-gradient-to-br from-muted to-muted/40">
                    <ImageIcon className="w-10 h-10 mb-2" />
                    <span className="text-sm font-medium">ไม่มีรูปประกอบ</span>
                  </div>
                )}
              </div>
              <div className="p-4 space-y-3 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-bold text-lg truncate">{s.place_name}</h2>
                      <Badge variant="outline">{s.purpose}</Badge>
                      <Badge variant="outline">{s.routeRep}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="w-4 h-4 shrink-0" />{s.address || "-"}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => openEdit(s)}>
                    <Edit3 className="w-4 h-4 mr-1" /> แก้ไขข้อมูล
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> อัปเดต {fmtTime(s.completed_at)}</span>
                  <span>ใช้เวลา {s.duration_min ?? 0} นาที</span>
                  {s.field_photo_name && <span className="flex items-center gap-1"><Camera className="w-4 h-4" /> {s.field_photo_name}</span>}
                </div>
                <div className="rounded-lg border bg-background p-3">
                  <p className="text-xs text-muted-foreground mb-1">รายละเอียด</p>
                  <p className="text-sm whitespace-pre-wrap">{s.note || "ไม่มีรายละเอียดเพิ่มเติม"}</p>
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>แก้ไขข้อมูล Route</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <p className="text-sm font-semibold">{editing?.place_name}</p>
            <VoiceTextarea rows={5} value={editNote} onChange={(e) => setEditNote(e.target.value)} placeholder="รายละเอียดที่ต้องการบันทึก..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}><X className="w-4 h-4 mr-2" />ยกเลิก</Button>
            <Button onClick={saveEdit} className="bg-gradient-primary text-primary-foreground"><Save className="w-4 h-4 mr-2" />บันทึก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><MapIcon className="w-5 h-5 text-primary" /> Route Report — เส้นทางที่ไปแต่ละวัน</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-56 justify-start", !reportDate && "text-muted-foreground")}>
                    <CalendarIcon className="w-4 h-4 mr-2" />{format(reportDate, "EEE d MMM yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={reportDate} onSelect={(d) => d && setReportDate(d)} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
              <Badge variant="outline">{reportPoints.length} จุดมีพิกัด · ทั้งหมด {reportStops.length} จุด</Badge>
              {reportPoints.length >= 2 && (
                <Badge className="bg-primary/15 text-primary border-primary/30">
                  {osrmDistanceKm
                    ? `ระยะทางถนน ~${osrmDistanceKm} กม.`
                    : `ระยะทางรวม ~${totalDistanceKm < 1 ? `${Math.round(totalDistanceKm * 1000)} ม.` : `${totalDistanceKm.toFixed(1)} กม.`}`}
                </Badge>
              )}
            </div>

            <div className="rounded-xl border overflow-hidden bg-muted/40 aspect-video">
              {leafletMapSrcdoc ? (
                <iframe title="Route Report Map" srcDoc={leafletMapSrcdoc} className="w-full h-full" sandbox="allow-scripts allow-same-origin" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                  <MapIcon className="w-10 h-10 mb-2" />
                  <p className="text-sm">ยังไม่มีพิกัด GPS สำหรับวันนี้ — บันทึก GPS ตอน Mission Complete เพื่อดูเส้นทาง</p>
                </div>
              )}
            </div>

            {reportPoints.length >= 2 && (
              <div className="rounded-lg border bg-primary/5 border-primary/20 px-4 py-3 flex items-center gap-3 text-sm">
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                {osrmDistanceKm ? (
                  <span>ระยะทางตามถนนจากจุดที่ 1 ถึงจุดที่ {reportPoints.length} คือ <b>~{osrmDistanceKm} กิโลเมตร</b></span>
                ) : (
                  <span>ระยะทางรวมโดยประมาณจากจุดที่ 1 ถึงจุดที่ {reportPoints.length} คือ <b>{totalDistanceKm < 1 ? `${Math.round(totalDistanceKm * 1000)} เมตร` : `${totalDistanceKm.toFixed(1)} กิโลเมตร`}</b> <span className="text-muted-foreground">(กำลังโหลดระยะทางถนนจริง…)</span></span>
                )}
              </div>
            )}

            <ol className="space-y-2 max-h-64 overflow-auto pr-1">
              {reportStops.map((s, i) => (
                <li key={s.stop_id} className="flex items-start gap-3 p-2 rounded-lg border bg-background">
                  <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shrink-0">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{s.place_name}</p>
                    <p className="text-xs text-muted-foreground">{s.address || "-"} · {s.completed_at ? new Date(s.completed_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false }) : "-"}</p>
                    {typeof s.lat === "number" && typeof s.lng === "number" ? (
                      <p className="text-[11px] text-success mt-0.5">📍 {s.lat.toFixed(5)}, {s.lng.toFixed(5)}</p>
                    ) : (
                      <p className="text-[11px] text-muted-foreground mt-0.5">ไม่มีพิกัด GPS</p>
                    )}
                    {s.note && <p className="text-[11px] text-muted-foreground mt-1 whitespace-pre-wrap">📝 {s.note}</p>}
                  </div>
                </li>
              ))}
              {reportStops.length === 0 && <li className="text-sm text-muted-foreground text-center py-8">ไม่มี Mission ที่เสร็จในวันนี้</li>}
            </ol>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setReportOpen(false)}>ปิด</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}