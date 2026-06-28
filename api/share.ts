/**
 * api/share.ts — Vercel Serverless Function
 *
 * ทำไมต้องมี?
 * Facebook / LINE / iMessage bots ไม่รัน JavaScript — พวกมันอ่านแค่ HTML raw ที่ server ส่งมา
 * ดังนั้นถ้า share URL = /tour-packages?pkg=xxx  → bot เห็นแค่ OG tag ของหน้าหลัก
 *
 * วิธีแก้:
 * - Share URL → /api/share?pkg=xxx
 * - Function นี้ query Supabase หา package ที่ตรงกัน
 * - Return HTML ที่มี <meta og:title / og:image / og:description> ถูกต้อง
 * - + <meta http-equiv="refresh"> redirect ผู้ใช้จริงไปหน้า /tour-packages?pkg=xxx ทันที
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

// ──────────────────────────────────────────────────────────────────────────────
// Config (anon key is public-safe — same key that ships in the frontend bundle)
// ──────────────────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://jhblvwyjnumfuxdorlnp.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoYmx2d3lqbnVtZnV4ZG9ybG5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMTg0NTYsImV4cCI6MjA5Mzc5NDQ1Nn0.nytbitxccEg2c9Csp_mqCgfDQOkR9WR2_s46O_sVYAU";

const BASE_URL = "https://standardtour-hub.vercel.app";

// Default OG fallback (ใช้เมื่อหา package ไม่เจอ)
const DEFAULT_TITLE = "Standard Tour — โปรแกรมทัวร์ & E-Booklet";
const DEFAULT_DESC = "ดูโปรแกรมทัวร์ทั้งหมด ราคาพิเศษ จองง่าย บริการครบ";
const DEFAULT_IMAGE = `${BASE_URL}/og-packages.png`;

// ──────────────────────────────────────────────────────────────────────────────
// Type matching siteSettingsStore
// ──────────────────────────────────────────────────────────────────────────────
interface TourPackageItem {
  id: string;
  title: string;
  subtitle?: string;
  coverUrl?: string;
  description?: string;
  country?: string;
  city?: string;
  days?: number;
  nights?: number;
}

interface SitePayload {
  tourPackages?: TourPackageItem[];
  ogPackages?: { title?: string; description?: string; imageUrl?: string };
}

// ──────────────────────────────────────────────────────────────────────────────
// Escape HTML entities to prevent XSS in meta tags
// ──────────────────────────────────────────────────────────────────────────────
function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ──────────────────────────────────────────────────────────────────────────────
// Build the HTML response
// ──────────────────────────────────────────────────────────────────────────────
function buildHtml(opts: {
  title: string;
  description: string;
  image: string;
  redirectUrl: string;
}): string {
  const { title, description, image, redirectUrl } = opts;
  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <title>${esc(title)}</title>

  <!-- Open Graph (Facebook, LINE, iMessage, etc.) -->
  <meta property="og:type"        content="website" />
  <meta property="og:url"         content="${esc(redirectUrl)}" />
  <meta property="og:title"       content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:image"       content="${esc(image)}" />
  <meta property="og:image:width"  content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:site_name"   content="Standard Tour Hub" />
  <meta property="og:locale"      content="th_TH" />

  <!-- Twitter Card -->
  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:title"       content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image"       content="${esc(image)}" />

  <!-- Instant redirect for real browsers (0 sec) -->
  <meta http-equiv="refresh" content="0;url=${esc(redirectUrl)}" />
</head>
<body>
  <p style="font-family:sans-serif;padding:2rem;color:#666;">
    กำลังเปิดโปรแกรมทัวร์… ถ้าไม่เปิดอัตโนมัติ
    <a href="${esc(redirectUrl)}" style="color:#7c3aed;">คลิกที่นี่</a>
  </p>
  <script>window.location.replace("${redirectUrl.replace(/"/g, '\\"')}");</script>
</body>
</html>`;
}

// ──────────────────────────────────────────────────────────────────────────────
// Handler
// ──────────────────────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const pkgId = (req.query.pkg as string | undefined) ?? "";
  const redirectUrl = `${BASE_URL}/tour-packages${pkgId ? `?pkg=${pkgId}` : ""}`;

  // No pkg param → redirect to tour packages page with default OG
  if (!pkgId) {
    return res
      .setHeader("Content-Type", "text/html; charset=utf-8")
      .status(200)
      .send(
        buildHtml({
          title: DEFAULT_TITLE,
          description: DEFAULT_DESC,
          image: DEFAULT_IMAGE,
          redirectUrl,
        })
      );
  }

  // ── Try to find package in Supabase ──────────────────────────────────────
  let title = DEFAULT_TITLE;
  let description = DEFAULT_DESC;
  let image = DEFAULT_IMAGE;

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await supabase
      .from("site_settings")
      .select("payload")
      .eq("id", "default")
      .single();

    if (!error && data?.payload) {
      const payload = data.payload as SitePayload;

      // Use page-level OG settings as base (if admin set them)
      if (payload.ogPackages?.title) title = payload.ogPackages.title;
      if (payload.ogPackages?.description) description = payload.ogPackages.description;
      if (payload.ogPackages?.imageUrl) image = payload.ogPackages.imageUrl;

      // Find the specific package
      const pkg = (payload.tourPackages ?? []).find((p) => p.id === pkgId);
      if (pkg) {
        // Build nice title: "ชงชิ่ง 5 วัน 4 คืน — Standard Tour"
        let pkgTitle = pkg.title;
        if (pkg.days) pkgTitle += ` ${pkg.days} วัน`;
        if (pkg.nights) pkgTitle += ` ${pkg.nights} คืน`;
        title = `${pkgTitle} — Standard Tour`;

        // Description
        const parts: string[] = [];
        if (pkg.city) parts.push(pkg.city);
        if (pkg.country) parts.push(pkg.country);
        if (pkg.subtitle) parts.push(pkg.subtitle);
        else if (pkg.description) parts.push(pkg.description.slice(0, 80));
        description = parts.join(" · ") || DEFAULT_DESC;

        // Cover image
        if (pkg.coverUrl) image = pkg.coverUrl;
      }
    }
  } catch (_err) {
    // Silently fall back to defaults — bot still gets a valid page
  }

  return res
    .setHeader("Content-Type", "text/html; charset=utf-8")
    .setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600")
    .status(200)
    .send(buildHtml({ title, description, image, redirectUrl }));
}
