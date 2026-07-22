"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Car, LogOut } from "lucide-react";
import LoginPage from "@/features/auth/LoginPage";
import Dashboard from "@/features/dashboard/Dashboard";
import HistoryView from "@/features/history/HistoryView";
import ReconciliationView from "@/features/reconciliation/ReconciliationView";
import { API, AUTH_EXPIRED_EVENT, apiFetch, getAuth, setAuth } from "@/lib/auth";
import { DASHBOARD_REFRESH_MS } from "@/lib/constants";
import { mergeFeedEntries } from "@/lib/feed";
import type { AuthState, HistoryEntry, Sighting, Stats } from "@/lib/types";

export default function App() {
  const [auth, setAuthState]  = useState<AuthState>(null);
  const [tab, setTab]         = useState<"dashboard" | "historial" | "reconciliacion">("dashboard");
  const [stats, setStats]     = useState<Stats>({ today_income: 0, today_entries: 0, today_exits: 0, parked_now: 0 });
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [parked, setParked]   = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const today = format(new Date(), "d 'de' MMMM yyyy", { locale: es });

  // Hydrate auth and recover cleanly when the backend rejects an expired token.
  useEffect(() => {
    setAuthState(getAuth());
    const expired = () => {
      setAuthState(null);
      window.alert("Tu sesión expiró. Ingresa nuevamente para continuar.");
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, expired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, expired);
  }, []);

  const refresh = useCallback(async () => {
    if (!getAuth()) return;
    setLoading(true);
    try {
      const ts = Date.now();
      const [s, h, sg, c] = await Promise.all([
        apiFetch(`${API}/api/stats?t=${ts}`),
        apiFetch(`${API}/api/history?t=${ts}&limit=50`),
        apiFetch(`${API}/api/sightings?t=${ts}&limit=100`),
        apiFetch(`${API}/api/cars?t=${ts}`),
      ]);
      if (s.ok) setStats(await s.json());
      // El feed en vivo mezcla sesiones reales (entrada/salida) con
      // avistamientos que la cámara detectó pero que todavía no tienen
      // sesión asociada (ver sightingToEntry) — ambos, ordenados por hora.
      const historyEntries: HistoryEntry[] = h.ok ? await h.json() : [];
      const sightings: Sighting[] = sg.ok ? (await sg.json()).sightings : [];
      setHistory(mergeFeedEntries(historyEntries, sightings));
      if (c.ok) setParked(new Set(Object.keys(await c.json())));
      if (s.status === 401 || h.status === 401) { setAuth(null); setAuthState(null); }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!auth) return;
    refresh();
    const id = setInterval(refresh, DASHBOARD_REFRESH_MS);
    return () => clearInterval(id);
  }, [auth, refresh]);

  const logout = () => { setAuth(null); setAuthState(null); };
  const handleLogin = (a: AuthState) => { setAuthState(a); };

  if (!auth) return <LoginPage onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3 flex items-center gap-2 lg:gap-4">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="bg-indigo-600 rounded-xl p-1.5 lg:p-2">
              <Car size={18} className="text-white lg:hidden" />
              <Car size={22} className="text-white hidden lg:block" />
            </div>
            <span className="hidden sm:inline font-black text-slate-900 text-base lg:text-lg">CentralParking</span>
          </div>
          <p className="text-sm text-slate-400 hidden lg:block capitalize flex-1">{today}</p>
          <nav className="ml-auto flex gap-1 lg:gap-2">
            {([
              ["dashboard",      "Dashboard"],
              ["historial",      "Historial"],
              ["reconciliacion", "Excel"],
            ] as const).map(([t, label]) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-2 sm:px-3 lg:px-4 py-1.5 lg:py-2 rounded-lg text-xs lg:text-sm font-bold transition-colors ${tab === t ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-100"}`}>
                {label}
              </button>
            ))}
          </nav>
          <button onClick={logout} title="Cerrar sesión"
            className="ml-2 p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-5 lg:py-8">
        {tab === "dashboard"      && <Dashboard history={history} loading={loading} onPlateSaved={refresh} parked={parked} />}
        {tab === "historial"      && <HistoryView />}
        {tab === "reconciliacion" && <ReconciliationView />}
      </main>
    </div>
  );
}
