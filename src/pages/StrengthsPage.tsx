/**
 * StrengthsPage.tsx — CliftonStrengths-style Quiz & Report
 * อิง Gallup's 34 Strengths Themes
 * รูปแบบ: A/B paired statements → scoring → Top 5 report + expandable 34
 */
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { ChevronDown, ChevronUp, RotateCcw, Trophy, Zap, Users, Brain, Cog, ArrowRight, CheckCircle2, Loader2, Download, FileText } from "lucide-react";
import { useCurrentUser } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";
import { openTop5Report, openSignatureReport, LONG_DESC } from "./StrengthsReportGenerator";

// ─── 34 Themes Definition ─────────────────────────────────────────────────────
type Domain = "Executing" | "Influencing" | "Relationship" | "Strategic";

interface Theme {
  id: string;
  name: string;
  nameTH: string;
  domain: Domain;
  color: string;
  description: string;
  descriptionTH: string;
  salesTip: string;
}

const THEMES: Theme[] = [
  // EXECUTING
  { id: "achiever",      name: "Achiever",       nameTH: "นักบรรลุเป้า",     domain: "Executing",     color: "#7C3AED",
    description: "Tremendous drive and work ethic. You feel productive every day.",
    descriptionTH: "คุณมีแรงขับมหาศาล ทำงานหนักและรู้สึกมีคุณค่าเมื่อทำสิ่งสำเร็จทุกวัน",
    salesTip: "ตั้ง daily quota ให้ตัวเอง ติดตามผลทุกวัน ความสำเร็จเล็กๆ จะสะสมเป็นผลลัพธ์ใหญ่" },
  { id: "arranger",      name: "Arranger",        nameTH: "นักจัดการ",          domain: "Executing",     color: "#6D28D9",
    description: "Skilled at organizing and orchestrating resources for maximum productivity.",
    descriptionTH: "คุณจัดระบบและประสานงานได้อย่างยอดเยี่ยม หาวิธีทำงานที่มีประสิทธิภาพสูงสุดได้เสมอ",
    salesTip: "ใช้ทักษะจัดการ pipeline ลูกค้าหลายรายพร้อมกัน จัดคิวติดตามอย่างเป็นระบบ" },
  { id: "belief",        name: "Belief",          nameTH: "นักความเชื่อ",       domain: "Executing",     color: "#5B21B6",
    description: "Have core values that are unchanging. You act in line with your beliefs.",
    descriptionTH: "คุณมีค่านิยมแข็งแกร่งที่ไม่เปลี่ยนแปลง ทำงานในสิ่งที่เชื่อและมีความหมาย",
    salesTip: "เลือกขายโปรแกรมที่คุณเชื่อจริงๆ ความจริงใจจะส่งถึงลูกค้า" },
  { id: "consistency",   name: "Consistency",     nameTH: "นักความสม่ำเสมอ",    domain: "Executing",     color: "#4C1D95",
    description: "Believe in treating everyone fairly with clear rules and processes.",
    descriptionTH: "คุณเชื่อในความเป็นธรรม กฎเกณฑ์ชัดเจน ทำทุกคนเท่าเทียม",
    salesTip: "สร้าง SOP การขายที่ชัดเจน ลูกค้าทุกคนได้รับการบริการมาตรฐานเดียวกัน" },
  { id: "deliberative",  name: "Deliberative",    nameTH: "นักรอบคอบ",          domain: "Executing",     color: "#7C3AED",
    description: "Careful, vigilant, and thorough. You think before you leap.",
    descriptionTH: "คุณรอบคอบ ชั่งน้ำหนักความเสี่ยงก่อนตัดสินใจเสมอ",
    salesTip: "ใช้ความรอบคอบเตรียม pitch deck ที่ครบถ้วน ลูกค้าจะไว้วางใจในความละเอียด" },
  { id: "discipline",    name: "Discipline",      nameTH: "นักวินัย",            domain: "Executing",     color: "#6D28D9",
    description: "Create order and structure. You are precise and productive.",
    descriptionTH: "คุณชอบโครงสร้างและแผนงาน สร้างความเป็นระเบียบได้ดี",
    salesTip: "ทำ weekly sales plan เป็นนิสัย ติดตาม KPI ทุกสัปดาห์" },
  { id: "focus",         name: "Focus",           nameTH: "นักโฟกัส",           domain: "Executing",     color: "#5B21B6",
    description: "Take direction and prioritize to stay on target.",
    descriptionTH: "คุณกำหนดเป้าหมายชัดเจน ไม่ให้สิ่งรบกวนมาดึงความสนใจ",
    salesTip: "เลือก niche ลูกค้าที่ชัด ไม่กระจายแรง focus ที่กลุ่มเป้าหมาย" },
  { id: "responsibility", name: "Responsibility", nameTH: "นักความรับผิดชอบ",   domain: "Executing",     color: "#4C1D95",
    description: "Take ownership of what you say you will do. High integrity.",
    descriptionTH: "คุณรับผิดชอบสูง ทำตามสัญญาเสมอ รู้สึกผิดเมื่อทำไม่สำเร็จ",
    salesTip: "รับปากลูกค้าเฉพาะสิ่งที่ทำได้จริง ความไว้วางใจคือสินทรัพย์สูงสุดของคุณ" },
  { id: "restorative",   name: "Restorative",     nameTH: "นักแก้ปัญหา",        domain: "Executing",     color: "#7C3AED",
    description: "Great at dealing with problems. You enjoy diagnosing and fixing.",
    descriptionTH: "คุณเก่งด้านแก้ปัญหา หาทางออกได้เสมอแม้สถานการณ์ยากลำบาก",
    salesTip: "เมื่อลูกค้ามีข้อกังวล คุณคือคนที่แก้ได้ ทำให้ objection กลายเป็นโอกาส" },
  // INFLUENCING
  { id: "activator",     name: "Activator",       nameTH: "นักลงมือ",           domain: "Influencing",   color: "#DC2626",
    description: "Impatient for action. When a decision is made, you act.",
    descriptionTH: "คุณลงมือทำทันที ไม่ชอบรอ เชื่อว่า action คือคำตอบ",
    salesTip: "โทรหาลูกค้าทันทีที่ได้ lead ใหม่ ความเร็วคือจุดแข็งของคุณ" },
  { id: "command",       name: "Command",         nameTH: "นักนำ",              domain: "Influencing",   color: "#B91C1C",
    description: "Take charge, face conflict head-on, and lead others.",
    descriptionTH: "คุณกล้าตัดสินใจ นำคนได้ ไม่กลัวความขัดแย้ง",
    salesTip: "ใช้ความมั่นใจนำการประชุมลูกค้า ปิดการขายด้วยความชัดเจน" },
  { id: "communication", name: "Communication",   nameTH: "นักสื่อสาร",         domain: "Influencing",   color: "#DC2626",
    description: "Find it easy to put thoughts into words. Great presenter and storyteller.",
    descriptionTH: "คุณเล่าเรื่องได้ดี สื่อสารได้ชัดเจนและน่าฟัง",
    salesTip: "เล่าเรื่อง success story ของลูกค้าเก่าให้ prospect ฟัง storytelling คือ conversion tool" },
  { id: "competition",   name: "Competition",     nameTH: "นักแข่งขัน",         domain: "Influencing",   color: "#B91C1C",
    description: "Measure your performance against others and strive to win.",
    descriptionTH: "คุณวัดผลตัวเองกับคนอื่น ชอบแข่ง อยากชนะเสมอ",
    salesTip: "ติดตาม leaderboard ทีม Sales ใช้ ranking เป็นแรงจูงใจ" },
  { id: "maximizer",     name: "Maximizer",       nameTH: "นักดีที่สุด",        domain: "Influencing",   color: "#DC2626",
    description: "Focus on strengths to stimulate excellence in yourself and others.",
    descriptionTH: "คุณมุ่งสู่ความเป็นเลิศ ทำให้สิ่งที่ดีอยู่แล้วดียิ่งขึ้น",
    salesTip: "เจาะลึกกลุ่มลูกค้าที่ convert ดีที่สุดแล้ว ทำให้ดียิ่งขึ้นอีก" },
  { id: "selfAssurance", name: "Self-Assurance",  nameTH: "นักมั่นใจ",          domain: "Influencing",   color: "#B91C1C",
    description: "Confident in your abilities and decisions. Trust your instincts.",
    descriptionTH: "คุณมั่นใจในตัวเองและการตัดสินใจ เชื่อสัญชาตญาณ",
    salesTip: "ความมั่นใจส่งผ่านไปยังลูกค้า ทำให้ลูกค้ารู้สึกปลอดภัยที่จะซื้อ" },
  { id: "significance",  name: "Significance",    nameTH: "นักความสำคัญ",       domain: "Influencing",   color: "#DC2626",
    description: "Want to be significant and recognized as important.",
    descriptionTH: "คุณอยากสร้างผลกระทบที่สำคัญ อยากได้รับการยอมรับ",
    salesTip: "ตั้งเป้า stretch goal ที่จะทำให้คุณโดดเด่นในทีม" },
  { id: "woo",           name: "Woo",             nameTH: "นักสร้างความประทับใจ", domain: "Influencing", color: "#B91C1C",
    description: "Win others over. Thrive on meeting new people.",
    descriptionTH: "คุณสร้างความประทับใจแรกได้ง่าย ชอบเจอคนใหม่ๆ",
    salesTip: "เปิดหน้าลูกค้าใหม่ได้เก่ง ใช้จุดแข็งนี้ขยายฐานลูกค้า" },
  // RELATIONSHIP BUILDING
  { id: "adaptability",  name: "Adaptability",    nameTH: "นักปรับตัว",         domain: "Relationship",  color: "#059669",
    description: "Live in the moment and easily adapt to change.",
    descriptionTH: "คุณยืดหยุ่น ปรับตัวกับการเปลี่ยนแปลงได้ดี อยู่กับปัจจุบัน",
    salesTip: "รับมือกับสถานการณ์ที่เปลี่ยนไปได้ดี เช่น ลูกค้าเปลี่ยนใจกลางคัน" },
  { id: "connectedness", name: "Connectedness",   nameTH: "นักเชื่อมโยง",       domain: "Relationship",  color: "#047857",
    description: "Have faith that all things are connected and find meaning in this.",
    descriptionTH: "คุณมองเห็นความเชื่อมโยงของทุกสิ่ง ทุกเหตุการณ์มีความหมาย",
    salesTip: "เชื่อมลูกค้ากับประสบการณ์ท่องเที่ยวที่ตรงกับชีวิตของเขา" },
  { id: "developer",     name: "Developer",       nameTH: "นักพัฒนาคน",         domain: "Relationship",  color: "#059669",
    description: "Recognize and cultivate potential in others.",
    descriptionTH: "คุณมองเห็นศักยภาพในคน ชอบช่วยให้คนอื่นเติบโต",
    salesTip: "ใช้ coaching น้องในทีม ความสามารถพัฒนาคนจะทำให้ทีมแข็งแกร่ง" },
  { id: "empathy",       name: "Empathy",         nameTH: "นักเข้าใจ",          domain: "Relationship",  color: "#047857",
    description: "Sense others' feelings and see the world from their perspective.",
    descriptionTH: "คุณรู้สึกอารมณ์และมุมมองของคนอื่นได้ราวกับตัวเอง",
    salesTip: "รับรู้ความต้องการที่ซ่อนอยู่ของลูกค้า นำเสนอทัวร์ที่ตรงใจ" },
  { id: "harmony",       name: "Harmony",         nameTH: "นักความกลมกลืน",     domain: "Relationship",  color: "#059669",
    description: "Look for consensus and avoid conflict.",
    descriptionTH: "คุณหาจุดร่วม หลีกเลี่ยงความขัดแย้ง ทำให้ทุกคนเห็นด้วย",
    salesTip: "เจรจาต่อรองราคาด้วยความนุ่มนวล หาทางออกที่ win-win ทั้งสองฝ่าย" },
  { id: "includer",      name: "Includer",        nameTH: "นักรวมใจ",           domain: "Relationship",  color: "#047857",
    description: "Accept others and make them feel part of the group.",
    descriptionTH: "คุณรับทุกคนเข้ากลุ่ม ไม่ทอดทิ้งใคร ทำให้ทุกคนรู้สึกมีคุณค่า",
    salesTip: "ทำให้ลูกค้าทุกกลุ่มรู้สึกว่ามีโปรแกรมสำหรับเขา" },
  { id: "individualization", name: "Individualization", nameTH: "นักสังเกตความแตกต่าง", domain: "Relationship", color: "#059669",
    description: "Intrigued by the unique qualities of each person.",
    descriptionTH: "คุณสังเกตเห็นความแตกต่างของแต่ละคน ปรับแนวทางให้เหมาะกับแต่ละคน",
    salesTip: "จดจำรายละเอียดเฉพาะของลูกค้าแต่ละคน personalize ทุก interaction" },
  { id: "positivity",    name: "Positivity",      nameTH: "นักพลังบวก",         domain: "Relationship",  color: "#047857",
    description: "Contagious enthusiasm. You celebrate every achievement.",
    descriptionTH: "คุณมีพลังงานบวกที่ติดต่อได้ ฉลองความสำเร็จเสมอ สร้างความกระตือรือร้น",
    salesTip: "ความกระตือรือร้นของคุณจะทำให้ลูกค้าตื่นเต้นกับทริปที่จะไป" },
  { id: "relator",       name: "Relator",         nameTH: "นักความสัมพันธ์ลึก", domain: "Relationship",  color: "#059669",
    description: "Enjoy close, deep relationships with a select few.",
    descriptionTH: "คุณสร้างความสัมพันธ์ลึกซึ้งกับคนไม่กี่คน แต่แน่นแฟ้นมาก",
    salesTip: "ลูกค้า loyal ของคุณจะกลับมาซ้ำและแนะนำเพื่อน นั่นคือจุดแข็ง" },
  // STRATEGIC THINKING
  { id: "analytical",   name: "Analytical",      nameTH: "นักวิเคราะห์",       domain: "Strategic",     color: "#1D4ED8",
    description: "Search for reasons and causes. Demand proof before accepting anything.",
    descriptionTH: "คุณตั้งคำถาม ต้องการข้อมูลและหลักฐาน ก่อนยอมรับสิ่งใด",
    salesTip: "ใช้ข้อมูล booking rate และ review ลูกค้าในการ pitch โปรแกรม" },
  { id: "context",      name: "Context",         nameTH: "นักความเป็นมา",      domain: "Strategic",     color: "#1E40AF",
    description: "Look back to understand the present. History illuminates the way forward.",
    descriptionTH: "คุณเรียนรู้จากอดีต เข้าใจที่มาที่ไปของสถานการณ์",
    salesTip: "เข้าใจ pattern ลูกค้าจากประวัติการจอง วางกลยุทธ์บนข้อมูลจริง" },
  { id: "futuristic",   name: "Futuristic",      nameTH: "นักวิสัยทัศน์",      domain: "Strategic",     color: "#1D4ED8",
    description: "Inspired by the future and what could be.",
    descriptionTH: "คุณมองไปยังอนาคต วาดภาพที่เป็นไปได้ใหม่เสมอ",
    salesTip: "pitch ทริปในฝันให้ลูกค้า ทำให้เขาเห็นภาพอนาคตที่น่าตื่นเต้น" },
  { id: "ideation",     name: "Ideation",        nameTH: "นักไอเดีย",          domain: "Strategic",     color: "#1E40AF",
    description: "Fascinated by ideas. Find connections between seemingly disparate things.",
    descriptionTH: "คุณหลงใหลในไอเดียใหม่ๆ คิดนอกกรอบ หาความเชื่อมโยงที่คนอื่นมองไม่เห็น",
    salesTip: "คิดแคมเปญการตลาดใหม่ๆ ที่แตกต่าง สร้าง offer ที่ไม่เหมือนใคร" },
  { id: "input",        name: "Input",           nameTH: "นักสะสมความรู้",     domain: "Strategic",     color: "#1D4ED8",
    description: "Crave to know more. Collect information and resources.",
    descriptionTH: "คุณอยากรู้มากขึ้นเสมอ สะสมข้อมูล ความรู้ และทรัพยากร",
    salesTip: "รู้จักทุก destination อย่างลึกซึ้ง ความเชี่ยวชาญของคุณสร้างความไว้ใจ" },
  { id: "intellection", name: "Intellection",    nameTH: "นักคิดลึก",          domain: "Strategic",     color: "#1E40AF",
    description: "Introspective and appreciate intellectual discussions.",
    descriptionTH: "คุณชอบคิดลึก ถามตัวเองบ่อย ใช้เวลาไตร่ตรองก่อนพูด",
    salesTip: "เตรียมคำตอบสำหรับ objection ลูกค้าล่วงหน้าด้วยการคิดอย่างรอบคอบ" },
  { id: "learner",      name: "Learner",         nameTH: "นักเรียนรู้",        domain: "Strategic",     color: "#1D4ED8",
    description: "Desire to continuously learn and improve.",
    descriptionTH: "คุณชอบเรียนรู้สิ่งใหม่เสมอ กระบวนการเรียนรู้คือรางวัลในตัวมันเอง",
    salesTip: "เรียนรู้เทคนิค sales ใหม่ๆ อยู่เสมอ คุณจะก้าวหน้าเร็วกว่าคนอื่น" },
  { id: "strategic",    name: "Strategic",       nameTH: "นักกลยุทธ์",         domain: "Strategic",     color: "#1E40AF",
    description: "Create alternative ways to proceed. Find the best route.",
    descriptionTH: "คุณมองเห็นหลายเส้นทาง เลือกวิธีที่ดีที่สุด วางแผนได้หลายทางเลือก",
    salesTip: "วางแผน sales approach หลายแบบ ปรับกลยุทธ์ตาม feedback ได้ทันที" },
];

