import { describe, expect, it } from "vitest";
import { DASHBOARD_REFRESH_MS } from "./constants";
import { reconciliationRows } from "./reconciliation";
import type { ReconcileResult } from "./types";

describe("frontend contracts", () => {
  it("keeps dashboard polling at 15 seconds", () => {
    expect(DASHBOARD_REFRESH_MS).toBe(15_000);
  });

  it("selects each reconciliation category without transforming records", () => {
    const result: ReconcileResult = {
      date: "2026-07-21",
      summary: {
        camera_total: 1,
        excel_total: 2,
        matched: 1,
        camera_only: 1,
        excel_only: 1,
        excel_revenue: 1000,
      },
      camera_only: [{
        plate: "TEST10", camera_time: "10:00:00", confidence: 0.9, image_url: null,
      }],
      matched: [{
        plate: "TEST20", camera_time: "10:01:00", confidence: 0.9, image_url: null,
        excel_ingreso: "10:01:00", diff_minutes: 0, valor: 500,
        operador: "synthetic", estado: "Pagado",
      }],
      excel_only: [{
        plate: "TEST30", excel_ingreso: "10:02:00", excel_salida: null,
        valor: 500, operador: "synthetic", estado: "Pendiente",
      }],
    };

    expect(reconciliationRows(result, "camera_only")).toBe(result.camera_only);
    expect(reconciliationRows(result, "matched")).toBe(result.matched);
    expect(reconciliationRows(result, "excel_only")).toBe(result.excel_only);
  });
});
