/**
 * deleteRequestStore.ts
 * Zustand store สำหรับคำขอลบลูกค้า (2-step approval)
 * Sales -> ส่งคำขอ -> Manager อนุมัติ -> ลบจริง
 */
import { create } from "zustand";
import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";
import { toast } from "sonner";

export interface DeleteRequest {
  id: string;
  customer_id: string;
  customer_name: string;
  requested_by: string;
  reason?: string;
  status: "pending" | "approved" | "rejected";
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
}

export type DeleteRequestDraft = Pick<
  DeleteRequest,
  "customer_id" | "customer_name" | "requested_by" | "reason"
>;

interface DeleteRequestState {
  requests: DeleteRequest[];
  loading: boolean;

  loadRequests: () => Promise<void>;
  addRequest: (draft: DeleteRequestDraft) => Promise<string | null>;
  approveRequest: (id: string, reviewedBy: string, deleteCustomerFn: (customerId: string) => void) => Promise<void>;
  rejectRequest: (id: string, reviewedBy: string) => Promise<void>;

  /** pending ที่ยังไม่อ่าน (สำหรับ Manager badge) */
  pendingCount: () => number;
}

export const useDeleteRequests = create<DeleteRequestState>((set, get) => ({
  requests: [],
  loading: false,

  pendingCount: () => get().requests.filter((r) => r.status === "pending").length,

  loadRequests: async () => {
    if (!SUPABASE_ENABLED || !supabase) return;
    set({ loading: true });
    const { data, error } = await supabase
      .from("customer_delete_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[deleteRequest] load ล้มเหลว:", error);
    } else {
      set({ requests: (data ?? []) as DeleteRequest[] });
    }
    set({ loading: false });
  },

  addRequest: async (draft) => {
    const newReq: DeleteRequest = {
      id: crypto.randomUUID(),
      ...draft,
      status: "pending",
      created_at: new Date().toISOString(),
    };
    // Optimistic update
    set({ requests: [newReq, ...get().requests] });
    toast.success("ส่งคำขอลบลูกค้าให้ Manager แล้ว รอการอนุมัติ");

    if (SUPABASE_ENABLED && supabase) {
      const { error } = await supabase
        .from("customer_delete_requests")
        .insert(newReq);
      if (error) {
        console.error("[deleteRequest] insert ล้มเหลว:", error);
        // Rollback
        set({ requests: get().requests.filter((r) => r.id !== newReq.id) });
        toast.error("ส่งคำขอไม่สำเร็จ กรุณาลองใหม่");
        return null;
      }
    }
    return newReq.id;
  },

  approveRequest: async (id, reviewedBy, deleteCustomerFn) => {
    const req = get().requests.find((r) => r.id === id);
    if (!req) return;

    const now = new Date().toISOString();
    const patch = { status: "approved" as const, reviewed_by: reviewedBy, reviewed_at: now };

    // Optimistic update
    set({ requests: get().requests.map((r) => r.id === id ? { ...r, ...patch } : r) });

    // Delete the actual customer
    deleteCustomerFn(req.customer_id);
    toast.success("อนุมัติลบลูกค้า \"" + req.customer_name + "\" แล้ว");

    if (SUPABASE_ENABLED && supabase) {
      await supabase
        .from("customer_delete_requests")
        .update(patch)
        .eq("id", id);
      // Delete the customer row from Supabase
      await supabase
        .from("customers")
        .delete()
        .eq("customer_id", req.customer_id);
      // Broadcast notification to ALL users via team_notifications + Supabase Realtime
      await supabase.from("team_notifications").insert({
        id: crypto.randomUUID(),
        sales: "All",
        type: "customer_deleted",
        title: "🗑️ ลบข้อมูลลูกค้าแล้ว",
        detail: `"${req.customer_name}" ถูกลบออกจากระบบ — ขอโดย: ${req.requested_by} · อนุมัติโดย: ${reviewedBy}`,
        created_at: now,
        read: false,
      });
    }
  },

  rejectRequest: async (id, reviewedBy) => {
    const req = get().requests.find((r) => r.id === id);
    if (!req) return;

    const now = new Date().toISOString();
    const patch = { status: "rejected" as const, reviewed_by: reviewedBy, reviewed_at: now };

    set({ requests: get().requests.map((r) => r.id === id ? { ...r, ...patch } : r) });
    toast.info("ปฏิเสธคำขอลบลูกค้า \"" + req.customer_name + "\" แล้ว");

    if (SUPABASE_ENABLED && supabase) {
      await supabase
        .from("customer_delete_requests")
        .update(patch)
        .eq("id", id);
    }
  },
}));
