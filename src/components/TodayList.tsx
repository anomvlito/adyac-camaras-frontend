"use client";

import { HistoryEntry } from "@/lib/types";

interface TodayListProps {
  entries: HistoryEntry[];
}

export default function TodayList({ entries }: TodayListProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
        <div className="text-4xl mb-3 opacity-20">📋</div>
        <p className="text-sm font-medium">Sin movimientos registrados</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry, idx) => (
        <div
          key={idx}
          className="p-4 rounded-lg border border-white/5 bg-slate-900/30 hover:bg-slate-900/50 transition-colors flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="text-xs font-mono text-slate-500 shrink-0">
              {entry.timestamp.split(" ")[1]}
            </div>

            <div className="text-base sm:text-lg font-mono font-bold text-slate-100 truncate">
              {entry.plate}
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-1 rounded text-[10px] font-bold uppercase shrink-0 ${
                  entry.action === "ENTRY"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : entry.action === "EXIT"
                      ? "bg-indigo-500/20 text-indigo-400"
                      : "bg-red-500/20 text-red-400"
                }`}
              >
                {entry.action === "ENTRY"
                  ? "ENTRADA"
                  : entry.action === "EXIT"
                    ? "SALIDA"
                    : "ANULADA"}
              </span>

              <span
                className={`px-2 py-1 rounded text-[10px] font-bold uppercase shrink-0 ${
                  entry.status === "FTP_AUTO"
                    ? "bg-slate-700/50 text-slate-300"
                    : "bg-slate-700/50 text-slate-300"
                }`}
              >
                {entry.status === "FTP_AUTO" ? "AUTO" : "MANUAL"}
              </span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-sm font-mono font-bold text-slate-100">
              {entry.confidence.toFixed(2)}
            </div>
            <div className="text-xs text-slate-500">confianza</div>
          </div>
        </div>
      ))}
    </div>
  );
}
