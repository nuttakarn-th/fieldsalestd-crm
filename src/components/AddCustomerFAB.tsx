import { useState } from "react";
import { Zap, Plus } from "lucide-react";
import { QuickLeadDialog } from "@/components/QuickLeadDialog";
import { CustomerLeadDialog } from "@/components/CustomerLeadDialog";
import { useChatUI } from "@/components/ChatWidget";

export function AddCustomerFAB() {
  const [quickOpen, setQuickOpen] = useState(false);
  const [fullOpen,  setFullOpen]  = useState(false);
  const chatOpen = useChatUI((s) => s.isOpen);

  const hidden = chatOpen ? "opacity-0 pointer-events-none scale-75" : "opacity-100 pointer-events-auto scale-100";

  return (
    <>
      {/* ⚡ Quick Lead FAB — primary */}
      <button
        onClick={() => setQuickOpen(true)}
        title="เพิ่ม Lead ด่วน ⚡"
        aria-label="เพิ่ม Lead ด่วน"
        className={`fixed bottom-[4.5rem] right-4 sm:bottom-6 sm:right-6 z-50 w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-600 shadow-lg flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all duration-200 ${hidden}`}
      >
        <Zap className="w-5 h-5" strokeWidth={2.5} />
      </button>

      {/* + Full form FAB — secondary (smaller, above quick button) */}
      <button
        onClick={() => setFullOpen(true)}
        title="เพิ่มลูกค้าแบบเต็ม"
        aria-label="เพิ่มลูกค้าแบบเต็ม"
        className={`fixed bottom-[8.5rem] right-5 sm:bottom-[5.5rem] sm:right-7 z-50 w-8 h-8 rounded-full bg-muted border border-border hover:bg-card shadow-md flex items-center justify-center text-muted-foreground hover:scale-110 active:scale-95 transition-all duration-200 ${hidden}`}
      >
        <Plus className="w-4 h-4" strokeWidth={2} />
      </button>

      <QuickLeadDialog   open={quickOpen} onOpenChange={setQuickOpen} />
      <CustomerLeadDialog open={fullOpen}  onOpenChange={setFullOpen} />
    </>
  );
}
