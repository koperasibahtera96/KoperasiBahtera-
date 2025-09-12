"use client";

import { AdminLayout } from "@/components/admin/AdminLayout";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

interface Tree {
  _id: string;
  spesiesPohon: string;
  lokasi: string;
  umur: number;
  tinggi: number;
  tanggalTanam: string;
  kondisi: string;
  createdAt: string;
  nomorKontrak?: string;
}

interface InvestorReport {
  investor: {
    _id: string;
    name: string;
    email: string;
    totalInvestasi: number;
    jumlahPohon: number;
    status: string;
    createdAt: string;
  };
  trees: Tree[];
  statistics: {
    total: number;
    byCondition: Record<string, number>;
    bySpecies: Record<string, number>;
    avgHeight: number;
  };
}

interface ReportData {
  reports: InvestorReport[];
  summary: {
    totalInvestors: number;
    totalTrees: number;
    totalInvestment: number;
    activeInvestors: number;
    inactiveInvestors: number;
  };
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    startIndex: number;
    endIndex: number;
  };
}

export default function LaporanPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedInvestor, setExpandedInvestor] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [detailedPlantData, setDetailedPlantData] = useState<
    Record<string, any[]>
  >({});
  const [loadingPlantAges, setLoadingPlantAges] = useState<
    Record<string, boolean>
  >({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Format number helper
  const formatNumber = (num: number) => {
    return num.toLocaleString("id-ID");
  };

  // Format detailed age helper
  const formatDetailedAge = (detailedAge: {
    years: number;
    months: number;
    days: number;
  }) => {
    const parts = [];
    if (detailedAge.years > 0) parts.push(`${detailedAge.years} tahun`);
    if (detailedAge.months > 0) parts.push(`${detailedAge.months} bulan`);
    if (detailedAge.days > 0) parts.push(`${detailedAge.days} hari`);
    return parts.length > 0 ? parts.join(", ") : "0 hari";
  };


  // PDF Generation Functions
  const addPDFHeader = async (doc: jsPDF, title: string) => {
    // Add logo
    try {
      const logoImg = new Image();
      logoImg.onload = () => {
        doc.addImage(logoImg, "PNG", 20, 15, 25, 25);
      };
      logoImg.src = "/images/koperasi-logo.jpg";

      // Wait a bit for image to load
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.warn("Logo not loaded:", error);
    }

    // Company header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("KOPERASI INVESTASI HIJAU", 55, 25);

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Jl. Green Investment No. 123, Jakarta", 55, 32);
    doc.text("Tel: (021) 1234-5678 | Email: info@investasihijau.com", 55, 38);

    // Report title
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(title, 20, 55);

    // Date
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const currentDate = new Date().toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    doc.text(`Dibuat pada: ${currentDate}`, 20, 62);

    // Line separator
    doc.setLineWidth(0.5);
    doc.line(20, 70, 190, 70);

    return 80; // Return Y position for content start
  };

  const downloadAllInvestorsReport = async () => {
    if (!reportData) return;

    const doc = new jsPDF();
    const startY = await addPDFHeader(doc, "LAPORAN ADMIN - SEMUA INVESTOR");

    // Summary section
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("RINGKASAN UMUM", 20, startY);

    const summaryData = [
      ["Total Investor", reportData.summary.totalInvestors.toString()],
      ["Total Instansi Tanaman", reportData.summary.totalTrees.toString()],
      ["Investor Aktif", reportData.summary.activeInvestors.toString()],
      ["Investor Tidak Aktif", reportData.summary.inactiveInvestors.toString()],
    ];

    autoTable(doc, {
      startY: startY + 8,
      head: [["Metrik", "Jumlah"]],
      body: summaryData,
      theme: "striped",
      headStyles: { fillColor: [50, 77, 62] },
      margin: { left: 20, right: 20 },
      styles: { fontSize: 10 },
    });

    // Investors table
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("DETAIL INVESTOR", 20, finalY);

    const investorTableData = reports.map((report) => [
      report.investor.name,
      report.investor.email,
      report.investor.status === "active" ? "Aktif" : "Tidak Aktif",
      report.investor.jumlahPohon.toString(),
      report.statistics.total.toString(),
      `Sehat: ${Object.entries(report.statistics.byCondition).reduce(
        (total, [status, count]) =>
          status.toLowerCase() !== "sakit" ? total + count : total,
        0
      )}, Sakit: ${report.statistics.byCondition.Sakit || 0}`,
      new Date(report.investor.createdAt).toLocaleDateString("id-ID"),
    ]);

    autoTable(doc, {
      startY: finalY + 8,
      head: [
        [
          "Nama",
          "Email",
          "Status",
          "Tanaman Terdaftar",
          "Instansi Tanaman",
          "Tanaman Sehat/Sakit",
          "Tanggal Bergabung",
        ],
      ],
      body: investorTableData,
      theme: "striped",
      headStyles: { fillColor: [50, 77, 62] },
      margin: { left: 20, right: 20 },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 35 },
        2: { cellWidth: 15 },
        3: { cellWidth: 20 },
        4: { cellWidth: 20 },
        5: { cellWidth: 20 },
        6: { cellWidth: 25 },
      },
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Halaman ${i} dari ${pageCount}`, 20, 285);
      doc.text("Rahasia - Hanya untuk Penggunaan Internal", 150, 285);
    }

    doc.save(
      `Laporan-Admin-Semua-Investor-${
        new Date().toISOString().split("T")[0]
      }.pdf`
    );
  };

  const downloadIndividualInvestorReport = async (report: InvestorReport) => {
    const doc = new jsPDF();
    const startY = await addPDFHeader(
      doc,
      `LAPORAN INVESTOR - ${report.investor.name.toUpperCase()}`
    );

    // Ensure we have detailed plant data for accurate age calculations
    await fetchDetailedPlantAges(report.investor._id);

    // Calculate average age for PDF only
    let avgAge = 0;
    if (report.trees.length > 0) {
      const totalAgeInMonths = report.trees.reduce((sum, tree) => {
        const ageInMonths = tree.umur || 0;
        return sum + ageInMonths;
      }, 0);
      avgAge = Math.round(totalAgeInMonths / report.trees.length);
    }

    // Investor info
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("INFORMASI INVESTOR", 20, startY);

    const investorInfo = [
      ["Nama", report.investor.name],
      ["Email", report.investor.email],
      ["Status", report.investor.status === "active" ? "Aktif" : "Tidak Aktif"],
      [
        "Tanggal Bergabung",
        new Date(report.investor.createdAt).toLocaleDateString("id-ID"),
      ],
      ["Tanaman Terdaftar", report.investor.jumlahPohon.toString()],
      ["Instansi Tanaman", report.statistics.total.toString()],
    ];

    autoTable(doc, {
      startY: startY + 8,
      head: [["Bidang", "Nilai"]],
      body: investorInfo,
      theme: "striped",
      headStyles: { fillColor: [50, 77, 62] },
      margin: { left: 20, right: 20 },
      styles: { fontSize: 10 },
    });

    // Plant statistics
    const afterInfo = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("STATISTIK TANAMAN", 20, afterInfo);

    const plantStats = [
      ["Total Tanaman", report.statistics.total.toString()],
      ...Object.entries(report.statistics.byCondition).map(
        ([status, count]) => [`Tanaman ${status}`, count.toString()]
      ),
      ["Rata-rata Umur", `${avgAge} bulan`],
    ];

    autoTable(doc, {
      startY: afterInfo + 8,
      head: [["Metrik", "Jumlah"]],
      body: plantStats,
      theme: "striped",
      headStyles: { fillColor: [50, 77, 62] },
      margin: { left: 20, right: 20 },
      styles: { fontSize: 10 },
    });

    // Plant types
    const afterStats = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("RINCIAN JENIS TANAMAN", 20, afterStats);

    const plantTypes = Object.entries(report.statistics.bySpecies).map(
      ([type, count]) => [
        type.charAt(0).toUpperCase() + type.slice(1),
        count.toString(),
      ]
    );

    autoTable(doc, {
      startY: afterStats + 8,
      head: [["Jenis Tanaman", "Jumlah"]],
      body: plantTypes,
      theme: "striped",
      headStyles: { fillColor: [50, 77, 62] },
      margin: { left: 20, right: 20 },
      styles: { fontSize: 10 },
    });

    // Individual plants table
    if (report.trees.length > 0) {
      const afterTypes = (doc as any).lastAutoTable.finalY + 15;

      // Check if we need a new page
      let tableStartY = 0;
      if (afterTypes > 220) {
        doc.addPage();
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("INSTANSI TANAMAN INDIVIDUAL", 20, 30);
        tableStartY = 38;
      } else {
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("INSTANSI TANAMAN INDIVIDUAL", 20, afterTypes);
        tableStartY = (afterTypes as number) + 8;
      }

      const plantsData = report.trees.map((tree) => {
        // Use the same age calculation logic as the expanded detail data
        // This should match the API logic for consistent age display
        let ageDisplay = `${tree.umur} bulan`;
        
        // If we have detailed plant data (like in the expanded view), use that
        const detailedData = detailedPlantData[report.investor._id];
        if (detailedData) {
          const detailedTree = detailedData.find(dt => dt._id === tree._id);
          if (detailedTree && detailedTree.detailedAge) {
            if (detailedTree.ageSource === "tanamBibit") {
              ageDisplay = formatDetailedAge(detailedTree.detailedAge);
            } else {
              ageDisplay = "Belum Ditanam";
            }
          }
        }
        
        return [
          tree.nomorKontrak || "N/A",
          tree.spesiesPohon,
          tree.lokasi,
          ageDisplay,
          new Date(tree.tanggalTanam).toLocaleDateString("id-ID"),
          tree.kondisi,
        ];
      });

      autoTable(doc, {
        startY: tableStartY,
        head: [["Nomor Kontrak", "Nama Instansi", "Lokasi", "Umur", "Ditanam", "Status"]],
        body: plantsData,
        theme: "striped",
        headStyles: { fillColor: [50, 77, 62] },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 8 },
        tableWidth: 'auto',
        columnStyles: {
          0: { cellWidth: 40 }, // Nomor Kontrak - increased width
          1: { cellWidth: 32 }, // Nama Instansi
          2: { cellWidth: 28 }, // Lokasi
          3: { cellWidth: 35 }, // Umur - for detailed age
          4: { cellWidth: 22 }, // Ditanam
          5: { cellWidth: 18 }, // Status
        },
      });
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Halaman ${i} dari ${pageCount}`, 20, 285);
      doc.text("Rahasia - Hanya untuk Penggunaan Internal", 150, 285);
    }

    doc.save(
      `Laporan-Investor-${report.investor.name.replace(/\s+/g, "-")}-${
        new Date().toISOString().split("T")[0]
      }.pdf`
    );
  };

  // Fetch report data with pagination and search
  const fetchReportData = async (page = 1, search = "") => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
        ...(search && { search }),
      });

      const response = await fetch(`/api/admin/laporan?${params}`);

      if (response.ok) {
        const result = await response.json();
        setReportData(result.data);
        setCurrentPage(page);
      } else {
        console.error("Failed to fetch report data");
      }
    } catch (error) {
      console.error("Error fetching report data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch detailed plant ages for specific investor
  const fetchDetailedPlantAges = async (investorId: string) => {
    if (detailedPlantData[investorId]) {
      // Data already loaded
      return;
    }

    try {
      setLoadingPlantAges((prev) => ({ ...prev, [investorId]: true }));
      const response = await fetch(
        `/api/admin/laporan/${investorId}/plant-ages`
      );

      if (response.ok) {
        const result = await response.json();
        setDetailedPlantData((prev) => ({
          ...prev,
          [investorId]: result.data,
        }));
      } else {
        console.error("Failed to fetch detailed plant ages");
      }
    } catch (error) {
      console.error("Error fetching detailed plant ages:", error);
    } finally {
      setLoadingPlantAges((prev) => ({ ...prev, [investorId]: false }));
    }
  };

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch data on mount
  useEffect(() => {
    fetchReportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch data when debounced search term changes
  useEffect(() => {
    if (debouncedSearchTerm !== searchTerm) return; // Only trigger when debounce is complete
    fetchReportData(1, debouncedSearchTerm); // Reset to page 1 on search
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm]);

  const getKondisiBadge = (kondisi: string) => {
    switch (kondisi.toLowerCase()) {
      case "tanam bibit":
      case "tumbuh sehat":
      case "sehat":
        return "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300";
      case "perlu perawatan":
      case "perlu_perawatan":
        return "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300";
      case "bermasalah":
      case "sakit":
        return "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300";
      case "pemupukan":
      case "penyiraman":
      case "pemangkasan":
        return "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300";
      case "panen":
        return "bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300";
      default:
        return "bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-300";
    }
  };

  const getKondisiText = (kondisi: string) => {
    return kondisi;
  };

  const toggleExpanded = (investorId: string) => {
    const isExpanding = expandedInvestor !== investorId;
    setExpandedInvestor(isExpanding ? investorId : null);

    // Fetch detailed plant ages when expanding
    if (isExpanding) {
      fetchDetailedPlantAges(investorId);
    }
  };

  // Reports are already filtered and paginated by the server
  const reports = reportData?.reports || [];

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white transition-colors duration-300">
              Laporan Investasi
            </h1>
            <p className="text-gray-600 dark:text-gray-200 mt-2 transition-colors duration-300">
              Memuat laporan...
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white/80 dark:bg-gray-800/80 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse transition-colors duration-300"
              >
                <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!reportData) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white transition-colors duration-300">
              Laporan Investasi
            </h1>
            <p className="text-gray-600 dark:text-gray-200 mt-2 transition-colors duration-300">
              Gagal memuat data laporan
            </p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#324D3E] dark:text-white font-[family-name:var(--font-poppins)] truncate transition-colors duration-300">
              Laporan Admin
            </h1>
            <p className="text-[#889063] dark:text-gray-200 mt-1 sm:mt-2 text-sm sm:text-base transition-colors duration-300">
              Ringkasan manajemen investor dan pelacakan instansi tanaman
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <button
              onClick={() => fetchReportData(currentPage, debouncedSearchTerm)}
              disabled={loading}
              className="bg-[#324D3E]/10 dark:bg-[#324D3E]/20 hover:bg-[#324D3E]/20 dark:hover:bg-[#324D3E]/30 text-[#324D3E] dark:text-white px-3 sm:px-4 py-2 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 text-sm sm:text-base whitespace-nowrap"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">
                {loading ? "Memuat..." : "Refresh"}
              </span>
            </button>
            <button
              onClick={downloadAllInvestorsReport}
              className="bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white px-3 sm:px-4 py-2 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 text-sm sm:text-base whitespace-nowrap hover:shadow-lg"
            >
              <span>📥</span>
              <span className="sm:hidden">Unduh</span>
              <span className="hidden sm:inline">Unduh Semua PDF</span>
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-6 hover:shadow-xl hover:scale-105 transition-all duration-300">
            <div>
              <p className="text-sm font-medium text-[#889063] dark:text-gray-200 transition-colors duration-300">
                👥 Total Investor
              </p>
              <p className="text-2xl font-bold text-[#324D3E] dark:text-white transition-colors duration-300">
                {reportData.summary.totalInvestors}
              </p>
            </div>
          </div>

          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-6 hover:shadow-xl hover:scale-105 transition-all duration-300">
            <div>
              <p className="text-sm font-medium text-[#889063] dark:text-gray-200 transition-colors duration-300">
                🌳 Total Instansi Tanaman
              </p>
              <p className="text-2xl font-bold text-[#4C3D19] dark:text-emerald-300 transition-colors duration-300">
                {reportData.summary.totalTrees}
              </p>
            </div>
          </div>

          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-6 hover:shadow-xl hover:scale-105 transition-all duration-300">
            <div>
              <p className="text-sm font-medium text-[#889063] dark:text-gray-200 transition-colors duration-300">
                🚨 Investor Tidak Aktif
              </p>
              <p className="text-2xl font-bold text-[#889063] dark:text-gray-200 transition-colors duration-300">
                {reportData.summary.inactiveInvestors || 0}
              </p>
            </div>
          </div>

          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-6 hover:shadow-xl hover:scale-105 transition-all duration-300">
            <div>
              <p className="text-sm font-medium text-[#889063] dark:text-gray-200 transition-colors duration-300">
                ✅ Investor Aktif
              </p>
              <p className="text-2xl font-bold text-[#4C3D19] dark:text-emerald-300 transition-colors duration-300">
                {reportData.summary.activeInvestors}
              </p>
            </div>
          </div>
        </div>

        {/* Search and Pagination Info */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-4 lg:p-6 transition-colors duration-300">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="flex-1 w-full lg:w-auto">
              <input
                type="text"
                placeholder="Cari investor berdasarkan nama atau email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-[#324D3E]/20 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#324D3E]/20 focus:border-[#324D3E] text-[#324D3E] dark:text-white placeholder-[#889063] dark:placeholder-gray-300 bg-white dark:bg-gray-700 transition-all duration-300"
              />
            </div>
            {reportData?.pagination && reportData.pagination.totalItems > 0 && (
              <div className="text-sm text-[#889063] dark:text-gray-200 whitespace-nowrap">
                Menampilkan {reportData.pagination.startIndex}-
                {reportData.pagination.endIndex} dari{" "}
                {reportData.pagination.totalItems} investor
                {searchTerm && ` (hasil pencarian untuk "${searchTerm}")`}
              </div>
            )}
          </div>
        </div>

        {/* Investor Reports */}
        <div className="space-y-4">
          {reports.length === 0 ? (
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-8 text-center text-[#889063] dark:text-gray-200 transition-colors duration-300">
              {searchTerm
                ? "Tidak ada investor yang sesuai dengan pencarian"
                : "Belum ada data investor"}
            </div>
          ) : (
            reports.map((report) => (
              <div
                key={report.investor._id}
                className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 overflow-hidden transition-colors duration-300"
              >
                {/* Investor Header */}
                <div className="p-4 lg:p-6 border-b border-[#324D3E]/10 dark:border-gray-600 transition-colors duration-300">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          {report.investor.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg lg:text-xl font-bold text-[#324D3E] dark:text-white font-[family-name:var(--font-poppins)] transition-colors duration-300">
                          {report.investor.name}
                        </h3>
                        <p className="text-sm text-[#889063] dark:text-gray-200 transition-colors duration-300">
                          {report.investor.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <span
                        className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                          report.investor.status === "active"
                            ? "bg-[#4C3D19]/10 dark:bg-[#4C3D19]/20 text-[#4C3D19] dark:text-emerald-300 border border-[#4C3D19]/20 dark:border-emerald-600/50"
                            : "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300"
                        }`}
                      >
                        {report.investor.status === "active"
                          ? "Aktif"
                          : "Tidak Aktif"}
                      </span>
                      <button
                        onClick={() => downloadIndividualInvestorReport(report)}
                        className="bg-[#324D3E]/10 dark:bg-[#324D3E]/20 hover:bg-[#324D3E]/20 dark:hover:bg-[#324D3E]/30 text-[#324D3E] dark:text-white px-3 py-1 rounded-xl text-sm font-medium transition-colors hover:shadow-sm"
                      >
                        📥 Unduh PDF
                      </button>
                    </div>
                  </div>
                </div>

                {/* Administrative Summary */}
                <div className="p-4 lg:p-6 bg-gradient-to-r from-[#324D3E]/5 to-[#4C3D19]/5 dark:from-gray-700/50 dark:to-gray-600/50 border-b border-[#324D3E]/10 dark:border-gray-600 transition-colors duration-300">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-[#324D3E] dark:text-white transition-colors duration-300">
                        {report.investor.jumlahPohon || 0}
                      </p>
                      <p className="text-sm text-[#889063] dark:text-gray-200 transition-colors duration-300">
                        Tanaman Terdaftar
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-[#4C3D19] dark:text-emerald-300 transition-colors duration-300">
                        {report.statistics.total}
                      </p>
                      <p className="text-sm text-[#889063] dark:text-gray-200 transition-colors duration-300">
                        Instansi Tanaman
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-[#889063] dark:text-gray-300 transition-colors duration-300">
                        {Object.entries(report.statistics.byCondition).reduce(
                          (total, [status, count]) =>
                            status.toLowerCase() !== "sakit"
                              ? total + count
                              : total,
                          0
                        )}
                      </p>
                      <p className="text-sm text-[#889063] dark:text-gray-200 transition-colors duration-300">
                        Tanaman Sehat
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tree Details Toggle */}
                <div className="p-4 lg:p-6">
                  <button
                    onClick={() => toggleExpanded(report.investor._id)}
                    className="flex items-center justify-between w-full text-left hover:bg-[#324D3E]/5 dark:hover:bg-gray-600/30 p-2 rounded-xl transition-colors"
                  >
                    <span className="text-lg font-medium text-[#324D3E] dark:text-white font-[family-name:var(--font-poppins)] transition-colors duration-300">
                      Detail Instansi Tanaman ({report.statistics.total})
                    </span>
                    <span
                      className={`transform transition-transform duration-200 text-[#324D3E] dark:text-white ${
                        expandedInvestor === report.investor._id
                          ? "rotate-180"
                          : ""
                      }`}
                    >
                      ▼
                    </span>
                  </button>

                  {/* Expanded Tree Details */}
                  {expandedInvestor === report.investor._id && (
                    <div className="mt-4 space-y-4">
                      {report.trees.length === 0 ? (
                        <p className="text-center py-4 text-gray-500 dark:text-gray-200 transition-colors duration-300">
                          Tidak ada instansi tanaman yang ditugaskan untuk
                          investor ini
                        </p>
                      ) : (
                        <>
                          {/* Plant Type Summary */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                            {Object.entries(report.statistics.bySpecies).map(
                              ([plantType, count]) => (
                                <div
                                  key={plantType}
                                  className="bg-gradient-to-r from-[#324D3E]/10 to-[#4C3D19]/10 dark:from-gray-700/50 dark:to-gray-600/50 p-3 rounded-xl border border-[#324D3E]/20 dark:border-gray-600/50 transition-colors duration-300"
                                >
                                  <p className="font-medium text-[#324D3E] dark:text-white capitalize transition-colors duration-300">
                                    {plantType}
                                  </p>
                                  <p className="text-sm text-[#889063] dark:text-gray-200 transition-colors duration-300">
                                    {count} instansi
                                  </p>
                                </div>
                              )
                            )}
                          </div>

                          {/* Plant Instance List */}
                          <div className="overflow-x-auto">
                            {loadingPlantAges[report.investor._id] ? (
                              <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#324D3E]"></div>
                                <span className="ml-2 text-[#889063]">
                                  Memuat data umur tanaman...
                                </span>
                              </div>
                            ) : (
                              <table className="w-full text-sm">
                                <thead className="bg-[#324D3E]/5 dark:bg-gray-700/50 transition-colors duration-300">
                                  <tr>
                                    <th className="px-3 py-2 text-left font-medium text-[#324D3E] dark:text-white transition-colors duration-300">
                                      Nomor Kontrak
                                    </th>
                                    <th className="px-3 py-2 text-left font-medium text-[#324D3E] dark:text-white transition-colors duration-300">
                                      Nama Instansi
                                    </th>
                                    <th className="px-3 py-2 text-left font-medium text-[#324D3E] dark:text-white hidden sm:table-cell transition-colors duration-300">
                                      Lokasi
                                    </th>
                                    <th className="px-3 py-2 text-left font-medium text-[#324D3E] dark:text-white transition-colors duration-300">
                                      Umur Detail
                                    </th>
                                    <th className="px-3 py-2 text-left font-medium text-[#324D3E] dark:text-white hidden lg:table-cell transition-colors duration-300">
                                      Jenis
                                    </th>
                                    <th className="px-3 py-2 text-left font-medium text-[#324D3E] dark:text-white hidden sm:table-cell transition-colors duration-300">
                                      Tanam
                                    </th>
                                    <th className="px-3 py-2 text-left font-medium text-[#324D3E] dark:text-white transition-colors duration-300">
                                      Status
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[#324D3E]/10 dark:divide-gray-600 transition-colors duration-300">
                                  {(
                                    detailedPlantData[report.investor._id] ||
                                    report.trees
                                  ).map((tree) => {
                                    const isDetailed =
                                      detailedPlantData[report.investor._id];
                                    return (
                                      <tr
                                        key={tree._id}
                                        className="hover:bg-[#324D3E]/5 dark:hover:bg-gray-600/30 transition-colors"
                                      >
                                        <td className="px-3 py-2">
                                          <p className="font-medium text-[#324D3E] dark:text-white transition-colors duration-300">
                                            {tree.nomorKontrak}
                                          </p>
                                        </td>
                                        <td className="px-3 py-2">
                                          <div>
                                            <p className="font-medium text-[#324D3E] dark:text-white transition-colors duration-300">
                                              {tree.spesiesPohon}
                                            </p>
                                            <p className="text-xs text-[#889063] dark:text-gray-200 sm:hidden transition-colors duration-300">
                                              {tree.lokasi}
                                            </p>
                                          </div>
                                        </td>
                                        <td className="px-3 py-2 text-[#889063] dark:text-gray-200 hidden sm:table-cell transition-colors duration-300">
                                          {tree.lokasi}
                                        </td>
                                        <td className="px-3 py-2">
                                          <div className="text-[#324D3E] dark:text-white transition-colors duration-300">
                                            {isDetailed && tree.detailedAge ? (
                                              tree.ageSource ===
                                              "tanamBibit" ? (
                                                <div>
                                                  <div className="font-medium">
                                                    {formatDetailedAge(
                                                      tree.detailedAge
                                                    )}
                                                  </div>
                                                  <div className="text-xs text-[#889063] dark:text-gray-300">
                                                    ({formatNumber(tree.umur)}{" "}
                                                    bulan)
                                                  </div>
                                                </div>
                                              ) : (
                                                <div>
                                                  <div className="font-medium text-orange-600 dark:text-orange-400">
                                                    Belum Ditanam
                                                  </div>
                                                </div>
                                              )
                                            ) : (
                                              <span>
                                                {formatNumber(tree.umur)} bulan
                                              </span>
                                            )}
                                          </div>
                                        </td>
                                        <td className="px-3 py-2 text-[#889063] dark:text-gray-200 hidden lg:table-cell capitalize transition-colors duration-300">
                                          {tree.spesiesPohon.split(" ")[0] ||
                                            "Tidak Diketahui"}
                                        </td>
                                        <td className="px-3 py-2 text-[#889063] dark:text-gray-200 hidden sm:table-cell transition-colors duration-300">
                                          {isDetailed ? (
                                            tree.ageSource === "tanamBibit" ? (
                                              <div>
                                                <div>{tree.tanggalTanam}</div>
                                                <div className="text-xs text-green-600 dark:text-green-400">
                                                  ✓ Dari Tanam Bibit
                                                </div>
                                              </div>
                                            ) : (
                                              <div>
                                                <div className="text-orange-600 dark:text-orange-400">
                                                  Belum Ditanam
                                                </div>
                                                <div className="text-xs text-[#889063] dark:text-gray-300">
                                                  Dibuat: {tree.referenceDate}
                                                </div>
                                              </div>
                                            )
                                          ) : (
                                            new Date(
                                              tree.tanggalTanam
                                            ).toLocaleDateString("id-ID")
                                          )}
                                        </td>
                                        <td className="px-3 py-2">
                                          <span
                                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getKondisiBadge(
                                              tree.kondisi
                                            )}`}
                                          >
                                            {getKondisiText(tree.kondisi)}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination Controls */}
        {reportData?.pagination && reportData.pagination.totalPages > 1 && (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-4 lg:p-6 transition-colors duration-300">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-[#889063] dark:text-gray-200">
                Halaman {reportData.pagination.currentPage} dari{" "}
                {reportData.pagination.totalPages}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchReportData(1, debouncedSearchTerm)}
                  disabled={!reportData.pagination.hasPrevPage}
                  className="px-3 py-2 text-sm font-medium text-[#324D3E] dark:text-white bg-white dark:bg-gray-700 border border-[#324D3E]/20 dark:border-gray-600 rounded-xl hover:bg-[#324D3E]/5 dark:hover:bg-gray-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  ««
                </button>

                <button
                  onClick={() =>
                    fetchReportData(currentPage - 1, debouncedSearchTerm)
                  }
                  disabled={!reportData.pagination.hasPrevPage}
                  className="px-3 py-2 text-sm font-medium text-[#324D3E] dark:text-white bg-white dark:bg-gray-700 border border-[#324D3E]/20 dark:border-gray-600 rounded-xl hover:bg-[#324D3E]/5 dark:hover:bg-gray-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  ‹
                </button>

                {/* Page Numbers */}
                {Array.from(
                  { length: Math.min(5, reportData.pagination.totalPages) },
                  (_, i) => {
                    const totalPages = reportData.pagination.totalPages;
                    const currentPage = reportData.pagination.currentPage;
                    let pageNum;

                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    const isActive = pageNum === currentPage;

                    return (
                      <button
                        key={pageNum}
                        onClick={() =>
                          fetchReportData(pageNum, debouncedSearchTerm)
                        }
                        className={`px-3 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                          isActive
                            ? "bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white"
                            : "text-[#324D3E] dark:text-white bg-white dark:bg-gray-700 border border-[#324D3E]/20 dark:border-gray-600 hover:bg-[#324D3E]/5 dark:hover:bg-gray-600/30"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                )}

                <button
                  onClick={() =>
                    fetchReportData(currentPage + 1, debouncedSearchTerm)
                  }
                  disabled={!reportData.pagination.hasNextPage}
                  className="px-3 py-2 text-sm font-medium text-[#324D3E] dark:text-white bg-white dark:bg-gray-700 border border-[#324D3E]/20 dark:border-gray-600 rounded-xl hover:bg-[#324D3E]/5 dark:hover:bg-gray-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  ›
                </button>

                <button
                  onClick={() =>
                    fetchReportData(
                      reportData.pagination.totalPages,
                      debouncedSearchTerm
                    )
                  }
                  disabled={!reportData.pagination.hasNextPage}
                  className="px-3 py-2 text-sm font-medium text-[#324D3E] dark:text-white bg-white dark:bg-gray-700 border border-[#324D3E]/20 dark:border-gray-600 rounded-xl hover:bg-[#324D3E]/5 dark:hover:bg-gray-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  »»
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
