"use client";

import { useState, FormEvent } from "react";
import { DESTINATION_TYPES } from "@/lib/types";
import { validateSubmitPayload, hasErrors, FieldErrors, SubmitPayload } from "@/lib/validation";

const HAS_SUBMITTED_KEY = "hasSubmitted";
const SUBMITTER_NAME_KEY = "submitterName";

const MIN_BUDGET = 5_000;
const MAX_BUDGET = 300_000;
const BUDGET_STEP = 1_000;

const DESTINATION_TYPE_META: Record<string, { label: string; emoji: string }> = {
  beach: { label: "Beach", emoji: "🏖️" },
  mountains: { label: "Mountains", emoji: "⛰️" },
  city: { label: "City", emoji: "🏙️" },
  "nature/wildlife": { label: "Nature/Wildlife", emoji: "🌿" },
  "spiritual/heritage": { label: "Spiritual/Heritage", emoji: "🛕" },
};

const TRIP_PACE_OPTIONS = ["Relaxed", "Balanced", "Packed"] as const;
const TRAVELING_WITH_OPTIONS = ["Solo", "Couple", "Friends", "Family"] as const;

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

  // --- New fields below are UI-only for now (not yet sent to the backend). ---
  const [numTravelers, setNumTravelers] = useState(1);
  const [tripPace, setTripPace] = useState<(typeof TRIP_PACE_OPTIONS)[number] | null>(null);
  const [travelingWith, setTravelingWith] = useState<
    (typeof TRAVELING_WITH_OPTIONS)[number] | null
  >(null);
  const [preferredTripLength, setPreferredTripLength] = useState<number | null>(null);

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

  const budgetNumber = Number(budget) || 0;
  const sliderValue = Math.min(Math.max(budgetNumber, MIN_BUDGET), MAX_BUDGET);

  return (
    <div className="relative w-full max-w-lg">
      <div
        aria-hidden
        className="fixed inset-0 -z-10 bg-gradient-to-br from-primary via-[#173f38] to-[#0d211c]"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.12),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(201,138,75,0.25),transparent_45%)]" />
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex w-full flex-col gap-6 rounded-2xl border border-white/25 bg-white/80 p-6 shadow-2xl backdrop-blur-md sm:p-8"
      >
        <div>
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-light text-2xl"
            >
              🧭
            </span>
            <h1 className="font-serif text-4xl font-semibold leading-tight text-foreground">
              {isEditMode ? "Update your answers" : "Where should we go?"}
            </h1>
          </div>

          {name.trim() && (
            <span className="mt-3 inline-flex w-fit items-center rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent">
              {name.trim()}&apos;s trip preferences
            </span>
          )}

          <p className="mt-3 text-sm text-foreground/60">
            {isEditMode
              ? "Change anything below and resubmit — this replaces your previous response."
              : "Fill this out once. Once two or more of you have responded, we'll turn your answers into real destination options."}
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-sm font-medium text-foreground">
            Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
            disabled={isEditMode}
            className="rounded-xl border border-border/60 bg-white/70 px-4 py-2.5 text-sm shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:bg-foreground/5 disabled:text-foreground/50"
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

        <div className="flex flex-col gap-2">
          <label htmlFor="budget" className="text-sm font-medium text-foreground">
            Budget per person
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-foreground/50">
              ₹
            </span>
            <input
              id="budget"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="w-full rounded-xl border border-border/60 bg-white/70 py-2.5 pl-7 pr-4 text-sm shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              aria-invalid={!!fieldErrors.budget}
              aria-describedby={fieldErrors.budget ? "budget-error" : undefined}
            />
          </div>
          <input
            type="range"
            min={MIN_BUDGET}
            max={MAX_BUDGET}
            step={BUDGET_STEP}
            value={sliderValue}
            onChange={(e) => setBudget(e.target.value)}
            style={{ accentColor: "var(--color-primary)" }}
            className="w-full cursor-pointer"
            aria-label="Budget per person slider"
          />
          <div className="flex justify-between text-xs text-foreground/40">
            <span>₹{MIN_BUDGET.toLocaleString("en-IN")}</span>
            <span>₹{MAX_BUDGET.toLocaleString("en-IN")}+</span>
          </div>
          {fieldErrors.budget && (
            <p id="budget-error" className="text-sm text-red-600">
              {fieldErrors.budget}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="date-start" className="text-sm font-medium text-foreground">
              Earliest start date
            </label>
            <input
              id="date-start"
              type="date"
              value={dateStart}
              onChange={(e) => setDateStart(e.target.value)}
              className="rounded-xl border border-border/60 bg-white/70 px-4 py-2.5 text-sm shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
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
            <label htmlFor="date-end" className="text-sm font-medium text-foreground">
              Latest end date
            </label>
            <input
              id="date-end"
              type="date"
              value={dateEnd}
              onChange={(e) => setDateEnd(e.target.value)}
              className="rounded-xl border border-border/60 bg-white/70 px-4 py-2.5 text-sm shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
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
          <legend className="mb-1 text-sm font-medium text-foreground">Destination type</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {DESTINATION_TYPES.map((type) => {
              const meta = DESTINATION_TYPE_META[type];
              const selected = destinationTypes.includes(type);
              return (
                <button
                  key={type}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleDestinationType(type)}
                  className={`flex flex-col items-center gap-1 rounded-xl border px-3 py-3 text-xs font-medium transition ${
                    selected
                      ? "border-primary bg-primary text-white shadow-sm"
                      : "border-border/60 bg-white/70 text-foreground/70 hover:border-primary/50 hover:bg-primary-light"
                  }`}
                >
                  <span className="text-lg" aria-hidden>
                    {meta.emoji}
                  </span>
                  {meta.label}
                </button>
              );
            })}
          </div>
          {fieldErrors.destinationTypes && (
            <p className="text-sm text-red-600">{fieldErrors.destinationTypes}</p>
          )}
        </fieldset>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Stepper
            label="Number of travelers"
            value={numTravelers}
            min={1}
            max={20}
            onChange={(v) => setNumTravelers(v ?? 1)}
          />
          <Stepper
            label="Preferred trip length (days)"
            optional
            value={preferredTripLength}
            min={1}
            max={30}
            onChange={setPreferredTripLength}
          />
        </div>

        <ChipGroup
          label="Trip pace"
          options={TRIP_PACE_OPTIONS}
          value={tripPace}
          onChange={setTripPace}
        />

        <ChipGroup
          label="Who's traveling"
          options={TRAVELING_WITH_OPTIONS}
          value={travelingWith}
          onChange={setTravelingWith}
        />

        <div className="flex flex-col gap-1">
          <label htmlFor="dealbreakers" className="text-sm font-medium text-foreground">
            Dealbreakers / what you won&apos;t do{" "}
            <span className="font-normal text-foreground/40">(optional)</span>
          </label>
          <textarea
            id="dealbreakers"
            value={dealbreakers}
            onChange={(e) => setDealbreakers(e.target.value)}
            maxLength={300}
            rows={3}
            className="rounded-xl border border-border/60 bg-white/70 px-4 py-2.5 text-sm shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            aria-invalid={!!fieldErrors.dealbreakers}
            aria-describedby={fieldErrors.dealbreakers ? "dealbreakers-error" : undefined}
          />
          <div className="flex justify-between text-xs text-foreground/40">
            <span>
              {fieldErrors.dealbreakers && (
                <span className="text-sm text-red-600">{fieldErrors.dealbreakers}</span>
              )}
            </span>
            <span>{dealbreakers.length}/300</span>
          </div>
        </div>

        {submitError && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {submitError}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-white shadow-md transition-all hover:scale-[1.02] hover:bg-[#1a6b5c] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
        >
          {isSubmitting
            ? "Saving..."
            : isEditMode
              ? "Save changes"
              : "Submit my preferences"}
          {!isSubmitting && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
              aria-hidden
            >
              <path
                fillRule="evenodd"
                d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>
      </form>
    </div>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
  optional,
}: {
  label: string;
  value: number | null;
  min: number;
  max: number;
  onChange: (value: number | null) => void;
  optional?: boolean;
}) {
  const displayValue = value ?? min;

  function step(delta: number) {
    const next = Math.min(max, Math.max(min, displayValue + delta));
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-foreground">
        {label}{" "}
        {optional && <span className="font-normal text-foreground/40">(optional)</span>}
      </label>
      <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-white/70 px-2 py-1.5 shadow-sm">
        <button
          type="button"
          onClick={() => step(-1)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg font-medium text-foreground/60 transition hover:bg-primary-light hover:text-primary"
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <span className="flex-1 text-center text-sm font-medium text-foreground">
          {value === null ? "—" : displayValue}
        </span>
        <button
          type="button"
          onClick={() => step(1)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg font-medium text-foreground/60 transition hover:bg-primary-light hover:text-primary"
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-foreground">
        {label} <span className="font-normal text-foreground/40">(optional)</span>
      </span>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = value === option;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                selected
                  ? "border-primary bg-primary text-white shadow-sm"
                  : "border-border/60 bg-white/70 text-foreground/70 hover:border-primary/50 hover:bg-primary-light"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
