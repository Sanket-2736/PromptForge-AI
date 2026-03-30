import NewPlaybookForm from "@/components/playbook/NewPlaybookForm";

export const metadata = {
  title: "New Playbook · PromptForge",
};

export default function NewPlaybookPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <NewPlaybookForm />
    </div>
  );
}
