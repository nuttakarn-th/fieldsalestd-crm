import { useMemo } from "react";
import { BarChart3, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { useCRM, formatTHB } from "@/store/crmStore";

export default function FinancialReport() {
  const leads = useCRM((s) => s.leads);
  const stats = useMemo(() => {
    const won = leads.filter((l) => l.status === "Closed Won");
    const total = won.reduce((s, l) => s + l.quoted_price, 0);
    const dom = won.filter((l) => l.scope === "Domestic").reduce((s, l) => s + l.quoted_price, 0);
    const intl = won.filter((l) => l.scope === "International").reduce((s, l) => s + l.quoted_price, 0);
    const cost = total * 0.62;
    const profit = total - cost;
    return { total, dom, intl, cost, profit, count: won.length };
  }, [leads]);
  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-gold flex items-center justify-center shadow-glow">
          <BarChart3 className="w-5 h-5 text-gold-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Financial Report</h1>
          <p className="text-sm text-muted-foreground">รายงานทางการเงิน · รวมทั้งระบบ</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card label="Revenue รวม" value={formatTHB(stats.total)} icon={DollarSign} tone="success" />
        <Card label="ต้นทุน (ประมาณ)" value={formatTHB(stats.cost)} icon={TrendingDown} tone="warning" />
        <Card label="กำไรสุทธิ" value={formatTHB(stats.profit)} icon={TrendingUp} tone="primary" />
        <Card label="ดีลที่ปิดได้" value={`${stats.count}`} icon={BarChart3} tone="accent" />
      </div>
      <div className="bg-card rounded-xl border shadow-soft p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
        <div><p className="text-xs text-muted-foreground">สัดส่วน Domestic</p><p className="text-2xl font-bold">{formatTHB(stats.dom)}</p></div>
        <div><p className="text-xs text-muted-foreground">สัดส่วน International</p><p className="text-2xl font-bold">{formatTHB(stats.intl)}</p></div>
      </div>
    </div>
  );
}
function Card({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof BarChart3; tone: string }) {
  const cls = tone === "success" ? "bg-success/15 text-success" : tone === "warning" ? "bg-warning/20 text-warning-foreground" : tone === "accent" ? "bg-accent/15 text-accent" : "bg-primary/10 text-primary";
  return (
    <div className="bg-card rounded-xl border p-5 shadow-soft flex items-center gap-4">
      <div className={`p-3 rounded-lg ${cls}`}><Icon className="w-6 h-6" /></div>
      <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-bold truncate">{value}</p></div>
    </div>
  );
}