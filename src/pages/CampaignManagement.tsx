import { Megaphone, Plus, Calendar, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const sampleCampaigns = [
  { id: "CMP-001", name: "Summer Tour Promo 2026", channel: "Facebook + Line OA", status: "Active", reach: 12450, leads: 87, period: "1-31 พ.ค. 2026" },
  { id: "CMP-002", name: "Early Bird Japan", channel: "Google Ads", status: "Scheduled", reach: 0, leads: 0, period: "10 พ.ค. - 30 มิ.ย." },
  { id: "CMP-003", name: "Incentive Corporate Campaign", channel: "Email + LinkedIn", status: "Completed", reach: 8200, leads: 45, period: "ม.ค.-มี.ค. 2026" },
];

export default function CampaignManagement() {
  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-pink flex items-center justify-center shadow-glow">
            <Megaphone className="w-5 h-5 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Campaign Management</h1>
            <p className="text-sm text-muted-foreground">จัดการแคมเปญการตลาดทั้งหมด</p>
          </div>
        </div>
        <Button className="bg-gradient-primary text-primary-foreground w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-1" /> สร้าง Campaign
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat label="Active Campaigns" value="1" icon={Calendar} />
        <Stat label="Reach รวม" value="20,650" icon={TrendingUp} />
        <Stat label="Leads รวม" value="132" icon={TrendingUp} />
      </div>

      <div className="bg-card rounded-xl border shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Campaign ID</th>
                <th className="p-3 text-left">ชื่อ</th>
                <th className="p-3 text-left">ช่องทาง</th>
                <th className="p-3 text-left">ช่วงเวลา</th>
                <th className="p-3 text-right">Reach</th>
                <th className="p-3 text-right">Leads</th>
                <th className="p-3 text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sampleCampaigns.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs">{c.id}</td>
                  <td className="p-3 font-semibold">{c.name}</td>
                  <td className="p-3 text-xs text-muted-foreground">{c.channel}</td>
                  <td className="p-3 text-xs">{c.period}</td>
                  <td className="p-3 text-right">{c.reach.toLocaleString()}</td>
                  <td className="p-3 text-right font-bold">{c.leads}</td>
                  <td className="p-3 text-center">
                    <Badge variant="outline" className={c.status === "Active" ? "bg-success/15 text-success border-success/30" : c.status === "Scheduled" ? "bg-warning/20 text-warning-foreground border-warning/40" : "bg-muted"}>
                      {c.status}
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

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Megaphone }) {
  return (
    <div className="bg-card rounded-xl border p-5 shadow-soft flex items-center gap-4">
      <div className="p-3 rounded-lg bg-primary/10 text-primary"><Icon className="w-6 h-6" /></div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </div>
  );
}