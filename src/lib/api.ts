import {
  MonitorImagesResponse,
  ReviewImagesResponse,
  HistoryEntry,
  StatsData,
  FtpEventsResponse,
} from "./types";

const API_BASE = "/api";

export async function getMonitorImages(
  date: string
): Promise<MonitorImagesResponse> {
  const res = await fetch(`${API_BASE}/monitor/images?date=${date}`);
  if (!res.ok) throw new Error("Failed to fetch monitor images");
  return res.json();
}

export async function getReviewImages(
  date: string
): Promise<ReviewImagesResponse> {
  const res = await fetch(`${API_BASE}/monitor/review?date=${date}`);
  if (!res.ok) throw new Error("Failed to fetch review images");
  return res.json();
}

export async function getHistory(): Promise<HistoryEntry[]> {
  const res = await fetch(`${API_BASE}/history`);
  if (!res.ok) throw new Error("Failed to fetch history");
  return res.json();
}

export async function getStats(): Promise<StatsData> {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

export async function getFtpEvents(): Promise<FtpEventsResponse> {
  const res = await fetch(`${API_BASE}/ftp/events`);
  if (!res.ok) throw new Error("Failed to fetch FTP events");
  return res.json();
}

export function getTodaysDate(): string {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

export function getPreviousDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  date.setDate(date.getDate() - 1);
  return date.toISOString().split("T")[0];
}

export function getNextDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  date.setDate(date.getDate() + 1);
  return date.toISOString().split("T")[0];
}
