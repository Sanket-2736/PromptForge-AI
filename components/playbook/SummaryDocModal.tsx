"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, Copy, Download, Loader2, Share2, Zap, X } from "lucide-react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { exportSummaryMarkdownAsPDF } from "@/lib/export";
import { useToast } from "@/components/ui/toast";

export default function SummaryDocModal({
  playbookId,
  title,
}: {
  playbookId: string;
  title: string;
}) {
  const searchParams = useSearchParams();
  const { error: toastError, success: toastSuccess } = useToast();

  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState<"FREE" | "STARTER" | "PRO" | null>(null);

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [markdown, setMarkdown] = useState<string | null>(null);

  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [shareState, setShareState] = useState<"idle" | "copied">("idle");

  const isFree = plan === "FREE";

  useEffect(() => {
    const shouldOpen = searchParams.get("summary") === "1";
    if (shouldOpen) setOpen(true);
  }, [searchParams]);

  useEffect(() => {
    if (!open) return;

    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [creditsRes, summaryRes] = await Promise.all([
          fetch("/api/credits"),
          fetch(`/api/summary?playbookId=${encodeURIComponent(playbookId)}`),
        ]);

        const credits = await creditsRes.json().catch(() => null);
        const summary = await summaryRes.json().catch(() => null);

        if (!alive) return;

        setPlan(credits?.plan ?? null);
        setMarkdown(summary?.content ?? null);
      } catch {
        if (!alive) return;
        setPlan(null);
        setMarkdown(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [open, playbookId]);

  const html = useMemo(() => {
    if (!markdown) return "";
    const rawHtml = marked.parse(markdown) as string;
    return DOMPurify.sanitize(rawHtml);
  }, [markdown]);

  const handleCopyMarkdown = async () => {
    if (!markdown || isFree) return;
    await navigator.clipboard.writeText(markdown);
    setCopyState("copied");
    toastSuccess("Copied!", "Markdown copied to clipboard.");
    setTimeout(() => setCopyState("idle"), 2000);
  };

  const handleShareLink = async () => {
    if (isFree) return;
    const url = new URL(window.location.href);
    url.searchParams.set("summary", "1");
    await navigator.clipboard.writeText(url.toString());
    setShareState("copied");
    toastSuccess("Link copied!", "Share link copied to clipboard.");
    setTimeout(() => setShareState("idle"), 2000);
  };

  const handleDownloadPdf = () => {
    if (!markdown || isFree) return;
    exportSummaryMarkdownAsPDF({
      title,
      markdown,
      filenameSuffix: "summary",
    });
  };

  const handleGenerate = async () => {
    if (isFree || generating) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playbookId }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Failed to generate summary.");

      setMarkdown(data?.content ?? "");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate summary.";
      toastError("Generation failed", message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <Zap className="w-3.5 h-3.5" /> Generate Summary
      </Button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          <div className="absolute inset-0 flex items-start justify-center overflow-y-auto p-4">
            <div className="w-full max-w-3xl mt-10 rounded-xl border border-border bg-card shadow-lg">
              <div className="flex items-center justify-between gap-4 p-4 border-b border-border">
                <div className="min-w-0">
                  <h3 className="text-base font-semibold">Project Summary</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isFree ? "Starter required for full access" : "Generated from your completed playbook"}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="p-4">
                {loading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                  </div>
                ) : (
                  <div className="space-y-4">
                    {markdown ? (
                      <div className="relative rounded-lg border border-border bg-background p-3">
                        <div
                          className={cn(isFree && "blur-[3px] select-none")}
                          dangerouslySetInnerHTML={{ __html: html }}
                        />

                        {isFree && (
                          <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm p-4">
                            <div className="text-center">
                              <div className="text-sm font-medium">Upgrade to Starter to unlock</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Summary documents require a Starter plan.
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground">
                        No summary doc yet. Generate one after completing all steps.
                      </div>
                    )}

                    {!generating && !markdown && (
                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={handleGenerate}
                          disabled={isFree || generating}
                        >
                          {isFree ? (
                            <>Upgrade to Starter to unlock</>
                          ) : (
                            <>Generate Summary (3 credits)</>
                          )}
                        </Button>
                      </div>
                    )}

                    {(markdown || isFree) && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCopyMarkdown}
                          disabled={!markdown || isFree}
                          title={isFree ? "Upgrade to Starter to unlock" : undefined}
                        >
                          {copyState === "copied" ? (
                            <>
                              <Check className="w-3.5 h-3.5" /> Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" /> Copy markdown
                            </>
                          )}
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleDownloadPdf}
                          disabled={!markdown || isFree}
                          title={isFree ? "Upgrade to Starter to unlock" : undefined}
                        >
                          <Download className="w-3.5 h-3.5" /> Download PDF
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleShareLink}
                          disabled={isFree}
                        >
                          {shareState === "copied" ? (
                            <>
                              <Check className="w-3.5 h-3.5" /> Link copied
                            </>
                          ) : (
                            <>
                              <Share2 className="w-3.5 h-3.5" /> Share link
                            </>
                          )}
                        </Button>
                      </div>
                    )}

                    {generating && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" /> Generating summary…
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