// ─── Quiz Questions (68 pairs) ─────────────────────────────────────────────────
interface QuizPair {
  a: { text: string; theme: string };
  b: { text: string; theme: string };
}

const QUIZ_PAIRS: QuizPair[] = [
  { a: { text: "ฉันรู้สึกพึงพอใจมากเมื่อทำงานสำเร็จครบทุกอย่างในวันนั้น", theme: "achiever" },
    b: { text: "ฉันมักมองหาวิธีใหม่ๆ ในการทำงานที่ยังไม่เคยลองมาก่อน", theme: "ideation" } },
  { a: { text: "ฉันชอบจัดระบบและวางแผนว่าใครทำอะไรเพื่อให้งานสำเร็จ", theme: "arranger" },
    b: { text: "ฉันมักรู้สึกเชื่อมโยงกับคนอื่นและเข้าใจว่าเขากำลังรู้สึกอะไร", theme: "empathy" } },
  { a: { text: "สิ่งที่ฉันทำต้องสอดคล้องกับสิ่งที่ฉันเชื่อและให้คุณค่า", theme: "belief" },
    b: { text: "ฉันชอบรวบรวมข้อมูลและความรู้จากหลายๆ ด้านไว้เสมอ", theme: "input" } },
  { a: { text: "ฉันเชื่อว่าทุกคนควรได้รับการปฏิบัติอย่างเป็นธรรมและเท่าเทียม", theme: "consistency" },
    b: { text: "ฉันชอบเจอคนใหม่ๆ และทำให้พวกเขารู้สึกสบายใจได้ทันที", theme: "woo" } },
  { a: { text: "ฉันคิดอย่างรอบคอบก่อนตัดสินใจ ไม่เคยทำสิ่งใดอย่างรีบร้อน", theme: "deliberative" },
    b: { text: "ฉันชอบวิเคราะห์ข้อมูล ตั้งคำถาม และหาหลักฐานสนับสนุน", theme: "analytical" } },
  { a: { text: "ฉันชอบสร้างระบบและโครงสร้างเพื่อให้ทำงานได้มีประสิทธิภาพ", theme: "discipline" },
    b: { text: "ฉันมักมองไปข้างหน้าและนึกถึงสิ่งที่จะเกิดขึ้นในอนาคต", theme: "futuristic" } },
  { a: { text: "เมื่อกำหนดเป้าหมายแล้ว ฉันไม่ยอมให้สิ่งอื่นมาดึงสมาธิ", theme: "focus" },
    b: { text: "ฉันชอบสร้างความสัมพันธ์ที่ลึกซึ้งกับคนไม่กี่คนมากกว่ารู้จักคนมากมาย", theme: "relator" } },
  { a: { text: "ฉันรับผิดชอบกับสิ่งที่พูดไว้เสมอ แม้สถานการณ์จะเปลี่ยน", theme: "responsibility" },
    b: { text: "ฉันมักรู้สึกดีใจเมื่อเห็นคนอื่นเติบโตและพัฒนาตัวเอง", theme: "developer" } },
  { a: { text: "เมื่อเจอปัญหา ฉันมักคิดหาทางแก้ไขได้เร็วกว่าคนอื่น", theme: "restorative" },
    b: { text: "ฉันชอบอยู่กับปัจจุบัน และปรับตัวได้ดีเมื่อสถานการณ์เปลี่ยน", theme: "adaptability" } },
  { a: { text: "เมื่อตัดสินใจแล้ว ฉันลงมือทำทันที ไม่ชอบรอ", theme: "activator" },
    b: { text: "ฉันชอบคิดลึกคนเดียว ตั้งคำถามกับตัวเองก่อนพูดหรือทำ", theme: "intellection" } },
  { a: { text: "ฉันไม่กลัวการเผชิญหน้า และสามารถพูดความจริงได้ตรงๆ", theme: "command" },
    b: { text: "ฉันมองเห็นศักยภาพในคนอื่นที่พวกเขาอาจยังไม่รู้จัก", theme: "developer" } },
  { a: { text: "ฉันสื่อสารได้ดี เล่าเรื่องได้น่าสนใจ และคนชอบฟัง", theme: "communication" },
    b: { text: "ฉันชอบเรียนรู้สิ่งใหม่ๆ อยู่เสมอ กระบวนการเรียนรู้ทำให้ฉันมีชีวิตชีวา", theme: "learner" } },
  { a: { text: "ฉันชอบวัดผลตัวเองกับคนอื่น และอยากเป็นผู้ชนะ", theme: "competition" },
    b: { text: "ฉันมักหาจุดร่วมระหว่างคนที่มีความเห็นต่าง เพื่อลดความขัดแย้ง", theme: "harmony" } },
  { a: { text: "ฉันมุ่งมั่นทำให้ทุกอย่างดีที่สุด ไม่พอใจกับ 'ดีพอ'", theme: "maximizer" },
    b: { text: "ฉันมักนึกถึงอดีตเพื่อเข้าใจสถานการณ์ปัจจุบันได้ดีขึ้น", theme: "context" } },
  { a: { text: "ฉันมั่นใจในการตัดสินใจของตัวเอง แม้ว่าคนอื่นจะไม่เห็นด้วย", theme: "selfAssurance" },
    b: { text: "ฉันมองเห็นความเชื่อมโยงของทุกสิ่ง ทุกเหตุการณ์มีความหมาย", theme: "connectedness" } },
  { a: { text: "ฉันอยากสร้างผลลัพธ์ที่สำคัญและได้รับการยอมรับ", theme: "significance" },
    b: { text: "ฉันชอบวางแผนหลายทางเลือกเพื่อเลือกเส้นทางที่ดีที่สุด", theme: "strategic" } },
  { a: { text: "ฉันชอบเจอคนใหม่ๆ และรู้สึกตื่นเต้นทุกครั้งที่ได้พบปะผู้คน", theme: "woo" },
    b: { text: "ฉันมักรู้สึกว่าทุกคนมีคุณค่าและควรได้รับการยอมรับ", theme: "includer" } },
  { a: { text: "ฉันปรับตัวได้ดีเมื่อสถานการณ์เปลี่ยนแปลงกะทันหัน", theme: "adaptability" },
    b: { text: "ฉันทำงานหนักทุกวันและรู้สึกว่าต้องทำสิ่งสำเร็จให้ได้", theme: "achiever" } },
  { a: { text: "ฉันเชื่อว่าทุกสิ่งเกิดขึ้นด้วยเหตุผล และมีความเชื่อมโยงกัน", theme: "connectedness" },
    b: { text: "ฉันชอบจัดระบบและวางแผนการทำงานอย่างเป็นระเบียบ", theme: "discipline" } },
  { a: { text: "ฉันพบความสุขในการช่วยให้คนอื่นพัฒนาและเติบโต", theme: "developer" },
    b: { text: "ฉันมักนึกถึงภาพในอนาคตและวางแผนเพื่อทำให้มันเกิดขึ้น", theme: "futuristic" } },
  { a: { text: "ฉันรู้สึกและเข้าใจอารมณ์ของคนรอบข้างได้อย่างลึกซึ้ง", theme: "empathy" },
    b: { text: "ฉันมักแก้ปัญหาได้อย่างรวดเร็วและสร้างสรรค์", theme: "restorative" } },
  { a: { text: "ฉันพยายามหาทางออกที่ทุกฝ่ายพอใจในทุกสถานการณ์", theme: "harmony" },
    b: { text: "ฉันมักรู้สึกว่างานยังไม่สมบูรณ์จนกว่าจะทำได้ดีที่สุด", theme: "maximizer" } },
  { a: { text: "ฉันมักรวมทุกคนเข้ามาร่วมในกลุ่มหรือกิจกรรม ไม่ทอดทิ้งใคร", theme: "includer" },
    b: { text: "ฉันลงมือทำทันทีที่มีแผน ไม่รอให้พร้อมก่อน", theme: "activator" } },
  { a: { text: "ฉันสังเกตเห็นความแตกต่างเฉพาะตัวของแต่ละคนได้ชัดเจน", theme: "individualization" },
    b: { text: "ฉันมีค่านิยมแข็งแกร่งที่ชี้นำการตัดสินใจของฉันเสมอ", theme: "belief" } },
  { a: { text: "ฉันมีพลังงานบวกและสร้างบรรยากาศที่กระตือรือร้นในทีม", theme: "positivity" },
    b: { text: "ฉันชอบวิเคราะห์ข้อมูลและหาหลักฐานก่อนสรุปอะไร", theme: "analytical" } },
  { a: { text: "ฉันมีความสัมพันธ์ที่ลึกและแน่นแฟ้นกับคนไม่กี่คน", theme: "relator" },
    b: { text: "ฉันมั่นใจในตัวเองและเชื่อมั่นในการตัดสินใจของตัวเอง", theme: "selfAssurance" } },
  { a: { text: "ฉันชอบวิเคราะห์ข้อมูลเพื่อหาคำตอบที่ถูกต้อง", theme: "analytical" },
    b: { text: "ฉันชอบจัดระบบคนและทรัพยากรเพื่อทำงานให้สำเร็จ", theme: "arranger" } },
  { a: { text: "ฉันมักเรียนรู้จากประวัติและบริบทเพื่อเข้าใจปัจจุบัน", theme: "context" },
    b: { text: "ฉันรับผิดชอบงานที่รับปากไว้เสมอ ไม่มีข้อแก้ตัว", theme: "responsibility" } },
  { a: { text: "ฉันได้รับแรงบันดาลใจจากการจินตนาการถึงอนาคตที่ดีกว่า", theme: "futuristic" },
    b: { text: "ฉันมักนำทีมและตัดสินใจได้อย่างกล้าหาญ", theme: "command" } },
  { a: { text: "ฉันชอบคิดไอเดียใหม่ๆ และมองเห็นความเป็นไปได้ที่คนอื่นมองข้าม", theme: "ideation" },
    b: { text: "ฉันชอบสร้างกฎเกณฑ์ที่ชัดเจนเพื่อให้ทุกคนได้รับการปฏิบัติเท่าเทียม", theme: "consistency" } },
  { a: { text: "ฉันชอบสะสมข้อมูล ความรู้ และทรัพยากรที่อาจมีประโยชน์", theme: "input" },
    b: { text: "ฉันชอบสื่อสารและเล่าเรื่องราวให้คนอื่นฟังและเข้าใจ", theme: "communication" } },
  { a: { text: "ฉันใช้เวลาคิดคนเดียวและชอบขบคิดประเด็นยากๆ อย่างลึกซึ้ง", theme: "intellection" },
    b: { text: "ฉันชอบแข่งขันและวัดผลตัวเองกับมาตรฐานสูงสุด", theme: "competition" } },
  { a: { text: "ฉันชอบเรียนรู้สิ่งใหม่ๆ อยู่เสมอ ทุกวิชาน่าสนใจสำหรับฉัน", theme: "learner" },
    b: { text: "ฉันมักทำให้สิ่งที่ดีอยู่แล้วดียิ่งขึ้น ไม่หยุดพัฒนา", theme: "maximizer" } },
  { a: { text: "ฉันมองเห็นหลายเส้นทางในการแก้ปัญหาและเลือกทางที่ดีที่สุด", theme: "strategic" },
    b: { text: "ฉันชอบพลังบวก ฉลองความสำเร็จเล็กน้อยและสร้างบรรยากาศดี", theme: "positivity" } },
  { a: { text: "ฉันไม่กลัวลงมือทำสิ่งใหม่ เพราะ action ดีกว่าการรอ", theme: "activator" },
    b: { text: "ฉันมีเป้าหมายชัดเจนและไม่ยอมให้สิ่งรบกวนมาดึงสมาธิ", theme: "focus" } },
  { a: { text: "ฉันพูดตรงๆ และมักเป็นคนที่คนอื่นหันมาขอคำแนะนำ", theme: "command" },
    b: { text: "ฉันชอบสังเกตว่าแต่ละคนมีสไตล์และแรงจูงใจที่แตกต่างกัน", theme: "individualization" } },
  { a: { text: "ฉันสื่อสารความคิดได้ชัดเจน และชอบพูดในที่สาธารณะ", theme: "communication" },
    b: { text: "ฉันชอบวิเคราะห์ข้อมูลเบื้องหลังและหาสาเหตุที่แท้จริง", theme: "analytical" } },
  { a: { text: "ฉันแข่งขันกับตัวเองเสมอ และอยากทำผลงานดีกว่าเมื่อวาน", theme: "competition" },
    b: { text: "ฉันมีความรอบคอบ ไม่ยอมรับความเสี่ยงโดยไม่ประเมินก่อน", theme: "deliberative" } },
  { a: { text: "ฉันพัฒนาจุดแข็งของตัวเองและคนอื่นๆ ให้เด่นชัดยิ่งขึ้น", theme: "maximizer" },
    b: { text: "ฉันปรับตัวได้ดีกับแผนที่เปลี่ยนไป และทำงานได้ในความไม่แน่นอน", theme: "adaptability" } },
  { a: { text: "ฉันมั่นใจในสัญชาตญาณของตัวเองเสมอ", theme: "selfAssurance" },
    b: { text: "ฉันชอบจัดระบบและวางแผนล่วงหน้าอย่างละเอียด", theme: "discipline" } },
  { a: { text: "ฉันอยากทำงานที่มีความหมายและได้รับการยอมรับจากคนอื่น", theme: "significance" },
    b: { text: "ฉันมักเรียนรู้จากประสบการณ์ในอดีตก่อนตัดสินใจ", theme: "context" } },
  { a: { text: "ฉันชอบพบปะคนใหม่ๆ และสร้างความสัมพันธ์ได้อย่างรวดเร็ว", theme: "woo" },
    b: { text: "ฉันใช้เวลาไตร่ตรองและชอบความคิดลึกซึ้ง", theme: "intellection" } },
  { a: { text: "ฉันปรับตัวกับทุกสถานการณ์ได้ และชอบวันที่มีความหลากหลาย", theme: "adaptability" },
    b: { text: "ฉันชอบสร้างความสัมพันธ์กับทุกคน ไม่ทิ้งใครไว้ข้างหลัง", theme: "includer" } },
  { a: { text: "ฉันเชื่อว่าทุกสิ่งเกี่ยวข้องกัน และฉันมองเห็นความเชื่อมโยงนั้น", theme: "connectedness" },
    b: { text: "ฉันมักทำงานจนกว่าจะรู้สึกว่าวันนั้นทำสิ่งสำเร็จเพียงพอแล้ว", theme: "achiever" } },
  { a: { text: "ฉันมักช่วยให้คนอื่นเห็นศักยภาพและพัฒนาตัวเองได้ดีขึ้น", theme: "developer" },
    b: { text: "ฉันชอบวางแผนหลายทางเลือกและหาเส้นทางที่ดีที่สุด", theme: "strategic" } },
  { a: { text: "ฉันรับรู้อารมณ์และความรู้สึกของคนอื่นได้อย่างละเอียดอ่อน", theme: "empathy" },
    b: { text: "ฉันชอบสะสมและแบ่งปันความรู้ที่มีประโยชน์", theme: "input" } },
  { a: { text: "ฉันพยายามหาจุดร่วมระหว่างคนที่เห็นต่างกัน", theme: "harmony" },
    b: { text: "ฉันชอบฝันถึงอนาคตที่เป็นไปได้และวางแผนให้ถึงที่นั่น", theme: "futuristic" } },
  { a: { text: "ฉันทำให้ทุกคนรู้สึกว่าเป็นส่วนหนึ่งของกลุ่มเสมอ", theme: "includer" },
    b: { text: "ฉันมีแรงขับที่ต้องทำผลงานให้ได้ทุกวัน", theme: "achiever" } },
  { a: { text: "ฉันสังเกตเห็นสิ่งที่ทำให้แต่ละคนแตกต่างจากคนอื่นได้ชัดเจน", theme: "individualization" },
    b: { text: "ฉันลงมือทำทันทีเมื่อมีโอกาส ไม่รอให้สมบูรณ์แบบก่อน", theme: "activator" } },
  { a: { text: "ฉันมีพลังบวกและทำให้คนรอบข้างรู้สึกกระตือรือร้น", theme: "positivity" },
    b: { text: "ฉันมีค่านิยมที่ชัดเจนและทำงานที่สอดคล้องกับสิ่งที่เชื่อ", theme: "belief" } },
  { a: { text: "ฉันสร้างความสัมพันธ์ที่ลึกซึ้งและไว้วางใจได้กับคนสำคัญ", theme: "relator" },
    b: { text: "ฉันจัดการทรัพยากรและคนได้อย่างมีประสิทธิภาพสูงสุด", theme: "arranger" } },
  { a: { text: "ฉันชอบวิเคราะห์ตัวเลขและข้อมูลก่อนสรุปผล", theme: "analytical" },
    b: { text: "ฉันรับผิดชอบงานที่ตัวเองเลือกทำ ไม่มีข้อแก้ตัว", theme: "responsibility" } },
  { a: { text: "ฉันมักใช้ประสบการณ์จากอดีตเพื่อคาดการณ์อนาคต", theme: "context" },
    b: { text: "ฉันชอบคิดแนวทางใหม่ๆ ที่ยังไม่เคยมีใครลอง", theme: "ideation" } },
  { a: { text: "ฉันจินตนาการภาพอนาคตที่ชัดเจนและตื่นเต้นอยู่เสมอ", theme: "futuristic" },
    b: { text: "ฉันชอบให้ทุกคนได้รับการปฏิบัติที่เป็นธรรมและมีมาตรฐานเดียวกัน", theme: "consistency" } },
  { a: { text: "ฉันชอบสร้างสรรค์ไอเดียใหม่ๆ และเชื่อมสิ่งที่แตกต่างเข้าด้วยกัน", theme: "ideation" },
    b: { text: "ฉันใช้ความรอบคอบในการประเมินความเสี่ยงก่อนตัดสินใจ", theme: "deliberative" } },
  { a: { text: "ฉันชอบสะสมและเรียนรู้สิ่งใหม่ๆ อยู่ตลอดเวลา", theme: "input" },
    b: { text: "ฉันมักเป็นคนที่นำทีมและตัดสินใจในสถานการณ์ยากลำบาก", theme: "command" } },
  { a: { text: "ฉันชอบขบคิดเรื่องยากๆ และใช้เวลากับความคิดลึกซึ้ง", theme: "intellection" },
    b: { text: "ฉันมุ่งมั่นทำงานอย่างหนักเพื่อบรรลุเป้าหมายที่วางไว้", theme: "focus" } },
  { a: { text: "ฉันชอบเรียนรู้ในทุกด้าน กระบวนการเรียนรู้คือรางวัลในตัวมันเอง", theme: "learner" },
    b: { text: "ฉันมักทำสิ่งที่ดีอยู่แล้วให้ดียิ่งขึ้น ไม่สนใจจุดอ่อน", theme: "maximizer" } },
  { a: { text: "ฉันมองเห็นหลายเส้นทางและเลือกทางที่ดีที่สุดเสมอ", theme: "strategic" },
    b: { text: "ฉันชอบสื่อสารและแบ่งปันความคิดกับคนอื่นๆ", theme: "communication" } },
  { a: { text: "ฉันลงมือทำทันทีและเชื่อว่าการเริ่มต้นสำคัญกว่าการรอ", theme: "activator" },
    b: { text: "ฉันชอบวัดผลงานของตัวเองกับคนอื่นเพื่อจูงใจตัวเอง", theme: "competition" } },
  { a: { text: "ฉันพูดตรงๆ และสร้างแรงจูงใจให้คนอื่นได้", theme: "command" },
    b: { text: "ฉันชอบสร้างความสัมพันธ์กับคนใหม่อย่างรวดเร็ว", theme: "woo" } },
  { a: { text: "ฉันสื่อสารได้ชัดเจนและทำให้เรื่องซับซ้อนเข้าใจง่าย", theme: "communication" },
    b: { text: "ฉันมักนึกถึงภาพอนาคตและสร้างแรงบันดาลใจให้คนอื่น", theme: "futuristic" } },
  { a: { text: "ฉันแข่งขันและชอบวัดผลกับมาตรฐานสูงๆ เสมอ", theme: "competition" },
    b: { text: "ฉันมักรู้สึกว่าควรรวมทุกคนเข้ามาในกลุ่ม", theme: "includer" } },
  { a: { text: "ฉันพัฒนาจุดแข็งของทุกคนให้โดดเด่นยิ่งขึ้น", theme: "maximizer" },
    b: { text: "ฉันชอบสะสมข้อมูลและความรู้จากทุกแหล่ง", theme: "input" } },
  { a: { text: "ฉันมั่นใจในตัวเองแม้จะเผชิญกับความไม่แน่นอน", theme: "selfAssurance" },
    b: { text: "ฉันมองเห็นความเชื่อมโยงของเหตุการณ์ต่างๆ ในชีวิต", theme: "connectedness" } },
  { a: { text: "ฉันอยากสร้างผลกระทบที่ยิ่งใหญ่และได้รับการจดจำ", theme: "significance" },
    b: { text: "ฉันมักใช้เวลาคิดเพื่อเข้าใจสิ่งต่างๆ อย่างลึกซึ้ง", theme: "intellection" } },
  { a: { text: "ฉันสร้างบรรยากาศที่สนุกและกระตือรือร้นในทีมได้ดี", theme: "positivity" },
    b: { text: "ฉันมักแก้ปัญหาที่ซับซ้อนได้อย่างสร้างสรรค์", theme: "restorative" } },
];

