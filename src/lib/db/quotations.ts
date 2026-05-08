import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";
import type { QuotationDoc } from "./types";

function ensureClient() {
  if (!SUPABASE_ENABLED || !supabase) {
    throw new Error("Supabase not enabled");
  }
  return supabase;
}

export async function listQuotations(): Promise<QuotationDoc[]> {
  const sb = ensureClient();
  const { data, error } = await sb
    .from("quotations")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as QuotationDoc[];
}

export async function createQuotation(q: QuotationDoc): Promise<QuotationDoc> {
  const sb = ensureClient();
  const { data, error } = await sb
    .from("quotations")
    .insert(q)
    .select()
    .single();
  if (error) throw error;
  return data as QuotationDoc;
}

export async function updateQuotation(
  id: string,
  patch: Partial<QuotationDoc>,
): Promise<QuotationDoc> {
  const sb = ensureClient();
  const { data, error } = await sb
    .from("quotations")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as QuotationDoc;
}

export async function deleteQuotation(id: string): Promise<void> {
  const sb = ensureClient();
  const { error } = await sb.from("quotations").delete().eq("id", id);
  if (error) throw error;
}
