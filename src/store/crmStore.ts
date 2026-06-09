import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";
import { useServices } from "@/store/serviceStore";
import { useAuth } from "@/store/authStore";

export type Source = "Field Sale" | "FB" | "Line OA" | "Website" | "TikTok" | "Google" | "Walk-in" | "Referral" | "Agent";
export type Tier = "New" | "Regular" | "VIP";
export type Segment = "B2C Individual" | "B2C Group" | "B2B Agent" | "Corporate";
export type LeadStatus = "New" | "Contacted" | "Quotation Sent" | "Negotiating" | "Closed Won" | "Closed Lost";
export type Urgency = "Hot" | "Warm" | "Cold";
export type BUType = "ทัวร์ต่างประเทศ" | "ทัวร์ภายในประเทศ" | "เช่ารถ ท่องเที่ยว" | "จองตั๋วเครื่องบิน";
// ชื่อ SalesRep เป็น string แบบ dynamic — รองรับ user ทุกคน (ไม่ hardcode)
export type SalesRep = string;
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
  transfer_logs?: TransferLog[];  // ประวัติการโอนลูกค้าทั้งหมด
  created_at?: string;
}

export interface TransferLog {
  log_id: string;
  from_rep: string;
  to_rep: string;
  transferred_at: string;    // ISO datetime
  note?: string;
  transferred_by?: string;   // ผู้ดำเนินการ (ถ้าต่างจาก from_rep)
}

export type FollowupResult =
  | "ไม่เจอ/ไม่รับ"
  | "เจอแต่ไม่ว่าง"
  | "คุยแล้ว"
  | "นัดได้แล้ว";

export interface FollowupLog {
  log_id: string;
  lead_id: string;
  date: string;           // YYYY-MM-DD
  result: FollowupResult;
  note?: string;
  next_followup_date?: string | null;  // วันนัดครั้งต่อไป (ถ้ามี)
  logged_by: string;
}