// ─── Domain config ─────────────────────────────────────────────────────────────
const DOMAIN_CONFIG: Record<Domain, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  Executing:    { color: "text-violet-700", bg: "bg-violet-50 border-violet-200", icon: <Cog className="w-4 h-4" />, label: "Executing — ลงมือทำ" },
  Influencing:  { color: "text-red-600",    bg: "bg-red-50 border-red-200",       icon: <Zap className="w-4 h-4" />, label: "Influencing — โน้มน้าว" },
  Relationship: { color: "text-emerald-700",bg: "bg-emerald-50 border-emerald-200", icon: <Users className="w-4 h-4" />, label: "Relationship — สัมพันธ์" },
  Strategic:    { color: "text-blue-700",   bg: "bg-blue-50 border-blue-200",     icon: <Brain className="w-4 h-4" />, label: "Strategic — วางแผน" },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
function calcScores(answers: Record<number, "a" | "b">): Record<string, number> {
  const scores: Record<string, number> = {};
  THEMES.forEach(t => { scores[t.id] = 0; });
  Object.entries(answers).forEach(([idx, choice]) => {
    const pair = QUIZ_PAIRS[parseInt(idx)];
    const theme = pair[choice].theme;
    scores[theme] = (scores[theme] || 0) + 1;
  });
  return scores;
}

