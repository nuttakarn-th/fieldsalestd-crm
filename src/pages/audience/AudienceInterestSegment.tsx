/**
 * AudienceInterestSegment.tsx
 * กรองลูกค้าด้วย Interest Tag หลายตัวพร้อมกัน → Export เฉพาะคนที่สนใจ "ยุโรป" หรือ "ญี่ปุ่น" ได้ทันที
 */
import { useState, useMemo } from "react";
import { Tag, Download, Users, Search, X } from "lucide-react";
import { useCRM } from "@/store/crmStore";
import { useCurrentUser } from "@/store/authStore";
import { toast } from "sonner";

const ALL_INTERESTS = [
  "ทัวร์ต่างประเทศ","ทัวร์ภายในประเทศ","เช่ารถ ท่องเที่ยว",
  "จองตั๋วเครื่องบิน","Incentive","VIP","ครอบครัว","องค์กร",
];

const TAG_COLORS: Record<string, string> = {
  "ทัวร์ต่างประเทศ": "bg-indigo-100 text-indigo-700 border-indigo-200",
  "ทัวร์ภายในประเทศ": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "เช่ารถ ท่องเที่ยว":  "bg-orange-100 text-orange-700 border-orange-200",
  "จองตั๋วเครื่องบิน": "bg-sky-100 text-sky-700 border-sky-200",
  "Incentive":         "bg-purple-100 text-purple-700 border-purple-200",
  "VIP":               "bg-amber-100 text-amber-700 border-amber-200",
  "ครอบครัว":          "bg-pink-100 text-pink-700 border-pink-200",
  "องค์กร":            "bg-teal-100 text-teal-700 border-teal-200",
};

