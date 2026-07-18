/**
 * CampaignCalendar.tsx
 * Yearly Campaign Calendar — แกน Y = เดือน, แกน X = วัน 1–31
 * แต่ละเดือนแสดง Campaign bars ซ้อนกันได้หลายเส้น คนละสี
 */
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type Campaign } from "@/store/campaignStore";

// ── Color map ─────────────────────────────────────────────────────────────────
// แต่ละ Campaign ได้สีตาม target_team ก่อน จากนั้น cycle ถ้าซ้ำ
const TEAM_COLORS: Record<string, string[]> = {
  OB:    ["#f97316", "#ea580c", "#c2410c"],   // orange ramp
  Sales: ["#8b5cf6", "#7c3aed", "#6d28d9"],   // purple ramp
  Both:  ["#0ea5e9", "#0284c7", "#0369a1"],   // blue ramp
};
const FALLBACK_COLORS = ["#10b981", "#059669", "#047857", "#d946ef", "#db2777"];

function getCampaignColor(c: Campaign, indexInTeam: number): string {
  const ramp = TEAM_COLORS[c.target_team];
  if (ramp) return ramp[indexInTeam % ramp.length];
  return FALLBACK_COLORS[indexInTeam % FALLBACK_COLORS.length];
}

// ── Date helpers ──────────────────────────────────────────────────────────────
const TH_MONTHS = [
  "มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
  "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม",
];
const TH_MONTHS_SHORT = [
  "ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.",
  "ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค.",
];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// % ตำแหน่ง left และ width ของ bar ใน row เดือนนั้น
function barGeometry(
  year: number, monthIdx: number,
  startISO: string, endISO: string,
): { left: number; width: number } | null {
  const totalDays = daysInMonth(year, monthIdx);
  const monthStart = new Date(year, monthIdx, 1);
  const monthEnd   = new Date(year, monthIdx, totalDays);

  const cStart = new Date(startISO);
  const cEnd   = new Date(endISO);

  // ตัด Campaign ถ้าอยู่นอกเดือนนี้ทั้งหมด
  if (cEnd < monthStart || cStart > monthEnd) return null;

  const effectiveStart = cStart < monthStart ? monthStart : cStart;
  const effectiveEnd   = cEnd   > monthEnd   ? monthEnd   : cEnd;

  const startDay = effectiveStart.getDate(); // 1-based
  const endDay   = effectiveEnd.getDate();

  const left  = ((startDay - 1) / totalDays) * 100;
  const width = ((endDay - startDay + 1) / totalDays) * 100;
  return { left, width };
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  campaigns: Campaign[];
  onSelect?: (c: Campaign) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function CampaignCalendar({ campaigns, onSelect }: Props) {
  const [year, setYear] = useState(new Date().getFullYear());
  const todayStr = new Date().toISOString().split("T")[0];
  const todayDate = new Date();
  const currentMonthIdx = todayDate.getMonth();
  const currentYear = todayDate.getFullYear();

  // กำหนดสีให้แต่ละ Campaign (ตาม team + index ใน team)
  const campaignColors = useMemo(() => {
    const teamCount: Record<string, number> = {};
    const map: Record<string, string> = {};
    // เรียงตาม start_date ก่อน เพื่อให้สีสม่ำเสมอ
    const sorted = [...campaigns].sort((a, b) => a.start_date.localeCompare(b.start_date));
    for (const c of sorted) {
      const key = c.target_team;
      teamCount[key] = (teamCount[key] ?? 0);
      map[c.id] = getCampaignColor(c, teamCount[key]);
      teamCount[key]++;
    }
    return map;
  }, [campaigns]);

  // สำหรับแต่ละเดือน: รายการ Campaign ที่ overlap กับเดือนนั้น
  const monthData = useMemo(() => {
    return Array.from({ length: 12 }, (_, monthIdx) => {
      const monthStartISO = `${year}-${String(monthIdx + 1).padStart(2, "0")}-01`;
      const lastDay = daysInMonth(year, monthIdx);
      const monthEndISO   = `${year}-${String(monthIdx + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

      const bars = campaigns
        .filter((c) => c.start_date <= monthEndISO && c.end_date >= monthStartISO)
        .map((c) => {
          const geo = barGeometry(year, monthIdx, c.start_date, c.end_date);
          const isContinuedFromPrev = c.start_date < monthStartISO;
          const continuesNext       = c.end_date   > monthEndISO;
          return { c, geo, isContinuedFromPrev, continuesNext };
        })
        .filter((b) => b.geo !== null);

      return { monthIdx, totalDays: lastDay, bars };
    });
  }, [campaigns, year]);

  // today line % ใน row ของเดือนปัจจุบัน
  const todayPct = useMemo(() => {
    if (currentYear !== year) return null;
    const day = todayDate.getDate();
    const total = daysInMonth(year, currentMonthIdx);
    return ((day - 0.5) / total) * 100;
  }, [year, currentYear, currentMonthIdx, todayDate]);

  // legend items
  const legend = [
    { label: "OB Team",   color: TEAM_COLORS.OB[0] },
    { label: "Sales",     color: TEAM_COLORS.Sales[0] },
    { label: "ทีมรวม",    color: TEAM_COLORS.Both[0] },
  ];

  // Day columns header (1–31)
  const DAY_COLS = Array.from({ length: 31 }, (_, i) => i + 1);
  // Weekend days (simplified: col % 7 roughly — for display only)
  const isWeekendCol = (d: number) => {
    // Use first day of year to determine: approximate, not exact
    const dow = new Date(year, 0, d).getDay(); // Jan for rough feel
    return dow === 0 || dow === 6;
  };

  return (
    <div className="space-y-3">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {legend.map((l) => (
            <div key={l.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-3 h-3 rounded-[2px]" style={{ background: l.color }} />
              {l.label}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-7 w-7"
            onClick={() => setYear((y) => y - 1)}>
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <div className="px-4 h-7 rounded-md border bg-card flex items-center font-bold text-sm min-w-[60px] justify-center">
            {year}
          </div>
          <Button variant="outline" size="icon" className="h-7 w-7"
            onClick={() => setYear((y) => y + 1)}>
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* ── Calendar Table ── */}
      <div className="overflow-x-auto rounded-xl border shadow-soft">
        <table className="w-full border-collapse" style={{ minWidth: 700 }}>
          <thead>
            <tr className="bg-muted/60 border-b border-border">
              {/* Month label column */}
              <th className="text-left text-[10px] font-semibold text-muted-foreground px-3 py-2 border-r border-border"
                style={{ minWidth: 72, width: 72 }}>
                เดือน
              </th>
              {/* Day columns */}
              {DAY_COLS.map((d) => (
                <th key={d}
                  className={`text-center text-[9px] font-medium py-1.5 border-r border-border/50
                    ${isWeekendCol(d) ? "text-rose-400/70" : "text-muted-foreground/60"}`}
                  style={{ minWidth: 0, width: `${(100 - 0) / 31}%` }}>
                  {d}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {monthData.map(({ monthIdx, totalDays, bars }) => {
              const isCurrent = year === currentYear && monthIdx === currentMonthIdx;
              // row height ขึ้นกับจำนวน bars (min 1)
              const barH = 15;     // px per bar
              const barGap = 3;    // px gap
              const rowPad = 8;    // top + bottom padding
              const minH = 36;
              const rowH = Math.max(minH, bars.length * (barH + barGap) + rowPad);

              return (
                <tr key={monthIdx}
                  className={`border-b border-border transition-colors
                    ${isCurrent ? "bg-teal-500/5" : "hover:bg-muted/20"}`}>

                  {/* Month label */}
                  <td className={`px-3 border-r border-border align-top pt-2
                    ${isCurrent ? "text-teal-600 font-bold" : "text-muted-foreground font-medium"}`}
                    style={{ fontSize: 11 }}>
                    <div className="flex items-center gap-1">
                      {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />}
                      {TH_MONTHS_SHORT[monthIdx]}
                    </div>
                    <div className="text-[9px] font-normal text-muted-foreground/50 mt-0.5">
                      {totalDays} วัน
                    </div>
                  </td>

                  {/* Bar area — spans all 31 day columns */}
                  <td colSpan={31} className="p-0" style={{ height: rowH }}>
                    <div className="relative w-full" style={{ height: rowH }}>

                      {/* Today line */}
                      {isCurrent && todayPct !== null && (
                        <div
                          className="absolute top-0 bottom-0 w-px bg-rose-400/60 z-10 pointer-events-none"
                          style={{ left: `${todayPct}%` }}
                        />
                      )}

                      {/* Gray out days beyond month's actual length */}
                      {totalDays < 31 && (
                        <div
                          className="absolute top-0 bottom-0 bg-muted/30"
                          style={{
                            left: `${(totalDays / 31) * 100}%`,
                            right: 0,
                          }}
                        />
                      )}

                      {/* Faint day grid lines */}
                      {Array.from({ length: 30 }, (_, i) => (
                        <div key={i}
                          className="absolute top-0 bottom-0 w-px bg-border/30"
                          style={{ left: `${((i + 1) / 31) * 100}%` }}
                        />
                      ))}

                      {/* Campaign bars */}
                      {bars.length === 0 && (
                        <div className="absolute inset-0 flex items-center px-3">
                          <span className="text-[10px] text-muted-foreground/35 italic">ไม่มี Campaign</span>
                        </div>
                      )}

                      {bars.map(({ c, geo, isContinuedFromPrev, continuesNext }, bi) => {
                        if (!geo) return null;
                        const color = campaignColors[c.id] ?? "#94a3b8";
                        const top = rowPad / 2 + bi * (barH + barGap);
                        // ปรับ border-radius ถ้า Campaign ข้ามเดือน
                        const brLeft  = isContinuedFromPrev ? "0" : "3px";
                        const brRight = continuesNext       ? "0" : "3px";

                        return (
                          <button
                            key={c.id}
                            title={c.name}
                            onClick={() => onSelect?.(c)}
                            className="absolute flex items-center px-1.5 text-white cursor-pointer hover:brightness-110 transition-all"
                            style={{
                              left: `${geo.left}%`,
                              width: `${geo.width}%`,
                              top,
                              height: barH,
                              background: color,
                              borderRadius: `${brLeft} ${brRight} ${brRight} ${brLeft}`,
                              fontSize: 9,
                              fontWeight: 600,
                              lineHeight: 1,
                              overflow: "hidden",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {isContinuedFromPrev && (
                              <span className="mr-1 opacity-70">◀</span>
                            )}
                            <span className="truncate">{c.name}</span>
                            {continuesNext && (
                              <span className="ml-1 opacity-70 shrink-0">▶</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
        <span>◀ / ▶ = Campaign ข้ามเดือน</span>
        <span>เส้นแดง = วันนี้</span>
        <span>คลิก bar เพื่อดูหรือแก้ไข Campaign</span>
      </div>
    </div>
  );
}
