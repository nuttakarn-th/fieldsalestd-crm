/**
 * standyEngine.ts
 * Rule-based intent detection + response generation for Standy Assistant.
 * Respects BotSettings from webSettingsStore:
 *   - tone: concise | friendly | detailed
 *   - allowStockQuery, allowMyCustomers, allowOtherCustomers, allowGeneral
 *   - smartSuggest: return follow-up card suggestions
 *   - tableResponse: compact format for large lists
 */

import type { TourItem, CarItem, InsuranceItem, FlightItem, HotelItem, VisaItem } from "@/store/serviceStore";
import type { Customer, Lead } from "@/store/crmStore";
import type { BotSettings } from "@/store/webSettingsStore";

// ── Context passed in from the widget ──────────────────────────────────────
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
  userRole?: string; // "Admin" | "Manager" | "Sales" etc.
}

// ── Response shape ─────────────────────────────────────────────────────────
export interface StandyResponse {
  text: string;
  requiresSensitiveApproval?: boolean;
  pendingData?: Customer[];
  /** Follow-up suggestion chips (shown when smartSuggest=true) */
  smartCards?: string[];
}

// ── Intents ────────────────────────────────────────────────────────────────
type Intent =
  | "greeting" | "help"
  | "tour_list" | "tour_price" | "tour_quota"
  | "tour_international" | "tour_domestic"
  | "car_list" | "flight_list" | "hotel_list"
  | "visa_list" | "insurance_list"
  | "customer_count" | "customer_detail"
  | "lead_stats" | "unknown";

