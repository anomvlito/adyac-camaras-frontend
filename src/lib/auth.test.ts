// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  API,
  AUTH_EXPIRED_EVENT,
  AUTH_STORAGE_KEY,
  apiFetch,
  getAuth,
  setAuth,
} from "./auth";

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe("authentication characterization", () => {
  it("uses the configured API fallback", () => {
    expect(API).toBe("https://2.24.69.49.nip.io");
  });

  it("persists and clears the JWT session under cp_auth", () => {
    const auth = { token: "synthetic-token", username: "tester", role: "operador" };
    setAuth(auth);
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBe(JSON.stringify(auth));
    expect(getAuth()).toEqual(auth);
    setAuth(null);
    expect(getAuth()).toBeNull();
  });

  it("adds the bearer token and expires the local session on 401", async () => {
    setAuth({ token: "synthetic-token", username: "tester", role: "operador" });
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);
    const expired = vi.fn();
    window.addEventListener(AUTH_EXPIRED_EVENT, expired);

    await apiFetch("https://example.test/protected", { headers: { "X-Test": "yes" } });

    expect(fetchMock).toHaveBeenCalledWith("https://example.test/protected", {
      headers: { "X-Test": "yes", Authorization: "Bearer synthetic-token" },
    });
    expect(getAuth()).toBeNull();
    expect(expired).toHaveBeenCalledOnce();
  });
});
