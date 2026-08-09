/**
 * ShareDialog.tsx — แชร์โปรแกรมทัวร์ พร้อม Short Link + QR Code + View Stats
 */

import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Copy, Eye, QrCode, Plus, Link2, X, Check } from "lucide-react";
import {
  createShortLink,
  getLinksForPkg,
  deleteShortLink,
  shortUrl,
  type ShortLink,
} from "@/lib/shortLink";

// ── Source presets ────────────────────────────────────────────────────────────
const SOURCE_PRESETS = [
  { key: "link",      label: "🔗 ลิงค์ทั่วไป" },
  { key: "facebook",  label: "📘 Facebook" },
  { key: "line",      label: "💬 LINE" },
  { key: "instagram", label: "📸 Instagram" },
  { key: "tiktok",    label: "🎵 TikTok" },
  { key: "qr-event",  label: "🎪 QR งาน" },
  { key: "brochure",  label: "📄 โบรชัวร์" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  tourId: string;
  tourTitle: string;
  isPublished?: boolean;
  onViewCountChange?: (pkgId: string, total: number) => void;
}

export function ShareDialog({
  open, onClose, tourId, tourTitle, isPublished, onViewCountChange,
}: Props) {
  const pkgId   = `tour_${tourId}`;
  const longUrl = `https://stdtour.vercel.app/api/share?pkg=${pkgId}`;

  const [links,      setLinks]      = useState<ShortLink[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [newSource,  setNewSource]  = useState("");
  const [creating,   setCreating]   = useState(false);
  const [activeQR,   setActiveQR]   = useState<string | null>(null);
  const [copied,     setCopied]     = useState<string | null>(null);   // code ที่เพิ่ง copy

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setActiveQR(null);
    getLinksForPkg(pkgId).then((data) => { setLinks(data); setLoading(false); });
  }, [open, pkgId]);

  useEffect(() => {
    const total = links.reduce((s, l) => s + l.view_count, 0);
    onViewCountChange?.(pkgId, total);
  }, [links, pkgId, onViewCountChange]);

  const totalViews = links.reduce((s, l) => s + l.view_count, 0);

  const copyText = (text: string, key: string, label = "คัดลอกแล้ว") => {
    navigator.clipboard.writeText(text);
    toast.success(label);
    setCopied(key);
    setTimeout(() => setCopied(null), 1800);
  };

  const handleCreate = async (source: string) => {
    const src = source.trim().toLowerCase().replace(/\s+/g, "-");
    if (!src) { toast.error("กรุณาระบุชื่อ channel"); return; }
    if (links.find((l) => l.source === src)) { toast.error(`มีลิงค์ "${src}" อยู่แล้ว`); return; }
    setCreating(true);
    const link = await createShortLink(pkgId, src);
    setCreating(false);
    if (!link) { toast.error("สร้างลิงค์ล้มเหลว"); return; }
    setLinks((prev) => [...prev, link]);
    setNewSource("");
    toast.success(`สร้างลิงค์ ${src} แล้ว`);
  };

  const handleDelete = async (code: string) => {
    if (!confirm("ลบลิงค์นี้? ยอด view จะหายถาวร")) return;
    await deleteShortLink(code);
    setLinks((prev) => prev.filter((l) => l.code !== code));
    if (activeQR === code) setActiveQR(null);
    toast.success("ลบแล้ว");
  };

  const availablePresets = SOURCE_PRESETS.filter((p) => !links.find((l) => l.source === p.key));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      {/* w-full ด้านใน + ควบคุมด้วย max-w ของ DialogContent */}
      <DialogContent className="w-[calc(100vw-2rem)] max-w-[420px] p-0 gap-0 overflow-hidden">

        {/* ── Header ── */}
        <DialogHeader className="px-4 pt-4 pb-3 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <Link2 className="w-4 h-4 text-primary shrink-0" />
            <span className="truncate">{tourTitle}</span>
          </DialogTitle>
          {!isPublished && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 leading-snug">
              ⚠️ ยังไม่ Publish — ลิงค์จะเปิดแค่หน้า Tour Packages ทั่วไป
            </p>
          )}
        </DialogHeader>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto max-h-[70vh] divide-y divide-border">

          {/* ── View count ── */}
          <div className="px-4 py-3 flex items-center gap-3 bg-muted/30">
            <Eye className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground flex-1">ยอดวิวทั้งหมด</span>
            <span className="text-lg font-bold text-primary tabular-nums">{totalViews.toLocaleString()}</span>
          </div>

          {/* ── Long URL ── */}
          <div className="px-4 py-3 space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              ลิงค์เต็ม (OG Preview ครบ)
            </p>
            <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
              <span className="flex-1 min-w-0 text-[11px] font-mono text-foreground/80 truncate">
                {longUrl}
              </span>
              <button
                onClick={() => copyText(longUrl, "long", "คัดลอกลิงค์เต็มแล้ว")}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                title="คัดลอก"
              >
                {copied === "long" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* ── Short links ── */}
          <div className="px-4 py-3 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              ลิงค์สั้น + QR Code (แยก Channel)
            </p>

            {loading ? (
              <div className="py-6 flex flex-col items-center gap-2 text-sm text-muted-foreground">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                กำลังโหลด…
              </div>
            ) : links.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                ยังไม่มีลิงค์สั้น — กดสร้างด้านล่าง
              </div>
            ) : (
              <div className="space-y-2">
                {links.map((link) => (
                  <div key={link.code} className="border border-border rounded-xl overflow-hidden">

                    {/* Row: badge + views + copy + QR + delete */}
                    <div className="flex items-center gap-2 px-3 py-2 bg-background">
                      {/* Source badge */}
                      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {link.source}
                      </span>

                      {/* Short URL — truncated, fills remaining space */}
                      <span className="flex-1 min-w-0 text-[11px] font-mono text-muted-foreground truncate">
                        {shortUrl(link.code).replace("https://standardtour-hub.vercel.app", "")}
                      </span>

                      {/* Views */}
                      <span className="shrink-0 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Eye className="w-3 h-3" />{link.view_count}
                      </span>

                      {/* Copy */}
                      <button
                        onClick={() => copyText(shortUrl(link.code), link.code, `คัดลอก ${link.source} แล้ว`)}
                        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                        title="คัดลอกลิงค์"
                      >
                        {copied === link.code ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>

                      {/* QR toggle */}
                      <button
                        onClick={() => setActiveQR(activeQR === link.code ? null : link.code)}
                        className={`shrink-0 transition-colors ${activeQR === link.code ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                        title="QR Code"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(link.code)}
                        className="shrink-0 text-muted-foreground/40 hover:text-destructive transition-colors"
                        title="ลบ"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* QR Panel */}
                    {activeQR === link.code && (
                      <div className="border-t border-border bg-muted/20 px-3 py-3 flex flex-col items-center gap-3">
                        <div className="bg-white p-3 rounded-xl shadow-sm">
                          <QRCodeSVG value={shortUrl(link.code)} size={180} marginSize={1} />
                        </div>
                        <p className="text-[10px] text-muted-foreground text-center">
                          {shortUrl(link.code)}
                        </p>
                        <Button
                          size="sm" variant="outline" className="h-7 text-xs"
                          onClick={() => {
                            const svg = document.querySelector(`[data-qr="${link.code}"]`);
                            if (!svg) { toast.error("ไม่พบ QR SVG"); return; }
                            const blob = new Blob([svg.outerHTML], { type: "image/svg+xml" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url; a.download = `qr-${link.source}-${link.code}.svg`;
                            a.click(); URL.revokeObjectURL(url);
                          }}
                        >
                          ⬇️ ดาวน์โหลด QR
                        </Button>
                        <div className="hidden">
                          <QRCodeSVG value={shortUrl(link.code)} size={400}
                            // @ts-expect-error data-* on SVG
                            data-qr={link.code}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Create new ── */}
          <div className="px-4 py-3 space-y-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              สร้างลิงค์ใหม่
            </p>

            {availablePresets.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {availablePresets.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => handleCreate(p.key)}
                    disabled={creating}
                    className="text-[11px] px-2.5 py-1 rounded-full border border-border hover:border-primary hover:text-primary hover:bg-primary/5 transition-all disabled:opacity-40"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Input
                placeholder="channel เช่น event-cnx-aug"
                value={newSource}
                onChange={(e) => setNewSource(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate(newSource)}
                disabled={creating}
                className="h-8 text-xs flex-1 min-w-0"
              />
              <Button
                size="sm" className="h-8 px-3 shrink-0"
                onClick={() => handleCreate(newSource)}
                disabled={creating || !newSource.trim()}
              >
                {creating
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <><Plus className="w-3.5 h-3.5 mr-1" />สร้าง</>
                }
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              แต่ละ channel ได้ URL + QR แยกกัน วัด view แยกได้
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
