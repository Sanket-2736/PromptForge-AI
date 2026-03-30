import { db } from "@/lib/db";
import { Plan } from "@prisma/client";

// Credit costs
export const CREDIT_COSTS = {
  PLAYBOOK_GENERATION: 10,
  SUMMARY_GENERATION: 3,
  ERROR_RECOVERY: 1,
} as const;

export function getCreditsForPlan(plan: Plan): number {
  switch (plan) {
    case Plan.FREE:
      return 10; // 1 playbook generation per month
    case Plan.STARTER:
      return 100;
    case Plan.PRO:
      return Infinity;
  }
}

/**
 * Called on first login of each month.
 * Grants monthly credits if not already granted this month.
 */
export async function grantMonthlyCredits(userId: string): Promise<void> {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { plan: true },
  });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Check if a GRANT log already exists this month
  const existingGrant = await db.creditLog.findFirst({
    where: {
      userId,
      type: "GRANT",
      createdAt: { gte: startOfMonth },
    },
  });

  if (existingGrant) return;

  const amount = getCreditsForPlan(user.plan);
  // PRO users have unlimited credits — no need to track
  if (amount === Infinity) return;

  await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: { credits: amount },
    }),
    db.creditLog.create({
      data: {
        userId,
        type: "GRANT",
        amount,
        reason: "Monthly refresh",
      },
    }),
  ]);
}

/**
 * Deducts credits from a user. Returns true on success, false if insufficient.
 */
export async function deductCredits(
  userId: string,
  amount: number,
  reason: string
): Promise<boolean> {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { plan: true, credits: true },
  });

  // PRO users skip credit check
  if (user.plan === Plan.PRO) {
    await db.creditLog.create({
      data: { userId, type: "DEDUCT", amount, reason },
    });
    return true;
  }

  if (user.credits < amount) return false;

  await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: { credits: { decrement: amount } },
    }),
    db.creditLog.create({
      data: { userId, type: "DEDUCT", amount, reason },
    }),
  ]);

  return true;
}

/**
 * Refunds credits back to a user.
 */
export async function refundCredits(
  userId: string,
  amount: number,
  reason: string
): Promise<void> {
  await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: { credits: { increment: amount } },
    }),
    db.creditLog.create({
      data: { userId, type: "REFUND", amount, reason },
    }),
  ]);
}

/**
 * Returns the last 50 credit events for a user, newest first.
 */
export async function getCreditHistory(userId: string) {
  return db.creditLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

/**
 * Middleware helper — throws a 402 Response if the user can't afford the action.
 */
export async function checkCredits(userId: string, cost: number): Promise<void> {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { plan: true, credits: true },
  });

  if (user.plan === Plan.PRO) return;

  if (user.credits < cost) {
    throw Response.json(
      {
        error: "Insufficient credits",
        creditsNeeded: cost,
        currentCredits: user.credits,
      },
      { status: 402 }
    );
  }
}
