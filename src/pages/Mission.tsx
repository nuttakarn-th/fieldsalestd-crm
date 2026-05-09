import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, MapPin, Play, CheckCircle2, Clock, Timer, UserPlus, Flag, ChevronRight, Camera, X, Loader2, Locate } from "lucide-react";
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
  const customers = useCRM((s) => s.customers);
  const startStop = useCRM((s) => s.startStop);
  const completeStop = useCRM((s) => s.completeStop);

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
      const result = await compressImage(file, { maxWidth: 1500, maxSizeKB: 500 });
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

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <h1 className="text-xl font-bold">{route.title}</h1>
            <p className="text-xs text-muted-foreground">{route.date} · {route.rep} · {sortedStops.length} จุด · เสร็จ {completed}</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => setNewCustOpen(true)}>
          <UserPlus className="w-4 h-4 mr-2" /> เพิ่มลูกค้าใหม่
        </Button>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-gradient-pink transition-all"
          style={{ width: `${sortedStops.length ? (completed / sortedStops.length) * 100 : 0}%` }}
        />
      </div>

      <ol className="space-y-3">
        {sortedStops.map((s) => {
          const customer = s.customer_id ? customers.find((c) => c.customer_id === s.customer_id) : null;
          const isActive = s.status === "in_progress";
          const elapsed = isActive && s.started_at ? now - new Date(s.started_at).getTime() : 0;
          return (
            <li key={s.stop_id} className={`bg-card rounded-xl border shadow-soft overflow-hidden ${isActive ? "ring-2 ring-primary/40" : ""}`}>
              <div className="p-4 flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full font-bold flex items-center justify-center shrink-0 ${
                  s.status === "completed" ? "bg-success/15 text-success" :
                  isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {s.status === "completed" ? <CheckCircle2 className="w-5 h-5" /> : s.seq}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold">{s.place_name}</p>
                    <Badge variant="outline" className="text-[10px]">{s.purpose}</Badge>
                    {s.status === "completed" && <Badge className="bg-success/15 text-success border-success/30 text-[10px]">เสร็จ · {s.duration_min}m</Badge>}
                    {isActive && <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px]">กำลังทำ</Badge>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{s.planned_time}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{s.address}</span>
                    {customer && <span>· ลูกค้า: <b>{customer.full_name}</b></span>}
                  </div>
                  {s.note && (
                    <p className="text-xs text-muted-foreground mt-1.5 bg-muted/40 rounded px-2 py-1 whitespace-pre-wrap">📝 {s.note}</p>
                  )}
                  {isActive && (
                    <div className="mt-3 flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <Timer className="w-5 h-5 text-primary" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">เวลาที่ใช้</p>
                        <p className="text-2xl font-bold tabular-nums text-primary">{fmtDuration(elapsed)}</p>
                      </div>
                      <Button onClick={() => { setCompleteOpen(s); setCompleteNote(s.note ?? ""); setFieldPhoto(null); setPhotoPreview(null); setGps(null); }} className="bg-success text-success-foreground hover:opacity-90">
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Complete
                      </Button>
                    </div>
                  )}
                  {s.status === "planned" && (
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" onClick={() => handleStart(s)} className="bg-gradient-primary text-primary-foreground">
                        <Play className="w-4 h-4 mr-1" /> Check-in / เริ่ม
                      </Button>
                    </div>
                  )}
                  {s.status === "completed" && s.note && (
                    <p className="text-xs text-muted-foreground mt-2 italic">"{s.note}"</p>
                  )}
                  {s.status === "completed" && s.field_photo_name && (
                    <p className="text-xs text-primary mt-2 flex items-center gap-1"><Camera className="w-3 h-3" /> รูปหน้างาน: {s.field_photo_name}</p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
        {sortedStops.length === 0 && (
          <li className="rounded-xl border border-dashed p-10 text-center bg-card">
            <p className="text-sm text-muted-foreground">ยังไม่มีจุดเยี่ยมใน Route นี้</p>
            <Link to="/app/planning"><Button variant="outline" className="mt-3">ไปเพิ่มจุดที่ Planning</Button></Link>
          </li>
        )}
      </ol>

      {allDone && (
        <div className="rounded-xl bg-gradient-to-r from-success/15 to-primary/10 border border-success/30 p-5 flex items-center gap-3">
          <Flag className="w-6 h-6 text-success" />
          <div className="flex-1">
            <p className="font-bold text-success">Route Complete!</p>
            <p className="text-sm text-muted-foreground">คุณทำครบทุกจุดในเส้นทางนี้แล้ว</p>
          </div>
          <Link to="/app/planning"><Button className="bg-gradient-primary text-primary-foreground">ไปวางแผนถัดไป <ChevronRight className="w-4 h-4 ml-1" /></Button></Link>
        </div>
      )}

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