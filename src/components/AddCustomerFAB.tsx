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
        className={`fixed bottom-[4.5rem] right-4 sm:right-6 z-50 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-emerald-500 hover:bg-emerald-600 shadow-glow flex items-center justify-center text-white hover:scale-110 transition-all duration-200 ${
          chatOpen ? "opacity-0 pointer-events-none scale-75" : "opacity-100 pointer-events-auto scale-100"
        }`}
      >
        <Plus className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />
      </button>
      <CustomerLeadDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
