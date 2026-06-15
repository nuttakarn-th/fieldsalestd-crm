import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VoiceTextarea } from "@/components/VoiceTextarea";
import { TimeInput24, nowHHMM } from "@/components/TimeInput24";
import { useCRM } from "@/store/crmStore";
import { toast } from "sonner";

function ymdToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const ACTIVITY_GROUPS: { group: string; items: string[] }[] = [
  { group: "Sales", items: ["Field Sale (New Prospect)", "Follow-up Visit"] },
  { group: "Operational", items: ["Site Survey", "Partner Meeting", "On-site Training"] },
  { group: "Admin/Marketing", items: ["Office Day", "Event", "Seminar", "Government Contact"] },
  { group: "Relationship", items: ["After Sales", "Gift Delivery", "Dinner Meeting"] },
  { group: "Support", items: ["Coffee Shop (Remote Work)", "Transit", "Hotel"] },
  { group: "อื่นๆ", items: ["พบลูกค้า", "นำเสนอแพ็คเกจ", "ปิดการขาย", "Follow up", "อื่นๆ"] },
];
export const PURPOSES = ACTIVITY_GROUPS.flatMap((g) => g.items);

interface Props {
  open: boolean;
  onClose: () => void;
  // Either provide an existing routeId, or a date to auto-create a route on submit
  routeId?: string;
  autoCreateForDate?: string; // YYYY-MM-DD
  rep?: string; // Sales rep when auto-creating
  title?: string;
}

export function StopDialog({ open, onClose, routeId, autoCreateForDate, rep, title = "เพิ่มจุดเยี่ยม" }: Props) {
  // narrow selector: ดึงแค่ field ที่ใช้ใน dropdown — ลด re-render เมื่อ note/tier/spend เปลี่ยน
  type CustOpt = { customer_id: string; full_name: string; company: string };
  const eqCustOpts = (a: CustOpt[], b: CustOpt[]) =>
    a.length === b.length && a.every((x, i) => x.customer_id === b[i].customer_id && x.full_name === b[i].full_name);
  const customers = useCRM(
    (s) => s.customers.map((c): CustOpt => ({ customer_id: c.customer_id, full_name: c.full_name, company: c.company })),
    eqCustOpts,
  );
  const addStop = useCRM((s) => s.addStop);
  const addRoute = useCRM((s) => s.addRoute);

  const [purpose, setPurpose] = useState(PURPOSES[0]);
  const [time, setTime] = useState("09:00");
  const [place, setPlace] = useState("");
  const [address, setAddress] = useState("");
  const [customerId, setCustomerId] = useState("none");
  const [note, setNote] = useState("");

  const isToday = autoCreateForDate === ymdToday();
  const minTime = isToday ? nowHHMM() : undefined;

  useEffect(() => {
    if (open) {
      const defaultTime = isToday ? nowHHMM() : "09:00";
      setPurpose(PURPOSES[0]); setTime(defaultTime); setPlace(""); setAddress(""); setCustomerId("none"); setNote("");
    }
  }, [open, isToday]);

  const isOffice = purpose === "Office Day";

  const submit = () => {
    if (!isOffice && !place.trim()) return toast.error("กรุณาใส่ชื่อสถานที่");
    let rid = routeId;
    if (!rid && autoCreateForDate && rep) {
      rid = addRoute(rep as never, autoCreateForDate, `แผนเยี่ยมลูกค้า ${autoCreateForDate}`);
    }
    if (!rid) return;
    addStop(rid, {
      place_name: isOffice ? "Office Day" : place,
      address: isOffice ? "" : address,
      purpose,
      planned_time: time,
      customer_id: !isOffice && customerId !== "none" ? customerId : undefined,
      note,
    });
    toast.success("เพิ่มจุดเยี่ยมแล้ว");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>วัตถุประสงค์ *</Label>
              <Select value={purpose} onValueChange={setPurpose}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {ACTIVITY_GROUPS.map((g) => (
                    <div key={g.group}>
                      <div className="px-2 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{g.group}</div>
                      {g.items.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>เวลานัด</Label>
              <TimeInput24 value={time} onChange={setTime} min={minTime} className="w-full" />
              {isToday && (
                <p className="text-[10px] text-muted-foreground mt-1">⏰ วันนี้ — เลือกได้ตั้งแต่เวลาปัจจุบัน</p>
              )}
            </div>
          </div>
          {!isOffice && (
            <>
              <div><Label>ชื่อสถานที่ / บริษัท *</Label><Input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="เช่น บมจ. พัฒนาดี" /></div>
              <div><Label>ที่อยู่</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} /></div>
              <div>
                <Label>ลูกค้า (ถ้ามี)</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger><SelectValue placeholder="เลือกลูกค้า..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— ไม่ระบุ —</SelectItem>
                    {customers.slice(0, 50).map((c) => (
                      <SelectItem key={c.customer_id} value={c.customer_id}>{c.full_name} {c.company !== "-" && `· ${c.company}`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          <div><Label>โน๊ต</Label><VoiceTextarea rows={2} value={note} onValueChange={setNote} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>ยกเลิก</Button>
          <Button onClick={submit} className="bg-gradient-pink text-accent-foreground">เพิ่มจุด</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
