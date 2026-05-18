/**
 * StandyWidget.tsx
 * Standy Assistant — rule-based AI chatbot for Standard Tour.
 * Pulls live data from service & CRM stores. No external API required.
 *
 * Exports:
 *   useStandyUI   — Zustand store (open / toggle / close)
 *   StandyBtn     — Bot icon button for navbars
 *   StandyWidget  — The floating chat panel (render once per page tree)
 */

import React, { useEffect, useRef, useState } from "react";
import { create } from "zustand";
import { Bot, X, Send, Sparkles } from "lucide-react";
import { useServices } from "@/store/serviceStore";
import { useCRM } from "@/store/crmStore";
import { useCurrentUser } from "@/store/authStore";
import { standyRespond, resolveCustomerDetail } from "@/lib/standyEngine";
import type { StandyContext, StandyResponse } from "@/lib/standyEngine";
import type { Customer } from "@/store/crmStore";

// ── Open/close store ──────────────────────────────────────────────────────
interface StandyUIState {
  open: boolean;
  toggle: () => void;
  close: () => void;
}

export const useStandyUI = create<StandyUIState>((set) => ({
  open: false,
  toggle: () => set((s) => ({ open: !s.open })),
  close: () => set({ open: false }),
}));

// ── Message types ─────────────────────────────────────────────────────────
interface ChatMsg {
  id: string;
  role: "user" | "bot";
  text: string;
}

let msgSeq = 0;
function mkId() { return `smsg-${++msgSeq}`; }

// ── Markdown-like renderer (bold ** and italic *( )* ) ───────────────────
function renderInline(line: string): React.ReactNode[] {
  // Split on **bold** and *(italic)* patterns
  const parts = line.split(/(\*\*[^*]+\*\*|\*\([^)]+\)\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**"))
      return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.startsWith("*(") && p.endsWith(")*"))
      return <em key={i} className="text-[10px] opacity-60 not-italic">{p.slice(2, -2)}</em>;
    return <span key={i}>{p}</span>;
  });
}

function RenderText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-0.5 leading-relaxed">
      {lines.map((line, i) => (
        <p key={i} className={line.startsWith("• ") ? "pl-2" : ""}>
          {renderInline(line)}
        </p>
      ))}
    </div>
  );
}

// ── Navbar bot icon button ────────────────────────────────────────────────
export function StandyBtn({ className }: { className?: string }) {
  const toggle = useStandyUI((s) => s.toggle);
  const open = useStandyUI((s) => s.open);
  return (
    <button
      onClick={toggle}
      className={
        "shrink-0 relative w-9 h-9 flex items-center justify-center rounded-lg transition-colors " +
        (open
          ? "bg-fuchsia-500/20 text-fuchsia-500"
          : "hover:bg-muted text-muted-foreground hover:text-fuchsia-500") +
        (className ? " " + className : "")
      }
      aria-label="Standy Assistant"
      title="Standy Assistant"
    >
      <Bot className="w-5 h-5" />
    </button>
  );
}

