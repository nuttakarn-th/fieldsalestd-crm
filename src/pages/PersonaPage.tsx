/**
 * PersonaPage.tsx
 *
 * Route: /marketing/persona
 * Data source: Supabase `persona_profiles` table (editable via UI)
 *
 * Tabs:
 *   1. Persona Cards — โปรไฟล์ลูกค้า 6 กลุ่ม (คลิกแก้ไขได้)
 *   2. Survey Dashboard — embed PersonaSurveyDashboard
 */

import React, { useState, useEffect, useRef } from "react";
import { Users, BarChart2, Pencil, X, Plus, Loader2, Save, Camera, ImageOff, Car } from "lucide-react";
import { TbWorld, TbBuildingStore, TbUsersGroup, TbDeviceMobile } from "react-icons/tb";
import { supabase } from "@/lib/supabase";
import PersonaSurveyDashboard from "./PersonaSurveyDashboard";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PersonaProfile {
  id: string;
  tag: string;
  emoji: string;
  name: string;
  age: string;
  job: string;
  color: string;
  badge_color: string;
  travel_with: string;
  frequency: string;
  budget: string;
  destinations: string;
  channels: string[];
  motivations: string[];
  pain_points: string[];
  quote: string;
  type: "b2c" | "b2b" | "trp";
  persona_key?: string;
  sort_order: number;
  // ── Deep Insight fields ──
  decision_trigger?: string;
  booking_lead_time?: string;
  content_formats?: string[];
  price_sensitivity?: string;
  // ── Photo ──
  image_url?: string;
  cover_url?: string;
}

// ─── Color Options ────────────────────────────────────────────────────────────

const COLOR_OPTIONS = [
  { label: "🟡 Amber",   color: "from-amber-400 to-orange-500",   badge: "bg-amber-100 text-amber-800 border-amber-300" },
  { label: "🟢 Green",   color: "from-green-400 to-emerald-600",  badge: "bg-green-100 text-green-800 border-green-300" },
  { label: "🔵 Blue",    color: "from-blue-400 to-indigo-600",    badge: "bg-blue-100 text-blue-800 border-blue-300" },
  { label: "🟣 Purple",  color: "from-purple-400 to-violet-600",  badge: "bg-purple-100 text-purple-800 border-purple-300" },
  { label: "🟠 Orange",  color: "from-orange-400 to-red-500",     badge: "bg-orange-100 text-orange-800 border-orange-300" },
  { label: "🩵 Teal",    color: "from-teal-400 to-cyan-600",      badge: "bg-teal-100 text-teal-800 border-teal-300" },
  { label: "🌸 Pink",    color: "from-pink-400 to-rose-600",      badge: "bg-pink-100 text-pink-800 border-pink-300" },
  { label: "🔷 Indigo",  color: "from-indigo-400 to-blue-700",    badge: "bg-indigo-100 text-indigo-800 border-indigo-300" },
];

// ─── TRP Icon Map ─────────────────────────────────────────────────────────────

const TRP_ICON_MAP: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  TbWorld,
  TbBuildingStore,
  TbUsersGroup,
  TbDeviceMobile,
};

// ─── TRP Persona Card ─────────────────────────────────────────────────────────

