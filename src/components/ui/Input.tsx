import { InputHTMLAttributes, forwardRef, useId } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  numeric?: boolean; // amount fields: opens the numeric keypad directly
}

// a11y: a real, always-visible <label> above the field — never
// placeholder-as-label, which disappears exactly when a shopkeeper needs to
// confirm what they're filling in mid-transaction.
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, numeric, id, className = "", ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = error ? `${inputId}-error` : undefined;

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm font-medium text-ink">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          inputMode={numeric ? "decimal" : props.inputMode}
          aria-invalid={!!error || undefined}
          aria-describedby={errorId}
          className={`h-12 rounded-sm border bg-bg px-3 text-base text-ink placeholder:text-muted
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? "border-danger" : "border-input"} ${className}`}
          {...props}
        />
        {error && (
          <p id={errorId} className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";
