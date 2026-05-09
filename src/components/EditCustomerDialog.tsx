import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useCRM, SOURCES, type Customer, type Source, type Tier, type SalesRep } from "@/store/crmStore";
import { useActiveSalesNames } from "@/store/authStore";

export function EditCustomerDialog({ customer, onClose }: { customer: Customer | null; onClose: () => void }) {
  const updateCustomer = useCRM((s) => s.updateCustomer);
  const SALES_REPS = useActiveSalesNames() as SalesRep[];
  const [data, setData] = useState<Customer | null>(customer);

  useEffect(() => setData(customer), [customer]);
  if (!data) return null;

  return (
    <Dialog open={!!customer} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>แก้ไขข้อมูลลูกค้า — {data.customer_id}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2"><Label>ชื่อ-สกุล</Label><Input value={data.full_name} onChange={(e) => setData({ ...data, full_name: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>บริษัท</Label><Input value={data.company === "-" ? "" : data.company} onChange={(e) => setData({ ...data, company: e.target.value || "-" })} /></div>
          <div><Label>เบอร์โทร</Label><Input value={data.phone} onChange={(e) => setData({ ...data, phone: e.target.value })} /></div>
          <div><Label>Line ID</Label><Input value={data.line_id} onChange={(e) => setData({ ...data, line_id: e.target.value })} /></div>
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
          <div className="md:col-span-2">
            <Label>Sales เจ้าของ (Admin Sales)</Label>
            <Select value={data.created_by} onValueChange={(v) => setData({ ...data, created_by: v as SalesRep })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SALES_REPS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>ยกเลิก</Button>
          <Button className="bg-gradient-primary" onClick={() => { updateCustomer(data.customer_id, data); toast.success("บันทึกการแก้ไขสำเร็จ"); onClose(); }}>บันทึก</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}