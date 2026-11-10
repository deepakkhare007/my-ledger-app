import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

// Heights match tokens.json "touch": sm/md/lg never drop below the 44px
// WCAG 2.5.8 minimum, even the smallest button a screen can offer.
const sizeClasses: Record<Size, string> = {
  sm: "h-11 px-4 text-sm", // 44px
  md: "h-12 px-5 text-base", // 48px
  lg: "h-14 px-6 text-lg", // 56px
};

const variantClasses: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:brightness-95 active:brightness-90",
  secondary: "bg-surface text-ink border border-border hover:bg-border/40",
  ghost: "bg-transparent text-ink hover:bg-surface",
  danger: "bg-danger text-on-accent hover:brightness-95 active:brightness-90",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

// a11y: real <button>, visible focus-visible ring, and a loading state that
// keeps the label on screen (plus a visually-hidden " loading" suffix) so a
// screen reader doesn't lose the button's name when a spinner replaces an icon.
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = "primary", size = "md", loading, disabled, className = "", children, ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={`inline-flex items-center justify-center gap-2 rounded-md font-semibold transition
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
        {...props}
      >
        {loading && (
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
        )}
        <span>{children}</span>
        {loading && <span className="sr-only"> loading</span>}
      </button>
    );
  },
);
Button.displayName = "Button";
