import { useEffect, useRef } from "react";
import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";
import { useCRM, type ChatMessage } from "@/store/crmStore";
import { useCurrentUser } from "@/store/authStore";
import { useChatUI } from "@/components/ChatWidget";
import { useChatRead } from "@/store/chatReadStore";

/**
 * Subscribes to chat_messages table changes via Supabase Realtime.
 * - New message arrives → append to local state (dedup by id)
 * - If sender is not me → desktop notification + sound
 */
export function ChatRealtimeSync() {
  const currentUser = useCurrentUser();
  const isOpenRef = useRef<boolean>(false);
  const isOpen = useChatUI((s) => s.isOpen);

  // Keep latest isOpen in ref so callback always sees fresh value
  useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);

  useEffect(() => {
    if (!SUPABASE_ENABLED || !supabase) return;
    if (!currentUser) return;

    const me = currentUser.full_name;

    const channel = supabase
      .channel("chat_messages_changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const row = payload.new as ChatMessage;
          // Dedup — skip if message already in state (e.g., we sent it ourselves)
          useCRM.setState((s) => {
            if (s.chatMessages.some((m) => m.id === row.id)) return s;
            return { chatMessages: [...s.chatMessages, row] };
          });

          // Notify if not from me
          if (row.author !== me) {
            showDesktopNotification(row);
            // If chat is not open, play a sound
            if (!isOpenRef.current) {
              try { playPing(); } catch {}
            }
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  return null;
}

function showDesktopNotification(msg: ChatMessage) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (document.visibilityState === "visible" && !document.hidden) {
    // User is looking at the tab — skip OS notification, sound + badge enough
    return;
  }
  if (Notification.permission !== "granted") return;
  try {
    const n = new Notification(`💬 ${msg.author}`, {
      body: msg.text || (msg.image_url ? "[แนบรูป]" : "(ข้อความใหม่)"),
      icon: "/favicon.ico",
      tag: "chat-stdtour",
      badge: "/favicon.ico",
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    // Permission denied or unsupported
  }
}

function playPing() {
  // Short beep using Web Audio API (no external file needed)
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = 880;
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
  osc.start();
  osc.stop(ctx.currentTime + 0.2);
}
