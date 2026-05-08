import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";
import type { RoutePlan, RouteStop } from "./types";

function ensureClient() {
  if (!SUPABASE_ENABLED || !supabase) {
    throw new Error("Supabase not enabled");
  }
  return supabase;
}

export async function listRoutes(): Promise<RoutePlan[]> {
  const sb = ensureClient();
  const { data, error } = await sb
    .from("route_plans")
    .select("*, route_stops (*)")
    .order("date", { ascending: false });
  if (error) throw error;
  // Map nested structure
  return (data ?? []).map((r: any) => ({
    ...r,
    stops: (r.route_stops ?? []).sort((a: RouteStop, b: RouteStop) => a.seq - b.seq),
  })) as RoutePlan[];
}

export async function createRoute(route: Omit<RoutePlan, "stops">): Promise<RoutePlan> {
  const sb = ensureClient();
  const { data, error } = await sb
    .from("route_plans")
    .insert(route)
    .select()
    .single();
  if (error) throw error;
  return { ...(data as any), stops: [] } as RoutePlan;
}

export async function addStop(stop: RouteStop): Promise<RouteStop> {
  const sb = ensureClient();
  const { data, error } = await sb
    .from("route_stops")
    .insert(stop)
    .select()
    .single();
  if (error) throw error;
  return data as RouteStop;
}

export async function updateStop(
  stopId: string,
  patch: Partial<RouteStop>,
): Promise<RouteStop> {
  const sb = ensureClient();
  const { data, error } = await sb
    .from("route_stops")
    .update(patch)
    .eq("stop_id", stopId)
    .select()
    .single();
  if (error) throw error;
  return data as RouteStop;
}

export async function deleteStop(stopId: string): Promise<void> {
  const sb = ensureClient();
  const { error } = await sb.from("route_stops").delete().eq("stop_id", stopId);
  if (error) throw error;
}

export async function deleteRoute(routeId: string): Promise<void> {
  const sb = ensureClient();
  const { error } = await sb.from("route_plans").delete().eq("route_id", routeId);
  if (error) throw error;
}
