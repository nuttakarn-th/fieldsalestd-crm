import { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Plus, Images, Trash2, X, Check, Pencil, Flame, Globe2,
  SlidersHorizontal, ChevronDown, ChevronUp,
} from "lucide-react";
import { StandaloneHeader } from "@/components/StandaloneHeader";
import { useGallery, type GalleryAlbum } from "@/store/galleryStore";
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

// ── Highlight card (larger) ───────────────────────────────────────────────────
function HighlightCard({ album, idx, canEdit, onToggleHighlight }: {
  album: GalleryAlbum;
  idx: number;
  canEdit: boolean;
  onToggleHighlight: (e: React.MouseEvent) => void;
}) {
  return (
    <div className="relative group">
      <Link to={`/gallery/${album.id}`}>
        <div className={`relative aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-br ${ALBUM_GRADIENTS[idx % ALBUM_GRADIENTS.length]} shadow-lg`}>
          {album.cover_url ? (
            <img src={album.cover_url} alt={album.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Images className="w-12 h-12 text-white/30" />
            </div>
          )}
          {/* Dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          {/* Photo count */}
          <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-sm text-white text-[11px] font-semibold px-2 py-0.5 rounded-full">
            {album.photo_count ?? 0} รูป
          </div>
          {/* Text overlay */}
          <div className="absolute bottom-0 left-0 right-0 px-4 py-3">
            <h3 className="font-bold text-white text-base leading-tight line-clamp-1">{album.name}</h3>
            {album.country && (
              <p className="text-white/70 text-xs mt-0.5 flex items-center gap-1">
                <Globe2 className="w-3 h-3" /> {album.country}
              </p>
            )}
          </div>
        </div>
      </Link>
      {/* Fire toggle */}
      {canEdit && (
        <button
          onClick={onToggleHighlight}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm text-orange-400 flex items-center justify-center hover:bg-orange-500 hover:text-white transition-all shadow-lg"
          title="ยกเลิก Highlight"
        >
          <Flame className="w-4 h-4 fill-current" />
        </button>
      )}
    </div>
  );
}

// ── Album card (normal grid) ──────────────────────────────────────────────────
function AlbumCard({ album, idx, canEdit, isEditing, editName, editDesc, editCountry, editNameRef, renameSaving,
  onOpenRename, onCancelRename, onSaveRename, onDelete, onToggleHighlight,
  setEditName, setEditDesc, setEditCountry,
}: {
  album: GalleryAlbum; idx: number; canEdit: boolean; isEditing: boolean;
  editName: string; editDesc: string; editCountry: string;
  editNameRef: React.RefObject<HTMLInputElement>; renameSaving: boolean;
  onOpenRename: (e: React.MouseEvent) => void;
  onCancelRename: (e?: React.MouseEvent) => void;
  onSaveRename: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  onToggleHighlight: (e: React.MouseEvent) => void;
  setEditName: (v: string) => void;
  setEditDesc: (v: string) => void;
  setEditCountry: (v: string) => void;
}) {
  const isHighlight = album.is_highlight;

  return (
    <article className={`rounded-2xl overflow-hidden shadow-soft hover:shadow-elegant transition-all duration-200 hover:-translate-y-0.5 bg-card border group ${isEditing ? "ring-2 ring-violet-400" : ""}`}>
      {/* Cover */}
      <Link to={isEditing ? "#" : `/gallery/${album.id}`} onClick={isEditing ? e => e.preventDefault() : undefined}>
        <div className={`relative aspect-square bg-gradient-to-br ${ALBUM_GRADIENTS[idx % ALBUM_GRADIENTS.length]} overflow-hidden`}>
          {album.cover_url ? (
            <img src={album.cover_url} alt={album.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Images className="w-10 h-10 text-white/40" />
            </div>
          )}
          {/* Count badge */}
          <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm text-white text-[11px] font-semibold px-2 py-0.5 rounded-full">
            {album.photo_count ?? 0} รูป
          </div>
          {/* Action buttons on hover */}
          {canEdit && !isEditing && (
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
              {/* Fire / Highlight toggle */}
              <button
                onClick={onToggleHighlight}
                className={`w-8 h-8 rounded-full backdrop-blur-sm flex items-center justify-center transition-all shadow-lg ${
                  isHighlight
                    ? "bg-orange-500 text-white"
                    : "bg-black/50 text-white hover:bg-orange-500"
                }`}
                title={isHighlight ? "ยกเลิก Highlight" : "ตั้งเป็น Highlight"}
              >
                <Flame className={`w-3.5 h-3.5 ${isHighlight ? "fill-current" : ""}`} />
              </button>
              {/* Edit */}
              <button onClick={onOpenRename}
                className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center hover:bg-violet-600/90 transition-all shadow-lg"
                title="แก้ไขชื่ออัลบั้ม">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              {/* Delete */}
              <button onClick={onDelete}
                className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center hover:bg-red-600/90 transition-all shadow-lg"
                title="ลบอัลบั้ม">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {/* Highlight badge */}
          {isHighlight && !isEditing && (
            <div className="absolute top-2 left-2 flex items-center gap-1 bg-orange-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              <Flame className="w-3 h-3 fill-current" /> แนะนำ
            </div>
          )}
        </div>
      </Link>

      {/* Info / Inline rename */}
      <div className="px-3 py-2.5">
        {isEditing ? (
          <div className="space-y-1.5" onClick={e => e.preventDefault()}>
            <Input ref={editNameRef} value={editName} onChange={e => setEditName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") onSaveRename(e as any); if (e.key === "Escape") onCancelRename(); }}
              placeholder="ชื่ออัลบั้ม *" className="h-7 text-xs px-2" />
            <Input value={editCountry} onChange={e => setEditCountry(e.target.value)}
              onKeyDown={e => { if (e.key === "Escape") onCancelRename(); }}
              placeholder="ประเทศ / ภูมิภาค (เช่น ญี่ปุ่น, ยุโรป)" className="h-7 text-xs px-2" />
            <Input value={editDesc} onChange={e => setEditDesc(e.target.value)}
              onKeyDown={e => { if (e.key === "Escape") onCancelRename(); }}
              placeholder="คำอธิบาย (ไม่บังคับ)" className="h-7 text-xs px-2" />
            <div className="flex gap-1 pt-0.5">
              <button onClick={onSaveRename} disabled={renameSaving}
                className="flex-1 flex items-center justify-center gap-1 h-7 rounded-md bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-semibold transition-colors disabled:opacity-60">
                <Check className="w-3 h-3" /> {renameSaving ? "..." : "บันทึก"}
              </button>
              <button onClick={onCancelRename}
                className="flex-1 flex items-center justify-center gap-1 h-7 rounded-md border hover:bg-muted text-[11px] font-medium transition-colors">
                <X className="w-3 h-3" /> ยกเลิก
              </button>
            </div>
          </div>
        ) : (
          <Link to={`/gallery/${album.id}`}>
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0">
                <h3 className="font-semibold text-sm leading-tight line-clamp-1">{album.name}</h3>
                {album.country && (
                  <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Globe2 className="w-3 h-3" />{album.country}
                  </p>
                )}
                {album.description && (
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{album.description}</p>
                )}
                <p className="text-[11px] text-muted-foreground mt-1 opacity-60">โดย {album.created_by_name}</p>
              </div>
              {canEdit && (
                <button onClick={onOpenRename}
                  className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-colors opacity-0 group-hover:opacity-100">
                  <Pencil className="w-3 h-3" />
                </button>
              )}
            </div>
          </Link>
        )}
      </div>
    </article>
  );
}

// ── Main Gallery page ─────────────────────────────────────────────────────────
export default function Gallery() {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const { albums, loadAlbums, createAlbum, renameAlbum, toggleHighlight, deleteAlbum } = useGallery();

  // Create album
  const [creating, setCreating]     = useState(false);
  const [newName, setNewName]       = useState("");
  const [newDesc, setNewDesc]       = useState("");
  const [newCountry, setNewCountry] = useState("");
  const [saving, setSaving]         = useState(false);

  // Rename
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [editName, setEditName]         = useState("");
  const [editDesc, setEditDesc]         = useState("");
  const [editCountry, setEditCountry]   = useState("");
  const [renameSaving, setRenameSaving] = useState(false);
  const editNameRef = useRef<HTMLInputElement>(null);

  // Filter
  const [activeCountry, setActiveCountry] = useState<string | null>(null);
  const [filterOpen, setFilterOpen]       = useState(false); // mobile

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    loadAlbums();
  }, [user, navigate, loadAlbums]);

  if (!user) return null;

  const canEditAlbum = (album: GalleryAlbum) =>
    user.role === "Admin" || album.created_by === user.user_id;

  // ── Derived ──────────────────────────────────────────────────────────────────
  const allCountries = useMemo(
    () => [...new Set(albums.map(a => a.country).filter(Boolean) as string[])].sort(),
    [albums]
  );
  const highlightAlbums = useMemo(
    () => albums.filter(a => a.is_highlight).slice(0, 3),
    [albums]
  );
  const filteredAlbums = useMemo(
    () => activeCountry ? albums.filter(a => a.country === activeCountry) : albums,
    [albums, activeCountry]
  );
  const highlightCount = albums.filter(a => a.is_highlight).length;

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!newName.trim()) { toast.error("กรอกชื่ออัลบั้มก่อน"); return; }
    setSaving(true);
    const album = await createAlbum(newName.trim(), newDesc.trim(), newCountry.trim(), user.user_id, user.full_name);
    setSaving(false);
    if (album) {
      toast.success("สร้างอัลบั้มแล้ว");
      setCreating(false); setNewName(""); setNewDesc(""); setNewCountry("");
      navigate(`/gallery/${album.id}`);
    } else {
      toast.error("สร้างไม่สำเร็จ — ลอง push SQL migration ก่อน (15_gallery_country_highlight.sql)");
    }
  };

  const openRename = (e: React.MouseEvent, album: GalleryAlbum) => {
    e.preventDefault(); e.stopPropagation();
    setEditingId(album.id);
    setEditName(album.name);
    setEditDesc(album.description ?? "");
    setEditCountry(album.country ?? "");
    setTimeout(() => editNameRef.current?.focus(), 50);
  };
  const cancelRename = (e?: React.MouseEvent) => {
    e?.preventDefault(); e?.stopPropagation();
    setEditingId(null); setEditName(""); setEditDesc(""); setEditCountry("");
  };
  const handleRename = async (e: React.MouseEvent, id: string) => {
    e.preventDefault(); e.stopPropagation();
    if (!editName.trim()) { toast.error("กรอกชื่ออัลบั้มก่อน"); return; }
    setRenameSaving(true);
    await renameAlbum(id, editName.trim(), editDesc.trim() || undefined, editCountry.trim() || undefined);
    setRenameSaving(false);
    toast.success("แก้ไขชื่ออัลบั้มแล้ว ✅");
    cancelRename();
  };

  const handleDelete = async (e: React.MouseEvent, album: GalleryAlbum) => {
    e.preventDefault(); e.stopPropagation();
    if (!canEditAlbum(album)) { toast.error("ลบได้เฉพาะอัลบั้มของตัวเอง"); return; }
    if (!confirm("ลบอัลบั้มนี้? ภาพทั้งหมดในอัลบั้มจะหายด้วย")) return;
    await deleteAlbum(album.id);
    toast.success("ลบอัลบั้มแล้ว");
  };

  const handleToggleHighlight = async (e: React.MouseEvent, album: GalleryAlbum) => {
    e.preventDefault(); e.stopPropagation();
    if (!canEditAlbum(album)) return;
    if (!album.is_highlight && highlightCount >= 3) {
      toast.error("สูงสุด 3 อัลบั้มแนะนำ — ยกเลิกอันเดิมก่อน");
      return;
    }
    await toggleHighlight(album.id);
    toast.success(album.is_highlight ? "ยกเลิก Highlight แล้ว" : "ตั้งเป็น Highlight แล้ว 🔥");
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <StandaloneHeader
        backTo="/"
        extra={
          <Button
            onClick={() => setCreating(true)}
            disabled={creating}
            size="sm"
            className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white border-0 shadow-lg gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">สร้าง Album</span>
          </Button>
        }
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-16 pt-4 space-y-4">

        {/* ── Create Album form ── */}
        {creating && (
          <div className="rounded-2xl border bg-card shadow-sm p-5 space-y-3 max-w-md">
            <p className="font-semibold text-sm">สร้างอัลบั้มใหม่</p>
            <Input placeholder="ชื่ออัลบั้ม *" value={newName} onChange={e => setNewName(e.target.value)}
              autoFocus onKeyDown={e => e.key === "Enter" && handleCreate()} />
            <Input placeholder="ประเทศ / ภูมิภาค (เช่น ญี่ปุ่น, ยุโรป)" value={newCountry} onChange={e => setNewCountry(e.target.value)} />
            <Input placeholder="คำอธิบาย (ไม่บังคับ)" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={saving} size="sm" className="gap-1.5">
                <Check className="w-3.5 h-3.5" /> {saving ? "กำลังสร้าง..." : "สร้าง"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setCreating(false); setNewName(""); setNewDesc(""); setNewCountry(""); }} className="gap-1.5">
                <X className="w-3.5 h-3.5" /> ยกเลิก
              </Button>
            </div>
          </div>
        )}

        {/* ── Empty state ── */}
        {albums.length === 0 ? (
          <div className="text-center py-28 text-muted-foreground">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-pink-500 via-rose-500 to-orange-400 flex items-center justify-center mx-auto mb-5 opacity-30">
              <Images className="w-12 h-12 text-white" />
            </div>
            <p className="font-semibold text-lg">ยังไม่มีอัลบั้ม</p>
            <p className="text-sm mt-1">กด "สร้าง Album" เพื่อเริ่มเพิ่มรูปภาพ</p>
          </div>
        ) : (

        /* ── Main layout: LEFT=Filter | RIGHT=(Highlight + Grid) ── */
        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* ══ LEFT: Filter Sidebar ══ */}
          {allCountries.length > 0 && (
            <>
              {/* Mobile toggle button */}
              <button
                onClick={() => setFilterOpen(o => !o)}
                className="lg:hidden flex items-center gap-2 px-4 py-2.5 rounded-xl border bg-card shadow-sm text-sm font-medium w-full"
              >
                <SlidersHorizontal className="w-4 h-4 text-violet-500 shrink-0" />
                <span className="flex-1 text-left">กรองตามประเทศ</span>
                {activeCountry && (
                  <span className="w-5 h-5 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
                )}
                {filterOpen ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
              </button>

              {/* Sidebar panel */}
              <aside className={`w-full lg:w-52 shrink-0 ${filterOpen ? "block" : "hidden"} lg:block`}>
                <div className="rounded-2xl border bg-card shadow-sm p-4 sticky top-20">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Globe2 className="w-4 h-4 text-violet-500" />
                      <span className="font-bold text-sm">กรองประเทศ</span>
                    </div>
                    {activeCountry && (
                      <button onClick={() => setActiveCountry(null)} className="text-xs text-violet-600 hover:underline flex items-center gap-1">
                        <X className="w-3 h-3" /> ล้าง
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => setActiveCountry(null)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${activeCountry === null ? "bg-violet-600 text-white shadow-sm" : "hover:bg-muted text-foreground"}`}
                    >
                      <span>🌐</span>
                      <span className="flex-1">ทั้งหมด</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${activeCountry === null ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}>
                        {albums.length}
                      </span>
                    </button>
                    {allCountries.map(country => {
                      const count = albums.filter(a => a.country === country).length;
                      const active = activeCountry === country;
                      return (
                        <button
                          key={country}
                          onClick={() => setActiveCountry(active ? null : country)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${active ? "bg-violet-600 text-white shadow-sm" : "hover:bg-muted text-foreground"}`}
                        >
                          <span className="shrink-0">📍</span>
                          <span className="flex-1 truncate">{country}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${active ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </aside>
            </>
          )}

          {/* ══ RIGHT: Highlight section + Album grid ══ */}
          <div className="flex-1 min-w-0 space-y-5">

            {/* Highlight featured albums */}
            {highlightAlbums.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Flame className="w-5 h-5 text-orange-500 fill-current" />
                  <h2 className="font-bold text-base">อัลบั้มแนะนำ</h2>
                  <span className="text-xs text-muted-foreground">({highlightAlbums.length}/3)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {highlightAlbums.map((album, i) => (
                    <HighlightCard
                      key={album.id}
                      album={album}
                      idx={i}
                      canEdit={canEditAlbum(album)}
                      onToggleHighlight={e => handleToggleHighlight(e, album)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Album grid */}
            {filteredAlbums.length === 0 ? (
              <div className="rounded-2xl border p-12 text-center bg-card/50">
                <Globe2 className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="font-medium">ไม่มีอัลบั้มในประเทศที่เลือก</p>
                <button onClick={() => setActiveCountry(null)} className="text-violet-600 text-sm mt-2 hover:underline">ดูทั้งหมด</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredAlbums.map((album, i) => (
                  <AlbumCard
                    key={album.id}
                    album={album}
                    idx={i}
                    canEdit={canEditAlbum(album)}
                    isEditing={editingId === album.id}
                    editName={editName}
                    editDesc={editDesc}
                    editCountry={editCountry}
                    editNameRef={editNameRef}
                    renameSaving={renameSaving}
                    onOpenRename={e => openRename(e, album)}
                    onCancelRename={cancelRename}
                    onSaveRename={e => handleRename(e, album.id)}
                    onDelete={e => handleDelete(e, album)}
                    onToggleHighlight={e => handleToggleHighlight(e, album)}
                    setEditName={setEditName}
                    setEditDesc={setEditDesc}
                    setEditCountry={setEditCountry}
                  />
                ))}
              </div>
            )}
          </div>

        </div>
        )}
      </main>
    </div>
  );
}
