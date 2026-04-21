import { Suspense } from "react";
import OnboardingClientPage from "@/app/onboarding/OnboardingClientPage";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; redirectTo?: string; reason?: string }>;
}) {
  const params = await searchParams;

  return (
    <Suspense fallback={null}>
      <OnboardingClientPage
        initialMode={params.mode === "signin" ? "signin" : "signup"}
        redirectTo={params.redirectTo ?? ""}
        initialReason={params.reason ?? ""}
      />
    </Suspense>
  );
}
