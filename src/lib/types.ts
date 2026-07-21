export type HistoryEntry = {
  session_id: number | null;
  timestamp: string;
  plate: string;
  action: string;
  status: string;
  review_status: string;
  fee: number;
  confidence: number;
  image_url: string | null;
  image_path?: string | null;
};

export type Sighting = {
  plate: string;
  timestamp: string;
  confidence: number;
  image_url: string | null;
  image_path?: string | null;
};

export type Stats = {
  today_income: number;
  today_entries: number;
  today_exits: number;
  parked_now: number;
};

export type CameraOnlyResult = {
  plate: string;
  camera_time: string;
  confidence: number;
  image_url: string | null;
};

export type MatchedResult = CameraOnlyResult & {
  excel_ingreso: string;
  diff_minutes: number;
  valor: number;
  operador: string;
  estado: string;
};

export type ExcelOnlyResult = {
  plate: string;
  excel_ingreso: string;
  excel_salida: string | null;
  valor: number;
  operador: string;
  estado: string;
};

export type ReconcileResult = {
  date: string;
  summary: {
    camera_total: number;
    excel_total: number;
    matched: number;
    camera_only: number;
    excel_only: number;
    excel_revenue: number;
  };
  camera_only: CameraOnlyResult[];
  matched: MatchedResult[];
  excel_only: ExcelOnlyResult[];
};

export type ReconciliationTab = "camera_only" | "matched" | "excel_only";
export type AuthState = { token: string; username: string; role: string } | null;
