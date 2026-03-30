import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe, PLANS } from "@/lib/stripe";

type SessionUser = { id: string; email?: string | null };

const postSchema = z.object({
  action: z.enum(["create-checkout", "create-portal"]),
  plan: z.enum(["STARTER", "PRO"]).optional(),
});

async function getOrCreateStripeCustomer(userId: string, email?: string | null) {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  if (user.stripeCustomerId) return user.stripeCustomerId;

  const customer = await stripe.customers.create({
    email: email ?? undefined,
    metadata: { userId },
  });

  await db.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as SessionUser).id;
  const email = (session.user as SessionUser).email ?? null;

  const body = await req.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const origin = req.headers.get("origin") ?? req.nextUrl.origin;
  const { action, plan } = parsed.data;

  const customerId = await getOrCreateStripeCustomer(userId, email);

  if (action === "create-checkout") {
    if (!plan) return NextResponse.json({ error: "plan is required" }, { status: 400 });
    const selected = PLANS[plan];

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: selected.priceId, quantity: 1 }],
      success_url: `${origin}/account?upgraded=true`,
      cancel_url: `${origin}/account`,
      allow_promotion_codes: true,
      subscription_data: {
        metadata: { userId },
      },
    });

    return NextResponse.json({ url: checkoutSession.url }, { status: 200 });
  }

  if (action === "create-portal") {
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/account`,
    });

    return NextResponse.json({ url: portal.url }, { status: 200 });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
