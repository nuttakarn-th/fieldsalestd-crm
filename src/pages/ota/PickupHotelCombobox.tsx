/**
 * PickupHotelCombobox — เลือกจุดรับจากรายชื่อกลาง (ota_pickup_locations)
 *
 * - ค้นหาไม่สนตัวพิมพ์เล็ก/ใหญ่ ช่องว่าง เครื่องหมาย ("maya" เจอ "MAYA")
 * - ค้นจากชื่อเรียกอื่น (aliases) ได้ ("thaphae" เจอ McDonald's Tha Phae Gate)
 * - จับคำสะกดใกล้เคียง ("Macdonald" ยังเจอ McDonald's)
 * - ถ้าเป็นที่ใหม่จริง กด "+ เพิ่มจุดรับใหม่" ได้ แต่ถ้ามีชื่อคล้าย จะเตือนก่อน
 *
 * DB trigger (ota_orders_normalize_pickup) จับคู่ชื่ออีกชั้นตอนบันทึก รวมถึงตอน Import
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, MapPin, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface PickupLocation {
  id: string;
  name: string;
  aliases: string[];
  kind: "place" | "special";
}

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

/** Dice similarity บน bigram — ใช้จับคำสะกดผิดใกล้เคียง */
function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const grams = (s: string) => {
    const m = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const g = s.slice(i, i + 2);
      m.set(g, (m.get(g) ?? 0) + 1);
    }
    return m;
  };
  const ga = grams(a), gb = grams(b);
  let inter = 0;
  ga.forEach((n, g) => { inter += Math.min(n, gb.get(g) ?? 0); });
  return (2 * inter) / (a.length - 1 + b.length - 1);
}

// cache ระดับ module — โหลดครั้งเดียวต่อการเปิดหน้า
let cache: PickupLocation[] | null = null;
async function loadLocations(force = false): Promise<PickupLocation[]> {
  if (cache && !force) return cache;
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("ota_pickup_locations")
    .select("id, name, aliases, kind")
    .eq("active", true)
    .order("name");
  if (error) { console.warn("[pickup_locations]", error.message); return cache ?? []; }
  cache = (data ?? []) as PickupLocation[];
  return cache;
}

interface Match {
  loc: PickupLocation;
  score: number;          // 3 = ตรงทั้งคำ, 2 = ขึ้นต้น/อยู่ในชื่อ, 1 = ใกล้เคียง
  via?: string;           // alias ที่ match
}

