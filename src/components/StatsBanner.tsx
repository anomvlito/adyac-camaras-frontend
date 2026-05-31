"use client";

import { StatsData } from "@/lib/types";

interface StatsBannerProps {
  stats: StatsData;
}

export default function StatsBanner({ stats }: StatsBannerProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
      <div className="p-4 rounded-lg border border-white/5 bg-slate-900/30">
        <div className="text-xs text-slate-500 uppercase mb-2 font-semibold">
          Ingresos
        </div>
        <div className="text-2xl sm:text-3xl font-black text-indigo-400 tabular-nums">
          ${stats.today_income.toLocaleString()}
        </div>
      </div>

      <div className="p-4 rounded-lg border border-white/5 bg-slate-900/30">
        <div className="text-xs text-slate-500 uppercase mb-2 font-semibold">
          Entradas
        </div>
        <div className="text-2xl sm:text-3xl font-black text-emerald-400 tabular-nums">
          {stats.today_entries}
        </div>
      </div>

      <div className="p-4 rounded-lg border border-white/5 bg-slate-900/30">
        <div className="text-xs text-slate-500 uppercase mb-2 font-semibold">
          Salidas
        </div>
        <div className="text-2xl sm:text-3xl font-black text-slate-300 tabular-nums">
          {stats.today_exits}
        </div>
      </div>

      <div className="p-4 rounded-lg border border-white/5 bg-slate-900/30">
        <div className="text-xs text-slate-500 uppercase mb-2 font-semibold">
          En patio
        </div>
        <div className="text-2xl sm:text-3xl font-black text-slate-300 tabular-nums">
          {stats.parked_now}
        </div>
      </div>
    </div>
  );
}
