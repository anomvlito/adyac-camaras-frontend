import { describe, expect, it } from "vitest";
import { filterHistoryByAction, mergeFeedEntries, sightingToEntry } from "./feed";
import type { HistoryEntry, Sighting } from "./types";

const historyEntry: HistoryEntry = {
  session_id: 10,
  timestamp: "2026-07-21 10:00:00",
  plate: "TEST10",
  action: "ENTRY",
  status: "REAL",
  review_status: "",
  fee: 0,
  confidence: 0.98,
  image_url: "/history.jpg",
};

const sighting: Sighting = {
  timestamp: "2026-07-21 10:05:00",
  plate: "TEST20",
  confidence: 0.75,
  image_url: "/sighting.jpg",
  image_path: "synthetic/sighting.jpg",
};

describe("feed characterization", () => {
  it("maps a sighting to a detection without inventing a session", () => {
    expect(sightingToEntry(sighting)).toEqual({
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
    });
  });

  it("combines sessions and sightings in descending timestamp order", () => {
    expect(mergeFeedEntries([historyEntry], [sighting]).map(entry => entry.plate))
      .toEqual(["TEST20", "TEST10"]);
  });

  it("preserves ALL and filters entry/exit actions", () => {
    const exit = { ...historyEntry, session_id: 11, plate: "TEST11", action: "EXIT" };
    expect(filterHistoryByAction([historyEntry, exit], "ALL")).toHaveLength(2);
    expect(filterHistoryByAction([historyEntry, exit], "ENTRY")).toEqual([historyEntry]);
    expect(filterHistoryByAction([historyEntry, exit], "EXIT")).toEqual([exit]);
  });
});
