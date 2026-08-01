import { afterEach, describe, expect, it, vi } from "vitest";
import {
  currentOperationalDate,
  fetchUnmatchedDetections,
  nextOperationalDate,
  previousOperationalDate,
  setDetectionDirection,
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

describe("setDetectionDirection", () => {
  it("PATCHes the detection with action set_direction and the chosen direction", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ detection_id: 42, direction: "APPROACHING" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await setDetectionDirection(42, "APPROACHING");

    expect(result).toEqual({ detection_id: 42, direction: "APPROACHING" });
    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/detections/42");
    expect(options.method).toBe("PATCH");
    expect(JSON.parse(options.body)).toEqual({
      action: "set_direction",
      direction: "APPROACHING",
    });
  });

  it("surfaces the backend error when the detection is already resolved", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ detail: "La detección ya tiene una dirección resuelta" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(setDetectionDirection(42, "DEPARTING")).rejects.toThrow(
      "La detección ya tiene una dirección resuelta"
    );
  });
});
