/**
 * MarketingTeam.tsx
 * ทีม Marketing — card grid + staggered fade + role-color glow hover
 * Layout: Featured Manager card (span 2 rows) + 2×2 grid
 */
import { useState, useEffect } from "react";

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

const ROLE_THEME: Record<RoleKey, {
  gradient: string;
  accent: string; accentDark: string;
  tagBg_l: string; tagBg_d: string;
  glow: string;
}> = {
  mgr:  { gradient:"linear-gradient(135deg,#5b21b6,#8b5cf6)", accent:"#7c3aed", accentDark:"#c084fc", tagBg_l:"#f3e8ff", tagBg_d:"rgba(192,132,252,0.18)", glow:"rgba(139,92,246,0.3)"  },
  exec: { gradient:"linear-gradient(135deg,#1e40af,#3b82f6)", accent:"#2563eb", accentDark:"#60a5fa", tagBg_l:"#eff6ff", tagBg_d:"rgba(96,165,250,0.18)",  glow:"rgba(59,130,246,0.3)"  },
  cm:   { gradient:"linear-gradient(135deg,#166534,#22c55e)", accent:"#16a34a", accentDark:"#4ade80", tagBg_l:"#f0fdf4", tagBg_d:"rgba(74,222,128,0.15)",  glow:"rgba(34,197,94,0.3)"  },
  gd:   { gradient:"linear-gradient(135deg,#c2410c,#f97316)", accent:"#ea580c", accentDark:"#fb923c", tagBg_l:"#fff7ed", tagBg_d:"rgba(251,146,60,0.15)",  glow:"rgba(249,115,22,0.3)" },
  vdo:  { gradient:"linear-gradient(135deg,#991b1b,#ef4444)", accent:"#dc2626", accentDark:"#f87171", tagBg_l:"#fef2f2", tagBg_d:"rgba(248,113,113,0.15)", glow:"rgba(239,68,68,0.3)"  },
};

interface Member {
  rk: RoleKey;
  emoji: string;
  role: string;
  thaiRole: string;
  badge: string;
  desc: string;
  tags: string[];
}

const MEMBERS: Member[] = [
  {
    rk: "mgr", emoji: "👑",
    role: "Marketing Manager", thaiRole: "ผู้จัดการฝ่ายการตลาด", badge: "Head",
    desc: "กำหนดทิศทางการตลาดทั้งหมด ตั้ง KPI อนุมัติแผน Campaign งบ Paid Ads และ KOL ดูแลคุณภาพในภาพรวมของทีม",
    tags: ["Strategy", "Campaign", "KPI"],
  },
  {
    rk: "exec", emoji: "🎯",
    role: "Marketing Executive", thaiRole: "มือขวาเชิงรุก", badge: "Paid",
    desc: "บริหาร Paid Ads ทุก Platform คิด Campaign Concept ประสานงานบริษัทในเครือ ดูแล KOL / Influencer",
    tags: ["Paid Ads", "KOL", "B2B"],
  },
  {
    rk: "cm", emoji: "✍️",
    role: "Content Marketing", thaiRole: "Hub กลาง Creative", badge: "Hub",
    desc: "Gatekeeper ชิ้นงานทั้งหมด วาง Content Calendar กระจาย Brief ตรวจ QC ทุกชิ้นก่อน Publish",
    tags: ["Content", "Copy", "QC"],
  },
  {
    rk: "gd", emoji: "🎨",
    role: "Graphic Designer", thaiRole: "ออกแบบสื่อกราฟิก", badge: "Design",
    desc: "ออกแบบสื่อภาพนิ่งทุกชิ้น Online & Offline ดูแล Brand CI และ Visual Guidelines ส่ง Final File ให้ CM",
    tags: ["Design", "Brand CI", "Visual"],
  },
  {
    rk: "vdo", emoji: "🎬",
    role: "VDO Content Creator", thaiRole: "ผลิตสื่อวิดีโอ", badge: "Video",
    desc: "ผลิต VDO ครบวงจร คิด Story เองจาก Theme ถ่ายทำ ตัดต่อ Subtitle Upload ทุก Platform เอง",
    tags: ["Short-form", "Story", "TikTok"],
  },
];

// ── CSS Keyframes + hover class (injected as <style>) ─────────────────────────
const ANIM_CSS = `
@keyframes mktTeamFadeUp {
  from { opacity: 0; transform: translateY(28px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0px)  scale(1);    }
}
.mkt-team-card {
  transition:
    transform  0.26s cubic-bezier(0.34,1.56,0.64,1),
    box-shadow 0.26s ease;
  will-change: transform;
}
.mkt-team-card:hover {
  transform: translateY(-7px) !important;
}
`;