function getRankedThemes(scores: Record<string, number>): Theme[] {
  return [...THEMES].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));
}

const LS_KEY = (name: string) => `strengths_result_${name.toLowerCase().replace(/\s/g, "_")}`;

async function loadFromSupabase(userName: string): Promise<Record<number, "a" | "b"> | null> {
  if (!SUPABASE_ENABLED || !supabase) return null;
  const { data } = await supabase
    .from("strengths_results")
    .select("answers")
    .eq("user_name", userName)
    .single();
  return data?.answers ?? null;
}

async function saveToSupabase(userName: string, answers: Record<number, "a" | "b">, scores: Record<string, number>, top5: string[]) {
  if (!SUPABASE_ENABLED || !supabase) return;
  await supabase
    .from("strengths_results")
    .upsert({ user_name: userName, answers, scores, top5, updated_at: new Date().toISOString() }, { onConflict: "user_name" });
}

// ─── Component ─────────────────────────────────────────────────────────────────
type Phase = "intro" | "quiz" | "result";

export default function StrengthsPage() {
  const user = useCurrentUser();
  const [phase, setPhase] = useState<Phase>("intro");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, "a" | "b">>({});
  const [showAll, setShowAll] = useState(false);
  const [selected, setSelected] = useState<"a" | "b" | null>(null);
  const [animating, setAnimating] = useState(false);
  const [savedResult, setSavedResult] = useState<Record<number, "a" | "b"> | null>(null);
  const [loadingResult, setLoadingResult] = useState(true);
  const [retakeRequest, setRetakeRequest] = useState<{ id: string; status: "pending" | "approved" | "rejected" } | null>(null);
  const [sendingRequest, setSendingRequest] = useState(false);

  const totalQ = QUIZ_PAIRS.length;
  const progress = Math.round((current / totalQ) * 100);

  // Load saved result + retake request
  useEffect(() => {
    if (!user) { setLoadingResult(false); return; }
    setLoadingResult(true);
    Promise.all([
      loadFromSupabase(user.full_name),
      SUPABASE_ENABLED && supabase
        ? supabase.from("strengths_retake_requests").select("id,status").eq("user_name", user.full_name).order("requested_at", { ascending: false }).limit(1).single()
        : Promise.resolve({ data: null }),
    ]).then(([result, reqRes]) => {
      if (result) setSavedResult(result);
      else {
        try {
          const raw = localStorage.getItem(LS_KEY(user.full_name));
          if (raw) setSavedResult(JSON.parse(raw));
        } catch { /* ignore */ }
      }
      const req = (reqRes as { data: { id: string; status: "pending" | "approved" | "rejected" } | null })?.data;
      if (req && (req.status === "pending" || req.status === "approved")) setRetakeRequest(req);
      setLoadingResult(false);
    });
  }, [user]);

  async function handleSendRetakeRequest() {
    if (!user || !SUPABASE_ENABLED || !supabase) return;
    setSendingRequest(true);
    const { data } = await supabase.from("strengths_retake_requests").insert({ user_name: user.full_name, status: "pending" }).select("id,status").single();
    if (data) setRetakeRequest(data);
    setSendingRequest(false);
  }

  const scores = useMemo(() => calcScores(answers), [answers]);
  const ranked = useMemo(() => getRankedThemes(scores), [scores]);
  const top5 = ranked.slice(0, 5);

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleStart() {
    if (savedResult) {
      setAnswers(savedResult);
      setPhase("result");
    } else {
      setPhase("quiz");
      setCurrent(0);
      setAnswers({});
    }
  }

  function handleRetake() {
    setAnswers({});
    setCurrent(0);
    setSelected(null);
    setShowAll(false);
    setSavedResult(null);
    setRetakeRequest(null);
    setPhase("quiz");
    if (user) {
      localStorage.removeItem(LS_KEY(user.full_name));
      if (SUPABASE_ENABLED && supabase) {
        supabase.from("strengths_results").delete().eq("user_name", user.full_name);
        supabase.from("strengths_retake_requests").delete().eq("user_name", user.full_name);
      }
    }
  }

  const handleSelect = useCallback((choice: "a" | "b") => {
    if (animating) return;
    setSelected(choice);
    setAnimating(true);
    setTimeout(() => {
      const next = { ...answers, [current]: choice };
      setAnswers(next);
      if (current + 1 >= totalQ) {
        // คำนวณ scores + top5
        const finalScores = calcScores(next);
        const finalTop5 = getRankedThemes(finalScores).slice(0, 5).map(t => t.id);
        // Save: Supabase + localStorage backup
        if (user) {
          saveToSupabase(user.full_name, next, finalScores, finalTop5);
          try { localStorage.setItem(LS_KEY(user.full_name), JSON.stringify(next)); } catch { /* ignore */ }
        }
        setPhase("result");
      } else {
        setCurrent(c => c + 1);
      }
      setSelected(null);
      setAnimating(false);
    }, 350);
  }, [animating, answers, current, totalQ, user]);

  function handleBack() {
    if (current === 0) { setPhase("intro"); return; }
    setCurrent(c => c - 1);
    setAnswers(prev => { const n = { ...prev }; delete n[current - 1]; return n; });
    setSelected(null);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (phase === "intro") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-lg w-full text-center space-y-6">
          {loadingResult && (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-400 py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> กำลังโหลดข้อมูลจาก Supabase...
            </div>
          )}
          <div className="text-6xl">🏆</div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Strengths Finder</h1>
            <p className="text-gray-500 mt-2">อิงแนวคิด Gallup CliftonStrengths 34 Themes</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-left space-y-4">
            <p className="font-semibold text-gray-800">สวัสดี {user?.full_name ?? "คุณ"} 👋</p>
            <p className="text-sm text-gray-600 leading-relaxed">
              Quiz นี้จะช่วยค้นหา <strong>Top 5 จุดแข็ง</strong> จาก 34 Themes ผ่านประโยคคู่ A/B
              ทั้งหมด <strong>{totalQ} ข้อ</strong> ใช้เวลาประมาณ 8-12 นาที
            </p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {(Object.keys(DOMAIN_CONFIG) as Domain[]).map(d => (
                <div key={d} className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border", DOMAIN_CONFIG[d].bg)}>
                  <span className={DOMAIN_CONFIG[d].color}>{DOMAIN_CONFIG[d].icon}</span>
                  <span className={cn("font-medium", DOMAIN_CONFIG[d].color)}>{DOMAIN_CONFIG[d].label}</span>
                </div>
              ))}
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 space-y-1">
              <p className="font-semibold">💰 ปกติแบบทดสอบนี้มีค่าใช้จ่าย</p>
              <p>Gallup CliftonStrengths (official) ราคา <strong>$19.99–$49.99 USD (~700–1,800 บาท)</strong> ต่อคน และผลจะ lock ไว้กับบัญชีที่ซื้อ ไม่สามารถทำซ้ำได้</p>
              <p className="text-amber-600">✨ เวอร์ชันนี้ Standard Tour จัดให้ฟรี — <strong>1 ครั้งต่อคน</strong> (หากต้องการทำซ้ำ ส่งคำขอไปยัง Admin)</p>
            </div>
            <p className="text-xs text-gray-400">
              💡 เลือกประโยคที่ <em>รู้สึกว่าเป็นตัวเองมากกว่า</em> ไม่มีคำตอบผิดถูก
            </p>
          </div>
          {savedResult && (
            <p className="text-sm text-emerald-600 font-medium">✅ มีผลเก่าบันทึกไว้ กดดูผลได้เลย</p>
          )}
          <div className="flex flex-col gap-3">
            <Button onClick={handleStart} className="bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-xl text-base font-semibold">
              {savedResult ? "ดูผลลัพธ์เดิม" : "เริ่ม Quiz"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "quiz") {
    const pair = QUIZ_PAIRS[current];
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-blue-50 flex flex-col items-center p-4">
        {/* Header */}
        <div className="w-full max-w-2xl mt-6">
          <div className="flex items-center justify-between mb-2">
            <button onClick={handleBack} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
              ← {current === 0 ? "กลับ" : "ย้อนกลับ"}
            </button>
            <span className="text-sm text-gray-500 font-medium">{current + 1} / {totalQ}</span>
          </div>
          {/* Progress bar */}
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <div className="w-full max-w-2xl mt-10 flex-1 flex flex-col items-center">
          <p className="text-sm font-semibold text-violet-500 uppercase tracking-widest mb-6">
            เลือกประโยคที่ตรงกับตัวเองมากกว่า
          </p>
          <div className="w-full space-y-4">
            {(["a", "b"] as const).map((choice) => (
              <button
                key={choice}
                type="button"
                onClick={() => handleSelect(choice)}
                disabled={animating}
                className={cn(
                  "w-full text-left p-6 rounded-2xl border-2 transition-all duration-200 shadow-sm",
                  selected === choice
                    ? "border-violet-500 bg-violet-50 shadow-violet-100 shadow-md scale-[1.01]"
                    : "border-gray-100 bg-white hover:border-violet-300 hover:shadow-md hover:scale-[1.005]",
                  animating && selected !== choice && "opacity-40"
                )}
              >
                <div className="flex items-start gap-4">
                  <span className={cn(
                    "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 mt-0.5",
                    selected === choice
                      ? "border-violet-500 bg-violet-500 text-white"
                      : "border-gray-200 text-gray-400"
                  )}>
                    {choice.toUpperCase()}
                  </span>
                  <p className="text-gray-800 leading-relaxed text-base">{pair[choice].text}</p>
                  {selected === choice && <CheckCircle2 className="w-5 h-5 text-violet-500 ml-auto flex-shrink-0 mt-0.5" />}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── RESULT PHASE ──────────────────────────────────────────────────────────
  const domainScores: Record<Domain, number> = { Executing: 0, Influencing: 0, Relationship: 0, Strategic: 0 };
  ranked.forEach((t, i) => {
    const pts = totalQ - i;
    domainScores[t.domain] += pts;
  });
  const domainTotal = Object.values(domainScores).reduce((a, b) => a + b, 0);

  const rankMedal = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];

  const domainGradient: Record<Domain, string> = {
    Executing:    "from-violet-500 to-purple-600",
    Influencing:  "from-red-500 to-rose-600",
    Relationship: "from-emerald-500 to-teal-600",
    Strategic:    "from-blue-500 to-indigo-600",
  };
  const domainBgSoft: Record<Domain, string> = {
    Executing:    "bg-violet-50 border-violet-100",
    Influencing:  "bg-red-50 border-red-100",
    Relationship: "bg-emerald-50 border-emerald-100",
    Strategic:    "bg-blue-50 border-blue-100",
  };
  const domainTextColor: Record<Domain, string> = {
    Executing:    "text-violet-700",
    Influencing:  "text-red-600",
    Relationship: "text-emerald-700",
    Strategic:    "text-blue-700",
  };

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-break { page-break-before: always; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50 pb-20">

        {/* ── PAGE HEADER ─────────────────────────────────────────────────────── */}
        <div className="max-w-3xl mx-auto px-4 pt-8 pb-2">
          <div className="bg-white rounded-2xl border border-violet-100 shadow-sm px-6 py-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md">
              <span className="text-2xl">🏆</span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900 leading-tight">จุดแข็งของคุณ</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {user?.full_name ?? "คุณ"} · CliftonStrengths 34 Themes
              </p>
            </div>
            <div className="flex-shrink-0 text-right">
              <div className="inline-flex items-center gap-1.5 bg-violet-50 border border-violet-100 rounded-full px-3 py-1 text-xs font-medium text-violet-600">
                ✨ {totalQ} ข้อ
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 mt-4 space-y-6">

          {/* ── TOP 5 ─────────────────────────────────────────────────────────── */}
          <div>
            <div className="flex items-center gap-2 mb-4 mt-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <h2 className="text-base font-bold text-gray-800">Top 5 จุดแข็งของคุณ</h2>
              <span className="ml-auto text-xs text-gray-400">เรียงจากคะแนนสูงสุด</span>
            </div>

            <div className="space-y-4">
              {top5.map((theme, i) => (
                <div
                  key={theme.id}
                  className={cn(
                    "bg-white rounded-2xl shadow-sm overflow-hidden border",
                    i === 0 ? "border-amber-200 shadow-amber-50 shadow-md" : "border-gray-100"
                  )}
                >
                  {/* Card top accent bar */}
                  <div className={cn("h-1.5 w-full bg-gradient-to-r", domainGradient[theme.domain])} />

                  <div className="p-5">
                    {/* Row 1: rank + name + domain badge */}
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 text-2xl leading-none mt-0.5">{rankMedal[i]}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-lg font-bold text-gray-900">{theme.name}</span>
                          <span className="text-sm text-gray-500 font-medium">{theme.nameTH}</span>
                          <span className={cn(
                            "text-xs px-2.5 py-0.5 rounded-full font-semibold border",
                            domainBgSoft[theme.domain], domainTextColor[theme.domain]
                          )}>
                            {theme.domain}
                          </span>
                        </div>
                        {/* Description */}
                        <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                          {theme.descriptionTH}
                        </p>
                      </div>
                    </div>

                    {/* Insights */}
                    {LONG_DESC[theme.id] && (
                      <div className="mt-4 space-y-2">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">สิ่งที่ควรรู้เกี่ยวกับตัวคุณ</p>
                        {LONG_DESC[theme.id].insights.map((ins, j) => (
                          <div key={j} className={cn("flex items-start gap-2.5 rounded-xl px-4 py-3 border", domainBgSoft[theme.domain])}>
                            <span className={cn("flex-shrink-0 font-black text-base leading-none mt-0.5", domainTextColor[theme.domain])}>›</span>
                            <p className={cn("text-sm leading-relaxed", domainTextColor[theme.domain])}>{ins}</p>
                          </div>
                        ))}
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">แนวทางพัฒนา</p>
                          <div className="space-y-1.5">
                            {LONG_DESC[theme.id].actionTips.map((tip, j) => (
                              <div key={j} className="flex items-start gap-2 text-sm text-gray-600">
                                <span className="flex-shrink-0 text-gray-300 font-bold mt-0.5">✦</span>
                                <span className="leading-relaxed">{tip}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── DOMAIN BREAKDOWN ─────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <Brain className="w-5 h-5 text-gray-400" />
              <h2 className="text-base font-bold text-gray-800">สัดส่วนแต่ละ Domain</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {(Object.keys(domainScores) as Domain[])
                .sort((a, b) => domainScores[b] - domainScores[a])
                .map(d => {
                  const pct = Math.round((domainScores[d] / domainTotal) * 100);
                  const dc = DOMAIN_CONFIG[d];
                  return (
                    <div key={d} className={cn("rounded-xl border p-4", domainBgSoft[d])}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={domainTextColor[d]}>{dc.icon}</span>
                        <span className={cn("text-xs font-bold uppercase tracking-wide", domainTextColor[d])}>
                          {d}
                        </span>
                      </div>
                      <div className="text-3xl font-black mb-1" style={{
                        color: d === "Executing" ? "#7C3AED" : d === "Influencing" ? "#DC2626" : d === "Relationship" ? "#059669" : "#1D4ED8"
                      }}>
                        {pct}%
                      </div>
                      <div className="w-full h-2 bg-white/60 rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-700", domainGradient[d])}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className={cn("text-xs mt-1.5 font-medium", domainTextColor[d])}>
                        {d === "Executing" ? "ลงมือทำ" : d === "Influencing" ? "โน้มน้าวใจ" : d === "Relationship" ? "สร้างความสัมพันธ์" : "วางแผนเชิงกลยุทธ์"}
                      </p>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* ── ALL 34 THEMES ─────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAll(v => !v)}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                {showAll ? <ChevronUp className="w-4 h-4 text-violet-500" /> : <ChevronDown className="w-4 h-4 text-violet-500" />}
                <span className="text-sm font-bold text-gray-700">
                  {showAll ? "ซ่อน" : "ดูทั้งหมด"} 34 Themes (เรียงจากจุดแข็งสูงสุด)
                </span>
              </div>
              <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2.5 py-0.5">34</span>
            </button>

            {showAll && (
              <div className="border-t border-gray-100">
                {ranked.map((theme, i) => {
                  const score = scores[theme.id] || 0;
                  const maxScore = scores[ranked[0].id] || 1;
                  const pct = Math.round((score / maxScore) * 100);
                  return (
                    <div
                      key={theme.id}
                      className={cn(
                        "px-5 py-3 flex items-center gap-3 border-b last:border-0 border-gray-50",
                        i < 5 ? "bg-violet-50/40" : ""
                      )}
                    >
                      {/* Rank */}
                      <span className={cn(
                        "flex-shrink-0 w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center",
                        i === 0 ? "bg-amber-100 text-amber-600" :
                        i === 1 ? "bg-gray-200 text-gray-600" :
                        i === 2 ? "bg-orange-100 text-orange-600" :
                        i < 5 ? "bg-violet-100 text-violet-600" :
                        "bg-gray-50 text-gray-400"
                      )}>{i + 1}</span>

                      {/* Name + bar */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={cn("text-sm font-semibold", i < 5 ? "text-gray-900" : "text-gray-600")}>
                            {theme.name}
                          </span>
                          <span className="text-xs text-gray-400">{theme.nameTH}</span>
                          <span className={cn(
                            "ml-auto text-xs px-1.5 py-0.5 rounded font-medium border flex-shrink-0",
                            domainBgSoft[theme.domain], domainTextColor[theme.domain]
                          )}>{theme.domain}</span>
                        </div>
                        <p className={cn("text-xs leading-snug mb-1.5", i < 5 ? "text-gray-500" : "text-gray-400")}>
                          {theme.descriptionTH}
                        </p>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full bg-gradient-to-r", domainGradient[theme.domain])}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      {/* Score */}
                      <span className={cn(
                        "text-xs font-bold flex-shrink-0",
                        i < 5 ? "text-violet-600" : "text-gray-300"
                      )}>{score}pt</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── ACTIONS ───────────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 no-print">
            <div className="flex items-center gap-2 mb-4">
              <Download className="w-5 h-5 text-gray-400" />
              <h2 className="text-base font-bold text-gray-800">ดาวน์โหลดรายงาน PDF</h2>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-4">
              {/* PDF 1: SF Top 5 */}
              <button
                onClick={() => openTop5Report(user?.full_name ?? "คุณ", top5, ranked)}
                className="flex items-start gap-3 p-4 rounded-xl border-2 border-violet-200 bg-violet-50 hover:border-violet-400 hover:bg-violet-100 transition-all text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-violet-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-lg">📊</span>
                </div>
                <div>
                  <div className="font-bold text-violet-700 text-sm">CliftonStrengths 5 อันดับแรก</div>
                  <div className="text-xs text-violet-500 mt-0.5">ภาพรวม + รายละเอียด + แนวทางคู่จุดแข็ง</div>
                  <div className="text-xs text-gray-400 mt-1">~{top5.length * 2 + 2} หน้า</div>
                </div>
              </button>

              {/* PDF 2: Signature Theme */}
              <button
                onClick={() => openSignatureReport(user?.full_name ?? "คุณ", top5)}
                className="flex items-start gap-3 p-4 rounded-xl border-2 border-emerald-200 bg-emerald-50 hover:border-emerald-400 hover:bg-emerald-100 transition-all text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-lg">📋</span>
                </div>
                <div>
                  <div className="font-bold text-emerald-700 text-sm">รายงานลักษณะเฉพาะ</div>
                  <div className="text-xs text-emerald-500 mt-0.5">คำอธิบายเชิงลึก + แนวทางพัฒนาแต่ละจุดแข็ง</div>
                  <div className="text-xs text-gray-400 mt-1">~{top5.length + 2} หน้า</div>
                </div>
              </button>
            </div>
            <p className="text-xs text-gray-400 text-center mb-4">เปิดในหน้าต่างใหม่ → กด Ctrl+P / Cmd+P → บันทึกเป็น PDF</p>
            {/* Retake request flow */}
            <div className="border-t border-gray-100 pt-4">
              {retakeRequest?.status === "approved" ? (
                <Button onClick={handleRetake} className="w-full rounded-xl bg-violet-600 hover:bg-violet-700 text-white">
                  <RotateCcw className="w-4 h-4 mr-2" /> ทำ Quiz ใหม่ (ได้รับอนุมัติแล้ว)
                </Button>
              ) : retakeRequest?.status === "pending" ? (
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <span className="text-amber-500 text-lg">⏳</span>
                  <div>
                    <p className="text-sm font-semibold text-amber-700">คำขอถูกส่งแล้ว — รออนุมัติจาก Admin</p>
                    <p className="text-xs text-amber-500 mt-0.5">Admin จะอนุมัติหรือปฏิเสธคำขอของคุณ</p>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleSendRetakeRequest}
                  disabled={sendingRequest}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors disabled:opacity-50"
                >
                  {sendingRequest ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                  ขอทำ Quiz ใหม่ (ส่งคำขอไปยัง Admin)
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
