// Edge Function: sign-jwt
// รับ { user_id, password } → ตรวจกับ app_users → ออก custom JWT
// JWT ใช้กับ Supabase RLS: auth.role() = 'authenticated'
//
// Deploy: supabase functions deploy sign-jwt

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SignJWT } from "https://esm.sh/jose@4.15.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// PBKDF2 password verify (same algorithm as frontend passwordHash.ts)
async function verifyPassword(password: string, stored: string): Promise<boolean> {
  // Legacy plaintext fallback
  if (!stored.startsWith("pbkdf2$")) return password === stored;

  const parts = stored.split("$");
  if (parts.length !== 4) return false;
  const [, iterStr, saltB64, hashB64] = parts;
  const iterations = parseInt(iterStr, 10);

  function base64ToBytes(b64: string): Uint8Array {
    const s = atob(b64);
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }

  const salt = base64ToBytes(saltB64);
  const expected = base64ToBytes(hashB64);

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    key,
    32 * 8,
  );
  const got = new Uint8Array(bits);

  if (got.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got[i] ^ expected[i];
  return diff === 0;
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user_id, password } = await req.json();
    if (!user_id || !password) {
      return new Response(JSON.stringify({ error: "user_id and password required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ใช้ service role key เพื่อ fetch user โดยไม่ผ่าน RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: user, error } = await supabaseAdmin
      .from("app_users")
      .select("user_id, full_name, role, password_hash")
      .eq("user_id", user_id)
      .single();

    if (error || !user) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ตรวจ password
    const valid = await verifyPassword(password, user.password_hash ?? "");
    if (!valid) {
      return new Response(JSON.stringify({ error: "Invalid credentials" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sign JWT ด้วย APP_JWT_SECRET (Legacy JWT Secret จาก Supabase Settings > JWT Keys)
    // JWT claims ที่ RLS อ่านได้ผ่าน auth.jwt() ->> 'app_role'
    const jwtSecretStr = Deno.env.get("APP_JWT_SECRET");
    if (!jwtSecretStr) {
      console.error("[sign-jwt] APP_JWT_SECRET is not set — add it via Supabase Dashboard > Edge Functions > Secrets");
      return new Response(JSON.stringify({ error: "JWT secret not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const jwtSecret = new TextEncoder().encode(jwtSecretStr);
    const expiresAt = Math.floor(Date.now() / 1000) + 8 * 60 * 60; // 8 ชั่วโมง

    const accessToken = await new SignJWT({
      sub: user.user_id,
      role: "authenticated",      // Supabase: auth.role() = 'authenticated'
      app_role: user.role,        // RLS: auth.jwt() ->> 'app_role'
      full_name: user.full_name,  // RLS: auth.jwt() ->> 'full_name'
      iss: "supabase",
      exp: expiresAt,
      iat: Math.floor(Date.now() / 1000),
    })
      .setProtectedHeader({ alg: "HS256" })
      .sign(jwtSecret);

    return new Response(
      JSON.stringify({ access_token: accessToken, expires_at: expiresAt }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[sign-jwt] error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
