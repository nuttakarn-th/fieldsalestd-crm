/**
 * ProvinceHeatmap.tsx
 * แผนที่ความร้อนรายจังหวัด — Customers / Leads / Revenue
 * จัดกลุ่มตาม 6 ภูมิภาค, toggle metric, click เพื่อดูรายละเอียด
 */
import { useMemo, useState } from "react";
import { MapPin, Users, KanbanSquare, DollarSign, TrendingUp } from "lucide-react";
import { useCRM, formatTHB } from "@/store/crmStore";
import { Badge } from "@/components/ui/badge";

// ─── ข้อมูล 77 จังหวัด จัดตามภูมิภาค ──────────────────────────────────────
const REGIONS: { name: string; color: string; provinces: string[] }[] = [
  {
    name: "ภาคเหนือ",
    color: "blue",
    provinces: [
      "เชียงใหม่","เชียงราย","ลำปาง","ลำพูน","แม่ฮ่องสอน",
      "น่าน","พะเยา","แพร่","อุตรดิตถ์","ตาก",
      "สุโขทัย","พิษณุโลก","เพชรบูรณ์","กำแพงเพชร","พิจิตร",
    ],
  },
  {
    name: "ภาคตะวันออกเฉียงเหนือ",
    color: "orange",
    provinces: [
      "ขอนแก่น","อุดรธานี","นครราชสีมา","บึงกาฬ","หนองคาย",
      "หนองบัวลำภู","เลย","กาฬสินธุ์","มหาสารคาม","ร้อยเอ็ด",
      "อุบลราชธานี","ศรีสะเกษ","สุรินทร์","บุรีรัมย์","ชัยภูมิ",
      "นครพนม","มุกดาหาร","สกลนคร","ยโสธร","อำนาจเจริญ",
    ],
  },
  {
    name: "ภาคกลาง",
    color: "violet",
    provinces: [
      "กรุงเทพมหานคร","นนทบุรี","ปทุมธานี","สมุทรปราการ","นครปฐม",
      "สมุทรสาคร","สมุทรสงคราม","อ่างทอง","พระนครศรีอยุธยา","สิงห์บุรี",
      "ชัยนาท","ลพบุรี","สระบุรี","นครนายก","ปราจีนบุรี",
      "สระแก้ว","ฉะเชิงเทรา","กาญจนบุรี","ราชบุรี","สุพรรณบุรี",
      "นครสวรรค์","อุทัยธานี",
    ],
  },
  {
    name: "ภาคตะวันออก",
    color: "teal",
    provinces: [
      "ชลบุรี","ระยอง","จันทบุรี","ตราด","ฉะเชิงเทรา","สระแก้ว",
    ],
  },
  {
    name: "ภาคตะวันตก",
    color: "rose",
    provinces: [
      "กาญจนบุรี","ราชบุรี","เพชรบุรี","ประจวบคีรีขันธ์","ตาก","สมุทรสงคราม",
    ],
  },
  {
    name: "ภาคใต้",
    color: "emerald",
    provinces: [
      "สงขลา","ภูเก็ต","สุราษฎร์ธานี","นครศรีธรรมราช","กระบี่",
      "ตรัง","พัทลุง","สตูล","ยะลา","ปัตตานี",
      "นราธิวาส","ระนอง","ชุมพร","พังงา","สุราษฎร์ธานี",
    ],
  },
];

// De-dup provinces across regions (some appear in multiple)
const ALL_PROVINCES = Array.from(
  new Set(REGIONS.flatMap((r) => r.provinces))
).sort();

// ─── Color scale helper ───────────────────────────────────────────────────────
type Metric = "customers" | "leads" | "revenue";

