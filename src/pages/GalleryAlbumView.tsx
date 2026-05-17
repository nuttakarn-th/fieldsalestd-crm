import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Upload, Trash2, X, ChevronLeft, ChevronRight,
  Expand, Images, ImagePlus, Star,
} from "lucide-react";
import { StandaloneHeader } from "@/components/StandaloneHeader";
import { useGallery } from "@/store/galleryStore";
import { useCurrentUser } from "@/store/authStore";
import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";
import { compressImage } from "@/lib/imageCompression";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

async function uploadGalleryImage(file: File, albumId: string): Promise<string> {
  if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not enabled");
  const compressed = await compressImage(file, { maxWidth: 1200, maxSizeKB: 250 });
  const blob = await fetch(compressed.dataUrl).then((r) => r.blob());
  const photoFile = new File([blob], `${crypto.randomUUID()}.jpg`, { type: "image/jpeg" });
  const path = `gallery/${albumId}/${photoFile.name}`;
  const { data, error } = await supabase.storage
    .from("presentations")
    .upload(path, photoFile, { upsert: false });
  if (error) throw error;
  const { data: urlData } = supabase.storage.from("presentations").getPublicUrl(data.path);
  return urlData.publicUrl;
}

export default function GalleryAlbumView() {
  const { albumId } = useParams<{ albumId: string }>();
  const user = useCurrentUser();
  const navigate = useNavigate();
  const { albums, photos: allPhotos, loadAlbums, loadPhotos, addPhotos, deletePhoto, setCover } = useGallery();

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });
  const [slideIndex, setSlideIndex] = useState<number | null>(null); // null = closed

  const fileRef = useRef<HTMLInputElement>(null);

  const album = albums.find((a) => a.id === albumId);
  const photos = albumId ? (allPhotos[albumId] ?? []) : [];

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    if (albums.length === 0) loadAlbums();
    if (albumId) loadPhotos(albumId);
  }, [user, albumId]);

  // Keyboard navigation for slideshow
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (slideIndex === null) return;
    if (e.key === "ArrowRight") setSlideIndex((i) => i !== null ? Math.min(i + 1, photos.length - 1) : null);
    if (e.key === "ArrowLeft")  setSlideIndex((i) => i !== null ? Math.max(i - 1, 0) : null);
    if (e.key === "Escape")     setSlideIndex(null);
  }, [slideIndex, photos.length]);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  if (!user) return null;

  // ---- Upload handler ----
  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!albumId) return;
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    setUploadProgress({ done: 0, total: files.length });

    const uploaded: Array<{ url: string; uploaded_by: string }> = [];
    for (const file of files) {
      try {
        const url = await uploadGalleryImage(file, albumId);
        uploaded.push({ url, uploaded_by: user.user_id });
        setUploadProgress((p) => ({ ...p, done: p.done + 1 }));
      } catch (err) {
        toast.error(`อัปโหลด ${file.name} ไม่สำเร็จ`);
      }
    }
    if (uploaded.length > 0) {
      await addPhotos(albumId, uploaded);
      toast.success(`เพิ่ม ${uploaded.length} รูปแล้ว`);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  // ---- Delete photo ----
  const handleDeletePhoto = async (photoId: string, photoUploadedBy: string) => {
    if (user.role !== "Admin" && photoUploadedBy !== user.user_id && album?.created_by !== user.user_id) {
      toast.error("ลบได้เฉพาะรูปของตัวเอง"); return;
    }
    if (!confirm("ลบรูปนี้?")) return;
    if (!albumId) return;
    await deletePhoto(photoId, albumId);
    // If we deleted the current slideshow photo, close or move back
    if (slideIndex !== null) {
      if (photos.length <= 1) setSlideIndex(null);
      else setSlideIndex((i) => Math.min(i ?? 0, photos.length - 2));
    }
    toast.success("ลบรูปแล้ว");
  };

  // ---- Set cover ----
  const handleSetCover = async (url: string) => {
    if (!albumId) return;
    await setCover(albumId, url);
    toast.success("ตั้งเป็นภาพปกแล้ว");
  };

  const canDelete = (uploadedBy: string) =>
    user.role === "Admin" || uploadedBy === user.user_id || album?.created_by === user.user_id;

  // ---- Slideshow photo ----
  const slidePhoto = slideIndex !== null ? photos[slideIndex] : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
      <StandaloneHeader
        backTo="/gallery"
        extra={
          <div className="flex items-center justify-end gap-2">
            {uploading && (
              <span className="text-sm text-muted-foreground">
                {uploadProgress.done}/{uploadProgress.total} อัปโหลด...
              </span>
            )}
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={handleFilePick} />
            <Button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              size="sm"
              className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white border-0 gap-1.5"
            >
              <ImagePlus className="w-4 h-4" />
              {uploading ? `${uploadProgress.done}/${uploadProgress.total}` : "เพิ่มรูปภาพ"}
            </Button>
          </div>
        }
      />

      {/* Photo grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        {photos.length === 0 ? (
          <div className="text-center py-28 text-muted-foreground">
            <div
              className="w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center mx-auto mb-4 opacity-30 cursor-pointer hover:opacity-50 transition"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-10 h-10 text-white" />
            </div>
            <p className="font-semibold">ยังไม่มีรูปในอัลบั้มนี้</p>
            <p className="text-sm mt-1">กด "เพิ่มรูปภาพ" เพื่อเริ่มอัปโหลด</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-3">{photos.length} รูป · กดรูปเพื่อดูแบบ Slide</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
              {photos.map((photo, idx) => (
                <div
                  key={photo.id}
                  className="group relative aspect-square rounded-xl overflow-hidden bg-muted cursor-pointer"
                  onClick={() => setSlideIndex(idx)}
                >
                  <img
                    src={photo.url}
                    alt={photo.caption ?? `รูป ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  {/* Cover badge */}
                  {album?.cover_url === photo.url && (
                    <div className="absolute top-1.5 left-1.5 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5" /> ปก
                    </div>
                  )}
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-colors flex items-end justify-end p-1.5 gap-1.5">
                    {/* Set cover */}
                    {album?.cover_url !== photo.url && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSetCover(photo.url); }}
                        className="w-7 h-7 rounded-lg bg-yellow-400/90 text-yellow-900 flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-yellow-400 shadow"
                        title="ตั้งเป็นภาพปก"
                      >
                        <Star className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {/* Delete */}
                    {canDelete(photo.uploaded_by) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeletePhoto(photo.id, photo.uploaded_by); }}
                        className="w-7 h-7 rounded-lg bg-red-600/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-red-600 shadow"
                        title="ลบรูปนี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {/* Expand icon (center) */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition pointer-events-none">
                      <Expand className="w-6 h-6 text-white drop-shadow-lg" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* ===== Fullscreen Slideshow ===== */}
      {slideIndex !== null && slidePhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col"
          onClick={() => setSlideIndex(null)}
        >
          {/* Top bar */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-white/70 text-sm font-medium">
              {slideIndex + 1} / {photos.length}
            </span>
            <div className="flex items-center gap-2">
              {/* Set cover from slideshow */}
              {album?.cover_url !== slidePhoto.url && (
                <button
                  onClick={() => handleSetCover(slidePhoto.url)}
                  className="flex items-center gap-1.5 text-yellow-300 hover:text-yellow-200 text-sm px-3 py-1.5 rounded-lg hover:bg-white/10 transition"
                  title="ตั้งเป็นภาพปก"
                >
                  <Star className="w-4 h-4" /> ตั้งเป็นปก
                </button>
              )}
              {/* Delete from slideshow */}
              {canDelete(slidePhoto.uploaded_by) && (
                <button
                  onClick={() => handleDeletePhoto(slidePhoto.id, slidePhoto.uploaded_by)}
                  className="flex items-center gap-1.5 text-red-400 hover:text-red-300 text-sm px-3 py-1.5 rounded-lg hover:bg-white/10 transition"
                >
                  <Trash2 className="w-4 h-4" /> ลบ
                </button>
              )}
              <button
                onClick={() => setSlideIndex(null)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main image area */}
          <div
            className="flex-1 flex items-center justify-center relative min-h-0 px-14"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Prev */}
            <button
              onClick={() => setSlideIndex((i) => Math.max((i ?? 1) - 1, 0))}
              disabled={slideIndex === 0}
              className="absolute left-2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition disabled:opacity-20"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Photo */}
            <img
              key={slidePhoto.id}
              src={slidePhoto.url}
              alt={slidePhoto.caption ?? `รูป ${slideIndex + 1}`}
              className="max-w-full max-h-full object-contain rounded-lg select-none"
              style={{ maxHeight: "calc(100vh - 10rem)" }}
            />

            {/* Next */}
            <button
              onClick={() => setSlideIndex((i) => Math.min((i ?? 0) + 1, photos.length - 1))}
              disabled={slideIndex === photos.length - 1}
              className="absolute right-2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition disabled:opacity-20"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Dot indicators */}
          {photos.length <= 20 && (
            <div
              className="flex justify-center gap-1.5 py-3 flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              {photos.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSlideIndex(i)}
                  className={`rounded-full transition-all ${
                    i === slideIndex ? "w-5 h-2 bg-white" : "w-2 h-2 bg-white/35 hover:bg-white/60"
                  }`}
                />
              ))}
            </div>
          )}

          {/* Caption */}
          {slidePhoto.caption && (
            <p
              className="text-center text-white/70 text-sm pb-4 flex-shrink-0 px-8"
              onClick={(e) => e.stopPropagation()}
            >
              {slidePhoto.caption}
            </p>
          )}

          {/* Thumbnail strip (small screen: hide, large: show) */}
          <div
            className="hidden md:flex gap-1.5 px-4 pb-4 overflow-x-auto flex-shrink-0 justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {photos.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setSlideIndex(i)}
                className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition ${
                  i === slideIndex ? "border-white scale-110" : "border-transparent opacity-50 hover:opacity-80"
                }`}
              >
                <img src={p.url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
