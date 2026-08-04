/**
 * kpiDefinitionStore.ts
 * เก็บ KPI Definitions ของ 5 ตำแหน่งในทีม Marketing
 * ทุกคนอ่านได้ — Marketing Manager แก้ไขข้อความ/น้ำหนักได้
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KPIItem {
  id: string;
  name: string;        // ชื่อ KPI ภาษาไทย
  nameEn: string;      // ชื่อ KPI ภาษาอังกฤษ
  weight: number;      // 0.30 = 30%
  /** levels[0] = ระดับ 1 (ต่ำสุด), levels[4] = ระดับ 5 (ดีเยี่ยม) */
  levels: [string, string, string, string, string];
  evidence: string;    // แหล่งอ้างอิง / หลักฐาน
}

export interface Competency {
  knowledge: string[];  // K — ความรู้
  skill: string[];      // S — ทักษะ
  attribute: string[];  // A — คุณลักษณะ
}

export interface PositionDefinition {
  positionKey: string;   // "marketing_manager" | "vdo_content" | "content_marketing" | "graphic_designer" | "marketing_executive"
  positionTitle: string; // ชื่อตำแหน่งภาษาไทย/อังกฤษ
  department: string;
  kpis: KPIItem[];
  competency: Competency;
  lastEditedBy?: string;
  lastEditedAt?: string;
}

interface KPIDefinitionState {
  positions: PositionDefinition[];
  /** Marketing Manager แก้ไข KPI item เดี่ยว */
  updateKPIItem: (positionKey: string, kpiId: string, patch: Partial<KPIItem>, editorName: string) => void;
  /** Marketing Manager แก้ไข Competency ทั้ง block */
  updateCompetency: (positionKey: string, competency: Competency, editorName: string) => void;
  /** Reset position กลับ default */
  resetPosition: (positionKey: string) => void;
}

// ─── Seed data (จาก Excel KPI files) ─────────────────────────────────────────

