/**
 * MarketingOrgChart.tsx — v2
 * Redesigned: full gradient card headers · 840px layout · pill expand button
 * Layout (840px inner):
 *   Row 0: Manager 300px  cx=420
 *   Row 1: Exec 248px cx=144 ←dotted→ CM 248px cx=696
 *   Row 2: [386px] GD 210px cx=491 · VDO 210px cx=715
 */
import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

// ── Dark-mode helper ───────────────────────────────────────────────────────────
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

// ── Types ──────────────────────────────────────────────────────────────────────
type RoleKey = "mgr" | "exec" | "cm" | "gd" | "vdo";

interface RoleTheme {
  gradient: string;
  accent: string; accentDark: string;
  tagBg_l: string; tagBg_d: string;
  border_l: string; border_d: string;
}

// ── Color themes per role ──────────────────────────────────────────────────────
const THEME: Record<RoleKey, RoleTheme> = {
  mgr: {
    gradient: "linear-gradient(135deg,#5b21b6,#8b5cf6)",
    accent: "#7c3aed", accentDark: "#c084fc",
    tagBg_l: "#f3e8ff", tagBg_d: "rgba(192,132,252,0.15)",
    border_l: "#e9d5ff", border_d: "rgba(192,132,252,0.3)",
  },
  exec: {
    gradient: "linear-gradient(135deg,#1e40af,#3b82f6)",
    accent: "#2563eb", accentDark: "#60a5fa",
    tagBg_l: "#eff6ff", tagBg_d: "rgba(96,165,250,0.15)",
    border_l: "#bfdbfe", border_d: "rgba(96,165,250,0.3)",
  },
  cm: {
    gradient: "linear-gradient(135deg,#166534,#22c55e)",
    accent: "#16a34a", accentDark: "#4ade80",
    tagBg_l: "#f0fdf4", tagBg_d: "rgba(74,222,128,0.13)",
    border_l: "#bbf7d0", border_d: "rgba(74,222,128,0.3)",
  },
  gd: {
    gradient: "linear-gradient(135deg,#c2410c,#f97316)",
    accent: "#ea580c", accentDark: "#fb923c",
    tagBg_l: "#fff7ed", tagBg_d: "rgba(251,146,60,0.13)",
    border_l: "#fed7aa", border_d: "rgba(251,146,60,0.3)",
  },
  vdo: {
    gradient: "linear-gradient(135deg,#991b1b,#ef4444)",
    accent: "#dc2626", accentDark: "#f87171",
    tagBg_l: "#fef2f2", tagBg_d: "rgba(248,113,113,0.13)",
    border_l: "#fecaca", border_d: "rgba(248,113,113,0.3)",
  },
};

// ── Role data ──────────────────────────────────────────────────────────────────
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
    desc: "ผลิต VDO ครบวงจร คิด Story เองจาก Theme ที่ Exec ส่ง กรอก Concept ลง Calendar ถ่าย ตัดต่อ Upload เอง",
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
      items: [
        "🚌 Service Review (รีวิวรถ VIP / โรงแรม)",
        "🌏 Travel Vlog / Experience",
        "📚 Edutainment (Visa Tips / Travel Tips)",
      ],
    }],
  },
};

