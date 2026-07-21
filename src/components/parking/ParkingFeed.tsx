"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { AlertTriangle, Image as ImageIcon, X } from "lucide-react";
import { API, apiFetch } from "@/lib/auth";
import type { HistoryEntry, Sighting } from "@/lib/types";

export function PhotoThumb({ url, plate, status, size = "sm", editableRow, onPlateSaved }: {
  url: string | null; plate: string; status?: string; size?: "sm" | "lg";
  editableRow?: HistoryEntry; onPlateSaved?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [imageState, setImageState] = useState({ url, loaded: false, failed: false, attempt: 0 });
  const loaded = imageState.url === url && imageState.loaded;
  const failed = imageState.url === url && imageState.failed;
  const attempt = imageState.url === url ? imageState.attempt : 0;
  const cls = size === "lg"
    ? "w-20 h-14 lg:w-24 lg:h-16"
    : "w-14 h-10";

  if (!url) return (
    <div title={status === "AUTO_CLOSED" ? "Cierre automático sin captura" : "Sin imagen asociada"}
      className={`${cls} rounded-xl bg-slate-100 flex flex-col items-center justify-center shrink-0 px-1`}>
      <ImageIcon size={size === "lg" ? 18 : 14} className="text-slate-300" />
      {size === "lg" && (
        <span className="text-[8px] leading-tight text-slate-400 text-center mt-0.5">
          {status === "AUTO_CLOSED" ? "Cierre automático" : "Sin captura"}
        </span>
      )}
    </div>
  );

  if (failed) return (
    <button type="button" title="Reintentar cargar imagen"
      onClick={() => setImageState({ url, loaded: false, failed: false, attempt: attempt + 1 })}
      className={`${cls} rounded-xl bg-rose-50 border border-rose-100 flex flex-col items-center justify-center shrink-0`}>
      <AlertTriangle size={size === "lg" ? 17 : 14} className="text-rose-400" />
      {size === "lg" && <span className="text-[8px] text-rose-500 mt-0.5">Reintentar</span>}
    </button>
  );

  return (
    <>
      <button onClick={() => loaded && setOpen(true)} className={`${cls} relative shrink-0 group`} disabled={!loaded} title="Ampliar y editar">
        {!loaded && <span className="absolute inset-0 rounded-xl bg-slate-100 animate-pulse" aria-label="Cargando imagen" />}
        <img key={attempt} src={url} alt={`Captura de patente ${plate}`} loading="lazy" decoding="async"
          onLoad={() => setImageState({ url, loaded: true, failed: false, attempt })}
          onError={() => setImageState({ url, loaded: false, failed: true, attempt })}
          className={`${cls} object-cover rounded-xl border border-slate-200 group-hover:scale-105 transition-all cursor-zoom-in ${loaded ? "opacity-100" : "opacity-0"}`} />
        {loaded && editableRow && (
          <div className="absolute -bottom-1 -right-1 bg-indigo-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
            <span className="text-[10px] leading-none">✏️</span>
          </div>
        )}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 lg:p-8"
          onClick={() => setOpen(false)}>
          <div className="relative max-w-4xl w-full flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <button onClick={() => setOpen(false)}
              className="absolute -top-4 -right-4 lg:-right-8 lg:-top-4 bg-white text-slate-900 rounded-full p-2 shadow-lg z-10 hover:scale-110 transition-transform">
              <X size={20} />
            </button>
            <img src={url} alt={plate} className="w-full rounded-2xl shadow-2xl mb-6 max-h-[60vh] object-contain bg-black/40" />

            {editableRow ? (
              <div className="bg-white/10 p-5 lg:p-6 rounded-3xl backdrop-blur-md border border-white/20 shadow-xl w-full max-w-xl">
                <PlateEditor row={editableRow} onSaved={() => { setOpen(false); onPlateSaved?.(); }} />
                <div className="mt-4 pt-4 border-t border-white/20">
                  <ReviewButtons row={editableRow} onSaved={() => { setOpen(false); onPlateSaved?.(); }} dark />
                </div>
              </div>
            ) : (
              <p className="text-center text-white font-black text-3xl tracking-widest font-mono drop-shadow-lg">{plate}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function PlateEditor({ row, onSaved }: { row: HistoryEntry; onSaved?: () => void }) {
  const [chars, setChars] = useState(() => row.plate.split(""));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const slots = Math.min(8, Math.max(6, chars.length));

  useEffect(() => { setChars(row.plate.split("")); setMessage(""); }, [row.plate]);

  const setPlate = (value: string) => {
    setChars(value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8).split(""));
    setMessage("");
  };

  const changeAt = (index: number, value: string) => {
    const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const next = [...chars];
    next[index] = clean.slice(-1);
    setChars(next);
    setMessage("");
    if (clean && index < slots - 1) inputs.current[index + 1]?.focus();
  };

  const save = async () => {
    const plate = chars.join("");
    if (plate === row.plate || plate.length < 4) return;
    setSaving(true); setMessage("");
    try {
      const response = await apiFetch(`${API}/api/history/${row.session_id}/plate`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plate }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.detail || "No se pudo actualizar");
      }
      setMessage("Guardado");
      onSaved?.();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error al guardar");
    } finally { setSaving(false); }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-1.5 sm:gap-2" onPaste={(event) => {
        event.preventDefault(); setPlate(event.clipboardData.getData("text"));
      }}>
        {Array.from({ length: slots }, (_, index) => (
          <input key={index} ref={(element) => { inputs.current[index] = element; }}
            value={chars[index] ?? ""} maxLength={1} inputMode="text"
            aria-label={`Carácter ${index + 1} de la patente`}
            onChange={(event) => changeAt(index, event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Backspace" && !chars[index] && index > 0) inputs.current[index - 1]?.focus();
              if (event.key === "Enter") save();
              if (event.key === "Escape") setPlate(row.plate);
            }}
            className="w-10 h-12 lg:w-14 lg:h-16 rounded-xl border-2 border-white/20 bg-white/90 text-center font-black font-mono text-xl lg:text-3xl uppercase focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 outline-none shadow-inner text-slate-800 transition-all" />
        ))}
      </div>
      <div className="flex items-center justify-center gap-3 w-full">
        {chars.join("") !== row.plate && (
          <button type="button" onClick={() => setPlate(row.plate)}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-colors">
            Restaurar
          </button>
        )}
        <button type="button" onClick={save}
          disabled={saving || chars.join("") === row.plate || chars.join("").length < 4}
          className="px-6 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 disabled:hover:bg-indigo-500 text-white font-black text-sm shadow-lg transition-all flex-1 max-w-[200px]">
          {saving ? "Guardando..." : "Guardar Patente"}
        </button>
      </div>
      {message && <span className={`text-sm font-bold ${message === "Guardado" ? "text-emerald-400" : "text-rose-400"}`}>{message}</span>}
    </div>
  );
}