// ── Intent detection ───────────────────────────────────────────────────────
export function detectIntent(text: string): Intent {
  const t = text.toLowerCase();

  if (/สวัสดี|หวัดดี|hello|^hi\b|ดีครับ|ดีค่ะ|ดีจ้า/.test(t)) return "greeting";
  if (/ทำอะไร|ช่วยอะไร|ถามอะไร|help|ความสามารถ|มีอะไรบ้าง/.test(t)) return "help";
  if (/ที่นั่ง|ว่างเหลือ|โควต้า|quota|เหลือกี่|ที่นั่งว่าง|จำนวนที่นั่ง|seat/.test(t)) return "tour_quota";
  if (/ราคา|ค่าใช้จ่าย|เท่าไร|เท่าไหร่|ค่าทัวร์|price|บาท/.test(t) && /ทัวร์|tour/.test(t)) return "tour_price";
  if (/ต่างประเทศ|international|inter/.test(t) && /ทัวร์|tour/.test(t)) return "tour_international";
  if (/ภายในประเทศ|domestic|ในประเทศ/.test(t) && /ทัวร์|tour/.test(t)) return "tour_domestic";
  if (/ทัวร์|โปรแกรม|destination|tour/.test(t)) return "tour_list";
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

function tsLabel(): string {
  const now = new Date();
  return ` *(${now.toLocaleDateString("th-TH", { day: "numeric", month: "short" })} ${now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น.)*`;
}

function isConcise(ctx: StandyContext): boolean {
  return ctx.settings?.tone === "concise";
}

function isDetailed(ctx: StandyContext): boolean {
  return ctx.settings?.tone === "detailed";
}

function getSmartCards(intent: Intent, ctx: StandyContext): string[] {
  if (!ctx.settings?.smartSuggest) return [];
  switch (intent) {
    case "greeting":
    case "help":
      return ["ทัวร์ต่างประเทศ", "ที่นั่งว่าง", "ราคาทัวร์", "รถเช่า"];
    case "tour_list":
      return ["ที่นั่งว่าง", "ราคาทัวร์", "ทัวร์ต่างประเทศ", "ทัวร์ในประเทศ"];
    case "tour_international":
      return ["ที่นั่งว่าง", "ราคาทัวร์ต่างประเทศ", "วีซ่า", "ประกัน"];
    case "tour_domestic":
      return ["ที่นั่งว่าง", "รถเช่า", "โรงแรม"];
    case "tour_quota":
      return ["ราคาทัวร์", "รถเช่า", "ประกัน"];
    case "tour_price":
      return ["ที่นั่งว่าง", "ประกัน", "วีซ่า", "รถเช่า"];
    case "car_list":
      return ["ทัวร์", "ประกัน", "ตั๋วเครื่องบิน"];
    case "flight_list":
      return ["ทัวร์ต่างประเทศ", "โรงแรม", "วีซ่า"];
    case "hotel_list":
      return ["ทัวร์", "วีซ่า", "ประกัน"];
    case "visa_list":
      return ["ทัวร์ต่างประเทศ", "ประกัน", "ตั๋วเครื่องบิน"];
    case "insurance_list":
      return ["ทัวร์", "วีซ่า", "รถเช่า"];
    case "customer_count":
      return ["ลูกค้า VIP", "Pipeline", "ยอดขาย"];
    case "lead_stats":
      return ["จำนวนลูกค้า", "ทัวร์ยอดนิยม"];
    default:
      return ["ทัวร์", "รถเช่า", "ประกัน", "วีซ่า"];
  }
}

function blocked(topic: string): StandyResponse {
  return { text: `ขออภัยครับ ฟีเจอร์ **${topic}** ถูกปิดใช้งานอยู่ในขณะนี้` };
}

// ── Main response function ─────────────────────────────────────────────────
export function standyRespond(text: string, ctx: StandyContext): StandyResponse {
  const intent = detectIntent(text);
  const sc = getSmartCards(intent, ctx);
  const concise = isConcise(ctx);
  const detailed = isDetailed(ctx);
  const low = text.toLowerCase();

  // Stock query permission check
  const stockIntents: Intent[] = [
    "tour_list","tour_price","tour_quota","tour_international","tour_domestic",
    "car_list","flight_list","hotel_list","visa_list","insurance_list",
  ];
  if (stockIntents.includes(intent) && ctx.settings && !ctx.settings.allowStockQuery) {
    return blocked("ถามข้อมูล Stock");
  }

  const isManager = ctx.userRole === "Admin" || ctx.userRole === "Manager";

  switch (intent) {

    /* ── Greeting ── */
    case "greeting":
      return {
        text: concise
          ? "สวัสดีครับ! ถามเรื่อง ทัวร์, ราคา, ที่นั่งว่าง, รถเช่า, ประกัน, วีซ่า หรือลูกค้าได้เลย"
          : "สวัสดีครับ! 🙂 ผม **Standy** ผู้ช่วยของ Standard Tour\n\nถามได้เรื่อง ทัวร์, ที่นั่งว่าง, ราคา, รถเช่า, ประกัน, วีซ่า, โรงแรม, ตั๋ว และข้อมูลลูกค้า\n\nลองถามได้เลยครับ!",
        smartCards: sc,
      };

    /* ── Help ── */
    case "help":
      return {
        text: concise
          ? "ถามได้เรื่อง: ทัวร์ · ราคา · ที่นั่ง · รถเช่า · ตั๋ว · โรงแรม · วีซ่า · ประกัน · ลูกค้า · Pipeline"
          : "ผม **Standy** ตอบได้เรื่อง:\n\n**📋 บริการ**\n• ทัวร์ต่างประเทศ/ในประเทศ, ที่นั่งว่าง, ราคา\n• รถเช่า, ตั๋วเครื่องบิน, โรงแรม, วีซ่า, ประกัน\n\n**📊 ข้อมูลระบบ**\n• จำนวนลูกค้า, Pipeline ยอดขาย\n\nถามได้เลยครับ!",
        smartCards: sc,
      };

    /* ── Tour list ── */
    case "tour_list": {
      const { tours } = ctx;
      if (!tours.length) return { text: "ยังไม่มีโปรแกรมทัวร์ในระบบครับ", smartCards: sc };
      const intl = tours.filter(t => t.category === "International Tour");
      const dom  = tours.filter(t => t.category === "Domestic");
      const limit = concise ? 5 : (detailed ? 999 : 8);
      const ts = concise ? "" : tsLabel();

      if (concise) {
        const lines = [`**ทัวร์ ${tours.length} โปรแกรม** (แสดงท็อป ${Math.min(limit, tours.length)})\n`];
        tours.slice(0, limit).forEach(t =>
          lines.push(`• ${t.code} ${t.city} — ฿${fmt(t.price_per_seat)} | ว่าง ${t.quota} ที่`)
        );
        if (tours.length > limit) lines.push(`…อีก ${tours.length - limit} โปรแกรม (ถามเพิ่มเติมได้)`);
        return { text: lines.join("\n"), smartCards: sc };
      }

      const lines: string[] = [`**โปรแกรมทัวร์ ${tours.length} โปรแกรม**${ts}\n`];
      if (intl.length) {
        lines.push(`🌏 **International (${intl.length})**`);
        intl.slice(0, limit).forEach(t =>
          lines.push(`• ${t.code} — ${t.city}, ${t.country} | ${t.period} | ฿${fmt(t.price_per_seat)}/ที่นั่ง | ว่าง ${t.quota}`)
        );
        if (intl.length > limit) lines.push(`  …อีก ${intl.length - limit} โปรแกรม`);
      }
      if (dom.length) {
        lines.push(`\n🇹🇭 **Domestic (${dom.length})**`);
        dom.slice(0, limit).forEach(t =>
          lines.push(`• ${t.code} — ${t.city} | ${t.period} | ฿${fmt(t.price_per_seat)}/ที่นั่ง | ว่าง ${t.quota}`)
        );
        if (dom.length > limit) lines.push(`  …อีก ${dom.length - limit} โปรแกรม`);
      }
      return { text: lines.join("\n"), smartCards: sc };
    }

    /* ── International tours ── */
    case "tour_international": {
      const intl = ctx.tours.filter(t => t.category === "International Tour");
      if (!intl.length) return { text: "ยังไม่มีทัวร์ต่างประเทศในระบบครับ", smartCards: sc };
      const limit = concise ? 5 : (detailed ? 999 : 10);
      const ts = concise ? "" : tsLabel();

      if (concise) {
        const lines = [`**ทัวร์ต่างประเทศ ${intl.length} โปรแกรม**\n`];
        intl.slice(0, limit).forEach(t =>
          lines.push(`• ${t.code} ${t.city}, ${t.country} — ฿${fmt(t.price_per_seat)} | ว่าง ${t.quota} ที่`)
        );
        if (intl.length > limit) lines.push(`…อีก ${intl.length - limit} โปรแกรม`);
        return { text: lines.join("\n"), smartCards: sc };
      }

      const lines = [`**ทัวร์ต่างประเทศ ${intl.length} โปรแกรม**${ts}\n`];
      intl.slice(0, limit).forEach(t =>
        lines.push(
          `• **${t.code}** — ${t.city}, ${t.country}\n` +
          `  ${t.period} (${t.duration}) | ฿${fmt(t.price_per_seat)}/ที่นั่ง | ว่าง **${t.quota}** ที่นั่ง`
        )
      );
      if (intl.length > limit) lines.push(`…อีก ${intl.length - limit} โปรแกรม`);
      return { text: lines.join("\n"), smartCards: sc };
    }

    /* ── Domestic tours ── */
    case "tour_domestic": {
      const dom = ctx.tours.filter(t => t.category === "Domestic");
      if (!dom.length) return { text: "ยังไม่มีทัวร์ในประเทศในระบบครับ", smartCards: sc };
      const limit = concise ? 5 : (detailed ? 999 : 10);
      const ts = concise ? "" : tsLabel();

      if (concise) {
        const lines = [`**ทัวร์ในประเทศ ${dom.length} โปรแกรม**\n`];
        dom.slice(0, limit).forEach(t =>
          lines.push(`• ${t.code} ${t.city} — ฿${fmt(t.price_per_seat)} | ว่าง ${t.quota} ที่`)
        );
        if (dom.length > limit) lines.push(`…อีก ${dom.length - limit} โปรแกรม`);
        return { text: lines.join("\n"), smartCards: sc };
      }

      const lines = [`**ทัวร์ในประเทศ ${dom.length} โปรแกรม**${ts}\n`];
      dom.slice(0, limit).forEach(t =>
        lines.push(
          `• **${t.code}** — ${t.city}\n` +
          `  ${t.period} (${t.duration}) | ฿${fmt(t.price_per_seat)}/ที่นั่ง | ว่าง **${t.quota}** ที่นั่ง`
        )
      );
      if (dom.length > limit) lines.push(`…อีก ${dom.length - limit} โปรแกรม`);
      return { text: lines.join("\n"), smartCards: sc };
    }

    /* ── Tour price ── */
    case "tour_price": {
      const { tours } = ctx;
      if (!tours.length) return { text: "ยังไม่มีข้อมูลราคาทัวร์ในระบบครับ", smartCards: sc };
      const matched = tours.filter(t =>
        low.includes(t.city.toLowerCase()) ||
        low.includes(t.country.toLowerCase()) ||
        low.includes(t.code.toLowerCase())
      );
      const list = matched.length ? matched : [...tours].sort((a, b) => a.price_per_seat - b.price_per_seat);
      const limit = concise ? 6 : (detailed ? 999 : 12);
      const label = matched.length ? "ราคาทัวร์ที่ค้นพบ" : "ราคาทัวร์ (ถูก→แพง)";
      const ts = concise ? "" : tsLabel();

      const lines = [`**${label}**${ts}\n`];
      list.slice(0, limit).forEach(t =>
        lines.push(concise
          ? `• ${t.code} ${t.city} — ฿${fmt(t.price_per_seat)} | ว่าง ${t.quota}`
          : `• **${t.code}** ${t.city}, ${t.country} — ฿${fmt(t.price_per_seat)}/ที่นั่ง | ว่าง ${t.quota}/${t.total_seats}`
        )
      );
      if (list.length > limit) lines.push(`…อีก ${list.length - limit} รายการ`);
      return { text: lines.join("\n"), smartCards: sc };
    }

    /* ── Tour quota ── */
    case "tour_quota": {
      const { tours } = ctx;
      if (!tours.length) return { text: "ยังไม่มีข้อมูลที่นั่งในระบบครับ", smartCards: sc };
      const available = tours.filter(t => t.quota > 0);
      const full = tours.filter(t => t.quota === 0);
      const ts = concise ? "" : tsLabel();
      const limit = concise ? 6 : 999;

      if (concise) {
        const lines = [`**ที่นั่งว่าง ${available.length}/${tours.length} โปรแกรม**\n`];
        available.slice(0, limit).forEach(t =>
          lines.push(`✅ ${t.code} ${t.city} — ว่าง **${t.quota}** ที่`)
        );
        if (available.length > limit) lines.push(`…อีก ${available.length - limit} โปรแกรม`);
        if (full.length) lines.push(`\n❌ เต็มแล้ว: ${full.map(t => t.code).slice(0, 5).join(", ")}${full.length > 5 ? "…" : ""}`);
        return { text: lines.join("\n"), smartCards: sc };
      }

      const lines = [`**สถานะที่นั่งทัวร์**${ts}\n`];
      if (available.length) {
        lines.push(`✅ **มีที่นั่งว่าง (${available.length} โปรแกรม)**`);
        available.forEach(t =>
          lines.push(`• ${t.code} ${t.city} — ว่าง **${t.quota}** จาก ${t.total_seats} ที่นั่ง`)
        );
      }
      if (full.length) {
        lines.push(`\n❌ **เต็มแล้ว (${full.length} โปรแกรม)**`);
        full.forEach(t => lines.push(`• ${t.code} ${t.city}`));
      }
      return { text: lines.join("\n"), smartCards: sc };
    }

    /* ── Cars ── */
    case "car_list": {
      const { cars } = ctx;
      if (!cars.length) return { text: "ยังไม่มีข้อมูลรถเช่าในระบบครับ", smartCards: sc };
      const ts = concise ? "" : tsLabel();
      const lines = [`**รถเช่า ${cars.length} คัน**${ts}\n`];
      cars.forEach(c =>
        lines.push(concise
          ? `• ${c.name} — ${c.total_seats} ที่นั่ง | ฿${fmt(c.rate_per_day)}/วัน`
          : `• **${c.name}** (${c.type}) — ${c.total_seats} ที่นั่ง | เบาะ${c.seat_material} | ฿${fmt(c.rate_per_day)}/วัน` + (c.note ? ` | ${c.note}` : "")
        )
      );
      return { text: lines.join("\n"), smartCards: sc };
    }

    /* ── Flights ── */
    case "flight_list": {
      const { flights } = ctx;
      if (!flights.length) return { text: "ยังไม่มีข้อมูลสายการบินในระบบครับ", smartCards: sc };
      const ts = concise ? "" : tsLabel();
      const lines = [`**สายการบิน ${flights.length} รายการ**${ts}\n`];
      flights.forEach(f =>
        lines.push(`• **${f.airline}** — ${f.route}` + (f.note && !concise ? ` (${f.note})` : ""))
      );
      return { text: lines.join("\n"), smartCards: sc };
    }

    /* ── Hotels ── */
    case "hotel_list": {
      const { hotels } = ctx;
      if (!hotels.length) return { text: "ยังไม่มีข้อมูลโรงแรมในระบบครับ", smartCards: sc };
      const ts = concise ? "" : tsLabel();
      const lines = [`**โรงแรม ${hotels.length} แห่ง**${ts}\n`];
      hotels.forEach(h =>
        lines.push(`• **${h.name}** — ${h.city}, ${h.country}` + (h.note && !concise ? ` | ${h.note}` : ""))
      );
      return { text: lines.join("\n"), smartCards: sc };
    }

    /* ── Visas ── */
    case "visa_list": {
      const { visas } = ctx;
      if (!visas.length) return { text: "ยังไม่มีข้อมูลวีซ่าในระบบครับ", smartCards: sc };
      const ts = concise ? "" : tsLabel();
      const lines = [`**วีซ่า ${visas.length} รายการ**${ts}\n`];
      visas.forEach(v =>
        lines.push(`• **${v.visa_type}** — ${v.country}` + (v.note && !concise ? ` | ${v.note}` : ""))
      );
      return { text: lines.join("\n"), smartCards: sc };
    }

    /* ── Insurance ── */
    case "insurance_list": {
      const { insurances } = ctx;
      if (!insurances.length) return { text: "ยังไม่มีข้อมูลประกันในระบบครับ", smartCards: sc };
      const ts = concise ? "" : tsLabel();
      const lines = [`**ประกัน ${insurances.length} แผน**${ts}\n`];
      insurances.forEach(i =>
        lines.push(
          `• **${i.plan_name}** — ฿${fmt(i.price)}` +
          (!concise ? ` | คุ้มครอง: ${i.coverage}` + (i.note ? ` | ${i.note}` : "") : "")
        )
      );
      return { text: lines.join("\n"), smartCards: sc };
    }

    /* ── Customer count ── */
    case "customer_count": {
      if (!ctx.customers) return { text: "กรุณาเข้าสู่ระบบก่อนถามข้อมูลลูกค้าครับ" };
      if (ctx.settings && !ctx.settings.allowMyCustomers) return blocked("ข้อมูลลูกค้า");
      const total = ctx.customers.length;
      const tiers: Record<string, number> = {};
      ctx.customers.forEach(c => { tiers[c.customer_tier] = (tiers[c.customer_tier] || 0) + 1; });

      const summary = concise
        ? `**ลูกค้า ${fmt(total)} ราย** — VIP: ${tiers["VIP"] || 0} | Regular: ${tiers["Regular"] || 0} | New: ${tiers["New"] || 0}`
        : `**จำนวนลูกค้า**${tsLabel()}\n\nทั้งหมด **${fmt(total)}** ราย\n• 👑 VIP: ${tiers["VIP"] || 0} ราย\n• 🔄 Regular: ${tiers["Regular"] || 0} ราย\n• 🆕 New: ${tiers["New"] || 0} ราย`;

      return {
        text: summary + "\n\nต้องการดูรายชื่อหรือไม่? *(พิมพ์ 'ใช่' เพื่อแสดง)*",
        requiresSensitiveApproval: true,
        pendingData: ctx.customers,
        smartCards: sc,
      };
    }

    /* ── Customer detail ── */
    case "customer_detail": {
      if (!ctx.customers) return { text: "กรุณาเข้าสู่ระบบก่อนถามข้อมูลลูกค้าครับ" };
      if (ctx.settings && !ctx.settings.allowMyCustomers) return blocked("ข้อมูลลูกค้า");
      if (!isManager && ctx.settings && !ctx.settings.allowOtherCustomers) {
        return { text: "สิทธิ์ดูข้อมูลลูกค้าคนอื่นสำหรับ Manager/Admin เท่านั้นครับ" };
      }
      return {
        text: "⚠️ ข้อมูลนี้มีชื่อและเบอร์โทรของลูกค้า\nยืนยันแสดงหรือไม่? *(พิมพ์ 'ใช่' เพื่อแสดง)*",
        requiresSensitiveApproval: true,
        pendingData: ctx.customers,
        smartCards: sc,
      };
    }

    /* ── Lead / Pipeline ── */
    case "lead_stats": {
      if (!ctx.leads) return { text: "กรุณาเข้าสู่ระบบก่อนถามข้อมูล Pipeline ครับ" };
      const total = ctx.leads.length;
      const won    = ctx.leads.filter(l => l.status === "Closed Won");
      const lost   = ctx.leads.filter(l => l.status === "Closed Lost");
      const active = ctx.leads.filter(l => !["Closed Won","Closed Lost"].includes(l.status));
      const wonValue    = won.reduce((s, l) => s + l.quoted_price, 0);
      const activeValue = active.reduce((s, l) => s + l.quoted_price, 0);

      const text = concise
        ? `**Pipeline ${fmt(total)} deals** — Won: ${won.length} (฿${fmt(wonValue)}) | Active: ${active.length} (฿${fmt(activeValue)}) | Lost: ${lost.length}`
        : `**สรุป Sales Pipeline**${tsLabel()}\n\nทั้งหมด **${fmt(total)}** deals\n• ✅ Closed Won: ${won.length} deals — ฿${fmt(wonValue)}\n• ❌ Closed Lost: ${lost.length} deals\n• 🔄 Active: ${active.length} deals — ฿${fmt(activeValue)}`;

      return { text, smartCards: sc };
    }

    /* ── Unknown ── */
    default:
      return {
        text: concise
          ? "ไม่เข้าใจคำถามครับ — ลองถามเรื่อง ทัวร์, ราคา, ที่นั่ง, รถเช่า, ประกัน, วีซ่า หรือลูกค้า"
          : "ขออภัยครับ ผมไม่เข้าใจคำถามนี้ 🙏\n\nลองถามเกี่ยวกับ:\n• **ทัวร์** เช่น \"ทัวร์ต่างประเทศมีอะไรบ้าง\"\n• **ที่นั่ง** เช่น \"ทัวร์ไหนมีที่นั่งว่าง\"\n• **ราคา** เช่น \"ราคาทัวร์ญี่ปุ่น\"\n• **รถเช่า**, **ประกัน**, **วีซ่า**, **โรงแรม**\n• **ลูกค้า** เช่น \"มีลูกค้ากี่คน\"",
        smartCards: getSmartCards("unknown", ctx),
      };
  }
}

/** Resolve pending sensitive approval — called when user types "ใช่" */
export function resolveCustomerDetail(customers: Customer[], concise = false): string {
  if (!customers.length) return "ไม่มีข้อมูลลูกค้าในระบบครับ";
  const ts = concise ? "" : tsLabel();
  const limit = concise ? 10 : 20;
  const lines = [`**รายชื่อลูกค้า ${customers.length} ราย**${ts}\n`];
  customers.slice(0, limit).forEach((c, i) => {
    if (concise) {
      lines.push(`${i+1}. ${c.full_name} (${c.customer_tier}) — ${c.phone || "–"}`);
    } else {
      lines.push(
        `${i+1}. **${c.full_name}** (${c.customer_tier})\n` +
        `   📞 ${c.phone || "–"}  |  ${c.company || "–"}  |  ${c.source}`
      );
    }
  });
  if (customers.length > limit) lines.push(`\n…อีก ${customers.length - limit} ราย (ดูเพิ่มในหน้า Customers)`);
  return lines.join("\n");
}
