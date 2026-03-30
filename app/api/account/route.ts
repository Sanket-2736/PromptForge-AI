import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";

type SessionUser = { id: string };

export async function DELETE() {
  const session = await auth();
  const userId = (session?.user as SessionUser | undefined)?.id ?? null;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  // Cancel Stripe subscription if one exists
  if (user?.stripeCustomerId) {
    try {
      const subscriptions = await stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        status: "active",
        limit: 5,
      });
      await Promise.all(
        subscriptions.data.map((sub) =>
          stripe.subscriptions.cancel(sub.id)
        )
      );
    } catch {
      // Non-fatal — proceed with deletion even if Stripe fails
    }
  }

  // Cascade deletes everything via Prisma relations (playbooks, creditLogs, sessions, etc.)
  await db.user.delete({ where: { id: userId } });

  return NextResponse.json({ success: true });
}
