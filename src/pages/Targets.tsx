import { useMemo, useState } from "react";
import { Target, Save, ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCRM, SALES_REPS, formatTHB, type SalesRep } from "@/store/crmStore";
import { toast } from "sonner";

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("th-TH", { month: "long", year: "numeric" });
}

export default function Targets() {
  const targets = useCRM((s) => s.targets);
  const setTarget = useCRM((s) => s.setTarget);
  const currentRep = useCRM((s) => s.currentRep);
  const isManager = currentRep === "All";

  const [cursor, setCursor] = useState(() => monthKey(new Date()));
  const shift = (n: number) => {
    const [y, m] = cursor.split("-").map(Number);
    setCursor(monthKey(new Date(y, m - 1 + n, 1)));
  };

  const rows = useMemo(() => {
    return SALES_REPS.map((rep) => {
      const t = targets.find((x) => x.month === cursor && x.rep === rep);
      return {
        rep,
        domestic_sales: t?.domestic_sales ?? 0,
        domestic_pax: t?.domestic_pax ?? 0,
        international_sales: t?.international_sales ?? 0,
        international_pax: t?.international_pax ?? 0,
      };
    });
  }, [targets, cursor]);

  const [draft, setDraft] = useState<Record<SalesRep, typeof rows[number]>>({} as never);
  const get = (rep: SalesRep) => draft[rep] ?? rows.find((r) => r.rep === rep)!;
  const update = (rep: SalesRep, field: keyof typeof rows[number], v: string) => {
    const base = get(rep);
    setDraft({ ...draft, [rep]: { ...base, [field]: parseInt(v) || 0 } });
  };

  const save = () => {
    if (!isManager) { toast.error("เฉพาะ Sales Manager เท่านั้นที่ตั้งเป้าได้"); return; }
    SALES_REPS.forEach((rep) => {
      const r = get(rep);
      setTarget(cursor, rep, {
        domestic_sales: r.domestic_sales,
        domestic_pax: r.domestic_pax,
        international_sales: r.international_sales,
        international_pax: r.international_pax,
      });
    });
    setDraft({} as never);
    toast.success(`บันทึก Target ${monthLabel(cursor)} แล้ว`);
  };

  const totals = rows.reduce(
    (acc, r) => {
      const v = get(r.rep);
      acc.dom_sales += v.domestic_sales;
      acc.dom_pax += v.domestic_pax;
      acc.intl_sales += v.international_sales;
      acc.intl_pax += v.international_pax;
      return acc;
    },
    { dom_sales: 0, dom_pax: 0, intl_sales: 0, intl_pax: 0 },
  );

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-pink flex items-center justify-center shadow-glow">
              <Target className="w-5 h-5 text-accent-foreground" />
            </div>
            <h1 className="text-2xl font-bold">Target Pipeline (Sales Manager)</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            กำหนดเป้ายอดขาย & จำนวนหัว (Pax) ของทีม แยก Domestic / International — เป้าจะแสดงในหน้า Sales ของแต่ละคน
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => shift(-1)}><ChevronLeft className="w-4 h-4" /></Button>
          <div className="px-4 h-9 rounded-md border bg-card flex items-center font-semibold min-w-44 justify-center">
            {monthLabel(cursor)}
          </div>
          <Button variant="outline" size="icon" onClick={() => shift(1)}><ChevronRight className="w-4 h-4" /></Button>
          <Button onClick={save} disabled={!isManager} className="bg-gradient-pink text-accent-foreground hover:opacity-90">
            {isManager ? <><Save className="w-4 h-4 mr-2" /> บันทึกเป้า</> : <><Lock className="w-4 h-4 mr-2" /> Manager only</>}
          </Button>
        </div>
      </div>

      {!isManager && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-warning-foreground">
          คุณกำลังดูในมุม <b>{currentRep}</b> — สลับเป็น <b>Manager</b> ที่ Sidebar เพื่อตั้งเป้าหมาย
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "เป้า Domestic (ยอด)", value: formatTHB(totals.dom_sales), tone: "bg-primary/10 text-primary" },
          { label: "เป้า Domestic (Pax)", value: `${totals.dom_pax} ท่าน`, tone: "bg-primary/10 text-primary" },
          { label: "เป้า International (ยอด)", value: formatTHB(totals.intl_sales), tone: "bg-accent/15 text-accent" },
          { label: "เป้า International (Pax)", value: `${totals.intl_pax} ท่าน`, tone: "bg-accent/15 text-accent" },
        ].map((c) => (
          <div key={c.label} className="bg-card rounded-xl border p-4 shadow-soft">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className={`text-lg font-bold mt-1 ${c.tone.split(" ")[1]}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl border shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left p-3">Sales</th>
                <th className="text-right p-3">Domestic — ยอดขาย (THB)</th>
                <th className="text-right p-3">Domestic — Pax</th>
                <th className="text-right p-3">International — ยอดขาย (THB)</th>
                <th className="text-right p-3">International — Pax</th>
                <th className="text-right p-3 bg-gold/10 text-gold-foreground">รวมเป้า</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {SALES_REPS.map((rep) => {
                const r = get(rep);
                const total = r.domestic_sales + r.international_sales;
                return (
                  <tr key={rep} className="hover:bg-muted/30">
                    <td className="p-3 font-semibold">{rep}</td>
                    <td className="p-2"><Input type="number" disabled={!isManager} value={r.domestic_sales} onChange={(e) => update(rep, "domestic_sales", e.target.value)} className="text-right" /></td>
                    <td className="p-2"><Input type="number" disabled={!isManager} value={r.domestic_pax} onChange={(e) => update(rep, "domestic_pax", e.target.value)} className="text-right" /></td>
                    <td className="p-2"><Input type="number" disabled={!isManager} value={r.international_sales} onChange={(e) => update(rep, "international_sales", e.target.value)} className="text-right" /></td>
                    <td className="p-2"><Input type="number" disabled={!isManager} value={r.international_pax} onChange={(e) => update(rep, "international_pax", e.target.value)} className="text-right" /></td>
                    <td className="p-3 text-right font-bold bg-gold/5">{formatTHB(total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}