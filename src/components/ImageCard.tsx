"use client";

import { useState } from "react";
import Image from "next/image";
import { MonitorImage, ReviewImage } from "@/lib/types";

interface ImageCardProps {
  image: MonitorImage | ReviewImage;
  onImageClick?: (image: MonitorImage | ReviewImage) => void;
  showPlaceholder?: boolean;
}

export default function ImageCard({
  image,
  onImageClick,
  showPlaceholder = false,
}: ImageCardProps) {
  const [imageError, setImageError] = useState(false);
  const isReviewImage = "reason" in image;

  const handleClick = () => {
    if (!showPlaceholder && onImageClick) {
      onImageClick(image);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`rounded-lg border border-white/10 overflow-hidden transition-all hover:shadow-lg ${
        !showPlaceholder ? "cursor-pointer hover:scale-105" : ""
      } bg-slate-900/50`}
    >
      {/* Image Container */}
      <div className="aspect-video bg-slate-950 relative overflow-hidden">
        {showPlaceholder || imageError ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-500">
            <div className="text-3xl opacity-20">📹</div>
            <span className="text-xs">
              {isReviewImage && (image as ReviewImage).reason === "VACIA"
                ? "Archivo vacío"
                : "Sin vista previa"}
            </span>
          </div>
        ) : (
          <img
            src={image.url}
            alt={image.plate || "Sin detectar"}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        )}
      </div>

      {/* Metadata */}
      <div className="p-3 space-y-2 border-t border-white/5">
        <div className="flex items-start justify-between gap-2">
          <div className="text-xs text-slate-500">{image.time}</div>
          {image.tag === "dup" && (
            <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-[10px] font-semibold">
              DUP
            </span>
          )}
        </div>

        <div className="text-sm font-mono font-bold text-slate-100 truncate">
          {image.plate || (
            <span className="text-slate-500">
              {isReviewImage
                ? (image as ReviewImage).reason === "VACIA"
                  ? "VACÍO"
                  : "NO DETECTADA"
                : "N/A"}
            </span>
          )}
        </div>

        {isReviewImage && (image as ReviewImage).reason && (
          <div className="text-[10px] text-orange-400/70 uppercase font-semibold">
            {(image as ReviewImage).reason}
          </div>
        )}
      </div>
    </div>
  );
}
