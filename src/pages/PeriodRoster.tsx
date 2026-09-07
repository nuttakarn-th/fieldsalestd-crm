/**
 * PeriodRoster.tsx
 *
 * หน้ารายชื่อผู้จองใน Period ที่ระบุ — ใช้ตรวจสอบก่อนเดินทาง
 *
 * Data sources (merged):
 *   1. leads  — status="จองแล้ว" + tour_id + period_id match  (Primary)
 *   2. bookings table — active + tour_id + period_id match (Anonymous fallback)
 *
 * URL: /app/period-roster/:tourId/:periodId
 */

import { useMemo, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCRM } from "@/store/crmStore";
import { useServices } from "@/store/serviceStore";
import { useBookingLedger } from "@/store/bookingLedgerStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso?: string | null) {
  if (!iso) return "–";
  try {
    return new Date(iso).toLocaleDateString("th-TH", {
      day: "numeric", month: "short", year: "2-digit",
    });
  } catch { return iso; }
}

function fmtMoney(n?: number | null) {
  if (!n) return "–";
  return n.toLocaleString("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 });
}

// ── Merged row type ───────────────────────────────────────────────────────────

interface RosterRow {
  key: string;
  seq: number;
  name: string;
  phone: string;
  pax: number;
  price: number;          // total (pax × price_per_seat or closed_price)
  pricePerSeat: number;
  assignedTo: string;
  bookedAt: string;
  source: "lead" | "booking";  // data origin
  note?: string | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PeriodRoster() {
  const { tourId = "", periodId = "" } = useParams<{ tourId: string; periodId: string }>();
  const navigate = useNavigate();

  // ── Stores ────────────────────────────────────────────────────────────────
  const leads    = useCRM((s) => s.leads);
  const customers = useCRM((s) => s.customers);
  const tours    = useServices((s) => s.tours);
  const bookings = useBookingLedger((s) => s.bookings);
  const loadBookings = useBookingLedger((s) => s.loadBookings);

  // load bookings on mount if not yet loaded
  const loaded = useRef(false);
  useEffect(() => {
    if (!loaded.current) {
      loaded.current = true;
      loadBookings();
    }
  }, [loadBookings]);

  // ── Tour + Period info ────────────────────────────────────────────────────
  const tour   = useMemo(() => tours.find((t) => t.id === tourId), [tours, tourId]);
  const period = useMemo(
    () => tour?.periods?.find((p) => p.period_id === periodId),
    [tour, periodId],
  );

  const tourName    = tour ? (tour.title || tour.code || "–") : "–";
  const periodLabel = period
    ? `${fmtDate(period.start_date)} – ${fmtDate(period.end_date)}`
    : "–";
  const totalSeats  = period?.total_seats ?? 0;

  // ── Build merged roster ───────────────────────────────────────────────────
  const rows = useMemo<RosterRow[]>(() => {
    const result: RosterRow[] = [];
    const usedLeadIds = new Set<string>();

    // 1. Leads (primary source)
    const matchLeads = leads.filter(
      (l) =>
        l.tour_id === tourId &&
        l.period_id === periodId &&
        l.status === "จองแล้ว",
    );
    for (const l of matchLeads) {
      usedLeadIds.add(l.lead_id);
      const cust = customers.find((c) => c.customer_id === l.customer_id);
      const price = (l.closed_price ?? l.quoted_price ?? 0);
      const pricePerSeat = l.pax_count > 0 ? price / l.pax_count : 0;
      result.push({
        key: l.lead_id,
        seq: 0,
        name: cust?.full_name ?? "(ไม่ระบุชื่อ)",
        phone: cust?.phone ?? "–",
        pax: l.pax_count,
        price,
        pricePerSeat,
        assignedTo: l.assigned_to ?? "–",
        bookedAt: l.closed_date ?? l.created_at ?? "",
        source: "lead",
        note: l.status_note ?? null,
      });
    }

    // 2. Bookings with lead_id=null (anonymous — user clicked "ไว้ภายหลัง")
    const matchBookings = bookings.filter(
      (b) =>
        b.tour_id === tourId &&
        b.period_id === periodId &&
        b.status === "active" &&
        !b.lead_id,   // only truly anonymous ones (linked leads already in step 1)
    );
    for (const b of matchBookings) {
      result.push({
        key: b.id,
        seq: 0,
        name: b.customer_name ?? "(ยังไม่ระบุชื่อ)",
        phone: b.customer_phone ?? "–",
        pax: b.seats,
        price: b.seats * b.price_per_seat,
        pricePerSeat: b.price_per_seat,
        assignedTo: b.booked_by ?? "–",
        bookedAt: b.booked_at,
        source: "booking",
        note: b.notes ?? null,
      });
    }

    // sort by bookedAt asc, then add seq
    result.sort((a, b) => a.bookedAt.localeCompare(b.bookedAt));
    result.forEach((r, i) => { r.seq = i + 1; });
    return result;
  }, [leads, customers, bookings, tourId, periodId]);

  // ── Summary ───────────────────────────────────────────────────────────────
  const totalPax    = rows.reduce((s, r) => s + r.pax, 0);
  const totalRevenue = rows.reduce((s, r) => s + r.price, 0);
  const remaining   = totalSeats > 0 ? totalSeats - totalPax : null;
  const fillPct     = totalSeats > 0 ? Math.round((totalPax / totalSeats) * 100) : null;

  // ── Print handler ─────────────────────────────────────────────────────────
  function handlePrint() {
    window.print();
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background print:bg-white">
      {/* ── Page header ── */}
      <div className="sticky top-0 z-10 bg-background border-b print:hidden">
        <div className="flex items-center gap-3 px-4 py-3 max-w-5xl mx-auto">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="shrink-0">
            ← กลับ
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold truncate">รายชื่อผู้จอง</h1>
            <p className="text-xs text-muted-foreground truncate">{tourName} · {periodLabel}</p>
          </div>
          <Button variant="outline" size="sm" onClick={handlePrint} className="shrink-0">
            🖨️ พิมพ์
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-5 space-y-5">
        {/* ── Print header (print only) ── */}
        <div className="hidden print:block mb-4">
          <h1 className="text-xl font-bold">{tourName}</h1>
          <p className="text-sm text-gray-600">{periodLabel}</p>
          <p className="text-xs text-gray-400 mt-1">พิมพ์เมื่อ: {new Date().toLocaleString("th-TH")}</p>
        </div>

        {/* ── Stats strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "ผู้จองทั้งหมด", value: `${rows.length} ราย`, color: "text-foreground" },
            { label: "ที่นั่งรวม", value: `${totalPax} / ${totalSeats || "–"} ที่`, color: totalSeats && totalPax > totalSeats ? "text-destructive" : "text-foreground" },
            { label: "ที่นั่งว่าง", value: remaining !== null ? `${remaining} ที่` : "–", color: remaining !== null && remaining <= 2 ? "text-amber-600" : "text-foreground" },
            { label: "ยอดรวม", value: fmtMoney(totalRevenue), color: "text-emerald-600" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border bg-muted/30 px-4 py-3">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-lg font-bold mt-0.5 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── Fill bar ── */}
        {fillPct !== null && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>ความจุ</span>
              <span>{fillPct}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  fillPct >= 100 ? "bg-destructive" :
                  fillPct >= 80  ? "bg-amber-500" :
                  "bg-emerald-500"
                }`}
                style={{ width: `${Math.min(100, fillPct)}%` }}
              />
            </div>
          </div>
        )}

        {/* ── Roster table ── */}
        {rows.length === 0 ? (
          <div className="rounded-xl border bg-muted/20 py-14 text-center space-y-2">
            <p className="text-2xl">👥</p>
            <p className="text-sm font-medium text-muted-foreground">ยังไม่มีรายชื่อผู้จองใน Period นี้</p>
            <p className="text-xs text-muted-foreground">
              รายชื่อจะปรากฏเมื่อมีการบันทึกชื่อลูกค้าผ่านหน้า Stock
            </p>
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            {/* desktop table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="text-left px-3 py-2.5 text-xs text-muted-foreground font-medium w-8">#</th>
                    <th className="text-left px-3 py-2.5 text-xs text-muted-foreground font-medium">ชื่อ-สกุล</th>
                    <th className="text-left px-3 py-2.5 text-xs text-muted-foreground font-medium">เบอร์โทร</th>
                    <th className="text-center px-3 py-2.5 text-xs text-muted-foreground font-medium">ที่นั่ง</th>
                    <th className="text-right px-3 py-2.5 text-xs text-muted-foreground font-medium">ราคา/ที่</th>
                    <th className="text-right px-3 py-2.5 text-xs text-muted-foreground font-medium">รวม</th>
                    <th className="text-left px-3 py-2.5 text-xs text-muted-foreground font-medium hidden sm:table-cell">Sales</th>
                    <th className="text-left px-3 py-2.5 text-xs text-muted-foreground font-medium hidden md:table-cell">วันที่จอง</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.key}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{row.seq}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-start gap-1.5">
                          <div>
                            <p className={`font-medium leading-snug ${row.name.startsWith("(") ? "text-muted-foreground italic text-xs" : ""}`}>
                              {row.name}
                            </p>
                            {row.note && (
                              <p className="text-xs text-muted-foreground mt-0.5">{row.note}</p>
                            )}
                          </div>
                          {row.source === "booking" && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0 mt-0.5 text-amber-600 border-amber-300">
                              ยังไม่ระบุ
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-sm text-muted-foreground">
                        {row.phone !== "–" ? (
                          <a href={`tel:${row.phone}`} className="hover:text-foreground hover:underline print:no-underline">
                            {row.phone}
                          </a>
                        ) : "–"}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold">
                          {row.pax}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right text-sm text-muted-foreground">
                        {row.pricePerSeat > 0 ? row.pricePerSeat.toLocaleString() : "–"}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-emerald-600">
                        {row.price > 0 ? row.price.toLocaleString() : "–"}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-muted-foreground hidden sm:table-cell">
                        {row.assignedTo}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground hidden md:table-cell">
                        {fmtDate(row.bookedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Footer totals */}
                <tfoot>
                  <tr className="bg-muted/40 border-t font-semibold">
                    <td colSpan={3} className="px-3 py-2.5 text-sm">รวมทั้งหมด</td>
                    <td className="px-3 py-2.5 text-center text-sm">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        {totalPax}
                      </span>
                    </td>
                    <td className="px-3 py-2.5" />
                    <td className="px-3 py-2.5 text-right text-emerald-600">
                      {totalRevenue.toLocaleString()}
                    </td>
                    <td colSpan={2} className="hidden sm:table-cell" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ── Legend ── */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground print:hidden">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            ข้อมูลจาก Lead (มีชื่อลูกค้า)
          </span>
          <span className="flex items-center gap-1">
            <Badge variant="outline" className="text-[10px] px-1 py-0 text-amber-600 border-amber-300">ยังไม่ระบุ</Badge>
            ข้อมูลจากการจองที่กด "ไว้ภายหลัง"
          </span>
        </div>

        {/* ── Note about legacy data ── */}
        {rows.length === 0 && (
          <p className="text-xs text-muted-foreground text-center print:hidden">
            หากเคยบันทึกการจองก่อน ก.ย. 2569 อาจไม่ปรากฏที่นี่เนื่องจาก period_id ยังไม่ได้ระบุ
          </p>
        )}
      </div>

      {/* ── Print styles ── */}
      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
        }
      `}</style>
    </div>
  );
}
