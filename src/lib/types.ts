export const DESTINATION_TYPES = [
  "beach",
  "mountains",
  "city",
  "nature/wildlife",
  "spiritual/heritage",
] as const;

export type DestinationType = (typeof DESTINATION_TYPES)[number];

export interface Preference {
  id: string;
  name: string;
  budget: number;
  date_start: string;
  date_end: string;
  destination_types: string[];
  dealbreakers: string | null;
  created_at: string;
  updated_at: string;
}

export type Verdict = "good fit" | "partial fit" | "poor fit";

export interface RecommendationPerPerson {
  name: string;
  verdict: Verdict;
  reason: string;
}

export interface RecommendationOption {
  destination: string;
  pitch: string;
  perPerson: RecommendationPerPerson[];
}

export interface RecommendationResult {
  options: RecommendationOption[];
}

export type RecommendResponse =
  | { status: "waiting"; responseCount: number }
  | ({ status: "ready"; responseCount: number } & RecommendationResult);