function getIntensityClass(value: number, max: number, color: string): string {
  if (max === 0 || value === 0) return "bg-muted/30 text-muted-foreground border-transparent";
  const pct = value / max;
  const colorMap: Record<string, string[]> = {
    blue:   ["bg-blue-50 text-blue-400","bg-blue-100 text-blue-500","bg-blue-200 text-blue-600","bg-blue-400 text-white","bg-blue-600 text-white","bg-blue-800 text-white"],
    orange: ["bg-orange-50 text-orange-400","bg-orange-100 text-orange-500","bg-orange-200 text-orange-600","bg-orange-400 text-white","bg-orange-600 text-white","bg-orange-800 text-white"],
    violet: ["bg-violet-50 text-violet-400","bg-violet-100 text-violet-500","bg-violet-200 text-violet-600","bg-violet-400 text-white","bg-violet-600 text-white","bg-violet-800 text-white"],
    teal:   ["bg-teal-50 text-teal-400","bg-teal-100 text-teal-500","bg-teal-200 text-teal-600","bg-teal-400 text-white","bg-teal-600 text-white","bg-teal-800 text-white"],
    rose:   ["bg-rose-50 text-rose-400","bg-rose-100 text-rose-500","bg-rose-200 text-rose-600","bg-rose-400 text-white","bg-rose-600 text-white","bg-rose-800 text-white"],
    emerald:["bg-emerald-50 text-emerald-400","bg-emerald-100 text-emerald-500","bg-emerald-200 text-emerald-600","bg-emerald-400 text-white","bg-emerald-600 text-white","bg-emerald-800 text-white"],
  };
  const steps = colorMap[color] ?? colorMap["violet"];
  const idx = Math.min(Math.floor(pct * (steps.length - 0.01)), steps.length - 1);
  return steps[idx];
}

