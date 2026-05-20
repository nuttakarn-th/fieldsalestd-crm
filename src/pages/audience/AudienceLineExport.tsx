/**
 * AudienceLineExport.tsx
 * Export Phone + Name + Interest สำหรับ LINE OA Broadcast
 * กรองได้ด้วย Interest Tag, Province, Tier
 */
import { useState, useMemo } from "react";
import { MessageCircle, Download, Filter, Users, Search } from "lucide-react";
import { useCRM } from "@/store/crmStore";
import { useCurrentUser } from "@/store/authStore";
import { toast } from "sonner";

const INTEREST_OPTIONS = ["ทัวร์ต่างประเทศ","ทัวร์ภายในประเทศ","เช่ารถ ท่องเที่ยว","จองตั๋วเครื่องบิน","Incentive","VIP","ครอบครัว","องค์กร"];

function exportCSV(rows: string[][], filename: string) {
  const csv = rows.map((r) => r.map((c) => `"${(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function AudienceLineExport() {
  const customers  = useCRM((s) => s.customers);
  const user       = useCurrentUser();
  const isSales    = user?.role === "Sales";

  const [search, setSearch]           = useState("");
  const [filterTier, setFilterTier]   = useState<string>("All");
  const [filterInterest, setFilterInterest] = useState<string>("All");

  const base = useMemo(() => {
    let list = customers;
    if (isSales) list = list.filter((c) => c.created_by === user?.full_name || c.transferred_to === user?.full_name);
    return list;
  }, [customers, isSales, user]);

  const filtered = useMemo(() => base.filter((c) => {
    if (filterTier !== "All" && c.customer_tier !== filterTier) return false;
    if (filterInterest !== "All" && !(c.interests ?? []).includes(filterInterest)) return false;
    if (search && !`${c.full_name} ${c.phone} ${c.line_id}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [base, filterTier, filterInterest, search]);

  function doExport() {
    const header = ["ชื่อ-นามสกุล", "เบอร์โทร", "LINE ID", "จังหวัด", "ความสนใจ", "Tier"];
    const rows = filtered.map((c) => [
      c.full_name, c.phone, c.line_id ?? "", c.province ?? "",
      (c.interests ?? []).join("|"), c.customer_tier,
    ]);
    exportCSV([header, ...rows], `LINE_broadcast_${new Date().toISOString().slice(0,10)}.csv`);
    toast.success(`Export ${filtered.length} รายการสำหรับ LINE OA แล้ว ✅`);
  }

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-glow">
          <MessageCircle className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold">LINE Export</h1>
          <p className="text-sm text-muted-foreground">Export รายชื่อลูกค้าสำหรับ LINE OA Broadcast</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {(["New","Regular","VIP"] as const).map((tier) => {
          const count = filtered.filter((c) => c.customer_tier === tier).length;
          return (
            <div key={tier} className="bg-card border rounded-xl p-3 text-center">
              <p className="text-xl font-extrabold">{count}</p>
              <p className="text-xs text-muted-foreground">{tier}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input className="w-full pl-8 pr-3 py-2 text-sm border rounded-lg bg-background" placeholder="ค้นหาชื่อ / เบอร์ / LINE" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="text-sm border rounded-lg px-3 py-2 bg-background" value={filterTier} onChange={(e) => setFilterTier(e.target.value)}>
          <option value="All">ทุก Tier</option>
          {["New","Regular","VIP"].map((t) => <option key={t}>{t}</option>)}
        </select>
        <select className="text-sm border rounded-lg px-3 py-2 bg-background" value={filterInterest} onChange={(e) => setFilterInterest(e.target.value)}>
          <option value="All">ทุก Interest</option>
          {INTEREST_OPTIONS.map((i) => <option key={i}>{i}</option>)}
        </select>
        <button onClick={doExport} disabled={filtered.length === 0} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 transition-all">
          <Download className="w-4 h-4" /> Export CSV ({filtered.length})
        </button>
      </div>

      {/* List */}
      <div className="bg-card border rounded-xl overflow-hidden shadow-soft">
        <div className="bg-muted/40 border-b px-4 py-2 grid grid-cols-[1fr_auto_auto_auto] gap-3 text-xs font-semibold text-muted-foreground">
          <span>ลูกค้า</span><span>LINE ID</span><span>จังหวัด</span><span>Tier</span>
        </div>
        <div className="divide-y max-h-[420px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">ไม่พบรายการที่ตรงกัน</div>
          ) : filtered.map((c) => (
            <div key={c.customer_id} className="px-4 py-2.5 grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center hover:bg-muted/20">
              <div>
                <p className="font-medium text-sm">{c.full_name}</p>
                <p className="text-xs text-muted-foreground">{c.phone} {c.interests?.length ? `· ${c.interests.slice(0,2).join(", ")}` : ""}</p>
              </div>
              <span className="text-xs text-muted-foreground">{c.line_id || "—"}</span>
              <span className="text-xs text-muted-foreground">{c.province || "—"}</span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${c.customer_tier === "VIP" ? "bg-amber-100 text-amber-700" : c.customer_tier === "Regular" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>{c.customer_tier}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
