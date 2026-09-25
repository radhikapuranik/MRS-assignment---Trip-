import { DESTINATION_TYPES } from "./types";

export interface SubmitPayload {
  name: string;
  budget: number;
  dateStart: string;
  dateEnd: string;
  destinationTypes: string[];
  dealbreakers: string;
}

export interface FieldErrors {
  name?: string;
  budget?: string;
  dateStart?: string;
  dateEnd?: string;
  destinationTypes?: string;
  dealbreakers?: string;
}

export function validateSubmitPayload(payload: Partial<SubmitPayload>): FieldErrors {
  const errors: FieldErrors = {};

  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  if (!name) {
    errors.name = "Name is required.";
  } else if (name.length > 50) {
    errors.name = "Name must be 50 characters or fewer.";
  }

  const budget = payload.budget;
  if (
    budget === undefined ||
    budget === null ||
    typeof budget !== "number" ||
    !Number.isFinite(budget) ||
    !Number.isInteger(budget) ||
    budget <= 0
  ) {
    errors.budget = "Budget must be a positive whole number.";
  }

  const dateStart = payload.dateStart;
  const dateEnd = payload.dateEnd;

  if (!dateStart || Number.isNaN(Date.parse(dateStart))) {
    errors.dateStart = "Earliest start date is required.";
  }

  if (!dateEnd || Number.isNaN(Date.parse(dateEnd))) {
    errors.dateEnd = "Latest end date is required.";
  }

  if (
    !errors.dateStart &&
    !errors.dateEnd &&
    dateStart &&
    dateEnd &&
    new Date(dateEnd) < new Date(dateStart)
  ) {
    errors.dateEnd = "End date must be on or after the start date.";
  }

  const destinationTypes = Array.isArray(payload.destinationTypes)
    ? payload.destinationTypes
    : [];
  const validTypes = destinationTypes.filter((t) =>
    (DESTINATION_TYPES as readonly string[]).includes(t)
  );
  if (validTypes.length === 0) {
    errors.destinationTypes = "Select at least one destination type.";
  }

  const dealbreakers = payload.dealbreakers ?? "";
  if (typeof dealbreakers === "string" && dealbreakers.length > 300) {
    errors.dealbreakers = "Dealbreakers must be 300 characters or fewer.";
  }

  return errors;
}

export function hasErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0;
}
