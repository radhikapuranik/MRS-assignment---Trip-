import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { generateRecommendation } from "@/lib/gemini";
import type { Preference } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = getSupabaseAdmin();

  let count: number;
  try {
    const { count: rowCount, error } = await supabase
      .from("preferences")
      .select("id", { count: "exact", head: true });

    if (error) throw error;
    count = rowCount ?? 0;
  } catch (err) {
    console.error("Error counting preferences:", err);
    return NextResponse.json(
      { error: "Could not load responses right now. Please try refreshing." },
      { status: 500 }
    );
  }

  if (count < 2) {
    return NextResponse.json({ status: "waiting", responseCount: count });
  }

  try {
    const { data: cached, error: cacheError } = await supabase
      .from("recommendation_cache")
      .select("response_count, recommendation_json")
      .eq("id", 1)
      .maybeSingle();

    if (cacheError) throw cacheError;

    if (cached && cached.response_count === count && cached.recommendation_json) {
      return NextResponse.json({
        status: "ready",
        responseCount: count,
        options: cached.recommendation_json.options,
      });
    }

    const { data: preferences, error: prefError } = await supabase
      .from("preferences")
      .select("*")
      .order("created_at", { ascending: true });

    if (prefError) throw prefError;
    if (!preferences || preferences.length !== count) {
      throw new Error("Preference count mismatch while generating recommendation");
    }

    const recommendation = await generateRecommendation(preferences as Preference[]);

    const { error: upsertError } = await supabase
      .from("recommendation_cache")
      .upsert({
        id: 1,
        response_count: count,
        recommendation_json: recommendation,
        generated_at: new Date().toISOString(),
      });

    if (upsertError) {
      console.error("Error caching recommendation:", upsertError);
    }

    return NextResponse.json({
      status: "ready",
      responseCount: count,
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
