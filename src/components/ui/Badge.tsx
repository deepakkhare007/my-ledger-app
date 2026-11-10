import { HTMLAttributes } from "react";

type Variant = "outflow" | "inflow" | "low-stock" | "out-of-stock" | "neutral";

const variantClasses: Record<Variant, string> = {
  // outflow = "you'll give" (money owed out), inflow = "you'll get" (money owed in).
  // These reuse the danger/success roles deliberately (see components.md) rather
  // than adding new colour roles for what is the same "needs attention" /
  // "good news" semantic as errors and success states elsewhere.
  outflow: "bg-danger/10 text-danger",
  inflow: "bg-success/10 text-success",
  "low-stock": "bg-warning/10 text-warning",
  "out-of-stock": "bg-danger/10 text-danger",
  neutral: "bg-border/40 text-muted",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

// a11y: colour is never the only signal. Callers must pass a text child that
// says the thing out loud ("you'll get ₹240"), not just render a coloured
// dot — this component only supplies the colour and shape.
export function Badge({ variant = "neutral", className = "", ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-pill px-2.5 py-1 text-sm font-semibold ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}
