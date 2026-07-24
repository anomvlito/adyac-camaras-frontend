"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock3, RefreshCw } from "lucide-react";
import { DASHBOARD_REFRESH_MS } from "@/lib/constants";
import {
  type DetectionEvent,
  type ParkingStay,
  dismissDetection,
  fetchStays,
  fetchUnmatchedDetections,
  formatDuration,
  reconcileDetections,
} from "@/lib/stays";

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
        <img
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

type DetectionRole = "entry" | "exit" | "triage";

function DetectionCard({
  item,
  role,
  selected,
  busy,
  onUseAsEntry,
  onUseAsExit,
  onDismiss,
}: {
  item: DetectionEvent;
  role: DetectionRole;
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
          <img src={item.image_url} alt="" className="h-16 w-24 rounded-lg object-cover bg-slate-100" />
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
      <div className={`grid gap-2 mt-3 ${role === "triage" ? "grid-cols-3" : "grid-cols-2"}`}>
        {role !== "exit" && (
          <button disabled={busy} onClick={onUseAsEntry}
            className="rounded-lg bg-emerald-100 py-2 text-xs font-black text-emerald-700 disabled:opacity-50">
            {role === "triage" ? "Es entrada" : "Usar como entrada"}
          </button>
        )}
        {role !== "entry" && (
          <button disabled={busy} onClick={onUseAsExit}
            className="rounded-lg bg-rose-100 py-2 text-xs font-black text-rose-700 disabled:opacity-50">
            {role === "triage" ? "Es salida" : "Usar como salida"}
          </button>
        )}
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
  const [stays, setStays] = useState<ParkingStay[]>([]);
  const [detections, setDetections] = useState<DetectionEvent[]>([]);
  const [date, setDate] = useState("");
  const [plate, setPlate] = useState("");
  const [entry, setEntry] = useState<DetectionEvent | null>(null);
  const [exit, setExit] = useState<DetectionEvent | null>(null);
  const [resolvedPlate, setResolvedPlate] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextStays, nextDetections] = await Promise.all([
        fetchStays(date || undefined, plate.trim() || undefined),
        fetchUnmatchedDetections(date || undefined),
      ]);
      setStays(nextStays);
      setDetections(nextDetections);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar");
    } finally {
      setLoading(false);
    }
  }, [date, plate]);

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

  const markAsEntry = (item: DetectionEvent) => {
    setEntry(item);
    if (!resolvedPlate) setResolvedPlate(item.normalized_plate);
  };
  const markAsExit = (item: DetectionEvent) => {
    setExit(item);
    if (!resolvedPlate) setResolvedPlate(item.normalized_plate);
  };

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-5 flex flex-wrap items-end gap-3">
          <div className="mr-auto">
            <h1 className="text-xl font-black text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-500">Entradas y salidas pendientes de conciliar, y estadías completas.</p>
          </div>
          <label className="text-xs font-bold text-slate-500">
            Fecha
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)}
              className="block mt-1 h-10 rounded-lg border border-slate-200 px-3 text-sm font-medium" />
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
              role="entry"
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
              role="exit"
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
              <span className="text-xs font-bold text-slate-500 rounded-lg bg-slate-100 px-2 py-1">{stays.length}</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Estadías conciliadas, con entrada y salida.</p>
          </div>
          <div className="space-y-3">
            {stays.map((stay) => (
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
                  <p className="text-[10px] font-bold uppercase text-slate-400">{stay.match_type}</p>
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
              role="triage"
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

      {(entry || exit) && (
        <section className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_180px_auto] md:items-end">
            <p className="text-sm"><b>Entrada:</b> {entry ? `${entry.detected_plate} · ${localTime(entry.detected_at)}` : "Selecciona una"}</p>
            <p className="text-sm"><b>Salida:</b> {exit ? `${exit.detected_plate} · ${localTime(exit.detected_at)}` : "Selecciona una"}</p>
            <label className="text-xs font-bold text-slate-600">
              Patente resuelta
              <input value={resolvedPlate} onChange={(event) => setResolvedPlate(event.target.value.toUpperCase())}
                className="block mt-1 h-10 w-full rounded-lg border border-indigo-200 px-3 uppercase" />
            </label>
            <button onClick={reconcile} disabled={busy || !entry || !exit || !resolvedPlate.trim() || invalidOrder}
              className="h-10 rounded-lg bg-indigo-600 px-4 text-sm font-black text-white disabled:opacity-40">
              {busy ? "Guardando…" : "Crear estadía"}
            </button>
          </div>
          {invalidOrder && <p className="mt-2 text-sm font-bold text-rose-600">La salida debe ser posterior a la entrada.</p>}
        </section>
      )}
    </div>
  );
}
