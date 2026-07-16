/**
 * AudienceFacebook.tsx
 * Export Phone/Email ในฟอร์แมต Facebook Custom Audience
 */
import { useState, useMemo } from "react";
import { Facebook, Download, Search } from "lucide-react";
import { useCRM } from "@/store/crmStore";
import { useCurrentUser } from "@/store/authStore";
import { toast } from "sonner";

function exportCSV(rows: string[][], filename: string) {
  const csv = rows.map((r) => r.map((c) => `"${(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function AudienceFacebook() {
  const customers = useCRM((s) => s.customers);
  const user      = useCurrentUser();
  const [search, setSearch]         = useState("");
  const [filterTier, setFilterTier] = useState("All");

  const filtered = useMemo(() => customers.filter((c) => {
    if (filterTier !== "All" && c.customer_tier !== filterTier) return false;
    if (search && !`${c.full_name} ${c.phone} ${c.email}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [customers, filterTier, search]);

  const withEmail = filtered.filter((c) => c.email);

  function doExport() {
    const header = ["phone", "email", "fn", "ln", "ct", "country"];
    const rows = filtered.map((c) => {
      const parts = c.full_name.trim().split(" ");
      return [
        c.phone.replace(/\D/g, ""),
        c.email ?? "",
        parts[0] ?? "", parts[1] ?? "",
        c.province ?? "", "TH",
      ];
    });
    exportCSV([header, ...rows], `FB_custom_audience_${new Date().toISOString().slice(0,10)}.csv`);
    toast.success(`Export ${filtered.length} รายการสำหรับ Facebook Custom Audience แล้ว ✅`);
  }

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-glow">
          <Facebook className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Facebook Audience</h1>
          <p className="text-sm text-muted-foreground">Export Phone/Email ฟอร์แมต FB Custom Audience — Retarget คนที่เคยสนใจ</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border rounded-xl p-4 text-center">
          <p className="text-2xl font-extrabold">{filtered.length}</p>
          <p className="text-xs text-muted-foreground">รายการทั้งหมด</p>
        </div>
        <div className="bg-card border rounded-xl p-4 text-center">
          <p className="text-2xl font-extrabold text-blue-600">{withEmail.length}</p>
          <p className="text-xs text-muted-foreground">มี Email (match ดีขึ้น)</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input className="w-full pl-8 pr-3 py-2 text-sm border rounded-lg bg-background" placeholder="ค้นหาชื่อ / เบอร์ / Email" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="text-sm border rounded-lg px-3 py-2 bg-background" value={filterTier} onChange={(e) => setFilterTier(e.target.value)}>
          <option value="All">ทุก Tier</option>
          {["ใหม่","Regular","VIP"].map((t) => <option key={t}>{t}</option>)}
        </select>
        <button onClick={doExport} disabled={filtered.length === 0} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition-all">
          <Download className="w-4 h-4" /> Export CSV ({filtered.length})
        </button>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden shadow-soft">
        <div className="bg-muted/40 border-b px-4 py-2 grid grid-cols-[1fr_auto_auto] gap-3 text-xs font-semibold text-muted-foreground">
          <span>ลูกค้า</span><span>Email</span><span>Tier</span>
        </div>
        <div className="divide-y max-h-[420px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">ไม่พบรายการ</div>
          ) : filtered.map((c) => (
            <div key={c.customer_id} className="px-4 py-2.5 grid grid-cols-[1fr_auto_auto] gap-3 items-center hover:bg-muted/20">
              <div>
                <p className="font-medium text-sm">{c.full_name}</p>
                <p className="text-xs text-muted-foreground">{c.phone}</p>
              </div>
              <span className="text-xs text-muted-foreground">{c.email || <span className="text-muted-foreground/40">—</span>}</span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${c.customer_tier === "VIP" ? "bg-amber-100 text-amber-700" : c.customer_tier === "Regular" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>{c.customer_tier}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
