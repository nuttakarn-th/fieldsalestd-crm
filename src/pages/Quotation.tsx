import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Receipt, Trash2, Edit3, Eye, Search } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useCRM, formatTHB, type QuotationDoc } from "@/store/crmStore";
import { DateRangeFilter, resolveRange, inRange, type RangePreset } from "@/components/DateRangeFilter";
import { toast } from "sonner";

type DocFilter = "all" | "quotation" | "receipt";

export default function Quotation() {
  const currentRep = useCRM((s) => s.currentRep);
  const quotations = useCRM((s) => s.quotations);
  const removeDoc = useCRM((s) => s.deleteQuotation);
  const [preset, setPreset] = useState<RangePreset>("month");
  const [custom, setCustom] = useState<DateRange | undefined>();
  const range = useMemo(() => resolveRange(preset, custom), [preset, custom]);

  const [search, setSearch] = useState("");
  const [docFilter, setDocFilter] = useState<DocFilter>("all");
  const [viewing, setViewing] = useState<QuotationDoc | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<QuotationDoc | null>(null);

  // "All" view (Admin / Manager) shows every doc; Sales sees only their own.
  const myDocs = useMemo(() => {
    let list = quotations.filter(
      (q) => (currentRep === "All" || q.rep === currentRep) && inRange(q.issue_date, range),
    );
    if (docFilter !== "all") list = list.filter((q) => q.doc_type === docFilter);
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      list = list.filter((q) =>
        q.doc_no.toLowerCase().includes(s) ||
        q.customer_name.toLowerCase().includes(s) ||
        (q.customer_company ?? "").toLowerCase().includes(s) ||
        (q.customer_address ?? "").toLowerCase().includes(s) ||
        (q.customer_taxid ?? "").toLowerCase().includes(s) ||
        (q.notes ?? "").toLowerCase().includes(s) ||
        String(q.total).includes(s),
      );
    }
    return list;
  }, [quotations, currentRep, range, docFilter, search]);

  const totalQT = myDocs.filter((q) => q.doc_type === "quotation").reduce((s, q) => s + q.total, 0);
  const totalRC = myDocs.filter((q) => q.doc_type === "receipt").reduce((s, q) => s + q.total, 0);

  const editPath = (q: QuotationDoc) => `/app/quotation/new/${q.doc_type}?edit=${q.id}`;

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-pink flex items-center justify-center shadow-glow">
          <FileText className="w-6 h-6 text-accent-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">ใบเสนอราคา / ใบเสร็จ</h1>
          <p className="text-sm text-muted-foreground">ออกเอกสารตามมาตรฐานสากล · ค้นหาและแก้ไขได้</p>
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
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="font-bold">รายการเอกสารของคุณ</h3>
            <Badge variant="outline">{myDocs.length} ฉบับ</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหา เลขที่, ชื่อ, มูลค่า..."
                className="pl-9"
              />
            </div>
            <Select value={docFilter} onValueChange={(v) => setDocFilter(v as DocFilter)}>
              <SelectTrigger className="w-44 h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกประเภท</SelectItem>
                <SelectItem value="quotation">ใบเสนอราคา (QT)</SelectItem>
                <SelectItem value="receipt">ใบเสร็จ (RC)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Mobile: Card grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 md:hidden">
          {myDocs.length === 0 && <p className="col-span-full p-6 text-center text-muted-foreground">ไม่พบเอกสาร</p>}
          {myDocs.map((q) => (
            <button key={q.id} onClick={() => setViewing(q)} className="text-left bg-background border rounded-xl p-3 hover:bg-muted/30 transition space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline">{q.doc_type === "quotation" ? "QT" : "RC"}</Badge>
                <span className="font-mono text-xs text-muted-foreground">{q.doc_no}</span>
              </div>
              <p className="font-semibold truncate">{q.customer_name}</p>
              {q.customer_company && <p className="text-xs text-muted-foreground truncate">{q.customer_company}</p>}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-muted-foreground">{q.issue_date}</span>
                <span className="font-bold text-primary">{formatTHB(q.total)}</span>
              </div>
              <div className="flex gap-1 pt-1" onClick={(e) => e.stopPropagation()}>
                <Button size="sm" variant="outline" className="flex-1 h-8" onClick={() => setViewing(q)}><Eye className="w-3 h-3 mr-1" /> ดู</Button>
                <Link to={editPath(q)} className="flex-1">
                  <Button size="sm" variant="outline" className="w-full h-8"><Edit3 className="w-3 h-3 mr-1" /> แก้</Button>
                </Link>
                <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setConfirmDelete(q)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </button>
          ))}
        </div>

        {/* Desktop: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="p-3 text-left">เลขที่</th>
                <th className="p-3 text-left">ประเภท</th>
                <th className="p-3 text-left">ลูกค้า</th>
                <th className="p-3 text-left">วันที่</th>
                <th className="p-3 text-right">มูลค่า</th>
                <th className="p-3 text-center w-32">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {myDocs.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">ไม่พบเอกสารตามเงื่อนไขการค้นหา</td></tr>}
              {myDocs.map((q) => (
                <tr key={q.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setViewing(q)}>
                  <td className="p-3 font-mono text-xs">{q.doc_no}</td>
                  <td className="p-3"><Badge variant="outline">{q.doc_type === "quotation" ? "QT" : "RC"}</Badge></td>
                  <td className="p-3">{q.customer_name}{q.customer_company ? ` · ${q.customer_company}` : ""}</td>
                  <td className="p-3">{q.issue_date}</td>
                  <td className="p-3 text-right font-bold">{formatTHB(q.total)}</td>
                  <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" title="ดูรายละเอียด" onClick={() => setViewing(q)}>
                        <Eye className="w-4 h-4 text-primary" />
                      </Button>
                      <Link to={editPath(q)}>
                        <Button variant="ghost" size="icon" title="แก้ไข">
                          <Edit3 className="w-4 h-4 text-warning-foreground" />
                        </Button>
                      </Link>
                      <Button variant="ghost" size="icon" title="ลบ" onClick={() => setConfirmDelete(q)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Detail Dialog */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Badge variant="outline">{viewing?.doc_type === "quotation" ? "QT" : "RC"}</Badge>
              <span>{viewing?.doc_no}</span>
            </DialogTitle>
          </DialogHeader>

          {viewing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">ลูกค้า</p>
                  <p className="font-semibold">{viewing.customer_name}</p>
                  {viewing.customer_company && <p>{viewing.customer_company}</p>}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">ผู้ออก</p>
                  <p className="font-semibold">{viewing.rep}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">ที่อยู่</p>
                  <p>{viewing.customer_address || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">เลขผู้เสียภาษี</p>
                  <p className="font-mono">{viewing.customer_taxid || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">วันที่ออก</p>
                  <p>{viewing.issue_date}</p>
                </div>
                {viewing.valid_until && (
                  <div>
                    <p className="text-xs text-muted-foreground">ใช้ได้ถึง</p>
                    <p>{viewing.valid_until}</p>
                  </div>
                )}
              </div>

              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2">รายการ</th>
                      <th className="text-right p-2 w-16">จำนวน</th>
                      <th className="text-right p-2 w-24">ราคา/หน่วย</th>
                      <th className="text-right p-2 w-28">รวม</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {viewing.items.map((it, i) => (
                      <tr key={i}>
                        <td className="p-2">{it.description}</td>
                        <td className="p-2 text-right">{it.qty}</td>
                        <td className="p-2 text-right">{formatTHB(it.unit_price)}</td>
                        <td className="p-2 text-right font-semibold">{formatTHB(it.qty * it.unit_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="rounded-lg bg-muted/30 p-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">ยอดรวม</span><span>{formatTHB(viewing.subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">ส่วนลด</span><span>- {formatTHB(viewing.discount || 0)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">VAT {viewing.vat_percent}%</span><span>{formatTHB(viewing.vat_amount)}</span></div>
                <div className="flex justify-between border-t pt-1 mt-1 font-bold"><span>ยอดสุทธิ</span><span>{formatTHB(viewing.total)}</span></div>
              </div>

              {viewing.notes && (
                <div>
                  <p className="text-xs text-muted-foreground">หมายเหตุ</p>
                  <p className="text-sm whitespace-pre-wrap">{viewing.notes}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewing(null)}>ปิด</Button>
            {viewing && (
              <Link to={editPath(viewing)}>
                <Button onClick={() => setViewing(null)} className="bg-gradient-primary text-primary-foreground">
                  <Edit3 className="w-4 h-4 mr-1" /> แก้ไขเอกสาร
                </Button>
              </Link>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete */}
      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>ยืนยันลบเอกสาร</DialogTitle></DialogHeader>
          <p className="text-sm">
            ลบ <span className="font-mono font-semibold">{confirmDelete?.doc_no}</span> ของลูกค้า <span className="font-semibold">{confirmDelete?.customer_name}</span>?
          </p>
          <p className="text-xs text-muted-foreground">การกระทำนี้ย้อนกลับไม่ได้</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>ยกเลิก</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmDelete) {
                  removeDoc(confirmDelete.id);
                  toast.success(`ลบ ${confirmDelete.doc_no} แล้ว`);
                  setConfirmDelete(null);
                }
              }}
            >
              <Trash2 className="w-4 h-4 mr-1" /> ลบเอกสาร
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
