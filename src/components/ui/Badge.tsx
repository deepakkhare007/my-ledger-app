import { HTMLAttributes } from "react";

type Variant = "outflow" | "inflow" | "low-stock" | "out-of-stock" | "neutral";

const variantClasses: Record<Variant, string> = {
  // outflow = "you'll give" (money owed out), inflow = "you'll get" (money owed in).
  // These reuse the danger/success roles deliberately (see components.md) rather
  // than adding new colour roles for what is the same "needs attention" /
  // "good news" semantic as errors and success states elsewhere.
  //
  // Solid background + on-accent (white) text, not a soft colour-tinted
  // background with colour-on-colour text: an axe scan in e2e/f01-add-
  // transaction.spec.ts caught the tinted version failing WCAG AA (4.02:1,
  // needs 4.5:1) — text-success *does* pass against solid bg/surface
  // (tokens.json's own contrast check), but a 10%-opacity tint sits closer
  // to the text's own hue, which only lowers the ratio further. Solid +
  // white text reuses the already-verified on-accent/accent pattern instead.
  outflow: "bg-danger text-on-accent",
  inflow: "bg-success text-on-accent",
  "low-stock": "bg-warning text-on-accent",
  "out-of-stock": "bg-danger text-on-accent",
  neutral: "bg-border text-muted",
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
