/**
 * AudienceColdLead.tsx
 * Lead ที่ไม่มีการเคลื่อนไหว 60-90 วัน → Nurture ด้วย Seasonal Promo
 * Sales เห็นเฉพาะ Lead ของตัวเอง
 */
import { useState, useMemo } from "react";
import { RefreshCcw, Download, Clock, AlertTriangle } from "lucide-react";
import { useCRM } from "@/store/crmStore";
import { useCurrentUser } from "@/store/authStore";
import { toast } from "sonner";

function daysSince(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}
function exportCSV(rows: string[][], filename: string) {
  const csv = rows.map((r) => r.map((c) => `"${(c??"").replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob = new Blob(["﻿"+csv],{type:"text/csv;charset=utf-8;"}); const url=URL.createObjectURL(blob);
  const a=document.createElement("a"); a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url);
}

export default function AudienceColdLead() {
  const { leads, customers } = useCRM();
  const user   = useCurrentUser();
  const isSales = user?.role === "Sales";
  const [threshold, setThreshold] = useState<60|90>(60);

  const coldLeads = useMemo(() => {
    return leads
      .filter((l) => {
        if (l.status === "Closed Won" || l.status === "Closed Lost") return false;
        if (isSales && l.assigned_to !== user?.full_name) return false;
        // ใช้ next_followup_date หรือ lead_id timestamp เป็น proxy สำหรับ last activity
        const lastActivity = l.next_followup_date
          ? daysSince(l.next_followup_date)
          : daysSince(new Date(parseInt(l.lead_id.replace("L",""),10)).toISOString());
        return lastActivity !== null && lastActivity >= threshold;
      })
      .map((l) => {
        const cust = customers.find((c) => c.customer_id === l.customer_id);
        const inactive = l.next_followup_date
          ? daysSince(l.next_followup_date)
          : daysSince(new Date(parseInt(l.lead_id.replace("L",""),10)).toISOString());
        return { ...l, cust, inactiveDays: inactive ?? 0 };
      })
      .sort((a, b) => b.inactiveDays - a.inactiveDays);
  }, [leads, customers, isSales, user, threshold]);

  const veryStale = coldLeads.filter((l) => l.inactiveDays >= 90).length;

  function doExport() {
    const header = ["ชื่อลูกค้า","เบอร์โทร","LINE ID","Sales Rep","BU Type","วันนัด","ไม่มีกิจกรรม(วัน)"];
    const rows = coldLeads.map((l) => [
      l.cust?.full_name ?? l.customer_id, l.cust?.phone ?? "", l.cust?.line_id ?? "",
      l.assigned_to, l.bu_type, l.next_followup_date ?? "", String(l.inactiveDays),
    ]);
    exportCSV([header,...rows], `cold_lead_reengagement_${new Date().toISOString().slice(0,10)}.csv`);
    toast.success(`Export ${coldLeads.length} Cold Leads แล้ว ✅`);
  }

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-glow">
          <RefreshCcw className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Cold Lead Re-engage</h1>
          <p className="text-sm text-muted-foreground">Lead ที่ไม่มีการเคลื่อนไหว ≥ {threshold} วัน — Nurture ด้วย Seasonal Promo</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded-xl p-4 text-center">
          <RefreshCcw className="w-5 h-5 mx-auto text-amber-500 mb-1"/>
          <p className="text-2xl font-extrabold text-amber-600">{coldLeads.length}</p>
          <p className="text-xs text-muted-foreground">Cold Leads ทั้งหมด</p>
        </div>
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 rounded-xl p-4 text-center">
          <AlertTriangle className="w-5 h-5 mx-auto text-red-500 mb-1"/>
          <p className="text-2xl font-extrabold text-red-600">{veryStale}</p>
          <p className="text-xs text-muted-foreground">ค้างนาน ≥90 วัน</p>
        </div>
        <div className="bg-card border rounded-xl p-4 text-center">
          <Clock className="w-5 h-5 mx-auto text-muted-foreground mb-1"/>
          <p className="text-2xl font-extrabold">{coldLeads.length > 0 ? Math.round(coldLeads.reduce((s,l)=>s+l.inactiveDays,0)/coldLeads.length) : 0}</p>
          <p className="text-xs text-muted-foreground">เฉลี่ย (วัน)</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <span className="text-xs text-muted-foreground font-medium">ไม่มีกิจกรรมนานกว่า:</span>
        {([60, 90] as const).map((d) => (
          <button key={d} onClick={()=>setThreshold(d)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${threshold===d?"bg-amber-600 text-white":"bg-muted text-muted-foreground hover:bg-accent"}`}>
            {d} วัน
          </button>
        ))}
        <button onClick={doExport} disabled={coldLeads.length===0} className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-40 transition-all">
          <Download className="w-4 h-4"/> Export CSV ({coldLeads.length})
        </button>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden shadow-soft">
        <div className="bg-muted/40 border-b px-4 py-2 grid grid-cols-[1fr_auto_auto_auto] gap-3 text-xs font-semibold text-muted-foreground">
          <span>ลูกค้า / Lead</span><span>Sales Rep</span><span>BU</span><span className="text-red-500">ค้างมา</span>
        </div>
        <div className="divide-y max-h-[420px] overflow-y-auto">
          {coldLeads.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">🎉 ไม่มี Cold Lead ค้างอยู่!</div>
          ) : coldLeads.map((l) => (
            <div key={l.lead_id} className={`px-4 py-3 grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center hover:bg-muted/20 ${l.inactiveDays>=90?"bg-red-50/50 dark:bg-red-950/10":""}`}>
              <div>
                <p className="font-semibold text-sm">{l.cust?.full_name ?? l.customer_id}</p>
                <p className="text-xs text-muted-foreground">{l.cust?.phone ?? ""} · {l.bu_type}</p>
              </div>
              <span className="text-xs text-muted-foreground">{l.assigned_to}</span>
              <span className="text-xs">{l.bu_type.slice(0,6)}</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${l.inactiveDays>=90?"bg-red-100 text-red-700":"bg-amber-100 text-amber-700"}`}>
                {l.inactiveDays} วัน
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
