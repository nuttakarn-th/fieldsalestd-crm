/**
 * standyEngine.ts  — v2
 * Conversational, question-driven responses.
 * Philosophy: brief summary → ask back → guide to answer.
 */

import type { TourItem, CarItem, InsuranceItem, FlightItem, HotelItem, VisaItem } from "@/store/serviceStore";
import type { Customer, Lead } from "@/store/crmStore";
import type { BotSettings } from "@/store/webSettingsStore";
import type { BotQA } from "@/store/botQAStore";
import { matchQA } from "@/store/botQAStore";

export interface StandyContext {
  tours: TourItem[];
  cars: CarItem[];
  flights: FlightItem[];
  hotels: HotelItem[];
  visas: VisaItem[];
  insurances: InsuranceItem[];
  customers?: Customer[];
  leads?: Lead[];
  settings?: BotSettings;
  userRole?: string;
  qaList?: BotQA[];   // Q&A ที่ Admin เทรนไว้ — เช็คก่อน rule engine เสมอ
}

export interface StandyResponse {
  text: string;
  requiresSensitiveApproval?: boolean;
  pendingData?: Customer[];
  smartCards?: string[];
}

type Intent =
  | "greeting" | "help"
  | "tour_search"           // ค้นหาทัวร์จากปลายทาง/ประเทศ
  | "tour_list" | "tour_price" | "tour_quota"
  | "tour_international" | "tour_domestic"
  | "car_list" | "flight_list" | "hotel_list"
  | "visa_list" | "insurance_list"
  | "service_overview"              // บริการมีอะไรบ้าง / ขายอะไร
  | "budget_search"                 // งบ X บาท / ราคาไม่เกิน X
  | "customer_count" | "customer_detail"
  | "lead_stats" | "unknown";

// ── Country/city keyword map ───────────────────────────────────────────────
const COUNTRY_KEYWORDS: Record<string, string[]> = {
  "จีน":        ["จีน","china","chinese","ฉงชิ่ง","chongqing","ปักกิ่ง","beijing","เซี่ยงไฮ้","shanghai","กุ้ยหลิน","guilin","คุนหมิง","kunming","จางเจียเจี้","zhangjiajie","ฮาร์บิน","harbin","ซีอาน","xian","เฉิงตู","chengdu","ซูโจว","suzhou"],
  "ญี่ปุ่น":    ["ญี่ปุ่น","japan","japanese","โตเกียว","tokyo","โอซาก้า","osaka","เกียวโต","kyoto","ฮอกไกโด","hokkaido","ฟูกูโอกะ","fukuoka","นาโกย่า","nagoya"],
  "เกาหลี":     ["เกาหลี","korea","korean","โซล","seoul","บูซาน","busan","เชจู","jeju"],
  "ยุโรป":      ["ยุโรป","europe","paris","ฝรั่งเศส","อิตาลี","italy","สวิส","swiss","เยอรมัน","germany","อังกฤษ","london","สเปน","spain"],
  "เวียดนาม":   ["เวียดนาม","vietnam","ฮานอย","hanoi","โฮจิมินห์","ho chi minh","ดานัง","danang","ฮาลอง","halong"],
  "ไต้หวัน":    ["ไต้หวัน","taiwan","ไทเป","taipei"],
  "สิงคโปร์":   ["สิงคโปร์","singapore"],
  "มาเลเซีย":   ["มาเลเซีย","malaysia","กัวลาลัมเปอร์","kuala lumpur"],
  "ฮ่องกง":     ["ฮ่องกง","hong kong","hongkong"],
  "อินเดีย":    ["อินเดีย","india","มุมไบ","delhi","agra","อักรา"],
  "ตุรกี":      ["ตุรกี","turkey","istanbul","อิสตันบูล"],
  "อียิปต์":    ["อียิปต์","egypt","cairo","ไคโร"],
  "รัสเซีย":    ["รัสเซีย","russia","moscow","มอสโก"],
  "สแกน":       ["สแกน","scandinavia","นอร์เวย์","norway","สวีเดน","sweden","ฟินแลนด์","finland"],
};

function detectCountry(text: string): string | null {
  const t = text.toLowerCase();
  for (const [country, keywords] of Object.entries(COUNTRY_KEYWORDS)) {
    if (keywords.some(k => t.includes(k))) return country;
  }
  return null;
}

