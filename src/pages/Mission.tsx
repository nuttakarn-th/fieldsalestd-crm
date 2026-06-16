import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, MapPin, Play, CheckCircle2, Clock, Timer, UserPlus, Flag, ChevronRight, Camera, X, Loader2, Locate, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VoiceTextarea } from "@/components/VoiceTextarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useCRM, type RouteStop } from "@/store/crmStore";
import { CustomerLeadDialog } from "@/components/CustomerLeadDialog";
import { toast } from "sonner";
import { compressImage, getCurrentPosition, type GeoPoint } from "@/lib/imageCompression";

function fmtDuration(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function Mission() {
  const { routeId } = useParams<{ routeId: string }>();
  const navigate = useNavigate();
  const route = useCRM((s) => s.routes.find((r) => r.route_id === routeId));
  const startStop = useCRM((s) => s.startStop);
  const cancelStop = useCRM((s) => s.cancelStop);
  const completeStop = useCRM((s) => s.completeStop);
  const skipStop = useCRM((s) => s.skipStop);
  const loadRouteFromSupabase = useCRM((s) => s.loadRouteFromSupabase);

  const [activeStopId, setActiveStopId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [completeOpen, setCompleteOpen] = useState<RouteStop | null>(null);
  const [completeNote, setCompleteNote] = useState("");
  const [fieldPhoto, setFieldPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoSize, setPhotoSize] = useState<number>(0);
  const [compressing, setCompressing] = useState(false);
  const [gps, setGps] = useState<GeoPoint | null>(null);
  const [locating, setLocating] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [newCustOpen, setNewCustOpen] = useState(false);
  const [skipTarget, setSkipTarget] = useState<RouteStop | null>(null);
  const [skipDate, setSkipDate] = useState("");

  // วันพรุ่งนี้ (YYYY-MM-DD) — ขั้นต่ำของ skip date
  function tomorrowYMD() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  // โหลดข้อมูล route ล่าสุดจาก Supabase ทุกครั้งที่เปิดหน้า Mission
  // ป้องกัน: หน้าค้าง / Complete ไม่ได้ เพราะ local state เก่า
  useEffect(() => {
    if (routeId) loadRouteFromSupabase(routeId);
  }, [routeId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const sortedStops = useMemo(() => route?.stops.slice().sort((a, b) => a.seq - b.seq) ?? [], [route]);
  const completed = sortedStops.filter((s) => s.status === "completed").length;
  const allDone = sortedStops.length > 0 && completed === sortedStops.length;

  if (!route) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">ไม่พบ Route นี้</p>
          <Link to="/app/planning"><Button variant="outline" className="mt-3"><ArrowLeft className="w-4 h-4 mr-2" /> กลับหน้า Planning</Button></Link>
      </div>
    );
  }

  const handleStart = (stop: RouteStop) => {
    startStop(route.route_id, stop.stop_id);
    setActiveStopId(stop.stop_id);
    toast.success(`เริ่ม Mission: ${stop.place_name}`);
  };

  const handlePhotoPick = async (file: File | null) => {
    if (!file) { setFieldPhoto(null); setPhotoPreview(null); setPhotoSize(0); return; }
    setCompressing(true);
    try {
      const result = await compressImage(file, { maxWidth: 700, maxSizeKB: 200 });
      setFieldPhoto(result.file);
      setPhotoPreview(result.dataUrl);
      setPhotoSize(result.sizeKB);
      toast.success(`บีบอัดรูปแล้ว ${result.width}x${result.height}px · ${result.sizeKB}KB`);
    } catch (e) {
      toast.error("ไม่สามารถประมวลผลรูปได้");
    } finally {
      setCompressing(false);
    }
  };

  const captureGPS = async () => {
    setLocating(true);
    try {
      const p = await getCurrentPosition();
      setGps(p);
      toast.success(`ปักพิกัด GPS แล้ว (±${Math.round(p.accuracy ?? 0)}m)`);
    } catch {
      toast.error("ไม่สามารถอ่านพิกัด GPS ได้");
    } finally {
      setLocating(false);
    }
  };

  const handleComplete = () => {
    if (!completeOpen) return;
    completeStop(
      route.route_id, completeOpen.stop_id,
      completeNote, fieldPhoto?.name, photoPreview ?? undefined,
      gps?.lat, gps?.lng,
    );
    toast.success(`เสร็จสิ้น: ${completeOpen.place_name}`);
    setCompleteOpen(null);
    setCompleteNote("");
    setFieldPhoto(null);
    setPhotoPreview(null);
    setPhotoSize(0);
    setGps(null);
    setActiveStopId(null);
  };

  // active stop for right panel
  const activeStop = sortedStops.find((s) => s.status === "in_progress") ?? null;
  const activeElapsed = activeStop?.started_at ? now - new Date(activeStop.started_at).getTime() : 0;
  const nextStop = sortedStops.find((s) => s.status === "planned") ?? null;
  const completedStops = sortedStops.filter((s) => s.status === "completed");

  return (
    <div className="p-4 sm:p-5 space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold leading-snug">{route.title}</h1>
            <p className="text-xs text-muted-foreground">{route.date} · {route.rep} · {sortedStops.length} จุด · เสร็จ {completed}/{sortedStops.length}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setNewCustOpen(true)}>
          <UserPlus className="w-4 h-4" />
          <span className="hidden sm:inline ml-2">เพิ่มลูกค้าใหม่</span>
        </Button>
      </div>

      {/* ── Progress bar ── */}
      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-gradient-pink transition-all" style={{ width: `${sortedStops.length ? (completed / sortedStops.length) * 100 : 0}%` }} />
      </div>

      {/* ── DESKTOP: 2-panel │ MOBILE: single column ── */}
      <div className="flex flex-col md:flex-row gap-4 md:items-start">

        {/* ════ LEFT: Stop list (compact rows) — mobile: ลงไปอยู่ด้านล่าง ════ */}
        <div className="w-full md:w-[420px] lg:w-[460px] shrink-0 md:sticky md:top-4 order-2 md:order-1">
          <div className="bg-card rounded-xl border shadow-soft overflow-hidden">
            {/* section header */}
            <div className="px-4 py-2.5 border-b bg-muted/30 flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">จุดทั้งหมด</span>
              <span className="text-xs text-muted-foreground">{completed}/{sortedStops.length} เสร็จ</span>
            </div>

            {sortedStops.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-muted-foreground">ยังไม่มีจุดเยี่ยมใน Route นี้</p>
                <Link to="/app/planning"><Button variant="outline" size="sm" className="mt-3">ไปเพิ่มจุดที่ Planning</Button></Link>
              </div>
            ) : (
              <ol className="divide-y">
                {sortedStops.map((s) => {
                  const isActive = s.status === "in_progress";
                  const isDone = s.status === "completed";
                  return (
                    <li key={s.stop_id} className={[
                      "flex items-center gap-3 px-3 py-2.5 transition-colors",
                      isActive ? "bg-primary/5 border-l-[3px] border-l-primary" : "",
                      isDone ? "bg-success/4 opacity-75" : "",
                      !isActive && !isDone ? "hover:bg-muted/30" : "",
                    ].join(" ")}>
                      {/* seq / status badge */}
                      <div className={`w-8 h-8 rounded-full font-bold flex items-center justify-center shrink-0 text-sm ${
                        isDone ? "bg-success/15 text-success" :
                        isActive ? "bg-primary text-primary-foreground shadow-glow" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {isDone ? <CheckCircle2 className="w-4 h-4" /> : s.seq}
                      </div>
                      {/* info */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${isDone ? "text-success/80" : ""}`}>{s.place_name}</p>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{s.planned_time}</span>
                          {s.address && <span className="truncate max-w-[140px]">· {s.address}</span>}
                        </div>
                      </div>
                      {/* action */}
                      <div className="shrink-0">
                        {isActive && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px]">
                              <Timer className="w-2.5 h-2.5 mr-1" />{fmtDuration(activeElapsed)}
                            </Badge>
                            <Button
                              size="sm"
                              className="h-7 text-xs px-2.5 bg-success text-success-foreground"
                              onClick={() => { setCompleteOpen(s); setCompleteNote(s.note ?? ""); setFieldPhoto(null); setPhotoPreview(null); setGps(null); }}
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Complete
                            </Button>
                          </div>
                        )}
                        {isDone && s.completed_at && (
                          <span className="text-[10px] text-success font-medium">
                            {new Date(s.completed_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false })} น.
                          </span>
                        )}
                        {s.status === "planned" && (
                          <div className="flex items-center gap-1 shrink-0">
                            <Button size="sm" className="h-7 text-xs px-2.5 bg-gradient-primary text-primary-foreground" onClick={() => handleStart(s)}>
                              <Play className="w-3 h-3 mr-1" /> เริ่ม
                            </Button>
                            <Button
                              size="sm" variant="outline"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-amber-600 hover:border-amber-400"
                              title="เลื่อนไปวันอื่น"
                              onClick={() => { setSkipTarget(s); setSkipDate(tomorrowYMD()); }}
                            >
                              <SkipForward className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>

        {/* ════ RIGHT: Detail panel ════ */}
        {/* ════ RIGHT: Detail panel — mobile: ขึ้นมาอยู่บนสุด ════ */}
        <div className="w-full flex-1 min-w-0 space-y-4 overflow-hidden order-1 md:order-2">

          {/* ① Progress stats — บนสุดเสมอ */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card rounded-xl border p-3 text-center">
              <p className="text-2xl font-bold text-primary">{sortedStops.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">จุดทั้งหมด</p>
            </div>
            <div className="bg-card rounded-xl border p-3 text-center">
              <p className="text-2xl font-bold text-success">{completed}</p>
              <p className="text-xs text-muted-foreground mt-0.5">เสร็จแล้ว</p>
            </div>
            <div className="bg-card rounded-xl border p-3 text-center">
              <p className="text-2xl font-bold text-muted-foreground">{sortedStops.length - completed}</p>
              <p className="text-xs text-muted-foreground mt-0.5">คงเหลือ</p>
            </div>
          </div>

          {/* ② Next stop หรือ Active stop — อยู่ใต้ stats ทันที */}
          {!activeStop && nextStop && !allDone && (
            <div className="bg-card rounded-xl border shadow-soft p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">จุดถัดไป</p>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-bold shrink-0">
                  {nextStop.seq}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{nextStop.place_name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                    <span className="flex items-center gap-1 shrink-0"><Clock className="w-3 h-3" />{nextStop.planned_time}</span>
                    {nextStop.address && <span className="flex items-center gap-1 truncate max-w-[160px]"><MapPin className="w-3 h-3 shrink-0" />{nextStop.address}</span>}
                  </div>
                  {nextStop.note && <p className="text-xs text-muted-foreground mt-1 truncate">📝 {nextStop.note}</p>}
                </div>
                <Button onClick={() => handleStart(nextStop)} className="bg-gradient-primary text-primary-foreground shrink-0 h-9 px-3 text-sm">
                  <Play className="w-3.5 h-3.5 mr-1.5" /> เริ่ม
                </Button>
              </div>
            </div>
          )}

          {activeStop && (
            <div className="bg-card rounded-xl border-2 border-primary/30 shadow-soft p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">
                    {activeStop.seq}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-base truncate">{activeStop.place_name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                      <span className="flex items-center gap-1 shrink-0"><Clock className="w-3 h-3" />{activeStop.planned_time}</span>
                      {activeStop.address && <span className="flex items-center gap-1 truncate max-w-[160px]"><MapPin className="w-3 h-3 shrink-0" />{activeStop.address}</span>}
                    </div>
                  </div>
                </div>
                <Badge className="bg-primary/15 text-primary border-primary/30 text-xs shrink-0">กำลังทำ</Badge>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-primary/5 border border-primary/15">
                <Timer className="w-6 h-6 text-primary shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">เวลาที่ใช้</p>
                  <p className="text-4xl font-bold tabular-nums text-primary tracking-tight">{fmtDuration(activeElapsed)}</p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <Button
                    className="bg-success text-success-foreground hover:opacity-90 h-10 px-5"
                    onClick={() => { setCompleteOpen(activeStop); setCompleteNote(activeStop.note ?? ""); setFieldPhoto(null); setPhotoPreview(null); setGps(null); }}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Complete
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 px-3 text-xs bg-destructive hover:bg-destructive/90 text-white"
                    onClick={() => {
                      cancelStop(route.route_id, activeStop.stop_id);
                      setActiveStopId(null);
                      toast.info("ยกเลิก Mission แล้ว — กลับสู่สถานะรอดำเนินการ");
                    }}
                  >
                    <X className="w-3 h-3 mr-1" /> ยกเลิก
                  </Button>
                </div>
              </div>
              {activeStop.note && <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">📝 {activeStop.note}</p>}
            </div>
          )}

          {/* ③ Completed stops with notes / photos */}
          {completedStops.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">บันทึกผลการเยี่ยม</p>
              {completedStops.map((s) => (
                <div key={s.stop_id} className="bg-card rounded-xl border shadow-soft p-3">
                  <div className="flex items-start gap-3">
                    {/* ✓ icon */}
                    <div className="w-8 h-8 rounded-full bg-success/15 text-success flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    {/* text info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-success/80 truncate">{s.place_name}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <Badge className="bg-success/15 text-success border-success/30 text-[10px]">เสร็จ · {s.duration_min}m</Badge>
                        {s.completed_at && (
                          <span className="text-[10px] text-success font-medium">
                            {new Date(s.completed_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false })} น.
                          </span>
                        )}
                      </div>
                      {s.note && <p className="text-xs text-muted-foreground mt-1 italic line-clamp-2">"{s.note}"</p>}
                    </div>
                    {/* thumbnail เล็กๆ ด้านขวา */}
                    {s.field_photo_url && (
                      <img
                        src={s.field_photo_url}
                        alt="รูปหน้างาน"
                        className="w-16 h-12 object-cover rounded-lg shrink-0 border border-success/20"
                        loading="lazy"
                      />
                    )}
                    {!s.field_photo_url && s.field_photo_name && (
                      <div className="w-16 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0 border">
                        <Camera className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Route complete banner */}
          {allDone && (
            <div className="rounded-xl bg-gradient-to-r from-success/15 to-primary/10 border border-success/30 p-5 flex items-center gap-3">
              <Flag className="w-6 h-6 text-success shrink-0" />
              <div className="flex-1">
                <p className="font-bold text-success">Route Complete!</p>
                <p className="text-sm text-muted-foreground">คุณทำครบทุกจุดในเส้นทางนี้แล้ว</p>
              </div>
              <Link to="/app/planning"><Button className="bg-gradient-primary text-primary-foreground shrink-0">ไปวางแผนถัดไป <ChevronRight className="w-4 h-4 ml-1" /></Button></Link>
            </div>
          )}

        </div>{/* end right panel */}
      </div>{/* end 2-panel flex */}

      {/* ── Skip Dialog ── */}
      <Dialog open={!!skipTarget} onOpenChange={(o) => !o && setSkipTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SkipForward className="w-4 h-4 text-amber-500" /> เลื่อนจุดนี้ไปวันอื่น
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <p className="text-sm text-muted-foreground">
              <b className="text-foreground">{skipTarget?.place_name}</b> จะถูกย้ายไปยังแผนของวันที่เลือก (status รีเซ็ตเป็น "รอดำเนินการ")
            </p>
            <div>
              <Label className="text-sm font-medium">วันที่ต้องการเลื่อนไป *</Label>
              <Input
                type="date"
                value={skipDate}
                min={tomorrowYMD()}
                onChange={(e) => setSkipDate(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSkipTarget(null)}>ยกเลิก</Button>
            <Button
              disabled={!skipDate}
              onClick={() => {
                if (!skipTarget || !skipDate) return;
                skipStop(route.route_id, skipTarget.stop_id, skipDate);
                toast.success(`เลื่อน "${skipTarget.place_name}" ไปวัน ${skipDate} แล้ว`);
                setSkipTarget(null);
              }}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              <SkipForward className="w-4 h-4 mr-2" /> เลื่อนวัน
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Complete Dialog ── */}
      <Dialog open={!!completeOpen} onOpenChange={(o) => !o && setCompleteOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Complete: {completeOpen?.place_name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">บันทึกผลการเยี่ยมก่อนปิดงานนี้</p>
            <VoiceTextarea rows={4} placeholder="สรุปการพูดคุย / ความสนใจของลูกค้า / Next step..."
              value={completeNote} onChange={(e) => setCompleteNote(e.target.value)} />
            <div className="space-y-2">
              <Label className="text-sm font-semibold">ภาพถ่ายหน้างาน (จะถูกบีบอัด ≤500KB / กว้างสุด 1500px)</Label>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handlePhotoPick(e.target.files?.[0] ?? null)} />
              <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoPick(e.target.files?.[0] ?? null)} />
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => cameraRef.current?.click()} disabled={compressing}>
                  {compressing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Camera className="w-4 h-4 mr-2" />} ถ่ายภาพ
                </Button>
                <Button type="button" variant="outline" className="flex-1" onClick={() => galleryRef.current?.click()} disabled={compressing}>อัปโหลดจากเครื่อง</Button>
              </div>
              {photoPreview && (
                <div className="rounded-xl border bg-muted/30 p-2 space-y-2">
                  <img src={photoPreview} alt="ตัวอย่างรูปหน้างาน" className="w-full max-h-56 object-cover rounded-lg" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{fieldPhoto?.name} · {photoSize}KB</span>
                    <Button type="button" variant="ghost" size="icon" onClick={() => handlePhotoPick(null)}><X className="w-4 h-4" /></Button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">พิกัด GPS หน้างาน</Label>
              <div className="flex gap-2 items-center">
                <Button type="button" variant="outline" onClick={captureGPS} disabled={locating}>
                  {locating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Locate className="w-4 h-4 mr-2" />} ปักพิกัดปัจจุบัน
                </Button>
                {gps && (
                  <span className="text-xs text-success font-medium">{gps.lat.toFixed(5)}, {gps.lng.toFixed(5)} (±{Math.round(gps.accuracy ?? 0)}m)</span>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setCompleteOpen(null); setNewCustOpen(true); }}>
              <UserPlus className="w-4 h-4 mr-2" /> + ลูกค้าใหม่ก่อนปิด
            </Button>
            <Button onClick={handleComplete} className="bg-success text-success-foreground">ปิดงานจุดนี้</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CustomerLeadDialog open={newCustOpen} onOpenChange={setNewCustOpen} />
    </div>
  );
}
