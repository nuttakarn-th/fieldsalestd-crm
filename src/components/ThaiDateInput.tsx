/**
 * ThaiDateInput
 * Displays dates as DD/MM/YYYY while storing/returning YYYY-MM-DD.
 * Wraps a transparent native <input type="date"> so the browser's date picker
 * still works — only the visual display is customised.
 */
import { cn } from "@/lib/utils";
import { CalendarDays } from "lucide-react";
import React from "react";

interface ThaiDateInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
}

export function ThaiDateInput({
  className,
  value = "",
  onChange,
  disabled,
  min,
  max,
  required,
  id,
  name,
  ...rest
}: ThaiDateInputProps) {
  // Convert YYYY-MM-DD → DD/MM/YYYY for display
  const displayVal = value
    ? value.split("-").reverse().join("/")
    : "";

  return (
    <div
      className={cn(
        // Default shadcn Input styling
        "relative flex items-center h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {/* Visual display — pointer-events-none so clicks fall through to the native input */}
      <span
        className={cn(
          "flex-1 select-none truncate pointer-events-none",
          !displayVal && "text-muted-foreground"
        )}
      >
        {displayVal || "วว/ดด/ปปปป"}
      </span>
      <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0 pointer-events-none" />

      {/* Transparent native date input — covers the entire component so clicking anywhere opens the picker */}
      <input
        type="date"
        value={value}
        onChange={onChange}
        disabled={disabled}
        min={min}
        max={max}
        required={required}
        id={id}
        name={name}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
      />
    </div>
  );
}
