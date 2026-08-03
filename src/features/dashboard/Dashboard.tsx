"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Clock3, RefreshCw, X, Coins } from "lucide-react";
import { format } from "date-fns";
import { DASHBOARD_REFRESH_MS } from "@/lib/constants";
import {
  type DetectionEvent,
  type ParkingStay,
  type ReviewImage,
  type StayProposal,
  autoReconcileExact,
  currentOperationalDate,
  dismissDetection,
  fetchStays,
  fetchInvalidDetections,
  fetchReviewImages,
  fetchStayProposals,
  fetchUnmatchedDetections,
  formatDuration,
  nextOperationalDate,
  previousOperationalDate,
  reconcileDetections,
  promoteReviewImage,
  setDetectionDirection,
} from "@/lib/stays";

const CHILEAN_HOLIDAYS = new Set([
  "2026-01-01", "2026-04-03", "2026-04-04", "2026-05-01", "2026-05-21", "2026-06-21", "2026-06-29",
  "2026-07-16", "2026-08-15", "2026-09-18", "2026-09-19", "2026-10-12", "2026-10-31", "2026-11-01",
  "2026-12-08", "2026-12-25",
  "2027-01-01"
]);

function calculateTariff(entryTime: string | null, durationMinutes: number): number {
  if (!entryTime || durationMinutes === 0) return 0;
  
  const entryDate = new Date(entryTime);
  const dateString = format(entryDate, "yyyy-MM-dd");
  const isWeekend = entryDate.getDay() === 0 || entryDate.getDay() === 6;
  const isHoliday = CHILEAN_HOLIDAYS.has(dateString);
  
  if (isWeekend || isHoliday) {
    return 5000;
  }
  
  const cost = Math.round(durationMinutes * 33.3);
  return Math.max(cost, 1000);
}

function localTime(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function confidence(value: number) {
  return `${Math.round(value * 100)} %`;
}

function ZoomableImage({
  src,
  alt,
  className,
  eager = false,
}: {
  src: string;
  alt: string;
  className: string;
  eager?: boolean;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-full cursor-zoom-in"
        aria-label={`Ampliar ${alt.toLowerCase()}`}
      >
        <img
          src={src}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          className={className}
        />
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 p-4"
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cerrar imagen ampliada"
            className="absolute right-4 top-4 rounded-full bg-white/15 p-3 text-white hover:bg-white/25"
          >
            <X size={24} />
          </button>
          <img
            src={src}
            alt={alt}
            onClick={(event) => event.stopPropagation()}
            className="max-h-[90vh] max-w-full rounded-xl object-contain shadow-2xl"
          />
        </div>
      )}
    </>
  );
}

function StayEvidence({ side, imageUrl, time }: {
  side: "Entrada" | "Salida";
  imageUrl: string | null;
  time: string | null;
}) {
  return (
    <div className={side === "Salida" ? "md:text-right" : ""}>
      <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-slate-400">
        {side}
      </p>
      {imageUrl ? (
        <ZoomableImage
          src={imageUrl}
          alt={`Evidencia de ${side.toLowerCase()}`}
          className="h-28 w-full rounded-xl bg-slate-100 object-cover"
        />
      ) : (
        <div className="flex h-28 w-full items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-400">
          Sin foto de {side.toLowerCase()}
        </div>
      )}
      <p className="mt-2 text-sm font-bold text-slate-600">{localTime(time)}</p>
    </div>
  );
}

