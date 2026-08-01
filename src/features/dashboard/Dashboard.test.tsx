// @vitest-environment jsdom

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import Dashboard from "./Dashboard";
import { AUTH_STORAGE_KEY } from "@/lib/auth";
import { currentOperationalDate } from "@/lib/stays";

function jsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  } as Response;
}

function triageDetection() {
  return {
    detection_id: 77,
    detected_plate: "TEST77",
    normalized_plate: "TEST77",
    detected_at: "2026-07-31T10:00:00-04:00",
    confidence: 0.9,
    image_url: null,
    direction: "UNKNOWN" as const,
    match_status: "UNMATCHED" as const,
    stay_id: null,
    source: "TEST",
  };
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});

function stubAuth() {
  localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({ token: "synthetic-token", username: "tester", role: "administrador" })
  );
}

describe("triage direction persistence", () => {
  it("moves a triage card to Entradas pendientes after Entrada persists direction", async () => {
    stubAuth();
    let direction: "UNKNOWN" | "APPROACHING" = "UNKNOWN";
    const fetchMock = vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/stays/auto-reconcile-exact")) {
        return Promise.resolve(jsonResponse({ date: currentOperationalDate(), reconciled: 0, skipped: 0 }));
      }
      if (url.includes("/api/stays")) return Promise.resolve(jsonResponse([]));
      if (url.includes("/api/stay-proposals")) return Promise.resolve(jsonResponse([]));
      if (url.match(/\/api\/detections\/77$/) && init?.method === "PATCH") {
        const body = JSON.parse(String(init.body));
        expect(body).toEqual({ action: "set_direction", direction: "APPROACHING" });
        direction = "APPROACHING";
        return Promise.resolve(jsonResponse({ detection_id: 77, direction: "APPROACHING" }));
      }
      if (url.includes("/api/detections")) {
        return Promise.resolve(jsonResponse([{ ...triageDetection(), direction }]));
      }
      if (url.includes("/api/monitor/review")) return Promise.resolve(jsonResponse({ images: [] }));
      return Promise.resolve(jsonResponse({}));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<Dashboard />);

    const triageSection = (await screen.findByText("Sin dirección clara")).closest("section")!;
    expect(within(triageSection).getByText("TEST77")).toBeTruthy();

    await userEvent.click(within(triageSection).getByRole("button", { name: "Entrada" }));

    await waitFor(() => {
      const entradasHeading = screen.getByRole("heading", { name: "Entradas pendientes" });
      const entradasSection = entradasHeading.closest("section")!;
      expect(within(entradasSection).getByText("TEST77")).toBeTruthy();
    });

    const triageSectionAfter = screen.getByText("Sin dirección clara").closest("section")!;
    expect(within(triageSectionAfter).queryByText("TEST77")).toBeNull();
  });

  it("keeps the card in triage and shows an error when the PATCH fails", async () => {
    stubAuth();
    const fetchMock = vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/stays/auto-reconcile-exact")) {
        return Promise.resolve(jsonResponse({ date: currentOperationalDate(), reconciled: 0, skipped: 0 }));
      }
      if (url.includes("/api/stays")) return Promise.resolve(jsonResponse([]));
      if (url.includes("/api/stay-proposals")) return Promise.resolve(jsonResponse([]));
      if (url.match(/\/api\/detections\/77$/) && init?.method === "PATCH") {
        return Promise.resolve(jsonResponse({ detail: "La detección ya tiene una dirección resuelta" }, 409));
      }
      if (url.includes("/api/detections")) return Promise.resolve(jsonResponse([triageDetection()]));
      if (url.includes("/api/monitor/review")) return Promise.resolve(jsonResponse({ images: [] }));
      return Promise.resolve(jsonResponse({}));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<Dashboard />);

    const triageSection = (await screen.findByText("Sin dirección clara")).closest("section")!;
    await userEvent.click(within(triageSection).getByRole("button", { name: "Salida" }));

    expect(await screen.findByText("La detección ya tiene una dirección resuelta")).toBeTruthy();
    expect(within(triageSection).getByText("TEST77")).toBeTruthy();
  });
});
