import { useMemo, useState, useRef, useEffect, memo } from "react";
import { Search, Phone, MessageCircle, User, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useCRM, tierBadge } from "@/store/crmStore";
import { useShallow } from "zustand/react/shallow";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

type CustSearch = {
  customer_id: string; full_name: string; phone: string; company: string;
  line_id: string; email?: string; customer_tier: string; created_by: string;
};

// ── SearchResultItems อยู่นอก GlobalSearch (MODULE-LEVEL) ──────────────────────
// สำคัญมาก: ถ้าอยู่ใน function body ของ GlobalSearch (เช่น const ResultItems = () => ...)
// React จะเห็นว่าเป็น component type ใหม่ทุกครั้งที่ GlobalSearch re-render
// → unmount/remount ทุก render → ก่อ React #185 infinite loop
// ──────────────────────────────────────────────────────────────────────────────
interface SearchResultItemsProps {
  results: CustSearch[];
  onSelect: () => void;
}

const SearchResultItems = memo(function SearchResultItems({
  results,
  onSelect,
}: SearchResultItemsProps) {
  return (
    <>
      {results.length === 0 ? (
        <div className="p-4 text-sm text-muted-foreground text-center">
          ไม่พบลูกค้าที่ตรงกัน
        </div>
      ) : (
        <ul className="divide-y">
          {results.map((c) => (
            <li key={c.customer_id}>
              <button
                className="w-full text-left p-3 hover:bg-muted/50 transition flex items-center gap-3"
                onClick={onSelect}
              >
                <div className="w-9 h-9 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold truncate">{c.full_name}</span>
                    <Badge variant="outline" className={tierBadge(c.customer_tier)}>
                      {c.customer_tier}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {c.company !== "-" ? c.company : "B2C"} • Sales: {c.created_by}
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {c.phone}
                  </span>
                  <span className="flex items-center gap-1 text-success">
                    <MessageCircle className="w-3 h-3" />
                    {c.line_id}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
});

export function GlobalSearch() {
  // ── Stable selector ─────────────────────────────────────────────────────────
  // Zustand v5 ไม่รองรับ equalityFn เป็น arg ที่ 2 (eqCustSearch ถูก ignore)
  // → selector s.customers.map(...) สร้าง array ใหม่ทุก render → loop
  // แก้: ใช้ useShallow บน raw customers array เพื่อป้องกัน re-render
  // เมื่อ store field อื่น (chatMessages, currentRep ฯลฯ) เปลี่ยน แต่ customers เหมือนเดิม
  // ────────────────────────────────────────────────────────────────────────────
  const rawCustomers = useCRM(useShallow((s) => s.customers));
  const currentRep = useCRM((s) => s.currentRep);

  const customers = useMemo(
    () =>
      rawCustomers.map(
        (c): CustSearch => ({
          customer_id: c.customer_id,
          full_name: c.full_name,
          phone: c.phone,
          company: c.company,
          line_id: c.line_id,
          email: c.email,
          customer_tier: c.customer_tier,
          created_by: c.created_by,
        }),
      ),
    [rawCustomers],
  );

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Close desktop dropdown on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Auto-focus mobile input when overlay opens
  useEffect(() => {
    if (mobileOpen) {
      setTimeout(() => mobileInputRef.current?.focus(), 60);
    }
  }, [mobileOpen]);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    const scoped =
      currentRep === "All"
        ? customers
        : customers.filter((c) => c.created_by === currentRep);
    return scoped
      .filter(
        (c) =>
          c.full_name.toLowerCase().includes(s) ||
          c.phone.includes(s) ||
          c.company.toLowerCase().includes(s) ||
          c.line_id.toLowerCase().includes(s) ||
          (c.email ?? "").toLowerCase().includes(s),
      )
      .slice(0, 8);
  }, [q, customers, currentRep]);

  const placeholder =
    currentRep === "All"
      ? "ค้นหาลูกค้าของทีมทั้งหมด..."
      : `ค้นหาลูกค้าของ ${currentRep}...`;

  const handleSelect = () => {
    setOpen(false);
    setMobileOpen(false);
    setQ("");
    navigate("/app/customers");
  };

  const closeMobile = () => {
    setMobileOpen(false);
    setQ("");
    setOpen(false);
  };

  return (
    <>
      {/* ── Desktop: inline search bar (hidden on mobile) ── */}
      <div ref={wrapRef} className="relative flex-1 max-w-md hidden sm:block">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="pl-9 bg-secondary/60 border-transparent focus-visible:bg-card"
          />
        </div>
        {open && q.trim() && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-card border rounded-xl shadow-elegant overflow-hidden z-50 max-h-96 overflow-y-auto">
            <SearchResultItems results={results} onSelect={handleSelect} />
          </div>
        )}
      </div>

      {/* ── Mobile: search icon button (hidden on desktop) ── */}
      <button
        className="sm:hidden shrink-0 w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted/50 transition-colors"
        onClick={() => setMobileOpen(true)}
        aria-label="ค้นหา"
      >
        <Search className="w-5 h-5 text-muted-foreground" />
      </button>

      {/* ── Mobile: full-screen search overlay ── */}
      {mobileOpen && (
        <div className="sm:hidden fixed inset-0 z-[60] bg-background flex flex-col">
          {/* Search bar row */}
          <div className="h-16 border-b flex items-center gap-3 px-4 bg-card/95">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              ref={mobileInputRef}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setOpen(true);
              }}
              placeholder={placeholder}
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
            />
            <button
              onClick={closeMobile}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              aria-label="ปิด"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
          {/* Results */}
          {q.trim() ? (
            <div className="flex-1 overflow-y-auto">
              <SearchResultItems results={results} onSelect={handleSelect} />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
              พิมพ์ชื่อ, เบอร์โทร หรือ Line ID เพื่อค้นหา
            </div>
          )}
        </div>
      )}
    </>
  );
}
