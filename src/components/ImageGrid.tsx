"use client";

import { MonitorImage, ReviewImage } from "@/lib/types";
import ImageCard from "./ImageCard";

interface ImageGridProps {
  images: (MonitorImage | ReviewImage)[];
  onImageClick: (image: MonitorImage | ReviewImage) => void;
  emptyMessage: string;
  reviewMode?: boolean;
}

export default function ImageGrid({
  images,
  onImageClick,
  emptyMessage,
  reviewMode = false,
}: ImageGridProps) {
  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500">
        <div className="text-5xl mb-4 opacity-20">📷</div>
        <p className="text-sm font-medium">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {images.map((image, idx) => {
        const isReviewImage = "reason" in image;
        const isVideo =
          reviewMode &&
          isReviewImage &&
          (image as ReviewImage).reason === "VACIA";

        return (
          <ImageCard
            key={`${image.filename}-${idx}`}
            image={image}
            onImageClick={onImageClick}
            showPlaceholder={isVideo}
          />
        );
      })}
    </div>
  );
}