// ── Intent detection ───────────────────────────────────────────────────────
export function detectIntent(text: string): Intent {
  const t = text.toLowerCase();
  if (/สวัสดี|หวัดดี|hello|^hi\b|ดีครับ|ดีค่ะ|ดีจ้า/.test(t)) return "greeting";
  if (/บริการ|service|ขายอะไร|มีอะไรให้|จำหน่าย|แพคเกจ|package|ให้บริการอะไร/.test(t)) return "service_overview";
  if (/ทำอะไร|ช่วยอะไร|ถามอะไร|help|ความสามารถ|มีอะไรบ้าง/.test(t)) return "help";
  if (/งบ\s*\d|ราคาไม่เกิน|budget|ไม่เกิน\s*\d|ประมาณ\s*\d|แค่\s*\d/.test(t)) return "budget_search";
  if (/ที่นั่ง|ว่างเหลือ|โควต้า|quota|เหลือกี่|ที่นั่งว่าง|จำนวนที่นั่ง|seat/.test(t)) return "tour_quota";
  if (/ราคา|ค่าใช้จ่าย|เท่าไร|เท่าไหร่|ค่าทัวร์|price|บาท/.test(t) && /ทัวร์|tour|เที่ยว/.test(t)) return "tour_price";
  if (detectCountry(t)) return "tour_search";
  if (/ต่างประเทศ|international|inter|abroad/.test(t)) return "tour_international";
  if (/ภายในประเทศ|domestic|ในประเทศ/.test(t)) return "tour_domestic";
  if (/ทัวร์|โปรแกรม|destination|tour|เที่ยว|ท่องเที่ยว|ไปเที่ยว|แพ็กเกจ|package|มีที่ไหน|ไปไหน|พาไป|จัดทริป|ทริป/.test(t)) return "tour_list";
  if (/เช่ารถ|รถเช่า|รถตู้|รถบัส|รถ\b|van\b|bus\b|car\b/.test(t)) return "car_list";
  if (/ตั๋วเครื่องบิน|ตั๋ว|บิน|สายการบิน|flight|airline/.test(t)) return "flight_list";
  if (/โรงแรม|ที่พัก|hotel/.test(t)) return "hotel_list";
  if (/วีซ่า|visa/.test(t)) return "visa_list";
  if (/ประกัน|insurance/.test(t)) return "insurance_list";
  if (/ชื่อลูกค้า|เบอร์ลูกค้า|เบอร์โทร|รายชื่อ|contact|ติดต่อลูกค้า/.test(t)) return "customer_detail";
  if (/ลูกค้า|customer|จำนวนลูกค้า/.test(t)) return "customer_count";
  if (/ยอดขาย|pipeline|deal|ปิดการขาย|lead|ขาย/.test(t)) return "lead_stats";
  return "unknown";
}

// ── Helpers ────────────────────────────────────────────────────────────────
function fmt(n: number) { return n.toLocaleString("th-TH"); }

/** แปลง period string → Date สำหรับเรียงลำดับ */
function parsePeriodDate(period: string): Date {
  try {
    // รองรับ "06/06/2569" หรือ "6 มิ.ย. 2569" หรือ "06-06-2569"
    const months: Record<string, number> = {
      "ม.ค.": 0, "ก.พ.": 1, "มี.ค.": 2, "เม.ย.": 3, "พ.ค.": 4, "มิ.ย.": 5,
      "ก.ค.": 6, "ส.ค.": 7, "ก.ย.": 8, "ต.ค.": 9, "พ.ย.": 10, "ธ.ค.": 11,
    };
    // "6 มิ.ย. 2569"
    const thaiMatch = period.match(/(\d{1,2})\s+([฀-๿.]+)\s+(\d{4})/);
    if (thaiMatch) {
      const day = parseInt(thaiMatch[1]);
      const mon = months[thaiMatch[2]] ?? 0;
      const yearBE = parseInt(thaiMatch[3]);
      const yearCE = yearBE > 2500 ? yearBE - 543 : yearBE;
      return new Date(yearCE, mon, day);
    }
    // "06/06/2569" or "06-06-2569"
    const numMatch = period.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (numMatch) {
      const d = parseInt(numMatch[1]), m = parseInt(numMatch[2]) - 1;
      const y = parseInt(numMatch[3]);
      const yearCE = y > 2500 ? y - 543 : y;
      return new Date(yearCE, m, d);
    }
  } catch (_) { /* ignore */ }
  return new Date(9999, 0, 1); // ไม่รู้ date → เรียงไปท้าย
}

