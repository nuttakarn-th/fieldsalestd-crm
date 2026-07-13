/**
 * AhagramWidget.tsx — 🎮 Anagram mini-game for Marketing team
 * v298: centered modal + backdrop blur, 3-step tutorial onboarding,
 *       leaderboard ranking view, Skip = –10☕, larger card (440px)
 *
 * Props:
 *   inline?: boolean — true = footer text link trigger, false = floating FAB
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { useCurrentUser } from "@/store/authStore";
import { useAhagramLeaderboard } from "@/store/ahagramLeaderboardStore";

// ── Types ─────────────────────────────────────────────────────────────────────
interface WordEntry { word: string; cat: string; def: string; }
interface Letter    { char: string; used: boolean; }
interface SlotItem  { char: string; fromIdx: number; isHint?: boolean; }
type Phase = "play" | "win" | "err" | "overlay";
type View  = "tutorial" | "game" | "ranks";

// ── Category colours ──────────────────────────────────────────────────────────
const CAT_COLOR: Record<string, string> = {
  "Marketing Jargon":    "#a78bfa",
  "Global Destinations": "#34d399",
  "Travel Essentials":   "#60a5fa",
  "Creator & Production":"#f97316",
  "Social Media":        "#ec4899",
  "Sales & CRM":         "#facc15",
};

// ── Word Pool — 100 words ─────────────────────────────────────────────────────
const POOL: WordEntry[] = [
  // ── Marketing Jargon (20) ─────────────────────────────────────────────────
  { word: "BRIEF",    cat: "Marketing Jargon",    def: "บรีฟ: สรุปขอบเขตงาน (ที่จริงๆ มักแก้ไขบ่อยและไม่สั้นเลยสักนิด)" },
  { word: "BUDGET",   cat: "Marketing Jargon",    def: "บัดเจ็ต: งบประมาณ ตัวเลขศักดิ์สิทธิ์ที่ดลให้แคมเปญเกิดขึ้นหรือดับไป" },
  { word: "TARGET",   cat: "Marketing Jargon",    def: "ทาร์เก็ต: กลุ่มเป้าหมาย คนที่เราหวังให้กดจ่ายเงินซื้อแพ็กเกจทัวร์" },
  { word: "REACH",    cat: "Marketing Jargon",    def: "รีช: จำนวนสายตาที่เห็นโพสต์ ยิ่งเยอะยิ่งดีแต่ต้องดู Engagement ด้วย" },
  { word: "BRAND",    cat: "Marketing Jargon",    def: "แบรนด์: ภาพลักษณ์บริษัท ทำให้ลูกค้าเชื่อมั่นไม่หนีไปคู่แข่ง" },
  { word: "LEAD",     cat: "Marketing Jargon",    def: "ลีด: รายชื่อลูกค้าที่ทิ้งเบอร์ไว้ให้เซลส์โทรปิดยอดได้เลย" },
  { word: "TRAFFIC",  cat: "Marketing Jargon",    def: "ทราฟฟิก: คนเข้าเว็บ ยิ่งเยอะโอกาสขายตั๋วทัวร์ก็ยิ่งพุ่งปรี๊ด" },
  { word: "FUNNEL",   cat: "Marketing Jargon",    def: "ฟันเนล: กรวยการตลาด รู้จัก → สนใจ → ซื้อ → บอกต่อ คลาสสิกมาก" },
  { word: "INSIGHT",  cat: "Marketing Jargon",    def: "อินไซต์: ข้อมูลเชิงลึกลูกค้า กุญแจสำคัญทำโฆษณาให้ตรงใจจริงๆ" },
  { word: "VIRAL",    cat: "Marketing Jargon",    def: "ไวรัล: คอนเทนต์ที่คนแชร์เอง ความฝันสูงสุดของทีม Marketing" },
  { word: "PIXEL",    cat: "Marketing Jargon",    def: "พิกเซล: โค้ดติดตามพฤติกรรมบนเว็บ ช่วยยิง Retargeting ได้แม่น" },
  { word: "CAMPAIGN", cat: "Marketing Jargon",    def: "แคมเปญ: ชุดแผนการตลาดที่จัดทำขึ้นเพื่อเป้าหมายเฉพาะในช่วงเวลาหนึ่ง" },
  { word: "BOUNCE",   cat: "Marketing Jargon",    def: "เบาน์ซ์: อัตราคนออกจากเว็บเร็ว ถ้าสูงแปลว่า Landing Page ยังไม่ปัง" },
  { word: "NICHE",    cat: "Marketing Jargon",    def: "นิช: ตลาดกลุ่มเล็กแต่เจาะจง ยิ่งชัดเจนยิ่งขายง่ายกว่าตลาดกว้าง" },
  { word: "COPY",     cat: "Marketing Jargon",    def: "คอปปี้: ข้อความโฆษณา คำที่เขียนขึ้นเพื่อดึงดูดให้คนอยากซื้อทันที" },
  { word: "SEGMENT",  cat: "Marketing Jargon",    def: "เซกเมนต์: การแบ่งกลุ่มลูกค้า เพื่อส่งข้อความตรงใจแต่ละกลุ่ม" },
  { word: "PERSONA",  cat: "Marketing Jargon",    def: "เพอร์โซนา: ตัวตนสมมติของลูกค้าในอุดมคติ ช่วยกำหนดทิศทางแคมเปญ" },
  { word: "BANNER",   cat: "Marketing Jargon",    def: "แบนเนอร์: ภาพโฆษณาออนไลน์ ถ้าออกแบบดีคนหยุดดู ถ้าไม่ดีคนปิดทันที" },
  { word: "LANDING",  cat: "Marketing Jargon",    def: "แลนดิ้ง: หน้าเว็บรับโฆษณา ออกแบบมาเพื่อให้คนกดซื้อหรือลงทะเบียน" },
  { word: "KEYWORD",  cat: "Marketing Jargon",    def: "คีย์เวิร์ด: คำค้นหาที่ลูกค้าพิมพ์ใน Google ตัวกำหนดว่าเว็บเราจะโผล่หรือไม่" },
  // ── Global Destinations (20) ──────────────────────────────────────────────
  { word: "TOKYO",    cat: "Global Destinations", def: "โตเกียว: มหานครแดนปลาดิบ จุดขายทัวร์อันดับหนึ่งของสายกินและช้อป" },
  { word: "PARIS",    cat: "Global Destinations", def: "ปารีส: เมืองแฟชั่น ลูกค้ามักเรียกร้องทัวร์พรีเมียมถ่ายรูปสวย" },
  { word: "BALI",     cat: "Global Destinations", def: "บาหลี: เกาะสวรรค์อินโดนีเซีย ฮิตมากในหมู่สายคาเฟ่และสระว่ายน้ำ" },
  { word: "DUBAI",    cat: "Global Destinations", def: "ดูไบ: เมืองทะเลทรายหรูหรา ทัวร์ขายดีทั้งปีโดยเฉพาะปลายปี" },
  { word: "SEOUL",    cat: "Global Destinations", def: "โซล: K-Culture + อาหาร + ช้อปปิ้ง เมืองที่ขายง่ายที่สุดในตลาดเกาหลี" },
  { word: "LONDON",   cat: "Global Destinations", def: "ลอนดอน: แลนด์มาร์กเยอะ มักขายควบทัวร์ยุโรปและราคาสูงกว่าเฉลี่ย" },
  { word: "MILAN",    cat: "Global Destinations", def: "มิลาน: เมืองแฟชั่นอิตาลี สายช้อป Outlet จะชอบที่นี่เป็นพิเศษ" },
  { word: "PRAGUE",   cat: "Global Destinations", def: "ปราก: เมืองเทพนิยายเช็กเกีย ขายดีในกลุ่มทัวร์ยุโรปตะวันออก" },
  { word: "TAIPEI",   cat: "Global Destinations", def: "ไทเป: ไต้หวัน บินสั้น อาหารดี ช้อปได้ทั้งวัน ขายง่ายมากในตลาดไทย" },
  { word: "OSAKA",    cat: "Global Destinations", def: "โอซาก้า: ครัวของญี่ปุ่น อาหารเด็ดและช้อปปิ้งจัดเต็ม ขายควบทัวร์ญี่ปุ่น" },
  { word: "KYOTO",    cat: "Global Destinations", def: "เกียวโต: เมืองเก่าญี่ปุ่น วัดวาอาราม ซากุระ ลูกค้า Luxury ชอบมาก" },
  { word: "ROME",     cat: "Global Destinations", def: "โรม: นครนิรันดร์อิตาลี Colosseum + ปาสต้า + เจลาโต้ อยู่ในทุกทัวร์ยุโรป" },
  { word: "BERLIN",   cat: "Global Destinations", def: "เบอร์ลิน: เมืองหลวงเยอรมัน ประวัติศาสตร์เข้มข้น ขายในกลุ่มทัวร์ยุโรปเหนือ" },
  { word: "VIENNA",   cat: "Global Destinations", def: "เวียนนา: เมืองดนตรีออสเตรีย บรรยากาศสง่างาม นิยมในกลุ่มลูกค้าสูงวัย" },
  { word: "HANOI",    cat: "Global Destinations", def: "ฮานอย: เมืองหลวงเวียดนาม บินใกล้ ราคาเป็นมิตร ขายดีสายประหยัด" },
  { word: "PHUKET",   cat: "Global Destinations", def: "ภูเก็ต: ไข่มุกทางใต้ ขายได้ทั้งลูกค้าไทยและต่างชาติ ทะเลสีฟ้าสวย" },
  { word: "ISTANBUL", cat: "Global Destinations", def: "อิสตันบูล: ประตูสู่สองทวีป ทัวร์ตุรกีกำลังมาแรงมากในปีนี้" },
  { word: "MALDIVES", cat: "Global Destinations", def: "มัลดีฟส์: สวรรค์บนน้ำ ขายทัวร์ Honeymoon และ Luxury ได้ราคาดีมาก" },
  { word: "BANGKOK",  cat: "Global Destinations", def: "กรุงเทพฯ: เมืองหลวงเรา จุดเริ่มต้นทัวร์เกือบทุกเส้นทางในโปรแกรม" },
  { word: "FLORENCE", cat: "Global Destinations", def: "ฟลอเรนซ์: เมืองศิลปะอิตาลี อุฟฟิซี่ + สะพานเก่า ขายดีควบทัวร์อิตาลี" },
  // ── Travel Essentials (15) ────────────────────────────────────────────────
  { word: "TICKET",   cat: "Travel Essentials",   def: "ทิกเก็ต: ตั๋วเดินทาง สิ่งสำคัญที่สุดในทริป ทำหายแล้วซวยแน่นอน!" },
  { word: "FLIGHT",   cat: "Travel Essentials",   def: "ไฟลต์: เที่ยวบิน ปีกวิเศษที่พาคณะทัวร์ข้ามขอบโลกได้ใน 10+ ชั่วโมง" },
  { word: "ROUTE",    cat: "Travel Essentials",   def: "รูต: เส้นทางท่องเที่ยว แผนกำหนดว่าจะไปที่ไหนก่อนหลัง" },
  { word: "HOTEL",    cat: "Travel Essentials",   def: "โฮเทล: ที่พัก จุดนอนพักผ่อนเติมพลังก่อนออกเที่ยวต่อวันรุ่งขึ้น" },
  { word: "BOOKING",  cat: "Travel Essentials",   def: "บุ๊คกิ้ง: การจอง ขั้นตอนที่ทำให้ฝันกลายเป็นทริปจริงๆ ในที่สุด" },
  { word: "LUGGAGE",  cat: "Travel Essentials",   def: "ลักเกจ: กระเป๋าเดินทาง ยิ่งเยอะยิ่งปวดหลัง แต่ก็ยังอยากพกไปอยู่ดี" },
  { word: "PASSPORT", cat: "Travel Essentials",   def: "พาสปอร์ต: หนังสือเดินทาง เล่มเล็กๆ ที่มีความหมายมากที่สุดในทริป" },
  { word: "VISA",     cat: "Travel Essentials",   def: "วีซ่า: ตราประทับอนุญาตเข้าประเทศ ต้องเตรียมก่อนซื้อตั๋วเสมอ" },
  { word: "CRUISE",   cat: "Travel Essentials",   def: "ครูซ: ทัวร์ล่องเรือ เทรนด์มาแรงในกลุ่ม Luxury และครอบครัวใหญ่" },
  { word: "LAYOVER",  cat: "Travel Essentials",   def: "เลย์โอเวอร์: รอเปลี่ยนเครื่อง อาจเครียดถ้า Transit น้อยกว่า 1 ชั่วโมง" },
  { word: "CUSTOMS",  cat: "Travel Essentials",   def: "คัสตัมส์: ด่านตรวจสินค้า ห้ามลืม Duty-Free Allowance ของแต่ละประเทศ!" },
  { word: "BOARDING", cat: "Travel Essentials",   def: "บอร์ดดิ้ง: การขึ้นเครื่อง ได้ยิน Boarding Call ต้องรีบวิ่งไปประตูทันที" },
  { word: "TRANSFER", cat: "Travel Essentials",   def: "ทรานส์เฟอร์: การเปลี่ยนพาหนะ ต้องประสานงานให้ดีเพื่อไม่ให้ลูกค้าหลงทาง" },
  { word: "CURRENCY", cat: "Travel Essentials",   def: "เคอร์เรนซี่: เงินสกุลต่างประเทศ ต้องแลกก่อนเดินทางและเช็คอัตราทุกครั้ง" },
  { word: "TERMINAL", cat: "Travel Essentials",   def: "เทอร์มินัล: อาคารผู้โดยสาร ต้องเช็คให้ดีว่าเที่ยวบินอยู่ Terminal ไหน" },
  // ── Creator & Production (15) ─────────────────────────────────────────────
  { word: "CONTENT",  cat: "Creator & Production", def: "คอนเทนต์: รูปและวิดีโอที่ล่อให้ลูกค้าหยุดนิ้วแล้วทัก Inbox หาเรา" },
  { word: "POST",     cat: "Creator & Production", def: "โพสต์: กดปุ่มส่งงานออกสู่โลก เพื่อเริ่มนับ Like, Share, Comment" },
  { word: "RENDER",   cat: "Creator & Production", def: "เรนเดอร์: ช่วงสวดมนต์ขออย่าให้คอมค้างก่อนส่งคลิปทัวร์ให้ลูกค้า" },
  { word: "CAPTION",  cat: "Creator & Production", def: "แคปชั่น: คำบรรยายใต้รูป ถ้าเขียนดีทำให้คนกด See More แล้ว Inbox" },
  { word: "HASHTAG",  cat: "Creator & Production", def: "แฮชแท็ก: #คำ ติดท้ายโพสต์ช่วยให้คนค้นหาเจองานของเราได้ง่ายขึ้น" },
  { word: "SCRIPT",   cat: "Creator & Production", def: "สคริปต์: บทพูดสำหรับวิดีโอ ไม่มีสคริปต์ = งานดูกระท่อนกระแท่น" },
  { word: "REEL",     cat: "Creator & Production", def: "รีล: วิดีโอสั้นแนวตั้ง ขุมทองของ Content Marketing ยุคปัจจุบัน" },
  { word: "STORY",    cat: "Creator & Production", def: "สตอรี่: คอนเทนต์ 24 ชั่วโมงใน IG/FB หายแล้วก็หาย แต่คนดูเยอะมาก" },
  { word: "FILTER",   cat: "Creator & Production", def: "ฟิลเตอร์: เอฟเฟกต์ตกแต่งรูป ทำให้ภาพทัวร์สวยขึ้นจนลูกค้าอยากไป" },
  { word: "COLLAB",   cat: "Creator & Production", def: "โคแลป: ร่วมมือกับ Influencer/KOL เพื่อขยาย Reach ให้เพจ" },
  { word: "FOOTAGE",  cat: "Creator & Production", def: "ฟุตเทจ: ไฟล์วิดีโอดิบก่อน Render และ Export เพื่อส่งให้ลูกค้า" },
  { word: "EDITING",  cat: "Creator & Production", def: "เอดิตติ้ง: ขั้นตอนตัดต่อวิดีโอ ทำให้ฟุตเทจกลายเป็นคลิปสวยงาม" },
  { word: "GRAPHIC",  cat: "Creator & Production", def: "กราฟิก: ภาพออกแบบดิจิทัล ใช้ตั้งแต่โพสต์ถึงแบนเนอร์โฆษณา" },
  { word: "STUDIO",   cat: "Creator & Production", def: "สตูดิโอ: พื้นที่ผลิตงาน ที่ที่ความสร้างสรรค์เกิดขึ้นทุกวัน" },
  { word: "TEASER",   cat: "Creator & Production", def: "ทีเซอร์: คลิปโปรยหัวก่อน Launch แคมเปญ ทำให้ลูกค้าตื่นเต้นอยากรู้ต่อ" },
  // ── Social Media (15) ────────────────────────────────────────────────────
  { word: "FEED",     cat: "Social Media",         def: "ฟีด: หน้าหลักที่แสดงโพสต์ ถ้าคอนเทนต์ไม่ดึงดูดคนจะเลื่อนผ่านทันที" },
  { word: "LIKE",     cat: "Social Media",         def: "ไลค์: หัวใจหรือนิ้วโป้ง สัญลักษณ์ความพึงพอใจที่ทุกคนอยากได้เยอะๆ" },
  { word: "SHARE",    cat: "Social Media",         def: "แชร์: กดส่งต่อโพสต์ ยิ่งแชร์เยอะยิ่งแพร่กระจายโดยไม่มีค่าใช้จ่าย" },
  { word: "FOLLOW",   cat: "Social Media",         def: "ฟอลโลว์: ติดตามเพจหรือบัญชี ฐาน Follower ที่ใหญ่ = อิทธิพลมากขึ้น" },
  { word: "COMMENT",  cat: "Social Media",         def: "คอมเมนต์: ความคิดเห็นใต้โพสต์ ถ้ามีเยอะ Algorithm จะดัน Reach ให้" },
  { word: "MENTION",  cat: "Social Media",         def: "เมนชั่น: การแท็กชื่อบัญชีในโพสต์ เพื่อแจ้งว่าถูกพูดถึงในบทสนทนา" },
  { word: "PROFILE",  cat: "Social Media",         def: "โปรไฟล์: หน้าบัญชีส่วนตัว ต้องดูดีพอให้คนกด Follow ตั้งแต่ดูครั้งแรก" },
  { word: "EXPLORE",  cat: "Social Media",         def: "เอกซ์พลอร์: หน้าค้นพบเนื้อหาใหม่ใน IG ถ้าคอนเทนต์ติด Explore คือปัง" },
  { word: "ENGAGE",   cat: "Social Media",         def: "เอนเกจ: การมีส่วนร่วมกับคอนเทนต์ Like+Comment+Share คือ KPI สำคัญ" },
  { word: "REPOST",   cat: "Social Media",         def: "รีโพสต์: แชร์โพสต์คนอื่นมาไว้ในบัญชีเรา ประหยัดเวลาสร้างคอนเทนต์" },
  { word: "PINNED",   cat: "Social Media",         def: "พินด์: โพสต์ที่ปักหมุดไว้บนสุด เพื่อให้คนเห็นเป็นอย่างแรกเสมอ" },
  { word: "LIVE",     cat: "Social Media",         def: "ไลฟ์: ถ่ายทอดสด Real-time เพื่อสื่อสารกับผู้ติดตามโดยตรงและสด" },
  { word: "INBOX",    cat: "Social Media",         def: "อินบ็อกซ์: กล่องข้อความส่วนตัว ที่ลูกค้าทักมาสอบถามและปิดยอดขาย" },
  { word: "REACTION", cat: "Social Media",         def: "รีแอคชั่น: อารมณ์ตอบสนองต่อโพสต์ มีหลายแบบตั้งแต่ ❤️ ไปจนถึง 😮" },
  { word: "BOOST",    cat: "Social Media",         def: "บูสต์: ยิงโฆษณาเพิ่ม Reach ให้โพสต์ ทางลัดที่ต้องใช้เงินแต่ได้ผลเร็ว" },
  // ── Sales & CRM (15) ────────────────────────────────────────────────────
  { word: "QUOTA",    cat: "Sales & CRM",          def: "โควต้า: เป้าขายรายเดือน ตัวเลขที่ทุกคนอยากทำให้ถึงก่อนสิ้นเดือน" },
  { word: "CLOSE",    cat: "Sales & CRM",          def: "โคลส: ปิดการขาย ขั้นตอนสุดท้ายเปลี่ยนจาก Lead เป็นลูกค้าจริงๆ" },
  { word: "PITCH",    cat: "Sales & CRM",          def: "พิทช์: นำเสนอขาย ต้องโน้มน้าวให้ลูกค้าเห็นคุณค่าภายใน 3 นาทีแรก" },
  { word: "UPSELL",   cat: "Sales & CRM",          def: "อัพเซล: เสนอสินค้าระดับสูงกว่า เช่น ห้องวิวทะเลแทนห้องมาตรฐาน" },
  { word: "BUNDLE",   cat: "Sales & CRM",          def: "บันเดิล: รวมสินค้าหลายอย่างไว้ด้วยกัน เช่น ทัวร์ + ประกันการเดินทาง" },
  { word: "MARGIN",   cat: "Sales & CRM",          def: "มาร์จิ้น: กำไรสุทธิจากการขาย ตัวเลขบอกว่าเราทำเงินได้จริงมากแค่ไหน" },
  { word: "DEPOSIT",  cat: "Sales & CRM",          def: "ดีพอสิต: เงินมัดจำจอง สัญญาว่าลูกค้าจะไม่เปลี่ยนใจ (แต่บางทีก็เปลี่ยน)" },
  { word: "INVOICE",  cat: "Sales & CRM",          def: "อินวอยซ์: ใบแจ้งหนี้ เอกสารสำคัญที่ทีม Accounting รอรับสิ้นเดือน" },
  { word: "PROMO",    cat: "Sales & CRM",          def: "โปรโม: ราคาโปรโมชั่น เครื่องมือเร่งขายเมื่อ Period ใกล้เต็มหรือหมดอายุ" },
  { word: "VOUCHER",  cat: "Sales & CRM",          def: "เวาเชอร์: คูปองส่วนลด เครื่องมือ Loyalty ทำให้ลูกค้ากลับมาซื้อซ้ำ" },
  { word: "REFUND",   cat: "Sales & CRM",          def: "รีฟันด์: การคืนเงิน ขั้นตอนที่ไม่มีใครอยากทำแต่ต้องทำให้ถูกต้องเสมอ" },
  { word: "CONFIRM",  cat: "Sales & CRM",          def: "คอนเฟิร์ม: การยืนยันการจอง สัญญาณว่าทริปนี้จะเกิดขึ้นจริงแน่นอน" },
  { word: "PACKAGE",  cat: "Sales & CRM",          def: "แพ็กเกจ: ชุดบริการท่องเที่ยวรวมทุกอย่างในราคาเดียว ขายง่ายกว่าแบ่งขาย" },
  { word: "PREMIUM",  cat: "Sales & CRM",          def: "พรีเมียม: ระดับสูงสุดของสินค้า ราคาแพงกว่าแต่ลูกค้ายอมจ่ายเพราะ Value" },
  { word: "DISCOUNT", cat: "Sales & CRM",          def: "ดิสเคาต์: ส่วนลด อาวุธลับที่ใช้ปิดการขายเมื่อลูกค้าลังเลอยู่บนเส้นด้าย" },
];

// ── Utilities ─────────────────────────────────────────────────────────────────
function shuffleArr<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}
function getLS(k: string): number {
  try { return parseInt(localStorage.getItem(k) ?? "0", 10) || 0; } catch { return 0; }
}

// ── Demo Animation (tutorial step 1) ─────────────────────────────────────────
// Word BALI — scrambled letters [L, I, A, B], click order: B(3)→A(2)→L(0)→I(1)
const DEMO_LETTERS = ["L", "I", "A", "B"];
const DEMO_ANSWER  = ["B", "A", "L", "I"];
const DEMO_SEQ     = [3, 2, 0, 1]; // scrambled indices to click in order

function DemoAnim() {
  const [phase, setPhase] = useState(0); // 0-7: 0-3=placing, 4=full, 5-6=win, 7=reset
  useEffect(() => {
    const id = setInterval(() => setPhase((p) => (p >= 7 ? 0 : p + 1)), 700);
    return () => clearInterval(id);
  }, []);
  const placed  = Math.min(phase, 4);
  const isWin   = phase >= 5;
  const usedSet = new Set(DEMO_SEQ.slice(0, placed));
  return (
    <div className="flex flex-col items-center gap-3 py-3 select-none">
      {/* Answer slots */}
      <div className="flex gap-2">
        {DEMO_ANSWER.map((ch, i) => (
          <div key={i}
            className="flex items-center justify-center rounded-md border-2 font-mono font-bold text-sm transition-all duration-300"
            style={{
              width: 38, height: 44,
              borderColor: i < placed ? (isWin ? "#00ffcc" : "#ff9900") : "#3f3f46",
              color:       i < placed ? (isWin ? "#00ffcc" : "#ff9900") : "transparent",
              boxShadow:   isWin && i < placed ? "0 0 10px rgba(0,255,204,0.35)" : "none",
            }}
          >
            {i < placed ? ch : ""}
          </div>
        ))}
      </div>
      {/* Bouncing arrow */}
      <div className="animate-bounce text-zinc-600 text-lg leading-none">⇅</div>
      {/* Scrambled letters */}
      <div className="flex gap-2">
        {DEMO_LETTERS.map((ch, i) => {
          const isUsed = usedSet.has(i);
          return (
            <div key={i}
              className="flex items-center justify-center rounded-full border font-mono font-bold text-sm transition-all duration-300"
              style={{
                width: 38, height: 38,
                background:  isUsed ? "#0c0c0f" : "linear-gradient(145deg,#222226,#151518)",
                borderColor: isUsed ? "#18181b" : "#3f3f46",
                color:       isUsed ? "#18181b" : "#e4e4e7",
              }}
            >
              {isUsed ? "" : ch}
            </div>
          );
        })}
      </div>
      <div className="text-[11px] transition-all duration-300 font-mono"
        style={{ color: isWin ? "#00ffcc" : "#52525b" }}>
        {isWin ? "🎉 ถูกต้อง! +10☕" : "กดตัวอักษรเพื่อเรียงเป็นคำ"}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function AhagramWidget({ inline = false }: { inline?: boolean }) {

  // ── Auth + leaderboard ───────────────────────────────────────────────────────
  const user       = useCurrentUser();
  const actorName  = user?.full_name ?? user?.username ?? "";
  const { entries, upsertScore } = useAhagramLeaderboard();

  // ── Open/close ───────────────────────────────────────────────────────────────
  const [open, setOpen] = useState(false);

  // ── View state ───────────────────────────────────────────────────────────────
  const [view,     setView]     = useState<View>("game");
  const [viewFade, setViewFade] = useState(false);
  const [tutStep,  setTutStep]  = useState(0);
  const [tutFade,  setTutFade]  = useState(false);

  // ── Persistent stats ─────────────────────────────────────────────────────────
  const [score, setScore] = useState<number>(() => getLS("ahagram_score"));
  const [trips, setTrips] = useState<number>(() => getLS("ahagram_trips"));
  useEffect(() => { try { localStorage.setItem("ahagram_score", String(score)); } catch {} }, [score]);
  useEffect(() => { try { localStorage.setItem("ahagram_trips",  String(trips));  } catch {} }, [trips]);

  // ── Sync to leaderboard whenever score/trips change ──────────────────────────
  useEffect(() => {
    if (actorName) upsertScore(actorName, actorName, score, trips);
  }, [score, trips, actorName, upsertScore]);

  // ── Pool ─────────────────────────────────────────────────────────────────────
  const poolRef = useRef<WordEntry[]>([]);
  const popWord = useCallback((): WordEntry => {
    if (poolRef.current.length === 0) poolRef.current = shuffleArr([...POOL]);
    return poolRef.current.pop()!;
  }, []);

  // ── Level state ──────────────────────────────────────────────────────────────
  const [wd,        setWd]        = useState<WordEntry | null>(null);
  const [ltrs,      setLtrs]      = useState<Letter[]>([]);
  const [slots,     setSlots]     = useState<(SlotItem | null)[]>([]);
  const [hintUsed,  setHintUsed]  = useState(false);
  const [phase,     setPhase]     = useState<Phase>("play");
  const [skipped,   setSkipped]   = useState(false);
  const [overlayPts,setOverlayPts]= useState(0);
  const [flashMsg,  setFlashMsg]  = useState<string | null>(null);

  // ── Stale-closure refs ───────────────────────────────────────────────────────
  const ltrsRef     = useRef(ltrs);     ltrsRef.current     = ltrs;
  const slotsRef    = useRef(slots);    slotsRef.current    = slots;
  const phaseRef    = useRef(phase);    phaseRef.current    = phase;
  const wdRef       = useRef(wd);       wdRef.current       = wd;
  const hintUsedRef = useRef(hintUsed); hintUsedRef.current = hintUsed;

  // ── Flash ────────────────────────────────────────────────────────────────────
  const flash = useCallback((msg: string) => {
    setFlashMsg(msg);
    setTimeout(() => setFlashMsg(null), 1300);
  }, []);

  // ── Win check ────────────────────────────────────────────────────────────────
  const checkWin = useCallback((newSlots: (SlotItem|null)[], word: string, hint: boolean) => {
    if (!newSlots.every((s) => s !== null)) return;
    const guess = newSlots.map((s) => s!.char).join("");
    if (guess === word) {
      setPhase("win");
      setTimeout(() => {
        const pts = hint ? 5 : 10;
        setScore((p) => p + pts);
        setTrips((p) => p + 1);
        setOverlayPts(pts);
        setSkipped(false);
        setPhase("overlay");
      }, 700);
    } else {
      setPhase("err");
      setTimeout(() => setPhase("play"), 500);
    }
  }, []);

  // ── Start level ───────────────────────────────────────────────────────────────
  const startLevel = useCallback(() => {
    const w = popWord();
    let lArr = shuffleArr(w.word.split("").map((c) => ({ char: c, used: false })));
    let tries = 0;
    while (lArr.map((l) => l.char).join("") === w.word && tries++ < 10) lArr = shuffleArr(lArr);
    setWd(w); setLtrs(lArr); setSlots(Array<null>(w.word.length).fill(null));
    setHintUsed(false); setPhase("play"); setSkipped(false); setFlashMsg(null);
  }, [popWord]);

  // ── On first open: check tutorial flag + boot level ──────────────────────────
  useEffect(() => {
    if (!open) return;
    try {
      if (!localStorage.getItem("ahagram_tutorial_v1")) {
        setView("tutorial"); setTutStep(0);
      } else {
        setView("game");
      }
    } catch { setView("game"); }
  }, [open]);

  useEffect(() => {
    if (open && !wd) {
      poolRef.current = shuffleArr([...POOL]);
      startLevel();
    }
  }, [open, wd, startLevel]);

  // ── Tutorial navigation ───────────────────────────────────────────────────────
  const changeView = useCallback((next: View) => {
    setViewFade(true);
    setTimeout(() => { setView(next); setViewFade(false); }, 150);
  }, []);

  const nextTutStep = () => {
    if (tutStep < 2) {
      setTutFade(true);
      setTimeout(() => { setTutStep((s) => s + 1); setTutFade(false); }, 180);
    } else {
      try { localStorage.setItem("ahagram_tutorial_v1", "1"); } catch {}
      changeView("game");
    }
  };
  const prevTutStep = () => {
    setTutFade(true);
    setTimeout(() => { setTutStep((s) => Math.max(0, s - 1)); setTutFade(false); }, 180);
  };
  const skipTutorial = () => {
    try { localStorage.setItem("ahagram_tutorial_v1", "1"); } catch {}
    changeView("game");
  };

  // ── Letter / Slot actions ─────────────────────────────────────────────────────
  const selectLetter = useCallback((lIdx: number) => {
    if (phase !== "play" || !wd || ltrs[lIdx].used) return;
    const emptySlot = slots.findIndex((s) => s === null);
    if (emptySlot === -1) return;
    const newLtrs: Letter[]             = ltrs.map((l, i) => i === lIdx ? { ...l, used: true } : l);
    const newSlots: (SlotItem | null)[] = slots.map((s, i) => i === emptySlot ? { char: ltrs[lIdx].char, fromIdx: lIdx } : s);
    setLtrs(newLtrs); setSlots(newSlots);
    checkWin(newSlots, wd.word, hintUsed);
  }, [phase, wd, ltrs, slots, hintUsed, checkWin]);

  const returnSlot = useCallback((sIdx: number) => {
    if (phase !== "play") return;
    const slot = slots[sIdx];
    if (!slot || slot.isHint) return;
    const newLtrs  = ltrs.map((l, i) => i === slot.fromIdx ? { ...l, used: false } : l);
    const withNull = slots.map((s, i) => i === sIdx ? null : s);
    const filled   = withNull.filter((s): s is SlotItem => s !== null);
    setLtrs(newLtrs);
    setSlots([...filled, ...Array<null>(slots.length - filled.length).fill(null)]);
  }, [phase, ltrs, slots]);

  // ── Boosters ──────────────────────────────────────────────────────────────────
  const doShuffle = useCallback(() => {
    if (phase !== "play") return;
    setLtrs((prev) => {
      const freeIdx = prev.map((l, i) => (!l.used ? i : -1)).filter((i) => i >= 0);
      if (freeIdx.length <= 1) return prev;
      const shuffledChars = shuffleArr(freeIdx.map((i) => prev[i].char));
      const next = [...prev];
      freeIdx.forEach((origI, ni) => { next[origI] = { ...next[origI], char: shuffledChars[ni] }; });
      return next;
    });
    flash("RE-SHUFFLED!");
  }, [phase, flash]);

  const doHint = useCallback(() => {
    if (phase !== "play" || !wd || hintUsed) return;
    if (score < 2) { flash("NOT ENOUGH ☕"); return; }
    const firstChar = wd.word[0];
    const matchIdx  = ltrs.findIndex((l) => l.char === firstChar && !l.used);
    if (matchIdx === -1) return;
    let newLtrs  = [...ltrs];
    let newSlots = [...slots];
    if (newSlots[0] !== null && !newSlots[0].isHint) {
      const displaced = newSlots[0]!;
      newLtrs[displaced.fromIdx] = { ...newLtrs[displaced.fromIdx], used: false };
      newSlots[0] = null;
      const f = newSlots.filter((s): s is SlotItem => s !== null);
      newSlots = [...f, ...Array<null>(slots.length - f.length).fill(null)];
    }
    newLtrs[matchIdx] = { ...newLtrs[matchIdx], used: true };
    const filled = newSlots.filter((s): s is SlotItem => s !== null);
    newSlots = [
      { char: firstChar, fromIdx: matchIdx, isHint: true },
      ...filled,
      ...Array<null>(slots.length - filled.length - 1).fill(null),
    ];
    setLtrs(newLtrs); setSlots(newSlots); setHintUsed(true);
    setScore((p) => Math.max(0, p - 2));
    flash("HINT! (–2☕)");
    checkWin(newSlots, wd.word, true);
  }, [phase, wd, ltrs, slots, hintUsed, score, flash, checkWin]);

  const doSkip = useCallback(() => {
    if (phase !== "play") return;
    setScore((p) => Math.max(0, p - 10)); // –10☕
    setOverlayPts(-10);
    setSkipped(true);
    setPhase("overlay");
  }, [phase]);

  const doReset = useCallback(() => {
    setScore(0); setTrips(0);
    poolRef.current = shuffleArr([...POOL]);
    startLevel();
    flash("RESET! 🛫");
  }, [startLevel, flash]);

  // ── Keyboard handler ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (phaseRef.current !== "play") return;
      if ((e.target as HTMLElement).closest("input,textarea,[contenteditable]")) return;
      const key = e.key.toUpperCase();
      if (key === "BACKSPACE") {
        e.preventDefault();
        const ps = slotsRef.current; const pl = ltrsRef.current;
        const lastEntry = [...ps].map((s, i) => ({ s, i })).reverse().find(({ s }) => s !== null && !s.isHint);
        if (!lastEntry) return;
        const { s: slot, i: lastIdx } = lastEntry;
        const newLtrs  = pl.map((l, i) => i === slot!.fromIdx ? { ...l, used: false } : l);
        const withNull = ps.map((s, i) => i === lastIdx ? null : s);
        const filled   = withNull.filter((s): s is SlotItem => s !== null);
        setLtrs(newLtrs);
        setSlots([...filled, ...Array<null>(ps.length - filled.length).fill(null)]);
        return;
      }
      if (key.length === 1 && /[A-Z]/.test(key)) {
        const pl = ltrsRef.current; const ps = slotsRef.current; const cwd = wdRef.current;
        if (!cwd) return;
        const matchIdx  = pl.findIndex((l) => l.char === key && !l.used);
        if (matchIdx === -1) return;
        const emptySlot = ps.findIndex((s) => s === null);
        if (emptySlot === -1) return;
        const newLtrs: Letter[]             = pl.map((l, i) => i === matchIdx ? { ...l, used: true } : l);
        const newSlots: (SlotItem | null)[] = ps.map((s, i) => i === emptySlot ? { char: key, fromIdx: matchIdx } : s);
        setLtrs(newLtrs); setSlots(newSlots);
        checkWin(newSlots, cwd.word, hintUsedRef.current);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, checkWin]);

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const slotCls = (slot: SlotItem | null) => {
    const base = "flex items-center justify-center rounded-md border-2 font-mono font-bold select-none transition-all duration-150 cursor-pointer";
    const size = (wd?.word.length ?? 0) > 7 ? "w-9 h-11 text-sm" : "w-11 h-13 text-base";
    if (phase === "win") return `${base} ${size} border-[#00ffcc] text-[#00ffcc] shadow-[0_0_8px_rgba(0,255,204,0.4)] cursor-default`;
    if (phase === "err") return `${base} ${size} border-red-500 text-red-400 cursor-default`;
    if (slot?.isHint)   return `${base} ${size} border-purple-400 text-purple-300 cursor-default`;
    if (slot)           return `${base} ${size} border-[#ff9900] text-[#ff9900] hover:border-amber-400`;
    return               `${base} ${size} border-zinc-700 text-zinc-700 cursor-default`;
  };

  const catColor   = wd ? (CAT_COLOR[wd.cat] ?? "#a1a1aa") : "#a1a1aa";
  const sortedRanks = [...entries].sort((a, b) => b.score - a.score);
  const MONO = "ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace";

  // ─────────────────────────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  const modal = open && (
    <>
      {/* ── Backdrop ── */}
      <div
        className="fixed inset-0 z-40"
        style={{ backdropFilter: "blur(6px)", background: "rgba(0,0,0,0.65)" }}
        onClick={() => setOpen(false)}
      />

      {/* ── Card (centered modal) ── */}
      <div
        className="fixed z-50 flex flex-col rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden"
        style={{
          width: 440,
          maxHeight: "calc(100vh - 40px)",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          background: "#111116",
          fontFamily: MONO,
        }}
      >
        {/* ── Card Header ── */}
        <div
          className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-zinc-800"
          style={{ background: "rgba(14,14,18,0.95)" }}
        >
          {/* Left */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-widest text-white">AHAGRAM</span>
            <span className="text-[10px] text-zinc-500 font-bold tracking-widest">TEST</span>
            {view === "game" && (
              <button type="button" onClick={doReset} title="รีเซ็ต"
                className="text-zinc-600 hover:text-zinc-300 transition-colors ml-1 text-xs">⟳</button>
            )}
          </div>
          {/* Right */}
          <div className="flex items-center gap-3">
            {/* Leaderboard toggle */}
            <button
              type="button"
              onClick={() => changeView(view === "ranks" ? "game" : "ranks")}
              title="Leaderboard"
              className="text-base leading-none hover:scale-110 transition-transform"
              style={{ opacity: view === "ranks" ? 1 : 0.7 }}
            >
              🏆
            </button>
            <div className="text-center">
              <div className="text-[9px] text-zinc-500 leading-none">TRIPS</div>
              <div className="text-sm font-bold leading-none mt-0.5" style={{ color: "#00ffcc" }}>{trips}</div>
            </div>
            <div className="text-center">
              <div className="text-[9px] text-zinc-500 leading-none">COFFEE</div>
              <div className="text-sm font-bold leading-none mt-0.5" style={{ color: "#ff9900" }}>☕{score}</div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-zinc-800 transition-colors ml-1"
            >
              <X className="w-3.5 h-3.5 text-zinc-500 hover:text-zinc-300" />
            </button>
          </div>
        </div>

        {/* ── View container ── */}
        <div
          className="flex-1 flex flex-col overflow-hidden"
          style={{ opacity: viewFade ? 0 : 1, transition: "opacity 0.15s" }}
        >

          {/* ══════════ TUTORIAL VIEW ══════════ */}
          {view === "tutorial" && (
            <div className="flex-1 flex flex-col overflow-hidden"
              style={{ opacity: tutFade ? 0 : 1, transition: "opacity 0.18s" }}>

              {/* Step dots */}
              <div className="flex justify-center gap-1.5 pt-4 pb-1 shrink-0">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="rounded-full transition-all duration-300"
                    style={{
                      width: i === tutStep ? 22 : 7, height: 7,
                      background: i === tutStep ? "#a78bfa" : "#27272a",
                    }} />
                ))}
              </div>

              {/* Step content */}
              <div className="flex-1 overflow-y-auto px-6 py-3">

                {/* Step 0: Welcome */}
                {tutStep === 0 && (
                  <div className="flex flex-col items-center text-center gap-4">
                    <div className="text-5xl mt-2 animate-bounce">🎮</div>
                    <div>
                      <div className="text-xl font-bold tracking-widest text-white">AHAGRAM</div>
                      <div className="text-[11px] text-zinc-500 tracking-[0.2em] mt-0.5">MARKETING WORD GAME</div>
                    </div>
                    <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3 text-left">
                      {[
                        { icon: "🧩", title: "ทดสอบคำศัพท์", desc: "100 คำ ครอบคลุม Marketing, Travel, Social Media, CRM และอีกมาก" },
                        { icon: "☕", title: "เก็บ Coffee Points", desc: "ตอบถูกได้ +10☕ ใช้ Hint ได้ +5☕ แล้วขึ้น Leaderboard แข่งกับทีม" },
                        { icon: "⌨️", title: "พิมพ์จากแป้นพิมพ์ได้", desc: "รองรับ A-Z และ Backspace เพื่อความเร็วสูงสุด" },
                      ].map(({ icon, title, desc }) => (
                        <div key={title} className="flex items-start gap-3">
                          <span className="text-2xl shrink-0 mt-0.5">{icon}</span>
                          <div>
                            <div className="text-xs font-bold text-white mb-0.5">{title}</div>
                            <div className="text-[11px] text-zinc-500 leading-relaxed font-sans">{desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 1: How to play */}
                {tutStep === 1 && (
                  <div className="flex flex-col items-center gap-4">
                    <div className="text-center">
                      <div className="text-xs font-bold tracking-widest text-zinc-300 uppercase">📝 วิธีเล่น</div>
                      <div className="text-[10px] text-zinc-600 mt-0.5">ดูการสาธิต: เรียง B · A · L · I</div>
                    </div>
                    {/* Demo animation box */}
                    <div className="w-full rounded-xl border border-zinc-800 bg-zinc-900/40">
                      <DemoAnim />
                    </div>
                    {/* Instructions */}
                    <div className="w-full space-y-2">
                      {[
                        ["1️⃣", "ดู Category", "คิดคำที่เกี่ยวข้องกับหมวดนั้น"],
                        ["2️⃣", "กดตัวอักษร", "เรียงจาก scramble ให้ถูกต้อง"],
                        ["3️⃣", "กดช่องเพื่อลบ", "คลิกช่องที่ใส่แล้วเพื่อส่งคืน"],
                      ].map(([icon, title, desc]) => (
                        <div key={String(title)} className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/30 px-3 py-2.5">
                          <span className="text-lg shrink-0">{icon}</span>
                          <div>
                            <div className="text-xs font-bold text-white">{title}</div>
                            <div className="text-[10px] text-zinc-500 mt-0.5 font-sans">{desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 2: Boosters */}
                {tutStep === 2 && (
                  <div className="flex flex-col items-center gap-4">
                    <div className="text-xs font-bold tracking-widest text-zinc-300 uppercase text-center">⚡ Boosters & คะแนน</div>
                    <div className="w-full space-y-2">
                      {[
                        { icon: "🔄", name: "SHUFFLE", cost: "ฟรี!",  color: "#71717a", desc: "สลับตำแหน่งตัวอักษรใหม่ ใช้ได้ไม่จำกัด" },
                        { icon: "💡", name: "HINT",    cost: "–2☕",   color: "#a78bfa", desc: "เปิดเผยตัวอักษรตัวแรก ใช้ได้ครั้งเดียวต่อคำ" },
                        { icon: "⏩", name: "SKIP",    cost: "–10☕",  color: "#f87171", desc: "ข้ามคำนี้และดูความหมาย ราคาแพงที่สุด!" },
                      ].map((b) => (
                        <div key={b.name} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
                          <span className="text-2xl shrink-0">{b.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs font-bold text-white">{b.name}</span>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                style={{ color: b.color, background: b.color + "22" }}>{b.cost}</span>
                            </div>
                            <div className="text-[10px] text-zinc-500 font-sans">{b.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="w-full rounded-xl border border-zinc-800 bg-zinc-900/30 px-4 py-3 space-y-2">
                      <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">คะแนนที่จะได้รับ</div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-zinc-400">✅ ตอบถูก (ไม่ใช้ Hint)</span>
                        <span className="text-xs font-bold" style={{ color: "#00ffcc" }}>+10☕</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-zinc-400">🌟 ตอบถูก (ใช้ Hint)</span>
                        <span className="text-xs font-bold" style={{ color: "#a78bfa" }}>+5☕</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Tutorial footer nav */}
              <div className="shrink-0 px-5 py-4 border-t border-zinc-800 flex items-center justify-between">
                <button type="button" onClick={skipTutorial}
                  className="text-[10px] text-zinc-700 hover:text-zinc-400 transition-colors">
                  ข้ามคู่มือ
                </button>
                <div className="flex gap-2">
                  {tutStep > 0 && (
                    <button type="button" onClick={prevTutStep}
                      className="px-4 py-2 rounded-lg border border-zinc-800 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all">
                      ← กลับ
                    </button>
                  )}
                  <button type="button" onClick={nextTutStep}
                    className="px-5 py-2 rounded-xl text-xs font-extrabold text-black transition-all hover:opacity-90 active:scale-[0.97]"
                    style={{
                      background: tutStep === 2
                        ? "linear-gradient(to right,#06b6d4,#10b981)"
                        : "linear-gradient(to right,#a78bfa,#7c3aed)",
                    }}>
                    {tutStep === 2 ? "เริ่มเล่น! 🚀" : "ถัดไป →"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══════════ RANKINGS VIEW ══════════ */}
          {view === "ranks" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="shrink-0 px-5 pt-4 pb-2">
                <div className="text-xs font-bold tracking-widest text-zinc-300 uppercase">🏆 Leaderboard</div>
                <div className="text-[10px] text-zinc-600 mt-0.5 font-sans">อันดับผู้เล่นในทีม · คะแนน ☕ Coffee</div>
              </div>
              <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-2">
                {sortedRanks.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-3">🏅</div>
                    <div className="text-zinc-600 text-sm">ยังไม่มีข้อมูล</div>
                    <div className="text-zinc-700 text-xs mt-1 font-sans">เริ่มเล่นเพื่อบันทึกคะแนน!</div>
                  </div>
                ) : sortedRanks.map((e, i) => {
                  const medals = ["🥇", "🥈", "🥉"];
                  const isMe   = e.username === actorName;
                  return (
                    <div key={e.username}
                      className="flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors"
                      style={{
                        borderColor: isMe ? "#a78bfa55" : "#27272a",
                        background:  isMe ? "#a78bfa0d" : "transparent",
                      }}>
                      <div className="text-xl w-7 text-center shrink-0">
                        {medals[i] ?? <span className="text-zinc-500 text-sm font-bold">{i + 1}.</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white truncate">
                          {e.displayName}
                          {isMe && <span className="text-[10px] text-zinc-600 ml-1.5 font-normal">(คุณ)</span>}
                        </div>
                        <div className="text-[10px] text-zinc-600">{e.trips} trips completed</div>
                      </div>
                      <div className="text-base font-bold shrink-0 tabular-nums" style={{ color: "#f59e0b" }}>
                        ☕{e.score}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="shrink-0 px-4 py-3 border-t border-zinc-800">
                <button type="button" onClick={() => changeView("game")}
                  className="w-full py-2.5 rounded-xl text-xs font-extrabold text-black transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{ background: "linear-gradient(to right,#06b6d4,#10b981)" }}>
                  กลับสู่เกม
                </button>
              </div>
            </div>
          )}

          {/* ══════════ GAME VIEW ══════════ */}
          {view === "game" && (
            <div className="flex-1 flex flex-col relative overflow-hidden">
              {/* Body */}
              <div className="flex-1 flex flex-col items-center justify-between px-5 py-4">
                {/* Category + flash */}
                <div className="text-center w-full shrink-0">
                  <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border"
                    style={{ color: catColor, borderColor: catColor + "55", background: catColor + "11" }}>
                    {wd?.cat ?? "—"}
                  </span>
                  <div className="mt-2 text-[11px] font-bold tracking-wide h-4 transition-opacity duration-200"
                    style={{ color: "#00ffcc", opacity: flashMsg ? 1 : 0 }}>
                    {flashMsg ?? ""}
                  </div>
                </div>

                {/* Answer slots */}
                <div className="flex flex-wrap justify-center gap-2 my-2 min-h-[52px] w-full">
                  {slots.map((slot, i) => (
                    <div key={i} className={slotCls(slot)}
                      style={{ width: (wd?.word.length ?? 0) > 7 ? 38 : 44, height: (wd?.word.length ?? 0) > 7 ? 46 : 52 }}
                      onClick={() => slot && !slot.isHint && returnSlot(i)}
                      title={slot && !slot.isHint ? "คลิกเพื่อคืนตัวอักษร" : undefined}
                    >
                      {slot?.char ?? ""}
                    </div>
                  ))}
                </div>

                {/* Hint */}
                <div className="text-[9px] text-zinc-700 text-center shrink-0">
                  พิมพ์ตัวอักษร · Backspace เพื่อลบ
                </div>

                {/* Scrambled letters */}
                <div className="flex flex-wrap justify-center gap-2.5 w-full py-3">
                  {ltrs.map((ltr, i) => (
                    <button key={i} type="button" onClick={() => selectLetter(i)} disabled={ltr.used}
                      className="flex items-center justify-center rounded-full border font-bold select-none transition-all duration-100"
                      style={{
                        width: 48, height: 48, fontSize: 17,
                        background:  ltr.used ? "#0c0c0f" : "linear-gradient(145deg,#222226,#151518)",
                        borderColor: ltr.used ? "#18181b" : "#3f3f46",
                        color:       ltr.used ? "#18181b" : "#fff",
                        cursor:      ltr.used ? "default" : "pointer",
                        boxShadow:   ltr.used ? "none" : "2px 3px 6px rgba(0,0,0,0.6)",
                      }}
                      onMouseDown={(e) => { if (!ltr.used) (e.currentTarget as HTMLElement).style.transform = "scale(0.91)"; }}
                      onMouseUp={(e)   => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
                    >
                      {ltr.used ? "" : ltr.char}
                    </button>
                  ))}
                </div>
              </div>

              {/* Boosters */}
              <div className="shrink-0 flex gap-2 px-4 py-3 border-t border-zinc-800" style={{ background: "#090909" }}>
                <button type="button" onClick={doShuffle}
                  className="flex-1 flex flex-col items-center gap-0.5 py-2.5 rounded-xl border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all">
                  <span className="text-xl">🔄</span>
                  <span className="text-[9px]">SHUFFLE</span>
                </button>
                <button type="button" onClick={doHint} disabled={hintUsed}
                  className="flex-1 flex flex-col items-center gap-0.5 py-2.5 rounded-xl border border-zinc-800 hover:bg-zinc-800 transition-all"
                  style={{ color: hintUsed ? "#3f3f46" : "#a78bfa", opacity: hintUsed ? 0.4 : 1 }}>
                  <span className="text-xl">💡</span>
                  <span className="text-[9px]">HINT (–2☕)</span>
                </button>
                <button type="button" onClick={doSkip}
                  className="flex-1 flex flex-col items-center gap-0.5 py-2.5 rounded-xl border border-dashed border-red-950 hover:bg-red-950/20 transition-all">
                  <span className="text-xl">⏩</span>
                  <span className="text-[9px] text-red-400">SKIP (–10☕)</span>
                </button>
              </div>

              {/* ── Overlay: win / skip ── */}
              {phase === "overlay" && wd && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-20"
                  style={{ background: "rgba(9,9,11,0.97)" }}>
                  <div className="text-5xl mb-3">{skipped ? "⏩" : "🎉"}</div>
                  <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border mb-2"
                    style={{ color: catColor, borderColor: catColor + "55", background: catColor + "11" }}>
                    {wd.cat}
                  </span>
                  <div className="text-3xl font-bold tracking-[0.2em] mb-3"
                    style={{ color: skipped ? "#f97316" : "#00ffcc" }}>
                    {wd.word}
                  </div>
                  <div className="w-full rounded-xl border p-4 text-left mb-4"
                    style={{ background: "rgba(24,24,27,0.85)", borderColor: "#27272a" }}>
                    <div className="text-[9px] text-zinc-500 mb-1.5 tracking-wider uppercase">VIBE & MEANING</div>
                    <p className="text-xs text-zinc-300 leading-relaxed font-sans">{wd.def}</p>
                  </div>
                  <div className="text-xs mb-5">
                    {skipped
                      ? <span className="text-red-400">–10 ☕ (Skipped)</span>
                      : <span style={{ color: "#00ffcc" }}>+{overlayPts} ☕{hintUsed ? " (with hint)" : " ✦ Perfect!"}</span>
                    }
                  </div>
                  <button type="button" onClick={startLevel}
                    className="w-full py-3 rounded-xl font-extrabold text-sm tracking-wider text-black transition-all active:scale-[0.98] hover:opacity-90"
                    style={{ background: "linear-gradient(to right,#06b6d4,#10b981)" }}>
                    CONTINUE TO NEXT TRIP 🚀
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );

  // ── Inline trigger (footer) ───────────────────────────────────────────────────
  if (inline) {
    return (
      <>
        <button type="button" onClick={() => setOpen((o) => !o)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
          <span className="text-sm leading-none">🎮</span>
          <span>
            AHAGRAM
            {trips > 0 && <span className="ml-1 font-semibold" style={{ color: "#f59e0b" }}>{trips}☕</span>}
          </span>
        </button>
        {modal}
      </>
    );
  }

  // ── Floating FAB ──────────────────────────────────────────────────────────────
  return (
    <>
      <button type="button" onClick={() => setOpen((o) => !o)} title="AHAGRAM Test"
        className="fixed bottom-5 right-5 z-30 w-12 h-12 rounded-full bg-zinc-900 border border-zinc-700 shadow-xl flex items-center justify-center hover:bg-zinc-800 hover:scale-105 active:scale-95 transition-all">
        {open ? <X className="w-5 h-5 text-zinc-300" /> : <span className="text-xl leading-none">🎮</span>}
        {!open && trips > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-[9px] font-bold text-black flex items-center justify-center">
            {trips > 9 ? "9+" : trips}
          </span>
        )}
      </button>
      {modal}
    </>
  );
}
