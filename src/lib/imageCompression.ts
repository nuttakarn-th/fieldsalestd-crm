/**
 * Compress an image File to target maximum width (default 1500px) and best-effort
 * size cap (default 500KB). Returns a new File (jpeg) and a data URL preview.
 */
export interface CompressResult {
  file: File;
  dataUrl: string;
  width: number;
  height: number;
  sizeKB: number;
}

export async function compressImage(
  input: File,
  options: { maxWidth?: number; maxSizeKB?: number; mimeType?: string } = {},
): Promise<CompressResult> {
  const { maxWidth = 1500, maxSizeKB = 500, mimeType = "image/jpeg" } = options;

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(input);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });

  const ratio = img.width > maxWidth ? maxWidth / img.width : 1;
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("ไม่สามารถสร้าง canvas ได้");
  ctx.drawImage(img, 0, 0, w, h);

  // iterate quality until under maxSizeKB
  let quality = 0.9;
  let blob: Blob | null = null;
  for (let i = 0; i < 6; i++) {
    blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, mimeType, quality));
    if (!blob) break;
    if (blob.size / 1024 <= maxSizeKB) break;
    quality -= 0.15;
    if (quality < 0.3) quality = 0.3;
  }
  if (!blob) throw new Error("บีบอัดรูปไม่สำเร็จ");

  const outName = input.name.replace(/\.[^.]+$/, "") + ".jpg";
  const file = new File([blob], outName, { type: mimeType });
  const outUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

  return { file, dataUrl: outUrl, width: w, height: h, sizeKB: Math.round(blob.size / 1024) };
}

export interface GeoPoint { lat: number; lng: number; accuracy?: number }
export function getCurrentPosition(): Promise<GeoPoint> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject(new Error("เบราว์เซอร์ไม่รองรับ GPS"));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
}