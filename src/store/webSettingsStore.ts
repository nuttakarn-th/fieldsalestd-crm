/**
 * webSettingsStore — ตั้งค่าระบบ Web Setting
 * - pageHelp: คำอธิบายสั้นๆ แต่ละหน้า (Admin แก้ไขได้)
 * - botSettings: การตั้งค่า Chat Bot
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

// ───────────────────────────────────────────────────────────────────────────
// Page Help texts (default ไว้ใน PageHelp.tsx แต่ Admin แก้ใน Web Setting)
// ───────────────────────────────────────────────────────────────────────────
export const PAGE_HELP_DEFAULTS: Record<string, string> = {
  "service-stock":        "คลังข้อมูลบริการ — ทัวร์, รถเช่า, ตั๋ว, โรงแรม, วีซ่า, ประกัน · เพิ่ม/แก้ไขได้ตามสิทธิ์ Role",
  "customers":            "รายชื่อลูกค้าและ Lead — เพิ่มใหม่, ติดตามสถานะ, สร้าง Quote และดูประวัติการซื้อ",
  "pipeline":             "ติดตามดีลแต่ละขั้น ตั้งแต่ New Lead จนถึง Closed Won/Lost แบบ Kanban",
  "followup":             "ปฏิทิน Follow Up — แสดง Lead ที่ถึงกำหนดติดตาม พร้อมบันทึกผลการโทร",
  "mission":              "Check-in หน้างาน — เริ่ม/จบแต่ละจุดเยี่ยม บันทึกผล ถ่ายรูป และปักพิกัด GPS",
  "planning":             "วางแผนเส้นทางขาย — สร้าง Route, เรียงลำดับจุดเยี่ยม และกำหนดวันออกเดินทาง",
  "executive-dashboard":  "ภาพรวมยอดขายทีม — KPI, ดีลที่ปิดได้, รายรับ, Pipeline และเปรียบเทียบยอดขาย",
  "quotation":            "สร้างใบเสนอราคา/ใบแจ้งหนี้ — เลือกบริการจาก Stock ราคาอัตโนมัติ ส่งลูกค้าได้ทันที",
  "financial-report":     "รายงานการเงิน — สรุปรายรับ, ยอดค้างชำระ และกระแสเงินสดของบริษัท",
  "sales-mission":        "ติดตาม Mission Sales ทั้งทีม — ดูสถิติ Route ที่ Complete, กรองตามช่วงเวลา และ Export PDF",
  "targets":              "เป้าหมายยอดขายรายคนและทีม — ตั้งเป้า, ติดตามความก้าวหน้าและเปรียบเทียบ",
  "heatmap":              "แผนที่ Heatmap — ความหนาแน่นลูกค้าตามจังหวัด วิเคราะห์พื้นที่ที่มีโอกาสขาย",
  "booking-overview":     "ภาพรวมการจองทั้งหมด — ทัวร์, รถเช่า, ตั๋วและบริการอื่นๆ พร้อมสถานะการชำระ",
  "campaigns":            "จัดการแคมเปญการตลาด — สร้าง, กำหนด Audience และติดตามผลแคมเปญ",
  "contents":             "Content Calendar, ลิงก์โปรแกรมทัวร์, Asset Library และ Post Performance ครบในที่เดียว",
  "marketing-leads":      "รายชื่อ Prospect ที่ Marketing ลงข้อมูลไว้ — Sales กดขอ Lead ไปติดตามได้",
  "payment":              "บันทึกการรับชำระเงิน — อัปโหลดสลิป, ติดตามสถานะและออกใบเสร็จ",
  "ob-dashboard":         "ภาพรวมงาน OB — ดูสถานะ Booking ทัวร์, รายละเอียดกรุ๊ปและงานค้างส่งมอบ",
};

// ───────────────────────────────────────────────────────────────────────────
// Bot Settings
// ───────────────────────────────────────────────────────────────────────────
export interface BotSettings {
  enabled: boolean;
  /** อนุญาตให้ถามเกี่ยวกับข้อมูล Stock (ทัวร์, รถ, โรงแรม, ฯลฯ) */
  allowStockQuery: boolean;
  /** อนุญาตให้ถามเกี่ยวกับข้อมูลลูกค้าของตัวเอง */
  allowMyCustomers: boolean;
  /** อนุญาตให้ถามเกี่ยวกับลูกค้าคนอื่น (Manager/Admin เท่านั้น) */
  allowOtherCustomers: boolean;
  /** อนุญาตให้ถามเรื่องทั่วไป (สภาพอากาศ, ข่าว, การวางแผน ฯลฯ) */
  allowGeneral: boolean;
  /** ตอบกลับเป็นตารางเมื่อข้อมูลมาก */
  tableResponse: boolean;
  /** เรียนรู้คำถามและแสดง Card ตัวเลือกถัดไป */
  smartSuggest: boolean;
  /** ลักษณะการตอบ */
  tone: "concise" | "detailed" | "friendly";
}

const defaultBotSettings: BotSettings = {
  enabled: true,
  allowStockQuery: true,
  allowMyCustomers: true,
  allowOtherCustomers: false,
  allowGeneral: true,
  tableResponse: true,
  smartSuggest: true,
  tone: "friendly",
};

// ───────────────────────────────────────────────────────────────────────────
// Store
// ───────────────────────────────────────────────────────────────────────────
interface WebSettingsState {
  /** คำอธิบายแต่ละหน้า — key = pageKey */
  pageHelp: Record<string, string>;
  botSettings: BotSettings;

  setPageHelp: (key: string, text: string) => void;
  resetPageHelp: (key: string) => void;
  setBotSettings: (s: Partial<BotSettings>) => void;
}

export const useWebSettings = create<WebSettingsState>()(
  persist(
    (set) => ({
      pageHelp: {},
      botSettings: defaultBotSettings,

      setPageHelp: (key, text) =>
        set((s) => ({ pageHelp: { ...s.pageHelp, [key]: text } })),

      resetPageHelp: (key) =>
        set((s) => {
          const next = { ...s.pageHelp };
          delete next[key];
          return { pageHelp: next };
        }),

      setBotSettings: (patch) =>
        set((s) => ({ botSettings: { ...s.botSettings, ...patch } })),
    }),
    { name: "stdtour-websettings-v1" },
  ),
);
