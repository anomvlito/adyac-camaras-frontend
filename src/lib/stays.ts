import { API, apiFetch } from "./auth";

export type DetectionDirection = "APPROACHING" | "DEPARTING" | "UNKNOWN";
export type DetectionMatchStatus =
  | "UNMATCHED"
  | "MATCHED_ENTRY"
  | "MATCHED_EXIT"
  | "DISMISSED";

export type DetectionEvent = {
  detection_id: number;
  detected_plate: string;
  normalized_plate: string;
  detected_at: string;
  confidence: number;
  image_url: string | null;
  direction: DetectionDirection;
  match_status: DetectionMatchStatus;
  stay_id: number | null;
  source: string;
};

export type ParkingStay = {
  stay_id: number;
  resolved_plate: string;
  entry_detection_id: number | null;
  exit_detection_id: number | null;
  entry_time: string | null;
  exit_time: string | null;
  duration_minutes: number | null;
  match_type: "EXACT" | "FUZZY" | "MANUAL" | "UNRESOLVED";
  match_confidence: number | null;
  status: "ENTRY_ONLY" | "EXIT_ONLY" | "COMPLETED" | "NEEDS_REVIEW";
  entry_image_url: string | null;
  exit_image_url: string | null;
  fee: number;
};

async function responseJson<T>(response: Response): Promise<T> {
  if (response.ok) return response.json() as Promise<T>;
  const payload = await response.json().catch(() => ({}));
  throw new Error(payload.detail || `Error ${response.status}`);
}

export async function fetchStays(date?: string, plate?: string) {
  const params = new URLSearchParams({ status: "COMPLETED", limit: "200" });
  if (date) params.set("date", date);
  if (plate) params.set("plate", plate);
  return responseJson<ParkingStay[]>(
    await apiFetch(`${API}/api/stays?${params}`)
  );
}

export async function fetchUnmatchedDetections(date?: string) {
  const params = new URLSearchParams({ match_status: "UNMATCHED", limit: "200" });
  if (date) params.set("date", date);
  return responseJson<DetectionEvent[]>(
    await apiFetch(`${API}/api/detections?${params}`)
  );
}

export async function reconcileDetections(input: {
  entry_detection_id: number;
  exit_detection_id: number;
  resolved_plate: string;
}) {
  return responseJson<ParkingStay>(
    await apiFetch(`${API}/api/stays/reconcile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  );
}

export async function dismissDetection(detectionId: number) {
  return responseJson<{ detection_id: number; match_status: "DISMISSED" }>(
    await apiFetch(`${API}/api/detections/${detectionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "dismiss" }),
    })
  );
}

export function formatDuration(minutes: number | null) {
  if (minutes == null) return "Pendiente";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}
