import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCreditHistory } from "@/lib/credits";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as typeof session.user & { id: string }).id;

  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { credits: true, plan: true },
  });

  const history = await getCreditHistory(userId);

  return NextResponse.json({
    credits: user.plan === "PRO" ? null : user.credits, // null signals unlimited
    plan: user.plan,
    history,
  });
}
