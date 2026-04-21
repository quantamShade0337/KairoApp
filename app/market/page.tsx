import { Suspense } from "react";
import MarketClientPage from "@/app/market/MarketClientPage";

export const dynamic = "force-dynamic";

export default async function MarketPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;

  return (
    <Suspense fallback={null}>
      <MarketClientPage initialQuery={params.q ?? ""} />
    </Suspense>
  );
}
