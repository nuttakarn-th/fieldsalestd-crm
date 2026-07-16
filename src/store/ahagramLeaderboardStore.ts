/**
 * ahagramLeaderboardStore — AHAGRAM game leaderboard
 *
 * Cross-device sync via Supabase:
 *  - init(): loads all scores from Supabase + subscribes realtime
 *  - upsertScore(): saves to local state immediately + upserts to Supabase
 *  - Realtime INSERT/UPDATE from other users updates local state live
 *
 * Falls back to local-only (no cross-device) when SUPABASE_ENABLED=false.
 */
import { create } from "zustand";
import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";

export interface AhagramLeaderEntry {
  username:    string;
  displayName: string;
  score:       number;
  trips:       number;
  updatedAt:   string;
}

// Row shape as stored in Supabase
interface DbRow {
  username:     string;
  display_name: string;
  score:        number;
  trips:        number;
  updated_at:   string;
}

function rowToEntry(row: DbRow): AhagramLeaderEntry {
  return {
    username:    row.username,
    displayName: row.display_name,
    score:       row.score,
    trips:       row.trips,
    updatedAt:   row.updated_at,
  };
}

interface AhagramLeaderboardStore {
  entries: AhagramLeaderEntry[];

  upsertScore: (
    username:    string,
    displayName: string,
    score:       number,
    trips:       number
  ) => void;

  /** เรียกครั้งเดียวตอน mount — โหลดจาก Supabase + subscribe realtime */
  init: () => () => void;

  /** Internal: merge/update a single entry in local state */
  _mergeEntry: (entry: AhagramLeaderEntry) => void;
}

export const useAhagramLeaderboard = create<AhagramLeaderboardStore>()(
  (set, get) => ({
    entries: [],

    // ── _mergeEntry: upsert a single entry in local state ─────────────────────
    _mergeEntry: (entry) => {
      set((s) => {
        const idx = s.entries.findIndex((e) => e.username === entry.username);
        if (idx >= 0) {
          const next = [...s.entries];
          // Only update if the incoming record is newer
          if (entry.updatedAt >= next[idx].updatedAt) {
            next[idx] = entry;
          }
          return { entries: next };
        }
        return { entries: [...s.entries, entry] };
      });
    },

    // ── upsertScore: update local state immediately + push to Supabase ────────
    upsertScore: (username, displayName, score, trips) => {
      const updatedAt = new Date().toISOString();
      const entry: AhagramLeaderEntry = { username, displayName, score, trips, updatedAt };

      // Optimistic local update
      get()._mergeEntry(entry);

      // Persist to Supabase (cross-device)
      if (SUPABASE_ENABLED && supabase) {
        supabase
          .from("ahagram_scores")
          .upsert(
            {
              username,
              display_name: displayName,
              score,
              trips,
              updated_at: updatedAt,
            },
            { onConflict: "username" }
          )
          .then(({ error }) => {
            if (error) console.error("[ahagram] upsert ล้มเหลว:", error);
          });
      }
    },

    // ── init: load history + subscribe realtime ────────────────────────────────
    init: () => {
      const { _mergeEntry } = get();

      let unsubRealtime: (() => void) | null = null;

      if (SUPABASE_ENABLED && supabase) {
        // 1. Load all existing scores
        supabase
          .from("ahagram_scores")
          .select("*")
          .order("score", { ascending: false })
          .then(({ data, error }) => {
            if (error) {
              console.error("[ahagram] load ล้มเหลว:", error);
              return;
            }
            (data as DbRow[]).forEach((row) => _mergeEntry(rowToEntry(row)));
          });

        // 2. Subscribe to realtime INSERT and UPDATE from other users
        const channel = supabase
          .channel("ahagram-leaderboard-realtime")
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "ahagram_scores" },
            (payload) => _mergeEntry(rowToEntry(payload.new as DbRow))
          )
          .on(
            "postgres_changes",
            { event: "UPDATE", schema: "public", table: "ahagram_scores" },
            (payload) => _mergeEntry(rowToEntry(payload.new as DbRow))
          )
          .subscribe((status) => {
            console.info("[ahagram] realtime:", status);
          });

        unsubRealtime = () => supabase!.removeChannel(channel);
      }

      return () => {
        unsubRealtime?.();
      };
    },
  })
);
