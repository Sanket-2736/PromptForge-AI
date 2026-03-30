import OtpAuthForm from "@/components/auth/OtpAuthForm";

export const metadata = {
  title: "Create account · PromptForge",
  description: "Create your PromptForge account",
};

export default function SignupPage() {
  return (
    <OtpAuthForm
      title="Create your account"
      subtitle="Enter your email to get started with PromptForge"
      footerText="Already have an account?"
      footerLinkText="Sign in"
      footerLinkHref="/login"
    />
  );
}
