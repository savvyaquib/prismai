"use server";

import { auth } from "@clerk/nextjs/server";
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
