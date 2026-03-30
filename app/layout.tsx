import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/ThemeProvider";
import GalaxyBackground from "@/components/galaxy-background";
import { ToastProvider } from "@/components/ui/toast";
import CursorTrail from "@/components/cursor-trail";
import { PageTransition } from "@/components/page-transition";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "PromptForge — Build any project with AI, step by step",
  description: "Turn your project idea into a structured sequence of IDE prompts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(geistSans.variable, geistMono.variable, "dark")}
      suppressHydrationWarning
    >
      <body className="antialiased font-sans bg-[#0a0a0f] text-[#f0f0ff] relative">
        <GalaxyBackground />
        <CursorTrail />
        <ThemeProvider>
          <ToastProvider>
            <PageTransition>
              <div className="relative z-10">
                {children}
              </div>
            </PageTransition>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}