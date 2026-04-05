import type { HTMLAttributes } from "react";

interface VerseCardProps extends HTMLAttributes<HTMLDivElement> {
  text: string;
  reference?: string;
}

export function VerseCard({
  text,
  reference,
  className = "",
  ...props
}: VerseCardProps) {
  return (
    <div
      className={`rounded-xl border-l-2 border-accent bg-bg-tertiary p-4 font-serif italic leading-verse text-text-primary ${className}`.trim()}
      {...props}
    >
      <p>{text}</p>
      {reference ? (
        <p className="mt-2 font-sans text-xs not-italic tracking-wide text-text-secondary">
          {reference}
        </p>
      ) : null}
    </div>
  );
}
