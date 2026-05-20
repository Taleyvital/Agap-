"use client";

import { useEffect, useState } from "react";

export function useKeyboardVisible(): boolean {
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const THRESHOLD = 150; // px — below this delta we ignore (scrolling, etc.)

    function handleResize() {
      const collapsed = window.innerHeight - (vv?.height ?? window.innerHeight);
      setKeyboardVisible(collapsed > THRESHOLD);
    }

    vv.addEventListener("resize", handleResize);
    return () => vv.removeEventListener("resize", handleResize);
  }, []);

  return keyboardVisible;
}
