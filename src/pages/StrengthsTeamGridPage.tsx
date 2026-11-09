/**
 * StrengthsTeamGridPage.tsx
 * Team Strengths Grid — เห็นภาพรวม Top 5 ของทีม Marketing ทั้งหมด
 * เข้าถึงได้: Marketing Manager เท่านั้น
 */
import React, { useEffect, useState } from "react";
import { Users, RefreshCw, Info } from "lucide-react";
import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";
import { cn } from "@/lib/utils";

// ─── 34 Themes (domain order: Executing → Influencing → Relationship → Strategic) ──
const GRID_THEMES = [
  // Executing
  { id: "achiever",      name: "Achiever",      nameTH: "นักบรรลุเป้า",          domain: "Executing"    },
  { id: "arranger",      name: "Arranger",       nameTH: "นักจัดการ",              domain: "Executing"    },
  { id: "belief",        name: "Belief",         nameTH: "นักความเชื่อ",           domain: "Executing"    },
  { id: "consistency",   name: "Consistency",    nameTH: "นักความสม่ำเสมอ",        domain: "Executing"    },
  { id: "deliberative",  name: "Deliberative",   nameTH: "นักรอบคอบ",              domain: "Executing"    },
  { id: "discipline",    name: "Discipline",     nameTH: "นักวินัย",               domain: "Executing"    },
  { id: "focus",         name: "Focus",          nameTH: "นักโฟกัส",              domain: "Executing"    },
  { id: "responsibility",name: "Responsibility", nameTH: "นักความรับผิดชอบ",       domain: "Executing"    },
  { id: "restorative",   name: "Restorative",    nameTH: "นักแก้ปัญหา",           domain: "Executing"    },
  // Influencing
  { id: "activator",     name: "Activator",      nameTH: "นักลงมือ",              domain: "Influencing"  },
  { id: "command",       name: "Command",        nameTH: "นักนำ",                 domain: "Influencing"  },
  { id: "communication", name: "Communication",  nameTH: "นักสื่อสาร",            domain: "Influencing"  },
  { id: "competition",   name: "Competition",    nameTH: "นักแข่งขัน",            domain: "Influencing"  },
  { id: "maximizer",     name: "Maximizer",      nameTH: "นักดีที่สุด",           domain: "Influencing"  },
  { id: "selfAssurance", name: "Self-Assurance", nameTH: "นักมั่นใจ",             domain: "Influencing"  },
  { id: "significance",  name: "Significance",   nameTH: "นักความสำคัญ",          domain: "Influencing"  },
  { id: "woo",           name: "Woo",            nameTH: "นักสร้างความประทับใจ",  domain: "Influencing"  },
  // Relationship
  { id: "adaptability",  name: "Adaptability",   nameTH: "นักปรับตัว",            domain: "Relationship" },
  { id: "connectedness", name: "Connectedness",  nameTH: "นักเชื่อมโยง",          domain: "Relationship" },
  { id: "developer",     name: "Developer",      nameTH: "นักพัฒนาคน",            domain: "Relationship" },
  { id: "empathy",       name: "Empathy",        nameTH: "นักเข้าใจ",             domain: "Relationship" },
  { id: "harmony",       name: "Harmony",        nameTH: "นักความกลมกลืน",        domain: "Relationship" },
  { id: "includer",      name: "Includer",       nameTH: "นักรวมใจ",              domain: "Relationship" },
  { id: "individualization", name: "Individualization", nameTH: "นักสังเกตความแตกต่าง", domain: "Relationship" },
  { id: "positivity",    name: "Positivity",     nameTH: "นักพลังบวก",            domain: "Relationship" },
  { id: "relator",       name: "Relator",        nameTH: "นักความสัมพันธ์ลึก",    domain: "Relationship" },
  // Strategic
  { id: "analytical",   name: "Analytical",     nameTH: "นักวิเคราะห์",          domain: "Strategic"    },
  { id: "context",      name: "Context",        nameTH: "นักความเป็นมา",         domain: "Strategic"    },
  { id: "futuristic",   name: "Futuristic",     nameTH: "นักวิสัยทัศน์",         domain: "Strategic"    },
  { id: "ideation",     name: "Ideation",       nameTH: "นักไอเดีย",             domain: "Strategic"    },
  { id: "input",        name: "Input",          nameTH: "นักสะสมความรู้",        domain: "Strategic"    },
  { id: "intellection", name: "Intellection",   nameTH: "นักคิดลึก",             domain: "Strategic"    },
  { id: "learner",      name: "Learner",        nameTH: "นักเรียนรู้",           domain: "Strategic"    },
  { id: "strategic",    name: "Strategic",      nameTH: "นักกลยุทธ์",            domain: "Strategic"    },
] as const;

