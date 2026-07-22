import { expect, test } from "@playwright/test";

async function mockAuthenticatedApi(page: import("@playwright/test").Page) {
  await page.route("**/api/**", async route => {
    const url = route.request().url();
    if (url.includes("/api/stats")) {
      await route.fulfill({ json: {
        today_income: 1200,
        today_entries: 2,
        today_exits: 1,
        parked_now: 1,
      } });
      return;
    }
    if (url.includes("/api/sightings")) {
      await route.fulfill({ json: { sightings: [] } });
      return;
    }
    if (url.includes("/api/history")) {
      await route.fulfill({ json: [] });
      return;
    }
    if (url.includes("/api/cars")) {
      await route.fulfill({ json: {} });
      return;
    }
    await route.fulfill({ status: 404, json: { detail: "synthetic fixture not found" } });
  });
}

test("preserves the accessible login form", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "CentralParking" })).toBeVisible();
  await expect(page.getByLabel("Usuario")).toBeVisible();
  await expect(page.getByLabel("Contraseña")).toBeVisible();
  const login = page.getByRole("button", { name: "Ingresar" });
  await expect(login).toBeVisible();
  await expect(login).toHaveClass(/bg-violet-600/);
  await expect(login).toHaveClass(/hover:bg-violet-700/);
});

test("preserves dashboard, history and reconciliation navigation", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("cp_auth", JSON.stringify({
      token: "synthetic-token",
      username: "tester",
      role: "administrador",
    }));
  });
  await mockAuthenticatedApi(page);
  await page.goto("/");

  await expect(page.getByText("Feed en vivo")).toBeVisible();
  // HU-003: se retiran las tarjetas de estadísticas y el bloque "Estado" del Dashboard.
  await expect(page.getByText("$1.200")).not.toBeVisible();
  await expect(page.getByText("Entradas hoy")).not.toBeVisible();
  await expect(page.getByText("Estado", { exact: true })).not.toBeVisible();

  await page.getByRole("button", { name: "Historial" }).click();
  await expect(page.getByRole("button", { name: "Todos" })).toBeVisible();
  await expect(page.getByText(/Sin registros para/)).toBeVisible();

  await page.getByRole("button", { name: "Excel" }).click();
  await expect(page.getByText("Arrastrá el Excel aquí o hacé click")).toBeVisible();
  await expect(page.getByRole("button", { name: "Comparar" })).toBeVisible();
});
