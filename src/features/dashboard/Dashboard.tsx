"use client";

import { RefreshCw } from "lucide-react";
import { FeedRow, StatCard } from "@/components/parking/ParkingFeed";
import type { HistoryEntry, Stats } from "@/lib/types";

export default function Dashboard({ stats, history, loading, onPlateSaved, parked }: {
  stats: Stats; history: HistoryEntry[]; loading: boolean; onPlateSaved: () => void; parked: Set<string>;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-5 lg:space-y-0 lg:grid lg:grid-cols-[300px_1fr] lg:gap-6">

        {/* Left: stats */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Entradas hoy"  value={stats.today_entries} accent="text-emerald-600" />
            <StatCard label="Salidas hoy"   value={stats.today_exits}   accent="text-rose-600" />
            <StatCard label="En parking"    value={stats.parked_now}    accent="text-indigo-600" />
            <StatCard label="Recaudado"
              value={`$${stats.today_income.toLocaleString("es-CL")}`} accent="text-amber-600" />
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 hidden lg:block">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Estado</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Cámara</span>
                <span className="font-bold text-emerald-600">● Activa</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Staging</span>
                <span className="font-bold text-emerald-600">● Activo</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Actualización</span>
                <span className="font-bold text-slate-400">cada 15s</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: feed */}
        <div className="bg-white rounded-2xl border border-slate-200 lg:overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <h2 className="font-bold text-slate-700">Feed en vivo</h2>
            {loading && <RefreshCw size={15} className="animate-spin text-slate-400" />}
          </div>
          <div className="divide-y divide-slate-50 lg:max-h-[calc(100vh-220px)] lg:overflow-y-auto">
            {history.slice(0, 50).map((r) => (
              <FeedRow
                key={r.session_id != null ? `${r.session_id}-${r.action}` : `sight-${r.plate}-${r.timestamp}`}
                r={r} onPlateSaved={onPlateSaved} parked={parked} />
            ))}
            {history.length === 0 && !loading && (
              <p className="text-center text-slate-400 py-16">Sin actividad registrada</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
