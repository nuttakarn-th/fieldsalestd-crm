import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";

export interface GalleryAlbum {
  id: string;
  name: string;
  description?: string;
  country?: string;
  cover_url?: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
  photo_count?: number;
  is_highlight?: boolean;
}

export interface GalleryPhoto {
  id: string;
  album_id: string;
  url: string;
  caption?: string;
  uploaded_by: string;
  uploaded_at: string;
}

interface GalleryStore {
  albums: GalleryAlbum[];
  photos: Record<string, GalleryPhoto[]>;

  loadAlbums: () => Promise<void>;
  loadPhotos: (albumId: string) => Promise<void>;
  createAlbum: (name: string, description: string, country: string, userId: string, userName: string) => Promise<GalleryAlbum | null>;
  renameAlbum: (id: string, name: string, description?: string, country?: string) => Promise<void>;
  toggleHighlight: (id: string) => Promise<void>;
  deleteAlbum: (id: string) => Promise<void>;
  addPhotos: (albumId: string, items: Array<{ url: string; caption?: string; uploaded_by: string }>) => Promise<void>;
  deletePhoto: (id: string, albumId: string) => Promise<void>;
  setCover: (albumId: string, coverUrl: string) => Promise<void>;
}

export const useGallery = create<GalleryStore>()(
  persist(
    (set, get) => ({
      albums: [],
      photos: {},

      loadAlbums: async () => {
        if (!SUPABASE_ENABLED || !supabase) return;
        try {
          const { data, error } = await supabase
            .from("gallery_albums")
            .select("*, gallery_photos(count)")
            .order("created_at", { ascending: false });
          if (error) { console.error("[gallery] loadAlbums:", error); return; }

          // Keep locally-persisted country / is_highlight if Supabase column
          // doesn't exist yet (returns null before migration 15 is run)
          const localAlbums = get().albums;

          const albums: GalleryAlbum[] = (data ?? []).map((a: any) => {
            const local = localAlbums.find((l) => l.id === a.id);
            return {
              id: a.id,
              name: a.name,
              description: a.description,
              // Prefer server value when non-null, else fall back to persisted local value
              country:      a.country      ?? local?.country,
              cover_url:    a.cover_url,
              created_by:   a.created_by,
              created_by_name: a.created_by_name,
              created_at:   a.created_at,
              photo_count:  a.gallery_photos?.[0]?.count ?? 0,
              is_highlight: a.is_highlight ?? local?.is_highlight ?? false,
            };
          });
          set({ albums });
        } catch (e) {
          console.error("[gallery] loadAlbums:", e);
        }
      },

      loadPhotos: async (albumId) => {
        if (!SUPABASE_ENABLED || !supabase) return;
        try {
          const { data, error } = await supabase
            .from("gallery_photos")
            .select("*")
            .eq("album_id", albumId)
            .order("uploaded_at", { ascending: true });
          if (error) { console.error("[gallery] loadPhotos:", error); return; }
          set({ photos: { ...get().photos, [albumId]: data ?? [] } });
        } catch (e) {
          console.error("[gallery] loadPhotos:", e);
        }
      },

      createAlbum: async (name, description, country, userId, userName) => {
        const album: GalleryAlbum = {
          id: `alb-${Date.now()}`,
          name,
          description: description || undefined,
          country: country || undefined,
          created_by: userId,
          created_by_name: userName,
          created_at: new Date().toISOString(),
          photo_count: 0,
          is_highlight: false,
        };
        if (SUPABASE_ENABLED && supabase) {
          const { error } = await supabase.from("gallery_albums").insert({
            id: album.id,
            name: album.name,
            description: album.description,
            country: album.country,
            created_by: album.created_by,
            created_by_name: album.created_by_name,
            created_at: album.created_at,
            is_highlight: false,
          });
          if (error) { console.error("[gallery] createAlbum:", error); return null; }
        }
        // Persist locally immediately
        set({ albums: [album, ...get().albums] });
        return album;
      },

      renameAlbum: async (id, name, description, country) => {
        // Update local state first (optimistic + persisted via middleware)
        set({
          albums: get().albums.map((a) =>
            a.id === id ? { ...a, name, description, country } : a
          ),
        });
        // Then sync to Supabase (best-effort — fails silently if column missing)
        if (SUPABASE_ENABLED && supabase) {
          const { error } = await supabase
            .from("gallery_albums")
            .update({ name, description: description ?? null, country: country ?? null })
            .eq("id", id);
          if (error) console.warn("[gallery] renameAlbum Supabase:", error.message);
        }
      },

      toggleHighlight: async (id) => {
        const album = get().albums.find((a) => a.id === id);
        if (!album) return;
        const highlighted = get().albums.filter((a) => a.is_highlight);
        if (!album.is_highlight && highlighted.length >= 3) return; // max 3
        const next = !album.is_highlight;
        // Update local state first (optimistic + persisted)
        set({
          albums: get().albums.map((a) =>
            a.id === id ? { ...a, is_highlight: next } : a
          ),
        });
        // Sync to Supabase (best-effort)
        if (SUPABASE_ENABLED && supabase) {
          const { error } = await supabase
            .from("gallery_albums")
            .update({ is_highlight: next })
            .eq("id", id);
          if (error) console.warn("[gallery] toggleHighlight Supabase:", error.message);
        }
      },

      deleteAlbum: async (id) => {
        if (SUPABASE_ENABLED && supabase) {
          await supabase.from("gallery_albums").delete().eq("id", id);
        }
        const photos = { ...get().photos };
        delete photos[id];
        set({ albums: get().albums.filter((a) => a.id !== id), photos });
      },

      addPhotos: async (albumId, items) => {
        const rows: GalleryPhoto[] = items.map((p) => ({
          id: crypto.randomUUID(),
          album_id: albumId,
          url: p.url,
          caption: p.caption,
          uploaded_by: p.uploaded_by,
          uploaded_at: new Date().toISOString(),
        }));
        if (SUPABASE_ENABLED && supabase) {
          const { error } = await supabase.from("gallery_photos").insert(rows);
          if (error) { console.error("[gallery] addPhotos:", error); return; }
        }
        const existing = get().photos[albumId] ?? [];
        set({ photos: { ...get().photos, [albumId]: [...existing, ...rows] } });
        set({
          albums: get().albums.map((a) =>
            a.id === albumId ? { ...a, photo_count: (a.photo_count ?? 0) + rows.length } : a
          ),
        });
        const album = get().albums.find((a) => a.id === albumId);
        if (album && !album.cover_url && rows[0]) {
          get().setCover(albumId, rows[0].url);
        }
      },

      deletePhoto: async (id, albumId) => {
        if (SUPABASE_ENABLED && supabase) {
          await supabase.from("gallery_photos").delete().eq("id", id);
        }
        const updated = (get().photos[albumId] ?? []).filter((p) => p.id !== id);
        set({ photos: { ...get().photos, [albumId]: updated } });
        set({
          albums: get().albums.map((a) =>
            a.id === albumId ? { ...a, photo_count: Math.max(0, (a.photo_count ?? 1) - 1) } : a
          ),
        });
      },

      setCover: async (albumId, coverUrl) => {
        if (SUPABASE_ENABLED && supabase) {
          await supabase.from("gallery_albums").update({ cover_url: coverUrl }).eq("id", albumId);
        }
        set({
          albums: get().albums.map((a) =>
            a.id === albumId ? { ...a, cover_url: coverUrl } : a
          ),
        });
      },
    }),
    {
      name: "gallery-store-v1",   // localStorage key
      partialize: (state) => ({ albums: state.albums }), // persist albums only (not photos — too large)
    }
  )
);
