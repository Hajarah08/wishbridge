import Link from "next/link";
import { cn } from "@/lib/cn";

export function Pagination({
  page,
  totalPages,
  makeHref,
}: {
  page: number;
  totalPages: number;
  makeHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;
  const item = "inline-flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-semibold";
  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-2">
      {page > 1 ? (
        <Link className={cn(item, "bg-white ring-1 ring-ivory-300 hover:bg-plum-50")} href={makeHref(page - 1)} rel="prev">
          ← Previous
        </Link>
      ) : null}
      <span className={cn(item, "text-ink-soft")} aria-current="page">
        Page {page} of {totalPages}
      </span>
      {page < totalPages ? (
        <Link className={cn(item, "bg-white ring-1 ring-ivory-300 hover:bg-plum-50")} href={makeHref(page + 1)} rel="next">
          Next →
        </Link>
      ) : null}
    </nav>
  );
}
