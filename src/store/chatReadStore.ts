import { create } from "zustand";
import { persist } from "zustand/middleware";
interface S { lastReadAt: string; markRead: (iso?: string) => void; }
export const useChatRead = create<S>()(persist((set) => ({
  lastReadAt: new Date(0).toISOString(),
  markRead: (iso) => set({ lastReadAt: iso ?? new Date().toISOString() }),
}), { name: "stdtour-chat-read-v1" }));
