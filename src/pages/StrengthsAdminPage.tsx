/**
 * StrengthsAdminPage.tsx
 * Admin page สำหรับอนุมัติ / ปฏิเสธคำขอทำ Strengths Quiz ใหม่
 */
import React, { useEffect, useState } from "react";
import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";
import { useCurrentUser } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, RefreshCw, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

interface RetakeRequest {
  id: string;
  user_name: string;
  status: "pending" | "approved" | "rejected";
  requested_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export default function StrengthsAdminPage() {
  const admin = useCurrentUser();
  const [requests, setRequests] = useState<RetakeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  async function fetchRequests() {
    if (!SUPABASE_ENABLED || !supabase) return;
    setLoading(true);
    const { data } = await supabase
      .from("strengths_retake_requests")
      .select("*")
      .order("requested_at", { ascending: false });
    setRequests((data as RetakeRequest[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchRequests(); }, []);

  async function handleApprove(id: string) {
    if (!SUPABASE_ENABLED || !supabase) return;
    setProcessing(id);
    await supabase
      .from("strengths_retake_requests")
      .update({ status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: admin?.full_name ?? "Admin" })
      .eq("id", id);
    await fetchRequests();
    setProcessing(null);
  }

  async function handleReject(id: string) {
    if (!SUPABASE_ENABLED || !supabase) return;
    setProcessing(id);
    await supabase
      .from("strengths_retake_requests")
      .update({ status: "rejected", reviewed_at: new Date().toISOString(), reviewed_by: admin?.full_name ?? "Admin" })
      .eq("id", id);
    await fetchRequests();
    setProcessing(null);
  }

  const pending = requests.filter(r => r.status === "pending");
  const done = requests.filter(r => r.status !== "pending");

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">อนุมัติทำ Strengths Quiz ใหม่</h1>
            <p className="text-xs text-gray-400">คำขอจากผู้ใช้ที่ต้องการทำ Quiz ซ้ำ</p>
          </div>
        </div>
        <button onClick={fetchRequests} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" /> กำลังโหลด...
        </div>
      ) : (
        <>
          {/* Pending */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-bold text-gray-700">รออนุมัติ</span>
              {pending.length > 0 && (
                <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">{pending.length}</span>
              )}
            </div>
            {pending.length === 0 ? (
              <div className="bg-gray-50 rounded-xl border border-gray-100 px-5 py-8 text-center text-sm text-gray-400">
                ไม่มีคำขอที่รออนุมัติ
              </div>
            ) : (
              <div className="space-y-3">
                {pending.map(r => (
                  <div key={r.id} className="bg-white rounded-xl border border-amber-100 shadow-sm p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 text-sm font-bold text-violet-600">
                      {r.user_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{r.user_name}</p>
                      <p className="text-xs text-gray-400">
                        ส่งคำขอ {new Date(r.requested_at).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(r.id)}
                        disabled={processing === r.id}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg h-8 px-3"
                      >
                        {processing === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        <span className="ml-1 text-xs">อนุมัติ</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(r.id)}
                        disabled={processing === r.id}
                        className="border-red-200 text-red-500 hover:bg-red-50 rounded-lg h-8 px-3"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span className="ml-1 text-xs">ปฏิเสธ</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* History */}
          {done.length > 0 && (
            <div>
              <p className="text-sm font-bold text-gray-700 mb-3">ประวัติ</p>
              <div className="space-y-2">
                {done.map(r => (
                  <div key={r.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
                    <div className={cn(
                      "w-2 h-2 rounded-full flex-shrink-0",
                      r.status === "approved" ? "bg-emerald-500" : "bg-red-400"
                    )} />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-700">{r.user_name}</span>
                      <span className={cn("ml-2 text-xs font-semibold", r.status === "approved" ? "text-emerald-600" : "text-red-500")}>
                        {r.status === "approved" ? "✓ อนุมัติ" : "✗ ปฏิเสธ"}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      โดย {r.reviewed_by ?? "-"} · {r.reviewed_at ? new Date(r.reviewed_at).toLocaleDateString("th-TH", { day: "numeric", month: "short" }) : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
