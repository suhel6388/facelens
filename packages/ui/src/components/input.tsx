import * as React from "react";
import { cn } from "../utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, helperText, error, id, type = "text", ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    const helperId = `${inputId}-helper`;
    const errorId = `${inputId}-error`;
    const describedBy = error ? errorId : helperText ? helperId : undefined;

    return (
      <div className="flex w-full flex-col gap-1.5">
        {label ? (
          <label htmlFor={inputId} className="text-sm font-medium text-white">
            {label}
          </label>
        ) : null}
        <input
          id={inputId}
          ref={ref}
          type={type}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy}
          className={cn(
            "h-11 w-full rounded-[9px] border bg-[#101218] px-3.5 text-sm text-white placeholder:text-[#9CA3AF]/70 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6575FF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090D] disabled:cursor-not-allowed disabled:opacity-50",
            error ? "border-[#EF4444]" : "border-[#252A35] hover:border-[#363D4D]",
            className,
          )}
          {...props}
        />
        {error ? (
          <p id={errorId} role="alert" className="text-xs text-[#FCA5A5]">
            {error}
          </p>
        ) : helperText ? (
          <p id={helperId} className="text-xs text-[#9CA3AF]">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = "Input";
