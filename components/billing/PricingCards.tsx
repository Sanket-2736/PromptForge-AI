"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, Loader2, Sparkles } from "lucide-react";

type Plan = "FREE" | "STARTER" | "PRO";

const TIERS: Array<{
  key: Plan;
  name: string;
  price: string;
  highlight?: boolean;
  features: string[];
  cta: (current: Plan) => { label: string; action: "checkout" | "portal" | "none"; plan?: "STARTER" | "PRO" };
}> = [
  {
    key: "FREE",
    name: "Free",
    price: "$0",
    features: [
      "Generate 1 playbook per month (10 credits)",
      "Step-by-step IDE prompts",
      "Error recovery prompts (pay per use if credits available)",
    ],
    cta: (current) =>
      current === "FREE"
        ? { label: "Your plan", action: "none" }
        : { label: "Manage subscription", action: "portal" },
  },
  {
    key: "STARTER",
    name: "Starter",
    price: "$9/mo",
    features: [
      "100 credits per month",
      "Generate summary docs (3 credits)",
      "Priority generation over Free tier",
      "Manage subscription in billing portal",
    ],
    cta: (current) =>
      current === "STARTER"
        ? { label: "Your plan", action: "none" }
        : { label: "Choose Starter", action: "checkout", plan: "STARTER" },
  },
  {
    key: "PRO",
    name: "Pro",
    price: "$24/mo",
    highlight: true,
    features: [
      "Unlimited credits",
      "All features unlocked",
      "Fastest generation",
      "Best for teams & heavy usage",
    ],
    cta: (current) =>
      current === "PRO"
        ? { label: "Your plan", action: "none" }
        : { label: "Choose Pro", action: "checkout", plan: "PRO" },
  },
];

export default function PricingCards({ currentPlan }: { currentPlan: Plan }) {
  const [loadingTier, setLoadingTier] = useState<Plan | null>(null);

  const tiers = useMemo(() => TIERS, []);

  const goToUrl = (url: string | null | undefined) => {
    if (!url) throw new Error("Missing redirect URL");
    window.location.href = url;
  };

  const createCheckout = async (plan: "STARTER" | "PRO", tierKey: Plan) => {
    setLoadingTier(tierKey);
    try {
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create-checkout", plan }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok){
        console.log(data);
        throw new Error(data?.error ?? "Checkout failed");
      }
      goToUrl(data?.url);
    } finally {
      setLoadingTier(null);
    }
  };

  const openPortal = async (tierKey: Plan) => {
    setLoadingTier(tierKey);
    try {
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create-portal" }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Portal failed");
      goToUrl(data?.url);
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {tiers.map((tier) => {
        const isCurrent = currentPlan === tier.key;
        const cta = tier.cta(currentPlan);
        const isLoading = loadingTier === tier.key;

        return (
          <div
            key={tier.key}
            className="relative rounded-xl p-5 transition-all duration-300"
            style={{
              background: tier.highlight ? "rgba(255,45,155,0.06)" : "rgba(255,255,255,0.04)",
              border: tier.highlight ? "1px solid rgba(255,45,155,0.4)" : "1px solid rgba(255,255,255,0.08)",
              backdropFilter: "blur(12px)",
              boxShadow: tier.highlight ? "0 0 30px rgba(255,45,155,0.1)" : "none",
            }}
          >
            {tier.highlight && (
              <div className="absolute -top-3 left-4 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-white"
                style={{ background: "linear-gradient(135deg, #ff2d9b, #7c3aed)", boxShadow: "0 2px 12px rgba(255,45,155,0.4)" }}>
                <Sparkles className="w-3.5 h-3.5" /> Most popular
              </div>
            )}

            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-white">{tier.name}</div>
                <div className="text-2xl font-bold mt-1 text-white">{tier.price}</div>
              </div>
              {isCurrent && (
                <span className="rounded-full px-2.5 py-1 text-xs font-medium"
                  style={{ background: "rgba(0,255,136,0.15)", border: "1px solid rgba(0,255,136,0.3)", color: "#00ff88" }}>
                  Your plan
                </span>
              )}
            </div>

            <ul className="mt-4 space-y-2">
              {tier.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
                  <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#00ff88" }} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <div className="mt-5">
              <button
                className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={
                  cta.action === "none"
                    ? { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", cursor: "default" }
                    : tier.highlight
                    ? { background: "linear-gradient(135deg, #ff2d9b, #7c3aed, #2d6fff)", color: "#fff", boxShadow: "0 4px 20px rgba(255,45,155,0.3)" }
                    : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }
                }
                disabled={cta.action === "none" || isLoading}
                onClick={() => {
                  if (cta.action === "none") return;
                  if (cta.action === "portal") return void openPortal(tier.key);
                  if (cta.action === "checkout" && cta.plan) return void createCheckout(cta.plan, tier.key);
                }}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : cta.label}
              </button>

              {currentPlan !== "FREE" && tier.key === currentPlan && (
                <button
                  className="w-full mt-2 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}
                  disabled={isLoading}
                  onClick={() => void openPortal(tier.key)}
                >
                  Manage subscription
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

