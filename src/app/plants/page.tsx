"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { formatDate, parseDateString } from "@/lib/utils/date";
import { coconut } from "@lucide/lab";
import { AnimatePresence, motion } from "framer-motion";
import jsPDF from "jspdf";
import {
  BarChart3,
  CheckCircle,
  Coins,
  Download,
  Icon,
  Leaf,
  Palmtree,
  Sprout,
  Trees,
} from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

interface PlantInstance {
  id: string;
  plantType: "gaharu" | "alpukat" | "jengkol" | "aren";
  instanceName: string;
  baseAnnualROI: number;
  location: string;
  kavling?: string;
  blok?: string;
  status: string;
  qrCode?: string;
  fotoGambar?: string;
  owner: string;
  contractNumber?: string;
  totalOperationalCosts: number;
  totalIncome: number;
  recentCosts: Array<{
    id: string;
    date: string;
    description: string;
    amount: number;
    addedBy: string;
  }>;
  recentIncome: Array<{
    id: string;
    date: string;
    description: string;
    amount: number;
    addedBy: string;
  }>;
  lastUpdate?: string;
  history: Array<{
    action: string;
    date: string;
    description: string;
    addedBy: string;
    imageUrl?: string;
  }>;
}

interface Investment {
  investmentId: string;
  productName: string;
  paymentType: "full" | "cicilan";
  status: "pending" | "active" | "completed" | "cancelled" | "approved";
  totalAmount: number;
  amountPaid: number;
  progress: number;
  investmentDate: string;
  completionDate?: string;
  nextPaymentInfo?: {
    installmentNumber: number;
    amount: number;
    dueDate: string;
  };
  contractInfo?: {
    contractId: string;
    adminApprovalStatus: string;
    currentAttempt: number;
    maxAttempts: number;
    paymentAllowed: boolean;
    paymentCompleted: boolean;
    isMaxRetryReached: boolean;
    isPermanentlyRejected: boolean;
  } | null;
  plantInstance: PlantInstance | null;
}

interface UserInvestmentData {
  userInfo: {
    name: string;
    email: string;
    phoneNumber: string;
  };
  totalInvestments: number;
  totalAmount: number;
  totalPaid: number;
  jumlahPohon: number;
  investments: Investment[];
}

const containerVariants: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants: any = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 20,
    },
  },
};

const cardVariants: any = {
  hidden: { scale: 0.9, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 120,
      damping: 20,
    },
  },
};

