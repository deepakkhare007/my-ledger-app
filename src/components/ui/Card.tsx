import { ButtonHTMLAttributes, HTMLAttributes, forwardRef } from "react";

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = "", ...props }, ref) => (
    <div
      ref={ref}
      className={`rounded-lg border border-border bg-surface p-4 shadow-[var(--shadow-card)] ${className}`}
      {...props}
    />
  ),
);
Card.displayName = "Card";

// a11y: a pressable card is a real <button>, never a <div onClick> — so it's
// focusable, has a visible focus ring, and is announced correctly.
export const PressableCard = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className = "", ...props }, ref) => (
    <button
      ref={ref}
      className={`w-full text-left rounded-lg border border-border bg-surface p-4 shadow-[var(--shadow-card)]
        transition hover:bg-border/20 active:bg-border/30
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${className}`}
      {...props}
    />
  ),
);
PressableCard.displayName = "PressableCard";
