/**
 * MarketingOrgChart.tsx
 * Organization Chart ทีม Marketing — สายการรายงาน + ความรับผิดชอบ
 */
import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

function useDarkMode() {
  const [isDark, setIsDark] = useState(
    () => typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );
  useEffect(() => {
    const el = document.documentElement;
    const obs = new MutationObserver(() => setIsDark(el.classList.contains("dark")));
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return isDark;
}

type RoleKey = "mgr" | "exec" | "cm" | "gd" | "vdo";

interface RoleTheme {
  gradient: string;
  accent: string;
  accentDark: string;
  tagBg_l: string; tagBg_d: string;
  border_l: string; border_d: string;
}

const THEME: Record<RoleKey, RoleTheme> = {
  mgr: {
    gradient: "linear-gradient(135deg,#6d28d9,#8b5cf6)",
    accent: "#7c3aed", accentDark: "#c084fc",
    tagBg_l: "#f3e8ff", tagBg_d: "rgba(192,132,252,0.15)",
    border_l: "#e9d5ff", border_d: "rgba(192,132,252,0.4)",
  },
  exec: {
    gradient: "linear-gradient(135deg,#1d4ed8,#3b82f6)",
    accent: "#2563eb", accentDark: "#60a5fa",
    tagBg_l: "#eff6ff", tagBg_d: "rgba(96,165,250,0.15)",
    border_l: "#bfdbfe", border_d: "rgba(96,165,250,0.4)",
  },
  cm: {
    gradient: "linear-gradient(135deg,#15803d,#22c55e)",
    accent: "#16a34a", accentDark: "#4ade80",
    tagBg_l: "#f0fdf4", tagBg_d: "rgba(74,222,128,0.13)",
    border_l: "#bbf7d0", border_d: "rgba(74,222,128,0.4)",
  },
  gd: {
    gradient: "linear-gradient(135deg,#c2410c,#f97316)",
    accent: "#ea580c", accentDark: "#fb923c",
    tagBg_l: "#fff7ed", tagBg_d: "rgba(251,146,60,0.13)",
    border_l: "#fed7aa", border_d: "rgba(251,146,60,0.4)",
  },
  vdo: {
    gradient: "linear-gradient(135deg,#b91c1c,#ef4444)",
    accent: "#dc2626", accentDark: "#f87171",
    tagBg_l: "#fef2f2", tagBg_d: "rgba(248,113,113,0.13)",
    border_l: "#fecaca", border_d: "rgba(248,113,113,0.4)",
  },
};

interface RoleData {
  key: RoleKey;
  emoji: string;
  title: string;
  subtitle: string;
  badge: string;
  desc: string;
  tags: string[];
  reportsTo?: string;
  duties: string[];
  kpis: string[];
  extras?: { label: string; items: string[] }[];
}

const ROLES: Record<RoleKey, RoleData> = {
  mgr: {
    key: "mgr", emoji: "👑",
    title: "Marketing Manager", subtitle: "ผู้จัดการฝ่ายการตลาด", badge: "Head",
    desc: "กำหนดทิศทางการตลาดทั้งหมด ตั้ง KPI อนุมัติแผน Campaign งบ Paid Ads และ KOL ดูแลคุณภาพในภาพรวม",
    tags: ["กลยุทธ์ Marketing", "อนุมัติงบ", "KPI Management"],
    duties: [
      "วางแผนกลยุทธ์รายเดือน / รายไตรมาส",
      "อนุมัติ Campaign Concept, งบ Paid Ads, การลงนาม KOL ทุกราย",
      "Final Approve Hero Content และ Key Visual สำคัญ",
      "รับ Report จาก 3 ตำแหน่ง ภายในวันอังคารต้นเดือน",
    ],
    kpis: ["Revenue Growth", "Campaign ROI", "Team Productivity"],
  },
  exec: {
    key: "exec", emoji: "🎯",
    title: "Marketing Executive", subtitle: "มือขวาเชิงรุก", badge: "Paid",
    desc: "บริหาร Paid Ads ทุก Platform วางแผน Campaign คิด Concept และดูแล KOL / Influencer",
    tags: ["Digital Ads", "Campaign", "KOL"],
    reportsTo: "Marketing Manager",
    duties: [
      "บริหาร Media Buying (Meta / TikTok / LINE / Google)",
      "คิดและนำเสนอ Campaign Concept ต่อ Manager",
      "ส่ง Theme & Concept ให้ CM + VDO พร้อมกันทุกต้นเดือน",
      "ติดตามและเจรจา KOL เบื้องต้น (Manager ลงนาม)",
      "ปรับ Budget / ปิด Ad Set แบบ Real-time",
    ],
    kpis: ["ROAS", "Cost per Lead", "Campaign Success Rate"],
  },
  cm: {
    key: "cm", emoji: "✍️",
    title: "Content Marketing", subtitle: "Hub กลาง Creative", badge: "Hub",
    desc: "Gatekeeper ชิ้นงานทั้งหมด วาง Calendar กระจาย Brief ให้ทีม ตรวจ QC และตั้งโพสต์ภาพนิ่ง",
    tags: ["Content Calendar", "QC Gate", "Copywriting"],
    reportsTo: "Marketing Manager",
    duties: [
      "รับ Theme จาก Exec → วาง Slot VDO + Static Post ใน Calendar",
      "เขียน Caption / Copy ทุกชิ้น ทุก Platform",
      "ส่ง Brief ให้ Graphic Designer ตาม Calendar",
      "ตรวจ Concept ที่ VDO Creator กรอกมาว่าตรงทิศทางมั้ย",
      "QC ทุกชิ้นก่อน Publish — ตั้งโพสต์ Static เอง",
    ],
    kpis: ["Accuracy 100%", "First-pass QC", "Engagement Growth"],
  },
  gd: {
    key: "gd", emoji: "🎨",
    title: "Graphic Designer", subtitle: "ออกแบบสื่อกราฟิก", badge: "Design",
    desc: "ออกแบบสื่อภาพนิ่งทุกชิ้น (Online & Offline) ส่ง Final File ให้ CM — CM เป็นผู้ตั้งโพสต์เอง",
    tags: ["Static Graphic", "Brand CI", "Online + Offline"],
    reportsTo: "Content Marketing",
    duties: [
      "ออกแบบ Banner, Campaign Ads, LINE OA, Thumbnail",
      "สื่อ Offline: ใบโปรแกรมทัวร์, Roll-up, Brochure",
      "Self QC ราคา / วันที่ / โลโก้ก่อนส่งทุกครั้ง",
      "ส่ง Final File ให้ CM — ไม่ตั้งโพสต์เอง",
    ],
    kpis: ["Turnaround Time", "Accuracy", "Brand Consistency"],
  },
  vdo: {
    key: "vdo", emoji: "🎬",
    title: "VDO Content Creator", subtitle: "ผลิตสื่อวิดีโอ", badge: "Video",
    desc: "ผลิต VDO ครบวงจร คิด Story เองจาก Theme ที่ Exec ส่ง กรอก Concept ลง Calendar ของ CM ถ่าย ตัดต่อ Upload เอง",
    tags: ["Short-form VDO", "Story Ideation"],
    reportsTo: "Content Marketing",
    duties: [
      "รับ Theme จาก Exec → คิด Story / ไอเดียคลิปเอง",
      "กรอก Concept ลงใน Slot Calendar ที่ CM จัดไว้",
      "เขียน Script + วาง Storyboard → ส่ง CM ตรวจ",
      "ออกกองถ่าย → ตัดต่อ + Subtitle + Thumbnail",
      "Upload ทุก Platform (TikTok / FB / IG / YouTube) เอง",
      "ติดตาม View / Watch Time และตอบ Comment",
    ],
    kpis: ["Views/เดือน", "Completion Rate", "Follower Growth"],
    extras: [{
      label: "Video Pillars",
      items: ["🚌 Service Review (รีวิวรถ VIP / โรงแรม)", "🌏 Travel Vlog / Experience", "📚 Edutainment (Visa Tips / Travel Tips)"],
    }],
  },
};

// ── Card ───────────────────────────────────────────────────────────────────────
function RoleCard({ rk, isDark, style }: { rk: RoleKey; isDark: boolean; style?: React.CSSProperties }) {
  const [open, setOpen] = useState(false);
  const d = ROLES[rk];
  const t = THEME[rk];
  const accent   = isDark ? t.accentDark : t.accent;
  const tagBg    = isDark ? t.tagBg_d    : t.tagBg_l;
  const borderC  = isDark ? t.border_d   : t.border_l;
  const cardBg   = isDark ? "hsl(var(--card))" : "#ffffff";
  const textMain = isDark ? "rgba(255,255,255,0.9)"  : "#1a1a1a";
  const textSub  = isDark ? "rgba(255,255,255,0.5)"  : "#6b7280";
  const divider  = isDark ? "rgba(255,255,255,0.08)" : "#f3f4f6";

  return (
    <div
      onClick={() => setOpen(o => !o)}
      style={{
        ...style,
        background: cardBg,
        border: `1px solid ${borderC}`,
        borderRadius: 14,
        overflow: "hidden",
        cursor: "pointer",
        transition: "box-shadow .18s, transform .18s",
        boxShadow: isDark ? "0 2px 10px rgba(0,0,0,.35)" : "0 2px 8px rgba(0,0,0,.08)",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = isDark ? "0 6px 20px rgba(0,0,0,.45)" : "0 6px 18px rgba(0,0,0,.13)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ""; (e.currentTarget as HTMLDivElement).style.boxShadow = isDark ? "0 2px 10px rgba(0,0,0,.35)" : "0 2px 8px rgba(0,0,0,.08)"; }}
    >
      {/* Accent strip */}
      <div style={{ height: 4, background: t.gradient }} />

      {/* Header */}
      <div style={{ padding: "12px 14px 10px", display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: tagBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
          {d.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: textMain, lineHeight: 1.3 }}>{d.title}</span>
            <span style={{ fontSize: 9, fontWeight: 800, padding: "1px 7px", borderRadius: 20, background: tagBg, color: accent, lineHeight: 1.6, whiteSpace: "nowrap" }}>{d.badge}</span>
          </div>
          <div style={{ fontSize: 10, color: accent, marginTop: 1, fontWeight: 600 }}>{d.subtitle}</div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "0 14px 12px" }}>
        <p style={{ fontSize: 11, color: textSub, lineHeight: 1.6, marginBottom: 8 }}>{d.desc}</p>

        {/* Tags */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: d.reportsTo ? 7 : 6 }}>
          {d.tags.map(tag => (
            <span key={tag} style={{ fontSize: 9.5, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: tagBg, color: accent }}>
              {tag}
            </span>
          ))}
        </div>

        {/* Reports to */}
        {d.reportsTo && (
          <div style={{ fontSize: 10, color: textSub, marginBottom: 6 }}>
            รายงานต่อ <span style={{ fontWeight: 700 }}>→ {d.reportsTo}</span>
          </div>
        )}

        {/* Expand toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 9.5, color: accent, opacity: 0.7, justifyContent: "flex-end" }}>
          {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          <span>{open ? "ย่อ" : "ดูรายละเอียด"}</span>
        </div>

        {/* Expanded section */}
        {open && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${divider}` }}>
            {/* Duties */}
            <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".5px", color: textSub, marginBottom: 6 }}>หน้าที่หลัก</div>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 5 }}>
              {d.duties.map((item, i) => (
                <li key={i} style={{ display: "flex", gap: 6, fontSize: 10.5, color: textSub, lineHeight: 1.55 }}>
                  <span style={{ color: accent, opacity: 0.5, flexShrink: 0, marginTop: 1 }}>•</span>
                  {item}
                </li>
              ))}
            </ul>
            {/* Extras */}
            {d.extras?.map(ext => (
              <div key={ext.label} style={{ marginTop: 10 }}>
                <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".5px", color: textSub, marginBottom: 5 }}>{ext.label}</div>
                {ext.items.map((it, i) => (
                  <div key={i} style={{ fontSize: 10.5, color: textSub, lineHeight: 1.7 }}>{it}</div>
                ))}
              </div>
            ))}
            {/* KPIs */}
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".5px", color: textSub, marginBottom: 5 }}>KPI</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {d.kpis.map(k => (
                  <span key={k} style={{ fontSize: 9.5, padding: "2px 8px", borderRadius: 20, background: tagBg, color: accent, fontWeight: 600 }}>{k}</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Connector SVG ──────────────────────────────────────────────────────────────
function Connector({ isDark, d }: { isDark: boolean; d: string }) {
  const stroke = isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.18)";
  return (
    <svg viewBox="0 0 720 44" width="720" height="44" style={{ display: "block" }}>
      <path d={d} fill="none" stroke={stroke} strokeWidth="1.5" />
    </svg>
  );
}

// ── Collaboration section ──────────────────────────────────────────────────────
function CollabSection({ isDark }: { isDark: boolean }) {
  const cardBg  = isDark ? "hsl(var(--card))" : "#ffffff";
  const hdrBg   = isDark ? "rgba(255,255,255,0.05)" : "#f8f9fa";
  const border  = isDark ? "rgba(255,255,255,0.1)" : "#e5e7eb";
  const textMain = isDark ? "rgba(255,255,255,0.85)" : "#1a1a1a";
  const textSub  = isDark ? "rgba(255,255,255,0.5)"  : "#6b7280";

  const items = [
    { rk: "mgr"  as RoleKey, title: "Manager → ทีม",              body: "กำหนด KPI / อนุมัติแผน Campaign + งบ + KOL / Final Approve งานสำคัญ / รับ Report ต้นเดือน" },
    { rk: "exec" as RoleKey, title: "Exec → CM + VDO (พร้อมกัน)", body: "ส่ง Theme & Concept ให้ทั้ง 2 ตำแหน่งพร้อมกัน / ขอ Ad Creative ผ่าน CM / Boost โพสต์ที่ดี" },
    { rk: "cm"   as RoleKey, title: "CM → GD / VDO",              body: "ส่ง Brief + Deadline / จัด Slot Calendar / QC ทุกชิ้น / ตรวจ Concept VDO / ตั้งโพสต์ Static" },
    { rk: "vdo"  as RoleKey, title: "VDO → CM Calendar",          body: "กรอก Story Concept / หัวข้อคลิปใน Slot ที่ CM จัดไว้ → CM ตรวจทิศทาง → เริ่ม Pre-Production" },
  ];

  return (
    <div style={{ width: 720, marginTop: 28, borderRadius: 14, overflow: "hidden", border: `1px solid ${border}`, background: cardBg }}>
      <div style={{ background: hdrBg, padding: "10px 16px", borderBottom: `1px solid ${border}` }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: textMain }}>🔗 สายประสานงานหลัก</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: border }}>
        {items.map(item => {
          const t = THEME[item.rk];
          const accent = isDark ? t.accentDark : t.accent;
          return (
            <div key={item.title} style={{ background: cardBg, padding: "12px 14px", borderLeft: `3px solid ${accent}` }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: accent, marginBottom: 5 }}>{item.title}</div>
              <div style={{ fontSize: 10.5, color: textSub, lineHeight: 1.6 }}>{item.body}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Legend ─────────────────────────────────────────────────────────────────────
function Legend({ isDark }: { isDark: boolean }) {
  const textSub = isDark ? "rgba(255,255,255,0.45)" : "#9ca3af";
  const items: { rk: RoleKey; label: string }[] = [
    { rk: "mgr",  label: "Manager"    },
    { rk: "exec", label: "Executive"  },
    { rk: "cm",   label: "Content Mkt"},
    { rk: "gd",   label: "Graphic"    },
    { rk: "vdo",  label: "VDO Creator"},
  ];
  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", marginBottom: 20 }}>
      {items.map(i => (
        <div key={i.rk} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, color: textSub }}>
          <div style={{ width: 10, height: 10, borderRadius: 3, background: isDark ? THEME[i.rk].accentDark : THEME[i.rk].accent }} />
          {i.label}
        </div>
      ))}
      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, color: textSub }}>
        <svg width="22" height="10"><line x1="0" y1="5" x2="22" y2="5" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4,3" opacity="0.6"/></svg>
        Theme & Concept
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function MarketingOrgChart() {
  const isDark = useDarkMode();
  const stroke = isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.18)";
  const textMain = isDark ? "rgba(255,255,255,0.9)"  : "#1a1a1a";
  const textSub  = isDark ? "rgba(255,255,255,0.45)" : "#9ca3af";

  // SVG connector path strings (fixed 720px coordinate space)
  // Manager(cx=360) → Exec(cx=145) + CM(cx=575)
  const path1 = "M360,0 L360,20 M145,20 L575,20 M145,20 L145,44 M575,20 L575,44";
  // CM(cx=575) → GD(cx=370) + VDO(cx=578)
  const path2 = "M575,0 L575,20 M370,20 L578,20 M370,20 L370,44 M578,20 L578,44";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background p-5 pb-16">

      {/* Page header */}
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, color: textSub, textTransform: "uppercase", marginBottom: 4 }}>Standard Tour</div>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: textMain, marginBottom: 3 }}>📊 Organization Chart — ทีม Marketing</h1>
        <p style={{ fontSize: 11.5, color: textSub }}>สายการรายงานและความรับผิดชอบ | คลิกการ์ดเพื่อดูรายละเอียด</p>
      </div>

      <Legend isDark={isDark} />

      {/* Org tree — 720px fixed, scroll on mobile */}
      <div style={{ overflowX: "auto" }}>
        <div style={{ width: 720, margin: "0 auto" }}>

          {/* Row 0: Manager */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <RoleCard rk="mgr" isDark={isDark} style={{ width: 280 }} />
          </div>

          {/* Connector 1 */}
          <Connector isDark={isDark} d={path1} />

          {/* Row 1: Exec ←──dotted──→ CM */}
          <div style={{ display: "flex", alignItems: "flex-start" }}>
            {/* Left spacer */}
            <div style={{ width: 40 }} />
            {/* Exec */}
            <RoleCard rk="exec" isDark={isDark} style={{ width: 210 }} />
            {/* Dotted Theme & Concept line */}
            <div style={{ flex: 1, paddingTop: 28, paddingLeft: 8, paddingRight: 8 }}>
              <svg width="100%" height="22" style={{ display: "block" }}>
                <defs>
                  <marker id="arrowR" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
                    <path d="M0,0 L5,2.5 L0,5" fill="none" stroke="#3b82f6" strokeWidth="1" opacity="0.6"/>
                  </marker>
                </defs>
                <line x1="0" y1="13" x2="100%" y2="13" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="5,3" opacity="0.45" markerEnd="url(#arrowR)"/>
                <text x="50%" y="9" fontSize="8" fill="#3b82f6" textAnchor="middle" opacity="0.55" fontWeight="700" fontFamily="sans-serif">Theme & Concept</text>
              </svg>
            </div>
            {/* CM */}
            <RoleCard rk="cm" isDark={isDark} style={{ width: 210 }} />
            {/* Right spacer */}
            <div style={{ width: 40 }} />
          </div>

          {/* Connector 2 */}
          <Connector isDark={isDark} d={path2} />

          {/* Row 2: [spacer] GD VDO */}
          <div style={{ display: "flex", alignItems: "flex-start" }}>
            <div style={{ width: 273 }} />
            <RoleCard rk="gd"  isDark={isDark} style={{ width: 195 }} />
            <div style={{ width: 14 }} />
            <RoleCard rk="vdo" isDark={isDark} style={{ width: 195 }} />
            <div style={{ width: 43 }} />
          </div>

          {/* Collaboration section */}
          <CollabSection isDark={isDark} />

          {/* Footer */}
          <div style={{ textAlign: "center", fontSize: 10, color: textSub, marginTop: 20 }}>
            Standard Tour — Marketing Org Chart &nbsp;|&nbsp; อ้างอิง SOP ทุกตำแหน่ง (MKT-V2.0)
          </div>
        </div>
      </div>
    </div>
  );
}
