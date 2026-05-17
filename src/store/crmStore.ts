import { create } from "zustand";
import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";

export type Source = "Field Sale" | "FB" | "Line OA" | "Website" | "TikTok" | "Google" | "Walk-in" | "Referral" | "Agent";
export type Tier = "New" | "Regular" | "VIP";
export type Segment = "B2C Individual" | "B2C Group" | "B2B Agent" | "Corporate";
export type LeadStatus = "New" | "Contacted" | "Quotation Sent" | "Negotiating" | "Closed Won" | "Closed Lost";
export type Urgency = "Hot" | "Warm" | "Cold";
export type BUType = "ทัวร์ต่างประเทศ" | "ทัวร์ภายในประเทศ" | "เช่ารถ ท่องเที่ยว" | "จองตั๋วเครื่องบิน";
export type SalesRep = "เฟิร์ส" | "โดนัท" | "ปาม";
export type LeadCategory = "ลูกค้าทั่วไป" | "บริษัทเอกชน" | "หน่วยงานราชการ" | "มหาวิทยาลัยเอกชน" | "มหาวิทยาลัยรัฐบาล";
export type TripScope = "Domestic" | "International";

export interface Customer {
  customer_id: string;
  full_name: string;
  company: string;
  phone: string;
  line_id: string;
  email?: string;
  province?: string;          // จังหวัด — for geo-targeting ads
  birthday?: string;          // YYYY-MM-DD — for birthday campaigns
  interests?: string[];       // multi-service tags e.g. ["ทัวร์ต่างประเทศ","Visa"]
  note?: string;              // meeting notes / บันทึกการพบลูกค้า
  last_contacted_at?: string; // ISO datetime — auto-updated on new lead
  source: Source;
  segment: Segment;
  total_trips: number;
  total_spend: number;
  customer_tier: Tier;
  first_contact_date: string;
  created_by: SalesRep;
  transferred_to?: SalesRep;
  transferred_from?: SalesRep;
  transferred_at?: string;
  created_at?: string;
}

export interface Lead {
  lead_id: string;
  customer_id: string;
  assigned_to: SalesRep;
  bu_type: BUType;
  lead_category: LeadCategory;
  scope: TripScope;
  program: string;
  pax_count: number;
  travel_month: string;
  tour_type: string;
  budget_range: string;
  urgency: Urgency;
  next_followup_date: string | null;
  status: LeadStatus;
  quoted_price: number;
  closed_date: string | null;
  lost_reason: string | null;
  status_note?: string | null;
}

export interface MonthlyTarget {
  // YYYY-MM
  month: string;
  rep: SalesRep;
  domestic_sales: number;
  domestic_pax: number;
  international_sales: number;
  international_pax: number;
}

export type StopStatus = "planned" | "in_progress" | "completed" | "skipped";
export interface RouteStop {
  stop_id: string;
  route_id: string;
  seq: number;
  customer_id?: string;
  place_name: string;
  address: string;
  purpose: string;
  note?: string;
  planned_time?: string; // HH:mm
  status: StopStatus;
  started_at?: string; // ISO
  completed_at?: string; // ISO
  duration_min?: number;
  field_photo_name?: string;
  field_photo_url?: string;
  lat?: number;
  lng?: number;
}
export interface RoutePlan {
  route_id: string;
  rep: SalesRep;
  date: string; // YYYY-MM-DD
  title: string;
  stops: RouteStop[];
  created_at: string;
}

export const SALES_REPS: SalesRep[] = ["เฟิร์ส", "โดนัท", "ปาม"];

export interface SalesRepInfo {
  name: SalesRep;
  position: string;
  phone: string;
  email: string;
  avatar_color: string;
}
export const SALES_REP_INFO: SalesRepInfo[] = [
  { name: "เฟิร์ส", position: "Senior Sales Executive", phone: "0812345678", email: "first@fieldsale.co", avatar_color: "from-pink-400 to-purple-500" },
  { name: "โดนัท", position: "Sales Executive", phone: "0823456789", email: "donut@fieldsale.co", avatar_color: "from-amber-400 to-pink-500" },
  { name: "ปาม", position: "Sales Executive", phone: "0834567890", email: "palm@fieldsale.co", avatar_color: "from-purple-400 to-indigo-500" },
];
export const MANAGER_INFO = { name: "Manager" as const, position: "Sales Manager", phone: "0800000000", email: "manager@fieldsale.co" };
export type ChatAuthor = SalesRep | "Manager";

export interface ChatMessage {
  id: string;
  author: ChatAuthor;
  text: string;
  created_at: string; // ISO
  reply_to?: string | null;
  mentions?: ChatAuthor[];
  image_url?: string;
}
export type TeamNotificationType = "mission_completed" | "customer_created";
export interface TeamNotification {
  id: string;
  type: TeamNotificationType;
  title: string;
  detail: string;
  sales: SalesRep;
  created_at: string;
  action_url?: string;
  read?: boolean;
}

