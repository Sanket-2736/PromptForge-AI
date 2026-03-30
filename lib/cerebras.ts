import Cerebras from "@cerebras/cerebras_cloud_sdk";

const client = new Cerebras({
  apiKey: process.env.CEREBRAS_API_KEY!,
});

const MODEL = process.env.CEREBRAS_MODEL || "llama-3.3-70b-instruct";

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

const SYSTEM_PROMPT = `You are a senior software architect and expert prompt engineer working with developers who use AI assistants inside Cursor or VS Code.

Your job is to convert a project brief into a sequence of extremely detailed, copy-paste-ready IDE prompts. Each prompt is a complete instruction set that a developer pastes directly into their AI assistant (like Cursor Composer or GitHub Copilot Chat) to implement that exact step.

CRITICAL RULES FOR EVERY PROMPT:
1. Each prompt must be 300–600 words minimum. Short prompts are REJECTED.
2. Every prompt must reference exact file paths (e.g. /app/api/auth/route.ts, /lib/db.ts, /components/ui/Button.tsx).
3. Every prompt must reference artifacts created in prior steps by their exact file paths and exported names.
4. Every prompt must specify exact implementation details: function signatures, variable names, TypeScript types, import paths, environment variable names, Prisma model names, API route methods, component prop interfaces, etc.
5. Every prompt must include edge cases to handle: loading states, error states, empty states, auth guards, input validation.
6. Every prompt must end with a verification checklist: "Verify that: ✓ X works, ✓ Y is handled, ✓ Z is typed correctly".
7. Write prompts in second-person imperative: "Create...", "Add...", "Implement...", "Export...".
8. Include exact code snippets for complex or non-obvious parts — especially types, schema definitions, and config objects.
9. Never be vague. "Add authentication" is WRONG. "Using NextAuth.js v5 with the auth() helper from /lib/auth.ts created in Step 2, add a server-side auth guard at the top of /app/(dashboard)/layout.tsx that redirects unauthenticated users to /login" is CORRECT.
10. Reference the tech stack explicitly in every prompt — use the exact library names and versions the user specified.

OUTPUT FORMAT RULES — VIOLATIONS WILL BREAK THE APPLICATION:
- Return ONLY a raw JSON array. The very first character of your response must be [ and the very last must be ].
- No markdown. No backticks. No code fences. No triple backticks anywhere.
- No text before the [. No text after the ].
- All string values must be on a single line — no literal newlines inside any JSON string value. Use \\n to represent line breaks inside prompt strings.
- No trailing commas. No comments inside JSON.
- Escape all double quotes inside string values with \\".
- Every backslash inside a string must be escaped as \\\\.`;

