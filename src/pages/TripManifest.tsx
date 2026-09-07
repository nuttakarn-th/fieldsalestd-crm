/**
 * TripManifest.tsx  v2 — Timeline view
 *
 * แสดง Trip ที่กำลังจะเดินทางทั้งหมด เรียงตามวันออก
 * กรองตามเดือน, ค้นหาชื่อลูกค้า, expand ดูรายละเอียด, Export Excel per trip
 */

import { useState, useMemo } from "react";
import { useCRM } from "@/store/crmStore";
import { useServices } from "@/store/serviceStore";
import { useBookingLedger } from "@/store/bookingLedgerStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";

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

function daysUntil(iso?: string | null): number {
  if (!iso) return 9999;
  const diff = new Date(iso).setHours(0,0,0,0) - new Date().setHours(0,0,0,0);
  return Math.ceil(diff / 86400000);
}

function urgencyColor(days: number) {
  if (days < 0)  return "border-l-gray-300 bg-gray-50 dark:bg-gray-900/30";
  if (days <= 7)  return "border-l-red-500 bg-red-50 dark:bg-red-950/30";
  if (days <= 14) return "border-l-orange-400 bg-orange-50 dark:bg-orange-950/30";
  if (days <= 30) return "border-l-yellow-400 bg-yellow-50 dark:bg-yellow-950/20";
  return "border-l-blue-400 bg-blue-50 dark:bg-blue-950/20";
}

