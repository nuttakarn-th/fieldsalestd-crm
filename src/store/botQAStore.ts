/**
 * botQAStore.ts
 * Zustand store สำหรับ Bot Q&A Training
 * Admin เพิ่ม/แก้/ลบ Q&A ได้ใน Web Setting → Bot ดึงมาตอบก่อน rule engine
 */
import { create } from "zustand";
import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";
import { toast } from "sonner";

export interface BotQA {
  id: string;
  keywords: string[];       // คำที่ trigger (lowercase)
  answer: string;           // คำตอบ
  category: string;         // หมวด: ทั่วไป / ทัวร์ / รถ / ราคา / วีซ่า
  active: boolean;
  match_mode: "any" | "all"; // 'any' = ตรงคำใดก็ได้ | 'all' = ต้องมีทุกคำ
  priority: number;
  created_at?: string;
  updated_at?: string;
}

export type BotQADraft = Omit<BotQA, "id" | "created_at" | "updated_at">;

interface BotQAState {
  qaList: BotQA[];
  loading: boolean;
  loadQA: () => Promise<void>;
  addQA: (draft: BotQADraft) => Promise<void>;
  updateQA: (id: string, patch: Partial<BotQADraft>) => Promise<void>;
  deleteQA: (id: string) => Promise<void>;
  toggleQA: (id: string) => Promise<void>;
}

export const useBotQA = create<BotQAState>((set, get) => ({
  qaList: [],
  loading: false,

  loadQA: async () => {
    if (!SUPABASE_ENABLED || !supabase) return;
    set({ loading: true });
    const { data, error } = await supabase
      .from("bot_qa")
      .select("*")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: true });
    if (error) { console.error("loadQA:", error); }
    else { set({ qaList: (data as BotQA[]) || [] }); }
    set({ loading: false });
  },

  addQA: async (draft) => {
    if (!SUPABASE_ENABLED || !supabase) return;
    const { data, error } = await supabase
      .from("bot_qa")
      .insert([draft])
      .select()
      .single();
    if (error) { toast.error("เพิ่ม Q&A ไม่สำเร็จ"); return; }
    set((s) => ({ qaList: [...s.qaList, data as BotQA] }));
    toast.success("เพิ่ม Q&A แล้ว ✅");
  },

  updateQA: async (id, patch) => {
    if (!SUPABASE_ENABLED || !supabase) return;
    const { data, error } = await supabase
      .from("bot_qa")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) { toast.error("แก้ไข Q&A ไม่สำเร็จ"); return; }
    set((s) => ({
      qaList: s.qaList.map((q) => (q.id === id ? (data as BotQA) : q)),
    }));
    toast.success("บันทึกแล้ว ✅");
  },

  deleteQA: async (id) => {
    if (!SUPABASE_ENABLED || !supabase) return;
    const { error } = await supabase.from("bot_qa").delete().eq("id", id);
    if (error) { toast.error("ลบ Q&A ไม่สำเร็จ"); return; }
    set((s) => ({ qaList: s.qaList.filter((q) => q.id !== id) }));
    toast.success("ลบแล้ว");
  },

  toggleQA: async (id) => {
    const qa = get().qaList.find((q) => q.id === id);
    if (!qa) return;
    await get().updateQA(id, { active: !qa.active });
  },
}));

/** Match Q&A against user text — returns answer string or null */
export function matchQA(text: string, qaList: BotQA[]): string | null {
  const t = text.toLowerCase();
  const active = qaList.filter((q) => q.active);
  // เรียงตาม priority สูงสุดก่อน
  const sorted = [...active].sort((a, b) => b.priority - a.priority);

  for (const qa of sorted) {
    const kws = qa.keywords.map((k) => k.toLowerCase());
    const matched =
      qa.match_mode === "all"
        ? kws.every((k) => t.includes(k))
        : kws.some((k) => t.includes(k));
    if (matched) return qa.answer;
  }
  return null;
}