const DEFAULT_POSITIONS: PositionDefinition[] = [
  // ── 1. Marketing Manager ──────────────────────────────────────────────────
  {
    positionKey: "marketing_manager",
    positionTitle: "Marketing Manager",
    department: "Marketing",
    kpis: [
      {
        id: "mm-1",
        name: "ผลลัพธ์รายได้และความคุ้มค่าการตลาดโดยรวม",
        nameEn: "Overall ROAS & Revenue",
        weight: 0.30,
        levels: [
          "รายได้/ROAS รวมต่ำกว่าเป้าหมายมากกว่า 30%",
          "บรรลุเป้า 70–84%",
          "บรรลุเป้า 85–99%",
          "บรรลุเป้า 100–119%",
          "เกินเป้าหมาย ≥ 120% มีผลลัพธ์ที่โดดเด่น",
        ],
        evidence: "Monthly Revenue Report, Ads Performance Dashboard, Finance Report",
      },
      {
        id: "mm-2",
        name: "การพัฒนาและประสิทธิภาพของทีมการตลาด",
        nameEn: "Team Performance & Development",
        weight: 0.25,
        levels: [
          "ทีมขาดทิศทาง งานล่าช้า กระทบเป้าหมายองค์กรอย่างมีนัย",
          "ทีมมีปัญหาการส่งงานหรือคุณภาพที่ต้องปรับปรุงบ่อยครั้ง",
          "บริหารทีมได้ดี แต่บางส่วนยังต้องพัฒนาเพิ่ม",
          "ทีมส่งงานตรงเวลา ≥ 90% และ KPI ทีมส่วนใหญ่บรรลุเป้า",
          "ทีมทุกคนบรรลุ KPI มีการพัฒนาทักษะต่อเนื่อง ทีมมีประสิทธิภาพสูง",
        ],
        evidence: "KPI Report ของสมาชิกในทีม, One-on-One Evaluation",
      },
      {
        id: "mm-3",
        name: "คุณภาพกลยุทธ์และการวางแผนแคมเปญ",
        nameEn: "Strategy & Campaign Planning",
        weight: 0.20,
        levels: [
          "ขาดแผนกลยุทธ์ที่ชัดเจน แคมเปญส่วนใหญ่ไม่บรรลุเป้า",
          "กลยุทธ์ขาดความชัดเจน ทีมต้องขอ Direction ซ้ำบ่อยครั้ง",
          "กลยุทธ์ครบถ้วน แต่บางแคมเปญยังต้องปรับปรุง",
          "กลยุทธ์ชัดเจน แคมเปญส่วนใหญ่บรรลุเป้าหมาย",
          "แผนกลยุทธ์รายเดือนชัดเจน ทีมนำไปปฏิบัติได้ทันที แคมเปญหลักบรรลุเป้าทุกชิ้น",
        ],
        evidence: "Monthly Marketing Plan, Campaign Execution Report",
      },
      {
        id: "mm-4",
        name: "การบริหารงบประมาณการตลาด",
        nameEn: "Budget Management",
        weight: 0.15,
        levels: [
          "ใช้งบเกินมากกว่า 20% หรือขาดการควบคุมงบประมาณ",
          "ใช้งบเกิน 11–20% โดยขาดเหตุผลที่ชัดเจน",
          "ใช้งบเกิน 6–10% มีเหตุผลสนับสนุน",
          "ใช้งบเกินไม่เกิน 5% มีเหตุผลที่ชัดเจน",
          "บริหารงบภายในวงเงิน 100% บรรลุประสิทธิภาพสูงสุด",
        ],
        evidence: "Monthly Budget Report, Finance & Accounting Records",
      },
      {
        id: "mm-5",
        name: "การเติบโตของแบรนด์และฐานผู้ติดตาม",
        nameEn: "Brand & Audience Growth",
        weight: 0.10,
        levels: [
          "Follower / Reach โดยรวมลดลงในทุกแพลตฟอร์ม",
          "ทรงตัวหรือเติบโตน้อยกว่า 3%",
          "เติบโต 3–7%",
          "เติบโต 8–15%",
          "เติบโต > 15% และมีการขยายตลาดหรือกลุ่มเป้าหมายใหม่",
        ],
        evidence: "Social Media Insights Report, Monthly Growth Dashboard",
      },
    ],
    competency: {
      knowledge: [
        "ความรู้ด้านกลยุทธ์การตลาดครบวงจร (Integrated Marketing Strategy) ทั้ง Online & Offline",
        "ความรู้ด้านการบริหารงบประมาณ, วัดผล ROI และจัดทำรายงานผู้บริหาร",
        "ความรู้ด้าน Brand Management, Digital Advertising และแนวโน้มการตลาดท่องเที่ยว",
      ],
      skill: [
        "ทักษะการบริหารทีมและพัฒนาบุคลากร (People Management & Coaching)",
        "ทักษะการวางแผนเชิงกลยุทธ์และตัดสินใจจากข้อมูล (Strategic & Data-Driven Planning)",
        "ทักษะการสื่อสารและนำเสนอต่อผู้บริหารและ Stakeholder",
      ],
      attribute: [
        "ภาวะผู้นำที่สร้างแรงบันดาลใจและทิศทางที่ชัดเจนให้ทีม (Inspiring Leadership)",
        "ความสามารถคิดระยะยาวและมองภาพรวมขององค์กร (Strategic Thinking)",
        "ความรับผิดชอบสูงและความซื่อสัตย์ในการบริหาร (Integrity & Accountability)",
      ],
    },
  },

  // ── 2. VDO Content Creator ────────────────────────────────────────────────
  {
    positionKey: "vdo_content",
    positionTitle: "VDO Content Creator",
    department: "Marketing / Creative",
    kpis: [
      {
        id: "vdo-1",
        name: "จำนวนคลิปที่ผลิตและเผยแพร่ต่อสัปดาห์",
        nameEn: "Video Quantity",
        weight: 0.25,
        levels: [
          "ผลิตคลิปน้อยกว่า 1 คลิป/สัปดาห์ หรือขาดช่วงบ่อยครั้ง",
          "ผลิต 1–2 คลิป/สัปดาห์ ต่ำกว่าเป้าหมาย",
          "ผลิต 2–3 คลิป/สัปดาห์ เป็นส่วนใหญ่",
          "ผลิต 3–4 คลิป/สัปดาห์ สม่ำเสมอ",
          "ผลิต ≥ 4 คลิป/สัปดาห์ ครบทุก Platform ตลอดเดือน",
        ],
        evidence: "TikTok Studio, Meta Business Suite, YouTube Studio — Posting log",
      },
      {
        id: "vdo-2",
        name: "ยอดการเข้าชมรวมทุกแพลตฟอร์ม",
        nameEn: "Total Views",
        weight: 0.25,
        levels: [
          "ยอดวิวรวมลดลง > 10% เมื่อเทียบเดือนก่อน",
          "ลดลง 1–10% หรือไม่มีการเติบโต",
          "เติบโต 3–9% หรือทรงตัว",
          "เติบโต 10–20%",
          "เติบโต > 20% หรือเกินเป้าหมาย Views รายเดือนที่กำหนด",
        ],
        evidence: "TikTok Analytics, Meta Insights, YouTube Studio Analytics",
      },
      {
        id: "vdo-3",
        name: "อัตราการมีส่วนร่วมของผู้ชม",
        nameEn: "Engagement Rate",
        weight: 0.20,
        levels: [
          "Engagement Rate ต่ำกว่าค่าเฉลี่ยอุตสาหกรรมมากกว่า 40%",
          "ต่ำกว่าค่าเฉลี่ย 20–40%",
          "อยู่ที่ระดับเฉลี่ยอุตสาหกรรม (±20%)",
          "สูงกว่าค่าเฉลี่ย 20–50%",
          "สูงกว่าค่าเฉลี่ยอุตสาหกรรมมากกว่า 50%",
        ],
        evidence: "Platform Analytics — Like, Comment, Share, Save per Reach",
      },
      {
        id: "vdo-4",
        name: "อัตราการดูจนจบ",
        nameEn: "Video Completion Rate",
        weight: 0.15,
        levels: [
          "Completion Rate เฉลี่ย < 20%",
          "20–29%",
          "30–49%",
          "50–70%",
          "> 70% เฉลี่ยทุกคลิปในเดือนนั้น",
        ],
        evidence: "TikTok / YouTube Analytics — Watch Time & Completion Rate",
      },
      {
        id: "vdo-5",
        name: "คลิปที่สร้างผลลัพธ์สูง / Viral Clip ต่อเดือน",
        nameEn: "High-Performance / Viral Clip",
        weight: 0.15,
        levels: [
          "ทุกคลิปมียอดวิว < 5,000 views",
          "มีคลิปที่ Views > 5,000 แต่ไม่มีคลิปที่เกิน 10,000",
          "มีคลิป > 10,000 views อย่างน้อย 1 คลิป/เดือน",
          "มีคลิป > 10,000 views อย่างน้อย 2 คลิป/เดือน",
          "มีคลิป > 10,000 views ≥ 3 คลิป/เดือน หรือมี Viral Clip",
        ],
        evidence: "Platform Analytics — High-Performance Clip Log",
      },
    ],
    competency: {
      knowledge: [
        "ความรู้ด้านการผลิตวิดีโอครบวงจร (Pre-Production, Production, Post-Production)",
        "ความรู้ด้านเทรนด์ Social Media, Platform Algorithm และ Short-form Video Strategy",
        "ความรู้ด้าน Storytelling, Video Marketing และ Conversion-Driven Content",
      ],
      skill: [
        "ทักษะการตัดต่อวิดีโอ (CapCut / Adobe Premiere Pro / AI-Assisted Tools)",
        "ทักษะการถ่ายทำและการแสดงออกหน้ากล้อง (Shooting & On-Camera Hosting)",
        "ทักษะการเขียนสคริปต์, วาง Storyboard และออกแบบ Hook 3 วินาทีแรก",
      ],
      attribute: [
        "ความกล้าแสดงออกและความคิดสร้างสรรค์ในการผลิตคอนเทนต์ (Creativity & Expressiveness)",
        "ความสามารถปรับตัวตามเทรนด์ได้รวดเร็ว (Trend Adaptability)",
        "ความรับผิดชอบต่อคุณภาพชิ้นงานและ Deadline (Quality Consciousness)",
      ],
    },
  },

  // ── 3. Content Marketing ──────────────────────────────────────────────────
  {
    positionKey: "content_marketing",
    positionTitle: "Content Marketing",
    department: "Marketing / Creative",
    kpis: [
      {
        id: "cm-1",
        name: "ความถูกต้องของข้อมูลก่อนเผยแพร่",
        nameEn: "Accuracy",
        weight: 0.25,
        levels: [
          "มีข้อผิดพลาดหลังโพสต์ > 4 ครั้ง/เดือน หรือพบราคาผิดหลังเผยแพร่",
          "มีข้อผิดพลาดหลังโพสต์ 3–4 ครั้ง/เดือน",
          "มีข้อผิดพลาดหลังโพสต์ 1–2 ครั้ง/เดือน แก้ไขได้ทันที",
          "มีข้อผิดพลาดไม่เกิน 1 ครั้ง/เดือน แก้ไขก่อนเผยแพร่ได้",
          "ไม่มีข้อผิดพลาดใดๆ ตลอดเดือน (0 errors)",
        ],
        evidence: "Posting log, รายงานการแก้ไขชิ้นงาน",
      },
      {
        id: "cm-2",
        name: "ความสม่ำเสมอของ Content Calendar",
        nameEn: "On-time Rate",
        weight: 0.20,
        levels: [
          "On-time rate < 70% มีวันว่างหรือโพสต์ช้าบ่อยครั้ง",
          "On-time rate 70–79% มีวันว่างเกิน 2 วัน/เดือน",
          "On-time rate 80–89% โพสต์ตรงเวลาส่วนใหญ่",
          "On-time rate 90–99% เกือบครบทุกวัน",
          "On-time rate 100% ไม่มีวันว่าง โพสต์ตรงเวลาทุกชิ้น",
        ],
        evidence: "Content Calendar, Meta Business Suite Insights",
      },
      {
        id: "cm-3",
        name: "ประสิทธิภาพการบริหารทีม Creative",
        nameEn: "Team Flow",
        weight: 0.20,
        levels: [
          "ทีมขาด Brief บ่อย งานค้างเป็นประจำ กระทบ Publishing หนัก",
          "งานล่าช้า > 3 ชิ้น/สัปดาห์ กระทบตาราง Publishing",
          "งานล่าช้า 1–2 ชิ้น/สัปดาห์ ยังไม่กระทบ Publishing",
          "งานค้างเล็กน้อย แก้ได้ทันเวลาเสมอ",
          "ทีมได้รับ Brief ครบถ้วน ส่งงานตรง Deadline ทุกชิ้น ไม่มีงานค้าง",
        ],
        evidence: "Content Calendar, Chat log Lark/LINE",
      },
      {
        id: "cm-4",
        name: "อัตราชิ้นงานผ่าน QC รอบแรก",
        nameEn: "First-pass QC Rate",
        weight: 0.20,
        levels: [
          "ชิ้นงานผ่าน QC รอบแรก < 60%",
          "60–69%",
          "70–79%",
          "80–90%",
          "> 90%",
        ],
        evidence: "Revision log, Feedback records",
      },
      {
        id: "cm-5",
        name: "การเติบโตของ Engagement & Reach รายเดือน",
        nameEn: "Engagement & Reach Growth",
        weight: 0.15,
        levels: [
          "Reach / Engagement ลดลง > 5% เมื่อเทียบเดือนก่อน",
          "ทรงตัวหรือลดลง 0–5%",
          "เติบโต 3–7%",
          "เติบโต 8–15%",
          "เติบโต > 15%",
        ],
        evidence: "Meta Business Suite Monthly Report",
      },
    ],
    competency: {
      knowledge: [
        "ความรู้ด้าน Digital Marketing & Social Media Platform (Facebook, Instagram, TikTok, LINE OA)",
        "ความรู้ด้าน Brand Voice & Communication Style ของ Standard Tour",
        "ความรู้ด้าน Content Strategy, Content Calendar Planning และ Editorial Process",
      ],
      skill: [
        "ทักษะการเขียน Copywriting ที่ตรงกลุ่มเป้าหมายและสอดคล้อง Brand Tone",
        "ทักษะการบริหารทีม Creative และกระจายงาน (Team & Project Management)",
        "ทักษะการวิเคราะห์ผลลัพธ์ Content และจัดทำ Performance Report",
      ],
      attribute: [
        "ความใส่ใจในรายละเอียดและความถูกต้องของข้อมูล (Attention to Detail)",
        "ภาวะผู้นำและการสื่อสารที่ชัดเจนกับทีม (Leadership & Communication)",
        "ความรับผิดชอบสูงและตรงต่อ Deadline (Accountability & Timeliness)",
      ],
    },
  },

  // ── 4. Graphic Designer ───────────────────────────────────────────────────
  {
    positionKey: "graphic_designer",
    positionTitle: "Graphic Designer",
    department: "Marketing / Creative",
    kpis: [
      {
        id: "gd-1",
        name: "ความเร็วในการส่งงานตาม Deadline",
        nameEn: "Turnaround Time",
        weight: 0.25,
        levels: [
          "ส่งงานตาม Deadline < 70% หรืองานด่วนใช้เวลา > 4 ชม.",
          "ส่งงานตาม Deadline 70–79% หรืองานด่วนใช้เวลา 3–4 ชม.",
          "ส่งงานตาม Deadline 80–89% งานด่วนภายใน 3 ชม.",
          "ส่งงานตาม Deadline 90–99% งานด่วนภายใน 2 ชม.",
          "ส่งงานตาม Deadline 100% งานด่วนภายใน 2 ชม. ทุกครั้ง",
        ],
        evidence: "Content Calendar, Timestamp บน Lark/LINE",
      },
      {
        id: "gd-2",
        name: "ความถูกต้องของข้อมูลในชิ้นงาน",
        nameEn: "Accuracy",
        weight: 0.25,
        levels: [
          "มีข้อผิดพลาด (ราคา/วันที่/ตัวสะกด/โลโก้) > 4 ครั้ง/เดือน",
          "ผิดพลาดหลังเผยแพร่/พิมพ์ 3–4 ครั้ง/เดือน",
          "ผิดพลาดหลังเผยแพร่/พิมพ์ 1–2 ครั้ง/เดือน",
          "ผิดพลาดไม่เกิน 1 ครั้ง/เดือน แก้ก่อนเผยแพร่ได้",
          "ไม่มีข้อผิดพลาดในชิ้นงานที่เผยแพร่/พิมพ์แล้ว (0 ครั้ง)",
        ],
        evidence: "Posting log, รายงานการแก้ไขงาน, โรงพิมพ์ Feedback",
      },
      {
        id: "gd-3",
        name: "อัตราชิ้นงานผ่าน QC รอบแรก",
        nameEn: "First-pass Approval Rate",
        weight: 0.20,
        levels: [
          "ชิ้นงานผ่าน QC รอบแรก < 60%",
          "60–74%",
          "75–79%",
          "80–90%",
          "> 90%",
        ],
        evidence: "Revision log, Feedback จาก Content Marketing & Manager",
      },
      {
        id: "gd-4",
        name: "ปริมาณงานที่ผลิตตาม Content Calendar",
        nameEn: "Output Volume",
        weight: 0.15,
        levels: [
          "ผลิตงานได้ < 70% ของแผน Content Calendar",
          "70–84% ของแผน",
          "85–99% ของแผน",
          "100–109% ของแผน",
          "≥ 110% ของแผน (เกินเป้า)",
        ],
        evidence: "Content Calendar, Google Drive records",
      },
      {
        id: "gd-5",
        name: "มาตรฐาน Brand CI & การจัดการไฟล์",
        nameEn: "Brand & File Management",
        weight: 0.15,
        levels: [
          "ไม่ยึด Brand CI และไม่จัดการ Source File ตามมาตรฐาน",
          "มีการใช้ Brand CI ผิดบ่อย หรือ Source File ขาดหาย",
          "Brand CI ถูกต้องแต่ File Management มีช่องโหว่บ้าง",
          "Brand CI ครบ มีข้อผิดพลาดเล็กน้อยในการ Archive",
          "ทุกชิ้นยึด Brand CI ครบ Source File ครบ ตั้งชื่อถูก Archive เรียบร้อย",
        ],
        evidence: "Google Drive Folder Check, Brand Guideline Review",
      },
    ],
    competency: {
      knowledge: [
        "ความรู้ด้านการออกแบบกราฟิกและ Brand Identity ของ Standard Tour",
        "ความรู้ด้าน Digital & Print Media Specification (ขนาด Bleed, สี, Format)",
        "ความรู้ด้าน Social Media Platform และมาตรฐานการโพสต์บน Meta / TikTok / LINE OA",
      ],
      skill: [
        "ทักษะการใช้ Software ออกแบบ (Adobe Illustrator, Photoshop, Canva)",
        "ทักษะ Layout Design, Visual Hierarchy และ Conversion-Centric Design",
        "ทักษะการจัดการไฟล์และ File Naming Convention ตามมาตรฐานองค์กร",
      ],
      attribute: [
        "ความละเอียดรอบคอบและใส่ใจในคุณภาพของชิ้นงาน (Quality Consciousness)",
        "ความสามารถรับ Feedback และปรับแก้งานได้อย่างรวดเร็ว (Adaptability)",
        "ความรับผิดชอบต่อ Deadline และการทำงานร่วมกับทีม (Team Accountability)",
      ],
    },
  },

  // ── 5. Marketing Executive ─────────────────────────────────────────────────
  {
    positionKey: "marketing_executive",
    positionTitle: "Marketing Executive",
    department: "Marketing",
    kpis: [
      {
        id: "me-1",
        name: "ความคุ้มค่าของงบโฆษณา",
        nameEn: "ROAS — Return on Ad Spend",
        weight: 0.30,
        levels: [
          "ROAS ต่ำกว่าเป้าหมายมากกว่า 30%",
          "ROAS อยู่ที่ 70–84% ของเป้า",
          "ROAS บรรลุเป้าหมาย 85–99%",
          "ROAS บรรลุเป้าหมาย 100–119%",
          "ROAS เกินเป้าหมายมากกว่า 20% (≥ 120% ของเป้า)",
        ],
        evidence: "Meta Ads Manager Report, TikTok Ads Report, Monthly Ad Performance Dashboard",
      },
      {
        id: "me-2",
        name: "ต้นทุนต่อการได้ลูกค้า",
        nameEn: "Cost per Lead / CPA",
        weight: 0.25,
        levels: [
          "CPA สูงกว่าเกณฑ์ที่กำหนดมากกว่า 20%",
          "CPA สูงกว่าเกณฑ์ 11–20%",
          "CPA สูงกว่าเกณฑ์ 1–10%",
          "CPA อยู่ในเกณฑ์ หรือต่ำกว่า 1–19%",
          "CPA ต่ำกว่าเกณฑ์มากกว่า 20% (ประหยัดงบได้อย่างมีนัย)",
        ],
        evidence: "Ads Manager Dashboard, Monthly CPA Tracking Report",
      },
      {
        id: "me-3",
        name: "อัตราความสำเร็จของแคมเปญ",
        nameEn: "Campaign Success Rate",
        weight: 0.20,
        levels: [
          "แคมเปญบรรลุเป้าหมาย < 45%",
          "45–59% ของแคมเปญทั้งหมด",
          "60–74%",
          "75–89%",
          "≥ 90% ของแคมเปญบรรลุ KPI ที่กำหนด",
        ],
        evidence: "Campaign Performance Report, KPI Dashboard รายแคมเปญ",
      },
      {
        id: "me-4",
        name: "การส่งรายงานวิเคราะห์คู่แข่ง",
        nameEn: "Competitor Insight Report",
        weight: 0.15,
        levels: [
          "ไม่ส่งรายงาน หรือส่งช้าเกิน 1 สัปดาห์",
          "ส่งช้าเกิน 3 วัน หรือข้อมูลไม่ครบ",
          "ส่งช้า 1–3 วัน แต่ข้อมูลครบถ้วน",
          "ส่งตรงเวลา ข้อมูลครบ มี Insight ที่เป็นประโยชน์",
          "ส่งตรงเวลาทุกเดือน พร้อม Insight เชิงลึกและข้อเสนอแนะที่นำไปใช้งานได้จริง",
        ],
        evidence: "Monthly Competitor Report, Email / Lark timestamp",
      },
      {
        id: "me-5",
        name: "ผลลัพธ์การทำงานกับ KOL / Partnership",
        nameEn: "KOL & Partnership Results",
        weight: 0.10,
        levels: [
          "ดำเนินกิจกรรมร่วมได้น้อยกว่า 60% ของแผน",
          "ดำเนินกิจกรรมร่วมได้ 60–79% ของแผน ผลลัพธ์ยังไม่ครบ",
          "ดำเนินกิจกรรมร่วมได้ 80–99% ของแผน ผลลัพธ์ใกล้เคียงเป้า",
          "ดำเนินกิจกรรมครบ และผลลัพธ์บรรลุเป้า 100–119%",
          "ผลลัพธ์เกินเป้า ≥ 120% ทั้งจำนวนกิจกรรมและ Revenue / Referral",
        ],
        evidence: "รายงานผลการดำเนินงานร่วม, สรุปยอด Referral หรือ Booking",
      },
    ],
    competency: {
      knowledge: [
        "ความรู้ด้าน Digital Advertising: Meta Ads, TikTok Ads, LINE Ads (ตั้งค่า, Optimization, A/B Test)",
        "ความรู้ด้านการวิเคราะห์ตลาดและคู่แข่ง (Market & Competitor Research)",
        "ความรู้ด้านการบริหารแคมเปญการตลาด Online & Offline",
      ],
      skill: [
        "ทักษะการวิเคราะห์ข้อมูลโฆษณา (ROAS, CPA, CTR, CPC) และ Performance Marketing",
        "ทักษะการบริหารความสัมพันธ์กับ KOL, Influencer และ Partner",
        "ทักษะการสื่อสารและประสานงานระหว่างทีมและหน่วยงานภายนอก",
      ],
      attribute: [
        "ความสามารถทำงานเชิงรุกและปรับตัวได้รวดเร็ว (Proactive & Agile)",
        "ความสามารถคิดเชิงกลยุทธ์และตัดสินใจเชิงข้อมูล (Data-Driven Thinking)",
        "ความรับผิดชอบต่อผลลัพธ์ที่วัดผลได้จริง (Result-Oriented Accountability)",
      ],
    },
  },
];

