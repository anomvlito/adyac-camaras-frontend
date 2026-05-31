"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import DateNav from "@/components/DateNav";
import ImageGrid from "@/components/ImageGrid";
import Lightbox from "@/components/Lightbox";
import TodayList from "@/components/TodayList";
import StatsBanner from "@/components/StatsBanner";
import {
  getMonitorImages,
  getReviewImages,
  getHistory,
  getStats,
  getFtpEvents,
  getTodaysDate,
} from "@/lib/api";
import {
  MonitorImage,
  ReviewImage,
  HistoryEntry,
  StatsData,
  FtpEvent,
} from "@/lib/types";

type Tab = "cameras" | "today" | "review";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>("cameras");
  const [date, setDate] = useState(getTodaysDate());
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Tab state: Cameras
  const [cameraImages, setCameraImages] = useState<MonitorImage[]>([]);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Tab state: Review
  const [reviewImages, setReviewImages] = useState<ReviewImage[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Tab state: Today
  const [stats, setStats] = useState<StatsData>({
    today_income: 0,
    today_entries: 0,
    today_exits: 0,
    parked_now: 0,
  });
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [todayLoading, setTodayLoading] = useState(false);
  const [todayError, setTodayError] = useState<string | null>(null);

  // Lightbox
  const [selectedImage, setSelectedImage] = useState<MonitorImage | ReviewImage | null>(null);
  const [ftpEvents, setFtpEvents] = useState<FtpEvent[]>([]);

  // Fetch cameras
  const fetchCameraImages = useCallback(async (selectedDate: string) => {
    setCameraLoading(true);
    setCameraError(null);
    try {
      const data = await getMonitorImages(selectedDate);
      setCameraImages(data.images);
    } catch {
      setCameraError("No se pudieron cargar las imágenes");
      setCameraImages([]);
    } finally {
      setCameraLoading(false);
    }
  }, []);

  // Fetch review
  const fetchReviewImages = useCallback(async (selectedDate: string) => {
    setReviewLoading(true);
    setReviewError(null);
    try {
      const data = await getReviewImages(selectedDate);
      setReviewImages(data.images);
    } catch {
      setReviewError("No se pudieron cargar las imágenes para revisar");
      setReviewImages([]);
    } finally {
      setReviewLoading(false);
    }
  }, []);

  // Fetch today data
  const fetchTodayData = useCallback(async () => {
    setTodayLoading(true);
    setTodayError(null);
    try {
      const [statsData, historyData, eventsData] = await Promise.all([
        getStats(),
        getHistory(),
        getFtpEvents(),
      ]);
      setStats(statsData);
      setHistory(historyData);
      setFtpEvents(eventsData.events);
    } catch {
      setTodayError("No se pudieron cargar los datos");
    } finally {
      setTodayLoading(false);
    }
  }, []);

  // Fetch based on active tab
  const fetchData = useCallback(
    async (selectedDate: string) => {
      setLastRefresh(new Date());

      if (activeTab === "cameras") {
        await fetchCameraImages(selectedDate);
      } else if (activeTab === "review") {
        await fetchReviewImages(selectedDate);
      } else if (activeTab === "today") {
        await fetchTodayData();
      }
    },
    [activeTab, fetchCameraImages, fetchReviewImages, fetchTodayData]
  );

  // Initial load
  useEffect(() => {
    fetchData(date);
  }, []);

  // Refetch when tab or date changes
  useEffect(() => {
    fetchData(date);
  }, [activeTab, date, fetchData]);

  // Auto-refresh every 15 seconds when tab is visible
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchData(date);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [date, fetchData]);

  // Get metadata for lightbox
  const getImageMetadata = (image: MonitorImage | ReviewImage) => {
    if ("plate" in image && image.plate) {
      const event = ftpEvents.find(
        (e) =>
          e.plate === image.plate &&
          e.timestamp.includes(image.date.split("-").join("-"))
      );
      return {
        strategy: event?.strategy,
        confidence: event?.confidence,
      };
    }
    return {};
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header
        activeTab={activeTab}
        onTabChange={handleTabChange}
        lastRefresh={lastRefresh}
        currentDate={date}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Cameras Tab */}
        {activeTab === "cameras" && (
          <div className="space-y-6 animate-in fade-in">
            <DateNav
              date={date}
              onDateChange={setDate}
              count={cameraImages.length}
              label={
                cameraImages.length === 1
                  ? "detección"
                  : "detecciones"
              }
            />

            {cameraError && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {cameraError}
              </div>
            )}

            {cameraLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
              </div>
            ) : (
              <ImageGrid
                images={cameraImages}
                onImageClick={setSelectedImage}
                emptyMessage="Sin detecciones hoy"
              />
            )}
          </div>
        )}

        {/* Today Tab */}
        {activeTab === "today" && (
          <div className="space-y-6 animate-in fade-in">
            {todayError && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {todayError}
              </div>
            )}

            {todayLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
              </div>
            ) : (
              <>
                <StatsBanner stats={stats} />

                <div>
                  <h2 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wide">
                    Ultimos movimientos
                  </h2>
                  <TodayList entries={history} />
                </div>
              </>
            )}
          </div>
        )}

        {/* Review Tab */}
        {activeTab === "review" && (
          <div className="space-y-6 animate-in fade-in">
            <DateNav
              date={date}
              onDateChange={setDate}
              count={reviewImages.length}
              label={
                reviewImages.length === 1
                  ? "imagen sin detectar"
                  : "imágenes sin detectar"
              }
            />

            {reviewError && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {reviewError}
              </div>
            )}

            {reviewLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
              </div>
            ) : (
              <ImageGrid
                images={reviewImages}
                onImageClick={setSelectedImage}
                emptyMessage="Todas las imágenes fueron procesadas correctamente"
                reviewMode={true}
              />
            )}
          </div>
        )}
      </main>

      {/* Lightbox */}
      {selectedImage && (
        <Lightbox
          image={selectedImage as MonitorImage}
          onClose={() => setSelectedImage(null)}
          metadata={getImageMetadata(selectedImage)}
        />
      )}
    </div>
  );
}
