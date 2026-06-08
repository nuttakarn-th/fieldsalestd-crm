import type { OgMeta } from "@/store/siteSettingsStore";

function setMetaProp(property: string, content: string) {
  let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.content = content;
}

function setMetaName(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.content = content;
}

/** Inject OG + Twitter meta into <head> at runtime (works for Google indexing + browser tab) */
export function applyOgMeta(og: OgMeta, pageUrl: string) {
  document.title = og.title;
  setMetaName("description", og.description);
  setMetaProp("og:title", og.title);
  setMetaProp("og:description", og.description);
  setMetaProp("og:image", og.imageUrl);
  setMetaProp("og:url", pageUrl);
  setMetaName("twitter:title", og.title);
  setMetaName("twitter:description", og.description);
  setMetaName("twitter:image", og.imageUrl);
}

/** Generate the static HTML <meta> block to paste into index.html */
export function generateOgHtml(og: OgMeta, pageUrl: string): string {
  return `<!-- Primary Meta -->
<title>${og.title}</title>
<meta name="description" content="${og.description}" />

<!-- Open Graph -->
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Standard Tour" />
<meta property="og:url" content="${pageUrl}" />
<meta property="og:title" content="${og.title}" />
<meta property="og:description" content="${og.description}" />
<meta property="og:image" content="${og.imageUrl}" />
<meta property="og:locale" content="th_TH" />

<!-- Twitter / X Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${og.title}" />
<meta name="twitter:description" content="${og.description}" />
<meta name="twitter:image" content="${og.imageUrl}" />`;
}
