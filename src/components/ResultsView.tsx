"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import TripImage from "./TripImage";
import type {
  RecommendResponse,
  RecommendationOption,
  Respondent,
  Verdict,
} from "@/lib/types";

type LoadState =
  | { kind: "loading" }
  | { kind: "waiting"; responseCount: number }
  | { kind: "ready"; responseCount: number; options: RecommendationOption[] }
  | { kind: "empty-selection" }
  | { kind: "error"; message: string };

const GENERIC_ERROR = "We couldn't generate recommendations right now — try refreshing.";

const VERDICT_STYLES: Record<Verdict, string> = {
  "good fit": "bg-primary-light text-primary",
  "partial fit": "bg-accent/15 text-accent",
  "poor fit": "bg-red-100 text-red-700",
};

function namesKey(names: string[]): string {
  return [...names].sort().join("|");
}

interface Props {
  storedName: string | null;
  onEditRequested: (name: string) => void;
  onDeleteRequested: (name: string) => void;
  isEditLoading?: boolean;
  isDeleteLoading?: boolean;
  actionError?: string | null;
  notFoundName?: string | null;
  onGoToForm: () => void;
}

export default function ResultsView({
  storedName,
  onEditRequested,
  onDeleteRequested,
  isEditLoading,
  isDeleteLoading,
  actionError,
  notFoundName,
  onGoToForm,
}: Props) {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showQr, setShowQr] = useState(true);
  const [pageUrl, setPageUrl] = useState("");
  const [pendingAction, setPendingAction] = useState<"edit" | "delete" | null>(null);
  const [manualName, setManualName] = useState("");
  const [copied, setCopied] = useState(false);

  const [respondents, setRespondents] = useState<Respondent[]>([]);
  const [hiddenNames, setHiddenNames] = useState<Set<string>>(new Set());
  const [appliedKey, setAppliedKey] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, RecommendationOption[]>>(new Map());

  useEffect(() => {
    const canonicalUrl = process.env.NEXT_PUBLIC_SITE_URL;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- window.location is only available client-side
    setPageUrl(canonicalUrl || window.location.href);
  }, []);

  const fetchRecommendation = useCallback(
    async (namesFilter: string[] | null, isManualRefresh = false) => {
      if (isManualRefresh) {
        setIsRefreshing(true);
      } else {
        setState({ kind: "loading" });
      }

      try {
        const url = namesFilter
          ? `/api/recommend?names=${encodeURIComponent(namesFilter.join(","))}`
          : "/api/recommend";
        const res = await fetch(url, { cache: "no-store" });
        const data: RecommendResponse & { error?: string } = await res.json().catch(() => ({
          error: "malformed response",
        }));

        if (!res.ok || !data || typeof data.status !== "string") {
          setState({ kind: "error", message: data?.error || GENERIC_ERROR });
          return;
        }

        const freshRespondents = data.respondents ?? [];
        setRespondents(freshRespondents);

        if (data.status === "waiting") {
          setState({ kind: "waiting", responseCount: data.responseCount });
          setAppliedKey(null);
        } else if (data.status === "ready" && Array.isArray(data.options)) {
          const key = namesFilter
            ? namesKey(namesFilter)
            : namesKey(freshRespondents.map((r) => r.name));
          cacheRef.current.set(key, data.options);
          setState({ kind: "ready", responseCount: data.responseCount, options: data.options });
          setAppliedKey(key);
        } else {
          setState({ kind: "error", message: GENERIC_ERROR });
        }
      } catch {
        setState({ kind: "error", message: GENERIC_ERROR });
      } finally {
        setIsRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    fetchRecommendation(null);
  }, [fetchRecommendation]);

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable or denied; not worth surfacing an error for this
    }
  }

  function handleManualRefresh() {
    cacheRef.current.clear();
    setHiddenNames(new Set());
    fetchRecommendation(null, true);
  }

  function toggleHidden(name: string) {
    setHiddenNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }

  const allNames = respondents.map((r) => r.name);
  const visibleNames = allNames.filter((n) => !hiddenNames.has(n));
  const visibleKey = namesKey(visibleNames);
  const hasPendingChange = appliedKey !== null && visibleKey !== appliedKey;

  function handleRecalculate() {
    if (visibleNames.length === 0) {
      setState({ kind: "empty-selection" });
      setAppliedKey("__empty__");
      return;
    }

    const cached = cacheRef.current.get(visibleKey);
    if (cached) {
      setState({ kind: "ready", responseCount: visibleNames.length, options: cached });
      setAppliedKey(visibleKey);
      return;
    }

    const isFullSet = visibleNames.length === allNames.length;
    fetchRecommendation(isFullSet ? null : visibleNames);
  }

  function handleShowEveryone() {
    setHiddenNames(new Set());
    const fullKey = namesKey(allNames);
    const cached = cacheRef.current.get(fullKey);
    if (cached) {
      setState({ kind: "ready", responseCount: allNames.length, options: cached });
      setAppliedKey(fullKey);
    } else {
      fetchRecommendation(null);
    }
  }

  function handleEditClick() {
    if (storedName) {
      onEditRequested(storedName);
    } else {
      setPendingAction("edit");
    }
  }

  function handleDeleteClick() {
    if (storedName) {
      if (window.confirm("Remove this response? You can resubmit later.")) {
        onDeleteRequested(storedName);
      }
    } else {
      setPendingAction("delete");
    }
  }

  function handleManualNameContinue() {
    const trimmed = manualName.trim();
    if (!trimmed) return;

    if (pendingAction === "edit") {
      onEditRequested(trimmed);
    } else if (pendingAction === "delete") {
      if (window.confirm(`Remove the response for "${trimmed}"? You can resubmit later.`)) {
        onDeleteRequested(trimmed);
      }
    }
    setPendingAction(null);
    setManualName("");
  }

  const responseCount =
    state.kind === "waiting" || state.kind === "ready" ? state.responseCount : null;
  const isBusy = state.kind === "loading" || isRefreshing;

  return (
    <div className="w-full max-w-4xl flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-foreground">
            Trip recommendations
          </h1>
          {responseCount !== null && (
            <p className="mt-1 text-sm text-foreground/60">
              {responseCount} of the group have responded so far
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <button
            onClick={handleManualRefresh}
            disabled={isBusy}
            className="rounded-md border border-border bg-card px-3 py-2 text-sm font-medium transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
          >
            {isRefreshing ? "Refreshing..." : "Refresh recommendations"}
          </button>
          <div className="flex gap-3">
            <button
              onClick={handleEditClick}
              disabled={isEditLoading || isDeleteLoading}
              className="text-sm font-medium text-foreground/60 underline decoration-foreground/20 underline-offset-2 transition-colors hover:text-primary disabled:opacity-50"
            >
              {isEditLoading ? "Loading..." : "Edit my response"}
            </button>
            <button
              onClick={handleDeleteClick}
              disabled={isEditLoading || isDeleteLoading}
              className="text-sm font-medium text-red-600 underline decoration-red-200 underline-offset-2 transition-colors hover:text-red-800 disabled:opacity-50"
            >
              {isDeleteLoading ? "Removing..." : "Delete my response"}
            </button>
          </div>
        </div>
      </div>

      {pendingAction && (
        <div className="flex flex-col gap-2 rounded-md border border-border bg-card px-4 py-3">
          <label htmlFor="manual-name" className="text-sm font-medium">
            Enter your name to find your response
          </label>
          <div className="flex gap-2">
            <input
              id="manual-name"
              type="text"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              maxLength={50}
              className="flex-1 rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Your name as you submitted it"
            />
            <button
              onClick={handleManualNameContinue}
              disabled={isEditLoading || isDeleteLoading}
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              Continue
            </button>
            <button
              onClick={() => {
                setPendingAction(null);
                setManualName("");
              }}
              className="rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-primary-light"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {notFoundName ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-primary-light px-4 py-3 text-sm text-primary">
          <span>
            {storedName && storedName.trim().toLowerCase() === notFoundName.trim().toLowerCase()
              ? "You haven't submitted your preferences yet — fill out the form to get started."
              : `No response found for "${notFoundName}" — they haven't submitted their preferences yet.`}
          </span>
          <button
            onClick={onGoToForm}
            className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Go to submission form
          </button>
        </div>
      ) : (
        actionError && (
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {actionError}
          </div>
        )
      )}

      {respondents.length > 0 && (
        <div className="flex flex-col gap-3 rounded-md border border-border bg-card px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">
              {respondents.length} {respondents.length === 1 ? "person has" : "people have"}{" "}
              filled this out
            </p>
            {hiddenNames.size > 0 && (
              <button
                onClick={handleShowEveryone}
                disabled={isBusy}
                className="text-xs font-medium text-primary underline decoration-primary/30 underline-offset-2 hover:text-[#1a6b5c] disabled:opacity-50"
              >
                Reset — show everyone
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {respondents.map((r) => {
              const isHidden = hiddenNames.has(r.name);
              return (
                <label
                  key={r.name}
                  className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
                    isHidden
                      ? "border-border/60 bg-foreground/5 text-foreground/40"
                      : "border-primary/40 bg-primary-light text-primary"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={!isHidden}
                    onChange={() => toggleHidden(r.name)}
                    className="h-3.5 w-3.5"
                  />
                  {r.name}
                </label>
              );
            })}
          </div>

          <p className="text-xs text-foreground/50">
            These toggles are just for you — hiding someone here doesn&apos;t affect what anyone
            else sees. Toggle who to include, then recalculate to see a suggestion based only on
            the people still shown.
          </p>

          {hasPendingChange && (
            <button
              onClick={handleRecalculate}
              disabled={isBusy}
              className="w-fit rounded-md bg-accent px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              Recalculate for {visibleNames.length} shown{" "}
              {visibleNames.length === 1 ? "response" : "responses"}
            </button>
          )}
        </div>
      )}

      {showQr && pageUrl && (
        <div className="flex items-start gap-4 rounded-md border border-border bg-card px-4 py-3">
          <QRCodeSVG value={pageUrl} size={112} className="shrink-0" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="text-sm text-foreground/60">
              Ask your friends to scan this to add their own preferences.
            </div>
            <button
              onClick={handleCopyLink}
              className="w-fit rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:border-primary hover:text-primary"
            >
              {copied ? "Copied!" : "Copy link"}
            </button>
          </div>
          <button
            onClick={() => setShowQr(false)}
            aria-label="Dismiss QR code"
            className="shrink-0 text-foreground/30 transition-colors hover:text-foreground/60"
          >
            ✕
          </button>
        </div>
      )}

      {state.kind === "loading" && (
        <div className="rounded-md border border-border px-4 py-8 text-center text-sm text-foreground/60">
          Loading recommendations...
        </div>
      )}

      {state.kind === "waiting" && (
        <div className="rounded-md border border-border px-4 py-8 text-center text-sm text-foreground/60">
          Waiting on more responses before we can suggest anything.
        </div>
      )}

      {state.kind === "empty-selection" && (
        <div className="rounded-md border border-border px-4 py-8 text-center text-sm text-foreground/60">
          Everyone&apos;s hidden right now — toggle at least one person back on to see a
          suggestion.
        </div>
      )}

      {state.kind === "error" && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-4 text-sm text-red-700">
          {state.message}
        </div>
      )}

      {state.kind === "ready" && (
        <div className="flex flex-col gap-10">
          {state.options.map((option, i) => (
            <OptionCard key={i} option={option} />
          ))}
        </div>
      )}
    </div>
  );
}

function OptionCard({ option }: { option: RecommendationOption }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="group relative h-56 w-full overflow-hidden sm:h-72">
        <TripImage
          keywords={[option.destination, "travel"]}
          alt={option.destination}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-5 text-white">
          {option.tripLengthDays > 0 && (
            <span className="w-fit rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur-sm">
              {option.tripLengthDays}-day trip
            </span>
          )}
          <h2 className="font-serif text-2xl font-semibold sm:text-3xl">{option.destination}</h2>
          <p className="max-w-2xl text-sm text-white/85 sm:text-base">{option.pitch}</p>
        </div>
      </div>

      <div className="flex flex-col gap-8 p-5 sm:p-6">
        <ul className="flex flex-col gap-2">
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

        {option.itinerary?.length > 0 && (
          <section>
            <h3 className="font-serif text-lg font-semibold text-foreground">
              Day-by-day itinerary
            </h3>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {option.itinerary.map((day) => (
                <div
                  key={day.day}
                  className="rounded-lg border border-border p-4 transition-shadow hover:shadow-md"
                >
                  <div className="text-xs font-semibold uppercase tracking-wide text-primary">
                    Day {day.day}
                  </div>
                  <div className="mt-0.5 font-medium text-foreground">{day.title}</div>
                  <dl className="mt-3 flex flex-col gap-2 text-sm text-foreground/70">
                    <div>
                      <dt className="font-medium text-foreground/50">Morning</dt>
                      <dd>{day.morning}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-foreground/50">Afternoon</dt>
                      <dd>{day.afternoon}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-foreground/50">Evening</dt>
                      <dd>{day.evening}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          </section>
        )}

        {option.topPlaces?.length > 0 && (
          <section>
            <h3 className="font-serif text-lg font-semibold text-foreground">
              Top places to visit
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {option.topPlaces.map((place, k) => (
                <div
                  key={k}
                  className="group overflow-hidden rounded-lg border border-border transition-shadow hover:shadow-md"
                >
                  <div className="h-28 w-full overflow-hidden">
                    <TripImage
                      keywords={[option.destination, place.imageKeyword]}
                      alt={place.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-3">
                    <div className="text-sm font-medium text-foreground">{place.name}</div>
                    <p className="mt-1 text-xs text-foreground/60">{place.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {option.stayAreas?.length > 0 && (
          <section>
            <h3 className="font-serif text-lg font-semibold text-foreground">Where to stay</h3>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {option.stayAreas.map((area, k) => (
                <div
                  key={k}
                  className="group overflow-hidden rounded-lg border border-border transition-shadow hover:shadow-md"
                >
                  <div className="h-28 w-full overflow-hidden">
                    <TripImage
                      keywords={[option.destination, area.imageKeyword]}
                      alt={area.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-3">
                    <div className="text-sm font-medium text-foreground">{area.name}</div>
                    <p className="mt-1 text-xs text-foreground/60">{area.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
