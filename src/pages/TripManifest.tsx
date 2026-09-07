/**
 * TripManifest.tsx
 *
 * หน้า Trip Manifest — รายชื่อผู้โดยสารพร้อมรายละเอียดครบครัน
 * เหมาะสำหรับ OB Co-ordinator / OB Manager ตรวจสอบก่อนเดินทาง
 *
 * URL: /app/trip-manifest  (เลือก tour + period จากหน้าเดียวกัน)
 */

import { useState, useMemo } from "react";
import { useCRM } from "@/store/crmStore";
import { useServices } from "@/store/serviceStore";
import { useBookingLedger } from "@/store/bookingLedgerStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
  if (!n && n !== 0) return "–";
  return n.toLocaleString("th-TH", { maximumFractionDigits: 0 });
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ManifestRow {
  seq: number;
  key: string;
  name: string;
  passportName: string;
  phone: string;
  pax: number;
  roomType: string;
  roomPartner: string;
  foodPref: string;
  depositAmount: number | null;
  depositDate: string | null;
  balanceDueDate: string | null;
  quotedPrice: number;
  discount: number | null;
  totalNet: number;
  addedBy: string;
  emergencyContact: string;
  specialRequests: string;
  note: string;
  source: "lead" | "booking";
}

// ── Food pref badge colour ────────────────────────────────────────────────────

