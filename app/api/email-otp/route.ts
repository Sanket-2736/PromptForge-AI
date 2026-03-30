import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendOtpEmail } from "@/lib/emailjs";

function generateOtpCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // ── SEND ──────────────────────────────────────────────────────────────────
    if (action === "send") {
      const email = (body.email as string | undefined)?.toLowerCase().trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
      }

      // Rate-limit: max 3 sends per email per hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentCount = await db.otpCode.count({
        where: {
          email,
          createdAt: { gt: oneHourAgo },
        },
      });

      if (recentCount >= 3) {
        return NextResponse.json(
          { error: "Too many requests. Please wait before requesting another code." },
          { status: 429 }
        );
      }

      // Find or create user (so we can pass their name to the email)
      let user = await db.user.findUnique({ where: { email } });
      if (!user) {
        user = await db.user.create({ data: { email } });
      }

      // Create OTP record
      const code = generateOtpCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await db.otpCode.create({
        data: { email, code, expiresAt },
      });

      // Send email
      await sendOtpEmail(email, code, user.name ?? undefined);

      return NextResponse.json({ success: true });
    }

    // ── VERIFY ────────────────────────────────────────────────────────────────
    if (action === "verify") {
      const email = (body.email as string | undefined)?.toLowerCase().trim();
      const code = (body.code as string | undefined)?.trim();

      if (!email || !code) {
        return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
      }

      const now = new Date();

      const otp = await db.otpCode.findFirst({
        where: {
          email,
          code,
          usedAt: null,
          expiresAt: { gt: now },
        },
        orderBy: { createdAt: "desc" },
      });

      if (!otp) {
        return NextResponse.json(
          { error: "Invalid or expired code" },
          { status: 401 }
        );
      }

      // Mark as used
      await db.otpCode.update({
        where: { id: otp.id },
        data: { usedAt: now },
      });

      // Upsert user and mark email verified
      let user = await db.user.findUnique({ where: { email } });
      if (!user) {
        user = await db.user.create({
          data: { email, emailVerified: now },
        });
      } else if (!user.emailVerified) {
        await db.user.update({
          where: { id: user.id },
          data: { emailVerified: now },
        });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("[email-otp]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