function ReviewButtons({ row, onSaved, dark = false }: {
  row: HistoryEntry; onSaved?: () => void; dark?: boolean;
}) {
  const [saving, setSaving] = useState<"PLATE_OK" | "DUPLICATE" | null>(null);
  const [error, setError] = useState("");

  const update = async (status: "PLATE_OK" | "DUPLICATE") => {
    if (status === "DUPLICATE" && !window.confirm(`¿Quitar ${row.plate} por ser una detección duplicada?`)) return;
    setSaving(status); setError("");
    try {
      const response = await apiFetch(`${API}/api/history/${row.session_id}/review`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.detail || "No se pudo guardar el estado");
      }
      onSaved?.();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Error al guardar");
    } finally { setSaving(null); }
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button type="button" onClick={() => update("PLATE_OK")}
        disabled={saving !== null || row.review_status === "PLATE_OK"}
        className={`h-9 px-3 rounded-lg text-xs font-black transition-colors disabled:opacity-70 ${row.review_status === "PLATE_OK"
          ? "bg-emerald-600 text-white" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"}`}>
        {saving === "PLATE_OK" ? "Guardando..." : row.review_status === "PLATE_OK" ? "✓ Patente OK" : "Patente OK"}
      </button>
      <button type="button" onClick={() => update("DUPLICATE")} disabled={saving !== null}
        className="h-9 px-3 rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-200 text-xs font-black disabled:opacity-50">
        {saving === "DUPLICATE" ? "Quitando..." : "Duplicada"}
      </button>
      {error && <span className={`w-full text-right text-[10px] ${dark ? "text-rose-300" : "text-rose-500"}`}>{error}</span>}
    </div>
  );
}

