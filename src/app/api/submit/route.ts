import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { validateSubmitPayload, hasErrors, SubmitPayload } from "@/lib/validation";

export async function POST(req: NextRequest) {
  let body: Partial<SubmitPayload>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  const errors = validateSubmitPayload(body);
  if (hasErrors(errors)) {
    return NextResponse.json(
      { error: "Please fix the highlighted fields.", fieldErrors: errors },
      { status: 400 }
    );
  }

  const name = body.name!.trim();
  const dealbreakers = body.dealbreakers?.trim() || null;

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("preferences")
      .upsert(
        {
          name,
          budget: body.budget,
          date_start: body.dateStart,
          date_end: body.dateEnd,
          destination_types: body.destinationTypes,
          dealbreakers,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "name" }
      )
      .select("id")
      .single();

    if (error) {
      console.error("Supabase upsert error:", error);
      return NextResponse.json(
        { error: "Could not save your response right now. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ id: data.id }, { status: 200 });
  } catch (err) {
    console.error("Unexpected error in /api/submit:", err);
    return NextResponse.json(
      { error: "Something went wrong saving your response. Please try again." },
      { status: 500 }
    );
  }
}
