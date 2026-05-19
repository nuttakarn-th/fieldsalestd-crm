import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  useCRM, SOURCES, BU_TYPES, MONTHS, BUDGETS, TOUR_TYPES, URGENCY_OPTIONS, LEAD_CATEGORIES,
  type Source, type SalesRep, type BUType, type Urgency, type LeadCategory,
} from "@/store/crmStore";
import { useActiveSalesNames, useCurrentUser } from "@/store/authStore";
import { useServices } from "@/store/serviceStore";

const SERVICE_INTERESTS = [
  { key: "ทัวร์ต่างประเทศ", label: "✈️ ทัวร์ต่างประเทศ" },
  { key: "ทัวร์ภายในประเทศ", label: "🏔️ ทัวร์ภายในประเทศ" },
  { key: "เช่ารถ ท่องเที่ยว", label: "🚗 เช่ารถ" },
  { key: "จองตั๋วเครื่องบิน", label: "🎫 ตั๋วเครื่องบิน" },
  { key: "โรงแรม", label: "🏨 โรงแรม" },
  { key: "Visa", label: "📋 Visa" },
  { key: "ประกันการเดินทาง", label: "🛡️ ประกัน" },
];

export function CustomerLeadDialog({
  open,
  onOpenChange,
  prefilledCustomerId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  prefilledCustomerId?: string;
}) {
  const currentUser = useCurrentUser();
  const customers = useCRM((s) => s.customers);
  const currentRep = useCRM((s) => s.currentRep);
  const addCustomer = useCRM((s) => s.addCustomer);
  const updateCustomer = useCRM((s) => s.updateCustomer);
  const addLead = useCRM((s) => s.addLead);

  const tours = useServices((s) => s.tours);
  const cars = useServices((s) => s.cars);
  const flights = useServices((s) => s.flights);

  const [mode, setMode] = useState<"new" | "existing">("new");
  const [existingId, setExistingId] = useState("");

  // --- Customer fields ---
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [lineId, setLineId] = useState("");
  const [email, setEmail] = useState("");
  const [province, setProvince] = useState("");
  const [birthday, setBirthday] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [meetingNote, setMeetingNote] = useState("");
  const [source, setSource] = useState<Source>("Line OA");

  const SALES_REPS = useActiveSalesNames() as SalesRep[];
  const [owner, setOwner] = useState<SalesRep>((SALES_REPS[0] ?? "") as SalesRep);
  useEffect(() => {
    if (!owner && SALES_REPS[0]) setOwner(SALES_REPS[0]);
  }, [owner, SALES_REPS]);

  // --- Lead fields ---
  const [buType, setBuType] = useState<BUType>("ทัวร์ต่างประเทศ");
  const [intProgram, setIntProgram] = useState("__custom__");
  const [tourId, setTourId] = useState<string | undefined>(undefined); // FK → TourItem.id
  const [carServiceId, setCarServiceId] = useState("__custom__");
  const [flightServiceId, setFlightServiceId] = useState("__custom__");
  const [intNote, setIntNote] = useState("");
  const [domProvince, setDomProvince] = useState("");
  const [carDetail, setCarDetail] = useState("");
  const [flightDetail, setFlightDetail] = useState("");
  const [travelMonth, setTravelMonth] = useState(MONTHS[0]);
  const [pax, setPax] = useState("2");
  const [budget, setBudget] = useState(BUDGETS[0]);
  const [tourType, setTourType] = useState(TOUR_TYPES[0]);
  const [urgency, setUrgency] = useState<Urgency>("Warm");
  const [nextFollowUp, setNextFollowUp] = useState(new Date().toISOString().split("T")[0]);
  const [quotedPrice, setQuotedPrice] = useState("");
  const [leadCategory, setLeadCategory] = useState<LeadCategory>("บริษัทเอกชน");

  useEffect(() => {
    if (open) {
      const me = currentUser?.full_name ?? (currentRep !== "All" ? currentRep : "");
      if (me) setOwner(me as SalesRep);
    }
  }, [open, currentRep, currentUser]);

  // Pre-fill existing customer when launched from CustomerDetail page
  useEffect(() => {
    if (open && prefilledCustomerId) {
      setMode("existing");
      setExistingId(prefilledCustomerId);
    }
  }, [open, prefilledCustomerId]);

  useEffect(() => {
    if (mode === "existing" && existingId) {
      const c = customers.find((x) => x.customer_id === existingId);
      if (c) {
        setFullName(c.full_name);
        setCompany(c.company === "-" ? "" : c.company);
        setPhone(c.phone);
        setLineId(c.line_id);
        setEmail(c.email ?? "");
        setProvince(c.province ?? "");
        setBirthday(c.birthday ?? "");
        setInterests(c.interests ?? []);
        setMeetingNote(c.note ?? "");
        setSource(c.source);
      }
    }
  }, [existingId, mode, customers]);

  // Auto-tick interest when buType changes
  useEffect(() => {
    if (buType && !interests.includes(buType)) {
      setInterests((prev) => [...new Set([...prev, buType])]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buType]);

  const toggleInterest = (key: string) => {
    setInterests((prev) =>
      prev.includes(key) ? prev.filter((i) => i !== key) : [...prev, key],
    );
  };

  const reset = () => {
    setMode("new"); setExistingId(""); setFullName(""); setCompany(""); setPhone(""); setLineId("");
    setEmail(""); setProvince(""); setBirthday(""); setInterests([]); setMeetingNote("");
    setSource("Line OA"); setBuType("ทัวร์ต่างประเทศ"); setIntProgram("__custom__"); setTourId(undefined); setIntNote("");
    setCarServiceId("__custom__"); setFlightServiceId("__custom__");
    setDomProvince(""); setCarDetail(""); setFlightDetail(""); setPax("2"); setQuotedPrice("");
    setUrgency("Warm"); setNextFollowUp(new Date().toISOString().split("T")[0]);
    setLeadCategory("บริษัทเอกชน");
  };

  const submit = () => {
    if (!fullName || !phone) {
      toast.error("กรุณากรอกชื่อและเบอร์โทร");
      return;
    }
    let cid = existingId;
    const customerPatch = {
      full_name: fullName, company: company || "-", phone, line_id: lineId,
      email: email || undefined,
      province: province || undefined,
      birthday: birthday || undefined,
      interests: interests.length > 0 ? interests : undefined,
      note: meetingNote || undefined,
      source,
    };
    if (mode === "new") {
      cid = addCustomer({ ...customerPatch, segment: "B2C Individual", created_by: owner });
    } else if (existingId) {
      updateCustomer(existingId, customerPatch);
    } else {
      toast.error("กรุณาเลือกลูกค้าเดิม");
      return;
    }

    let program = "";
    if (buType === "ทัวร์ต่างประเทศ") program = intProgram === "__custom__" ? intNote : intProgram;
    else if (buType === "ทัวร์ภายในประเทศ") program = intProgram === "__custom__" ? `ทัวร์ในประเทศ: จ.${domProvince}` : intProgram;
    else if (buType === "เช่ารถ ท่องเที่ยว") program = carServiceId === "__custom__" ? `เช่ารถ: ${carDetail}` : (() => { const c = cars.find((x) => x.id === carServiceId); return c ? `เช่ารถ: ${c.name} ${c.type}` : carDetail; })();
    else program = flightServiceId === "__custom__" ? `จองตั๋ว: ${flightDetail}` : (() => { const f = flights.find((x) => x.id === flightServiceId); return f ? `จองตั๋ว: ${f.airline} ${f.route}` : flightDetail; })();

    addLead({
      customer_id: cid,
      assigned_to: owner,
      bu_type: buType,
      lead_category: leadCategory,
      scope: buType === "ทัวร์ภายในประเทศ" ? "Domestic" : "International",
      program,
      tour_id: tourId,
      pax_count: parseInt(pax) || 1,
      travel_month: travelMonth,
      tour_type: tourType,
      budget_range: budget,
      urgency,
      next_followup_date: nextFollowUp,
      quoted_price: parseFloat(quotedPrice) || 0,
      status: "New",
    });
    toast.success("สร้าง Lead สำเร็จ");
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>เพิ่มลูกค้า / สร้าง Lead ใหม่</DialogTitle>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "new" | "existing")}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="new">🆕 ลูกค้าใหม่</TabsTrigger>
            <TabsTrigger value="existing">🔎 ลูกค้าเดิม</TabsTrigger>
          </TabsList>
          <TabsContent value="existing" className="mt-3">
            <Label>เลือกลูกค้าเดิม</Label>
            <Select value={existingId} onValueChange={setExistingId}>
              <SelectTrigger><SelectValue placeholder="ค้นหาจากรายชื่อ..." /></SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.customer_id} value={c.customer_id}>
                    {c.full_name} • {c.phone} {c.company !== "-" ? `• ${c.company}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TabsContent>
          <TabsContent value="new" />
        </Tabs>

        {/* ── ข้อมูลลูกค้า ── */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-muted-foreground border-b pb-1">👤 ข้อมูลลูกค้า</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><Label>ชื่อลูกค้า *</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
            <div><Label>บริษัท / องค์กร</Label><Input value={company} onChange={(e) => setCompany(e.target.value)} /></div>
            <div><Label>เบอร์โทร *</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            <div><Label>Line ID</Label><Input value={lineId} onChange={(e) => setLineId(e.target.value)} /></div>
            <div><Label>อีเมล <span className="text-[10px] text-muted-foreground">(สำหรับส่งใบเสนอราคา / Ads)</span></Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@email.com" /></div>
            <div><Label>จังหวัด <span className="text-[10px] text-muted-foreground">(Geo-targeting)</span></Label><Input value={province} onChange={(e) => setProvince(e.target.value)} placeholder="เช่น กรุงเทพฯ, เชียงใหม่" /></div>
            <div><Label>วันเกิด <span className="text-[10px] text-muted-foreground">(Birthday campaign)</span></Label><Input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} /></div>
            <div>
              <Label>ช่องทางที่มา</Label>
              <Select value={source} onValueChange={(v) => setSource(v as Source)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sales Owner</Label>
              <Select value={owner} onValueChange={(v) => setOwner(v as SalesRep)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SALES_REPS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {/* บริการที่สนใจ */}
          <div>
            <Label>บริการที่สนใจ <span className="text-[10px] text-muted-foreground">(เลือกได้หลายอย่าง)</span></Label>
            <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2">
              {SERVICE_INTERESTS.map((s) => (
                <div key={s.key} className="flex items-center gap-1.5">
                  <Checkbox
                    id={`int-${s.key}`}
                    checked={interests.includes(s.key)}
                    onCheckedChange={() => toggleInterest(s.key)}
                  />
                  <label htmlFor={`int-${s.key}`} className="text-sm cursor-pointer select-none">{s.label}</label>
                </div>
              ))}
            </div>
          </div>

          {/* หมายเหตุการพบลูกค้า */}
          <div>
            <Label>หมายเหตุ / บันทึกการพบลูกค้า <span className="text-[10px] text-muted-foreground">(ชอบอะไร, ไม่ชอบอะไร, ข้อสังเกต)</span></Label>
            <Textarea
              value={meetingNote}
              onChange={(e) => setMeetingNote(e.target.value)}
              placeholder="เช่น ชอบทัวร์ญี่ปุ่น ไม่เอาจีน / งบ 40k ต่อท่าน / ติดต่อได้หลัง 18.00 น."
              className="min-h-[70px]"
            />
          </div>
        </div>

        {/* ── รายละเอียดบริการ (Lead) ── */}
        <div className="border-t pt-3 space-y-3">
          <p className="text-sm font-semibold text-muted-foreground border-b pb-1">📋 รายละเอียดบริการ (Lead)</p>
          <div>
            <Label>ประเภทบริการ (BU Type)</Label>
            <Select value={buType} onValueChange={(v) => setBuType(v as BUType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{BU_TYPES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {buType === "ทัวร์ต่างประเทศ" && (
            <>
              <Label>โปรแกรมทัวร์ <span className="text-[10px] text-muted-foreground">(เลือกจาก All Service หรือระบุเอง)</span></Label>
              <Select value={intProgram} onValueChange={(v) => {
                setIntProgram(v);
                if (v !== "__custom__") {
                  const t = tours.find((x) => `${x.code} - ${x.city} ${x.duration}` === v);
                  setTourId(t?.id);
                } else { setTourId(undefined); }
              }}>
                <SelectTrigger><SelectValue placeholder="เลือกโปรแกรม..." /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {(["International Tour", "Incentive"] as const).map((cat) => {
                    const items = tours.filter((t) => t.category === cat);
                    if (items.length === 0) return null;
                    return (
                      <div key={cat}>
                        <div className="px-2 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{cat}</div>
                        {items.map((t) => (
                          <SelectItem key={t.id} value={`${t.code} - ${t.city} ${t.duration}`}>
                            {t.code} · {t.city} ({t.duration})
                          </SelectItem>
                        ))}
                      </div>
                    );
                  })}
                  <div className="px-2 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">อื่นๆ</div>
                  <SelectItem value="__custom__">📝 ระบุเอง...</SelectItem>
                </SelectContent>
              </Select>
              {intProgram === "__custom__" && (
                <Textarea placeholder="ระบุโปรแกรมที่ต้องการ..." value={intNote} onChange={(e) => setIntNote(e.target.value)} />
              )}
              {tours.filter((t) => t.category === "International Tour" || t.category === "Incentive").length === 0 && (
                <p className="text-[11px] text-warning-foreground bg-warning/15 border border-warning/40 rounded px-2 py-1">
                  ⚠️ ยังไม่มีโปรแกรมทัวร์ต่างประเทศใน All Service — Admin เพิ่มได้ที่หน้า "All Service"
                </p>
              )}
            </>
          )}
          {buType === "ทัวร์ภายในประเทศ" && (
            <>
              <Label>โปรแกรมทัวร์ในประเทศ</Label>
              <Select value={intProgram} onValueChange={(v) => {
                setIntProgram(v);
                if (v !== "__custom__") {
                  const t = tours.find((x) => `${x.code} - ${x.city} ${x.duration}` === v);
                  setTourId(t?.id);
                } else { setTourId(undefined); }
              }}>
                <SelectTrigger><SelectValue placeholder="เลือกโปรแกรม..." /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {tours.filter((t) => t.category === "Domestic").map((t) => (
                    <SelectItem key={t.id} value={`${t.code} - ${t.city} ${t.duration}`}>
                      {t.code} · {t.city} ({t.duration})
                    </SelectItem>
                  ))}
                  <SelectItem value="__custom__">📝 ระบุจังหวัด/รายละเอียดเอง...</SelectItem>
                </SelectContent>
              </Select>
              {intProgram === "__custom__" && (
                <Input value={domProvince} onChange={(e) => setDomProvince(e.target.value)} placeholder="เช่น เชียงใหม่ 3 วัน 2 คืน" />
              )}
            </>
          )}
          {buType === "เช่ารถ ท่องเที่ยว" && (
            <>
              <Label>รถเช่า</Label>
              <Select value={carServiceId} onValueChange={setCarServiceId}>
                <SelectTrigger><SelectValue placeholder="เลือกรถ..." /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {cars.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name} · {c.type} · {c.total_seats} ที่นั่ง · {c.rate_per_day.toLocaleString()}฿/วัน</SelectItem>
                  ))}
                  <SelectItem value="__custom__">📝 ระบุเอง...</SelectItem>
                </SelectContent>
              </Select>
              {carServiceId === "__custom__" && (
                <Textarea placeholder="รายละเอียดรถเช่า..." value={carDetail} onChange={(e) => setCarDetail(e.target.value)} />
              )}
              {cars.length === 0 && (
                <p className="text-[11px] text-warning-foreground bg-warning/15 border border-warning/40 rounded px-2 py-1">
                  ⚠️ ยังไม่มีรถเช่าใน All Service
                </p>
              )}
            </>
          )}
          {buType === "จองตั๋วเครื่องบิน" && (
            <>
              <Label>เที่ยวบิน</Label>
              <Select value={flightServiceId} onValueChange={setFlightServiceId}>
                <SelectTrigger><SelectValue placeholder="เลือกเที่ยวบิน..." /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {flights.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.airline} · {f.route}</SelectItem>
                  ))}
                  <SelectItem value="__custom__">📝 ระบุเอง...</SelectItem>
                </SelectContent>
              </Select>
              {flightServiceId === "__custom__" && (
                <Textarea placeholder="รายละเอียดเที่ยวบิน..." value={flightDetail} onChange={(e) => setFlightDetail(e.target.value)} />
              )}
              {flights.length === 0 && (
                <p className="text-[11px] text-warning-foreground bg-warning/15 border border-warning/40 rounded px-2 py-1">
                  ⚠️ ยังไม่มีเที่ยวบินใน All Service
                </p>
              )}
            </>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <Label>เดือนเดินทาง</Label>
              <Select value={travelMonth} onValueChange={setTravelMonth}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>จำนวน Pax</Label><Input type="number" value={pax} onChange={(e) => setPax(e.target.value)} /></div>
            <div>
              <Label>งบประมาณ/ท่าน</Label>
              <Select value={budget} onValueChange={setBudget}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{BUDGETS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>ประเภททัวร์</Label>
              <Select value={tourType} onValueChange={setTourType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TOUR_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>ความเร่งด่วน</Label>
              <Select value={urgency} onValueChange={(v) => setUrgency(v as Urgency)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{URGENCY_OPTIONS.map((u) => <SelectItem key={u.val} value={u.val}>{u.emoji} {u.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>นัด Follow Up</Label><Input type="date" value={nextFollowUp} onChange={(e) => setNextFollowUp(e.target.value)} /></div>
          </div>
          <div><Label>มูลค่าเสนอราคา (THB)</Label><Input type="number" value={quotedPrice} onChange={(e) => setQuotedPrice(e.target.value)} placeholder="0" /></div>
          <div>
            <Label>หมวดหมู่ลูกค้า (Lead Category)</Label>
            <Select value={leadCategory} onValueChange={(v) => setLeadCategory(v as LeadCategory)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LEAD_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
          <Button onClick={submit} className="bg-gradient-primary">บันทึก & สร้าง Lead</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