// ── Main floating panel ───────────────────────────────────────────────────
export function StandyWidget() {
  const open = useStandyUI((s) => s.open);
  const close = useStandyUI((s) => s.close);

  // Store data
  const tours      = useServices((s) => s.tours);
  const cars       = useServices((s) => s.cars);
  const flights    = useServices((s) => s.flights);
  const hotels     = useServices((s) => s.hotels);
  const visas      = useServices((s) => s.visas);
  const insurances = useServices((s) => s.insurances);
  const customers  = useCRM((s) => s.customers);
  const leads      = useCRM((s) => s.leads);
  const user       = useCurrentUser();

  // Conversation state
  const [msgs, setMsgs] = useState<ChatMsg[]>([
    {
      id: mkId(),
      role: "bot",
      text:
        "สวัสดีครับ! 🙂 ผม **Standy** ผู้ช่วยของ Standard Tour\n\n" +
        "ถามได้เรื่อง ทัวร์, ที่นั่งว่าง, ราคา, รถเช่า, ประกัน, วีซ่า, โรงแรม, ตั๋ว และข้อมูลลูกค้า (staff เท่านั้น)\n\nลองถามได้เลยครับ!",
    },
  ]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<{ data: Customer[] } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  // Auto-scroll on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, open]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120);
  }, [open]);

  const buildCtx = (): StandyContext => ({
    tours,
    cars,
    flights,
    hotels,
    visas,
    insurances,
    // Only provide customer / lead data if user is logged in (staff)
    customers: user ? customers : undefined,
    leads:     user ? leads     : undefined,
  });

  const addMsg = (role: "user" | "bot", text: string) =>
    setMsgs((prev) => [...prev, { id: mkId(), role, text }]);

  const sendText = (q: string) => {
    q = q.trim();
    if (!q) return;
    setInput("");
    addMsg("user", q);

    // Sensitive approval flow
    const approval = /^(ใช่|yes|ยืนยัน|โชว์|แสดง|ตกลง|ok|okay)$/i.test(q);
    if (approval && pending) {
      addMsg("bot", resolveCustomerDetail(pending.data));
      setPending(null);
      return;
    }
    const deny = /^(ไม่|no|ยกเลิก|cancel|ไม่ต้องการ)$/i.test(q);
    if (deny && pending) {
      addMsg("bot", "ตกลงครับ ไม่แสดงข้อมูลส่วนบุคคล 🙏");
      setPending(null);
      return;
    }

    // Normal flow
    const ctx = buildCtx();
    const res: StandyResponse = standyRespond(q, ctx);

    if (res.requiresSensitiveApproval && res.pendingData) {
      setPending({ data: res.pendingData });
    } else {
      setPending(null);
    }
    addMsg("bot", res.text);
  };

  const handleSend = () => sendText(input);

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  if (!open) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[9999] flex flex-col w-[340px] sm:w-[380px] max-h-[70vh] rounded-2xl shadow-2xl border border-border bg-background text-foreground overflow-hidden"
      style={{ fontFamily: "'Inter', 'Kanit', sans-serif" }}
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-fuchsia-600 via-purple-600 to-violet-600 text-white shrink-0">
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <Bot className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm leading-tight">Standy Assistant</p>
          <p className="text-[10px] text-white/70 leading-tight flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" /> ผู้ช่วย AI Standard Tour
          </p>
        </div>
        <button
          onClick={close}
          className="w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors shrink-0"
          aria-label="ปิด"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
        {msgs.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} gap-2`}
          >
            {m.role === "bot" && (
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-600 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3 h-3 text-white" />
              </div>
            )}
            <div
              className={`max-w-[82%] px-3 py-2 rounded-2xl text-[12.5px] ${
                m.role === "user"
                  ? "bg-gradient-to-br from-fuchsia-500 to-violet-600 text-white rounded-tr-sm"
                  : "bg-muted text-foreground rounded-tl-sm"
              }`}
            >
              <RenderText text={m.text} />
            </div>
          </div>
        ))}

        {/* Pending approval notice */}
        {pending && (
          <div className="flex justify-start gap-2">
            <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center shrink-0 mt-0.5">
              <Bot className="w-3 h-3 text-white" />
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-200 px-3 py-2 rounded-2xl rounded-tl-sm text-[12px] max-w-[82%]">
              ⚠️ รอการยืนยัน — พิมพ์ <strong>"ใช่"</strong> เพื่อแสดง หรือ <strong>"ไม่"</strong> เพื่อยกเลิก
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Quick suggestions ── */}
      <div className="flex gap-1.5 px-3 pb-1 overflow-x-auto no-scrollbar shrink-0">
        {["ทัวร์ต่างประเทศ", "ที่นั่งว่าง", "รถเช่า", "ประกัน"].map((s) => (
          <button
            key={s}
            onClick={() => sendText(s)}
            className="shrink-0 text-[10px] px-2 py-1 rounded-full border border-border bg-muted hover:bg-fuchsia-500/10 hover:border-fuchsia-300 hover:text-fuchsia-600 transition-colors whitespace-nowrap"
          >
            {s}
          </button>
        ))}
      </div>

      {/* ── Input bar ── */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-t border-border bg-card shrink-0">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="ถามเกี่ยวกับบริการ..."
          className="flex-1 bg-muted rounded-xl px-3 py-2 text-[12.5px] outline-none focus:ring-1 focus:ring-fuchsia-400 placeholder:text-muted-foreground/60 min-w-0"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-600 text-white flex items-center justify-center hover:opacity-90 disabled:opacity-40 transition-opacity"
          aria-label="ส่ง"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
