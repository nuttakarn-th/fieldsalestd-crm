/**
 * ContentAssetLibrary.tsx
 * คลัง Copy Template & Hashtag แยกตามประเทศ/ประเภท
 * พร้อม Copy ทันที + เพิ่ม Template ของตัวเอง
 */
import { useState, useMemo } from "react";
import { BookOpen, Copy, Check, Plus, Trash2, X, Hash, Tag } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface AssetTemplate {
  id:        string;
  name:      string;
  category:  string;
  type:      "caption" | "hashtag";
  content:   string;
  isCustom?: boolean;
}

// ─── Static templates ─────────────────────────────────────────────────────────
const STATIC_TEMPLATES: AssetTemplate[] = [
  // ── ญี่ปุ่น ──
  { id: "jp1", name: "ญี่ปุ่น — โปรโมชั่น", category: "ญี่ปุ่น", type: "caption",
    content: "🇯🇵 ญี่ปุ่นรอคุณอยู่!\n✈️ บินตรง ไม่ต้องแวะ\n🌸 ซากุระบาน / ใบไม้แดง / หิมะขาว\n💰 ราคาเริ่มต้น [ราคา] บาท/ท่าน\n📞 โทรหรือ LINE มาสอบถามได้เลยนะคะ Standard Tour" },
  { id: "jp2", name: "ญี่ปุ่น — Hashtag Set", category: "ญี่ปุ่น", type: "hashtag",
    content: "#ญี่ปุ่น #Japan #ทัวร์ญี่ปุ่น #เที่ยวญี่ปุ่น #โตเกียว #โอซาก้า #StandardTour #ท่องเที่ยว #TravelJapan #JapanTravel" },
  { id: "jp3", name: "ญี่ปุ่น — Engagement Post", category: "ญี่ปุ่น", type: "caption",
    content: "💬 ถ้าไปญี่ปุ่น คุณอยากกินอะไรก่อน?\n\nA) ราเม็ง 🍜\nB) ซูชิ 🍣\nC) ทาโกยากิ 🐙\nD) วากิว 🥩\n\nคอมเมนต์บอกกันด้านล่างเลยนะคะ 👇 #ญี่ปุ่น #StandardTour" },

  // ── ยุโรป ──
  { id: "eu1", name: "ยุโรป — โปรโมชั่น", category: "ยุโรป", type: "caption",
    content: "🌍 ยุโรปในฝัน ไปกับ Standard Tour!\n🏰 ประวัติศาสตร์ + สถาปัตยกรรมสุดตระการตา\n🍷 อาหารและไวน์ระดับโลก\n💰 แพ็กเกจเริ่มต้น [ราคา] บาท\n✅ รวมทุกอย่าง ไม่ต้องวางแผนเอง" },
  { id: "eu2", name: "ยุโรป — Hashtag Set", category: "ยุโรป", type: "hashtag",
    content: "#ยุโรป #Europe #ทัวร์ยุโรป #เที่ยวยุโรป #ฝรั่งเศส #อิตาลี #สวิตเซอร์แลนด์ #StandardTour #EuropeTravel #ท่องเที่ยวยุโรป" },

  // ── ไทย/ในประเทศ ──
  { id: "th1", name: "ทัวร์ไทย — ชวนเที่ยว", category: "ทัวร์ไทย", type: "caption",
    content: "🇹🇭 เที่ยวไทย สบายกระเป๋า!\n🌊 ทะเลสวย ภูเขาสดชื่น วัฒนธรรมน่าประทับใจ\n🗓 วันหยุดนี้ไปไหนกัน?\n💰 ราคาเริ่มต้น [ราคา] บาท/ท่าน\n📱 ทักมาเลยค่ะ Standard Tour" },
  { id: "th2", name: "ทัวร์ไทย — Hashtag Set", category: "ทัวร์ไทย", type: "hashtag",
    content: "#เที่ยวไทย #ทัวร์ไทย #TravelThailand #Thailand #ท่องเที่ยวไทย #StandardTour #เที่ยวสบาย #วันหยุด #ทัวร์ราคาดี" },
  { id: "th3", name: "ทัวร์ไทย — Engagement", category: "ทัวร์ไทย", type: "caption",
    content: "🌊 ทะเลไทย vs ภูเขาไทย — คุณชอบแบบไหน?\n\nA) นอนชายหาด ดูพระอาทิตย์ตก 🌅\nB) เดินป่า ดูน้ำตก หายใจสดชื่น 🌿\n\nบอกในคอมเมนต์เลยนะคะ Standard Tour จะพาไป! 🏖" },

  // ── Incentive / องค์กร ──
  { id: "inc1", name: "Incentive Trip — โปรโมชั่น", category: "Incentive", type: "caption",
    content: "🏆 พาทีมไปชาร์จพลัง Incentive Trip!\n🌏 ปลายทาง [ประเทศ/เมือง]\n✅ ออกแบบโปรแกรมเฉพาะบริษัทคุณ\n✅ Team Building + ท่องเที่ยว\n✅ กลุ่มตั้งแต่ 10 คนขึ้นไป\nติดต่อ Standard Tour ได้เลยค่ะ 📞" },
  { id: "inc2", name: "Incentive — Hashtag Set", category: "Incentive", type: "hashtag",
    content: "#IncentiveTrip #ทัวร์กลุ่ม #TeamBuilding #CorporateTravel #ทัวร์บริษัท #StandardTour #Incentive #ทริปบริษัท #กิจกรรมทีม" },

  // ── General ──
  { id: "gen1", name: "General — เปิด Booking", category: "ทั่วไป", type: "caption",
    content: "📅 เปิด Booking แล้ว!\n[ชื่อโปรแกรม]\n🗓 วันเดินทาง: [วันที่]\n💰 ราคา: [ราคา] บาท/ท่าน\n⚠️ ที่นั่งมีจำนวนจำกัด จองด่วนก่อนเต็มนะคะ!\n📞 Standard Tour" },
  { id: "gen2", name: "General — ปิด Booking", category: "ทั่วไป", type: "caption",
    content: "🔴 SOLD OUT!\n[ชื่อโปรแกรม] — ที่นั่งเต็มแล้วค่ะ\n😢 พลาดโปรนี้ไป?\nฝากชื่อไว้ได้เลย จะแจ้งเมื่อมีโปรใหม่นะคะ\n📱 ทักมาเลย Standard Tour" },
  { id: "gen3", name: "General — Review ลูกค้า", category: "ทั่วไป", type: "caption",
    content: "⭐️⭐️⭐️⭐️⭐️ รีวิวจากลูกค้าจริง!\n\n\"[คำรีวิวของลูกค้า]\"\n— คุณ[ชื่อลูกค้า] ทริป [ปลายทาง]\n\nขอบคุณที่ไว้วางใจ Standard Tour นะคะ 🙏💜" },
  { id: "gen4", name: "General — Hashtag Master", category: "ทั่วไป", type: "hashtag",
    content: "#StandardTour #ท่องเที่ยว #ทัวร์ราคาดี #เที่ยวไหนดี #ทัวร์ต่างประเทศ #ทัวร์ในประเทศ #แพ็กเกจทัวร์ #จองทัวร์ #โปรโมชั่น #TravelLife" },
];

