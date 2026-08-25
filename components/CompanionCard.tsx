"use client";

/**
 * CompanionCard
 *
 * Displays a single companion in the library grid.
 *
 * Bookmark / Save behaviour
 * ─────────────────────────
 * • `isSaved` is seeded by the parent Server Component so the initial render
 *   reflects the real DB state without a client-side fetch.
 * • When the user clicks the bookmark button we call `toggleSaveCompanion`
 *   (a Server Action).  We use `useOptimistic` so the icon flips instantly
 *   while the network request is in flight — a standard React 19 / Next.js
 *   pattern for mutations (see /docs/app/guides/server-actions.md).
 * • If the server action throws, React automatically rolls back the optimistic
 *   value to the last committed state.
 */

import { useOptimistic, useTransition } from "react";
import { Button } from "./ui/button";
import Image from "next/image";
import Link from "next/link";
import { toggleSaveCompanion } from "@/lib/actions/companion.actions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CompanionCardProps {
  id: string;
  name: string;
  topic: string;
  subject: string;
  duration: number;
  color: string;
  /** Whether the current user has already saved/bookmarked this companion. */
  isSaved?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const CompanionCard = ({
  id,
  name,
  topic,
  subject,
  duration,
  color,
  isSaved = false,
}: CompanionCardProps) => {
  /**
   * `useTransition` gives us `isPending` so we can disable the button while
   * the server action is in-flight, preventing double-clicks.
   */
  const [isPending, startTransition] = useTransition();

  /**
   * `useOptimistic` (React 19) mirrors the committed `isSaved` value but lets
   * us apply an instant local update before the server confirms.
   *
   * Signature: useOptimistic(state, updateFn)
   * updateFn receives (currentState, optimisticValue) and returns next state.
   */
  const [optimisticSaved, setOptimisticSaved] = useOptimistic(
    isSaved,
    (_currentState: boolean, nextValue: boolean) => nextValue
  );

  /**
   * Handles the bookmark button click.
   *
   * 1. Wraps in `startTransition` — required to use `useOptimistic` and to
   *    mark the server action as a non-urgent update.
   * 2. Immediately applies the optimistic toggle.
   * 3. Calls the Server Action; on success `revalidatePath` in the action
   *    causes Next.js to stream fresh RSC data in the same HTTP response.
   */
  const handleSaveToggle = () => {
    startTransition(async () => {
      // Optimistically flip the bookmark icon before the network round-trip.
      setOptimisticSaved(!optimisticSaved);

      try {
        await toggleSaveCompanion(id);
      } catch (error) {
        // React automatically reverts the optimistic state on error,
        // but we log it here for observability.
        console.error("[CompanionCard] toggleSaveCompanion failed:", error);
      }
    });
  };

  return (
    <article className="companion-card" style={{ backgroundColor: color }}>
      {/* ── Header row: subject badge + bookmark button ── */}
      <div className="flex justify-between items-center">
        <div className="subject-badge">{subject}</div>

        {/*
         * Bookmark button
         * ───────────────
         * • `aria-label` reflects the current saved state for screen readers.
         * • `aria-pressed` communicates toggle semantics to assistive tech.
         * • `disabled` during in-flight requests prevents duplicate mutations.
         */}
        <Button
          className="companion-bookmark"
          onClick={handleSaveToggle}
          disabled={isPending}
          aria-pressed={optimisticSaved}
          aria-label={optimisticSaved ? "Unsave companion" : "Save companion"}
          title={optimisticSaved ? "Remove from saved" : "Save companion"}
        >
          <Image
            src={
              optimisticSaved
                ? "/icons/bookmark-filled.svg" // filled icon when saved
                : "/icons/bookmark.svg"         // outline icon when unsaved
            }
            alt={optimisticSaved ? "Saved" : "Save"}
            width={20}
            height={24}
            // Smooth icon swap without layout shift
            style={{ transition: "opacity 0.15s ease" }}
          />
        </Button>
      </div>

      {/* ── Companion details ── */}
      <h2 className="text-2xl font-bold">{name}</h2>
      <p className="text-sm">{topic}</p>

      <div className="flex items-center gap-2">
        <Image src="/icons/clock.svg" alt="Clock" width={13.5} height={13.5} />
        <p className="text-sm">{duration} minutes</p>
      </div>

      {/* ── CTA ── */}
      <Link href={`/companions/${id}`} className="w-full">
        <Button className="btn-primary w-full justify-center">
          Launch Lesson
        </Button>
      </Link>
    </article>
  );
};

export default CompanionCard;