export type DocumentType = "quotation" | "receipt";
export interface QuotationItem { description: string; qty: number; unit_price: number }
export interface QuotationDoc {
  id: string;
  doc_type: DocumentType;
  doc_no: string;
  rep: SalesRep;
  customer_name: string;
  customer_company?: string;
  customer_address?: string;
  customer_taxid?: string;
  issue_date: string; // YYYY-MM-DD
  valid_until?: string;
  items: QuotationItem[];
  vat_percent: number;
  discount: number;
  notes?: string;
  subtotal: number;
  vat_amount: number;
  total: number;
  created_at: string;
  updated_at?: string;
}
export const LEAD_CATEGORIES: LeadCategory[] = ["ลูกค้าทั่วไป", "บริษัทเอกชน", "หน่วยงานราชการ", "มหาวิทยาลัยเอกชน", "มหาวิทยาลัยรัฐบาล"];
export const SOURCES: Source[] = ["Field Sale", "FB", "Line OA", "Website", "TikTok", "Google", "Walk-in", "Referral", "Agent"];
export const BU_TYPES: BUType[] = ["ทัวร์ต่างประเทศ", "ทัวร์ภายในประเทศ", "เช่ารถ ท่องเที่ยว", "จองตั๋วเครื่องบิน"];
export const INT_PROGRAMS = [
  "HQO-KMG04-DR - คุนหมิง โหลวผิง ซากุระ 4 วัน 3 คืน (DR)",
  "HQO-CKG01-PN - ฉงชิ่ง ต้าจู๋ 4 วัน 3 คืน",
  "HQO-KMG03-MU - คุนหมิง ต้าหลี่ ลี่เจียง แชงกรีล่า 6 วัน 5 คืน (MU)",
  "HQO-KMG05-MU - ยูนนาน กุ้ยโจว 6 วัน 5 คืน (MU)",
  "อื่นๆ (โปรดระบุ)",
];
export const MONTHS = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
export const BUDGETS = ["<30k", "30k-50k", "50k-80k", "80k+", "Luxury"];
export const TOUR_TYPES = ["ครอบครัว", "ผู้สูงอายุ", "เน้นกิน", "ถ่ายรูป", "องค์กร", "VIP"];
export const URGENCY_OPTIONS: { val: Urgency; label: string; emoji: string }[] = [
  { val: "Hot", label: "Hot (ซื้อแน่)", emoji: "🔴" },
  { val: "Warm", label: "Warm (สนใจ)", emoji: "🟡" },
  { val: "Cold", label: "Cold (ถามเฉยๆ)", emoji: "🔵" },
];
export const LEAD_STATUSES: LeadStatus[] = ["New", "Contacted", "Quotation Sent", "Negotiating", "Closed Won", "Closed Lost"];
export const LOST_REASONS = ["ราคาแพงเกินไป","ลูกค้าเปลี่ยนใจ/ยกเลิกทริป","คู่แข่งได้งาน","ติดต่อไม่ได้","เลื่อนการเดินทางไม่มีกำหนด","โปรแกรมไม่ตอบโจทย์"];
export const SEGMENTS: Segment[] = ["B2C Individual", "B2C Group", "B2B Agent", "Corporate"];

const FIRST = ["สมชาย","สมหญิง","มานะ","มานี","ปิติ","ชูใจ","วิชัย","สิริวรรณ","ณัฐวุฒิ","ศิริพร","John","Alice","Kenji","Wei","Sarah"];
const LAST = ["ใจดี","รักไทย","มั่นคง","มีทรัพย์","พาณิชย์","Smith","Johnson","Tanaka","Chen","Williams"];
const COMPANIES = ["บจก. เอสบี แทรเวล","บมจ. พัฒนาดี","บริษัท คอร์ปอเรท ไทย จำกัด","โรงพยาบาลสุขใจ","มหาวิทยาลัยเทคโนโลยี","-"];

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

function calcTier(totalTrips: number, totalSpend: number): Tier {
  if (totalTrips >= 4 || totalSpend > 200_000) return "VIP";
  if (totalTrips >= 1) return "Regular";
  return "New";
}

