"use client";

import { Camera, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

type Tab = "cameras" | "today" | "review";

interface HeaderProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  lastRefresh: Date | null;
  currentDate: string;
}

export default function Header({
  activeTab,
  onTabChange,
  lastRefresh,
  currentDate,
}: HeaderProps) {
  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "cameras", label: "Cámaras", icon: "📷" },
    { id: "today", label: "Hoy", icon: "📋" },
    { id: "review", label: "Revisar", icon: "👁️" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-slate-950/95 backdrop-blur-sm px-4 sm:px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
            <Camera size={18} />
          </div>
          <span className="font-bold text-slate-100 hidden sm:inline">
            Adyac
          </span>
        </div>

        {/* Tabs */}
        <nav className="flex gap-1 bg-slate-900/50 p-1 rounded-lg border border-white/5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white shadow-lg"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span className="sm:hidden">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Right side: Date & Last refresh */}
        <div className="flex items-center gap-3 flex-shrink-0 text-right">
          <div className="hidden sm:block">
            <div className="text-xs text-slate-500">{currentDate}</div>
            {lastRefresh && (
              <div className="text-xs text-slate-500 flex items-center gap-1 justify-end">
                <Clock size={12} />
                hace{" "}
                {formatDistanceToNow(lastRefresh, {
                  locale: es,
                  addSuffix: false,
                })}
              </div>
            )}
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
        </div>
      </div>
    </header>
  );
}