type Domain = "Executing" | "Influencing" | "Relationship" | "Strategic";

const DOMAIN_CFG: Record<Domain, { hex: string; label: string; labelTH: string; count: number }> = {
  Executing:    { hex: "#6B4E9B", label: "EXECUTING",    labelTH: "การปฏิบัติการ",        count: 9  },
  Influencing:  { hex: "#E8842A", label: "INFLUENCING",  labelTH: "การโน้มน้าว",          count: 8  },
  Relationship: { hex: "#3CA37C", label: "RELATIONSHIP", labelTH: "สร้างความสัมพันธ์",    count: 9  },
  Strategic:    { hex: "#3B73B9", label: "STRATEGIC",    labelTH: "คิดเชิงกลยุทธ์",      count: 8  },
};

interface MemberResult {
  user_name: string;
  top5: string[];
  scores?: Record<string, number>;
}

export default function StrengthsTeamGridPage() {
  const [members, setMembers] = useState<MemberResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ member: string; themeId: string } | null>(null);

  async function fetchData() {
    if (!SUPABASE_ENABLED || !supabase) {
      setError("Supabase ไม่พร้อมใช้งาน");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("strengths_results")
      .select("user_name, top5, scores")
      .order("user_name");
    if (err) {
      setError(err.message);
    } else {
      setMembers((data ?? []) as MemberResult[]);
    }
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  // Count how many members have each theme in top5 (for column summary)
  const themeCount: Record<string, number> = {};
  GRID_THEMES.forEach(t => { themeCount[t.id] = 0; });
  members.forEach(m => { (m.top5 || []).forEach(id => { if (themeCount[id] !== undefined) themeCount[id]++; }); });

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-3 text-gray-400">
      <RefreshCw className="w-5 h-5 animate-spin" />
      <span>กำลังโหลดข้อมูลทีม...</span>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center h-64 gap-3 text-red-400">
      <span>⚠️ {error}</span>
    </div>
  );

  const domains = ["Executing", "Influencing", "Relationship", "Strategic"] as Domain[];

  return (
    <div className="p-4 md:p-6 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
            <Users className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Team Strengths Grid</h1>
            <p className="text-sm text-gray-500">{members.length} คนในทีม Marketing ที่ทำ Quiz แล้ว</p>
          </div>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> รีเฟรช
        </button>
      </div>

      {members.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
          <div className="text-4xl mb-3">📊</div>
          <div className="text-gray-500 font-medium">ยังไม่มีสมาชิกทีมที่ทำ Quiz</div>
          <div className="text-sm text-gray-400 mt-1">เมื่อทีม Marketing ทำ Strengths Quiz แล้ว จะเห็น Grid ที่นี่</div>
        </div>
      ) : (
        <>
          {/* Legend */}
          <div className="flex flex-wrap gap-4 mb-4">
            {domains.map(d => {
              const cfg = DOMAIN_CFG[d];
              return (
                <div key={d} className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: cfg.hex }}>
                  <div className="w-3 h-3 rounded-full" style={{ background: cfg.hex }} />
                  {cfg.labelTH} ({cfg.label})
                </div>
              );
            })}
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <div className="w-3 h-3 rounded-full bg-gray-200" />
              ไม่ใช่ Top 5
            </div>
          </div>

          {/* Scrollable grid */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-auto">
            <table className="border-collapse" style={{ minWidth: "900px" }}>
              <thead>
                {/* Domain header row */}
                <tr>
                  <th className="sticky left-0 bg-white z-20 min-w-[160px] border-b border-r border-gray-100" />
                  {domains.map(d => {
                    const cfg = DOMAIN_CFG[d];
                    const count = GRID_THEMES.filter(t => t.domain === d).length;
                    return (
                      <th
                        key={d}
                        colSpan={count}
                        className="text-center px-2 py-3 border-b border-gray-100 font-black text-sm tracking-wider"
                        style={{ color: cfg.hex, borderBottom: `3px solid ${cfg.hex}` }}
                      >
                        {cfg.label}
                      </th>
                    );
                  })}
                </tr>
                {/* Theme name row (rotated) */}
                <tr>
                  <th className="sticky left-0 bg-white z-20 border-b border-r border-gray-100 px-4 py-2 text-xs text-gray-400 font-medium text-left">
                    สมาชิก
                  </th>
                  {GRID_THEMES.map(theme => {
                    const cfg = DOMAIN_CFG[theme.domain as Domain];
                    return (
                      <th
                        key={theme.id}
                        className="border-b border-gray-50 px-0 pb-2 pt-6"
                        style={{ width: "32px", minWidth: "32px" }}
                        title={theme.nameTH}
                      >
                        <div
                          className="text-xs font-medium whitespace-nowrap"
                          style={{
                            writingMode: "vertical-rl",
                            transform: "rotate(180deg)",
                            color: cfg.hex,
                            height: "90px",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          {theme.name}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {members.map((member, ri) => {
                  const top5Set = new Set(member.top5 || []);
                  return (
                    <tr
                      key={member.user_name}
                      className={cn("hover:bg-gray-50 transition-colors", ri % 2 === 0 ? "" : "bg-slate-50/40")}
                    >
                      {/* Name cell */}
                      <td className="sticky left-0 z-10 bg-inherit border-r border-gray-100 px-4 py-2 font-medium text-sm text-gray-800 whitespace-nowrap">
                        {member.user_name}
                      </td>

                      {/* Dot cells */}
                      {GRID_THEMES.map(theme => {
                        const isTop5 = top5Set.has(theme.id);
                        const cfg = DOMAIN_CFG[theme.domain as Domain];
                        const isHovered = hoveredCell?.member === member.user_name && hoveredCell?.themeId === theme.id;
                        return (
                          <td
                            key={theme.id}
                            className="p-0 text-center border-r border-gray-50 last:border-r-0"
                            onMouseEnter={() => setHoveredCell({ member: member.user_name, themeId: theme.id })}
                            onMouseLeave={() => setHoveredCell(null)}
                            title={isTop5 ? `${member.user_name}: ${theme.nameTH} (Top 5)` : `${member.user_name}: ${theme.nameTH}`}
                          >
                            <div className="flex items-center justify-center h-10">
                              {isTop5 ? (
                                <div
                                  className="rounded-full transition-transform hover:scale-125"
                                  style={{
                                    width: isHovered ? "22px" : "20px",
                                    height: isHovered ? "22px" : "20px",
                                    background: cfg.hex,
                                    boxShadow: isHovered ? `0 0 0 3px ${cfg.hex}33` : "none",
                                  }}
                                />
                              ) : (
                                <div
                                  className="rounded-full"
                                  style={{ width: "10px", height: "10px", background: "#E5E7EB" }}
                                />
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {/* Summary row: count per theme */}
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td className="sticky left-0 bg-gray-50 z-10 border-r border-gray-100 px-4 py-2 text-xs font-bold text-gray-500 whitespace-nowrap">
                    จำนวนคน ↑
                  </td>
                  {GRID_THEMES.map(theme => {
                    const count = themeCount[theme.id] || 0;
                    const cfg = DOMAIN_CFG[theme.domain as Domain];
                    return (
                      <td key={theme.id} className="text-center border-r border-gray-100 last:border-r-0 py-2">
                        {count > 0 ? (
                          <span
                            className="text-xs font-bold"
                            style={{ color: cfg.hex }}
                          >
                            {count}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Domain coverage summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            {domains.map(d => {
              const cfg = DOMAIN_CFG[d];
              const domainThemes = GRID_THEMES.filter(t => t.domain === d);
              const totalDots = domainThemes.reduce((sum, t) => sum + (themeCount[t.id] || 0), 0);
              const covered = domainThemes.filter(t => (themeCount[t.id] || 0) > 0).length;
              return (
                <div key={d} className="bg-white rounded-xl border border-gray-100 p-4">
                  <div className="text-xs font-bold mb-1" style={{ color: cfg.hex }}>{cfg.label}</div>
                  <div className="text-2xl font-black" style={{ color: cfg.hex }}>{totalDots}</div>
                  <div className="text-xs text-gray-400">{covered}/{domainThemes.length} themes ที่มีคนใน Top 5</div>
                </div>
              );
            })}
          </div>

          {/* Info note */}
          <div className="flex items-start gap-2 mt-4 text-xs text-gray-400 bg-gray-50 rounded-xl px-4 py-3">
            <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>Grid แสดงจาก Strengths Quiz ที่สมาชิกทีมทำในระบบ — วงกลมสีใหญ่ = อยู่ใน Top 5 ของคนนั้น · วงกลมเทาเล็ก = ไม่ใช่ Top 5</span>
          </div>
        </>
      )}
    </div>
  );
}
