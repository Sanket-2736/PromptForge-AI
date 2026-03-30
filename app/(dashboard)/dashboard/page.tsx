import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { Plus, BookOpen } from "lucide-react";
import { format, addMonths, startOfMonth } from "date-fns";

export const metadata = { title: "Dashboard · PromptForge" };

const SCOPE_LABEL: Record<string, string> = { MVP: "MVP", STANDARD: "Standard", FULL: "Full" };
const STATUS_STYLES: Record<string, string> = {
  IN_PROGRESS: "bg-blue-500/20 border border-blue-400/40 text-blue-300",
  COMPLETE:    "bg-[#00ff88]/20 border border-[#00ff88]/40 text-[#00ff88]",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as typeof session.user & { id: string }).id;

  const [user, playbooks] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: userId },
      select: { name: true, email: true, image: true, plan: true, credits: true },
    }),
    db.playbook.findMany({
      where: { userId },
      select: {
        id: true, title: true, techStack: true, scope: true,
        status: true, doneSteps: true, totalSteps: true, updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  // Check if FREE user has used their monthly playbook (credits < 10)
  const isFree = user.plan === "FREE";
  const outOfCredits = isFree && user.credits < 10;
  const nextReset = format(startOfMonth(addMonths(new Date(), 1)), "MMM d");

  return (
    <div className="min-h-screen">
      <DashboardHeader user={user} credits={user.plan === "PRO" ? null : user.credits} plan={user.plan} />

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* New playbook CTA */}
        <div className="rounded-xl galaxy-card p-6 flex items-center justify-between gap-6 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold text-white">Start a new playbook</h2>
            <p className="text-sm text-white/50 mt-1">
              Describe your project and get a step-by-step AI prompt plan.
            </p>
            {outOfCredits && (
              <p className="text-xs text-red-400 mt-2">
                0 credits remaining — resets on {nextReset}.{" "}
                <Link href="/account" className="underline font-medium text-pink-400">Upgrade</Link>
              </p>
            )}
          </div>
          <Button asChild disabled={outOfCredits} className="shrink-0">
            <Link href="/dashboard/new">
              <Plus className="w-4 h-4" /> New Playbook
            </Link>
          </Button>
        </div>

        {/* Playbook grid */}
        {playbooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <BookOpen className="w-12 h-12 text-white/20" />
            <div>
              <p className="font-medium text-white">No playbooks yet</p>
              <p className="text-sm text-white/40 mt-1">Generate your first playbook to get started.</p>
            </div>
            <Button asChild>
              <Link href="/dashboard/new"><Plus className="w-4 h-4" /> New Playbook</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {playbooks.map((pb) => {
              const progress = pb.totalSteps > 0
                ? Math.round((pb.doneSteps / pb.totalSteps) * 100)
                : 0;
              return (
                <div key={pb.id} className="rounded-xl galaxy-card p-5 flex flex-col gap-3 hover:border-pink-500/40 transition-all duration-300">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm leading-snug line-clamp-2 text-white">{pb.title}</h3>
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium shrink-0", STATUS_STYLES[pb.status] ?? "bg-white/10 text-white/60")}>
                      {pb.status === "IN_PROGRESS" ? "In progress" : "Complete"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(pb.techStack as string[]).slice(0, 4).map((t) => (
                      <span key={t} className="rounded-full bg-gradient-to-r from-pink-500/20 to-blue-500/20 border border-pink-500/30 px-2 py-0.5 text-xs text-pink-200">{t}</span>
                    ))}
                    <span className="rounded-full bg-violet-500/20 border border-violet-400/40 text-violet-300 px-2 py-0.5 text-xs font-medium">
                      {SCOPE_LABEL[pb.scope as string] ?? pb.scope}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-white/40">
                      <span>{pb.doneSteps}/{pb.totalSteps} steps</span>
                      <span style={{ color: "#00ff88" }}>{progress}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                      <div
                        className="h-full rounded-full progress-galaxy"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-1">
                    <span className="text-xs text-white/30">
                      Updated {format(new Date(pb.updatedAt), "MMM d, yyyy")}
                    </span>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/playbook/${pb.id}`}>Open</Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
