import CompanionCard from "@/components/CompanionCard";
import CompanionsList from "@/components/CompanionsList";
import CTA from "@/components/CTA";
import { Button } from "@/components/ui/button";
import { recentSessions } from "@/constants";
import {
  getAllCompanions,
  getRecentSessions,
  getSavedCompanionIds,
} from "@/lib/actions/companion.actions";
import { getSubjectColor } from "@/lib/utils";

const Page = async () => {
  const [companions, recentSessionsCompanions, savedIds] = await Promise.all([
    getAllCompanions({ limit: 3 }),
    getRecentSessions(10),
    getSavedCompanionIds(),
  ]);
  return (
    <main>
      <h1>Popular Companions</h1>
      <section className="companions-grid">
        {companions.map((companion) => (
          <CompanionCard
            key={companion.id}
            {...companion}
            color={getSubjectColor(companion.subject)}
            isSaved={savedIds.has(companion.id)}
          />
        ))}
      </section>
      <section className="home-section">
        <CompanionsList
          title="Recently completed sessions"
          companions={recentSessionsCompanions}
          classNames="w-2/3 max-lg:w-full"
        />
        <CTA />
      </section>
    </main>
  );
};

export default Page;
