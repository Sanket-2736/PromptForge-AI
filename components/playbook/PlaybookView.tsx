"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown, ChevronUp, Copy, Check, Lock,
  Download, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import WompusTracker from "@/components/wompus/WompusTracker";
import { usePlaybookStore } from "@/lib/store/playbook";
import { PlaybookStep } from "@/lib/gemini";
import SummaryDocModal from "@/components/playbook/SummaryDocModal";
import { exportPlaybookAsMarkdown, exportPlaybookAsPDF } from "@/lib/export";

import { useToast } from "@/components/ui/toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  playbookId: string;
  title: string;
  techStack: string[];
  scope: string;
  initialSteps: PlaybookStep[];
  initialDone: number;
  totalSteps: number;
}

// ─── Category colours ─────────────────────────────────────────────────────────

const CATEGORY_STYLES: Record<string, string> = {
  Setup:   "text-blue-300 border border-blue-400/40 bg-blue-500/10",
  Schema:  "text-violet-300 border border-violet-400/40 bg-violet-500/10",
  Auth:    "text-pink-300 border border-pink-400/40 bg-pink-500/10",
  Feature: "text-green-300 border border-green-400/40 bg-green-500/10",
  UI:      "text-orange-300 border border-orange-400/40 bg-orange-500/10",
  Deploy:  "text-emerald-300 border border-emerald-400/40 bg-emerald-500/10",
};

const CATEGORY_BORDER: Record<string, string> = {
  Setup:   "#2d6fff",
  Schema:  "#7c3aed",
  Auth:    "#ff2d9b",
  Feature: "#00ff88",
  UI:      "#f97316",
  Deploy:  "#00ff88",
};

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-destructive px-4 py-2 text-sm text-white shadow-lg"
    >
      {message}
    </motion.div>
  );
}

// ─── Step card ────────────────────────────────────────────────────────────────

