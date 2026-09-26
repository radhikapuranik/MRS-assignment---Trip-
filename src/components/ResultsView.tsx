"use client";

import { useCallback, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import TripImage from "./TripImage";
import type { RecommendResponse, RecommendationOption, Verdict } from "@/lib/types";

type LoadState =
  | { kind: "loading" }
  | { kind: "waiting"; responseCount: number }
  | { kind: "ready"; responseCount: number; options: RecommendationOption[] }
  | { kind: "error"; message: string };

const VERDICT_STYLES: Record<Verdict, string> = {
  "good fit": "bg-primary-light text-primary",
  "partial fit": "bg-accent/15 text-accent",
  "poor fit": "bg-red-100 text-red-700",
};

interface Props {
  storedName: string | null;
  onEditRequested: (name: string) => void;
  onDeleteRequested: (name: string) => void;
  isEditLoading?: boolean;
  isDeleteLoading?: boolean;
  actionError?: string | null;
}

export default function ResultsView({
  storedName,
  onEditRequested,
  onDeleteRequested,
  isEditLoading,
  isDeleteLoading,
  actionError,
}: Props) {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showQr, setShowQr] = useState(true);
  const [pageUrl, setPageUrl] = useState("");
  const [pendingAction, setPendingAction] = useState<"edit" | "delete" | null>(null);
  const [manualName, setManualName] = useState("");

  useEffect(() => {
    const canonicalUrl = process.env.NEXT_PUBLIC_SITE_URL;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- window.location is only available client-side
    setPageUrl(canonicalUrl || window.location.href);
  }, []);

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
            onClick={() => load(true)}
            disabled={isRefreshing || state.kind === "loading"}
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

      {actionError && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {showQr && pageUrl && (
        <div className="flex items-center gap-4 rounded-md border border-border bg-card px-4 py-3">
          <QRCodeSVG value={pageUrl} size={112} className="shrink-0" />
          <div className="flex-1 text-sm text-foreground/60">
            Ask your friends to scan this to add their own preferences.
          </div>
          <button
            onClick={() => setShowQr(false)}
            aria-label="Dismiss QR code"
            className="shrink-0 self-start text-foreground/30 transition-colors hover:text-foreground/60"
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
