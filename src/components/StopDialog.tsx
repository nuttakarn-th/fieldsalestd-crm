import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VoiceTextarea } from "@/components/VoiceTextarea";
import { useCRM } from "@/store/crmStore";
import { toast } from "sonner";

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
  const customers = useCRM((s) => s.customers);
  const addStop = useCRM((s) => s.addStop);
  const addRoute = useCRM((s) => s.addRoute);

  const [purpose, setPurpose] = useState(PURPOSES[0]);
  const [time, setTime] = useState("09:00");
  const [place, setPlace] = useState("");
  const [address, setAddress] = useState("");
  const [customerId, setCustomerId] = useState("none");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      setPurpose(PURPOSES[0]); setTime("09:00"); setPlace(""); setAddress(""); setCustomerId("none"); setNote("");
    }
  }, [open]);

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
            <div><Label>เวลานัด</Label><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
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