export default function PickupHotelCombobox({
  value, onChange, disabledAdd = false, createdBy,
}: {
  value: string;
  onChange: (v: string) => void;
  disabledAdd?: boolean;
  createdBy?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [locations, setLocations] = useState<PickupLocation[]>(cache ?? []);
  const [adding, setAdding] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { loadLocations().then(setLocations); }, []);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const q = norm(query);

  const matches = useMemo<Match[]>(() => {
    if (!q) return locations.map((loc) => ({ loc, score: 0 }));
    const out: Match[] = [];
    for (const loc of locations) {
      const names = [loc.name, ...loc.aliases];
      let best: Match | null = null;
      for (const n of names) {
        const nn = norm(n);
        let score = 0;
        if (nn === q) score = 3;
        else if (nn.includes(q)) score = 2;
        else if (q.length >= 4 && similarity(nn, q) >= 0.5) score = 1;
        else if (q.length >= 4 && nn.length > q.length && similarity(nn.slice(0, q.length + 2), q) >= 0.6) score = 1;
        if (score && (!best || score > best.score)) best = { loc, score, via: n === loc.name ? undefined : n };
      }
      if (best) out.push(best);
    }
    return out.sort((a, b) => b.score - a.score || a.loc.name.localeCompare(b.loc.name));
  }, [locations, q]);

  const exact = matches.find((m) => m.score === 3);
  const specials = matches.filter((m) => m.loc.kind === "special");
  const places = matches.filter((m) => m.loc.kind === "place");
  const hasSimilar = matches.length > 0;

  function pick(name: string) {
    onChange(name);
    setOpen(false);
    setQuery("");
  }

  async function addNew() {
    const name = query.trim().replace(/\s+/g, " ");
    if (!name || !supabase) return;
    setAdding(true);
    const { data, error } = await supabase
      .from("ota_pickup_locations")
      .insert({ name, created_by: createdBy ?? null })
      .select("id, name, aliases, kind")
      .single();
    setAdding(false);
    if (error) {
      // ชื่อซ้ำ (norm ตรงกัน) → โหลดใหม่แล้วเลือกตัวที่มีอยู่
      const fresh = await loadLocations(true);
      setLocations(fresh);
      const found = fresh.find((l) => norm(l.name) === norm(name) || l.aliases.some((a) => norm(a) === norm(name)));
      if (found) { pick(found.name); return; }
      toast.error("เพิ่มจุดรับไม่สำเร็จ: " + error.message);
      return;
    }
    const loc = data as PickupLocation;
    cache = [...(cache ?? []), loc].sort((a, b) => a.name.localeCompare(b.name));
    setLocations(cache);
    toast.success(`เพิ่มจุดรับใหม่ "${loc.name}" แล้ว`);
    pick(loc.name);
  }

  const row = (m: Match) => {
    const isSel = m.loc.name === value;
    return (
      <button key={m.loc.id} type="button" onClick={() => pick(m.loc.name)}
        className={`w-full text-left px-3 py-2 text-sm transition-colors ${isSel ? "bg-pink-500 text-white" : "hover:bg-muted"}`}>
        <div className="font-medium leading-tight flex items-center gap-1.5">
          {m.loc.name}
          {m.score === 1 && <span className={`text-[10px] px-1 rounded ${isSel ? "bg-white/20" : "bg-amber-100 text-amber-700"}`}>ใกล้เคียง</span>}
        </div>
        {m.via && <div className={`text-xs leading-tight ${isSel ? "text-white/80" : "text-muted-foreground"}`}>เคยพิมพ์ว่า: {m.via}</div>}
      </button>
    );
  };

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => { setOpen((v) => !v); setQuery(""); }}
        className="w-full flex items-center justify-between px-3 py-2 text-sm bg-background border border-border rounded-lg hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 text-left transition-colors">
        <span className={value ? "text-foreground font-medium" : "text-muted-foreground"}>
          {value || "เลือกหรือค้นหาจุดรับ (optional)"}
        </span>
        <span className="flex items-center gap-1">
          {value && (
            <span role="button" tabIndex={-1} onClick={(e) => { e.stopPropagation(); onChange(""); }}
              className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></span>
          )}
          <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
        </span>
      </button>

      {open && (
        <div className="absolute z-[60] top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
            <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (matches[0] && q) pick(matches[0].loc.name);
                }
              }}
              placeholder="พิมพ์ชื่อโรงแรม / จุดรับ..."
              className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground" />
            {query && <button type="button" onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>}
          </div>

          <div className="max-h-64 overflow-y-auto py-1">
            {specials.length > 0 && (
              <div>
                <div className="px-3 pt-2 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">ตัวเลือกพิเศษ</div>
                {specials.map(row)}
              </div>
            )}
            {places.length > 0 && (
              <div>
                <div className="px-3 pt-2 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {q ? `จุดรับที่ตรง/ใกล้เคียง (${places.length})` : `จุดรับทั้งหมด (${places.length})`}
                </div>
                {places.map(row)}
              </div>
            )}
            {matches.length === 0 && !q && (
              <div className="px-3 py-4 text-sm text-center text-muted-foreground">กำลังโหลด…</div>
            )}

            {/* เพิ่มจุดรับใหม่ — แสดงเมื่อไม่มีชื่อที่ตรงทุกตัวอักษร */}
            {q && !exact && !disabledAdd && (
              <div className="border-t border-border mt-1 pt-1">
                {hasSimilar && (
                  <div className="px-3 py-1.5 text-xs text-amber-700 flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    มีชื่อคล้ายกันด้านบน ถ้าเป็นที่เดียวกันให้เลือกจากรายการ ไม่ต้องเพิ่มใหม่
                  </div>
                )}
                <button type="button" disabled={adding} onClick={addNew}
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted transition-colors flex items-center gap-2 disabled:opacity-50">
                  <span className="text-purple-500 font-semibold shrink-0">+ เพิ่มจุดรับใหม่</span>
                  <span className="font-medium">"{query.trim()}"</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