function generate(): { customers: Customer[]; leads: Lead[] } {
  const customers: Customer[] = [];
  const leads: Lead[] = [];
  for (let i = 1; i <= 40; i++) {
    const isThai = Math.random() > 0.3;
    const fn = rand(FIRST);
    const ln = rand(LAST);
    const company = isThai && Math.random() > 0.5 ? rand(COMPANIES.slice(0, -1)) : "-";
    const trips = Math.floor(Math.random() * 5);
    const spend = trips * (Math.floor(Math.random() * 50000) + 15000);
    const phone = `08${Math.floor(Math.random() * 90000000 + 10000000)}`;
    const cid = `C${String(i).padStart(3, "0")}`;
    customers.push({
      customer_id: cid,
      full_name: `${fn} ${ln}`,
      company,
      phone,
      line_id: `line_${phone.slice(-4)}`,
      email: `${fn.toLowerCase()}@example.com`,
      source: rand(SOURCES),
      segment: rand(SEGMENTS),
      total_trips: trips,
      total_spend: spend,
      customer_tier: calcTier(trips, spend),
      first_contact_date: new Date(Date.now() - Math.floor(Math.random() * 1e10)).toISOString().split("T")[0],
      created_by: rand(SALES_REPS),
      created_at: new Date(Date.now() - Math.floor(Math.random() * 1e10)).toISOString(),
    });

    const numLeads = Math.floor(Math.random() * 2) + 1;
    for (let j = 0; j < numLeads; j++) {
      const status = rand(LEAD_STATUSES);
      const pax = Math.floor(Math.random() * 5) + 1;
      const price = (Math.floor(Math.random() * 20000) + 5000) * pax;
      const offset = Math.floor(Math.random() * 20) - 5;
      const fu = new Date();
      fu.setDate(fu.getDate() + offset);
      const bu = rand(BU_TYPES);
      const scope: TripScope = bu === "ทัวร์ภายในประเทศ" ? "Domestic" : (Math.random() > 0.4 ? "International" : "Domestic");
      leads.push({
        lead_id: `L${String(leads.length + 1).padStart(3, "0")}`,
        customer_id: cid,
        assigned_to: rand(SALES_REPS),
        bu_type: bu,
        lead_category: rand(LEAD_CATEGORIES),
        scope,
        program: rand(INT_PROGRAMS.slice(0, -1)),
        pax_count: pax,
        travel_month: rand(MONTHS),
        tour_type: rand(TOUR_TYPES),
        budget_range: rand(BUDGETS),
        urgency: rand(["Hot", "Warm", "Cold"] as Urgency[]),
        next_followup_date: ["Closed Won", "Closed Lost"].includes(status) ? null : fu.toISOString().split("T")[0],
        status,
        quoted_price: status !== "New" && status !== "Contacted" ? price : 0,
        closed_date: status === "Closed Won" ? new Date(Date.now() - Math.floor(Math.random() * 3e9)).toISOString().split("T")[0] : null,
        lost_reason: status === "Closed Lost" ? rand(LOST_REASONS) : null,
      });
    }
  }

  // Generate historical Won deals across past 6 months for nicer charts
  const now = new Date();
  for (let m = 5; m >= 0; m--) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
    SALES_REPS.forEach((rep) => {
      const numDeals = Math.floor(Math.random() * 4) + 2;
      for (let k = 0; k < numDeals; k++) {
        const cid = customers[Math.floor(Math.random() * customers.length)].customer_id;
        const pax = Math.floor(Math.random() * 20) + 4;
        const isIntl = Math.random() > 0.45;
        const ppx = isIntl ? Math.floor(Math.random() * 15000) + 18000 : Math.floor(Math.random() * 6000) + 5500;
        const closedDay = Math.floor(Math.random() * 26) + 1;
        const closed = new Date(d.getFullYear(), d.getMonth(), closedDay).toISOString().split("T")[0];
        leads.push({
          lead_id: `L${String(leads.length + 1).padStart(3, "0")}`,
          customer_id: cid,
          assigned_to: rep,
          bu_type: isIntl ? "ทัวร์ต่างประเทศ" : "ทัวร์ภายในประเทศ",
          lead_category: rand(LEAD_CATEGORIES),
          scope: isIntl ? "International" : "Domestic",
          program: isIntl ? rand(INT_PROGRAMS.slice(0, -1)) : "ทัวร์ในประเทศ",
          pax_count: pax,
          travel_month: MONTHS[d.getMonth()],
          tour_type: rand(TOUR_TYPES),
          budget_range: rand(BUDGETS),
          urgency: "Warm",
          next_followup_date: null,
          status: "Closed Won",
          quoted_price: pax * ppx,
          closed_date: closed,
          lost_reason: null,
        });
      }
    });
  }

  return { customers, leads };
}

const seeded = generate();

function seedRoutes(customers: Customer[]): RoutePlan[] {
  const routes: RoutePlan[] = [];
  const today = new Date();
  let rid = 1;
  let sid = 1;
  SALES_REPS.forEach((rep, ri) => {
    for (let dayOffset = -3; dayOffset <= 3; dayOffset++) {
      if (Math.random() > 0.6 && dayOffset !== 0) continue;
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + dayOffset);
      const date = d.toISOString().split("T")[0];
      const stopCount = Math.floor(Math.random() * 3) + 2;
      const stops: RouteStop[] = [];
      for (let i = 0; i < stopCount; i++) {
        const cust = customers[(ri * 7 + dayOffset + i + 10) % customers.length];
        const isPast = dayOffset < 0;
        const status: StopStatus = isPast ? (Math.random() > 0.2 ? "completed" : "skipped") : "planned";
        const startedAt = isPast ? new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9 + i, 0).toISOString() : undefined;
        const dur = isPast && status === "completed" ? Math.floor(Math.random() * 50) + 20 : undefined;
        stops.push({
          stop_id: `S${String(sid++).padStart(4, "0")}`,
          route_id: `R${String(rid).padStart(4, "0")}`,
          seq: i + 1,
          customer_id: cust.customer_id,
          place_name: cust.company !== "-" ? cust.company : cust.full_name,
          address: `${["สีลม","สาทร","อโศก","พระราม 9","รัชดา","ลาดพร้าว"][i % 6]} กรุงเทพฯ`,
          purpose: ["พบลูกค้า","นำเสนอแพ็คเกจ","สำรวจสถานที่","ปิดการขาย","Follow up"][i % 5],
          planned_time: `${String(9 + i).padStart(2, "0")}:00`,
          status,
          started_at: startedAt,
          completed_at: dur ? new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9 + i, dur).toISOString() : undefined,
          duration_min: dur,
        });
      }
      routes.push({
        route_id: `R${String(rid++).padStart(4, "0")}`,
        rep,
        date,
        title: `แผนเยี่ยมลูกค้า ${date}`,
        stops,
        created_at: new Date().toISOString(),
      });
    }
  });
  return routes;
}

