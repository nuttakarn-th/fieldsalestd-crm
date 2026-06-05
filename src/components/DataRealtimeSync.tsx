/**
 * DataRealtimeSync.tsx
 * Subscribe to Supabase Realtime channels for customers, leads, team_notifications,
 * and customer_delete_requests.
 * Keeps all open tabs/browsers in sync without a manual refresh.
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

    // ── Customers channel ──────────────────────────────────────────────────
    const customerChannel = supabase
      .channel("customers_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "customers" },
        (payload) => {
          const state = useCRM.getState();

          if (payload.eventType === "INSERT") {
            const newCust = payload.new as Customer;
            if (!state.customers.some((c) => c.customer_id === newCust.customer_id)) {
              useCRM.setState({ customers: [newCust, ...state.customers] });
            }
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as Customer;
            useCRM.setState({
              customers: state.customers.map((c) =>
                c.customer_id === updated.customer_id ? { ...c, ...updated } : c
              ),
            });
          } else if (payload.eventType === "DELETE") {
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
            const updated = payload.new as Lead;
            useCRM.setState({
              leads: state.leads.map((l) =>
                l.lead_id === updated.lead_id ? { ...l, ...updated } : l
              ),
            });
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
            body: string;
            created_at: string;
            read: boolean;
          };

          const state = useCRM.getState();
          const existing = (state.teamNotifications as typeof notif[]) ?? [];

          if (!existing.some((n) => n.id === notif.id)) {
            useCRM.setState({ teamNotifications: [notif, ...existing] as any });

            // Show toast if addressed to me or broadcast
            if (me && (notif.sales === me || notif.sales === "All")) {
              toast(notif.title, { description: notif.body });
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
      supabase.removeChannel(customerChannel);
      supabase.removeChannel(leadsChannel);
      supabase.removeChannel(notifChannel);
      supabase.removeChannel(deleteReqChannel);
    };
  }, [currentUser]);

  return null;
}
