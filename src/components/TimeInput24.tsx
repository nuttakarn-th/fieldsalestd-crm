import { cn } from "@/lib/utils";

export interface TimeInput24Props {
  value: string;          // "HH:MM"
  onChange: (v: string) => void;
  min?: string;           // "HH:MM" — lower bound (inclusive). Disables earlier options.
  className?: string;
  disabled?: boolean;
}

/** Return current time rounded up to the next 5-minute mark as "HH:MM" */
export function nowHHMM(): string {
  const d = new Date();
  const h = d.getHours();
  const rawM = d.getMinutes();
  const m = rawM % 5 === 0 ? rawM : Math.ceil(rawM / 5) * 5;
  if (m >= 60) {
    const newH = h + 1;
    if (newH >= 24) return "23:55";
    return `${String(newH).padStart(2, "0")}:00`;
  }
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * A 24-hour time selector (HH : MM) using two <select> elements.
 * Always shows 24-hr format regardless of browser/OS locale.
 * Minutes are in 5-minute steps (00, 05, 10 … 55).
 */
export function TimeInput24({ value, onChange, min, className, disabled }: TimeInput24Props) {
  const [hStr, mStr] = value.split(":");
  const hh = Math.min(23, Math.max(0, parseInt(hStr, 10) || 0));
  const mm = Math.min(59, Math.max(0, parseInt(mStr, 10) || 0));
  const [minH, minM] = min ? min.split(":").map(Number) : [0, 0];

  const emit = (newH: number, newM: number) => {
    if (disabled) return;
    newH = Math.max(0, Math.min(23, newH));
    newM = Math.max(0, Math.min(59, newM));
    // Enforce minimum
    if (min) {
      const total = newH * 60 + newM;
      const minTotal = minH * 60 + minM;
      if (total < minTotal) { newH = minH; newM = Math.ceil(minM / 5) * 5 % 60; }
    }
    onChange(`${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`);
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5); // 00,05,...,55

  return (
    <div className={cn(
      "flex items-center h-9 px-3 rounded-md border bg-background text-sm gap-1",
      disabled ? "opacity-50 cursor-not-allowed" : "",
      className,
    )}>
      <select
        value={hh}
        disabled={disabled}
        onChange={(e) => emit(Number(e.target.value), mm)}
        className="bg-transparent outline-none cursor-pointer tabular-nums"
        aria-label="ชั่วโมง"
      >
        {hours.map((v) => (
          <option key={v} value={v} disabled={!!min && v < minH}>
            {String(v).padStart(2, "0")}
          </option>
        ))}
      </select>
      <span className="text-muted-foreground font-semibold select-none">:</span>
      <select
        value={Math.floor(mm / 5) * 5} // snap to nearest 5
        disabled={disabled}
        onChange={(e) => emit(hh, Number(e.target.value))}
        className="bg-transparent outline-none cursor-pointer tabular-nums"
        aria-label="นาที"
      >
        {minutes.map((v) => (
          <option key={v} value={v} disabled={!!min && hh === minH && v < minM}>
            {String(v).padStart(2, "0")}
          </option>
        ))}
      </select>
    </div>
  );
}
