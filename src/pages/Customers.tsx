import { useMemo, useState } from "react";
import { Search, Plus, Download, Pencil, Phone, MessageCircle, ArrowRightLeft, Lock, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCRM, formatTHB, tierBadge, SALES_REPS, type Customer, type SalesRep } from "@/store/crmStore";
import { CustomerLeadDialog } from "@/components/CustomerLeadDialog";
import { EditCustomerDialog } from "@/components/EditCustomerDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

function exportCSV(rows: Customer[]) {
  const headers = ["customer_id","full_name","company","phone","line_id","email","source","segment","total_trips","total_spend","customer_tier","first_contact_date","created_by"];
  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [headers.join(",")];
  rows.forEach((r) => {
    lines.push([
      r.customer_id, r.full_name, r.company,
      `="${r.phone}"`, // protect leading zero
      r.line_id, r.email ?? "", r.source, r.segment,
      r.total_trips, r.total_spend, r.customer_tier, r.first_contact_date, r.created_by,
    ].map((v, i) => (i === 3 ? v : escape(v))).join(","));
  });
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `customers_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`Export ${rows.length} รายการสำเร็จ`);
}

export default function Customers() {
  const customers = useCRM((s) => s.customers);
  const currentRep = useCRM((s) => s.currentRep);
  const transferCustomer = useCRM((s) => s.transferCustomer);
  const [q, setQ] = useState("");
  const [openAdd, setOpenAdd] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [transferOf, setTransferOf] = useState<Customer | null>(null);
  const [transferTo, setTransferTo] = useState<SalesRep | "">("");

  const scoped = useMemo(
    () => (currentRep === "All"
      ? customers
      : customers.filter((c) => c.created_by === currentRep || c.transferred_from === currentRep || c.transferred_to === currentRep)),
    [customers, currentRep],
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return scoped;
    return scoped.filter((c) =>
      c.full_name.toLowerCase().includes(s) ||
      c.phone.includes(s) ||
      c.company.toLowerCase().includes(s) ||
      c.line_id.toLowerCase().includes(s) ||
      c.created_by.toLowerCase().includes(s) ||
      (c.email ?? "").toLowerCase().includes(s),
    );
  }, [scoped, q]);

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">ฐานข้อมูลลูกค้า</h1>
          <p className="text-sm text-muted-foreground">
            {currentRep === "All" ? "จัดการข้อมูลลูกค้าทั้งทีม" : `ฐานข้อมูลลูกค้าของ ${currentRep}`} — {filtered.length} รายการ
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportCSV(filtered)}><Download className="w-4 h-4 mr-2" /> Export CSV</Button>
          <Button className="bg-gradient-primary" onClick={() => setOpenAdd(true)}><Plus className="w-4 h-4 mr-2" /> เพิ่มลูกค้า / สร้าง Lead</Button>
        </div>
      </div>

      <div className="bg-card rounded-xl border shadow-soft p-4">
        <div className="relative max-w-xl">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่อ, เบอร์โทร, องค์กร, Line ID, อีเมล, ชื่อ Sales..." className="pl-9" />
        </div>
      </div>

      <div className="bg-card rounded-xl border shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left p-3 font-medium">ชื่อลูกค้า / องค์กร</th>
                <th className="text-left p-3 font-medium">ติดต่อ (เบอร์ / Line)</th>
                <th className="text-left p-3 font-medium">ช่องทาง / กลุ่ม</th>
                <th className="text-left p-3 font-medium">ระดับ (Tier)</th>
                <th className="text-left p-3 font-medium">Sales เจ้าของ</th>
                <th className="text-right p-3 font-medium">ยอดซื้อรวม</th>
                <th className="p-3 font-medium w-28">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((c) => (
                <tr key={c.customer_id} className="hover:bg-muted/30 transition">
                  <td className="p-3">
                    <div className="font-semibold">{c.full_name}</div>
                    <div className="text-xs text-muted-foreground">{c.company !== "-" ? c.company : "B2C"}</div>
                    {c.transferred_from === currentRep && c.transferred_to && (
                      <div className="mt-1 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-300">
                        <ArrowRightLeft className="w-2.5 h-2.5" /> โอนลูกค้า → {c.transferred_to}
                        {c.transferred_at && <span className="opacity-70">· {new Date(c.transferred_at).toLocaleDateString("th-TH")}</span>}
                      </div>
                    )}
                    {c.transferred_to === currentRep && c.transferred_from && c.transferred_from !== currentRep && (
                      <div className="mt-1 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-300">
                        <Inbox className="w-2.5 h-2.5" /> รับโอนจาก {c.transferred_from}
                        {c.transferred_at && <span className="opacity-70">· {new Date(c.transferred_at).toLocaleDateString("th-TH")}</span>}
                      </div>
                    )}
                    {c.created_at && (
                      <div className="mt-1 text-[10px] text-muted-foreground">เพิ่มเมื่อ {new Date(c.created_at).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })}</div>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5 text-xs"><Phone className="w-3 h-3 text-primary" /> {c.phone}</div>
                    <div className="flex items-center gap-1.5 text-xs text-success mt-0.5"><MessageCircle className="w-3 h-3" /> {c.line_id}</div>
                  </td>
                  <td className="p-3">
                    <div className="text-sm">{c.source}</div>
                    <div className="text-xs text-muted-foreground">{c.segment}</div>
                  </td>
                  <td className="p-3"><Badge variant="outline" className={tierBadge(c.customer_tier)}>{c.customer_tier}</Badge></td>
                  <td className="p-3">
                    <div className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-accent/10 text-accent border border-accent/30">
                      <span className="w-5 h-5 rounded-full bg-gradient-pink text-accent-foreground flex items-center justify-center text-[10px] font-bold">{c.created_by[0]}</span>
                      <span className="font-semibold">{c.created_by}</span>
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <div className="font-semibold">{formatTHB(c.total_spend)}</div>
                    <div className="text-xs text-muted-foreground">{c.total_trips} ทริป</div>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {c.transferred_from === currentRep && c.transferred_to ? (
                        <span title="โอนแล้ว ไม่สามารถแก้ไขได้" className="inline-flex items-center text-muted-foreground">
                          <Lock className="w-4 h-4" />
                        </span>
                      ) : (
                        <>
                          <Button size="icon" variant="ghost" onClick={() => setEditing(c)} title="แก้ไข"><Pencil className="w-4 h-4 text-primary" /></Button>
                          {currentRep !== "All" && c.created_by === currentRep && (
                            <Button size="icon" variant="ghost" title="โอนลูกค้า" onClick={() => { setTransferOf(c); setTransferTo(""); }}>
                              <ArrowRightLeft className="w-4 h-4 text-amber-600" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="p-12 text-center text-muted-foreground">ไม่พบข้อมูลลูกค้า</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CustomerLeadDialog open={openAdd} onOpenChange={setOpenAdd} />
      <EditCustomerDialog customer={editing} onClose={() => setEditing(null)} />

      <Dialog open={!!transferOf} onOpenChange={(o) => !o && setTransferOf(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>โอนลูกค้าให้ Sales คนอื่น</DialogTitle></DialogHeader>
          {transferOf && (
            <div className="space-y-3">
              <p className="text-sm">
                ลูกค้า: <b>{transferOf.full_name}</b>{transferOf.company !== "-" && ` · ${transferOf.company}`}
              </p>
              <p className="text-xs text-muted-foreground">
                หลังโอน ลูกค้านี้จะยังแสดงในระบบของคุณในสถานะ "โอนลูกค้า" และไม่สามารถแก้ไขข้อมูลได้
              </p>
              <div>
                <label className="text-xs font-semibold">เลือก Sales ปลายทาง</label>
                <Select value={transferTo} onValueChange={(v) => setTransferTo(v as SalesRep)}>
                  <SelectTrigger><SelectValue placeholder="เลือก Sales..." /></SelectTrigger>
                  <SelectContent>
                    {SALES_REPS.filter((r) => r !== transferOf.created_by).map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferOf(null)}>ยกเลิก</Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              disabled={!transferTo}
              onClick={() => {
                if (!transferOf || !transferTo) return;
                transferCustomer(transferOf.customer_id, transferTo as SalesRep);
                toast.success(`โอนลูกค้า ${transferOf.full_name} ให้ ${transferTo} แล้ว`);
                setTransferOf(null);
              }}
            >ยืนยันโอน</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}