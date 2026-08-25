"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createSupabaseClient } from "../supabase";

export const createCompanion = async (formData: CreateCompanion) => {
  const { userId: author } = await auth();
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("companions")
    .insert({
      ...formData,
      author,
    })
    .select();

  if (error || !data)
    throw new Error(error?.message || "Failed to create a companion");

  return data[0];
};

export const getAllCompanions = async ({
  limit = 10,
  page = 1,
  subject,
  topic,
}: GetAllCompanions) => {
  const supabase = createSupabaseClient();

  let query = supabase.from("companions").select();

  if (subject && topic) {
    query = query
      .ilike("subject", `%${subject}%`)
      .or(`topic.ilike.%${topic}%,name.ilike.%${topic}%`);
  } else if (subject) {
    query = query.ilike("subject", `%${subject}%`);
  } else if (topic) {
    query = query.or(`topic.ilike.%${topic}%,name.ilike.%${topic}%`);
  }

  query = query.range((page - 1) * limit, page * limit - 1);

  const { data: companions, error } = await query;

  if (error) throw new Error(error.message);

  return companions;
};

export const getCompanion = async (id: string) => {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("companions")
    .select()
    .eq("id", id);

  if (error) return console.log(error);

  return data[0];
};

export const addToSessionHistory = async (companionId: string) => {
  const { userId } = await auth();
  const supabase = createSupabaseClient();
  const { data, error } = await supabase.from("session_history").insert({
    companion_id: companionId,
    user_id: userId,
  });

  if (error) throw new Error(error.message);

  return data;
};

/**
 * `session_history` is an append-only event log: one row per completed lesson.
 * The "recent sessions" lists are a *companion* feed, not an event feed, so a
 * companion must appear once — at the position of its most recent session.
 *
 * Postgres would express this as `DISTINCT ON (companion_id)`, which PostgREST
 * cannot emit, so we over-fetch a bounded window of the newest events and
 * collapse them in order. The multiplier keeps the list full when a user has
 * replayed a handful of companions many times.
 */
const SESSION_FETCH_MULTIPLIER = 10;
const MAX_SESSION_FETCH = 200;

type SessionHistoryRow = { companions: Companion | null };

const sessionFetchWindow = (limit: number) =>
  Math.min(limit * SESSION_FETCH_MULTIPLIER, MAX_SESSION_FETCH);

const toRecentCompanions = (rows: SessionHistoryRow[], limit: number) => {
  const seen = new Set<string>();
  const companions: Companion[] = [];

  for (const { companions: companion } of rows) {
    // Null once the companion is deleted after its session was recorded.
    if (!companion || seen.has(companion.id)) continue;

    seen.add(companion.id);
    companions.push(companion);

    if (companions.length === limit) break;
  }

  return companions;
};

export const getRecentSessions = async (limit = 10) => {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("session_history")
    .select(`companions:companion_id (*)`)
    .order("created_at", { ascending: false })
    .limit(sessionFetchWindow(limit));

  if (error) throw new Error(error.message);

  return toRecentCompanions(data as unknown as SessionHistoryRow[], limit);
};

