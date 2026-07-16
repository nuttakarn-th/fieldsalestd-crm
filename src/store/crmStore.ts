import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";
import { toast } from "sonner";
import { useServices } from "@/store/serviceStore";
import { useAuth } from "@/store/authStore";
import { logActivity } from "@/lib/activityLog";

export type Source = "Field Sale" | "FB" | "Line OA" | "Website" | "TikTok" | "Google" | "Walk-in" | "Referral" | "Agent";
export type Tier = "New" | "Regular" | "VIP";
export type Segment = "B2C Individual" | "B2C Group" | "B2B Agent" | "Corporate";
export type LeadStatus = "New" | "Contacted" | "Quotation Sent" | "Negotiating" | "Closed Won" | "Closed Lost"
  | "ตอบแล้ว" | "กำลังเจรจา" | "จองแล้ว" | "ยกเลิก"; // OB stages
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
  period_id?: string;     // FK → TourPeriod.period_id (ระบุ period ที่เลือก)
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
  contact_name?: string;   // ชื่อผู้ประสานงาน (ไม่บังคับ)
  stop_urgency?: Urgency;  // Cold/Warm/Hot (ไม่บังคับ)
}
export interface RoutePlan {
  route_id: string;
  rep: SalesRep;
  date: string; // YYYY-MM-DD
  title: string;
  stops: RouteStop[];
  created_at: string;
  // ── Check-in / Check-out ──────────────────────────────────────────
  has_checkin?: boolean;   // เริ่มจากออฟฟิศ (default true)
  has_checkout?: boolean;  // กลับออฟฟิศ    (default true)
  checkin_at?: string;     // ISO timestamp เมื่อ check-in จริง
  checkout_at?: string;    // ISO timestamp เมื่อ check-out จริง
  checkin_lat?: number;    // GPS lat ณ check-in
  checkin_lng?: number;    // GPS lng ณ check-in
  checkout_lat?: number;   // GPS lat ณ check-out
  checkout_lng?: number;   // GPS lng ณ check-out
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
export type ContentChannel  = "Facebook" | "Instagram" | "TikTok" | "LINE" | "YouTube" | "Lemon8" | "X" | "LinkedIn";
export type ContentType     = "Single Photo" | "Photo Album" | "Short VDO" | "Long VDO";
export interface ContentPost {
  post_id:          string;
  title:            string;
  caption:          string;
  channels:         ContentChannel[];   // multi-select platforms (เปลี่ยนจาก channel เดิม)
  content_type:     ContentType;        // ประเภท content
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
export const CONTENT_CHANNELS: ContentChannel[] = ["Facebook", "Instagram", "TikTok", "LINE", "YouTube", "Lemon8", "X", "LinkedIn"];
export const CONTENT_STATUSES: ContentStatus[]  = ["Draft", "Scheduled", "Published", "Done"];
export const CONTENT_TYPES:    ContentType[]    = ["Single Photo", "Photo Album", "Short VDO", "Long VDO"];

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
export const OB_LEAD_STATUSES: LeadStatus[] = ["ตอบแล้ว", "กำลังเจรจา", "จองแล้ว", "ยกเลิก"];
export const OB_STAGE_META: Record<string, { emoji: string; desc: string; color: string }> = {
  "ตอบแล้ว":    { emoji: "📨", desc: "ส่งโปรแกรม+ราคาแล้ว รอลูกค้า",       color: "sky"     },
  "กำลังเจรจา": { emoji: "💬", desc: "ลูกค้าตอบมา อยู่ระหว่างคุย/ต่อรอง",  color: "amber"   },
  "จองแล้ว":    { emoji: "✅", desc: "ชำระมัดจำแล้ว ปิดการขายสำเร็จ",      color: "success" },
  "ยกเลิก":     { emoji: "❌", desc: "ลูกค้าไม่จอง พร้อมระบุเหตุผล",        color: "red"     },
};
export const isObStatus = (s: LeadStatus) => (OB_LEAD_STATUSES as string[]).includes(s);
export const isClosedStatus = (s: LeadStatus) => s === "Closed Won" || s === "จองแล้ว";
export const isLostStatus   = (s: LeadStatus) => s === "Closed Lost" || s === "ยกเลิก";
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
  /** เมื่อ admin เปลี่ยนชื่อ user → อัปเดต in-memory state ทั้งหมดทันที
   *  (Supabase ON UPDATE CASCADE จัดการ DB แล้ว — นี่แค่ sync RAM) */
  renameRepInMemory: (oldName: SalesRep, newName: SalesRep) => void;
  setCurrentRep: (r: SalesRep | "All") => void;
  loadCustomersFromSupabase: () => Promise<void>;
  loadAllFromSupabase: () => Promise<void>;
  loadRouteFromSupabase: (routeId: string) => Promise<void>;
  addCustomer: (c: Omit<Customer, "customer_id" | "total_trips" | "total_spend" | "customer_tier" | "first_contact_date" | "created_by"> & { created_by?: SalesRep }) => string;
  updateCustomer: (id: string, patch: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  transferCustomer: (id: string, toRep: SalesRep) => void;
  addLead: (l: Omit<Lead, "lead_id" | "status" | "closed_date" | "lost_reason" | "lead_category" | "scope"> & { status?: LeadStatus; lead_category?: LeadCategory; scope?: TripScope }) => void;
  updateLeadStatus: (leadId: string, status: LeadStatus, lostReason?: string) => void;
  updateLead: (leadId: string, patch: Partial<Lead>) => void;
  addFollowupLog: (leadId: string, log: Omit<FollowupLog, "log_id" | "lead_id">) => void;
  setTarget: (month: string, rep: SalesRep, patch: Partial<Omit<MonthlyTarget, "month" | "rep">>) => void;
  addRoute: (rep: SalesRep, date: string, title: string, hasCheckin?: boolean, hasCheckout?: boolean) => string;
  updateRoute: (id: string, patch: Partial<Omit<RoutePlan, "route_id" | "stops">>) => void;
  checkinRoute: (routeId: string, lat: number, lng: number) => Promise<void>;
  checkoutRoute: (routeId: string, lat: number, lng: number) => Promise<void>;
  deleteRoute: (id: string) => Promise<void>;
  addStop: (routeId: string, stop: Omit<RouteStop, "stop_id" | "route_id" | "seq" | "status">) => void;
  updateStop: (routeId: string, stopId: string, patch: Partial<RouteStop>) => void;
  deleteStop: (routeId: string, stopId: string) => void;
  reorderStops: (routeId: string, orderedStopIds: string[]) => void;
  skipStop: (routeId: string, stopId: string, targetDate: string) => void;
  startStop: (routeId: string, stopId: string) => void;
  cancelStop: (routeId: string, stopId: string) => void;
  completeStop: (routeId: string, stopId: string, note?: string, photoName?: string, photoUrl?: string, lat?: number, lng?: number, contactName?: string, stopUrgency?: Urgency) => void;
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

  renameRepInMemory: (oldName, newName) => {
    // อัปเดต in-memory state ทันทีหลัง Supabase CASCADE เสร็จ
    // ครอบคลุมทุก field ที่เก็บชื่อ user แบบ denormalized
    const s = get();
    set({
      customers: s.customers.map((c) => ({
        ...c,
        created_by:      c.created_by === oldName ? newName : c.created_by,
        transferred_to:  c.transferred_to === oldName ? newName : c.transferred_to,
        transferred_from: c.transferred_from === oldName ? newName : c.transferred_from,
      })),
      leads: s.leads.map((l) => ({
        ...l,
        assigned_to: l.assigned_to === oldName ? newName : l.assigned_to,
      })),
      targets: s.targets.map((t) => ({
        ...t,
        rep: t.rep === oldName ? newName : t.rep,
      })),
      routes: s.routes.map((r) => ({
        ...r,
        rep: r.rep === oldName ? newName : r.rep,
      })),
      chatMessages: s.chatMessages.map((m) => ({
        ...m,
        author: (m.author as string) === oldName
          ? (newName as ChatAuthor)
          : m.author,
        mentions: m.mentions?.map((mn) =>
          (mn as string) === oldName ? (newName as ChatAuthor) : mn,
        ),
      })),
      teamNotifications: s.teamNotifications.map((n) => ({
        ...n,
        sales: n.sales === oldName ? newName : n.sales,
      })),
      currentRep: s.currentRep === oldName ? newName : s.currentRep,
    });
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
    // ── Double-load guard ────────────────────────────────────────────────────
    // jwtToken เปลี่ยน 2 ครั้งเร็วๆ กัน (mount → rehydrate) → ป้องกันยิงซ้ำใน 5 วินาที
    const now = Date.now();
    const last = (get() as any)._lastLoadedAt ?? 0;
    if (now - last < 5_000) {
      console.info("[supabase] loadAll skipped (debounce 5s)");
      return;
    }
    (set as any)({ _lastLoadedAt: now });
    // ────────────────────────────────────────────────────────────────────────
    try {
      // ── กำหนด window วันที่สำหรับ route (30 วันล่าสุด) ──────────────────
      const d = new Date();
      d.setDate(d.getDate() - 30);
      const thirtyDaysAgo = d.toISOString().slice(0, 10); // YYYY-MM-DD

      // ── App-level security filter ────────────────────────────────────────
      // ระบบใช้ custom auth (ไม่ใช่ Supabase Auth) → RLS ใช้ auth.uid() ไม่ได้
      // แก้: กรองข้อมูลที่ application layer แทน
      // Sales เห็นแค่ข้อมูลตัวเอง | Manager/Admin เห็นทั้งทีม
      const authState = useAuth.getState();
      const currentUser = authState.users.find((u) => u.user_id === authState.currentUserId);
      const isSalesOnly = currentUser?.role === "Sales" || currentUser?.role === "OB Co-ordinator";
      const isManager  = currentUser?.role === "Sales Manager";
      // OB Co-ordinator full_names — ใช้ block Manager ไม่ให้เห็น OB data (app-level double-layer)
      const obUserNames = new Set(
        authState.users
          .filter((u) => u.role === "OB Co-ordinator")
          .map((u) => u.full_name)
      );
      // JSON.stringify ใส่ "" รอบชื่อ → รองรับชื่อที่มีเว้นวรรค เช่น "โดนัท สาวงาม"
      const repFilter = JSON.stringify(currentUser?.full_name ?? "");

      // ── build queries แบบ conditional ───────────────────────────────────
      const custSelect =
        "customer_id,full_name,company,phone,line_id,email,province,birthday,interests," +
        "note,last_contacted_at,source,segment,total_trips,total_spend,customer_tier," +
        "first_contact_date,created_by,transferred_to,transferred_from,transferred_at," +
        "transfer_logs,created_at";

      const custQ = supabase.from("customers").select(custSelect).order("created_at", { ascending: false }).limit(500);
      const leadsQ = supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(500);
      const routesQ = supabase
        .from("route_plans")
        .select("*, route_stops (*)")
        .gte("date", thirtyDaysAgo)
        .order("date", { ascending: false })
        .limit(60);

      // Sales: กรองเฉพาะข้อมูลของตัวเอง
      const custFiltered  = isSalesOnly ? custQ.or(`created_by.eq.${repFilter},transferred_to.eq.${repFilter}`) : custQ;
      const leadsFiltered = isSalesOnly ? leadsQ.eq("assigned_to", currentUser?.full_name ?? "") : leadsQ;
      const routesFiltered = isSalesOnly ? routesQ.eq("rep", currentUser?.full_name ?? "") : routesQ;

      // ── โหลด 2 รอบ: critical data ก่อน → secondary ตาม ────────────────────
      // รอบ 1 (critical): customers + leads + targets → Dashboard แสดงเลยทันที
      const [customers, leads, targets] = await Promise.all([
        custFiltered,
        leadsFiltered,
        supabase.from("monthly_targets").select("*"),
      ]);

      // อัปเดต critical data ทันที (Dashboard เห็นตัวเลขเลย ไม่ต้องรอ routes/chat)
      const loadedSummary: string[] = [];
      const criticalUpdates: Partial<CRMState> = {};

      if (!customers.error && customers.data) {
        // ── Reconciliation: re-insert local-only customers ──────────────────────────
        // ปัญหา: addCustomer → INSERT → Supabase อาจล้มเหลวเงียบๆ (JWT หมดอายุ, network)
        //        ข้อมูลจึงอยู่แค่ใน localStorage ของเครื่องนั้น ไม่ถึง device อื่น
        // แก้:   ตอน loadAll ครั้งต่อไป → เปรียบเทียบ local กับ Supabase
        //        พบ local-only → re-insert ให้อัตโนมัติ (idempotent: timestamp ID ไม่ซ้ำ)
        const supaIds = new Set((customers.data as Customer[]).map((c) => c.customer_id));
        const localOnly = get().customers.filter((c) => !supaIds.has(c.customer_id));
        if (localOnly.length > 0 && supabase) {
          console.warn(`[sync] พบ ${localOnly.length} ลูกค้าใน local ที่ไม่มีใน Supabase → re-insert`);
          localOnly.forEach((c) => {
            supabase!.from("customers").insert(c).then(({ error: e }) => {
              if (e) console.error("[sync] re-insert ล้มเหลว:", c.full_name, e.message);
              else   console.log("[sync] re-insert สำเร็จ:", c.full_name);
            });
          });
          // merge: รวม Supabase data + local-only เข้าด้วยกัน
          criticalUpdates.customers = [...(customers.data as Customer[]), ...localOnly];
        } else {
          criticalUpdates.customers = customers.data as Customer[];
        }
      }

      if (!leads.error && leads.data)         criticalUpdates.leads     = leads.data     as Lead[];
      if (!targets.error && targets.data)     criticalUpdates.targets   = targets.data   as MonthlyTarget[];
      // Sales Manager: กรอง OB Co-ordinator data ออก (app-level double-layer — RLS กรองที่ DB แล้ว)
      if (isManager && obUserNames.size > 0) {
        if (criticalUpdates.customers) {
          criticalUpdates.customers = criticalUpdates.customers.filter(
            (c) => !obUserNames.has(c.created_by)
          );
        }
        if (criticalUpdates.leads) {
          criticalUpdates.leads = criticalUpdates.leads.filter(
            (l) => !obUserNames.has(l.assigned_to)
          );
        }
      }
      if (Object.keys(criticalUpdates).length) set(criticalUpdates);
      if (customers.data?.length) loadedSummary.push(`customers ${customers.data.length}`);
      if (leads.data?.length)     loadedSummary.push(`leads ${leads.data.length}`);

      // รอบ 2 (secondary): routes + chat + notifs + quotations (ไม่บล็อก Dashboard)
      const [quotations, routes, chats, notifs] = await Promise.all([
        supabase.from("quotations").select("*").order("created_at", { ascending: false }),
        routesFiltered,
        supabase.from("chat_messages").select("*").order("created_at", { ascending: true }).limit(200),
        supabase.from("team_notifications").select("*").order("created_at", { ascending: false }).limit(100),
      ]);
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
        // หรือ status เท่ากันแต่ local มีข้อมูลมากกว่า (note, photo, timing)
        const mergedStops = supaStops.map((ss) => {
          const ls = localRoute.stops.find((s) => s.stop_id === ss.stop_id);
          if (!ls) return ss;
          if (STATUS_RANK[ls.status] > STATUS_RANK[ss.status]) return ls;
          // status เท่ากัน (เช่น completed vs completed) → local ชนะถ้ามีข้อมูลมากกว่า
          if (STATUS_RANK[ls.status] === STATUS_RANK[ss.status] && ls.status !== "planned") {
            const localRicher =
              (ls.note && !ss.note) ||
              (ls.field_photo_url && !ss.field_photo_url) ||
              (ls.started_at && !ss.started_at) ||
              (ls.completed_at && !ss.completed_at);
            if (localRicher) return ls;
          }
          return ss;
        });
        return { ...r, stops: mergedStops };
      });

      // เก็บ routes ที่มีใน local แต่ยังไม่อยู่ใน Supabase (pending sync)
      // เฉพาะ "real" routes (timestamp ID) — ทิ้ง seeded data เก่า
      // v128 fix: ตรวจ timestamp ใน route_id — เก็บเฉพาะที่สร้างใน 10 นาทีล่าสุด
      // (routes เก่าที่ไม่อยู่ใน Supabase = ถูกลบไปแล้ว ไม่ใช่ pending sync)
      const supaIds = new Set(mergedRoutes.map((r) => r.route_id));
      const TEN_MIN_AGO = Date.now() - 10 * 60 * 1_000;
      const localOnlyRoutes = currentRoutes.filter((r) => {
        if (!isRealRoute(r.route_id)) return false;
        if (supaIds.has(r.route_id)) return false;
        // route_id format: "R" + Date.now() + seq → extract timestamp
        const ts = parseInt(r.route_id.slice(1), 10);
        return ts > TEN_MIN_AGO; // เก็บเฉพาะที่เพิ่งสร้าง < 10 นาที
      });
      if (localOnlyRoutes.length > 0) {
        // eslint-disable-next-line no-console
        console.warn(`[supabase] พบ ${localOnlyRoutes.length} route ที่ยังไม่ sync — เก็บไว้ก่อน`);
      }
      const finalRoutes: RoutePlan[] = [...mergedRoutes, ...localOnlyRoutes];
      // ─────────────────────────────────────────────────────────────────────

      // ── Guard: อัปเดต secondary data (routes/chat/notifs/quotations) ──────────
      // customers/leads/targets set ไปแล้วใน criticalUpdates ด้านบน
      if (customers.error) console.warn("[supabase] customers blocked (RLS?) — keeping local data:", customers.error.message);
      if (leads.error)     console.warn("[supabase] leads blocked — keeping local:", leads.error.message);

      // Sales Manager: กรอง OB data ออกจาก routes + quotations
      const safeRoutes = (isManager && obUserNames.size > 0)
        ? finalRoutes.filter((r) => !obUserNames.has(r.rep))
        : finalRoutes;
      const updates: Partial<CRMState> = {
        routes: safeRoutes, // routes ใช้ smart merge อยู่แล้ว — ปลอดภัย
      };
      if (!quotations.error && quotations.data !== null) {
        const rawQuotations = quotations.data as QuotationDoc[];
        updates.quotations = (isManager && obUserNames.size > 0)
          ? rawQuotations.filter((q) => !obUserNames.has(q.rep))
          : rawQuotations;
        if (quotations.data.length) loadedSummary.push(`quotations ${quotations.data.length}`);
      }
      if (finalRoutes.length) loadedSummary.push(`routes ${finalRoutes.length}`);
      if (!chats.error && chats.data !== null) {
        updates.chatMessages = chats.data as ChatMessage[];
        if (chats.data.length) loadedSummary.push(`chats ${chats.data.length}`);
      } else if (chats.error) {
        console.warn("[supabase] chat_messages blocked — keeping local:", chats.error.message);
      }
      if (!notifs.error && notifs.data !== null) {
        updates.teamNotifications = notifs.data as TeamNotification[];
        if (notifs.data.length) loadedSummary.push(`notifications ${notifs.data.length}`);
      }
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

  loadRouteFromSupabase: async (routeId) => {
    if (!SUPABASE_ENABLED || !supabase) return;
    try {
      const { data, error } = await supabase
        .from("route_plans")
        .select("*, route_stops(*)")
        .eq("route_id", routeId)
        .single();
      if (error || !data) return;

      const supaStops: RouteStop[] = ((data.route_stops as RouteStop[]) || []).sort(
        (a, b) => a.seq - b.seq,
      );
      const currentRoutes = get().routes;
      const localRoute = currentRoutes.find((r) => r.route_id === routeId);

      if (!localRoute) {
        // eslint-disable-next-line no-console
        console.info(`[supabase] loadRoute: route ใหม่ ${routeId} — เพิ่มเข้า store`);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { route_stops: _rs, ...routeData } = data as typeof data & { route_stops: RouteStop[] };
        set({ routes: [{ ...routeData, stops: supaStops } as RoutePlan, ...currentRoutes] });
        return;
      }

      const STOP_STATUS_RANK: Record<StopStatus, number> = {
        planned: 0,
        in_progress: 1,
        completed: 2,
        skipped: 2,
      };

      // ถ้า local มี stop มากกว่า → local กำลัง add ใหม่อยู่ (ยังไม่ sync) → re-sync แล้วคง local
      if (localRoute.stops.length > supaStops.length) {
        const supaStopIds = new Set(supaStops.map((s) => s.stop_id));
        const missingStops = localRoute.stops.filter((s) => !supaStopIds.has(s.stop_id));
        // eslint-disable-next-line no-console
        console.warn(`[supabase] loadRoute: ${missingStops.length} stop ยังไม่ sync → re-upsert`);
        missingStops.forEach((stop) => {
          supabase!.from("route_stops").upsert(stop, { onConflict: "stop_id" }).then(({ error: e }) => {
            if (e) console.error("[supabase] re-sync stop:", stop.stop_id, e);
          });
        });
        return; // คง local stops ไว้ก่อน
      }

      // merge แต่ละ stop: local ชนะถ้า status ไปไกลกว่า หรือมีข้อมูลมากกว่า
      const mergedStops = supaStops.map((ss) => {
        const ls = localRoute.stops.find((s) => s.stop_id === ss.stop_id);
        if (!ls) return ss;
        if (STOP_STATUS_RANK[ls.status] > STOP_STATUS_RANK[ss.status]) return ls;
        if (STOP_STATUS_RANK[ls.status] === STOP_STATUS_RANK[ss.status] && ls.status !== "planned") {
          const localRicher =
            (ls.note && !ss.note) ||
            (ls.field_photo_url && !ss.field_photo_url) ||
            (ls.started_at && !ss.started_at) ||
            (ls.completed_at && !ss.completed_at);
          if (localRicher) return ls;
        }
        return ss;
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { route_stops: _rs2, ...routeData2 } = data as typeof data & { route_stops: RouteStop[] };
      set({
        routes: currentRoutes.map((r) =>
          r.route_id === routeId
            ? { ...r, ...routeData2, stops: mergedStops } as RoutePlan
            : r,
        ),
      });
      // eslint-disable-next-line no-console
      console.info(`[supabase] loadRoute: ${routeId} อัปเดต ${mergedStops.length} stops`);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[supabase] loadRoute ล้มเหลว:", e);
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
    logActivity({
      event_type:  "customer_added",
      actor:       creator,
      subject:     "เพิ่มลูกค้าใหม่",
      detail:      `${newC.full_name}${newC.company && newC.company !== "-" ? ` · ${newC.company}` : ""}`,
      entity_type: "customer",
      entity_id:   id,
      entity_name: newC.full_name,
    });
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
    const cust = get().customers.find((c) => c.customer_id === id);
    // ลบ customer + leads ทั้งหมดที่ผูกกับ customer_id นี้พร้อมกัน
    set({
      customers: get().customers.filter((c) => c.customer_id !== id),
      leads: get().leads.filter((l) => l.customer_id !== id),
    });
    if (SUPABASE_ENABLED && supabase) {
      // ลบ leads ก่อน (FK constraint) แล้วค่อยลบ customer
      supabase.from("leads").delete().eq("customer_id", id).then(({ error }) => {
        if (error) console.error("[supabase] delete leads ล้มเหลว:", error);
      });
      supabase.from("customers").delete().eq("customer_id", id).then(({ error }) => {
        if (error) console.error("[supabase] delete customer ล้มเหลว:", error);
      });
    }
    if (cust) {
      logActivity({
        event_type:  "customer_deleted",
        actor:       cust.created_by ?? "ระบบ",
        subject:     "ลบลูกค้า",
        detail:      `${cust.full_name}${cust.company && cust.company !== "-" ? ` · ${cust.company}` : ""}`,
        entity_type: "customer",
        entity_id:   id,
        entity_name: cust.full_name,
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
    const cust = get().customers.find((c) => c.customer_id === l.customer_id);
    logActivity({
      event_type:  "lead_added",
      actor:       l.sales_rep ?? "ระบบ",
      subject:     "สร้าง Lead ใหม่",
      detail:      `${cust?.full_name ?? l.customer_id} · ${l.bu_type} · ${l.pax_count} pax`,
      entity_type: "lead",
      entity_id:   id,
      entity_name: cust?.full_name ?? l.customer_id,
    });
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
      lost_reason: isLostStatus(status) ? lostReason ?? null : null,
      closed_date: isClosedStatus(status) || isLostStatus(status) ? today : lead.closed_date,
      next_followup_date: isClosedStatus(status) || isLostStatus(status) ? null : lead.next_followup_date,
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
      const { adjustQuota, adjustPeriodQuota } = useServices.getState();
      if (isClosedStatus(status) && !isClosedStatus(prevStatus)) {
        if (lead.period_id) {
          // ปิดดีลทัวร์ multi-period → ตัดที่นั่ง period ที่ระบุ
          adjustPeriodQuota(lead.tour_id, lead.period_id, -lead.pax_count);
        } else {
          adjustQuota(lead.tour_id, -lead.pax_count);
        }
      } else if (isClosedStatus(prevStatus) && !isClosedStatus(status)) {
        if (lead.period_id) {
          // ยกเลิกดีลที่เคย Won → คืนที่นั่ง period กลับ
          adjustPeriodQuota(lead.tour_id, lead.period_id, +lead.pax_count);
        } else {
          adjustQuota(lead.tour_id, +lead.pax_count);
        }
      }
    }

    if (isClosedStatus(status)) {
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

    // Activity log
    {
      const cust = get().customers.find((c) => c.customer_id === lead.customer_id);
      const custName = cust?.full_name ?? lead.customer_id;
      const eventType = isClosedStatus(status)
        ? "lead_won"
        : isLostStatus(status)
          ? "lead_lost"
          : "lead_status_changed";
      logActivity({
        event_type:  eventType,
        actor:       lead.sales_rep ?? "ระบบ",
        subject:     isClosedStatus(status)
          ? "ปิดดีล ✅"
          : isLostStatus(status)
            ? "เสีย Lead ❌"
            : `เปลี่ยนสถานะ Lead → ${status}`,
        detail:      `${custName} · ${lead.bu_type} · ${lead.pax_count} pax`,
        entity_type: "lead",
        entity_id:   leadId,
        entity_name: custName,
        meta:        { prev_status: prevStatus, new_status: status },
      });
    }
  },

  addRoute: (rep, date, title, hasCheckin = true, hasCheckout = true) => {
    const id = `R${Date.now()}`; // timestamp-based — ไม่ชนกับ ID เก่า
    const r: RoutePlan = { route_id: id, rep, date, title, stops: [], created_at: new Date().toISOString(), has_checkin: hasCheckin, has_checkout: hasCheckout };
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

  checkinRoute: async (routeId, lat, lng) => {
    const now = new Date().toISOString();
    const patch = { checkin_at: now, checkin_lat: lat, checkin_lng: lng };
    set({ routes: get().routes.map((r) => r.route_id === routeId ? { ...r, ...patch } : r) });
    if (SUPABASE_ENABLED && supabase) {
      const { error } = await supabase.from("route_plans").update(patch).eq("route_id", routeId);
      if (error) console.error("[supabase] checkin route ล้มเหลว:", error);
    }
  },

  checkoutRoute: async (routeId, lat, lng) => {
    const now = new Date().toISOString();
    const patch = { checkout_at: now, checkout_lat: lat, checkout_lng: lng };
    set({ routes: get().routes.map((r) => r.route_id === routeId ? { ...r, ...patch } : r) });
    if (SUPABASE_ENABLED && supabase) {
      const { error } = await supabase.from("route_plans").update(patch).eq("route_id", routeId);
      if (error) console.error("[supabase] checkout route ล้มเหลว:", error);
    }
  },

  deleteRoute: async (id) => {
    // Optimistic remove จาก local state ก่อน
    const backup = get().routes.find((r) => r.route_id === id);
    set({ routes: get().routes.filter((r) => r.route_id !== id) });
    if (SUPABASE_ENABLED && supabase) {
      // CASCADE delete จะลบ stops อัตโนมัติ
      const { error } = await supabase.from("route_plans").delete().eq("route_id", id);
      if (error) {
        // Rollback: คืน route กลับถ้า Supabase delete ล้มเหลว
        if (backup) set({ routes: [...get().routes, backup] });
        console.error("[supabase] delete route ล้มเหลว:", error);
        toast.error("ลบ Route ล้มเหลว — กรุณา Login ใหม่แล้วลองอีกครั้ง");
      }
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
  cancelStop: (routeId, stopId) => {
    // รีเซ็ต in_progress → planned (เผลอกด "ทำ Mission")
    get().updateStop(routeId, stopId, { status: "planned", started_at: undefined });
  },
  completeStop: (routeId, stopId, note, photoName, photoUrl, lat, lng, contactName, stopUrgency) => {
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
      contact_name: contactName || stop.contact_name,
      stop_urgency: stopUrgency ?? stop.stop_urgency,
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
        // v97 performance: ลด localStorage payload ให้เล็กลง
        //
        // สิ่งที่ persist (core fields เท่านั้น):
        //   routes + stops (ไม่เอา data URL) → Mission ยังทำต่อได้หลัง refresh
        //   customers: เก็บแค่ core fields ที่ใช้บ่อย
        //              ตัด: transfer_logs (JSON array ใหญ่), note ยาวๆ
        //              → โหลด full detail เมื่อเปิด CustomerDetail
        //   leads, targets → เก็บเต็ม (ขนาดไม่ใหญ่)
        //
        // สิ่งที่ไม่ persist:
        //   currentRep → ไม่ persist เพื่อป้องกัน: Sales user login แล้ว persist ชื่อ
        //                ลง localStorage → Manager login บน browser เดิม → โหลดค่าเก่า
        //                มา → เห็นข้อมูลแค่ Sales คนก่อน แทนที่จะเห็นภาพรวมทีม
        //                แก้: ให้ AppLayout.tsx set currentRep ตาม role ทุกครั้ง login
        //   contentTemplates → base64 PNG ~500KB-2MB/ชิ้น → overflow localStorage
        //   chatMessages / teamNotifications → limit ไม่ให้บวม
        //   contentPosts, quotations → ดึงจาก Supabase
        // ──────────────────────────────────────────────────────────────────
        // customers: เก็บแค่ core fields ที่ใช้แสดงในรายการ/ค้นหา
        // field หนักอย่าง transfer_logs / note โหลดจาก Supabase เมื่อเปิด detail
        customers: state.customers.map((c) => ({
          customer_id:       c.customer_id,
          full_name:         c.full_name,
          company:           c.company,
          phone:             c.phone,
          line_id:           c.line_id,
          email:             c.email,
          source:            c.source,
          segment:           c.segment,
          total_trips:       c.total_trips,
          total_spend:       c.total_spend,
          customer_tier:     c.customer_tier,
          first_contact_date: c.first_contact_date,
          created_by:        c.created_by,
          transferred_to:    c.transferred_to,
          created_at:        c.created_at,
          last_contacted_at: c.last_contacted_at,
          // ไม่เก็บ: transfer_logs, note, interests, province, birthday
        })),
        leads:   state.leads,
        targets: state.targets,
        // routes: เฉพาะ real routes 30 วันล่าสุด (cap 60) + strip data URL
        routes: state.routes
          .filter((r) => /^R\d{10,}/.test(r.route_id))
          .slice(0, 60)
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
    // OB stages
    case "ตอบแล้ว":    return "bg-sky-100 text-sky-700 border-sky-300";
    case "กำลังเจรจา": return "bg-amber-100 text-amber-700 border-amber-300";
    case "จองแล้ว":    return "bg-success/15 text-success border-success/30";
    case "ยกเลิก":     return "bg-red-100 text-red-700 border-red-300";
  }
};

export const urgencyBadge = (u: Urgency) => {
  if (u === "Hot") return "bg-destructive/15 text-destructive border-destructive/30";
  if (u === "Warm") return "bg-warning/20 text-warning-foreground border-warning/40";
  return "bg-sky-100 text-sky-700 border-sky-300";
};