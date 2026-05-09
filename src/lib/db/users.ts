import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";
import type { AppUser } from "@/store/authStore";

// Row shape ใน Supabase ใช้ password_hash แทน password
type DbUser = Omit<AppUser, "password"> & { password_hash: string };

function ensureClient() {
  if (!SUPABASE_ENABLED || !supabase) {
    throw new Error("Supabase not enabled");
  }
  return supabase;
}

function toDb(u: AppUser & { password_hash?: string }): DbUser {
  const { password, ...rest } = u as any;
  return {
    ...rest,
    password_hash: u.password_hash ?? "",
  };
}

function fromDb(r: DbUser): AppUser {
  // password ใน return type คือ hash (caller ใช้ verifyPassword)
  const { password_hash, ...rest } = r;
  return { ...rest, password: password_hash } as AppUser;
}

export async function listUsers(): Promise<AppUser[]> {
  const sb = ensureClient();
  const { data, error } = await sb
    .from("app_users")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r: any) => fromDb(r as DbUser));
}

export async function upsertUser(u: AppUser & { password_hash?: string }): Promise<void> {
  const sb = ensureClient();
  const { error } = await sb.from("app_users").upsert(toDb(u), { onConflict: "user_id" });
  if (error) throw error;
}

export async function updateUserDb(
  user_id: string,
  patch: Partial<DbUser>,
): Promise<void> {
  const sb = ensureClient();
  const { error } = await sb.from("app_users").update(patch).eq("user_id", user_id);
  if (error) throw error;
}

export async function deleteUserDb(user_id: string): Promise<void> {
  const sb = ensureClient();
  const { error } = await sb.from("app_users").delete().eq("user_id", user_id);
  if (error) throw error;
}
