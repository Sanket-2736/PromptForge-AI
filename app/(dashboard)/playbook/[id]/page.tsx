import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PlaybookStep } from "@/lib/gemini";
import PlaybookView from "@/components/playbook/PlaybookView";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PlaybookDetailPage({ params }: Props) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as typeof session.user & { id: string }).id;

  const playbook = await db.playbook.findFirst({
    where: { id, userId },
  });

  if (!playbook) notFound();

  const steps = playbook.steps as PlaybookStep[];

  return (
    <PlaybookView
      playbookId={playbook.id}
      title={playbook.title}
      techStack={playbook.techStack}
      scope={playbook.scope}
      initialSteps={steps}
      initialDone={playbook.doneSteps}
      totalSteps={playbook.totalSteps}
    />
  );
}
