export type VisitStatus = "planned" | "in_progress" | "completed" | "skipped";
export type CustomerTier = "VIP" | "Regular" | "New";

export interface Customer {
  id: string;
  name: string;
  company: string;
  tier: CustomerTier;
  phone: string;
  address: string;
  district: string;
  // mock GPS coordinates as percentages on the map canvas (0-100)
  lat: number;
  lng: number;
  potential: number;
  lastVisit: string;
  notes: string;
}

export interface Visit {
  id: string;
  customerId: string;
  rep: string;
  scheduledTime: string; // HH:mm
  status: VisitStatus;
  checkInAt?: string;
  checkOutAt?: string;
  durationMin?: number;
  outcome?: "quoted" | "follow_up" | "closed" | "not_interested";
  notes?: string;
}

export interface Quotation {
  id: string;
  customerId: string;
  rep: string;
  program: string;
  pax: number;
  pricePerPax: number;
  total: number;
  status: "Draft" | "Sent" | "Negotiating" | "Won" | "Lost";
  createdAt: string;
  travelMonth: string;
}

export interface SalesRep {
  id: string;
  name: string;
  avatar: string;
  role: string;
  visitsToday: number;
  visitsTarget: number;
  pipeline: number;
  closed: number;
}

export const SALES_REPS: SalesRep[] = [
  { id: "r1", name: "เฟิร์ส ภาคิน", avatar: "🧑‍💼", role: "Senior Field Sales", visitsToday: 6, visitsTarget: 8, pipeline: 1240000, closed: 480000 },
  { id: "r2", name: "โดนัท พิมพ์ชนก", avatar: "👩‍💼", role: "Field Sales", visitsToday: 5, visitsTarget: 6, pipeline: 890000, closed: 320000 },
  { id: "r3", name: "ปาม วรินทร", avatar: "🧑‍💻", role: "Field Sales", visitsToday: 4, visitsTarget: 6, pipeline: 670000, closed: 210000 },
  { id: "r4", name: "บีม กิตติพงษ์", avatar: "👨‍💼", role: "Junior Field Sales", visitsToday: 3, visitsTarget: 5, pipeline: 410000, closed: 120000 },
];

export const CUSTOMERS: Customer[] = [
  { id: "c1", name: "คุณสมชาย ใจดี", company: "บจก. เอสบี แทรเวล", tier: "VIP", phone: "081-234-5678", address: "อาคารเอ็มไพร์ ชั้น 24", district: "สาทร", lat: 38, lng: 28, potential: 450000, lastVisit: "2 สัปดาห์ก่อน", notes: "สนใจทัวร์คุนหมิงสำหรับทีม 30 คน" },
  { id: "c2", name: "คุณมานี รักไทย", company: "บมจ. พัฒนาดี", tier: "VIP", phone: "089-555-1122", address: "อาคารสีลมคอมเพล็กซ์", district: "สีลม", lat: 42, lng: 32, potential: 680000, lastVisit: "1 เดือนก่อน", notes: "Repeat customer ทำทริปประจำปี" },
  { id: "c3", name: "คุณวิชัย มีทรัพย์", company: "โรงพยาบาลสุขใจ", tier: "Regular", phone: "086-777-3344", address: "ถ.พระราม 4", district: "คลองเตย", lat: 55, lng: 45, potential: 220000, lastVisit: "3 วันก่อน", notes: "Outing พนักงาน Q2" },
  { id: "c4", name: "คุณศิริพร พาณิชย์", company: "บริษัท คอร์ปอเรท ไทย", tier: "Regular", phone: "098-111-2233", address: "อโศก มอนเทอเรย์", district: "อโศก", lat: 60, lng: 38, potential: 340000, lastVisit: "1 สัปดาห์ก่อน", notes: "ขอใบเสนอทัวร์ฉงชิ่ง" },
  { id: "c5", name: "คุณณัฐวุฒิ มั่นคง", company: "มหาวิทยาลัยเทคโนโลยี", tier: "New", phone: "084-999-8877", address: "ถนนพหลโยธิน", district: "จตุจักร", lat: 45, lng: 18, potential: 180000, lastVisit: "ยังไม่เคยพบ", notes: "Lead ใหม่จาก Line OA" },
  { id: "c6", name: "คุณปิติ เจริญสุข", company: "บจก. ทองทวี", tier: "VIP", phone: "081-444-5566", address: "เซ็นทรัลเวิลด์", district: "ปทุมวัน", lat: 52, lng: 30, potential: 520000, lastVisit: "5 วันก่อน", notes: "ตัดสินใจสัปดาห์นี้" },
  { id: "c7", name: "คุณสุดา รุ่งเรือง", company: "Hotel Group BKK", tier: "Regular", phone: "087-222-3344", address: "ถ.สุขุมวิท 21", district: "วัฒนา", lat: 65, lng: 35, potential: 290000, lastVisit: "2 สัปดาห์ก่อน", notes: "ทัวร์ภายในประเทศสำหรับลูกค้าโรงแรม" },
  { id: "c8", name: "คุณกิตติ ทรัพย์มาก", company: "Tech Solutions", tier: "New", phone: "082-666-7788", address: "True Digital Park", district: "พระโขนง", lat: 72, lng: 50, potential: 160000, lastVisit: "ยังไม่เคยพบ", notes: "Outing นักพัฒนา" },
];

