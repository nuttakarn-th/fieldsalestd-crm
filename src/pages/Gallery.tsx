import { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Plus, Images, Trash2, X, Check, Pencil } from "lucide-react";
import { StandaloneHeader } from "@/components/StandaloneHeader";
import { useGallery } from "@/store/galleryStore";
import { useCurrentUser } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const ALBUM_GRADIENTS = [
  "from-pink-500 via-rose-500 to-orange-400",
  "from-violet-500 via-purple-600 to-indigo-500",
  "from-cyan-500 via-sky-500 to-blue-600",
  "from-emerald-400 via-teal-500 to-cyan-500",
  "from-amber-400 via-orange-500 to-rose-500",
  "from-fuchsia-500 via-pink-500 to-rose-400",
  "from-blue-500 via-indigo-500 to-violet-500",
];

export default function Gallery() {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const { albums, loadAlbums, createAlbum, renameAlbum, deleteAlbum } = useGallery();

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [saving, setSaving] = useState(false);

  // Inline rename state
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [editName, setEditName]       = useState("");
  const [editDesc, setEditDesc]       = useState("");
  const [renameSaving, setRenameSaving] = useState(false);
  const editNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    loadAlbums();
  }, [user, navigate, loadAlbums]);

  if (!user) return null;

  const handleCreate = async () => {
    if (!newName.trim()) { toast.error("กรอกชื่ออัลบั้มก่อน"); return; }
    setSaving(true);
    const album = await createAlbum(newName.trim(), newDesc.trim(), user.user_id, user.full_name);
    setSaving(false);
    if (album) {
      toast.success("สร้างอัลบั้มแล้ว");
      setCreating(false);
      setNewName(""); setNewDesc("");
      navigate(`/gallery/${album.id}`);
    } else {
      toast.error("สร้างไม่สำเร็จ — ลอง push SQL migration ก่อน");
    }
  };

  const openRename = (e: React.MouseEvent, album: typeof albums[number]) => {
    e.preventDefault(); e.stopPropagation();
    setEditingId(album.id);
    setEditName(album.name);
    setEditDesc(album.description ?? "");
    setTimeout(() => editNameRef.current?.focus(), 50);
  };

  const cancelRename = (e?: React.MouseEvent) => {
    e?.preventDefault(); e?.stopPropagation();
    setEditingId(null); setEditName(""); setEditDesc("");
  };

  const handleRename = async (e: React.MouseEvent, id: string) => {
    e.preventDefault(); e.stopPropagation();
    if (!editName.trim()) { toast.error("กรอกชื่ออัลบั้มก่อน"); return; }
    setRenameSaving(true);
    await renameAlbum(id, editName.trim(), editDesc.trim() || undefined);
    setRenameSaving(false);
    toast.success("แก้ไขชื่ออัลบั้มแล้ว ✅");
    cancelRename();
  };

  const handleDelete = async (e: React.MouseEvent, id: string, createdBy: string) => {
    e.preventDefault(); e.stopPropagation();
    if (user.role !== "Admin" && createdBy !== user.user_id) {
      toast.error("ลบได้เฉพาะอัลบั้มของตัวเอง (Admin ลบทุกอัลบั้มได้)");
      return;
    }
    if (!confirm("ลบอัลบั้มนี้? ภาพทั้งหมดในอัลบั้มจะหายด้วย")) return;
    await deleteAlbum(id);
    toast.success("ลบอัลบั้มแล้ว");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
      <StandaloneHeader
        backTo="/"
        extra={
          <div className="flex justify-end">
            <Button
              onClick={() => { setCreating(true); }}
              disabled={creating}
              size="sm"
              className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white border-0 shadow-lg gap-1.5"
              title="สร้าง Album"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">สร้าง Album</span>
            </Button>
          </div>
        }
      />

      <main className="max-w-6xl mx-auto px-6 pb-16 space-y-6">
        {/* Create Album form */}
        {creating && (
          <div className="rounded-2xl border bg-card shadow-sm p-5 space-y-3">
            <p className="font-semibold text-sm">สร้างอัลบั้มใหม่</p>
            <Input
              placeholder="ชื่ออัลบั้ม *"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <Input
              placeholder="คำอธิบาย (ไม่บังคับ) เช่น ทัวร์จีน เมษายน 2569"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
            />
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={saving} size="sm" className="gap-1.5">
                <Check className="w-3.5 h-3.5" /> {saving ? "กำลังสร้าง..." : "สร้าง"}
              </Button>
              <Button
                variant="ghost" size="sm"
                onClick={() => { setCreating(false); setNewName(""); setNewDesc(""); }}
                className="gap-1.5"
              >
                <X className="w-3.5 h-3.5" /> ยกเลิก
              </Button>
            </div>
          </div>
        )}

        {/* Albums grid */}
        {albums.length === 0 ? (
          <div className="text-center py-28 text-muted-foreground">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-pink-500 via-rose-500 to-orange-400 flex items-center justify-center mx-auto mb-5 opacity-30">
              <Images className="w-12 h-12 text-white" />
            </div>
            <p className="font-semibold text-lg">ยังไม่มีอัลบั้ม</p>
            <p className="text-sm mt-1">กด "สร้าง Album" เพื่อเริ่มเพิ่มรูปภาพ</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {albums.map((album, i) => {
              const canEdit = user.role === "Admin" || album.created_by === user.user_id;
              const isEditing = editingId === album.id;

              return (
                <div key={album.id} className="group block">
                  <article className={`rounded-2xl overflow-hidden shadow-soft hover:shadow-elegant transition-all duration-200 hover:-translate-y-1 bg-card border ${isEditing ? "ring-2 ring-violet-400" : ""}`}>
                    {/* Cover image area — click navigates unless editing */}
                    <Link to={isEditing ? "#" : `/gallery/${album.id}`} onClick={isEditing ? e => e.preventDefault() : undefined}>
                      <div className={`relative aspect-square bg-gradient-to-br ${ALBUM_GRADIENTS[i % ALBUM_GRADIENTS.length]} overflow-hidden`}>
                        {album.cover_url ? (
                          <img
                            src={album.cover_url}
                            alt={album.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Images className="w-10 h-10 text-white/40" />
                          </div>
                        )}

                        {/* Photo count badge */}
                        <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm text-white text-[11px] font-semibold px-2 py-0.5 rounded-full">
                          {album.photo_count ?? 0} รูป
                        </div>

                        {/* Action buttons — visible on hover */}
                        {canEdit && !isEditing && (
                          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            {/* Edit / Rename */}
                            <button
                              onClick={(e) => openRename(e, album)}
                              className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center hover:bg-violet-600/90 transition-all shadow-lg"
                              title="แก้ไขชื่ออัลบั้ม"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            {/* Delete */}
                            <button
                              onClick={(e) => handleDelete(e, album.id, album.created_by)}
                              className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center hover:bg-red-600/90 transition-all shadow-lg"
                              title="ลบอัลบั้ม"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </Link>

                    {/* Info / Inline rename */}
                    <div className="px-3 py-2.5">
                      {isEditing ? (
                        /* ── Inline rename form ── */
                        <div className="space-y-1.5" onClick={e => e.preventDefault()}>
                          <Input
                            ref={editNameRef}
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === "Enter") handleRename(e as any, album.id);
                              if (e.key === "Escape") cancelRename();
                            }}
                            placeholder="ชื่ออัลบั้ม"
                            className="h-7 text-xs px-2"
                          />
                          <Input
                            value={editDesc}
                            onChange={e => setEditDesc(e.target.value)}
                            onKeyDown={e => { if (e.key === "Escape") cancelRename(); }}
                            placeholder="คำอธิบาย (ไม่บังคับ)"
                            className="h-7 text-xs px-2"
                          />
                          <div className="flex gap-1 pt-0.5">
                            <button
                              onClick={e => handleRename(e, album.id)}
                              disabled={renameSaving}
                              className="flex-1 flex items-center justify-center gap-1 h-7 rounded-md bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-semibold transition-colors disabled:opacity-60"
                            >
                              <Check className="w-3 h-3" />
                              {renameSaving ? "..." : "บันทึก"}
                            </button>
                            <button
                              onClick={cancelRename}
                              className="flex-1 flex items-center justify-center gap-1 h-7 rounded-md border hover:bg-muted text-[11px] font-medium transition-colors"
                            >
                              <X className="w-3 h-3" /> ยกเลิก
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* ── Normal info display ── */
                        <Link to={`/gallery/${album.id}`}>
                          <div className="flex items-start justify-between gap-1">
                            <div className="min-w-0">
                              <h3 className="font-semibold text-sm leading-tight line-clamp-1">{album.name}</h3>
                              {album.description && (
                                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{album.description}</p>
                              )}
                              <p className="text-[11px] text-muted-foreground mt-1 opacity-70">
                                โดย {album.created_by_name}
                              </p>
                            </div>
                            {/* Edit pencil icon — always visible in info section for canEdit */}
                            {canEdit && (
                              <button
                                onClick={(e) => openRename(e, album)}
                                className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-colors opacity-0 group-hover:opacity-100"
                                title="แก้ไขชื่ออัลบั้ม"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </Link>
                      )}
                    </div>
                  </article>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
