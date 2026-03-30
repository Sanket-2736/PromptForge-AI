"use client";

import { createContext, useContext, useCallback, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, AlertTriangle, Info } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  toast: (opts: Omit<Toast, "id">) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

// ─── Config per type ──────────────────────────────────────────────────────────

const CONFIG: Record<ToastType, { icon: React.ReactNode; color: string; glow: string; bg: string; border: string }> = {
  success: {
    icon: <Check className="w-4 h-4" />,
    color: "#00ff88",
    glow: "rgba(0,255,136,0.3)",
    bg: "rgba(0,255,136,0.08)",
    border: "rgba(0,255,136,0.3)",
  },
  error: {
    icon: <X className="w-4 h-4" />,
    color: "#ff4d6d",
    glow: "rgba(255,77,109,0.3)",
    bg: "rgba(255,77,109,0.08)",
    border: "rgba(255,77,109,0.3)",
  },
  warning: {
    icon: <AlertTriangle className="w-4 h-4" />,
    color: "#ffa500",
    glow: "rgba(255,165,0,0.3)",
    bg: "rgba(255,165,0,0.08)",
    border: "rgba(255,165,0,0.3)",
  },
  info: {
    icon: <Info className="w-4 h-4" />,
    color: "#2d6fff",
    glow: "rgba(45,111,255,0.3)",
    bg: "rgba(45,111,255,0.08)",
    border: "rgba(45,111,255,0.3)",
  },
};

// ─── Single toast item ────────────────────────────────────────────────────────

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const cfg = CONFIG[toast.type];
  const duration = toast.duration ?? 4000;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    if (paused) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setElapsed((e) => e + (Date.now() - startRef.current));
      return;
    }
    startRef.current = Date.now();
    const remaining = duration - elapsed;
    timerRef.current = setTimeout(() => onRemove(toast.id), remaining);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [paused]); // eslint-disable-line react-hooks/exhaustive-deps

  const progress = Math.min(100, (elapsed / duration) * 100);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="relative w-80 rounded-xl overflow-hidden cursor-default select-none"
      style={{
        background: `rgba(10,10,20,0.92)`,
        border: `1px solid ${cfg.border}`,
        backdropFilter: "blur(20px)",
        boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 20px ${cfg.glow}`,
      }}
    >
      {/* Glow accent bar */}
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${cfg.color}, transparent)` }} />

      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        <span className="flex items-center justify-center w-7 h-7 rounded-full shrink-0 mt-0.5"
          style={{ background: cfg.bg, color: cfg.color, boxShadow: `0 0 10px ${cfg.glow}` }}>
          {cfg.icon}
        </span>

        {/* Text */}
        <div className="flex-1 min-w-0 pr-2">
          <p className="text-sm font-semibold text-white leading-snug">{toast.title}</p>
          {toast.message && (
            <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>{toast.message}</p>
          )}
        </div>

        {/* Close */}
        <button
          type="button"
          onClick={() => onRemove(toast.id)}
          className="shrink-0 rounded-md p-1 transition-colors hover:bg-white/10"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 w-full" style={{ background: "rgba(255,255,255,0.05)" }}>
        <motion.div
          className="h-full"
          style={{ background: cfg.color, width: `${100 - progress}%` }}
          animate={{ width: paused ? `${100 - progress}%` : "0%" }}
          transition={{ duration: (duration - elapsed) / 1000, ease: "linear" }}
        />
      </div>
    </motion.div>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const add = useCallback((opts: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev.slice(-4), { ...opts, id }]); // max 5 at once
  }, []);

  const value: ToastContextValue = {
    toast: add,
    success: (title, message) => add({ type: "success", title, message }),
    error:   (title, message) => add({ type: "error",   title, message }),
    warning: (title, message) => add({ type: "warning", title, message }),
    info:    (title, message) => add({ type: "info",    title, message }),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 items-end pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <div key={t.id} className="pointer-events-auto">
              <ToastItem toast={t} onRemove={remove} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
