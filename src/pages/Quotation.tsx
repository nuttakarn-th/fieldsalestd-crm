import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Receipt, Trash2 } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCRM, formatTHB } from "@/store/crmStore";
import { DateRangeFilter, resolveRange, inRange, type RangePreset } from "@/components/DateRangeFilter";
import { toast } from "sonner";

export default function Quotation() {
  const currentRep = useCRM((s) => s.currentRep);
  const quotations = useCRM((s) => s.quotations);
  const removeDoc = useCRM((s) => s.deleteQuotation);
  const [preset, setPreset] = useState<RangePreset>("month");
  const [custom, setCustom] = useState<DateRange | undefined>();
  const range = useMemo(() => resolveRange(preset, custom), [preset, custom]);

  // "All" view (Admin / Manager) shows every doc; Sales sees only their own.
  const myDocs = quotations.filter(
    (q) => (currentRep === "All" || q.rep === currentRep) && inRange(q.issue_date, range),
  );
  const totalQT = myDocs.filter((q) => q.doc_type === "quotation").reduce((s, q) => s + q.total, 0);
  const totalRC = myDocs.filter((q) => q.doc_type === "receipt").reduce((s, q) => s + q.total, 0);

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-pink flex items-center justify-center shadow-glow">
          <FileText className="w-6 h-6 text-accent-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">ใบเสนอราคา / ใบเสร็จ</h1>
          <p className="text-sm text-muted-foreground">ออกเอกสารตามมาตรฐานสากล</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link to="/app/quotation/new/quotation">
          <article className="rounded-3xl p-6 bg-gradient-to-br from-fuchsia-500 to-rose-500 text-white shadow-elegant hover:shadow-glow transition cursor-pointer h-44 flex flex-col justify-between">
            <div className="flex items-center gap-3"><FileText className="w-8 h-8" /><h2 className="text-2xl font-bold">ออกใบเสนอราคา</h2></div>
            <p className="text-sm text-white/85">สร้างใบ Quotation พร้อมรายการสินค้า/บริการ + VAT</p>
          </article>
        </Link>
        <Link to="/app/quotation/new/receipt">
          <article className="rounded-3xl p-6 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-elegant hover:shadow-glow transition cursor-pointer h-44 flex flex-col justify-between">
            <div className="flex items-center gap-3"><Receipt className="w-8 h-8" /><h2 className="text-2xl font-bold">ออกใบเสร็จ</h2></div>
            <p className="text-sm text-white/85">สร้างใบเสร็จรับเงิน / ใบกำกับภาษี</p>
          </article>
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h2 className="text-lg font-bold">ยอดรวมในช่วงเวลา</h2>
        <DateRangeFilter value={preset} custom={custom} onChange={(p, c) => { setPreset(p); setCustom(c); }} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border bg-card p-5 shadow-soft">
          <p className="text-xs text-muted-foreground">ใบเสนอราคา (QT) ทั้งหมด</p>
          <p className="text-2xl font-bold mt-1">{formatTHB(totalQT)}</p>
          <p className="text-xs text-muted-foreground mt-1">{myDocs.filter((q) => q.doc_type === "quotation").length} ใบ</p>
        </div>
        <div className="rounded-2xl border bg-card p-5 shadow-soft">
          <p className="text-xs text-muted-foreground">ใบเสร็จ (RC) ทั้งหมด</p>
          <p className="text-2xl font-bold mt-1">{formatTHB(totalRC)}</p>
          <p className="text-xs text-muted-foreground mt-1">{myDocs.filter((q) => q.doc_type === "receipt").length} ใบ</p>
        </div>
        <div className="rounded-2xl border bg-card p-5 shadow-soft">
          <p className="text-xs text-muted-foreground">รวมทั้งหมด</p>
          <p className="text-2xl font-bold mt-1 text-success">{formatTHB(totalQT + totalRC)}</p>
          <p className="text-xs text-muted-foreground mt-1">ช่วง: {range.label}</p>
        </div>
      </div>

      <div className="rounded-2xl border bg-card shadow-soft overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-bold">รายการเอกสารของคุณ</h3>
          <Badge variant="outline">{myDocs.length} ฉบับ</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="p-3 text-left">เลขที่</th>
                <th className="p-3 text-left">ประเภท</th>
                <th className="p-3 text-left">ลูกค้า</th>
                <th className="p-3 text-left">วันที่</th>
                <th className="p-3 text-right">มูลค่า</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {myDocs.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">ยังไม่มีเอกสารในช่วงนี้</td></tr>}
              {myDocs.map((q) => (
                <tr key={q.id} className="hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs">{q.doc_no}</td>
                  <td className="p-3"><Badge variant="outline">{q.doc_type === "quotation" ? "QT" : "RC"}</Badge></td>
                  <td className="p-3">{q.customer_name}{q.customer_company ? ` · ${q.customer_company}` : ""}</td>
                  <td className="p-3">{q.issue_date}</td>
                  <td className="p-3 text-right font-bold">{formatTHB(q.total)}</td>
                  <td className="p-3 text-right">
                    <Button variant="ghost" size="icon" onClick={() => { removeDoc(q.id); toast.success("ลบเอกสารแล้ว"); }}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}