function urgencyBadge(days: number) {
  if (days < 0)  return { label: "ผ่านแล้ว", cls: "bg-gray-200 text-gray-600" };
  if (days === 0) return { label: "วันนี้!", cls: "bg-red-600 text-white animate-pulse" };
  if (days <= 7)  return { label: `${days} วัน`, cls: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200" };
  if (days <= 14) return { label: `${days} วัน`, cls: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200" };
  if (days <= 30) return { label: `${days} วัน`, cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200" };
  return { label: `${days} วัน`, cls: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200" };
}

function foodColor(pref: string) {
  if (!pref || pref === "ปกติ") return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  if (pref.includes("มังสวิรัติ")) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
  if (pref.includes("ฮาลาล")) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
  return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
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

interface TripCard {
  tourId: string;
  periodId: string;
  tourName: string;
  startDate: string;
  endDate: string;
  quota: number;
  rows: ManifestRow[];
  daysToDepart: number;
  monthKey: string; // "2026-09"
}

// ── Excel export ──────────────────────────────────────────────────────────────

function exportExcel(trip: TripCard) {
  const headers = [
    "#", "ชื่อลูกค้า", "ชื่อ Passport", "เบอร์โทร", "ติดต่อฉุกเฉิน",
    "จำนวน", "ประเภทห้อง", "คู่นอน", "อาหาร",
    "มัดจำ (฿)", "วันมัดจำ", "ชำระสุดท้าย",
    "ราคา (฿)", "ส่วนลด (฿)", "สุทธิ (฿)",
    "เพิ่มโดย", "หมายเหตุพิเศษ",
  ];
  const data = trip.rows.map(r => [
    r.seq, r.name, r.passportName, r.phone, r.emergencyContact,
    r.pax, r.roomType, r.roomPartner, r.foodPref,
    r.depositAmount ?? "", r.depositDate ?? "", r.balanceDueDate ?? "",
    r.quotedPrice, r.discount ?? "", r.totalNet,
    r.addedBy, r.specialRequests || r.note,
  ]);

  // Summary footer
  const totalPax  = trip.rows.reduce((s, r) => s + r.pax, 0);
  const totalNet  = trip.rows.reduce((s, r) => s + r.totalNet, 0);
  const totalDisc = trip.rows.reduce((s, r) => s + (r.discount ?? 0), 0);
  const totalGross= trip.rows.reduce((s, r) => s + r.quotedPrice, 0);
  data.push(["รวม", "", "", "", "", totalPax, "", "", "", "", "", "", totalGross, totalDisc, totalNet, "", ""]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  // Column widths
  ws["!cols"] = [4,22,22,14,16,6,10,14,12,10,12,12,10,10,10,14,24].map(w => ({ wch: w }));
  // Style header row bold (basic)
  headers.forEach((_, i) => {
    const cell = XLSX.utils.encode_cell({ r: 0, c: i });
    if (!ws[cell]) return;
    ws[cell].s = { font: { bold: true }, fill: { fgColor: { rgb: "DBEAFE" } } };
  });

  const wb = XLSX.utils.book_new();
  const sheetName = `${trip.tourName.slice(0,20)} ${fmtDate(trip.startDate)}`.replace(/[/\\?*[\]]/g, "-");
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));

  // Info sheet
  const infoData = [
    ["โปรแกรมทัวร์", trip.tourName],
    ["วันเดินทาง", `${fmtDate(trip.startDate)} – ${fmtDate(trip.endDate)}`],
    ["จำนวนผู้โดยสาร", `${totalPax} / ${trip.quota} คน`],
    ["ยอดรวมสุทธิ", totalNet],
    ["ส่วนลดรวม", totalDisc],
    ["วันที่พิมพ์", new Date().toLocaleDateString("th-TH")],
  ];
  const wsInfo = XLSX.utils.aoa_to_sheet(infoData);
  wsInfo["!cols"] = [{ wch: 18 }, { wch: 35 }];
  XLSX.utils.book_append_sheet(wb, wsInfo, "ข้อมูลทริป");

  XLSX.writeFile(wb, `TripManifest_${trip.tourName.slice(0,15)}_${trip.startDate?.slice(0,10) ?? "x"}.xlsx`);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TripManifest() {
  const leads    = useCRM((s) => s.leads);
  const customers = useCRM((s) => s.customers);
  const tours    = useServices((s) => s.tours);
  const bookings = useBookingLedger((s) => s.bookings);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedMonth, setSelectedMonth] = useState<string>(""); // "2026-09" or ""
  const [search, setSearch] = useState("");
  const [showPast, setShowPast] = useState(false);

  // ── Build all trip cards ───────────────────────────────────────────────────
  const allTrips = useMemo<TripCard[]>(() => {
    const result: TripCard[] = [];

    for (const tour of tours) {
      if (tour.archived) continue;
      for (const period of tour.periods ?? []) {
        if (period.archived) continue;

        const tourName = tour.title || tour.country || tour.code || "–";
        const days = daysUntil(period.start_date);
        const monthKey = period.start_date?.slice(0, 7) ?? "";

        // Collect leads
        const bookedLeads = leads.filter((l) => {
          if (l.status !== "จองแล้ว") return false;
          if (l.tour_id && l.period_id)
            return l.tour_id === tour.id && l.period_id === period.period_id;
          return (
            tourName && l.program === tourName &&
            monthKey && l.travel_month === monthKey
          );
        });

        // Collect anon bookings
        const anonBookings = bookings.filter(
          (b) => b.tour_id === tour.id && b.period_id === period.period_id &&
                 b.status === "active" && !b.lead_id
        );

        // Only include periods with at least 1 booking OR upcoming
        if (bookedLeads.length === 0 && anonBookings.length === 0) continue;

        let seq = 1;
        const rows: ManifestRow[] = [];

        for (const l of bookedLeads) {
          const cust = customers.find((c) => c.id === l.customer_id);
          const quoted = l.quoted_price ?? 0;
          const disc   = (l as Record<string, unknown>).discount as number | null ?? null;
          rows.push({
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
            totalNet:        quoted - (disc ?? 0),
            addedBy:         l.assigned_to ?? "–",
            emergencyContact:(l as Record<string, unknown>).emergency_contact as string ?? "",
            specialRequests: (l as Record<string, unknown>).special_requests as string ?? "",
            note:            l.notes ?? "",
            source:          "lead",
          });
        }

        for (const b of anonBookings) {
          rows.push({
            seq: seq++,
            key: `booking-${b.id}`,
            name:            b.customer_name ?? "(ไม่ระบุชื่อ)",
            passportName:    "",
            phone:           b.customer_phone ?? "",
            pax:             b.seats,
            roomType:        "", roomPartner:     "", foodPref: "",
            depositAmount:   null, depositDate: null, balanceDueDate: null,
            quotedPrice:     (b.price_per_seat ?? 0) * b.seats,
            discount:        null,
            totalNet:        (b.price_per_seat ?? 0) * b.seats,
            addedBy:         b.booked_by ?? "–",
            emergencyContact:"", specialRequests: "", note: b.notes ?? "",
            source:          "booking",
          });
        }

        result.push({
          tourId: tour.id,
          periodId: period.period_id,
          tourName,
          startDate: period.start_date ?? "",
          endDate:   period.end_date ?? "",
          quota:     period.quota ?? 0,
          rows,
          daysToDepart: days,
          monthKey,
        });
      }
    }

    return result.sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [leads, customers, bookings, tours]);

  // ── Month options ──────────────────────────────────────────────────────────
  const monthOptions = useMemo(() => {
    const months = [...new Set(allTrips.map(t => t.monthKey))].sort();
    return months;
  }, [allTrips]);

  // ── Filtered trips ─────────────────────────────────────────────────────────
  const filteredTrips = useMemo(() => {
    let list = allTrips;
    if (!showPast) list = list.filter(t => t.daysToDepart >= 0);
    if (selectedMonth) list = list.filter(t => t.monthKey === selectedMonth);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(t =>
        t.tourName.toLowerCase().includes(q) ||
        t.rows.some(r => r.name.toLowerCase().includes(q) || r.phone.includes(q))
      );
    }
    return list;
  }, [allTrips, selectedMonth, search, showPast]);

  // ── Summary stats ──────────────────────────────────────────────────────────
  const totalPaxAll = filteredTrips.reduce((s, t) => s + t.rows.reduce((ss, r) => ss + r.pax, 0), 0);
  const upcomingCount = filteredTrips.filter(t => t.daysToDepart >= 0).length;

  function toggleExpand(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function expandAll() {
    setExpandedIds(new Set(filteredTrips.map(t => `${t.tourId}-${t.periodId}`)));
  }

  function collapseAll() {
    setExpandedIds(new Set());
  }

  const thMonth = (ym: string) => {
    const [y, m] = ym.split("-");
    const d = new Date(Number(y), Number(m) - 1, 1);
    return d.toLocaleDateString("th-TH", { month: "short", year: "2-digit" });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 p-4 sm:p-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">🛂 Trip Manifest</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            รายชื่อผู้โดยสารทุกทริปที่กำลังจะเดินทาง — คลิก Trip เพื่อดูรายละเอียด
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button variant="ghost" size="sm" onClick={expandAll}>펼치기 ทั้งหมด</Button>
          <Button variant="ghost" size="sm" onClick={collapseAll}>ย่อทั้งหมด</Button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3 print:hidden">
        <div className="border rounded-lg p-3 text-center bg-muted/30">
          <p className="text-lg font-bold text-primary">{upcomingCount}</p>
          <p className="text-xs text-muted-foreground">ทริปที่กำลังจะมาถึง</p>
        </div>
        <div className="border rounded-lg p-3 text-center bg-muted/30">
          <p className="text-lg font-bold text-emerald-600">{totalPaxAll}</p>
          <p className="text-xs text-muted-foreground">ผู้โดยสารทั้งหมด</p>
        </div>
        <div className="border rounded-lg p-3 text-center bg-muted/30">
          <p className="text-lg font-bold text-orange-500">{filteredTrips.filter(t => t.daysToDepart <= 7 && t.daysToDepart >= 0).length}</p>
          <p className="text-xs text-muted-foreground">ออกใน 7 วัน</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 items-center print:hidden">
        {/* Search */}
        <input
          type="text"
          placeholder="🔍 ค้นหาชื่อทริป / ชื่อลูกค้า / เบอร์..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border rounded-md px-3 py-1.5 text-sm bg-background min-w-[220px] flex-1"
        />
        {/* Month chips */}
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setSelectedMonth("")}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              selectedMonth === "" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
            }`}
          >ทุกเดือน</button>
          {monthOptions.map(ym => (
            <button
              key={ym}
              onClick={() => setSelectedMonth(ym === selectedMonth ? "" : ym)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                selectedMonth === ym ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
              }`}
            >{thMonth(ym)}</button>
          ))}
        </div>
        {/* Show past toggle */}
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
          <input type="checkbox" checked={showPast} onChange={e => setShowPast(e.target.checked)} className="rounded" />
          แสดงทริปที่ผ่านแล้ว
        </label>
      </div>

      {/* Empty state */}
      {filteredTrips.length === 0 && (
        <div className="text-center py-20 text-muted-foreground text-sm space-y-2">
          <p className="text-3xl">🗓️</p>
          <p>ไม่พบทริปที่มีการจอง</p>
          {!showPast && <p className="text-xs">ลองเปิด "แสดงทริปที่ผ่านแล้ว" ด้วย</p>}
        </div>
      )}

      {/* Trip cards */}
      <div className="space-y-3">
        {filteredTrips.map(trip => {
          const cardId = `${trip.tourId}-${trip.periodId}`;
          const isOpen = expandedIds.has(cardId);
          const badge = urgencyBadge(trip.daysToDepart);
          const colorCls = urgencyColor(trip.daysToDepart);
          const pax = trip.rows.reduce((s, r) => s + r.pax, 0);
          const net = trip.rows.reduce((s, r) => s + r.totalNet, 0);

          return (
            <div key={cardId} className={`border-l-4 rounded-lg border overflow-hidden ${colorCls}`}>
              {/* Card header — always visible */}
              <button
                className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                onClick={() => toggleExpand(cardId)}
              >
                {/* Expand chevron */}
                <span className="text-muted-foreground text-lg leading-none">{isOpen ? "▾" : "▸"}</span>

                {/* Tour info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{trip.tourName}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    📅 {fmtDate(trip.startDate)}{trip.endDate ? ` – ${fmtDate(trip.endDate)}` : ""}
                    &nbsp;|&nbsp;
                    👥 {pax} / {trip.quota} คน
                    &nbsp;|&nbsp;
                    💰 ฿{fmtMoney(net)}
                  </div>
                  {/* Mini name preview */}
                  {!isOpen && trip.rows.length > 0 && (
                    <div className="text-xs text-muted-foreground/70 mt-1 truncate">
                      {trip.rows.slice(0, 4).map(r => r.name).join(", ")}
                      {trip.rows.length > 4 ? ` +${trip.rows.length - 4} คน` : ""}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 print:hidden shrink-0" onClick={e => e.stopPropagation()}>
                  <button
                    title="Export Excel"
                    onClick={() => exportExcel(trip)}
                    className="px-2 py-1 text-xs rounded border bg-background hover:bg-emerald-50 dark:hover:bg-emerald-950 border-emerald-400 text-emerald-700 dark:text-emerald-300 font-medium transition-colors"
                  >📥 Excel</button>
                  <button
                    title="Print"
                    onClick={() => window.print()}
                    className="px-2 py-1 text-xs rounded border bg-background hover:bg-muted font-medium transition-colors"
                  >🖨️</button>
                </div>
              </button>

              {/* Expanded table */}
              {isOpen && (
                <div className="border-t overflow-x-auto bg-background dark:bg-background/60">
                  {trip.rows.length === 0 ? (
                    <p className="text-center py-6 text-sm text-muted-foreground">ยังไม่มีรายชื่อใน Period นี้</p>
                  ) : (
                    <>
                      <table className="min-w-full text-xs">
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
                            <th className="px-2 py-2 font-semibold">หมายเหตุ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {trip.rows.map((r, i) => (
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
                        <tfoot>
                          <tr className="border-t-2 bg-muted/50 font-semibold">
                            <td colSpan={5} className="px-2 py-2 text-right text-muted-foreground text-xs">รวม</td>
                            <td className="px-2 py-2 text-center">{pax}</td>
                            <td colSpan={7} />
                            <td className="px-2 py-2 text-right">{fmtMoney(trip.rows.reduce((s,r)=>s+r.quotedPrice,0))}</td>
                            <td className="px-2 py-2 text-right text-orange-600">
                              {trip.rows.some(r => r.discount) ? `-${fmtMoney(trip.rows.reduce((s,r)=>s+(r.discount??0),0))}` : "–"}
                            </td>
                            <td className="px-2 py-2 text-right text-emerald-700 dark:text-emerald-400">{fmtMoney(net)}</td>
                            <td colSpan={2} />
                          </tr>
                        </tfoot>
                      </table>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