const USER_PROMPT_TEMPLATE = (
  description: string,
  techStack: string[],
  scope: PlaybookScope,
  stepCount: number
) => `Project description:
"${description}"

Tech stack: ${techStack.join(", ")}

Scope: ${scope} — generate exactly ${stepCount} steps.

Each step object must have:
- "id": "step-1", "step-2", etc.
- "title": max 6 words, sentence case
- "category": one of exactly: Setup | Schema | Auth | Feature | UI | Deploy
- "prompt": 300–600 words. Must follow ALL rules from the system prompt. Must reference exact file paths, prior step artifacts, TypeScript types, environment variables, and include a verification checklist at the end. IMPORTANT: the entire prompt value must be a single JSON string with \\n for line breaks — no literal newlines.
- "dependencies": array of step ids this step depends on, e.g. ["step-1", "step-2"]. Empty array for step-1.
- "complexity": 1 (straightforward), 2 (moderate), or 3 (complex)

PROMPT QUALITY EXAMPLE — this is the bar every prompt must meet:

{"id":"step-4","title":"Build playbook generation API","category":"Feature","prompt":"Using the Prisma client exported from /lib/db.ts (created in Step 2) and the auth() helper from /lib/auth.ts (created in Step 3), implement the POST /api/playbook route at /app/api/playbook/route.ts.\\n\\nImport the following at the top:\\nimport { NextRequest, NextResponse } from 'next/server';\\nimport { auth } from '@/lib/auth';\\nimport { db } from '@/lib/db';\\nimport { z } from 'zod';\\n\\nDefine a Zod schema for the request body:\\nconst schema = z.object({\\n  title: z.string().min(1).max(100),\\n  description: z.string().min(10),\\n  techStack: z.array(z.string()).min(1),\\n  scope: z.enum(['MVP', 'STANDARD', 'FULL']),\\n});\\n\\nIn the POST handler:\\n1. Call auth() and return 401 if no session\\n2. Parse and validate req.json() with the schema above — return 400 with validation errors if it fails\\n3. Check the user credits via db.user.findUnique({ where: { id: session.user.id }, select: { credits: true } }) — return 402 if credits < 10\\n4. Call generatePlaybook() from /lib/gemini.ts with the validated body\\n5. Use db.$transaction() to atomically create the Playbook record and deduct 10 credits from the User record\\n6. Return the new playbook id and steps as JSON with status 201\\n\\nVerify that:\\n✓ Unauthenticated requests return 401\\n✓ Invalid body returns 400 with field-level errors\\n✓ Insufficient credits return 402\\n✓ Credits are only deducted after successful generation\\n✓ The Playbook record is created with all required fields","dependencies":["step-1","step-2","step-3"],"complexity":3}

Notice: the prompt value above is a single unbroken JSON string with \\n for line breaks. Do exactly this for all ${stepCount} steps.

FINAL REMINDER: your entire response must be a single raw JSON array starting with [ and ending with ]. No markdown. No backticks. No explanation.`;

// ─── Custom error class ───────────────────────────────────────────────────────
export class CerebrasRateLimitError extends Error {
  retryAfterMs?: number;
  constructor(message: string, retryAfterMs?: number) {
    super(message);
    this.name = "CerebrasRateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

// ─── Detect and rethrow rate limit errors cleanly ────────────────────────────
function handleCerebrasError(err: unknown): never {
  if (
    err &&
    typeof err === "object" &&
    "status" in err &&
    (err as { status: number }).status === 429
  ) {
    const raw = err as { headers?: Record<string, string> };
    const retryAfter = raw.headers?.["retry-after"];
    const retryAfterMs = retryAfter ? parseInt(retryAfter) * 1000 : undefined;
    throw new CerebrasRateLimitError(
      "Cerebras API rate limit reached. Please try again shortly.",
      retryAfterMs
    );
  }
  throw err;
}

// ─── Robust JSON extractor and sanitiser ─────────────────────────────────────
function extractAndParseJSON(raw: string): unknown {
  // Step 1: strip markdown fences if present
  let text = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // Step 2: extract the first [...] block in case there's any preamble
  const arrayStart = text.indexOf("[");
  const arrayEnd   = text.lastIndexOf("]");
  if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
    text = text.slice(arrayStart, arrayEnd + 1);
  }

  // Step 3: attempt direct parse
  try {
    return JSON.parse(text);
  } catch {
    // Step 4: sanitise — replace literal newlines inside string values
    // This regex matches the content between JSON string delimiters and
    // replaces any unescaped newlines/tabs with their escape sequences
    const sanitised = text
      .replace(/("(?:[^"\\]|\\.)*")/gs, (match) =>
        match
          .replace(/\n/g, "\\n")
          .replace(/\r/g, "\\r")
          .replace(/\t/g, "\\t")
      );

    try {
      return JSON.parse(sanitised);
    } catch {
      // Step 5: last resort — remove trailing commas before ] or }
      const fixedCommas = sanitised
        .replace(/,\s*([}\]])/g, "$1");

      return JSON.parse(fixedCommas);
    }
  }
}

