"use client";

import { useEffect, useState } from "react";
import SubmissionForm from "@/components/SubmissionForm";
import ResultsView from "@/components/ResultsView";

const HAS_SUBMITTED_KEY = "hasSubmitted";

export default function Home() {
  const [view, setView] = useState<"loading" | "form" | "results">("loading");

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

  return (
    <main className="flex-1 flex items-start justify-center px-4 py-12 sm:py-20">
      {view === "loading" && null}
      {view === "form" && <SubmissionForm onSubmitted={() => setView("results")} />}
      {view === "results" && <ResultsView />}
    </main>
  );
}
