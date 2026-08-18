import type { HistoryEntry, Sighting } from "./types";

export function sightingToEntry(sighting: Sighting): HistoryEntry {
  return {
    session_id: null,
    timestamp: sighting.timestamp,
    plate: sighting.plate,
    action: "DETECTION",
    status: "",
    review_status: "",
    fee: 0,
    confidence: sighting.confidence,
    image_url: sighting.image_url,
    image_path: sighting.image_path,
  };
}

export function mergeFeedEntries(history: HistoryEntry[], sightings: Sighting[]): HistoryEntry[] {
  return [...history, ...sightings.map(sightingToEntry)]
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp));
}

export function filterHistoryByAction(
  entries: HistoryEntry[],
  filter: "ALL" | "ENTRY" | "EXIT",
): HistoryEntry[] {
  return filter === "ALL" ? entries : entries.filter(entry => entry.action === filter);
}

function normalizePlateQuery(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function filterHistoryByPlate(
  entries: HistoryEntry[],
  query: string,
): HistoryEntry[] {
  const normalized = normalizePlateQuery(query);
  if (!normalized) return entries;
  return entries.filter(entry =>
    normalizePlateQuery(entry.plate).includes(normalized)
  );
}