const seededRoutes = seedRoutes(seeded.customers);

function defaultTargets(): MonthlyTarget[] {
  const out: MonthlyTarget[] = [];
  const now = new Date();
  for (let m = -2; m <= 3; m++) {
    const d = new Date(now.getFullYear(), now.getMonth() + m, 1);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    SALES_REPS.forEach((rep) => {
      out.push({
        month, rep,
        domestic_sales: 300_000,
        domestic_pax: 40,
        international_sales: 800_000,
        international_pax: 30,
      });
    });
  }
  return out;
}

interface CRMState {
  customers: Customer[];
  leads: Lead[];
  targets: MonthlyTarget[];
  routes: RoutePlan[];
  currentRep: SalesRep | "All";
  chatMessages: ChatMessage[];
  teamNotifications: TeamNotification[];
  quotations: QuotationDoc[];
  addQuotation: (q: Omit<QuotationDoc, "id" | "created_at" | "subtotal" | "vat_amount" | "total" | "doc_no"> & { doc_no?: string }) => string;
  updateQuotation: (id: string, patch: Partial<Omit<QuotationDoc, "id" | "created_at" | "doc_no" | "subtotal" | "vat_amount" | "total">>) => void;
  deleteQuotation: (id: string) => void;
  addChatMessage: (msg: Omit<ChatMessage, "id" | "created_at">) => void;
  markNotificationsRead: () => void;
  setCurrentRep: (r: SalesRep | "All") => void;
  loadCustomersFromSupabase: () => Promise<void>;
  loadAllFromSupabase: () => Promise<void>;
  addCustomer: (c: Omit<Customer, "customer_id" | "total_trips" | "total_spend" | "customer_tier" | "first_contact_date" | "created_by"> & { created_by?: SalesRep }) => string;
  updateCustomer: (id: string, patch: Partial<Customer>) => void;
  transferCustomer: (id: string, toRep: SalesRep) => void;
  addLead: (l: Omit<Lead, "lead_id" | "status" | "closed_date" | "lost_reason" | "lead_category" | "scope"> & { status?: LeadStatus; lead_category?: LeadCategory; scope?: TripScope }) => void;
  updateLeadStatus: (leadId: string, status: LeadStatus, lostReason?: string) => void;
  updateLead: (leadId: string, patch: Partial<Lead>) => void;
  setTarget: (month: string, rep: SalesRep, patch: Partial<Omit<MonthlyTarget, "month" | "rep">>) => void;
  addRoute: (rep: SalesRep, date: string, title: string) => string;
  updateRoute: (id: string, patch: Partial<Omit<RoutePlan, "route_id" | "stops">>) => void;
  deleteRoute: (id: string) => void;
  addStop: (routeId: string, stop: Omit<RouteStop, "stop_id" | "route_id" | "seq" | "status">) => void;
  updateStop: (routeId: string, stopId: string, patch: Partial<RouteStop>) => void;
  deleteStop: (routeId: string, stopId: string) => void;
  startStop: (routeId: string, stopId: string) => void;
  completeStop: (routeId: string, stopId: string, note?: string, photoName?: string, photoUrl?: string, lat?: number, lng?: number) => void;
}