// ─── Store ────────────────────────────────────────────────────────────────────

export const useKPIDefinitionStore = create<KPIDefinitionState>()(
  persist(
    (set, get) => ({
      positions: DEFAULT_POSITIONS,

      updateKPIItem: (positionKey, kpiId, patch, editorName) =>
        set((s) => ({
          positions: s.positions.map((p) =>
            p.positionKey !== positionKey
              ? p
              : {
                  ...p,
                  kpis: p.kpis.map((k) => (k.id === kpiId ? { ...k, ...patch } : k)),
                  lastEditedBy: editorName,
                  lastEditedAt: new Date().toISOString(),
                }
          ),
        })),

      updateCompetency: (positionKey, competency, editorName) =>
        set((s) => ({
          positions: s.positions.map((p) =>
            p.positionKey !== positionKey
              ? p
              : { ...p, competency, lastEditedBy: editorName, lastEditedAt: new Date().toISOString() }
          ),
        })),

      resetPosition: (positionKey) => {
        const def = DEFAULT_POSITIONS.find((p) => p.positionKey === positionKey);
        if (!def) return;
        set((s) => ({
          positions: s.positions.map((p) =>
            p.positionKey === positionKey ? { ...def } : p
          ),
        }));
      },
    }),
    { name: "kpi-definition-store-v1" }
  )
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** ตรวจสอบว่า sum of weights = 100% (อนุโลม ±1%) */
export function weightsValid(kpis: KPIItem[]): boolean {
  const total = kpis.reduce((acc, k) => acc + k.weight, 0);
  return Math.abs(total - 1) < 0.011;
}

export function formatWeight(w: number): string {
  return `${Math.round(w * 100)}%`;
}
