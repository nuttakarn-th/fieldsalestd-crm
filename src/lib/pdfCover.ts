/**
 * pdfCover.ts — Extract PDF page 1 as JPEG and upload to Supabase Storage
 *
 * ใช้ PDF.js จาก CDN (เหมือนกับ TourPackagePresentation.tsx)
 * เพื่อ render หน้า 1 ลง canvas แล้ว upload ขึ้น og-covers bucket
 */

import { supabase } from "@/lib/supabase";

const PDFJS_CDN    = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
const BUCKET       = "og-covers";

// ─── Load PDF.js from CDN (reuse cached instance) ───────────────────────────
async function getPdfjsLib(): Promise<any> {
  const w = window as any;
  if (w.pdfjsLib) return w.pdfjsLib;
  return new Promise<any>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = PDFJS_CDN;
    script.onload = () => {
      const lib = w.pdfjsLib;
      if (!lib) { reject(new Error("pdfjsLib not found")); return; }
      lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      resolve(lib);
    };
    script.onerror = () => reject(new Error("ไม่สามารถโหลด PDF.js จาก CDN"));
    document.head.appendChild(script);
  });
}

// ─── Render PDF page 1 → Blob ───────────────────────────────────────────────
async function renderPdfCoverBlob(pdfUrl: string): Promise<Blob> {
  const pdfjsLib = await getPdfjsLib();
  const pdf      = await pdfjsLib.getDocument({ url: pdfUrl, withCredentials: false }).promise;
  const page     = await pdf.getPage(1);

  // Scale เพื่อให้ได้ความกว้างประมาณ 1200px (มาตรฐาน OG image)
  const baseViewport = page.getViewport({ scale: 1 });
  const scale        = 1200 / baseViewport.width;
  const viewport     = page.getViewport({ scale });

  const canvas   = document.createElement("canvas");
  canvas.width   = viewport.width;
  canvas.height  = viewport.height;
  const ctx      = canvas.getContext("2d")!;
  await page.render({ canvasContext: ctx, viewport }).promise;

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("canvas.toBlob ล้มเหลว")),
      "image/jpeg",
      0.85,
    );
  });
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Extract PDF page 1 → upload to og-covers/{pkgId}.jpg
 * Returns the public URL หรือ null ถ้า error
 */
export async function extractAndUploadPdfCover(
  pkgId: string,
  pdfUrl: string,
): Promise<string | null> {
  if (!supabase || !pdfUrl) return null;
  try {
    const blob = await renderPdfCoverBlob(pdfUrl);
    const path = `${pkgId}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, { contentType: "image/jpeg", upsert: true });

    if (uploadError) {
      console.warn("[pdfCover] upload ล้มเหลว:", uploadError.message);
      return null;
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    // เพิ่ม cache-bust เพื่อป้องกัน CDN cache รูปเก่า
    return `${data.publicUrl}?t=${Date.now()}`;
  } catch (err) {
    console.warn("[pdfCover] extract ล้มเหลว:", err);
    return null;
  }
}