// Botones de confirmación para un avistamiento sin sesión (session_id null,
// ver sightingToEntry): la cámara vio la patente pero, desde que se
// desconectó el auto entry/exit, nada abre/cierra parking_sessions solo —
// hay que confirmarlo a mano. "Registrar salida" si la patente ya figura
// parqueada (parked), si no "Registrar entrada". La foto del avistamiento
// (row.image_path) viaja junto al registro para que la sesión resultante
// no quede sin foto.
function RegisterActions({ row, isParked, onRegistered }: {
  row: HistoryEntry; isParked: boolean; onRegistered: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg]   = useState("");

  useEffect(() => { setMsg(""); }, [row.plate, row.timestamp]);

  const registerEntry = async () => {
    setBusy(true); setMsg("");
    try {
      const r = await apiFetch(`${API}/api/entry`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plate: row.plate, isEvent: false, imagePath: row.image_path ?? null }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || "No se pudo registrar");
      setMsg("Entrada registrada");
      onRegistered();
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Error al registrar");
    } finally { setBusy(false); }
  };

  const registerExit = async () => {
    const feeInput = window.prompt(`Monto cobrado a ${row.plate} (dejar en 0 si no aplica):`, "0");
    if (feeInput === null) return;
    const fee = Number(feeInput.replace(/[^0-9.]/g, "")) || 0;
    setBusy(true); setMsg("");
    try {
      const p = new URLSearchParams({ fee: String(fee) });
      if (row.image_path) p.set("image_path", row.image_path);
      const r = await apiFetch(`${API}/api/exit/${row.plate}?${p}`, { method: "POST" });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || "No se pudo registrar");
      setMsg("Salida registrada");
      onRegistered();
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Error al registrar");
    } finally { setBusy(false); }
  };

  if (msg) {
    return (
      <span className={`text-xs font-bold shrink-0 ${msg.startsWith("Error") || msg.startsWith("No se") ? "text-rose-500" : "text-emerald-500"}`}>
        {msg}
      </span>
    );
  }

  return isParked ? (
    <button onClick={registerExit} disabled={busy}
      className="h-9 px-3 rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-200 text-xs font-black disabled:opacity-50 shrink-0">
      {busy ? "..." : "Registrar salida"}
    </button>
  ) : (
    <button onClick={registerEntry} disabled={busy}
      className="h-9 px-3 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 text-xs font-black disabled:opacity-50 shrink-0">
      {busy ? "..." : "Registrar entrada"}
    </button>
  );
}

// Las sesiones ya no reciben foto automática al abrirse/cerrarse (la cámara
// solo loguea avistamientos, sin tocar parking_sessions — ver CLAUDE.md).
// Para una fila con sesión real (session_id), se acotan las fotos a una
// ventana cercana a la hora de esa fila (±30 min) — no las últimas de la
// patente en general, que podían ser de un momento sin relación (otro día,
// otra hora). Para una fila de avistamiento sin sesión (session_id null,
// ver sightingToEntry) se traen todas las fotos de esa patente del mismo
// día que la fila — tampoco "todas las de la base de datos", que podían
// venir de semanas atrás.
// Si no hay ninguna (o falla la carga) se usa la foto de la sesión si existe.
// Cualquiera de las fotos abre el mismo editor: la corrección es a nivel de
// sesión (row.session_id), no de la foto puntual clickeada — y solo está
// disponible cuando hay sesión real.
function SightingPhotos({ row, onPlateSaved }: { row: HistoryEntry; onPlateSaved?: () => void }) {
  const [sightings, setSightings] = useState<Sighting[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ limit: "20" });
    if (row.session_id != null) params.set("near", row.timestamp);
    else params.set("date", row.timestamp.split(" ")[0]);
    apiFetch(`${API}/api/sightings/${row.plate}?${params}`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (!cancelled && data) setSightings(data.sightings); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [row.plate, row.timestamp, row.session_id]);

  const urls = sightings && sightings.length > 0
    ? sightings.map(s => s.image_url)
    : [row.image_url];

  return (
    <div className="flex gap-1 shrink-0 overflow-x-auto max-w-[120px] lg:max-w-[160px]">
      {urls.map((url, idx) => (
        <PhotoThumb key={idx} url={url} plate={row.plate} status={row.status} size="sm"
          editableRow={row.session_id != null ? row : undefined} onPlateSaved={onPlateSaved} />
      ))}
    </div>
  );
}

