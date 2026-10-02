/**
 * PersonaSurveyDashboard.tsx
 *
 * Dashboard สรุปผล Persona Survey
 * Route: /marketing/persona-survey
 *
 * Access: Marketing, OB Manager, OB Coordinator
 *
 * Sections:
 *   1. Summary cards — จำนวน response ต่อ persona
 *   2. Recent responses table
 *   3. QR Code links สำหรับแชร์ survey
 *   4. Customer Persona summary (matched)
 */

import { useEffect, useState } from "react";
import { useSurveyStore, ALL_PERSONAS, PERSONA_EMOJI, PERSONA_COLORS } from "@/store/surveyStore";
import type { PersonaTag } from "@/store/surveyStore";
import { supabase } from "@/lib/supabase";

// ─── RFM per Persona ─────────────────────────────────────────────────────────

interface PersonaRFM {
  persona_tag: PersonaTag;
  customer_count: number;
  lead_count: number;
  booked_count: number;
  total_revenue: number;
  avg_deal_value: number;
}

// ─── QR Code URLs (แสดงเพื่อให้ทีมนำไปทำ QR จริง) ───────────────────────────
const SURVEY_URLS = {
  b2c: `${window.location.origin}/survey/b2c`,
  b2b: `${window.location.origin}/survey/b2b`,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function PersonaSurveyDashboard() {
  const { responses, loading, fetchResponses } = useSurveyStore();
  const [typeFilter, setTypeFilter] = useState<"all" | "b2c" | "b2b">("all");
  const [copied, setCopied] = useState<string | null>(null);
  const [rfmData, setRfmData] = useState<PersonaRFM[]>([]);

  useEffect(() => {
    fetchResponses();
    loadRFM();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadRFM() {
    // ดึง customers ที่มี persona_tag
    const { data: customers } = await supabase
      .from("customers")
      .select("customer_id, persona_tag")
      .not("persona_tag", "is", null);
    if (!customers || customers.length === 0) return;

    // ดึง leads ของ customers เหล่านั้น
    const ids = customers.map((c: any) => c.customer_id);
    const { data: leads } = await supabase
      .from("leads")
      .select("customer_id, status, deal_value")
      .in("customer_id", ids);

    // group by persona_tag
    const map: Record<string, PersonaRFM> = {};
    for (const persona of ALL_PERSONAS) {
      map[persona] = {
        persona_tag: persona,
        customer_count: 0,
        lead_count: 0,
        booked_count: 0,
        total_revenue: 0,
        avg_deal_value: 0,
      };
    }
    for (const c of customers) {
      const p = c.persona_tag as PersonaTag;
      if (!map[p]) continue;
      map[p].customer_count++;
      const cLeads = (leads ?? []).filter((l: any) => l.customer_id === c.customer_id);
      map[p].lead_count += cLeads.length;
      for (const l of cLeads) {
        if (l.status === "จองแล้ว" || l.status === "ปิดการขาย") {
          map[p].booked_count++;
          map[p].total_revenue += l.deal_value ?? 0;
        }
      }
    }
    for (const p of ALL_PERSONAS) {
      if (map[p].booked_count > 0) {
        map[p].avg_deal_value = Math.round(map[p].total_revenue / map[p].booked_count);
      }
    }
    setRfmData(Object.values(map).filter((r) => r.customer_count > 0));
  }

  const filtered = responses.filter((r) =>
    typeFilter === "all" ? true : r.type === typeFilter,
  );

  // Count per persona
  const personaCounts = ALL_PERSONAS.reduce<Record<PersonaTag, number>>(
    (acc, p) => {
      acc[p] = filtered.filter((r) => r.persona_tag === p).length;
      return acc;
    },
    {} as Record<PersonaTag, number>,
  );

  const totalResponses = filtered.length;
  const matchedCount   = filtered.filter((r) => r.matched_customer_id).length;

  function copyUrl(url: string, key: string) {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            🎭 Persona Survey Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            สรุปผล แบบสอบถาม Persona ลูกค้า B2C & B2B
          </p>
        </div>
        <button
          onClick={() => fetchResponses()}
          className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors"
        >
          🔄 รีเฟรช
        </button>
      </div>

      {/* ── Filter tabs ── */}
      <div className="flex gap-2">
        {(["all", "b2c", "b2b"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              typeFilter === t
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {t === "all" ? "ทั้งหมด" : t.toUpperCase()}
          </button>
        ))}
      </div>

      {/* ── Summary stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card rounded-xl border p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{totalResponses}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Response ทั้งหมด</p>
        </div>
        <div className="bg-card rounded-xl border p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{matchedCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Match กับ Customer</p>
        </div>
        <div className="bg-card rounded-xl border p-4 text-center">
          <p className="text-2xl font-bold text-foreground">
            {filtered.filter((r) => r.type === "b2c").length}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">B2C Responses</p>
        </div>
        <div className="bg-card rounded-xl border p-4 text-center">
          <p className="text-2xl font-bold text-foreground">
            {filtered.filter((r) => r.type === "b2b").length}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">B2B Responses</p>
        </div>
      </div>

      {/* ── Persona breakdown ── */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">📊 Persona Breakdown</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {ALL_PERSONAS.map((p) => {
            const count = personaCounts[p] ?? 0;
            const pct = totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0;
            const colorClass = PERSONA_COLORS[p];
            return (
              <div key={p} className="bg-card rounded-xl border p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{PERSONA_EMOJI[p]}</span>
                  <div>
                    <p className="text-xs font-semibold text-foreground leading-tight">{p}</p>
                    <p className="text-xs text-muted-foreground">{count} คน · {pct}%</p>
                  </div>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      colorClass.includes("amber") ? "bg-amber-400" :
                      colorClass.includes("green") ? "bg-green-400" :
                      colorClass.includes("blue")  ? "bg-blue-400"  :
                      colorClass.includes("purple")? "bg-purple-400":
                      colorClass.includes("orange")? "bg-orange-400":
                      "bg-teal-400"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── QR / Share links ── */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">🔗 แชร์ลิงก์ Survey</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { key: "b2c", label: "B2C Survey", desc: "สำหรับลูกค้าทั่วไป", url: SURVEY_URLS.b2c, color: "bg-indigo-50 border-indigo-200" },
            { key: "b2b", label: "B2B Survey", desc: "สำหรับองค์กร / บริษัท", url: SURVEY_URLS.b2b, color: "bg-teal-50 border-teal-200" },
          ].map(({ key, label, desc, url, color }) => (
            <div key={key} className={`rounded-xl border p-4 space-y-2 ${color}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <button
                  onClick={() => copyUrl(url, key)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-white border border-border hover:bg-gray-50 transition-colors shrink-0"
                >
                  {copied === key ? "✅ คัดลอกแล้ว" : "📋 คัดลอก"}
                </button>
              </div>
              <p className="text-xs text-muted-foreground font-mono bg-white/70 rounded-lg px-2 py-1 truncate">
                {url}
              </p>
              <div className="flex gap-2 pt-1">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  เปิด Survey →
                </a>
                <span className="text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">
                  นำ URL ไปสร้าง QR Code แล้ว Print ติดหน้างาน
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── RFM × Persona Insights ── */}
      {rfmData.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">💰 Persona × Revenue Insights</h2>
          <p className="text-xs text-muted-foreground mb-3">
            คำนวณจากลูกค้าใน CRM ที่มี persona_tag + ประวัติ Leads
          </p>
          <div className="rounded-xl border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    {["Persona", "ลูกค้า", "Leads", "จอง", "Conversion", "Avg Deal", "Total Revenue"].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rfmData
                    .sort((a, b) => b.total_revenue - a.total_revenue)
                    .map((row) => {
                      const conv = row.lead_count > 0
                        ? Math.round((row.booked_count / row.lead_count) * 100)
                        : 0;
                      const colorClass = PERSONA_COLORS[row.persona_tag];
                      return (
                        <tr key={row.persona_tag} className="hover:bg-muted/20 transition-colors">
                          <td className="px-3 py-2.5">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium ${colorClass}`}>
                              {PERSONA_EMOJI[row.persona_tag]} {row.persona_tag}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 font-semibold text-foreground">{row.customer_count}</td>
                          <td className="px-3 py-2.5 text-muted-foreground">{row.lead_count}</td>
                          <td className="px-3 py-2.5 text-green-600 font-medium">{row.booked_count}</td>
                          <td className="px-3 py-2.5">
                            <span className={`font-semibold ${conv >= 50 ? "text-green-600" : conv >= 25 ? "text-amber-600" : "text-muted-foreground"}`}>
                              {conv}%
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-foreground">
                            {row.avg_deal_value > 0
                              ? `฿${row.avg_deal_value.toLocaleString()}`
                              : "–"}
                          </td>
                          <td className="px-3 py-2.5 font-semibold text-foreground">
                            {row.total_revenue > 0
                              ? `฿${row.total_revenue.toLocaleString()}`
                              : "–"}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Source Channel breakdown (ถ้ามีข้อมูล) ── */}
      {(() => {
        const sources = responses
          .map((r: any) => r.source_channel)
          .filter(Boolean) as string[];
        if (sources.length === 0) return null;
        const counts: Record<string, number> = {};
        for (const s of sources) counts[s] = (counts[s] ?? 0) + 1;
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        return (
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3">📡 ช่องทางที่รู้จักเรา</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {sorted.map(([ch, cnt]) => (
                <div key={ch} className="bg-card rounded-xl border px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-foreground font-medium">{ch}</span>
                  <span className="text-sm font-bold text-primary">{cnt}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── Recent responses table ── */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">📋 Response ล่าสุด</h2>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">กำลังโหลด…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm space-y-1">
            <p>ยังไม่มี Response</p>
            <p className="text-xs">แชร์ลิงก์ Survey ด้านบนเพื่อเริ่มเก็บข้อมูล</p>
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    {["วันที่", "ประเภท", "ชื่อ", "เบอร์", "Persona", "Source", "Match"].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.slice(0, 50).map((r) => {
                    const colorClass = r.persona_tag ? PERSONA_COLORS[r.persona_tag as PersonaTag] : "";
                    return (
                      <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                          {r.submitted_at
                            ? new Date(r.submitted_at).toLocaleDateString("th-TH", {
                                day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                              })
                            : "–"}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                            r.type === "b2b"
                              ? "bg-teal-100 text-teal-700"
                              : "bg-indigo-100 text-indigo-700"
                          }`}>
                            {r.type?.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-foreground">{r.name ?? "–"}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.phone ?? "–"}</td>
                        <td className="px-3 py-2">
                          {r.persona_tag ? (
                            <span className={`px-2 py-0.5 rounded-full border text-xs font-medium ${colorClass}`}>
                              {PERSONA_EMOJI[r.persona_tag as PersonaTag]} {r.persona_tag}
                            </span>
                          ) : "–"}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{r.source ?? "–"}</td>
                        <td className="px-3 py-2">
                          {r.matched_customer_id ? (
                            <span className="text-green-600">✅</span>
                          ) : (
                            <span className="text-muted-foreground">–</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filtered.length > 50 && (
              <div className="px-3 py-2 bg-muted/20 text-xs text-muted-foreground text-center">
                แสดง 50 รายการล่าสุดจาก {filtered.length} ทั้งหมด
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
