/**
 * TripManifest.tsx  v5 — Flat traveler rows
 *
 * Group booking (pax > 1) → แตกเป็น N แถวในตารางทันที
 * ไม่ต้องคลิกดูใน side panel เพื่อดูรายชื่อ
 * คลิกแถวใดก็เปิด panel แก้ไขข้อมูลผู้เดินทางคนนั้น
 */

import { useState, useMemo } from "react";
import { X, Settings2, ChevronDown, ChevronUp, Save, Crown } from "lucide-react";
import { useCRM } from "@/store/crmStore";
import { useServices } from "@/store/serviceStore";
import { useBookingLedger } from "@/store/bookingLedgerStore";
import type { Traveler } from "@/store/bookingLedgerStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import * as XLSX from "xlsx";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso?: string | null) {
  if (!iso) return "–";
  try {
    return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
  } catch { return iso; }
}
function fmtMoney(n?: number | null) {
  if (!n && n !== 0) return "–";
  return n.toLocaleString("th-TH", { maximumFractionDigits: 0 });
}
function daysUntil(iso?: string | null): number {
  if (!iso) return 9999;
  return Math.ceil((new Date(iso).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000);
}
function urgencyColor(days: number) {
  if (days < 0)   return "border-l-gray-300 bg-gray-50 dark:bg-gray-900/30";
  if (days <= 7)  return "border-l-red-500 bg-red-50 dark:bg-red-950/30";
  if (days <= 14) return "border-l-orange-400 bg-orange-50 dark:bg-orange-950/30";
  if (days <= 30) return "border-l-yellow-400 bg-yellow-50 dark:bg-yellow-950/20";
  return "border-l-blue-400 bg-blue-50 dark:bg-blue-950/20";
}
function urgencyBadge(days: number) {
  if (days < 0)   return { label: "ผ่านแล้ว", cls: "bg-gray-200 text-gray-600" };
  if (days === 0) return { label: "วันนี้!", cls: "bg-red-600 text-white animate-pulse" };
  if (days <= 7)  return { label: `${days} วัน`, cls: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200" };
  if (days <= 14) return { label: `${days} วัน`, cls: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200" };
  if (days <= 30) return { label: `${days} วัน`, cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200" };
  return { label: `${days} วัน`, cls: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200" };
}
function foodColor(pref: string) {
  if (!pref || pref === "ปกติ") return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  if (pref.includes("มังสวิรัติ")) return "bg-green-100 text-green-800";
  if (pref.includes("ฮาลาล"))    return "bg-yellow-100 text-yellow-800";
  return "bg-orange-100 text-orange-800";
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ManifestRow {
  // identity
  key: string;
  displaySeq: string;       // "1", "2", "2-2", "2-3" ...
  leadId: string | null;
  bookingId: string | null;
  travelerIndex: number | null;  // null = lead row or single-pax booking
  isGroupLeader: boolean;        // first row of a multi-pax group
  groupKey: string | null;       // bookingId shared across group sub-rows
  groupSize: number;             // total pax in group (1 = not a group)
  source: "lead" | "booking";
  // traveler info
  name: string;
  passportName: string;
  phone: string;
  roomType: string;
  roomPartner: string;
  foodPref: string;
  emergencyContact: string;
  specialRequests: string;
  note: string;
  // booking-level (shown only on leader row for groups)
  pax: number;               // 1 for sub-rows, N for single rows
  depositAmount: number | null;
  depositDate: string | null;
  balanceDueDate: string | null;
  quotedPrice: number;
  discount: number | null;
  totalNet: number;
  addedBy: string;
  // store for slide-over
  allTravelers: Traveler[];  // full travelers array of the booking (for editing)
}

interface TripCard {
  tourId: string; periodId: string;
  tourName: string; startDate: string; endDate: string;
  quota: number; rows: ManifestRow[];
  daysToDepart: number; monthKey: string;
}

// ── Row status ────────────────────────────────────────────────────────────────

type RowStatus = "complete" | "partial" | "anon";
function getRowStatus(r: ManifestRow): RowStatus {
  if (r.source === "booking") {
    if (!r.name || r.name.startsWith("(")) return "anon";
    return "partial";
  }
  if (r.passportName && r.depositAmount != null && r.roomType) return "complete";
  return "partial";
}
const STATUS_BAR: Record<RowStatus, string> = {
  complete: "bg-emerald-500", partial: "bg-amber-400", anon: "bg-red-500",
};

// ── Columns ───────────────────────────────────────────────────────────────────

const COL_DEFS = [
  { id: "passport",    label: "ชื่อ Passport" },
  { id: "emergency",   label: "ฉุกเฉิน"      },
  { id: "room",        label: "ห้อง"          },
  { id: "partner",     label: "คู่นอน"        },
  { id: "food",        label: "อาหาร"         },
  { id: "deposit",     label: "มัดจำ"         },
  { id: "depositDate", label: "วันมัดจำ"      },
  { id: "balanceDate", label: "ชำระสุดท้าย"   },
  { id: "price",       label: "ราคา"          },
  { id: "discount",    label: "ส่วนลด"        },
  { id: "remarks",     label: "หมายเหตุ"      },
] as const;
type ColId = typeof COL_DEFS[number]["id"];
const DEFAULT_HIDDEN: ColId[] = ["emergency", "partner", "price", "discount"];

// ── Excel ─────────────────────────────────────────────────────────────────────

function exportExcel(trip: TripCard) {
  const hdrs = ["#", "ชื่อผู้เดินทาง", "ชื่อ Passport", "เบอร์", "ห้อง", "อาหาร", "มัดจำ (฿)", "ชำระสุดท้าย", "สุทธิ (฿)", "เพิ่มโดย", "หมายเหตุ"];
  const data = trip.rows.map(r => [r.displaySeq, r.name, r.passportName, r.phone, r.roomType, r.foodPref,
    r.depositAmount ?? "", r.balanceDueDate ?? "", r.isGroupLeader || r.groupSize === 1 ? r.totalNet : "",
    r.isGroupLeader || r.groupSize === 1 ? r.addedBy : "", r.note]);
  const totalPax = trip.rows.filter(r => r.isGroupLeader || r.groupSize === 1).reduce((s, r) => s + r.pax, 0);
  const totalNet = trip.rows.filter(r => r.isGroupLeader || r.groupSize === 1).reduce((s, r) => s + r.totalNet, 0);
  data.push(["รวม", "", "", "", "", "", "", "", totalNet, "", ""]);
  const ws = XLSX.utils.aoa_to_sheet([hdrs, ...data]);
  ws["!cols"] = [4,24,22,14,8,10,10,12,10,14,24].map(w => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, trip.tourName.slice(0,31).replace(/[/\\?*[\]]/g,"-"));
  XLSX.writeFile(wb, `TripManifest_${trip.tourName.slice(0,15)}_${trip.startDate?.slice(0,10) ?? "x"}.xlsx`);
  void totalPax;
}

// ── Edit Panels ───────────────────────────────────────────────────────────────

const ROOM_TYPES  = ["", "TWN", "SGL", "DBL", "TRP"] as const;
const FOOD_PRESETS = ["ปกติ", "มังสวิรัติ", "ฮาลาล", "อื่นๆ"] as const;

const inputCls = "w-full px-2.5 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/40";
const labelCls = "block text-[11px] font-medium text-muted-foreground mb-1";

/** Panel สำหรับ Lead row (แก้ไขทุกอย่าง) */
interface LeadForm {
  name: string; phone: string; passportName: string;
  roomType: string; roomPartner: string; foodPref: string;
  depositAmount: string; depositDate: string; balanceDueDate: string;
  emergencyContact: string; note: string;
}
function LeadEditPanel({ row, onClose, onSave }: { row: ManifestRow; onClose: () => void; onSave: (r: ManifestRow, f: LeadForm) => Promise<void> }) {
  const [form, setForm] = useState<LeadForm>({
    name: row.name, phone: row.phone, passportName: row.passportName,
    roomType: row.roomType, roomPartner: row.roomPartner, foodPref: row.foodPref || "ปกติ",
    depositAmount: row.depositAmount != null ? String(row.depositAmount) : "",
    depositDate: row.depositDate ?? "", balanceDueDate: row.balanceDueDate ?? "",
    emergencyContact: row.emergencyContact, note: row.specialRequests || row.note,
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof LeadForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-background border-l border-border z-50 flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div><h2 className="font-bold text-base">แก้ไขข้อมูล</h2><p className="text-xs text-muted-foreground">แถว {row.displaySeq}</p></div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>ชื่อลูกค้า</label><input value={form.name} onChange={set("name")} className={inputCls} /></div>
            <div><label className={labelCls}>เบอร์โทร</label><input value={form.phone} onChange={set("phone")} className={inputCls} /></div>
          </div>
          <div><label className={labelCls}>ชื่อ Passport</label><input value={form.passportName} onChange={set("passportName")} className={inputCls} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>ห้อง</label>
              <select value={form.roomType} onChange={set("roomType")} className={inputCls}>
                {ROOM_TYPES.map(t => <option key={t} value={t}>{t || "– ไม่ระบุ –"}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>คู่นอน</label><input value={form.roomPartner} onChange={set("roomPartner")} className={inputCls} /></div>
          </div>
          <div><label className={labelCls}>อาหาร</label>
            <select value={form.foodPref} onChange={set("foodPref")} className={inputCls}>
              {FOOD_PRESETS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>มัดจำ (฿)</label><input type="number" value={form.depositAmount} onChange={set("depositAmount")} className={inputCls} /></div>
            <div><label className={labelCls}>วันมัดจำ</label><input type="date" value={form.depositDate} onChange={set("depositDate")} className={inputCls} /></div>
          </div>
          <div><label className={labelCls}>ชำระสุดท้าย</label><input type="date" value={form.balanceDueDate} onChange={set("balanceDueDate")} className={inputCls} /></div>
          <div><label className={labelCls}>ติดต่อฉุกเฉิน</label><input value={form.emergencyContact} onChange={set("emergencyContact")} className={inputCls} /></div>
          <div><label className={labelCls}>หมายเหตุ</label><textarea value={form.note} onChange={set("note")} rows={3} className={`${inputCls} resize-none`} /></div>
        </div>
        <div className="px-5 py-4 border-t flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 text-sm bg-muted hover:bg-muted/80 rounded-lg">ยกเลิก</button>
          <button onClick={async () => { setSaving(true); await onSave(row, form); setSaving(false); onClose(); }} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg disabled:opacity-50">
            <Save className="w-4 h-4" />{saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>
    </>
  );
}

/** Panel สำหรับ traveler คนเดียวในกลุ่ม */
interface TravelerForm {
  name: string; phone: string; passport_name: string;
  room_type: string; room_partner: string; food_pref: string;
}
function TravelerEditPanel({ row, onClose, onSave }: { row: ManifestRow; onClose: () => void; onSave: (r: ManifestRow, f: TravelerForm) => Promise<void> }) {
  const ti = row.travelerIndex ?? 0;
  const existing = row.allTravelers[ti];
  const [form, setForm] = useState<TravelerForm>({
    name: existing?.name ?? row.name.startsWith("(") ? "" : row.name,
    phone: existing?.phone ?? row.phone,
    passport_name: existing?.passport_name ?? "",
    room_type: existing?.room_type ?? "",
    room_partner: existing?.room_partner ?? "",
    food_pref: existing?.food_pref ?? "ปกติ",
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof TravelerForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));
  const label = ti === 0 ? "หัวหน้ากลุ่ม" : `ผู้เดินทางคนที่ ${ti + 1}`;
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-background border-l border-border z-50 flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h2 className="font-bold text-base">{label}</h2>
            <p className="text-xs text-muted-foreground">กลุ่ม {row.groupSize} คน</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>ชื่อ-นามสกุล</label><input value={form.name} onChange={set("name")} placeholder="ชื่อ" className={inputCls} /></div>
            <div><label className={labelCls}>เบอร์โทร</label><input value={form.phone} onChange={set("phone")} placeholder="08x-xxx" className={inputCls} /></div>
          </div>
          <div><label className={labelCls}>ชื่อ Passport</label><input value={form.passport_name} onChange={set("passport_name")} placeholder="ตามพาสปอร์ต" className={inputCls} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>ห้อง</label>
              <select value={form.room_type} onChange={set("room_type")} className={inputCls}>
                {ROOM_TYPES.map(t => <option key={t} value={t}>{t || "– ไม่ระบุ –"}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>คู่นอน</label><input value={form.room_partner} onChange={set("room_partner")} className={inputCls} /></div>
          </div>
          <div><label className={labelCls}>อาหาร</label>
            <select value={form.food_pref} onChange={set("food_pref")} className={inputCls}>
              {FOOD_PRESETS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>
        <div className="px-5 py-4 border-t flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 text-sm bg-muted hover:bg-muted/80 rounded-lg">ยกเลิก</button>
          <button onClick={async () => { setSaving(true); await onSave(row, form); setSaving(false); onClose(); }} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg disabled:opacity-50">
            <Save className="w-4 h-4" />{saving ? "บันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function TripManifest() {
  const leads         = useCRM((s) => s.leads);
  const customers     = useCRM((s) => s.customers);
  const updateLead    = useCRM((s) => s.updateLead);
  const tours         = useServices((s) => s.tours);
  const bookings      = useBookingLedger((s) => s.bookings);
  const updateBooking  = useBookingLedger((s) => s.updateBooking);
  const updateTravelers = useBookingLedger((s) => s.updateTravelers);

  const [expandedIds, setExpandedIds]     = useState<Set<string>>(new Set());
  const [selectedMonth, setSelectedMonth] = useState("");
  const [search, setSearch]               = useState("");
  const [showPast, setShowPast]           = useState(false);
  const [editRow, setEditRow]             = useState<ManifestRow | null>(null);
  const [hiddenCols, setHiddenCols]       = useState<Set<ColId>>(new Set(DEFAULT_HIDDEN));
  const [showColMenu, setShowColMenu]     = useState(false);

  // ── Build trips ────────────────────────────────────────────────────────────
  const allTrips = useMemo<TripCard[]>(() => {
    const result: TripCard[] = [];
    for (const tour of tours) {
      if (tour.archived) continue;
      for (const period of tour.periods ?? []) {
        if (period.archived) continue;
        const tourName = tour.title || tour.country || tour.code || "–";
        const days = daysUntil(period.start_date);
        const monthKey = period.start_date?.slice(0, 7) ?? "";

        const bookedLeads = leads.filter((l) => {
          if (l.status !== "จองแล้ว") return false;
          if (l.tour_id && l.period_id) return l.tour_id === tour.id && l.period_id === period.period_id;
          return tourName && l.program === tourName && monthKey && l.travel_month === monthKey;
        });
        const anonBookings = bookings.filter(
          (b) => b.tour_id === tour.id && b.period_id === period.period_id && b.status === "active" && !b.lead_id
        );
        if (bookedLeads.length === 0 && anonBookings.length === 0) continue;

        let mainSeq = 1;
        const rows: ManifestRow[] = [];

        // Lead rows (1 lead = 1 row)
        for (const l of bookedLeads) {
          const cust   = customers.find((c) => c.id === l.customer_id);
          const quoted = l.quoted_price ?? 0;
          const disc   = (l as Record<string, unknown>).discount as number | null ?? null;
          rows.push({
            key: `lead-${l.id}`, displaySeq: String(mainSeq++),
            leadId: l.id, bookingId: null,
            travelerIndex: null, isGroupLeader: false, groupKey: null, groupSize: 1,
            source: "lead",
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
            quotedPrice:     quoted, discount: disc, totalNet: quoted - (disc ?? 0),
            addedBy:         l.assigned_to ?? "–",
            emergencyContact:(l as Record<string, unknown>).emergency_contact as string ?? "",
            specialRequests: (l as Record<string, unknown>).special_requests as string ?? "",
            note:            l.notes ?? "",
            allTravelers:    [],
          });
        }

        // Booking rows — expand pax > 1 into sub-rows
        for (const b of anonBookings) {
          const travelers: Traveler[] = b.travelers ?? [];
          const totalNet = (b.price_per_seat ?? 0) * b.seats;

          if (b.seats === 1) {
            // Single-pax booking → 1 row
            const t = travelers[0];
            rows.push({
              key: `booking-${b.id}-0`, displaySeq: String(mainSeq++),
              leadId: null, bookingId: b.id,
              travelerIndex: 0, isGroupLeader: false, groupKey: null, groupSize: 1,
              source: "booking",
              name:           t?.name || b.customer_name || "(ไม่ระบุชื่อ)",
              passportName:   t?.passport_name ?? "",
              phone:          t?.phone || b.customer_phone || "",
              pax: 1, roomType: t?.room_type ?? "", roomPartner: t?.room_partner ?? "",
              foodPref: t?.food_pref ?? "",
              depositAmount: null, depositDate: null, balanceDueDate: null,
              quotedPrice: totalNet, discount: null, totalNet,
              addedBy: b.booked_by ?? "–",
              emergencyContact: "", specialRequests: "", note: b.notes ?? "",
              allTravelers: travelers,
            });
          } else {
            // Multi-pax → N sub-rows
            const groupSeq = mainSeq++;
            for (let ti = 0; ti < b.seats; ti++) {
              const t = travelers[ti];
              const isLeader = ti === 0;
              rows.push({
                key: `booking-${b.id}-${ti}`,
                displaySeq: isLeader ? String(groupSeq) : `${groupSeq}-${ti + 1}`,
                leadId: null, bookingId: b.id,
                travelerIndex: ti, isGroupLeader: isLeader,
                groupKey: b.id, groupSize: b.seats,
                source: "booking",
                name:           t?.name || (isLeader ? (b.customer_name || "(ยังไม่ระบุ)") : "(ยังไม่ระบุ)"),
                passportName:   t?.passport_name ?? "",
                phone:          t?.phone ?? (isLeader ? (b.customer_phone ?? "") : ""),
                pax:            isLeader ? b.seats : 1,
                roomType:       t?.room_type ?? "",
                roomPartner:    t?.room_partner ?? "",
                foodPref:       t?.food_pref ?? "",
                // financial info only on leader row
                depositAmount:  isLeader ? null : null,
                depositDate:    null, balanceDueDate: null,
                quotedPrice:    isLeader ? totalNet : 0,
                discount:       null,
                totalNet:       isLeader ? totalNet : 0,
                addedBy:        isLeader ? (b.booked_by ?? "–") : "",
                emergencyContact: "", specialRequests: "", note: isLeader ? (b.notes ?? "") : "",
                allTravelers:   travelers,
              });
            }
          }
        }

        result.push({
          tourId: tour.id, periodId: period.period_id,
          tourName, startDate: period.start_date ?? "", endDate: period.end_date ?? "",
          quota: period.quota ?? 0, rows, daysToDepart: days, monthKey,
        });
      }
    }
    return result.sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [leads, customers, bookings, tours]);

  const monthOptions  = useMemo(() => [...new Set(allTrips.map(t => t.monthKey))].sort(), [allTrips]);
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

  // Summary counts (count by unique booking/lead, not sub-rows)
  const totalPaxAll   = filteredTrips.reduce((s, t) =>
    s + t.rows.filter(r => r.isGroupLeader || r.groupSize === 1).reduce((ss, r) => ss + r.pax, 0), 0);
  const upcomingCount = filteredTrips.filter(t => t.daysToDepart >= 0).length;

  function toggleExpand(id: string) {
    setExpandedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function expandAll()   { setExpandedIds(new Set(filteredTrips.map(t => `${t.tourId}-${t.periodId}`))); }
  function collapseAll() { setExpandedIds(new Set()); }
  const thMonth = (ym: string) => {
    const [y, m] = ym.split("-");
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("th-TH", { month: "short", year: "2-digit" });
  };
  const show = (id: ColId) => !hiddenCols.has(id);
  const toggleCol = (id: ColId) => setHiddenCols(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // ── Save handlers ──────────────────────────────────────────────────────────
  const handleLeadSave = async (row: ManifestRow, form: LeadForm) => {
    try {
      await updateLead(row.leadId!, {
        passport_name: form.passportName || undefined, room_type: form.roomType || undefined,
        room_partner: form.roomPartner || undefined, food_pref: form.foodPref !== "ปกติ" ? form.foodPref : undefined,
        deposit_amount: form.depositAmount ? Number(form.depositAmount) : null,
        deposit_date: form.depositDate || null, balance_due_date: form.balanceDueDate || null,
        emergency_contact: form.emergencyContact || undefined, notes: form.note || undefined,
      } as Parameters<typeof updateLead>[1]);
      toast.success("บันทึกสำเร็จ");
    } catch { toast.error("บันทึกไม่สำเร็จ"); }
  };

  const handleTravelerSave = async (row: ManifestRow, form: TravelerForm) => {
    if (!row.bookingId) return;
    try {
      const ti = row.travelerIndex ?? 0;
      const existing: Traveler[] = [...row.allTravelers];
      while (existing.length <= ti) existing.push({ seq: existing.length + 1, name: "", passport_name: "", phone: "", food_pref: "ปกติ", room_type: "", room_partner: "", is_leader: existing.length === 0 });
      existing[ti] = { seq: ti + 1, is_leader: ti === 0, ...form };
      await updateTravelers(row.bookingId, existing);
      // also update single-pax booking customer_name
      if (row.groupSize === 1 && ti === 0) {
        await updateBooking(row.bookingId, { customer_name: form.name || null, customer_phone: form.phone || null });
      }
      toast.success("บันทึกสำเร็จ");
    } catch { toast.error("บันทึกไม่สำเร็จ"); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 p-4 sm:p-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">🛂 Trip Manifest</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            🟢 ครบ · 🟡 ขาดข้อมูล · 🔴 ยังไม่ระบุชื่อ &nbsp;|&nbsp; กลุ่มจะแตกแถวทุกคนให้อัตโนมัติ
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={expandAll}>펼치기 ทั้งหมด</Button>
          <Button variant="ghost" size="sm" onClick={collapseAll}>ย่อทั้งหมด</Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 print:hidden">
        {[
          { val: upcomingCount, label: "ทริปที่กำลังจะมาถึง", cls: "text-primary" },
          { val: totalPaxAll,   label: "ผู้โดยสารทั้งหมด",   cls: "text-emerald-600" },
          { val: filteredTrips.filter(t => t.daysToDepart >= 0 && t.daysToDepart <= 7).length, label: "ออกใน 7 วัน", cls: "text-orange-500" },
        ].map(({ val, label, cls }) => (
          <div key={label} className="border rounded-lg p-3 text-center bg-muted/30">
            <p className={`text-lg font-bold ${cls}`}>{val}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 items-center print:hidden">
        <input type="text" placeholder="🔍 ค้นหาชื่อทริป / ชื่อ / เบอร์..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="border rounded-md px-3 py-1.5 text-sm bg-background min-w-[200px] flex-1" />
        <div className="flex gap-1 flex-wrap">
          <button onClick={() => setSelectedMonth("")}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${selectedMonth === "" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>
            ทุกเดือน
          </button>
          {monthOptions.map(ym => (
            <button key={ym} onClick={() => setSelectedMonth(ym === selectedMonth ? "" : ym)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${selectedMonth === ym ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>
              {thMonth(ym)}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
          <input type="checkbox" checked={showPast} onChange={e => setShowPast(e.target.checked)} className="rounded" />
          แสดงทริปที่ผ่านแล้ว
        </label>
        {/* Column toggle */}
        <div className="relative">
          <button onClick={() => setShowColMenu(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-md hover:bg-muted transition-colors">
            <Settings2 className="w-3.5 h-3.5" />คอลัมน์{showColMenu ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {showColMenu && (
            <div className="absolute right-0 top-full mt-1 z-30 bg-background border border-border rounded-lg shadow-lg p-3 min-w-[180px]">
              <p className="text-[10px] font-semibold text-muted-foreground mb-2">แสดง/ซ่อนคอลัมน์</p>
              {COL_DEFS.map(col => (
                <label key={col.id} className="flex items-center gap-2 py-1 cursor-pointer text-sm">
                  <input type="checkbox" checked={show(col.id)} onChange={() => toggleCol(col.id)} className="rounded" />{col.label}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {filteredTrips.length === 0 && (
        <div className="text-center py-20 text-muted-foreground text-sm space-y-2">
          <p className="text-3xl">🗓️</p><p>ไม่พบทริปที่มีการจอง</p>
          {!showPast && <p className="text-xs">ลองเปิด "แสดงทริปที่ผ่านแล้ว"</p>}
        </div>
      )}

      {/* Trip cards */}
      <div className="space-y-3">
        {filteredTrips.map(trip => {
          const cardId = `${trip.tourId}-${trip.periodId}`;
          const isOpen = expandedIds.has(cardId);
          const badge  = urgencyBadge(trip.daysToDepart);
          const colCls = urgencyColor(trip.daysToDepart);
          const pax    = trip.rows.filter(r => r.isGroupLeader || r.groupSize === 1).reduce((s, r) => s + r.pax, 0);
          const net    = trip.rows.filter(r => r.isGroupLeader || r.groupSize === 1).reduce((s, r) => s + r.totalNet, 0);

          // summary counts (per logical booking, not per sub-row)
          const logicalRows = trip.rows.filter(r => r.isGroupLeader || r.groupSize === 1);
          const completeCount = logicalRows.filter(r => getRowStatus(r) === "complete").length;
          const anonCount     = trip.rows.filter(r => getRowStatus(r) === "anon").length;
          const partialCount  = logicalRows.length - completeCount - (trip.rows.filter(r => r.isGroupLeader && getRowStatus(r) === "anon").length);

          return (
            <div key={cardId} className={`border-l-4 rounded-lg border overflow-hidden ${colCls}`}>
              {/* Card header */}
              <button className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                onClick={() => toggleExpand(cardId)}>
                <span className="text-muted-foreground text-lg">{isOpen ? "▾" : "▸"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{trip.tourName}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.cls}`}>{badge.label}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    📅 {fmtDate(trip.startDate)}{trip.endDate ? ` – ${fmtDate(trip.endDate)}` : ""}
                    &nbsp;|&nbsp;👥 {pax} / {trip.quota} คน &nbsp;|&nbsp;💰 ฿{fmtMoney(net)}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {completeCount > 0 && <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 font-medium">✓ ครบ {completeCount}</span>}
                    {partialCount > 0  && <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 font-medium">⚠ ขาดข้อมูล {partialCount}</span>}
                    {anonCount > 0     && <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 font-medium">✗ ไม่ระบุชื่อ {anonCount}</span>}
                  </div>
                </div>
                <div className="flex gap-2 print:hidden shrink-0" onClick={e => e.stopPropagation()}>
                  <button onClick={() => exportExcel(trip)} className="px-2 py-1 text-xs rounded border bg-background hover:bg-emerald-50 dark:hover:bg-emerald-950 border-emerald-400 text-emerald-700 dark:text-emerald-300 font-medium">📥 Excel</button>
                  <button onClick={() => window.print()} className="px-2 py-1 text-xs rounded border bg-background hover:bg-muted font-medium">🖨️</button>
                </div>
              </button>

              {/* Table */}
              {isOpen && (
                <div className="border-t overflow-x-auto bg-background dark:bg-background/60">
                  {trip.rows.length === 0 ? (
                    <p className="text-center py-6 text-sm text-muted-foreground">ยังไม่มีรายชื่อ</p>
                  ) : (
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="bg-muted/60 text-muted-foreground text-left">
                          <th className="w-1" />
                          <th className="px-2 py-2 font-semibold w-10">#</th>
                          <th className="px-2 py-2 font-semibold">ชื่อผู้เดินทาง</th>
                          {show("passport") && <th className="px-2 py-2 font-semibold">ชื่อ Passport</th>}
                          <th className="px-2 py-2 font-semibold">เบอร์</th>
                          {show("emergency") && <th className="px-2 py-2 font-semibold">ฉุกเฉิน</th>}
                          <th className="px-2 py-2 font-semibold text-center">ที่นั่ง</th>
                          {show("room") && <th className="px-2 py-2 font-semibold">ห้อง</th>}
                          {show("partner") && <th className="px-2 py-2 font-semibold">คู่นอน</th>}
                          {show("food") && <th className="px-2 py-2 font-semibold">อาหาร</th>}
                          {show("deposit") && <th className="px-2 py-2 font-semibold text-right">มัดจำ</th>}
                          {show("depositDate") && <th className="px-2 py-2 font-semibold">วันมัดจำ</th>}
                          {show("balanceDate") && <th className="px-2 py-2 font-semibold">ชำระสุดท้าย</th>}
                          {show("price") && <th className="px-2 py-2 font-semibold text-right">ราคา</th>}
                          {show("discount") && <th className="px-2 py-2 font-semibold text-right">ส่วนลด</th>}
                          <th className="px-2 py-2 font-semibold text-right">สุทธิ</th>
                          <th className="px-2 py-2 font-semibold">เพิ่มโดย</th>
                          {show("remarks") && <th className="px-2 py-2 font-semibold">หมายเหตุ</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {trip.rows.map((r, i) => {
                          const status   = getRowStatus(r);
                          const isSub    = r.groupKey !== null && !r.isGroupLeader;
                          const isLeader = r.isGroupLeader;
                          const anon     = !r.name || r.name.startsWith("(");

                          return (
                            <tr key={r.key} onClick={() => setEditRow(r)}
                              className={`border-t cursor-pointer hover:bg-primary/5 transition-colors ${
                                isSub ? "bg-muted/30 dark:bg-muted/10" : i % 2 === 0 ? "bg-background" : "bg-muted/20"
                              }`}
                              title="คลิกเพื่อแก้ไข">

                              {/* Status bar */}
                              <td className="w-1 p-0 align-stretch">
                                <div className={`w-1 h-full min-h-[32px] ${STATUS_BAR[status]}`} />
                              </td>

                              {/* Seq */}
                              <td className={`px-2 py-1.5 ${isSub ? "pl-5 text-muted-foreground/50" : "text-muted-foreground"}`}>
                                {isSub ? `└ ${r.travelerIndex! + 1}` : r.displaySeq}
                              </td>

                              {/* Name */}
                              <td className="px-2 py-1.5 font-medium whitespace-nowrap">
                                <span className="flex items-center gap-1.5">
                                  {isLeader && <Crown className="w-3 h-3 text-amber-500 shrink-0" title="หัวหน้ากลุ่ม" />}
                                  {anon
                                    ? <span className="text-muted-foreground/50 italic text-[11px]">(ยังไม่ระบุ) <span className="text-[9px] text-red-500">+ กรอก</span></span>
                                    : <span className={isSub ? "text-foreground/80" : ""}>{r.name}</span>
                                  }
                                  {isLeader && <Badge variant="outline" className="text-[9px] px-1 py-0 ml-1">กลุ่ม {r.pax} คน</Badge>}
                                </span>
                              </td>

                              {show("passport") && (
                                <td className="px-2 py-1.5 text-muted-foreground">
                                  {r.passportName || <span className="opacity-40">–</span>}
                                </td>
                              )}

                              <td className="px-2 py-1.5">{r.phone || <span className="opacity-40">–</span>}</td>
                              {show("emergency") && <td className="px-2 py-1.5 text-muted-foreground">{r.emergencyContact || <span className="opacity-40">–</span>}</td>}

                              {/* Seats — show only on leader/single row */}
                              <td className="px-2 py-1.5 text-center">
                                {isSub ? <span className="opacity-30">–</span> : <span className="font-medium">{r.pax}</span>}
                              </td>

                              {show("room") && (
                                <td className="px-2 py-1.5">
                                  {r.roomType ? <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{r.roomType}</Badge> : <span className="opacity-40">–</span>}
                                </td>
                              )}
                              {show("partner") && <td className="px-2 py-1.5 text-muted-foreground">{r.roomPartner || <span className="opacity-40">–</span>}</td>}
                              {show("food") && (
                                <td className="px-2 py-1.5">
                                  {r.foodPref ? <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${foodColor(r.foodPref)}`}>{r.foodPref}</span> : <span className="opacity-40">–</span>}
                                </td>
                              )}

                              {/* Financial — only on leader/single */}
                              {show("deposit") && <td className="px-2 py-1.5 text-right">{!isSub && r.depositAmount != null ? fmtMoney(r.depositAmount) : <span className="opacity-40">–</span>}</td>}
                              {show("depositDate") && <td className="px-2 py-1.5 text-muted-foreground">{!isSub ? fmtDate(r.depositDate) : <span className="opacity-40">–</span>}</td>}
                              {show("balanceDate") && <td className="px-2 py-1.5 text-muted-foreground">{!isSub ? fmtDate(r.balanceDueDate) : <span className="opacity-40">–</span>}</td>}
                              {show("price") && <td className="px-2 py-1.5 text-right">{!isSub ? fmtMoney(r.quotedPrice) : <span className="opacity-40">–</span>}</td>}
                              {show("discount") && <td className="px-2 py-1.5 text-right text-orange-600">{!isSub && r.discount ? `-${fmtMoney(r.discount)}` : <span className="opacity-40">–</span>}</td>}
                              <td className="px-2 py-1.5 text-right font-semibold text-emerald-700 dark:text-emerald-400">
                                {!isSub ? fmtMoney(r.totalNet) : <span className="opacity-30">–</span>}
                              </td>
                              <td className="px-2 py-1.5 text-muted-foreground whitespace-nowrap">{r.addedBy || <span className="opacity-40" />}</td>
                              {show("remarks") && <td className="px-2 py-1.5 max-w-[140px] truncate text-muted-foreground">{r.note || <span className="opacity-40">–</span>}</td>}
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 bg-muted/50 font-semibold">
                          <td /><td colSpan={show("passport") ? 3 : 2} className="px-2 py-2 text-right text-muted-foreground text-xs">รวม</td>
                          <td />{show("emergency") && <td />}
                          <td className="px-2 py-2 text-center">{pax}</td>
                          {show("room") && <td />}{show("partner") && <td />}{show("food") && <td />}
                          {show("deposit") && <td />}{show("depositDate") && <td />}{show("balanceDate") && <td />}
                          {show("price") && <td className="px-2 py-2 text-right">{fmtMoney(trip.rows.filter(r=>r.isGroupLeader||r.groupSize===1).reduce((s,r)=>s+r.quotedPrice,0))}</td>}
                          {show("discount") && <td className="px-2 py-2 text-right text-orange-600">{trip.rows.some(r=>r.discount) ? `-${fmtMoney(trip.rows.reduce((s,r)=>s+(r.discount??0),0))}` : "–"}</td>}
                          <td className="px-2 py-2 text-right text-emerald-700 dark:text-emerald-400">{fmtMoney(net)}</td>
                          <td colSpan={show("remarks") ? 2 : 1} />
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Edit panels */}
      {editRow && editRow.source === "lead" && (
        <LeadEditPanel row={editRow} onClose={() => setEditRow(null)} onSave={handleLeadSave} />
      )}
      {editRow && editRow.source === "booking" && (
        <TravelerEditPanel row={editRow} onClose={() => setEditRow(null)} onSave={handleTravelerSave} />
      )}
    </div>
  );
}
