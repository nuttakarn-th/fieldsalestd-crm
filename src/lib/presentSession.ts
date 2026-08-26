/**
 * presentSession.ts
 * Live Presentation Session helpers — Supabase Realtime sync
 *
 * Presenter creates a session → gets a public URL
 * Viewers subscribe → slide changes broadcast in real-time (~100ms latency)
 */

import { supabase } from "@/lib/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PresentSessionSnapshot {
  report: {
    id: string;
    period_label: string;
    report_name?: string;
    uploaded_by?: string | null;
    file_name: string;
    uploaded_at: string;
    inbox_revenue?: number | null;
    deals_closed?: number | null;
    total_inbox?: number | null;
  };
  ads: object[];
  cm: object;
  groupColorMap: Record<string, string>;
}

export interface PresentSession {
  id: string;
  current_slide: number;
  snapshot: PresentSessionSnapshot;
  created_at: string;
  expires_at: string;
  status: "live" | "ended";
  last_ping_at: string;
}

// ── ID generator ──────────────────────────────────────────────────────────────

function genSessionId(): string {
  // e.g. "prs_4XK9B2" — short, readable, URL-safe
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const rand = Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
  return `prs_${rand}`;
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

/**
 * Presenter: create a new session and return its ID.
 * Snapshot stores all data needed to render slides (report meta + ads).
 */
export async function createPresentSession(
  snapshot: PresentSessionSnapshot
): Promise<string | null> {
  if (!supabase) return null;
  const id = genSessionId();
  const { error } = await supabase.from("presentation_sessions").insert({
    id,
    current_slide: 0,
    snapshot,
  });
  if (error) {
    console.error("[presentSession] create error:", error.message);
    return null;
  }
  return id;
}

/**
 * Presenter: push current slide number to Supabase.
 * Realtime picks this up and broadcasts to all viewers.
 */
export async function updatePresentSlide(
  sessionId: string,
  slide: number
): Promise<void> {
  if (!supabase) return;
  await supabase
    .from("presentation_sessions")
    .update({ current_slide: slide })
    .eq("id", sessionId);
}

/**
 * Viewer: load session data (once, on mount).
 */
export async function getPresentSession(
  sessionId: string
): Promise<PresentSession | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("presentation_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();
  if (error || !data) return null;
  return data as PresentSession;
}

/**
 * Presenter: mark the session as ended.
 * Realtime broadcasts to all viewers — they show "สิ้นสุดการรายงาน" immediately.
 */
export async function endPresentSession(sessionId: string): Promise<void> {
  if (!supabase) return;
  await supabase
    .from("presentation_sessions")
    .update({ status: "ended" })
    .eq("id", sessionId);
}

/**
 * Presenter: heartbeat ping — updates last_ping_at every 30 s.
 * Viewers detect stale ping (> 60 s) and show "ended" automatically.
 */
export async function pingPresentSession(sessionId: string): Promise<void> {
  if (!supabase) return;
  await supabase
    .from("presentation_sessions")
    .update({ last_ping_at: new Date().toISOString() })
    .eq("id", sessionId);
}

/**
 * Viewer: subscribe to slide changes AND status changes via Supabase Realtime.
 * Returns an unsubscribe function — call it on component unmount.
 *
 * @param sessionId  — session to watch
 * @param onSlide    — called with new slide number whenever presenter changes
 * @param onEnded    — called when presenter ends the session
 */
export function subscribePresentSlide(
  sessionId: string,
  onSlide: (slide: number) => void,
  onEnded?: () => void
): () => void {
  if (!supabase) return () => {};

  const channel = supabase
    .channel(`present:${sessionId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "presentation_sessions",
        filter: `id=eq.${sessionId}`,
      },
      (payload) => {
        const row = payload.new as { current_slide: number; status: string; last_ping_at: string };
        // session ended — notify viewer
        if (row.status === "ended") {
          onEnded?.();
          return;
        }
        // slide changed
        if (typeof row.current_slide === "number") onSlide(row.current_slide);
      }
    )
    .subscribe();

  return () => {
    supabase?.removeChannel(channel);
  };
}

/** Public URL for a session */
export function presentUrl(sessionId: string): string {
  return `${window.location.origin}/present/${sessionId}`;
}
