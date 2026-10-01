import { useEffect, useState } from "react";
import { ThaiDateInput } from "@/components/ThaiDateInput";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useCRM, SOURCES, type Customer, type Source, type Tier, type SalesRep } from "@/store/crmStore";
import { useActiveSalesNames } from "@/store/authStore";
import { ALL_PERSONAS, PERSONA_EMOJI, PERSONA_COLORS, inferPersonaFromCustomer } from "@/store/surveyStore";
import type { PersonaTag } from "@/store/surveyStore";

const SERVICE_INTERESTS = [
  { key: "ทัวร์ต่างประเทศ", label: "✈️ ทัวร์ต่างประเทศ" },
  { key: "ทัวร์ภายในประเทศ", label: "🏔️ ทัวร์ภายในประเทศ" },
  { key: "เช่ารถ ท่องเที่ยว", label: "🚗 เช่ารถ" },
  { key: "จองตั๋วเครื่องบิน", label: "🎫 ตั๋วเครื่องบิน" },
  { key: "โรงแรม", label: "🏨 โรงแรม" },
  { key: "Visa", label: "📋 Visa" },
  { key: "ประกันการเดินทาง", label: "🛡️ ประกัน" },
];

export function EditCustomerDialog({ customer, onClose }: { customer: Customer | null; onClose: () => void }) {
  const updateCustomer = useCRM((s) => s.updateCustomer);
  const leads = useCRM((s) => s.leads);
  const SALES_REPS = useActiveSalesNames() as SalesRep[];
  const [data, setData] = useState<Customer | null>(customer);

  useEffect(() => setData(customer), [customer]);
  if (!data) return null;

  function handleAutoInferPersona() {
    if (!data) return;
    const customerLeads = leads.filter((l) => l.customer_id === data.customer_id);
    const inferred = inferPersonaFromCustomer(data, customerLeads);
    if (inferred) {
      setData({ ...data, persona_tag: inferred });
      toast.success(`🎭 ประเมิน Persona: ${inferred}`);
    } else {
      toast.error("ไม่มีข้อมูลเพียงพอในการประเมิน Persona");
    }
  }

  const toggleInterest = (key: string) => {
    const current = data.interests ?? [];
    const next = current.includes(key) ? current.filter((i) => i !== key) : [...current, key];
    setData({ ...data, interests: next });
  };

  return (
    <Dialog open={!!customer} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>แก้ไขข้อมูลลูกค้า — {data.customer_id}</DialogTitle></DialogHeader>

        <div className="space-y-4">
          {/* ── ข้อมูลพื้นฐาน ── */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">👤 ข้อมูลพื้นฐาน</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2"><Label>ชื่อ-สกุล</Label><Input value={data.full_name} onChange={(e) => setData({ ...data, full_name: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>บริษัท</Label><Input value={data.company === "-" ? "" : data.company} onChange={(e) => setData({ ...data, company: e.target.value || "-" })} /></div>
              <div><Label>เบอร์โทร</Label><Input value={data.phone} onChange={(e) => setData({ ...data, phone: e.target.value })} /></div>
              <div><Label>Line ID</Label><Input value={data.line_id} onChange={(e) => setData({ ...data, line_id: e.target.value })} /></div>
              <div><Label>อีเมล</Label><Input type="email" value={data.email ?? ""} onChange={(e) => setData({ ...data, email: e.target.value || undefined })} placeholder="example@email.com" /></div>
              <div><Label>จังหวัด</Label><Input value={data.province ?? ""} onChange={(e) => setData({ ...data, province: e.target.value || undefined })} placeholder="เช่น กรุงเทพฯ" /></div>
              <div><Label>วันเกิด</Label><ThaiDateInput value={data.birthday ?? ""} onChange={(e) => setData({ ...data, birthday: e.target.value || undefined })} /></div>
              <div>
                <Label>ช่องทาง</Label>
                <Select value={data.source} onValueChange={(v) => setData({ ...data, source: v as Source })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tier</Label>
                <Select value={data.customer_tier} onValueChange={(v) => setData({ ...data, customer_tier: v as Tier })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="New">New</SelectItem>
                    <SelectItem value="Regular">Regular</SelectItem>
                    <SelectItem value="VIP">VIP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sales เจ้าของ</Label>
                <Select value={data.created_by} onValueChange={(v) => setData({ ...data, created_by: v as SalesRep })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SALES_REPS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* ── บริการที่สนใจ ── */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">🎯 บริการที่สนใจ</p>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {SERVICE_INTERESTS.map((s) => (
                <div key={s.key} className="flex items-center gap-1.5">
                  <Checkbox
                    id={`edit-int-${s.key}`}
                    checked={(data.interests ?? []).includes(s.key)}
                    onCheckedChange={() => toggleInterest(s.key)}
                  />
                  <label htmlFor={`edit-int-${s.key}`} className="text-sm cursor-pointer select-none">{s.label}</label>
                </div>
              ))}
            </div>
          </div>

          {/* ── Persona ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground">🎭 Persona</p>
              <button
                type="button"
                onClick={handleAutoInferPersona}
                className="text-xs px-2 py-1 rounded-md border border-border hover:bg-muted transition-colors"
              >
                ✨ ประเมินอัตโนมัติ
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {ALL_PERSONAS.map((p) => {
                const selected = data.persona_tag === p;
                const colorClass = PERSONA_COLORS[p as PersonaTag];
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setData({ ...data, persona_tag: selected ? undefined : p })}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                      selected
                        ? colorClass
                        : "border-border text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {PERSONA_EMOJI[p as PersonaTag]} {p}
                  </button>
                );
              })}
            </div>
            {data.persona_tag && (
              <p className="text-xs text-muted-foreground mt-1.5">
                ปัจจุบัน: <span className="font-medium text-foreground">{data.persona_tag}</span>
              </p>
            )}
          </div>

          {/* ── หมายเหตุ ── */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">📝 หมายเหตุ / บันทึก</p>
            <Textarea
              value={data.note ?? ""}
              onChange={(e) => setData({ ...data, note: e.target.value || undefined })}
              placeholder="ชอบอะไร, ไม่ชอบอะไร, ข้อสังเกตพิเศษ..."
              className="min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>ยกเลิก</Button>
          <Button className="bg-gradient-primary" onClick={() => {
            updateCustomer(data.customer_id, data);
            toast.success("บันทึกการแก้ไขสำเร็จ");
            onClose();
          }}>บันทึก</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
