"use client";

import { useState, FormEvent } from "react";
import { DESTINATION_TYPES } from "@/lib/types";
import { validateSubmitPayload, hasErrors, FieldErrors, SubmitPayload } from "@/lib/validation";

const HAS_SUBMITTED_KEY = "hasSubmitted";
const SUBMITTER_NAME_KEY = "submitterName";

export interface PrefillValues {
  name: string;
  budget: number;
  dateStart: string;
  dateEnd: string;
  destinationTypes: string[];
  dealbreakers: string;
}

interface Props {
  onSubmitted: () => void;
  initialValues?: PrefillValues;
}

export default function SubmissionForm({ onSubmitted, initialValues }: Props) {
  const isEditMode = !!initialValues;
  const [name, setName] = useState(initialValues?.name ?? "");
  const [budget, setBudget] = useState(
    initialValues ? String(initialValues.budget) : ""
  );
  const [dateStart, setDateStart] = useState(initialValues?.dateStart ?? "");
  const [dateEnd, setDateEnd] = useState(initialValues?.dateEnd ?? "");
  const [destinationTypes, setDestinationTypes] = useState<string[]>(
    initialValues?.destinationTypes ?? []
  );
  const [dealbreakers, setDealbreakers] = useState(initialValues?.dealbreakers ?? "");

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function toggleDestinationType(type: string) {
    setDestinationTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    const parsedBudget = Number(budget);
    const payload: Partial<SubmitPayload> = {
      name,
      budget: budget.trim() === "" || Number.isNaN(parsedBudget) ? NaN : parsedBudget,
      dateStart,
      dateEnd,
      destinationTypes,
      dealbreakers,
    };

    const errors = validateSubmitPayload(payload);
    setFieldErrors(errors);
    if (hasErrors(errors)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setSubmitError(
          data?.error || "Something went wrong submitting your response. Please try again."
        );
        if (data?.fieldErrors) {
          setFieldErrors(data.fieldErrors);
        }
        setIsSubmitting(false);
        return;
      }

      try {
        localStorage.setItem(HAS_SUBMITTED_KEY, "true");
        localStorage.setItem(SUBMITTER_NAME_KEY, name.trim());
      } catch {
        // localStorage unavailable; not fatal, results will just not persist across reloads
      }

      onSubmitted();
    } catch {
      setSubmitError("Could not reach the server. Check your connection and try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full max-w-lg flex flex-col gap-6 rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-foreground">
          {isEditMode ? "Update your answers" : "Where should we go?"}
        </h1>
        <p className="mt-1 text-sm text-foreground/60">
          {isEditMode
            ? "Change anything below and resubmit — this replaces your previous response."
            : "Fill this out once. Once two or more of you have responded, we'll turn your answers into real destination options."}
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium">
          Name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          disabled={isEditMode}
          className="rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100 disabled:text-foreground/60"
          aria-invalid={!!fieldErrors.name}
          aria-describedby={fieldErrors.name ? "name-error" : undefined}
        />
        {isEditMode && (
          <p className="text-xs text-foreground/40">
            Name can&apos;t be changed here — it&apos;s how we match this back to your response.
          </p>
        )}
        {fieldErrors.name && (
          <p id="name-error" className="text-sm text-red-600">
            {fieldErrors.name}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="budget" className="text-sm font-medium">
          Budget per person (₹)
        </label>
        <input
          id="budget"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          className="rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          aria-invalid={!!fieldErrors.budget}
          aria-describedby={fieldErrors.budget ? "budget-error" : undefined}
        />
        {fieldErrors.budget && (
          <p id="budget-error" className="text-sm text-red-600">
            {fieldErrors.budget}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="date-start" className="text-sm font-medium">
            Earliest start date
          </label>
          <input
            id="date-start"
            type="date"
            value={dateStart}
            onChange={(e) => setDateStart(e.target.value)}
            className="rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            aria-invalid={!!fieldErrors.dateStart}
            aria-describedby={fieldErrors.dateStart ? "date-start-error" : undefined}
          />
          {fieldErrors.dateStart && (
            <p id="date-start-error" className="text-sm text-red-600">
              {fieldErrors.dateStart}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="date-end" className="text-sm font-medium">
            Latest end date
          </label>
          <input
            id="date-end"
            type="date"
            value={dateEnd}
            onChange={(e) => setDateEnd(e.target.value)}
            className="rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            aria-invalid={!!fieldErrors.dateEnd}
            aria-describedby={fieldErrors.dateEnd ? "date-end-error" : undefined}
          />
          {fieldErrors.dateEnd && (
            <p id="date-end-error" className="text-sm text-red-600">
              {fieldErrors.dateEnd}
            </p>
          )}
        </div>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium mb-1">Destination type</legend>
        <div className="grid grid-cols-2 gap-2">
          {DESTINATION_TYPES.map((type) => (
            <label key={type} className="flex items-center gap-2 text-sm capitalize">
              <input
                type="checkbox"
                checked={destinationTypes.includes(type)}
                onChange={() => toggleDestinationType(type)}
                className="h-4 w-4"
              />
              {type}
            </label>
          ))}
        </div>
        {fieldErrors.destinationTypes && (
          <p className="text-sm text-red-600">{fieldErrors.destinationTypes}</p>
        )}
      </fieldset>

      <div className="flex flex-col gap-1">
        <label htmlFor="dealbreakers" className="text-sm font-medium">
          Dealbreakers / what you won&apos;t do{" "}
          <span className="font-normal text-foreground/40">(optional)</span>
        </label>
        <textarea
          id="dealbreakers"
          value={dealbreakers}
          onChange={(e) => setDealbreakers(e.target.value)}
          maxLength={300}
          rows={3}
          className="rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          aria-invalid={!!fieldErrors.dealbreakers}
          aria-describedby={fieldErrors.dealbreakers ? "dealbreakers-error" : undefined}
        />
        <div className="flex justify-between text-xs text-foreground/40">
          <span>{fieldErrors.dealbreakers && <span className="text-red-600 text-sm">{fieldErrors.dealbreakers}</span>}</span>
          <span>{dealbreakers.length}/300</span>
        </div>
      </div>

      {submitError && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {submitError}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-md bg-primary text-white px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting
          ? "Saving..."
          : isEditMode
            ? "Save changes"
            : "Submit my preferences"}
      </button>
    </form>
  );
}
