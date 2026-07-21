"use client";

import { useCallback, useEffect, useState } from "react";
import { addDays, format, isToday, parseISO, subDays } from "date-fns";
import { Calendar, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { FeedRow } from "@/components/parking/ParkingFeed";
import { API, apiFetch } from "@/lib/auth";
import { filterHistoryByAction, mergeFeedEntries } from "@/lib/feed";
import type { HistoryEntry, Sighting } from "@/lib/types";

export default function Historial() {
  const [date, setDate]     = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [filter, setFilter] = useState<"ALL" | "ENTRY" | "EXIT">("ALL");
  const [rows, setRows]     = useState<HistoryEntry[]>([]);
  const [parked, setParked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [h, sg, c] = await Promise.all([
        apiFetch(`${API}/api/history?limit=2000`),
        apiFetch(`${API}/api/sightings?limit=500&date=${date}`),
        apiFetch(`${API}/api/cars`),
      ]);
      // Igual que en el Dashboard: el historial de un día mezcla sesiones
      // reales (entrada/salida) con avistamientos de ese día que todavía no
      // tienen sesión asociada.
      const historyEntries: HistoryEntry[] = h.ok
        ? (await h.json()).filter((e: HistoryEntry) => e.timestamp.startsWith(date))
        : [];
      const sightings: Sighting[] = sg.ok ? (await sg.json()).sightings : [];
      setRows(mergeFeedEntries(historyEntries, sightings));
      if (c.ok) setParked(new Set(Object.keys(await c.json())));
    } finally { setLoading(false); }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const visible = filterHistoryByAction(rows, filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Nav fecha */}
        <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden shrink-0">
          <button onClick={() => setDate(format(subDays(parseISO(date), 1), "yyyy-MM-dd"))}
            className="p-2.5 hover:bg-slate-50 text-slate-400 hover:text-slate-700 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <div className="flex items-center gap-1.5 px-1">
            <Calendar size={14} className="text-slate-400" />
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="text-sm font-semibold text-slate-700 outline-none bg-transparent w-32 lg:w-36" />
          </div>
          <button onClick={() => setDate(format(addDays(parseISO(date), 1), "yyyy-MM-dd"))}
            disabled={isToday(parseISO(date))}
            className="p-2.5 hover:bg-slate-50 text-slate-400 hover:text-slate-700 disabled:opacity-30 transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
        {/* Filtro */}
        <div className="flex rounded-xl overflow-hidden border border-slate-200 bg-white shrink-0">
          {(["ALL", "ENTRY", "EXIT"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 lg:px-4 py-2.5 text-xs lg:text-sm font-bold transition-colors ${filter === f ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}>
              {f === "ALL" ? "Todos" : f === "ENTRY" ? "Entradas" : "Salidas"}
            </button>
          ))}
        </div>
        <button onClick={load} className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50">
          <RefreshCw size={15} className={`text-slate-500 ${loading ? "animate-spin" : ""}`} />
        </button>
        {visible.length > 0 && (
          <span className="ml-auto text-xs text-slate-400">{visible.length} registros</span>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="divide-y divide-slate-50">
          {visible.map((r) => (
            <FeedRow
              key={r.session_id != null ? `${r.session_id}-${r.action}` : `sight-${r.plate}-${r.timestamp}`}
              r={r} showDate onPlateSaved={load} parked={parked} />
          ))}
          {visible.length === 0 && !loading && (
            <p className="text-center text-slate-400 py-16">Sin registros para {date}</p>
          )}
        </div>
      </div>
    </div>
  );
}
