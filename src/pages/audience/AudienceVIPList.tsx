/**
 * AudienceVIPList.tsx
 * ลูกค้า Tier VIP + Regular → ส่งโปรพิเศษก่อนใคร / Early Access
 */
import { useState, useMemo } from "react";
import { Diamond, Download, Star, Users } from "lucide-react";
import { useCRM } from "@/store/crmStore";
import { toast } from "sonner";

function exportCSV(rows: string[][], filename: string) {
  const csv = rows.map((r) => r.map((c) => `"${(c??"").replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob = new Blob(["﻿"+csv],{type:"text/csv;charset=utf-8;"}); const url=URL.createObjectURL(blob);
  const a=document.createElement("a"); a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url);
}

export default function AudienceVIPList() {
  const customers = useCRM((s) => s.customers);
  const [tierFilter, setTierFilter] = useState<"VIP"|"Regular"|"All">("All");

  const vips = useMemo(() =>
    customers
      .filter((c) => tierFilter==="All" ? c.customer_tier!=="New" : c.customer_tier===tierFilter)
      .sort((a,b) => {
        if (a.customer_tier==="VIP" && b.customer_tier!=="VIP") return -1;
        if (b.customer_tier==="VIP" && a.customer_tier!=="VIP") return 1;
        return b.total_spend - a.total_spend;
      }),
  [customers, tierFilter]);

  const vipCount     = customers.filter((c)=>c.customer_tier==="VIP").length;
  const regularCount = customers.filter((c)=>c.customer_tier==="Regular").length;
  const totalSpend   = vips.reduce((s,c)=>s+c.total_spend, 0);

  function doExport() {
    const header = ["ชื่อ","เบอร์โทร","LINE ID","Tier","ทริปทั้งหมด","ยอดซื้อรวม","ความสนใจ"];
    const rows = vips.map((c) => [
      c.full_name, c.phone, c.line_id??"-", c.customer_tier,
      String(c.total_trips), String(c.total_spend),
      (c.interests??[]).join("|"),
    ]);
    exportCSV([header,...rows], `VIP_loyalty_list_${new Date().toISOString().slice(0,10)}.csv`);
    toast.success(`Export ${vips.length} VIP/Regular Customers แล้ว ✅`);
  }

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-glow">
          <Diamond className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold">VIP Loyalty List</h1>
          <p className="text-sm text-muted-foreground">ลูกค้า VIP + Regular — ส่งโปรพิเศษก่อนใคร / Early Access</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded-xl p-4 text-center">
          <Diamond className="w-5 h-5 mx-auto text-amber-500 mb-1"/>
          <p className="text-2xl font-extrabold text-amber-600">{vipCount}</p>
          <p className="text-xs text-muted-foreground">VIP</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 rounded-xl p-4 text-center">
          <Star className="w-5 h-5 mx-auto text-blue-500 mb-1"/>
          <p className="text-2xl font-extrabold text-blue-600">{regularCount}</p>
          <p className="text-xs text-muted-foreground">Regular</p>
        </div>
        <div className="bg-card border rounded-xl p-4 text-center">
          <Users className="w-5 h-5 mx-auto text-muted-foreground mb-1"/>
          <p className="text-2xl font-extrabold">฿{(totalSpend/1000).toFixed(0)}K</p>
          <p className="text-xs text-muted-foreground">ยอดซื้อรวม</p>
        </div>
      </div>

      <div className="flex gap-2 items-center flex-wrap">
        {(["All","VIP","Regular"] as const).map((t) => (
          <button key={t} onClick={()=>setTierFilter(t)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${tierFilter===t?"bg-violet-600 text-white":"bg-muted text-muted-foreground hover:bg-accent"}`}>
            {t==="All"?"ทั้งหมด (VIP+Regular)":t}
          </button>
        ))}
        <button onClick={doExport} disabled={vips.length===0} className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 transition-all">
          <Download className="w-4 h-4"/> Export CSV ({vips.length})
        </button>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden shadow-soft">
        <div className="bg-muted/40 border-b px-4 py-2 grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 text-xs font-semibold text-muted-foreground">
          <span>ลูกค้า</span><span>LINE ID</span><span>Tier</span><span>ทริป</span><span>ยอดซื้อ</span>
        </div>
        <div className="divide-y max-h-[420px] overflow-y-auto">
          {vips.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">ไม่พบลูกค้า VIP / Regular</div>
          ) : vips.map((c) => (
            <div key={c.customer_id} className="px-4 py-2.5 grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 items-center hover:bg-muted/20">
              <div>
                <p className="font-semibold text-sm">{c.full_name}</p>
                <p className="text-xs text-muted-foreground">{c.phone} {c.interests?.length?`· ${c.interests.slice(0,2).join(", ")}`:""}</p>
              </div>
              <span className="text-xs text-muted-foreground">{c.line_id||"—"}</span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${c.customer_tier==="VIP"?"bg-amber-100 text-amber-700":"bg-blue-100 text-blue-700"}`}>{c.customer_tier}</span>
              <span className="text-xs font-medium">{c.total_trips}</span>
              <span className="text-xs font-semibold text-emerald-600">฿{c.total_spend.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
