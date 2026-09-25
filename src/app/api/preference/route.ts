import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name")?.trim();
  if (!name) {
    return NextResponse.json({ error: "Missing name." }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("preferences")
      .select("name, budget, date_start, date_end, destination_types, dealbreakers")
      .eq("name", name)
      .maybeSingle();

    if (error) {
      console.error("Supabase lookup error:", error);
      return NextResponse.json(
        { error: "Could not load your previous response. Please try again." },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ error: "No previous response found for that name." }, { status: 404 });
    }

    return NextResponse.json({ preference: data });
  } catch (err) {
    console.error("Unexpected error in /api/preference:", err);
    return NextResponse.json(
      { error: "Something went wrong loading your previous response. Please try again." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name")?.trim();
  if (!name) {
    return NextResponse.json({ error: "Missing name." }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("preferences")
      .delete()
      .eq("name", name)
      .select("id");

    if (error) {
      console.error("Supabase delete error:", error);
      return NextResponse.json(
        { error: "Could not delete your response right now. Please try again." },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "No response found for that name." }, { status: 404 });
    }

    const { error: cacheError } = await supabase.from("recommendation_cache").delete().eq("id", 1);
    if (cacheError) {
      console.error("Error invalidating recommendation cache after delete:", cacheError);
    }

    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("Unexpected error in DELETE /api/preference:", err);
    return NextResponse.json(
      { error: "Something went wrong deleting your response. Please try again." },
      { status: 500 }
    );
  }
}
