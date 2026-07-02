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

  // showPicker() is the reliable cross-Chrome way to open the native date picker
  const handleClick = () => {
    if (!disabled) {
      try {
        inputRef.current?.showPicker();
      } catch {
        inputRef.current?.click();
      }
    }
  };

  return (
    <div
      className={cn(
        "relative flex items-center h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm cursor-pointer",
        disabled && "opacity-50 cursor-not-allowed pointer-events-none",
        className
      )}
      onClick={handleClick}
    >
      {/* Visual display */}
      <span
        className={cn(
          "flex-1 select-none truncate",
          !displayVal && "text-muted-foreground"
        )}
      >
        {displayVal || "วว/ดด/ปปปป"}
      </span>
      <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />

      {/* Hidden native date input — sr-only keeps it accessible but invisible */}
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
        className="sr-only"
      />
    </div>
  );
}
