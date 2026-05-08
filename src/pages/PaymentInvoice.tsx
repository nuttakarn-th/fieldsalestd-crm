import { Wallet, Plus, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const sample = [
  { id: "INV-2026-001", customer: "บมจ. พัฒนาดี", amount: 145000, status: "Paid", date: "2026-04-22" },
  { id: "INV-2026-002", customer: "บจก. เอสบี แทรเวล", amount: 89000, status: "Pending", date: "2026-04-29" },
  { id: "INV-2026-003", customer: "โรงพยาบาลสุขใจ", amount: 220000, status: "Overdue", date: "2026-04-10" },
];

export default function PaymentInvoice() {
  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <Wallet className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Payment / Invoice</h1>
            <p className="text-sm text-muted-foreground">จัดการใบแจ้งหนี้และการชำระเงิน</p>
          </div>
        </div>
        <Button className="bg-gradient-pink text-accent-foreground"><Plus className="w-4 h-4 mr-1" /> สร้าง Invoice</Button>
      </div>
      <div className="bg-card rounded-xl border shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Invoice No.</th>
                <th className="p-3 text-left">ลูกค้า</th>
                <th className="p-3 text-left">วันที่</th>
                <th className="p-3 text-right">ยอด</th>
                <th className="p-3 text-center">สถานะ</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sample.map((r) => (
                <tr key={r.id} className="hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs">{r.id}</td>
                  <td className="p-3 font-semibold">{r.customer}</td>
                  <td className="p-3 text-xs">{r.date}</td>
                  <td className="p-3 text-right font-bold">{r.amount.toLocaleString()}</td>
                  <td className="p-3 text-center">
                    <Badge variant="outline" className={r.status === "Paid" ? "bg-success/15 text-success border-success/30" : r.status === "Pending" ? "bg-warning/20 text-warning-foreground border-warning/40" : "bg-destructive/15 text-destructive border-destructive/30"}>
                      {r.status}
                    </Badge>
                  </td>
                  <td className="p-3 text-right"><Button size="sm" variant="outline"><Receipt className="w-4 h-4 mr-1" /> ดู</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}