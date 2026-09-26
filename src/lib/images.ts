function slugifyTerm(term: string): string {
  return term
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "");
}

export function loremFlickrUrl(...keywords: (string | undefined)[]): string {
  const terms = keywords
    .filter((k): k is string => !!k && k.trim().length > 0)
    .map(slugifyTerm)
    .filter((t) => t.length > 0);

  const path = terms.length > 0 ? terms.join(",") : "travel";
  return `https://loremflickr.com/640/400/${path}`;
}

export function picsumFallbackUrl(seed: string): string {
  const safeSeed = slugifyTerm(seed) || "trip";
  return `https://picsum.photos/seed/${encodeURIComponent(safeSeed)}/640/400`;
}
