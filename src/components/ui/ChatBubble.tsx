import type { HTMLAttributes } from "react";

type Variant = "agape" | "user";

const bubbleClass: Record<Variant, string> = {
  agape:
    "rounded-2xl rounded-tl-sm bg-bg-secondary p-4 text-text-primary font-sans",
  user: "rounded-2xl rounded-tr-sm bg-accent p-4 text-white font-sans",
};

interface ChatBubbleProps extends HTMLAttributes<HTMLDivElement> {
  variant: Variant;
}

export function ChatBubble({
  variant,
  className = "",
  children,
  ...props
}: ChatBubbleProps) {
  return (
    <div
      className={`${bubbleClass[variant]} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}
