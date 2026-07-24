// Mock del contrato de HU-004 (backend, `centralparking-mvp`, aún no
// implementada) mientras se construye HU-005 (este dashboard) en paralelo.
// Los tipos y las firmas de `fetchDashboardData`/`patchExitOrphan` calzan
// exactamente con los endpoints acordados con el backend:
//   GET /api/dashboard/entries-open
//   GET /api/dashboard/exits-orphan   (status=PENDING por defecto)
//   GET /api/dashboard/sessions-closed
//   PATCH /api/dashboard/exits-orphan/{id}  { action: "match"|"dismiss", session_id? }
// Cuando HU-004 esté lista, reemplazar el cuerpo de estas dos funciones por
// llamadas reales con `apiFetch` a esas rutas — el resto del Dashboard no
// debería necesitar cambios porque ya consume estos tipos y firmas.
//
// Las patentes son sintéticas (no corresponden a autos reales), según el
// guardrail de datos del proyecto.

export type EntryOpen = {
  session_id: number;
  plate: string;
  entry_time: string; // ISO 8601
  entry_image_url: string | null;
};

export type ExitOrphan = {
  orphan_exit_id: number;
  plate: string;
  exit_time: string; // ISO 8601
  exit_image_url: string | null;
  confidence: number;
  status: "PENDING" | "MATCHED" | "DISMISSED";
};

export type SessionClosed = {
  session_id: number;
  plate: string;
  entry_time: string; // ISO 8601
  entry_image_url: string | null;
  exit_time: string; // ISO 8601
  exit_image_url: string | null;
  duration_minutes: number;
  fee: number;
};

export type DashboardData = {
  entriesOpen: EntryOpen[];
  exitsOrphan: ExitOrphan[];
  sessionsClosed: SessionClosed[];
};

export type OrphanExitAction =
  | { action: "match"; session_id: number }
  | { action: "dismiss" };

const minutesAgoIso = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

const mockEntriesOpen: EntryOpen[] = [
  { session_id: 101, plate: "ABCD12", entry_time: minutesAgoIso(42), entry_image_url: null },
  { session_id: 102, plate: "LMNQ34", entry_time: minutesAgoIso(15), entry_image_url: null },
];

const mockExitsOrphan: ExitOrphan[] = [
  {
    orphan_exit_id: 201, plate: "XYZT99", exit_time: minutesAgoIso(8),
    exit_image_url: null, confidence: 0.81, status: "PENDING",
  },
  {
    orphan_exit_id: 202, plate: "RSTU56", exit_time: minutesAgoIso(3),
    exit_image_url: null, confidence: 0.74, status: "PENDING",
  },
];

let mockSessionsClosed: SessionClosed[] = [
  {
    session_id: 88, plate: "HJKL78",
    entry_time: minutesAgoIso(180), entry_image_url: null,
    exit_time: minutesAgoIso(133), exit_image_url: null,
    duration_minutes: 47, fee: 1300,
  },
];

const MOCK_LATENCY_MS = 150;
const delay = () => new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));

export async function fetchDashboardData(): Promise<DashboardData> {
  await delay();
  return {
    entriesOpen: [...mockEntriesOpen].sort((a, b) => b.entry_time.localeCompare(a.entry_time)),
    exitsOrphan: mockExitsOrphan
      .filter((o) => o.status === "PENDING")
      .sort((a, b) => b.exit_time.localeCompare(a.exit_time)),
    sessionsClosed: [...mockSessionsClosed].sort((a, b) => b.exit_time.localeCompare(a.exit_time)),
  };
}

export async function patchExitOrphan(orphanExitId: number, body: OrphanExitAction): Promise<void> {
  await delay();
  const orphan = mockExitsOrphan.find((o) => o.orphan_exit_id === orphanExitId);
  if (!orphan) throw new Error("Salida huérfana no encontrada");

  if (body.action === "dismiss") {
    orphan.status = "DISMISSED";
    return;
  }

  const entryIndex = mockEntriesOpen.findIndex((e) => e.session_id === body.session_id);
  if (entryIndex === -1) throw new Error("Sesión abierta no encontrada");
  const [entry] = mockEntriesOpen.splice(entryIndex, 1);

  orphan.status = "MATCHED";
  const durationMinutes = Math.max(
    0,
    Math.round((new Date(orphan.exit_time).getTime() - new Date(entry.entry_time).getTime()) / 60_000)
  );
  mockSessionsClosed = [
    {
      session_id: entry.session_id,
      plate: entry.plate,
      entry_time: entry.entry_time,
      entry_image_url: entry.entry_image_url,
      exit_time: orphan.exit_time,
      exit_image_url: orphan.exit_image_url,
      duration_minutes: durationMinutes,
      fee: 0,
    },
    ...mockSessionsClosed,
  ];
}
