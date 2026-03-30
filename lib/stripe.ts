import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // Keep apiVersion explicit for stable webhook/event object shapes.
  apiVersion: "2024-06-20",
  typescript: true,
});

export const PLANS = {
  STARTER: {
    priceId: process.env.STRIPE_STARTER_PRICE_ID!,
    credits: 100,
    name: "Starter",
  },
  PRO: {
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    credits: 999999,
    name: "Pro",
  },
} as const;
