/**
 * api/s.ts — Short Link redirect + view tracking
 *
 * URL pattern: /s/:code  →  rewrites to /api/s?c=:code  (see vercel.json)
 *
 * Flow:
 *   1. Look up `code` in short_links table
 *   2. Increment view_count atomically via RPC
 *   3. Return OG HTML (same as api/share.ts) so bots get nice previews
 *      Real browsers get JS-redirected to /tour-packages?pkg=...
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

// ──────────────────────────────────────────────────────────────────────────────
// Config — same as api/share.ts (anon key is public-safe)
// ──────────────────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://jhblvwyjnumfuxdorlnp.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoYmx2d3lqbnVtZnV4ZG9ybG5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMTg0NTYsImV4cCI6MjA5Mzc5NDQ1Nn0.nytbitxccEg2c9Csp_mqCgfDQOkR9WR2_s46O_sVYAU";

const BASE_URL = "https://standardtour-hub.vercel.app";

const DEFAULT_TITLE = "Standard Tour — โปรแกรมทัวร์ & E-Booklet";
const DEFAULT_DESC  = "ดูโปรแกรมทัวร์ทั้งหมด ราคาพิเศษ จองง่าย บริการครบ";
const DEFAULT_IMAGE = `${BASE_URL}/og-packages.png`;

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────
function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

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

  <!-- Instant redirect for real browsers -->
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
  const code = (req.query.c as string | undefined)?.trim() ?? "";

  if (!code) {
    // No code → redirect to tour packages home
    return res.redirect(302, `${BASE_URL}/tour-packages`);
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // ── 1. Look up the short code ──────────────────────────────────────────────
  const { data: linkRow, error: linkErr } = await sb
    .from("short_links")
    .select("pkg_id")
    .eq("code", code)
    .single();

  if (linkErr || !linkRow) {
    // Code not found → redirect to tour packages home
    return res.redirect(302, `${BASE_URL}/tour-packages`);
  }

  const pkgId = linkRow.pkg_id as string;

  // ── 2. Increment view count (atomic via RPC) ───────────────────────────────
  // Fire-and-forget: don't await so we don't add latency for the user
  sb.rpc("increment_short_link_view", { p_code: code }).then(() => {});

  // ── 3. Look up package metadata for OG tags ────────────────────────────────
  let title = DEFAULT_TITLE;
  let description = DEFAULT_DESC;
  let image = DEFAULT_IMAGE;

  try {
    // pkgId may be "tour_mrlfhd20-dr1gn" — strip prefix for bare match
    const bareId = pkgId.startsWith("tour_") ? pkgId.slice(5) : pkgId;

    // Primary: dedicated tour_packages_og table (always in sync with frontend)
    const { data: pkg } = await sb
      .from("tour_packages_og")
      .select("*")
      .or(`id.eq.${pkgId},id.eq.${bareId}`)
      .maybeSingle();

    if (pkg) {
      let pkgTitle = (pkg.title as string) || "";
      if (pkg.duration) pkgTitle += ` ${pkg.duration as string}`;
      title = `${pkgTitle} — Standard Tour`;

      const parts: string[] = [];
      if (pkg.city) parts.push(pkg.city as string);
      if (pkg.country) parts.push(pkg.country as string);
      description = parts.join(" · ") || DEFAULT_DESC;

      if (pkg.cover_url) image = pkg.cover_url as string;
    } else {
      // Fallback 1: site_settings payload (legacy)
      const { data: ssData, error: ssError } = await sb
        .from("site_settings")
        .select("payload")
        .eq("id", "default")
        .single();

      let foundInSS = false;
      if (!ssError && ssData?.payload) {
        const payload = ssData.payload as SitePayload;

        if (payload.ogPackages?.title) title = payload.ogPackages.title;
        if (payload.ogPackages?.description) description = payload.ogPackages.description;
        if (payload.ogPackages?.imageUrl) image = payload.ogPackages.imageUrl;

        const legacyPkg = (payload.tourPackages ?? []).find(
          (p) => p.id === pkgId || p.id === bareId
        );
        if (legacyPkg) {
          foundInSS = true;
          let pkgTitle = legacyPkg.title;
          if (legacyPkg.days) pkgTitle += ` ${legacyPkg.days} วัน`;
          if (legacyPkg.nights) pkgTitle += ` ${legacyPkg.nights} คืน`;
          title = `${pkgTitle} — Standard Tour`;

          const parts: string[] = [];
          if (legacyPkg.city) parts.push(legacyPkg.city);
          if (legacyPkg.country) parts.push(legacyPkg.country);
          if (legacyPkg.subtitle) parts.push(legacyPkg.subtitle);
          else if (legacyPkg.description) parts.push(legacyPkg.description.slice(0, 80));
          description = parts.join(" · ") || DEFAULT_DESC;

          if (legacyPkg.coverUrl) image = legacyPkg.coverUrl;
        }
      }

      // Fallback 2: tours table (service store — canonical source)
      if (!foundInSS) {
        const { data: tourRow } = await sb
          .from("tours")
          .select("title, city, country, duration")
          .eq("id", bareId)
          .maybeSingle();

        if (tourRow) {
          let pkgTitle = (tourRow.title as string) || (tourRow.city as string) || "";
          if (tourRow.duration) pkgTitle += ` ${tourRow.duration as string}`;
          title = `${pkgTitle} — Standard Tour`;

          const parts: string[] = [];
          if (tourRow.city && tourRow.city !== tourRow.title) parts.push(tourRow.city as string);
          if (tourRow.country) parts.push(tourRow.country as string);
          description = parts.join(" · ") || DEFAULT_DESC;
        }
      }
    }
  } catch (_) {
    // Fall back to defaults silently
  }

  // ── 4. Return OG HTML with JS redirect ────────────────────────────────────
  const redirectUrl = `${BASE_URL}/tour-packages${pkgId ? `?pkg=${pkgId}` : ""}`;
  return res
    .setHeader("Content-Type", "text/html; charset=utf-8")
    .setHeader("Cache-Control", "no-store")   // don't cache — view count must increment each time
    .status(200)
    .send(buildHtml({ title, description, image, redirectUrl }));
}