function ActionBadge({ action }: { action: string }) {
  const styles: Record<string, string> = {
    ENTRY: "bg-emerald-100 text-emerald-700", EXIT: "bg-rose-100 text-rose-700",
    VOID: "bg-slate-100 text-slate-500", DETECTION: "bg-sky-100 text-sky-700",
  };
  const labels: Record<string, string> = {
    ENTRY: "Entrada", EXIT: "Salida", VOID: "Anulado", DETECTION: "Detección",
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${styles[action] ?? "bg-slate-100 text-slate-500"}`}>
      {labels[action] ?? action}
    </span>
  );
}

export function StatCard({ label, value, sub, accent = "text-slate-900" }: {
  label: string; value: string | number; sub?: string; accent?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 lg:p-5">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</p>
      <p className={`text-3xl lg:text-4xl font-black tabular-nums mt-1 ${accent}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Feed row (shared by Dashboard and Historial) ─────────────────────────────

export function FeedRow({ r, showDate = false, onPlateSaved, parked }: {
  r: HistoryEntry; showDate?: boolean; onPlateSaved?: () => void; parked?: Set<string>;
}) {
  const today = format(new Date(), "yyyy-MM-dd");
  const isSighting = r.session_id == null;
  // /api/cars solo refleja el estado "ahora" — al navegar el Historial a un
  // día pasado no tiene sentido ofrecer "Registrar salida" para una patente
  // que está parqueada hoy pero cuyo avistamiento es de otra fecha.
  const rowIsToday = r.timestamp.startsWith(today);
  return (
    <div className="flex flex-wrap items-center gap-3 lg:gap-4 px-4 lg:px-5 py-3 lg:py-4">
      <SightingPhotos row={r} onPlateSaved={onPlateSaved} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-black text-slate-900 tracking-widest text-base lg:text-xl font-mono">
            {r.plate}
          </span>
          <ActionBadge action={r.action} />
          {r.status && r.status !== "REAL" && (
            <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded hidden sm:inline">
              {r.status}
            </span>
          )}
        </div>
        <p className="text-sm lg:text-base text-slate-400 font-mono mt-0.5">
          {(showDate || r.timestamp.split(" ")[0] !== today) && (
            <span className="text-slate-300 mr-1.5">{r.timestamp.split(" ")[0]}</span>
          )}
          {r.timestamp.split(" ")[1]}
        </p>
      </div>
      {r.fee > 0 && (
        <span className="text-base lg:text-lg font-bold text-slate-700 tabular-nums shrink-0">
          ${r.fee.toLocaleString("es-CL")}
        </span>
      )}
      <span className="text-xs text-slate-300 tabular-nums shrink-0 hidden md:block w-10 text-right">
        {(r.confidence * 100).toFixed(0)}%
      </span>
      <div className="w-full lg:w-auto lg:ml-auto flex justify-end">
        {isSighting ? (
          <RegisterActions row={r} isParked={rowIsToday && !!parked?.has(r.plate)}
            onRegistered={() => onPlateSaved?.()} />
        ) : (
          <ReviewButtons row={r} onSaved={onPlateSaved} />
        )}
      </div>
    </div>
  );
}
