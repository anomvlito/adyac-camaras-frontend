"use client";

import { useRef, useState } from "react";
import { format } from "date-fns";
import { AlertTriangle, Calendar, CheckCircle2, HelpCircle, Upload } from "lucide-react";
import { PhotoThumb } from "@/components/parking/ParkingFeed";
import { API, apiFetch } from "@/lib/auth";
import { reconciliationRows } from "@/lib/reconciliation";
import type { ReconcileResult, ReconciliationTab } from "@/lib/types";

export default function Reconciliacion() {
  const [date, setDate]           = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [result, setResult]       = useState<ReconcileResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [detailTab, setDetailTab] = useState<ReconciliationTab>("camera_only");
  const [lastImport, setLastImport] = useState<{ id: number; filename: string } | null>(null);
  const [dragOver, setDragOver]   = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const r = await apiFetch(`${API}/api/excel/upload`, { method: "POST", body: fd });
      if (!r.ok) { alert((await r.json()).detail); return; }
      const data = await r.json();
      setLastImport({ id: data.import_id, filename: data.filename });
      if (data.date_from) setDate(data.date_from);
    } finally { setUploading(false); }
  };

  const reconcile = async () => {
    setReconciling(true);
    try {
      const p = new URLSearchParams({ date });
      if (lastImport) p.set("import_id", String(lastImport.id));
      const r = await apiFetch(`${API}/api/excel/reconcile?${p}`);
      if (r.ok) setResult(await r.json());
    } finally { setReconciling(false); }
  };

  const s = result?.summary;

  return (
    <div className="space-y-5">
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) uploadFile(f); }}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 lg:p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors
          ${dragOver ? "border-indigo-400 bg-indigo-50" : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50"}`}
      >
        <Upload size={32} className={uploading ? "animate-bounce text-indigo-500" : "text-slate-400"} />
        <div className="text-center">
          <p className="font-semibold text-slate-600">
            {uploading ? "Subiendo..." : "Arrastrá el Excel aquí o hacé click"}
          </p>
          {lastImport
            ? <p className="text-sm text-indigo-600 mt-1 font-semibold">✓ {lastImport.filename}</p>
            : <p className="text-sm text-slate-400 mt-1">ventas_DD-MM-YYYY HH_MM_SS.xlsx</p>
          }
        </div>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); }} />
      </div>

      <div className="flex gap-3">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2.5 flex-1">
          <Calendar size={15} className="text-slate-400 shrink-0" />
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="text-sm font-semibold text-slate-700 outline-none bg-transparent w-full" />
        </div>
        <button onClick={reconcile} disabled={reconciling || uploading}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold px-6 rounded-xl text-sm transition-colors">
          {reconciling ? "Comparando..." : "Comparar"}
        </button>
      </div>

      {s && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 lg:gap-4">
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 lg:p-5">
              <p className="text-[10px] lg:text-xs font-bold text-rose-500 uppercase tracking-widest">Solo cámara</p>
              <p className="text-2xl lg:text-4xl font-black text-rose-600 mt-1">{s.camera_only}</p>
              <p className="text-[10px] lg:text-xs text-rose-400 mt-1 hidden sm:block">operador no registró</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 lg:p-5">
              <p className="text-[10px] lg:text-xs font-bold text-emerald-600 uppercase tracking-widest">Coinciden</p>
              <p className="text-2xl lg:text-4xl font-black text-emerald-700 mt-1">{s.matched}</p>
              <p className="text-[10px] lg:text-xs text-emerald-500 mt-1 hidden sm:block">${s.excel_revenue.toLocaleString("es-CL")}</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 lg:p-5">
              <p className="text-[10px] lg:text-xs font-bold text-amber-600 uppercase tracking-widest">Solo Excel</p>
              <p className="text-2xl lg:text-4xl font-black text-amber-700 mt-1">{s.excel_only}</p>
              <p className="text-[10px] lg:text-xs text-amber-500 mt-1 hidden sm:block">cámara no detectó</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="flex border-b border-slate-100">
              {([
                ["camera_only", "🔴 Solo cámara", "🔴"],
                ["matched",     "✅ Coinciden",   "✅"],
                ["excel_only",  "🟡 Solo Excel",  "🟡"],
              ] as const).map(([t, label, icon]) => (
                <button key={t} onClick={() => setDetailTab(t)}
                  className={`flex-1 py-3 lg:py-4 text-xs lg:text-sm font-bold transition-colors ${detailTab === t ? "bg-slate-50 text-slate-900 border-b-2 border-indigo-500" : "text-slate-400 hover:text-slate-600"}`}>
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden">{icon}</span>
                </button>
              ))}
            </div>

            <div className="divide-y divide-slate-50 max-h-[480px] lg:max-h-[560px] overflow-y-auto">
              {detailTab === "camera_only" && result!.camera_only.map((r, i) => (
                <div key={i} className="flex items-center gap-3 lg:gap-4 px-4 lg:px-5 py-3 lg:py-4">
                  <PhotoThumb url={r.image_url} plate={r.plate} size="lg" />
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-900 tracking-widest text-base lg:text-xl font-mono">{r.plate}</p>
                    <p className="text-sm text-slate-400">{r.camera_time} · {(r.confidence * 100).toFixed(0)}% conf</p>
                  </div>
                  <AlertTriangle size={18} className="text-rose-400 shrink-0" />
                </div>
              ))}

              {detailTab === "matched" && result!.matched.map((r, i) => (
                <div key={i} className="flex items-center gap-3 lg:gap-4 px-4 lg:px-5 py-3 lg:py-4">
                  <PhotoThumb url={r.image_url} plate={r.plate} size="lg" />
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-900 tracking-widest text-base lg:text-xl font-mono">{r.plate}</p>
                    <p className="text-sm text-slate-400">
                      cámara {r.camera_time} · Excel {r.excel_ingreso} · Δ{r.diff_minutes}min · {r.operador}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-emerald-600 lg:text-lg">${r.valor.toLocaleString("es-CL")}</p>
                    <CheckCircle2 size={14} className="text-emerald-400 ml-auto mt-0.5" />
                  </div>
                </div>
              ))}

              {detailTab === "excel_only" && result!.excel_only.map((r, i) => (
                <div key={i} className="flex items-center gap-3 lg:gap-4 px-4 lg:px-5 py-3 lg:py-4">
                  <div className="w-20 h-14 lg:w-24 lg:h-16 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                    <HelpCircle size={20} className="text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-900 tracking-widest text-base lg:text-xl font-mono">{r.plate}</p>
                    <p className="text-sm text-slate-400">{r.excel_ingreso} → {r.excel_salida ?? "?"} · {r.operador}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-amber-600 lg:text-lg">${r.valor.toLocaleString("es-CL")}</p>
                    <p className={`text-xs mt-0.5 ${r.estado === "Pagado" ? "text-emerald-500" : "text-rose-500"}`}>{r.estado}</p>
                  </div>
                </div>
              ))}

              {reconciliationRows(result!, detailTab).length === 0 && (
                <p className="text-center text-slate-400 py-12">Sin registros en esta categoría</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
