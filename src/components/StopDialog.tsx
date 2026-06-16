import { useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { ChevronDown, Check } from "lucide-react";
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
  // ── Stable selector ──────────────────────────────────────────────────────────
  // Zustand v5 ไม่รองรับ equalityFn เป็น arg ที่ 2 → .map() สร้าง array ใหม่ทุก render → #185
  // แก้: useShallow บน raw array ก่อน แล้วค่อย .map() ผ่าน useMemo
  // ──────────────────────────────────────────────────────────────────────────────
  type CustOpt = { customer_id: string; full_name: string; company: string };
  const rawCustomers = useCRM(useShallow((s) => s.customers));
  const customers = useMemo(
    () => rawCustomers.map((c): CustOpt => ({ customer_id: c.customer_id, full_name: c.full_name, company: c.company })),
    [rawCustomers],
  );
  const addStop = useCRM((s) => s.addStop);
  const addRoute = useCRM((s) => s.addRoute);

  const [purpose, setPurpose] = useState(PURPOSES[0]);
  const [time, setTime] = useState("09:00");
  const [place, setPlace] = useState("");
  const [address, setAddress] = useState("");
  const [customerId, setCustomerId] = useState("none");
  const [note, setNote] = useState("");

  // Customer search combobox
  const [custOpen, setCustOpen] = useState(false);
  const [custSearch, setCustSearch] = useState("");
  const custRef = useRef<HTMLDivElement>(null);

  const isToday = autoCreateForDate === ymdToday();
  const minTime = isToday ? nowHHMM() : undefined;

  useEffect(() => {
    if (open) {
      const defaultTime = isToday ? nowHHMM() : "09:00";
      setPurpose(PURPOSES[0]); setTime(defaultTime); setPlace(""); setAddress("");
      setCustomerId("none"); setNote(""); setCustOpen(false); setCustSearch("");
    }
  }, [open, isToday]);

  // ปิด dropdown เมื่อ click นอก
  useEffect(() => {
    if (!custOpen) return;
    const handler = (e: MouseEvent) => {
      if (custRef.current && !custRef.current.contains(e.target as Node)) {
        setCustOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [custOpen]);

  const filteredCustomers = useMemo(() => {
    const q = custSearch.toLowerCase().trim();
    if (!q) return customers.slice(0, 40);
    return customers.filter(
      (c) => c.full_name.toLowerCase().includes(q) || c.company.toLowerCase().includes(q)
    ).slice(0, 40);
  }, [customers, custSearch]);

  const selectedCustomer = customers.find((c) => c.customer_id === customerId);

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
                <div ref={custRef} className="relative">
                  {/* Trigger */}
                  <button
                    type="button"
                    onClick={() => { setCustOpen((v) => !v); setCustSearch(""); }}
                    className="w-full flex items-center justify-between h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background hover:bg-accent/30 transition-colors"
                  >
                    <span className={selectedCustomer ? "text-foreground" : "text-muted-foreground"}>
                      {selectedCustomer
                        ? `${selectedCustomer.full_name}${selectedCustomer.company !== "-" ? ` · ${selectedCustomer.company}` : ""}`
                        : "— ไม่ระบุ —"}
                    </span>
                    <ChevronDown className={`h-4 w-4 opacity-50 transition-transform ${custOpen ? "rotate-180" : ""}`} />
                  </button>

                  {/* Dropdown */}
                  {custOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg overflow-hidden">
                      {/* Search input */}
                      <div className="p-2 border-b bg-background">
                        <Input
                          autoFocus
                          value={custSearch}
                          onChange={(e) => setCustSearch(e.target.value)}
                          placeholder="🔍 พิมพ์ค้นหาชื่อลูกค้า..."
                          className="h-8 text-sm"
                        />
                      </div>
                      {/* List */}
                      <div className="max-h-52 overflow-y-auto py-1">
                        {/* ไม่ระบุ option */}
                        <button
                          type="button"
                          onClick={() => { setCustomerId("none"); setCustOpen(false); }}
                          className={`w-full flex items-center gap-2 text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${customerId === "none" ? "bg-accent/50" : ""}`}
                        >
                          {customerId === "none" && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                          <span className={`${customerId === "none" ? "ml-0" : "ml-5"} text-muted-foreground`}>— ไม่ระบุ —</span>
                        </button>

                        {/* Customer items */}
                        {filteredCustomers.map((c) => (
                          <button
                            key={c.customer_id}
                            type="button"
                            onClick={() => { setCustomerId(c.customer_id); setCustOpen(false); }}
                            className={`w-full flex items-center gap-2 text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${customerId === c.customer_id ? "bg-accent/50" : ""}`}
                          >
                            {customerId === c.customer_id
                              ? <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                              : <span className="w-3.5 shrink-0" />
                            }
                            <span className="truncate">
                              {c.full_name}
                              {c.company !== "-" && (
                                <span className="text-muted-foreground text-xs ml-1.5">· {c.company}</span>
                              )}
                            </span>
                          </button>
                        ))}

                        {filteredCustomers.length === 0 && (
                          <p className="px-3 py-3 text-sm text-muted-foreground text-center">ไม่พบลูกค้าที่ค้นหา</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
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
