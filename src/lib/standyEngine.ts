/**
 * standyEngine.ts
 * Rule-based intent detection + response generation for Standy Assistant.
 * No external API needed — pulls entirely from local store data.
 */

import type { TourItem, CarItem, InsuranceItem, FlightItem, HotelItem, VisaItem } from "@/store/serviceStore";
import type { Customer, Lead } from "@/store/crmStore";

// ── Context passed in from the widget ──────────────────────────────────────
export interface StandyContext {
  tours: TourItem[];
  cars: CarItem[];
  flights: FlightItem[];
  hotels: HotelItem[];
  visas: VisaItem[];
  insurances: InsuranceItem[];
  customers?: Customer[];   // staff-only, guarded
  leads?: Lead[];           // staff-only, guarded
}

// ── Response shape ─────────────────────────────────────────────────────────
export interface StandyResponse {
  text: string;
  /** True → widget should ask user permission before revealing sensitive detail */
  requiresSensitiveApproval?: boolean;
  /** Pending payload to reveal after approval (customer list etc.) */
  pendingData?: Customer[];
}

// ── Intents ────────────────────────────────────────────────────────────────
type Intent =
  | "greeting"
  | "help"
  | "tour_list"
  | "tour_price"
  | "tour_quota"
  | "tour_international"
  | "tour_domestic"
  | "car_list"
  | "flight_list"
  | "hotel_list"
  | "visa_list"
  | "insurance_list"
  | "customer_count"
  | "customer_detail"
  | "lead_stats"
  | "unknown";

// ── Intent detection ───────────────────────────────────────────────────────
export function detectIntent(text: string): Intent {
  const t = text.toLowerCase();

  // Greeting
  if (/สวัสดี|หวัดดี|hello|^hi\b|ดีครับ|ดีค่ะ|ดีจ้า/.test(t)) return "greeting";

  // Help
  if (/ทำอะไร|ช่วยอะไร|ถามอะไร|help|ความสามารถ|ถามได้|มีอะไรบ้าง/.test(t)) return "help";

  // Quota / seats
  if (/ที่นั่ง|ว่างเหลือ|โควต้า|quota|เหลือกี่|ที่นั่งว่าง|จำนวนที่นั่ง|seat/.test(t)) return "tour_quota";

  // Price (must also mention tour)
  if (/ราคา|ค่าใช้จ่าย|เท่าไร|เท่าไหร่|ค่าทัวร์|price|บาท/.test(t) && /ทัวร์|tour/.test(t)) return "tour_price";

  // Price for other services handled below; tour price matched above

  // Tour by category
  if (/ต่างประเทศ|international|inter/.test(t) && /ทัวร์|tour/.test(t)) return "tour_international";
  if (/ภายในประเทศ|domestic|ในประเทศ/.test(t) && /ทัวร์|tour/.test(t)) return "tour_domestic";

  // Generic tour list
  if (/ทัวร์|โปรแกรม|destination|tour/.test(t)) return "tour_list";

  // Other services
  if (/เช่ารถ|รถเช่า|รถตู้|รถบัส|รถ\b|van\b|bus\b|car\b/.test(t)) return "car_list";
  if (/ตั๋วเครื่องบิน|ตั๋ว|บิน|สายการบิน|flight|airline/.test(t)) return "flight_list";
  if (/โรงแรม|ที่พัก|hotel/.test(t)) return "hotel_list";
  if (/วีซ่า|visa/.test(t)) return "visa_list";
  if (/ประกัน|insurance/.test(t)) return "insurance_list";

  // Customer detail (sensitive)
  if (/ชื่อลูกค้า|เบอร์ลูกค้า|เบอร์โทร|รายชื่อ|contact|ติดต่อลูกค้า/.test(t)) return "customer_detail";

  // Customer count (summary — will gate detail)
  if (/ลูกค้า|customer|จำนวนลูกค้า/.test(t)) return "customer_count";

  // Pipeline
  if (/ยอดขาย|pipeline|deal|ปิดการขาย|lead|ขาย/.test(t)) return "lead_stats";

  return "unknown";
}

