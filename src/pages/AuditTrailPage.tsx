/**
 * AuditTrailPage — ประวัติการแก้ไขทั้งหมด (ใคร / เมื่อไหร่ / แก้อะไร)
 * URL: /app/audit-trail   (Admin + Managers)
 */
import { useState } from "react";
import AuditTrailList from "@/components/AuditTrailList";
import { Input } from "@/components/ui/input";

const TABLES = [
  { v: "", l: "ทั้งหมด" },
  { v: "customers", l: "ลูกค้า" },
  { v: "leads", l: "Lead" },
  { v: "bookings", l: "การจอง" },
  { v: "periods", l: "Period" },
  { v: "tours", l: "โปรแกรม" },
];
const ACTIONS = [
  { v: "", l: "ทุกการกระทำ" },
  { v: "ลบ", l: "🗑 เฉพาะการลบ" },
  { v: "แก้ไข", l: "แก้ไข" },
  { v: "เพิ่ม", l: "เพิ่ม" },
];

export default function AuditTrailPage() {
  const [table, setTable] = useState("");
  const [action, setAction] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  return (
    <div className="max-w-5xl mx-auto px-4 py-5 space-y-4">
      <div>
        <h1 className="text-lg font-semibold">ประวัติการแก้ไข</h1>
        <p className="text-xs text-muted-foreground">
          บันทึกอัตโนมัติทุกครั้งที่มีการเพิ่ม / แก้ไข / ลบ ลูกค้า, Lead, การจอง, โปรแกรม และ Period — ใคร เมื่อไหร่ แก้อะไร (ลบหรือแก้ประวัติไม่ได้)
        </p>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex flex-wrap gap-1">
          {TABLES.map((t) => (
            <button key={t.v}
              onClick={() => setTable(t.v)}
              className={`text-xs px-2.5 py-1 rounded-full border ${table === t.v ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>
              {t.l}
            </button>
          ))}
        </div>
        <select value={action} onChange={(e) => setAction(e.target.value)}
          className="text-xs border rounded-md px-2 py-1 bg-background">
          {ACTIONS.map((a) => <option key={a.v} value={a.v}>{a.l}</option>)}
        </select>
        <form className="flex-1 min-w-[200px]" onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); }}>
          <Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
            placeholder="ค้นหา ชื่อลูกค้า / ชื่อคนแก้ / โปรแกรม แล้วกด Enter" className="h-8 text-xs" />
        </form>
      </div>

      <AuditTrailList table={table} action={action} search={search} pageSize={50} />
    </div>
  );
}
