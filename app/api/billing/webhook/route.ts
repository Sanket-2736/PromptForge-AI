import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe, PLANS } from "@/lib/stripe";
import { db } from "@/lib/db";
import { Plan } from "@prisma/client";

// Required: prevent Next.js from parsing the body — Stripe needs the raw bytes to verify signature
export const dynamic = "force-dynamic";

function planFromPriceId(priceId: string | null | undefined): Plan | null {
  if (!priceId) return null;
  if (priceId === PLANS.STARTER.priceId) return Plan.STARTER;
  if (priceId === PLANS.PRO.priceId) return Plan.PRO;
  return null;
}

function creditsForPlan(plan: Plan): number | null {
  if (plan === Plan.STARTER) return 100;
  if (plan === Plan.PRO) return null; // unlimited — don't set
  return 10; // FREE fallback
}

async function applyPlanUpgrade(customerId: string, priceId: string | undefined) {
  const newPlan = planFromPriceId(priceId);
  if (!newPlan) return; // unrecognised price — ignore

  const user = await db.user.findFirst({
    where: { stripeCustomerId: customerId },
    select: { id: true, plan: true },
  });
  if (!user) return;

  const credits = creditsForPlan(newPlan);

  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: {
        plan: newPlan,
        ...(credits !== null ? { credits } : {}),
      },
    }),
    db.creditLog.create({
      data: {
        userId: user.id,
        type: "GRANT",
        amount: credits ?? 0,
        reason: `${newPlan} plan activated`,
      },
    }),
  ]);
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[webhook] STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("[webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  console.log(`[webhook] Received: ${event.type}`);

  try {
    switch (event.type) {

      // ── First-time checkout completed ────────────────────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;

        const customerId = typeof session.customer === "string"
          ? session.customer
          : session.customer?.id;
        if (!customerId) break;

        // Retrieve the subscription to get the price ID
        const subscriptionId = typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;
        if (!subscriptionId) break;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price?.id;

        await applyPlanUpgrade(customerId, priceId);
        break;
      }

      // ── Subscription updated (plan change, renewal) ──────────────────────────
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        const priceId = sub.items.data[0]?.price?.id;

        // Only re-apply on actual plan changes, not on every renewal update
        const previousPriceId = (sub as unknown as { items: { data: Array<{ price: { id: string } }> } })
          .items.data[0]?.price?.id;
        const previousAttributes = event.data.previous_attributes as Record<string, unknown> | undefined;
        const planChanged = previousAttributes?.items !== undefined;

        if (planChanged) {
          await applyPlanUpgrade(customerId, priceId);
        }

        void previousPriceId;
        break;
      }

      // ── Subscription cancelled / payment failed ──────────────────────────────
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

        const user = await db.user.findFirst({
          where: { stripeCustomerId: customerId },
          select: { id: true },
        });
        if (!user) break;

        await db.$transaction([
          db.user.update({
            where: { id: user.id },
            data: { plan: Plan.FREE, credits: 0 },
          }),
          db.creditLog.create({
            data: {
              userId: user.id,
              type: "DEDUCT",
              amount: 0,
              reason: "Subscription cancelled",
            },
          }),
        ]);
        break;
      }

      // ── Invoice paid — monthly renewal credit refresh ────────────────────────
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        if ((invoice as unknown as { billing_reason: string }).billing_reason !== "subscription_cycle") break;

        const customerId = typeof invoice.customer === "string"
          ? invoice.customer
          : (invoice.customer as Stripe.Customer | null)?.id;
        if (!customerId) break;

        const user = await db.user.findFirst({
          where: { stripeCustomerId: customerId },
          select: { id: true, plan: true },
        });
        if (!user || user.plan === Plan.FREE || user.plan === Plan.PRO) break;

        const credits = creditsForPlan(user.plan);
        if (!credits) break;

        await db.$transaction([
          db.user.update({
            where: { id: user.id },
            data: { credits },
          }),
          db.creditLog.create({
            data: {
              userId: user.id,
              type: "GRANT",
              amount: credits,
              reason: "Monthly credit renewal",
            },
          }),
        ]);
        break;
      }
    }
  } catch (err) {
    console.error("[webhook] Handler error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
