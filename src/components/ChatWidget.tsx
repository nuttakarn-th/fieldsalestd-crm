import { useEffect, useRef, useState } from "react";
import { create } from "zustand";
import { MessageSquare, X, Send, Reply, AtSign, CornerDownRight, ImagePlus, Camera, Plus, Smile, Mic, MicOff, Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCRM, SALES_REPS, type ChatAuthor, type ChatMessage } from "@/store/crmStore";
import { useAuth, useCurrentUser } from "@/store/authStore";
import { useChatRead } from "@/store/chatReadStore";
import { compressImage } from "@/lib/imageCompression";
import { toast } from "sonner";

interface ChatUI {
  isOpen: boolean;
  prefillMention: ChatAuthor | null;
  open: (mention?: ChatAuthor) => void;
  close: () => void;
  toggle: () => void;
  clearPrefill: () => void;
}
export const useChatUI = create<ChatUI>((set) => ({
  isOpen: false,
  prefillMention: null,
  open: (mention) => set({ isOpen: true, prefillMention: mention ?? null }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  clearPrefill: () => set({ prefillMention: null }),
}));

const ALL_AUTHORS: ChatAuthor[] = ["Manager", ...SALES_REPS];
const EMOJIS = ["👍","❤️","😂","🎉","🙏","🔥","✅","💯","😊","😢","😮","👏","🚀","💪","🙌","🤝","☕","🌟"];

const COLOR_PALETTE = [
  "bg-pink-500/15 text-pink-600 border-pink-300",
  "bg-amber-500/15 text-amber-700 border-amber-300",
  "bg-purple-500/15 text-purple-600 border-purple-300",
  "bg-sky-500/15 text-sky-600 border-sky-300",
  "bg-emerald-500/15 text-emerald-600 border-emerald-300",
  "bg-rose-500/15 text-rose-600 border-rose-300",
  "bg-indigo-500/15 text-indigo-600 border-indigo-300",
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function authorColor(a: string) {
  if (a === "Manager" || a === "Admin") return "bg-gold/20 text-gold-foreground border-gold/40";
  return COLOR_PALETTE[hashStr(a) % COLOR_PALETTE.length];
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "เมื่อสักครู่";
  if (m < 60) return `${m} นาทีก่อน`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ชม.ก่อน`;
  return new Date(iso).toLocaleDateString("th-TH");
}

function renderText(text: string) {
  const parts = text.split(/(@\S+)/g);
  return parts.map((p, i) =>
    p.startsWith("@") ? (
      <span key={i} className="font-semibold text-primary bg-primary/10 px-1 rounded">{p}</span>
    ) : (<span key={i}>{p}</span>),
  );
}

function NotifPermBtn() {
  const [perm, setPerm] = useState<NotificationPermission>(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "denied",
  );
  if (typeof window === "undefined" || !("Notification" in window)) return null;
  if (perm === "granted") {
    return <span title="เปิดแจ้งเตือนแล้ว" className="p-1"><Bell className="w-4 h-4" /></span>;
  }
  return (
    <button
      onClick={async () => {
        const r = await Notification.requestPermission();
        setPerm(r);
        if (r === "granted") {
          new Notification("Field Sale CRM", { body: "เปิดแจ้งเตือนสำเร็จ! คุณจะได้รับ pop-up เมื่อมีข้อความใหม่" });
        }
      }}
      title="เปิดแจ้งเตือนข้อความ"
      className="p-1 hover:bg-white/10 rounded"
    >
      <BellOff className="w-4 h-4" />
    </button>
  );
}

export function ChatWidget() {
  const { isOpen, toggle, close, prefillMention, clearPrefill } = useChatUI();
  const messages = useCRM((s) => s.chatMessages);
  const addMsg = useCRM((s) => s.addChatMessage);
  const currentRep = useCRM((s) => s.currentRep);
  const currentUser = useCurrentUser();
  const allUsers = useAuth((s) => s.users);
  // Use real user's full_name if logged in, fallback to currentRep enum for compat
  const me: string = currentUser?.full_name || (currentRep === "All" ? "Manager" : currentRep);
  const mentionList: string[] = allUsers.length > 0
    ? allUsers.map((u) => u.full_name).filter((n) => n !== me)
    : ALL_AUTHORS.filter((a) => a !== me);
  const lastReadAt = useChatRead((s) => s.lastReadAt);
  const markRead = useChatRead((s) => s.markRead);

  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [showMention, setShowMention] = useState(false);
  const [showPlus, setShowPlus] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const recRef = useRef<any>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const unread = messages.filter((m) => m.author !== me && new Date(m.created_at).getTime() > new Date(lastReadAt).getTime()).length;

  useEffect(() => {
    if (isOpen && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
      markRead();
    }
  }, [isOpen, messages.length, markRead]);

  useEffect(() => {
    if (prefillMention && isOpen) {
      setText((t) => (t.includes(`@${prefillMention}`) ? t : `@${prefillMention} ${t}`).trimStart());
      clearPrefill();
      setTimeout(() => taRef.current?.focus(), 50);
    }
  }, [prefillMention, isOpen, clearPrefill]);

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed && !pendingImage) return;
    const mentions = mentionList.filter((a) => trimmed.includes(`@${a}`)) as ChatAuthor[];
    addMsg({ author: me as ChatAuthor, text: trimmed, reply_to: replyTo?.id ?? null, mentions, image_url: pendingImage ?? undefined });
    setText(""); setReplyTo(null); setPendingImage(null);
  };

  const insertMention = (a: string) => {
    setText((t) => `${t}${t && !t.endsWith(" ") ? " " : ""}@${a} `);
    setShowMention(false);
    taRef.current?.focus();
  };

  const handleImage = async (f: File | null) => {
    if (!f) return;
    try {
      const r = await compressImage(f, { maxWidth: 1500, maxSizeKB: 500 });
      setPendingImage(r.dataUrl);
      setShowPlus(false);
    } catch { toast.error("ส่งรูปไม่สำเร็จ"); }
  };

  const toggleVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return toast.error("เบราว์เซอร์นี้ไม่รองรับการบันทึกเสียง");
    if (recording) { try { recRef.current?.stop(); } catch {} setRecording(false); return; }
    const r = new SR();
    r.lang = "th-TH"; r.interimResults = false;
    r.onresult = (e: any) => setText((t) => `${t}${t ? " " : ""}${Array.from(e.results).map((x: any) => x[0].transcript).join(" ")}`);
    r.onerror = () => { setRecording(false); toast.error("บันทึกเสียงล้มเหลว"); };
    r.onend = () => setRecording(false);
    try { r.start(); recRef.current = r; setRecording(true); } catch {}
  };

  return (
    <>
      {/* Floating toggle — shown only on mobile (header button handles desktop) */}
      <button
        onClick={toggle}
        className="sm:hidden fixed bottom-3 right-4 z-50 w-9 h-9 rounded-full bg-gradient-coral shadow-glow flex items-center justify-center text-white hover:scale-110 transition-transform"
        aria-label="เปิดแชท"
      >
        {isOpen ? <X className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
        {!isOpen && unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-[10px] font-bold flex items-center justify-center text-white border-2 border-background">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed bottom-4 right-4 z-50 w-[340px] sm:w-96 h-[32rem] bg-card border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between text-white" style={{ background: "linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #3b82f6 100%)" }}>
            <div>
              <p className="font-bold text-sm">Standard Tour Messenger</p>
              <p className="text-[11px] opacity-80">คุณคือ {me} • Mention ด้วย @ชื่อ</p>
            </div>
            <div className="flex items-center gap-1">
              <NotifPermBtn />
              <button onClick={close} className="p-1 hover:bg-white/10 rounded"><X className="w-4 h-4" /></button>
            </div>
          </div>

          <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-3 bg-background/50">
            {messages.map((m) => {
              const replied = m.reply_to ? messages.find((x) => x.id === m.reply_to) : null;
              const isMe = m.author === me;
              return (
                <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className={`px-1.5 py-0.5 rounded border ${authorColor(m.author)}`}>{m.author}</span>
                      <span>{timeAgo(m.created_at)}</span>
                    </div>
                    {replied && (
                      <div className="text-[11px] text-muted-foreground bg-muted/60 px-2 py-1 rounded border-l-2 border-primary/50 max-w-full truncate flex items-center gap-1">
                        <CornerDownRight className="w-3 h-3 shrink-0" />
                        <span className="font-semibold">{replied.author}:</span>
                        <span className="truncate">{replied.text}</span>
                      </div>
                    )}
                    <div className={`px-3 py-2 rounded-2xl text-sm ${isMe ? "bg-gradient-coral text-white rounded-br-sm" : "bg-card border rounded-bl-sm"}`}>
                      {m.image_url && <img src={m.image_url} alt="แนบรูป" className="rounded-lg mb-1 max-w-full max-h-60 object-cover" />}
                      {renderText(m.text)}
                    </div>
                    <button onClick={() => setReplyTo(m)} className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1">
                      <Reply className="w-3 h-3" /> ตอบกลับ
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {replyTo && (
            <div className="px-3 py-2 bg-muted/50 border-t flex items-center justify-between text-xs">
              <span className="truncate"><span className="text-muted-foreground">ตอบกลับ </span><b>{replyTo.author}</b>: {replyTo.text}</span>
              <button onClick={() => setReplyTo(null)} className="text-muted-foreground hover:text-destructive shrink-0 ml-2"><X className="w-3 h-3" /></button>
            </div>
          )}

          {pendingImage && (
            <div className="px-3 py-2 border-t bg-muted/30 flex items-center gap-2">
              <img src={pendingImage} alt="preview" className="w-12 h-12 rounded object-cover" />
              <span className="text-xs text-muted-foreground flex-1">รูปพร้อมส่ง</span>
              <button onClick={() => setPendingImage(null)} className="text-muted-foreground hover:text-destructive"><X className="w-3 h-3" /></button>
            </div>
          )}

          <div className="border-t p-2 bg-card relative">
            {showMention && (
              <div className="absolute bottom-full left-2 right-2 mb-1 bg-card border rounded-lg shadow-elegant overflow-hidden">
                {mentionList.map((a) => (
                  <button key={a} onClick={() => insertMention(a)} className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2">
                    <AtSign className="w-3 h-3 text-primary" /> {a}
                  </button>
                ))}
              </div>
            )}
            {showPlus && (
              <div className="absolute bottom-full left-2 mb-1 bg-card border rounded-lg shadow-elegant overflow-hidden">
                <button onClick={() => fileRef.current?.click()} className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"><ImagePlus className="w-4 h-4 text-primary" /> แนบรูป</button>
                <button onClick={() => cameraRef.current?.click()} className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"><Camera className="w-4 h-4 text-primary" /> ถ่ายภาพ</button>
                <button onClick={() => { setShowMention(true); setShowPlus(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"><AtSign className="w-4 h-4 text-primary" /> Mention</button>
              </div>
            )}
            {showEmoji && (
              <div className="absolute bottom-full right-2 mb-1 bg-card border rounded-lg shadow-elegant p-2 grid grid-cols-6 gap-1 max-w-[14rem]">
                {EMOJIS.map((e) => (
                  <button key={e} onClick={() => { setText((t) => t + e); setShowEmoji(false); }} className="text-xl hover:bg-muted rounded p-1">{e}</button>
                ))}
              </div>
            )}
            <div className="flex gap-1.5 items-end">
              <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={() => { setShowPlus((v) => !v); setShowEmoji(false); }} title="เพิ่ม">
                <Plus className="w-4 h-4" />
              </Button>
              <div className="flex-1 relative">
                <Textarea
                  ref={taRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="พิมพ์ข้อความ..."
                  className="min-h-[40px] max-h-24 resize-none text-sm pr-9"
                  rows={1}
                />
                <button onClick={toggleVoice} title="บันทึกเสียง" className={`absolute right-2 top-2 w-6 h-6 rounded flex items-center justify-center ${recording ? "bg-destructive text-white animate-pulse" : "text-muted-foreground hover:bg-muted"}`}>
                  {recording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                </button>
              </div>
              <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={() => { setShowEmoji((v) => !v); setShowPlus(false); }} title="Emoji">
                <Smile className="w-4 h-4" />
              </Button>
              <Button size="icon" className="h-8 w-8 shrink-0 bg-gradient-coral" onClick={send} title="ส่ง">
                <Send className="w-4 h-4" />
              </Button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { handleImage(e.target.files?.[0] ?? null); e.target.value = ""; }} />
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { handleImage(e.target.files?.[0] ?? null); e.target.value = ""; }} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
