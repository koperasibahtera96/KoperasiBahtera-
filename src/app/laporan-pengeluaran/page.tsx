"use client";

import { FinanceSidebar } from "@/components/finance/FinanceSidebar";
import { Button } from "@/components/ui-finance/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui-finance/card";
import { useAlert } from "@/components/ui/Alert";
import type { PlantInstance } from "@/lib/api";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  ChevronDown,
  DollarSign,
  Download,
  Filter,
  TrendingDown,
  TrendingUp, // <-- tambahan icon untuk mode pendapatan
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "next-themes";

const BRUTALIST_COLORS = [
  "#FF6B35",
  "#F7931E",
  "#FFD23F",
  "#06FFA5",
  "#118AB2",
  "#073B4C",
  "#EF476F",
  "#FFB3C6",
];

interface PlantType {
  id: string;
  name: string;
  displayName: string;
}

export default function LaporanPengeluaranPage() {
  const [plantInstances, setPlantInstances] = useState<PlantInstance[]>([]);
  const [plantTypes, setPlantTypes] = useState<PlantType[]>([]);
  const [selectedYear, setSelectedYear] = useState(2025);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedPlant, setSelectedPlant] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const _filename = "laporan-pengeluaran.xls"; // Declare the filename variable
  const { showError, AlertComponent } = useAlert();
  const { theme, systemTheme } = useTheme();
  const isDark = (theme === "system" ? systemTheme : theme) === "dark";

  // === Toggle Laporan ===
  const [mode, setMode] = useState<"expense" | "income">("expense");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Fetch plant instances for expense/income data
      const plantsResponse = await fetch("/api/plants");
      if (!plantsResponse.ok) throw new Error("Failed to fetch plants");
      const instances = await plantsResponse.json();
      setPlantInstances(instances);

      // Fetch plant types for filter dropdown
      try {
        const typesResponse = await fetch("/api/plant-types");
        if (typesResponse.ok) {
          const types = await typesResponse.json();
          setPlantTypes(types);
        } else {
          // Fallback: extract unique plant types from instances
          const uniqueTypes = Array.from(
            new Set(instances.map((plant: PlantInstance) => plant.plantType))
          ).map((type: any) => ({
            id: type,
            name: type,
            displayName: type.charAt(0).toUpperCase() + type.slice(1),
          }));
          setPlantTypes(uniqueTypes);
        }
      } catch (error) {
        console.error("Failed to fetch plant types, using fallback:", error);
        // Fallback: extract unique plant types from instances
        const uniqueTypes = Array.from(
          new Set(instances.map((plant: PlantInstance) => plant.plantType))
        ).map((type: any) => ({
          id: type,
          name: type,
          displayName: type.charAt(0).toUpperCase() + type.slice(1),
        }));
        setPlantTypes(uniqueTypes);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
      setPlantInstances([]);
      setPlantTypes([]);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
      .format(amount)
      .replace("IDR", "Rp");
  };

  // ===================== EXPENSE (existing) =====================
  const filteredExpenses = plantInstances
    .filter(
      (plant) => selectedPlant === "all" || plant.plantType === selectedPlant
    )
    .flatMap((plant) =>
      (plant.operationalCosts || [])
        .filter((cost) => {
          const costDate = new Date(cost.date);
          const yearMatch = costDate.getFullYear() === selectedYear;
          const monthMatch =
            selectedMonth === null || costDate.getMonth() + 1 === selectedMonth;
          return yearMatch && monthMatch;
        })
        .map((cost) => ({
          ...cost,
          plantName: plant.instanceName,
          plantType: plant.plantType,
        }))
    );

  const totalExpenses = filteredExpenses.reduce(
    (sum, expense) => sum + expense.amount,
    0
  );

  const expensesByPlant = plantTypes.map((plantType) => {
    const typeExpenses = plantInstances
      .filter((plant) => plant.plantType === plantType.name)
      .flatMap((plant) => plant.operationalCosts || [])
      .filter((cost) => {
        const costDate = new Date(cost.date);
        return costDate.getFullYear() === selectedYear;
      })
      .reduce((sum, cost) => sum + cost.amount, 0);

    return {
      name: plantType.displayName,
      value: typeExpenses,
      color:
        BRUTALIST_COLORS[
          plantTypes.indexOf(plantType) % BRUTALIST_COLORS.length
        ],
    };
  });

  const monthlyTrends = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const monthExpenses = filteredExpenses
      .filter((expense) => {
        const expenseDate = new Date(expense.date);
        return expenseDate.getMonth() + 1 === month;
      })
      .reduce((sum, expense) => sum + expense.amount, 0);

    return {
      month: new Date(selectedYear, i, 1).toLocaleDateString("id-ID", {
        month: "short",
      }),
      expenses: monthExpenses,
    };
  });

  // ===================== INCOME (baru, mirror) =====================
  const filteredIncome = plantInstances
    .filter(
      (plant) => selectedPlant === "all" || plant.plantType === selectedPlant
    )
    .flatMap((plant) =>
      (plant.incomeRecords || [])
        .filter((inc) => {
          const d = new Date(inc.date);
          const yearMatch = d.getFullYear() === selectedYear;
          const monthMatch =
            selectedMonth === null || d.getMonth() + 1 === selectedMonth;
          return yearMatch && monthMatch;
        })
        .map((inc) => ({
          ...inc,
          plantName: plant.instanceName,
          plantType: plant.plantType,
        }))
    );

  const totalIncome = filteredIncome.reduce(
    (sum, income) => sum + income.amount,
    0
  );

  const incomeByPlant = plantTypes.map((plantType) => {
    const typeIncome = plantInstances
      .filter((plant) => plant.plantType === plantType.name)
      .flatMap((plant) => plant.incomeRecords || [])
      .filter((inc) => {
        const d = new Date(inc.date);
        return d.getFullYear() === selectedYear;
      })
      .reduce((sum, inc) => sum + inc.amount, 0);

    return {
      name: plantType.displayName,
      value: typeIncome,
      color:
        BRUTALIST_COLORS[
          plantTypes.indexOf(plantType) % BRUTALIST_COLORS.length
        ],
    };
  });

  const monthlyTrendsIncome = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const monthIncome = filteredIncome
      .filter((inc) => {
        const d = new Date(inc.date);
        return d.getMonth() + 1 === month;
      })
      .reduce((sum, inc) => sum + inc.amount, 0);

    // gunakan key "expenses" agar chart lama tetap jalan tanpa ubah prop
    return {
      month: new Date(selectedYear, i, 1).toLocaleDateString("id-ID", {
        month: "short",
      }),
      expenses: monthIncome,
    };
  });

  // ===================== EXPORT (switch by mode) =====================
  const handleExportCSV = async () => {
    try {
      const allPlantsResponse = await fetch("/api/plants");
      const allPlants: PlantInstance[] = await allPlantsResponse.json();

      const relevantPlants =
        selectedPlant === "all"
          ? allPlants
          : allPlants.filter((plant) => plant.plantType === selectedPlant);

      const isExpense = mode === "expense";

      // totals & transactions
      const total = relevantPlants.reduce((sum, plant) => {
        const arr = isExpense
          ? plant.operationalCosts || []
          : plant.incomeRecords || [];
        const subtotal = arr
          .filter((it) => {
            const d = new Date(it.date);
            const yearMatch = d.getFullYear() === selectedYear;
            const monthMatch =
              selectedMonth === null || d.getMonth() + 1 === selectedMonth;
            return yearMatch && monthMatch;
          })
          .reduce((s, it) => s + (it.amount || 0), 0);
        return sum + subtotal;
      }, 0);

      const totalTransactions = relevantPlants.reduce((sum, plant) => {
        const arr = isExpense
          ? plant.operationalCosts || []
          : plant.incomeRecords || [];
        const count = arr.filter((it) => {
          const d = new Date(it.date);
          const yearMatch = d.getFullYear() === selectedYear;
          const monthMatch =
            selectedMonth === null || d.getMonth() + 1 === selectedMonth;
          return yearMatch && monthMatch;
        }).length;
        return sum + count;
      }, 0);

      const average =
        totalTransactions > 0 ? total / totalTransactions : 0;

      // monthly rows
      const monthlyRows = Array.from({ length: 12 }, (_, monthIndex) => {
        const month = monthIndex + 1;
        const monthName = new Date(
          selectedYear,
          monthIndex,
          1
        ).toLocaleDateString("id-ID", {
          month: "long",
          year: "numeric",
        });

        const mTotal = relevantPlants.reduce((sum, plant) => {
          const arr = isExpense
            ? plant.operationalCosts || []
            : plant.incomeRecords || [];
          const subtotal = arr
            .filter((it) => {
              const d = new Date(it.date);
              return (
                d.getFullYear() === selectedYear && d.getMonth() + 1 === month
              );
            })
            .reduce((s, it) => s + (it.amount || 0), 0);
        return sum + subtotal;
        }, 0);

        const mCount = relevantPlants.reduce((sum, plant) => {
          const arr = isExpense
            ? plant.operationalCosts || []
            : plant.incomeRecords || [];
          const count = arr.filter((it) => {
            const d = new Date(it.date);
            return (
              d.getFullYear() === selectedYear && d.getMonth() + 1 === month
            );
          }).length;
          return sum + count;
        }, 0);

        return {
          monthName,
          expenses: mTotal,
          transactions: mCount,
        };
      });

      // detail rows
      const allRows = relevantPlants
        .flatMap((plant) =>
          (isExpense
            ? plant.operationalCosts || []
            : plant.incomeRecords || []
          )
            .filter((it) => {
              const d = new Date(it.date);
              const yearMatch = d.getFullYear() === selectedYear;
              const monthMatch =
                selectedMonth === null || d.getMonth() + 1 === selectedMonth;
              return yearMatch && monthMatch;
            })
            .map((it) => ({
              ...it,
              plantName: plant.instanceName,
              plantType: plant.plantType,
            }))
        )
        .sort(
          (a: any, b: any) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );

      const title = isExpense ? "Laporan Pengeluaran" : "Laporan Pendapatan";
      const labelValue = isExpense ? "Pengeluaran" : "Pendapatan";

      let html = `
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
            th { background-color: #90EE90; font-weight: bold; padding: 8px; border: 2px solid #000000; text-align: left; }
            td { padding: 8px; border: 1px solid #000000; }
            .header { font-size: 18px; font-weight: bold; margin: 20px 0 10px 0; }
            .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
            .period { font-size: 14px; margin-bottom: 20px; color: #666; }
          </style>
        </head>
        <body>
      `;

      html += `<div class="title">${title} - ${
        selectedPlant === "all"
          ? "Semua Tanaman"
          : selectedPlant.charAt(0).toUpperCase() + selectedPlant.slice(1)
      }</div>`;
      html += `<div class="period">Periode: ${
        selectedMonth
          ? `${new Date(selectedYear, selectedMonth - 1, 1).toLocaleDateString(
              "id-ID",
              { month: "long" }
            )} `
          : ""
      }${selectedYear}</div>`;

      // RINGKASAN
      html += `<div class="header">RINGKASAN ${labelValue.toUpperCase()}</div>`;
      html += `<table>`;
      html += `<tr><th>Keterangan</th><th>Nilai</th></tr>`;
      html += `<tr><td>Total ${labelValue}</td><td>Rp ${total.toLocaleString(
        "id-ID"
      )}</td></tr>`;
      html += `<tr><td>Jumlah Transaksi</td><td>${totalTransactions}</td></tr>`;
      html += `<tr><td>Rata-rata per Transaksi</td><td>Rp ${average.toLocaleString(
        "id-ID"
      )}</td></tr>`;
      html += `<tr><td>Periode</td><td>${
        selectedMonth
          ? `${new Date(selectedYear, selectedMonth - 1, 1).toLocaleDateString(
              "id-ID",
              { month: "long" }
            )} ${selectedYear}`
          : selectedYear
      }</td></tr>`;
      html += `</table>`;

      // BULANAN
      html += `<div class="header">${labelValue.toUpperCase()} BULANAN ${selectedYear}</div>`;
      html += `<table>`;
      html += `<tr><th>Bulan</th><th>Total ${labelValue}</th><th>Jumlah Transaksi</th><th>Rata-rata per Transaksi</th></tr>`;
      monthlyRows.forEach((data) => {
        const avgPerTransaction =
          data.transactions > 0 ? data.expenses / data.transactions : 0;
        html += `<tr><td>${
          data.monthName
        }</td><td>Rp ${data.expenses.toLocaleString("id-ID")}</td><td>${
          data.transactions
        }</td><td>Rp ${avgPerTransaction.toLocaleString("id-ID")}</td></tr>`;
      });
      html += `</table>`;

      // DETAIL
      html += `<div class="header">DETAIL TRANSAKSI ${labelValue.toUpperCase()}</div>`;
      html += `<table>`;
      html += `<tr><th>Tanggal</th><th>Deskripsi</th><th>Jumlah</th><th>Input Oleh</th></tr>`;
      allRows.forEach((row: any) => {
        html += `<tr><td>${new Date(row.date).toLocaleDateString(
          "id-ID"
        )}</td><td>${row.description}</td><td>Rp ${row.amount.toLocaleString(
          "id-ID"
        )}</td><td>${row.addedBy}</td></tr>`;
      });
      html += `</table>`;

      html += `</body></html>`;

      // download
      const blob = new Blob([html], {
        type: "application/vnd.ms-excel;charset=utf-8;",
      });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      const excelFilename =
        (isExpense ? "laporan-pengeluaran" : "laporan-pendapatan") + ".xls";
      link.setAttribute("href", url);
      link.setAttribute("download", excelFilename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export data:", error);
      showError("Error", "Gagal mengekspor data. Silakan coba lagi.");
    }
  };

  if (loading) {
    return (
      <FinanceSidebar>
        <div className="p-4 sm:p-6 lg:p-8 flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#324D3E] dark:border-white mx-auto mb-4"></div>
            <p className="text-[#889063] dark:text-gray-200 text-lg">
              Memuat laporan pengeluaran...
            </p>
          </div>
        </div>
      </FinanceSidebar>
    );
  }

  // ===== Helper pembalik data & label berdasar mode (UI tetap) =====
  const isExpense = mode === "expense";
  const totalPrimary = isExpense ? totalExpenses : totalIncome;
  const listPrimary = isExpense ? filteredExpenses : filteredIncome;
  const piePrimary = isExpense ? expensesByPlant : incomeByPlant;
  const trendPrimary = isExpense ? monthlyTrends : monthlyTrendsIncome;

  return (
    <FinanceSidebar>
      <AlertComponent />
      <div className="p-4 sm:p-6 lg:p-8">
        <motion.div
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center gap-4">
            <Link href="/finance">
              <motion.button
                className="group flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 text-[#324D3E] dark:text-white hover:bg-[#324D3E] hover:text-white transition-all duration-300 self-start"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                <span className="text-sm sm:text-base">Kembali</span>
              </motion.button>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#324D3E] dark:text-white transition-colors duration-300">
                {isExpense ? "Laporan Pengeluaran" : "Laporan Pendapatan"}
              </h1>
              <p className="text-[#889063] dark:text-gray-200 mt-1 text-sm sm:text-base lg:text-lg transition-colors duration-300">
                {isExpense
                  ? "Analisis dan manajemen pengeluaran operasional"
                  : "Analisis dan manajemen pendapatan per tanaman"}
              </p>
            </div>
          </div>

          <div className="flex gap-3 items-center">
            {/* Toggle kecil – tidak mengubah layout utama */}
            <div className="inline-flex rounded-2xl overflow-hidden border border-black/60">
              <button
                className={`px-3 py-1 text-xs font-bold ${
                  isExpense ? "bg-[#FFEAA7]" : "bg-white"
                }`}
                onClick={() => setMode("expense")}
                title="Lihat Pengeluaran"
              >
                Pengeluaran
              </button>
              <button
                className={`px-3 py-1 text-xs font-bold ${
                  !isExpense ? "bg-[#C2F5C0]" : "bg-white"
                }`}
                onClick={() => setMode("income")}
                title="Lihat Pendapatan"
              >
                Pendapatan
              </button>
            </div>

            <motion.button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-green-500 to-[#324D3E] hover:from-green-600 hover:to-[#4C3D19] px-4 py-2 text-sm font-medium text-white transition-all duration-300 shadow-lg hover:shadow-xl"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Download className="h-4 w-4" />
              Export CSV
            </motion.button>
          </div>
        </motion.div>

        <Card className="bg-white/90 dark:bg-gray-800/90 mb-6 border border-[#324D3E]/10 dark:border-gray-700 transition-colors duration-300">
          <CardHeader>
            <CardTitle className="text-black dark:text-white flex items-center gap-2 transition-colors duration-300">
              <Filter className="h-5 w-5" />
              Filter Laporan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-black dark:text-white mb-2 transition-colors duration-300">
                  Tahun
                </label>
                <div className="relative">
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-full border bg-white/90 dark:bg-gray-700/80 border-gray-200 dark:border-gray-600 text-black dark:text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer transition-colors duration-300"
                  >
                    <option value={2024}>2024</option>
                    <option value={2025}>2025</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-gray-300 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-black dark:text-white mb-2 transition-colors duration-300">
                  Bulan
                </label>
                <div className="relative">
                  <select
                    value={selectedMonth || ""}
                    onChange={(e) =>
                      setSelectedMonth(
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                    className="w-full border bg-white/90 dark:bg-gray-700/80 border-gray-200 dark:border-gray-600 text-black dark:text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer transition-colors duration-300"
                  >
                    <option value="">Semua Bulan</option>
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(2025, i, 1).toLocaleDateString("id-ID", {
                          month: "long",
                        })}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-gray-300 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-black dark:text-white mb-2 transition-colors duration-300">
                  Tanaman
                </label>
                <div className="relative">
                  <select
                    value={selectedPlant}
                    onChange={(e) => setSelectedPlant(e.target.value)}
                    className="w-full border bg-white/90 dark:bg-gray-700/80 border-gray-200 dark:border-gray-600 text-black dark:text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer transition-colors duration-300"
                  >
                    <option value="all">Semua Tanaman</option>
                    {plantTypes.map((plantType) => (
                      <option key={plantType.id} value={plantType.name}>
                        {plantType.displayName}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-gray-300 pointer-events-none" />
                </div>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={() => {
                    setSelectedMonth(null);
                    setSelectedPlant("all");
                  }}
                  variant="outline"
                  className="w-full border bg-white/90 dark:bg-gray-700/80 border-gray-200 dark:border-gray-600 text-black dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-300"
                >
                  Reset Filter
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-[#324D3E]/10 dark:border-gray-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-[#889063] dark:text-gray-200 transition-colors duration-300">
                    {isExpense ? "Total Pengeluaran" : "Total Pendapatan"}
                  </div>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${isExpense ? "bg-red-500/10 text-red-600" : "bg-green-500/10 text-green-600"}`}>
                    {isExpense ? <TrendingDown className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />}
                  </div>
                </div>
                <div className={`text-2xl font-bold ${isExpense ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-emerald-400"} transition-colors duration-300`}>
                  {formatCurrency(totalPrimary)}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-[#324D3E]/10 dark:border-gray-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-[#889063] dark:text-gray-200 transition-colors duration-300">Jumlah Transaksi</div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 transition-colors duration-300">
                  {listPrimary.length}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-[#324D3E]/10 dark:border-gray-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-[#889063] dark:text-gray-200 transition-colors duration-300">
                    Rata-rata per Transaksi
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-yellow-500/10 text-yellow-600">
                    <DollarSign className="h-5 w-5" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 transition-colors duration-300">
                  {listPrimary.length > 0
                    ? formatCurrency(totalPrimary / listPrimary.length)
                    : "Rp 0"}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-[#324D3E]/10 dark:border-gray-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-[#889063] dark:text-gray-200 transition-colors duration-300">Periode</div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-green-500/10 text-green-600">
                    <Calendar className="h-5 w-5" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-green-600 dark:text-emerald-400 transition-colors duration-300">
                  {selectedMonth
                    ? `${new Date(
                        selectedYear,
                        selectedMonth - 1,
                        1
                      ).toLocaleDateString("id-ID", {
                        month: "long",
                      })} ${selectedYear}`
                    : selectedYear}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-[#324D3E]/10 dark:border-gray-700 shadow-lg transition-colors duration-300">
              <CardHeader>
                <CardTitle className="text-[#324D3E] dark:text-white transition-colors duration-300">
                  {isExpense ? "Pengeluaran per Tanaman" : "Pendapatan per Tanaman"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={(isExpense ? piePrimary : piePrimary).filter(
                          (plant) => plant.value > 0
                        )}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name}: ${((percent || 0) * 100).toFixed(0)}%`
                        }
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        stroke="#000"
                        strokeWidth={3}
                      >
                        {(isExpense ? piePrimary : piePrimary).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [
                          formatCurrency(value),
                          isExpense ? "Pengeluaran" : "Pendapatan",
                        ]}
                        contentStyle={{
                          backgroundColor: isDark ? "#111827" : "#ffffff",
                          border: isDark ? "3px solid #374151" : "3px solid #000000",
                          borderRadius: "8px",
                          color: isDark ? "#ffffff" : "#000000",
                          fontWeight: "bold",
                          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
          >
            <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-[#324D3E]/10 dark:border-gray-700 shadow-lg transition-colors duration-300">
              <CardHeader>
                <CardTitle className="text-[#324D3E] dark:text-white transition-colors duration-300">
                  {isExpense
                    ? `Tren Pengeluaran Bulanan ${selectedYear}`
                    : `Tren Pendapatan Bulanan ${selectedYear}`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendPrimary}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#4b5563" : "#374151"} />
                      <XAxis
                        dataKey="month"
                        stroke={isDark ? "#d1d5db" : "#9ca3af"}
                        style={{ fontSize: "12px", fontWeight: "bold" }}
                      />
                      <YAxis
                        stroke={isDark ? "#d1d5db" : "#9ca3af"}
                        style={{ fontSize: "12px", fontWeight: "bold" }}
                        tickFormatter={(value) =>
                          `${(value / 1000000).toFixed(0)}M`
                        }
                      />
                      <Tooltip
                        formatter={(value: number) => [
                          formatCurrency(value),
                          isExpense ? "Pengeluaran" : "Pendapatan",
                        ]}
                        contentStyle={{
                          backgroundColor: isDark ? "#111827" : "#ffffff",
                          border: isDark ? "3px solid #374151" : "3px solid #000000",
                          borderRadius: "8px",
                          color: isDark ? "#ffffff" : "#000000",
                          fontWeight: "bold",
                          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="expenses"
                        stroke={isExpense ? (isDark ? "#f87171" : "#ef4444") : (isDark ? "#34d399" : "#10b981")}
                        strokeWidth={4}
                        dot={{
                          fill: isExpense ? (isDark ? "#f87171" : "#ef4444") : (isDark ? "#34d399" : "#10b981"),
                          strokeWidth: 3,
                          stroke: isDark ? "#d1d5db" : "#000",
                          r: 6,
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-[#324D3E]/10 dark:border-gray-700 shadow-lg transition-colors duration-300">
            <CardHeader>
              <CardTitle className="text-[#324D3E] dark:text-white transition-colors duration-300">
                {isExpense ? "Detail Pengeluaran" : "Detail Pendapatan"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {listPrimary.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-[#324D3E]/10 dark:border-gray-600 transition-colors duration-300">
                        <th className="text-left py-3 px-4 text-[#324D3E] dark:text-white font-semibold transition-colors duration-300">
                          Tanggal
                        </th>
                        <th className="text-left py-3 px-4 text-[#324D3E] dark:text-white font-semibold transition-colors duration-300">
                          Deskripsi
                        </th>
                        <th className="text-right py-3 px-4 text-[#324D3E] dark:text-white font-semibold transition-colors duration-300">
                          Jumlah
                        </th>
                        <th className="text-left py-3 px-4 text-[#324D3E] dark:text-white font-semibold transition-colors duration-300">
                          Input Oleh
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {listPrimary
                        .sort(
                          (a, b) =>
                            new Date(b.date).getTime() -
                            new Date(a.date).getTime()
                        )
                        .map((row, index) => (
                          <tr
                            key={index}
                            className={`border-b border-[#324D3E]/5 dark:border-gray-700 ${
                              index % 2 === 0
                                ? "bg-white/40 dark:bg-gray-800/40"
                                : "bg-[#324D3E]/5 dark:bg-gray-700/50"
                            } hover:bg-[#324D3E]/10 dark:hover:bg-gray-700 transition-colors duration-200`}
                          >
                            <td className="py-3 px-4 text-[#324D3E] dark:text-white transition-colors duration-300">
                              {new Date(row.date).toLocaleDateString("id-ID")}
                            </td>
                            <td className="py-3 px-4 text-[#324D3E] dark:text-white transition-colors duration-300">
                              {row.description}
                            </td>
                            <td className={`py-3 px-4 text-right font-medium transition-colors duration-300 ${isExpense ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-emerald-400"}`}>
                              {formatCurrency(row.amount)}
                            </td>
                            <td className="py-3 px-4 text-[#889063] dark:text-gray-200 transition-colors duration-300">
                              {row.addedBy}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-[#889063] dark:text-gray-200 transition-colors duration-300">
                  {(isExpense ? (
                    <TrendingDown className="h-12 w-12 mx-auto mb-4 opacity-50 text-[#324D3E] dark:text-white transition-colors duration-300" />
                  ) : (
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50 text-[#324D3E] dark:text-white transition-colors duration-300" />
                  ))}
                  <p>
                    {isExpense
                      ? "Tidak ada pengeluaran ditemukan untuk filter yang dipilih"
                      : "Tidak ada pendapatan ditemukan untuk filter yang dipilih"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </FinanceSidebar>
  );
}
