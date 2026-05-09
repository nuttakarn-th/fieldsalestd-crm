// Password hashing using Web Crypto API (PBKDF2-SHA256)
// ─ ทำงานในเบราว์เซอร์ ไม่ต้องลง dependency เพิ่ม
// ─ Format: pbkdf2$<iterations>$<salt-base64>$<hash-base64>

const ITERATIONS = 100_000;
const SALT_LEN = 16;
const KEY_LEN = 32;

function bytesToBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function base64ToBytes(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    key,
    KEY_LEN * 8,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  const hash = await pbkdf2(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${bytesToBase64(salt)}$${bytesToBase64(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  // Backward-compat: ถ้าไม่ใช่รูปแบบ pbkdf2 ให้เปรียบเทียบตรงๆ (legacy plaintext)
  if (!stored.startsWith("pbkdf2$")) {
    return password === stored;
  }
  const [, iterStr, saltB64, hashB64] = stored.split("$");
  const iterations = parseInt(iterStr, 10);
  const salt = base64ToBytes(saltB64);
  const expected = base64ToBytes(hashB64);
  const got = await pbkdf2(password, salt, iterations);
  if (got.length !== expected.length) return false;
  // Constant-time compare
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got[i] ^ expected[i];
  return diff === 0;
}

export function isHashed(stored: string): boolean {
  return stored.startsWith("pbkdf2$");
}
