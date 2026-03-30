"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { motion, useInView, useSpring, useTransform, animate } from "framer-motion";
import WompusSvg from "@/components/wompus/WompusSvg";
import PricingCards from "@/components/billing/PricingCards";
import { Layers, Lock, Smile, Wrench, FileText, Puzzle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

function FadeUp({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 28 }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: "easeOut", delay }} className={className}>
      {children}
    </motion.div>
  );
}

const MOCK_STEPS = [
  { title: "Initialise Next.js project", category: "Setup", done: true },
  { title: "Define Prisma schema", category: "Schema", done: true },
  { title: "Build auth with OTP", category: "Auth", done: true },
  { title: "Generate playbook API", category: "Feature", done: false },
  { title: "Build dashboard UI", category: "UI", done: false },
];
const CAT_COLORS: Record<string, string> = {
  Setup: "#2d6fff", Schema: "#7c3aed", Auth: "#ff2d9b", Feature: "#00ff88", UI: "#f97316",
};

function HeroMockup() {
  const [progress, setProgress] = useState(0);
  const springVal = useSpring(0, { stiffness: 60, damping: 18 });
  const leftPct = useTransform(springVal, (v) => `calc(${v}% - 16px)`);
  const [bouncing, setBouncing] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => {
      const ctrl = animate(0, 60, { duration: 2.2, ease: "easeOut", onUpdate: (v) => { setProgress(Math.round(v)); springVal.set(v); } });
      return () => ctrl.stop();
    }, 700);
    return () => clearTimeout(t);
  }, [springVal]);
  useEffect(() => { if (progress >= 60) setBouncing(true); }, [progress]);

  return (
    <div className="w-full rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(12px)" }}>
      <div className="px-5 pt-5 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold text-sm text-white">My SaaS App</span>
          <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.4)", color: "#a78bfa" }}>STANDARD</span>
        </div>
        <div className="flex justify-between text-xs mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
          <span>3 of 5 steps complete</span>
          <span style={{ color: "#00ff88", fontWeight: 700 }}>{progress}%</span>
        </div>
        <div className="relative h-9 flex items-center">
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
            <motion.div className="h-full rounded-full progress-galaxy" style={{ width: `${progress}%` }} />
          </div>
          <motion.div className="absolute top-1/2 -translate-y-1/2 z-10" style={{ left: leftPct }}>
            <motion.div animate={bouncing ? { y: [0, -7, 0, -4, 0] } : {}} transition={{ duration: 1.1, repeat: Infinity, repeatDelay: 1.8 }}>
              <WompusSvg size={30} />
            </motion.div>
          </motion.div>
        </div>
      </div>
      <div>
        {MOCK_STEPS.map((step, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: i < 4 ? "1px solid rgba(255,255,255,0.05)" : "none", opacity: step.done ? 0.45 : 1 }}>
            <span className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0"
              style={{ background: step.done ? "#00ff88" : "rgba(255,255,255,0.08)", color: step.done ? "#000" : "rgba(255,255,255,0.5)" }}>{i + 1}</span>
            <span className="flex-1 text-sm font-medium" style={{ color: step.done ? "rgba(255,255,255,0.35)" : "#fff", textDecoration: step.done ? "line-through" : "none" }}>{step.title}</span>
            <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ color: CAT_COLORS[step.category], background: `${CAT_COLORS[step.category]}20`, border: `1px solid ${CAT_COLORS[step.category]}40` }}>{step.category}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const HOW_STEPS = [
  { n: "01", title: "Describe your project", desc: "Give PromptForge a brief description, your tech stack, and the scope you want to build." },
  { n: "02", title: "Get your prompt playbook", desc: "Gemini generates an ordered sequence of self-contained IDE prompts, ready to execute." },
  { n: "03", title: "Build step by step", desc: "Follow the playbook in Cursor or VS Code. Each prompt picks up exactly where the last left off." },
];

const FEATURES = [
  { icon: <Layers className="w-5 h-5" />, title: "Context-chaining prompts", desc: "Each prompt references exact file paths and artifacts from prior steps — no lost context." },
  { icon: <Lock className="w-5 h-5" />, title: "Dependency-locked steps", desc: "Steps unlock only when their dependencies are complete, keeping your build order sane." },
  { icon: <Smile className="w-5 h-5" />, title: "Wompus tracker", desc: "Your friendly progress companion animates across the playbook as you ship each step." },
  { icon: <Wrench className="w-5 h-5" />, title: "Error recovery", desc: "Paste an error and get a precise corrective follow-up prompt to fix it instantly." },
  { icon: <FileText className="w-5 h-5" />, title: "Summary doc", desc: "Generate a professional Markdown project summary from your completed playbook." },
  { icon: <Puzzle className="w-5 h-5" />, title: "IDE plugin", desc: "Run prompts directly inside Cursor or VS Code without leaving your editor.", pro: true },
];

const GLASS = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(12px)" } as React.CSSProperties;
const GLASS_HOVER = "hover:border-pink-500/40 transition-all duration-300";

