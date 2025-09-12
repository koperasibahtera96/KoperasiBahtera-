// src/app/daily-incoming-investor/page.tsx
"use client";

import { FinanceSidebar } from "@/components/finance/FinanceSidebar";
import { Button } from "@/components/ui-finance/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui-finance/card";
import { useAlert } from "@/components/ui/Alert";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BarChart3,
  ChevronDown,
  DollarSign,
  Download,
  Filter,
  TrendingDown,
  TrendingUp,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

type DailyRow = {
  investorId: string;
  investorName?: string;
  investmentId: string;
  productName?: string;
  plantInstanceId?: string;
  paymentType?: string; // cicilan | full
  status?: string; // active | completed | ...
  totalAmount: number;
  amountPaid: number;
  date?: string; // ISO
};

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

const PER_PAGE = 10;

export default function DailyIncomingInvestorPage() {
  // ===== INPUT STATES (tidak memicu fetch langsung) =====
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(""); // yyyy-mm-dd
  const [q, setQ] = useState<string>(""); // input search (baru dieksekusi saat klik Cari di header tabel)

  // ===== APPLIED STATES (yang memicu fetch) =====
  const [appliedYear, setAppliedYear] = useState<number>(now.getFullYear());
  const [appliedMonth, setAppliedMonth] = useState<number | null>(null);
  const [appliedDay, setAppliedDay] = useState<number | null>(null);
  const [qApplied, setQApplied] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<DailyRow[]>([]);
  const [summary, setSummary] = useState({
    totalPemasukan: 0,
    totalSudahDibayar: 0,
    totalBelumDibayar: 0,
    transaksi: 0,
  });

  const [page, setPage] = useState<number>(1);

  const { showError, AlertComponent } = useAlert();
  const { theme, systemTheme } = useTheme();
  const isDark = (theme === "system" ? systemTheme : theme) === "dark";

  // ===== FETCH (hanya saat applied* berubah) =====
  const load = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ year: String(appliedYear) });
      if (appliedMonth) params.set("month", String(appliedMonth));
      if (appliedDay) params.set("day", String(appliedDay));
      if (qApplied) params.set("q", qApplied.trim());
      const res = await fetch(`/api/daily-incoming-investor?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load daily incoming");
      const data = await res.json();
      setRows(data.rows || []);
      setSummary(
        data.summary || {
          totalPemasukan: 0,
          totalSudahDibayar: 0,
          totalBelumDibayar: 0,
          transaksi: 0,
        }
      );
      setPage(1);
    } catch (e) {
      console.error(e);
      showError("Error", "Gagal memuat data Daily Incoming Investor.");
      setRows([]);
      setSummary({
        totalPemasukan: 0,
        totalSudahDibayar: 0,
        totalBelumDibayar: 0,
        transaksi: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedYear, appliedMonth, appliedDay, qApplied]);

  // ===== APPLY FILTERS =====
  const applyYearMonthDay = () => {
    // ambil dari dropdown tahun/bulan + date (opsional)
    if (selectedDate) {
      const d = new Date(selectedDate + "T00:00:00");
      setAppliedYear(d.getFullYear());
      setAppliedMonth(d.getMonth() + 1);
      setAppliedDay(d.getDate());
    } else {
      setAppliedYear(selectedYear);
      setAppliedMonth(selectedMonth);
      setAppliedDay(null);
    }
  };

  const handleApplySearch = () => {
    // tombol Cari di header tabel — menerapkan query saja
    setQApplied(q);
  };

  const handleApplyFilters = () => {
    // kalau ingin menerapkan Tahun/Bulan/Tanggal dari card filter
    applyYearMonthDay();
  };

  const handleReset = () => {
    const y = now.getFullYear();
    setSelectedYear(y);
    setSelectedMonth(null);
    setSelectedDate("");
    setQ("");

    setAppliedYear(y);
    setAppliedMonth(null);
    setAppliedDay(null);
    setQApplied("");
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
      .format(amount)
      .replace("IDR", "Rp");

  // Pie: breakdown by paymentType (pakai totalAmount)
  const pieData = useMemo(() => {
    const byType: Record<string, number> = {};
    for (const r of rows) {
      const key = (r.paymentType || "lainnya").toUpperCase();
      byType[key] = (byType[key] || 0) + (r.totalAmount || 0);
    }
    return Object.keys(byType).map((k, idx) => ({
      name: k,
      value: byType[k],
      color: BRUTALIST_COLORS[idx % BRUTALIST_COLORS.length],
    }));
  }, [rows]);

  // Line trend bulanan (gunakan appliedYear untuk label)
  const monthlyTrend = useMemo(() => {
    const m = Array.from({ length: 12 }, (_, i) => i + 1).map((mo) => {
      const sum = rows
        .filter((r) => {
          const d = r.date ? new Date(r.date) : null;
          return d && d.getMonth() + 1 === mo;
        })
        .reduce((s, r) => s + (r.totalAmount || 0), 0);
      return {
        month: new Date(appliedYear, mo - 1, 1).toLocaleDateString("id-ID", {
          month: "short",
        }),
        expenses: sum,
      };
    });
    return m;
  }, [rows, appliedYear]);

  // ===== Pagination =====
  const totalPages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const paged = rows
    .slice((page - 1) * PER_PAGE, page * PER_PAGE)
    .sort(
      (a, b) =>
        new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
    );

  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages, p + 1));

  // Label periode berdasarkan applied states
  const periodLabel = useMemo(() => {
    if (appliedDay && appliedMonth && appliedYear) {
      return new Date(appliedYear, appliedMonth - 1, appliedDay).toLocaleDateString("id-ID");
    }
    if (appliedMonth) {
      return `${new Date(appliedYear, appliedMonth - 1, 1).toLocaleDateString("id-ID", { month: "long" })} ${appliedYear}`;
    }
    return String(appliedYear);
  }, [appliedYear, appliedMonth, appliedDay]);

  const handleExport = () => {
    try {
      const monthlyAgg = monthlyTrend.map((t, idx) => {
        const trCount = rows.filter((r) =>
          r.date ? new Date(r.date).getMonth() === idx : false
        ).length;
        return { monthName: t.month, value: t.expenses, transactions: trCount };
      });

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

      html += `<div class="title">Daily Incoming Investor</div>`;
      html += `<div class="period">Periode: ${periodLabel}</div>`;

      html += `<div class="header">RINGKASAN</div>`;
      html += `<table>`;
      html += `<tr><th>Keterangan</th><th>Nilai</th></tr>`;
      html += `<tr><td>Total pemasukan</td><td>Rp ${summary.totalPemasukan.toLocaleString("id-ID")}</td></tr>`;
      html += `<tr><td>Total pemasukan sudah dibayar</td><td>Rp ${summary.totalSudahDibayar.toLocaleString("id-ID")}</td></tr>`;
      html += `<tr><td>Total pemasukan belum dibayar (Sisa cicilan)</td><td>Rp ${summary.totalBelumDibayar.toLocaleString("id-ID")}</td></tr>`;
      html += `</table>`;

      html += `<div class="header">PEMASUKAN BULANAN ${appliedYear}</div>`;
      html += `<table>`;
      html += `<tr><th>Bulan</th><th>Total</th><th>Jumlah Transaksi</th></tr>`;
      monthlyAgg.forEach((d) => {
        html += `<tr><td>${d.monthName}</td><td>Rp ${d.value.toLocaleString("id-ID")}</td><td>${d.transactions}</td></tr>`;
      });
      html += `</table>`;

      html += `<div class="header">DETAIL TRANSAKSI</div>`;
      html += `<table>`;
      html += `<tr><th>Tanggal</th><th>Investment ID</th><th>Nama Investor</th><th>Jumlah</th><th>Payment Type</th><th>Status</th></tr>`;
      rows
        .sort(
          (a, b) =>
            new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
        )
        .forEach((r) => {
          html += `<tr><td>${r.date ? new Date(r.date).toLocaleDateString("id-ID") : "-"}</td><td>${r.investmentId || "-"}</td><td>${r.investorName || "-"}</td><td>Rp ${(
            r.totalAmount || 0
          ).toLocaleString("id-ID")}</td><td>${r.paymentType || "-"}</td><td>${r.status || "-"}</td></tr>`;
        });
      html += `</table>`;

      html += `</body></html>`;

      const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "daily-incoming-investor.xls";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <FinanceSidebar>
        <div className="p-4 sm:p-6 lg:p-8 flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#324D3E] dark:border-white mx-auto mb-4"></div>
            <p className="text-[#889063] dark:text-gray-200 text-lg">
              Memuat Daily Incoming Investor...
            </p>
          </div>
        </div>
      </FinanceSidebar>
    );
  }

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
                Daily Incoming Investor
              </h1>
              <p className="text-[#889063] dark:text-gray-200 mt-1 text-sm sm:text-base lg:text-lg transition-colors duration-300">
                Ringkasan pemasukan harian dari investasi baru
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <motion.button
              onClick={handleExport}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-green-500 to-[#324D3E] hover:from-green-600 hover:to-[#4C3D19] px-4 py-2 text-sm font-medium text-white transition-all duration-300 shadow-lg hover:shadow-xl"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Download className="h-4 w-4" />
              Export CSV
            </motion.button>
          </div>
        </motion.div>

        {/* ===== FILTER (Tahun/Bulan/Tanggal + Reset) ===== */}
        <Card className="bg-white/90 dark:bg-gray-800/90 mb-6 border border-[#324D3E]/10 dark:border-gray-700 transition-colors duration-300">
          <CardHeader>
            <CardTitle className="text-black dark:text-white flex items-center gap-2 transition-colors duration-300">
              <Filter className="h-5 w-5" />
              Filter Laporan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Tahun */}
              <div>
                <label className="block text-sm font-medium text-black dark:text-white mb-2">
                  Tahun
                </label>
                <div className="relative">
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-full border bg-white/90 dark:bg-gray-700/80 border-gray-200 dark:border-gray-600 text-black dark:text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                  >
                    {Array.from({ length: 6 }, (_, i) => now.getFullYear() - i).map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-gray-300 pointer-events-none" />
                </div>
              </div>

              {/* Bulan */}
              <div>
                <label className="block text-sm font-medium text-black dark:text-white mb-2">
                  Bulan
                </label>
                <div className="relative">
                  <select
                    value={selectedMonth ?? ""}
                    onChange={(e) => setSelectedMonth(e.target.value ? Number(e.target.value) : null)}
                    className="w-full border bg-white/90 dark:bg-gray-700/80 border-gray-200 dark:border-gray-600 text-black dark:text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                  >
                    <option value="">Semua Bulan</option>
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(2025, i, 1).toLocaleDateString("id-ID", { month: "long" })}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-gray-300 pointer-events-none" />
                </div>
              </div>

              {/* Tanggal */}
              <div>
                <label className="block text-sm font-medium text-black dark:text-white mb-2">
                  Tanggal (opsional)
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full border bg-white/90 dark:bg-gray-700/80 border-gray-200 dark:border-gray-600 text-black dark:text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Tombol Apply + Reset */}
              <div className="flex items-end gap-2">
                <Button onClick={handleApplyFilters} className="w-full">
                  Terapkan
                </Button>
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="w-full border bg-white/90 dark:bg-gray-700/80 border-gray-200 dark:border-gray-600 text-black dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  Reset Filter
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ===== KPI ===== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          {/* Total pemasukan */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
            <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-[#324D3E]/10 dark:border-gray-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-[#889063] dark:text-gray-200">Total pemasukan</div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-green-500/10 text-green-600">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-green-600 dark:text-emerald-400">
                  {formatCurrency(summary.totalPemasukan)}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Jumlah transaksi */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}>
            <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-[#324D3E]/10 dark:border-gray-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-[#889063] dark:text-gray-200">Jumlah Transaksi</div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {rows.length}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Sudah dibayar */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }}>
            <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-[#324D3E]/10 dark:border-gray-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-[#889063] dark:text-gray-200">Total pemasukan sudah dibayar</div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-green-500/10 text-green-600">
                    <DollarSign className="h-5 w-5" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-green-600 dark:text-emerald-400">
                  {formatCurrency(summary.totalSudahDibayar)}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Sisa cicilan */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5 }}>
            <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-[#324D3E]/10 dark:border-gray-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-[#889063] dark:text-gray-200">Total pemasukan belum dibayar (Sisa cicilan)</div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-500/10 text-red-600">
                    <TrendingDown className="h-5 w-5" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(summary.totalBelumDibayar)}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* ===== Charts ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-[#324D3E]/10 dark:border-gray-700 shadow-lg transition-colors duration-300">
            <CardHeader>
              <CardTitle className="text-[#324D3E] dark:text-white">Distribusi Payment Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData.filter((d) => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                      outerRadius={100}
                      dataKey="value"
                      stroke="#000"
                      strokeWidth={3}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [new Intl.NumberFormat("id-ID").format(value), "Total"]}
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

          <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-[#324D3E]/10 dark:border-gray-700 shadow-lg transition-colors duration-300">
            <CardHeader>
              <CardTitle className="text-[#324D3E] dark:text-white">
                Tren Pemasukan Bulanan {appliedYear}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#4b5563" : "#374151"} />
                    <XAxis dataKey="month" stroke={isDark ? "#d1d5db" : "#9ca3af"} style={{ fontSize: "12px", fontWeight: "bold" }} />
                    <YAxis
                      stroke={isDark ? "#d1d5db" : "#9ca3af"}
                      style={{ fontSize: "12px", fontWeight: "bold" }}
                      tickFormatter={(value) => `${(value / 1_000_000).toFixed(0)}M`}
                    />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), "Pemasukan"]}
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
                      stroke={isDark ? "#34d399" : "#10b981"}
                      strokeWidth={4}
                      dot={{
                        fill: isDark ? "#34d399" : "#10b981",
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
        </div>

        {/* ===== Detail + Search di Header + Pagination ===== */}
        <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-[#324D3E]/10 dark:border-gray-700 shadow-lg transition-colors duration-300">
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col">
                <CardTitle className="text-[#324D3E] dark:text-white">Detail Pendapatan</CardTitle>
                <div className="text-sm text-[#889063] dark:text-gray-300">
                  Periode: <span className="font-semibold">{periodLabel}</span>
                  {qApplied ? (
                    <> • Pencarian: <span className="font-semibold">&quot;{qApplied}&quot;</span></>
                  ) : null}
                </div>
              </div>

              {/* === Search investment ID dipindah ke sini === */}
              <div className="w-full md:w-auto flex gap-2">
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleApplySearch(); }}
                  placeholder="Cari Investment ID (mis. INV-1234 / CICILAN-...)"
                  className="flex-1 md:w-96 border bg-white/90 dark:bg-gray-700/80 border-gray-200 dark:border-gray-600 text-black dark:text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button onClick={handleApplySearch} className="inline-flex items-center gap-2 rounded-lg">
                  <Search className="h-4 w-4" />
                  Cari
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {rows.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-[#324D3E]/10 dark:border-gray-600">
                        <th className="text-left py-3 px-4">Tanggal</th>
                        <th className="text-left py-3 px-4">Investment ID</th>
                        <th className="text-left py-3 px-4">Name</th>
                        <th className="text-right py-3 px-4">Jumlah</th>
                        <th className="text-left py-3 px-4">Payment Type</th>
                        <th className="text-left py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paged.map((r, i) => (
                        <tr
                          key={`${r.investmentId}-${i}`}
                          className={`border-b border-[#324D3E]/5 dark:border-gray-700 ${
                            i % 2 === 0 ? "bg-white/40 dark:bg-gray-800/40" : "bg-[#324D3E]/5 dark:bg-gray-700/50"
                          } hover:bg-[#324D3E]/10 dark:hover:bg-gray-700 transition-colors duration-200`}
                        >
                          <td className="py-3 px-4">
                            {r.date ? new Date(r.date).toLocaleDateString("id-ID") : "-"}
                          </td>
                          <td className="py-3 px-4">{r.investmentId}</td>
                          <td className="py-3 px-4">{r.investorName || "-"}</td>
                          <td className="py-3 px-4 text-right text-green-600 dark:text-emerald-400 font-medium">
                            {formatCurrency(r.totalAmount || 0)}
                          </td>
                          <td className="py-3 px-4">{r.paymentType}</td>
                          <td className="py-3 px-4">{r.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-[#889063] dark:text-gray-300">
                    Halaman <span className="font-semibold">{page}</span> dari{" "}
                    <span className="font-semibold">{totalPages}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={goPrev} disabled={page === 1}>
                      Prev
                    </Button>
                    <Button variant="outline" onClick={goNext} disabled={page === totalPages}>
                      Next
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-[#889063] dark:text-gray-200">
                <TrendingDown className="h-12 w-12 mx-auto mb-4 opacity-50 text-[#324D3E] dark:text-white" />
                <p>Tidak ada data untuk filter yang dipilih</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </FinanceSidebar>
  );
}
