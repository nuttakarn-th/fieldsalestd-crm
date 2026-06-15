/**
 * DataRealtimeSync.tsx
 * Subscribe to Supabase Realtime channels for customers, leads, team_notifications,
 * and customer_delete_requests.
 * Keeps all open tabs/browsers in sync without a manual refresh.
 *
 * v98 performance: throttle UPDATE events 500ms
 * — batch หลาย UPDATE เป็น setState เดียว ลด re-render เมื่อ Mission ทำงานเร็ว
 * — INSERT / DELETE ยังคง immediate (ผู้ใช้ต้องเห็นทันที)
 */
import { useEffect } from "react";
import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";
import { useCRM, type Customer, type Lead } from "@/store/crmStore";
import { useDeleteRequests, type DeleteRequest } from "@/store/deleteRequestStore";
import { useCurrentUser } from "@/store/authStore";
import { toast } from "sonner";

export function DataRealtimeSync() {
  const currentUser = useCurrentUser();

  useEffect(() => {
    if (!SUPABASE_ENABLED || !supabase) return;
    const isManager = currentUser?.role === "Admin" || currentUser?.role === "Sales Manager";

    // ── Throttle buckets สำหรับ UPDATE events ─────────────────────────────
    // แทนที่จะ setState ทุก event → collect ใน Map แล้ว flush พร้อมกัน 500ms
    const pendingCustUpdates = new Map<string, Customer>();
    let custFlushTimer: ReturnType<typeof setTimeout> | null = null;

    const flushCustomerUpdates = () => {
      if (pendingCustUpdates.size === 0) return;
      const updates = new Map(pendingCustUpdates);
      pendingCustUpdates.clear();
      useCRM.setState((s) => ({
        customers: s.customers.map((c) =>
          updates.has(c.customer_id) ? { ...c, ...updates.get(c.customer_id) } : c
        ),
      }));
    };

    const pendingLeadUpdates = new Map<string, Lead>();
    let leadFlushTimer: ReturnType<typeof setTimeout> | null = null;

    const flushLeadUpdates = () => {
      if (pendingLeadUpdates.size === 0) return;
      const updates = new Map(pendingLeadUpdates);
      pendingLeadUpdates.clear();
      useCRM.setState((s) => ({
        leads: s.leads.map((l) =>
          updates.has(l.lead_id) ? { ...l, ...updates.get(l.lead_id) } : l
        ),
      }));
    };

    // ── Customers channel ──────────────────────────────────────────────────
    const customerChannel = supabase
      .channel("customers_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "customers" },
        (payload) => {
          const state = useCRM.getState();

          if (payload.eventType === "INSERT") {
            // INSERT: immediate — ผู้ใช้อื่นต้องเห็นลูกค้าใหม่ทันที
            const newCust = payload.new as Customer;
            if (!state.customers.some((c) => c.customer_id === newCust.customer_id)) {
              useCRM.setState({ customers: [newCust, ...state.customers] });
            }
          } else if (payload.eventType === "UPDATE") {
            // UPDATE: throttle 500ms — batch หลาย update เป็น setState เดียว
            const updated = payload.new as Customer;
            pendingCustUpdates.set(updated.customer_id, updated);
            if (custFlushTimer) clearTimeout(custFlushTimer);
            custFlushTimer = setTimeout(flushCustomerUpdates, 500);
          } else if (payload.eventType === "DELETE") {
            // DELETE: immediate — ต้องเห็นทันทีว่าหายไป
            const deleted = payload.old as { customer_id: string };
            useCRM.setState({
              customers: state.customers.filter((c) => c.customer_id !== deleted.customer_id),
            });
          }
        }
      )
      .subscribe();

    // ── Leads channel ─────────────────────────────────────────────────────
    const leadsChannel = supabase
      .channel("leads_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads" },
        (payload) => {
          const state = useCRM.getState();

          if (payload.eventType === "INSERT") {
            const newLead = payload.new as Lead;
            if (!state.leads.some((l) => l.lead_id === newLead.lead_id)) {
              useCRM.setState({ leads: [newLead, ...state.leads] });
            }
          } else if (payload.eventType === "UPDATE") {
            // UPDATE: throttle 500ms
            const updated = payload.new as Lead;
            pendingLeadUpdates.set(updated.lead_id, updated);
            if (leadFlushTimer) clearTimeout(leadFlushTimer);
            leadFlushTimer = setTimeout(flushLeadUpdates, 500);
          } else if (payload.eventType === "DELETE") {
            const deleted = payload.old as { lead_id: string };
            useCRM.setState({
              leads: state.leads.filter((l) => l.lead_id !== deleted.lead_id),
            });
          }
        }
      )
      .subscribe();

    // ── Team Notifications channel ─────────────────────────────────────────
    const me = currentUser?.full_name;
    const notifChannel = supabase
      .channel("team_notifications_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "team_notifications" },
        (payload) => {
          const notif = payload.new as {
            id: string;
            sales: string;
            type: string;
            title: string;
            detail: string;
            action_url?: string;
            created_at: string;
            read: boolean;
          };

          const state = useCRM.getState();
          const existing = (state.teamNotifications as typeof notif[]) ?? [];

          if (!existing.some((n) => n.id === notif.id)) {
            useCRM.setState({ teamNotifications: [notif, ...existing] as any });

            // Show toast if addressed to me or broadcast
            if (me && (notif.sales === me || notif.sales === "All")) {
              toast(notif.title, { description: notif.detail });
            }
          }
        }
      )
      .subscribe();

    // ── Customer Delete Requests channel ─────────────────────────────────────
    // Manager/Admin ได้รับ toast แจ้งเตือนทันทีเมื่อ Sales ส่งคำขอลบ
    const deleteReqChannel = supabase
      .channel("delete_requests_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "customer_delete_requests" },
        (payload) => {
          const newReq = payload.new as DeleteRequest;
          // Push into deleteRequestStore so badge updates immediately
          const store = useDeleteRequests.getState();
          if (!store.requests.some((r) => r.id === newReq.id)) {
            useDeleteRequests.setState({ requests: [newReq, ...store.requests] });
          }
          // Toast only for Manager / Admin
          if (isManager) {
            toast("🔔 คำขออนุมัติลบลูกค้า", {
              description: `${newReq.requested_by} ขอลบ "${newReq.customer_name}"${newReq.reason ? ` — ${newReq.reason}` : ""}`,
              duration: Infinity,   // ค้างจนกว่าจะกด action
              action: {
                label: "ดูคำขอ",
                onClick: () => {
                  // เปิด Bell popover ไม่ได้โดยตรง แต่ trigger click บน bell button ได้
                  const bellBtn = document.querySelector<HTMLButtonElement>("[aria-label='Team notifications']");
                  bellBtn?.click();
                },
              },
            });
          }
        }
      )
      .subscribe();

    return () => {
      // flush pending throttled updates ก่อน unmount เพื่อไม่ให้ข้อมูลหาย
      if (custFlushTimer) { clearTimeout(custFlushTimer); flushCustomerUpdates(); }
      if (leadFlushTimer) { clearTimeout(leadFlushTimer); flushLeadUpdates(); }
      supabase.removeChannel(customerChannel);
      supabase.removeChannel(leadsChannel);
      supabase.removeChannel(notifChannel);
      supabase.removeChannel(deleteReqChannel);
    };
  }, [currentUser]);

  return null;
}
