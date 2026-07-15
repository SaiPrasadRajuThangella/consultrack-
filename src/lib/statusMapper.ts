export function getDisplayStatus(raw: string): string {
  return raw ?? "PENDING";
}

/** Maps UI / stored status labels to the API enum (identity for current API values). */
export function getApiStatus(raw: string): string {
  return raw ?? "PENDING";
}
