"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function FadeUp({
  children,
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, delay }}
    >
      {children}
    </motion.div>
  );
}
