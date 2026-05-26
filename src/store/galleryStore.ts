import { create } from "zustand";
import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";

export interface GalleryAlbum {
  id: string;
  name: string;
  description?: string;
  cover_url?: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
  photo_count?: number;
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
  photos: Record<string, GalleryPhoto[]>; // albumId → photos[]

  loadAlbums: () => Promise<void>;
  loadPhotos: (albumId: string) => Promise<void>;
  createAlbum: (name: string, description: string, userId: string, userName: string) => Promise<GalleryAlbum | null>;
  renameAlbum: (id: string, name: string, description?: string) => Promise<void>;
  deleteAlbum: (id: string) => Promise<void>;
  addPhotos: (albumId: string, items: Array<{ url: string; caption?: string; uploaded_by: string }>) => Promise<void>;
  deletePhoto: (id: string, albumId: string) => Promise<void>;
  setCover: (albumId: string, coverUrl: string) => Promise<void>;
}

export const useGallery = create<GalleryStore>()((set, get) => ({
  albums: [],
  photos: {},

  loadAlbums: async () => {
    if (!SUPABASE_ENABLED || !supabase) return;
    try {
      // Fetch albums + photo count in one shot
      const { data, error } = await supabase
        .from("gallery_albums")
        .select("*, gallery_photos(count)")
        .order("created_at", { ascending: false });
      if (error) { console.error("[gallery] loadAlbums:", error); return; }
      const albums: GalleryAlbum[] = (data ?? []).map((a: any) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        cover_url: a.cover_url,
        created_by: a.created_by,
        created_by_name: a.created_by_name,
        created_at: a.created_at,
        photo_count: a.gallery_photos?.[0]?.count ?? 0,
      }));
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

  createAlbum: async (name, description, userId, userName) => {
    const album: GalleryAlbum = {
      id: `alb-${Date.now()}`,
      name,
      description: description || undefined,
      created_by: userId,
      created_by_name: userName,
      created_at: new Date().toISOString(),
      photo_count: 0,
    };
    if (SUPABASE_ENABLED && supabase) {
      const { error } = await supabase.from("gallery_albums").insert({
        id: album.id,
        name: album.name,
        description: album.description,
        created_by: album.created_by,
        created_by_name: album.created_by_name,
        created_at: album.created_at,
      });
      if (error) { console.error("[gallery] createAlbum:", error); return null; }
    }
    set({ albums: [album, ...get().albums] });
    return album;
  },

  renameAlbum: async (id, name, description) => {
    if (SUPABASE_ENABLED && supabase) {
      await supabase.from("gallery_albums").update({ name, description: description ?? null }).eq("id", id);
    }
    set({ albums: get().albums.map((a) => a.id === id ? { ...a, name, description } : a) });
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
    // Update photo count in local albums state
    set({
      albums: get().albums.map((a) =>
        a.id === albumId ? { ...a, photo_count: (a.photo_count ?? 0) + rows.length } : a
      ),
    });
    // Auto-set cover to first photo uploaded if no cover yet
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
    set({ albums: get().albums.map((a) => a.id === albumId ? { ...a, cover_url: coverUrl } : a) });
  },
}));
