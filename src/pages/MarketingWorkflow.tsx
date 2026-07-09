/**
 * MarketingWorkflow.tsx
 * หน้า Workflow ทีม Marketing Standard Tour
 * Light-theme version — readable on white background
 */

import { useState } from "react";

// ─── Role config ──────────────────────────────────────────────────────────────
type RoleKey = "mgr" | "cm" | "gd" | "exec" | "vdo" | "ob";

const ROLES: Record<RoleKey, { label: string; color: string; bg: string; border: string }> = {
  mgr:  { label: "Marketing Manager",   color: "#7e22ce", bg: "#faf5ff", border: "#e9d5ff" },
  cm:   { label: "Content Marketing",   color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" },
  gd:   { label: "Graphic Designer",    color: "#c2410c", bg: "#fff7ed", border: "#fed7aa" },
  exec: { label: "Marketing Executive", color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" },
  vdo:  { label: "VDO Content Creator", color: "#b91c1c", bg: "#fef2f2", border: "#fecaca" },
  ob:   { label: "OB Team (Input)",     color: "#0f766e", bg: "#f0fdfa", border: "#99f6e4" },
};

// ─── Tab config ───────────────────────────────────────────────────────────────
type TabKey = "campaign" | "weekly" | "vdo" | "paid";

const TABS: { key: TabKey; label: string; color: string }[] = [
  { key: "campaign", label: "📣 Campaign / โปรโมชั่น", color: "#7e22ce" },
  { key: "weekly",   label: "📅 คอนเทนต์รายสัปดาห์",  color: "#15803d" },
  { key: "vdo",      label: "🎬 VDO Production",        color: "#b91c1c" },
  { key: "paid",     label: "🎯 Paid Ads",              color: "#1d4ed8" },
];

// ─── Flow step types ──────────────────────────────────────────────────────────
type Step =
  | { t: "phase";    label: string }
  | { t: "step";     role: RoleKey; n: number; title: string; detail: string; note?: string }
  | { t: "dec";      q: string; yes: string; no: string }
  | { t: "parallel"; items: { role: RoleKey; title: string; detail: string; note?: string }[] }
  | { t: "meet";     n: number; title: string; pp: RoleKey[]; detail: string }
  | { t: "report" }
  | { t: "adcreative" }
  | { t: "vdoinput" }
  | { t: "vdocalendar" };

interface Flow { title: string; desc: string; steps: Step[] }

// ─── Flow data ────────────────────────────────────────────────────────────────
const REPORT_STEP: Step = { t: "report" };

const FLOWS: Record<TabKey, Flow> = {
  campaign: {
    title: "📣 Campaign / โปรโมชั่น / วันสำคัญ",
    desc:  "Marketing Executive นำคิด Concept → Kick-off Meeting → Content Marketing เป็น Hub Execution → รายงานแยกตำแหน่ง ส่งพร้อมกันภายในวันอังคารต้นเดือน",
    steps: [
      { t:"phase", label:"PHASE 1 — กำหนดทิศทาง" },
      { t:"step",  role:"mgr",  n:1,  title:"กำหนดเป้าหมายและ KPI", detail:"วัตถุประสงค์ Campaign (Awareness/Lead/Booking), งบประมาณรวม, ช่องทาง และ Deadline ทุกขั้นตอน" },
      { t:"step",  role:"exec", n:2,  title:"วิจัยตลาด + คิด Campaign Concept", detail:"วิเคราะห์คู่แข่ง, กำหนด Target Audience, คิด Big Idea พร้อมเสนองบ Paid Ads และ KOL" },
      { t:"step",  role:"exec", n:3,  title:"นำเสนอ Campaign Concept ต่อ Manager", detail:"Deck สรุป: Concept, ช่องทาง, Timeline, งบ Paid และ Expected Result" },
      { t:"dec",   q:"Manager อนุมัติ Concept?", yes:"ผ่าน → จัด Kick-off Meeting", no:"ไม่ผ่าน → Exec ปรับ Concept ใหม่" },
      { t:"phase", label:"PHASE 2 — Planning & Brief" },
      { t:"meet",  n:4, title:"Kick-off Meeting", pp:["mgr","exec","cm","vdo"], detail:"Exec อธิบาย Concept + แจก Role + กำหนด Deadline รายชิ้น + ตกลง Tone & Manner และ Key Message ร่วมกัน" },
      { t:"step",  role:"cm",   n:5,  title:"วาง Content Calendar + เขียน Caption ทุกโพสต์", detail:"กำหนดวันที่, หัวข้อ, Platform, Format ใน Google Sheets และเขียน Copy/แคปชันครบทุกชิ้นก่อนส่ง Brief" },
      { t:"step",  role:"cm",   n:6,  title:"ส่ง Brief แยกให้ Graphic Designer + VDO Creator", detail:"Graphic: Spec ขนาด + ข้อความในภาพ + Reference + Deadline | VDO: Hook 3 วิ + Key Message + CTA + ความยาว + Deadline" },
      { t:"phase", label:"PHASE 3 — Production (ทำงานขนานกัน)" },
      { t:"parallel", items: [
        { role:"gd",   title:"ออกแบบสื่อภาพทุกชิ้น",   detail:"Static Posts, Ad Creative, Banner LINE OA, Thumbnail, สื่อ Offline", note:"ส่ง Final File ให้ Content Marketing — ไม่ใช่งานหลักในการตั้งโพสต์" },
        { role:"vdo",  title:"Script → ถ่ายทำ → ตัดต่อ", detail:"เขียน Script → Storyboard → ออกกอง → ตัดต่อ + Subtitle + Thumbnail", note:"VDO Creator รับผิดชอบ Upload VDO เอง" },
        { role:"exec", title:"Setup Paid + KOL",          detail:"ตั้งค่า Ad Set ทุก Platform, ติดต่อ KOL เบื้องต้น (Manager Approve ก่อนลงนาม)" },
      ]},
      { t:"phase", label:"PHASE 4 — QC & Approve" },
      { t:"step",  role:"gd",   n:7,  title:"Self QC → ส่ง Final File ให้ Content Marketing", detail:"ตรวจ: ราคา, วันที่, ตัวสะกด, โลโก้ครบ → ส่งไฟล์ Final (JPG/PNG) ให้ Content Marketing" },
      { t:"step",  role:"vdo",  n:8,  title:"ส่ง Draft VDO ให้ Content Marketing", detail:"แชร์ลิงก์ Google Drive พร้อม Timestamp ที่ต้องการ Feedback และ Caption เบื้องต้น" },
      { t:"step",  role:"cm",   n:9,  title:"QC ทุกชิ้น — Graphic + VDO", detail:"เทียบกับ Brief ต้นฉบับ: ข้อมูลถูกต้อง, Tone ตรง, โลโก้ครบ — ถ้าไม่ผ่านส่งกลับพร้อม Feedback" },
      { t:"dec",   q:"QC ผ่าน?", yes:"ผ่าน → Manager Final Approve", no:"ไม่ผ่าน → ส่งกลับ Graphic/VDO แก้ไข" },
      { t:"step",  role:"mgr",  n:10, title:"Final Approve งานสำคัญ", detail:"อนุมัติ Hero Content, Key Visual และ Paid Campaign Plan ก่อนเผยแพร่" },
      { t:"phase", label:"PHASE 5 — Publish" },
      { t:"parallel", items: [
        { role:"cm",   title:"ตั้งโพสต์ Static / ภาพนิ่ง ทุก Platform", detail:"Meta Business Suite / LINE OA ตาม Calendar และ Prime Time" },
        { role:"vdo",  title:"Upload VDO + Caption + Hashtag",             detail:"TikTok, FB Reels, IG Reels, YouTube Shorts ตาม Prime Time" },
        { role:"exec", title:"Launch Paid Ads + Boost",                    detail:"เปิด Ad Set ทุก Platform Boost Static หรือ VDO ที่ Engagement ดีที่สุด" },
      ]},
      { t:"phase", label:"PHASE 6 — Monitor" },
      { t:"parallel", items: [
        { role:"cm",   title:"ติดตาม Organic 24–48 ชม.", detail:"Reach, Engagement, Comment บันทึก Top Post + Insight" },
        { role:"vdo",  title:"ติดตาม VDO + ตอบ Comment", detail:"View, Watch Time, Completion Rate ตอบ Comment สร้าง Engagement" },
        { role:"exec", title:"ปรับ Paid Real-time",        detail:"ดู ROAS/CPA รายวัน ปิด Ad Set ไม่ดี เปิด Creative ใหม่" },
      ]},
      { t:"phase", label:"วันอังคารต้นเดือน — Report" },
      REPORT_STEP,
      { t:"step",  role:"mgr",  n:11, title:"Manager รับ Report ทั้ง 3 ส่วน + ประเมินผล Campaign", detail:"เทียบ KPI ที่ตั้งไว้ ให้ Feedback ทีม นำ Lesson Learned ไปวางแผน Campaign ถัดไป" },
    ],
  },

  weekly: {
    title: "📅 คอนเทนต์รายสัปดาห์ (Organic)",
    desc:  "Content Marketing วางแผนตามความเร่งด่วน — OB สามารถส่ง Brief แบบด่วนได้ทุกวัน Content Marketing ลงตารางติดตาม Graphic วันต่อวัน",
    steps: [
      { t:"phase", label:"INPUT — รับ Brief (เกิดได้ทุกวัน)" },
      { t:"parallel", items: [
        { role:"ob", title:"Brief ปกติ (ทุกวันจันทร์)",   detail:"OB แจ้งโปรแกรม/ทัวร์ประจำสัปดาห์ล่วงหน้า — Content Marketing วางแผนตาม Calendar ปกติ", note:"📌 ล่วงหน้า ≥ 3 วัน" },
        { role:"ob", title:"Brief ด่วน (ทุกวัน)",          detail:"OB แจ้งโปรโมชั่น/ทัวร์ใหม่แบบกระทันหัน — Content Marketing จัดคิว Graphic ทันที ตามความเร่งด่วน", note:"⚡ งานด่วน: ส่ง Brief ให้ Graphic ภายในวันเดียวกัน" },
      ]},
      { t:"phase", label:"PLANNING — Content Marketing จัดลำดับงาน" },
      { t:"step",  role:"cm",   n:1, title:"รับ Brief + จัดลำดับความเร่งด่วน", detail:"ประเมินทุก Brief ที่ได้รับในวันนั้น จัดลำดับ: งานด่วน (ต้องโพสต์วันนี้/พรุ่งนี้) → งานปกติ (วางใน Calendar ล่วงหน้า) แล้วอัปเดต Calendar ทันที" },
      { t:"step",  role:"cm",   n:2, title:"เขียน Caption / Copy + ส่ง Graphic Brief ทันที", detail:"เขียนแคปชันพร้อมกับวาง Brief ให้ Graphic ในวันเดียวกัน ระบุ Deadline ตามความเร่งด่วนของแต่ละชิ้น" },
      { t:"phase", label:"PRODUCTION — Graphic Designer (วันต่อวัน)" },
      { t:"step",  role:"gd",   n:3, title:"รับ Brief + ยืนยัน Deadline", detail:"ตรวจสอบว่าข้อมูลครบก่อนเริ่ม ถ้าไม่ครบต้องถามทันที ห้ามเดา แล้วยืนยัน Deadline กลับ Content Marketing" },
      { t:"step",  role:"gd",   n:4, title:"ออกแบบ + Self QC → ส่ง Draft ให้ Content Marketing", detail:"งานด่วน: เสร็จภายใน 2 ชม. | งานปกติ: เสร็จภายในวัน — Self QC ราคา, วันที่, ตัวสะกด, โลโก้ก่อนส่งทุกครั้ง", note:"Graphic Designer ไม่ตั้งโพสต์ — ส่ง Final File ให้ Content Marketing เท่านั้น" },
      { t:"step",  role:"cm",   n:5, title:"QC ชิ้นงาน", detail:"ตรวจทุกจุด: ราคา, วันเดินทาง, ชื่อสถานที่, ตัวสะกด, โลโก้ เทียบกับข้อมูลล่าสุดจาก OB" },
      { t:"dec",   q:"ผ่าน QC?", yes:"ผ่าน → Content Marketing ตั้งโพสต์ได้เลย", no:"ไม่ผ่าน → ส่งกลับ Graphic พร้อม Feedback ชัดเจน" },
      { t:"phase", label:"PUBLISH" },
      { t:"step",  role:"cm",   n:6, title:"ตั้งเวลาโพสต์ Static / ภาพนิ่ง ทุก Platform", detail:"Schedule บน Meta Business Suite / LINE OA ตาม Prime Time — งานด่วนโพสต์ทันที งานปกติตั้งเวลาล่วงหน้า" },
      { t:"phase", label:"MONITOR" },
      { t:"step",  role:"cm",   n:7, title:"ติดตาม Engagement + บันทึก Top Post", detail:"Reach, Engagement, Comment 24–48 ชม. หลัง Publish บันทึก Insight นำไปปรับ Brief ชิ้นถัดไป" },
      { t:"step",  role:"exec", n:8, title:"Boost โพสต์ที่ Organic ดี (ถ้ามีงบ)", detail:"แจ้ง Content Marketing ก่อนทุกครั้ง" },
      { t:"phase", label:"วันอังคารต้นเดือน — Report" },
      REPORT_STEP,
      { t:"step",  role:"mgr",  n:9, title:"Manager รับ Report + ให้ Feedback", detail:"เทียบผลรายเดือน ปรับทิศทาง Content เดือนถัดไป" },
    ],
  },

  vdo: {
    title: "🎬 VDO Production",
    desc:  "Content Marketing จัด Slot วัน VDO ใน Calendar ไว้ก่อน — VDO Creator รับ Brief พร้อมกับ Content Marketing แล้วกรอก Concept/หัวข้อลงในช่องที่เตรียมไว้",
    steps: [
      { t:"phase", label:"PHASE 1 — Content Marketing จัด Slot ใน Calendar" },
      { t:"step",  role:"cm",  n:1,  title:"จัด Content Calendar — กำหนด Slot VDO ประจำเดือน", detail:"วางวัน/เวลาที่จะ Publish VDO แต่ละคลิปใน Google Sheet / Notion Calendar — เตรียม Slot ไว้ให้ VDO Creator กรอก Concept เพิ่มเติม" },
      { t:"phase", label:"PHASE 2 — Exec ส่ง Brief / VDO Creator คิด Concept" },
      { t:"step",  role:"exec", n:2, title:"ส่ง Theme & Concept ประจำเดือน ให้ทั้ง 2 ตำแหน่งพร้อมกัน", detail:"ระบุทิศทาง Content เดือนนี้, จุดขายที่ต้องสื่อสาร, กลุ่มเป้าหมาย และ Platform หลัก" },
      { t:"vdoinput" },
      { t:"step",  role:"vdo", n:3,  title:"คิด Story + ติดตาม Trend", detail:"นำ Theme & Concept จาก Exec มาพัฒนาไอเดียคลิปเอง สำรวจ Trend TikTok/Reels — คิดหัวข้อ, Hook และ Format ที่เหมาะกับ Slot ที่ CM จัดไว้" },
      { t:"phase", label:"PHASE 3 — กรอก Concept ลง Calendar" },
      { t:"vdocalendar" },
      { t:"dec",   q:"Concept ที่ VDO Creator กรอกมาเดินทางเดียวกับ Theme มั้ย?", yes:"ใช่ → เริ่ม Pre-Production ได้เลย", no:"ไม่ → Content Marketing แจ้ง VDO Creator ปรับให้ตรง Direction" },
      { t:"phase", label:"PHASE 4 — Pre-Production" },
      { t:"step",  role:"vdo", n:4,  title:"เขียน Script", detail:"Hook 3 วิแรก (คำถาม/ภาพน่าตื่นตาใจ/ประโยคท้าทาย), เนื้อหาหลักทีละ Scene, CTA ปิดท้ายชัดเจน" },
      { t:"step",  role:"vdo", n:5,  title:"วาง Storyboard + Shot List", detail:"กำหนด Angle, Location, Props เตรียมอุปกรณ์ (กล้อง, Mic ไร้สาย, Gimbal, ไฟ, Battery สำรอง)" },
      { t:"step",  role:"cm",  n:6,  title:"ตรวจ Storyboard + ให้ Feedback", detail:"ตรวจว่า Hook แรงพอ, ข้อมูลถูกต้อง, CTA ชัดเจน ก่อนออกกองทุกครั้ง — ป้องกันถ่ายมาแล้วต้องถ่ายใหม่" },
      { t:"dec",   q:"Storyboard ผ่าน?", yes:"ผ่าน → ออกกอง", no:"ไม่ผ่าน → VDO Creator ปรับแล้วส่งใหม่" },
      { t:"phase", label:"PHASE 5 — Production" },
      { t:"step",  role:"vdo", n:7,  title:"ออกกองถ่ายทำ", detail:"On-site: ทริปทัวร์, รีวิวรถ VIP, สถานที่, โรงแรม | In-house: Talking Head, Explainer — ถ่ายให้ครบ Angle + B-Roll เผื่อตัดต่อ" },
      { t:"phase", label:"PHASE 6 — Post-Production" },
      { t:"step",  role:"vdo", n:8,  title:"ตัดต่อ + เพลง Trend + Subtitle + Thumbnail", detail:"เปลี่ยน Cut ทุก 3–5 วิ ใส่ Sound Effect/เพลงกระแส Subtitle ทุกเฟรม ทำ Thumbnail ดึงดูด CapCut/Premiere Pro" },
      { t:"step",  role:"gd",  n:9,  title:"(Optional) Graphic Designer ทำ Thumbnail Pro", detail:"สำหรับ YouTube หรือ Campaign VDO สำคัญ — Content Marketing Request เท่านั้น ไม่ใช่ทุกคลิป", note:"Graphic Designer ช่วยเฉพาะเมื่อถูก Request จาก Content Marketing" },
      { t:"phase", label:"PHASE 7 — QC & Approve" },
      { t:"step",  role:"vdo", n:10, title:"ส่ง Draft VDO ให้ Content Marketing", detail:"แชร์ลิงก์ Google Drive พร้อม Timestamp ที่ต้องการ Feedback และ Caption เบื้องต้น" },
      { t:"step",  role:"cm",  n:11, title:"QC Draft VDO", detail:"ราคา, วันเดินทาง, โลโก้, Subtitle ไม่ผิด, CTA ชัด — แก้เกิน 2 รอบให้ทบทวน Concept ต้นฉบับ" },
      { t:"dec",   q:"QC ผ่าน?", yes:"ผ่าน → (งานสำคัญ) Manager Approve", no:"ไม่ผ่าน → ส่งกลับ VDO Creator + Feedback ชัดเจน" },
      { t:"step",  role:"mgr", n:12, title:"Manager Approve (เฉพาะงานสำคัญ / Campaign)", detail:"คลิปปกติ Content Marketing Approve ได้เลย — คลิป Campaign หลัก, Hero Clip ให้ Manager Approve ก่อน" },
      { t:"phase", label:"PHASE 8 — Publish & Monitor" },
      { t:"step",  role:"vdo", n:13, title:"Upload VDO ทุก Platform + Caption + Hashtag", detail:"TikTok, FB Reels, IG Reels, YouTube Shorts — VDO Creator รับผิดชอบ Upload และ Publish ตาม Slot ที่ลงใน Calendar" },
      { t:"step",  role:"exec", n:14, title:"Boost คลิปที่ Organic View ดี (ถ้ามีงบ)", detail:"แจ้ง Content Marketing ก่อนทุกครั้ง" },
      { t:"step",  role:"vdo", n:15, title:"ติดตาม Performance + ตอบ Comment", detail:"View, Watch Time, Completion Rate 24–48 ชม. ตอบ Comment สร้าง Engagement บันทึก Insight" },
      { t:"phase", label:"วันอังคารต้นเดือน — Report" },
      REPORT_STEP,
      { t:"step",  role:"mgr", n:16, title:"Manager รับ Report ทั้ง 3 ส่วน + ให้ Feedback", detail:"เทียบ KPI ที่ตั้งไว้ ให้ Feedback ปรับทิศทาง VDO เดือนถัดไป" },
    ],
  },

  paid: {
    title: "🎯 Paid Ads (Ongoing)",
    desc:  "Marketing Executive ดูแล Paid Media ทั้งหมด — เมื่อต้องการ Ad Creative แจ้ง Content Marketing ให้ส่งต่อ Graphic (ภาพ) หรือ VDO Creator (คลิป) ตามประเภท",
    steps: [
      { t:"phase", label:"ต้นเดือน — วางแผน" },
      { t:"step",  role:"exec", n:1, title:"วางแผนงบ Paid รายเดือน + Campaign ที่ต้องการ", detail:"งบรายเดือน, Platform (Meta/TikTok/LINE/Google), Objective (Lead/Reach/Booking), กิจกรรมที่ต้องการ Support" },
      { t:"step",  role:"mgr",  n:2, title:"Manager อนุมัติแผนและงบ", detail:"ไม่มีการยิงโฆษณาก่อนได้รับ Approve" },
      { t:"phase", label:"เมื่อต้องการ Ad Creative ใหม่" },
      { t:"step",  role:"exec", n:3, title:"แจ้ง Content Marketing ขอ Ad Creative", detail:"ระบุ: ประเภท (ภาพ/คลิป), Platform, ขนาด, Message, CTA และ Deadline — Content Marketing ส่ง Brief ต่อตามประเภท" },
      { t:"adcreative" },
      { t:"phase", label:"Launch — รายวัน" },
      { t:"step",  role:"exec", n:4, title:"ตั้งค่า Ad Set + Launch Ads", detail:"Target Audience, Objective, Budget รายวัน, Placement และ Ad Creative ที่ได้รับ" },
      { t:"step",  role:"exec", n:5, title:"ตรวจ Performance รายวัน", detail:"Spend, Reach, CPC, CTR, CPA ทุกวัน บันทึกความผิดปกติ เปรียบเทียบกับ Baseline" },
      { t:"dec",   q:"Performance ดีพอ?", yes:"ดี → Maintain หรือ Scale งบขึ้น", no:"ไม่ดี → ปรับทันที: เปลี่ยน Creative / ปรับ Audience / ปิด Ad Set" },
      { t:"phase", label:"รายสัปดาห์ — Optimization" },
      { t:"step",  role:"exec", n:6, title:"Boost Static หรือ VDO ที่ Organic ดี", detail:"แจ้ง Content Marketing ก่อนทุกครั้ง" },
      { t:"step",  role:"exec", n:7, title:"A/B Test Creative + สรุป Insight รายสัปดาห์", detail:"ทดสอบ Headline, ภาพ หรือ CTA ใหม่คู่กับชิ้นที่ดีอยู่ ส่ง Weekly Summary ให้ Manager" },
      { t:"phase", label:"KOL / Influencer Management" },
      { t:"step",  role:"exec", n:8, title:"ค้นหาและติดต่อ KOL เบื้องต้น", detail:"วิเคราะห์ KOL: ยอดผู้ติดตาม, Engagement Rate, กลุ่มผู้ชม ยังไม่ตกลงราคา" },
      { t:"dec",   q:"Manager อนุมัติ KOL?", yes:"ผ่าน → เจรจาและลงนาม", no:"ไม่ผ่าน → ค้นหา KOL รายใหม่" },
      { t:"step",  role:"exec", n:9, title:"ติดตามงาน KOL + ตรวจผลลัพธ์", detail:"ตรวจ Content ก่อน Publish ติดตาม Reach/Engagement/Link Click หลัง Publish" },
      { t:"phase", label:"วันอังคารต้นเดือน — Report" },
      REPORT_STEP,
      { t:"step",  role:"mgr", n:10, title:"Manager รับ Report ทั้ง 3 ส่วน + อนุมัติแผนเดือนถัดไป", detail:"เทียบ KPI ให้ Feedback และอนุมัติงบ + Campaign Plan เดือนถัดไป" },
    ],
  },
};

// ─── Sub-components (Light Theme) ────────────────────────────────────────────

function PhaseBar({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex items-center gap-3 w-full my-3">
      <div className="flex-1 h-px bg-gray-200" />
      <span
        className="text-[10.5px] font-extrabold px-3 py-1 rounded-full whitespace-nowrap tracking-wide shadow-sm"
        style={{ background: color, color: "#fff" }}
      >
        {label}
      </span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );
}

function Arrow() {
  return <div className="text-gray-300 text-xl leading-none py-0.5 text-center select-none">↓</div>;
}

function StepCard({ step }: { step: Extract<Step, { t: "step" }> }) {
  const role = ROLES[step.role];
  return (
    <>
      <div
        className="w-full flex rounded-lg overflow-hidden shadow-sm border"
        style={{ borderColor: role.border }}
      >
        {/* Number strip */}
        <div
          className="min-w-[44px] flex items-center justify-center text-lg font-extrabold text-white flex-shrink-0"
          style={{ background: role.color }}
        >
          {step.n}
        </div>
        {/* Body */}
        <div className="flex-1 px-4 py-3" style={{ background: role.bg }}>
          <div
            className="text-[10px] font-extrabold uppercase tracking-widest mb-1"
            style={{ color: role.color }}
          >
            {role.label}
          </div>
          <div className="text-[13.5px] font-bold text-gray-800 mb-1">{step.title}</div>
          <div className="text-[11.5px] text-gray-500 leading-relaxed">{step.detail}</div>
          {step.note && (
            <div className="mt-2 text-[11px] text-gray-500 italic bg-white/70 border-l-2 pl-2 py-1 rounded-r"
              style={{ borderColor: role.color }}>
              📌 {step.note}
            </div>
          )}
        </div>
      </div>
      <Arrow />
    </>
  );
}

function DecisionCard({ step }: { step: Extract<Step, { t: "dec" }> }) {
  return (
    <>
      <div className="w-full flex rounded-lg overflow-hidden shadow-sm border-2 border-amber-400">
        <div className="min-w-[44px] bg-amber-400 flex items-center justify-center text-white font-black text-xl flex-shrink-0">?</div>
        <div className="flex-1 px-4 py-3 bg-amber-50">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-amber-600 mb-1">Decision Point</div>
          <div className="text-[13.5px] font-bold text-gray-800 mb-2">{step.q}</div>
          <div className="text-xs font-semibold text-red-600">✕ {step.no}</div>
          <div className="text-xs font-semibold text-green-700 mt-0.5">✓ {step.yes}</div>
        </div>
      </div>
      <Arrow />
    </>
  );
}

function ParallelBlock({ step }: { step: Extract<Step, { t: "parallel" }> }) {
  return (
    <>
      <p className="text-center text-xs font-bold text-gray-400 w-full mb-1.5 tracking-wide">⟶ ดำเนินการพร้อมกัน</p>
      <div className="w-full flex gap-2">
        {step.items.map((item, i) => {
          const role = ROLES[item.role];
          return (
            <div
              key={i}
              className="flex-1 rounded-lg p-3 shadow-sm border min-w-0"
              style={{ borderTop: `3px solid ${role.color}`, background: role.bg, borderColor: role.border }}
            >
              <div
                className="text-[9px] font-extrabold uppercase tracking-widest mb-1.5"
                style={{ color: role.color }}
              >
                {role.label}
              </div>
              <div className="text-xs font-bold text-gray-800 mb-1 leading-snug">{item.title}</div>
              <div className="text-[11px] text-gray-500 leading-relaxed">{item.detail}</div>
              {item.note && (
                <div className="mt-2 text-[10.5px] text-gray-400 italic border-t border-gray-200 pt-2">
                  📌 {item.note}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <Arrow />
    </>
  );
}

function MeetingCard({ step }: { step: Extract<Step, { t: "meet" }> }) {
  return (
    <>
      <div className="w-full flex rounded-lg overflow-hidden shadow-sm border-2 border-purple-300">
        <div className="min-w-[44px] bg-purple-600 flex items-center justify-center text-xl flex-shrink-0">👥</div>
        <div className="flex-1 px-4 py-3 bg-purple-50">
          <div className="text-sm font-extrabold text-purple-700 mb-2">STEP {step.n} — {step.title}</div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {step.pp.map((p) => (
              <span
                key={p}
                className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full shadow-sm"
                style={{ background: ROLES[p].color }}
              >
                {ROLES[p].label}
              </span>
            ))}
          </div>
          <div className="text-xs text-gray-600 leading-relaxed">{step.detail}</div>
        </div>
      </div>
      <Arrow />
    </>
  );
}

function ReportBlock() {
  const cols = [
    { rk: "cm"   as RoleKey, rtitle: "Organic Report",         rdetail: "Reach, Engagement, Top Post, Follower Growth, Insight รายเดือน" },
    { rk: "exec" as RoleKey, rtitle: "Paid Ads Report",        rdetail: "งบที่ใช้, ROAS, Cost per Lead, Top Ad, ผล KOL, แผนเดือนถัดไป" },
    { rk: "vdo"  as RoleKey, rtitle: "VDO Performance Report", rdetail: "Top 3 คลิป, View รวม, Watch Time, Completion Rate, Follower Growth" },
  ];
  return (
    <>
      <div className="w-full rounded-lg overflow-hidden shadow-sm border border-gray-200">
        <div className="bg-gray-700 px-4 py-2.5 flex items-center gap-3">
          <span className="text-sm font-bold text-white">📊 รายงานแยกตำแหน่ง — ส่งพร้อมกัน</span>
          <span className="ml-auto bg-orange-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
            ภายในวันอังคารต้นเดือน
          </span>
        </div>
        <div className="flex divide-x divide-gray-100">
          {cols.map(({ rk, rtitle, rdetail }) => {
            const r = ROLES[rk];
            return (
              <div key={rk} className="flex-1 px-3 py-3 bg-white">
                <div className="text-[10px] font-extrabold uppercase tracking-wide mb-1" style={{ color: r.color }}>{r.label}</div>
                <div className="text-xs font-bold text-gray-800 mb-1">{rtitle}</div>
                <div className="text-[11px] text-gray-500 leading-relaxed">{rdetail}</div>
              </div>
            );
          })}
        </div>
      </div>
      <Arrow />
    </>
  );
}

function VdoInputBlock() {
  return (
    <>
      <div className="w-full rounded-lg overflow-hidden shadow-sm border border-blue-200">
        <div className="bg-blue-600 px-4 py-2.5 text-sm font-bold text-white">
          📡 Marketing Executive ส่ง Brief พร้อมกันทั้ง 2 ตำแหน่ง
        </div>
        <div className="flex divide-x divide-gray-100">
          <div className="flex-1 px-4 py-3 bg-green-50">
            <div className="text-[10px] font-extrabold uppercase tracking-wide mb-1" style={{ color: ROLES.cm.color }}>Content Marketing รับ</div>
            <div className="text-xs font-bold text-gray-800 mb-1">Theme & Concept ประจำเดือน</div>
            <div className="text-[11px] text-gray-500 leading-relaxed">นำไปจัด Content Calendar — กำหนด Slot วัน/เวลา VDO ที่จะ Publish ในตาราง</div>
          </div>
          <div className="flex-1 px-4 py-3 bg-red-50">
            <div className="text-[10px] font-extrabold uppercase tracking-wide mb-1" style={{ color: ROLES.vdo.color }}>VDO Creator รับ</div>
            <div className="text-xs font-bold text-gray-800 mb-1">Theme & Concept ประจำเดือน</div>
            <div className="text-[11px] text-gray-500 leading-relaxed">นำไปคิด Story + พัฒนาไอเดียคลิปเอง โดยอ้างอิง Theme เดียวกัน</div>
          </div>
        </div>
      </div>
      <Arrow />
    </>
  );
}

function VdoCalendarBlock() {
  return (
    <>
      <div className="w-full rounded-lg overflow-hidden shadow-sm border-2 border-amber-300 bg-amber-50">
        <div className="px-4 py-2.5 border-b border-amber-200 bg-amber-100">
          <span className="text-sm font-bold text-amber-800">📅 VDO Creator กรอก Concept ลงใน Content Calendar</span>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-gray-600 leading-relaxed mb-3">
            Content Marketing จัด <strong>Slot วัน/เวลา VDO</strong> ไว้ใน Calendar แล้ว — VDO Creator นำไอเดียมา<strong>กรอกเพิ่มเติม</strong>ในช่องที่เตรียมไว้
          </p>
          <div className="flex gap-2">
            <div className="flex-1 rounded-lg p-3 bg-red-50 border border-red-200">
              <div className="text-[10px] font-extrabold uppercase mb-1" style={{ color: ROLES.vdo.color }}>VDO Creator กรอก</div>
              <div className="text-[11px] text-gray-600 leading-relaxed">ชื่อหัวข้อคลิป, Hook แนวคิด, Format (On-site/In-house) และความยาวที่ต้องการ — ลงใน Slot ที่ CM จัดไว้</div>
            </div>
            <div className="flex-1 rounded-lg p-3 bg-green-50 border border-green-200">
              <div className="text-[10px] font-extrabold uppercase mb-1" style={{ color: ROLES.cm.color }}>Content Marketing ตรวจ</div>
              <div className="text-[11px] text-gray-600 leading-relaxed">ดู Concept ที่ VDO Creator กรอกมา — ตรวจว่าเดินทางตาม Theme & Direction ที่ Exec กำหนดไว้มั้ย</div>
            </div>
          </div>
        </div>
      </div>
      <Arrow />
    </>
  );
}

function AdCreativeBlock() {
  return (
    <>
      <div className="w-full rounded-lg overflow-hidden shadow-sm border-2 border-blue-200 bg-blue-50">
        <div className="px-4 py-2.5 border-b border-blue-200 bg-blue-100">
          <span className="text-sm font-bold text-blue-800">🎨 ขอ Ad Creative — แยกตามประเภทสื่อ</span>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-gray-600 mb-3 leading-relaxed">
            Marketing Executive แจ้ง Content Marketing → Content Marketing ส่ง Brief ต่อตามประเภท:
          </p>
          <div className="flex gap-2">
            <div className="flex-1 rounded-lg p-3 border-t-4 bg-orange-50 border border-orange-200" style={{ borderTopColor: ROLES.gd.color }}>
              <div className="text-[10px] font-extrabold uppercase mb-1" style={{ color: ROLES.gd.color }}>📸 ภาพนิ่ง → Graphic Designer</div>
              <div className="text-xs font-bold text-gray-800 mb-1">ออกแบบ Ad Creative (Static)</div>
              <div className="text-[11px] text-gray-500 leading-relaxed">Banner, Promotional Post, Carousel — Self QC → Content Marketing ตรวจ → Exec รับไปยิงโฆษณา</div>
            </div>
            <div className="flex-1 rounded-lg p-3 border-t-4 bg-red-50 border border-red-200" style={{ borderTopColor: ROLES.vdo.color }}>
              <div className="text-[10px] font-extrabold uppercase mb-1" style={{ color: ROLES.vdo.color }}>🎬 คลิป → VDO Creator</div>
              <div className="text-xs font-bold text-gray-800 mb-1">ผลิต Ad Video (Short-form)</div>
              <div className="text-[11px] text-gray-500 leading-relaxed">คลิป 15–30 วิ Hook แรก 3 วิ + CTA ชัด → Content Marketing QC → Exec รับไปยิงโฆษณา</div>
            </div>
          </div>
        </div>
      </div>
      <Arrow />
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function MarketingWorkflow() {
  const [activeTab, setActiveTab] = useState<TabKey>("vdo");
  const flow = FLOWS[activeTab];
  const tabColor = TABS.find((t) => t.key === activeTab)?.color ?? "#7e22ce";

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-12">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-5">
          <h1 className="text-xl font-extrabold text-gray-800">Marketing Team — Workflow</h1>
          <p className="text-xs text-gray-400 mt-1">เลือกประเภทงานเพื่อดู Flow การทำงานแบบละเอียด</p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 justify-center mb-5">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="px-4 py-1.5 rounded-full text-xs font-bold border-2 transition-all duration-150 shadow-sm"
              style={
                activeTab === tab.key
                  ? { background: tab.color, borderColor: tab.color, color: "#fff" }
                  : { background: "#fff", borderColor: "#e5e7eb", color: "#6b7280" }
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Flow header */}
        <div
          className="rounded-lg px-4 py-3 mb-4 border-l-4 bg-white shadow-sm border border-gray-100"
          style={{ borderLeftColor: tabColor }}
        >
          <div className="text-sm font-bold text-gray-800">{flow.title}</div>
          <div className="text-xs text-gray-500 mt-1 leading-relaxed">{flow.desc}</div>
        </div>

        {/* Steps */}
        <div className="flex flex-col items-center gap-0">
          {flow.steps.map((step, i) => {
            if (step.t === "phase")       return <PhaseBar      key={i} label={step.label} color={tabColor} />;
            if (step.t === "step")        return <StepCard      key={i} step={step} />;
            if (step.t === "dec")         return <DecisionCard  key={i} step={step} />;
            if (step.t === "parallel")    return <ParallelBlock key={i} step={step} />;
            if (step.t === "meet")        return <MeetingCard   key={i} step={step} />;
            if (step.t === "report")      return <ReportBlock   key={i} />;
            if (step.t === "adcreative")  return <AdCreativeBlock  key={i} />;
            if (step.t === "vdoinput")    return <VdoInputBlock    key={i} />;
            if (step.t === "vdocalendar") return <VdoCalendarBlock key={i} />;
            return null;
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center mt-8 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
          <p className="w-full text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">ตำแหน่งในทีม</p>
          {Object.entries(ROLES).map(([key, r]) => (
            <div key={key} className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: r.color }} />
              {r.label}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
