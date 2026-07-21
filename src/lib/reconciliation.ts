import type { ReconcileResult, ReconciliationTab } from "./types";

export function reconciliationRows(result: ReconcileResult, tab: ReconciliationTab) {
  return result[tab];
}
