"use client";

import { useState } from "react";
import { Car, Eye, EyeOff, LogIn, User } from "lucide-react";
import { API, setAuth } from "@/lib/auth";
import type { AuthState } from "@/lib/types";

export default function LoginPage({ onLogin }: { onLogin: (auth: AuthState) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const r = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!r.ok) { setError("Usuario o contraseña incorrectos"); return; }
      const data = await r.json();
      const auth = { token: data.access_token, username: data.username, role: data.role };
      setAuth(auth);
      onLogin(auth);
    } catch { setError("Error de conexión con el servidor"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm p-8">
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="bg-indigo-600 rounded-2xl p-3">
            <Car size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">CentralParking</h1>
          <p className="text-sm text-slate-400">Ingresá con tu cuenta</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="username" className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">
              Usuario
            </label>
            <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2.5 focus-within:border-indigo-400 transition-colors">
              <User size={16} className="text-slate-400 shrink-0" />
              <input
                id="username"
                type="text" value={username} onChange={e => setUsername(e.target.value)}
                placeholder="admin" autoComplete="username" required
                className="flex-1 outline-none text-sm font-semibold text-slate-800 bg-transparent placeholder:text-slate-300"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">
              Contraseña
            </label>
            <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2.5 focus-within:border-indigo-400 transition-colors">
              <LogIn size={16} className="text-slate-400 shrink-0" />
              <input
                id="password"
                type={showPw ? "text" : "password"} value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" autoComplete="current-password" required
                className="flex-1 outline-none text-sm font-semibold text-slate-800 bg-transparent placeholder:text-slate-300"
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="text-slate-300 hover:text-slate-500">
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-rose-500 font-semibold text-center">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-black py-3 rounded-xl transition-colors text-sm">
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}
