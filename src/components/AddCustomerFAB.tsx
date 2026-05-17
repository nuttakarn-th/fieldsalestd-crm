import { useState } from "react";
import { Plus } from "lucide-react";
import { CustomerLeadDialog } from "@/components/CustomerLeadDialog";
import { useChatUI } from "@/components/ChatWidget";

export function AddCustomerFAB() {
  const [open, setOpen] = useState(false);
  const chatOpen = useChatUI((s) => s.isOpen);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="เพิ่มลูกค้าใหม่"
        aria-label="เพิ่มลูกค้าใหม่"
        className={`fixed bottom-6 right-5 sm:right-8 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl text-white font-bold text-sm shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200
          bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500
          ${chatOpen ? "opacity-0 pointer-events-none scale-90" : "opacity-100 pointer-events-auto"}`}
        style={{ boxShadow: "0 6px 28px rgba(168,85,247,0.45)" }}
      >
        <Plus className="w-5 h-5" strokeWidth={2.8} />
        <span>เพิ่มลูกค้า / สร้าง Lead</span>
      </button>
      <CustomerLeadDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
