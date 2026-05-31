export interface MonitorImage {
  filename: string;
  plate: string | null;
  time: string;
  date: string;
  tag: string | null;
  url: string;
}

export interface ReviewImage extends MonitorImage {
  reason: "NO_DETECTADA" | "VACIA";
}

export interface MonitorImagesResponse {
  date: string;
  images: MonitorImage[];
}

export interface ReviewImagesResponse {
  date: string;
  images: ReviewImage[];
}

export interface HistoryEntry {
  timestamp: string;
  plate: string;
  action: "ENTRY" | "EXIT" | "VOID";
  status: "FTP_AUTO" | "REAL";
  fee: number;
  confidence: number;
}

export interface StatsData {
  today_income: number;
  today_entries: number;
  today_exits: number;
  parked_now: number;
}

export interface FtpEvent {
  timestamp: string;
  plate: string;
  source: "image" | "video";
  confidence: number;
  strategy: string;
  action: "ENTRY" | "EXIT" | "DUP";
}

export interface FtpEventsResponse {
  events: FtpEvent[];
}
