/**
 * api/og-page.ts — OG meta tags for public pages
 *
 * Flow (for social media bots / LINE / Facebook preview):
 *   1. vercel.json rewrites /catalog → /api/og-page?path=catalog  (when ?_r param is absent)
 *   2. This handler returns HTML with og:title / og:description / og:image
 *   3. Bots read the tags — done ✅
 *   4. Real browsers get js-redirected to /catalog?_r=1 (bypasses the rewrite, hits index.html)
 *   5. App.tsx cleans up ?_r from the URL via history.replaceState
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

const SITE_URL = "https://standardtour-hub.vercel.app";
const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`;

interface OGData {
  title: string;
  description: string;
  image?: string;
}

const OG_MAP: Record<string, OGData> = {
  catalog: {
    title: "แคตตาล็อกโปรแกรมทัวร์ | Standard Tour",
    description:
      "ดูโปรแกรมทัวร์ทั้งหมด พร้อม Period และที่นั่งว่าง แบบ Realtime — ไม่ต้องล็อกอิน",
  },
  "war-room": {
    title: "Sales War Room | Standard Tour",
    description: "ติดตามยอดจองและสถานะที่นั่งทัวร์แบบ Live Realtime",
  },
  "tour-packages": {
    title: "โปรแกรมทัวร์ | Standard Tour",
    description: "ดูโปรแกรมทัวร์ที่น่าสนใจพร้อม E-Booklet จาก Standard Tour",
  },
  "tour-presentation": {
    title: "นำเสนอโปรแกรมทัวร์ | Standard Tour",
    description: "โปรแกรมทัวร์ Standard Tour — ดูรายละเอียดและช่วยเสนอขาย",
  },
  present: {
    title: "Live Presentation | Standard Tour",
    description: "รับชม Live Presentation จาก Standard Tour แบบ Realtime",
  },
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  const path = String(req.query.path ?? "");
  const id   = String(req.query.id   ?? "");

  const og: OGData = OG_MAP[path] ?? {
    title: "Standard Tour Hub",
    description: "ระบบบริหารงานขายและจัดการลูกค้า Standard Tour",
  };

  const canonicalPath = id ? `/${path}/${id}` : `/${path}`;
  const redirectUrl   = `${canonicalPath}?_r=1`;   // ?_r=1 bypasses og-page rewrite → index.html
  const ogUrl         = `${SITE_URL}${canonicalPath}`;
  const ogImage       = og.image ?? DEFAULT_IMAGE;

  const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <title>${esc(og.title)}</title>
  <meta name="description" content="${esc(og.description)}" />

  <!-- Open Graph (Facebook, LINE, iMessage, Telegram …) -->
  <meta property="og:type"         content="website" />
  <meta property="og:url"          content="${esc(ogUrl)}" />
  <meta property="og:title"        content="${esc(og.title)}" />
  <meta property="og:description"  content="${esc(og.description)}" />
  <meta property="og:image"        content="${esc(ogImage)}" />
  <meta property="og:image:width"  content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:site_name"    content="Standard Tour Hub" />
  <meta property="og:locale"       content="th_TH" />

  <!-- Twitter Card -->
  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:title"       content="${esc(og.title)}" />
  <meta name="twitter:description" content="${esc(og.description)}" />
  <meta name="twitter:image"       content="${esc(ogImage)}" />

  <!-- Real browsers: redirect to SPA (bots ignore this) -->
  <meta http-equiv="refresh" content="0;url=${esc(redirectUrl)}" />
</head>
<body style="font-family:sans-serif;padding:2rem;color:#666;">
  <p>กำลังโหลด… <a href="${esc(redirectUrl)}" style="color:#16a34a;">คลิกที่นี่ถ้าไม่เปลี่ยนหน้าอัตโนมัติ</a></p>
  <script>window.location.replace("${redirectUrl.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}");</script>
</body>
</html>`;

  res
    .setHeader("Content-Type", "text/html; charset=utf-8")
    .setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400")
    .status(200)
    .send(html);
}
