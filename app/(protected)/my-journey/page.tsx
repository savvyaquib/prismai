/**
 * My Journey Profile Page
 *
 * Server Component — all data is fetched on the server.
 *
 * Data strategy
 * ─────────────
 * All four queries run in parallel via `Promise.all` to minimise waterfall
 * latency.  Adding `getSavedCompanions` here means the "Saved" accordion is
 * populated on first paint without a separate client fetch.
 *
 * The Saved accordion is re-rendered automatically whenever the user toggles a
 * bookmark on the Companion Library page, because `toggleSaveCompanion` calls
 * `revalidatePath("/my-journey")` as part of the same HTTP response.
 */

import CompanionsList from "@/components/CompanionsList";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  getUserCompanions,
  getUserSessionCount,
  getUserSessions,
  getSavedCompanions,
} from "@/lib/actions/companion.actions";
import { currentUser } from "@clerk/nextjs/server";
import Image from "next/image";

export const Profile = async () => {
  const user = await currentUser();

  // Fan-out all data queries in parallel — none depends on another.
  const [sessions, sessionCount, companions, savedCompanions] =
    await Promise.all([
      getUserSessions(user?.id!),
      getUserSessionCount(user?.id!),
      getUserCompanions(user?.id!),
      getSavedCompanions(),
    ]);

  return (
    <main className="min-lg:w-3/4">
      {/* ── User identity + stats ── */}
      <section className="flex justify-between gap-4 max-sm:flex-col items-center">
        <div className="flex gap-4 items-center">
          <Image
            src={user?.imageUrl!}
            alt={user?.firstName!}
            width={110}
            height={110}
          />
          <div className="flex flex-col gap-2">
            <h1 className="font-bold text-2xl">
              {user?.firstName} {user?.lastName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {user?.emailAddresses[0]?.emailAddress}
            </p>
          </div>
        </div>

        {/* ── Stat badges ── */}
        <div className="flex gap-4">
          {/* Lessons completed */}
          <div className="border border-black rounded-lg p-3 gap-2 flex flex-col h-fit">
            <div className="flex gap-2 items-center">
              <Image
                src={"/icons/check.svg"}
                alt="checkmark"
                width={22}
                height={22}
              />
              <p className="font-bold text-2xl">{sessionCount}</p>
            </div>
            <div>Lessons completed</div>
          </div>

          {/* Companions created */}
          <div className="border border-black rounded-lg p-3 gap-2 flex flex-col h-fit">
            <div className="flex gap-2 items-center">
              <Image src={"/icons/cap.svg"} alt="cap" width={22} height={22} />
              <p className="font-bold text-2xl">{companions?.length}</p>
            </div>
            <div>Companions created</div>
          </div>

          {/* Saved companions count */}
          <div className="border border-black rounded-lg p-3 gap-2 flex flex-col h-fit">
            <div className="flex gap-2 items-center">
              {/*
               * Bookmark icon — reuses the existing asset already present in
               * /public/icons/.  If you have a filled variant use that here.
               */}
              <Image
                src={"/icons/bookmark-orange.svg"}
                alt="bookmark"
                width={22}
                height={22}
              />
              <p className="font-bold text-2xl">{savedCompanions.length}</p>
            </div>
            <div>Companions saved</div>
          </div>
        </div>
      </section>

      {/* ── Accordion sections ── */}
      <Accordion type="multiple">
        {/* Recent Sessions */}
        <AccordionItem value="recent">
          <AccordionTrigger className="text-2xl font-bold">
            Recent Sessions
          </AccordionTrigger>
          <AccordionContent>
            <CompanionsList title="Recent Sessions" companions={sessions} />
          </AccordionContent>
        </AccordionItem>

        {/* My Companions (created) */}
        <AccordionItem value="companions">
          <AccordionTrigger className="text-2xl font-bold">
            My Companions
          </AccordionTrigger>
          <AccordionContent>
            <CompanionsList title="My Companions" companions={companions} />
          </AccordionContent>
        </AccordionItem>

        {/*
         * Saved Companions
         * ─────────────────
         * Populated by the bookmark action on the Companion Library page.
         * The accordion is always rendered so the count badge stays accurate;
         * an empty state message guides the user when nothing is saved yet.
         */}
        <AccordionItem value="saved">
          <AccordionTrigger className="text-2xl font-bold hover:no-underline">
            <div className="flex flex-1 items-center justify-between pr-4">
              <span>Saved Companions</span>
              {savedCompanions.length > 0 && (
                <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {savedCompanions.length}
                </span>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent>
            {savedCompanions.length > 0 ? (
              <CompanionsList
                title="Saved Companions"
                companions={savedCompanions}
              />
            ) : (
              /* Empty state — shown when the user hasn't saved anything yet. */
              <p className="text-muted-foreground text-sm px-2 py-4">
                No saved companions yet. Browse the{" "}
                <a href="/companions" className="underline font-medium">
                  Companion Library
                </a>{" "}
                and click the bookmark icon to save companions here.
              </p>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </main>
  );
};

export default Profile;
