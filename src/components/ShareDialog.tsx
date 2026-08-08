/**
 * ShareDialog.tsx — แชร์โปรแกรมทัวร์ พร้อม Short Link + QR Code + View Stats
 *
 * Features:
 * - ลิงค์เต็ม (พร้อม OG meta tags สำหรับ LINE/Facebook preview)
 * - ลิงค์สั้น แยกตาม Source/Channel (link, facebook, line, event, ...)
 * - QR Code แต่ละ channel (toggle ดู/ซ่อน)
 * - ยอด view count รวม + breakdown ต่อ source
 * - สร้างลิงค์ใหม่ (preset chips + custom input)
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
import { Copy, Eye, QrCode, Plus, Trash2, Link2, X } from "lucide-react";
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

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  open: boolean;
  onClose: () => void;
  tourId: string;
  tourTitle: string;
  isPublished?: boolean;
  /** เมื่อ view count เปลี่ยน — AllService ใช้ update badge */
  onViewCountChange?: (pkgId: string, total: number) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function ShareDialog({
  open,
  onClose,
  tourId,
  tourTitle,
  isPublished,
  onViewCountChange,
}: Props) {
  const pkgId = `tour_${tourId}`;
  const longUrl = `https://standardtour-hub.vercel.app/api/share?pkg=${pkgId}`;

  const [links, setLinks] = useState<ShortLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [newSource, setNewSource] = useState("");
  const [creating, setCreating] = useState(false);
  const [activeQR, setActiveQR] = useState<string | null>(null);

  // ── Load links when dialog opens ──────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setActiveQR(null);
    getLinksForPkg(pkgId).then((data) => {
      setLinks(data);
      setLoading(false);
    });
  }, [open, pkgId]);

  // Notify parent when total changes
  useEffect(() => {
    const total = links.reduce((s, l) => s + l.view_count, 0);
    onViewCountChange?.(pkgId, total);
  }, [links, pkgId, onViewCountChange]);

  const totalViews = links.reduce((s, l) => s + l.view_count, 0);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleCreate = async (source: string) => {
    const src = source.trim().toLowerCase().replace(/\s+/g, "-");
    if (!src) { toast.error("กรุณาระบุชื่อ channel"); return; }
    // Prevent duplicate source
    if (links.find((l) => l.source === src)) {
      toast.error(`มีลิงค์ "${src}" อยู่แล้ว`);
      return;
    }
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

  const copyText = (text: string, label = "คัดลอกแล้ว") => {
    navigator.clipboard.writeText(text);
    toast.success(label);
  };

  // Presets that haven't been created yet
  const availablePresets = SOURCE_PRESETS.filter(
    (p) => !links.find((l) => l.source === p.key)
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Link2 className="w-4 h-4 text-primary" /> แชร์โปรแกรม
          </DialogTitle>
          <p className="text-sm text-muted-foreground truncate">{tourTitle}</p>
        </DialogHeader>

        {/* Warning — not published */}
        {!isPublished && (
          <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-700 dark:text-amber-400">
            <span className="shrink-0 mt-0.5">⚠️</span>
            <span>โปรแกรมนี้ยังไม่ได้ Publish — ลิงค์จะเปิดได้แค่หน้า Tour Packages ทั่วไป</span>
          </div>
        )}

        {/* Total view count */}
        <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/50 rounded-xl">
          <Eye className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground flex-1">ยอดวิวทั้งหมด</span>
          <span className="text-xl font-bold text-primary tabular-nums">
            {totalViews.toLocaleString()}
          </span>
        </div>

        {/* Long share link */}
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            ลิงค์เต็ม (OG preview ครบ)
          </p>
          <div className="flex items-center gap-1.5 min-w-0">
            <code className="flex-1 min-w-0 text-[11px] bg-muted px-2.5 py-1.5 rounded-lg truncate font-mono text-foreground block">
              {longUrl}
            </code>
            <Button
              size="icon" variant="ghost" className="h-7 w-7 shrink-0"
              title="คัดลอกลิงค์เต็ม"
              onClick={() => copyText(longUrl, "คัดลอกลิงค์เต็มแล้ว")}
            >
              <Copy className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Short links section */}
        <div className="space-y-2">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            ลิงค์สั้น + QR Code (แยก Channel)
          </p>

          {loading ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              กำลังโหลด…
            </div>
          ) : links.length === 0 ? (
            <div className="py-5 text-center text-sm text-muted-foreground border border-dashed border-border rounded-xl">
              ยังไม่มีลิงค์สั้น — กดสร้างด้านล่าง
            </div>
          ) : (
            <div className="space-y-2">
              {links.map((link) => (
                <div
                  key={link.code}
                  className="border border-border rounded-xl p-3 space-y-2 transition-colors hover:bg-muted/20"
                >
                  {/* Top row: source badge + view count + delete */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {link.source}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Eye className="w-3 h-3" />
                      {link.view_count.toLocaleString()} views
                    </span>
                    <button
                      className="ml-auto text-muted-foreground/50 hover:text-destructive transition-colors"
                      onClick={() => handleDelete(link.code)}
                      title="ลบลิงค์"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Short URL + Copy + QR toggle */}
                  <div className="flex items-center gap-1.5">
                    <code className="flex-1 text-[11px] bg-muted px-2 py-1 rounded-lg font-mono text-foreground truncate">
                      {shortUrl(link.code)}
                    </code>
                    <Button
                      size="icon" variant="ghost" className="h-7 w-7 shrink-0"
                      title="คัดลอก"
                      onClick={() => copyText(shortUrl(link.code), `คัดลอกลิงค์ ${link.source} แล้ว`)}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon" variant="ghost"
                      className={`h-7 w-7 shrink-0 transition-colors ${activeQR === link.code ? "bg-primary/10 text-primary" : ""}`}
                      title="แสดง QR Code"
                      onClick={() => setActiveQR(activeQR === link.code ? null : link.code)}
                    >
                      <QrCode className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  {/* QR Code panel */}
                  {activeQR === link.code && (
                    <div className="flex flex-col items-center gap-2 pt-2 border-t border-border">
                      <div className="bg-white p-4 rounded-xl shadow-sm">
                        <QRCodeSVG
                          value={shortUrl(link.code)}
                          size={200}
                          marginSize={1}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground text-center">
                        สแกน QR Code เพื่อเปิดโปรแกรมนี้
                        <br />
                        <span className="font-mono text-[9px] opacity-60">{shortUrl(link.code)}</span>
                      </p>
                      <Button
                        size="sm" variant="outline" className="h-7 text-xs"
                        onClick={() => {
                          // Download QR as SVG
                          const svg = document.querySelector(`[data-qr="${link.code}"]`);
                          if (!svg) { toast.error("ไม่พบ QR SVG"); return; }
                          const blob = new Blob([svg.outerHTML], { type: "image/svg+xml" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `qr-${link.source}-${link.code}.svg`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                      >
                        ⬇️ ดาวน์โหลด QR
                      </Button>
                      {/* Hidden QR for download (with data attr) */}
                      <div className="hidden">
                        <QRCodeSVG
                          value={shortUrl(link.code)}
                          size={400}
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

        {/* Create new link */}
        <div className="border-t border-border pt-3 space-y-2.5">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            สร้างลิงค์ใหม่
          </p>

          {/* Preset chips */}
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

          {/* Custom source input */}
          <div className="flex items-center gap-1.5">
            <Input
              placeholder="channel เอง เช่น event-cnx-aug"
              value={newSource}
              onChange={(e) => setNewSource(e.target.value)}
              className="h-8 text-xs"
              onKeyDown={(e) => e.key === "Enter" && handleCreate(newSource)}
              disabled={creating}
            />
            <Button
              size="sm" className="h-8 px-3 shrink-0"
              onClick={() => handleCreate(newSource)}
              disabled={creating || !newSource.trim()}
            >
              {creating ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <><Plus className="w-3.5 h-3.5 mr-1" />สร้าง</>
              )}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            แต่ละ channel ได้ URL + QR ของตัวเอง วัด view แยกกันได้
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
