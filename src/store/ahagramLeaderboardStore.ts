/**
 * ahagramLeaderboardStore — AHAGRAM game leaderboard
 * Stores per-user score/trips on this device
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AhagramLeaderEntry {
  username: string;
  displayName: string;
  score: number;
  trips: number;
  updatedAt: string;
}

interface AhagramLeaderboardStore {
  entries: AhagramLeaderEntry[];
  upsertScore: (
    username: string,
    displayName: string,
    score: number,
    trips: number
  ) => void;
}

export const useAhagramLeaderboard = create<AhagramLeaderboardStore>()(
  persist(
    (set) => ({
      entries: [],

      upsertScore: (username, displayName, score, trips) =>
        set((s) => {
          const idx = s.entries.findIndex((e) => e.username === username);
          const entry: AhagramLeaderEntry = {
            username,
            displayName,
            score,
            trips,
            updatedAt: new Date().toISOString(),
          };
          if (idx >= 0) {
            const next = [...s.entries];
            next[idx] = entry;
            return { entries: next };
          }
          return { entries: [...s.entries, entry] };
        }),
    }),
    { name: "stdtour-ahagram-lb-v1" }
  )
);
