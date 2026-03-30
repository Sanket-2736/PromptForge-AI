const EMAILJS_API = "https://api.emailjs.com/api/v1.0/email/send";

export async function sendOtpEmail(
  email: string,
  code: string,
  name?: string
): Promise<void> {
  const serviceId  = process.env.EMAILJS_SERVICE_ID;
  const templateId = process.env.EMAILJS_TEMPLATE_ID;
  const publicKey  = process.env.EMAILJS_PUBLIC_KEY;
  const privateKey = process.env.EMAILJS_PRIVATE_KEY; // ✅ NEW

  if (!serviceId || !templateId || !publicKey || !privateKey) {
    throw new Error(
      "Missing EmailJS env vars: SERVICE_ID, TEMPLATE_ID, PUBLIC_KEY, PRIVATE_KEY"
    );
  }

  const displayName = name ?? email.split("@")[0];

  const res = await fetch(EMAILJS_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,          // ✅ keep this
      accessToken: privateKey,     // 🔥 REQUIRED for server-side
      template_params: {
        to_email: email,
        to_name: displayName,
        otp_code: code,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`EmailJS send failed (${res.status}): ${text}`);
  }
}