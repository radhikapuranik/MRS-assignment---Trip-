"use client";

import { useEffect, useState } from "react";
import SubmissionForm, { PrefillValues } from "@/components/SubmissionForm";
import ResultsView from "@/components/ResultsView";

const HAS_SUBMITTED_KEY = "hasSubmitted";
const SUBMITTER_NAME_KEY = "submitterName";

export default function Home() {
  const [view, setView] = useState<"loading" | "form" | "results">("loading");
  const [prefillValues, setPrefillValues] = useState<PrefillValues | undefined>(undefined);
  const [storedName, setStoredName] = useState<string | null>(null);
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let hasSubmitted = false;
    let name: string | null = null;
    try {
      hasSubmitted = localStorage.getItem(HAS_SUBMITTED_KEY) === "true";
      name = localStorage.getItem(SUBMITTER_NAME_KEY);
    } catch {
      hasSubmitted = false;
      name = null;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable client-side after mount
    setView(hasSubmitted ? "results" : "form");
    setStoredName(name);
  }, []);

  async function handleEditRequested(name: string) {
    setActionError(null);
    setIsEditLoading(true);
    try {
      const res = await fetch(`/api/preference?name=${encodeURIComponent(name)}`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.preference) {
        setActionError(
          data?.error || "Could not load that response. Please check the name and try again."
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
      setActionError("Could not reach the server. Check your connection and try again.");
    } finally {
      setIsEditLoading(false);
    }
  }

  async function handleDeleteRequested(name: string) {
    setActionError(null);
    setIsDeleteLoading(true);
    try {
      const res = await fetch(`/api/preference?name=${encodeURIComponent(name)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setActionError(
          data?.error || "Could not delete that response. Please check the name and try again."
        );
        return;
      }

      const isSelf =
        !!storedName && storedName.trim().toLowerCase() === name.trim().toLowerCase();

      if (isSelf) {
        try {
          localStorage.removeItem(HAS_SUBMITTED_KEY);
          localStorage.removeItem(SUBMITTER_NAME_KEY);
        } catch {
          // localStorage unavailable; not fatal
        }
        setStoredName(null);
        setPrefillValues(undefined);
        setView("form");
      } else {
        setRefreshToken((t) => t + 1);
      }
    } catch {
      setActionError("Could not reach the server. Check your connection and try again.");
    } finally {
      setIsDeleteLoading(false);
    }
  }

  function handleSubmitted() {
    setPrefillValues(undefined);
    let name: string | null = null;
    try {
      name = localStorage.getItem(SUBMITTER_NAME_KEY);
    } catch {
      name = null;
    }
    setStoredName(name);
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
          storedName={storedName}
          onEditRequested={handleEditRequested}
          onDeleteRequested={handleDeleteRequested}
          isEditLoading={isEditLoading}
          isDeleteLoading={isDeleteLoading}
          actionError={actionError}
          key={`results-${refreshToken}`}
        />
      )}
    </main>
  );
}
