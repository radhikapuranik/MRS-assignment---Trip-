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
