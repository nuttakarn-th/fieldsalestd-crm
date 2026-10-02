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

import { useState, useEffect, useRef } from "react";
import { Users, BarChart2, Pencil, X, Plus, Loader2, Save, Camera, ImageOff } from "lucide-react";
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
  type: "b2c" | "b2b";
  sort_order: number;
  // ── Deep Insight fields ──
  decision_trigger?: string;
  booking_lead_time?: string;
  content_formats?: string[];
  price_sensitivity?: string;
  // ── Photo ──
  image_url?: string;
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

// ─── Persona Card ─────────────────────────────────────────────────────────────

function PersonaCard({ p, onEdit }: { p: PersonaProfile; onEdit: (p: PersonaProfile) => void }) {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <>
      <div className="bg-card border rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group">
        {/* Header */}
        <div className={`bg-gradient-to-br ${p.color} p-5 relative`}>
          {p.image_url ? (
            <div className="flex items-end gap-3 mb-2">
              <img
                src={p.image_url}
                alt={p.name}
                className="w-16 h-16 rounded-full object-cover border-2 border-white/60 shadow-lg shrink-0"
              />
              <div className="text-2xl mb-1">{p.emoji}</div>
            </div>
          ) : (
            <div className="text-4xl mb-2">{p.emoji}</div>
          )}
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${p.badge_color}`}>
            {p.tag}
          </span>
          {/* Edit button */}
          <button
            onClick={() => onEdit(p)}
            className="absolute top-3 right-3 bg-white/20 hover:bg-white/40 text-white rounded-lg p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
            title="แก้ไข Persona"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3 cursor-pointer" onClick={() => setShowDetail(true)}>
          <div>
            <p className="font-bold text-foreground text-base">{p.name}</p>
            <p className="text-xs text-muted-foreground">{p.age} · {p.job}</p>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex gap-2">
              <span className="text-muted-foreground w-14 shrink-0">เดินกับ</span>
              <span className="text-foreground">{p.travel_with}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-muted-foreground w-14 shrink-0">งบ/คน</span>
              <span className="text-foreground font-medium">{p.budget}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-muted-foreground w-14 shrink-0">ช่องทาง</span>
              <span className="text-foreground">{(p.channels ?? []).join(", ")}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground italic border-l-2 border-border pl-2.5 leading-relaxed">
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

// ─── Edit Form Modal ──────────────────────────────────────────────────────────

function EditModal({ persona, onSave, onClose }: {
  persona: PersonaProfile;
  onSave: (p: PersonaProfile) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<PersonaProfile>({ ...persona });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imgPreview, setImgPreview] = useState<string | null>(persona.image_url ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function set(field: keyof PersonaProfile, value: any) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${form.id}.${ext}`;
    setUploading(true);
    try {
      const { error: uploadError } = await supabase.storage
        .from("persona-images")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("persona-images").getPublicUrl(path);
      const url = data.publicUrl + `?t=${Date.now()}`; // cache-bust
      setImgPreview(url);
      set("image_url", url);
    } catch (err: any) {
      alert("อัปโหลดรูปไม่สำเร็จ: " + err.message);
    } finally {
      setUploading(false);
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
                  <option value="b2c">B2C — ลูกค้าบุคคล</option>
                  <option value="b2b">B2B — องค์กร</option>
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
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">📸 รูปภาพ Persona</h3>
            <div className="flex items-center gap-4">
              {/* Preview */}
              <div className="w-20 h-20 rounded-full border-2 border-dashed border-border overflow-hidden flex items-center justify-center bg-muted shrink-0">
                {imgPreview ? (
                  <img src={imgPreview} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <ImageOff className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 px-4 py-2 text-sm border rounded-lg hover:bg-muted transition-colors disabled:opacity-60 w-full justify-center"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  {uploading ? "กำลังอัปโหลด..." : "เลือกรูปภาพ"}
                </button>
                {form.image_url && (
                  <button
                    type="button"
                    onClick={() => { setImgPreview(null); set("image_url", null); }}
                    className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 w-full justify-center"
                  >
                    <X className="w-3 h-3" /> ลบรูปภาพ
                  </button>
                )}
                <p className="text-xs text-muted-foreground text-center">JPG, PNG, WebP · ขนาดไม่เกิน 5MB</p>
              </div>
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
  const [typeFilter, setTypeFilter] = useState<"all" | "b2c" | "b2b">("all");

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

  const filtered = personas.filter(p => typeFilter === "all" || p.type === typeFilter);
  const b2c = filtered.filter(p => p.type === "b2c");
  const b2b = filtered.filter(p => p.type === "b2b");

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-lg font-bold text-foreground">🎭 Persona</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                โปรไฟล์กลุ่มลูกค้า Standard Tour — B2C 4 กลุ่ม · B2B 2 กลุ่ม
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
          {/* Filter */}
          <div className="flex gap-2">
            {(["all", "b2c", "b2b"] as const).map(f => (
              <button
                key={f}
                onClick={() => setTypeFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  typeFilter === f
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary/50"
                }`}
              >
                {f === "all" ? "ทั้งหมด" : f === "b2c" ? "B2C — ลูกค้าบุคคล" : "B2B — องค์กร"}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {b2c.length > 0 && (
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                    👤 B2C — ลูกค้าบุคคล ({b2c.length} กลุ่ม)
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {b2c.map(p => <PersonaCard key={p.id} p={p} onEdit={setEditing} />)}
                  </div>
                </div>
              )}
              {b2b.length > 0 && (
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                    🏢 B2B — องค์กร ({b2b.length} กลุ่ม)
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {b2b.map(p => <PersonaCard key={p.id} p={p} onEdit={setEditing} />)}
                  </div>
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
