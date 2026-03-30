"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

// ── Animation variants ────────────────────────────────────────────────────────
const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 48 : -48,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -48 : 48,
    opacity: 0,
    transition: { duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

// ── Google button ─────────────────────────────────────────────────────────────
function GoogleButton({ loading }: { loading: boolean }) {
  const [pending, setPending] = useState(false);

  async function handleGoogle() {
    setPending(true);
    await signIn("google", { callbackUrl: "/dashboard" });
  }

  return (
    <button
      type="button"
      onClick={handleGoogle}
      disabled={loading || pending}
      className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? (
        <Spinner />
      ) : (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
          <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
      )}
      Continue with Google
    </button>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────
function Divider() {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px bg-white/10" />
      <span className="text-xs text-white/30 font-medium">or</span>
      <div className="flex-1 h-px bg-white/10" />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface OtpAuthFormProps {
  title: string;
  subtitle: string;
  footerText: string;
  footerLinkText: string;
  footerLinkHref: string;
}

export default function OtpAuthForm({
  title,
  subtitle,
  footerText,
  footerLinkText,
  footerLinkHref,
}: OtpAuthFormProps) {
  const router = useRouter();

  const [step, setStep] = useState<"email" | "otp">("email");
  const [direction, setDirection] = useState(1);
  const [email, setEmail] = useState("");
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // Focus first OTP box when step changes
  useEffect(() => {
    if (step === "otp") {
      setTimeout(() => inputRefs.current[0]?.focus(), 320);
    }
  }, [step]);

  // ── Send OTP ────────────────────────────────────────────────────────────────
  const sendOtp = useCallback(async (targetEmail: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", email: targetEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send code");
      setDirection(1);
      setStep("otp");
      setCountdown(60);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Handle email submit ─────────────────────────────────────────────────────
  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    await sendOtp(trimmed);
  }

  // ── Handle OTP digit input ──────────────────────────────────────────────────
  function handleDigitChange(index: number, value: string) {
    const char = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = char;
    setDigits(next);
    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleDigitKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handleDigitPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = [...digits];
    for (let i = 0; i < 6; i++) next[i] = pasted[i] ?? "";
    setDigits(next);
    const focusIdx = Math.min(pasted.length, 5);
    inputRefs.current[focusIdx]?.focus();
  }

  // ── Verify OTP ──────────────────────────────────────────────────────────────
  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    const code = digits.join("");
    if (code.length < 6) {
      setError("Please enter all 6 digits");
      return;
    }
    setLoading(true);
    setError("");
    try {
      // First verify via our API (marks OTP as used, upserts user)
      const res = await fetch("/api/email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", email: email.trim().toLowerCase(), code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");

      // Then sign in via next-auth credentials
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        code,
        redirect: false,
      });

      if (result?.error) throw new Error("Sign-in failed. Please try again.");
      router.push("/dashboard");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  // ── Back to email ───────────────────────────────────────────────────────────
  function handleBack() {
    setDirection(-1);
    setStep("email");
    setDigits(["", "", "", "", "", ""]);
    setError("");
  }

  // ── Resend ──────────────────────────────────────────────────────────────────
  async function handleResend() {
    if (countdown > 0) return;
    setDigits(["", "", "", "", "", ""]);
    await sendOtp(email.trim().toLowerCase());
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4">
      <div className="w-full max-w-[400px]">

        {/* Logo */}
        <div className="text-center mb-8">
          <p className="text-2xl font-bold text-white tracking-tight">
            Prompt<span className="text-[#534AB7]">Forge</span>
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#111111] border border-white/[0.08] rounded-2xl p-8 shadow-2xl overflow-hidden relative">

          <AnimatePresence mode="wait" custom={direction}>
            {step === "email" ? (
              <motion.div
                key="email-step"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
                {/* Step: Email */}
                <h1 className="text-xl font-semibold text-white mb-1">{title}</h1>
                <p className="text-sm text-white/50 mb-6">{subtitle}</p>

                <GoogleButton loading={loading} />
                <Divider />

                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5">
                      Email address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      autoFocus
                      disabled={loading}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#534AB7] focus:ring-1 focus:ring-[#534AB7]/50 transition-colors disabled:opacity-50"
                    />
                  </div>

                  {error && (
                    <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !email.trim()}
                    className="w-full py-2.5 rounded-xl bg-[#534AB7] hover:bg-[#4a42a8] text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? <><Spinner size={15} /> Sending code…</> : "Continue with email"}
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="otp-step"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
                {/* Step: OTP */}
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors mb-5"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5M12 5l-7 7 7 7" />
                  </svg>
                  Back
                </button>

                <h1 className="text-xl font-semibold text-white mb-1">Check your email</h1>
                <p className="text-sm text-white/50 mb-1">
                  We sent a 6-digit code to
                </p>
                <p className="text-sm font-medium text-white mb-6 truncate">{email}</p>

                <form onSubmit={handleVerify} className="space-y-5">
                  {/* 6 digit boxes */}
                  <div
                    className="flex gap-2 justify-between"
                    onPaste={handleDigitPaste}
                  >
                    {digits.map((d, i) => (
                      <input
                        key={i}
                        ref={(el) => { inputRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={d}
                        onChange={(e) => handleDigitChange(i, e.target.value)}
                        onKeyDown={(e) => handleDigitKeyDown(i, e)}
                        disabled={loading}
                        className="w-full aspect-square max-w-[52px] text-center text-xl font-bold rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#534AB7] focus:ring-1 focus:ring-[#534AB7]/50 transition-colors disabled:opacity-50 caret-transparent"
                      />
                    ))}
                  </div>

                  {error && (
                    <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading || digits.join("").length < 6}
                    className="w-full py-2.5 rounded-xl bg-[#534AB7] hover:bg-[#4a42a8] text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? <><Spinner size={15} /> Verifying…</> : "Verify code"}
                  </button>
                </form>

                {/* Resend */}
                <div className="mt-4 text-center">
                  {countdown > 0 ? (
                    <p className="text-xs text-white/30">
                      Resend code in <span className="text-white/50 tabular-nums">{countdown}s</span>
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={loading}
                      className="text-xs text-[#534AB7] hover:text-[#6b62d4] transition-colors disabled:opacity-50"
                    >
                      Resend code
                    </button>
                  )}
                </div>

                <Divider />
                <GoogleButton loading={loading} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer link */}
        <p className="text-center text-xs text-white/30 mt-5">
          {footerText}{" "}
          <a href={footerLinkHref} className="text-[#534AB7] hover:text-[#6b62d4] transition-colors">
            {footerLinkText}
          </a>
        </p>
      </div>
    </div>
  );
}
