"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Sun, Moon, Monitor, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useTheme } from "next-themes";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

// ─── Upgrade toast ────────────────────────────────────────────────────────────

function UpgradeToast({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm text-white shadow-lg"
    >
      <Check className="w-4 h-4" /> Plan upgraded successfully
    </motion.div>
  );
}

export function UpgradeToastWrapper() {
  const searchParams = useSearchParams();
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (searchParams.get("upgraded") === "true") setShow(true);
  }, [searchParams]);
  return (
    <AnimatePresence>
      {show && <UpgradeToast onDone={() => setShow(false)} />}
    </AnimatePresence>
  );
}

// ─── Credit history table ─────────────────────────────────────────────────────

type CreditLog = {
  id: string;
  type: "GRANT" | "DEDUCT" | "REFUND";
  amount: number;
  reason: string;
  createdAt: string;
};

const TYPE_STYLES: Record<string, string> = {
  GRANT:  "text-emerald-600",
  REFUND: "text-blue-600",
  DEDUCT: "text-red-500",
};
const TYPE_PREFIX: Record<string, string> = {
  GRANT: "+", REFUND: "+", DEDUCT: "-",
};

export function CreditHistoryTable({ logs }: { logs: CreditLog[] }) {
  if (logs.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">No credit history yet.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Date</th>
            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Event</th>
            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Amount</th>
            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Reason</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
              <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                {format(new Date(log.createdAt), "MMM d, yyyy")}
              </td>
              <td className="px-4 py-2.5">
                <span className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  log.type === "GRANT"  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                  log.type === "REFUND" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                                          "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                )}>
                  {log.type}
                </span>
              </td>
              <td className={cn("px-4 py-2.5 font-mono font-medium", TYPE_STYLES[log.type])}>
                {TYPE_PREFIX[log.type]}{log.amount}
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">{log.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Theme selector ───────────────────────────────────────────────────────────

function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const options = [
    { value: "light",  label: "Light",  icon: <Sun className="w-4 h-4" /> },
    { value: "dark",   label: "Dark",   icon: <Moon className="w-4 h-4" /> },
    { value: "system", label: "System", icon: <Monitor className="w-4 h-4" /> },
  ];

  return (
    <div className="flex gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => setTheme(opt.value)}
          className={cn(
            "flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
            theme === opt.value
              ? "border-[#534AB7] bg-[#534AB7]/10 text-[#534AB7]"
              : "border-border bg-card text-muted-foreground hover:bg-muted"
          )}
        >
          {opt.icon} {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── Delete account modal ─────────────────────────────────────────────────────

function DeleteAccountModal({ onClose }: { onClose: () => void }) {
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const { error: toastError } = useToast();

  const handleDelete = async () => {
    if (confirm !== "DELETE") return;
    setLoading(true);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete account");
      await signOut({ callbackUrl: "/" });
    } catch {
      toastError("Delete failed", "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-5"
      >
        <div className="flex items-start gap-3">
          <span className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </span>
          <div>
            <h3 className="font-semibold text-base">Delete account</h3>
            <p className="text-sm text-muted-foreground mt-1">
              This permanently deletes your account, all playbooks, and cancels any active subscription.
              This cannot be undone.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Type <span className="font-mono font-bold">DELETE</span> to confirm
          </label>
          <input
            type="text"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="DELETE"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={confirm !== "DELETE" || loading}
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete my account
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Settings tab ─────────────────────────────────────────────────────────────

export function SettingsTab() {
  const [showDelete, setShowDelete] = useState(false);

  return (
    <div className="space-y-8">
      {/* Appearance */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div>
          <h2 className="font-semibold">Appearance</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Choose your preferred colour theme.</p>
        </div>
        <ThemeSelector />
      </section>

      {/* Danger zone */}
      <section className="rounded-xl border border-red-200 dark:border-red-900/40 bg-card p-5 space-y-4">
        <div>
          <h2 className="font-semibold text-red-600">Danger zone</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Permanently delete your account and all associated data.
          </p>
        </div>
        <Button
          variant="outline"
          className="border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
          onClick={() => setShowDelete(true)}
        >
          <Trash2 className="w-4 h-4" /> Delete account
        </Button>
      </section>

      <AnimatePresence>
        {showDelete && <DeleteAccountModal onClose={() => setShowDelete(false)} />}
      </AnimatePresence>
    </div>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

export type AccountTab = "profile" | "credits" | "subscription" | "settings";

export function AccountTabs({
  active,
  onChange,
}: {
  active: AccountTab;
  onChange: (t: AccountTab) => void;
}) {
  const tabs: { key: AccountTab; label: string }[] = [
    { key: "profile",      label: "Profile" },
    { key: "credits",      label: "Credits" },
    { key: "subscription", label: "Subscription" },
    { key: "settings",     label: "Settings" },
  ];

  return (
    <div className="flex gap-1 border-b border-border">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={cn(
            "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
            active === t.key
              ? "border-[#534AB7] text-[#534AB7]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
