"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { apiFetch } from "@/lib/auth";
import { Trash2, Plus, ShieldAlert } from "lucide-react";

type Exclusion = {
  normalized_plate: string;
  max_distance: number;
  active: boolean;
  created_at: string;
  created_by: string;
};

export default function AbonadosView() {
  const [exclusions, setExclusions] = useState<Exclusion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newPlate, setNewPlate] = useState("");

  const loadExclusions = async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/api/plate-exclusions");
      setExclusions(data || []);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al cargar abonados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExclusions();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPlate.trim().length !== 6) {
      alert("La patente debe tener 6 caracteres");
      return;
    }
    try {
      await apiFetch("/api/plate-exclusions", {
        method: "POST",
        body: JSON.stringify({ plate: newPlate.toUpperCase(), max_distance: 2 }),
      });
      setNewPlate("");
      loadExclusions();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al agregar abonado");
    }
  };

  const handleDelete = async (plate: string) => {
    if (!confirm(`¿Seguro que deseas eliminar la patente ${plate}?`)) return;
    try {
      await apiFetch(`/api/plate-exclusions/${plate}`, { method: "DELETE" });
      loadExclusions();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al eliminar abonado");
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <ShieldAlert className="text-indigo-600" size={24} />
        <div>
          <h2 className="text-xl font-black text-slate-800">Abonados (Excepciones)</h2>
          <p className="text-sm text-slate-500">Estas patentes se ignorarán automáticamente en el flujo regular.</p>
        </div>
      </div>

      <form onSubmit={handleAdd} className="flex gap-2 mb-8">
        <input
          type="text"
          value={newPlate}
          onChange={(e) => setNewPlate(e.target.value.toUpperCase())}
          placeholder="Ej: AB1234"
          maxLength={6}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-1 max-w-xs uppercase font-mono"
        />
        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors"
        >
          <Plus size={18} /> Agregar
        </button>
      </form>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-100">
              <th className="py-3 px-4 font-semibold text-slate-500">Patente</th>
              <th className="py-3 px-4 font-semibold text-slate-500">Agregado el</th>
              <th className="py-3 px-4 font-semibold text-slate-500">Por</th>
              <th className="py-3 px-4 font-semibold text-slate-500 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="py-4 text-center text-slate-500">Cargando...</td></tr>
            ) : exclusions.length === 0 ? (
              <tr><td colSpan={4} className="py-4 text-center text-slate-500">No hay abonados registrados.</td></tr>
            ) : (
              exclusions.map((exc) => (
                <tr key={exc.normalized_plate} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono font-bold text-slate-700">{exc.normalized_plate}</td>
                  <td className="py-3 px-4 text-sm text-slate-500">
                    {format(new Date(exc.created_at), "dd/MM/yyyy HH:mm")}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-500">{exc.created_by}</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleDelete(exc.normalized_plate)}
                      className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
