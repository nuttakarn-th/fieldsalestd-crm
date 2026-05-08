import { forwardRef, useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { Textarea, type TextareaProps } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Props = TextareaProps & {
  onValueChange?: (v: string) => void;
};

// Reusable Textarea with voice-to-text mic button overlay (Web Speech API)
export const VoiceTextarea = forwardRef<HTMLTextAreaElement, Props>(function VoiceTextarea(
  { className, onValueChange, value, onChange, ...rest },
  ref,
) {
  const [recording, setRecording] = useState(false);
  const recRef = useRef<any>(null);

  useEffect(() => () => { try { recRef.current?.stop?.(); } catch {} }, []);

  const toggle = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return toast.error("เบราว์เซอร์นี้ไม่รองรับการบันทึกเสียง");
    if (recording) {
      try { recRef.current?.stop(); } catch {}
      setRecording(false);
      return;
    }
    const r = new SR();
    r.lang = "th-TH";
    r.interimResults = false;
    r.continuous = false;
    r.onresult = (e: any) => {
      const transcript = Array.from(e.results).map((x: any) => x[0].transcript).join(" ");
      const next = (value ? `${value} ` : "") + transcript;
      onValueChange?.(next);
      // Bubble synthetic change for forms using onChange
      onChange?.({ target: { value: next } } as any);
    };
    r.onerror = () => { setRecording(false); toast.error("บันทึกเสียงล้มเหลว"); };
    r.onend = () => setRecording(false);
    try { r.start(); recRef.current = r; setRecording(true); } catch { toast.error("เริ่มบันทึกเสียงไม่ได้"); }
  };

  return (
    <div className="relative">
      <Textarea
        ref={ref}
        value={value}
        onChange={(e) => { onChange?.(e); onValueChange?.(e.target.value); }}
        className={cn("pr-10", className)}
        {...rest}
      />
      <button
        type="button"
        onClick={toggle}
        title={recording ? "หยุดบันทึกเสียง" : "บันทึกเสียงเพื่อช่วยพิมพ์"}
        className={cn(
          "absolute top-2 right-2 w-7 h-7 rounded-md flex items-center justify-center transition",
          recording ? "bg-destructive text-destructive-foreground animate-pulse" : "bg-muted hover:bg-muted/80 text-muted-foreground",
        )}
      >
        {recording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
});