export default function InvestasiPage() {
  const [data, setData] = useState<UserInvestmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedInvestment, setSelectedInvestment] =
    useState<Investment | null>(null);
  const { status } = useSession();
  const { t } = useLanguage();
  // const router = useRouter();

  useEffect(() => {
    fetchInvestments();
  }, []);

  // Prevent background page scrolling (including horizontal) while modal is open.
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (selectedInvestment) {
      // Add Tailwind class to disable scrolling on the root element
      document.documentElement.classList.add("overflow-hidden");
      // Also disable touch scrolling on body for mobile devices
      document.body.style.touchAction = "none";
    } else {
      document.documentElement.classList.remove("overflow-hidden");
      document.body.style.touchAction = "";
    }

    // Cleanup when component unmounts
    return () => {
      document.documentElement.classList.remove("overflow-hidden");
      document.body.style.touchAction = "";
    };
  }, [selectedInvestment]);

  const fetchInvestments = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/investors/investments");
      if (response.ok) {
        const result = await response.json();

        console.log(result, "result");
        setData(result.data || null);
      } else {
        console.error("Failed to fetch investments");
      }
    } catch (error) {
      console.error("Error fetching investments:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "approved":
        return "bg-emerald-100 text-emerald-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return t("plants.status.active") || "Aktif";
      case "completed":
        return t("plants.status.completed") || "Selesai";
      case "pending":
        return t("plants.status.pending") || "Menunggu";
      case "cancelled":
        return t("plants.status.cancelled") || "Dibatalkan";
      case "approved":
        return t("plants.status.approved") || "Aktif";
      default:
        return t(`plants.status.${status}`) || status;
    }
  };

  const getPlantTypeIcon = (plantType: string) => {
    switch (plantType) {
      case "gaharu":
        return <Leaf className="w-full h-full" />;
      case "alpukat":
        return <Trees className="w-full h-full" />;
      case "jengkol":
        return <Sprout className="w-full h-full" />;
      case "aren":
        return <Palmtree className="w-full h-full" />;
      case "kelapa":
        return <Icon iconNode={coconut} className="w-full h-full" />;
      default:
        return <Trees className="w-full h-full" />;
    }
  };

  const getPlantTypeName = (plantType: string) => {
    switch (plantType) {
      case "gaharu":
        return "Gaharu";
      case "alpukat":
        return "Alpukat";
      case "jengkol":
        return "Jengkol";
      case "aren":
        return "Aren";
      case "kelapa":
        return "Kelapa";
      default:
        return plantType;
    }
  };

  const formatCurrency = (amount: number) => {
    if (typeof amount !== "number" || isNaN(amount)) {
      // amount is not a valid number
      return 0;
    }

    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // formatDate is now imported from date utility

  // Helper function to check if URL is a video
  const isVideoUrl = (url?: string) =>
    !!url && /\.(mp4|webm|mov|m4v|ogg)(\?|#|$)/i.test(url);

  const handleDownloadHistoryPDF = async (investment: any) => {
    if (!investment?.plantInstance) return;

    const plantData = investment.plantInstance;

    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let y = 20;

      // ===== HEADER (tetap)
      try {
        const logoResponse = await fetch("/images/koperasi-logo.jpg");
        const logoBlob = await logoResponse.blob();
        const logoReader = new FileReader();

        await new Promise<void>((resolve) => {
          logoReader.onload = () => {
            const logoData = logoReader.result as string;
            pdf.addImage(logoData, "JPEG", 20, y, 30, 30);
            resolve();
          };
          logoReader.readAsDataURL(logoBlob);
        });

        pdf.setFontSize(16);
        pdf.setFont("helvetica", "bold");
        pdf.text("Koperasi Bintang Merah Sejahtera", 60, y + 15);

        y += 40;
        pdf.line(20, y, pageWidth - 20, y);
        y += 12; // sedikit dirapatkan
      } catch {
        pdf.setFontSize(16);
        pdf.setFont("helvetica", "bold");
        pdf.text("Koperasi Bintang Merah Sejahtera", 20, y);
        y += 18;
      }

      // ===== Info tanaman (tetap)
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.text(`Riwayat Tanaman: ${plantData.instanceName || ""}`, 20, y);
      y += 9;

      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Jumlah Tanam: ${plantData.qrCode}`, 20, y);
      y += 5;
      pdf.text(`Pemilik: ${plantData.owner}`, 20, y);
      y += 5;
      pdf.text(`Lokasi: ${plantData.location}`, 20, y);
      y += 10;

      // ===== Filter: Only show approved histories for users
      const filteredHistory = (plantData.history || []).filter((h: any) => {
        // If no approval status field (old data), show it
        if (!h.approvalStatus) return true;
        // Only show histories approved by manajer
        return h.approvalStatus === "approved_by_manajer";
      });

      // ===== Sort: "Kontrak Baru" selalu paling atas, sisanya tanggal paling awal
      const sortedHistory = [...filteredHistory].sort((a, b) => {
        const aIsKontrak =
          (a.type || a.action || "").toLowerCase() === "kontrak baru";
        const bIsKontrak =
          (b.type || b.action || "").toLowerCase() === "kontrak baru";

        if (aIsKontrak && !bIsKontrak) return -1;
        if (!aIsKontrak && bIsKontrak) return 1;

        // Jika keduanya "Kontrak Baru" atau keduanya bukan, sort by date
        return (
          parseDateString(a.date).getTime() - parseDateString(b.date).getTime()
        );
      });

      // Layout config
      const left = 24;
      const right = pageWidth - 24;
      const cardX = 20;
      const cardW = pageWidth - 40;
      const mediaW = 45;
      const mediaH = 35;
      const verticalGap = 6;

      for (let i = 0; i < sortedHistory.length; i++) {
        const item = sortedHistory[i];

        // estimasi tinggi minimum card agar kira-kira bisa 3 per halaman
        const minNeeded = 75;
        if (y + minNeeded > pageHeight - 20) {
          pdf.addPage();
          y = 18; // margin atas halaman baru
        }

        const cardTop = y;
        let cursor = y + 7;

        // Title kiri & tanggal kanan (geser 4pt dari tepi)
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text(`${i + 1}. ${item.type || item.action}`, left, cursor);

        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        const dateText = `Tanggal: ${item.date}`;
        const dateW = pdf.getTextWidth(dateText);
        pdf.text(dateText, right - dateW - 4, cursor); // <= geser dari tepi

        cursor += 5;

        // Frame media (hitam pekat)
        pdf.setDrawColor(0);
        pdf.setLineWidth(0.4);
        pdf.rect(left, cursor, mediaW, mediaH);

        if (item.imageUrl) {
          if (isVideoUrl(item.imageUrl)) {
            pdf.setFontSize(9);
            pdf.text("VIDEO (lihat di aplikasi)", left + 3, cursor + 10);
          } else {
            try {
              const response = await fetch(item.imageUrl);
              const blob = await response.blob();
              const reader = new FileReader();

              await new Promise<void>((resolve) => {
                reader.onload = () => {
                  const imgData = reader.result as string;
                  pdf.addImage(
                    imgData,
                    "JPEG",
                    left + 1.5,
                    cursor + 1.5,
                    mediaW - 3,
                    mediaH - 3
                  );
                  resolve();
                };
                reader.readAsDataURL(blob);
              });
            } catch {
              pdf.setFontSize(9);
              pdf.text(t("media.imageLoadError"), left + 3, cursor + 10);
            }
          }
        } else {
          pdf.setFontSize(9);
          pdf.text(t("media.noMedia"), left + 3, cursor + 10);
        }

        // Catatan di samping media
        const textLeft = left + mediaW + 8;
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.text("Catatan =", textLeft, cursor + 7);

        pdf.setFont("helvetica", "normal");
        const maxWidth = right - textLeft;
        const wrapped = pdf.splitTextToSize(item.description || "-", maxWidth);
        pdf.text(wrapped, textLeft, cursor + 13);

        // hitung tinggi konten
        const textHeight = (wrapped.length ? wrapped.length : 1) * 5 + 18;
        const contentHeight = Math.max(mediaH + 6, textHeight);
        const cardBottom = cardTop + contentHeight + 8;

        // Border card (hitam pekat & lebih tegas)
        pdf.setDrawColor(0);
        pdf.setLineWidth(0.8);
        pdf.rect(cardX, cardTop, cardW, cardBottom - cardTop, "S");

        // pindah Y (jarak antar card diperkecil)
        y = cardBottom + verticalGap;
      }

      pdf.save(
        `Riwayat-${plantData.instanceName || ""}-${plantData.qrCode}.pdf`
      );
    } catch {
      console.error("Error generating PDF");
      // showError("Gagal membuat PDF", "Gagal membuat PDF. Silakan coba lagi.");
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="w-16 h-16 border-4 border-[#324D3E] border-t-transparent rounded-full mx-auto mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="text-[#324D3E] text-lg font-medium">
            {t("plants.loading")}
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      {/* Header */}
      <motion.div
        className="bg-white/80 backdrop-blur-sm border-b border-green-100 sticky top-0 z-40"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
            <div className="flex items-center space-x-4 mb-4 sm:mb-0">
              <Link href="/">
                <motion.div
                  className="flex items-center space-x-2 cursor-pointer"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Image
                    src="/images/koperasi-logo.jpg"
                    alt="Logo"
                    width={48}
                    height={48}
                    className="rounded-full"
                  />
                  <div>
                    <h1 className="text-lg sm:text-xl font-bold text-[#324D3E]">
                      {t("plants.myPlantsTitle")}
                    </h1>
                    <p className="text-sm text-gray-600">
                      {t("plants.manageSubtitle")}
                    </p>
                  </div>
                </motion.div>
              </Link>
            </div>
            <div className="w-full sm:w-auto flex justify-end sm:justify-start items-center space-x-3">
              <Link href="/payments">
                <motion.button
                  className="px-3 py-1.5 text-sm sm:px-4 sm:py-2 sm:text-base text-[#324D3E] border border-[#324D3E] rounded-full hover:bg-[#324D3E] hover:text-white transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {t("nav.pembayaran")}
                </motion.button>
              </Link>
              <Link href="/">
                <motion.button
                  className="px-3 py-1.5 text-sm sm:px-4 sm:py-2 sm:text-base bg-[#324D3E] text-white rounded-full hover:bg-[#4C3D19] transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {t("plants.back")}
                </motion.button>
              </Link>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Stats Cards */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-1 md:grid-cols-4 gap-6"
          >
            {[
              {
                title: t("payments.stats.totalPackages"),
                value: `${data?.totalInvestments} ${t("plants.packages")} - ${data?.jumlahPohon} ${t("plants.trees")}`,
                icon: <BarChart3 className="w-6 h-6" />,
                bgColor: "from-blue-500 to-blue-600",
              },
              {
                title: t("payments.stats.paymentValue"),
                value: formatCurrency(data?.totalAmount || 0),
                suffix: "",
                icon: <Coins className="w-6 h-6" />,
                bgColor: "from-green-500 to-green-600",
              },
              {
                title: t("payments.stats.paid"),
                value: formatCurrency(data?.totalPaid || 0),
                suffix: "",
                icon: <CheckCircle className="w-6 h-6" />,
                bgColor: "from-emerald-500 to-emerald-600",
              },
            ].map((stat) => (
              <motion.div
                key={stat.title}
                variants={cardVariants}
                whileHover={{
                  scale: 1.05,
                  boxShadow:
                    "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                }}
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-r ${stat.bgColor} flex items-center justify-center text-white mb-4`}
                >
                  {stat.icon}
                </div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">
                  {stat.title}
                </h3>
                <p className="text-2xl font-bold text-gray-900">
                  {typeof stat.value === "string"
                    ? stat.value
                    : stat.value + stat.suffix!}
                </p>
              </motion.div>
            ))}
          </motion.div>

          {/* Investments Grid */}
          {data && data.investments.length > 0 ? (
            <motion.div
              variants={itemVariants}
              className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
            >
              {data.investments.map((investment, index) => (
                <motion.div
                  key={`${investment.investmentId}-${index}`}
                  variants={cardVariants}
                  whileHover={{
                    scale: 1.02,
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
                  }}
                  className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden cursor-pointer"
                  onClick={() => setSelectedInvestment(investment)}
                  layout
                >
                  {/* Investment Header */}
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 text-green-600">
                          {investment.plantInstance ? (
                            getPlantTypeIcon(investment.plantInstance.plantType)
                          ) : (
                            <Sprout className="w-full h-full" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {investment.productName}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {investment.plantInstance
                              ? getPlantTypeName(
                                  investment.plantInstance.plantType
                                )
                              : t("plants.plant")}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          investment.status
                        )}`}
                      >
                        {getStatusText(investment.status)}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>{t("payments.progress.title")}</span>
                        <span>{investment.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <motion.div
                          className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${investment.progress}%` }}
                          transition={{ duration: 1, delay: index * 0.2 }}
                        />
                      </div>
                    </div>

                    {/* Investment Details */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">
                          {t("payments.cards.totalPackage")}
                        </span>
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(investment.totalAmount)}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">
                          {t("payments.stats.paid")}
                        </span>
                        <p className="font-semibold text-green-600">
                          {formatCurrency(investment.amountPaid)}
                        </p>
                      </div>
                        <div>
                          <span className="text-gray-600">
                            {t("plants.remainingPayment")}
                          </span>
                          <p className="font-semibold text-orange-600">
                            {formatCurrency(
                              investment.totalAmount - investment.amountPaid
                            )}
                          </p>
                        </div>
                    </div>
                  </div>

                  {/* Plant Instance Info */}
                  {investment.plantInstance && (
                    <div
                      className={`p-6 ${
                        investment.contractInfo?.isPermanentlyRejected
                          ? "opacity-60 bg-gray-50"
                          : ""
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4
                          className={`font-medium ${
                            investment.contractInfo?.isPermanentlyRejected
                              ? "text-gray-500"
                              : "text-gray-900"
                          }`}
                        >
                          {t("plants.plantInfo")}
                          {investment.contractInfo?.isPermanentlyRejected && (
                            <span className="text-xs text-red-600 ml-2 font-normal">
                              ({t("plants.disabled")})
                            </span>
                          )}
                        </h4>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            investment.contractInfo?.isPermanentlyRejected
                              ? "bg-red-100 text-red-800"
                              : investment.plantInstance.status === "active"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {investment.contractInfo?.isPermanentlyRejected
                            ? t("plants.locked")
                            : investment.plantInstance.status}
                        </span>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            {t("plants.location")}
                          </span>
                          <span className="text-gray-900">
                            {investment.plantInstance.location}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            {t("plants.blockKav")}
                          </span>
                          <span className="text-gray-900">
                            {investment.plantInstance.blok || "-"} /{" "}
                            {investment.plantInstance.kavling || "-"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            {t("plants.income")}
                          </span>
                          <span className="text-green-600 font-medium">
                            {formatCurrency(
                              investment.plantInstance.totalIncome
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            {t("plants.operationalCosts")}
                          </span>
                          <span className="text-red-600 font-medium">
                            {formatCurrency(
                              investment.plantInstance.totalOperationalCosts
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Recent History Preview */}
                      {investment.plantInstance?.history &&
                        investment.plantInstance.history.length > 0 && (
                          <div className="mt-4">
                            <h5 className="text-sm font-medium text-gray-700 mb-2">
                              {t("plants.recentHistory")}
                            </h5>
                            <div className="space-y-2 max-h-24 overflow-hidden">
                              {investment.plantInstance.history
                                .filter((h: any) => !h.approvalStatus || h.approvalStatus === "approved_by_manajer")
                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                .slice(0, 2)
                                .map((historyItem, index) => (
                                  <div
                                    key={index}
                                    className="text-xs p-2 bg-gray-50 rounded border-l-2 border-blue-200"
                                  >
                                    <div className="flex justify-between items-start">
                                      <span className="font-medium text-gray-700">
                                        {historyItem.action}
                                      </span>
                                      <span className="text-gray-500 ml-2">
                                        {formatDate(historyItem.date, {
                                          day: "2-digit",
                                          month: "short",
                                        })}
                                      </span>
                                    </div>
                                    {historyItem.description && (
                                      <p className="text-gray-600 mt-1 line-clamp-1">
                                        {historyItem.description}
                                      </p>
                                    )}
                                    {historyItem.addedBy && (
                                      <p className="text-gray-500 mt-1">
                                        {t("media.addedBy")}{" "}
                                        {historyItem.addedBy}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              {investment.plantInstance.history.length > 2 && (
                                <p className="text-xs text-blue-600 font-medium">
                                  {t("plants.moreHistory").replace(
                                    "{count}",
                                    String(
                                      investment.plantInstance.history.length -
                                        2
                                    )
                                  )}
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                      {investment.nextPaymentInfo && (
                        <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                          <p className="text-sm text-amber-800">
                            <span className="font-medium">
                              {t("plants.nextPayment")}
                            </span>
                            <br />
                            {t("plants.installmentNumber")}
                            {
                              investment.nextPaymentInfo.installmentNumber
                            } •{" "}
                            {formatCurrency(investment.nextPaymentInfo.amount)}
                            <br />
                            {t("plants.dueDate")}:{" "}
                            {formatDate(investment.nextPaymentInfo.dueDate)}
                          </p>
                        </div>
                      )}

                      {/* Contract Status Warnings */}
                      {investment.contractInfo && (
                        <>
                          {investment.contractInfo.isPermanentlyRejected && (
                            <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                              <div className="flex items-center">
                                <div className="w-4 h-4 text-red-500 mr-2">
                                  ⚠️
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-red-800">
                                    {t("plants.contractRejectedPermanent")}
                                  </p>
                                  <p className="text-xs text-red-700">
                                    {t("plants.maxAttemptsReached").replace(
                                      "{maxAttempts}",
                                      String(
                                        investment.contractInfo.maxAttempts
                                      )
                                    )}{" "}
                                    {t("plants.paymentDisabled")}.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {investment.contractInfo.isMaxRetryReached &&
                            !investment.contractInfo.isPermanentlyRejected && (
                              <div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                                <div className="flex items-center">
                                  <div className="w-4 h-4 text-orange-500 mr-2">
                                    ⚠️
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-orange-800">
                                      {t("plants.contractNeedsReview")}
                                    </p>
                                    <p className="text-xs text-orange-700">
                                      {t("plants.contractAttempts")}:{" "}
                                      {investment.contractInfo.currentAttempt}/
                                      {investment.contractInfo.maxAttempts}.
                                      {t("plants.contactAdmin")}.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                          {investment.contractInfo.adminApprovalStatus ===
                            "rejected" &&
                            !investment.contractInfo.isMaxRetryReached && (
                              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <div className="flex items-center">
                                  <div className="w-4 h-4 text-blue-500 mr-2">
                                    ℹ️
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-blue-800">
                                      {t("plants.contractNeedsResubmission")}
                                    </p>
                                    <p className="text-xs text-blue-700">
                                      {t("plants.visitPaymentPage")}.{" "}
                                      {t("plants.contractAttempts")}:{" "}
                                      {investment.contractInfo.currentAttempt}/
                                      {investment.contractInfo.maxAttempts}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                        </>
                      )}
                    </div>
                  )}

                  {!investment.plantInstance && (
                    <div className="p-6">
                      <div className="text-center py-4">
                        <div
                          className={`w-12 h-12 mx-auto mb-2 ${
                            investment.contractInfo?.isPermanentlyRejected
                              ? "text-red-400"
                              : "text-gray-400"
                          }`}
                        >
                          <Sprout className="w-full h-full" />
                        </div>
                        <p
                          className={`text-sm ${
                            investment.contractInfo?.isPermanentlyRejected
                              ? "text-red-600 font-medium"
                              : "text-gray-600"
                          }`}
                        >
                          {investment.contractInfo?.isPermanentlyRejected
                            ? t("plants.plantAllocationDisabled")
                            : t("plants.plantWillBeAllocated")}
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div variants={itemVariants} className="text-center py-16">
              <motion.div
                className="w-16 h-16 text-green-500 mx-auto mb-4"
                animate={{
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <Sprout className="w-full h-full" />
              </motion.div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {t("plants.empty.title")}
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                {t("plants.empty.description")}
              </p>
              <Link href="/#produk">
                <motion.button
                  className="px-6 py-3 bg-[#324D3E] text-white rounded-full hover:bg-[#4C3D19] transition-colors font-medium"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {t("plants.empty.cta")}
                </motion.button>
              </Link>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Investment Detail Modal */}
      <AnimatePresence>
        {selectedInvestment && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedInvestment(null)}
          >
            <motion.div
              className="relative bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="pt-14 pb-6 px-6 border-b border-gray-100">
                <div className="flex flex-col md:flex-row md:items-center justify-between">
                  <div className="flex items-start md:items-center space-x-3 w-full md:w-auto mt-4 md:mt-0">
                    <div className="w-10 h-10 md:w-8 md:h-8 text-green-600 flex-shrink-0">
                      {selectedInvestment.plantInstance ? (
                        getPlantTypeIcon(
                          selectedInvestment.plantInstance.plantType
                        )
                      ) : (
                        <Sprout className="w-full h-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg sm:text-xl font-bold text-gray-900 break-words">
                        {selectedInvestment.productName}
                      </h2>
                      <p className="text-sm text-gray-600">
                        ID: {selectedInvestment.investmentId}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 mt-3 md:mt-0 flex-shrink-0">
                    {selectedInvestment.plantInstance && (
                      <button
                        onClick={() =>
                          handleDownloadHistoryPDF(selectedInvestment)
                        }
                        aria-label="Download riwayat PDF"
                        className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg transition-all duration-300 shadow-md hover:shadow-lg"
                      >
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline text-sm font-medium">
                          {t("plants.downloadPdf")}
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Close button: absolutely positioned top-right so it stays visible on all breakpoints */}
                  <button
                    onClick={() => setSelectedInvestment(null)}
                    aria-label="Tutup detail"
                    className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-gray-100 rounded-full transition-colors shadow-sm z-10"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="">
                <div className="p-6 space-y-6">
                  {/* Investment Summary */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">
                      {t("plants.summary")}
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-600">
                          {t("plants.paymentType")}
                        </span>
                        <p className="font-semibold">
                          {selectedInvestment.paymentType === "full"
                            ? t("plants.paymentTypeFull")
                            : t("payments.form.typeInstallment")}
                        </p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-600">
                          {t("payments.form.contractInfo")}
                        </span>
                        <p className="font-semibold">
                          {getStatusText(selectedInvestment.status)}
                        </p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-600">
                          {t("plants.purchaseDate")}
                        </span>
                        <p className="font-semibold">
                          {formatDate(selectedInvestment.investmentDate)}
                        </p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-600">
                          {t("payments.progress.title")}
                        </span>
                        <p className="font-semibold text-green-600">
                          {selectedInvestment.progress}%
                        </p>
                      </div>
                        <>
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <span className="text-sm text-gray-600">
                              {t("plants.totalAmount")}
                            </span>
                            <p className="font-semibold">
                              {formatCurrency(selectedInvestment.totalAmount)}
                            </p>
                          </div>
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <span className="text-sm text-gray-600">
                              {t("plants.remainingPayment")}
                            </span>
                            <p className="font-semibold text-orange-600">
                              {formatCurrency(
                                selectedInvestment.totalAmount -
                                  selectedInvestment.amountPaid
                              )}
                            </p>
                          </div>
                        </>
                    </div>
                  </div>

                  {/* Plant Instance Details */}
                  {selectedInvestment.plantInstance && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4">
                        {t("plants.plantDetails")}
                      </h3>
                      <div className="space-y-4">
                        <div className="p-4 bg-green-50 rounded-lg">
                          <h4 className="font-medium mb-2">
                            {selectedInvestment.plantInstance.instanceName}
                          </h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">
                                {t("plants.plantType")}
                              </span>
                              <p>
                                {getPlantTypeName(
                                  selectedInvestment.plantInstance.plantType
                                )}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-600">
                                {t("payments.form.type")}
                              </span>
                              <p className="capitalize">
                                {selectedInvestment.plantInstance.status}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-600">
                                {t("plants.location")}
                              </span>
                              <p>{selectedInvestment.plantInstance.location}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">
                                {t("plants.blockKav")}
                              </span>
                              <p>
                                {selectedInvestment.plantInstance.blok || "-"} /{" "}
                                {selectedInvestment.plantInstance.kavling ||
                                  "-"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Financial Summary */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-green-50 rounded-lg">
                            <span className="text-sm text-gray-600">
                              {t("plants.income")}
                            </span>
                            <p className="text-lg font-bold text-green-600">
                              {formatCurrency(
                                selectedInvestment.plantInstance.totalIncome
                              )}
                            </p>
                          </div>
                          <div className="p-4 bg-red-50 rounded-lg">
                            <span className="text-sm text-gray-600">
                              {t("plants.operationalCosts")}
                            </span>
                            <p className="text-lg font-bold text-red-600">
                              {formatCurrency(
                                selectedInvestment.plantInstance
                                  .totalOperationalCosts
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Complete History */}
                        {selectedInvestment.plantInstance.history &&
                          selectedInvestment.plantInstance.history.length >
                            0 && (
                            <div className="flex-1 min-h-0">
                              <h4 className="font-medium mb-3">
                                {t("plants.completeHistory")}
                              </h4>
                              <div className="h-80 overflow-y-auto border rounded-lg p-3 bg-gray-50 space-y-3">
                                {selectedInvestment.plantInstance.history
                                  .filter((h: any) => !h.approvalStatus || h.approvalStatus === "approved_by_manajer")
                                  .sort(
                                    (a, b) =>
                                      new Date(b.date).getTime() -
                                      new Date(a.date).getTime()
                                  )
                                  .map((historyItem, index) => (
                                    <div
                                      key={`${historyItem.action}-${historyItem.date}-${index}`}
                                      className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm"
                                    >
                                      <div className="flex justify-between items-start mb-2">
                                        <span className="font-medium text-gray-900">
                                          {historyItem.action}
                                        </span>
                                        <span className="text-sm text-gray-500">
                                          {formatDate(historyItem.date)}
                                        </span>
                                      </div>
                                      {historyItem.description && (
                                        <p className="text-sm text-gray-700 mb-3">
                                          {historyItem.description}
                                        </p>
                                      )}
                                      {historyItem.imageUrl && (
                                        <div className="mb-3">
                                          {isVideoUrl(historyItem.imageUrl) ? (
                                            <video
                                              controls
                                              className="w-full max-w-xs h-48 object-cover rounded-lg border"
                                              preload="metadata"
                                              aria-label={`Video untuk ${historyItem.action}`}
                                            >
                                              <source
                                                src={historyItem.imageUrl}
                                                type="video/mp4"
                                              />
                                              <source
                                                src={historyItem.imageUrl}
                                                type="video/webm"
                                              />
                                              {t("media.videoNotSupported")}
                                            </video>
                                          ) : (
                                            <Image
                                              src={historyItem.imageUrl}
                                              alt={`Gambar untuk ${historyItem.action}`}
                                              width={300}
                                              height={200}
                                              className="w-full max-w-xs h-48 object-cover rounded-lg border cursor-pointer hover:opacity-75 transition-opacity"
                                              onClick={() =>
                                                window.open(
                                                  historyItem.imageUrl,
                                                  "_blank"
                                                )
                                              }
                                            />
                                          )}
                                        </div>
                                      )}
                                      {historyItem.addedBy && (
                                        <p className="text-xs text-gray-500">
                                          {t("media.addedBy")}{" "}
                                          {historyItem.addedBy}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}

                        {/* Recent Activity */}
                        {((selectedInvestment.plantInstance.recentIncome &&
                          selectedInvestment.plantInstance.recentIncome.length >
                            0) ||
                          (selectedInvestment.plantInstance.recentCosts &&
                            selectedInvestment.plantInstance.recentCosts
                              .length > 0)) && (
                          <div>
                            <h4 className="font-medium mb-3">
                              {t("plants.recentFinancialActivity")}
                            </h4>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {[
                                ...(
                                  selectedInvestment.plantInstance
                                    .recentIncome || []
                                ).map((income) => ({
                                  ...income,
                                  type: "income",
                                })),
                                ...(
                                  selectedInvestment.plantInstance
                                    .recentCosts || []
                                ).map((cost) => ({
                                  ...cost,
                                  type: "cost",
                                })),
                              ]
                                .sort(
                                  (a, b) =>
                                    parseDateString(b.date).getTime() -
                                    parseDateString(a.date).getTime()
                                )
                                .map((activity, index) => (
                                  <div
                                    key={index}
                                    className="flex justify-between items-center p-2 bg-gray-50 rounded"
                                  >
                                    <div className="flex-1">
                                      <p className="text-sm font-medium">
                                        {activity.description}
                                      </p>
                                      <p className="text-xs text-gray-600">
                                        {formatDate(activity.date)}
                                      </p>
                                    </div>
                                    <span
                                      className={`text-sm font-medium ${
                                        activity.type === "income"
                                          ? "text-green-600"
                                          : "text-red-600"
                                      }`}
                                    >
                                      {activity.type === "income" ? "+" : "-"}
                                      {formatCurrency(activity.amount)}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
