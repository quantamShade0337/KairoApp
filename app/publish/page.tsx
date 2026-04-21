import { Suspense } from "react";
import PublishClientPage from "@/app/publish/PublishClientPage";

export const dynamic = "force-dynamic";

export default async function PublishPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  const params = await searchParams;

  return (
    <Suspense fallback={null}>
      <PublishClientPage requestedProjectId={params.projectId ?? null} />
    </Suspense>
  );
}
