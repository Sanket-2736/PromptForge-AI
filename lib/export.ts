"use client";

// ─── Types ────────────────────────────────────────────────────────────────────

type PlaybookStep = {
  id?: string;
  title?: string;
  category?: string;
  dependencies?: string[];
  prompt?: string;
  completed?: boolean;
};

type Playbook = {
  title: string;
  techStack: string[];
  scope: string;
  steps: unknown;
  totalSteps: number;
  doneSteps: number;
  summaryDoc?: { content: string } | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function sanitizeFilename(name: string) {
  return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, "").trim();
}

// ─── Markdown export ──────────────────────────────────────────────────────────

export function exportPlaybookAsMarkdown(playbook: Playbook): string {
  const steps = (playbook.steps ?? []) as PlaybookStep[];
  const doneSteps = playbook.doneSteps ?? 0;
  const totalSteps = playbook.totalSteps ?? steps.length;
  const progress = totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 0;
  const summaryContent = playbook.summaryDoc?.content;

  const lines: string[] = [
    `# ${playbook.title}`,
    "",
    "## Meta",
    `- **Tech stack:** ${playbook.techStack.join(", ") || "-"}`,
    `- **Scope:** ${playbook.scope}`,
    `- **Date:** ${new Date().toLocaleString()}`,
    `- **Progress:** ${doneSteps}/${totalSteps} (${progress}%)`,
    "",
    "## Steps",
    "",
  ];

  steps.forEach((step, idx) => {
    const deps = step.dependencies ?? [];
    lines.push(`### Step ${idx + 1}: ${step.title ?? "Untitled"} (${step.category ?? "Unknown"})`);
    lines.push("");
    lines.push(`- **Status:** ${step.completed ? "✅ Completed" : "⬜ Not completed"}`);
    lines.push(`- **Dependencies:** ${deps.length ? deps.join(", ") : "None"}`);
    lines.push("");
    lines.push("**Prompt:**");
    lines.push("");
    lines.push("```");
    lines.push((step.prompt ?? "").trim());
    lines.push("```");
    lines.push("");
  });

  if (summaryContent?.trim()) {
    lines.push("---", "", "## Project Summary", "", summaryContent.trim(), "");
  }

  return lines.join("\n");
}

// ─── PDF renderer (jsPDF text-based, no canvas) ───────────────────────────────

const PAGE_W = 210;   // A4 mm
const PAGE_H = 297;
const MARGIN = 18;
const CONTENT_W = PAGE_W - MARGIN * 2;

// Category accent colors (hex → RGB)
const CAT_COLORS: Record<string, [number, number, number]> = {
  Setup:   [45, 111, 255],
  Schema:  [124, 58, 237],
  Auth:    [255, 45, 155],
  Feature: [0, 200, 100],
  UI:      [249, 115, 22],
  Deploy:  [0, 200, 100],
};

