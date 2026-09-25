"use client";

import { useState, FormEvent } from "react";
import { DESTINATION_TYPES } from "@/lib/types";
import { validateSubmitPayload, hasErrors, FieldErrors, SubmitPayload } from "@/lib/validation";

const HAS_SUBMITTED_KEY = "hasSubmitted";

interface Props {
  onSubmitted: () => void;
}

export default function SubmissionForm({ onSubmitted }: Props) {
  const [name, setName] = useState("");
  const [budget, setBudget] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [destinationTypes, setDestinationTypes] = useState<string[]>([]);
  const [dealbreakers, setDealbreakers] = useState("");

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
    <form onSubmit={handleSubmit} noValidate className="w-full max-w-lg flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Where should we go?</h1>
        <p className="mt-1 text-sm text-gray-500">
          Fill this out once. Once two or more of you have responded, we&apos;ll turn your
          answers into real destination options.
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
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          aria-invalid={!!fieldErrors.name}
          aria-describedby={fieldErrors.name ? "name-error" : undefined}
        />
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
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
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
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
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
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
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
          <span className="font-normal text-gray-400">(optional)</span>
        </label>
        <textarea
          id="dealbreakers"
          value={dealbreakers}
          onChange={(e) => setDealbreakers(e.target.value)}
          maxLength={300}
          rows={3}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          aria-invalid={!!fieldErrors.dealbreakers}
          aria-describedby={fieldErrors.dealbreakers ? "dealbreakers-error" : undefined}
        />
        <div className="flex justify-between text-xs text-gray-400">
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
        className="rounded-md bg-black text-white px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "Submitting..." : "Submit my preferences"}
      </button>
    </form>
  );
}
