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
    <div className="border border-[#eaeaea] rounded-lg p-5 flex flex-col gap-3">
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
      className="group border border-[#eaeaea] rounded-lg p-5 flex flex-col gap-2 hover:border-black transition-all duration-150 cursor-pointer bg-white hover:shadow-[0_1px_8px_rgba(0,0,0,0.06)]"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-black leading-snug group-hover:text-[#4F46E5] transition-colors duration-150">
          {app.name}
        </h3>
        <span className="text-[11px] text-[#666] bg-[#f5f5f5] px-2 py-0.5 rounded-full shrink-0 font-mono leading-5 flex items-center gap-1.5">
          <span>{app.category}</span>
          <span className="text-[#999]">·</span>
          <span>{priceLabel}</span>
        </span>
      </div>

      <p className="text-xs text-[#666] leading-relaxed line-clamp-2 flex-1">
        {app.description}
      </p>

      <div className="flex items-center justify-between pt-4 mt-auto border-t border-[#eaeaea]">
        <span className="text-xs text-[#666]">
          <span className="text-black font-medium">{app.creator}</span>
        </span>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-[#666] font-mono">
            {app.uses.toLocaleString()} uses
          </span>
          <span className="text-[11px] text-[#666] group-hover:text-black transition-colors duration-150 font-medium">
            Open →
          </span>
        </div>
      </div>
    </Link>
  );
}
