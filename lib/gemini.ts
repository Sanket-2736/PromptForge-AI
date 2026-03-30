import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

export type PlaybookScope = "MVP" | "STANDARD" | "FULL";

export interface PlaybookStep {
  id: string;
  title: string;
  category: "Setup" | "Schema" | "Auth" | "Feature" | "UI" | "Deploy";
  prompt: string;
  dependencies: string[];
  complexity: 1 | 2 | 3;
  completed?: boolean;
}

const SCOPE_STEP_COUNTS: Record<PlaybookScope, number> = {
  MVP: 8,
  STANDARD: 14,
  FULL: 20,
};

const SYSTEM_PROMPT = `You are a senior software architect and expert prompt engineer. Your job is to convert a project brief into a structured, ordered sequence of IDE prompts that a developer can execute step by step in Cursor or VS Code with an AI assistant. Each prompt must be self-contained, reference exact file paths and artifact names from prior steps, and be detailed enough that the AI assistant can execute it without any additional context. Return ONLY a valid JSON array with no markdown, no backticks, no explanation.`;

// ─── Custom error class ───────────────────────────────────────────────────────
export class GeminiRateLimitError extends Error {
  retryAfterMs?: number;
  constructor(message: string, retryAfterMs?: number) {
    super(message);
    this.name = "GeminiRateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

// ─── Detect and rethrow 429s cleanly ─────────────────────────────────────────
function handleGeminiError(err: unknown): never {
  if (
    err &&
    typeof err === "object" &&
    "status" in err &&
    (err as { status: number }).status === 429
  ) {
    const raw = err as { message?: string };
    const retryMatch = raw.message?.match(/"retryDelay":"(\d+)s"/);
    const retryAfterMs = retryMatch ? parseInt(retryMatch[1]) * 1000 : undefined;
    throw new GeminiRateLimitError(
      "Gemini API quota exceeded. Please try again shortly.",
      retryAfterMs
    );
  }
  throw err;
}

// ─── Safe JSON parser ─────────────────────────────────────────────────────────
function safeParseJSON(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    return JSON.parse(cleaned);
  }
}

// ─── Generate playbook ────────────────────────────────────────────────────────
export async function generatePlaybook(input: {
  description: string;
  techStack: string[];
  scope: PlaybookScope;
}): Promise<PlaybookStep[]> {
  const { description, techStack, scope } = input;
  const stepCount = SCOPE_STEP_COUNTS[scope];

  const userPrompt = `Project: ${description}
Tech stack: ${techStack.join(", ")}
Scope: ${scope} (${stepCount} steps)

Return a JSON array of steps. Each step must have:
- id: string (step-1, step-2, etc.)
- title: string (short, max 6 words)
- category: one of: Setup | Schema | Auth | Feature | UI | Deploy
- prompt: string (min 150 words, must reference file paths and prior step artifacts)
- dependencies: string[]
- complexity: 1 | 2 | 3`;

  let result;
  try {
    result = await ai.models.generateContent({
      model: MODEL,
      contents: `${SYSTEM_PROMPT}\n\n${userPrompt}`,
    });
  } catch (err) {
    handleGeminiError(err);
  }

  const raw = result!.text?.trim() || "";
  const parsed = safeParseJSON(raw);

  if (!Array.isArray(parsed)) {
    throw new Error("Gemini response is not a JSON array");
  }

  return parsed as PlaybookStep[];
}

// ─── Generate error recovery prompt ──────────────────────────────────────────
export async function generateErrorRecovery(input: {
  errorText: string;
  stepTitle: string;
  stepPrompt: string;
  techStack: string[];
}): Promise<string> {
  const { errorText, stepTitle, stepPrompt, techStack } = input;

  const prompt = `You are a senior developer debugging an AI-generated code output.

Tech stack: ${techStack}
Step: ${stepTitle}

Original prompt:
${stepPrompt.slice(0, 500)}

Error:
${errorText}

Generate a precise FIX prompt for the IDE.
- Mention exact file paths
- Fix ONLY the issue
- Do NOT repeat working code
Return ONLY the fix prompt text.`;

  let result;
  try {
    result = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
    });
  } catch (err) {
    handleGeminiError(err);
  }

  return result!.text?.trim() || "";
}

// ─── Generate summary doc ─────────────────────────────────────────────────────
export async function generateSummaryDoc(playbook: {
  title: string;
  description: string;
  techStack: string[];
  scope: PlaybookScope;
  steps: PlaybookStep[];
}): Promise<string> {
  const prompt = `You are a technical writer.

Generate a professional Markdown document with:
- Project overview
- Problem it solves
- Architecture decisions
- Tech stack (with reasons)
- Table of steps
- Next features
- Deployment checklist

Playbook:
${JSON.stringify(playbook, null, 2)}

Return ONLY Markdown.`;

  let result;
  try {
    result = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
    });
  } catch (err) {
    handleGeminiError(err);
  }

  return result!.text?.trim() || "";
}