import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { deductCredits } from "@/lib/credits";
import { generateSummaryDoc, PlaybookStep, PlaybookScope } from "@/lib/gemini";

type SessionUser = { id: string };

async function getAuthenticatedUserId(): Promise<string | null> {
  const session = await auth();
  if (!session?.user) return null;
  return (session.user as SessionUser).id ?? null;
}

const postSchema = z.object({
  playbookId: z.string(),
});

export async function POST(req: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { playbookId } = parsed.data;

  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { plan: true },
  });

  if (user.plan === "FREE") {
    return NextResponse.json(
      { error: "Upgrade to Starter to unlock summary documents." },
      { status: 403 }
    );
  }

  const playbook = await db.playbook.findFirst({
    where: { id: playbookId, userId },
    select: {
      title: true,
      description: true,
      techStack: true,
      scope: true,
      status: true,
      steps: true,
    },
  });

  if (!playbook) return NextResponse.json({ error: "Playbook not found" }, { status: 404 });

  if (playbook.status !== "COMPLETE") {
    return NextResponse.json({ error: "Complete all steps first" }, { status: 400 });
  }

  const steps = playbook.steps as unknown as PlaybookStep[];

  const deducted = await deductCredits(userId, 3, "Summary doc generation");
  if (!deducted) {
    return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
  }

  const content = await generateSummaryDoc({
    title: playbook.title,
    description: playbook.description,
    techStack: playbook.techStack,
    scope: playbook.scope as PlaybookScope,
    steps,
  });

  await db.summaryDoc.upsert({
    where: { playbookId },
    update: { content },
    create: { playbookId, content },
  });

  return NextResponse.json({ content }, { status: 200 });
}

export async function GET(req: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const playbookId = req.nextUrl.searchParams.get("playbookId");
  if (!playbookId) return NextResponse.json({ error: "playbookId is required" }, { status: 400 });

  const playbook = await db.playbook.findFirst({
    where: { id: playbookId, userId },
    select: { id: true },
  });

  if (!playbook) return NextResponse.json({ error: "Playbook not found" }, { status: 404 });

  const summary = await db.summaryDoc.findUnique({
    where: { playbookId },
    select: { content: true },
  });

  return NextResponse.json({ content: summary?.content ?? null }, { status: 200 });
}