function foodColor(pref: string) {
  if (!pref || pref === "ปกติ") return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  if (pref.includes("มังสวิรัติ")) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
  if (pref.includes("ฮาลาล")) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
  return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TripManifest() {
  const leads    = useCRM((s) => s.leads);
  const customers = useCRM((s) => s.customers);
  const tours    = useServices((s) => s.tours);
  const bookings = useBookingLedger((s) => s.bookings);

  const [selectedTourId, setSelectedTourId]     = useState("");
  const [selectedPeriodId, setSelectedPeriodId] = useState("");

  // ── Tour list ──────────────────────────────────────────────────────────────
  const tourOptions = useMemo(() =>
    tours
      .filter((t) => !t.archived && t.periods && t.periods.length > 0)
      .sort((a, b) => (a.title || a.country || a.code || "").localeCompare(b.title || b.country || b.code || "", "th")),
    [tours]
  );

  // ── Period list for selected tour ─────────────────────────────────────────
  const periodOptions = useMemo(() => {
    if (!selectedTourId) return [];
    const tour = tours.find((t) => t.id === selectedTourId);
    return (tour?.periods ?? [])
      .filter((p) => !p.archived)
      .sort((a, b) => (a.start_date ?? "").localeCompare(b.start_date ?? ""));
  }, [tours, selectedTourId]);

  // ── Selected tour / period objects ────────────────────────────────────────
  const tour   = tours.find((t) => t.id === selectedTourId);
  const period = periodOptions.find((p) => p.period_id === selectedPeriodId);

  // ── Build manifest rows ───────────────────────────────────────────────────
  const rows = useMemo<ManifestRow[]>(() => {
    if (!selectedTourId || !selectedPeriodId) return [];

    const result: ManifestRow[] = [];
    let seq = 1;

    // 1. Leads (primary)
    // - exact match: tour_id + period_id linked
    // - fallback: old leads without tour_id — match by program name + travel_month
    const period = periodOptions.find((p) => p.period_id === selectedPeriodId);
    const travelMonth = period?.start_date?.slice(0, 7) ?? "";
    const tourName = tour?.title || tour?.country || tour?.code || "";
    const bookedLeads = leads.filter((l) => {
      if (l.status !== "จองแล้ว") return false;
      if (l.tour_id && l.period_id)
        return l.tour_id === selectedTourId && l.period_id === selectedPeriodId;
      // fallback: match by program name + travel month (old leads without tour_id link)
      return (
        tourName && l.program === tourName &&
        travelMonth && l.travel_month === travelMonth
      );
    });
    for (const l of bookedLeads) {
      const cust = customers.find((c) => c.id === l.customer_id);
      const quoted = l.quoted_price ?? 0;
      const disc   = (l as Record<string, unknown>).discount as number | null ?? null;
      const net    = quoted - (disc ?? 0);
      result.push({
        seq: seq++,
        key: `lead-${l.id}`,
        name:            cust?.full_name ?? l.program ?? "–",
        passportName:    (l as Record<string, unknown>).passport_name as string ?? "",
        phone:           cust?.phone ?? "",
        pax:             l.pax_count ?? 1,
        roomType:        (l as Record<string, unknown>).room_type as string ?? "",
        roomPartner:     (l as Record<string, unknown>).room_partner as string ?? "",
        foodPref:        (l as Record<string, unknown>).food_pref as string ?? "ปกติ",
        depositAmount:   (l as Record<string, unknown>).deposit_amount as number | null ?? null,
        depositDate:     (l as Record<string, unknown>).deposit_date as string | null ?? null,
        balanceDueDate:  (l as Record<string, unknown>).balance_due_date as string | null ?? null,
        quotedPrice:     quoted,
        discount:        disc,
        totalNet:        net,
        addedBy:         l.assigned_to ?? "–",
        emergencyContact:(l as Record<string, unknown>).emergency_contact as string ?? "",
        specialRequests: (l as Record<string, unknown>).special_requests as string ?? "",
        note:            l.notes ?? "",
        source:          "lead",
      });
    }

    // 2. Anonymous bookings (fallback — no lead_id)
    const anonBookings = bookings.filter(
      (b) => b.tour_id === selectedTourId && b.period_id === selectedPeriodId &&
             b.status === "active" && !b.lead_id
    );
    for (const b of anonBookings) {
      result.push({
        seq: seq++,
        key: `booking-${b.id}`,
        name:            b.customer_name ?? "(ไม่ระบุชื่อ)",
        passportName:    "",
        phone:           b.customer_phone ?? "",
        pax:             b.seats,
        roomType:        "",
        roomPartner:     "",
        foodPref:        "",
        depositAmount:   null,
        depositDate:     null,
        balanceDueDate:  null,
        quotedPrice:     (b.price_per_seat ?? 0) * b.seats,
        discount:        null,
        totalNet:        (b.price_per_seat ?? 0) * b.seats,
        addedBy:         b.booked_by ?? "–",
        emergencyContact:"",
        specialRequests: "",
        note:            b.notes ?? "",
        source:          "booking",
      });
    }

    return result;
  }, [leads, customers, bookings, tours, periodOptions, selectedTourId, selectedPeriodId]);

  // ── Summary ───────────────────────────────────────────────────────────────
  const totalPax   = rows.reduce((s, r) => s + r.pax, 0);
  const totalNet   = rows.reduce((s, r) => s + r.totalNet, 0);
  const totalDisc  = rows.reduce((s, r) => s + (r.discount ?? 0), 0);
  const quota      = period?.quota ?? 0;

  // ── Print ─────────────────────────────────────────────────────────────────
  function handlePrint() { window.print(); }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            🛂 Trip Manifest
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">รายชื่อผู้โดยสารพร้อมรายละเอียดครบครัน</p>
        </div>
        {rows.length > 0 && (
          <Button variant="outline" size="sm" onClick={handlePrint} className="print:hidden">
            🖨️ พิมพ์ / Export PDF
          </Button>
        )}
      </div>

      {/* Pickers */}
      <div className="flex gap-3 flex-wrap print:hidden">
        {/* Tour */}
        <div className="flex flex-col gap-1 min-w-[220px]">
          <label className="text-xs font-medium text-muted-foreground">โปรแกรมทัวร์</label>
          <select
            value={selectedTourId}
            onChange={(e) => { setSelectedTourId(e.target.value); setSelectedPeriodId(""); }}
            className="border rounded-md px-3 py-1.5 text-sm bg-background"
          >
            <option value="">— เลือกโปรแกรม —</option>
            {tourOptions.map((t) => (
              <option key={t.id} value={t.id}>{t.title || t.country || t.code}</option>
            ))}
          </select>
        </div>

        {/* Period */}
        <div className="flex flex-col gap-1 min-w-[200px]">
          <label className="text-xs font-medium text-muted-foreground">Period / วันเดินทาง</label>
          <select
            value={selectedPeriodId}
            onChange={(e) => setSelectedPeriodId(e.target.value)}
            disabled={!selectedTourId}
            className="border rounded-md px-3 py-1.5 text-sm bg-background disabled:opacity-40"
          >
            <option value="">— เลือก Period —</option>
            {periodOptions.map((p) => (
              <option key={p.period_id} value={p.period_id}>
                {fmtDate(p.start_date)}{p.end_date ? ` – ${fmtDate(p.end_date)}` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Empty / not selected state */}
      {!selectedTourId && (
        <div className="text-center py-16 text-muted-foreground text-sm">
          เลือกโปรแกรมและ Period เพื่อดู Manifest
        </div>
      )}

      {selectedTourId && selectedPeriodId && rows.length === 0 && (
        <div className="text-center py-16 text-muted-foreground text-sm">
          ยังไม่มีรายชื่อผู้จองใน Period นี้
        </div>
      )}

      {/* Summary strip */}
      {rows.length > 0 && (
        <>
          {/* Print header (hidden on screen) */}
          <div className="hidden print:block mb-4">
            <h2 className="text-lg font-bold">{tour?.title || tour?.country || tour?.code}</h2>
            <p className="text-sm">
              {fmtDate(period?.start_date)}{period?.end_date ? ` – ${fmtDate(period?.end_date)}` : ""} &nbsp;|&nbsp;
              วันพิมพ์: {new Date().toLocaleDateString("th-TH")}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4">
            {[
              { label: "จำนวนผู้โดยสาร",   value: `${totalPax} / ${quota} คน`,    col: "text-primary" },
              { label: "ยอดรวมสุทธิ",       value: `฿${fmtMoney(totalNet)}`,       col: "text-emerald-600 dark:text-emerald-400" },
              { label: "ส่วนลดรวม",         value: `฿${fmtMoney(totalDisc)}`,      col: "text-orange-500" },
              { label: "รายการทั้งหมด",     value: `${rows.length} รายการ`,         col: "" },
            ].map((s) => (
              <div key={s.label} className="border rounded-lg p-3 bg-muted/30 text-center">
                <p className={`text-lg font-bold ${s.col}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border print:border-none">
            <table className="min-w-full text-xs print:text-[10px]">
              <thead>
                <tr className="bg-muted/60 text-muted-foreground text-left">
                  <th className="px-2 py-2 font-semibold">#</th>
                  <th className="px-2 py-2 font-semibold">ชื่อลูกค้า</th>
                  <th className="px-2 py-2 font-semibold">ชื่อ Passport</th>
                  <th className="px-2 py-2 font-semibold">เบอร์</th>
                  <th className="px-2 py-2 font-semibold">ฉุกเฉิน</th>
                  <th className="px-2 py-2 font-semibold text-center">ที่นั่ง</th>
                  <th className="px-2 py-2 font-semibold">ห้อง</th>
                  <th className="px-2 py-2 font-semibold">คู่นอน</th>
                  <th className="px-2 py-2 font-semibold">อาหาร</th>
                  <th className="px-2 py-2 font-semibold text-right">มัดจำ</th>
                  <th className="px-2 py-2 font-semibold">วันมัดจำ</th>
                  <th className="px-2 py-2 font-semibold">ชำระสุดท้าย</th>
                  <th className="px-2 py-2 font-semibold text-right">ราคา</th>
                  <th className="px-2 py-2 font-semibold text-right">ส่วนลด</th>
                  <th className="px-2 py-2 font-semibold text-right">สุทธิ</th>
                  <th className="px-2 py-2 font-semibold">เพิ่มโดย</th>
                  <th className="px-2 py-2 font-semibold">พิเศษ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={r.key}
                    className={`border-t transition-colors ${i % 2 === 0 ? "bg-background" : "bg-muted/20"}`}
                  >
                    <td className="px-2 py-2 text-muted-foreground">{r.seq}</td>
                    <td className="px-2 py-2 font-medium whitespace-nowrap">
                      {r.name}
                      {r.source === "booking" && (
                        <Badge variant="outline" className="ml-1 text-[9px] px-1 py-0">Anon</Badge>
                      )}
                    </td>
                    <td className="px-2 py-2 text-muted-foreground whitespace-nowrap">
                      {r.passportName || <span className="opacity-40">–</span>}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">{r.phone || <span className="opacity-40">–</span>}</td>
                    <td className="px-2 py-2 whitespace-nowrap text-muted-foreground">
                      {r.emergencyContact || <span className="opacity-40">–</span>}
                    </td>
                    <td className="px-2 py-2 text-center">{r.pax}</td>
                    <td className="px-2 py-2">
                      {r.roomType
                        ? <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{r.roomType}</Badge>
                        : <span className="opacity-40">–</span>}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-muted-foreground">
                      {r.roomPartner || <span className="opacity-40">–</span>}
                    </td>
                    <td className="px-2 py-2">
                      {r.foodPref
                        ? <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${foodColor(r.foodPref)}`}>{r.foodPref}</span>
                        : <span className="opacity-40">–</span>}
                    </td>
                    <td className="px-2 py-2 text-right">
                      {r.depositAmount != null ? fmtMoney(r.depositAmount) : <span className="opacity-40">–</span>}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-muted-foreground">{fmtDate(r.depositDate)}</td>
                    <td className="px-2 py-2 whitespace-nowrap text-muted-foreground">{fmtDate(r.balanceDueDate)}</td>
                    <td className="px-2 py-2 text-right">{fmtMoney(r.quotedPrice)}</td>
                    <td className="px-2 py-2 text-right text-orange-600 dark:text-orange-400">
                      {r.discount ? `-${fmtMoney(r.discount)}` : <span className="opacity-40">–</span>}
                    </td>
                    <td className="px-2 py-2 text-right font-semibold text-emerald-700 dark:text-emerald-400">
                      {fmtMoney(r.totalNet)}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-muted-foreground">{r.addedBy}</td>
                    <td className="px-2 py-2 max-w-[140px] truncate text-muted-foreground" title={r.specialRequests || r.note}>
                      {r.specialRequests || r.note || <span className="opacity-40">–</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Footer totals */}
              <tfoot>
                <tr className="border-t-2 bg-muted/50 font-semibold">
                  <td colSpan={5} className="px-2 py-2 text-right text-muted-foreground text-xs">รวม</td>
                  <td className="px-2 py-2 text-center">{totalPax}</td>
                  <td colSpan={7} />
                  <td className="px-2 py-2 text-right">{fmtMoney(rows.reduce((s,r)=>s+r.quotedPrice,0))}</td>
                  <td className="px-2 py-2 text-right text-orange-600">{totalDisc ? `-${fmtMoney(totalDisc)}` : "–"}</td>
                  <td className="px-2 py-2 text-right text-emerald-700 dark:text-emerald-400">{fmtMoney(totalNet)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