export interface Lead {
  lead_id: string;
  customer_id: string;
  assigned_to: SalesRep;
  bu_type: BUType;
  lead_category: LeadCategory;
  scope: TripScope;
  program: string;
  tour_id?: string;       // FK → TourItem.id (มีเฉพาะทัวร์ที่เลือกจาก All Service)
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
  requirement_tags?: string[];  // tags เก็บความต้องการ เช่น ["ทัวร์ญี่ปุ่น","ครอบครัว"]
  followup_logs?: FollowupLog[];  // ประวัติการ Follow-up ทุกครั้ง
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

export type ContentStatus   = "Draft" | "Scheduled" | "Published" | "Done";
export type ContentChannel  = "Facebook" | "Instagram" | "LINE";
export interface ContentPost {
  post_id:          string;
  title:            string;
  caption:          string;
  channel:          ContentChannel;
  scheduled_date:   string; // YYYY-MM-DD
  status:           ContentStatus;
  campaign_id?:     string;
  tour_id?:         string; // link to TourItem.id
  created_at:       string;
  // Performance tracking (manual entry)
  reach?:           number;
  likes?:           number;
  comments?:        number;
  shares?:          number;
  leads_generated?: number;
}
export const CONTENT_CHANNELS: ContentChannel[] = ["Facebook", "Instagram", "LINE"];
export const CONTENT_STATUSES: ContentStatus[]  = ["Draft", "Scheduled", "Published", "Done"];

/** Template กรอบรูปสำหรับ Photo Frame Studio — เก็บเป็น base64 dataUrl */
export interface ContentTemplate {
  template_id: string;
  name:        string;
  dataUrl:     string;  // base64 PNG/WEBP
  width:       number;
  height:      number;
  folder?:     string;  // ชื่อโฟล์เดอร์ (optional)
  created_at:  string;
}
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
export const REQUIREMENT_TAGS = [
  "ทัวร์ญี่ปุ่น","ทัวร์เกาหลี","ทัวร์จีน","ทัวร์ยุโรป","ทัวร์เวียดนาม",
  "ทัวร์ไทย","เช่ารถ","จองตั๋ว","โรงแรม","ครอบครัว","กลุ่มบริษัท","ฮันนีมูน","ผู้สูงอายุ",
];
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
  contentPosts: ContentPost[];
  addContentPost:    (p: Omit<ContentPost, "post_id" | "created_at">) => void;
  updateContentPost: (id: string, patch: Partial<Omit<ContentPost, "post_id" | "created_at">>) => void;
  deleteContentPost: (id: string) => void;
  contentTemplates:     ContentTemplate[];
  addContentTemplate:    (t: Omit<ContentTemplate, "template_id" | "created_at">) => void;
  updateContentTemplate: (id: string, patch: Partial<Omit<ContentTemplate, "template_id" | "created_at">>) => void;
  deleteContentTemplate: (id: string) => void;
  addQuotation: (q: Omit<QuotationDoc, "id" | "created_at" | "subtotal" | "vat_amount" | "total" | "doc_no"> & { doc_no?: string }) => string;
  updateQuotation: (id: string, patch: Partial<Omit<QuotationDoc, "id" | "created_at" | "doc_no" | "subtotal" | "vat_amount" | "total">>) => void;
  deleteQuotation: (id: string) => void;
  addChatMessage: (msg: Omit<ChatMessage, "id" | "created_at">) => void;
  markNotificationsRead: () => void;
  dismissNotification: (id: string) => void;
  clearAllNotifications: () => void;
  setCurrentRep: (r: SalesRep | "All") => void;
  loadCustomersFromSupabase: () => Promise<void>;
  loadAllFromSupabase: () => Promise<void>;
  addCustomer: (c: Omit<Customer, "customer_id" | "total_trips" | "total_spend" | "customer_tier" | "first_contact_date" | "created_by"> & { created_by?: SalesRep }) => string;
  updateCustomer: (id: string, patch: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  transferCustomer: (id: string, toRep: SalesRep) => void;
  addLead: (l: Omit<Lead, "lead_id" | "status" | "closed_date" | "lost_reason" | "lead_category" | "scope"> & { status?: LeadStatus; lead_category?: LeadCategory; scope?: TripScope }) => void;
  updateLeadStatus: (leadId: string, status: LeadStatus, lostReason?: string) => void;
  updateLead: (leadId: string, patch: Partial<Lead>) => void;
  addFollowupLog: (leadId: string, log: Omit<FollowupLog, "log_id" | "lead_id">) => void;
  setTarget: (month: string, rep: SalesRep, patch: Partial<Omit<MonthlyTarget, "month" | "rep">>) => void;
  addRoute: (rep: SalesRep, date: string, title: string) => string;
  updateRoute: (id: string, patch: Partial<Omit<RoutePlan, "route_id" | "stops">>) => void;
  deleteRoute: (id: string) => void;
  addStop: (routeId: string, stop: Omit<RouteStop, "stop_id" | "route_id" | "seq" | "status">) => void;
  updateStop: (routeId: string, stopId: string, patch: Partial<RouteStop>) => void;
  deleteStop: (routeId: string, stopId: string) => void;
  reorderStops: (routeId: string, orderedStopIds: string[]) => void;
  skipStop: (routeId: string, stopId: string, targetDate: string) => void;
  startStop: (routeId: string, stopId: string) => void;
  completeStop: (routeId: string, stopId: string, note?: string, photoName?: string, photoUrl?: string, lat?: number, lng?: number) => void;
}

export const useCRM = create<CRMState>()(
  persist(
    (set, get) => ({
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
  contentPosts: [],
  addContentPost: (p) => {
    const post: ContentPost = { ...p, post_id: `CP-${Date.now()}`, created_at: new Date().toISOString() };
    set({ contentPosts: [post, ...get().contentPosts] });
  },
  updateContentPost: (id, patch) => {
    set({ contentPosts: get().contentPosts.map((p) => p.post_id === id ? { ...p, ...patch } : p) });
  },
  deleteContentPost: (id) => {
    set({ contentPosts: get().contentPosts.filter((p) => p.post_id !== id) });
  },
  contentTemplates: [],
  addContentTemplate: (t) => {
    const tmpl: ContentTemplate = { ...t, template_id: `CT-${Date.now()}`, created_at: new Date().toISOString() };
    set({ contentTemplates: [tmpl, ...get().contentTemplates] });
  },
  updateContentTemplate: (id, patch) => {
    set({ contentTemplates: get().contentTemplates.map((t) => t.template_id === id ? { ...t, ...patch } : t) });
  },
  deleteContentTemplate: (id) => {
    set({ contentTemplates: get().contentTemplates.filter((t) => t.template_id !== id) });
  },
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
  markNotificationsRead: () => {
    set({ teamNotifications: get().teamNotifications.map((n) => ({ ...n, read: true })) });
    if (SUPABASE_ENABLED && supabase) {
      supabase.from("team_notifications").update({ read: true }).eq("read", false).then(({ error }) => {
        if (error) console.error("[supabase] mark notifications read ล้มเหลว:", error);
      });
    }
  },
  dismissNotification: (id) => {
    set({ teamNotifications: get().teamNotifications.filter((n) => n.id !== id) });
    if (SUPABASE_ENABLED && supabase) {
      supabase.from("team_notifications").delete().eq("id", id).then(({ error }) => {
        if (error) console.error("[supabase] dismiss notification ล้มเหลว:", error);
      });
    }
  },
  clearAllNotifications: () => {
    const ids = get().teamNotifications.map((n) => n.id);
    set({ teamNotifications: [] });
    if (SUPABASE_ENABLED && supabase && ids.length > 0) {
      supabase.from("team_notifications").delete().in("id", ids).then(({ error }) => {
        if (error) console.error("[supabase] clear notifications ล้มเหลว:", error);
      });
    }
  },
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
      const [customers, leads, targets, quotations, routes, chats, notifs] = await Promise.all([
        supabase.from("customers").select("*").order("created_at", { ascending: false }),
        supabase.from("leads").select("*"),
        supabase.from("monthly_targets").select("*"),
        supabase.from("quotations").select("*").order("created_at", { ascending: false }),
        supabase.from("route_plans").select("*, route_stops (*)").order("date", { ascending: false }),
        supabase.from("chat_messages").select("*").order("created_at", { ascending: true }).limit(200),
        supabase.from("team_notifications").select("*").order("created_at", { ascending: false }).limit(100),
      ]);
      const loadedSummary: string[] = [];
      if (customers.error) console.error("[supabase] load customers error:", customers.error);
      if (leads.error) console.error("[supabase] load leads error:", leads.error);
      if (targets.error) console.error("[supabase] load targets error:", targets.error);
      if (quotations.error) console.error("[supabase] load quotations error:", quotations.error);
      if (routes.error) console.error("[supabase] load routes error:", routes.error);
      if (chats.error) console.error("[supabase] load chats error:", chats.error);
      if (notifs.error) console.error("[supabase] load notifications error:", notifs.error);

      // ── Smart merge routes ──────────────────────────────────────────────────
      // ปัญหาเดิม: loadAll blindly replace → stops ที่ insert ยังไม่สำเร็จจะหายหมด
      // → Mission หน้าว่าง → กด Complete ไม่ได้
      // แก้: merge อย่างฉลาด — local ชนะถ้า status ไปไกลกว่า หรือมี stops เพิ่ม
      const currentRoutes = get().routes;
      const STATUS_RANK: Record<StopStatus, number> = { planned: 0, in_progress: 1, completed: 2, skipped: 2 };
      // timestamp-based ID = R + 10+ digits; seeded = R0001–R0100
      const isRealRoute = (rid: string) => /^R\d{10,}/.test(rid);

      const mergedRoutes: RoutePlan[] = ((routes.data ?? []) as any[]).map((r) => {
        const supaStops: RouteStop[] = (r.route_stops || []).sort(
          (a: RouteStop, b: RouteStop) => a.seq - b.seq,
        );
        const localRoute = currentRoutes.find((lr) => lr.route_id === r.route_id);
        if (!localRoute) return { ...r, stops: supaStops };

        // local มี stops มากกว่า → stops ยัง pending sync → ใช้ local + re-sync ที่หาย
        if (localRoute.stops.length > supaStops.length) {
          const supaStopIds = new Set(supaStops.map((s) => s.stop_id));
          const missingStops = localRoute.stops.filter((s) => !supaStopIds.has(s.stop_id));
          if (missingStops.length > 0) {
            // eslint-disable-next-line no-console
            console.warn(`[supabase] re-sync ${missingStops.length} stops ที่หาย (route ${r.route_id})`);
            missingStops.forEach((stop) => {
              supabase!.from("route_stops").upsert(stop, { onConflict: "stop_id" }).then(({ error }) => {
                if (error) console.error("[supabase] re-sync stop ล้มเหลว:", stop.stop_id, error);
              });
            });
          }
          return { ...r, stops: localRoute.stops };
        }

        // merge stop statuses: local ชนะถ้า status ไป "ไกลกว่า" (in_progress > planned)
        const mergedStops = supaStops.map((ss) => {
          const ls = localRoute.stops.find((s) => s.stop_id === ss.stop_id);
          if (ls && STATUS_RANK[ls.status] > STATUS_RANK[ss.status]) return ls;
          return ss;
        });
        return { ...r, stops: mergedStops };
      });

      // เก็บ routes ที่มีใน local แต่ยังไม่อยู่ใน Supabase (pending sync)
      // เฉพาะ "real" routes (timestamp ID) — ทิ้ง seeded data เก่า
      const supaIds = new Set(mergedRoutes.map((r) => r.route_id));
      const localOnlyRoutes = currentRoutes.filter(
        (r) => !supaIds.has(r.route_id) && isRealRoute(r.route_id),
      );
      if (localOnlyRoutes.length > 0) {
        // eslint-disable-next-line no-console
        console.warn(`[supabase] พบ ${localOnlyRoutes.length} route ที่ยังไม่ sync — เก็บไว้ก่อน`);
      }
      const finalRoutes: RoutePlan[] = [...mergedRoutes, ...localOnlyRoutes];
      // ─────────────────────────────────────────────────────────────────────

      const updates: Partial<CRMState> = {
        customers: (customers.data ?? []) as Customer[],
        leads: (leads.data ?? []) as Lead[],
        targets: (targets.data ?? []) as MonthlyTarget[],
        quotations: (quotations.data ?? []) as QuotationDoc[],
        routes: finalRoutes,
        chatMessages: (chats.data ?? []) as ChatMessage[],
        teamNotifications: (notifs.data ?? []) as TeamNotification[],
      };
      if (customers.data?.length) loadedSummary.push(`customers ${customers.data.length}`);
      if (leads.data?.length) loadedSummary.push(`leads ${leads.data.length}`);
      if (targets.data?.length) loadedSummary.push(`targets ${targets.data.length}`);
      if (quotations.data?.length) loadedSummary.push(`quotations ${quotations.data.length}`);
      if (finalRoutes.length) loadedSummary.push(`routes ${finalRoutes.length}`);
      if (chats.data?.length) loadedSummary.push(`chats ${chats.data.length}`);
      if (notifs.data?.length) loadedSummary.push(`notifications ${notifs.data.length}`);
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
    // ใช้ชื่อ user ที่ login อยู่จริง — ไม่ fallback เป็น "เฟิร์ส" อีกต่อไป
    const authState = useAuth.getState();
    const currentUser = authState.currentUserId
      ? authState.users.find((u) => u.user_id === authState.currentUserId)
      : null;
    const creator = c.created_by
      ?? currentUser?.full_name
      ?? (get().currentRep !== "All" ? get().currentRep : SALES_REPS[0]);
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
    const notif: TeamNotification = {
      id: `n${Date.now()}`,
      type: "customer_created",
      title: "เพิ่มข้อมูลลูกค้าใหม่",
      detail: `${newC.full_name}${newC.company !== "-" ? ` · ${newC.company}` : ""} · ${newC.phone}`,
      sales: creator,
      created_at: now,
      action_url: "/app/customers",
    };
    set({
      customers: [newC, ...get().customers],
      teamNotifications: [notif, ...get().teamNotifications],
    });
    // Fire-and-forget persist to Supabase (ไม่ block UI)
    if (SUPABASE_ENABLED && supabase) {
      supabase.from("customers").insert(newC).then(({ error }) => {
        if (error) console.error("[supabase] เพิ่มลูกค้าล้มเหลว:", error);
      });
      supabase.from("team_notifications").insert(notif).then(({ error }) => {
        if (error) console.error("[supabase] insert notification ล้มเหลว:", error);
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

  deleteCustomer: (id) => {
    set({ customers: get().customers.filter((c) => c.customer_id !== id) });
    if (SUPABASE_ENABLED && supabase) {
      supabase.from("customers").delete().eq("customer_id", id).then(({ error }) => {
        if (error) console.error("[supabase] delete customer ล้มเหลว:", error);
      });
    }
  },

  transferCustomer: (id, toRep) => {
    const cust = get().customers.find((c) => c.customer_id === id);
    if (!cust) return;
    const fromRep = cust.created_by;
    if (fromRep === toRep) return;
    const now = new Date().toISOString();
    const newLog: TransferLog = {
      log_id: `TL${Date.now()}`,
      from_rep: fromRep,
      to_rep: toRep,
      transferred_at: now,
    };
    const existingLogs = cust.transfer_logs ?? [];
    const transferPatch = {
      created_by: toRep,
      transferred_to: toRep,
      transferred_from: fromRep,
      transferred_at: now,
      transfer_logs: [...existingLogs, newLog],
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

  addFollowupLog: (leadId, log) => {
    const newLog: FollowupLog = { ...log, log_id: `FL${Date.now()}`, lead_id: leadId };
    let updatedLead: Lead | undefined;
    set({
      leads: get().leads.map((l) => {
        if (l.lead_id !== leadId) return l;
        updatedLead = {
          ...l,
          followup_logs: [...(l.followup_logs ?? []), newLog],
          status_note: log.note || l.status_note,
          next_followup_date: log.next_followup_date !== undefined
            ? log.next_followup_date
            : l.next_followup_date,
        };
        return updatedLead;
      }),
    });
    // Sync followup_logs, status_note และ next_followup_date ไปยัง Supabase
    if (SUPABASE_ENABLED && supabase && updatedLead) {
      const patch = {
        followup_logs: updatedLead.followup_logs,
        status_note: updatedLead.status_note ?? null,
        next_followup_date: updatedLead.next_followup_date ?? null,
      };
      supabase.from("leads").update(patch).eq("lead_id", leadId).then(({ error }) => {
        if (error) console.error("[supabase] update followup_logs ล้มเหลว:", error);
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
    const prevStatus = lead.status; // capture ก่อน update
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

    // ── Auto-deduct / restore tour quota ──
    const isTour = lead.bu_type === "ทัวร์ต่างประเทศ" || lead.bu_type === "ทัวร์ภายในประเทศ";
    if (isTour && lead.tour_id) {
      const { adjustQuota } = useServices.getState();
      if (status === "Closed Won" && prevStatus !== "Closed Won") {
        // ปิดดีลทัวร์ → ตัดที่นั่งออก
        adjustQuota(lead.tour_id, -lead.pax_count);
      } else if (prevStatus === "Closed Won" && status !== "Closed Won") {
        // ยกเลิกดีลที่เคย Won → คืนที่นั่งกลับ
        adjustQuota(lead.tour_id, +lead.pax_count);
      }
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
      // upsert แทน insert — retry safe (idempotent)
      const { stops, ...routeOnly } = r;
      const upsertRoute = async (attempt = 1) => {
        const { error } = await supabase!.from("route_plans").upsert(routeOnly, { onConflict: "route_id" });
        if (error) {
          if (attempt < 3) {
            await new Promise((res) => setTimeout(res, 800 * attempt));
            return upsertRoute(attempt + 1);
          }
          console.error("[supabase] เพิ่ม route ล้มเหลว (3 attempts):", error);
        }
      };
      upsertRoute();
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
      // upsert แทน insert (idempotent — ถ้า retry แล้วได้ stop_id ซ้ำก็ไม่ error)
      const upsertStop = async (s: RouteStop, attempt = 1) => {
        const { error } = await supabase!.from("route_stops").upsert(s, { onConflict: "stop_id" });
        if (error) {
          if (attempt < 3) {
            await new Promise((res) => setTimeout(res, 800 * attempt));
            return upsertStop(s, attempt + 1);
          }
          console.error("[supabase] เพิ่ม stop ล้มเหลว (3 attempts):", error);
        }
      };
      upsertStop(newStop);
    }
  },
  updateStop: (routeId, stopId, patch) => {
    // 1) Update local state immediately (with data URL for instant preview)
    set({
      routes: get().routes.map((r) =>
        r.route_id !== routeId ? r : { ...r, stops: r.stops.map((s) => (s.stop_id === stopId ? { ...s, ...patch } : s)) },
      ),
    });
    if (!SUPABASE_ENABLED || !supabase) return;

    const supabasePatch = { ...patch } as Record<string, unknown>;
    const dataUrl = typeof supabasePatch.field_photo_url === "string" && supabasePatch.field_photo_url.startsWith("data:")
      ? supabasePatch.field_photo_url as string
      : null;

    if (dataUrl) {
      // 2) Upload photo to Supabase Storage → get public URL → persist
      delete supabasePatch.field_photo_url; // don't send data URL in REST patch

      (async () => {
        try {
          // Convert data URL → Blob
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const ext  = blob.type.includes("png") ? "png" : "jpg";
          const path = `route-photos/${stopId}_${Date.now()}.${ext}`;

          const { error: uploadErr } = await supabase.storage
            .from("field-photos")
            .upload(path, blob, { upsert: true, contentType: blob.type });

          if (uploadErr) {
            // Storage upload ล้มเหลว → fallback: บันทึก data URL ตรงลง DB
            // (data URL ทำงานได้เป็น img src และ PostgreSQL text column รองรับขนาดนี้)
            console.warn("[supabase] Storage upload ล้มเหลว — fallback บันทึก data URL ลง DB:", uploadErr.message);
            const fallbackPatch = { ...supabasePatch, field_photo_url: dataUrl };
            supabase.from("route_stops").update(fallbackPatch).eq("stop_id", stopId)
              .then(({ error }) => { if (error) console.error("[supabase] fallback update stop ล้มเหลว:", error); });
            return;
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage.from("field-photos").getPublicUrl(path);

          // Update Supabase row with persistent public URL
          const finalPatch = { ...supabasePatch, field_photo_url: publicUrl };
          supabase.from("route_stops").update(finalPatch).eq("stop_id", stopId)
            .then(({ error }) => { if (error) console.error("[supabase] update stop ล้มเหลว:", error); });

          // Update local state with public URL (replaces data URL)
          set({
            routes: get().routes.map((r) =>
              r.route_id !== routeId ? r : {
                ...r,
                stops: r.stops.map((s) =>
                  s.stop_id === stopId ? { ...s, field_photo_url: publicUrl } : s
                ),
              },
            ),
          });
        } catch (e) {
          console.error("[supabase] upload photo error:", e);
        }
      })();
    } else {
      // No data URL — update normally
      supabase.from("route_stops").update(supabasePatch).eq("stop_id", stopId)
        .then(({ error }) => { if (error) console.error("[supabase] update stop ล้มเหลว:", error); });
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
  reorderStops: (routeId, orderedStopIds) => {
    set({
      routes: get().routes.map((r) => {
        if (r.route_id !== routeId) return r;
        const stopMap = new Map(r.stops.map((s) => [s.stop_id, s]));
        const reordered = orderedStopIds
          .map((id, idx) => {
            const s = stopMap.get(id);
            return s ? { ...s, seq: idx + 1 } : null;
          })
          .filter(Boolean) as RouteStop[];
        // append any stops not in orderedStopIds (safety)
        const reorderedIds = new Set(orderedStopIds);
        const extra = r.stops.filter((s) => !reorderedIds.has(s.stop_id)).map((s, i) => ({ ...s, seq: reordered.length + i + 1 }));
        return { ...r, stops: [...reordered, ...extra] };
      }),
    });
    if (SUPABASE_ENABLED && supabase) {
      orderedStopIds.forEach((stopId, idx) => {
        supabase!.from("route_stops").update({ seq: idx + 1 }).eq("stop_id", stopId).then(({ error }) => {
          if (error) console.error("[supabase] reorder stop ล้มเหลว:", stopId, error);
        });
      });
    }
  },
  skipStop: (routeId, stopId, targetDate) => {
    const state = get();
    const currentRoute = state.routes.find((r) => r.route_id === routeId);
    if (!currentRoute) return;
    const stop = currentRoute.stops.find((s) => s.stop_id === stopId);
    if (!stop) return;

    // Reset stop state (ลบ timing ที่อาจติดมา)
    const cleanStop: RouteStop = {
      ...stop,
      status: "planned",
      started_at: undefined,
      completed_at: undefined,
      duration_min: undefined,
    };

    const existingTarget = state.routes.find(
      (r) => r.date === targetDate && r.rep === currentRoute.rep,
    );

    if (existingTarget) {
      const targetRouteId = existingTarget.route_id;
      const newSeq = existingTarget.stops.length + 1;
      set({
        routes: state.routes.map((r) => {
          if (r.route_id === routeId) {
            return { ...r, stops: r.stops.filter((s) => s.stop_id !== stopId).map((s, i) => ({ ...s, seq: i + 1 })) };
          }
          if (r.route_id === targetRouteId) {
            return { ...r, stops: [...r.stops, { ...cleanStop, route_id: targetRouteId, seq: newSeq }] };
          }
          return r;
        }),
      });
      if (SUPABASE_ENABLED && supabase) {
        supabase!.from("route_stops")
          .update({ route_id: targetRouteId, seq: newSeq, status: "planned", started_at: null, completed_at: null, duration_min: null })
          .eq("stop_id", stopId)
          .then(({ error }) => { if (error) console.error("[supabase] skipStop update ล้มเหลว:", error); });
      }
    } else {
      // สร้าง route ใหม่สำหรับวันนั้น
      const targetRouteId = `R${Date.now()}`;
      const newRoute: RoutePlan = {
        route_id: targetRouteId,
        rep: currentRoute.rep,
        date: targetDate,
        title: `แผนเยี่ยมลูกค้า ${targetDate}`,
        stops: [{ ...cleanStop, route_id: targetRouteId, seq: 1 }],
        created_at: new Date().toISOString(),
      };
      set({
        routes: [
          ...state.routes.map((r) => {
            if (r.route_id !== routeId) return r;
            return { ...r, stops: r.stops.filter((s) => s.stop_id !== stopId).map((s, i) => ({ ...s, seq: i + 1 })) };
          }),
          newRoute,
        ],
      });
      if (SUPABASE_ENABLED && supabase) {
        const { stops: _stops, ...routeOnly } = newRoute;
        supabase!.from("route_plans").upsert(routeOnly, { onConflict: "route_id" }).then(({ error }) => {
          if (error) console.error("[supabase] skipStop: create route ล้มเหลว:", error);
        });
        supabase!.from("route_stops")
          .update({ route_id: targetRouteId, seq: 1, status: "planned", started_at: null, completed_at: null, duration_min: null })
          .eq("stop_id", stopId)
          .then(({ error }) => { if (error) console.error("[supabase] skipStop: move stop ล้มเหลว:", error); });
      }
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
    const missionNotif: TeamNotification = {
      id: `n${Date.now()}`,
      type: "mission_completed",
      title: "Mission เสร็จสิ้น",
      detail: `${stop.place_name} · ${duration} นาที${note ? ` · ${note}` : ""}`,
      sales: route.rep,
      created_at: completedAt.toISOString(),
      action_url: `/app/route-completed/${routeId}`,
    };
    set({ teamNotifications: [missionNotif, ...get().teamNotifications] });
    if (SUPABASE_ENABLED && supabase) {
      supabase.from("team_notifications").insert(missionNotif).then(({ error }) => {
        if (error) console.error("[supabase] insert mission notification ล้มเหลว:", error);
      });
    }
  },
    }),
    {
      // v2: เปลี่ยน name → ล้าง localStorage เก่าที่มี seeded data / base64 ปนอยู่
      // ข้อมูลจริงทั้งหมดโหลดจาก Supabase ทันทีที่ app mount
      name: "std-crm-store-v2",
      storage: createJSONStorage(() => {
        // Wrapper รอบ localStorage ที่จัดการ QuotaExceededError ได้
        return {
          getItem: (key) => {
            try { return localStorage.getItem(key); } catch { return null; }
          },
          setItem: (key, value) => {
            try {
              localStorage.setItem(key, value);
            } catch (e) {
              // localStorage เต็ม → ลบ key เก่าแล้ว retry ครั้งเดียว
              console.warn("[persist] localStorage เต็ม — ลบข้อมูลเก่าแล้ว retry", e);
              try { localStorage.removeItem(key); localStorage.setItem(key, value); } catch { /* ignore */ }
            }
          },
          removeItem: (key) => {
            try { localStorage.removeItem(key); } catch { /* ignore */ }
          },
        };
      }),
      partialize: (state) => ({
        // ──────────────────────────────────────────────────────────────────
        // สิ่งที่ persist:
        //   routes + stops (ไม่เอา data URL) → Mission ยังทำต่อได้หลัง refresh
        //   currentRep → จำการเลือก rep ไว้
        //   customers, leads, targets → โหลดเร็วก่อน Supabase ตอบกลับ
        //
        // สิ่งที่ไม่ persist (โหลดจาก Supabase ทุกครั้ง หรือ ใหญ่เกินไป):
        //   contentTemplates → มี base64 PNG (~500KB-2MB/ชิ้น) → overflow localStorage
        //   chatMessages / teamNotifications → limit 100 ไม่ให้บวม
        //   contentPosts → ดึงจาก Supabase
        //   quotations → ดึงจาก Supabase
        // ──────────────────────────────────────────────────────────────────
        currentRep: state.currentRep,
        customers:  state.customers,
        leads:      state.leads,
        targets:    state.targets,
        // strip data URL ออก — เก็บแค่ public URL (http/https)
        routes: state.routes
          .filter((r) => /^R\d{10,}/.test(r.route_id)) // เก็บเฉพาะ real routes (timestamp ID)
          .map((r) => ({
            ...r,
            stops: r.stops.map((s) => ({
              ...s,
              field_photo_url: s.field_photo_url?.startsWith("data:") ? undefined : s.field_photo_url,
            })),
          })),
        // จำกัดขนาด — ป้องกัน localStorage บวม
        chatMessages:      state.chatMessages.slice(-100),
        teamNotifications: state.teamNotifications.slice(0, 50),
        contentPosts:      state.contentPosts,
        // contentTemplates ไม่ persist → base64 images ทำให้ localStorage เต็ม
        // (templates จะหายหลัง refresh — ต้องเพิ่ม Supabase table ถ้าอยากให้คงอยู่)
      }),
    }
  )
);

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