/**
 * deleteRequestStore.ts
 * Zustand store สำหรับคำขอลบลูกค้า (2-step approval)
 * Sales/OB Co-ordinator -> ส่งคำขอ -> Manager อนุมัติ -> ลบจริง
 * department: "sales" → ส่งให้ Sales Manager, "ob" → ส่งให้ OB Manager
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
  /** "sales" = Sales Manager approves, "ob" = OB Manager approves. Defaults to "sales" for legacy records. */
  department: "sales" | "ob";
  status: "pending" | "approved" | "rejected";
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
}

export type DeleteRequestDraft = Pick<
  DeleteRequest,
  "customer_id" | "customer_name" | "requested_by" | "reason" | "department"
>;

interface DeleteRequestState {
  requests: DeleteRequest[];
  loading: boolean;

  loadRequests: () => Promise<void>;
  addRequest: (draft: DeleteRequestDraft) => Promise<string | null>;
  approveRequest: (id: string, reviewedBy: string, deleteCustomerFn: (customerId: string) => void) => Promise<void>;
  rejectRequest: (id: string, reviewedBy: string) => Promise<void>;

  /** pending ทั้งหมด (สำหรับ Admin badge) */
  pendingCount: () => number;
  /** pending แยกตาม department — "sales" → Sales Manager, "ob" → OB Manager */
  pendingCountForDept: (dept: "sales" | "ob") => number;
}

export const useDeleteRequests = create<DeleteRequestState>((set, get) => ({
  requests: [],
  loading: false,

  pendingCount: () => get().requests.filter((r) => r.status === "pending").length,
  pendingCountForDept: (dept) => get().requests.filter((r) => r.status === "pending" && (r.department ?? "sales") === dept).length,

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
      // Normalize: ถ้า record เก่าไม่มี department → default "sales"
      const normalized = ((data ?? []) as any[]).map((r) => ({
        ...r,
        department: (r.department ?? "sales") as "sales" | "ob",
      })) as DeleteRequest[];
      set({ requests: normalized });
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
    const managerLabel = draft.department === "ob" ? "OB Manager" : "Sales Manager";
    toast.success(`ส่งคำขอลบลูกค้าให้ ${managerLabel} แล้ว รอการอนุมัติ`);

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
      const { error: deleteErr } = await supabase
        .from("customers")
        .delete()
        .eq("customer_id", req.customer_id);
      if (deleteErr) {
        console.error("[deleteRequest] ลบลูกค้าจาก Supabase ไม่สำเร็จ:", deleteErr);
        toast.error(`ลบข้อมูล "${req.customer_name}" ออกจาก server ไม่สำเร็จ — กรุณา login ใหม่แล้วลองอีกครั้ง`);
        return;
      }
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
