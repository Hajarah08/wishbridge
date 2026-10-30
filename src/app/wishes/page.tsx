import type { Metadata } from "next";
import { getCategories, listPublicWishes, type ExploreFilters } from "@/lib/queries";
import { COUNTRIES } from "@/lib/countries";
import { WishGrid } from "@/components/wish-card";
import { EmptyState } from "@/components/ui/misc";
import { Pagination } from "@/components/ui/pagination";
import { ButtonLink, Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";

export const metadata: Metadata = { title: "Explore wishes" };
export const dynamic = "force-dynamic";

const STATUSES = { open: "Open for offers", in_progress: "Being fulfilled", fulfilled: "Fulfilled", all: "All public" } as const;
const SORTS = { newest: "Newest", oldest: "Oldest", closest: "Closest to target", recently_fulfilled: "Recently fulfilled" } as const;

function pick<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

export default async function ExplorePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const categories = await getCategories();
  const filters: ExploreFilters = {
    q: str("q")?.slice(0, 100),
    category: pick(str("category"), categories.map((c) => c.slug)),
    country: pick(str("country"), COUNTRIES.map((c) => c.code)),
    status: pick(str("status"), Object.keys(STATUSES) as (keyof typeof STATUSES)[]) ?? "open",
    sort: pick(str("sort"), Object.keys(SORTS) as (keyof typeof SORTS)[]) ?? "newest",
    page: Number(str("page")) || 1,
  };
  const { wishes, total, page, totalPages } = await listPublicWishes(filters);

  const makeHref = (p: number) => {
    const params = new URLSearchParams();
    Object.entries({ ...filters, page: p }).forEach(([k, v]) => {
      if (v !== undefined && v !== "" && !(k === "page" && v === 1)) params.set(k, String(v));
    });
    return `/wishes?${params.toString()}`;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-plum-900 sm:text-4xl">Explore wishes</h1>
          <p className="mt-1 text-ink-soft">Every wish here has been reviewed by our moderators.</p>
        </div>
        <ButtonLink href="/dashboard/wishes/new" variant="coral">Make a Wish</ButtonLink>
      </div>

      <form method="get" role="search" aria-label="Filter wishes" className="mb-8 grid gap-3 rounded-2xl bg-white p-4 shadow-soft ring-1 ring-ivory-300/70 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
        <label className="sr-only" htmlFor="q">Search</label>
        <Input id="q" name="q" type="search" placeholder="Search wishes…" defaultValue={filters.q} maxLength={100} />
        <label className="sr-only" htmlFor="category">Category</label>
        <Select id="category" name="category" defaultValue={filters.category ?? ""}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.slug} value={c.slug}>{c.icon} {c.name}</option>)}
        </Select>
        <label className="sr-only" htmlFor="country">Country</label>
        <Select id="country" name="country" defaultValue={filters.country ?? ""}>
          <option value="">All countries</option>
          {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
        </Select>
        <label className="sr-only" htmlFor="status">Status</label>
        <Select id="status" name="status" defaultValue={filters.status}>
          {Object.entries(STATUSES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
        <label className="sr-only" htmlFor="sort">Sort by</label>
        <Select id="sort" name="sort" defaultValue={filters.sort}>
          {Object.entries(SORTS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
        <Button type="submit" className="sm:col-span-2 lg:col-span-1">Apply</Button>
      </form>

      <p className="mb-4 text-sm text-ink-soft" aria-live="polite">{total} wish{total === 1 ? "" : "es"} found</p>
      {wishes.length ? (
        <WishGrid wishes={wishes} />
      ) : (
        <EmptyState title="No wishes match those filters" action={<ButtonLink href="/wishes" variant="secondary">Clear filters</ButtonLink>}>
          Try a different keyword, category or country.
        </EmptyState>
      )}
      <Pagination page={page} totalPages={totalPages} makeHref={makeHref} />
    </div>
  );
}
