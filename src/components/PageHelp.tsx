/**
 * PageHelp — ไอคอน (?) ข้างหัวข้อหน้า
 * hover/tap เพื่อดูคำอธิบายสั้นๆ เกี่ยวกับเครื่องมือในหน้านั้น
 * Admin สามารถแก้ไขข้อความได้ผ่าน Web Setting
 */
import { useState } from "react";
import { HelpCircle, X } from "lucide-react";
import { useWebSettings } from "@/store/webSettingsStore";

interface PageHelpProps {
  /** pageKey ตรงกับ key ใน webSettingsStore.pageHelp */
  pageKey: string;
  /** fallback text ถ้ายังไม่มีใน store */
  defaultText: string;
}

export function PageHelp({ pageKey, defaultText }: PageHelpProps) {
  const [open, setOpen] = useState(false);
  const stored = useWebSettings((s) => s.pageHelp[pageKey]);
  const text = stored ?? defaultText;

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-5 h-5 rounded-full bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary flex items-center justify-center transition-all"
        aria-label="คำอธิบายหน้านี้"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {open && (
        <>
          {/* Backdrop for mobile */}
          <div className="fixed inset-0 z-40 sm:hidden" onClick={() => setOpen(false)} />
          <div
            className="absolute left-0 top-6 z-50 w-64 bg-popover text-popover-foreground rounded-xl shadow-xl border p-3 text-xs leading-relaxed animate-in fade-in-0 zoom-in-95"
            role="tooltip"
          >
            <div className="flex items-start justify-between gap-2">
              <p>{text}</p>
              <button onClick={() => setOpen(false)} className="shrink-0 text-muted-foreground hover:text-foreground mt-0.5">
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