// ─── Validate and normalise a parsed step ────────────────────────────────────
function normaliseStep(raw: unknown, index: number): PlaybookStep {
  const s = raw as Record<string, unknown>;
  const validCategories = ["Setup", "Schema", "Auth", "Feature", "UI", "Deploy"];

  return {
    id:           typeof s.id === "string"           ? s.id           : `step-${index + 1}`,
    title:        typeof s.title === "string"        ? s.title        : `Step ${index + 1}`,
    category:     validCategories.includes(s.category as string)
                    ? (s.category as PlaybookStep["category"])
                    : "Feature",
    prompt:       typeof s.prompt === "string"       ? s.prompt       : "",
    dependencies: Array.isArray(s.dependencies)
                    ? s.dependencies.filter((d): d is string => typeof d === "string")
                    : [],
    complexity:   [1, 2, 3].includes(s.complexity as number)
                    ? (s.complexity as 1 | 2 | 3)
                    : 2,
  };
}

// ─── Generate playbook ────────────────────────────────────────────────────────
export async function generatePlaybook(input: {
  description: string;
  techStack: string[];
  scope: PlaybookScope;
}): Promise<PlaybookStep[]> {
  const { description, techStack, scope } = input;
  const stepCount = SCOPE_STEP_COUNTS[scope];

  let response;
  try {
    response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: USER_PROMPT_TEMPLATE(description, techStack, scope, stepCount) },
      ],
      temperature: 0.3,
      max_tokens: 16000,
    });
  } catch (err) {
    handleCerebrasError(err);
  }

  const raw = response!.choices[0]?.message?.content?.trim() ?? "";

  let parsed: unknown;
  try {
    parsed = extractAndParseJSON(raw);
  } catch (err) {
    console.error("Failed to parse Cerebras response:\n", raw.slice(0, 500));
    throw new Error(`Cerebras returned invalid JSON: ${(err as Error).message}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Cerebras response is not a JSON array");
  }

  return parsed.map((step, i) => normaliseStep(step, i));
}

// ─── Generate error recovery prompt ──────────────────────────────────────────
export async function generateErrorRecovery(input: {
  errorText: string;
  stepTitle: string;
  stepPrompt: string;
  techStack: string[];
}): Promise<string> {
  const { errorText, stepTitle, stepPrompt, techStack } = input;

  const prompt = `You are a senior developer debugging a failed AI-generated implementation.

Tech stack: ${techStack.join(", ")}
Failed step: "${stepTitle}"

Original prompt that was executed:
${stepPrompt.slice(0, 800)}

Error encountered:
${errorText}

Generate a precise, detailed FIX prompt that a developer can paste into Cursor or VS Code Copilot Chat to resolve this exact error.

The fix prompt must:
1. Identify the root cause of the error explicitly
2. Reference the exact file path(s) that need to be changed
3. Provide the exact code change needed — not a vague description
4. Not repeat any working code from the original step — only the broken part
5. Handle any related edge cases the original prompt may have missed
6. End with: "Verify that: ✓ the error no longer appears, ✓ [specific behaviour] works correctly"

Return ONLY the fix prompt text, no preamble.`;

  let response;
  try {
    response = await client.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 2048,
    });
  } catch (err) {
    handleCerebrasError(err);
  }

  return response!.choices[0]?.message?.content?.trim() ?? "";
}

// ─── Generate summary doc ─────────────────────────────────────────────────────
export async function generateSummaryDoc(playbook: {
  title: string;
  description: string;
  techStack: string[];
  scope: PlaybookScope;
  steps: PlaybookStep[];
}): Promise<string> {
  const prompt = `You are a senior technical writer producing professional project documentation.

Generate a comprehensive Markdown document for the following project. It must include:

# ${playbook.title}

## Overview
- What the project does and the problem it solves (2–3 paragraphs)

## Architecture
- Key architectural decisions and why they were made
- How the major components interact

## Tech Stack
A table with columns: Technology | Role | Why chosen

## Implementation Steps
A table with columns: Step | Title | Category | Complexity | Dependencies

## Environment Variables
List every environment variable referenced across the steps with a description of each

## Deployment Checklist
Ordered checklist of everything needed to go from dev to production

## Next Features
5–8 suggested follow-up features with a one-line description each

Project data:
${JSON.stringify(playbook, null, 2)}

Return ONLY valid Markdown. No preamble, no explanation.`;

  let response;
  try {
    response = await client.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 4096,
    });
  } catch (err) {
    handleCerebrasError(err);
  }

  return response!.choices[0]?.message?.content?.trim() ?? "";
}