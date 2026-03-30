import { redirect } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCreditHistory } from "@/lib/credits";
import { UpgradeToastWrapper } from "@/components/account/AccountClient";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { ChevronLeft } from "lucide-react";
import AccountTabsLayout from "@/components/account/AccountTabsLayout";

export const metadata = { title: "Account · PromptForge" };

const PLAN_ALLOWANCE: Record<string, string> = {
  FREE:    "10 credits / month",
  STARTER: "100 credits / month",
  PRO:     "Unlimited",
};

const PLAN_BADGE: Record<string, string> = {
  FREE:    "bg-muted text-muted-foreground",
  STARTER: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  PRO:     "bg-[#534AB7]/10 text-[#534AB7]",
};

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as typeof session.user & { id: string }).id;

  const [user, creditLogs] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: userId },
      select: { name: true, email: true, image: true, plan: true, credits: true },
    }),
    getCreditHistory(userId),
  ]);

  const initials = user.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : (user.email?.[0] ?? "?").toUpperCase();

  const serialisedLogs = creditLogs.map((l) => ({
    ...l,
    createdAt: l.createdAt.toISOString(),
  }));

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        user={user}
        credits={user.plan === "PRO" ? null : user.credits}
        plan={user.plan}
      />

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Dashboard
        </Link>

        <div>
          <h1 className="text-2xl font-semibold">Account</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your profile, credits, subscription, and settings.
          </p>
        </div>

        {/* Tabs — client-side, content rendered server-side via hidden sections */}
        <AccountTabsLayout
          user={user}
          initials={initials}
          serialisedLogs={serialisedLogs}
          planBadge={PLAN_BADGE[user.plan]}
          planAllowance={PLAN_ALLOWANCE[user.plan]}
        />
      </main>

      <Suspense>
        <UpgradeToastWrapper />
      </Suspense>
    </div>
  );
}

// ─── Client wrapper that owns tab state ───────────────────────────────────────
// We pass all data as props so the server renders it; the client just shows/hides.
