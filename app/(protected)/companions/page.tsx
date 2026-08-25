/**
 * Companion Library Page
 *
 * Server Component — runs on the server for each request.
 *
 * Data strategy
 * ─────────────
 * We fan-out two independent queries in parallel with `Promise.all`:
 *  1. `getAllCompanions`      – the visible companion grid (filtered by search).
 *  2. `getSavedCompanionIds` – a lightweight Set of companion IDs the current
 *     user has bookmarked, used to seed the `isSaved` prop on each card.
 *
 * The Set lookup is O(1) per card, keeping the render loop cost constant
 * regardless of how many companions exist in the library.
 *
 * After a bookmark toggle the Server Action calls `revalidatePath("/companions")`
 * which causes Next.js to re-stream this component's RSC payload in the same
 * HTTP response — no client-side refetch needed.
 */

import CompanionCard from "@/components/CompanionCard";
import SubjectFilter from "@/components/SubjectFilter";
import {
  getAllCompanions,
  getSavedCompanionIds,
} from "@/lib/actions/companion.actions";
import { getSubjectColor } from "@/lib/utils";
import SearchInput from "@/components/SearchInput";

export const CompanionsLibrary = async ({ searchParams }: SearchParams) => {
  const filters = await searchParams;
  const subject = filters.subject ? filters.subject : "";
  const topic = filters.topic ? filters.topic : "";

  // Fan-out independent DB queries in parallel for minimal latency.
  const [companions, savedIds] = await Promise.all([
    getAllCompanions({ subject, topic }),
    getSavedCompanionIds(),
  ]);

  return (
    <main>
      {/* ── Page header + search/filter controls ── */}
      <section className="flex justify-between gap-4 max-sm:flex-col">
        <h1>Companion Library</h1>
        <div className="flex gap-4">
          <SearchInput />
          <SubjectFilter />
        </div>
      </section>

      {/* ── Companion grid ── */}
      <section className="companions-grid">
        {companions.map((companion) => (
          <CompanionCard
            key={companion.id}
            {...companion}
            color={getSubjectColor(companion.subject)}
            // Pass server-resolved saved state so the card renders correctly
            // on first paint without a client-side fetch.
            isSaved={savedIds.has(companion.id)}
          />
        ))}
      </section>
    </main>
  );
};

export default CompanionsLibrary;
