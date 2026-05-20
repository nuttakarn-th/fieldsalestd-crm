/**
 * AudienceBirthday.tsx
 * ดึงลูกค้าที่วันเกิดเดือนนี้ / เดือนหน้า → ส่ง Birthday Promo ส่วนตัว
 */
import { useState, useMemo } from "react";
import { Cake, Download, Copy, Check, Phone, Gift } from "lucide-react";
import { useCRM } from "@/store/crmStore";
import { useCurrentUser } from "@/store/authStore";
import { toast } from "sonner";

const MONTHS_TH = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
const MONTHS_FULL = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];

function parseBD(bday: string) {
  const p = bday.split("-"); if (p.length !== 3) return null;
  const m = parseInt(p[1],10), d = parseInt(p[2],10);
  return isNaN(m)||isNaN(d) ? null : { month: m, day: d };
}
function daysUntil(month: number, day: number) {
  const now = new Date(); now.setHours(0,0,0,0);
  let next = new Date(now.getFullYear(), month-1, day);
  if (next < now) next = new Date(now.getFullYear()+1, month-1, day);
  return Math.ceil((next.getTime()-now.getTime())/(1000*60*60*24));
}
function exportCSV(rows: string[][], filename: string) {
  const csv = rows.map((r) => r.map((c) => `"${(c??"").replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob = new Blob(["﻿"+csv],{type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download=filename; a.click();
  URL.revokeObjectURL(url);
}

export default function AudienceBirthday() {
  const customers = useCRM((s) => s.customers);
  const user      = useCurrentUser();
  const [filter, setFilter] = useState<"month"|"next_month">("month");
  const [copied, setCopied] = useState<string|null>(null);

  const today = new Date();
  const thisMonth = today.getMonth()+1;
  const nextMonth = thisMonth === 12 ? 1 : thisMonth+1;
  const targetMonth = filter === "month" ? thisMonth : nextMonth;

  const filtered = useMemo(() => customers
    .filter((c) => { if (!c.birthday) return false; const bd=parseBD(c.birthday); return bd?.month===targetMonth; })
    .map((c) => { const bd=parseBD(c.birthday!)!; return {...c, bdDay:bd.day, bdMonth:bd.month, daysLeft:daysUntil(bd.month,bd.day)}; })
    .sort((a,b) => a.daysLeft-b.daysLeft),
  [customers, targetMonth]);

  const todayCount = filtered.filter((c) => c.daysLeft===0).length;

  function copyGreeting(c: typeof filtered[0]) {
    const text = `🎂 สุขสันต์วันเกิดค่ะ คุณ${c.full_name}! ขอให้มีความสุขมากๆ นะคะ Standard Tour ขอส่งความปรารถนาดีมาให้ค่ะ 🎉`;
    navigator.clipboard.writeText(text);
    setCopied(c.customer_id); setTimeout(()=>setCopied(null),2000);
  }
  function doExport() {
    const header = ["ชื่อ","บริษัท","เบอร์โทร","LINE ID","วันเกิด","เหลืออีก(วัน)"];
    const rows = filtered.map((c) => [c.full_name, c.company??"-", c.phone, c.line_id??"-", `${c.bdDay}/${c.bdMonth}`, String(c.daysLeft)]);
    exportCSV([header,...rows], `birthday_campaign_${filter}.csv`);
    toast.success(`Export ${filtered.length} รายการแล้ว ✅`);
  }

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-glow">
          <Cake className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Birthday Campaign List</h1>
          <p className="text-sm text-muted-foreground">ดึงลูกค้าที่วันเกิดเดือนนี้/เดือนหน้า → ส่ง Birthday Promo ส่วนตัว</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-pink-50 dark:bg-pink-950/20 border border-pink-200 dark:border-pink-800 rounded-xl p-4 text-center">
          <Gift className="w-5 h-5 mx-auto text-pink-500 mb-1" />
          <p className="text-2xl font-extrabold text-pink-600">{todayCount}</p>
          <p className="text-xs text-muted-foreground">วันนี้ 🎂</p>
        </div>
        <div className="bg-card border rounded-xl p-4 text-center">
          <Cake className="w-5 h-5 mx-auto text-rose-400 mb-1" />
          <p className="text-2xl font-extrabold">{filtered.length}</p>
          <p className="text-xs text-muted-foreground">{MONTHS_FULL[targetMonth-1]}</p>
        </div>
        <div className="bg-card border rounded-xl p-4 text-center">
          <Phone className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
          <p className="text-2xl font-extrabold">{filtered.filter(c=>c.line_id).length}</p>
          <p className="text-xs text-muted-foreground">มี LINE ID</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <button onClick={()=>setFilter("month")} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filter==="month"?"bg-pink-600 text-white":"bg-muted text-muted-foreground hover:bg-accent"}`}>
          เดือนนี้ ({MONTHS_TH[thisMonth-1]})
        </button>
        <button onClick={()=>setFilter("next_month")} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filter==="next_month"?"bg-pink-600 text-white":"bg-muted text-muted-foreground hover:bg-accent"}`}>
          เดือนหน้า ({MONTHS_TH[nextMonth-1]})
        </button>
        <button onClick={doExport} disabled={filtered.length===0} className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition-all">
          <Download className="w-4 h-4" /> Export CSV ({filtered.length})
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card border rounded-xl p-10 text-center">
          <Cake className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">ไม่มีลูกค้าที่มีวันเกิด{filter==="month"?"เดือนนี้":"เดือนหน้า"}</p>
        </div>
      ) : (
        <div className="bg-card border rounded-xl overflow-hidden shadow-soft divide-y max-h-[420px] overflow-y-auto">
          {filtered.map((c) => {
            const isToday = c.daysLeft === 0;
            return (
              <div key={c.customer_id} className={`flex items-center gap-3 px-4 py-3 ${isToday?"bg-pink-50 dark:bg-pink-950/20":""}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${isToday?"bg-gradient-to-br from-pink-500 to-rose-600":"bg-gradient-to-br from-purple-500 to-indigo-600"}`}>
                  {c.full_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm">{c.full_name}</p>
                    {isToday && <span className="text-[10px] bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full font-bold">🎂 วันนี้!</span>}
                    {!isToday && c.daysLeft <= 7 && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">อีก {c.daysLeft} วัน</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">{c.phone} · 🎂 {c.bdDay}/{c.bdMonth}{!isToday&&` · อีก ${c.daysLeft} วัน`}</p>
                </div>
                <button onClick={()=>copyGreeting(c)} className={`flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${copied===c.customer_id?"bg-emerald-100 text-emerald-700":"bg-muted hover:bg-pink-100 hover:text-pink-700 text-muted-foreground"}`}>
                  {copied===c.customer_id?<><Check className="w-3.5 h-3.5"/>Copied!</>:<><Copy className="w-3.5 h-3.5"/>อวยพร</>}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
