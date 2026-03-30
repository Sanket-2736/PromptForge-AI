"use client";

import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WompusLoader } from "@/components/wompus";
import { useToast } from "@/components/ui/toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type Scope = "MVP" | "STANDARD" | "FULL";

interface CreditsData {
  credits: number | null;
  plan: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TECH_CATEGORIES: { label: string; items: string[] }[] = [
  {
    label: "Frontend",
    items: [
      "Next.js", "React", "Vue.js", "Nuxt.js", "SvelteKit", "Svelte",
      "Astro", "Remix", "Angular", "Solid.js", "Qwik",
    ],
  },
  {
    label: "Styling",
    items: [
      "Tailwind CSS", "shadcn/ui", "Radix UI", "Chakra UI", "MUI",
      "Styled Components", "CSS Modules", "Framer Motion", "GSAP",
    ],
  },
  {
    label: "Language",
    items: ["TypeScript", "JavaScript", "Python", "Go", "Rust", "Java", "C#", "Ruby", "PHP"],
  },
  {
    label: "Backend",
    items: [
      "Node.js", "Express", "Fastify", "Hono", "NestJS",
      "FastAPI", "Django", "Flask", "Rails", "Laravel",
      "Spring Boot", "ASP.NET Core", "Gin", "Fiber",
    ],
  },
  {
    label: "Database",
    items: [
      "PostgreSQL", "MySQL", "SQLite", "MongoDB", "Redis",
      "PlanetScale", "Neon", "Turso", "CockroachDB", "DynamoDB",
      "Firestore", "Cassandra", "Elasticsearch",
    ],
  },
  {
    label: "ORM / Query",
    items: ["Prisma", "Drizzle", "TypeORM", "Sequelize", "SQLAlchemy", "Mongoose", "Kysely"],
  },
  {
    label: "Auth",
    items: [
      "NextAuth.js", "Clerk", "Auth0", "Supabase Auth",
      "Firebase Auth", "Lucia", "Better Auth", "Passport.js",
    ],
  },
  {
    label: "Cloud & Infra",
    items: [
      "Vercel", "Netlify", "Railway", "Render", "Fly.io",
      "AWS", "GCP", "Azure", "Cloudflare Workers", "Docker", "Kubernetes",
    ],
  },
  {
    label: "AI / ML",
    items: [
      "OpenAI", "Anthropic Claude", "Google Gemini", "Mistral",
      "LangChain", "LlamaIndex", "Hugging Face", "Replicate",
      "Vercel AI SDK", "Ollama",
    ],
  },
  {
    label: "Payments & Services",
    items: [
      "Stripe", "Lemon Squeezy", "Paddle", "Resend", "SendGrid",
      "Twilio", "Pusher", "Ably", "Cloudinary", "Uploadthing",
    ],
  },
  {
    label: "Testing",
    items: ["Vitest", "Jest", "Playwright", "Cypress", "Testing Library", "Storybook"],
  },
  {
    label: "State & Data",
    items: [
      "Zustand", "Jotai", "Redux Toolkit", "React Query",
      "SWR", "Zod", "tRPC", "GraphQL", "Apollo",
    ],
  },
];

// Flat list for search
const ALL_TECH = TECH_CATEGORIES.flatMap((c) => c.items);

const SCOPE_OPTIONS: { value: Scope; label: string; description: string }[] = [
  { value: "MVP",      label: "MVP",      description: "6–8 steps · Core features only · Fastest to build" },
  { value: "STANDARD", label: "Standard", description: "12–14 steps · Full feature set" },
  { value: "FULL",     label: "Full",     description: "18–20 steps · Production-ready + extras" },
];

const LOADING_MESSAGES = [
  "Analysing your project...",
  "Planning the architecture...",
  "Writing your prompts...",
  "Almost ready...",
];

const SLIDE_VARIANTS = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function NewPlaybookForm() {
  const router = useRouter();

  const [step, setStep]           = useState(0);
  const [direction, setDirection] = useState(1);

  // Step 1
  const [description, setDescription] = useState("");

  // Step 2
  const [techStack, setTechStack]   = useState<string[]>([]);
  const [techSearch, setTechSearch] = useState("");
  const techInputRef = useRef<HTMLInputElement>(null);

  // Step 3
  const [title, setTitle]   = useState("");
  const [scope, setScope]   = useState<Scope>("STANDARD");
  const [credits, setCredits] = useState<CreditsData | null>(null);

  const [loading, setLoading]       = useState(false);
  const [msgIndex, setMsgIndex]     = useState(0);
  const { error: toastError } = useToast();

  // Fetch credits when reaching step 3
  useEffect(() => {
    if (step === 2 && !credits) {
      fetch("/api/credits")
        .then((r) => r.json())
        .then(setCredits)
        .catch(() => {});
    }
  }, [step, credits]);

  // Rotate loading messages
  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => setMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length), 2200);
    return () => clearInterval(id);
  }, [loading]);

  // ── Tech stack helpers ──────────────────────────────────────────────────────

  const filteredOptions = ALL_TECH.filter(
    (t) => t.toLowerCase().includes(techSearch.toLowerCase()) && !techStack.includes(t)
  );

  const addTech = (tech: string) => {
    const trimmed = tech.trim();
    if (trimmed && !techStack.includes(trimmed)) setTechStack((p) => [...p, trimmed]);
    setTechSearch("");
  };

  const removeTech = (tech: string) => setTechStack((p) => p.filter((t) => t !== tech));

  const handleTechKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && techSearch.trim()) {
      e.preventDefault();
      addTech(techSearch);
    }
    if (e.key === "Backspace" && !techSearch && techStack.length) {
      removeTech(techStack[techStack.length - 1]);
    }
  };

  // ── Navigation ──────────────────────────────────────────────────────────────

  const goTo = (next: number) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/playbook-cerebras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, techStack, scope }),
      });

      if (res.status === 402) {
        const data = await res.json();
        toastError("Insufficient credits", `You need ${data.creditsNeeded} credits, you have ${data.currentCredits}.`);
        setLoading(false);
        return;
      }

      if (!res.ok) throw new Error("Generation failed");

      const { playbookId } = await res.json();
      router.push(`/playbook/${playbookId}`);
    } catch {
      toastError("Generation failed", "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  // ── Derived ─────────────────────────────────────────────────────────────────

  const canAfford =
    credits?.plan === "PRO" || credits?.credits === null || (credits?.credits ?? 0) >= 10;

  const step1Valid = description.trim().length >= 50;
  const step2Valid = techStack.length >= 1;
  const step3Valid = title.trim().length > 0;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Loading overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-background/95 backdrop-blur-sm"
          >
            <WompusLoader message={LOADING_MESSAGES[msgIndex]} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form card */}
      <div className="w-full max-w-xl">
        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {["Description", "Tech Stack", "Scope"].map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className={cn(
                  "flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold transition-all",
                  i === step
                    ? "animate-step-pulse text-white"
                    : i < step
                    ? "text-[#00ff88]"
                    : "text-white/30"
                )}
                style={i < step ? { background: "rgba(0,255,136,0.2)", border: "1px solid rgba(0,255,136,0.4)" }
                  : i > step ? { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }
                  : {}}
              >
                {i + 1}
              </div>
              <span
                className={cn(
                  "text-sm hidden sm:block",
                  i === step ? "text-white font-medium" : i < step ? "text-[#00ff88]/70" : "text-white/30"
                )}
              >
                {label}
              </span>
              {i < 2 && <ChevronRight className="w-4 h-4 text-white/20" />}
            </div>
          ))}
        </div>

        {/* Animated step content */}
        <div className="overflow-hidden rounded-xl galaxy-card p-6">
          <AnimatePresence mode="wait" custom={direction}>
            {step === 0 && (
              <motion.div
                key="step0"
                custom={direction}
                variants={SLIDE_VARIANTS}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                <h2 className="text-xl font-semibold mb-1 text-white">Describe your project</h2>
                <p className="text-sm text-white/50 mb-4">
                  Give enough detail for the AI to plan your architecture.
                </p>
                <textarea
                  className="w-full min-h-[160px] resize-none rounded-lg px-3 py-2 text-sm focus:outline-none input-galaxy"
                  placeholder="A SaaS app that lets users..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <div className="flex items-center justify-between mt-2">
                  <span
                    className={cn(
                      "text-xs",
                      description.length < 50 ? "text-white/30" : "text-[#00ff88]"
                    )}
                  >
                    {description.length} / 50 min
                  </span>
                  <Button onClick={() => goTo(1)} disabled={!step1Valid} size="sm">
                    Next <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="step1"
                custom={direction}
                variants={SLIDE_VARIANTS}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                <h2 className="text-xl font-semibold mb-1 text-white">Tech stack</h2>
                <p className="text-sm text-white/50 mb-4">
                  Pick from categories or type anything. Press Enter or comma to add custom tech.
                </p>

                {/* Tag input */}
                <div
                  className="flex flex-wrap gap-1.5 min-h-[44px] rounded-lg px-2 py-1.5 cursor-text input-galaxy focus-within:border-pink-500/50"
                  onClick={() => techInputRef.current?.focus()}
                >
                  {techStack.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium text-pink-200"
                      style={{ background: "linear-gradient(135deg, rgba(255,45,155,0.2), rgba(45,111,255,0.2))", border: "1px solid rgba(255,45,155,0.3)" }}
                    >
                      {t}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeTech(t); }}
                        className="hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    ref={techInputRef}
                    className="flex-1 min-w-[120px] bg-transparent text-sm outline-none text-white placeholder:text-white/30"
                    placeholder={techStack.length === 0 ? "Search or type a technology..." : "Add more..."}
                    value={techSearch}
                    onChange={(e) => setTechSearch(e.target.value)}
                    onKeyDown={handleTechKeyDown}
                  />
                </div>

                {/* Search dropdown */}
                {techSearch && filteredOptions.length > 0 && (
                  <div className="mt-1 rounded-lg shadow-md overflow-hidden z-10 relative" style={{ background: "rgba(10,10,20,0.95)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    {filteredOptions.slice(0, 8).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm text-white/80 hover:bg-white/5 hover:text-white transition-colors"
                        onMouseDown={(e) => { e.preventDefault(); addTech(opt); }}
                      >
                        {opt}
                      </button>
                    ))}
                    {techSearch.trim() && !ALL_TECH.some(t => t.toLowerCase() === techSearch.toLowerCase()) && (
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm text-pink-400 hover:bg-white/5 transition-colors border-t border-white/10"
                        onMouseDown={(e) => { e.preventDefault(); addTech(techSearch); }}
                      >
                        + Add &quot;{techSearch}&quot;
                      </button>
                    )}
                  </div>
                )}

                {/* Categorised chips */}
                {!techSearch && (
                  <div className="mt-3 space-y-3 max-h-[260px] overflow-y-auto pr-1">
                    {TECH_CATEGORIES.map((cat) => {
                      const available = cat.items.filter((t) => !techStack.includes(t));
                      if (available.length === 0) return null;
                      return (
                        <div key={cat.label}>
                          <p className="text-xs font-semibold text-white/30 uppercase tracking-wide mb-1.5">
                            {cat.label}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {available.map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => addTech(t)}
                                className="rounded-full px-2.5 py-0.5 text-xs text-white/50 hover:text-pink-300 transition-colors"
                                style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                                onMouseOver={(e) => (e.currentTarget.style.borderColor = "rgba(255,45,155,0.4)")}
                                onMouseOut={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex justify-between mt-5">
                  <Button variant="outline" size="sm" onClick={() => goTo(0)}>
                    <ChevronLeft className="w-4 h-4" /> Back
                  </Button>
                  <Button onClick={() => goTo(2)} disabled={!step2Valid} size="sm">
                    Next <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                custom={direction}
                variants={SLIDE_VARIANTS}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                <h2 className="text-xl font-semibold mb-1 text-white">Scope & title</h2>
                <p className="text-sm text-white/50 mb-4">
                  Name your playbook and choose how deep to go.
                </p>

                {/* Title */}
                <input
                  className="w-full rounded-lg px-3 py-2 text-sm mb-4 input-galaxy"
                  placeholder="Project title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />

                {/* Scope cards */}
                <div className="grid gap-2 mb-5">
                  {SCOPE_OPTIONS.map(({ value, label, description: desc }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setScope(value)}
                      className={cn(
                        "flex items-start gap-3 rounded-lg p-3 text-left transition-all duration-300",
                        scope === value
                          ? "animate-glow-cycle"
                          : "hover:border-pink-500/30"
                      )}
                      style={{
                        background: scope === value ? "rgba(255,45,155,0.08)" : "rgba(255,255,255,0.03)",
                        border: scope === value ? "1px solid rgba(255,45,155,0.5)" : "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <div
                        className="mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 transition-all"
                        style={{
                          borderColor: scope === value ? "#ff2d9b" : "rgba(255,255,255,0.3)",
                          background: scope === value ? "#ff2d9b" : "transparent",
                          boxShadow: scope === value ? "0 0 8px rgba(255,45,155,0.6)" : "none",
                        }}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">{label}</span>
                          <span className="text-xs text-white/40 flex items-center gap-0.5">
                            <Zap className="w-3 h-3" /> 10 credits
                          </span>
                        </div>
                        <p className="text-xs text-white/40 mt-0.5">{desc}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Credits display */}
                {credits && (
                  <div className="rounded-lg px-3 py-2 text-sm mb-4 flex items-center justify-between"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <span className="text-white/50">Credits remaining</span>
                    <span className="font-semibold"
                      style={{
                        color: (credits.plan === "PRO" || credits.credits === null || (credits.credits ?? 0) > 0) ? "#00ff88" : "#ff4d6d",
                        textShadow: "0 0 8px currentColor",
                      }}>
                      {credits.plan === "PRO" || credits.credits === null
                        ? "Unlimited"
                        : credits.credits}
                    </span>
                  </div>
                )}

                <div className="flex justify-between">
                  <Button variant="outline" size="sm" onClick={() => goTo(1)}>
                    <ChevronLeft className="w-4 h-4" /> Back
                  </Button>

                  {canAfford ? (
                    <Button
                      onClick={handleSubmit}
                      disabled={!step3Valid || loading}
                      size="sm"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>Generate Playbook <Zap className="w-4 h-4" /></>
                      )}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push("/account")}
                    >
                      Upgrade to generate
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