function exportCSV(rows: string[][], filename: string) {
  const csv = rows.map((r) => r.map((c) => `"${(c??"").replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob = new Blob(["﻿"+csv],{type:"text/csv;charset=utf-8;"}); const url=URL.createObjectURL(blob);
  const a=document.createElement("a"); a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url);
}

type MatchMode = "any" | "all";

export default function AudienceInterestSegment() {
  const customers = useCRM((s) => s.customers);
  const user      = useCurrentUser();
  const isSales   = user?.role === "Sales";

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [matchMode, setMatchMode]       = useState<MatchMode>("any");
  const [filterTier, setFilterTier]     = useState("All");
  const [search, setSearch]             = useState("");

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  const base = useMemo(() => {
    if (isSales) return customers.filter((c) => c.created_by === user?.full_name || c.transferred_to === user?.full_name);
    return customers;
  }, [customers, isSales, user]);

  const filtered = useMemo(() => {
    return base.filter((c) => {
      // Tier filter
      if (filterTier !== "All" && c.customer_tier !== filterTier) return false;
      // Search
      if (search && !`${c.full_name} ${c.phone} ${c.line_id ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
      // Interest filter
      if (selectedTags.length > 0) {
        const cInterests = c.interests ?? [];
        if (matchMode === "any") {
          if (!selectedTags.some((t) => cInterests.includes(t))) return false;
        } else {
          if (!selectedTags.every((t) => cInterests.includes(t))) return false;
        }
      }
      return true;
    });
  }, [base, filterTier, search, selectedTags, matchMode]);

  // Stats: count per selected tag
  const tagStats = useMemo(() => {
    return ALL_INTERESTS.map((tag) => ({
      tag,
      count: base.filter((c) => (c.interests ?? []).includes(tag)).length,
    }));
  }, [base]);

  function doExport() {
    const header = ["ชื่อ","เบอร์โทร","LINE ID","Tier","จังหวัด","ความสนใจ"];
    const rows = filtered.map((c) => [
      c.full_name, c.phone, c.line_id??"-", c.customer_tier,
      c.province??"-", (c.interests??[]).join("|"),
    ]);
    const tagLabel = selectedTags.length > 0 ? selectedTags.join("-") : "all";
    exportCSV([header,...rows], `interest_segment_${tagLabel}_${new Date().toISOString().slice(0,10)}.csv`);
    toast.success(`Export ${filtered.length} รายการแล้ว ✅`);
  }

  return (
    <div className="p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-glow">
          <Tag className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Interest Segment</h1>
          <p className="text-sm text-muted-foreground">กรองลูกค้าด้วย Interest Tag — Export เฉพาะคนที่สนใจ "ยุโรป" หรือ "ญี่ปุ่น" ได้ทันที</p>
        </div>
      </div>

      {/* Tag stats grid */}
      <div className="grid grid-cols-4 gap-2">
        {tagStats.map(({ tag, count }) => (
          <button
            key={tag}
            onClick={() => toggleTag(tag)}
            className={`relative rounded-xl border p-3 text-left transition-all hover:shadow-md ${
              selectedTags.includes(tag)
                ? "ring-2 ring-teal-500 " + (TAG_COLORS[tag] ?? "bg-teal-100 text-teal-700 border-teal-200")
                : "bg-card hover:bg-muted/30 border"
            }`}
          >
            <p className="text-lg font-extrabold leading-none">{count}</p>
            <p className="text-[11px] mt-1 leading-snug text-muted-foreground font-medium">{tag}</p>
            {selectedTags.includes(tag) && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-teal-600 text-white flex items-center justify-center text-[9px] font-bold">✓</span>
            )}
          </button>
        ))}
      </div>

      {/* Active tag chips */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-muted-foreground font-medium">กรอง:</span>
          {selectedTags.map((tag) => (
            <span key={tag} className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${TAG_COLORS[tag] ?? "bg-muted text-muted-foreground"}`}>
              {tag}
              <button onClick={() => toggleTag(tag)} className="ml-0.5 hover:opacity-70">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button onClick={() => setSelectedTags([])} className="text-xs text-muted-foreground hover:text-foreground underline">ล้างทั้งหมด</button>
          {/* Match mode */}
          <div className="ml-auto flex gap-1 bg-muted rounded-lg p-0.5">
            <button
              onClick={() => setMatchMode("any")}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${matchMode==="any"?"bg-teal-600 text-white":"text-muted-foreground"}`}
            >สนใจอย่างน้อย 1 อย่าง</button>
            <button
              onClick={() => setMatchMode("all")}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${matchMode==="all"?"bg-teal-600 text-white":"text-muted-foreground"}`}
            >สนใจครบทุกอย่าง</button>
          </div>
        </div>
      )}

      {/* Filters row */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            className="w-full pl-8 pr-3 py-2 text-sm border rounded-lg bg-background"
            placeholder="ค้นหาชื่อ / เบอร์ / LINE"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="text-sm border rounded-lg px-3 py-2 bg-background"
          value={filterTier}
          onChange={(e) => setFilterTier(e.target.value)}
        >
          <option value="All">ทุก Tier</option>
          {["New","Regular","VIP"].map((t) => <option key={t}>{t}</option>)}
        </select>
        <div className="flex items-center gap-1.5 bg-muted/40 border rounded-xl px-3 py-2">
          <Users className="w-4 h-4 text-teal-500" />
          <span className="text-sm font-extrabold text-teal-600">{filtered.length}</span>
          <span className="text-xs text-muted-foreground">รายการ</span>
        </div>
        <button
          onClick={doExport}
          disabled={filtered.length===0}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40 transition-all"
        >
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
            <div className="py-10 text-center text-sm text-muted-foreground">
              {selectedTags.length > 0 ? "ไม่พบลูกค้าที่ตรงกับ Interest ที่เลือก" : "ไม่พบรายการ"}
            </div>
          ) : filtered.map((c) => (
            <div key={c.customer_id} className="px-4 py-2.5 grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center hover:bg-muted/20">
              <div>
                <p className="font-medium text-sm">{c.full_name}</p>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {(c.interests??[]).map((interest) => (
                    <span
                      key={interest}
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${
                        selectedTags.includes(interest)
                          ? (TAG_COLORS[interest] ?? "bg-teal-100 text-teal-700 border-teal-200")
                          : "bg-muted text-muted-foreground border-transparent"
                      }`}
                    >{interest}</span>
                  ))}
                </div>
              </div>
              <span className="text-xs text-muted-foreground">{c.line_id||"—"}</span>
              <span className="text-xs text-muted-foreground">{c.province||"—"}</span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                c.customer_tier==="VIP" ? "bg-amber-100 text-amber-700"
                : c.customer_tier==="Regular" ? "bg-blue-100 text-blue-700"
                : "bg-slate-100 text-slate-600"
              }`}>{c.customer_tier}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
