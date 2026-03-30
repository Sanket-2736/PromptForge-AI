import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkCredits, deductCredits } from "@/lib/credits";
import { generateErrorRecovery, PlaybookStep } from "@/lib/gemini";

type SessionUser = { id: string };

const bodySchema = z.object({
  playbookId: z.string().min(1),
  stepId: z.string().min(1),
  errorText: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as SessionUser | undefined)?.id ?? null;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Credit check — throws 402 Response if insufficient
  try {
    await checkCredits(userId, 1);
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }

  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { playbookId, stepId, errorText } = parsed.data;

  const playbook = await db.playbook.findFirst({
    where: { id: playbookId, userId },
  });

  if (!playbook) {
    return NextResponse.json({ error: "Playbook not found" }, { status: 404 });
  }

  const steps = playbook.steps as PlaybookStep[];
  const step = steps.find((s) => s.id === stepId);

  if (!step) {
    return NextResponse.json({ error: "Step not found" }, { status: 404 });
  }

  await deductCredits(userId, 1, "Error recovery prompt");

  const fixPrompt = await generateErrorRecovery({
    errorText,
    stepTitle: step.title,
    stepPrompt: step.prompt,
    techStack: playbook.techStack as string[],
  });

  return NextResponse.json({ fixPrompt });
}
