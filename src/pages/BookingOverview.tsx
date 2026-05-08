import { PackageSearch, Calendar, Users, Plane } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const bookings = [
  { id: "BK-2026-101", customer: "ครอบครัวสมิธ", program: "ทัวร์คุนหมิง 4D3N", pax: 6, date: "2026-05-15", status: "Confirmed" },
  { id: "BK-2026-102", customer: "บริษัท ABC Corp", program: "Incentive ภูเก็ต", pax: 50, date: "2026-06-02", status: "Pending Doc" },
  { id: "BK-2026-103", customer: "คุณวิชัย", program: "เช่ารถ Van 3 วัน", pax: 8, date: "2026-05-08", status: "Confirmed" },
  { id: "BK-2026-104", customer: "คุณสิริวรรณ", program: "Visa Japan + Insurance", pax: 2, date: "2026-05-20", status: "In Progress" },
];

export default function BookingOverview() {
  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
          <PackageSearch className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Booking Overview</h1>
          <p className="text-sm text-muted-foreground">ภาพรวมการจอง — สำหรับ Co-Ordinator</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat label="Booking ทั้งหมด" value={`${bookings.length}`} icon={Calendar} />
        <Stat label="ลูกค้ารวม" value={`${bookings.reduce((s, b) => s + b.pax, 0)}`} icon={Users} />
        <Stat label="รอเอกสาร" value={`${bookings.filter((b) => b.status !== "Confirmed").length}`} icon={Plane} />
      </div>
      <div className="bg-card rounded-xl border shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Booking ID</th>
                <th className="p-3 text-left">ลูกค้า</th>
                <th className="p-3 text-left">โปรแกรม</th>
                <th className="p-3 text-center">Pax</th>
                <th className="p-3 text-left">วันเดินทาง</th>
                <th className="p-3 text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {bookings.map((b) => (
                <tr key={b.id} className="hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs">{b.id}</td>
                  <td className="p-3 font-semibold">{b.customer}</td>
                  <td className="p-3">{b.program}</td>
                  <td className="p-3 text-center">{b.pax}</td>
                  <td className="p-3 text-xs">{b.date}</td>
                  <td className="p-3 text-center">
                    <Badge variant="outline" className={b.status === "Confirmed" ? "bg-success/15 text-success border-success/30" : "bg-warning/20 text-warning-foreground border-warning/40"}>
                      {b.status}
                    </Badge>
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
function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Calendar }) {
  return (
    <div className="bg-card rounded-xl border p-5 shadow-soft flex items-center gap-4">
      <div className="p-3 rounded-lg bg-primary/10 text-primary"><Icon className="w-6 h-6" /></div>
      <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-bold">{value}</p></div>
    </div>
  );
}