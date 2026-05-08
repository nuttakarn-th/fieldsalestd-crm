import { useMemo, useState, useRef, useEffect } from "react";
import { Search, Phone, MessageCircle, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useCRM, tierBadge } from "@/store/crmStore";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

export function GlobalSearch() {
  const customers = useCRM((s) => s.customers);
  const currentRep = useCRM((s) => s.currentRep);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    const scoped = currentRep === "All" ? customers : customers.filter((c) => c.created_by === currentRep);
    return scoped
      .filter((c) =>
        c.full_name.toLowerCase().includes(s) ||
        c.phone.includes(s) ||
        c.company.toLowerCase().includes(s) ||
        c.line_id.toLowerCase().includes(s) ||
        (c.email ?? "").toLowerCase().includes(s),
      )
      .slice(0, 8);
  }, [q, customers, currentRep]);

  return (
    <div ref={wrapRef} className="relative flex-1 max-w-md">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={currentRep === "All" ? "ค้นหาลูกค้าของทีมทั้งหมด..." : `ค้นหาลูกค้าของ ${currentRep}...`}
          className="pl-9 bg-secondary/60 border-transparent focus-visible:bg-card"
        />
      </div>
      {open && q.trim() && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border rounded-xl shadow-elegant overflow-hidden z-50 max-h-96 overflow-y-auto">
          {results.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">ไม่พบลูกค้าที่ตรงกัน</div>
          ) : (
            <ul className="divide-y">
              {results.map((c) => (
                <li key={c.customer_id}>
                  <button
                    className="w-full text-left p-3 hover:bg-muted/50 transition flex items-center gap-3"
                    onClick={() => { setOpen(false); setQ(""); navigate("/app/customers"); }}
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold truncate">{c.full_name}</span>
                        <Badge variant="outline" className={tierBadge(c.customer_tier)}>{c.customer_tier}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{c.company !== "-" ? c.company : "B2C"} • Sales: {c.created_by}</div>
                    </div>
                    <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>
                      <span className="flex items-center gap-1 text-success"><MessageCircle className="w-3 h-3" />{c.line_id}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}