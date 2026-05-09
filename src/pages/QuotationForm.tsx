import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Plus, Save, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VoiceTextarea } from "@/components/VoiceTextarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCRM, formatTHB, type DocumentType, type QuotationItem, type SalesRep } from "@/store/crmStore";
import { toast } from "sonner";

export default function QuotationForm() {
  const { type } = useParams<{ type: DocumentType }>();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit"); // ?edit=<id> → edit mode
  const navigate = useNavigate();
  const docType: DocumentType = type === "receipt" ? "receipt" : "quotation";
  const currentRep = useCRM((s) => s.currentRep);
  const addQuotation = useCRM((s) => s.addQuotation);
  const updateQuotation = useCRM((s) => s.updateQuotation);
  const quotations = useCRM((s) => s.quotations);

  const editingDoc = useMemo(() => (editId ? quotations.find((q) => q.id === editId) : null), [editId, quotations]);

  const [customerName, setCustomerName] = useState("");
  const [customerCompany, setCustomerCompany] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerTaxId, setCustomerTaxId] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [validUntil, setValidUntil] = useState("");
  const [vat, setVat] = useState(7);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<QuotationItem[]>([{ description: "", qty: 1, unit_price: 0 }]);
  const [sourceQT, setSourceQT] = useState<string>("none");

  // Load existing doc when editing
  useEffect(() => {
    if (editingDoc) {
      setCustomerName(editingDoc.customer_name);
      setCustomerCompany(editingDoc.customer_company ?? "");
      setCustomerAddress(editingDoc.customer_address ?? "");
      setCustomerTaxId(editingDoc.customer_taxid ?? "");
      setIssueDate(editingDoc.issue_date);
      setValidUntil(editingDoc.valid_until ?? "");
      setVat(editingDoc.vat_percent);
      setDiscount(editingDoc.discount);
      setNotes(editingDoc.notes ?? "");
      setItems(editingDoc.items.length ? editingDoc.items.map((it) => ({ ...it })) : [{ description: "", qty: 1, unit_price: 0 }]);
    }
  }, [editingDoc]);

  const subtotal = useMemo(() => items.reduce((s, it) => s + it.qty * it.unit_price, 0), [items]);
  const afterDiscount = Math.max(0, subtotal - (discount || 0));
  const vatAmount = +(afterDiscount * (vat / 100)).toFixed(2);
  const total = +(afterDiscount + vatAmount).toFixed(2);

  const updateItem = (i: number, patch: Partial<QuotationItem>) => {
    setItems((arr) => arr.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  };

  const availableQuotations = quotations.filter(
    (q) => q.doc_type === "quotation" && (currentRep === "All" || q.rep === currentRep),
  );

  const importQuotation = (id: string) => {
    setSourceQT(id);
    if (id === "none") return;
    const q = quotations.find((x) => x.id === id);
    if (!q) return;
    setCustomerName(q.customer_name);
    setCustomerCompany(q.customer_company ?? "");
    setCustomerAddress(q.customer_address ?? "");
    setCustomerTaxId(q.customer_taxid ?? "");
    setItems(q.items.length ? q.items.map((it) => ({ ...it })) : [{ description: "", qty: 1, unit_price: 0 }]);
    setVat(q.vat_percent);
    setDiscount(q.discount);
    setNotes(q.notes ?? "");
    toast.success(`ดึงข้อมูลจาก ${q.doc_no} แล้ว`);
  };

  const handleSave = () => {
    if (!customerName.trim()) return toast.error("กรุณาระบุชื่อลูกค้า");
    if (items.length === 0 || items.every((it) => !it.description.trim())) return toast.error("กรุณาเพิ่มรายการอย่างน้อย 1 รายการ");
    if (editingDoc) {
      updateQuotation(editingDoc.id, {
        doc_type: editingDoc.doc_type,
        customer_name: customerName,
        customer_company: customerCompany,
        customer_address: customerAddress,
        customer_taxid: customerTaxId,
        issue_date: issueDate,
        valid_until: validUntil || undefined,
        items: items.filter((it) => it.description.trim()),
        vat_percent: vat,
        discount,
        notes,
      });
      toast.success(`อัปเดต ${editingDoc.doc_no} แล้ว — ทีม Sales/Manager จะเห็นแจ้งเตือน`);
    } else {
      const issuer: SalesRep = (currentRep === "All" ? "เฟิร์ส" : currentRep) as SalesRep;
      addQuotation({
        doc_type: docType,
        rep: issuer,
        customer_name: customerName,
        customer_company: customerCompany,
        customer_address: customerAddress,
        customer_taxid: customerTaxId,
        issue_date: issueDate,
        valid_until: validUntil || undefined,
        items: items.filter((it) => it.description.trim()),
        vat_percent: vat,
        discount,
        notes,
      });
      toast.success("บันทึกเอกสารแล้ว");
    }
    navigate("/app/quotation");
  };

  const realDocType = editingDoc?.doc_type ?? docType;
  const title = editingDoc
    ? `แก้ไข ${editingDoc.doc_no}`
    : (realDocType === "quotation" ? "ออกใบเสนอราคา" : "ออกใบเสร็จ / ใบกำกับภาษี");

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Link to="/app/quotation"><Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">ผู้ออก: {currentRep === "All" ? "Admin / Manager" : currentRep}</p>
        </div>
      </div>

      {!editingDoc && docType === "receipt" && availableQuotations.length > 0 && (
        <section className="rounded-2xl bg-card border shadow-soft p-5 space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <h2 className="font-bold">ดึงข้อมูลจากใบเสนอราคา</h2>
          </div>
          <p className="text-xs text-muted-foreground">เลือกใบเสนอราคาเพื่อกรอกข้อมูลลูกค้าและรายการอัตโนมัติ</p>
          <Select value={sourceQT} onValueChange={importQuotation}>
            <SelectTrigger><SelectValue placeholder="— ไม่ดึง —" /></SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="none">— ไม่ดึง / ออกเอง —</SelectItem>
              {availableQuotations.map((q) => (
                <SelectItem key={q.id} value={q.id}>
                  {q.doc_no} · {q.customer_name} · {formatTHB(q.total)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </section>
      )}

      <section className="rounded-2xl bg-card border shadow-soft p-5 space-y-3">
        <h2 className="font-bold">ข้อมูลลูกค้า</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><Label>ชื่อลูกค้า *</Label><Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} /></div>
          <div><Label>บริษัท / องค์กร</Label><Input value={customerCompany} onChange={(e) => setCustomerCompany(e.target.value)} /></div>
          <div className="md:col-span-2"><Label>ที่อยู่</Label><Input value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} /></div>
          <div><Label>เลขประจำตัวผู้เสียภาษี</Label><Input value={customerTaxId} onChange={(e) => setCustomerTaxId(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>วันที่ออก</Label><Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} /></div>
            {docType === "quotation" && <div><Label>ใช้ได้ถึง</Label><Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} /></div>}
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-card border shadow-soft p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">รายการ</h2>
          <Button size="sm" variant="outline" onClick={() => setItems([...items, { description: "", qty: 1, unit_price: 0 }])}>
            <Plus className="w-4 h-4 mr-1" /> เพิ่มรายการ
          </Button>
        </div>
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-start">
              <div className="col-span-12 md:col-span-6"><Input placeholder="รายละเอียดสินค้า / บริการ" value={it.description} onChange={(e) => updateItem(i, { description: e.target.value })} /></div>
              <div className="col-span-4 md:col-span-2"><Input type="number" min={1} value={it.qty} onChange={(e) => updateItem(i, { qty: Number(e.target.value) })} placeholder="จำนวน" /></div>
              <div className="col-span-6 md:col-span-3"><Input type="number" min={0} value={it.unit_price} onChange={(e) => updateItem(i, { unit_price: Number(e.target.value) })} placeholder="ราคา/หน่วย" /></div>
              <div className="col-span-2 md:col-span-1 flex justify-end">
                <Button variant="ghost" size="icon" onClick={() => setItems(items.filter((_, idx) => idx !== i))}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-card border shadow-soft p-5 space-y-3">
        <h2 className="font-bold">สรุปยอด</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>VAT (%)</Label><Input type="number" value={vat} onChange={(e) => setVat(Number(e.target.value))} /></div>
              <div><Label>ส่วนลด (บาท)</Label><Input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} /></div>
            </div>
            <div><Label>หมายเหตุ</Label><VoiceTextarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          </div>
          <div className="rounded-xl bg-muted/30 p-4 space-y-2 text-sm">
            <Row label="ยอดรวม" value={formatTHB(subtotal)} />
            <Row label="ส่วนลด" value={`- ${formatTHB(discount || 0)}`} />
            <Row label={`VAT ${vat}%`} value={formatTHB(vatAmount)} />
            <div className="border-t pt-2 mt-2"><Row label="ยอดสุทธิ" value={formatTHB(total)} bold /></div>
          </div>
        </div>
      </section>

      <div className="flex justify-end gap-2">
        <Link to="/app/quotation"><Button variant="outline">ยกเลิก</Button></Link>
        <Button onClick={handleSave} className="bg-gradient-primary text-primary-foreground"><Save className="w-4 h-4 mr-2" /> บันทึกเอกสาร</Button>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${bold ? "text-base font-bold" : ""}`}>
      <span className="text-muted-foreground">{label}</span><span>{value}</span>
    </div>
  );
}