"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Zap, ChevronDown, LogOut, User } from "lucide-react";

type Props = {
  user: { name?: string | null; email?: string | null; image?: string | null };
  credits: number | null;
  plan: string;
};

function CreditsChip({ credits, plan }: { credits: number | null; plan: string }) {
  if (plan === "PRO" || credits === null) {
    return (
      <Link
        href="/account"
        className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border"
        style={{ background: "rgba(0,255,136,0.15)", borderColor: "rgba(0,255,136,0.4)", color: "#00ff88", textShadow: "0 0 8px rgba(0,255,136,0.5)" }}
      >
        <Zap className="w-3.5 h-3.5" /> Unlimited
      </Link>
    );
  }

  const style =
    credits <= 0
      ? { bg: "rgba(255,77,109,0.15)", border: "rgba(255,77,109,0.4)", color: "#ff4d6d", glow: "rgba(255,77,109,0.5)" }
      : credits <= 20
      ? { bg: "rgba(255,165,0,0.15)", border: "rgba(255,165,0,0.4)", color: "#ffa500", glow: "rgba(255,165,0,0.4)" }
      : { bg: "rgba(0,255,136,0.15)", border: "rgba(0,255,136,0.4)", color: "#00ff88", glow: "rgba(0,255,136,0.5)" };

  return (
    <Link
      href="/account"
      className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border"
      style={{ background: style.bg, borderColor: style.border, color: style.color, textShadow: `0 0 8px ${style.glow}` }}
    >
      <Zap className="w-3.5 h-3.5" /> {credits} credits
    </Link>
  );
}

export default function DashboardHeader({ user, credits, plan }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : (user.email?.[0] ?? "?").toUpperCase();

  return (
    <header className="sticky top-0 z-30 border-b" style={{ background: "rgba(0,0,0,0.5)", borderColor: "rgba(255,255,255,0.08)", backdropFilter: "blur(20px)" }}>
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-base tracking-tight text-white">
          <span style={{ color: "#ff2d9b", textShadow: "0 0 12px rgba(255,45,155,0.6)" }}>⬡</span> PromptForge
        </Link>

        <div className="flex items-center gap-3">
          <CreditsChip credits={credits} plan={plan} />

          {/* Avatar dropdown */}
          <div className="relative" ref={ref}>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-2 rounded-full px-2.5 py-1.5 text-sm transition-colors text-white"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.image} alt="" className="w-6 h-6 rounded-full object-cover" />
              ) : (
                <span className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-semibold"
                  style={{ background: "linear-gradient(135deg, #ff2d9b, #7c3aed)" }}>
                  {initials}
                </span>
              )}
              <span className="hidden sm:block max-w-[120px] truncate text-xs text-white/70">
                {user.name ?? user.email}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-white/40" />
            </button>

            {open && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl shadow-lg py-1 z-50"
                style={{ background: "rgba(10,10,20,0.95)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(20px)" }}>
                <Link
                  href="/account"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                  onClick={() => setOpen(false)}
                >
                  <User className="w-4 h-4" /> Account
                </Link>
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/5 transition-colors"
                  style={{ color: "#ff4d6d" }}
                  onClick={() => signOut({ callbackUrl: "/login" })}
                >
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