function TrpPersonaCard({ p, onEdit }: { p: PersonaProfile; onEdit: (p: PersonaProfile) => void }) {
  const [showDetail, setShowDetail] = useState(false);
  const Icon = TRP_ICON_MAP[p.emoji] ?? TbWorld;

  // Color config per segment tag
  const segmentStyle: Record<string, { bg: string; iconBg: string; iconColor: string; border: string; chipBg: string; chipText: string }> = {
    R1: { bg: "from-blue-500 to-indigo-600",    iconBg: "bg-blue-100",   iconColor: "text-blue-700",   border: "border-blue-200",   chipBg: "bg-blue-700",   chipText: "text-white" },
    R2: { bg: "from-purple-500 to-violet-600",  iconBg: "bg-purple-100", iconColor: "text-purple-700", border: "border-purple-200", chipBg: "bg-purple-700", chipText: "text-white" },
    R3: { bg: "from-green-500 to-emerald-700",  iconBg: "bg-green-100",  iconColor: "text-green-700",  border: "border-green-200",  chipBg: "bg-green-700",  chipText: "text-white" },
    R4: { bg: "from-teal-500 to-cyan-700",      iconBg: "bg-teal-100",   iconColor: "text-teal-700",   border: "border-teal-200",   chipBg: "bg-teal-700",   chipText: "text-white" },
  };
  const style = segmentStyle[p.tag] ?? segmentStyle["R1"];

  return (
    <>
      <div
        className="bg-card border rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-200 group cursor-pointer"
        onClick={() => setShowDetail(true)}
      >
        {/* ── Top banner ── */}
        <div className={`relative bg-gradient-to-br ${style.bg} h-16`}>
          {/* Segment code chip — top-right */}
          <div className="absolute top-2.5 right-2.5 z-10">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${style.chipBg} ${style.chipText}`}>
              {p.tag}
            </span>
          </div>
          {/* Edit button — top-left */}
          <button
            onClick={e => { e.stopPropagation(); onEdit(p); }}
            className="absolute top-2.5 left-2.5 z-10 bg-black/20 hover:bg-black/50 text-white rounded-lg p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
            title="แก้ไข Persona"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ── Icon block — centered, protrudes below banner ── */}
        <div className="flex justify-center -mt-8 pb-0 relative z-10">
          <div className={`w-16 h-16 rounded-2xl border-4 border-card shadow-lg ${style.iconBg} ${style.iconColor} flex items-center justify-center`}>
            <Icon size={32} className={style.iconColor} />
          </div>
        </div>

        {/* ── Body ── */}
        <div className="pt-3 px-4 pb-4 space-y-3">
          {/* Name — centered */}
          <div className="text-center">
            <p className="font-bold text-foreground text-sm leading-tight">{p.name}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">TRP — รถเช่าพร้อมคนขับ</p>
          </div>

          {/* Keyword chips (channels field) */}
          {(p.channels ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1.5 justify-center">
              {(p.channels ?? []).slice(0, 4).map(ch => (
                <span key={ch} className={`text-[10px] px-2 py-0.5 rounded-full border ${style.border} ${style.iconColor} bg-opacity-10`}>
                  {ch}
                </span>
              ))}
            </div>
          )}

          {/* Quote */}
          {p.quote && (
            <p className="text-[11px] text-muted-foreground italic border-l-2 border-primary/30 pl-2.5 leading-relaxed line-clamp-2">
              {p.quote}
            </p>
          )}
        </div>
      </div>

      {/* ── Detail modal ── */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowDetail(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div className={`bg-gradient-to-br ${style.bg} p-6 rounded-t-2xl flex items-center gap-4`}>
              <div className={`w-16 h-16 rounded-2xl ${style.iconBg} ${style.iconColor} flex items-center justify-center shrink-0`}>
                <Icon size={36} />
              </div>
              <div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${style.chipBg} ${style.chipText} mb-1`}>{p.tag}</span>
                <h2 className="text-white font-bold text-xl">{p.name}</h2>
                <p className="text-white/80 text-sm">TRP — รถเช่าพร้อมคนขับ</p>
              </div>
            </div>
            <div className="p-5 space-y-5">
              {p.quote && (
                <blockquote className="text-sm italic border-l-4 border-primary/30 pl-4 py-1 bg-muted/30 rounded-r-lg">{p.quote}</blockquote>
              )}
              {(p.channels ?? []).length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Keywords / ลักษณะเด่น</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {(p.channels ?? []).map(ch => (
                      <span key={ch} className={`text-xs px-2.5 py-1 rounded-full border ${style.border} ${style.iconColor}`}>{ch}</span>
                    ))}
                  </div>
                </div>
              )}
              {(p.motivations ?? []).length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-green-600 mb-2">✅ สิ่งที่ให้ความสำคัญ</h3>
                  <ul className="space-y-1">{(p.motivations ?? []).map(m => <li key={m} className="flex items-start gap-2 text-xs"><span className="text-green-500 mt-0.5">•</span>{m}</li>)}</ul>
                </div>
              )}
              {(p.pain_points ?? []).length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-red-500 mb-2">⚠️ Pain Points</h3>
                  <ul className="space-y-1">{(p.pain_points ?? []).map(pp => <li key={pp} className="flex items-start gap-2 text-xs"><span className="text-red-400 mt-0.5">•</span>{pp}</li>)}</ul>
                </div>
              )}
              {(p.travel_with || p.frequency || p.budget) && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">รายละเอียดการใช้บริการ</h3>
                  <div className="space-y-1.5">
                    {p.travel_with && <div className="flex gap-3"><span className="text-muted-foreground w-28 shrink-0 text-xs">ขนาดกลุ่ม</span><span className="text-foreground text-xs">{p.travel_with}</span></div>}
                    {p.frequency && <div className="flex gap-3"><span className="text-muted-foreground w-28 shrink-0 text-xs">ความถี่</span><span className="text-foreground text-xs">{p.frequency}</span></div>}
                    {p.budget && <div className="flex gap-3"><span className="text-muted-foreground w-28 shrink-0 text-xs">งบ/ทริป</span><span className="text-foreground text-xs">{p.budget}</span></div>}
                  </div>
                </div>
              )}
              {(p.decision_trigger || p.price_sensitivity) && (
                <div className="border-t pt-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-3">🧠 Insight</h3>
                  {p.decision_trigger && (
                    <div className="mb-2">
                      <p className="text-xs text-muted-foreground font-medium mb-1">⚡ Decision Trigger</p>
                      <p className="text-xs text-foreground bg-blue-50 dark:bg-blue-950/30 rounded-lg px-3 py-2">{p.decision_trigger}</p>
                    </div>
                  )}
                  {p.price_sensitivity && (
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-1">💸 Price Sensitivity</p>
                      <p className="text-xs text-foreground bg-muted rounded-lg px-3 py-2">{p.price_sensitivity}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="p-4 border-t flex gap-2">
              <button onClick={() => { setShowDetail(false); onEdit(p); }} className="flex-1 py-2 text-sm border rounded-lg hover:bg-muted transition-colors flex items-center justify-center gap-1.5">
                <Pencil className="w-3.5 h-3.5" /> แก้ไข
              </button>
              <button onClick={() => setShowDetail(false)} className="flex-1 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">ปิด</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Persona Card ─────────────────────────────────────────────────────────────

function PersonaCard({ p, onEdit }: { p: PersonaProfile; onEdit: (p: PersonaProfile) => void }) {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <>
      <div className="bg-card border rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-200 group cursor-pointer" onClick={() => setShowDetail(true)}>

        {/* ── Cover banner ── */}
        <div className={`relative bg-gradient-to-br ${p.color}`} style={{ height: "88px" }}>
          {/* Cover image (if uploaded) */}
          {p.cover_url && (
            <img src={p.cover_url} alt="cover" className="absolute inset-0 w-full h-full object-cover" />
          )}
          {/* gradient tint ด้านบนให้ badge อ่านชัด */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/10 to-transparent" />

          {/* Badge — top-left */}
          <div className="absolute top-2.5 left-3 z-10">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/90 backdrop-blur-sm text-gray-800 shadow-sm border border-white/60">
              {p.tag}
            </span>
          </div>

          {/* Edit button — top-right */}
          <button
            onClick={e => { e.stopPropagation(); onEdit(p); }}
            className="absolute top-2.5 right-2.5 z-10 bg-black/20 hover:bg-black/50 text-white rounded-lg p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
            title="แก้ไข Persona"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>

          {/* ── Avatar — centered, protrudes below cover ── */}
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-9 z-10 w-[72px] h-[72px] rounded-full border-4 border-card shadow-xl overflow-hidden">
            {p.image_url ? (
              <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
            ) : (
              <div className={`w-full h-full flex items-center justify-center text-3xl bg-gradient-to-br ${p.color}`}>
                {p.emoji}
              </div>
            )}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="pt-12 px-4 pb-4 space-y-3">
          {/* Name + age/job — centered */}
          <div className="text-center">
            <p className="font-bold text-foreground text-sm leading-tight">{p.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{p.age} · {p.job}</p>
          </div>

          {/* Stats mini-grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-muted/60 rounded-xl px-3 py-2">
              <p className="text-[10px] text-muted-foreground leading-none mb-1">งบ/คน</p>
              <p className="text-[11px] font-semibold text-foreground leading-snug line-clamp-2">{p.budget}</p>
            </div>
            <div className="bg-muted/60 rounded-xl px-3 py-2">
              <p className="text-[10px] text-muted-foreground leading-none mb-1">เดินทางกับ</p>
              <p className="text-[11px] font-semibold text-foreground leading-snug line-clamp-2">{p.travel_with}</p>
            </div>
          </div>

          {/* Channel chips */}
          <div className="flex flex-wrap gap-1.5 justify-center">
            {(p.channels ?? []).slice(0, 3).map(ch => (
              <span key={ch} className="bg-muted border border-border text-foreground text-[10px] px-2 py-0.5 rounded-full">
                {ch}
              </span>
            ))}
            {(p.channels ?? []).length > 3 && (
              <span className="text-[10px] text-muted-foreground self-center">+{(p.channels ?? []).length - 3}</span>
            )}
          </div>

          {/* Quote */}
          <p className="text-[11px] text-muted-foreground italic border-l-2 border-primary/30 pl-2.5 leading-relaxed line-clamp-2">
            {p.quote}
          </p>
        </div>
      </div>

      {/* Detail modal */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowDetail(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className={`bg-gradient-to-br ${p.color} p-6 rounded-t-2xl`}>
              {p.image_url ? (
                <div className="flex items-center gap-4 mb-3">
                  <img
                    src={p.image_url}
                    alt={p.name}
                    className="w-20 h-20 rounded-full object-cover border-2 border-white/60 shadow-xl shrink-0"
                  />
                  <div>
                    <div className="text-3xl mb-1">{p.emoji}</div>
                    <h2 className="text-white font-bold text-xl">{p.name}</h2>
                    <p className="text-white/80 text-sm">{p.age} · {p.job}</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-5xl mb-3">{p.emoji}</div>
                  <h2 className="text-white font-bold text-xl">{p.name}</h2>
                  <p className="text-white/80 text-sm">{p.age} · {p.job}</p>
                </>
              )}
              <span className={`inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${p.badge_color}`}>{p.tag}</span>
            </div>
            <div className="p-5 space-y-5">
              <blockquote className="text-sm italic border-l-4 border-primary/30 pl-4 py-1 bg-muted/30 rounded-r-lg">{p.quote}</blockquote>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">พฤติกรรมการเดินทาง</h3>
                <div className="space-y-1.5">
                  {[["เดินทางกับ", p.travel_with], ["ความถี่", p.frequency], ["งบประมาณ", p.budget], ["Destination", p.destinations]].map(([k, v]) => (
                    <div key={k} className="flex gap-3">
                      <span className="text-muted-foreground w-24 shrink-0 text-xs">{k}</span>
                      <span className="text-foreground text-xs">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">ช่องทางที่ใช้</h3>
                <div className="flex flex-wrap gap-1.5">
                  {(p.channels ?? []).map(ch => <span key={ch} className="bg-muted text-foreground text-xs px-2.5 py-1 rounded-full border">{ch}</span>)}
                </div>
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-green-600 mb-2">✅ แรงจูงใจ</h3>
                <ul className="space-y-1">{(p.motivations ?? []).map(m => <li key={m} className="flex items-start gap-2 text-xs"><span className="text-green-500 mt-0.5">•</span>{m}</li>)}</ul>
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-red-500 mb-2">⚠️ Pain Points</h3>
                <ul className="space-y-1">{(p.pain_points ?? []).map(pp => <li key={pp} className="flex items-start gap-2 text-xs"><span className="text-red-400 mt-0.5">•</span>{pp}</li>)}</ul>
              </div>

              {/* Deep Insight */}
              {(p.decision_trigger || p.booking_lead_time || p.price_sensitivity || (p.content_formats ?? []).length > 0) && (
                <div className="border-t pt-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-3">🧠 Deep Insight</h3>
                  <div className="space-y-3">
                    {p.decision_trigger && (
                      <div>
                        <p className="text-xs text-muted-foreground font-medium mb-1">⚡ Decision Trigger</p>
                        <p className="text-xs text-foreground bg-blue-50 dark:bg-blue-950/30 rounded-lg px-3 py-2">{p.decision_trigger}</p>
                      </div>
                    )}
                    {p.booking_lead_time && (
                      <div>
                        <p className="text-xs text-muted-foreground font-medium mb-1">📅 Booking Lead Time</p>
                        <p className="text-xs text-foreground bg-muted rounded-lg px-3 py-2">{p.booking_lead_time}</p>
                      </div>
                    )}
                    {p.price_sensitivity && (
                      <div>
                        <p className="text-xs text-muted-foreground font-medium mb-1">💸 Price Sensitivity</p>
                        <p className="text-xs text-foreground bg-muted rounded-lg px-3 py-2">{p.price_sensitivity}</p>
                      </div>
                    )}
                    {(p.content_formats ?? []).length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground font-medium mb-1.5">📱 Content ที่ตอบสนอง</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(p.content_formats ?? []).map(f => (
                            <span key={f} className="bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 text-xs px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-700">{f}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t flex gap-2">
              <button onClick={() => { setShowDetail(false); onEdit(p); }} className="flex-1 py-2 text-sm border rounded-lg hover:bg-muted transition-colors flex items-center justify-center gap-1.5">
                <Pencil className="w-3.5 h-3.5" /> แก้ไข
              </button>
              <button onClick={() => setShowDetail(false)} className="flex-1 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Tag Input (for arrays) ───────────────────────────────────────────────────

function TagInput({ values, onChange, placeholder }: { values: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState("");

  function add() {
    const v = input.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setInput("");
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          className="flex-1 text-sm border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button type="button" onClick={add} className="px-3 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors">
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v, i) => (
          <span key={i} className="inline-flex items-center gap-1 bg-muted text-foreground text-xs px-2.5 py-1 rounded-full border">
            {v}
            <button type="button" onClick={() => onChange(values.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Image Crop Dialog ────────────────────────────────────────────────────────

function ImageCropDialog({
  objectUrl,
  onConfirm,
  onCancel,
}: {
  objectUrl: string;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
}) {
  const VIEWPORT = 240;
  const OUTPUT = 400;
  const [scale, setScale] = useState(1);
  const [ox, setOx] = useState(0);
  const [oy, setOy] = useState(0);
  const drag = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const touch = useRef<{ startX: number; startY: number; ox: number; oy: number; dist?: number; scale?: number } | null>(null);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setScale(s => Math.min(5, Math.max(1, s - e.deltaY * 0.005)));
  };
  const handleMouseDown = (e: React.MouseEvent) => {
    drag.current = { startX: e.clientX, startY: e.clientY, ox, oy };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!drag.current) return;
    setOx(drag.current.ox + e.clientX - drag.current.startX);
    setOy(drag.current.oy + e.clientY - drag.current.startY);
  };
  const handleMouseUp = () => { drag.current = null; };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touch.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, ox, oy };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touch.current = { startX: 0, startY: 0, ox, oy, dist: Math.hypot(dx, dy), scale };
    }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!touch.current) return;
    if (e.touches.length === 1 && touch.current.dist === undefined) {
      setOx(touch.current.ox + e.touches[0].clientX - touch.current.startX);
      setOy(touch.current.oy + e.touches[0].clientY - touch.current.startY);
    } else if (e.touches.length === 2 && touch.current.dist !== undefined) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      setScale(Math.min(5, Math.max(1, (touch.current.scale ?? 1) * (dist / touch.current.dist!))));
    }
  };

  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img) return;
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // base scale to cover the VIEWPORT circle
    const baseScale = Math.max(VIEWPORT / img.naturalWidth, VIEWPORT / img.naturalHeight);
    const totalScale = baseScale * scale;
    const srcW = VIEWPORT / totalScale;
    const srcH = VIEWPORT / totalScale;
    // offset is in viewport px → convert to natural image px
    const imgCenterX = img.naturalWidth  / 2 - ox / totalScale;
    const imgCenterY = img.naturalHeight / 2 - oy / totalScale;
    const srcX = Math.max(0, Math.min(img.naturalWidth  - srcW, imgCenterX - srcW / 2));
    const srcY = Math.max(0, Math.min(img.naturalHeight - srcH, imgCenterY - srcH / 2));
    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, OUTPUT, OUTPUT);
    canvas.toBlob(blob => { if (blob) onConfirm(blob); }, "image/jpeg", 0.92);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative bg-card rounded-2xl shadow-2xl p-6 space-y-4 w-full max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="font-bold text-foreground text-center">✂️ ปรับตำแหน่งรูปโปรไฟล์</h3>
        <p className="text-xs text-muted-foreground text-center">ลากเพื่อเลื่อน · เลื่อน Scroll หรือ Slider เพื่อซูม</p>

        {/* Circular viewport */}
        <div className="flex justify-center">
          <div
            style={{
              width: VIEWPORT, height: VIEWPORT, borderRadius: "50%",
              overflow: "hidden", cursor: "grab", userSelect: "none",
              position: "relative", border: "3px solid hsl(var(--primary))",
              boxShadow: "0 0 0 4px hsl(var(--primary) / 0.15)",
            }}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={() => { touch.current = null; }}
          >
            <img
              ref={imgRef}
              src={objectUrl}
              alt="crop preview"
              style={{
                position: "absolute",
                top: "50%", left: "50%",
                transform: `translate(calc(-50% + ${ox}px), calc(-50% + ${oy}px)) scale(${scale})`,
                transformOrigin: "center center",
                width: "100%", height: "100%",
                objectFit: "cover",
                pointerEvents: "none",
                maxWidth: "none",
              }}
              draggable={false}
            />
          </div>
        </div>

        {/* Zoom slider */}
        <div className="flex items-center gap-3 px-2">
          <span className="text-sm">🔍</span>
          <input
            type="range" min={1} max={5} step={0.05}
            value={scale}
            onChange={e => setScale(Number(e.target.value))}
            className="flex-1 accent-primary h-1.5 rounded cursor-pointer"
          />
          <span className="text-xs text-muted-foreground w-8 text-right">{scale.toFixed(1)}×</span>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="button" onClick={onCancel}
            className="flex-1 h-9 rounded-lg border text-sm hover:bg-muted transition-colors"
          >ยกเลิก</button>
          <button
            type="button" onClick={handleConfirm}
            className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
          >✅ ยืนยัน</button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Form Modal ──────────────────────────────────────────────────────────

function EditModal({ persona, onSave, onClose }: {
  persona: PersonaProfile;
  onSave: (p: PersonaProfile) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<PersonaProfile>({ ...persona });
  const [saving, setSaving] = useState(false);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [imgPreview, setImgPreview] = useState<string | null>(persona.image_url ?? null);
  const [coverPreview, setCoverPreview] = useState<string | null>(persona.cover_url ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  // ── Image crop state ──
  const [cropObjectUrl, setCropObjectUrl] = useState<string | null>(null);

  function set(field: keyof PersonaProfile, value: any) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function uploadToStorage(file: File, path: string): Promise<string> {
    const { error } = await supabase.storage
      .from("persona-images")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw error;
    const { data } = supabase.storage.from("persona-images").getPublicUrl(path);
    return data.publicUrl + `?t=${Date.now()}`;
  }

  // เลือกไฟล์ → เปิด crop dialog (ไม่อัปโหลดตรง)
  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // reset so same file can be re-selected
    const url = URL.createObjectURL(file);
    setCropObjectUrl(url);
  }

  // หลัง crop confirm → อัปโหลด blob เป็น .jpg
  async function handleCropConfirm(blob: Blob) {
    setCropObjectUrl(null);
    setUploadingProfile(true);
    try {
      const file = new File([blob], `${form.id}.jpg`, { type: "image/jpeg" });
      const url = await uploadToStorage(file, `${form.id}.jpg`);
      setImgPreview(url);
      set("image_url", url);
    } catch (err: any) {
      alert("อัปโหลดรูปโปรไฟล์ไม่สำเร็จ: " + err.message);
    } finally {
      setUploadingProfile(false);
    }
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    setUploadingCover(true);
    try {
      const url = await uploadToStorage(file, `${form.id}-cover.${ext}`);
      setCoverPreview(url);
      set("cover_url", url);
    } catch (err: any) {
      alert("อัปโหลดภาพ Cover ไม่สำเร็จ: " + err.message);
    } finally {
      setUploadingCover(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  const selectedColor = COLOR_OPTIONS.find(c => c.color === form.color) ?? COLOR_OPTIONS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Modal header */}
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-card z-10">
          <h2 className="font-bold text-foreground">✏️ แก้ไข Persona — {persona.tag}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-5">
          {/* Basics */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">ข้อมูลพื้นฐาน</h3>
            <div className="grid grid-cols-2 gap-3">
              {([
                ["emoji", "Emoji", "text"],
                ["tag", "ชื่อ Persona (tag)", "text"],
                ["name", "ชื่อสมมติ", "text"],
                ["age", "อายุ", "text"],
                ["job", "อาชีพ", "text"],
              ] as [keyof PersonaProfile, string, string][]).map(([field, label]) => (
                <div key={field} className={field === "job" || field === "tag" ? "col-span-2" : ""}>
                  <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
                  <input
                    value={(form[field] as string) ?? ""}
                    onChange={e => set(field, e.target.value)}
                    className="w-full text-sm border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              ))}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">ประเภท</label>
                <select
                  value={form.type}
                  onChange={e => set("type", e.target.value)}
                  className="w-full text-sm border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="b2c">OB — B2C (ลูกค้าบุคคล)</option>
                  <option value="b2b">OB — B2B (องค์กร)</option>
                  <option value="trp">TRP — รถเช่าพร้อมคนขับ</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">ลำดับแสดง</label>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={e => set("sort_order", Number(e.target.value))}
                  className="w-full text-sm border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
          </div>

          {/* Color picker */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">สีธีม</h3>
            <div className="grid grid-cols-4 gap-2">
              {COLOR_OPTIONS.map(opt => (
                <button
                  key={opt.color}
                  type="button"
                  onClick={() => { set("color", opt.color); set("badge_color", opt.badge); }}
                  className={`rounded-xl h-10 bg-gradient-to-br ${opt.color} border-2 transition-all ${
                    form.color === opt.color ? "border-foreground scale-105" : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                  title={opt.label}
                />
              ))}
            </div>
          </div>

          {/* Travel info */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">พฤติกรรมการเดินทาง</h3>
            <div className="space-y-3">
              {([
                ["travel_with", "เดินทางกับ"],
                ["frequency", "ความถี่"],
                ["budget", "งบประมาณ"],
                ["destinations", "Destination ที่ชอบ"],
              ] as [keyof PersonaProfile, string][]).map(([field, label]) => (
                <div key={field}>
                  <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
                  <input
                    value={(form[field] as string) ?? ""}
                    onChange={e => set(field, e.target.value)}
                    className="w-full text-sm border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Channels */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">ช่องทางที่ใช้</h3>
            <TagInput values={form.channels ?? []} onChange={v => set("channels", v)} placeholder="เช่น Facebook, TikTok แล้วกด Enter" />
          </div>

          {/* Motivations */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-green-600 mb-3">✅ แรงจูงใจ (Motivations)</h3>
            <TagInput values={form.motivations ?? []} onChange={v => set("motivations", v)} placeholder="เหตุผลที่ซื้อ แล้วกด Enter" />
          </div>

          {/* Pain Points */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-red-500 mb-3">⚠️ Pain Points</h3>
            <TagInput values={form.pain_points ?? []} onChange={v => set("pain_points", v)} placeholder="ความกังวล แล้วกด Enter" />
          </div>

          {/* Quote */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Quote ประจำ Persona</h3>
            <textarea
              value={form.quote ?? ""}
              onChange={e => set("quote", e.target.value)}
              rows={2}
              className="w-full text-sm border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              placeholder='"ประโยคที่ represent mindset..."'
            />
          </div>

          {/* Photo Upload */}
          <div className="border-t pt-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">🖼️ รูปภาพ</h3>
            <div className="space-y-5">

              {/* Profile photo */}
              <div>
                <p className="text-xs font-medium text-foreground mb-3">👤 รูปโปรไฟล์ <span className="text-muted-foreground font-normal">(วงกลมกลางการ์ด)</span></p>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full border-2 border-dashed border-border overflow-hidden flex items-center justify-center bg-muted shrink-0">
                    {imgPreview ? (
                      <img src={imgPreview} alt="profile preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageOff className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageSelect} className="hidden" />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingProfile}
                      className="flex items-center gap-2 px-3 py-2 text-xs border rounded-lg hover:bg-muted transition-colors disabled:opacity-60 w-full justify-center"
                    >
                      {uploadingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                      {uploadingProfile ? "กำลังอัปโหลด..." : "เลือกรูปโปรไฟล์"}
                    </button>
                    {form.image_url && (
                      <button type="button" onClick={() => { setImgPreview(null); set("image_url", null); }}
                        className="flex items-center gap-1 text-[11px] text-red-500 hover:text-red-600 w-full justify-center">
                        <X className="w-3 h-3" /> ลบรูปโปรไฟล์
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Cover image */}
              <div>
                <p className="text-xs font-medium text-foreground mb-3">🖼️ ภาพ Cover <span className="text-muted-foreground font-normal">(banner ด้านบนการ์ด)</span></p>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-14 rounded-xl border-2 border-dashed border-border overflow-hidden flex items-center justify-center bg-muted shrink-0">
                    {coverPreview ? (
                      <img src={coverPreview} alt="cover preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${form.color} flex items-center justify-center text-xl opacity-70`}>
                        {form.emoji}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleCoverUpload} className="hidden" />
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      disabled={uploadingCover}
                      className="flex items-center gap-2 px-3 py-2 text-xs border rounded-lg hover:bg-muted transition-colors disabled:opacity-60 w-full justify-center"
                    >
                      {uploadingCover ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                      {uploadingCover ? "กำลังอัปโหลด..." : "เลือกภาพ Cover"}
                    </button>
                    {form.cover_url && (
                      <button type="button" onClick={() => { setCoverPreview(null); set("cover_url", null); }}
                        className="flex items-center gap-1 text-[11px] text-red-500 hover:text-red-600 w-full justify-center">
                        <X className="w-3 h-3" /> ลบภาพ Cover
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground">JPG, PNG, WebP · ไม่เกิน 5MB ต่อภาพ</p>
            </div>
          </div>

          {/* Deep Insight */}
          <div className="border-t pt-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-4">🧠 Deep Insight</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">⚡ Decision Trigger — อะไรที่ทำให้กด "จอง"</label>
                <input
                  value={form.decision_trigger ?? ""}
                  onChange={e => set("decision_trigger", e.target.value)}
                  className="w-full text-sm border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder='เช่น "เห็นโปรโมชั่น จ่ายภายใน 3 วัน"'
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">📅 Booking Lead Time — จองล่วงหน้านานแค่ไหน</label>
                <input
                  value={form.booking_lead_time ?? ""}
                  onChange={e => set("booking_lead_time", e.target.value)}
                  className="w-full text-sm border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder='เช่น "1–2 สัปดาห์ก่อนเดินทาง"'
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">💸 Price Sensitivity</label>
                <input
                  value={form.price_sensitivity ?? ""}
                  onChange={e => set("price_sensitivity", e.target.value)}
                  className="w-full text-sm border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder='เช่น "สูง — เปรียบเทียบราคา 2–3 เจ้า"'
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">📱 Content Format ที่ตอบสนอง</label>
                <TagInput values={form.content_formats ?? []} onChange={v => set("content_formats", v)} placeholder='เช่น "Facebook Post ราคาชัด" แล้วกด Enter' />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t flex gap-3 sticky bottom-0 bg-card">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm border rounded-xl hover:bg-muted transition-colors">
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 text-sm bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 font-medium disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>

      {/* Crop dialog — rendered outside the modal scroll container */}
      {cropObjectUrl && (
        <ImageCropDialog
          objectUrl={cropObjectUrl}
          onConfirm={handleCropConfirm}
          onCancel={() => { URL.revokeObjectURL(cropObjectUrl); setCropObjectUrl(null); }}
        />
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = "cards" | "survey";

export default function PersonaPage() {
  const [tab, setTab] = useState<Tab>("cards");
  const [personas, setPersonas] = useState<PersonaProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PersonaProfile | null>(null);
  const [typeFilter, setTypeFilter] = useState<"all" | "ob" | "trp" | "tk">("all");

  useEffect(() => { loadPersonas(); }, []);

  async function loadPersonas() {
    setLoading(true);
    const { data } = await supabase
      .from("persona_profiles")
      .select("*")
      .order("sort_order", { ascending: true });
    setPersonas((data ?? []) as PersonaProfile[]);
    setLoading(false);
  }

  async function handleSave(p: PersonaProfile) {
    const { error } = await supabase
      .from("persona_profiles")
      .upsert({ ...p, updated_at: new Date().toISOString() }, { onConflict: "id" });
    if (!error) {
      setPersonas(prev => prev.map(x => x.id === p.id ? p : x));
      setEditing(null);
    } else {
      alert("บันทึกไม่สำเร็จ: " + error.message);
    }
  }

  const showOb  = typeFilter === "all" || typeFilter === "ob";
  const showTrp = typeFilter === "all" || typeFilter === "trp";
  const showTk  = typeFilter === "all" || typeFilter === "tk";
  const b2c = showOb  ? personas.filter(p => p.type === "b2c") : [];
  const b2b = showOb  ? personas.filter(p => p.type === "b2b") : [];
  const trp = showTrp ? personas.filter(p => p.type === "trp") : [];
  const tk  = showTk  ? personas.filter(p => p.type === "tk")  : [];
  const trpAll = personas.filter(p => p.type === "trp");

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-lg font-bold text-foreground">🎭 Persona</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                ✈️ OB {personas.filter(p => p.type === "b2c" || p.type === "b2b").length} กลุ่ม · 🚗 TRP {trpAll.length} กลุ่ม · 🎫 TK {personas.filter(p => p.type === "tk").length} กลุ่ม
              </p>
            </div>
            <div className="flex bg-muted rounded-xl p-1 gap-1">
              <button
                onClick={() => setTab("cards")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === "cards" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Users className="w-3.5 h-3.5" /> Persona Cards
              </button>
              <button
                onClick={() => setTab("survey")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === "survey" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                <BarChart2 className="w-3.5 h-3.5" /> Survey Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      {tab === "cards" && (
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">
          {/* Filter — ระดับแผนก */}
          <div className="flex flex-wrap gap-2">
            {([
              { key: "all", label: "ทั้งหมด" },
              { key: "ob",  label: "OB — ทัวร์" },
              { key: "trp", label: "TRP — รถเช่า" },
              { key: "tk",  label: "TK — จองตั๋ว" },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTypeFilter(key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  typeFilter === key
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary/50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {(b2c.length > 0 || b2b.length > 0) && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">✈️</span>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      OB — ทัวร์ต่าง/ในประเทศ
                    </h2>
                    <div className="flex-1 border-t border-border" />
                  </div>
                  {b2c.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2 pl-1">
                        👤 B2C — ลูกค้าบุคคล ({b2c.length} กลุ่ม)
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {b2c.map(p => <PersonaCard key={p.id} p={p} onEdit={setEditing} />)}
                      </div>
                    </div>
                  )}
                  {b2b.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2 pl-1">
                        🏢 B2B — องค์กร ({b2b.length} กลุ่ม)
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {b2b.map(p => <PersonaCard key={p.id} p={p} onEdit={setEditing} />)}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {trp.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Car className="w-3.5 h-3.5 text-muted-foreground" />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      TRP — รถเช่าพร้อมคนขับ
                    </h2>
                    <div className="flex-1 border-t border-border" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {trp.map(p => <TrpPersonaCard key={p.id} p={p} onEdit={setEditing} />)}
                  </div>
                </div>
              )}

              {showTk && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🎫</span>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      TK — จองตั๋ว
                    </h2>
                    <div className="flex-1 border-t border-border" />
                  </div>
                  {tk.length === 0 ? (
                    <div className="border-2 border-dashed border-border rounded-2xl py-10 text-center text-muted-foreground text-xs">
                      ยังไม่มี Persona ของแผนก TK — จะเพิ่มในอนาคต
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {tk.map(p => <TrpPersonaCard key={p.id} p={p} onEdit={setEditing} />)}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <p className="text-xs text-muted-foreground text-center pt-2">
            Hover ที่ card แล้วกด ✏️ เพื่อแก้ไข · คลิก card เพื่อดูรายละเอียดเต็ม
          </p>
        </div>
      )}

      {tab === "survey" && (
        <div className="max-w-5xl mx-auto">
          <PersonaSurveyDashboard />
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editing && (
        <EditModal persona={editing} onSave={handleSave} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
