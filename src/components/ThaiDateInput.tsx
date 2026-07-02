/**
 * ThaiDateInput
 * Displays dates as DD/MM/YYYY while storing/returning YYYY-MM-DD.
 * Wraps a transparent native <input type="date"> so the browser's date picker
 * still works — only the visual display is customised.
 */
import { cn } from "@/lib/utils";
import { CalendarDays } from "lucide-react";
import React, { useRef } from "react";

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
  const inputRef = useRef<HTMLInputElement>(null);

  // Convert YYYY-MM-DD → DD/MM/YYYY for display
  const displayVal = value
    ? value.split("-").reverse().join("/")
    : "";

  // showPicker() triggers the native date picker programmatically.
  // Must be called inside a user-gesture handler (onClick ✓).
  const handleClick = () => {
    if (!disabled && inputRef.current) {
      try {
        inputRef.current.showPicker();
      } catch {
        // Fallback: focus the input so keyboard navigation still works
        inputRef.current.focus();
      }
    }
  };

  return (
    <div
      className={cn(
        "relative flex items-center h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm cursor-pointer select-none",
        disabled && "opacity-50 cursor-not-allowed pointer-events-none",
        className
      )}
      onClick={handleClick}
    >
      {/* Visual display — pointer-events-none so the click bubbles up to the div */}
      <span
        className={cn(
          "flex-1 truncate pointer-events-none",
          !displayVal && "text-muted-foreground"
        )}
      >
        {displayVal || "วว/ดด/ปปปป"}
      </span>
      <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0 pointer-events-none" />

      {/* Native date input: full-size, opacity-0 (NOT sr-only/clipped — showPicker needs the
          element to be in the layout, unclipped, for Chrome to accept the call) */}
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={onChange}
        disabled={disabled}
        min={min}
        max={max}
        required={required}
        id={id}
        name={name}
        tabIndex={-1}
        aria-hidden="true"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        style={{ zIndex: -1 }}
      />
    </div>
  );
}