function StepCard({
  step,
  index,
  allSteps,
  playbookId,
}: {
  step: PlaybookStep;
  index: number;
  allSteps: PlaybookStep[];
  playbookId: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied]     = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [fixPrompt, setFixPrompt] = useState<string | null>(null);
  const [fixCopied, setFixCopied] = useState(false);
  const { setStepCompleted, revertStep } = usePlaybookStore();
  const { error: toastError, success: toastSuccess } = useToast();

  const unmetDeps = (step.dependencies ?? []).filter((depId) => {
    const dep = allSteps.find((s) => s.id === depId);
    return dep && !dep.completed;
  });
  const isLocked = unmetDeps.length > 0;

  const handleCopy = () => {
    navigator.clipboard.writeText(step.prompt);
    setCopied(true);
    toastSuccess("Copied!", "Prompt copied to clipboard.");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyFixPrompt = () => {
    if (!fixPrompt) return;
    navigator.clipboard.writeText(fixPrompt);
    setFixCopied(true);
    setTimeout(() => setFixCopied(false), 2000);
  };

  const handleGenerateFixPrompt = async () => {
    const trimmed = errorText.trim();
    if (!trimmed || recoveryLoading) return;

    setRecoveryLoading(true);
    setFixPrompt(null);
    setFixCopied(false);

    try {
      const res = await fetch("/api/playbook/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playbookId,
          stepId: step.id,
          errorText: trimmed,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to generate fix prompt.");
      }

      setFixPrompt(data?.fixPrompt ?? "");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate fix prompt.";
      toastError("Generation failed", message);
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleCheck = async (checked: boolean) => {
    // Optimistic update
    setStepCompleted(step.id, checked);

    try {
      const res = await fetch("/api/playbook", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playbookId, stepId: step.id, completed: checked }),
      });
      if (!res.ok) throw new Error();
    } catch {
      // Revert
      revertStep(step.id, !checked);
      window.dispatchEvent(new CustomEvent("playbook:patch-error"));
    }
  };

  return (
    <div
      className={cn(
        "rounded-xl border-l-4 transition-all duration-300 galaxy-card",
        step.completed
          ? "border-l-[#00ff88] bg-[#00ff88]/5 animate-glow-pulse-green"
          : "border-l-[var(--cat-color)]",
        isLocked && "opacity-60"
      )}
      style={{ "--cat-color": CATEGORY_BORDER[step.category] ?? "#ff2d9b" } as React.CSSProperties}
    >
      {/* Card header */}
      <button
        type="button"
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Step number */}
        <span
          className={cn(
            "flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0",
            step.completed
              ? "bg-[#00ff88] text-black animate-glow-pulse-green"
              : "bg-white/10 text-white/70"
          )}
        >
          {index + 1}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("text-sm font-medium text-white", step.completed && "line-through text-white/40")}>
              {step.title}
            </span>
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", CATEGORY_STYLES[step.category] ?? "bg-white/10 text-white/60")}>
              {step.category}
            </span>
            {isLocked && <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
          </div>
          {isLocked && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Unlock by completing: {unmetDeps.join(", ")}
            </p>
          )}
        </div>

        <span className="text-muted-foreground shrink-0">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {/* Expanded body */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {/* Prompt box */}
              <pre className="relative rounded-lg bg-black/40 border border-white/10 p-3 text-xs font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto text-[#c0c0e0]">
                {step.prompt}
              </pre>

              <div className="flex items-center gap-3">
                {/* Copy button */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopy}
                  disabled={isLocked}
                  title={isLocked ? "Complete dependencies first" : undefined}
                >
                  {copied ? (
                    <><Check className="w-3.5 h-3.5" /> Copied!</>
                  ) : (
                    <><Copy className="w-3.5 h-3.5" /> Copy prompt</>
                  )}
                </Button>

                {/* Complete checkbox */}
                <label
                  className={cn(
                    "flex items-center gap-2 text-sm cursor-pointer select-none",
                    isLocked && "pointer-events-none opacity-50"
                  )}
                  title={isLocked ? "Complete dependencies first" : undefined}
                >
                  <input
                    type="checkbox"
                    className="accent-[#534AB7] w-4 h-4"
                    checked={!!step.completed}
                    disabled={isLocked}
                    onChange={(e) => handleCheck(e.target.checked)}
                  />
                  Mark as complete
                </label>
              </div>

              {/* ── Error recovery prompt ───────────────────────────────────── */}
              <div className="pt-4 border-t border-border">
                <button
                  type="button"
                  className="w-full flex items-center justify-between text-sm font-medium"
                  onClick={() => setRecoveryOpen((v) => !v)}
                >
                  <span>Got an error?</span>
                  {recoveryOpen ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>

                <AnimatePresence initial={false}>
                  {recoveryOpen && (
                    <motion.div
                      key="recovery"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 space-y-3">
                        <textarea
                          className="w-full min-h-[110px] resize-none rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/30"
                          placeholder="Paste your error here"
                          value={errorText}
                          onChange={(e) => setErrorText(e.target.value)}
                          disabled={recoveryLoading}
                        />

                        <Button
                          size="sm"
                          onClick={handleGenerateFixPrompt}
                          disabled={!errorText.trim() || recoveryLoading}
                          title={!errorText.trim() ? "Paste an error first" : undefined}
                        >
                          {recoveryLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>Generate fix prompt (1 credit)</>
                          )}
                        </Button>

                        {fixPrompt && (
                          <div className="space-y-2">
                            <pre className="relative rounded-lg bg-black/40 border border-white/10 p-3 text-xs font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto text-[#c0c0e0]">
                              {fixPrompt}
                            </pre>

                            <div className="flex items-center gap-3">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCopyFixPrompt}
                                disabled={fixCopied}
                              >
                                {fixCopied ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" /> Copied!
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" /> Copy fix prompt
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export default function PlaybookView({
  playbookId, title: initialTitle, techStack, scope,
  initialSteps, initialDone, totalSteps,
}: Props) {
  const { init, steps, doneSteps } = usePlaybookStore();
  const { error: toastError } = useToast();

  // Hydrate store once
  useEffect(() => {
    init(playbookId, initialSteps, initialDone, totalSteps);
  }, [playbookId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Inline title editing
  const [title, setTitle]       = useState(initialTitle);
  const [editingTitle, setEditingTitle] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingTitle) titleRef.current?.focus();
  }, [editingTitle]);

  // Toast — replaced by global toast system
  useEffect(() => {
    const handler = () => toastError("Step update failed", "Changes reverted.");
    window.addEventListener("playbook:patch-error", handler);
    return () => window.removeEventListener("playbook:patch-error", handler);
  }, [toastError]);

  const progress = totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 0;

  const [billingPlan, setBillingPlan] = useState<"FREE" | "STARTER" | "PRO" | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportBusy, setExportBusy] = useState<"markdown" | "pdf" | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/credits");
        const data = await res.json().catch(() => null);
        if (!alive) return;
        setBillingPlan(data?.plan ?? null);
      } catch {
        if (!alive) return;
        setBillingPlan(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const isFree = billingPlan === "FREE";

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

      {/* ── Header ── */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          {/* Editable title */}
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <input
                ref={titleRef}
                className="text-2xl font-bold bg-transparent border-b border-pink-500/60 outline-none w-full text-white"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={(e) => e.key === "Enter" && setEditingTitle(false)}
              />
            ) : (
              <h1
                className="text-2xl font-bold cursor-pointer hover:text-pink-300 transition-colors text-white"
                onClick={() => setEditingTitle(true)}
                title="Click to edit"
                style={{ textShadow: "0 0 20px rgba(255,45,155,0.3)" }}
              >
                {title}
              </h1>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <SummaryDocModal playbookId={playbookId} title={title} />

            <div className="relative">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setExportOpen((v) => !v)}
                disabled={exportBusy !== null}
              >
                <Download className="w-3.5 h-3.5" /> Export
                <ChevronDown className="w-3.5 h-3.5" />
              </Button>

              {exportOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-lg border border-white/10 galaxy-card shadow-lg p-2 z-20">
                  {isFree && (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      Upgrade to Starter to export.
                    </div>
                  )}

                  <div className="space-y-2">
                    <Button
                      type="button"
                      className="w-full justify-start"
                      variant="outline"
                      size="sm"
                      disabled={isFree || billingPlan === null}
                      title={isFree ? "Upgrade to Starter to export" : undefined}
                      onClick={async () => {
                        if (isFree || billingPlan === null) return;
                        setExportBusy("markdown");
                        setExportOpen(false);
                        try {
                          const summaryRes = await fetch(
                            `/api/summary?playbookId=${encodeURIComponent(playbookId)}`
                          );
                          const summaryData = await summaryRes.json().catch(() => null);
                          const summaryContent = summaryData?.content ?? null;

                          const playbookForExport = {
                            id: playbookId,
                            userId: "",
                            title,
                            description: "",
                            techStack,
                            scope,
                            status: "COMPLETE",
                            steps,
                            totalSteps,
                            doneSteps,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            summaryDoc: summaryContent ? { content: summaryContent } : null,
                          } as any;

                          const markdown = exportPlaybookAsMarkdown(playbookForExport);
                          const filename = `${title.replace(/[<>:"/\\|?*\x00-\x1F]/g, "").trim()}-playbook.md`;
                          const blob = new Blob([markdown], { type: "text/markdown" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = filename;
                          document.body.appendChild(a);
                          a.click();
                          a.remove();
                          URL.revokeObjectURL(url);
                        } finally {
                          setExportBusy(null);
                        }
                      }}
                    >
                      Export as Markdown
                    </Button>

                    <Button
                      type="button"
                      className="w-full justify-start"
                      variant="outline"
                      size="sm"
                      disabled={isFree || billingPlan === null}
                      title={isFree ? "Upgrade to Starter to export" : undefined}
                      onClick={() => {
                        if (isFree || billingPlan === null) return;
                        setExportBusy("pdf");
                        setExportOpen(false);
                        void (async () => {
                          try {
                            const summaryRes = await fetch(
                              `/api/summary?playbookId=${encodeURIComponent(playbookId)}`
                            );
                            const summaryData = await summaryRes.json().catch(() => null);
                            const summaryContent = summaryData?.content ?? null;

                            const playbookForExport = {
                              id: playbookId,
                              userId: "",
                              title,
                              description: "",
                              techStack,
                              scope,
                              status: "COMPLETE",
                              steps,
                              totalSteps,
                              doneSteps,
                              createdAt: new Date(),
                              updatedAt: new Date(),
                              summaryDoc: summaryContent ? { content: summaryContent } : null,
                            } as any;

                            exportPlaybookAsPDF(playbookForExport);
                          } finally {
                            setExportBusy(null);
                          }
                        })();
                      }}
                    >
                      Export as PDF
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tech stack + scope */}
        <div className="flex items-center gap-2 flex-wrap">
          {techStack.map((t) => (
            <span key={t} className="rounded-full bg-gradient-to-r from-pink-500/20 to-blue-500/20 border border-pink-500/30 px-2.5 py-0.5 text-xs text-pink-200">
              {t}
            </span>
          ))}
          <span className="rounded-full bg-violet-500/20 border border-violet-400/40 text-violet-300 px-2.5 py-0.5 text-xs font-medium">
            {scope}
          </span>
        </div>
      </div>

      {/* ── Progress ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/50">
            {doneSteps} of {totalSteps} steps complete
          </span>
          <span className="font-semibold" style={{ color: "#00ff88", textShadow: "0 0 8px rgba(0,255,136,0.5)" }}>
            {progress}%
          </span>
        </div>

        {/* Progress bar + Wompus */}
        <div className="relative">
          <div className="h-3 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
            <motion.div
              className="h-full rounded-full progress-galaxy"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
          <div className="mt-1">
            <WompusTracker progress={progress} totalSteps={totalSteps} doneSteps={doneSteps} />
          </div>
        </div>
      </div>

      {/* Step cards */}
      <div className="space-y-3">
        {steps.map((step, i) => (
          <StepCard key={step.id} step={step} index={i} allSteps={steps} playbookId={playbookId} />
        ))}
      </div>
    </div>
  );
}