// ── Helpers ────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return n.toLocaleString("th-TH");
}

/** Human-readable "updated at" note appended to numerical answers */
function tsLabel(): string {
  const now = new Date();
  return ` *(ข้อมูล ณ ${now.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })} เวลา ${now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น.)*`;
}

// ── Main response function ─────────────────────────────────────────────────
export function standyRespond(text: string, ctx: StandyContext): StandyResponse {
  const intent = detectIntent(text);
  const ts = tsLabel();
  const low = text.toLowerCase();

  switch (intent) {

    /* ── Greeting ── */
    case "greeting":
      return {
        text:
          "สวัสดีครับ! 🙂 ผม **Standy** ผู้ช่วยของ Standard Tour\n\n" +
          "ผมช่วยตอบข้อมูลจากระบบได้เรื่อง:\n" +
          "• 🌏 โปรแกรมทัวร์และที่นั่งว่าง\n" +
          "• 💰 ราคาทัวร์ต่อที่นั่ง\n" +
          "• 🚌 รถเช่า  ✈️ ตั๋วเครื่องบิน\n" +
          "• 🏨 โรงแรม  📄 วีซ่า  🛡️ ประกัน\n" +
          "• 👥 สรุปข้อมูลลูกค้า\n\n" +
          "ลองถามได้เลยครับ!",
      };

    /* ── Help ── */
    case "help":
      return {
        text:
          "ผม **Standy** ตอบได้เรื่อง:\n\n" +
          "**📋 บริการ**\n" +
          "• โปรแกรมทัวร์ต่างประเทศ / ในประเทศ\n" +
          "• ที่นั่งว่างในแต่ละทัวร์\n" +
          "• ราคาทัวร์ต่อที่นั่ง\n" +
          "• รถเช่า, ตั๋วเครื่องบิน, โรงแรม\n" +
          "• วีซ่าและประกันการเดินทาง\n\n" +
          "**📊 ข้อมูลระบบ**\n" +
          "• จำนวนและระดับลูกค้า\n" +
          "• สรุป Pipeline การขาย\n\n" +
          "ถามได้เลยครับ!",
      };

    /* ── Tour list (all) ── */
    case "tour_list": {
      const { tours } = ctx;
      if (!tours.length) return { text: "ขณะนี้ยังไม่มีโปรแกรมทัวร์ในระบบครับ" };
      const intl = tours.filter((t) => t.category === "International Tour");
      const dom = tours.filter((t) => t.category === "Domestic");
      const inc = tours.filter((t) => t.category === "Incentive");
      const lines: string[] = [`**โปรแกรมทัวร์ทั้งหมด ${tours.length} โปรแกรม**${ts}\n`];
      if (intl.length) {
        lines.push(`🌏 **International Tour (${intl.length})**`);
        intl.slice(0, 8).forEach((t) =>
          lines.push(`• ${t.code} — ${t.city}, ${t.country} | ${t.period} | ฿${fmt(t.price_per_seat)}/ที่นั่ง | ว่าง ${t.quota}/${t.total_seats}`)
        );
        if (intl.length > 8) lines.push(`  ...และอีก ${intl.length - 8} โปรแกรม`);
      }
      if (dom.length) {
        lines.push(`\n🇹🇭 **Domestic (${dom.length})**`);
        dom.slice(0, 8).forEach((t) =>
          lines.push(`• ${t.code} — ${t.city} | ${t.period} | ฿${fmt(t.price_per_seat)}/ที่นั่ง | ว่าง ${t.quota}/${t.total_seats}`)
        );
        if (dom.length > 8) lines.push(`  ...และอีก ${dom.length - 8} โปรแกรม`);
      }
      if (inc.length) {
        lines.push(`\n🎯 **Incentive (${inc.length})**`);
        inc.slice(0, 4).forEach((t) => lines.push(`• ${t.code} — ${t.city}, ${t.country}`));
      }
      return { text: lines.join("\n") };
    }

    /* ── International tours ── */
    case "tour_international": {
      const intl = ctx.tours.filter((t) => t.category === "International Tour");
      if (!intl.length) return { text: "ขณะนี้ยังไม่มีโปรแกรมทัวร์ต่างประเทศในระบบครับ" };
      const lines: string[] = [`**ทัวร์ต่างประเทศ ${intl.length} โปรแกรม**${ts}\n`];
      intl.forEach((t) =>
        lines.push(
          `• **${t.code}** — ${t.city}, ${t.country}\n` +
          `  ${t.period} (${t.duration}) | ฿${fmt(t.price_per_seat)}/ที่นั่ง | ว่าง **${t.quota}** ที่นั่ง`
        )
      );
      return { text: lines.join("\n") };
    }

    /* ── Domestic tours ── */
    case "tour_domestic": {
      const dom = ctx.tours.filter((t) => t.category === "Domestic");
      if (!dom.length) return { text: "ขณะนี้ยังไม่มีโปรแกรมทัวร์ในประเทศในระบบครับ" };
      const lines: string[] = [`**ทัวร์ในประเทศ ${dom.length} โปรแกรม**${ts}\n`];
      dom.forEach((t) =>
        lines.push(
          `• **${t.code}** — ${t.city}\n` +
          `  ${t.period} (${t.duration}) | ฿${fmt(t.price_per_seat)}/ที่นั่ง | ว่าง **${t.quota}** ที่นั่ง`
        )
      );
      return { text: lines.join("\n") };
    }

    /* ── Tour price ── */
    case "tour_price": {
      const { tours } = ctx;
      if (!tours.length) return { text: "ขณะนี้ยังไม่มีข้อมูลราคาทัวร์ในระบบครับ" };
      // Try keyword match (city, country, code)
      const matched = tours.filter(
        (t) =>
          low.includes(t.city.toLowerCase()) ||
          low.includes(t.country.toLowerCase()) ||
          low.includes(t.code.toLowerCase())
      );
      if (matched.length) {
        const lines: string[] = [`**ราคาทัวร์ที่ค้นพบ**${ts}\n`];
        matched.forEach((t) =>
          lines.push(
            `• **${t.code}** — ${t.city}, ${t.country}\n` +
            `  ฿${fmt(t.price_per_seat)} ต่อที่นั่ง | ที่นั่งว่าง ${t.quota}/${t.total_seats}`
          )
        );
        return { text: lines.join("\n") };
      }
      // Fallback: all prices sorted
      const sorted = [...tours].sort((a, b) => a.price_per_seat - b.price_per_seat);
      const lines: string[] = [`**ราคาทัวร์ทั้งหมด** (จากถูก→แพง)${ts}\n`];
      sorted.slice(0, 12).forEach((t) =>
        lines.push(`• ${t.code} ${t.city} — ฿${fmt(t.price_per_seat)}/ที่นั่ง`)
      );
      if (sorted.length > 12) lines.push(`...และอีก ${sorted.length - 12} โปรแกรม`);
      return { text: lines.join("\n") };
    }

    /* ── Quota / seats ── */
    case "tour_quota": {
      const { tours } = ctx;
      if (!tours.length) return { text: "ขณะนี้ยังไม่มีข้อมูลที่นั่งในระบบครับ" };
      const available = tours.filter((t) => t.quota > 0);
      const full = tours.filter((t) => t.quota === 0);
      const lines: string[] = [`**สถานะที่นั่งทัวร์**${ts}\n`];
      if (available.length) {
        lines.push(`✅ **มีที่นั่งว่าง (${available.length} โปรแกรม)**`);
        available.forEach((t) =>
          lines.push(`• ${t.code} ${t.city} — ว่าง **${t.quota}** จาก ${t.total_seats} ที่นั่ง`)
        );
      }
      if (full.length) {
        lines.push(`\n❌ **เต็มแล้ว (${full.length} โปรแกรม)**`);
        full.forEach((t) => lines.push(`• ${t.code} ${t.city}`));
      }
      return { text: lines.join("\n") };
    }

    /* ── Cars ── */
    case "car_list": {
      const { cars } = ctx;
      if (!cars.length) return { text: "ขณะนี้ยังไม่มีข้อมูลรถเช่าในระบบครับ" };
      const lines: string[] = [`**รถเช่าทั้งหมด ${cars.length} คัน**${ts}\n`];
      cars.forEach((c) =>
        lines.push(
          `• **${c.name}** (${c.type})\n` +
          `  ${c.total_seats} ที่นั่ง | เบาะ${c.seat_material} | ฿${fmt(c.rate_per_day)}/วัน` +
          (c.note ? ` | ${c.note}` : "")
        )
      );
      return { text: lines.join("\n") };
    }

    /* ── Flights ── */
    case "flight_list": {
      const { flights } = ctx;
      if (!flights.length) return { text: "ขณะนี้ยังไม่มีข้อมูลสายการบินในระบบครับ" };
      const lines: string[] = [`**สายการบินในระบบ ${flights.length} รายการ**${ts}\n`];
      flights.forEach((f) =>
        lines.push(`• **${f.airline}** — ${f.route}` + (f.note ? ` (${f.note})` : ""))
      );
      return { text: lines.join("\n") };
    }

    /* ── Hotels ── */
    case "hotel_list": {
      const { hotels } = ctx;
      if (!hotels.length) return { text: "ขณะนี้ยังไม่มีข้อมูลโรงแรมในระบบครับ" };
      const lines: string[] = [`**โรงแรมในระบบ ${hotels.length} แห่ง**${ts}\n`];
      hotels.forEach((h) =>
        lines.push(`• **${h.name}** — ${h.city}, ${h.country}` + (h.note ? ` | ${h.note}` : ""))
      );
      return { text: lines.join("\n") };
    }

    /* ── Visas ── */
    case "visa_list": {
      const { visas } = ctx;
      if (!visas.length) return { text: "ขณะนี้ยังไม่มีข้อมูลวีซ่าในระบบครับ" };
      const lines: string[] = [`**วีซ่าที่รองรับ ${visas.length} รายการ**${ts}\n`];
      visas.forEach((v) =>
        lines.push(`• **${v.visa_type}** — ${v.country}` + (v.note ? ` | ${v.note}` : ""))
      );
      return { text: lines.join("\n") };
    }

    /* ── Insurance ── */
    case "insurance_list": {
      const { insurances } = ctx;
      if (!insurances.length) return { text: "ขณะนี้ยังไม่มีข้อมูลประกันการเดินทางในระบบครับ" };
      const lines: string[] = [`**แผนประกันการเดินทาง ${insurances.length} แผน**${ts}\n`];
      insurances.forEach((i) =>
        lines.push(
          `• **${i.plan_name}** — ฿${fmt(i.price)}\n` +
          `  ความคุ้มครอง: ${i.coverage}` + (i.note ? ` | ${i.note}` : "")
        )
      );
      return { text: lines.join("\n") };
    }

    /* ── Customer count (gated) ── */
    case "customer_count": {
      if (!ctx.customers) {
        return { text: "ไม่สามารถเข้าถึงข้อมูลลูกค้าได้ครับ กรุณาเข้าสู่ระบบ CRM ก่อน" };
      }
      const total = ctx.customers.length;
      const tiers = { New: 0, Regular: 0, VIP: 0 };
      ctx.customers.forEach((c) => { tiers[c.customer_tier]++; });
      return {
        text:
          `**จำนวนลูกค้าในระบบ**${ts}\n\n` +
          `ทั้งหมด **${fmt(total)}** ราย\n` +
          `• 🆕 New: ${tiers.New} ราย\n` +
          `• 🔄 Regular: ${tiers.Regular} ราย\n` +
          `• 👑 VIP: ${tiers.VIP} ราย\n\n` +
          `ต้องการดูรายชื่อและเบอร์ติดต่อหรือไม่?\n*(ข้อมูล sensitive — พิมพ์ "ใช่" เพื่อแสดง)*`,
        requiresSensitiveApproval: true,
        pendingData: ctx.customers,
      };
    }

    /* ── Customer detail (explicitly asked) ── */
    case "customer_detail": {
      if (!ctx.customers) {
        return { text: "ไม่สามารถเข้าถึงข้อมูลลูกค้าได้ครับ กรุณาเข้าสู่ระบบ CRM ก่อน" };
      }
      return {
        text:
          "⚠️ ข้อมูลนี้ประกอบด้วยชื่อและเบอร์โทรของลูกค้า\n\n" +
          "ยืนยันว่าต้องการแสดงข้อมูล sensitive หรือไม่?\n*(พิมพ์ 'ใช่' เพื่อแสดง)*",
        requiresSensitiveApproval: true,
        pendingData: ctx.customers,
      };
    }

    /* ── Lead / Pipeline stats ── */
    case "lead_stats": {
      if (!ctx.leads) {
        return { text: "ไม่สามารถเข้าถึงข้อมูล Pipeline ได้ครับ กรุณาเข้าสู่ระบบ CRM ก่อน" };
      }
      const total = ctx.leads.length;
      const won = ctx.leads.filter((l) => l.status === "Closed Won");
      const lost = ctx.leads.filter((l) => l.status === "Closed Lost");
      const active = ctx.leads.filter((l) => !["Closed Won", "Closed Lost"].includes(l.status));
      const wonValue = won.reduce((s, l) => s + l.quoted_price, 0);
      const activeValue = active.reduce((s, l) => s + l.quoted_price, 0);
      return {
        text:
          `**สรุป Sales Pipeline**${ts}\n\n` +
          `ทั้งหมด **${fmt(total)}** deals\n` +
          `• ✅ Closed Won: ${won.length} deals — ฿${fmt(wonValue)}\n` +
          `• ❌ Closed Lost: ${lost.length} deals\n` +
          `• 🔄 Active: ${active.length} deals — ฿${fmt(activeValue)} (ในกระบวนการ)`,
      };
    }

    /* ── Unknown ── */
    default:
      return {
        text:
          "ขออภัยครับ ผมไม่เข้าใจคำถามนี้ 🙏\n\n" +
          "ลองถามเกี่ยวกับ:\n" +
          "• **ทัวร์** เช่น \"มีทัวร์ต่างประเทศอะไรบ้าง\"\n" +
          "• **ที่นั่ง** เช่น \"ทัวร์ไหนมีที่นั่งว่าง\"\n" +
          "• **ราคา** เช่น \"ราคาทัวร์ญี่ปุ่น\"\n" +
          "• **รถเช่า**, **ประกัน**, **วีซ่า**, **โรงแรม**, **ตั๋ว**\n" +
          "• **ลูกค้า** เช่น \"มีลูกค้ากี่คน\"",
      };
  }
}

/** Resolve pending sensitive approval — called when user types "ใช่" / "yes" */
export function resolveCustomerDetail(customers: Customer[]): string {
  if (!customers.length) return "ไม่มีข้อมูลลูกค้าในระบบครับ";
  const ts = tsLabel();
  const lines: string[] = [`**รายชื่อลูกค้าทั้งหมด ${customers.length} ราย**${ts}\n`];
  customers.slice(0, 20).forEach((c, i) =>
    lines.push(
      `${i + 1}. **${c.full_name}** (${c.customer_tier})\n` +
      `   📞 ${c.phone || "–"}  |  ${c.company || "–"}  |  ${c.source}`
    )
  );
  if (customers.length > 20) lines.push(`\n...และอีก ${customers.length - 20} ราย (ดูเพิ่มเติมในหน้า Customers)`);
  return lines.join("\n");
}
