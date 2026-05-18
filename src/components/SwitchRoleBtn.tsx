import { useState, useRef, useEffect } from "react";
import { Eye } from "lucide-react";
import { useCurrentUser, useAuth, ALL_ROLES, type AppRole } from "@/store/authStore";

interface SwitchRoleBtnProps {
  /** "dark" = Hub (กำแพงสีเข้ม), "light" = CRM/Standalone (bg card) */
  variant?: "dark" | "light";
}

export function SwitchRoleBtn({ variant = "light" }: SwitchRoleBtnProps) {
  const user = useCurrentUser();
  const viewAsRole = useAuth((s) => s.viewAsRole);
  const setViewAsRole = useAuth((s) => s.setViewAsRole);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (user?.role !== "Admin") return null;

  const isViewing = !!viewAsRole;

  const idleColor  = variant === "dark" ? "text-white/60"         : "text-muted-foreground";
  const hoverBg    = variant === "dark" ? "hover:bg-white/10"     : "hover:bg-accent";
  const activeColor = "text-amber-400";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title={isViewing ? `กำลังดูในมุมมอง: ${viewAsRole}` : "Switch Role View (Admin)"}
        className={`shrink-0 relative h-9 flex items-center gap-1 px-2 rounded-lg transition-colors text-xs font-semibold ${hoverBg} ${isViewing ? activeColor : idleColor}`}
      >
        <Eye className="w-4 h-4 shrink-0" />
        {isViewing ? (
          <span className="leading-none">{viewAsRole}</span>
        ) : null}
        {isViewing && (
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400 pointer-events-none" />
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-11 w-52 bg-popover border border-border rounded-xl shadow-2xl z-[60] overflow-hidden">
          <div className="px-3 pt-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
            ดูในมุมมอง Role
          </div>
          {([null, ...ALL_ROLES] as (AppRole | null)[]).map((r) => {
            const label = r === null ? "👑 Admin (มุมมองเต็ม)" : `🎭 ${r}`;
            const active = r === null ? !viewAsRole : viewAsRole === r;
            return (
              <button
                key={r ?? "__admin__"}
                onClick={() => { setViewAsRole(r as AppRole | null); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 transition-colors ${
                  active
                    ? "bg-primary/10 text-primary font-semibold"
                    : "hover:bg-accent text-foreground"
                }`}
              >
                {label}
                {active && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
