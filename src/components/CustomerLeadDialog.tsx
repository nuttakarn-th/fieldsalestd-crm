import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  useCRM, SOURCES, BU_TYPES, INT_PROGRAMS, MONTHS, BUDGETS, TOUR_TYPES, URGENCY_OPTIONS, LEAD_CATEGORIES,
  type Source, type SalesRep, type BUType, type Urgency, type LeadCategory,
} from "@/store/crmStore";
import { useActiveSalesNames } from "@/store/authStore";

export function CustomerLeadDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const customers = useCRM((s) => s.customers);
  const currentRep = useCRM((s) => s.currentRep);
  const addCustomer = useCRM((s) => s.addCustomer);
  const updateCustomer = useCRM((s) => s.updateCustomer);
  const addLead = useCRM((s) => s.addLead);

  const [mode, setMode] = useState<"new" | "existing">("new");
  const [existingId, setExistingId] = useState("");

  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [lineId, setLineId] = useState("");
  const [source, setSource] = useState<Source>("Line OA");

  const SALES_REPS = useActiveSalesNames() as SalesRep[];
  const [owner, setOwner] = useState<SalesRep>((SALES_REPS[0] ?? "") as SalesRep);
  // Update owner default when active sales list loads after mount
  useEffect(() => {
    if (!owner && SALES_REPS[0]) setOwner(SALES_REPS[0]);
  }, [owner, SALES_REPS]);
  const [buType, setBuType] = useState<BUType>("ทัวร์ต่างประเทศ");
  const [intProgram, setIntProgram] = useState(INT_PROGRAMS[0]);
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
    if (open && currentRep !== "All") setOwner(currentRep);
  }, [open, currentRep]);

  useEffect(() => {
    if (mode === "existing" && existingId) {
      const c = customers.find((x) => x.customer_id === existingId);
      if (c) {
        setFullName(c.full_name);
        setCompany(c.company === "-" ? "" : c.company);
        setPhone(c.phone);
        setLineId(c.line_id);
        setSource(c.source);
      }
    }
  }, [existingId, mode, customers]);

  const reset = () => {
    setMode("new"); setExistingId(""); setFullName(""); setCompany(""); setPhone(""); setLineId("");
    setSource("Line OA"); setBuType("ทัวร์ต่างประเทศ"); setIntProgram(INT_PROGRAMS[0]); setIntNote("");
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
    if (mode === "new") {
      cid = addCustomer({
        full_name: fullName, company: company || "-", phone, line_id: lineId,
        source, segment: "B2C Individual",
        created_by: owner,
      });
    } else if (existingId) {
      updateCustomer(existingId, { full_name: fullName, company: company || "-", phone, line_id: lineId, source });
    } else {
      toast.error("กรุณาเลือกลูกค้าเดิม");
      return;
    }

    let program = "";
    if (buType === "ทัวร์ต่างประเทศ") program = intProgram === "อื่นๆ (โปรดระบุ)" ? `อื่นๆ: ${intNote}` : intProgram;
    else if (buType === "ทัวร์ภายในประเทศ") program = `ทัวร์ในประเทศ: จ.${domProvince}`;
    else if (buType === "เช่ารถ ท่องเที่ยว") program = `เช่ารถ: ${carDetail}`;
    else program = `จองตั๋ว: ${flightDetail}`;

    addLead({
      customer_id: cid,
      assigned_to: owner,
      bu_type: buType,
      lead_category: leadCategory,
      scope: buType === "ทัวร์ภายในประเทศ" ? "Domestic" : "International",
      program,
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><Label>ชื่อลูกค้า *</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
          <div><Label>บริษัท / องค์กร</Label><Input value={company} onChange={(e) => setCompany(e.target.value)} /></div>
          <div><Label>เบอร์โทร *</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div><Label>Line ID</Label><Input value={lineId} onChange={(e) => setLineId(e.target.value)} /></div>
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

        <div className="border-t pt-3 space-y-3">
          <p className="text-sm font-semibold">📋 รายละเอียดบริการ (Lead)</p>
          <div>
            <Label>ประเภทบริการ (BU Type)</Label>
            <Select value={buType} onValueChange={(v) => setBuType(v as BUType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{BU_TYPES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {buType === "ทัวร์ต่างประเทศ" && (
            <>
              <Label>โปรแกรมทัวร์</Label>
              <Select value={intProgram} onValueChange={setIntProgram}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{INT_PROGRAMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
              {intProgram === "อื่นๆ (โปรดระบุ)" && (
                <Textarea placeholder="ระบุโปรแกรม..." value={intNote} onChange={(e) => setIntNote(e.target.value)} />
              )}
            </>
          )}
          {buType === "ทัวร์ภายในประเทศ" && (
            <div><Label>จังหวัด</Label><Input value={domProvince} onChange={(e) => setDomProvince(e.target.value)} placeholder="เช่น เชียงใหม่" /></div>
          )}
          {buType === "เช่ารถ ท่องเที่ยว" && (
            <div><Label>รายละเอียด</Label><Textarea value={carDetail} onChange={(e) => setCarDetail(e.target.value)} /></div>
          )}
          {buType === "จองตั๋วเครื่องบิน" && (
            <div><Label>รายละเอียด</Label><Textarea value={flightDetail} onChange={(e) => setFlightDetail(e.target.value)} /></div>
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