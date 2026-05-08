import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";
import type { Lead, LeadStatus } from "./types";

function ensureClient() {
  if (!SUPABASE_ENABLED || !supabase) {
    throw new Error("Supabase not enabled");
  }
  return supabase;
}

export async function listLeads(): Promise<Lead[]> {
  const sb = ensureClient();
  const { data, error } = await sb
    .from("leads")
    .select("*")
    .order("lead_id", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Lead[];
}

export async function listLeadsByCustomer(customerId: string): Promise<Lead[]> {
  const sb = ensureClient();
  const { data, error } = await sb
    .from("leads")
    .select("*")
    .eq("customer_id", customerId);
  if (error) throw error;
  return (data ?? []) as Lead[];
}

export async function createLead(lead: Lead): Promise<Lead> {
  const sb = ensureClient();
  const { data, error } = await sb.from("leads").insert(lead).select().single();
  if (error) throw error;
  return data as Lead;
}

export async function updateLead(
  leadId: string,
  patch: Partial<Lead>,
): Promise<Lead> {
  const sb = ensureClient();
  const { data, error } = await sb
    .from("leads")
    .update(patch)
    .eq("lead_id", leadId)
    .select()
    .single();
  if (error) throw error;
  return data as Lead;
}

export async function updateLeadStatus(
  leadId: string,
  status: LeadStatus,
  lostReason?: string,
): Promise<Lead> {
  const today = new Date().toISOString().split("T")[0];
  return updateLead(leadId, {
    status,
    lost_reason: status === "Closed Lost" ? lostReason ?? null : null,
    closed_date:
      status === "Closed Won" || status === "Closed Lost" ? today : null,
    next_followup_date:
      status === "Closed Won" || status === "Closed Lost" ? null : undefined,
  } as Partial<Lead>);
}

export async function deleteLead(leadId: string): Promise<void> {
  const sb = ensureClient();
  const { error } = await sb.from("leads").delete().eq("lead_id", leadId);
  if (error) throw error;
}
