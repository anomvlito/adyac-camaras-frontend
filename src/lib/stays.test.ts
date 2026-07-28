import { afterEach, describe, expect, it, vi } from "vitest";
import {
  currentOperationalDate,
  fetchUnmatchedDetections,
  nextOperationalDate,
  previousOperationalDate,
} from "./stays";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("operational dates", () => {
  it("uses the calendar date in America/Santiago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-29T02:30:00Z"));

    expect(currentOperationalDate()).toBe("2026-07-28");
  });

  it("gets the previous calendar day across month boundaries", () => {
    expect(previousOperationalDate("2026-08-01")).toBe("2026-07-31");
  });

  it("gets the next calendar day across month boundaries", () => {
    expect(nextOperationalDate("2026-07-31")).toBe("2026-08-01");
  });

  it("loads only the selected and explicitly requested previous day", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchUnmatchedDetections("2026-08-01", true);

    const urls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(urls).toHaveLength(2);
    expect(urls.some((url) => url.includes("date=2026-08-01"))).toBe(true);
    expect(urls.some((url) => url.includes("date=2026-07-31"))).toBe(true);
  });
});