const REGION_BORDER: Record<string, string> = {
  blue: "border-blue-200", orange: "border-orange-200", violet: "border-violet-200",
  teal: "border-teal-200", rose: "border-rose-200", emerald: "border-emerald-200",
};
const REGION_HEADER: Record<string, string> = {
  blue: "text-blue-700 bg-blue-50", orange: "text-orange-700 bg-orange-50",
  violet: "text-violet-700 bg-violet-50", teal: "text-teal-700 bg-teal-50",
  rose: "text-rose-700 bg-rose-50", emerald: "text-emerald-700 bg-emerald-50",
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProvinceHeatmap() {
  const customers = useCRM((s) => s.customers);
  const leads     = useCRM((s) => s.leads);
  const currentRep = useCRM((s) => s.currentRep);

  const [metric, setMetric] = useState<Metric>("customers");
  const [selected, setSelected] = useState<string | null>(null);

  // ── Scoped leads/customers ─────────────────────────────────────────────
  const scopedCustomers = useMemo(
    () => currentRep === "All" ? customers : customers.filter((c) => c.created_by === currentRep),
    [customers, currentRep]
  );
  const scopedLeads = useMemo(
    () => currentRep === "All" ? leads : leads.filter((l) => l.assigned_to === currentRep),
    [leads, currentRep]
  );

  // ── Province stats ─────────────────────────────────────────────────────
  const provinceStats = useMemo(() => {
    const map: Record<string, { customers: number; leads: number; revenue: number }> = {};
    ALL_PROVINCES.forEach((p) => { map[p] = { customers: 0, leads: 0, revenue: 0 }; });

    scopedCustomers.forEach((c) => {
      if (c.province && map[c.province]) {
        map[c.province].customers += 1;
      }
    });

    scopedLeads.forEach((l) => {
      const cust = customers.find((c) => c.customer_id === l.customer_id);
      if (cust?.province && map[cust.province]) {
        map[cust.province].leads += 1;
        if (l.status === "จองแล้ว") {
          map[cust.province].revenue += l.quoted_price || 0;
        }
      }
    });

    return map;
  }, [scopedCustomers, scopedLeads, customers]);

  const maxValue = useMemo(
    () => Math.max(1, ...Object.values(provinceStats).map((s) => s[metric])),
    [provinceStats, metric]
  );

  // ── Ranking list (top 10) ───────────────────────────────────────────────
  const ranking = useMemo(
    () =>
      ALL_PROVINCES
        .map((p) => ({ province: p, value: provinceStats[p]?.[metric] ?? 0 }))
        .filter((x) => x.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 10),
    [provinceStats, metric]
  );

  // ── Selected province detail ────────────────────────────────────────────
  const selectedStats = selected ? provinceStats[selected] : null;
  const selectedCustomers = selected
    ? scopedCustomers.filter((c) => c.province === selected)
    : [];

  const totalCustomers = Object.values(provinceStats).reduce((s, v) => s + v.customers, 0);
  const totalLeads     = Object.values(provinceStats).reduce((s, v) => s + v.leads, 0);
  const totalRevenue   = Object.values(provinceStats).reduce((s, v) => s + v.revenue, 0);

  const METRICS: { key: Metric; label: string; icon: React.ElementType; color: string }[] = [
    { key: "customers", label: "ลูกค้า",     icon: Users,       color: "bg-primary text-primary-foreground" },
    { key: "leads",     label: "Leads",      icon: KanbanSquare, color: "bg-amber-500 text-white" },
    { key: "revenue",   label: "Revenue",    icon: DollarSign,  color: "bg-emerald-500 text-white" },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Province Heatmap</h1>
            <p className="text-sm text-muted-foreground">
              การกระจายตัวลูกค้าและ Leads รายจังหวัด
              {currentRep !== "All" && <span className="ml-1 font-semibold text-primary">— {currentRep}</span>}
            </p>
          </div>
        </div>
        {/* Metric toggle */}
        <div className="flex gap-1.5 p-1 bg-muted rounded-xl">
          {METRICS.map((m) => (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                metric === m.key ? m.color + " shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <m.icon className="w-3.5 h-3.5" />
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "ลูกค้าทั้งหมด", value: totalCustomers + " ราย", icon: Users, color: "text-primary" },
          { label: "Leads ทั้งหมด", value: totalLeads + " leads", icon: KanbanSquare, color: "text-amber-600" },
          { label: "Revenue (Won)", value: formatTHB(totalRevenue), icon: TrendingUp, color: "text-emerald-600" },
        ].map((s) => (
          <div key={s.label} className="bg-card border rounded-xl p-3 text-center shadow-sm">
            <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
            <p className="text-lg font-bold">{s.value}</p>
            <p className="text-[11px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* ── Heatmap Grid ──────────────────────────────────────────────── */}
        <div className="xl:col-span-2 space-y-4">
          {REGIONS.map((region) => {
            // de-dup provinces within this region
            const uniqueProvinces = Array.from(new Set(region.provinces));
            return (
              <div key={region.name} className={`border rounded-xl overflow-hidden ${REGION_BORDER[region.color]}`}>
                <div className={`px-3 py-2 flex items-center justify-between ${REGION_HEADER[region.color]}`}>
                  <span className="text-xs font-bold uppercase tracking-wider">{region.name}</span>
                  <span className="text-[11px] font-medium opacity-70">{uniqueProvinces.length} จังหวัด</span>
                </div>
                <div className="p-2.5 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5">
                  {uniqueProvinces.map((province) => {
                    const stats = provinceStats[province] ?? { customers: 0, leads: 0, revenue: 0 };
                    const val = stats[metric];
                    const intensity = getIntensityClass(val, maxValue, region.color);
                    const isSelected = selected === province;
                    return (
                      <button
                        key={province}
                        onClick={() => setSelected(isSelected ? null : province)}
                        className={`relative rounded-lg border px-1.5 py-2 text-center transition-all hover:scale-105 hover:shadow-md ${intensity} ${
                          isSelected ? "ring-2 ring-offset-1 ring-primary scale-105 shadow-md" : ""
                        }`}
                      >
                        <p className="text-[10px] font-semibold leading-tight truncate">{province}</p>
                        {val > 0 && (
                          <p className="text-[11px] font-bold mt-0.5">
                            {metric === "revenue" ? `฿${Math.round(val / 1000)}K` : val}
                          </p>
                        )}
                        {val === 0 && <p className="text-[10px] opacity-40 mt-0.5">—</p>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Legend */}
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground px-1">
            <span>น้อย</span>
            <div className="flex gap-0.5">
              {["bg-muted/30","bg-primary/20","bg-primary/40","bg-primary/60","bg-primary/80","bg-primary"].map((c, i) => (
                <div key={i} className={`w-5 h-3 rounded-sm ${c}`} />
              ))}
            </div>
            <span>มาก</span>
          </div>
        </div>

        {/* ── Right Panel ───────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Selected Province Detail */}
          {selected && selectedStats ? (
            <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b bg-primary/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <h3 className="font-bold">{selected}</h3>
                </div>
                <button onClick={() => setSelected(null)} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-primary/5 rounded-lg p-2">
                    <p className="text-xl font-bold text-primary">{selectedStats.customers}</p>
                    <p className="text-[10px] text-muted-foreground">ลูกค้า</p>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-2">
                    <p className="text-xl font-bold text-amber-600">{selectedStats.leads}</p>
                    <p className="text-[10px] text-muted-foreground">Leads</p>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-lg p-2">
                    <p className="text-sm font-bold text-emerald-600">{formatTHB(selectedStats.revenue)}</p>
                    <p className="text-[10px] text-muted-foreground">Revenue</p>
                  </div>
                </div>

                {selectedCustomers.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1.5">ลูกค้าในจังหวัดนี้</p>
                    <ul className="space-y-1">
                      {selectedCustomers.slice(0, 5).map((c) => (
                        <li key={c.customer_id} className="flex items-center gap-2 text-sm">
                          <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                            {c.full_name.charAt(0)}
                          </div>
                          <span className="truncate">{c.full_name}</span>
                          <Badge variant="outline" className="text-[10px] shrink-0 ml-auto">{c.customer_tier}</Badge>
                        </li>
                      ))}
                      {selectedCustomers.length > 5 && (
                        <p className="text-xs text-muted-foreground text-center pt-1">
                          +{selectedCustomers.length - 5} รายอื่น
                        </p>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-card border rounded-xl p-4 text-center text-sm text-muted-foreground">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
              คลิกที่จังหวัดใดก็ได้<br />เพื่อดูรายละเอียด
            </div>
          )}

          {/* Top 10 Ranking */}
          <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Top 10 จังหวัด
                <span className="text-xs text-muted-foreground font-normal">
                  ({metric === "customers" ? "ลูกค้า" : metric === "leads" ? "Leads" : "Revenue"})
                </span>
              </h3>
            </div>
            {ranking.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground text-center">
                ยังไม่มีข้อมูลจังหวัดใน customers
              </p>
            ) : (
              <ol className="divide-y">
                {ranking.map((item, idx) => {
                  const pct = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
                  return (
                    <li
                      key={item.province}
                      className={`px-4 py-2.5 flex items-center gap-3 hover:bg-muted/30 cursor-pointer transition-colors ${
                        selected === item.province ? "bg-primary/5" : ""
                      }`}
                      onClick={() => setSelected(selected === item.province ? null : item.province)}
                    >
                      <span className={`text-xs font-bold w-5 text-center shrink-0 ${
                        idx === 0 ? "text-amber-500" : idx === 1 ? "text-slate-400" : idx === 2 ? "text-orange-500" : "text-muted-foreground"
                      }`}>
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-sm font-medium truncate">{item.province}</span>
                          <span className="text-xs font-bold text-primary shrink-0 ml-2">
                            {metric === "revenue" ? formatTHB(item.value) : item.value}
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          {/* จังหวัดที่ยังไม่มีข้อมูล */}
          {totalCustomers === 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded-xl p-4 text-sm text-amber-700 dark:text-amber-300">
              <p className="font-semibold mb-1">💡 เพิ่มข้อมูลจังหวัด</p>
              <p className="text-xs">
                ยังไม่มีลูกค้าที่ระบุจังหวัด — ไปที่หน้า Leads/Customers แล้วแก้ไขข้อมูลลูกค้าเพื่อเพิ่มจังหวัดได้เลย
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
