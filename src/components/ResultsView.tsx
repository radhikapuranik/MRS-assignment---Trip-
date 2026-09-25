"use client";

import { useCallback, useEffect, useState } from "react";
import type { RecommendResponse, RecommendationOption, Verdict } from "@/lib/types";

type LoadState =
  | { kind: "loading" }
  | { kind: "waiting"; responseCount: number }
  | { kind: "ready"; responseCount: number; options: RecommendationOption[] }
  | { kind: "error"; message: string };

const VERDICT_STYLES: Record<Verdict, string> = {
  "good fit": "bg-green-100 text-green-800",
  "partial fit": "bg-yellow-100 text-yellow-800",
  "poor fit": "bg-red-100 text-red-800",
};

export default function ResultsView() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setState({ kind: "loading" });
    }

    try {
      const res = await fetch("/api/recommend", { cache: "no-store" });
      const data: RecommendResponse & { error?: string } = await res.json().catch(() => ({
        error: "malformed response",
      }));

      if (!res.ok || !data || typeof data.status !== "string") {
        setState({
          kind: "error",
          message:
            data?.error ||
            "We couldn't generate recommendations right now — try refreshing.",
        });
        return;
      }

      if (data.status === "waiting") {
        setState({ kind: "waiting", responseCount: data.responseCount });
      } else if (data.status === "ready" && Array.isArray(data.options)) {
        setState({
          kind: "ready",
          responseCount: data.responseCount,
          options: data.options,
        });
      } else {
        setState({
          kind: "error",
          message: "We couldn't generate recommendations right now — try refreshing.",
        });
      }
    } catch {
      setState({
        kind: "error",
        message: "We couldn't generate recommendations right now — try refreshing.",
      });
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    load();
  }, [load]);

  const responseCount =
    state.kind === "waiting" || state.kind === "ready" ? state.responseCount : null;

  return (
    <div className="w-full max-w-2xl flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Trip recommendations</h1>
          {responseCount !== null && (
            <p className="mt-1 text-sm text-gray-500">
              {responseCount} of the group have responded so far
            </p>
          )}
        </div>
        <button
          onClick={() => load(true)}
          disabled={isRefreshing || state.kind === "loading"}
          className="shrink-0 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium disabled:opacity-50"
        >
          {isRefreshing ? "Refreshing..." : "Refresh recommendations"}
        </button>
      </div>

      {state.kind === "loading" && (
        <div className="rounded-md border border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
          Loading recommendations...
        </div>
      )}

      {state.kind === "waiting" && (
        <div className="rounded-md border border-gray-200 px-4 py-8 text-center text-sm text-gray-600">
          Waiting on more responses before we can suggest anything.
        </div>
      )}

      {state.kind === "error" && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-4 text-sm text-red-700">
          {state.message}
        </div>
      )}

      {state.kind === "ready" && (
        <div className="flex flex-col gap-6">
          {state.options.map((option, i) => (
            <div key={i} className="rounded-lg border border-gray-200 p-4">
              <h2 className="text-lg font-semibold">{option.destination}</h2>
              <p className="mt-1 text-sm text-gray-600">{option.pitch}</p>
              <ul className="mt-3 flex flex-col gap-2">
                {option.perPerson.map((person, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm">
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        VERDICT_STYLES[person.verdict] ?? "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {person.verdict}
                    </span>
                    <span>
                      <span className="font-medium">{person.name}</span>
                      {": "}
                      {person.reason}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
