import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { generateRecommendation } from "@/lib/gemini";
import type { Preference, Respondent } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();

  let allPreferences: Preference[];
  try {
    const { data, error } = await supabase
      .from("preferences")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) throw error;
    allPreferences = (data ?? []) as Preference[];
  } catch (err) {
    console.error("Error loading preferences:", err);
    return NextResponse.json(
      { error: "Could not load responses right now. Please try refreshing." },
      { status: 500 }
    );
  }

  const respondents: Respondent[] = allPreferences.map((p) => ({
    name: p.name,
    updatedAt: p.updated_at,
  }));

  const namesParam = req.nextUrl.searchParams.get("names");
  const isFiltered = namesParam !== null;
  const requestedNames = isFiltered
    ? new Set(
        namesParam
          .split(",")
          .map((n) => n.trim())
          .filter(Boolean)
      )
    : null;

  const preferences = requestedNames
    ? allPreferences.filter((p) => requestedNames.has(p.name))
    : allPreferences;

  const count = preferences.length;

  if (count < 2) {
    return NextResponse.json({ status: "waiting", responseCount: count, respondents });
  }

  // A filtered (per-viewer, ephemeral) subset never reads from or writes to the
  // shared cache — that cache is reserved for the canonical full-group result.
  if (isFiltered) {
    try {
      const recommendation = await generateRecommendation(preferences);
      return NextResponse.json({
        status: "ready",
        responseCount: count,
        respondents,
        options: recommendation.options,
      });
    } catch (err) {
      console.error("Error generating filtered recommendation:", err);
      return NextResponse.json(
        { error: "We couldn't generate recommendations right now — try refreshing." },
        { status: 500 }
      );
    }
  }

  const latestResponseAt = preferences.reduce(
    (latest, p) => (p.updated_at > latest ? p.updated_at : latest),
    preferences[0].updated_at
  );

  try {
    const { data: cached, error: cacheError } = await supabase
      .from("recommendation_cache")
      .select("response_count, latest_response_at, recommendation_json")
      .eq("id", 1)
      .maybeSingle();

    if (cacheError) throw cacheError;

    if (
      cached &&
      cached.response_count === count &&
      cached.latest_response_at === latestResponseAt &&
      cached.recommendation_json
    ) {
      return NextResponse.json({
        status: "ready",
        responseCount: count,
        respondents,
        options: cached.recommendation_json.options,
      });
    }

    const recommendation = await generateRecommendation(preferences);

    const { error: upsertError } = await supabase
      .from("recommendation_cache")
      .upsert({
        id: 1,
        response_count: count,
        latest_response_at: latestResponseAt,
        recommendation_json: recommendation,
        generated_at: new Date().toISOString(),
      });

    if (upsertError) {
      console.error("Error caching recommendation:", upsertError);
    }

    return NextResponse.json({
      status: "ready",
      responseCount: count,
      respondents,
      options: recommendation.options,
    });
  } catch (err) {
    console.error("Error in /api/recommend:", err);
    return NextResponse.json(
      { error: "We couldn't generate recommendations right now — try refreshing." },
      { status: 500 }
    );
  }
}