async function buildPdf(playbook: Playbook, mode: "playbook" | "summary", summaryMarkdown?: string): Promise<void> {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });

  let y = MARGIN;
  let pageNum = 1;

  // ── Helpers ────────────────────────────────────────────────────────────────

  function addPage() {
    // Footer on current page
    drawFooter();
    doc.addPage();
    pageNum++;
    y = MARGIN;
    drawHeader();
  }

  function ensureSpace(needed: number) {
    if (y + needed > PAGE_H - MARGIN - 8) addPage();
  }

  function drawHeader() {
    doc.setFillColor(10, 10, 20);
    doc.rect(0, 0, PAGE_W, 12, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 45, 155);
    doc.text("⬡ PromptForge", MARGIN, 8);
    doc.setTextColor(120, 120, 160);
    doc.text(playbook.title.slice(0, 60), PAGE_W / 2, 8, { align: "center" });
    y = 18;
  }

  function drawFooter() {
    doc.setFillColor(10, 10, 20);
    doc.rect(0, PAGE_H - 10, PAGE_W, 10, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 120);
    doc.text(`Page ${pageNum}`, PAGE_W - MARGIN, PAGE_H - 4, { align: "right" });
    doc.text(`Generated ${new Date().toLocaleDateString()}`, MARGIN, PAGE_H - 4);
  }

  function text(str: string, x: number, size: number, style: "normal" | "bold" | "italic" = "normal", color: [number, number, number] = [220, 220, 240]) {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    doc.text(str, x, y);
    y += size * 0.45;
  }

  function gap(mm: number) { y += mm; }

  function hRule(color: [number, number, number] = [40, 40, 70]) {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 3;
  }

  function wrappedText(str: string, x: number, maxW: number, size: number,
    style: "normal" | "bold" | "italic" = "normal",
    color: [number, number, number] = [180, 180, 210]): number {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(str, maxW) as string[];
    const lineH = size * 0.42;
    ensureSpace(lines.length * lineH + 2);
    doc.text(lines, x, y);
    y += lines.length * lineH + 1;
    return lines.length;
  }

  function codeBlock(code: string) {
    const lines = code.split("\n");
    const lineH = 3.8;
    const blockH = lines.length * lineH + 6;
    ensureSpace(blockH);

    // Background
    doc.setFillColor(15, 15, 30);
    doc.setDrawColor(50, 50, 90);
    doc.setLineWidth(0.3);
    doc.roundedRect(MARGIN, y, CONTENT_W, blockH, 2, 2, "FD");

    // Left accent bar
    doc.setFillColor(255, 45, 155);
    doc.rect(MARGIN, y, 1.5, blockH, "F");

    y += 3;
    doc.setFont("courier", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(160, 220, 160);

    for (const line of lines) {
      const wrapped = doc.splitTextToSize(line || " ", CONTENT_W - 8) as string[];
      ensureSpace(wrapped.length * lineH + 1);
      doc.text(wrapped, MARGIN + 4, y);
      y += wrapped.length * lineH;
    }
    y += 4;
  }

  function badge(label: string, bx: number, by: number, color: [number, number, number]) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    const w = doc.getTextWidth(label) + 4;
    doc.setFillColor(color[0], color[1], color[2], 0.2);
    doc.setDrawColor(...color);
    doc.setLineWidth(0.3);
    doc.roundedRect(bx, by - 3.5, w, 5, 1, 1, "FD");
    doc.setTextColor(...color);
    doc.text(label, bx + 2, by);
    return w + 2;
  }

  function pill(label: string, px: number, py: number) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    const w = doc.getTextWidth(label) + 5;
    doc.setFillColor(30, 30, 60);
    doc.setDrawColor(60, 60, 100);
    doc.setLineWidth(0.2);
    doc.roundedRect(px, py - 3.5, w, 5, 1.5, 1.5, "FD");
    doc.setTextColor(140, 140, 200);
    doc.text(label, px + 2.5, py);
    return w + 2;
  }

  // ── Cover page ─────────────────────────────────────────────────────────────

  // Dark background
  doc.setFillColor(10, 10, 20);
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");

  // Gradient orb (simulated with circles)
  doc.setFillColor(255, 45, 155);
  for (let i = 8; i > 0; i--) {
    doc.setGState(doc.GState({ opacity: 0.015 * i }));
    doc.circle(PAGE_W * 0.8, PAGE_H * 0.2, i * 18, "F");
  }
  doc.setFillColor(45, 111, 255);
  for (let i = 6; i > 0; i--) {
    doc.setGState(doc.GState({ opacity: 0.015 * i }));
    doc.circle(PAGE_W * 0.2, PAGE_H * 0.7, i * 14, "F");
  }
  doc.setGState(doc.GState({ opacity: 1 }));

  // Logo
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 45, 155);
  doc.text("⬡ PromptForge", MARGIN, 28);

  // Title
  y = PAGE_H * 0.35;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(255, 255, 255);
  const titleLines = doc.splitTextToSize(playbook.title, CONTENT_W) as string[];
  doc.text(titleLines, MARGIN, y);
  y += titleLines.length * 12 + 6;

  // Subtitle line
  doc.setFillColor(255, 45, 155);
  doc.rect(MARGIN, y, 30, 1, "F");
  y += 8;

  // Meta pills row
  const steps = (playbook.steps ?? []) as PlaybookStep[];
  const doneSteps = playbook.doneSteps ?? 0;
  const totalSteps = playbook.totalSteps ?? steps.length;
  const progress = totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 0;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(140, 140, 200);
  doc.text(`${playbook.scope} · ${playbook.techStack.slice(0, 4).join(", ")}`, MARGIN, y);
  y += 7;
  doc.text(`${doneSteps} of ${totalSteps} steps complete (${progress}%)`, MARGIN, y);
  y += 7;
  doc.text(`Generated ${new Date().toLocaleString()}`, MARGIN, y);

  // Bottom bar
  doc.setFillColor(255, 45, 155);
  doc.rect(0, PAGE_H - 2, PAGE_W, 2, "F");

  // ── Content pages ──────────────────────────────────────────────────────────

  if (mode === "playbook") {
    doc.addPage();
    pageNum = 1;
    doc.setFillColor(10, 10, 20);
    doc.rect(0, 0, PAGE_W, PAGE_H, "F");
    drawHeader();

    // Section heading
    text("PLAYBOOK STEPS", MARGIN, 9, "bold", [255, 45, 155]);
    gap(1);
    hRule([60, 20, 80]);
    gap(2);

    steps.forEach((step, idx) => {
      const catColor = CAT_COLORS[step.category ?? ""] ?? [100, 100, 180];
      const stepNum = idx + 1;
      const isComplete = !!step.completed;

      ensureSpace(28);

      // Step header background
      doc.setFillColor(20, 20, 40);
      doc.roundedRect(MARGIN, y - 1, CONTENT_W, 12, 1.5, 1.5, "F");

      // Category left bar
      doc.setFillColor(...catColor);
      doc.roundedRect(MARGIN, y - 1, 2, 12, 0.5, 0.5, "F");

      // Step number circle
      doc.setFillColor(isComplete ? 0 : 30, isComplete ? 200 : 30, isComplete ? 100 : 60);
      doc.circle(MARGIN + 8, y + 4.5, 4, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(isComplete ? 0 : 200, isComplete ? 0 : 200, isComplete ? 0 : 200);
      doc.text(String(stepNum), MARGIN + 8, y + 5.5, { align: "center" });

      // Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      const titleStr = doc.splitTextToSize(step.title ?? "Untitled", CONTENT_W - 40) as string[];
      doc.text(titleStr[0], MARGIN + 15, y + 4);

      // Category badge
      let bx = MARGIN + 15 + doc.getTextWidth(titleStr[0]) + 3;
      badge(step.category ?? "Unknown", bx, y + 4, catColor);

      // Status badge
      bx = PAGE_W - MARGIN - 22;
      if (isComplete) {
        doc.setFillColor(0, 180, 80);
        doc.roundedRect(bx, y, 20, 5, 1, 1, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0, 0, 0);
        doc.text("✓ DONE", bx + 2, y + 3.5);
      }

      y += 14;

      // Dependencies
      const deps = step.dependencies ?? [];
      if (deps.length > 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(100, 100, 160);
        doc.text("Depends on: ", MARGIN + 4, y);
        let px = MARGIN + 4 + doc.getTextWidth("Depends on: ");
        for (const d of deps) {
          px += pill(d, px, y);
        }
        y += 5;
      }

      // Prompt label
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(180, 100, 255);
      doc.text("PROMPT", MARGIN + 4, y);
      y += 4;

      // Prompt code block
      codeBlock((step.prompt ?? "").trim());

      gap(3);

      // Separator between steps
      if (idx < steps.length - 1) {
        doc.setDrawColor(30, 30, 60);
        doc.setLineWidth(0.2);
        doc.line(MARGIN + 10, y, PAGE_W - MARGIN - 10, y);
        y += 4;
      }
    });

  } else {
    // Summary mode — render markdown as structured text
    doc.addPage();
    pageNum = 1;
    doc.setFillColor(10, 10, 20);
    doc.rect(0, 0, PAGE_W, PAGE_H, "F");
    drawHeader();

    text("PROJECT SUMMARY", MARGIN, 9, "bold", [255, 45, 155]);
    gap(1);
    hRule([60, 20, 80]);
    gap(3);

    const mdLines = (summaryMarkdown ?? "").split("\n");
    for (const line of mdLines) {
      if (line.startsWith("# ")) {
        ensureSpace(12);
        wrappedText(line.slice(2), MARGIN, CONTENT_W, 16, "bold", [255, 255, 255]);
        gap(2);
      } else if (line.startsWith("## ")) {
        ensureSpace(10);
        gap(2);
        wrappedText(line.slice(3), MARGIN, CONTENT_W, 12, "bold", [255, 45, 155]);
        hRule([60, 20, 80]);
      } else if (line.startsWith("### ")) {
        ensureSpace(8);
        wrappedText(line.slice(4), MARGIN, CONTENT_W, 10, "bold", [140, 100, 255]);
        gap(1);
      } else if (line.startsWith("- ") || line.startsWith("* ")) {
        const content = line.slice(2);
        ensureSpace(5);
        doc.setFillColor(255, 45, 155);
        doc.circle(MARGIN + 1.5, y - 1, 0.8, "F");
        wrappedText(content, MARGIN + 4, CONTENT_W - 4, 8.5, "normal", [180, 180, 220]);
      } else if (line.startsWith("```")) {
        // skip fence markers
      } else if (line.startsWith("|")) {
        // simple table row
        wrappedText(line.replace(/\|/g, "  "), MARGIN + 2, CONTENT_W, 7.5, "normal", [140, 140, 200]);
      } else if (line.trim() === "" || line.trim() === "---") {
        gap(2);
      } else {
        wrappedText(line, MARGIN, CONTENT_W, 8.5, "normal", [180, 180, 220]);
      }
    }
  }

  drawFooter();
  doc.save(sanitizeFilename(playbook.title) + (mode === "summary" ? "-summary.pdf" : "-playbook.pdf"));
}

// ─── Public exports ───────────────────────────────────────────────────────────

export function exportPlaybookAsPDF(playbook: Playbook): void {
  void buildPdf(playbook, "playbook");
}

export function exportSummaryMarkdownAsPDF(args: {
  title: string;
  markdown: string;
  filenameSuffix?: string;
}): void {
  const fakePlaybook: Playbook = {
    title: args.title,
    techStack: [],
    scope: "",
    steps: [],
    totalSteps: 0,
    doneSteps: 0,
  };
  void buildPdf(fakePlaybook, "summary", args.markdown);
}
