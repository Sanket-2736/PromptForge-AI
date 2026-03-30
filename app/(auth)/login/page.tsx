import OtpAuthForm from "@/components/auth/OtpAuthForm";

export const metadata = {
  title: "Sign in · PromptForge",
  description: "Sign in to your PromptForge account",
};

export default function LoginPage() {
  return (
    <OtpAuthForm
      title="Welcome back"
      subtitle="Sign in to your PromptForge account"
      footerText="Don't have an account?"
      footerLinkText="Sign up"
      footerLinkHref="/signup"
    />
  );
}
