import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkCredits, deductCredits } from "@/lib/credits";
import { generatePlaybook, GeminiRateLimitError, PlaybookStep } from "@/lib/gemini";

type SessionUser = { id: string };

async function getAuthenticatedUserId(): Promise<string | null> {
  const session = await auth();
  if (!session?.user) return null;
  return (session.user as SessionUser).id ?? null;
}

// ─── POST: generate a new playbook ───────────────────────────────────────────

const postSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(10),
  techStack: z.array(z.string()).min(1),
  scope: z.enum(["MVP", "STANDARD", "FULL"]),
});

export async function POST(req: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await checkCredits(userId, 10);
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }

  const body = await req.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { title, description, techStack, scope } = parsed.data;

  // ─── Call Gemini with proper error handling ───────────────────────────────
  let steps: PlaybookStep[];
  try {
    steps = await generatePlaybook({ description, techStack, scope });
  } catch (err) {
    if (err instanceof GeminiRateLimitError) {
      return NextResponse.json(
        {
          error: "AI quota exceeded. Please wait a moment and try again.",
          retryAfterMs: err.retryAfterMs,
        },
        { status: 429 }
      );
    }
    // Unexpected error — re-throw so Next.js logs it properly
    throw err;
  }

  await deductCredits(userId, 10, "Playbook generation");

  const playbook = await db.playbook.create({
    data: {
      userId,
      title,
      description,
      techStack,
      scope,
      status: "IN_PROGRESS",
      steps,
      totalSteps: steps.length,
      doneSteps: 0,
    },
  });

  return NextResponse.json({ playbookId: playbook.id, steps }, { status: 201 });
}

// ─── PATCH: mark a step complete/incomplete ───────────────────────────────────

const patchSchema = z.object({
  playbookId: z.string(),
  stepId: z.string(),
  completed: z.boolean(),
});

export async function PATCH(req: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { playbookId, stepId, completed } = parsed.data;

  const playbook = await db.playbook.findFirst({
    where: { id: playbookId, userId },
  });

  if (!playbook) {
    return NextResponse.json({ error: "Playbook not found" }, { status: 404 });
  }

  const steps = (playbook.steps as PlaybookStep[]).map((step) =>
    step.id === stepId ? { ...step, completed } : step
  );

  const doneSteps = steps.filter((s) => s.completed).length;
  const status = doneSteps === playbook.totalSteps ? "COMPLETE" : "IN_PROGRESS";

  await db.playbook.update({
    where: { id: playbookId },
    data: { steps, doneSteps, status },
  });

  return NextResponse.json({ doneSteps, totalSteps: playbook.totalSteps, status });
}