function getSmartCards(intent: Intent, ctx: StandyContext): string[] {
  if (!ctx.settings?.smartSuggest) return [];
  switch (intent) {
    case "greeting": case "help": case "service_overview":
      return ["ทัวร์ต่างประเทศ", "ที่นั่งว่าง", "รถเช่า", "ประกัน"];
    case "tour_search": case "tour_list": case "tour_international": case "tour_domestic":
      return ["ที่นั่งว่าง", "ราคาทัวร์", "ทัวร์จีน", "ทัวร์ญี่ปุ่น"];
    case "tour_quota": case "tour_price":
      return ["จองทัวร์", "รถเช่า", "ประกัน"];
    case "car_list":
      return ["รถตู้ 9 ที่นั่ง", "รถบัส", "ราคารถเช่า"];
    case "insurance_list":
      return ["วีซ่า", "ทัวร์", "รถเช่า"];
    default:
      return ["ทัวร์", "รถเช่า", "ประกัน", "วีซ่า"];
  }
}

function blocked(topic: string): StandyResponse {
  return { text: `ขออภัยครับ ฟีเจอร์ **${topic}** ถูกปิดไว้ชั่วคราวครับ` };
}

// ── Group cars by seat range ───────────────────────────────────────────────
interface CarGroup { label: string; count: number; priceRange: string; }

function groupCars(cars: CarItem[]): CarGroup[] {
  const groups: Record<string, CarItem[]> = {};
  cars.forEach(c => {
    const seats = c.total_seats;
    const key = seats <= 9 ? "รถตู้ (7–9 ที่นั่ง)"
               : seats <= 12 ? "รถตู้ใหญ่ (10–12 ที่นั่ง)"
               : seats <= 20 ? "มินิบัส (13–20 ที่นั่ง)"
               : "รถบัส (30+ ที่นั่ง)";
    if (!groups[key]) groups[key] = [];
    groups[key].push(c);
  });
  return Object.entries(groups).map(([label, items]) => {
    const prices = items.map(i => i.rate_per_day);
    const min = Math.min(...prices), max = Math.max(...prices);
    const priceRange = min === max ? `฿${fmt(min)}/วัน` : `฿${fmt(min)}–${fmt(max)}/วัน`;
    return { label, count: items.length, priceRange };
  });
}

