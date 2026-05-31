"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { getPreviousDate, getNextDate, getTodaysDate } from "@/lib/api";

interface DateNavProps {
  date: string;
  onDateChange: (date: string) => void;
  count: number;
  label: string;
}

export default function DateNav({
  date,
  onDateChange,
  count,
  label,
}: DateNavProps) {
  const today = getTodaysDate();
  const canGoNext = date < today;

  return (
    <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
      <div className="text-sm text-slate-400">
        <span className="font-semibold text-slate-100">{count}</span> {label}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onDateChange(getPreviousDate(date))}
          className="p-1.5 hover:bg-slate-900 rounded-lg border border-white/5 transition-colors text-slate-400 hover:text-slate-100"
          title="Día anterior"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="px-4 py-1.5 bg-slate-900/50 rounded-lg border border-white/5 min-w-[120px] text-center">
          <span className="text-sm font-mono text-slate-100">{date}</span>
        </div>

        <button
          onClick={() => onDateChange(getNextDate(date))}
          disabled={!canGoNext}
          className={`p-1.5 rounded-lg border border-white/5 transition-colors ${
            canGoNext
              ? "hover:bg-slate-900 text-slate-400 hover:text-slate-100"
              : "text-slate-700 cursor-not-allowed"
          }`}
          title={canGoNext ? "Día siguiente" : "No puedes ir al futuro"}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
