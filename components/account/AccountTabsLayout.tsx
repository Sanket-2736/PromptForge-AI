"use client";

import { useState } from "react";
import { AccountTabs, AccountTab, CreditHistoryTable, SettingsTab } from "./AccountClient";
import PricingCards from "@/components/billing/PricingCards";

type CreditLog = {
  id: string;
  type: "GRANT" | "DEDUCT" | "REFUND";
  amount: number;
  reason: string;
  createdAt: string;
};

type Props = {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    plan: string;
    credits: number;
  };
  initials: string;
  serialisedLogs: CreditLog[];
  planBadge: string;
  planAllowance: string;
};

export default function AccountTabsLayout({
  user,
  initials,
  serialisedLogs,
  planBadge,
  planAllowance,
}: Props) {
  const [tab, setTab] = useState<AccountTab>("profile");

  return (
    <div className="space-y-6">
      <AccountTabs active={tab} onChange={setTab} />

      {/* ── Profile ── */}
      {tab === "profile" && (
        <section className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-4">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.image} alt="" className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <span className="w-16 h-16 rounded-full bg-[#534AB7] text-white text-xl flex items-center justify-center font-bold shrink-0">
                {initials}
              </span>
            )}
            <div className="space-y-1">
              {user.name && <p className="font-semibold text-base">{user.name}</p>}
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${planBadge}`}>
                {user.plan}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* ── Credits ── */}
      {tab === "credits" && (
        <section className="space-y-5">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-10 flex-wrap">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Current balance</p>
                <p className="text-3xl font-bold mt-1">
                  {user.plan === "PRO" ? "∞" : user.credits}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Monthly allowance</p>
                <p className="text-sm font-medium mt-1">{planAllowance}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Credit history</p>
            <CreditHistoryTable logs={serialisedLogs} />
          </div>
        </section>
      )}

      {/* ── Subscription ── */}
      {tab === "subscription" && (
        <section>
          <PricingCards currentPlan={user.plan as "FREE" | "STARTER" | "PRO"} />
        </section>
      )}

      {/* ── Settings ── */}
      {tab === "settings" && <SettingsTab />}
    </div>
  );
}
