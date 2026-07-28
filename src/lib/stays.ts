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

export function currentOperationalDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function previousOperationalDate(date: string) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() - 1);
  return value.toISOString().slice(0, 10);
}

export async function fetchStays(date?: string, plate?: string) {
  const params = new URLSearchParams({ status: "COMPLETED", limit: "200" });
  if (date) params.set("date", date);
  if (plate) params.set("plate", plate);
  return responseJson<ParkingStay[]>(
    await apiFetch(`${API}/api/stays?${params}`)
  );
}

async function fetchUnmatchedForDate(date: string) {
  const params = new URLSearchParams({
    match_status: "UNMATCHED",
    limit: "200",
    date,
  });
  return responseJson<DetectionEvent[]>(
    await apiFetch(`${API}/api/detections?${params}`)
  );
}

export async function fetchUnmatchedDetections(date: string, includePreviousDay = false) {
  const dates = includePreviousDay
    ? [date, previousOperationalDate(date)]
    : [date];
  const pages = await Promise.all(dates.map(fetchUnmatchedForDate));
  return Array.from(
    new Map(pages.flat().map((item) => [item.detection_id, item])).values()
  ).sort((a, b) => b.detected_at.localeCompare(a.detected_at));
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
