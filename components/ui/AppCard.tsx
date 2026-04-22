"use client";

import Link from "next/link";

type AppCardItem = {
  id: string;
  name: string;
  description: string;
  creator: string;
  category: string;
  uses: number;
  clones: number;
  priceCents?: number;
};

export function AppCardSkeleton() {
  return (
    <div className="border border-[#eaeaea] rounded-xl p-5 flex flex-col gap-3 bg-white">
      <div className="skeleton h-4 w-2/3 rounded" />
      <div className="skeleton h-3 w-full rounded mt-1" />
      <div className="skeleton h-3 w-4/5 rounded" />
      <div className="flex justify-between items-center mt-auto pt-4 border-t border-[#eaeaea]">
        <div className="skeleton h-3 w-20 rounded" />
        <div className="skeleton h-3 w-14 rounded" />
      </div>
    </div>
  );
}

export default function AppCard({ app }: { app: AppCardItem }) {
  const priceCents = app.priceCents ?? 0;
  const priceLabel = priceCents > 0 ? `$${(priceCents / 100).toFixed(priceCents % 100 === 0 ? 0 : 2)}` : "Free";

  return (
    <Link
      href={`/market/${app.id}`}
      className="group border border-[#eaeaea] rounded-xl p-5 flex flex-col gap-2.5 hover:border-black hover:shadow-[0_2px_20px_rgba(0,0,0,0.07)] transition-all duration-200 cursor-pointer bg-white"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-black leading-snug group-hover:text-[#4F46E5] transition-colors duration-150 line-clamp-1">
          {app.name}
        </h3>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-mono text-[#aaa] border border-[#eaeaea] rounded-full px-2 py-0.5 bg-[#fafafa]">
            {app.category}
          </span>
          {priceCents > 0 ? (
            <span className="text-[10px] font-mono text-black border border-[#eaeaea] rounded-full px-2 py-0.5 font-semibold">
              {priceLabel}
            </span>
          ) : (
            <span className="text-[10px] font-mono text-[#10B981] border border-[#10B981]/20 rounded-full px-2 py-0.5 bg-[#f0fdf4]">
              Free
            </span>
          )}
        </div>
      </div>

      <p className="text-xs text-[#666] leading-relaxed line-clamp-2 flex-1">
        {app.description}
      </p>

      <div className="flex items-center justify-between pt-3 mt-auto border-t border-[#eaeaea]">
        <span className="text-xs text-[#aaa] font-mono truncate max-w-[120px]">
          {app.creator}
        </span>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[11px] text-[#ccc] font-mono">{app.uses.toLocaleString()} uses</span>
          <span className="text-[11px] font-semibold text-[#aaa] group-hover:text-[#4F46E5] transition-colors duration-150">Open →</span>
        </div>
      </div>
    </Link>
  );
}
