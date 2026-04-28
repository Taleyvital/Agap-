"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function NavigationProgressInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevPath = useRef(pathname + searchParams.toString());

  useEffect(() => {
    const current = pathname + searchParams.toString();
    if (current === prevPath.current) return;
    prevPath.current = current;

    // Navigation completed — finish the bar
    setWidth(100);
    const finishTimeout = setTimeout(() => {
      setVisible(false);
      setWidth(0);
    }, 300);

    return () => clearTimeout(finishTimeout);
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleStart = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);

      setWidth(0);
      setVisible(true);

      // Slowly advance to 85% — never reaches 100 until navigation completes
      let w = 0;
      intervalRef.current = setInterval(() => {
        w = w < 30 ? w + 10 : w < 60 ? w + 4 : w < 85 ? w + 1 : w;
        setWidth(w);
        if (w >= 85) clearInterval(intervalRef.current!);
      }, 100);
    };

    window.addEventListener("navigationstart", handleStart);
    return () => {
      window.removeEventListener("navigationstart", handleStart);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!visible && width === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 z-[9999] h-[2px] transition-all"
      style={{
        width: `${width}%`,
        backgroundColor: "#7B6FD4",
        transitionDuration: width === 100 ? "200ms" : "400ms",
        transitionTimingFunction: "ease-out",
        opacity: visible ? 1 : 0,
      }}
    />
  );
}

export function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressInner />
    </Suspense>
  );
}
