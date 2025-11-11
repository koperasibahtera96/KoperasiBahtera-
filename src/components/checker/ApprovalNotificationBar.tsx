"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, CheckCircle, Clock, Leaf } from "lucide-react";
import Link from "next/link";

interface PendingPlant {
  plantId: string;
  plantName: string;
  plantType: string;
  location: string;
  pendingCount: number;
  latestPending: {
    type: string;
    date: string;
    addedBy: string;
    addedAt: string;
  };
}

interface ApprovalNotificationBarProps {
  userRole: "asisten" | "manajer" | "mandor";
}

export default function ApprovalNotificationBar({
  userRole,
}: ApprovalNotificationBarProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [plantsWithPending, setPlantsWithPending] = useState<PendingPlant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingSummary();
    // Refresh every 30 seconds
    const interval = setInterval(fetchPendingSummary, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchPendingSummary = async () => {
    try {
      const response = await fetch("/api/plant-history/pending-summary");
      if (response.ok) {
        const data = await response.json();
        setPlantsWithPending(data.plants || []);
      }
    } catch (error) {
      console.error("Error fetching pending summary:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    // dateString is in format DD/MM/YYYY
    const [day, month, year] = dateString.split("/");
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const totalPending = plantsWithPending.reduce(
    (sum, plant) => sum + plant.pendingCount,
    0
  );

  if (loading || plantsWithPending.length === 0) {
    return null;
  }

  const isRejectionMode = userRole === "mandor";
  const borderColor = isRejectionMode ? "border-red-200" : "border-amber-200";
  const bgColor = isRejectionMode ? "bg-red-50" : "bg-amber-50";
  const textColor = isRejectionMode ? "text-red-600" : "text-amber-600";
  const badgeBg = isRejectionMode ? "bg-red-100" : "bg-amber-100";
  const badgeText = isRejectionMode ? "text-red-700" : "text-amber-700";

  return (
    <motion.div
      className="mb-6 relative"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
    >
      {/* Compact Header Banner */}
      <div
        className={`bg-white/90 backdrop-blur-md border ${borderColor} rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer`}
        onClick={() => setShowNotifications(!showNotifications)}
      >
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`relative p-2 ${bgColor} rounded-lg`}>
                <Bell className={`w-4 h-4 ${textColor} animate-pulse`} />
                {totalPending > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {totalPending > 9 ? "9+" : totalPending}
                  </span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {userRole === "asisten"
                      ? "Persetujuan dari Mandor"
                      : userRole === "mandor"
                      ? "Riwayat Ditolak oleh Asisten"
                      : "Persetujuan dari Asisten"}
                  </h3>
                  <span className={`px-2 py-0.5 text-xs font-medium ${badgeBg} ${badgeText} rounded-full`}>
                    {plantsWithPending.length} tanaman
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-0.5">
                  {userRole === "mandor"
                    ? `Total ${totalPending} riwayat ditolak`
                    : `Total ${totalPending} riwayat menunggu persetujuan`}
                </p>
              </div>
            </div>
            <motion.div
              animate={{ rotate: showNotifications ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Expandable Details Dropdown */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div
            className="mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="max-h-[400px] overflow-y-auto">
              <div className="divide-y divide-gray-100">
                {plantsWithPending.map((plant, index) => (
                  <motion.div
                    key={plant.plantId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.2 }}
                  >
                    <Link href={`/checker/plant/${plant.plantId}`}>
                      <div className={`p-3 ${isRejectionMode ? "hover:bg-red-50/50" : "hover:bg-amber-50/50"} transition-colors cursor-pointer`}>
                        <div className="flex items-start gap-3">
                          {/* Icon/Avatar */}
                          <div className={`flex-shrink-0 w-10 h-10 bg-gradient-to-br ${isRejectionMode ? "from-red-100 to-rose-100" : "from-green-100 to-emerald-100"} rounded-full flex items-center justify-center`}>
                            <Leaf className={`w-5 h-5 ${isRejectionMode ? "text-red-600" : "text-green-600"}`} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div>
                                <p className="text-sm font-semibold text-gray-900 truncate">
                                  {plant.plantName}
                                </p>
                                <p className="text-xs text-gray-600">
                                  {plant.location} • {plant.plantType}
                                </p>
                              </div>
                              <span className={`flex-shrink-0 px-2 py-1 text-xs font-semibold ${badgeBg} ${badgeText} rounded-full flex items-center gap-1`}>
                                <Clock className="w-3 h-3" />
                                {plant.pendingCount}
                              </span>
                            </div>

                            <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                              <p className="text-xs text-gray-600 mb-1">
                                {isRejectionMode ? "Riwayat yang ditolak:" : "Riwayat terbaru:"}
                              </p>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                                  {plant.latestPending.type}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {plant.latestPending.date}
                                </span>
                                <span className="text-gray-300">•</span>
                                <span className="text-xs text-gray-600">
                                  oleh {plant.latestPending.addedBy}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {isRejectionMode ? "Ditolak pada:" : "Ditambahkan:"} {formatDate(plant.latestPending.addedAt)}
                              </p>
                            </div>

                            <div className="mt-2 flex items-center gap-2">
                              <CheckCircle className={`w-3 h-3 ${isRejectionMode ? "text-red-600" : "text-green-600"}`} />
                              <span className={`text-xs ${isRejectionMode ? "text-red-600" : "text-green-600"} font-medium`}>
                                {isRejectionMode ? "Klik untuk melihat dan memperbaiki" : "Klik untuk melihat dan menyetujui"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Footer Summary */}
            <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  Total {plantsWithPending.length} tanaman memerlukan perhatian
                </span>
                <span className={`font-semibold ${isRejectionMode ? "text-red-700" : "text-amber-700"}`}>
                  {totalPending} {isRejectionMode ? "riwayat ditolak" : "riwayat tertunda"}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
