import { BarChart3, TrendingUp, Users, MousePointerClick } from "lucide-react";

export default function MarketingReport() {
  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
          <BarChart3 className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Marketing Report</h1>
          <p className="text-sm text-muted-foreground">สรุปประสิทธิภาพช่องทางการตลาด</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card label="Impressions" value="245,890" icon={MousePointerClick} />
        <Card label="Click-Through Rate" value="3.4%" icon={TrendingUp} />
        <Card label="Lead Conversion" value="187" icon={Users} />
        <Card label="Cost / Lead" value="฿245" icon={BarChart3} />
      </div>
      <div className="bg-card rounded-xl border shadow-soft p-6">
        <h3 className="font-bold mb-4">Lead Source Breakdown</h3>
        {[
          { src: "Facebook Ads", v: 78, color: "bg-blue-500" },
          { src: "Google Ads", v: 45, color: "bg-emerald-500" },
          { src: "Line OA", v: 32, color: "bg-green-500" },
          { src: "Email Campaign", v: 22, color: "bg-purple-500" },
          { src: "Referral / Walk-in", v: 10, color: "bg-amber-500" },
        ].map((s) => (
          <div key={s.src} className="flex items-center gap-3 mb-2">
            <span className="w-40 text-sm">{s.src}</span>
            <div className="flex-1 h-5 bg-muted rounded overflow-hidden"><div className={`h-full ${s.color}`} style={{ width: `${s.v}%` }} /></div>
            <span className="w-10 text-right font-bold">{s.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
function Card({ label, value, icon: Icon }: { label: string; value: string; icon: typeof BarChart3 }) {
  return (
    <div className="bg-card rounded-xl border p-5 shadow-soft flex flex-col items-center justify-center text-center min-h-[150px] gap-2">
      <div className="p-2.5 rounded-lg bg-accent/15 text-accent"><Icon className="w-5 h-5" /></div>
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <p className="text-3xl md:text-4xl font-extrabold leading-none break-all">{value}</p>
    </div>
  );
}