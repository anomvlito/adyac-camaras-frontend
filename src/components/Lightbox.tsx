"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { MonitorImage } from "@/lib/types";

interface LightboxProps {
  image: MonitorImage | null;
  onClose: () => void;
  metadata?: {
    strategy?: string;
    confidence?: number;
  };
}

export default function Lightbox({ image, onClose, metadata }: LightboxProps) {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  if (!image) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 p-2 text-white/60 hover:text-white transition-colors z-10"
          title="Cerrar (ESC)"
        >
          <X size={24} />
        </button>

        {/* Image */}
        <div className="flex-1 flex items-center justify-center bg-slate-950 rounded-lg overflow-hidden border border-white/10">
          {imageError ? (
            <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
              <div className="text-4xl opacity-20">🖼️</div>
              <span className="text-sm">No se pudo cargar la imagen</span>
            </div>
          ) : (
            <img
              src={image.url}
              alt={image.plate || "Sin detectar"}
              className="w-full h-full object-contain"
              onError={() => setImageError(true)}
            />
          )}
        </div>

        {/* Metadata */}
        <div className="mt-4 p-4 bg-slate-900/50 rounded-lg border border-white/5 space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-slate-500 uppercase mb-1">
                Patente
              </div>
              <div className="font-mono font-bold text-slate-100 text-lg">
                {image.plate || "—"}
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-500 uppercase mb-1">Hora</div>
              <div className="font-mono font-bold text-slate-100 text-lg">
                {image.time}
              </div>
            </div>

            {metadata?.strategy && (
              <div>
                <div className="text-xs text-slate-500 uppercase mb-1">
                  Estrategia
                </div>
                <div className="text-sm text-slate-300">{metadata.strategy}</div>
              </div>
            )}

            {metadata?.confidence !== undefined && (
              <div>
                <div className="text-xs text-slate-500 uppercase mb-1">
                  Confianza
                </div>
                <div className="text-sm text-slate-300">
                  {(metadata.confidence * 100).toFixed(1)}%
                </div>
              </div>
            )}
          </div>

          {image.tag === "dup" && (
            <div className="px-3 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded text-yellow-400 text-sm font-semibold">
              ⚠️ Duplicada: misma patente detectada dentro de 2 minutos
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