// ── RoleCard — gradient header + pill expand button ────────────────────────────
function RoleCard({
  rk, isDark, style,
}: { rk: RoleKey; isDark: boolean; style?: React.CSSProperties }) {
  const [open, setOpen] = useState(false);
  const d = ROLES[rk];
  const t = THEME[rk];
  const accent  = isDark ? t.accentDark : t.accent;
  const tagBg   = isDark ? t.tagBg_d    : t.tagBg_l;
  const bodyBg  = isDark ? "hsl(var(--card))" : "#ffffff";
  const textSub = isDark ? "rgba(255,255,255,0.5)"  : "#6b7280";
  const divider = isDark ? "rgba(255,255,255,0.08)" : "#f3f4f6";
  const border  = isDark ? "rgba(255,255,255,0.1)"  : "rgba(0,0,0,0.08)";

  return (
    <div
      onClick={() => setOpen(o => !o)}
      style={{
        ...style,
        borderRadius: 14,
        overflow: "hidden",
        border: `1px solid ${border}`,
        cursor: "pointer",
        transition: "box-shadow .18s, transform .18s",
        boxShadow: isDark
          ? "0 3px 14px rgba(0,0,0,.45)"
          : "0 2px 10px rgba(0,0,0,.09)",
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = "translateY(-2px)";
        el.style.boxShadow = isDark
          ? "0 8px 26px rgba(0,0,0,.55)"
          : "0 8px 22px rgba(0,0,0,.14)";
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = "";
        el.style.boxShadow = isDark
          ? "0 3px 14px rgba(0,0,0,.45)"
          : "0 2px 10px rgba(0,0,0,.09)";
      }}
    >
      {/* ── Gradient header ── */}
      <div style={{
        background: t.gradient,
        padding: "12px 14px 13px",
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
      }}>
        {/* Emoji icon */}
        <div style={{
          width: 40, height: 40, borderRadius: 11,
          background: "rgba(255,255,255,0.22)",
          backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, flexShrink: 0,
        }}>
          {d.emoji}
        </div>
        {/* Title + badge + subtitle */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{
              fontSize: 13, fontWeight: 800, color: "#fff", lineHeight: 1.25,
            }}>
              {d.title}
            </span>
            <span style={{
              fontSize: 9, fontWeight: 800,
              padding: "2px 8px", borderRadius: 20,
              background: "rgba(255,255,255,0.22)", color: "#fff",
              whiteSpace: "nowrap",
            }}>
              {d.badge}
            </span>
          </div>
          <div style={{
            fontSize: 10.5, color: "rgba(255,255,255,0.72)",
            marginTop: 3, fontWeight: 600,
          }}>
            {d.subtitle}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ background: bodyBg, padding: "12px 14px 13px" }}>
        <p style={{ fontSize: 11, color: textSub, lineHeight: 1.6, marginBottom: 8 }}>
          {d.desc}
        </p>

        {/* Tags */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
          {d.tags.map(tag => (
            <span key={tag} style={{
              fontSize: 9.5, fontWeight: 700,
              padding: "2px 8px", borderRadius: 20,
              background: tagBg, color: accent,
            }}>
              {tag}
            </span>
          ))}
        </div>

        {/* Reports to */}
        {d.reportsTo && (
          <div style={{ fontSize: 10, color: textSub, marginBottom: 9 }}>
            รายงานต่อ <span style={{ fontWeight: 700 }}>→ {d.reportsTo}</span>
          </div>
        )}

        {/* ── Pill expand button ── */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          fontSize: 10, fontWeight: 700, color: accent,
          background: tagBg, padding: "4px 11px", borderRadius: 20,
        }}>
          {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          {open ? "ย่อรายละเอียด" : "ดูรายละเอียด"}
        </div>

        {/* ── Expanded section ── */}
        {open && (
          <div style={{ marginTop: 12, paddingTop: 11, borderTop: `1px solid ${divider}` }}>
            {/* Duties */}
            <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".5px", color: textSub, marginBottom: 6 }}>
              หน้าที่หลัก
            </div>
            {d.duties.map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 6, fontSize: 10.5, color: textSub, lineHeight: 1.55, marginBottom: 4 }}>
                <span style={{ color: accent, opacity: 0.5, flexShrink: 0, marginTop: 1 }}>•</span>
                {item}
              </div>
            ))}

            {/* Extras */}
            {d.extras?.map(ext => (
              <div key={ext.label} style={{ marginTop: 10 }}>
                <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".5px", color: textSub, marginBottom: 5 }}>
                  {ext.label}
                </div>
                {ext.items.map((it, i) => (
                  <div key={i} style={{ fontSize: 10.5, color: textSub, lineHeight: 1.7 }}>{it}</div>
                ))}
              </div>
            ))}

            {/* KPIs */}
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".5px", color: textSub, marginBottom: 5 }}>
                KPI
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {d.kpis.map(k => (
                  <span key={k} style={{
                    fontSize: 9.5, padding: "2px 8px", borderRadius: 20,
                    background: tagBg, color: accent, fontWeight: 600,
                  }}>
                    {k}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Connector SVG (840px coordinate space) ────────────────────────────────────
function Connector({ isDark, d }: { isDark: boolean; d: string }) {
  const stroke = isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.18)";
  return (
    <svg viewBox="0 0 840 44" width="840" height="44" style={{ display: "block" }}>
      <path d={d} fill="none" stroke={stroke} strokeWidth="1.5" />
    </svg>
  );
}

// ── Collaboration section (840px) ─────────────────────────────────────────────
function CollabSection({ isDark }: { isDark: boolean }) {
  const cardBg   = isDark ? "hsl(var(--card))" : "#ffffff";
  const hdrBg    = isDark ? "rgba(255,255,255,0.05)" : "#f8f9fa";
  const border   = isDark ? "rgba(255,255,255,0.1)"  : "#e5e7eb";
  const textMain = isDark ? "rgba(255,255,255,0.88)"  : "#111827";
  const textSub  = isDark ? "rgba(255,255,255,0.5)"   : "#6b7280";

  const items = [
    { rk: "mgr"  as RoleKey, title: "Manager → ทีม",              body: "กำหนด KPI / อนุมัติแผน Campaign + งบ + KOL / Final Approve งานสำคัญ / รับ Report ต้นเดือน" },
    { rk: "exec" as RoleKey, title: "Exec → CM + VDO (พร้อมกัน)", body: "ส่ง Theme & Concept ให้ทั้ง 2 ตำแหน่งพร้อมกัน / ขอ Ad Creative ผ่าน CM / Boost โพสต์ที่ดี" },
    { rk: "cm"   as RoleKey, title: "CM → GD / VDO",              body: "ส่ง Brief + Deadline / จัด Slot Calendar / QC ทุกชิ้น / ตรวจ Concept VDO / ตั้งโพสต์ Static" },
    { rk: "vdo"  as RoleKey, title: "VDO → CM Calendar",          body: "กรอก Story Concept / หัวข้อคลิปใน Slot ที่ CM จัดไว้ → CM ตรวจทิศทาง → เริ่ม Pre-Production" },
  ];

  return (
    <div style={{
      width: 840, marginTop: 28,
      borderRadius: 14, overflow: "hidden",
      border: `1px solid ${border}`, background: cardBg,
    }}>
      <div style={{
        background: hdrBg, padding: "11px 18px",
        borderBottom: `1px solid ${border}`,
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <span style={{ fontSize: 15 }}>🔗</span>
        <span style={{ fontSize: 12, fontWeight: 800, color: textMain }}>สายประสานงานหลัก</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: border }}>
        {items.map(item => {
          const t = THEME[item.rk];
          const accent = isDark ? t.accentDark : t.accent;
          const tagBg  = isDark ? t.tagBg_d    : t.tagBg_l;
          return (
            <div key={item.title} style={{
              background: cardBg, padding: "13px 16px",
              borderLeft: `3px solid ${accent}`,
            }}>
              <div style={{
                fontSize: 11, fontWeight: 800, color: accent,
                marginBottom: 6, display: "flex", alignItems: "center", gap: 6,
              }}>
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: "1px 7px", borderRadius: 20,
                  background: tagBg, color: accent, whiteSpace: "nowrap",
                }}>
                  {item.rk.toUpperCase()}
                </span>
                {item.title}
              </div>
              <div style={{ fontSize: 10.5, color: textSub, lineHeight: 1.65 }}>{item.body}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Legend — colored pill badges ───────────────────────────────────────────────
function Legend({ isDark }: { isDark: boolean }) {
  const items: { rk: RoleKey; label: string }[] = [
    { rk: "mgr",  label: "Manager"    },
    { rk: "exec", label: "Executive"  },
    { rk: "cm",   label: "Content Mkt"},
    { rk: "gd",   label: "Graphic"    },
    { rk: "vdo",  label: "VDO Creator"},
  ];
  return (
    <div style={{ display: "flex", gap: 7, flexWrap: "wrap", justifyContent: "center", marginBottom: 22 }}>
      {items.map(i => {
        const accent = isDark ? THEME[i.rk].accentDark : THEME[i.rk].accent;
        const tagBg  = isDark ? THEME[i.rk].tagBg_d    : THEME[i.rk].tagBg_l;
        return (
          <div key={i.rk} style={{
            display: "flex", alignItems: "center", gap: 5,
            fontSize: 10.5, fontWeight: 700, color: accent,
            background: tagBg, padding: "3.5px 11px", borderRadius: 20,
          }}>
            <div style={{ width: 7, height: 7, borderRadius: 2, background: accent, flexShrink: 0 }} />
            {i.label}
          </div>
        );
      })}
      {/* Dotted line legend */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        fontSize: 10.5, color: isDark ? "rgba(255,255,255,0.4)" : "#9ca3af",
        paddingLeft: 2,
      }}>
        <svg width="26" height="10" style={{ flexShrink: 0 }}>
          <line x1="0" y1="5" x2="26" y2="5" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4,3" opacity="0.65"/>
        </svg>
        Theme & Concept
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function MarketingOrgChart() {
  const isDark = useDarkMode();
  const textMain = isDark ? "rgba(255,255,255,0.9)"  : "#111827";
  const textSub  = isDark ? "rgba(255,255,255,0.42)" : "#9ca3af";

  /**
   * SVG connector paths — 840px coordinate space
   *
   * Connector 1 (Row 0 → Row 1):
   *   Manager cx=420, Exec cx=144, CM cx=696
   *   M420,0 L420,20  (drop from Manager)
   *   M144,20 L696,20  (horizontal bar)
   *   M144,20 L144,44  (drop to Exec)
   *   M696,20 L696,44  (drop to CM)
   *
   * Connector 2 (CM → Row 2):
   *   CM cx=696, GD cx=491, VDO cx=715
   *   Note: 491 < 696 < 715 ✓ — CM line lands inside horizontal bar
   */
  const path1 = "M420,0 L420,20 M144,20 L696,20 M144,20 L144,44 M696,20 L696,44";
  const path2 = "M696,0 L696,20 M491,20 L715,20 M491,20 L491,44 M715,20 L715,44";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background p-5 pb-16">

      {/* Page header */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{
          fontSize: 10, fontWeight: 800, letterSpacing: 2,
          color: textSub, textTransform: "uppercase", marginBottom: 5,
        }}>
          Standard Tour
        </div>
        <h1 style={{ fontSize: 21, fontWeight: 900, color: textMain, marginBottom: 4 }}>
          📊 Organization Chart — ทีม Marketing
        </h1>
        <p style={{ fontSize: 11.5, color: textSub }}>
          สายการรายงานและความรับผิดชอบ &nbsp;|&nbsp; คลิกการ์ดเพื่อดูรายละเอียด
        </p>
      </div>

      <Legend isDark={isDark} />

      {/* Org tree — 840px fixed, scroll on mobile */}
      <div style={{ overflowX: "auto" }}>
        <div style={{ width: 840, margin: "0 auto" }}>

          {/* ── Row 0: Manager (centered) ── */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <RoleCard rk="mgr" isDark={isDark} style={{ width: 300 }} />
          </div>

          {/* ── Connector 1 (840×44) ── */}
          <Connector isDark={isDark} d={path1} />

          {/* ── Row 1: Exec ←──dotted──→ CM ── */}
          {/*
           * Layout: [20px] [248px Exec] [flex-1 = 304px dotted] [248px CM] [20px]
           * Exec cx = 20+124 = 144 ✓
           * CM   cx = 840-20-124 = 696 ✓
           */}
          <div style={{ display: "flex", alignItems: "flex-start", width: 840 }}>
            <div style={{ width: 20, flexShrink: 0 }} />
            <RoleCard rk="exec" isDark={isDark} style={{ width: 248, flexShrink: 0 }} />

            {/* Dotted Theme & Concept arrow */}
            <div style={{ flex: 1, paddingTop: 26, paddingLeft: 10, paddingRight: 10 }}>
              <svg width="100%" height="24" style={{ display: "block", overflow: "visible" }}>
                <defs>
                  <marker id="arrowR2" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0,0.5 L5,3 L0,5.5" fill="none" stroke="#3b82f6" strokeWidth="1.2" opacity="0.65"/>
                  </marker>
                </defs>
                <line
                  x1="4" y1="14" x2="calc(100% - 4px)" y2="14"
                  stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="5,3"
                  opacity="0.5" markerEnd="url(#arrowR2)"
                />
                <text x="50%" y="9" fontSize="8.5" fill="#3b82f6" textAnchor="middle"
                  opacity="0.6" fontWeight="700" fontFamily="sans-serif">
                  Theme &amp; Concept
                </text>
              </svg>
            </div>

            <RoleCard rk="cm" isDark={isDark} style={{ width: 248, flexShrink: 0 }} />
            <div style={{ width: 20, flexShrink: 0 }} />
          </div>

          {/* ── Connector 2 (840×44) ── */}
          <Connector isDark={isDark} d={path2} />

          {/* ── Row 2: [386px spacer] GD VDO ── */}
          {/*
           * [386px] [210px GD] [14px] [210px VDO] [20px] = 840 ✓
           * GD  cx = 386+105 = 491 ✓
           * VDO cx = 386+210+14+105 = 715 ✓
           */}
          <div style={{ display: "flex", alignItems: "flex-start", width: 840 }}>
            <div style={{ width: 386, flexShrink: 0 }} />
            <RoleCard rk="gd"  isDark={isDark} style={{ width: 210, flexShrink: 0 }} />
            <div style={{ width: 14, flexShrink: 0 }} />
            <RoleCard rk="vdo" isDark={isDark} style={{ width: 210, flexShrink: 0 }} />
            <div style={{ width: 20, flexShrink: 0 }} />
          </div>

          {/* ── Collaboration section ── */}
          <CollabSection isDark={isDark} />

          {/* ── Footer ── */}
          <div style={{ textAlign: "center", fontSize: 10, color: textSub, marginTop: 20, opacity: 0.7 }}>
            Standard Tour — Marketing Org Chart &nbsp;|&nbsp; อ้างอิง SOP ทุกตำแหน่ง (MKT-V2.0)
          </div>

        </div>
      </div>
    </div>
  );
}