function DetectionCard({
  item,
  selected,
  busy,
  onUseAsEntry,
  onUseAsExit,
  onDismiss,
}: {
  item: DetectionEvent;
  selected: boolean;
  busy: boolean;
  onUseAsEntry: () => void;
  onUseAsExit: () => void;
  onDismiss: () => void;
}) {
  return (
    <article
      className={`rounded-xl border p-3 ${selected ? "border-indigo-400 bg-indigo-50" : "border-slate-200"}`}
    >
      <div className="flex items-start gap-3">
        {item.image_url ? (
          <div className="w-24 shrink-0">
            <ZoomableImage
              src={item.image_url}
              alt={`Detección ${item.detected_plate}`}
              className="h-16 w-24 rounded-lg bg-slate-100 object-cover"
            />
          </div>
        ) : (
          <div className="h-16 w-24 rounded-lg bg-slate-100" />
        )}
        <div className="min-w-0">
          <p className="font-black text-slate-900">{item.detected_plate}</p>
          <p className="text-xs text-slate-500">{localTime(item.detected_at)}</p>
          <p className="mt-1 text-xs font-bold text-slate-500">
            OCR {confidence(item.confidence)} · {item.direction}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3">
        <button disabled={busy} onClick={onUseAsEntry}
          className="rounded-lg bg-emerald-100 py-2 text-xs font-black text-emerald-700 disabled:opacity-50">
          Entrada
        </button>
        <button disabled={busy} onClick={onUseAsExit}
          className="rounded-lg bg-rose-100 py-2 text-xs font-black text-rose-700 disabled:opacity-50">
          Salida
        </button>
        <button disabled={busy} onClick={onDismiss}
          className="rounded-lg bg-slate-100 py-2 text-xs font-black text-slate-600 disabled:opacity-50">
          Descartar
        </button>
      </div>
    </article>
  );
}

function DashboardColumn({ title, subtitle, count, children, empty }: {
  title: string;
  subtitle: string;
  count: number;
  children: React.ReactNode;
  empty: string;
}) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col min-w-0">
      <div className="mb-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-black text-slate-800">{title}</h2>
          <span className="text-xs font-bold text-slate-500 rounded-lg bg-slate-100 px-2 py-1">{count}</span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      </div>
      <div className="space-y-3">{children}</div>
      {count === 0 && <p className="py-8 text-center text-sm text-slate-400">{empty}</p>}
    </section>
  );
}

