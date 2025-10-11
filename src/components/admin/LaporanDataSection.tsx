"use client";

import { useState, useEffect } from "react";
import {
  ChevronDown,
  RefreshCw,
} from "lucide-react";
import { useTheme } from "next-themes";

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
  blok?: string;
  kavling?: string;
  status: string;
  history?: any[];
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
  payment?: {
    _id: string;
    orderId: string;
    transactionId?: string;
    amount: number;
    paymentType: string;
    transactionStatus?: string;
    productName?: string;
    referralCode?: string;
    createdAt: string;
    transactionTime?: string;
    settlementTime?: string;
    dueDate?: string;
    installmentNumber?: number;
    adminStatus?: string;
    status: string;
    cicilanOrderId?: string;
  };
  contract?: {
    _id: string;
    contractId: string;
    contractNumber: string;
    contractDate: string;
    totalAmount: number;
    paymentType: string;
    status: string;
    productName?: string;
  };
  trees: Tree[];
  payments?: any[];
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

interface LaporanDataSectionProps {
  searchTerm: string;
  debouncedSearchTerm: string;
  itemsPerPage: number;
}

export function LaporanDataSection({
  searchTerm,
  debouncedSearchTerm,
  itemsPerPage,
}: LaporanDataSectionProps) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedInvestor, setExpandedInvestor] = useState<string | null>(null);
  const [detailedPlantData, setDetailedPlantData] = useState<
    Record<string, any[]>
  >({});
  const [loadingPlantAges, setLoadingPlantAges] = useState<
    Record<string, boolean>
  >({});
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getThemeClasses = (base: string, pink = "") => {
    if (!mounted) return base;
    return theme === "pink" ? `${base} ${pink}` : base;
  };

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

  // Fetch data when debounced search term changes
  useEffect(() => {
    if (debouncedSearchTerm !== searchTerm) return;
    fetchReportData(1, debouncedSearchTerm);
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
      case "mati":
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

    if (isExpanding) {
      fetchDetailedPlantAges(investorId);
    }
  };

  const reports = reportData?.reports || [];

  if (loading) {
    return (
      <div
        className={getThemeClasses(
          "bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-8 text-center transition-colors duration-300",
          "!bg-white/95 !border-[#FFC1CC]/30"
        )}
      >
        <div className="flex items-center justify-center">
          <RefreshCw className="w-8 h-8 animate-spin text-[#324D3E] dark:text-white" />
          <span className="ml-3 text-[#889063] dark:text-gray-200">
            Memuat data...
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Pagination Info */}
      {reportData?.pagination && reportData.pagination.totalItems > 0 && (
        <div
          className={getThemeClasses(
            "bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-4 transition-colors duration-300",
            "!bg-white/95 !border-[#FFC1CC]/30"
          )}
        >
          <div className="text-sm text-[#889063] dark:text-gray-200">
            Menampilkan {reportData.pagination.startIndex}-
            {reportData.pagination.endIndex} dari{" "}
            {reportData.pagination.totalItems} investor
            {searchTerm && ` (hasil pencarian untuk "${searchTerm}")`}
          </div>
        </div>
      )}

      {/* Investor Reports */}
      <div className="space-y-4">
        {reports.length === 0 ? (
          <div
            className={getThemeClasses(
              "bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-8 text-center text-[#889063] dark:text-gray-200 transition-colors duration-300",
              "!bg-white/95 !border-[#FFC1CC]/30 !text-[#4c1d1d]"
            )}
          >
            {searchTerm
              ? "Tidak ada investor yang sesuai dengan pencarian"
              : "Belum ada data investor"}
          </div>
        ) : (
          Object.values(
            (reports as any[])
              .filter(
                (report: any) =>
                  report?.investor?._id && report?.investor?.name
              )
              .reduce((groupedReports: Record<string, any>, report: any) => {
                const investorId = report.investor._id;

                const incoming = report?.statistics || {
                  total: 0,
                  byCondition: {},
                  bySpecies: {},
                };
                const parseStats = (s: any) => {
                  const total = Number(s?.total) || 0;
                  const byCondition: Record<string, number> = {};
                  const bySpecies: Record<string, number> = {};

                  if (s?.byCondition && typeof s.byCondition === "object") {
                    Object.entries(s.byCondition).forEach(([k, v]) => {
                      const key = String(k || "")
                        .trim()
                        .toLowerCase();
                      byCondition[key] =
                        (byCondition[key] || 0) + (Number(v) || 0);
                    });
                  }

                  if (s?.bySpecies && typeof s.bySpecies === "object") {
                    Object.entries(s.bySpecies).forEach(([k, v]) => {
                      const key = String(k || "").trim();
                      bySpecies[key] = (bySpecies[key] || 0) + (Number(v) || 0);
                    });
                  }

                  return { total, byCondition, bySpecies };
                };

                const incomingStats = parseStats(incoming);

                if (!groupedReports[investorId]) {
                  groupedReports[investorId] = {
                    investor: report.investor,
                    payments: report.payment ? [report.payment] : [],
                    trees: Array.isArray(report.trees)
                      ? report.trees.slice()
                      : [],
                    statistics: incomingStats,
                    contract: report.contract,
                  };
                } else {
                  groupedReports[investorId].payments.push(report.payment);

                  if (
                    !groupedReports[investorId].contract &&
                    report.contract
                  ) {
                    groupedReports[investorId].contract = report.contract;
                  }

                  if (Array.isArray(report.trees)) {
                    const existingTreeIds = new Set(
                      groupedReports[investorId].trees.map((t: any) =>
                        String(t._id || "")
                      )
                    );
                    const newTrees = report.trees.filter(
                      (tree: any) =>
                        !existingTreeIds.has(String(tree._id || ""))
                    );
                    groupedReports[investorId].trees.push(...newTrees);
                  }

                  const allTrees = groupedReports[investorId].trees;
                  const target = {
                    total: allTrees.length,
                    byCondition: allTrees.reduce((acc: any, tree: any) => {
                      const key = String(tree.kondisi || "")
                        .trim()
                        .toLowerCase();
                      acc[key] = (acc[key] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>),
                    bySpecies: allTrees.reduce((acc: any, tree: any) => {
                      const key = String(tree.spesiesPohon || "")
                        .split(" - ")[0]
                        .trim()
                        .toLowerCase();
                      acc[key] = (acc[key] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>),
                  };

                  groupedReports[investorId].statistics = target;
                }

                return groupedReports;
              }, {} as Record<string, any>)
          ).map((groupedReport: any) => (
            <div
              key={`${groupedReport.investor._id}-${groupedReport.investor.name}`}
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 overflow-hidden transition-colors duration-300"
            >
              {/* Investor Header */}
              <div
                className={getThemeClasses(
                  "p-4 lg:p-6 border-b border-[#324D3E]/10 dark:border-gray-600 transition-colors duration-300",
                  "!border-[#FFC1CC]/30"
                )}
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={getThemeClasses(
                        "w-12 h-12 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] rounded-full flex items-center justify-center",
                        "!bg-gradient-to-r !from-[#FFC1CC] !to-[#FFDEE9]"
                      )}
                    >
                      <span className="text-white font-bold text-lg">
                        {groupedReport.investor?.name?.charAt(0) || "U"}
                      </span>
                    </div>
                    <div>
                      <h3
                        className={getThemeClasses(
                          "text-lg lg:text-xl font-bold text-[#324D3E] dark:text-white font-[family-name:var(--font-poppins)] transition-colors duration-300",
                          "!text-[#4c1d1d]"
                        )}
                      >
                        {groupedReport.investor.name}
                      </h3>
                      <p className="text-sm text-[#889063] dark:text-gray-200 transition-colors duration-300">
                        {groupedReport.investor.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <span
                      className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                        groupedReport.investor.status === "active"
                          ? "bg-[#4C3D19]/10 dark:bg-[#4C3D19]/20 text-[#4C3D19] dark:text-emerald-300 border border-[#4C3D19]/20 dark:border-emerald-600/50"
                          : "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300"
                      }`}
                    >
                      {groupedReport.investor.status === "active"
                        ? "Aktif"
                        : "Tidak Aktif"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Administrative Summary */}
              <div
                className={getThemeClasses(
                  "p-4 lg:p-6 bg-gradient-to-r from-[#324D3E]/5 to-[#4C3D19]/5 dark:from-gray-700/50 dark:to-gray-600/50 border-b border-[#324D3E]/10 dark:border-gray-600 transition-colors duration-300",
                  "!bg-gradient-to-r !from-[#FFC1CC]/10 !to-[#FFDEE9]/10"
                )}
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[#324D3E] dark:text-white transition-colors duration-300">
                      {groupedReport.investor.jumlahPohon ||
                        (groupedReport.trees?.length ?? 0)}
                    </p>
                    <p className="text-sm text-[#889063] dark:text-gray-200 transition-colors duration-300">
                      Tanaman Terdaftar
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[#4C3D19] dark:text-emerald-300 transition-colors duration-300">
                      {groupedReport.statistics?.total ||
                        (groupedReport.trees?.length ?? 0)}
                    </p>
                    <p className="text-sm text-[#889063] dark:text-gray-200 transition-colors duration-300">
                      Instansi Tanaman
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[#889063] dark:text-gray-300 transition-colors duration-300">
                      {(groupedReport.trees || []).reduce(
                        (total: number, tree: any) => {
                          const statusVal = String(tree.status || "")
                            .trim()
                            .toLowerCase();
                          const unhealthy = ["sakit", "mati"];
                          return unhealthy.includes(statusVal)
                            ? total
                            : total + 1;
                        },
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
                  onClick={() => toggleExpanded(groupedReport.investor._id)}
                  className={getThemeClasses(
                    "flex items-center justify-between w-full text-left hover:bg-[#324D3E]/5 dark:hover:bg-gray-600/30 p-2 rounded-xl transition-colors",
                    "!hover:bg-[#FFD7E0]/30"
                  )}
                >
                  <span className="text-lg font-medium text-[#324D3E] dark:text-white font-[family-name:var(--font-poppins)] transition-colors duration-300">
                    Detail Instansi Tanaman ({groupedReport.statistics.total})
                  </span>
                  <ChevronDown
                    className={`transform transition-transform duration-200 text-[#324D3E] dark:text-white ${
                      expandedInvestor === groupedReport.investor._id
                        ? "rotate-180"
                        : ""
                    } w-5 h-5`}
                  />
                </button>

                {/* Expanded Tree Details */}
                {expandedInvestor === groupedReport.investor._id && (
                  <div className="mt-4 space-y-4">
                    {groupedReport.trees.length === 0 ? (
                      <p className="text-center py-4 text-gray-500 dark:text-gray-200 transition-colors duration-300">
                        Tidak ada instansi tanaman yang ditugaskan untuk
                        investor ini
                      </p>
                    ) : (
                      <>
                        {/* Plant Type Summary */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                          {Object.entries(
                            groupedReport.statistics.bySpecies
                          ).map(([plantType, count]) => (
                            <div
                              key={plantType}
                              className="bg-gradient-to-r from-[#324D3E]/10 to-[#4C3D19]/10 dark:from-gray-700/50 dark:to-gray-600/50 p-3 rounded-xl border border-[#324D3E]/20 dark:border-gray-600/50 transition-colors duration-300"
                            >
                              <p className="font-medium text-[#324D3E] dark:text-white capitalize transition-colors duration-300">
                                {plantType}
                              </p>
                              <p className="text-sm text-[#889063] dark:text-gray-200 transition-colors duration-300">
                                {String(count)} instansi
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* Plant Instance List */}
                        <div className="overflow-x-auto">
                          {loadingPlantAges[groupedReport.investor._id] ? (
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
                                    Tanggal Tanam
                                  </th>
                                  <th className="px-3 py-2 text-left font-medium text-[#324D3E] dark:text-white transition-colors duration-300">
                                    Status
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#324D3E]/10 dark:divide-gray-600 transition-colors duration-300">
                                {(
                                  detailedPlantData[groupedReport.investor._id] ||
                                  groupedReport.trees
                                ).map((tree: any) => {
                                  const isDetailed =
                                    detailedPlantData[groupedReport.investor._id];
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
                                            tree.ageSource === "tanamBibit" ? (
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
                                            tree.status
                                          )}`}
                                        >
                                          {getKondisiText(tree.status)}
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
        <div
          className={getThemeClasses(
            "bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-4 lg:p-6 transition-colors duration-300",
            "!bg-white/95 !border-[#FFC1CC]/30"
          )}
        >
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

              {Array.from(
                { length: Math.min(5, reportData.pagination.totalPages) },
                (_, i) => {
                  const totalPages = reportData.pagination.totalPages;
                  const currentPageNum = reportData.pagination.currentPage;
                  let pageNum;

                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPageNum <= 3) {
                    pageNum = i + 1;
                  } else if (currentPageNum >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPageNum - 2 + i;
                  }

                  const isActive = pageNum === currentPageNum;

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
    </>
  );
}
