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

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-wrap items-end gap-3">
          <div className="mr-auto">
            <h1 className="text-xl font-black text-slate-900">Estadías</h1>
            <p className="text-sm text-slate-500">Tiempo transcurrido entre la detección de entrada y salida.</p>
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
          <button onClick={load} aria-label="Actualizar estadías"
            className="h-10 px-3 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {error && <p role="alert" className="mx-5 mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-5 py-3">Patente resuelta</th>
                <th className="px-5 py-3">Entrada</th>
                <th className="px-5 py-3">Salida</th>
                <th className="px-5 py-3">Tiempo dentro</th>
                <th className="px-5 py-3">Conciliación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stays.map((stay) => (
                <tr key={stay.stay_id}>
                  <td className="px-5 py-4 font-black text-slate-800">{stay.resolved_plate}</td>
                  <td className="px-5 py-4 text-slate-600">{localTime(stay.entry_time)}</td>
                  <td className="px-5 py-4 text-slate-600">{localTime(stay.exit_time)}</td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1.5 font-black text-indigo-700">
                      <Clock3 size={15} /> {formatDuration(stay.duration_minutes)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs font-bold text-slate-500">{stay.match_type}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && stays.length === 0 && (
            <p className="py-14 text-center text-slate-400">No hay estadías completas para estos filtros.</p>
          )}
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex flex-wrap items-start gap-3 mb-4">
          <div className="mr-auto">
            <h2 className="font-black text-slate-800">Por conciliar</h2>
            <p className="text-sm text-slate-500">El OCR y la dirección son evidencia; no necesitan ser perfectos.</p>
          </div>
          <div className="text-xs text-slate-500 rounded-lg bg-amber-50 px-3 py-2">
            {detections.length} detección(es) pendientes
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {detections.map((item) => (
            <article key={item.detection_id}
              className={`rounded-xl border p-3 ${entry?.detection_id === item.detection_id || exit?.detection_id === item.detection_id ? "border-indigo-400 bg-indigo-50" : "border-slate-200"}`}>
              <div className="flex items-start gap-3">
                {item.image_url
                  ? <img src={item.image_url} alt="" className="h-16 w-24 rounded-lg object-cover bg-slate-100" />
                  : <div className="h-16 w-24 rounded-lg bg-slate-100" />}
                <div className="min-w-0">
                  <p className="font-black text-slate-900">{item.detected_plate}</p>
                  <p className="text-xs text-slate-500">{localTime(item.detected_at)}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    OCR {confidence(item.confidence)} · {item.direction}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <button disabled={busy} onClick={() => { setEntry(item); if (!resolvedPlate) setResolvedPlate(item.normalized_plate); }}
                  className="rounded-lg bg-emerald-100 py-2 text-xs font-black text-emerald-700 disabled:opacity-50">Entrada</button>
                <button disabled={busy} onClick={() => { setExit(item); if (!resolvedPlate) setResolvedPlate(item.normalized_plate); }}
                  className="rounded-lg bg-rose-100 py-2 text-xs font-black text-rose-700 disabled:opacity-50">Salida</button>
                <button disabled={busy} onClick={() => dismiss(item)}
                  className="rounded-lg bg-slate-100 py-2 text-xs font-black text-slate-600 disabled:opacity-50">Descartar</button>
              </div>
            </article>
          ))}
        </div>

        {detections.length === 0 && !loading && (
          <p className="py-10 text-center text-slate-400">No hay detecciones pendientes.</p>
        )}

        {(entry || exit) && (
          <div className="mt-5 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
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
          </div>
        )}
      </section>
    </div>
  );
}
