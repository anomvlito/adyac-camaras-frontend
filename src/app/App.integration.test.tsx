// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./page";
import LoginPage from "@/features/auth/LoginPage";
import { AUTH_STORAGE_KEY } from "@/lib/auth";
import { currentOperationalDate } from "@/lib/stays";

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
  it("loads completed stays and preserves the three views", async () => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
      token: "synthetic-token",
      username: "tester",
      role: "administrador",
    }));
    const fetchMock = vi.fn((input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("/api/stays")) return Promise.resolve(jsonResponse([{
        stay_id: 1,
        resolved_plate: "TEST12",
        entry_detection_id: 10,
        exit_detection_id: 11,
        entry_time: "2026-07-24T10:00:00-04:00",
        exit_time: "2026-07-24T11:27:00-04:00",
        duration_minutes: 87,
        match_type: "MANUAL",
        match_confidence: 0.8,
        status: "COMPLETED",
        entry_image_url: null,
        exit_image_url: null,
        fee: 0,
      }]));
      if (url.includes("/api/stay-proposals")) return Promise.resolve(jsonResponse([]));
      if (url.includes("/api/detections")) return Promise.resolve(jsonResponse([]));
      if (url.includes("/api/monitor/review")) return Promise.resolve(jsonResponse({ images: [] }));
      if (url.includes("/api/sightings")) return Promise.resolve(jsonResponse({ sightings: [] }));
      if (url.includes("/api/history")) return Promise.resolve(jsonResponse([]));
      return Promise.resolve(jsonResponse({}));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeTruthy();
    expect(screen.getByText("1 h 27 min")).toBeTruthy();
    expect(screen.getByText("Sin foto de entrada")).toBeTruthy();
    expect(screen.getByText("Sin foto de salida")).toBeTruthy();
    expect(screen.getByLabelText("Fecha")).toHaveProperty("value", currentOperationalDate());
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5));
    const dashboardUrls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(dashboardUrls.every(url => url.includes(`date=${currentOperationalDate()}`))).toBe(true);

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
