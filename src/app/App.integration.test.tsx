// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./page";
import LoginPage from "@/features/auth/LoginPage";
import { AUTH_STORAGE_KEY } from "@/lib/auth";

function jsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  } as Response;
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe("application flow characterization", () => {
  it("loads the authenticated dashboard and preserves the three views", async () => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
      token: "synthetic-token",
      username: "tester",
      role: "administrador",
    }));
    const fetchMock = vi.fn((input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("/api/stats")) {
        return Promise.resolve(jsonResponse({
          today_income: 1200,
          today_entries: 2,
          today_exits: 1,
          parked_now: 1,
        }));
      }
      if (url.includes("/api/sightings")) return Promise.resolve(jsonResponse({ sightings: [] }));
      if (url.includes("/api/history")) return Promise.resolve(jsonResponse([]));
      if (url.includes("/api/cars")) return Promise.resolve(jsonResponse({}));
      return Promise.resolve(jsonResponse({}));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(await screen.findByText("Feed en vivo")).toBeTruthy();
    // HU-003: el Dashboard ya no renderiza las tarjetas de estadísticas,
    // pero App sigue llamando a /api/stats (ver aserción de fetchMock abajo).
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));

    await userEvent.click(screen.getByRole("button", { name: "Historial" }));
    expect(await screen.findByRole("button", { name: "Todos" })).toBeTruthy();
    await waitFor(() => {
      const urls = fetchMock.mock.calls.map(([url]) => String(url));
      expect(urls.some(url => url.includes("/api/history?limit=2000"))).toBe(true);
      expect(urls.some(url => url.includes("/api/sightings?limit=500&date="))).toBe(true);
    });

    await userEvent.click(screen.getByRole("button", { name: "Excel" }));
    expect(await screen.findByText("Arrastrá el Excel aquí o hacé click")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Comparar" })).toBeTruthy();
  });

  it("keeps the invalid-login error behavior", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ detail: "invalid" }, 401)));
    render(<LoginPage onLogin={() => {}} />);

    await userEvent.type(screen.getByLabelText("Usuario"), "synthetic-user");
    await userEvent.type(screen.getByLabelText("Contraseña"), "synthetic-password");
    await userEvent.click(screen.getByRole("button", { name: "Ingresar" }));

    expect(await screen.findByText("Usuario o contraseña incorrectos")).toBeTruthy();
  });
});