export const useCRM = create<CRMState>((set, get) => ({
  // ถ้า Supabase เปิด → เริ่มด้วย array ว่าง แล้วให้ loadAllFromSupabase ดึงข้อมูลจริง
  // ถ้า Supabase ปิด → ใช้ mock seed data เพื่อ dev/demo
  customers: SUPABASE_ENABLED ? [] : seeded.customers,
  leads: SUPABASE_ENABLED ? [] : seeded.leads,
  targets: SUPABASE_ENABLED ? [] : defaultTargets(),
  routes: SUPABASE_ENABLED ? [] : seededRoutes,
  currentRep: "All",
  chatMessages: SUPABASE_ENABLED ? [] : [
    { id: "m1", author: "Manager", text: "สวัสดีทีมงาน อย่าลืมส่งรายงานวันศุกร์นะคะ", created_at: new Date(Date.now() - 86400000).toISOString() },
    { id: "m2", author: "เฟิร์ส", text: "รับทราบครับ @Manager", created_at: new Date(Date.now() - 3600000).toISOString(), mentions: ["Manager"] },
    { id: "m3", author: "โดนัท", text: "เรียบร้อยค่ะ", created_at: new Date(Date.now() - 1800000).toISOString(), reply_to: "m1" },
  ],
  teamNotifications: [],
  quotations: [],
  addQuotation: (q) => {
    const subtotal = q.items.reduce((s, it) => s + it.qty * it.unit_price, 0);
    const afterDiscount = Math.max(0, subtotal - (q.discount || 0));
    const vat_amount = +(afterDiscount * (q.vat_percent / 100)).toFixed(2);
    const total = +(afterDiscount + vat_amount).toFixed(2);
    // quotations.id เป็น uuid ใน Supabase — ต้องใช้ UUID จริง
    const id = (typeof crypto !== "undefined" && "randomUUID" in crypto)
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const prefix = q.doc_type === "receipt" ? "RC" : "QT";
    // ใช้ timestamp ใน doc_no เพื่อไม่ให้ซ้ำข้ามเซสชัน
    const doc_no = q.doc_no ?? `${prefix}-${new Date().getFullYear()}${String(Date.now()).slice(-5)}`;
    const doc: QuotationDoc = { ...q, id, doc_no, subtotal, vat_amount, total, created_at: new Date().toISOString() };
    set({ quotations: [doc, ...get().quotations] });
    if (SUPABASE_ENABLED && supabase) {
      supabase.from("quotations").insert(doc).then(({ error }) => {
        if (error) console.error("[supabase] เพิ่ม quotation ล้มเหลว:", error);
      });
    }
    return id;
  },
  deleteQuotation: (id) => {
    set({ quotations: get().quotations.filter((q) => q.id !== id) });
    if (SUPABASE_ENABLED && supabase) {
      supabase.from("quotations").delete().eq("id", id).then(({ error }) => {
        if (error) console.error("[supabase] delete quotation ล้มเหลว:", error);
      });
    }
  },
  updateQuotation: (id, patch) => {
    let updatedDoc: QuotationDoc | undefined;
    set({
      quotations: get().quotations.map((q) => {
        if (q.id !== id) return q;
        const merged = { ...q, ...patch } as QuotationDoc;
        const subtotal = merged.items.reduce((s, it) => s + it.qty * it.unit_price, 0);
        const afterDiscount = Math.max(0, subtotal - (merged.discount || 0));
        const vat_amount = +(afterDiscount * (merged.vat_percent / 100)).toFixed(2);
        const total = +(afterDiscount + vat_amount).toFixed(2);
        updatedDoc = { ...merged, subtotal, vat_amount, total, updated_at: new Date().toISOString() };
        return updatedDoc;
      }),
      teamNotifications: [{
        id: `n${Date.now()}`,
        type: "customer_created",
        title: "อัปเดตเอกสาร",
        detail: `${(patch as any).doc_type === "receipt" ? "ใบเสร็จ" : "ใบเสนอราคา"} ${get().quotations.find((q) => q.id === id)?.doc_no ?? ""} ถูกแก้ไข`,
        sales: get().quotations.find((q) => q.id === id)?.rep ?? SALES_REPS[0],
        created_at: new Date().toISOString(),
        action_url: "/app/quotation",
      }, ...get().teamNotifications],
    });
    if (SUPABASE_ENABLED && supabase && updatedDoc) {
      supabase.from("quotations").update(updatedDoc).eq("id", id).then(({ error }) => {
        if (error) console.error("[supabase] update quotation ล้มเหลว:", error);
      });
    }
  },
  addChatMessage: (msg) => {
    // Use crypto.randomUUID() so we have a real uuid that matches Supabase schema
    const id = (typeof crypto !== "undefined" && "randomUUID" in crypto)
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const created_at = new Date().toISOString();
    const newMsg: ChatMessage = { ...msg, id, created_at };
    set({ chatMessages: [...get().chatMessages, newMsg] });
    if (SUPABASE_ENABLED && supabase) {
      // image_url can be very large (data URL) — keep it for MVP
      const row = {
        id,
        author: newMsg.author,
        text: newMsg.text,
        reply_to: newMsg.reply_to ?? null,
        mentions: newMsg.mentions ?? null,
        image_url: newMsg.image_url ?? null,
        created_at,
      };
      supabase.from("chat_messages").insert(row).then(({ error }) => {
        if (error) console.error("[supabase] insert chat ล้มเหลว:", error);
      });
    }
  },
  markNotificationsRead: () => set({ teamNotifications: get().teamNotifications.map((n) => ({ ...n, read: true })) }),
  setCurrentRep: (r) => set({ currentRep: r }),

  loadCustomersFromSupabase: async () => {
    if (!SUPABASE_ENABLED || !supabase) return;
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (data && data.length > 0) {
        // eslint-disable-next-line no-console
        console.info(`[supabase] โหลดลูกค้า ${data.length} ราย จาก Supabase`);
        set({ customers: data as Customer[] });
      } else {
        // eslint-disable-next-line no-console
        console.info("[supabase] ยังไม่มีลูกค้าใน DB — ใช้ข้อมูล mock seed ต่อไป");
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[supabase] โหลด customers ล้มเหลว:", e);
    }
  },

  loadAllFromSupabase: async () => {
    if (!SUPABASE_ENABLED || !supabase) return;
    try {
      const [customers, leads, targets, quotations, routes, chats] = await Promise.all([
        supabase.from("customers").select("*").order("created_at", { ascending: false }),
        supabase.from("leads").select("*"),
        supabase.from("monthly_targets").select("*"),
        supabase.from("quotations").select("*").order("created_at", { ascending: false }),
        supabase.from("route_plans").select("*, route_stops (*)").order("date", { ascending: false }),
        supabase.from("chat_messages").select("*").order("created_at", { ascending: true }).limit(200),
      ]);
      const loadedSummary: string[] = [];
      // เช็ค error แต่ละตาราง
      if (customers.error) console.error("[supabase] load customers error:", customers.error);
      if (leads.error) console.error("[supabase] load leads error:", leads.error);
      if (targets.error) console.error("[supabase] load targets error:", targets.error);
      if (quotations.error) console.error("[supabase] load quotations error:", quotations.error);
      if (routes.error) console.error("[supabase] load routes error:", routes.error);
      if (chats.error) console.error("[supabase] load chats error:", chats.error);

      // อัพเดต state ทุกตาราง — แม้ว่าจะว่าง ก็ต้อง replace (ไม่ใช้ mock)
      const updates: Partial<CRMState> = {
        customers: (customers.data ?? []) as Customer[],
        leads: (leads.data ?? []) as Lead[],
        targets: (targets.data ?? []) as MonthlyTarget[],
        quotations: (quotations.data ?? []) as QuotationDoc[],
        routes: (routes.data ?? []).map((r: any) => ({
          ...r,
          stops: (r.route_stops || []).sort((a: RouteStop, b: RouteStop) => a.seq - b.seq),
        })) as RoutePlan[],
        chatMessages: (chats.data ?? []) as ChatMessage[],
      };
      if (customers.data?.length) loadedSummary.push(`customers ${customers.data.length}`);
      if (leads.data?.length) loadedSummary.push(`leads ${leads.data.length}`);
      if (targets.data?.length) loadedSummary.push(`targets ${targets.data.length}`);
      if (quotations.data?.length) loadedSummary.push(`quotations ${quotations.data.length}`);
      if (routes.data?.length) loadedSummary.push(`routes ${routes.data.length}`);
      if (chats.data?.length) loadedSummary.push(`chats ${chats.data.length}`);
      set(updates);
      // eslint-disable-next-line no-console
      console.info(loadedSummary.length > 0
        ? `[supabase] โหลดจาก DB: ${loadedSummary.join(", ")}`
        : "[supabase] DB ว่าง — พร้อมรับข้อมูลใหม่");
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[supabase] loadAll ล้มเหลว:", e);
    }
  },

  addCustomer: (c) => {
    const id = `C${Date.now()}`; // timestamp-based — ไม่ชนกับ ID เก่า
    const creator = c.created_by ?? (get().currentRep === "All" ? SALES_REPS[0] : (get().currentRep as SalesRep));
    const newC: Customer = {
      ...c,
      customer_id: id,
      total_trips: 0,
      total_spend: 0,
      customer_tier: "New",
      first_contact_date: new Date().toISOString().split("T")[0],
      created_by: creator,
      created_at: new Date().toISOString(),
    };
    const now = new Date().toISOString();
    set({
      customers: [newC, ...get().customers],
      teamNotifications: [{
        id: `n${Date.now()}`,
        type: "customer_created",
        title: "เพิ่มข้อมูลลูกค้าใหม่",
        detail: `${newC.full_name}${newC.company !== "-" ? ` · ${newC.company}` : ""} · ${newC.phone}`,
        sales: creator,
        created_at: now,
        action_url: "/app/customers",
      }, ...get().teamNotifications],
    });
    // Fire-and-forget persist to Supabase (ไม่ block UI)
    if (SUPABASE_ENABLED && supabase) {
      supabase.from("customers").insert(newC).then(({ error }) => {
        if (error) console.error("[supabase] เพิ่มลูกค้าล้มเหลว:", error);
      });
    }
    return id;
  },

  updateCustomer: (id, patch) => {
    set({ customers: get().customers.map((c) => (c.customer_id === id ? { ...c, ...patch } : c)) });
    if (SUPABASE_ENABLED && supabase) {
      supabase.from("customers").update(patch).eq("customer_id", id).then(({ error }) => {
        if (error) console.error("[supabase] update customer ล้มเหลว:", error);
      });
    }
  },

  transferCustomer: (id, toRep) => {
    const cust = get().customers.find((c) => c.customer_id === id);
    if (!cust) return;
    const fromRep = cust.created_by;
    if (fromRep === toRep) return;
    const transferPatch = {
      created_by: toRep,
      transferred_to: toRep,
      transferred_from: fromRep,
      transferred_at: new Date().toISOString(),
    };
    set({
      customers: get().customers.map((c) =>
        c.customer_id === id ? { ...c, ...transferPatch } : c,
      ),
      leads: get().leads.map((l) => (l.customer_id === id ? { ...l, assigned_to: toRep } : l)),
    });
    if (SUPABASE_ENABLED && supabase) {
      supabase.from("customers").update(transferPatch).eq("customer_id", id).then(({ error }) => {
        if (error) console.error("[supabase] transfer customer ล้มเหลว:", error);
      });
    }
  },

  addLead: (l) => {
    const id = `L${Date.now()}`; // timestamp-based — ไม่ชนกับ ID เก่า
    const newL: Lead = {
      ...l,
      lead_category: l.lead_category ?? "บริษัทเอกชน",
      scope: l.scope ?? (l.bu_type === "ทัวร์ภายในประเทศ" ? "Domestic" : "International"),
      lead_id: id,
      status: l.status ?? "New",
      closed_date: null,
      lost_reason: null,
    };
    set({ leads: [newL, ...get().leads] });
    // Auto-update last_contacted_at on the linked customer
    const now = new Date().toISOString();
    get().updateCustomer(l.customer_id, { last_contacted_at: now });
    if (SUPABASE_ENABLED && supabase) {
      supabase.from("leads").insert(newL).then(({ error }) => {
        if (error) console.error("[supabase] เพิ่ม lead ล้มเหลว:", error);
      });
    }
  },

  setTarget: (month, rep, patch) => {
    const list = get().targets;
    const idx = list.findIndex((t) => t.month === month && t.rep === rep);
    let upserted: MonthlyTarget;
    if (idx >= 0) {
      const next = [...list];
      next[idx] = { ...next[idx], ...patch };
      upserted = next[idx];
      set({ targets: next });
    } else {
      upserted = {
        month, rep,
        domestic_sales: 0, domestic_pax: 0,
        international_sales: 0, international_pax: 0,
        ...patch,
      };
      set({ targets: [...list, upserted] });
    }
    if (SUPABASE_ENABLED && supabase) {
      supabase.from("monthly_targets").upsert(upserted, { onConflict: "month,rep" }).then(({ error }) => {
        if (error) console.error("[supabase] upsert target ล้มเหลว:", error);
      });
    }
  },

  updateLead: (leadId, patch) => {
    set({ leads: get().leads.map((l) => (l.lead_id === leadId ? { ...l, ...patch } : l)) });
    if (SUPABASE_ENABLED && supabase) {
      supabase.from("leads").update(patch).eq("lead_id", leadId).then(({ error }) => {
        if (error) console.error("[supabase] update lead ล้มเหลว:", error);
      });
    }
  },

  updateLeadStatus: (leadId, status, lostReason) => {
    const lead = get().leads.find((l) => l.lead_id === leadId);
    if (!lead) return;
    const today = new Date().toISOString().split("T")[0];
    const leadPatch: Partial<Lead> = {
      status,
      lost_reason: status === "Closed Lost" ? lostReason ?? null : null,
      closed_date: status === "Closed Won" ? today : status === "Closed Lost" ? today : lead.closed_date,
      next_followup_date: ["Closed Won", "Closed Lost"].includes(status) ? null : lead.next_followup_date,
    };
    set({
      leads: get().leads.map((l) => (l.lead_id === leadId ? { ...l, ...leadPatch } : l)),
    });
    if (SUPABASE_ENABLED && supabase) {
      supabase.from("leads").update(leadPatch).eq("lead_id", leadId).then(({ error }) => {
        if (error) console.error("[supabase] update lead status ล้มเหลว:", error);
      });
    }
    if (status === "Closed Won") {
      const cust = get().customers.find((c) => c.customer_id === lead.customer_id);
      if (cust) {
        const newTrips = cust.total_trips + 1;
        const newSpend = cust.total_spend + (lead.quoted_price || 0);
        get().updateCustomer(cust.customer_id, {
          total_trips: newTrips,
          total_spend: newSpend,
          customer_tier: calcTier(newTrips, newSpend),
        });
      }
    }
  },

  addRoute: (rep, date, title) => {
    const id = `R${Date.now()}`; // timestamp-based — ไม่ชนกับ ID เก่า
    const r: RoutePlan = { route_id: id, rep, date, title, stops: [], created_at: new Date().toISOString() };
    set({ routes: [r, ...get().routes] });
    if (SUPABASE_ENABLED && supabase) {
      // Insert route_plan only — stops จะ insert ตอน addStop
      const { stops, ...routeOnly } = r;
      supabase.from("route_plans").insert(routeOnly).then(({ error }) => {
        if (error) console.error("[supabase] เพิ่ม route ล้มเหลว:", error);
      });
    }
    return id;
  },
  updateRoute: (id, patch) => {
    set({ routes: get().routes.map((r) => (r.route_id === id ? { ...r, ...patch } : r)) });
    if (SUPABASE_ENABLED && supabase) {
      // Don't include stops in update
      const { stops, ...patchOnly } = patch as Partial<RoutePlan>;
      supabase.from("route_plans").update(patchOnly).eq("route_id", id).then(({ error }) => {
        if (error) console.error("[supabase] update route ล้มเหลว:", error);
      });
    }
  },
  deleteRoute: (id) => {
    set({ routes: get().routes.filter((r) => r.route_id !== id) });
    if (SUPABASE_ENABLED && supabase) {
      // CASCADE delete จะลบ stops อัตโนมัติ
      supabase.from("route_plans").delete().eq("route_id", id).then(({ error }) => {
        if (error) console.error("[supabase] delete route ล้มเหลว:", error);
      });
    }
  },
  addStop: (routeId, stop) => {
    let newStop: RouteStop | undefined;
    set({
      routes: get().routes.map((r) => {
        if (r.route_id !== routeId) return r;
        const seq = r.stops.length + 1;
        const stop_id = `S${Date.now()}${seq}`;
        newStop = { ...stop, stop_id, route_id: routeId, seq, status: "planned" };
        return { ...r, stops: [...r.stops, newStop] };
      }),
    });
    if (SUPABASE_ENABLED && supabase && newStop) {
      supabase.from("route_stops").insert(newStop).then(({ error }) => {
        if (error) console.error("[supabase] เพิ่ม stop ล้มเหลว:", error);
      });
    }
  },
  updateStop: (routeId, stopId, patch) => {
    set({
      routes: get().routes.map((r) =>
        r.route_id !== routeId ? r : { ...r, stops: r.stops.map((s) => (s.stop_id === stopId ? { ...s, ...patch } : s)) },
      ),
    });
    if (SUPABASE_ENABLED && supabase) {
      supabase.from("route_stops").update(patch).eq("stop_id", stopId).then(({ error }) => {
        if (error) console.error("[supabase] update stop ล้มเหลว:", error);
      });
    }
  },
  deleteStop: (routeId, stopId) => {
    set({
      routes: get().routes.map((r) =>
        r.route_id !== routeId ? r : { ...r, stops: r.stops.filter((s) => s.stop_id !== stopId).map((s, i) => ({ ...s, seq: i + 1 })) },
      ),
    });
    if (SUPABASE_ENABLED && supabase) {
      supabase.from("route_stops").delete().eq("stop_id", stopId).then(({ error }) => {
        if (error) console.error("[supabase] delete stop ล้มเหลว:", error);
      });
    }
  },
  startStop: (routeId, stopId) => {
    const now = new Date().toISOString();
    get().updateStop(routeId, stopId, { status: "in_progress", started_at: now });
  },
  completeStop: (routeId, stopId, note, photoName, photoUrl, lat, lng) => {
    const route = get().routes.find((r) => r.route_id === routeId);
    const stop = route?.stops.find((s) => s.stop_id === stopId);
    if (!stop) return;
    const startedAt = stop.started_at ? new Date(stop.started_at) : new Date();
    const completedAt = new Date();
    const duration = Math.max(1, Math.round((completedAt.getTime() - startedAt.getTime()) / 60000));
    get().updateStop(routeId, stopId, {
      status: "completed",
      started_at: stop.started_at ?? startedAt.toISOString(),
      completed_at: completedAt.toISOString(),
      duration_min: duration,
      note: note ?? stop.note,
      field_photo_name: photoName ?? stop.field_photo_name,
      field_photo_url: photoUrl ?? stop.field_photo_url,
      lat: lat ?? stop.lat,
      lng: lng ?? stop.lng,
    });
    set({
      teamNotifications: [{
        id: `n${Date.now()}`,
        type: "mission_completed",
        title: "Mission เสร็จสิ้น",
        detail: `${stop.place_name} · ${duration} นาที${note ? ` · ${note}` : ""}`,
        sales: route.rep,
        created_at: completedAt.toISOString(),
        action_url: `/app/route-completed/${routeId}`,
      }, ...get().teamNotifications],
    });
  },
}));

export const formatTHB = (n: number) =>
  new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(n);

export const tierBadge = (t: Tier) => {
  if (t === "VIP") return "bg-accent/15 text-accent border-accent/30";
  if (t === "Regular") return "bg-primary/10 text-primary border-primary/30";
  return "bg-muted text-muted-foreground border-border";
};

export const statusColor = (s: LeadStatus) => {
  switch (s) {
    case "New": return "bg-slate-100 text-slate-700 border-slate-300";
    case "Contacted": return "bg-sky-100 text-sky-700 border-sky-300";
    case "Quotation Sent": return "bg-indigo-100 text-indigo-700 border-indigo-300";
    case "Negotiating": return "bg-amber-100 text-amber-700 border-amber-300";
    case "Closed Won": return "bg-success/15 text-success border-success/30";
    case "Closed Lost": return "bg-destructive/15 text-destructive border-destructive/30";
  }
};

export const urgencyBadge = (u: Urgency) => {
  if (u === "Hot") return "bg-destructive/15 text-destructive border-destructive/30";
  if (u === "Warm") return "bg-warning/20 text-warning-foreground border-warning/40";
  return "bg-sky-100 text-sky-700 border-sky-300";
};