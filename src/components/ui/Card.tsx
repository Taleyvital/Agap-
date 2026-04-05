import type { HTMLAttributes } from "react";

export function Card({
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl border border-separator bg-bg-secondary p-4 ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}