export default function LandingPage() {
  return (
    <div className="min-h-screen text-white" style={{ background: "transparent" }}>

      {/* Navbar */}
      <header className="sticky top-0 z-40" style={{ background: "rgba(0,0,0,0.5)", borderBottom: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(20px)" }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight text-white">
            <span style={{ color: "#ff2d9b", textShadow: "0 0 12px rgba(255,45,155,0.6)" }}>⬡</span> PromptForge
          </Link>
          <nav className="hidden sm:flex items-center gap-8 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="px-4 py-2 rounded-lg text-sm font-medium transition-colors" style={{ color: "rgba(255,255,255,0.6)" }}
              onMouseOver={e => (e.currentTarget.style.color = "#fff")} onMouseOut={e => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}>
              Sign in
            </Link>
            <Link href="/signup" className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #ff2d9b, #7c3aed, #2d6fff)", boxShadow: "0 4px 20px rgba(255,45,155,0.3)" }}>
              Get started free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-28 grid lg:grid-cols-2 gap-16 items-center">
        <div className="space-y-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium mb-6"
              style={{ background: "rgba(255,45,155,0.1)", border: "1px solid rgba(255,45,155,0.3)", color: "#ff2d9b" }}>
              Made with ❤️ by Sanket Belekar
            </span>
            <h1 className="text-5xl sm:text-6xl font-extrabold leading-[1.1] tracking-tight text-white"
              style={{ textShadow: "0 0 40px rgba(255,45,155,0.3)" }}>
              Build any project<br />with AI —{" "}
              <span style={{ background: "linear-gradient(135deg, #ff2d9b, #7c3aed, #2d6fff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                step by step
              </span>
            </h1>
          </motion.div>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            className="text-xl leading-relaxed max-w-lg" style={{ color: "rgba(255,255,255,0.55)" }}>
            PromptForge turns your project idea into a structured sequence of IDE prompts. Just follow the playbook.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="flex items-center gap-3 flex-wrap">
            <Link href="/signup" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-base font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #ff2d9b, #7c3aed, #2d6fff)", boxShadow: "0 4px 24px rgba(255,45,155,0.35)" }}>
              Generate your first playbook free <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="#features" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-base font-medium text-white transition-colors"
              style={{ border: "1px solid rgba(255,255,255,0.15)" }}>
              See how it works
            </a>
          </motion.div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.35 }}
            className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
            Free to start · No credit card required
          </motion.p>
        </div>
        <motion.div initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.15 }} className="w-full max-w-md mx-auto lg:mx-0 lg:ml-auto">
          <HeroMockup />
        </motion.div>
      </section>

      {/* How it works */}
      <section className="py-24" style={{ background: "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="max-w-6xl mx-auto px-6 space-y-14">
          <FadeUp className="text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white" style={{ textShadow: "0 0 30px rgba(255,45,155,0.2)" }}>How it works</h2>
            <p className="mt-3 text-lg" style={{ color: "rgba(255,255,255,0.4)" }}>Three steps from idea to shipped feature.</p>
          </FadeUp>
          <div className="grid sm:grid-cols-3 gap-6">
            {HOW_STEPS.map((s, i) => (
              <FadeUp key={s.n} delay={i * 0.1}>
                <div className={cn("rounded-2xl p-7 space-y-4 h-full", GLASS_HOVER)} style={GLASS}>
                  <span className="text-4xl font-black leading-none" style={{ background: "linear-gradient(135deg, #ff2d9b, #7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", opacity: 0.4 }}>{s.n}</span>
                  <h3 className="text-lg font-semibold text-white">{s.title}</h3>
                  <p className="leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>{s.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24">
        <div className="max-w-6xl mx-auto px-6 space-y-14">
          <FadeUp className="text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white" style={{ textShadow: "0 0 30px rgba(255,45,155,0.2)" }}>Everything you need to ship faster</h2>
            <p className="mt-3 text-lg" style={{ color: "rgba(255,255,255,0.4)" }}>Built for developers who use AI assistants daily.</p>
          </FadeUp>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <FadeUp key={f.title} delay={i * 0.07}>
                <div className={cn("rounded-2xl p-6 space-y-4 h-full", GLASS_HOVER)} style={GLASS}>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center justify-center w-10 h-10 rounded-xl" style={{ background: "rgba(255,45,155,0.15)", color: "#ff2d9b" }}>{f.icon}</span>
                    {f.pro && <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: "rgba(255,165,0,0.15)", border: "1px solid rgba(255,165,0,0.3)", color: "#ffa500" }}>Pro</span>}
                  </div>
                  <h3 className="font-semibold text-white">{f.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>{f.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24" style={{ background: "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="max-w-5xl mx-auto px-6 space-y-12">
          <FadeUp className="text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white" style={{ textShadow: "0 0 30px rgba(255,45,155,0.2)" }}>Start free. Upgrade when you&apos;re ready.</h2>
            <p className="mt-3 text-lg" style={{ color: "rgba(255,255,255,0.4)" }}>No credit card required to get started.</p>
          </FadeUp>
          <FadeUp><PricingCards currentPlan="FREE" /></FadeUp>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-14" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center sm:items-start gap-1.5">
            <Link href="/" className="flex items-center gap-2 font-bold text-base text-white">
              <span style={{ color: "#ff2d9b" }}>⬡</span> PromptForge
            </Link>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Turn ideas into structured AI prompt playbooks.</p>
          </div>
          <div className="flex items-center gap-6 text-sm flex-wrap justify-center" style={{ color: "rgba(255,255,255,0.35)" }}>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-white transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
              GitHub
            </a>
            <span className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs" style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.35)" }}>
              Made with ❤️ by Sanket Belekar
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
