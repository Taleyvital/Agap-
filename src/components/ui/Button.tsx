import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost" | "text";

const variantClass: Record<Variant, string> = {
  primary:
    "bg-accent text-white rounded-3xl px-6 py-3 font-sans transition-opacity hover:opacity-90 active:opacity-80",
  ghost:
    "border border-separator text-text-secondary rounded-3xl px-6 py-3 font-sans transition-colors hover:border-text-tertiary hover:text-text-primary",
  text: "text-accent text-sm tracking-wider uppercase font-sans bg-transparent px-2 py-1",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={`${variantClass[variant]} ${className}`.trim()}
      {...props}
    />
  ),
);

Button.displayName = "Button";
