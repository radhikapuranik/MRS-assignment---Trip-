import { NextResponse } from "next/server";

function describe(value: string | undefined) {
  if (value === undefined) return { present: false };
  return {
    present: true,
    length: value.length,
    hasLeadingWhitespace: /^\s/.test(value),
    hasTrailingWhitespace: /\s$/.test(value),
    hasInternalWhitespace: /\s/.test(value.trim()),
    first4: value.slice(0, 4),
    last4: value.slice(-4),
  };
}

export async function GET() {
  return NextResponse.json({
    SUPABASE_URL: describe(process.env.SUPABASE_URL),
    SUPABASE_SERVICE_ROLE_KEY: describe(process.env.SUPABASE_SERVICE_ROLE_KEY),
    GEMINI_API_KEY: describe(process.env.GEMINI_API_KEY),
  });
}