export default function Dashboard() {
  const today = currentOperationalDate();
  const [stays, setStays] = useState<ParkingStay[]>([]);
  const [detections, setDetections] = useState<DetectionEvent[]>([]);
  const [invalidDetections, setInvalidDetections] = useState<DetectionEvent[]>([]);
  const [proposals, setProposals] = useState<StayProposal[]>([]);
  const [reviewImages, setReviewImages] = useState<ReviewImage[]>([]);
  const [reviewPlates, setReviewPlates] = useState<Record<string, string>>({});
  const [date, setDate] = useState(currentOperationalDate);
  const [includePreviousDay, setIncludePreviousDay] = useState(false);
  const [plate, setPlate] = useState("");
  const [entry, setEntry] = useState<DetectionEvent | null>(null);
  const [exit, setExit] = useState<DetectionEvent | null>(null);
  const [resolvedPlate, setResolvedPlate] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sortStaysBy, setSortStaysBy] = useState<"entry_desc" | "entry_asc" | "exit_desc" | "exit_asc">("entry_desc");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await autoReconcileExact(date);
      const [nextStays, nextDetections, nextInvalid, nextProposals, nextReview] = await Promise.all([
        fetchStays(date, plate.trim() || undefined),
        fetchUnmatchedDetections(date, includePreviousDay),
        fetchInvalidDetections(date),
        fetchStayProposals(date),
        fetchReviewImages(date),
      ]);
      setStays(nextStays);
      setDetections(nextDetections);
      setInvalidDetections(nextInvalid);
      setProposals(nextProposals);
      setReviewImages(nextReview);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar");
    } finally {
      setLoading(false);
    }
  }, [date, includePreviousDay, plate]);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, DASHBOARD_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!resolvedPlate) {
      setResolvedPlate(entry?.normalized_plate || exit?.normalized_plate || "");
    }
  }, [entry, exit, resolvedPlate]);

  const invalidOrder = useMemo(
    () => Boolean(entry && exit && new Date(exit.detected_at) <= new Date(entry.detected_at)),
    [entry, exit]
  );

  const entradas = useMemo(() => detections.filter((d) => d.direction === "APPROACHING"), [detections]);
  const salidas = useMemo(() => detections.filter((d) => d.direction === "DEPARTING"), [detections]);
  const triage = useMemo(() => detections.filter((d) => d.direction === "UNKNOWN"), [detections]);

  const sortedStays = useMemo(() => {
    return [...stays].sort((a, b) => {
      const aEntry = a.entry_time ? new Date(a.entry_time).getTime() : 0;
      const bEntry = b.entry_time ? new Date(b.entry_time).getTime() : 0;
      const aExit = a.exit_time ? new Date(a.exit_time).getTime() : 0;
      const bExit = b.exit_time ? new Date(b.exit_time).getTime() : 0;
      
      if (sortStaysBy === "entry_asc") return aEntry - bEntry;
      if (sortStaysBy === "entry_desc") return bEntry - aEntry;
      if (sortStaysBy === "exit_asc") return aExit - bExit;
      if (sortStaysBy === "exit_desc") return bExit - aExit;
      return 0;
    });
  }, [stays, sortStaysBy]);

  const reconcile = async () => {
    if (!entry || !exit || !resolvedPlate.trim() || invalidOrder) return;
    setBusy(true);
    try {
      await reconcileDetections({
        entry_detection_id: entry.detection_id,
        exit_detection_id: exit.detection_id,
        resolved_plate: resolvedPlate.trim().toUpperCase(),
      });
      setEntry(null);
      setExit(null);
      setResolvedPlate("");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo conciliar");
    } finally {
      setBusy(false);
    }
  };

  const dismiss = async (item: DetectionEvent) => {
    if (!window.confirm("¿Descartar esta detección de la cola de conciliación? La evidencia se conservará.")) return;
    setBusy(true);
    try {
      await dismissDetection(item.detection_id);
      if (entry?.detection_id === item.detection_id) setEntry(null);
      if (exit?.detection_id === item.detection_id) setExit(null);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo descartar");
    } finally {
      setBusy(false);
    }
  };

  const persistDirection = async (item: DetectionEvent, direction: "APPROACHING" | "DEPARTING") => {
    setBusy(true);
    try {
      await setDetectionDirection(item.detection_id, direction);
      setDetections((current) =>
        current.map((d) => (d.detection_id === item.detection_id ? { ...d, direction } : d))
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo clasificar la dirección");
    } finally {
      setBusy(false);
    }
  };

  const markAsEntry = (item: DetectionEvent) => {
    setEntry(item);
    if (!resolvedPlate) setResolvedPlate(item.normalized_plate);
    if (item.direction === "UNKNOWN") persistDirection(item, "APPROACHING");
  };
  const markAsExit = (item: DetectionEvent) => {
    setExit(item);
    if (!resolvedPlate) setResolvedPlate(item.normalized_plate);
    if (item.direction === "UNKNOWN") persistDirection(item, "DEPARTING");
  };
  const reviewProposal = (proposal: StayProposal) => {
    setEntry(proposal.entry);
    setExit(proposal.exit);
    setResolvedPlate(proposal.resolved_plate);
  };
  const promoteImage = async (image: ReviewImage) => {
    const value = (reviewPlates[image.filename] || "").trim().toUpperCase();
    if (value.replace(/[^A-Z0-9]/g, "").length !== 6) {
      setError("La patente debe tener exactamente 6 caracteres.");
      return;
    }
    setBusy(true);
    try {
      await promoteReviewImage({ date, filename: image.filename, plate: value });
      setReviewPlates((current) => ({ ...current, [image.filename]: "" }));
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo recuperar la imagen");
    } finally {
      setBusy(false);
    }
  };
  const clearSelection = () => {
    setEntry(null);
    setExit(null);
    setResolvedPlate("");
  };
  const changeDate = (nextDate: string) => {
    if (!nextDate || nextDate > today) return;
    clearSelection();
    setDate(nextDate);
  };
  const goToPreviousDay = () => changeDate(previousOperationalDate(date));
  const goToNextDay = () => {
    if (date >= today) return;
    changeDate(nextOperationalDate(date));
  };

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-5 flex flex-wrap items-end gap-3">
          <div className="mr-auto">
            <h1 className="text-xl font-black text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-500">Entradas y salidas pendientes de conciliar, y estadías completas.</p>
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500">Fecha</span>
            <div className="mt-1 flex items-center gap-1">
              <button
                type="button"
                onClick={goToPreviousDay}
                aria-label="Día anterior"
                title="Día anterior"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
              >
                <ChevronLeft size={18} />
              </button>
              <label>
                <span className="sr-only">Fecha</span>
                <input
                  type="date"
                  value={date}
                  max={today}
                  onChange={(event) => changeDate(event.target.value)}
                  className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-medium"
                />
              </label>
              <button
                type="button"
                onClick={goToNextDay}
                disabled={date >= today}
                aria-label="Día siguiente"
                title={date >= today ? "Ya estás en el día actual" : "Día siguiente"}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          <label className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-600">
            <input
              type="checkbox"
              checked={includePreviousDay}
              onChange={(event) => {
                clearSelection();
                setIncludePreviousDay(event.target.checked);
              }}
            />
            Incluir pendientes del día anterior
          </label>
          <label className="text-xs font-bold text-slate-500">
            Patente
            <input value={plate} onChange={(event) => setPlate(event.target.value.toUpperCase())}
              placeholder="ABCD12"
              className="block mt-1 h-10 w-32 rounded-lg border border-slate-200 px-3 text-sm font-bold uppercase" />
          </label>
          <button onClick={load} aria-label="Actualizar dashboard"
            className="h-10 px-3 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {error && <p role="alert" className="mx-5 mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}
      </section>

      {(entry || exit) && (
        <section className="sticky top-20 z-30 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_180px_auto_auto] md:items-end">
            <div className="text-sm">
              {entry?.image_url && (
                <ZoomableImage
                  src={entry.image_url}
                  alt={`Entrada ${entry.detected_plate}`}
                  className="mb-2 h-24 w-full rounded-xl bg-white object-cover"
                  eager
                />
              )}
              <p><b>Entrada:</b> {entry ? `${entry.detected_plate} · ${localTime(entry.detected_at)}` : "Selecciona una"}</p>
            </div>
            <div className="text-sm">
              {exit?.image_url && (
                <ZoomableImage
                  src={exit.image_url}
                  alt={`Salida ${exit.detected_plate}`}
                  className="mb-2 h-24 w-full rounded-xl bg-white object-cover"
                  eager
                />
              )}
              <p><b>Salida:</b> {exit ? `${exit.detected_plate} · ${localTime(exit.detected_at)}` : "Selecciona una"}</p>
            </div>
            <label className="text-xs font-bold text-slate-600">
              Patente resuelta
              <input value={resolvedPlate} onChange={(event) => setResolvedPlate(event.target.value.toUpperCase())}
                className="block mt-1 h-10 w-full rounded-lg border border-indigo-200 px-3 uppercase" />
            </label>
            <button onClick={reconcile} disabled={busy || !entry || !exit || !resolvedPlate.trim() || invalidOrder}
              className="h-10 rounded-lg bg-indigo-600 px-4 text-sm font-black text-white disabled:opacity-40">
              {busy ? "Guardando…" : "Crear estadía"}
            </button>
            <button onClick={clearSelection} disabled={busy}
              className="h-10 rounded-lg bg-white px-4 text-sm font-black text-slate-600 disabled:opacity-40">
              Limpiar
            </button>
          </div>
          {invalidOrder ? (
            <p className="mt-2 text-sm font-bold text-rose-600">La salida debe ser posterior a la entrada.</p>
          ) : (!entry || !exit) && (
            <p className="mt-2 text-sm font-semibold text-indigo-700">
              Selecciona una entrada y una salida para habilitar la conciliación.
            </p>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-indigo-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-black text-slate-800">Propuestas de conciliación</h2>
            <p className="text-sm text-slate-500">Son sugerencias; ninguna crea una estadía sin tu confirmación.</p>
          </div>
          <span className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700">{proposals.length}</span>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {proposals.map((proposal) => (
            <article key={`${proposal.entry.detection_id}-${proposal.exit.detection_id}`} className="rounded-xl border border-slate-200 p-3">
              <div className="mb-3 grid grid-cols-2 gap-2">
                {proposal.entry.image_url ? (
                  <ZoomableImage
                    src={proposal.entry.image_url}
                    alt={`Entrada propuesta ${proposal.entry.detected_plate}`}
                    className="h-20 w-full rounded-lg bg-slate-100 object-cover"
                  />
                ) : <div className="h-20 rounded-lg bg-slate-100" />}
                {proposal.exit.image_url ? (
                  <ZoomableImage
                    src={proposal.exit.image_url}
                    alt={`Salida propuesta ${proposal.exit.detected_plate}`}
                    className="h-20 w-full rounded-lg bg-slate-100 object-cover"
                  />
                ) : <div className="h-20 rounded-lg bg-slate-100" />}
              </div>
              <p className="font-black text-slate-900">{proposal.resolved_plate}</p>
              <p className="text-xs text-slate-500">
                {localTime(proposal.entry.detected_at)} → {localTime(proposal.exit.detected_at)}
              </p>
              <p className="mt-1 text-xs font-bold text-indigo-600">
                {proposal.match_type} · {formatDuration(proposal.duration_minutes)}
              </p>
              <button onClick={() => reviewProposal(proposal)} disabled={busy}
                className="mt-3 w-full rounded-lg bg-indigo-600 py-2 text-xs font-black text-white disabled:opacity-50">
                Revisar propuesta
              </button>
            </article>
          ))}
        </div>
        {proposals.length === 0 && !loading && <p className="py-6 text-center text-sm text-slate-400">No hay propuestas para esta fecha.</p>}
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <DashboardColumn
          title="Entradas pendientes"
          subtitle="Detecciones que parecen ingreso, sin salida asociada."
          count={entradas.length}
          empty="No hay entradas pendientes."
        >
          {entradas.map((item) => (
            <DetectionCard
              key={item.detection_id}
              item={item}
              selected={entry?.detection_id === item.detection_id}
              busy={busy}
              onUseAsEntry={() => markAsEntry(item)}
              onUseAsExit={() => markAsExit(item)}
              onDismiss={() => dismiss(item)}
            />
          ))}
        </DashboardColumn>

        <DashboardColumn
          title="Salidas pendientes"
          subtitle="Detecciones que parecen egreso, sin entrada asociada."
          count={salidas.length}
          empty="No hay salidas pendientes."
        >
          {salidas.map((item) => (
            <DetectionCard
              key={item.detection_id}
              item={item}
              selected={exit?.detection_id === item.detection_id}
              busy={busy}
              onUseAsEntry={() => markAsEntry(item)}
              onUseAsExit={() => markAsExit(item)}
              onDismiss={() => dismiss(item)}
            />
          ))}
        </DashboardColumn>

        <section className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col min-w-0">
          <div className="mb-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-black text-slate-800">Sesiones completas</h2>
              <div className="flex items-center gap-2">
                <select
                  value={sortStaysBy}
                  onChange={(e) => setSortStaysBy(e.target.value as "entry_desc" | "entry_asc" | "exit_desc" | "exit_asc")}
                  className="appearance-none text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-transparent outline-none cursor-pointer hover:text-slate-600 transition-colors"
                  title="Ordenar sesiones"
                >
                  <option value="entry_desc">Entrada ↓</option>
                  <option value="entry_asc">Entrada ↑</option>
                  <option value="exit_desc">Salida ↓</option>
                  <option value="exit_asc">Salida ↑</option>
                </select>
                <span className="text-xs font-bold text-slate-500 rounded-lg bg-slate-100 px-2 py-1">{stays.length}</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Estadías conciliadas, con entrada y salida.</p>
          </div>
          <div className="space-y-3">
            {sortedStays.map((stay) => (
              <article key={stay.stay_id} className="rounded-xl border border-slate-200 p-3">
                <div className="grid grid-cols-2 gap-3">
                  <StayEvidence side="Entrada" imageUrl={stay.entry_image_url} time={stay.entry_time} />
                  <StayEvidence side="Salida" imageUrl={stay.exit_image_url} time={stay.exit_time} />
                </div>
                <div className="mt-3 rounded-lg bg-indigo-50 px-3 py-2 text-center">
                  <p className="text-lg font-black tracking-wide text-slate-900">{stay.resolved_plate}</p>
                  <span className="inline-flex items-center gap-1.5 text-sm font-black text-indigo-700">
                    <Clock3 size={14} /> {formatDuration(stay.duration_minutes)}
                  </span>
                  <div className="mt-1 flex items-center justify-center gap-1.5 text-emerald-600 font-bold bg-emerald-50 rounded-md py-0.5 px-2 w-max mx-auto border border-emerald-100">
                    <Coins size={14} />
                    <span>
                      ${calculateTariff(stay.entry_time, stay.duration_minutes).toLocaleString("es-CL")}
                    </span>
                  </div>
                  <p className="text-[10px] font-bold uppercase text-slate-400 mt-1">{stay.match_type}</p>
                </div>
              </article>
            ))}
          </div>
          {stays.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">No hay estadías completas para estos filtros.</p>
          )}
        </section>
      </div>

      <section className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex flex-wrap items-start gap-3 mb-4">
          <div className="mr-auto">
            <h2 className="font-black text-slate-800">Sin dirección clara</h2>
            <p className="text-sm text-slate-500">
              El clasificador no pudo decidir si es entrada o salida — resolvelo manualmente.
            </p>
          </div>
          <div className="text-xs text-slate-500 rounded-lg bg-amber-50 px-3 py-2">
            {triage.length} detección(es) por triar
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {triage.map((item) => (
            <DetectionCard
              key={item.detection_id}
              item={item}
              selected={entry?.detection_id === item.detection_id || exit?.detection_id === item.detection_id}
              busy={busy}
              onUseAsEntry={() => markAsEntry(item)}
              onUseAsExit={() => markAsExit(item)}
              onDismiss={() => dismiss(item)}
            />
          ))}
        </div>

        {triage.length === 0 && !loading && (
          <p className="py-10 text-center text-slate-400">No hay detecciones sin dirección clara.</p>
        )}
      </section>

      <details className="rounded-2xl border border-slate-200 bg-white p-5">
        <summary className="cursor-pointer font-black text-slate-800">
          Evidencia fuera de conciliación ({invalidDetections.length} formato inválido · {reviewImages.length} sin OCR)
        </summary>
        <p className="mt-2 text-sm text-slate-500">
          Nada se borra. Las lecturas inválidas se conservan y las imágenes sin OCR pueden recuperarse con una patente de 6 caracteres.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {reviewImages.slice(0, 12).map((image) => (
            <article key={image.filename} className="rounded-xl border border-slate-200 p-3">
              <ZoomableImage
                src={image.url}
                alt="Evidencia pendiente de OCR"
                className="h-28 w-full rounded-lg object-cover"
              />
              <input
                value={reviewPlates[image.filename] || ""}
                onChange={(event) => setReviewPlates((current) => ({
                  ...current,
                  [image.filename]: event.target.value.toUpperCase(),
                }))}
                placeholder="ABC123"
                maxLength={8}
                className="mt-2 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm font-bold uppercase"
              />
              <button onClick={() => promoteImage(image)} disabled={busy}
                className="mt-2 w-full rounded-lg bg-slate-800 py-2 text-xs font-black text-white disabled:opacity-50">
                Incorporar a conciliación
              </button>
            </article>
          ))}
        </div>
      </details>

    </div>
  );
}