// ── Featured card (Manager) — full gradient, span 2 rows ─────────────────────
function FeaturedCard({ m, isDark }: { m: Member; isDark: boolean }) {
  const t = ROLE_THEME[m.rk];
  const shadow     = `0 8px 36px ${t.glow}, 0 0 0 1px rgba(255,255,255,0.12)`;
  const shadowHov  = `0 22px 52px ${t.glow.replace("0.3","0.52")}, 0 0 0 1px rgba(255,255,255,0.2)`;

  return (
    <div
      className="mkt-team-card"
      style={{
        background: t.gradient,
        borderRadius: 20,
        padding: "26px 22px 28px",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        gridRow: "span 2",
        animation: "mktTeamFadeUp 0.6s ease 0ms both",
        boxShadow: shadow,
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = shadowHov; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = shadow; }}
    >
      {/* Decorative blobs */}
      <div style={{ position:"absolute", width:240, height:240, borderRadius:"50%", background:"rgba(255,255,255,0.07)", top:-70, right:-70, pointerEvents:"none" }} />
      <div style={{ position:"absolute", width:130, height:130, borderRadius:"50%", background:"rgba(255,255,255,0.06)", bottom:-40, left:-30, pointerEvents:"none" }} />
      <div style={{ position:"absolute", width:58, height:58, borderRadius:"50%", background:"rgba(255,255,255,0.1)", top:90, right:26, pointerEvents:"none" }} />
      <div style={{ position:"absolute", width:32, height:32, borderRadius:"50%", background:"rgba(255,255,255,0.08)", bottom:120, right:60, pointerEvents:"none" }} />

      {/* Top row: label + badge */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:22, position:"relative" }}>
        <span style={{ fontSize:8.5, fontWeight:800, letterSpacing:1.5, color:"rgba(255,255,255,0.5)", textTransform:"uppercase" }}>
          Marketing Team
        </span>
        <span style={{
          fontSize:9, fontWeight:800, padding:"2.5px 10px", borderRadius:20,
          background:"rgba(255,255,255,0.2)", color:"#fff",
        }}>
          {m.badge}
        </span>
      </div>

      {/* Emoji icon */}
      <div style={{
        width: 70, height: 70, borderRadius: 18,
        background: "rgba(255,255,255,0.18)",
        backdropFilter: "blur(8px)",
        border: "1px solid rgba(255,255,255,0.25)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 34, marginBottom: 20, position: "relative",
      }}>
        {m.emoji}
      </div>

      {/* Role text */}
      <div style={{ color:"#fff", fontSize:18, fontWeight:900, lineHeight:1.25, marginBottom:5, position:"relative" }}>
        {m.role}
      </div>
      <div style={{ color:"rgba(255,255,255,0.65)", fontSize:11.5, fontWeight:600, marginBottom:18, position:"relative" }}>
        {m.thaiRole}
      </div>

      {/* Divider */}
      <div style={{ height:1, background:"rgba(255,255,255,0.18)", marginBottom:16, position:"relative" }} />

      {/* Description */}
      <p style={{ color:"rgba(255,255,255,0.72)", fontSize:11.5, lineHeight:1.78, flex:1, position:"relative" }}>
        {m.desc}
      </p>

      {/* Tags */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:7, marginTop:20, position:"relative" }}>
        {m.tags.map(tag => (
          <span key={tag} style={{
            fontSize:9.5, fontWeight:700,
            padding:"3px 11px", borderRadius:20,
            background:"rgba(255,255,255,0.18)", color:"#fff",
          }}>
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Regular member card ────────────────────────────────────────────────────────
function MemberCard({ m, isDark, delay }: { m: Member; isDark: boolean; delay: number }) {
  const t = ROLE_THEME[m.rk];
  const accent    = isDark ? t.accentDark : t.accent;
  const tagBg     = isDark ? t.tagBg_d    : t.tagBg_l;
  const cardBg    = isDark ? "hsl(var(--card))" : "#fff";
  const textMain  = isDark ? "rgba(255,255,255,0.9)"  : "#111827";
  const textSub   = isDark ? "rgba(255,255,255,0.5)"  : "#6b7280";
  const borderC   = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)";
  const shadow    = isDark ? "0 4px 18px rgba(0,0,0,0.4)"   : "0 2px 12px rgba(0,0,0,0.08)";
  const shadowHov = isDark ? "0 16px 40px rgba(0,0,0,0.55)" : `0 16px 36px ${t.glow}`;

  return (
    <div
      className="mkt-team-card"
      style={{
        background: cardBg,
        borderRadius: 16,
        overflow: "hidden",
        border: `1px solid ${borderC}`,
        animation: `mktTeamFadeUp 0.6s ease ${delay}ms both`,
        boxShadow: shadow,
        display: "flex",
        flexDirection: "column",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = shadowHov; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = shadow; }}
    >
      {/* Gradient photo area */}
      <div style={{
        background: t.gradient,
        height: 164,
        position: "relative",
        overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        {/* Blobs */}
        <div style={{ position:"absolute", width:165, height:165, borderRadius:"50%", background:"rgba(255,255,255,0.07)", top:-52, right:-52, pointerEvents:"none" }} />
        <div style={{ position:"absolute", width:95, height:95,  borderRadius:"50%", background:"rgba(255,255,255,0.09)", bottom:-26, left:14, pointerEvents:"none" }} />
        <div style={{ position:"absolute", width:40, height:40,  borderRadius:"50%", background:"rgba(255,255,255,0.12)", top:14, left:18, pointerEvents:"none" }} />
        {/* Badge */}
        <span style={{
          position:"absolute", top:11, right:11,
          fontSize:8.5, fontWeight:800,
          padding:"2px 8px", borderRadius:20,
          background:"rgba(255,255,255,0.22)", color:"#fff",
        }}>
          {m.badge}
        </span>
        {/* Emoji */}
        <div style={{
          fontSize: 54, position: "relative", zIndex: 1,
          filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.22))",
          lineHeight: 1,
        }}>
          {m.emoji}
        </div>
      </div>

      {/* Card body */}
      <div style={{ padding:"15px 16px 18px", flex:1, display:"flex", flexDirection:"column" }}>
        <div style={{ fontSize:13.5, fontWeight:800, color:textMain, lineHeight:1.3, marginBottom:3 }}>{m.role}</div>
        <div style={{ fontSize:11, color:accent, fontWeight:700, marginBottom:9 }}>{m.thaiRole}</div>
        <p style={{ fontSize:11, color:textSub, lineHeight:1.65, marginBottom:12, flex:1 }}>{m.desc}</p>
        <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
          {m.tags.map(tag => (
            <span key={tag} style={{
              fontSize:9.5, fontWeight:700,
              padding:"2.5px 9px", borderRadius:20,
              background:tagBg, color:accent,
            }}>
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function MarketingTeam() {
  const isDark   = useDarkMode();
  const textMain = isDark ? "rgba(255,255,255,0.9)"  : "#111827";
  const textSub  = isDark ? "rgba(255,255,255,0.42)" : "#9ca3af";

  const [featured, ...rest] = MEMBERS;   // Manager = featured, rest = 2×2 grid

  return (
    <>
      <style>{ANIM_CSS}</style>
      <div className="min-h-screen bg-gray-50 dark:bg-background p-6 pb-16">

        {/* ── Page header ── */}
        <div style={{ textAlign:"center", marginBottom:30 }}>
          <div style={{ fontSize:9.5, fontWeight:800, letterSpacing:2, color:textSub, textTransform:"uppercase", marginBottom:5 }}>
            Standard Tour
          </div>
          <h1 style={{ fontSize:22, fontWeight:900, color:textMain, marginBottom:5 }}>
            👥 ทีม Marketing
          </h1>
          <p style={{ fontSize:12, color:textSub }}>
            สมาชิกและบทบาทหน้าที่ &nbsp;|&nbsp; 5 ตำแหน่ง
          </p>
        </div>

        {/* ── Card grid ── */}
        {/*
         * gridTemplateColumns: "280px 1fr 1fr"
         * Featured Manager spans 2 rows (col 1, rows 1-2)
         * Rest fills 2×2 on cols 2-3:
         *   Row 1: Exec | CM
         *   Row 2: GD   | VDO
         */}
        <div style={{
          maxWidth: 900,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "280px 1fr 1fr",
          gap: 18,
        }}>
          <FeaturedCard m={featured} isDark={isDark} />
          {rest.map((m, i) => (
            <MemberCard key={m.rk} m={m} isDark={isDark} delay={(i + 1) * 110} />
          ))}
        </div>

        {/* ── Footer ── */}
        <div style={{ textAlign:"center", fontSize:10, color:textSub, marginTop:24, opacity:0.55 }}>
          Standard Tour — Marketing Team &nbsp;|&nbsp; อ้างอิง Org Chart (MKT-V2.0)
        </div>
      </div>
    </>
  );
}
