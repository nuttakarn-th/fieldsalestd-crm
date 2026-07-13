/**
 * AhagramWidget.tsx — 🎮 Floating anagram mini-game for Marketing team
 *
 * Placement: fixed bottom-right on all Marketing pages (via MarketingLayout)
 * Features:
 *   - 35-word pool (Marketing Jargon, Global Destinations, Travel Essentials, Creator & Production)
 *   - Tap-to-spell gameplay (click scrambled letter → slot, click slot → return)
 *   - Keyboard support: type A–Z to place letters, Backspace to undo last
 *   - localStorage persistence for score (☕ Coffee Shots) and trips solved
 *   - 3 Boosters: SHUFFLE (free), HINT (–2☕, locks first letter), SKIP (–1☕)
 *   - Definition overlay after each correct answer or skip
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
interface WordEntry { word: string; cat: string; def: string; }
interface Letter    { char: string; used: boolean; }
interface SlotItem  { char: string; fromIdx: number; isHint?: boolean; }
type Phase = "play" | "win" | "err" | "overlay";

// ── Word Pool (35 entries) ────────────────────────────────────────────────────
const POOL: WordEntry[] = [
  // Marketing Jargon (12)
  { word: "BRIEF",    cat: "Marketing Jargon",    def: "บรีฟ: สรุปขอบเขตงาน (ที่จริงๆ มักแก้ไขบ่อยและไม่ค่อยสั้นเลยสักนิด)" },
  { word: "BUDGET",   cat: "Marketing Jargon",    def: "บัดเจ็ต: งบประมาณ ตัวเลขศักดิ์สิทธิ์ที่ดลให้แคมเปญเกิดขึ้นหรือดับไป" },
  { word: "TARGET",   cat: "Marketing Jargon",    def: "ทาร์เก็ต: กลุ่มเป้าหมาย คนที่เราหวังให้กดจ่ายเงินซื้อแพ็กเกจทัวร์" },
  { word: "REACH",    cat: "Marketing Jargon",    def: "รีช: จำนวนสายตาที่เห็นโพสต์ ยิ่งเยอะยิ่งดีแต่ต้องดู Engagement ด้วยนะ" },
  { word: "BRAND",    cat: "Marketing Jargon",    def: "แบรนด์: ภาพลักษณ์ตัวตนของบริษัท ทำให้ลูกค้าเชื่อมั่นไม่หนีไปคู่แข่ง" },
  { word: "LEAD",     cat: "Marketing Jargon",    def: "ลีด: รายชื่อลูกค้าที่ทิ้งเบอร์หรือไลน์ไว้ให้เซลส์โทรปิดยอดได้เลย" },
  { word: "TRAFFIC",  cat: "Marketing Jargon",    def: "ทราฟฟิก: คนเข้าเว็บ ยิ่งเยอะโอกาสขายตั๋วทัวร์ก็ยิ่งพุ่งปรี๊ด" },
  { word: "FUNNEL",   cat: "Marketing Jargon",    def: "ฟันเนล: กรวยการตลาด รู้จัก → สนใจ → ซื้อ → บอกต่อ ขั้นตอนคลาสสิก" },
  { word: "INSIGHT",  cat: "Marketing Jargon",    def: "อินไซต์: ข้อมูลเชิงลึกลูกค้า กุญแจสำคัญทำโฆษณาให้ตรงใจจริงๆ" },
  { word: "VIRAL",    cat: "Marketing Jargon",    def: "ไวรัล: คอนเทนต์ที่คนแชร์เอง ความฝันสูงสุดของทีม Marketing ทุกคน" },
  { word: "PIXEL",    cat: "Marketing Jargon",    def: "พิกเซล: โค้ดติดตามพฤติกรรมบนเว็บ ช่วยยิง Retargeting ได้แม่นยำ" },
  { word: "CAMPAIGN", cat: "Marketing Jargon",    def: "แคมเปญ: ชุดแผนการตลาดที่จัดทำขึ้นเพื่อเป้าหมายเฉพาะในช่วงเวลาหนึ่ง" },

  // Global Destinations (9)
  { word: "TOKYO",    cat: "Global Destinations", def: "โตเกียว: มหานครแดนปลาดิบ จุดขายทัวร์อันดับหนึ่งของสายกินและช้อป" },
  { word: "PARIS",    cat: "Global Destinations", def: "ปารีส: เมืองแฟชั่น ลูกค้ามักเรียกร้องทัวร์พรีเมียมถ่ายรูปสวย" },
  { word: "BALI",     cat: "Global Destinations", def: "บาหลี: เกาะสวรรค์อินโดนีเซีย ฮิตมากในหมู่สายคาเฟ่และสระว่ายน้ำ" },
  { word: "DUBAI",    cat: "Global Destinations", def: "ดูไบ: เมืองทะเลทรายหรูหรา ทัวร์ขายดีตลอดปีโดยเฉพาะช่วงปลายปี" },
  { word: "SEOUL",    cat: "Global Destinations", def: "โซล: K-Culture + อาหาร + ช้อปปิ้ง เมืองที่ขายง่ายที่สุดในตลาดเกาหลี" },
  { word: "LONDON",   cat: "Global Destinations", def: "ลอนดอน: แลนด์มาร์กเยอะ มักขายควบทัวร์ยุโรปและราคาสูงกว่าเฉลี่ย" },
  { word: "MILAN",    cat: "Global Destinations", def: "มิลาน: เมืองแฟชั่นอิตาลี สายช้อป Outlet จะชอบที่นี่เป็นพิเศษ" },
  { word: "PRAGUE",   cat: "Global Destinations", def: "ปราก: เมืองเทพนิยายเช็กเกีย ขายดีในกลุ่มทัวร์ยุโรปตะวันออก" },
  { word: "TAIPEI",   cat: "Global Destinations", def: "ไทเป: ไต้หวัน บินสั้น อาหารดี ช้อปได้ทั้งวัน ขายง่ายมากสำหรับตลาดไทย" },

  // Travel Essentials (7)
  { word: "TICKET",   cat: "Travel Essentials",   def: "ทิกเก็ต: ตั๋วเดินทาง สิ่งสำคัญที่สุดในทริป ทำหายแล้วซวยแน่นอน!" },
  { word: "FLIGHT",   cat: "Travel Essentials",   def: "ไฟลต์: เที่ยวบิน ปีกวิเศษที่พาคณะทัวร์ข้ามขอบโลกได้ใน 10+ ชั่วโมง" },
  { word: "ROUTE",    cat: "Travel Essentials",   def: "รูต: เส้นทางท่องเที่ยว แผนกำหนดว่าจะไปที่ไหนก่อนหลัง" },
  { word: "HOTEL",    cat: "Travel Essentials",   def: "โฮเทล: ที่พัก จุดนอนพักผ่อนเติมพลังก่อนออกเที่ยวต่อในวันรุ่งขึ้น" },
  { word: "BOOKING",  cat: "Travel Essentials",   def: "บุ๊คกิ้ง: การจอง ขั้นตอนที่ทำให้ฝันกลายเป็นทริปจริงๆ ในที่สุด" },
  { word: "LUGGAGE",  cat: "Travel Essentials",   def: "ลักเกจ: กระเป๋าเดินทาง ยิ่งเยอะยิ่งปวดหลัง แต่ก็ยังอยากพกไปอยู่ดี" },
  { word: "PASSPORT", cat: "Travel Essentials",   def: "พาสปอร์ต: หนังสือเดินทาง เล่มเล็กๆ ที่มีความหมายมากที่สุดในทริป" },

  // Creator & Production (7)
  { word: "CONTENT",   cat: "Creator & Production", def: "คอนเทนต์: รูปและวิดีโอที่ล่อให้ลูกค้าหยุดนิ้วแล้วทัก Inbox หาเรา" },
  { word: "POST",      cat: "Creator & Production", def: "โพสต์: กดปุ่มส่งงานออกสู่โลก เพื่อเริ่มนับ Like, Share, Comment" },
  { word: "RENDER",    cat: "Creator & Production", def: "เรนเดอร์: ช่วงสวดมนต์ขออย่าให้คอมค้าง ก่อนส่งคลิปทัวร์ให้ลูกค้า" },
  { word: "CAPTION",   cat: "Creator & Production", def: "แคปชั่น: คำบรรยายใต้รูป ถ้าเขียนดีทำให้คนกด See More แล้ว Inbox" },
  { word: "HASHTAG",   cat: "Creator & Production", def: "แฮชแท็ก: #คำ ติดท้ายโพสต์ช่วยให้คนค้นหาเจองานของเราได้ง่ายขึ้น" },
  { word: "SCRIPT",    cat: "Creator & Production", def: "สคริปต์: บทพูดสำหรับวิดีโอ ไม่มีสคริปต์ = งานดูกระท่อนกระแท่น" },
  { word: "THUMBNAIL", cat: "Creator & Production", def: "ธัมบ์เนล: หน้าปกวิดีโอ ถ้าไม่ดึงดูดคนจะไม่กดดูไม่ว่าเนื้อหาจะดีแค่ไหน" },
];

// ── Utilities ─────────────────────────────────────────────────────────────────
function shuffleArr<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

function getLS(k: string): number {
  try { return parseInt(localStorage.getItem(k) ?? "0", 10) || 0; } catch { return 0; }
}

const CAT_COLORS: Record<string, string> = {
  "Marketing Jargon":    "#a78bfa",
  "Global Destinations": "#34d399",
  "Travel Essentials":   "#60a5fa",
  "Creator & Production":"#f97316",
};

// ── Component ─────────────────────────────────────────────────────────────────
export function AhagramWidget() {

  // ── Open/close ──────────────────────────────────────────────────────────────
  const [open, setOpen] = useState(false);

  // ── Persistent stats ────────────────────────────────────────────────────────
  const [score, setScore] = useState<number>(() => getLS("ahagram_score"));
  const [trips, setTrips] = useState<number>(() => getLS("ahagram_trips"));
  useEffect(() => { try { localStorage.setItem("ahagram_score", String(score)); } catch {} }, [score]);
  useEffect(() => { try { localStorage.setItem("ahagram_trips",  String(trips));  } catch {} }, [trips]);

  // ── Pool ─────────────────────────────────────────────────────────────────────
  const poolRef = useRef<WordEntry[]>([]);
  const popWord = useCallback((): WordEntry => {
    if (poolRef.current.length === 0) poolRef.current = shuffleArr([...POOL]);
    return poolRef.current.pop()!;
  }, []);

  // ── Level state ──────────────────────────────────────────────────────────────
  const [wd,       setWd]       = useState<WordEntry | null>(null);
  const [ltrs,     setLtrs]     = useState<Letter[]>([]);
  const [slots,    setSlots]    = useState<(SlotItem | null)[]>([]);
  const [hintUsed, setHintUsed] = useState(false);
  const [phase,    setPhase]    = useState<Phase>("play");
  const [skipped,  setSkipped]  = useState(false);
  const [overlayPts, setOverlayPts] = useState(0);
  const [flashMsg, setFlashMsg] = useState<string | null>(null);

  // ── Stale-closure refs (for keyboard handler) ────────────────────────────────
  const ltrsRef    = useRef(ltrs);    ltrsRef.current    = ltrs;
  const slotsRef   = useRef(slots);   slotsRef.current   = slots;
  const phaseRef   = useRef(phase);   phaseRef.current   = phase;
  const wdRef      = useRef(wd);      wdRef.current      = wd;
  const hintUsedRef= useRef(hintUsed); hintUsedRef.current = hintUsed;

  // ── Flash message ────────────────────────────────────────────────────────────
  const flash = useCallback((msg: string) => {
    setFlashMsg(msg);
    setTimeout(() => setFlashMsg(null), 1300);
  }, []);

  // ── Win check (called with computed next-state values) ───────────────────────
  const checkWin = useCallback((
    newSlots: (SlotItem | null)[],
    word: string,
    hint: boolean
  ) => {
    if (!newSlots.every(s => s !== null)) return;
    const guess = newSlots.map(s => s!.char).join("");
    if (guess === word) {
      setPhase("win");
      setTimeout(() => {
        const pts = hint ? 5 : 10;
        setScore(prev => prev + pts);
        setTrips(prev => prev + 1);
        setOverlayPts(pts);
        setSkipped(false);
        setPhase("overlay");
      }, 700);
    } else {
      setPhase("err");
      setTimeout(() => setPhase("play"), 500);
    }
  }, []);

  // ── Start level ──────────────────────────────────────────────────────────────
  const startLevel = useCallback(() => {
    const w = popWord();
    let lArr = shuffleArr(w.word.split("").map(c => ({ char: c, used: false })));
    let tries = 0;
    while (lArr.map(l => l.char).join("") === w.word && tries++ < 10) {
      lArr = shuffleArr(lArr);
    }
    setWd(w);
    setLtrs(lArr);
    setSlots(Array<null>(w.word.length).fill(null));
    setHintUsed(false);
    setPhase("play");
    setSkipped(false);
    setFlashMsg(null);
  }, [popWord]);

  useEffect(() => {
    if (open && !wd) {
      poolRef.current = shuffleArr([...POOL]);
      startLevel();
    }
  }, [open, wd, startLevel]);

  // ── Select scrambled letter → next empty slot ─────────────────────────────
  const selectLetter = useCallback((lIdx: number) => {
    if (phase !== "play" || !wd) return;
    if (ltrs[lIdx].used) return;
    const emptySlot = slots.findIndex(s => s === null);
    if (emptySlot === -1) return;

    const newLtrs  = ltrs.map((l, i) => i === lIdx ? { ...l, used: true } : l);
    const newSlots: (SlotItem | null)[] = slots.map((s, i) =>
      i === emptySlot ? { char: ltrs[lIdx].char, fromIdx: lIdx } : s
    );
    setLtrs(newLtrs);
    setSlots(newSlots);
    checkWin(newSlots, wd.word, hintUsed);
  }, [phase, wd, ltrs, slots, hintUsed, checkWin]);

  // ── Return slot letter → scramble pool ───────────────────────────────────
  const returnSlot = useCallback((sIdx: number) => {
    if (phase !== "play") return;
    const slot = slots[sIdx];
    if (!slot || slot.isHint) return;

    const newLtrs  = ltrs.map((l, i) => i === slot.fromIdx ? { ...l, used: false } : l);
    const withNull = slots.map((s, i) => (i === sIdx ? null : s));
    const filled   = withNull.filter((s): s is SlotItem => s !== null);
    const newSlots = [...filled, ...Array<null>(slots.length - filled.length).fill(null)];
    setLtrs(newLtrs);
    setSlots(newSlots);
  }, [phase, ltrs, slots]);

  // ── Booster: Shuffle ──────────────────────────────────────────────────────
  const doShuffle = useCallback(() => {
    if (phase !== "play") return;
    setLtrs(prev => {
      const freeIdx = prev.map((l, i) => (!l.used ? i : -1)).filter(i => i >= 0);
      if (freeIdx.length <= 1) return prev;
      const shuffledChars = shuffleArr(freeIdx.map(i => prev[i].char));
      const next = [...prev];
      freeIdx.forEach((origI, ni) => { next[origI] = { ...next[origI], char: shuffledChars[ni] }; });
      return next;
    });
    flash("RE-SHUFFLED!");
  }, [phase, flash]);

  // ── Booster: Hint ─────────────────────────────────────────────────────────
  const doHint = useCallback(() => {
    if (phase !== "play" || !wd || hintUsed) return;
    if (score < 2) { flash("NOT ENOUGH ☕"); return; }

    const firstChar = wd.word[0];
    const matchIdx  = ltrs.findIndex(l => l.char === firstChar && !l.used);
    if (matchIdx === -1) return; // first letter already placed by user

    let newLtrs  = [...ltrs];
    let newSlots = [...slots];

    // If slot 0 is occupied (not a hint), return it to the pool
    if (newSlots[0] !== null && !newSlots[0].isHint) {
      const displaced = newSlots[0]!;
      newLtrs[displaced.fromIdx] = { ...newLtrs[displaced.fromIdx], used: false };
      newSlots[0] = null;
      const f = newSlots.filter((s): s is SlotItem => s !== null);
      newSlots = [...f, ...Array<null>(slots.length - f.length).fill(null)];
    }

    // Place hint at slot 0, shift remaining filled slots right
    newLtrs[matchIdx] = { ...newLtrs[matchIdx], used: true };
    const filled = newSlots.filter((s): s is SlotItem => s !== null);
    newSlots = [
      { char: firstChar, fromIdx: matchIdx, isHint: true },
      ...filled,
      ...Array<null>(slots.length - filled.length - 1).fill(null),
    ];

    setLtrs(newLtrs);
    setSlots(newSlots);
    setHintUsed(true);
    setScore(prev => Math.max(0, prev - 2));
    flash("HINT! (–2☕)");
    checkWin(newSlots, wd.word, true);
  }, [phase, wd, ltrs, slots, hintUsed, score, flash, checkWin]);

  // ── Booster: Skip ─────────────────────────────────────────────────────────
  const doSkip = useCallback(() => {
    if (phase !== "play") return;
    setScore(prev => Math.max(0, prev - 1));
    setOverlayPts(-1);
    setSkipped(true);
    setPhase("overlay");
  }, [phase]);

  // ── Reset all ─────────────────────────────────────────────────────────────
  const doReset = useCallback(() => {
    setScore(0);
    setTrips(0);
    poolRef.current = shuffleArr([...POOL]);
    startLevel();
    flash("RESET! 🛫");
  }, [startLevel, flash]);

  // ── Keyboard support ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (phaseRef.current !== "play") return;
      if ((e.target as HTMLElement).closest("input, textarea, [contenteditable]")) return;

      const key = e.key.toUpperCase();

      // Backspace → return last non-hint filled slot
      if (key === "BACKSPACE") {
        e.preventDefault();
        const prevSlots = slotsRef.current;
        const prevLtrs  = ltrsRef.current;
        const lastEntry = [...prevSlots]
          .map((s, i) => ({ s, i }))
          .reverse()
          .find(({ s }) => s !== null && !s.isHint);
        if (!lastEntry) return;
        const { s: slot, i: lastIdx } = lastEntry;
        const newLtrs  = prevLtrs.map((l, i) => i === slot!.fromIdx ? { ...l, used: false } : l);
        const withNull = prevSlots.map((s, i) => (i === lastIdx ? null : s));
        const filled   = withNull.filter((s): s is SlotItem => s !== null);
        const newSlots = [...filled, ...Array<null>(prevSlots.length - filled.length).fill(null)];
        setLtrs(newLtrs);
        setSlots(newSlots);
        return;
      }

      // A–Z → place matching letter
      if (key.length === 1 && /[A-Z]/.test(key)) {
        const prevLtrs  = ltrsRef.current;
        const prevSlots = slotsRef.current;
        const curWd     = wdRef.current;
        if (!curWd) return;

        const matchIdx = prevLtrs.findIndex(l => l.char === key && !l.used);
        if (matchIdx === -1) return;
        const emptySlot = prevSlots.findIndex(s => s === null);
        if (emptySlot === -1) return;

        const newLtrs: Letter[] = prevLtrs.map((l, i) =>
          i === matchIdx ? { ...l, used: true } : l
        );
        const newSlots: (SlotItem | null)[] = prevSlots.map((s, i) =>
          i === emptySlot ? { char: key, fromIdx: matchIdx } : s
        );
        setLtrs(newLtrs);
        setSlots(newSlots);
        checkWin(newSlots, curWd.word, hintUsedRef.current);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, checkWin]);

  // ── Slot class helper ─────────────────────────────────────────────────────
  const slotCls = (slot: SlotItem | null) => {
    const base = "flex items-center justify-center rounded-md border-2 font-mono font-bold select-none transition-all duration-150";
    const size = (wd?.word.length ?? 0) > 7 ? "w-7 h-9 text-sm" : "w-8 h-10 text-base";
    if (phase === "win") return `${base} ${size} border-[#00ffcc] text-[#00ffcc] cursor-default shadow-[0_0_8px_rgba(0,255,204,0.4)]`;
    if (phase === "err") return `${base} ${size} border-red-500 text-red-400 cursor-default`;
    if (slot?.isHint)   return `${base} ${size} border-purple-400 text-purple-300 cursor-default`;
    if (slot)           return `${base} ${size} border-[#ff9900] text-[#ff9900] cursor-pointer hover:border-amber-400`;
    return               `${base} ${size} border-zinc-700 text-zinc-700 cursor-default`;
  };

  const catColor = wd ? (CAT_COLORS[wd.cat] ?? "#a1a1aa") : "#a1a1aa";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Floating Action Button ──────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        title="AHAGRAM Test — คลิกเพื่อเล่น"
        className="fixed bottom-5 right-5 z-50 w-12 h-12 rounded-full bg-zinc-900 border border-zinc-700 shadow-xl flex items-center justify-center hover:bg-zinc-800 hover:scale-105 active:scale-95 transition-all"
      >
        {open
          ? <X className="w-5 h-5 text-zinc-300" />
          : <span className="text-xl leading-none">🎮</span>
        }
        {/* Trips badge */}
        {!open && trips > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-[9px] font-bold text-black flex items-center justify-center leading-none">
            {trips > 9 ? "9+" : trips}
          </span>
        )}
      </button>

      {/* ── Game Widget Card ─────────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed bottom-20 right-5 z-50 flex flex-col overflow-hidden rounded-2xl border border-zinc-800 shadow-2xl"
          style={{ width: 320, height: 520, background: "#111116", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}
        >
          {/* ── Header ─────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800" style={{ background: "rgba(18,18,24,0.9)" }}>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold tracking-widest text-white">AHAGRAM</span>
              <span className="text-[10px] text-zinc-500 font-bold tracking-widest">TEST</span>
              <button
                type="button"
                onClick={doReset}
                title="รีเซ็ตทั้งหมด"
                className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors ml-1 p-0.5"
              >⟳</button>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-[9px] text-zinc-500 leading-none">TRIPS</div>
                <div className="text-sm font-bold leading-none mt-0.5" style={{ color: "#00ffcc" }}>{trips}</div>
              </div>
              <div className="text-center">
                <div className="text-[9px] text-zinc-500 leading-none">COFFEE</div>
                <div className="text-sm font-bold leading-none mt-0.5" style={{ color: "#ff9900" }}>☕{score}</div>
              </div>
            </div>
          </div>

          {/* ── Game Body ──────────────────────────────────────────────── */}
          <div className="flex-1 flex flex-col items-center justify-between px-4 py-3 relative">

            {/* Category */}
            <div className="text-center w-full">
              <span
                className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border"
                style={{ color: catColor, borderColor: catColor + "55", background: catColor + "11" }}
              >
                {wd?.cat ?? "—"}
              </span>
              {/* Flash message */}
              <div
                className="mt-2 text-[11px] font-bold tracking-wide transition-opacity duration-200 h-4"
                style={{ color: "#00ffcc", opacity: flashMsg ? 1 : 0 }}
              >
                {flashMsg ?? ""}
              </div>
            </div>

            {/* Answer Slots */}
            <div className="flex flex-wrap justify-center gap-1.5 my-1 min-h-[44px] w-full">
              {slots.map((slot, i) => (
                <div
                  key={i}
                  className={slotCls(slot)}
                  onClick={() => slot && !slot.isHint && returnSlot(i)}
                  title={slot && !slot.isHint ? "คลิกเพื่อคืนตัวอักษร" : undefined}
                >
                  {slot?.char ?? ""}
                </div>
              ))}
            </div>

            {/* Keyboard hint */}
            <div className="text-[9px] text-zinc-700 text-center">
              พิมพ์ตัวอักษร / กด Backspace เพื่อลบ
            </div>

            {/* Scrambled Letters */}
            <div className="flex flex-wrap justify-center gap-2 w-full py-2">
              {ltrs.map((ltr, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectLetter(i)}
                  disabled={ltr.used}
                  className="flex items-center justify-center rounded-full border font-bold text-base transition-all duration-100 select-none"
                  style={{
                    width: 44,
                    height: 44,
                    background: ltr.used ? "#0c0c0f" : "linear-gradient(145deg,#222226,#151518)",
                    borderColor: ltr.used ? "#18181b" : "#3f3f46",
                    color: ltr.used ? "#18181b" : "#fff",
                    cursor: ltr.used ? "default" : "pointer",
                    boxShadow: ltr.used ? "none" : "2px 3px 6px rgba(0,0,0,0.6)",
                    transform: "scale(1)",
                  }}
                  onMouseDown={e => { if (!ltr.used) (e.currentTarget as HTMLElement).style.transform = "scale(0.92)"; }}
                  onMouseUp={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
                >
                  {ltr.used ? "" : ltr.char}
                </button>
              ))}
            </div>
          </div>

          {/* ── Boosters Footer ─────────────────────────────────────────── */}
          <div className="flex gap-1.5 px-3 py-2.5 border-t border-zinc-800" style={{ background: "#090909" }}>
            {/* Shuffle */}
            <button
              type="button"
              onClick={doShuffle}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 rounded-lg border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-all"
            >
              <span className="text-base">🔄</span>
              <span className="text-[9px] tracking-tighter">SHUFFLE</span>
            </button>
            {/* Hint */}
            <button
              type="button"
              onClick={doHint}
              disabled={hintUsed}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 rounded-lg border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 transition-all"
              style={{ color: hintUsed ? "#3f3f46" : "#a78bfa", opacity: hintUsed ? 0.4 : 1 }}
            >
              <span className="text-base">💡</span>
              <span className="text-[9px] tracking-tighter">HINT (–2☕)</span>
            </button>
            {/* Skip */}
            <button
              type="button"
              onClick={doSkip}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 rounded-lg border border-dashed border-red-950 hover:bg-red-950/20 transition-all"
            >
              <span className="text-base">⏩</span>
              <span className="text-[9px] tracking-tighter text-red-400">SKIP (–1☕)</span>
            </button>
          </div>

          {/* ── Overlay: Success / Skip Definition ──────────────────────── */}
          {phase === "overlay" && wd && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center z-20"
              style={{ background: "rgba(9,9,11,0.97)" }}
            >
              <div className="text-4xl mb-2">{skipped ? "⏩" : "🎉"}</div>

              {/* Category badge */}
              <span
                className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border mb-2"
                style={{ color: catColor, borderColor: catColor + "55", background: catColor + "11" }}
              >
                {wd.cat}
              </span>

              {/* Word */}
              <div
                className="text-2xl font-bold tracking-[0.2em] mb-3"
                style={{ color: skipped ? "#f97316" : "#00ffcc" }}
              >
                {wd.word}
              </div>

              {/* Definition box */}
              <div
                className="w-full rounded-xl border p-4 text-left mb-4"
                style={{ background: "rgba(24,24,27,0.8)", borderColor: "#27272a" }}
              >
                <div className="text-[9px] text-zinc-500 mb-1.5 tracking-wider uppercase">VIBE & MEANING</div>
                <p className="text-xs text-zinc-300 leading-relaxed font-sans">{wd.def}</p>
              </div>

              {/* Score change */}
              <div className="text-xs text-zinc-500 mb-4">
                {skipped
                  ? <span className="text-red-400">–1 ☕ (Skipped)</span>
                  : <span style={{ color: "#00ffcc" }}>+{overlayPts} ☕ {hintUsed ? "(with hint)" : "✦ Perfect!"}</span>
                }
              </div>

              {/* Continue */}
              <button
                type="button"
                onClick={startLevel}
                className="w-full py-2.5 rounded-xl font-extrabold text-xs tracking-wider text-black transition-all active:scale-[0.98]"
                style={{ background: "linear-gradient(to right, #06b6d4, #10b981)" }}
              >
                CONTINUE TO NEXT TRIP 🚀
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