const today = new Date().toISOString().split("T")[0];

export const VISITS: Visit[] = [
  { id: "v1", customerId: "c1", rep: "r1", scheduledTime: "09:00", status: "completed", checkInAt: "09:05", checkOutAt: "09:48", durationMin: 43, outcome: "quoted", notes: "นำเสนอแพ็กเกจ DR คุนหมิง" },
  { id: "v2", customerId: "c2", rep: "r1", scheduledTime: "10:30", status: "completed", checkInAt: "10:35", checkOutAt: "11:20", durationMin: 45, outcome: "follow_up", notes: "ลูกค้าขอเวลาตัดสินใจ 1 สัปดาห์" },
  { id: "v3", customerId: "c6", rep: "r1", scheduledTime: "13:00", status: "in_progress", checkInAt: "13:08", notes: "กำลังนำเสนอ" },
  { id: "v4", customerId: "c4", rep: "r1", scheduledTime: "15:00", status: "planned" },
  { id: "v5", customerId: "c3", rep: "r1", scheduledTime: "16:30", status: "planned" },
  { id: "v6", customerId: "c5", rep: "r2", scheduledTime: "09:30", status: "completed", checkInAt: "09:32", checkOutAt: "10:15", durationMin: 43, outcome: "quoted" },
  { id: "v7", customerId: "c7", rep: "r2", scheduledTime: "14:00", status: "planned" },
  { id: "v8", customerId: "c8", rep: "r3", scheduledTime: "11:00", status: "skipped", notes: "ลูกค้าขอเลื่อน" },
];

export const QUOTATIONS: Quotation[] = [
  { id: "q1", customerId: "c1", rep: "r1", program: "HQO-KMG04-DR คุนหมิง โหลวผิง ซากุระ 4 วัน 3 คืน", pax: 30, pricePerPax: 24900, total: 747000, status: "Negotiating", createdAt: today, travelMonth: "มีนาคม" },
  { id: "q2", customerId: "c2", rep: "r1", program: "HQO-KMG05-MU ยูนนาน กุ้ยโจว 6 วัน 5 คืน", pax: 12, pricePerPax: 38900, total: 466800, status: "Sent", createdAt: today, travelMonth: "เมษายน" },
  { id: "q3", customerId: "c4", rep: "r1", program: "HQO-CKG01-PN ฉงชิ่ง ต้าจู๋ 4 วัน 3 คืน", pax: 8, pricePerPax: 22500, total: 180000, status: "Won", createdAt: today, travelMonth: "กุมภาพันธ์" },
  { id: "q4", customerId: "c5", rep: "r2", program: "ทัวร์เชียงราย-เชียงใหม่ 4 วัน 3 คืน", pax: 25, pricePerPax: 8900, total: 222500, status: "Draft", createdAt: today, travelMonth: "พฤษภาคม" },
  { id: "q5", customerId: "c6", rep: "r1", program: "HQO-KMG03-MU คุนหมิง ต้าหลี่ ลี่เจียง 6 วัน 5 คืน", pax: 20, pricePerPax: 32900, total: 658000, status: "Sent", createdAt: today, travelMonth: "พฤษภาคม" },
  { id: "q6", customerId: "c7", rep: "r2", program: "ทัวร์ภูเก็ต-พีพี 3 วัน 2 คืน", pax: 40, pricePerPax: 6500, total: 260000, status: "Negotiating", createdAt: today, travelMonth: "มิถุนายน" },
];

export const formatTHB = (n: number) =>
  new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(n);

export const tierColor = (tier: CustomerTier) => {
  if (tier === "VIP") return "bg-accent/15 text-accent border-accent/30";
  if (tier === "Regular") return "bg-primary/10 text-primary border-primary/30";
  return "bg-muted text-muted-foreground border-border";
};

export const statusColor = (status: VisitStatus) => {
  if (status === "completed") return "bg-success/15 text-success border-success/30";
  if (status === "in_progress") return "bg-warning/20 text-warning-foreground border-warning/40";
  if (status === "skipped") return "bg-destructive/15 text-destructive border-destructive/30";
  return "bg-secondary text-secondary-foreground border-border";
};

export const statusLabel = (status: VisitStatus) => {
  const map: Record<VisitStatus, string> = {
    planned: "วางแผนแล้ว",
    in_progress: "กำลังเยี่ยม",
    completed: "เสร็จสิ้น",
    skipped: "ข้าม",
  };
  return map[status];
};