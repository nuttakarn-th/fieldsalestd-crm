import { useState } from "react";
import { Zap, Plus, X } from "lucide-react";
import { QuickLeadDialog } from "@/components/QuickLeadDialog";
import { CustomerLeadDialog } from "@/components/CustomerLeadDialog";
import { useChatUI } from "@/components/ChatWidget";

export function AddCustomerFAB() {
  const [open, setOpen]           = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [fullOpen,  setFullOpen]  = useState(false);

  const hidden = useChatUI((s) => s.isOpen);

  function handleQuick() { setOpen(false); setQuickOpen(true); }
  function handleFull()  { setOpen(false); setFullOpen(true);  }

  return (
    <>
      {/* Backdrop — close menu on outside click */}
      {open && !hidden && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Speed-dial stack */}
      <div className={`fixed bottom-[4.5rem] right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end gap-3 transition-all duration-300 ${hidden ? "opacity-0 pointer-events-none scale-75" : "opacity-100 scale-100"}`}>

        {/* Sub-buttons (visible when open) */}
        {open && (
          <>
            {/* Small green + → Full CustomerLeadDialog */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-white bg-black/60 rounded-full px-2.5 py-1 whitespace-nowrap shadow">
                เพิ่มลูกค้าแบบเต็ม
              </span>
              <button
                onClick={handleFull}
                title="เพิ่มลูกค้าแบบเต็ม"
                aria-label="เพิ่มลูกค้าแบบเต็ม"
                className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-600 shadow-lg flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all duration-150"
              >
                <Plus className="w-5 h-5" strokeWidth={2.5} />
              </button>
            </div>

            {/* Large orange ⚡ → QuickLeadDialog */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-white bg-black/60 rounded-full px-2.5 py-1 whitespace-nowrap shadow">
                เพิ่ม Lead ด่วน ⚡
              </span>
              <button
                onClick={handleQuick}
                title="เพิ่ม Lead ด่วน"
                aria-label="เพิ่ม Lead ด่วน"
                className="w-14 h-14 rounded-full bg-orange-500 hover:bg-orange-600 shadow-xl flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all duration-150"
              >
                <Zap className="w-6 h-6" strokeWidth={2.5} />
              </button>
            </div>
          </>
        )}

        {/* Main FAB — orange, always visible */}
        <button
          onClick={() => setOpen((v) => !v)}
          title="เพิ่มลูกค้า"
          aria-label="เพิ่มลูกค้า"
          className="w-14 h-14 rounded-full bg-orange-500 hover:bg-orange-600 shadow-xl flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all duration-200"
        >
          {open
            ? <X   className="w-6 h-6" strokeWidth={2.5} />
            : <Plus className="w-6 h-6" strokeWidth={2.5} />
          }
        </button>
      </div>

      <QuickLeadDialog    open={quickOpen} onOpenChange={setQuickOpen} />
      <CustomerLeadDialog open={fullOpen}  onOpenChange={setFullOpen}  />
    </>
  );
}
