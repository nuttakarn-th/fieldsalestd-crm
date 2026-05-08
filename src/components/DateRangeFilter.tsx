import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DateRange } from "react-day-picker";

export type RangePreset =
  | "all" | "today" | "week" | "month" | "lastMonth"
  | "q1" | "q2" | "q3" | "q4" | "year" | "custom";

export interface ResolvedRange {
  preset: RangePreset;
  from: Date | null;
  to: Date | null;
  label: string;
}

const PRESETS: { val: RangePreset; label: string }[] = [
  { val: "all", label: "ทุกช่วงเวลา" },
  { val: "today", label: "วันนี้" },
  { val: "week", label: "อาทิตย์นี้" },
  { val: "month", label: "เดือนนี้" },
  { val: "lastMonth", label: "เดือนก่อนหน้า" },
  { val: "q1", label: "ไตรมาส 1" },
  { val: "q2", label: "ไตรมาส 2" },
  { val: "q3", label: "ไตรมาส 3" },
  { val: "q4", label: "ไตรมาส 4" },
  { val: "year", label: "ปีนี้" },
  { val: "custom", label: "เลือกตามปฏิทิน" },
];

export function resolveRange(preset: RangePreset, custom?: DateRange): ResolvedRange {
  const now = new Date();
  const y = now.getFullYear();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
  const label = PRESETS.find((p) => p.val === preset)?.label ?? "";
  switch (preset) {
    case "all": return { preset, from: null, to: null, label };
    case "today": return { preset, from: startOfDay(now), to: endOfDay(now), label };
    case "week": {
      const day = now.getDay() === 0 ? 7 : now.getDay();
      const monday = new Date(y, now.getMonth(), now.getDate() - (day - 1));
      return { preset, from: startOfDay(monday), to: endOfDay(now), label };
    }
    case "month": return { preset, from: new Date(y, now.getMonth(), 1), to: endOfDay(new Date(y, now.getMonth() + 1, 0)), label };
    case "lastMonth": return { preset, from: new Date(y, now.getMonth() - 1, 1), to: endOfDay(new Date(y, now.getMonth(), 0)), label };
    case "q1": return { preset, from: new Date(y, 0, 1), to: endOfDay(new Date(y, 2, 31)), label };
    case "q2": return { preset, from: new Date(y, 3, 1), to: endOfDay(new Date(y, 5, 30)), label };
    case "q3": return { preset, from: new Date(y, 6, 1), to: endOfDay(new Date(y, 8, 30)), label };
    case "q4": return { preset, from: new Date(y, 9, 1), to: endOfDay(new Date(y, 11, 31)), label };
    case "year": return { preset, from: new Date(y, 0, 1), to: endOfDay(new Date(y, 11, 31)), label };
    case "custom":
      return {
        preset,
        from: custom?.from ?? null,
        to: custom?.to ? endOfDay(custom.to) : (custom?.from ? endOfDay(custom.from) : null),
        label: custom?.from ? `${format(custom.from, "d MMM")} - ${custom.to ? format(custom.to, "d MMM") : "..."}` : "เลือกวันที่",
      };
  }
}

export function inRange(date: string | Date | null | undefined, r: ResolvedRange): boolean {
  if (!date) return false;
  if (!r.from || !r.to) return true;
  const d = typeof date === "string" ? new Date(date) : date;
  return d >= r.from && d <= r.to;
}

interface Props {
  value: RangePreset;
  custom?: DateRange;
  onChange: (preset: RangePreset, custom?: DateRange) => void;
}

export function DateRangeFilter({ value, custom, onChange }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <Select value={value} onValueChange={(v) => onChange(v as RangePreset, custom)}>
        <SelectTrigger className="w-44 h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PRESETS.map((p) => <SelectItem key={p.val} value={p.val}>{p.label}</SelectItem>)}
        </SelectContent>
      </Select>
      {value === "custom" && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("h-9 justify-start font-normal", !custom?.from && "text-muted-foreground")}>
              <CalendarIcon className="w-4 h-4 mr-2" />
              {custom?.from ? (
                custom.to ? `${format(custom.from, "d MMM")} - ${format(custom.to, "d MMM yy")}` : format(custom.from, "PPP")
              ) : "เลือกวันที่"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              selected={custom}
              onSelect={(r) => onChange("custom", r)}
              numberOfMonths={2}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}