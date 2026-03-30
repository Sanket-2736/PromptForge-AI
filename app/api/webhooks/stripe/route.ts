import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe, PLANS } from "@/lib/stripe";
import { db } from "@/lib/db";
import { Plan } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function planFromPriceId(priceId: string | null | undefined): Plan | null {
  if (!priceId) return null;
  if (priceId === PLANS.STARTER.priceId) return Plan.STARTER;
  if (priceId === PLANS.PRO.priceId) return Plan.PRO;
  return null;
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  const body = await req.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("❌ Webhook signature failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  console.log("✅ Webhook received:", event.type);

  try {
    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated"
    ) {
      const sub = event.data.object as Stripe.Subscription;

      const customerId =
        typeof sub.customer === "string" ? sub.customer : sub.customer.id;

      const priceId = sub.items.data[0]?.price?.id;

      console.log("PRICE ID:", priceId);

      const newPlan = planFromPriceId(priceId) ?? Plan.FREE;

      const user = await db.user.findFirst({
        where: { stripeCustomerId: customerId },
      });

      if (!user) {
        console.log("❌ User not found");
        return NextResponse.json({ received: true });
      }

      const credits =
        newPlan === Plan.STARTER ? 100 :
        newPlan === Plan.PRO ? null :
        10;

      await db.user.update({
        where: { id: user.id },
        data: {
          plan: newPlan,
          ...(credits !== null ? { credits } : {}),
        },
      });

      await db.creditLog.create({
        data: {
          userId: user.id,
          type: "GRANT",
          amount: credits ?? 0,
          reason: `Upgraded to ${newPlan}`,
        },
      });

      console.log("✅ Credits updated");
    }

    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;

      const customerId =
        typeof sub.customer === "string" ? sub.customer : sub.customer.id;

      const user = await db.user.findFirst({
        where: { stripeCustomerId: customerId },
      });

      if (!user) return NextResponse.json({ received: true });

      await db.user.update({
        where: { id: user.id },
        data: { plan: Plan.FREE, credits: 0 },
      });

      console.log("❌ Subscription cancelled");
    }
  } catch (err) {
    console.error("❌ Webhook error:", err);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}