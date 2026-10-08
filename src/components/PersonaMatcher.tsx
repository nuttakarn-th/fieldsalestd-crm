/**
 * PersonaMatcher.tsx — v2 (4+3 system)
 * Real-time Persona Suggestion Panel สำหรับ Lead Form
 */

import { useMemo } from "react";
import type { Source, BUType } from "@/store/crmStore";
import { scorePersona } from "@/lib/personaScorer";

interface Props {
  source:      Source | "";
  buType:      BUType | "";
  paxStr:      string;
  budget:      string;
  tourType:    string;
  company:     string;
  isFirstTime: boolean;
}

export default function PersonaMatcher({
  source, buType, paxStr, budget, tourType, company, isFirstTime,
}: Props) {
  const result = useMemo(() => {
    if (!source || !buType) return null;
    return scorePersona({
      source:   source as Source,
      buType:   buType as BUType,
      pax:      parseInt(paxStr) || 1,
      budget:   budget   || "",
      tourType: tourType || "",
      company:  company  || "",
      isFirstTime,
    });
  }, [source, buType, paxStr, budget, tourType, company, isFirstTime]);

  if (!result || !result.topMatch) {
    return (
      <div className="mt-3 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-3 text-center">
        <p className="text-xs text-gray-400">
          🧭 กรอก Source และ BU เพื่อดู Persona ที่น่าจะ match
        </p>
      </div>
    );
  }

  const top     = result.topMatch;
  const runners = result.allScores.slice(1, 3).filter((s) => s.score > 0);

  const confColor =
    top.confidence >= 70 ? "text-green-600" :
    top.confidence >= 50 ? "text-yellow-600" : "text-gray-500";

  const deptBadge: Record<string, string> = {
    OB_B2C: "OB · B2C",
    OB_B2B: "OB · B2B",
    TRP:    "TRP",
    TK:     "TK",
  };

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-purple-100 bg-white/60 px-3 py-2">
        <span className="text-sm">🧭</span>
        <span className="text-xs font-semibold text-purple-700">Persona Matcher</span>

        {/* Dept badge */}
        <span className="ml-auto rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-600">
          {deptBadge[result.dept] ?? result.dept}
          {result.isB2B ? " · B2B" : ""}
        </span>

        {/* First-time flag */}
        {result.isFirstTime && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
            🌟 มือใหม่
          </span>
        )}
      </div>

      <div className="px-3 py-2.5">
        {/* Top match */}
        <div className="flex items-start gap-2.5">
          <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${top.color} text-lg shadow-sm`}>
            {top.emoji}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <p className="text-sm font-bold text-gray-800 leading-tight">{top.tag}</p>
              <p className="text-[11px] text-gray-500 truncate">{top.label.split("—")[1]?.trim()}</p>
              <span className={`ml-auto text-[11px] font-medium shrink-0 ${confColor}`}>
                {top.confidence}%
              </span>
            </div>

            {/* Confidence bar */}
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${top.color} transition-all duration-500`}
                style={{ width: `${top.confidence}%` }}
              />
            </div>

            <p className="mt-1 text-[10px] text-gray-400 leading-tight">{top.reason}</p>
          </div>
        </div>

        {/* First-time extra hint */}
        {result.isFirstTime && (
          <div className="mt-2 rounded-lg bg-amber-50 border border-amber-100 px-2.5 py-1.5">
            <p className="text-[11px] font-medium text-amber-700">🌟 มือใหม่ — ปรับ approach</p>
            <p className="text-[10px] text-amber-600 mt-0.5">ส่งรีวิว + FAQ ก่อน · อธิบาย process จองทัวร์ · อย่ารีบ pitch ราคา</p>
          </div>
        )}

        {/* Suggested actions */}
        {top.actions.length > 0 && (
          <div className="mt-2.5 space-y-1">
            {top.actions.slice(0, 2).map((action, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className="mt-0.5 text-[10px] text-purple-400">▸</span>
                <p className="text-[11px] text-gray-600 leading-snug">{action}</p>
              </div>
            ))}
          </div>
        )}

        {/* Runners up */}
        {runners.length > 0 && (
          <div className="mt-2.5 border-t border-purple-100 pt-2">
            <p className="mb-1 text-[10px] font-medium text-gray-400 uppercase tracking-wide">อาจจะเป็น</p>
            <div className="flex flex-wrap gap-1.5">
              {runners.map((r) => (
                <span
                  key={r.tag}
                  className="inline-flex items-center gap-1 rounded-full border border-purple-100 bg-white px-2 py-0.5 text-[11px] text-gray-600"
                >
                  <span>{r.emoji}</span>
                  <span>{r.tag}</span>
                  <span className="text-gray-400">{r.confidence}%</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Low confidence warning */}
        {top.confidence < 50 && (
          <p className="mt-2 text-[10px] text-amber-500 bg-amber-50 rounded-lg px-2 py-1">
            ⚠️ ข้อมูลยังน้อย — กรอก Budget / ประเภททัวร์ เพื่อผลแม่นยำขึ้น
          </p>
        )}
      </div>
    </div>
  );
}
