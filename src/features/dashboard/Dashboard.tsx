"use client";

import { RefreshCw } from "lucide-react";
import { FeedRow } from "@/components/parking/ParkingFeed";
import type { HistoryEntry } from "@/lib/types";

export default function Dashboard({ history, loading, onPlateSaved, parked }: {
  history: HistoryEntry[]; loading: boolean; onPlateSaved: () => void; parked: Set<string>;
}) {
  return (
    <div className="space-y-5">
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
  );
}