// ── Main response function ─────────────────────────────────────────────────
export function standyRespond(text: string, ctx: StandyContext): StandyResponse {
  const intent = detectIntent(text);
  const sc = getSmartCards(intent, ctx);
  const low = text.toLowerCase();

  // ── Q&A Training check (highest priority) ──────────────────────────────
  if (ctx.qaList?.length) {
    const qaAnswer = matchQA(text, ctx.qaList);
    if (qaAnswer) return { text: qaAnswer };
  }

  const stockIntents: Intent[] = [
    "tour_list","tour_price","tour_quota","tour_international","tour_domestic","tour_search",
    "car_list","flight_list","hotel_list","visa_list","insurance_list",
  ];
  if (stockIntents.includes(intent) && ctx.settings && !ctx.settings.allowStockQuery) {
    return blocked("ถามข้อมูล Stock");
  }

  const isManager = ctx.userRole === "Admin" || ctx.userRole === "Manager";
  const now = new Date();

  switch (intent) {

    // ── Service overview (บริการมีอะไรบ้าง) ──
    case "service_overview": {
      const { tours, cars, flights, hotels, visas, insurances } = ctx;
      const intl  = tours.filter(t => t.category === "International Tour");
      const dom   = tours.filter(t => t.category === "Domestic");
      const avail = tours.filter(t => t.quota > 0).length;

      // สรุป car types
      const carTypes: string[] = [];
      if (cars.some(c => c.total_seats <= 12)) carTypes.push("รถตู้");
      if (cars.some(c => c.total_seats > 12 && c.total_seats <= 20)) carTypes.push("มินิบัส");
      if (cars.some(c => c.total_seats > 20)) carTypes.push("รถโค้ช");

      let text = `**Standard Tour มีบริการครบวงจรครับ** 🙂\n\n`;

      if (tours.length) {
        text += `**🌏 ทัวร์** (${tours.length} โปรแกรม, มีที่ว่าง ${avail} โปรแกรม)\n`;
        if (intl.length) {
          const countries = [...new Set(intl.map(t => t.country))].slice(0, 4).join(", ");
          text += `• ต่างประเทศ ${intl.length} โปรแกรม — ${countries}\n`;
        }
        if (dom.length) text += `• ในประเทศ ${dom.length} โปรแกรม\n`;
      }

      if (cars.length) {
        text += `\n**🚌 รถเช่าพร้อมคนขับ** (${cars.length} คัน — ${carTypes.join(", ")})\n`;
      }

      if (flights.length) {
        const airlines = [...new Set(flights.map(f => f.airline))].slice(0, 3).join(", ");
        text += `\n**✈️ จองตั๋วเครื่องบิน** (${airlines})\n`;
      }

      if (hotels.length) {
        const hCountries = [...new Set(hotels.map(h => h.country))].slice(0, 3).join(", ");
        text += `\n**🏨 โรงแรม** (${hotels.length} แห่ง — ${hCountries})\n`;
      }

      if (visas.length) {
        const vCountries = [...new Set(visas.map(v => v.country))].slice(0, 3).join(", ");
        text += `\n**🛂 วีซ่า** (${vCountries})\n`;
      }

      if (insurances.length) {
        text += `\n**🛡 ประกันการเดินทาง** (${insurances.length} แผน)\n`;
      }

      text += `\nสนใจด้านไหนเป็นพิเศษครับ? บอกได้เลย เช่น _"ทัวร์จีนราคาเท่าไร"_ หรือ _"รถเช่ากี่ที่นั่งมีบ้าง"_ 😊`;

      return {
        text,
        smartCards: ctx.settings?.smartSuggest
          ? ["ทัวร์ต่างประเทศ", "รถเช่า", "ที่นั่งว่าง", "ประกัน"]
          : [],
      };
    }

    // ── Greeting ──
    case "greeting":
      return {
        text: "สวัสดีครับ! 🙂 ผม **Standy** ผู้ช่วยของ Standard Tour\n\nถามได้เรย:\n• ทัวร์ ราคา ที่นั่งว่าง\n• รถเช่า ประกัน วีซ่า โรงแรม ตั๋วเครื่องบิน\n• ข้อมูลลูกค้า Pipeline\n\nจะถามเรื่องอะไรดีครับ? 😊",
        smartCards: sc,
      };

    // ── Help ──
    case "help":
      return {
        text: "ผมช่วยได้เรื่องนี้ครับ:\n\n**🌏 ทัวร์** — ค้นหาตามประเทศ/เมือง, ราคา, ที่นั่งว่าง\n**🚌 รถเช่า** — ดูแบบ จำนวนที่นั่ง ราคา\n**✈️ บริการอื่น** — ตั๋ว, โรงแรม, วีซ่า, ประกัน\n**📊 ข้อมูล** — ลูกค้า, Pipeline (Staff เท่านั้น)\n\nลองถามมาได้เลยครับ เช่น _\"ทัวร์จีนใกล้สุดมีไหม\"_ หรือ _\"รถตู้ 9 ที่นั่งมีไหม\"_",
        smartCards: sc,
      };

    // ── Tour search by country/city ──
    case "tour_search": {
      const { tours } = ctx;
      const country = detectCountry(low) || "";
      const keywords = COUNTRY_KEYWORDS[country] || [];

      const matched = tours.filter(t => {
        const haystack = `${t.city} ${t.country} ${t.code}`.toLowerCase();
        return keywords.some(k => haystack.includes(k));
      });

      if (!matched.length) {
        return {
          text: `ขณะนี้ยังไม่มีโปรแกรม **${country || "ที่ค้นหา"}** ในระบบครับ\n\nต้องการดูโปรแกรมอื่นไหมครับ?`,
          smartCards: ["ทัวร์ต่างประเทศ", "ที่นั่งว่าง"],
        };
      }

      // เรียงตาม departure date ใกล้สุดก่อน กรองเฉพาะที่ยังไม่ผ่าน
      const upcoming = matched
        .map(t => ({ ...t, _date: parsePeriodDate(t.period) }))
        .filter(t => t._date >= now)
        .sort((a, b) => a._date.getTime() - b._date.getTime());

      const list = upcoming.length ? upcoming : matched.slice(0, 3);
      const nearest = list[0];
      const hasSeats = nearest.quota > 0;
      const urgency = nearest.quota <= 3 ? ` ⚠️ เหลือแค่ **${nearest.quota}** ที่แล้วครับ!` : ` เหลือ **${nearest.quota}** ที่นั่ง`;

      let text = `**ทัวร์${country}** ที่ใกล้สุด:\n\n`;
      text += `📍 **${nearest.code}** — ${nearest.city}, ${nearest.country}\n`;
      text += `📅 ออกเดินทาง: ${nearest.period} (${nearest.duration})\n`;
      text += `💰 ราคา: ฿${fmt(nearest.price_per_seat)}/ท่าน\n`;
      text += hasSeats ? `✅ ${urgency}` : `❌ เต็มแล้วครับ`;

      if (list.length > 1) {
        text += `\n\nยังมีอีก **${list.length - 1}** โปรแกรม${country} — ดูเพิ่มเติมได้ไหมครับ?`;
      } else {
        text += hasSeats ? `\n\n**สนใจจองไหมครับ?** แจ้ง Staff เพื่อดำเนินการต่อได้เลยครับ 🙏` : `\n\nต้องการดูโปรแกรม${country}รอบถัดไปไหมครับ?`;
      }

      const cards = list.length > 1
        ? [`ดูทัวร์${country}ทั้งหมด`, "ราคาทัวร์", "ที่นั่งว่าง"]
        : ["ราคาทัวร์", "ที่นั่งว่าง", "ประกัน", "วีซ่า"];
      return { text, smartCards: ctx.settings?.smartSuggest ? cards : [] };
    }

    // ── Budget search ──
    case "budget_search": {
      const { tours } = ctx;
      // ดึงตัวเลขจาก text เช่น "งบ 20000", "ไม่เกิน 15,000"
      const numMatch = low.replace(/,/g, "").match(/\d{4,}/);
      const budget = numMatch ? parseInt(numMatch[0]) : 0;

      if (!budget) {
        return {
          text: "บอกงบประมาณต่อท่านมาได้เลยครับ เช่น _\"งบ 20000\"_ แล้วผมจะหาโปรแกรมที่เหมาะสมให้ครับ 😊",
          smartCards: ctx.settings?.smartSuggest ? ["ทัวร์จีน", "ทัวร์ญี่ปุ่น", "ที่นั่งว่าง"] : [],
        };
      }

      const inBudget = tours
        .filter(t => t.price_per_seat <= budget && t.quota > 0)
        .sort((a, b) => b.price_per_seat - a.price_per_seat); // แพงสุดที่อยู่ในงบก่อน

      if (!inBudget.length) {
        const cheapest = [...tours].sort((a,b) => a.price_per_seat - b.price_per_seat)[0];
        return {
          text: `ขณะนี้ยังไม่มีโปรแกรมในงบ ฿${fmt(budget)} ครับ 😔\n\nโปรแกรมที่ราคาใกล้เคียงที่สุด:\n• **${cheapest?.code}** ${cheapest?.city} — ฿${fmt(cheapest?.price_per_seat)}/ท่าน\n\nปรับงบได้ไหมครับ? หรือจะดูโปรแกรมในประเทศซึ่งราคาเริ่มต้นน้อยกว่า?`,
          smartCards: ctx.settings?.smartSuggest ? ["ทัวร์ในประเทศ", "ที่นั่งว่าง"] : [],
        };
      }

      const top = inBudget.slice(0, 3);
      let text = `งบ ฿${fmt(budget)}/ท่าน — มีโปรแกรมที่เหมาะสม **${inBudget.length} โปรแกรม** ครับ 🎉\n\n`;
      top.forEach(t =>
        text += `• **${t.code}** ${t.city}, ${t.country} — ฿${fmt(t.price_per_seat)} | ${t.period} | ว่าง ${t.quota} ที่\n`
      );
      if (inBudget.length > 3) text += `…อีก ${inBudget.length - 3} โปรแกรม\n`;
      text += `\nสนใจโปรแกรมไหนดูรายละเอียดเพิ่มได้เลยครับ 😊`;

      return {
        text,
        smartCards: ctx.settings?.smartSuggest ? ["ราคาทัวร์", "ที่นั่งว่าง", "ประกัน"] : [],
      };
    }

    // ── Tour list (ไม่ระบุประเทศ) ──
    case "tour_list": {
      const { tours } = ctx;
      if (!tours.length) return { text: "ขณะนี้ยังไม่มีโปรแกรมทัวร์เปิดรับจองครับ กลับมาเช็กใหม่เร็วๆ นี้นะครับ 🙏", smartCards: sc };
      const intl  = tours.filter(t => t.category === "International Tour");
      const dom   = tours.filter(t => t.category === "Domestic");
      const avail = tours.filter(t => t.quota > 0).length;
      const intlCountries = [...new Set(intl.map(t => t.country))].slice(0, 4).join(", ");

      // ทัวร์ที่ใกล้ออกเดินทางที่สุด
      const upcoming = tours
        .map(t => ({ ...t, _date: parsePeriodDate(t.period) }))
        .filter(t => t._date >= now && t.quota > 0)
        .sort((a, b) => a._date.getTime() - b._date.getTime());
      const next = upcoming[0];

      let text = `อยากไปเที่ยวแบบไหนดีครับ? 😊 เรามีให้เลือก **${tours.length} โปรแกรม**\n`;
      text += `• 🌏 ต่างประเทศ ${intl.length} โปรแกรม (${intlCountries})\n`;
      if (dom.length) text += `• 🇹🇭 ในประเทศ ${dom.length} โปรแกรม\n`;
      text += `• ✅ มีที่นั่งว่างทันที ${avail} โปรแกรม\n`;

      if (next) {
        text += `\n⚡ **ใกล้ออกเดินทาง:** ${next.code} ${next.city} (${next.period}) เหลือ ${next.quota} ที่`;
      }

      text += `\n\nบอกได้เลยครับ สนใจประเทศไหน หรืองบประมาณเท่าไร? จะช่วยหาให้ตรงๆ 😊`;
      return {
        text,
        smartCards: ctx.settings?.smartSuggest ? ["ทัวร์จีน", "ทัวร์ญี่ปุ่น", "ทัวร์ยุโรป", "ที่นั่งว่าง"] : [],
      };
    }

    // ── International ──
    case "tour_international": {
      const intl = ctx.tours.filter(t => t.category === "International Tour");
      if (!intl.length) return { text: "ยังไม่มีทัวร์ต่างประเทศในระบบครับ", smartCards: sc };
      const avail = intl.filter(t => t.quota > 0).length;
      const countries = [...new Set(intl.map(t => t.country))].slice(0, 6).join(", ");
      return {
        text: `ทัวร์ต่างประเทศตอนนี้มี **${intl.length} โปรแกรม** (มีที่นั่งว่าง ${avail} โปรแกรม)\n\n🌏 ประเทศที่มี: ${countries}\n\nสนใจประเทศไหนครับ? ถามชื่อประเทศได้เลย เช่น _"ทัวร์จีน"_ หรือ _"ทัวร์ญี่ปุ่น"_`,
        smartCards: ctx.settings?.smartSuggest ? ["ทัวร์จีน", "ทัวร์ญี่ปุ่น", "ทัวร์เกาหลี", "ทัวร์ยุโรป"] : [],
      };
    }

    // ── Domestic ──
    case "tour_domestic": {
      const dom = ctx.tours.filter(t => t.category === "Domestic");
      if (!dom.length) return { text: "ยังไม่มีทัวร์ในประเทศในระบบครับ", smartCards: sc };
      const avail = dom.filter(t => t.quota > 0).length;
      const cities = [...new Set(dom.map(t => t.city))].slice(0, 5).join(", ");
      return {
        text: `ทัวร์ในประเทศมี **${dom.length} โปรแกรม** (มีที่นั่งว่าง ${avail} โปรแกรม)\n\n🇹🇭 จุดหมาย: ${cities}\n\nสนใจจังหวัดหรือภาคไหนครับ?`,
        smartCards: ctx.settings?.smartSuggest ? ["ที่นั่งว่าง", "ราคาทัวร์", "รถเช่า"] : [],
      };
    }

    // ── Tour price ──
    case "tour_price": {
      const { tours } = ctx;
      if (!tours.length) return { text: "ยังไม่มีข้อมูลราคาทัวร์ในระบบครับ", smartCards: sc };

      const matched = tours.filter(t => {
        const h = `${t.city} ${t.country} ${t.code}`.toLowerCase();
        return Object.values(COUNTRY_KEYWORDS).flat().some(k => low.includes(k) && h.includes(k));
      });

      if (matched.length) {
        const t = matched[0];
        return {
          text: `**${t.code}** — ${t.city}, ${t.country}\n💰 ฿${fmt(t.price_per_seat)}/ท่าน | ${t.period} (${t.duration})\n✅ ที่นั่งว่าง ${t.quota} ที่\n\nสนใจดูรายละเอียดเพิ่มหรือเปรียบเทียบโปรแกรมอื่นไหมครับ?`,
          smartCards: ctx.settings?.smartSuggest ? ["ที่นั่งว่าง", "ประกัน", "วีซ่า"] : [],
        };
      }

      const sorted = [...tours].sort((a, b) => a.price_per_seat - b.price_per_seat);
      const min = sorted[0], max = sorted[sorted.length - 1];
      return {
        text: `ราคาทัวร์อยู่ที่ **฿${fmt(min.price_per_seat)}** – **฿${fmt(max.price_per_seat)}** ต่อท่าน\n(${sorted.length} โปรแกรม)\n\nสนใจทัวร์ประเทศไหนครับ? บอกได้เลย เช่น _"ราคาทัวร์จีน"_ แล้วผมดูให้เลยครับ 😊`,
        smartCards: ctx.settings?.smartSuggest ? ["ทัวร์จีน", "ทัวร์ญี่ปุ่น", "ทัวร์ยุโรป", "ที่นั่งว่าง"] : [],
      };
    }

    // ── Tour quota ──
    case "tour_quota": {
      const { tours } = ctx;
      if (!tours.length) return { text: "ยังไม่มีข้อมูลที่นั่งในระบบครับ", smartCards: sc };
      const avail = tours.filter(t => t.quota > 0);
      const full  = tours.filter(t => t.quota === 0);

      if (!avail.length) {
        return {
          text: `ขณะนี้ทัวร์ทุกโปรแกรม (${full.length} โปรแกรม) เต็มหมดแล้วครับ 😔\n\nต้องการให้แจ้งเมื่อมีที่ว่างไหมครับ?`,
          smartCards: sc,
        };
      }

      // เรียงตาม quota น้อยก่อน (urgent ก่อน)
      const urgent = avail.sort((a, b) => a.quota - b.quota).slice(0, 3);
      let text = `มีที่นั่งว่าง **${avail.length}/${tours.length} โปรแกรม** ครับ\n\n`;
      text += `⚡ **ใกล้เต็ม:**\n`;
      urgent.forEach(t =>
        text += `• ${t.code} ${t.city} — เหลือ **${t.quota}** ที่ | ฿${fmt(t.price_per_seat)}\n`
      );
      if (avail.length > 3) text += `\n…อีก ${avail.length - 3} โปรแกรมที่มีที่ว่าง\n`;
      text += `\nสนใจโปรแกรมไหนครับ? บอกชื่อประเทศหรือรหัสทัวร์ได้เลย 😊`;
      return {
        text,
        smartCards: ctx.settings?.smartSuggest ? ["ทัวร์จีน", "ทัวร์ญี่ปุ่น", "ราคาทัวร์", "ประกัน"] : [],
      };
    }

    // ── Car list ──
    case "car_list": {
      const { cars } = ctx;
      if (!cars.length) return { text: "ยังไม่มีข้อมูลรถเช่าในระบบครับ", smartCards: sc };

      const groups = groupCars(cars);
      let text = `รถเช่ามีทั้งหมด **${cars.length} คัน** แบ่งเป็น ${groups.length} กลุ่มครับ:\n\n`;
      groups.forEach(g => {
        text += `**${g.label}** — ${g.count} คัน | ${g.priceRange}\n`;
      });
      text += `\nสนใจรถกี่ที่นั่งครับ? หรือบอก Budget ต่อวันมาได้เลย 😊`;

      return {
        text,
        smartCards: ctx.settings?.smartSuggest
          ? ["รถตู้ 9 ที่นั่ง", "รถบัส", "ราคารถเช่า"]
          : [],
      };
    }

    // ── Flights ──
    case "flight_list": {
      const { flights } = ctx;
      if (!flights.length) return { text: "ยังไม่มีข้อมูลสายการบินในระบบครับ", smartCards: sc };
      const airlines = [...new Set(flights.map(f => f.airline))];
      return {
        text: `มีสายการบินในระบบ **${airlines.length} สาย** ครับ:\n${airlines.map(a => `• ${a}`).join("\n")}\n\nสนใจเส้นทางไหนครับ?`,
        smartCards: ctx.settings?.smartSuggest ? ["ทัวร์ต่างประเทศ", "โรงแรม", "วีซ่า"] : [],
      };
    }

    // ── Hotels ──
    case "hotel_list": {
      const { hotels } = ctx;
      if (!hotels.length) return { text: "ยังไม่มีข้อมูลโรงแรมในระบบครับ", smartCards: sc };
      const countries = [...new Set(hotels.map(h => h.country))].slice(0, 5);
      return {
        text: `มีโรงแรมในระบบ **${hotels.length} แห่ง** ใน ${countries.length} ประเทศครับ\n(${countries.join(", ")})\n\nสนใจโรงแรมในประเทศไหนครับ?`,
        smartCards: ctx.settings?.smartSuggest ? ["ทัวร์", "วีซ่า", "ประกัน"] : [],
      };
    }

    // ── Visas ──
    case "visa_list": {
      const { visas } = ctx;
      if (!visas.length) return { text: "ยังไม่มีข้อมูลวีซ่าในระบบครับ", smartCards: sc };
      const countries = [...new Set(visas.map(v => v.country))].slice(0, 6);
      return {
        text: `มีบริการวีซ่า **${visas.length} รายการ** (${countries.join(", ")})\n\nสนใจวีซ่าประเทศไหนครับ?`,
        smartCards: ctx.settings?.smartSuggest ? ["ทัวร์ต่างประเทศ", "ประกัน", "ตั๋วเครื่องบิน"] : [],
      };
    }

    // ── Insurance ──
    case "insurance_list": {
      const { insurances } = ctx;
      if (!insurances.length) return { text: "ยังไม่มีข้อมูลประกันในระบบครับ", smartCards: sc };
      const prices = insurances.map(i => i.price);
      const min = Math.min(...prices), max = Math.max(...prices);
      return {
        text: `มีประกัน **${insurances.length} แผน** ราคา ฿${fmt(min)} – ฿${fmt(max)}/ท่าน ครับ\n\nต้องการทราบรายละเอียดแผนไหน? หรือใช้ทัวร์ไหนครับ? จะแนะนำให้ตรงๆ เลย 😊`,
        smartCards: ctx.settings?.smartSuggest ? ["ทัวร์", "วีซ่า", "รถเช่า"] : [],
      };
    }

    // ── Customer count ──
    case "customer_count": {
      if (!ctx.customers) return { text: "กรุณาเข้าสู่ระบบก่อนถามข้อมูลลูกค้าครับ" };
      if (ctx.settings && !ctx.settings.allowMyCustomers) return blocked("ข้อมูลลูกค้า");
      const total = ctx.customers.length;
      const tiers: Record<string, number> = {};
      ctx.customers.forEach(c => { tiers[c.customer_tier] = (tiers[c.customer_tier] || 0) + 1; });
      return {
        text: `ลูกค้าทั้งหมด **${fmt(total)} ราย**\n• 👑 VIP: ${tiers["VIP"] || 0} ราย\n• 🔄 Regular: ${tiers["Regular"] || 0} ราย\n• 🆕 New: ${tiers["New"] || 0} ราย\n\nต้องการดูรายชื่อด้วยไหมครับ?`,
        requiresSensitiveApproval: true,
        pendingData: ctx.customers,
        smartCards: sc,
      };
    }

    // ── Customer detail ──
    case "customer_detail": {
      if (!ctx.customers) return { text: "กรุณาเข้าสู่ระบบก่อนถามข้อมูลลูกค้าครับ" };
      if (ctx.settings && !ctx.settings.allowMyCustomers) return blocked("ข้อมูลลูกค้า");
      if (!isManager && ctx.settings && !ctx.settings.allowOtherCustomers) {
        return { text: "สิทธิ์นี้สำหรับ Manager/Admin เท่านั้นครับ" };
      }
      return {
        text: "⚠️ ข้อมูลนี้มีชื่อและเบอร์โทรลูกค้า\nยืนยันแสดงไหมครับ? *(พิมพ์ 'ใช่' เพื่อแสดง)*",
        requiresSensitiveApproval: true,
        pendingData: ctx.customers,
        smartCards: sc,
      };
    }

    // ── Lead stats ──
    case "lead_stats": {
      if (!ctx.leads) return { text: "กรุณาเข้าสู่ระบบก่อนถามข้อมูล Pipeline ครับ" };
      const total = ctx.leads.length;
      const won   = ctx.leads.filter(l => l.status === "Closed Won");
      const lost  = ctx.leads.filter(l => l.status === "Closed Lost");
      const active= ctx.leads.filter(l => !["Closed Won","Closed Lost"].includes(l.status));
      const wonVal = won.reduce((s,l) => s + l.quoted_price, 0);
      return {
        text: `**Pipeline** รวม ${fmt(total)} deals\n• ✅ Won: ${won.length} deals — ฿${fmt(wonVal)}\n• 🔄 Active: ${active.length} deals\n• ❌ Lost: ${lost.length} deals\n\nต้องการดูรายละเอียด deal ไหนเป็นพิเศษครับ?`,
        smartCards: ctx.settings?.smartSuggest ? ["จำนวนลูกค้า", "ทัวร์ยอดนิยม"] : [],
      };
    }

    // ── Unknown ──
    default:
      return {
        text: "ขออภัยครับ ผมไม่แน่ใจว่าถามเรื่องอะไร 🙏\n\nลองถามแบบนี้ดูครับ:\n• _\"ทัวร์จีนมีไหม\"_\n• _\"รถตู้ 9 ที่นั่งราคาเท่าไร\"_\n• _\"ที่นั่งว่างโปรแกรมไหนบ้าง\"_",
        smartCards: getSmartCards("unknown", ctx),
      };
  }
}

export function resolveCustomerDetail(customers: Customer[], concise = false): string {
  if (!customers.length) return "ไม่มีข้อมูลลูกค้าในระบบครับ";
  const limit = concise ? 10 : 20;
  const lines = [`**รายชื่อลูกค้า ${customers.length} ราย** (แสดง ${Math.min(limit, customers.length)} รายแรก)\n`];
  customers.slice(0, limit).forEach((c, i) => {
    lines.push(concise
      ? `${i+1}. ${c.full_name} (${c.customer_tier}) — ${c.phone || "–"}`
      : `${i+1}. **${c.full_name}** (${c.customer_tier}) | 📞 ${c.phone || "–"} | ${c.company || "–"}`
    );
  });
  if (customers.length > limit) lines.push(`\n…อีก ${customers.length - limit} ราย — ดูเพิ่มในหน้า Customers ครับ`);
  return lines.join("\n");
}
