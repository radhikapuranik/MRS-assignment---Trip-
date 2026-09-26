import { GoogleGenAI } from "@google/genai";
import type { Preference, RecommendationResult } from "./types";

const GEMINI_TIMEOUT_MS = 45_000;

function buildPrompt(preferences: Preference[]): string {
  const people = preferences
    .map((p) => {
      return [
        `- Name: ${p.name}`,
        `  Budget per person: ₹${p.budget}`,
        `  Available: ${p.date_start} to ${p.date_end}`,
        `  Wants: ${p.destination_types.join(", ")}`,
        `  Dealbreakers: ${p.dealbreakers?.trim() ? p.dealbreakers : "none stated"}`,
      ].join("\n");
    })
    .join("\n");

  return `You are helping a group of friends decide on a trip together based on their submitted preferences.

Here is everyone's submitted data:
${people}

Suggest 2 to 3 destination options that best balance the group's budgets, overlapping availability, destination type preferences, and dealbreakers. For each option, evaluate every single person listed above individually.

For each option, also work out the group's realistic overlapping availability window for that destination and pick a sensible trip length (typically 3 to 6 days) that fits inside it. Build a day-by-day itinerary for that many days.

Respond with STRICT JSON only, no markdown code fences, no extra commentary, matching exactly this shape:

{
  "options": [
    {
      "destination": "string",
      "pitch": "one sentence",
      "perPerson": [
        { "name": "string", "verdict": "good fit | partial fit | poor fit", "reason": "one sentence referencing their actual budget, dates, destination type preference, or dealbreakers" }
      ],
      "tripLengthDays": 4,
      "itinerary": [
        { "day": 1, "title": "short day title", "morning": "one sentence", "afternoon": "one sentence", "evening": "one sentence" }
      ]
    }
  ]
}

Every option's "perPerson" array must include exactly one entry for each of these ${preferences.length} people, in any order: ${preferences.map((p) => p.name).join(", ")}. The "verdict" field must be exactly one of "good fit", "partial fit", or "poor fit". "itinerary" must have exactly "tripLengthDays" entries, numbered 1..N in order.`;
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // fall through to bracket extraction
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in Gemini response");
  }
  const candidate = trimmed.slice(start, end + 1);
  return JSON.parse(candidate);
}

const VALID_VERDICTS = new Set(["good fit", "partial fit", "poor fit"]);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidItineraryDay(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const d = value as Record<string, unknown>;
  return (
    typeof d.day === "number" &&
    isNonEmptyString(d.title) &&
    isNonEmptyString(d.morning) &&
    isNonEmptyString(d.afternoon) &&
    isNonEmptyString(d.evening)
  );
}

function isValidRecommendation(data: unknown): data is RecommendationResult {
  if (!data || typeof data !== "object") return false;
  const options = (data as { options?: unknown }).options;
  if (!Array.isArray(options) || options.length === 0) return false;

  for (const option of options) {
    if (!option || typeof option !== "object") return false;
    const o = option as Record<string, unknown>;
    if (typeof o.destination !== "string" || !o.destination.trim()) return false;
    if (typeof o.pitch !== "string" || !o.pitch.trim()) return false;
    if (!Array.isArray(o.perPerson) || o.perPerson.length === 0) return false;

    for (const person of o.perPerson) {
      if (!person || typeof person !== "object") return false;
      const p = person as Record<string, unknown>;
      if (typeof p.name !== "string" || !p.name.trim()) return false;
      if (typeof p.verdict !== "string" || !VALID_VERDICTS.has(p.verdict)) return false;
      if (typeof p.reason !== "string" || !p.reason.trim()) return false;
    }

    if (typeof o.tripLengthDays !== "number" || o.tripLengthDays <= 0) return false;
    if (!Array.isArray(o.itinerary) || o.itinerary.length === 0) return false;
    if (!o.itinerary.every(isValidItineraryDay)) return false;
  }

  return true;
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("Gemini request timed out")), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timeoutId!);
  }
}

export async function generateRecommendation(
  preferences: Preference[]
): Promise<RecommendationResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY environment variable");
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = buildPrompt(preferences);

  const response = await withTimeout(
    ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    }),
    GEMINI_TIMEOUT_MS
  );

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  let parsed: unknown;
  try {
    parsed = extractJson(text);
  } catch {
    throw new Error("recommendation generation failed, please retry");
  }

  if (!isValidRecommendation(parsed)) {
    throw new Error("recommendation generation failed, please retry");
  }

  return parsed;
}
