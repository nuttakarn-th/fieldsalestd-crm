// Supabase client — เริ่มต้นใช้งานเมื่อพร้อม
//
// วิธีใช้:
//   1. รัน  npm install @supabase/supabase-js
//   2. คัดลอก .env.example เป็น .env แล้วใส่ค่าจริง
//   3. import { supabase } from "@/lib/supabase";
//   4. ตัวอย่าง:
//        const { data, error } = await supabase.from("customers").select("*");

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const SUPABASE_ENABLED = Boolean(
  url && anonKey && import.meta.env.VITE_USE_SUPABASE === "true",
);

// ถ้ายังไม่ได้ตั้งค่า env จะคืนค่า null แทนการ throw
// ทำให้แอปยังรันได้ด้วย mock data
export const supabase: SupabaseClient | null = SUPABASE_ENABLED
  ? createClient(url!, anonKey!)
  : null;

if (!SUPABASE_ENABLED && import.meta.env.DEV) {
  // log แค่ตอน dev
  // eslint-disable-next-line no-console
  console.info(
    "[supabase] ยังไม่ได้เปิดใช้งาน — แอปกำลังใช้ข้อมูล mock จาก Zustand store",
  );
}
