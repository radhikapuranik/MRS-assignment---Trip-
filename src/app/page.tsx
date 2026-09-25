"use client";

import { useEffect, useState } from "react";
import SubmissionForm, { PrefillValues } from "@/components/SubmissionForm";
import ResultsView from "@/components/ResultsView";

const HAS_SUBMITTED_KEY = "hasSubmitted";
const SUBMITTER_NAME_KEY = "submitterName";

export default function Home() {
  const [view, setView] = useState<"loading" | "form" | "results">("loading");
  const [prefillValues, setPrefillValues] = useState<PrefillValues | undefined>(undefined);
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    let hasSubmitted = false;
    try {
      hasSubmitted = localStorage.getItem(HAS_SUBMITTED_KEY) === "true";
    } catch {
      hasSubmitted = false;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable client-side after mount
    setView(hasSubmitted ? "results" : "form");
  }, []);

  async function handleEditRequested() {
    setEditError(null);

    let name: string | null = null;
    try {
      name = localStorage.getItem(SUBMITTER_NAME_KEY);
    } catch {
      name = null;
    }

    if (!name) {
      setEditError("We couldn't find which response was yours. Try submitting again instead.");
      return;
    }

    setIsEditLoading(true);
    try {
      const res = await fetch(`/api/preference?name=${encodeURIComponent(name)}`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.preference) {
        setEditError(
          data?.error || "Could not load your previous response. Please try again."
        );
        return;
      }

      const p = data.preference;
      setPrefillValues({
        name: p.name,
        budget: p.budget,
        dateStart: p.date_start,
        dateEnd: p.date_end,
        destinationTypes: p.destination_types ?? [],
        dealbreakers: p.dealbreakers ?? "",
      });
      setView("form");
    } catch {
      setEditError("Could not reach the server. Check your connection and try again.");
    } finally {
      setIsEditLoading(false);
    }
  }

  function handleSubmitted() {
    setPrefillValues(undefined);
    setView("results");
  }

  return (
    <main className="flex-1 flex items-start justify-center px-4 py-12 sm:py-20">
      {view === "loading" && null}
      {view === "form" && (
        <SubmissionForm onSubmitted={handleSubmitted} initialValues={prefillValues} />
      )}
      {view === "results" && (
        <ResultsView
          onEditRequested={handleEditRequested}
          isEditLoading={isEditLoading}
          editError={editError}
        />
      )}
    </main>
  );
}