const CATEGORIES = ["ทั้งหมด", "ญี่ปุ่น", "ยุโรป", "ทัวร์ไทย", "Incentive", "ทั่วไป"];

// ─── Main component ───────────────────────────────────────────────────────────
export default function ContentAssetLibrary() {
  const [category, setCategory]   = useState("ทั้งหมด");
  const [typeFilter, setTypeFilter] = useState<"all" | "caption" | "hashtag">("all");
  const [copied, setCopied]       = useState<string | null>(null);
  const [customs, setCustoms]     = useState<AssetTemplate[]>([]);
  const [showAdd, setShowAdd]     = useState(false);
  const [newForm, setNewForm]     = useState({ name: "", category: "ทั่วไป", type: "caption" as "caption" | "hashtag", content: "" });

  const allTemplates = useMemo(() => [...STATIC_TEMPLATES, ...customs], [customs]);

  const filtered = useMemo(() =>
    allTemplates.filter((t) => {
      if (category !== "ทั้งหมด" && t.category !== category) return false;
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      return true;
    }),
    [allTemplates, category, typeFilter]
  );

  function copyText(t: AssetTemplate) {
    navigator.clipboard.writeText(t.content);
    setCopied(t.id);
    setTimeout(() => setCopied(null), 2000);
  }

  function addCustom() {
    if (!newForm.name.trim() || !newForm.content.trim()) return;
    const id = `custom-${Date.now()}`;
    setCustoms((prev) => [...prev, { ...newForm, id, isCustom: true }]);
    setNewForm({ name: "", category: "ทั่วไป", type: "caption", content: "" });
    setShowAdd(false);
  }

  function deleteCustom(id: string) {
    setCustoms((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="p-4 sm:p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-glow">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Content Asset Library</h1>
            <p className="text-sm text-muted-foreground">คลัง Copy Template และ Hashtag พร้อมใช้งาน</p>
          </div>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90"
        >
          <Plus className="w-4 h-4" /> เพิ่ม Template
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        {/* Category pills */}
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                category === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >{c}</button>
          ))}
        </div>
        <div className="flex gap-1 ml-auto">
          {(["all", "caption", "hashtag"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                typeFilter === t ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {t === "all" ? "ทั้งหมด" : t === "caption" ? <><Tag className="w-3 h-3" /> Caption</> : <><Hash className="w-3 h-3" /> Hashtag</>}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map((t) => (
          <div key={t.id} className={`bg-card border rounded-xl p-4 space-y-3 ${t.isCustom ? "border-primary/30" : ""}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-sm">{t.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{t.category}</span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${t.type === "caption" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" : "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300"}`}>
                    {t.type === "caption" ? "📝 Caption" : "# Hashtag"}
                  </span>
                  {t.isCustom && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">Custom</span>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => copyText(t)}
                  className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all ${
                    copied === t.id ? "bg-emerald-100 text-emerald-700" : "bg-muted hover:bg-primary/10 hover:text-primary text-muted-foreground"
                  }`}
                >
                  {copied === t.id ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                </button>
                {t.isCustom && (
                  <button onClick={() => deleteCustom(t.id)} className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            <pre className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3 whitespace-pre-wrap leading-relaxed max-h-28 overflow-y-auto font-sans">
              {t.content}
            </pre>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-2 text-center py-10 text-muted-foreground text-sm">ไม่พบ Template ในหมวดนี้</div>
        )}
      </div>

      {/* Add dialog */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-background border rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-lg">เพิ่ม Template ใหม่</h3>
              <button onClick={() => setShowAdd(false)}><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">ชื่อ Template *</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm bg-background" placeholder="เช่น: โปรโมชั่นซากุระ" value={newForm.name} onChange={(e) => setNewForm({ ...newForm, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">หมวดหมู่</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm bg-background" value={newForm.category} onChange={(e) => setNewForm({ ...newForm, category: e.target.value })}>
                    {CATEGORIES.filter((c) => c !== "ทั้งหมด").map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">ประเภท</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm bg-background" value={newForm.type} onChange={(e) => setNewForm({ ...newForm, type: e.target.value as "caption" | "hashtag" })}>
                    <option value="caption">Caption</option>
                    <option value="hashtag">Hashtag</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">เนื้อหา *</label>
                <textarea className="w-full border rounded-lg px-3 py-2 text-sm bg-background resize-none" rows={5} placeholder="วาง Caption หรือ Hashtag ที่นี่..." value={newForm.content} onChange={(e) => setNewForm({ ...newForm, content: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2 p-5 border-t justify-end">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg text-sm bg-muted">ยกเลิก</button>
              <button onClick={addCustom} disabled={!newForm.name.trim() || !newForm.content.trim()} className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground font-semibold disabled:opacity-40">บันทึก</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
