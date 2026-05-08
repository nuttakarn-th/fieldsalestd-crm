import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";
import type { Customer } from "./types";

/**
 * Customers DB layer.
 * ถ้า Supabase ยังไม่เปิด (SUPABASE_ENABLED = false)
 *   → ฟังก์ชันทุกตัว throw เพื่อให้ caller รู้ว่าต้องใช้ Zustand store แทน
 * ถ้าเปิดแล้ว → อ่าน/เขียนผ่าน Supabase
 */

function ensureClient() {
  if (!SUPABASE_ENABLED || !supabase) {
    throw new Error("Supabase not enabled — set VITE_USE_SUPABASE=true and provide credentials in .env");
  }
  return supabase;
}

export async function listCustomers(): Promise<Customer[]> {
  const sb = ensureClient();
  const { data, error } = await sb
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Customer[];
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const sb = ensureClient();
  const { data, error } = await sb
    .from("customers")
    .select("*")
    .eq("customer_id", id)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as Customer | null;
}

export async function createCustomer(c: Customer): Promise<Customer> {
  const sb = ensureClient();
  const { data, error } = await sb.from("customers").insert(c).select().single();
  if (error) throw error;
  return data as Customer;
}

export async function updateCustomer(
  id: string,
  patch: Partial<Customer>,
): Promise<Customer> {
  const sb = ensureClient();
  const { data, error } = await sb
    .from("customers")
    .update(patch)
    .eq("customer_id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Customer;
}

export async function deleteCustomer(id: string): Promise<void> {
  const sb = ensureClient();
  const { error } = await sb.from("customers").delete().eq("customer_id", id);
  if (error) throw error;
}
