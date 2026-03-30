"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

// ─── Top progress bar ─────────────────────────────────────────────────────────

function RouteProgressBar() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    setVisible(true);
    setFading(false);
    setWidth(0);

    // Animate to 90% quickly, then complete on next tick
    const t1 = setTimeout(() => setWidth(90), 20);
    const t2 = setTimeout(() => setWidth(100), 500);
    const t3 = setTimeout(() => setFading(true), 700);
    const t4 = setTimeout(() => { setVisible(false); setWidth(0); setFading(false); }, 950);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [pathname]);

  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[200] h-[2px] pointer-events-none"
      style={{ opacity: fading ? 0 : 1, transition: "opacity 0.25s ease" }}
    >
      <div
        className="h-full"
        style={{
          width: `${width}%`,
          background: "linear-gradient(90deg, #ff2d9b, #7c3aed, #00ff88)",
          transition: width === 90 ? "width 0.5s ease" : "width 0.15s ease",
          boxShadow: "0 0 8px rgba(255,45,155,0.6)",
        }}
      />
    </div>
  );
}

// ─── Page content transition ──────────────────────────────────────────────────

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <>
      <RouteProgressBar />
      <AnimatePresence mode="wait">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </>
  );
}