export const getUserSessions = async (userId: string, limit = 10) => {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("session_history")
    .select(`companions:companion_id (*)`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(sessionFetchWindow(limit));

  if (error) throw new Error(error.message);

  return toRecentCompanions(data as unknown as SessionHistoryRow[], limit);
};

/**
 * Total lessons completed — counted from the raw event log, since the recent
 * session lists are deduplicated per companion and can no longer stand in.
 */
export const getUserSessionCount = async (userId: string) => {
  const supabase = createSupabaseClient();
  const { count, error } = await supabase
    .from("session_history")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  return count ?? 0;
};

export const getUserCompanions = async (userId: string) => {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("companions")
    .select()
    .eq("author", userId);

  if (error) throw new Error(error.message);

  return data;
};

export const newCompanionPermissions = async () => {
  const { userId, has } = await auth();
  const supabase = createSupabaseClient();

  let limit = 0;

  if (has({ plan: "pro" })) {
    return true;
  } else if (has({ feature: "3_companion_limit" })) {
    limit = 3;
  } else if (has({ feature: "10_companion_limit" })) {
    limit = 3;
  }

  const { data, error } = await supabase
    .from("companions")
    .select("id", { count: "exact" })
    .eq("author", userId);

  if (error) throw new Error(error.message);

  const companionCount = data?.length;

  if (companionCount >= limit) {
    return false;
  } else {
    return true;
  }
};

// ---------------------------------------------------------------------------
// Saved Companions
// ---------------------------------------------------------------------------

/**
 * Toggles the saved/bookmarked state for a companion for the current user.
 *
 * Strategy: upsert on (user_id, companion_id) — if the row exists the
 * companion is already saved and we delete it; otherwise we insert.
 * A single DB round-trip per branch keeps latency minimal.
 *
 * After mutating we call `revalidatePath` for both the library and the
 * user's journey page so Next.js re-renders the affected RSC trees in the
 * same HTTP response as the action (single-roundtrip model).
 *
 * @param companionId - The UUID of the companion to toggle.
 * @returns `{ saved: boolean }` — the new bookmark state after the toggle.
 */
export const toggleSaveCompanion = async (
  companionId: string
): Promise<{ saved: boolean }> => {
  // 1. Authenticate — every mutation must verify the caller.
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized: please sign in to save companions.");

  const supabase = createSupabaseClient();

  // 2. Check current saved state for this user + companion pair.
  const { data: existing, error: fetchError } = await supabase
    .from("saved_companions")
    .select("id")
    .eq("user_id", userId)
    .eq("companion_id", companionId)
    .maybeSingle(); // returns null if not found, never throws on 0 rows

  if (fetchError) throw new Error(fetchError.message);

  if (existing) {
    // 3a. Already saved → remove the bookmark.
    const { error: deleteError } = await supabase
      .from("saved_companions")
      .delete()
      .eq("id", existing.id);

    if (deleteError) throw new Error(deleteError.message);

    // Revalidate affected pages so the RSC payload is fresh.
    revalidatePath("/companions");
    revalidatePath("/my-journey");

    return { saved: false };
  }

  // 3b. Not yet saved → create the bookmark.
  const { error: insertError } = await supabase
    .from("saved_companions")
    .insert({ user_id: userId, companion_id: companionId });

  if (insertError) throw new Error(insertError.message);

  // Revalidate affected pages so the RSC payload is fresh.
  revalidatePath("/companions");
  revalidatePath("/my-journey");

  return { saved: true };
};

/**
 * Returns the list of companion IDs that the current user has saved.
 *
 * Used by the Companion Library page to seed initial bookmark state per card
 * without a per-card DB call.
 *
 * @returns A `Set<string>` of saved companion IDs for O(1) lookups.
 */
export const getSavedCompanionIds = async (): Promise<Set<string>> => {
  const { userId } = await auth();
  if (!userId) return new Set();

  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("saved_companions")
    .select("companion_id")
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  // Return a Set for O(1) inclusion checks in the rendering loop.
  return new Set(data.map((row) => row.companion_id));
};

/**
 * Fetches the full companion records that the current user has saved/bookmarked.
 *
 * Joins `saved_companions` → `companions` via a Supabase embedded resource
 * so we get the full companion shape in a single query.
 *
 * @returns An array of `Companion` objects, ordered newest-bookmark-first.
 */
export const getSavedCompanions = async (): Promise<Companion[]> => {
  const { userId } = await auth();
  if (!userId) return [];

  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("saved_companions")
    .select("companions:companion_id (*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  // Unwrap the nested join result and filter out any nulls (deleted companions).
  return data
    .map((row) => row.companions as unknown as Companion)
    .filter(Boolean);
};
